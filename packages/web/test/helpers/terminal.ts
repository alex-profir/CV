// The Terminal test helper (006 plan, Dependencies: Terminal test helper),
// on 005's shell helper: it opens the Terminal in a shell as a visitor does,
// types a line, waits for its run and reads it. Every Terminal browser test
// uses it.
import type { Locator, Page } from 'playwright';
import type { RunningServer } from '../../../../tools/site-check/src/server.ts';
import { axText } from './ax.ts';
import { fixture } from './fixtures.ts';
import type { FixtureName } from './fixtures.ts';
import { openShell, PHONE_USER_AGENT, serveShellFixture, settle } from './shell.ts';
import type { ShellOptions } from './shell.ts';

export type TerminalShell = 'desktop' | 'mobile';

// Each shell's page: 1440 × 900, or a 375 × 812 phone with touch.
export const SHELL_PAGE: Record<TerminalShell, ShellOptions> = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT },
};

export const COMMAND_LINE = '.terminal input.command-line';

// Opens the Terminal in an open shell: from the dock, or by a tap on its home
// screen icon, then waits until its command line has focus.
export async function openTerminal(page: Page, shell: TerminalShell): Promise<void> {
  if (shell === 'desktop') await page.locator('#os .dock-item[data-app="terminal"]').click();
  else await page.locator('#os .home .app-icon[data-view="terminal"]').tap();
  await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
  await settle(page);
}

// The shell opened at its size, with the Terminal open in it.
export async function openTerminalPage(shell: TerminalShell, options: Partial<ShellOptions> = {}): Promise<Page> {
  const page = await openShell({ ...SHELL_PAGE[shell], ...options });
  await openTerminal(page, shell);
  return page;
}

// How many runs the output holds.
export const runCount = (page: Page) => page.locator('.terminal section.run').count();

// Types a line into the command line and presses Enter.
export async function typeLine(page: Page, line: string): Promise<void> {
  const input = page.locator(COMMAND_LINE);
  await input.focus();
  await input.fill('');
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
}

// A run's selector, by its place among the runs from 1.
export const runSelector = (index: number) => `.terminal section.run:nth-of-type(${index})`;

// Types a line and returns the run it adds, once it is in the page.
export async function runGroup(page: Page, line: string): Promise<Locator> {
  const before = await runCount(page);
  await typeLine(page, line);
  await page.waitForFunction((count) => document.querySelectorAll('.terminal section.run').length > count, before);
  return page.locator('.terminal section.run').last();
}

// The text a screen reader reads in a run's output (004's axText).
export async function groupText(page: Page, group: Locator): Promise<string> {
  const index = await group.evaluate((element) => [...element.parentElement!.querySelectorAll(':scope > section.run')].indexOf(element) + 1);
  return (await axText(page, `${runSelector(index)} .run-output`)).join(' ');
}

// The vim view, while it is open.
export const vimView = (page: Page) => page.locator('.terminal section.vim');

// A build of the repository with a fixture CV, served for the current test.
export function fixtureBuild(name: FixtureName): Promise<RunningServer> {
  return serveShellFixture({ resume: fixture(name) });
}
