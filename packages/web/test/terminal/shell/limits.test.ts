// The limits that stop a line (006 research R33, G13, G15): 10,000 of the
// line's own commands, 5 seconds, or 1 MB printed, whichever comes first,
// each with the state as it was before the line.
import { afterEach, describe, expect, test, vi } from 'vitest';
import { LIMITS } from '../../../src/apps/terminal/shell/adapter.ts';
import { runLine, shellFor } from './context.ts';
import type { TestShell } from './context.ts';

afterEach(() => vi.restoreAllMocks());

// A shell with a variable, a function and an option set, to check each
// stopped line leaves them as they were.
async function withState(options?: Parameters<typeof shellFor>[1]): Promise<TestShell> {
  const shell = shellFor('every-field', options);
  await runLine(shell, 'KEPT=1; f() { echo f; }; set -o pipefail; cd work');
  return shell;
}

describe('006-terminal-FR-069: a line is stopped once it has run 10,000 commands, run 5 seconds or printed 1 MB', () => {
  test('while true; do :; done stops at the command count', async () => {
    const shell = await withState();
    const before = shell.state;
    const result = await runLine(shell, 'while true; do :; done');
    expect(result).toMatchObject({ end: 'limit', limit: 'commands', state: before });
  });

  test('a busy loop with a raised command count stops at 5 seconds, by the shell’s clock', async () => {
    const shell = await withState({ limits: { commands: 1_000_000_000 } });
    const before = shell.state;
    let now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => (now += 5));
    const result = await runLine(shell, 'i=0; while :; do i=$((i+1)); done');
    expect(result).toMatchObject({ end: 'limit', limit: 'time', state: { cwd: before.cwd, functions: before.functions, variables: { ...before.variables, i: '0' } } });
    expect(result.stderr).toContain(`(${LIMITS.time}ms)`);
  });

  test('seq 1000000 and yes stop at the output limit, yes not with status 0 (G13), and show nothing they printed', async () => {
    const shell = await withState();
    const before = shell.state;
    for (const line of ['seq 1000000', 'yes']) {
      const result = await runLine(shell, line);
      expect(result, line).toMatchObject({ end: 'limit', limit: 'output', state: before, stdout: '', recorded: [] });
    }
    expect(await runLine(shell, 'seq 300000; echo b')).toMatchObject({ end: 'limit', limit: 'output', stdout: '', recorded: [] });
  });

  test('a stopped line shows what the statements before it printed, when under the limit (T325)', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'echo before; yes')).toMatchObject({ end: 'limit', limit: 'output', stdout: 'before\n' });
    expect(await runLine(shell, 'echo a; seq 1000000')).toMatchObject({ end: 'limit', limit: 'output', stdout: 'a\n' });
    expect(await runLine(shell, 'ls nope; yes')).toMatchObject({ end: 'limit', limit: 'output', stderr: expect.stringContaining('nope') });
  });

  test('what passes through a pipe isn’t printed, whatever stands beside it (T325)', async () => {
    const shell = shellFor('every-field');
    for (const [line, stdout] of [['echo a; yes | head -1; echo b', 'a\ny\nb\n'], ['yes | head -1; yes | head -1', 'y\ny\n'], ['seq 1000000 | head -1', '1\n'], ['seq 1000000 | wc -l', '1000000\n']] as const) {
      expect(await runLine(shell, line), line).toMatchObject({ end: 'done', stdout, status: 0 });
    }
  }, 60_000);

  test('only exit and set -e close the Terminal: any other stop keeps the files and the shell (T314)', async () => {
    for (const [line, end] of [
      ['yes | grep -m1 y', 'done'],
      ['printf "%99999999d" 1', 'limit'],
      ['echo {a..z}{a..z}{a..z}{a..z}{a..z}', 'limit'],
      ['a[1+]=1', 'done'],
      ['f() { x=$(f); }; f', 'limit'],
      ['x=a; while :; do x=$x$x; done', 'limit'],
      ['yes | grep y | head -1', 'done'],
      ['yes | xargs echo | head -1', 'limit'],
    ] as const) {
      const shell = shellFor('every-field');
      await runLine(shell, 'touch keep');
      const result = await runLine(shell, line);
      expect(result.end, line).toBe(end);
      expect(result.stderr, line).not.toMatch(/limit exceeded|increase executionLimits/);
      expect((await runLine(shell, 'ls keep')).stdout, line).toBe('keep\n');
    }
    expect(await runLine(shellFor('every-field'), 'a[1+]=1')).toMatchObject({ status: 1, stderr: 'bash: 1+: syntax error: operand expected (error token is "+")\n' });
  }, 60_000);

  test('exit however it is reached still closes it, and a subshell’s doesn’t (T314)', async () => {
    for (const line of ['exit 3', 'eval exit 3', 'x=exit; $x 3', 'f() { exit 3; }; f', 'builtin exit 3', 'set -e; (exit 3)', 'set -e && false', 'set -e; eval false']) {
      expect((await runLine(shellFor('every-field'), line)).end, line).toBe('exited');
    }
    for (const line of ['(exit 3)', 'exit 3 | cat', 'x=$(exit 3)', 'set -e; set +e; a[1+]=1']) {
      expect((await runLine(shellFor('every-field'), line)).end, line).toBe('done');
    }
  });

  test('the three limits are the only ones a line meets (T315)', async () => {
    for (const [line, stdout] of [
      ['echo {1..10001} | wc -w', '10001\n'],
      ['x=({1..20000}); echo ${#x[@]}', '20000\n'],
      ["printf '%s\\n' {1..12000} | wc -l", '12000\n'],
      ["seq 150000 | awk 'END{print NR}'", '150000\n'],
      ["awk 'BEGIN{for(i=0;i<200000;i++)n++; print n}'", '200000\n'],
      ["seq 150000 | sed ':a;N;$!ba;s/\\n/,/g' | wc -c", '938895\n'],
    ] as const) {
      expect(await runLine(shellFor('every-field'), line), line).toMatchObject({ end: 'done', stdout, stderr: '' });
    }
    expect(await runLine(shellFor('every-field'), 'x=({a..c}{1..20000}); echo ${x[60000-1]}')).toMatchObject({ end: 'done', stdout: 'c20000\n' });
  }, 60_000);

  test('a list too long to hold, and a jq that never ends, stop with the site’s text and none of just-bash’s (T315)', async () => {
    expect(await runLine(shellFor('every-field'), 'echo {1..2000000} | wc -w')).toMatchObject({ end: 'limit', limit: 'output', stderr: '' });
    for (const filter of ['[limit(3;repeat(1))]', 'first(range(10;infinite))', 'def f: f; f']) {
      expect(await runLine(shellFor('every-field'), `jq -n '${filter}'`), filter).toMatchObject({ end: 'limit', limit: 'time', stderr: '' });
    }
  });

  test('checks keep to their own output: exec neither gets their text nor hears their failure (T326)', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'exec > f; echo a; exec 1>&-; echo b; x=1')).toMatchObject({ stdout: '', stderr: 'bash: echo: write error: Bad file descriptor\n' });
    expect((await runLine(shell, 'cat f; echo "[$x]"')).stdout).toBe('a\n[1]\n');
  });

  test('seq 200000 | tail -1 prints 200000: no iteration limit (G15), and what passes inside a pipe isn’t printed', async () => {
    const result = await runLine(shellFor('every-field'), 'seq 200000 | tail -1');
    expect(result).toMatchObject({ end: 'done', stdout: '200000\n', status: 0 });
  });

  test('a stopped line keeps what it did before the statement it stopped in (T310)', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'x=1; touch f; cd work; while :; do :; done')).toMatchObject({ end: 'limit', limit: 'commands' });
    expect((await runLine(shell, 'echo "[$x]"; pwd; ls ~/f')).stdout).toBe('[1]\n/home/guest/work\n/home/guest/f\n');
  });

  test('a line runs 10,000 of its own commands, whatever the prelude runs', async () => {
    const shell = await withState();
    await runLine(shell, Array.from({ length: 40 }, (_, index) => `V${index}=${index}`).join('; '));
    await runLine(shell, Array.from({ length: 10 }, (_, index) => `g${index}() { echo ${index}; }`).join('; '));
    // `[` and the assignment each iteration, and the first assignment.
    expect((await runLine(shell, 'i=0; while [ $i -lt 4990 ]; do i=$((i+1)); done; echo $i')).stdout).toBe('4990\n');
    expect(await runLine(shell, 'i=0; while [ $i -lt 5010 ]; do i=$((i+1)); done; echo $i')).toMatchObject({ end: 'limit', limit: 'commands' });
  });
});
