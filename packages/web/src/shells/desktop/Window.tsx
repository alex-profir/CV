// A desktop window (005 contracts/shell.md Desktop shell, research R3, R8):
// a section named by its title, its title bar, its content, which scrolls
// on its own, the resize handles, and the pad during a keyboard move or
// resize. A pointer down or focus reaching it brings it to the front
// (FR-017, FR-030), and focus that doesn't follow a pointer, on an element
// behind the dock or past the screen's edge, brings it into view (FR-067).
// A minimized window stays mounted, hidden, so its content and scroll
// position survive (FR-063); it stays drawn, inert, while it shrinks into
// the dock (FR-069).
import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { WindowState } from '@cv/os-core';
import { byPointer, elementOf } from '../../os/focus.ts';
import { FOCUS_REACH } from '../../os/metrics.ts';
import type { ShellProps } from '../../os/shell-props.ts';
import { animateBox, animateIn, animateInto, finishMotion } from '../../os/motion.ts';
import { View } from '../../os/View.tsx';
import { Pad } from './Pad.tsx';
import { ResizeHandles } from './ResizeHandles.tsx';
import { TitleBar, windowTitleId } from './TitleBar.tsx';

export function Window(props: ShellProps & { window: WindowState; depth: number; canAnimate: () => boolean }) {
  const { window, depth, state, dispatch, apps, resume, siteData, mac, canAnimate } = props;
  const { view, geometry, placement, minimized, maximized } = window;
  const section = useRef<HTMLElement>(null);

  // Opening grows the window in; minimizing shrinks it into its dock item,
  // or the site menu's title for About this site, and restoring grows it
  // back out; maximizing and restoring the size move its box (research
  // R13, R20). A window mounted with the shell doesn't animate. The reducer
  // has already run, so focus doesn't wait (FR-071).
  const isMaximized = maximized !== null;
  const mounted = useRef(false);
  const before = useRef({ minimized, isMaximized, geometry });
  useLayoutEffect(() => {
    const element = section.current;
    const opening = !mounted.current;
    const was = before.current;
    mounted.current = true;
    if (element === null) return;
    if (opening) {
      if (!minimized && canAnimate()) animateIn(element);
    } else if (minimized !== was.minimized) {
      const target = view === 'about' ? elementOf({ kind: 'site-menu' }) : (elementOf({ kind: 'dock-item', app: view })?.querySelector('.dock-icon') ?? null);
      if (minimized) {
        element.setAttribute('data-leaving', '');
        element.inert = true;
        animateInto(element, target, 'into', () => {
          element.removeAttribute('data-leaving');
          element.inert = false;
        });
      } else animateInto(element, target, 'out of');
    } else if (isMaximized !== was.isMaximized) animateBox(element, was.geometry, geometry);
  }, [minimized, isMaximized]);
  // What the window was at the last render, for the next change.
  useLayoutEffect(() => {
    before.current = { minimized, isMaximized, geometry };
  });

  const onPointerDown = () => {
    // Acting on the window ends its animation at once (FR-071).
    finishMotion(section.current);
    dispatch({ type: 'focus', view });
  };

  const focused = state.focused === view;
  const session = state.session !== null && state.session.view === view ? state.session : null;
  // A keyboard move or resize puts the window where the visitor chose: the
  // focus it gives, to its pad and, when it ends, back into the window,
  // leaves the window there (FR-021, FR-067).
  const placed = useRef(false);
  const hadSession = useRef(false);
  useLayoutEffect(() => {
    if (hadSession.current && session === null) placed.current = true;
    hadSession.current = session !== null;
  }, [session !== null]);

  // One frame after focus, once the browser has scrolled the content to
  // the element, and once the window's own animation has ended, so its box
  // is where it rests: the element and its indicator, relative to the area.
  // Focus that follows a pointer doesn't move the window: the visitor
  // points at what they see, and their window stays where they put it.
  const reveal = (target: Element) => {
    const afterSession = placed.current;
    placed.current = false;
    if (byPointer() || session !== null || afterSession) return;
    requestAnimationFrame(async () => {
      await Promise.all((section.current?.getAnimations() ?? []).map((animation) => animation.finished.catch(() => undefined)));
      const area = section.current?.parentElement;
      if (document.activeElement !== target || area == null) return;
      // The content itself, when Tab reaches it, shows its indicator around the window.
      const element = target.classList.contains('window-content') ? section.current! : target;
      const box = element.getBoundingClientRect();
      const bounds = area.getBoundingClientRect();
      dispatch({
        type: 'reveal',
        view,
        box: { x: box.left - bounds.left - FOCUS_REACH, y: box.top - bounds.top - FOCUS_REACH, width: box.width + 2 * FOCUS_REACH, height: box.height + 2 * FOCUS_REACH },
      });
    });
  };

  // Geometry from state is state, not a design value (research R3). Until
  // measured, the style sheet places the pre-rendered window.
  const style: CSSProperties = placement === 'set' ? { left: geometry.x, top: geometry.y, width: geometry.width, height: geometry.height, zIndex: depth } : { zIndex: depth };
  return (
    <section
      ref={section}
      className="window"
      aria-roledescription="window"
      aria-labelledby={windowTitleId(view)}
      aria-current={focused ? 'true' : undefined}
      data-view={view}
      data-placement={placement}
      data-maximized={maximized === null ? undefined : ''}
      hidden={minimized}
      style={style}
      onPointerDown={onPointerDown}
      onFocus={(event) => {
        if (!focused) dispatch({ type: 'focus', view });
        reveal(event.target);
      }}
      data-req="005-os-shell-FR-017 005-os-shell-FR-018 005-os-shell-FR-021 005-os-shell-FR-030 005-os-shell-FR-039 005-os-shell-FR-067 005-os-shell-FR-069 005-os-shell-FR-070 005-os-shell-FR-071"
    >
      <TitleBar {...props} session={session} />
      <div className="window-content" data-req="005-os-shell-FR-022">
        <View view={view} apps={apps} resume={resume} siteData={siteData} shell="desktop" mac={mac} dispatch={dispatch} />
      </div>
      {maximized === null && session === null && <ResizeHandles window={window} dispatch={dispatch} />}
      {session !== null && <Pad {...props} session={session} />}
    </section>
  );
}
