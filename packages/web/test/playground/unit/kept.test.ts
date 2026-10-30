// Kept code (data-model.md Kept code, research R15).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { KEEP_DELAY_MS, KEPT_KEY, createKeeper, readKept, removeKept, worthKeeping, writeKept } from '../../../src/apps/playground/kept.ts';

function memoryStorage(start: Record<string, string> = {}) {
  const items = new Map(Object.entries(start));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

const throwing = () => ({
  getItem: () => {
    throw new Error('denied');
  },
  setItem: () => {
    throw new Error('denied');
  },
  removeItem: () => {
    throw new Error('denied');
  },
});

describe('008-typescript-playground-FR-019: the code and its options are kept in this browser', () => {
  test("localStorage['cv-playground'] holds { format: 1, code, options }, with only the changed options", () => {
    const storage = memoryStorage();
    expect(writeKept('let a = 1;', { noUnusedLocals: true, target: 'ES2022' }, storage)).toBe('kept');
    expect(JSON.parse(storage.items.get(KEPT_KEY)!)).toEqual({ format: 1, code: 'let a = 1;', options: { noUnusedLocals: true } });
    expect(readKept(storage)).toEqual({ kind: 'code', code: 'let a = 1;', options: { noUnusedLocals: true }, unknown: [] });
  });

  test('nothing kept reads as none', () => {
    expect(readKept(memoryStorage())).toEqual({ kind: 'none' });
  });

  test('Never written while the Playground holds the starting example unchanged with the default options', () => {
    expect(worthKeeping('start', {}, 'start')).toBe(false);
    expect(worthKeeping('start', { target: 'ES2022' }, 'start')).toBe(false);
    expect(worthKeeping('start', { strict: false }, 'start')).toBe(true);
    expect(worthKeeping('edited', {}, 'start')).toBe(true);
  });

  test.each([
    ['a format other than 1', JSON.stringify({ format: 2, code: 'x', options: {} })],
    ['no code', JSON.stringify({ format: 1, options: {} })],
    ["JSON that doesn't parse", '{format: 1'],
    ['a value that is not an object', '"text"'],
  ])('%s is ignored as if nothing were kept, and the key is left as it is until the next write', (_, text) => {
    const storage = memoryStorage({ [KEPT_KEY]: text });
    expect(readKept(storage)).toEqual({ kind: 'none' });
    expect(storage.items.get(KEPT_KEY)).toBe(text);
    writeKept('y', {}, storage);
    expect(JSON.parse(storage.items.get(KEPT_KEY)!).code).toBe('y');
  });

  test('reading, writing or a missing store throwing gives no-storage', () => {
    expect(readKept(throwing())).toEqual({ kind: 'no-storage' });
    expect(writeKept('x', {}, throwing())).toBe('no-storage');
    expect(readKept(null)).toEqual({ kind: 'no-storage' });
    expect(writeKept('x', {}, null)).toBe('no-storage');
  });

  test('Reset removes the key, and removing from a throwing store is quiet', () => {
    const storage = memoryStorage({ [KEPT_KEY]: JSON.stringify({ format: 1, code: 'x', options: {} }) });
    removeKept(storage);
    expect(storage.items.has(KEPT_KEY)).toBe(false);
    expect(() => removeKept(throwing())).not.toThrow();
  });

  describe('when it is written', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    test('300 ms after the last change, once', () => {
      const write = vi.fn();
      const keeper = createKeeper(write);
      keeper.changed();
      vi.advanceTimersByTime(KEEP_DELAY_MS - 1);
      keeper.changed();
      vi.advanceTimersByTime(KEEP_DELAY_MS - 1);
      expect(write).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(write).toHaveBeenCalledTimes(1);
    });

    test('at once on pagehide or the window closing (flush), and only when a change is waiting', () => {
      const write = vi.fn();
      const keeper = createKeeper(write);
      keeper.flush();
      expect(write).not.toHaveBeenCalled();
      keeper.changed();
      keeper.flush();
      expect(write).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(KEEP_DELAY_MS);
      expect(write).toHaveBeenCalledTimes(1);
    });
  });
});

describe('008-typescript-playground-FR-026: a kept option this version does not know is left out and named', () => {
  test('unknown names and values of the wrong kind are dropped and listed', () => {
    const storage = memoryStorage({ [KEPT_KEY]: JSON.stringify({ format: 1, code: 'x', options: { strict: false, madeUp: true } }) });
    const read = readKept(storage);
    expect(read).toMatchObject({ kind: 'code', options: { strict: false } });
    expect(read.kind === 'code' && read.unknown).toContain('madeUp');
  });
});
