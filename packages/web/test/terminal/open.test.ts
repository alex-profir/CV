// The Terminal as an app of the shell (spec US1): in the dock and on the
// home screen after the CV, never opened by itself, a window like every
// other, and focus in its command line however it is reached.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { APPS } from '../../src/apps/index.ts';
import { axNodes } from '../helpers/ax.ts';
import { box, drag, frontWindow, openShell, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, openTerminal, openTerminalPage, SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const WINDOW = '#os .window[data-view="terminal"]';
const CV = '#os .window[data-view="cv"]';
const DOCK_ITEM = '#os .dock-item[data-app="terminal"]';
const VIEW = '#os .full-screen[data-view="terminal"]';

describe('006-terminal-FR-001: the Terminal is an app of both shells, after the CV', () => {
  test('the dock shows CV, then Terminal', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const items = page.locator('#os .dock .dock-item');
    expect(await items.evaluateAll((list) => list.map((item) => item.getAttribute('data-app')))).toEqual(['cv', 'terminal']);
    expect(await items.evaluateAll((list) => list.map((item) => item.querySelector('.dock-name')?.textContent?.trim()))).toEqual(['CV', 'Terminal']);
  });

  test('the home screen shows CV, then Terminal', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    const icons = page.locator('#os .app-grid .app-icon');
    expect(await icons.evaluateAll((list) => list.map((icon) => icon.getAttribute('data-view')))).toEqual(['cv', 'terminal']);
    expect(await icons.evaluateAll((list) => list.map((icon) => icon.textContent?.trim()))).toEqual(['CV', 'Terminal']);
  });

  test('the Terminal declares both shells and needs no network', () => {
    const terminal = APPS.find((app) => app.id === 'terminal');
    expect(terminal).toBeDefined();
    expect([...terminal!.shells].sort()).toEqual(['desktop', 'mobile']);
    expect(terminal!.needsNetwork).toBe(false);
    expect(APPS.map((app) => app.id)).toEqual(['cv', 'terminal']);
  });
});

describe('006-terminal-FR-002: the Terminal never opens by itself', () => {
  test('at 1440 × 900 only the CV window is open on first load, and still after 5 s', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const windows = () => page.locator('#os .desktop-area > .window').evaluateAll((list) => list.map((window) => window.getAttribute('data-view')));
    expect(await windows()).toEqual(['cv']);
    await page.waitForTimeout(5_000);
    expect(await windows()).toEqual(['cv']);
    expect(await page.locator('#os .terminal').count()).toBe(0);
  });

  test('at 375 × 812 the home screen shows with nothing open, and still after 5 s', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    expect(await page.locator('#os .home').isVisible()).toBe(true);
    expect(await page.locator('#os .full-screen').count()).toBe(0);
    await page.waitForTimeout(5_000);
    expect(await page.locator('#os .full-screen').count()).toBe(0);
    expect(await page.locator('#os .terminal').count()).toBe(0);
  });
});

// A point on the title bar away from its controls and its name.
async function grip(page: Page): Promise<{ x: number; y: number }> {
  const bar = (await box(page, `${WINDOW} .title-bar`))!;
  return { x: bar.x + bar.width * 0.75, y: bar.y + bar.height / 2 };
}

const near = (a: number, b: number) => Math.abs(a - b) <= 1;

