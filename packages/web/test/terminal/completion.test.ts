// Tab on the real build (006 FR-076, research R44): the line after Tab, a
// second Tab's list as output, the question at 100 matches, an answer that
// arrives after another key dropped, and undo taking a completion back.
import type { Page } from 'playwright';
import { describe, expect, test, vi } from 'vitest';
import { openShell } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, linesRun, openTerminalLoading, openTerminalPage, SHELL_PAGE, typeLine } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const value = (page: Page) => page.locator(COMMAND_LINE).inputValue();
const caret = (page: Page) => page.locator(COMMAND_LINE).evaluate((input: HTMLInputElement) => input.selectionStart);

describe('006-terminal-FR-076: Tab completes as bash does', () => {
  test('ab gives about with the caret after the space and focus kept; cat cv gives cat cv.json', async () => {
    const page = await openTerminalPage('desktop');
    await page.keyboard.type('ab');
    await page.keyboard.press('Tab');
    await expect.poll(() => value(page)).toBe('about ');
    expect(await caret(page)).toBe(6);
    expect(await commandLineFocused(page)).toBe(true);
    await page.locator(COMMAND_LINE).fill('cat cv');
    await page.keyboard.press('Tab');
    await expect.poll(() => value(page)).toBe('cat cv.json ');
  });

  test('a second Tab lists the names as output, not in the history, then the prompt with the line as it was', async () => {
    const page = await openTerminalPage('desktop');
    await typeLine(page, 'mkdir notes && touch todo');
    await linesRun(page);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('cat ~/');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    const list = page.locator('section.run .completion-list');
    await list.waitFor();
    expect(await page.locator('section.run').last().locator('.run-line').innerText()).toBe('cat ~/');
    const text = await list.innerText();
    expect(text).toContain('notes/');
    expect(text).toContain('todo');
    expect(await list.locator('button, a').count()).toBe(0);
    expect(await value(page)).toBe('cat ~/');
    expect(await caret(page)).toBe(6);
    await typeLine(page, 'history');
    await linesRun(page);
    const history = await page.locator('section.run').last().locator('.run-output').innerText();
    expect(history).not.toContain('cat ~/');
  });

  test('100 matches ask first: y lists them; another key adds nothing and brings the prompt back', async () => {
    const page = await openTerminalPage('desktop');
    await typeLine(page, 'mkdir h && touch h/f{1..100}');
    await linesRun(page);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('ls h/f');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await page.locator('.terminal-screen').getByText('Display all 100 possibilities? (y or n)').waitFor();
    await page.keyboard.press('n');
    expect(await value(page)).toBe('ls h/f');
    expect(await page.locator('.completion-list').count()).toBe(0);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    await page.keyboard.press('Tab');
    await expect.poll(() => page.locator('.terminal-screen').getByText('Display all 100 possibilities? (y or n)').count()).toBe(2);
    await page.keyboard.press('y');
    await page.locator('.completion-list').waitFor();
    expect(await value(page)).toBe('ls h/f');
    expect(await page.locator('.completion-list span').count()).toBe(100);
  });

  test('a key typed while the answer is on its way wins', async () => {
    const page = await openTerminalPage('desktop');
    await page.keyboard.type('ab');
    await page.keyboard.down('Tab');
    await page.keyboard.up('Tab');
    await page.keyboard.type('x');
    await page.waitForTimeout(300);
    expect(await value(page)).toBe('abx');
  });

  test('the system’s undo takes a completion back', async () => {
    const page = await openTerminalPage('desktop');
    await page.keyboard.type('ab');
    await page.keyboard.press('Tab');
    await expect.poll(() => value(page)).toBe('about ');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    await expect.poll(() => value(page)).toBe('ab');
  });

  test('Tab while the shell loads does nothing and focus stays', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const release = await openTerminalLoading(page, 'desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('ab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);
    expect(await value(page)).toBe('ab');
    expect(await commandLineFocused(page)).toBe(true);
    await release();
  });
});
