// The scroller's position as a view swaps its content (007 research R3): the
// spec view starts at the top, and the app comes back where it was, set
// before the browser paints. Mounting doesn't move it: a view reopened on
// mobile is where 005's saved position puts it.
import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function useSpecScroll(scroller: RefObject<HTMLElement | null>, specs: { appScroll: number } | undefined): void {
  const showing = specs !== undefined;
  const appScroll = useRef(specs?.appScroll ?? 0);
  if (specs !== undefined) appScroll.current = specs.appScroll;
  const mounted = useRef(false);
  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (scroller.current !== null) scroller.current.scrollTop = showing ? 0 : appScroll.current;
  }, [showing]);
}
