# Data Model: The OS Shell

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The shell has no stored data: nothing is kept between visits (spec Assumptions). Its entities are
the declarations it's built from, the in-memory state of one visit, and the build output and check
results that prove it. Types below are written as TypeScript for precision. Their home is given
for each.

## Inputs

| Input | Source | Read by |
|-------|--------|---------|
| CV document | `packages/content/resume.json`, through `@cv/content` (002) | The CV app, the site name, About this site, the no-script page |
| Site data | `packages/content/site.json` (`repository`, 004) | The site menu, About this site, the no-script page's footer |
| Design tokens | `packages/tokens/penpot/tokens.json` with the 85 new tokens (R7), and the motion source | Style sheets through `var(--token-…)`; scripts through `metrics.ts` |
| Site text | `packages/web/src/site-text.ts`, new `os`, `desktop`, `mobile`, `about` and `noScript` keys | Every shell label and announcement |
| App list | `packages/web/src/apps/index.ts` | Both shells (FR-003) |

## Metrics

Home: `@cv/os-core` declares the type; `packages/web/src/os/metrics.ts` builds the value from
tokens (R7). All numbers are CSS pixels, or milliseconds for `motionMs`.

| Field | Token | Design value | Used for |
|-------|-------|--------------|----------|
| `desktopMinWidth` | `breakpoint.desktop-width` | 1024 | `shellQuery()` (FR-001) |
| `desktopMinHeight` | `size.desktop-min-height` | 640 | `shellQuery()` (FR-001) |
| `menuBar` | `size.menu-bar` | 32 | Desktop area's top |
| `dockReserve` | `size.dock-reserve` | 104 | Desktop area's bottom |
| `titleBar` | `size.title-bar` | 40 | Clamping: the title bar stays inside (FR-021) |
| `grab` | `size.title-bar-grab` | 120 | Clamping: this much of the title bar stays on screen sideways (FR-021) |
| `cvWidth` | `size.window-cv-width` | 1000 | CV window placement |
| `aboutWidth`, `aboutHeight` | `size.window-about-width`, `size.window-about-height` | 560, 520 | About window placement |
| `minWidth`, `minHeight` | `size.window-min-width`, `size.window-min-height` | 400, 300 | Resizing (FR-061) |
| `firstTop` | `space.6` | 24 | Gap below the menu bar for a new window |
| `sideMargin` | `space.8` | 32 | Each side: a window is at most the area's width minus 64 |
| `bottomMargin` | `space.12` | 48 | A new window's height is the area's height minus 48 |
| `cascade` | `space.12` | 48 | About's offset from the window in front (FR-018) |
| `step`, `bigStep` | `space.4`, `space.16` | 16, 64 | Keyboard and pad steps (FR-027, FR-062) |
| `motionMs` | `motion.duration.fast` | 150 | Open and close animations (R13) |

Validation: `metrics.ts` throws at import if a token isn't a plain `px` length or `ms` duration,
so a bad token fails the build rather than a visit.

## App declaration

Home: type in `@cv/os-core`, values in `packages/web/src/apps/<app>/app.tsx` (Constitution V).

```ts
type ShellName = 'desktop' | 'mobile';

type AppDeclaration = {
  id: string;                 // 'cv'; stable, used in state and data attributes
  name: string;               // site text: 'CV'
  shells: readonly ShellName[];
  needsNetwork: boolean;      // false for the CV app (Constitution VI)
  Icon: ComponentType;        // inline SVG, original (FR-044)
  Content: ComponentType<AppProps>;
};
```

Rules:

- `apps/index.ts` exports `APPS`, the list in dock and home screen order (FR-003). `appsFor(shell)`
  returns the apps whose `shells` include it, in that order, and nothing else: no placeholder.
- `id` values are unique. A test asserts it.
- The CV app: `{ id: 'cv', name: 'CV', shells: ['desktop', 'mobile'], needsNetwork: false }`.

**About this site** is a *view*, not an app (spec Key Entities): it opens in a window or full
screen like an app but has no dock item or home screen icon. Views are addressed by `ViewId`:

```ts
type ViewId = 'cv' | 'about';   // an app id, or 'about'
```

## OS state

Home: `@cv/os-core` (`state.ts`, `reducer.ts`). One value per visit, held by the `Os` root with
`useReducer`. Nothing is stored between visits.

