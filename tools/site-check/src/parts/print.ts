// The print part (research R18, FR-032 to FR-035): Chromium prints the page
// to PDF on A4 and US Letter with backgrounds off, and PDF.js reads each
// page's text with positions. No text may reach past the page, no site
// element may print, every external link's address must print, an address
// must not print twice, no page may end on a heading, and in print every
// text color needs 4.5:1 against white.
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Page } from 'playwright';
import type { Problem } from '../report.ts';
import { contrast } from './keyboard.ts';

export const PAPER_SIZES = ['A4', 'Letter'] as const;

export type PaperSize = (typeof PAPER_SIZES)[number];

// One piece of text on a PDF page, in points from the page's bottom left
// corner: `x` and `y` are where its baseline starts.
export type PdfItem = { str: string; x: number; y: number; width: number; height: number };

// A PDF page: its size in points, its text items in reading order, and its
// lines from top to bottom, each the items on one baseline joined left to
// right with white space collapsed.
export type PdfPage = { number: number; width: number; height: number; items: PdfItem[]; lines: string[] };

// Items whose baselines are this close share a line.
const SAME_LINE_PT = 2;

function linesOf(items: readonly PdfItem[]): string[] {
  const lines: { y: number; items: PdfItem[] }[] = [];
  for (const item of items) {
    if (item.str.trim() === '') continue;
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) < SAME_LINE_PT);
    if (line === undefined) lines.push({ y: item.y, items: [item] });
    else line.items.push(item);
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => {
      const sorted = [...line.items].sort((a, b) => a.x - b.x);
      let text = '';
      let end = Number.NEGATIVE_INFINITY;
      for (const item of sorted) {
        text += item.x > end + 1 && text !== '' ? ` ${item.str}` : item.str;
        end = item.x + item.width;
      }
      return text.replace(/\s+/g, ' ').trim();
    })
    .filter((line) => line !== '');
}

// Every page's text, read with PDF.js's legacy build for Node.
export async function pdfText(buffer: Uint8Array): Promise<PdfPage[]> {
  const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 });
  const document = await task.promise;
  try {
    const pages: PdfPage[] = [];
    for (let number = 1; number <= document.numPages; number += 1) {
      const page = await document.getPage(number);
      const { width, height } = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.flatMap((item) =>
        'str' in item ? [{ str: item.str, x: item.transform[4] as number, y: item.transform[5] as number, width: item.width, height: item.height }] : [],
      );
      pages.push({ number, width, height, items, lines: linesOf(items) });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}

const compact = (text: string) => text.replace(/\s+/g, '');

function occurrences(haystack: string, needle: string): number {
  if (needle === '') return 0;
  let count = 0;
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length)) count += 1;
  return count;
}

const quote = (text: string, max = 60) => JSON.stringify(text.length > max ? `${text.slice(0, max - 1)}…` : text);

type PageFacts = {
  siteElements: { selector: string; text: string }[];
  links: { text: string; href: string }[];
  headings: { tag: string; text: string }[];
  colors: { selector: string; color: string }[];
};

// What the page holds, read in print emulation.
function pageFacts(page: Page): Promise<PageFacts> {
  return page.evaluate(() => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const text = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    const siteElement = 'footer, [data-site-element]';
    const colors: { selector: string; color: string }[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      if (!ownText) continue;
      const box = element.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1 || getComputedStyle(element).visibility === 'hidden') continue;
      colors.push({ selector: describe(element), color: getComputedStyle(element).color });
    }
    return {
      siteElements: [...document.querySelectorAll(siteElement)].map((element) => ({ selector: describe(element), text: text(element) })),
      links: [...document.querySelectorAll('a[href]')].filter((link) => link.closest(siteElement) === null).map((link) => ({ text: text(link), href: link.getAttribute('href') ?? '' })),
      headings: [...document.querySelectorAll('main h2, main h3')].map((heading) => ({ tag: heading.tagName.toLowerCase(), text: text(heading) })),
      colors,
    };
  });
}

