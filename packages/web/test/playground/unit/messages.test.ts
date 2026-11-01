// What the page accepts from the worker (contracts/runner.md): the shapes the
// runtime makes pass, everything else is dropped.
import { describe, expect, test } from 'vitest';
import { formatEntry } from '../../../src/apps/playground/engine/runner/format.ts';
import { isCount, isPlace, isWorkerEntry, workerEntries } from '../../../src/apps/playground/engine/runner/messages.ts';

const entry = (values: unknown, more: object = {}) => ({ id: 1, level: 'log', values, ...more });

describe('008-typescript-playground-FR-040: nothing the worker sends is trusted', () => {
  test('everything the formatter makes passes, at its deepest and widest', () => {
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } };
    const wide = Array.from({ length: 500 }, (_, index) => index);
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    const values = ['text', 1, 2n, true, Symbol('s'), null, undefined, () => 0, class A {}, new Error('e'), new Date(0), deep, wide, new Map([[1, 2]]), new Set([1]), circular];
    for (const value of values) expect(isWorkerEntry(entry(formatEntry([value]).values)), String(typeof value)).toBe(true);
  });

  test('prompt, confirm and closed notes pass; the page\'s own notes and lines do not', () => {
    expect(isWorkerEntry({ id: 1, level: 'note', values: [], note: { key: 'prompt' } })).toBe(true);
    expect(isWorkerEntry({ id: 1, level: 'note', values: [], note: { key: 'closed' } })).toBe(true);
    expect(isWorkerEntry({ id: 1, level: 'note', values: [], note: { key: 'ended', outcome: {} } })).toBe(false);
    expect(isWorkerEntry(entry([], { line: 3 }))).toBe(false);
  });

  test.each([
    ['not an object', null],
    ['no values', { id: 1, level: 'log' }],
    ['values not a list', entry('text')],
    ['an unknown level', { id: 1, level: 'evil', values: [] }],
    ['an array without its items', entry([{ t: 'arr' }])],
    ['an unknown kind', entry([{ t: 'html', v: '<b>' }])],
    ['a string that is not one', entry([{ t: 'str', v: {} }])],
    ['a map entry that is not a pair', entry([{ t: 'map', entries: [[{ t: 'null' }]], more: 0 }])],
    ['an object key that is not text', entry([{ t: 'obj', entries: [[1, { t: 'null' }]], ctor: null, more: 0 }])],
    ['too many items', entry([{ t: 'arr', items: Array(101).fill({ t: 'null' }), more: 0 }])],
    ['a negative count', entry([{ t: 'set', items: [], more: -1 }])],
    ['a note on a logged value', entry([], { note: { key: 'prompt' } })],
  ])('%s is dropped', (_name, value) => {
    expect(isWorkerEntry(value)).toBe(false);
  });

  test("an entry whose deepest value is one of the browser's own objects passes whole", () => {
    for (const value of [new ArrayBuffer(8), new DataView(new ArrayBuffer(8)), new URL('http://x.test/')]) {
      expect(isWorkerEntry(entry(formatEntry([[[[[value]]]], 'tail']).values))).toBe(true);
    }
  });

  test('a tree deeper than the formatter makes is dropped, however deep', () => {
    let deep: unknown = { t: 'null' };
    for (let level = 0; level < 100_000; level += 1) deep = { t: 'arr', items: [deep], more: 0 };
    expect(isWorkerEntry(entry([deep]))).toBe(false);
  });

  test('a batch keeps its good entries; anything else as a batch is none', () => {
    const good = entry([{ t: 'null' }]);
    // A refused entry keeps its place, shortened (FR-034).
    const refused = { id: 0, level: 'log', values: [{ t: 'deep' }] };
    expect(workerEntries([good, { t: 'arr' }, 7])).toEqual([good, refused, refused]);
    expect(workerEntries('nope')).toEqual([]);
  });

  test('counts and places must be whole and not negative', () => {
    expect([isCount(2), isCount(-1), isCount(1.5), isCount('2')]).toEqual([true, false, false, false]);
    expect([isPlace({ line: 1, column: 2 }), isPlace({ line: '1', column: 2 }), isPlace(null)]).toEqual([true, false, false]);
  });
});
