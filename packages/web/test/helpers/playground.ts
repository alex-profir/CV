// The Playground test helper (008 research R25), on 005's shell helper: it
// opens the Playground from the dock as a visitor does, waits for the editor,
// puts code in it by pasting or typing, runs and stops it, and reads the
// panes. Every Playground browser test uses it.
//
// `PLAYGROUND_ENGINE` (`chromium`, `firefox` or `webkit`) chooses the browser
// for the tests that depend on the engine: `npm run test:engines` sets it.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { deflateRawSync } from 'node:zlib';
import type { Locator, Page, Route } from 'playwright';
import { siteText } from '../../src/site-text.ts';
import type { Engine } from './browser.ts';
import { openShell, settle } from './shell.ts';
import type { ShellOptions } from './shell.ts';
import type { BuiltSite } from './site.ts';

const text = siteText.playground;

export const PLAYGROUND = '#os section.playground';
export const EDITOR = `${PLAYGROUND} .playground-editor`;
export const LOADING = `${PLAYGROUND} .playground-loading`;
export const TOOLBAR = `${PLAYGROUND} .playground-toolbar`;
export const RUN_STATE = `${TOOLBAR} p.run-state`;
export const MESSAGE = `${PLAYGROUND} .playground-message`;
export const POPUP = `${PLAYGROUND} section.playground-popup`;
export const RUNNER = 'iframe.playground-runner';

// The engine chosen for this run: Chromium unless `PLAYGROUND_ENGINE` says
// otherwise.
export function engine(): Engine {
  const chosen = process.env['PLAYGROUND_ENGINE'] ?? 'chromium';
  if (chosen !== 'chromium' && chosen !== 'firefox' && chosen !== 'webkit') throw new Error(`PLAYGROUND_ENGINE is ${chosen}: it must be chromium, firefox or webkit`);
  return chosen;
}

// A desktop page, 1440 × 900, in the chosen engine, with the clipboard
// allowed where the engine has that permission (Chromium).
export const DESKTOP: ShellOptions = { width: 1440, height: 900 };

export function playgroundOptions(options: Partial<ShellOptions> = {}): ShellOptions {
  const chosen = options.engine ?? engine();
  return { ...DESKTOP, engine: chosen, ...(chosen === 'chromium' ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}), ...options };
}

// A fresh profile: a new browser context, with nothing stored, which is what
// every `openShell` gives. Named for the tests that say so.
export function freshProfile(options: Partial<ShellOptions> = {}): Promise<Page> {
  return openShell(playgroundOptions(options));
}

// Opens the Playground from the dock, in an open desktop shell, and waits
// for its window.
export async function openPlayground(page: Page): Promise<void> {
  await page.locator('#os .dock-item[data-app="playground"]').click();
  await page.waitForSelector(PLAYGROUND, { state: 'visible' });
  await settle(page);
}

// Waits until TypeScript is downloaded and the editor is ready: the loading
// view is gone and the status bar shows the version.
export async function waitReady(page: Page, timeout = 60_000): Promise<void> {
  try {
    await page.waitForSelector(`${EDITOR} .monaco-editor`, { state: 'visible', timeout });
    await page.waitForSelector(`${PLAYGROUND} .playground-status span.ts-version`, { state: 'visible', timeout });
    await page.waitForSelector(LOADING, { state: 'detached', timeout });
  } catch (error) {
    // What the window shows tells a slow start from a stuck one.
    const shown = await page.evaluate((selector) => document.querySelector(selector)?.textContent ?? '(no Playground)', PLAYGROUND).catch(() => '(the page is gone)');
    throw new Error(`${String(error)}\nThe Playground showed: ${shown.slice(0, 300)}`, { cause: error });
  }
}

// The shell opened in a fresh profile, with the Playground open and ready.
export async function openPlaygroundPage(options: Partial<ShellOptions> = {}): Promise<Page> {
  const page = await freshProfile(options);
  await openPlayground(page);
  await waitReady(page);
  return page;
}

// Whether the page thinks it's on a Mac, as the editor's keys do.
export function onMac(page: Page): Promise<boolean> {
  return page.evaluate(() => /Mac|iPhone|iPad/.test(navigator.platform));
}

// `Meta` on a Mac, `Control` elsewhere, as the page sees its system.
export async function primary(page: Page): Promise<'Meta' | 'Control'> {
  return (await onMac(page)) ? 'Meta' : 'Control';
}

