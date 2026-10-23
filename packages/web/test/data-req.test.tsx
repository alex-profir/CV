// Every element that implements a requirement carries exactly the IDs of its
// row in contracts/page.md's data-req targets table, and nothing else does.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { openHtml } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, renderFixtureHtml } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

const ids = (...numbers: number[]) =>
  numbers
    .map((number) => `004-cv-page-FR-${String(number).padStart(3, '0')}`)
    .sort()
    .join(' ');

// The table's rows, as selectors on the rendered pages. A section is a text
// container with CV text too, so it carries both rows.
const CV_TARGETS: [string, string][] = [
  ['main', ids(1, 14, 25, 27)],
  ['main > section', ids(2, 4, 24, 26, 3, 7, 22)],
  ['main > div.intro', ids(3, 7, 22)],
  ['h1', ids(23)],
  ['p.date', ids(9, 10, 11)],
  ['dl.contact dd.location', ids(8)],
  ['main a[href]', ids(12, 13, 29)],
  ['body > footer', ids(25, 32)],
];

const NOT_FOUND_TARGETS: [string, string][] = [
  ['main', ids(19)],
  ['body > footer', ids(25, 32)],
];

async function check(html: string, targets: [string, string][]) {
  const page = await openHtml(html);
  const found = await page.evaluate(() =>
    [...document.querySelectorAll('[data-req]')].map((element) => ({
      html: element.outerHTML.slice(0, 80),
      value: (element.getAttribute('data-req') ?? '').split(/\s+/).sort().join(' '),
    })),
  );
  const marked = new Set<number>();
  for (const [selector, expected] of targets) {
    const indexes = await page.evaluate((query) => {
      const all = [...document.querySelectorAll('[data-req]')];
      return [...document.querySelectorAll(query)].map((element) => all.indexOf(element));
    }, selector);
    expect(indexes.length, selector).toBeGreaterThan(0);
    for (const index of indexes) {
      expect(index, `${selector} has no data-req`).toBeGreaterThanOrEqual(0);
      expect(found[index]!.value, selector).toBe(expected);
      marked.add(index);
    }
  }
  const unexpected = found.filter((_, index) => !marked.has(index)).map((entry) => entry.html);
  expect(unexpected).toEqual([]);
}

describe('004-cv-page-FR-047: every element implementing a requirement carries its requirement IDs', () => {
  test('/cv with every-field.json carries the IDs of every row, and no other element carries any', async () => {
    await check(renderFixtureHtml(fixture('every-field')), CV_TARGETS);
  });

  test('the built /cv and not-found page carry the IDs of their rows', async () => {
    const { dir } = builtSite();
    await check(fs.readFileSync(path.join(dir, 'cv.html'), 'utf8'), CV_TARGETS);
    await check(fs.readFileSync(path.join(dir, '404.html'), 'utf8'), NOT_FOUND_TARGETS);
  });
});
