// The OS reducer (data-model.md Actions and transitions). Every case runs on
// frozen states and checks every invariant after each action (helpers.ts).
import { describe, expect, test } from 'vitest';
import { initialState } from '../src/index.ts';
import { APPS, AREA, METRICS, desktop, mobile, run } from './helpers.ts';

describe('005-os-shell-FR-005: the CV window is open and focused on first load, and the phone starts on its home screen', () => {
  test('initialState has the CV window open, placed by CSS until measured, focused, with no effect', () => {
    const state = initialState(APPS, METRICS);
    expect(state.shell).toBe('both');
    expect(state.windows).toEqual([{ view: 'cv', geometry: { x: 0, y: 0, width: 0, height: 0 }, minimized: false, maximized: null, placement: 'initial' }]);
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([]);
    expect(state.mobile).toEqual({ open: null, scroll: {}, historyEntry: false });
  });

  test('hydrated on the desktop sets the measured box and moves no focus', () => {
    const state = desktop();
    expect(state.shell).toBe('desktop');
    expect(state.area).toEqual(AREA);
    expect(state.windows).toEqual([{ view: 'cv', geometry: { x: 220, y: 24, width: 1000, height: 716 }, minimized: false, maximized: null, placement: 'set' }]);
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([]);
  });

  test('hydrated on a phone closes the CV window and opens nothing', () => {
    const state = mobile();
    expect(state.shell).toBe('mobile');
    expect(state.windows).toEqual([]);
    expect(state.focused).toBeNull();
    expect(state.mobile.open).toBeNull();
    expect(state.effects).toEqual([]);
  });
});

describe('005-os-shell-FR-012: an app has at most one window', () => {
  test('open on a closed view adds it in front, focused, and focuses its title', () => {
    const state = run(desktop(), [{ type: 'close', view: 'cv' }, { type: 'effectsDone' }, { type: 'open', view: 'cv' }]);
    expect(state.windows.map((window) => window.view)).toEqual(['cv']);
    expect(state.windows[0]!.geometry).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'window-title', view: 'cv' } }]);
  });

  test('open on an open view brings it to the front, never a second window', () => {
    const state = run(desktop(), [{ type: 'open', view: 'about' }, { type: 'open', view: 'cv' }, { type: 'open', view: 'cv' }, { type: 'open', view: 'cv' }]);
    expect(state.windows.map((window) => window.view)).toEqual(['cv', 'about']);
    expect(state.focused).toBe('cv');
  });

  test('open before the desktop is measured, or on a phone, changes nothing', () => {
    const before = initialState(APPS, METRICS);
    expect(run(before, [{ type: 'open', view: 'about' }])).toBe(before);
    const phone = mobile();
    expect(run(phone, [{ type: 'open', view: 'cv' }])).toBe(phone);
  });
});

describe('005-os-shell-FR-023: closing a window removes it and moves focus', () => {
  test('closing the last window, the CV, focuses its dock item', () => {
    const state = run(desktop(), [{ type: 'close', view: 'cv' }]);
    expect(state.windows).toEqual([]);
    expect(state.focused).toBeNull();
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'dock-item', app: 'cv' } }]);
  });

  test('closing a window that is not open changes nothing', () => {
    const state = run(desktop(), [{ type: 'close', view: 'cv' }, { type: 'effectsDone' }]);
    expect(run(state, [{ type: 'close', view: 'cv' }])).toBe(state);
  });
});

describe('005-os-shell-FR-032 005-os-shell-FR-040: a tap opens an app full screen and focuses its title', () => {
  test('mobileOpen opens the view, records the history entry and focuses the title', () => {
    const state = run(mobile(), [{ type: 'mobileOpen', view: 'cv' }]);
    expect(state.mobile).toEqual({ open: 'cv', scroll: {}, historyEntry: true });
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'mobile-title', view: 'cv' } }]);
  });

  test('mobileOpen on the desktop changes nothing', () => {
    const state = desktop();
    expect(run(state, [{ type: 'mobileOpen', view: 'cv' }])).toBe(state);
  });
});

// Two windows at 1440 × 900: About in front of the CV.
const twoWindows = () => run(desktop(), [{ type: 'open', view: 'about' }, { type: 'effectsDone' }]);

