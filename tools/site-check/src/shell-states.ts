// The state driver (005 research R17, data-model.md Site check results): the
// shell states the check measures the site root in, and how a fresh page
// reaches each one. It acts as a visitor does, by clicks, taps and keys once
// the shell has hydrated, never through a hook in the site. Elements are
// found by their structure, not their names, so a check of the names (such
// as axe's `button-name`) still gets to measure every state.
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import type { BrowserContextOptions, Locator, Page } from 'playwright';
import { siteText } from '../../../packages/web/src/site-text.ts';

export type Shell = 'desktop' | 'mobile';

// The Terminal's states (006 contracts/cli.md States) follow the shell's.
export const TERMINAL_DESKTOP_STATES = [
  'terminal-open',
  'terminal-help',
  'terminal-vim',
  'terminal-vim-search',
  'terminal-vim-help',
  'terminal-unknown',
  'terminal-ls',
  'terminal-cat',
  'terminal-clear',
  'terminal-long-command',
  'terminal-minimized',
  'terminal-maximized',
  'terminal-two-windows',
  'terminal-specs',
  'terminal-menu',
] as const;

export const TERMINAL_MOBILE_STATES = [
  'pocket',
  'pocket-landscape',
  'pocket-keyboard',
  'pocket-vim',
  'pocket-help',
  'pocket-unknown',
  'pocket-ls',
  'pocket-cat',
  'pocket-clear',
  'pocket-long-command',
  'pocket-vim-search',
  'pocket-vim-help',
] as const;

// The inspector's states (007 contracts/cli.md States) follow the
// Terminal's. 006's desktop `terminal-specs` is the `specs` command's
// output, so the Terminal's spec view is `terminal-app-specs`.
export const INSPECTOR_DESKTOP_STATES = ['cv-specs', 'cv-specs-whats-this', 'terminal-app-specs', 'terminal-app-specs-beside-cv', 'about-specs', 'cv-specs-narrow'] as const;

export const INSPECTOR_MOBILE_STATES = ['cv-specs', 'cv-specs-whats-this', 'terminal-app-specs', 'about-specs', 'cv-specs-320', 'cv-specs-landscape'] as const;

const INSPECTOR_STATES = new Set<string>([...INSPECTOR_DESKTOP_STATES, ...INSPECTOR_MOBILE_STATES]);

// The Playground's states (008 contracts/cli.md States) follow the
// inspector's. The list of keys joins them with its popup (008 T071).
export const PLAYGROUND_DESKTOP_STATES = [
  'playground-downloading',
  'playground-offline',
  'playground-ready',
  'playground-errors',
  'playground-hover',
  'playground-suggestions',
  'playground-peek',
  'playground-rename',
  'playground-quick-fixes',
  'playground-palette',
  'playground-menu',
  'playground-options',
  'playground-examples',
  'playground-running',
  'playground-stuck',
  'playground-shared',
  'playground-too-long',
  'playground-broken-link',
  'playground-shared-opened',
  'playground-reset',
  'playground-keys',
  'playground-specs',
  'playground-narrow',
] as const;

export const PLAYGROUND_MOBILE_STATES = ['playground-best-on-desktop', 'playground-shared-link', 'playground-best-on-desktop-320', 'playground-best-on-desktop-landscape'] as const;

const PLAYGROUND_STATES = new Set<string>([...PLAYGROUND_DESKTOP_STATES, ...PLAYGROUND_MOBILE_STATES]);

export const DESKTOP_STATES = ['first-load', 'no-window', 'about', 'two-windows', 'site-menu', 'window-menu', 'minimized', 'maximized', 'keyboard-move', 'keyboard-resize', ...TERMINAL_DESKTOP_STATES, ...INSPECTOR_DESKTOP_STATES, ...PLAYGROUND_DESKTOP_STATES] as const;

export const MOBILE_STATES = ['home', 'home-landscape', 'cv-app', 'about', ...TERMINAL_MOBILE_STATES, ...INSPECTOR_MOBILE_STATES, ...PLAYGROUND_MOBILE_STATES] as const;

export type DesktopState = (typeof DESKTOP_STATES)[number];

export type MobileState = (typeof MOBILE_STATES)[number];

export type ShellState = { shell: 'desktop'; state: DesktopState; width: number; height: number } | { shell: 'mobile'; state: MobileState; width: number; height: number };

// The sizes each shell is measured at: the desktop at 1440 × 900, the phone
// at 375 × 812, and on its side at 812 × 375 for `home-landscape`,
// `pocket-landscape` and `cv-specs-landscape`; `cv-specs-320` at 320 × 568.
export const SHELL_SIZES = Object.freeze({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } });

const MOBILE_SIZES: Record<string, { width: number; height: number }> = {
  'home-landscape': { width: 812, height: 375 },
  'pocket-landscape': { width: 812, height: 375 },
  'cv-specs-landscape': { width: 812, height: 375 },
  'cv-specs-320': { width: 320, height: 568 },
  'playground-best-on-desktop-320': { width: 320, height: 568 },
  'playground-best-on-desktop-landscape': { width: 812, height: 375 },
};

