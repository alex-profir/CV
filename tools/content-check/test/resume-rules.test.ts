import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { COUNTRY_CODES } from '../src/countries.ts';
import { RESUME_FILE } from '../src/paths.ts';
import type { Problem } from '../src/report.ts';
import { SAMPLE_RESUME, contentFiles, makeProject } from './helpers/cli.ts';

type Json = Record<string, any>;

function check(change: (resume: Json) => void): { text: string; problems: Problem[] } {
  const resume = structuredClone(SAMPLE_RESUME) as Json;
  change(resume);
  const text = `${JSON.stringify(resume, null, 2)}\n`;
  return { text, problems: runCheck(makeProject(contentFiles({ resume: text }))).problems };
}

function brief(problems: Problem[]) {
  return problems.map(({ type, subject, detail }) => ({ type, subject, detail }));
}

// The 1-based line and column of the first occurrence of `needle`.
function position(text: string, needle: string): { line: number; column: number } {
  const index = text.indexOf(needle);
  const before = text.slice(0, index);
  return { line: before.split('\n').length, column: index - before.lastIndexOf('\n') };
}

const URL_DETAIL = 'is not an absolute web address (http or https)';

describe('002-cv-content-FR-012: country codes, emails and web addresses are well formed', () => {
  for (const code of ['Romania', 'ro', 'XK']) {
    test(`country code ${code} is invalid-format at the value`, () => {
      const { text, problems } = check((r) => (r.basics.location.countryCode = code));
      const key = position(text, '"countryCode": ');
      expect(problems).toEqual([
        {
          type: 'invalid-format',
          subject: 'basics.location.countryCode',
          location: { file: RESUME_FILE, line: key.line, column: key.column + '"countryCode": '.length },
          detail: `"${code}" is not a two-letter ISO 3166-1 country code`,
        },
      ]);
    });
  }

  for (const email of ['alex@', 'a b@c.d']) {
    test(`email ${JSON.stringify(email)} is invalid-format`, () => {
      const { text, problems } = check((r) => (r.basics.email = email));
      expect(problems).toEqual([
        {
          type: 'invalid-format',
          subject: 'basics.email',
          location: { file: RESUME_FILE, ...position(text, JSON.stringify(email)) },
          detail: `${JSON.stringify(email)} is not a well-formed email address`,
        },
      ]);
    });
  }

  for (const url of ['github.com/x', 'mailto:a@b.c', 'ftp://x.y']) {
    test(`web address ${url} is invalid-format wherever a URL goes`, () => {
      const { problems } = check((r) => {
        r.basics.url = url;
        r.basics.profiles[0].url = url;
        r.projects[0].url = url;
        r.basics.image = url;
      });
      expect(brief(problems).sort((a, b) => (a.subject < b.subject ? -1 : 1))).toEqual(
        ['basics.image', 'basics.profiles[0].url', 'basics.url', 'projects[0].url'].map((subject) => ({
          type: 'invalid-format',
          subject,
          detail: `"${url}" ${URL_DETAIL}`,
        })),
      );
    });
  }

  test('well-formed values pass', () => {
    const { problems } = check((r) => {
      r.basics.location.countryCode = 'RO';
      r.basics.email = 'ioana@cv.test';
      r.basics.url = 'https://ioana.cv.test/';
      r.basics.image = 'http://ioana.cv.test/me.jpg';
    });
    expect(problems).toEqual([]);
  });

  test('the country list is the 249 officially assigned codes', () => {
    expect(COUNTRY_CODES).toHaveLength(249);
    expect(new Set(COUNTRY_CODES).size).toBe(249);
    const names = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
      expect(names.of(code), code).toEqual(expect.any(String));
    }
    expect(COUNTRY_CODES).not.toContain('XK');
    expect(COUNTRY_CODES).not.toContain('EU');
  });
});

describe('002-cv-content-FR-013: sections may be empty or left out', () => {
  test('an empty section passes', () => {
    expect(check((r) => (r.projects = [])).problems).toEqual([]);
  });

  test('a CV with only a name passes', () => {
    const root = makeProject(contentFiles({ resume: { basics: { name: 'Ioana Testescu' } } }));
    expect(runCheck(root).problems).toEqual([]);
  });
});

