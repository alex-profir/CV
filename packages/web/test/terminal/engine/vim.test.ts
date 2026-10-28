// The vim view's model (006 research R12, data-model.md Vim view).
import { describe, expect, test } from 'vitest';
import { printJson } from '../../../src/apps/terminal/engine/json.ts';
import { lineText, openVim, shownLines, vimReducer } from '../../../src/apps/terminal/engine/vim.ts';
import type { VimInput, VimState } from '../../../src/apps/terminal/engine/vim.ts';

// A small CV-like document: a string, two top-level sections, a number.
const JSON_TEXT = JSON.stringify(
  {
    $schema: 'https://example.org/schema.json',
    basics: { name: 'Rest Person', label: 'Engineer of REST things', summary: 'Builds rest services and tests.' },
    work: [
      { name: 'Company', position: 'Engineer', summary: 'Wrote a REST API.' },
      { name: 'Other', position: 'Lead', highlights: ['More rest.', 'Less noise.'] },
    ],
    year: 2020,
  },
  null,
  2,
);

function source() {
  const printed = printJson(JSON_TEXT);
  if ('error' in printed) throw new Error('fixture is not JSON');
  return { name: 'cv.json', pipe: 'cat cv.json | jq | vim -', rows: printed.rows, folds: printed.folds, type: 'json' as const };
}

const open = () => openVim(source());

function apply(state: VimState, ...inputs: (VimInput | string)[]): VimState {
  let current = state;
  for (const input of inputs) {
    const next = vimReducer(current, typeof input === 'string' ? { key: input } : input);
    if (next === 'quit') throw new Error(`quit after ${JSON.stringify(input)}`);
    current = next;
  }
  return current;
}

// The text never changes, and the cursor is never inside a closed fold.
function invariants(state: VimState) {
  expect(state.source).toEqual(source());
  const shown = shownLines(state);
  expect(shown, JSON.stringify(state.cursor)).toContain(state.cursor.line);
}

const BASICS = 2;
const WORK = 7;

describe('006-terminal-FR-061: folds', () => {
  test('on opening, each top-level object or array is one closed fold, everything else open, the cursor on the first fold', () => {
    const state = open();
    expect([...state.closed].sort((a, b) => a - b)).toEqual([BASICS, WORK]);
    expect(state.source.folds.map((fold) => fold.key)).toEqual(['basics', 'work']);
    expect(shownLines(state)).toEqual([0, 1, BASICS, WORK, 22, 23]);
    expect(state.cursor).toEqual({ line: BASICS, column: 0 });
    expect(state.message).toEqual({ kind: 'opened' });
    expect(state.numbers).toBe(true);
  });

  test('za toggles, zo opens, zc closes, zR opens all and zM closes all; a fold input toggles that fold', () => {
    let state = apply(open(), 'z', 'a');
    expect(state.closed.has(BASICS)).toBe(false);
    state = apply(state, 'z', 'a');
    expect(state.closed.has(BASICS)).toBe(true);
    state = apply(state, 'z', 'o');
    expect(state.closed.has(BASICS)).toBe(false);
    state = apply(state, 'j', 'j', 'z', 'c');
    expect(state.closed.has(BASICS)).toBe(true);
    expect(state.cursor.line).toBe(BASICS);
    state = apply(state, 'z', 'R');
    expect(state.closed.size).toBe(0);
    state = apply(state, 'j', 'j', 'z', 'M');
    expect(state.closed.size).toBe(2);
    invariants(state);
    state = apply(state, { fold: WORK });
    expect(state.closed.has(WORK)).toBe(false);
    expect(state.cursor.line).toBe(WORK);
    state = apply(state, { fold: WORK });
    expect(state.closed.has(WORK)).toBe(true);
    invariants(state);
  });
});

