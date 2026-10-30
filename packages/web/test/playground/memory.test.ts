// A run that runs out of memory or stops unexpectedly (research R24, three
// engines, T024). As amended 2026-10-30, the browser may end the page itself.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { fill, siteText } from '../../src/site-text.ts';
import { openPlaygroundPage, readLogs, RUN_STATE, run, setCode, waitChecked, waitForCode } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const forms = siteText.playground.runState;
// A form of the run state, with its `{s}` as any number.
const shape = (form: string) => new RegExp(`^${fill(form, { s: '[\\d.]+' })}$`);

// Stops growing here, so an engine with no limit below it can't take the test
// machine down with it.
const CAP_MB = 6144;

const GROW = `const kept: number[][] = [];
for (let mb = 0; mb < ${CAP_MB}; mb += 8) {
  const chunk = new Array<number>(1 << 20);
  for (let i = 0; i < chunk.length; i += 1) chunk[i] = i + 0.5;
  kept.push(chunk);
}
console.log("reached the cap", kept.length);`;

async function start(page: Page, code: string): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
  await run(page, { wait: 'none' });
}

const state = async (page: Page) => (await page.locator(RUN_STATE).textContent())?.trim() ?? '';

// The site works and the next run logs.
async function nextRunWorks(page: Page): Promise<void> {
  const code = 'console.log("next run");';
  await setCode(page, code);
  await waitForCode(page, code);
  await waitChecked(page);
  await run(page);
  await expect.poll(async () => (await readLogs(page)).map((row) => row.text)).toContain('next run');
  expect(await page.locator('#os .window[data-view="playground"]').isVisible()).toBe(true);
}

describe('008-typescript-playground-FR-045: a run out of memory ends with a note, unless the browser ends the page', () => {
  test('code that grows memory until it fails: the note and a working next run, or the browser crashes the page', async () => {
    const page = await openPlaygroundPage();
    let crashed = false;
    page.on('crash', () => (crashed = true));
    await start(page, GROW);
    const started = Date.now();
    const ended = async () => {
      if (crashed) return true;
      const text = await state(page).catch(() => '');
      return text !== '' && !/running/i.test(text);
    };
    while (Date.now() - started < 180_000 && !(await ended())) await page.waitForTimeout(500).catch(() => undefined);
    if (crashed) return;
    // The stuck popup may show while it grows; the run has ended by now.
    const text = await state(page);
    const logs = (await readLogs(page)).map((row) => row.text);
    if (!logs.includes(`reached the cap ${CAP_MB / 8}`)) expect(text).toSatisfy((shown: string) => shape(forms.outOfMemory).test(shown) || shape(forms.crashed).test(shown));
    await nextRunWorks(page);
  });

  test('a run that stops unexpectedly with the page alive gets the note, and the next run works', async () => {
    const page = await openPlaygroundPage();
    // TypeScript emits this with its error, and the worker's script doesn't
    // parse: the worker's `error` event, not memory.
    await start(page, 'const twice = 1;\nconst twice = 2;\nconsole.log("never");');
    await expect.poll(() => state(page), { timeout: 30_000 }).toMatch(shape(forms.crashed));
    expect((await readLogs(page)).map((row) => row.text)).not.toContain('never');
    await nextRunWorks(page);
  });
});
