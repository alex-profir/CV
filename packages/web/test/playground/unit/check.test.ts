// When the code is checked (research R7), with fake timers.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CHECKING_AFTER_MS, CHECK_PAUSE_MS, createChecker } from '../../../src/apps/playground/checker.ts';

function setUp() {
  const asked: number[] = [];
  const checking: boolean[] = [];
  let version = 0;
  const checker = createChecker({ check: () => asked.push(version), setChecking: (on) => checking.push(on) });
  const change = () => {
    version += 1;
    checker.changed(version);
  };
  return { checker, asked, checking, change, version: () => version };
}

describe('008-typescript-playground-FR-016: errors are checked once typing pauses, and the newest result wins', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('a check is asked 250 ms after the last change, not before', () => {
    const { asked, change } = setUp();
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS - 50);
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS - 1);
    expect(asked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(asked).toEqual([2]);
  });

  test('a change while a check is out queues exactly one more, asked when the result arrives', () => {
    const { checker, asked, change } = setUp();
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS);
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS);
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS);
    expect(asked).toEqual([1]);
    checker.result(1);
    expect(asked).toEqual([1, 3]);
    checker.result(3);
    expect(asked).toEqual([1, 3]);
  });

  test('a result for an older version is dropped; the current one is kept', () => {
    const { checker, change } = setUp();
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS);
    change();
    expect(checker.result(1)).toBe(false);
    vi.advanceTimersByTime(CHECK_PAUSE_MS);
    expect(checker.result(2)).toBe(true);
  });

  test('checking shows 300 ms after the change stopped with no current result, and goes with the result', () => {
    const { checker, checking, change } = setUp();
    change();
    vi.advanceTimersByTime(CHECKING_AFTER_MS - 1);
    expect(checking).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(checking).toEqual([true]);
    checker.result(1);
    expect(checking).toEqual([true, false]);
  });

  test('a result before 300 ms means checking never shows', () => {
    const { checker, checking, change } = setUp();
    change();
    vi.advanceTimersByTime(CHECK_PAUSE_MS);
    checker.result(1);
    vi.advanceTimersByTime(CHECKING_AFTER_MS);
    expect(checking).toEqual([false]);
  });
});
