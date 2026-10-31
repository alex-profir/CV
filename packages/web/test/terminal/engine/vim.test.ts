// The vim view's reducer (006 research R47 to R49, data-model.md Vim view
// transitions), on buffers opened from text: no DOM, no worker.
import { describe, expect, test } from 'vitest';
import { lineText, openVim, shownLines, vimReducer } from '../../../src/apps/terminal/engine/vim.ts';
import type { VimFile } from '../../../src/apps/terminal/engine/block.ts';
import type { VimInput, VimOutput, VimState } from '../../../src/apps/terminal/engine/vim.ts';

const FILE: VimFile = { name: 'todo', path: '/home/guest/todo', readonly: false, new: false };
const open = (text: string, file = FILE, type: 'json' | 'text' = 'text') => openVim({ file, pipe: null, text, type });
const JSON_TEXT = ['{', '  "a": "x",', '  "basics": {', '    "name": "N"', '  },', '  "work": [', '    1,', '    2', '  ],', '  "z": {}', '}'].join('\n');
const json = (file = FILE) => open(JSON_TEXT, file, 'json');

const state = (out: VimOutput): VimState => {
  if (out === 'quit' || 'write' in out) throw new Error(`expected a state, got ${JSON.stringify(out)}`);
  return out;
};
// Keys typed one by one; `:x` as a word is typed with `command`.
const keys = (from: VimState, ...typed: string[]) => typed.flatMap((word) => [...word]).reduce((at, key) => state(vimReducer(at, { key })), from);
const inputs = (from: VimState, ...sent: VimInput[]) => sent.reduce((at, input) => state(vimReducer(at, input)), from);
const command = (from: VimState, typed: string): VimOutput => vimReducer(state(vimReducer(from, { key: ':' })), { submit: typed });
const text = (at: VimState) => at.lines.join('\n');
const at = (s: VimState) => [s.cursor.line, s.cursor.column];
const Esc: VimInput = { key: 'Escape' };

