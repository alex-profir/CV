// The Terminal in forced colors and with reduced transparency (FR-033,
// research R19): every part outlined in system colors, the cursor in
// Highlight, nothing shown by a background alone; the glass made solid.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { forcedColorsProblems } from '../../../../tools/site-check/src/parts/modes.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminal, openVimView, runGroup, SHELL_PAGE } from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const WINDOW = '#os .window[data-view="terminal"]';

// A system color as the browser computes it.
const systemColor = (page: Page, color: string) =>
  page.evaluate((value) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = value;
    document.body.append(probe);
    const computed = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return computed;
  }, color);

// Each matching element's top border: style and width.
const borders = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((list) => list.filter((element) => element.getClientRects().length > 0).map((element) => ({ style: getComputedStyle(element).borderTopStyle, width: Number.parseFloat(getComputedStyle(element).borderTopWidth), name: element.getAttribute('aria-label') ?? element.className })));

async function expectBorders(page: Page, selector: string, label: string): Promise<void> {
  const list = await borders(page, selector);
  expect(list.length, label).toBeGreaterThan(0);
  for (const each of list) {
    expect(each.style, `${label} ${each.name}`).toBe('solid');
    expect(each.width, `${label} ${each.name}`).toBeGreaterThan(0);
  }
}

async function forcedPage(shell: TerminalShell): Promise<Page> {
  const page = await openShell({ ...SHELL_PAGE[shell], forcedColors: 'active' });
  await openTerminal(page, shell);
  return page;
}

describe('006-terminal-FR-033: with forced colors every part of the Terminal shows', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`in the ${shell} shell: the frame, chips, keys and fold lines have borders, the command line none, and the cursor is Highlight`, async () => {
      const page = await forcedPage(shell);
      await runGroup(page, 'help');
      await expectBorders(page, shell === 'desktop' ? WINDOW : '#os .pocket-screen', 'frame');
      await expectBorders(page, '.terminal button.command-chip', 'chips');
      // The cursor is the command line's indicator: no box (FR-072).
      for (const each of await borders(page, '.terminal :is(.command-field, input.command-line)')) expect(each.style, each.name).toBe('none');
      if (shell === 'mobile') await expectBorders(page, '#os .pocket-key', 'keys');
      const highlight = await systemColor(page, 'Highlight');
      expect(await page.locator('.terminal .cursor-block').evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(highlight);
      expect(await forcedColorsProblems(page, '/'), shell).toEqual([]);
      await openVimView(page);
      await settle(page);
      await expectBorders(page, '.terminal button.vim-fold', 'fold lines');
      expect(await page.locator('.terminal .vim-cursor').first().evaluate((element) => getComputedStyle(element).backgroundColor)).toBe(highlight);
      expect(await forcedColorsProblems(page, '/'), `${shell}, vim view`).toEqual([]);
    });
  }

  test('focus outlines show on a chip and a fold line; the command line has none, its cursor showing focus', async () => {
    const page = await forcedPage('desktop');
    const outline = () => page.evaluate(() => {
      const style = getComputedStyle(document.activeElement!);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth), what: document.activeElement!.className };
    });
    await page.locator(COMMAND_LINE).evaluate((element) => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions));
    expect((await outline()).style).toBe('none');
    for (const target of ['.terminal .starter button.command-chip']) {
      await page.locator(target).first().evaluate((element) => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions));
      const shown = await outline();
      expect(shown.style, shown.what).not.toBe('none');
      expect(shown.width, shown.what).toBeGreaterThan(0);
    }
    await openVimView(page);
    await page.locator('.terminal button.vim-fold').first().evaluate((element) => (element as HTMLElement).focus({ focusVisible: true } as FocusOptions));
    const fold = await outline();
    expect(fold.style).not.toBe('none');
    expect(fold.width).toBeGreaterThan(0);
  });
});

describe('006-terminal-FR-033: the amendment’s parts in forced colors', () => {
  // An element's colors and edges, or its ::selection's.
  const look = (page: Page, selector: string, pseudo?: string) =>
    page.locator(selector).first().evaluate((element, which) => {
      const style = getComputedStyle(element, which ?? null);
      return { background: style.backgroundColor, color: style.color, bottom: `${style.borderBottomStyle} ${style.borderBottomWidth} ${style.borderBottomColor}`, outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}` };
    }, pseudo);

  test('the filled and hollow cursor, a selection in the line and in the output, in the system’s colors', async () => {
    const page = await forcedPage('desktop');
    const highlight = await systemColor(page, 'Highlight');
    const text = await systemColor(page, 'HighlightText');
    await runGroup(page, 'about');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('abc');
    // The field's own selection, as a key on any system sets it.
    await page.locator(COMMAND_LINE).evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 0));
    const filled = await look(page, '.terminal .cursor-block');
    expect(filled.background).toBe(highlight);
    expect(filled.color).toBe(text);
    expect(filled.bottom).toBe(`solid 1px ${highlight}`);
    await page.locator(COMMAND_LINE).evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 3));
    const selected = await look(page, '.terminal .cursor-selected');
    expect([selected.background, selected.color]).toEqual([highlight, text]);
    const output = await look(page, '.terminal .run-output p.out-line', '::selection');
    expect([output.background, output.color]).toEqual([highlight, text]);
    await page.keyboard.press('Tab');
    const hollow = await look(page, '.terminal .cursor-block');
    expect(hollow.outline).toBe(`solid 2px ${highlight}`);
    expect(hollow.background).toMatch(/, 0\)$/);
  });

  test('the failed line’s try again chip and a stopped line show', async () => {
    const page = await openShell({ ...SHELL_PAGE.desktop, forcedColors: 'active', beforeGoto: async (opened) => void (await opened.route('**/assets/shell-*.js', (route) => route.fulfill({ status: 503, body: '' }))) });
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.waitForSelector('.terminal p.shell-failed');
    await expectBorders(page, '.terminal p.shell-failed button.command-chip', 'try again');
    expect(await forcedColorsProblems(page, '/')).toEqual([]);
    const stopped = await forcedPage('desktop');
    await runGroup(stopped, 'while true; do :; done');
    expect(await stopped.locator('.terminal p.run-stopped').isVisible()).toBe(true);
    expect(await forcedColorsProblems(stopped, '/')).toEqual([]);
  });
});

describe('006-terminal-FR-033: with reduced transparency the glass is solid', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`in the ${shell} shell, the frame is color.shell-surface with no backdrop-filter`, async () => {
      const page = await openShell({
        ...SHELL_PAGE[shell],
        beforeGoto: async (opened) => {
          const cdp = await opened.context().newCDPSession(opened);
          await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
        },
      });
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-transparency: reduce)').matches)).toBe(true);
      await openTerminal(page, shell);
      const surface = await systemColor(page, String(tokenValue('color.shell-surface')));
      const frame = shell === 'desktop' ? WINDOW : '#os .pocket';
      const style = await page.locator(frame).evaluate((element) => ({ color: getComputedStyle(element).backgroundColor, image: getComputedStyle(element).backgroundImage, filter: getComputedStyle(element).backdropFilter }));
      expect(style).toEqual({ color: surface, image: 'none', filter: 'none' });
    });
  }
});
