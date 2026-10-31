// Parity with bash (006 SC-014, research R38): the Terminal's file system
// for the real CV, written to a temporary folder, and the same command
// lines run in the shell adapter and in real bash with GNU tools, from that
// folder as HOME. Each line's stdout, stderr and status must be the same,
// with bash's `bash: line N: ` prefix read as the shell's `bash: `.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import type { FsNode } from '../../../src/apps/terminal/engine/files.ts';
import { fileText } from '../../../src/apps/terminal/shell/fs.ts';
import { runLine, shellFor, treeFor } from './context.ts';

const INSTALL = 'brew install bash coreutils grep gnu-sed gawk findutils diffutils, then put bash and each gnubin folder first on PATH';

// Whether bash and grep on PATH are GNU's, and bash at least 5.
function gnuMissing(): string | null {
  const bash = spawnSync('bash', ['--version'], { encoding: 'utf8' });
  const grep = spawnSync('grep', ['--version'], { encoding: 'utf8' });
  if (!/^GNU bash, version [5-9]/.test(bash.stdout ?? '')) return `bash on PATH is not GNU bash 5 (${(bash.stdout ?? '').split('\n')[0] || 'not found'})`;
  if (!/GNU grep/.test(grep.stdout ?? '')) return 'grep on PATH is not GNU grep';
  return null;
}

// Fails a case, saying what to install, when the tools aren't GNU's.
function requireGnu() {
  const missing = gnuMissing();
  if (missing !== null) throw new Error(`the bash parity test needs bash 5 and the GNU tools: ${missing}. On macOS: ${INSTALL}.`);
}

// The lines, each covering a feature of FR-067 or a command of FR-068. None
// depends on stdout and stderr interleaving (G3), on jq's errors (G12), on
// a protected file's owner or mode (FR-049), or on capitals in a name
// (FR-045). `ls` and `grep -r` list in their own orders, so a listing is
// counted or sorted.
const LINES: readonly string[] = [
  'grep -ril rest ~/work | sort',
  // A refused redirect fails its command alone (research G1), however its
  // target is written.
  'echo before; f=about; echo x > $f; echo $?; echo after',
  'cd work; echo before; echo x > y; echo $?; echo after',
  'for f in about skills; do echo x > "$f"; echo next; done; echo after',
  'f() { echo x > "$1"; echo $?; }; f about; echo after',
  'echo before; echo x > $(echo about); echo $?; echo after',
  'for i in 1; do echo x; done > about; echo $?',
  'echo x > nope/y; echo $?',
  'echo x > about/y; echo $?',
  'echo x > work; echo $?',
  'ls | wc -l',
  'cat about | tr a-z A-Z | head -3',
  'for f in ~/work/*; do wc -l < "$f"; done',
  'sed -n 2p skills',
  "awk '{print $1}' languages",
  "find ~ -name '*.json'",
  'X=1; f() { echo $((X+1)); }; f',
  'diff about contact',
  'echo a; echo b',
  'true && echo yes || echo no; false || echo again',
  `echo 'single $HOME' "double $USER"`,
  'echo a\\ b \\$HOME',
  'V=x; echo ${V}y ${NOPE:-default}',
  "export E=1; env | grep '^E='",
  'false; echo $?',
  'echo ~/w* ~/s?ills ~/[a]bout',
  'echo one > notes; echo two >> notes; cat notes; rm notes',
  'cat nowhere 2> errors; cat errors; rm errors',
  'cat nowhere 2>&1 | wc -l',
  'tr a-z A-Z < about | head -1',
  'if [ -d work ]; then echo folder; else echo file; fi',
  'for n in 1 2 3; do echo "n$n"; done',
  'i=0; while [ $i -lt 3 ]; do i=$((i+1)); done; echo $i',
  'i=0; until [ $i -ge 3 ]; do i=$((i+1)); done; echo $i',
  "printf '%s-%d\\n' a 1 b 2",
  'head -2 about; tail -1 about',
  'sort languages | uniq | wc -l',
  'cut -c1-5 about | head -2',
  'cp about copy; mv copy moved; head -1 moved; rm moved',
  'mkdir made; touch made/x; ls made; rm -r made',
  'echo x | tee kept; cat kept; rm kept',
  'ls | xargs echo | wc -w',
  'seq 3; seq 2 2 6',
  'basename ~/work/x.txt .txt; dirname /a/b/c',
  'yes | head -2',
  'echo "$SHELL $USER $LOGNAME"',
  'which ls > /dev/null; echo $?',
  'date -u -d @0 +%Y',
  'grep -c . about; wc -w < skills',
  'cat nowhere; echo "status $?"',
  'cd work; pwd; cd ..; pwd',
  // Carried line to line in the shell; on one line here, as bash -c runs one.
  'cd work; cd -; echo $OLDPWD',
  'cd a b; echo $?',
  'mkdir d; cd d; rm -r ../d; pwd | wc -l; cd ..; echo $?',
  'a=(1 2 3); echo ${a[1]} ${#a[@]}',
  'set -- a b c; echo $#; shift; echo $1',
  'declare -i n=1; n=1+1; echo $n',
  'shopt -s nullglob; echo nope*',
  'HOME=/tmp; cd; pwd; echo $HOME',
  'echo $LINENO; f() { echo $LINENO; }; f',
  'echo $((1/0)); echo after',
  'readonly q=1; q=2; echo after',
  'cat <<EOF',
  // A command name from an expansion (T297).
  "x='echo hi'; $x; echo $?",
  'x="wc -l"; $x languages',
  'x="grep -c a"; echo a | $x',
  "c='cat languages'; $c | wc -l",
  "IFS=:; x='echo:a:b'; $x",
  "x='echo *'; $x | wc -w",
  'x=; $x; echo $?',
  "x='a b'; \"$x\"; echo $?",
  // What carries between statements (T299, T305).
  'false | true; echo ${PIPESTATUS[@]}',
  'touch f; echo "$_"; echo a b > g; echo "$_"; h() { :; }; echo "$_"; cd work; echo "$_"; cd ..; rm f g',
  // The builtins (T305).
  'h() { echo $1; }; export -f h; h a; export -f nope; echo $?',
  'break; echo $?',
  'continue; echo $?',
  'for i in 1; do break; done; echo ok',
  'return; echo $?',
  'shift 5; echo $?',
  '[ a; echo $?',
  "printf '%d\\n' x; echo $?",
  'test 1 -lt x; echo $?',
  '[ 1 -lt x ]; echo $?',
  '[ -lt 3 ]; echo $?',
  'a=; [ $a -lt 3 ]; echo $?',
  '[ 2 -gt 1 ]; echo $?',
  'cd work; echo ~+; echo ~+/x',
  'set -o',
  'set +o',
  // Listed options (T302).
  'xargs -n1 echo < languages | wc -l',
  'echo a b | xargs -n1',
  'echo a | xargs -I{} echo x{}y',
  'echo | xargs echo',
  'xargs echo < /dev/null',
  'seq 3 | head -n -1',
  'seq 3 | head -n-1',
  "printf 'abc' | head -c -1",
  "printf 'a\\na\\nb\\n' | sort | uniq -c",
  'sed -f /dev/null languages | wc -l',
  'echo aa > f; sed -i.bak s/a/b/ f; cat f f.bak; rm f f.bak',
  "printf 'a\\nc\\n' > f; sed 's/a/b/w o' f; cat o; rm f o",
  "date -u -d '2020-01-02 03:04:05' +%c",
  "date -u -d '2020-01-02' -I",
  'env -i env',
  'mkdir d; touch d/x; rm -rv d',
  'echo a > a1; cp -v a1 c1; rm a1 c1',
  "printf 'h\\303\\251llo' | tail -c5 | wc -c",
  // A wrong use, as GNU words it (T306).
  'cp; mv; rm; mkdir; touch; cut; tr; seq; basename; dirname; cat --bad; date --bad',
  'grep; echo $?',
  'cp a; echo $?',
  'mv a; echo $?',
  'touch a; diff a; echo $?; rm a',
  'diff; echo $?',
  'diff nope a; echo $?',
  'sort nope; echo $?',
  'find nope; echo $?',
  'mkdir nope/x; echo $?',
  'echo | xargs nope; echo $?',
  'env nope; echo $?',
  'ls --bad; echo $?',
  'pwd --bad; echo $?',
];

