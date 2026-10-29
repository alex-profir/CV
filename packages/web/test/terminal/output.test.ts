// The starter controls and the output (FR-005, FR-019): the chips before
// the prompt and no greeting text, and output that stays, scrolls inside
// the Terminal and shows each new run.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { fixture } from '../helpers/fixtures.ts';
import { box, openShell, settle } from '../helpers/shell.ts';
import type { Box } from '../helpers/shell.ts';
import {
  commandLineFocused,
  fixtureBuild,
  openTerminal,
  openTerminalPage,
  quitVim,
  runCount,
  runGroup,
  SHELL_PAGE,
  typeLine,
  typedLine,
  typedLines,
  vimView,
} from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 240_000 });

const SCREEN = '.terminal .terminal-screen';

// The starter controls before the prompt.
const starter = (page: Page) => page.locator('.terminal .starter');

// Every text node in the Terminal's screen before the prompt, whitespace
// collapsed, the empty ones left out.
const textBeforePrompt = (page: Page) =>
  page.evaluate(() => {
    const screen = document.querySelector('.terminal .terminal-screen')!;
    const prompt = screen.querySelector('form.prompt-line')!;
    const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      if (!(prompt.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_PRECEDING)) continue;
      if (prompt.contains(node)) continue;
      const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
      if (text !== '') texts.push(text);
    }
    return texts;
  });

const STARTER = ['help', 'about', 'work', 'projects', 'cv'];

