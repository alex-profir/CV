// What /cv shows from the CV document: every supported section in the
// design's order, every shown field, nothing hardcoded, nothing empty, and
// every character as written (contracts/page.md).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import type { Resume } from '@cv/content';
import { dateRange, dateValue } from '../src/format/dates.ts';
import { countryName, locationLine } from '../src/format/location.ts';
import { siteText } from '../src/site-text.ts';
import { openHtml } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, renderFixtureHtml } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

const realHtml = () => fs.readFileSync(path.join(builtSite().dir, 'cv.html'), 'utf8');

const texts = (page: Page, selector: string) => page.locator(selector).evaluateAll((elements) => elements.map((element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim()));

// Every string anywhere in a value, depth first.
function strings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value !== null && typeof value === 'object') return Object.entries(value).flatMap(([key, child]) => (key === '$schema' ? [] : strings(child)));
  return [];
}

describe("004-cv-page-FR-001: /cv shows every supported section in the design's order, entries in the document's order", () => {
  test('the real CV gives the intro block, then Experience, Projects, Skills, Education, Languages and Interests (US1 scenario 1)', async () => {
    const page = await openHtml(realHtml());
    const children = await page.locator('main > *').evaluateAll((elements) => elements.map((element) => element.tagName.toLowerCase() + (element.className ? `.${element.className}` : '')));
    expect(children[0]).toBe('div.intro');
    expect(children.slice(1).every((child) => child.startsWith('section'))).toBe(true);
    expect(await texts(page, 'main > section h2')).toEqual(['Experience', 'Projects', 'Skills', 'Education', 'Languages', 'Interests']);
  });

  test("entries keep the document's order, even when it isn't chronological", async () => {
    const page = await openHtml(renderFixtureHtml(fixture('three-projects')));
    expect(await texts(page, 'main section h3')).toEqual(['Project Middle', 'Project Newest', 'Project Oldest']);
  });

  test("the real CV's projects appear in its order", async () => {
    const page = await openHtml(realHtml());
    const projects = (resume.projects ?? []).map((project) => project.name);
    const headings = await texts(page, 'main section h3');
    expect(headings.filter((heading) => projects.includes(heading))).toEqual(projects);
  });
});

describe('004-cv-page-FR-002: every shown field of a supported section appears when the CV document holds it', () => {
  test('every-field.json shows every field of the Key Entities table', async () => {
    const cv = fixture('every-field');
    const page = await openHtml(renderFixtureHtml(cv));
    const main = (await page.locator('main').textContent())!.replace(/\s+/g, ' ');
    const basics = cv.basics!;
    const shownAsText = [
      basics.name!,
      basics.label!,
      basics.email!,
      basics.url!.replace(/^https?:\/\//, ''),
      basics.summary!,
      basics.location!.city!,
      basics.location!.region!,
      countryName(basics.location!.countryCode!),
      ...basics.profiles!.map((profile) => profile.username ?? profile.network!),
      ...basics.profiles!.map((profile) => profile.network!),
      ...cv.work!.flatMap((work) => [work.name!, work.position!, work.location!, work.summary!, work.description!, ...work.highlights!]),
      ...cv.projects!.flatMap((project) => [
        project.name!,
        project.description!,
        project.entity!,
        project.type!,
        ...project.roles!,
        ...project.highlights!,
        ...project.keywords!,
      ]),
      ...cv.skills!.flatMap((skill) => [skill.name!, skill.level!, ...skill.keywords!]),
      ...cv.education!.flatMap((entry) => [entry.institution!, entry.area!, entry.studyType!, entry.score!, ...entry.courses!]),
      ...cv.languages!.flatMap((language) => [language.language!, language.fluency!]),
      ...cv.interests!.flatMap((interest) => [interest.name!, ...interest.keywords!]),
    ];
    for (const value of shownAsText) expect(main, value).toContain(value);

    const links = await page.locator('main a[href]').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
    for (const url of [basics.url!, ...basics.profiles!.map((profile) => profile.url!), cv.work![0]!.url!, cv.projects![0]!.url!, cv.education![0]!.url!]) {
      expect(links, url).toContain(url);
    }
    expect(links).toContain(`mailto:${basics.email}`);

    const datetimes = await page.locator('main time[datetime]').evaluateAll((elements) => elements.map((element) => element.getAttribute('datetime')));
    const dates = [...cv.work!, ...cv.projects!, ...cv.education!].flatMap((entry) => [entry.startDate!, entry.endDate!]);
    for (const date of dates) expect(datetimes, date).toContain(date);
  });
});

describe('004-cv-page-FR-003: every word of CV text on the page comes from the CV document', () => {
  test("every text node in the real CV's main is CV text, formatted CV text or site text", async () => {
    const cv: Resume = resume;
    const entries = [...(cv.work ?? []), ...(cv.projects ?? []), ...(cv.education ?? [])];
    const allowed = [
      ...strings(cv),
      ...strings(siteText),
      ...entries.flatMap((entry) => {
        const range = dateRange(entry.startDate, entry.endDate);
        return range === null ? [] : [range.visible, range.spoken];
      }),
      ...entries.flatMap((entry) => [entry.startDate, entry.endDate].filter((date) => date !== undefined).flatMap((date) => [dateValue(date).visible, dateValue(date).spoken])),
      ...(cv.basics?.location?.countryCode ? [countryName(cv.basics.location.countryCode)] : []),
      ...(cv.basics?.location ? [locationLine(cv.basics.location) ?? ''] : []),
      ...(cv.interests ?? []).map((interest) => (interest.keywords ?? []).join(siteText.listSeparator)),
      ...(cv.projects ?? []).map((project) => (project.roles ?? []).join(siteText.listSeparator)),
      ...(cv.basics?.profiles ?? []).map((profile) => siteText.profileLabel.replace('{network}', profile.network ?? '').replace('{username}', profile.username ?? '')),
    ].map((text) => text.normalize('NFC'));
    const separators = [siteText.listSeparator, siteText.metaSeparator, siteText.rangeSeparator].map((text) => text.trim());
    const covered = (text: string) => allowed.some((value) => value.includes(text));

    const page = await openHtml(realHtml());
    const nodes = await page.locator('main').evaluate((main) => {
      const found: { text: string; decorative: boolean }[] = [];
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (text === '') continue;
        found.push({ text, decorative: node.parentElement?.closest('.section-number') !== null });
      }
      return found;
    });
    expect(nodes.length).toBeGreaterThan(50);
    for (const { text, decorative } of nodes) {
      if (decorative) {
        // The section numbers are decoration, numbered by the sections shown.
        expect(text).toMatch(/^\d{2}$/);
        continue;
      }
      const pieces = text.split(new RegExp(separators.map((separator) => ` ?${separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ?`).join('|')));
      expect(
        covered(text) || pieces.every((piece) => piece === '' || covered(piece)),
        `"${text}" is neither CV text nor site text`,
      ).toBe(true);
    }
  });
});

