// The standard commands and `help` (006 research R32): just-bash registers
// only STANDARD_COMMANDS and the site's commands, each answers `--help`,
// the rest is "command not found", and `help` lists every name that runs.
import { describe, expect, test } from 'vitest';
import { getCommandNames, getNetworkCommandNames } from 'just-bash/browser';
import { COMMANDS, SITE_WORDS } from '../../../src/apps/terminal/engine/commands.ts';
import type { Node } from '../../../src/apps/terminal/engine/block.ts';
import { LEFT_OUT, NAMED_NOT_RUN, SHELL_BUILTINS, SHELL_KEYWORDS, STANDARD_COMMANDS } from '../../../src/apps/terminal/shell/standard.ts';
import { fill, siteText } from '../../../src/site-text.ts';
import { fullText } from '../../../src/shell-text.ts';
import { runLine, shellFor } from './context.ts';
import type { TestShell } from './context.ts';

// FR-068's names, and `yes`.
const FR_068 = ['echo', 'printf', 'grep', 'head', 'tail', 'wc', 'sort', 'uniq', 'cut', 'tr', 'sed', 'awk', 'find', 'tree', 'cp', 'mv', 'rm', 'mkdir', 'touch', 'tee', 'xargs', 'diff', 'seq', 'date', 'env', 'which', 'basename', 'dirname', 'true', 'false', 'yes'];

// What `type -t` says of a name: file, builtin, keyword or nothing.
const typeOf = async (shell: TestShell, name: string) => (await runLine(shell, `type -t ${name}`)).stdout.trim();

// Every name a visitor could try: what just-bash offers, the site's, the
// builtins and a few a visitor might.
const EVERY_NAME = [...new Set([...getCommandNames(), ...getNetworkCommandNames(), ...SITE_WORDS, ...STANDARD_COMMANDS, ...SHELL_BUILTINS, 'wget', 'ssh', 'sudo', 'vi', 'nano', 'less', 'more', 'man'])];

// The names `help`'s standard group shows, as its controls' labels.
async function standardGroup(shell: TestShell): Promise<string[]> {
  const [recorded] = (await runLine(shell, 'help')).recorded;
  const group = recorded!.block.find((node): node is Extract<Node, { kind: 'columns' }> => node.kind === 'columns' && node.req === 'standard');
  expect(group).toBeDefined();
  return group!.cells.map((cell) => (cell.kind === 'command' ? (cell.label ?? cell.line) : ''));
}

describe('006-terminal-FR-068: the standard commands', () => {
  test.each(FR_068.filter((name) => !['echo', 'true', 'false'].includes(name)))('%s answers --help with status 0', async (name) => {
    const result = await runLine(shellFor('every-field'), `${name} --help`);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toMatch(new RegExp(`^${name} - .+\\n\\nUsage: ${name} `));
  });

  test('echo, true and false take --help as bash’s builtins do', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'echo --help')).toMatchObject({ stdout: '--help\n', status: 0 });
    expect(await runLine(shell, 'true --help')).toMatchObject({ stdout: '', status: 0 });
    expect(await runLine(shell, 'false --help')).toMatchObject({ stdout: '', status: 1 });
  });

  test('every standard and site command is registered, and nothing else is', async () => {
    const shell = shellFor('every-field');
    const allowed = new Set<string>([...STANDARD_COMMANDS, ...SITE_WORDS, ...SHELL_BUILTINS]);
    for (const name of EVERY_NAME) {
      const kind = await typeOf(shell, name);
      if (allowed.has(name)) expect(kind, name).not.toBe('');
      else if (name === 'alias' || name === 'unalias') expect((await runLine(shell, name)).status, name).toBe(127);
      else if (kind !== 'keyword') expect(kind, name).toBe('');
    }
  });

  test('ls -la, cat -n about, pwd -P and history 3 take their options', async () => {
    const shell = shellFor('every-field');
    const ls = await runLine(shell, 'ls -la');
    expect(ls).toMatchObject({ status: 0, stderr: '' });
    expect(ls.stdout).toMatch(/^total \d+\n/);
    expect(ls.stdout).toMatch(/ about\n/);
    const about = (await runLine(shell, 'about')).stdout.split('\n').slice(0, -1);
    expect((await runLine(shell, 'cat -n about')).stdout).toBe(about.map((line, index) => `${String(index + 1).padStart(6)}\t${line}\n`).join(''));
    expect((await runLine(shell, 'pwd -P')).stdout).toBe('/home/guest\n');
    const history = (await runLine(shell, 'history 3')).stdout.split('\n').slice(0, -1);
    expect(history.map((line) => line.replace(/^\s*\d+\s+/, ''))).toEqual(['cat -n about', 'pwd -P', 'history 3']);
  });

  test.each(Object.entries(LEFT_OUT).filter(([, reason]) => reason !== 'site'))('%s is left out (%s): command not found', async (name) => {
    const result = await runLine(shellFor('every-field'), name);
    expect(result.stderr).toBe(`bash: ${name}: command not found\n`);
    expect(result.status).toBe(127);
  });

  test('the names left out as the site’s run the site’s commands: whoami runs about', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'whoami')).stdout).toBe((await runLine(shell, 'about')).stdout);
    for (const [name, reason] of Object.entries(LEFT_OUT)) if (reason === 'site') expect(SITE_WORDS, name).toContain(name);
  });
});

