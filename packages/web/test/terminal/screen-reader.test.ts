// What a screen reader gets from the Terminal (FR-027 to FR-029): a named
// command line with no prompt read, each output announced once through the
// status region, and a heading outline of runs and entries.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { COMMANDS } from '../../src/apps/terminal/engine/commands.ts';
import { axNodes } from '../helpers/ax.ts';
import { REPO_ROOT } from '../helpers/copy.ts';
import { openShell } from '../helpers/shell.ts';
import { COMMAND_LINE, commandLineFocused, linesRun, openTerminalLoading, openTerminalPage, runGroup, SHELL_PAGE, typedLines, typeLine, vimEntry, vimView } from '../helpers/terminal.ts';
import { STANDARD_GROUP } from '../../src/apps/terminal/shell/site-commands.ts';
import { siteText } from '../../src/site-text.ts';

vi.setConfig({ testTimeout: 180_000 });

const STATUS = '.terminal .terminal-status[role="status"]';
const SCREEN = '.terminal .terminal-screen';

const status = (page: Page) => page.locator(STATUS).evaluate((element) => ({ text: (element.textContent ?? '').trim(), children: element.children.length }));

// The Terminal's heading outline, as assistive technology sees it.
async function outline(page: Page): Promise<{ level: number; name: string }[]> {
  const nodes = await axNodes(page, '.terminal :is(h1, h2, h3, h4, h5, h6)');
  return nodes.filter((node) => !node.ignored && node.role === 'heading').map((node) => ({ level: node.level ?? 0, name: node.name }));
}

describe('006-terminal-FR-027: the command line is named, and the prompt is not read', () => {
  test('the command line is named Command; every prompt is aria-hidden; each run’s heading is the command as typed', async () => {
    const page = await openTerminalPage('desktop');
    const [line] = await axNodes(page, COMMAND_LINE);
    expect(line!.name).toBe('Command');
    expect(line!.role).toBe('textbox');
    await runGroup(page, 'pwd');
    await runGroup(page, 'Work ');
    const prompts = await page.locator('.terminal .prompt').evaluateAll((list) => list.map((prompt) => prompt.getAttribute('aria-hidden')));
    expect(prompts.length).toBeGreaterThanOrEqual(3);
    expect(prompts.every((value) => value === 'true')).toBe(true);
    const headings = await axNodes(page, '.terminal section.run h2.run-command');
    // As typed, capitals kept; an accessible name has its spaces trimmed.
    expect(headings.map((heading) => heading.name)).toEqual(['pwd', 'Work']);
  });
});

describe('006-terminal-FR-028: each output is announced once', () => {
  test('after Enter the status region holds the announcement once, focus stays in the command line, and scrolling doesn’t change it', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'pwd');
    expect(await status(page)).toEqual({ text: '/home/guest', children: 1 });
    expect(await commandLineFocused(page)).toBe(true);
    await runGroup(page, 'work');
    expect(await status(page)).toEqual({ text: `work: ${resume.work!.length} ${resume.work!.length === 1 ? 'entry' : 'entries'}`, children: 1 });
    const before = await page.locator(STATUS).innerHTML();
    await page.locator(SCREEN).evaluate((element) => {
      element.scrollTop = 0;
    });
    await page.waitForTimeout(200);
    expect(await page.locator(STATUS).innerHTML()).toBe(before);
    expect(await commandLineFocused(page)).toBe(true);
  });

  test('the same words twice are announced twice; cd work announces Now in ~/work; clear announces Cleared', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'pwd');
    const first = (await page.locator(`${STATUS} > *`).elementHandle())!;
    await runGroup(page, 'pwd');
    // A new element each time, so the same text is spoken again.
    expect(await first.evaluate((element) => element.isConnected)).toBe(false);
    expect(await status(page)).toEqual({ text: '/home/guest', children: 1 });
    await page.locator(COMMAND_LINE).fill('cd work');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await status(page)).text).toBe('Now in ~/work');
    await page.locator(COMMAND_LINE).fill('clear');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await status(page)).text).toBe('Cleared');
  });
});