describe('004-cv-page-FR-004: an empty or absent section, and an absent field, leave nothing behind', () => {
  test('empty-sections.json shows no Interests or Languages heading and no empty section', async () => {
    const page = await openHtml(renderFixtureHtml(fixture('empty-sections')));
    const headings = await texts(page, 'main h2');
    expect(headings).not.toContain(siteText.sections.interests);
    expect(headings).not.toContain(siteText.sections.languages);
    expect(headings).toEqual([siteText.sections.work, siteText.sections.skills]);
    for (const count of await page.locator('main section').evaluateAll((sections) => sections.map((section) => section.querySelectorAll('li').length))) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('nothing-optional.json has no contact row, label, separator or empty element', async () => {
    const page = await openHtml(renderFixtureHtml(fixture('nothing-optional')));
    expect(await page.locator('main dl, main dt, main dd, main .profiles, main .contact-block, main .summary').count()).toBe(0);
    const main = (await page.locator('main').textContent())!;
    for (const label of [siteText.basedIn, siteText.email, siteText.website]) expect(main).not.toContain(label);
    const empty = await page.locator('main').evaluate((element) =>
      [...element.querySelectorAll('*')]
        .filter((child) => !child.closest('svg') && !child.querySelector('svg') && (child.textContent ?? '').trim() === '')
        .map((child) => child.outerHTML),
    );
    expect(empty).toEqual([]);
  });

  test('every fixture renders no empty element in main', async () => {
    for (const name of ['no-summary', 'no-url-no-dates', 'entry-without-heading', 'partial-dates', 'every-field'] as const) {
      const page = await openHtml(renderFixtureHtml(fixture(name)));
      const empty = await page.locator('main').evaluate((element) =>
        [...element.querySelectorAll('*')].filter((child) => !child.closest('svg') && !child.querySelector('svg') && (child.textContent ?? '').trim() === '').map((child) => child.outerHTML),
      );
      expect(empty, name).toEqual([]);
    }
  });
});

describe('004-cv-page-FR-007: every character of the CV document is shown exactly as written', () => {
  test('Politehnica University of Timișoara appears exactly, in NFC (US1 scenario 10)', async () => {
    const name = 'Politehnica University of Timișoara'.normalize('NFC');
    expect(realHtml()).toContain(name);
    const page = await openHtml(realHtml());
    expect(await page.locator('main').textContent()).toContain(name);
  });

  test('every string of non-ascii.json appears exactly', async () => {
    const cv = fixture('non-ascii');
    const html = renderFixtureHtml(cv);
    const page = await openHtml(html);
    const main = (await page.locator('main').textContent())!;
    const shown = strings(cv).filter((value) => value !== cv.basics?.location?.countryCode && !/^\d{4}(-\d{2}){0,2}$/.test(value));
    for (const value of shown) {
      expect(main, value).toContain(value.normalize('NFC'));
      expect(html, value).toContain(value.normalize('NFC'));
    }
  });

  test('a CV string that looks like HTML is shown as text, never parsed', async () => {
    const cv = fixture('nothing-optional');
    cv.basics = { ...cv.basics, summary: '<b>x</b> & <script>y</script>' };
    const page = await openHtml(renderFixtureHtml(cv));
    expect(await page.locator('main b, main script').count()).toBe(0);
    expect(await page.locator('main .summary').textContent()).toBe('<b>x</b> & <script>y</script>');
  });
});
