# Design Review: The OS Shell

**Status**: Awaiting the owner's sign-off

**Design**: an interim local mockup, under Constitution 1.2.0's interim provision on local
mockups. Penpot can't be reached until at least 2026-10-26. The look is Graphite, chosen by the
owner on 2026-10-26 from four macOS-style directions: a dark shell, in the spirit of a Mac desktop,
around the CV app, which keeps `/cv`'s light look. The shells use `/cv`'s three fonts.

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

- **Look**: Graphite. A deep graphite wallpaper with soft indigo and teal glows and a faint dot
  grid. The menu bar and the dock are dark glass that blurs what is behind them. Windows have
  12 px corners, a hairline edge and a soft shadow. Menus and the move and resize pad are solid
  dark panels with 8 px and 12 px corners. A maximized window drops its corners and shadow.
- **Window controls**: close, minimize and maximize (restore), on the left of the title bar in
  that order, with the window's name centered, as on a Mac. Each is a 14 px circle in one
  neutral color, centered in a 24 × 24 px button (FR-037), with a line glyph: a cross, a dash,
  and two corners pulling apart (pushed in for restore). They are never three colors (FR-044).
  The owner considered red, yellow and green lights and kept the neutral circles, which FR-044
  allows.
- **Focused window**: a lighter title bar with brighter text, light circles that show their
  glyphs, a brighter edge and a deeper shadow. A window behind has a darker title bar and slate
  circles whose glyphs show under the pointer or keyboard focus. The glyphs carry the
  difference without color (FR-017). In forced colors the focused window gets a thicker border
  in the highlight color.
- **Site mark**: the site menu's title is an original mark, a small window over a lilac square.
- **CV icon**: an original glyph, a timeline of three dots and text bars on an indigo tile with
  14 px corners.
- **Type**: Space Grotesk, Schibsted Grotesk and JetBrains Mono, as on `/cv`. All three are under
  the SIL Open Font License, and none is an Apple or operating-system font (Constitution IX).
  Menus and title bars use Schibsted Grotesk. Shortcuts, labels and the move mode use JetBrains
  Mono.
- **Color and contrast**: text on the shell: primary 14.4:1 on a window and 13.3:1 on the
  focused title bar, secondary 6.8:1 on a window and 6.4:1 on a title bar behind, accent 8.5:1 on
  a window. White on the indigo menu selection is 9.9:1. Controls: the focused window's circles
  are 9.1:1 against the title bar, with glyphs at 10.4:1 on them; a window behind has circles at
  3.5:1. The CV app keeps `/cv`'s own colors. Glows, the dot grid, hairlines and shadows are
  decoration only.
- **Focus**: a 2 px periwinkle outline, 2 px outside the element: 7.4:1 on the focused title
  bar, 8.5:1 on a window and 9.7:1 on the wallpaper, so one color holds across the shell
  (FR-024).
- **States without color**: the focused window differs by its controls' glyphs, its title text
  and its shadow. The dock's open mark is a filled dot when open and a hollow dot when minimized
  (FR-011, FR-017).
- **The page shown without scripts**: unchanged, in `/cv`'s light look, as it leads to `/cv`.
- **Values the spec leaves to the design**: they are listed in
  [wireframes.md](wireframes.md#design-values-the-spec-leaves-to-the-design). They include the
  1024 × 640 desktop minimum, the window sizes, the `Alt+Shift` shortcuts (`Option+Shift` on a
  Mac), 16 px and 64 px keyboard steps and the move and resize pad.
- **Shortcuts**: the plan checks each key against what current browsers and screen readers
  reserve. If one clashes, the wireframes and this review are updated before code
  (Constitution II).
- **New tokens**: 85 proposed tokens, listed in [mockup/README.md](mockup/README.md#proposed-tokens):
  the Graphite color scale and its translucent colors, radii, shadows and sizes. The plan adds
  them to the hand-written token export. Motion reuses the existing tokens.

## Original look (FR-044, SC-011)

- [ ] No icon, glyph, wallpaper, font or window control in either shell comes from or traces an
  Apple asset. The site mark, the CV icon, the window controls' glyphs and the wallpaper are drawn
  for this site. The controls follow a Mac's placement and order, but in one neutral color, not
  three colored circles.

## Sign-off

- Reviewed mockup version: interim local mockup, Graphite, commit _to be filled in when it lands_ (`specs/005-os-shell/design/`)
- Date: _to be filled in by the owner_
- Approved by: _to be filled in by the owner_
- Notes: _to be filled in by the owner_