// Focuses the editor by a click on its text.
export async function focusEditor(page: Page): Promise<void> {
  await page.locator(`${EDITOR} .view-lines`).click();
}

// Replaces the editor's code as a visitor pastes it: select all, then paste
// from the clipboard. Engines without Playwright's clipboard permission get
// the same paste event, carrying the text (inserted as an input, a long text
// came in twice in Firefox and mangled in WebKit).
export async function setCode(page: Page, code: string): Promise<void> {
  const key = await primary(page);
  await focusEditor(page);
  await page.keyboard.press(`${key}+A`);
  if (engine() === 'chromium') {
    await page.evaluate((value) => navigator.clipboard.writeText(value), code);
    await page.keyboard.press(`${key}+V`);
  } else {
    await page.evaluate((value) => {
      const clipboardData = new DataTransfer();
      clipboardData.setData('text/plain', value);
      // Firefox's constructor takes the text itself.
      const init = { clipboardData, dataType: 'text/plain', data: value, bubbles: true, cancelable: true };
      document.activeElement?.dispatchEvent(new ClipboardEvent('paste', init));
    }, code);
  }
}

// Types code key by key at the cursor, as a visitor does; the editor's own
// auto-closing and indentation apply.
export async function typeCode(page: Page, code: string): Promise<void> {
  await focusEditor(page);
  await page.keyboard.type(code);
}

// The Stop button: enabled while a run goes on.
const stopButton = (page: Page) => page.locator(`${TOOLBAR} button.stop`);

// Whether a run is going on, as the Stop button shows.
export async function running(page: Page): Promise<boolean> {
  return (await stopButton(page).getAttribute('aria-disabled')) !== 'true';
}

// Presses Run. With `wait: 'end'` (the default), waits until the run has
// ended; with `'start'`, until it has started, or has already ended, which a
// short run can do between two looks; with `'none'`, returns at once.
export async function run(page: Page, { wait = 'end', timeout = 30_000 }: { wait?: 'end' | 'start' | 'none'; timeout?: number } = {}): Promise<void> {
  await page.locator(`${TOOLBAR} button.run`).click();
  if (wait === 'none') return;
  if (wait === 'start') {
    await page.waitForFunction(({ button, state }) => document.querySelector(button)?.getAttribute('aria-disabled') !== 'true' || (document.querySelector(state)?.textContent ?? '') !== '', { button: `${TOOLBAR} button.stop`, state: RUN_STATE }, { timeout });
    return;
  }
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', `${TOOLBAR} button.stop`, { timeout });
}

// Presses Stop and waits until the run has ended.
export async function stop(page: Page, timeout = 5_000): Promise<void> {
  await stopButton(page).click();
  await page.waitForFunction((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', `${TOOLBAR} button.stop`, { timeout });
}

export type PaneName = 'javascript' | 'declarations' | 'errors' | 'logs';

// A pane's tab, by its name at the start of its label ("Errors 1").
export function paneTab(page: Page, pane: PaneName): Locator {
  return page.locator(`${PLAYGROUND} .pane-tabs [role="tab"]`).filter({ hasText: new RegExp(`^\\s*${text.panes[pane]}`) });
}

// Shows a pane by a click on its tab, if it isn't shown.
export async function showPane(page: Page, pane: PaneName): Promise<Locator> {
  const tab = paneTab(page, pane);
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click();
  return page.locator(`${PLAYGROUND} .pane-${pane}[role="tabpanel"]`);
}

// A pane's text, as shown, after showing it.
export async function paneText(page: Page, pane: PaneName): Promise<string> {
  return (await (await showPane(page, pane)).innerText()).trim();
}

export type LogRow = { level: string; text: string; line: number | null };

// The Logs pane's entries, in order: each one's level, its text without the
// level word, and its line when it has one.
export async function readLogs(page: Page): Promise<LogRow[]> {
  const pane = await showPane(page, 'logs');
  return pane.locator('ol.logs > li.log').evaluateAll((items) =>
    items.map((item) => {
      const copy = item.cloneNode(true) as HTMLElement;
      copy.querySelector('span.level')?.remove();
      const lineButton = copy.querySelector('button.log-line');
      const line = lineButton === null ? null : Number(/\d+/.exec(lineButton.textContent ?? '')?.[0]);
      lineButton?.remove();
      return { level: item.getAttribute('data-level') ?? '', text: (copy.textContent ?? '').trim(), line };
    }),
  );
}

// The Errors pane's errors, as their buttons read: "⊗ 14:7 … TS2322".
export async function readErrors(page: Page): Promise<string[]> {
  const pane = await showPane(page, 'errors');
  return pane.locator('li > button.error').allInnerTexts();
}

// Chooses an example by its title from the Examples panel.
export async function chooseExample(page: Page, title: string): Promise<void> {
  const button = page.locator(`${TOOLBAR} button.examples`);
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click();
  await page.locator(`${PLAYGROUND} section.examples-panel button`).filter({ hasText: title }).first().click();
}

// Chooses an item of the Playground window's menu in the menu bar, such as
// `Reset…`, with the Playground's window in front.
export async function menu(page: Page, item: string): Promise<void> {
  await page.click('#menu-title-app');
  await page.getByRole('menuitem', { name: item, exact: true }).click();
}

// Holds every response under `/playground/` until `release` is called, so
// the download state stays on screen. Call it before opening the Playground.
export async function holdEngine(page: Page): Promise<{ release: () => void }> {
  let letGo: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (letGo = resolve));
  await page.route(/\/playground\//, async (route: Route) => {
    await held;
    await route.continue();
  });
  return { release: letGo };
}

