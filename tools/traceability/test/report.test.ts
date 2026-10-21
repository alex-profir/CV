import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { PROBLEM_TYPES, buildReport, renderReport, sortProblems } from '../src/report.ts';
import type { Problem, ProblemType } from '../src/report.ts';
import { makeProject } from './helpers/project.ts';

function problem(type: ProblemType, subject: string, at: string, detail: string): Problem {
  const [file, line, column] = at.split(':');
  return { type, subject, location: { file: file!, line: Number(line), column: Number(column) }, detail };
}

// The problem-line examples from contracts/cli.md.
const EXAMPLES: Problem[] = [
  problem('uncovered', '002-example-FR-003', 'specs/002-example/spec.md:41:5', 'no test references this requirement'),
  problem('uncovered', '002-example-FR-004', 'specs/002-example/spec.md:43:5', 'only skipped, disabled or placeholder tests reference this requirement'),
  problem('unknown-reference', '002-example-FR-009', 'src/clock.test.ts:12:20', 'spec 002-example defines no FR-009'),
  problem('unknown-reference', '099-missing-FR-001', 'src/clock.test.ts:20:9', 'no spec directory is named 099-missing'),
  problem('removed-reference', '002-example-FR-002', 'src/Clock.tsx:8:21', 'this requirement was removed'),
  problem('malformed', '"FR-001"', 'src/clock.test.ts:30:14', 'not a full requirement ID of the form <feature>-FR-###'),
  problem('malformed', '"FR-1"', 'specs/002-example/spec.md:47:5', 'a requirement ID must be FR- followed by exactly three digits'),
  problem('duplicate-id', '002-example-FR-002', 'specs/002-example/spec.md:39:5', 'defined 2 times, on lines 39 and 52'),
  problem('bad-status', '"Aproved"', 'specs/003-other/spec.md:7:13', 'Status must be Draft or Approved'),
  problem('bad-status', '""', 'specs/004-third/spec.md:1:1', 'spec has no Status line'),
  problem('no-requirements', '005-empty', 'specs/005-empty/spec.md:1:1', 'approved spec defines no requirements'),
  problem('unreadable-file', '"src/broken.test.ts"', 'src/broken.test.ts:3:7', "cannot be parsed: ')' expected"),
];

const FAILING_REPORT = [
  'specs/002-example/spec.md:39:5 duplicate-id 002-example-FR-002: defined 2 times, on lines 39 and 52',
  'specs/002-example/spec.md:41:5 uncovered 002-example-FR-003: no test references this requirement',
  'specs/002-example/spec.md:43:5 uncovered 002-example-FR-004: only skipped, disabled or placeholder tests reference this requirement',
  'specs/002-example/spec.md:47:5 malformed "FR-1": a requirement ID must be FR- followed by exactly three digits',
  'specs/003-other/spec.md:7:13 bad-status "Aproved": Status must be Draft or Approved',
  'specs/004-third/spec.md:1:1 bad-status "": spec has no Status line',
  'specs/005-empty/spec.md:1:1 no-requirements 005-empty: approved spec defines no requirements',
  'src/Clock.tsx:8:21 removed-reference 002-example-FR-002: this requirement was removed',
  'src/broken.test.ts:3:7 unreadable-file "src/broken.test.ts": cannot be parsed: \')\' expected',
  'src/clock.test.ts:12:20 unknown-reference 002-example-FR-009: spec 002-example defines no FR-009',
  'src/clock.test.ts:20:9 unknown-reference 099-missing-FR-001: no spec directory is named 099-missing',
  'src/clock.test.ts:30:14 malformed "FR-001": not a full requirement ID of the form <feature>-FR-###',
  '',
  'Summary',
  '  Approved specs checked:       2',
  '  Active requirements checked:  31',
  '  Requirements covered:         29',
  '  Problems:                     12',
  '    uncovered                   2',
  '    unknown-reference           2',
  '    removed-reference           1',
  '    malformed                   2',
  '    duplicate-id                1',
  '    bad-status                  2',
  '    no-requirements             1',
  '    unreadable-file             1',
  '',
  'FAIL: 12 problems found.',
  '',
].join('\n');

const PASSING_REPORT = [
  'Summary',
  '  Approved specs checked:       1',
  '  Active requirements checked:  29',
  '  Requirements covered:         29',
  '  Problems:                     0',
  '    uncovered                   0',
  '    unknown-reference           0',
  '    removed-reference           0',
  '    malformed                   0',
  '    duplicate-id                0',
  '    bad-status                  0',
  '    no-requirements             0',
  '    unreadable-file             0',
  '',
  'PASS: all 29 active requirements in 1 approved spec are covered.',
  '',
].join('\n');

