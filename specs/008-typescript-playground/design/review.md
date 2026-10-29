# Design Review: The TypeScript Playground

**Status**: Approved

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
