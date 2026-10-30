// The editor's keys (research R12, three engines, T024): VS Code's for the
// visitor's system, none a shell shortcut or a key a browser or screen reader
// keeps, a palette that lists them and a list of keys.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { SHORTCUTS, shortcutLabel } from '@cv/os-core';
import { KEY_COMMANDS, RESERVED_KEYS, keyLabel, keysFor } from '../../src/apps/playground/keys.ts';
import { siteText } from '../../src/site-text.ts';
import { frontWindow } from '../helpers/shell.ts';
import { EDITOR, POPUP, editorText, engine, focusEditor, menu, openPlaygroundPage, primary, readLogs, setCode, waitChecked } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const words = siteText.playground;
// A user agent for each engine and system, as Monaco reads the system from it.
const AGENTS = {
  chromium: (os: string) => `Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`,
  firefox: (os: string) => `Mozilla/5.0 (${os}; rv:140.0) Gecko/20100101 Firefox/140.0`,
  webkit: (os: string) => `Mozilla/5.0 (${os}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15`,
};
const fake = (mac: boolean) => ({ platform: mac ? ('macOS' as const) : ('Windows' as const), userAgent: AGENTS[engine()](mac ? 'Macintosh; Intel Mac OS X 10_15_7' : 'Windows NT 10.0; Win64; x64') });
const systems = [false, true];
const named = (mac: boolean) => (mac ? 'a Mac' : 'Windows and Linux');

// A key label to Playwright's: `Cmd+.` → `Meta+.`.
const pressable = (key: string) =>
  key
    .replace(/\bCmd\b/g, 'Meta')
    .replace(/\bCtrl\b/g, 'Control')
    .replace(/\bOption\b/g, 'Alt')
    .replace(/\b(Up|Down|Left|Right)\b/, 'Arrow$1');

// Presses a key and says whether the page acted on it, by the event's
// `defaultPrevented` once it has been dispatched: the editor stops the event
// as well, so a listener after it would never hear.
async function acted(page: Page, key: string): Promise<boolean> {
  await page.evaluate(() => {
    const scope = window as unknown as { lastKey: KeyboardEvent | null; keyWatcher?: boolean };
    scope.lastKey = null;
    if (scope.keyWatcher === true) return;
    scope.keyWatcher = true;
    window.addEventListener(
      'keydown',
      (event) => {
        if (!['Control', 'Meta', 'Alt', 'Shift'].includes(event.key)) scope.lastKey = event;
      },
      true,
    );
  });
  await page.keyboard.press(pressable(key));
  return page.evaluate(() => (window as unknown as { lastKey: KeyboardEvent | null }).lastKey?.defaultPrevented === true);
}

const palette = (page: Page) => page.locator(`${EDITOR} .quick-input-widget`);
const openPalette = async (page: Page) => {
  await page.keyboard.press('F1');
  await palette(page).waitFor({ state: 'visible' });
};

// Every row of the palette, moving down its list, as the list only renders
// what shows: label, then its key.
async function paletteRows(page: Page): Promise<Map<string, string>> {
  const rows = new Map<string, string>();
  // Going past the end wraps to the top, which adds nothing twice running.
  for (let still = 0; still < 2; ) {
    const seen = rows.size;
    const shown = await palette(page).locator('.monaco-list-row').evaluateAll((list) =>
      list.map((row) => [row.querySelector('.monaco-highlighted-label')?.textContent?.trim() ?? '', [...row.querySelectorAll('.monaco-keybinding-key')].map((key) => key.textContent?.trim()).join('+')]),
    );
    for (const [label, key] of shown) if (label !== '') rows.set(label!, key!);
    still = rows.size === seen ? still + 1 : 0;
    for (let down = 0; down < 5; down += 1) await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(50);
  }
  return rows;
}

