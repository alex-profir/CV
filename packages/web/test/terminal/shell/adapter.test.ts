// The shell adapter (006 research R27): one line at a time, with the state
// carried from line to line, syntax checked first, the site's command words
// matched in any case, `exit` detected, and reset and restore.
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
    expect((await runLine(shell, 'env | grep -c CV_; set -x; WORK; true')).stderr).not.toMatch(/__cv_/i);
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

  test('a line naming __cv_state or __cv_wrote is command not found', async () => {
    const shell = shellFor('every-field');
    for (const line of ['__cv_state 0', 'echo x; __cv_wrote 0', 'echo __CV_STATE']) {
      const result = await runLine(shell, line);
      expect(result.stderr, line).toMatch(/^bash: \S*__cv_\S*: command not found\n$/i);
      expect(result.status, line).toBe(127);
      expect(result.stdout, line).toBe('');
    }
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
    ['shopt -s nullglob', 'echo nope*; shopt nullglob', '\nnullglob\t\ton\n'],
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
    expect(stdout).not.toMatch(/__cv_|\/usr\/bin/);
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
  test.each(['for i in 1', 'f() {', '(', 'case x in', 'if true; then', 'while true; do', 'until true; do', 'if', 'a=(', 'true &&', 'foo()'])('%s is an unfinished line', async (line) => {
    expect(await runLine(shellFor('every-field'), line)).toMatchObject({ stderr: 'bash: line 1: syntax error: unexpected end of file\n', status: 2, end: 'syntax' });
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
});
