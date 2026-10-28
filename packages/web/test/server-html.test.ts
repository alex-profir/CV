// What the server sends: the whole CV in the HTML, no control that needs a
// script, and nothing loaded from another site (contracts/page.md Document).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { resume } from '@cv/content';
import { expectedFields } from '../../../tools/site-check/src/expected.ts';
import { fieldProblems, mainSequence, unstyledDetail } from '../../../tools/site-check/src/parts/no-script.ts';
import { openHtml, openPage } from './helpers/browser.ts';
import { builtSite, serveBuilt } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

const builtFiles = () => {
  const { dir, manifest } = builtSite();
  return manifest.files.map((file) => ({ ...file, text: fs.readFileSync(path.join(dir, file.path)).toString('utf8') }));
};

describe('004-cv-page-FR-014: the full content of /cv is in the page the server sends', () => {
  test('cv.html, loaded with scripting off, holds every shown field of the real CV in order', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440, javaScriptEnabled: false });
    // The fields come from the CV document, as the site check's no-script
    // part reads them, and are found in the same way.
    const fields = expectedFields(resume);
    expect(fields.length).toBeGreaterThan(100);
    expect(fieldProblems(await mainSequence(page), fields)).toEqual([]);
    // The style sheet applied with no script running.
    expect(await unstyledDetail(page)).toBeNull();
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
  // A style sheet's `url(#id)` names an element of the page, such as the
  // dock lens's SVG filter (005-os-shell-FR-068), and loads nothing.
  const inPage = (address: string) => /^#[\w-]+$/.test(address);

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
        expect(local(address) || inPage(address), `${file.path}: url(${raw})`).toBe(true);
        checked += 1;
      }
      expect(file.text, file.path).not.toMatch(/@import\s/);
    }
    expect(checked).toBeGreaterThan(3);
  });
});