describe('006-terminal-FR-003: the Terminal opens in a window like every app, and full screen on a phone', () => {
  test('at 1440 × 900 it opens at 760 × 536 from 640, 176, in front of the CV window and focused', async () => {
    const page = await openTerminalPage('desktop');
    expect(await box(page, WINDOW)).toEqual({ x: 640, y: 176, width: 760, height: 536 });
    expect(await frontWindow(page)).toBe('terminal');
    expect(await page.locator(WINDOW).getAttribute('aria-current')).toBe('true');
    expect(await page.locator(CV).isVisible()).toBe(true);
    expect(await page.locator(DOCK_ITEM).getAttribute('aria-label')).toBe('Terminal, open');
  });

  test('it moves, resizes, minimizes, maximizes, restores and closes as the CV window does', async () => {
    const page = await openTerminalPage('desktop');
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
    expect({ x: resized.x, y: resized.y }).toEqual({ x: moved.x, y: moved.y });

    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    expect(await page.locator(WINDOW).isHidden()).toBe(true);
    expect(await page.locator(DOCK_ITEM).getAttribute('aria-label')).toBe('Terminal, minimized');
    await page.locator(DOCK_ITEM).click();
    await settle(page);
    expect(await box(page, WINDOW)).toEqual(resized);
    expect(await frontWindow(page)).toBe('terminal');

    await page.getByRole('button', { name: 'Maximize Terminal' }).click();
    await settle(page);
    expect(await page.locator(WINDOW).getAttribute('data-maximized')).toBe('');
    expect(await box(page, WINDOW)).toEqual(await box(page, '#os .desktop-area'));
    await page.getByRole('button', { name: 'Restore Terminal' }).click();
    await settle(page);
    expect(await page.locator(WINDOW).getAttribute('data-maximized')).toBeNull();
    expect(await box(page, WINDOW)).toEqual(resized);

    await page.getByRole('button', { name: 'Close Terminal' }).click();
    await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
    expect(await page.locator(DOCK_ITEM).getAttribute('aria-label')).toBe('Terminal');
    expect(await page.locator(CV).isVisible()).toBe(true);
  });

  test('at 375 × 812 it opens full screen, with a header showing its name and Home', async () => {
    const page = await openTerminalPage('mobile');
    const view = page.locator(VIEW);
    expect(await view.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    expect((await view.locator('.app-title').textContent())?.trim()).toBe('Terminal');
    expect(await view.getByRole('button', { name: 'Home' }).isVisible()).toBe(true);
    expect(await view.locator('.terminal').count()).toBe(1);
  });
});

// Focus is in the command line, named Command, inside a window or view
// named Terminal (FR-004).
async function expectReady(page: Page, container: string, step: string): Promise<void> {
  await expect.poll(() => commandLineFocused(page), { message: step }).toBe(true);
  const [named] = await axNodes(page, container);
  expect(named?.name, step).toMatch(/^Terminal/);
  const [input] = await axNodes(page, COMMAND_LINE);
  expect(input?.name, step).toBe('Command');
}

// A click in the part of the CV window the Terminal leaves uncovered.
async function focusCv(page: Page): Promise<void> {
  await page.mouse.click(300, 300);
  await expect.poll(() => page.locator(CV).getAttribute('aria-current')).toBe('true');
}

describe('006-terminal-FR-004: opening the Terminal puts focus in its command line', () => {
  test('from the dock', async () => {
    const page = await openTerminalPage('desktop');
    await expectReady(page, WINDOW, 'dock');
  });

  test('from the Window menu', async () => {
    const page = await openTerminalPage('desktop');
    await focusCv(page);
    await page.click('#menu-title-window');
    await page.getByRole('menuitemradio', { name: /^Terminal/ }).click();
    await settle(page);
    await expectReady(page, WINDOW, 'Window menu');
  });

  test('with Alt+Shift+N', async () => {
    const page = await openTerminalPage('desktop');
    await focusCv(page);
    await page.locator(`${CV} .window-title`).focus();
    await page.keyboard.press('Alt+Shift+N');
    await settle(page);
    await expectReady(page, WINDOW, 'Alt+Shift+N');
  });

  test('restored from the dock', async () => {
    const page = await openTerminalPage('desktop');
    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    await page.locator(DOCK_ITEM).click();
    await settle(page);
    await expectReady(page, WINDOW, 'dock restore');
  });

  test('from the home screen', async () => {
    const page = await openShell(SHELL_PAGE.mobile);
    await openTerminal(page, 'mobile');
    await expectReady(page, VIEW, 'home screen');
  });
});
