// Shell test helpers, as engine/context.ts is for the engine: the shell
// adapter on the real CV or a fixture CV, with the real spec list, in Node,
// running the same modules the worker runs. Tests may hold literal values
// and CV text.
import type { Resume } from '@cv/content';
import { resume as realResume, siteData } from '@cv/content';
import { dateRange } from '../../../src/format/dates.ts';
import { locationLine } from '../../../src/format/location.ts';
import { withoutScheme } from '../../../src/format/url.ts';
import { siteText } from '../../../src/site-text.ts';
import { engineContext } from '../../../src/apps/terminal/engine/commands.ts';
import type { RunContext } from '../../../src/apps/terminal/engine/commands.ts';
import { createShell } from '../../../src/apps/terminal/shell/adapter.ts';
import type { Limits, Shell } from '../../../src/apps/terminal/shell/adapter.ts';
import { INITIAL_STATE } from '../../../src/apps/terminal/shell/protocol.ts';
import type { RunResult, ShellState } from '../../../src/apps/terminal/shell/protocol.ts';
import { readSpecList } from '../../../scripts/spec-list.ts';
import { fixture } from '../../helpers/fixtures.ts';
import type { FixtureName } from '../../helpers/fixtures.ts';

export type TestShell = Shell & { state: ShellState; history: string[]; ids: number };

export const FORMAT = { dateRange, locationLine, withoutScheme };

const inputFor = (name?: FixtureName) => {
  const resume: Resume = name === undefined ? realResume : fixture(name);
  return { text: siteText, format: FORMAT, resume, siteData, specs: readSpecList(), cvJson: JSON.stringify(resume, null, 2) };
};

// The site commands' context the shell builds, with its file tree.
export const treeFor = (name?: FixtureName): RunContext => engineContext(inputFor(name));

// The shell on the real CV, or on a fixture's; `limits` to reach one limit
// before another.
export function shellFor(name?: FixtureName, options: { limits?: Partial<Limits> } = {}): TestShell {
  const shell = createShell(inputFor(name), options);
  return Object.assign(shell, { state: INITIAL_STATE, history: [] as string[], ids: 0 });
}

// One line, sent as one request from the given state (or the shell's
// last), with the history as the session sends it: this line included.
export async function runLine(shell: TestShell, line: string, state?: ShellState, options: { shell?: 'desktop' | 'mobile' } = {}): Promise<RunResult> {
  const history = line.trim() === '' ? shell.history : [...shell.history, line];
  shell.ids += 1;
  const result = await shell.run({ id: shell.ids, line, state: state ?? shell.state, history, ...options });
  shell.history = result.effects.some((effect) => effect.kind === 'clear-history') ? [] : history;
  shell.state = result.state;
  return result;
}

// Lines in order, each from the state the last left, as the session runs
// them.
export async function runLines(shell: TestShell, lines: readonly string[]): Promise<RunResult[]> {
  const results: RunResult[] = [];
  for (const line of lines) results.push(await runLine(shell, line));
  return results;
}