export const SHELL_STATES: readonly ShellState[] = Object.freeze([
  ...DESKTOP_STATES.map((state): ShellState => ({ shell: 'desktop', state, ...SHELL_SIZES.desktop })),
  ...MOBILE_STATES.map((state): ShellState => ({ shell: 'mobile', state, ...(MOBILE_SIZES[state] ?? SHELL_SIZES.mobile) })),
]);

// The Terminal's states alone, in the same order.
export const TERMINAL_STATES: readonly ShellState[] = Object.freeze(SHELL_STATES.filter(({ state }) => !INSPECTOR_STATES.has(state) && (state.startsWith('terminal-') || state.startsWith('pocket'))));

// The Playground's states alone, in the same order.
export const PLAYGROUND_SHELL_STATES: readonly ShellState[] = Object.freeze(SHELL_STATES.filter(({ state }) => PLAYGROUND_STATES.has(state)));

// The inspector's states alone, in the same order.
export const INSPECTOR_SHELL_STATES: readonly ShellState[] = Object.freeze(SHELL_STATES.filter(({ state }) => INSPECTOR_STATES.has(state)));

// A variant on the root (contracts/cli.md Variants on the root): the shell,
// the state or the sequence's name, and the width.
export function stateVariant(shell: Shell, state: string, width: number): string {
  return `${shell}/${state}/${width}px`;
}

// The shell's elements the driver and the parts use (005 contracts/shell.md).
export const SHELL = Object.freeze({
  ready: '#os[data-ready]',
  cvWindow: '#os .window[data-view="cv"]',
  aboutWindow: '#os .window[data-view="about"]',
  cvTitle: '#os .window[data-view="cv"] .window-title',
  aboutTitle: '#os .window[data-view="about"] .window-title',
  cvDockItem: '#os .dock-item[data-app="cv"]',
  siteMenuTitle: '#menu-title-site',
  windowMenuTitle: '#menu-title-window',
  siteMenu: '#menu-site',
  windowMenu: '#menu-window',
  // The site menu's first command, About this site; its others are links.
  aboutItem: '#menu-site button.menu-item',
  pad: '#os .pad',
  padFirst: '#os .pad button.pad-up',
  cvIcon: '#os .app-icon[data-view="cv"]',
  aboutButton: '#os .home button.about',
  homeButton: '#os .home-button',
  cvFullScreen: '#os .full-screen[data-view="cv"]',
  aboutFullScreen: '#os .full-screen[data-view="about"]',
  // The Terminal (006 contracts/terminal.md, contracts/shell.md).
  terminalWindow: '#os .window[data-view="terminal"]',
  terminalTitle: '#os .window[data-view="terminal"] .window-title',
  terminalDockItem: '#os .dock-item[data-app="terminal"]',
  terminalIcon: '#os .home .app-icon[data-view="terminal"]',
  terminalFullScreen: '#os .full-screen[data-view="terminal"]',
  appMenuTitle: '#menu-title-app',
  appMenu: '#menu-app',
});

// The Terminal's elements, inside its window or full-screen view.
export const TERMINAL = Object.freeze({
  commandLine: '#os .terminal input.command-line',
  run: '#os .terminal section.run',
  output: '.run-output',
  vim: '#os .terminal section.vim',
  vimText: '#os .terminal section.vim .vim-text',
  vimLine: '#os .terminal section.vim .vim-line',
  vimEntry: '#os .terminal section.vim input.vim-entry',
  vimFold: '#os .terminal section.vim button.vim-fold',
  vimHelp: '#os .terminal section.vim .vim-help',
  vimChip: '#os .terminal section.vim .vim-chips button.command-chip',
  pocket: '#os .pocket',
  pocketKey: '#os .pocket-keys button.pocket-key',
});

// The inspector's elements (007 contracts/inspector.md): a view's "Show
// specs", in its window or full-screen view, and its spec view.
export type InspectorView = 'cv' | 'terminal' | 'about';

export const INSPECTOR = Object.freeze({
  frame: (view: InspectorView, shell: Shell) => (shell === 'desktop' ? `#os .window[data-view="${view}"]` : `#os .full-screen[data-view="${view}"]`),
  scroller: (view: InspectorView, shell: Shell) => (shell === 'desktop' ? `#os .window[data-view="${view}"] .window-content` : `#os .full-screen[data-view="${view}"] .view-content`),
  showSpecs: (view: InspectorView, shell: Shell) => `${INSPECTOR.frame(view, shell)} button.show-specs`,
  specView: (view: InspectorView) => `#os section.spec-view[data-view="${view}"]`,
  groups: (view: InspectorView) => `#os section.spec-view[data-view="${view}"] section.spec-group`,
  back: (view: InspectorView) => `#os section.spec-view[data-view="${view}"] button.spec-back`,
  whatsThis: (view: InspectorView) => `#os section.spec-view[data-view="${view}"] button.whats-this`,
});

