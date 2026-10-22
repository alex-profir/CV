import { compare } from '../../traceability/src/report.ts';
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

// By file in code-unit order, then line, column, type order and subject
// (FR-031).
export function sortProblems(problems: Problem[]): Problem[] {
  return [...problems].sort(
    (a, b) =>
      compare(a.location.file, b.location.file) ||
      a.location.line - b.location.line ||
      a.location.column - b.location.column ||
      PROBLEM_TYPES.indexOf(a.type) - PROBLEM_TYPES.indexOf(b.type) ||
      compare(a.subject, b.subject),
  );
}

// Labels are padded so every value and count starts at column 33.
const LABEL_WIDTH = 32;

function resultLine(report: Report): string {
  if (report.problems.length === 0) return 'PASS: both documents are valid and no key facts are hardcoded.';
  const count = report.problems.length;
  const found = `FAIL: ${count} ${count === 1 ? 'problem' : 'problems'} found.`;
  return report.checksNotRun.length > 0 ? `${found} Some checks could not run.` : found;
}

function factsLine(factKinds: Report['factKinds']): string {
  if (factKinds === null) return 'none (the CV document could not be read)';
  return factKinds.length === 0 ? 'none' : factKinds.join(', ');
}

// The report text defined in contracts/cli.md.
export function renderReport(report: Report): string {
  const row = (label: string, value: string | number) => `${label.padEnd(LABEL_WIDTH)}${value}`;
  const counts = new Map<ProblemType, number>(PROBLEM_TYPES.map((type) => [type, 0]));
  for (const problem of report.problems) counts.set(problem.type, counts.get(problem.type)! + 1);

  const lines = sortProblems(report.problems).map(
    ({ type, subject, location, detail }) => `${location.file}:${location.line}:${location.column} ${type} ${subject}: ${detail}`,
  );
  if (lines.length > 0) lines.push('');
  lines.push(
    'Summary',
    ...report.documents.map((document) => row(`  ${document.label}:`, `${document.file} (${document.state})`)),
    row('  Key facts searched for:', factsLine(report.factKinds)),
    row('  Files searched for key facts:', report.filesSearched),
    row('  Files skipped (not text):', report.filesSkipped),
    row('  Checks not run:', report.checksNotRun.length === 0 ? 'none' : report.checksNotRun.join(', ')),
    row('  Problems:', report.problems.length),
    ...PROBLEM_TYPES.map((type) => row(`    ${type}`, counts.get(type)!)),
    '',
    resultLine(report),
  );
  return `${lines.join('\n')}\n`;
}
