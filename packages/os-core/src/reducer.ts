// The OS reducer (data-model.md Actions and transitions). Pure: it returns
// the next state, with the focus moves and announcements it causes appended
// to `effects` for the Os root to run, and never mutates its arguments. An
// action that doesn't apply returns `state` itself.
import { clampMove, clampResize, fitToArea, placeWindow } from './geometry.ts';
import type { Effect, FocusTarget, Geometry, OsAction, OsState, ReducerContext, ShellName, ViewId, WindowState } from './types.ts';

// A pattern with each `{key}` replaced, as the site's `fill` does.
const fill = (pattern: string, values: Record<string, string | number>) =>
  pattern.replace(/\{(\w+)\}/g, (match, key: string) => (Object.hasOwn(values, key) ? String(values[key]) : match));

function viewName(view: ViewId, context: ReducerContext): string {
  return view === 'about' ? context.text.aboutName : (context.apps.find((app) => app.id === view)?.name ?? view);
}

// Whether a view can show in a shell: About always, an app when it declares
// the shell (FR-003).
function supports(view: ViewId, shell: ShellName, context: ReducerContext): boolean {
  return view === 'about' || context.apps.some((app) => app.id === view && app.shells.includes(shell));
}

const focusOn = (target: FocusTarget): Effect => ({ kind: 'focus', target });

// The window moved to the front.
function raise(windows: readonly WindowState[], view: ViewId): WindowState[] {
  const window = windows.find((candidate) => candidate.view === view);
  return window === undefined ? [...windows] : [window, ...windows.filter((candidate) => candidate !== window)];
}

// The first shown window brought to the front and focused, or nothing
// focused when every window is closed or minimized.
function frontShown(windows: readonly WindowState[]): { windows: WindowState[]; focused: ViewId | null } {
  const shown = windows.find((window) => !window.minimized);
  return shown === undefined ? { windows: [...windows], focused: null } : { windows: raise(windows, shown.view), focused: shown.view };
}

// Where focus goes once `view` is closed or minimized (FR-023, FR-063): the
// new front window's title, or the app's dock item, or the site menu's
// title for About this site.
function focusAfterLeaving(view: ViewId, focused: ViewId | null): Effect {
  if (focused !== null) return focusOn({ kind: 'window-title', view: focused });
  return focusOn(view === 'about' ? { kind: 'site-menu' } : { kind: 'dock-item', app: view });
}

function update(windows: readonly WindowState[], view: ViewId, change: (window: WindowState) => WindowState): WindowState[] {
  return windows.map((window) => (window.view === view ? change(window) : window));
}

// A session ends when its window stops being the focused, restored one
// (data-model.md Invariants), keeping the geometry it reached.
function settle(state: OsState): OsState {
  const session = state.session;
  if (session === null) return state;
  const window = state.windows.find((candidate) => candidate.view === session.view);
  const holds = window !== undefined && state.focused === session.view && window.maximized === null && !window.minimized;
  return holds ? state : { ...state, session: null };
}

export function osReducer(state: OsState, action: OsAction, context: ReducerContext): OsState {
  const next = reduce(state, action, context);
  return next === state ? state : settle(next);
}

