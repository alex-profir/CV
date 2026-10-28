// The pocket terminal (FR-024, FR-025, FR-051 to FR-054, FR-058, FR-063,
// FR-066): on a phone, the Terminal in a drawn case with 8 big keys, usable
// by taps alone, fitting every phone size, making room for the on-screen
// keyboard, and with vim keys while the vim view is open.
import { describe, expect, test, vi } from 'vitest';
import type { Locator, Page } from 'playwright';
import { axText } from '../helpers/ax.ts';
import { box, openShell, settle } from '../helpers/shell.ts';
import {
  COMMAND_LINE,
  commandLineFocused,
  fixtureBuild,
  groupText,
  openTerminal,
  openTerminalPage,
  runCount,
  runGroup,
  SHELL_PAGE,
  typedLine,
  typedLines,
  vimView,
} from '../helpers/terminal.ts';
import type { TerminalShell } from '../helpers/terminal.ts';
import { siteFiles } from './engine/context.ts';

vi.setConfig({ testTimeout: 300_000 });

const POCKET = '#os .full-screen[data-view="terminal"] .pocket';
const KEYS = `${POCKET} .pocket-keys`;
const KEY = `${KEYS} button.pocket-key`;
const SCREEN = '.terminal .terminal-screen';
const CONTROLS = 'button.command-chip, button.command-inline';

const COMMAND_KEYS = ['help', 'about', 'work', 'projects', 'skills', 'cv', 'ls', 'clear'];
const VIM_KEYS = ['j', 'k', 'za', '/', 'n', 'gg', 'G', ':q'];
const VIM_NAMES = ['Down', 'Up', 'Open or close fold', 'Search', 'Next match', 'Top', 'Bottom', 'Quit'];

const phone = (width = 375, height = 812, url?: string) => openShell({ ...SHELL_PAGE.mobile, width, height, ...(url === undefined ? {} : { url }) });

async function openPocket(width = 375, height = 812, url?: string): Promise<Page> {
  const page = await phone(width, height, url);
  await openTerminal(page, 'mobile');
  return page;
}

// Each key: its text, name and size.
const keys = (page: Page) =>
  page.locator(KEY).evaluateAll((list) =>
    list.map((key) => {
      const rect = key.getBoundingClientRect();
      return { tag: key.tagName.toLowerCase(), text: (key.textContent ?? '').trim(), name: key.getAttribute('aria-label'), width: rect.width, height: rect.height, tabIndex: (key as HTMLElement).tabIndex };
    }),
  );

const key = (page: Page, line: string) => page.locator(`${KEY}[aria-label="${line}"]`);

// Taps a control or key and waits for the run it adds.
async function tapRun(page: Page, control: Locator, line: string): Promise<void> {
  const before = await runCount(page);
  await control.tap();
  await expect.poll(() => runCount(page), { message: line }).toBe(before + 1);
  expect((await typedLines(page)).at(-1), line).toBe(line);
}

const inViewport = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const viewport = window.visualViewport!;
    return rect.top >= viewport.offsetTop - 1 && rect.bottom <= viewport.offsetTop + viewport.height + 1 && rect.height > 0;
  });

const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

