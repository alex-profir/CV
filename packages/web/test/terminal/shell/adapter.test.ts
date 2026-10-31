// The shell adapter (006 research R27): one line at a time, with the state
// carried from line to line, syntax checked first, the site's command words
// matched in any case, `exit` detected, and reset and restore.
import { fill, siteText } from '../../../src/site-text.ts';
import { describe, expect, test } from 'vitest';
import { INITIAL_STATE, QUOTA } from '../../../src/apps/terminal/shell/protocol.ts';
import { LANGUAGE_CASES, runLine, runLines, shellFor } from './context.ts';

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
  test.each([
    ['in a chain', 'true && WORK | head -1', 'work | head -1'],
    ['after a semicolon', 'echo a; ABOUT', 'echo a; about'],
    ['in a loop', 'for i in 1 2; do WORK; done | head -3', 'for i in 1 2; do work; done | head -3'],
    ['in a function', 'f() { Skills; }; f', 'skills'],
    ['an alias', 'true; WHOAMI', 'about'],
    ['help, under its own name', 'true; HELP', 'help'],
  ])('a site command in any case %s', async (_, line, same) => {
    const shell = shellFor('every-field');
    const result = await runLine(shell, line);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe((await runLine(shellFor('every-field'), same)).stdout);
    expect(result.stdout).not.toBe('');
  });

  test('replies name the word as typed; standard commands and the visitor’s functions keep bash’s meaning', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'true; About extra')).stderr).toMatch(/^About /);
    expect((await runLine(shell, 'true; about extra')).stderr).toMatch(/^about /i);
    expect(await runLine(shell, 'true; GREP x')).toMatchObject({ stderr: 'bash: GREP: command not found\n', status: 127 });
    expect((await runLine(shell, 'WORK() { echo mine; }; WORK')).stdout).toBe('mine\n');
    expect((await runLine(shell, 'true; WORK')).stdout).toBe('mine\n');
    expect((await runLine(shell, 'env | grep -c CV_; set -x; WORK; true')).stderr).not.toMatch(/__cv/i);
  });

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
    for (const [line, word] of [['ls |', 'syntax error: unexpected end of file'], ['| jq', "syntax error near unexpected token `|'"], ['ls |||  x', "syntax error near unexpected token `|'"], ['touch made |', 'syntax error: unexpected end of file']] as const) {
      const result = await runLine(shell, line);
      expect(result, line).toMatchObject({ stdout: '', end: 'syntax', status: 2 });
      expect(result.stderr, line).toContain(word);
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

  test('exit in a stored function ends the shell; an error that stops a line doesn’t, and the shell goes on as before it', async () => {
    const shell = shellFor('every-field');
    await runLines(shell, ['cd work', 'X=1', 'f() { exit 4; }', 'g() { f; }']);
    for (const line of ['set -u; echo $nope', 'echo ${unset_var:?gone}', 'echo x > "about"', 'echo x > /tmp/nowhere/f']) {
      const result = await runLine(shell, line);
      expect(result.end, line).toBe('done');
      expect(result.status, line).toBe(1);
      expect(result.stderr, line).toMatch(/^bash: /);
    }
    expect(shell.state).toMatchObject({ cwd: '/home/guest/work', variables: { X: '1' }, options: ['nounset'] });
    expect(await runLine(shell, 'g')).toMatchObject({ end: 'exited', status: 4 });
  });

  test('a word that only looks like the adapter’s is any other word, and no expansion reaches its commands (T299)', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'echo __cv_x; __cv_y=1; echo $__cv_y'))).toMatchObject({ stdout: '__cv_x\n1\n', stderr: '', status: 0 });
    expect((await runLine(shell, 'echo $__cv_y')).stdout).toBe('1\n');
    for (const name of ['end', 'help', 'cd', 'wrote', 'begin']) {
      expect(await runLine(shell, `n=__c; \${n}v_${name}`), name).toMatchObject({ stderr: `bash: __cv_${name}: command not found\n`, status: 127 });
      expect((await runLine(shell, `type __cv_${name}`)).status).toBe(1);
    }
    expect((await runLine(shell, 'which __cv_end; ls /usr/bin | grep -c __cv')).stdout).toBe('0\n');
  });

  test.each(['env', 'set', 'declare -p', 'compgen -v'])('%s shows nothing of the adapter’s, piped or not (T299)', async (line) => {
    const shell = shellFor('every-field');
    await runLine(shell, 'f() { :; }; x=1; cd work; cd ..; false | true');
    for (const each of [line, `${line} | cat`, `x=1; ${line} | sort`, `f() { ${line}; }; f | cat`, `y=${line.split(' ')[0]}; $y | cat`]) {
      const result = await runLine(shell, each);
      expect(`${result.stdout}${result.stderr}`, each).not.toMatch(/__cv/i);
    }
  });

  test('$_ carries from line to line, and no check changes it (T299)', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'echo a');
    expect((await runLine(shell, 'echo $_')).stdout).toBe('a\n');
    expect((await runLine(shell, 'cd /tmp; echo $_; echo x > /tmp/y; echo $_; f() { :; }; echo $_')).stdout).toBe('/tmp\nx\nx\n');
  });

  test('set -v prints the line once it is on, and none of the adapter’s (T299)', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'set -v; echo a')).toMatchObject({ stdout: 'a\n', stderr: '' });
    expect(await runLine(shell, 'echo b; echo c')).toMatchObject({ stdout: 'b\nc\n', stderr: 'echo b; echo c\n' });
  });

  test('a command name from an expansion runs as a site command, pipes and capitals included (T297, T304)', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, "x='work -x'; $x")).stderr).toMatch(/^work /);
    const work = (await runLine(shell, 'work')).stdout;
    expect((await runLine(shell, 'x=WORK; $x')).stdout).toBe(work);
    expect((await runLine(shell, 'x=WORK; $x extra')).stderr).toMatch(/^WORK /);
    expect((await runLine(shell, 'x=work; $x | cat')).recorded).toEqual([]);
    expect((await runLine(shell, 'f() { echo mine; }; x=f; $x')).stdout).toBe('mine\n');
    expect((await runLine(shell, "g() { x='echo hi'; $x; }; g")).stdout).toBe('hi\n');
  });

  test.each(['"help"', '\\help', 'h=help; $h', 'command help', 'builtin help', 'command HELP', "'he'lp"])('%s is the site’s help (T304)', async (line) => {
    const shell = shellFor('every-field');
    const { stdout } = await runLine(shell, 'help');
    expect((await runLine(shell, line)).stdout).toBe(stdout);
  });

  test('help on an unknown name says so, with bash’s status (T304)', async () => {
    expect(await runLine(shellFor('every-field'), 'help nope')).toMatchObject({ stderr: `${fill(siteText.terminal.replies.helpUnknown, { name: 'nope', help: 'help' })}\n`, status: 1 });
  });

  test('the directory stack and PIPESTATUS carry, and through a restarted worker (T305)', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'pushd /tmp');
    expect((await runLine(shell, 'dirs -l')).stdout).toBe('/tmp /home/guest\n');
    const restarted = shellFor('every-field');
    restarted.state = shell.state;
    expect((await runLine(restarted, 'popd')).stdout).toBe('~\n');
    expect((await runLine(restarted, 'pwd')).stdout).toBe('/home/guest\n');
    expect((await runLine(shell, 'false | true')).state.pipes).toEqual([1, 0]);
    expect((await runLine(shell, 'echo ${PIPESTATUS[@]}')).stdout).toBe('1 0\n');
  });
});

