// The vim view as an editor on the real build (006 FR-065, FR-079 to FR-081,
// SC-016): insert mode through a real text area, writing the visitor's files
// through the worker, protected files refused, and the way out.
import type { Page } from 'playwright';
import { describe, expect, test, vi } from 'vitest';
import { axNodes } from '../helpers/ax.ts';
import { COMMAND_LINE, commandLineFocused, openTerminalPage, typeLine, vimEntry, vimView } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

const VIM = '.terminal section.vim';
const INSERT = `${VIM} textarea.vim-insert`;

const open = async (page: Page, line: string) => {
  await typeLine(page, line);
  await vimView(page).waitFor();
  await page.locator(`${VIM} .vim-text`).focus();
};
const lines = (page: Page) => page.locator(`${VIM} .vim-code`).allTextContents();
const status = async (page: Page) => (await page.locator(`${VIM} .vim-status`).textContent()) ?? '';
const message = async (page: Page) => (await page.locator(`${VIM} .vim-message-text`).textContent()) ?? '';
const focused = (page: Page, selector: string) => page.evaluate((target) => document.activeElement?.matches(target) ?? false, selector);
const leave = async (page: Page, typed = 'q!') => {
  await vimEntry(page, ':', typed);
  await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
};
const lastRun = async (page: Page, line: string) => {
  await typeLine(page, line);
  return (await page.locator('.terminal section.run').last().locator('.run-output').textContent()) ?? '';
};
const color = (page: Page, token: string) =>
  page.evaluate((name) => {
    const probe = document.createElement('i');
    probe.style.color = `var(--token-${name})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, token);
const colorOf = (page: Page, selector: string) => page.locator(selector).evaluate((element) => getComputedStyle(element).color);

describe('006-terminal-FR-079: typing in insert mode', () => {
  test('i focuses the text area with its caret at the cursor; keys edit the buffer; Escape returns', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.keyboard.press('i');
    expect(await focused(page, INSERT)).toBe(true);
    expect(await status(page)).toContain('-- INSERT --');
    await page.keyboard.type('abc');
    await page.keyboard.press('Enter');
    await page.keyboard.type('xy');
    await page.keyboard.press('Backspace');
    expect(await lines(page)).toEqual(['abc', 'x']);
    expect(await page.locator(INSERT).evaluate((area: HTMLTextAreaElement) => [area.value, area.selectionStart])).toEqual(['abc\nx', 5]);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Delete');
    expect(await lines(page)).toEqual(['abc', '']);
    await page.keyboard.press('Escape');
    expect(await focused(page, `${VIM} .vim-text`)).toBe(true);
    expect(await page.locator(INSERT).count()).toBe(0);
    expect(await status(page)).toContain('NORMAL');
  });

  test('a composition’s input reaches the buffer', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.keyboard.press('i');
    await page.locator(INSERT).evaluate((area: HTMLTextAreaElement) => {
      area.dispatchEvent(new CompositionEvent('compositionstart'));
      area.value = 'é';
      area.dispatchEvent(new InputEvent('input', { isComposing: true, data: 'é' }));
      area.dispatchEvent(new CompositionEvent('compositionend', { data: 'é' }));
    });
    expect(await lines(page)).toEqual(['é']);
    expect(await page.locator(INSERT).inputValue()).toBe('é');
  });

  test('a click on a character moves the cursor there, in both modes', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.keyboard.type('ihello world');
    await page.keyboard.press('Escape');
    const code = page.locator(`${VIM} .vim-code`).first();
    const box = (await code.boundingBox())!;
    const width = box.width;
    expect(width).toBeGreaterThan(0);
    const advance = await page.evaluate(() => {
      const probe = document.querySelector('.terminal .vim-code .json-string')!;
      return probe.getBoundingClientRect().width / (probe.textContent?.length ?? 1);
    });
    await page.mouse.click(box.x + advance * 2.5, box.y + box.height / 2);
    expect(await page.locator(`${VIM} .vim-position`).textContent()).toBe('1,3');
    await page.keyboard.press('i');
    await page.mouse.click(box.x + advance * 6.5, box.y + box.height / 2);
    expect(await page.locator(`${VIM} .vim-position`).textContent()).toBe('1,7');
    expect(await focused(page, INSERT)).toBe(true);
  });

  test('the insert cursor is a bar of color.terminal-cursor, not a box', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.keyboard.press('i');
    const bar = page.locator(`${VIM} .vim-insert-bar`);
    expect(await bar.evaluate((element) => getComputedStyle(element).borderInlineStartWidth)).toBe('2px');
    expect(await bar.evaluate((element) => getComputedStyle(element).borderInlineStartColor)).toBe(await color(page, 'color-terminal-cursor'));
    expect(await page.locator(`${VIM} .vim-cursor`).count()).toBe(0);
  });
});

describe('006-terminal-FR-080: writing the visitor’s files', () => {
  test(':wq closes with focus in the command line; cat prints the line and ls lists it; a restarted worker keeps it', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim notes.txt');
    await page.keyboard.type('iship it');
    await page.keyboard.press('Escape');
    await leave(page, 'wq');
    expect(await commandLineFocused(page)).toBe(true);
    expect(await lastRun(page, 'cat notes.txt')).toContain('ship it');
    expect(await lastRun(page, 'ls')).toContain('notes.txt');
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('while true; do :; done');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Control+C');
    await page.waitForSelector('.terminal[data-shell-state="ready"]');
    expect(await lastRun(page, 'cat notes.txt')).toContain('ship it');
  });

  test(':w shows vim’s message, clears [+]; a missing folder gives E212; :q with changes E37, :q! leaves the file as it was', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.keyboard.type('ione');
    await page.keyboard.press('Escape');
    expect(await status(page)).toContain('[+]');
    await vimEntry(page, ':', 'w');
    await expect.poll(() => message(page)).toBe('"todo" [New] 1L, 4B written');
    expect(await status(page)).not.toContain('[+]');
    await vimEntry(page, ':', 'w ~/nowhere/x');
    await expect.poll(() => message(page)).toBe(`"~/nowhere/x" E212: Can't open file for writing`);
    await page.locator(`${VIM} .vim-text`).focus();
    await page.keyboard.type('otwo');
    await page.keyboard.press('Escape');
    await vimEntry(page, ':', 'q');
    expect(await message(page)).toBe('E37: No write since last change (add ! to override)');
    expect(await colorOf(page, `${VIM} .vim-message-text`)).toBe(await color(page, 'color-terminal-error'));
    await leave(page);
    expect((await lastRun(page, 'cat todo')).trim()).toBe('one');
  });
});

