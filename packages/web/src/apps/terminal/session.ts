// The Terminal's session (006 research R5, data-model.md Terminal session
// and Session additions): one store per visit, outside the shells, so
// minimizing, going home and a shell switch keep it, and only closing the
// Terminal empties it (FR-021). Every line runs in the shell worker, one at
// a time; lines entered before it is ready wait after their prompts, in
// order (FR-070). It lives in memory only; nothing is written to storage
// (FR-022). Components read it with useSyncExternalStore.
import { counted, siteText, fill } from '../../site-text.ts';
import { TERMINAL } from '../../os/metrics.ts';
import { vimSource } from './engine/commands.ts';
import type { Announcement, Block } from './engine/block.ts';
import { mapOutput } from './engine/output-map.ts';
import { openVim, vimReducer } from './engine/vim.ts';
import type { Message, VimInput, VimState } from './engine/vim.ts';
import { createShellClient } from './shell-client.ts';
import type { ShellClient } from './shell-client.ts';
import { INITIAL_STATE, NO_FILES } from './shell/protocol.ts';
import type { Effect, RunResult, ShellState, VisitorFiles } from './shell/protocol.ts';

export type Shell = 'desktop' | 'mobile';

export type Entry = {
  id: number;
  // As typed, for the run's heading and the history (FR-006).
  line: string;
  // Where it ran, for its prompt.
  cwd: string;
  // `hh:mm` when entered (research R17).
  time: string;
  // Null for an empty line, and for a line not run yet.
  block: Block | null;
};

export type ShellStatus = 'idle' | 'loading' | 'ready' | 'running' | 'failed';

// What a line asks of the desktop or phone shell around the Terminal
// (FR-008, FR-014).
export type OsActions = { open(view: 'cv' | 'about'): void; exit(): void };

// A line waiting for the shell, with what it runs with.
type Waiting = { entry: Entry; shell: Shell; actions: OsActions | null; history: readonly string[] };

export type Session = {
  entries: readonly Entry[];
  history: readonly string[];
  draft: string;
  stepping: { index: number; saved: string } | null;
  // The output's scroll position, the last one saved and each shell's: a
  // position only fits the width it was taken at (FR-021).
  scrollTop: number;
  shellScroll: Partial<Record<Shell, number>>;
  vim: VimState | null;
  // The entry the vim view adds when it quits, so its output follows its
  // prompt (FR-064).
  vimEntry: Entry | null;
  // What the status region says, with a counter so the same words are
  // spoken again (FR-028).
  announcement: { text: string; id: number } | null;
  // The starter chips show until the output is first cleared (FR-019).
  starter: boolean;
  // The shell worker (FR-070).
  shell: ShellStatus;
  // Lines entered while another runs or the shell loads, in order.
  waiting: readonly Entry[];
  // The line the worker is running.
  running: Entry | null;
  // What the shell keeps between lines (research R27), the visitor's files
  // (R26), and the working folder for the prompt (FR-046).
  state: ShellState;
  files: VisitorFiles;
  cwd: string;
};

const EMPTY: Session = {
  entries: [],
  history: [],
  draft: '',
  stepping: null,
  scrollTop: 0,
  shellScroll: {},
  vim: null,
  vimEntry: null,
  announcement: null,
  starter: true,
  shell: 'idle',
  waiting: [],
  running: null,
  state: INITIAL_STATE,
  files: NO_FILES,
  cwd: INITIAL_STATE.cwd,
};

export const clock = (date: Date) => [date.getHours(), date.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':');

export function announcementText(announce: Announcement): string {
  if ('full' in announce) return announce.full;
  const { summary, units } = siteText.terminal.announce;
  return fill(summary, { command: announce.command, count: announce.count, unit: counted(units[announce.unit], announce.count) });
}

// The vim view's message line in words (contracts/commands.md The vim
// view's keys), on its shell.
export function messageText(message: Message, state: VimState, shell: Shell = 'desktop'): string {
  const words = siteText.terminal.vim;
  const file = state.source.name;
  switch (message.kind) {
    case 'opened':
      return fill(words.opened[shell === 'mobile' ? 'phone' : 'desktop'], { file, n: state.source.rows.length });
    case 'read-only':
      return fill(words.readOnly, { file });
    case 'unknown':
      return fill(words.unknown, { typed: message.command });
    case 'match':
      return fill(words.match, { text: state.search?.text ?? '', index: message.index, count: message.count });
    case 'not-found':
      return fill(words.notFound, { text: message.text });
    case 'none':
      return '';
  }
}

