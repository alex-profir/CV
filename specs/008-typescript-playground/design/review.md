# Design Review: The TypeScript Playground

**Status**: Approved (mockup `1188830`). Amended 2026-10-30, extended 2026-10-31 (mockup `7d141a4`), and amended again 2026-10-31 (`wireframes.md` at `e24316a`): both amendments at the end are approved.

<!--
  Status moves from Draft to Approved only when the project owner signs off the design
  (Constitution II). Until then, no code is written for this feature.
-->

**Design**: an interim local mockup, under the constitution's interim provision on local mockups.
The Playground sits in the shell as it is today: 005's Graphite desktop and mobile shell, with
006's Terminal in the dock and 007's spec view. Its own look is a dark code surface in the shell's
colors, with the site's three fonts.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes: every desktop and mobile state, the design values the spec leaves to the design, the compiler options, the examples, the keys, accessibility and site text | [wireframes.md](wireframes.md) |
| Local mockup: one static page per state, with its styles and proposed tokens | [mockup/](mockup/README.md) |
| Exports: desktop at 1440 × 900, 24 states | `mockup/desktop-*-1440.png` |
| Exports: phone at 375 × 812 (home, best on a desktop, a shared link), 320 × 568 (best on a desktop, a shared link) and 812 × 375 (best on a desktop, landscape) | `mockup/phone-*.png` |
| Penpot file | Not needed for an interim local mockup. It is added in the provision's follow-up pull request |

## Design decisions

- **Name and icon**: **Playground**, after the CV app and the Terminal. The icon is braces around
  a play mark in night, on an amber-to-rose tile with the shell's 14 px corners. It is drawn for
  this site and copies no TypeScript, VS Code or Playground logo.
- **Window**: 1040 × 648 px, opened 64 px below the window in front and 40 px inside the right
  edge, so the CV window's title bar and app bar stay visible behind it.
- **Layout**: a toolbar (Run, Stop, then Examples, Options and Share, with the run's state at the
  right), any message under it, the editor on the left and a 400 px pane column on the right, and
  a status bar with the cursor's place, the error count and `TypeScript [version]`. Narrower than
  720 px, the panes go under the editor and the tools show only their glyphs.
- **Panes**: tabs in the pane column, JavaScript open first. Compiler options replace the pane
  column while open, so the editor stays in view as options change.
- **Popups and messages**: messages are one line under the toolbar with a glyph and a colored
  edge. Popups (stuck, Reset, Keys) dim only the Playground's window.
- **Editor**: JetBrains Mono 13 px on 20 px lines, a mint bar cursor, a wavy underline for errors
  and warnings, and the cursor line's message after the code. Hover cards, suggestions, quick
  fixes, the rename field and the command palette are the shell's raised panels.
- **Color and contrast** on the code surface (`#1b1c24`): code text 14.4:1, keywords 5.7:1, types
  11.5:1, functions 8.5:1, properties 10.4:1, strings 9.0:1, numbers 11.8:1, comments and line
  numbers 6.8:1. On the pane column (`#20212a`) the lowest is keywords at 5.4:1 and secondary text
  6.4:1; on raised panels (`#262732`), keywords 5.0:1. Night on the periwinkle Run and Share link
  buttons is 9.7:1, on the rose Stop and Reset 10.3:1. Text on the selection band is 8.4:1; rose
  on the error band 6.0:1. The focus outline is 8.5:1 on the code surface.
- **States without color**: errors are wavy underlines and crosses, warnings triangles; log levels
  are words with glyphs; the run's state is words with a dot, tick or square; the chosen tab,
  suggestion, fix and example have a 2 px edge as well as a band.
- **Compiler options**: `target` ES2022 and strict on with all its checks, the other checks off,
  `declaration` and `useDefineForClassFields` on. Options for modules, files, packages and JSX
  aren't offered (FR-024).
- **CV data**: `cv`, typed `Resume`, with no import. Three CV examples read it.
- **Keys**: VS Code's for the visitor's system. Run is `Cmd+Enter`, as the official Playground's.
  The command palette lists only F1, since Firefox keeps `Shift+Cmd+P`. Suggestions also take
  `Option+Escape` on a Mac. Format Document keeps `Shift+Option+F` once 005 is amended.
