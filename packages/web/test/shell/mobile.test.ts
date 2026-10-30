// The phone shell (spec US3): the home screen, apps full screen, Home and
// the place kept in each app.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { axNodes } from '../helpers/ax.ts';
import { focusedElement, focusIndicator, openShell, resize, settle } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const phone = (width = 375, height = 812) => openShell({ width, height, hasTouch: true });

async function openCv(page: Page): Promise<void> {
  await page.locator('#os .app-icon[data-view="cv"]').tap();
  await page.locator('#os .full-screen[data-view="cv"]').waitFor();
  await settle(page);
}

const focusIs = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.matches(target) ?? false, selector);

async function expectIndicator(page: Page, step: string): Promise<void> {
  const indicator = await focusIndicator(page);
  expect(indicator.ok, `${step}: ${await focusedElement(page)} ${JSON.stringify(indicator)}`).toBe(true);
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
      expect(await page.locator('#os .app-icon').evaluateAll((icons) => icons.map((icon) => icon.textContent)), label).toEqual(['CV', 'Terminal', 'Playground']);
      expect(await page.locator('#os .app-icon .app-glyph').count(), label).toBe(3);
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

describe('005-os-shell-FR-036: the phone shell works with an external keyboard', () => {
  test('keys alone open the CV in at most 3 presses, go home and open About, with a visible indicator at each step (SC-002)', async () => {
    const page = await phone();
    let presses = 0;
    while (presses < 3 && (await page.locator('#os .full-screen[data-view="cv"]').count()) === 0) {
      await page.keyboard.press((await focusIs(page, '#os .app-icon[data-view="cv"]')) ? 'Enter' : 'Tab');
      presses += 1;
      if ((await page.locator('#os .full-screen').count()) === 0) await expectIndicator(page, `press ${presses}`);
    }
    await page.locator('#os .full-screen[data-view="cv"]').waitFor();
    expect(presses).toBeLessThanOrEqual(3);
    await expect.poll(() => focusIs(page, '#os .full-screen .app-title')).toBe(true);
    await expectIndicator(page, 'CV open');
    await page.keyboard.press('Shift+Tab');
    expect(await focusIs(page, '#os .home-button')).toBe(true);
    await expectIndicator(page, 'Home');
    await page.keyboard.press('Enter');
    await expect.poll(() => focusIs(page, '#os .app-icon[data-view="cv"]')).toBe(true);
    await expectIndicator(page, 'back home');
    // The Terminal's icon comes after the CV's (006), then the Playground's (008).
    await page.keyboard.press('Tab');
    expect(await focusIs(page, '#os .app-icon[data-view="terminal"]')).toBe(true);
    await page.keyboard.press('Tab');
    expect(await focusIs(page, '#os .app-icon[data-view="playground"]')).toBe(true);
    await page.keyboard.press('Tab');
    expect(await focusIs(page, '#os .home .about')).toBe(true);
    await expectIndicator(page, 'About this site');
    await page.keyboard.press('Enter');
    await expect.poll(() => focusIs(page, '#os .full-screen[data-view="about"] .app-title')).toBe(true);
    await expectIndicator(page, 'About open');
  });

  test('after narrowing from the desktop with the CV open, the eight desktop shortcuts do nothing', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await resize(page, 375, 812);
    await page.locator('#os .full-screen[data-view="cv"]').waitFor();
    await page.locator('#os .full-screen .app-title').focus();
    for (const letter of ['M', 'D', 'N', 'W', 'H', 'F', 'P', 'S']) {
      await page.keyboard.press(`Alt+Shift+${letter}`);
      expect(await page.locator('#os .full-screen[data-view="cv"]').isVisible(), letter).toBe(true);
      expect(await focusIs(page, '#os .full-screen .app-title'), letter).toBe(true);
      expect(await page.locator('#os .desktop, #os .pad').count(), letter).toBe(0);
    }
  });
});
