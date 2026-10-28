# Wireframes: The OS Shell

These wireframes show structure, order and behavior only. The mockup sets the visual design, and
its exports go next to this file. Under the constitution's interim provision (1.2.0) that is a
local mockup in `mockup/`, until Penpot can be reached again.

The frames aren't to scale. Desktop frames stand for a 1440 × 900 browser window, phone frames for
375 px wide unless a frame says otherwise.

Text in `[brackets]` comes from the CV document. `[Site name]` is the owner's name from the CV
document, or the site heading `CV` when it has none, as on `/cv` (FR-066). Everything else is site
text, set by this design (FR-043). The full list is under [Site text](#site-text).

## Legend

| Mark | Meaning |
|------|---------|
| `#===#` | The focused window: a lighter title bar, light controls showing their glyphs, a brighter edge and a deeper shadow |
| `+---+` | A window that isn't focused (a darker title bar, slate controls without glyphs), a menu or a dock |
| `.....` `:` | A dotted outline: where a window was when a keyboard move or resize started |
| `[*]` | The site mark, the title of the site menu. An original mark, drawn in the mockup |
| `[Title]` | A menu title in the menu bar whose menu is open |
| `[x]` `[-]` `[^]` `[v]` | Window controls: close, minimize, maximize, restore. Small circles in one neutral color, on the left of the title bar in that order, with the window's name centered. Not three colored circles (FR-044) |
| `•` | Dock open mark, filled: the app is open |
| `◦` | Dock open mark, hollow: the app is open and its window is minimized |
| `^ \| v` | The window's own scrollbar |
| `->` | A link to a page on this site. `↗` is a link to another site |

## Design values the spec leaves to the design

The spec sets these "as the design sets". The mockup and its review confirm them.

| Value | Set to | Spec |
|-------|--------|------|
| Smallest window that gets the desktop shell | 1024 × 640 CSS px. Anything narrower or shorter gets the mobile shell | FR-001 |
| Order of apps in the dock and on the home screen | The order of the app list: CV first, then later apps as their specs add them | FR-003 |
| Menu bar height | 32 px | FR-010 |
| Space the dock keeps at the bottom | 104 px: the dock is 88 px tall, 8 px above the bottom edge, with 8 px between it and the desktop area | FR-010 |
| Desktop area | The window minus the menu bar and the dock's space: 1440 × 764 at 1440 × 900 | FR-010, FR-021 |
| CV window on first load and when opened | Centered, 24 px below the menu bar, 1000 px wide (at most the area's width minus 64), the area's height minus 48. At 1440 × 900 that is 1000 × 716 at x 220, y 56. When that box would cover a shown window's title bar, as when About this site is open, its top moves down 48 px at a time, its bottom edge staying where it is, until it covers no title bar, never shorter than the 300 px minimum. With no such box, the first whose title bar is on no other window's stands, or else the centered box. With About open alone at 1440 × 900, the CV opens 1000 × 668 at x 220, y 104 | FR-005, FR-018 |
| About this site window when opened | 560 × 520 (fitted to the area), 48 px right of and 48 px below the window in front, so that window's title bar stays visible. With no window open, it is centered like the CV window | FR-018 |
| Smallest window size | 400 × 300 px | FR-061 |
| Title bar height | 40 px. The controls are 24 × 24 px buttons with no space between them, each showing a 14 px circle and a 10 px glyph, 8 px from the window's left edge | FR-016, FR-037 |
| Resize handles | Every edge (8 px wide) and corner (16 × 16 px) inside the window. Each also reaches past the window's edge, 16 px for an edge and 8 px for a corner, so the pointer has 24 px. Nothing is drawn there. The bottom-right corner shows a grip | FR-061, FR-037 |
| Keyboard move and resize steps | 16 px per arrow key press, 64 px with Shift. The same steps for the on-screen buttons | FR-027, FR-062 |
| Non-dragging alternative for moving and resizing | Move… and Resize… in the window's menu open a control pad on the window, with one button per direction plus Done and Cancel. One click is one step. The same pad shows during a keyboard move or resize | FR-020, FR-062 |
| Dock names without hover | Every dock item shows its name below its icon all the time, so hover isn't needed on touch | FR-011 |
| Open mark | A dot below the dock item's name: filled when open, hollow when minimized, none when closed. Shape, not color, carries the state | FR-011, FR-063 |
| Focused window | A lighter title bar with brighter text, light controls that show their glyphs, a brighter edge and a deeper shadow. A window that isn't focused has a darker title bar, slate controls whose glyphs show only under the pointer or keyboard focus, and a lighter shadow. The glyphs make the difference without color, and in forced colors the focused window keeps a thicker border | FR-017 |
| CV layout inside a window | Two columns (headings on the left) while the window's content is at least 900 px wide, `/cv`'s own wide breakpoint (`breakpoint.wide`). Narrower, it uses `/cv`'s phone layout. The layout follows the window's width, not the screen's | FR-008 |
| Home screen grid | 64 px icons with names below, as many per row as fit at 76 px or more each: 4 at 375 px, 3 at 320 px, 10 at 812 px in landscape. Filled left to right | FR-031 |
| Focus indicator | A 2 px outline, 2 px outside the element, in the shell's periwinkle accent: 7.4:1 on the focused title bar, 8.5:1 on a window, 9.7:1 on the wallpaper. Inside the CV, `/cv`'s own indicator applies | FR-024 |
| Mobile header | 52 px, kept at the top while the app scrolls. A "Home" button (44 × 44 px) on the left, the app's name centered | FR-032, FR-037 |
| Wallpaper | One original wallpaper from tokens, proposed: a deep graphite with an indigo glow top left, a teal glow bottom right and a faint dot grid. Set by the mockup | FR-044 |
| Theme | One theme, Graphite: a dark shell (menu bar, dock, windows, menus, home screen) around the CV app, which keeps `/cv`'s light look. `/cv`'s fonts: Space Grotesk, Schibsted Grotesk, JetBrains Mono | FR-044 |
| Opening and closing animation | Windows and full-screen apps fade and grow from 96% over `motion.duration.fast` (150 ms) with `motion.easing.standard`. With reduced motion: the same fade with no movement or scaling | FR-046 |

## Desktop shell

### First load: the CV window open and focused (FR-005)

The CV window is open, focused and in front. Keyboard focus stays at the start of the page. The
menu bar shows the site menu, the focused window's name as its menu, and the Window menu. The
dock's CV item has a filled open mark.

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|              #====================================================================#              |
|              # [x] [-] [^]                           CV                           #              |
|              #====================================================================#              |
|              # Open as a page to print or share ->                              ^ #              |
|              # ---------------------------------------------------------------  | #              |
|              # [label]                                                          | #              |
|              # [NAME]                                                           | #              |
|              #                                                                  | #              |
|              # [summary ...............]     Based in      [city], [country]    | #              |
|              # [.......................]     Email                   [email]    | #              |
|              # [.......................]     [network]          [username] ↗    | #              |
|              # ===============================================================  | #              |
|              # 01            | o [start] – [end]                                | #              |
|              # Experience    | | [position]                                     | #              |
|              #               | | [company]                                      | #              |
|              #               | | [summary ...........................]          | #              |
|              #               | | -> [highlight]                                 | #              |
|              #               | o [start] – [end]                                | #              |
|              #               | | [position]  ... as on /cv                      | #              |
|              # ===============================================================  | #              |
|              # 02            | o [start] – Present                              | #              |
|              # Projects      | | [project name]                                 | #              |
|              #                                                                  v #              |
|              #====================================================================#              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- The CV window holds the whole CV, as `/cv` does (FR-006), below a link to `/cv` (FR-007). Its
  content scrolls inside the window, and the desktop never scrolls.
- The menu bar and the dock are never covered: windows stay between them (FR-010).
- Page title: `CV – [Site name]` (FR-042).

### The desktop with no window open (FR-013)

After the CV window is closed. The menu bar shows the site's name in place of a window's name,
and no window menu of its own. The Window menu stays. The dock's CV item has no open mark.

```
+--------------------------------------------------------------------------------------------------+
| [*]  [Site name]   Window                                                                        |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                 (wallpaper: the desktop area, empty)                             |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |  <- no open mark: the CV is closed     |
|                                        |                |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Focus moves to the CV item in the dock after the close (FR-023).
- Page title: `[Site name]`.

### Two windows: About this site in front of the CV (FR-017, FR-018, FR-038)

About this site opened from the site menu. It opens 48 px right of and below the CV window, so the
CV window's title bar stays visible. The CV window behind has a darker title bar and slate controls
without glyphs.
About this site has no dock item.

```
+--------------------------------------------------------------------------------------------------+
| [*]  About this site   Window                                                                    |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|              +--------------------------------------------------------------------+              |
|              | [x] [-] [^]                           CV                           |              |
|              +--------------------------------------------------------------------+              |
|              | Op#================================================#             ^ |              |
|              | --# [x] [-] [^]          About this site           #-----------  | |              |
|              | [l#================================================#             | |              |
|              | [N# About this site                              ^ #             | |              |
|              |   #                                              | #             | |              |
|              | [s# This is [name]'s CV, presented as a small    | #[country]    | |              |
|              | [.# operating system that runs in the browser.   | #  [email]    | |              |
|              | [.# It was built spec first: every feature has   | #ername] ↗    | |              |
|              | ==# public spec, a reviewed design and tests     | #===========  | |              |
|              | 01# that trace back to its requirements.         | #             | |              |
|              | Ex#                                              | #             | |              |
|              |   # Open the CV as a page ->                     | #             | |              |
|              |   # Source code, specs and history on GitHub ↗   | #..]          | |              |
|              |   #                                              | #             | |              |
|              |   # Keyboard shortcuts                           | #             | |              |
|              |   # Alt+Shift+M    Go to the menu bar            | #             | |              |
|              | ==# Alt+Shift+D    Go to the dock                | #===========  | |              |
|              | 02# Alt+Shift+N    Next window                   | #             | |              |
|              | Pr# ...            (full list below)             v #             | |              |
|              |   #================================================#             v |              |
|              +--------------------------------------------------------------------+              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Clicking anywhere in the CV window brings it to the front and focuses it (FR-017).
- The menu bar shows `About this site` as the focused window's name.

### A menu open: the site menu (FR-013, FR-015)

```
+--------------------------------------------------------------------------------------------------+
|[[*]] CV   Window                                                                                 |
++------------------------------+------------------------------------------------------------------+
|| About this site              |                                                                  |
|+------------------------------+===================================================#              |
|| Open the CV as a page ->     |                        CV                         #              |
|| Source code on GitHub ↗      |===================================================#              |
|+------------------------------+o print or share ->                              ^ #              |
|              # ---------------------------------------------------------------  | #              |
|              # [label]                                                          | #              |
|              # [NAME]                                                           | #              |
|              #                                                                  | #              |
|              # [summary ...............]     Based in      [city], [country]    | #              |
|              # [.......................]     Email                   [email]    | #              |
|              # [.......................]     [network]          [username] ↗    | #              |
|              # ===============================================================  | #              |
|              # 01            | o [start] – [end]                                | #              |
|              # Experience    | | [position]                                     | #              |
|              #               | | [company]                                      | #              |
|              #               | | [summary ...........................]          | #              |
|              #               | | -> [highlight]                                 | #              |
|              #               | o [start] – [end]                                | #              |
|              #               | | [position]  ... as on /cv                      | #              |
|              # ===============================================================  | #              |
|              # 02            | o [start] – Present                              | #              |
|              # Projects      | | [project name]                                 | #              |
|              #                                                                  v #              |
|              #====================================================================#              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Items: About this site, then the link to `/cv` and the link to the repository (FR-013).
- Choosing About this site while it is minimized restores it (FR-064).
- The menu closes when an item is chosen, on Escape, on a click outside, or when focus leaves it.
  Only one menu is open at a time (FR-015).

### The focused window's menu (FR-014, FR-027, FR-062, FR-063, FR-065)

Titled with the focused window's name. It holds the window's commands with their shortcuts
(FR-029). For About this site the first item is left out, and the rest are the same.

```
+--------------------------------------------------------------------------------------------------+
| [*] [CV]  Window                                                                                 |
+-----+----------------------------------+---------------------------------------------------------+
|     | Open the CV as a page ->         |                                                         |
|     +----------------------------------+==========================================#              |
|     | Move…             Alt+Shift+P    |                    CV                    #              |
|     | Resize…           Alt+Shift+S    |==========================================#              |
|     +----------------------------------+r share ->                              ^ #              |
|     | Minimize          Alt+Shift+H    |--------------------------------------  | #              |
|     | Maximize          Alt+Shift+F    |                                        | #              |
|     +----------------------------------+                                        | #              |
|     | Close             Alt+Shift+W    |                                        | #              |
|     +----------------------------------+     Based in      [city], [country]    | #              |
|              # [.......................]     Email                   [email]    | #              |
|              # [.......................]     [network]          [username] ↗    | #              |
|              # ===============================================================  | #              |
|              # 01            | o [start] – [end]                                | #              |
|              # Experience    | | [position]                                     | #              |
|              #               | | [company]                                      | #              |
|              #               | | [summary ...........................]          | #              |
|              #               | | -> [highlight]                                 | #              |
|              #               | o [start] – [end]                                | #              |
|              #               | | [position]  ... as on /cv                      | #              |
|              # ===============================================================  | #              |
|              # 02            | o [start] – Present                              | #              |
|              # Projects      | | [project name]                                 | #              |
|              #                                                                  v #              |
|              #====================================================================#              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- While the window is maximized, Maximize reads `Restore` and Move and Resize are unavailable,
  shown dimmed and announced as unavailable (FR-065).
- Shortcuts read `Option+Shift+…` on a Mac and `Alt+Shift+…` elsewhere.

### The Window menu, with one window minimized (FR-014, FR-026)

The CV window is minimized, and About this site is focused. The Window menu starts with the
commands Go to the menu bar, Go to the dock and Next window, each with its shortcut, so every
shortcut is shown next to a command in a menu (FR-029). Below them it lists every open
window: `✓` marks the focused one and `(minimized)` the minimized ones. Choosing the CV restores
it, in front and focused (FR-064).

```
+--------------------------------------------------------------------------------------------------+
| [*]  About this site  [Window]                                                                   |
+--------------------------+----------------------------------+------------------------------------+
|                          | Go to the menu bar  Alt+Shift+M  |                                    |
|                          | Go to the dock      Alt+Shift+D  |                                    |
|                          | Next window         Alt+Shift+N  |                                    |
|                  #=======+----------------------------------+=====#                              |
|                  #       |   CV              (minimized)    |     #                              |
|                  #=======| ✓ About this site                |=====#                              |
|                  # About +----------------------------------+   ^ #                              |
|                  #                                              | #                              |
|                  # This is [name]'s CV, presented as a small    | #                              |
|                  # operating system that runs in the browser.   | #                              |
|                  # It was built spec first: every feature has   | #                              |
|                  # public spec, a reviewed design and tests     | #                              |
|                  # that trace back to its requirements.         | #                              |
|                  #                                              | #                              |
|                  # Open the CV as a page ->                     | #                              |
|                  # Source code, specs and history on GitHub ↗   | #                              |
|                  #                                              | #                              |
|                  # Keyboard shortcuts                           | #                              |
|                  # Alt+Shift+M    Go to the menu bar            | #                              |
|                  # Alt+Shift+D    Go to the dock                | #                              |
|                  # Alt+Shift+N    Next window                   | #                              |
|                  # ...            (full list below)             v #                              |
|                  #================================================#                              |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |  <- hollow mark: open, minimized       |
|                                        |       ◦        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

### A window resized (FR-061)

The CV window after its bottom-right corner was dragged to make it narrower. Below 900 px of
content width the CV uses `/cv`'s phone layout, so it reads without scrolling sideways (FR-008).

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|              #====================================#                                              |
|              # [x] [-] [^]           CV           #                                              |
|              #====================================#                                              |
|              # Open as a page to print          ^ #                                              |
|              # or share ->                      | #                                              |
|              # -------------------------------  | #                                              |
|              # [label]                          | #                                              |
|              # [NAME]                           | #                                              |
|              #                                  | #                                              |
|              # [summary ..............]         | #                                              |
|              # [......................]         | #                                              |
|              # -------------------------------  | #                                              |
|              # Based in [city], [country]       | #                                              |
|              # Email              [email]       | #                                              |
|              # ===============================  | #                                              |
|              # 01                               | #                                              |
|              # Experience                       | #                                              |
|              # o [start] – [end]                | #                                              |
|              # | [position]                     | #                                              |
|              # | [company]                      | #                                              |
|              # | -> [highlight .......]         v #                                              |
|              #===================================//  <- grip: every edge and corner resizes;     |
|                                                         the bottom-right corner shows a grip     |
|                                                                                                  |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Every edge and corner resizes. A resize stops at the smallest window size (400 × 300) and at
  the edges of the desktop area (FR-061).
- Dragging a resize handle never moves the window, and dragging a control does nothing (spec:
  edge cases).

### A window minimized, with no other window open (FR-063)

```
+--------------------------------------------------------------------------------------------------+
| [*]  [Site name]   Window                                                                        |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                             (no window shown: the CV is minimized)                               |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |  <- hollow mark: open, minimized       |
|                                        |       ◦        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- The menu bar shows the site's name. The dock keeps the CV's open mark, now hollow, and its
  accessible name reads `CV, minimized`.
- Focus moves to the CV item in the dock. Enter there restores the window at its position and
  size (FR-064). About this site has no dock item, so when it is the one minimized, focus moves to
  the site menu's title.

### A window maximized (FR-065)

The CV window fills the desktop area. The menu bar and the dock stay visible. The maximize
control becomes restore (`[v]`, named `Restore CV`), and it returns the window to its earlier
position and size.

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|#================================================================================================#|
|# [x] [-] [v]                                         CV                                         #|
|#================================================================================================#|
|# Open as a page to print or share ->                                                          ^ #|
|# -------------------------------------------------------------------------------------------  | #|
|# [label]                                                                                      | #|
|# [NAME]                                                                                       | #|
|#                                                                                              | #|
|# [summary ...............]     Based in      [city], [country]                                | #|
|# [.......................]     Email                   [email]                                | #|
|# [.......................]     [network]          [username] ↗                                | #|
|# ===========================================================================================  | #|
|# 01            | o [start] – [end]                                                            | #|
|# Experience    | | [position]                                                                 | #|
|#               | | [company]                                                                  | #|
|#               | | [summary ...........................]                                      | #|
|#               | | -> [highlight]                                                             | #|
|#               | o [start] – [end]                                                            | #|
|#               | | [position]  ... as on /cv                                                  | #|
|# ===========================================================================================  | #|
|# 02            | o [start] – Present                                                          | #|
|# Projects      | | [project name]                                                             | #|
|#                                                                                              | #|
|#                                                                                              | #|
|#                                                                                              v #|
|#================================================================================================#|
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Dragging the title bar or an edge does nothing until the window is restored (FR-065).
- When the browser window changes size, the window keeps filling the desktop area.

### A keyboard move in progress (FR-027, FR-020)

Started with Move… in the window's menu, or `Alt+Shift+P`. The window moves as the arrow keys or
the pad's buttons are used. A dotted outline marks where it started. While moving, the title bar
shows `Moving` in place of its controls.

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|      ......................................................................                      |
|      :       #====================================================================#              |
|      :       # Moving                             CV                              #              |
|      :       #====================================================================#              |
|      :       # Open as a page to print or share ->                              ^ #              |
|      :       # ---------------------------------------------------------------  | #              |
|      :       # [label]                                                          | #              |
|      :       # [NAME]         #=====================================#           | #              |
|      :       #                # Moving CV                           #           | #              |
|      :       # [summary ......#                                     #ountry]    | #              |
|      :       # [..............#          [ Up ]                     #[email]    | #              |
|      :       # [..............# [ Left ]          [ Right ]         #name] ↗    | #              |
|      :       # ===============#         [ Down ]                    #=========  | #              |
|      :       # 01            |#                                     #           | #              |
|      :       # Experience    |# Arrows: 16 px   Shift+arrows: 64 px #           | #              |
|      :       #               |#                                     #           | #              |
|      :       #               |# [ Done  Enter ]  [ Cancel  Esc ]    #]          | #              |
|      :       #               |#=====================================#           | #              |
|      :       #               | o [start] – [end]                                | #              |
|      :       #               | | [position]  ... as on /cv                      | #              |
|      :       # ===============================================================  | #              |
|      :       # 02            | o [start] – Present                              | #              |
|      :       # Projects      | | [project name]                                 | #              |
|      ........#                                                                  v #              |
|      .  start#====================================================================#              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Enter or Done ends the move and announces `CV moved.` Escape or Cancel returns the window to
  the dotted outline and announces `Move cancelled.` (FR-041).
- A move stops when the title bar reaches the edge of the desktop area (FR-021).
- Focus stays on the pad. Tab moves between its buttons, and a click outside the window counts as
  Done.

### A keyboard resize in progress (FR-062)

Started with Resize… in the window's menu, or `Alt+Shift+S`. The window keeps its top-left
corner. Right and Down make it wider and taller, Left and Up narrower and shorter. The dotted
outline marks its size when the resize started. The pad shows the current size.

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|              #======================================================#..............              |
|              # Resizing                     CV                      #             :              |
|              #======================================================#             :              |
|              # Open as a page to print or share ->                ^ #             :              |
|              # -------------------------------------------------  | #             :              |
|              # [label] #=====================================#    | #             :              |
|              # [NAME]  # Resizing CV          776 × 596      #    | #             :              |
|              #         #                                     #    | #             :              |
|              # [summary#             [ Shorter ]             #ty  | #             :              |
|              # [.......# [ Narrower ]            [ Wider ]   #    | #             :              |
|              # [.......#             [ Taller ]              #    | #             :              |
|              # ========#                                     #==  | #             :              |
|              # 01      # Arrows: 16 px   Shift+arrows: 64 px #    | #             :              |
|              # Experien#                                     #    | #             :              |
|              #         # [ Done  Enter ]  [ Cancel  Esc ]    #    | #             :              |
|              #         #=====================================#..  | #             :              |
|              #               | | -> [highlight]                   | #             :              |
|              #               | o [start] – [end]                  v #             :              |
|              #======================================================#             :              |
|              :                                                                    :              |
|              :                                                                    :              |
|              :                                                                    :              |
|              :                                                                    :              |
|              ......................................................................              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        |                |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Enter or Done ends the resize and announces `CV resized to 776 by 596.` Escape or Cancel
  returns it to its earlier size and announces `Resize cancelled.`
- A resize stops at 400 × 300 and at the desktop area's edges.

### About this site, in a window (FR-038)

Its content, as seen in the two-window frame above, then the full list of shortcuts:

```
About this site                                              <- window heading

This is [name]'s CV, presented as a small operating system that runs in the browser. It was
built spec first: every feature has a public spec, a reviewed design and tests that trace back
to its requirements.

Open the CV as a page ->                                     <- /cv
Source code, specs and history on GitHub ↗                   <- the repository

Keyboard shortcuts                                           <- desktop only
-----------------------------------------------------------
Alt+Shift+M   Go to the menu bar
Alt+Shift+D   Go to the dock
Alt+Shift+N   Next window
Alt+Shift+W   Close window
Alt+Shift+H   Minimize window
Alt+Shift+F   Maximize or restore window
Alt+Shift+P   Move window
Alt+Shift+S   Resize window
-----------------------------------------------------------
On a Mac, use Option+Shift in place of Alt+Shift.
In menus and the dock, use the arrow keys, Enter and Escape.
```

## Mobile shell

### Home screen, portrait, 375 px (FR-031)

The site's name, centered, then the app grid, then About this site as a button at the bottom.
Nothing is in front of it.

```
+-----------------------------------+
|            [Site name]            |
|                                   |
| +-------+                         |
| | CV    | <- 4 per row            |
| | icon  |                         |
| +-------+                         |
|    CV                             |
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|         (wallpaper)               |
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|                                   |
|      ( (i) About this site )      |
|                                   |
+-----------------------------------+
```

- Tab order: the CV icon, then About this site, so an external keyboard opens the CV in 2 key
  presses (SC-002).
- The site's name is text, not a heading. The CV app holds the owner's name as its main heading
  (FR-009).
- Page title: `[Site name]`.

### Home screen, portrait, 320 px (FR-031)

```
+------------------------------+
|         [Site name]          |
|                              |
| +-------+                    |
| | CV    | <- 3 per row       |
| | icon  |                    |
| +-------+                    |
|    CV                        |
|                              |
|                              |
|                              |
|                              |
|         (wallpaper)          |
|                              |
|                              |
|                              |
|                              |
|                              |
|                              |
|   ( (i) About this site )    |
|                              |
+------------------------------+
```

### Home screen, landscape, 812 × 375 (FR-031)

A phone in landscape keeps the mobile shell (it is shorter than 640 px).

```
+-------------------------------------------------------------------------------+
|                                  [Site name]                                  |
|                                                                               |
| +-------+                                                                     |
| | CV    | <- 10 per row, left to right                                        |
| | icon  |                                                                     |
| +-------+                                                                     |
|    CV                                                                         |
|                                                 (wallpaper)                   |
|                                                                               |
|                                                                               |
|                            ( (i) About this site )                            |
|                                                                               |
+-------------------------------------------------------------------------------+
```

### The CV app, full screen (FR-032 to FR-035)

The header stays at the top while the CV scrolls. "Home" returns to the home screen in one tap,
with focus on the CV icon. Opening the CV again in the same visit shows it at the same scroll
position. The CV's layout is `/cv`'s phone layout.

```
+-----------------------------------+
| [<- Home]          CV             |
+===================================+
| Open as a page to print or        |
| share ->                          |
| --------------------------------- |
| [label]                           |
| [NAME]                            |
|                                   |
| [summary .....................]   |
| [.............................]   |
|                                   |
| --------------------------------- |
| Based in   [city], [country name] |
| --------------------------------- |
| Email              [email] (link) |
| --------------------------------- |
| ================================= |
| 01                                |
| Experience                        |
|                                   |
| o [start] – [end]                 |
| | [position]                      |
| | [company]                       |
| | -> [highlight ..............]   |
|   ... the rest of the CV, as /cv  |
|                                   |
+-----------------------------------+
```

- The home screen behind the app is hidden from the keyboard and screen readers (FR-035).
- The browser's Back button returns to the home screen, as Home does (FR-050).
- Page title: `CV – [Site name]`.
- In landscape the header and the CV keep this layout, at the wider width.

### About this site, full screen (FR-038)

The same header and Home control as an app. The text is the desktop's, without the shortcuts.

```
+-----------------------------------+
| [<- Home]    About this site      |
+===================================+
| About this site                   |
|                                   |
| This is [name]'s CV, presented as |
| a small operating system that runs|
| in the browser. It was built spec |
| first: every feature has a public |
| spec, a reviewed design and tests |
| that trace back to its            |
| requirements.                     |
|                                   |
| Open the CV as a page ->          |
|                                   |
| Source code, specs and history on |
| GitHub ↗                          |
|                                   |
| (no keyboard shortcuts on phones) |
|                                   |
|                                   |
+-----------------------------------+
```

## Without scripts (FR-049)

The site root without JavaScript: a short page in `/cv`'s design, with the name and label from the
CV document, a sentence and a link to `/cv`. It has no controls that need a script. If the CV
document has no name, the heading is the site heading `CV`.

### Desktop, 1440 px

```
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|   [label]                                                                                        |
|   [NAME]                                                                                         |
|                                                                                                  |
|   This site is a small operating system that runs in your browser, and it needs JavaScript.      |
|   The CV reads in full without it.                                                               |
|                                                                                                  |
|   Read the CV ->                                                                                 |
|                                                                                                  |
|                                                                                                  |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
|   How this page was built ↗                                                                      |
|                                                                                                  |
+--------------------------------------------------------------------------------------------------+
```

### Phone, 375 px

```
+-----------------------------------+
| [label]                           |
| [NAME]                            |
|                                   |
| This site is a small operating    |
| system that runs in your browser, |
| and it needs JavaScript. The CV   |
| reads in full without it.         |
|                                   |
| Read the CV ->                    |
|                                   |
|                                   |
|                                   |
|                                   |
+-----------------------------------+
| How this page was built ↗         |
|                                   |
+-----------------------------------+
```

## Keyboard and focus (FR-024 to FR-030, FR-036)

### Tab order on desktop

1. The menu bar: one Tab stop. Left and Right move between menu titles, and Enter, Space or Down
   opens a menu. In a menu, Up and Down move, Enter chooses, and Escape closes it and returns
   focus to its title.
2. The open windows, front to back. In each: the title bar, then its controls, then its content
   in reading order. Tab reaching a window behind brings it to the front (FR-030).
3. The dock: one Tab stop. Left and Right move between items, and Enter or Space activates one.

From first load, Tab 1 reaches the menu bar and Tab 2 the CV window (SC-002: at most 3). Focus
is never trapped. From the dock, Tab goes on to the rest of the page and the browser, and
Shift+Tab goes back.

### Shortcuts

The modifier is `Alt+Shift`, or `Option+Shift` on a Mac. The plan checks each key against the
shortcuts that current desktop browsers and screen readers reserve. If one clashes, this design
and its review change first (Constitution II).

| Keys | Command | Works |
|------|---------|-------|
| Alt+Shift+M | Go to the menu bar (its first menu title) | Anywhere |
| Alt+Shift+D | Go to the dock (its first item) | Anywhere |
| Alt+Shift+N | Next window: focus and bring to front the next window that isn't minimized | Anywhere |
| Alt+Shift+W | Close the focused window | A window is focused |
| Alt+Shift+H | Minimize the focused window | A window is focused |
| Alt+Shift+F | Maximize or restore the focused window | A window is focused |
| Alt+Shift+P | Start a keyboard move | A window is focused and not maximized |
| Alt+Shift+S | Start a keyboard resize | A window is focused and not maximized |
| Arrow keys, Shift+arrow keys | Move or resize by 16 px or 64 px | During a move or resize |
| Enter, Escape | Finish or cancel the move or resize | During a move or resize |

Escape never closes a window (spec: edge cases).

### Where focus goes

| After | Focus goes to |
|-------|---------------|
| First load | Stays at the start of the page (FR-005) |
| Opening a window, from the dock or a menu | The window's title (FR-040) |
| Closing or minimizing a window, with another window still shown | The window now in front |
| Closing or minimizing the CV, with no window left shown | The CV item in the dock |
| Closing or minimizing About this site, with no window left shown | The site menu's title |
| Closing a menu with Escape | The menu's title |
| Opening an app on the home screen | The app's header title |
| Going home, with Home or Back | The icon of the app that was open |

## Screen readers (FR-039 to FR-042)

| Element | Name and state announced |
|---------|--------------------------|
| Menu bar | `Menu bar` |
| Desktop area | `Desktop` |
| Dock | `Dock` |
| Dock item | `CV`, with `open` or `minimized` when it is |
| Window | Its app's name, such as `CV`. The focused window is announced as current |
| Close, minimize, maximize controls | `Close CV`, `Minimize CV`, `Maximize CV`, or `Restore CV` while maximized |
| Home screen | `Home screen` |
| Home control | `Home` |
| The page | Language English |

Announcements for changes that don't move focus (FR-041):

- `CV moved.`, `Move cancelled.`
- `CV resized to [width] by [height].`, `Resize cancelled.`
- `CV maximized.`, `CV restored.`

## Forced colors and zoom (FR-047, FR-048)

- Every window, menu, dock, pad and the menu bar keeps a visible border in forced colors, as
  shadows, glass and dark fills drop out. The focused window gets a thicker border in the
  system's highlight color, and each control's circle keeps an outline.
- The open marks are shapes (filled and hollow dots), and the focus indicator is an outline, so
  both survive forced colors.
- The wallpaper is decoration. Nothing relies on it or on a background color.
- At 200% zoom of a 1440 × 900 window the space is 720 × 450, below 1024 × 640, so the mobile
  shell shows. That's also true at 400% zoom of a 1280 px window (320 px). With text-only zoom at
  200% on the desktop shell, the menu bar and the title bars grow taller to fit their text, and
  dock names wrap rather than being cut off.

## Site text

Every piece of shell text that isn't CV content. Nothing here holds a CV fact (FR-043).

| Where | Text |
|-------|------|
| Site menu title (accessible name) | `Site menu` |
| Site menu items | `About this site`, `Open the CV as a page`, `Source code on GitHub` |
| Window menu | `Window`, `Go to the menu bar`, `Go to the dock`, `Next window`, `(minimized)` |
| Window's menu items | `Open the CV as a page`, `Move…`, `Resize…`, `Minimize`, `Maximize`, `Restore`, `Close` |
| App and window names | `CV`, `About this site` |
| CV app link to `/cv` | `Open as a page to print or share` |
| Move and resize pads | `Moving [window]`, `Resizing [window]`, `Up`, `Down`, `Left`, `Right`, `Narrower`, `Wider`, `Shorter`, `Taller`, `Done`, `Cancel`, `Arrows: 16 px`, `Shift+arrows: 64 px` |
| Title bar during a move or resize | `Moving`, `Resizing` |
| Mobile | `Home`, `About this site` |
| About this site | The paragraph, link texts and shortcut list above. `[name]` comes from the CV document |
| Landmarks and announcements | As listed under Screen readers |
| Page shown without scripts | `This site is a small operating system that runs in your browser, and it needs JavaScript. The CV reads in full without it.`, `Read the CV` |
| Site heading when the CV document has no name | `CV`, as on `/cv` |
