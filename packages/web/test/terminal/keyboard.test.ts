// The Terminal with a keyboard (FR-026): the command line never traps
// focus, keeps the shell's shortcuts working, and takes no browser key.
import { describe, expect, test, vi } from 'vitest';
import { press } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, openTerminalPage } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('006-terminal-FR-026: the command line keeps the keyboard the visitor’s', () => {
  test('Tab moves focus on and leaves the value, with the readline keys in place; Shift+Tab comes back', async () => {
    const page = await openTerminalPage('desktop', { platform: 'macOS' });
    await page.keyboard.type('wor');
    // macOS's Ctrl+A goes to the line's start, and Tab still leaves.
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Tab');
    expect(await commandLineFocused(page)).toBe(false);
    expect(await page.evaluate(() => document.activeElement !== document.body)).toBe(true);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('wor');
    await page.keyboard.press('Shift+Tab');
    expect(await commandLineFocused(page)).toBe(true);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('wor');
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
