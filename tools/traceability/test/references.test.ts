import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { fullId, parseFullId } from '../src/ids.ts';
import { makeProject } from './helpers/project.ts';

function approvedSpec(entries: string[]): string {
  return ['# Feature Specification', '', '**Status**: Approved', '', '### Functional Requirements', '', ...entries, ''].join('\n');
}

describe('001-requirement-traceability-FR-009: a full ID is the spec directory name plus the requirement ID', () => {
  test('builds and splits full IDs', () => {
    expect(fullId('002-example', 'FR-003')).toBe('002-example-FR-003');
    expect(fullId('001-requirement-traceability', 'FR-001')).toBe('001-requirement-traceability-FR-001');
    expect(parseFullId('002-example-FR-003')).toEqual({ feature: '002-example', id: 'FR-003' });
    expect(parseFullId('001-requirement-traceability-FR-029')).toEqual({
      feature: '001-requirement-traceability',
      id: 'FR-029',
    });
  });

  test('rejects anything that is not exactly a full ID', () => {
    for (const text of [
      'FR-003',
      '002-example-fr-003',
      '002-Example-FR-003',
      '002-example-FR-03',
      '002-example-FR-0003',
      '002-example-FR-003x',
      '-FR-003',
      '002--example-FR-003',
      '002-example-FR-003 ',
      '',
    ]) {
      expect(parseFullId(text)).toBeNull();
    }
  });

  test('the same FR number in two approved specs gives two distinct IDs', () => {
    const root = makeProject({
      'specs/002-example/spec.md': approvedSpec(['- **FR-001**: One.']),
      'specs/003-other/spec.md': approvedSpec(['- **FR-001**: One.']),
      'src/example.test.ts': "test('covers 002-example-FR-001', () => {});\n",
    });
    const report = runCheck(root);
    expect(report.activeRequirements).toBe(2);
    expect(report.coveredRequirements).toBe(1);
    expect(report.problems.map((problem) => [problem.type, problem.subject])).toEqual([
      ['uncovered', '003-other-FR-001'],
    ]);
  });
});

// One problem line per problem, as the report prints it.
function report(files: Record<string, string>): string[] {
  return runCheck(makeProject(files)).problems.map(
    (problem) =>
      `${problem.location.file}:${problem.location.line}:${problem.location.column} ${problem.type} ${problem.subject}: ${problem.detail}`,
  );
}

// The 1-based column where `text` starts on a one-line file.
function col(line: string, text: string): number {
  return line.indexOf(text) + 1;
}

const EXAMPLE = approvedSpec([
  '- **FR-001**: One.',
  '- ~~**FR-002**~~: Removed 2026-10-21 - replaced.',
  '- **FR-003**: Three.',
  '- ~~**FR-003**~~: Removed 2026-10-21 - reused by mistake.',
]);
const COVERAGE = "test('002-example-FR-001 002-example-FR-003', () => {});\n";

describe('001-requirement-traceability-FR-016: references to IDs that do not exist are reported', () => {
  test('from a test title, a group title and a data-req value', () => {
    const inTest = "test('covers 002-example-FR-009', () => {});";
    const inGroup = "describe('099-missing-FR-001', () => { test('x', () => {}); });";
    const inUi = 'export const A = () => <div data-req="002-example-FR-009 099-missing-FR-001" />;';
    expect(
      report({
        'specs/002-example/spec.md': EXAMPLE,
        'src/covered.test.ts': COVERAGE,
        'src/a.test.ts': inTest,
        'src/b.test.ts': inGroup,
        'src/A.tsx': inUi,
      }),
    ).toEqual([
      'specs/002-example/spec.md:9:5 duplicate-id 002-example-FR-003: defined 2 times, on lines 9 and 10',
      `src/A.tsx:1:${col(inUi, '002-example-FR-009')} unknown-reference 002-example-FR-009: spec 002-example defines no FR-009`,
      `src/A.tsx:1:${col(inUi, '099-missing')} unknown-reference 099-missing-FR-001: no spec directory is named 099-missing`,
      `src/a.test.ts:1:${col(inTest, '002-example')} unknown-reference 002-example-FR-009: spec 002-example defines no FR-009`,
      `src/b.test.ts:1:${col(inGroup, '099-missing')} unknown-reference 099-missing-FR-001: no spec directory is named 099-missing`,
    ]);
  });

  test('a reference into a spec that cannot be read is not classified', () => {
    expect(
      report({
        'specs/003-broken/spec.md/': '',
        'src/a.test.ts': "test('003-broken-FR-001', () => {});",
      }),
    ).toEqual(['specs/003-broken/spec.md:1:1 unreadable-file "specs/003-broken/spec.md": cannot be read: EISDIR']);
  });
});

