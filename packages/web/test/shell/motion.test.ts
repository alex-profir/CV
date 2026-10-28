// Motion (005 research R13, US5 scenarios 1 and 2). An init script records
// each animation the page starts, on the visitor's side, and samples its
// frames at once: the animation's own timing, and the element's computed
// `transform`, `scale` and `opacity` at four points of it.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { durationMs, tokenValue } from '@cv/tokens';
import { box, drag, openShell, settle } from '../helpers/shell.ts';
import type { ShellOptions } from '../helpers/shell.ts';

vi.setConfig({ testTimeout: 120_000 });

type Frame = { transform: string; scale: string; opacity: string };
type Recorded = { target: string; properties: string[]; duration: number; easing: string; frames: Frame[] };

declare global {
  interface Window {
    __animations?: Recorded[];
  }
}

const CV = '#os .window[data-view="cv"]';

function recordAnimations(): void {
  const log: Recorded[] = [];
  window.__animations = log;
  const original = Element.prototype.animate;
  Element.prototype.animate = function (this: Element, keyframes, options) {
    const animation = original.call(this, keyframes, options);
    const view = this.getAttribute('data-view');
    const target = `${this.classList[0] ?? this.tagName.toLowerCase()}${view === null ? '' : `[${view}]`}`;
    const list = Array.isArray(keyframes) ? keyframes : [];
    const properties = [...new Set(list.flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'easing', 'composite'].includes(key))))].sort();
    const timing = animation.effect!.getTiming();
    const duration = Number(timing.duration);
    const frames: Frame[] = [];
    for (const share of [0, 0.25, 0.5, 0.75]) {
      animation.currentTime = duration * share;
      const style = getComputedStyle(this);
      frames.push({ transform: style.transform, scale: style.scale, opacity: style.opacity });
    }
    animation.currentTime = 0;
    log.push({ target, properties, duration, easing: String(timing.easing), frames });
    return animation;
  };
}

const record = (options: ShellOptions) => openShell({ ...options, beforeGoto: async (page) => void (await page.addInitScript(recordAnimations)) });

// The animations started since the last call.
async function started(page: Page): Promise<Recorded[]> {
  await settle(page);
  return page.evaluate(() => window.__animations!.splice(0));
}

const desktop = (reducedMotion: 'reduce' | 'no-preference') => record({ width: 1440, height: 900, reducedMotion });

// The visitor's actions on the desktop, each with the element it animates.
async function desktopActions(page: Page): Promise<Array<{ action: string; animations: Recorded[] }>> {
  const done: Array<{ action: string; animations: Recorded[] }> = [];
  const step = async (action: string, run: () => Promise<void>) => {
    await run();
    done.push({ action, animations: await started(page) });
  };
  await step('close', () => page.getByRole('button', { name: 'Close CV' }).click());
  await step('open', () => page.locator('#os .dock-item[data-app="cv"]').click());
  await step('minimize', () => page.getByRole('button', { name: 'Minimize CV' }).click());
  await step('restore', () => page.locator('#os .dock-item[data-app="cv"]').click());
  await step('maximize', () => page.getByRole('button', { name: 'Maximize CV' }).click());
  await step('restore the size', () => page.getByRole('button', { name: 'Restore CV' }).click());
  await step('menu', () => page.click('#menu-title-site'));
  return done;
}

const easing = (value: string) => value.replace(/\s+/g, '');

