// Helpers for 009's browser tests: the Terminal on the built site, in the engine
// `PLAYGROUND_ENGINE` chooses, with a file written and a program run as a visitor
// runs them. Every line is typed: nothing reaches into the page.
import type { Locator, Page } from 'playwright';
import { engine } from './playground.ts';
import { COMMAND_LINE, linesRun, openTerminalPage } from './terminal.ts';
import type { TerminalShell } from './terminal.ts';
import type { ShellOptions } from './shell.ts';

export const openProgramTerminal = (shell: TerminalShell = 'desktop', options: Partial<ShellOptions> = {}): Promise<Page> => openTerminalPage(shell, { engine: engine(), ...options });

// Types a line and doesn't wait for it to end: for a program that keeps running.
export async function startLine(page: Page, line: string): Promise<void> {
  const input = page.locator(COMMAND_LINE);
  await input.focus();
  await input.fill('');
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
}

// The newest run.
export const lastRun = (page: Page): Locator => page.locator('.terminal section.run').last();

// The text of the running entry, or of the last one.
export const lastOutput = async (page: Page): Promise<string> => {
  const output = lastRun(page).locator('.run-output');
  return (await output.count()) === 0 ? '' : output.innerText();
};

// A file, as a visitor could write it, with the shell's `printf`.
export async function writeFile(page: Page, name: string, text: string): Promise<void> {
  const quoted = text.replace(/\\/g, '\\\\').replace(/'/g, "'\\''").replace(/\n/g, '\\n');
  await startLine(page, `printf '%b' '${quoted}' > ${name}`);
  await linesRun(page);
}

// Runs a line to its end, and gives what it printed.
export async function runToEnd(page: Page, line: string): Promise<string> {
  const before = await page.locator('.terminal section.run').count();
  await startLine(page, line);
  await page.waitForFunction((count) => document.querySelectorAll('.terminal section.run').length > count, before);
  await linesRun(page);
  return lastOutput(page);
}

export const statusOf = async (page: Page): Promise<string> => (await runToEnd(page, 'echo $?')).trim();

// How many frames hold programs.
export const framesHeld = (page: Page): Promise<number> => page.evaluate(() => document.getElementById('terminal-runners')?.childElementCount ?? 0);

// Whether a program runs: its entry is still busy.
export const running = (page: Page): Promise<boolean> => page.evaluate(() => document.querySelector('.terminal section.run[aria-busy="true"]') !== null);
