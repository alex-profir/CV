// Shell switches (spec US5): narrowing to the phone and widening back loses
// nothing the Playground held, a run goes on with the same runner frame,
// and a link read on the phone opens once the shell widens.
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { openShell, resize } from '../helpers/shell.ts';
import { EDITOR, editorText, MESSAGE, openPlaygroundPage, paneTab, PLAYGROUND, readLogs, run, RUNNER, running, setCode, stop, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const OPTION = 'noUncheckedIndexedAccess';
const SCREEN = '#os .full-screen[data-view="playground"] section.playground-mobile';

const ticks = async (page: Page) => (await readLogs(page)).filter((row) => row.level === 'log').length;

describe('008-typescript-playground-FR-061: a shell switch loses nothing the Playground held', () => {
  test('1440 → 375 → 1440 keeps the code, the option, the Logs pane and its logs, and the run goes on in the same frame', async () => {
    const page = await openPlaygroundPage();
    const code = 'let n = 0;\nsetInterval(() => console.log("tick", ++n), 200);';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await page.locator(`${TOOLBAR} button.options`).click();
    await page.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`).check();
    await page.locator(`${TOOLBAR} button.options`).click();
    await waitChecked(page);
    await run(page, { wait: 'start' });
    await expect.poll(() => ticks(page)).toBeGreaterThan(2);
    const frame = await page.locator(RUNNER).elementHandle();

    await resize(page, 375, 812);
    await page.waitForSelector(SCREEN);
    expect(await page.locator(PLAYGROUND).count()).toBe(0);
    await page.waitForTimeout(1_000);
    await resize(page, 1440, 900);
    await page.waitForSelector(`${EDITOR} .monaco-editor`);

    expect(await running(page)).toBe(true);
    expect(await frame!.evaluate((element) => element.isConnected)).toBe(true);
    expect(await page.locator(RUNNER).count()).toBe(1);
    expect(await paneTab(page, 'logs').getAttribute('aria-selected')).toBe('true');
    const before = await ticks(page);
    await expect.poll(() => ticks(page)).toBeGreaterThan(before + 1);
    // Five ticks a second: the second on the phone counted too.
    expect(before).toBeGreaterThan(6);
    expect(await editorText(page)).toBe(code);
    await page.locator(`${TOOLBAR} button.options`).click();
    expect(await page.locator(`${PLAYGROUND} section.options-panel #playground-option-${OPTION}`).isChecked()).toBe(true);
    await stop(page);
  });

  test('a link read at 375 and not yet opened opens when the shell widens', async () => {
    const code = 'console.log("opened when wide");';
    const payload = deflateRawSync(Buffer.from(JSON.stringify({ c: code }), 'utf8')).toString('base64url');
    const check = createHash('sha256').update(payload, 'ascii').digest('base64url').slice(0, 11);
    const page = await openShell({ width: 375, height: 812, path: `/#playground=1.${payload}.${check}` });
    await page.waitForSelector(SCREEN);
    await resize(page, 1440, 900);
    await page.waitForSelector(PLAYGROUND, { state: 'visible' });
    await waitReady(page);
    await waitForCode(page, code);
    expect(((await page.locator(`${MESSAGE} p`).textContent()) ?? '').trim()).toBe(siteText.playground.messages.sharedOpened);
    await page.waitForTimeout(1_000);
    expect(await page.locator(RUNNER).count()).toBe(0);
    expect(new URL(page.url()).hash).toBe('');
  });
});
