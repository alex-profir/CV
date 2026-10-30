// WCAG 2.2 A and AA in every state of FR-071 (contracts/cli.md States), and
// every part kept zoomed, text-zoomed and with text spacing (FR-071,
// SC-010). axe runs through the site check's accessibility part. The keys'
// list joins the states with its popup (T071).
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { axeProblems } from '../../../../tools/site-check/src/parts/accessibility.ts';
import { TEXT_SPACING_CSS, zoomText } from '../../../../tools/site-check/src/parts/layout.ts';
import { siteText } from '../../src/site-text.ts';
import { box, drag, openShell, PHONE_USER_AGENT, press, settle, waitForReady } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';
import { chooseExample, EDITOR, focusEditor, freshProfile, holdEngine, linkFrom, LOADING, menu, MESSAGE, onMac, openPlayground, openPlaygroundPage, PLAYGROUND, POPUP, run, setCode, showPane, TOOLBAR, waitChecked, waitForCode, waitReady } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 240_000 });

const WINDOW = '#os .window[data-view="playground"]';
const MOBILE = '#os .full-screen[data-view="playground"] section.playground-mobile';
const PHONE: Partial<ShellOptions> = { width: 375, height: 812, hasTouch: true, userAgent: PHONE_USER_AGENT };
const words = siteText.playground;

// Puts `code` in the editor and the cursor at `line`:`column`.
async function codeAt(page: Page, code: string, line: number, column: number): Promise<void> {
  await setCode(page, code);
  await waitForCode(page, code.split('\n')[0]!);
  await waitChecked(page);
  await press(page, 'Control+KeyG');
  await page.keyboard.type(`${line}:${column}`);
  await press(page, 'Enter');
}

const NAMES = 'function area(side: number) {\n  return side * side;\n}\nconst job = { level: 1, title: "x" };\nconsole.log(area(2), job);';

// Opens `href` as a new load, as following a link does.
async function follow(page: Page, href: string): Promise<void> {
  await page.goto('about:blank');
  await page.goto(href);
  await waitForReady(page);
}

type State = { name: string; reach: () => Promise<Page> };

