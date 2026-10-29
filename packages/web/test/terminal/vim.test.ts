// `jq` and the read-only vim view (FR-056, FR-058 to FR-064): the CV's JSON
// colored in the output, and in a vim view with folds, search, wrapping and
// a way back.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { resume } from '@cv/content';
import { axNodes } from '../helpers/ax.ts';
import { box, drag, openShell, settle } from '../helpers/shell.ts';
import {
  COMMAND_LINE,
  commandLineFocused,
  fixtureBuild,
  openTerminal,
  openTerminalPage,
  openVimView,
  quitVim,
  runCount,
  runGroup,
  SHELL_PAGE,
  typedLines,
  vimEntry,
  vimView,
} from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 240_000 });

// What `cat cv.json | jq` prints: the CV document's JSON, 2-space indents.
const CV_JSON = JSON.stringify(resume, null, 2);
const CV_LINES = CV_JSON.split('\n');

const WINDOW = '#os .window[data-view="terminal"]';
const VIM = '.terminal section.vim';

const words = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();
const status = async (page: Page) => words(await page.locator(`${VIM} .vim-status`).textContent());
const message = async (page: Page) => words(await page.locator(`${VIM} .vim-message`).textContent());

describe('006-terminal-FR-056: cat cv.json | jq prints the JSON colored, in the output', () => {
  test('colored rows whose text is the printed JSON, with no vim view', async () => {
    const page = await openTerminalPage('desktop');
    const group = await runGroup(page, 'cat cv.json | jq');
    expect(await vimView(page).count()).toBe(0);
    const json = group.locator('[data-req~="006-terminal-FR-056"]');
    expect(await json.count()).toBeGreaterThan(0);
    const rows = (await group.locator('.run-output').evaluate((output) => (output as HTMLElement).innerText))
      .split('\n')
      .map((row) => row.trim())
      .filter((row) => row !== '');
    expect(rows).toEqual(CV_LINES.map((row) => row.trim()));
    // Keys, strings and punctuation each have their own color.
    const colors = await json.evaluateAll((elements) => {
      const found = new Set<string>();
      for (const element of elements) {
        for (const span of element.querySelectorAll('span')) {
          if (span.children.length === 0 && (span.textContent ?? '').trim() !== '') found.add(getComputedStyle(span).color);
        }
      }
      return [...found];
    });
    expect(colors.length).toBeGreaterThanOrEqual(3);
  });
});

describe('006-terminal-FR-058: the vim view fills the window, with line numbers, a status line and a message line', () => {
  test('cv opens it with NORMAL, the name, [RO], json, line and column and position, and the opening message', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    expect(await page.locator('.terminal .terminal-screen').count()).toBe(0);
    const view = (await box(page, VIM))!;
    const content = (await box(page, `${WINDOW} .window-content`))!;
    for (const key of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(view[key] - content[key]), key).toBeLessThanOrEqual(1);
    const numbers = await page.locator(`${VIM} .vim-number`).evaluateAll((list) => list.map((number) => (number.textContent ?? '').trim()).filter((text) => text !== ''));
    expect(numbers.slice(0, 3)).toEqual(['1', '2', '3']);
    expect(numbers.at(-1)).toBe(String(CV_LINES.length));
    const line = await status(page);
    for (const part of ['NORMAL', 'cv.json', '[RO]', 'json', '3,1']) expect(line, part).toContain(part);
    expect(await page.locator(`${VIM} .vim-scroll`).textContent()).toMatch(/^(?:Top|Bot|All|\d+%)$/);
    expect(await message(page)).toContain(`"cv.json" [readonly] ${CV_LINES.length} lines`);
    expect(await page.locator(`${VIM} .vim-message button.command-chip`).evaluateAll((list) => list.map((chip) => chip.textContent?.trim()))).toEqual([':help', ':q']);
    expect((await page.locator(`${WINDOW} .window-title`).textContent())?.trim()).toBe('Terminal — vim');
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.terminal section.vim .vim-text') ?? false)).toBe(true);
  });

  test('the position is how far through the file the view is: All or Top on opening, Bot after zR and G, a share between', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    const text = page.locator(`${VIM} .vim-text`);
    const scroll = () => page.locator(`${VIM} .vim-scroll`).textContent();
    const fits = await text.evaluate((view) => view.scrollHeight <= view.clientHeight);
    expect(await scroll()).toBe(fits ? 'All' : 'Top');
    await text.focus();
    await page.keyboard.type('zR');
    await expect.poll(scroll).toBe('Top');
    await page.keyboard.press('G');
    await expect.poll(scroll).toBe('Bot');
    // Scrolled halfway by the view's own scroll, the cursor left where it is.
    await text.evaluate((view) => (view.scrollTop = (view.scrollHeight - view.clientHeight) / 2));
    await expect.poll(scroll).toMatch(/^\d+%$/);
    const share = Number((await scroll())!.slice(0, -1));
    expect(share).toBeGreaterThan(30);
    expect(share).toBeLessThan(70);
    await page.keyboard.type('gg');
    await expect.poll(scroll).toBe('Top');
  });
});