describe('006-terminal-FR-060: moves, and what cancels them', () => {
  test('every move, each after a count', () => {
    const s = open('one two three\nfour\nfive\nsix\nseven\nend');
    expect(at(keys(s, 'l'))).toEqual([0, 1]);
    expect(at(keys(s, '3l'))).toEqual([0, 3]);
    expect(at(keys(s, '3lh'))).toEqual([0, 2]);
    expect(at(keys(s, 'j'))).toEqual([1, 0]);
    expect(at(keys(s, '3j'))).toEqual([3, 0]);
    expect(at(keys(s, '3jk'))).toEqual([2, 0]);
    expect(at(keys(s, 'w'))).toEqual([0, 4]);
    expect(at(keys(s, '2w'))).toEqual([0, 8]);
    expect(at(keys(s, '3w'))).toEqual([1, 0]);
    expect(at(keys(s, '2wb'))).toEqual([0, 4]);
    expect(at(keys(s, '$'))).toEqual([0, 12]);
    expect(at(keys(s, '2$'))).toEqual([1, 3]);
    expect(at(keys(s, '$0'))).toEqual([0, 0]);
    expect(at(keys(s, 'G'))).toEqual([5, 0]);
    expect(at(keys(s, '3G'))).toEqual([2, 0]);
    expect(at(keys(s, 'Ggg'))).toEqual([0, 0]);
    expect(at(keys(s, 'G2gg'))).toEqual([1, 0]);
    expect(at(inputs(s, { key: 'PageDown', page: 2 }))).toEqual([2, 0]);
    expect(at(inputs(s, { key: 'PageDown', page: 2 }, { key: 'PageUp', page: 1 }))).toEqual([1, 0]);
    expect(at(inputs(s, { key: 'ArrowDown' }, { key: 'ArrowRight' }, { key: 'End' }, { key: 'Home' }))).toEqual([1, 0]);
  });

  test('closed folds count as one line, and the cursor never lands inside one', () => {
    const s = json();
    expect(s.closed).toEqual(new Set(['basics', 'work']));
    expect(at(s)).toEqual([2, 0]);
    expect(shownLines(s)).toEqual([0, 1, 2, 5, 9, 10]);
    expect(at(keys(s, 'j'))).toEqual([5, 0]);
    expect(at(keys(s, '2j'))).toEqual([9, 0]);
    expect(at(keys(s, 'k'))).toEqual([1, 0]);
    expect(at(inputs(s, { point: { line: 3, column: 2 } }))).toEqual([2, 0]);
    expect(at(keys(s, '}'))).toEqual([5, 0]);
    expect(at(keys(s, '{'))).toEqual([0, 0]);
  });

  test('folds: za zo zc zR zM, Enter, a fold activated; plain text has none; each JSON object or array is closed on opening', () => {
    expect(open('  "a": {\n  }').folds).toEqual([]);
    const s = json();
    expect(keys(s, 'za').closed.has('basics')).toBe(false);
    expect(keys(s, 'zazc').closed.has('basics')).toBe(true);
    expect(keys(s, 'zo').closed.has('basics')).toBe(false);
    expect(keys(s, 'zR').closed.size).toBe(0);
    expect(keys(s, 'zRzM').closed.size).toBe(2);
    expect(inputs(s, { key: 'Enter' }).closed.has('basics')).toBe(false);
    expect(inputs(s, { fold: 5 }).closed.has('work')).toBe(false);
  });

  test('Escape cancels /, :, and a pending count, operator, g, z, Z or r', () => {
    const s = open('abc\ndef');
    for (const first of ['3', 'd', 'c', 'y', 'g', 'z', 'Z', 'r']) expect(inputs(keys(s, first), Esc).pending, first).toBeNull();
    for (const first of ['/', ':']) expect(inputs(keys(s, first), Esc).entry, first).toBeNull();
    expect(at(keys(inputs(keys(s, '3'), Esc), 'j'))).toEqual([1, 0]);
    expect(text(inputs(keys(s, 'd'), Esc))).toBe('abc\ndef');
  });

  test('Ctrl, Alt and Meta keys are ignored but { key: r, ctrl: true }', () => {
    const s = open('abc');
    for (const input of [{ key: 'x', ctrl: true }, { key: 'x', alt: true }, { key: 'x', meta: true }, { key: 'r', meta: true }, { key: 'd', ctrl: true }]) expect(vimReducer(s, input)).toBe(s);
  });

  test('search: / Enter, n N, wrapping, and not found', () => {
    const s = open('foo\nbar foo\nbaz');
    const found = inputs(keys(s, '/'), { submit: 'foo' });
    expect(at(found)).toEqual([1, 4]);
    expect(found.message).toEqual({ kind: 'match', index: 2, count: 2 });
    expect(at(keys(found, 'n'))).toEqual([0, 0]);
    expect(at(keys(found, 'N'))).toEqual([0, 0]);
    expect(inputs(keys(s, '/'), { submit: 'nope' }).message).toEqual({ kind: 'not-found', text: 'nope' });
  });

  test(':number, :set nu, :set nonu, and an unknown command gives E492', () => {
    const s = open('a\nb\nc');
    expect(at(state(command(s, '2')))).toEqual([1, 0]);
    expect(state(command(s, 'set nonu')).numbers).toBe(false);
    expect(state(command(state(command(s, 'set nonu')), 'set nu')).numbers).toBe(true);
    expect(state(command(s, 'foo')).message).toEqual({ kind: 'vim', code: 'E492', arg: 'foo' });
  });
});

