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

// The nearest box whose title bar is inside the area: the whole width
// inside, and the top between the area's top and its bottom less a title
// bar (FR-021).
export function clampMove(geometry: Geometry, area: Area, metrics: Metrics): Geometry {
  return {
    x: clamp(Math.round(geometry.x), 0, area.width - geometry.width),
    y: clamp(Math.round(geometry.y), 0, area.height - metrics.titleBar),
    width: geometry.width,
    height: geometry.height,
  };
}

// The box a drag of `edge` asks for, kept within the minimum size and the
// area, with the opposite edge where it is (FR-061).
export function clampResize(geometry: Geometry, edge: Edge, area: Area, metrics: Metrics): Geometry {
  const minimum = minimumOf(area, metrics);
  let left = Math.round(geometry.x);
  let top = Math.round(geometry.y);
  let right = Math.round(geometry.x + geometry.width);
  let bottom = Math.round(geometry.y + geometry.height);
  // The dragged edge stops at the area's edge; either way the size stays
  // between the minimum and the area.
  if (edge.includes('w')) left = clamp(left, Math.max(0, right - area.width), right - minimum.width);
  else right = clamp(right, left + minimum.width, edge.includes('e') ? Math.min(area.width, left + area.width) : left + area.width);
  if (edge.includes('n')) top = clamp(top, Math.max(0, bottom - area.height), bottom - minimum.height);
  else bottom = clamp(bottom, top + minimum.height, edge.includes('s') ? Math.min(area.height, top + area.height) : top + area.height);
  // A fixed edge too near the area's edge for the minimum gives way.
  const size = fitSize(right - left, bottom - top, area, metrics);
  const x = edge.includes('w') ? right - size.width : left;
  const y = edge.includes('n') ? bottom - size.height : top;
  return clampMove({ x, y, ...size }, area, metrics);
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

// A new window's box (FR-018). The CV: centered, `firstTop` below the top,
// at most `cvWidth` wide with `sideMargin` each side, the area's height less
// `bottomMargin` (the same box the style sheet gives the pre-rendered
// window, research R3). About this site: `cascade` right of and below the
// front window, or placed as the CV when none is shown, stepping on by
// `cascade`, and back to the area's top left, until its title bar is on no
// other window's.
export function placeWindow(view: ViewId, windows: readonly WindowState[], area: Area, metrics: Metrics): Geometry {
  const size =
    view === 'cv'
      ? fitSize(Math.min(metrics.cvWidth, area.width - 2 * metrics.sideMargin), area.height - metrics.bottomMargin, area, metrics)
      : fitSize(metrics.aboutWidth, metrics.aboutHeight, area, metrics);
  const centred = { x: Math.round((area.width - size.width) / 2), y: Math.min(metrics.firstTop, area.height - size.height), ...size };
  const shown = windows.filter((window) => !window.minimized && window.view !== view && window.placement === 'set');
  const front = shown[0];
  if (view === 'cv' || front === undefined) return clampMove(centred, area, metrics);

  const others = shown.map((window) => window.geometry);
  let box = { ...size, x: front.geometry.x + metrics.cascade, y: front.geometry.y + metrics.cascade };
  const fits = (candidate: Geometry) => candidate.x + candidate.width <= area.width && candidate.y + candidate.height <= area.height;
  // Enough steps to cross the area twice; then the best box found stands.
  const tries = 2 * Math.ceil((area.width + area.height) / Math.max(1, metrics.cascade));
  for (let step = 0; step < tries; step += 1) {
    if (!fits(box)) box = { ...box, x: 0, y: 0 };
    if (!others.some((other) => titleBarsMeet(box, other, metrics))) break;
    box = { ...box, x: box.x + metrics.cascade, y: box.y + metrics.cascade };
  }
  return clampMove(box, area, metrics);
}
