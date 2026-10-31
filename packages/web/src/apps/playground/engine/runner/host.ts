// The runner's host (contracts/runner.md, research R17, R19, R24): on the
// page, it makes one sandboxed frame per run in a hidden host of its own on
// `document.body`, never inside `section.playground` and never moved, so a
// run outlives the window's content unmounting for Show specs or a shell
// switch (FR-005, FR-061); removing or moving a frame would end its worker.
// It talks to the worker over one port, with the run's nonce; pings it every
// 250 ms to tell a blocked run (R19); maps uncaught errors to the code's
// lines; and ends the run on Stop, the end, or the worker's death.
import { bootstrap, policy, runtime } from 'virtual:playground-runner';
import type { RunEvents, RunHandle } from '../contract.ts';
import { mapPosition } from '../source-map.ts';
import { isCount, isPlace, isWorkerEntry, workerEntries } from './messages.ts';
import type { LogEntry, RunOutcome } from '../../types.ts';

export const HEARTBEAT_MS = 250;

// The worker's script: the runtime, then the code as one async function,
// in strict mode as a module is, so top-level `await` works (R13).
const PRELUDE_LINES = runtime.split('\n').length + 1;
const workerSource = (code: string) => `${runtime}\nself.__playgroundMain = async () => { "use strict";\n${code}\n};\n`;

const frameDocument = () => `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><script>${bootstrap}</script>`;

function runnerHost(): HTMLElement {
  const found = document.getElementById('playground-runners');
  if (found !== null) return found;
  const host = document.createElement('div');
  host.id = 'playground-runners';
  host.hidden = true;
  document.body.append(host);
  return host;
}

export type Runnable = { code: string; map: string };

const AsyncFunction = (async () => {}).constructor as FunctionConstructor;

const placeOf = (error: unknown): { line: number; column: number } | null => {
  const { lineNumber, line, columnNumber, column } = error as { lineNumber?: number; line?: number; columnNumber?: number; column?: number };
  const at = lineNumber ?? line;
  return typeof at === 'number' ? { line: at, column: columnNumber ?? column ?? 1 } : null;
};

// Why the browser refuses the code, with its line in the code, for a browser
// whose worker error doesn't say (Firefox, WebKit). It only parses: the
// function is never called, so nothing of the code runs on the page.
function refusal(code: string): { message: string; at: { line: number; column: number } | null } | null {
  const built = (text: string) => new AsyncFunction(`"use strict";\n${text}`);
  try {
    built(code);
    return null;
  } catch (error) {
    // Browsers count a built function's lines from different places: a refusal
    // on the code's first line says where this one starts.
    let first: { line: number } | null = null;
    try {
      built(')');
    } catch (known) {
      first = placeOf(known);
    }
    const place = placeOf(error);
    if (place === null || first === null) return { message: `SyntaxError: ${(error as Error).message}`, at: null };
    // WebKit reads one token on, past the end of the code at its last line.
    const line = Math.min(place.line - first.line + 1, code.trimEnd().split('\n').length);
    return { message: `SyntaxError: ${(error as Error).message}`, at: { line: line + PRELUDE_LINES, column: place.column } };
  }
}

// The worker runs the visitor's code, so every field is checked before use.
type FromWorker = {
  nonce?: unknown;
  started?: unknown;
  pong?: unknown;
  n?: unknown;
  logs?: unknown;
  entries?: unknown;
  dropped?: unknown;
  cleared?: unknown;
  pending?: unknown;
  timers?: unknown;
  requests?: unknown;
  uncaught?: unknown;
  entry?: unknown;
  at?: unknown;
  end?: unknown;
};

