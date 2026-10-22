import type { Location } from '../../traceability/src/report.ts';

export type { Location };

// The problem types, in report order (data-model.md, Problem).
export const PROBLEM_TYPES = [
  'unreadable-document',
  'missing-document',
  'schema-violation',
  'undefined-field',
  'invalid-date',
  'end-before-start',
  'invalid-format',
  'duplicate-entry',
  'out-of-order',
  'untrimmed-text',
  'placeholder',
  'dangling-reference',
  'ambiguous-reference',
  'hardcoded-fact',
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export type Problem = { type: ProblemType; subject: string; location: Location; detail: string };

export type DocumentState = 'checked' | 'missing' | 'unreadable';

// The check's parts, in summary order (data-model.md, Check).
export const PARTS = ['CV rules', 'site data rules', 'references', 'key facts search'] as const;

export type Part = (typeof PARTS)[number];

export type FactKind = 'name' | 'email' | 'phone';

export type Report = {
  problems: Problem[];
  documents: { label: 'CV document' | 'Site data document' | 'Site data rules'; file: string; state: DocumentState }[];
  // null when the CV document couldn't be read, so no facts were known.
  factKinds: FactKind[] | null;
  filesSearched: number;
  filesSkipped: number;
  checksNotRun: Part[];
  result: 'pass' | 'fail';
};
