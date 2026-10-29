// Window geometry (FR-005, FR-018): where windows open, in whole pixels,
// never larger than the desktop area.
import { describe, expect, test } from 'vitest';
import { clampMove, clampResize, fitToArea, placeWindow, revealMove } from '../src/index.ts';
import type { Edge, Geometry, WindowState } from '../src/index.ts';
import { APPS, AREA, METRICS, THREE_CONTEXT, desktop, run } from './helpers.ts';

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
const shown = (view: 'cv' | 'terminal' | 'about', geometry: Geometry): WindowState => ({ view, geometry, minimized: false, maximized: null, placement: 'set' });

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

  test('with the front window moved past the left edge, About still opens inside the area', () => {
    const cv: WindowState = { view: 'cv', geometry: { x: -800, y: 24, width: 1000, height: 716 }, minimized: false, maximized: null, placement: 'set' };
    expect(placeWindow('about', [cv], AREA, METRICS)).toEqual({ x: 96, y: 96, width: 560, height: 520 });
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

describe("006-terminal-FR-031: the Terminal opens where the design puts it", () => {
  const cv = shown('cv', { x: 220, y: 24, width: 1000, height: 716 });
  const whole = (box: Geometry) => Object.values(box).every(Number.isInteger);

  test('760 × 536 at 640, 144 in the 1440 × 764 area, in front of the CV at its first-load place', () => {
    const box = placeWindow('terminal', [cv], AREA, METRICS);
    // 640, 176 in the page, below the 32 px menu bar.
    expect(box).toEqual({ x: 640, y: 144, width: 760, height: 536 });
    expect(boxMeetsTitleBar(box, cv.geometry)).toBe(false);
  });

  test('centered in the area when no window is shown', () => {
    expect(placeWindow('terminal', [], AREA, METRICS)).toEqual({ x: 340, y: 114, width: 760, height: 536 });
  });

  test('with the CV minimized, none is shown, so it is centered', () => {
    expect(placeWindow('terminal', [{ ...cv, minimized: true }], AREA, METRICS)).toEqual({ x: 340, y: 114, width: 760, height: 536 });
  });

  test('with the CV maximized, 120 px below its top', () => {
    const maximized: WindowState = { ...cv, geometry: { x: 0, y: 0, width: 1440, height: 764 }, maximized: { restore: cv.geometry } };
    expect(placeWindow('terminal', [maximized], AREA, METRICS)).toEqual({ x: 640, y: 120, width: 760, height: 536 });
  });

  test('after About has cascaded, in front of About, with both title bars in view', () => {
    const about = shown('about', placeWindow('about', [cv], AREA, METRICS));
    expect(about.geometry).toEqual({ x: 268, y: 72, width: 560, height: 520 });
    const box = placeWindow('terminal', [about, cv], AREA, METRICS);
    expect(box).toEqual({ x: 640, y: 192, width: 760, height: 536 });
    for (const other of [about, cv]) expect(boxMeetsTitleBar(box, other.geometry)).toBe(false);
  });

  test('fitted to the 1024 × 504 area with at least 24 px below it, never below the minimum', () => {
    const area = { width: 1024, height: 504 };
    const small = shown('cv', placeWindow('cv', [], area, METRICS));
    const box = placeWindow('terminal', [small], area, METRICS);
    expect(box).toEqual({ x: 224, y: 144, width: 760, height: 336 });
    expect(box.y + box.height).toBeLessThanOrEqual(area.height - METRICS.firstTop);
    const alone = placeWindow('terminal', [], area, METRICS);
    expect(alone.y + alone.height).toBeLessThanOrEqual(area.height - METRICS.firstTop);
    // A front window low in the area: the minimum height holds, the box moves up.
    const low = placeWindow('terminal', [shown('cv', { x: 32, y: 300, width: 960, height: 204 })], area, METRICS);
    expect(low.height).toBe(METRICS.minHeight);
    expect(low.y + low.height).toBeLessThanOrEqual(area.height - METRICS.firstTop);
  });

  test('always whole pixels, inside the area, at least the minimum size', () => {
    for (const area of [AREA, { width: 1025, height: 505 }, { width: 1333, height: 777 }, { width: 2560, height: 1304 }, { width: 401, height: 301 }]) {
      for (const windows of [[], [shown('cv', placeWindow('cv', [], area, METRICS))]]) {
        const box = placeWindow('terminal', windows, area, METRICS);
        expect(whole(box), JSON.stringify({ area, box })).toBe(true);
        expect(box.x >= 0 && box.x + box.width <= area.width && box.y >= 0 && box.y + METRICS.titleBar <= area.height, JSON.stringify({ area, box })).toBe(true);
        expect(box.width).toBeGreaterThanOrEqual(Math.min(METRICS.minWidth, area.width));
        expect(box.height).toBeGreaterThanOrEqual(Math.min(METRICS.minHeight, area.height));
      }
    }
  });

  test('the reducer opens it there, focused, in front', () => {
    const state = run(desktop(AREA, THREE_CONTEXT), [{ type: 'open', view: 'terminal' }], THREE_CONTEXT);
    expect(state.windows.map((window) => window.view)).toEqual(['terminal', 'cv']);
    expect(state.windows[0]!.geometry).toEqual({ x: 640, y: 144, width: 760, height: 536 });
    expect(state.focused).toBe('terminal');
  });
});

describe('005-os-shell-FR-021: a window moves past the edges with its title bar kept on screen', () => {
  const start = { x: 220, y: 24, width: 1000, height: 716 };

  test('clampMove keeps the title bar between the menu bar and the dock, and 120 px of it on screen', () => {
    expect(clampMove({ ...start, x: -5000 }, AREA, METRICS).x).toBe(METRICS.grab - 1000);
    expect(clampMove({ ...start, x: 5000 }, AREA, METRICS).x).toBe(AREA.width - METRICS.grab);
    expect(clampMove({ ...start, x: -500 }, AREA, METRICS).x).toBe(-500);
    expect(clampMove({ ...start, x: 1000 }, AREA, METRICS).x).toBe(1000);
    expect(clampMove({ ...start, y: -50 }, AREA, METRICS).y).toBe(0);
    expect(clampMove({ ...start, y: 5000 }, AREA, METRICS).y).toBe(AREA.height - METRICS.titleBar);
    expect(clampMove({ ...start, x: 10.4, y: 20.6 }, AREA, METRICS)).toEqual({ ...start, x: 10, y: 21 });
  });

  test('a window narrower than the strip stays wholly on screen sideways', () => {
    const narrow = { x: 0, y: 0, width: 100, height: 300 };
    expect(clampMove({ ...narrow, x: -500 }, AREA, METRICS).x).toBe(0);
    expect(clampMove({ ...narrow, x: 5000 }, AREA, METRICS).x).toBe(AREA.width - 100);
  });

  test('fitToArea moves windows back only until 120 px of the title bar is on screen, and fits ones larger than the area', () => {
    const window: WindowState = { view: 'cv', geometry: { x: 1300, y: 600, width: 1000, height: 716 }, minimized: false, maximized: null, placement: 'set' };
    expect(fitToArea(window, { width: 1100, height: 500 }, METRICS).geometry).toEqual({ x: 980, y: 460, width: 1000, height: 500 });
    expect(fitToArea(window, { width: 900, height: 764 }, METRICS).geometry).toEqual({ x: 780, y: 600, width: 900, height: 716 });
    const inside: WindowState = { ...window, geometry: { x: 400, y: 24, width: 1000, height: 716 } };
    expect(fitToArea(inside, { width: 1100, height: 764 }, METRICS).geometry).toEqual(inside.geometry);
  });
});

describe('005-os-shell-FR-061: resizing stops at 400 × 300, at the size of the area and at the edges of the screen, keeping the opposite edge', () => {
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
      const box = clampResize(geometry, edge, AREA, METRICS, start);
      const right = start.x + start.width;
      const bottom = start.y + start.height;
      if (edge.includes('n')) expect(box, edge).toMatchObject({ y: bottom - 300, height: 300 });
      if (edge.includes('s')) expect(box, edge).toMatchObject({ y: start.y, height: 300 });
      if (edge.includes('w')) expect(box, edge).toMatchObject({ x: right - 400, width: 400 });
      if (edge.includes('e')) expect(box, edge).toMatchObject({ x: start.x, width: 400 });
    }
  });

  test('at the menu bar, the sides and the bottom of the screen, below the dock', () => {
    expect(clampResize({ ...start, width: 5000 }, 'e', AREA, METRICS, start)).toEqual({ ...start, width: AREA.width - start.x });
    expect(clampResize({ ...start, x: -100, width: 1320 }, 'w', AREA, METRICS, start)).toEqual({ ...start, x: 0, width: 1220 });
    expect(clampResize({ ...start, y: -100, height: 840 }, 'n', AREA, METRICS, start)).toEqual({ ...start, y: 0, height: 740 });
    // Never taller than the area: from y 24, the bottom stops 24 px behind the dock.
    expect(clampResize({ ...start, height: 5000 }, 's', AREA, METRICS, start)).toEqual({ ...start, height: AREA.height });
    const low = { x: 220, y: 400, width: 1000, height: 400 };
    expect(clampResize({ ...low, height: 5000 }, 's', AREA, METRICS, low)).toEqual({ ...low, height: AREA.height + METRICS.dockReserve - 400 });
  });

  test('an edge already past the edge of the screen stays where it was, and can come back', () => {
    const past = { x: 900, y: 500, width: 1000, height: 700 };
    expect(clampResize({ ...past, width: 1016, height: 716 }, 'se', AREA, METRICS, past)).toEqual(past);
    expect(clampResize({ ...past, width: 984, height: 684 }, 'se', AREA, METRICS, past)).toEqual({ ...past, width: 984, height: 684 });
    const left = { x: -400, y: 24, width: 1000, height: 716 };
    expect(clampResize({ ...left, x: -416, width: 1016 }, 'w', AREA, METRICS, left)).toEqual(left);
  });

  test("an edge stops where the title bar would leave its place, so the opposite edge stays", () => {
    // Past the left edge, the right edge stops 120 px into the screen.
    const left = { x: -500, y: 24, width: 700, height: 600 };
    expect(clampResize({ ...left, width: 550 }, 'e', AREA, METRICS, left)).toEqual({ ...left, width: 620 });
    // Past the right edge, the left edge stops 120 px from the screen's right.
    const right = { x: 1300, y: 24, width: 700, height: 600 };
    expect(clampResize({ ...right, x: 1400, width: 600 }, 'w', AREA, METRICS, right)).toEqual({ ...right, x: 1320, width: 680 });
    // Low on the screen, the top edge stops at the dock.
    const low = { x: 220, y: 600, width: 1000, height: 700 };
    expect(clampResize({ ...low, y: 740, height: 560 }, 'n', AREA, METRICS, low)).toEqual({ ...low, y: AREA.height - METRICS.titleBar, height: 576 });
  });
});

