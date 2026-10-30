// The Terminal with a keyboard (FR-026, SC-016): the command line never
// traps focus, keeps the shell's shortcuts working, and takes no browser key.
import type { Page } from 'playwright';
import { describe, expect, test, vi } from 'vitest';
import { press } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, openTerminalPage } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('006-terminal-FR-026: the command line keeps the keyboard the visitor’s', () => {
  // Whether a Tab keydown was taken from the browser.
  const watchTab = (page: Page) =>
    page.evaluate(() => {
      (window as unknown as { tabs: boolean[] }).tabs = [];
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') (window as unknown as { tabs: boolean[] }).tabs.push(event.defaultPrevented);
      });
    });
  const tabs = (page: Page) => page.evaluate(() => (window as unknown as { tabs: boolean[] }).tabs);

  test('Tab on an empty line, and with only spaces before the caret, moves focus on and leaves the value', async () => {
    const page = await openTerminalPage('desktop');
    await page.keyboard.press('Tab');
    expect(await commandLineFocused(page)).toBe(false);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('   ');
    await page.keyboard.press('Tab');
    expect(await commandLineFocused(page)).toBe(false);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('   ');
  });

  test('with text typed Tab completes and focus stays', async () => {
    const page = await openTerminalPage('desktop');
    await page.keyboard.type('ab');
    await page.keyboard.press('Tab');
    await expect.poll(() => page.locator(COMMAND_LINE).inputValue()).toBe('about ');
    expect(await commandLineFocused(page)).toBe(true);
  });

  test('Escape then Tab moves focus on, the value unchanged, and Escape isn’t prevented; the next Tab isn’t taken', async () => {
    const page = await openTerminalPage('desktop');
    await watchTab(page);
    await page.evaluate(() => {
      (window as unknown as { esc: boolean[] }).esc = [];
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') (window as unknown as { esc: boolean[] }).esc.push(event.defaultPrevented);
      });
    });
    await page.keyboard.type('ls');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    expect(await commandLineFocused(page)).toBe(false);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('ls');
    expect(await page.evaluate(() => (window as unknown as { esc: boolean[] }).esc)).toEqual([false]);
    await page.keyboard.press('Tab');
    expect(await tabs(page)).toEqual([false, false]);
  });

  test('a key between Escape and Tab, or focus leaving and coming back, makes Tab complete again', async () => {
    const page = await openTerminalPage('desktop');
    await page.keyboard.type('a');
    await page.keyboard.press('Escape');
    await page.keyboard.type('b');
    await page.keyboard.press('Tab');
    await expect.poll(() => page.locator(COMMAND_LINE).inputValue()).toBe('about ');
    await page.locator(COMMAND_LINE).fill('cat cv');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Shift+Tab');
    expect(await commandLineFocused(page)).toBe(false);
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.press('End');
    await page.keyboard.press('Tab');
    await expect.poll(() => page.locator(COMMAND_LINE).inputValue()).toBe('cat cv.json ');
    expect(await commandLineFocused(page)).toBe(true);
  });

  test('Shift+Tab with text typed leaves backwards and isn’t prevented; Ctrl, Alt and Meta with Tab aren’t prevented', async () => {
    const page = await openTerminalPage('desktop');
    await watchTab(page);
    await page.keyboard.type('wor');
    await page.keyboard.press('Shift+Tab');
    expect(await commandLineFocused(page)).toBe(false);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('wor');
    await page.locator(COMMAND_LINE).focus();
    for (const key of ['Control+Tab', 'Alt+Tab', 'Meta+Tab']) await page.keyboard.press(key);
    expect(await tabs(page)).toEqual([false, false, false, false]);
  });

  test('Alt+Shift+D and Alt+Shift+M from the command line reach the dock and the menu bar', async () => {
    const page = await openTerminalPage('desktop');
    await press(page, 'Alt+Shift+D');
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('#os .dock .dock-item') ?? false)).toBe(true);
    await page.locator(COMMAND_LINE).focus();
    await press(page, 'Alt+Shift+M');
    await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#os .menu-bar') !== null)).toBe(true);
  });

  // The keys research R37 adds (Ctrl+A, Ctrl+C…) are line-keys.test.ts's.
  test('Ctrl and Alt key events the Terminal doesn’t add aren’t prevented, and Escape leaves the typed text', async () => {
    const page = await openTerminalPage('desktop');
    await page.evaluate(() => {
      (window as unknown as { seen: string[] }).seen = [];
      window.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.altKey || event.metaKey) && !['Control', 'Alt', 'Meta', 'Shift'].includes(event.key)) (window as unknown as { seen: string[] }).seen.push(`${event.key}:${event.defaultPrevented}`);
      });
    });
    await page.keyboard.type('help me');
    for (const key of ['Control+ArrowLeft', 'Alt+ArrowLeft', 'Control+Shift+ArrowRight', 'Alt+b', 'Control+Shift+ArrowLeft', 'Alt+ArrowRight']) await page.keyboard.press(key);
    const seen = await page.evaluate(() => (window as unknown as { seen: string[] }).seen);
    expect(seen).toHaveLength(6);
    expect(seen.filter((entry) => entry.endsWith(':true'))).toEqual([]);
    await page.keyboard.press('Escape');
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('help me');
    expect(await commandLineFocused(page)).toBe(true);
  });
});
