// A click on the Terminal's output puts focus back in the command line
// (FR-071, research R36): on empty space, on a line of text and beside the
// starter chips, with the scroll position and the typed text kept. Links,
// controls and the vim view keep their own clicks, and a drag that selects
// text keeps its selection.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { drag, settle } from '../helpers/shell.ts';
import type { Point } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, openTerminalPage, openVimView, runCount, runGroup } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const SCREEN = '.terminal .terminal-screen';

const scrollTop = (page: Page) => page.locator(SCREEN).evaluate((screen) => screen.scrollTop);
const draft = (page: Page) => page.locator(COMMAND_LINE).inputValue();

// Focus on the dock, away from the Terminal, as a visitor's Tab leaves it.
async function focusDock(page: Page): Promise<void> {
  await page.locator('#os .dock-item[data-app="cv"]').focus();
  expect(await commandLineFocused(page)).toBe(false);
}

// The middle of the first few letters of a visible text in the output,
// outside any link or control, and a point on the same line past the end of
// its block's text.
function textPoints(page: Page): Promise<{ onText: Point; pastText: Point }> {
  return page.locator(SCREEN).evaluate((screen) => {
    const view = screen.getBoundingClientRect();
    const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement!;
      if ((node.textContent ?? '').trim().length < 4 || parent.closest('a, button, h2, .prompt-line') !== null || parent.closest('.run-output') === null) continue;
      const range = document.createRange();
      const start = (node.textContent ?? '').search(/\S/);
      range.setStart(node, start);
      range.setEnd(node, start + 3);
      const rect = range.getBoundingClientRect();
      if (rect.top < view.top + 4 || rect.bottom > view.bottom - 4) continue;
      const block = parent.closest('p, li')!;
      const whole = document.createRange();
      whole.selectNodeContents(block);
      const sameLine = [...whole.getClientRects()].filter((part) => part.top <= rect.top + 1 && part.bottom >= rect.bottom - 1);
      const textRight = Math.max(...sameLine.map((part) => part.right));
      const right = Math.min(block.getBoundingClientRect().right, view.right - 8);
      if (right - textRight < 24) continue;
      return { onText: { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, pastText: { x: (textRight + right) / 2, y: rect.y + rect.height / 2 } };
    }
    throw new Error('no text in view with room after it');
  });
}

// A Terminal with output that scrolls, scrolled part way, and `abc` typed.
async function scrolledTerminal(): Promise<Page> {
  const page = await openTerminalPage('desktop');
  for (const line of ['help', 'work', 'about']) await runGroup(page, line);
  await page.locator(SCREEN).evaluate((screen) => (screen.scrollTop = Math.floor((screen.scrollHeight - screen.clientHeight) / 2)));
  await page.locator(COMMAND_LINE).focus();
  await page.keyboard.type('abc');
  await settle(page);
  return page;
}

describe('006-terminal-FR-071: a click on the output focuses the command line', () => {
  test('on empty space and on a line of text, keeping the scroll position and the typed text', async () => {
    const page = await scrolledTerminal();
    const points = await textPoints(page);
    for (const [where, point] of Object.entries(points)) {
      await focusDock(page);
      const before = await scrollTop(page);
      await page.mouse.click(point.x, point.y);
      await settle(page);
      expect(await commandLineFocused(page), where).toBe(true);
      expect(await scrollTop(page), where).toBe(before);
      expect(await draft(page), where).toBe('abc');
    }
  });

  test('beside the starter chips', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('abc');
    await focusDock(page);
    const beside = await page.locator('.terminal .starter').evaluate((starter) => {
      const chips = [...starter.querySelectorAll('button')].map((chip) => chip.getBoundingClientRect());
      const last = chips.at(-1)!;
      const right = starter.getBoundingClientRect().right;
      return { x: (last.right + right) / 2, y: last.y + last.height / 2 };
    });
    await page.mouse.click(beside.x, beside.y);
    await settle(page);
    expect(await commandLineFocused(page)).toBe(true);
    expect(await draft(page)).toBe('abc');
    expect(await runCount(page)).toBe(0);
  });

  test('a link, a control and the vim view keep their own clicks', async () => {
    const page = await openTerminalPage('desktop');
    // A link's click is kept from leaving the page, so focus can be read.
    await page.evaluate(() => document.addEventListener('click', (event) => (event.target as Element).closest('a') && event.preventDefault(), true));
    const contact = await runGroup(page, 'contact');
    await focusDock(page);
    await contact.locator('.run-output a').first().click();
    await settle(page);
    expect(await commandLineFocused(page)).toBe(false);

    // A chip runs its own line, once.
    const before = await runCount(page);
    await page.locator('.terminal .starter button.command-chip', { hasText: 'about' }).click();
    await page.waitForFunction((count) => document.querySelectorAll('.terminal section.run').length > count, before);
    await settle(page);
    expect(await runCount(page)).toBe(before + 1);

    await openVimView(page);
    await page.locator('.terminal section.vim .vim-text').click();
    await settle(page);
    expect(await page.evaluate(() => document.activeElement?.closest('section.vim') !== null)).toBe(true);
    expect(await page.locator(COMMAND_LINE).count()).toBe(0);
  });

  test('a drag that selects output text keeps the selection and doesn’t move focus', async () => {
    const page = await openTerminalPage('desktop');
    const about = await runGroup(page, 'about');
    await focusDock(page);
    const line = (await about.locator('.run-output p.out-line').first().boundingBox())!;
    await drag(page, { x: line.x + 2, y: line.y + line.height / 2 }, { x: line.x + 102, y: line.y + line.height / 2 });
    await settle(page);
    const selection = await page.evaluate(() => document.getSelection()?.toString() ?? '');
    expect(selection.length).toBeGreaterThan(0);
    expect(await commandLineFocused(page)).toBe(false);
  });
});