describe('005-os-shell-FR-017: one window is focused, in front', () => {
  test('focus brings a window to the front and focuses it, with no focus move of its own', () => {
    const state = run(twoWindows(), [{ type: 'focus', view: 'cv' }]);
    expect(state.windows.map((window) => window.view)).toEqual(['cv', 'about']);
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([]);
  });

  test('focus on the window already in front changes nothing', () => {
    const state = twoWindows();
    expect(run(state, [{ type: 'focus', view: 'about' }])).toBe(state);
  });
});

describe('005-os-shell-FR-023: closing a window moves focus to what is left', () => {
  test("closing the front of two windows focuses the other's title", () => {
    const state = run(twoWindows(), [{ type: 'close', view: 'about' }]);
    expect(state.windows.map((window) => window.view)).toEqual(['cv']);
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'window-title', view: 'cv' } }]);
  });

  test('closing About as the last window focuses the site menu', () => {
    const state = run(twoWindows(), [{ type: 'close', view: 'cv' }, { type: 'effectsDone' }, { type: 'close', view: 'about' }]);
    expect(state.windows).toEqual([]);
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'site-menu' } }]);
  });
});

describe('005-os-shell-FR-026: Next window cycles through the shown windows', () => {
  test('next alternates two windows, bringing each to the front', () => {
    let state = twoWindows();
    state = run(state, [{ type: 'next' }]);
    expect(state.focused).toBe('cv');
    expect(state.effects.at(-1)).toEqual({ kind: 'focus', target: { kind: 'window-title', view: 'cv' } });
    state = run(state, [{ type: 'effectsDone' }, { type: 'next' }]);
    expect(state.focused).toBe('about');
    expect(state.windows[0]!.view).toBe('about');
  });

  test('next skips minimized windows', () => {
    const state = run(twoWindows(), [{ type: 'minimize', view: 'cv' }, { type: 'effectsDone' }, { type: 'next' }, { type: 'next' }]);
    expect(state.focused).toBe('about');
    expect(state.windows.find((window) => window.view === 'cv')!.minimized).toBe(true);
  });
});

describe('005-os-shell-FR-063: minimizing keeps the app open and moves focus on', () => {
  test('minimizing the front window focuses the new front window', () => {
    const state = run(twoWindows(), [{ type: 'minimize', view: 'about' }]);
    expect(state.windows.map((window) => [window.view, window.minimized])).toEqual([
      ['cv', false],
      ['about', true],
    ]);
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'window-title', view: 'cv' } }]);
  });

  test("minimizing the CV with none left shown focuses its dock item; About, the site menu's title", () => {
    const cv = run(desktop(), [{ type: 'minimize', view: 'cv' }]);
    expect(cv.focused).toBeNull();
    expect(cv.windows).toHaveLength(1);
    expect(cv.effects).toEqual([{ kind: 'focus', target: { kind: 'dock-item', app: 'cv' } }]);
    const about = run(twoWindows(), [{ type: 'close', view: 'cv' }, { type: 'effectsDone' }, { type: 'minimize', view: 'about' }]);
    expect(about.effects).toEqual([{ kind: 'focus', target: { kind: 'site-menu' } }]);
  });
});

describe('005-os-shell-FR-064: a minimized window comes back as it was', () => {
  test('open restores it at its geometry, in front and focused', () => {
    const before = twoWindows();
    const geometry = before.windows.find((window) => window.view === 'cv')!.geometry;
    const state = run(before, [{ type: 'minimize', view: 'cv' }, { type: 'effectsDone' }, { type: 'open', view: 'cv' }]);
    expect(state.windows[0]).toMatchObject({ view: 'cv', minimized: false, geometry });
    expect(state.focused).toBe('cv');
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'window-title', view: 'cv' } }]);
  });

  test('a maximized window minimized comes back maximized', () => {
    const state = run(desktop(), [{ type: 'toggleMaximize', view: 'cv' }, { type: 'minimize', view: 'cv' }, { type: 'open', view: 'cv' }]);
    expect(state.windows[0]!.maximized).not.toBeNull();
    expect(state.windows[0]!.geometry).toEqual({ x: 0, y: 0, ...AREA });
  });
});

