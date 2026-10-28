# Contract: `@cv/os-core`

The OS behavior both shells share (Constitution V, research R4). A workspace at
`packages/os-core`, private, `type: module`, exporting `./src/index.ts`. It imports nothing from
React, the DOM, Node, `@cv/content` or `@cv/tokens`: design values arrive as `Metrics`, and apps
as declarations. Types are in [data-model.md](../data-model.md).

## Exports

| Export | Kind | Contract |
|--------|------|----------|
| `ShellName`, `ViewId`, `Geometry`, `WindowState`, `Session`, `OsState`, `Effect`, `FocusTarget`, `Metrics`, `AppDeclaration`, `Shortcut` | types | As data-model.md |
| `shellQuery(metrics)` | function | `'(width >= {desktopMinWidth}px) and (height >= {desktopMinHeight}px)'`, for the inline script and `matchMedia` (FR-001) |
| `appsFor(apps, shell)` | function | The apps whose `shells` include `shell`, in list order (FR-003) |
| `initialState(apps, metrics)` | function | The state the build renders: CV window open with `placement: 'initial'`, focused, no effects (FR-005) |
| `osReducer(state, action, context)` | function | Pure. `context` is `{ apps, metrics, text }`, `text` being the announcement and window-name patterns from `site-text.ts`. Returns the next state with effects appended. Every action of data-model.md's table. Unknown or inapplicable actions return `state` unchanged |
| `placeWindow(view, windows, area, metrics)` | function | A new window's geometry (FR-018): the CV centered as the design sets, its top stepped down 48 px at a time with its bottom edge kept (no shorter than the minimum) while that box is on a shown window's title bar; About cascaded 48 px from the front window, stepping until its whole box is on no other window's title bar, or, when no step allows that, until its title bar is on no other title bar; both fitted to `area` |
| `clampMove(geometry, area, metrics)` | function | The nearest geometry whose title bar is inside `area` (FR-021) |
| `clampResize(geometry, edge, area, metrics)` | function | Within the minimum size and `area`, keeping the opposite edge fixed (FR-061) |
| `fitToArea(window, area, metrics)` | function | After `area` changes: moved inside, fitted if larger, filling if maximized (FR-021, FR-065) |
| `SHORTCUTS` | constant | The eight shortcuts, in About this site's order (FR-029) |
| `matchShortcut(event, mac)` | function | The shortcut a key event means, or `null` (research R9) |
| `shortcutLabel(shortcut, mac)` | function | `'Alt+Shift+W'`, or `'Option+Shift+W'` when `mac` |

`action` is a discriminated union on `type`: `hydrated`, `shellChanged`, `areaResized`, `open`,
`focus`, `next`, `close`, `minimize`, `toggleMaximize`, `dragMove`, `dragResize`, `sessionStart`,
`sessionStep`, `sessionEnd`, `mobileOpen`, `mobileHome`, `effectsDone`.

## Guarantees

- Every function is deterministic and doesn't mutate its arguments. The reducer's state is frozen
  in tests to prove it.
- After any sequence of actions, the invariants of data-model.md hold. Tests check them after
  every step of named scenarios and of generated sequences.
- Every number is CSS pixels. Fractions are rounded to whole pixels, so a window never lands on a
  half pixel.
- Announcement texts and window names come in through `context.apps` and `context.text`, from
  the site's `site-text.ts`. `os-core` holds no site text (FR-043).