// Each state of contracts/cli.md, reached from a fresh page by real input.
const DESKTOP: State[] = [
  {
    name: 'playground-downloading',
    reach: async () => {
      const page = await freshProfile();
      await holdEngine(page);
      await openPlayground(page);
      await page.waitForSelector(LOADING);
      return page;
    },
  },
  {
    name: 'playground-offline',
    reach: async () => {
      const page = await freshProfile();
      await page.context().setOffline(true);
      await openPlayground(page);
      await page.waitForSelector(`${LOADING} button.playground-retry`, { timeout: 30_000 });
      return page;
    },
  },
  { name: 'playground-ready', reach: () => openPlaygroundPage() },
  {
    name: 'playground-errors',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, 'const n: number = "one";', 1, 7);
      await showPane(page, 'errors');
      return page;
    },
  },
  {
    name: 'playground-hover',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, NAMES, 5, 14);
      const mod = (await onMac(page)) ? 'Meta' : 'Control';
      await press(page, `${mod}+KeyK`, `${mod}+KeyI`);
      await page.waitForSelector(`${EDITOR} .monaco-hover:not(.hidden)`);
      return page;
    },
  },
  {
    name: 'playground-suggestions',
    reach: async () => {
      const page = await openPlaygroundPage();
      const code = `${NAMES}\njob.le`;
      await setCode(page, code);
      await waitForCode(page, code.split('\n')[0]!);
      await waitChecked(page);
      await focusEditor(page);
      await press(page, `${(await onMac(page)) ? 'Meta' : 'Control'}+ArrowDown`, 'End', 'Control+Space');
      await page.waitForSelector(`${EDITOR} .suggest-widget.visible`);
      return page;
    },
  },
  {
    name: 'playground-peek',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, NAMES, 5, 14);
      await press(page, 'Alt+F12');
      await page.waitForSelector(`${EDITOR} .peekview-widget`, { timeout: 10_000 });
      return page;
    },
  },
  {
    name: 'playground-rename',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, NAMES, 5, 14);
      await press(page, 'F2');
      await page.locator(`${EDITOR} .rename-box input`).waitFor({ timeout: 10_000 });
      return page;
    },
  },
  {
    name: 'playground-quick-fixes',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, 'interface Job { title: string; years: number }\nconst job: Job = {};', 2, 7);
      await press(page, `${(await onMac(page)) ? 'Meta' : 'Control'}+Period`);
      await page.waitForSelector('.action-widget', { timeout: 10_000 });
      return page;
    },
  },
  {
    name: 'playground-palette',
    reach: async () => {
      const page = await openPlaygroundPage();
      await focusEditor(page);
      await press(page, 'F1');
      await page.waitForSelector('.quick-input-widget:not([style*="display: none"])');
      return page;
    },
  },
  {
    name: 'playground-menu',
    reach: async () => {
      const page = await openPlaygroundPage();
      await page.click('#menu-title-app');
      await page.getByRole('menuitem', { name: words.menu.reset, exact: true }).waitFor();
      return page;
    },
  },
  ...(['javascript', 'declarations', 'logs'] as const).map((pane) => ({
    name: `playground-${pane}`,
    reach: async () => {
      const page = await openPlaygroundPage();
      await run(page);
      await showPane(page, pane);
      return page;
    },
  })),
  {
    name: 'playground-options',
    reach: async () => {
      const page = await openPlaygroundPage();
      await page.locator(`${TOOLBAR} button.options`).click();
      await page.waitForSelector(`${PLAYGROUND} section.options-panel`);
      return page;
    },
  },
  {
    name: 'playground-examples',
    reach: async () => {
      const page = await openPlaygroundPage();
      await page.locator(`${TOOLBAR} button.examples`).click();
      await page.waitForSelector(`${PLAYGROUND} section.examples-panel`);
      return page;
    },
  },
  {
    name: 'playground-running',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, 'let n = 0;\nconst id = setInterval(() => { console.log(++n); if (n === 50) clearInterval(id); }, 100);', 1, 1);
      await run(page, { wait: 'start' });
      await page.waitForTimeout(1_000);
      return page;
    },
  },
  {
    name: 'playground-stuck',
    reach: async () => {
      const page = await openPlaygroundPage();
      await codeAt(page, 'while (true) {}', 1, 1);
      await run(page, { wait: 'start' });
      await page.waitForSelector(POPUP, { timeout: 20_000 });
      return page;
    },
  },
  {
    name: 'playground-shared',
    reach: async () => {
      const page = await openPlaygroundPage();
      await page.locator(`${TOOLBAR} button.share`).click();
      await page.waitForSelector(MESSAGE);
      return page;
    },
  },
  {
    name: 'playground-too-long',
    reach: async () => {
      const page = await openPlaygroundPage();
      let seed = 11;
      let noise = '';
      while (noise.length < 14_000) {
        seed = (seed * 1103515245 + 12345) % 2147483648;
        noise += String.fromCharCode(97 + (seed % 26));
      }
      await setCode(page, `const noise = "${noise}";`);
      await waitChecked(page);
      await page.locator(`${TOOLBAR} button.share`).click();
      await page.waitForSelector(MESSAGE);
      return page;
    },
  },
  {
    name: 'playground-broken-link',
    reach: async () => {
      const page = await openShell({ width: 1440, height: 900 });
      await follow(page, `${new URL(page.url()).origin}/#playground=1.ZZZZ.ZZZZ`);
      await waitReady(page);
      await page.waitForSelector(MESSAGE);
      return page;
    },
  },
  {
    name: 'playground-shared-opened',
    reach: async () => {
      const page = await openShell({ width: 1440, height: 900 });
      await follow(page, linkFrom(new URL(page.url()).origin, JSON.stringify({ c: 'console.log("shared");' })));
      await waitReady(page);
      await page.waitForSelector(MESSAGE);
      return page;
    },
  },
  {
    name: 'playground-reset',
    reach: async () => {
      const page = await openPlaygroundPage();
      await menu(page, words.menu.reset);
      await page.waitForSelector(POPUP);
      return page;
    },
  },
  {
    name: 'playground-specs',
    reach: async () => {
      const page = await openPlaygroundPage();
      await page.locator(`${WINDOW} button.show-specs`).click();
      await settle(page);
      return page;
    },
  },
  {
    name: 'playground-narrow',
    reach: async () => {
      const page = await openPlaygroundPage();
      const frame = (await box(page, WINDOW))!;
      const corner = (await box(page, `${WINDOW} .resize-se`))!;
      const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
      await drag(page, from, { x: from.x + 600 - frame.width, y: from.y });
      await settle(page);
      return page;
    },
  },
];

const PHONE_STATES: State[] = [
  { name: 'playground-best-on-desktop', reach: () => phoneScreen(PHONE) },
  {
    name: 'playground-shared-link',
    reach: async () => {
      const page = await openShell({ ...PHONE } as ShellOptions);
      await follow(page, linkFrom(new URL(page.url()).origin, JSON.stringify({ c: 'console.log("shared");' })));
      await page.waitForSelector(MOBILE);
      await settle(page);
      return page;
    },
  },
  { name: 'playground-best-on-desktop-320', reach: () => phoneScreen({ ...PHONE, width: 320, height: 568 }) },
  { name: 'playground-best-on-desktop-landscape', reach: () => phoneScreen({ ...PHONE, width: 812, height: 375 }) },
];

async function phoneScreen(options: Partial<ShellOptions>): Promise<Page> {
  const page = await openShell(options as ShellOptions);
  await page.locator('#os .home .app-icon[data-view="playground"]').tap();
  await page.waitForSelector(MOBILE);
  await settle(page);
  return page;
}