```ts
type Geometry = { x: number; y: number; width: number; height: number }; // relative to the desktop area

type WindowState = {
  view: ViewId;
  geometry: Geometry;                    // where it is now, or was when minimized
  minimized: boolean;
  maximized: { restore: Geometry } | null;
  placement: 'initial' | 'set';          // 'initial' only for the pre-rendered CV window, until measured (R3)
};

type Session = { kind: 'move' | 'resize'; view: ViewId; start: Geometry } | null;

type OsState = {
  shell: ShellName | 'both';             // 'both' only before hydration finishes (R2)
  area: { width: number; height: number } | null; // the desktop area, once measured
  windows: WindowState[];                // front first; DOM and Tab order (R9)
  focused: ViewId | null;                // the focused window, always windows[0] when set
  session: Session;                      // a keyboard move or resize in progress
  mobile: {
    open: ViewId | null;                 // the full-screen view, if any
    scroll: Partial<Record<ViewId, number>>; // scrollTop by view, for this visit (FR-034)
    historyEntry: boolean;               // a same-URL history entry is pushed (FR-050)
  };
  effects: Effect[];                     // focus moves and announcements for the Os root to run
};

type Effect =
  | { kind: 'focus'; target: FocusTarget }
  | { kind: 'announce'; message: string };

type FocusTarget =
  | { kind: 'window-title'; view: ViewId }
  | { kind: 'dock-item'; app: string }
  | { kind: 'site-menu' }
  | { kind: 'menu-title'; menu: string }
  | { kind: 'pad'; view: ViewId }
  | { kind: 'mobile-title'; view: ViewId }
  | { kind: 'home-icon'; view: ViewId };
```

The reducer is pure: it computes the next state and appends effects. The `Os` root runs and
clears the effects after each render, so focus moves happen once the elements exist.

### Initial state

`initialState(apps, metrics)`: `shell: 'both'`, the CV window open with `placement: 'initial'`,
focused, no effects (focus stays at the start of the page, FR-005), `mobile.open: null`. This is
exactly what the build renders.

### Invariants

Checked by `os-core` tests after every action, on random action sequences as well as named cases:

| Invariant | Requirement |
|-----------|-------------|
| At most one `WindowState` per `view` | FR-012 |
| `focused` is `null` or `windows[0].view`, and that window isn't minimized | FR-017 |
| Every non-maximized window's title bar is placed as FR-021 sets (`0 ≤ y`, `y + titleBar ≤ area.height`, and with `g = min(grab, width)`, `x + width ≥ g` and `x ≤ area.width - g`), and it is no larger than `area` | FR-021, FR-061 |
| Every non-maximized window is at least `minWidth × minHeight`, unless `area` is smaller, in which case it is fitted to `area` | FR-061, spec edge cases |
| A maximized window's geometry equals `{ 0, 0, area.width, area.height }` | FR-065 |
| `session` is `null` or names a focused, non-maximized window | FR-027, FR-062, FR-065 |
| `mobile.open` is `null` or a view whose app supports `mobile` | FR-003 |

### Actions and transitions

| Action | Effect on state | Effects |
|--------|-----------------|---------|
| `hydrated { shell, area }` | `placement` → `'set'` with `placeWindow()`'s box. On `mobile`: close the CV window, `mobile.open: null` (FR-005) | none |
| `shellChanged { shell }` | R12: desktop → mobile opens the focused window's view full screen; mobile → desktop focuses or opens the full-screen view's window | focus the open view's title |
| `areaResized { area }` | Move every window inside, fit oversize ones, keep maximized ones filling (FR-021, FR-065) | none |
| `open { view }` | Not open: add in front by `placeWindow()` (FR-018). Minimized: restore at its geometry (FR-064). Open: bring to front | focus `window-title` (FR-040) |
| `focus { view }` | Bring to front, focus (FR-017, FR-030) | none |
| `next` | Focus the next window that isn't minimized, cycling (FR-026) | focus `window-title` |
| `close { view }` | Remove it; focus the window now in front | focus the new front's title, or `dock-item` of the closed app, or `site-menu` for About when none is left (FR-023) |
| `minimize { view }` | `minimized: true`; focus the next shown window | as `close`, by FR-063 |
| `toggleMaximize { view }` | Save `restore` and fill `area`, or restore it (FR-065) | announce `{window} maximized.` or `{window} restored.` |
| `dragMove { view, x, y }` | Clamp to `area` (FR-021); ignored while maximized | none |
| `reveal { view, box }` | Move by `revealMove()` so `box`, relative to the area, is inside it (FR-067); ignored while maximized or minimized | none |
| `dragResize { view, edge, geometry }` | Clamp to min size and `area` (FR-061); ignored while maximized | none |
| `sessionStart { kind }` | `session` with the focused window's geometry; ignored while maximized | focus `pad` |
| `sessionStep { dx, dy }` | Move by, or resize from the top-left corner by, `dx`, `dy` (step or big step), clamped | none |
| `sessionEnd { confirm }` | Confirm keeps the geometry; cancel restores `session.start` | announce `{window} moved.` / `{window} resized to W by H.` / `Move cancelled.` / `Resize cancelled.` (FR-041); focus `window-title` |
| `mobileOpen { view }` | `mobile.open`, `historyEntry: true` | focus `mobile-title` (FR-040) |
| `mobileHome { scrollTop }` | Save `scroll[open]`, `mobile.open: null`, `historyEntry: false` | focus `home-icon` of the view left (FR-034) |

