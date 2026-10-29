# Design Review: The OS Shell

**Status**: Approved

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
  grid. The menu bar and the dock are dark glass that blurs what is behind them. Since
  2026-10-28 the dock's glass also has a rim, a sheen and, where the browser can draw it, bending
  edges (see the changes after sign-off). Windows have
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

- [x] No icon, glyph, wallpaper, font or window control in either shell comes from or traces an
  Apple asset. The site mark, the CV icon, the window controls' glyphs and the wallpaper are drawn
  for this site. The controls follow a Mac's placement and order, but in one neutral color, not
  three colored circles.

## Changes after sign-off

- **2026-10-27, the Window menu's commands**, at the owner's request after `/speckit-analyze`
  (finding B1). FR-029 asks for every shortcut to be shown next to its command in the menus, but
  Go to the menu bar (`Alt+Shift+M`) and Go to the dock (`Alt+Shift+D`) had no menu command. The
  Window menu now starts with both, above Next window, each with its shortcut, in the menu's
  existing style. Changed: [wireframes.md](wireframes.md) (the Window menu frame and its site
  text), `mockup/desktop-window-menu.html` and its export `mockup/desktop-window-menu-1440.png`.
  No other state, value or token changes.
- **2026-10-27, focus after closing About this site** (finding C2): the wireframes' focus table
  now says that closing About this site, like minimizing it, with no window left shown, moves
  focus to the site menu's title, as FR-023 now says.
- **2026-10-28, the resize handles' reach** (T127, after `/speckit-converge`). The handles were
  8 px edges and 16 × 16 px corners, pointer targets under FR-037's 24 px. Each now reaches on past
  the window's edge, 16 px for an edge and 8 px for a corner, so the pointer has 24 px. Nothing
  drawn changes: the part inside the window and the grip stay where they were, and the window's
  look matches the exports. Changed: [wireframes.md](wireframes.md) (the resize handles row). No
  state, mockup, export or token changes. Confirmed by the owner on 2026-10-28.
- **2026-10-28, the CV window opened while About this site is open** (T131, after
  `/speckit-converge`). The CV always opened centered, so with About open alone (centered the
  same way) the CV's title bar covered About's, against FR-018. The CV still opens centered when
  that box covers no shown window's title bar, so first load and the empty desktop don't change.
  Otherwise its top moves down 48 px at a time, its bottom edge staying where it is, until it
  covers no title bar, never shorter than 300 px. Stepping right as About does can't help: at
  1000 px wide the CV has no room to move sideways. At 1440 × 900 with About open the CV opens
  1000 × 668 at x 220, y 104. Changed: [wireframes.md](wireframes.md) (the CV window row). No
  state, mockup, export or token changes. Confirmed by the owner on 2026-10-28.
- **2026-10-28, the Tab order between windows** (T124). The design said Tab visits the open
  windows front to back, but the windows keep the order they were opened in when one is raised,
  as T079 found that following the stacking sends Tab back and forth between two windows for ever
  (FR-030). The owner confirms the shipped order: newest first, and Tab reaching a window behind
  brings it to the front. Changed: [wireframes.md](wireframes.md) (item 2 of "Tab order on
  desktop"). No state, mockup, export or token changes.
- **2026-10-28, the focus indicator in menus and on a window** (T122, the owner's design
  comparison). In a menu, the focused item's outline, 2 px outside it, covered the menu's edge and
  the next item, and the item under the pointer was filled as well, so two items showed at once.
  The pointer now moves focus onto the item it's over, so one item is marked. A menu item's
  outline sits on its edge, with 2 px between items and the menu's padding from 4 px to 6 px, so
  it clears the menu's edge and the next item while keeping WCAG 2.4.13's area (an outline inside
  the item falls short). A window's content that took focus (browsers that let Tab reach a
  scrolling area) drew its outline under the title bar and over the window's edge; the whole
  window now shows it, around its title bar and corners. Safari drew the content's scroll bar
  past the window's rounded bottom corner; it is clipped to the corner now. Changed:
  [wireframes.md](wireframes.md) (the focus indicator row). The menu's exports keep 4 px and no
  gap; no state or token changes. At the owner's request.

- **2026-10-28, windows move behind the dock and past the screen's edge**, at the owner's request,
  with the spec's clarifications of 2026-10-28 (FR-010, FR-021, FR-061, FR-067). A move stopped
  when the title bar reached the desktop area's edge, and the window was cut off above the dock.
  Now, as on a Mac, a window passes behind the dock, which stays in front and usable, and past
  the left, right and bottom edges. Its title bar stays between the menu bar and the dock's
  space, and at least 120 px of it stays on screen sideways. A resize's dragged edge stops at the
  menu bar and the browser window's edges, and a bottom edge passes behind the dock. When keyboard
  focus moves to an element the dock or an edge hides, the window moves just far enough to show
  it. Added: the state "A window moved behind the dock and past the screen's edge" in
  [wireframes.md](wireframes.md), `mockup/desktop-past-edge.html` and its export
  `mockup/desktop-past-edge-1440.png`, and a `past-edge` placement in `mockup/shell.css`. Changed:
  [wireframes.md](wireframes.md) (three design values, the first-load notes and the resize
  notes). No other state, export or token changes. Confirmed by the owner on 2026-10-28.
- **2026-10-28, the dock's glass and the minimize and maximize animations**, at the owner's
  request, with the spec's clarifications of 2026-10-28 (FR-068 to FR-071). The dock was dark
  glass that blurred what was behind it, at a 55% tint, which a white window behind it (now
  possible, FR-010) would bring to 3.5:1 for its names. It is now a glass in the spirit of
  current macOS, drawn for this site: a 70% tint (5.9:1 over white), the color behind lifted, a
  light rim and a sheen, and, where the browser can draw it, edges that bend what is behind as a
  lens does. Other browsers show the same glass without the bending, and reduced transparency
  shows a solid dock. The menu bar, the menus and the phone shell are unchanged. Minimizing now
  shrinks the window into its dock item behind the dock, and maximizing grows it to fill the
  desktop, each over 250 ms, played backwards on restore. Added: the state "A window minimizing
  into the dock" in [wireframes.md](wireframes.md), `mockup/desktop-minimizing.html` and its
  export, the dock's glass and `#dock-lens` in `mockup/shell.css` and every desktop page, and 7
  proposed tokens in `mockup/proposed-tokens.css`. Changed: [wireframes.md](wireframes.md) (three
  new design values). Every desktop export is rendered again, as each shows the dock: apart from
  the dock, they differ from the earlier exports only in text anti-aliasing, from a different
  renderer. Confirmed by the owner on 2026-10-28.

## Sign-off

- Reviewed mockup version: interim local mockup, Graphite, commit `4d2e29f` (`specs/005-os-shell/design/`)
- Date: 2026-10-26
- Approved by: Alex Profir (project owner)
- Amended: 2026-10-27 and 2026-10-28, by the changes above, the first two and the last two at the
  owner's request. The owner confirmed every change on 2026-10-28.
- Notes: Approved in review of the exports, with the neutral window controls rather than colored
  lights. Under Constitution 1.2.0's interim provision on local mockups, this approval stands on
  the local mockup and its exports. The design is rebuilt in Penpot and linked in the provision's
  follow-up pull request.
