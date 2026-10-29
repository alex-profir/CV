// The Terminal offline (FR-036, FR-070, SC-006): after one visit to `/`, or
// to `/cv` only, `/` offline opens the Terminal in both shells, in the
// site's fonts, its shell starts from the stored copy, and every command
// `help` lists, and a pipe, gives what it gave online.
import { describe, expect, test, vi } from 'vitest';
import type { BrowserContext, Page } from 'playwright';
import { resume } from '@cv/content';
import fonts from '../../src/fonts/fonts.json' with { type: 'json' };
import { terminalApp } from '../../src/apps/terminal/app.tsx';
import { unservedFonts } from '../../../../tools/site-check/src/parts/fonts.ts';
import { waitForWorker } from '../../../../tools/site-check/src/parts/offline.ts';
import { firstPage, goOffline, switchableServer } from '../helpers/offline.ts';
import { settle, waitForReady } from '../helpers/shell.ts';
import { builtSite } from '../helpers/site.ts';
import { COMMAND_LINE, groupText, runGroup } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const FAMILIES = fonts.families.map((entry) => entry.family);

const SIZES = [
  { shell: 'mobile', width: 375, height: 812 },
  { shell: 'desktop', width: 1440, height: 900 },
] as const;

// Every command `help` lists, as a visitor runs it bare, but those that
// leave the output: `clear`, `exit` and `cv`'s vim view.
async function helpCommands(page: Page): Promise<string[]> {
  const help = await runGroup(page, 'help');
  const lines = await help.locator('.run-output .out-help button').evaluateAll((list) => list.map((control) => control.getAttribute('aria-label')!));
  return [...new Set(lines)].filter((line) => !['clear', 'exit', 'cv'].includes(line));
}

// `/` in a new page of the context, at a size, with the Terminal open.
async function openTerminalIn(context: BrowserContext, url: string, size: { shell: 'mobile' | 'desktop'; width: number; height: number }): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize({ width: size.width, height: size.height });
  await page.goto(`${url}/`, { waitUntil: 'load' });
  await waitForReady(page);
  await page.locator(size.shell === 'desktop' ? '#os .dock-item[data-app="terminal"]' : '#os .home .app-icon[data-view="terminal"]').click();
  await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
  await settle(page);
  return page;
}

// A word of the first role's summary, read from the CV.
const WORD = (resume.work?.[0]?.summary ?? '').split(/\W+/).find((part) => part.length > 4)!;

// Each command's output text, in order, and a pipe and filter's; the shell
// started, not failed (FR-070).
async function outputs(page: Page): Promise<Map<string, string>> {
  const shown = new Map<string, string>();
  for (const line of [...(await helpCommands(page)), `work | grep -i ${WORD}`]) shown.set(line, await groupText(page, await runGroup(page, line)));
  expect(await page.locator('.terminal p.shell-failed').count()).toBe(0);
  return shown;
}

describe('006-terminal-FR-036: the Terminal works offline after one visit', () => {
  test('the Terminal declares it needs nothing from the network, and the stored copy holds the shell and its licenses', () => {
    expect(terminalApp.needsNetwork).toBe(false);
    const files = builtSite().manifest.files.map((file) => file.path);
    expect(files.filter((file) => /^\/assets\/shell-[\w-]+\.js$/.test(file))).toHaveLength(1);
    expect(files.filter((file) => /^\/assets\/shell-licenses-[\w-]+\.txt$/.test(file))).toHaveLength(1);
  });

  for (const first of ['/', '/cv']) {
    test(`after one visit to ${first} only, / offline opens the Terminal at 375 and 1440 px in the site's fonts, every command as online, with no offline message`, async () => {
      const server = await switchableServer();
      await server.serve(builtSite());
      const page = await firstPage(`${server.url}${first}`);
      expect(await waitForWorker(page)).toBe(true);
      const online = new Map<string, Map<string, string>>();
      for (const size of SIZES) {
        const root = await openTerminalIn(page.context(), server.url, size);
        online.set(size.shell, await outputs(root));
        await root.close();
      }
      await server.close();
      await goOffline(page.context());
      for (const size of SIZES) {
        const root = await openTerminalIn(page.context(), server.url, size);
        const offline = await outputs(root);
        expect(offline.size, size.shell).toBeGreaterThan(15);
        expect([...offline], size.shell).toEqual([...online.get(size.shell)!]);
        expect(await unservedFonts(root, FAMILIES), size.shell).toEqual([]);
        const failed = await root.evaluate(async () => {
          await document.fonts.ready;
          return [...document.fonts].filter((face) => face.status === 'error').map((face) => face.family);
        });
        expect(failed, size.shell).toEqual([]);
        // No offline message: no alert, and the shell's status region says
        // nothing of the network (the CV's own text may).
        const messages = await root.evaluate(() => ({
          alerts: document.querySelectorAll('#os [role="alert"]').length,
          status: [...document.querySelectorAll('#os [role="status"]:not(.terminal-status)')].map((element) => element.textContent ?? '').join(' '),
        }));
        expect(messages.alerts, size.shell).toBe(0);
        expect(messages.status, size.shell).not.toMatch(/offline|network|connection/i);
        await root.close();
      }
    });
  }
});