let root = '';
let home = '';

// The file system of the real CV under `home`, protected files read-only.
function writeTree() {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cv-parity-')));
  home = path.join(root, 'home', 'guest');
  fs.mkdirSync(home, { recursive: true });
  const folders: string[] = [];
  const walk = (node: FsNode, at: string) => {
    if (node.kind === 'file') {
      fs.writeFileSync(at, fileText(node));
      fs.chmodSync(at, 0o444);
      return;
    }
    fs.mkdirSync(at);
    for (const child of node.children) walk(child, path.join(at, child.name));
    folders.push(at);
  };
  for (const child of treeFor().fs.children) walk(child, path.join(home, child.name));
  for (const folder of folders) fs.chmodSync(folder, 0o555);
}

// bash's output with the temporary folder read as `/`, and its messages'
// `bash: line N: ` prefix as the shell's `bash: `.
const asShell = (text: string) => text.replaceAll(root, '').replace(/^bash: line \d+: /gm, 'bash: ');

function inBash(line: string) {
  const env = { PATH: process.env.PATH ?? '', HOME: home, USER: 'guest', LOGNAME: 'guest', SHELL: '/bin/bash', LC_ALL: 'C.UTF-8' };
  const result = spawnSync('bash', ['-c', line], { cwd: home, env, encoding: 'utf8' });
  return { stdout: asShell(result.stdout), stderr: asShell(result.stderr), status: result.status };
}

beforeAll(() => {
  if (gnuMissing() === null) writeTree();
});

afterAll(() => {
  if (root === '') return;
  // Read-only folders first made writable again, so they can be removed.
  for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) if (entry.isDirectory()) fs.chmodSync(path.join(entry.parentPath, entry.name), 0o755);
  fs.chmodSync(path.join(root, 'home', 'guest'), 0o755);
  fs.rmSync(root, { recursive: true, force: true });
});

describe('006-terminal-FR-067 and 006-terminal-FR-068: the shell gives what bash with GNU tools gives (SC-014)', () => {
  test('at least 30 lines', () => {
    expect(LINES.length).toBeGreaterThanOrEqual(30);
  });

  test.each(LINES)('%s', async (line) => {
    requireGnu();
    const shell = shellFor();
    const ours = await runLine(shell, line);
    const theirs = inBash(line);
    expect({ stdout: ours.stdout, stderr: ours.stderr, status: ours.status }).toEqual(theirs);
  });
});
