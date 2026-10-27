// The move and resize pad (005 contracts/shell.md, FR-020, FR-027, FR-062):
// it shows on the window during a keyboard move or resize, started from
// the window's menu or a shortcut. One click or arrow key is one step;
// Shift with an arrow is a big step; Enter or Done confirms; Escape or
// Cancel puts the window back. A pointer down outside the window counts as
// Done. The steps are the design's, read from tokens through METRICS.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { Session, WindowState } from '@cv/os-core';
import { METRICS } from '../../os/metrics.ts';
import type { ShellProps } from '../../os/shell-props.ts';
import { fill, siteText } from '../../site-text.ts';

type Direction = 'up' | 'down' | 'left' | 'right';

const ARROWS: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

const DELTAS: Record<Direction, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export function Pad({ window, session, dispatch, viewName }: ShellProps & { window: WindowState; session: Session & object }) {
  const text = siteText.desktop.pad;
  const name = viewName(window.view);
  const root = useRef<HTMLDivElement>(null);
  const step = (direction: Direction, size: number) => {
    const [dx, dy] = DELTAS[direction];
    dispatch({ type: 'sessionStep', dx: dx * size, dy: dy * size });
  };
  const labels: Record<Direction, string> =
    session.kind === 'move'
      ? { up: text.up, down: text.down, left: text.left, right: text.right }
      : { up: text.shorter, down: text.taller, left: text.narrower, right: text.wider };

  // A pointer down outside the window ends the session as Done.
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const section = root.current?.closest('.window');
      if (section !== null && section !== undefined && !section.contains(event.target as Node)) dispatch({ type: 'sessionEnd', confirm: true });
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [dispatch]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const direction = ARROWS[event.key];
    if (direction !== undefined && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      step(direction, event.shiftKey ? METRICS.bigStep : METRICS.step);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      dispatch({ type: 'sessionEnd', confirm: true });
    } else if (event.key === 'Escape') {
      event.preventDefault();
      dispatch({ type: 'sessionEnd', confirm: false });
    }
  };

  const button = (direction: Direction) => (
    <button type="button" className={`pad-${direction}`} onClick={() => step(direction, METRICS.step)}>
      {labels[direction]}
    </button>
  );

  return (
    <div
      ref={root}
      className="pad"
      role="group"
      aria-label={fill(session.kind === 'move' ? text.moving : text.resizing, { window: name })}
      onKeyDown={onKeyDown}
      data-req="005-os-shell-FR-020 005-os-shell-FR-027 005-os-shell-FR-062"
    >
      <div className="pad-head" aria-hidden="true">
        <span>{fill(session.kind === 'move' ? text.moving : text.resizing, { window: name })}</span>
      </div>
      <div className="pad-grid">
        {button('up')}
        {button('left')}
        {button('right')}
        {button('down')}
      </div>
      <p className="pad-hint">
        <span>{fill(text.step, { step: METRICS.step })}</span> <span>{fill(text.bigStep, { bigStep: METRICS.bigStep })}</span>
      </p>
      <div className="pad-actions">
        <button type="button" className="pad-done" onClick={() => dispatch({ type: 'sessionEnd', confirm: true })}>
          {text.done}
        </button>
        <button type="button" className="pad-cancel" onClick={() => dispatch({ type: 'sessionEnd', confirm: false })}>
          {text.cancel}
        </button>
      </div>
    </div>
  );
}