describe('006-terminal-FR-079: editing', () => {
  const s = open('  hello world\nsecond line');

  test('i a I A o O enter insert mode at vim’s places', () => {
    const atWorld = keys(s, '2w');
    expect(atWorld.cursor.column).toBe(8);
    expect(keys(atWorld, 'i').mode).toBe('insert');
    expect(at(keys(atWorld, 'i'))).toEqual([0, 8]);
    expect(at(keys(atWorld, 'a'))).toEqual([0, 9]);
    expect(at(keys(atWorld, 'I'))).toEqual([0, 2]);
    expect(at(keys(atWorld, 'A'))).toEqual([0, 13]);
    const below = keys(s, 'o');
    expect(at(below)).toEqual([1, 0]);
    expect(below.lines).toEqual(['  hello world', '', 'second line']);
    const above = keys(s, 'O');
    expect(at(above)).toEqual([0, 0]);
    expect(above.lines).toEqual(['', '  hello world', 'second line']);
  });

  test('text, Backspace, Delete, Enter and Tab edit; Escape moves back one and the insert is one undo step', () => {
    let e = keys(s, 'A');
    e = inputs(e, { text: '!' }, { text: '?' }, { delete: 'backward' }, { key: 'Tab' }, { lineBreak: true }, { text: 'x' });
    expect(e.lines).toEqual(['  hello world!\t', 'x', 'second line']);
    expect(at(e)).toEqual([1, 1]);
    e = inputs(e, { key: 'Home' }, { delete: 'forward' });
    expect(e.lines[1]).toBe('');
    e = inputs(e, { delete: 'forward' });
    expect(e.lines).toEqual(['  hello world!\t', 'second line']);
    e = inputs(e, { delete: 'backward' });
    expect(e.lines).toEqual(['  hello world!\tsecond line']);
    e = inputs(e, Esc);
    expect(e.mode).toBe('normal');
    expect(at(e)).toEqual([0, 14]);
    expect(e.undo).toHaveLength(1);
    expect(text(keys(e, 'u'))).toBe(text(s));
  });

  test('x dd dw D, with counts', () => {
    const t = open('one two three\nb\nc\nd');
    expect(keys(t, 'x').lines[0]).toBe('ne two three');
    expect(keys(t, '5x').lines[0]).toBe('wo three');
    expect(keys(t, 'dw').lines[0]).toBe('two three');
    expect(keys(t, '2dw').lines[0]).toBe('three');
    expect(keys(t, 'd2w').lines[0]).toBe('three');
    expect(keys(t, 'wD').lines[0]).toBe('one ');
    expect(keys(t, 'dd').lines).toEqual(['b', 'c', 'd']);
    expect(keys(t, '3dd').lines).toEqual(['d']);
    expect(keys(t, 'ddp').lines).toEqual(['b', 'one two three', 'c', 'd']);
    expect(keys(open('only'), 'dd').lines).toEqual(['']);
    expect(keys(t, 'Gdd').cursor.line).toBe(2);
  });

  test('cw cc C r J, c… ending in insert mode', () => {
    const t = open('one two\n  next\nlast');
    const cw = keys(t, 'cw');
    expect(cw.mode).toBe('insert');
    expect(cw.lines[0]).toBe(' two');
    expect(text(inputs(cw, { text: 'ONE' }, Esc)).split('\n')[0]).toBe('ONE two');
    expect(keys(t, 'cc').lines).toEqual(['', '  next', 'last']);
    expect(keys(t, 'cc').mode).toBe('insert');
    expect(keys(t, 'wC').lines[0]).toBe('one ');
    expect(keys(t, 'wC').mode).toBe('insert');
    expect(keys(t, 'rZ').lines[0]).toBe('Zne two');
    expect(keys(t, '3rZ').lines[0]).toBe('ZZZ two');
    expect(keys(t, '9rZ').lines[0]).toBe('one two');
    const joined = keys(t, 'J');
    expect(joined.lines).toEqual(['one two next', 'last']);
    expect(at(joined)).toEqual([0, 7]);
    expect(keys(t, '3J').lines).toEqual(['one two next last']);
  });

  test('yy yw p P, by line and by character, with counts', () => {
    const t = open('one two\nb');
    expect(keys(t, 'yyp').lines).toEqual(['one two', 'one two', 'b']);
    expect(keys(t, 'yyP').lines).toEqual(['one two', 'one two', 'b']);
    expect(keys(t, 'yy3p').lines).toEqual(['one two', 'one two', 'one two', 'one two', 'b']);
    expect(keys(t, '2yyGp').lines).toEqual(['one two', 'b', 'one two', 'b']);
    expect(keys(t, 'yw$p').lines[0]).toBe('one twoone ');
    expect(keys(t, 'ywP').lines[0]).toBe('one one two');
    expect(keys(t, 'x2p').lines[0]).toBe('nooe two');
    expect(keys(t, 'yy').modified).toBe(false);
  });

  test('. replays the last change with its count, or a new one', () => {
    const t = open('a\nb\nc\nd\ne\nf\ng');
    expect(keys(t, 'dd.').lines).toEqual(['c', 'd', 'e', 'f', 'g']);
    expect(keys(t, '2dd.').lines).toEqual(['e', 'f', 'g']);
    expect(keys(t, 'dd3.').lines).toEqual(['e', 'f', 'g']);
    const typed = inputs(keys(open('x\ny'), 'A'), { text: '!' }, Esc);
    const again = keys(keys(typed, 'j'), '.');
    expect(again.lines).toEqual(['x!', 'y!']);
    expect(keys(keys(open('abc'), 'x'), 'j.').lines[0]).toBe('c');
    expect(keys(open('a'), '.').lines).toEqual(['a']);
  });

  test('u and :redo step through changes, with vim’s words at the ends', () => {
    const t = open('a\nb\nc');
    const two = keys(t, 'dddd');
    expect(keys(two, 'u').lines).toEqual(['b', 'c']);
    expect(keys(two, 'uu').lines).toEqual(['a', 'b', 'c']);
    expect(keys(two, '2u').lines).toEqual(['a', 'b', 'c']);
    expect(keys(two, 'uuu').message).toEqual({ kind: 'oldest' });
    expect(state(command(keys(two, 'uu'), 'redo')).lines).toEqual(['b', 'c']);
    expect(state(command(two, 'redo')).message).toEqual({ kind: 'newest' });
    expect(inputs(keys(two, 'u'), { key: 'r', ctrl: true }).lines).toEqual(['c']);
    expect(keys(two, 'u').modified).toBe(true);
    expect(keys(two, 'uu').modified).toBe(false);
    const fresh = keys(keys(two, 'u'), 'x');
    expect(fresh.redo).toEqual([]);
  });

  // T375, each from a real vim on a terminal, where each key is its own change.
  test.each([
    ['dd', 'j', 'dd', 'u', 'redo', 1, 0],
    ['dd', 'G', 'dd', 'u', 'redo', 4, 0],
    ['3dd', 'u', 'redo', 0, 0],
    ['j', 'A', 'x', 'Escape', 'u', 'redo', 1, 13],
    ['j', 'A', 'x', 'Escape', 'u', 1, 12],
    ['j', 'a', 'x', 'Escape', 'u', 1, 1],
    ['j', 'a', 'x', 'Escape', 'u', 'redo', 1, 1],
    ['j', 'w', 'c', 'w', 'z', 'z', 'Escape', 'u', 'redo', 1, 5],
    ['G', 'o', 'x', 'Escape', 'u', 'redo', 6, 0],
    ['j', 'O', 'x', 'Escape', 'u', 'redo', 1, 0],
  ] as const)('undo and redo come back to where the change began: %s %s %s', (...steps) => {
    const column = steps.at(-1) as number;
    const line = steps.at(-2) as number;
    let next = open('one two three\nfour five six\n\n  seven eight\nnine ten\neleven\ntwelve thirteen');
    for (const step of steps.slice(0, -2) as string[]) {
      if (step === 'redo') next = inputs(next, { key: 'r', ctrl: true });
      else if (step === 'Escape') next = inputs(next, { key: 'Escape' });
      else if (next.mode === 'insert') next = inputs(next, { text: step });
      else next = keys(next, step);
    }
    expect(next.cursor).toEqual({ line, column });
  });

  test('{ with a count past the paragraphs stays, as } does', () => {
    const text = open('one\n\ntwo\n\nthree');
    const end = keys(text, 'G');
    expect(keys(end, '{').cursor.line).toBe(3);
    expect(keys(end, '2{').cursor.line).toBe(1);
    expect(keys(end, '3{').cursor.line).toBe(0);
    expect(keys(end, '4{').cursor.line).toBe(4);
  });

  test('at most 1,000 undo steps are kept', () => {
    let e = open('a'.repeat(1100));
    for (let times = 0; times < 1100; times += 1) e = keys(e, 'x');
    expect(e.undo).toHaveLength(1000);
  });

  test('on a closed fold dd and yy take it whole; x and i open it first', () => {
    const s2 = json();
    expect(keys(s2, 'dd').lines).toEqual(['{', '  "a": "x",', '  "work": [', '    1,', '    2', '  ],', '  "z": {}', '}']);
    expect(keys(s2, 'yy').register).toEqual({ text: '  "basics": {\n    "name": "N"\n  },', lines: true });
    expect(keys(s2, 'x').closed.has('basics')).toBe(false);
    expect(keys(s2, 'i').closed.has('basics')).toBe(false);
    expect(keys(s2, 'o').lines[5]).toBe('');
    expect(keys(s2, 'O').lines[2]).toBe('');
    expect(keys(s2, 'yyp').lines.slice(5, 8)).toEqual(['  "basics": {', '    "name": "N"', '  },']);
  });

  test('folds follow the lines, keeping their closed state by key', () => {
    const s2 = json();
    const below = keys(keys(s2, 'k'), 'dd');
    expect(below.folds.find((fold) => fold.key === 'basics')).toEqual({ key: 'basics', start: 1, end: 3 });
    expect(below.closed.has('basics')).toBe(true);
    expect(shownLines(below)).toEqual([0, 1, 4, 8, 9]);
  });

  test('{ point } moves the cursor in both modes; in insert it may sit past the end', () => {
    const t = open('abc\ndef');
    expect(at(inputs(t, { point: { line: 1, column: 9 } }))).toEqual([1, 2]);
    expect(at(inputs(keys(t, 'i'), { point: { line: 1, column: 3 } }))).toEqual([1, 3]);
  });
});

