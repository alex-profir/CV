// Sharing code as a link (spec US4, contracts/share-link.md): Share copies
// a link that holds the code and the changed options; opening one shows the
// code in front of the CV window and never runs it; broken, too-long and
// unknown-option links are handled, and kept code survives.
import { createHash } from 'node:crypto';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { welcome } from '../../src/apps/playground/examples/index.ts';
import { frontWindow, settle, waitForReady } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';
import { editorText, freshProfile, linkFrom, MESSAGE, onMac, openPlayground, PLAYGROUND, readLogs, RUNNER, setCode, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const KEY = 'cv-playground';
const OPTION = 'noUncheckedIndexedAccess';
const WINDOW = '#os .window[data-view="playground"]';
const ANNOUNCER = '#os [role="status"].visually-hidden';
const messages = siteText.playground.messages;

const kept = (page: Page) => page.evaluate((key) => localStorage.getItem(key), KEY);
const clipboard = (page: Page) => page.evaluate(() => navigator.clipboard.readText());
const messageText = async (page: Page) => ((await page.locator(`${MESSAGE} p`).textContent()) ?? '').trim();
const messageButtons = async (page: Page) => (await page.locator(`${MESSAGE} .message-actions button.text-button`).allTextContents()).map((text) => text.trim());

// The same link's address within the site, for a page not opened yet.
const pathFrom = (json: string) => linkFrom('', json);

const originOf = (page: Page) => new URL(page.url()).origin;

async function share(page: Page): Promise<void> {
  await page.locator(`${TOOLBAR} button.share`).click();
  await page.waitForSelector(MESSAGE);
}

async function setOption(page: Page): Promise<void> {
  await page.locator(`${TOOLBAR} button.options`).click();
  await page.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`).check();
  await page.locator(`${TOOLBAR} button.options`).click();
}

// Opens `href` in the page as a new load, as following a link does.
async function follow(page: Page, href: string): Promise<void> {
  await page.goto('about:blank');
  await page.goto(href);
  await waitForReady(page);
  await page.waitForSelector(PLAYGROUND, { state: 'visible' });
  await waitReady(page);
}

// A fresh profile that opens `path` first.
async function openAt(path: string, options: Partial<ShellOptions> = {}): Promise<Page> {
  const page = await freshProfile({ path, ...options });
  await page.waitForSelector(PLAYGROUND, { state: 'visible' });
  await waitReady(page);
  return page;
}

// A page whose code is kept: the visitor's code, written and kept.
async function withKeptCode(code: string): Promise<Page> {
  const page = await freshProfile();
  await openPlayground(page);
  await waitReady(page);
  await setCode(page, code);
  await waitForCode(page, code);
  await expect.poll(async () => JSON.parse((await kept(page)) ?? '{}').code).toBe(code);
  return page;
}

describe('008-typescript-playground-FR-052: Share copies a link with the code and the changed options', () => {
  test('Share copies the link, says what it holds, and is announced; the link opens the same code and options', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    const code = 'const shared: number = 42;\nconsole.log(shared);';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await setOption(page);
    await share(page);
    const text = fill(messages.linkCopied.one, { n: 1 });
    expect(await messageText(page)).toBe(text);
    expect(await page.locator(MESSAGE).getAttribute('data-kind')).toBe('done');
    await expect.poll(() => page.locator(ANNOUNCER).textContent()).toBe(text);
    const link = await clipboard(page);
    expect(link.startsWith(`${originOf(page)}/#playground=1.`)).toBe(true);

    const other = await openAt(link.slice(originOf(page).length));
    await waitForCode(other, code.split('\n')[0]!);
    expect(await editorText(other)).toBe(code);
    await other.locator(`${TOOLBAR} button.options`).click();
    expect(await other.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`).isChecked()).toBe(true);
  });

  test('the menu\'s Share… shares too, and with no option changed the message says so', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await page.click('#menu-title-app');
    await page.getByRole('menuitem', { name: siteText.playground.menu.share, exact: true }).click();
    await page.waitForSelector(MESSAGE);
    expect(await messageText(page)).toBe(messages.linkCopied.none);
    expect(await clipboard(page)).toMatch(/#playground=1\.[\w-]+\.[\w-]{11}$/);
  });

  test('Share with… shows only where the device has its own sharing, and passes the link alone', async () => {
    const without = await freshProfile({
      beforeGoto: async (page) => void (await page.addInitScript(() => {
        delete (Navigator.prototype as Partial<Navigator>).share;
        delete (Navigator.prototype as Partial<Navigator>).canShare;
      })),
    });
    await openPlayground(without);
    await waitReady(without);
    await share(without);
    expect(await messageButtons(without)).toEqual([]);

    const page = await freshProfile({
      beforeGoto: async (target) => void (await target.addInitScript(() => {
        const shared: unknown[] = [];
        (window as unknown as { shared: unknown[] }).shared = shared;
        Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: async (data: unknown) => void shared.push(data) });
        Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
      })),
    });
    await openPlayground(page);
    await waitReady(page);
    await share(page);
    expect(await messageButtons(page)).toEqual([messages.actions['share-with']]);
    await page.locator(`${MESSAGE} button.text-button`).click();
    const link = await clipboard(page);
    await expect.poll(() => page.evaluate(() => (window as unknown as { shared: unknown[] }).shared)).toEqual([{ url: link }]);
  });

  test('Share with… that fails shows the link to copy by hand; a cancel shows nothing new', async () => {
    for (const [reason, field] of [['NotAllowedError', true], ['AbortError', false]] as const) {
      const page = await freshProfile({
        beforeGoto: async (target) => void (await target.addInitScript((thrown) => {
          Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: () => Promise.reject(new DOMException('Not shared', thrown)) });
          Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
        }, reason)),
      });
      await openPlayground(page);
      await waitReady(page);
      await share(page);
      await page.locator(`${MESSAGE} button.text-button`).click();
      if (field) await page.waitForSelector(`${MESSAGE} input.message-link`);
      else {
        await page.waitForTimeout(300);
        expect(await page.locator(`${MESSAGE} input.message-link`).count()).toBe(0);
      }
    }
  });

  test('when the clipboard refuses, the link shows selected in a read-only field', async () => {
    const page = await freshProfile({
      beforeGoto: async (target) => void (await target.addInitScript(() => {
        Object.defineProperty(Clipboard.prototype, 'writeText', { configurable: true, value: () => Promise.reject(new DOMException('refused', 'NotAllowedError')) });
      })),
    });
    await openPlayground(page);
    await waitReady(page);
    await share(page);
    expect(await messageText(page)).toBe(messages.linkField);
    const field = page.locator(`${MESSAGE} input.message-link`);
    expect(await field.getAttribute('readonly')).not.toBeNull();
    expect(await field.getAttribute('aria-label')).toBe(messages.linkFieldName);
    const value = await field.inputValue();
    expect(value).toMatch(/\/#playground=1\.[\w-]+\.[\w-]{11}$/);
    expect(await field.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd, document.activeElement === input])).toEqual([0, value.length, true]);
  });
});

describe("008-typescript-playground-FR-055: Copy the code says so when the clipboard refuses", () => {
  test("the message says it couldn't be copied, in the phone's words, and offers Copy again", async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    let seed = 11;
    let noise = '';
    while (noise.length < 14_000) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      noise += String.fromCharCode(97 + (seed % 26));
    }
    await setCode(page, `const noise = "${noise}";`);
    await waitChecked(page);
    await page.evaluate(() => {
      Object.defineProperty(Clipboard.prototype, 'writeText', { configurable: true, value: () => Promise.reject(new DOMException('refused', 'NotAllowedError')) });
    });
    await page.locator(`${TOOLBAR} button.share`).click();
    await page.getByRole('button', { name: messages.actions['copy-code'] }).click();
    await expect.poll(() => messageText(page)).toBe(siteText.playground.mobile.tooLongRefused);
    expect(await messageButtons(page)).toEqual([messages.actions['copy-code']]);
  });
});

describe('008-typescript-playground-FR-052: the link to copy by hand offers the device\'s sharing too', () => {
  test('with a clipboard that refuses and a device that shares, Share with… shows beside the field', async () => {
    const page = await freshProfile({
      beforeGoto: async (target) => {
        await target.addInitScript(() => {
          Object.defineProperty(Clipboard.prototype, 'writeText', { configurable: true, value: () => Promise.reject(new DOMException('refused', 'NotAllowedError')) });
          Object.defineProperty(navigator, 'share', { value: () => Promise.resolve(), configurable: true });
          Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
        });
      },
    });
    await openPlayground(page);
    await waitReady(page);
    await share(page);
    expect(await messageText(page)).toBe(messages.linkField);
    expect(await messageButtons(page)).toEqual([messages.actions['share-with']]);
  });
});

describe('008-typescript-playground-FR-026: compiler options travel in shared links', () => {
  test('a link with an option this version does not know opens without it, then names it', async () => {
    const page = await openAt(pathFrom(JSON.stringify({ c: 'let a = 1;', o: { [OPTION]: true, fancyMode: true } })));
    await waitForCode(page, 'let a = 1;');
    expect(await messageText(page)).toBe(messages.sharedOpened);
    await page.locator(`${MESSAGE} button.dismiss`).click();
    expect(await messageText(page)).toBe(fill(messages.unknownOptions.one, { n: 1, names: 'fancyMode' }));
    await page.locator(`${TOOLBAR} button.options`).click();
    expect(await page.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`).isChecked()).toBe(true);
  });
});

