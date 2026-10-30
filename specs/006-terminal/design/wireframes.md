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
| `█` | The cursor while the command line has focus: a filled block. It blinks until 5 s after focus or the last key press, then stays filled (FR-032) |
| `▯` | The cursor while focus is elsewhere: a hollow block, an outline only, never blinking (FR-072) |
| `▓text▓` | Selected text: lilac behind, night text (FR-074, FR-075) |
| `‹help›` | A command control (FR-015): a button that runs the command. Drawn as a small outlined chip |
| `_work/_` | A command control inside output: an underlined name. Folders are periwinkle with a trailing slash, files are plain (FR-043, FR-050) |
| `_name ↗_` | A link to another site |
| `── SECTION ──` | A section heading in a command's output |
| `[ key ]` | A command key of the pocket terminal (FR-051) |
| `^ \| v` | The output's own scrollbar |
| `+--  16 lines: "work": [ ····` | A closed fold in the vim view: a control that opens it |
| `[NORMAL]` | The vim view's mode, in a mint pill at the start of its status line |
| `[-- INSERT --]` | The vim view's mode pill in insert mode (FR-079) |
| `▏` | The vim view's cursor in insert mode: a 2 px bar before the character it inserts at (FR-079) |
| `[Tab ⇥]` | The pocket terminal's Tab key (FR-078) |

## Design values the spec leaves to the design

