// The greeting and the output (FR-005, FR-019): the design's words with the
// CV's name, and output that stays, scrolls inside the Terminal and shows
// each new run.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
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

// The greeting's paragraphs, their whitespace collapsed.
const greetingLines = (page: Page) =>
  page.locator('.terminal .greeting > p').evaluateAll((paragraphs) => paragraphs.map((paragraph) => (paragraph.textContent ?? '').replace(/\s+/g, ' ').trim()));

describe('006-terminal-FR-005: the greeting says what the Terminal is, with the CV’s name, and offers commands', () => {
  test('the design’s site text with the fixture CV’s name and label, then 5 chips that run help, about, work, projects and cv', async () => {
    const { url } = await fixtureBuild('every-field');
    const { basics } = fixture('every-field');
    const page = await openShell({ ...SHELL_PAGE.desktop, url });
    await openTerminal(page, 'desktop');
    const { greeting } = siteText.terminal;
    expect(await greetingLines(page)).toEqual([greeting.desktop.status, fill(greeting.name, { name: basics!.name!, label: basics!.label! }), fill(greeting.desktop.intro, { help: 'help' })]);
    const intro = page.locator('.terminal .greeting > p button.command-inline');
    expect(await intro.evaluateAll((list) => list.map((control) => control.getAttribute('aria-label')))).toEqual(['help']);
    const chips = page.locator('.terminal .greeting .chips button.command-chip');
    expect(await chips.evaluateAll((list) => list.map((chip) => chip.getAttribute('aria-label')))).toEqual(['help', 'about', 'work', 'projects', 'cv']);
    // The greeting comes before the prompt.
    expect(await page.evaluate(() => document.querySelector('.terminal .greeting')!.compareDocumentPosition(document.querySelector('.terminal form.prompt-line')!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();

    for (const line of ['help', 'about', 'work', 'projects']) {
      const before = await runCount(page);
      await page.locator(`.terminal .greeting .chips button.command-chip[aria-label="${line}"]`).click();
      await expect.poll(() => runCount(page)).toBe(before + 1);
      expect(await typedLine(page.locator('.terminal section.run').last())).toBe(line);
    }
    await page.locator('.terminal .greeting .chips button.command-chip[aria-label="cv"]').click();
    await vimView(page).waitFor();
    await quitVim(page);
    expect((await typedLines(page)).at(-1)).toBe('cv');
  });

  test('with the no-name fixture, the name line shows the site heading', async () => {
    const { url } = await fixtureBuild('no-name');
    const { basics } = fixture('no-name');
    const page = await openShell({ ...SHELL_PAGE.desktop, url });
    await openTerminal(page, 'desktop');
    const [, name] = await greetingLines(page);
    // The site heading stands for the missing name: `CV — {label}` (or the
    // heading alone).
    expect([siteText.siteHeading, fill(siteText.terminal.greeting.name, { name: siteText.siteHeading, label: basics!.label! })]).toContain(name);
    expect(name).not.toMatch(/undefined|null|\{/);
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
    expect(await page.locator('.terminal .greeting').count()).toBe(1);

    await typeLine(page, 'clear');
    await expect.poll(() => runCount(page)).toBe(0);
    expect(await page.locator('.terminal .greeting').count()).toBe(0);
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
    expect(await page.locator('.terminal .greeting').count()).toBe(1);
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
    await page.locator('.terminal .greeting .chips button.command-chip[aria-label="about"]').click();
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
