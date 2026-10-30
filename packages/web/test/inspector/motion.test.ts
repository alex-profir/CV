// Showing and leaving the specs (FR-022, SC-010, research R11): the
// scroller's old and new content cross-fade over `motion.duration.fast`
// with `motion.easing.standard`, changing only opacity, and nothing outside
// the scroller moves; with reduced motion there is no fade at all; without
// view transitions the swap still happens.
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenValue } from '@cv/tokens';
import { openView, scrollerSelector, specViewSelector, viewSelector, waitForSpecView } from '../helpers/inspector.ts';
import type { InspectorShell } from '../helpers/inspector.ts';
import { openShell, settle } from '../helpers/shell.ts';
import { SHELL_PAGE } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 180_000 });

type Watch = {
  transitions: number;
  pseudo: { name: string; duration: string; easing: string; properties: string[] }[];
  moved: string[];
  changed: string[];
  // Each transition's old and new snapshot opacity, frame by frame.
  fades: { old: number; new: number }[][];
};

declare global {
  interface Window {
    __watch?: Watch;
  }
}

// Counts view transitions, and every frame: records each running
// animation on the swap's pseudo-elements, each box outside the scroller
// that moves, and each opacity, transform or scale inside it that changes,
// and, while a transition runs, the opacity of its two snapshots.
async function watch(page: Page, scroller: string): Promise<void> {
  await page.evaluate((target) => {
    const state: Watch = { transitions: 0, pseudo: [], moved: [], changed: [], fades: [] };
    let fade: { old: number; new: number }[] | null = null;
    window.__watch = state;
    const start = document.startViewTransition?.bind(document);
    if (start !== undefined) {
      document.startViewTransition = ((callback?: ViewTransitionUpdateCallback) => {
        state.transitions += 1;
        const transition = start(callback);
        const frames: { old: number; new: number }[] = [];
        state.fades.push(frames);
        void transition.ready.then(() => (fade = frames), () => {});
        void transition.finished.finally(() => (fade = null));
        return transition;
      }) as typeof document.startViewTransition;
    }
    const inside = () => document.querySelector(target);
    const describe = (element: Element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
    const boxes = new Map<Element, string>();
    const styles = new Map<Element, string>();
    const sample = () => {
      if (fade !== null) {
        const opacity = (pseudo: string) => Number(getComputedStyle(document.documentElement, `::view-transition-${pseudo}(spec-swap)`).opacity);
        fade.push({ old: opacity('old'), new: opacity('new') });
      }
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        const pseudo = effect?.pseudoElement ?? '';
        if (!pseudo.includes('spec-swap')) continue;
        const computed = getComputedStyle(document.documentElement, pseudo);
        // The browser's own blending of the two snapshots, `plus-lighter`,
        // comes with every cross-fade and moves nothing.
        const properties = [...new Set((effect?.getKeyframes() ?? []).flatMap((frame) => Object.keys(frame).filter((key) => !['offset', 'computedOffset', 'easing', 'composite', 'mixBlendMode'].includes(key))))];
        if (properties.length > 0) state.pseudo.push({ name: pseudo, duration: computed.animationDuration, easing: computed.animationTimingFunction, properties });
      }
      const scroller = inside();
      for (const element of document.querySelectorAll('#os *')) {
        // The titles' text changes (FR-002), which resizes them: not motion.
        if (scroller?.contains(element) === true || element.contains(scroller) || element.closest('.window-title, .app-title') !== null) continue;
        const rect = element.getBoundingClientRect();
        const now = `${rect.x},${rect.y},${rect.width},${rect.height}`;
        const before = boxes.get(element);
        if (before !== undefined && before !== now && element.isConnected) state.moved.push(`${describe(element)} ${before} → ${now}`);
        boxes.set(element, now);
      }
      for (const element of scroller === null ? [] : [scroller, ...scroller.querySelectorAll('*')]) {
        const style = getComputedStyle(element);
        const now = `${style.opacity} ${style.transform} ${style.scale} ${style.translate}`;
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

async function showAndBack(page: Page, shell: InspectorShell): Promise<void> {
  const control = page.locator(`${viewSelector('cv', shell)} button.show-specs`);
  if (shell === 'desktop') await control.click();
  else await control.tap();
  await waitForSpecView(page, 'cv');
  await page.waitForTimeout(400);
  const back = page.locator(`${specViewSelector('cv')} button.spec-back`);
  if (shell === 'desktop') await back.click();
  else await back.tap();
  await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
  await settle(page);
  await page.waitForTimeout(400);
}

describe('007-requirement-inspector-FR-022: the view cross-fades, and with reduced motion doesn\'t (SC-010)', () => {
  for (const shell of ['desktop', 'mobile'] as const) {
    test(`${shell}: a cross-fade of opacity alone, over the fast duration with the standard easing, and nothing outside the scroller moves`, async () => {
      const page = await openShell(SHELL_PAGE[shell]);
      await openView(page, 'cv', shell);
      await watch(page, scrollerSelector('cv', shell));
      await showAndBack(page, shell);
      const seen = await watched(page);
      expect(seen.transitions).toBe(2);
      expect(seen.pseudo.length).toBeGreaterThan(0);
      const duration = String(tokenValue('motion.duration.fast'));
      const easing = String(tokenValue('motion.easing.standard')).replace(/\s+/g, ' ');
      const seconds = (value: string) => (value.endsWith('ms') ? Number.parseFloat(value) / 1000 : Number.parseFloat(value));
      for (const animation of seen.pseudo) {
        expect(animation.name).toMatch(/^::view-transition-(old|new)\(spec-swap\)$/);
        expect(seconds(animation.duration), animation.name).toBeCloseTo(seconds(duration), 3);
        expect(animation.easing.replace(/\s+/g, ' '), animation.name).toBe(easing);
        expect(animation.properties, animation.name).toEqual(['opacity']);
      }
      expect(new Set(seen.pseudo.map((animation) => animation.name))).toEqual(new Set(['::view-transition-old(spec-swap)', '::view-transition-new(spec-swap)']));
      expect(seen.moved).toEqual([]);
      // The scroller's own elements change no opacity, transform or scale:
      // the fade is on its snapshots.
      expect(seen.changed).toEqual([]);
      // Until each transition ends, the old content only fades out and the
      // new only fades in: neither springs back once its fade is over, which
      // showed the old content through the new.
      expect(seen.fades).toHaveLength(2);
      for (const frames of seen.fades) {
        expect(frames.length).toBeGreaterThan(0);
        frames.slice(1).forEach((frame, index) => {
          expect(frame.old, `old snapshot, frame ${index + 1}`).toBeLessThanOrEqual(frames[index]!.old);
          expect(frame.new, `new snapshot, frame ${index + 1}`).toBeGreaterThanOrEqual(frames[index]!.new);
        });
        expect(frames.at(-1)!.old).toBeLessThan(0.05);
      }
    });

    test(`${shell}: with reduced motion, no view transition starts and nothing in the scroller fades, moves or scales`, async () => {
      const page = await openShell({ ...SHELL_PAGE[shell], reducedMotion: 'reduce' });
      await openView(page, 'cv', shell);
      await watch(page, scrollerSelector('cv', shell));
      await showAndBack(page, shell);
      const seen = await watched(page);
      expect(seen.transitions).toBe(0);
      expect(seen.pseudo).toEqual([]);
      expect(seen.changed).toEqual([]);
      expect(seen.moved).toEqual([]);
    });
  }

  test('in a browser without view transitions, Show specs and Back still swap the content', async () => {
    const page = await openShell({
      ...SHELL_PAGE.desktop,
      beforeGoto: async (target) => {
        await target.addInitScript(() => {
          delete (Document.prototype as Partial<Document>).startViewTransition;
        });
      },
    });
    expect(await page.evaluate(() => typeof document.startViewTransition)).toBe('undefined');
    await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs`).click();
    await waitForSpecView(page, 'cv');
    expect(await page.locator(`${specViewSelector('cv')} h1.spec-heading`).isVisible()).toBe(true);
    await page.locator(`${specViewSelector('cv')} button.spec-back`).click();
    await page.waitForSelector(specViewSelector('cv'), { state: 'detached' });
    expect(await page.locator(`${viewSelector('cv', 'desktop')} button.show-specs`).isVisible()).toBe(true);
  });
});
