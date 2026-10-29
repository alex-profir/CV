// What a screen reader gets from the Terminal (FR-027 to FR-029): a named
// command line with no prompt read, each output announced once through the
// status region, and a heading outline of runs and entries.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { axNodes } from '../helpers/ax.ts';
import { COMMAND_LINE, commandLineFocused, openTerminalPage, runGroup, typedLines } from '../helpers/terminal.ts';

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
    expect(await status(page)).toEqual({ text: '~', children: 1 });
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
    expect(await status(page)).toEqual({ text: '~', children: 1 });
    await page.locator(COMMAND_LINE).fill('cd work');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await status(page)).text).toBe('Now in ~/work');
    await page.locator(COMMAND_LINE).fill('clear');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await status(page)).text).toBe('Cleared');
  });
});

describe('006-terminal-FR-029: headings, lists, links and controls a screen reader can move by', () => {
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
});