describe('006-terminal-FR-021: a line that fails inside the shell keeps the Terminal open', () => {
  test('a redirect the shell can’t check first shows its error, keeps the state and the files, and gives a new prompt', async () => {
    const shell = shellFor('every-field');
    await runLines(shell, ['touch keep', 'cd work', 'v=1']);
    const result = await runLine(shell, 'eval "echo x > about"');
    expect(result).toMatchObject({ stderr: 'bash: about: Permission denied\n', status: 1, end: 'done' });
    expect(result.state).toMatchObject({ cwd: shell.state.cwd, variables: { v: '1' }, status: 1 });
    expect(await runLine(shell, 'cd; ls keep; echo $v')).toMatchObject({ stdout: 'keep\n1\n', end: 'done' });
    expect(await runLine(shell, 'echo a; eval "seq 300000 > big"; echo b')).toMatchObject({ stdout: 'a\nb\n', stderr: 'bash: big: No space left on device\n', end: 'done' });
  });

  test('exit and set -e still end the shell', async () => {
    expect((await runLine(shellFor('every-field'), 'exit 3')).end).toBe('exited');
    expect(await runLine(shellFor('every-field'), 'set -e; false; echo not')).toMatchObject({ end: 'exited', stdout: '' });
    expect(await runLine(shellFor('every-field'), 'set -e; f=about; echo x > $f; echo not')).toMatchObject({ end: 'exited', stderr: 'bash: about: Permission denied\n', status: 1 });
  });
});

describe('006-terminal-FR-067 and 006-terminal-FR-021: a variable over 1 MB', () => {
  test('works as in bash, and unset clears it, in a restarted worker too', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'x=$(seq 200000)')).end).toBe('done');
    expect(new TextEncoder().encode(shell.state.variables.x!).length).toBeGreaterThan(1_000_000);
    expect((await runLine(shell, 'echo ${#x}')).stdout).toBe('1288894\n');
    const restarted = shellFor('every-field');
    expect((await runLine(restarted, 'echo ${x:0:1}; export -p | grep -c " x="', shell.state)).stdout).toBe('1\n0\n');
    expect(await runLine(shell, 'unset x')).toMatchObject({ stdout: '', stderr: '', end: 'done' });
    expect(shell.state.variables.x).toBeUndefined();
    expect((await runLine(shell, 'echo ok')).stdout).toBe('ok\n');
  });
});

describe('006-terminal-FR-067: a variable over 1 MB carries like any other', () => {
  test('later lines run, unset removes it, and the command limit stays the line’s own', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'x=$(seq 200000)');
    expect(await runLine(shell, 'echo ${#x}')).toMatchObject({ stdout: '1288894\n', end: 'done' });
    expect(await runLine(shell, 'unset x; echo ${#x}')).toMatchObject({ stdout: '0\n', end: 'done' });
    expect(shell.state.variables).not.toHaveProperty('x');
    await runLine(shell, 'y=$(seq 50000)');
    expect(await runLine(shell, 'for i in $(seq 15000); do :; done')).toMatchObject({ end: 'limit', limit: 'commands' });
  });
});

describe('006-terminal-FR-073: a redirect after cd in the same line writes where the line is', () => {
  test('from a protected folder, cd /tmp; echo x > f writes /tmp/f', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'cd work');
    expect(await runLine(shell, 'cd /tmp; echo x > f')).toMatchObject({ stderr: '', status: 0 });
    expect((await runLine(shell, 'cat /tmp/f')).stdout).toBe('x\n');
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

describe('006-terminal-FR-067: bash’s language', () => {
  const cases = LANGUAGE_CASES;

  test.each(cases)('%s', async (_, line, stdout) => {
    const result = await runLine(shellFor('every-field'), line);
    expect(result.stderr, line).toBe('');
    expect(result.end, line).toBe('done');
    if (stdout !== '') expect(result.stdout, line).toBe(stdout);
    else expect(Number(result.stdout.trim()), line).toBeGreaterThan(0);
  });

  test('a site command in a pipe, a redirect, a chain and a loop', async () => {
    const shell = shellFor('every-field');
    const work = (await runLine(shell, 'work')).stdout;
    const about = (await runLine(shell, 'about')).stdout;
    const skills = (await runLine(shell, 'skills')).stdout;
    expect((await runLine(shell, 'work | head -2')).stdout).toBe(`${work.split('\n').slice(0, 2).join('\n')}\n`);
    expect((await runLine(shell, 'skills > /tmp/s; cat /tmp/s')).stdout).toBe(skills);
    expect((await runLine(shell, 'false || about')).stdout).toBe(about);
    const count = (text: string) => `${text.split('\n').length - 1}`;
    expect((await runLine(shell, 'for c in about skills; do $c | wc -l; done')).stdout).toBe(`${count(about)}\n${count(skills)}\n`);
  });
});

describe('006-terminal-FR-057: any command can be piped into', () => {
  test('cat cv.json | jq, work | grep -i, ls | wc -l and help | head -3 pipe as bash does', async () => {
    const shell = shellFor('every-field');
    const work = (await runLine(shell, 'work')).stdout;
    const help = (await runLine(shell, 'help')).stdout;
    const cvJson = (await runLine(shell, 'cat cv.json')).stdout;
    expect((await runLine(shell, 'cat cv.json | jq')).stdout).toBe(cvJson);
    const word = work.split('\n')[0]!.split(' ')[0]!;
    expect((await runLine(shell, `work | grep -i ${word.toUpperCase()}`)).stdout).toBe(`${work.split('\n').filter((line) => line.toLowerCase().includes(word.toLowerCase())).join('\n')}\n`);
    const names = (await runLine(shell, 'ls')).stdout.split('\n').filter((name) => name !== '');
    expect((await runLine(shell, 'ls | wc -l')).stdout).toBe(`${names.length}\n`);
    expect((await runLine(shell, 'help | head -3')).stdout).toBe(`${help.split('\n').slice(0, 3).join('\n')}\n`);
  });

  test('ls | work runs work and ignores its input; ls | vim cv.json opens cv.json', async () => {
    const shell = shellFor('every-field');
    const work = await runLine(shell, 'work');
    expect((await runLine(shell, 'ls | work')).stdout).toBe(work.stdout);
    const vim = await runLine(shell, 'ls | vim cv.json');
    expect(vim.effects).toEqual([{ kind: 'vim', file: { name: 'cv.json', path: '/home/guest/cv.json', readonly: true, new: false }, pipe: null, text: (await runLine(shell, 'cat cv.json')).stdout.replace(/\n$/, ''), type: 'json' }]);
  });
});

describe('006-terminal-FR-022: no command reaches the network', () => {
  test.each(['curl x', 'wget x', 'python', 'node', 'ssh h'])('%s is command not found', async (line) => {
    const result = await runLine(shellFor('every-field'), line);
    expect(result.stderr).toBe(`bash: ${line.split(' ')[0]}: command not found\n`);
    expect(result.status).toBe(127);
  });
});

describe('006-terminal-FR-080, 006-terminal-FR-081 and 006-terminal-FR-073: a write from the vim view', () => {
  const write = (shell: ReturnType<typeof shellFor>, path: string, text: string, force = false, cwd = '/home/guest') => shell.write({ id: 9, path, text, force, cwd });

  test('creates a visitor’s file that cat prints and ls lists, then replaces it', async () => {
    const shell = shellFor('every-field');
    const created = await write(shell, 'todo', 'ship it\nnow\n');
    expect(created).toMatchObject({ id: 9, ok: true, path: '/home/guest/todo', created: true, lines: 2, bytes: 12 });
    expect(created.ok && created.files.files['/home/guest/todo']).toBe('ship it\nnow\n');
    expect((await runLine(shell, 'cat todo')).stdout).toBe('ship it\nnow\n');
    expect((await runLine(shell, 'ls')).stdout).toContain('todo');
    const replaced = await write(shell, 'todo', 'é\n', true);
    expect(replaced).toMatchObject({ ok: true, created: false, lines: 1, bytes: 3 });
    expect((await runLine(shell, 'cat todo')).stdout).toBe('é\n');
  });

  test('a path relative to cwd, ~/ and /tmp/ resolve', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'mkdir mine');
    expect(await write(shell, 'a', 'a\n', false, '/home/guest/mine')).toMatchObject({ ok: true, path: '/home/guest/mine/a' });
    expect(await write(shell, '~/b', 'b\n', false, '/home/guest/mine')).toMatchObject({ ok: true, path: '/home/guest/b' });
    expect(await write(shell, '/tmp/c', 'c\n')).toMatchObject({ ok: true, path: '/tmp/c' });
  });

  test('an existing file without force gives exists and stays; with force it is replaced', async () => {
    const shell = shellFor('every-field');
    await write(shell, 'todo', 'one\n');
    expect(await write(shell, 'todo', 'two\n')).toMatchObject({ ok: false, error: 'exists' });
    expect((await runLine(shell, 'cat todo')).stdout).toBe('one\n');
    expect(await write(shell, 'todo', 'two\n', true)).toMatchObject({ ok: true });
  });

  test('the open file under another name is the file itself: no exists, and readonly for a protected one without force', async () => {
    const shell = shellFor('every-field');
    await write(shell, 'todo', 'one\n');
    const own = await shell.write({ id: 9, path: './todo', text: 'two\n', force: false, cwd: '/home/guest', own: '/home/guest/todo' });
    expect(own).toMatchObject({ ok: true, own: true, path: '/home/guest/todo' });
    expect((await runLine(shell, 'cat todo')).stdout).toBe('two\n');
    expect(await shell.write({ id: 10, path: 'other', text: 'x\n', force: false, cwd: '/home/guest', own: '/home/guest/todo' })).not.toHaveProperty('own');
    expect(await shell.write({ id: 11, path: '~/about', text: 'x\n', force: false, cwd: '/home/guest', own: '/home/guest/about' })).toMatchObject({ ok: false, error: 'readonly' });
    expect(await shell.write({ id: 12, path: '~/about', text: 'x\n', force: true, cwd: '/home/guest', own: '/home/guest/about' })).toMatchObject({ ok: false, error: 'cant-open' });
  });

  test('a protected file, a folder and a path in a missing or protected folder give cant-open and change nothing', async () => {
    const shell = shellFor('every-field');
    const about = (await runLine(shell, 'cat about')).stdout;
    for (const [path, force] of [['about', false], ['about', true], ['work', true], ['nowhere/x', true], ['work/new', true], ['/new', true]] as const) expect(await write(shell, path, 'x\n', force), path).toMatchObject({ ok: false, error: 'cant-open' });
    expect((await runLine(shell, 'cat about')).stdout).toBe(about);
    expect((await runLine(shell, 'ls work/new')).status).not.toBe(0);
  });

  test('past QUOTA gives full and leaves the file as it was', async () => {
    const shell = shellFor('every-field');
    await write(shell, 'todo', 'kept\n');
    expect(await write(shell, 'todo', 'x'.repeat(QUOTA + 1), true)).toMatchObject({ ok: false, error: 'full' });
    expect((await runLine(shell, 'cat todo')).stdout).toBe('kept\n');
    expect(await write(shell, 'big', 'x'.repeat(QUOTA))).toMatchObject({ ok: false, error: 'full' });
  });

  test('the next line’s result doesn’t report the written files again, and the history doesn’t change', async () => {
    const shell = shellFor('every-field');
    await write(shell, 'todo', 'one\n');
    const result = await runLine(shell, 'history');
    expect(result.files).toBeUndefined();
    expect(result.stdout).not.toContain('todo');
  });
});

describe('006-terminal-FR-021 and 006-terminal-FR-069: a line that merely fails keeps the Terminal, its state and its files', () => {
  test.each(['f() { f; }; f', ':(){ :|:& };:'])('%s stops at the limit on commands, with no internal words', async (line) => {
    const shell = shellFor('every-field');
    await runLine(shell, 'touch keep');
    const result = await runLine(shell, line);
    expect(result).toMatchObject({ end: 'limit', limit: 'commands' });
    expect(result.stderr).not.toMatch(/maxCallDepth|recursion/);
    expect((await runLine(shell, 'ls keep')).stdout).toBe('keep\n');
  });

  test('a recursion that ends deeper than just-bash’s default depth runs, as in bash', async () => {
    const result = await runLine(shellFor('every-field'), 'f() { [ $1 -gt 0 ] && f $(($1-1)); return 0; }; f 500; echo done');
    expect(result).toMatchObject({ end: 'done', stdout: 'done\n' });
  });

  test('PATH= and export PATH=/x keep the Terminal open, and later lines go by that PATH, builtins included', async () => {
    for (const line of ['PATH=', 'export PATH=/x']) {
      const shell = shellFor('every-field');
      await runLine(shell, 'touch keep');
      expect(await runLine(shell, line)).toMatchObject({ end: 'done', stderr: '', status: 0 });
      expect(await runLine(shell, 'ls keep')).toMatchObject({ stderr: 'bash: ls: command not found\n', status: 127, end: 'done' });
      expect((await runLine(shell, 'echo x; pwd; printf y; true')).stdout).toBe('x\n/home/guest\ny');
      expect(await runLine(shell, 'PATH=/usr/bin:/bin; ls keep')).toMatchObject({ stdout: 'keep\n', end: 'done' });
    }
  });

  test.each([
    ['set -u; echo $nope; echo more', 'bash: nope: unbound variable\n'],
    ['echo ${nope:?boom}; echo more', 'bash: nope: boom\n'],
    ['echo ${nope:?}; echo more', 'bash: nope: parameter null or not set\n'],
    ['echo ${nope?}; echo more', 'bash: nope: parameter not set\n'],
    ['readonly q=1; q=2; echo more', 'bash: q: readonly variable\n'],
  ])('%s prints bash’s error, drops the rest of the line and keeps what ran', async (line, stderr) => {
    const shell = shellFor('every-field');
    await runLine(shell, 'touch keep');
    expect(await runLine(shell, `kept=1; ${line}`)).toMatchObject({ stdout: '', stderr, status: 1, end: 'done' });
    expect((await runLine(shell, 'set +u; echo "$kept $?"; ls keep')).stdout).toBe('1 0\nkeep\n');
  });

  test('exit and set -e with a failing command still close it', async () => {
    for (const line of ['exit', 'exit 3', 'echo a; exit', 'set -e; false; echo more']) expect((await runLine(shellFor('every-field'), line)).end, line).toBe('exited');
  });
});

describe('006-terminal-FR-008 and 006-terminal-FR-045: cd across lines', () => {
  test('cd - goes back and prints the folder, and $OLDPWD holds it, in a restarted worker too', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'cd work');
    const { state } = shell;
    expect(await runLine(shell, 'cd -')).toMatchObject({ stdout: '/home/guest\n', stderr: '', status: 0 });
    expect((await runLine(shell, 'echo $OLDPWD; pwd')).stdout).toBe('/home/guest/work\n/home/guest\n');
    expect(await runLine(shellFor('every-field'), 'cd -', state)).toMatchObject({ stdout: '/home/guest\n', status: 0 });
  });

  test('a first cd - says OLDPWD not set; OLDPWD=/tmp; cd - goes to /tmp', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'cd -')).toMatchObject({ stderr: 'bash: cd: OLDPWD not set\n', status: 1 });
    expect((await runLine(shell, 'OLDPWD=/tmp; cd -; pwd')).stdout).toBe('/tmp\n/tmp\n');
  });

  test('cd a b says too many arguments; cd .. leaves a folder that has gone', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'cd a b')).toMatchObject({ stderr: 'bash: cd: too many arguments\n', status: 2 });
    await runLine(shell, 'mkdir d; cd d; rm -r ../d');
    expect((await runLine(shell, 'pwd')).stdout).toBe('/home/guest/d\n');
    expect(await runLine(shell, 'cd ..; pwd')).toMatchObject({ stdout: '/home/guest\n', stderr: '' });
  });

  test('cd’s words are expanded once, in a subshell it stays there, and its status is $?', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'i=0; cd /$((i++))tmp 2>/dev/null; echo $i; (cd /tmp; pwd); pwd; cd /nope 2>/dev/null; echo $?; false; cd /; echo $?')).stdout).toBe('1\n/tmp\n/home/guest\n1\n0\n');
    expect((await runLine(shell, 'declare -p | grep -c _cv_a')).stdout).toBe('0\n');
  });
});

describe('006-terminal-FR-067: the rest of the shell’s variables and settings last until the Terminal closes', () => {
  test.each([
    ['a=(1 2 3)', 'echo ${a[1]} ${#a[@]}', '2 3\n'],
    ['declare -A m=([k]="v w")', 'echo ${m[k]}', 'v w\n'],
    ['HOME=/tmp', 'echo $HOME; cd; pwd', '/tmp\n/tmp\n'],
    ['USER=me', 'echo $USER', 'me\n'],
    ['IFS=,', 'x=a,b; for w in $x; do echo $w; done', 'a\nb\n'],
    ['unset HOME', 'echo "[$HOME]"', '[]\n'],
    ['declare -i n=1', 'n=1+1; echo $n', '2\n'],
    ['declare -u up=a', 'up=abc; echo $up', 'ABC\n'],
    ['set -- a "b c" d', 'echo $# "$2"; shift; echo $1', '3 b c\nb c\n'],
    ['shopt -s nullglob', 'echo nope*; shopt nullglob', '\nnullglob            \ton\n'],
    ['set -a', 'x=1; env | grep -c "^x=1$"', '1\n'],
  ])('%s, then %s', async (first, second, stdout) => {
    const shell = shellFor('every-field');
    await runLine(shell, first);
    const { state } = shell;
    expect((await runLine(shell, second)).stdout).toBe(stdout);
    // From the same state in a restarted worker.
    expect((await runLine(shellFor('every-field'), second, state)).stdout).toBe(stdout);
  });

  test('readonly r=1 stays readonly, on later lines too', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'readonly r=1');
    expect(await runLine(shell, 'r=2; echo more')).toMatchObject({ stdout: '', stderr: 'bash: r: readonly variable\n', status: 1, end: 'done' });
    expect((await runLine(shell, 'echo $r')).stdout).toBe('1\n');
  });

  test('the prompt’s folder is still /home/guest whatever HOME holds', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'HOME=/tmp');
    expect(shell.state.cwd).toBe('/home/guest');
  });

  test('a variable over 1 MB doesn’t count the checkpoint as the line’s output', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'x=$(seq 300000); declare -i n=1');
    expect(await runLine(shell, 'echo ok; echo ${#x}')).toMatchObject({ stdout: 'ok\n1988894\n', end: 'done' });
  });
});

