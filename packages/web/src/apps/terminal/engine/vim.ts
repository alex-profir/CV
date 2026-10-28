// The read-only vim view's model (006 research R12, data-model.md Vim view):
// a pure reducer from a key or a typed command to the next state. Every key
// FR-060 lists is a case; any other key, and any key with Ctrl, Alt or Meta,
// does nothing. The text never changes, and the cursor is always on a shown
// line, never inside a closed fold. Messages are kinds; the view words them.
import type { VimSource } from './block.ts';

export type Match = { line: number; start: number; end: number };

export type Message =
  | { kind: 'opened' }
  | { kind: 'read-only' }
  | { kind: 'unknown'; command: string }
  | { kind: 'match'; index: number; count: number }
  | { kind: 'not-found'; text: string }
  | { kind: 'none' };

export type VimState = {
  source: VimSource;
  // 0-based.
  cursor: { line: number; column: number };
  // The start lines of the closed folds.
  closed: ReadonlySet<number>;
  numbers: boolean;
  search: { text: string; matches: readonly Match[]; current: number } | null;
  // A `/` or `:` being typed.
  entry: { kind: '/' | ':'; text: string } | null;
  help: boolean;
  message: Message;
  // The first key of gg, za… or dd.
  pending: 'g' | 'z' | 'd' | null;
};

// `page`: the lines Page Up and Page Down move, from the view's height.
export type VimInput = { key: string; ctrl?: boolean; alt?: boolean; meta?: boolean; page?: number } | { submit: string } | { cancel: true } | { fold: number };

const DEFAULT_PAGE = 20;

// Keys and commands that would change the file (FR-060).
const EDITING_KEYS = new Set(['i', 'I', 'a', 'A', 'o', 'O', 'x', 'X', 'p', 'P', 'r', 'R', 's', 'S', 'c', 'C', 'u', 'D']);
const WRITE_COMMANDS = new Set(['w', 'wq', 'w!', 'wq!', 'x', 'x!', 'wa', 'wqa', 'sav', 'saveas', 'e', 'e!']);

export function lineText(state: VimState, line: number): string {
  const row = state.source.rows[line];
  return row === undefined ? '' : ' '.repeat(row.indent) + row.tokens.map((token) => token.text).join('');
}

// The fold whose lines hold `line`.
const foldAt = (state: VimState, line: number) => state.source.folds.find((fold) => fold.start <= line && line <= fold.end);

// The lines shown, top to bottom: a closed fold shows its first line only.
export function shownLines(state: VimState): number[] {
  const lines: number[] = [];
  for (let line = 0; line < state.source.rows.length; line += 1) {
    const fold = foldAt(state, line);
    if (fold !== undefined && state.closed.has(fold.start) && line > fold.start) continue;
    lines.push(line);
  }
  return lines;
}

// The shown line a line is on: its closed fold's first line, or itself.
function shownLine(state: VimState, line: number): number {
  const fold = foldAt(state, line);
  return fold !== undefined && state.closed.has(fold.start) ? fold.start : line;
}

const isClosedFoldLine = (state: VimState, line: number) => state.closed.has(line);

const lastColumn = (state: VimState, line: number) => (isClosedFoldLine(state, line) ? 0 : Math.max(0, lineText(state, line).length - 1));

function moveTo(state: VimState, line: number, column = state.cursor.column): VimState {
  const target = shownLine(state, Math.max(0, Math.min(line, state.source.rows.length - 1)));
  return { ...state, cursor: { line: target, column: Math.max(0, Math.min(column, lastColumn(state, target))) } };
}

// Moves `by` shown lines.
function step(state: VimState, by: number): VimState {
  const shown = shownLines(state);
  const at = shown.indexOf(state.cursor.line);
  return moveTo(state, shown[Math.max(0, Math.min(at + by, shown.length - 1))]!);
}

