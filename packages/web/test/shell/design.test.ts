// The shell's look (FR-044, FR-045): original, with one neutral color for
// the window controls and no Apple or system font, at the design's sizes.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenTypes, tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import fonts from '../../src/fonts/fonts.json' with { type: 'json' };
import { box, openShell, serveShellFixture } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 240_000 });

const SYSTEM_FONTS = ['-apple-system', 'system-ui', 'sf pro', 'san francisco', 'blinkmacsystemfont', 'helvetica neue'];

describe('005-os-shell-FR-044: the look is original', () => {
  test('the three window controls share one color, focused or not', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    await page.click('#menu-title-site');
    await page.getByRole('menuitem', { name: 'About this site' }).click();
    await page.mouse.move(1430, 880);
    for (const view of ['cv', 'about']) {
      const colors = await page.evaluate(
        (selector) => [...document.querySelectorAll(selector)].map((control) => getComputedStyle(control, '::before').backgroundColor),
        `#os .window[data-view="${view}"] .control`,
      );
      expect(colors, view).toHaveLength(3);
      expect(new Set(colors).size, view).toBe(1);
    }
  });

  test('no font token or fonts.json family is an Apple or system UI font', () => {
    const families = [
      ...Object.keys(tokenTypes)
        .filter((name) => name.startsWith('font.family'))
        .map((name) => tokenValue(name as CssVarTokenName)),
      ...fonts.families.map((entry) => entry.family),
    ];
    expect(families.length).toBeGreaterThan(3);
    for (const family of families) for (const system of SYSTEM_FONTS) expect(family.toLowerCase(), family).not.toContain(system);
  });

  test("every icon in the root is one of the shell's own SVG components", async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const foreign = await page.evaluate(() =>
      [...document.querySelectorAll('#os svg, #os img, #os picture, #os [style*="background-image"]')]
        .filter((element) => element.closest('.cv') === null)
        .filter((element) => !(element.tagName.toLowerCase() === 'svg' && (element.getAttribute('data-req')?.includes('005-os-shell-FR-044') || element.classList.contains('arrow'))))
        .map((element) => element.outerHTML.slice(0, 80)),
    );
    expect(foreign).toEqual([]);
    const sources = fs.readdirSync(path.resolve(import.meta.dirname, '../../src/os/icons'));
    expect(sources.length).toBeGreaterThanOrEqual(6);
  });
});

// How many grid items share the first row.
const perRow = (page: Page) =>
  page.evaluate(() => {
    const icons = [...document.querySelectorAll('#os .app-grid > li')].map((item) => item.getBoundingClientRect().top);
    return icons.filter((top) => Math.abs(top - icons[0]!) < 1).length;
  });

describe('005-os-shell-FR-045: the shell keeps the design values', () => {
  test('at 1440 × 900: a 32 px menu bar, 104 px kept for the dock, 40 px title bars, the CV window at 1000 × 716 from 220, 56', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    expect((await box(page, '#os .menu-bar'))!.height).toBe(32);
    expect(await box(page, '#os .desktop-area')).toEqual({ x: 0, y: 32, width: 1440, height: 900 - 32 - 104 });
    expect((await box(page, '#os .window[data-view="cv"] .title-bar'))!.height).toBe(40);
    expect(await box(page, '#os .window[data-view="cv"]')).toEqual({ x: 220, y: 56, width: 1000, height: 716 });
  });

  test('the home grid holds 4 icons a row at 375 px, 3 at 320 px and 10 at 812 × 375, with twelve apps', async () => {
    const { url } = await serveShellFixture({
      edit: (root) => {
        const file = path.join(root, 'packages/web/src/apps/index.ts');
        const source = fs.readFileSync(file, 'utf8');
        fs.writeFileSync(file, source.replace('Object.freeze([cvApp])', 'Object.freeze([cvApp, ...Array.from({ length: 11 }, (_, index) => ({ ...cvApp, id: `cv${index + 2}` }))])'));
      },
    });
    for (const [width, height, expected] of [
      [375, 812, 4],
      [320, 640, 3],
      [812, 375, 10],
    ] as const) {
      const page = await openShell({ width, height, url });
      expect(await page.locator('#os .app-grid > li').count()).toBe(12);
      expect(await perRow(page), `${width}`).toBe(expected);
    }
  });
});
