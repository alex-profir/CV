// The vim view's model (006 research R47 to R49, data-model.md Vim view): a
// pure reducer over editable text, from a key, typed text or a typed command
// to the next state. The buffer is lines of text, never re-printed. Folds are
// recomputed from the lines after each change, and keep their closed state by
// key. Each change is one undo step, and everything from entering insert mode
// to Escape is one. The cursor is always on a shown line, never inside a closed
// fold. Messages are kinds; the view words them.
import type { JsonFold, VimFile } from './block.ts';
import { keyName } from './json.ts';

// The worker's answer to a write, as far as the view reads it.
type WriteOutcome = { ok: true; path: string; created: boolean; lines: number; bytes: number } | { ok: false; error: 'exists' | 'cant-open' | 'full'; path: string };

export type VimSource = { file: VimFile; pipe: string | null; text: string; type: 'json' | 'text' };

export type Match = { line: number; start: number; end: number };

type Cursor = { line: number; column: number };
export type Step = { lines: readonly string[]; cursor: Cursor };

export type MessageCode = 'W10' | 'E13' | 'E32' | 'E37' | 'E45' | 'E212' | 'E492' | 'E514';
export type Message =
  | { kind: 'opened' }
  | { kind: 'written'; name: string; created: boolean; lines: number; bytes: number }
  | { kind: 'vim'; code: MessageCode; arg?: string }
  | { kind: 'oldest' }
  | { kind: 'newest' }
  | { kind: 'match'; index: number; count: number }
  | { kind: 'not-found'; text: string }
  | { kind: 'none' };

// A count, an operator, or `g`, `z`, `Z` or `r` waiting for its key. `before`:
// the count typed before the operator, as `2d3w` is 6 words.
export type Pending = { count: number | null; before: number | null; operator: 'd' | 'c' | 'y' | null; prefix: 'g' | 'z' | 'Z' | 'r' | null };

export type VimState = {
  source: VimSource;
  lines: readonly string[];
  folds: readonly JsonFold[];
  // Closed folds, by key.
  closed: ReadonlySet<string>;
  mode: 'normal' | 'insert';
  // 0-based.
  cursor: Cursor;
  numbers: boolean;
  search: { text: string; matches: readonly Match[]; current: number } | null;
  // A `/` or `:` being typed.
  entry: { kind: '/' | ':'; text: string } | null;
  help: boolean;
  message: Message;
  pending: Pending | null;
  register: { text: string; lines: boolean } | null;
  undo: readonly Step[];
  redo: readonly Step[];
  modified: boolean;
  warned: boolean;
  // The last change's inputs, for `.`, and those of the one being typed.
  last: readonly VimInput[];
  typing: readonly VimInput[];
  // The lines last opened or written, for `modified`.
  saved: readonly string[];
  // The buffer as it was when insert mode began, for its one undo step.
  entered: Step | null;
  // A write on its way to the worker, for its `{ wrote }` answer.
  writing: { name: string; own: boolean; then: 'stay' | 'quit' } | null;
};

// `page`: the lines Page Up and Page Down move, from the view's height.
export type VimInput =
  | { key: string; ctrl?: boolean; alt?: boolean; meta?: boolean; page?: number }
  | { text: string }
  | { delete: 'backward' | 'forward' }
  | { lineBreak: true }
  | { submit: string }
  | { cancel: true }
  | { fold: number }
  | { point: Cursor }
  | { wrote: WriteOutcome };

// The worker fills in the request's id and working folder. `state` is the
// buffer while the write is on its way.
export type VimWrite = { write: { path: string; text: string; force: boolean }; then: 'stay' | 'quit'; state: VimState };
export type VimOutput = VimState | 'quit' | VimWrite;

const DEFAULT_PAGE = 20;
// vim's default undolevels.
const UNDO_LEVELS = 1000;

const FOLD_OPEN = /^ {2}(?:("(?:[^"\\]|\\.)*")\s*:\s*)?[{[]\s*$/;
const FOLD_CLOSE = /^ {2}[}\]],?\s*$/;
const MEMBER = /^ {2}\S/;

