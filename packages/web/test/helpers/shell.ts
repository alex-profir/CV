// Shell test helpers (005 plan, Dependencies: shell test helper, research
// R17). Every shell test acts as a visitor: it opens the real build's root in
// Chromium and drives it by clicks, drags, touch, keys and viewport changes,
// never through a hook in the site.
import fs from 'node:fs';
import path from 'node:path';
import { onTestFinished } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import type { Resume } from '@cv/content';
import { startServer } from '../../../../tools/site-check/src/server.ts';
import type { RunningServer } from '../../../../tools/site-check/src/server.ts';
import { clipOf, decodePng, indicatorPixels } from '../../../../tools/site-check/src/parts/keyboard.ts';
import type { Box } from '../../../../tools/site-check/src/parts/keyboard.ts';
import { openPage } from './browser.ts';
import type { OpenPageOptions } from './browser.ts';
import { buildCopy, repoCopy } from './copy.ts';
import { serveBuilt } from './site.ts';

export type { Box };

export type ShellOptions = {
  width: number;
  height: number;
  // Browser zoom: a 1440 px window at 200% is a 720 px viewport at scale 2.
  deviceScaleFactor?: number;
  javaScriptEnabled?: boolean;
  reducedMotion?: OpenPageOptions['reducedMotion'];
  forcedColors?: OpenPageOptions['forcedColors'];
  serviceWorkers?: OpenPageOptions['serviceWorkers'];
  hasTouch?: boolean;
  userAgent?: string;
  // CPU slowdown through CDP, such as 4 for a mid-range phone.
  cpuThrottling?: number;
  // The site's address; the real build, served for this test, by default.
  url?: string;
  // The path opened, `/` by default.
  path?: string;
  // The platform the page reads from `navigator` (research R9's labels),
  // such as `Windows` or `macOS`; the test machine's by default.
  platform?: 'Windows' | 'macOS';
  // Run before the page is opened, such as an init script that records
  // what the page does.
  beforeGoto?: (page: Page) => Promise<void>;
  // Permissions for the site, such as the clipboard's.
  permissions?: string[];
  // Chromium by default (008 research R25).
  engine?: OpenPageOptions['engine'];
};

export const PHONE_USER_AGENT =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

// The shell's one script, by its built name.
const OS_SCRIPT = /\/assets\/os-[\w-]{8}\.js$/;

function pageOptions(options: ShellOptions, extra: Partial<OpenPageOptions> = {}): OpenPageOptions {
  const { width, height, deviceScaleFactor, javaScriptEnabled, reducedMotion, forcedColors, serviceWorkers, hasTouch, userAgent, cpuThrottling, platform, permissions, engine } = options;
  return {
    width,
    height,
    ...(deviceScaleFactor === undefined ? {} : { deviceScaleFactor }),
    ...(javaScriptEnabled === undefined ? {} : { javaScriptEnabled }),
    ...(reducedMotion === undefined ? {} : { reducedMotion }),
    ...(forcedColors === undefined ? {} : { forcedColors }),
    ...(serviceWorkers === undefined ? {} : { serviceWorkers }),
    ...(hasTouch === undefined ? {} : { hasTouch }),
    ...(userAgent === undefined ? {} : { userAgent }),
    ...(permissions === undefined ? {} : { permissions }),
    ...(engine === undefined ? {} : { engine }),
    ...extra,
    beforeGoto: async (page) => {
      if (cpuThrottling !== undefined) {
        const session = await page.context().newCDPSession(page);
        await session.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottling });
      }
      if (platform !== undefined) {
        await page.addInitScript((name) => {
          const legacy = name === 'macOS' ? 'MacIntel' : 'Win32';
          Object.defineProperty(Navigator.prototype, 'platform', { get: () => legacy, configurable: true });
          Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ platform: name, mobile: false, brands: [] }), configurable: true });
        }, platform);
      }
      await options.beforeGoto?.(page);
      await extra.beforeGoto?.(page);
    },
  };
}

async function siteUrl(options: ShellOptions): Promise<string> {
  return options.url ?? (await serveBuilt()).url;
}

// Waits until hydration has finished and the inactive shell is gone.
export async function waitForReady(page: Page): Promise<void> {
  await page.waitForSelector('#os[data-ready]', { state: 'attached' });
}

