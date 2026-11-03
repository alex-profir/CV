// A program's host on the page (009 contracts/program.md, research R2, R7 to R10,
// R14): one sandboxed frame and worker per program, its port and its end. It knows
// nothing of the session: it takes a request and gives events. The worker runs the
// visitor's code, so nothing it claims is trusted: the page keeps its own count of
// output and changes, and a second Ctrl+C ends it whatever it says of its handlers.
import { createChanges } from './changes.ts';
import { OUTPUT_LIMIT, statusOf, workerMessage } from './messages.ts';
import type { Compiled, EndReason, OutputChunk, ProgramEvents, ProgramHandle, ProgramRequest, Stream } from './messages.ts';
import { needsCompiler, typeErrorText } from './typescript.ts';
import type { CompileOutcome } from './typescript.ts';

export type PortLike = { postMessage(message: unknown): void; onmessage: ((event: { data: unknown }) => void) | null; close(): void };
export type FrameLike = {
  readonly contentWindow: { postMessage(message: unknown, target: string, transfer?: Transferable[]): void } | null;
  addEventListener(type: 'load', listener: () => void): void;
  remove(): void;
};

// What the host needs of the browser, so a test can give it fakes.
export type HostEnv = {
  runtime: string;
  makeFrame(): FrameLike;
  makeChannel(): { port1: PortLike; port2: unknown };
  nonce(): string;
  // Messages from frames, until the function it gives back is called.
  listen(listener: (event: { source: unknown; data: unknown }) => void): () => void;
  // TypeScript's answer for a request that needs it (research R12).
  compile(request: ProgramRequest, onProgress: ProgramEvents['onProgress'], signal: AbortSignal): Promise<CompileOutcome>;
};

const FLUSH_MS = 100;

export function createHost(env: HostEnv) {
  function start(request: ProgramRequest, events: ProgramEvents): ProgramHandle {
    const nonce = env.nonce();
    const changes = createChanges(new Set(request.files.entries.map((entry) => entry.path)));
    const stopCompiling = new AbortController();
    let frame: FrameLike | null = null;
    let port: PortLike | null = null;
    let over = false;
    let stopListening = () => {};
    let handler = false;
    let interrupted = false;
    let printed = 0;
    let chunks: { stream: Stream; text: string }[] = [];
    let flushTimer: ReturnType<typeof setTimeout> | null = null;

    function flush(): void {
      if (flushTimer !== null) clearTimeout(flushTimer);
      flushTimer = null;
      if (chunks.length === 0) return;
      const ready: readonly OutputChunk[] = chunks;
      chunks = [];
      events.onOutput(ready);
    }

    function print(stream: Stream, text: string): void {
      const room = OUTPUT_LIMIT - printed;
      const shown = text.length > room ? text.slice(0, room) : text;
      printed += text.length;
      const last = chunks.at(-1);
      if (shown !== '') {
        if (last !== undefined && last.stream === stream) last.text += shown;
        else chunks.push({ stream, text: shown });
      }
      flushTimer ??= setTimeout(flush, FLUSH_MS);
    }

    function end(status: number, reason: EndReason): void {
      if (over) return;
      over = true;
      stopCompiling.abort();
      stopListening();
      flush();
      if (port !== null) {
        port.onmessage = null;
        port.close();
      }
      if (frame !== null) {
        frame.contentWindow?.postMessage({ stop: true, nonce }, '*');
        frame.remove();
      }
      events.onEnded({ status, reason, changes: changes.result() });
    }

    const died = (message: string) => end(1, /memory/i.test(message) ? 'memory' : 'died');

    function onWorker(event: { data: unknown }): void {
      const data = event.data as { nonce?: unknown } | null;
      if (over || data === null || typeof data !== 'object' || data.nonce !== nonce) return;
      const message = workerMessage(data);
      if (message === null) return;
      if ('out' in message) {
        print(message.out, message.text);
        if (printed >= OUTPUT_LIMIT) end(130, 'output');
      } else if ('sigint' in message) handler = message.sigint;
      else if ('limit' in message) end(130, 'output');
      else if ('exit' in message) end(statusOf(message.exit), message.uncaught === true ? 'uncaught' : 'exit');
      else {
        if ('file' in message) changes.add('removed' in message ? { path: message.file, removed: true } : message.binary === true ? { path: message.file, text: message.text, binary: true } : { path: message.file, text: message.text });
        else changes.add({ path: message.folder, made: message.made });
        // The runtime holds to the limit itself, so only a forged change gets here.
        if (changes.over()) end(1, 'died');
      }
    }

    // The frame and worker, once any TypeScript has been compiled.
    function launch(compiled?: Compiled): void {
      const channel = env.makeChannel();
      const made = env.makeFrame();
      const opened = channel.port1;
      port = opened;
      frame = made;
      let loads = 0;
      opened.onmessage = onWorker;
      stopListening = env.listen((event) => {
        const data = event.data as { nonce?: unknown; worker?: unknown; message?: unknown } | null;
        if (over || event.source !== made.contentWindow || data === null || typeof data !== 'object' || data.nonce !== nonce) return;
        if (data.worker === 'started') opened.postMessage({ run: true, nonce, request, ...(compiled === undefined ? {} : { compiled }) });
        else if (data.worker === 'died' || data.worker === 'failed' || data.worker === 'unreadable' || data.worker === 'refused') died(typeof data.message === 'string' ? data.message : '');
      });
      made.addEventListener('load', () => {
        loads += 1;
        // A second load is the frame's document lost: the program died with it.
        if (loads > 1) return died('');
        made.contentWindow?.postMessage({ start: true, nonce, source: env.runtime, port: channel.port2 }, '*', [channel.port2 as Transferable]);
      });
    }

    if (needsCompiler(request)) {
      void env.compile(request, events.onProgress, stopCompiling.signal).then((outcome) => {
        if (over) return;
        if (outcome.kind === 'offline') end(1, 'offline');
        else if (outcome.kind === 'failed') end(1, 'died');
        else if (outcome.result.diagnostics.length > 0) {
          print('stderr', typeErrorText(outcome.result, request.cwd));
          end(1, 'type-error');
        } else launch(outcome.result.outputs);
      });
    } else launch();

    return {
      interrupt() {
        // One chance for the handler; the second press ends it however it answers.
        if (handler && !interrupted) {
          interrupted = true;
          port?.postMessage({ signal: 'SIGINT', nonce });
        } else end(130, 'interrupted');
      },
      close: () => end(130, 'closed'),
    };
  }
  return { start };
}
