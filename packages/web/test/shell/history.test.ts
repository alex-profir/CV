// The address and Back (FR-050): the address stays the root's, Back closes
// a full-screen app, and the desktop adds nothing to the history.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { focusedElement, openShell, openShellHeld, resize } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

// Starts on an empty page, so a Back that leaves the site lands there.
async function fromBlank(open: () => Promise<Page>): Promise<Page> {
  const page = await open();
  const url = page.url();
  await page.goto('about:blank');
  await page.goto(url);
  await page.waitForSelector('#os[data-ready]', { state: 'attached' });
  return page;
}

const path = (page: Page) => new URL(page.url()).pathname + new URL(page.url()).search;

describe('005-os-shell-FR-050: the address stays the root, and Back works as a visitor expects', () => {
  test('on a phone, Back from the CV goes home with focus on its icon, and a second Back leaves the site', async () => {
    const page = await fromBlank(() => openShell({ width: 375, height: 812, hasTouch: true }));
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await page.locator('#os .full-screen').waitFor();
    expect(path(page)).toBe('/');
    await page.goBack();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    expect(path(page)).toBe('/');
    await expect.poll(() => focusedElement(page)).toMatch(/^button\.app-icon\[data-view=cv\]/);
    await page.goBack();
    expect(page.url()).toBe('about:blank');
  });

  test('on a phone, Home uses the entry up, so one Back then leaves', async () => {
    const page = await fromBlank(() => openShell({ width: 375, height: 812, hasTouch: true }));
    await page.locator('#os .home .about').tap();
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.goBack();
    expect(page.url()).toBe('about:blank');
  });

  test('on a phone, a double click on Home goes home once, and one Back then leaves', async () => {
    const page = await fromBlank(() => openShell({ width: 375, height: 812, hasTouch: true }));
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await page.locator('#os .full-screen').waitFor();
    await page.getByRole('button', { name: 'Home' }).dblclick();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.waitForTimeout(200);
    expect(path(page)).toBe('/');
    await expect.poll(() => focusedElement(page)).toMatch(/^button\.app-icon\[data-view=cv\]/);
    await page.goBack();
    expect(page.url()).toBe('about:blank');
  });

  test('on the desktop the address never changes and one Back leaves', async () => {
    const page = await fromBlank(() => openShell({ width: 1440, height: 900 }));
    await page.click('#menu-title-site');
    await page.getByRole('menuitem', { name: 'About this site' }).click();
    await page.getByRole('button', { name: 'Close CV' }).click();
    await page.getByRole('button', { name: 'Maximize About this site' }).click();
    await page.locator('#os .dock-item[data-app="cv"]').click();
    expect(path(page)).toBe('/');
    await page.goBack();
    expect(page.url()).toBe('about:blank');
  });

  test('after a phone-to-desktop switch with the CV open, one Back leaves', async () => {
    const page = await fromBlank(() => openShell({ width: 375, height: 812, hasTouch: true }));
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await page.locator('#os .full-screen').waitFor();
    await resize(page, 1440, 900);
    await page.locator('#os .window[data-view="cv"]').waitFor();
    await page.waitForTimeout(200);
    expect(path(page)).toBe('/');
    await page.goBack();
    expect(page.url()).toBe('about:blank');
  });

  test('a tap on the CV before hydration adds exactly one entry: one Back goes home, and nothing of the shell is left behind it', async () => {
    const { page, release } = await openShellHeld({ width: 375, height: 812, hasTouch: true });
    const start = await page.evaluate(() => history.length);
    await page.locator('#os .app-icon[data-view="cv"]').tap();
    await release();
    await page.locator('#os .full-screen').waitFor();
    expect(await page.evaluate(() => history.length)).toBe(start + 1);
    await page.goBack();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    expect(path(page)).toBe('/');
    // The visit's first entry: Back has nowhere left to go in this tab.
    expect(await page.goBack()).toBeNull();
  });
});
