// The Terminal's session (006 research R5, data-model.md Terminal session):
// one store per visit, outside the shells, so minimizing, going home and a
// shell switch keep it, and only closing the Terminal empties it (FR-021).
// It lives in memory only; nothing is written to storage (FR-022).
// Components read it with useSyncExternalStore.
import { siteText, fill } from '../../site-text.ts';
import { dateRange } from '../../format/dates.ts';
import { locationLine } from '../../format/location.ts';
import { withoutScheme } from '../../cv/CvLink.tsx';
import { TERMINAL } from '../../os/metrics.ts';
import { cvJson, resume, siteData, specList } from './data.ts';
import { engineContext, runLine } from './engine/commands.ts';
import type { RunContext } from './engine/commands.ts';
import type { Announcement, Block, Path, Result } from './engine/block.ts';
import { openVim, vimReducer } from './engine/vim.ts';
import type { Message, VimInput, VimState } from './engine/vim.ts';

export type Entry = {
  id: number;
  // As typed, for the run's heading and the history (FR-006).
  line: string;
  // Where it ran, for its prompt.
  folder: Path;
  // `hh:mm` when entered (research R17).
  time: string;
  // Null for an empty line.
  block: Block | null;
};

export type Session = {
  entries: readonly Entry[];
  history: readonly string[];
  folder: Path;
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
  // The greeting shows until the output is first cleared (FR-019).
  greeting: boolean;
};

export type Shell = RunContext['shell'];

const EMPTY: Session = { entries: [], history: [], folder: [], draft: '', stepping: null, scrollTop: 0, shellScroll: {}, vim: null, vimEntry: null, announcement: null, greeting: true };

export const clock = (date: Date) => [date.getHours(), date.getMinutes()].map((part) => String(part).padStart(2, '0')).join(':');

let built: RunContext | null = null;

// The run context of the real site, built on first use (research R9).
function siteContext(): RunContext {
  built ??= engineContext({ text: siteText, format: { dateRange, locationLine, withoutScheme }, resume, siteData, specs: specList, cvJson, columns: TERMINAL.columns });
  return built;
}

export function announcementText(announce: Announcement): string {
  if ('full' in announce) return announce.full;
  const { summary, units } = siteText.terminal.announce;
  return fill(summary, { command: announce.command, count: announce.count, unit: units[announce.unit] });
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

export function createSession(context: () => RunContext = siteContext) {
  let state: Session = EMPTY;
  let ids = 0;
  let spoken = 0;
  const listeners = new Set<() => void>();

  const set = (next: Session) => {
    if (next === state) return;
    state = next;
    for (const listener of listeners) listener();
  };
  const say = (text: string) => ({ text, id: (spoken += 1) });
  const entry = (line: string, block: Block | null): Entry => ({ id: (ids += 1), line, folder: state.folder, time: clock(new Date()), block });

  // Runs a typed line in `shell`, and gives back what it returned, so the
  // Terminal can act on `open` and `exit`.
  function run(line: string, shell: Shell): Result | null {
    const reset = { draft: '', stepping: null };
    if (line.trim() === '') {
      set({ ...state, ...reset, entries: [...state.entries, entry(line, null)] });
      return null;
    }
    const history = [...state.history, line];
    const result = runLine(line, { ...context(), folder: state.folder, history, shell });
    const next = { ...state, ...reset, history };
    switch (result.kind) {
      case 'clear':
        set({ ...next, entries: [], greeting: false, scrollTop: 0, shellScroll: {}, announcement: say(siteText.terminal.announce.cleared) });
        break;
      case 'open-vim': {
        const opened = openVim(result.file);
        const announcement = say(fill(siteText.terminal.announce.vim, { file: result.file.name, n: result.file.rows.length }));
        set({ ...next, vim: opened, vimEntry: entry(line, []), announcement });
        break;
      }
      case 'cd':
        set({ ...next, entries: [...state.entries, entry(line, result.block)], folder: result.folder, announcement: say(announcementText(result.announce)) });
        break;
      case 'os':
        set({ ...next, entries: [...state.entries, entry(line, result.block)] });
        break;
      case 'output':
        set({ ...next, entries: [...state.entries, entry(line, result.block)], announcement: say(announcementText(result.announce)) });
        break;
    }
    return result;
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
    clear: () => set({ ...state, entries: [], greeting: false, scrollTop: 0, shellScroll: {}, announcement: say(siteText.terminal.announce.cleared) }),
    vim,
    saveScroll: (scrollTop: number, shell: Shell = 'desktop') => {
      if (scrollTop !== state.scrollTop || scrollTop !== state.shellScroll[shell]) set({ ...state, scrollTop, shellScroll: { ...state.shellScroll, [shell]: scrollTop } });
    },
    // Where a shell's output was scrolled to, or the last place in the other.
    scrollFor: (shell: Shell) => state.shellScroll[shell] ?? state.scrollTop,
    // On close: as on first open (FR-021).
    reset: () => set(EMPTY),
  };
}

export type TerminalSession = ReturnType<typeof createSession>;

// The visit's one session.
export const session: TerminalSession = createSession();
