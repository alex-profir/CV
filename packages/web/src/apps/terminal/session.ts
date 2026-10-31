// The Terminal's session (006 research R5, data-model.md Terminal session
// and Session additions): one store per visit, outside the shells, so
// minimizing, going home and a shell switch keep it, and only closing the
// Terminal empties it (FR-021). Every line runs in the shell worker, one at
// a time; lines entered before it is ready wait after their prompts, in
// order (FR-070). It lives in memory only; nothing is written to storage
// (FR-022). Components read it with useSyncExternalStore.
import { counted, siteText, fill } from '../../site-text.ts';
import { TERMINAL } from '../../os/metrics.ts';
import type { Announcement, Block } from './engine/block.ts';
import { mapOutput } from './engine/output-map.ts';
import { openVim, vimReducer } from './engine/vim.ts';
import type { Message, VimInput, VimSource, VimState } from './engine/vim.ts';
import { createShellClient } from './shell-client.ts';
import type { ShellClient } from './shell-client.ts';
import { INITIAL_STATE, NO_FILES } from './shell/protocol.ts';
import type { Completion, CompletionMatch, Effect, RunResult, ShellState, VisitorFiles, WriteOutcome } from './shell/protocol.ts';

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
  // Ended with Ctrl+C: shown with `^C` after the line (FR-075).
  cancelled?: true;
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
  // The views waiting for this one to close (T311, research R47): each `vim`
  // of a line, or of a line that waited behind the view.
  vimQueue: readonly { source: VimSource; entry: Entry | null }[];
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
  vimQueue: [],
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

// A buffer's lines as vim counts them: none in an empty file.
const lineCount = (source: VimSource) => (source.text === '' && source.file.blank !== true ? 0 : source.text.split('\n').length);

// What opening the vim view says (FR-065).
function openedText(source: VimSource): string {
  const forms = siteText.terminal.announce.vimOpened;
  const form = source.file.new ? forms.new : source.file.readonly ? forms.readonly : forms.plain;
  return fill(form, { file: source.file.name, n: lineCount(source) });
}

// A message's tone: vim's warning, its errors, and the rest (design).
export function messageTone(message: Message): 'info' | 'warning' | 'error' {
  if (message.kind !== 'vim') return 'info';
  return message.code === 'W10' ? 'warning' : 'error';
}

