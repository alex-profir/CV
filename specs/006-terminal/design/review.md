# Design Review: The Terminal

**Status**: Approved

**Design**: the Penpot page **006 Terminal — Glass** (file id
`eaccfa4c-8a01-81ad-8008-d441a46da254`). The Terminal is a frosted-glass window on 005's Graphite
desktop, with the feel of a modern GPU terminal such as Ghostty, drawn in the site's own tokens.
On a phone it is a pocket terminal in the same glass.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes: every state the spec's Design section lists, the design values the spec leaves to the design, keyboard and screen readers, and site text | [wireframes.md](wireframes.md) |
| Exports: desktop at 1440 × 900, 11 states (3 of them the vim view) | `exports/desktop-*-1440.png` |
| Exports: phone at 375 × 812 (just opened, after `help`, after `ls`, keyboard open, the vim view), 320 × 568 and 568 × 320 in landscape | `exports/phone-*.png` |
| Export: the glass recipe, proposed tokens and contrast checks | `exports/glass-recipe-1440.png` |
| Notes and proposed tokens | [README.md](README.md) |
| Penpot file | [006 Terminal — Glass](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f) |

## Design decisions

- **Glass**: what is behind the window is blurred by 32 px, then tinted with the window color at
  88% opacity, with a faint sheen at the top and a hairline rim with a light along the top edge.
  The title bar is part of the glass, with no rule under it.
- **Opacity**: 88%, not the 80% of the owner's own terminal. At 80%, secondary text over a
  blurred light CV page falls to 3.7:1. At 88% every text color passes WCAG 2.2 AA in that
  worst case (backdrop `#35363c`): snow 10.2:1, haze 7.4:1, fog 4.8:1, periwinkle 6.0:1, mint
  8.1:1, rose 6.4:1. Slate is never used for text in the Terminal.
- **Window**: 760 × 536 px, 40 px inside the desktop area's right edge and 120 px below the top of
  the window in front, so both title bars stay visible (005 FR-018). At 1440 × 900 that is
  640, 176. The CV window behind it keeps 005's first-load place, 220, 56.
- **Prompt**: two lines. A `guest` label in lilac joined to the working folder's path, then the
  time, and below it a mint `❯` and the command line. The path shows `~` for the home folder
  (FR-046). On the phone the time is left out.
- **Cursor**: a steady block in haze at 90%. It never blinks, so FR-032 holds with or without
  reduced motion.
- **Type**: JetBrains Mono, 14 px on 21 px lines with 20 px padding on desktop, 12.5 px on 19 px
  lines with 14 px padding on the pocket terminal, 12 on 18 below 375 px wide. The title bar and
  menu use Schibsted Grotesk, as in 005.
- **Command controls** (FR-015, FR-034): commands offered in the greeting and in replies are
  outlined chips, 26 px tall. Command names in `help`, names in `ls` and spec links are
  underlined, in rows 24 px tall so each has a 24 × 24 px target. Folders are periwinkle with a
  trailing slash, files are snow (FR-043).
- **Unknown command** (FR-016): the typed word in snow, "is not a command" in rose, `help` as a
  control, then the suggestions as chips.
- **`specs`** (FR-013): number, name as a link, status as a word (mint `Approved`, amber
  `Draft`), and the count of active requirements.
- **Long output** (FR-019): the command sits at the top of the view and the output scrolls inside
  the window, with its own scrollbar.
- **The whole CV as JSON in a vim view** (FR-055 to FR-066): `cv` runs
  `cat cv.json | jq | vim -`. `cv.json` is the CV document's own JSON. The view is read only and
  vim-like: line numbers, a fold per top-level section (closed on opening), search with counted
  matches, a mode pill and status line, a message line with `:help` and `:q` chips, and a `:help`
  split listing the keys. JSON colors come from the site's tokens: keys periwinkle, strings haze,
  numbers amber, literals rose. No key a browser or screen reader reserves is taken: Page Up and
  Page Down stand in for Ctrl+U and Ctrl+D. On the phone the command keys become vim keys, with
  `:q` in mint.
- **Terminal menu** (FR-003): `Clear output`, then 005's window commands with their shortcuts.
- **Dock icon**: an original glyph, a mint `❯` and a periwinkle `_` on a dark tile with a hairline
  edge, after the CV app.
- **Pocket terminal** (FR-024, FR-051 to FR-054): a glass case with a power light, a recessed
  screen and 8 raised keys: `help` (indigo), `about`, `work`, `projects`, `skills`, `cv`, `ls`,
  `clear`. Every key runs a command, as FR-051 requires; typing starts by tapping the command
  line. Below the keys, where there is room, a speaker grille and the owner's name from the CV
  document. In landscape the keys sit beside the screen, 2 columns of 4. With the on-screen
  keyboard open the keys hide and the screen grows to the keyboard.
