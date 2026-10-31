// The shell loads with the Terminal (FR-070, SC-013, research R34): no page
// fetches it until the Terminal opens; while it loads the Terminal takes
// typing and runs the lines once it is ready; a failed load offers a retry;
// and it is ready quickly, even on a slow phone.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { OS_BUDGET } from '../../scripts/build-site.ts';
import { openPage } from '../helpers/browser.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { builtSite, serveBuilt } from '../helpers/site.ts';
import { COMMAND_LINE, linesRun, openTerminal, openTerminalLoading, SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const SHELL_SCRIPT = /\/assets\/shell-[\w-]+\.js$/;
const READY = '.terminal:is([data-shell-state="ready"], [data-shell-state="running"])';

// Every shell script the page itself asks for, from its first request.
function recordShellRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (request) => {
    if (SHELL_SCRIPT.test(new URL(request.url()).pathname)) seen.push(request.url());
  });
  return seen;
}

// Types lines and Enter with the keys alone, without waiting for them to run.
async function typeWaiting(page: Page, lines: readonly string[]): Promise<void> {
  await page.locator(COMMAND_LINE).focus();
  for (const line of lines) {
    await page.keyboard.type(line);
    await page.keyboard.press('Enter');
  }
}

const runs = (page: Page) =>
  page.locator('.terminal section.run').evaluateAll((list) =>
    list.map((run) => {
      const heading = run.querySelector('h2.run-command')!.cloneNode(true) as HTMLElement;
      for (const prompt of heading.querySelectorAll('.prompt')) prompt.remove();
      return { line: heading.textContent ?? '', busy: run.getAttribute('aria-busy') === 'true', output: run.querySelector('.run-output')?.textContent ?? '' };
    }),
  );

describe('006-terminal-FR-070: the shell loads when the Terminal first opens (SC-013)', () => {
  test('/ and /cv request no shell script; opening the Terminal requests it once, and reopening requests nothing more', async () => {
    const { url } = await serveBuilt();
    let cvRequests: string[] = [];
    await openPage(`${url}/cv`, { width: 1440, serviceWorkers: 'block', beforeGoto: async (page) => void (cvRequests = recordShellRequests(page)) });
    expect(cvRequests).toEqual([]);

    let requests: string[] = [];
    const page = await openShell({ ...SHELL_PAGE.desktop, url, serviceWorkers: 'block', beforeGoto: async (target) => void (requests = recordShellRequests(target)) });
    await settle(page);
    expect(requests).toEqual([]);
    await openTerminal(page, 'desktop');
    expect(requests).toHaveLength(1);
    await page.getByRole('button', { name: 'Close Terminal' }).click();
    await page.locator('#os .window[data-view="terminal"]').waitFor({ state: 'detached' });
    await openTerminal(page, 'desktop');
    expect(requests).toHaveLength(1);
  });

  test('while it loads, the Terminal shows at once and takes typing; the lines run in order once it is ready', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const release = await openTerminalLoading(page, 'desktop');
    expect(await page.locator('.terminal .starter button.command-chip').count()).toBeGreaterThan(0);
    expect(await page.locator(COMMAND_LINE).isVisible()).toBe(true);
    // The loading line sits under the starter chips.
    expect(await page.locator('.terminal .starter + p.shell-loading').count()).toBe(1);
    await typeWaiting(page, ['echo one', 'echo two']);
    await expect.poll(() => runs(page)).toEqual([
      { line: 'echo one', busy: true, output: '' },
      { line: 'echo two', busy: true, output: '' },
    ]);
    await release();
    await linesRun(page);
    expect(await runs(page)).toEqual([
      { line: 'echo one', busy: false, output: 'one' },
      { line: 'echo two', busy: false, output: 'two' },
    ]);
    expect(await page.locator('.terminal p.shell-loading').count()).toBe(0);
  });

  test('a failed load shows the error and try again, which loads it and runs the waiting lines', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    await page.route('**/assets/shell-*.js', (route) => route.fulfill({ status: 503, body: '' }));
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.waitForSelector('.terminal p.shell-failed');
    const retry = page.locator('.terminal p.shell-failed button.command-chip');
    expect(await retry.textContent()).toBe('try again');
    expect(await page.locator('.terminal p.shell-loading').count()).toBe(0);
    await typeWaiting(page, ['echo waited']);
    await page.unroute('**/assets/shell-*.js');
    await retry.click();
    await page.waitForSelector(READY);
    await linesRun(page);
    expect(await runs(page)).toEqual([{ line: 'echo waited', busy: false, output: 'waited' }]);
    expect(await page.locator('.terminal p.shell-failed').count()).toBe(0);
  });

  test('the os script stays within its gzip budget', () => {
    const site = builtSite();
    const assets = path.join(site.dir, 'assets');
    const os = fs.readdirSync(assets).filter((name) => /^os-[\w-]+\.js$/.test(name));
    expect(os).toHaveLength(1);
    expect(zlib.gzipSync(fs.readFileSync(path.join(assets, os[0]!)), { level: 9 }).length).toBeLessThanOrEqual(OS_BUDGET);
  });

  // From the dock click until the shell is ready.
  async function readyIn(page: Page): Promise<number> {
    const start = Date.now();
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.waitForSelector(READY, { timeout: 30_000 });
    return Date.now() - start;
  }

  test('ready within 1 s, and within 3 s with 4× CPU throttling on a mobile network', async () => {
    expect(await readyIn(await openShell({ ...SHELL_PAGE.desktop, serviceWorkers: 'block' }))).toBeLessThan(1_000);
    const slow = await openShell({
      ...SHELL_PAGE.desktop,
      serviceWorkers: 'block',
      cpuThrottling: 4,
      beforeGoto: async (page) => {
        // Lighthouse's mobile network: 1.6 Mb/s down, 750 kb/s up, 150 ms.
        const session = await page.context().newCDPSession(page);
        await session.send('Network.enable');
        await session.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      },
    });
    expect(await readyIn(slow)).toBeLessThan(3_000);
  });
});

describe('006-terminal-FR-075: Ctrl+C while the shell loads', () => {
  test('the waiting line shows ^C, stays in the history and never runs', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const release = await openTerminalLoading(page, 'desktop');
    await typeWaiting(page, ['echo queued-ran']);
    await page.keyboard.press('Control+C');
    await expect.poll(() => runs(page)).toEqual([{ line: 'echo queued-ran^C', busy: false, output: '' }]);
    await release();
    await page.waitForSelector('.terminal p.shell-loading', { state: 'detached' });
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.press('ArrowUp');
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('echo queued-ran');
    expect(await page.locator('.terminal').textContent()).not.toContain('queued-ran\n');
    expect(await page.locator('.terminal section.run .run-output').count()).toBe(0);
  });
});
