// A window's resize handles (005 research R8, FR-061): every edge and
// corner, for pointers only, so they're hidden from assistive technology;
// the keyboard resizes through the pad (FR-062). The bottom-right corner
// shows a grip. A drag keeps the opposite edge where it is, and os-core
// stops it at the minimum size and the desktop area's edges.
import { useRef } from 'react';
import type { Dispatch, PointerEvent as ReactPointerEvent } from 'react';
import type { Edge, Geometry, OsAction, WindowState } from '@cv/os-core';
import { Grip } from '../../os/icons/Grip.tsx';
import { useFrameBatch } from './frame-batch.ts';

const EDGES: readonly Edge[] = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];

// The box a drag of `edge` by `dx`, `dy` asks for.
function resized(start: Geometry, edge: Edge, dx: number, dy: number): Geometry {
  let { x, y, width, height } = start;
  if (edge.includes('e')) width += dx;
  if (edge.includes('s')) height += dy;
  if (edge.includes('w')) {
    x += dx;
    width -= dx;
  }
  if (edge.includes('n')) {
    y += dy;
    height -= dy;
  }
  return { x, y, width, height };
}

export function ResizeHandles({ window, dispatch }: { window: WindowState; dispatch: Dispatch<OsAction> }) {
  const drag = useRef<{ pointer: number; edge: Edge; startX: number; startY: number; start: Geometry } | null>(null);
  const schedule = useFrameBatch();
  const { view } = window;

  const onPointerDown = (edge: Edge) => (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: event.pointerId, edge, startX: event.clientX, startY: event.clientY, start: window.geometry };
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (current === null || current.pointer !== event.pointerId) return;
    const geometry = resized(current.start, current.edge, event.clientX - current.startX, event.clientY - current.startY);
    schedule(() => dispatch({ type: 'dragResize', view, edge: current.edge, geometry, from: current.start }));
  };
  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointer === event.pointerId) drag.current = null;
  };

  return (
    <div className="resize-handles" aria-hidden="true" data-req="005-os-shell-FR-061">
      {EDGES.map((edge) => (
        <div
          key={edge}
          className={`resize-handle resize-${edge}`}
          data-edge={edge}
          onPointerDown={onPointerDown(edge)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
        >
          {edge === 'se' && <Grip />}
        </div>
      ))}
    </div>
  );
}