function resultLine(input: { problems?: Problem[]; approvedSpecs: number; activeRequirements: number }): string {
  const text = renderReport(
    buildReport({
      problems: input.problems ?? [],
      approvedSpecs: input.approvedSpecs,
      activeRequirements: input.activeRequirements,
      coveredRequirements: input.problems?.length ? 0 : input.activeRequirements,
    }),
  );
  return text.trimEnd().split('\n').at(-1)!;
}

function spec(status: string, entries: string[]): string {
  return ['# Feature Specification', '', `**Status**: ${status}`, '', '### Functional Requirements', '', ...entries, ''].join('\n');
}

describe('001-requirement-traceability-FR-022: each problem states its type, subject and location', () => {
  test('renders every example problem line from the contract', () => {
    const rendered = renderReport(buildReport({ problems: EXAMPLES, approvedSpecs: 2, activeRequirements: 31, coveredRequirements: 29 }));
    expect(rendered).toBe(FAILING_REPORT);
  });

  test('an uncovered requirement points at its definition', () => {
    const root = makeProject({
      'specs/002-example/spec.md': spec('Approved', ['- **FR-001**: One.', '', '- **FR-002**: Two.']),
      'src/example.test.ts': "test('002-example-FR-001', () => {});\n",
    });
    expect(runCheck(root).problems).toEqual([
      problem('uncovered', '002-example-FR-002', 'specs/002-example/spec.md:9:5', 'no test references this requirement'),
    ]);
  });
});

describe('001-requirement-traceability-FR-023: every run ends with a summary', () => {
  test('a passing run lists every type, zeros included, and says all requirements are covered', () => {
    expect(renderReport(buildReport({ problems: [], approvedSpecs: 1, activeRequirements: 29, coveredRequirements: 29 }))).toBe(
      PASSING_REPORT,
    );
  });

  test('counts every type in the data model order', () => {
    const report = buildReport({ problems: EXAMPLES, approvedSpecs: 2, activeRequirements: 31, coveredRequirements: 29 });
    expect(Object.keys(report.countsByType)).toEqual([...PROBLEM_TYPES]);
    expect(report.result).toBe('fail');
    const empty = buildReport({ problems: [], approvedSpecs: 0, activeRequirements: 0, coveredRequirements: 0 });
    expect(Object.values(empty.countsByType)).toEqual(PROBLEM_TYPES.map(() => 0));
    expect(empty.result).toBe('pass');
  });

  test('failing result lines, singular and plural', () => {
    expect(resultLine({ problems: EXAMPLES, approvedSpecs: 2, activeRequirements: 31 })).toBe('FAIL: 12 problems found.');
    expect(resultLine({ problems: EXAMPLES.slice(0, 1), approvedSpecs: 1, activeRequirements: 3 })).toBe('FAIL: 1 problem found.');
    expect(resultLine({ problems: EXAMPLES.slice(2, 3), approvedSpecs: 0, activeRequirements: 0 })).toBe(
      'FAIL: 1 problem found. No approved specs found.',
    );
    expect(resultLine({ problems: EXAMPLES.slice(2, 4), approvedSpecs: 0, activeRequirements: 0 })).toBe(
      'FAIL: 2 problems found. No approved specs found.',
    );
  });

  test('passing result lines for every count, singular and plural', () => {
    expect(resultLine({ approvedSpecs: 1, activeRequirements: 29 })).toBe('PASS: all 29 active requirements in 1 approved spec are covered.');
    expect(resultLine({ approvedSpecs: 2, activeRequirements: 3 })).toBe('PASS: all 3 active requirements in 2 approved specs are covered.');
    expect(resultLine({ approvedSpecs: 2, activeRequirements: 1 })).toBe('PASS: the 1 active requirement in 2 approved specs is covered.');
    expect(resultLine({ approvedSpecs: 1, activeRequirements: 1 })).toBe('PASS: the 1 active requirement in 1 approved spec is covered.');
    expect(resultLine({ approvedSpecs: 1, activeRequirements: 0 })).toBe(
      'PASS: 1 approved spec defines no active requirements, so there are none to cover.',
    );
    expect(resultLine({ approvedSpecs: 3, activeRequirements: 0 })).toBe(
      'PASS: 3 approved specs define no active requirements, so there are none to cover.',
    );
    expect(resultLine({ approvedSpecs: 0, activeRequirements: 0 })).toBe(
      'PASS: no approved specs found, so there are no requirements to cover.',
    );
  });

  test('a project with no specs folder, or only Draft specs, says no approved specs were found', () => {
    const projects: Record<string, string>[] = [
      { 'src/example.test.ts': "test('plain', () => {});\n" },
      { 'specs/003-draft/spec.md': spec('Draft', ['- **FR-001**: One.']) },
    ];
    for (const files of projects) {
      const text = renderReport(runCheck(makeProject(files)));
      expect(text).toContain('\n  Approved specs checked:       0\n');
      expect(text.startsWith('Summary\n')).toBe(true);
      expect(text.endsWith('\n\nPASS: no approved specs found, so there are no requirements to cover.\n')).toBe(true);
    }
  });

  test('a failing run with no approved specs says both', () => {
    const root = makeProject({ 'src/broken.test.ts': "test('broken', () => {\n" });
    const text = renderReport(runCheck(root));
    expect(text.endsWith('\nFAIL: 1 problem found. No approved specs found.\n')).toBe(true);
  });

  test('one empty line separates problems from the summary, and the report ends with one newline', () => {
    const failing = renderReport(buildReport({ problems: EXAMPLES.slice(0, 1), approvedSpecs: 1, activeRequirements: 1, coveredRequirements: 0 }));
    expect(failing.split('\n').slice(0, 3)).toEqual([
      'specs/002-example/spec.md:41:5 uncovered 002-example-FR-003: no test references this requirement',
      '',
      'Summary',
    ]);
    expect(failing.endsWith('found.\n')).toBe(true);
    expect(failing.endsWith('\n\n')).toBe(false);
    expect(PASSING_REPORT.endsWith('covered.\n')).toBe(true);
  });
});

