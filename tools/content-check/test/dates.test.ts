import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
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

const FORM = 'is not a date of the form YYYY, YYYY-MM or YYYY-MM-DD';

describe('002-cv-content-FR-009: dates are a year, a year and month, or a full date', () => {
  for (const date of ['2018', '2018-07', '2018-07-29', '2024-02-29']) {
    test(`${date} is accepted in work and certificates`, () => {
      const { problems } = check((r) => {
        r.work[0].startDate = date;
        r.certificates = [{ name: 'Cloud Basics', date }];
      });
      expect(problems).toEqual([]);
    });
  }

  for (const date of ['2018/07', 'July 2018', '18-07']) {
    test(`${date} is one invalid-date for its form`, () => {
      const { text, problems } = check((r) => (r.work[0].startDate = date));
      expect(problems).toEqual([
        {
          type: 'invalid-date',
          subject: 'work[0].startDate',
          location: { file: RESUME_FILE, ...position(text, JSON.stringify(date)) },
          detail: `${JSON.stringify(date)} ${FORM}`,
        },
      ]);
    });
  }

  for (const date of ['2020-13', '2021-02-30', '2023-02-29']) {
    test(`${date} is one invalid-date because it doesn't exist`, () => {
      const { problems } = check((r) => (r.certificates = [{ name: 'Cloud Basics', date }]));
      expect(brief(problems)).toEqual([
        { type: 'invalid-date', subject: 'certificates[0].date', detail: `${JSON.stringify(date)} is not a real date` },
      ]);
    });
  }
});

describe('002-cv-content-FR-010: an end date is not before its start date', () => {
  test('an end before the start is end-before-start at the end date', () => {
    const { text, problems } = check((r) => (r.education = [{ institution: 'Babeș-Bolyai University', startDate: '2018-09', endDate: '2017' }]));
    expect(problems).toEqual([
      {
        type: 'end-before-start',
        subject: 'education[0].endDate',
        location: { file: RESUME_FILE, ...position(text, '"2017"') },
        detail: '"2017" is before the start date "2018-09"',
      },
    ]);
  });

  test('dates are compared at the precision both share', () => {
    expect(check((r) => (r.education = [{ institution: 'Babeș-Bolyai University', startDate: '2020-05', endDate: '2020' }])).problems).toEqual([]);
    expect(check((r) => (r.education = [{ institution: 'Babeș-Bolyai University', startDate: '2020-05', endDate: '2020-05' }])).problems).toEqual([]);
  });
});

describe('002-cv-content-FR-011: an entry with no end date is ongoing', () => {
  test('an ongoing role passes and comes before a finished one', () => {
    const { problems } = check((r) => {
      r.work = [
        { name: 'Testing Works', position: 'Engineer', startDate: '2018-07' },
        { name: 'Older Works', position: 'Intern', startDate: '2019-01', endDate: '2019-06' },
      ];
    });
    expect(problems).toEqual([]);
  });
});

describe('002-cv-content-FR-036: entries are listed newest first', () => {
  test('an ongoing project after a finished one is out-of-order', () => {
    const { problems } = check((r) => {
      r.projects = [
        { name: 'Route Planner', startDate: '2022-05', endDate: '2023-01' },
        { name: 'Recipe Box', startDate: '2020-02' },
      ];
    });
    expect(brief(problems)).toEqual([
      { type: 'out-of-order', subject: 'projects[1]', detail: 'should come before projects[0] (newest first)' },
    ]);
  });

  test('a later start listed after an earlier one is out-of-order at its opening brace', () => {
    const { text, problems } = check((r) => {
      r.projects = [
        { name: 'Recipe Box', startDate: '2018-08', endDate: '2018-12' },
        { name: 'Route Planner', startDate: '2019-06', endDate: '2019-09' },
      ];
    });
    const name = position(text, '"name": "Route Planner"');
    expect(problems).toEqual([
      {
        type: 'out-of-order',
        subject: 'projects[1]',
        location: { file: RESUME_FILE, line: name.line - 1, column: 5 },
        detail: 'should come before projects[0] (newest first)',
      },
    ]);
  });

  test('dates equal at shared precision pass in either order', () => {
    for (const [a, b] of [
      ['2019-06-01', '2019-06-01'],
      ['2020', '2020-05'],
      ['2020-05', '2020'],
    ]) {
      const { problems } = check((r) => {
        r.projects = [
          { name: 'Recipe Box', startDate: a, endDate: '2021' },
          { name: 'Route Planner', startDate: b, endDate: '2021' },
        ];
      });
      expect(problems).toEqual([]);
    }
  });

  test('entries with no date, or an invalid one, are not ordered', () => {
    const { problems } = check((r) => {
      r.projects = [
        { name: 'Recipe Box', startDate: '2018-01', endDate: '2018-02' },
        { name: 'Undated' },
        { name: 'Route Planner', startDate: '2021-02-30', endDate: '2021-04' },
      ];
    });
    expect(brief(problems)).toEqual([
      { type: 'invalid-date', subject: 'projects[2].startDate', detail: '"2021-02-30" is not a real date' },
    ]);
  });

  test('every pair is compared, so 2020-01, 2020, 2020-05 is one problem', () => {
    const { problems } = check((r) => {
      r.projects = [
        { name: 'A', startDate: '2020-01', endDate: '2021' },
        { name: 'B', startDate: '2020', endDate: '2021' },
        { name: 'C', startDate: '2020-05', endDate: '2021' },
      ];
    });
    expect(brief(problems)).toEqual([
      { type: 'out-of-order', subject: 'projects[2]', detail: 'should come before projects[0] (newest first)' },
    ]);
  });

  test('order is checked in every dated section', () => {
    const { problems } = check((r) => {
      r.awards = [{ title: 'Old', date: '2010' }, { title: 'New', date: '2011' }];
      r.certificates = [{ name: 'Old', date: '2010' }, { name: 'New', date: '2011' }];
      r.publications = [{ name: 'Old', releaseDate: '2010' }, { name: 'New', releaseDate: '2011' }];
      r.volunteer = [
        { organization: 'Old', position: 'Helper', startDate: '2010', endDate: '2010' },
        { organization: 'New', position: 'Helper', startDate: '2011', endDate: '2011' },
      ];
      r.education = [
        { institution: 'Old', startDate: '2010', endDate: '2011' },
        { institution: 'New', startDate: '2012', endDate: '2013' },
      ];
    });
    expect(brief(problems).map((problem) => problem.subject).sort()).toEqual(
      ['awards[1]', 'certificates[1]', 'education[1]', 'publications[1]', 'volunteer[1]'].sort(),
    );
    expect(problems.every((problem) => problem.type === 'out-of-order')).toBe(true);
  });
});
