// Both shells read one app list (FR-003): the dock and the home screen
// show exactly the apps that declare them, in APPS order.
import { describe, expect, test, vi } from 'vitest';
import { appsFor } from '@cv/os-core';
import { APPS } from '../../src/apps/index.ts';
import { openShell } from '../helpers/shell.ts';

// 006 added the Terminal after the CV.

vi.setConfig({ testTimeout: 120_000 });

describe('005-os-shell-FR-003: the dock and the home screen show the app list, and nothing else', () => {
  test('the dock shows one item per desktop app, in order: the CV, then the Terminal (006)', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const items = page.locator('#os .dock .dock-item');
    expect(await items.evaluateAll((list) => list.map((item) => item.getAttribute('data-app')))).toEqual(appsFor(APPS, 'desktop').map((app) => app.id));
    expect(await items.evaluateAll((list) => list.map((item) => item.querySelector('.dock-name')?.textContent))).toEqual(['CV', 'Terminal']);
    expect(await page.locator('#os .dock > *').count()).toBe(appsFor(APPS, 'desktop').length);
  });

  test('the home screen shows one icon per phone app, in order: the CV, then the Terminal (006)', async () => {
    const page = await openShell({ width: 375, height: 812 });
    const icons = page.locator('#os .app-grid .app-icon');
    expect(await icons.evaluateAll((list) => list.map((item) => item.getAttribute('data-view')))).toEqual(appsFor(APPS, 'mobile').map((app) => app.id));
    expect(await icons.evaluateAll((list) => list.map((item) => item.textContent))).toEqual(['CV', 'Terminal']);
    expect(await page.locator('#os .app-grid > li').count()).toBe(appsFor(APPS, 'mobile').length);
  });
});