describe('008-typescript-playground-FR-083: the editor uses VS Code\'s keys for the visitor\'s system', () => {
  for (const mac of systems) {
    test(`on ${named(mac)}, each key reaches the editor and acts`, async () => {
      const page = await openPlaygroundPage(fake(mac));
      await focusEditor(page);
      await setCode(page, 'const one = 1;\nconst two = one + 1;\nconsole.log(two);\n');
      await waitChecked(page);
      const missed: string[] = [];
      for (const command of KEY_COMMANDS) {
        for (const key of keysFor(command, mac)) {
          // A chord's first key waits for the second: the first is enough.
          await page.locator(`${EDITOR} textarea.inputarea`).focus();
          if (!(await acted(page, key.split(' ')[0]!))) missed.push(`${command.id} ${key}`);
          // A widget opens a moment after its key: let it, then close it.
          await page.waitForTimeout(150);
          await page.keyboard.press('Escape');
          await expect.poll(() => page.locator(POPUP).count(), { message: key }).toBe(0);
          await page.keyboard.press('Escape');
        }
      }
      expect(missed.join(' | ')).toBe('');
    });
  }

  test('Run is Ctrl+Enter, or Cmd+Enter on a Mac', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'console.log("ran");');
    await focusEditor(page);
    await page.keyboard.press(`${await primary(page)}+Enter`);
    await expect.poll(async () => (await readLogs(page)).map((row) => row.text)).toContain('ran');
  });

  test('the keys do nothing with focus outside the editor', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'console.log("ran");');
    await page.locator('#os .window[data-view="playground"] .window-title').focus();
    await page.keyboard.press(`${await primary(page)}+Enter`);
    await page.keyboard.press('F1');
    await page.waitForTimeout(300);
    expect(await palette(page).isVisible()).toBe(false);
    expect(await readLogs(page)).toEqual([]);
  });
});

describe('008-typescript-playground-FR-084: the editor takes no key of the shell, a browser or a screen reader', () => {
  for (const mac of systems) {
    test(`on ${named(mac)}, no reserved key is acted on, and the shell's shortcuts reach the shell from the editor`, async () => {
      const page = await openPlaygroundPage(fake(mac));
      await focusEditor(page);
      const taken: string[] = [];
      for (const entry of RESERVED_KEYS.filter((reserved) => reserved.system === 'both' || reserved.system === (mac ? 'mac' : 'other'))) {
        await focusEditor(page);
        if (await acted(page, entry.key)) taken.push(`${entry.key}: ${entry.source}`);
        await page.keyboard.press('Escape');
      }
      expect(taken.join(' | ')).toBe('');
      const before = await editorText(page);
      await focusEditor(page);
      await page.keyboard.press('Alt+Shift+M');
      await expect.poll(() => page.evaluate(() => document.activeElement?.closest('#os .menu-bar') !== null)).toBe(true);
      expect(await editorText(page)).toBe(before);
    });

    test(`on ${named(mac)}, no key in the palette is a shell shortcut or reserved`, async () => {
      const page = await openPlaygroundPage(fake(mac));
      await focusEditor(page);
      await openPalette(page);
      const rows = await paletteRows(page);
      expect(rows.size).toBeGreaterThan(KEY_COMMANDS.length);
      const spell = (key: string) => key.replace(/Command|⌘/g, 'Cmd').replace(/Control|⌃/g, 'Ctrl').replace(/⌥/g, 'Option').replace(/⇧/g, 'Shift').split('+').sort().join('+');
      const taken = new Set([...SHORTCUTS.map((shortcut) => shortcutLabel(shortcut, mac)), ...RESERVED_KEYS.filter((entry) => entry.system === 'both' || entry.system === (mac ? 'mac' : 'other')).map((entry) => entry.key)].map(spell));
      for (const [label, key] of rows) if (key !== '') expect(taken.has(spell(key)), `${label}: ${key}`).toBe(false);
    });
  }

  test("Ctrl+Shift+P doesn't open the palette, and Shift+Alt+F formats", async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'const   a=1');
    await focusEditor(page);
    await page.keyboard.press(`${await primary(page)}+Shift+P`);
    await page.waitForTimeout(300);
    expect(await palette(page).isVisible()).toBe(false);
    await page.keyboard.press('Shift+Alt+F');
    await expect.poll(() => editorText(page)).toContain('const a = 1');
  });
});

