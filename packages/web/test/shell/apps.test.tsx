// Both shells read one app list (FR-003): the dock and the home screen
// show exactly the apps that declare them, in APPS order.
import fs from 'node:fs';
import { describe, expect, test, vi } from 'vitest';
import { appsFor } from '@cv/os-core';
import { APPS } from '../../src/apps/index.ts';
import type { App } from '../../src/apps/index.ts';
import { appFromAddress } from '../../src/os/Os.tsx';
import { openShell } from '../helpers/shell.ts';

// 006 added the Terminal after the CV.

vi.setConfig({ testTimeout: 120_000 });

describe('005-os-shell-FR-003: the dock and the home screen show the app list, and nothing else', () => {
  test('the dock shows one item per desktop app, in order: the CV, then the Terminal (006), then the Playground (008)', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    const items = page.locator('#os .dock .dock-item');
    expect(await items.evaluateAll((list) => list.map((item) => item.getAttribute('data-app')))).toEqual(appsFor(APPS, 'desktop').map((app) => app.id));
    expect(await items.evaluateAll((list) => list.map((item) => item.querySelector('.dock-name')?.textContent))).toEqual(['CV', 'Terminal', 'Playground']);
    expect(await page.locator('#os .dock > *').count()).toBe(appsFor(APPS, 'desktop').length);
  });

  test('the home screen shows one icon per phone app, in order: the CV, then the Terminal (006), then the Playground (008)', async () => {
    const page = await openShell({ width: 375, height: 812 });
    const icons = page.locator('#os .app-grid .app-icon');
    expect(await icons.evaluateAll((list) => list.map((item) => item.getAttribute('data-view')))).toEqual(appsFor(APPS, 'mobile').map((app) => app.id));
    expect(await icons.evaluateAll((list) => list.map((item) => item.textContent))).toEqual(['CV', 'Terminal', 'Playground']);
    expect(await page.locator('#os .app-grid > li').count()).toBe(appsFor(APPS, 'mobile').length);
  });
});

describe('008-typescript-playground-FR-053: an address opens the app that says it is its own, and the shell names no app', () => {
  const app = (id: string, shells: readonly string[], prefix?: string) => ({ id, shells, ...(prefix === undefined ? {} : { opensFromAddress: (href: string) => href.includes(prefix) }) }) as unknown as App;
  const apps = [app('plain', ['desktop', 'mobile']), app('desktop-only', ['desktop'], '#one'), app('both', ['desktop', 'mobile'], '#one')];

  test('the first app in the shell whose address it is, and none for any other address', () => {
    expect(appFromAddress(apps, 'https://site/#one', 'desktop')?.id).toBe('desktop-only');
    expect(appFromAddress(apps, 'https://site/#one', 'mobile')?.id).toBe('both');
    expect(appFromAddress(apps, 'https://site/', 'desktop')).toBeUndefined();
  });

  test('the Playground says its links are its own, in both shells', () => {
    for (const shell of ['desktop', 'mobile'] as const) {
      expect(appFromAddress(APPS, 'https://site/#playground', shell)?.id).toBe('playground');
      expect(appFromAddress(APPS, 'https://site/#playground=1.a.b', shell)?.id).toBe('playground');
      expect(appFromAddress(APPS, 'https://site/', shell)).toBeUndefined();
    }
  });

  test('Os.tsx imports nothing from an app of its own', () => {
    const source = fs.readFileSync(new URL('../../src/os/Os.tsx', import.meta.url), 'utf8');
    expect(source).not.toMatch(/from '\.\.\/apps\/[a-z]+\//);
  });
});