// A link as contracts/share-link.md writes it, made here from the content's
// JSON, so the page's reading is checked against the contract.
export function linkFrom(origin: string, json: string): string {
  const payload = deflateRawSync(Buffer.from(json, 'utf8')).toString('base64url');
  const check = createHash('sha256').update(payload, 'ascii').digest('base64url').slice(0, 11);
  return `${origin}/#playground=1.${payload}.${check}`;
}

export type EngineManifest = {
  api: number;
  version: string;
  typescript: string;
  entry: string;
  style: string;
  files: { path: string; bytes: number }[];
  total: number;
};

// The built engine's `files.json` (data-model.md EngineManifest), read from
// the built site: the one place a test gets the engine's files and sizes.
export function engineManifest(site: BuiltSite): EngineManifest {
  const manifest = site.manifest.files.find((file) => /^\/playground\/[\da-f]+\/files\.json$/.test(file.path));
  if (manifest === undefined) throw new Error('the built site has no engine manifest');
  return JSON.parse(fs.readFileSync(path.join(site.dir, manifest.path), 'utf8'));
}

// The text a Monaco view shows, its rendered lines in order, with the
// non-breaking spaces it draws read as spaces. Only lines on screen are
// rendered, so it suits short code. The error message the editor shows
// after the cursor's line is left out: it isn't code.
export function viewText(page: Page, selector: string): Promise<string> {
  return page
    .locator(`${selector} .view-lines`)
    .first()
    .evaluate((lines) =>
      [...lines.querySelectorAll<HTMLElement>('.view-line')]
        .sort((a, b) => parseFloat(a.style.top) - parseFloat(b.style.top))
        .map((line) => {
          const copy = line.cloneNode(true) as HTMLElement;
          for (const message of copy.querySelectorAll('.playground-inline-message')) message.remove();
          return copy;
        })
        .map((line) => (line.textContent ?? '').replace(/ /g, ' '))
        .join('\n'),
    );
}

export const editorText = (page: Page) => viewText(page, EDITOR);

// The read-only output a pane shows: the JavaScript or the declarations.
export async function outputText(page: Page, pane: 'javascript' | 'declarations'): Promise<string> {
  await showPane(page, pane);
  return viewText(page, `${PLAYGROUND} .pane-${pane} .playground-output`);
}

// How many error and warning marks the editor draws.
export function errorMarks(page: Page): Promise<number> {
  return page.locator(`${EDITOR} :is(.squiggly-error, .squiggly-warning)`).count();
}

// The editor's text is the given code, once it has been replaced and
// rendered.
export async function waitForCode(page: Page, code: string): Promise<void> {
  const first = code.split('\n')[0]!;
  await page.waitForFunction(
    ({ selector, line }) => [...document.querySelectorAll(`${selector} .view-line`)].some((element) => (element.textContent ?? '').replace(/ /g, ' ') === line),
    { selector: EDITOR, line: first },
  );
}

// Waits until the check of the current code has come back: the status bar
// no longer says `Checking…` and the error count is settled for 400 ms.
export async function waitChecked(page: Page): Promise<void> {
  await page.waitForTimeout(400);
  await page.waitForFunction((selector) => !(document.querySelector(selector)?.textContent ?? '').includes('…'), `${PLAYGROUND} .playground-status .check`);
}