describe('006-terminal-FR-081: a protected file', () => {
  test('dd shows W10 in amber and [RO] [+]; :w shows E45; after :q! cat about is unchanged', async () => {
    const page = await openTerminalPage('desktop');
    const about = await lastRun(page, 'cat about');
    await open(page, 'vim about');
    await page.keyboard.type('dd');
    expect(await message(page)).toBe('W10: Warning: Changing a readonly file');
    expect(await colorOf(page, `${VIM} .vim-message-text`)).toBe(await color(page, 'color-vim-warning'));
    const line = await status(page);
    expect(line).toContain('[RO]');
    expect(line).toContain('[+]');
    await vimEntry(page, ':', 'w');
    expect(await message(page)).toBe(`E45: 'readonly' option is set (add ! to override)`);
    expect(await colorOf(page, `${VIM} .vim-message-text`)).toBe(await color(page, 'color-terminal-error'));
    await leave(page);
    expect(await lastRun(page, 'cat about')).toBe(about);
  });

  test(':w ~/about-copy makes a file holding the change', async () => {
    const page = await openTerminalPage('desktop');
    const about = await lastRun(page, 'cat about');
    await open(page, 'vim about');
    await page.keyboard.type('dd');
    await vimEntry(page, ':', 'w ~/about-copy');
    await expect.poll(() => message(page)).toContain('"~/about-copy" [New]');
    expect(await status(page)).toContain('[+]');
    await leave(page);
    const copy = await lastRun(page, 'cat about-copy');
    expect(copy.length).toBeGreaterThan(0);
    expect(copy).not.toBe(about);
  });
});

describe('006-terminal-FR-065 and SC-016: focus is never trapped', () => {
  test('in insert mode Tab inserts a tab; Shift+Tab leaves backwards; Escape then Tab goes to the :help chip; no later Tab is taken', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.evaluate(() => {
      (window as unknown as { tabs: boolean[] }).tabs = [];
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Tab') (window as unknown as { tabs: boolean[] }).tabs.push(event.defaultPrevented);
      });
    });
    await page.keyboard.press('i');
    await page.keyboard.press('Tab');
    expect(await lines(page)).toEqual(['\t']);
    expect(await focused(page, INSERT)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate((view) => document.activeElement?.closest(view) === null, VIM)).toBe(true);
    await page.locator(INSERT).focus();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.textContent)).toBe(':help');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => (window as unknown as { tabs: boolean[] }).tabs)).toEqual([true, false, false, false, false]);
  });

  test('the text area is a field named after the file', async () => {
    const page = await openTerminalPage('desktop');
    await open(page, 'vim todo');
    await page.keyboard.press('i');
    expect((await axNodes(page, INSERT))[0]!.name).toBe('todo, new');
  });
});
