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
    expect(result).toMatchObject({ end: 'limit', limit: 'time', state: before });
    expect(result.stderr).toContain(`(${LIMITS.time}ms)`);
  });

  test('seq 1000000 and yes stop at the output limit, yes not with status 0 (G13), and show nothing they printed', async () => {
    const shell = await withState();
    const before = shell.state;
    for (const line of ['seq 1000000', 'yes', 'echo before; yes']) {
      const result = await runLine(shell, line);
      expect(result, line).toMatchObject({ end: 'limit', limit: 'output', state: before, stdout: '', recorded: [] });
    }
  });

  test('seq 200000 | tail -1 prints 200000: no iteration limit (G15), and what passes inside a pipe isn’t printed', async () => {
    const result = await runLine(shellFor('every-field'), 'seq 200000 | tail -1');
    expect(result).toMatchObject({ end: 'done', stdout: '200000\n', status: 0 });
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
