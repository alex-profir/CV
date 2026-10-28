// WCAG 2.2 A and AA in every state of both shells, zoom and text spacing
// (005 US5 scenarios 4 and 5). axe runs through the site check's
// accessibility part. Chromium has no text-only zoom, so it is emulated as
// Firefox's is: every element's font size, as computed, doubled.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { axeProblems } from '../../../../tools/site-check/src/parts/accessibility.ts';
import { TEXT_SPACING_CSS, horizontalScroll } from '../../../../tools/site-check/src/parts/layout.ts';
import { openShell, press, settle } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

const CV = '#os .window[data-view="cv"]';
const ABOUT = '#os .window[data-view="about"]';

const desktop = () => openShell({ width: 1440, height: 900, platform: 'Windows' });
const phone = (width = 375, height = 812) => openShell({ width, height, hasTouch: true });

async function expectNoViolation(page: Page, state: string): Promise<void> {
  await settle(page);
  expect(await axeProblems(page, '/', state), state).toEqual([]);
}

async function openAbout(page: Page): Promise<void> {
  await page.click('#menu-title-site');
  await page.getByRole('menuitem', { name: 'About this site' }).click();
  await page.locator(ABOUT).waitFor();
}

// The shell's labels: menu bar titles, dock names, window and app titles,
// and the home screen's.
const LABELS = ['#os .menu-title', '#os .dock-name', '#os .window-title', '#os .app-title', '#os .app-icon-name', '#os .home .site-name', '#os .home .about'];
// What a label's text must not run into, besides another label.
const OBSTACLES = ['#os .control', '#os .site-mark', '#os .home-button', '#os .dock-icon', '#os .app-icon-image'];

