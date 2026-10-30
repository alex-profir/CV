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

// Tab at the cursor (the line's end unless given), from the shell's state.
export async function completeLine(shell: TestShell, line: string, cursor = line.length) {
  await shell.warm();
  shell.ids += 1;
  return shell.complete({ id: shell.ids, line, cursor, state: shell.state });
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

// One line per feature of bash's language FR-067 names: the feature, the
// line and what it prints on the every-field CV ('' when only a count).
export const LANGUAGE_CASES: readonly (readonly [string, string, string])[] = [
  [';', 'echo a; echo b', 'a\nb\n'],
  ['&&', 'true && echo yes; false && echo no', 'yes\n'],
  ['||', 'false || echo yes; true || echo no', 'yes\n'],
  ['single quotes', "echo '$HOME a  b'", '$HOME a  b\n'],
  ['double quotes', 'X=1; echo "x is $X  !"', 'x is 1  !\n'],
  ['backslash escapes', 'echo a\\ b \\$HOME', 'a b $HOME\n'],
  ['$VAR and ${VAR}', 'V=ab; echo $V ${V}c', 'ab abc\n'],
  ['${VAR:-d}', 'echo ${NOPE:-d} ${HOME:-d}', 'd /home/guest\n'],
  ['export', 'export E=1; env | grep -c "^E=1$"', '1\n'],
  ['$?', 'false; echo $?; true; echo $?', '1\n0\n'],
  ['*', 'cd work; echo * | wc -w', ''],
  ['?', 'echo ab?ut', 'about\n'],
  ['[...]', 'echo [a]bout', 'about\n'],
  ['>', 'echo one > /tmp/x; cat /tmp/x', 'one\n'],
  ['>>', 'echo one > /tmp/x; echo two >> /tmp/x; cat /tmp/x', 'one\ntwo\n'],
  ['2>', 'cat nowhere 2> /tmp/e; wc -l < /tmp/e', '1\n'],
  ['2>&1', 'cat nowhere 2>&1 | wc -l', '1\n'],
  ['<', 'echo in > /tmp/i; tr a-z A-Z < /tmp/i', 'IN\n'],
  ['if', 'if [ -f about ]; then echo file; else echo none; fi', 'file\n'],
  ['for', 'for n in 1 2 3; do echo n$n; done', 'n1\nn2\nn3\n'],
  ['while', 'i=0; while [ $i -lt 2 ]; do echo $i; i=$((i+1)); done', '0\n1\n'],
  ['until', 'i=0; until [ $i -ge 2 ]; do echo $i; i=$((i+1)); done', '0\n1\n'],
  ['functions', 'twice() { echo "$1$1"; }; twice ab', 'abab\n'],
];
