// The shell on the real build (006 research R25, R27): what a line prints in
// the page is what the same shell prints in Node, state carries from line
// to line, and a pipe's output is plain text.
import { describe, expect, test, vi } from 'vitest';
import type { Locator, Page } from 'playwright';
import { resume } from '@cv/content';
import { LANGUAGE_CASES, runLines, shellFor } from './shell/context.ts';
import { openTerminalPage, runGroup } from '../helpers/terminal.ts';

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