describe('006-terminal-FR-059: cv runs cat cv.json | jq | vim -', () => {
  test('the status line shows the pipe', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    expect(await status(page)).toContain('cat cv.json | jq | vim -');
  });
});

describe('006-terminal-FR-060: the vim view takes no browser key', () => {
  test('Ctrl+D, Ctrl+F and Ctrl+U reach the page without being prevented, and change nothing', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await page.evaluate(() => {
      (window as unknown as { seen: string[] }).seen = [];
      window.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.key !== 'Control') (window as unknown as { seen: string[] }).seen.push(`${event.key}:${event.defaultPrevented}`);
      });
    });
    const before = await status(page);
    await page.locator(`${VIM} .vim-text`).focus();
    for (const key of ['Control+d', 'Control+f', 'Control+u']) await page.keyboard.press(key);
    expect(await page.evaluate(() => (window as unknown as { seen: string[] }).seen)).toEqual(['d:false', 'f:false', 'u:false']);
    expect(await status(page)).toBe(before);
  });
});

describe('006-terminal-FR-061: a fold line is a button that opens and closes its fold', () => {
  test('aria-expanded, toggled by click, at least 24 × 24 px', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    const folds = page.locator(`${VIM} button.vim-fold`);
    expect(await folds.count()).toBe(7);
    expect(await folds.evaluateAll((list) => list.map((fold) => fold.getAttribute('aria-expanded')))).toEqual(Array(7).fill('false'));
    const work = folds.filter({ hasText: '"work"' });
    const target = (await work.boundingBox())!;
    expect(target.width).toBeGreaterThanOrEqual(24);
    expect(target.height).toBeGreaterThanOrEqual(24);
    await work.click();
    await expect.poll(() => work.getAttribute('aria-expanded')).toBe('true');
    expect(await page.locator(`${VIM} .vim-line`).count()).toBeGreaterThan(11);
  });

  test('by keyboard alone: j to the "work" fold line, then Enter and Space each toggle it, focus staying on the text', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.terminal section.vim .vim-text') ?? false)).toBe(true);
    const work = page.locator(`${VIM} button.vim-fold`).filter({ hasText: '"work"' });
    const workLine = await work.evaluate((fold) => Number(fold.closest('.vim-line')!.getAttribute('data-line')));
    const at = async () => words(await page.locator(`${VIM} .vim-position`).textContent());
    for (let step = 0; step < 20 && (await at()) !== `${workLine + 1},1`; step += 1) await page.keyboard.press('j');
    expect(await at()).toBe(`${workLine + 1},1`);
    expect(await work.getAttribute('aria-expanded')).toBe('false');
    await page.keyboard.press('Enter');
    await expect.poll(() => work.getAttribute('aria-expanded')).toBe('true');
    await page.keyboard.press(' ');
    await expect.poll(() => work.getAttribute('aria-expanded')).toBe('false');
    expect(await page.evaluate(() => document.activeElement?.matches('.terminal section.vim .vim-text') ?? false)).toBe(true);
  });
});

