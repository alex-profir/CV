// The Playground in a window like every app (spec US1): it moves, resizes,
// minimizes, maximizes and closes as the CV window does, opens at the
// design's box beside the CV, full screen on a phone, and has its own menu.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { box, drag, frontWindow, openShell, PHONE_USER_AGENT, settle } from '../helpers/shell.ts';
import { freshProfile, holdEngine, LOADING, menu, onMac, openPlayground, openPlaygroundPage, PLAYGROUND, POPUP, running, setCode, waitChecked, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const WINDOW = '#os .window[data-view="playground"]';
const CV = '#os .window[data-view="cv"]';
const DOCK_ITEM = '#os .dock-item[data-app="playground"]';
const near = (a: number, b: number) => Math.abs(a - b) <= 1;

// A point on the title bar away from its controls and its name.
async function grip(page: Page): Promise<{ x: number; y: number }> {
  const bar = (await box(page, `${WINDOW} .title-bar`))!;
  return { x: bar.x + bar.width * 0.75, y: bar.y + bar.height / 2 };
}

// The window menu's entries as shown: each item's label and key, and `—` for a separator.
async function menuEntries(page: Page): Promise<string[]> {
  await page.click('#menu-title-app');
  const entries = await page.locator('#os .menu[role="menu"]:visible').first().evaluate((menu) =>
    [...menu.querySelectorAll('.menu-item, .menu-separator')].map((entry) => {
      if (entry.classList.contains('menu-separator')) return '—';
      const label = (entry.querySelector('.label')?.textContent ?? '').trim();
      const keys = (entry.querySelector('.keys')?.textContent ?? '').trim();
      return keys === '' ? label : `${label} ${keys}`;
    }),
  );
  await page.keyboard.press('Escape');
  return entries;
}

describe('008-typescript-playground-FR-003: the Playground opens in a window like every app, and full screen on a phone', () => {
  test('at 1440 × 900 with the CV open it opens at 360, 88 in the desktop area, 1040 × 648, in front', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await openPlayground(page);
    const area = (await box(page, '#os .desktop-area'))!;
    const opened = (await box(page, WINDOW))!;
    expect({ ...opened, x: opened.x - area.x, y: opened.y - area.y }).toEqual({ x: 360, y: 88, width: 1040, height: 648 });
    expect(await frontWindow(page)).toBe('playground');
    expect(await page.locator(CV).isVisible()).toBe(true);
    expect(await page.locator(DOCK_ITEM).getAttribute('aria-label')).toBe(`${siteText.os.views.playground}, open`);
  });

  test('it moves, resizes, minimizes, maximizes, restores and closes as the CV window does', async () => {
    const page = await openPlaygroundPage();
    const opened = (await box(page, WINDOW))!;
    const from = await grip(page);
    await drag(page, from, { x: from.x - 200, y: from.y + 40 });
    const moved = (await box(page, WINDOW))!;
    expect(moved).toEqual({ ...opened, x: opened.x - 200, y: opened.y + 40 });

    const corner = (await box(page, `${WINDOW} .resize-se`))!;
    await drag(page, { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 }, { x: corner.x + corner.width / 2 - 100, y: corner.y + corner.height / 2 - 60 });
    const resized = (await box(page, WINDOW))!;
    expect(near(resized.width, moved.width - 100), `${resized.width}`).toBe(true);
    expect(near(resized.height, moved.height - 60), `${resized.height}`).toBe(true);

    await page.getByRole('button', { name: 'Minimize Playground' }).click();
    await settle(page);
    expect(await page.locator(WINDOW).isHidden()).toBe(true);
    expect(await page.locator(DOCK_ITEM).getAttribute('aria-label')).toBe('Playground, minimized');
    await page.locator(DOCK_ITEM).click();
    await settle(page);
    expect(await box(page, WINDOW)).toEqual(resized);
    // Minimizing doesn't unmount the content: the editor is still there.
    expect(await page.locator(`${PLAYGROUND} .playground-editor .monaco-editor`).count()).toBe(1);

    await page.getByRole('button', { name: 'Maximize Playground' }).click();
    await settle(page);
    expect(await box(page, WINDOW)).toEqual(await box(page, '#os .desktop-area'));
    await page.getByRole('button', { name: 'Restore Playground' }).click();
    await settle(page);
    expect(await box(page, WINDOW)).toEqual(resized);

    await page.getByRole('button', { name: 'Close Playground' }).click();
    await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
    expect(await page.locator(DOCK_ITEM).getAttribute('aria-label')).toBe('Playground');
  });

  test('opened after the Terminal, it cascades from the Terminal as windows do', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await settle(page);
    await openPlayground(page);
    const terminal = (await box(page, '#os .window[data-view="terminal"]'))!;
    const playground = (await box(page, WINDOW))!;
    expect(playground).not.toEqual(terminal);
    expect(await frontWindow(page)).toBe('playground');
  });

  test('at 375 × 812 it opens full screen', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    await settle(page);
    const view = page.locator('#os .full-screen[data-view="playground"]');
    expect(await view.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    expect((await view.locator('.app-title').textContent())?.trim()).toBe(siteText.os.views.playground);
  });

  test("the Playground menu lists the design's commands, keys and separators", async () => {
    const page = await openPlaygroundPage();
    const own = siteText.desktop.ownMenu;
    const menu = siteText.playground.menu;
    const entries = await menuEntries(page);
    const at = entries.indexOf(siteText.inspector.show);
    expect(at).toBeGreaterThan(0);
    const run = (await onMac(page)) ? 'Cmd+Enter' : 'Ctrl+Enter';
    expect(entries.slice(0, at + 2)).toEqual([`${menu.run} ${run}`, menu.stop, '—', menu.examples, menu.options, menu.share, '—', `${menu.palette} F1`, menu.keys, '—', menu.reset, '—', siteText.inspector.show, '—']);
    expect(entries.slice(at + 2)[0]).toMatch(new RegExp(`^${own.move}`));
  });

  test('the menu runs the code, and Stop is disabled with no run', async () => {
    const page = await openPlaygroundPage();
    const menu = siteText.playground.menu;
    await page.click('#menu-title-app');
    expect(await page.getByRole('menuitem', { name: menu.stop, exact: true }).getAttribute('aria-disabled')).toBe('true');
    await page.keyboard.press('Escape');
    await setCode(page, 'setInterval(() => {}, 1000);');
    await waitChecked(page);
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: new RegExp(`^${menu.run}\\b`) }).click();
    await expect.poll(() => running(page)).toBe(true);
    await page.click('#menu-title-app');
    expect(await page.getByRole('menuitem', { name: menu.stop, exact: true }).getAttribute('aria-disabled')).toBeNull();
    await page.getByRole('menuitem', { name: menu.stop, exact: true }).click();
    await expect.poll(() => running(page)).toBe(false);
  });

  test('while TypeScript downloads, Keys… shows over the download and stays until closed, and Options is off', async () => {
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    await page.waitForSelector(LOADING);
    await page.click('#menu-title-app');
    const options = page.locator('#os .menu[role="menu"]:visible .menu-item', { hasText: siteText.playground.menu.options });
    expect(await options.getAttribute('aria-disabled')).toBe('true');
    await page.keyboard.press('Escape');
    await menu(page, siteText.playground.menu.keys);
    const popup = page.locator(POPUP);
    await popup.waitFor();
    await expect.poll(() => page.evaluate((selector) => document.activeElement === document.querySelector(`${selector} .popup-head button`), POPUP)).toBe(true);
    held.release();
    await waitReady(page);
    // Still open, and focus stayed in it, rather than the editor taking it.
    expect(await popup.isVisible()).toBe(true);
    expect(await page.evaluate((selector) => document.querySelector(selector)?.contains(document.activeElement), POPUP)).toBe(true);
    await page.keyboard.press('Escape');
    await popup.waitFor({ state: 'detached' });
  });

  test('a download with no popup asked for shows none when the editor arrives', async () => {
    const page = await freshProfile();
    const held = await holdEngine(page);
    await openPlayground(page);
    await page.waitForSelector(LOADING);
    held.release();
    await waitReady(page);
    expect(await page.locator(POPUP).count()).toBe(0);
  });
});