describe('006-terminal-FR-008: help lists every command, the standard group included', () => {
  test('the standard group lists STANDARD_COMMANDS and SHELL_BUILTINS less the table’s names, in name order', async () => {
    const shell = shellFor('every-field');
    const table = new Set<string>(SITE_WORDS);
    const expected = [...new Set([...STANDARD_COMMANDS, ...SHELL_BUILTINS])].filter((name) => !table.has(name)).sort();
    expect(await standardGroup(shell)).toEqual(expected);
    const { standard } = fullText.terminal;
    const text = (await runLine(shell, 'help')).stdout;
    // The heading and its note share one line, two spaces apart (design/wireframes.md).
    expect(text).toContain(`\n${standard.heading}  ${standard.note}\n`);
  });

  test('each name in the group is a control running help <name>', async () => {
    const [recorded] = (await runLine(shellFor('every-field'), 'help')).recorded;
    const group = recorded!.block.find((node) => node.kind === 'columns' && node.req === 'standard');
    for (const cell of group?.kind === 'columns' ? group.cells : []) expect(cell).toMatchObject({ kind: 'command', line: `help ${cell.kind === 'command' ? cell.label : ''}`, style: 'inline' });
  });

  test.each(SHELL_BUILTINS)('%s is a shell builtin', async (name) => {
    expect((await runLine(shellFor('every-field'), `type ${name}`)).stdout).toBe(`${name} is a shell builtin\n`);
  });

  // Each name `type` knows runs, and each that doesn't run `type` doesn't know
  // (T336).
  test.each([...NAMED_NOT_RUN])('%s isn’t found by type, type -t, command -v or command -V, and doesn’t run', async (name) => {
    const shell = shellFor('every-field');
    const shown = await runLine(shell, `type ${name}`);
    expect(shown.stdout).toBe('');
    expect(shown.stderr).toBe(`bash: type: ${name}: not found\n`);
    expect(shown.status).toBe(1);
    expect((await runLine(shell, `type -t ${name}`)).stdout).toBe('');
    expect((await runLine(shell, `command -v ${name}`)).stdout).toBe('');
    const long = await runLine(shell, `command -V ${name}`);
    expect(long.stderr).toBe(`bash: command: ${name}: not found\n`);
    if (name === 'select' || name === 'coproc') return;
    expect((await runLine(shell, `${name} x`)).stderr).toBe(`bash: ${name}: command not found\n`);
  });

  test.each(SHELL_BUILTINS)('%s runs: it isn’t “command not found”', async (name) => {
    if (['exec', 'exit'].includes(name)) return;
    expect((await runLine(shellFor('every-field'), `${name} --help`)).stderr).not.toMatch(/command not found/);
  });

  test('a name from an expansion is looked at too, and a function of that name is found', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'n=trap; type -t $n; echo $?')).stdout).toBe('1\n');
    expect((await runLine(shell, 'trap() { :; }; type -t trap')).stdout).toBe('function\n');
  });

  test('command -v help names no adapter’s path', async () => {
    expect((await runLine(shellFor('every-field'), 'command -v help')).stdout).toBe('help\n');
  });

  test('select and coproc, which just-bash can’t parse, aren’t keywords (research R43)', () => {
    expect(SHELL_KEYWORDS as readonly string[]).not.toContain('select');
    expect(SHELL_KEYWORDS as readonly string[]).not.toContain('coproc');
  });

  // T338.
  test.each(STANDARD_COMMANDS.flatMap((name) => ['-n', '-d', '-P', '-s', '-I', '-L', '-a', '-E', '-e', '-f', '-m', '-A', '-k', '-t', '-o', '-c', '-u', '-v', '-F', '-N', '--', '--nope'].map((option) => [name, option] as const)))('%s %s prints no JavaScript error', async (name, option) => {
    const result = await runLine(shellFor('every-field'), `${name} ${option} </dev/null`);
    expect(`${result.stdout}${result.stderr}`).not.toMatch(/Cannot read prop|is not a function|undefined|TypeError|ReferenceError|RangeError/);
  });

  test('help grep is grep --help, help export the shell’s own help, help work work’s own, help nosuch the usage reply', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'help grep')).stdout).toBe((await runLine(shell, 'grep --help')).stdout);
    const exportHelp = await runLine(shell, 'help export');
    expect(exportHelp.status).toBe(0);
    expect(exportHelp.stdout).toMatch(/^export: export /);
    expect((await runLine(shell, 'help work')).stdout).toContain(fullText.terminal.commands.work.help);
    const nosuch = await runLine(shell, 'help nosuch');
    expect(nosuch.status).toBe(1);
    expect(nosuch.stderr).toBe(`${fill(fullText.terminal.replies.helpUnknown, { name: 'nosuch', help: 'help' })}\n`);
  });

  test('no name runs that help doesn’t list', async () => {
    const shell = shellFor('every-field');
    const listed = new Set<string>([...COMMANDS.flatMap((row) => [row.name, ...row.aliases]), ...(await standardGroup(shell))]);
    for (const name of EVERY_NAME) {
      if (listed.has(name)) continue;
      const kind = await typeOf(shell, name);
      if (kind === '' || kind === 'keyword') continue;
      expect((await runLine(shell, name)).status, `${name} runs but help doesn't list it`).toBe(127);
    }
  });
});

