// Editing as VS Code does (spec US1): line numbers, undo and redo,
// indenting, comments, brackets, folding, several cursors, moving and
// copying lines, expanding a selection, find and replace, going to a line or
// a symbol, the other uses of a name, and TypeScript's own formatting. Keys
// follow the page's system, as the editor's do.
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { bundled, ts } from '../helpers/bundled-typescript.ts';
import { EDITOR, editorText, focusEditor, freshProfile, onMac, openPlayground, openPlaygroundPage, PLAYGROUND, run, setCode, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000, hookTimeout: 120_000 });

type Keys = Record<'top' | 'end' | 'undo' | 'redo' | 'comment' | 'nextMatch' | 'lineUp' | 'lineDown' | 'copyDown' | 'expand' | 'find' | 'replace' | 'gotoLine' | 'outline' | 'fold' | 'unfold' | 'formatDocument' | 'chord' | 'formatSelectionChord', string>;

// VS Code's keys on a Mac and elsewhere, as Playwright names them.
const KEYS: Record<'mac' | 'other', Keys> = {
  mac: {
    top: 'Meta+ArrowUp',
    end: 'End',
    undo: 'Meta+KeyZ',
    redo: 'Meta+Shift+KeyZ',
    comment: 'Meta+Slash',
    nextMatch: 'Meta+KeyD',
    lineUp: 'Alt+ArrowUp',
    lineDown: 'Alt+ArrowDown',
    copyDown: 'Shift+Alt+ArrowDown',
    expand: 'Control+Shift+Meta+ArrowRight',
    find: 'Meta+KeyF',
    replace: 'Alt+Meta+KeyF',
    gotoLine: 'Control+KeyG',
    outline: 'Shift+Meta+KeyO',
    fold: 'Alt+Meta+BracketLeft',
    unfold: 'Alt+Meta+BracketRight',
    formatDocument: 'Shift+Alt+KeyF',
    chord: 'Meta+KeyK',
    formatSelectionChord: 'Meta+KeyF',
  },
  other: {
    top: 'Control+Home',
    end: 'End',
    undo: 'Control+KeyZ',
    redo: 'Control+KeyY',
    comment: 'Control+Slash',
    nextMatch: 'Control+KeyD',
    lineUp: 'Alt+ArrowUp',
    lineDown: 'Alt+ArrowDown',
    copyDown: 'Shift+Alt+ArrowDown',
    expand: 'Shift+Alt+ArrowRight',
    find: 'Control+KeyF',
    replace: 'Control+KeyH',
    gotoLine: 'Control+KeyG',
    outline: 'Control+Shift+KeyO',
    fold: 'Control+Shift+BracketLeft',
    unfold: 'Control+Shift+BracketRight',
    formatDocument: 'Shift+Alt+KeyF',
    chord: 'Control+KeyK',
    formatSelectionChord: 'Control+KeyF',
  },
};

let page: Page;
let keys: Keys;

beforeEach(async () => {
  page = await openPlaygroundPage();
  keys = KEYS[(await onMac(page)) ? 'mac' : 'other'];
});

// Puts code in the editor and the cursor at its start.
async function start(code: string): Promise<void> {
  if (code === '') {
    await setCode(page, ' ');
    await page.keyboard.press('Backspace');
    await expect.poll(() => editorText(page)).toBe('');
  } else {
    await setCode(page, code);
    await waitForCode(page, code);
    await expect.poll(() => editorText(page)).toBe(code);
  }
  await page.keyboard.press(keys.top);
  await page.keyboard.press('Home');
}

const status = () => page.locator(`${PLAYGROUND} .playground-status span`).first().textContent();

