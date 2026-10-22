import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { PROBLEM_TYPES, renderReport, sortProblems } from '../src/report.ts';
import type { Problem, Report } from '../src/report.ts';
import { SAMPLE_RESUME, contentFiles, makeProject } from './helpers/cli.ts';

const DOCUMENTS: Report['documents'] = [
  { label: 'CV document', file: 'packages/content/resume.json', state: 'checked' },
  { label: 'Site data document', file: 'packages/content/site.json', state: 'checked' },
  { label: 'Site data rules', file: 'packages/content/schemas/site.schema.json', state: 'checked' },
];

function report(overrides: Partial<Report> = {}): Report {
  const problems = overrides.problems ?? [];
  return {
    problems,
    documents: DOCUMENTS,
    factKinds: ['name', 'email'],
    filesSearched: 9,
    filesSkipped: 0,
    checksNotRun: [],
    result: problems.length === 0 ? 'pass' : 'fail',
    ...overrides,
  };
}

function problem(file: string, line: number, column: number, type: Problem['type'], subject: string, detail = 'a detail'): Problem {
  return { type, subject, location: { file, line, column }, detail };
}

// Every type with its count, in PROBLEM_TYPES order.
function counts(byType: Partial<Record<Problem['type'], number>> = {}): string {
  return PROBLEM_TYPES.map((type) => `    ${type.padEnd(28)}${byType[type] ?? 0}\n`).join('');
}

const PASSING = `Summary
  CV document:                  packages/content/resume.json (checked)
  Site data document:           packages/content/site.json (checked)
  Site data rules:              packages/content/schemas/site.schema.json (checked)
  Key facts searched for:       name, email
  Files searched for key facts: 9
  Files skipped (not text):     0
  Checks not run:               none
  Problems:                     0
    unreadable-document         0
    missing-document            0
    schema-violation            0
    undefined-field             0
    invalid-date                0
    end-before-start            0
    invalid-format              0
    duplicate-entry             0
    out-of-order                0
    untrimmed-text              0
    placeholder                 0
    dangling-reference          0
    ambiguous-reference         0
    hardcoded-fact              0

PASS: both documents are valid and no key facts are hardcoded.
`;

describe('002-cv-content-FR-029: every problem names its file, line, column, type and field', () => {
  test('every problem line carries the location, type, subject and detail', () => {
    const root = makeProject(
      contentFiles({
        resume: { ...SAMPLE_RESUME, theme: 'even', basics: { ...SAMPLE_RESUME.basics, email: 'alex@', url: 'https://example.com/' } },
      }),
    );
    const text = renderReport(runCheck(root));
    const lines = text.slice(0, text.indexOf('\n\nSummary\n')).split('\n');
    expect(lines.length).toBe(3);
    for (const line of lines) expect(line).toMatch(/^[^\s:]+:\d+:\d+ [a-z-]+ .+: .+$/);
  });
});