// The vim view's message line in words (contracts/commands.md The vim
// view's keys), on its shell.
export function messageText(message: Message, state: VimState, shell: Shell = 'desktop'): string {
  const words = siteText.terminal.vim;
  const { file } = state.source;
  switch (message.kind) {
    case 'opened': {
      const form = file.new ? 'new' : file.path === null ? 'piped' : file.readonly ? 'readonly' : 'plain';
      const opening = fill(words.openings[form], { file: file.name, n: lineCount(state.source) });
      return state.folds.length > 0 ? `${opening}${words.foldHint[shell === 'mobile' ? 'phone' : 'desktop']}` : opening;
    }
    case 'written':
      return fill(words.written, { file: message.name, new: message.created ? words.writtenNew : '', n: message.lines, b: message.bytes });
    case 'vim':
      return fill(words.messages[message.code], { path: message.arg ?? '', typed: message.arg ?? '' });
    case 'oldest':
    case 'newest':
      return words.messages[message.kind];
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
    const cancelled = state.running?.id === waiting.entry.id && state.running.cancelled === true;
    const done: Entry = { ...waiting.entry, block, ...(cancelled ? { cancelled } : {}) };
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
    // What the line printed after its last `clear` stays (T298).
    const shown = block.length > 0 ? [done] : [];
    const views = (result.effects as Effect[]).filter((effect) => effect.kind === 'vim');
    for (const effect of result.effects as Effect[]) {
      if (effect.kind === 'clear') {
        const words = siteText.terminal.announce.cleared;
        const spoken = block.length > 0 ? `${words} ${announcementText(announce)}` : words;
        next = { ...next, entries: shown, starter: false, scrollTop: 0, shellScroll: {}, announcement: say(spoken) };
      }
      else if (effect.kind === 'clear-history') next = { ...next, history: next.history.slice(waiting.history.length) };
      else if (effect.kind === 'delete-history') next = { ...next, history: next.history.toSpliced(effect.index, 1) };
      else if (effect.kind === 'vim') {
        const source: VimSource = { file: effect.file, pipe: effect.pipe, text: effect.text, type: effect.type };
        // The line's entry goes with its last view, after what it printed.
        const owner = effect === views.at(-1) ? done : null;
        next = { ...next, entries: next.entries.filter((each) => each !== done) };
        if (next.vim === null) next = { ...next, vim: openVim(source), vimEntry: owner, announcement: say(openedText(source)) };
        else next = { ...next, vimQueue: [...next.vimQueue, { source, entry: owner }] };
      } else if (waiting.actions !== null) {
        const { actions } = waiting;
        acts.push(() => actions.open(effect.view));
      }
    }
    if (result.end === 'exited' && waiting.actions !== null) acts.push(waiting.actions.exit);
    // The worker failed while the line ran: the failure is announced now,
    // as it would have been with no line running (FR-070).
    const shell = statusOf(null);
    if (shell === 'failed' && state.shell !== 'failed') next = { ...next, announcement: say(siteText.terminal.shellFailed) };
    set({ ...next, shell });
    for (const act of acts) act();
  }

  // Runs the next waiting line, when the shell is ready and none runs.
  function pump() {
    if (state.running !== null || queue.length === 0) return;
    const waiting = queue[0]!;
    // An empty line, or one ended with Ctrl+C while others waited, runs
    // nothing: it takes its place in order.
    if (waiting.entry.line.trim() === '' || waiting.entry.cancelled === true) {
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
      // `history -c` may have emptied the history since the last step.
      const index = stepping === null ? history.length - 1 : Math.max(0, Math.min(history.length, stepping.index) - 1);
      set({ ...state, draft: history[index]!, stepping: { index, saved: stepping?.saved ?? draft } });
      return;
    }
    if (stepping === null) return;
    const index = stepping.index + 1;
    if (index >= history.length) set({ ...state, draft: stepping.saved, stepping: null });
    else set({ ...state, draft: history[index]!, stepping: { ...stepping, index } });
  }

  // Ctrl+C with nothing selected (FR-075, research R33): stops the running
  // line, which ends with the "stopped" Ctrl+C line, and drops the lines
  // waiting, as a terminal's interrupt discards what's waiting (T308); else
  // ends the typed line with `^C`, not added to the history, and empties the
  // draft.
  function cancel() {
    if (state.vim !== null) return;
    const waited = queue.length > 0;
    queue = queue.map((each) => ({ ...each, entry: { ...each.entry, block: [], cancelled: true } }));
    const waiting = queue.map((each) => each.entry);
    const { running } = state;
    if (running !== null) {
      set({ ...state, running: { ...running, cancelled: true }, waiting });
      if (running.cancelled !== true) client.cancel();
      return;
    }
    const typed: Entry = { ...entry(state.draft), block: [], cancelled: true };
    const announcement = say(siteText.terminal.announce.cancelled);
    if (waited) {
      // A typed line takes its place after the lines it drops, as typed.
      if (state.draft !== '') queue = [...queue, { entry: typed, shell: 'desktop', actions: null, history: state.history }];
      set({ ...state, waiting: queue.map((each) => each.entry), draft: '', stepping: null, announcement });
      pump();
      return;
    }
    set({ ...state, entries: [...state.entries, typed], draft: '', stepping: null, announcement });
  }

  // A second Tab's list: an entry like Ctrl+C's, the line as typed and not in
  // the history, then the live prompt with the line as it was (FR-076).
  function showList(line: string, matches: readonly CompletionMatch[]) {
    const shown: Entry = { ...entry(line), block: [{ kind: 'completion', matches }] };
    set({ ...state, entries: [...state.entries, shown], announcement: say(fill(siteText.terminal.announce.possibilities, { n: matches.length })) });
  }

  // 100 matches or more ask first; `answer` then lists them or leaves it.
  function askList(line: string, count: number) {
    const question = fill(siteText.terminal.completionQuestion, { n: count });
    const shown: Entry = { ...entry(line), block: [{ kind: 'line', children: [{ kind: 'text', text: question, tone: 'dim' }] }] };
    set({ ...state, entries: [...state.entries, shown], announcement: say(question) });
  }

  function answerList(matches: readonly CompletionMatch[]) {
    const last = state.entries.at(-1);
    if (last === undefined || last.block === null) return;
    const shown: Entry = { ...last, block: [...last.block, { kind: 'completion', matches }] };
    set({ ...state, entries: [...state.entries.slice(0, -1), shown], announcement: say(fill(siteText.terminal.announce.possibilities, { n: matches.length })) });
  }

  // A write from the vim view, from the working folder (research R49). The
  // files it answers with are the session's, for a restarted worker.
  async function write(path: string, text: string, force: boolean, own?: string): Promise<WriteOutcome> {
    const at = generation;
    const outcome = await client.write({ id: (ids += 1), path, text, force, cwd: state.cwd, ...(own === undefined ? {} : { own }) });
    if (outcome.ok && at === generation) set({ ...state, files: outcome.files });
    return outcome;
  }

  function vim(input: VimInput) {
    if (state.vim === null) return;
    const next = vimReducer(state.vim, input);
    if (next === 'quit') {
      const entries = state.vimEntry === null ? state.entries : [...state.entries, state.vimEntry];
      const [following, ...rest] = state.vimQueue;
      if (following === undefined) set({ ...state, vim: null, vimEntry: null, entries });
      else set({ ...state, vim: openVim(following.source), vimEntry: following.entry, vimQueue: rest, entries, announcement: say(openedText(following.source)) });
      return;
    }
    if ('write' in next) {
      const at = generation;
      set({ ...state, vim: next.state });
      void write(next.write.path, next.write.text, next.write.force, next.write.own).then((outcome) => {
        if (at === generation) vim({ wrote: outcome });
      });
      return;
    }
    if (next === state.vim) return;
    const { modes } = siteText.terminal.vim;
    // A new message, or the mode changing, is announced once, even when its
    // words repeat (FR-065).
    const spokenText = next.message !== state.vim.message && next.message.kind !== 'none' ? messageText(next.message, next) : next.mode !== state.vim.mode ? modes[next.mode] : '';
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
    cancel,
    step,
    setDraft: (draft: string) => {
      if (draft !== state.draft) set({ ...state, draft });
    },
    // The menu's `Clear output` (FR-019): the history stays.
    clear: () => set({ ...state, entries: [], starter: false, scrollTop: 0, shellScroll: {}, announcement: say(siteText.terminal.announce.cleared) }),
    vim,
    write,
    // Tab: nothing while a line runs; the client drops a late answer.
    complete: (line: string, cursor: number): Promise<Completion | null> => (state.running !== null ? Promise.resolve(null) : client.complete(line, cursor)),
    showList,
    askList,
    answerList,
    announce: (text: string) => set({ ...state, announcement: say(text) }),
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