describe('006-terminal-FR-024: on a phone, the Terminal is the pocket terminal', () => {
  test('at 375 it is a div.pocket with its case, its screen holding the Terminal, and its keys', async () => {
    const page = await openPocket();
    expect(await page.locator(`${POCKET} > .pocket-case`).count()).toBe(1);
    expect(await page.locator(`${POCKET} > .pocket-screen > .terminal[data-shell-look="pocket"]`).count()).toBe(1);
    expect(await page.locator(`${POCKET} > .pocket-keys[role="toolbar"]`).count()).toBe(1);
    expect(await page.locator(`${POCKET} > .pocket-foot`).count()).toBe(1);
    // The phone's prompt has no time.
    expect(await page.locator('.terminal form.prompt-line .prompt-time').count()).toBe(0);
  });

  // T032, T033 and T034's cases, in both shells.
  describe.each(['desktop', 'mobile'] as const)('in the %s shell', (shell: TerminalShell) => {
    const activate = (control: Locator) => (shell === 'mobile' ? control.tap() : control.click());

    test('the command line: `Help ` echoes as typed, then its output and an empty prompt; an empty line adds nothing; markup stays text', async () => {
      const page = await openTerminalPage(shell);
      const help = await runGroup(page, 'Help ');
      expect(await typedLine(help)).toBe('Help ');
      expect((await groupText(page, help)).length).toBeGreaterThan(0);
      expect(await page.locator(COMMAND_LINE).inputValue()).toBe('');
      const empty = await runGroup(page, '');
      expect(await empty.locator('.run-output').count()).toBe(0);
      const markup = await runGroup(page, '<b>bold</b><img src=x>');
      expect(await typedLine(markup)).toBe('<b>bold</b><img src=x>');
      expect(await page.locator('.terminal b, .terminal img').count()).toBe(0);
      expect(await page.locator(COMMAND_LINE).getAttribute('maxlength')).toBe('500');
    });

    test('the output: the greeting’s 5 chips, and the output scrolls inside the Terminal, never the document', async () => {
      const page = await openTerminalPage(shell);
      expect(await page.locator('.terminal .greeting .chips button.command-chip').evaluateAll((list) => list.map((chip) => chip.getAttribute('aria-label')))).toEqual(['help', 'about', 'work', 'projects', 'cv']);
      await runGroup(page, 'help');
      await runGroup(page, 'work');
      expect(await page.locator(SCREEN).evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
      expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(0);
    });

    test('the controls: a chip and an inline control run their line as typed, and focus comes back to the command line', async () => {
      const page = await openTerminalPage(shell);
      for (const line of ['about', 'work']) {
        const before = await runCount(page);
        await activate(page.locator(`.terminal .greeting button.command-chip[aria-label="${line}"]`));
        await expect.poll(() => runCount(page)).toBe(before + 1);
        expect((await typedLines(page)).at(-1)).toBe(line);
        await expect.poll(() => commandLineFocused(page)).toBe(true);
      }
      await runGroup(page, 'wrok');
      const before = await runCount(page);
      await activate(page.locator('.terminal section.run').last().locator('.run-output button.command-inline[aria-label="help"]'));
      await expect.poll(() => runCount(page)).toBe(before + 1);
      await expect.poll(() => commandLineFocused(page)).toBe(true);
    });
  });
});

describe('006-terminal-FR-025: the pocket terminal is usable by taps alone (SC-001)', () => {
  test('from the greeting and the keys, every CV section, site, specs and every file is reached by taps', async () => {
    const page = await openPocket();
    const queue = [...(await page.locator(`.terminal .greeting :is(${CONTROLS})`).evaluateAll((list) => list.map((control) => control.getAttribute('aria-label')!))), ...COMMAND_KEYS];
    const ran = new Set<string>();
    // Lines that leave the output: they are checked elsewhere.
    const skip = (line: string) => line === 'clear' || line === 'exit' || line === 'cv' || line.startsWith('open') || line === 'vim' || line === 'jq';
    while (queue.length > 0) {
      const line = queue.shift()!;
      if (ran.has(line) || skip(line)) continue;
      ran.add(line);
      const control = COMMAND_KEYS.includes(line) ? key(page, line) : page.locator(`.terminal :is(${CONTROLS})[aria-label="${line}"]`).last();
      await tapRun(page, control, line);
      const added = page.locator('.terminal section.run').last();
      queue.push(...(await added.locator(`.run-output :is(${CONTROLS})`).evaluateAll((list) => list.map((control) => control.getAttribute('aria-label')!))));
    }
    for (const line of ['about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact', 'site', 'specs', ...siteFiles()]) expect(ran.has(line), line).toBe(true);
  });

  test('help, about, work, projects and cv are 1 key tap; every CV section is within 2 taps', async () => {
    const page = await openPocket();
    for (const line of ['help', 'about', 'work', 'projects']) await tapRun(page, key(page, line), line);
    await key(page, 'cv').tap();
    await vimView(page).waitFor();
    await page.locator(`${KEY}[aria-label="Quit"]`).tap();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    for (const section of ['education', 'skills', 'languages', 'interests', 'contact']) {
      if (COMMAND_KEYS.includes(section)) {
        await tapRun(page, key(page, section), section);
        continue;
      }
      await tapRun(page, key(page, 'help'), 'help');
      await tapRun(page, page.locator('.terminal section.run').last().locator(`.run-output button[aria-label="${section}"]`), section);
    }
  });
});

describe('006-terminal-FR-051: 8 command keys', () => {
  test('in the design’s order, each a button named by its command, at least 44 × 44 px, each running it', async () => {
    const page = await openPocket();
    const list = await keys(page);
    expect(list.map((each) => each.text)).toEqual(COMMAND_KEYS);
    expect(list.map((each) => each.name)).toEqual(COMMAND_KEYS);
    for (const each of list) {
      expect(each.tag, each.text).toBe('button');
      expect(each.width, each.text).toBeGreaterThanOrEqual(44);
      expect(each.height, each.text).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator(KEYS).getAttribute('aria-label')).toBe('Command keys');
    for (const line of COMMAND_KEYS.filter((name) => name !== 'cv' && name !== 'clear')) await tapRun(page, key(page, line), line);
    await key(page, 'clear').tap();
    await expect.poll(() => runCount(page)).toBe(0);
    await key(page, 'cv').tap();
    await vimView(page).waitFor();
  });

  test('the toolbar is one Tab stop, and Left, Right, Home and End move between keys', async () => {
    const page = await openPocket();
    expect((await keys(page)).filter((each) => each.tabIndex === 0)).toHaveLength(1);
    await page.locator(KEY).first().focus();
    const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
    await page.keyboard.press('ArrowRight');
    expect(await focused()).toBe('about');
    await page.keyboard.press('End');
    expect(await focused()).toBe('clear');
    await page.keyboard.press('ArrowRight');
    expect(await focused()).toBe('help');
    await page.keyboard.press('ArrowLeft');
    expect(await focused()).toBe('clear');
    await page.keyboard.press('Home');
    expect(await focused()).toBe('help');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('.pocket-keys') === null)).toBe(true);
    await page.keyboard.press('Shift+Tab');
    expect(await focused()).toBe('help');
  });
});

