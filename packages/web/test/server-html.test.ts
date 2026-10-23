// What the server sends: the whole CV in the HTML, no control that needs a
// script, and nothing loaded from another site (contracts/page.md Document).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import type { Resume } from '@cv/content';
import { dateRange } from '../src/format/dates.ts';
import { locationLine } from '../src/format/location.ts';
import { siteText } from '../src/site-text.ts';
import { openHtml, openPage } from './helpers/browser.ts';
import { builtSite, serveBuilt } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

// Every shown field of a CV document as the page shows it, in page order.
// The no-script part's expectedFields (T068) replaces this list once it
// exists.
function shownFields(cv: Resume): string[] {
  const basics = cv.basics ?? {};
  const range = (entry: { startDate?: string; endDate?: string }) => dateRange(entry.startDate, entry.endDate)?.visible;
  const fields: (string | undefined)[] = [
    basics.label,
    basics.name,
    basics.summary,
    basics.location ? (locationLine(basics.location) ?? undefined) : undefined,
    basics.email,
    basics.url?.replace(/^https?:\/\//, ''),
    ...(basics.profiles ?? []).map((profile) => profile.username ?? profile.network),
    ...(cv.work ?? []).flatMap((work) => [range(work), work.position, work.name, work.location, work.summary, work.description, ...(work.highlights ?? [])]),
    ...(cv.projects ?? []).flatMap((project) => [
      range(project),
      project.name,
      project.entity,
      project.type,
      ...(project.roles ?? []),
      project.description,
      ...(project.highlights ?? []),
      ...(project.keywords ?? []),
    ]),
    ...(cv.skills ?? []).flatMap((skill) => [skill.name, skill.level, ...(skill.keywords ?? [])]),
    ...(cv.education ?? []).flatMap((entry) => [range(entry), [entry.studyType, entry.area].filter(Boolean).join(siteText.listSeparator), entry.institution, entry.score, ...(entry.courses ?? [])]),
    ...(cv.languages ?? []).flatMap((language) => [language.language, language.fluency]),
    ...(cv.interests ?? []).flatMap((interest) => [interest.name, ...(interest.keywords ?? [])]),
  ];
  return fields.filter((field): field is string => field !== undefined && field !== '');
}

const builtFiles = () => {
  const { dir, manifest } = builtSite();
  return manifest.files.map((file) => ({ ...file, text: fs.readFileSync(path.join(dir, file.path)).toString('utf8') }));
};

describe('004-cv-page-FR-014: the full content of /cv is in the page the server sends', () => {
  test('cv.html, loaded with scripting off, holds every shown field of the real CV in order', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440, javaScriptEnabled: false });
    const text = (await page.locator('body').textContent())!.replace(/\s+/g, ' ');
    let from = 0;
    const fields = shownFields(resume);
    expect(fields.length).toBeGreaterThan(100);
    for (const field of fields) {
      const at = text.indexOf(field.replace(/\s+/g, ' '), from);
      expect(at, `"${field}" is missing or out of order`).toBeGreaterThanOrEqual(0);
      from = at;
    }
    // The style sheet applied with no script running.
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });
});

describe('004-cv-page-FR-015: no page shows a control that needs a script', () => {
  test('neither page holds a button, a form control or a noscript element', async () => {
    for (const file of ['cv.html', '404.html']) {
      const page = await openHtml(fs.readFileSync(path.join(builtSite().dir, file), 'utf8'));
      expect(await page.locator('button, input, select, textarea, form, noscript, [contenteditable], [onclick]').count(), file).toBe(0);
    }
  });
});

describe('004-cv-page-FR-016: every page loads everything it uses from the site itself', () => {
  const local = (address: string) => (address.startsWith('/') && !address.startsWith('//')) || address.startsWith('data:');

  test('every src, resource href and CSS url() in the build is a path on the site or a data: address', () => {
    const files = builtFiles();
    let checked = 0;
    for (const file of files.filter((entry) => entry.type === 'text/html')) {
      for (const [tag] of file.text.matchAll(/<(?:link|script|img|source|iframe|video|audio|embed|object)\b[^>]*>/g)) {
        for (const [, address = ''] of tag.matchAll(/\b(?:src|href|srcset|data)="([^"]*)"/g)) {
          expect(local(address), `${file.path}: ${tag}`).toBe(true);
          checked += 1;
        }
      }
      expect(file.text, file.path).not.toMatch(/\bstyle="[^"]*url\(/);
    }
    for (const file of files.filter((entry) => entry.type === 'text/css')) {
      for (const [, raw = ''] of file.text.matchAll(/url\(\s*([^)]*?)\s*\)/g)) {
        const address = raw.replace(/^["']|["']$/g, '');
        expect(local(address), `${file.path}: url(${raw})`).toBe(true);
        checked += 1;
      }
      expect(file.text, file.path).not.toMatch(/@import\s/);
    }
    expect(checked).toBeGreaterThan(3);
  });
});
