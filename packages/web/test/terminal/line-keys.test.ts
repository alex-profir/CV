// A terminal's keys in the command line (006 research R37, FR-074, FR-026):
// the system's editing keys are the field's own, with the mirror's cursor
// and selection following them; on macOS the Terminal adds readline's
// Ctrl keys; and no key a browser or screen reader keeps is taken.
//
// Playwright gives a key the macOS editing command (Cmd+Left, Option+Right…)
// by the machine it runs on, not by the page's platform, so the system's
// macOS keys are checked on a Mac and the Linux and Windows keys elsewhere.
// The Terminal's own keys follow the page's platform, and run everywhere.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { openShell } from '../helpers/shell.ts';
import { COMMAND_LINE, openTerminal, runCount, runGroup, SHELL_PAGE, vimView } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

type Platform = 'macOS' | 'Windows' | 'Linux';
const MAC_HOST = process.platform === 'darwin';
const LINE = 'cat cv.json | jq';

async function terminalOn(platform: Platform): Promise<Page> {
  const page = await openShell({ ...SHELL_PAGE.desktop, platform });
  await openTerminal(page, 'desktop');
  return page;
}

async function typed(page: Page, text: string): Promise<void> {
  await page.locator(COMMAND_LINE).focus();
  await page.keyboard.type(text);
}

// The field's value and selection, and where the mirror draws its cursor
// (the text before the cursor's block) and its selection.
const field = (page: Page) =>
  page.locator(COMMAND_LINE).evaluate((input: HTMLInputElement) => {
    const mirror = input.parentElement!.querySelector('.cursor-mirror')!;
    let before = 0;
    for (const node of mirror.childNodes) {
      if (node instanceof Element && node.classList.contains('cursor-block')) break;
      before += node.textContent?.length ?? 0;
    }
    const selected = mirror.querySelector('.cursor-selected');
    return {
      value: input.value,
      start: input.selectionStart!,
      end: input.selectionEnd!,
      caret: input.selectionDirection === 'backward' ? input.selectionStart! : input.selectionEnd!,
      cursor: before,
      selected: selected?.textContent ?? '',
      cursorText: mirror.querySelector('.cursor-block')?.textContent ?? '',
      selectedBackground: selected === null ? '' : getComputedStyle(selected).backgroundColor,
    };
  });

// The mirror's cursor sits at the field's caret.
async function cursorFollows(page: Page, step: string): Promise<number> {
  const now = await field(page);
  expect(now.cursor, step).toBe(now.caret);
  return now.caret;
}

describe('006-terminal-FR-074: the readline keys on macOS', () => {
  test('Ctrl+A, Ctrl+E, Ctrl+B and Ctrl+F move; Ctrl+K, Ctrl+U and Ctrl+W delete; Ctrl+L clears the output and keeps the line', async () => {
    const page = await terminalOn('macOS');
    await runGroup(page, 'about');
    await typed(page, LINE);
    await page.keyboard.press('Control+A');
    expect(await cursorFollows(page, 'Ctrl+A')).toBe(0);
    await page.keyboard.press('Control+F');
    expect(await cursorFollows(page, 'Ctrl+F')).toBe(1);
    await page.keyboard.press('Control+E');
    expect(await cursorFollows(page, 'Ctrl+E')).toBe(LINE.length);
    await page.keyboard.press('Control+B');
    expect(await cursorFollows(page, 'Ctrl+B')).toBe(LINE.length - 1);
    await page.keyboard.press('Control+E');
    await page.keyboard.press('Control+W');
    expect((await field(page)).value).toBe('cat cv.json | ');
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Control+F');
    await page.keyboard.press('Control+F');
    await page.keyboard.press('Control+F');
    await page.keyboard.press('Control+K');
    expect((await field(page)).value).toBe('cat');
    await page.keyboard.press('Control+U');
    expect((await field(page)).value).toBe('');
    await page.keyboard.type('ls');
    expect(await runCount(page)).toBe(1);
    await page.keyboard.press('Control+L');
    await expect.poll(() => runCount(page)).toBe(0);
    expect((await field(page)).value).toBe('ls');
  });

  test.skipIf(!MAC_HOST)('US5 scenario 8: Cmd+Left, Option+Right and Cmd+Right, the mirror following; undo, redo, a selection, and the delete keys', async () => {
    const page = await terminalOn('macOS');
    await typed(page, LINE);
    await page.keyboard.press('Meta+ArrowLeft');
    expect(await cursorFollows(page, 'Cmd+Left')).toBe(0);
    const first = (await (await page.keyboard.press('Alt+ArrowRight'), cursorFollows(page, 'Option+Right')));
    const second = (await (await page.keyboard.press('Alt+ArrowRight'), cursorFollows(page, 'Option+Right again')));
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    await page.keyboard.press('Meta+ArrowRight');
    expect(await cursorFollows(page, 'Cmd+Right')).toBe(16);
    // Ctrl+W, then the system's undo and redo.
    await page.keyboard.press('Control+W');
    expect((await field(page)).value).toBe('cat cv.json | ');
    await page.keyboard.press('Meta+Z');
    await expect.poll(async () => (await field(page)).value).toBe(LINE);
    await page.keyboard.press('Meta+Shift+Z');
    await expect.poll(async () => (await field(page)).value).toBe('cat cv.json | ');
    await page.keyboard.press('Meta+Z');
    // Shift+Option+Left selects the word, drawn in the selection colors.
    await page.keyboard.press('Meta+ArrowRight');
    await page.keyboard.press('Shift+Alt+ArrowLeft');
    // Selected backward: the cursor's block on its first letter, the rest
    // in the selection's colors.
    const selection = await field(page);
    expect(selection.value.slice(selection.start, selection.end)).toBe('jq');
    expect(selection.cursor).toBe(selection.start);
    expect(selection.cursorText + selection.selected).toBe('jq');
    expect(selection.selectedBackground).toBe('rgb(129, 140, 248)');
    await page.keyboard.press('Meta+ArrowRight');
    await page.keyboard.press('Alt+Backspace');
    expect((await field(page)).value).toBe('cat cv.json | ');
    await page.keyboard.press('Meta+ArrowLeft');
    await page.keyboard.press('Delete');
    expect((await field(page)).value).toBe('at cv.json | ');
    await page.keyboard.press('Meta+ArrowRight');
    await page.keyboard.press('Meta+Backspace');
    expect((await field(page)).value).toBe('');
  });
});

