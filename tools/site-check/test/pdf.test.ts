// The pdf part (011 research R12): each defect of the built PDF is reported
// by name. The fixture sites are `minimal/` with a `cv.pdf` printed from its
// own /cv as the build prints it, with one defect each.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import type { Page } from 'playwright';
import { describe, expect, test, vi } from 'vitest';
import { PRINT_OPTIONS, withAuthor } from '../../../packages/web/scripts/cv-pdf.ts';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { startServer } from '../src/server.ts';
import { fixture, siteProject } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 180_000 });

const SITE = 'packages/web/dist/site';

// `minimal/`'s /cv printed as the build prints it, after `change` runs on
// the page, with `options` over the build's. The author is minimal's CV
// name unless `author` is false.
async function printMinimal({ change, options = {}, author = true }: { change?: (page: Page) => Promise<void>; options?: Parameters<Page['pdf']>[0]; author?: boolean } = {}): Promise<Buffer> {
  const root = fixture('minimal');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'packages/web/dist/site-manifest.json'), 'utf8'));
  const server = await startServer({ siteDir: path.join(root, SITE), manifest });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${server.url}/cv`, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await change?.(page);
    const pdf = await page.pdf({ ...PRINT_OPTIONS, ...options });
    return author ? withAuthor(pdf, 'Ada Example') : pdf;
  } finally {
    await browser.close();
    await server.close();
  }
}

async function pdfLines(pdf: Buffer): Promise<string[]> {
  const report = await runCheck(siteProject({ [`${SITE}/cv.pdf`]: pdf }), { parts: ['pdf'] });
  return report.problems.map(renderProblem);
}

describe('011-cv-pdf-FR-040: the pdf part reports each defect by name', () => {
  test("minimal/'s /cv printed as the build prints it passes", async () => {
    expect(await pdfLines(await printMinimal())).toEqual([]);
  });

  test('a PDF on US Letter gives pdf-not-a4 for its page', async () => {
    expect(await pdfLines(await printMinimal({ options: { format: 'Letter' } }))).toEqual(['pdf /cv.pdf - pdf-not-a4 page 1: 612 × 792 pt, expected A4 (595.92 × 842.88 pt)']);
  });

  test("a PDF holding the footer's text gives pdf-site-element", async () => {
    const lines = await pdfLines(await printMinimal({ change: (page) => page.emulateMedia({ media: 'screen' }) }));
    expect(lines).toContain('pdf /cv.pdf - pdf-site-element footer: "How this page was built" is in the PDF');
  });

  test('a PDF missing a field gives pdf-missing-field with its path', async () => {
    const change = (page: Page) => page.locator('main .highlights li').first().evaluate((item) => item.remove());
    expect(await pdfLines(await printMinimal({ change }))).toEqual(['pdf /cv.pdf - pdf-missing-field work[0].highlights[0]: "Built the test site." is not in the PDF']);
  });

  test('a PDF with no Author gives pdf-metadata Author', async () => {
    expect(await pdfLines(await printMinimal({ author: false }))).toEqual(['pdf /cv.pdf - pdf-metadata Author: Author is missing, expected "Ada Example"']);
  });
});
