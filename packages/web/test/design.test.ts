// The approved design's measurable parts: section order, fonts per element
// and the column at desktop and phone widths (design/review.md, data-model.md
// Token roles). The visual comparison with the exports is by hand (T105).
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { openPage } from './helpers/browser.ts';
import { serveBuilt } from './helpers/site.ts';

vi.setConfig({ testTimeout: 60_000 });

const px = (value: string) => Number.parseFloat(value);

async function realPage(width: number): Promise<Page> {
  const { url } = await serveBuilt();
  return openPage(`${url}/cv`, { width });
}

const fontOf = (page: Page, selector: string) => page.locator(selector).first().evaluate((element) => getComputedStyle(element).fontFamily);

describe('004-cv-page-FR-042: the page matches the approved design', () => {
  test('the sections come in the order design/review.md lists', async () => {
    const page = await realPage(1440);
    const headings = await page.locator('main > section h2').allTextContents();
    expect(headings).toEqual(['Experience', 'Projects', 'Skills', 'Education', 'Languages', 'Interests']);
  });

  test('each element uses the font token the design gives it', async () => {
    const page = await realPage(1440);
    const display = tokenValue('font.family.display');
    const body = tokenValue('font.family.body');
    const mono = tokenValue('font.family.mono');
    for (const [selector, family] of [
      ['h1', display],
      ['h2', display],
      ['h3', display],
      ['body', body],
      ['p.summary', body],
      ['ul.highlights > li', body],
      ['p.org', body],
      ['p.date', mono],
      ['p.role', mono],
      ['.level', mono],
      ['ul.chips > li', mono],
      ['.section-number', mono],
      ['dl.contact dt', mono],
    ] as const) {
      expect(await fontOf(page, selector), selector).toBe(family);
    }
  });

  test('at 1440 px the column is size.page wide with space.14 on each side, and sections have a size.section-label heading column', async () => {
    const page = await realPage(1440);
    const main = await page.locator('main').evaluate((element) => {
      const style = getComputedStyle(element);
      return { width: element.getBoundingClientRect().width, left: style.paddingLeft, right: style.paddingRight };
    });
    expect(main).toEqual({ width: px(tokenValue('size.page')), left: tokenValue('space.14'), right: tokenValue('space.14') });
    const sections = await page.locator('main > section').evaluateAll((elements) =>
      elements.map((section) => {
        const head = section.querySelector('.section-head')!.getBoundingClientRect();
        const body = section.querySelector('.section-body')!.getBoundingClientRect();
        return { headWidth: head.width, beside: body.left >= head.right && body.top < head.bottom };
      }),
    );
    expect(sections).toHaveLength(6);
    for (const section of sections) expect(section).toEqual({ headWidth: px(tokenValue('size.section-label')), beside: true });
  });

  test('at 375 px the side padding is space.5 and sections are one column', async () => {
    const page = await realPage(375);
    const main = await page.locator('main').evaluate((element) => {
      const style = getComputedStyle(element);
      return { left: style.paddingLeft, right: style.paddingRight };
    });
    expect(main).toEqual({ left: tokenValue('space.5'), right: tokenValue('space.5') });
    const stacked = await page.locator('main > section').evaluateAll((elements) =>
      elements.map((section) => {
        const head = section.querySelector('.section-head')!.getBoundingClientRect();
        const body = section.querySelector('.section-body')!.getBoundingClientRect();
        return body.top >= head.bottom;
      }),
    );
    expect(stacked).toEqual(Array(6).fill(true));
  });
});