describe('006-terminal-FR-067: the functions a line really defined', () => {
  test('eval and source define functions that last; the definition that ran wins', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'eval "f() { echo from-eval; }"');
    expect((await runLine(shell, 'f')).stdout).toBe('from-eval\n');
    await runLine(shell, 'echo "k() { echo sourced; }" > lib; source lib');
    expect((await runLine(shell, 'k')).stdout).toBe('sourced\n');
    await runLine(shell, 'text="g() { echo $(echo made); }"; eval "$text"');
    expect((await runLine(shell, 'g')).stdout).toBe('made\n');
    await runLine(shell, 'h() { echo 1; }; if false; then h() { echo 2; }; fi');
    expect((await runLine(shell, 'h')).stdout).toBe('1\n');
    await runLine(shell, 'if true; then h() { echo 3; }; fi');
    expect((await runLine(shell, 'h')).stdout).toBe('3\n');
  });

  test('eval sees $? as it was, and its words are expanded once', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, `false; eval 'echo $?'; i=0; eval "echo $((i++))"; echo $i; eval "exit_status=$?"; echo $exit_status`)).stdout).toBe('1\n0\n1\n0\n');
  });

  test('type prints a function as typed, without the adapter’s words', async () => {
    const shell = shellFor('every-field');
    const { stdout } = await runLine(shell, 'g() { cd /tmp; eval true; cd --help; }; type g');
    expect(stdout).not.toMatch(/__cv|\/usr\/bin/);
    expect(stdout).toContain('cd /tmp');
    expect(stdout).toContain('eval true');
    expect(stdout).toContain('cd --help');
  });
});

describe('006-terminal-FR-067: the adapter’s script stays apart from the visitor’s line', () => {
  test('a trailing backslash ends with the line', async () => {
    expect((await runLine(shellFor('every-field'), 'echo a \\')).stdout).toBe('a \\\n');
  });

  test.each([':', 'set', 'export', 'declare', 'shopt', 'unset'])('the visitor’s %s doesn’t run in the prelude or the checkpoint', async (name) => {
    const shell = shellFor('every-field');
    await runLines(shell, ['export E=1', 'set -o pipefail', 'shopt -s nullglob', `${name}() { echo mine; }`]);
    const result = await runLine(shell, 'echo after');
    expect(result).toMatchObject({ stdout: 'after\n', stderr: '', end: 'done' });
    expect(Object.keys(shell.state.functions)).toEqual([name]);
    expect(shell.state.options).toContain('pipefail');
  });

  test('$LINENO is the visitor’s line, in a function too, whatever the prelude holds', async () => {
    const shell = shellFor('every-field');
    await runLines(shell, ['A=1', 'g() { :; }', 'set -o pipefail']);
    expect((await runLine(shell, 'echo $LINENO; f() { echo $LINENO; }; f')).stdout).toBe('1\n1\n');
    expect((await runLine(shell, 'f')).stdout).toBe('1\n');
  });

  test('set -x shows the visitor’s commands only', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'set -x; cd /tmp; eval true; echo hi');
    expect((await runLine(shell, 'echo there')).stderr).toBe('+ echo there\n');
    expect((await runLine(shell, 'cd /; eval true')).stderr).toBe('+ cd /\n+ eval true\n+ true\n');
  });

  test('PIPESTATUS and $_ reach the next statement', async () => {
    expect((await runLine(shellFor('every-field'), 'false | true; echo ${PIPESTATUS[0]} ${PIPESTATUS[1]}; echo a b; echo $_')).stdout).toBe('1 0\na b\nb\n');
  });
});