// Words as vim's `w` and `b` see them: runs of letters, digits and `_`, or
// runs of other characters that aren't blank.
const wordKind = (char: string | undefined) => (char === undefined || /\s/.test(char) ? 0 : /\w/.test(char) ? 1 : 2);

function wordStarts(text: string): number[] {
  const starts: number[] = [];
  for (let index = 0; index < text.length; index += 1) {
    const kind = wordKind(text[index]);
    if (kind !== 0 && kind !== wordKind(text[index - 1])) starts.push(index);
  }
  return starts;
}

function word(state: VimState, forward: boolean): VimState {
  const shown = shownLines(state);
  let at = shown.indexOf(state.cursor.line);
  let column = state.cursor.column;
  for (let tries = 0; tries < shown.length; tries += 1) {
    const line = shown[at]!;
    const starts = isClosedFoldLine(state, line) ? [0] : wordStarts(lineText(state, line));
    const found = forward ? starts.find((start) => start > column) : starts.findLast((start) => start < column);
    if (found !== undefined) return { ...state, cursor: { line, column: found } };
    at += forward ? 1 : -1;
    if (at < 0 || at >= shown.length) return state;
    column = forward ? -1 : Number.POSITIVE_INFINITY;
  }
  return state;
}

function setClosed(state: VimState, closed: Set<number>): VimState {
  const next = { ...state, closed };
  return moveTo(next, shownLine(next, state.cursor.line));
}

function toggleFold(state: VimState, start: number, open?: boolean): VimState {
  const closed = new Set(state.closed);
  const shut = open === undefined ? !closed.has(start) : !open;
  if (shut) closed.add(start);
  else closed.delete(start);
  return setClosed(state, closed);
}

function sections(state: VimState, forward: boolean): VimState {
  const starts = state.source.folds.map((fold) => fold.start);
  const line = state.cursor.line;
  const target = forward ? (starts.find((start) => start > line) ?? state.source.rows.length - 1) : (starts.findLast((start) => start < line) ?? 0);
  return moveTo(state, target, 0);
}

// Every match of `text` in the file, without regard to capitals.
function findMatches(state: VimState, text: string): Match[] {
  const needle = text.toLowerCase();
  const matches: Match[] = [];
  if (needle === '') return matches;
  state.source.rows.forEach((_row, line) => {
    const haystack = lineText(state, line).toLowerCase();
    for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + needle.length)) matches.push({ line, start: at, end: at + needle.length });
  });
  return matches;
}

// The cursor on a match, with its fold opened.
function showMatch(state: VimState, current: number): VimState {
  const search = state.search!;
  const match = search.matches[current]!;
  const fold = foldAt(state, match.line);
  const closed = new Set(state.closed);
  if (fold !== undefined) closed.delete(fold.start);
  return { ...state, closed, search: { ...search, current }, cursor: { line: match.line, column: match.start }, message: { kind: 'match', index: current + 1, count: search.matches.length } };
}

function searchFor(state: VimState, text: string): VimState {
  const matches = findMatches(state, text);
  if (matches.length === 0) return { ...state, search: null, message: { kind: 'not-found', text } };
  const { line, column } = state.cursor;
  const after = matches.findIndex((match) => match.line > line || (match.line === line && match.start > column));
  return showMatch({ ...state, search: { text, matches, current: 0 } }, after === -1 ? 0 : after);
}

function nextMatch(state: VimState, by: 1 | -1): VimState {
  const search = state.search;
  if (search === null || search.matches.length === 0) return state;
  const count = search.matches.length;
  return showMatch(state, (search.current + by + count) % count);
}

function command(state: VimState, typed: string): VimState | 'quit' {
  const text = typed.trim();
  if (text === 'q' || text === 'q!' || text === 'quit' || text === 'quit!') return state.help ? { ...state, help: false } : 'quit';
  if (text === 'help' || text === 'h') return { ...state, help: true };
  if (text === 'set nu' || text === 'set number') return { ...state, numbers: true };
  if (text === 'set nonu' || text === 'set nonumber') return { ...state, numbers: false };
  if (/^\d+$/.test(text)) return moveTo(state, Number(text) - 1, 0);
  if (WRITE_COMMANDS.has(text)) return { ...state, message: { kind: 'read-only' } };
  return { ...state, message: { kind: 'unknown', command: text } };
}