// TypeScript's formatting of the code, with the editor's indent of 2.
function formatted(code: string, range?: { start: number; end: number }): string {
  const settings = { ...ts.getDefaultFormatCodeSettings('\n'), indentSize: 2, tabSize: 2, convertTabsToSpaces: true };
  const { service } = bundled(code);
  const edits = range === undefined ? service.getFormattingEditsForDocument('file:///playground.ts', settings) : service.getFormattingEditsForRange('file:///playground.ts', range.start, range.end, settings);
  return [...edits]
    .sort((a: { span: { start: number } }, b: { span: { start: number } }) => b.span.start - a.span.start)
    .reduce((text: string, edit: { span: { start: number; length: number }; newText: string }) => text.slice(0, edit.span.start) + edit.newText + text.slice(edit.span.start + edit.span.length), code);
}

describe('008-typescript-playground-FR-015: the editor works as VS Code does', () => {
  test('line numbers show beside each line', async () => {
    await start('const a = 1;\nconst b = 2;\nconst c = 3;');
    const numbers = await page.locator(`${EDITOR} .line-numbers`).allTextContents();
    expect(numbers.map((n) => n.trim()).filter((n) => n !== '').sort()).toEqual(['1', '2', '3']);
  });

  test('undo and redo', async () => {
    await start('let total = 1;');
    await page.keyboard.press(keys.end);
    await page.keyboard.type('0');
    await expect.poll(() => editorText(page)).toBe('let total = 1;0');
    await page.keyboard.press(keys.undo);
    await expect.poll(() => editorText(page)).toBe('let total = 1;');
    await page.keyboard.press(keys.redo);
    await expect.poll(() => editorText(page)).toBe('let total = 1;0');
  });

  test('Enter after an opening brace indents the next line', async () => {
    await start('function f() {}');
    await page.keyboard.press(keys.end);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    await page.keyboard.type('return 1;');
    await expect.poll(() => editorText(page)).toBe('function f() {\n  return 1;\n}');
  });

  test('commenting out a line and back', async () => {
    await start('const a = 1;');
    await page.keyboard.press(keys.comment);
    await expect.poll(() => editorText(page)).toBe('// const a = 1;');
    await page.keyboard.press(keys.comment);
    await expect.poll(() => editorText(page)).toBe('const a = 1;');
  });

  test('brackets and quotes close themselves and surround a selection', async () => {
    await start('');
    await page.keyboard.type('call(');
    await expect.poll(() => editorText(page)).toBe('call()');
    await start('word');
    await page.keyboard.press('Shift+End');
    await page.keyboard.type('"');
    await expect.poll(() => editorText(page)).toBe('"word"');
  });

  test('folding hides a block and unfolding shows it', async () => {
    await start('function f() {\n  return 1;\n}\nconst after = 2;');
    await page.keyboard.press(keys.fold);
    await expect.poll(() => editorText(page)).not.toContain('return 1;');
    expect(await editorText(page)).toContain('const after = 2;');
    await page.keyboard.press(keys.unfold);
    await expect.poll(() => editorText(page)).toContain('return 1;');
  });

  test('the next match and Alt+click add cursors', async () => {
    await start('foo foo foo');
    await page.keyboard.press(keys.nextMatch);
    await page.keyboard.press(keys.nextMatch);
    await page.keyboard.type('bar');
    await expect.poll(() => editorText(page)).toBe('bar bar foo');

    await start('one\ntwo');
    const second = (await page.locator(`${EDITOR} .view-line`).nth(1).boundingBox())!;
    const lines = await page.locator(`${EDITOR} .view-line`).evaluateAll((list) => list.map((line) => ({ top: (line as HTMLElement).getBoundingClientRect().top, text: line.textContent })));
    const two = lines.find((line) => line.text === 'two')!;
    await page.keyboard.down('Alt');
    await page.mouse.click(second.x + 1, two.top + second.height / 2);
    await page.keyboard.up('Alt');
    await page.keyboard.type('>');
    await expect.poll(() => editorText(page)).toBe('>one\n>two');
  });

  test('moving a line up and down, and copying it down', async () => {
    await start('first\nsecond');
    await page.keyboard.press(keys.lineDown);
    await expect.poll(() => editorText(page)).toBe('second\nfirst');
    await page.keyboard.press(keys.lineUp);
    await expect.poll(() => editorText(page)).toBe('first\nsecond');
    await page.keyboard.press(keys.copyDown);
    await expect.poll(() => editorText(page)).toBe('first\nfirst\nsecond');
  });

  test('expanding the selection takes the word under the cursor', async () => {
    await start('call(value);');
    for (let step = 0; step < 6; step += 1) await page.keyboard.press('ArrowRight');
    await page.keyboard.press(keys.expand);
    await page.keyboard.type('other');
    await expect.poll(() => editorText(page)).toBe('call(other);');
  });

  test('find shows its widget; replace changes every match', async () => {
    await start('let foo = 1;\nfoo = foo + 1;');
    await page.keyboard.press(keys.find);
    await expect.poll(() => page.locator(`${EDITOR} .find-widget.visible`).count()).toBe(1);
    await page.keyboard.press('Escape');
    await page.keyboard.press(keys.replace);
    await expect.poll(() => page.locator(`${EDITOR} .find-widget.visible.replaceToggled`).count()).toBe(1);
    await page.locator(`${EDITOR} .find-widget .find-part textarea`).fill('foo');
    await page.locator(`${EDITOR} .find-widget .replace-part textarea`).fill('bar');
    await page.locator(`${EDITOR} .find-widget [aria-label^="Replace All"]`).click();
    await expect.poll(() => editorText(page)).toBe('let bar = 1;\nbar = bar + 1;');
    await page.keyboard.press('Escape');
  });

  test('going to a line, and to a named part of the code', async () => {
    await start('const a = 1;\nconst b = 2;\nfunction greet() {}\n');
    await page.keyboard.press(keys.gotoLine);
    await page.keyboard.type('3');
    await page.keyboard.press('Enter');
    await expect.poll(status).toBe('Ln 3, Col 1');

    await page.keyboard.press(keys.top);
    await page.keyboard.press(keys.outline);
    const list = page.locator(`${EDITOR} .quick-input-widget .monaco-list-row`);
    await expect.poll(() => list.count()).toBeGreaterThan(0);
    expect((await list.allTextContents()).join(' ')).toContain('greet');
    await page.keyboard.type('greet');
    await page.keyboard.press('Enter');
    await expect.poll(status).toMatch(/^Ln 3,/);
  });

  test('the other uses of the name under the cursor are highlighted', async () => {
    await start('const count = 1;\nconsole.log(count, count);');
    for (let step = 0; step < 7; step += 1) await page.keyboard.press('ArrowRight');
    await expect.poll(() => page.locator(`${EDITOR} :is(.wordHighlight, .wordHighlightStrong, .wordHighlightText)`).count()).toBeGreaterThanOrEqual(3);
  });

  test("formatting a selection gives TypeScript's formatting", async () => {
    const code = 'const  a=1;\nlet   b  =  {x:1,y:2};';
    await start(code);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Shift+End');
    await page.keyboard.press(keys.chord);
    await page.keyboard.press(keys.formatSelectionChord);
    const second = code.indexOf('\n') + 1;
    await expect.poll(() => editorText(page)).toBe(formatted(code, { start: second, end: code.length }));
  });

  test("Shift+Alt+F formats the document as TypeScript does", async () => {
    const code = 'const  a=1;\nfunction  f( x:number ){return x*2}';
    await start(code);
    await waitChecked(page);
    await page.keyboard.press(keys.formatDocument);
    await expect.poll(() => editorText(page)).toBe(formatted(code));
  });
});

describe('008-typescript-playground-FR-015: the editor starts cleanly', () => {
  test('opening the Playground, typing and running throw no uncaught error on the page', async () => {
    const page = await freshProfile();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await openPlayground(page);
    await waitReady(page);
    await focusEditor(page);
    await page.keyboard.type('const typed = 1;');
    await waitChecked(page);
    await run(page);
    expect(errors).toEqual([]);
  });
});