// Where the CV app's document is in each shell, for the field sequence.
export const CV_APP_ROOT = Object.freeze({ desktop: `${SHELL.cvWindow} .cv`, mobile: `${SHELL.cvFullScreen} .cv` });

export const control = (view: 'cv' | 'about' | 'terminal', name: 'close' | 'minimize' | 'maximize') => `#os .window[data-view="${view}"] .control-${name}`;

// How long an element the driver waits for may take to appear.
const WAIT_MS = 5_000;

// A context's options for a shell at a size: a phone has touch.
export function shellContext({ shell, width, height }: { shell: Shell; width: number; height: number }): BrowserContextOptions {
  return { viewport: { width, height }, ...(shell === 'mobile' ? { hasTouch: true } : {}) };
}

// Waits until hydration has finished and the fonts have loaded.
export async function waitForShell(page: Page, timeout = 15_000): Promise<void> {
  await page.waitForSelector(SHELL.ready, { state: 'attached', timeout });
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

// Waits for the shell's animations to end (005 research R13): every finite
// animation running, then two frames for what a finished closing animation
// changes.
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    for (let round = 0; round < 5; round += 1) {
      const running = document.getAnimations().filter((animation) => animation.playState === 'running' && animation.effect?.getComputedTiming().endTime !== Infinity);
      if (running.length === 0 && round > 0) return;
      await Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
      await frame();
      await frame();
    }
  });
}

const shown = (page: Page, selector: string) => page.locator(selector).first().waitFor({ state: 'visible', timeout: WAIT_MS });

const gone = (page: Page, selector: string) => page.locator(selector).first().waitFor({ state: 'hidden', timeout: WAIT_MS });

export async function openAbout(page: Page): Promise<void> {
  await page.click(SHELL.siteMenuTitle);
  await shown(page, SHELL.aboutItem);
  await page.click(SHELL.aboutItem);
  await shown(page, SHELL.aboutWindow);
  await settle(page);
}

// The CV window's title bar clicked, so the window has focus and the
// shortcuts act on it.
async function focusCv(page: Page): Promise<void> {
  await page.click(`${SHELL.cvWindow} .title-bar`);
}

// Opens the CV app: on the desktop it's the window open on first load; on
// the phone, one tap on its icon.
export async function openCvApp(page: Page, shell: Shell): Promise<void> {
  if (shell === 'mobile') {
    await page.tap(SHELL.cvIcon);
    await shown(page, SHELL.cvFullScreen);
  }
  await shown(page, CV_APP_ROOT[shell]);
  await settle(page);
}

// ---- The Terminal (006 contracts/cli.md States) ---------------------------

// Opens the Terminal as a visitor does: from the dock, or by a tap on its
// home screen icon, until its command line shows.
export async function openTerminal(page: Page, shell: Shell): Promise<void> {
  if (shell === 'desktop') await page.click(SHELL.terminalDockItem);
  else await page.tap(SHELL.terminalIcon);
  await shown(page, TERMINAL.commandLine);
  await settle(page);
}

const runs = (page: Page) => page.locator(TERMINAL.run).count();

// Types a line into the command line and presses Enter.
export async function typeLine(page: Page, line: string): Promise<void> {
  const input = page.locator(TERMINAL.commandLine);
  if (!(await input.evaluate((element) => element === document.activeElement))) await input.focus();
  await input.fill('');
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
}

// Waits for the run a line, a key or a control adds, and gives it back.
export async function newRun(page: Page, act: () => Promise<void>): Promise<Locator> {
  const before = await runs(page);
  await act();
  await page.waitForFunction(([selector, count]) => document.querySelectorAll(selector as string).length > (count as number), [TERMINAL.run, before] as const, { timeout: WAIT_MS });
  return page.locator(TERMINAL.run).last();
}

// Types a line and gives back the run it adds.
export const runCommand = (page: Page, line: string) => newRun(page, () => typeLine(page, line));

// Runs `cv` and waits for the vim view.
export async function openVim(page: Page): Promise<void> {
  await typeLine(page, 'cv');
  await shown(page, TERMINAL.vimText);
  await settle(page);
}

// Presses keys in the vim view.
export async function vimKeys(page: Page, keys: readonly string[]): Promise<void> {
  await page.locator(TERMINAL.vimText).focus();
  for (const key of keys) await page.keyboard.press(key);
}

// `/` or `:` in the vim view, then the text and Enter: the key opens the
// entry, which takes the text.
export async function vimEntry(page: Page, kind: '/' | ':', text: string): Promise<void> {
  await vimKeys(page, [kind]);
  await shown(page, TERMINAL.vimEntry);
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
}

