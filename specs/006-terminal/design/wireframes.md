# Wireframes: The Terminal

These wireframes show structure, order and behavior only. The Penpot mockup sets the visual
design, and its exports are in [exports/](exports/). The frames aren't to scale. Desktop frames
stand for a 1440 × 900 browser window, phone frames for 375 × 812 unless a frame says otherwise.

Text in `[brackets]` comes from the CV document or the repository when the site is built.
Everything else is site text, set by this design (FR-030). The full list is under
[Site text](#site-text).

## Legend

005's legend holds. These marks are new:

| Mark | Meaning |
|------|---------|
| `(guest)(~)` | The prompt's first line: a `guest` label joined to the working folder's path, then the time the prompt appeared |
| `❯ ` | The prompt's second line, before the command line or an earlier command |
| `█` | The cursor: a steady block at the end of the command line |
| `‹help›` | A command control (FR-015): a button that runs the command. Drawn as a small outlined chip |
| `_work/_` | A command control inside output: an underlined name. Folders are periwinkle with a trailing slash, files are plain (FR-043, FR-050) |
| `_name ↗_` | A link to another site |
| `── SECTION ──` | A section heading in a command's output |
| `[ key ]` | A command key of the pocket terminal (FR-051) |
| `^ \| v` | The output's own scrollbar |
| `+--  16 lines: "work": [ ····` | A closed fold in the vim view: a control that opens it |
| `[NORMAL]` | The vim view's mode, in a mint pill at the start of its status line |

## Design values the spec leaves to the design

| Value | Set to | Spec |
|-------|--------|------|
| Look | Frosted glass on 005's Graphite desktop: what is behind the window blurred by 32 px, the window color at 88% over it, a faint sheen at the top, a hairline rim. The title bar is part of the glass, with no rule under it. See [README.md](README.md#the-glass) | FR-031 |
| Fixed-width font | JetBrains Mono, the site's own (004 FR-045). 14 px on 21 px lines on desktop, 12.5 px on 19 px lines on the pocket terminal (12 on 18 below 375 px wide) | FR-031, Assumptions |
| Terminal window when opened | 760 × 536 px. Its right edge 40 px inside the desktop area's right edge, its top 120 px below the top of the window in front, so that window's title bar stays visible. Fitted to the area, at least 24 px above its bottom and never below 400 × 300. With no window open, centered in the area. At 1440 × 900 with the CV window open: x 640, y 176 | FR-003, 005 FR-018 |
| Padding | 20 px on desktop (24 px maximized), 14 px on the pocket terminal's screen (12 px below 375 px wide) | FR-031 |
| Rows holding command controls | 24 px tall, so every control in `help`, `ls` and `specs` has a 24 × 24 px target (FR-034). Chips are 26 px tall | FR-034 |
| Greeting and prompt | See [Site text](#site-text). The greeting's name and label come from the CV document | FR-005, FR-030 |
| Order of the home folder in `ls` | `cv.json`, `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme`, `specs/`: the whole CV, its parts in `/cv`'s order, then the site | FR-043 |
| Command line limit | 500 characters. Typing or pasting past it adds nothing more | FR-017 |
| Cursor | A steady block that never blinks, with or without reduced motion | FR-032 |
| Terminal menu | Titled `Terminal`. It holds `Clear output` (no shortcut), then 005's window commands with their shortcuts | FR-003, FR-019 |
| Dock and home screen icon | An original glyph: a mint `❯` and a periwinkle `_` on a dark tile with a hairline edge. After the CV app | FR-001, FR-031 |
| Command keys | 8 keys in this order: `help` (indigo, the way in), `about`, `work`, `projects`, `skills`, `cv`, `ls`, `clear`. At least 44 × 44 px: 52 px tall in portrait, 48 px below 375 px wide, at least 44 px in landscape | FR-051 |
| Pocket terminal layout | Height ≥ width: the screen above, the keys below in 4 columns. Width > height: the screen on the left, the keys on the right in 2 columns of 4. The case fills the space below the header with an 8 to 14 px margin, at most 560 px wide in portrait and 900 px in landscape, centered | FR-024, FR-052 |
| Device it evokes | A small handheld terminal of the site's own design: a glass case, a power light, a recessed screen, raised keys, a speaker grille and the owner's name, from the CV document, engraved (drawn only where it fits). It copies no real device | FR-054 |
| On-screen keyboard open | The keys hide and the screen grows to fill the space above the keyboard, so the command line and the newest output stay in view. When the keyboard closes, the keys come back | FR-053 |
| Output color | Commands and CV text in snow and haze, dates and descriptions in fog, controls and links in periwinkle, section headings in lilac, the prompt mark in mint, "is not a command" in rose. Slate is never used for text | FR-031, FR-035 |
| Vim view | Fills the Terminal window's content, or the pocket terminal's screen. A 4-character line-number gutter (3 on the phone), the text, then a 24 px status line and a 28 px message line (26 on the phone). Text 14 on 21 px, as the Terminal's. Long lines wrap at a space, continuations indented 2 past the line's own indent. Opens with each top-level section folded and the cursor on the first fold | FR-058, FR-061, FR-063 |
| Vim view colors | Keys periwinkle, strings haze, numbers amber, `true`, `false` and `null` rose, punctuation and line numbers fog, the cursor line's number snow. Fold lines periwinkle on a faint band. Search matches on amber at 20%, the current one at 42% with an amber outline. The cursor a haze block with the character under it in night | FR-056, FR-062 |
| Vim view status line | `NORMAL` (mint) or `HELP` (lilac) pill, the file name, `[RO]` and the pipe that opened it; on the right the file type, `line,column` and `Top`, `Bot`, `All` or a percentage | FR-058, FR-059 |
| Vim view controls for pointers | `:help` and `:q` chips at the right of the message line, fold lines, and on the phone the vim keys | FR-061, FR-064, FR-066 |
| Vim keys on the pocket terminal | `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `:q` (mint, the way out), in the command keys' places; the case reads `cv-os pocket · vim keys` | FR-066 |
| Forced colors and reduced transparency | The glass, sheen and blur drop out. Forced colors: `Canvas` and `CanvasText`, a solid border, chips and keys outlined, the cursor in `Highlight`. Reduced transparency: the solid `color.shell-surface` | FR-033 |

## Desktop shell

### Just opened, beside the CV window (FR-003 to FR-005)

The Terminal opens in front of the CV window, focused, with keyboard focus in the command line.
The menu bar shows the site menu, `Terminal` and `Window`. The dock's Terminal item, after CV, has
a filled open mark. Export: `exports/desktop-1-just-opened-1440.png`.

```
+--------------------------------------------------------------------------------------------------+
| [*]  Terminal   Window                                                                           |
+--------------------------------------------------------------------------------------------------+
|              +----------------------------------------------------------------------+            |
|              | [x] [-] [^]                         CV                               |            |
|              +----------------------------------------------------------------------+            |
|              | [label]                                                              |            |
|              | [NAME]                                                               |            |
|              |                            #==================================================#  |
|              | ---------------------------# [x] [-] [^]       Terminal — ~                    #  |
|              | Location                   #                                                  #  |
|              | Email                      # cv-os terminal · read only · nothing you type    #  |
|              | GitHub                     #   leaves your browser                            #  |
|              |                            # [Name] — [label]                                 #  |
|              | [summary ...........]      # This is my CV as a terminal. Type a command and  #  |
|              | [...................]      # press Enter, or pick one to start. New here?     #  |
|              |                            # Try _help_.                                      #  |
|              | EXPERIENCE                 # ‹help› ‹about› ‹work› ‹projects› ‹cv›            #  |
|              | ---------------------------#                                                  #  |
|              | [position] · [company]     # (guest)(~) ◷ 18:25                               #  |
|              |                            # ❯ █                                              #  |
|              |                            #                                                  #  |
|              +----------------------------#                                                  #  |
|                                           #==================================================#  |
|                                        +-----------------------+                                 |
|                                        |  [ CV ]  [ ❯_ ]       |                                 |
|                                        |    CV    Terminal     |                                 |
|                                        |    •       •          |                                 |
|                                        +-----------------------+                                 |
+--------------------------------------------------------------------------------------------------+
```

- The window is glass: the CV window and the wallpaper show through it, blurred.
- Page title: `Terminal – [Site name]` (005 FR-042).
- The frames below show the Terminal window alone. The desktop around it is as in this frame.

### After `help` (FR-008, FR-015, FR-019)

The command sits at the top of the view and the output scrolls inside the window. Every command
and alias is a control. Export: `exports/desktop-2-after-help-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
#                                                                ^ #
# (guest)(~) ◷ 18:25                                             | #
# ❯ help                                                         | #
# Click a command to run it, or type it. Join commands with |.   | #
# _help_ [command]  _?_          Every command, or one command's | #
#                                own help                        | #
# _about_  _whoami_              Name, role, location and summary| #
# _work_  _experience_           Every role                      | #
# _projects_                     Every project                   | #
# _education_                    Every school and degree         | #
# _skills_                       Every skill with its level and  | #
#                                keywords                        | #
# _languages_                    Every language with its fluency | #
# _interests_                    Every interest                  | #
# _contact_                      Email, website and profiles     | #
# _cv_                           The CV's JSON in vim: cat cv.json #
#                                | jq | vim -                       #
# _site_                         What this site is and how it was  #
#                                built                             #
# _specs_                        The site's feature specs          #
# _ls_ [path]                    List a folder                     #
# _cd_ [path]                    Change folder. cd alone goes home #
# _cat_ <path>                   Show a file                       #
# _jq_ [path]                    Pretty-print JSON                 #
# _vim_ [path | -]               Read a file in vim. - reads what  #
#                                is piped in                       #
# _pwd_                          Show the current folder           #
# _open_ <name>                  Open cv or about in the shell   v #
#==================================================================#
  (scrolled further: history, clear, exit, then a new prompt)
```

- Descriptions start at the 25th column. In a narrow window they wrap under themselves.

### After `cv`: the vim view (FR-055 to FR-065)

`cv` runs `cat cv.json | jq | vim -`. The vim view takes the window's content, as vim takes a
terminal: the CV document's JSON, pretty-printed, each top-level section folded, the cursor on the
first fold. The window's title reads `Terminal — vim`. Focus moves into the view. Export:
`exports/desktop-3a-vim-opened-by-cv-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — vim                         #
#                                                                  #
#    1 {                                                           #
#    2   "$schema": "[schema URL]",                                #
#    3 █--  17 lines: "basics": { ································ #
#   20 +--  16 lines: "work": [ ·································· #
#   36 +--  16 lines: "education": [ ····························· #
#   52 +--  73 lines: "skills": [ ································ #
#  125 +--  14 lines: "languages": [ ····························· #
#  139 +--  22 lines: "interests": [ ····························· #
#  161 +-- 126 lines: "projects": [ ······························ #
#  287 }                                                           #
# ~                                                                #
# ~                                                                #
# [NORMAL] cv.json [RO]  cat cv.json | jq | vim -    json  3,1  Top#
# "cv.json" [readonly] 287 lines · za or click opens a fold ‹:help› ‹:q›
#==================================================================#
```

- Line numbers, fold sizes and the sections come from the CV document's JSON when the site is
  built (FR-055). Only top-level sections are folded.
- `:q` brings the Terminal's output back as it was, with `cv` after its prompt and a new prompt
  below it, focus in the command line (FR-064).

### The vim view: a section open and a search (FR-060 to FR-063)

After `za` on `"work"` and `/REST` Enter. Every match in view is highlighted, the current one
outlined; the message line counts the matches. Long strings wrap at a space under their line.
Export: `exports/desktop-3b-vim-fold-open-search-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — vim                         #
#    1 {                                                           #
#    2   "$schema": "[schema URL]",                                #
#    3 +--  17 lines: "basics": { ································ #
#   20   "work": [                                                 #
#   21     {                                                       #
#   22       "name": "[company]",                                  #
#   23       "position": "[position]",                             #
#   24       "startDate": "[start]",                               #
#   25       "endDate": "[end]",                                   #
#   26       "summary": "[summary ......................           #
#              ....... █REST║ .........................]",         #
#   27       "highlights": [                                       #
#   28         "[highlight ...................................     #
#                ...........]",                                    #
#   30         "[highlight ... ║REST║ ...]",                       #
# [NORMAL] cv.json [RO]  cat cv.json | jq | vim -   json  26,86  9%#
# /REST   match 1 of 3 · n next · N previous            ‹:help› ‹:q› #
#==================================================================#
```

- `║REST║` marks a match on amber. `█` is the cursor, on the current match, which also has an
  amber outline, so it differs by more than color (FR-062).
- `i`, `x`, `dd` or `:w` here leave the file as it is, and the message line reads
  `cv.json is read only: nothing can be changed` (FR-060).

### The vim view: its key help (FR-064)

`:help`, or its chip, splits the view: the file above, the keys below in a `HELP` window. `:q`
closes the help first, then the view. Export: `exports/desktop-3c-vim-key-help-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — vim                         #
#    1 {                                                           #
#    2   "$schema": "[schema URL]",                                #
#    3 █--  17 lines: "basics": { ································ #
#   20 +--  16 lines: "work": [ ·································· #
#   ...                                                            #
# cv.json [RO]                                           3,1   Top #
#      KEYS FOR cv.json · the file is read only                    #
#      Move    h j k l or arrows   w b word   0 $ line start, end  #
#              gg G top, bottom   { } previous, next section       #
#              PgUp PgDn                                           #
#      Search  /text then Enter   n N next, previous match         #
#      Folds   za open or close   zR open all   zM close all       #
#      Lines   :12 go to line 12   :set nu / :set nonu             #
#      Leave   :q back to the Terminal   Tab moves focus out       #
#      i, a, o, x, dd and :w can't change the file. Folds and the  #
#      cursor can be clicked or tapped too.                        #
# [HELP] keys [RO]                                       1,1   All #
# :help                                                      ‹:q›  #
#==================================================================#
```

### After an unknown command (FR-016)

The typed word as typed, "is not a command" in rose, a pointer to `help` as a control, then each
suggestion as a chip, closest first, at most 3. With no suggestion the reply ends at `help`.
Export: `exports/desktop-4-after-unknown-command-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
#                                                                  #
#   ... the greeting, as when just opened ...                      #
# (guest)(~) ◷ 18:25                                               #
# ❯ wrok                                                           #
# wrok is not a command. Run _help_ to see them all, or try:       #
# ‹work›                                                           #
#                                                                  #
# (guest)(~) ◷ 18:26                                               #
# ❯ █                                                              #
#==================================================================#
```

### After `ls` (FR-043, FR-050)

The home folder in the design's order, in columns 13 characters wide, as many per row as fit.
Folders end in `/`. Every name is a control. Export: `exports/desktop-5-after-ls-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
#   ... the greeting ...                                           #
# (guest)(~) ◷ 18:25                                               #
# ❯ ls                                                             #
# _cv.json_   _about_     _contact_   _work/_   _projects/_ _skills_
# _education/_ _languages_ _interests_ _readme_ _specs/_           #
#                                                                  #
# (guest)(~) ◷ 18:26                                               #
# ❯ █                                                              #
#==================================================================#
```

### Inside a folder, after `cat` (FR-045 to FR-047)

The window's title and the prompt show the working folder. `cat` shows what `work` shows for that
entry. Export: `exports/desktop-6-folder-after-cat-1440.png`.

```
#==================================================================#
# [x] [-] [^]             Terminal — ~/work                        #
#                                                                  #
# (guest)(~) ◷ 18:25                                               #
# ❯ cd work                                                        #
# (guest)(~/work) ◷ 18:26                                          #
# ❯ cat [file name]                                                #
# [position] · [company]                                           #
# [start] – [end]                                                  #
# [summary ..................................................]     #
# • [highlight .............................................]      #
# • [highlight .............................................]      #
#                                                                  #
# (guest)(~/work) ◷ 18:27                                          #
# ❯ █                                                              #
#==================================================================#
```

### After `specs` (FR-013)

One row per spec in numbered order: number, name as a link to the spec, status in words, count of
active requirements. Then a link to the repository. Export: `exports/desktop-7-after-specs-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
#                                                                  #
# (guest)(~) ◷ 18:29                                               #
# ❯ specs                                                          #
# Every feature is specified before it is built. [n] specs:        #
# [001]  _[Spec name] ↗_                [Status]  [n] requirements #
# [002]  _[Spec name] ↗_                [Status]  [n] requirements #
#   ... one row per spec ...                                       #
# All specs, plans and history: _[repository] ↗_                   #
#                                                                  #
# (guest)(~) ◷ 18:29                                               #
# ❯ █                                                              #
#==================================================================#
```

- `Approved` is mint and `Draft` amber, but the word carries the status, not the color.

### Maximized (005 FR-065)

The window fills the desktop area, between the menu bar and the dock, with no corners or shadow.
The maximize control shows its restore glyph. The output reflows, so `help` fits whole. Export:
`exports/desktop-8-maximized-1440.png`.

```
+--------------------------------------------------------------------------------------------------+
| [*]  Terminal   Window                                                                           |
#==================================================================================================#
# [x] [-] [v]                              Terminal — ~                                            #
#                                                                                                  #
# (guest)(~) ◷ 18:25                                                                               #
# ❯ help                                                                                           #
# Click a command to run it, or type it. Join commands with |.                                     #
# _help_ [command]  _?_          Every command, or one command's own help                          #
#   ... every command, through _exit_ ...                                                          #
# (guest)(~) ◷ 18:25                                                                               #
# ❯ █                                                                                              #
#==================================================================================================#
|                                        +-----------------------+                                 |
|                                        |  [ CV ]  [ ❯_ ]       |                                 |
+--------------------------------------------------------------------------------------------------+
```

### Its menu open (FR-003, FR-019)

The `Terminal` menu, open from the menu bar. `Clear output` does what `clear` does. While the
window is maximized, `Maximize` reads `Restore` and `Move…` and `Resize…` are unavailable, as in
005. Export: `exports/desktop-9-menu-open-1440.png`.

```
+--------------------------------------------------------------------------------------------------+
| [*] [Terminal]  Window                                                                           |
+-----+----------------------------------+---------------------------------------------------------+
|     | Clear output                     |                                                         |
|     +----------------------------------+                                                         |
|     | Move…             Alt+Shift+P    |            #======================================#     |
|     | Resize…           Alt+Shift+S    |            # [x] [-] [^]    Terminal — ~          #     |
|     +----------------------------------+            #   ... as when just opened ...        #     |
|     | Minimize          Alt+Shift+H    |            #                                      #     |
|     | Maximize          Alt+Shift+F    |            #                                      #     |
|     +----------------------------------+            #======================================#     |
|     | Close             Alt+Shift+W    |                                                         |
|     +----------------------------------+                                                         |
+--------------------------------------------------------------------------------------------------+
```

## Mobile shell: the pocket terminal

### Just opened (FR-024, FR-051)

Full screen below 005's header. The case is decoration only: screen readers skip it and it never
takes focus (FR-054). The screen holds the greeting, the prompt and the command line. Tapping the
command line opens the phone's keyboard. Export: `exports/phone-1-just-opened-375.png`.

```
+-------------------------------------+
| ‹ Home          Terminal            |
+-------------------------------------+
|  +-------------------------------+  |
|  | • cv-os pocket                |  |
|  | +---------------------------+ |  |
|  | | read only · stays in your | |  |
|  | |   browser                 | |  |
|  | | [Name] — [label]          | |  |
|  | | My CV as a terminal. Tap a| |  |
|  | | key below, or type a      | |  |
|  | | command. New? Try _help_. | |  |
|  | | ‹help› ‹about› ‹work›     | |  |
|  | | ‹projects› ‹cv›           | |  |
|  | | (guest)(~)                | |  |
|  | | ❯ █                       | |  |
|  | |                           | |  |
|  | +---------------------------+ |  |
|  | [ help ][about][ work ][proj.]|  |
|  | [skills][ cv  ][  ls  ][clear]|  |
|  |          ::::::::::           |  |
|  |       [N A M E]               |  |
|  +-------------------------------+  |
+-------------------------------------+
```

- The prompt shows no time on the phone, to save width.
- `[proj.]` stands for the `projects` key. Every key shows its full name.

### After `help` (FR-008, FR-025)

Each command on its own row, its description below it, indented. The output scrolls inside the
screen and the keys stay. Export: `exports/phone-2-after-help-375.png`.

```
+-------------------------------------+
| ‹ Home          Terminal            |
+-------------------------------------+
|  | +---------------------------+ |  |
|  | | (guest)(~)              ^ | |  |
|  | | ❯ help                  | | |  |
|  | | Tap a command to run it.| | |  |
|  | | _help_ [command]  _?_   v | |  |
|  | |   Every command, or one   | |  |
|  | |   command's own help      | |  |
|  | | _about_  _whoami_         | |  |
|  | |   Name, role, location... | |  |
|  | |   ...                     | |  |
|  | +---------------------------+ |  |
|  | [ help ][about][ work ][proj.]|  |
|  | [skills][ cv  ][  ls  ][clear]|  |
+-------------------------------------+
```

### After `ls` (FR-043, FR-050)

Three columns at 375 px. Export: `exports/phone-3-after-ls-375.png`.

```
|  | | (guest)(~)                | |  |
|  | | ❯ ls                      | |  |
|  | | _cv.json_  _about_   _contact_    |
|  | | _work/_    _projects/_ _skills_   |
|  | | _education/_ _languages_ _interests_ |
|  | | _readme_   _specs/_       | |  |
|  | | (guest)(~)                | |  |
|  | | ❯ █                       | |  |
```

- Names sit in fixed columns 13 characters wide, filled row by row. (The underscores marking
  controls push this frame's right edge out; on screen every name fits its column.)

### On-screen keyboard open (FR-025, FR-053)

The keys hide and the screen grows down to the keyboard, so the command line and the newest
output stay in view. When the keyboard closes, the keys come back. Export:
`exports/phone-4-keyboard-open-375.png`.

```
+-------------------------------------+
| ‹ Home          Terminal            |
+-------------------------------------+
|  +-------------------------------+  |
|  | • cv-os pocket                |  |
|  | +---------------------------+ |  |
|  | | (guest)(~)                | |  |
|  | | ❯ about                   | |  |
|  | | [Name]                    | |  |
|  | | [label]                   | |  |
|  | | [city], [country]         | |  |
|  | | [summary ...............] | |  |
|  | | (guest)(~)                | |  |
|  | | ❯ proj█                   | |  |
|  | +---------------------------+ |  |
|  +-------------------------------+  |
+-------------------------------------+
|  (the phone's own keyboard)         |
+-------------------------------------+
```

### The vim view with its vim keys (FR-063, FR-066)

`cv` on the phone opens the same view in the screen. The command keys become vim keys until
`:q`, and fold lines can be tapped. Export: `exports/phone-7-vim-keys-375.png`.

```
+-------------------------------------+
| ‹ Home          Terminal            |
+-------------------------------------+
|  +-------------------------------+  |
|  | • cv-os pocket · vim keys     |  |
|  | +---------------------------+ |  |
|  | |  1 {                      | |  |
|  | |  2   "$schema":           | |  |
|  | |        "[schema URL ....  | |  |
|  | |        .........]",       | |  |
|  | |  3 █--  17 lines: "basi···| |  |
|  | | 20 +--  16 lines: "work"··| |  |
|  | |   ... a fold per section  | |  |
|  | |287 }                      | |  |
|  | | ~                         | |  |
|  | | [NORMAL] cv.json [RO] 3,1 | |  |
|  | | "cv.json" 287 lines · tap | |  |
|  | +---------------------------+ |  |
|  | [  j  ][  k  ][ za  ][  /  ]  |  |
|  | [  n  ][ gg  ][  G  ][ :q  ]  |  |
|  +-------------------------------+  |
+-------------------------------------+
```

- `/` opens the phone's keyboard for the search text; the screen then shrinks as in the
  keyboard-open state, and the vim keys hide until the keyboard closes.

### At 320 px wide (FR-052, SC-012)

The same layout, tighter: 12 px text, 48 px keys, no grille or engraving. Chips wrap. Nothing
scrolls sideways. Export: `exports/phone-5-just-opened-320.png`.

```
+--------------------------------+
| ‹ Home       Terminal          |
+--------------------------------+
| +----------------------------+ |
| | • cv-os pocket             | |
| | +------------------------+ | |
| | | read only · in your    | | |
| | |   browser              | | |
| | | [Name]                 | | |
| | | [label]                | | |
| | | My CV as a terminal.   | | |
| | | Tap a key below, or    | | |
| | | type. New? Try _help_. | | |
| | | ‹help› ‹about› ‹work›  | | |
| | | ‹projects› ‹cv›        | | |
| | | (guest)(~)             | | |
| | | ❯ █                    | | |
| | +------------------------+ | |
| | [help][about][work][proj.] | |
| | [skills][cv][ ls ][clear]  | |
| +----------------------------+ |
+--------------------------------+
```

### In landscape, 568 × 320 (FR-052, SC-012)

The screen on the left, the keys on the right in 2 columns of 4, each at least 44 px tall. The
greeting drops its first line. Export: `exports/phone-6-landscape-568.png`.

```
+--------------------------------------------------------+
| ‹ Home                 Terminal                        |
+--------------------------------------------------------+
| +----------------------------------------------------+ |
| | • cv-os pocket                                     | |
| | +----------------------------------+ [help][about] | |
| | | [Name] — [label]                 | [work][proj.] | |
| | | My CV as a terminal. Tap a key,  | [skls][ cv  ] | |
| | | or type a command. New? _help_.  | [ ls ][clear] | |
| | | ‹help› ‹about› ‹work› ‹projects› |               | |
| | | (guest)(~)                       |               | |
| | | ❯ █                              |               | |
| | +----------------------------------+               | |
| +----------------------------------------------------+ |
+--------------------------------------------------------+
```

## Keyboard, focus and screen readers

| Moment | Where focus is | What a screen reader hears |
|--------|----------------|----------------------------|
| The Terminal opens | The command line | "Terminal", then the command line's name, "Command" (FR-004, FR-027) |
| Enter runs a command | Stays in the command line | The output once: in full up to 5 lines, else a summary such as "help: 23 commands" (FR-028) |
| A command control is activated | Back to the command line | As if the command were typed (FR-015) |
| Tab from the command line | The next control in the output, then out of the Terminal to the shell | Nothing is completed or inserted (FR-026) |
| `cv`, or `vim` with a file | Into the vim view | The file's name, `read only`, its number of lines, and "Type :q to leave" (FR-065) |
| `:q` in the vim view | Back to the command line | The Terminal's output, as it was |
| Tab in the vim view | The next control: the `:help` and `:q` chips, then out to the shell | Nothing in the file changes |
| `exit`, or Close in the menu | The Terminal item in the dock (005 FR-023) | — |

- Headings: one heading names the Terminal (visually hidden). Each command run is a heading one
  level below, holding the command as typed. Sections in `cv` are a level below that, and entries
  a level below their section (FR-029).
- The prompt's `guest`, path and time are hidden from screen readers in each command's heading;
  the path is read once when it changes (FR-027).
- Focus indicator: 005's 2 px periwinkle outline, 2 px outside, on chips, underlined controls,
  links, keys and the command line.

## Site text

| Where | Text |
|-------|------|
| Window title | `Terminal — [path]`, such as `Terminal — ~/work` |
| Menu title and dock name | `Terminal` |
| Menu item | `Clear output` |
| Greeting, desktop | `cv-os terminal · read only · nothing you type leaves your browser` / `[name] — [label]` / `This is my CV as a terminal. Type a command and press Enter, or pick one to start. New here? Try help.` |
| Greeting, phone | `read only · stays in your browser` / `[name] — [label]` / `My CV as a terminal. Tap a key below, or type a command. New? Try help.` In landscape the first line is left out. At 320 px the first line reads `read only · in your browser` |
| Greeting's controls | `help`, `about`, `work`, `projects`, `cv` |
| Prompt | `guest`, the path, and on desktop `◷ [hh:mm]`; then `❯` |
| Command line's name | `Command` |
| `help` | `Click a command to run it, or type it and press Enter.` (phone: `Tap a command to run it.`), then each command and its description as listed in the desktop `help` frame, plus `history`: `Commands run so far`, `clear`: `Clear the screen`, `exit`: `Close the Terminal` |
| Unknown command | `[typed] is not a command. Run help to see them all, or try:` and the suggestions. With none: `[typed] is not a command. Run help to see them all.` |
| `specs` | `Every feature is specified before it is built. [n] specs:` … `All specs, plans and history: [repository]` |
| `cv` description in `help` | `The CV's JSON in vim: cat cv.json \| jq \| vim -` |
| Vim view, opening | `"[file]" [readonly] [n] lines  ·  za or click opens a fold` (phone: `"[file]" [n] lines  ·  tap a fold`) |
| Vim view, editing key or `:w` | `[file] is read only: nothing can be changed` |
| Vim view, unknown `:` command | `:[typed] is not a command here. :help lists the keys.` |
| Vim view, search | `/[text]   match [i] of [n]  ·  n next  ·  N previous`, or `/[text]   not found` |
| Vim view, key help | As in the key help frame |
| `jq` errors | `jq: [path or input] is not JSON.` / `jq here only pretty-prints. Usage: jq [path], or … \| jq` |
| Pipe into a command that reads no input | `[command] doesn't read piped input. Pipe into jq or vim -.` |
| Empty section (FR-011) | `The CV lists no [section].` |
| No such path (FR-048) | `[path]: no such file or folder.` |
| `cd` on a file | `[path] is a file. Try cat [path].` with `cat [path]` as a control |
| `cat` on a folder | `[path] is a folder. Try ls [path].` with `ls [path]` as a control |
| Wrong arguments (FR-017) | `[command] takes [what]. Usage: [usage]`, the usage as `help` shows it |
| `open` with another name | `open takes cv or about.` with both as controls |
| Pocket case | `cv-os pocket`, and `[name]` from the CV document, set in capitals and spaced out (decoration, hidden from screen readers) |
| Key names | `help`, `about`, `work`, `projects`, `skills`, `cv`, `ls`, `clear`; in the vim view `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `:q`, named for screen readers `Down`, `Up`, `Open or close fold`, `Search`, `Next match`, `Top`, `Bottom`, `Quit` |

## The 2026-10-29 amendment (pending the owner's review)

The spec's 2026-10-29 amendment (a real bash-like shell, the terminal's cursor and keys) changes
the states below. They are drawn here before the Penpot mockup and its exports are updated. Until
the owner signs them off in [review.md](review.md), the frames above and their exports stay the
approved design. Once signed, this section supersedes these earlier rows:

- **Legend, `█`**: the cursor is filled and blinking while the command line has focus, steady and
  filled 5 s after the last key, and hollow (`▯`) without focus.
- **Design values, Cursor**: as above. Under reduced motion it never blinks (FR-032, FR-072).
- **Keyboard, Focus indicator**: the command line has no outline, box, border or background,
  focused or not. Its cursor is its focus indicator, filled or hollow, each at least 3:1 against
  the screen. Every other control keeps 005's outline (FR-072).
- **Site text**: the rows listed under [Site text changes](#site-text-changes).

### The command line focused and not (FR-071, FR-072)

```
#==================================================#      #==================================================#
# [x] [-] [^]       Terminal — ~                   #      # [x] [-] [^]       Terminal — ~                   #
#                                                  #      #                                                  #
# (guest)(~) ◷ 18:25                               #      # (guest)(~) ◷ 18:25                               #
# ❯ work | grep -i rest█                           #      # ❯ work | grep -i rest▯                           #
#                                                  #      #                                                  #
#==================================================#      #==================================================#
        focused: filled, blinking                          focus elsewhere: hollow, still
```

- No box or outline around the line in either state. A click anywhere on the screen that isn't a
  link or a control, and doesn't end a selection, moves focus here (FR-071).

### After `help`, with the standard commands (FR-008)

```
#==================================================================#
# ❯ help                                                         ^ #
# Click a command to run it, or type it. This is a bash shell:   | #
# pipes, ;, &&, ||, variables, loops and redirects work.         | #
# _help_ [command]  _?_          Every command, or one command's | #
#  … the site's commands, as in the frame above …                | #
# _exit_                         Close the Terminal              | #
#                                                                | #
# ── STANDARD COMMANDS ──                                        | #
# _awk_ _basename_ _cp_ _cut_ _date_ _diff_ _dirname_ _echo_     | #
# _env_ _false_ _find_ _grep_ _head_ _mkdir_ _mv_ _printf_ _rm_  | #
# _sed_ _seq_ _sort_ _tail_ _tee_ _touch_ _tr_ _tree_ _true_     | #
# _uniq_ _wc_ _which_ _xargs_                                    | #
# help [command] or [command] --help shows one command's help.   v #
#==================================================================#
```

- Standard commands wrap as `ls` names do, each a control that runs `help [command]`.
- The final list follows the plan's allowlist (FR-068); every command the shell offers is here.

### The shell loading, and failing to load (FR-070)

```
#==================================================#      #==================================================#
# cv-os terminal · nothing you type leaves your    #      # cv-os terminal · nothing you type leaves your    #
#   browser                                        #      #   browser                                        #
# [Name] — [label]                                 #      # [Name] — [label]                                 #
# This is my CV as a terminal. …                   #      # This is my CV as a terminal. …                   #
# ‹help› ‹about› ‹work› ‹projects› ‹cv›            #      # ‹help› ‹about› ‹work› ‹projects› ‹cv›            #
#                                                  #      #                                                  #
# (guest)(~) ◷ 18:25                               #      # The shell couldn't load. Commands run once it    #
# ❯ work                                           #      #   does.  ‹Try again›                             #
#   Starting the shell…                            #      # (guest)(~) ◷ 18:25                               #
# (guest)(~) ◷ 18:25                               #      # ❯ █                                              #
# ❯ █                                              #      #                                                  #
#==================================================#      #==================================================#
        loading: lines typed wait, in order                 failed: a retry control
```

### A command line stopped by its limit (FR-069, FR-075)

```
#==================================================#
# ❯ while true; do :; done                         #
# Stopped: this ran for more than 5 seconds.       #
# ❯ yes                                            #
# y                                                #
# y   … (output up to 1 MB) …                      #
# Stopped: this printed more than 1 MB.            #
# ❯ seq 1 99999 | while read n; do :; done^C       #
# (guest)(~) ◷ 18:26                               #
# ❯ █                                              #
#==================================================#
```

- The stop message is in rose. Ctrl+C with no selection stops a running line, or cancels a typed
  one, showing `^C` after it (FR-075).

### A selection in the command line, and all of the Terminal selected (FR-074, FR-075)

```
#==================================================#      #==================================================#
# (guest)(~) ◷ 18:25                               #      # ░(guest)(~) ◷ 18:25░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ #
# ❯ cat ░cv.json░ | jq█                            #      # ░❯ pwd░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ #
#                                                  #      # ░/home/guest░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ #
#                                                  #      # ░❯ cat cv.json | jq░█                             #
#==================================================#      #==================================================#
   Shift+Option+Left: the word selected                    Cmd+A: the output and the line, nothing outside
```

- `░` marks selected text, in the system's selection color. The title bar, the dock, the menu bar
  and other windows are never selected.

### The pocket terminal (FR-070, FR-072)

```
+-------------------------------------+      +-------------------------------------+
|  | +---------------------------+ |  |      |  | +---------------------------+ |  |
|  | | (guest)(~)                | |  |      |  | | The shell couldn't load.  | |  |
|  | | ❯ ls | wc -l█             | |  |      |  | |   ‹Try again›             | |  |
|  | +---------------------------+ |  |      |  | | (guest)(~)                | |  |
|  | [ help ][about][ work ][proj.]|  |      |  | | ❯ ▯                       | |  |
|  | [skills][ cv  ][  ls  ][clear]|  |      |  | +---------------------------+ |  |
+-------------------------------------+      +-------------------------------------+
   focused: filled cursor, no box               failed to load; not focused: hollow
```

- `help` on the phone shows the standard commands in the same group, as controls.

### Site text changes

| Where | Text |
|-------|------|
| Greeting, desktop, first line | `cv-os terminal · nothing you type leaves your browser` (no longer `read only`) |
| Greeting, phone, first line | `stays in your browser`; at 320 px `in your browser` |
| `help` lead | `Click a command to run it, or type it. This is a bash shell: pipes, ;, &&, \|\|, variables, loops and redirects work.` (phone: `Tap a command to run it. This is a bash shell.`) |
| `help`, standard group | Heading `Standard commands`, tail `help [command] or [command] --help shows one command's help.` |
| Unknown command | `[typed]: command not found. Run help to see them all, or try:` and the suggestions; with none, `[typed]: command not found. Run help to see them all.` (FR-016) |
| `jq` errors | jq's own messages (FR-056). The "only pretty-prints" reply goes |
| Pipe into a command that reads no input | No reply: the command runs and ignores its input (FR-057) |
| Protected path | `[command]: [path as typed]: Permission denied`, as bash words it (FR-049) |
| Visitor's files over 1 MB | `[command]: [path]: No space left on device` (FR-073) |
| Shell loading | `Starting the shell…` |
| Shell failed | `The shell couldn't load. Commands run once it does.` and the control `Try again` |
| Stopped by a limit | `Stopped: this ran for more than 5 seconds.` / `Stopped: this ran more than 10,000 commands.` / `Stopped: this printed more than 1 MB.` / `Stopped.` (Ctrl+C) |