describe('006-terminal-FR-080: writing', () => {
  const written = (name: string, created = false) => ({ wrote: { id: 1, ok: true as const, path: `/home/guest/${name}`, created, lines: 1, bytes: 2, files: { folders: [], files: {}, bytes: 0 } } });
  const changed = keys(open('a'), 'x');
  const writeOf = (out: VimOutput) => {
    if (out === 'quit' || !('write' in out)) throw new Error('expected a write');
    return out;
  };

  test(':w, :w path, :w! path, :wq, :x and ZZ give { write, then }', () => {
    expect(writeOf(command(changed, 'w'))).toMatchObject({ write: { path: FILE.path, text: '\n', force: true }, then: 'stay' });
    const typed = inputs(keys(open('a'), 'A'), { text: 'b' }, Esc);
    expect(writeOf(command(typed, 'w')).write.text).toBe('ab\n');
    expect(writeOf(command(typed, 'w other'))).toMatchObject({ write: { path: 'other', force: false }, then: 'stay' });
    expect(writeOf(command(typed, 'w! other'))).toMatchObject({ write: { path: 'other', force: true }, then: 'stay' });
    expect(writeOf(command(typed, 'wq')).then).toBe('quit');
    expect(writeOf(command(typed, 'x')).then).toBe('quit');
    expect(writeOf(vimReducer(keys(typed, 'Z'), { key: 'Z' })).then).toBe('quit');
  });

  test(':x and ZZ only write when modified, else quit', () => {
    expect(command(open('a'), 'x')).toBe('quit');
    expect(vimReducer(keys(open('a'), 'Z'), { key: 'Z' })).toBe('quit');
  });

  test(':w with [No Name] gives E32', () => {
    const noName = open('a', { name: '[No Name]', path: null, readonly: false, new: false });
    expect(state(command(noName, 'w')).message).toEqual({ kind: 'vim', code: 'E32' });
  });

  test('{ wrote } ok names the message, clears modified for its own file, keeps it for a copy, quits after :wq', () => {
    const own = state(vimReducer(writeOf(command(changed, 'w')).state, written('todo', true)));
    expect(own.message).toEqual({ kind: 'written', name: 'todo', created: true, lines: 1, bytes: 2 });
    expect(own.modified).toBe(false);
    expect(own.source.file.new).toBe(false);
    const copy = state(vimReducer(writeOf(command(changed, 'w ~/copy')).state, written('copy', true)));
    expect(copy.modified).toBe(true);
    expect(copy.source.file.name).toBe('todo');
    expect(copy.message).toMatchObject({ kind: 'written', name: '~/copy' });
    expect(vimReducer(writeOf(command(changed, 'wq')).state, written('todo'))).toBe('quit');
  });

  test('a [No Name] buffer takes the path as its name', () => {
    const noName = keys(open('ab', { name: '[No Name]', path: null, readonly: false, new: false }), 'x');
    const next = state(vimReducer(writeOf(command(noName, 'w notes')).state, written('notes', true)));
    expect(next.source.file).toEqual({ name: 'notes', path: '/home/guest/notes', readonly: false, new: false });
    expect(next.modified).toBe(false);
  });

  test('a failed write gives E13, E212 or E514, with the view open and the text kept', () => {
    const fail = (error: 'exists' | 'cant-open' | 'full') => state(vimReducer(writeOf(command(changed, 'wq')).state, { wrote: { ok: false, error, path: 'todo' } }));
    expect(fail('exists').message).toEqual({ kind: 'vim', code: 'E13' });
    expect(fail('cant-open').message).toEqual({ kind: 'vim', code: 'E212', arg: 'todo' });
    expect(fail('full').message).toEqual({ kind: 'vim', code: 'E514', arg: 'todo' });
    expect(fail('full').modified).toBe(true);
  });
});

