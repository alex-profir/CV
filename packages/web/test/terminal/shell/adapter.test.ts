// The shell adapter (006 research R27): one line at a time, with the state
// carried from line to line, syntax checked first, the site's command words
// matched in any case, `exit` detected, and reset and restore.
import { describe, expect, test } from 'vitest';
import { INITIAL_STATE } from '../../../src/apps/terminal/shell/protocol.ts';
import { runLine, runLines, shellFor } from './context.ts';

describe('006-terminal-FR-067: the shell’s state carries to the next line', () => {
  test('variables, exported variables, a function with local, if and a pipe, pipefail, $? and the working folder', async () => {
    const shell = shellFor('every-field');
    const results = await runLines(shell, [
      `GREETING="hello 'there' world"; export LANGUAGE=en`,
      'up() { local word="$1"; if [ -n "$word" ]; then echo "$word" | tr a-z A-Z; fi; }',
      'set -o pipefail',
      'cd work',
      'false',
      'echo "$?|$GREETING|$LANGUAGE"; up abc; false | true; echo "pipe $?"; pwd',
      'env | grep -c LANGUAGE',
    ]);
    expect(results[5]!.stdout).toBe(`1|hello 'there' world|en\nABC\npipe 1\n/home/guest/work\n`);
    expect(results[6]!.stdout).toBe('1\n');
    expect(shell.state.exported).toContain('LANGUAGE');
    expect(shell.state.options).toContain('pipefail');
  });

  test('unset -f removes a function; one defined in a line that failed before reaching it isn’t kept', async () => {
    const shell = shellFor('every-field');
    await runLines(shell, ['f() { echo f; }', 'unset -f f']);
    expect(shell.state.functions).toEqual({});
    expect((await runLine(shell, 'f')).stderr).toBe('bash: f: command not found\n');
    await runLines(shell, ['set -e; false; g() { echo g; }']);
    expect(Object.keys(shell.state.functions)).toEqual([]);
  });

  test('HOME, USER, LOGNAME and SHELL', async () => {
    const result = await runLine(shellFor('every-field'), 'echo "$HOME $USER $LOGNAME $SHELL"');
    expect(result.stdout).toBe('/home/guest guest guest /bin/bash\n');
  });

  test('a runtime message naming a line names the visitor’s line, not the prelude’s', async () => {
    const shell = shellFor('every-field');
    await runLines(shell, ['A=1; B=2; C=3', 'f() { echo one; }', 'g() { echo two; }']);
    const result = await runLine(shell, '[[ 1 -eq ]]');
    expect(result.stderr).toMatch(/(line |Parse error at )1:/);
    expect(result.stderr).not.toMatch(/(line |Parse error at )([2-9]|\d\d+):/);
  });
});

describe('006-terminal-FR-007: site command words match without regard to capitals, spaces or tabs', () => {
  test(' HELP , work\\t, Work  and help   work run the site command; GREP x is not found', async () => {
    const shell = shellFor('every-field');
    const help = (await runLine(shell, 'help')).stdout;
    const work = (await runLine(shell, 'work')).stdout;
    expect((await runLine(shell, ' HELP ')).stdout).toBe(help);
    expect((await runLine(shell, 'work\t')).stdout).toBe(work);
    expect((await runLine(shell, 'Work  ')).stdout).toBe(work);
    expect((await runLine(shell, 'WHOAMI')).stdout).toBe((await runLine(shell, 'about')).stdout);
    expect((await runLine(shell, 'help   work')).stdout).toBe((await runLine(shell, 'help work')).stdout);
    expect((await runLine(shell, 'GREP x')).stderr).toBe('bash: GREP: command not found\n');
  });

  test('an empty or blank line runs nothing and returns status 0', async () => {
    const shell = shellFor('every-field');
    for (const line of ['', ' ', '\t', '   \t  ']) {
      const result = await runLine(shell, line);
      expect(result, JSON.stringify(line)).toMatchObject({ stdout: '', stderr: '', status: 0, end: 'done', recorded: [], effects: [] });
    }
  });
});

describe('006-terminal-FR-057: a syntax error runs nothing', () => {
  test('an open quote', async () => {
    const shell = shellFor('every-field');
    const result = await runLine(shell, 'echo before; echo "a');
    expect(result).toMatchObject({ stdout: '', end: 'syntax', status: 2 });
    expect(result.stderr).toContain("unexpected EOF while looking for matching `\"'");
  });

  test('a pipe with an empty side (research G2)', async () => {
    const shell = shellFor('every-field');
    for (const line of ['ls |', '| jq', 'ls |||  x', 'touch made |']) {
      const result = await runLine(shell, line);
      expect(result, line).toMatchObject({ stdout: '', end: 'syntax', status: 2 });
      expect(result.stderr, line).toContain("syntax error near unexpected token `|'");
    }
    expect((await runLine(shell, 'ls')).stdout).not.toContain('made');
  });
});

describe('006-terminal-FR-008: exit, and the adapter’s own commands', () => {
  test('exit and exit 3 end the shell', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'exit')).toMatchObject({ end: 'exited', status: 0 });
    expect(await runLine(shell, 'echo bye; exit 3; echo not')).toMatchObject({ end: 'exited', status: 3, stdout: 'bye\n' });
  });

  test('a line naming __cv_state or __cv_denied is command not found', async () => {
    const shell = shellFor('every-field');
    for (const line of ['__cv_state 0', 'echo x; __cv_denied about', 'echo __CV_STATE']) {
      const result = await runLine(shell, line);
      expect(result.stderr, line).toMatch(/^bash: \S*__cv_\S*: command not found\n$/i);
      expect(result.status, line).toBe(127);
      expect(result.stdout, line).toBe('');
    }
  });
});

describe('006-terminal-FR-021: reset and restore', () => {
  test('reset empties the visitor’s files; restore gives back a variable, a function and a file', async () => {
    const shell = shellFor('every-field');
    const results = await runLines(shell, ['N=7; f() { echo "f$N"; }', 'echo kept > notes']);
    const { state } = shell;
    const files = results[1]!.files!;
    expect(files.files['/home/guest/notes']).toBe('kept\n');
    await shell.reset();
    expect((await runLine(shell, 'cat notes', INITIAL_STATE)).stderr).toBe('cat: notes: No such file or directory\n');
    expect((await runLine(shell, 'f', INITIAL_STATE)).status).toBe(127);
    await shell.restore(state, files);
    const back = await runLine(shell, 'f; cat notes', state);
    expect(back.stdout).toBe('f7\nkept\n');
  });
});
