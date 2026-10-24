# Design Review: The OS Shell

**Status**: Awaiting the owner's sign-off

**Design**: an interim local mockup, under Constitution 1.2.0's interim provision on local
mockups. Penpot can't be reached until at least 2026-10-26. The shells reuse `/cv`'s direction C,
Technical timeline: its colors, its three fonts and its plain, ruled look.

## What is reviewed

| Artifact | File |
|----------|------|
| Wireframes: every desktop and mobile state, the page shown without scripts, the design values the spec leaves to the design, keyboard and focus, screen readers and site text | [wireframes.md](wireframes.md) |
| Local mockup: one static page per state, with its styles and proposed tokens | [mockup/](mockup/README.md) |
| Exports: desktop at 1440 × 900, 11 states | `mockup/desktop-*-1440.png` |
| Exports: phone at 375 × 812 (home, CV app, About this site), 320 × 568 (home) and 812 × 375 (home, landscape) | `mockup/phone-*.png` |
| Exports: the page shown without scripts, at 1440 and 375 | `mockup/noscript-*.png` |
| Penpot file | Not needed for an interim local mockup. It is added in the provision's follow-up pull request |

## Design decisions

- **Look**: square corners, solid ink borders and hard offset shadows with no blur. The focused
  window has a 2 px ink border, an ink title bar and an 8 px shadow. A window that isn't focused
  has a 1 px border, a plain title bar and a light 4 px shadow. The menu bar, menus and dock are
  white panels with ink borders. The wallpaper is the page's background color with a 24 px grid
  in the rule color.
- **Window controls**: minimize, maximize (restore) and close, as outlined square buttons with
  line glyphs, on the right of the title bar. There are no colored circles (FR-044).
- **Site mark**: the site menu's title is an original mark, a small window with its hard shadow.
- **CV icon**: an original glyph, a timeline of three dots and text bars on the accent color, as
  on `/cv`.
- **Type**: Space Grotesk, Schibsted Grotesk and JetBrains Mono, as on `/cv`. All three are under
  the SIL Open Font License, and none is an Apple or operating-system font (Constitution IX).
  Shell labels, menus and title bars use JetBrains Mono.
- **Color and contrast**: the same five colors as `/cv`, plus white for the panels. Text and
  controls: paper on the ink title bar 17:1, ink on white 18.7:1, secondary text on the
  background 6.8:1 and on white 7.5:1, accent on white 9.9:1. The unfocused window's border is
  6.8:1. The grid and light rules (1.3:1) are decoration only.
- **Focus**: a 2 px accent outline, except on the ink title bar, where the accent is 1.9:1. There
  the outline is the background color (17:1) (FR-024).
- **States without color**: the focused window differs by border width, title bar and shadow.
  The dock's open mark is a filled dot when open and a hollow dot when minimized (FR-011,
  FR-017).
- **Values the spec leaves to the design**: they are listed in
  [wireframes.md](wireframes.md#design-values-the-spec-leaves-to-the-design). They include the
  1024 × 640 desktop minimum, the window sizes, the `Alt+Shift` shortcuts (`Option+Shift` on a
  Mac), 16 px and 64 px keyboard steps and the move and resize pad.
- **Shortcuts**: the plan checks each key against what current browsers and screen readers
  reserve. If one clashes, the wireframes and this review are updated before code
  (Constitution II).
- **New tokens**: 34 proposed tokens, listed in [mockup/README.md](mockup/README.md#proposed-tokens).
  The plan adds them to the hand-written token export. Motion reuses the existing tokens.

## Original look (FR-044, SC-011)

- [ ] No icon, glyph, wallpaper, font or window control in either shell comes from or traces an
  Apple asset. The site mark, the CV icon, the window controls' glyphs and the wallpaper are drawn
  for this site.

## Sign-off

- Reviewed mockup version: interim local mockup, commit `5b239d1` (`specs/005-os-shell/design/`)
- Date: _to be filled in by the owner_
- Approved by: _to be filled in by the owner_
- Notes: _to be filled in by the owner_
