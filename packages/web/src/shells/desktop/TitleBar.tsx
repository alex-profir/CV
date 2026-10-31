// A window's title bar (005 contracts/shell.md, research R8): close,
// minimize and maximize on the left, the window's name centered. Dragging
// it moves the window with any pointer (FR-019); a drag that starts on a
// control doesn't, and the controls act on click, so releasing away from
// one does nothing. During a keyboard move or resize, the controls give way
// to the mode's name (FR-020). "Show specs" sits at the bar's right end
// while the window shows its app, and the title says when it shows its
// specs (007 contracts/inspector.md).
import { useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Session, WindowState } from '@cv/os-core';
import { ShowSpecs } from '../../inspector/ShowSpecs.tsx';
import { CloseGlyph } from '../../os/icons/CloseGlyph.tsx';
import { MaximizeGlyph } from '../../os/icons/MaximizeGlyph.tsx';
import { MinimizeGlyph } from '../../os/icons/MinimizeGlyph.tsx';
import { RestoreGlyph } from '../../os/icons/RestoreGlyph.tsx';
import type { ShellProps } from '../../os/shell-props.ts';
import { fill, siteText } from '../../site-text.ts';
import { useFrameBatch } from './frame-batch.ts';

// The id that names a window (`aria-labelledby`) and takes focus when it
// opens (FR-040).
export const windowTitleId = (view: string) => `window-title-${view}`;

// Cancels text selection until the pointer is released. Safari's engine
// selects the text a drag from the title bar passes over, despite the bar's
// `user-select: none`. Cancelling `mousedown` would stop it too, but would
// leave keyboard focus in the window the visitor just left.
function holdSelection() {
  const cancel = (event: Event) => event.preventDefault();
  const release = () => {
    document.removeEventListener('selectstart', cancel, true);
    document.removeEventListener('pointerup', release, true);
    document.removeEventListener('pointercancel', release, true);
  };
  document.addEventListener('selectstart', cancel, true);
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
}

export function TitleBar({ window, session, state, dispatch, viewName, viewTitle, apps }: ShellProps & { window: WindowState; session: Session }) {
  const { view, maximized } = window;
  const name = viewName(view);
  const showingSpecs = state.specs[view] !== undefined;
  // An app's own title bar text, such as `Terminal — ~/work`, in place of
  // its name; the controls, dock and menus keep the name (006 contracts/shell.md).
  const WindowTitle = apps.find((app) => app.id === view)?.WindowTitle;
  const drag = useRef<{ pointer: number; startX: number; startY: number; x: number; y: number } | null>(null);
  const schedule = useFrameBatch();

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button === 0) holdSelection();
    if (maximized !== null || event.button !== 0 || (event.target as Element).closest('.control, .show-specs') !== null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, startX: event.clientX, startY: event.clientY, x: window.geometry.x, y: window.geometry.y };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (start === null || start.pointer !== event.pointerId) return;
    const x = start.x + event.clientX - start.startX;
    const y = start.y + event.clientY - start.startY;
    schedule(() => dispatch({ type: 'dragMove', view, x, y }));
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) drag.current = null;
  };

  return (
    <div className="title-bar" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd} data-req="005-os-shell-FR-016 005-os-shell-FR-019">
      {/* First in the DOM, so Tab from the focused title reaches the controls
          next, then the content (research R9); the style sheet centers it. */}
      <div className="window-title" id={windowTitleId(view)} tabIndex={-1} data-req="005-os-shell-FR-040">
        {showingSpecs ? <span data-req="007-requirement-inspector-FR-002">{viewTitle(view)}</span> : WindowTitle === undefined ? name : <WindowTitle />}
      </div>
      {session === null ? (
        <div className="controls">
          <button type="button" className="control control-close" aria-label={fill(siteText.desktop.controls.close, { window: name })} onClick={() => dispatch({ type: 'close', view })} data-req="005-os-shell-FR-016 005-os-shell-FR-023 005-os-shell-FR-028">
            <CloseGlyph />
          </button>
          <button type="button" className="control control-minimize" aria-label={fill(siteText.desktop.controls.minimize, { window: name })} onClick={() => dispatch({ type: 'minimize', view })} data-req="005-os-shell-FR-063">
            <MinimizeGlyph />
          </button>
          <button
            type="button"
            className="control control-maximize"
            aria-label={fill(maximized === null ? siteText.desktop.controls.maximize : siteText.desktop.controls.restore, { window: name })}
            onClick={() => dispatch({ type: 'toggleMaximize', view })}
            data-req="005-os-shell-FR-065"
          >
            {maximized === null ? <MaximizeGlyph /> : <RestoreGlyph />}
          </button>
        </div>
      ) : (
        <span className="mode">{session.kind === 'move' ? siteText.desktop.mode.move : siteText.desktop.mode.resize}</span>
      )}
      {session === null && !showingSpecs && <ShowSpecs view={view} name={name} shell="desktop" dispatch={dispatch} />}
    </div>
  );
}
