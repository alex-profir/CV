# Contract: The Terminal's Interface

The structure, names, keyboard, focus and announcements of the Terminal, in a desktop window and
as the pocket terminal. Visual values are the design's
([design/wireframes.md](../design/wireframes.md), [design/README.md](../design/README.md)). Site
text is quoted as the design sets it. What each command prints is in
[commands.md](./commands.md).

## Structure

The same tree renders in a window's `.window-content` and in a full-screen view's
`.view-content`. On mobile it is wrapped in the pocket terminal.

```text
div.terminal                          data-shell-look desktop|pocket          FR-024 FR-031 FR-032 FR-033 FR-035
                                      data-shell-state idle|loading|ready|running|failed   (FR-069, FR-070)
├── h1.visually-hidden                "Terminal"                              FR-029
├── div.terminal-screen               the scroll container; output never scrolls the page   FR-019 FR-023
│   ├── div.starter                   button.command-chip × 5: help, about, work, projects, cv; no greeting text   FR-005 FR-015 FR-030
│   │                                 (amended 2026-10-29: the greeting's three lines are gone)
│   ├── section.run × entries         aria-labelledby its h2                  FR-029
│   │   ├── h2.run-command            span.prompt[aria-hidden] (guest · {path} · ◷ {hh:mm} · ❯; FR-027 FR-046), then {line as typed}   FR-006 FR-027 FR-029
│   │   └── div.run-output            the output block (FR-009 to FR-018, FR-043 to FR-057)
│   └── form.prompt-line              the live prompt                         FR-006
│       ├── span.prompt[aria-hidden]  guest · {path} [· ◷ {hh:mm}] · ❯         FR-027 FR-046
│       ├── label.visually-hidden     "Command"                               FR-027
│       ├── input.command-line        type=text, maxlength {command-line.max-length}, aria-describedby the
│       │                             hidden "Tab completes. Escape then Tab leaves." (FR-077)   FR-006 FR-017 FR-018 FR-020 FR-026 FR-027 FR-076 FR-077
│       └── span.cursor-mirror[aria-hidden]  the typed text, its selection and the block cursor:
│                                     data-focused (filled) or not (hollow), data-blinking   FR-032 FR-072 FR-074
│   (while the shell loads, p.shell-loading under the starter chips; after a failed load,
│    p.shell-failed and button.command-chip "try again" in its place; a stopped line's
│    p.run-stopped in its .run)   FR-069 FR-070 FR-075
│   (added 2026-10-30: a second Tab's list is a section.run whose h2 is the line as typed and
│    whose div.completion-list holds the names in readline's columns, as text, or the haze line
│    "Display all {n} possibilities? (y or n)"; never controls)   FR-076
├── section.vim                       only while the vim view is open, in place of .terminal-screen   FR-058 to FR-065
└── div.terminal-status[role=status].visually-hidden   announcements                FR-028
```

- The window is named by 005's title bar. Its text is `Terminal — {path}`, or `Terminal — vim`
  while the vim view is open, from the Terminal's `WindowTitle`, whose `span` carries
  `data-req="006-terminal-FR-046"`. On mobile the header shows
  `Terminal` (005 FR-032).
- `.run` groups are in run order. `clear` and the Terminal menu's `Clear output` remove them all
  and the starter chips with them (FR-019).
- The prompt line's `form` has no submit button. Enter submits, and the handler prevents the
  page from navigating.
- The command line has no border, outline, background or shadow, focused or not (FR-072). Its
  cursor is filled while it has focus and hollow when it doesn't (research R36).
- Tab completes (added 2026-10-30): see Keyboard. A completion list's names are `span`s in a grid
  of readline's columns ([data-model.md](../data-model.md#completion-fr-076-to-fr-078-research-r43-r44)),
  folders bold periwinkle with their `/`, files snow, all selectable output (FR-076).
- A `pointerup` (for a touch, its `click`: a tap's compatibility `mousedown` moves focus after
  the `pointerup`) on `.terminal-screen` outside a link, a control, an input and the vim view, that
  leaves the page's selection collapsed or unchanged, focuses the command line without scrolling
  (FR-071).
