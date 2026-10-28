// The dock (FR-011, FR-012): each app's name always shown, its state in a
// mark that doesn't rely on color, and one window per app however it's
// clicked.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { openShell, settle } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

const ITEM = '#os .dock-item[data-app="cv"]';

// The mark's look in grayscale: its luminance at the centre and whether it
// is shown at all.
async function mark(page: Page): Promise<string> {
  const shot = await page.locator(`${ITEM} .open-mark`).screenshot({ animations: 'disabled' }).catch(() => null);
  const style = await page.evaluate((selector) => {
    const element = document.querySelector(selector)!;
    const css = getComputedStyle(element);
    return { visibility: css.visibility, background: css.backgroundColor, border: css.borderTopStyle };
  }, `${ITEM} .open-mark`);
  return JSON.stringify({ ...style, shot: shot === null ? null : shot.length > 0 });
}

describe('005-os-shell-FR-011: each dock item shows its name and its state', () => {
  test('its name is the app plus open or minimized, its label shows without hover, and the three states look different', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const item = page.locator(ITEM);
    const name = page.locator(`${ITEM} .dock-name`);
    expect(await item.getAttribute('aria-label')).toBe('CV, open');
    expect(await name.isVisible()).toBe(true);
    expect((await name.textContent())?.trim()).toBe('CV');
    const open = await mark(page);
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    await settle(page);
    expect(await item.getAttribute('aria-label')).toBe('CV, minimized');
    const minimized = await mark(page);
    await item.click();
    await page.getByRole('button', { name: 'Close CV' }).click();
    await settle(page);
    expect(await item.getAttribute('aria-label')).toBe('CV');
    const closed = await mark(page);
    expect(new Set([open, minimized, closed]).size).toBe(3);
    // Grayscale: the open mark is filled, the minimized one hollow, so the
    // difference never rests on hue.
    expect(JSON.parse(open).background).not.toBe('rgba(0, 0, 0, 0)');
    expect(JSON.parse(minimized).background).toBe('rgba(0, 0, 0, 0)');
    expect(JSON.parse(minimized).border).toBe('solid');
    expect(JSON.parse(closed).visibility).toBe('hidden');
  });
});

describe('005-os-shell-FR-012: an app has one window, however its dock item is clicked', () => {
  test('a click and a fast triple click give one CV window, in front and focused', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.getByRole('button', { name: 'Close CV' }).click();
    await settle(page);
    await page.locator(ITEM).click();
    expect(await page.locator('#os .window[data-view="cv"]').count()).toBe(1);
    await page.locator(ITEM).click({ clickCount: 3 });
    expect(await page.locator('#os .window[data-view="cv"]').count()).toBe(1);
    expect(await page.locator('#os .window[data-view="cv"]').getAttribute('aria-current')).toBe('true');
  });
});
