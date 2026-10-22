import { compare } from '../../traceability/src/report.ts';
import type { Location } from '../../traceability/src/report.ts';

export type { Location };

// The problem types, in report order (data-model.md, Problem).
export const PROBLEM_TYPES = [
  'unreadable-file',
  'missing-file',
  'unsupported-content',
  'invalid-value',
  'missing-reference',
  'reference-loop',
  'cross-source-reference',
  'missing-set',
  'unused-set',
  'theme-without-sets',
  'theme-without-group',
  'invalid-active-themes',
  'duplicate-token',
  'wrong-source',
  'conflicting-types',
  'unusable-name',
  'name-collision',
  'token-used-as-group',
  'theme-mismatch',
  'stale-output',
  'unknown-token',
  'local-in-token-namespace',
  'literal-value',
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export type Problem = { type: ProblemType; subject: string; location: Location; detail: string };

export type SourceState = 'checked' | 'missing' | 'unreadable';

// The check's parts, in summary order (data-model.md, Check parts).
export const PARTS = [
  'export rules',
  'motion rules',
  'cross-source rules',
  'derived output',
  'token names in site files',
  'literal values search',
] as const;

export type Part = (typeof PARTS)[number];

export type OutputState = 'current' | 'stale' | 'not checked';

export type LiteralKind = 'color' | 'length' | 'font-family' | 'shadow' | 'duration' | 'easing';

export type Report = {
  problems: Problem[];
  sources: {
    label: 'Token export' | 'Motion token source';
    file: string;
    state: SourceState;
    sets: number;
    themes: number;
    tokens: number;
  }[];
  // The active combination, such as `mode/light + motion/standard`, or null
  // when it isn't known.
  activeThemes: string | null;
  output: OutputState;
  filesSearched: number;
  filesWithoutStyles: number;
  checksNotRun: Part[];
  result: 'pass' | 'fail';
};

// By file in code-unit order, then line, column, type order and subject
// (FR-037).
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

const count = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

function sourceLine(source: Report['sources'][number]): string {
  const state = `${source.file} (${source.state})`;
  if (source.state !== 'checked') return state;
  return `${state}: ${count(source.sets, 'set', 'sets')}, ${count(source.themes, 'theme', 'themes')}, ${count(source.tokens, 'token', 'tokens')}`;
}

function resultLine(report: Report): string {
  if (report.problems.length === 0) return 'PASS: both token sources are valid and no literal design values were found.';
  const found = `FAIL: ${count(report.problems.length, 'problem', 'problems')} found.`;
  return report.checksNotRun.length > 0 ? `${found} Some checks could not run.` : found;
}

// The report text defined in contracts/cli.md.
export function renderReport(report: Report): string {
  const row = (label: string, value: string | number) => `${`  ${label}:`.padEnd(LABEL_WIDTH)}${value}`;
  const counts = new Map<ProblemType, number>(PROBLEM_TYPES.map((type) => [type, 0]));
  for (const problem of report.problems) counts.set(problem.type, counts.get(problem.type)! + 1);

  const lines = sortProblems(report.problems).map(
    ({ type, subject, location, detail }) => `${location.file}:${location.line}:${location.column} ${type} ${subject}: ${detail}`,
  );
  if (lines.length > 0) lines.push('');
  lines.push(
    'Summary',
    ...report.sources.map((source) => row(source.label, sourceLine(source))),
    row('Active themes', report.activeThemes ?? 'not known'),
    row('Derived output', report.output),
    row('Site files searched', report.filesSearched),
    row('Site files without styles', report.filesWithoutStyles),
    row('Checks not run', report.checksNotRun.length === 0 ? 'none' : report.checksNotRun.join(', ')),
    row('Problems', report.problems.length),
    ...PROBLEM_TYPES.map((type) => `${`    ${type}`.padEnd(LABEL_WIDTH)}${counts.get(type)!}`),
    '',
    resultLine(report),
  );
  return `${lines.join('\n')}\n`;
}