export function createSession(client: ShellClient = createShellClient()) {
  let state: Session = EMPTY;
  let ids = 0;
  let spoken = 0;
  // Bumped by reset, so a result from before it is dropped.
  let generation = 0;
  let queue: Waiting[] = [];
  const listeners = new Set<() => void>();

  const statusOf = (running: Entry | null): ShellStatus => (running !== null ? 'running' : client.status());

  const set = (next: Session) => {
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };
  const say = (text: string) => ({ text, id: (spoken += 1) });
  const entry = (line: string): Entry => ({ id: (ids += 1), line, cwd: state.cwd, time: clock(new Date()), block: null });

  // The output after a line, with its effects applied in order (data-model
  // Session additions).
  function finish(waiting: Waiting, result: RunResult) {
    const { block, announce } = mapOutput(result, waiting.entry.line, { text: siteText, columns: TERMINAL.columns, cwd: waiting.entry.cwd });
    const done: Entry = { ...waiting.entry, block };
    let next: Session = {
      ...state,
      running: null,
      entries: [...state.entries, done],
      state: result.state,
      cwd: result.state.cwd,
      ...(result.files === undefined ? {} : { files: result.files }),
      // A line that prints nothing and stays in its folder says nothing.
      announcement: 'full' in announce && announce.full === '' ? state.announcement : say(announcementText(announce)),
    };
    const acts: (() => void)[] = [];
    for (const effect of result.effects as Effect[]) {
      if (effect.kind === 'clear') next = { ...next, entries: [], starter: false, scrollTop: 0, shellScroll: {}, announcement: say(siteText.terminal.announce.cleared) };
      else if (effect.kind === 'clear-history') next = { ...next, history: next.history.slice(waiting.history.length) };
      else if (effect.kind === 'vim') {
        const source = vimSource(effect.text, effect.name, effect.pipe);
        next = { ...next, entries: next.entries.filter((shown) => shown !== done), vim: openVim(source), vimEntry: done, announcement: say(fill(siteText.terminal.announce.vim, { file: source.name, n: source.rows.length })) };
      } else if (waiting.actions !== null) {
        const { actions } = waiting;
        acts.push(() => actions.open(effect.view));
      }
    }
    if (result.end === 'exited' && waiting.actions !== null) acts.push(waiting.actions.exit);
    set({ ...next, shell: statusOf(null) });
    for (const act of acts) act();
  }

  // Runs the next waiting line, when the shell is ready and none runs.
  function pump() {
    if (state.running !== null || queue.length === 0) return;
    const waiting = queue[0]!;
    if (waiting.entry.line.trim() === '') {
      queue = queue.slice(1);
      set({ ...state, entries: [...state.entries, { ...waiting.entry, cwd: state.cwd }], waiting: queue.map((each) => each.entry) });
      pump();
      return;
    }
    if (client.status() !== 'ready') return;
    queue = queue.slice(1);
    const running: Entry = { ...waiting.entry, cwd: state.cwd };
    const started = { ...waiting, entry: running };
    set({ ...state, running, waiting: queue.map((each) => each.entry), shell: 'running' });
    const at = generation;
    void client.run({ id: running.id, line: running.line, state: state.state, history: waiting.history, shell: waiting.shell }).then((result) => {
      if (at !== generation) return;
      finish(started, result);
      pump();
    });
  }

  // The shell loading, then failing, is announced once each (FR-070).
  client.subscribe(() => {
    const shell = statusOf(state.running);
    const words = siteText.terminal;
    const announcement = shell === state.shell ? state.announcement : shell === 'loading' && state.shell === 'idle' ? say(words.announce.loading) : shell === 'failed' ? say(words.shellFailed) : state.announcement;
    set({ ...state, shell, announcement });
    pump();
  });

  // Runs a typed line in `shell`: at once when the shell is ready, else
  // after the lines before it. `actions` does what the line asks of the
  // desktop or phone shell (FR-014).
  function run(line: string, shell: Shell, actions: OsActions | null = null) {
    const reset = { draft: '', stepping: null };
    const typed = entry(line);
    const history = line.trim() === '' ? state.history : [...state.history, line];
    queue = [...queue, { entry: typed, shell, actions, history }];
    set({ ...state, ...reset, history, waiting: queue.map((each) => each.entry) });
    pump();
  }

  // Up and Down through the history, newest first; Down past the newest
  // gives back the draft (FR-020).
  function step(direction: 'up' | 'down') {
    const { history, stepping, draft } = state;
    if (direction === 'up') {
      if (history.length === 0) return;
      const index = stepping === null ? history.length - 1 : Math.max(0, stepping.index - 1);
      set({ ...state, draft: history[index]!, stepping: { index, saved: stepping?.saved ?? draft } });
      return;
    }
    if (stepping === null) return;
    const index = stepping.index + 1;
    if (index >= history.length) set({ ...state, draft: stepping.saved, stepping: null });
    else set({ ...state, draft: history[index]!, stepping: { ...stepping, index } });
  }

  function vim(input: VimInput) {
    if (state.vim === null) return;
    const next = vimReducer(state.vim, input);
    if (next === 'quit') {
      set({ ...state, vim: null, vimEntry: null, entries: state.vimEntry === null ? state.entries : [...state.entries, state.vimEntry] });
      return;
    }
    if (next === state.vim) return;
    // A new message is announced once, even when its words repeat (FR-065).
    const spokenText = next.message !== state.vim.message && next.message.kind !== 'none' ? messageText(next.message, next) : '';
    set({ ...state, vim: next, ...(spokenText === '' ? {} : { announcement: say(spokenText) }) });
  }

  return {
    get: () => state,
    // The Terminal opened: the shell starts loading, once a visit (FR-070).
    start: () => client.start(),
    retry: () => client.retry(),
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    run,
    step,
    setDraft: (draft: string) => {
      if (draft !== state.draft) set({ ...state, draft });
    },
    // The menu's `Clear output` (FR-019): the history stays.
    clear: () => set({ ...state, entries: [], starter: false, scrollTop: 0, shellScroll: {}, announcement: say(siteText.terminal.announce.cleared) }),
    vim,
    saveScroll: (scrollTop: number, shell: Shell = 'desktop') => {
      if (scrollTop !== state.scrollTop || scrollTop !== state.shellScroll[shell]) set({ ...state, scrollTop, shellScroll: { ...state.shellScroll, [shell]: scrollTop } });
    },
    // Where a shell's output was scrolled to, or the last place in the other.
    scrollFor: (shell: Shell) => state.shellScroll[shell] ?? state.scrollTop,
    // On close: as on first open, and the shell's state and the visitor's
    // files emptied (FR-021).
    reset: () => {
      generation += 1;
      queue = [];
      client.reset();
      set({ ...EMPTY, shell: statusOf(null) });
    },
  };
}

export type TerminalSession = ReturnType<typeof createSession>;

// The visit's one session.
export const session: TerminalSession = createSession();