describe('008-typescript-playground-FR-026: a link keeps a strict check set on its own under strict: false', () => {
  test('written with the check, it reads as on; written without, as an older link, it reads as off', async () => {
    const off = { strict: false, strictNullChecks: false, strictFunctionTypes: false, strictBindCallApply: false, strictPropertyInitialization: false, strictBuiltinIteratorReturn: false, noImplicitThis: false, useUnknownInCatchVariables: false };
    const box = (page: Page) => page.locator(`${PLAYGROUND} section.options-panel #playground-option-noImplicitAny`);
    for (const [options, on] of [[{ ...off, noImplicitAny: true }, true], [off, false]] as const) {
      const page = await openAt(pathFrom(JSON.stringify({ c: 'let a = 1;', o: options })));
      await waitForCode(page, 'let a = 1;');
      await page.locator(`${TOOLBAR} button.options`).click();
      expect(await box(page).isChecked()).toBe(on);
    }
  });
});

describe('008-typescript-playground-FR-053: a shared link opens the Playground in front of the CV window and never runs the code', () => {
  test('a fresh profile opens the CV window and the Playground in front, focused, with the code and the note; nothing runs; the address is / after', async () => {
    const code = 'console.log("this must not run");\nsetTimeout(() => console.log("nor this"), 10);';
    const page = await openAt(pathFrom(JSON.stringify({ c: code })));
    await waitForCode(page, code.split('\n')[0]!);
    expect(await page.locator('#os .window[data-view="cv"]').count()).toBe(1);
    await settle(page);
    expect(await frontWindow(page)).toBe('playground');
    await expect.poll(() => page.evaluate((selector) => document.activeElement?.closest(selector) !== null, `${PLAYGROUND} .playground-editor`)).toBe(true);
    expect(await messageText(page)).toBe(messages.sharedOpened);
    expect(await messageButtons(page)).toEqual([messages.actions.run]);
    expect(new URL(page.url()).hash).toBe('');
    expect(new URL(page.url()).pathname).toBe('/');
    await page.waitForTimeout(10_000);
    expect(await page.locator(RUNNER).count()).toBe(0);
    expect(await readLogs(page)).toEqual([]);
    expect(await page.locator(`${TOOLBAR} p.run-state`).textContent()).toBe('');
  });

  test('a link pasted into a tab already on the site opens the same way, closed or already open, and never runs', async () => {
    const page = await freshProfile();
    const first = 'console.log("pasted while closed");';
    await page.evaluate((hash) => void (location.hash = hash), new URL(`http://site${pathFrom(JSON.stringify({ c: first }))}`).hash);
    await waitForCode(page, first);
    expect(await frontWindow(page)).toBe('playground');
    expect(await messageText(page)).toBe(messages.sharedOpened);
    expect(new URL(page.url()).hash).toBe('');
    const second = 'console.log("pasted while open");';
    const hash = new URL(`http://site${pathFrom(JSON.stringify({ c: second }))}`).hash;
    await page.evaluate((value) => void (location.hash = value), hash);
    await waitForCode(page, second);
    expect(new URL(page.url()).hash).toBe('');
    // The same link again is a new one.
    await setCode(page, first);
    await waitForCode(page, first);
    await page.evaluate((value) => void (location.hash = value), hash);
    await waitForCode(page, second);
    expect(await page.locator(RUNNER).count()).toBe(0);
    expect(await readLogs(page)).toEqual([]);
  });

  test('Run in the message runs it; a reload shows the code with the visitor\'s edits', async () => {
    const code = 'console.log("ran");';
    const page = await openAt(pathFrom(JSON.stringify({ c: code })));
    await waitForCode(page, code);
    await page.locator(`${MESSAGE} button.text-button`).filter({ hasText: messages.actions.run }).click();
    await expect.poll(async () => (await readLogs(page)).filter((row) => row.level === 'log').map((row) => row.text)).toEqual(['ran']);
    const edited = `${code}\nconsole.log("edited");`;
    await setCode(page, edited);
    await waitForCode(page, edited.split('\n')[1]!);
    await expect.poll(async () => JSON.parse((await kept(page)) ?? '{}').code).toBe(edited);
    await page.reload();
    await waitForReady(page);
    expect(await page.locator(WINDOW).count()).toBe(0);
    await openPlayground(page);
    await waitReady(page);
    await waitForCode(page, edited.split('\n')[1]!);
    expect(await editorText(page)).toBe(edited);
  });
});