// A top-level key at indent 2 opening `{` or `[`, to the line at indent 2 that
// closes it, as the CV's JSON is laid out (research R47). Array items have
// their index as key.
function foldsOf(lines: readonly string[], type: VimSource['type']): JsonFold[] {
  const folds: JsonFold[] = [];
  if (type !== 'json') return folds;
  let member = 0;
  let open: { key: string; start: number } | null = null;
  lines.forEach((line, index) => {
    if (open !== null) {
      if (FOLD_CLOSE.test(line)) {
        folds.push({ key: open.key, start: open.start, end: index });
        open = null;
      }
      return;
    }
    const match = FOLD_OPEN.exec(line);
    if (match !== null) open = { key: match[1] === undefined ? String(member) : keyName(match[1]), start: index };
    if (MEMBER.test(line)) member += 1;
  });
  return folds;
}

export const lineText = (state: VimState, line: number): string => state.lines[line] ?? '';

// The fold whose lines hold `line`.
const foldAt = (state: VimState, line: number) => state.folds.find((fold) => fold.start <= line && line <= fold.end);
const closedFoldAt = (state: VimState, line: number) => {
  const fold = foldAt(state, line);
  return fold !== undefined && state.closed.has(fold.key) ? fold : undefined;
};

// The lines shown, top to bottom: a closed fold shows its first line only.
export function shownLines(state: VimState): number[] {
  const lines: number[] = [];
  for (let line = 0; line < state.lines.length; line += 1) {
    const fold = closedFoldAt(state, line);
    if (fold === undefined || line === fold.start) lines.push(line);
  }
  return lines;
}

// The shown line a line is on: its closed fold's first line, or itself.
const shownLine = (state: VimState, line: number) => closedFoldAt(state, line)?.start ?? line;

const isClosedFoldLine = (state: VimState, line: number) => closedFoldAt(state, line)?.start === line;

// The last column the cursor may take: in insert mode one past the line's end.
function lastColumn(state: VimState, line: number): number {
  if (isClosedFoldLine(state, line)) return 0;
  const length = lineText(state, line).length;
  return state.mode === 'insert' ? length : Math.max(0, length - 1);
}

