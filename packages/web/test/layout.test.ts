// The layout at every width, zoomed and with text spacing overridden, using
// the site check's layout part (research R19).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { LAYOUT_VARIANTS, TEXT_SPACING_CSS, clippedOrOverlapping, horizontalScroll, isOneColumn } from '../../../tools/site-check/src/parts/layout.ts';
import { openPage } from './helpers/browser.ts';
import { fixture } from './helpers/fixtures.ts';
import { builtSite, serveBuilt, serveFixture } from './helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

const WIDTHS = [320, 375, 768, 1024, 1440, 2560];

const px = (value: string) => Number.parseFloat(value);

// Pairs of consecutive sibling boxes whose visual order isn't their DOM
// order: the second must start after the first ends, on a later line, or on
// the same row to its right.
function readingOrderProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const describe = (element: Element) => `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.split(' ').join('.')}` : ''}`;
    const shown = (element: Element) => {
      const rects = element.getClientRects();
      if (rects.length === 0) return false;
      const box = element.getBoundingClientRect();
      return box.width > 1 && box.height > 1;
    };
    for (const parent of document.body.querySelectorAll('*')) {
      const children = [...parent.children].filter(shown);
      for (let index = 1; index < children.length; index += 1) {
        const first = children[index - 1]!;
        const second = children[index]!;
        const firstRects = [...first.getClientRects()];
        const last = firstRects[firstRects.length - 1]!;
        const next = second.getClientRects()[0]!;
        const later = next.top >= last.bottom - 1;
        const sameRow = Math.min(next.bottom, last.bottom) - Math.max(next.top, last.top) > 0;
        const right = sameRow && next.left >= last.right - 1;
        if (!later && !right) problems.push(`${describe(second)} comes before ${describe(first)} in ${describe(parent)}`);
      }
    }
    return problems;
  });
}

describe('004-cv-page-FR-020: no horizontal scrolling from 320 px to 2560 px, with a readable column on wide screens', () => {
  test('the real CV at every width has no horizontal scroll', async () => {
    const { url } = await serveBuilt();
    for (const width of WIDTHS) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await horizontalScroll(page, '/cv', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test('the not-found page at every width has no horizontal scroll', async () => {
    const { url } = await serveBuilt();
    for (const width of WIDTHS) {
      const page = await openPage(`${url}/missing-page`, { width });
      expect(await horizontalScroll(page, '/missing-page', `${width}px`), `${width}px`).toEqual([]);
      await page.context().close();
    }
  });

  test('at 2560 px the page column is no wider than size.page', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 2560 });
    const width = await page.locator('main').evaluate((main) => main.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(px(tokenValue('size.page')));
  });

  test('the layout variants list every width of the spec', () => {
    expect(LAYOUT_VARIANTS.map((variant) => variant.variant)).toEqual([...WIDTHS.map((width) => `${width}px`), '200%-zoom', '400%-zoom', 'text-spacing']);
  });
});

describe('004-cv-page-FR-021: content and function survive 200% and 400% zoom and overridden text spacing', () => {
  test('at 200% zoom nothing scrolls sideways or is clipped (US1 scenario 5)', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 640, height: 450, deviceScaleFactor: 2 });
    expect(await horizontalScroll(page, '/cv', '200%-zoom')).toEqual([]);
    expect(await clippedOrOverlapping(page, '/cv', '200%-zoom')).toEqual([]);
  });

  test('at 400% zoom nothing scrolls sideways or is clipped, and the layout is one column (US1 scenario 4)', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      const page = await openPage(`${url}${target}`, { width: 320, height: 225, deviceScaleFactor: 4 });
      expect(await horizontalScroll(page, target, '400%-zoom')).toEqual([]);
      expect(await clippedOrOverlapping(page, target, '400%-zoom')).toEqual([]);
      expect(await isOneColumn(page, target, '400%-zoom')).toEqual([]);
    }
  });

  test('the one-column measure sees the two columns of the desktop layout', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 1440 });
    const problems = await isOneColumn(page, '/cv', '1440px');
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0]).toMatchObject({ part: 'layout', page: '/cv', variant: '1440px', type: 'not-one-column' });
  });

  test('with the WCAG 1.4.12 text spacing, nothing is clipped and no two text boxes overlap', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const width of [320, 375, 1440]) {
        const page = await openPage(`${url}${target}`, { width });
        await page.addStyleTag({ content: TEXT_SPACING_CSS });
        expect(await horizontalScroll(page, target, 'text-spacing'), `${target} ${width}px`).toEqual([]);
        expect(await clippedOrOverlapping(page, target, 'text-spacing'), `${target} ${width}px`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('the overlap measure finds text drawn over other text', async () => {
    const { url } = await serveBuilt();
    const page = await openPage(`${url}/cv`, { width: 375 });
    await page.addStyleTag({ content: 'h1 { margin-bottom: -200px; }' });
    const problems = await clippedOrOverlapping(page, '/cv', '375px');
    expect(problems.some((problem) => problem.type === 'overlap')).toBe(true);
  });
});

describe('004-cv-page-FR-022: a long word or address wraps within its column', () => {
  test('long-words.json at 320 px stays inside the column', async () => {
    const { url } = await serveFixture(fixture('long-words'));
    const page = await openPage(`${url}/cv`, { width: 320 });
    expect(await horizontalScroll(page, '/cv', '320px')).toEqual([]);
    expect(await clippedOrOverlapping(page, '/cv', '320px')).toEqual([]);
    const overflowing = await page.locator('main').evaluate((main) => {
      const column = main.getBoundingClientRect();
      const style = getComputedStyle(main);
      const left = column.left + Number.parseFloat(style.paddingLeft);
      const right = column.right - Number.parseFloat(style.paddingRight);
      return [...main.querySelectorAll('h3, p')].filter((element) => {
        const box = element.getBoundingClientRect();
        return box.left < left - 1 || box.right > right + 1;
      }).length;
    });
    expect(overflowing).toBe(0);
  });
});

describe('004-cv-page-FR-027: the reading order matches the visual order at every width', () => {
  test('each box comes after the previous one in DOM order, at every width', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/cv', '/missing-page']) {
      for (const width of WIDTHS) {
        const page = await openPage(`${url}${target}`, { width });
        expect(await readingOrderProblems(page), `${target} ${width}px`).toEqual([]);
        await page.context().close();
      }
    }
  });

  test('every-field.json keeps its reading order at phone and desktop widths', async () => {
    const { url } = await serveFixture(fixture('every-field'));
    for (const width of [320, 1440]) {
      const page = await openPage(`${url}/cv`, { width });
      expect(await readingOrderProblems(page), `${width}px`).toEqual([]);
    }
  });

  test('no rule in the built CSS reorders boxes', () => {
    const { dir, manifest } = builtSite();
    const css = manifest.files.filter((file) => file.type === 'text/css').map((file) => fs.readFileSync(path.join(dir, file.path), 'utf8'));
    expect(css.length).toBeGreaterThan(0);
    for (const text of css) {
      expect(text).not.toMatch(/(?:^|[;{\s])order\s*:/);
      expect(text).not.toMatch(/-reverse\b/);
      expect(text).not.toMatch(/grid-(?:row|area|column-start|column-end|row-start|row-end)\s*:/);
      expect(text).not.toMatch(/grid-template-areas/);
    }
  });
});