describe('006-terminal-FR-081: a read-only buffer', () => {
  const ro = open('a\nb', { ...FILE, name: 'about', readonly: true });

  test('it changes on screen, with W10 once at the first change', () => {
    const first = keys(ro, 'x');
    expect(first.message).toEqual({ kind: 'vim', code: 'W10' });
    expect(first.lines[0]).toBe('');
    const later = keys({ ...first, message: { kind: 'none' } }, 'j', 'x');
    expect(later.message).toEqual({ kind: 'none' });
    expect(inputs(keys(ro, 'i'), { text: 'z' }).message).toEqual({ kind: 'vim', code: 'W10' });
    expect(keys(ro, 'i').message).toEqual({ kind: 'opened' });
  });

  test(':w, :wq and :x give E45 and no write; :w! tries; :w ~/copy writes the changed text', () => {
    const edited = keys(ro, 'x');
    for (const typed of ['w', 'wq', 'x']) expect(state(command(edited, typed)).message, typed).toEqual({ kind: 'vim', code: 'E45' });
    const forced = command(edited, 'w!');
    if (forced === 'quit' || !('write' in forced)) throw new Error('expected a write');
    expect(forced.write).toMatchObject({ force: true });
    const copy = command(edited, 'w ~/copy');
    if (copy === 'quit' || !('write' in copy)) throw new Error('expected a write');
    expect(copy.write).toMatchObject({ path: '~/copy', text: '\nb\n', force: false });
  });
});

