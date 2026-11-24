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
import { CV_PDF } from '../src/routes.ts';
// A cycle with build-site.ts, which calls this module only from its build,
// after both modules have loaded.
import { siteManifest } from './build-site.ts';

const FAILED = "the CV PDF can't be made";

// Chromium's own print-to-PDF default margin, in inches (research R3): a
// renderer setting, not a design value. The site check's pdf part reads it
// too. Playwright takes a plain number as CSS pixels, 96 to the inch.
export const PDF_MARGIN_INCHES = 0.4;
const MARGIN = PDF_MARGIN_INCHES * 96;

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
    const printed = await page.pdf({
      format: 'A4',
      margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      printBackground: false,
      displayHeaderFooter: false,
      preferCSSPageSize: false,
      tagged: true,
      outline: true,
    });
    if (printed.length === 0 || printed.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`${FAILED}: Chromium gave an empty file`);
    const pdf = author === undefined ? printed : withAuthor(printed, author);
    fs.writeFileSync(path.join(siteDir, CV_PDF.file), pdf);
    return pdf.length;
  } finally {
    await browser?.close();
    await server?.close();
  }
}

// Stub until the author is added (T024).
function withAuthor(pdf: Buffer, _author: string): Buffer {
  return pdf;
}