describe('005-os-shell-FR-067: a hidden focused element brings its window into view by the least move', () => {
  const window = { x: 700, y: 500, width: 1000, height: 716 };

  test('revealMove moves the least distance that brings the box inside', () => {
    // Behind the dock: 40 px below the area's bottom.
    expect(revealMove(window, { x: 760, y: 744, width: 200, height: 60 }, AREA, METRICS)).toEqual({ ...window, y: 460 });
    // Past the right edge.
    expect(revealMove(window, { x: 1400, y: 600, width: 100, height: 30 }, AREA, METRICS)).toEqual({ ...window, x: 640 });
    // Past the left edge.
    const left = { ...window, x: -400 };
    expect(revealMove(left, { x: -380, y: 600, width: 100, height: 30 }, AREA, METRICS)).toEqual({ ...left, x: -20 });
  });

  test('a box larger than the area shows its start, and one inside moves nothing', () => {
    expect(revealMove(window, { x: 720, y: 600, width: 100, height: 900 }, AREA, METRICS)).toEqual({ ...window, y: 0 });
    expect(revealMove(window, { x: 720, y: 600, width: 100, height: 30 }, AREA, METRICS)).toBe(window);
  });

  test('the move keeps the title bar between the menu bar and the dock', () => {
    const moved = revealMove(window, { x: 720, y: 5000, width: 100, height: 30 }, AREA, METRICS);
    expect(moved.y).toBe(0);
    expect(moved.width).toBe(window.width);
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
