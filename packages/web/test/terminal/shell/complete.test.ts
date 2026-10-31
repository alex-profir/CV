// Tab's completer (006 research R43): each row of R43's table, on the
// Terminal's file system for the real CV.
import { beforeEach, describe, expect, test } from 'vitest';
import { completeLine, runLine, shellFor } from './context.ts';
import type { TestShell } from './context.ts';

let shell: TestShell;
beforeEach(() => {
  shell = shellFor();
});

// The line after one Tab, as the page applies the answer.
async function tab(line: string, cursor = line.length) {
  const answer = await completeLine(shell, line, cursor);
  return answer.insert === '' ? line : line.slice(0, answer.start) + answer.insert + line.slice(answer.end);
}
const names = async (line: string) => (await completeLine(shell, line)).matches.map((match) => match.name);

describe('006-terminal-FR-076: what Tab inserts, as bash’s readline does', () => {
  // T371, from a real bash on a terminal.
  test('`${name` completes names, closed as bash closes them', async () => {
    await runLine(shell, 'f1=1; f2=2; fone=1');
    expect(await tab('echo ${f')).toBe('echo ${f');
    expect(await names('echo ${f')).toEqual(['${f1}', '${f2}', '${fone}']);
    expect(await tab('echo ${fo')).toBe('echo ${fone} ');
    expect(await tab('echo "${fo')).toBe('echo "${fone}" ');
    expect(await tab('echo ${HOM')).toBe('echo ${HOME');
    expect(await tab('{ gre')).toBe('{ grep ');
  });

  test.each([
    ['one file: completed, then a space', 'cat cv', 'cat cv.json '],
    ['a folder gets / and no space', 'cd wo', 'cd work/'],
    ['~/ stays as typed', 'cat ~/sk', 'cat ~/skills '],
    ['a path from the working folder', './w', './work/'],
    ['inside a quote: closed, then a space', 'cat "cv', 'cat "cv.json" '],
    ['inside a single quote', "cat 'cv", "cat 'cv.json' "],
    ['after a redirect: a path', 'echo hi > ab', 'echo hi > about '],
    ['a command', 'ab', 'about '],
    ['a standard command', 'gr', 'grep '],
    ['a site command', 'hist', 'history '],
    ['a first word after |', 'ls | wc', 'ls | wc '],
    ['after ;', 'ls; wc', 'ls; wc '],
    ['after &&', 'ls && wc', 'ls && wc '],
    ['after ||', 'ls || wc', 'ls || wc '],
    ['after (', '(wc', '(wc '],
    ['after then, files, not commands (T393)', 'if true; then wc', 'if true; then wc'],
    ['after do, files, not commands (T393)', 'for x in a; do wc', 'for x in a; do wc'],
    ['a word that starts with { is no command (T393)', 'ls {a', 'ls {a'],
    ['{ alone starts a command (T393)', '{ wc', '{ wc '],
    ['no match changes nothing', 'xyz', 'xyz'],
    ['a command and the folder of its name: no mark', 'wo', 'work'],
  ])('%s: %s', async (_rule, typed, expected) => {
    expect(await tab(typed)).toBe(expected);
  });

  test('outside quotes a space in a name gets a backslash', async () => {
    await runLine(shell, 'touch "my file"');
    expect(await tab('cat my')).toBe('cat my\\ file ');
    expect(await tab('cat "my')).toBe('cat "my file" ');
    expect(await tab('cat my\\ f')).toBe('cat my\\ file ');
  });

  test('a word in the middle of the line completes only the word before the cursor, with no space', async () => {
    expect(await tab('cat cv | wc', 'cat cv'.length)).toBe('cat cv.json | wc');
  });

  test('a visitor’s function, and a folder of the working folder, complete a first word', async () => {
    await runLine(shell, 'myfunc() { :; }');
    expect(await tab('myf')).toBe('myfunc ');
    await runLine(shell, 'mkdir notes');
    expect(await tab('not')).toBe('notes/');
  });

  test('$ words complete variable names, the visitor’s too', async () => {
    expect(await names('echo $HO')).toEqual(expect.arrayContaining(['$HOME']));
    await runLine(shell, 'MYVAR=1');
    expect(await tab('echo $MYV')).toBe('echo $MYVAR ');
  });
});

describe('006-terminal-FR-076: the matches', () => {
  test('several matches with nothing to add insert nothing, and list by name', async () => {
    expect((await completeLine(shell, 'ca')).insert).toBe('');
    expect(await names('ca')).toEqual(['case', 'cat']);
    expect(await names('i')).toEqual(['if', 'in', 'interests']);
    expect(await names('cat c')).toEqual(['contact', 'cv.json']);
    expect(await names('xyz')).toEqual([]);
  });

  test('wo from home matches work once', async () => {
    expect(await names('wo')).toEqual(['work']);
  });

  test('folders are marked, and the list holds the last part of a path only', async () => {
    const matches = (await completeLine(shell, 'ls ~/w')).matches;
    expect(matches).toEqual([{ name: 'work/', folder: true }]);
    await runLine(shell, 'mkdir a a/bb a/bc');
    expect(await names('ls a/b')).toEqual(['bb/', 'bc/']);
  });

  test('a common part is added, and matches are in byte order', async () => {
    await runLine(shell, 'mkdir h && touch h/Zed h/abc1 h/abc2');
    expect(await tab('ls h/a')).toBe('ls h/abc');
    expect(await names('ls h/')).toEqual(['Zed', 'abc1', 'abc2']);
  });

  test('capitals count, as readline’s default does', async () => {
    expect(await names('cat AB')).toEqual([]);
  });

  test('no match is ever the adapter’s own', async () => {
    expect(await names('__')).toEqual([]);
    expect(await names('__cv')).toEqual([]);
    expect(await names('echo $__')).toEqual([]);
    expect((await names('')).some((name) => name.includes('__cv'))).toBe(false);
  });

  test('every word of the tables is a first word: an alias, a builtin and a keyword', async () => {
    expect(await names('expo')).toEqual(['export']);
    expect(await names('whil')).toEqual(['while']);
    expect(await names('[[')).toEqual(['[[']);
  });
});
