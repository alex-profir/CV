// The Terminal's own menu in the menu bar (FR-003, FR-019): titled
// Terminal, `Clear output` first, then 005's window commands.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { settle } from '../helpers/shell.ts';
import { commandLineFocused, openTerminalPage, runCount, runGroup } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

// The focused window's menu, in order: each item's label, `---` for a
// separator.
const entries = (page: Page) =>
  page.locator('#menu-app > *').evaluateAll((list) =>
    list.map((entry) => (entry.getAttribute('role') === 'separator' ? '---' : (entry.querySelector('.label')?.textContent ?? '').trim())),
  );

describe('006-terminal-FR-003: the Terminal has its own menu in the menu bar', () => {
  test('with the Terminal focused, the menu is titled Terminal and holds Clear output, a separator, then the window commands', async () => {
    const page = await openTerminalPage('desktop');
    expect((await page.locator('#menu-title-app').textContent())?.trim()).toBe('Terminal');
    await page.click('#menu-title-app');
    // 007 adds Show specs after Clear output, in its group (007 contracts/shell.md).
    expect(await entries(page)).toEqual(['Clear output', 'Show specs', '---', 'Move…', 'Resize…', '---', 'Minimize', 'Maximize', '---', 'Close']);
    const clear = page.getByRole('menuitem', { name: 'Clear output' });
    expect(await clear.getAttribute('aria-keyshortcuts')).toBeNull();
    expect((await clear.locator('.keys').textContent())?.trim() ?? '').toBe('');
  });
});

describe('006-terminal-FR-019: Clear output clears the output', () => {
  test('it removes every run and the greeting, and focus returns to the command line', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'about');
    expect(await runCount(page)).toBe(2);
    expect(await page.locator('.terminal .greeting').count()).toBe(1);
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: 'Clear output' }).click();
    await settle(page);
    await expect.poll(() => runCount(page)).toBe(0);
    expect(await page.locator('.terminal .greeting').count()).toBe(0);
    expect(await page.locator('#os [role="menu"]').count()).toBe(0);
    await expect.poll(() => commandLineFocused(page)).toBe(true);
  });
});
