// What the Terminal keeps (FR-021): minimizing, going home and a shell
// switch keep the output, history, draft, scroll position and an open vim
// view; closing, however it is done, starts afresh.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resize, settle } from '../helpers/shell.ts';
import {
  COMMAND_LINE,
  historyRows,
  openTerminal,
  openTerminalPage,
  openVimView,
  runCount,
  runGroup,
  typedLines,
  typeLine,
  vimEntry,
  vimView,
} from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SCREEN = '.terminal .terminal-screen';
const WINDOW = '#os .window[data-view="terminal"]';
const DOCK_ITEM = '#os .dock-item[data-app="terminal"]';
const VIEW = '#os .full-screen[data-view="terminal"]';

type Kept = { lines: string[]; draft: string; scrollTop: number };

// Runs help and work, scrolls the output partway and leaves a draft.
async function fill(page: Page): Promise<Kept> {
  await runGroup(page, 'help');
  await runGroup(page, 'work');
  await page.locator(COMMAND_LINE).focus();
  await page.keyboard.type('proj');
  // The view shows work's heading; the wheel moves it up a little.
  const screen = (await page.locator(SCREEN).boundingBox())!;
  await page.mouse.move(screen.x + screen.width / 2, screen.y + screen.height / 2);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(300);
  return kept(page);
}

async function kept(page: Page): Promise<Kept> {
  return {
    lines: await typedLines(page),
    draft: await page.locator(COMMAND_LINE).inputValue(),
    scrollTop: await page.locator(SCREEN).evaluate((element) => element.scrollTop),
  };
}

async function expectKept(page: Page, before: Kept, step: string): Promise<void> {
  await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
  await settle(page);
  const after = await kept(page);
  expect(after.lines, step).toEqual(before.lines);
  expect(after.draft, step).toBe(before.draft);
  expect(before.scrollTop, step).toBeGreaterThan(0);
  expect(Math.abs(after.scrollTop - before.scrollTop), `${step}: ${after.scrollTop} for ${before.scrollTop}`).toBeLessThanOrEqual(1);
}

// The vim view's state as a visitor sees it: where the cursor is, which
// folds are open, the search's marks and the message.
const vimState = (page: Page) =>
  page.evaluate(() => {
    const view = document.querySelector('.terminal section.vim')!;
    const words = (element: Element | null) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();
    return {
      cursor: /^(\d+),(\d+)$/.exec(words(view.querySelector('.vim-position')))?.[0] ?? null,
      folds: [...view.querySelectorAll('button.vim-fold')].map((fold) => `${words(fold)} ${fold.getAttribute('aria-expanded')}`),
      marks: view.querySelectorAll('mark').length,
      current: words(view.querySelector('mark[aria-current="true"]')),
      message: words(view.querySelector('.vim-message')),
    };
  });

// Opens the vim view, moves to the work fold, opens it and searches.
async function useVim(page: Page): Promise<Awaited<ReturnType<typeof vimState>>> {
  await openVimView(page);
  await page.locator('.terminal .vim-text').focus();
  await page.keyboard.press('j');
  await page.keyboard.press('z');
  await page.keyboard.press('a');
  await vimEntry(page, '/', 'REST');
  await page.locator('.terminal .vim-text').focus();
  await page.keyboard.press('n');
  await settle(page);
  const state = await vimState(page);
  expect(state.marks).toBeGreaterThan(0);
  expect(state.current.toLowerCase()).toBe('rest');
  expect(state.folds.some((fold) => fold.endsWith('true'))).toBe(true);
  return state;
}

async function expectHistory(page: Page, lines: string[]): Promise<void> {
  expect((await historyRows(page)).map((row) => row.line)).toEqual([...lines, 'history']);
}

