# Contract: Changes to the OS Shell (005), the Terminal (006) and the Inspector (007)

What 008 changes outside the Playground's own folder, as research R2, R16, R21 and R22 set.
005's, 006's and 007's contracts hold for everything not listed. Each change is general, so a
later app can use it.

## `@cv/os-core`

| Change | Contract |
|--------|----------|
| `ViewId` | `'cv' \| 'terminal' \| 'playground' \| 'about'` |
| `Metrics` | Gains `playgroundWidth` (1040), `playgroundHeight` (648), `playgroundMargin` (40) and `playgroundOffset` (64), from tokens (`size.playground.window-*`, R22) |
| `placeWindow('playground', …)` | 006's Terminal rule with the Playground's values: fitted to the area with at least `firstTop` below it, never below the minimum; with a shown window in front, `x = area.width − playgroundMargin − width`, `y = front.y + playgroundOffset`; with none, centered; then `clampMove`. At 1440 × 900 with the CV at its first-load place: 360, 88 (design). `placeTerminal` and `placePlayground` share one function, `placeBeside(view, size, margin, offset)` |
| `SHORTCUTS` | `minimize` (`H`) and `maximize` (`F`) are removed: the amendment of 005, FR-063 and FR-065 (FR-086). The six left keep their letters and order |
| Reducer | Unchanged. `open`, `close`, `minimize`, `toggleMaximize`, `showSpecs` and the rest work for any view an app declares; the minimize and maximize actions stay, reached by the controls and the menu |

Tests: `geometry.test.ts` (the design's box at 1440 × 900 with the CV, with no window, at
1024 × 640, beside a Terminal, after a cascade), `shortcuts.test.ts` (`Alt+Shift+H` and `F` match
nothing, on a Mac too), `reducer.test.ts` and `invariants.test.ts` with a four-app fixture.

## App declaration (`src/apps/index.ts`)

```ts
type AppOs = { shell: ShellName; open: (view: 'cv' | 'playground' | 'about') => void; exit: () => void };

type AppMenuItem = {
  key: string; label: string; run: () => void; 'data-req'?: string;
  // New, read by MenuBar.tsx as its own entries already are:
  shortcut?: () => string | undefined;   // the key shown beside it, for this system
  disabled?: () => boolean;              // read when the menu opens
  separatorBefore?: true;                // a separator above this item
};
```

`APPS` becomes `[cvApp, terminalApp, playgroundApp]`: the dock and the home screen show the
Playground after the CV app and the Terminal (FR-001). The Playground's declaration:

| Field | Value |
|-------|-------|
| `id`, `name` | `'playground'`, `siteText.os.views.playground` (`Playground`) |
| `shells` | `['desktop', 'mobile']`: the editor on desktop, the "best on desktop" screen on mobile (FR-001, FR-058) |
| `needsNetwork` | `false`: it works offline after one open (FR-073); its first download is its own offline state (FR-011) |
| `Icon` | `PlaygroundIcon`: braces around a play mark, the design's tile |
| `Content` | `PlaygroundApp`: the "best on desktop" screen when `os.shell` is `'mobile'`, else the Playground |
| `focusOnOpen` | `'.playground [data-focus-home]'`, set on the editor once it is ready; before that, focus falls back to the title (FR-004) |
| `menuItems` | Run (`Cmd+Enter`), Stop (disabled with no run), Examples…, Compiler options…, Share…, Command palette (`F1`), Keys…, Reset…, with the design's separators (FR-003, FR-085) |
| `onClose` | Ends any run, closes popups and panels, empties the logs and stops a download in progress (FR-046) |
| `opensFromAddress`, `onOpenFromAddress` | `holdsLink`; on the desktop, `readAddressLink` (FR-053, FR-060) |

## Opening from a link (FR-053, FR-060)

The app declares this, so the shell names no app (Constitution V). `App` gains two optional fields:
`opensFromAddress(href)`, whether the address is the app's own, and `onOpenFromAddress(shell)`,
called just before it opens. `Os.tsx`, on hydration, opens the first app in the current shell whose
`opensFromAddress(location.href)` is true. The Playground's are `holdsLink`, and on the desktop
`readAddressLink`, which reads the address with `readLink` (contracts/share-link.md). For `app`,
`code` and `broken`:

- **Desktop**: after `hydrated`, `Os.tsx` dispatches `open` for the app, so the CV window opens as
  on first load (005 FR-005) and the Playground in front of it, focused, with the usual focus
  rule. The link goes into the Playground's session as `pendingLink`.
- **Mobile**: after `hydrated`, `Os.tsx` dispatches `mobileOpen` for the app; the full-screen view
  shows the shared-link screen.
- **A link pasted into a tab already on the site** changes only the fragment, with no load. `Os.tsx`
  listens for `hashchange` and does the same as on hydration, in the current shell: the desktop
  reads the new link as above, and runs nothing; a phone's screen shows the shared-link words, or
  switches to them if it is already open (FR-053, FR-060).

No other first load changes (FR-002): with no `#playground` fragment, the desktop shows only the CV
window and the phone its home screen.

## Other changes in `@cv/web`

| File | Change |
|------|--------|
| `src/os/Os.tsx` | `isView` accepts `'playground'`; opens an app from its own address, as above, importing nothing from `apps/<id>/` |
| `src/os/metrics.ts` | `METRICS` gains the four placement values |
| `src/shells/desktop/MenuBar.tsx` | Reads `shortcut`, `disabled` and `separatorBefore` of app items; the window's Minimize and Maximize entries show no shortcut (FR-086) |
| `src/shells/desktop/Desktop.tsx` | The key listener drops `minimize` and `maximize`; it listens in the capture phase so a shortcut reaches the shell before the editor sees the key, and no character is typed (FR-062, FR-084, R12) |
| `src/os/About.tsx` | Lists the six shortcuts left; the list follows `SHORTCUTS`, so no code change is needed beyond its text (FR-086) |
| `src/site-text.ts` | `os.views.playground`, and the `playground` group (data-model.md Site text) |
| `src/apps/terminal/engine/commands.ts` | `open playground`, and `help`'s row, the amendment of 006 (FR-087) |
| `scripts/requirements/carried.ts` | Unchanged: the Playground's UI is in the `os` script's import graph, so its `data-req` values are found as any app's (R3) |

## The amendment of 005 (FR-086)

Built in this pull request, as Constitution XI sets:

- **Spec**: already recorded (`specs/005-os-shell/spec.md`, the 2026-10-29 session, FR-063 and
  FR-065 marked Amended).
- **Design**: 005's wireframes for the window menu and About this site drop the two shortcuts; its
  mockup is rebuilt for those two states and its `review.md` gets a dated sign-off line for the
  amendment. These are `docs:` commits before the code (R21).
- **Tasks**: a phase in 008's `tasks.md`; 005's tasks for the two shortcuts are marked superseded
  there, naming 008.
- **Tests**: 005's `menus.test.ts`, `keyboard.test.ts`, `about.test.tsx` and the site check's
  `keyboard` part change from "the shortcut minimizes" to "the shortcut does nothing, and the
  control and the menu command still work", each naming `005-os-shell-FR-063` or `FR-065`.

## The amendment of 006 (FR-087)

- **Spec**: already recorded (`specs/006-terminal/spec.md`, the 2026-10-29 session, FR-008 and
  FR-014 marked Amended).
- **Code**: `open playground` calls `os.open('playground')`: on desktop it opens the Playground or
  brings it to the front, as the dock does; on mobile it shows the "best on desktop" screen, as the
  home-screen icon does. `open` with another name lists `cv`, `playground` and `about`. `help`
  shows the amended row.
- **Tasks**: a phase in 008's `tasks.md`.
- **Tests**: 006's `commands.test.ts` (the parser and the reply) and the Terminal's browser test for
  `open`, naming `006-terminal-FR-008` and `FR-014`; the site check's `terminal` part gains
  `open playground`.

## 007, unchanged

The Playground gets "Show specs" and its spec view with no change of 007's code: its window is a
`View`, and its `data-req` values are carried through `src/apps/playground/` (007's convention).
The Playground keeps its own state across the swap in its session (FR-005, R2): the editor's view
state is saved when its content unmounts and restored when it mounts.

## Unchanged

- First load without a fragment: only the CV window on desktop, the home screen on phones.
- `/cv`, the not-found page, the no-script page, the service worker's handling of every file that
  isn't under `/playground/` (contracts/site.md).