// The vim line the cursor is on, and the line of the work section's fold.
const vimLines = (page: Page) =>
  page.evaluate((selector) => {
    const lines = [...document.querySelectorAll(selector)];
    const number = (line: Element | undefined) => (line === undefined ? null : Number(line.getAttribute('data-line')));
    return {
      cursor: number(lines.find((line) => line.querySelector('.vim-cursor') !== null)),
      work: number(lines.find((line) => /^\s*(?:\+-- \d+ \S+: )?"work": [[{]/.test(line.querySelector('.vim-code')?.textContent ?? ''))),
    };
  }, TERMINAL.vimLine);

// Moves the cursor with `j` to the work section's fold, then `za`.
async function openWorkFold(page: Page): Promise<void> {
  for (let presses = 0; presses < 100; presses += 1) {
    const { cursor, work } = await vimLines(page);
    if (work === null) throw new Error('the vim view shows no work section');
    if (cursor === work) break;
    await vimKeys(page, ['j']);
  }
  await vimKeys(page, ['z', 'a']);
}

// The first word of four letters or more in the CV's first work summary,
// as the vim view shows it once the work fold is open.
async function searchWord(page: Page): Promise<string> {
  const word = await page.evaluate((selector) => {
    for (const line of document.querySelectorAll(selector)) {
      const value = /^\s*"summary": "(.*)",?$/.exec(line.querySelector('.vim-code')?.textContent ?? '');
      if (value !== null) return /\p{L}{4,}/u.exec(value[1]!)?.[0] ?? null;
    }
    return null;
  }, TERMINAL.vimLine);
  if (word === null) throw new Error("the vim view shows no word in the first work summary");
  return word;
}

export const escaped = (text: string) => text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');

// A pocket key, by the text it shows.
const pocketKey = (page: Page, key: string) => page.locator(TERMINAL.pocketKey).filter({ hasText: new RegExp(`^${escaped(key)}$`) });

export async function tapPocketKey(page: Page, key: string): Promise<void> {
  await pocketKey(page, key).first().tap();
}

// The first `ls` control in the newest run whose label ends with `/` (a
// folder) or doesn't (a file).
const lsControl = (page: Page, folder: boolean) =>
  page
    .locator(TERMINAL.run)
    .last()
    .locator('ul.out-columns button')
    .filter({ hasText: folder ? /\/$/ : /[^/]$/ });

async function driveTerminal(page: Page, shell: Shell, state: string): Promise<void> {
  if (state === 'pocket-landscape' || state === 'pocket' || state === 'terminal-open' || state === 'terminal-two-windows') return;
  switch (state) {
    case 'terminal-help':
      return void (await runCommand(page, 'help'));
    case 'terminal-vim':
      return openVim(page);
    case 'terminal-vim-search': {
      await openVim(page);
      await openWorkFold(page);
      return vimEntry(page, '/', await searchWord(page));
    }
    case 'terminal-vim-help':
      await openVim(page);
      await vimEntry(page, ':', 'help');
      return shown(page, TERMINAL.vimHelp);
    case 'terminal-unknown':
      return void (await runCommand(page, 'wrok'));
    case 'terminal-ls':
      return void (await runCommand(page, 'ls'));
    case 'terminal-cat': {
      await runCommand(page, 'cd work');
      await runCommand(page, 'ls');
      const file = await lsControl(page, false).first().getAttribute('aria-label');
      if (file === null) throw new Error('ls in ~/work lists no file');
      return void (await runCommand(page, file));
    }
    case 'terminal-clear':
      await runCommand(page, 'help');
      await typeLine(page, 'clear');
      return void (await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, TERMINAL.run, { timeout: WAIT_MS }));
    case 'terminal-long-command':
      await page.locator(TERMINAL.commandLine).focus();
      return page.keyboard.insertText('help '.repeat(100));
    case 'terminal-minimized':
      await page.click(control('terminal', 'minimize'));
      return gone(page, SHELL.terminalWindow);
    case 'terminal-maximized':
      await runCommand(page, 'help');
      await page.click(control('terminal', 'maximize'));
      return void (await page.waitForSelector(`${SHELL.terminalWindow}[data-maximized]`, { timeout: WAIT_MS }));
    case 'terminal-specs':
      return void (await runCommand(page, 'specs'));
    case 'terminal-menu':
      await page.click(SHELL.appMenuTitle);
      return shown(page, SHELL.appMenu);
    case 'pocket-keyboard':
      await page.locator(TERMINAL.commandLine).tap();
      await page.setViewportSize({ width: SHELL_SIZES.mobile.width, height: SHELL_SIZES.mobile.height - 300 });
      return void (await page.waitForSelector(`${TERMINAL.pocket}[data-keyboard]`, { timeout: WAIT_MS }));
    case 'pocket-vim':
      await tapPocketKey(page, 'cv');
      return shown(page, TERMINAL.vimText);
    case 'pocket-help':
      return void (await newRun(page, () => tapPocketKey(page, 'help')));
    case 'pocket-unknown':
      await page.locator(TERMINAL.commandLine).tap();
      return void (await runCommand(page, 'wrok'));
    case 'pocket-ls':
      return void (await newRun(page, () => tapPocketKey(page, 'ls')));
    case 'pocket-cat':
      await newRun(page, () => tapPocketKey(page, 'ls'));
      await newRun(page, () => lsControl(page, true).filter({ hasText: /^work\/$/ }).first().tap());
      return void (await newRun(page, () => lsControl(page, false).first().tap()));
    case 'pocket-clear':
      await newRun(page, () => tapPocketKey(page, 'help'));
      await tapPocketKey(page, 'clear');
      return void (await page.waitForFunction((selector) => document.querySelectorAll(selector).length === 0, TERMINAL.run, { timeout: WAIT_MS }));
    case 'pocket-long-command':
      await page.locator(TERMINAL.commandLine).tap();
      return page.keyboard.insertText('help '.repeat(100));
    case 'pocket-vim-search': {
      await tapPocketKey(page, 'cv');
      await shown(page, TERMINAL.vimText);
      await page.locator(TERMINAL.vimFold).filter({ hasText: '"work":' }).first().tap();
      const word = await searchWord(page);
      await tapPocketKey(page, '/');
      await shown(page, TERMINAL.vimEntry);
      await page.keyboard.type(word);
      return page.keyboard.press('Enter');
    }
    case 'pocket-vim-help':
      await tapPocketKey(page, 'cv');
      await shown(page, TERMINAL.vimText);
      await page.locator(TERMINAL.vimChip).filter({ hasText: /^:help$/ }).first().tap();
      return shown(page, TERMINAL.vimHelp);
  }
  throw new Error(`no way to reach ${shell}/${state}`);
}

// ---- The inspector (007 contracts/cli.md States) -------------------------

const press = async (page: Page, shell: Shell, selector: string) => {
  if (shell === 'desktop') await page.click(selector);
  else await page.tap(selector);
};

// Shows an open view's specs by its "Show specs", and waits for the groups.
export async function showSpecs(page: Page, view: InspectorView, shell: Shell): Promise<void> {
  await press(page, shell, INSPECTOR.showSpecs(view, shell));
  await page.locator(INSPECTOR.groups(view)).first().waitFor({ state: 'attached', timeout: WAIT_MS });
  await settle(page);
}

// Goes back to the app by its "Back to [view]".
export async function leaveSpecs(page: Page, view: InspectorView, shell: Shell): Promise<void> {
  await press(page, shell, INSPECTOR.back(view));
  await page.locator(INSPECTOR.specView(view)).waitFor({ state: 'detached', timeout: WAIT_MS });
  await settle(page);
}

// Opens a view as a visitor does, if it isn't shown.
export async function openView(page: Page, view: InspectorView, shell: Shell): Promise<void> {
  if (await page.locator(INSPECTOR.frame(view, shell)).first().isVisible()) return;
  if (shell === 'mobile' && (await page.locator('#os .full-screen').count()) > 0) {
    await page.tap(SHELL.homeButton);
    await shown(page, '#os .home');
  }
  if (view === 'cv') {
    if (shell === 'desktop') await page.click(SHELL.cvDockItem);
    else await page.tap(SHELL.cvIcon);
  } else if (view === 'terminal') {
    if (shell === 'desktop') await page.click(SHELL.terminalDockItem);
    else await page.tap(SHELL.terminalIcon);
  } else if (shell === 'desktop') await openAbout(page);
  else await page.tap(SHELL.aboutButton);
  await shown(page, INSPECTOR.frame(view, shell));
  await settle(page);
}

// Narrows the focused CV window as far as a keyboard resize goes: wide
// steps to the left until its width stops changing, then Enter.
async function narrowCv(page: Page): Promise<void> {
  const width = () => page.evaluate((target) => document.querySelector(target)?.getBoundingClientRect().width ?? 0, SHELL.cvWindow);
  await focusCv(page);
  await page.keyboard.press('Alt+Shift+S');
  await shown(page, SHELL.pad);
  for (let presses = 0, last = -1; presses < 40; presses += 1) {
    await page.keyboard.press('Shift+ArrowLeft');
    const now = await width();
    if (now === last) break;
    last = now;
  }
  await page.keyboard.press('Enter');
  await gone(page, SHELL.pad);
}

async function driveInspector(page: Page, shell: Shell, state: string): Promise<void> {
  switch (state) {
    case 'cv-specs':
    case 'cv-specs-320':
    case 'cv-specs-landscape':
      await openView(page, 'cv', shell);
      return showSpecs(page, 'cv', shell);
    case 'cv-specs-whats-this':
      await openView(page, 'cv', shell);
      await showSpecs(page, 'cv', shell);
      await press(page, shell, INSPECTOR.whatsThis('cv'));
      return void (await page.waitForSelector(`${INSPECTOR.whatsThis('cv')}[aria-expanded="true"]`, { timeout: WAIT_MS }));
    case 'cv-specs-narrow':
      await showSpecs(page, 'cv', shell);
      return narrowCv(page);
    case 'terminal-app-specs':
    case 'terminal-app-specs-beside-cv':
      if (shell === 'desktop') {
        await shown(page, SHELL.cvWindow);
        await openTerminal(page, shell);
        await runCommand(page, 'help');
      } else {
        await openTerminal(page, shell);
        await newRun(page, () => tapPocketKey(page, 'help'));
      }
      await showSpecs(page, 'terminal', shell);
      // The CV window brought in front, showing the CV, the Terminal's
      // spec view beside it.
      if (state === 'terminal-app-specs-beside-cv') await page.click(`${SHELL.cvWindow} .title-bar`);
      return;
    case 'about-specs':
      await openView(page, 'about', shell);
      return showSpecs(page, 'about', shell);
  }
  throw new Error(`no way to reach ${shell}/${state}`);
}

async function drive(page: Page, { shell, state }: ShellState): Promise<void> {
  if (PLAYGROUND_STATES.has(state)) {
    if (shell === 'desktop') await shown(page, SHELL.cvWindow);
    return drivePlayground(page, shell, state);
  }
  if (INSPECTOR_STATES.has(state)) {
    if (shell === 'desktop') await shown(page, SHELL.cvWindow);
    return driveInspector(page, shell, state);
  }
  if (state.startsWith('terminal-') || state.startsWith('pocket')) {
    if (shell === 'desktop') await shown(page, SHELL.cvWindow);
    await openTerminal(page, shell);
    return driveTerminal(page, shell, state);
  }
  if (shell === 'mobile') {
    if (state === 'cv-app') await openCvApp(page, 'mobile');
    if (state === 'about') {
      await page.tap(SHELL.aboutButton);
      await shown(page, SHELL.aboutFullScreen);
    }
    return;
  }
  await shown(page, SHELL.cvWindow);
  switch (state) {
    case 'first-load':
      return;
    case 'no-window':
      await page.click(control('cv', 'close'));
      await gone(page, SHELL.cvWindow);
      return;
    case 'about':
      await openAbout(page);
      await page.click(control('cv', 'close'));
      await gone(page, SHELL.cvWindow);
      return;
    case 'two-windows':
      return openAbout(page);
    case 'site-menu':
      await page.click(SHELL.siteMenuTitle);
      await shown(page, SHELL.siteMenu);
      return;
    case 'window-menu':
      await page.click(SHELL.windowMenuTitle);
      await shown(page, SHELL.windowMenu);
      return;
    case 'minimized':
      await page.click(control('cv', 'minimize'));
      await gone(page, SHELL.cvWindow);
      return;
    case 'maximized':
      await page.click(control('cv', 'maximize'));
      await page.waitForSelector(`${SHELL.cvWindow}[data-maximized]`, { timeout: WAIT_MS });
      return;
    case 'keyboard-move':
    case 'keyboard-resize':
      await focusCv(page);
      await page.keyboard.press(state === 'keyboard-move' ? 'Alt+Shift+P' : 'Alt+Shift+S');
      await shown(page, SHELL.pad);
      await page.keyboard.press(state === 'keyboard-move' ? 'ArrowRight' : 'ArrowLeft');
      return;
  }
}

// ---- The Playground (008 contracts/cli.md States) ---------------------------

// The Playground's elements, inside its window or full-screen view.
export const PLAYGROUND = Object.freeze({
  window: '#os .window[data-view="playground"]',
  root: '#os section.playground',
  dockItem: '#os .dock-item[data-app="playground"]',
  icon: '#os .home .app-icon[data-view="playground"]',
  phoneScreen: '#os .full-screen[data-view="playground"] section.playground-mobile',
  loading: '#os section.playground .playground-loading',
  retry: '#os section.playground .playground-loading button.playground-retry',
  editor: '#os section.playground .playground-editor',
  toolbar: '#os section.playground .playground-toolbar',
  status: '#os section.playground .playground-status',
  version: '#os section.playground .playground-status span.ts-version',
  check: '#os section.playground .playground-status .check',
  message: '#os section.playground .playground-message',
  popup: '#os section.playground section.playground-popup',
  paneTabs: '#os section.playground .pane-tabs [role="tab"]',
  runner: 'iframe.playground-runner',
});

// How long the engine's download, a check or a run may take.
export const PLAYGROUND_WAIT_MS = 60_000;

export async function openPlayground(page: Page): Promise<void> {
  await page.click(PLAYGROUND.dockItem);
  await shown(page, PLAYGROUND.root);
}

// Waits until TypeScript is downloaded and the editor shows.
export async function playgroundReady(page: Page): Promise<void> {
  await page.waitForSelector(`${PLAYGROUND.editor} .monaco-editor`, { state: 'visible', timeout: PLAYGROUND_WAIT_MS });
  await page.waitForSelector(PLAYGROUND.version, { state: 'visible', timeout: PLAYGROUND_WAIT_MS });
  await page.waitForSelector(PLAYGROUND.loading, { state: 'detached', timeout: PLAYGROUND_WAIT_MS });
}

// The editor's primary modifier, as Monaco chooses it from the platform.
export const primaryKey = async (page: Page) => ((await page.evaluate(() => /Macintosh|Mac OS X/.test(navigator.userAgent))) ? 'Meta' : 'Control');

// Waits until the current code's check has come back: the status bar no
// longer says it is checking, settled for 400 ms.
export async function playgroundChecked(page: Page): Promise<void> {
  await page.waitForTimeout(400);
  await page.waitForFunction((selector) => !(document.querySelector(selector)?.textContent ?? '').includes('…'), PLAYGROUND.check, { timeout: PLAYGROUND_WAIT_MS });
}

// Replaces the code by a paste: select all, then the clipboard. Typed text
// would get the editor's auto-closing and indentation. Then waits for its
// check.
export async function putCode(page: Page, code: string): Promise<void> {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  const key = await primaryKey(page);
  await page.click(`${PLAYGROUND.editor} .view-lines`);
  await page.keyboard.press(`${key}+KeyA`);
  await page.evaluate((text) => navigator.clipboard.writeText(text), code);
  await page.keyboard.press(`${key}+KeyV`);
  await page.waitForFunction(({ selector, line }) => [...document.querySelectorAll(`${selector} .view-line`)].some((element) => (element.textContent ?? '').replace(/\u00a0/g, ' ').startsWith(line)), { selector: PLAYGROUND.editor, line: code.split('\n')[0]!.slice(0, 40) }, { timeout: WAIT_MS });
  await playgroundChecked(page);
}

// Puts the cursor at `line`:`column` by Go to line.
export async function cursorAt(page: Page, line: number, column: number): Promise<void> {
  await page.keyboard.press('Control+KeyG');
  await page.keyboard.type(`${line}:${column}`);
  await page.keyboard.press('Enter');
}

const stopDisabled = (page: Page) => page.evaluate((selector) => document.querySelector(selector)?.getAttribute('aria-disabled') === 'true', `${PLAYGROUND.toolbar} button.stop`);

// Presses Run and waits for the run to start, or to end.
export async function runPlayground(page: Page, until: 'start' | 'end'): Promise<void> {
  await page.click(`${PLAYGROUND.toolbar} button.run`);
  const ended = until === 'end';
  await page.waitForFunction(({ selector, ended: waitEnd }) => (document.querySelector(selector)?.getAttribute('aria-disabled') === 'true') === waitEnd, { selector: `${PLAYGROUND.toolbar} button.stop`, ended }, { timeout: PLAYGROUND_WAIT_MS });
}

export const playgroundRunning = async (page: Page) => !(await stopDisabled(page));

// A link as 008 contracts/share-link.md writes it: version 1, the content's
// JSON deflated in base64url, and its check.
export function shareLink(origin: string, content: { c: string; o?: Record<string, unknown> }): string {
  const payload = deflateRawSync(Buffer.from(JSON.stringify(content), 'utf8')).toString('base64url');
  const check = createHash('sha256').update(payload, 'ascii').digest('base64url').slice(0, 11);
  return `${origin}/#playground=1.${payload}.${check}`;
}

// Follows `href` as a new load, as opening a link does.
export async function followLink(page: Page, href: string): Promise<void> {
  await page.goto('about:blank');
  await page.goto(href, { waitUntil: 'load' });
  await waitForShell(page);
}

// Code that names a function, an object with properties and a use of both.
const NAMES = 'function area(side: number) {\n  return side * side;\n}\nconst job = { level: 1, title: "x" };\nconsole.log(area(2), job);';

// Code whose link is over the limit: 14,000 letters no compression shrinks.
export function tooLongCode(): string {
  let seed = 11;
  let noise = '';
  while (noise.length < 14_000) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    noise += String.fromCharCode(97 + (seed % 26));
  }
  return `const noise = "${noise}";`;
}