describe('005-os-shell-FR-046: windows, apps and menus animate, and only fade with reduced motion (SC-009)', () => {
  test('first load and hydration start no animation', async () => {
    const page = await desktop('no-preference');
    await page.waitForTimeout(durationMs('motion.duration.fast') * 2);
    expect(await started(page)).toEqual([]);
  });

  test('opening, closing and a menu fade and grow over motion.duration.fast; minimizing, restoring and maximizing move the box over motion.duration.base', async () => {
    const page = await desktop('no-preference');
    const grow = { properties: ['opacity', 'scale'], duration: durationMs('motion.duration.fast') };
    const into = { properties: ['opacity', 'transform'], duration: durationMs('motion.duration.base') };
    const size = { properties: ['transform'], duration: durationMs('motion.duration.base') };
    const expected = { close: grow, open: grow, minimize: into, restore: into, maximize: size, 'restore the size': size, menu: grow };
    const targets = { close: 'window[cv]', open: 'window[cv]', minimize: 'window[cv]', restore: 'window[cv]', maximize: 'window[cv]', 'restore the size': 'window[cv]', menu: 'menu' };
    for (const { action, animations } of await desktopActions(page)) {
      const want = expected[action as keyof typeof expected];
      expect(animations.map((animation) => animation.target), action).toEqual([targets[action as keyof typeof targets]]);
      const [animation] = animations;
      expect(animation!.properties, action).toEqual(want.properties);
      expect(animation!.duration, action).toBe(want.duration);
      expect(easing(animation!.easing), action).toBe(easing(tokenValue('motion.easing.standard')));
      if (want === grow) {
        const scales = animation!.frames.map((frame) => Number(frame.scale));
        expect(new Set(scales).size, action).toBeGreaterThan(1);
        for (const scale of scales) expect(scale, action).toBeGreaterThanOrEqual(Number(tokenValue('scale.open-start')));
      } else {
        expect(new Set(animation!.frames.map((frame) => frame.transform)).size, action).toBeGreaterThan(1);
      }
    }
  });

  test('with reduced motion, every sampled frame keeps transform and scale and only opacity changes, and a change of size does not animate', async () => {
    const page = await desktop('reduce');
    const actions = await desktopActions(page);
    for (const { action, animations } of actions) {
      if (action === 'maximize' || action === 'restore the size') {
        expect(animations, action).toEqual([]);
        continue;
      }
      expect(animations, action).toHaveLength(1);
      const [animation] = animations;
      expect(animation!.properties, action).toEqual(['opacity']);
      expect(animation!.duration, action).toBe(durationMs('motion.duration.fast'));
      for (const frame of animation!.frames) expect({ transform: frame.transform, scale: frame.scale }, action).toEqual({ transform: 'none', scale: 'none' });
      expect(new Set(animation!.frames.map((frame) => frame.opacity)).size, action).toBeGreaterThan(1);
    }
  });

  test('a full-screen app opened on the phone animates, and fades only with reduced motion', async () => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const page = await record({ width: 375, height: 812, hasTouch: true, reducedMotion });
      expect(await started(page), reducedMotion).toEqual([]);
      await page.locator('#os .app-icon[data-view="cv"]').tap();
      const animations = await started(page);
      expect(animations.map((animation) => animation.target), reducedMotion).toEqual(['full-screen[cv]']);
      expect(animations[0]!.properties, reducedMotion).toEqual(reducedMotion === 'reduce' ? ['opacity'] : ['opacity', 'scale']);
      expect(animations[0]!.duration, reducedMotion).toBe(durationMs('motion.duration.fast'));
    }
  });

  test('a shell switch starts no animation', async () => {
    const page = await desktop('no-preference');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('#os .full-screen[data-view="cv"]').waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(CV).waitFor();
    expect(await started(page)).toEqual([]);
  });

  test('a drag follows the pointer with no animation, with or without reduced motion', async () => {
    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      const page = await desktop(reducedMotion);
      const before = (await box(page, CV))!;
      const bar = (await box(page, `${CV} .title-bar`))!;
      const from = { x: bar.x + bar.width * 0.75, y: bar.y + bar.height / 2 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      await page.mouse.move(from.x - 40, from.y + 30, { steps: 4 });
      const midway = await page.evaluate((selector) => document.querySelector(selector)!.getBoundingClientRect().x, CV);
      expect(midway - before.x, reducedMotion).toBe(-40);
      await page.mouse.up();
      await drag(page, { x: from.x - 40, y: from.y + 30 }, { x: from.x - 100, y: from.y + 60 });
      const after = (await box(page, CV))!;
      expect({ x: after.x - before.x, y: after.y - before.y }, reducedMotion).toEqual({ x: -100, y: 60 });
      expect(await started(page), reducedMotion).toEqual([]);
    }
  });
});

// The centre and size a window is drawn at, `share` of the way through its
// running animation, with the animation paused there.
async function drawnAt(page: Page, selector: string, share: number): Promise<{ x: number; y: number; width: number; height: number; running: number }> {
  return page.evaluate(
    ({ selector, share }) => {
      const element = document.querySelector(selector)!;
      const animations = element.getAnimations();
      for (const animation of animations) {
        animation.pause();
        animation.currentTime = Number(animation.effect!.getTiming().duration) * share;
      }
      const rect = element.getBoundingClientRect();
      for (const animation of animations) animation.play();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width, height: rect.height, running: animations.length };
    },
    { selector, share },
  );
}

const centreOf = async (page: Page, selector: string) => {
  const rect = (await box(page, selector))!;
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, width: rect.width, height: rect.height };
};

const ABOUT = '#os .window[data-view="about"]';

