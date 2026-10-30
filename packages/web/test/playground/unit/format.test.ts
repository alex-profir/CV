// The runner's formatter (data-model.md Log book, research R18).
import { describe, expect, test } from 'vitest';
import { LIMITS, formatEntry, measure } from '../../../src/apps/playground/engine/runner/format.ts';

const one = (value: unknown) => formatEntry([value]).values[0];

describe('008-typescript-playground-FR-034: logged values are shown by their kind', () => {
  test('strings, numbers, bigints, booleans, symbols, null and undefined', () => {
    expect(formatEntry(['a', 1, -0, 2n, true, Symbol('s'), null, undefined]).values).toEqual([
      { t: 'str', v: 'a' },
      { t: 'num', v: '1' },
      { t: 'num', v: '-0' },
      { t: 'bigint', v: '2n' },
      { t: 'bool', v: 'true' },
      { t: 'sym', v: 'Symbol(s)' },
      { t: 'null' },
      { t: 'undef' },
    ]);
  });

  test('arrays, objects with their class, nested values, maps and sets', () => {
    class Point {
      x = 1;
    }
    expect(one([1, [2]])).toEqual({ t: 'arr', items: [{ t: 'num', v: '1' }, { t: 'arr', items: [{ t: 'num', v: '2' }], more: 0 }], more: 0 });
    expect(one({ a: 'b' })).toEqual({ t: 'obj', ctor: null, entries: [['a', { t: 'str', v: 'b' }]], more: 0 });
    expect(one(new Point())).toEqual({ t: 'obj', ctor: 'Point', entries: [['x', { t: 'num', v: '1' }]], more: 0 });
    expect(one(new Map([['k', 1]]))).toEqual({ t: 'map', entries: [[{ t: 'str', v: 'k' }, { t: 'num', v: '1' }]], more: 0 });
    expect(one(new Set([true]))).toEqual({ t: 'set', items: [{ t: 'bool', v: 'true' }], more: 0 });
  });

  test('dates, errors, functions and classes by name', () => {
    expect(one(new Date(Date.UTC(2020, 0, 2)))).toEqual({ t: 'date', v: '2020-01-02T00:00:00.000Z' });
    expect(one(new Date(Number.NaN))).toEqual({ t: 'date', v: 'Invalid Date' });
    expect(one(new TypeError('no'))).toEqual({ t: 'err', name: 'TypeError', message: 'no' });
    function named() {}
    class Shape {}
    expect(one(named)).toEqual({ t: 'fn', name: 'named', cls: false });
    expect(one(Shape)).toEqual({ t: 'fn', name: 'Shape', cls: true });
  });

  test('circular parts are marked', () => {
    const loop: { self?: unknown } = {};
    loop.self = loop;
    expect(one(loop)).toEqual({ t: 'obj', ctor: null, entries: [['self', { t: 'circ' }]], more: 0 });
  });

  test('a getter that throws shows its error rather than ending the log', () => {
    const value = Object.defineProperty({}, 'bad', {
      enumerable: true,
      get() {
        throw new RangeError('read');
      },
    });
    expect(one(value)).toEqual({ t: 'obj', ctor: null, entries: [['bad', { t: 'err', name: 'RangeError', message: 'read' }]], more: 0 });
  });
});

describe('008-typescript-playground-FR-044: long and deep values are cut', () => {
  test('depth 4, then the value below is marked', () => {
    expect(one([[[[[1]]]]])).toEqual({ t: 'arr', items: [{ t: 'arr', items: [{ t: 'arr', items: [{ t: 'arr', items: [{ t: 'deep' }], more: 0 }], more: 0 }], more: 0 }], more: 0 });
  });

  test('100 items or entries per array, object, map or set, then more', () => {
    const many = Array.from({ length: 150 }, (_, index) => index);
    const array = one(many);
    expect(array).toMatchObject({ t: 'arr', more: 50 });
    expect((array as { items: unknown[] }).items).toHaveLength(LIMITS.items);
    expect(one(Object.fromEntries(many.map((index) => [`k${index}`, index])))).toMatchObject({ t: 'obj', more: 50 });
    expect(one(new Map(many.map((index) => [index, index])))).toMatchObject({ t: 'map', more: 50 });
    expect(one(new Set(many))).toMatchObject({ t: 'set', more: 50 });
  });

  test('10,000 characters per entry, counted over the formatted text', () => {
    const long = formatEntry(['x'.repeat(3_000_000)]);
    expect(long.cut).toBe(true);
    expect(long.values).toEqual([{ t: 'str', v: 'x'.repeat(LIMITS.chars) }]);
    const spread = formatEntry(Array.from({ length: 30 }, () => 'y'.repeat(500)));
    expect(spread.cut).toBe(true);
    expect(measure(spread.values)).toBeLessThanOrEqual(LIMITS.chars);
    const nested = formatEntry([Array.from({ length: 90 }, () => ({ text: 'z'.repeat(200) }))]);
    expect(nested.cut).toBe(true);
    expect(measure(nested.values)).toBeLessThanOrEqual(LIMITS.chars);
    expect(formatEntry(['short', 1]).cut).toBe(false);
  });
});