describe('006-terminal-FR-062: a search marks every match, the current one by more than color', () => {
  test('/REST marks the matches, the current one with aria-current and an outline, and says match 1 of n', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    const count = (CV_JSON.match(/rest/gi) ?? []).length;
    expect(count).toBeGreaterThan(1);
    await vimEntry(page, '/', 'REST');
    await settle(page);
    const marks = page.locator(`${VIM} mark`);
    expect(await marks.count()).toBeGreaterThan(0);
    expect(await marks.evaluateAll((list) => list.every((mark) => (mark.textContent ?? '').toLowerCase() === 'rest'))).toBe(true);
    const current = page.locator(`${VIM} mark[aria-current="true"]`);
    expect(await current.count()).toBe(1);
    const outline = await current.evaluate((mark) => {
      const style = getComputedStyle(mark);
      return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThan(0);
    expect(await message(page)).toContain(`match 1 of ${count}`);
  });
});

describe('006-terminal-FR-063: long lines wrap under their line, with no horizontal scroll', () => {
  test('with the long-words fixture in a 400 px window, a wrapped row starts 2 characters past its line’s text, numbered on its first row only', async () => {
    const { url } = await fixtureBuild('long-words');
    const page = await openShell({ ...SHELL_PAGE.desktop, url });
    await openTerminal(page, 'desktop');
    const corner = (await box(page, `${WINDOW} .resize-se`))!;
    const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
    await drag(page, from, { x: from.x - 500, y: from.y });
    expect((await box(page, WINDOW))!.width).toBe(400);
    await page.locator(`${WINDOW} input.command-line`).focus();
    await openVimView(page);
    await page.locator(`${VIM} .vim-text`).focus();
    await page.keyboard.press('z');
    await page.keyboard.press('Shift+R');
    await settle(page);
    expect(await page.locator(`${VIM} button.vim-fold[aria-expanded="false"]`).count()).toBe(0);
    for (const selector of [VIM, `${VIM} .vim-text`]) {
      expect(await page.locator(selector).evaluate((element) => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(0);
    }
    const wrapped = await page.evaluate((view) => {
      for (const line of document.querySelectorAll(`${view} .vim-line`)) {
        const code = line.querySelector('.vim-code');
        if (code === null) continue;
        const chars: { char: string; rect: DOMRect }[] = [];
        const walker = document.createTreeWalker(code, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
          const text = node.textContent ?? '';
          for (let at = 0; at < text.length; at += 1) {
            const range = document.createRange();
            range.setStart(node, at);
            range.setEnd(node, at + 1);
            const rect = range.getClientRects()[0];
            if (rect !== undefined && rect.width > 0) chars.push({ char: text[at]!, rect });
          }
        }
        const visible = chars.filter((entry) => entry.char.trim() !== '');
        if (visible.length === 0) continue;
        const height = visible[0]!.rect.height;
        const firstTop = visible[0]!.rect.top;
        const second = visible.find((entry) => entry.rect.top > firstTop + height / 2);
        if (second === undefined) continue;
        const number = line.querySelector('.vim-number');
        const numberRange = document.createRange();
        if (number !== null) numberRange.selectNodeContents(number);
        const numberTops = number === null ? [] : [...new Set([...numberRange.getClientRects()].filter((rect) => rect.width > 0).map((rect) => Math.round(rect.top)))];
        return { advance: visible[0]!.rect.width, first: visible[0]!.rect.left, second: second.rect.left, firstTop, numberTops };
      }
      return null;
    }, VIM);
    expect(wrapped).not.toBeNull();
    const { advance, first, second, firstTop, numberTops } = wrapped!;
    expect(Math.abs(second - first - 2 * advance), `${second} − ${first} for ${advance}`).toBeLessThanOrEqual(1);
    expect(numberTops).toHaveLength(1);
    expect(Math.abs(numberTops[0]! - firstTop)).toBeLessThanOrEqual(2);
  });
});

describe('006-terminal-FR-064: :q and the :q chip go back to the output; :help opens the key help', () => {
  test(':q restores the output with cv after its prompt and a new prompt, focus in the command line', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'about');
    await openVimView(page);
    await quitVim(page);
    expect(await vimView(page).count()).toBe(0);
    expect(await typedLines(page)).toEqual(['about', 'cv']);
    expect(await page.evaluate(() => document.querySelector('.terminal section.run:last-of-type')!.nextElementSibling?.matches('form.prompt-line'))).toBe(true);
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('');
    await expect.poll(() => commandLineFocused(page)).toBe(true);
    expect((await page.locator(`${WINDOW} .window-title`).textContent())?.trim()).toBe('Terminal — ~');
  });

  test('006-terminal-FR-019: after a long output, :q shows the cv run and the whole command line in the screen, focus in it', async () => {
    const page = await openTerminalPage('desktop');
    await runGroup(page, 'help');
    await runGroup(page, 'work');
    await openVimView(page);
    await quitVim(page);
    await settle(page);
    const screen = (await box(page, '.terminal .terminal-screen'))!;
    const heading = (await box(page, '.terminal section.run:last-of-type .run-command'))!;
    const line = (await box(page, '.terminal form.prompt-line'))!;
    for (const [name, part] of [['cv run heading', heading], ['command line', line]] as const) {
      expect(part.y, name).toBeGreaterThanOrEqual(screen.y - 1);
      expect(part.y + part.height, name).toBeLessThanOrEqual(screen.y + screen.height + 1);
    }
    expect(await typedLines(page)).toEqual(['help', 'work', 'cv']);
    await expect.poll(() => commandLineFocused(page)).toBe(true);
  });

  test('the :q chip does the same', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await vimView(page).getByRole('button', { name: ':q', exact: true }).click();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect(await typedLines(page)).toEqual(['cv']);
    expect(await runCount(page)).toBe(1);
    await expect.poll(() => commandLineFocused(page)).toBe(true);
  });

  test('the :help chip opens the key help in a split; the first :q closes it, the second the view', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await vimView(page).getByRole('button', { name: ':help', exact: true }).click();
    const help = page.locator(`${VIM} .vim-help`);
    await help.waitFor();
    expect(words(await help.textContent())).toContain('KEYS FOR cv.json');
    expect(await page.locator(`${VIM} .vim-text`).isVisible()).toBe(true);
    await vimView(page).getByRole('button', { name: ':q', exact: true }).click();
    await expect.poll(() => help.count()).toBe(0);
    expect(await vimView(page).count()).toBe(1);
    await vimView(page).getByRole('button', { name: ':q', exact: true }).click();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect(await typedLines(page)).toEqual(['cv']);
  });

  test('with a / search being typed, the :q chip still closes the view, focus in the command line', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await page.locator(`${VIM} .vim-text`).focus();
    await page.keyboard.press('/');
    await page.locator(`${VIM} input.vim-entry`).waitFor();
    await vimView(page).getByRole('button', { name: ':q', exact: true }).click();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect(await vimView(page).count()).toBe(0);
    expect(await typedLines(page)).toEqual(['cv']);
    await expect.poll(() => commandLineFocused(page)).toBe(true);
  });

  test('with a / search being typed, the :help chip still opens the key help', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await page.locator(`${VIM} .vim-text`).focus();
    await page.keyboard.press('/');
    await page.locator(`${VIM} input.vim-entry`).waitFor();
    await vimView(page).getByRole('button', { name: ':help', exact: true }).click();
    await page.locator(`${VIM} .vim-help`).waitFor();
    expect(await page.locator(`${VIM} input.vim-entry`).count()).toBe(0);
    expect(await message(page)).not.toContain('match');
  });
});

