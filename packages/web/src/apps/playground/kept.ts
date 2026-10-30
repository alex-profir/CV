// Kept code (data-model.md Kept code, research R15): the visitor's code and
// changed options in `localStorage['cv-playground']`, so they come back on
// the next visit (FR-019, FR-026).
import { changedOptions, readOptions, settle } from './compiler-options.ts';
import type { ChangedOptions } from './compiler-options.ts';

export const KEPT_KEY = 'cv-playground';

export const KEEP_DELAY_MS = 300;

export type KeptRead = { kind: 'none' } | { kind: 'code'; code: string; options: ChangedOptions; unknown: string[] } | { kind: 'no-storage' };

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

// The page's store, or null where reading it throws (storage off, a sandbox).
export function pageStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

// What is kept. A `format` other than 1, or JSON that doesn't parse, is
// ignored as if nothing were kept, and the key is left as it is.
export function readKept(storage: StorageLike | null = pageStorage()): KeptRead {
  if (storage === null) return { kind: 'no-storage' };
  let text: string | null;
  try {
    text = storage.getItem(KEPT_KEY);
  } catch {
    return { kind: 'no-storage' };
  }
  if (text === null) return { kind: 'none' };
  try {
    const value = JSON.parse(text) as unknown;
    if (value === null || typeof value !== 'object') return { kind: 'none' };
    const kept = value as { format?: unknown; code?: unknown; options?: unknown };
    if (kept.format !== 1 || typeof kept.code !== 'string') return { kind: 'none' };
    const { options, unknown } = readOptions(kept.options ?? {});
    return { kind: 'code', code: kept.code, options, unknown };
  } catch {
    return { kind: 'none' };
  }
}

// Whether there is anything to keep: never the starting example unchanged
// with the default options, so a visitor who never edits stores nothing.
export function worthKeeping(code: string, options: ChangedOptions, starting: string): boolean {
  return code !== starting || Object.keys(changedOptions(settle(options))).length > 0;
}

export function writeKept(code: string, options: ChangedOptions, storage: StorageLike | null = pageStorage()): 'kept' | 'no-storage' {
  if (storage === null) return 'no-storage';
  try {
    storage.setItem(KEPT_KEY, JSON.stringify({ format: 1, code, options: changedOptions(settle(options)) }));
    return 'kept';
  } catch {
    return 'no-storage';
  }
}

// Reset (FR-080): the code is no longer kept.
export function removeKept(storage: StorageLike | null = pageStorage()): void {
  try {
    storage?.removeItem(KEPT_KEY);
  } catch {
    // Nothing kept to remove.
  }
}

// Writes 300 ms after the last change, and at once when asked (the window's
// close, `pagehide`).
// The default timers call the page's own functions as functions: called as
// methods of another object, browsers throw.
export function createKeeper(write: () => void, timers: { set: (run: () => void, ms: number) => unknown; clear: (timer: unknown) => void } = { set: (run, ms) => setTimeout(run, ms), clear: (timer) => clearTimeout(timer as number) }) {
  let timer: unknown = null;
  return {
    changed() {
      if (timer !== null) timers.clear(timer);
      timer = timers.set(() => {
        timer = null;
        write();
      }, KEEP_DELAY_MS);
    },
    flush() {
      if (timer === null) return;
      timers.clear(timer);
      timer = null;
      write();
    },
    cancel() {
      if (timer !== null) timers.clear(timer);
      timer = null;
    },
  };
}