// Starts the code in a new frame. `startedAt` is when Run was pressed, which
// the outcome's time counts from.
export function startFrame(runnable: Runnable, cv: unknown, events: RunEvents, startedAt: number, errors: number): RunHandle {
  const nonce = crypto.randomUUID();
  const channel = new MessageChannel();
  const port = channel.port1;
  const frame = document.createElement('iframe');
  frame.className = 'playground-runner';
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.title = '';
  frame.hidden = true;
  frame.srcdoc = frameDocument();

  let over = false;
  let loads = 0;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let ping = 0;
  // Each ping's time, until it is answered.
  const unanswered = new Map<number, number>();
  let blockedSince: number | null = null;
  let uncaught = 0;

  const elapsed = () => performance.now() - startedAt;

  function finish(outcome: RunOutcome, tellBootstrap = true): void {
    if (over) return;
    over = true;
    if (heartbeat !== null) clearInterval(heartbeat);
    removeEventListener('message', fromFrame);
    port.onmessage = null;
    port.close();
    if (tellBootstrap) frame.contentWindow?.postMessage({ stop: true, nonce }, '*');
    frame.remove();
    events.onEnded(outcome);
  }

  const crashed = (message: string) => finish({ kind: 'crashed', ms: elapsed(), ...(/memory/i.test(message) ? { reason: 'out-of-memory' } : {}), uncaught });

  function beat(): void {
    if (document.hidden) {
      // The browser slows a hidden page's timers: detection waits, and
      // starts again when the page shows (R19).
      unanswered.clear();
      return;
    }
    const at = performance.now();
    let oldest: number | null = null;
    for (const sent of unanswered.values()) oldest = oldest === null ? sent : Math.min(oldest, sent);
    if (oldest !== blockedSince && oldest !== null) {
      blockedSince = oldest;
      events.onBlocked(oldest);
    }
    ping += 1;
    unanswered.set(ping, at);
    port.postMessage({ ping, nonce });
  }

  function answered(n: number): void {
    for (const sent of [...unanswered.keys()]) if (sent <= n) unanswered.delete(sent);
    if (blockedSince !== null && unanswered.size === 0) {
      blockedSince = null;
      events.onBlocked(null);
    }
  }

  // An uncaught error's line in the code, from its place in the worker's
  // script; none when it maps to nothing (FR-035).
  function withLine(entry: LogEntry, at: unknown): LogEntry {
    if (!isPlace(at) || at.line <= PRELUDE_LINES) return entry;
    const mapped = mapPosition(runnable.map, at.line - PRELUDE_LINES, at.column);
    return mapped === null ? entry : { ...entry, line: mapped.line };
  }

  // JavaScript the browser refused, so none of the worker's script ran: the
  // note, then the browser's message at its line (FR-033, FR-035). The browser's
  // message counts when TypeScript found no error.
  function unreadable(message: string, at: unknown): void {
    const text = message.replace(/^Uncaught /, '');
    const [, name, rest] = /^(\w*Error): ([^]*)$/.exec(text) ?? [null, 'SyntaxError', text];
    finish({ kind: 'nothing-ran', ms: elapsed(), reason: 'unreadable', errors: Math.max(errors, 1) });
    events.onLogs({ entries: [withLine({ id: 0, level: 'error', values: [{ t: 'err', name: name!, message: rest! }] }, at)], dropped: 0 });
  }

  port.onmessage = (event: MessageEvent<FromWorker>) => {
    const data = event.data;
    if (over || data === null || typeof data !== 'object' || data.nonce !== nonce) return;
    if (data.pong === true && isCount(data.n)) answered(data.n);
    else if (data.started === true) {
      events.onStarted({ errors });
      beat();
      heartbeat = setInterval(beat, HEARTBEAT_MS);
    } else if (data.logs === true) events.onLogs({ entries: workerEntries(data.entries), dropped: isCount(data.dropped) ? data.dropped : 0, ...(data.cleared === true ? { cleared: true } : {}) });
    else if (data.pending === true) events.onPending({ timers: isCount(data.timers) ? data.timers : 0, requests: isCount(data.requests) ? data.requests : 0 });
    else if (data.uncaught === true && isWorkerEntry(data.entry)) {
      uncaught += 1;
      events.onLogs({ entries: [withLine(data.entry, data.at)], dropped: 0 });
    } else if (data.end === true) finish({ kind: uncaught > 0 ? 'errors' : 'finished', ms: elapsed(), uncaught });
  };

  function fromFrame(event: MessageEvent<{ nonce?: unknown; worker?: string; message?: string; line?: unknown; column?: unknown }>): void {
    if (event.source !== frame.contentWindow || event.data === null || typeof event.data !== 'object' || event.data.nonce !== nonce) return;
    if (event.data.worker === 'started') port.postMessage({ run: true, nonce, cv, prelude: PRELUDE_LINES });
    else if (event.data.worker === 'unreadable') unreadable(event.data.message ?? '', { line: event.data.line, column: event.data.column });
    else if (event.data.worker === 'refused') {
      const found = refusal(runnable.code);
      if (found === null) crashed('');
      else unreadable(found.message, found.at);
    }
    else if (event.data.worker === 'failed' || event.data.worker === 'died') crashed(event.data.message ?? '');
  }

  addEventListener('message', fromFrame);
  frame.addEventListener('load', () => {
    loads += 1;
    // A second load is the frame's document lost: the run died with it.
    if (loads > 1) return crashed('');
    frame.contentWindow?.postMessage({ start: true, nonce, source: workerSource(runnable.code), port: channel.port2 }, '*', [channel.port2]);
  });
  runnerHost().append(frame);

  return { stop: () => finish({ kind: 'stopped', ms: elapsed(), uncaught }) };
}