describe('008-typescript-playground-FR-071: axe finds nothing in any Playground state (SC-010)', () => {
  for (const [shell, states] of [['desktop', DESKTOP], ['mobile', PHONE_STATES]] as const) {
    for (const state of states) {
      test(`${shell}, ${state.name}`, async () => {
        const page = await state.reach();
        await settle(page);
        expect(await axeProblems(page, '/', `${shell}/${state.name}`)).toEqual([]);
      });
    }
  }
});

// What a zoomed or spaced Playground must not do: scroll sideways, but in
// Monaco's code views; show text past its window or screen; cut off a
// control's text; or draw its fixed parts (toolbar, body, status bar, the
// phone screen's card) over each other or off the page. Visually hidden
// names aren't shown, so not checked.
function playgroundProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    const root = document.querySelector('#os section.playground, #os section.playground-mobile')!;
    const frame = (root.closest('.window') ?? root.closest('.full-screen'))!;
    const edge = frame.getBoundingClientRect();
    const shown = (element: Element) => element.getClientRects().length > 0 && element.closest('.visually-hidden, [hidden], .monaco-editor') === null && getComputedStyle(element).clipPath !== 'inset(50%)';
    for (const element of root.querySelectorAll('*')) {
      if (!shown(element)) continue;
      const ownText = [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '');
      const rect = element.getBoundingClientRect();
      if (ownText && (rect.left < edge.left - 0.5 || rect.right > edge.right + 0.5)) found.push(`${describe(element)} reaches past the ${Math.round(edge.width)}px frame`);
      if (element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).overflowX !== 'visible') found.push(`${describe(element)} is ${element.scrollWidth}px wide in ${element.clientWidth}px`);
    }
    for (const control of root.querySelectorAll('button')) {
      if (!shown(control)) continue;
      if (control.scrollWidth > control.clientWidth + 1 || control.scrollHeight > control.clientHeight + 1) found.push(`${describe(control)} "${(control.textContent ?? '').trim()}" cuts off its text`);
    }
    const parts = ['.title-bar', '.playground-toolbar', '.playground-message', '.playground-body', '.playground-status', '.playground-mobile-card']
      .flatMap((selector) => [...frame.querySelectorAll(selector)])
      .filter(shown)
      .map((element) => ({ element, rect: element.getBoundingClientRect() }));
    for (const { element, rect } of parts) {
      if (rect.top < -0.5 || rect.left < -0.5 || rect.right > window.innerWidth + 0.5) found.push(`${describe(element)} is off the page`);
    }
    for (let a = 0; a < parts.length; a += 1) {
      for (let b = a + 1; b < parts.length; b += 1) {
        const [one, other] = [parts[a]!.rect, parts[b]!.rect];
        if (Math.min(one.right, other.right) - Math.max(one.left, other.left) > 1 && Math.min(one.bottom, other.bottom) - Math.max(one.top, other.top) > 1) found.push(`${describe(parts[a]!.element)} overlaps ${describe(parts[b]!.element)}`);
      }
    }
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth) found.push('the page scrolls sideways');
    return found;
  });
}

async function withLogs(page: Page): Promise<void> {
  await chooseExample(page, 'Narrowing');
  await run(page);
  await showPane(page, 'logs');
}

describe('008-typescript-playground-FR-071: zoomed, text-zoomed and spaced, every part stays visible (SC-010)', () => {
  // 200% of a 1440 × 900 window and 400% of a 1280 px one are narrower than
  // the desktop shell, so the phone's screen; 200% of a 2560 × 1440 screen
  // keeps the desktop.
  test('200% zoom of 1440 × 900: the phone screen', async () => {
    const page = await phoneScreen({ ...PHONE, width: 720, height: 450, deviceScaleFactor: 2 });
    expect(await playgroundProblems(page)).toEqual([]);
    expect(await axeProblems(page, '/', '200%')).toEqual([]);
  });

  test('400% zoom of 1280 × 1024: the phone screen', async () => {
    const page = await phoneScreen({ ...PHONE, width: 320, height: 256, deviceScaleFactor: 4 });
    expect(await playgroundProblems(page)).toEqual([]);
    expect(await axeProblems(page, '/', '400%')).toEqual([]);
  });

  test('200% zoom of 2560 × 1440: the desktop window, with logs', async () => {
    const page = await openPlaygroundPage({ width: 1280, height: 720, deviceScaleFactor: 2 });
    await withLogs(page);
    await settle(page);
    expect(await playgroundProblems(page)).toEqual([]);
  });

  test('text-only 200%, with logs', async () => {
    const page = await openPlaygroundPage();
    await withLogs(page);
    await zoomText(page, 2);
    await settle(page);
    expect(await playgroundProblems(page)).toEqual([]);
  });

  test('text spacing, with logs and the examples panel', async () => {
    const page = await openPlaygroundPage();
    await page.addStyleTag({ content: TEXT_SPACING_CSS });
    await withLogs(page);
    await settle(page);
    expect(await playgroundProblems(page)).toEqual([]);
    await page.locator(`${TOOLBAR} button.examples`).click();
    await settle(page);
    expect(await playgroundProblems(page)).toEqual([]);
  });
});