describe('006-terminal-FR-052: the pocket terminal fits every phone size (SC-012)', () => {
  test('at 320 × 568, 375 × 812, 568 × 320, 812 × 375 and 1023 × 700 the screen and keys fit below the header, with no horizontal scroll, and the output scrolls inside the screen', async () => {
    for (const [width, height] of [
      [320, 568],
      [375, 812],
      [568, 320],
      [812, 375],
      [1023, 700],
    ] as const) {
      const size = `${width} × ${height}`;
      const page = await openPocket(width, height);
      await runGroup(page, 'help');
      const header = (await box(page, '#os .full-screen[data-view="terminal"] .app-bar, #os .full-screen[data-view="terminal"] header'))!;
      const screen = (await box(page, `${POCKET} .pocket-screen`))!;
      const keyBoxes = await page.locator(KEY).evaluateAll((list) => list.map((each) => each.getBoundingClientRect().toJSON() as DOMRect));
      expect(screen.y, size).toBeGreaterThanOrEqual(header.y + header.height - 1);
      for (const each of [screen, ...keyBoxes]) {
        expect(each.x, size).toBeGreaterThanOrEqual(0);
        expect(each.x + each.width, size).toBeLessThanOrEqual(width + 1);
        expect(each.y + each.height, size).toBeLessThanOrEqual(height + 1);
      }
      expect(await noSideScroll(page), size).toBeLessThanOrEqual(0);
      expect(await page.locator(SCREEN).evaluate((element) => element.scrollHeight > element.clientHeight), size).toBe(true);
      expect(await page.evaluate(() => document.scrollingElement!.scrollTop), size).toBe(0);
      await page.context().close();
    }
  });

  test('at 200% text zoom no key is cut off', async () => {
    const page = await openPocket();
    await page.evaluate(() => {
      const elements = [...document.querySelectorAll<HTMLElement>('body, body *')];
      const sizes = elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize));
      elements.forEach((element, index) => element.style.setProperty('font-size', `${sizes[index]! * 2}px`, 'important'));
    });
    await settle(page);
    const cut = await page.locator(KEY).evaluateAll((list) =>
      list.filter((each) => each.scrollWidth > each.clientWidth + 1 || each.scrollHeight > each.clientHeight + 1 || each.getBoundingClientRect().right > window.innerWidth + 1).map((each) => each.textContent),
    );
    expect(cut).toEqual([]);
  });
});