describe('006-terminal-FR-028: the shell’s events are announced once', () => {
  test('Loading the shell once while loading, a stopped line’s text once, and Cancelled once after Ctrl+C; focus stays in the command line', async () => {
    const page = await openShell(SHELL_PAGE.desktop);
    const release = await openTerminalLoading(page, 'desktop');
    expect(await status(page)).toEqual({ text: siteText.terminal.announce.loading, children: 1 });
    await release();
    expect(await status(page)).toEqual({ text: siteText.terminal.announce.loading, children: 1 });
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('while true; do :; done');
    await page.keyboard.press('Enter');
    await linesRun(page);
    expect(await status(page)).toEqual({ text: siteText.terminal.replies.stopped.commands, children: 1 });
    expect(await commandLineFocused(page)).toBe(true);
    await page.keyboard.type('abc');
    await page.keyboard.press('Control+C');
    await expect.poll(() => status(page)).toEqual({ text: siteText.terminal.announce.cancelled, children: 1 });
    expect(await commandLineFocused(page)).toBe(true);
  });
});

describe('006-terminal-FR-065 and 006-terminal-FR-028: the vim editor to a screen reader', () => {
  const INSERT = '.terminal textarea.vim-insert';
  const VIM_TEXT = '.terminal .vim-text';
  const openVim = async (line: string) => {
    const page = await openTerminalPage('desktop');
    await typeLine(page, line);
    await vimView(page).waitFor();
    return page;
  };

  test('in insert mode the text area is a text field named after the file and described by the status line; the mode is announced once each way', async () => {
    const page = await openVim('vim notes.txt');
    await page.locator(VIM_TEXT).focus();
    await page.keyboard.press('i');
    await page.locator(INSERT).waitFor();
    await expect.poll(() => status(page)).toEqual({ text: '-- INSERT --', children: 1 });
    const [field] = await axNodes(page, INSERT);
    expect(field!.role).toBe('textbox');
    expect(field!.name).toBe('notes.txt, new');
    expect(field!.description).toContain('-- INSERT --');
    expect(await page.evaluate((selector) => document.activeElement?.matches(selector), INSERT)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => status(page)).toEqual({ text: 'NORMAL', children: 1 });
    expect(await page.evaluate((selector) => document.activeElement?.matches(selector), VIM_TEXT)).toBe(true);
  });

  test('a protected file’s field says read only; W10, E45, E37 and a written message are each announced once, and focus stays', async () => {
    const page = await openVim('vim about');
    await expect.poll(async () => (await status(page)).text).toMatch(/^about, read only, \d+ lines\. Type :q to leave\.$/);
    await page.locator(VIM_TEXT).focus();
    await page.keyboard.press('i');
    await page.locator(INSERT).waitFor();
    expect((await axNodes(page, INSERT))[0]!.name).toBe('about, read only');
    await page.keyboard.press('Escape');
    await page.keyboard.type('x');
    await expect.poll(async () => (await status(page)).text).toBe(siteText.terminal.vim.messages.W10);
    await vimEntry(page, ':', 'w');
    await expect.poll(async () => (await status(page)).text).toBe(siteText.terminal.vim.messages.E45);
    await vimEntry(page, ':', 'q');
    await expect.poll(async () => (await status(page)).text).toBe(siteText.terminal.vim.messages.E37);
    await vimEntry(page, ':', 'w ~/about-copy');
    await expect.poll(async () => (await status(page)).text).toContain('written');
    expect((await status(page)).children).toBe(1);
    expect(await vimView(page).count()).toBe(1);
  });

  test('opening a new file announces it new with 0 lines', async () => {
    const page = await openVim('vim notes.txt');
    await expect.poll(async () => (await status(page)).text).toBe('notes.txt, new, 0 lines. Type :q to leave.');
  });
});