describe('008-typescript-playground-FR-054: sharing sends nothing, and a link opens offline', () => {
  test('Share makes no request, and no request carries the fragment', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await setCode(page, 'let secret = "share me";');
    await waitChecked(page);
    const requests: string[] = [];
    page.context().on('request', (request) => requests.push(request.url()));
    await share(page);
    const link = await clipboard(page);
    await page.waitForTimeout(1_000);
    expect(requests).toEqual([]);
    const opened: string[] = [];
    const other = await freshProfile({ path: link.slice(new URL(link).origin.length), beforeGoto: async (target) => void target.context().on('request', (request) => opened.push(request.url())) });
    await other.waitForSelector(PLAYGROUND, { state: 'visible' });
    await waitReady(other);
    expect(opened.length).toBeGreaterThan(0);
    expect(opened.filter((address) => address.includes('#') || address.includes('playground='))).toEqual([]);
  });

  test('with TypeScript stored, a link opens offline with its code', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await page.waitForTimeout(2_000);
    const code = 'console.log("offline");';
    await page.context().setOffline(true);
    await follow(page, linkFrom(originOf(page), JSON.stringify({ c: code })));
    await waitForCode(page, code);
    expect(await messageText(page)).toBe(messages.sharedOpened);
  });
});

describe('008-typescript-playground-FR-055: code too long for a link offers to copy the code instead', () => {
  test('code over 8,000 characters shows the link\'s length and Copy the code, and makes no link', async () => {
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    let seed = 11;
    let noise = '';
    while (noise.length < 14_000) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      noise += String.fromCharCode(97 + (seed % 26));
    }
    const code = `const noise = "${noise}";`;
    await setCode(page, code);
    await waitChecked(page);
    await page.evaluate(() => navigator.clipboard.writeText('before'));
    await share(page);
    expect(await page.locator(MESSAGE).getAttribute('data-kind')).toBe('warn');
    const text = await messageText(page);
    const length = /would be ([\d,]+) characters/.exec(text)?.[1];
    expect(length).toBeDefined();
    expect(Number(length!.replace(/,/g, ''))).toBeGreaterThan(8_000);
    expect(text).toBe(fill(messages.tooLong, { length: length!, limit: '8,000' }));
    expect(await clipboard(page)).toBe('before');
    expect(await messageButtons(page)).toEqual([messages.actions['copy-code']]);
    await page.locator(`${MESSAGE} button.text-button`).click();
    await expect.poll(() => clipboard(page)).toBe(code);
    expect(await messageText(page)).toBe(messages.codeCopied);
  });
});

