// Which shell a visitor gets (FR-001, FR-002): the space available decides,
// before the first paint, and the shell follows it while the site is open.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { box, openShell, openShellHeld, PHONE_USER_AGENT } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const shown = async (page: Page) => ({
  shell: await page.evaluate(() => document.documentElement.getAttribute('data-shell')),
  desktop: (await box(page, '#os .desktop')) !== null,
  mobile: (await box(page, '#os .mobile')) !== null,
});

const SIZES: [number, number, 'desktop' | 'mobile'][] = [
  [1440, 900, 'desktop'],
  [1024, 640, 'desktop'],
  [1023, 900, 'mobile'],
  [1440, 639, 'mobile'],
  [375, 812, 'mobile'],
  [812, 375, 'mobile'],
];

describe('005-os-shell-FR-001: the space available picks the shell, whatever the device says', () => {
  test('each size gets its shell, with a desktop and with a phone user agent', async () => {
    for (const [width, height, expected] of SIZES) {
      for (const userAgent of [undefined, PHONE_USER_AGENT]) {
        const page = await openShell({ width, height, ...(userAgent === undefined ? {} : { userAgent }) });
        const label = `${width} × ${height}${userAgent === undefined ? '' : ' phone'}`;
        expect(await shown(page), label).toEqual({ shell: expected, desktop: expected === 'desktop', mobile: expected === 'mobile' });
        await page.context().close();
      }
    }
  });

  test('the first paint already shows the right shell, before the shell script runs', async () => {
    for (const [width, height, expected] of SIZES) {
      const { page } = await openShellHeld({ width, height });
      const label = `${width} × ${height}`;
      expect(await page.locator('#os[data-ready]').count(), label).toBe(0);
      expect(await shown(page), label).toEqual({ shell: expected, desktop: expected === 'desktop', mobile: expected === 'mobile' });
      const shot = await page.screenshot();
      expect(shot.length, label).toBeGreaterThan(0);
      await page.context().close();
    }
  });
});

describe('005-os-shell-FR-002: crossing 1024 px changes the shell without a reload, keeping what is open', () => {
  test('with the CV open, both ways: no navigation, and the CV stays open, focused or full screen', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    // R12's same-URL history entry is a same-document navigation, so count
    // only loads, and mark the document to show it is the same one at the end.
    const loads: string[] = [];
    page.on('load', () => loads.push(page.url()));
    await page.evaluate(() => Object.assign(window, { sameDocument: true }));
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.locator('#os .full-screen[data-view="cv"]').waitFor();
    expect(await shown(page)).toEqual({ shell: 'mobile', desktop: false, mobile: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#os .window[data-view="cv"]').waitFor();
    expect(await shown(page)).toEqual({ shell: 'desktop', desktop: true, mobile: false });
    expect(await page.locator('#os .window[data-view="cv"]').getAttribute('aria-current')).toBe('true');
    expect(loads).toEqual([]);
    expect(await page.evaluate(() => 'sameDocument' in window)).toBe(true);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  test('with nothing open, the empty desktop becomes the home screen, and back', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Close CV' }).click();
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.locator('#os .home').waitFor();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#os .desktop').waitFor();
    await expect.poll(() => page.locator('#os .window').count()).toBe(0);
  });
});