export function openVim(source: VimSource): VimState {
  const closed = new Set(source.folds.map((fold) => fold.start));
  return {
    source,
    cursor: { line: source.folds[0]?.start ?? 0, column: 0 },
    closed,
    numbers: true,
    search: null,
    entry: null,
    help: false,
    message: { kind: 'opened' },
    pending: null,
  };
}

function key(state: VimState, input: { key: string; page?: number }): VimState {
  const { key: name } = input;
  if (state.pending !== null) {
    const pending = state.pending;
    const done = { ...state, pending: null };
    if (pending === 'g') return name === 'g' ? moveTo(done, 0, 0) : done;
    if (pending === 'd') return name === 'd' ? { ...done, message: { kind: 'read-only' } } : done;
    const fold = foldAt(done, done.cursor.line);
    switch (name) {
      case 'a':
        return fold === undefined ? done : toggleFold(done, fold.start);
      case 'o':
        return fold === undefined ? done : toggleFold(done, fold.start, true);
      case 'c':
        return fold === undefined ? done : toggleFold(done, fold.start, false);
      case 'R':
        return setClosed(done, new Set());
      case 'M':
        return setClosed(done, new Set(done.source.folds.map((each) => each.start)));
      default:
        return done;
    }
  }
  switch (name) {
    case 'j':
    case 'ArrowDown':
      return step(state, 1);
    case 'k':
    case 'ArrowUp':
      return step(state, -1);
    case 'h':
    case 'ArrowLeft':
      return moveTo(state, state.cursor.line, state.cursor.column - 1);
    case 'l':
    case 'ArrowRight':
      return moveTo(state, state.cursor.line, state.cursor.column + 1);
    case 'w':
      return word(state, true);
    case 'b':
      return word(state, false);
    case '0':
    case 'Home':
      return moveTo(state, state.cursor.line, 0);
    case '$':
    case 'End':
      return moveTo(state, state.cursor.line, Number.POSITIVE_INFINITY);
    case 'G':
      return moveTo(state, state.source.rows.length - 1, 0);
    case '{':
      return sections(state, false);
    case '}':
      return sections(state, true);
    case 'PageDown':
      return step(state, input.page ?? DEFAULT_PAGE);
    case 'PageUp':
      return step(state, -(input.page ?? DEFAULT_PAGE));
    case 'n':
      return nextMatch(state, 1);
    case 'N':
      return nextMatch(state, -1);
    case 'g':
    case 'z':
    case 'd':
      return { ...state, pending: name };
    case '/':
    case ':':
      return { ...state, entry: { kind: name, text: '' } };
    default:
      return EDITING_KEYS.has(name) ? { ...state, message: { kind: 'read-only' } } : state;
  }
}

export function vimReducer(state: VimState, input: VimInput): VimState | 'quit' {
  if ('cancel' in input) return state.entry === null && state.pending === null ? state : { ...state, entry: null, pending: null };
  if ('fold' in input) {
    const fold = state.source.folds.find((each) => each.start === input.fold);
    return fold === undefined ? state : toggleFold(moveTo(state, fold.start, 0), fold.start);
  }
  if ('submit' in input) {
    const kind = state.entry?.kind;
    const done = { ...state, entry: null };
    if (kind === '/') return input.submit === '' ? done : searchFor(done, input.submit);
    if (kind === ':') return command(done, input.submit);
    return state;
  }
  if (input.ctrl === true || input.alt === true || input.meta === true) return state;
  if (input.key === 'Escape') return state.entry === null && state.pending === null ? state : { ...state, entry: null, pending: null };
  if (state.entry !== null) return state;
  return key(state, input);
}
