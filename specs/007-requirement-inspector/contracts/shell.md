# Contract: Changes to the OS Shell (005, 006)

What 007 changes in `@cv/os-core` and in the shell's code in `@cv/web` (research R2 to R4, R11,
R14). 005's [contracts/shell.md](../../005-os-shell/contracts/shell.md) and
[contracts/os-core.md](../../005-os-shell/contracts/os-core.md), and 006's
[contracts/shell.md](../../006-terminal/contracts/shell.md), hold for everything not listed. No
app declaration changes: the CV app and the Terminal get the inspector from the shell.

## `@cv/os-core`

| Change | Contract |
|--------|----------|
| `OsState.specs` | `Partial<Record<ViewId, { appScroll: number }>>`. `initialState` gives `{}` |
| `showSpecs { view, appScroll }` | When `view` is open (a window on desktop, opened this visit on mobile) and has no entry: adds `{ appScroll }`. Desktop: brings the window to the front and focuses it, restoring it if minimized. Effect: focus `{ kind: 'spec-heading', view }`. Otherwise: no change |
| `showApp { view }` | When `view` has an entry: removes it. Desktop: front and focused, as above. Effect: focus `{ kind: 'show-specs', view }`. Otherwise: no change |
| `close` | Also removes `view`'s entry |
| `open` on desktop | Also removes `view`'s entry when it creates a new window for it, so an app opened afresh shows the app (FR-004). Opening an open or minimized window keeps it (`open cv` from the Terminal, the dock) |
| Every other action | Leaves `specs` as it is |

Tests: `reducer.test.ts` (each row; showing one view's specs leaves another's state and geometry
equal; `close` then `open` shows the app; `minimize`, `toggleMaximize`, drags, `mobileHome`,
`mobileOpen`, `shellChanged` both ways keep the entry), `invariants.test.ts` (005's invariants
still hold over random runs that include the new actions).

## `@cv/web`

| File | Change |
|------|--------|
| `src/os/Os.tsx` | `viewTitle(view)` gives `fill(siteText.inspector.windowTitle, { view })` while `state.specs[view]` is set, else the name; the page title uses it. `act` sends `showSpecs` and `showApp` through `crossFade` (research R11), reading `appScroll` from the view's scroller. Calls `startLoading()` once the shell is ready (research R9). `ShellProps` gains `viewTitle` |
| `src/os/View.tsx` | Renders `SpecView` for the view when `state.specs[view]` is set, else the app's content or About, as before |
| `src/os/focus.ts` | `spec-heading`: `#os [data-view="{view}"] .spec-heading`; `show-specs`: `#os [data-view="{view}"] .show-specs`, each inside the shown window or full-screen view |
| `src/os/shell-props.ts` | `viewTitle` |
| `src/shells/desktop/TitleBar.tsx` | Renders `ShowSpecs` after `.controls` while the view shows its app, and `viewTitle(view)` in place of the name or `WindowTitle` while it shows its specs. Hidden during a keyboard move or resize, as the controls are |
| `src/shells/desktop/Window.tsx` | Restores the scroller to the saved `appScroll` in a layout effect when the view goes back to its app; sets it to 0 when the spec view shows |
| `src/shells/desktop/MenuBar.tsx` | The focused window's menu gains `Show specs` or `Back to [view]` after the app's own commands (research R4) |
| `src/shells/mobile/FullScreenView.tsx` | `ShowSpecs` at the header's right while the app shows; `.app-title` gains `Specs` below the name while the specs show; the same scroll rule as `Window.tsx` |
| `src/inspector/` | New: `SpecView.tsx`, `ShowSpecs.tsx`, `SpecGroup.tsx`, `Requirement.tsx`, `InlineText.tsx`, `WhatsThis.tsx`, `Notes.tsx`, `derive.ts`, `data.ts`, `transition.ts`, `glyphs/` (sheet, question, offline, commit, no-tests mark), `inspector.css` |
| `src/format/repository.ts` | New: link forms ([requirement-data.md](./requirement-data.md#links-packageswebsrcformatrepositoryts)) |
| `src/site-text.ts` | `inspector` group (data-model.md Site text) |
| `src/styles/os.css` | Imports `inspector.css` |
| `src/pages/ShellPage.tsx`, `src/render.tsx` | `#os` gains `data-requirements` from `assets.requirements` |

## Unchanged

- First load: the CV window on desktop and the home screen on mobile, as 005 sets, with only
  "Show specs" added to the window's title bar (FR-005).
- `/cv`, the not-found page and the no-script page (FR-025).
- The shortcuts, the dock, the home screen, the Window menu's list, the history entry on mobile
  (Back from an app showing its specs goes home, as from the app), and every window rule.
- The app declarations, and the Terminal's session store and engine.
