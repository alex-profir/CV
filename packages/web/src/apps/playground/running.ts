// A run of the code, on the page's side (data-model.md Run, its State
// transitions and the stuck transitions; FR-032 to FR-051): the run in the
// session, its logs, the stuck popup's state, and the announcements. It
// lives outside React, as the session does, so a run goes on while the
// window's content unmounts for Show specs or a shell switch (FR-005,
// FR-061), and the popup waits until the window is on screen (FR-050).
import { counted, fill, siteText } from '../../site-text.ts';
import { announce } from '../../os/announce.ts';
import type { Engine, RunHandle } from './engine/contract.ts';
import { addLogs, announced, clearLogs, emptyLogBook } from './logbook.ts';
import { session } from './session.ts';
import type { LogEntry, Run, RunOutcome } from './types.ts';

const words = siteText.playground;

// The stuck popup comes when a run hasn't paused for this long, and again
// this long after Keep waiting (FR-048, FR-049).
export const STUCK_SECONDS = 5;
const STUCK_MS = STUCK_SECONDS * 1000;

// How often the run's state is looked at, and announcements at most once
// a second (FR-064, FR-066).
const TICK_MS = 100;
const ANNOUNCE_MS = 1000;

let handle: RunHandle | null = null;
let runIds = 0;
let entryIds = 0;
let ticker: ReturnType<typeof setInterval> | null = null;
let lastAnnounce = 0;
let announcedTimers: number | null = null;

// Seconds as the design writes them: one decimal, or two under a tenth.
export function seconds(ms: number): string {
  const s = Math.max(0, ms) / 1000;
  return s < 0.1 ? s.toFixed(2) : s.toFixed(1);
}

// The toolbar's words for the run (FR-036), and its end note's.
export function runStateText(run: Run, now: number): string {
  const forms = words.runState;
  if (run.outcome !== null) return outcomeText(run.outcome);
  if (run.blockedSince !== null && now - run.blockedSince >= 1000) return fill(forms.blocked, { s: seconds(now - run.blockedSince) });
  const s = seconds(now - run.startedAt);
  return run.pending.timers > 0 ? fill(counted(forms.running, run.pending.timers), { n: run.pending.timers, s }) : fill(forms.runningIdle, { s });
}

export function outcomeText(outcome: RunOutcome): string {
  const forms = words.runState;
  const s = seconds(outcome.ms);
  switch (outcome.kind) {
    case 'finished':
      return fill(forms.finished, { s });
    case 'stopped':
      return fill(forms.stopped, { s });
    case 'errors':
      return fill(counted(forms.errors, outcome.uncaught ?? 0), { n: outcome.uncaught ?? 0, s });
    case 'crashed':
      return fill(outcome.reason === 'out-of-memory' ? forms.outOfMemory : forms.crashed, { s });
    case 'nothing-ran':
      return forms.nothingRan;
  }
}

const isCurrent = (id: number) => session.get().run?.id === id;

function updateRun(id: number, change: (run: Run) => Partial<Run>): void {
  session.update((state) => (state.run === null || state.run.id !== id ? {} : { run: { ...state.run, ...change(state.run) } }));
}

// Entries into the log book, numbered by the page so the runner's and the
// page's own notes never share an id.
function addEntries(entries: LogEntry[], dropped = 0): void {
  session.update((state) => ({ logs: addLogs(state.logs, entries.map((entry) => ({ ...entry, id: (entryIds += 1) })), dropped) }));
}

// Whether the Playground's window is on screen: open on the desktop, not
// minimized and not showing its specs (FR-050).
function windowOnScreen(): boolean {
  const section = document.querySelector('#os section.playground:not(.is-loading)');
  return section !== null && section.closest('[hidden]') === null;
}

function tick(): void {
  const run = session.get().run;
  if (run === null) return stopTicking();
  const now = performance.now();
  if (run.outcome === null) {
    let stuck = run.stuck;
    if (run.blockedSince !== null && stuck === 'no' && now - run.blockedSince >= STUCK_MS) stuck = 'due';
    if (stuck === 'kept-waiting' && run.blockedSince !== null && run.askAgainAt !== null && now >= run.askAgainAt) stuck = 'due';
    if (stuck === 'due' && windowOnScreen()) stuck = 'shown';
    if (stuck !== run.stuck) updateRun(run.id, () => ({ stuck }));
  }
  if (now - lastAnnounce >= ANNOUNCE_MS) {
    lastAnnounce = now;
    const { logs } = session.get();
    if (logs.newSinceAnnounce > 0) {
      announce(fill(counted(words.announce.newLogs, logs.newSinceAnnounce), { n: logs.newSinceAnnounce }));
      session.update({ logs: announced(logs) });
    }
    if (run.outcome === null && announcedTimers !== run.pending.timers && run.state !== 'starting') {
      if (announcedTimers !== null) announce(run.pending.timers === 0 ? words.announce.timers.none : fill(counted(words.announce.timers, run.pending.timers), { n: run.pending.timers }));
      announcedTimers = run.pending.timers;
    }
  }
  if (run.outcome !== null && session.get().logs.newSinceAnnounce === 0) stopTicking();
}