describe('006-terminal-FR-065: a screen reader hears the vim view, and focus is never trapped', () => {
  const STATUS = '.terminal .terminal-status[role="status"]';
  const spoken = (page: Page) => page.locator(STATUS).evaluate((element) => ({ text: (element.textContent ?? '').trim(), children: element.children.length }));

  test('on opening, focus is on .vim-text, named and read only, and the status region says the file, read only, its lines and :q', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.terminal section.vim .vim-text') ?? false)).toBe(true);
    const [text] = await axNodes(page, `${VIM} .vim-text`);
    expect(text!.name).toBe('cv.json (read only)');
    expect(await page.locator(`${VIM} .vim-text`).getAttribute('role')).toBe('document');
    expect(await spoken(page)).toEqual({ text: `cv.json, read only, ${CV_LINES.length} lines. Type :q to leave.`, children: 1 });
  });

  test('a message change is announced once; fold lines say whether they are open', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await vimEntry(page, '/', 'REST');
    const shown = (await message(page)).replace(/\s*:help\s*:q$/, '');
    expect(shown).toContain('match 1 of');
    await expect.poll(async () => words((await spoken(page)).text)).toBe(shown);
    const announced = (await page.locator(`${STATUS} > *`).elementHandle())!;
    // A move that keeps the message says nothing new.
    await page.locator(`${VIM} .vim-text`).focus();
    await page.keyboard.press('j');
    await settle(page);
    expect(await announced.evaluate((element) => element.isConnected)).toBe(true);
    expect((await spoken(page)).children).toBe(1);
    const folds = await page.locator(`${VIM} button.vim-fold`).evaluateAll((list) => list.map((fold) => fold.getAttribute('aria-expanded')));
    expect(folds.length).toBeGreaterThan(0);
    for (const value of folds) expect(['true', 'false']).toContain(value);
  });

  test('Tab moves to the chips, then out of the Terminal, and Shift+Tab comes back', async () => {
    const page = await openTerminalPage('desktop');
    await openVimView(page);
    await page.locator(`${VIM} .vim-text`).focus();
    const at = (selector: string) => page.evaluate((query) => document.activeElement?.matches(query) ?? false, selector);
    const stops: string[] = [];
    for (let step = 0; step < 40; step += 1) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(() => document.activeElement?.closest('.terminal') === null)) break;
      stops.push(await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? ''));
    }
    // The fold lines come first, then the :help and :q chips, then out.
    expect(stops.slice(-2)).toEqual([':help', ':q']);
    expect(await page.evaluate(() => document.activeElement?.closest('.terminal') === null)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await at(`${VIM} button.command-chip[aria-label=":q"]`)).toBe(true);
  });
});
