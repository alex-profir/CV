import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { ENTRY_KINDS } from '../src/entries.ts';
import { RESUME_FILE, RULES_FILE, SITE_FILE } from '../src/paths.ts';
import type { Problem } from '../src/report.ts';
import { loadOfficialSchema } from '../src/schema.ts';
import { REPO_ROOT, SAMPLE_RESUME, STARTING_RULES, contentFiles, makeProject } from './helpers/cli.ts';

type Json = Record<string, any>;

const REFERENCES = path.join(REPO_ROOT, 'tools/content-check/test/__fixtures__/references');

// The starting rules plus `properties`.
function rulesWith(properties: Json, extra: Json = {}): Json {
  return { ...STARTING_RULES, properties: { ...STARTING_RULES.properties, ...properties }, ...extra };
}

const REFERENCE_RULES = rulesWith({
  featuredProjects: { type: 'array', items: { type: 'string', 'x-cv-reference': 'project' } },
  contact: {
    type: 'object',
    properties: {
      profile: { type: 'string', 'x-cv-reference': 'profile' },
      links: { type: 'object', properties: { home: { type: 'string' } } },
    },
  },
  highlight: {
    type: 'object',
    'x-cv-reference': 'work',
    properties: { name: { type: 'string' }, position: { type: 'string' }, startDate: { type: 'string' } },
    required: ['name', 'position', 'startDate'],
  },
  theme: { enum: ['light', 'dark'] },
  columns: { type: 'integer' },
});

function check(site: Json, options: { resume?: Json; rules?: Json } = {}) {
  const siteText = `${JSON.stringify({ $schema: './schemas/site.schema.json', ...site }, null, 2)}\n`;
  const root = makeProject(contentFiles({ resume: options.resume ?? SAMPLE_RESUME, site: siteText, rules: options.rules ?? REFERENCE_RULES }));
  return { siteText, report: runCheck(root) };
}

function brief(problems: Problem[]) {
  return problems.map(({ type, subject, location, detail }) => ({ type, subject, file: location.file, detail }));
}

function resumeWith(change: (resume: Json) => void): Json {
  const resume = structuredClone(SAMPLE_RESUME) as Json;
  change(resume);
  return resume;
}

// The 1-based line and column of the first occurrence of `needle`.
function position(text: string, needle: string): { line: number; column: number } {
  const index = text.indexOf(needle);
  const before = text.slice(0, index);
  return { line: before.split('\n').length, column: index - before.lastIndexOf('\n') };
}

// The files of a committed sample, for makeProject.
function sampleFiles(dir: string): Record<string, string> {
  const files: Record<string, string> = {};
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const full = path.join(entry.parentPath, entry.name);
    files[path.relative(dir, full).split(path.sep).join('/')] = fs.readFileSync(full, 'utf8');
  }
  return files;
}

describe('002-cv-content-FR-004: site-only data lives in its own document', () => {
  test('the report lists the site data document on its own', () => {
    const report = runCheck(REPO_ROOT);
    expect(report.documents).toContainEqual({ label: 'Site data document', file: SITE_FILE, state: 'checked' });
  });

  test('a site-only field is rejected in the CV and accepted in site data', () => {
    const inCv = check({}, { resume: { ...SAMPLE_RESUME, featuredProjects: ['Recipe Box'] } });
    expect(brief(inCv.report.problems)).toEqual([
      { type: 'undefined-field', subject: 'featuredProjects', file: RESUME_FILE, detail: 'not a field defined by JSON Resume 1.3.1' },
    ]);
    expect(check({ featuredProjects: ['Recipe Box'] }).report.problems).toEqual([]);
  });
});

