// The shell's motion (005 research R13, FR-046): windows, full-screen apps
// and menus fade in and grow from `scale.open-start` (96%), and windows fade
// out and shrink the same way, over `motion.duration.fast` with
// `motion.easing.standard`. With reduced motion they only fade. The
// preference is read at each call, so a change while the site is open
// applies to the next animation. Only what the visitor does animates: never
// the first load, hydration, a shell switch, a drag or a keyboard move.
import { flushSync } from 'react-dom';
import { METRICS, MOTION_EASING, MOTION_START_SCALE } from './metrics.ts';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function frames(): Keyframe[] {
  return reduced() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, scale: MOTION_START_SCALE }, { opacity: 1, scale: 1 }];
}

// Plays the opening animation on an element just shown.
export function animateIn(element: Element | null): void {
  element?.animate(frames(), { duration: METRICS.motionMs, easing: MOTION_EASING });
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
