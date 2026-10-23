// Printing /cv on A4 and US Letter (research R9, R18): Chromium prints the
// page to PDF with backgrounds off, and the print part's `pdfText` reads
// each page's text with positions.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { tokenValue } from '@cv/tokens';
import { contrast } from '../../../tools/site-check/src/parts/keyboard.ts';
import { isOneColumn } from '../../../tools/site-check/src/parts/layout.ts';
import { PAPER_SIZES, pdfText, printProblems } from '../../../tools/site-check/src/parts/print.ts';
import type { PaperSize, PdfPage } from '../../../tools/site-check/src/parts/print.ts';
import { openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 600_000 });

const compact = (text: string) => text.replace(/\s+/g, '');

// The page printed on `paper`, backgrounds off, once its fonts are ready.
async function printed(page: Page, paper: PaperSize): Promise<PdfPage[]> {
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return pdfText(await page.pdf({ format: paper, printBackground: false }));
}

const allText = (pages: readonly PdfPage[]) => compact(pages.flatMap((pdfPage) => pdfPage.items.map((item) => item.str)).join(''));

function occurrences(haystack: string, needle: string): number {
  let count = 0;
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length)) count += 1;
  return count;
}

// Text items reaching past their page's box.
const outside = (pages: readonly PdfPage[]) =>
  pages.flatMap((pdfPage) =>
    pdfPage.items
      .filter((item) => item.str.trim() !== '')
      .filter((item) => item.x < -0.5 || item.x + item.width > pdfPage.width + 0.5 || item.y < -0.5 || item.y + item.height > pdfPage.height + 0.5)
      .map((item) => `page ${pdfPage.number}: ${item.str}`),
  );

// The external links outside site elements, with their visible text: what
// a reader sees, without visually hidden text or the arrow.
function externalLinks(page: Page): Promise<{ text: string; href: string }[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('a[href^="http"]')]
      .filter((link) => link.closest('footer, [data-site-element]') === null)
      .map((link) => {
        const copy = link.cloneNode(true) as Element;
        for (const hidden of copy.querySelectorAll('.visually-hidden, svg')) hidden.remove();
        return { text: (copy.textContent ?? '').replace(/\s+/g, ' ').trim(), href: link.getAttribute('href') ?? '' };
      }),
  );
}

// Each link whose text isn't its address must be followed by it in print.
async function missingAddresses(page: Page, pages: readonly PdfPage[]): Promise<string[]> {
  const text = allText(pages);
  return (await externalLinks(page)).filter(({ text: shown, href }) => shown !== href && !text.includes(compact(`${shown} (${href})`))).map(({ href }) => href);
}

describe('004-cv-page-FR-032: printing gives the whole CV and nothing else, with nothing cut off', () => {
  test.each(PAPER_SIZES)('on %s the footer is left out, every heading is printed and no text leaves the page (US3 scenarios 1 and 6)', async (paper) => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const footer = compact((await page.locator('footer').textContent()) ?? '');
    const headings = await page.locator('main :is(h1, h2, h3)').allTextContents();
    const pages = await printed(page, paper);
    const text = allText(pages);
    expect(footer).not.toBe('');
    expect(text).not.toContain(footer);
    expect(headings.length).toBeGreaterThan(0);
    for (const heading of headings) expect(text, heading).toContain(compact(heading));
    expect(outside(pages)).toEqual([]);
  });

  test('the print part finds no problem on the real CV, on either paper size', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    for (const paper of PAPER_SIZES) expect(await printProblems(page, '/cv', paper), paper).toEqual([]);
  });

  test('print is one column at any paper width, even wider than breakpoint.wide', async () => {
    const { url } = await serveBuilt();
    const wide = Number.parseFloat(tokenValue('breakpoint.wide'));
    const page = await openPage(`${url}/cv`, { width: wide + 400, media: 'print' });
    expect(await isOneColumn(page, '/cv', 'print')).toEqual([]);
  });

  test('the built style sheets have no @page rule, so the page adds no header, footer or page number (US3 scenario 7)', () => {
    const { dir } = builtSite();
    const sheets = fs.readdirSync(path.join(dir, 'assets')).filter((file) => file.endsWith('.css'));
    expect(sheets.length).toBeGreaterThan(0);
    for (const sheet of sheets) expect(fs.readFileSync(path.join(dir, 'assets', sheet), 'utf8'), sheet).not.toMatch(/@page/i);
  });
});

