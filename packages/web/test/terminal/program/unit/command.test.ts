// `node`, `ts-node` and `tsnode` in the shell (contracts/commands.md): every row.
import { describe, expect, test } from 'vitest';
import { fullText } from '../../../../src/shell-text.ts';
import { COMMANDS, SITE_WORDS } from '../../../../src/apps/terminal/engine/commands.ts';
import { blockText } from '../../../../src/apps/terminal/engine/block.ts';
import type { Effect } from '../../../../src/apps/terminal/engine/block.ts';
import { LEFT_OUT } from '../../../../src/apps/terminal/shell/standard.ts';
import { completeLine, runLine, runLines, shellFor } from '../../shell/context.ts';

const words = fullText.terminal.nodeCommand;

const programOf = (effects: readonly Effect[]) => {
  const found = effects.filter((effect) => effect.kind === 'program');
  expect(found).toHaveLength(1);
  return found[0]!.request;
};

describe('009-terminal-node-FR-001: node runs a file from the working folder', () => {
  test.each([
    ['node a.js x y', '/home/guest/a.js', ['x', 'y']],
    ['node a.ts', '/home/guest/a.ts', []],
    ['node ./sub/../a.js', '/home/guest/a.js', []],
    ['node /tmp/a.js -e --flag', '/tmp/a.js', ['-e', '--flag']],
  ])('%s gives a program effect with the path resolved', async (line, script, args) => {
    const result = await runLine(shellFor(), line);
    expect(result.status).toBe(0);
    expect(result.end).toBe('done');
    expect(result.stdout + result.stderr).toBe('');
    const request = programOf(result.effects);
    expect(request).toMatchObject({ command: 'node', script, args, code: null, print: false, cwd: '/home/guest' });
  });

  test('from another working folder, the snapshot holds the protected files and the visitor’s, with owners', async () => {
    const shell = shellFor();
    await runLines(shell, ['mkdir sub', 'echo hi > sub/note.txt', 'cd sub']);
    const request = programOf((await runLine(shell, 'node a.js')).effects);
    expect(request.script).toBe('/home/guest/sub/a.js');
    expect(request.cwd).toBe('/home/guest/sub');
    const { entries, bytes } = request.files;
    expect(entries.find((entry) => entry.path === '/home/guest/sub/note.txt')).toEqual({ path: '/home/guest/sub/note.txt', kind: 'file', owner: 'guest', protected: false, text: 'hi\n' });
    expect(entries.find((entry) => entry.path === '/home/guest/sub')).toEqual({ path: '/home/guest/sub', kind: 'folder', owner: 'guest', protected: false });
    expect(entries.find((entry) => entry.path === '/home/guest/cv.json')).toMatchObject({ kind: 'file', owner: 'root', protected: true });
    expect(bytes).toBe(3);
  });
});

describe('009-terminal-node-FR-002: ts-node and tsnode are one command', () => {
  test.each(['ts-node', 'tsnode'])('%s gives the command ts-node', async (word) => {
    expect(programOf((await runLine(shellFor(), `${word} app.ts a`)).effects)).toMatchObject({ command: 'ts-node', script: '/home/guest/app.ts', args: ['a'] });
  });
});

describe('009-terminal-node-FR-003: -e and -p run the code given', () => {
  test.each([
    ['-e', false],
    ['--eval', false],
    ['-p', true],
    ['--print', true],
  ] as const)('node %s', async (flag, print) => {
    const request = programOf((await runLine(shellFor(), `node ${flag} "1 + 1" a b`)).effects);
    expect(request).toMatchObject({ command: 'node', script: null, code: '1 + 1', print, args: ['a', 'b'] });
  });

  test('with no code it says so, as node does, with status 9', async () => {
    const result = await runLine(shellFor(), 'node -e');
    expect(result.stderr).toBe('node: -e requires an argument\n');
    expect(result.status).toBe(9);
    expect(result.effects).toEqual([]);
  });
});

describe('009-terminal-node-FR-004: no script says there is no interactive mode', () => {
  test.each(['node', 'ts-node', 'tsnode'])('%s alone: site text, status 1, no effect', async (line) => {
    const result = await runLine(shellFor(), line);
    expect(result.stderr).toBe(`${words.noScript}\n`);
    expect(result.status).toBe(1);
    expect(result.effects).toEqual([]);
  });
});

describe('009-terminal-node-FR-005: version, help and bad options', () => {
  test.each(['node -v', 'node --version', 'ts-node -v', 'tsnode --version'])('%s says it is a browser runtime', async (line) => {
    const result = await runLine(shellFor(), line);
    expect(result.stdout).toBe('v26.0.0 (browser runtime, not Node.js)\n');
    expect(result.status).toBe(0);
    expect(result.effects).toEqual([]);
  });

  test.each(['node -h', 'node --help', 'ts-node --help'])('%s gives usage, the modules and the list', async (line) => {
    const { stdout, status } = await runLine(shellFor(), line);
    expect(status).toBe(0);
    expect(stdout).toContain('Usage: node <file> [args]');
    for (const name of ['fs', 'fs/promises', 'path', 'events', 'util', 'assert', 'os', 'timers', 'timers/promises', 'buffer', 'url']) expect(stdout).toMatch(new RegExp(`\\b${name}\\b`));
    expect(stdout).toContain('contracts/node-api.md');
  });

  test.each([
    ['node --x', '--x'],
    ['node --inspect a.js', '--inspect'],
    ['ts-node -e 1', '-e'],
    ['tsnode -p 1', '-p'],
    ['ts-node --transpile-only a.ts', '--transpile-only'],
  ])('%s is a bad option with status 9', async (line, option) => {
    const result = await runLine(shellFor(), line);
    expect(result.stderr).toBe(`node: bad option: ${option}\n`);
    expect(result.status).toBe(9);
    expect(result.effects).toEqual([]);
  });
});

