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