| Value | Set to | Spec |
|-------|--------|------|
| Look | Frosted glass on 005's Graphite desktop: what is behind the window blurred by 32 px, the window color at 88% over it, a faint sheen at the top, a hairline rim. The title bar is part of the glass, with no rule under it. See [README.md](README.md#the-glass) | FR-031 |
| Fixed-width font | JetBrains Mono, the site's own (004 FR-045). 14 px on 21 px lines on desktop, 12.5 px on 19 px lines on the pocket terminal (12 on 18 below 375 px wide) | FR-031, Assumptions |
| Terminal window when opened | 760 × 536 px. Its right edge 40 px inside the desktop area's right edge, its top 120 px below the top of the window in front, so that window's title bar stays visible. Fitted to the area, at least 24 px above its bottom and never below 400 × 300. With no window open, centered in the area. At 1440 × 900 with the CV window open: x 640, y 176 | FR-003, 005 FR-018 |
| Padding | 20 px on desktop (24 px maximized), 14 px on the pocket terminal's screen (12 px below 375 px wide) | FR-031 |
| Rows holding command controls | 24 px tall, so every control in `help`, `ls` and `specs` has a 24 × 24 px target (FR-034). Chips are 26 px tall | FR-034 |
| Opening and prompt | No greeting text. The Terminal opens with a row of starter command chips, `help`, `about`, `work`, `projects`, `cv`, then the prompt. See [Site text](#site-text). Amended 2026-10-29: a three-line greeting, with the owner's name and label from the CV document, came first | FR-005, FR-030 |
| Order of the home folder in `ls` | `cv.json`, `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme`, `specs/`: the whole CV, its parts in `/cv`'s order, then the site | FR-043 |
| Command line limit | 500 characters. Typing or pasting past it adds nothing more | FR-017 |
| Command line | No box, border, outline, background or underline, focused or not. The prompt's `❯` and the cursor mark it. Amended 2026-10-29: it had the site's focus outline | FR-072 |
| Cursor | A block one character wide, in `color.terminal-cursor` (haze). With focus: filled, the letter under it in night; it blinks, half of `motion.duration.cursor-blink` (1000 ms) on and half off, with no fade, from focus or a key press until `motion.duration.cursor-idle` (5000 ms) after the last, then stays filled. Without focus: hollow, a 2 px (`border.thick`) haze outline inside the block, steady. Reduced motion: never blinks. It is the command line's focus indicator. Amended 2026-10-29: it was a steady block at 90% that never blinked | FR-032, FR-072 |
| Selection | `color.terminal-selection` (lilac) behind, `color.terminal-selection-text` (night) for everything selected, links, prompt and chip names included. Square bands, one per line. In the command line the cursor sits at the end the keys move, beside the selection, never on it | FR-074, FR-075 |
| `help`'s standard commands | After the site's commands: `Standard commands` (snow, bold) and a fog note, then every command of FR-068 by name in alphabetical order, two spaces apart, wrapping within the window, each name a control that runs `help <name>`, in 24 px rows | FR-008, FR-015, FR-034 |
| The shell loading and failing | A quiet fog line under the starter chips while it loads; a rose sentence, a haze one and a `try again` chip if it fails. The prompt and the command line stay in both | FR-070 |
| The visitor's files in `ls` | After the built files, in name order, marked as they are | FR-073 |
| Owner in `ls -l` | Protected files and folders are owned by `root`, read only (`-r--r--r--`, `dr-xr-xr-x`); the visitor's by `guest`, in haze, writable. Folder names keep their trailing slash | FR-049 |
| Terminal menu | Titled `Terminal`. It holds `Clear output` (no shortcut), then 005's window commands with their shortcuts | FR-003, FR-019 |
| Dock and home screen icon | An original glyph: a mint `❯` and a periwinkle `_` on a dark tile with a hairline edge. After the CV app | FR-001, FR-031 |
| Command keys | 8 keys in this order: `help` (indigo, the way in), `about`, `work`, `projects`, `cv`, `ls`, `clear`, `Tab ⇥`. At least 44 × 44 px: 52 px tall in portrait, 48 px below 375 px wide, at least 44 px in landscape. Amended 2026-10-30: `skills` was fifth and there was no Tab key | FR-051, FR-078 |
| Pocket terminal layout | Height ≥ width: the screen above, the keys below in 4 columns. Width > height: the screen on the left, the keys on the right in 2 columns of 4. The case fills the space below the header with an 8 to 14 px margin, at most 560 px wide in portrait and 900 px in landscape, centered | FR-024, FR-052 |
| Device it evokes | A small handheld terminal of the site's own design: a glass case, a power light, a recessed screen, raised keys, a speaker grille and the owner's name, from the CV document, engraved (drawn only where it fits). It copies no real device | FR-054 |
| On-screen keyboard open | The keys hide, except the Tab key, which stays alone at the right of a strip between the screen and the keyboard (`Esc` in its place in vim's insert mode). The screen grows to fill the space above the strip, so the command line and the newest output stay in view. When the keyboard closes, the keys come back. Amended 2026-10-30: every key hid | FR-053, FR-066, FR-078 |
| Output color | Commands and CV text in snow and haze, dates and descriptions in fog, controls and links in periwinkle, section headings in lilac, the prompt mark in mint, "command not found", syntax errors, "Permission denied", "stopped" and the load error in rose, `^C` and the loading line in fog. Slate is never used for text | FR-031, FR-035 |
| Vim view | Fills the Terminal window's content, or the pocket terminal's screen. A 4-character line-number gutter (3 on the phone), the text, then a 24 px status line and a 28 px message line (26 on the phone). Text 14 on 21 px, as the Terminal's. Long lines wrap at a space, continuations indented 2 past the line's own indent. Opens with each top-level section folded and the cursor on the first fold | FR-058, FR-061, FR-063 |
| Vim view colors | Keys periwinkle, strings haze, numbers amber, `true`, `false` and `null` rose, punctuation and line numbers fog, the cursor line's number snow. Fold lines periwinkle on a faint band. Search matches on amber at 20%, the current one at 42% with an amber outline. The cursor a haze block with the character under it in night | FR-056, FR-062 |
| Vim view status line | `NORMAL` or `-- INSERT --` (mint) or `HELP` (lilac) pill, the file name in snow (`[No Name]` for piped text), then in haze `[RO]` for a protected file, `[+]` once the text differs from the file, and the pipe that opened it; on the right the file type, `line,column` and `Top`, `Bot`, `All` or a percentage. Amended 2026-10-30: always `[RO]`, and the marks and pipe were fog, 3.8:1 on the status band | FR-058, FR-059 |
| Vim view controls for pointers | `:help` and `:q` chips at the right of the message line, fold lines, and on the phone the vim keys | FR-061, FR-064, FR-066 |
| Vim keys on the pocket terminal | Three rows of four: `j`, `k`, `za`, `/`; `n`, `gg`, `G`, `i`; `u`, `:w`, and `:q` twice as wide (mint, the way out). The third row takes the speaker grille's place; at 320 px the screen gives it the room. In insert mode the keyboard opens and the strip holds `Esc` alone. The case reads `cv-os pocket · vim keys`. Amended 2026-10-30: 8 keys in two rows, with no `i`, `u`, `:w` or `Esc` | FR-066 |
| Vim insert cursor | A 2 px haze bar (`border.thick`), the line's text height, before the character it inserts at. Normal mode keeps the block | FR-079 |
| Vim messages | vim's own words: information haze, warnings such as `W10` amber (`color.vim-warning`), errors such as `E37`, `E45` and `E32` rose. A message longer than the line wraps onto a second line; the message line grows and the text gives up a row | FR-060, FR-081 |
| Tab's list of matches | bash's layout: sorted, filled down the columns, each column as wide as the longest name plus 2, as many columns as fit. Folders bold periwinkle with a trailing slash, files snow, nothing underlined: output, not controls. Then the prompt and the line again | FR-076 |
| Forced colors and reduced transparency | The glass, sheen and blur drop out. Forced colors: `Canvas` and `CanvasText`, a solid border, chips and keys outlined. The filled cursor is `Highlight` with a 1 px `Highlight` bottom edge, so it shows by more than its fill, and the letter under it `HighlightText`; the hollow cursor is a 2 px `Highlight` outline. A selection is the system's `Highlight` and `HighlightText`, as on any page. The command line still gets no border. Reduced transparency: the solid `color.shell-surface` | FR-033 |

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
|              | Email                      # ‹help› ‹about› ‹work› ‹projects› ‹cv›            #  |
|              | GitHub                     #                                                  #  |
|              |                            # (guest)(~) ◷ 18:25                               #  |
|              | [summary ...........]      # ❯ █                                              #  |
|              | [...................]      #                                                  #  |
|              |                            #                                                  #  |
|              | EXPERIENCE                 #                                                  #  |
|              | ---------------------------#                                                  #  |
|              | [position] · [company]     #                                                  #  |
|              |                            #                                                  #  |
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

- No greeting: the starter chips, then the prompt (FR-005). Amended 2026-10-29: a three-line
  greeting came first.
- The window is glass: the CV window and the wallpaper show through it, blurred.
- Page title: `Terminal – [Site name]` (005 FR-042).
- The frames below show the Terminal window alone. The desktop around it is as in this frame.

### After `help` (FR-008, FR-015, FR-019)

The command sits at the top of the view and the output scrolls inside the window. Every command
and alias is a control. After the site's commands comes a group of the standard commands (FR-008,
FR-068), names only. The frame shows the start of the output; the export shows it scrolled to its
end, with the standard commands and the new prompt. Export: `exports/desktop-2-after-help-1440.png`.

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
  (scrolled further: history, clear, exit, the standard commands, then a new prompt)
```

Scrolled to its end, as exported:

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
#   ... cv, site, specs, ls, cd, cat, jq, vim, pwd, open ...     ^ #
# _history_                      Commands run so far             | #
# _clear_                        Clear the screen                | #
# _exit_                         Close the Terminal              | #
#                                                                | #
# Standard commands  as in bash. help <command> shows its options.| #
# _awk_  _basename_  _cp_  _cut_  _date_  _diff_  _dirname_  _echo_| #
# _env_  _false_  _find_  _grep_  _head_ ... (every command of     | #
# FR-068, alphabetical, wrapping within the window)              | #
# _which_  _xargs_                                                v #
#                                                                  #
# (guest)(~) ◷ 18:25                                               #
# ❯ █                                                              #
#==================================================================#
```

- The standard commands' names wrap where the window ends, never inside a name.
- Each standard command's name runs `help <name>`, so a click on `grep` shows grep's help rather
  than its usage error (FR-015). The site's commands above them still run themselves.

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
# [NORMAL] [No Name]  cat cv.json | jq | vim -     json  3,1  Top#
# "[No Name]" 287 lines · za or click opens a fold      ‹:help› ‹:q› #
#==================================================================#
```

- Line numbers, fold sizes and the sections come from the CV document's JSON when the site is
  built (FR-055). Only top-level sections are folded.
- `:q` brings the Terminal's output back as it was, with `cv` after its prompt and a new prompt
  below it, focus in the command line (FR-064).
- The piped text has no file of its own, so the status line calls it `[No Name]`, as vim does,
  then shows the pipe. It isn't read only: it can be edited, `:w` alone gives vim's
  `E32: No file name`, and `:w <path>` writes it to a file the visitor may write (FR-080).
  Amended 2026-10-30: it was named `cv.json` and marked `[RO]` and `[readonly]`.

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
# [NORMAL] [No Name]  cat cv.json | jq | vim -    json  26,86  9%#
# /REST   match 1 of 3 · n next · N previous            ‹:help› ‹:q› #
#==================================================================#
```

- `║REST║` marks a match on amber. `█` is the cursor, on the current match, which also has an
  amber outline, so it differs by more than color (FR-062).
- Editing works here as in any vim view (FR-079); as the text has no file, `:w` alone gives
  `E32: No file name`. Amended 2026-10-30: `i`, `x`, `dd` and `:w` changed nothing and the
  message line read `cv.json is read only: nothing can be changed`.

### The vim view: its key help (FR-064)

`:help`, or its chip, splits the view: the file above, the keys below in a `HELP` window. `:q`
closes the help first, then the view. The help window is taller than before, so the file above
shows 3 lines. Export: `exports/desktop-3c-vim-key-help-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — vim                         #
#    1 {                                                           #
#    2   "$schema": "[schema URL]",                                #
#    3 █--  17 lines: "basics": { ································ #
# [No Name]                                              3,1   Top #
#      KEYS FOR [No Name] · :w <path> writes it to a file          #
#      Move    h j k l or arrows   w b word   0 $ line start, end  #
#              gg G top, bottom   { } previous, next section       #
#              PgUp PgDn                                           #
#      Search  /text then Enter   n N next, previous match         #
#      Folds   za open or close   zR open all   zM close all       #
#      Lines   :12 go to line 12   :set nu / :set nonu             #
#      Insert  i a I A o O type text   Esc back to normal          #
#      Edit    x dd dw D delete   cw cc C change   r replace       #
#              J join   yy yw copy   p P paste   u undo            #
#              :redo redo   . repeat                               #
#      Write   :w write   :w path write to a path                  #
#              :wq :x ZZ write and leave                           #
#      Leave   :q back to the Terminal   :q! leave without writing #
#              Tab moves focus out; in insert mode, Esc then Tab   #
#      A count goes first: 3dd deletes three lines. On a Mac,      #
#      Ctrl+R redoes too. Folds and the cursor can be clicked or   #
#      tapped.                                                     #
# [HELP] keys [RO]                                       1,1   All #
# :help                                                      ‹:q›  #
#==================================================================#
```

- The heading names the view's file. After it: for `cv`'s piped text, `· :w <path> writes it to a
  file`; for a protected file, `· read only: :w <path> keeps a copy`; for any other file, nothing.
- Ctrl+R is named for the Mac only: other systems' browsers keep it for reloading (FR-079).
- Amended 2026-10-30: the help had no editing keys, its heading said the file was read only, and
  its note said `i, a, o, x, dd and :w can't change the file`.

### After an unknown command (FR-016)

The reply starts as bash's does (FR-016): the typed word as typed, then `: command not found` in
rose, a pointer to `help` as a control, then each suggestion as a chip, closest first, at most 3.
With no suggestion the reply ends at `help`. Amended 2026-10-29: it read `wrok is not a command.`
Export: `exports/desktop-4-after-unknown-command-1440.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
#                                                                  #
# ‹help› ‹about› ‹work› ‹projects› ‹cv›                            #
# (guest)(~) ◷ 18:25                                               #
# ❯ wrok                                                           #
# wrok: command not found. Run _help_ to see them all, or try:    #
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
# ‹help› ‹about› ‹work› ‹projects› ‹cv›                            #
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
The maximize control shows its restore glyph. The output reflows: `help` fits down to its
standard commands, and the new prompt is just below the view. Export:
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
# Standard commands  as in bash. help <command> shows its options.                               ^ #
# _awk_  _basename_  _cp_  _cut_  _date_  _diff_  _dirname_  _echo_  _env_  _false_ ... _wc_       | #
# _which_  _xargs_                                                                               v #
#   (scrolled further: a new prompt)                                                               #
#==================================================================================================#
|                                        +-----------------------+                                 |
|                                        |  [ CV ]  [ ❯_ ]       |                                 |
+--------------------------------------------------------------------------------------------------+
```

### Its menu open (FR-003, FR-019)

The `Terminal` menu, open from the menu bar. `Clear output` does what `clear` does. While the
window is maximized, `Maximize` reads `Restore` and `Move…` and `Resize…` are unavailable, as in
005. Focus is in the menu, so the command line's cursor is hollow. Export: `exports/desktop-9-menu-open-1440.png`.

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
takes focus (FR-054). The screen holds the starter chips, the prompt and the command line. Tapping the
command line opens the phone's keyboard. Export: `exports/phone-1-just-opened-375.png`.

```
+-------------------------------------+
| ‹ Home          Terminal            |
+-------------------------------------+
|  +-------------------------------+  |
|  | • cv-os pocket                |  |
|  | +---------------------------+ |  |
|  | | ‹help› ‹about› ‹work›     | |  |
|  | |   ‹projects› ‹cv›         | |  |
|  | | (guest)(~)                | |  |
|  | | ❯ █                       | |  |
|  | |                           | |  |
|  | |                           | |  |
|  | |                           | |  |
|  | +---------------------------+ |  |
|  | [ help ][about][ work ][proj.]|  |
|  | [  cv  ][ ls  ][clear ][Tab ⇥]|  |
|  |          ::::::::::           |  |
|  |       [N A M E]               |  |
|  +-------------------------------+  |
+-------------------------------------+
```

- The prompt shows no time on the phone, to save width.
- `[proj.]` stands for the `projects` key. Every key shows its full name.

### After `help` (FR-008, FR-025)

Each command on its own row, its description below it, indented. Then the standard commands, as
on desktop, the note wrapped and indented, the names wrapping within the screen. The output
scrolls inside the screen and the keys stay. The export shows it scrolled to its end. Export:
`exports/phone-2-after-help-375.png`; at 320 px, `exports/phone-19-after-help-320.png`.

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
|  | | _exit_                    | |  |
|  | |   Close the Terminal      | |  |
|  | | Standard commands         | |  |
|  | |   as in bash. help        | |  |
|  | |   <command> shows its     | |  |
|  | |   options.                | |  |
|  | | _awk_  _basename_  _cp_   | |  |
|  | |   ... wrapping ...        | |  |
|  | | _which_  _xargs_          | |  |
|  | | (guest)(~)                | |  |
|  | | ❯ █                       | |  |
|  | +---------------------------+ |  |
|  | [ help ][about][ work ][proj.]|  |
|  | [  cv  ][ ls  ][clear ][Tab ⇥]|  |
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

Amended 2026-10-30: the Tab key no longer hides. It stays alone in a strip above the keyboard,
and the screen gives the strip 60 px (see
[The pocket terminal's Tab key](#the-pocket-terminals-tab-key-fr-078)). The export is redrawn with
it.

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
|  |                     [Tab ⇥]   |  |
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
|  | | [NORMAL] [No Name]    3,1 | |  |
|  | | "[No Name]" 287 lines · t| |  |
|  | +---------------------------+ |  |
|  | [  j  ][  k  ][ za  ][  /  ]  |  |
|  | [  n  ][ gg  ][  G  ][  i  ]  |  |
|  | [  u  ][ :w  ][     :q     ]  |  |
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
| | | ‹help› ‹about› ‹work›  | | |
| | | ‹projects› ‹cv›        | | |
| | | (guest)(~)             | | |
| | | ❯ █                    | | |
| | +------------------------+ | |
| | [help][about][work][proj.] | |
| | [ cv ][ ls ][clear][Tab ⇥] | |
| +----------------------------+ |
+--------------------------------+
```

### In landscape, 568 × 320 (FR-052, SC-012)

The screen on the left, the keys on the right in 2 columns of 4, each at least 44 px tall. Export: `exports/phone-6-landscape-568.png`.

```
+--------------------------------------------------------+
| ‹ Home                 Terminal                        |
+--------------------------------------------------------+
| +----------------------------------------------------+ |
| | • cv-os pocket                                     | |
| | +----------------------------------+ [help][about] | |
| | | ‹help› ‹about› ‹work› ‹projects› | [work][proj.] | |
| | | ‹cv›                             | [ cv ][ ls  ] | |
| | | (guest)(~)                       | [clear][Tab⇥] | |
| | | ❯ █                              |               | |
| | +----------------------------------+               | |
| +----------------------------------------------------+ |
+--------------------------------------------------------+
```

## States added by the amendment of 2026-10-29

These states follow the spec's amendment of 2026-10-29: a bash-like shell (FR-067 to FR-070,
FR-073) and a terminal's cursor and keys (FR-071 to FR-075). Each is drawn on both shells, at
1440 × 900 and at 375 × 812, and at 320 × 568 where text is at risk of wrapping badly. The
desktop frames show the Terminal window alone; the desktop around it is as when just opened.

### Focus elsewhere: the hollow cursor (FR-072, FR-032)

Focus has moved to the dock with Tab or the shell's shortcut. The command line keeps what was
typed. Its cursor turns hollow and stops blinking; the dock item has 005's focus outline. On the
phone, focus is on the Home control. Exports: `exports/desktop-10-cursor-unfocused-1440.png`,
`exports/phone-8-cursor-unfocused-375.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
# ‹help› ‹about› ‹work› ‹projects› ‹cv›                            #
# (guest)(~) ◷ 18:25                                               #
# ❯ skills▯                                                        #
#==================================================================#
                  +-----------------------+
                  |  [ CV ]  {[ ❯_ ]}     |   {…} the dock item's focus outline
                  +-----------------------+
```

- Clicking anywhere on the screen that isn't a link or a control brings focus back without
  scrolling (FR-071): the cursor is filled again and blinks.
- The menu-open state (desktop 9) shows the same hollow cursor, as focus is in the menu.

### Text selected in the command line (FR-074)

`work | grep -i engineer` typed, then Option+Left to the start of `engineer` and
Shift+Option+Right. The word is selected; the cursor stands after it, at the end the keys moved.
Typing or deleting replaces the selection. Exports: `exports/desktop-11-line-selection-1440.png`,
`exports/phone-9-line-selection-375.png`.

```
# (guest)(~) ◷ 18:25                                               #
# ❯ work | grep -i ▓engineer▓█                                     #
```

### Cmd+A: all of the Terminal's text (FR-075)

Cmd+A on macOS, Ctrl+A elsewhere, with focus in the command line or the output. Every line of
the Terminal's output and the command line is selected, the prompt's pills and the chips' names
included. Nothing outside the window is: not the CV window behind the glass, the menu bar or the
dock. The cursor stays filled at the end of the line. Copying gives the text as shown, with no
cursor and no control's name added. Exports: `exports/desktop-12-select-all-1440.png`,
`exports/phone-10-select-all-375.png` (on a phone with a keyboard attached; the phone frame
starts at `about`, the chips scrolled above).

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
# ‹▓help▓› ‹▓about▓› ‹▓work▓› ‹▓projects▓› ‹▓cv▓›                  #
# ▓(guest)(~) ◷ 18:25▓                                             #
# ▓❯ about▓                                                        #
# ▓[Name]▓                                                         #
# ▓[label]▓                                                        #
# ▓[city], [country]▓                                              #
# ▓[summary .......................................]▓             #
# ▓(guest)(~) ◷ 18:26▓                                             #
# ▓❯ work▓█                                                        #
#==================================================================#
```

- Typing a letter clears the selection and adds the letter to the command line (story 5, 9).

### A typed line cancelled with Ctrl+C (FR-075)

With no text selected, Ctrl+C ends the line: it stays as typed, `^C` follows it in fog, and a
new empty prompt appears. Nothing runs and nothing goes into the history. With text selected,
Ctrl+C copies. Exports: `exports/desktop-13-ctrl-c-1440.png`, `exports/phone-11-ctrl-c-375.png`
(a phone with a keyboard attached).

```
# (guest)(~) ◷ 18:25                                               #
# ❯ projects | grep -i mob^C                                       #
#                                                                  #
# (guest)(~) ◷ 18:25                                               #
# ❯ █                                                              #
```

- While a command line runs, Ctrl+C stops it: `^C` after it, then `stopped: you pressed Ctrl+C.`
  as in the limit state below.

### The shell loading, on first open (FR-070)

The starter chips, the prompt and the command line show at once and take typing. A quiet line in
fog under the chips says the shell is loading. Nothing spins or moves. A command line run now
waits, after its prompt, and runs as soon as the shell is ready; the line then goes. Exports:
`exports/desktop-14-loading-1440.png`, `exports/phone-12-loading-375.png`.

```
# ‹help› ‹about› ‹work› ‹projects› ‹cv›                            #
# loading the shell · type away, commands run once it is ready     #
#                                                                  #
# (guest)(~) ◷ 18:25                                               #
# ❯ help█                                                          #
```

- A screen reader hears "Loading the shell" once, politely, and nothing when it is ready unless a
  waiting command then runs.

### The shell failing to load (FR-070)

The loading line becomes an error in site text, with a `try again` chip that loads the shell
again. The prompt and the command line stay; command lines run meanwhile keep waiting and run
once a try succeeds. Exports: `exports/desktop-15-load-failed-1440.png`,
`exports/phone-13-load-failed-375.png`.

```
# ‹help› ‹about› ‹work› ‹projects› ‹cv›                            #
# The shell couldn't load. Check the connection, then try again.   #
# ‹try again›                                                      #
#                                                                  #
# (guest)(~) ◷ 18:25                                               #
# ❯ █                                                              #
```

- "The shell couldn't load." is rose; the rest haze. On the phone the two sentences take a line
  each.

### A command line stopped by its limit (FR-069)

`while true; do :; done` runs for 5 seconds, then stops. The page, the shell and other windows
kept responding throughout. A line in site text says why, then a new prompt. Exports:
`exports/desktop-16-stopped-by-limit-1440.png`, `exports/phone-14-stopped-by-limit-375.png`.

```
# (guest)(~) ◷ 18:25                                               #
# ❯ while true; do :; done                                         #
# stopped: it ran for 5 seconds, the longest a command line runs   #
#   here.                                                          #
#                                                                  #
# (guest)(~) ◷ 18:25                                               #
# ❯ █                                                              #
```

- `stopped` is rose, the reason haze. The three reasons are in [Site text](#site-text).
- Output printed before the stop stays above the line.

### `ls` with the visitor's own files (FR-073, FR-043)

After `mkdir notes && touch todo`, which prints nothing, `ls` lists the built files in the
design's order, then the visitor's in name order. They are marked as the built ones are: folders
periwinkle and bold with a trailing slash, files plain. Every name is a control. Exports:
`exports/desktop-17-ls-visitor-files-1440.png`, `exports/phone-15-ls-visitor-files-375.png`.

```
# (guest)(~) ◷ 18:27                                               #
# ❯ mkdir notes && touch todo                                      #
#                                                                  #
# (guest)(~) ◷ 18:27                                               #
# ❯ ls                                                             #
# _cv.json_    _about_      _contact_    _work/_      _projects/_  _skills_
# _education/_ _languages_  _interests_  _readme_     _specs/_     _notes/_
# _todo_                                                           #
#                                                                  #
# (guest)(~) ◷ 18:27                                               #
# ❯ █                                                              #
```

### `rm` on a protected file, and `ls -l` (FR-049)

`rm about` gets GNU's reply and changes nothing. `ls -l` shows the protected files read only and
owned by `root`, and the visitor's files owned by `guest`. Sizes and times come from the build
and the visit. Exports: `exports/desktop-18-permission-denied-1440.png`,
`exports/phone-16-permission-denied-375.png`, `exports/phone-20-permission-denied-320.png`.

```
# (guest)(~) ◷ 18:28                                               #
# ❯ rm about                                                       #
# rm: cannot remove 'about': Permission denied                     #
#                                                                  #
# (guest)(~) ◷ 18:28                                               #
# ❯ ls -l                                                          #
# total [n]                                                        #
# -r--r--r-- 1 root  root  [size] [date] _cv.json_               ^ #
# -r--r--r-- 1 root  root  [size] [date] _about_                 | #
#   ... one row per built file, in the design's order ...        | #
# dr-xr-xr-x 2 root  root  [size] [date] _specs/_                | #
# drwxr-xr-x 2 guest guest [size] [date] _notes/_                | #
# -rw-r--r-- 1 guest guest [size] [date] _todo_                  v #
#==================================================================#
```

- "Permission denied" is rose; the rest of the reply haze. Each path a command touches gets its
  own reply line, as in GNU's tools.
- The details are fog, `guest` haze, names controls as in `ls`.
- On the phone each row wraps after its date, the name on the next line; the output scrolls with
  `ls -l` at the top of the view.

### A pipe and a filter (FR-057, FR-056)

`work | grep -i engineer` prints the line of `work`'s text that matches, as the pipe passes it on:
each line, heading and list item on a line of its own, without the list's bullet. `jq` takes a
filter and prints what jq prints. Exports: `exports/desktop-19-pipe-and-filter-1440.png`,
`exports/phone-17-pipe-and-filter-375.png`, `exports/phone-21-pipe-and-filter-320.png`.

```
# (guest)(~) ◷ 18:29                                               #
# ❯ work | grep -i engineer                                        #
# [the highlight of a role that holds "engineer"]                  #
#                                                                  #
# (guest)(~) ◷ 18:29                                               #
# ❯ jq '.work[0].name' cv.json                                     #
# "[the first role's organization]"                                #
#                                                                  #
# (guest)(~) ◷ 18:30                                               #
# ❯ █                                                              #
```

- Output of standard commands is plain text in haze, with no command controls in it. `jq`'s
  output keeps the vim view's JSON colors (strings haze, numbers amber, and so on).

### A syntax error and "command not found" (FR-067, FR-016)

An unclosed quote gets bash's syntax error naming what it expected; a command the shell doesn't
know gets the reply of FR-016. Both are followed by a new prompt. Exports:
`exports/desktop-20-syntax-error-not-found-1440.png`,
`exports/phone-18-syntax-error-not-found-375.png`.

```
# (guest)(~) ◷ 18:31                                               #
# ❯ echo "hello                                                    #
# unexpected EOF while looking for matching `"'                    #
#                                                                  #
# (guest)(~) ◷ 18:31                                               #
# ❯ sudo ls                                                        #
# sudo: command not found. Run _help_ to see them all.             #
#                                                                  #
# (guest)(~) ◷ 18:31                                               #
# ❯ █                                                              #
```

- The syntax error is rose. In "command not found" the typed word is snow, `: command not found`
  rose, and the rest haze with `help` as a control.
- Bash puts `bash: ` before both messages. The design leaves it out, so the reply starts with the
  typed word, as FR-016 asks (see review.md).

### Forced colors (FR-033)

- **The cursor**: with focus, filled with `Highlight`, the letter under it `HighlightText`, and a
  1 px `Highlight` bottom edge so it shows by more than a fill. Without focus, a 2 px `Highlight`
  outline, empty. It still blinks with focus unless reduced motion is set.
- **The selection**: the system's own `Highlight` and `HighlightText`, in the command line and
  across the output, so it reads as any selection on the visitor's system.
- **The command line**: still no border or box; `CanvasText` for the typed text.
- **The loading and error lines**: `CanvasText`; the `try again` chip is a `ButtonText` outline
  like every chip.

## States added by the amendment of 2026-10-30

These states follow the spec's amendment of 2026-10-30: Tab completes as bash's own completion
does (FR-026, FR-076, FR-077), the pocket terminal gets a Tab key (FR-078), and the vim view edits
files as vim does (FR-058, FR-060, FR-064 to FR-066, FR-079 to FR-081). They are drawn at
1440 × 900 and 375 × 812, and the longest vim message at 320 × 568. The desktop frames show the
Terminal window alone; the desktop around it is as when just opened.

### A second Tab lists the matches (FR-076)

The visitor made `notes/` and `todo`, typed `cat ~/` and pressed Tab twice. The first Tab adds
nothing, as every name in `~` matches; the second lists them below the line, then the prompt and
the line come back unchanged, the cursor at its end. Exports:
`exports/desktop-21-tab-list-1440.png`, `exports/phone-22-tab-key-list-375.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — ~                           #
# ‹help› ‹about› ‹work› ‹projects› ‹cv›                            #
# (guest)(~) ◷ 18:27                                               #
# ❯ mkdir notes && touch todo                                      #
#                                                                  #
# (guest)(~) ◷ 18:27                                               #
# ❯ cat ~/                                                         #
# about       cv.json     interests   notes/      readme      specs/      work/
# contact     education/  languages   projects/   skills      todo #
#                                                                  #
# (guest)(~) ◷ 18:27                                               #
# ❯ cat ~/█                                                        #
#==================================================================#
```

- The list is bash's: sorted, filled down the columns, each column as wide as the longest name
  plus 2, as many as fit (7 here, 3 on the phone). Folders are bold periwinkle with a trailing
  slash, as `ls` marks them; files are snow. Nothing is underlined: the list is output, not
  controls, and it scrolls and selects as output does.
- One match completes at once: `cat ~/sk` gives `cat ~/skills ` with a space, `cd ~/wo` gives
  `cd ~/work/`, and a first word completes against commands: `wo` gives `work `. No match
  changes nothing and shows nothing.
- More than 100 matches: a haze line `Display all [n] possibilities? (y or n)`; `y` lists them,
  any other key brings the prompt back. It is one line of output, so it has no board.

### The pocket terminal's Tab key (FR-078)

`Tab ⇥` replaces `skills` as the last command key, so the keys stay two rows of four (owner's
choice, 2026-10-30): `help`, `about`, `work`, `projects`, then `cv`, `ls`, `clear`, `Tab ⇥`.
`skills` is still one tap away in `help` and `ls`. Every phone export with command keys is
re-exported with it.

With the phone's keyboard open the command keys hide as before (FR-053), except the Tab key: it
stays alone at the right of a strip between the screen and the keyboard, so pressing it keeps the
keyboard open. The screen gives the strip 60 px. Export:
`exports/phone-23-keyboard-tab-key-375.png`.

```
+-------------------------------------+
| ‹ Home          Terminal            |
+-------------------------------------+
|  +-------------------------------+  |
|  | • cv-os pocket                |  |
|  | +---------------------------+ |  |
|  | | (guest)(~)                | |  |
|  | | ❯ about                   | |  |
|  | | [Name] ...                | |  |
|  | | (guest)(~)                | |  |
|  | | ❯ cat ~/skills █          | |  |
|  | +---------------------------+ |  |
|  |                     [Tab ⇥]   |  |
|  +-------------------------------+  |
+-------------------------------------+
|  (the phone's own keyboard)         |
+-------------------------------------+
```

- The line was `cat ~/sk`; one press completed it. A second press in a row lists the matches,
  as the second Tab does.
- The key is a button named `Tab, complete`, 75 × 52 px (66 × 48 below 375 px). Pressing it
  leaves focus in the command line.
- In landscape it is the last of the 2 columns of 4.

### Insert mode (FR-079)

`vim notes.txt` on a path that doesn't exist opens an empty, new file (FR-058, FR-080); `i`
enters insert mode. Exports: `exports/desktop-22-vim-insert-1440.png`,
`exports/phone-24-vim-insert-esc-375.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — vim                         #
#    1 Questions for the interview:                                #
#    2 - the team's stack and how it ships                         #
#    3 - remote work▏                                              #
# ~                                                                #
# ~                                                                #
# [-- INSERT --] notes.txt [+]                    text  3,14  All  #
# "notes.txt" [New]                                   ‹:help› ‹:q› #
#==================================================================#
```

- `▏` is the insert-mode cursor: a 2 px haze bar (`border.thick`), the line's text height, before
  the character it inserts at (owner's choice, 2026-10-30). Normal mode keeps the approved block.
- The mode pill reads `-- INSERT --`, as vim words it, in the same mint (FR-079). `[+]` follows
  the name once the text differs from the file, and goes when it is written.
- The message line keeps vim's opening line for a new file, `"[file]" [New]`, until the next
  message.
- On the phone, entering insert mode opens the phone's keyboard (FR-066). The vim keys hide and
  the strip holds `Esc` alone, at the right, which returns to normal mode. A tap on the text
  moves the cursor there.

### Written with `:w` (FR-080)

Escape, then `:w` and Enter. Export: `exports/desktop-23-vim-written-1440.png`.

```
# [NORMAL] notes.txt                              text  3,13  All  #
# "notes.txt" [New] 3L, 79B written                   ‹:help› ‹:q› #
```

- vim's own message: the name, `[New]` for a file that didn't exist, then lines and bytes. `[+]`
  goes. Leaving insert mode moves the cursor back one character, as in vim.
- `:wq`, `:x` and `ZZ` write and close the view. The Terminal's output comes back with
  `vim notes.txt` after its prompt, and `ls` lists `notes.txt` with the visitor's files.

### A protected file: `W10`, `E45` and `E37` (FR-064, FR-081)

`vim about` opens the built `about` file marked `[RO]`, as vim marks a file it may not write. It
can still change on screen, and the first change gives vim's warning. `:w` then gives `E45`, and
`:q` gives `E37` while the changes are unwritten; `:q!` leaves without them, and
`:w ~/about-notes` keeps an edited copy. Exports: `exports/desktop-24-vim-readonly-warning-1440.png`,
`exports/desktop-25-vim-e45-1440.png`, `exports/desktop-26-vim-e37-1440.png`, and at 320 px
`exports/phone-25-vim-e45-320.png`.

```
#==================================================================#
# [x] [-] [^]               Terminal — vim                         #
#    1 [Name]                                                      #
#    2 [label]                                                     #
#    3 [city], [country]                                           #
#    4 [summary ................................................]  #
#    5 Ask about the stack and the team▏                           #
# ~                                                                #
# [-- INSERT --] about [RO] [+]                         5,33  All  #
# W10: Warning: Changing a readonly file              ‹:help› ‹:q› #
#==================================================================#
```

After Escape and `:w`, then after `:q`:

```
# [NORMAL] about [RO] [+]                               5,32  All  #
# E45: 'readonly' option is set (add ! to override)  ‹:help› ‹:q› #

# [NORMAL] about [RO] [+]                               5,32  All  #
# E37: No write since last change (add ! to override) ‹:help› ‹:q› #
```

- Messages are vim's, in vim's words (FR-060): information in haze, the warning `W10` in amber
  (`color.vim-warning`, new), errors in rose (`color.terminal-error`). The site's own "read only"
  message is gone.
- Other errors take the same rose line: `E32: No file name` for `:w` on `cv`'s piped text,
  `"[path]" E212: Can't open file for writing` for a protected or missing folder and for `:w!` on
  a protected file, `"[path]" E514: Write error (file system full?)` past the 1 MB limit, and
  `E492: Not an editor command: [typed]` for an unknown `:` command.
- A message longer than the line wraps onto a second line: the message line grows and the text
  above gives up a row. At 320 px `E45` takes two lines.
- The `:q` chip acts as `:q`: with unwritten changes it gives `E37` and the view stays.
- The file's lines in the mockup are illustrative; the build shows the `about` file's own.

### The vim keys on the pocket terminal (FR-066)

Three rows of four: `j`, `k`, `za`, `/`, then `n`, `gg`, `G`, `i`, then `u`, `:w`, and `:q`
twice as wide, mint, the way out. The third row takes the speaker grille's place, so the screen
keeps its height at 375 px; at 320 px, with no grille, the screen gives up the row. In insert
mode the keyboard opens and the strip shows `Esc`. Exports: `exports/phone-7-vim-keys-375.png`,
`exports/phone-25-vim-e45-320.png`.

```
|  | [  j  ][  k  ][ za  ][  /  ]  |  |
|  | [  n  ][ gg  ][  G  ][  i  ]  |  |
|  | [  u  ][ :w  ][     :q     ]  |  |
|  |       A L E X · P R O F I R   |  |
```

### Forced colors (FR-033)

- **The insert bar**: `Highlight`, as the filled cursor is.
- **The messages**: `CanvasText`, words unchanged; warning and error alike.
- **The `-- INSERT --` pill**: as the `NORMAL` pill.
- **The Tab and Esc keys**: outlined in `ButtonText`, as every key.

## Keyboard, focus and screen readers

| Moment | Where focus is | What a screen reader hears |
|--------|----------------|----------------------------|
| The Terminal opens | The command line | "Terminal", then the command line's name, "Command" (FR-004, FR-027) |
| Enter runs a command | Stays in the command line | The output once: in full up to 5 lines, else a summary such as "help: [n] commands", counting the standard commands too (FR-028) |
| A command control is activated | Back to the command line | As if the command were typed (FR-015) |
| Tab with text before the cursor | Stays in the command line | The line's new text after a completion, or the number of matches when a second Tab lists them; nothing when nothing matches (FR-076, FR-077) |
| Tab on an empty command line, Escape then Tab, or Shift+Tab | Out of the command line: the next control in the output, then the shell (Shift+Tab: the one before) | Nothing from the Terminal. The command line's description says how: `Tab completes. Escape then Tab leaves.` (FR-026, FR-077). Amended 2026-10-30: Tab always left and never completed |
| `cv`, or `vim` with a file | Into the vim view | The file's name, `read only` for a protected file or `new` for one that doesn't exist yet, its number of lines, and "Type :q to leave" (FR-065). Amended 2026-10-30: always `read only` |
| `:q` in the vim view | Back to the command line | The Terminal's output, as it was |
| Tab in the vim view, normal mode | The next control: the `:help` and `:q` chips, then out to the shell | Nothing in the file changes |
| Insert mode | Stays in the view. Tab inserts a tab; Shift+Tab, or Escape then Tab, leave | What is typed and deleted, as in a text field; the mode once (FR-065) |
| `:w`, a warning or an error in the vim view | Stays in the view; `:wq`, `:x` and `ZZ` return to the command line | The message line, once (FR-065) |
| The pocket terminal's Tab key | Stays in the command line; the keyboard stays open | As Tab (FR-078) |
| `exit`, or Close in the menu | The Terminal item in the dock (005 FR-023) | — |
| Focus leaves the command line | Wherever it went; the cursor turns hollow | Nothing from the Terminal |
| A click or tap on the screen, not on a link or a control | The command line; the cursor fills and blinks; nothing scrolls (FR-071) | The command line's name, "Command" |
| Cmd+A, or Ctrl+A outside macOS | Stays where it was | The screen reader's own report of a selection |
| Ctrl+C with nothing selected | Stays in the command line | "Cancelled", once |
| A command line stopped by its limit | Stays in the command line | The stop line, once |
| The shell loading, then failing | Stays in the command line | "Loading the shell", then the error line, each once; `try again` is a button |

- Headings: one heading names the Terminal (visually hidden). Each command run is a heading one
  level below, holding the command as typed. Sections in `cv` are a level below that, and entries
  a level below their section (FR-029).
- The prompt's `guest`, path and time are hidden from screen readers in each command's heading;
  the path is read once when it changes (FR-027).
- Focus indicator: 005's 2 px periwinkle outline, 2 px outside, on chips, underlined controls,
  links and keys. The command line has none: its filled cursor is its focus indicator, and the
  hollow cursor shows that focus is elsewhere (FR-072). Amended 2026-10-29: the command line had
  the outline too.

## Site text

| Where | Text |
|-------|------|
| Window title | `Terminal — [path]`, such as `Terminal — ~/work` |
| Menu title and dock name | `Terminal` |
| Menu item | `Clear output` |
| Greeting | None (FR-005). Amended 2026-10-29: the greeting's text is gone, in both shells |
| Starter controls | `help`, `about`, `work`, `projects`, `cv` |
| Prompt | `guest`, the path, and on desktop `◷ [hh:mm]`; then `❯` |
| Command line's name | `Command` |
| Command line's description (FR-077) | `Tab completes. Escape then Tab leaves.` |
| `help` | `Click a command to run it, or type it and press Enter.` (phone: `Tap a command to run it.`), then `Tab completes a command or path; Escape then Tab leaves the command line.` (phone: `Tab ⇥ completes a command or path.`) (FR-077, added 2026-10-30), then each command and its description as listed in the desktop `help` frame, with `vim`: `Edit a file in vim. - reads what is piped in` (amended 2026-10-30: `Read a file in vim. …`), plus `history`: `Commands run so far`, `clear`: `Clear the screen`, `exit`: `Close the Terminal`; then `Standard commands` and `as in bash. help <command> shows its options.`, then the standard commands' names |
| Unknown command (FR-016) | `[typed]: command not found. Run help to see them all, or try:` and the suggestions. With none: `[typed]: command not found. Run help to see them all.` Amended 2026-10-29: `[typed] is not a command. …` |
| `specs` | `Every feature is specified before it is built. [n] specs:` … `All specs, plans and history: [repository]` |
| `cv` description in `help` | `The CV's JSON in vim: cat cv.json \| jq \| vim -` |
| Vim view, opening | vim's line for the file, then `  ·  za or click opens a fold` (phone: `  ·  tap a fold`): `"[file]" [n] lines` for a visitor's file, `"[file]" [readonly] [n] lines` for a protected one, `"[file]" [New]` for one that doesn't exist yet, `"[No Name]" [n] lines` for piped text. Amended 2026-10-30: always `[readonly]` |
| Vim view, status line name | The file's path as typed, or `[No Name]` for piped text |
| Vim view, messages (FR-060) | vim's own, in English, such as `"[file]" [New] [n]L, [n]B written`, `W10: Warning: Changing a readonly file`, `E37: No write since last change (add ! to override)`, `E45: 'readonly' option is set (add ! to override)`, `E32: No file name`, `"[path]" E212: Can't open file for writing`, `"[path]" E514: Write error (file system full?)`, `E492: Not an editor command: [typed]`. Amended 2026-10-30: `[file] is read only: nothing can be changed` and `:[typed] is not a command here. :help lists the keys.` |
| Vim view, search | `/[text]   match [i] of [n]  ·  n next  ·  N previous`, or `/[text]   not found` |
| Vim view, key help | As in the key help frame |
| `jq` errors | jq's own messages, as jq prints them, for input that isn't JSON and for a filter it can't parse (FR-056). Amended 2026-10-29: `jq here only pretty-prints. …` went with the filter |
| Pipe into a command that reads no input | None: the command runs and ignores its input, as in bash (FR-057). Amended 2026-10-29: `[command] doesn't read piped input. …` went |
| Shell loading (FR-070) | `loading the shell · type away, commands run once it is ready` (phone: the same, on two lines) |
| Shell failed to load (FR-070) | `The shell couldn't load. Check the connection, then try again.` and the control `try again` |
| Command line stopped (FR-069) | `stopped: it ran for 5 seconds, the longest a command line runs here.` / `stopped: it ran 10,000 commands, the most a command line runs here.` / `stopped: it printed 1 MB, the most a command line prints here.` |
| Ctrl+C (FR-075) | `^C` after the line as typed; while a command line runs, also `stopped: you pressed Ctrl+C.` |
| A protected path (FR-049) | GNU's reply for the command, ending `Permission denied`, such as `rm: cannot remove 'about': Permission denied` or `bash: about: Permission denied` for a redirect |
| The visitor's files full (FR-073) | GNU's reply ending `No space left on device`, such as `touch: cannot touch 'big': No space left on device` |
| Syntax error (FR-067) | bash's message without its `bash: ` prefix, such as ``unexpected EOF while looking for matching `"'`` or `syntax error near unexpected token '\|'` |
| A standard command's errors (FR-017, FR-068) | The GNU tool's own messages and `--help` text, in English |
| `ls -l` owners (FR-049) | `root` for the protected files and folders, `guest` for the visitor's |
| Empty section (FR-011) | `The CV lists no [section].` |
| No such path (FR-048) | `[path]: no such file or folder.` |
| `cd` on a file | `[path] is a file. Try cat [path].` with `cat [path]` as a control |
| `cat` on a folder | `[path] is a folder. Try ls [path].` with `ls [path]` as a control |
| Wrong arguments (FR-017) | `[command] takes [what]. Usage: [usage]`, the usage as `help` shows it |
| `open` with another name | `open takes cv or about.` with both as controls |
| Pocket case | `cv-os pocket`, and `[name]` from the CV document, set in capitals and spaced out (decoration, hidden from screen readers) |
| Key names | `help`, `about`, `work`, `projects`, `cv`, `ls`, `clear`, and `Tab ⇥`, named `Tab, complete`; in the vim view `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `i`, `u`, `:w`, `:q`, named for screen readers `Down`, `Up`, `Open or close fold`, `Search`, `Next match`, `Top`, `Bottom`, `Insert`, `Undo`, `Write`, `Quit`; in insert mode `Esc`, named `Esc, back to normal mode`. Amended 2026-10-30: `skills` instead of `Tab ⇥`, and no `i`, `u`, `:w` or `Esc` |
