// A desktop window (005 contracts/shell.md Desktop shell, research R3, R8):
// a section named by its title, its title bar, its content, which scrolls
// on its own, the resize handles, and the pad during a keyboard move or
// resize. A pointer down or focus reaching it brings it to the front
// (FR-017, FR-030). A minimized window stays mounted, hidden, so its
// content and scroll position survive (FR-063).
import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { WindowState } from '@cv/os-core';
import type { ShellProps } from '../../os/shell-props.ts';
import { animateIn } from '../../os/motion.ts';
import { View } from '../../os/View.tsx';
import { Pad } from './Pad.tsx';
import { ResizeHandles } from './ResizeHandles.tsx';
import { TitleBar, windowTitleId } from './TitleBar.tsx';

export function Window(props: ShellProps & { window: WindowState; depth: number; canAnimate: () => boolean }) {
  const { window, depth, state, dispatch, apps, resume, siteData, mac, canAnimate } = props;
  const { view, geometry, placement, minimized, maximized } = window;
  const section = useRef<HTMLElement>(null);

  // Opening, restoring and maximizing or restoring the size animate; a
  // window mounted with the shell doesn't (research R13).
  const isMaximized = maximized !== null;
  const mounted = useRef(false);
  useEffect(() => {
    const opening = !mounted.current;
    mounted.current = true;
    if (minimized || (opening && !canAnimate())) return;
    animateIn(section.current);
  }, [minimized, isMaximized]);

  const focused = state.focused === view;
  const session = state.session !== null && state.session.view === view ? state.session : null;
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
      onPointerDown={() => dispatch({ type: 'focus', view })}
      onFocus={() => {
        if (!focused) dispatch({ type: 'focus', view });
      }}
      data-req="005-os-shell-FR-017 005-os-shell-FR-018 005-os-shell-FR-021 005-os-shell-FR-030 005-os-shell-FR-039"
    >
      <TitleBar {...props} session={session} />
      <div className="window-content" data-req="005-os-shell-FR-022">
        <View view={view} apps={apps} resume={resume} siteData={siteData} shell="desktop" mac={mac} />
      </div>
      {maximized === null && session === null && <ResizeHandles window={window} dispatch={dispatch} />}
      {session !== null && <Pad {...props} session={session} />}
    </section>
  );
}
