// The command line's cursor (FR-072, research R36, US1 scenario 18): the
// line has no box, focused or not, and its block cursor is its focus
// indicator, filled with focus and hollow without.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { contrast } from '../../../../tools/site-check/src/parts/keyboard.ts';
import { settle } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminalPage } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

type Rgb = [number, number, number];

const rgb = (color: string): Rgb => {
  const [r, g, b] = color.match(/[\d.]+/g)!.map(Number);
  return [r!, g!, b!];
};

// The command line's own box: what would draw one.
const lineBox = (page: Page) =>
  page.locator(COMMAND_LINE).evaluate((input) => {
    const style = getComputedStyle(input);
    return {
      outline: style.outlineStyle === 'none' || Number.parseFloat(style.outlineWidth) === 0,
      borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].map(Number.parseFloat),
      shadow: style.boxShadow,
      background: style.backgroundColor,
    };
  });

// The cursor block's drawn style, and its mirror's attributes.
const cursor = (page: Page) =>
  page.locator('.terminal span.cursor-mirror').evaluate((mirror) => {
    const block = mirror.querySelector('.cursor-block')!;
    const style = getComputedStyle(block);
    return {
      focused: mirror.hasAttribute('data-focused'),
      background: style.backgroundColor,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      color: style.color,
    };
  });

// The window's glass behind the screen, the first background that isn't
// transparent from the screen up.
const screenBackground = (page: Page) =>
  page.locator('.terminal .terminal-screen').evaluate((screen) => {
    for (let element: Element | null = screen; element !== null; element = element.parentElement) {
      const color = getComputedStyle(element).backgroundColor;
      if (!/rgba\(0, 0, 0, 0\)|transparent/.test(color)) return color;
    }
    return 'rgb(0, 0, 0)';
  });

describe('006-terminal-FR-072: the command line has no box, and its cursor is its focus indicator', () => {
  test('no outline, border, shadow or background on the command line, focused or not', async () => {
    const page = await openTerminalPage('desktop');
    for (const focused of [true, false]) {
      if (focused) await page.locator(COMMAND_LINE).focus();
      else await page.locator(COMMAND_LINE).blur();
      await settle(page);
      const box = await lineBox(page);
      expect(box.outline, `focused: ${focused}`).toBe(true);
      expect(box.borders, `focused: ${focused}`).toEqual([0, 0, 0, 0]);
      expect(box.shadow, `focused: ${focused}`).toBe('none');
      expect(box.background, `focused: ${focused}`).toBe('rgba(0, 0, 0, 0)');
    }
  });

  test('the cursor is filled with focus and hollow without, both at least 3:1 against the glass', async () => {
    const page = await openTerminalPage('desktop');
    // No blink, so the filled cursor is read in its on state.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const glass = rgb(await screenBackground(page));

    await page.locator(COMMAND_LINE).focus();
    await settle(page);
    const filled = await cursor(page);
    expect(filled.focused).toBe(true);
    expect(filled.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(filled.outlineStyle).toBe('none');
    expect(contrast(rgb(filled.background), glass)).toBeGreaterThanOrEqual(3);

    await page.locator(COMMAND_LINE).blur();
    await settle(page);
    const hollow = await cursor(page);
    expect(hollow.focused).toBe(false);
    expect(hollow.background).toBe('rgba(0, 0, 0, 0)');
    expect(hollow.outlineStyle).toBe('solid');
    expect(hollow.outlineWidth).toBe('2px');
    expect(contrast(rgb(hollow.outlineColor), glass)).toBeGreaterThanOrEqual(3);
  });

  test('every other control keeps the shell’s focus outline', async () => {
    const page = await openTerminalPage('desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.press('Shift+Tab');
    await settle(page);
    const other = await page.evaluate(() => {
      const active = document.activeElement as HTMLElement;
      const style = getComputedStyle(active);
      return { line: active.matches('input.command-line'), outline: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(other.line).toBe(false);
    expect(other.outline).toBe('solid');
    expect(other.width).toBeGreaterThan(0);
  });
});