describe('006-terminal-FR-064 and 006-terminal-FR-061: the help split, and leaving', () => {
  test(':help opens the split; the first :q closes it, the second quits, or gives E37 when modified; :q! always quits', () => {
    const s = open('a');
    const help = state(command(s, 'help'));
    expect(help.help).toBe(true);
    const closed = state(command(help, 'q'));
    expect(closed.help).toBe(false);
    expect(command(closed, 'q')).toBe('quit');
    const edited = keys(s, 'x');
    expect(state(command(edited, 'q')).message).toEqual({ kind: 'vim', code: 'E37' });
    expect(command(edited, 'q!')).toBe('quit');
    expect(command(state(command(edited, 'help')), 'q!')).toBe('quit');
  });

  test('lineText reads the buffer', () => {
    expect(lineText(open('a\nb'), 1)).toBe('b');
  });
});

// Each expected text and cursor was taken from `vim -u NONE -N -s` (9.1).
describe('006-terminal-FR-079 and 006-terminal-FR-060: as real vim does', () => {
  const TEXT = 'one two three\n  four five\n\nsix seven\neight nine\n\n\n  ten\neleven twelve';
  const after = (from: VimState) => [from.lines.join('\n'), ...at(from)];
  const typed = (from: VimState, text: string) => inputs(from, ...[...text].map((value) => ({ text: value })));

  test.each([
    ['3D', 'six seven\neight nine\n\n\n  ten\neleven twelve', 0, 0],
    ['j3D', 'one two three\neight nine\n\n\n  ten\neleven twelve', 1, 0],
    ['w2D', 'one \n\nsix seven\neight nine\n\n\n  ten\neleven twelve', 0, 3],
    ['8G3D', 'one two three\n  four five\n\nsix seven\neight nine\n\n', 6, 0],
    ['9G2D', TEXT, 8, 0],
    ['G3dd', TEXT, 8, 0],
  ])('%s', (sequence, expected, line, column) => {
    expect(after(keys(open(TEXT), sequence))).toEqual([expected, line, column]);
  });

  test('2C deletes to the line’s end and the next line, then inserts on the one left', () => {
    const changed = keys(open(TEXT), '2C');
    expect(changed.mode).toBe('insert');
    expect(changed.lines.slice(0, 2)).toEqual(['', '']);
    expect(after(inputs(typed(changed, 'x'), Esc))[0]).toBe('x\n\nsix seven\neight nine\n\n\n  ten\neleven twelve');
  });

  test.each([
    ['3i', 'xxxone two', 0, 2],
    ['3a', 'oxxxne two', 0, 3],
    ['3A', 'one twoxxx', 0, 9],
    ['3I', 'xxxone two', 0, 2],
    ['3o', 'one two\nx\nx\nx', 3, 0],
    ['3O', 'x\nx\nx\none two', 2, 0],
  ])('%sx<Esc> repeats what was typed, as one undo step', (sequence, expected, line, column) => {
    const done = inputs(typed(keys(open('one two'), sequence), 'x'), Esc);
    expect(after(done)).toEqual([expected, line, column]);
    expect(keys(done, 'u').lines).toEqual(['one two']);
  });

  test('on an empty line: J adds no leading space, dw deletes the line, 2dw the two empty lines', () => {
    expect(after(keys(open('\nabc'), 'J'))[0]).toBe('abc');
    expect(after(keys(open('\nabc'), 'dw'))[0]).toBe('abc');
    expect(after(keys(open('\n\nabc'), '2dw'))[0]).toBe('abc');
  });

  test.each([
    ['2G', 1, 2],
    ['8G', 7, 2],
    ['G', 8, 0],
    ['Ggg', 0, 0],
    ['2gg', 1, 2],
  ])('%s lands on the line’s first non-blank', (sequence, line, column) => {
    expect(at(keys(open(TEXT), sequence))).toEqual([line, column]);
  });

  test(':2 lands on the first non-blank', () => {
    expect(at(state(command(open(TEXT), '2')))).toEqual([1, 2]);
  });

  test.each([
    ['}', 2, 0],
    ['}}', 5, 0],
    ['}}}', 8, 12],
    ['G{', 6, 0],
    ['G{{', 2, 0],
    ['G{{{', 0, 0],
    ['4G{', 2, 0],
    ['3G}', 5, 0],
    ['7G{', 2, 0],
  ])('%s in a text file stops at blank lines', (sequence, line, column) => {
    expect(at(keys(open(TEXT), sequence))).toEqual([line, column]);
  });

  test('{ and } in JSON keep the fold jumps', () => {
    const moved = keys(json(), '}');
    expect(moved.folds.map((fold) => fold.start)).toContain(moved.cursor.line);
  });

  test('x, r, h and l treat a character as whole', () => {
    const emoji = open('a😀b');
    expect(text(keys(emoji, 'lx'))).toBe('ab');
    expect(at(keys(emoji, 'll'))).toEqual([0, 3]);
    expect(at(keys(emoji, 'llh'))).toEqual([0, 1]);
    expect(at(keys(emoji, '$h'))).toEqual([0, 1]);
    expect(text(keys(emoji, 'lrz'))).toBe('azb');
    expect(at(keys(open('a😀'), '$'))).toEqual([0, 1]);
    expect(at(inputs(keys(emoji, 'A'), { key: 'ArrowLeft' }, { key: 'ArrowLeft' }))).toEqual([0, 1]);
  });
});