Window lifecycle:

| From | Action | To |
|------|--------|----|
| closed | `open` (dock, site menu) | shown, in front, focused |
| shown | `minimize` | minimized |
| shown | `toggleMaximize` | maximized |
| maximized | `toggleMaximize` | shown, at its `restore` geometry |
| maximized | `minimize` | minimized, still maximized when restored |
| minimized | `open` (dock, Window menu, site menu for About) | shown or maximized, as it was, in front, focused |
| shown, maximized or minimized | `close` | closed |

## Shortcuts

Home: `@cv/os-core` (`shortcuts.ts`). One table; the menus, About this site and the key listener
all read it.

| `id` | Letter | Command | Needs |
|------|--------|---------|-------|
| `menu-bar` | M | Go to the menu bar | – |
| `dock` | D | Go to the dock | – |
| `next-window` | N | Next window | – |
| `close` | W | Close the focused window | a focused window |
| `minimize` | H | Minimize the focused window | a focused window |
| `maximize` | F | Maximize or restore the focused window | a focused window |
| `move` | P | Start a keyboard move | a focused, non-maximized window |
| `resize` | S | Start a keyboard resize | a focused, non-maximized window |

```ts
type Shortcut = { id: string; letter: string; needs: 'none' | 'window' | 'restored-window' };

// The shortcut a key event means, or null. `mac` picks the letter from `code` (R9).
function matchShortcut(event: { key: string; code: string; altKey: boolean; shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }, mac: boolean): Shortcut | null;

function shortcutLabel(shortcut: Shortcut, mac: boolean): string; // 'Alt+Shift+W' or 'Option+Shift+W'
```

Rules: every shortcut uses a modifier (FR-029). Arrow keys, Enter and Escape act only while focus
is on the pad, a menu, the menu bar or the dock.

## Site name and title

Home: `packages/web/src/format/meta.ts`.

| Function | Value |
|----------|-------|
| `siteName(resume)` | `basics.name`, or `siteText.siteHeading` (`CV`) when it has none (FR-066) |
| `shellTitle(resume, appName?)` | `{app} – {site name}` with a focused window or open app, else `{site name}` (FR-042) |

## Build output

Additions to 004's output (contracts/site.md has the full layout):

| File | What it is |
|------|------------|
| `dist/site/index.html` | The root page: the document, the inline shell picker, the no-script page and the pre-rendered `#os` |
| `dist/site/assets/os-<hash>.js` | The hydration entry: React, the shells, the CV app, `os-core`, the CV document. One file |
| `dist/site/assets/os-<hash>.css` | The root's style sheet |
| `dist/site-manifest.json` | Now lists `/` as a page with `index.html`, and no redirect |

The route table after this feature:

| Path | Aliases | Answer |
|------|---------|--------|
| `/` | – | 200, `index.html` |
| `/cv` | `/cv/` | 200, `cv.html` |
| anything else | – | 404, `404.html` |

## Site check results

Additions to 004's model (contracts/cli.md):

- **Shell state**: one of `first-load`, `no-window`, `about`, `two-windows`, `site-menu`,
  `window-menu`, `minimized`, `maximized`, `keyboard-move`, `keyboard-resize` (desktop) and
  `home`, `home-landscape`, `cv-app`, `about` (mobile). The state driver reaches each by real
  input from a fresh page.
- **Variant** on the root: `<shell>/<state>/<width>px`, such as `desktop/two-windows/1440px` or
  `mobile/cv-app/375px` (FR-060). `/cv` and the not-found page keep 004's variants.
- **New part `cv-app`**: page `/`, variants `desktop/cv-app/1440px` and `mobile/cv-app/375px`.
  Problems: `missing-field` and `out-of-order` with the field's JSON path, as 004's no-script part
  reports them.
- **New problem types**: `focus-target` (the keyboard flow's focus landed on the wrong element,
  naming the step and the expected target), `shortcut` (a shortcut didn't act, naming it),
  `trapped` (Tab didn't leave a window within its element count plus the shell's), `moved` (an
  element moved or scaled under reduced motion).
