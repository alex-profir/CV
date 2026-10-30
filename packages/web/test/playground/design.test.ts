// The Playground's measurable design (FR-068, wireframes Desktop shell and
// Phone screen): its sizes, surfaces, fonts and the editor's syntax colors
// equal the token values, read from `tokens.generated.ts`. The comparison
// with the mockup's PNGs is by hand (T170).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import { REPO_ROOT } from '../helpers/copy.ts';
import { openShell, PHONE_USER_AGENT, settle } from '../helpers/shell.ts';
import { EDITOR, menu, openPlaygroundPage, PLAYGROUND, POPUP, setCode, TOOLBAR, waitChecked, waitForCode } from '../helpers/playground.ts';
import { siteText } from '../../src/site-text.ts';

vi.setConfig({ testTimeout: 180_000 });

const WINDOW = '#os .window[data-view="playground"]';
const MOBILE = '#os .full-screen[data-view="playground"] section.playground-mobile';
const token = (name: CssVarTokenName) => String(tokenValue(name));
const px = (name: CssVarTokenName) => Number.parseFloat(token(name));

// A token's color as the browser computes it.
const computedColor = (page: Page, value: string) =>
  page.evaluate((color) => {
    const probe = document.createElement('div');
    probe.style.color = color;
    document.body.append(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    return computed;
  }, value);

const style = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((element) => {
    const computed = getComputedStyle(element);
    const box = element.getBoundingClientRect();
    return { background: computed.backgroundColor, color: computed.color, font: computed.fontFamily, size: computed.fontSize, line: computed.lineHeight, border: computed.borderTopColor, width: box.width, height: box.height };
  });

// The families of a font list a browser can reach: those up to the first
// generic family, which always matches. Monaco appends its platform's
// default fonts after the code's family, where they are never reached.
const reachable = (list: string) => {
  const families = list.split(',').map((family) => family.trim().replace(/^["']|["']$/g, ''));
  const generic = families.findIndex((family) => ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy'].includes(family));
  return (generic < 0 ? families : families.slice(0, generic + 1)).join(', ');
};

// Fonts that belong to an operating system's UI rather than the site.
const SYSTEM_FONTS = /-apple-system|BlinkMacSystemFont|system-ui|ui-monospace|ui-sans-serif|SF Pro|SF Mono|San Francisco|Menlo|Monaco|Segoe UI|Helvetica Neue|Roboto|Consolas|Courier New/i;

describe('008-typescript-playground-FR-068: the Playground matches the approved design, in tokens only', () => {
  test('the toolbar is 44 px, the side column 400 px and the status bar 28 px, on the panel color', async () => {
    const page = await openPlaygroundPage();
    const panel = await computedColor(page, token('color.playground.panel'));
    const rule = await computedColor(page, token('color.shell-rule'));
    const toolbar = await style(page, TOOLBAR);
    expect(toolbar.height).toBe(px('size.playground-toolbar'));
    expect(toolbar.background).toBe(panel);
    const side = await style(page, `${PLAYGROUND} .playground-side`);
    expect(side.width).toBe(px('size.playground-side'));
    expect(side.background).toBe(panel);
    const status = await style(page, `${PLAYGROUND} .playground-status`);
    expect(status.height).toBe(px('size.playground-status'));
    expect(status.background).toBe(panel);
    expect(status.border).toBe(rule);
    expect(status.font).toBe(token('font.family.mono'));
    const tab = await style(page, `${PLAYGROUND} .pane-tab[aria-selected="true"]`);
    expect(await page.locator(`${PLAYGROUND} .pane-tab[aria-selected="true"]`).evaluate((element) => getComputedStyle(element).borderBottomColor)).toBe(await computedColor(page, token('color.playground.primary')));
    expect(tab.color).toBe(await computedColor(page, token('color.shell-text')));
  });

  test('the editor: the mono font at 13 px on 20 px lines, a 48 px gutter and the code 8 px after it, on the code surface', async () => {
    const page = await openPlaygroundPage();
    const lines = await style(page, `${EDITOR} .view-lines`);
    expect(lines.font).toContain(token('font.family.mono').split(',')[0]!);
    expect(lines.size).toBe(token('font.size.small'));
    expect(Number.parseFloat(lines.line)).toBe(px('size.code-line'));
    const gutter = await page.locator(`${EDITOR} .monaco-editor`).evaluate((element) => element.querySelector('.view-lines')!.getBoundingClientRect().left - element.getBoundingClientRect().left);
    expect(gutter).toBe(px('size.playground-gutter') + px('space.2'));
    expect((await style(page, `${EDITOR} .monaco-editor-background`)).background).toBe(await computedColor(page, token('color.code.surface')));
  });

  test('the syntax colors by token class: keywords, types, functions, properties, strings, numbers, comments in italics, punctuation and other code', async () => {
    const page = await openPlaygroundPage();
    const code = "interface Job { title: string }\nconst years = 8; // years\nconst job: Job = { title: 'Engineer' };\nfunction twice(n: number) { return n * 2; }\ntwice(job.title.length);";
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    const read = () =>
      page.locator(`${EDITOR} .view-line span span`).evaluateAll((list) =>
        list.map((span) => ({ text: (span.textContent ?? '').replace(/\u00a0/g, ' ').trim(), color: getComputedStyle(span).color, italic: getComputedStyle(span).fontStyle === 'italic' })),
      );
    // Functions and properties take their colors once TypeScript has said
    // what the names are.
    const functionColor = await computedColor(page, token('color.code.function'));
    await expect.poll(async () => (await read()).filter((span) => span.text === 'twice').map((span) => span.color)).toEqual([functionColor, functionColor]);
    const colored = await read();
    const colorOf = (text: string) => colored.find((span) => span.text === text);
    const expected: [string, CssVarTokenName][] = [
      ['interface', 'color.code.keyword'],
      ['const', 'color.code.keyword'],
      ['Job', 'color.code.type'],
      ["'Engineer'", 'color.code.string'],
      ['8', 'color.code.number'],
      ['// years', 'color.code.comment'],
      ['{', 'color.code.punctuation'],
      ['years', 'color.code.text'],
      ['title', 'color.code.property'],
      ['length', 'color.code.property'],
    ];
    for (const [text, name] of expected) expect(colorOf(text)?.color, text).toBe(await computedColor(page, token(name)));
    expect(colorOf('// years')?.italic).toBe(true);
  });

  test("the editor's icons are the design's: suggestion kinds as letters, the lightbulb as its glyph, not Monaco's icon font", async () => {
    const page = await openPlaygroundPage();
    const code = 'interface Job { title: string; years: number }\nconst job: Job = {};\njob.';
    await setCode(page, code);
    await waitForCode(page, code.split('\n')[0]!);
    await waitChecked(page);
    const mod = (await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent))) ? 'Meta' : 'Control';
    await page.locator(`${EDITOR} .view-lines`).click();
    await page.keyboard.press(`${mod}+ArrowDown`);
    await page.keyboard.press('End');
    await page.keyboard.press('Control+Space');
    await page.waitForSelector(`${EDITOR} .suggest-widget.visible .suggest-icon`);
    const kinds = await page.locator(`${EDITOR} .suggest-widget .suggest-icon`).evaluateAll((list) => list.map((icon) => ({ content: getComputedStyle(icon, '::before').content, font: getComputedStyle(icon, '::before').fontFamily })));
    expect(kinds.length).toBeGreaterThan(0);
    for (const kind of kinds) {
      expect(kind.content).toMatch(/^"[A-Z]"$/);
      expect(kind.font).toBe(token('font.family.mono'));
    }
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+KeyG');
    await page.keyboard.type('2:7');
    await page.keyboard.press('Enter');
    const bulb = page.locator(`${EDITOR} [class*="codicon-gutter-lightbulb"], ${EDITOR} [class*="codicon-light-bulb"]`).first();
    await bulb.waitFor({ timeout: 10_000 });
    const glyph = await bulb.evaluate((icon) => ({ content: getComputedStyle(icon, '::before').content, mask: getComputedStyle(icon, '::before').maskImage }));
    expect(glyph).toEqual({ content: '""', mask: expect.stringContaining('lightbulb') });
  });

  test('the popups and the raised widgets: the raised color, the chrome border and the body font', async () => {
    const page = await openPlaygroundPage();
    await menu(page, siteText.playground.menu.reset);
    const popup = await style(page, POPUP);
    expect(popup.background).toBe(await computedColor(page, token('color.playground.raised')));
    expect(popup.border).toBe(await computedColor(page, token('color.chrome-border')));
    expect(popup.width).toBe(px('size.playground-dialog'));
    expect(await page.locator(`${POPUP} p`).first().evaluate((element) => getComputedStyle(element).fontFamily)).toBe(token('font.family.body'));
  });

  test('the phone screen: two 44 px buttons, Share link filled in the primary color', async () => {
    const page = await openShell({ width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT });
    await page.locator('#os .home .app-icon[data-view="playground"]').tap();
    await page.waitForSelector(MOBILE);
    await settle(page);
    const buttons = await page.locator(`${MOBILE} .button`).evaluateAll((list) => list.map((button) => ({ height: button.getBoundingClientRect().height, background: getComputedStyle(button).backgroundColor })));
    expect(buttons).toHaveLength(2);
    for (const button of buttons) expect(button.height).toBe(px('size.home-target'));
    expect(buttons[0]!.background).toBe(await computedColor(page, token('color.playground.primary')));
  });

  test('no Apple or system UI font is named, in the style sheets or on the elements', async () => {
    for (const file of ['playground.css', 'engine/editor.css']) {
      const css = fs.readFileSync(path.join(REPO_ROOT, 'packages/web/src/apps/playground', file), 'utf8');
      const families = [...css.matchAll(/font(?:-family)?\s*:([^;]+);/g)].map(([, value]) => value!);
      expect(families.length, file).toBeGreaterThan(0);
      for (const family of families) expect(family, file).not.toMatch(SYSTEM_FONTS);
    }
    const page = await openPlaygroundPage();
    const families = await page.locator(`${WINDOW} *`).evaluateAll((elements) => [...new Set(elements.map((element) => getComputedStyle(element).fontFamily))]);
    for (const family of families) expect(reachable(family), family).not.toMatch(SYSTEM_FONTS);
  });
});