// The built root, opened and, with scripting on, hydrated.
export async function openShell(options: ShellOptions): Promise<Page> {
  const page = await openPage(`${await siteUrl(options)}${options.path ?? '/'}`, pageOptions(options));
  if (options.javaScriptEnabled !== false) await waitForReady(page);
  return page;
}

// The built root, opened with the shell's script held back: the page is
// parsed and painted, but not hydrated until `release` lets the script
// load. `release` waits for hydration.
export async function openShellHeld(options: ShellOptions): Promise<{ page: Page; release: () => Promise<void> }> {
  let letGo: () => void = () => undefined;
  const held = new Promise<void>((resolve) => (letGo = resolve));
  const page = await openPage(
    `${await siteUrl(options)}${options.path ?? '/'}`,
    pageOptions(options, {
      waitUntil: 'commit',
      beforeGoto: async (target) => {
        await target.route(OS_SCRIPT, async (route) => {
          await held;
          await route.continue();
        });
      },
    }),
  );
  await page.waitForSelector('#os', { state: 'attached' });
  // Parsed, with the shell's style sheet applied, as the first paint has it.
  await page.waitForFunction(() => document.readyState !== 'loading' && [...document.styleSheets].some((sheet) => /\/assets\/os-/.test(sheet.href ?? '')));
  return {
    page,
    release: async () => {
      letGo();
      await waitForReady(page);
    },
  };
}

// A copy of the repository with a fixture CV, or another change made by
// `edit`, built and served for the current test. The shell's script reads
// the CV and the app list at build time, so a fixture needs its own build.
export async function serveShellFixture({ resume, edit }: { resume?: Resume; edit?: (root: string) => void }): Promise<RunningServer> {
  const root = repoCopy();
  if (resume !== undefined) fs.writeFileSync(path.join(root, 'packages/content/resume.json'), `${JSON.stringify(resume, null, 2)}\n`);
  edit?.(root);
  const build = buildCopy(root);
  if (build.site === null) throw new Error(`the fixture build failed:\n${build.stderr}`);
  const server = await startServer({ siteDir: build.site.dir, manifest: build.site.manifest });
  onTestFinished(() => server.close());
  return server;
}

export type Point = { x: number; y: number };

export type DragOptions = { pointerType?: 'mouse' | 'pen' | 'touch'; steps?: number };

// Drags from one point to another: the mouse through Playwright's mouse; a
// pen and a finger through CDP, as the browser gets them from a device.
export async function drag(page: Page, from: Point, to: Point, { pointerType = 'mouse', steps = 10 }: DragOptions = {}): Promise<void> {
  const at = (step: number): Point => ({ x: from.x + ((to.x - from.x) * step) / steps, y: from.y + ((to.y - from.y) * step) / steps });
  if (pointerType === 'mouse') {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    for (let step = 1; step <= steps; step += 1) await page.mouse.move(at(step).x, at(step).y);
    await page.mouse.up();
    return;
  }
  const session = await page.context().newCDPSession(page);
  if (pointerType === 'pen') {
    const send = (type: 'mousePressed' | 'mouseMoved' | 'mouseReleased', point: Point, buttons: number) =>
      session.send('Input.dispatchMouseEvent', { type, x: point.x, y: point.y, button: 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1, pointerType: 'pen' });
    await send('mouseMoved', from, 0);
    await send('mousePressed', from, 1);
    for (let step = 1; step <= steps; step += 1) await send('mouseMoved', at(step), 1);
    await send('mouseReleased', to, 0);
  } else {
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', point: Point | null) =>
      session.send('Input.dispatchTouchEvent', { type, touchPoints: point === null ? [] : [{ x: point.x, y: point.y }] });
    await touch('touchStart', from);
    for (let step = 1; step <= steps; step += 1) await touch('touchMove', at(step));
    await touch('touchEnd', null);
  }
  await session.detach();
  // Let the last animation frame's batched move land.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

// Waits for the shell's animations to end, as a visitor sees the result of
// an action once its motion is over (research R13): every finite animation
// running, then two frames for what a finished closing animation changes.
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

// An element's box in the viewport, or null when it isn't rendered, once
// the shell's animations have ended.
export async function box(page: Page, selector: string): Promise<Box | null> {
  await settle(page);
  return page.evaluate((target) => {
    const element = document.querySelector(target);
    if (element === null || element.getClientRects().length === 0) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }, selector);
}

// The view of the window drawn in front: the highest `z-index` among those
// shown. DOM order is Tab order and doesn't follow stacking (FR-030).
export function frontWindow(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const windows = [...document.querySelectorAll<HTMLElement>('#os .desktop-area > .window:not([hidden])')];
    windows.sort((a, b) => Number(getComputedStyle(b).zIndex) - Number(getComputedStyle(a).zIndex));
    return windows[0]?.getAttribute('data-view') ?? null;
  });
}

