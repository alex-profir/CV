// The pdf part (011 research R12, contracts/site.md): the built `/cv.pdf`,
// read once with PDF.js, holds every text field of the CV document in order
// and a link for every address, no site element, A4 pages with nothing in
// the margins and no page ending on a heading, its title, author and
// language, a tagged structure with /cv's headings, the design's fonts
// embedded, and at most 1,000,000 bytes. Its headers say it's a PDF to
// revalidate. The part measures the PDF /cv links to: a page with no
// download link and a manifest without the file (004's fixture sites) leave
// nothing to measure.
import { OPS, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { Page } from 'playwright';
import { CV_PDF, CV_PDF_MARGIN_INCHES } from '../../../../packages/web/src/routes.ts';
import type { ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { fieldProblems } from './no-script.ts';
import { compact, headingsAtPageEnd, pdfText, quote } from './print.ts';
import type { PageHeading } from './print.ts';

// A4 in points, as Chromium writes it, and how far a page may be off.
const A4 = { width: 595.92, height: 842.88 };

const PAGE_TOLERANCE_PT = 0.5;

const MARGIN_PT = CV_PDF_MARGIN_INCHES * 72;

// How far into the margin text may reach, for rounding in the PDF's widths.
// Top and bottom are measured at the baseline: an item's height is its font
// size, more than its glyphs reach above it.
const MARGIN_TOLERANCE_PT = 0.5;

const MAX_BYTES = 1_000_000;

export type PdfInput = {
  // The served site's address, without a trailing slash.
  url: string;
  fields: readonly ExpectedField[];
  // The CV document's name, or undefined when it has none.
  author: string | undefined;
  // The design's font families, from the font tokens.
  families: readonly string[];
  // Whether the site manifest lists `/cv.pdf`.
  listed: boolean;
};

type PageFacts = {
  title: string;
  linked: boolean;
  siteElements: { selector: string; text: string }[];
  // `main`'s h1, h2 and h3 levels, in order.
  levels: number[];
  headings: PageHeading[];
};

// What /cv holds, read from the served page.
function pageFacts(page: Page, pdfPath: string): Promise<PageFacts> {
  return page.evaluate((pdf) => {
    const describe = (element: Element) => {
      const classes = typeof element.className === 'string' && element.className.trim() !== '' ? `.${element.className.trim().split(/\s+/).join('.')}` : '';
      return `${element.tagName.toLowerCase()}${classes}`;
    };
    const text = (element: Element) => (element.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      title: document.title,
      linked: document.querySelector(`a[href="${pdf}"]`) !== null,
      siteElements: [...document.querySelectorAll('footer, [data-site-element]')].map((element) => ({ selector: describe(element), text: text(element) })),
      levels: [...document.querySelectorAll('main h1, main h2, main h3')].map((heading) => Number(heading.tagName.slice(1))),
      headings: [...document.querySelectorAll('main h2, main h3')].map((heading) => ({ tag: heading.tagName.toLowerCase(), text: text(heading) })),
    };
  }, pdfPath);
}

// A number of points as the details write it: at most two decimals.
const points = (value: number) => String(Math.round(value * 100) / 100);

// A count with thousands separators, the same in every locale.
const grouped = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

// A font's name without its subset tag, as in `ABCDEF+SpaceGrotesk-Medium`.
const fontName = (name: string) => name.replace(/^[A-Z]{6}\+/, '');

// The heading levels in a page's structure tree, counting only headings
// whose content is on that page: PDF.js repeats an earlier page's elements
// in a later page's tree, without their content.
async function structureLevels(page: PDFPageProxy): Promise<number[]> {
  const tree = await page.getStructTree();
  if (tree === null) return [];
  const content = await page.getTextContent({ includeMarkedContent: true });
  const onPage = new Set(content.items.flatMap((item) => ('type' in item && item.type === 'beginMarkedContentProps' && typeof item.id === 'string' ? [item.id] : [])));
  type Node = { role?: string; type?: string; id?: string; children?: Node[] };
  const levels: number[] = [];
  const holds = (node: Node): boolean => (node.type === 'content' && node.id !== undefined && onPage.has(node.id)) || (node.children ?? []).some(holds);
  const walk = (node: Node) => {
    const level = /^H([1-6])$/.exec(node.role ?? '');
    if (level !== null && holds(node)) levels.push(Number(level[1]));
    for (const child of node.children ?? []) walk(child);
  };
  walk(tree as Node);
  return levels;
}

// The names of the fonts a page uses, and whether each is embedded.
async function pageFonts(page: PDFPageProxy): Promise<Map<string, boolean>> {
  const operators = await page.getOperatorList();
  const fonts = new Map<string, boolean>();
  operators.fnArray.forEach((fn, index) => {
    if (fn !== OPS.setFont) return;
    const font = page.commonObjs.get(operators.argsArray[index][0]) as { name?: string; missingFile?: boolean };
    if (typeof font.name === 'string') fonts.set(fontName(font.name), font.missingFile !== true);
  });
  return fonts;
}

export async function pdfProblems(page: Page, input: PdfInput): Promise<Problem[]> {
  const problems: Problem[] = [];
  const problem = (type: string, subject: string, detail: string) => problems.push({ part: 'pdf', page: CV_PDF.path, variant: '-', type, subject, detail });
  const facts = await pageFacts(page, CV_PDF.path);
  if (!facts.linked && !input.listed) return problems;

  // Headers. Without a PDF, nothing else can be measured.
  const response = await fetch(`${input.url}${CV_PDF.path}`);
  const headers: [string, string][] = [
    ['Content-Type', 'application/pdf'],
    ['Cache-Control', 'no-cache'],
  ];
  for (const [name, expected] of headers) {
    const value = response.headers.get(name);
    if (value !== expected) problem('pdf-header', name, `${value === null ? 'is missing' : `is ${JSON.stringify(value)}`}, expected ${JSON.stringify(expected)}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!response.ok) return problems;

  if (bytes.length > MAX_BYTES) problem('pdf-too-large', CV_PDF.path, `${grouped(bytes.length)} bytes, over the ${grouped(MAX_BYTES)}-byte limit`);

  // Text: every field in order, and no site element.
  const pages = await pdfText(bytes);
  const allText = compact(pages.flatMap((pdfPage) => pdfPage.items.map((item) => item.str)).join(''));
  // Reading order: each page's lines, top to bottom and left to right. The
  // items' own order is the order Chromium painted them, not the page's.
  const readingText = compact(pages.flatMap((pdfPage) => pdfPage.lines).join(''));
  const texts = input.fields.flatMap((field) => ('text' in field ? [field] : []));
  const original = new Map(texts.map((field) => [field.path, field.text]));
  for (const found of fieldProblems(readingText, texts.map((field) => ({ path: field.path, text: compact(field.text) })), '', 'the PDF')) {
    const detail = found.type === 'missing-field' ? `"${original.get(found.subject)}" is not in the PDF` : found.detail;
    problem(`pdf-${found.type}`, found.subject, detail);
  }
  for (const { selector, text } of facts.siteElements) {
    if (text !== '' && allText.includes(compact(text))) problem('pdf-site-element', selector, `${quote(text)} is in the PDF`);
  }

  // Pages: A4, nothing in the margins, no page ending on a heading.
  for (const pdfPage of pages) {
    const subject = `page ${pdfPage.number}`;
    if (Math.abs(pdfPage.width - A4.width) > PAGE_TOLERANCE_PT || Math.abs(pdfPage.height - A4.height) > PAGE_TOLERANCE_PT) {
      problem('pdf-not-a4', subject, `${points(pdfPage.width)} × ${points(pdfPage.height)} pt, expected A4 (${points(A4.width)} × ${points(A4.height)} pt)`);
    }
    const limit = MARGIN_PT - MARGIN_TOLERANCE_PT;
    for (const item of pdfPage.items) {
      if (item.str.trim() === '') continue;
      const edges: [string, number][] = [
        ['left', item.x],
        ['right', pdfPage.width - item.x - item.width],
        ['bottom', item.y],
        ['top', pdfPage.height - item.y],
      ];
      const inside = edges.find(([, distance]) => distance < limit);
      if (inside === undefined) continue;
      problem('pdf-margin', subject, `text at ${points(inside[1])} pt from the ${inside[0]} edge, inside the ${points(MARGIN_PT)} pt margin`);
      break;
    }
  }
  for (const { subject, detail } of headingsAtPageEnd(pages, facts.headings)) problem('pdf-heading-at-page-end', subject, detail);

  // Links, metadata, structure and fonts.
  const task = getDocument({ data: bytes, verbosity: 0 });
  const document = await task.promise;
  try {
    const { info } = (await document.getMetadata()) as { info: Record<string, unknown> };
    const metadata: [string, string | undefined][] = [
      ['Title', facts.title],
      ['Author', input.author],
      ['Language', 'en'],
    ];
    for (const [name, expected] of metadata) {
      const value = typeof info[name] === 'string' && info[name] !== '' ? (info[name] as string) : undefined;
      if (value === expected) continue;
      if (value === undefined) problem('pdf-metadata', name, `${name} is missing, expected ${JSON.stringify(expected)}`);
      else problem('pdf-metadata', name, `${name} is ${JSON.stringify(value)}, expected ${expected === undefined ? 'none' : JSON.stringify(expected)}`);
    }

    const links = new Set<string>();
    const levels: number[] = [];
    const fonts = new Map<string, boolean>();
    for (let number = 1; number <= document.numPages; number += 1) {
      const pdfPage = await document.getPage(number);
      for (const annotation of await pdfPage.getAnnotations()) {
        if (annotation.subtype === 'Link' && typeof annotation.url === 'string') links.add(annotation.url);
      }
      levels.push(...(await structureLevels(pdfPage)));
      for (const [name, embedded] of await pageFonts(pdfPage)) fonts.set(name, (fonts.get(name) ?? true) && embedded);
    }

    const address = (href: string) => URL.parse(href)?.href ?? href;
    const linked = new Set([...links].map(address));
    for (const field of input.fields) {
      if ('href' in field && !linked.has(address(field.href))) problem('pdf-missing-link', field.path, `${field.href} has no link in the PDF`);
    }

    const pagePath = new URL(page.url()).pathname;
    if (levels.length !== facts.levels.length) {
      problem('pdf-untagged', 'structure', `${levels.length} headings in the PDF's structure, ${facts.levels.length} on ${pagePath}`);
    } else {
      const at = levels.findIndex((level, index) => level !== facts.levels[index]);
      if (at >= 0) problem('pdf-untagged', 'structure', `heading ${at + 1} is h${levels[at]} in the PDF's structure, h${facts.levels[at]} on ${pagePath}`);
    }

    const families = input.families.map((family) => family.replace(/\s+/g, ''));
    for (const [name, embedded] of fonts) {
      if (!embedded) problem('pdf-font-not-embedded', name, 'is not embedded');
      if (!families.some((family) => name.startsWith(family))) problem('pdf-font-family', name, `is not one of ${input.families.join(', ')}`);
    }
  } finally {
    await task.destroy();
  }
  return problems;
}
