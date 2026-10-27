// The menu bar and its menus (FR-013 to FR-015).
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume, siteData } from '@cv/content';
import { focusedElement, frontWindow, openShell } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const items = (page: Page, menu: string) =>
  page.locator(`#menu-${menu} [role^="menuitem"]`).evaluateAll((list) => list.map((item) => (item.querySelector('.label')?.textContent ?? '').trim()));

const openMenus = (page: Page) => page.locator('#os [role="menu"]').count();

async function openAbout(page: Page): Promise<void> {
  await page.click('#menu-title-site');
  await page.getByRole('menuitem', { name: 'About this site' }).click();
}

describe('005-os-shell-FR-013: the menu bar holds the site menu, the focused window and Window', () => {
  test("it shows the site menu, the focused window's name and Window; with none focused, the site name", async () => {
    const page = await openShell({ width: 1440, height: 900 });
    expect(await page.locator('#os .menu-bar').getAttribute('role')).toBe('menubar');
    expect(await page.locator('#menu-title-site').getAttribute('aria-label')).toBe('Site menu');
    expect((await page.locator('#menu-title-app').textContent())?.trim()).toBe('CV');
    expect((await page.locator('#menu-title-window').textContent())?.trim()).toBe('Window');
    await page.getByRole('button', { name: 'Close CV' }).click();
    const name = page.locator('#os .menu-bar span.menu-title');
    expect((await name.textContent())?.trim()).toBe(resume.basics!.name);
    expect(await name.getAttribute('aria-disabled')).toBe('true');
  });

  test('the site menu holds About this site, the CV as a page and the repository', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.click('#menu-title-site');
    expect(await items(page, 'site')).toEqual(['About this site', 'Open the CV as a page', 'Source code on GitHub']);
    expect(await page.locator('#menu-site a').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(['/cv', siteData.repository]);
  });
});

describe('005-os-shell-FR-014: the Window menu lists the open windows, and the focused window has its own menu', () => {
  test('every open window, the focused one checked and a minimized one noted; choosing one brings it back, in front', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await openAbout(page);
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await page.click('#menu-title-window');
    expect(await items(page, 'window')).toEqual(['Go to the menu bar', 'Go to the dock', 'Next window', 'About this site', 'CV (minimized)']);
    expect(await page.locator('#menu-window [role="menuitemradio"]').evaluateAll((list) => list.map((item) => item.getAttribute('aria-checked')))).toEqual(['true', 'false']);
    await page.getByRole('menuitemradio', { name: /^CV/ }).click();
    const cv = page.locator('#os .window[data-view="cv"]');
    expect(await cv.isVisible()).toBe(true);
    expect(await cv.getAttribute('aria-current')).toBe('true');
    expect(await frontWindow(page)).toBe('cv');
  });

  test("the focused window's menu holds its commands, Close among them", async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.click('#menu-title-app');
    expect(await items(page, 'app')).toEqual(['Open the CV as a page', 'Move…', 'Resize…', 'Minimize', 'Maximize', 'Close']);
    await page.getByRole('menuitem', { name: 'Close' }).click();
    expect(await page.locator('#os .window').count()).toBe(0);
  });
});

describe('005-os-shell-FR-015: a menu opens on its title and closes when done with', () => {
  test('it closes on choosing an item, on Escape back to its title, on a click outside and when focus leaves', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.click('#menu-title-window');
    expect(await openMenus(page)).toBe(1);
    expect(await page.locator('#menu-title-window').getAttribute('aria-expanded')).toBe('true');
    await page.keyboard.press('Escape');
    expect(await openMenus(page)).toBe(0);
    expect(await focusedElement(page)).toMatch(/^button#menu-title-window/);
    await page.click('#menu-title-window');
    await page.mouse.click(700, 500);
    expect(await openMenus(page)).toBe(0);
    await page.click('#menu-title-window');
    await page.locator('#os .window[data-view="cv"] .window-title').focus();
    expect(await openMenus(page)).toBe(0);
    await page.click('#menu-title-window');
    await page.getByRole('menuitem', { name: 'Next window' }).click();
    expect(await openMenus(page)).toBe(0);
  });

  test('opening another menu closes the first', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.click('#menu-title-site');
    await page.click('#menu-title-window');
    expect(await openMenus(page)).toBe(1);
    expect(await page.locator('#menu-window').count()).toBe(1);
  });
});

describe('005-os-shell-FR-029: menu commands show their shortcut and expose it', () => {
  // The focused window's menu and the Window menu: [label, shortcut] per command.
  const commands = (page: Page, menu: string) =>
    page.locator(`#menu-${menu} [role^="menuitem"]`).evaluateAll((list) =>
      list.map((item) => [(item.querySelector('.label')?.textContent ?? '').trim(), (item.querySelector('.keys')?.textContent ?? '').trim(), item.getAttribute('aria-keyshortcuts')]),
    );

  test('each command with a shortcut shows its label and carries aria-keyshortcuts, as Alt+Shift off a Mac and Option+Shift on one', async () => {
    for (const [platform, modifier] of [
      ['Windows', 'Alt'],
      ['macOS', 'Option'],
    ] as const) {
      const page = await openShell({ width: 1440, height: 900, platform });
      await page.click('#menu-title-app');
      expect(await commands(page, 'app'), platform).toEqual([
        ['Open the CV as a page', '', null],
        ['Move…', `${modifier}+Shift+P`, 'Alt+Shift+P'],
        ['Resize…', `${modifier}+Shift+S`, 'Alt+Shift+S'],
        ['Minimize', `${modifier}+Shift+H`, 'Alt+Shift+H'],
        ['Maximize', `${modifier}+Shift+F`, 'Alt+Shift+F'],
        ['Close', `${modifier}+Shift+W`, 'Alt+Shift+W'],
      ]);
      await page.keyboard.press('Escape');
      await page.click('#menu-title-window');
      expect(await commands(page, 'window'), platform).toEqual([
        ['Go to the menu bar', `${modifier}+Shift+M`, 'Alt+Shift+M'],
        ['Go to the dock', `${modifier}+Shift+D`, 'Alt+Shift+D'],
        ['Next window', `${modifier}+Shift+N`, 'Alt+Shift+N'],
        ['CV', '', null],
      ]);
      await page.context().close();
    }
  });
});
