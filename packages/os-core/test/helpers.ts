// Shared fixtures and checks for os-core's tests (plan, Dependencies: core
// test helpers). Design values are written here as plain numbers, as
// data-model.md's Metrics table gives them: tests may hold literals.
import { initialState, osReducer } from '../src/index.ts';
import type { AppDeclaration, Metrics, OsAction, OsState, OsText, ReducerContext } from '../src/index.ts';

export const METRICS: Metrics = {
  desktopMinWidth: 1024,
  desktopMinHeight: 640,
  menuBar: 32,
  dockReserve: 104,
  titleBar: 40,
  grab: 120,
  cvWidth: 1000,
  aboutWidth: 560,
  aboutHeight: 520,
  minWidth: 400,
  minHeight: 300,
  firstTop: 24,
  sideMargin: 32,
  bottomMargin: 48,
  cascade: 48,
  step: 16,
  bigStep: 64,
  motionMs: 150,
  terminalWidth: 760,
  terminalHeight: 536,
  terminalMargin: 40,
  terminalOffset: 120,
  playgroundWidth: 1040,
  playgroundHeight: 648,
  playgroundMargin: 40,
  playgroundOffset: 64,
};

export const TEXT: OsText = {
  aboutName: 'About this site',
  moved: '{window} moved.',
  moveCancelled: 'Move cancelled.',
  resized: '{window} resized to {width} by {height}.',
  resizeCancelled: 'Resize cancelled.',
  maximized: '{window} maximized.',
  restored: '{window} restored.',
};

const Stub = () => null;

export const APPS: AppDeclaration[] = [{ id: 'cv', name: 'CV', shells: ['desktop', 'mobile'], needsNetwork: false, Icon: Stub, Content: Stub }];

export const CONTEXT: ReducerContext = { apps: APPS, metrics: METRICS, text: TEXT };

// Three views (006): the CV and the Terminal as apps, and About this site.
export const THREE_APPS: AppDeclaration[] = [...APPS, { id: 'terminal', name: 'Terminal', shells: ['desktop', 'mobile'], needsNetwork: false, Icon: Stub, Content: Stub }];

export const THREE_CONTEXT: ReducerContext = { apps: THREE_APPS, metrics: METRICS, text: TEXT };

// The desktop area at 1440 × 900: the viewport minus the menu bar and the
// dock's space.
export const AREA = { width: 1440, height: 764 };

export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// The state after hydrating on a desktop with the given area.
export function desktop(area = AREA, context: ReducerContext = CONTEXT): OsState {
  return run(initialState(context.apps, METRICS), [{ type: 'hydrated', shell: 'desktop', area }], context);
}

export function mobile(context: ReducerContext = CONTEXT): OsState {
  return run(initialState(context.apps, METRICS), [{ type: 'hydrated', shell: 'mobile', area: null }], context);
}

// Applies the actions one by one to frozen states, checking every invariant
// after each.
export function run(state: OsState, actions: OsAction[], context: ReducerContext = CONTEXT): OsState {
  let current = deepFreeze(state);
  assertInvariants(current, context.metrics, context.apps);
  for (const action of actions) {
    current = deepFreeze(osReducer(current, action, context));
    try {
      assertInvariants(current, context.metrics, context.apps);
    } catch (error) {
      throw new Error(`after ${JSON.stringify(action)}: ${(error as Error).message}`, { cause: error });
    }
  }
  return current;
}

function check(holds: boolean, invariant: string, state: OsState): void {
  if (!holds) throw new Error(`invariant broken: ${invariant}\n${JSON.stringify({ ...state, effects: undefined })}`);
}

// Every row of data-model.md's Invariants table, naming the one that fails.
export function assertInvariants(state: OsState, metrics: Metrics, apps: readonly AppDeclaration[] = APPS): void {
  const views = state.windows.map((window) => window.view);
  check(new Set(views).size === views.length, 'at most one window per view (FR-012)', state);
  if (state.focused !== null) {
    const front = state.windows[0];
    check(front !== undefined && front.view === state.focused && !front.minimized, 'focused is windows[0], not minimized (FR-017)', state);
  }
  const area = state.area;
  if (area !== null) {
    for (const window of state.windows) {
      if (window.placement === 'initial') continue;
      const { x, y, width, height } = window.geometry;
      check([x, y, width, height].every(Number.isInteger), `${window.view}'s geometry is whole pixels`, state);
      if (window.maximized !== null) {
        check(x === 0 && y === 0 && width === area.width && height === area.height, `${window.view} maximized fills the area (FR-065)`, state);
        continue;
      }
      const grab = Math.min(metrics.grab, width);
      check(x + width >= grab && x <= area.width - grab && y >= 0 && y + metrics.titleBar <= area.height, `${window.view}'s title bar is placed as FR-021 sets`, state);
      check(width <= area.width && height <= area.height, `${window.view} is no larger than the area (FR-061)`, state);
      check(width >= Math.min(metrics.minWidth, area.width) && height >= Math.min(metrics.minHeight, area.height), `${window.view} is at least the minimum size (FR-061)`, state);
    }
  }
  if (state.session !== null) {
    const window = state.windows.find((candidate) => candidate.view === state.session!.view);
    check(state.focused === state.session.view && window !== undefined && window.maximized === null && !window.minimized, 'session names a focused, non-maximized window (FR-027, FR-062, FR-065)', state);
  }
  if (state.mobile.open !== null) {
    const open = state.mobile.open;
    check(open === 'about' || state.mobile.open === null || apps.some((app) => app.id === open && app.shells.includes('mobile')), 'the full-screen view supports mobile (FR-003)', state);
  }
}
