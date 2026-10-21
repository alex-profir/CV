import type { Location } from './report.ts';

// An ID-like piece of text found in a test file or UI source.
export type Token = { text: string; location: Location };

const FULL_ID = /^([a-z0-9]+(?:-[a-z0-9]+)*)-(FR-\d{3})$/;

// A run of letters, digits, `-` and `_`. Anything else ends a token.
const RUN = /[\p{L}\p{N}_-]+/gu;

export function fullId(feature: string, id: string): string {
  return `${feature}-${id}`;
}

export function parseFullId(text: string): { feature: string; id: string } | null {
  const match = FULL_ID.exec(text);
  return match ? { feature: match[1]!, id: match[2]! } : null;
}

// Every run around a case-insensitive `fr-`, in order of position. A run that
// contains `fr-` more than once is still one token.
export function findTokens(text: string): { text: string; index: number }[] {
  const tokens = [];
  for (const match of text.matchAll(RUN)) {
    if (/fr-/i.test(match[0])) tokens.push({ text: match[0], index: match.index });
  }
  return tokens;
}
