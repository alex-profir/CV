// Window geometry (FR-005, FR-018): where windows open, in whole pixels,
// never larger than the desktop area.
import { describe, expect, test } from 'vitest';
import { clampMove, clampResize, fitToArea, placeWindow } from '../src/index.ts';
import type { Edge, Geometry, WindowState } from '../src/index.ts';
import { APPS, AREA, METRICS, desktop, run } from './helpers.ts';

describe('005-os-shell-FR-005 005-os-shell-FR-018: the CV window opens where the design puts it', () => {
  test('1000 × 716 at 220, 24 in the 1440 × 764 area', () => {
    expect(placeWindow('cv', [], { width: 1440, height: 764 }, METRICS)).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
  });

  test('960 × 456 at 32, 24 in the 1024 × 504 area', () => {
    expect(placeWindow('cv', [], { width: 1024, height: 504 }, METRICS)).toEqual({ x: 32, y: 24, width: 960, height: 456 });
  });

  test('never larger than the area, and always whole pixels', () => {
    for (const area of [
      { width: 1025, height: 505 },
      { width: 1333, height: 777 },
      { width: 2560, height: 1304 },
      { width: 401, height: 301 },
      { width: 300, height: 200 },
    ]) {
      const box = placeWindow('cv', [], area, METRICS);
      expect(box.width, JSON.stringify(area)).toBeLessThanOrEqual(area.width);
      expect(box.height, JSON.stringify(area)).toBeLessThanOrEqual(area.height);
      expect(box.x + box.width, JSON.stringify(area)).toBeLessThanOrEqual(area.width);
      expect(box.y + box.height, JSON.stringify(area)).toBeLessThanOrEqual(area.height);
      for (const value of Object.values(box)) expect(Number.isInteger(value), JSON.stringify({ area, box })).toBe(true);
    }
  });
});

const titleBarsMeet = (a: Geometry, b: Geometry) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + METRICS.titleBar && b.y < a.y + METRICS.titleBar;
const boxMeetsTitleBar = (box: Geometry, other: Geometry) =>
  box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + METRICS.titleBar && other.y < box.y + box.height;
const shown = (view: 'cv' | 'about', geometry: Geometry): WindowState => ({ view, geometry, minimized: false, maximized: null, placement: 'set' });

describe("005-os-shell-FR-018: the CV opens off About's title bar", () => {
  test("1000 × 668 at 220, 72 in the 1440 × 764 area, with About centered", () => {
    const about = shown('about', placeWindow('about', [], AREA, METRICS));
    expect(about.geometry).toEqual({ x: 440, y: 24, width: 560, height: 520 });
    const cv = placeWindow('cv', [about], AREA, METRICS);
    expect(cv).toEqual({ x: 220, y: 72, width: 1000, height: 668 });
    expect(boxMeetsTitleBar(cv, about.geometry)).toBe(false);
  });

  test("960 × 408 at 32, 72 in the 1024 × 504 area, with About centered", () => {
    const area = { width: 1024, height: 504 };
    const about = shown('about', placeWindow('about', [], area, METRICS));
    expect(about.geometry).toEqual({ x: 232, y: 0, width: 560, height: 504 });
    const cv = placeWindow('cv', [about], area, METRICS);
    expect(cv).toEqual({ x: 32, y: 72, width: 960, height: 408 });
    expect(boxMeetsTitleBar(cv, about.geometry)).toBe(false);
  });

  test('centered as on first load when About is minimized or out of the way', () => {
    const minimized = { ...shown('about', { x: 440, y: 24, width: 560, height: 520 }), minimized: true };
    expect(placeWindow('cv', [minimized], AREA, METRICS)).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
    const low = shown('about', { x: 440, y: 744, width: 560, height: 520 });
    expect(placeWindow('cv', [low], AREA, METRICS)).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
  });

  test('with About too low for a box below its title bar, the title bars still keep apart', () => {
    const about = shown('about', { x: 440, y: 500, width: 560, height: 264 });
    const cv = placeWindow('cv', [about], AREA, METRICS);
    expect(cv).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
    expect(titleBarsMeet(cv, about.geometry)).toBe(false);
    const nearTop = shown('about', { x: 440, y: 400, width: 560, height: 364 });
    const below = placeWindow('cv', [nearTop], AREA, METRICS);
    expect(below.y + below.height).toBeLessThanOrEqual(AREA.height);
    expect(below.height).toBeGreaterThanOrEqual(METRICS.minHeight);
    expect(titleBarsMeet(below, nearTop.geometry)).toBe(false);
  });
});

