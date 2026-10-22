import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { readDocument } from '../src/json.ts';
import { RESUME_FILE } from '../src/paths.ts';
import type { Problem } from '../src/report.ts';
import { SAMPLE_RESUME, STARTING_RULES, contentFiles, makeProject } from './helpers/cli.ts';

type Json = Record<string, any>;

const NFC_CITY = 'Timișoara'.normalize('NFC');
const NFD_CITY = 'Timișoara'.normalize('NFD');

function sample(change: (resume: Json) => void, options: Parameters<typeof contentFiles>[0] = {}) {
  const resume = structuredClone(SAMPLE_RESUME) as Json;
  change(resume);
  return makeProject(contentFiles({ ...options, resume }));
}

function brief(problems: Problem[]) {
  return problems.map(({ type, subject, detail }) => ({ type, subject, detail }));
}

describe('002-cv-content-FR-020: any characters are accepted and kept as written', () => {
  test('non-ASCII text gives no problems', () => {
    const root = sample((r) => {
      r.basics.location.city = NFC_CITY;
      r.basics.summary = 'Builds web apps 🚀';
      r.languages = [{ language: 'Magyar' }, { language: 'Ελληνικά' }, { language: '日本語' }];
    });
    expect(runCheck(root).problems).toEqual([]);
  });

  test('text written in NFD reads back in NFD', () => {
    expect(NFD_CITY).not.toBe(NFC_CITY);
    const root = sample((r) => (r.basics.location.city = NFD_CITY));
    const read = readDocument(root, RESUME_FILE);
    expect(read.state).toBe('ok');
    expect((read.value as Json).basics.location.city).toBe(NFD_CITY);
    expect(runCheck(root).problems).toEqual([]);
  });
});

describe('002-cv-content-FR-021: text is compared after Unicode normalization', () => {
  test('the same name in NFC and NFD is one duplicate-entry', () => {
    const root = sample((r) => {
      r.projects = [
        { name: `${NFC_CITY} Guide`, startDate: '2022' },
        { name: `${NFD_CITY} Guide`, startDate: '2021', endDate: '2021' },
      ];
    });
    expect(brief(runCheck(root).problems)).toEqual([
      { type: 'duplicate-entry', subject: 'projects[0]', detail: 'the same entry is listed 2 times: projects[0], projects[1]' },
    ]);
  });

  test('a reference written in NFD resolves to a name written in NFC', () => {
    const root = sample((r) => (r.projects = [{ name: `${NFC_CITY} Guide`, startDate: '2022' }]), {
      site: { $schema: './schemas/site.schema.json', featuredProjects: [`${NFD_CITY} Guide`] },
      rules: {
        ...STARTING_RULES,
        properties: { ...STARTING_RULES.properties, featuredProjects: { type: 'array', items: { type: 'string', 'x-cv-reference': 'project' } } },
      },
    });
    expect(runCheck(root).problems).toEqual([]);
  });

  test('a key fact written in NFD is found, at the column of its first character', () => {
    const name = `Ioana ${NFC_CITY}`;
    const root = sample((r) => (r.basics.name = name), {
      files: { 'packages/web/src/a.ts': `// ${NFD_CITY} and ${name.normalize('NFD')}\n` },
    });
    const facts = runCheck(root).problems.filter((problem) => problem.type === 'hardcoded-fact');
    const column = `// ${NFD_CITY} and `.length + 1;
    expect(facts.map((problem) => [problem.subject, problem.location])).toEqual([
      ['name', { file: 'packages/web/src/a.ts', line: 1, column }],
    ]);
  });
});