- **Phone**: one centered screen with the icon, a heading, a paragraph, Share link and Copy link.
  From a shared link, the heading says the link holds code and nothing runs.
- **New tokens**: listed in [mockup/README.md](mockup/README.md#proposed-tokens). Two base colors
  are new, both translucent washes of existing ones.

## Not reviewed here

- **005's amendment** (FR-086): its updated wireframes, the shell's list of shortcuts in About
  this site and 005's review sign-off come with the amendment, in this feature's pull request. The
  Playground menu above already shows Minimize and Maximize with no shortcut.
- **006's amendment** (FR-087) changes only the Terminal's text, `open playground` and `help`, so
  it has no design of its own.

## Original look (FR-068)

- [x] The Playground's look is the site's own. Its colors, toolbar, panes, messages, popups, icon
  and phone screen are drawn for this site in its tokens. It doesn't copy the official TypeScript
  Playground's look: not its header, its blue, its layout of tabs and sidebar, its logo or its
  editor theme. The editor works like VS Code, as the spec asks, but uses the site's own colors.

## Sign-off

- Reviewed mockup version: interim local mockup, `mockup/` at commit `1188830`
- Date: 2026-10-29
- Approved by: Alex Profir (project owner)
- Notes: Approved on review of the exports, with every recommended design value as drawn,
  and the owner confirms the look is original as recorded above. Changes found later are made as
  amendments.

## Amendment of 2026-10-30, extended 2026-10-31: approved

The second convergence (T192) found site text and states added or needed since the sign-off. These
are drawn in `wireframes.md` and in the new exports below. T195, T201's visible part, T204, T207
and T216 waited for the owner's signature, given 2026-10-31. The rows marked Built are already in the code, ahead
of the gate. On 2026-10-31 every string of `siteText.playground` was compared with the design,
leaving out plural forms and `{}` values, and what was missing added here (T205), so one signature
covers it.

| Change | Why | Export | Code |
|--------|-----|--------|------|
| The Playground stopped showing, with Try again | A failure while drawing stays in the window (FR-039, FR-040, T182) | `desktop-25-contained-1440.png` | Built |
| The `closed` note | `close()` ends the run and says why (FR-045, FR-048, T188) | `desktop-29-worker-closed-1440.png` | Built |
| The note for JavaScript that can't be read, and the parser's message | "Stopped unexpectedly" gave no reason (FR-033, FR-035, T195) | `desktop-28-cant-parse-1440.png` | Not built |
| The download stopped: the size is added | FR-011 requires it (T204) | `desktop-26-download-stopped-1440.png` | Not built |
| TypeScript won't open: a state of its own | "Arrived only in part" is untrue there (FR-011, T184, T204) | `desktop-27-wont-open-1440.png` | Not built |
| Share with… beside the desktop's link field | FR-052 offers the device's sharing (T201) | `desktop-30-link-field-1440.png` | Not built |
| The phone's link field | FR-052's field, missing on the phone (T201) | `phone-4-link-field-375.png`, `-320.png` | Not built |
| A run the browser ends: "Stopped unexpectedly", "Ran out of memory" | Built since the sign-off, drawn nowhere (FR-045, T205) | `desktop-31-crashed-1440.png`, `desktop-32-out-of-memory-1440.png` | Built |
| The empty Logs pane | The same (T205) | `desktop-33-no-logs-1440.png` | Built |
| `[circular]`, `(anonymous)`, `confirm`'s note | The same (FR-034, FR-043, T205) | `desktop-34-log-values-1440.png` | Built |
| "The Playground was reset…", "Code copied.", kept code's unknown option | The same (FR-080, FR-055, FR-019, T205) | `desktop-35-reset-done-1440.png`, `desktop-36-code-copied-1440.png`, `desktop-37-kept-options-1440.png` | Built |
| "Every option is at its default." | The same (FR-025, T205) | `desktop-38-options-default-1440.png` | Built |
| The whole list of keys, with the names as built, the second paragraph and the notes | `desktop-11` draws fewer commands under earlier names (FR-085, T205) | `desktop-39-keys-all-1440.png` | Built |
| The phone says the code is too long for a link | "Code copied." alone can be taken for the link (FR-055, FR-059, T216) | `phone-5-too-long-375.png`, `-320.png` | Not built |
| JavaScript only the browser refuses: the same note as `desktop-28`, with the browser's message | It ended as "Stopped unexpectedly" (FR-032, FR-035, T207) | Words in `wireframes.md` | Not built |
| Several messages due at once show in turn; what a reload brings after a failed write | One notice replaced another; the code stopped being kept (FR-019, T213, T214) | Words in `wireframes.md` | Built, no new words |
| Names and announcements: toolbar, log's line, panel's close, status bar, editor on Windows and Linux, the download's and the run's announcements | Site text heard, not seen, and nowhere in the design (FR-063 to FR-066, T205) | Listed under Site text in `wireframes.md` | Built |

The accessibility check gains the contained state when it can be reached by real input; see T192 in
`tasks.md`.

### Sign-off of the amendment

- Reviewed mockup version: interim local mockup, `mockup/` and `wireframes.md` at commit `7d141a4`
- Date: 2026-10-31
- Approved by: Alex Profir (project owner)
- Notes: Approved as drawn, every row of the table above, including the rows already built.

## Second amendment of 2026-10-31: approved

Signed below. Nothing here is built except where it says so.

| Change | Why | Export | Code |
|--------|-----|--------|------|
| The list of keys holds every key, in groups, with the words in `wireframes.md` under "The list of keys" | FR-085 says every key and lists 29 of about 75; three commands had no key at all (FR-084, T223) | `desktop-39-keys-all-1440.png`, redrawn from the table | Built (T223) |
| The desktop's Copy the code says the clipboard refused, in the phone's signed words | The button seemed to do nothing (FR-055, T225) | `desktop-40-code-refused-1440.png` (T230) | Built, no new words |

An owner decision comes with the first row: Monaco leaves Go to definition, Peek definition, Every use, Quick
fixes and Tab moves focus out of the command palette on every system, against FR-085's "every editor
command". The recommendation is to amend FR-085 to say the palette holds what the editor offers it
and the list holds every key, rather than rebuild Monaco's palette. Decided 2026-10-31: FR-085 is
amended so, as recommended.

### Sign-off of the second amendment

- Reviewed version: the rows above and `wireframes.md`'s "The list of keys", at commit `e24316a`
- Date: 2026-10-31
- Approved by: Alex Profir (project owner)
- Notes: Approved as proposed. `desktop-39-keys-all-1440.png` is redrawn from the agreed table, and
  T225's message gets its export, as T223 and T230 say; neither changes the agreed words.

## Awaiting sign-off

Neither row is built. Each needs the owner's signature here.

| Change | Why | Export | Code |
|--------|-----|--------|------|
| Undo on the broken link's message, where the Playground held the visitor's code | The first key after a broken link overwrites kept code, and the message offers no way back (FR-019, FR-056, T238) | `desktop-41-broken-link-undo-1440.png` | Not built |
| Eighteen more rows in the list of keys, under Monaco's own names, in the groups already signed: Create Folding Range from Selection · Delete All Left · Delete All Right · Find Next · Find Previous · Find with Selection · Fold All Block Comments · Fold All Except Selected · Fold All Regions · Go to Next Problem (Error, Warning, Info) · Go to Previous Problem (Error, Warning, Info) · Insert Line Below · Join Lines · Move Last Selection to Next Find Match · Remove Manual Folding Ranges · Toggle Fold Recursively · Transpose Letters · Unfold All Except Selected | Monaco binds keys to these and the signed table doesn't name them, so the list isn't yet "every key" (FR-085, T223). `keys.test.ts` holds them as `OUTSIDE_THE_TABLE` | Words here; `desktop-39` redrawn once signed | Not built |
| The list's last line, "Every command is in the command palette, F1, with its key." | Untrue since FR-085's amendment: five commands aren't in the palette. Proposed: "The command palette, F1, lists the commands the editor offers it, with their keys." | Words here | Not built |
