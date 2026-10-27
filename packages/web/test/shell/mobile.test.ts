// The phone shell (spec US3): the home screen, apps full screen, Home and
// the place kept in each app.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { axNodes } from '../helpers/ax.ts';
import { focusedElement, openShell } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const phone = (width = 375, height = 812) => openShell({ width, height, hasTouch: true });

async function openCv(page: Page): Promise<void> {
  await page.locator('#os .app-icon[data-view="cv"]').tap();
  await page.locator('#os .full-screen[data-view="cv"]').waitFor();
}

const scrolls = (page: Page) =>
  page.evaluate(() => ({ x: document.documentElement.scrollWidth - document.documentElement.clientWidth, body: document.body.scrollWidth - document.body.clientWidth }));

describe('005-os-shell-FR-031: the home screen shows every app and About this site', () => {
  test('one icon per app with its name, and About this site, with no horizontal scroll at each phone size', async () => {
    for (const [width, height] of [
      [320, 640],
      [375, 812],
      [812, 375],
      [1023, 900],
    ] as const) {
      const page = await phone(width, height);
      const label = `${width} × ${height}`;
      expect(await page.locator('#os .home').getAttribute('aria-label'), label).toBe('Home screen');
      expect(await page.locator('#os .app-icon').evaluateAll((icons) => icons.map((icon) => icon.textContent)), label).toEqual(['CV']);
      expect(await page.locator('#os .app-icon .app-glyph').count(), label).toBe(1);
      expect(await page.locator('#os .home .about').isVisible(), label).toBe(true);
      expect(await scrolls(page), label).toEqual({ x: 0, body: 0 });
      await page.context().close();
    }
  });
});

describe('005-os-shell-FR-032: a tap opens an app full screen', () => {
  test('the CV opens over the home screen with a header showing its name and Home', async () => {
    const page = await phone();
    await openCv(page);
    const view = page.locator('#os .full-screen[data-view="cv"]');
    expect(await view.boundingBox()).toEqual({ x: 0, y: 0, width: 375, height: 812 });
    expect((await view.locator('.app-title').textContent())?.trim()).toBe('CV');
    expect(await view.getByRole('button', { name: 'Home' }).isVisible()).toBe(true);
    expect(await view.getAttribute('aria-labelledby')).toBe('app-title-cv');
  });
});

describe('005-os-shell-FR-033: one tap on Home goes back to the home screen', () => {
  test('Home closes the app, with a button rather than a gesture', async () => {
    const page = await phone();
    await openCv(page);
    const home = page.getByRole('button', { name: 'Home' });
    expect(await home.evaluate((element) => element.tagName)).toBe('BUTTON');
    await home.tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    expect(await page.locator('#os .home').isVisible()).toBe(true);
  });
});

describe('005-os-shell-FR-034: an app opened again is where it was left', () => {
  test('scrolled halfway, then Home, then the CV again: the same position, and focus back on the CV icon', async () => {
    const page = await phone();
    await openCv(page);
    const half = await page.evaluate(() => {
      const view = document.querySelector('#os .full-screen .view-content')!;
      view.scrollTop = Math.round((view.scrollHeight - view.clientHeight) / 2);
      return view.scrollTop;
    });
    expect(half).toBeGreaterThan(500);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => focusedElement(page)).toMatch(/^button\.app-icon\[data-view=cv\]/);
    await openCv(page);
    expect(await page.evaluate(() => document.querySelector('#os .full-screen .view-content')!.scrollTop)).toBe(half);
  });
});

describe('005-os-shell-FR-035: with an app open, the home screen is out of reach', () => {
  test('it is inert: Tab never reaches it and the accessibility tree holds none of it', async () => {
    const page = await phone();
    await openCv(page);
    expect(await page.locator('#os .home').evaluate((home) => (home as HTMLElement).inert)).toBe(true);
    for (let press = 0; press < 40; press += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => document.activeElement?.closest('.home') === null)).toBe(true);
    }
    const nodes = await axNodes(page, '#os .home, #os .home *');
    expect(nodes.filter((node) => !node.ignored)).toEqual([]);
  });
});
