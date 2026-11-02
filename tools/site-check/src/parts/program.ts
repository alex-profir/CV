// The part `program` (009 FR-043, contracts/cli.md Parts): on the real build, in
// a real browser, what a visitor sees of a program. Each check names itself in its
// variant, so a failure says what failed.
import type { BrowserContextOptions, Locator, Page } from 'playwright';
import type { Problem } from '../report.ts';
import { TERMINAL, newRun, openTerminal, stateVariant, typeLine } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';

export type Found = Omit<Problem, 'part' | 'page' | 'variant'>;

export type ProgramCheck = {
  name: string;
  shells: readonly Shell[];
  options?: BrowserContextOptions;
  run: (page: Page, shell: Shell) => Promise<Found[]>;
};

export const programVariant = (shell: Shell, name: string, width: number) => stateVariant(shell, `program-${name}`, width);

export const problem = (type: string, subject: string, detail: string): Found => ({ type, subject, detail });

// A file, written as a visitor could with the shell's `printf`.
export async function writeFile(page: Page, name: string, text: string): Promise<void> {
  const quoted = `'${text.replace(/'/g, "'\\''")}'`;
  await typeLine(page, `printf '%s' ${quoted} > ${name}`);
}

// Runs a line and gives back its run, once the line and any program have ended.
export const runLine = (page: Page, line: string): Promise<Locator> => newRun(page, () => typeLine(page, line));

// The output of a run, as text.
export const outputOf = async (run: Locator): Promise<string> => (await run.locator(TERMINAL.output).innerText()).trim();

export { openTerminal };

// The checks, in order; each story adds its own.
export const PROGRAM_CHECKS: readonly ProgramCheck[] = [];
