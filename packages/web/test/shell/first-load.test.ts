// The first load (spec US1): the CV open with no click on the desktop, one
// tap away on a phone, and nothing in front of either shell.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { box, centre, focusedElement, frontWindow, openShell, openShellHeld } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

// What sits on the centre of each element: the element itself or one of
// its own descendants, so nothing overlays it.
async function uncovered(page: Page, selectors: string[]): Promise<Record<string, boolean>> {
  return page.evaluate((list) => {
    const result: Record<string, boolean> = {};
    for (const selector of list) {
      const element = document.querySelector(selector);
      if (element === null) {
        result[selector] = false;
        continue;
      }
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      result[selector] = hit !== null && element.contains(hit);
    }
    return result;
  }, selectors);
}

const dialogs = (page: Page) => page.evaluate(() => document.querySelectorAll('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]').length);

describe('005-os-shell-FR-004: nothing stands between the visitor and the CV (SC-001)', () => {
  test('at 1440 × 900 nothing overlays the shell, and the CV shows with no click', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    expect(await dialogs(page)).toBe(0);
    expect(await uncovered(page, ['#os .menu-bar', '#os .dock-item', '#os .window[data-view="cv"] .window-title', '#os .window[data-view="cv"] .cv h1'])).toEqual({
      '#os .menu-bar': true,
      '#os .dock-item': true,
      '#os .window[data-view="cv"] .window-title': true,
      '#os .window[data-view="cv"] .cv h1': true,
    });
    await expect.poll(() => page.locator('#os .window[data-view="cv"] .cv h1').isVisible()).toBe(true);
  });

  test('at 375 × 812 nothing overlays the home screen, and one tap shows the CV', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true });
    expect(await dialogs(page)).toBe(0);
    expect(await uncovered(page, ['#os .site-name', '#os .app-icon[data-view="cv"]', '#os .home .about'])).toEqual({
      '#os .site-name': true,
      '#os .app-icon[data-view="cv"]': true,
      '#os .home .about': true,
    });
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await expect.poll(() => page.locator('#os .full-screen[data-view="cv"] .cv h1').isVisible()).toBe(true);
  });

  test('at 375 × 812 a tap on the CV icon before the shell script has loaded opens the CV once it has, with no second tap', async () => {
    const { page, release } = await openShellHeld({ width: 375, height: 812, hasTouch: true });
    expect(await page.locator('#os[data-ready]').count()).toBe(0);
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await release();
    await expect.poll(() => page.locator('#os .full-screen[data-view="cv"] .cv h1').isVisible()).toBe(true);
    expect(await focusedElement(page)).toMatch(/^div#app-title-cv\.app-title /);
  });

  test('at 1440 × 900, after closing the CV, one click on its dock item opens it in front and focused', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Close CV' }).click();
    await expect.poll(() => page.locator('#os .window').count()).toBe(0);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    const window = page.locator('#os .window[data-view="cv"]');
    await expect.poll(() => window.getAttribute('aria-current')).toBe('true');
    expect(await frontWindow(page)).toBe('cv');
    expect(await focusedElement(page)).toMatch(/^div#window-title-cv\.window-title /);
  });
});

describe('005-os-shell-FR-005: the desktop opens with the CV window open and focused, the phone on its home screen', () => {
  test('at 1440 × 900 the CV window is open, focused and in front, at 1000 × 716 from 220, 56, with the menu bar and dock shown and focus at the start of the page', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const windows = page.locator('#os .desktop-area > .window');
    expect(await windows.count()).toBe(1);
    expect(await windows.first().getAttribute('data-view')).toBe('cv');
    expect(await windows.first().getAttribute('aria-current')).toBe('true');
    const rect = (await box(page, '#os .window[data-view="cv"]'))!;
    expect(rect).toEqual({ x: 220, y: 56, width: 1000, height: 716 });
    expect(await page.locator('#os .menu-bar').isVisible()).toBe(true);
    expect(await page.locator('#os .dock').isVisible()).toBe(true);
    expect(await focusedElement(page)).toBe('body');
  });

  test('at 375 × 812 the home screen shows and no app is open', async () => {
    const page = await openShell({ width: 375, height: 812 });
    expect(await page.locator('#os .home').isVisible()).toBe(true);
    expect(await page.locator('#os .full-screen').count()).toBe(0);
    expect(await page.locator('#os .desktop').count()).toBe(0);
    expect(await focusedElement(page)).toBe('body');
  });

  test('the CV window has the same box before and after hydration, within half a pixel (research R3)', async () => {
    for (const [width, height] of [
      [1024, 640],
      [1440, 900],
      [2560, 1440],
    ] as const) {
      const { page, release } = await openShellHeld({ width, height });
      const before = (await box(page, '#os .window[data-view="cv"]'))!;
      expect(before, `${width}`).not.toBeNull();
      await release();
      expect(await page.locator('#os .window[data-view="cv"]').getAttribute('data-placement')).toBe('set');
      const after = (await box(page, '#os .window[data-view="cv"]'))!;
      for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(after[key] - before[key]), `${width} × ${height} ${key}`).toBeLessThanOrEqual(0.5);
      expect(centre(after).x, `${width}`).toBeCloseTo(width / 2, 0);
    }
  });
});
