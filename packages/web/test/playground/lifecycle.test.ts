// A run and its window (spec US2): closing the window or reloading the page
// ends the run; minimizing doesn't.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { openPlayground, openPlaygroundPage, paneText, PLAYGROUND, readLogs, run, RUNNER, setCode, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const INTERVAL = 'setInterval(() => console.log("tick"), 100);';
const control = (page: Page, name: 'close' | 'minimize') => page.getByRole('button', { name: fill(siteText.desktop.controls[name], { window: siteText.os.views.playground }), exact: true });

async function startInterval(page: Page): Promise<void> {
  await setCode(page, INTERVAL);
  await waitForCode(page, INTERVAL);
  await waitChecked(page);
  await run(page, { wait: 'start' });
  await expect.poll(async () => (await readLogs(page)).length).toBeGreaterThan(2);
}

describe('008-typescript-playground-FR-046: a run ends with its window and its page, not when minimized', () => {
  test('closing the window removes the runner frame, and nothing logs after reopening', async () => {
    const page = await openPlaygroundPage();
    await startInterval(page);
    await control(page, 'close').click();
    await expect.poll(() => page.locator(PLAYGROUND).count()).toBe(0);
    expect(await page.locator(RUNNER).count()).toBe(0);
    await openPlayground(page);
    await waitReady(page);
    await page.waitForTimeout(500);
    expect(await paneText(page, 'logs')).toBe(siteText.playground.panes.noLogs);
    expect(await page.locator(RUNNER).count()).toBe(0);
  });

  test('a reload ends it', async () => {
    const page = await openPlaygroundPage();
    await startInterval(page);
    await page.reload();
    await page.waitForTimeout(500);
    expect(await page.locator(RUNNER).count()).toBe(0);
  });

  test("minimizing doesn't", async () => {
    const page = await openPlaygroundPage();
    await startInterval(page);
    const frame = await page.locator(RUNNER).elementHandle();
    const count = (await readLogs(page)).length;
    await control(page, 'minimize').click();
    await page.waitForTimeout(800);
    expect(await frame!.evaluate((element) => element.isConnected)).toBe(true);
    await page.locator('#os .dock-item[data-app="playground"]').click();
    await expect.poll(async () => (await readLogs(page)).length).toBeGreaterThan(count + 3);
  });
});