describe('006-terminal-FR-021: minimizing, going home and a shell switch keep the session', () => {
  test('minimize and restore keep the output, history, draft and scroll position', async () => {
    const page = await openTerminalPage('desktop');
    const before = await fill(page);
    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    expect(await page.locator(WINDOW).isHidden()).toBe(true);
    await page.locator(DOCK_ITEM).click();
    await expectKept(page, before, 'minimized and restored');
    await page.locator(COMMAND_LINE).fill('');
    await expectHistory(page, ['help', 'work']);
  });

  test('minimize and restore keep an open vim view’s cursor, folds and search', async () => {
    const page = await openTerminalPage('desktop');
    const before = await useVim(page);
    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    await page.locator(DOCK_ITEM).click();
    await vimView(page).waitFor();
    await settle(page);
    expect(await vimState(page)).toEqual(before);
  });

  test('on a phone, Home and opening the Terminal again keep the output, history, draft and scroll position', async () => {
    const page = await openTerminalPage('mobile');
    const before = await fill(page);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await openTerminal(page, 'mobile');
    await expectKept(page, before, 'home and back');
    await page.locator(COMMAND_LINE).fill('');
    await expectHistory(page, ['help', 'work']);
  });

  test('on a phone, Home and opening the Terminal again keep an open vim view’s cursor, folds and search', async () => {
    const page = await openTerminalPage('mobile');
    const before = await useVim(page);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.locator('#os .home .app-icon[data-view="terminal"]').tap();
    await vimView(page).waitFor();
    await settle(page);
    expect(await vimState(page)).toEqual(before);
  });

  test('a 1440 → 375 → 1440 resize keeps the output, history, draft and scroll position', async () => {
    const page = await openTerminalPage('desktop');
    const before = await fill(page);
    await resize(page, 375, 812);
    await page.locator(VIEW).waitFor();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    const narrow = await kept(page);
    expect(narrow.lines).toEqual(before.lines);
    expect(narrow.draft).toBe(before.draft);
    await resize(page, 1440, 900);
    await page.locator(WINDOW).waitFor();
    await expectKept(page, before, '1440 → 375 → 1440');
    await page.locator(COMMAND_LINE).fill('');
    await expectHistory(page, ['help', 'work']);
  });

  test('a 1440 → 375 → 1440 resize keeps an open vim view’s cursor, folds and search', async () => {
    const page = await openTerminalPage('desktop');
    const before = await useVim(page);
    await resize(page, 375, 812);
    await page.locator(`${VIEW} section.vim`).waitFor();
    await settle(page);
    const narrow = await vimState(page);
    expect({ ...narrow, message: '' }).toEqual({ ...before, message: '' });
    await resize(page, 1440, 900);
    await page.locator(`${WINDOW} section.vim`).waitFor();
    await settle(page);
    expect(await vimState(page)).toEqual(before);
  });
});

// The shell's own state: a variable, a function, a visitor's folder and the
// working folder (FR-021, research R27).
const SET_UP = 'X=kept; f() { echo fn; }; mkdir notes; cd work';
const READ_BACK = 'echo $X; f; ls -d ~/notes; pwd';

const printed = async (page: Page, line: string) => (await runGroup(page, line)).locator('.run-output p.out-line').allTextContents();

async function expectShellKept(page: Page, how: string): Promise<void> {
  expect(await printed(page, READ_BACK), how).toEqual(['kept', 'fn', '/home/guest/notes', '/home/guest/work']);
}

describe('006-terminal-FR-021: the shell’s variables, functions, files and working folder are kept with the session', () => {
  test('minimize and restore', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, SET_UP);
    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    await page.locator(DOCK_ITEM).click();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    await expectShellKept(page, 'minimized and restored');
  });

  test('on a phone, Home and opening the Terminal again', async () => {
    const page = await openTerminalPage('mobile');
    await runGroup(page, SET_UP);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await openTerminal(page, 'mobile');
    await expectShellKept(page, 'home and back');
  });

  test('a 1440 → 375 → 1440 resize', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, SET_UP);
    await resize(page, 375, 812);
    await page.locator(VIEW).waitFor();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    await resize(page, 1440, 900);
    await page.locator(WINDOW).waitFor();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    await expectShellKept(page, '1440 → 375 → 1440');
  });

  test('closing and opening again keeps none of them', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, SET_UP);
    await page.getByRole('button', { name: 'Close Terminal' }).click();
    await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
    await settle(page);
    await openTerminal(page, 'desktop');
    expect(await printed(page, 'echo "[$X]"')).toEqual(['[]']);
    expect((await printed(page, 'f'))[0]).toMatch(/^f: command not found\./);
    expect(await printed(page, 'ls notes')).toEqual(['ls: notes: No such file or directory']);
    expect(await printed(page, 'pwd')).toEqual(['/home/guest']);
  });
});