describe('006-terminal-FR-017: a standard command’s wrong option gives its own message', () => {
  test('date reads the same in any zone: its dates are UTC, each side of Greenwich (T321)', async () => {
    const zone = process.env.TZ;
    try {
      for (const name of ['Asia/Tokyo', 'America/Los_Angeles']) {
        process.env.TZ = name;
        const shell = shellFor('every-field');
        for (const typed of ['15 Jan 2020', '2020/01/15', '01/15/2020', 'jan 15 2020', '2020-01-15']) expect((await runLine(shell, `date -u -d '${typed}' +%F`)).stdout, `${name} ${typed}`).toBe('2020-01-15\n');
        expect((await runLine(shell, "date -u -d 'next monday' +%a")).stdout).toBe('Mon\n');
        expect((await runLine(shell, "date -u -d '12:00' +%H:%M")).stdout).toBe('12:00\n');
      }
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });

  test('find -delete on a protected file, cp and mv of a file on itself, and uniq’s OUTPUT (T322)', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'find about -delete')).stderr).toBe('find: cannot delete ‘about’: Permission denied\n');
    expect((await runLine(shell, 'touch a; mv a a')).stderr).toBe("mv: 'a' and 'a' are the same file\n");
    expect((await runLine(shell, 'cp a a')).stderr).toBe("cp: 'a' and 'a' are the same file\n");
    expect((await runLine(shell, 'cp a b nope')).stderr).toBe("cp: target 'nope': No such file or directory\n");
    expect((await runLine(shell, "printf 'x\\nx\\n' > i; uniq i o; cat o")).stdout).toBe('x\n');
    expect((await runLine(shell, 'mkdir d; diff d d; echo $?')).stdout).toBe('0\n');
    expect((await runLine(shell, 'diff --version')).stdout).toContain('diff (GNU diffutils)');
    expect((await runLine(shell, 'sed')).status).toBe(1);
    expect((await runLine(shell, 'awk')).status).toBe(1);
  });

  test('ls --badopt, grep alone and head -n x about', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'ls --badopt')).toMatchObject({ stderr: "ls: unrecognized option '--badopt'\nTry 'ls --help' for more information.\n", status: 2 });
    expect(await runLine(shell, 'grep')).toMatchObject({ stderr: "Usage: grep [OPTION]... PATTERNS [FILE]...\nTry 'grep --help' for more information.\n", status: 2 });
    expect(await runLine(shell, 'head -n x about')).toMatchObject({ stderr: 'head: invalid number of lines: ‘x’\n', status: 1 });
  });
});

describe('006-terminal-FR-068: the builtins answer --help as bash does', () => {
  test.each([...SHELL_BUILTINS.filter((name) => ![':', '[', 'echo', 'false', 'test', 'true'].includes(name)), 'pwd', 'history'])('%s --help prints help %s’s text, with status 2', async (name) => {
    const shell = shellFor('every-field');
    const help = await runLine(shell, `help ${name}`);
    const result = await runLine(shell, `${name} --help`);
    expect(result).toMatchObject({ stderr: '', status: 2, end: 'done' });
    expect(result.stdout).not.toBe('');
    if (name !== 'pwd') expect(result.stdout).toBe(help.stdout);
  });

  test('the ones bash doesn’t answer stay silent: :, true, false, test', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, ': --help')).toMatchObject({ stdout: '', status: 0 });
    expect(await runLine(shell, 'test --help')).toMatchObject({ stdout: '', status: 0 });
  });
});
