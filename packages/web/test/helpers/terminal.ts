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
// screen icon, then waits until its command line is shown.
async function openTerminalOnly(page: Page, shell: TerminalShell): Promise<void> {
  if (shell === 'desktop') await page.locator('#os .dock-item[data-app="terminal"]').click();
  else await page.locator('#os .home .app-icon[data-view="terminal"]').tap();
  await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
}

// Opens the Terminal, then waits until its shell has loaded (006 FR-070),
// so a test starts with the shell ready.
export async function openTerminal(page: Page, shell: TerminalShell): Promise<void> {
  await openTerminalOnly(page, shell);
  await page.waitForSelector('.terminal:is([data-shell-state="ready"], [data-shell-state="running"])');
  await settle(page);
}

// Opens the Terminal with the shell worker's script held back, for the
// loading state (006 FR-070). The returned function lets it load.
export async function openTerminalLoading(page: Page, shell: TerminalShell): Promise<() => Promise<void>> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/assets/shell-*.js', async (route) => {
    await held;
    await route.continue();
  });
  await openTerminalOnly(page, shell);
  await page.waitForSelector('.terminal p.shell-loading');
  await settle(page);
  return async () => {
    release();
    await page.waitForSelector('.terminal:is([data-shell-state="ready"], [data-shell-state="running"])');
    await page.unroute('**/assets/shell-*.js');
  };
}

// The shell opened at its size, with the Terminal open in it.
export async function openTerminalPage(shell: TerminalShell, options: Partial<ShellOptions> = {}): Promise<Page> {
  const page = await openShell({ ...SHELL_PAGE[shell], ...options });
  await openTerminal(page, shell);
  return page;
}

// How many runs the output holds.
export const runCount = (page: Page) => page.locator('.terminal section.run').count();

// Until no line waits for the shell or runs (006 FR-070).
export const linesRun = (page: Page) => page.waitForFunction(() => document.querySelector('.terminal section.run[aria-busy="true"]') === null);

// Types a line into the command line, presses Enter, and waits for it to
// have run.
export async function typeLine(page: Page, line: string): Promise<void> {
  const input = page.locator(COMMAND_LINE);
  await input.focus();
  await input.fill('');
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
  await linesRun(page);
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

// FR-035's states, each reached from a just-opened Terminal by real input.
// `desktop` and `mobile` list the states of each shell (contracts/cli.md
// States); a state's `size` is the page it needs, when not the shell's.
export type TerminalState = { name: string; size?: { width: number; height: number }; reach: (page: Page) => Promise<void> };

const ok = async () => {};

async function openFold(page: Page): Promise<void> {
  await openVimView(page);
  await page.locator('.terminal section.vim .vim-text').focus();
  await page.keyboard.press('z');
  await page.keyboard.press('a');
}

async function catInFolder(page: Page): Promise<void> {
  await runGroup(page, 'cd work');
  const listing = await runGroup(page, 'ls');
  const before = await runCount(page);
  await listing.locator('.run-output button[aria-label^="cat "]').first().click();
  await page.waitForFunction((count) => document.querySelectorAll('.terminal section.run').length > count, before);
  await linesRun(page);
}

const SHARED_STATES: TerminalState[] = [
  { name: 'just opened', reach: ok },
  { name: 'after help', reach: async (page) => void (await runGroup(page, 'help')) },
  { name: 'vim folded', reach: openVimView },
  {
    name: 'vim fold open and search',
    reach: async (page) => {
      await openFold(page);
      await vimEntry(page, '/', 'e');
    },
  },
  {
    name: 'vim key help',
    reach: async (page) => {
      await openVimView(page);
      await vimEntry(page, ':', 'help');
    },
  },
  { name: 'unknown command', reach: async (page) => void (await runGroup(page, 'wrok')) },
  { name: 'after ls', reach: async (page) => void (await runGroup(page, 'ls')) },
  { name: 'cat inside a folder', reach: catInFolder },
  {
    name: 'after clear',
    reach: async (page) => {
      await runGroup(page, 'help');
      await typeLine(page, 'clear');
      await page.waitForFunction(() => document.querySelectorAll('.terminal section.run').length === 0);
    },
  },
  {
    name: 'long command typed',
    reach: async (page) => {
      await page.locator(COMMAND_LINE).focus();
      await page.keyboard.insertText('help '.repeat(100));
    },
  },
];

export const TERMINAL_STATES: Record<TerminalShell, TerminalState[]> = {
  desktop: [
    ...SHARED_STATES,
    { name: 'after specs', reach: async (page) => void (await runGroup(page, 'specs')) },
    {
      name: 'Terminal menu open',
      reach: async (page) => {
        await page.click('#menu-title-app');
        await page.locator('#menu-app').waitFor();
      },
    },
    {
      name: 'minimized',
      reach: async (page) => {
        await page.getByRole('button', { name: 'Minimize Terminal' }).click();
        await page.locator('#os .window[data-view="terminal"]').waitFor({ state: 'hidden' });
      },
    },
    { name: 'maximized', reach: async (page) => page.getByRole('button', { name: 'Maximize Terminal' }).click() },
    {
      name: 'two windows',
      reach: async (page) => {
        await page.locator('#os .dock-item[data-app="cv"]').click();
        await page.locator('#os .window[data-view="cv"]').waitFor();
      },
    },
  ],
  mobile: [
    ...SHARED_STATES,
    { name: 'pocket landscape', size: { width: 812, height: 375 }, reach: async (page) => void (await runGroup(page, 'help')) },
    {
      name: 'keyboard open',
      reach: async (page) => {
        await page.locator(COMMAND_LINE).tap();
        await page.setViewportSize({ width: 375, height: 512 });
        await page.waitForSelector('#os .pocket[data-keyboard]');
      },
    },
    {
      name: 'vim keys',
      reach: async (page) => {
        await page.locator('#os .pocket-keys button.pocket-key[aria-label="cv"]').tap();
        await vimView(page).waitFor();
      },
    },
  ],
};

// A fresh page in a state: the shell at its size, the Terminal open, and
// the state reached.
export async function terminalInState(shell: TerminalShell, state: TerminalState, options: Partial<ShellOptions> = {}): Promise<Page> {
  const page = await openTerminalPage(shell, { ...(state.size ?? {}), ...options });
  await state.reach(page);
  await settle(page);
  return page;
}
