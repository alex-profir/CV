# Design Review: The Terminal

**Status**: Look approved on 2026-10-27. The full set of states is awaiting the owner's sign-off.

**Design**: the Penpot page **006 Terminal — Glass** (file id
`eaccfa4c-8a01-81ad-8008-d441a46da254`). The Terminal is a frosted-glass window on 005's Graphite
desktop, with the feel of a modern GPU terminal such as Ghostty, drawn in the site's own tokens.
On a phone it is a pocket terminal in the same glass.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes: every state the spec's Design section lists, the design values the spec leaves to the design, keyboard and screen readers, and site text | [wireframes.md](wireframes.md) |
| Exports: desktop at 1440 × 900, 9 states | `exports/desktop-*-1440.png` |
| Exports: phone at 375 × 812 (just opened, after `help`, after `ls`, keyboard open), 320 × 568 and 568 × 320 in landscape | `exports/phone-*.png` |
| Export: the glass recipe, proposed tokens and contrast checks | `exports/glass-recipe-1440.png` |
| Notes and proposed tokens | [README.md](README.md) |
| Penpot file | Page **006 Terminal — Glass**. The shareable link is still to be added |

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
- **The unknown-command reply** offers only the suggestions as chips, with `help` as a control in
  the sentence, as FR-016 sets.
- **`ls` and `help` rows** are 24 px tall, for FR-034's 24 × 24 px targets.

## Sign-off

- Reviewed mockup version: Penpot page **006 Terminal — Glass**, as exported to `exports/` on
  2026-10-27
- Date: pending
- Approved by: pending (Alex Profir, project owner)
- Notes: The look was approved on 2026-10-27 on review of the first four exports. The full set
  awaits the owner's review.
