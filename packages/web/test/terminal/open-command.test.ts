// `open` and `exit` act on the shell (FR-014; US1 scenarios 10 and 11, US5
// scenario 7): `open cv` and `open about` as the dock and the site menu do,
// and `exit` as the close control does.
import { describe, expect, test, vi } from 'vitest';
import { box, focusedElement, frontWindow, openShell, settle } from '../helpers/shell.ts';
import { openTerminal, openTerminalPage, runGroup, SHELL_PAGE, typeLine, typedLines } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const CV = '#os .window[data-view="cv"]';
const ABOUT = '#os .window[data-view="about"]';
const TERMINAL = '#os .window[data-view="terminal"]';

describe('006-terminal-FR-014: open cv and open about open them as the shell does', () => {
  test('with the CV closed, open cv opens it in front and focused', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await page.getByRole('button', { name: 'Close CV' }).click();
    await expect.poll(() => page.locator(CV).count()).toBe(0);
    await openTerminal(page, 'desktop');
    await runGroup(page, 'open cv');
    await page.locator(CV).waitFor();
    await settle(page);
    expect(await frontWindow(page)).toBe('cv');
    expect(await page.locator(CV).getAttribute('aria-current')).toBe('true');
    await expect.poll(() => focusedElement(page)).toMatch(/^div#window-title-cv\.window-title /);
    expect(await page.locator(TERMINAL).isVisible()).toBe(true);
    expect((await typedLines(page)).at(-1)).toBe('open cv');
  });

  test('with the CV behind the Terminal, open cv brings it to the front', async () => {
    const page = await openTerminalPage('desktop');
    expect(await frontWindow(page)).toBe('terminal');
    const before = (await box(page, CV))!;
    await runGroup(page, 'open cv');
    await settle(page);
    expect(await frontWindow(page)).toBe('cv');
    expect(await page.locator(CV).getAttribute('aria-current')).toBe('true');
    expect(await page.locator(CV).count()).toBe(1);
    expect(await box(page, CV)).toEqual(before);
    await expect.poll(() => focusedElement(page)).toMatch(/^div#window-title-cv\.window-title /);
  });

  test('open about opens About this site in front and focused', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'open about');
    await page.locator(ABOUT).waitFor();
    await settle(page);
    expect(await frontWindow(page)).toBe('about');
    await expect.poll(() => focusedElement(page)).toMatch(/^div#window-title-about\.window-title /);
  });

  test('at 375 px, open cv opens the CV full screen', async () => {
    const page = await openTerminalPage('mobile');
    await typeLine(page, 'open cv');
    const view = page.locator('#os .full-screen[data-view="cv"]');
    await view.waitFor();
    await settle(page);
    expect(await view.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    expect(await page.locator('#os .full-screen[data-view="terminal"]').isVisible()).toBe(false);
    await expect.poll(() => focusedElement(page)).toMatch(/^div#app-title-cv\.app-title /);
  });
});

describe('006-terminal-FR-014: open runs inside a command line', () => {
  test('echo before && open cv shows the line’s output, then opens the CV in front', async () => {
    const page = await openTerminalPage('desktop');
    expect(await frontWindow(page)).toBe('terminal');
    const group = await runGroup(page, 'true && echo before && open cv');
    expect(await group.locator('.run-output').textContent()).toBe('before');
    await settle(page);
    expect(await frontWindow(page)).toBe('cv');
    expect((await typedLines(page)).at(-1)).toBe('true && echo before && open cv');
  });
});

const PLAYGROUND = '#os .window[data-view="playground"]';

describe('008-typescript-playground-FR-087: open playground opens the Playground as the dock does (006-terminal-FR-014)', () => {
  test('at 1440, open playground opens it in front and focused, and again brings it to the front', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'open playground');
    await page.locator(PLAYGROUND).waitFor();
    await settle(page);
    expect(await frontWindow(page)).toBe('playground');
    expect(await page.locator(PLAYGROUND).getAttribute('aria-current')).toBe('true');
    await expect.poll(() => page.evaluate((selector) => document.activeElement?.closest(selector) !== null, PLAYGROUND)).toBe(true);
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await settle(page);
    expect(await frontWindow(page)).toBe('terminal');
    const before = (await box(page, PLAYGROUND))!;
    await runGroup(page, 'open playground');
    await settle(page);
    expect(await frontWindow(page)).toBe('playground');
    expect(await page.locator(PLAYGROUND).count()).toBe(1);
    expect(await box(page, PLAYGROUND)).toEqual(before);
  });

  test('at 375 px, open playground shows the "best on desktop" screen full screen', async () => {
    const page = await openTerminalPage('mobile');
    await typeLine(page, 'open playground');
    const view = page.locator('#os .full-screen[data-view="playground"]');
    await view.waitFor();
    await settle(page);
    expect(await view.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    expect(await view.locator('section.playground-mobile').count()).toBe(1);
    expect(await page.locator('#os .full-screen[data-view="terminal"]').isVisible()).toBe(false);
  });
});

describe('006-terminal-FR-014: exit closes the Terminal as its close control does', () => {
  test('as the only window, exit closes it and focus lands on its dock item', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await page.getByRole('button', { name: 'Close CV' }).click();
    await expect.poll(() => page.locator(CV).count()).toBe(0);
    await openTerminal(page, 'desktop');
    await typeLine(page, 'exit');
    await expect.poll(() => page.locator(TERMINAL).count()).toBe(0);
    await expect.poll(() => focusedElement(page)).toMatch(/^button\.dock-item.*\[data-app=terminal\]/);
    expect(await page.locator('#os .dock-item[data-app="terminal"]').getAttribute('aria-label')).toBe('Terminal');
  });

  test('with the CV open, exit closes it and focus goes to the CV window', async () => {
    const page = await openTerminalPage('desktop');
    await typeLine(page, 'exit');
    await expect.poll(() => page.locator(TERMINAL).count()).toBe(0);
    await expect.poll(() => focusedElement(page)).toMatch(/^div#window-title-cv\.window-title /);
  });

  test('on a phone, exit goes to the home screen with focus on the Terminal icon', async () => {
    const page = await openTerminalPage('mobile');
    await typeLine(page, 'exit');
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await expect.poll(() => focusedElement(page)).toMatch(/^button\.app-icon\[data-view=terminal\]/);
  });
});
