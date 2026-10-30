// The first load stays as it was (FR-002, FR-009, SC-009): the Playground
// downloads nothing until it is opened on a desktop.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { builtSite } from '../helpers/site.ts';
import { openShell, PHONE_USER_AGENT } from '../helpers/shell.ts';
import { PLAYGROUND } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 120_000 });

const ENGINE = /\/playground\//;

// Every request under /playground/ the page makes from now on.
function engineRequests(page: Page): string[] {
  const seen: string[] = [];
  page.context().on('request', (request) => {
    if (ENGINE.test(new URL(request.url()).pathname)) seen.push(request.url());
  });
  return seen;
}

describe('008-typescript-playground-FR-002: the first load is unchanged: no Playground until it is opened', () => {
  test('at 1440 only the CV window opens, and no Playground element exists', async () => {
    const page = await openShell({ width: 1440, height: 900 });
    expect(await page.locator('#os .window').evaluateAll((list) => list.map((window) => window.getAttribute('data-view')))).toEqual(['cv']);
    expect(await page.locator(PLAYGROUND).count()).toBe(0);
  });

  test('at 375 the home screen shows, and no Playground element exists', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    expect(await page.locator('#os .home').isVisible()).toBe(true);
    expect(await page.locator('#os section.playground, #os section.playground-mobile').count()).toBe(0);
  });
});

describe('008-typescript-playground-FR-009: TypeScript is downloaded only when the Playground opens on a desktop (SC-009)', () => {
  test('loading / and /cv, and opening the CV and the Terminal, request nothing under /playground/ within 10 s', async () => {
    const page = await openShell({ width: 1440, height: 900, beforeGoto: async (target) => void engineRequests(target) });
    const seen = engineRequests(page);
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.locator('#os .dock-item[data-app="cv"]').click();
    await page.goto(new URL('/cv', page.url()).href);
    await page.waitForTimeout(10_000);
    expect(seen).toEqual([]);
  });

  test('the service worker precaches nothing under /playground/', () => {
    const site = builtSite();
    const worker = fs.readFileSync(path.join(site.dir, 'sw.js'), 'utf8');
    const precache = JSON.parse(/const PRECACHE = (\[[^\]]*\]);/.exec(worker)?.[1] ?? 'null') as string[] | null;
    expect(precache).not.toBeNull();
    expect(precache!.length).toBeGreaterThan(0);
    expect(precache!.filter((file) => ENGINE.test(file))).toEqual([]);
    expect(site.manifest.files.some((file) => ENGINE.test(file.path))).toBe(true);
  });

  test('at 375, opening the Playground requests nothing under /playground/', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    const seen = engineRequests(page);
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    await page.waitForSelector('#os section.playground-mobile', { state: 'visible' });
    await page.waitForTimeout(3_000);
    expect(seen).toEqual([]);
  });
});
