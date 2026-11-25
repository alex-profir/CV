// The CV's PDF (011 contracts/pdf.md): the real build's passes the site
// check's pdf part, it follows the CV it was printed from, and the build's
// PDF step fails naming the cause.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import type { Resume } from '@cv/content';
import { readFamilies } from '../../../tools/site-check/src/check.ts';
import { expectedFields } from '../../../tools/site-check/src/expected.ts';
import { pdfProblems } from '../../../tools/site-check/src/parts/pdf.ts';
import { compact, pdfText } from '../../../tools/site-check/src/parts/print.ts';
import { renderProblem } from '../../../tools/site-check/src/report.ts';
import { writeCvPdf } from '../scripts/cv-pdf.ts';
import { openPage } from './helpers/browser.ts';
import { builtSite, fixtureSite, serveBuilt } from './helpers/site.ts';

vi.setConfig({ testTimeout: 180_000 });

const CV_PDF_SCRIPT = path.resolve(import.meta.dirname, '../scripts/cv-pdf.ts');

// A temporary copy of the built site without its PDF, removed when the test
// finishes.
function siteCopy(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-pdf-'));
  fs.cpSync(builtSite().dir, dir, { recursive: true });
  fs.rmSync(path.join(dir, 'cv.pdf'));
  return dir;
}

// `writeCvPdf` on `siteDir` in a child process, with `env` added: its
// rejection's message, or null when it resolved.
function failure(siteDir: string, env: Record<string, string> = {}): string | null {
  const script = `import { writeCvPdf } from ${JSON.stringify(CV_PDF_SCRIPT)};
try { await writeCvPdf(${JSON.stringify(siteDir)}, undefined); } catch (error) { process.stdout.write(error.message); process.exit(3); }`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, ...env } });
  return result.status === 3 ? result.stdout : null;
}

describe('011-cv-pdf-FR-004, 011-cv-pdf-FR-010, 011-cv-pdf-FR-011, 011-cv-pdf-FR-012, 011-cv-pdf-FR-013, 011-cv-pdf-FR-014, 011-cv-pdf-FR-015, 011-cv-pdf-FR-016: the real PDF', () => {
  test("the site check's pdf part finds no problem in the real build's PDF", async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const input = { url, fields: expectedFields(resume), author: resume.basics?.name, families: readFamilies(), listed: true };
    expect((await pdfProblems(page, input)).map(renderProblem)).toEqual([]);
    await page.context().close();
  });
});

describe('011-cv-pdf-FR-011: the PDF follows the CV', () => {
  test("a CV with a changed highlight gives a PDF holding the new highlight and not the old", async () => {
    const changed: Resume = structuredClone(resume);
    // The first work entry with highlights: the real CV's first has none.
    const highlights = changed.work!.find((entry) => (entry.highlights ?? []).length > 0)!.highlights!;
    const old = highlights[0]!;
    highlights[0] = 'Shipped the fixture highlight that only this test prints.';
    const site = fixtureSite(changed);
    try {
      await writeCvPdf(site.dir, changed.basics?.name);
      const text = compact((await pdfText(fs.readFileSync(path.join(site.dir, 'cv.pdf')))).flatMap((page) => page.items.map((item) => item.str)).join(''));
      expect(text.includes(compact('Shipped the fixture highlight that only this test prints.'))).toBe(true);
      expect(text.includes(compact(old))).toBe(false);
    } finally {
      site.remove();
    }
  });
});

describe('011-cv-pdf-FR-020: the build fails naming the cause', () => {
  test("without Chromium, the PDF step rejects naming it and how to install it, and writes no PDF", () => {
    const dir = siteCopy();
    const browsers = fs.mkdtempSync(path.join(os.tmpdir(), 'no-browsers-'));
    try {
      const message = failure(dir, { PLAYWRIGHT_BROWSERS_PATH: browsers });
      expect(message).toMatch(/^the CV PDF can't be made: Chromium didn't start \(.+\)\. Install it with npx playwright install chromium$/);
      expect(fs.existsSync(path.join(dir, 'cv.pdf'))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
      fs.rmSync(browsers, { recursive: true, force: true });
    }
  });

  test('on a site without /cv, the PDF step rejects naming its status', () => {
    const dir = siteCopy();
    try {
      // The route table always lists /cv, so the local server answers its
      // missing file with 500.
      fs.rmSync(path.join(dir, 'cv.html'));
      expect(failure(dir)).toBe("the CV PDF can't be made: /cv answered 500");
      expect(fs.existsSync(path.join(dir, 'cv.pdf'))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