describe('006-terminal-FR-005: the Terminal opens on its starter controls and the prompt, with no greeting text', () => {
  test('5 chips that run help, about, work, projects and cv, and no other text before the prompt', async () => {
    const { url } = await fixtureBuild('every-field');
    const page = await openShell({ ...SHELL_PAGE.desktop, url });
    await openTerminal(page, 'desktop');
    expect(siteText.terminal.starter).toEqual(STARTER);
    const chips = starter(page).locator('button.command-chip');
    expect(await chips.evaluateAll((list) => list.map((chip) => chip.getAttribute('aria-label')))).toEqual(STARTER);
    expect(await starter(page).locator('button, a').count()).toBe(5);
    expect(await textBeforePrompt(page)).toEqual(STARTER);
    // The chips come before the prompt.
    expect(await page.evaluate(() => document.querySelector('.terminal .starter')!.compareDocumentPosition(document.querySelector('.terminal form.prompt-line')!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();

    for (const line of ['help', 'about', 'work', 'projects']) {
      const before = await runCount(page);
      await starter(page).locator(`button.command-chip[aria-label="${line}"]`).click();
      await expect.poll(() => runCount(page)).toBe(before + 1);
      expect(await typedLine(page.locator('.terminal section.run').last())).toBe(line);
    }
    await starter(page).locator('button.command-chip[aria-label="cv"]').click();
    await vimView(page).waitFor();
    await quitVim(page);
    expect((await typedLines(page)).at(-1)).toBe('cv');
  });

  for (const name of ['three-projects', 'no-name'] as const) {
    test(`006-terminal-FR-030: with the ${name} fixture, only the chips come before the prompt, and no name or label is shown`, async () => {
      const { url } = await fixtureBuild(name);
      const { basics } = fixture(name);
      const page = await openShell({ ...SHELL_PAGE.desktop, url });
      await openTerminal(page, 'desktop');
      const texts = await textBeforePrompt(page);
      expect(texts).toEqual(STARTER);
      for (const shown of [basics?.name, basics?.label, siteText.siteHeading]) if (shown !== undefined && shown !== '') expect(texts.join(' ')).not.toContain(shown);
    });
  }

  test('clear and the menu’s Clear output remove the starter chips', async () => {
    const page = await openTerminalPage('desktop');
    expect(await starter(page).count()).toBe(1);
    await typeLine(page, 'clear');
    await expect.poll(() => starter(page).count()).toBe(0);
    await page.getByRole('button', { name: 'Close Terminal' }).click();
    await expect.poll(() => page.locator('#os .window[data-view="terminal"]').count()).toBe(0);
    await openTerminal(page, 'desktop');
    expect(await starter(page).count()).toBe(1);
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: 'Clear output' }).click();
    await expect.poll(() => starter(page).count()).toBe(0);
  });
});

const inside = (inner: Box, outer: Box) => inner.y >= outer.y - 1 && inner.y + inner.height <= outer.y + outer.height + 1;

const scrollTop = (page: Page) => page.locator(SCREEN).evaluate((element) => element.scrollTop);
const documentScroll = (page: Page) => page.evaluate(() => ({ x: window.scrollX, y: window.scrollY, root: document.scrollingElement?.scrollTop ?? 0 }));

describe('006-terminal-FR-019: output stays, scrolls inside the Terminal, and each run shows', () => {
  test('output stays until clear, Clear output or closing', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'about');
    await runGroup(page, 'work');
    await runGroup(page, 'pwd');
    expect(await typedLines(page)).toEqual(['about', 'work', 'pwd']);
    expect(await page.locator('.terminal .starter').count()).toBe(1);

    await typeLine(page, 'clear');
    await expect.poll(() => runCount(page)).toBe(0);
    expect(await page.locator('.terminal .starter').count()).toBe(0);
    expect(await page.locator('.terminal form.prompt-line').count()).toBe(1);

    await runGroup(page, 'about');
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: 'Clear output' }).click();
    await expect.poll(() => runCount(page)).toBe(0);

    await runGroup(page, 'about');
    await page.getByRole('button', { name: 'Close Terminal' }).click();
    await expect.poll(() => page.locator('#os .window[data-view="terminal"]').count()).toBe(0);
    await openTerminal(page, 'desktop');
    expect(await runCount(page)).toBe(0);
    expect(await page.locator('.terminal .starter').count()).toBe(1);
  });

  test('the wheel scrolls the output, never the document', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await settle(page);
    const screen = (await box(page, SCREEN))!;
    await page.mouse.move(screen.x + screen.width / 2, screen.y + screen.height / 2);
    const before = await scrollTop(page);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollTop(page)).toBeGreaterThan(before);
    await page.mouse.wheel(0, 100_000);
    await page.mouse.wheel(0, 100_000);
    await page.mouse.wheel(0, -200_000);
    await page.waitForTimeout(300);
    expect(await documentScroll(page)).toEqual({ x: 0, y: 0, root: 0 });
    expect(await page.locator(SCREEN).evaluate((element) => getComputedStyle(element).overflowY)).toMatch(/auto|scroll/);
  });

  test('after help its heading is at the top of the view; after pwd the new prompt is in view', async () => {
    const page = await openTerminalPage('desktop');
    const help = await runGroup(page, 'help');
    const screen = (await box(page, SCREEN))!;
    const padding = await page.locator(SCREEN).evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingTop));
    // Longer than the view, so the view starts at the command.
    expect(await page.locator(SCREEN).evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
    await expect
      .poll(async () => {
        const heading = (await help.locator('h2.run-command').boundingBox())!;
        return heading.y >= screen.y - 1 && heading.y <= screen.y + padding + 2;
      })
      .toBe(true);

    await runGroup(page, 'pwd');
    await expect.poll(async () => inside((await page.locator('.terminal form.prompt-line').boundingBox())!, screen)).toBe(true);
  });

  test('scrolled up, a control moves the view to the new run', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'work');
    const screen = (await box(page, SCREEN))!;
    await page.mouse.move(screen.x + screen.width / 2, screen.y + screen.height / 2);
    await page.mouse.wheel(0, -200_000);
    await expect.poll(() => scrollTop(page)).toBe(0);
    await page.locator('.terminal .starter button.command-chip[aria-label="about"]').click();
    await expect.poll(() => runCount(page)).toBe(3);
    const added = page.locator('.terminal section.run').last();
    expect(await typedLine(added)).toBe('about');
    await expect
      .poll(async () => {
        const heading = (await added.locator('h2.run-command').boundingBox())!;
        return heading.y >= screen.y - 1 && heading.y < screen.y + screen.height;
      })
      .toBe(true);
    await expect.poll(() => commandLineFocused(page)).toBe(true);
  });
});