describe('001-requirement-traceability-FR-017: references to removed requirements are reported', () => {
  test('from a test title, a group title and a data-req value', () => {
    const inTest = "test('002-example-FR-002', () => {});";
    const inGroup = "describe('group 002-example-FR-002', () => {});";
    const inUi = "export const props = { 'data-req': '002-example-FR-002' };";
    expect(
      report({
        'specs/002-example/spec.md': EXAMPLE,
        'src/covered.test.ts': COVERAGE,
        'src/a.test.ts': inTest,
        'src/b.test.ts': inGroup,
        'src/props.ts': inUi,
      }),
    ).toEqual([
      'specs/002-example/spec.md:9:5 duplicate-id 002-example-FR-003: defined 2 times, on lines 9 and 10',
      `src/a.test.ts:1:${col(inTest, '002')} removed-reference 002-example-FR-002: this requirement was removed`,
      `src/b.test.ts:1:${col(inGroup, '002')} removed-reference 002-example-FR-002: this requirement was removed`,
      `src/props.ts:1:${col(inUi, '002')} removed-reference 002-example-FR-002: this requirement was removed`,
    ]);
  });

  test('an ID with an active and a removed definition is a valid reference', () => {
    const lines = report({ 'specs/002-example/spec.md': EXAMPLE, 'src/covered.test.ts': COVERAGE });
    expect(lines).toEqual(['specs/002-example/spec.md:9:5 duplicate-id 002-example-FR-003: defined 2 times, on lines 9 and 10']);
  });
});

describe('001-requirement-traceability-FR-018: malformed references are reported', () => {
  const detail = 'not a full requirement ID of the form <feature>-FR-###';

  test('in titles and tags', () => {
    const tokens = [
      'FR-001',
      'fr-001',
      '002-example-fr-001',
      '002-example-FR-01',
      '002-example-FR-0001',
      '002-example-FR-001x',
      'fr-CA',
    ];
    const inTitles = tokens.map((token) => `test('title ${token}', () => {});`);
    const inTags = tokens.map((token) => `test('tagged', { tags: ['${token}'] }, () => {});`);
    const lines = report({
      'specs/002-example/spec.md': EXAMPLE,
      'src/covered.test.ts': COVERAGE,
      'src/tags.test.ts': inTags.join('\n'),
      'src/titles.test.ts': inTitles.join('\n'),
    });
    expect(lines).toEqual([
      'specs/002-example/spec.md:9:5 duplicate-id 002-example-FR-003: defined 2 times, on lines 9 and 10',
      ...tokens.map((token, i) => `src/tags.test.ts:${i + 1}:${col(inTags[i]!, `'${token}'`) + 1} malformed "${token}": ${detail}`),
      ...tokens.map((token, i) => `src/titles.test.ts:${i + 1}:${col(inTitles[i]!, token)} malformed "${token}": ${detail}`),
    ]);
  });

  test('in data-req values, including an empty one', () => {
    const malformed = 'export const A = () => <div data-req="002-example-FR-001 FR-003" />;';
    const empty = 'export const B = () => <div data-req="" />;';
    expect(
      report({
        'specs/002-example/spec.md': EXAMPLE,
        'src/covered.test.ts': COVERAGE,
        'src/A.tsx': malformed,
        'src/B.tsx': empty,
      }),
    ).toEqual([
      'specs/002-example/spec.md:9:5 duplicate-id 002-example-FR-003: defined 2 times, on lines 9 and 10',
      `src/A.tsx:1:${col(malformed, 'FR-003')} malformed "FR-003": ${detail}`,
      `src/B.tsx:1:${col(empty, '""') + 1} malformed "": ${detail}`,
    ]);
  });

  test('a malformed reference does not stop a valid one on the same test from counting', () => {
    const line = "test('002-example-FR-01 and 002-example-FR-001', () => {});";
    expect(
      report({
        'specs/002-example/spec.md': approvedSpec(['- **FR-001**: One.']),
        'src/a.test.ts': line,
      }),
    ).toEqual([`src/a.test.ts:1:${col(line, '002')} malformed "002-example-FR-01": ${detail}`]);
  });
});

describe('001-requirement-traceability-FR-019: references to requirements in Draft specs are valid', () => {
  test('a Draft spec, and a spec with an invalid Status, are valid targets', () => {
    expect(
      report({
        'specs/003-draft/spec.md': approvedSpec(['- **FR-001**: One.']).replace('Approved', 'Draft'),
        'specs/004-typo/spec.md': approvedSpec(['- **FR-001**: One.']).replace('Approved', 'Aproved'),
        'src/a.test.ts': "test('003-draft-FR-001 004-typo-FR-001', () => {});",
        'src/A.tsx': 'export const A = () => <div data-req="003-draft-FR-001" />;',
      }),
    ).toEqual(['specs/004-typo/spec.md:3:13 bad-status "Aproved": Status must be Draft or Approved']);
  });
});
