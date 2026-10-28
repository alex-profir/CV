# Wireframes: The Requirement Inspector

These wireframes show structure, order and behavior only. The Penpot page
**007 Requirement inspector — Graphite** sets the visual design, and its exports are in
[exports/](README.md#exports).

The frames aren't to scale. Desktop frames stand for a 1440 × 900 browser window, phone frames for
375 px wide unless a frame says otherwise. The shell around each frame (menu bar, dock, window
frames, mobile header) is 005's, and the Terminal is 006's. Only what this feature adds is new.

Text in `[brackets]` is read from the repository when the site is built: spec numbers, titles and
statuses, requirement IDs and text, test names, file paths, line numbers and the commit. Everything
else is site text, set by this design (FR-009). The full list is under [Site text](#site-text).

## Legend

| Mark | Meaning |
|------|---------|
| `#===#` | The focused window, as in 005 |
| `+---+` | A window that isn't focused, a menu or a dock, as in 005 |
| `[x] [-] [^]` | 005's window controls: close, minimize, maximize |
| `(≡ Show specs)` | The "Show specs" control: an outlined pill with a small original sheet glyph (a page holding a two-line list) and its label |
| `< Back to [app]` | The control back to the app, at the top of the spec view |
| `(? What's this? v)` | The "What's this?" disclosure button. `v` when closed, `^` when open |
| `[● APPROVED]` | A spec's status: a filled dot and a solid outline. `[○ DRAFT]`: a hollow dot and a dashed outline. Shape, not color, carries the state |
| `>` | One test in a requirement's test list |
| `◌` | The hollow dashed mark before "No test covers this yet." |
| `↗` | A link to another site (the repository on GitHub) |
| `^ \| v` | The view's own scrollbar |

## Design values the spec leaves to the design

| Value | Set to | Spec |
|-------|--------|------|
| Where "Show specs" sits on desktop | At the right end of the window's title bar, 10 px from the window's right edge, centered in the 40 px bar. The title bar's right side is empty in 005, so the control covers nothing (FR-005). The same place for every app and for About this site | FR-001, FR-011 |
| "Show specs" on desktop | 24 px tall (`size.control`, the 24 px target of 005 FR-037), 8 px side padding, round ends (`radius.pill`), a hairline outline (`color.chrome-border`) on a faint fill, the sheet glyph (14 px) and the label `Show specs` in Schibsted Grotesk 12 / 500. Haze on a focused title bar (7.8:1), fog on one behind (6.1:1) | FR-001 |
| Where "Show specs" sits on mobile | At the right end of the full-screen view's 52 px header, 8 px from the edge, opposite Home. The visible label is `Specs` so the header's centered title has room at 320 px. The accessible name is still `Show specs for [app]`, which holds the visible label (WCAG 2.5.3) | FR-001, FR-019 |
| "Show specs" on mobile | A pill 33 px tall with 12 px side padding and round ends, the sheet glyph and `Specs` in Schibsted Grotesk 14 / 500. Its target is the header's full 52 px height and at least 44 px wide, as Home's is | FR-019 |
| "Show specs" while the spec view shows | Hidden. The spec view's own `< Back to [app]` takes its job, and its title says it shows specs. Going back puts "Show specs" back and focus on it (FR-017) | FR-002, FR-003 |
| Window title, header and page title while the spec view shows | Desktop title bar: `[app] · Specs`, such as `CV · Specs`, centered as 005's title is. Mobile header: the app's name with `SPECS` in small JetBrains Mono capitals below it, so the header keeps one short line per name at 320 px. Page title: `[app] · Specs – [Site name]` | FR-002 |
| The spec view's top bar | 40 px on desktop, 48 px on mobile, kept at the top while the view scrolls. `< Back to [app]` on the left, `(? What's this? v)` on the right, a hairline below. Its fill is 005's `color.chrome-solid` | FR-003, FR-009 |
| The spec view's surface | 005's window surface, `color.shell-surface`, in every app, the CV included. The light CV page turns into the dark shell surface, so the change of view is plain at a glance. In the Terminal's glass window the spec view has no surface of its own: the glass shows through, as the Terminal's own screen does (006) | FR-002, FR-021 |
| Reading width | The view's content is at most 760 px wide, from the left padding. Padding: 40 px in a window 700 px or wider, 24 px in a narrower window, 20 px on mobile | FR-020 |
| Requirement layout | Two columns while the view's content is at least 480 px wide: the short ID in a 64 px column, then the text, its spec link and its tests. Narrower (phones in portrait), the ID sits above the text | FR-007, FR-020 |
| A spec's heading row | Its number, title and status on one line. Below it, in JetBrains Mono 12, fog: how many of the spec's requirements the view doesn't list, `[n] more requirements in this spec aren't shown here` (`1 more requirement …`), then `Open the spec ↗`, a link to the top of the spec. When the view lists all of the spec's requirements, only the link shows. Removed requirements aren't counted | FR-006, FR-010 |
| Short ID form | `FR-###` inside a spec's group, in JetBrains Mono 13 / 500, periwinkle. Screen readers and links use the full ID, such as `004-cv-page-FR-001` | FR-007 |
| Requirement text | In full, in Schibsted Grotesk 14 on 22 px lines. Code shows in JetBrains Mono in haze. A reference to another requirement, such as `005 FR-013`, is a link to it, underlined | FR-007 |
| Spec link | `In the spec, line [n] ↗`, under the text | FR-007, FR-010 |
| Tests | A `TESTS · [n]` label in JetBrains Mono 11 capitals, then one row per test: the test's name as a link, its path and line below it in JetBrains Mono 11, fog. With none: `◌ No test covers this yet.` | FR-007, FR-008 |
| Status | `APPROVED`: a mint chip, a filled dot, a solid outline. `DRAFT`: an amber chip, a hollow dot, a dashed outline | FR-006 |
| Build line | Under the lede: `[n] requirements · [n] specs · built from [commit] ↗`, the commit as a link to it in the repository | FR-010, FR-013 |
| "What's this?" | A disclosure. Open, a raised panel (`color.shell-raised`, hairline edge, 8 px corners, `radius.menu`) at the top of the view's content, above the heading, pushing the rest down. It never covers anything | FR-009 |
| Offline note | A dashed hairline box under the build line: a crossed-out signal glyph and one sentence. Only offline | FR-027 |
| Uncommitted-changes note | The same dashed box, with an original glyph of a commit dot and an open ring, and one sentence. Only in a build from a copy with uncommitted changes, so never on the published site. With both notes, this one comes first | FR-010 |
| Showing and leaving the spec view | The content cross-fades over `motion.duration.fast` (150 ms) with `motion.easing.standard`. Nothing moves or scales, so reduced motion needs no other version, and the fade is dropped with it | FR-022 |
| The app's menu | `Show specs` follows the app's first command (Open the CV as a page, Clear output), in the same group. About this site's menu has it first. While the spec view shows it reads `Back to [app]`. No shortcut | FR-001, FR-003 |

## Desktop shell

### 1. The CV window with "Show specs" (FR-001, FR-005)

First load, as 005 sets it. The only change is the control at the right of the title bar.

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|                                                                                                  |
|              #====================================================================#              |
|              # [x] [-] [^]                  CV                    (≡ Show specs)  #              |
|              #====================================================================#              |
|              # Open as a page to print or share ->                              ^ #              |
|              # ---------------------------------------------------------------  | #              |
|              # [label]                                                          | #              |
|              # [NAME]                                                           | #              |
|              #                                                                  | #              |
|              # [summary ...............]     Based in      [city], [country]    | #              |
|              # [.......................]     Email                   [email]    | #              |
|              #   ... the CV, as 005 sets it                                     v #              |
|              #====================================================================#              |
|                                                                                                  |
|                                        +----------------+                                        |
|                                        |  [ CV icon ]   |                                        |
|                                        |       CV       |                                        |
|                                        |       •        |                                        |
|                                        +----------------+                                        |
+--------------------------------------------------------------------------------------------------+
```

- Nothing else of the inspector shows: no hint, badge or tooltip (FR-005).
- Tab order in the window: the title bar's controls, then "Show specs", then the app (see
  [Keyboard and focus](#keyboard-and-focus)).

### 2. The CV spec view (FR-002, FR-006, FR-007, FR-010)

After "Show specs". The window keeps its place, size, frame and controls. Its title reads
`CV · Specs`. Everything below the title bar is the spec view.

```
+--------------------------------------------------------------------------------------------------+
| [*]  CV   Window                                                                                 |
+--------------------------------------------------------------------------------------------------+
|              #====================================================================#              |
|              # [x] [-] [^]               CV · Specs                               #              |
|              #====================================================================#              |
|              # < Back to CV                                   (? What's this? v) #              |
|              # -------------------------------------------------------------------#              |
|              #   Specs for CV                                                   ^ #              |
|              #   Every requirement the CV app implements, grouped by spec. Each | #              |
|              #   one links to its line in the spec and to the tests that check  | #              |
|              #   it.                                                            | #              |
|              #   [24] requirements · [2] specs · built from [917c7a3] ↗         | #              |
|              #   ------------------------------------------------------------   | #              |
|              #   [004]  [The /cv Page]  [● APPROVED]                            | #              |
|              #   [36] more requirements in this spec aren't shown here ·        | #              |
|              #   Open the spec ↗                                                | #              |
|              #   FR-001  [/cv MUST show every section of the CV document ...    | #              |
|              #           ......................................................]| #              |
|              #           In the spec, line [408] ↗                              | #              |
|              #           TESTS · [1]                                            | #              |
|              #           > [/cv shows every supported section in the design's   | #              |
|              #             order, entries in the document's order]              | #              |
|              #             [packages/web/test/content.test.tsx]:[31]            | #              |
|              #   ............................................................   | #              |
|              #   FR-002  [For each supported section, the page MUST show ...]   | #              |
|              #           ...                                                    | #              |
|              #   ------------------------------------------------------------   | #              |
|              #   [005]  [The OS Shell]  [● APPROVED]                            | #              |
|              #   [63] more requirements in this spec aren't shown here · ...    | #              |
|              #   FR-006  ...                                                    v #              |
|              #====================================================================#              |
|                                     (dock, as in 1)                                              |
+--------------------------------------------------------------------------------------------------+
```

- The view lists every requirement any element of the CV app carries, and no other, grouped by
  spec in number order, each group in ID order, each requirement once (FR-006). Each group says
  how many of its spec's requirements aren't listed, so the view is never taken for the whole
  spec. The CV app's own
  frame and the "Show specs" control belong to the shell (About this site's view).
- The view scrolls inside the window. The top bar stays put.
- Focus moves to the heading `Specs for CV` (FR-017).
- Page title: `CV · Specs – [Site name]`.

### 3. "What's this?" open (FR-009)

The same view with the disclosure open. The panel sits at the top of the content and pushes the
heading down. It is the same in every spec view.

```
|              # < Back to CV                                   (? What's this? ^) #              |
|              # -------------------------------------------------------------------#              |
|              #   +--------------------------------------------------------------+ ^ #              |
|              #   | What's this?                                                 | | #              |
|              #   | This site is built spec first. Every feature starts as a     | | #              |
|              #   | spec in the site's repository: a list of numbered            | | #              |
|              #   | requirements, each one thing the site must do. Every part of | | #              |
|              #   | the interface that meets a requirement carries its ID, and   | | #              |
|              #   | every test that checks it names the ID too. A check on every | | #              |
|              #   | pull request makes sure nothing ships without both.          | | #              |
|              #   |                                                              | | #              |
|              #   | [Feature] > [Spec] > [Requirement FR-###] > [Interface] >    | | #              |
|              #   | [Tests]                                                      | | #              |
|              #   |                                                              | | #              |
|              #   | This view lists the requirements this app's interface        | | #              |
|              #   | carries, read from the repository when the site was built,   | | #              |
|              #   | with a link to each one in its spec and to the tests that    | | #              |
|              #   | check it.                                                    | | #              |
|              #   | The site's repository on GitHub ↗                            | | #              |
|              #   +--------------------------------------------------------------+ | #              |
|              #   Specs for CV                                                   | #              |
|              #   ...                                                            v #              |
```

- The chain `Feature > Spec > Requirement FR-### > Interface > Tests` is text in outlined boxes,
  read as one line: "Feature, then Spec, then Requirement, then Interface, then Tests". It wraps
  at narrow widths.
- The button is announced as expanded or collapsed. It stays open while the view shows, and
  closes when the visitor goes back.

### 4. The Terminal spec view beside the CV showing its app (FR-001, FR-004, FR-024)

The Terminal shows its specs in front. The CV window behind still shows the CV, with its own
"Show specs" in the colors of a window behind.

```
+--------------------------------------------------------------------------------------------------+
| [*]  Terminal   Window                                                                           |
+--------------------------------------------------------------------------------------------------+
|              +--------------------------------------------------------------------+              |
|              | [x] [-] [^]                  CV                    (≡ Show specs)  |              |
|              +--------------------------------------------------------------------+              |
|              | Open as a page to print or share ->                                |              |
|              | [label]                                                            |              |
|              | [NAME]                    #==============================================#      |
|              |                           # [x] [-] [^]     Terminal · Specs             #      |
|              | [summary ...........]     #==============================================#      |
|              | [...................]     # < Back to Terminal          (? What's this? v)#      |
|              | [...................]     #   Specs for Terminal                       ^ #      |
|              | [...................]     #   Every requirement the Terminal app ...   | #      |
|              |                           #   [40] requirements · [1] spec · built ... | #      |
|              |                           #   [006] [The Terminal] [● APPROVED]        | #      |
|              |                           #   [26] more requirements in this spec ...  | #      |
|              |                           #   FR-001  [The Terminal MUST be an app of  | #      |
|              |                           #           the OS shell (005 FR-003) ...]   | #      |
|              |                           #           In the spec, line [475] ↗        | #      |
|              |                           #           TESTS · [1]  > [...]             v #      |
|              +---------------------------#==============================================#      |
|                                  +-----------------------------+                                 |
|                                  |  [CV icon]   [Terminal icon] |                                 |
|                                  |     CV          Terminal     |                                 |
|                                  |     •              •         |                                 |
|                                  +-----------------------------+                                 |
+--------------------------------------------------------------------------------------------------+
```

- The Terminal's glass shows through its spec view. The text colors are the ones 006 checked on
  glass.
- The Terminal's output, history, half-typed command and vim view are kept while its specs show,
  and come back as they were (FR-003). Its keys do nothing while its command line is hidden; the
  shell's shortcuts still work.
- Showing or leaving one window's specs never changes another window (FR-004).

### 5. About this site's spec view: the shell's specs (FR-011)

About this site in front of the CV, showing the shell's specs. Its "Show specs" sat at the right
of its title bar, as on every app.

```
|              +--------------------------------------------------------------------+              |
|              | [x] [-] [^]                  CV                    (≡ Show specs)  |              |
|              +-----#=============================================#----------------+              |
|              | Ope # [x] [-] [^]  About this site · Specs        #                                 |
|              |     #=============================================#                                 |
|              |     # < Back to About this site (? What's this? v)#                                 |
|              |     #   Specs for the shell                     ^ #                                 |
|              |     #   Every requirement the shell itself      | #                                 |
|              |     #   implements: the menu bar, the dock, the | #                                 |
|              |     #   windows' frames and controls, the home  | #                                 |
|              |     #   screen, and these spec controls. ...    | #                                 |
|              |     #   [51] requirements · [2] specs · ...     | #                                 |
|              |     #   ---------------------------------------  | #                                 |
|              |     #   [005] [The OS Shell] [● APPROVED]        | #                                 |
|              |     #   [20] more requirements in this spec     | #                                 |
|              |     #   aren't shown here · Open the spec ↗     | #                                 |
|              |     #   FR-010  [The desktop shell MUST show a  | #                                 |
|              |     #           menu bar along the top, ...]    v #                                 |
|              |     #=============================================#                                 |
```

- The window is 005's 560 × 520, so the spec's count and link wrap below its title (the view's
  content is under 700 px wide).
- The heading is `Specs for the shell`, as About this site isn't an app. The window title is
  `About this site · Specs`.
- The list holds every requirement carried by an element outside every app's content: the menu
  bar and its menus, the desktop, the dock, the windows' frames and controls, the home screen, the
  full-screen views' headers, About this site, and the inspector's own controls (FR-011).

### 6. A draft spec with no tests yet (FR-006, FR-008)

The same view, scrolled to 007's own group. 007 is a draft, so its status is `DRAFT`, and its
requirements have no tests until it is built.

```
|              |     #   [007] [The Requirement Inspector]        ^ #                                 |
|              |     #         [○ DRAFT]                          | #                                 |
|              |     #   [29] more requirements in this spec     | #                                 |
|              |     #   aren't shown here · Open the spec ↗     | #                                 |
|              |     #   FR-001  [Every app MUST have a "Show     | #                                 |
|              |     #           specs" control at the top of its | #                                 |
|              |     #           window ... (005 FR-013) ...]     | #                                 |
|              |     #           In the spec, line [308] ↗        | #                                 |
|              |     #           TESTS                            | #                                 |
|              |     #           ◌ No test covers this yet.       | #                                 |
|              |     #   ..........................................| #                                 |
|              |     #   FR-003  [The spec view MUST hold, at its | #                                 |
|              |     #           top, a control ...]              v #                                 |
```

- `No test covers this yet.` is only possible in a draft spec (001 FR-015). The label reads
  `TESTS` with no count.

### 7. Offline (FR-026, FR-027)

The CV spec view with no network. Everything shows as it does online. One note, under the build
line, says the links need a connection.

```
|              #   Specs for CV                                                   ^ #              |
|              #   Every requirement the CV app implements, ...                   | #              |
|              #   [24] requirements · [2] specs · built from [917c7a3] ↗         | #              |
|              #   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +  | #              |
|              #   : (signal crossed out)  You're offline. Everything here is   :  | #              |
|              #   : saved on this device, but the links to GitHub need a       :  | #              |
|              #   : connection.                                                :  | #              |
|              #   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +  | #              |
|              #   ------------------------------------------------------------   | #              |
|              #   [004]  [The /cv Page]  [● APPROVED]   ...                      v #              |
```

- The note isn't announced by itself. It is read in order after the build line.
- Online the note is absent (FR-027). The links stay links offline: following one shows the
  browser's own offline page, as any link to another site does.

### 7b. A build with uncommitted changes (FR-010)

Only a local build from a copy with uncommitted changes shows this note. Published and
pull-request builds come from a commit, so they never do. The view shows the text as it is in that
copy, and its links lead to the last commit.

```
|              #   [24] requirements · [2] specs · built from [917c7a3] ↗         | #              |
|              #   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +  | #              |
|              #   : (commit glyph)  This build includes uncommitted changes.   :  | #              |
|              #   : Its links lead to the last commit, [917c7a3], so they may  :  | #              |
|              #   : not match what you see here.                               :  | #              |
|              #   + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +  | #              |
```

- Not drawn in Penpot: it is the offline note's box with another glyph and sentence, and the
  published site never shows it.

### 8. The CV menu with "Show specs" (FR-001, FR-003)

The app's menu in the menu bar holds the same command as the control.

```
+--------------------------------------------------------------------------------------------------+
| [*] [CV]  Window                                                                                 |
+-----+----------------------------------+---------------------------------------------------------+
|     | Open the CV as a page ->         |                                                         |
|     | Show specs                       |========================================================#|
|     +----------------------------------+           CV                         (≡ Show specs)   #|
|     | Move…             Alt+Shift+P    |========================================================#|
|     | Resize…           Alt+Shift+S    |r share ->                                              #|
|     +----------------------------------+                                                        #|
|     | Minimize          Alt+Shift+H    |                                                        #|
|     | Maximize          Alt+Shift+F    |                                                        #|
|     +----------------------------------+                                                        #|
|     | Close             Alt+Shift+W    |                                                        #|
|     +----------------------------------+                                                        #|
```

- While the CV shows its specs, the item reads `Back to CV`.
- The Terminal's menu: `Clear output`, `Show specs` (or `Back to Terminal`), then 005's window
  commands. About this site's menu: `Show specs` (or `Back to About this site`), then 005's.

## Mobile shell

### 1. The CV app with "Specs" (FR-001, FR-005)

```
+-----------------------------------+
| [< Home]        CV      (≡ Specs) |
+===================================+
| Open as a page to print or        |
| share ->                          |
| --------------------------------- |
| [label]                           |
| [NAME]                            |
|   ... the CV, as 005 sets it      |
+-----------------------------------+
```

- The header is 005's. "Specs" takes its empty right side and covers none of the app.

### 2. The CV spec view, 375 px (FR-002, FR-006, FR-007)

```
+-----------------------------------+
| [< Home]        CV                |
|                SPECS              |
+===================================+
| < Back to CV   (? What's this? v) |
+-----------------------------------+
| Specs for CV                    ^ |
| Every requirement the CV app    | |
| implements, grouped by spec.    | |
| Each one links to its line in   | |
| the spec and to the tests that  | |
| check it.                       | |
| [24] requirements · [2] specs · | |
| built from [917c7a3] ↗          | |
| ------------------------------- | |
| [004] [The /cv Page] [● APPROVED] |
| [36] more requirements in this  | |
| spec aren't shown here ·        | |
| Open the spec ↗                 | |
|                                 | |
| FR-001                          | |
| [/cv MUST show every section of | |
| the CV document ...]            | |
| In the spec, line [408] ↗       | |
| TESTS · [1]                     | |
| > [/cv shows every supported    | |
|   section in the design's ...]  | |
|   [packages/web/test/...]:[31]  v |
+-----------------------------------+
```

- Home still returns to the home screen, and the browser's Back does the same (005 FR-050). The
  app keeps showing its specs when opened again in the same visit (FR-004).

### 3. The pocket terminal's spec view, 375 px (FR-002)

The pocket terminal's case and keys give way to the spec view, below 006's glass header. The
Terminal's state is kept behind it.

```
+-----------------------------------+
| ‹ Home        Terminal            |
|                SPECS              |
+===================================+
| < Back to Terminal  (? What's ...)|
+-----------------------------------+
| Specs for Terminal              ^ |
| Every requirement the Terminal  | |
| app implements, ...             | |
| [40] requirements · [1] spec ·  | |
| built from [917c7a3] ↗          | |
| ------------------------------- | |
| [006] [The Terminal] [● APPROVED] |
| [26] more requirements in this  | |
| spec aren't shown here ·        | |
| Open the spec ↗                 | |
| FR-001                          | |
| [The Terminal MUST be an app of | |
| the OS shell (005 FR-003) ...]  v |
+-----------------------------------+
```

### 4. About this site's spec view, 375 px (FR-011)

```
+-----------------------------------+
| [< Home]   About this site        |
|                SPECS              |
+===================================+
| < Back to About this site  (? ...)|
+-----------------------------------+
| Specs for the shell             ^ |
| Every requirement the shell     | |
| itself implements: ...          | |
| [51] requirements · [2] specs · | |
| ------------------------------- | |
| [005] [The OS Shell] [● APPROVED] |
| FR-010                          | |
| [The desktop shell MUST show a  | |
| menu bar along the top, ...]    v |
+-----------------------------------+
```

- About this site's full-screen view gets "Specs" at the right of its header, as an app does.

### 5. The CV spec view, 320 × 568 (FR-020)

The same as at 375 px. The build line wraps after `built from`, and the header's two-line title
keeps clear of Home.

```
+------------------------------+
| [< Home]      CV             |
|              SPECS           |
+==============================+
| < Back to CV  (? What's th v)|
+------------------------------+
| Specs for CV               ^ |
| Every requirement the CV   | |
| app implements, ...        | |
| [24] requirements · [2]    | |
| specs · built from         | |
| [917c7a3] ↗                | |
| -------------------------- | |
| [004] [The /cv Page]       | |
| [● APPROVED]               | |
| FR-001                     v |
+------------------------------+
```

### 6. The CV spec view in landscape, 812 × 375 (FR-020)

The header and top bar keep their touch sizes. With the content over 480 px wide, requirements
use the two-column layout.

```
+-------------------------------------------------------------------------------+
| [< Home]                            CV                                        |
|                                    SPECS                                      |
+===============================================================================+
| < Back to CV                                              (? What's this? v)  |
+-------------------------------------------------------------------------------+
| Specs for CV                                                                ^ |
| Every requirement the CV app implements, grouped by spec. ...               | |
| [24] requirements · [2] specs · built from [917c7a3] ↗                      | |
| --------------------------------------------------------------------------  | |
| [004] [The /cv Page] [● APPROVED]                                           | |
| [36] more requirements in this spec aren't shown here · Open the spec ↗     | |
| FR-001  [/cv MUST show every section of the CV document ...]                v |
+-------------------------------------------------------------------------------+
```

## Keyboard and focus

### Tab order

- **In a window showing its app**: the title bar's controls (005), then "Show specs", then the
  app's content.
- **In a window showing its specs**: the title bar's controls, then `Back to [app]`, then
  `What's this?`, then the panel's link when it is open, then the view in reading order: the
  commit link, and for each spec its "Open the spec" link, then each requirement's links in
  order (references in its text, its spec link, its tests).
- **On mobile**: Home, "Specs", then the app; or Home, `Back to [app]`, `What's this?`, then the
  view.

The view itself is not a Tab stop. It scrolls with the arrow keys, Page Up, Page Down, Home and End
once focus is on its heading or inside it, as 005's window content does.

### Where focus goes

| After | Focus goes to |
|-------|---------------|
| "Show specs", from the control or the app's menu | The spec view's heading, `Specs for [app]` (FR-017) |
| `Back to [app]`, from the control or the app's menu | The window's "Show specs" (FR-017). If the app's menu was used and the window isn't focused, the window comes to the front first |
| Opening or closing "What's this?" | Stays on the button |
| Following a link | The browser's, as for any link. Coming back, focus is where it was |
| Mobile "Specs" | The spec view's heading |
| Mobile `Back to [app]` | The header's "Specs" |

No new shortcut. Escape does nothing in the spec view, as it does nothing to a window (005).

## Screen readers

| Element | Name, role and state announced |
|---------|--------------------------------|
| "Show specs" | Button `Show specs for [app]` (FR-001). On mobile its visible label is `Specs`; the name is the same |
| The spec view | A region named `[app] specs`, such as `CV specs` |
| Its heading | Heading `Specs for [app]`, one level below the window's name, as About this site's is in 005 (FR-018) |
| `Back to [app]` | Button `Back to [app]` |
| "What's this?" | Button `What's this?`, expanded or collapsed. The panel's own heading is one level below the view's |
| A spec's heading | Heading, one level below the view's: `[number] [title], [status]`, such as `004 The /cv Page, Approved`. The count of requirements not listed follows it as text, then the link `Open the spec` |
| A spec's requirements | A list. Each item starts with the full ID, such as `004-cv-page-FR-001`; the short `FR-001` is what shows |
| A requirement's tests | A list, after the text `Tests, [n]` or `No test covers this yet.` |
| Links | `In the spec, line [n]`, `Open the spec`, the test's name, the commit, each as a link that opens another site |
| The offline note | Plain text in reading order |
| The chain in "What's this?" | Read as one line: `Feature, then Spec, then Requirement, then Interface, then Tests` |

Announcements: none beyond focus moving to the heading. Showing or leaving a view is announced by
the focus move (FR-017).

## Reduced motion, forced colors and zoom

- **Reduced motion**: the content swaps with no fade. Without it, the swap is a 150 ms cross-fade.
  Nothing moves or scales in either case (FR-022).
- **Forced colors**: headings, text and links take the system colors, links stay underlined, the
  status chips and the offline note keep their outlines (solid or dashed) and their dots (filled
  or hollow), and "Show specs" keeps its outline. Nothing relies on a fill (FR-023).
- **Zoom**: at 200% the desktop shell gives way to the mobile shell (005), whose spec view reads at
  320 px. At 200% text-only zoom in a window, text wraps and the ID column grows taller, not
  wider. A long ID, test name or path wraps within its column (FR-020).

## Site text

Everything the inspector says that isn't read from the repository. Nothing here holds a CV fact
(FR-009).

| Where | Text |
|-------|------|
| The control | `Show specs` (desktop), `Specs` (mobile). Accessible name `Show specs for [app]` |
| App's menu | `Show specs`, `Back to [app]` |
| Window title, header, page title | `[app] · Specs`; on mobile `SPECS` below the name; `[app] · Specs – [Site name]` |
| The top bar | `Back to [app]`, `Back to About this site`, `What's this?` |
| Heading | `Specs for [app]`, or `Specs for the shell` in About this site |
| Lede, apps | `Every requirement the [app] app implements, grouped by spec. Each one links to its line in the spec and to the tests that check it.` |
| Lede, About this site | `Every requirement the shell itself implements: the menu bar, the dock, the windows' frames and controls, the home screen, and these spec controls. Each one links to its line in the spec and to the tests that check it.` |
| Build line | `[n] requirements`, `[n] specs` (`1 spec`), `built from` |
| A spec's heading | `[n] more requirements in this spec aren't shown here` (`1 more requirement in this spec isn't shown here`), `Open the spec`, `Approved`, `Draft` |
| A requirement | `In the spec, line [n]`, `Tests`, `No test covers this yet.` |
| "What's this?" | The heading `What's this?`; `This site is built spec first. Every feature starts as a spec in the site's repository: a list of numbered requirements, each one thing the site must do. Every part of the interface that meets a requirement carries its ID, and every test that checks it names the ID too. A check on every pull request makes sure nothing ships without both.`; the chain `Feature`, `Spec`, `Requirement FR-###`, `Interface`, `Tests`; `This view lists the requirements this app's interface carries, read from the repository when the site was built, with a link to each one in its spec and to the tests that check it.`; `The site's repository on GitHub` |
| Offline note | `You're offline. Everything here is saved on this device, but the links to GitHub need a connection.` |
| Uncommitted-changes note | `This build includes uncommitted changes. Its links lead to the last commit, [commit], so they may not match what you see here.` |
| Screen readers | `[app] specs`, `then`, as listed under Screen readers |