- Command controls: `button.command-chip` (outlined, 26 px tall) or `button.command-inline`
  (underlined text in a 24 px row). Each is named by the command line it runs, such as `ls work`.
  The visible text may be shorter, such as `work/`, so `aria-label` holds the full line. Both carry
  `data-req="006-terminal-FR-015 006-terminal-FR-034"`.
- Links to other sites are `a` with 004's `Arrow` glyph, `aria-hidden`. Ctrl-click, middle-click and
  long-press behave as on any link. `a` elements in the output have no handler of their own.
- Every glyph outside the site fonts' subsets (`❯`, `◷`, the cursor block, `↗`) is inline SVG or a
  CSS box, `aria-hidden` (research R16).

## The pocket terminal (mobile)

```text
div.pocket                            data-keyboard while the on-screen keyboard is open   FR-024 FR-052 FR-053
├── div.pocket-case[aria-hidden=true] the drawn case's top: power light, "cv-os pocket"   FR-054
├── div.terminal …                    as above, in the recessed screen
├── div[role=toolbar].pocket-keys     aria-label "Command keys" | "Vim keys"; hidden while data-keyboard   FR-025 FR-051 FR-053 FR-066
│   └── button.pocket-key × 8         help, about, work, projects, cv, ls, clear, Tab ⇥ (named "Tab, complete")
│                                     (amended 2026-10-30: Tab ⇥ in skills' place, FR-078)
│                                     — or, with the vim view open, × 11 in three rows —
│                                     j, k, za, /, n, gg, G, i, u, :w, :q (twice as wide), named Down, Up,
│                                     Open or close fold, Search, Next match, Top, Bottom, Insert, Undo, Write,
│                                     Quit, each after its key: "gg, Top" (WCAG 2.5.3) (amended 2026-10-30: i, u, :w)
├── div.pocket-strip                  only while data-keyboard: button.pocket-key "Tab ⇥", or in the vim view's
│                                     insert mode "Esc" (named "Esc, back to normal mode"), alone at its right   FR-066 FR-078
└── div.pocket-foot[aria-hidden=true] the drawn case's foot: grille, {basics.name} (left out when the CV has no name); in the page after the keys, as it is seen (004 FR-027)   FR-054
```

- Keys are at least 44 × 44 CSS px: 52 px tall in portrait, 48 px below 375 px wide, at least 44 px
  in landscape (FR-051, FR-066). In portrait they sit in 4 columns below the screen, in landscape
  in 2 columns of 4 to its right (FR-052).
- A command key runs its command through the same path as a command control (FR-015). A vim key
  sends its key to the vim view and keeps focus in it. `/` focuses the search input, which opens
  the phone's keyboard; `i` enters insert mode and focuses `textarea.vim-insert` inside the tap's
  handler, which opens it too (FR-066, research R48).
- The Tab key sends Tab's completion from the command line's text and cursor, and never takes
  focus from the command line: its `pointerdown` is `preventDefault`ed, so the phone's keyboard
  stays open (FR-078, research R46). Reached with the keyboard, it acts on Enter or Space and focus
  returns to the command line.
- The toolbar is one Tab stop. The arrow keys move between keys, and Home and End go to the first
  and last.

## The vim view