describe('006-terminal-FR-029: headings, lists, links and controls a screen reader can move by', () => {
  test('a pipe’s output is text with no heading; help’s standard group is one list, a list item per name', async () => {
    const page = await openTerminalPage('desktop');
    const word = (resume.work?.[0]?.summary ?? '').split(/\W+/).find((part) => part.length > 4)!;
    const piped = await runGroup(page, `work | grep -i ${word}`);
    expect(await piped.locator('.run-output :is(h1, h2, h3, h4, h5, h6)').count()).toBe(0);
    expect(await piped.locator('.run-output p.out-line').count()).toBeGreaterThan(0);
    await runGroup(page, 'help');
    const run = '.terminal section.run:last-of-type .run-output';
    const [list] = await axNodes(page, `${run} ul.out-standard`);
    const items = await axNodes(page, `${run} ul.out-standard > *`);
    expect(list?.role).toBe('list');
    expect(items.filter((node) => !node.ignored && node.role === 'listitem')).toHaveLength(STANDARD_GROUP.length);
    expect(await page.locator(`${run} ul.out-standard`).count()).toBe(1);
  });

  test('one h1 Terminal, an h2 per run, an h3 per entry in work and projects with no section heading between, and no level skipped', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'work');
    await runGroup(page, 'projects');
    await runGroup(page, 'pwd');
    const headings = await outline(page);
    expect(headings.filter((heading) => heading.level === 1)).toEqual([{ level: 1, name: 'Terminal' }]);
    expect(headings.filter((heading) => heading.level === 2).map((heading) => heading.name)).toEqual(await typedLines(page));
    const under = (command: string) => {
      const start = headings.findIndex((heading) => heading.level === 2 && heading.name === command);
      const rest = headings.slice(start + 1);
      const end = rest.findIndex((heading) => heading.level <= 2);
      return rest.slice(0, end === -1 ? undefined : end);
    };
    expect(under('work').map((heading) => heading.level)).toEqual(resume.work!.map(() => 3));
    expect(under('projects').map((heading) => heading.level)).toEqual(resume.projects!.map(() => 3));
    for (const [index, heading] of headings.entries()) {
      if (index > 0) expect(heading.level - headings[index - 1]!.level, heading.name).toBeLessThanOrEqual(1);
    }
  });

  test('lists are ul, links are a, controls are buttons named by their line, and the reading order follows the boxes', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'work');
    await runGroup(page, 'help');
    await runGroup(page, 'contact');
    const kinds = await page.evaluate(() => {
      const output = [...document.querySelectorAll('.terminal section.run .run-output')];
      return {
        items: output.flatMap((each) => [...each.querySelectorAll('li')].map((item) => item.parentElement!.tagName.toLowerCase())),
        links: output.flatMap((each) => [...each.querySelectorAll('[href]')].map((link) => link.tagName.toLowerCase())),
        controls: output.flatMap((each) => [...each.querySelectorAll('.command-chip, .command-inline')].map((control) => ({ tag: control.tagName.toLowerCase(), name: control.getAttribute('aria-label'), text: (control.textContent ?? '').trim() }))),
      };
    });
    expect(kinds.items.length).toBeGreaterThan(0);
    expect(new Set(kinds.items)).toEqual(new Set(['ul']));
    expect(kinds.links.length).toBeGreaterThan(0);
    expect(new Set(kinds.links)).toEqual(new Set(['a']));
    expect(kinds.controls.length).toBeGreaterThan(20);
    for (const control of kinds.controls) {
      expect(control.tag, control.text).toBe('button');
      expect(control.name, control.text).toBeTruthy();
    }
    // Each heading, list item and paragraph starts at or below the one
    // before it, and a later one on the same row starts to its right.
    const boxes = await page.locator('.terminal section.run').evaluateAll((runs) =>
      runs.flatMap((run) => [...run.querySelectorAll('h2, h3, li, p, .out-line')].map((element) => element.getBoundingClientRect().toJSON() as DOMRect)),
    );
    for (const [index, rect] of boxes.entries()) {
      if (index === 0) continue;
      const before = boxes[index - 1]!;
      if (Math.abs(rect.top - before.top) < 1) expect(rect.left, `box ${index}`).toBeGreaterThanOrEqual(before.left);
      else expect(rect.top, `box ${index}`).toBeGreaterThanOrEqual(before.top);
    }
  });

  test('help’s commands, specs’ specs and history’s lines are list items, one per command, spec or line', async () => {
    const page = await openTerminalPage('desktop');
    const items = async (command: string, list: string) => {
      await runGroup(page, command);
      const run = '.terminal section.run:last-of-type .run-output';
      const [own] = await axNodes(page, `${run} ${list}`);
      const children = await axNodes(page, `${run} ${list} > *`);
      return { role: own?.role, items: children.filter((node) => !node.ignored && node.role === 'listitem').length, children: children.length };
    };
    expect(await items('help', '.out-help')).toEqual({ role: 'list', items: COMMANDS.length, children: COMMANDS.length });
    const specs = fs.readdirSync(path.join(REPO_ROOT, 'specs')).filter((folder) => /^\d+-/.test(folder) && fs.existsSync(path.join(REPO_ROOT, 'specs', folder, 'spec.md'))).length;
    expect(await items('specs', '.out-specs')).toEqual({ role: 'list', items: specs, children: specs });
    // help, specs and history itself.
    expect(await items('history', 'ul')).toEqual({ role: 'list', items: 3, children: 3 });
  });
});
