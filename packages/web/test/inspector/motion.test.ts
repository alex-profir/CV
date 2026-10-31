// Showing and leaving the specs (FR-022, SC-010, research R11): the
// scroller's old and new content cross-fade over `motion.duration.fast`
// with `motion.easing.standard`, changing only opacity, and nothing outside
// the scroller moves. The old content is a live, inert copy laid over the
// scroller, never a view transition's flat image, so the glass blur behind
// it and the scroller's scroll bar stay drawn throughout. With reduced
// motion there is no fade at all.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { openView, scrollerSelector, specViewSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import type { InspectorShell } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

type Fade = { target: 'old' | 'new'; duration: number; easing: string; properties: string[] };
type Frame = { old: number | null; new: number; gutter: number; over: boolean; inert: boolean };

type Watch = {
  transitions: number;
  fades: Fade[];
  frames: Frame[];
  moved: string[];
  changed: string[];
};

declare global {
  interface Window {
    __watch?: Watch;
  }
}

// Counts view transitions, and every frame: records each animation on the
// old layer or on the scroller's content, the two's opacity, the scroller's
// scroll bar width, whether the old layer covers the scroller exactly, each
// box outside the scroller that moves, and each transform or scale inside
// it that changes.
async function watch(page: Page, scroller: string): Promise<void> {
  await page.evaluate((target) => {
    const state: Watch = { transitions: 0, fades: [], frames: [], moved: [], changed: [] };
    window.__watch = state;
    const start = document.startViewTransition?.bind(document);
    if (start !== undefined) {
      document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
        state.transitions += 1;
        return start(callback);
      }) as typeof document.startViewTransition;
    }
    const inside = () => document.querySelector(target);
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    const boxes = new Map<Element, string>();
    const styles = new Map<Element, string>();
    const seen = new Set<Animation>();
    const sample = () => {
      const scroller = inside();
      const old = scroller?.parentElement?.querySelector(':scope > [data-spec-swap]') ?? null;
      if (scroller !== null) {
        for (const animation of document.getAnimations()) {
          const effect = animation.effect as KeyframeEffect | null;
          const element = effect?.target ?? null;
          if (seen.has(animation) || element === null) continue;
          const target = element === old ? 'old' : element.parentElement === scroller ? 'new' : null;
          if (target === null) continue;
          seen.add(animation);
          const timing = effect!.getComputedTiming();
          const properties = [...new Set(effect!.getKeyframes().flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'computedOffset', 'easing', 'composite'].includes(key))))];
          state.fades.push({ target, duration: Number(timing.duration), easing: String(effect!.getTiming().easing), properties });
        }
        if (old !== null || state.fades.length > 0) {
          const first = scroller.firstElementChild;
          const a = scroller.getBoundingClientRect();
          const b = old?.getBoundingClientRect();
          state.frames.push({
            old: old === null ? null : Number(getComputedStyle(old).opacity),
            new: first === null ? 1 : Number(getComputedStyle(first).opacity),
            gutter: (scroller as HTMLElement).offsetWidth - scroller.clientWidth,
            over: b === undefined || (Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1),
            inert: old === null || ((old as HTMLElement).inert && old.getAttribute('aria-hidden') === 'true'),
          });
        }
      }
      for (const element of document.querySelectorAll('#os *')) {
        // The titles' text changes (FR-002), which resizes them: not motion.
        // The old layer comes and goes with the fade.
        if (scroller?.contains(element) === true || element.contains(scroller) || element.closest('.window-title, .app-title, [data-spec-swap]') !== null) continue;
        const rect = element.getBoundingClientRect();
        const now = `${rect.x},${rect.y},${rect.width},${rect.height}`;
        const before = boxes.get(element);
        if (before !== undefined && before !== now && element.isConnected) state.moved.push(`${describe(element)} ${before} → ${now}`);
        boxes.set(element, now);
      }
      for (const element of scroller === null ? [] : [scroller, ...scroller.querySelectorAll('*')]) {
        const style = getComputedStyle(element);
        const now = `${style.transform} ${style.scale} ${style.translate}`;
        const before = styles.get(element);
        if (before !== undefined && before !== now) state.changed.push(`${describe(element)} ${before} → ${now}`);
        styles.set(element, now);
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, scroller);
}

const watched = (page: Page) => page.evaluate(() => window.__watch!);

const resetFrames = (page: Page) => page.evaluate(() => (window.__watch!.frames = []));

async function show(page: Page, shell: InspectorShell): Promise<void> {
  const control = page.locator(`${viewSelector('cv', shell)} button.show-specs`);
  if (shell === 'desktop') await control.click();
  else await control.tap();
  await waitForSpecView(page, 'cv');
  await page.waitForTimeout(400);
}

async function back(page: Page, shell: InspectorShell): Promise<void> {
  const control = page.locator(`${specViewSelector('cv')} button.spec-back`);
  if (shell === 'desktop') await control.click();
  else await control.tap();
  await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
  await settle(page);
  await page.waitForTimeout(400);
}