- **Forced colors and reduced transparency**: the glass, sheen and blur drop out. The window
  falls back to `Canvas` and `CanvasText` with a solid border in forced colors, and to the solid
  `color.shell-surface` under `prefers-reduced-transparency`.
- **New tokens**: listed in [README.md](README.md#proposed-tokens).

## Original look (FR-031, FR-054, SC-010)

- [x] The Terminal takes the feel of a modern terminal (translucency, a title bar merged into the
  glass, generous padding, a block cursor), not any terminal's look. Its colors, prompt, window
  controls, icon and pocket terminal are drawn for this site in its own tokens. Nothing comes
  from or traces macOS's Terminal or Ghostty's default theme or icon.
- [x] The pocket terminal copies or traces no real device. The phone's own keyboard, drawn in the
  keyboard-open state, is a neutral placeholder and not part of the design.

## Changes after the look was approved

- **2026-10-27, the full set of states.** Drawn in the approved look: desktop after `help`, `cv`,
  an unknown command, `ls`, `cat` in a folder and `specs`, maximized, and with its menu open;
  phone after `help` and `ls`, with the keyboard open, at 320 px and in landscape.
- **The CV window's place** moved from 80, 56 to 005's first-load place, 220, 56, and the
  Terminal from 600, 196 to 640, 176 by the rule above. The look is unchanged.
- **The phone's `↵ type` key became `skills`**, and `help` took the indigo accent. FR-051 asks
  every key to run a command, and a key that only opened the keyboard didn't.
- **2026-10-27, the whole CV as JSON in a vim view**, at the owner's request in design review:
  the long text output of `cv` read poorly. `cv` now opens `cv.json` in a read-only vim view
  through `cat cv.json | jq | vim -`. The "after `cv`" state became three vim states on desktop
  and one on the phone; `help` lists `cv`'s new meaning, `jq` and `vim`; `ls` lists `cv.json`
  first. The spec gained FR-055 to FR-066 and its `cv` requirements changed to match (see its
  clarification session "design review").
- **The unknown-command reply** offers only the suggestions as chips, with `help` as a control in
  the sentence, as FR-016 sets.
- **`ls` and `help` rows** are 24 px tall, for FR-034's 24 × 24 px targets.

## Sign-off

- Reviewed mockup version: Penpot page **006 Terminal — Glass**, as exported to `exports/` on
  2026-10-27 (commit `c34fd51`)
- Date: 2026-10-27
- Approved by: Alex Profir (project owner)
- Notes: The look was approved first, on review of the first four exports. The full set of states,
  with the whole CV as JSON in the vim view, was approved on review of every export in
  `exports/`, and the owner confirms the look is original as recorded above.

## Pending: the 2026-10-29 amendment

**Status**: Awaiting the owner's review. Until it is signed below, the sign-off above stands and
no code for these states starts (Constitution II).

The spec's 2026-10-29 amendment changes the design. The changes are drawn in
[wireframes.md](wireframes.md#the-2026-10-29-amendment-pending-the-owners-review) and still need
the Penpot mockup and exports:

- **Cursor** (replaces the decision above once signed): a block in haze at 90%. Filled and
  blinking while the command line has focus, it stops blinking, still filled, 5 s after the last
  key press, and is hollow (a 1 px outline in the same color) without focus. It is the command
  line's only focus indicator: no box, border or outline around the line (FR-032, FR-072). Under
  reduced motion it never blinks. Both states keep at least 3:1 against the glass in the worst
  case above.
- **`help`** gains a group of standard commands (FR-008).
- **The shell** loading, and failing to load with a `Try again` control (FR-070).
- **A command line stopped** by its limit, and Ctrl+C (FR-069, FR-075).
- **Selection**: a selection in the command line, and all of the Terminal's text selected
  (FR-074, FR-075).
- **Site text**: the greeting drops `read only`, and the replies change as the wireframes'
  Site text changes table lists.

Exports to add to `exports/`: `desktop-10-cursor-focus-1440.png`, `desktop-11-help-standard-1440.png`,
`desktop-12-shell-loading-1440.png`, `desktop-13-shell-failed-1440.png`,
`desktop-14-stopped-1440.png`, `desktop-15-selection-1440.png`, `phone-8-cursor-375.png`,
`phone-9-shell-failed-375.png`.

### Sign-off (amendment)

- Reviewed mockup version:
- Date:
- Approved by:
- Notes:
