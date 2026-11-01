// The title, description and link-preview tags each page declares (spec US5,
// research R10, data-model.md Page title and description, contracts/page.md
// Document). Read from the rendered HTML in Chromium, so entities are decoded
// as a browser or a link preview reads them.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import type { Resume, ResumeBasics } from '@cv/content';
import { openHtml } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, renderFixtureHtml } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

const builtHtml = (file: string) => fs.readFileSync(path.join(builtSite().dir, file), 'utf8');

type Head = {
  titles: string[];
  description: (string | null)[];
  ogTitle: (string | null)[];
  ogDescription: (string | null)[];
  ogType: (string | null)[];
  twitterCard: (string | null)[];
  ogImage: number;
  ogUrl: number;
  canonical: number;
  emptyContent: string[];
};

// What a link preview reads from a page's head.
async function readHead(html: string): Promise<Head> {
  const page = await openHtml(html);
  return page.evaluate(() => {
    const contents = (selector: string) => [...document.head.querySelectorAll(selector)].map((element) => element.getAttribute('content'));
    const count = (selector: string) => document.querySelectorAll(selector).length;
    return {
      titles: [...document.querySelectorAll('title')].map((element) => element.textContent ?? ''),
      description: contents('meta[name="description"]'),
      ogTitle: contents('meta[property="og:title"]'),
      ogDescription: contents('meta[property="og:description"]'),
      ogType: contents('meta[property="og:type"]'),
      twitterCard: contents('meta[name="twitter:card"]'),
      ogImage: count('meta[property^="og:image"], meta[name^="twitter:image"]'),
      ogUrl: count('meta[property="og:url"]'),
      canonical: count('link[rel~="canonical"]'),
      emptyContent: [...document.querySelectorAll('meta[content]')].filter((element) => (element.getAttribute('content') ?? '').trim() === '').map((element) => element.outerHTML),
    };
  });
}

// A copy of a fixture CV with its basics replaced.
function withBasics(cv: Resume, basics: ResumeBasics): Resume {
  return { ...cv, basics };
}

// Every row of data-model.md's Page title and description table, with and
// without a summary, from the made-up basics of `every-field.json`.
const FULL = fixture('every-field').basics!;
const NAME = FULL.name!;
const LABEL = FULL.label!;
const SUMMARY = FULL.summary!;

describe("004-cv-page-FR-036: the title holds the name and role, the description is the summary, and previews use the same", () => {
  test('the real /cv: title and og:title are the name and role, description and og:description the summary (US5 scenarios 1 and 3)', async () => {
    const head = await readHead(builtHtml('cv.html'));
    expect(head.titles).toEqual(['Alex Profir — Senior Software Engineer']);
    expect(head.ogTitle).toEqual(['Alex Profir — Senior Software Engineer']);
    expect(head.description).toEqual([resume.basics!.summary]);
    expect(head.ogDescription).toEqual([resume.basics!.summary]);
  });

  test('the real /cv declares og:type website and twitter:card summary, and no image, address or canonical link', async () => {
    const head = await readHead(builtHtml('cv.html'));
    expect(head.ogType).toEqual(['website']);
    expect(head.twitterCard).toEqual(['summary']);
    expect(head.ogImage).toBe(0);
    expect(head.ogUrl).toBe(0);
    expect(head.canonical).toBe(0);
    expect(head.emptyContent).toEqual([]);
  });

  test('changing the role in the CV document changes the title and the preview title, with no other edit (US5 scenario 2)', async () => {
    const changed = structuredClone(resume) as Resume;
    changed.basics = { ...changed.basics, label: 'Principal Fixture Engineer' };
    const head = await readHead(renderFixtureHtml(changed));
    expect(head.titles).toEqual(['Alex Profir — Principal Fixture Engineer']);
    expect(head.ogTitle).toEqual(['Alex Profir — Principal Fixture Engineer']);
    expect(head.description).toEqual([resume.basics!.summary]);
  });
});

describe('004-cv-page-FR-037: a missing name, role or summary falls back to what is present, and nothing empty is declared', () => {
  const rows: { name: string; basics: ResumeBasics; title: string; description: string | undefined }[] = [
    { name: 'name and label, with a summary', basics: { name: NAME, label: LABEL, summary: SUMMARY }, title: `${NAME} — ${LABEL}`, description: SUMMARY },
    { name: 'name and label, no summary: the label is the description (US5 scenario 4)', basics: { name: NAME, label: LABEL }, title: `${NAME} — ${LABEL}`, description: LABEL },
    { name: 'name only, with a summary', basics: { name: NAME, summary: SUMMARY }, title: NAME, description: SUMMARY },
    { name: 'name only, no summary: no description', basics: { name: NAME }, title: NAME, description: undefined },
    { name: 'label only, with a summary: the label is the title', basics: { label: LABEL, summary: SUMMARY }, title: LABEL, description: SUMMARY },
    { name: 'label only, no summary: the label is the title and the description', basics: { label: LABEL }, title: LABEL, description: LABEL },
    { name: 'neither, with a summary: the site heading is the title', basics: { summary: SUMMARY }, title: 'CV', description: SUMMARY },
    { name: 'neither, no summary: the site heading is the title and no description', basics: {}, title: 'CV', description: undefined },
    { name: 'empty strings count as missing', basics: { name: '', label: '', summary: '' }, title: 'CV', description: undefined },
    { name: 'an empty summary falls back to the label', basics: { name: NAME, label: LABEL, summary: '' }, title: `${NAME} — ${LABEL}`, description: LABEL },
  ];

  for (const row of rows) {
    test(row.name, async () => {
      const head = await readHead(renderFixtureHtml(withBasics(fixture('every-field'), row.basics)));
      expect(head.titles).toEqual([row.title]);
      expect(head.ogTitle).toEqual([row.title]);
      const expected = row.description === undefined ? [] : [row.description];
      expect(head.description).toEqual(expected);
      expect(head.ogDescription).toEqual(expected);
      expect(head.emptyContent).toEqual([]);
    });
  }

  test('no basics at all: the site heading is the title and no description', async () => {
    const cv = fixture('every-field');
    delete cv.basics;
    const head = await readHead(renderFixtureHtml(cv));
    expect(head.titles).toEqual(['CV']);
    expect(head.description).toEqual([]);
    expect(head.ogDescription).toEqual([]);
  });

  test('the no-name and no-summary fixtures follow the table', async () => {
    const noName = await readHead(renderFixtureHtml(fixture('no-name')));
    expect(noName.titles).toEqual(['Nameless Label']);
    expect(noName.description).toEqual(['A CV document with no name.']);
    const noSummary = await readHead(renderFixtureHtml(fixture('no-summary')));
    expect(noSummary.titles).toEqual(['No Summary Person — No Summary Label']);
    expect(noSummary.description).toEqual(['No Summary Label']);
  });

  test('the not-found page is titled 404 · Not found, with the same preview title and no description', async () => {
    const head = await readHead(builtHtml('404.html'));
    expect(head.titles).toEqual(['404 · Not found']);
    expect(head.ogTitle).toEqual(['404 · Not found']);
    expect(head.description).toEqual([]);
    expect(head.ogDescription).toEqual([]);
    expect(head.ogType).toEqual(['website']);
    expect(head.twitterCard).toEqual(['summary']);
    expect(head.ogImage + head.ogUrl + head.canonical).toBe(0);
    expect(head.emptyContent).toEqual([]);
  });
});
