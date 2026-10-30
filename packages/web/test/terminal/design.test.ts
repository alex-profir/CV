// The Terminal's measurable design (FR-031, design/README.md The glass,
// research R16): its font, its window's place, the glass from the tokens,
// its glyphs drawn rather than typed, and no Apple or system UI font. The
// visual comparison with design/exports/ is by hand (T108).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import { REPO_ROOT } from '../helpers/copy.ts';
import { settle } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminalPage, runGroup, typeLine, vimView } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const WINDOW = '#os .window[data-view="terminal"]';

// A token's color as the browser computes it.
const computedColor = (page: Page, value: string) =>
  page.evaluate((color) => {
    const probe = document.createElement('div');
    probe.style.color = color;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, value);

const colorToken = (name: CssVarTokenName) => String(tokenValue(name));

// A token's color as a background, as the browser computes it.
const backgroundOf = (page: Page, value: string) =>
  page.evaluate((color) => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = color;
    document.body.append(probe);
    const computed = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return computed;
  }, value);

// Fonts that belong to an operating system's UI rather than the site.
const SYSTEM_FONTS = /-apple-system|BlinkMacSystemFont|system-ui|ui-monospace|ui-sans-serif|SF Pro|SF Mono|San Francisco|Menlo|Monaco|Segoe UI|Helvetica Neue|Roboto/i;

