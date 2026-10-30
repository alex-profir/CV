// How fast the Playground answers (SC-001, SC-002): usable within 15 s of
// the first open on a 10 Mbit/s connection and within 2 s on a later open,
// online and offline; with 300 lines of code, errors within 1 s of a pause
// and a type or suggestions within 500 ms, in 95 of 100 tries. CI's shared
// runners only log the times, as the other timing tests do.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { settle } from '../helpers/shell.ts';
import { EDITOR, freshProfile, onMac, openPlayground, openPlaygroundPage, PLAYGROUND, setCode, waitChecked, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 900_000 });

const TRIES = 100;
const STATUS_CHECK = `${PLAYGROUND} .playground-status .check`;

// The 95th fastest of the tries.
const p95 = (times: number[]) => [...times].sort((a, b) => a - b)[Math.ceil(times.length * 0.95) - 1]!;

async function slowNetwork(page: Page): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (5 * 1024 * 1024) / 8 });
}

async function timedOpen(page: Page): Promise<number> {
  const started = Date.now();
  await openPlayground(page);
  await waitReady(page, 60_000);
  return Date.now() - started;
}

async function closePlayground(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Close Playground' }).click();
  await expect.poll(() => page.locator('#os .window[data-view="playground"]').count()).toBe(0);
}

// 300 lines of code that check with no error.
const CODE = [
  'interface Job { title: string; years: number; skills: string[] }',
  'const job: Job = { title: "Engineer", years: 3, skills: ["TypeScript"] };',
  ...Array.from({ length: 298 }, (_, i) => `export function step${i}(value: number): number { return value * ${i} + job.years; }`),
].join('\n');

describe('the Playground is quick to open and to answer (SC-001, SC-002)', () => {
  test('usable within 15 s of the first open at 10 Mbit/s, and within 2 s on a later open online and offline (SC-001)', async () => {
    const page = await freshProfile({ beforeGoto: slowNetwork });
    const first = await timedOpen(page);
    await closePlayground(page);
    const later = await timedOpen(page);
    await page.context().setOffline(true);
    await page.reload();
    await page.waitForSelector('#os[data-ready]', { state: 'attached' });
    await settle(page);
    const offline = await timedOpen(page);
    console.log(`SC-001: first open ${first} ms, later ${later} ms, offline ${offline} ms`);
    if (!process.env.CI) {
      expect(first).toBeLessThanOrEqual(15_000);
      expect(later).toBeLessThanOrEqual(2_000);
      expect(offline).toBeLessThanOrEqual(2_000);
    }
  });

  test('with 300 lines, errors within 1 s of a pause, and a type and suggestions within 500 ms, in 95 of 100 tries (SC-002)', async () => {
    const page = await openPlaygroundPage();
    const primary = (await onMac(page)) ? 'Meta' : 'Control';
    // The end of the code: VS Code's key on each system.
    const documentEnd = primary === 'Meta' ? 'Meta+ArrowDown' : 'Control+End';
    const documentStart = primary === 'Meta' ? 'Meta+ArrowUp' : 'Control+Home';
    await setCode(page, CODE);
    await waitChecked(page);
    expect((await page.locator(STATUS_CHECK).textContent())?.trim()).toMatch(/^✓/);

    // Errors: one new error per try, from one input, as a paste is.
    const errors: number[] = [];
    for (let i = 0; i < TRIES; i += 1) {
      await page.keyboard.press(documentEnd);
      await page.keyboard.insertText(`\nconst wrong${i}: number = "x";`);
      const started = Date.now();
      await page.waitForFunction(({ selector, n }) => new RegExp(`^⊗ ${n} errors?$`).test((document.querySelector(selector)?.textContent ?? '').trim()), { selector: STATUS_CHECK, n: i + 1 }, { timeout: 10_000 });
      errors.push(Date.now() - started);
    }

    // A type: Ctrl+K Ctrl+I on `job` in line 2.
    const types: number[] = [];
    const hover = `${EDITOR} .monaco-hover .hover-contents`;
    for (let i = 0; i < TRIES; i += 1) {
      await page.keyboard.press('Escape');
      await page.waitForSelector(hover, { state: 'hidden' });
      await page.keyboard.press(documentStart);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Home');
      for (let step = 0; step < 7; step += 1) await page.keyboard.press('ArrowRight');
      await expect.poll(() => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent()).toBe('Ln 2, Col 8');
      await page.keyboard.press(`${primary}+KeyK`);
      const started = Date.now();
      await page.keyboard.press(`${primary}+KeyI`);
      await page.waitForSelector(hover, { state: 'visible', timeout: 10_000 });
      types.push(Date.now() - started);
    }

    // Suggestions after `job.`.
    const suggestions: number[] = [];
    await page.keyboard.press('Escape');
    await page.keyboard.press(documentEnd);
    await page.keyboard.press('Enter');
    for (let i = 0; i < TRIES; i += 1) {
      await page.keyboard.type('job');
      // The word's own suggestions close first, so `.` commits none of them.
      await page.keyboard.press('Escape');
      await page.waitForSelector(`${EDITOR} .suggest-widget.visible`, { state: 'detached' });
      const started = Date.now();
      await page.keyboard.type('.');
      await page.waitForSelector(`${EDITOR} .suggest-widget.visible .monaco-list-row`, { timeout: 10_000 });
      suggestions.push(Date.now() - started);
      await page.keyboard.press('Escape');
      await page.waitForSelector(`${EDITOR} .suggest-widget.visible`, { state: 'detached' });
      for (let key = 0; key < 4; key += 1) await page.keyboard.press('Backspace');
    }

    console.log(`SC-002: errors p95 ${p95(errors)} ms, types p95 ${p95(types)} ms, suggestions p95 ${p95(suggestions)} ms`);
    if (!process.env.CI) {
      expect(p95(errors)).toBeLessThanOrEqual(1_000);
      expect(p95(types)).toBeLessThanOrEqual(500);
      expect(p95(suggestions)).toBeLessThanOrEqual(500);
    }
  });
});