describe('002-cv-content-FR-005: site data follows its written rules', () => {
  test('the real rules declare draft-07 and are used', () => {
    const rules = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, RULES_FILE), 'utf8'));
    expect(rules.$schema).toBe('http://json-schema.org/draft-07/schema#');
    expect(runCheck(REPO_ROOT).documents).toContainEqual({ label: 'Site data rules', file: RULES_FILE, state: 'checked' });
  });

  test('a value outside an enum, a wrong type and a missing required field are schema violations', () => {
    expect(brief(check({ theme: 'sepia' }).report.problems)).toEqual([
      { type: 'schema-violation', subject: 'theme', file: SITE_FILE, detail: 'must be one of "light", "dark"' },
    ]);
    expect(brief(check({ columns: '3' }).report.problems)).toEqual([
      { type: 'schema-violation', subject: 'columns', file: SITE_FILE, detail: 'must be an integer, not a string' },
    ]);
    const rules = rulesWith({ theme: { enum: ['light', 'dark'] } }, { required: ['theme'] });
    expect(brief(check({}, { rules }).report.problems)).toEqual([
      { type: 'schema-violation', subject: '(document)', file: SITE_FILE, detail: 'required field "theme" is missing' },
    ]);
  });

  test('an unknown reference kind makes the rules unusable', () => {
    const rules = rulesWith({ featuredProjects: { type: 'array', items: { type: 'string', 'x-cv-reference': 'projet' } } });
    const rulesText = `${JSON.stringify(rules, null, 2)}\n`;
    const key = position(rulesText, '"x-cv-reference": ');
    const report = runCheck(makeProject(contentFiles({ site: { $schema: './schemas/site.schema.json', featuredProjects: ['Recipe Box'] }, rules: rulesText })));
    expect(report.problems).toEqual([
      {
        type: 'unreadable-document',
        subject: RULES_FILE,
        location: { file: RULES_FILE, line: key.line, column: key.column + '"x-cv-reference": '.length },
        detail: 'cannot be used as rules: unknown reference kind "projet"',
      },
    ]);
    expect(report.documents).toContainEqual({ label: 'Site data rules', file: RULES_FILE, state: 'unreadable' });
    expect(report.checksNotRun).toEqual(['site data rules', 'references']);
  });

  test('a reference of the wrong form and an unsupported format make the rules unusable', () => {
    const details = (properties: Json) =>
      check({}, { rules: rulesWith(properties) }).report.problems.map((problem) => [problem.type, problem.detail]);
    expect(details({ highlight: { type: 'string', 'x-cv-reference': 'work' } })).toEqual([
      ['unreadable-document', 'cannot be used as rules: a work reference must be an object with name, position and startDate'],
    ]);
    expect(details({ school: { type: 'object', 'x-cv-reference': 'education', properties: { institution: { type: 'string' } } } })).toEqual([
      ['unreadable-document', 'cannot be used as rules: an education reference must be an object with institution, area, studyType and startDate'],
    ]);
    expect(details({ featured: { type: 'object', 'x-cv-reference': 'project', properties: { name: { type: 'string' } } } })).toEqual([
      ['unreadable-document', 'cannot be used as rules: a project reference must be a string'],
    ]);
    expect(details({ phone: { type: 'string', format: 'phone' } })).toEqual([
      ['unreadable-document', 'cannot be used as rules: unsupported format "phone"'],
    ]);
  });
});

describe('002-cv-content-FR-006: references use only fields the CV already has', () => {
  test('every identifying field is a field of its list in JSON Resume 1.3.1', () => {
    const { schema } = loadOfficialSchema() as { schema: Json };
    for (const [name, kind] of Object.entries(ENTRY_KINDS)) {
      let node: Json = schema;
      for (const part of kind.list) node = node.properties[part];
      const item: Json = node.items;
      for (const field of kind.fields) expect(Object.keys(item.properties), `${name}.${field}`).toContain(field);
    }
  });

  test('a reference resolves with the CV as it is', () => {
    expect(check({ featuredProjects: ['Route Planner'], contact: { profile: 'GitHub' } }).report.problems).toEqual([]);
  });
});

