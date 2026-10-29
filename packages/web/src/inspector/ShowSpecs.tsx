// "Show specs" (007 contracts/inspector.md): at the right end of a window's
// title bar, or of a full-screen view's header, while the view shows its
// app. It keeps where the app was scrolled to, so Back brings it there.
// No `title`: nothing appears on hover or focus (FR-005).
import type { Dispatch } from 'react';
import type { OsAction, ShellName, ViewId } from '@cv/os-core';
import { fill, siteText } from '../site-text.ts';
import { retry } from './data.ts';
import { SheetGlyph } from './glyphs/SheetGlyph.tsx';

// The scroller holding a view's content, from an element inside its window
// or full-screen view.
export function scrollerOf(element: Element): Element | null {
  return element.closest('.window, .full-screen')?.querySelector('.window-content, .view-content') ?? null;
}

// Shows a view's specs, keeping the app's scroll position, from an element
// inside its window or full-screen view, or the view's own window.
export function showSpecs(dispatch: Dispatch<OsAction>, view: ViewId, from: Element | null): void {
  retry();
  const scroller = from === null ? null : scrollerOf(from);
  dispatch({ type: 'showSpecs', view, appScroll: scroller?.scrollTop ?? 0 });
}

export function ShowSpecs({ view, name, shell, dispatch }: { view: ViewId; name: string; shell: ShellName; dispatch: Dispatch<OsAction> }) {
  return (
    <button
      type="button"
      className="show-specs"
      aria-label={fill(siteText.inspector.showName, { view: name })}
      onClick={(event) => showSpecs(dispatch, view, event.currentTarget)}
      data-req="007-requirement-inspector-FR-001 007-requirement-inspector-FR-005 007-requirement-inspector-FR-016 007-requirement-inspector-FR-019"
    >
      <SheetGlyph />
      {shell === 'mobile' ? siteText.inspector.showShort : siteText.inspector.show}
    </button>
  );
}
