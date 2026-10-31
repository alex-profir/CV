// Window geometry (FR-018, FR-021, FR-061, FR-065, research R3, R8). Every
// box is relative to the desktop area, in whole CSS pixels, and every
// function returns a new value.
import type { Area, Edge, Geometry, Metrics, ViewId, WindowState } from './types.ts';

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), Math.max(low, high));

// The smallest a window may be in this area: the design's minimum, or the
// whole area when that is smaller (spec edge cases).
const minimumOf = (area: Area, metrics: Metrics) => ({ width: Math.min(metrics.minWidth, area.width), height: Math.min(metrics.minHeight, area.height) });

// A size between the minimum and the area.
function fitSize(width: number, height: number, area: Area, metrics: Metrics): { width: number; height: number } {
  const minimum = minimumOf(area, metrics);
  return { width: clamp(Math.round(width), minimum.width, area.width), height: clamp(Math.round(height), minimum.height, area.height) };
}

// The nearest box whose title bar is where FR-021 keeps it: its top between
// the area's top and its bottom less a title bar, so it stays between the
// menu bar and the dock, and at least `grab` of its width on screen
// sideways. Below the title bar, the window may pass behind the dock and
// past the screen's edges.
export function clampMove(geometry: Geometry, area: Area, metrics: Metrics): Geometry {
  const grab = Math.min(metrics.grab, geometry.width);
  return {
    x: clamp(Math.round(geometry.x), grab - geometry.width, area.width - grab),
    y: clamp(Math.round(geometry.y), 0, area.height - metrics.titleBar),
    width: geometry.width,
    height: geometry.height,
  };
}

// The box a drag of `edge` asks for, kept within the minimum size and the
// area's size, with the opposite edge where it is (FR-061). A dragged edge
// stops at the area's top and sides and at the screen's bottom, below the
// dock; one already past its limit, on a window moved past the edge
// (`from`, the box before the drag), stops where it was instead, so it can
// come back but never jumps. It also stops where the title bar would leave
// the place FR-021 keeps it, so the window never has to move.
export function clampResize(geometry: Geometry, edge: Edge, area: Area, metrics: Metrics, from: Geometry = geometry): Geometry {
  const minimum = minimumOf(area, metrics);
  let left = Math.round(geometry.x);
  let top = Math.round(geometry.y);
  let right = Math.round(geometry.x + geometry.width);
  let bottom = Math.round(geometry.y + geometry.height);
  const leftLimit = Math.min(0, Math.round(from.x));
  const rightLimit = Math.max(area.width, Math.round(from.x + from.width));
  const bottomLimit = Math.max(area.height + metrics.dockReserve, Math.round(from.y + from.height));
  // Either way the size stays between the minimum and the area.
  if (edge.includes('w')) left = clamp(left, Math.max(leftLimit, right - area.width), Math.min(right - minimum.width, area.width - metrics.grab));
  else {
    // A window past the left edge keeps `grab` of its title bar on screen.
    const least = left < 0 ? Math.max(left + minimum.width, metrics.grab) : left + minimum.width;
    right = clamp(right, least, edge.includes('e') ? Math.min(rightLimit, left + area.width) : left + area.width);
  }
  if (edge.includes('n')) top = clamp(top, Math.max(0, bottom - area.height), Math.min(bottom - minimum.height, area.height - metrics.titleBar));
  else bottom = clamp(bottom, top + minimum.height, edge.includes('s') ? Math.min(bottomLimit, top + area.height) : top + area.height);
  // A fixed edge too near the area's edge for the minimum gives way.
  const size = fitSize(right - left, bottom - top, area, metrics);
  const x = edge.includes('w') ? right - size.width : left;
  const y = edge.includes('n') ? bottom - size.height : top;
  return clampMove({ x, y, ...size }, area, metrics);
}

// The window moved by the least distance that brings `box`, an element in
// it relative to the area, inside the area, or the box's start when it is
// larger, clamped as a move (FR-067). Unchanged when the box is inside.
export function revealMove(geometry: Geometry, box: Geometry, area: Area, metrics: Metrics): Geometry {
  const shift = (start: number, size: number, limit: number) => (start < 0 || size > limit ? -start : start + size > limit ? limit - start - size : 0);
  const dx = shift(box.x, box.width, area.width);
  const dy = shift(box.y, box.height, area.height);
  if (dx === 0 && dy === 0) return geometry;
  return clampMove({ ...geometry, x: geometry.x + dx, y: geometry.y + dy }, area, metrics);
}

// A box fitted to an area that changed: no larger than it, no smaller than
// the minimum, and moved back inside.
function fitGeometry(geometry: Geometry, area: Area, metrics: Metrics): Geometry {
  return clampMove({ ...geometry, ...fitSize(geometry.width, geometry.height, area, metrics) }, area, metrics);
}

// A window after the area changed: moved inside and fitted, or filling the
// area when maximized (FR-021, FR-065). A maximized window keeps its restore
// box as it was; it is fitted when the window is restored.
export function fitToArea(window: WindowState, area: Area, metrics: Metrics): WindowState {
  if (window.placement === 'initial') return window;
  if (window.maximized !== null) return { ...window, geometry: { x: 0, y: 0, width: area.width, height: area.height } };
  return { ...window, geometry: fitGeometry(window.geometry, area, metrics) };
}

// Whether two title bars share any pixel.
function titleBarsMeet(a: Geometry, b: Geometry, metrics: Metrics): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + metrics.titleBar && b.y < a.y + metrics.titleBar;
}