describe('005-os-shell-FR-065: maximize fills the area and restore brings the box back', () => {
  test('toggleMaximize saves the box, fills the area and announces it, then restores and announces that', () => {
    const start = desktop();
    const box = start.windows[0]!.geometry;
    const maximized = run(start, [{ type: 'toggleMaximize', view: 'cv' }]);
    expect(maximized.windows[0]).toMatchObject({ geometry: { x: 0, y: 0, ...AREA }, maximized: { restore: box } });
    expect(maximized.effects).toEqual([{ kind: 'announce', message: 'CV maximized.' }]);
    const restored = run(maximized, [{ type: 'effectsDone' }, { type: 'toggleMaximize', view: 'cv' }]);
    expect(restored.windows[0]).toMatchObject({ geometry: box, maximized: null });
    expect(restored.effects).toEqual([{ kind: 'announce', message: 'CV restored.' }]);
  });

  test('moves, resizes and sessions are ignored while maximized', () => {
    const maximized = run(desktop(), [{ type: 'toggleMaximize', view: 'cv' }, { type: 'effectsDone' }]);
    expect(run(maximized, [{ type: 'dragMove', view: 'cv', x: 10, y: 10 }])).toBe(maximized);
    expect(run(maximized, [{ type: 'dragResize', view: 'cv', edge: 'se', geometry: { x: 0, y: 0, width: 500, height: 400 }, from: { x: 0, y: 0, width: 500, height: 400 } }])).toBe(maximized);
    expect(run(maximized, [{ type: 'sessionStart', kind: 'move' }])).toBe(maximized);
    expect(run(maximized, [{ type: 'sessionStart', kind: 'resize' }])).toBe(maximized);
  });
});