describe('002-cv-content-FR-030: the summary lists documents, facts, files, parts not run and counts', () => {
  test('a passing run is exactly the contract summary', () => {
    expect(renderReport(report())).toBe(PASSING);
  });

  test('a run whose CV document could not be read', () => {
    const text = renderReport(
      report({
        problems: [problem('packages/content/resume.json', 4, 3, 'unreadable-document', 'packages/content/resume.json', 'invalid JSON: comma expected')],
        documents: [{ ...DOCUMENTS[0]!, state: 'unreadable' }, DOCUMENTS[1]!, DOCUMENTS[2]!],
        factKinds: null,
        filesSearched: 0,
        checksNotRun: ['CV rules', 'references', 'key facts search'],
      }),
    );
    expect(text).toBe(
      'packages/content/resume.json:4:3 unreadable-document packages/content/resume.json: invalid JSON: comma expected\n' +
        '\n' +
        'Summary\n' +
        '  CV document:                  packages/content/resume.json (unreadable)\n' +
        '  Site data document:           packages/content/site.json (checked)\n' +
        '  Site data rules:              packages/content/schemas/site.schema.json (checked)\n' +
        '  Key facts searched for:       none (the CV document could not be read)\n' +
        '  Files searched for key facts: 0\n' +
        '  Files skipped (not text):     0\n' +
        '  Checks not run:               CV rules, references, key facts search\n' +
        '  Problems:                     1\n' +
        counts({ 'unreadable-document': 1 }) +
        '\n' +
        'FAIL: 1 problem found. Some checks could not run.\n',
    );
  });

  test('one problem and several problems', () => {
    const one = renderReport(report({ problems: [problem('a.json', 1, 1, 'placeholder', 'basics.url')] }));
    expect(one).toBe(
      'a.json:1:1 placeholder basics.url: a detail\n\n' +
        PASSING.replace('Problems:                     0', 'Problems:                     1')
          .replace('    placeholder                 0', '    placeholder                 1')
          .replace('PASS: both documents are valid and no key facts are hardcoded.', 'FAIL: 1 problem found.'),
    );

    const several = renderReport(
      report({
        problems: [
          problem('a.json', 1, 1, 'placeholder', 'basics.url'),
          problem('a.json', 2, 1, 'placeholder', 'work[0].url'),
          problem('b.ts', 3, 7, 'hardcoded-fact', 'email'),
        ],
      }),
    );
    expect(several.endsWith('\n\nFAIL: 3 problems found.\n')).toBe(true);
    expect(several).toContain(counts({ placeholder: 2, 'hardcoded-fact': 1 }));
    expect(several).toContain('  Problems:                     3\n');
  });

  test('parts that did not run are named in order, with the could-not-run note', () => {
    const text = renderReport(
      report({
        problems: [problem('packages/content/site.json', 1, 1, 'missing-document', 'packages/content/site.json', 'file not found')],
        checksNotRun: ['site data rules', 'references'],
      }),
    );
    expect(text).toContain('  Checks not run:               site data rules, references\n');
    expect(text.endsWith('\nFAIL: 1 problem found. Some checks could not run.\n')).toBe(true);
  });

  test('key facts read none when the CV publishes none', () => {
    expect(renderReport(report({ factKinds: [] }))).toContain('  Key facts searched for:       none\n');
  });

  test('every type is listed with its count, zeros included, in order', () => {
    const text = renderReport(report());
    const listed = text.split('\n').flatMap((line) => /^ {4}([a-z-]+) +\d+$/.exec(line)?.[1] ?? []);
    expect(listed).toEqual([...PROBLEM_TYPES]);
  });

  test('with no problems the report starts at Summary and ends with one newline', () => {
    const text = renderReport(report());
    expect(text.startsWith('Summary\n')).toBe(true);
    expect(text.endsWith('.\n')).toBe(true);
    expect(text.endsWith('\n\n')).toBe(false);
  });
});

describe('002-cv-content-FR-031: the report is the same on every run', () => {
  test('problems are sorted by file in code-unit order, then line, column, type and subject', () => {
    const sorted = [
      problem('Z.json', 1, 1, 'placeholder', 'a'),
      problem('a.json', 1, 1, 'schema-violation', 'b'),
      problem('a.json', 1, 1, 'placeholder', 'a'),
      problem('a.json', 1, 1, 'placeholder', 'b'),
      problem('a.json', 1, 2, 'unreadable-document', 'a'),
      problem('a.json', 2, 1, 'unreadable-document', 'a'),
    ];
    for (let seed = 0; seed < 10; seed += 1) {
      const shuffled = [...sorted].sort((a, b) => ((sorted.indexOf(a) * 7 + seed) % 5) - ((sorted.indexOf(b) * 7 + seed) % 5));
      expect(sortProblems(shuffled)).toEqual(sorted);
    }
  });

  test('two runs on the same sample render identical text', () => {
    const root = makeProject(contentFiles({ resume: { ...SAMPLE_RESUME, theme: 'even' } }));
    expect(renderReport(runCheck(root))).toBe(renderReport(runCheck(root)));
  });
});
