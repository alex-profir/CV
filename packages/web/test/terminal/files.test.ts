// Browsing the CV as files in the page (FR-043, FR-046, FR-021, FR-050):
// folders told apart without color, the working folder in the prompt and the
// window title and kept as the session is, and every file reachable by its
// controls alone.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume, siteData } from '@cv/content';
import { engineContext } from '../../src/apps/terminal/engine/commands.ts';
import type { FsNode } from '../../src/apps/terminal/engine/files.ts';
import { readSpecList } from '../../scripts/spec-list.ts';
import { resize, settle } from '../helpers/shell.ts';
import { COMMAND_LINE, groupText, openTerminal, openTerminalPage, runCount, runGroup, typedLines, typeLine } from '../helpers/terminal.ts';
import { COLUMNS, FORMAT } from './engine/context.ts';
import { siteText } from '../../src/site-text.ts';

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

// Every file of the real site's tree, as `cat ~/{path}`.
function siteFiles(): string[] {
  const { fs } = engineContext({ text: siteText, format: FORMAT, resume, siteData, specs: readSpecList(), cvJson: JSON.stringify(resume, null, 2), columns: COLUMNS });
  const walk = (node: FsNode, path: string[]): string[] =>
    node.kind === 'file' ? [`cat ~/${[...path, node.name].join('/')}`] : node.children.flatMap((child) => walk(child, node.name === '~' ? path : [...path, node.name]));
  return walk(fs, []);
}

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
    expect(await pwd(page), step).toBe('~/work');
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
    expect(await pwd(page)).toBe('~');
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
      expect((await typedLines(page)).at(-1)).toBe(line);
      const output = (await groupText(page, page.locator('.terminal section.run').last())).trim();
      expect(output.length, line).toBeGreaterThan(0);
      if (line.startsWith('ls ')) queue.push(...(await lsNames(page)));
    }
    const shown = [...ran].filter((line) => line.startsWith('cat ')).sort();
    expect(shown).toEqual(siteFiles().sort());
  });
});
