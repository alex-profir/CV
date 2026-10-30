// The Playground on a phone (spec US5): the "best on desktop" screen, from
// its icon and from a shared link, with Share link and Copy link; no editor,
// no download and no run.
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { welcome } from '../../src/apps/playground/examples/index.ts';
import { openShell, PHONE_USER_AGENT, resize, settle } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';
import { EDITOR, editorText, onMac, openPlaygroundPage, PLAYGROUND, RUNNER, setCode, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const SCREEN = '#os .full-screen[data-view="playground"] section.playground-mobile';
const NOTE = `${SCREEN} p.playground-mobile-note`;
const words = siteText.playground.mobile;

const PHONE: ShellOptions = { width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT, permissions: ['clipboard-read', 'clipboard-write'] };

const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());

function linkPath(json: string): string {
  const payload = deflateRawSync(Buffer.from(json, 'utf8')).toString('base64url');
  const check = createHash('sha256').update(payload, 'ascii').digest('base64url').slice(0, 11);
  return `/#playground=1.${payload}.${check}`;
}

// A phone page that records every request under `/playground/` and every
// frame the page adds.
async function phone(options: Partial<ShellOptions> = {}): Promise<{ page: Page; engineRequests: string[] }> {
  const engineRequests: string[] = [];
  const page = await openShell({
    ...PHONE,
    ...options,
    beforeGoto: async (target) => {
      target.context().on('request', (request) => {
        if (new URL(request.url()).pathname.startsWith('/playground/')) engineRequests.push(request.url());
      });
      await options.beforeGoto?.(target);
    },
  });
  return { page, engineRequests };
}

async function openFromHome(page: Page): Promise<void> {
  await page.locator('#os .home .app-icon[data-view="playground"]').tap();
  await page.waitForSelector(SCREEN);
  await settle(page);
}

// Nothing of the editor: no editor, no download, no run.
async function expectNothingLoaded(page: Page, engineRequests: string[]): Promise<void> {
  await page.waitForTimeout(1_500);
  expect(await page.locator(EDITOR).count()).toBe(0);
  expect(await page.locator(PLAYGROUND).count()).toBe(0);
  expect(await page.locator(RUNNER).count()).toBe(0);
  expect(engineRequests).toEqual([]);
}

describe('008-typescript-playground-FR-058: on a phone the Playground shows the "best on desktop" screen', () => {
  test("the icon opens the screen full screen with the design's words, Share link and Copy link, and nothing of the editor", async () => {
    const { page, engineRequests } = await phone();
    await openFromHome(page);
    const screen = page.locator(SCREEN);
    expect(await screen.getAttribute('aria-labelledby')).toBe(await screen.locator('h2').getAttribute('id'));
    expect((await screen.locator('h2').textContent())?.trim()).toBe(words.app.heading);
    expect((await screen.locator('p').first().textContent())?.trim()).toBe(words.app.text);
    expect((await screen.locator('button.share-link').textContent())?.trim()).toBe(words.shareLink);
    expect((await screen.locator('button.copy-link').textContent())?.trim()).toBe(words.copyLink);
    expect((await page.locator(NOTE).textContent())?.trim()).toBe(words.app.note);
    expect(await page.locator(NOTE).getAttribute('role')).toBe('status');
    for (const button of ['share-link', 'copy-link']) {
      const size = (await screen.locator(`button.${button}`).boundingBox())!;
      expect(size.height, button).toBeGreaterThanOrEqual(44);
    }
    await expectNothingLoaded(page, engineRequests);
  });

  test('Share link uses the device\'s sharing where it has one, with the link alone', async () => {
    const { page } = await phone({
      beforeGoto: async (target) =>
        void (await target.addInitScript(() => {
          const shared: unknown[] = [];
          (window as unknown as { shared: unknown[] }).shared = shared;
          Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: async (data: unknown) => void shared.push(data) });
          Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
        })),
    });
    await openFromHome(page);
    await page.locator(`${SCREEN} button.share-link`).tap();
    const origin = new URL(page.url()).origin;
    await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toEqual([{ url: `${origin}/#playground` }]);
  });

  test("without the device's sharing, Share link copies the link and says so; Copy link copies it too", async () => {
    const { page } = await phone({
      beforeGoto: async (target) =>
        void (await target.addInitScript(() => {
          delete (Navigator.prototype as Partial<Navigator>).share;
          delete (Navigator.prototype as Partial<Navigator>).canShare;
        })),
    });
    await openFromHome(page);
    const origin = new URL(page.url()).origin;
    await page.locator(`${SCREEN} button.share-link`).tap();
    await expect.poll(() => clipboard(page)).toBe(`${origin}/#playground`);
    await expect.poll(async () => (await page.locator(NOTE).textContent())?.trim()).toBe(words.copied);
    await page.evaluate(() => navigator.clipboard.writeText('before'));
    await page.locator(`${SCREEN} button.copy-link`).tap();
    await expect.poll(() => clipboard(page)).toBe(`${origin}/#playground`);
    await expect.poll(async () => (await page.locator(NOTE).textContent())?.trim()).toBe(words.copied);
  });
});

