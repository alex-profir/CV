// The shell on the real build (006 research R25, R27): what a line prints in
// the page is what the same shell prints in Node, state carries from line
// to line, and a pipe's output is plain text.
import { describe, expect, test, vi } from 'vitest';
import type { Locator, Page } from 'playwright';
import { resume } from '@cv/content';
import { LANGUAGE_CASES, runLines, shellFor } from './shell/context.ts';
import { resize, settle } from '../helpers/shell.ts';
import { openTerminal, openTerminalPage, runGroup, typeLine } from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

// A run's output as it shows: each printed line's rendered text, spaces
// kept, or nothing when the run shows no output.
const shownLines = (group: Locator) =>
  group.evaluate((run) => {
    const output = run.querySelector('.run-output');
    if (output === null) return [];
    return [...output.querySelectorAll('p.out-line')].map((line) => (line as HTMLElement).innerText);
  });

// A run's visible words, in reading order: text only a screen reader reads,
// such as a date in words, left out.
const shownWords = (group: Locator) =>
  group.locator('.run-output').evaluate((output) => {
    const copy = output.cloneNode(true) as HTMLElement;
    for (const hidden of copy.querySelectorAll('.visually-hidden')) hidden.remove();
    output.after(copy);
    const words = copy.innerText.split(/\s+/).filter((word) => word !== '');
    copy.remove();
    return words;
  });

async function runAll(page: Page, lines: readonly string[]): Promise<string[][]> {
  const shown: string[][] = [];
  for (const line of lines) shown.push(await shownLines(await runGroup(page, line)));
  return shown;
}

describe('006-terminal-FR-067: the page shows what the shell prints', () => {
  test('each feature’s line, typed, shows the same text as in Node', async () => {
    const lines = LANGUAGE_CASES.map(([, line]) => line);
    const expected = (await runLines(shellFor(), lines)).map((result) => (result.stdout === '' ? [] : result.stdout.replace(/\n$/, '').split('\n')));
    const page = await openTerminalPage('desktop');
    const shown = await runAll(page, lines);
    for (const [index, line] of lines.entries()) expect(shown[index], line).toEqual(expected[index]);
  });

  test('a variable and a function set in one line are used in the next', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'NAME=shell; greet() { echo "hi $1 from $NAME"; }');
    expect(await shownLines(await runGroup(page, 'greet you'))).toEqual(['hi you from shell']);
  });
});

describe('006-terminal-FR-057: a pipe’s output is plain text', () => {
  test('work | grep -i a word of the first role’s summary shows only the matching lines, with no heading or control', async () => {
    const summary = resume.work?.[0]?.summary ?? '';
    const word = summary.split(/\W+/).find((part) => part.length > 4)!;
    expect(word).toBeDefined();
    const page = await openTerminalPage('desktop');
    const work = (await runLines(shellFor(), ['work']))[0]!.stdout.split('\n').filter((line) => line !== '');
    const group = await runGroup(page, `work | grep -i ${word.toUpperCase()}`);
    const shown = await shownLines(group);
    expect(shown.length).toBeGreaterThan(0);
    expect(shown).toEqual(work.filter((line) => line.toLowerCase().includes(word.toLowerCase())));
    expect(await group.locator('.run-output :is(h3, h4, h5, h6, a, button)').count()).toBe(0);
  });

  test('every command help lists that prints shows the text {command} | cat shows', async () => {
    const page = await openTerminalPage('desktop');
    for (const command of ['help', 'about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact', 'site', 'specs', 'ls', 'pwd']) {
      const shown = await shownWords(await runGroup(page, command));
      // A list item's `- ` mark is drawn by the list, not written.
      const piped = (await shownLines(await runGroup(page, `${command} | cat`))).map((line) => line.replace(/^- /, '')).join(' ').split(/\s+/).filter((word) => word !== '');
      // `ls` draws the home folder in the design's order, folders ending in
      // `/`; piped, it is GNU's (FR-043).
      if (command === 'ls') expect(shown.map((name) => name.replace(/\/$/, '')).sort(), command).toEqual([...piped].sort());
      else expect(shown, command).toEqual(piped);
    }
  });
});

// A word of the first role's summary, read from the CV.
const summaryWord = () => (resume.work?.[0]?.summary ?? '').split(/\W+/).find((part) => part.length > 4)!;

describe.each<TerminalShell>(['desktop', 'mobile'])('006-terminal-FR-049, 006-terminal-FR-073 and 006-terminal-FR-068: files in the %s shell', (shell) => {
  test('006-terminal-FR-049: US3 scenario 9, protected files say Permission denied and stay as they were', async () => {
    const page = await openTerminalPage(shell);
    const before = await runAll(page, ['cat about', 'ls work', 'cat cv.json']);
    expect(await shownLines(await runGroup(page, 'rm about'))).toEqual(["rm: cannot remove 'about': Permission denied"]);
    expect(await shownLines(await runGroup(page, 'mv work jobs'))).toEqual(["mv: cannot move 'work' to 'jobs': Permission denied"]);
    expect(await shownLines(await runGroup(page, 'echo hi > cv.json'))).toEqual(['bash: cv.json: Permission denied']);
    expect(await runAll(page, ['cat about', 'ls work', 'cat cv.json'])).toEqual(before);
  });

  test('006-terminal-FR-021 and 006-terminal-FR-073: a refused redirect or a line that fails inside the shell keeps the Terminal open', async () => {
    const page = await openTerminalPage(shell);
    await runGroup(page, 'touch keep');
    expect(await shownLines(await runGroup(page, 'f=about; echo x > $f'))).toEqual(['bash: about: Permission denied']);
    expect(await shownLines(await runGroup(page, 'seq 300000 > big'))).toEqual(['bash: big: No space left on device']);
    expect(await shownLines(await runGroup(page, 'eval "echo x > about"'))).toEqual(['bash: about: Permission denied']);
    expect(await shownLines(await runGroup(page, 'x=$(seq 200000); echo ${#x}'))).toEqual(['1288894']);
    expect(await shownLines(await runGroup(page, 'unset x; wc -c < keep'))).toEqual(['0']);
  });

  test('006-terminal-FR-073 and 006-terminal-FR-021: US3 scenario 10, the visitor’s folder, gone after closing', async () => {
    const page = await openTerminalPage(shell);
    expect(await shownLines(await runGroup(page, 'mkdir notes && echo hi > notes/a && mv notes/a notes/b && cat notes/b'))).toEqual(['hi']);
    const listed = await runGroup(page, 'ls');
    const names = await listed.locator('.out-columns button').evaluateAll((list) => list.map((control) => (control.textContent ?? '').trim()));
    expect(names.indexOf('notes/')).toBeGreaterThan(names.indexOf('specs/'));
    await runGroup(page, 'touch /tmp/t');
    expect(await shownLines(await runGroup(page, 'rm -r notes'))).toEqual([]);
    expect(await shownLines(await runGroup(page, 'ls notes'))).toEqual(['ls: notes: No such file or directory']);
    await runGroup(page, 'mkdir notes');
    // `exit` on a phone goes home and keeps the session (FR-021), and the
    // phone shell has no close: it is closed as a desktop window.
    if (shell === 'mobile') await resize(page, 1440, 900);
    await typeLine(page, 'exit');
    await expect.poll(() => page.locator('#os .terminal').count()).toBe(0);
    if (shell === 'mobile') await resize(page, 375, 812);
    await settle(page);
    await openTerminal(page, shell);
    const after = await runGroup(page, 'ls');
    expect(await after.locator('.out-columns button').evaluateAll((list) => list.map((control) => (control.textContent ?? '').trim()))).not.toContain('notes/');
    expect(await shownLines(await runGroup(page, 'ls /tmp'))).toEqual([]);
  });

  test('006-terminal-FR-012 and 006-terminal-FR-068: US3 scenario 11, the standard commands search the CV’s files', async () => {
    const word = summaryWord();
    expect(word).toBeDefined();
    const files = (await runLines(shellFor(), ['find ~/work -type f']))[0]!.stdout.split('\n').filter((path) => path !== '');
    const holding: string[] = [];
    for (const path of files) {
      const text = (await runLines(shellFor(), [`cat ${path}`]))[0]!.stdout;
      if (text.toLowerCase().includes(word.toLowerCase())) holding.push(path);
    }
    expect(holding.length).toBeGreaterThan(0);
    const page = await openTerminalPage(shell);
    expect((await shownLines(await runGroup(page, `grep -ril ${word} ~/work`))).sort()).toEqual(holding.sort());
    expect(await shownLines(await runGroup(page, "find ~ -name '*.json'"))).toEqual(['/home/guest/cv.json']);
    const tree = (await shownLines(await runGroup(page, 'tree ~/work'))).join('\n');
    for (const path of files) expect(tree).toContain(path.slice(path.lastIndexOf('/') + 1));
  });
});