describe.each<Platform>(['Linux', 'Windows'])('006-terminal-FR-074: the field’s keys on %s', (platform) => {
  test.skipIf(MAC_HOST)('Home, End, Ctrl+Left, Ctrl+Right, Ctrl+Backspace and Shift+Home, the mirror following; undo and redo', async () => {
    const page = await terminalOn(platform);
    await typed(page, LINE);
    await page.keyboard.press('Home');
    expect(await cursorFollows(page, 'Home')).toBe(0);
    await page.keyboard.press('Control+ArrowRight');
    expect(await cursorFollows(page, 'Ctrl+Right')).toBeGreaterThan(0);
    await page.keyboard.press('End');
    expect(await cursorFollows(page, 'End')).toBe(16);
    await page.keyboard.press('Control+ArrowLeft');
    expect(await cursorFollows(page, 'Ctrl+Left')).toBe(14);
    await page.keyboard.press('End');
    await page.keyboard.press('Control+Backspace');
    expect((await field(page)).value).toBe('cat cv.json | ');
    await page.keyboard.press('Control+Z');
    await expect.poll(async () => (await field(page)).value).toBe(LINE);
    await page.keyboard.press(platform === 'Windows' ? 'Control+Y' : 'Control+Shift+Z');
    await expect.poll(async () => (await field(page)).value).toBe('cat cv.json | ');
    await page.keyboard.press('Shift+Home');
    const selection = await field(page);
    expect(selection.selected).toBe('cat cv.json | ');
    expect(selection.cursor).toBe(0);
  });
});

