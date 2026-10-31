// Parity with bash's readline (006 SC-017, research R45): the Terminal's file
// system for the real CV plus a few visitor files, written to a temporary
// folder, and partly typed lines completed by the Terminal and by real bash
// 5, driven through a pseudo-terminal by readline-driver.py. The same
// commands on both sides: PATH is a folder of empty executables, and each
// bash builtin the Terminal doesn't have is turned off.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { columns } from '../../../src/apps/terminal/engine/columns.ts';
import { SITE_WORDS } from '../../../src/apps/terminal/engine/commands.ts';
import type { FsNode } from '../../../src/apps/terminal/engine/files.ts';
import { fileText } from '../../../src/apps/terminal/shell/fs.ts';
import { SHELL_BUILTINS, STANDARD_COMMANDS } from '../../../src/apps/terminal/shell/standard.ts';
import { completeLine, runLine, shellFor, treeFor } from './context.ts';
import type { TestShell } from './context.ts';

const DRIVER = fileURLToPath(new URL('./readline-driver.py', import.meta.url));
const INSTALL = 'brew install bash python, then put bash first on PATH';

// Each covers one of R45's cases.
const LINES: readonly string[] = [
  'ab', // a command
  'experi', // an alias
  'expo', // a builtin
  'whil', // a keyword
  'ca', // several, a keyword and a command, nothing to add
  'myf', // a function
  'not', // a folder in the first word
  'wo', // a command and a folder
  'cat cv', // a file
  'cd wo', // a folder
  'ls /us', // a path from /
  'cat ~/sk', // a path from ~/
  './w', // a path in the first word
  'cat "cv', // double quotes
  "cat 'cv", // single quotes
  'cat "wo', // a folder in quotes
  'cat my', // a name with a space
  'cat "my',
  "cat 'my",
  'echo hi > ab', // after a redirect
  'ls | wc', // after |
  'ls; wc',
  'ls && wc',
  'cat c', // several, the last part only
  'cat ~/', // the list
  'ls notes/', // a common part below
  'ls h100/f1', // a common part and a list
  'ls cas', // no match
  'xyz',
  'ls h100/f', // the question
  'echo $MYV', // a variable
  'echo "$MYV',
  'echo $HOM',
  '[[',
  'cat c?',
  'cd ..', // the parent, as readline adds it
  'ls .', // the two dots and any hidden entries
  'ls ..',
  'ls notes/.',
  'cat $HOME/ab', // a path from a variable
  'echo $HOME/wo',
  'x=1 ec', // a command after assignments
  'x=1 y=2 ec',
  'cat wo*', // a pattern that matches one name
  'cat s*',
  '`ab', // in a command substitution
  'echo `ab',
  'echo "$(ab',
  'echo $(ab',
];

// bash lists the machine's users on a second Tab, so these get one (`~`).
const ONE_TAB: readonly string[] = ['~', 'cat ~'];

let root = '';
let home = '';
let shell: TestShell;

function missingTool(): string | null {
  const bash = spawnSync('bash', ['--version'], { encoding: 'utf8' });
  if (!/^GNU bash, version [5-9]/.test(bash.stdout ?? '')) return `bash on PATH is not GNU bash 5 (${(bash.stdout ?? '').split('\n')[0] || 'not found'})`;
  if (spawnSync('python3', ['--version'], { encoding: 'utf8' }).status !== 0) return 'python3 is not on PATH';
  return null;
}

function writeTree() {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cv-readline-')));
  home = path.join(root, 'home', 'guest');
  fs.mkdirSync(home, { recursive: true });
  const walk = (node: FsNode, at: string) => {
    if (node.kind === 'file') fs.writeFileSync(at, fileText(node), { mode: 0o444 });
    else {
      fs.mkdirSync(at);
      for (const child of node.children) walk(child, path.join(at, child.name));
    }
  };
  for (const child of treeFor().fs.children) walk(child, path.join(home, child.name));
  fs.mkdirSync(path.join(home, 'notes'));
  fs.writeFileSync(path.join(home, 'notes', 'one'), '');
  fs.writeFileSync(path.join(home, 'todo'), '');
  fs.writeFileSync(path.join(home, 'my file'), '');
  fs.mkdirSync(path.join(home, 'h100'));
  for (let index = 1; index <= 100; index += 1) fs.writeFileSync(path.join(home, 'h100', `f${index}`), '');
}