describe('004-cv-page-FR-033: in print, every link shows its address unless its text is the address', () => {
  test.each(PAPER_SIZES)('on %s the GitHub address is printed after its link and the email address once (US3 scenarios 2 and 3)', async (paper) => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const github = resume.basics?.profiles?.find((profile) => profile.network === 'GitHub')?.url;
    const email = resume.basics?.email;
    expect(github).toBe('https://github.com/alex-profir');
    expect(email).toBeTruthy();
    const pages = await printed(page, paper);
    const text = allText(pages);
    expect(text).toContain(compact(github!));
    expect(occurrences(text, compact(email!))).toBe(1);
    expect(await missingAddresses(page, pages)).toEqual([]);
  });

  test('every external link of a CV with every field, including the website and entry links, is followed by its address', async () => {
    const { url } = await serveFixture(fixture('every-field'));
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const links = await externalLinks(page);
    expect(links.length).toBeGreaterThan(3);
    for (const paper of PAPER_SIZES) {
      const pages = await printed(page, paper);
      expect(await missingAddresses(page, pages), paper).toEqual([]);
      const text = allText(pages);
      for (const { href } of links) expect(occurrences(text, compact(`(${href})`)), href).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('004-cv-page-FR-034: in print, no section or entry heading is the last line of a page', () => {
  // Turns the print rules that keep headings with what follows off, to show
  // that the sweep below does put headings on a page's last line.
  const WITHOUT_BREAK_RULES = '@media print { * { break-after: auto !important; break-inside: auto !important; } }';

  test('with a spacer before Projects stepped one line at a time across a page, no page ends on a heading (US3 scenario 4)', async () => {
    const cv = fixture('print-spacer');
    // One line of body text, as printed.
    const first = await serveFixture(cv);
    const lineHeight = await (await openPage(`${first.url}/cv`, { width: 1440, media: 'print' })).evaluate(() => Number.parseFloat(getComputedStyle(document.body).lineHeight));
    expect(lineHeight).toBeGreaterThan(0);
    // An A4 page, the taller of the two, in CSS pixels: 297 mm at 96 px per inch.
    const pageHeight = (297 / 25.4) * 96;
    const endings: string[] = [];
    let endingsWithoutRules = 0;
    for (let height = 0; height <= pageHeight; height += lineHeight) {
      const spacer = Math.round(height);
      const { url } = await serveFixture(cv, undefined, { spacerBefore: 'projects', height: spacer });
      const page = await openPage(`${url}/cv`, { width: 1440 });
      for (const paper of PAPER_SIZES) {
        const problems = await printProblems(page, '/cv', paper);
        for (const problem of problems) if (problem.type === 'heading-at-page-end') endings.push(`${spacer}px ${paper}: ${problem.subject} ${problem.detail}`);
      }
      await page.addStyleTag({ content: WITHOUT_BREAK_RULES });
      for (const paper of PAPER_SIZES) {
        const problems = await printProblems(page, '/cv', paper);
        if (problems.some((problem) => problem.type === 'heading-at-page-end')) endingsWithoutRules += 1;
      }
      await page.context().close();
    }
    expect(endings).toEqual([]);
    expect(endingsWithoutRules).toBeGreaterThan(0);
  });
});

describe('004-cv-page-FR-035: in print, text is legible with backgrounds off and nothing relies on a background', () => {
  test('every text color has 4.5:1 or more against white in print (US3 scenario 5)', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440, media: 'print' });
    const colors = await page.evaluate(() =>
      [...document.body.querySelectorAll('*')]
        .filter((element) => [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''))
        .filter((element) => getComputedStyle(element).display !== 'none' && element.closest('.visually-hidden') === null)
        .map((element) => ({ element: `${element.tagName.toLowerCase()}.${element.className}`, color: getComputedStyle(element).color })),
    );
    expect(colors.length).toBeGreaterThan(0);
    const low = colors.filter(({ color }) => {
      const [r = 0, g = 0, b = 0, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
      const blend = (channel: number) => channel * a + 255 * (1 - a);
      return contrast([blend(r), blend(g), blend(b)], [255, 255, 255]) < 4.5;
    });
    expect(low).toEqual([]);
  });

  test('no element or pseudo-element has a background color or image in print, so the background option changes nothing', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440, media: 'print' });
    const backgrounds = await page.evaluate(() => {
      const found: string[] = [];
      for (const element of [document.documentElement, ...document.documentElement.querySelectorAll('*')]) {
        for (const pseudo of [null, '::before', '::after']) {
          const style = getComputedStyle(element, pseudo);
          if (pseudo !== null && style.content === 'none') continue;
          const transparent = style.backgroundColor === 'transparent' || /rgba\(.*,\s*0\)$/.test(style.backgroundColor);
          if (!transparent || style.backgroundImage !== 'none') found.push(`${element.tagName.toLowerCase()}.${element.className}${pseudo ?? ''}: ${style.backgroundColor} ${style.backgroundImage}`);
        }
      }
      return found;
    });
    expect(backgrounds).toEqual([]);
  });

  test('no style sheet asks the browser to print backgrounds', () => {
    const { dir } = builtSite();
    for (const sheet of fs.readdirSync(path.join(dir, 'assets')).filter((file) => file.endsWith('.css'))) {
      expect(fs.readFileSync(path.join(dir, 'assets', sheet), 'utf8'), sheet).not.toMatch(/print-color-adjust/i);
    }
  });
});
