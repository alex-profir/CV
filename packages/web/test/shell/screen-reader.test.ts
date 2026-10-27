// What a screen reader gets from the shell (spec US4, research R10): the
// language, the landmarks and names, where focus goes, the status region's
// announcements and the page title, in both shells.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { axNodes } from '../helpers/ax.ts';
import { focusedElement, openShell, press } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const CV = '#os .window[data-view="cv"]';
const ABOUT = '#os .window[data-view="about"]';
const NAME = resume.basics!.name!;

const desktop = () => openShell({ width: 1440, height: 900 });
const phone = () => openShell({ width: 375, height: 812, hasTouch: true });

const focusIs = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.matches(target) ?? false, selector);
// The `main` landmarks assistive technology gets: the no-script page's is
// hidden once the shell runs.
const mains = async (page: Page) => (await axNodes(page, 'main')).filter((node) => !node.ignored).map((node) => node.name);

const status = (page: Page) => page.locator('#os [role="status"]');

async function openAbout(page: Page): Promise<void> {
  await page.click('#menu-title-site');
  await page.getByRole('menuitem', { name: 'About this site' }).click();
  await page.locator(ABOUT).waitFor();
}

describe('005-os-shell-FR-039: the language, landmarks and window names reach assistive technology', () => {
  test('desktop: lang, Menu bar, Desktop, Dock, each window named by its app, and only the focused one current', async () => {
    const page = await desktop();
    const expectedMain = 'Desktop';
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    expect(await axNodes(page, '#os .menu-bar')).toEqual([{ role: 'menubar', name: 'Menu bar', ignored: false }]);
    expect(await axNodes(page, '#os .desktop-area')).toEqual([{ role: 'main', name: 'Desktop', ignored: false }]);
    expect(await axNodes(page, '#os .dock')).toEqual([{ role: 'toolbar', name: 'Dock', ignored: false }]);
    await openAbout(page);
    const windows = await axNodes(page, '#os .window');
    expect(windows.map((node) => node.name).sort()).toEqual(['About this site', 'CV']);
    expect(windows.every((node) => !node.ignored)).toBe(true);
    expect(await page.locator('#os .window').evaluateAll((all) => all.map((window) => window.getAttribute('aria-roledescription')))).toEqual(['window', 'window']);
    expect(await page.locator('#os .window[aria-current="true"]').evaluateAll((all) => all.map((window) => window.getAttribute('data-view')))).toEqual(['about']);
    // A point of the CV's content that About, in front, doesn't cover.
    await page.locator(`${CV} .window-content`).click({ position: { x: 8, y: 8 } });
    expect(await page.locator('#os .window[aria-current="true"]').evaluateAll((all) => all.map((window) => window.getAttribute('data-view')))).toEqual(['cv']);
    expect(await mains(page)).toEqual([expectedMain]);
  });

  test('mobile: lang, the Home screen region, and the open app named by its title', async () => {
    const page = await phone();
    const expectedMain = '';
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
    expect(await axNodes(page, '#os .home')).toEqual([{ role: 'region', name: 'Home screen', ignored: false }]);
    expect(await mains(page)).toEqual([expectedMain]);
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await page.locator('#os .full-screen').waitFor();
    expect(await axNodes(page, '#os .full-screen')).toEqual([{ role: 'region', name: 'CV', ignored: false }]);
  });
});

describe('005-os-shell-FR-040: opening a window or app moves focus to its title, and first load moves none', () => {
  test('first load leaves focus alone; the dock, a menu and the home screen each focus the title', async () => {
    const page = await desktop();
    expect(await focusedElement(page)).toBe('body');
    await page.getByRole('button', { name: 'Close CV' }).click();
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await expect.poll(() => focusIs(page, `${CV} .window-title`)).toBe(true);
    await openAbout(page);
    await expect.poll(() => focusIs(page, `${ABOUT} .window-title`)).toBe(true);

    const mobile = await phone();
    expect(await focusedElement(mobile)).toBe('body');
    await mobile.locator('#os .app-icon[data-view="cv"]').tap();
    await expect.poll(() => focusIs(mobile, '#os .full-screen[data-view="cv"] .app-title')).toBe(true);
    await mobile.getByRole('button', { name: 'Home' }).tap();
    await mobile.locator('#os .home .about').tap();
    await expect.poll(() => focusIs(mobile, '#os .full-screen[data-view="about"] .app-title')).toBe(true);
  });
});

describe('005-os-shell-FR-041: the status region announces moves, resizes, maximizing and restoring', () => {
  test('each action puts its sentence in the status region', async () => {
    const page = await desktop();
    expect(await axNodes(page, '#os [role="status"]')).toEqual([{ role: 'status', name: '', ignored: false }]);
    await page.locator(`${CV} .window-title`).focus();
    const announced = async (keys: string[], message: string) => {
      await press(page, ...keys);
      await expect.poll(() => status(page).textContent(), { message }).toBe(message);
    };
    await announced(['Alt+Shift+P', 'ArrowRight', 'Enter'], 'CV moved.');
    await announced(['Alt+Shift+P', 'ArrowRight', 'Escape'], 'Move cancelled.');
    await press(page, 'Alt+Shift+S', 'ArrowLeft', 'Enter');
    const size = await page.locator(CV).boundingBox();
    await expect.poll(() => status(page).textContent()).toBe(`CV resized to ${size!.width} by ${size!.height}.`);
    await announced(['Alt+Shift+S', 'ArrowLeft', 'Escape'], 'Resize cancelled.');
    await announced(['Alt+Shift+F'], 'CV maximized.');
    await announced(['Alt+Shift+F'], 'CV restored.');
  });
});

describe('005-os-shell-FR-042: the page title names the focused window or open app, then the site', () => {
  test('desktop: the CV, About this site, and the site name with none focused', async () => {
    const page = await desktop();
    expect(await page.title()).toBe(`CV – ${NAME}`);
    await openAbout(page);
    await expect.poll(() => page.title()).toBe(`About this site – ${NAME}`);
    await page.getByRole('button', { name: 'Close About this site' }).click();
    await expect.poll(() => page.title()).toBe(`CV – ${NAME}`);
    await page.getByRole('button', { name: 'Close CV' }).click();
    await expect.poll(() => page.title()).toBe(NAME);
  });

  test('mobile: the site name on the home screen, then the open app', async () => {
    const page = await phone();
    await expect.poll(() => page.title()).toBe(NAME);
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await expect.poll(() => page.title()).toBe(`CV – ${NAME}`);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.title()).toBe(NAME);
    await page.locator('#os .home .about').tap();
    await expect.poll(() => page.title()).toBe(`About this site – ${NAME}`);
  });
});
