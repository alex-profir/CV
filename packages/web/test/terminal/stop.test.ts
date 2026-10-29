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
