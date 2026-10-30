// The Playground as an app of the shell (spec US1): in the dock and on the
// home screen after the CV and the Terminal, with its own icon.
import { describe, expect, test, vi } from 'vitest';
import { APPS } from '../../src/apps/index.ts';
import { siteText } from '../../src/site-text.ts';
import { openShell, PHONE_USER_AGENT } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

describe('008-typescript-playground-FR-001: the Playground is an app of both shells, after the CV and the Terminal', () => {
  test('the dock reads CV, Terminal, Playground, with the Playground named from site text', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const items = page.locator('#os .dock .dock-item');
    expect(await items.evaluateAll((list) => list.map((item) => item.getAttribute('data-app')))).toEqual(['cv', 'terminal', 'playground']);
    expect(await items.evaluateAll((list) => list.map((item) => item.querySelector('.dock-name')?.textContent?.trim()))).toEqual(['CV', 'Terminal', siteText.os.views.playground]);
  });

  test('the home screen at 375 reads the same', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    const icons = page.locator('#os .app-grid .app-icon');
    expect(await icons.evaluateAll((list) => list.map((icon) => icon.getAttribute('data-view')))).toEqual(['cv', 'terminal', 'playground']);
    expect((await icons.nth(2).textContent())?.trim()).toBe(siteText.os.views.playground);
  });

  test("the icon is the design's: braces around a play mark, hidden from screen readers", async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const glyph = page.locator('#os .dock-item[data-app="playground"] svg.playground-glyph');
    expect(await glyph.getAttribute('aria-hidden')).toBe('true');
    expect(await glyph.locator('.playground-brace').count()).toBe(2);
    expect(await glyph.locator('.playground-play').count()).toBe(1);
    expect(await glyph.locator('rect.playground-tile').count()).toBe(1);
  });

  test('the app declares both shells and needs no network to open', () => {
    const playground = APPS.find((app) => app.id === 'playground');
    expect(playground).toBeDefined();
    expect([...playground!.shells].sort()).toEqual(['desktop', 'mobile']);
    expect(playground!.needsNetwork).toBe(false);
    expect(APPS.map((app) => app.id)).toEqual(['cv', 'terminal', 'playground']);
  });
});