describe('002-cv-content-FR-014: an entry is not listed twice', () => {
  test('the same project twice is one duplicate-entry at the first', () => {
    const { text, problems } = check((r) => {
      r.projects = [
        { name: 'Route Planner', startDate: '2022-05', endDate: '2023-01' },
        { name: 'Route Planner', startDate: '2020-02', endDate: '2020-11' },
      ];
    });
    const name = position(text, '"name": "Route Planner"');
    expect(problems).toEqual([
      {
        type: 'duplicate-entry',
        subject: 'projects[0]',
        location: { file: RESUME_FILE, line: name.line - 1, column: 5 },
        detail: 'the same entry is listed 2 times: projects[0], projects[1]',
      },
    ]);
  });

  test('the same profile network twice is one duplicate-entry', () => {
    const { problems } = check((r) => r.basics.profiles.push({ network: 'GitHub', username: 'other' }));
    expect(brief(problems)).toEqual([
      {
        type: 'duplicate-entry',
        subject: 'basics.profiles[0]',
        detail: 'the same entry is listed 2 times: basics.profiles[0], basics.profiles[1]',
      },
    ]);
  });

  test('two roles at one company with different start dates are not duplicates', () => {
    const { problems } = check((r) => {
      r.work = [
        { name: 'Testing Works', position: 'Engineer', startDate: '2021-03' },
        { name: 'Testing Works', position: 'Engineer', startDate: '2019-01', endDate: '2020-12' },
      ];
    });
    expect(problems).toEqual([]);
  });

  test('a missing identifying field matches only a missing field', () => {
    const different = check((r) => {
      r.education = [
        { institution: 'Babeș-Bolyai University', area: 'Informatics', startDate: '2016' },
        { institution: 'Babeș-Bolyai University', studyType: 'Bachelor', startDate: '2016' },
      ];
    });
    expect(different.problems).toEqual([]);

    const same = check((r) => {
      r.education = [
        { institution: 'Babeș-Bolyai University', area: 'Informatics', startDate: '2016' },
        { institution: 'Babeș-Bolyai University', area: 'Informatics', startDate: '2016' },
      ];
    });
    expect(brief(same.problems)).toEqual([
      { type: 'duplicate-entry', subject: 'education[0]', detail: 'the same entry is listed 2 times: education[0], education[1]' },
    ]);
  });

  test('comparison is case-sensitive', () => {
    expect(check((r) => r.basics.profiles.push({ network: 'github', username: 'other' })).problems).toEqual([]);
  });
});

describe('002-cv-content-FR-015: text has no leading or trailing whitespace', () => {
  test('each untrimmed value is untrimmed-text', () => {
    const { problems } = check((r) => {
      r.education = [{ institution: 'Politehnica University of Timișoara ' }];
      r.projects[0].highlights = [' Shipped offline maps'];
      r.skills = [{ name: 'Web', keywords: ['TypeScript\t'] }];
    });
    expect(brief(problems).map((problem) => problem.subject).sort()).toEqual(
      ['education[0].institution', 'projects[0].highlights[0]', 'skills[0].keywords[0]'],
    );
    expect(brief(problems)).toContainEqual({
      type: 'untrimmed-text',
      subject: 'education[0].institution',
      detail: '"Politehnica University of Timișoara " has leading or trailing whitespace',
    });
    expect(brief(problems)).toContainEqual({
      type: 'untrimmed-text',
      subject: 'skills[0].keywords[0]',
      detail: '"TypeScript\\t" has leading or trailing whitespace',
    });
    expect(brief(problems)).toContainEqual({
      type: 'untrimmed-text',
      subject: 'projects[0].highlights[0]',
      detail: '" Shipped offline maps" has leading or trailing whitespace',
    });
  });
});

describe('002-cv-content-FR-016: placeholder values are rejected', () => {
  for (const url of ['https://example.com/me', 'https://www.example.org/', 'http://example.net']) {
    test(`${url} is a placeholder`, () => {
      const { problems } = check((r) => (r.basics.url = url));
      expect(brief(problems)).toEqual([
        { type: 'placeholder', subject: 'basics.url', detail: `${JSON.stringify(url)} is on a reserved example domain` },
      ]);
    });
  }

  test('a domain that only starts with example is not', () => {
    expect(check((r) => (r.basics.url = 'https://example.community/')).problems).toEqual([]);
  });

  test('meta values copied from the sample CV are placeholders', () => {
    const meta = {
      canonical: 'https://raw.githubusercontent.com/jsonresume/resume-schema/master/sample.resume.json',
      version: 'v1.0.0',
      lastModified: '2017-12-24T15:53:00',
    };
    const { problems } = check((r) => (r.meta = meta));
    expect(brief(problems)).toEqual(
      (['canonical', 'version', 'lastModified'] as const).map((key) => ({
        type: 'placeholder',
        subject: `meta.${key}`,
        detail: `${JSON.stringify(meta[key])} is copied from the JSON Resume sample CV`,
      })),
    );
  });
});
