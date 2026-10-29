// The shell's motion (005 research R13, R20, FR-046, FR-069 to FR-071).
// Windows, full-screen apps and menus fade in and grow from
// `scale.open-start` (96%), and windows fade out and shrink the same way,
// over `motion.duration.fast` with `motion.easing.standard`. A window
// minimizing shrinks into its dock item, and one restoring grows out of
// it; maximizing and restoring the size move its box; these take
// `motion.duration.base`. With reduced motion they only fade, and a change
// of size doesn't animate. The preference is read at each call, so a
// change while the site is open applies to the next animation. Only what
// the visitor does animates: never the first load, hydration, a shell
// switch, a drag or a keyboard move. An element has one animation at a
// time: a new one, or `finishMotion`, ends the running one at once at its
// end state (FR-071).
import { flushSync } from 'react-dom';
import type { Geometry } from '@cv/os-core';
import { METRICS, MOTION_BASE_MS, MOTION_EASING, MOTION_START_SCALE } from './metrics.ts';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function frames(): Keyframe[] {
  return reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, scale: MOTION_START_SCALE }, { opacity: 1, scale: 1 }];
}

// The animation running on each element, with what puts the element in its
// end state.
const running = new WeakMap<Element, { animation: Animation; end: () => void }>();

// Ends the element's running animation at once, at its end state (FR-071).
export function finishMotion(element: Element | null): void {
  const current = element === null ? undefined : running.get(element);
  if (current === undefined) return;
  running.delete(element!);
  current.end();
  current.animation.cancel();
}

// Plays `keyframes` on the element once its running animation has ended.
// `end` puts it in its end state when it finishes or is ended early; an
// animation that holds its last frame until then needs `hold`.
function play(element: Element, keyframes: Keyframe[], duration: number, end: () => void = () => undefined, hold = false): void {
  finishMotion(element);
  const animation = element.animate(keyframes, { duration, easing: MOTION_EASING, fill: hold ? 'forwards' : 'none' });
  const entry = { animation, end };
  running.set(element, entry);
  animation.finished.then(
    () => {
      if (running.get(element) === entry) finishMotion(element);
    },
    () => undefined,
  );
}

// Plays the opening animation on an element just shown.
export function animateIn(element: Element | null): void {
  if (element !== null) play(element, frames(), METRICS.motionMs);
}

// Plays the closing animation, then calls `done`, which removes or hides
// the element, and drops the animation's last frame once React has
// rendered, so an element hidden rather than removed shows again when it
// comes back. The function returned stops it before `done` runs, putting
// the element back as it was.
export function animateOut(element: Element | null, done: () => void): () => void {
  if (element === null) {
    done();
    return () => undefined;
  }
  finishMotion(element);
  const animation = element.animate(frames().reverse(), { duration: METRICS.motionMs, easing: MOTION_EASING, fill: 'forwards' });
  let stopped = false;
  animation.finished.then(
    () => {
      if (stopped) return;
      flushSync(done);
      animation.cancel();
    },
    () => undefined,
  );
  return () => {
    stopped = true;
    animation.cancel();
  };
}

// A window minimizing into `target`, its dock item's icon or the site
// menu's title, or restoring out of it (FR-069): its box moves and scales
// to the target's, fading out over the last third, and restoring plays it
// backwards. With reduced motion, a fade in place. `end` runs when the
// window is gone.
export function animateInto(element: Element, target: Element | null, direction: 'into' | 'out of', end?: () => void): void {
  const leaving = direction === 'into';
  if (reduced() || target === null) {
    const fade: Keyframe[] = [{ opacity: 1 }, { opacity: 0 }];
    play(element, leaving ? fade : fade.reverse(), METRICS.motionMs, end, leaving);
    return;
  }
  // The box where the window rests, not where a running animation has it.
  finishMotion(element);
  const from = element.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const scale = Math.min(to.width / from.width, to.height / from.height);
  const dx = to.x + to.width / 2 - (from.x + from.width / 2);
  const dy = to.y + to.height / 2 - (from.y + from.height / 2);
  const away = `translate(${dx}px, ${dy}px) scale(${scale})`;
  const keyframes: Keyframe[] = leaving
    ? [{ transform: 'none', opacity: 1 }, { opacity: 1, offset: 2 / 3 }, { transform: away, opacity: 0 }]
    : [{ transform: away, opacity: 0 }, { opacity: 1, offset: 1 / 3 }, { transform: 'none', opacity: 1 }];
  play(element, keyframes, MOTION_BASE_MS, end, leaving);
}

// A window's box changing as it is maximized or restored (FR-070), from
// `from` to where it is now, as a transform, so its content doesn't reflow
// on every frame. With reduced motion, nothing.
export function animateBox(element: Element, from: Geometry, to: Geometry): void {
  if (reduced() || to.width === 0 || to.height === 0) return;
  const dx = from.x + from.width / 2 - (to.x + to.width / 2);
  const dy = from.y + from.height / 2 - (to.y + to.height / 2);
  play(element, [{ transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})` }, { transform: 'none' }], MOTION_BASE_MS);
}
