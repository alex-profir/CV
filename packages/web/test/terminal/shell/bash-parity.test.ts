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
  // T331: `diff` of two process substitutions.
  'diff <(echo a) <(echo b); echo $?',
  'diff -u <(echo a) <(echo b) | wc -l',
  'diff <(cat about) <(cat skills) | wc -l',
  'diff <(echo q) <(echo q); echo $?',
  // T332: writing to the output by name.
  'echo a | tee /dev/stdout',
  'echo a | tee /dev/stderr',
  'echo a | tee /dev/stdout | wc -l',
  "printf 'b\\na\\n' | sort -o /dev/stdout",
  "printf 'b\\na\\n' | sed 'w /dev/stdout'",
  "printf 'b\\na\\n' | sed 's/a/z/w /dev/stdout'",
  'cp about /dev/stdout | head -1',
  'echo a > /dev/fd/1; echo b > /dev/fd/2',
  'cat /dev/fd/0 < about | head -1',
  // T333: `grep`'s bundled options, and its numbers.
  "printf 'x\\ny\\nx\\n' | grep -nA1 x",
  "printf 'x\\ny\\n' | grep -nB1 y",
  "printf 'x\\ny\\nx\\n' | grep -nC1 y",
  "printf 'x\\nx\\n' | grep -cm1 x",
  "printf 'X\\n' | grep -ie x",
  "printf 'x\\nx\\n' | grep -m0 x; echo $?",
  "printf 'x\\nx\\n' | grep -c -m1 x",
  'grep -m x a about; echo $?',
  'grep -A x a about; echo $?',
  'grep -m; echo $?',
  'grep -f; echo $?',
  'grep --include; echo $?',
  // T334: `sort`'s keys, and `-u` with one.
  "printf 'b\\n2\\n2.0\\n1\\n' | sort -nu",
  "printf 'a\\nA\\nb\\n' | sort -fu",
  'sort -k0 about; echo $?',
  'sort -k1.0 about; echo $?',
  'sort -k x about; echo $?',
  'sort -k 1,x about; echo $?',
  'sort -t ab about; echo $?',
  'sort -c -o x about; echo $?',
  // T335: `find`'s actions and tests.
  'find . -name about -exec echo a{}b \\;; echo $?',
  'find . -name about -exec echo {}{} \\;',
  'find . -name about -exec false \\;; echo $?',
  'find . -name about -exec nope \\;; echo $?',
  'find . -name about -exec nope {} +; echo $?',
  'find . -newer nope; echo $?',
  'find . -size x; echo $?',
  'find . -perm x; echo $?',
  'find . -a -name about; echo $?',
  // T338: `xargs`' wrong uses.
  'xargs -n </dev/null; echo $?',
  'xargs -d </dev/null; echo $?',
  'xargs -P </dev/null; echo $?',
  'xargs -I </dev/null; echo $?',
  'xargs -n x </dev/null; echo $?',
  'xargs -P x </dev/null; echo $?',
  'echo a | xargs -n 2 -I{} echo {}',
  // T339: missing and bad arguments.
  'head -n; echo $?',
  'tail -c; echo $?',
  'seq -s; echo $?',
  'basename -s; echo $?',
  'env -u; echo $?',
  'date -d; echo $?',
  'date a b; echo $?',
  'date -u +',
  'sed -f nope about; echo $?',
  'ls --color=bad; echo $?',
  // T341: the builtins' errors.
  '[ a b ]; echo $?',
  '[ a = ]; echo $?',
  '[ 1 -lt ]; echo $?',
  'test a b; echo $?',
  'set -z; echo $?',
  'set -o nope; echo $?',
  'shopt nope; echo $?',
  'shopt dotglob',
  'shopt | head -3',
  'echo ${}; echo $?',
  "let 'x=(1'; echo $?",
  'echo $((a b)); echo $?',
  '((1+)); echo $?',
  "let '1+'; echo $?",
  'x[1+]=1; echo $?',
  'shopt -s failglob; echo zzz*; echo $?',
  // T337: what the lists hold.
  'export d; echo "[${d+set}]"; declare -p d; d=1; declare -p d',
  'export d; env | grep -c "^d="',
  'x=5; declare -p x; declare | grep -c "^x="',
  'declare -i i; i=1+; echo $?',
  'declare -i i; i=2+3; echo $i',
  // T343: `exec` with a command.
  'exec echo a; echo after',
  'exec ls | wc -l; echo after',
  '(exec echo a; echo b); echo after',
  // T345.
  'diff -s about about; diff --report-identical-files about about',
  'diff work about; echo $?',
  "awk '{print FILENAME}' < about | head -1",
  'echo "$BASH_SUBSHELL $SHLVL"; (echo "$BASH_SUBSHELL $SHLVL"); echo $(echo $BASH_SUBSHELL)',
  'grep -ril rest ~/work | sort',
  // T315, T325: no limit but FR-069's.
  'echo {1..10001} | wc -w',
  'x=({1..20000}); echo ${#x[@]}',
  "printf '%s\\n' {1..12000} | wc -l",
  "seq 150000 | awk 'END{print NR}'",
  "seq 150000 | sed ':a;N;$!ba;s/\\n/,/g' | wc -c",
  'seq 1000000 | wc -l',
  'echo a; yes | head -1; echo b',
  // T317: a glob ending in `/`.
  'echo */',
  'for d in */; do echo "$d"; done',
  'ls -d */',
  'ls -d w*/',
  'echo work/*/',
  'false; echo */ $?',
  // T323: the shell language's remaining gaps.
  'x=1 echo $x',
  'echo $((2**53+1)) $((9007199254740993)) $((2**64)) $((1<<100))',
  'echo $(( (1+2)*3 )) $((7/2)) $((-7%3)) $((0x10)) $((010))',
  'f() { :; }; declare -f f',
  'declare -f nope; echo $?',
  'echo a | cat /dev/stdin',
  'cat /dev/stdin <<< s',
  'cat /dev/zero | head -c 3 | wc -c',
  'head -c 4 /dev/urandom | wc -c',
  'x=aBc; echo ${x~} ${x~~}',
  'command -v nope nope2; echo $?',
  'command -v true nope >/dev/null; echo $?',
  'shopt | wc -l',
  'shopt -s nocaseglob; echo W*',
  // T318: grep's basic regular expressions and its words.
  "printf 'foo\\n' | grep 'fo\\+'",
  "printf 'foo\\n' | grep 'fo\\?'",
  "printf 'a b\\n' | grep '\\<b\\>'",
  "printf 'a+b\\n' | grep 'a+b'",
  "printf 'aab\\n' | grep 'a\\{2\\}b'",
  "printf 'abab\\n' | grep '\\(ab\\)\\1'",
  "printf 'abab\\n' | grep -E '(ab)\\1'",
  "printf 'ab\\n' | grep -oP '(?<=a)b'",
  "printf 'a1\\nad\\n' | grep '\\w\\d'",
  "printf 'a\\n' | grep -l a",
  "printf 'a\\n' | grep -L b",
  "printf 'a\\n' | grep -H a",
  'grep a work',
  'grep -r x nope',
  "grep '[' about",
  "grep -E '(' about",
  "grep -E ')' about",
  "grep '\\(' about",
  "grep 'a\\{1' about",
  "printf 'a b\\n' | grep -o '\\w\\+'",
  "printf 'ab\\n' | grep '[[:alpha:]]\\+'",
  // T319: what can be done around just-bash's awk (research R25 has the rest).
  "printf 'x y\\n' | awk -v OFS=- '{print $1,$2}'",
  "printf 'a:b\\n' | awk -F: -v OFS=: '{ $2=\"c\" } 1'",
  "printf 'abc\\n' | awk '{print length}'",
  "printf 'x y\\n' | awk '{print $1,$2}' OFS=-",
  "printf 'a;b;c' | awk 'BEGIN{RS=\";\"}{print}'",
  "printf 'a\\nb\\n\\nc\\n' | awk 'BEGIN{RS=\"\"}{print NR\": \"$1}'",
  "awk 'BEGIN{print int(-1.5), int(\"3x\"), \"3x\"+0}'",
  "awk '{print}' nope",
  "awk 'BEGIN {'",
  // T320: what can be done around just-bash's sed (research R25 has the rest).
  "printf 'a\\n' | sed ':l;s/a/b/;T;bl'",
  "printf 'a\\n' | sed 's/z/b/;T;s/a/c/'",
  "printf 'a\\n' | sed 'a\\x'",
  "printf 'a\\n' | sed '1i\\top'",
  "printf 'a\\n' | sed '1c\\new'",
  "printf 'a\\nb\\n' | sed q5; echo $?",
  "printf 'a\\nb\\n' | sed Q5; echo $?",
  'sed p nope',
  "printf 'a\\n' | sed 's/a'",
  "printf 'a\\n' | sed 'y/a/'",
  // T321: `date -d` and a format's flags.
  "date -u -d '15 Jan 2020' +%F",
  "date -u -d '2020/01/15' +%F",
  "date -u -d '01/15/2020' +%F",
  "date -u -d 'jan 5 2021' +%F",
  "date -u -d '2020-02-30'",
  'date foo',
  'date -d nonsense',
  "date -u -d '2020-01-01 +1 day' +%F",
  "date -u -d '2020-01-02 1 day ago' +%F",
  "date -u -d '@1.5' +%s",
  "date -u -d '@86400' '+%-d %_d %02d %^a %#a %10Y'",
  // T322 and T328: the other commands' listed options and wrong uses.
  "printf 'a\\n' | wc",
  "printf 'a\\n' | wc -",
  "printf 'a:b:c\\n' | cut -d: -f3,1",
  "printf 'a\\n' | cut -d:: -f1",
  "printf '\"a b\" c\\n' | xargs -n1 echo",
  "printf 'a\\\\ b\\n' | xargs -n1 echo",
  "printf \"it's\\n\" | xargs echo",
  "printf 'a b\\nc\\n' | xargs -I % echo [%]",
  "printf 'a\\n' | xargs false; echo $?",
  'seq 3.5',
  'seq 1 2 3 4',
  'seq a',
  'seq 1 0 1',
  'seq --separator=, 3',
  'seq --equal-width 9 10',
  "printf 'abcdef' | head -c-3",
  "printf 'abcdef' | tail -c +3",
  "printf 'a\\n' | tr -d '[:vowel:]'",
  "printf 'abc\\n' | tr a-c '[x*]'",
  'find . -maxdepth 1 -size -1k',
  'find work/ -maxdepth 0',
  'basename /',
  'dirname /',
  'basename a b c',
  'diff <(echo a) <(echo a); echo $?',
  'sort -k',
  'head nope',
  'tail nope',
  'head -n x about',
  'tail -n x about',
  'cut -f',
  'tr a',
  'find . -bogus',
  // T326: a check's listings stay out of the line's output.
  'exec > f; echo a; exec 1>&-; echo b; rm f',
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