// Each expected text and cursor from `vim -u NONE -N -s` 9.1 (T300, T309).
describe('006-terminal-FR-060 and 006-terminal-FR-079: the column kept, and word and paragraph moves as vim’s', () => {
  const WORDS = 'a\n\n\nb c\n d(e) f.g';
  const LONG = 'one two three\n  four five\n\nsix seven';
  const SEVEN = 'one two three\nfour five six\n\n  seven eight\nnine ten\neleven\ntwelve thirteen';
  const send = (from: VimState, typed: string) =>
    (typed.match(/<Esc>|./gs) ?? []).reduce((now, key) => (now.mode === 'insert' && key !== '<Esc>' ? state(vimReducer(now, { text: key })) : state(vimReducer(now, { key: key === '<Esc>' ? 'Escape' : key }))), from);
  test.each([
    ['abc\nabcdef', '$j', 'abc\nabcdef', [1, 5]],
    ['abcdef\nab\nabcdef', 'lllljj', 'abcdef\nab\nabcdef', [2, 4]],
    ['abcdef\n\nabcdef', 'lllljj', 'abcdef\n\nabcdef', [2, 4]],
    ['abc\nabcdef\nab\nabcdef', '$jj', 'abc\nabcdef\nab\nabcdef', [2, 1]],
    ['abcdef\nab\nabcdef', 'lllljh', 'abcdef\nab\nabcdef', [1, 0]],
    [WORDS, 'w', WORDS, [1, 0]],
    [WORDS, '2w', WORDS, [2, 0]],
    [WORDS, '4w', WORDS, [3, 2]],
    ['  a', '$b', '  a', [0, 0]],
    [WORDS, 'Gb', WORDS, [3, 2]],
    [WORDS, 'd3w', 'b c\n d(e) f.g', [0, 0]],
    [WORDS, '2d3w', '(e) f.g', [0, 0]],
    [WORDS, '2cwM<Esc>', 'M c\n d(e) f.g', [0, 0]],
    [WORDS, 'd3w2p', 'b c\na\n\n\na\n\n\n d(e) f.g', [1, 0]],
    [WORDS, 'wcwZ<Esc>2p', 'a\nZ\n\n\n\nb c\n d(e) f.g', [2, 0]],
    [LONG, 'd4w', 'five\n\nsix seven', [0, 0]],
    [LONG, 'y4wP', 'one two three\n  four one two three\n  four five\n\nsix seven', [0, 0]],
    [LONG, 'c4wX<Esc>', 'X five\n\nsix seven', [0, 0]],
    // T398: a count past the words, as vim 9.1.
    [SEVEN, 'c20wq<Esc>', 'q', [0, 0]],
    [SEVEN, '20cwq<Esc>', 'q', [0, 0]],
    [SEVEN, 'jc20wq<Esc>', 'one two three\nq', [1, 0]],
    [SEVEN, 'y20wP', `${SEVEN}${SEVEN}`, [0, 0]],
    [SEVEN, 'jd20w', 'one two three', [0, 0]],
    ['a\n\nb', '}', 'a\n\nb', [1, 0]],
    ['a\n\nb', '}}', 'a\n\nb', [2, 0]],
    ['a\n\nb', '2}', 'a\n\nb', [2, 0]],
    ['a', '}', 'a', [0, 0]],
    ['a', '2}', 'a', [0, 0]],
    ['a\nb', '}', 'a\nb', [1, 0]],
  ])('on %j, %s', (from, typed, lines, cursor) => {
    const done = send(open(from as string), typed as string);
    expect(text(done)).toBe(lines);
    expect(at(done)).toEqual(cursor);
  });

  test('past the last paragraph, a count leaves the cursor where it was', () => {
    expect(at(send(open('a\nb'), '2}'))).toEqual([0, 0]);
  });
});

