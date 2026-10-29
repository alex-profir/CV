// The command line (FR-006, FR-007, FR-017, FR-018): what is typed runs on
// Enter, is echoed exactly as typed, is held to the design's limit, and is
// only ever text.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { box } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, groupText, historyRows, openTerminalPage, runCount, runGroup, typedLine, typedLines } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const MAX_LENGTH = Number(tokenValue('command-line.max-length'));

const value = (page: Page) => page.locator(COMMAND_LINE).inputValue();

// Pastes `text` into the command line through the clipboard, as a visitor
// does with the paste shortcut.
async function paste(page: Page, text: string): Promise<void> {
  const origin = new URL(page.url()).origin;
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
  await page.locator(COMMAND_LINE).focus();
  await page.evaluate((copied) => navigator.clipboard.writeText(copied), text);
  await page.keyboard.press('ControlOrMeta+V');
}

describe('006-terminal-FR-006: Enter runs the line, echoed exactly as typed, then its output and a new prompt', () => {
  test('`Help ` adds a run whose heading reads `Help `, then help’s output, then an empty prompt', async () => {
    const page = await openTerminalPage('desktop');
    const group = await runGroup(page, 'Help ');
    expect(await typedLine(group)).toBe('Help ');
    expect(await group.locator('h2.run-command .prompt').getAttribute('aria-hidden')).toBe('true');
    expect(await groupText(page, group)).toContain('Click a command to run it, or type it and press Enter.');
    expect(await group.locator('.run-output button.command-inline').count()).toBeGreaterThanOrEqual(22);
    expect(await value(page)).toBe('');
    expect(await commandLineFocused(page)).toBe(true);
    // The prompt follows the last run.
    expect(await page.evaluate(() => document.querySelector('.terminal section.run:last-of-type')!.nextElementSibling?.matches('form.prompt-line'))).toBe(true);
  });
});

describe('006-terminal-FR-007: an empty line gives a new prompt and nothing else', () => {
  test('Enter on an empty line adds no output and no message, and nothing to history', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'pwd');
    const before = await runCount(page);
    const status = await page.locator('.terminal .terminal-status').textContent();
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.type('   ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const after = await runCount(page);
    expect(after - before).toBeLessThanOrEqual(2);
    // Any run an empty line adds holds no output.
    const added = await page.locator('.terminal section.run').evaluateAll((runs, from) => runs.slice(from).map((run) => run.querySelector('.run-output')?.textContent?.trim() ?? ''), before);
    expect(added.every((text) => text === '')).toBe(true);
    expect(await page.locator('.terminal .terminal-status').textContent()).toBe(status);
    expect((await historyRows(page)).map((row) => row.line)).toEqual(['pwd', 'history']);
  });
});

describe('006-terminal-FR-017: the command line holds at most the design’s limit', () => {
  test('its maxlength is command-line.max-length, and typing or pasting past it keeps 500 characters', async () => {
    const page = await openTerminalPage('desktop');
    expect(MAX_LENGTH).toBe(500);
    expect(await page.locator(COMMAND_LINE).getAttribute('maxlength')).toBe(String(MAX_LENGTH));
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('a'.repeat(600));
    expect(await value(page)).toBe('a'.repeat(MAX_LENGTH));
    await page.locator(COMMAND_LINE).fill('');
    await paste(page, 'b'.repeat(600));
    expect(await value(page)).toBe('b'.repeat(MAX_LENGTH));
  });

  test('a 500-character line wraps inside the window, typed and run', async () => {
    const page = await openTerminalPage('desktop');
    const line = 'abcd '.repeat(MAX_LENGTH / 5);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type(line);
    const screen = (await box(page, '.terminal .terminal-screen'))!;
    const mirror = (await box(page, '.terminal .prompt-line .cursor-mirror'))!;
    expect(mirror.x + mirror.width).toBeLessThanOrEqual(screen.x + screen.width + 0.5);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelectorAll('.terminal section.run').length === 1);
    const heading = (await box(page, '.terminal section.run h2.run-command'))!;
    const lineHeight = await page.locator('.terminal section.run h2.run-command').evaluate((element) => Number.parseFloat(getComputedStyle(element).lineHeight));
    expect(heading.x + heading.width).toBeLessThanOrEqual(screen.x + screen.width + 0.5);
    expect(heading.height).toBeGreaterThan(2 * lineHeight);
    expect(await page.locator('.terminal .terminal-screen').evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  });
});

describe('006-terminal-FR-018: typed and pasted text is shown as text and never runs as code', () => {
  test('markup and a URL echo as text, with no b, img or a created and no dialog', async () => {
    const page = await openTerminalPage('desktop');
    const dialogs: string[] = [];
    page.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      void dialog.dismiss();
    });
    for (const line of ['<b>hi</b>', '<img src=x onerror=alert(1)>', 'https://example.com/page']) {
      const group = await runGroup(page, line);
      expect(await typedLine(group)).toBe(line);
      expect(await group.locator('a').count(), line).toBe(0);
    }
    expect(await page.locator('.terminal b, .terminal img').count()).toBe(0);
    await page.waitForTimeout(500);
    expect(dialogs).toEqual([]);
  });

  test('a pasted `help\\nwork` becomes `help work`, and nothing runs until Enter', async () => {
    const page = await openTerminalPage('desktop');
    await paste(page, 'help\nwork');
    expect(await value(page)).toBe('help work');
    await page.waitForTimeout(300);
    expect(await runCount(page)).toBe(0);
    await page.keyboard.press('Enter');
    await expect.poll(() => typedLines(page)).toEqual(['help work']);
  });
});