describe('006-terminal-FR-067 and 006-terminal-FR-068: failures worded as bash words them', () => {
  test.each(['a=(', 'true &&', 'foo()'])('%s is an unfinished line', async (line) => {
    expect(await runLine(shellFor('every-field'), line)).toMatchObject({ stderr: 'bash: line 1: syntax error: unexpected end of file\n', status: 2, end: 'syntax' });
  });

  test.each([['for i in 1', 'for'], ['f() {', '{'], ['(', '('], ['case x in', 'case'], ['if true; then', 'if'], ['while true; do', 'while'], ['until true; do', 'until'], ['if', 'if'], ['if a; then while b', 'while'], ['echo if; while', 'while'], ['select x', 'select']])('%s names what it leaves open, as bash 5.3 (T324)', async (line, word) => {
    expect(await runLine(shellFor('every-field'), line)).toMatchObject({ stderr: `bash: line 1: syntax error: unexpected end of file from \`${word}' command on line 1\n`, status: 2, end: 'syntax' });
  });

  test.each(['echo >', 'echo a 2>', 'cat <', '<<<', '>&', '&>', 'cat <<', 'function', 'for', 'case', 'select', 'coproc'])('%s is unexpected at its end, in bash’s words (T324)', async (line) => {
    expect(await runLine(shellFor('every-field'), line)).toMatchObject({ stderr: "bash: line 1: syntax error near unexpected token `newline'\n", status: 2, end: 'syntax' });
  });

  test('an unfinished [[, $(( and a stray ; in bash’s words (T323, T324)', async () => {
    for (const [line, stderr] of [
      ['[[', "bash: line 1: unexpected token `EOF' in conditional command\nbash: line 1: syntax error: unexpected end of file from `[[' command on line 1\n"],
      ['[[ a', "bash: line 1: unexpected token `newline', conditional binary operator expected\nbash: line 1: syntax error near `a'\n"],
      ['[[ a ==', "bash: line 1: unexpected argument `newline' to conditional binary operator\nbash: line 1: syntax error near `=='\n"],
      ['[[ -f', "bash: line 1: unexpected argument `newline' to conditional unary operator\nbash: line 1: syntax error near `-f'\n"],
      ['$((', "bash: line 1: unexpected EOF while looking for matching `)'\n"],
      ['echo $((', "bash: line 1: unexpected EOF while looking for matching `)'\n"],
      ['echo a; ;', "bash: line 1: syntax error near unexpected token `;'\n"],
    ] as const) {
      expect(await runLine(shellFor('every-field'), line), line).toMatchObject({ stdout: '', stderr, status: 2, end: 'syntax' });
    }
    expect((await runLine(shellFor('every-field'), "echo '$((' 'a; ;'")).stdout).toBe('$(( a; ;\n');
  });

  test('echo ${ names line 1 and bash’s quotes; a closing word that is there is still unexpected', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'echo ${')).stderr).toBe("bash: line 1: unexpected EOF while looking for matching `}'\n");
    expect((await runLine(shell, 'fi')).stderr).toBe("bash: line 1: syntax error near unexpected token `fi'\n");
  });

  test('eval of an unfinished line says so, with status 2', async () => {
    expect((await runLine(shellFor('every-field'), 'eval "if"; echo $?'))).toMatchObject({ stdout: '2\n', stderr: 'bash: eval: line 1: syntax error: unexpected end of file\n' });
  });

  test('an unterminated here-document warns, runs with no input and gives status 0', async () => {
    expect(await runLine(shellFor('every-field'), 'cat <<EOF; echo $?')).toMatchObject({ stdout: '0\n', stderr: "bash: warning: here-document at line 1 delimited by end-of-file (wanted `EOF')\n", end: 'done' });
  });

  test.each([
    ['echo $((1/0)); echo after', 'bash: 1/0: division by 0 (error token is "0")\n'],
    ['x=0; echo $((1%x)); echo after', 'bash: 1%x: division by 0 (error token is "x")\n'],
    ['echo $((2+)); echo after', 'bash: 2+: arithmetic syntax error: operand expected (error token is "+")\n'],
  ])('%s says why and drops the rest of the line', async (line, stderr) => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, line)).toMatchObject({ stdout: '', stderr, status: 1, end: 'done' });
    expect((await runLine(shell, 'echo $?')).stdout).toBe('1\n');
  });

  // T342.
  test.each([
    ['echo a &; echo b', ';'],
    ['echo a && ;', ';'],
    ['echo a |;', ';'],
    ['(;', ';'],
    ['{ echo a; ;', ';'],
    ['if;', ';'],
    ['case x in;', ';'],
    ['f() ;', ';'],
    ['for x in a; echo $?', 'echo'],
  ])('%s names %s, as bash 5.3', async (line, token) => {
    const result = await runLine(shellFor('every-field'), line);
    expect(result.stderr).toBe(`bash: line 1: syntax error near unexpected token \`${token}'\n`);
    expect(result.status).toBe(2);
  });

  test.each([
    ['[[ ;', "unexpected token `;' in conditional command", ';'],
    ['[[ a;', "unexpected token `;', conditional binary operator expected", ';'],
    ['[[ a == ;', "unexpected argument `;' to conditional binary operator", ';'],
    ['[[ a -eq ]]', "unexpected argument `]]' to conditional binary operator", ']]'],
  ])('%s names what’s there', async (line, words, near) => {
    expect((await runLine(shellFor('every-field'), line)).stderr).toBe(`bash: line 1: ${words}\nbash: line 1: syntax error near \`${near}'\n`);
  });

  test('an open ${ is the end of the input, not a bad substitution', async () => {
    expect((await runLine(shellFor('every-field'), 'echo ${a; echo $?')).stderr).toBe("bash: line 1: unexpected EOF while looking for matching `}'\n");
  });

  // T343.
  test('exec with a command prints its output, closes the Terminal with its status, and runs nothing after it', async () => {
    const result = await runLine(shellFor('every-field'), 'exec echo a; echo after');
    expect(result).toMatchObject({ stdout: 'a\n', end: 'exited', status: 0 });
    const failed = await runLine(shellFor('every-field'), 'exec false; echo after');
    expect(failed).toMatchObject({ stdout: '', end: 'exited', status: 1 });
  });

  test('exec of what can’t be found keeps going, and exec with only redirects stays as it was', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'exec nope; echo $?')).toMatchObject({ stdout: '127\n', stderr: 'bash: exec: nope: not found\n', end: 'done' });
    expect(await runLine(shell, 'exec cd /; echo $?')).toMatchObject({ stdout: '127\n', stderr: 'bash: exec: cd: not found\n', end: 'done' });
    expect(await runLine(shell, 'exec 3>&1; echo shown')).toMatchObject({ stdout: 'shown\n', end: 'done' });
  });

  test('exec in a subshell or a pipe ends that alone', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, '(exec echo a; echo b); echo after')).toMatchObject({ stdout: 'a\nafter\n', end: 'done' });
    expect(await runLine(shell, 'exec echo a | cat; echo after')).toMatchObject({ stdout: 'a\nafter\n', end: 'done' });
  });

  test('a function holding exec shows as typed', async () => {
    expect((await runLine(shellFor('every-field'), 'f() { exec echo a; }; type f')).stdout).toContain('exec echo a');
  });

  // T344.
  test('extglob on an earlier line gives its patterns, and off they are syntax errors outside [[ ]]', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, 'echo @(about|skills)')).stderr).toBe("bash: line 1: syntax error near unexpected token `('\n");
    expect((await runLine(shell, 'ls @(about|skills)')).stderr).toBe("bash: line 1: syntax error near unexpected token `('\n");
    expect((await runLine(shell, 'case a in @(a|b)) echo y;; esac')).stderr).toBe("bash: line 1: syntax error near unexpected token `('\n");
    expect((await runLine(shell, '[[ a == @(a|b) ]]; echo $?')).stdout).toBe('0\n');
    expect((await runLine(shell, 'x=a; echo ${x/@(a|b)/z}')).stdout).toBe('a\n');
    await runLine(shell, 'shopt -s extglob');
    expect((await runLine(shell, 'echo @(about|skills)')).stdout).toBe('about skills\n');
    expect((await runLine(shell, 'echo +(a)bout ?(x)about *(z)about')).stdout).toBe('about about about\n');
    expect((await runLine(shell, 'case a in @(a|b)) echo y;; esac')).stdout).toBe('y\n');
    expect((await runLine(shell, 'x=a; echo ${x/@(a|b)/z}')).stdout).toBe('z\n');
  });

  test.each(['echo !(about)', 'echo a!(x)', '[[ a == !(b) ]]'])('%s says just-bash can’t do it, in no JavaScript words (research G31)', async (line) => {
    const shell = shellFor('every-field');
    await runLine(shell, 'shopt -s extglob');
    const result = await runLine(shell, line);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^bash: .*!\(.*\): negated patterns aren't supported\n$/);
    expect(result.status).toBe(1);
  });

  // T337.
  test('? and the positional parameters are no variables in the lists', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'set -- a b');
    for (const line of ['declare', 'declare -p', 'env', 'declare -x', 'export -p']) expect((await runLine(shell, line)).stdout).not.toMatch(/^(?:declare -\S+ )?(?:\?|#|@|\*|\d+)=/m);
    expect((await runLine(shell, 'declare -x')).stdout).toMatch(/^declare -x HOME="\/home\/guest"$/m);
  });

  test('export of an unset name carries, unset and exported, to later lines', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'export d');
    expect((await runLine(shell, 'echo "[${d+set}]"; declare -p d')).stdout).toBe('[]\ndeclare -x d\n');
    expect((await runLine(shell, 'export -p')).stdout).toMatch(/^declare -x d$/m);
    expect((await runLine(shell, 'env')).stdout).not.toMatch(/^d=/m);
    expect((await runLine(shell, 'd=1; env')).stdout).toMatch(/^d=1$/m);
  });

  test('unset ends an export with no value', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'export d; unset d');
    expect((await runLine(shell, 'export -p')).stdout).not.toMatch(/^declare -x d$/m);
  });

  // T341, T345.
  test('with failglob, a word that matches nothing stops the line where it stood and the Terminal stays', async () => {
    const shell = shellFor('every-field');
    const result = await runLine(shell, 'shopt -s failglob; echo a; echo zzz*; echo b');
    expect(result).toMatchObject({ stdout: 'a\n', stderr: 'bash: no match: zzz*\n', status: 1, end: 'done' });
    expect((await runLine(shell, 'echo abo*; echo after')).stdout).toBe('about\nafter\n');
  });

  // T336: what `type` prints of a function is what was typed, whatever runs.
  test.each(['export d', 'export -p', 'declare -p x', 'declare', 'shopt dotglob', 'shopt', 'set -o', 'set -z', '[ a b ]', 'type ls', 'command -v ls', 'exec ls', 'echo $BASH_SUBSHELL'])('type f shows %s as typed', async (body) => {
    const shell = shellFor('every-field');
    const shown = (await runLine(shell, `f() { ${body}; }; type f`)).stdout;
    expect(shown).toBe(`f is a function\nf () \n{ \n    ${body}\n}\n`);
    expect((await runLine(shell, 'declare -f f')).stdout).toBe(`f () \n{ \n    ${body}\n}\n`);
  });

  test('a function still runs its rewritten commands after type printed it', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'f() { export d; declare -p d; }; type f');
    expect((await runLine(shell, 'f')).stdout).toBe('declare -x d\n');
  });
});