// Each frame of one swap: the old layer only fades out, then is gone; the
// new content only fades in, to full; the old layer covers the scroller
// and is inert and hidden throughout; the scroll bar never goes.
function expectOneFade(sampled: Frame[], gutter: number, label: string): void {
  // From the frame the swap starts on.
  const frames = sampled.slice(sampled.findIndex((frame) => frame.old !== null));
  expect(sampled.some((frame) => frame.old !== null), `${label}: an old layer`).toBe(true);
  frames.slice(1).forEach((frame, index) => {
    const before = frames[index]!;
    if (frame.old !== null && before.old !== null) expect(frame.old, `${label}: old layer, frame ${index + 1}`).toBeLessThanOrEqual(before.old);
    if (before.old === null && index > 0) expect(frame.old, `${label}: the old layer back at frame ${index + 1}`).toBeNull();
    expect(frame.new, `${label}: new content, frame ${index + 1}`).toBeGreaterThanOrEqual(before.new);
  });
  for (const [index, frame] of frames.entries()) {
    expect(frame.over, `${label}: old layer over the scroller, frame ${index}`).toBe(true);
    expect(frame.inert, `${label}: old layer inert and hidden, frame ${index}`).toBe(true);
    expect(frame.gutter, `${label}: scroll bar, frame ${index}`).toBe(gutter);
  }
  expect(frames.at(-1)!.old, `${label}: the old layer is gone at the end`).toBeNull();
  expect(frames.at(-1)!.new, `${label}: the new content is whole at the end`).toBe(1);
}

describe('007-requirement-inspector-FR-022: the view cross-fades, and with reduced motion doesn\'t (SC-010)', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: a live cross-fade of opacity alone, over the fast duration with the standard easing, keeping the scroll bar, and nothing outside the scroller moves`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await openView(page, 'cv', shell);
      const scroller = scrollerSelector('cv', shell);
      const gutter = await page.evaluate((target) => {
        const element = document.querySelector<HTMLElement>(target)!;
        return element.offsetWidth - element.clientWidth;
      }, scroller);
      await watch(page, scroller);
      await show(page, shell);
      expectOneFade((await watched(page)).frames, gutter, 'showing specs');
      await resetFrames(page);
      await back(page, shell);
      expectOneFade((await watched(page)).frames, gutter, 'leaving specs');

      const seen = await watched(page);
      // No view transition: its flat images drop the blur behind the
      // content and the scroll bar in Safari and Firefox.
      expect(seen.transitions).toBe(0);
      expect(new Set(seen.fades.map((fade) => fade.target))).toEqual(new Set(['old', 'new']));
      const duration = Number.parseFloat(String(tokenValue('motion.duration.fast'))) * (String(tokenValue('motion.duration.fast')).endsWith('ms') ? 1 : 1000);
      const easing = String(tokenValue('motion.easing.standard')).replace(/\s+/g, ' ');
      for (const fade of seen.fades) {
        expect(fade.duration, fade.target).toBeCloseTo(duration, 0);
        expect(fade.easing.replace(/\s+/g, ' '), fade.target).toBe(easing);
        expect(fade.properties, fade.target).toEqual(['opacity']);
      }
      expect(seen.moved).toEqual([]);
      expect(seen.changed).toEqual([]);
      expect(await page.locator('#os [data-spec-swap]').count()).toBe(0);
    });

    test(`${shell}: with reduced motion, nothing fades, moves or scales, and no view transition starts`, async () => {
      const page = await openShell({ ...SHELL_PAGE[shell], reducedMotion: 'reduce' });
      await openView(page, 'cv', shell);
      await watch(page, scrollerSelector('cv', shell));
      await show(page, shell);
      await back(page, shell);
      const seen = await watched(page);
      expect(seen.transitions).toBe(0);
      expect(seen.fades).toEqual([]);
      expect(seen.frames.filter((frame) => frame.old !== null)).toEqual([]);
      expect(seen.changed).toEqual([]);
      expect(seen.moved).toEqual([]);
    });
  }

  test('in a browser without view transitions, Show specs and Back swap the content with the same fade', async () => {
    const page = await openShell({
      ...SHELL_PAGE.desktop,
      beforeGoto: async (target) => {
        await target.addInitScript(() => {
          delete (Document.prototype as Partial<Document>).startViewTransition;
        });
      },
    });
    expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');
    await watch(page, scrollerSelector('cv', 'desktop'));
    await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs`).click();
    await waitForSpecView(page, 'cv');
    expect(await page.locator(`${specViewSelector('cv')} h1.spec-heading`).isVisible()).toBe(true);
    await page.waitForTimeout(400);
    await page.locator(`${specViewSelector('cv')} button.spec-back`).click();
    await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
    expect(await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs`).isVisible()).toBe(true);
    await page.waitForTimeout(400);
    expect(new Set((await watched(page)).fades.map((fade) => fade.target))).toEqual(new Set(['old', 'new']));
  });
});
