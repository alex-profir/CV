// The logs' limits (spec US2): the latest 1,000 entries, the dropped ones
// counted, and long entries cut, with the editor responding meanwhile.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { counted, fill, siteText } from '../../src/site-text.ts';
import { focusEditor, openPlaygroundPage, PLAYGROUND, readLogs, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const logs = siteText.playground.logs;

async function start(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
}

// Each key's input delay in the page, in milliseconds.
const watchKeys = (page: Page) =>
  page.evaluate(() => {
    const delays: number[] = [];
    (window as unknown as { keyDelays: number[] }).keyDelays = delays;
    document.addEventListener('keydown', (event) => delays.push(performance.now() - event.timeStamp), true);
  });

describe('008-typescript-playground-FR-044: the logs keep the latest 1,000 entries and cut long ones', () => {
  test('5,000 lines keep the latest 1,000, and the note says how many were dropped', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'for (let i = 0; i < 5000; i++) console.log(i);');
    await run(page);
    const rows = await readLogs(page);
    expect(rows).toHaveLength(1000);
    expect(rows.at(-2)).toMatchObject({ level: 'log', text: '4999' });
    // The code's 5,000 entries and the page's two notes, less the 1,000 kept.
    const dropped = 5000 + 2 - 1000;
    expect((await page.locator(`${PLAYGROUND} .pane-logs p.logs-dropped`).textContent())?.trim()).toBe(fill(counted(logs.dropped, dropped), { n: dropped.toLocaleString('en'), limit: '1,000' }));
  });

  test('a 3 MB string is cut at 10,000 characters with the note, and the editor responds meanwhile', async () => {
    const page = await openPlaygroundPage();
    await start(page, 'const big = "x".repeat(3_000_000);\nfor (let i = 0; i < 5; i++) console.log(big);');
    await watchKeys(page);
    await run(page, { wait: 'start' });
    await focusEditor(page);
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('#os section.playground .playground-toolbar button.stop')?.getAttribute('aria-disabled') === 'true');
    const cut = fill(logs.cut, { limit: '10,000' });
    const entries = (await readLogs(page)).filter((row) => row.level === 'log');
    expect(entries).toHaveLength(5);
    for (const entry of entries) expect(entry.text).toBe(`${'x'.repeat(10_000)} ${cut}`);
    const delays = await page.evaluate(() => (window as unknown as { keyDelays: number[] }).keyDelays);
    expect(Math.max(...delays)).toBeLessThan(100);
  });
});
