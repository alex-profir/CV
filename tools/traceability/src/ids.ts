import type { Location, Problem } from './report.ts';

// An ID-like piece of text found in a test file or UI source.
export type Token = { text: string; location: Location };

// Every spec of any Status, by feature, with the state of each well-formed ID.
// A spec whose spec.md can't be read has no IDs to check against.
export type SpecTargets = Map<string, { readable: boolean; ids: Map<string, 'active' | 'removed'> }>;

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

// The problem with a reference, or null when it's valid (data-model.md,
// Reference). Draft and invalid-Status specs are valid targets.
export function referenceProblem(text: string, location: Location, targets: SpecTargets): Problem | null {
  const parsed = parseFullId(text);
  if (parsed === null) {
    return { type: 'malformed', subject: `"${text}"`, location, detail: 'not a full requirement ID of the form <feature>-FR-###' };
  }
  const spec = targets.get(parsed.feature);
  if (spec === undefined) {
    return { type: 'unknown-reference', subject: text, location, detail: `no spec directory is named ${parsed.feature}` };
  }
  // The unreadable-file problem already fails the check.
  if (!spec.readable) return null;
  const state = spec.ids.get(parsed.id);
  if (state === undefined) {
    return { type: 'unknown-reference', subject: text, location, detail: `spec ${parsed.feature} defines no ${parsed.id}` };
  }
  if (state === 'removed') return { type: 'removed-reference', subject: text, location, detail: 'this requirement was removed' };
  return null;
}

// One piece per whitespace-separated value. An empty or blank value is one
// empty piece, so it's reported as malformed.
export function splitDataReq(value: string): { text: string; index: number }[] {
  const pieces = [...value.matchAll(/\S+/g)].map((match) => ({ text: match[0], index: match.index }));
  return pieces.length > 0 ? pieces : [{ text: '', index: 0 }];
}
