// The desktop shell (005 contracts/shell.md Desktop shell): the menu bar,
// the desktop area with its windows, and the dock. DOM order is Tab order
// (research R9): a window opened goes first, as it opens in front, but
// raising a window changes only its z-index. Were the DOM reordered as
// focus raised windows, Tab from one window into the one behind would put
// the first after it again, and Tab would go between them for ever
// (FR-030). The area never scrolls; each window's
// content does (FR-022). The keyboard shortcuts live here, so they work
// only while the desktop is shown (Constitution V).
import { useEffect, useRef } from 'react';
import type { ViewId } from '@cv/os-core';
import { matchShortcut } from '@cv/os-core';
import type { ShellProps } from '../../os/shell-props.ts';
import { siteText } from '../../site-text.ts';
import { Dock } from './Dock.tsx';
import { focusDock, focusMenuBar, MenuBar } from './MenuBar.tsx';
import { Window } from './Window.tsx';

// The windows' DOM order: the last order, without closed windows, with
// newly opened ones first in their stacking order.
export function domOrder(previous: readonly ViewId[], stacked: readonly ViewId[]): ViewId[] {
  const kept = previous.filter((view) => stacked.includes(view));
  return [...stacked.filter((view) => !kept.includes(view)), ...kept];
}

export function Desktop(props: ShellProps & { active: boolean }) {
  const { state, dispatch, active, mac } = props;
  const area = useRef<HTMLElement>(null);
  const order = useRef<ViewId[]>([]);
  order.current = domOrder(
    order.current,
    state.windows.map((window) => window.view),
  );

  // The area's size, as the viewport changes (FR-021, FR-065).
  useEffect(() => {
    const element = area.current;
    if (!active || element === null) return undefined;
    const observer = new ResizeObserver(() => {
      const box = element.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) dispatch({ type: 'areaResized', area: { width: Math.round(box.width), height: Math.round(box.height) } });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [active, dispatch]);

  // The shortcuts (FR-025 to FR-029): one listener, added and removed with
  // the shell. A shortcut whose window it needs isn't there does nothing,
  // and lets the key through.
  const latest = useRef(state);
  latest.current = state;
  useEffect(() => {
    if (!active) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      const shortcut = matchShortcut(event, mac);
      if (shortcut === null) return;
      const current = latest.current;
      const focused = current.focused;
      const window = focused === null ? undefined : current.windows.find((candidate) => candidate.view === focused);
      if (shortcut.needs !== 'none' && (focused === null || window === undefined)) return;
      if (shortcut.needs === 'restored-window' && window?.maximized != null) return;
      event.preventDefault();
      switch (shortcut.id) {
        case 'menu-bar':
          return focusMenuBar();
        case 'dock':
          return focusDock();
        case 'next-window':
          return dispatch({ type: 'next' });
        case 'close':
          return dispatch({ type: 'close', view: focused! });
        case 'minimize':
          return dispatch({ type: 'minimize', view: focused! });
        case 'maximize':
          return dispatch({ type: 'toggleMaximize', view: focused! });
        case 'move':
          return dispatch({ type: 'sessionStart', kind: 'move' });
        case 'resize':
          return dispatch({ type: 'sessionStart', kind: 'resize' });
        default:
          return undefined;
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, mac, dispatch]);

  return (
    <div className="desktop" data-req="005-os-shell-FR-005 005-os-shell-FR-010 005-os-shell-FR-024 005-os-shell-FR-025 005-os-shell-FR-037">
      <MenuBar {...props} />
      <main ref={area} className="desktop-area" aria-label={siteText.desktop.area}>
        {order.current.map((view) => {
          const index = state.windows.findIndex((window) => window.view === view);
          return <Window key={view} {...props} window={state.windows[index]!} depth={state.windows.length - index} />;
        })}
        {state.session !== null && (
          // Where the window was when the keyboard move or resize started.
          <div
            className="ghost"
            aria-hidden="true"
            style={{ left: state.session.start.x, top: state.session.start.y, width: state.session.start.width, height: state.session.start.height }}
          />
        )}
      </main>
      <Dock {...props} />
    </div>
  );
}