describe('005-os-shell-FR-018: About opens clear of the window in front', () => {
  test('560 × 520, 48 px right of and below the front window', () => {
    const cv = desktop().windows;
    expect(placeWindow('about', cv, AREA, METRICS)).toEqual({ x: 268, y: 72, width: 560, height: 520 });
  });

  test('centered as the CV is when no window is shown', () => {
    expect(placeWindow('about', [], AREA, METRICS)).toEqual({ x: 440, y: 24, width: 560, height: 520 });
  });

  test("it steps on, wrapping to the area's top left, until its title bar is on no other", () => {
    const window = (x: number, y: number): WindowState => ({ view: 'cv', geometry: { x, y, width: 1000, height: 400 }, minimized: false, maximized: null, placement: 'set' });
    const other: WindowState = { view: 'cv', geometry: { x: 268, y: 72, width: 600, height: 300 }, minimized: false, maximized: null, placement: 'set' };
    const box = placeWindow('about', [window(220, 24), other], AREA, METRICS);
    for (const shown of [window(220, 24), other]) expect(titleBarsMeet(box, shown.geometry), JSON.stringify(box)).toBe(false);
    const nearEdge = placeWindow('about', [window(440, 300)], AREA, METRICS);
    expect(nearEdge.x + nearEdge.width).toBeLessThanOrEqual(AREA.width);
    expect(nearEdge.y + METRICS.titleBar).toBeLessThanOrEqual(AREA.height);
    expect(titleBarsMeet(nearEdge, window(440, 300).geometry)).toBe(false);
  });

  test("with the CV moved down, About's whole box keeps off the CV's title bar wherever the area leaves room", () => {
    const cvAt = (y: number): WindowState => ({ view: 'cv', geometry: { x: 220, y, width: 1000, height: 716 }, minimized: false, maximized: null, placement: 'set' });
    const boxMeetsTitleBar = (box: Geometry, other: Geometry) =>
      box.x < other.x + other.width && other.x < box.x + box.width && box.y < other.y + METRICS.titleBar && other.y < box.y + box.height;
    const inside = (box: Geometry) => box.x >= 0 && box.y >= 0 && box.x + box.width <= AREA.width && box.y + box.height <= AREA.height;
    // Moved 176 px down, the cascade box no longer fits and wraps to the
    // top left; it steps on to the first box clear of the CV's title bar.
    const moved = placeWindow('about', [cvAt(200)], AREA, METRICS);
    expect(moved).toEqual({ x: 240, y: 240, width: 560, height: 520 });
    expect(boxMeetsTitleBar(moved, cvAt(200).geometry)).toBe(false);
    // Lower still, no 560 × 520 box inside the 1440 × 764 area clears a
    // 1000 px wide title bar at x 220, so no title bar is on another.
    for (const y of [300, 400]) {
      const box = placeWindow('about', [cvAt(y)], AREA, METRICS);
      expect(inside(box), `${y}`).toBe(true);
      expect(titleBarsMeet(box, cvAt(y).geometry), `${y}`).toBe(false);
      let clear = false;
      for (let x = 0; x + box.width <= AREA.width; x += 1) {
        for (let top = 0; top + box.height <= AREA.height; top += 1) clear ||= !boxMeetsTitleBar({ ...box, x, y: top }, cvAt(y).geometry);
      }
      expect(clear, `${y}`).toBe(false);
    }
  });

  test('after five open and close cycles, no title bar is on another', () => {
    let state = desktop();
    for (let cycle = 0; cycle < 5; cycle += 1) {
      state = run(state, [{ type: 'open', view: 'about' }, { type: 'dragMove', view: 'about', x: 300 + cycle * 20, y: 100 + cycle * 10 }, { type: 'close', view: 'about' }, { type: 'open', view: 'about' }, { type: 'effectsDone' }]);
      const [about, cv] = [state.windows.find((window) => window.view === 'about')!, state.windows.find((window) => window.view === 'cv')!];
      expect(titleBarsMeet(about.geometry, cv.geometry), `cycle ${cycle}`).toBe(false);
      state = run(state, [{ type: 'close', view: 'about' }, { type: 'effectsDone' }]);
    }
    expect(APPS).toHaveLength(1);
  });
});