// Closes the Terminal one way.
const CLOSE: Record<string, (page: Page) => Promise<void>> = {
  'the close control': (page) => page.getByRole('button', { name: 'Close Terminal' }).click(),
  'the menu': async (page) => {
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: 'Close' }).click();
  },
  'Alt+Shift+W': (page) => page.keyboard.press('Alt+Shift+W'),
  exit: (page) => typeLine(page, 'exit'),
};

describe('006-terminal-FR-021: closing the Terminal starts it afresh', () => {
  for (const [way, close] of Object.entries(CLOSE)) {
    test(`closed by ${way} and opened again, it shows the starter chips, no output, no history and no draft`, async () => {
      const page = await openTerminalPage('desktop');
      await runGroup(page, 'work');
      await runGroup(page, 'pwd');
      if (way === 'Alt+Shift+W') {
        await page.locator(COMMAND_LINE).focus();
        await page.keyboard.type('draft');
      }
      // An open vim view is dropped too.
      if (way === 'the close control' || way === 'the menu') await openVimView(page);
      await close(page);
      await expect.poll(() => page.locator(WINDOW).count(), { message: way }).toBe(0);
      await settle(page);
      await openTerminal(page, 'desktop');
      expect(await vimView(page).count()).toBe(0);
      expect(await runCount(page)).toBe(0);
      expect(await page.locator('.terminal .starter').isVisible()).toBe(true);
      expect(await page.locator(COMMAND_LINE).inputValue()).toBe('');
      expect((await page.locator('#os .window[data-view="terminal"] .window-title').textContent())?.trim()).toBe('Terminal — ~');
      await page.keyboard.press('ArrowUp');
      expect(await page.locator(COMMAND_LINE).inputValue()).toBe('');
      await expectHistory(page, []);
    });
  }
});

describe('006-terminal-FR-021: an open editor is kept with the session', () => {
  const edited = async (page: Page) => {
    await typeLine(page, 'vim todo');
    await vimView(page).waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.type('ione');
    await page.keyboard.press('Escape');
    await page.keyboard.type('otwo');
    await page.keyboard.press('Escape');
  };
  const buffer = (page: Page) => page.locator('.terminal .vim-code').allTextContents();
  const status = (page: Page) => page.locator('.terminal .vim-status').textContent();

  test('minimize and restore keep the changes, the cursor and undo', async () => {
    const page = await openTerminalPage('desktop');
    await edited(page);
    const before = await status(page);
    await page.locator('#os .window[data-view="terminal"] .window-control[data-control="minimize"], #os .window[data-view="terminal"] button[aria-label^="Minimize"]').first().click();
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await vimView(page).waitFor();
    expect(await status(page)).toBe(before);
    expect(await status(page)).toContain('[+]');
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('u');
    expect(await buffer(page)).toEqual(['one']);
  });

  test('minimize and restore keep insert mode', async () => {
    const page = await openTerminalPage('desktop');
    await edited(page);
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('i');
    await page.locator('.terminal textarea.vim-insert').waitFor();
    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    await page.locator(DOCK_ITEM).click();
    await page.locator('.terminal textarea.vim-insert').waitFor();
    expect(await status(page)).toContain('-- INSERT --');
  });

  test('on a phone, Home and opening the Terminal again keep the changes, the cursor and undo', async () => {
    const page = await openTerminalPage('mobile');
    await edited(page);
    const before = await status(page);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.locator('#os .home .app-icon[data-view="terminal"]').tap();
    await vimView(page).waitFor();
    expect(await status(page)).toBe(before);
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('u');
    expect(await buffer(page)).toEqual(['one']);
  });

  test('a 1440 → 375 → 1440 resize keeps them', async () => {
    const page = await openTerminalPage('desktop');
    await edited(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await vimView(page).waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await vimView(page).waitFor();
    expect(await buffer(page)).toEqual(['one', 'two']);
    expect(await status(page)).toContain('[+]');
  });

  test('close and reopen starts afresh, the unwritten changes gone with no question', async () => {
    const page = await openTerminalPage('desktop');
    await edited(page);
    await page.getByRole('button', { name: 'Close Terminal' }).click();
    // Opening it again during the closing animation keeps the window (005 R13).
    await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
    await settle(page);
    await openTerminal(page, 'desktop');
    expect(await vimView(page).count()).toBe(0);
    await typeLine(page, 'cat todo');
    expect(await page.locator('.terminal section.run').last().textContent()).toContain('No such file');
  });
});
