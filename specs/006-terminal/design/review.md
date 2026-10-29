# Design Review: The Terminal

**Status**: Approved

**Amendment of 2026-10-29**: Awaiting approval (see [below](#2026-10-29-amendment))

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
- **Cursor** (changed by the 2026-10-29 amendment): the command line has no box, and its block
  cursor is its focus indicator. With focus it is filled in haze and blinks, 500 ms on and 500 ms
  off, until 5 s after focus or the last key press, then stays filled; with reduced motion it never
  blinks. With focus elsewhere it is hollow, a 2 px haze outline, and steady. Both are 7.4:1
  against the worst-case glass. It replaces "a steady block in haze at 90% that never blinks".
- **Type**: JetBrains Mono, 14 px on 21 px lines with 20 px padding on desktop, 12.5 px on 19 px
  lines with 14 px padding on the pocket terminal, 12 on 18 below 375 px wide. The title bar and
  menu use Schibsted Grotesk, as in 005.
- **Command controls** (FR-015, FR-034): commands offered in the greeting and in replies are
  outlined chips, 26 px tall. Command names in `help`, names in `ls` and spec links are
  underlined, in rows 24 px tall so each has a 24 × 24 px target. Folders are periwinkle with a
  trailing slash, files are snow (FR-043).
- **Unknown command** (FR-016): the typed word in snow, then `: command not found` in rose, as
  bash starts its reply, `help` as a control, then the suggestions as chips. (Changed by the
  2026-10-29 amendment from "is not a command".)
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

## 2026-10-29 amendment

**Status**: Awaiting approval

The spec's amendment of 2026-10-29 (Clarifications, Session 2026-10-29; FR-008, FR-032, FR-049,
FR-067 to FR-075) changes the command line and adds the shell's states. They are drawn on the same
Penpot page, **006 Terminal — Glass**, in the approved look, and exported at 1× as before. Penpot
was reachable, so the interim provision on local mockups was not used and there is no
`mockup/` folder.

### New artifacts

| Artifact | Files |
|----------|-------|
| Desktop at 1440 × 900, 11 new states: focus elsewhere, a selection in the command line, select all, Ctrl+C, loading, failed to load, stopped by its limit, `ls` with the visitor's files, `rm` and `ls -l`, a pipe and a filter, a syntax error and "command not found" | `exports/desktop-10-cursor-unfocused-1440.png` to `exports/desktop-20-syntax-error-not-found-1440.png` |
| Phone at 375 × 812, the same 11 states | `exports/phone-8-cursor-unfocused-375.png` to `exports/phone-18-syntax-error-not-found-375.png` |
| Phone at 320 × 568, where wrapping is at risk: `help`'s standard commands, `ls -l`, a pipe and a filter | `exports/phone-19-after-help-320.png`, `exports/phone-20-permission-denied-320.png`, `exports/phone-21-pipe-and-filter-320.png` |
| The cursor and the selection: their states, proposed tokens and contrast checks | `exports/cursor-selection-1440.png` |
| Wireframes of each new state, with its site text, keyboard and screen-reader notes and forced colors | [wireframes.md](wireframes.md#states-added-by-the-amendment-of-2026-10-29) |
| Notes, proposed tokens and contrast checks | [README.md](README.md#the-cursor-and-the-selection-2026-10-29) |

### Re-exported artifacts

| Export | What changed |
|--------|--------------|
| `desktop-2-after-help-1440.png`, `phone-2-after-help-375.png` | `help` scrolled to its end: the standard commands group (FR-008) and the new prompt |
| `desktop-8-maximized-1440.png` | `help` now ends with the standard commands; the new prompt is just below the view |
| `desktop-4-after-unknown-command-1440.png` | The reply reads `wrok: command not found. …` (FR-016) |
| `desktop-9-menu-open-1440.png` | The cursor is hollow, as focus is in the menu (FR-072) |
| `glass-recipe-1440.png` | The cursor token is haze, not haze at 90%, and the cursor note reads "filled with focus, hollow without; blinks until 5 s after a key, never under reduced motion" |
| `desktop-1`, `-5`, `-6`, `-7`, `phone-1`, `-3`, `-4`, `-5`, `-6` | Re-exported with the cursor at full haze, its token, instead of 90%. Otherwise unchanged |

No export, old or new, shows a box, border or outline around the command line. The vim view's
exports (`desktop-3a` to `-3c`, `phone-7`) show no command line and came out unchanged.

### Changed decisions

- **Cursor**: replaces "a steady block that never blinks" (see Design decisions above).
- **No box around the command line**: its focus outline goes; every other control keeps 005's.
- **Selection**: new. Lilac behind, night text; the shell's indigo `color.selection` is 1.2:1 on
  the glass and doesn't show.
- **`help`**: the site's commands as before, then `Standard commands` and every command of FR-068
  by name, alphabetical, each a command control.
- **Unknown command**: bash's opening, `[typed]: command not found`.
- **`jq` and pipes**: the replies `jq here only pretty-prints` and `doesn't read piped input` go;
  jq's own errors and bash's behaviour take their place.
- **Contrast**: the new heading and the `guest` owner were tried in lilac (4.0:1) and take snow and
  haze, so every new text passes 4.5:1.

### Decisions for the owner

1. **New tokens**: `color.terminal-cursor-text`, `color.terminal-selection` and
   `color.terminal-selection-text`, all referring to existing base colors, and the motion tokens
   `motion.duration.cursor-blink` (1000ms) and `motion.duration.cursor-idle` (5000ms). See
   README.md.
2. **The greeting still says "read only"**, which FR-073 makes untrue: visitors can now make and
   change their own files. The exports keep the approved text. A proposal: desktop
   `cv-os terminal · a real shell · nothing you type leaves your browser`, phone
   `a real shell · stays in your browser` (`a real shell · in your browser` at 320 px).
3. **`bash: ` prefix**: bash starts both its syntax errors and "command not found" with `bash: `.
   FR-016 asks the reply to start with the typed word, so the design drops the prefix from both.
4. **Clicking a standard command in `help`** runs it, as FR-015 says of every name there, which for
   most of them prints a usage error. Running `help <name>` instead would be more useful but goes
   beyond FR-015.
5. **Which commands the standard group lists**: the 30 of FR-068. Shell builtins of FR-067, such as
   `export`, aren't commands of FR-068; FR-008 says no command may be missing from `help`, so the
   plan should say whether they are listed too.
6. **The shell failing to load**: the spec says only that the Terminal says so and offers a retry.
   The design keeps the prompt, keeps command lines run meanwhile waiting, and runs them after a
   successful try. The message assumes a connection problem.
7. **`ls -l`**: protected files belong to `root`. Folder names keep their trailing slash (FR-043),
   which GNU's `ls -l` doesn't print; SC-014's comparison with bash will need that exception.
8. **The blink's off half** shows no cursor, as a terminal's does. Focus is shown half of the time
   for at most 5 s after a key, then steadily.
9. **Phones**: Ctrl+C and Cmd+A need a hardware keyboard on a phone. The phone exports of those
   states assume one. The spec sets no phone-only way to cancel a line or select all.
10. **`help` exports**: `desktop-2` and `phone-2` now show `help` scrolled to its end, to show the
    standard commands; FR-019 still opens the output at its start. The maximized export no longer
    shows the new prompt.

11. **Found while checking, not changed**: lilac used as text, as the approved section headings
    and the vim view's key help heading use it, is 4.0:1 on the worst-case glass, under 4.5:1.
    The new states don't use lilac for text; the existing ones are left as approved.

### Original look (FR-031, SC-010)

- [ ] The cursor, the selection and the new states are drawn in the site's own tokens. No color,
  shape or behaviour is taken from macOS Terminal, iTerm, Ghostty or another terminal's look: the
  selection is the site's lilac, not a terminal's grey or light-blue band or swapped colors, and
  the cursor keeps the approved haze block.

### Sign-off

- Reviewed mockup version: Penpot page **006 Terminal — Glass**, as exported to `exports/` on
  2026-10-29
- Date:
- Approved by:
- Notes:
