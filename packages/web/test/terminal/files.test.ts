// Browsing the CV as files in the page (FR-043, FR-046, FR-021, FR-049,
// FR-050, FR-073), on the real build's shell: folders told apart without
// color, the visitor's files after the built ones, the working folder in the
// prompt and the window title and kept as the session is, `ls -l`'s owners,
// and every file reachable by its controls alone.
import { describe, expect, test, vi } from 'vitest';
import type { Locator, Page } from 'playwright';
import { resize, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, groupText, linesRun, openTerminal, openTerminalPage, runCount, runGroup, typedLines, typeLine } from '../helpers/terminal.ts';
import { siteFiles } from './engine/context.ts';

vi.setConfig({ testTimeout: 300_000 });

const WINDOW = '#os .window[data-view="terminal"]';
const DOCK_ITEM = '#os .dock-item[data-app="terminal"]';
const VIEW = '#os .full-screen[data-view="terminal"]';

// `ls`'s names: each control's text and the line it runs.
const lsNames = (page: Page) =>
  page.locator('.terminal section.run').last().locator('.run-output .out-columns button').evaluateAll((list) => list.map((control) => ({ text: (control.textContent ?? '').trim(), line: control.getAttribute('aria-label')! })));

// The path the command line's prompt shows.
const promptPath = (page: Page) => page.locator('.terminal form.prompt-line .prompt-path').textContent();

const windowTitle = async (page: Page) => (await page.locator(`${WINDOW} .window-title`).textContent())?.trim();

const pwd = async (page: Page) => (await groupText(page, await runGroup(page, 'pwd'))).trim();

// A run's printed lines, each as it shows, spaces kept.
const shownLines = (group: Locator) => group.locator('.run-output p.out-line').evaluateAll((lines) => lines.map((line) => line.textContent ?? ''));

describe('006-terminal-FR-043 and 006-terminal-FR-073: the visitor’s files after the built ones', () => {
  test('touch zz aa then ls lists aa and zz after specs/, as controls; mkdir notes lists notes/', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'touch zz aa');
    await runGroup(page, 'ls');
    const names = await lsNames(page);
    const at = names.findIndex((name) => name.text === 'specs/');
    expect(at).toBeGreaterThan(-1);
    expect(names.slice(at + 1)).toEqual([
      { text: 'aa', line: 'cat ~/aa' },
      { text: 'zz', line: 'cat ~/zz' },
    ]);
    await runGroup(page, 'mkdir notes');
    await runGroup(page, 'ls');
    expect((await lsNames(page)).slice(at + 1)).toEqual([
      { text: 'aa', line: 'cat ~/aa' },
      { text: 'notes/', line: 'ls ~/notes' },
      { text: 'zz', line: 'cat ~/zz' },
    ]);
  });
});

describe('006-terminal-FR-043: folders differ from files without color', () => {
  test('with every color forced to one, folder names end in / and file names don’t', async () => {
    const page = await openTerminalPage('desktop');
    await page.addStyleTag({ content: '#os .terminal * { color: black !important; background: white !important; }' });
    await runGroup(page, 'ls');
    const names = await lsNames(page);
    const folders = names.filter((name) => name.line.startsWith('ls '));
    const files = names.filter((name) => name.line.startsWith('cat '));
    expect(folders.length).toBeGreaterThan(0);
    expect(files.length).toBeGreaterThan(0);
    for (const folder of folders) expect(folder.text, folder.line).toMatch(/\/$/);
    for (const file of files) expect(file.text, file.line).not.toMatch(/\/$/);
  });
});

describe('006-terminal-FR-046: the prompt and the window title show the working folder', () => {
  test('after cd work, the next prompt and the window title read ~/work', async () => {
    const page = await openTerminalPage('desktop');
    expect(await promptPath(page)).toBe('~');
    expect(await windowTitle(page)).toBe('Terminal — ~');
    await typeLine(page, 'cd work');
    await expect.poll(() => promptPath(page)).toBe('~/work');
    expect(await windowTitle(page)).toBe('Terminal — ~/work');
    // The run's own prompt shows where it ran.
    expect(await page.locator('.terminal section.run').last().locator('.prompt-path').textContent()).toBe('~');
    // `pwd` prints the full path, as bash does; the prompt keeps `~`.
    expect(await pwd(page)).toBe('/home/guest/work');
    expect(await promptPath(page)).toBe('~/work');
  });

  test('after cd /tmp, the prompt and the window title read /tmp', async () => {
    const page = await openTerminalPage('desktop');
    await typeLine(page, 'cd /tmp');
    await expect.poll(() => promptPath(page)).toBe('/tmp');
    expect(await windowTitle(page)).toBe('Terminal — /tmp');
    expect(await pwd(page)).toBe('/tmp');
  });
});

describe('006-terminal-FR-049: ls -l shows who owns what', () => {
  test('drawn with root root and guest guest, folder names ending in / and still controls; piped, GNU’s text', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'touch mine');
    await runGroup(page, 'mkdir dir');
    const group = await runGroup(page, 'ls -l');
    const lines = await shownLines(group);
    expect(lines[0]).toMatch(/^total \d+$/);
    const about = lines.find((line) => line.endsWith(' about'))!;
    expect(about).toMatch(/^-r--r--r-- 1 root +root +\d+ /);
    expect(lines.find((line) => line.endsWith(' work/'))).toMatch(/^dr-xr-xr-x \d+ root +root +\d+ /);
    expect(lines.find((line) => line.endsWith(' mine'))).toMatch(/^-rw-r--r-- 1 guest guest +\d+ /);
    expect(lines.find((line) => line.endsWith(' dir/'))).toMatch(/^drwxr-xr-x \d+ guest guest +\d+ /);
    const controls = await group.locator('.run-output p.out-line button').evaluateAll((list) => list.map((control) => ({ text: (control.textContent ?? '').trim(), line: control.getAttribute('aria-label')! })));
    expect(controls).toContainEqual({ text: 'work/', line: 'ls ~/work' });
    expect(controls).toContainEqual({ text: 'dir/', line: 'ls ~/dir' });
    expect(controls).toContainEqual({ text: 'about', line: 'cat ~/about' });
    const piped = await runGroup(page, 'ls -l | cat');
    const text = await shownLines(piped);
    expect(text.find((line) => line.endsWith(' work'))).toMatch(/^dr-xr-xr-x \d+ root +root +\d+ /);
    expect(text.some((line) => line.endsWith('/'))).toBe(false);
    expect(await piped.locator('.run-output button').count()).toBe(0);
  });
});

describe('006-terminal-FR-050: a piped ls is plain names', () => {
  test('ls | cat shows the names with no control', async () => {
    const page = await openTerminalPage('desktop');
    const group = await runGroup(page, 'ls | cat');
    const lines = await shownLines(group);
    expect(lines).toContain('work');
    expect(lines).toContain('about');
    expect(await group.locator('.run-output button').count()).toBe(0);
  });
});

describe('006-terminal-FR-021: the working folder is kept as the session is', () => {
  async function inWork(page: Page): Promise<void> {
    await typeLine(page, 'cd work');
    await expect.poll(() => promptPath(page)).toBe('~/work');
  }

  async function expectInWork(page: Page, step: string): Promise<void> {
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    await settle(page);
    expect(await promptPath(page), step).toBe('~/work');
    expect(await pwd(page), step).toBe('/home/guest/work');
  }

  test('minimize and restore', async () => {
    const page = await openTerminalPage('desktop');
    await inWork(page);
    await page.getByRole('button', { name: 'Minimize Terminal' }).click();
    await settle(page);
    await page.locator(DOCK_ITEM).click();
    await expectInWork(page, 'minimized and restored');
  });

  test('mobile Home and reopen', async () => {
    const page = await openTerminalPage('mobile');
    await inWork(page);
    await page.getByRole('button', { name: 'Home' }).tap();
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await page.locator('#os .home .app-icon[data-view="terminal"]').tap();
    await expectInWork(page, 'home and back');
  });

  test('a 1440 → 375 → 1440 resize', async () => {
    const page = await openTerminalPage('desktop');
    await inWork(page);
    await resize(page, 375, 812);
    await page.locator(VIEW).waitFor();
    await expectInWork(page, 'at 375');
    await resize(page, 1440, 900);
    await page.locator(WINDOW).waitFor();
    await expectInWork(page, '1440 → 375 → 1440');
  });

  test('closing and reopening starts at ~', async () => {
    const page = await openTerminalPage('desktop');
    await inWork(page);
    await page.getByRole('button', { name: 'Close Terminal' }).click();
    await expect.poll(() => page.locator(WINDOW).count()).toBe(0);
    await settle(page);
    await openTerminal(page, 'desktop');
    expect(await promptPath(page)).toBe('~');
    expect(await pwd(page)).toBe('/home/guest');
  });
});

describe('006-terminal-FR-050: ls’s names are controls that list or show them', () => {
  test('each name runs ls ~/{folder} or cat ~/{path} as typed, and following them reads every file without typing', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'ls');
    const queue = [...(await lsNames(page))];
    const ran = new Set<string>();
    while (queue.length > 0) {
      const { line } = queue.shift()!;
      if (ran.has(line)) continue;
      ran.add(line);
      const before = await runCount(page);
      // Clicked in the run that lists it.
      await page.locator(`.terminal section.run .run-output .out-columns button[aria-label="${line}"]`).last().click();
      await expect.poll(() => runCount(page), { message: line }).toBe(before + 1);
      await linesRun(page);
      expect((await typedLines(page)).at(-1)).toBe(line);
      const output = (await groupText(page, page.locator('.terminal section.run').last())).trim();
      expect(output.length, line).toBeGreaterThan(0);
      if (line.startsWith('ls ')) queue.push(...(await lsNames(page)));
    }
    const shown = [...ran].filter((line) => line.startsWith('cat ')).sort();
    expect(shown).toEqual(siteFiles().sort());
  });
});