describe('002-cv-content-FR-017: site data has no field its rules leave out', () => {
  test('an undefined field is rejected at the top level and nested', () => {
    const { siteText, report } = check({ extra: true, contact: { links: { home: 'https://ioana.cv.test/', blog: 'x' } } });
    expect(report.problems).toEqual([
      {
        type: 'undefined-field',
        subject: 'extra',
        location: { file: SITE_FILE, ...position(siteText, '"extra"') },
        detail: 'not a field defined by the site data rules',
      },
      {
        type: 'undefined-field',
        subject: 'contact.links.blog',
        location: { file: SITE_FILE, ...position(siteText, '"blog"') },
        detail: 'not a field defined by the site data rules',
      },
    ]);
  });
});

describe('002-cv-content-FR-018: every reference names an entry that exists', () => {
  test('the references sample passes', () => {
    expect(runCheck(REFERENCES).problems).toEqual([]);
  });

  test('renaming the project in the CV only leaves a dangling reference', () => {
    const files = sampleFiles(REFERENCES);
    files[RESUME_FILE] = files[RESUME_FILE]!.replace('"Guided Tours System"', '"City Tours App"');
    const report = runCheck(makeProject(files));
    expect(report.problems).toEqual([
      {
        type: 'dangling-reference',
        subject: 'featuredProjects[0]',
        location: { file: SITE_FILE, ...position(files[SITE_FILE]!, '"Guided Tours System"') },
        detail: 'no project with name "Guided Tours System" exists in the CV document',
      },
    ]);
  });

  test('a profile that does not exist', () => {
    const resume = resumeWith((r) => (r.basics.profiles = [{ network: 'GitLab', username: 'ioana' }]));
    expect(brief(check({ contact: { profile: 'GitHub' } }, { resume }).report.problems)).toEqual([
      { type: 'dangling-reference', subject: 'contact.profile', file: SITE_FILE, detail: 'no profile with network "GitHub" exists in the CV document' },
    ]);
  });

  test('a work reference names every identifying field', () => {
    expect(check({ highlight: { name: 'Testing Works', position: 'Engineer', startDate: '2021-03' } }).report.problems).toEqual([]);
    expect(brief(check({ highlight: { name: 'Testing Works', position: 'Developer', startDate: '2021-03' } }).report.problems)).toEqual([
      {
        type: 'dangling-reference',
        subject: 'highlight',
        file: SITE_FILE,
        detail: 'no work entry with name "Testing Works", position "Developer" and startDate "2021-03" exists in the CV document',
      },
    ]);
  });

  test('a value of the wrong form for its kind', () => {
    const problems = check({ highlight: 'Testing Works' }).report.problems;
    expect(brief(problems)).toContainEqual({
      type: 'dangling-reference',
      subject: 'highlight',
      file: SITE_FILE,
      detail: 'a work reference needs name, position and startDate',
    });
  });

  test('an entry missing an identifying field cannot be referred to', () => {
    const resume = resumeWith((r) => (r.work = [{ name: 'Testing Works', startDate: '2021-03' }]));
    expect(brief(check({ highlight: { name: 'Testing Works', position: 'Engineer', startDate: '2021-03' } }, { resume }).report.problems)).toEqual([
      {
        type: 'dangling-reference',
        subject: 'highlight',
        file: SITE_FILE,
        detail: 'no work entry with name "Testing Works", position "Engineer" and startDate "2021-03" exists in the CV document',
      },
    ]);
  });
});

describe('002-cv-content-FR-019: a reference to an entry listed twice is ambiguous', () => {
  test('ambiguous-reference on site data and duplicate-entry on the CV', () => {
    const resume = resumeWith((r) => {
      r.projects = [
        { name: 'Recipe Box', startDate: '2022', endDate: '2022' },
        { name: 'Recipe Box', startDate: '2020', endDate: '2020' },
      ];
    });
    expect(brief(check({ featuredProjects: ['Recipe Box'] }, { resume }).report.problems)).toEqual([
      { type: 'duplicate-entry', subject: 'projects[0]', file: RESUME_FILE, detail: 'the same entry is listed 2 times: projects[0], projects[1]' },
      {
        type: 'ambiguous-reference',
        subject: 'featuredProjects[0]',
        file: SITE_FILE,
        detail: '"Recipe Box" matches 2 projects in the CV document: projects[0], projects[1]',
      },
    ]);
  });
});
