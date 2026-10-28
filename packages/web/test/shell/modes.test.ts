// Forced colors (005 design/wireframes.md Forced colors and zoom, US5
// scenario 3): with shadows, glass and dark fills gone, every part of the
// shell keeps an edge, the focused window stands out without color, and
// nothing relies on a background image or color alone.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { forcedColorsProblems } from '../../../../tools/site-check/src/parts/modes.ts';
import { openShell, press, settle } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 180_000 });

type Edge = { width: number; color: string };

const desktop = () => openShell({ width: 1440, height: 900, forcedColors: 'active', platform: 'Windows' });

// The widest visible border side of each element matched, or null for one
// with none; `pseudo` reads a pseudo-element, and an outline counts too.
function edges(page: Page, selector: string, pseudo = ''): Promise<Array<Edge | null>> {
  return page.evaluate(
    ([target, part]) =>
      [...document.querySelectorAll(target!)].map((element) => {
        const style = getComputedStyle(element, part || null);
        const sides = ['top', 'right', 'bottom', 'left'].map((side) => ({
          width: Number.parseFloat(style.getPropertyValue(`border-${side}-width`)),
          style: style.getPropertyValue(`border-${side}-style`),
          color: style.getPropertyValue(`border-${side}-color`),
        }));
        sides.push({ width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle, color: style.outlineColor });
        const shown = sides.filter((side) => side.width > 0 && side.style !== 'none' && !/rgba\(.*,\s*0\)$/.test(side.color) && side.color !== 'transparent');
        if (shown.length === 0) return null;
        const widest = shown.reduce((a, b) => (b.width > a.width ? b : a));
        return { width: widest.width, color: widest.color };
      }),
    [selector, pseudo],
  );
}

// A system color as the page resolves it.
const systemColor = (page: Page, name: string) =>
  page.evaluate((color) => {
    const probe = document.createElement('i');
    probe.style.color = color;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);

async function expectEdges(page: Page, selector: string, pseudo = ''): Promise<void> {
  const found = await edges(page, selector, pseudo);
  expect(found.length, `${selector}${pseudo}`).toBeGreaterThan(0);
  expect(found.every((edge) => edge !== null), `${selector}${pseudo}`).toBe(true);
}

async function openAbout(page: Page): Promise<void> {
  await page.click('#menu-title-site');
  await page.getByRole('menuitem', { name: 'About this site' }).click();
  await page.locator('#os .window[data-view="about"]').waitFor();
  await settle(page);
}

describe('005-os-shell-FR-047: every shell element stays visible in forced colors', () => {
  test('windows, title bars, a menu, the dock, the pad and the menu bar have a border, and each control circle an outline', async () => {
    const page = await desktop();
    await openAbout(page);
    for (const selector of ['#os .window', '#os .title-bar', '#os .dock', '#os .menu-bar']) await expectEdges(page, selector);
    await expectEdges(page, '#os .control', '::before');
    await page.click('#menu-title-site');
    await expectEdges(page, '#os .menu');
    await page.keyboard.press('Escape');
    await press(page, 'Alt+Shift+P');
    await page.locator('#os .pad').waitFor();
    await expectEdges(page, '#os .pad');
    await expectEdges(page, '#os .pad button');
  });

  test('the focused window has a thicker border, in the highlight color', async () => {
    const page = await desktop();
    await openAbout(page);
    const [focused] = await edges(page, '#os .window[aria-current="true"]');
    const [other] = await edges(page, '#os .window:not([aria-current="true"])');
    expect(focused!.width).toBeGreaterThan(other!.width);
    expect(focused!.color).toBe(await systemColor(page, 'Highlight'));
  });

  test('the open marks are a filled and a hollow shape, and focus outlines show', async () => {
    const page = await desktop();
    await openAbout(page);
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await settle(page);
    const hollow = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('#os .dock-item.is-minimized .open-mark')!);
      return { background: style.backgroundColor, border: style.borderTopColor, width: Number.parseFloat(style.borderTopWidth) };
    });
    expect(hollow.width).toBeGreaterThan(0);
    expect(hollow.border).toBe(await systemColor(page, 'CanvasText'));
    expect(hollow.background).not.toBe(hollow.border);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await settle(page);
    const filled = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector('#os .dock-item.is-open .open-mark')!);
      return { background: style.backgroundColor, border: style.borderTopColor };
    });
    expect(filled.background).toBe(filled.border);
    expect(filled.background).toBe(await systemColor(page, 'CanvasText'));
    for (const keys of ['Alt+Shift+M', 'Alt+Shift+D']) {
      await press(page, keys);
      const outline = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement!);
        return style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0;
      });
      expect(outline, keys).toBe(true);
    }
  });

  test('nothing relies on a background image or color alone, on either shell', async () => {
    const page = await desktop();
    expect(await forcedColorsProblems(page, '/'), 'desktop, first load').toEqual([]);
    await openAbout(page);
    await page.click('#menu-title-site');
    expect(await forcedColorsProblems(page, '/'), 'desktop, two windows and a menu').toEqual([]);
    const phone = await openShell({ width: 375, height: 812, hasTouch: true, forcedColors: 'active' });
    expect(await forcedColorsProblems(phone, '/'), 'mobile, home').toEqual([]);
    await phone.locator('#os .app-icon[data-view="cv"]').tap();
    await phone.locator('#os .full-screen[data-view="cv"]').waitFor();
    await settle(phone);
    expect(await forcedColorsProblems(phone, '/'), 'mobile, the CV').toEqual([]);
  });
});
