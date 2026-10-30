// Stop (spec US2, SC-003): an endless loop ends within a second, an
// interval is cancelled, and the code and logs stay with the stop noted.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { editorText, openPlaygroundPage, readLogs, run, RUN_STATE, RUNNER, setCode, stop, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

async function start(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
  await run(page, { wait: 'start' });
}

const stopped = new RegExp(`^${fill(siteText.playground.runState.stopped, { s: '[\\d.]+' })}$`);

describe('008-typescript-playground-FR-038: Stop ends the run at once and keeps the code and logs', () => {
  test('Stop during an endless loop ends it within 1 s (SC-003)', async () => {
    const page = await openPlaygroundPage();
    const code = 'console.log("before");\nwhile (true) {}';
    await start(page, code);
    await page.waitForTimeout(1_500);
    const pressed = Date.now();
    await stop(page, 1_000);
    expect(Date.now() - pressed).toBeLessThan(1_000);
    expect(await page.locator(RUNNER).count()).toBe(0);
    expect(await editorText(page)).toBe(code);
    const rows = await readLogs(page);
    expect(rows.some((row) => row.text === 'before')).toBe(true);
    expect(rows.at(-1)!.text).toMatch(stopped);
    expect((await page.locator(RUN_STATE).textContent())?.trim()).toMatch(stopped);
  });

  test('Stop during an interval cancels it', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'setInterval(() => console.log("tick"), 100);');
    await page.waitForTimeout(600);
    await stop(page);
    const count = (await readLogs(page)).length;
    await page.waitForTimeout(800);
    expect((await readLogs(page)).length).toBe(count);
    expect(await page.locator(`${TOOLBAR} button.stop`).getAttribute('aria-disabled')).toBe('true');
  });
});