function stopTicking(): void {
  if (ticker !== null) clearInterval(ticker);
  ticker = null;
}

// Runs the code (FR-032): any run going ends first; the logs empty and open.
export function startRun(engine: Engine, cv: unknown): void {
  stopRun();
  runIds += 1;
  const id = runIds;
  const run: Run = { id, startedAt: performance.now(), state: 'starting', pending: { timers: 0, requests: 0 }, blockedSince: null, stuck: 'no', askAgainAt: null, uncaught: 0, outcome: null };
  session.update({ run, logs: emptyLogBook(), pane: 'logs', panel: session.get().panel === 'options' ? 'none' : session.get().panel });
  announcedTimers = null;
  lastAnnounce = performance.now();
  announce(words.announce.runStarted);
  stopTicking();
  ticker = setInterval(tick, TICK_MS);
  handle = engine.run(
    { cv },
    {
      onStarted: ({ errors }) => {
        if (!isCurrent(id)) return;
        updateRun(id, () => ({ state: 'running' }));
        // The first entry says whether the code has errors (FR-033).
        addEntries([{ id: 0, level: 'note', values: [], note: errors > 0 ? { key: 'errorsNote', n: errors } : { key: 'noErrors' } }]);
      },
      onLogs: ({ entries, dropped, cleared }) => {
        if (!isCurrent(id)) return;
        if (cleared === true) session.update((state) => ({ logs: clearLogs(state.logs) }));
        addEntries(entries, dropped);
      },
      onPending: (pending) => {
        if (!isCurrent(id)) return;
        updateRun(id, (current) => ({ pending, state: current.state === 'starting' ? current.state : pending.timers + pending.requests > 0 ? 'waiting' : 'running' }));
      },
      onBlocked: (since) => {
        if (!isCurrent(id)) return;
        const was = session.get().run?.stuck;
        updateRun(id, (current) => (since === null ? { blockedSince: null, stuck: 'no', askAgainAt: null } : { blockedSince: since, state: 'running', stuck: current.stuck }));
        // The popup closes by itself when the code pauses (FR-049).
        if (since === null && was === 'shown') announce(words.announce.runningAgain);
      },
      onEnded: (outcome) => {
        if (!isCurrent(id)) return;
        handle = null;
        updateRun(id, () => ({ state: 'ended', outcome, stuck: 'no', blockedSince: null, askAgainAt: null }));
        addEntries([{ id: 0, level: 'note', values: [], note: outcome.kind === 'nothing-ran' ? { key: 'nothingRan', reason: outcome.reason === 'packages' ? 'packages' : 'noEmitOnError' } : { key: 'ended', outcome } }]);
        updateRun(id, () => ({ uncaught: outcome.uncaught ?? 0 }));
        announce(outcome.kind === 'nothing-ran' ? (outcome.reason === 'packages' ? words.editor.packages : fill(words.logs.nothingRan, { option: 'noEmitOnError' })) : outcomeText(outcome));
      },
    },
  );
}

export const runGoing = (): boolean => {
  const run = session.get().run;
  return run !== null && run.outcome === null;
};

// Stop (FR-038), and Run again, Reset, the window's close and leaving the
// page: the run ends at once. `silent` for the close and the page's end,
// which log nothing (data-model.md Run).
export function stopRun(silent = false): void {
  const going = handle;
  handle = null;
  if (going === null) return;
  if (silent) session.update({ run: null });
  going.stop();
}

// Keep waiting, or Escape on the popup (FR-049): asked again 5 s on.
export function keepWaiting(): void {
  const run = session.get().run;
  if (run === null || run.stuck !== 'shown') return;
  updateRun(run.id, () => ({ stuck: 'kept-waiting', askAgainAt: performance.now() + STUCK_MS }));
}