describe('005-os-shell-FR-020 005-os-shell-FR-027 005-os-shell-FR-062: keyboard and pad moves and resizes', () => {
  test('a move session steps by step and big step, clamps, and confirms with an announcement', () => {
    let state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }]);
    expect(state.session).toEqual({ kind: 'move', view: 'cv', start: { x: 220, y: 24, width: 1000, height: 716 }, from: { x: 220, y: 24, width: 1000, height: 716 } });
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'pad', view: 'cv' } }]);
    state = run(state, [{ type: 'effectsDone' }, { type: 'sessionStep', dx: 16, dy: 0 }, { type: 'sessionStep', dx: 0, dy: 64 }]);
    expect(state.windows[0]!.geometry).toMatchObject({ x: 236, y: 88 });
    // Past the right edge, it stops with 120 px of the title bar on screen (FR-021).
    state = run(state, Array.from({ length: 20 }, () => ({ type: 'sessionStep' as const, dx: 64, dy: 0 })));
    expect(state.windows[0]!.geometry.x).toBe(AREA.width - METRICS.grab);
    state = run(state, [{ type: 'sessionEnd', confirm: true }]);
    expect(state.session).toBeNull();
    expect(state.windows[0]!.geometry).toMatchObject({ x: 1320, y: 88 });
    expect(state.effects).toEqual([
      { kind: 'announce', message: 'CV moved.' },
      { kind: 'focus', target: { kind: 'window-title', view: 'cv' } },
    ]);
  });

  test('a cancelled move goes back to where it started', () => {
    const state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }, { type: 'sessionStep', dx: 64, dy: 64 }, { type: 'effectsDone' }, { type: 'sessionEnd', confirm: false }]);
    expect(state.windows[0]!.geometry).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
    expect(state.effects).toEqual([
      { kind: 'announce', message: 'Move cancelled.' },
      { kind: 'focus', target: { kind: 'window-title', view: 'cv' } },
    ]);
  });

  test('a resize session resizes from the top-left corner, stops at the minimum, and announces the size', () => {
    let state = run(desktop(), [{ type: 'sessionStart', kind: 'resize' }, { type: 'sessionStep', dx: -64, dy: -16 }]);
    expect(state.windows[0]!.geometry).toEqual({ x: 220, y: 24, width: 936, height: 700 });
    state = run(state, Array.from({ length: 20 }, () => ({ type: 'sessionStep' as const, dx: -64, dy: -64 })));
    expect(state.windows[0]!.geometry).toEqual({ x: 220, y: 24, width: 400, height: 300 });
    state = run(state, [{ type: 'effectsDone' }, { type: 'sessionEnd', confirm: true }]);
    expect(state.effects).toEqual([
      { kind: 'announce', message: 'CV resized to 400 by 300.' },
      { kind: 'focus', target: { kind: 'window-title', view: 'cv' } },
    ]);
  });

  test('a cancelled resize goes back to the starting size', () => {
    const state = run(desktop(), [{ type: 'sessionStart', kind: 'resize' }, { type: 'sessionStep', dx: -64, dy: -64 }, { type: 'effectsDone' }, { type: 'sessionEnd', confirm: false }]);
    expect(state.windows[0]!.geometry).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
    expect(state.effects[0]).toEqual({ kind: 'announce', message: 'Resize cancelled.' });
  });

  test('switching from a move to a resize keeps the start, so a cancel goes back before the move', () => {
    const state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }, { type: 'sessionStep', dx: 64, dy: 64 }, { type: 'sessionStart', kind: 'resize' }, { type: 'effectsDone' }, { type: 'sessionEnd', confirm: false }]);
    expect(state.windows[0]!.geometry).toEqual({ x: 220, y: 24, width: 1000, height: 716 });
  });

  test('an edge past the bottom of the screen can come back within one drag', () => {
    const before = run(desktop(), [{ type: 'dragMove', view: 'cv', x: 220, y: 384 }]).windows[0]!.geometry;
    expect(before.y + before.height).toBe(1100);
    const state = run(desktop(), [
      { type: 'dragMove', view: 'cv', x: 220, y: 384 },
      { type: 'dragResize', view: 'cv', edge: 's', geometry: { ...before, height: 316 }, from: before },
      { type: 'dragResize', view: 'cv', edge: 's', geometry: before, from: before },
    ]);
    expect(state.windows[0]!.geometry).toEqual(before);
  });

  test('a resize after a move past the bottom can come back to where the move left it', () => {
    let state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }, ...Array.from({ length: 6 }, () => ({ type: 'sessionStep' as const, dx: 0, dy: 64 })), { type: 'sessionStart', kind: 'resize' }]);
    const moved = state.windows[0]!.geometry;
    expect(moved).toEqual({ x: 220, y: 408, width: 1000, height: 716 });
    state = run(state, [{ type: 'sessionStep', dx: 0, dy: -64 }, { type: 'sessionStep', dx: 0, dy: 64 }]);
    expect(state.windows[0]!.geometry).toEqual(moved);
  });

  test('a resize past the left edge keeps the left edge, and 120 px of the title bar on screen', () => {
    const state = run(desktop(), [{ type: 'dragMove', view: 'cv', x: -500, y: 24 }, { type: 'sessionStart', kind: 'resize' }, ...Array.from({ length: 10 }, () => ({ type: 'sessionStep' as const, dx: -64, dy: 0 }))]);
    expect(state.windows[0]!.geometry).toEqual({ x: -500, y: 24, width: 620, height: 716 });
  });

  test('maximizing during a session ends it and moves focus from the pad to the title', () => {
    const state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }, { type: 'effectsDone' }, { type: 'toggleMaximize', view: 'cv' }]);
    expect(state.session).toBeNull();
    expect(state.effects).toEqual([
      { kind: 'announce', message: 'CV maximized.' },
      { kind: 'focus', target: { kind: 'window-title', view: 'cv' } },
    ]);
  });

  test('changing to the phone ends a session', () => {
    const state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }, { type: 'shellChanged', shell: 'mobile' }, { type: 'effectsDone' }, { type: 'shellChanged', shell: 'desktop', area: AREA }]);
    expect(state.session).toBeNull();
  });
});

describe('effects', () => {
  test('effectsDone with a count leaves the effects appended after them', () => {
    const state = run(desktop(), [{ type: 'sessionStart', kind: 'move' }, { type: 'sessionEnd', confirm: true }, { type: 'effectsDone', count: 1 }]);
    expect(state.effects).toEqual([
      { kind: 'announce', message: 'CV moved.' },
      { kind: 'focus', target: { kind: 'window-title', view: 'cv' } },
    ]);
  });
});

