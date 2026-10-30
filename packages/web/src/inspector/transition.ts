// Showing and leaving a spec view (007 research R11, FR-022): the scroller's
// old and new content cross-fade, over `motion.duration.fast` with
// `motion.easing.standard`, and nothing moves or scales. With reduced
// motion the content swaps at once.
//
// The old content is a copy of the scroller, laid over it, inert and hidden
// from screen readers, that fades out while the new content fades in below
// it. Both stay live: a view transition fades flat images instead, and
// Safari and Firefox draw those without the glass blur behind the content
// or the scroller's scroll bar, which then come back at the end (R11).
import { flushSync } from 'react-dom';
import { METRICS, MOTION_EASING } from '../os/metrics.ts';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Ends each scroller's running cross-fade at once.
const running = new WeakMap<Element, () => void>();

export function crossFade(scroller: Element | null, swap: () => void): void {
  if (scroller !== null) running.get(scroller)?.();
  if (!(scroller instanceof HTMLElement) || reduced()) {
    swap();
    return;
  }
  const old = outgoing(scroller);
  flushSync(swap);
  const timing: KeyframeAnimationOptions = { duration: METRICS.motionMs, easing: MOTION_EASING, fill: 'both' };
  const fades = [old.animate([{ opacity: 1 }, { opacity: 0 }], timing), ...[...scroller.children].map((child) => child.animate([{ opacity: 0 }, { opacity: 1 }], timing))];
  const end = () => {
    running.delete(scroller);
    old.remove();
    for (const fade of fades) fade.cancel();
  };
  running.set(scroller, end);
  fades[0]!.finished.then(() => running.get(scroller) === end && end(), () => undefined);
}

// A copy of the scroller and what it shows, in the same place and scrolled
// as far, for the eye alone.
function outgoing(scroller: HTMLElement): HTMLElement {
  const old = scroller.cloneNode(true) as HTMLElement;
  for (const element of [old, ...old.querySelectorAll('[id], [data-req]')]) {
    element.removeAttribute('id');
    element.removeAttribute('data-req');
  }
  old.inert = true;
  old.setAttribute('aria-hidden', 'true');
  old.setAttribute('data-spec-swap', '');
  old.style.position = 'absolute';
  old.style.pointerEvents = 'none';
  old.style.width = `${scroller.offsetWidth}px`;
  old.style.height = `${scroller.offsetHeight}px`;
  scroller.after(old);
  const at = scroller.getBoundingClientRect();
  const from = (old.offsetParent ?? document.body).getBoundingClientRect();
  old.style.left = `${at.left - from.left - (old.offsetParent?.clientLeft ?? 0)}px`;
  old.style.top = `${at.top - from.top - (old.offsetParent?.clientTop ?? 0)}px`;
  old.scrollTop = scroller.scrollTop;
  return old;
}

// A view's scroller, in its window or full-screen view.
export function viewScroller(view: string): Element | null {
  return document.querySelector(`#os .desktop .window[data-view="${view}"] .window-content:not([data-spec-swap]), #os .full-screen[data-view="${view}"] .view-content:not([data-spec-swap])`);
}
