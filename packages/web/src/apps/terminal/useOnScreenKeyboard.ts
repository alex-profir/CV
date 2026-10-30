// Whether a phone's on-screen keyboard is open (006 research R15, FR-053):
// while a text field in `root` has focus, a visual viewport made shorter at
// the same width is the keyboard. Losing focus, or the viewport growing
// back, closes it.
import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

const TYPING = 'input.command-line, input.vim-entry, textarea.vim-insert';

export function useOnScreenKeyboard(root: RefObject<HTMLElement | null>): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = root.current;
    const viewport = element?.ownerDocument.defaultView?.visualViewport;
    if (element === null || element === undefined || viewport === null || viewport === undefined) return;
    let base: { width: number; height: number } | null = null;
    const typing = () => element.ownerDocument.activeElement?.matches(TYPING) === true && element.contains(element.ownerDocument.activeElement);
    const focusIn = () => {
      if (typing() && base === null) base = { width: viewport.width, height: viewport.height };
    };
    const focusOut = () => {
      queueMicrotask(() => {
        if (typing()) return;
        base = null;
        setOpen(false);
      });
    };
    const resize = () => {
      if (base === null) return;
      if (viewport.width !== base.width) {
        base = { width: viewport.width, height: viewport.height };
        setOpen(false);
        return;
      }
      setOpen(viewport.height < base.height);
    };
    focusIn();
    element.addEventListener('focusin', focusIn);
    element.addEventListener('focusout', focusOut);
    viewport.addEventListener('resize', resize);
    return () => {
      element.removeEventListener('focusin', focusIn);
      element.removeEventListener('focusout', focusOut);
      viewport.removeEventListener('resize', resize);
    };
  }, [root]);
  return open;
}
