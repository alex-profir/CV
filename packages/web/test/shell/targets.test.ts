// Target sizes (FR-037): every control of both shells is at least 24 × 24
// px in every state, and Home is 44 × 44. Links inside sentences of the CV
// and About this site are inline, which WCAG 2.5.8 exempts; their own
// standalone links are measured.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { openShell, press } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 180_000 });

const CV = '#os .window[data-view="cv"]';

// Every control shown, by a stable description, with its size, and those
// under 24 px either way.
const small = (page: Page) =>
  page.evaluate(() => {
    const controls = [...document.querySelectorAll<HTMLElement>('#os button, #os a[href], #os [role^="menuitem"], #os [tabindex="0"]')];
    return controls
      .filter((control) => control.getClientRects().length > 0 && control.closest('[inert], [hidden]') === null)
      .filter((control) => !(control instanceof HTMLAnchorElement && control.closest('p, li, dd') !== null && !control.classList.contains('standalone')))
      .map((control) => {
        const box = control.getBoundingClientRect();
        const name = (control.getAttribute('aria-label') ?? control.textContent ?? '').replace(/\s+/g, ' ').trim();
        return { control: `${control.tagName.toLowerCase()}.${String(control.className).trim().split(/\s+/).join('.')} ${JSON.stringify(name)}`, width: box.width, height: box.height };
      })
      .filter(({ width, height }) => width < 24 || height < 24);
  });

async function expectNoSmall(page: Page, state: string): Promise<void> {
  expect(await small(page), state).toEqual([]);
}

describe('005-os-shell-FR-037: every control is at least 24 × 24 px, and Home 44 × 44', () => {
  test('desktop: first load, each menu, two windows, the move and resize pads, maximized and minimized', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await expectNoSmall(page, 'first load');
    for (const menu of ['site', 'app', 'window']) {
      await page.click(`#menu-title-${menu}`);
      await page.locator(`#menu-${menu}`).waitFor();
      await expectNoSmall(page, `${menu} menu`);
      await press(page, 'Escape');
    }
    await page.click('#menu-title-site');
    await page.getByRole('menuitem', { name: 'About this site' }).click();
    await page.locator('#os .window[data-view="about"]').waitFor();
    await expectNoSmall(page, 'two windows');
    await page.locator(`${CV} .window-title`).focus();
    await press(page, 'Alt+Shift+P');
    await page.locator(`${CV} .pad`).waitFor();
    await expectNoSmall(page, 'move pad');
    await press(page, 'Escape', 'Alt+Shift+S');
    await page.locator(`${CV} .pad`).waitFor();
    await expectNoSmall(page, 'resize pad');
    await press(page, 'Escape', 'Alt+Shift+F');
    await expect.poll(() => page.locator(CV).getAttribute('data-maximized')).toBe('');
    await expectNoSmall(page, 'maximized');
    await press(page, 'Alt+Shift+F', 'Alt+Shift+H');
    await expect.poll(() => page.locator(CV).isHidden()).toBe(true);
    await expectNoSmall(page, 'minimized');
  });

  test('mobile: the home screen, the CV and About, with Home at 44 × 44', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true });
    await expectNoSmall(page, 'home screen');
    for (const view of ['cv', 'about']) {
      await page.locator(view === 'cv' ? '#os .app-icon[data-view="cv"]' : '#os .home .about').tap();
      await page.locator(`#os .full-screen[data-view="${view}"]`).waitFor();
      await expectNoSmall(page, view);
      const home = (await page.locator('#os .home-button').boundingBox())!;
      expect(home.width, view).toBeGreaterThanOrEqual(44);
      expect(home.height, view).toBeGreaterThanOrEqual(44);
      await page.locator('#os .home-button').tap();
      await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    }
  });
});
