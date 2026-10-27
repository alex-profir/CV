# Design Review: The Terminal

**Status**: Look approved. The remaining states the spec's Design section lists are still to be
drawn in the same look before the design gate is met (see below).

**Design**: the Penpot page **006 Terminal — Glass** (file id
`eaccfa4c-8a01-81ad-8008-d441a46da254`). The Terminal is a frosted-glass window on 005's Graphite
desktop, with the feel of a modern GPU terminal such as Ghostty, drawn in the site's own tokens.

## What is reviewed

| Artifact | File |
|----------|------|
| Exports: desktop at 1440 × 900, the Terminal just opened and a session | `exports/desktop-*-1440.png` |
| Export: phone at 375 × 812, the pocket terminal | `exports/phone-pocket-375.png` |
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
- **Prompt**: two lines. A `guest` label in lilac joined to the working folder's path, then the
  time, and below it a mint `❯` and the command line. The path shows `~` for the home folder
  (FR-046).
- **Cursor**: a steady block in haze at 90%. It doesn't blink, so reduced motion needs no change.
- **Type**: JetBrains Mono, 14 px on 21 px lines with 20 px padding on desktop, 12.5 px on 19 px
  lines with 14 px padding on the pocket terminal. The title bar uses Schibsted Grotesk, as in 005.
- **Command controls** (FR-015): command names in the greeting and in replies are small chips
  with a periwinkle outline. Folders in `ls` are periwinkle with a trailing slash, files are snow
  (FR-043).
- **Unknown command** (FR-016): the typed word in snow, "is not a command" in rose, a pointer to
  `help`, then the suggestions as chips.
- **Window**: 760 × 536 px, opening at 600, 196 on a 1440 × 900 desktop. The controls, title and
  resize grip follow 005.
- **Dock icon**: an original glyph, a mint `❯` and a periwinkle `_` on a dark tile with a hairline
  edge.
- **Pocket terminal** (FR-024, FR-051): a glass handheld with a power light, a recessed screen,
  raised keys for `help`, `about`, `work`, `projects`, `cv`, `ls`, `clear` and an indigo
  `↵ type` key that opens the keyboard, then a speaker grille and the owner's name engraved.
- **Forced colors and reduced transparency**: the glass, sheen and blur drop out. The window
  falls back to `Canvas` and `CanvasText` with a solid border in forced colors, and to the solid
  `color.shell-surface` under `prefers-reduced-transparency`.
- **New tokens**: listed in [README.md](README.md#proposed-tokens).

## Original look (FR-031, FR-054, SC-010)

- [x] The Terminal takes the feel of a modern terminal (translucency, a title bar merged into the
  glass, generous padding, a block cursor), not any terminal's look. Its colors, prompt, window
  controls, icon and pocket terminal are drawn for this site in its own tokens. Nothing comes
  from or traces macOS's Terminal or Ghostty's default theme or icon.

## Still to draw before the design gate

The spec's Design section asks for these states too, in the approved look:

- ASCII wireframes of every state.
- Desktop: after `help`, after `cv`, after `specs`, maximized, and the Terminal's menu open.
- Mobile: after `help`, after `ls`, with the on-screen keyboard open, at 320 px wide and in
  landscape.
- The Penpot file's shareable link.

## Sign-off

- Reviewed mockup version: Penpot page **006 Terminal — Glass**, as exported on 2026-10-27
- Date: 2026-10-27
- Approved by: Alex Profir (project owner)
- Notes: Approved the look on review of the four exports.
