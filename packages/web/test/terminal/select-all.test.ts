// Select all in the Terminal (006 FR-075, research R37): Cmd+A on macOS and
// Ctrl+A elsewhere select the Terminal's text and nothing else on the page,
// a copy of it is the text as shown, and the next letter typed clears the
// selection and goes into the command line.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { openShell } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, openTerminal, runGroup, SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SCREEN = '.terminal .terminal-screen';

// The page's selection: whether it lies inside the screen, and its text.
const selection = (page: Page) =>
  page.evaluate((selector) => {
    const chosen = document.getSelection()!;
    const screen = document.querySelector(selector)!;
    if (chosen.rangeCount === 0 || chosen.isCollapsed) return { inside: false, text: '' };
    const range = chosen.getRangeAt(0);
    return { inside: screen.contains(range.startContainer) && screen.contains(range.endContainer), text: chosen.toString() };
  }, SCREEN);

describe.each([
  ['macOS', 'Meta+A'],
  ['Windows', 'Control+A'],
] as const)('006-terminal-FR-075: select all on %s (%s)', (platform, keys) => {
  async function ready(): Promise<Page> {
    const page = await openShell({ ...SHELL_PAGE.desktop, platform });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await openTerminal(page, 'desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'work');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('abc');
    return page;
  }

  test('from the command line: the Terminal’s text only, copied as shown; a letter then types', async () => {
    const page = await ready();
    await page.keyboard.press(keys);
    const chosen = await selection(page);
    expect(chosen.inside).toBe(true);
    expect(chosen.text).toContain('Standard commands');
    expect(chosen.text).toContain('abc');
    for (const outside of ['Terminal —', 'Dock']) expect(chosen.text).not.toContain(outside);
    expect(await commandLineFocused(page)).toBe(true);
    // The system's copy of it.
    await page.evaluate(() => document.execCommand('copy'));
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('abc');
    expect(copied).not.toMatch(/abc[  ]+$/);
    expect(copied).not.toContain('█');
    expect(copied).not.toContain('help awk');
    await page.keyboard.type('d');
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('abcd');
    expect((await selection(page)).text).toBe('');
  });

  test('from the output: a control in it, focused, selects the same', async () => {
    const page = await ready();
    await page.locator('.terminal section.run').first().locator('.run-output button').first().focus();
    await page.keyboard.press(keys);
    const chosen = await selection(page);
    expect(chosen.inside).toBe(true);
    expect(chosen.text).toContain('abc');
  });
});
