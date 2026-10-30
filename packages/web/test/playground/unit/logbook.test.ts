// The page's log book (data-model.md Log book).
import { describe, expect, test } from 'vitest';
import { LOG_LIMIT, addLogs, announced, clearLogs, emptyLogBook } from '../../../src/apps/playground/logbook.ts';
import type { LogEntry } from '../../../src/apps/playground/types.ts';

const entries = (from: number, count: number): LogEntry[] => Array.from({ length: count }, (_, index) => ({ id: from + index, level: 'log', values: [{ t: 'num', v: String(from + index) }] }));

describe('008-typescript-playground-FR-044: the logs keep the latest 1,000 entries and say how many were dropped', () => {
  test('at most 1,000, oldest first', () => {
    let book = emptyLogBook();
    book = addLogs(book, entries(0, 600));
    book = addLogs(book, entries(600, 600));
    expect(LOG_LIMIT).toBe(1000);
    expect(book.entries).toHaveLength(1000);
    expect(book.entries[0]!.id).toBe(200);
    expect(book.entries.at(-1)!.id).toBe(1199);
  });

  test("dropped sums the runner's and the page's", () => {
    let book = addLogs(emptyLogBook(), entries(0, 900), 4000);
    expect(book.dropped).toBe(4000);
    book = addLogs(book, entries(900, 300), 10);
    expect(book.dropped).toBe(4000 + 10 + 200);
  });

  test('console.clear empties it', () => {
    const book = clearLogs(addLogs(emptyLogBook(), entries(0, 1200), 5));
    expect(book.entries).toEqual([]);
    expect(book.dropped).toBe(0);
  });
});

describe('008-typescript-playground-FR-064: new log entries are announced as a count', () => {
  test('newSinceAnnounce counts for the summary, and resets once announced', () => {
    let book = addLogs(emptyLogBook(), entries(0, 3));
    book = addLogs(book, entries(3, 2), 7);
    expect(book.newSinceAnnounce).toBe(12);
    book = announced(book);
    expect(book.newSinceAnnounce).toBe(0);
    expect(addLogs(book, entries(5, 1)).newSinceAnnounce).toBe(1);
  });
});
