// A program's output and the view (009 FR-041).
import { describe, expect, test, vi } from 'vitest';
import { lastOutput, openProgramTerminal, startLine, writeFile } from '../../helpers/program.ts';
import { linesRun } from '../../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const SCREEN = '.terminal-screen';
const fromEnd = (page: Awaited<ReturnType<typeof openProgramTerminal>>) => page.locator(SCREEN).evaluate((view) => view.scrollHeight - view.clientHeight - view.scrollTop);
const PRINTS = "let n = 0;\nconst t = setInterval(() => {\n  for (let i = 0; i < 5; i += 1) console.log('line', ++n);\n  if (n >= 400) clearInterval(t);\n}, 30);\n";

describe('009-terminal-node-FR-041: output keeps the end in view, unless the visitor scrolled back', () => {
  test('it follows while printing, and the line is in view when it ends', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'p.js', PRINTS);
    await startLine(page, 'node p.js');
    await expect.poll(async () => (await lastOutput(page)).includes('line 100'), { timeout: 15_000 }).toBe(true);
    expect(await fromEnd(page)).toBeLessThan(40);
    await linesRun(page);
    expect(await fromEnd(page)).toBeLessThan(2);
  });

  test('after scrolling back it stays put, and returning to the end follows again', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'p.js', PRINTS.replace('400', '1000'));
    await startLine(page, 'node p.js');
    await expect.poll(async () => (await lastOutput(page)).includes('line 100'), { timeout: 15_000 }).toBe(true);
    await page.locator(SCREEN).evaluate((view) => view.scrollTo(0, 100));
    await page.waitForTimeout(200);
    const held = await page.locator(SCREEN).evaluate((view) => view.scrollTop);
    const text = (await lastOutput(page)).length;
    await expect.poll(async () => (await lastOutput(page)).length, { timeout: 10_000 }).toBeGreaterThan(text);
    expect(await page.locator(SCREEN).evaluate((view) => view.scrollTop)).toBe(held);
    await page.locator(SCREEN).evaluate((view) => view.scrollTo(0, view.scrollHeight));
    const longer = (await lastOutput(page)).length;
    await expect.poll(async () => (await lastOutput(page)).length, { timeout: 10_000 }).toBeGreaterThan(longer);
    expect(await fromEnd(page)).toBeLessThan(40);
    await page.keyboard.press('Control+C');
  });

  test('a program ended while scrolled back leaves the view where it is', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'p.js', PRINTS);
    await startLine(page, 'node p.js');
    await expect.poll(async () => (await lastOutput(page)).includes('line 100'), { timeout: 15_000 }).toBe(true);
    await page.locator(SCREEN).evaluate((view) => view.scrollTo(0, 100));
    await page.waitForTimeout(100);
    await linesRun(page);
    expect(await page.locator(SCREEN).evaluate((view) => view.scrollTop)).toBe(100);
  });

  test('with reduced motion set, nothing animates', async () => {
    const page = await openProgramTerminal('desktop', { reducedMotion: 'reduce' });
    const behavior = await page.locator(SCREEN).evaluate((view) => getComputedStyle(view).scrollBehavior);
    expect(behavior).toBe('auto');
    await writeFile(page, 'p.js', PRINTS);
    await startLine(page, 'node p.js');
    await expect.poll(async () => (await lastOutput(page)).includes('line 100'), { timeout: 15_000 }).toBe(true);
    expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
    await linesRun(page);
  });
});