```text
section.vim                           aria-label "{file}", with ", read only" for a protected file and ", new" for a new one   FR-058 FR-065
├── div.vim-text                      tabindex=0 (-1 in insert mode), role=document, the same aria-label,
│   │                                 aria-roledescription "vim view", aria-describedby the status line   FR-060 FR-063 FR-079
│   └── div.vim-line × lines          grid: span.vim-number (first row only) · span.vim-code   FR-063
│       └── button.vim-fold           for a closed or open top-level fold: aria-expanded,
│                                     "+-- {n} lines: "{key}": [ ···"          FR-061 FR-065
├── textarea.vim-insert               only in insert mode, laid transparent over the text, holding the buffer with
│                                     its caret at the cursor; named and described as .vim-text (research R48)   FR-065 FR-066 FR-079
├── div.vim-help                      only after :help: the keys, as the design's key help; role=region, tabindex=0, named by its heading, as it scrolls   FR-064
├── div.vim-status                    [NORMAL|-- INSERT --|HELP] · {file or [No Name]} · [RO] · [+] · {pipe} · {type} ·
│                                     {line},{column} · {Top|Bot|All|n%}; marks and pipe in haze   FR-058 FR-059 FR-079 FR-081
└── div.vim-message                   the message, toned info (haze), warning (color.vim-warning) or error
                                      (color.terminal-error), wrapping to a second line when long; or input.vim-entry
                                      while / or : is typed; button.command-chip ":help", button.command-chip ":q"   FR-060 FR-062 FR-064 FR-080
```

- Search matches are `mark` elements. The current match also has `aria-current="true"` and an
  outline, so it differs by more than color (FR-062).
- The cursor is a span with the character under it in normal mode, and a 2 px bar before it in
  insert mode (`border.thick`, `color.terminal-cursor`). It isn't in the accessibility tree. The
  status line says where it is. A click or tap on the text moves it there (FR-079, research R48).
- The line number gutter is `aria-hidden`, so a screen reader reads the JSON, not the numbers.

## Keyboard