export function centre(rect: Box): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

// A touch tap on the element's centre (the context needs `hasTouch`).
export async function tap(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().tap();
}

// Presses keys in turn, such as `press(page, 'Tab', 'Alt+Shift+W')`.
export async function press(page: Page, ...keys: string[]): Promise<void> {
  for (const key of keys) await page.keyboard.press(key);
}

// `document.activeElement`, described stably: its tag, id, classes, its
// `data-view` or `data-app`, and its accessible name or text, such as
// `button.dock-item[data-app=cv] "CV, open"`. `body` when nothing is focused.
export function focusedElement(page: Page): Promise<string> {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (active === null || active === document.body || active === document.documentElement) return 'body';
    const classes = typeof active.className === 'string' && active.className.trim() !== '' ? `.${active.className.trim().split(/\s+/).join('.')}` : '';
    const id = active.id === '' ? '' : `#${active.id}`;
    const data = ['data-view', 'data-app', 'data-menu'].map((name) => (active.hasAttribute(name) ? `[${name}=${active.getAttribute(name)}]` : '')).join('');
    const name = (active.getAttribute('aria-label') ?? active.textContent ?? '').replace(/\s+/g, ' ').trim();
    return `${active.tagName.toLowerCase()}${id}${classes}${data} ${JSON.stringify(name)}`;
  });
}

export type Indicator = { ok: boolean; changed: number; needed: number; coveredBy: string | null };

// The focused element's indicator, measured as 004's keyboard part does:
// the pixels that change by 3:1 or more against the same box unfocused,
// at least the element's perimeter at the outline's width, and nothing
// else on the element's centre. The perimeter is the element's shape, as
// WCAG 2.4.13 measures it: rounded corners make it shorter than its box's.
// Focus is put back afterwards.
export async function focusIndicator(page: Page): Promise<Indicator> {
  const px = (value: string) => Number.parseFloat(value);
  const outline = px(tokenValue('border.thick'));
  const pad = outline + px(tokenValue('space.0_5')) + 2;
  await settle(page);
  const state = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (active === null || active === document.body) return null;
    const rect = active.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    const coveredBy = hit !== null && !active.contains(hit) && !hit.contains(active) ? `${hit.tagName.toLowerCase()}.${String(hit.className)}` : null;
    active.setAttribute('data-test-focused', '');
    const radius = Math.min(Number.parseFloat(getComputedStyle(active).borderTopLeftRadius) || 0, rect.width / 2, rect.height / 2);
    return { box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, coveredBy, radius };
  });
  if (state === null) return { ok: false, changed: 0, needed: 0, coveredBy: null };
  const clip = clipOf(page, state.box, pad);
  // Each rounded corner swaps two straight runs of `radius` for a quarter circle.
  const needed = (2 * (state.box.width + state.box.height) - (8 - 2 * Math.PI) * state.radius) * outline;
  if (clip === null) return { ok: false, changed: 0, needed, coveredBy: state.coveredBy };
  const focused = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const unfocused = await page.screenshot({ clip, animations: 'disabled', caret: 'hide' });
  await page.evaluate(() => {
    const element = document.querySelector<HTMLElement>('[data-test-focused]');
    element?.removeAttribute('data-test-focused');
    element?.focus({ focusVisible: true } as FocusOptions);
  });
  const scale = decodePng(focused).width / clip.width;
  const changed = indicatorPixels(decodePng(unfocused), decodePng(focused)) / (scale * scale);
  return { ok: changed >= needed && state.coveredBy === null, changed, needed, coveredBy: state.coveredBy };
}

// Resizes the viewport and waits two frames for the shell to follow.
export async function resize(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
