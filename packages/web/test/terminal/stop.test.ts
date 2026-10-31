// A runaway line never freezes the page (FR-069, research R33, R26): the
// shell runs in a worker, so the page keeps answering while a line runs; the
// line stops at 5 s with the time line; and a worker that stops answering
// is ended and started again from its last state.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import { frontWindow, openShell, serveShellFixture } from '../helpers/shell.ts';
import { COMMAND_LINE, linesRun, openTerminal, runGroup, SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 240_000 });

// Replaces the one `from` in a file of the copy.
function replaceIn(root: string, file: string, from: string, to: string): void {
  const target = path.join(root, file);
  const text = fs.readFileSync(target, 'utf8');
  if (text.split(from).length !== 2) throw new Error(`${file} doesn't hold ${JSON.stringify(from)} once`);
  fs.writeFileSync(target, text.replace(from, to));
}

// A build whose lines may run any number of commands, so a loop runs to the
// 5 s limit, and whose worker never answers the line `hang`.
const runawayBuild = () =>
  serveShellFixture({
    edit: (root) => {
      replaceIn(root, 'packages/web/src/apps/terminal/shell/adapter.ts', 'commands: 10_000, output', 'commands: 1_000_000_000, output');
      replaceIn(root, 'packages/web/src/apps/terminal/shell/worker.ts', "  if (message.type === 'run') return", "  if (message.type === 'run' && message.request.line === 'hang') for (;;);\n  if (message.type === 'run') return");
    },
  });

async function runawayTerminal(): Promise<Page> {
  const { url } = await runawayBuild();
  const page = await openShell({ ...SHELL_PAGE.desktop, url });
  await openTerminal(page, 'desktop');
  return page;
}

const busy = (page: Page) => page.locator('.terminal section.run[aria-busy="true"]').count();

describe('006-terminal-FR-069: a line is stopped at 5 s and the page keeps answering', () => {
  test('while the loop runs, the CV window comes to the front and takes keys; it stops within 6 s with the time line and a new prompt', async () => {
    const page = await runawayTerminal();
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('i=0; while :; do i=$((i+1)); done');
    const start = Date.now();
    await page.keyboard.press('Enter');
    await expect.poll(() => busy(page)).toBe(1);

    await page.locator('#os .window[data-view="cv"] .window-content').click({ position: { x: 40, y: 40 } });
    expect(await frontWindow(page)).toBe('cv');
    const before = await page.evaluate(() => document.activeElement?.outerHTML ?? '');
    await page.keyboard.press('Tab');
    const after = await page.evaluate(() => ({ html: document.activeElement?.outerHTML ?? '', inCv: document.activeElement?.closest('.window[data-view="cv"]') !== null }));
    expect(after.html).not.toBe(before);
    expect(after.inCv).toBe(true);
    // All of that happened while the line still ran.
    expect(await busy(page)).toBe(1);

    await linesRun(page);
    expect(Date.now() - start).toBeLessThan(6_000);
    const run = page.locator('.terminal section.run').last();
    expect(await run.locator('p.run-stopped').textContent()).toBe(siteText.terminal.replies.stopped.time);
    expect(await page.evaluate(() => document.querySelector('.terminal section.run:last-of-type')!.nextElementSibling?.matches('form.prompt-line'))).toBe(true);
  });

  test('a loop inside awk or sed, which the shell’s clock can’t reach, ends in the time line with the page answering (T315)', async () => {
    const page = await runawayTerminal();
    for (const line of ["awk 'BEGIN{while(1);}'", "printf 'a\\n' | sed ':a;ba'"]) {
      const start = Date.now();
      await page.locator(COMMAND_LINE).fill(line);
      await page.keyboard.press('Enter');
      await expect.poll(() => busy(page), { timeout: 15_000 }).toBe(0);
      expect(Date.now() - start, line).toBeLessThan(12_000);
      expect(await page.locator('section.run').last().innerText(), line).toContain(siteText.terminal.replies.stopped.time);
    }
  });

  test('a worker that never answers is ended after 6 s and started again, keeping a variable and a visitor’s file', async () => {
    const page = await runawayTerminal();
    await runGroup(page, 'KEPT=yes; mkdir mine');
    const start = Date.now();
    const hung = await runGroup(page, 'hang');
    const took = Date.now() - start;
    expect(took).toBeGreaterThanOrEqual(5_900);
    expect(took).toBeLessThan(9_000);
    expect(await hung.locator('p.run-stopped').textContent()).toBe(siteText.terminal.replies.stopped.time);
    const kept = await runGroup(page, 'echo $KEPT; ls -d mine');
    expect(await kept.locator('.run-output p.out-line').allTextContents()).toEqual(['yes', 'mine']);
  });
});

describe('006-terminal-FR-075: Ctrl+C', () => {
  test('on a typed line with nothing selected: the line with ^C, an empty prompt, and not in history', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openTerminal(page, 'desktop');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('abc');
    await page.keyboard.press('Control+C');
    const run = page.locator('.terminal section.run').last();
    await expect.poll(() => run.locator('h2.run-command').textContent()).toMatch(/abc\^C$/);
    expect(await run.locator('.run-output').count()).toBe(0);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('');
    const history = await runGroup(page, 'history');
    expect(await history.locator('.run-output').textContent()).not.toContain('abc');
  });

  test('during a loop: it stops at once with the Ctrl+C line, and a variable set before survives', async () => {
    const page = await runawayTerminal();
    await runGroup(page, 'KEPT=yes');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('while true; do :; done');
    await page.keyboard.press('Enter');
    await expect.poll(() => busy(page)).toBe(1);
    const start = Date.now();
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(Date.now() - start).toBeLessThan(2_000);
    const run = page.locator('.terminal section.run').last();
    expect(await run.locator('p.run-stopped').textContent()).toBe(siteText.terminal.replies.stopped.cancelled);
    expect(await run.locator('h2.run-command').textContent()).toMatch(/\^C$/);
    await page.waitForSelector('.terminal[data-shell-state="ready"]');
    const kept = await runGroup(page, 'echo $KEPT');
    expect(await kept.locator('.run-output p.out-line').allTextContents()).toEqual(['yes']);
  });

  test('with output text selected, it is the browser’s', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await openTerminal(page, 'desktop');
    await runGroup(page, 'about');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('abc');
    const prevented = await page.evaluate(() => {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('.terminal .run-output')!);
      document.getSelection()!.removeAllRanges();
      document.getSelection()!.addRange(range);
      const event = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', ctrlKey: true, bubbles: true, cancelable: true });
      document.querySelector('.terminal input.command-line')!.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(prevented).toBe(false);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('abc');
  });
});

describe('006-terminal-FR-075: Ctrl+C drops what waits behind the running line', () => {
  test('the line stops, the one behind it shows ^C and never runs', async () => {
    const page = await runawayTerminal();
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('while :; do :; done');
    await page.keyboard.press('Enter');
    await expect.poll(() => busy(page)).toBe(1);
    await page.keyboard.type('echo behind-ran');
    await page.keyboard.press('Enter');
    await expect.poll(() => busy(page)).toBe(2);
    await page.keyboard.press('Control+C');
    await expect.poll(() => busy(page)).toBe(0);
    expect(await page.locator('.terminal section.run').count()).toBe(2);
    expect(await page.locator('.terminal section.run').nth(1).locator('.run-cancel').count()).toBe(1);
    expect(await page.locator('.terminal section.run').nth(1).locator('.run-output').count()).toBe(0);
  });
});