describe('006-terminal-FR-067: Phase 40, lines that write or close, each as bash 5.3 gave it', () => {
  const run = async (...lines: string[]) => {
    const shell = shellFor('every-field');
    const results = await runLines(shell, lines);
    return results.at(-1)!;
  };

  test.each([
    ['echo a > f; cat < f > f; wc -c f', '0 f\n'],
    ['echo a > f; sort < f > f; wc -c f', '0 f\n'],
    ['echo a > f; sort f > f; wc -c f', '0 f\n'],
    ['echo a > f; cat ./f > f; wc -c f', '0 f\n'],
    ['echo a > f; tee f < f | wc -c', '0\n'],
    ['echo a > f; tee g < f | wc -c; cat g', '2\na\n'],
    ['cat < nope > n2; echo $?; test -e n2; echo $?', '1\n1\n'],
  ])('T355: %s', async (line, stdout) => {
    expect((await run(line)).stdout).toBe(stdout);
  });

  test.each([
    ['echo a > f; cat f >> f; echo $?; cat f', '1\na\n', 'cat: f: input file is output file\n'],
    ['echo a > f; cat < f >> f; echo $?; cat f', '1\na\n', 'cat: -: input file is output file\n'],
    ['echo a > f; cat f - >> f <<< b; echo $?; cat f', '1\na\nb\n', 'cat: f: input file is output file\n'],
    ['echo a > f; grep a f >> f; echo $?; cat f', '2\na\n', 'grep: f: input file is also the output\n'],
    ['echo a > f; grep a < f >> f; echo $?; cat f', '2\na\n', 'grep: (standard input): input file is also the output\n'],
    ['echo a > f; grep a f > f; echo $?; wc -c f', '2\n0 f\n', 'grep: f: input file is also the output\n'],
    ['echo a > f; echo b > g; grep . f g >> f; echo $?; cat f', '2\na\ng:b\n', 'grep: f: input file is also the output\n'],
    ['echo a > f; grep -c a f >> f; echo $?; cat f', '0\na\n1\n', ''],
    ['echo a > f; grep -q a f >> f; echo $?; cat f', '0\na\n', ''],
  ])('T355: %s', async (line, stdout, stderr) => {
    expect(await run(line)).toMatchObject({ stdout, stderr });
  });

  test('T354: `uniq` writes a file byte for byte', async () => {
    expect((await run('uniq about o; diff o about; echo $?; wc -c o')).stdout).toBe(`0\n${(await run('wc -c < about')).stdout.trim()} o\n`);
  });

  test('T357: a word that is no number fails alone and the Terminal stays open', async () => {
    const result = await run('x=1; exit nope; echo after $?');
    expect(result).toMatchObject({ stdout: 'after 2\n', stderr: 'bash: exit: nope: numeric argument required\n', end: 'done' });
  });

  test('T357: too many words end the line and the Terminal stays open', async () => {
    const shell = shellFor('every-field');
    const [first, second] = await runLines(shell, ['x=1; exit 1 2; echo not', 'echo $x $?']);
    expect(first).toMatchObject({ stdout: '', stderr: 'bash: exit: too many arguments\n', status: 1, end: 'done' });
    expect(second!.stdout).toBe('1 1\n');
  });

  test.each(['exit 3', 'exit', 'exit -- 3', 'x=3; exit $x', 'f() { exit 4; }; f', 'builtin exit 2'])('T357: %s still closes the Terminal', async (line) => {
    expect((await run(line)).end).toBe('exited');
  });

  test('T357: a variable that is no number is refused when it runs, and `exit` in a subshell says so too', async () => {
    expect(await run('x=nope; exit $x; echo after')).toMatchObject({ stdout: 'after\n', end: 'done' });
    expect(await run('(exit 1 2; echo sub); echo $?')).toMatchObject({ stdout: '1\n', stderr: 'bash: exit: too many arguments\n', end: 'done' });
  });

  test('T360: `mkdir -pv` and `cp -rv` name each thing, `cp -n` of a file on itself says nothing', async () => {
    expect((await run('mkdir -pv x/y/z')).stdout).toBe("mkdir: created directory 'x'\nmkdir: created directory 'x/y'\nmkdir: created directory 'x/y/z'\n");
    expect((await run('mkdir -p a; mkdir -pv a')).stdout).toBe('');
    expect((await run('cp -rv work w')).stdout).toMatch(/^'work' -> 'w'\n(?:'work\/(\S+)' -> 'w\/\1'\n)+$/);
    expect(await run('echo a > f; cp -n f f; echo $?')).toMatchObject({ stdout: '0\n', stderr: '' });
  });

  test('T361: `type` of a function keeps the word its body reads', async () => {
    const shell = shellFor('every-field');
    const [, called] = await runLines(shell, ['f() { echo "$x""y"; }', 'x=a; f']);
    expect(called!.stdout).toBe('ay\n');
  });

  test('T368: an arithmetic error stops only the line, and what ran stays', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'echo a; n=1; echo $((1.5)); echo b')).toMatchObject({ stdout: 'a\n', stderr: 'bash: 1.5: arithmetic syntax error: invalid arithmetic operator (error token is ".5")\n', status: 1, end: 'done' });
    expect((await runLine(shell, 'echo $n $?')).stdout).toBe('1 1\n');
    expect(await runLine(shell, '[[ ]]')).toMatchObject({ stderr: "bash: line 1: syntax error near `]]'\n", status: 2 });
  });

  test('T372: `history -d` deletes an entry, `-w` writes the visitor’s own file', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'echo one');
    expect((await runLine(shell, 'history -d 1')).effects).toEqual([{ kind: 'delete-history', index: 0 }]);
    expect((await runLine(shell, 'history -d -1')).effects).toEqual([{ kind: 'delete-history', index: 2 }]);
    expect(await runLine(shell, 'history -d 99')).toMatchObject({ stderr: 'bash: history: 99: history position out of range\n', status: 1, effects: [] });
    expect(await runLine(shell, 'history -d x')).toMatchObject({ stderr: 'bash: history: x: invalid number\n', status: 1 });
    expect(await runLine(shell, 'history a')).toMatchObject({ stderr: 'bash: history: a: numeric argument required\n', status: 2 });
    expect(await runLine(shell, 'history 1 2')).toMatchObject({ stderr: 'bash: history: too many arguments\n', status: 1 });
    await runLine(shell, 'history -w');
    expect((await runLine(shell, 'head -1 ~/.bash_history')).stdout).toBe('echo one\n');
    expect(await runLine(shell, 'history -w about')).toMatchObject({ stderr: 'bash: history: about: cannot create: Permission denied\n', status: 1 });
  });

  test('T375: `SECONDS` and two slashes carry to the next line', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'SECONDS=100');
    expect(Number((await runLine(shell, 'echo $SECONDS')).stdout)).toBeGreaterThanOrEqual(100);
    await runLine(shell, 'cd //tmp');
    expect((await runLine(shell, 'pwd')).stdout).toBe('//tmp\n');
    await runLine(shell, 'cd /tmp');
    expect((await runLine(shell, 'pwd')).stdout).toBe('/tmp\n');
  });

  test('T360: `set -u` names a positional parameter as bash does', async () => {
    expect((await run('set -u; echo $1')).stderr).toBe('bash: $1: unbound variable\n');
  });

  test('T349: `sort -o` writes the file, in the same order', async () => {
    expect((await run("printf 'b\\nB\\n_\\n' | sort -o s; cat s")).stdout).toBe('B\n_\nb\n');
  });

  test('T346: `f();` is still a syntax error', async () => {
    expect(await run('f();')).toMatchObject({ status: 2, end: 'syntax' });
  });
});

