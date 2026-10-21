// A problem's position. `file` is relative to the root with `/` separators.
// Lines and columns count from 1.
export type Location = { file: string; line: number; column: number };

// The problem types, in report order (data-model.md, Problem).
export const PROBLEM_TYPES = [
  'uncovered',
  'unknown-reference',
  'removed-reference',
  'malformed',
  'duplicate-id',
  'bad-status',
  'no-requirements',
  'unreadable-file',
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export type Problem = { type: ProblemType; subject: string; location: Location; detail: string };

export type Report = {
  problems: Problem[];
  approvedSpecs: number;
  activeRequirements: number;
  coveredRequirements: number;
  countsByType: Record<ProblemType, number>;
  result: 'pass' | 'fail';
};

const LABEL_WIDTH = 32;

// Plain code-unit order. Never locale-aware, so every machine gives the same
// order (FR-024).
export function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// By file in code-unit order, then line, column, type order and subject.
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

export function buildReport(input: {
  problems: Problem[];
  approvedSpecs: number;
  activeRequirements: number;
  coveredRequirements: number;
}): Report {
  const countsByType = Object.fromEntries(PROBLEM_TYPES.map((type) => [type, 0])) as Record<ProblemType, number>;
  for (const problem of input.problems) countsByType[problem.type] += 1;
  return {
    problems: sortProblems(input.problems),
    approvedSpecs: input.approvedSpecs,
    activeRequirements: input.activeRequirements,
    coveredRequirements: input.coveredRequirements,
    countsByType,
    result: input.problems.length > 0 ? 'fail' : 'pass',
  };
}

function plural(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resultLine(report: Report): string {
  const specs = plural(report.approvedSpecs, 'approved spec', 'approved specs');
  if (report.problems.length > 0) {
    const found = `FAIL: ${plural(report.problems.length, 'problem', 'problems')} found.`;
    return report.approvedSpecs === 0 ? `${found} No approved specs found.` : found;
  }
  if (report.approvedSpecs === 0) return 'PASS: no approved specs found, so there are no requirements to cover.';
  if (report.activeRequirements === 1) return `PASS: the 1 active requirement in ${specs} is covered.`;
  if (report.activeRequirements > 1) {
    return `PASS: all ${report.activeRequirements} active requirements in ${specs} are covered.`;
  }
  const define = report.approvedSpecs === 1 ? 'defines' : 'define';
  return `PASS: ${specs} ${define} no active requirements, so there are none to cover.`;
}

// The report text defined in contracts/cli.md.
export function renderReport(report: Report): string {
  const row = (label: string, count: number) => `${label.padEnd(LABEL_WIDTH)}${count}`;
  const lines = report.problems.map(
    ({ type, subject, location, detail }) => `${location.file}:${location.line}:${location.column} ${type} ${subject}: ${detail}`,
  );
  if (lines.length > 0) lines.push('');
  lines.push(
    'Summary',
    row('  Approved specs checked:', report.approvedSpecs),
    row('  Active requirements checked:', report.activeRequirements),
    row('  Requirements covered:', report.coveredRequirements),
    row('  Problems:', report.problems.length),
    ...PROBLEM_TYPES.map((type) => row(`    ${type}`, report.countsByType[type])),
    '',
    resultLine(report),
  );
  return `${lines.join('\n')}\n`;
}