// Whether a whole box shares any pixel with another window's title bar.
function boxMeetsTitleBar(box: Geometry, other: Geometry, metrics: Metrics): boolean {
  return box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + metrics.titleBar && other.y < box.y + box.height;
}

// A new window's box (FR-018). The CV: centered, `firstTop` below the top,
// at most `cvWidth` wide with `sideMargin` each side, the area's height less
// `bottomMargin` (the same box the style sheet gives the pre-rendered
// window, research R3). When that box is on a shown window's title bar, its
// top steps down by `cascade` with its bottom edge kept, no shorter than the
// minimum, until it isn't; with no such box, the first step whose title bar
// is on no other window's stands, or else the centered box. About this site: `cascade` right of and below the
// front window, or placed as the CV when none is shown, stepping on by
// `cascade`, and back to the area's top left, until its whole box is on no
// other window's title bar, so every title bar stays in view. When no step
// gives such a box, as when a window moved low leaves no room below its
// title bar, the first step whose title bar is on no other window's stands.
export function placeWindow(view: ViewId, windows: readonly WindowState[], area: Area, metrics: Metrics): Geometry {
  if (view === 'terminal') return placeBeside(view, windows, { width: metrics.terminalWidth, height: metrics.terminalHeight }, metrics.terminalMargin, metrics.terminalOffset, area, metrics);
  if (view === 'playground') return placeBeside(view, windows, { width: metrics.playgroundWidth, height: metrics.playgroundHeight }, metrics.playgroundMargin, metrics.playgroundOffset, area, metrics);
  const size =
    view === 'cv'
      ? fitSize(Math.min(metrics.cvWidth, area.width - 2 * metrics.sideMargin), area.height - metrics.bottomMargin, area, metrics)
      : fitSize(metrics.aboutWidth, metrics.aboutHeight, area, metrics);
  const centred = { x: Math.round((area.width - size.width) / 2), y: Math.min(metrics.firstTop, area.height - size.height), ...size };
  const shown = windows.filter((window) => !window.minimized && window.view !== view && window.placement === 'set');
  const others = shown.map((window) => window.geometry);
  const front = shown[0];
  if (view === 'cv') {
    const bottom = centred.y + centred.height;
    const minimum = minimumOf(area, metrics).height;
    let clearTitleBar: Geometry | undefined;
    for (let y = centred.y; bottom - y >= minimum || y === centred.y; y += Math.max(1, metrics.cascade)) {
      const box = { ...centred, y, height: bottom - y };
      if (!others.some((other) => boxMeetsTitleBar(box, other, metrics))) return clampMove(box, area, metrics);
      if (clearTitleBar === undefined && !others.some((other) => titleBarsMeet(box, other, metrics))) clearTitleBar = box;
    }
    return clampMove(clearTitleBar ?? centred, area, metrics);
  }
  if (front === undefined) return clampMove(centred, area, metrics);

  let box = { ...size, x: front.geometry.x + metrics.cascade, y: front.geometry.y + metrics.cascade };
  const fits = (candidate: Geometry) => candidate.x >= 0 && candidate.y >= 0 && candidate.x + candidate.width <= area.width && candidate.y + candidate.height <= area.height;
  let clearTitleBar: Geometry | undefined;
  // Enough steps to cross the area twice; then the best box found stands.
  const tries = 2 * Math.ceil((area.width + area.height) / Math.max(1, metrics.cascade));
  for (let step = 0; step < tries; step += 1) {
    if (!fits(box)) box = { ...box, x: 0, y: 0 };
    if (!others.some((other) => boxMeetsTitleBar(box, other, metrics))) return clampMove(box, area, metrics);
    if (clearTitleBar === undefined && !others.some((other) => titleBarsMeet(box, other, metrics))) clearTitleBar = box;
    box = { ...box, x: box.x + metrics.cascade, y: box.y + metrics.cascade };
  }
  return clampMove(clearTitleBar ?? box, area, metrics);
}

// The Terminal's box (006 contracts/shell.md) and the Playground's (008):
// `size`, fitted to the area with at least `firstTop` left below it. With a
// shown window in front, its right edge `margin` inside the area's and its
// top `offset` below the front window's, so that title bar stays in view;
// shortened to keep `firstTop` below it, never under the minimum, and moved
// up when even that doesn't fit. With none, centered.
export function placeBeside(view: ViewId, windows: readonly WindowState[], size: Area, margin: number, offset: number, area: Area, metrics: Metrics): Geometry {
  const room = { width: area.width, height: Math.max(0, area.height - metrics.firstTop) };
  const fitted = fitSize(size.width, size.height, room.height < minimumOf(area, metrics).height ? area : room, metrics);
  const front = windows.find((window) => !window.minimized && window.view !== view && window.placement === 'set');
  if (front === undefined) {
    const y = Math.max(0, Math.min(Math.round((area.height - fitted.height) / 2), room.height - fitted.height));
    return clampMove({ x: Math.round((area.width - fitted.width) / 2), y, ...fitted }, area, metrics);
  }
  const minimum = minimumOf(area, metrics).height;
  let y = front.geometry.y + offset;
  let height = fitted.height;
  if (y + height > room.height) {
    height = Math.max(Math.min(minimum, fitted.height), room.height - y);
    y = Math.max(0, Math.min(y, room.height - height));
  }
  // Inside the area even when it is narrower than the margin needs: clampMove
  // alone would leave a box past the left edge (FR-018, FR-021).
  return clampMove({ x: Math.max(0, area.width - margin - fitted.width), y, width: fitted.width, height }, area, metrics);
}
