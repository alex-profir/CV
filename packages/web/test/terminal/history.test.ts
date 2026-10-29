// The command history (FR-020): Up and Down step through what was run,
// newest first, and `history` lists it, oldest first.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { COMMAND_LINE, historyRows, openTerminalPage, runCount, runGroup } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const value = (page: Page) => page.locator(COMMAND_LINE).inputValue();

describe('006-terminal-FR-020: Up and Down step through the commands run, and history lists them', () => {
  test('after work and skills, Up twice gives work, Down gives skills, Down again the saved draft', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'work');
    await runGroup(page, 'skills');
    const runs = await runCount(page);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('proj');
    await page.keyboard.press('ArrowUp');
    expect(await value(page)).toBe('skills');
    await page.keyboard.press('ArrowUp');
    expect(await value(page)).toBe('work');
    await page.keyboard.press('ArrowUp');
    expect(await value(page)).toBe('work');
    await page.keyboard.press('ArrowDown');
    expect(await value(page)).toBe('skills');
    await page.keyboard.press('ArrowDown');
    expect(await value(page)).toBe('proj');
    await page.keyboard.press('ArrowDown');
    expect(await value(page)).toBe('proj');
    // Stepping runs nothing.
    expect(await runCount(page)).toBe(runs);
  });

  test('Up with no history changes nothing', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.press('ArrowUp');
    expect(await value(page)).toBe('');
    await page.keyboard.type('ab');
    await page.keyboard.press('ArrowUp');
    expect(await value(page)).toBe('ab');
    await page.keyboard.press('ArrowDown');
    expect(await value(page)).toBe('ab');
    expect(await runCount(page)).toBe(0);
  });

  test('history lists the commands run, oldest first, numbered from 1', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'work');
    await runGroup(page, 'skills');
    await runGroup(page, 'Help ');
    expect(await historyRows(page)).toEqual([
      { number: 1, line: 'work' },
      { number: 2, line: 'skills' },
      { number: 3, line: 'Help' },
      { number: 4, line: 'history' },
    ]);
  });
});