describe('005-os-shell-FR-034: going home keeps the place in the app', () => {
  test('mobileHome saves the scroll position, closes the view, uses up the entry and focuses its icon', () => {
    const state = run(mobile(), [{ type: 'mobileOpen', view: 'cv' }, { type: 'effectsDone' }, { type: 'mobileHome', scrollTop: 1234 }]);
    expect(state.mobile).toEqual({ open: null, scroll: { cv: 1234 }, historyEntry: false });
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'home-icon', view: 'cv' } }]);
  });

  test('mobileHome with no app open changes nothing', () => {
    const state = mobile();
    expect(run(state, [{ type: 'mobileHome', scrollTop: 10 }])).toBe(state);
  });
});

describe('005-os-shell-FR-002: the shell changes while the site is open, keeping what is open', () => {
  test("to the phone, the focused window's view opens full screen and its title takes focus, and windows keep their flags", () => {
    const state = run(desktop(), [{ type: 'open', view: 'about' }, { type: 'toggleMaximize', view: 'about' }, { type: 'effectsDone' }, { type: 'shellChanged', shell: 'mobile' }]);
    expect(state.shell).toBe('mobile');
    expect(state.mobile.open).toBe('about');
    expect(state.mobile.historyEntry).toBe(true);
    expect(state.windows.find((window) => window.view === 'about')!.maximized).not.toBeNull();
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'mobile-title', view: 'about' } }]);
  });

  test('to the phone with no window shown, the home screen shows', () => {
    const state = run(desktop(), [{ type: 'minimize', view: 'cv' }, { type: 'effectsDone' }, { type: 'shellChanged', shell: 'mobile' }]);
    expect(state.mobile.open).toBeNull();
    expect(state.windows[0]!.minimized).toBe(true);
    expect(state.effects).toEqual([]);
  });

  test("to the desktop, the full-screen view's window comes forward, opened by placeWindow if needed, and its title takes focus", () => {
    const state = run(mobile(), [{ type: 'mobileOpen', view: 'cv' }, { type: 'effectsDone' }, { type: 'shellChanged', shell: 'desktop', area: AREA }]);
    expect(state.shell).toBe('desktop');
    expect(state.windows).toEqual([{ view: 'cv', geometry: { x: 220, y: 24, width: 1000, height: 716 }, minimized: false, maximized: null, placement: 'set' }]);
    expect(state.focused).toBe('cv');
    expect(state.mobile).toMatchObject({ open: null, historyEntry: false });
    expect(state.effects).toEqual([{ kind: 'focus', target: { kind: 'window-title', view: 'cv' } }]);
  });

  test('to the desktop, a minimized window of the open view comes back where it was', () => {
    const before = desktop();
    const state = run(before, [{ type: 'shellChanged', shell: 'mobile' }, { type: 'effectsDone' }, { type: 'shellChanged', shell: 'desktop', area: AREA }]);
    expect(state.windows[0]).toEqual(before.windows[0]);
    expect(state.focused).toBe('cv');
  });

  test('to the desktop with nothing open, the desktop is empty', () => {
    const state = run(mobile(), [{ type: 'shellChanged', shell: 'desktop', area: AREA }]);
    expect(state.windows).toEqual([]);
    expect(state.focused).toBeNull();
    expect(state.effects).toEqual([]);
  });
});

describe('005-os-shell-FR-067: reveal moves a window to show a hidden focused element', () => {
  test('it moves a shown window, and ignores a maximized or minimized one', () => {
    const low = run(desktop(), [{ type: 'dragMove', view: 'cv', x: 220, y: 600 }]);
    const box = { x: 300, y: 744, width: 100, height: 40 };
    expect(run(low, [{ type: 'reveal', view: 'cv', box }]).windows[0]!.geometry).toMatchObject({ x: 220, y: 580 });
    const maximized = run(low, [{ type: 'toggleMaximize', view: 'cv' }, { type: 'effectsDone' }]);
    expect(run(maximized, [{ type: 'reveal', view: 'cv', box }])).toBe(maximized);
    const minimized = run(low, [{ type: 'minimize', view: 'cv' }, { type: 'effectsDone' }]);
    expect(run(minimized, [{ type: 'reveal', view: 'cv', box }])).toBe(minimized);
  });
});
