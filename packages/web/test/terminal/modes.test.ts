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
    test(`in the ${shell} shell: the frame, chips, keys, fold lines and command line have borders, and the cursor is Highlight`, async () => {
      const page = await forcedPage(shell);
      await runGroup(page, 'help');
      await expectBorders(page, shell === 'desktop' ? WINDOW : '#os .pocket-screen', 'frame');
      await expectBorders(page, '.terminal button.command-chip', 'chips');
      await expectBorders(page, '.terminal .command-field', 'command line');
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

  test('focus outlines show on the command line, a chip and a fold line', async () => {
    const page = await forcedPage('desktop');
    const outline = () => page.evaluate(() => {
      const style = getComputedStyle(document.activeElement!);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth), what: document.activeElement!.className };
    });
    for (const target of [COMMAND_LINE, '.terminal .greeting button.command-chip']) {
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