describe('008-typescript-playground-FR-059: the link the screen passes on opens the Playground at a desktop width', () => {
  test('the copied link opens the Playground at 1440 with the starting example', async () => {
    const { page } = await phone();
    await openFromHome(page);
    await page.locator(`${SCREEN} button.copy-link`).tap();
    await expect.poll(() => clipboard(page)).toMatch(/\/#playground$/);
    const link = await clipboard(page);
    const desktop = await openShell({ width: 1440, height: 900, path: link.slice(new URL(link).origin.length) });
    await desktop.waitForSelector(PLAYGROUND, { state: 'visible' });
    await waitReady(desktop);
    const start = welcome(await onMac(desktop)).code;
    await waitForCode(desktop, start.split('\n')[0]!);
  });

  test("after a shell switch from the desktop with the visitor's code, the link carries that code", async () => {
    const page = await openPlaygroundPage({ permissions: ['clipboard-read', 'clipboard-write'] });
    const code = 'const fromDesktop = "carried";';
    await setCode(page, code);
    await waitForCode(page, code);
    await resize(page, 375, 812);
    await page.waitForSelector(SCREEN);
    await page.locator(`${SCREEN} button.copy-link`).click();
    await expect.poll(() => clipboard(page)).toMatch(/\/#playground=1\./);
    const link = await clipboard(page);
    const desktop = await openShell({ width: 1440, height: 900, path: link.slice(new URL(link).origin.length) });
    await desktop.waitForSelector(PLAYGROUND, { state: 'visible' });
    await waitReady(desktop);
    await waitForCode(desktop, code);
    expect(await editorText(desktop)).toBe(code);
  });
});

describe('008-typescript-playground-FR-060: a shared link opened on a phone shows the link screen and runs nothing', () => {
  test('the screen says the link holds code, shows no code, runs and downloads nothing, and passes the link on unchanged', async () => {
    const code = 'console.log("never on a phone");';
    const path = linkPath(JSON.stringify({ c: code }));
    const { page, engineRequests } = await phone({ path });
    await page.waitForSelector(SCREEN);
    await settle(page);
    expect((await page.locator(`${SCREEN} h2`).textContent())?.trim()).toBe(words.link.heading);
    expect((await page.locator(`${SCREEN} p`).first().textContent())?.trim()).toBe(words.link.text);
    expect((await page.locator(NOTE).textContent())?.trim()).toBe(words.link.note);
    expect(await page.locator('#os').textContent()).not.toContain('never on a phone');
    await expectNothingLoaded(page, engineRequests);
    expect(new URL(page.url()).hash).toBe(path.slice(1));
    await page.locator(`${SCREEN} button.copy-link`).tap();
    const origin = new URL(page.url()).origin;
    await expect.poll(() => clipboard(page)).toBe(`${origin}${path}`);
    expect(engineRequests).toEqual([]);
  });
});
