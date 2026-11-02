// A program's output for screen readers (009 FR-040).
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { batched } from '../../../../src/apps/terminal/engine/announce.ts';

beforeEach(() => void vi.useFakeTimers());
afterEach(() => void vi.useRealTimers());

describe('009-terminal-node-FR-040: output is announced in batches, at most once a second', () => {
  test('fast output joins one batch, and the next waits its second', () => {
    const heard: string[] = [];
    const speech = batched((text) => heard.push(text));
    for (let at = 0; at < 50; at += 1) {
      speech.add(`${at}\n`);
      vi.advanceTimersByTime(10);
    }
    expect(heard).toEqual([]);
    vi.advanceTimersByTime(500);
    expect(heard).toEqual([Array.from({ length: 50 }, (_, at) => `${at}\n`).join('')]);
    speech.add('next\n');
    vi.advanceTimersByTime(999);
    expect(heard).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(heard[1]).toBe('next\n');
  });

  test('a batch is cut to what can be listened to: the newest text', () => {
    const heard: string[] = [];
    const speech = batched((text) => heard.push(text));
    speech.add('a'.repeat(5000));
    speech.add('end');
    vi.advanceTimersByTime(1000);
    expect(heard[0]!.length).toBe(1000);
    expect(heard[0]!.endsWith('end')).toBe(true);
  });

  test('`stop` says what is left, and nothing follows it', () => {
    const heard: string[] = [];
    const speech = batched((text) => heard.push(text));
    speech.add('left');
    speech.stop();
    expect(heard).toEqual(['left']);
    vi.advanceTimersByTime(2000);
    expect(heard).toEqual(['left']);
  });

  test('with no output nothing is said', () => {
    const heard: string[] = [];
    const speech = batched((text) => heard.push(text));
    speech.stop();
    expect(heard).toEqual([]);
  });
});