function reduce(state: OsState, action: OsAction, context: ReducerContext): OsState {
  const { metrics } = context;
  const area = state.area;
  const onDesktop = state.shell === 'desktop' && area !== null;
  const windowOf = (view: ViewId) => state.windows.find((window) => window.view === view);
  const withEffects = (...effects: Effect[]) => [...state.effects, ...effects];

  switch (action.type) {
    case 'hydrated': {
      if (state.shell !== 'both') return state;
      if (action.shell === 'mobile' || action.area === null) {
        // The phone starts on its home screen (FR-005).
        return { ...state, shell: 'mobile', area: null, windows: [], focused: null };
      }
      const measured = action.area;
      const windows = state.windows.map((window): WindowState =>
        window.placement === 'initial' ? { ...window, geometry: placeWindow(window.view, [], measured, metrics), placement: 'set' } : window,
      );
      return { ...state, shell: 'desktop', area: measured, windows };
    }

    case 'shellChanged': {
      if (state.shell === 'both' || state.shell === action.shell) return state;
      if (action.shell === 'mobile') {
        // The focused window's view opens full screen, or the home screen
        // shows; windows keep their flags for the way back (research R12).
        const open = state.focused !== null && supports(state.focused, 'mobile', context) ? state.focused : null;
        return {
          ...state,
          shell: 'mobile',
          mobile: { ...state.mobile, open, historyEntry: open !== null },
          effects: open === null ? state.effects : withEffects(focusOn({ kind: 'mobile-title', view: open })),
        };
      }
      const newArea = action.area ?? area;
      if (newArea === null || newArea === undefined) return state;
      const fitted = state.windows.map((window) => fitToArea(window, newArea, metrics));
      const open = state.mobile.open;
      const mobile = { ...state.mobile, open: null, historyEntry: false };
      if (open === null || !supports(open, 'desktop', context)) {
        // With no app open, the desktop is empty: shown windows close, and
        // minimized ones stay in the dock.
        return { ...state, shell: 'desktop', area: newArea, windows: fitted.filter((window) => window.minimized), focused: null, mobile };
      }
      const existing = fitted.find((window) => window.view === open);
      const windows = existing === undefined
        ? [{ view: open, geometry: placeWindow(open, fitted, newArea, metrics), minimized: false, maximized: null, placement: 'set' as const }, ...fitted]
        : raise(update(fitted, open, (window) => ({ ...window, minimized: false })), open);
      return { ...state, shell: 'desktop', area: newArea, windows, focused: open, mobile, effects: withEffects(focusOn({ kind: 'window-title', view: open })) };
    }

    case 'areaResized': {
      if (state.shell !== 'desktop' || (area !== null && area.width === action.area.width && area.height === action.area.height)) return state;
      return { ...state, area: action.area, windows: state.windows.map((window) => fitToArea(window, action.area, metrics)) };
    }

    case 'open': {
      if (!onDesktop || !supports(action.view, 'desktop', context)) return state;
      const existing = windowOf(action.view);
      const windows =
        existing === undefined
          ? [{ view: action.view, geometry: placeWindow(action.view, state.windows, area, metrics), minimized: false, maximized: null, placement: 'set' as const }, ...state.windows]
          : raise(update(state.windows, action.view, (window) => (window.minimized ? { ...window, minimized: false } : window)), action.view);
      return { ...state, windows, focused: action.view, effects: withEffects(focusOn({ kind: 'window-title', view: action.view })) };
    }

    case 'focus': {
      const window = windowOf(action.view);
      if (!onDesktop || window === undefined || window.minimized) return state;
      if (state.focused === action.view && state.windows[0] === window) return state;
      return { ...state, windows: raise(state.windows, action.view), focused: action.view };
    }

    case 'next': {
      if (!onDesktop) return state;
      const shown = state.windows.filter((window) => !window.minimized);
      if (shown.length === 0) return state;
      // The front window goes behind the others, so repeated presses visit
      // every shown window in turn (FR-026).
      const order = state.focused === null || shown.length === 1 ? shown : [...shown.slice(1), shown[0]!];
      const windows = [...order, ...state.windows.filter((window) => window.minimized)];
      const focused = windows[0]!.view;
      return { ...state, windows, focused, effects: withEffects(focusOn({ kind: 'window-title', view: focused })) };
    }

    case 'close': {
      if (!onDesktop || windowOf(action.view) === undefined) return state;
      const after = frontShown(state.windows.filter((window) => window.view !== action.view));
      return { ...state, ...after, effects: withEffects(focusAfterLeaving(action.view, after.focused)) };
    }

    case 'minimize': {
      const window = windowOf(action.view);
      if (!onDesktop || window === undefined || window.minimized) return state;
      const after = frontShown(update(state.windows, action.view, (current) => ({ ...current, minimized: true })));
      return { ...state, ...after, effects: withEffects(focusAfterLeaving(action.view, after.focused)) };
    }

    case 'toggleMaximize': {
      const window = windowOf(action.view);
      if (!onDesktop || window === undefined || window.minimized) return state;
      const name = viewName(action.view, context);
      if (window.maximized === null) {
        const windows = update(state.windows, action.view, (current) => ({
          ...current,
          geometry: { x: 0, y: 0, width: area.width, height: area.height },
          maximized: { restore: current.geometry },
        }));
        return { ...state, windows, effects: withEffects({ kind: 'announce', message: fill(context.text.maximized, { window: name }) }) };
      }
      const restore = window.maximized.restore;
      const windows = update(state.windows, action.view, (current) => fitToArea({ ...current, geometry: restore, maximized: null }, area, metrics));
      return { ...state, windows, effects: withEffects({ kind: 'announce', message: fill(context.text.restored, { window: name }) }) };
    }

    case 'dragMove': {
      const window = windowOf(action.view);
      if (!onDesktop || window === undefined || window.maximized !== null || window.minimized) return state;
      const geometry = clampMove({ ...window.geometry, x: action.x, y: action.y }, area, metrics);
      if (geometry.x === window.geometry.x && geometry.y === window.geometry.y) return state;
      return { ...state, windows: update(state.windows, action.view, (current) => ({ ...current, geometry })) };
    }

    case 'dragResize': {
      const window = windowOf(action.view);
      if (!onDesktop || window === undefined || window.maximized !== null || window.minimized) return state;
      const geometry = clampResize(action.geometry, action.edge, area, metrics);
      if (sameBox(geometry, window.geometry)) return state;
      return { ...state, windows: update(state.windows, action.view, (current) => ({ ...current, geometry })) };
    }

    case 'sessionStart': {
      const view = state.focused;
      const window = view === null ? undefined : windowOf(view);
      if (!onDesktop || view === null || window === undefined || window.maximized !== null) return state;
      if (state.session !== null && state.session.view === view && state.session.kind === action.kind) return state;
      return { ...state, session: { kind: action.kind, view, start: window.geometry }, effects: withEffects(focusOn({ kind: 'pad', view })) };
    }

    case 'sessionStep': {
      const session = state.session;
      const window = session === null ? undefined : windowOf(session.view);
      if (!onDesktop || session === null || window === undefined) return state;
      const { x, y, width, height } = window.geometry;
      const geometry =
        session.kind === 'move'
          ? clampMove({ x: x + action.dx, y: y + action.dy, width, height }, area, metrics)
          : clampResize({ x, y, width: width + action.dx, height: height + action.dy }, 'se', area, metrics);
      if (sameBox(geometry, window.geometry)) return state;
      return { ...state, windows: update(state.windows, session.view, (current) => ({ ...current, geometry })) };
    }

    case 'sessionEnd': {
      const session = state.session;
      const window = session === null ? undefined : windowOf(session.view);
      if (session === null || window === undefined) return state;
      const name = viewName(session.view, context);
      const { text } = context;
      // Cancelled, the window goes back where it started, fitted to the
      // area as it is now.
      const geometry = action.confirm || area === null ? (action.confirm ? window.geometry : session.start) : fitToArea({ ...window, geometry: session.start }, area, metrics).geometry;
      const message = action.confirm
        ? session.kind === 'move'
          ? fill(text.moved, { window: name })
          : fill(text.resized, { window: name, width: geometry.width, height: geometry.height })
        : session.kind === 'move'
          ? text.moveCancelled
          : text.resizeCancelled;
      return {
        ...state,
        session: null,
        windows: update(state.windows, session.view, (current) => ({ ...current, geometry })),
        effects: withEffects({ kind: 'announce', message }, focusOn({ kind: 'window-title', view: session.view })),
      };
    }

    case 'mobileOpen': {
      if (state.shell !== 'mobile' || !supports(action.view, 'mobile', context)) return state;
      if (state.mobile.open === action.view) return state;
      return {
        ...state,
        mobile: { ...state.mobile, open: action.view, historyEntry: true },
        effects: withEffects(focusOn({ kind: 'mobile-title', view: action.view })),
      };
    }

    case 'mobileHome': {
      const open = state.mobile.open;
      if (open === null) return state;
      return {
        ...state,
        mobile: { open: null, scroll: { ...state.mobile.scroll, [open]: action.scrollTop }, historyEntry: false },
        effects: withEffects(focusOn({ kind: 'home-icon', view: open })),
      };
    }

    case 'effectsDone':
      return state.effects.length === 0 ? state : { ...state, effects: [] };

    default:
      return state;
  }
}

function sameBox(a: Geometry, b: Geometry): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}