describe("008-typescript-playground-FR-056: a broken link opens the starting example, runs nothing and leaves kept code alone", () => {
  test('a cut-off, an altered and a garbled link each open Welcome with the message', async () => {
    const own = 'const mine = "kept";';
    const page = await withKeptCode(own);
    const url = originOf(page);
    const link = linkFrom(url, JSON.stringify({ c: 'console.log("shared");' }));
    const payload = /=1\.([^.]+)\./.exec(link)![1]!;
    const altered = link.replace(payload, `${payload.slice(0, 3)}${payload[3] === 'A' ? 'B' : 'A'}${payload.slice(4)}`);
    const garbled = `${url}/#playground=1.${'ZZZZ'.repeat(4)}.${createHash('sha256').update('ZZZZ'.repeat(4), 'ascii').digest('base64url').slice(0, 11)}`;
    const start = welcome(await onMac(page)).code;
    for (const broken of [link.slice(0, -4), altered, garbled]) {
      await follow(page, broken);
      await waitForCode(page, start.split('\n')[0]!);
      expect(await messageText(page), broken).toBe(messages.brokenLink);
      expect(await page.locator(MESSAGE).getAttribute('data-kind')).toBe('error');
      expect(new URL(page.url()).hash).toBe('');
      await page.waitForTimeout(1_000);
      expect(await page.locator(RUNNER).count()).toBe(0);
      expect(await readLogs(page)).toEqual([]);
      expect(JSON.parse((await kept(page))!).code).toBe(own);
    }
  });
});