describe('009-terminal-node-FR-006: on a line of its own only', () => {
  test.each([
    'node a.js | cat',
    'cat x | node a.js',
    'node a.js > f',
    'node a.js 2>&1',
    'node a.js < f',
    'true && node a.js',
    'node a.js && true',
    'true; node a.js',
    'node a.js; true',
    'node a.js &',
    'for i in 1; do node a.js; done',
    'if true; then node a.js; fi',
    '(node a.js)',
    '{ node a.js; }',
    '! node a.js',
    'time node a.js',
    'x=$(node a.js)',
    'echo $(node a.js)',
    'node $(echo a.js)',
    'node <(echo a)',
    'env node a.js',
    'command node a.js',
    'eval node a.js',
    'xargs node',
    'node --version | cat',
    'ts-node a.ts | cat',
    'tsnode a.ts; true',
  ])('%s runs nothing and says so', async (line) => {
    const shell = shellFor();
    await runLines(shell, ['echo a > f']);
    const result = await runLine(shell, line);
    expect(result.effects.filter((effect) => effect.kind === 'program')).toEqual([]);
    expect(result.stdout + result.stderr).toContain(words.ownLine);
  });

  test('in a function or a script', async () => {
    const shell = shellFor();
    await runLines(shell, ['f() { node a.js; }', "printf 'node a.js\\n' > s.sh"]);
    for (const line of ['f', 'source s.sh']) {
      const result = await runLine(shell, line);
      expect(result.effects).toEqual([]);
      expect(result.stderr).toBe(`${words.ownLine}\n`);
      expect(result.status).toBe(1);
    }
  });

  test('status 1 on a plain larger line', async () => {
    const shell = shellFor();
    const result = await runLine(shell, 'node a.js | cat');
    expect(result.effects).toEqual([]);
    const redirected = await runLine(shell, 'node a.js > f');
    expect(redirected.status).toBe(1);
    expect(redirected.stderr).toBe(`${words.ownLine}\n`);
    expect((await runLine(shell, 'true; node a.js')).status).toBe(1);
  });

  test('assignments before it join the environment, and words expand', async () => {
    const shell = shellFor();
    await runLines(shell, ['export KEPT=yes', 'LOCAL=no', 'FILE=a.js']);
    const request = programOf((await runLine(shell, 'A=1 node $FILE "$LOCAL"')).effects);
    expect(request.script).toBe('/home/guest/a.js');
    expect(request.args).toEqual(['no']);
    expect(request.env).toMatchObject({ A: '1', KEPT: 'yes', HOME: '/home/guest' });
    expect(request.env).not.toHaveProperty('LOCAL');
    expect(Object.keys(request.env).filter((name) => name.startsWith('__cv'))).toEqual([]);
  });
});

describe('009-terminal-node-FR-007: help and Tab include them', () => {
  test('help lists node and ts-node, with tsnode beside it, and each has its own help', async () => {
    const help = await runLine(shellFor(), 'help');
    const shown = blockText(help.recorded[0]!.block);
    expect(shown).toMatch(/^node <file> \[args\]\s+Run a JavaScript or TypeScript file$/m);
    expect(shown).toMatch(/^ts-node <file> \[args\]\s+tsnode\s+Check a TypeScript file, then run it$/m);
    expect((await runLine(shellFor(), 'help node')).stdout).toContain(fullText.terminal.commands.node.help);
    expect(COMMANDS.map((row) => row.name)).toEqual(expect.arrayContaining(['node', 'ts-node']));
    expect(SITE_WORDS).toEqual(expect.arrayContaining(['node', 'ts-node', 'tsnode']));
  });

  test.each([
    ['nod', 'node'],
    ['ts-', 'ts-node'],
    ['tsn', 'tsnode'],
  ])('Tab completes %s to %s', async (typed, whole) => {
    const answer = await completeLine(shellFor(), typed);
    expect([...answer.matches.map((match) => match.name), typed + answer.insert.trim()]).toContain(whole);
  });
});

describe('009-terminal-node-FR-042 and 006-terminal-FR-068: the other names stay left out', () => {
  test.each(['python', 'python3', 'curl', 'sqlite3', 'js-exec'])('%s is still left out', async (name) => {
    expect(LEFT_OUT).toHaveProperty(name);
    const result = await runLine(shellFor(), name);
    expect(result.status).toBe(127);
    expect(result.stderr).toBe(`bash: ${name}: command not found\n`);
  });

  test.each(['wget', 'ssh'])('%s is still not found', async (name) => {
    expect((await runLine(shellFor(), name)).status).toBe(127);
  });

  test('node is out of the list', () => {
    expect(LEFT_OUT).not.toHaveProperty('node');
  });
});
