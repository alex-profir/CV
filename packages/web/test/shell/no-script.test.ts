// The root without scripts (FR-049): a plain page in /cv's look that leads
// to /cv, with nothing that needs a script.
import { describe, expect, test, vi } from 'vitest';
import { resume, siteData } from '@cv/content';
import { openShell } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('005-os-shell-FR-049: without scripts, the root shows a page that leads to /cv', () => {
  for (const [width, height] of [
    [1440, 900],
    [375, 812],
  ] as const) {
    test(`at ${width} px: the role, the name, the sentence and Read the CV, then /cv's footer, in the site's style sheet`, async () => {
      const page = await openShell({ width, height, javaScriptEnabled: false });
      expect(await page.evaluate(() => document.documentElement.hasAttribute('data-shell'))).toBe(false);
      const plain = page.locator('.no-script');
      expect(await plain.isVisible()).toBe(true);
      expect(await page.locator('#os').isVisible()).toBe(false);
      expect((await plain.locator('p.role').textContent())?.trim()).toBe(resume.basics!.label);
      expect((await plain.locator('h1').textContent())?.trim()).toBe(resume.basics!.name);
      expect((await plain.locator('.no-script-text').textContent())?.trim()).toBe(
        'This site is a small operating system that runs in your browser, and it needs JavaScript. The CV reads in full without it.',
      );
      const link = plain.getByRole('link', { name: 'Read the CV' });
      expect(await link.getAttribute('href')).toBe('/cv');
      expect(await plain.locator('footer a').getAttribute('href')).toBe(siteData.repository);
      // Laid out after the link, in /cv's light look and fonts.
      const order = await page.evaluate(() => {
        const link = document.querySelector('.no-script a.standalone')!;
        const footer = document.querySelector('.no-script footer')!;
        return link.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING;
      });
      expect(order).toBeGreaterThan(0);
      const style = await page.evaluate(() => {
        const sheet = [...document.styleSheets].some((candidate) => /\/assets\/os-/.test(candidate.href ?? ''));
        const h1 = getComputedStyle(document.querySelector('.no-script h1')!);
        return { sheet, family: h1.fontFamily, background: getComputedStyle(document.querySelector('.no-script')!).backgroundColor };
      });
      expect(style.sheet).toBe(true);
      expect(style.family).toMatch(/Space Grotesk/);
      expect(style.background).not.toBe('rgba(0, 0, 0, 0)');
    });

    test(`at ${width} px: no visible button, menu, dock or form control`, async () => {
      const page = await openShell({ width, height, javaScriptEnabled: false });
      const controls = await page.evaluate(() =>
        [...document.querySelectorAll('button, input, select, textarea, [role="menu"], [role="menubar"], [role="toolbar"], .dock, [role="button"]')]
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => element.outerHTML.slice(0, 80)),
      );
      expect(controls).toEqual([]);
    });
  }
});
