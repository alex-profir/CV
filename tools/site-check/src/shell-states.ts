// The state driver (005 research R17, data-model.md Site check results): the
// shell states the check measures the site root in, and how a fresh page
// reaches each one. It acts as a visitor does, by clicks, taps and keys once
// the shell has hydrated, never through a hook in the site. Elements are
// found by their structure, not their names, so a check of the names (such
// as axe's `button-name`) still gets to measure every state.
import type { BrowserContextOptions, Locator, Page } from 'playwright';

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

export const DESKTOP_STATES = ['first-load', 'no-window', 'about', 'two-windows', 'site-menu', 'window-menu', 'minimized', 'maximized', 'keyboard-move', 'keyboard-resize', ...TERMINAL_DESKTOP_STATES] as const;

export const MOBILE_STATES = ['home', 'home-landscape', 'cv-app', 'about', ...TERMINAL_MOBILE_STATES] as const;

export type DesktopState = (typeof DESKTOP_STATES)[number];

export type MobileState = (typeof MOBILE_STATES)[number];

export type ShellState = { shell: 'desktop'; state: DesktopState; width: number; height: number } | { shell: 'mobile'; state: MobileState; width: number; height: number };

// The sizes each shell is measured at: the desktop at 1440 × 900, the phone
// at 375 × 812, and on its side at 812 × 375 for `home-landscape` and
// `pocket-landscape`.
export const SHELL_SIZES = Object.freeze({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } });

const LANDSCAPE = new Set<string>(['home-landscape', 'pocket-landscape']);

export const SHELL_STATES: readonly ShellState[] = Object.freeze([
  ...DESKTOP_STATES.map((state): ShellState => ({ shell: 'desktop', state, ...SHELL_SIZES.desktop })),
  ...MOBILE_STATES.map((state): ShellState => ({ shell: 'mobile', state, ...(LANDSCAPE.has(state) ? { width: 812, height: 375 } : SHELL_SIZES.mobile) })),
]);

// The Terminal's states alone, in the same order.
export const TERMINAL_STATES: readonly ShellState[] = Object.freeze(SHELL_STATES.filter(({ state }) => state.startsWith('terminal-') || state.startsWith('pocket')));

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
  busyRun: '#os .terminal section.run[aria-busy="true"]',
  shellSettled: '#os .terminal:is([data-shell-state="ready"], [data-shell-state="running"], [data-shell-state="failed"])',
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

// Where the CV app's document is in each shell, for the field sequence.
export const CV_APP_ROOT = Object.freeze({ desktop: `${SHELL.cvWindow} .cv`, mobile: `${SHELL.cvFullScreen} .cv` });

export const control = (view: 'cv' | 'about' | 'terminal', name: 'close' | 'minimize' | 'maximize') => `#os .window[data-view="${view}"] .control-${name}`;

// How long an element the driver waits for may take to appear.
const WAIT_MS = 5_000;
// How long the shell may take to load or run a line.
const SHELL_LOAD_MS = 10_000;

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
  // The shell loads in a worker on first open (006 FR-070): until it is
  // ready, or has failed, lines wait.
  await page.waitForSelector(TERMINAL.shellSettled, { timeout: SHELL_LOAD_MS });
  await settle(page);
}

// Until no line waits for the shell or runs (006 FR-070), or the Terminal
// has closed.
const linesRun = (page: Page) => page.waitForFunction((busy) => document.querySelector(busy) === null, TERMINAL.busyRun, { timeout: SHELL_LOAD_MS });

const runs = (page: Page) => page.locator(TERMINAL.run).count();

// Types a line into the command line and presses Enter.
export async function typeLine(page: Page, line: string): Promise<void> {
  const input = page.locator(TERMINAL.commandLine);
  if (!(await input.evaluate((element) => element === document.activeElement))) await input.focus();
  await input.fill('');
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
  await linesRun(page);
}

// Waits for the run a line, a key or a control adds, and gives it back.
export async function newRun(page: Page, act: () => Promise<void>): Promise<Locator> {
  const before = await runs(page);
  await act();
  await page.waitForFunction(([selector, count]) => document.querySelectorAll(selector as string).length > (count as number), [TERMINAL.run, before] as const, { timeout: WAIT_MS });
  await linesRun(page);
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

const escaped = (text: string) => text.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&');

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

async function drive(page: Page, { shell, state }: ShellState): Promise<void> {
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