// Each label whose text a box hiding its overflow cuts off, and each pair
// of labels, or label and control, drawn over each other.
function labelProblems(page: Page): Promise<string[]> {
  return page.evaluate(
    ([labels, obstacles]) => {
      const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}${element.getAttribute('data-view') === null ? '' : `[${element.getAttribute('data-view')}]`}`;
      const shown = (selector: string) => [...document.querySelectorAll(selector)].filter((element) => element.getClientRects().length > 0 && element.closest('[inert], [hidden]') === null);
      const textRects = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return [...range.getClientRects()].filter((rect) => rect.width > 0.5 && rect.height > 0.5);
      };
      const meet = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      const found: string[] = [];
      const items = labels.flatMap(shown).map((element) => ({ element, rects: textRects(element) }));
      for (const { element, rects } of items) {
        for (let box: Element | null = element; box !== null && box !== document.body; box = box.parentElement) {
          const style = getComputedStyle(box);
          if (![style.overflowX, style.overflowY].some((value) => value === 'hidden' || value === 'clip')) continue;
          const edge = box.getBoundingClientRect();
          if (rects.some((rect) => rect.left < edge.left - 1 || rect.right > edge.right + 1 || rect.top < edge.top - 1 || rect.bottom > edge.bottom + 1)) found.push(`${describe(element)} clipped by ${describe(box)}`);
        }
        if (getComputedStyle(element).textOverflow === 'ellipsis' && element.scrollWidth > element.clientWidth + 1) found.push(`${describe(element)} cut off with an ellipsis`);
      }
      for (let a = 0; a < items.length; a += 1) {
        for (let b = a + 1; b < items.length; b += 1) {
          const [first, second] = [items[a]!, items[b]!];
          if (first.element.contains(second.element) || second.element.contains(first.element)) continue;
          if (first.rects.some((one) => second.rects.some((other) => meet(one, other)))) found.push(`${describe(first.element)} overlaps ${describe(second.element)}`);
        }
      }
      for (const obstacle of obstacles.flatMap(shown)) {
        const edge = obstacle.getBoundingClientRect();
        for (const { element, rects } of items) {
          if (obstacle.contains(element) || element.contains(obstacle)) continue;
          if (rects.some((rect) => meet(rect, edge))) found.push(`${describe(element)} overlaps ${describe(obstacle)}`);
        }
      }
      return found;
    },
    [LABELS, OBSTACLES] as const,
  );
}

// Text-only zoom: each element's computed font size, multiplied.
async function zoomText(page: Page, factor: number): Promise<void> {
  await page.evaluate((scale) => {
    const elements = [...document.querySelectorAll<HTMLElement>('body, body *')];
    const sizes = elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    elements.forEach((element, index) => element.style.setProperty('font-size', `${sizes[index]! * scale}px`, 'important'));
  }, factor);
  await settle(page);
}

describe('005-os-shell-FR-048: both shells conform to WCAG 2.2 AA in every state, zoomed and with text spacing', () => {
  test('axe finds nothing in each desktop state', async () => {
    const page = await desktop();
    await expectNoViolation(page, 'desktop/cv');
    await openAbout(page);
    await expectNoViolation(page, 'desktop/two-windows');
    await page.click('#menu-title-site');
    await expectNoViolation(page, 'desktop/site-menu');
    await page.keyboard.press('Escape');
    await page.click('#menu-title-window');
    await expectNoViolation(page, 'desktop/window-menu');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Close CV' }).click();
    await expectNoViolation(page, 'desktop/about');
    await page.getByRole('button', { name: 'Minimize About this site' }).click();
    await expectNoViolation(page, 'desktop/minimized');
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await page.getByRole('button', { name: 'Maximize CV' }).click();
    await expectNoViolation(page, 'desktop/maximized');
    await page.getByRole('button', { name: 'Restore CV' }).click();
    await press(page, 'Alt+Shift+P', 'ArrowRight');
    await expectNoViolation(page, 'desktop/keyboard-move');
    await press(page, 'Escape', 'Alt+Shift+S', 'ArrowLeft');
    await expectNoViolation(page, 'desktop/keyboard-resize');
    await press(page, 'Escape', 'Alt+Shift+W');
    await expectNoViolation(page, 'desktop/no-app');
  });

  test('axe finds nothing in each mobile state', async () => {
    const page = await phone();
    await expectNoViolation(page, 'mobile/home');
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await page.locator('#os .full-screen[data-view="cv"]').waitFor();
    await expectNoViolation(page, 'mobile/cv');
    await page.locator('#os .home-button').tap();
    await page.locator('#os .home button.about').tap();
    await page.locator('#os .full-screen[data-view="about"]').waitFor();
    await expectNoViolation(page, 'mobile/about');
    const landscape = await phone(812, 375);
    await expectNoViolation(landscape, 'mobile/home-landscape');
  });

  const zooms: Array<{ name: string; options: ShellOptions }> = [
    { name: '200% zoom of 1440 × 900', options: { width: 720, height: 450, deviceScaleFactor: 2 } },
    { name: '400% zoom of a 1280 px window', options: { width: 320, height: 225, deviceScaleFactor: 4 } },
  ];
  for (const { name, options } of zooms) {
    test(`${name} shows the mobile shell, with the CV readable and no horizontal scroll`, async () => {
      const page = await openShell({ ...options, hasTouch: true });
      expect(await page.evaluate(() => document.documentElement.getAttribute('data-shell'))).toBe('mobile');
      expect(await horizontalScroll(page, '/', name), `${name}, home`).toEqual([]);
      await page.locator('#os .app-icon[data-view="cv"]').tap();
      await page.locator('#os .full-screen[data-view="cv"]').waitFor();
      await settle(page);
      expect(await page.locator('#os .full-screen[data-view="cv"] .cv h1').isVisible()).toBe(true);
      expect(await horizontalScroll(page, '/', name), `${name}, the CV`).toEqual([]);
    });
  }

  test('text-only zoom at 200% cuts off no label on the desktop or the home screen and draws none over another', async () => {
    const page = await desktop();
    await openAbout(page);
    await zoomText(page, 2);
    expect(await labelProblems(page), 'desktop, two windows').toEqual([]);
    const home = await phone();
    await zoomText(home, 2);
    expect(await labelProblems(home), 'mobile, home').toEqual([]);
    const app = await phone();
    await app.locator('#os .app-icon[data-view="cv"]').tap();
    await app.locator('#os .full-screen[data-view="cv"]').waitFor();
    await zoomText(app, 2);
    expect(await labelProblems(app), 'mobile, the CV').toEqual([]);
  });

  test('1.4.12 text spacing cuts off no label on the desktop or the home screen and draws none over another', async () => {
    const page = await desktop();
    await openAbout(page);
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    await settle(page);
    expect(await labelProblems(page), 'desktop, two windows').toEqual([]);
    const home = await phone();
    await home.addStyleTag({ content: TEXT_SPACING_CSS });
    await settle(home);
    expect(await labelProblems(home), 'mobile, home').toEqual([]);
  });
});
