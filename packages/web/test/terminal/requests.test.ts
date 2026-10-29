// Nothing typed leaves the browser or stays after the visit (FR-022,
// SC-007): the Terminal asks only this site, stores nothing, and a new page
// starts empty.
import { describe, expect, test, vi } from 'vitest';
import type { Page, Request } from 'playwright';
import { serveBuilt } from '../helpers/site.ts';
import { openShell, waitForReady } from '../helpers/shell.ts';
import {
  COMMAND_LINE,
  openTerminal,
  quitVim,
  runCount,
  runGroup,
  SHELL_PAGE,
  typeLine,
  vimView,
} from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';
import { LANGUAGE_CASES } from './shell/context.ts';

vi.setConfig({ testTimeout: 300_000 });

const MARKER = 'nothing-kept-6f3a';

// Runs a line and waits until it has: the vim view closed again, the output
// cleared, the Terminal closed, or a new run.
async function run(page: Page, line: string): Promise<void> {
  const before = await runCount(page);
  await typeLine(page, line);
  if (line === 'cv' || line.startsWith('vim ')) {
    await vimView(page).waitFor();
    await quitVim(page);
    return;
  }
  if (line === 'clear') {
    await expect.poll(() => runCount(page)).toBe(0);
    return;
  }
  if (line === 'exit') {
    await expect.poll(() => page.locator(COMMAND_LINE).count()).toBe(0);
    return;
  }
  await expect.poll(() => runCount(page), { message: line }).toBe(before + 1);
}

// Every host asked for while opening the Terminal and running every command
// help lists, then what the page stored.
async function visit(shell: TerminalShell): Promise<{ hosts: string[]; page: Page; url: string }> {
  const { url } = await serveBuilt();
  const hosts = new Set<string>();
  const page = await openShell({
    ...SHELL_PAGE[shell],
    url,
    beforeGoto: async (target) => {
      target.context().on('request', (request: Request) => hosts.add(new URL(request.url()).hostname));
    },
  });
  await openTerminal(page, shell);
  const help = await runGroup(page, 'help');
  const lines = await help.locator('.run-output').locator('button.command-chip, button.command-inline').evaluateAll((list) => list.map((control) => control.getAttribute('aria-label')!));
  expect(lines.length).toBeGreaterThanOrEqual(22);
  // Then the shell's language, one line per feature (FR-067).
  const language = LANGUAGE_CASES.map(([, line]) => line);
  for (const line of [...lines.filter((name) => name !== 'exit'), 'cat cv.json', 'cat cv.json | jq', 'vim cv.json', 'help work', ...language, MARKER]) await run(page, line);
  await page.locator(COMMAND_LINE).focus();
  await page.keyboard.type(`draft ${MARKER}`);
  await page.locator(COMMAND_LINE).fill('');
  await run(page, 'exit');
  await page.waitForLoadState('networkidle');
  return { hosts: [...hosts], page, url };
}

async function stored(page: Page): Promise<{ local: number; session: number; databases: string[]; cookies: number }> {
  const inPage = await page.evaluate(async () => ({
    local: localStorage.length,
    session: sessionStorage.length,
    databases: (await indexedDB.databases()).map((database) => database.name ?? ''),
  }));
  return { ...inPage, cookies: (await page.context().cookies()).length };
}

describe('006-terminal-FR-022: the Terminal asks only this site and keeps nothing (SC-007)', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`at ${SHELL_PAGE[shell].width} px, running every command asks only 127.0.0.1, and nothing is stored or shown again`, async () => {
      const { hosts, page, url } = await visit(shell);
      expect(hosts).toEqual(['127.0.0.1']);
      expect(await stored(page)).toEqual({ local: 0, session: 0, databases: [], cookies: 0 });

      // A new page in the same browser shows nothing typed before.
      const next = await page.context().newPage();
      await next.goto(`${url}/`);
      await waitForReady(next);
      await openTerminal(next, shell);
      expect(await runCount(next)).toBe(0);
      expect(await next.locator(COMMAND_LINE).inputValue()).toBe('');
      await next.keyboard.press('ArrowUp');
      expect(await next.locator(COMMAND_LINE).inputValue()).toBe('');
      expect(await next.content()).not.toContain(MARKER);
      expect(await stored(next)).toEqual({ local: 0, session: 0, databases: [], cookies: 0 });
    });
  }
});
