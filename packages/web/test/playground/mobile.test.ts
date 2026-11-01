// The Playground on a phone (spec US5): the "best on desktop" screen, from
// its icon and from a shared link, with Share link and Copy link; no editor,
// no download and no run.
import { createHash, randomBytes } from 'node:crypto';
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

  for (const [name, failure, copied] of [
    ['a failure copies the link instead', 'NotAllowedError', true],
    ['a cancel does nothing more', 'AbortError', false],
  ] as const) {
    test(`Share link, when the device's sharing fails: ${name}`, async () => {
      const { page } = await phone({
        beforeGoto: async (target) =>
          void (await target.addInitScript((thrown) => {
            Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: () => Promise.reject(new DOMException('Not shared', thrown)) });
            Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
          }, failure)),
      });
      await openFromHome(page);
      await page.evaluate(() => navigator.clipboard.writeText('before'));
      await page.locator(`${SCREEN} button.share-link`).tap();
      const origin = new URL(page.url()).origin;
      if (copied) await expect.poll(() => clipboard(page)).toBe(`${origin}/#playground`);
      else {
        await page.waitForTimeout(300);
        expect(await clipboard(page)).toBe('before');
      }
    });
  }

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

  test("with no code to carry, the link opens the Playground as its dock item does, with the code the recipient's browser keeps", async () => {
    const page = await openPlaygroundPage();
    const code = 'const kept = "by the recipient";';
    await setCode(page, code);
    await waitForCode(page, code);
    await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => (localStorage.getItem(key) ?? '').includes('by the recipient')))).toBe(true);
    // A new load, as following the link is.
    const origin = new URL(page.url()).origin;
    await page.goto('about:blank');
    await page.goto(`${origin}/#playground`);
    await page.waitForSelector(PLAYGROUND, { state: 'visible' });
    await waitReady(page);
    await waitForCode(page, code);
    expect(await editorText(page)).toBe(code);
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
  test('a link pasted into a tab already on the site shows the link screen, and changes the open screen', async () => {
    const path = linkPath(JSON.stringify({ c: 'console.log("pasted on a phone");' }));
    const { page, engineRequests } = await phone({});
    await settle(page);
    await page.evaluate((hash) => void (location.hash = hash), new URL(`http://site${path}`).hash);
    await page.waitForSelector(SCREEN);
    expect((await page.locator(`${SCREEN} h2`).textContent())?.trim()).toBe(words.link.heading);
    expect((await page.locator(NOTE).textContent())?.trim()).toBe(words.link.note);
    await page.evaluate(() => void (location.hash = 'playground'));
    await expect.poll(async () => (await page.locator(`${SCREEN} h2`).textContent())?.trim()).toBe(words.app.heading);
    await page.evaluate((hash) => void (location.hash = hash), new URL(`http://site${path}`).hash);
    await expect.poll(async () => (await page.locator(`${SCREEN} h2`).textContent())?.trim()).toBe(words.link.heading);
    await expectNothingLoaded(page, engineRequests);
  });

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

const REFUSE_CLIPBOARD = () => Object.defineProperty(Clipboard.prototype, 'writeText', { configurable: true, value: () => Promise.reject(new DOMException('refused', 'NotAllowedError')) });
const LINK_FIELD = '.playground-mobile-link input';

describe('008-typescript-playground-FR-052: on a phone, a link that can\'t be copied shows in a field', () => {
  test.each([[375], [320]])('at %i px: Copy link shows it selected, and the card still fits', async (width) => {
    const { page } = await phone({
      width,
      beforeGoto: async (target) => {
        await target.addInitScript(REFUSE_CLIPBOARD);
      },
    });
    await openFromHome(page);
    await page.locator(`${SCREEN} button.copy-link`).tap();
    const field = page.locator(`${SCREEN} ${LINK_FIELD}`);
    await field.waitFor();
    const value = await field.inputValue();
    expect(value).toMatch(/\/#playground$/);
    expect(await field.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd])).toEqual([0, value.length]);
    expect(await page.locator(NOTE).count()).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
});

describe('008-typescript-playground-FR-055: on a phone, code too long for a link says so', () => {
  const planted = (code: string, refuse: boolean) => async (target: Page) => {
    await target.addInitScript((kept) => localStorage.setItem('cv-playground', kept), JSON.stringify({ format: 1, code, options: {} }));
    if (refuse) await target.addInitScript(REFUSE_CLIPBOARD);
  };
  const longCode = () => `// ${randomBytes(100_000).toString('hex')}`;

  test('Copy link copies the code and says why', async () => {
    const code = longCode();
    const { page } = await phone({ beforeGoto: planted(code, false) });
    await openFromHome(page);
    await page.locator(`${SCREEN} button.copy-link`).tap();
    await expect.poll(() => page.locator(NOTE).textContent()).toBe(siteText.playground.mobile.tooLongCopied);
    expect(await clipboard(page)).toBe(code);
  });

  test('Share link does the same, and a clipboard that refuses says so', async () => {
    const { page } = await phone({ beforeGoto: planted(longCode(), true) });
    await openFromHome(page);
    await page.locator(`${SCREEN} button.share-link`).tap();
    await expect.poll(() => page.locator(NOTE).textContent()).toBe(siteText.playground.mobile.tooLongRefused);
  });
});
