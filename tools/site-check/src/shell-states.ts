// The state driver (005 research R17, data-model.md Site check results): the
// shell states the check measures the site root in, and how a fresh page
// reaches each one. It acts as a visitor does, by clicks, taps and keys once
// the shell has hydrated, never through a hook in the site. Elements are
// found by their structure, not their names, so a check of the names (such
// as axe's `button-name`) still gets to measure every state.
import type { BrowserContextOptions, Page } from 'playwright';

export type Shell = 'desktop' | 'mobile';

export const DESKTOP_STATES = ['first-load', 'no-window', 'about', 'two-windows', 'site-menu', 'window-menu', 'minimized', 'maximized', 'keyboard-move', 'keyboard-resize'] as const;

export const MOBILE_STATES = ['home', 'home-landscape', 'cv-app', 'about'] as const;

export type DesktopState = (typeof DESKTOP_STATES)[number];

export type MobileState = (typeof MOBILE_STATES)[number];

export type ShellState = { shell: 'desktop'; state: DesktopState; width: number; height: number } | { shell: 'mobile'; state: MobileState; width: number; height: number };

// The sizes each shell is measured at: the desktop at 1440 × 900, the phone
// at 375 × 812, and on its side at 812 × 375 for `home-landscape`.
export const SHELL_SIZES = Object.freeze({ desktop: { width: 1440, height: 900 }, mobile: { width: 375, height: 812 } });

export const SHELL_STATES: readonly ShellState[] = Object.freeze([
  ...DESKTOP_STATES.map((state): ShellState => ({ shell: 'desktop', state, ...SHELL_SIZES.desktop })),
  ...MOBILE_STATES.map((state): ShellState => ({ shell: 'mobile', state, ...(state === 'home-landscape' ? { width: 812, height: 375 } : SHELL_SIZES.mobile) })),
]);

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
});

// Where the CV app's document is in each shell, for the field sequence.
export const CV_APP_ROOT = Object.freeze({ desktop: `${SHELL.cvWindow} .cv`, mobile: `${SHELL.cvFullScreen} .cv` });

export const control = (view: 'cv' | 'about', name: 'close' | 'minimize' | 'maximize') => `#os .window[data-view="${view}"] .control-${name}`;

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

async function drive(page: Page, { shell, state }: ShellState): Promise<void> {
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
