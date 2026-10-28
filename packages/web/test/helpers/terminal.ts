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

// The line a run's heading shows, exactly as typed: its text without the
// prompt.
export function typedLine(group: Locator): Promise<string> {
  return group.locator('h2.run-command').evaluate((heading) => {
    const copy = heading.cloneNode(true) as HTMLElement;
    for (const prompt of copy.querySelectorAll('.prompt')) prompt.remove();
    return copy.textContent ?? '';
  });
}

// Every run's line, in order.
export function typedLines(page: Page): Promise<string[]> {
  return page.locator('.terminal section.run h2.run-command').evaluateAll((headings) =>
    headings.map((heading) => {
      const copy = heading.cloneNode(true) as HTMLElement;
      for (const prompt of copy.querySelectorAll('.prompt')) prompt.remove();
      return copy.textContent ?? '';
    }),
  );
}

// Whether focus is in the command line.
export const commandLineFocused = (page: Page) => page.evaluate((selector) => document.activeElement?.matches(selector) ?? false, COMMAND_LINE);

// Runs `history` and gives back what it lists: each row's number and line.
export async function historyRows(page: Page): Promise<{ number: number; line: string }[]> {
  const group = await runGroup(page, 'history');
  const text = await group.locator('.run-output').evaluate((output) => (output as HTMLElement).innerText);
  return text
    .split('\n')
    .map((row) => /^\s*(\d+)\s+(.*?)\s*$/.exec(row))
    .filter((match) => match !== null)
    .map((match) => ({ number: Number(match[1]), line: match[2]! }));
}

// Types `/` or `:` in the vim view, then the text and Enter, as a visitor
// does: the key opens the entry, which takes the text.
export async function vimEntry(page: Page, kind: '/' | ':', text: string): Promise<void> {
  await page.locator('.terminal section.vim .vim-text').focus();
  await page.keyboard.press(kind);
  await page.waitForFunction(() => document.activeElement?.matches('.terminal section.vim input.vim-entry') ?? false);
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

// Runs `cv` and waits for the vim view.
export async function openVimView(page: Page): Promise<void> {
  await typeLine(page, 'cv');
  await vimView(page).waitFor();
  await settle(page);
}

// `:q` in the vim view, until the command line is back.
export async function quitVim(page: Page): Promise<void> {
  await vimEntry(page, ':', 'q');
  await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
}
