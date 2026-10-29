// The Terminal's output at every width (FR-023): long words and links wrap
// with no horizontal scroll, `ls` folds to one name a line, text can be
// selected and copied, and `cv`'s lines wrap at 200% text zoom.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { zoomText } from '../../../../tools/site-check/src/parts/layout.ts';
import { box, drag, openShell, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, fixtureBuild, openTerminal, openVimView, runGroup, SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const WINDOW = '#os .window[data-view="terminal"]';
const SCREEN = '.terminal .terminal-screen';

// Each element in the Terminal that scrolls sideways or reaches past it.
const sideways = (page: Page) =>
  page.evaluate(() => {
    const terminal = document.querySelector('#os .terminal')!;
    const edge = terminal.getBoundingClientRect();
    const found: string[] = [];
    for (const element of [terminal, ...terminal.querySelectorAll('*')]) {
      if (element.closest('.visually-hidden') !== null || element.getClientRects().length === 0) continue;
      const what = `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
      if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') found.push(`${what} scrolls sideways`);
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || (rect.right <= edge.right + 0.5 && rect.left >= edge.left - 0.5)) continue;
      // A space that ends a wrapped line hangs past it unseen: only a
      // character that shows counts.
      const past = [...element.childNodes].some((node) => {
        if (node.nodeType !== Node.TEXT_NODE) return false;
        const text = node.textContent ?? '';
        for (let at = 0; at < text.length; at += 1) {
          if (text[at]!.trim() === '') continue;
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + 1);
          if ([...range.getClientRects()].some((box) => box.right > edge.right + 0.5 || box.left < edge.left - 0.5)) return true;
        }
        return false;
      });
      if (past || element.childNodes.length === 0) found.push(`${what} reaches past the Terminal`);
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) found.push('the document scrolls sideways');
    return found;
  });

// A 400 px wide Terminal window, narrowed by its corner.
async function narrowWindow(page: Page): Promise<void> {
  const corner = (await box(page, `${WINDOW} .resize-se`))!;
  const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
  await drag(page, from, { x: from.x - 500, y: from.y });
  expect((await box(page, WINDOW))!.width).toBe(400);
  await page.locator(COMMAND_LINE).focus();
}

const COMMANDS = ['about', 'work', 'projects', 'education', 'skills', 'contact', 'site', 'specs', 'ls', 'cat cv.json | jq'];

describe('006-terminal-FR-023: output wraps, with no horizontal scroll', () => {
  test('with the long-words fixture in a 400 px window, every command’s output wraps inside it', async () => {
    const { url } = await fixtureBuild('long-words');
    const page = await openShell({ ...SHELL_PAGE.desktop, url });
    await openTerminal(page, 'desktop');
    await narrowWindow(page);
    for (const line of COMMANDS) {
      await runGroup(page, line);
      expect(await sideways(page), line).toEqual([]);
    }
    // A long link wraps over more than one line rather than overflowing.
    const links = await page.locator(`${SCREEN} a[href]`).evaluateAll((list) => list.map((link) => link.getClientRects().length > 1 || link.getBoundingClientRect().height > Number.parseFloat(getComputedStyle(link).lineHeight) * 1.5));
    expect(links.some(Boolean)).toBe(true);
  });

  test('with the long-words fixture at 320 px, every command’s output wraps inside the pocket’s screen', async () => {
    const { url } = await fixtureBuild('long-words');
    const page = await openShell({ ...SHELL_PAGE.mobile, width: 320, height: 568, url });
    await openTerminal(page, 'mobile');
    for (const line of COMMANDS) {
      await runGroup(page, line);
      expect(await sideways(page), line).toEqual([]);
    }
  });

  test('ls on a long folder at 320 px shows one name a line', async () => {
    // specs/: every spec's file, named by its long folder name.
    const page = await openShell({ ...SHELL_PAGE.mobile, width: 320, height: 568 });
    await openTerminal(page, 'mobile');
    const listing = await runGroup(page, 'ls specs');
    const tops = await listing.locator('.run-output .out-columns > *').evaluateAll((list) => list.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(tops.length).toBeGreaterThan(1);
    expect(new Set(tops).size).toBe(tops.length);
    expect(await sideways(page)).toEqual([]);
  });

  test('a mouse drag selects output text and copies it, and focus stays where it was', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openTerminal(page, 'desktop');
    const about = await runGroup(page, 'about');
    await page.evaluate(() => {
      (window as unknown as { copied: string }).copied = '';
      document.addEventListener('copy', () => ((window as unknown as { copied: string }).copied = document.getSelection()?.toString() ?? ''));
    });
    const text = (await about.locator('.run-output p').first().boundingBox())!;
    await drag(page, { x: text.x + 2, y: text.y + text.height / 2 }, { x: text.x + text.width - 2, y: text.y + text.height / 2 });
    const selected = await page.evaluate(() => document.getSelection()?.toString() ?? '');
    expect(selected.trim().length).toBeGreaterThan(5);
    expect(await commandLineFocused(page)).toBe(false);
    await page.keyboard.press('ControlOrMeta+c');
    expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(selected);
  });

  test('at 200% text zoom, cv’s lines wrap within the window (US6 scenario 4)', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openTerminal(page, 'desktop');
    await openVimView(page);
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('z');
    await page.keyboard.press('Shift+R');
    await zoomText(page, 2);
    await settle(page);
    expect(await sideways(page)).toEqual([]);
    const wrapped = await page.locator('.terminal .vim-code').evaluateAll((list) => list.filter((code) => code.getClientRects().length > 1 || code.getBoundingClientRect().height > Number.parseFloat(getComputedStyle(code).lineHeight) * 1.5).length);
    expect(wrapped).toBeGreaterThan(0);
  });
});
