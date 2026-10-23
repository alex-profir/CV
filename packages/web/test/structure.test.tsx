// The page's structure as assistive technology reads it, from Chromium's
// accessibility tree (contracts/page.md /cv structure, research R8).
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import type { Resume } from '@cv/content';
import { dateRange } from '../src/format/dates.ts';
import { siteText } from '../src/site-text.ts';
import { axNodes, axText, headingOutline } from './helpers/ax.ts';
import { openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

async function realPage(width = 1440) {
  const { url } = await serveBuilt();
  return openPage(`${url}/cv`, { width });
}

async function fixturePage(cv: Resume, width = 1440) {
  const { url } = await serveFixture(cv);
  return openPage(`${url}/cv`, { width });
}

// The dated entries in page order.
const datedEntries = (cv: Resume) => [...(cv.work ?? []), ...(cv.projects ?? []), ...(cv.education ?? [])];

describe('004-cv-page-FR-011: every date reads as words and carries its machine-readable form', () => {
  test("each date line's accessible text is the spoken form, in page order", async () => {
    const page = await realPage();
    const expected = datedEntries(resume)
      .map((entry) => dateRange(entry.startDate, entry.endDate)?.spoken)
      .filter((spoken) => spoken !== undefined);
    expect(await axText(page, 'p.date')).toEqual(expected);
    expect(expected).toContain('July 2018 to October 2026');
    expect(expected).toContain('December 2025 to present');
  });

  test('each time element carries the CV string as its datetime', async () => {
    const page = await realPage();
    const datetimes = await page.locator('main time').evaluateAll((elements) => elements.map((element) => element.getAttribute('datetime')));
    const expected = datedEntries(resume).flatMap((entry) => [entry.startDate, entry.endDate].filter((date) => date !== undefined));
    expect(datetimes).toEqual(expected);
  });

  test('partial dates read as words at their own precision', async () => {
    const page = await fixturePage(fixture('partial-dates'), 375);
    expect(await axText(page, 'p.date')).toEqual([
      'July 2018 to October 2026',
      'December 2025 to present',
      'October 2026',
      'July 2018',
      '2018',
      '2018 to March 2019',
      '29 July 2018',
      '29 July 2018 to present',
    ]);
    expect(await page.locator('main li').filter({ hasText: 'No Dates' }).locator('p.date').count()).toBe(0);
  });
});

describe('004-cv-page-FR-023: the page has exactly one main heading, the name or the site heading', () => {
  test('the real CV has one h1, Alex Profir', async () => {
    const page = await realPage();
    expect((await headingOutline(page)).filter((heading) => heading.level === 1)).toEqual([{ level: 1, name: 'Alex Profir' }]);
  });

  test('a CV with no name has one h1, the site heading', async () => {
    const page = await fixturePage(fixture('no-name'));
    expect((await headingOutline(page)).filter((heading) => heading.level === 1)).toEqual([{ level: 1, name: siteText.siteHeading }]);
  });
});

describe('004-cv-page-FR-024: a heading per section and per entry, one level below its parent, with no skipped level', () => {
  test('the real outline is the name, a section heading each, and an entry heading per work, project and education entry (US1 scenario 6)', async () => {
    const page = await realPage();
    const outline = await headingOutline(page);
    const expected = [
      { level: 1, name: resume.basics!.name! },
      { level: 2, name: 'Experience' },
      ...resume.work!.map((work) => ({ level: 3, name: work.position! })),
      { level: 2, name: 'Projects' },
      ...resume.projects!.map((project) => ({ level: 3, name: project.name! })),
      { level: 2, name: 'Skills' },
      { level: 2, name: 'Education' },
      ...resume.education!.map((entry) => ({ level: 3, name: [entry.studyType, entry.area].filter(Boolean).join(', ') })),
      { level: 2, name: 'Languages' },
      { level: 2, name: 'Interests' },
    ];
    expect(outline).toEqual(expected);
    outline.forEach((heading, index) => {
      if (index > 0) expect(heading.level).toBeLessThanOrEqual(outline[index - 1]!.level + 1);
    });
  });

  test('an entry with no heading field falls back to its organization, then its date; an empty entry is not rendered', async () => {
    const page = await fixturePage(fixture('entry-without-heading'), 375);
    expect(await headingOutline(page)).toEqual([
      { level: 1, name: 'Headingless Person' },
      { level: 2, name: 'Experience' },
      { level: 3, name: 'April 2019 to February 2020' },
      { level: 3, name: 'Organization Only Company' },
      { level: 2, name: 'Education' },
      { level: 3, name: 'Headingless Institution' },
    ]);
    expect(await page.locator('main section:first-of-type ol > li').count()).toBe(2);
    // The organization is not repeated under a heading that already holds it.
    expect(await page.locator('main li', { hasText: 'Headingless Institution' }).locator('p.org').count()).toBe(0);
  });

  test('every-field.json gives an entry heading to each work, project and education entry', async () => {
    const page = await fixturePage(fixture('every-field'));
    const outline = await headingOutline(page);
    expect(outline.filter((heading) => heading.level === 3).map((heading) => heading.name)).toEqual([
      'Fixture Work Position',
      'Fixture Project Name',
      'Fixture Study Type, Fixture Area',
    ]);
  });
});

describe('004-cv-page-FR-025: one main landmark, a named region per section, and the footer outside main', () => {
  test('the real page has one main, a region per section named by its heading, and the footer outside main', async () => {
    const page = await realPage();
    expect((await axNodes(page, 'main')).map((node) => node.role)).toEqual(['main']);
    const regions = await axNodes(page, 'main > section');
    expect(regions.map((region) => region.role)).toEqual(Array(6).fill('region'));
    expect(regions.map((region) => region.name)).toEqual(['Experience', 'Projects', 'Skills', 'Education', 'Languages', 'Interests']);
    expect(await page.locator('main footer, main [data-site-element]').count()).toBe(0);
    expect(await page.locator('body > footer[data-site-element]').count()).toBe(1);
    expect((await axNodes(page, 'body > footer'))[0]?.role).toBe('contentinfo');
  });
});

describe('004-cv-page-FR-026: lists in the CV are marked as lists', () => {
  test('highlights, keywords, courses, profiles, skills, languages and interests are lists of list items', async () => {
    const page = await fixturePage(fixture('every-field'));
    for (const selector of ['ul.highlights', 'ul.chips', 'ul.profiles', 'ul.skills', 'ul.languages', 'ul.interests', 'ol.timeline']) {
      const lists = await axNodes(page, `main ${selector}`);
      expect(lists.length, selector).toBeGreaterThan(0);
      for (const list of lists) expect(list.role, selector).toBe('list');
      for (const item of await axNodes(page, `main ${selector} > li`)) expect(item.role, selector).toBe('listitem');
    }
    // Courses are chips in the education entry.
    expect(await page.locator('main section', { hasText: 'Fixture Course One' }).locator('ul.chips li').count()).toBe(2);
  });
});

describe('004-cv-page-FR-027: the page declares English', () => {
  test('html has lang="en" on both pages', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      const page = await openPage(`${url}${target}`, { width: 375 });
      expect(await page.locator('html').getAttribute('lang')).toBe('en');
    }
  });
});
