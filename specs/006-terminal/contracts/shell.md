# Contract: Changes to the OS Shell (005)

What 006 changes in `@cv/os-core` and in the shell's code in `@cv/web`, as research R6 sets. Each
change is general, so a later app can use it, and none changes what the CV app or About this
site do. 005's [contracts/shell.md](../../005-os-shell/contracts/shell.md) and
[contracts/os-core.md](../../005-os-shell/contracts/os-core.md) hold for everything not listed.

**Amendment, 2026-10-29**: no change here. The shell, its worker and its keys are the Terminal's
own (research R25 to R37), and `onClose` also resets the shell worker (contracts/shell-worker.md).

## `@cv/os-core`

| Change | Contract |
|--------|----------|
| `ViewId` | `'cv' \| 'terminal' \| 'about'` |
| `Metrics` | Gains `terminalWidth` (760), `terminalHeight` (536), `terminalMargin` (40) and `terminalOffset` (120), from tokens |
| `placeWindow('terminal', windows, area, metrics)` | Size `terminalWidth × terminalHeight`, fitted to `area` with at least `firstTop` (24 px) left below it, never below the minimum. With a shown window in front, `x = area.width − terminalMargin − width` and `y = front.y + terminalOffset`, so the front window's title bar stays visible (005 FR-018). With none, centered. Then `clampMove`. At 1440 × 900 with the CV at its first-load place: 640, 176 (design) |
| Reducer | Unchanged. `open`, `close`, `minimize` and the rest already work for any view an app declares |

Tests: `geometry.test.ts` (the design's box at 1440 × 900, with no window, at 1024 × 640, with the
CV maximized and minimized, after a cascade of About), `reducer.test.ts` and `invariants.test.ts`
with a three-app fixture.

## App declaration (`src/apps/index.ts`)

```ts
type App = {
  // 005's fields: id, name, shells, needsNetwork, Icon, Content
  focusOnOpen?: string;
  WindowTitle?: () => ReactNode;
  menuItems?: readonly { key: string; label: string; run: () => void }[];
  onClose?: () => void;
};
type AppProps = { resume: Resume; siteData: SiteData; os: AppOs };
type AppOs = { shell: ShellName; open: (view: 'cv' | 'about') => void; exit: () => void };
```

`APPS` becomes `[cvApp, terminalApp]`, so the Terminal follows the CV in the dock and on the home
screen (FR-001).

| Field | Who reads it | Behavior |
|-------|--------------|----------|
| `focusOnOpen` | `src/os/focus.ts` | A `window-title` or `mobile-title` focus target for this view focuses the first element matching the selector inside the window's or view's content. When none matches, it falls back to the title. The Terminal gives `.terminal [data-focus-home]`, set on the command line, or on the vim text while the view is open (FR-004, FR-065) |
| `WindowTitle` | `TitleBar.tsx` | Rendered in `.window-title` in place of the app's name. The window stays named by that element. The dock item, menu title, Window menu item and page title keep `name` (005 FR-011, FR-013, FR-014, FR-042) |
| `menuItems` | `MenuBar.tsx` | Listed first in the focused window's own menu, then a separator, then 005's window commands. The menu title is the app's `name` (`Terminal`). Choosing an item runs `run` and closes the menu, with focus returning as 005 FR-015 sets |
| `onClose` | `Os.tsx` | Called once, after the reducer has applied a `close` action for this view, whatever started it: the close control, the menu, `Alt+Shift+W` or `os.exit()` |
| `os.open(view)` | Apps | Desktop: dispatches `open`, as the dock does (005 FR-012, FR-064). Mobile: dispatches `mobileOpen`, as the home screen does |
| `os.exit()` | Apps | Desktop: dispatches `close` for the app's view, through `Os`'s `act`, so it animates as the control does. Mobile: calls `onHome`, as the Home control does (005 FR-033, FR-034) |
| `os.shell` | Apps | The shell the content is rendered in, for the pocket look and the phone's site text |

`View.tsx` builds `os` for the content from the props it already gets: `dispatch` and, on mobile,
`onHome`, which `FullScreenView` passes down.

## Other changes in `@cv/web`

| File | Change |
|------|--------|
| `src/os/Os.tsx` | `isView` accepts `'terminal'`. `act` calls the closed app's `onClose` after dispatching `close`. `ShellProps` gains `onHome` on mobile, for `os.exit()` |
| `src/os/metrics.ts` | `METRICS` gains the four placement values. A new `TERMINAL` export holds the values the Terminal's scripts need: the command line's limit and the column count's inputs (research R13, R22) |
| `src/shells/desktop/MenuBar.tsx` | Lists `menuItems` first in the focused window's menu |
| `src/shells/desktop/TitleBar.tsx` | Renders `WindowTitle` when the app gives one |
| `src/site-text.ts` | `os.views.terminal: 'Terminal'`, and the `terminal` group: the starter chips (`terminal.starter`, no greeting since 2026-10-29), the prompt label, the menu item, every command's usage, description and help, every reply, the announcements, the vim view's messages and key help, the pocket keys' names (design Site text) |

## Unchanged

- First load: the desktop opens with only the CV window, and the phone on its home screen. The
  Terminal never opens by itself (FR-002, 005 FR-005).
- The early tap, the history entry on mobile, the title rule, the shortcuts and the focus rules for
  closing and going home.
- `/cv`, the not-found page and the no-script page.