describe('006-terminal-FR-080: a file of one blank line isn’t an empty file', () => {
  const BLANK: VimFile = { ...FILE, blank: true };
  const written = (out: VimOutput) => (out !== 'quit' && 'write' in out ? out.write.text : null);
  test('as vim, it writes its one line; x doesn’t delete it; dd empties it', () => {
    expect(written(command(open('', BLANK), 'w'))).toBe('\n');
    expect(written(command(keys(open('', BLANK), 'x'), 'w'))).toBe('\n');
    expect(written(command(keys(open('', BLANK), 'dd'), 'w'))).toBe('');
    expect(written(command(open('', FILE), 'w'))).toBe('');
  });
  test('deleting a buffer’s only line writes an empty file, and undo brings the line back', () => {
    const emptied = keys(open('x'), 'dd');
    expect(written(command(emptied, 'w'))).toBe('');
    expect(written(command(keys(emptied, 'u'), 'w'))).toBe('x\n');
  });
});

describe('006-terminal-FR-060: a count of `w` past the last word (T360)', () => {
  test.each([['20w', [1, 2]], ['5w', [1, 2]], ['w', [0, 4]]])('%s stops as vim does', (typed, cursor) => {
    expect(at(keys(open('one two\nabc'), typed))).toEqual(cursor);
  });

  test('`w` on the last word goes to its last letter, and stays there', () => {
    const last = keys(open('one two'), 'w');
    expect(at(last)).toEqual([0, 4]);
    expect(at(keys(last, 'w'))).toEqual([0, 6]);
    expect(at(keys(last, 'ww'))).toEqual([0, 6]);
  });
});