describe('005-os-shell-FR-069: a window minimizes into its dock item and restores out of it', () => {
  test("the CV shrinks into the CV item's icon and grows back out of it", async () => {
    const page = await desktop('no-preference');
    const icon = await centreOf(page, '#os .dock-item[data-app="cv"] .dock-icon');
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    const end = await drawnAt(page, CV, 0.999);
    expect(end.running).toBe(1);
    expect(Math.abs(end.x - icon.x)).toBeLessThan(2);
    expect(Math.abs(end.y - icon.y)).toBeLessThan(2);
    expect(Math.max(end.width, end.height)).toBeLessThanOrEqual(icon.width + 1);
    await settle(page);
    expect(await page.locator(CV).isVisible()).toBe(false);
    await page.locator('#os .dock-item[data-app="cv"]').click();
    const start = await drawnAt(page, CV, 0.001);
    expect(Math.abs(start.x - icon.x)).toBeLessThan(4);
    expect(Math.abs(start.y - icon.y)).toBeLessThan(4);
    await settle(page);
    expect(await page.locator(CV).isVisible()).toBe(true);
  });

  test("About this site goes into and comes out of the site menu's title", async () => {
    const page = await desktop('no-preference');
    await page.click('#menu-title-site');
    await page.getByRole('menuitem', { name: 'About this site' }).click();
    await settle(page);
    const title = await centreOf(page, '#os .menu-title[data-menu="site"]');
    await page.getByRole('button', { name: 'Minimize About this site' }).click();
    const end = await drawnAt(page, ABOUT, 0.999);
    expect(Math.abs(end.x - title.x)).toBeLessThan(2);
    expect(Math.abs(end.y - title.y)).toBeLessThan(2);
  });
});

describe('005-os-shell-FR-070: maximizing grows the window to fill the desktop, and restoring shrinks it back', () => {
  test('the box moves from where it was to the area and back, and a resize while maximized does not animate', async () => {
    const page = await desktop('no-preference');
    const before = await centreOf(page, CV);
    await page.getByRole('button', { name: 'Maximize CV' }).click();
    const start = await drawnAt(page, CV, 0);
    expect(start.width).toBeCloseTo(before.width, 0);
    expect(start.height).toBeCloseTo(before.height, 0);
    expect(start.x).toBeCloseTo(before.x, 0);
    expect(start.y).toBeCloseTo(before.y, 0);
    await started(page);
    const filled = await centreOf(page, CV);
    expect({ width: filled.width, height: filled.height }).toEqual({ width: 1440, height: 764 });
    await page.setViewportSize({ width: 1300, height: 860 });
    await settle(page);
    expect(await started(page)).toEqual([]);
    await page.getByRole('button', { name: 'Restore CV' }).click();
    const back = await drawnAt(page, CV, 0);
    expect(back.width).toBeCloseTo(1300, 0);
    expect(await started(page)).toHaveLength(1);
  });
});

describe('005-os-shell-FR-071: the animations hold nothing up', () => {
  test('focus and the announcement come at once, and acting again ends the running animation', async () => {
    const page = await desktop('no-preference');
    await page.getByRole('button', { name: 'Minimize CV' }).click();
    // Before the minimize animation ends: focus is already on the dock item.
    const midway = await page.evaluate((selector) => ({
      running: document.querySelector(selector)!.getAnimations().filter((animation) => animation.playState === 'running').length,
      focused: document.activeElement?.getAttribute('data-app') ?? null,
      inert: (document.querySelector(selector) as HTMLElement).inert,
    }), CV);
    expect(midway).toEqual({ running: 1, focused: 'cv', inert: true });
    // Restoring at once ends the minimize animation and plays the restore.
    await page.locator('#os .dock-item[data-app="cv"]').click();
    const after = await page.evaluate((selector) => {
      const element = document.querySelector(selector) as HTMLElement;
      return { animations: element.getAnimations().length, hidden: element.hidden, inert: element.inert, leaving: element.hasAttribute('data-leaving') };
    }, CV);
    expect(after).toEqual({ animations: 1, hidden: false, inert: false, leaving: false });
    await settle(page);
    await started(page);
    // A pointer down on the window during its maximize animation ends it, at its end state.
    await page.getByRole('button', { name: 'Maximize CV' }).click();
    const ended = await page.evaluate((selector) => {
      const element = document.querySelector(selector)!;
      const before = element.getAnimations().length;
      element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      const rect = element.getBoundingClientRect();
      return { before, after: element.getAnimations().length, width: rect.width, height: rect.height };
    }, CV);
    expect(ended).toEqual({ before: 1, after: 0, width: 1440, height: 764 });
  });

  test('no box animation plays on first load or after a shell switch', async () => {
    const page = await desktop('no-preference');
    await page.waitForTimeout(durationMs('motion.duration.base') * 2);
    expect(await started(page)).toEqual([]);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('#os .full-screen[data-view="cv"]').waitFor();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator(CV).waitFor();
    expect(await started(page)).toEqual([]);
  });
});