describe('005-os-shell-FR-021: windows keep their title bar inside the desktop area', () => {
  const start = { x: 220, y: 24, width: 1000, height: 716 };

  test('clampMove stops a move past each edge with the title bar inside', () => {
    expect(clampMove({ ...start, x: -500 }, AREA, METRICS).x).toBe(0);
    expect(clampMove({ ...start, x: 5000 }, AREA, METRICS).x).toBe(AREA.width - 1000);
    expect(clampMove({ ...start, y: -50 }, AREA, METRICS).y).toBe(0);
    expect(clampMove({ ...start, y: 5000 }, AREA, METRICS).y).toBe(AREA.height - METRICS.titleBar);
    expect(clampMove({ ...start, x: 10.4, y: 20.6 }, AREA, METRICS)).toEqual({ ...start, x: 10, y: 21 });
  });

  test('fitToArea moves windows back inside, and fits ones larger than the area', () => {
    const window: WindowState = { view: 'cv', geometry: { x: 400, y: 24, width: 1000, height: 716 }, minimized: false, maximized: null, placement: 'set' };
    expect(fitToArea(window, { width: 1100, height: 764 }, METRICS).geometry).toEqual({ x: 100, y: 24, width: 1000, height: 716 });
    expect(fitToArea(window, { width: 900, height: 500 }, METRICS).geometry).toEqual({ x: 0, y: 24, width: 900, height: 500 });
  });
});

describe('005-os-shell-FR-061: resizing stops at 400 × 300 and at the area, keeping the opposite edge', () => {
  const start = { x: 220, y: 24, width: 1000, height: 716 };
  const shrink: Record<Edge, Geometry> = {
    n: { ...start, y: 700, height: 40 },
    s: { ...start, height: 10 },
    e: { ...start, width: 10 },
    w: { ...start, x: 1210, width: 10 },
    ne: { ...start, y: 700, height: 40, width: 10 },
    nw: { x: 1210, y: 700, width: 10, height: 40 },
    se: { ...start, width: 10, height: 10 },
    sw: { ...start, x: 1210, width: 10, height: 10 },
  };

  test('from each of the eight edges and corners, at the minimum size', () => {
    for (const [edge, geometry] of Object.entries(shrink) as [Edge, Geometry][]) {
      const box = clampResize(geometry, edge, AREA, METRICS);
      const right = start.x + start.width;
      const bottom = start.y + start.height;
      if (edge.includes('n')) expect(box, edge).toMatchObject({ y: bottom - 300, height: 300 });
      if (edge.includes('s')) expect(box, edge).toMatchObject({ y: start.y, height: 300 });
      if (edge.includes('w')) expect(box, edge).toMatchObject({ x: right - 400, width: 400 });
      if (edge.includes('e')) expect(box, edge).toMatchObject({ x: start.x, width: 400 });
    }
  });

  test('at the edges of the area', () => {
    expect(clampResize({ ...start, width: 5000 }, 'e', AREA, METRICS)).toEqual({ ...start, width: AREA.width - start.x });
    expect(clampResize({ ...start, height: 5000 }, 's', AREA, METRICS)).toEqual({ ...start, height: AREA.height - start.y });
    expect(clampResize({ ...start, x: -100, width: 1320 }, 'w', AREA, METRICS)).toEqual({ ...start, x: 0, width: 1220 });
    expect(clampResize({ ...start, y: -100, height: 840 }, 'n', AREA, METRICS)).toEqual({ ...start, y: 0, height: 740 });
  });
});

describe('005-os-shell-FR-065: a maximized window fills the area, and follows it', () => {
  test('it fills the area, and a new area', () => {
    const state = run(desktop(), [{ type: 'toggleMaximize', view: 'cv' }, { type: 'areaResized', area: { width: 1100, height: 600 } }]);
    expect(state.windows[0]!.geometry).toEqual({ x: 0, y: 0, width: 1100, height: 600 });
    const restored = run(state, [{ type: 'toggleMaximize', view: 'cv' }]);
    expect(restored.windows[0]!.geometry.width).toBeLessThanOrEqual(1100);
    expect(restored.windows[0]!.geometry.height).toBeLessThanOrEqual(600);
  });
});