describe('006-terminal-FR-073: what `rm -r` refuses by the name alone (T377)', () => {
  test.each([
    ['rm -r .', "rm: refusing to remove '.' or '..' directory: skipping '.'\n"],
    ['rm -rf .', "rm: refusing to remove '.' or '..' directory: skipping '.'\n"],
    ['rm -r ./', "rm: refusing to remove '.' or '..' directory: skipping './'\n"],
    ['cd work; rm -r ..', "rm: refusing to remove '.' or '..' directory: skipping '..'\n"],
    ['mkdir d; rm -r d/.', "rm: refusing to remove '.' or '..' directory: skipping 'd/.'\n"],
    ['mkdir d; rm -r d/..', "rm: refusing to remove '.' or '..' directory: skipping 'd/..'\n"],
  ])('%s removes nothing', async (line, stderr) => {
    const shell = shellFor('every-field');
    await runLine(shell, 'touch v');
    expect(await runLine(shell, line)).toMatchObject({ stderr, status: 1 });
    expect((await runLine(shell, 'cd ~; ls v')).status).toBe(0);
  });

  test('then on to the next operand', async () => {
    const shell = shellFor('every-field');
    const result = await runLine(shell, 'touch v w; rm -r . v; ls v; ls w');
    expect(result.stderr).toContain("rm: refusing to remove '.' or '..' directory: skipping '.'\n");
    expect(result.stdout).toBe('w\n');
  });
});

describe('006-terminal-FR-067: what parity can’t compare on any machine (T392, T397)', () => {
  test.each([
    ['compgen -c ca', 'case\ncat\n', 0],
    ['compgen -k | head -2', 'if\nthen\n', 0],
    ['compgen -b | head -2', '.\n:\n', 0],
    ['compgen -u', 'guest\n', 0],
    ['compgen -c nothing-here', '', 1],
    ['echo $BASH_VERSION', '5.3.0(1)-release\n', 0],
    ['echo ${BASH_VERSINFO[0]}.${BASH_VERSINFO[1]}', '5.3\n', 0],
    ['echo $BASH', '/bin/bash\n', 0],
    ['echo $TERM', 'xterm-256color\n', 0],
    ['env | grep -c -E ^BASH=', '0\n', 1],
  ])('%s', async (line, stdout, status) => {
    expect(await runLine(shellFor('every-field'), line)).toMatchObject({ stdout, status });
  });
});
