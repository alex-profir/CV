// The shell's types (005 data-model.md, contracts/os-core.md). Copied from
// the data model; React's component type is left generic, so this package
// imports nothing from React.

export type ShellName = 'desktop' | 'mobile';

// An app id, or 'about' for About this site, which is a view and not an app.
export type ViewId = 'cv' | 'terminal' | 'playground' | 'about';

// CSS pixels, relative to the desktop area.
export type Geometry = { x: number; y: number; width: number; height: number };

export type Area = { width: number; height: number };

export type WindowState = {
  view: ViewId;
  // Where it is now, or was when minimized.
  geometry: Geometry;
  minimized: boolean;
  maximized: { restore: Geometry } | null;
  // 'initial' only for the pre-rendered CV window, until measured (R3).
  placement: 'initial' | 'set';
};

// A keyboard move or resize in progress. `start`: the box when the session
// began, which a cancel goes back to; `from`: the box when its kind last
// changed, where a resize's edges already past the screen stop.
export type Session = { kind: 'move' | 'resize'; view: ViewId; start: Geometry; from: Geometry } | null;

export type OsState = {
  // 'both' only before hydration finishes (R2).
  shell: ShellName | 'both';
  // The desktop area, once measured.
  area: Area | null;
  // Front first: DOM and Tab order (R9).
  windows: WindowState[];
  // The focused window, always windows[0] when set.
  focused: ViewId | null;
  session: Session;
  mobile: {
    // The full-screen view, if any.
    open: ViewId | null;
    // scrollTop by view, for this visit (FR-034).
    scroll: Partial<Record<ViewId, number>>;
    // A same-URL history entry is pushed (FR-050).
    historyEntry: boolean;
  };
  // The views showing their specs, with the app's scroll position to restore
  // (007 research R2). Kept through minimize, mobile Home and shell changes;
  // removed on close.
  specs: Partial<Record<ViewId, { appScroll: number }>>;
  // Focus moves and announcements for the Os root to run.
  effects: Effect[];
};

export type Effect = { kind: 'focus'; target: FocusTarget } | { kind: 'announce'; message: string };

export type FocusTarget =
  | { kind: 'window-title'; view: ViewId }
  | { kind: 'dock-item'; app: string }
  | { kind: 'site-menu' }
  | { kind: 'menu-title'; menu: string }
  | { kind: 'pad'; view: ViewId }
  | { kind: 'mobile-title'; view: ViewId }
  | { kind: 'home-icon'; view: ViewId }
  // 007: the spec view's heading, and the view's "Show specs".
  | { kind: 'spec-heading'; view: ViewId }
  | { kind: 'show-specs'; view: ViewId };

// A component, without naming React: the site passes React components.
export type ComponentType<P = Record<string, never>> = (props: P) => unknown;

export type AppDeclaration<Props = any> = {
  // 'cv'; stable, used in state and data attributes.
  id: string;
  // Site text: 'CV'.
  name: string;
  shells: readonly ShellName[];
  // false for the CV app (Constitution VI).
  needsNetwork: boolean;
  // Inline SVG, original (FR-044).
  Icon: ComponentType<any>;
  Content: ComponentType<Props>;
};

export type Shortcut = { id: string; letter: string; needs: 'none' | 'window' | 'restored-window' };

// Every design value the scripts need, in CSS pixels, or milliseconds for
// `motionMs` (data-model.md Metrics). The site builds it from tokens.
export type Metrics = {
  desktopMinWidth: number;
  desktopMinHeight: number;
  menuBar: number;
  dockReserve: number;
  titleBar: number;
  // How much of the title bar stays on screen sideways (FR-021).
  grab: number;
  cvWidth: number;
  aboutWidth: number;
  aboutHeight: number;
  minWidth: number;
  minHeight: number;
  firstTop: number;
  sideMargin: number;
  bottomMargin: number;
  cascade: number;
  step: number;
  bigStep: number;
  motionMs: number;
  // The Terminal's window (006 contracts/shell.md).
  terminalWidth: number;
  terminalHeight: number;
  terminalMargin: number;
  terminalOffset: number;
  // The Playground's window (008 contracts/shell.md).
  playgroundWidth: number;
  playgroundHeight: number;
  playgroundMargin: number;
  playgroundOffset: number;
};

// The edge or corner a resize drags.
export type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

// The site text the reducer needs: window names come from the apps, About's
// name and the announcement patterns from here (contracts/os-core.md).
export type OsText = {
  aboutName: string;
  moved: string;
  moveCancelled: string;
  resized: string;
  resizeCancelled: string;
  maximized: string;
  restored: string;
};

export type ReducerContext = { apps: readonly AppDeclaration[]; metrics: Metrics; text: OsText };

export type OsAction =
  | { type: 'hydrated'; shell: ShellName; area: Area | null }
  | { type: 'shellChanged'; shell: ShellName; area?: Area | null }
  | { type: 'areaResized'; area: Area }
  | { type: 'open'; view: ViewId }
  | { type: 'focus'; view: ViewId }
  | { type: 'next' }
  | { type: 'close'; view: ViewId }
  | { type: 'minimize'; view: ViewId }
  | { type: 'toggleMaximize'; view: ViewId }
  | { type: 'dragMove'; view: ViewId; x: number; y: number }
  // `box`: the focused element with its outline, relative to the area (FR-067).
  | { type: 'reveal'; view: ViewId; box: Geometry }
  // `from`: the box when the drag began.
  | { type: 'dragResize'; view: ViewId; edge: Edge; geometry: Geometry; from: Geometry }
  | { type: 'sessionStart'; kind: 'move' | 'resize' }
  | { type: 'sessionStep'; dx: number; dy: number }
  | { type: 'sessionEnd'; confirm: boolean }
  | { type: 'mobileOpen'; view: ViewId }
  | { type: 'mobileHome'; scrollTop: number }
  // 007: show a view's specs, keeping the app's scroll position, or its app.
  | { type: 'showSpecs'; view: ViewId; appScroll: number }
  | { type: 'showApp'; view: ViewId }
  // `count`: how many effects from the front were run; all when absent.
  | { type: 'effectsDone'; count?: number };
