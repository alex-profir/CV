// The Playground at every window size (FR-072, wireframes A narrow window),
// in its 1040 px window, at the breakpoint and in a 600 px one:
// nothing scrolls sideways but lines of code, in the editor and the
// JavaScript and Declarations panes; below 720 px the panes go under the
// editor, 240 px tall, and the tools show only their glyphs, keeping their
// names.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { siteText } from '../../src/site-text.ts';
import { box, drag, settle } from '../helpers/shell.ts';
import { chooseExample, EDITOR, openPlaygroundPage, PLAYGROUND, run, showPane, TOOLBAR } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const WINDOW = '#os .window[data-view="playground"]';
const words = siteText.playground;
const px = (name: Parameters<typeof tokenValue>[0]) => Number.parseFloat(String(tokenValue(name)));

// Every element of the Playground that scrolls sideways, but Monaco's code
// views, and every one with text of its own reaching past the window.
const sideways = (page: Page) =>
  page.evaluate((selector) => {
    const found: string[] = [];
    const frame = document.querySelector(selector)!;
    const edge = frame.getBoundingClientRect();
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    for (const element of frame.querySelectorAll('.playground, .playground *')) {
      if (element.getClientRects().length === 0 || element.closest('.visually-hidden, [hidden], .monaco-editor') !== null) continue;
      const clipped = getComputedStyle(element).clipPath === 'inset(50%)';
      if (!clipped && element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') found.push(`${describe(element)} scrolls sideways`);
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      const rect = element.getBoundingClientRect();
      if (ownText && (rect.left < edge.left - 0.5 || rect.right > edge.right + 0.5)) found.push(`${describe(element)} reaches past the window`);
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) found.push('the page scrolls sideways');
    return found;
  }, WINDOW);

// The Playground made `width` wide, by its window's corner. The breakpoint
// is the Playground's own width, the window's content inside its border.
async function playgroundWidth(page: Page, width: number): Promise<void> {
  const shown = (await box(page, PLAYGROUND))!;
  const corner = (await box(page, `${WINDOW} .resize-se`))!;
  const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
  await drag(page, from, { x: from.x + (width - shown.width), y: from.y });
  await settle(page);
  expect(Math.round((await box(page, PLAYGROUND))!.width)).toBe(width);
}

// A run with logs, long lines in the code and its JavaScript, and a long
// error, so every pane has something to wrap or scroll.
async function fill(page: Page): Promise<void> {
  await chooseExample(page, 'Narrowing');
  await run(page);
  await showPane(page, 'logs');
}

const stacked = (page: Page) =>
  page.evaluate((root) => {
    const editor = document.querySelector(`${root} .playground-editor`)!.getBoundingClientRect();
    const side = document.querySelector(`${root} .playground-side`)!.getBoundingClientRect();
    return { under: side.top >= editor.bottom - 0.5, height: side.height, width: side.width };
  }, PLAYGROUND);

// Each tool's visible label width and its accessible name.
const tools = (page: Page) =>
  page.locator(`${TOOLBAR} .button.tool`).evaluateAll((list) =>
    list.map((button) => {
      const label = [...button.querySelectorAll('span')].find((span) => (span.textContent ?? '').trim() !== '');
      return { label: label === undefined ? 0 : label.getBoundingClientRect().width, glyphs: button.querySelectorAll('svg').length };
    }),
  );

describe('008-typescript-playground-FR-072: the Playground reads without horizontal scrolling at every size', () => {
  test('in its 1040 px window the panes are beside the editor, 400 px wide, and the tools show their names', async () => {
    const page = await openPlaygroundPage();
    expect(Math.round((await box(page, WINDOW))!.width)).toBe(1040);
    await fill(page);
    expect(await sideways(page)).toEqual([]);
    const layout = await stacked(page);
    expect(layout.under).toBe(false);
    expect(layout.width).toBe(px('size.playground-side'));
    for (const tool of await tools(page)) expect(tool.label).toBeGreaterThan(1);
  });

  for (const width of [720, 719, 600]) {
    test(`${width} px wide: ${width < px('breakpoint.playground-stack') ? 'the panes are under the editor, 240 px tall, and the tools are glyphs keeping their names' : 'the panes are still beside the editor'}`, async () => {
      const page = await openPlaygroundPage();
      await playgroundWidth(page, width);
      await fill(page);
      for (const pane of ['javascript', 'declarations', 'errors', 'logs'] as const) {
        await showPane(page, pane);
        expect(await sideways(page), `${width} px, ${pane}`).toEqual([]);
      }
      const layout = await stacked(page);
      if (width >= px('breakpoint.playground-stack')) {
        expect(layout.under).toBe(false);
        return;
      }
      expect(layout.under).toBe(true);
      expect(layout.height).toBe(px('size.playground-stacked-side'));
      for (const tool of await tools(page)) {
        expect(tool.label).toBeLessThanOrEqual(1);
        expect(tool.glyphs).toBeGreaterThan(0);
      }
      for (const name of [words.tools.examples, words.tools.options, words.tools.share]) {
        await expect.poll(() => page.getByRole('button', { name, exact: true }).count(), { message: name }).toBe(1);
      }
    });
  }

  test('at 200% zoom of a 2560 × 1440 screen, nothing but code scrolls sideways', async () => {
    const page = await openPlaygroundPage({ width: 1280, height: 720, deviceScaleFactor: 2 });
    await fill(page);
    for (const pane of ['javascript', 'declarations', 'errors', 'logs'] as const) {
      await showPane(page, pane);
      expect(await sideways(page), pane).toEqual([]);
    }
    // Code lines may scroll: the editor's own view is the one that does.
    expect(await page.locator(`${EDITOR} .monaco-editor`).count()).toBe(1);
  });
});