describe('006-terminal-FR-060: the keys move as vim does, and nothing changes the file', () => {
  test('j, k and the arrows move a line, skipping closed folds as one line', () => {
    let state = apply(open(), 'j');
    expect(state.cursor.line).toBe(WORK);
    state = apply(state, 'ArrowDown');
    expect(state.cursor.line).toBe(22);
    state = apply(state, 'k', 'ArrowUp', 'k', 'k', 'k');
    expect(state.cursor.line).toBe(0);
    state = apply(state, 'G');
    expect(state.cursor.line).toBe(23);
    state = apply(state, 'j');
    expect(state.cursor.line).toBe(23);
    invariants(state);
  });

  test('h, l, the arrows, 0 and $ move along the line; w and b by words', () => {
    let state = apply(open(), 'k');
    expect(state.cursor).toEqual({ line: 1, column: 0 });
    state = apply(state, '$');
    expect(state.cursor.column).toBe(lineText(state, 1).length - 1);
    state = apply(state, '0', 'l', 'l', 'ArrowRight');
    expect(state.cursor.column).toBe(3);
    state = apply(state, 'h', 'ArrowLeft', 'h', 'h', 'h');
    expect(state.cursor.column).toBe(0);
    // `  "$schema": "https://…"`: words are `"$`, `schema`, `":`, `"`, `https`…
    state = apply(state, 'w');
    expect(state.cursor.column).toBe(2);
    state = apply(state, 'w');
    expect(state.cursor.column).toBe(4);
    state = apply(state, 'b');
    expect(state.cursor.column).toBe(2);
  });

  test('gg and G, { and }, Page Up and Page Down, and :12', () => {
    let state = apply(open(), 'z', 'R', 'G');
    expect(state.cursor.line).toBe(23);
    state = apply(state, 'g', 'g');
    expect(state.cursor.line).toBe(0);
    state = apply(state, '}');
    expect(state.cursor.line).toBe(BASICS);
    state = apply(state, '}');
    expect(state.cursor.line).toBe(WORK);
    state = apply(state, '{');
    expect(state.cursor.line).toBe(BASICS);
    state = apply(state, { key: 'PageDown', page: 10 });
    expect(state.cursor.line).toBe(12);
    state = apply(state, { key: 'PageUp', page: 10 });
    expect(state.cursor.line).toBe(BASICS);
    state = apply(state, ':', { submit: '12' });
    expect(state.cursor.line).toBe(11);
    state = apply(state, 'z', 'M', ':', { submit: '12' });
    expect(state.cursor.line).toBe(WORK);
    invariants(state);
  });

  test(':set nu and :set nonu show and hide line numbers', () => {
    let state = apply(open(), ':', { submit: 'set nonu' });
    expect(state.numbers).toBe(false);
    state = apply(state, ':', { submit: 'set nu' });
    expect(state.numbers).toBe(true);
  });

  test('i, a, o, x, dd, p, :w, :wq, :w! and :x change nothing and say the file is read only', () => {
    const start = apply(open(), 'j');
    for (const keys of [['i'], ['a'], ['o'], ['x'], ['d', 'd'], ['p'], ['A'], ['O']]) {
      const state = apply(start, ...keys);
      expect(state.message, keys.join('')).toEqual({ kind: 'read-only' });
      expect(state.cursor).toEqual(start.cursor);
      expect(state.closed).toEqual(start.closed);
      invariants(state);
    }
    for (const command of ['w', 'wq', 'w!', 'x']) expect(apply(start, ':', { submit: command }).message, command).toEqual({ kind: 'read-only' });
  });

  test('an unknown : command is named; Escape cancels /, : and a pending key', () => {
    expect(apply(open(), ':', { submit: 'foo' }).message).toEqual({ kind: 'unknown', command: 'foo' });
    for (const key of ['/', ':']) {
      const state = apply(open(), key);
      expect(state.entry).toEqual({ kind: key, text: '' });
      expect(apply(state, { cancel: true }).entry).toBeNull();
      expect(apply(state, 'Escape').entry).toBeNull();
    }
    for (const key of ['g', 'z', 'd']) {
      const pending = apply(open(), key);
      expect(pending.pending).toBe(key);
      const cancelled = apply(pending, 'Escape');
      expect(cancelled.pending).toBeNull();
      expect(apply(cancelled, 'g').cursor).toEqual(open().cursor);
    }
  });

  test('a Ctrl, Alt or Meta key is ignored, as is any key not listed', () => {
    const start = open();
    for (const input of [{ key: 'd', ctrl: true }, { key: 'f', ctrl: true }, { key: 'u', ctrl: true }, { key: 'j', alt: true }, { key: 'G', meta: true }, { key: 'q' }, { key: 'Tab' }, { key: 'F5' }]) {
      expect(vimReducer(start, input), JSON.stringify(input)).toEqual(start);
    }
  });
});

describe('006-terminal-FR-062: search', () => {
  test('/REST finds every match across the file without regard to capitals, opens the fold holding the current one, and n and N wrap', () => {
    let state = apply(open(), '/', { submit: 'REST' });
    expect(state.search?.matches.map((match) => match.line)).toEqual([3, 4, 5, 11, 17]);
    expect(state.search?.current).toBe(0);
    expect(state.message).toEqual({ kind: 'match', index: 1, count: 5 });
    expect(state.cursor).toEqual({ line: 3, column: state.search!.matches[0]!.start });
    expect(state.closed.has(BASICS)).toBe(false);
    expect(state.closed.has(WORK)).toBe(true);
    invariants(state);
    state = apply(state, 'n', 'n', 'n');
    expect(state.cursor.line).toBe(11);
    expect(state.closed.has(WORK)).toBe(false);
    expect(state.message).toEqual({ kind: 'match', index: 4, count: 5 });
    state = apply(state, 'n', 'n');
    expect(state.message).toEqual({ kind: 'match', index: 1, count: 5 });
    state = apply(state, 'N');
    expect(state.message).toEqual({ kind: 'match', index: 5, count: 5 });
    invariants(state);
  });

  test('a word that is not there says so, and the cursor stays', () => {
    const start = open();
    const state = apply(start, '/', { submit: 'nowhere' });
    expect(state.message).toEqual({ kind: 'not-found', text: 'nowhere' });
    expect(state.cursor).toEqual(start.cursor);
  });
});

describe('006-terminal-FR-064: :help and :q', () => {
  test(':help opens the split; the first :q closes it, the second quits; :q! likewise', () => {
    const help = apply(open(), ':', { submit: 'help' });
    expect(help.help).toBe(true);
    const closed = apply(help, ':', { submit: 'q' });
    expect(closed.help).toBe(false);
    expect(vimReducer(apply(closed, ':'), { submit: 'q' })).toBe('quit');
    const bang = apply(open(), ':', { submit: 'help' }, ':', { submit: 'q!' });
    expect(bang.help).toBe(false);
    expect(vimReducer(apply(bang, ':'), { submit: 'q!' })).toBe('quit');
  });
});
