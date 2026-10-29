// The OS state's invariants (data-model.md Invariants) hold after every
// action: on named scenarios, and on generated sequences from a seeded
// generator, so every run checks the same sequences.
import { describe, expect, test } from 'vitest';
import { initialState } from '../src/index.ts';
import type { Area, Edge, OsAction, OsState, ViewId } from '../src/index.ts';
import { APPS, CONTEXT, METRICS, THREE_APPS, THREE_CONTEXT, desktop, run } from './helpers.ts';

// Mulberry32: a small seeded pseudo-random generator.
function generator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

const VIEWS: ViewId[] = ['cv', 'about'];
const THREE_VIEWS: ViewId[] = ['cv', 'terminal', 'about'];
const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

function randomAction(random: () => number, state: OsState, views: readonly ViewId[] = VIEWS): OsAction {
  const pick = <T,>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
  const view = pick(views);
  const number = (low: number, high: number) => Math.round(low + random() * (high - low));
  const area = state.area ?? { width: 1440, height: 764 };
  switch (number(0, 15)) {
    case 0:
      return { type: 'open', view };
    case 1:
      return { type: 'focus', view };
    case 2:
      return { type: 'next' };
    case 3:
      return { type: 'close', view };
    case 4:
      return { type: 'minimize', view };
    case 5:
      return { type: 'toggleMaximize', view };
    case 6:
      return { type: 'dragMove', view, x: number(-500, area.width + 500), y: number(-500, area.height + 500) };
    case 7: {
      const geometry = { x: number(-200, area.width), y: number(-200, area.height), width: number(-50, 3000), height: number(-50, 2000) };
      // A drag starts from where the window is.
      return { type: 'dragResize', view, edge: pick(EDGES), geometry, from: state.windows.find((window) => window.view === view)?.geometry ?? geometry };
    }
    case 8:
      return { type: 'sessionStart', kind: pick(['move', 'resize'] as const) };
    case 9:
      return { type: 'sessionStep', dx: pick([-64, -16, 0, 16, 64]), dy: pick([-64, -16, 0, 16, 64]) };
    case 10:
      return { type: 'sessionEnd', confirm: random() < 0.5 };
    case 11:
      return { type: 'areaResized', area: { width: number(400, 2560), height: number(300, 1336) } };
    case 12:
      return { type: 'effectsDone' };
    case 13:
      return { type: 'shellChanged', shell: pick(['desktop', 'mobile'] as const), area: { width: number(1024, 2560), height: number(504, 1336) } };
    case 14:
      return { type: 'mobileOpen', view };
    default:
      return { type: 'mobileHome', scrollTop: number(0, 5000) };
  }
}

describe('005-os-shell-FR-017: one focused window, in front, and every other invariant, after any actions', () => {
  test('named scenarios keep every invariant at each step', () => {
    const steps: OsAction[] = [
      { type: 'open', view: 'about' },
      { type: 'dragMove', view: 'about', x: 2000, y: 2000 },
      { type: 'toggleMaximize', view: 'cv' },
      { type: 'focus', view: 'cv' },
      { type: 'toggleMaximize', view: 'cv' },
      { type: 'minimize', view: 'cv' },
      { type: 'next' },
      { type: 'sessionStart', kind: 'resize' },
      { type: 'sessionStep', dx: -64, dy: -64 },
      { type: 'areaResized', area: { width: 400, height: 300 } },
      { type: 'sessionEnd', confirm: true },
      { type: 'areaResized', area: { width: 2560, height: 1336 } },
      { type: 'open', view: 'cv' },
      { type: 'shellChanged', shell: 'mobile' },
      { type: 'mobileHome', scrollTop: 120 },
      { type: 'shellChanged', shell: 'desktop', area: { width: 1024, height: 504 } },
      { type: 'close', view: 'about' },
      { type: 'close', view: 'cv' },
    ];
    const state = run(desktop(), steps);
    expect(state.focused === null || state.windows[0]!.view === state.focused).toBe(true);
  });

  test('500 generated sequences of 40 actions, at areas from 400 × 300 to 2560 × 1336, keep every invariant', () => {
    const random = generator(20261027);
    for (let sequence = 0; sequence < 500; sequence += 1) {
      const width = Math.round(400 + random() * 2160);
      const height = Math.round(300 + random() * 1036);
      const area: Area = { width, height };
      let state = run(initialState(APPS, METRICS), [{ type: 'hydrated', shell: random() < 0.8 ? 'desktop' : 'mobile', area }]);
      const actions: OsAction[] = [];
      for (let step = 0; step < 40; step += 1) {
        const action = randomAction(random, state);
        actions.push(action);
        try {
          state = run(state, [action], CONTEXT);
        } catch (error) {
          throw new Error(`sequence ${sequence} at ${width} × ${height}, step ${step}: ${(error as Error).message}\nactions: ${JSON.stringify(actions)}`, { cause: error });
        }
      }
    }
  });
});

describe('006-terminal-FR-003: the invariants hold with three views, as with two', () => {
  test('500 generated sequences of 40 actions over the CV, the Terminal and About keep every invariant', () => {
    const random = generator(20261028);
    for (let sequence = 0; sequence < 500; sequence += 1) {
      const area: Area = { width: Math.round(400 + random() * 2160), height: Math.round(300 + random() * 1036) };
      let state = run(initialState(THREE_APPS, METRICS), [{ type: 'hydrated', shell: random() < 0.8 ? 'desktop' : 'mobile', area }], THREE_CONTEXT);
      const actions: OsAction[] = [];
      for (let step = 0; step < 40; step += 1) {
        const action = randomAction(random, state, THREE_VIEWS);
        actions.push(action);
        try {
          state = run(state, [action], THREE_CONTEXT);
        } catch (error) {
          throw new Error(`sequence ${sequence}, step ${step}: ${(error as Error).message}\nactions: ${JSON.stringify(actions)}`, { cause: error });
        }
      }
    }
  });

  test('a named scenario with all three windows keeps every invariant', () => {
    const state = run(
      desktop(undefined, THREE_CONTEXT),
      [
        { type: 'open', view: 'terminal' },
        { type: 'open', view: 'about' },
        { type: 'toggleMaximize', view: 'terminal' },
        { type: 'next' },
        { type: 'minimize', view: 'cv' },
        { type: 'areaResized', area: { width: 1024, height: 504 } },
        { type: 'open', view: 'cv' },
        { type: 'close', view: 'terminal' },
        { type: 'open', view: 'terminal' },
      ],
      THREE_CONTEXT,
    );
    expect(state.windows.map((window) => window.view).sort()).toEqual(['about', 'cv', 'terminal']);
    expect(state.focused).toBe('terminal');
  });
});