describe('006-terminal-FR-031: the Terminal matches the approved design', () => {
  test('the amendment’s colors and widths come from the tokens', async () => {
    const page = await openTerminalPage('desktop');
    const read = (selector: string, property: 'color' | 'borderInlineStartColor' | 'borderInlineStartWidth') => page.locator(selector).first().evaluate((element, name) => getComputedStyle(element)[name], property);
    const asRgb = (value: string) =>
      page.evaluate((css) => {
        const probe = document.createElement('div');
        probe.style.color = css;
        document.body.append(probe);
        const computed = getComputedStyle(probe).color;
        probe.remove();
        return computed;
      }, value);
    await typeLine(page, 'mkdir notes');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('cat ~/');
    await page.keyboard.press('Tab');
    await settle(page);
    await page.keyboard.press('Tab');
    await page.locator('.terminal .completion-folder').first().waitFor();
    expect(await read('.terminal .completion-folder', 'color')).toBe(await asRgb(tokenValue('color.terminal-path')));
    await page.locator(COMMAND_LINE).fill('vim about');
    await page.keyboard.press('Enter');
    await vimView(page).waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('i');
    await page.locator('.terminal .vim-insert-bar').waitFor();
    expect(await read('.terminal .vim-insert-bar', 'borderInlineStartColor')).toBe(await asRgb(tokenValue('color.terminal-cursor')));
    expect(Number.parseFloat(await read('.terminal .vim-insert-bar', 'borderInlineStartWidth'))).toBe(Number.parseFloat(String(tokenValue('border.thick'))));
    await page.keyboard.press('Escape');
    await page.keyboard.press('x');
    await page.locator('.terminal .vim-message-text[data-tone="warning"]').waitFor();
    expect(await read('.terminal .vim-message-text', 'color')).toBe(await asRgb(tokenValue('color.vim-warning')));
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press(':');
    await page.keyboard.type('w');
    await page.keyboard.press('Enter');
    await page.locator('.terminal .vim-message-text[data-tone="error"]').waitFor();
    expect(await read('.terminal .vim-message-text', 'color')).toBe(await asRgb(tokenValue('color.terminal-error')));
  });

  test('the output and the command line use the mono token’s family', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    const mono = tokenValue('font.family.mono');
    for (const selector of ['.terminal .starter', '.terminal section.run .run-output', '.terminal h2.run-command', COMMAND_LINE]) {
      expect(await page.locator(selector).first().evaluate((element) => getComputedStyle(element).fontFamily), selector).toBe(mono);
    }
  });

  test('the window opens at 760 × 536, at 640, 176 in a 1440 × 900 page beside the CV', async () => {
    const page = await openTerminalPage('desktop');
    const box = (await page.locator(WINDOW).boundingBox())!;
    expect({ x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) }).toEqual({ x: 640, y: 176, width: 760, height: 536 });
  });

  test('the glass’s background, blur and rim come from the tokens', async () => {
    const page = await openTerminalPage('desktop');
    const style = await page.locator(WINDOW).evaluate((element) => {
      const computed = getComputedStyle(element);
      return { color: computed.backgroundColor, image: computed.backgroundImage, filter: computed.backdropFilter, rim: computed.borderTopColor, shadow: computed.boxShadow };
    });
    expect(style.color).toBe(await computedColor(page, colorToken('color.terminal-glass')));
    expect(style.image).toContain(await computedColor(page, colorToken('color.terminal-sheen')));
    expect(style.filter).toBe(`blur(${String(tokenValue('size.terminal-blur'))})`);
    const rim = await computedColor(page, colorToken('color.terminal-rim'));
    expect(style.rim).toBe(rim);
    expect(style.shadow).toContain(rim);
  });

  test('the icon, prompt mark, clock and cursor are drawn, not typed', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'pwd');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('help');
    const drawn = await page.evaluate(() => {
      const hidden = (element: Element | null) => element?.closest('[aria-hidden="true"]') !== null && element !== null;
      const icon = document.querySelector('#os .dock-item[data-app="terminal"] svg.terminal-glyph');
      const prompt = document.querySelector('#os .terminal section.run .prompt');
      const block = document.querySelector('#os .terminal .cursor-mirror .cursor-block');
      const text = document.querySelector('#os .terminal')!.textContent ?? '';
      return {
        icon: hidden(icon),
        promptSvgs: prompt?.querySelectorAll('svg').length ?? 0,
        promptHidden: hidden(prompt),
        cursorHidden: hidden(block),
        cursorBackground: block === null ? '' : getComputedStyle(block).backgroundColor,
        typedGlyphs: [...text].filter((character) => '❯◷█↗▌▋'.includes(character)),
      };
    });
    expect(drawn.icon).toBe(true);
    expect(drawn.promptSvgs).toBe(2);
    expect(drawn.promptHidden).toBe(true);
    expect(drawn.cursorHidden).toBe(true);
    expect(drawn.cursorBackground).toBe(await computedColor(page, colorToken('color.terminal-cursor')));
    expect(drawn.typedGlyphs).toEqual([]);
    expect(await page.locator(COMMAND_LINE).evaluate((element) => getComputedStyle(element).caretColor)).toBe('rgba(0, 0, 0, 0)');
  });

  test('the filled and hollow cursor, the selection and the blink come from the amendment’s tokens', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('abc');
    await page.locator(COMMAND_LINE).evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 1));
    const cursor = () => page.locator('.terminal .cursor-block').evaluate((element) => {
      const style = getComputedStyle(element);
      return { fill: style.backgroundColor, letter: style.color, outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`, duration: style.animationDuration };
    });
    // Read once the blink has stopped, filled.
    await page.waitForTimeout(Number.parseFloat(String(tokenValue('motion.duration.cursor-idle'))) + 300);
    const filled = await cursor();
    expect(filled.fill).toBe(await backgroundOf(page, colorToken('color.terminal-cursor')));
    expect(filled.letter).toBe(await computedColor(page, colorToken('color.terminal-cursor-text')));
    await page.keyboard.press('ArrowLeft');
    expect((await cursor()).duration).toBe(`${Number.parseFloat(String(tokenValue('motion.duration.cursor-blink'))) / 1000}s`);
    await page.locator(COMMAND_LINE).evaluate((input: HTMLInputElement) => input.setSelectionRange(0, 2));
    const selected = await page.locator('.terminal .cursor-selected').evaluate((element) => ({ fill: getComputedStyle(element).backgroundColor, letter: getComputedStyle(element).color }));
    expect(selected).toEqual({ fill: await backgroundOf(page, colorToken('color.terminal-selection')), letter: await computedColor(page, colorToken('color.terminal-selection-text')) });
    await page.keyboard.press('Tab');
    expect((await cursor()).outline).toBe(`solid ${tokenValue('border.thick')} ${await computedColor(page, colorToken('color.terminal-cursor'))}`);
  });

  test('no Apple or system UI font is named, in the Terminal’s style sheets or on its elements', async () => {
    for (const file of ['terminal.css', 'pocket.css']) {
      const css = fs.readFileSync(path.join(REPO_ROOT, 'packages/web/src/apps/terminal', file), 'utf8');
      expect(css, file).not.toMatch(SYSTEM_FONTS);
    }
    for (const shell of ['desktop', 'mobile'] as const) {
      const page = await openTerminalPage(shell);
      await runGroup(page, 'help');
      const families = await page.locator('#os .terminal *').evaluateAll((elements) => [...new Set(elements.map((element) => getComputedStyle(element).fontFamily))]);
      for (const family of families) expect(family, shell).not.toMatch(SYSTEM_FONTS);
    }
  });
});