function moveTo(state: VimState, line: number, column = state.cursor.column): VimState {
  const target = shownLine(state, Math.max(0, Math.min(line, state.lines.length - 1)));
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

function setClosed(state: VimState, closed: Set<string>): VimState {
  const next = { ...state, closed };
  return moveTo(next, shownLine(next, state.cursor.line));
}

function toggleFold(state: VimState, fold: JsonFold, open?: boolean): VimState {
  const closed = new Set(state.closed);
  const shut = open === undefined ? !closed.has(fold.key) : !open;
  if (shut) closed.add(fold.key);
  else closed.delete(fold.key);
  return setClosed(state, closed);
}

function sections(state: VimState, forward: boolean): VimState {
  const starts = state.folds.map((fold) => fold.start);
  const line = state.cursor.line;
  const target = forward ? (starts.find((start) => start > line) ?? state.lines.length - 1) : (starts.findLast((start) => start < line) ?? 0);
  return moveTo(state, target, 0);
}

// Every match of `text` in the file, without regard to capitals.
function findMatches(lines: readonly string[], text: string): Match[] {
  const needle = text.toLowerCase();
  const matches: Match[] = [];
  if (needle === '') return matches;
  lines.forEach((value, line) => {
    const haystack = value.toLowerCase();
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
  if (fold !== undefined) closed.delete(fold.key);
  return { ...state, closed, search: { ...search, current }, cursor: { line: match.line, column: match.start }, message: { kind: 'match', index: current + 1, count: search.matches.length } };
}

function searchFor(state: VimState, text: string): VimState {
  const matches = findMatches(state.lines, text);
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

const sameLines = (a: readonly string[], b: readonly string[]) => a === b || (a.length === b.length && a.every((line, index) => line === b[index]));

const firstNonBlank = (text: string) => Math.max(0, text.search(/\S/));

// The buffer changed: its folds, search and marks follow, the first change to
// a read-only buffer warns, and the cursor stays on a shown line. In insert
// mode a closed fold the cursor lands in opens.
function withLines(state: VimState, lines: readonly string[], cursor: Cursor): VimState {
  const buffer = lines.length === 0 ? [''] : lines;
  const folds = foldsOf(buffer, state.source.type);
  const warn = state.source.file.readonly && !state.warned && !sameLines(buffer, state.lines);
  const searched = state.search === null ? null : findMatches(buffer, state.search.text);
  const next: VimState = {
    ...state,
    lines: buffer,
    folds,
    modified: !sameLines(buffer, state.saved),
    ...(warn ? { warned: true, message: { kind: 'vim', code: 'W10' } as Message } : {}),
    search: state.search === null || searched === null || searched.length === 0 ? null : { ...state.search, matches: searched, current: Math.min(state.search.current, searched.length - 1) },
  };
  if (next.mode === 'insert') {
    const fold = closedFoldAt(next, cursor.line);
    const closed = new Set(next.closed);
    if (fold !== undefined) closed.delete(fold.key);
    return moveTo({ ...next, closed, cursor }, cursor.line, cursor.column);
  }
  return moveTo(next, cursor.line, cursor.column);
}

// A step of undo, the redo steps gone.
const pushed = (state: VimState, before: Step): VimState => ({ ...state, undo: [...state.undo, before].slice(-UNDO_LEVELS), redo: [] });

const stepOf = (state: VimState): Step => ({ lines: state.lines, cursor: state.cursor });

// One normal-mode change: one undo step.
function change(state: VimState, lines: readonly string[], cursor: Cursor): VimState {
  return pushed(withLines(state, lines, cursor), stepOf(state));
}

function back(state: VimState, count: number): VimState {
  let next = state;
  for (let times = 0; times < count; times += 1) {
    const before = next.undo.at(-1);
    if (before === undefined) return times === 0 ? { ...next, message: { kind: 'oldest' } } : next;
    next = { ...withLines(next, before.lines, before.cursor), undo: next.undo.slice(0, -1), redo: [...next.redo, stepOf(next)], message: { kind: 'none' } };
  }
  return next;
}

function forward(state: VimState, count: number): VimState {
  let next = state;
  for (let times = 0; times < count; times += 1) {
    const after = next.redo.at(-1);
    if (after === undefined) return times === 0 ? { ...next, message: { kind: 'newest' } } : next;
    next = { ...withLines(next, after.lines, after.cursor), redo: next.redo.slice(0, -1), undo: [...next.undo, stepOf(next)], message: { kind: 'none' } };
  }
  return next;
}

// Opens the closed fold the cursor is on, before a change that isn't a whole
// line's (research R47).
function opened(state: VimState): VimState {
  const fold = closedFoldAt(state, state.cursor.line);
  if (fold === undefined) return state;
  const closed = new Set(state.closed);
  closed.delete(fold.key);
  return { ...state, closed };
}

// The lines a line command takes: `count` shown lines from the cursor, a closed
// fold whole.
function lineSpan(state: VimState, count: number): { start: number; end: number } {
  const shown = shownLines(state);
  const at = shown.indexOf(state.cursor.line);
  const last = shown[Math.min(at + count - 1, shown.length - 1)]!;
  return { start: state.cursor.line, end: closedFoldAt(state, last)?.end ?? last };
}

function insertMode(state: VimState, cursor: Cursor, entered: Step = stepOf(state)): VimState {
  return { ...state, mode: 'insert', cursor, entered, message: state.message };
}

function enter(state: VimState, column: (text: string, at: number) => number): VimState {
  const open = opened(state);
  const { line, column: at } = open.cursor;
  return insertMode(open, { line, column: column(lineText(open, line), at) }, stepOf(state));
}

// Where `count` words end from `column`, within the line: past the blanks after
// them for `dw` and `yw`, at the word's own end for `cw`.
function wordEnd(text: string, column: number, count: number, blanks: boolean): number {
  let at = column;
  for (let times = 0; times < count && at < text.length; times += 1) {
    const kind = wordKind(text[at]);
    while (at < text.length && kind !== 0 && wordKind(text[at]) === kind) at += 1;
    if (kind === 0) while (at < text.length && wordKind(text[at]) === 0) at += 1;
    else if (blanks || times + 1 < count) while (at < text.length && wordKind(text[at]) === 0) at += 1;
  }
  return at;
}

function replaceLine(state: VimState, line: number, text: string): string[] {
  const lines = [...state.lines];
  lines[line] = text;
  return lines;
}

function deleteLines(state: VimState, count: number): VimState {
  const { start, end } = lineSpan(state, count);
  const text = state.lines.slice(start, end + 1).join('\n');
  const lines = [...state.lines.slice(0, start), ...state.lines.slice(end + 1)];
  const line = Math.min(start, Math.max(0, lines.length - 1));
  return { ...change(state, lines, { line, column: firstNonBlank(lines[line] ?? '') }), register: { text, lines: true } };
}

function changeLines(state: VimState, count: number): VimState {
  const { start, end } = lineSpan(state, count);
  const text = state.lines.slice(start, end + 1).join('\n');
  const lines = [...state.lines.slice(0, start), '', ...state.lines.slice(end + 1)];
  const before = stepOf(state);
  return { ...insertMode(withLines({ ...state, mode: 'insert' }, lines, { line: start, column: 0 }), { line: start, column: 0 }, before), register: { text, lines: true } };
}

function yankLines(state: VimState, count: number): VimState {
  const { start, end } = lineSpan(state, count);
  return { ...state, register: { text: state.lines.slice(start, end + 1).join('\n'), lines: true } };
}

function deleteChars(state: VimState, count: number): VimState {
  const open = opened(state);
  const { line, column } = open.cursor;
  const text = lineText(open, line);
  if (text === '') return open;
  const end = Math.min(text.length, column + count);
  return { ...change(open, replaceLine(open, line, text.slice(0, column) + text.slice(end)), { line, column }), register: { text: text.slice(column, end), lines: false } };
}

function operateWord(state: VimState, operator: 'd' | 'c' | 'y', count: number): VimState {
  const open = opened(state);
  const { line, column } = open.cursor;
  const text = lineText(open, line);
  const end = wordEnd(text, column, count, operator !== 'c');
  const register = { text: text.slice(column, end), lines: false };
  if (operator === 'y') return { ...open, register };
  const lines = replaceLine(open, line, text.slice(0, column) + text.slice(end));
  if (operator === 'd') return { ...change(open, lines, { line, column }), register };
  const cursor = { line, column };
  return { ...insertMode(withLines({ ...open, mode: 'insert' }, lines, cursor), cursor, stepOf(state)), register };
}

function toEnd(state: VimState, then: 'stay' | 'insert'): VimState {
  const open = opened(state);
  const { line, column } = open.cursor;
  const text = lineText(open, line);
  const register = { text: text.slice(column), lines: false };
  const lines = replaceLine(open, line, text.slice(0, column));
  if (then === 'stay') return { ...change(open, lines, { line, column }), register };
  const cursor = { line, column };
  return { ...insertMode(withLines({ ...open, mode: 'insert' }, lines, cursor), cursor, stepOf(state)), register };
}

function replaceChars(state: VimState, char: string, count: number): VimState {
  const open = opened(state);
  const { line, column } = open.cursor;
  const text = lineText(open, line);
  // vim refuses when fewer characters are left than the count.
  if (char.length !== 1 || column + count > text.length) return state;
  return change(open, replaceLine(open, line, text.slice(0, column) + char.repeat(count) + text.slice(column + count)), { line, column: column + count - 1 });
}

function join(state: VimState, count: number): VimState {
  const { start, end } = lineSpan(state, Math.max(2, count));
  if (end === start) return state;
  let text = state.lines[start]!;
  let column = text.length;
  for (let at = start + 1; at <= end; at += 1) {
    const next = state.lines[at]!.replace(/^\s+/, '');
    column = text.length;
    text = next === '' || /\s$/.test(text) || next.startsWith(')') ? text + next : `${text} ${next}`;
  }
  return change(state, [...state.lines.slice(0, start), text, ...state.lines.slice(end + 1)], { line: start, column });
}

function put(state: VimState, after: boolean, count: number): VimState {
  const { register } = state;
  if (register === null) return state;
  if (register.lines) {
    const { start, end } = lineSpan(state, 1);
    const at = after ? end + 1 : start;
    const added = Array.from({ length: count }, () => register.text.split('\n')).flat();
    return change(state, [...state.lines.slice(0, at), ...added, ...state.lines.slice(at)], { line: at, column: firstNonBlank(added[0]!) });
  }
  const open = opened(state);
  const { line, column } = open.cursor;
  const text = lineText(open, line);
  const at = after && text !== '' ? column + 1 : column;
  const added = register.text.repeat(count);
  return change(open, replaceLine(open, line, text.slice(0, at) + added + text.slice(at)), { line, column: at + added.length - 1 });
}

function openLine(state: VimState, below: boolean): VimState {
  const { start, end } = lineSpan(state, 1);
  const at = below ? end + 1 : start;
  const lines = [...state.lines.slice(0, at), '', ...state.lines.slice(at)];
  const cursor = { line: at, column: 0 };
  return insertMode(withLines({ ...state, mode: 'insert' }, lines, cursor), cursor, stepOf(state));
}

function leaveInsert(state: VimState): VimState {
  const { line, column } = state.cursor;
  const done: VimState = { ...state, mode: 'normal', entered: null };
  const left = moveTo(done, line, column - 1);
  const before = state.entered;
  return before === null || sameLines(before.lines, state.lines) ? left : pushed(left, before);
}

// The buffer's text as written: vim's final line break, and nothing for an
// empty buffer.
const fileText = (state: VimState) => (state.lines.length === 1 && state.lines[0] === '' ? '' : `${state.lines.join('\n')}\n`);

const vimMessage = (state: VimState, code: MessageCode, arg?: string): VimState => ({ ...state, message: { kind: 'vim', code, ...(arg === undefined ? {} : { arg }) } });

// `:w` and its kin (research R49's table).
function writeCommand(state: VimState, then: 'stay' | 'quit', force: boolean, target: string | null): VimOutput {
  const { file } = state.source;
  const own = target === null || target === file.name || target === file.path;
  if (own) {
    if (file.path === null) return vimMessage(state, 'E32');
    if (file.readonly && !force) return vimMessage(state, 'E45');
  }
  const name = own ? file.name : target!;
  return { write: { path: own ? file.path! : target!, text: fileText(state), force: own || force }, then, state: { ...state, writing: { name, own, then } } };
}

function wrote(state: VimState, outcome: WriteOutcome): VimOutput {
  const { writing } = state;
  if (writing === null) return state;
  const done: VimState = { ...state, writing: null };
  if (!outcome.ok) {
    if (outcome.error === 'exists') return vimMessage(done, 'E13');
    return vimMessage(done, outcome.error === 'full' ? 'E514' : 'E212', writing.name);
  }
  const { file } = done.source;
  const unnamed = file.path === null;
  const named = writing.own || unnamed;
  const source = named ? { ...done.source, file: { ...file, name: writing.name, path: outcome.path, new: false, readonly: unnamed ? false : file.readonly } } : done.source;
  const next: VimState = {
    ...done,
    source,
    saved: named ? done.lines : done.saved,
    modified: named ? false : done.modified,
    message: { kind: 'written', name: writing.name, created: outcome.created, lines: outcome.lines, bytes: outcome.bytes },
  };
  return writing.then === 'quit' ? 'quit' : next;
}

function command(state: VimState, typed: string): VimOutput {
  const text = typed.trim();
  if (text === 'q' || text === 'quit') {
    if (state.help) return { ...state, help: false };
    return state.modified ? vimMessage(state, 'E37') : 'quit';
  }
  if (text === 'q!' || text === 'quit!') return 'quit';
  if (text === 'help' || text === 'h') return { ...state, help: true };
  if (text === 'set nu' || text === 'set number') return { ...state, numbers: true };
  if (text === 'set nonu' || text === 'set nonumber') return { ...state, numbers: false };
  if (text === 'redo' || text === 'red') return forward(state, 1);
  if (text === 'undo' || text === 'u') return back(state, 1);
  if (/^\d+$/.test(text)) return moveTo(state, Number(text) - 1, 0);
  const write = /^(w|write|wq|x|xit)(!)?(?:\s+(.+))?$/.exec(text);
  if (write !== null) {
    const [, name, bang, target] = write;
    if ((name === 'x' || name === 'xit') && target === undefined && !state.modified) return 'quit';
    return writeCommand(state, name === 'w' || name === 'write' ? 'stay' : 'quit', bang !== undefined, target ?? null);
  }
  return vimMessage(state, 'E492', text);
}

export function openVim(source: VimSource): VimState {
  const lines = source.text.split('\n');
  const folds = foldsOf(lines, source.type);
  return {
    source,
    lines,
    folds,
    closed: new Set(folds.map((fold) => fold.key)),
    mode: 'normal',
    cursor: { line: folds[0]?.start ?? 0, column: 0 },
    numbers: true,
    search: null,
    entry: null,
    help: false,
    message: { kind: 'opened' },
    pending: null,
    register: null,
    undo: [],
    redo: [],
    modified: false,
    warned: false,
    last: [],
    typing: [],
    saved: lines,
    entered: null,
    writing: null,
  };
}

// Moves a count can repeat.
function repeated(state: VimState, count: number, move: (from: VimState) => VimState): VimState {
  let next = state;
  for (let times = 0; times < count; times += 1) next = move(next);
  return next;
}

const NO_PENDING: Pending = { count: null, before: null, operator: null, prefix: null };

function pendingKey(state: VimState, pending: Pending, name: string): VimOutput {
  const done: VimState = { ...state, pending: null };
  const count = (pending.before ?? 1) * (pending.count ?? 1);
  if (pending.prefix === 'r') return replaceChars(done, name, count);
  if (pending.prefix === 'Z') {
    if (name === 'Z') return state.modified ? writeCommand(done, 'quit', false, null) : 'quit';
    return name === 'Q' ? 'quit' : done;
  }
  if (pending.prefix === 'g') return name === 'g' ? moveTo(done, pending.count === null ? 0 : pending.count - 1, 0) : done;
  if (pending.prefix === 'z') {
    const fold = foldAt(done, done.cursor.line);
    switch (name) {
      case 'a':
        return fold === undefined ? done : toggleFold(done, fold);
      case 'o':
        return fold === undefined ? done : toggleFold(done, fold, true);
      case 'c':
        return fold === undefined ? done : toggleFold(done, fold, false);
      case 'R':
        return setClosed(done, new Set());
      case 'M':
        return setClosed(done, new Set(done.folds.map((each) => each.key)));
      default:
        return done;
    }
  }
  const { operator } = pending;
  if (operator === 'd') return name === 'd' ? deleteLines(done, count) : name === 'w' ? operateWord(done, 'd', count) : done;
  if (operator === 'c') return name === 'c' ? changeLines(done, count) : name === 'w' ? operateWord(done, 'c', count) : done;
  if (operator === 'y') return name === 'y' ? yankLines(done, count) : name === 'w' ? operateWord(done, 'y', count) : done;
  return done;
}

function normalKey(state: VimState, input: { key: string; page?: number }): VimOutput {
  const { key: name } = input;
  const { pending } = state;
  if (/^[0-9]$/.test(name) && pending?.prefix == null && (name !== '0' || pending?.count != null)) return { ...state, pending: { ...(pending ?? NO_PENDING), count: (pending?.count ?? 0) * 10 + Number(name) } };
  if (pending !== null && (pending.prefix !== null || pending.operator !== null)) return pendingKey(state, pending, name);
  const count = pending?.count ?? 1;
  const done: VimState = { ...state, pending: null };
  const { line, column } = done.cursor;
  switch (name) {
    case 'j':
    case 'ArrowDown':
      return step(done, count);
    case 'k':
    case 'ArrowUp':
      return step(done, -count);
    case 'h':
    case 'ArrowLeft':
      return moveTo(done, line, column - count);
    case 'l':
    case 'ArrowRight':
      return moveTo(done, line, column + count);
    case 'w':
      return repeated(done, count, (from) => word(from, true));
    case 'b':
      return repeated(done, count, (from) => word(from, false));
    case '0':
    case 'Home':
      return moveTo(done, line, 0);
    case '$':
    case 'End':
      return moveTo(step(done, count - 1), step(done, count - 1).cursor.line, Number.POSITIVE_INFINITY);
    case 'G':
      return moveTo(done, pending?.count == null ? done.lines.length - 1 : pending.count - 1, 0);
    case '{':
      return repeated(done, count, (from) => sections(from, false));
    case '}':
      return repeated(done, count, (from) => sections(from, true));
    case 'PageDown':
      return step(done, count * (input.page ?? DEFAULT_PAGE));
    case 'PageUp':
      return step(done, -count * (input.page ?? DEFAULT_PAGE));
    case 'n':
      return repeated(done, count, (from) => nextMatch(from, 1));
    case 'N':
      return repeated(done, count, (from) => nextMatch(from, -1));
    // Enter and Space activate the fold line the cursor is on (FR-061).
    case 'Enter':
    case ' ': {
      const fold = done.folds.find((each) => each.start === line);
      return fold === undefined ? done : toggleFold(done, fold);
    }
    case 'g':
    case 'z':
    case 'Z':
    case 'r':
      return { ...state, pending: { ...(pending ?? NO_PENDING), prefix: name } };
    case 'd':
    case 'c':
    case 'y':
      return { ...state, pending: { count: null, before: pending?.count ?? null, operator: name, prefix: null } };
    case '/':
    case ':':
      return { ...done, entry: { kind: name, text: '' } };
    case 'i':
      return enter(done, (_text, at) => at);
    case 'a':
      return enter(done, (text, at) => Math.min(text.length, at + 1));
    case 'I':
      return enter(done, (text) => firstNonBlank(text));
    case 'A':
      return enter(done, (text) => text.length);
    case 'o':
      return openLine(done, true);
    case 'O':
      return openLine(done, false);
    case 'x':
      return deleteChars(done, count);
    case 'D':
      return toEnd(done, 'stay');
    case 'C':
      return toEnd(done, 'insert');
    case 'J':
      return join(done, count);
    case 'p':
      return put(done, true, count);
    case 'P':
      return put(done, false, count);
    case 'u':
      return back(done, count);
    default:
      return done;
  }
}

function insertInput(state: VimState, input: VimInput): VimState {
  const { line, column } = state.cursor;
  const text = lineText(state, line);
  if ('text' in input) {
    const [head, ...rest] = input.text.split('\n');
    if (rest.length === 0) return withLines(state, replaceLine(state, line, text.slice(0, column) + input.text + text.slice(column)), { line, column: column + input.text.length });
    const tail = rest.at(-1)!;
    const added = [text.slice(0, column) + head, ...rest.slice(0, -1), tail + text.slice(column)];
    return withLines(state, [...state.lines.slice(0, line), ...added, ...state.lines.slice(line + 1)], { line: line + added.length - 1, column: tail.length });
  }
  if ('lineBreak' in input) return withLines(state, [...state.lines.slice(0, line), text.slice(0, column), text.slice(column), ...state.lines.slice(line + 1)], { line: line + 1, column: 0 });
  if ('delete' in input) {
    if (input.delete === 'backward') {
      if (column > 0) {
        const size = /[\uDC00-\uDFFF]/.test(text[column - 1]!) && column > 1 ? 2 : 1;
        return withLines(state, replaceLine(state, line, text.slice(0, column - size) + text.slice(column)), { line, column: column - size });
      }
      if (line === 0) return state;
      const previous = state.lines[line - 1]!;
      return withLines(state, [...state.lines.slice(0, line - 1), previous + text, ...state.lines.slice(line + 1)], { line: line - 1, column: previous.length });
    }
    if (column < text.length) return withLines(state, replaceLine(state, line, text.slice(0, column) + text.slice(column + (/[\uD800-\uDBFF]/.test(text[column]!) ? 2 : 1))), { line, column });
    if (line + 1 >= state.lines.length) return state;
    return withLines(state, [...state.lines.slice(0, line), text + state.lines[line + 1]!, ...state.lines.slice(line + 2)], { line, column });
  }
  if ('key' in input) {
    switch (input.key) {
      case 'Escape':
        return leaveInsert(state);
      case 'Tab':
        return insertInput(state, { text: '\t' });
      case 'ArrowLeft':
        return moveTo(state, line, column - 1);
      case 'ArrowRight':
        return moveTo(state, line, column + 1);
      case 'ArrowUp':
        return step(state, -1);
      case 'ArrowDown':
        return step(state, 1);
      case 'Home':
        return moveTo(state, line, 0);
      case 'End':
        return moveTo(state, line, Number.POSITIVE_INFINITY);
      default:
        return state;
    }
  }
  return state;
}

// One input, with `.`'s record of the change it belongs to.
function apply(state: VimState, input: VimInput): VimOutput {
  if ('wrote' in input) return wrote(state, input.wrote);
  if ('cancel' in input) return state.entry === null && state.pending === null ? state : { ...state, entry: null, pending: null, typing: [] };
  if ('point' in input) return moveTo(state, input.point.line, input.point.column);
  if ('fold' in input) {
    const fold = state.folds.find((each) => each.start === input.fold);
    return fold === undefined ? state : toggleFold(moveTo(state, fold.start, 0), fold);
  }
  if ('submit' in input) {
    const kind = state.entry?.kind;
    const done = { ...state, entry: null };
    if (kind === '/') return input.submit === '' ? done : searchFor(done, input.submit);
    if (kind === ':') return command(done, input.submit);
    return state;
  }
  if (state.mode === 'insert') {
    if ('key' in input && (input.ctrl === true || input.alt === true || input.meta === true)) return state;
    const next = insertInput(state, input);
    const typing = [...state.typing, input];
    if (next.mode === 'normal') return { ...next, last: typing, typing: [] };
    return { ...next, typing };
  }
  if (!('key' in input)) return state;
  // Ctrl+R redoes, sent only on macOS (FR-079).
  if (input.ctrl === true && input.key === 'r' && input.alt !== true && input.meta !== true) return forward({ ...state, pending: null }, state.pending?.count ?? 1);
  if (input.ctrl === true || input.alt === true || input.meta === true) return state;
  if (input.key === 'Escape') return state.entry === null && state.pending === null ? state : { ...state, entry: null, pending: null, typing: [] };
  if (state.entry !== null) return state;
  if (input.key === '.' && state.pending?.prefix == null && state.pending?.operator == null) return repeatLast(state);
  const next = normalKey(state, input);
  if (next === 'quit' || 'write' in next) return next;
  const typing = [...state.typing, input];
  if (next.pending !== null || next.mode === 'insert') return { ...next, typing };
  const undoKey = input.key === 'u';
  const changed = !undoKey && next.lines !== state.lines;
  return { ...next, typing: [], ...(changed ? { last: typing } : {}) };
}

const isCount = (input: VimInput) => 'key' in input && /^[0-9]$/.test(input.key);

// `.`: the last change's inputs again, with its count or a new one.
function repeatLast(state: VimState): VimState {
  const { last, pending } = state;
  if (last.length === 0) return { ...state, pending: null };
  const inputs = pending?.count == null ? last : [...String(pending.count)].map((digit): VimInput => ({ key: digit })).concat(last.filter((input, index) => !(isCount(input) && last.slice(0, index).every(isCount))));
  let next: VimState = { ...state, pending: null, typing: [] };
  for (const input of inputs) {
    const out = apply(next, input);
    if (out === 'quit' || 'write' in out) return next;
    next = out;
  }
  return { ...next, last: inputs, typing: [] };
}

export const vimReducer = (state: VimState, input: VimInput): VimOutput => apply(state, input);
