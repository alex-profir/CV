// Showing and leaving a spec view (007 research R11, FR-022): the scroller's
// old and new content cross-fade, over `motion.duration.fast` with
// `motion.easing.standard` from the style sheet, and nothing moves or
// scales. With reduced motion, or without view transitions, the content
// swaps at once.
import { flushSync } from 'react-dom';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function crossFade(scroller: Element | null, swap: () => void): void {
  if (scroller === null || reduced() || typeof document.startViewTransition !== 'function') {
    swap();
    return;
  }
  // The style sheet names the scroller for the transition while it runs.
  scroller.setAttribute('data-spec-swap', '');
  const transition = document.startViewTransition(() => flushSync(swap));
  // `finished` rejects if the swap throws; React reports that error itself.
  transition.finished.then(
    () => scroller.removeAttribute('data-spec-swap'),
    () => scroller.removeAttribute('data-spec-swap'),
  );
}

// A view's scroller, in its window or full-screen view.
export function viewScroller(view: string): Element | null {
  return document.querySelector(`#os .desktop .window[data-view="${view}"] .window-content, #os .full-screen[data-view="${view}"] .view-content`);
}