describe('001-requirement-traceability-FR-024: the same files always give the same report', () => {
  test('the order of problems does not depend on the order they were found', () => {
    const shuffled = [...EXAMPLES.slice(6), ...EXAMPLES.slice(0, 6).reverse()];
    const render = (problems: Problem[]) =>
      renderReport(buildReport({ problems, approvedSpecs: 2, activeRequirements: 31, coveredRequirements: 29 }));
    expect(render(shuffled)).toBe(render(EXAMPLES));
  });

  test('sorts by file in code-unit order, then line, column, type and subject', () => {
    const sorted = sortProblems([
      problem('malformed', '"b"', 'src/a.ts:2:1', 'x'),
      problem('malformed', '"a"', 'src/a.ts:2:1', 'x'),
      problem('unknown-reference', 'z', 'src/a.ts:2:1', 'x'),
      problem('malformed', '"a"', 'src/a.ts:1:9', 'x'),
      problem('malformed', '"a"', 'src/a.ts:10:1', 'x'),
      problem('malformed', '"a"', 'src/a.ts:2:10', 'x'),
      problem('malformed', '"a"', 'src/B.ts:5:5', 'x'),
      problem('malformed', '"a"', 'src/a/b.ts:1:1', 'x'),
    ]);
    expect(sorted.map((p) => `${p.location.file}:${p.location.line}:${p.location.column} ${p.type} ${p.subject}`)).toEqual([
      'src/B.ts:5:5 malformed "a"',
      'src/a.ts:1:9 malformed "a"',
      'src/a.ts:2:1 unknown-reference z',
      'src/a.ts:2:1 malformed "a"',
      'src/a.ts:2:1 malformed "b"',
      'src/a.ts:2:10 malformed "a"',
      'src/a.ts:10:1 malformed "a"',
      'src/a/b.ts:1:1 malformed "a"',
    ]);
  });

  test('two runs over the same project are byte-identical, with forward-slash paths', () => {
    const root = makeProject({
      'specs/002-example/spec.md': spec('Approved', ['- **FR-001**: One.', '- **FR-1**: Two.']),
      'specs/003-typo/spec.md': spec('Aproved', []),
      'src/deep/nested/broken.test.ts': "test('broken', () => {\n",
    });
    const first = renderReport(runCheck(root));
    expect(renderReport(runCheck(root))).toBe(first);
    expect(first).toMatch(/\nsrc\/deep\/nested\/broken\.test\.ts:\d+:\d+ unreadable-file "src\/deep\/nested\/broken\.test\.ts": /);
  });
});