describe('006-terminal-FR-053: the pocket terminal makes room for the on-screen keyboard', () => {
  test('a tap on the command line and a viewport 300 px shorter hide the keys and keep the command line and newest output in view; restoring brings the keys back', async () => {
    const page = await openPocket();
    await tapRun(page, key(page, 'about'), 'about');
    await page.locator(COMMAND_LINE).tap();
    await page.setViewportSize({ width: 375, height: 512 });
    await expect.poll(() => page.locator(POCKET).getAttribute('data-keyboard')).toBe('');
    await settle(page);
    expect(await page.locator(KEYS).isHidden()).toBe(true);
    expect(await inViewport(page, COMMAND_LINE)).toBe(true);
    expect(await inViewport(page, '.terminal section.run:last-of-type h2.run-command')).toBe(true);
    await page.setViewportSize({ width: 375, height: 812 });
    await expect.poll(() => page.locator(POCKET).getAttribute('data-keyboard')).toBeNull();
    expect(await page.locator(KEYS).isVisible()).toBe(true);
  });
});

describe('006-terminal-FR-054: the case is decoration only', () => {
  test('it is aria-hidden, holds nothing focusable, and none of its text is read', async () => {
    const page = await openPocket();
    for (const part of ['.pocket-case', '.pocket-foot']) {
      expect(await page.locator(`${POCKET} > ${part}`).getAttribute('aria-hidden'), part).toBe('true');
      expect(await page.locator(`${POCKET} > ${part} :is(a, button, input, [tabindex])`).count(), part).toBe(0);
      expect((await axText(page, `${POCKET} > ${part}`)).join('').trim(), part).toBe('');
    }
    expect((await page.locator(`${POCKET} > .pocket-case`).textContent())?.trim()).toContain('cv-os pocket');
  });

  test('with reduced motion, a pressed key changes no transform', async () => {
    const page = await openShell({ ...SHELL_PAGE.mobile, reducedMotion: 'reduce' });
    await openTerminal(page, 'mobile');
    const target = page.locator(KEY).first();
    const motion = () => target.evaluate((element) => `${getComputedStyle(element).transform} ${getComputedStyle(element).translate} ${getComputedStyle(element).scale}`);
    const before = await motion();
    const rect = (await target.boundingBox())!;
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await page.mouse.down();
    expect(await target.evaluate((element) => element.matches(':active'))).toBe(true);
    expect(await motion()).toBe(before);
    await page.mouse.up();
  });
});