| Where | Keys | Does |
|-------|------|------|
| Command line | Enter | Runs the line (FR-006). An empty line gives a new prompt and nothing else (FR-007) |
| Command line | Up, Down | Steps through the history, newest first, without running. Down past the newest gives back the saved draft (FR-020) |
| Command line | Tab, with text other than spaces before the cursor and no Escape since the last key | Completes, as bash's readline (FR-076, research R43, R44); a second in a row lists the matches; 100 or more ask first, and the next key answers |
| Command line | Tab on an empty line or spaces, Escape then Tab, Shift+Tab, any modified Tab | The browser's: focus moves on (FR-026). Amended 2026-10-30: Tab always moved on |
| Command line | The system's editing keys: Left, Right, Home, End, Cmd+Left/Right and Option+Left/Right (macOS), Ctrl+Left/Right (others), Shift with any, Backspace and Delete with their modifiers, undo, redo | The text field's own (FR-074) |
| Command line | Ctrl+A, Ctrl+E, Ctrl+B, Ctrl+F, Ctrl+K, Ctrl+U, Ctrl+W, Ctrl+L (macOS only) | Readline's: line start, end, back, forward, delete to the end, to the start, the word before, clear the screen keeping the line (FR-074, research R37) |
| Command line, output | Cmd+A (macOS), Ctrl+A (others) | Selects the Terminal's text and nothing else. A printable key then clears it and types (FR-075) |
| Command line | Ctrl+C with nothing selected | Cancels the line with `^C`, or stops the running line (FR-075). With text selected: the browser's |
| Command line | Escape (noted, to let the next Tab leave, never `preventDefault`ed), every other Ctrl, Alt and Meta combination, 005's `Alt+Shift` shortcuts, and on Windows and Linux Ctrl+W, Ctrl+L, Ctrl+U, Ctrl+K and Ctrl+E | Not handled: the browser, the screen reader and the shell keep them (FR-026) |
| A command control | Enter, Space, click, tap | Runs its line as typed, and focus returns to the command line (FR-015) |
| Pocket keys | Left, Right, Home, End | Move between keys |
| Pocket Tab key | click, tap, Enter, Space | Tab's completion; focus stays in, or returns to, the command line (FR-078) |
| Vim text, normal mode | FR-060's and FR-079's keys, and Ctrl+R on macOS | [data-model.md](../data-model.md#vim-view-key-entities-vim-view-pipe)'s transitions |
| Vim text, normal mode | Tab, Shift+Tab, Ctrl+R off macOS, any other Ctrl, Alt or Meta combination | Not handled (FR-060, FR-065) |
| Vim insert (`textarea.vim-insert`) | Typing, Backspace, Delete, Enter, the arrows, Tab with no Escape since | Edits the buffer through the reducer (`beforeinput`); Tab inserts a tab (FR-079, research R48) |
| Vim insert | Escape | Normal mode, focus back on `.vim-text` (FR-065) |
| Vim insert | Shift+Tab, any Ctrl, Alt or Meta combination | Not handled: Shift+Tab leaves the view (FR-065) |
| Vim entry (`/`, `:`) | Enter, Escape | Submits, cancels (FR-060) |

The Terminal takes no key from a browser or a screen reader, and no shortcut of its own beyond
these keys, which act only while focus is in the command line or the vim view (FR-026).

## Focus

| After | Focus goes to |
|-------|---------------|
| Opening the Terminal, restoring it, the dock or Window menu bringing it to the front, `Alt+Shift+N` reaching it, or opening it on the home screen | The command line, or the vim text when the vim view is open (FR-004). The window or full-screen view is named, so "Terminal" is announced first |
| Enter in the command line | Stays in the command line (FR-028) |
| A command control or command key | The command line (FR-015) |
| `cv`, or `vim` opening the view | `.vim-text` (FR-065) |
| `:q`, or the `:q` chip | The command line (FR-064); with unwritten changes, `E37` and focus stays in the view |
| `:wq`, `:x`, `ZZ` after a write | The command line (FR-080) |
| `i`, `a`, `o` and the rest into insert mode | `textarea.vim-insert` (research R48) |
| Escape in insert mode | `.vim-text` |
| Tab or the pocket Tab key completing | Stays in the command line (FR-076, FR-078) |
| `clear` or `Clear output` | The command line |
| A click or tap on the screen outside links and controls, that selects nothing (FR-071) | The command line, without scrolling |
| A line stopped, or the shell restarted (FR-069) | Stays in the command line |
| `exit` on desktop | 005 FR-023's rule: the next window's title, or the Terminal's dock item |
| `exit` on mobile | The home screen's Terminal icon (005 FR-034) |
| `open cv`, `open about` | The opened window's title, as the dock or site menu would (005 FR-040) |

The focus indicator is 005's: a 2 px `color.focus-shell` outline, 2 px outside, on chips, inline
controls, links, keys, fold lines, the vim text and, in insert mode, the view's text area. The command line's is its filled cursor
instead (FR-072).

## Announcements (FR-028, FR-065)

Written to `.terminal-status`, once each:

| After | Announced |
|-------|-----------|
| A command whose output is at most 5 rows | The output's text |
| A longer output | `{command}: {count} {unit}`, such as `work: 4 entries`, `help: 22 commands`, `ls: 11 entries`, or `grep: 12 lines` for text the shell printed (research R30) |
| A line stopped (FR-069) | The "stopped" line, once |
| Ctrl+C with nothing selected (FR-075) | `Cancelled`, once |
| The shell loading, then failing (FR-070) | `Loading the shell`, once, politely; then nothing when it is ready unless a waiting line runs; or the failure line, once |
| `cd` | `Now in {path}` |
| `clear` | `Cleared` |
| Opening the vim view | `{file}, {n} lines. Type :q to leave.`, with `read only` after the name for a protected file and `new` for a new one (amended 2026-10-30) |
| A completion (added 2026-10-30) | The line's new text (FR-077) |
| A second Tab's list | `{n} possibilities` (FR-077); the question's own text when it asks |
| A vim message change, or the mode changing | The message line's text; `-- INSERT --` or `NORMAL` once (FR-065) |

Rows are counted as research R13 sets. Every announcement is site text with placeholders, in
`siteText.terminal.announce` (FR-030).

## Headings (FR-029)

```text
h1  Terminal                                  (visually hidden, once)
  h2  {command as typed}                      (one per run)
    h3  {section}                             (when the output holds several sections)
      h4  {entry}                             (work, projects and education entries)
    h3  {entry}                               (when the output is one section, such as `work`)
```

The starter chips have no heading. The vim view is named by its `aria-label`.

## `data-req` targets

Written literally in the TSX, so the traceability check (001) reads them (FR-037):

| Element | `data-req` |
|---------|-----------|
| `div.terminal` | `006-terminal-FR-019 006-terminal-FR-023 006-terminal-FR-031 006-terminal-FR-032 006-terminal-FR-033 006-terminal-FR-035` |
| `h1` | `006-terminal-FR-029` |
| `div.starter` | `006-terminal-FR-005 006-terminal-FR-030` |
| `section.run` | `006-terminal-FR-006 006-terminal-FR-029` |
| `div.run-output` | `006-terminal-FR-009 006-terminal-FR-010 006-terminal-FR-011 006-terminal-FR-018` |
| `input.command-line` | `006-terminal-FR-004 006-terminal-FR-006 006-terminal-FR-007 006-terminal-FR-017 006-terminal-FR-018 006-terminal-FR-020 006-terminal-FR-026 006-terminal-FR-027 006-terminal-FR-072 006-terminal-FR-074 006-terminal-FR-075 006-terminal-FR-076 006-terminal-FR-077` |
| `div.completion-list` (added 2026-10-30) | `006-terminal-FR-076` |
| the pocket Tab key, `div.pocket-strip` | `006-terminal-FR-078` |
| `textarea.vim-insert` | `006-terminal-FR-065 006-terminal-FR-079` |
| `div.vim-status` | `006-terminal-FR-058 006-terminal-FR-081` |
| `div.vim-message` | `006-terminal-FR-060 006-terminal-FR-080` |
| `span.cursor-mirror` | `006-terminal-FR-032 006-terminal-FR-072 006-terminal-FR-074` |
| `div.terminal-screen` | `006-terminal-FR-071 006-terminal-FR-075` |
| `p.shell-loading`, `p.shell-failed` and its `try again` control | `006-terminal-FR-070` |
| `p.run-stopped` | `006-terminal-FR-069 006-terminal-FR-075` |
| `help`'s standard group | `006-terminal-FR-008 006-terminal-FR-068` |
| `.terminal-status` | `006-terminal-FR-028 006-terminal-FR-077` |
| `span.prompt`, live and echoed | `006-terminal-FR-027 006-terminal-FR-046` |
| the Terminal's `WindowTitle` `span` | `006-terminal-FR-046` |
| `help` output | `006-terminal-FR-008` |
| command controls | `006-terminal-FR-015 006-terminal-FR-034`, plus `006-terminal-FR-016` (suggestions), `006-terminal-FR-048` (path replies), `006-terminal-FR-050` (`ls` names) |
| `ls` output | `006-terminal-FR-043 006-terminal-FR-050` |
| `specs` output | `006-terminal-FR-013` |
| `div.pocket` | `006-terminal-FR-024 006-terminal-FR-025 006-terminal-FR-052 006-terminal-FR-053` |
| `div.pocket-case` | `006-terminal-FR-054` |
| `div.pocket-foot` | `006-terminal-FR-054` |
| `div.pocket-keys` | `006-terminal-FR-051 006-terminal-FR-066 006-terminal-FR-078` |
| `section.vim` | `006-terminal-FR-058 006-terminal-FR-059 006-terminal-FR-065` |
| `div.vim-text` | `006-terminal-FR-060 006-terminal-FR-063 006-terminal-FR-079` |
| `button.vim-fold` | `006-terminal-FR-061 006-terminal-FR-034` |
| `mark` (search) | `006-terminal-FR-062` |
| `div.vim-help`, the `:q` and `:help` chips | `006-terminal-FR-064` |
| `json` output rows | `006-terminal-FR-056` |
| dock item and home icon (005's, for the Terminal) | `006-terminal-FR-001` |
| Terminal menu's `Clear output` | `006-terminal-FR-003 006-terminal-FR-019` |

These are Non-UI and carry no target: FR-002, FR-012, FR-014, FR-021, FR-022, FR-036 to FR-042,
FR-044, FR-045, FR-047, FR-049, FR-055, FR-057, FR-067 and FR-073. The shell's behavior is in the
worker, which renders nothing (contracts/shell-worker.md).