describe('006-terminal-FR-026: no key a browser or screen reader keeps is taken', () => {
  // The keys the Terminal never takes, on each platform (research R37).
  const RESERVED: Record<Platform, readonly string[]> = {
    // Tab with text typed completes (keyboard.test.ts sets its rules); Shift+Tab
    // and every modified Tab don't.
    macOS: ['Meta+L', 'Meta+W', 'Meta+T', 'Alt+Shift+N', 'Alt+Shift+W', 'Alt+Shift+M', 'Shift+Tab', 'Control+Tab', 'Alt+Tab', 'Meta+Tab', 'Control+Alt+ArrowRight'],
    Windows: ['Control+W', 'Control+L', 'Control+U', 'Control+K', 'Control+E', 'Alt+Shift+N', 'Alt+Shift+W', 'Alt+Shift+M', 'Shift+Tab', 'Control+Tab', 'Alt+Tab', 'Meta+Tab'],
    Linux: ['Control+W', 'Control+L', 'Control+U', 'Control+K', 'Control+E', 'Alt+Shift+N', 'Alt+Shift+W', 'Alt+Shift+M', 'Shift+Tab', 'Control+Tab', 'Alt+Tab', 'Meta+Tab'],
  };

  for (const platform of ['macOS', 'Windows', 'Linux'] as const) {
    test(`on ${platform}, each reserved key reaches the browser`, async () => {
      const page = await terminalOn(platform);
      // Taken by the Terminal: not prevented when it reaches the command
      // line, prevented once React's handlers on `#os` have run. The OS
      // shell's own shortcuts (005) are handled before, on the document.
      await page.evaluate(() => {
        const store = window as unknown as { taken: string[]; before: boolean };
        store.taken = [];
        document.getElementById('os')!.addEventListener('keydown', (event) => {
          if (event.defaultPrevented && !store.before) store.taken.push(event.key);
        });
      });
      const watchLine = () =>
        page.evaluate((selector) => {
          const store = window as unknown as { before: boolean };
          document.querySelector(selector)!.addEventListener('keydown', (event) => (store.before = event.defaultPrevented), true);
        }, COMMAND_LINE);
      await watchLine();
      for (const key of RESERVED[platform]) {
        // Each from the command line, with text in it.
        await page.locator(COMMAND_LINE).focus();
        await page.locator(COMMAND_LINE).fill('abc');
        await page.keyboard.press(key).catch(() => undefined);
        const taken = await page.evaluate(() => (window as unknown as { taken: string[] }).taken.splice(0));
        expect(taken, `${platform} ${key}`).toEqual([]);
        // A shortcut that moved focus or opened something is undone.
        await page.keyboard.press('Escape');
        // Alt+Shift+W is the OS shell's close: the Terminal opens again.
        if (key === 'Alt+Shift+W') {
          await page.locator(COMMAND_LINE).waitFor({ state: 'detached' });
          await openTerminal(page, 'desktop');
          await watchLine();
        }
      }
    });

    test(`on ${platform}, Tab on an empty line reaches the browser`, async () => {
      const page = await terminalOn(platform);
      await page.locator(COMMAND_LINE).focus();
      await page.evaluate(() => {
        const store = window as unknown as { tabTaken: boolean | null };
        store.tabTaken = null;
        document.getElementById('os')!.addEventListener('keydown', (event) => {
          if (event.key === 'Tab') store.tabTaken = event.defaultPrevented;
        });
      });
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => (window as unknown as { tabTaken: boolean | null }).tabTaken)).toBe(false);
    });

    // The keys whose `keydown` the page prevented, read on the window, after
    // the page's own handlers have run.
    const takenBy = async (page: Page, keys: readonly string[], focus: () => Promise<void>) => {
      const taken: string[] = [];
      for (const key of keys) {
        await focus();
        await page.evaluate(() => {
          const store = window as unknown as { prevented: boolean };
          store.prevented = false;
          window.addEventListener('keydown', (event) => (store.prevented = event.defaultPrevented), { once: true });
        });
        await page.keyboard.press(key).catch(() => undefined);
        if (await page.evaluate(() => (window as unknown as { prevented: boolean }).prevented)) taken.push(key);
      }
      return taken;
    };

    test(`006-terminal-FR-079: on ${platform}, the vim view takes Ctrl+R only on macOS, and insert mode no browser key`, async () => {
      const page = await terminalOn(platform);
      await typed(page, 'vim todo');
      await page.keyboard.press('Enter');
      await vimView(page).waitFor();
      const text = page.locator('.terminal .vim-text');
      // A reload would lose the page, so the key's default is stopped after the check.
      await page.evaluate(() => {
        const store = window as unknown as { redo: boolean | null };
        store.redo = null;
        window.addEventListener('keydown', (event) => {
          if (event.ctrlKey && event.key === 'r') {
            store.redo = event.defaultPrevented;
            event.preventDefault();
          }
        });
      });
      await text.focus();
      await page.keyboard.press('Control+r');
      expect(await page.evaluate(() => (window as unknown as { redo: boolean | null }).redo)).toBe(platform === 'macOS');
      await text.focus();
      await page.keyboard.press('i');
      const area = page.locator('.terminal textarea.vim-insert');
      await area.waitFor();
      const keys = platform === 'macOS' ? ['Meta+L', 'Meta+W', 'Meta+T'] : ['Control+W', 'Control+L', 'Control+T'];
      expect(await takenBy(page, keys, () => area.focus())).toEqual([]);
    });
  }
});