async function readyPlayground(page: Page): Promise<void> {
  await openPlayground(page);
  await playgroundReady(page);
}

async function drivePlayground(page: Page, shell: Shell, state: string): Promise<void> {
  const origin = new URL(page.url()).origin;
  if (shell === 'mobile') {
    if (state === 'playground-shared-link') await followLink(page, shareLink(origin, { c: 'console.log("shared");' }));
    else await page.tap(PLAYGROUND.icon);
    await shown(page, PLAYGROUND.phoneScreen);
    return;
  }
  switch (state) {
    case 'playground-downloading':
      // The engine's files held back, so the download stays on screen.
      await page.route(/\/playground\//, () => undefined);
      await openPlayground(page);
      await shown(page, PLAYGROUND.loading);
      return;
    case 'playground-offline':
      await page.context().setOffline(true);
      await openPlayground(page);
      await page.waitForSelector(PLAYGROUND.retry, { timeout: PLAYGROUND_WAIT_MS });
      return;
    case 'playground-broken-link':
    case 'playground-shared-opened':
      await followLink(page, state === 'playground-broken-link' ? `${origin}/#playground=1.ZZZZ.ZZZZ` : shareLink(origin, { c: 'console.log("shared");' }));
      await playgroundReady(page);
      await shown(page, PLAYGROUND.message);
      return;
  }
  await readyPlayground(page);
  const key = await primaryKey(page);
  switch (state) {
    case 'playground-ready':
      return;
    case 'playground-errors':
      await putCode(page, 'const n: number = "one";');
      await page.locator(PLAYGROUND.paneTabs).filter({ hasText: new RegExp(`^\\s*${siteText.playground.panes.errors}`) }).click();
      return;
    case 'playground-hover':
      await putCode(page, NAMES);
      await cursorAt(page, 5, 14);
      await page.keyboard.press(`${key}+KeyK`);
      await page.keyboard.press(`${key}+KeyI`);
      return shown(page, `${PLAYGROUND.editor} .monaco-hover:not(.hidden)`);
    case 'playground-suggestions':
      await putCode(page, `${NAMES}\njob.le`);
      await page.keyboard.press(`${key}+ArrowDown`);
      await page.keyboard.press('End');
      await page.keyboard.press('Control+Space');
      return shown(page, `${PLAYGROUND.editor} .suggest-widget.visible`);
    case 'playground-peek':
      await putCode(page, NAMES);
      await cursorAt(page, 5, 14);
      await page.keyboard.press('Alt+F12');
      return shown(page, `${PLAYGROUND.editor} .peekview-widget`);
    case 'playground-rename':
      await putCode(page, NAMES);
      await cursorAt(page, 5, 14);
      await page.keyboard.press('F2');
      return shown(page, `${PLAYGROUND.editor} .rename-box input`);
    case 'playground-quick-fixes':
      await putCode(page, 'interface Job { title: string; years: number }\nconst job: Job = {};');
      await cursorAt(page, 2, 7);
      await page.keyboard.press(`${key}+Period`);
      return shown(page, '.action-widget');
    case 'playground-palette':
      await page.click(`${PLAYGROUND.editor} .view-lines`);
      await page.keyboard.press('F1');
      return shown(page, `${PLAYGROUND.editor} .quick-input-widget`);
    case 'playground-menu':
      await page.click(SHELL.appMenuTitle);
      return shown(page, SHELL.appMenu);
    case 'playground-options':
      await page.click(`${PLAYGROUND.toolbar} button.options`);
      return shown(page, `${PLAYGROUND.root} section.options-panel`);
    case 'playground-examples':
      await page.click(`${PLAYGROUND.toolbar} button.examples`);
      return shown(page, `${PLAYGROUND.root} section.examples-panel`);
    case 'playground-running':
      await putCode(page, 'let n = 0;\nconst id = setInterval(() => { console.log(++n); if (n === 50) clearInterval(id); }, 100);');
      await runPlayground(page, 'start');
      await page.waitForTimeout(1_000);
      return;
    case 'playground-stuck':
      await putCode(page, 'while (true) {}');
      await runPlayground(page, 'start');
      await page.waitForSelector(PLAYGROUND.popup, { timeout: 20_000 });
      return;
    case 'playground-shared':
    case 'playground-too-long':
      if (state === 'playground-too-long') await putCode(page, tooLongCode());
      await page.click(`${PLAYGROUND.toolbar} button.share`);
      return shown(page, PLAYGROUND.message);
    case 'playground-reset':
      await page.click(SHELL.appMenuTitle);
      await page.getByRole('menuitem', { name: siteText.playground.menu.reset, exact: true }).click();
      return shown(page, PLAYGROUND.popup);
    case 'playground-keys':
      await page.click(SHELL.appMenuTitle);
      await page.getByRole('menuitem', { name: siteText.playground.menu.keys, exact: true }).click();
      return shown(page, PLAYGROUND.popup);
    case 'playground-specs':
      await page.click(`${PLAYGROUND.window} button.show-specs`);
      return shown(page, '#os section.spec-view[data-view="playground"]');
    case 'playground-narrow': {
      const frame = (await page.locator(PLAYGROUND.window).boundingBox())!;
      const corner = (await page.locator(`${PLAYGROUND.window} .resize-se`).boundingBox())!;
      const from = { x: corner.x + corner.width / 2, y: corner.y + corner.height / 2 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x + 600 - frame.width, from.y, { steps: 10 });
      await page.mouse.up();
      return;
    }
  }
  throw new Error(`no way to reach ${shell}/${state}`);
}

// Brings a fresh, hydrated page to `target`. Throws, naming the state, when
// the page shows the other shell or an element the state needs never
// appears.
export async function reachState(page: Page, target: ShellState): Promise<void> {
  const variant = stateVariant(target.shell, target.state, target.width);
  const shell = await page.evaluate(() => document.documentElement.getAttribute('data-shell'));
  if (shell !== target.shell) throw new Error(`could not reach ${variant}: the page shows the ${shell ?? 'no-script'} shell`);
  try {
    await drive(page, target);
    await settle(page);
  } catch (error) {
    throw new Error(`could not reach ${variant}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`);
  }
}

export function findState(shell: Shell, state: string): ShellState {
  const found = SHELL_STATES.find((candidate) => candidate.shell === shell && candidate.state === state);
  if (found === undefined) throw new Error(`no shell state ${shell}/${state}`);
  return found;
}