describe('008-typescript-playground-FR-085: the palette lists the commands, and the menu and the list of keys show the keys', () => {
  test('F1 lists every command with its key and runs the chosen one', async () => {
    const page = await openPlaygroundPage();
    await setCode(page, 'const   a=1');
    await focusEditor(page);
    await openPalette(page);
    const rows = await paletteRows(page);
    expect(rows.size).toBeGreaterThan(20);
    expect([...rows.values()].some((key) => key !== '')).toBe(true);
    expect(rows.has(words.editor.runCommand)).toBe(true);
    await page.keyboard.type('Format Document');
    await page.keyboard.press('Enter');
    await expect.poll(() => editorText(page)).toContain('const a = 1');
  });

  test("the menu shows the palette's key, and its Command palette opens it", async () => {
    const page = await openPlaygroundPage();
    await page.click('#menu-title-app');
    const entry = page.getByRole('menuitem', { name: words.menu.palette, exact: false });
    expect((await entry.locator('.keys').textContent())?.trim()).toBe('F1');
    expect(await entry.getAttribute('aria-keyshortcuts')).toBe('F1');
    await entry.click();
    await palette(page).waitFor({ state: 'visible' });
  });

  for (const mac of systems) {
    test(`Keys… on ${named(mac)} lists every command of the table, with a note where it differs and why`, async () => {
      const page = await openPlaygroundPage(fake(mac));
      await menu(page, words.menu.keys);
      await page.waitForSelector(POPUP);
      expect(await page.locator(POPUP).getAttribute('role')).toBe('dialog');
      expect(await page.locator(POPUP).getAttribute('aria-modal')).toBe('false');
      const rows = await page.locator(`${POPUP} tbody tr`).evaluateAll((list) =>
        list.map((row) => ({
          name: row.querySelector('td')?.firstChild?.textContent?.trim(),
          note: row.querySelector('.key-note')?.textContent?.trim() ?? null,
          keys: row.querySelector('kbd')?.textContent?.trim(),
        })),
      );
      expect(rows.map((row) => [row.name, row.keys])).toEqual(KEY_COMMANDS.map((command) => [keyLabel(command), keysFor(command, mac).join(', ')]));
      for (const [index, command] of KEY_COMMANDS.entries()) expect(rows[index]!.note !== null, command.id).toBe(command.differs !== undefined);
      expect(rows.find((row) => row.name === words.keyLabels['editor.action.quickCommand'])?.note).toContain(mac ? 'Shift+Cmd+P' : 'Ctrl+Shift+P');
      const text = await page.locator(POPUP).textContent();
      expect(text).toContain(mac ? words.popups.keys.lede.mac : words.popups.keys.lede.other);
      expect(text).toContain('F8');
    });
  }

  test('focus goes to its close; Escape returns to the menu title from the menu and to the editor from Alt+F1', async () => {
    const page = await openPlaygroundPage();
    await menu(page, words.menu.keys);
    await page.waitForSelector(POPUP);
    await expect.poll(() => page.evaluate((popup) => document.activeElement?.closest(popup) !== null, POPUP)).toBe(true);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('menu-title-app');
    expect(await page.locator(POPUP).count()).toBe(0);

    await focusEditor(page);
    await page.keyboard.press('Alt+F1');
    await page.waitForSelector(POPUP);
    await page.keyboard.press('Escape');
    await expect.poll(() => page.evaluate((editor) => document.activeElement?.closest(editor) !== null, EDITOR)).toBe(true);
    expect(await frontWindow(page)).toBe('playground');
  });
});
