// The build's PDF step (011 contracts/pdf.md, research R2 and R3): the built
// /cv, served from the site written so far, printed by Playwright's Chromium
// to `<siteDir>/cv.pdf`, before the service worker is written, so the PDF
// lands in its precache and version.
import fs from 'node:fs';
import path from 'node:path';
import type { Browser } from 'playwright';
import { launchChromium } from '../../../tools/site-check/src/browser.ts';
import { startServer } from '../../../tools/site-check/src/server.ts';
import type { RunningServer } from '../../../tools/site-check/src/server.ts';
import { CV_PDF, CV_PDF_MARGIN_INCHES } from '../src/routes.ts';
// A cycle with build-site.ts, which calls this module only from its build,
// after both modules have loaded.
import { siteManifest } from './build-site.ts';

const FAILED = "the CV PDF can't be made";

// Chromium's own print-to-PDF default margin (research R3). Playwright
// takes a plain number as CSS pixels, 96 to the inch.
const MARGIN = CV_PDF_MARGIN_INCHES * 96;

// How /cv is printed (contracts/pdf.md The PDF): A4, the margins, no header,
// footer or backgrounds, tagged with an outline.
export const PRINT_OPTIONS = {
  format: 'A4',
  margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
  printBackground: false,
  displayHeaderFooter: false,
  preferCSSPageSize: false,
  tagged: true,
  outline: true,
} as const;

// Prints the built /cv in `siteDir` to `<siteDir>/cv.pdf` and gives its size
// in bytes. `author` is the CV document's name, or undefined for none.
// Throws an Error naming the cause when it can't (FR-020), writing nothing.
export async function writeCvPdf(siteDir: string, author: string | undefined): Promise<number> {
  let server: RunningServer | undefined;
  let browser: Browser | undefined;
  try {
    server = await startServer({ siteDir, manifest: siteManifest(siteDir) });
    try {
      browser = await launchChromium();
    } catch (error) {
      const cause = (error instanceof Error ? error.message : String(error)).split('\n')[0]!.trim();
      throw new Error(`${FAILED}: Chromium didn't start (${cause}). Install it with npx playwright install chromium`);
    }
    // No worker: `sw.js` isn't written yet, and the page must come from the
    // files just built.
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const page = await context.newPage();
    const response = await page.goto(`${server.url}/cv`, { waitUntil: 'load' });
    const status = response?.status() ?? 0;
    if (status !== 200) throw new Error(`${FAILED}: /cv answered ${status}`);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const printed = await page.pdf(PRINT_OPTIONS);
    if (printed.length === 0 || printed.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`${FAILED}: Chromium gave an empty file`);
    const pdf = author === undefined ? printed : withAuthor(printed, author);
    fs.writeFileSync(path.join(siteDir, CV_PDF.file), pdf);
    return pdf.length;
  } finally {
    await browser?.close();
    await server?.close();
  }
}

// A PDF text string as Chromium writes its title: UTF-16BE in hex, after a
// byte order mark.
function utf16Hex(text: string): string {
  let hex = 'FEFF';
  for (let index = 0; index < text.length; index += 1) hex += text.charCodeAt(index).toString(16).toUpperCase().padStart(4, '0');
  return `<${hex}>`;
}

// The PDF with `/Author` added to its Info dictionary by an incremental
// update (research R4, FR-014): a new Info object holding the old entries
// and the author, a one-entry cross-reference section for it, and a trailer
// pointing at both, its `/Prev` the last cross-reference section. Skia
// writes a classic cross-reference table and no metadata stream, so readers
// take the author from the Info dictionary.
export function withAuthor(pdf: Buffer, author: string): Buffer {
  const text = pdf.toString('latin1');
  const startxref = text.lastIndexOf('startxref');
  const trailerAt = text.lastIndexOf('trailer', startxref);
  const prev = /^startxref\s+(\d+)/.exec(text.slice(startxref))?.[1];
  const trailer = /^trailer\s*<<([\s\S]*?)>>\s*$/.exec(text.slice(trailerAt, startxref))?.[1];
  const size = trailer === undefined ? undefined : /\/Size\s+(\d+)/.exec(trailer)?.[1];
  const info = trailer === undefined ? undefined : /\/Info\s+(\d+)\s+(\d+)\s+R/.exec(trailer);
  if (startxref < 0 || trailerAt < 0 || prev === undefined || trailer === undefined || size === undefined || info === null || info === undefined) {
    throw new Error(`${FAILED}: Chromium's file has no trailer with an Info dictionary`);
  }
  const infoObject = new RegExp(`(?:^|[\\r\\n])${info[1]} ${info[2]} obj\\s*<<([\\s\\S]*?)>>\\s*endobj`).exec(text);
  if (infoObject === null) throw new Error(`${FAILED}: Chromium's file has no Info object ${info[1]}`);
  const entries = infoObject[1]!.replace(/\/Author\s*(?:<[^>]*>|\((?:\\.|[^\\)])*\))/, '').trimEnd();
  const number = Number(size);
  const lead = text.endsWith('\n') ? '' : '\n';
  const objectAt = pdf.length + lead.length;
  const object = `${number} 0 obj\n<<${entries}\n/Author ${utf16Hex(author)}>>\nendobj\n`;
  const xrefAt = objectAt + Buffer.byteLength(object, 'latin1');
  const newTrailer = trailer
    .replace(/\/Size\s+\d+/, `/Size ${number + 1}`)
    .replace(/\/Info\s+\d+\s+\d+\s+R/, `/Info ${number} 0 R`)
    .replace(/\/Prev\s+\d+/, '')
    .trimEnd();
  const update = `${lead}${object}xref\n${number} 1\n${String(objectAt).padStart(10, '0')} 00000 n \ntrailer\n<<${newTrailer}\n/Prev ${prev}>>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return Buffer.concat([pdf, Buffer.from(update, 'latin1')]);
}
