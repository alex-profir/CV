// The page's log book (data-model.md Log book, FR-044, FR-064): at most the
// latest 1,000 entries, oldest first, with a count of those dropped.
import { LOG_LIMITS } from './limits.ts';
import type { LogBook, LogEntry } from './types.ts';

export const LOG_LIMIT = LOG_LIMITS.entries;

export const emptyLogBook = (): LogBook => ({ entries: [], dropped: 0, newSinceAnnounce: 0 });

// The book with a batch added: `dropped` sums the runner's count and the
// entries the page drops from the front.
export function addLogs(book: LogBook, entries: readonly LogEntry[], dropped = 0): LogBook {
  const all = [...book.entries, ...entries];
  const over = Math.max(0, all.length - LOG_LIMIT);
  return { entries: over > 0 ? all.slice(over) : all, dropped: book.dropped + dropped + over, newSinceAnnounce: book.newSinceAnnounce + entries.length + dropped };
}

// `console.clear`: the logs empty, and nothing is counted as dropped.
export const clearLogs = (book: LogBook): LogBook => ({ entries: [], dropped: 0, newSinceAnnounce: book.newSinceAnnounce });

// After the once-a-second summary is announced.
export const announced = (book: LogBook): LogBook => ({ ...book, newSinceAnnounce: 0 });
