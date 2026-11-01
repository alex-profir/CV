// The logs' limits (FR-044, data-model.md Log book), with no words, so the
// runner in the engine and the page both read them: depth 4, 100 items or
// entries per array, object, map or set, 10,000 characters per entry, and
// the latest 1,000 entries kept.
export const LOG_LIMITS = { depth: 4, items: 100, chars: 10_000, entries: 1000 } as const;
