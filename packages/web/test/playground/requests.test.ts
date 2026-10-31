// The Playground on the site alone (spec US8, SC-012): the download,
// editing, every example, a run of code that makes no request, sharing and
// the phone's screen request nothing from another site, the sandboxed
// frame's included.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { examples } from '../../src/apps/playground/examples/index.ts';
import { openShell, PHONE_USER_AGENT, settle } from '../helpers/shell.ts';
import { chooseExample, freshProfile, MESSAGE, onMac, openPlayground, run, setCode, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 300_000 });

// Every request the page's context makes, its workers and frames included,
// by URL. `data:` and `blob:` URLs are the page's own.
function watchRequests(page: Page): string[] {
  const seen: string[] = [];
  page.context().on('request', (request) => seen.push(request.url()));
  return seen;
}

const elsewhere = (urls: string[], origin: string) => urls.filter((url) => !url.startsWith(`${origin}/`) && !/^(?:data|blob):/.test(url));

describe('008-typescript-playground-FR-010: the Playground requests nothing from another site (SC-012)', () => {
  test('the download, editing, every example, a run, and sharing request only the site', async () => {
    const page = await freshProfile();
    const urls = watchRequests(page);
    const origin = new URL(page.url()).origin;
    expect(new URL(origin).hostname).toBe('127.0.0.1');
    await openPlayground(page);
    await waitReady(page);
    for (const example of examples(await onMac(page))) {
      await chooseExample(page, example.title);
      await waitForCode(page, example.code.split('\n')[0]!);
      await waitChecked(page);
    }
    await setCode(page, 'const kinds = ["a", "b"].map((kind) => kind.toUpperCase());\nconsole.log(kinds);');
    await waitChecked(page);
    await run(page);
    await page.locator(`${TOOLBAR} button.share`).click();
    await page.waitForSelector(MESSAGE);
    await settle(page);
    expect(urls.some((url) => url.includes('/playground/'))).toBe(true);
    expect(elsewhere(urls, origin)).toEqual([]);
  });

  test("the phone's screen requests only the site", async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    const urls = watchRequests(page);
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    await page.waitForSelector('#os .full-screen[data-view="playground"] section.playground-mobile');
    await settle(page);
    expect(elsewhere(urls, new URL(page.url()).origin)).toEqual([]);
  });
});