type Answer = { line: string; after: string; cursor: number; output: string };

function inBash(): Map<string, Answer> {
  const bin = path.join(root, 'bin');
  fs.mkdirSync(bin);
  for (const name of new Set<string>([...SITE_WORDS, ...STANDARD_COMMANDS])) if (!(SHELL_BUILTINS as readonly string[]).includes(name)) fs.writeFileSync(path.join(bin, name), '', { mode: 0o755 });
  const bash = spawnSync('which', ['bash'], { encoding: 'utf8' }).stdout.trim();
  const builtins = spawnSync(bash, ['-c', 'compgen -b'], { encoding: 'utf8' }).stdout.split('\n').filter((name) => name !== '' && !(SHELL_BUILTINS as readonly string[]).includes(name));
  const job = { cwd: home, home, path: bin, bash, disable: builtins, setup: ['myfunc() { :; }', 'MYVAR=1'], lines: [...LINES, ...ONE_TAB] };
  const result = spawnSync('python3', ['-I', DRIVER], { input: JSON.stringify(job), encoding: 'utf8', timeout: 120_000 });
  if (result.status !== 0) throw new Error(`the readline driver failed: ${result.stderr}`);
  return new Map((JSON.parse(result.stdout) as Answer[]).map((answer) => [answer.line, answer]));
}

let answers = new Map<string, Answer>();

beforeAll(async () => {
  if (missingTool() !== null) return;
  writeTree();
  answers = inBash();
  shell = shellFor();
  await runLine(shell, 'mkdir notes h100 && touch notes/one todo "my file"; for n in $(seq 1 100); do touch h100/f$n; done');
  await runLine(shell, 'myfunc() { :; }');
  await runLine(shell, 'MYVAR=1');
}, 180_000);

afterAll(() => {
  if (root !== '') fs.rmSync(root, { recursive: true, force: true });
});

const applied = (line: string, answer: Awaited<ReturnType<typeof completeLine>>) => (answer.insert === '' ? line : line.slice(0, answer.start) + answer.insert + line.slice(answer.end));

// bash's list: the rows between the line and the next prompt.
function listed(answer: Answer): string[] {
  const rows = answer.output.split('\r\n');
  if (rows.length < 3) return [];
  return rows.slice(1, -1).map((row) => row.trimEnd());
}

describe('006-terminal SC-017: Tab gives what bash’s readline gives', () => {
  test('at least 20 lines', () => {
    expect(LINES.length).toBeGreaterThanOrEqual(20);
  });

  test.each([...LINES, ...ONE_TAB])('one Tab: %s', async (line) => {
    const missing = missingTool();
    if (missing !== null) throw new Error(`the completion parity test needs bash 5 and python3: ${missing}. On macOS: ${INSTALL}.`);
    const bash = answers.get(line)!;
    const ours = applied(line, await completeLine(shell, line));
    expect(ours).toBe(bash.after);
    expect(ours.length).toBe(bash.cursor);
  });

  test.each(LINES)('two Tabs: %s', async (line) => {
    const missing = missingTool();
    if (missing !== null) throw new Error(`the completion parity test needs bash 5 and python3: ${missing}. On macOS: ${INSTALL}.`);
    const bash = answers.get(line)!;
    const answer = await completeLine(shell, line);
    if (bash.output.includes('possibilities?')) {
      expect(answer.matches.length).toBeGreaterThanOrEqual(100);
      expect(bash.output).toContain(`Display all ${answer.matches.length} possibilities? (y or n)`);
      return;
    }
    const list = listed(bash);
    const nothingAdded = answer.insert === '';
    const ours = nothingAdded && answer.matches.length >= 2 ? columns(answer.matches, 80).map((row) => row.join('').trimEnd()) : [];
    expect(ours).toEqual(list);
  });
});
