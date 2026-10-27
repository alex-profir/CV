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