describe('008-typescript-playground-FR-057: a shared link replaces the visitor\'s code, says so, and Undo brings it back', () => {
  test("Undo brings the visitor's options back from under the link's", async () => {
    const own = 'const mine = "kept";';
    const page = await withKeptCode(own);
    await setOption(page);
    await expect.poll(async () => JSON.parse((await kept(page)) ?? '{}').options?.[OPTION]).toBe(true);
    await follow(page, `${originOf(page)}${pathFrom(JSON.stringify({ c: 'let a = 1;' }))}`);
    await waitForCode(page, 'let a = 1;');
    await page.locator(MESSAGE).getByRole('button', { name: messages.actions.undo }).click();
    await expect.poll(() => editorText(page)).toBe(own);
    await page.locator(`${TOOLBAR} button.options`).click();
    expect(await page.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`).isChecked()).toBe(true);
  });

  // T213: kept code's notice waits behind the link's message, and comes after it.
  test("kept code's notice isn't lost to a shared link's message", async () => {
    const page = await freshProfile({
      path: pathFrom(JSON.stringify({ c: 'let a = 1;', o: { fancyMode: true } })),
      beforeGoto: async (target) => {
        await target.addInitScript((key) => localStorage.setItem(key, JSON.stringify({ format: 1, code: 'let older = 1;', options: { oldOption: true } })), KEY);
      },
    });
    await page.waitForSelector(PLAYGROUND, { state: 'visible' });
    await waitReady(page);
    await waitForCode(page, 'let a = 1;');
    expect(await messageText(page)).toBe(messages.sharedReplaced);
    await page.locator(`${MESSAGE} button.dismiss`).click();
    expect(await messageText(page)).toBe(fill(messages.unknownOptions.one, { n: 1, names: 'fancyMode' }));
    await page.locator(`${MESSAGE} button.dismiss`).click();
    expect(await messageText(page)).toBe(fill(messages.unknownKeptOptions.one, { n: 1, names: 'oldOption' }));
    await page.locator(`${MESSAGE} button.dismiss`).click();
    expect(await page.locator(MESSAGE).count()).toBe(0);
  });

  test('opened over kept code: the shared code with the longer note and Undo; Undo brings the kept code back', async () => {
    const own = 'const mine = "kept";';
    const page = await withKeptCode(own);
    const code = 'console.log("shared");';
    await follow(page, linkFrom(originOf(page), JSON.stringify({ c: code })));
    await waitForCode(page, code);
    expect(await messageText(page)).toBe(messages.sharedReplaced);
    expect(await messageButtons(page)).toEqual([messages.actions.undo, messages.actions.run]);
    await page.locator(`${MESSAGE} button.text-button`).filter({ hasText: messages.actions.undo }).click();
    await waitForCode(page, own);
    expect(await editorText(page)).toBe(own);
  });
});

describe('008-typescript-playground-SC-007: every code a link holds opens again', () => {
  test('1.2 MB of code that compresses well, made by Share, opens from its link', async () => {
    const code = 'const a = 1;\n'.repeat(100_000);
    const page = await freshProfile();
    await openPlayground(page);
    await waitReady(page);
    await setCode(page, code);
    await waitForCode(page, 'const a = 1;');
    await share(page);
    expect(await messageText(page)).not.toBe(messages.brokenLink);
    const link = await clipboard(page);
    expect(link.length).toBeLessThanOrEqual(8000);
    const other = await freshProfile();
    await other.goto(link);
    await waitForReady(other);
    await settle(other);
    await other.waitForSelector(MESSAGE, { timeout: 60_000 });
    expect(await messageText(other)).not.toBe(messages.brokenLink);
    await waitForCode(other, 'const a = 1;');
  });
});
