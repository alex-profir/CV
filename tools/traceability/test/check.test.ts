import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { makeProject, runCli } from './helpers/project.ts';

// Entries start on line 7.
function spec(status: string, entries: string[]): string {
  return ['# Feature Specification', '', `**Status**: ${status}`, '', '### Functional Requirements', '', ...entries, ''].join('\n');
}

const THREE = spec('Approved', ['- **FR-001**: One.', '- **FR-002**: Two.', '- **FR-003**: Three.']);

function lines(root: string) {
  return runCheck(root).problems.map(
    (problem) => `${problem.location.file}:${problem.location.line}:${problem.location.column} ${problem.type} ${problem.subject}: ${problem.detail}`,
  );
}

describe('001-requirement-traceability-FR-015: every uncovered active requirement is reported', () => {
  test('names exactly the requirement no test references, at its definition', () => {
    const root = makeProject({
      'specs/002-example/spec.md': THREE,
      'src/example.test.ts': [
        "test('covers 002-example-FR-001', () => {});",
        "describe('002-example-FR-002', () => {",
        "  test('works', () => {});",
        '});',
        '',
      ].join('\n'),
    });
    expect(lines(root)).toEqual([
      'specs/002-example/spec.md:9:5 uncovered 002-example-FR-003: no test references this requirement',
    ]);
  });
});

describe('001-requirement-traceability-FR-020: the check fails exactly when it reports a problem', () => {
  test('fails with exit code 1 when a requirement is uncovered', () => {
    const root = makeProject({
      'specs/002-example/spec.md': THREE,
      'src/example.test.ts': "test('002-example-FR-001 002-example-FR-002', () => {});\n",
    });
    expect(runCheck(root).result).toBe('fail');
    expect(runCli(root).status).toBe(1);
  });

  test('passes with exit code 0 when every requirement is covered', () => {
    const root = makeProject({
      'specs/002-example/spec.md': THREE,
      'src/example.test.ts': "test('002-example-FR-001 002-example-FR-002 002-example-FR-003', () => {});\n",
    });
    const report = runCheck(root);
    expect(report.result).toBe('pass');
    expect(report.problems).toEqual([]);
    expect(runCli(root).status).toBe(0);
  });
});

describe('001-requirement-traceability-FR-021: every problem is reported in a single run', () => {
  test('reports problems of every kind together', () => {
    const root = makeProject({
      'specs/002-example/spec.md': spec('Approved', ['- **FR-001**: One.', '- **FR-1**: Malformed.', '- **FR-001**: Again.']),
      'specs/003-typo/spec.md': spec('Aproved', ['- **FR-001**: One.']),
      'specs/004-empty/spec.md': spec('Approved', []),
      'src/broken.test.ts': "test('broken', () => {\n",
    });
    expect(runCheck(root).problems.map((problem) => problem.type)).toEqual([
      'uncovered',
      'duplicate-id',
      'malformed',
      'bad-status',
      'no-requirements',
      'unreadable-file',
    ]);
  });
});

describe('001-requirement-traceability-FR-029: files the check cannot read are reported', () => {
  test('a test file with a syntax error is reported and its references are not used', () => {
    const root = makeProject({
      'specs/002-example/spec.md': THREE,
      'src/example.test.ts': "test('002-example-FR-001 002-example-FR-003', () => {});\n",
      'src/broken.test.ts': "test('002-example-FR-002', () => {\n  foo(;\n});\n",
    });
    const problems = runCheck(root).problems;
    expect(problems.map((problem) => [problem.type, problem.subject])).toEqual([
      ['uncovered', '002-example-FR-002'],
      ['unreadable-file', '"src/broken.test.ts"'],
    ]);
    const unreadable = problems[1]!;
    expect(unreadable.location).toEqual({ file: 'src/broken.test.ts', line: 2, column: 7 });
    expect(unreadable.detail).toMatch(/^cannot be parsed: ./);
  });

  test('a spec.md that cannot be read is reported', () => {
    const root = makeProject({
      'specs/002-example/spec.md': THREE,
      'specs/003-x/spec.md/': '',
      'src/example.test.ts': "test('002-example-FR-001 002-example-FR-002 002-example-FR-003', () => {});\n",
    });
    const report = runCheck(root);
    expect(lines(root)).toEqual(['specs/003-x/spec.md:1:1 unreadable-file "specs/003-x/spec.md": cannot be read: EISDIR']);
    expect(report.approvedSpecs).toBe(1);
  });
});
