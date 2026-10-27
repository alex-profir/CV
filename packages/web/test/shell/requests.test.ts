// The shell asks nothing of another site (FR-054, SC-008).
import { describe, expect, test, vi } from 'vitest';
import type { Page, Request } from 'playwright';
import { openPage } from '../helpers/browser.ts';
import { serveBuilt } from '../helpers/site.ts';
import { waitForReady } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

// Every host the page asked for, from the first request.
async function record(width: number, height: number, act: (page: Page) => Promise<void>): Promise<string[]> {
  const { url } = await serveBuilt();
  const hosts = new Set<string>();
  const page = await openPage(`${url}/`, {
    width,
    height,
    hasTouch: width < 1024,
    beforeGoto: async (target) => {
      target.on('request', (request: Request) => hosts.add(new URL(request.url()).hostname));
    },
  });
  await waitForReady(page);
  await act(page);
  await page.waitForLoadState('networkidle');
  return [...hosts];
}

describe('005-os-shell-FR-054: loading the root and opening the CV app ask only this site (SC-008)', () => {
  test('at 1440 px, with the CV window open', async () => {
    expect(await record(1440, 900, async (page) => void (await page.locator('#os .window[data-view="cv"] .cv h1').waitFor()))).toEqual(['127.0.0.1']);
  });

  test('at 375 px, opening the CV app', async () => {
    expect(await record(375, 812, async (page) => void (await page.locator('#os .app-icon[data-view="cv"]').tap()))).toEqual(['127.0.0.1']);
  });
});