describe('006-terminal-FR-058: the cv key opens the vim view in the pocket’s screen', () => {
  for (const [width, height] of [
    [375, 812],
    [320, 568],
  ] as const) {
    test(`at ${width} × ${height}, filling the screen, with line numbers, the status line and the message line`, async () => {
      const page = await openPocket(width, height);
      await key(page, 'cv').tap();
      await vimView(page).waitFor();
      await settle(page);
      const screen = (await box(page, `${POCKET} .pocket-screen`))!;
      const view = (await box(page, `${POCKET} section.vim`))!;
      expect(Math.abs(view.width - screen.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(view.height - screen.height)).toBeLessThanOrEqual(2);
      expect(await page.locator(`${POCKET} section.vim .vim-number`).count()).toBeGreaterThan(0);
      expect(await page.locator(`${POCKET} section.vim .vim-status`).isVisible()).toBe(true);
      expect(await page.locator(`${POCKET} section.vim .vim-message`).isVisible()).toBe(true);
    });
  }
});

describe('006-terminal-FR-063: in the pocket, long lines wrap under their line', () => {
  test('with the long-words fixture at 320 × 568, every line wraps inside the screen, a wrapped row starts 2 characters past its line’s text, numbered on its first row only', async () => {
    const { url } = await fixtureBuild('long-words');
    const page = await openPocket(320, 568, url);
    await key(page, 'cv').tap();
    await vimView(page).waitFor();
    await page.locator('.terminal .vim-text').focus();
    await page.keyboard.press('z');
    await page.keyboard.press('Shift+R');
    await settle(page);
    for (const selector of [`${POCKET} section.vim`, `${POCKET} .vim-text`]) {
      expect(await page.locator(selector).evaluate((element) => element.scrollWidth - element.clientWidth), selector).toBeLessThanOrEqual(0);
    }
    expect(await noSideScroll(page)).toBeLessThanOrEqual(0);
    const wrapped = await page.evaluate(() => {
      for (const line of document.querySelectorAll('.terminal section.vim .vim-line')) {
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
    });
    expect(wrapped).not.toBeNull();
    const { advance, first, second, firstTop, numberTops } = wrapped!;
    expect(Math.abs(second - first - 2 * advance), `${second} − ${first} for ${advance}`).toBeLessThanOrEqual(1);
    expect(numberTops).toHaveLength(1);
    expect(Math.abs(numberTops[0]! - firstTop)).toBeLessThanOrEqual(2);
  });
});

describe('006-terminal-FR-066: with the vim view open, the keys are vim’s', () => {
  test('j, k, za, /, n, gg, G and :q, named Down to Quit, at least 44 × 44, acting on the view; after :q the command keys are back', async () => {
    const page = await openPocket();
    await key(page, 'cv').tap();
    await vimView(page).waitFor();
    await settle(page);
    const list = await keys(page);
    expect(list.map((each) => each.text)).toEqual(VIM_KEYS);
    expect(list.map((each) => each.name)).toEqual(VIM_NAMES);
    for (const each of list) {
      expect(each.width, each.text).toBeGreaterThanOrEqual(44);
      expect(each.height, each.text).toBeGreaterThanOrEqual(44);
    }
    expect(await page.locator(KEYS).getAttribute('aria-label')).toBe('Vim keys');
    const cursor = async () => ((await page.locator('.terminal .vim-status .vim-position').textContent()) ?? '').split(',')[0]?.trim();
    // The view opens on its first fold line.
    const start = Number(await cursor());
    await page.locator(`${KEY}[aria-label="Down"]`).tap();
    // Past the closed fold, to the next line shown.
    await expect.poll(async () => Number(await cursor())).toBeGreaterThan(start);
    await page.locator(`${KEY}[aria-label="Up"]`).tap();
    await expect.poll(cursor).toBe(String(start));
    const folded = () => page.locator('.terminal button.vim-fold[aria-expanded="true"]').count();
    const open = await folded();
    await page.locator(`${KEY}[aria-label="Open or close fold"]`).tap();
    await expect.poll(folded).toBe(open + 1);
    await page.locator(`${KEY}[aria-label="Bottom"]`).tap();
    await expect.poll(cursor).not.toBe(String(start));
    await page.locator(`${KEY}[aria-label="Top"]`).tap();
    await expect.poll(cursor).toBe('1');
    await page.locator(`${KEY}[aria-label="Search"]`).tap();
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('.terminal input.vim-entry') ?? false)).toBe(true);
    await page.keyboard.press('Escape');
    await page.locator(`${KEY}[aria-label="Quit"]`).tap();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect((await keys(page)).map((each) => each.text)).toEqual(COMMAND_KEYS);
  });

  test('a tap on a fold line opens and closes its fold', async () => {
    const page = await openPocket();
    await key(page, 'cv').tap();
    await vimView(page).waitFor();
    const fold = page.locator('.terminal button.vim-fold').first();
    const before = await fold.getAttribute('aria-expanded');
    await fold.tap();
    await expect.poll(() => page.locator('.terminal button.vim-fold').first().getAttribute('aria-expanded')).not.toBe(before);
    await page.locator('.terminal button.vim-fold').first().tap();
    await expect.poll(() => page.locator('.terminal button.vim-fold').first().getAttribute('aria-expanded')).toBe(before);
  });
});
