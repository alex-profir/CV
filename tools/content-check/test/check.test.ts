import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { RESUME_FILE, RULES_FILE, SITE_FILE } from '../src/paths.ts';
import { SAMPLE_RESUME, contentFiles, makeProject, runCli } from './helpers/cli.ts';

type Json = Record<string, any>;

// The 1-based line and column of the first occurrence of `needle`.
function position(text: string, needle: string): { line: number; column: number } {
  const index = text.indexOf(needle);
  const before = text.slice(0, index);
  return { line: before.split('\n').length, column: index - before.lastIndexOf('\n') };
}

function resumeWith(change: (resume: Json) => void): Json {
  const resume = structuredClone(SAMPLE_RESUME) as Json;
  change(resume);
  return resume;
}

describe('002-cv-content-FR-007: values must match the official schema', () => {
  test('a section of the wrong type is a schema-violation at the value', () => {
    const resume = resumeWith((r) => (r.work = { name: 'Testing Works' }));
    const text = `${JSON.stringify(resume, null, 2)}\n`;
    const key = position(text, '"work": ');
    expect(runCheck(makeProject(contentFiles({ resume: text }))).problems).toEqual([
      {
        type: 'schema-violation',
        subject: 'work',
        location: { file: RESUME_FILE, line: key.line, column: key.column + '"work": '.length },
        detail: 'must be an array, not an object',
      },
    ]);
  });

  test('a number where a string goes is a schema-violation', () => {
    const problems = runCheck(makeProject(contentFiles({ resume: resumeWith((r) => (r.basics.name = 42)) }))).problems;
    expect(problems.map(({ type, subject, detail }) => ({ type, subject, detail }))).toEqual([
      { type: 'schema-violation', subject: 'basics.name', detail: 'must be a string, not a number' },
    ]);
  });
});

describe('002-cv-content-FR-028: every problem is reported in one run', () => {
  test('problems of eight types are all reported', () => {
    const resume = resumeWith((r) => {
      r.basics.picture = 'https://cdn.test/me.jpg';
      r.basics.email = 'ioana@';
      r.basics.url = 'https://example.com/';
      r.work[0].startDate = '2021-02-30';
      r.education = [{ institution: 'Babeș-Bolyai University ', startDate: '2018', endDate: '2017' }];
      r.projects = [
        { name: 'Recipe Box', startDate: '2019', endDate: '2019' },
        { name: 'Recipe Box', startDate: '2018', endDate: '2018' },
        { name: 'Route Planner', startDate: '2022', endDate: '2023' },
      ];
    });
    const types = new Set(runCheck(makeProject(contentFiles({ resume }))).problems.map((problem) => problem.type));
    expect([...types].sort()).toEqual(
      [
        'undefined-field',
        'invalid-date',
        'end-before-start',
        'invalid-format',
        'duplicate-entry',
        'out-of-order',
        'untrimmed-text',
        'placeholder',
      ].sort(),
    );
  });

  test('an unreadable site data document still lets the CV rules run', () => {
    const report = runCheck(makeProject(contentFiles({ resume: resumeWith((r) => (r.theme = 'even')), site: '{\n  "a": 1,\n}\n' })));
    expect(report.problems.map((problem) => problem.type).sort()).toEqual(['undefined-field', 'unreadable-document']);
    expect(report.documents.find((document) => document.file === SITE_FILE)?.state).toBe('unreadable');
    expect(report.documents.find((document) => document.file === RESUME_FILE)?.state).toBe('checked');
    expect(report.checksNotRun).not.toContain('CV rules');
  });

  test('an unreadable site data document still lets the key facts search run', () => {
    const files = { 'packages/web/src/a.ts': `export const email = '${SAMPLE_RESUME.basics.email}';\n` };
    const report = runCheck(makeProject(contentFiles({ site: '{\n  "a": 1,\n}\n', files })));
    expect(report.problems.map((problem) => [problem.type, problem.location.file])).toEqual([
      ['unreadable-document', SITE_FILE],
      ['hardcoded-fact', 'packages/web/src/a.ts'],
    ]);
    expect(report.checksNotRun).not.toContain('key facts search');
  });

  test('an unreadable CV document stops the key facts search', () => {
    const report = runCheck(makeProject(contentFiles({ resume: '{ "basics": ', files: { 'packages/web/src/a.ts': 'export {};\n' } })));
    expect(report.checksNotRun).toContain('key facts search');
    expect(report.factKinds).toBeNull();
    expect(report.filesSearched).toBe(0);
  });
});

describe('002-cv-content-FR-032: a missing document fails the check', () => {
  for (const [name, file, options] of [
    ['CV document', RESUME_FILE, { resume: null }],
    ['site data document', SITE_FILE, { site: null }],
    ['rules file', RULES_FILE, { rules: null }],
  ] as const) {
    test(`a missing ${name} is missing-document at 1:1`, () => {
      const report = runCheck(makeProject(contentFiles(options)));
      expect(report.problems).toEqual([
        { type: 'missing-document', subject: file, location: { file, line: 1, column: 1 }, detail: 'file not found' },
      ]);
      expect(report.documents.find((document) => document.file === file)?.state).toBe('missing');
      expect(report.result).toBe('fail');
    });
  }

  test('with the CV missing, the parts that need it do not run', () => {
    expect(runCheck(makeProject(contentFiles({ resume: null }))).checksNotRun).toEqual(['CV rules', 'references', 'key facts search']);
  });

  test('any problem fails and none passes, with exit codes 1 and 0', () => {
    const passing = makeProject(contentFiles());
    expect(runCheck(passing).result).toBe('pass');
    expect(runCli(passing).status).toBe(0);

    const failing = makeProject(contentFiles({ rules: null }));
    expect(runCheck(failing).result).toBe('fail');
    expect(runCli(failing).status).toBe(1);
  });
});
