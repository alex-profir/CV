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

// A computed `rgb()` or `rgba()` color as its channels and alpha.
function rgba(color: string): [number, number, number, number] {
  const parts = color.match(/[\d.]+/g)!.map(Number);
  return [parts[0]!, parts[1]!, parts[2]!, parts[3] ?? 1];
}

// WCAG 2.2's contrast ratio of two opaque colors.
function contrast(a: readonly number[], b: readonly number[]): number {
  const luminance = (c: readonly number[]) => {
    const [r, g, bl] = c.slice(0, 3).map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

const dockStyle = (page: Page) =>
  page.evaluate(() => {
    const dock = document.querySelector('#os .dock')!;
    const lens = document.querySelector<HTMLElement>('#os .dock-lens')!;
    const css = getComputedStyle(dock);
    const sheen = getComputedStyle(dock, '::before');
    const box = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height];
    };
    return {
      background: css.backgroundColor,
      backdrop: css.backdropFilter,
      shadow: css.boxShadow,
      sheen: sheen.display === 'none' ? null : sheen.backgroundImage,
      lens: getComputedStyle(lens).display === 'none' ? null : { box: box(lens), backdrop: getComputedStyle(lens).backdropFilter },
      dock: box(dock),
      scale: document.querySelector('#dock-lens feDisplacementMap')?.getAttribute('scale') ?? null,
      name: getComputedStyle(dock.querySelector('.dock-name')!).color,
      mark: getComputedStyle(dock.querySelector('.open-mark')!).backgroundColor,
      menuBar: getComputedStyle(document.querySelector('#os .menu-bar')!).backgroundColor,
    };
  });

describe('005-os-shell-FR-068: the dock is glass, with a lens where the browser can draw it', () => {
  test('a 70% tint, blur and lifted color from the tokens, a rim, a sheen, and the lens on its box', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const style = await dockStyle(page);
    const [, , , alpha] = rgba(style.background);
    expect(alpha).toBeCloseTo(0xb3 / 255, 2);
    expect(style.backdrop).toBe('blur(24px) saturate(1.6)');
    expect(style.shadow.match(/inset/g)).toHaveLength(2);
    expect(style.sheen).toContain('linear-gradient');
    expect(style.lens).toEqual({ box: style.dock, backdrop: 'url("#dock-lens")' });
    expect(style.scale).toBe('24');
    // The menu bar keeps its own glass.
    expect(rgba(style.menuBar)[3]).toBeCloseTo(0x8c / 255, 2);
  });

  test('its names and open marks keep their contrast over a white window behind it', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const style = await dockStyle(page);
    const [r, g, b, alpha] = rgba(style.background);
    // The worst case: the tint over white, which the sheen doesn't reach at the names.
    const over = [r, g, b].map((channel) => alpha * channel + (1 - alpha) * 255);
    expect(contrast(rgba(style.name), over)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgba(style.mark), over)).toBeGreaterThanOrEqual(3);
  });

  test('with reduced transparency the dock is solid, with no lens or sheen', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const session = await page.context().newCDPSession(page);
    await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
    await settle(page);
    const style = await dockStyle(page);
    expect(rgba(style.background)[3]).toBe(1);
    expect(style.backdrop).toBe('none');
    expect(style.lens).toBeNull();
    expect(style.sheen).toBeNull();
  });
});