// A computed color as RGB on white, its alpha blended in.
function onWhite(color: string): [number, number, number] | null {
  const match = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/.exec(color);
  if (match === null) return null;
  const alphaText = match[4];
  const alpha = alphaText === undefined ? 1 : alphaText.endsWith('%') ? Number.parseFloat(alphaText) / 100 : Number.parseFloat(alphaText);
  const blend = (channel: string) => Math.round(Number.parseFloat(channel) * alpha + 255 * (1 - alpha));
  return [blend(match[1]!), blend(match[2]!), blend(match[3]!)];
}

// Whether the last lines of a page are a heading: the heading's text taking
// the last one to three lines, possibly after its section number.
function endingHeading(lines: readonly string[], headings: PageFacts['headings']): PageFacts['headings'][number] | undefined {
  for (let count = 1; count <= Math.min(3, lines.length); count += 1) {
    const tail = lines.slice(-count).join(' ');
    const heading = headings.find(({ text }) => text !== '' && (tail === text || new RegExp(`^\\d+ ${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(tail)));
    if (heading !== undefined) return heading;
  }
  return undefined;
}

export async function printProblems(page: Page, pageLabel: string, paper: PaperSize): Promise<Problem[]> {
  const problems: Problem[] = [];
  const problem = (type: string, subject: string, detail: string) => problems.push({ part: 'print', page: pageLabel, variant: paper, type, subject, detail });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const facts = await pageFacts(page);
  const pages = await pdfText(await page.pdf({ format: paper, printBackground: false }));
  const allText = compact(pages.flatMap((pdfPage) => pdfPage.items.map((item) => item.str)).join(''));

  // Text cut off at the page's edges.
  for (const pdfPage of pages) {
    for (const item of pdfPage.items) {
      if (item.str.trim() === '') continue;
      const outside = item.x < -0.5 || item.x + item.width > pdfPage.width + 0.5 || item.y < -0.5 || item.y + item.height > pdfPage.height + 0.5;
      if (outside) problem('text-cut-off', quote(item.str.trim()), `reaches past the edge of page ${pdfPage.number}`);
    }
  }

  // Site elements printed.
  for (const { selector, text } of facts.siteElements) {
    if (text !== '' && allText.includes(compact(text))) problem('site-element-printed', selector, `${quote(text)} is printed`);
  }

  // Addresses: each external link's must print, and no address more often
  // than the links holding it.
  const linkCount = new Map<string, number>();
  for (const link of facts.links) {
    const address = link.href.startsWith('mailto:') ? link.href.slice('mailto:'.length) : link.href;
    linkCount.set(address, (linkCount.get(address) ?? 0) + 1);
  }
  const reported = new Set<string>();
  for (const link of facts.links) {
    const external = /^https?:\/\//.test(link.href);
    const address = link.href.startsWith('mailto:') ? link.href.slice('mailto:'.length) : link.href;
    if (!external && !link.href.startsWith('mailto:')) continue;
    const printed = occurrences(allText, compact(address));
    if (external && printed === 0) problem('missing-address', `a ${quote(link.text)}`, `${address} is not printed`);
    if (printed > linkCount.get(address)! && !reported.has(address)) {
      reported.add(address);
      problem('address-twice', `a ${quote(link.text)}`, `${address} is printed ${printed} times`);
    }
  }

  // A heading on the last line of a page, the last page aside.
  for (const pdfPage of pages.slice(0, -1)) {
    const heading = endingHeading(pdfPage.lines, facts.headings);
    if (heading !== undefined) problem('heading-at-page-end', `${heading.tag} ${quote(heading.text)}`, `last line of page ${pdfPage.number}`);
  }

  // Text colors in print, against white.
  const seen = new Set<string>();
  for (const { selector, color } of facts.colors) {
    const rgb = onWhite(color);
    if (rgb === null) continue;
    const ratio = contrast(rgb, [255, 255, 255]);
    if (ratio >= 4.5 || seen.has(selector)) continue;
    seen.add(selector);
    problem('low-contrast', selector, `text color ${color} has ${ratio.toFixed(2)}:1 against white in print, 4.5:1 expected`);
  }
  return problems;
}
