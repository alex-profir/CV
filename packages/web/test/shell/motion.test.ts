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

  test('each window action and a menu fade and grow from scale.open-start over motion.duration.fast with the standard easing', async () => {
    const page = await desktop('no-preference');
    const expected = { close: 'window[cv]', open: 'window[cv]', minimize: 'window[cv]', restore: 'window[cv]', maximize: 'window[cv]', 'restore the size': 'window[cv]', menu: 'menu' };
    for (const { action, animations } of await desktopActions(page)) {
      expect(animations.map((animation) => animation.target), action).toEqual([expected[action as keyof typeof expected]]);
      const [animation] = animations;
      expect(animation!.properties, action).toEqual(['opacity', 'scale']);
      expect(animation!.duration, action).toBe(durationMs('motion.duration.fast'));
      expect(easing(animation!.easing), action).toBe(easing(tokenValue('motion.easing.standard')));
      const scales = animation!.frames.map((frame) => Number(frame.scale));
      expect(new Set(scales).size, action).toBeGreaterThan(1);
      for (const scale of scales) expect(scale, action).toBeGreaterThanOrEqual(Number(tokenValue('scale.open-start')));
    }
  });

  test('with reduced motion, every sampled frame keeps transform and scale and only opacity changes', async () => {
    const page = await desktop('reduce');
    const actions = await desktopActions(page);
    expect(actions.every(({ animations }) => animations.length === 1)).toBe(true);
    for (const { action, animations } of actions) {
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
