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
├── h1.visually-hidden                "Terminal"                              FR-029
├── div.terminal-screen               the scroll container; output never scrolls the page   FR-019 FR-023
│   ├── div.greeting                  aria-labelledby nothing; plain text and controls      FR-005
│   │   ├── p                         "cv-os terminal · read only · nothing you type leaves your browser" (desktop)
│   │   ├── p                         {basics.name} — {basics.label}, or the site heading when the CV has no name
│   │   ├── p                         "This is my CV as a terminal. … New here? Try " button.command-inline "help" "."
│   │   └── div.chips                 button.command-chip × 5: help, about, work, projects, cv   FR-015
│   ├── section.run × entries         aria-labelledby its h2                  FR-029
│   │   ├── h2.run-command            span.prompt[aria-hidden] (guest · {path} · ◷ {hh:mm} · ❯; FR-027 FR-046), then {line as typed}   FR-006 FR-027 FR-029
│   │   └── div.run-output            the output block (FR-009 to FR-018, FR-043 to FR-057)
│   └── form.prompt-line              the live prompt                         FR-006
│       ├── span.prompt[aria-hidden]  guest · {path} [· ◷ {hh:mm}] · ❯         FR-027 FR-046
│       ├── label.visually-hidden     "Command"                               FR-027
│       ├── input.command-line        type=text, maxlength {command-line.max-length}   FR-006 FR-017 FR-018 FR-020 FR-026 FR-027
│       └── span.cursor-mirror[aria-hidden]  the typed text and the block cursor   FR-032
├── section.vim                       only while the vim view is open, in place of .terminal-screen   FR-058 to FR-065
└── div.terminal-status[role=status].visually-hidden   announcements                FR-028
```

- The window is named by 005's title bar. Its text is `Terminal — {path}`, or `Terminal — vim`
  while the vim view is open, from the Terminal's `WindowTitle`, whose `span` carries
  `data-req="006-terminal-FR-046"`. On mobile the header shows
  `Terminal` (005 FR-032).
- `.run` groups are in run order. `clear` and the Terminal menu's `Clear output` remove them all
  and the greeting with them (FR-019).
- The prompt line's `form` has no submit button. Enter submits, and the handler prevents the
  page from navigating.
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
├── div.pocket-case[aria-hidden=true] the drawn case: power light, "cv-os pocket", grille, {basics.name} (left out when the CV has no name)   FR-054
├── div.terminal …                    as above, in the recessed screen
└── div[role=toolbar].pocket-keys     aria-label "Command keys" | "Vim keys"; hidden while data-keyboard   FR-025 FR-051 FR-053 FR-066
    └── button.pocket-key × 8         help, about, work, projects, skills, cv, ls, clear
                                      — or, with the vim view open —
                                      j, k, za, /, n, gg, G, :q, named Down, Up, Open or close fold,
                                      Search, Next match, Top, Bottom, Quit
```

- Keys are at least 44 × 44 CSS px: 52 px tall in portrait, 48 px below 375 px wide, at least 44 px
  in landscape (FR-051, FR-066). In portrait they sit in 4 columns below the screen, in landscape
  in 2 columns of 4 to its right (FR-052).
- A command key runs its command through the same path as a command control (FR-015). A vim key
  sends its key to the vim view and keeps focus in it. `/` focuses the search input, which opens
  the phone's keyboard.
- The toolbar is one Tab stop. The arrow keys move between keys, and Home and End go to the first
  and last.

## The vim view

```text
section.vim                           aria-label "{file} (read only)"          FR-058 FR-065
├── div.vim-text                      tabindex=0, role=document, aria-readonly=true,
│   │                                 aria-roledescription "vim view", aria-describedby the status line   FR-060 FR-065
│   └── div.vim-line × lines          grid: span.vim-number (first row only) · span.vim-code   FR-063
│       └── button.vim-fold           for a closed or open top-level fold: aria-expanded,
│                                     "+-- {n} lines: "{key}": [ ···"          FR-061 FR-065
├── div.vim-help                      only after :help: the keys, as the design's key help   FR-064
├── div.vim-status                    [NORMAL|HELP] · {file} · [RO] · {pipe} · {type} · {line},{column} · {Top|Bot|All|n%}   FR-058 FR-059
└── div.vim-message                   the message, or input.vim-entry while / or : is typed;
                                      button.command-chip ":help", button.command-chip ":q"   FR-060 FR-062 FR-064
```

- Search matches are `mark` elements. The current match also has `aria-current="true"` and an
  outline, so it differs by more than color (FR-062).
- The cursor is a span with the character under it. It isn't in the accessibility tree. The status
  line says where it is.
- The line number gutter is `aria-hidden`, so a screen reader reads the JSON, not the numbers.

## Keyboard

| Where | Keys | Does |
|-------|------|------|
| Command line | Enter | Runs the line (FR-006). An empty line gives a new prompt and nothing else (FR-007) |
| Command line | Up, Down | Steps through the history, newest first, without running. Down past the newest gives back the saved draft (FR-020) |
| Command line | Tab, Shift+Tab | The browser's: focus moves on. Nothing is completed or inserted (FR-026) |
| Command line | Escape, Ctrl and Alt combinations, 005's `Alt+Shift` shortcuts | Not handled: the browser, the screen reader and the shell keep them (FR-026) |
| A command control | Enter, Space, click, tap | Runs its line as typed, and focus returns to the command line (FR-015) |
| Pocket keys | Left, Right, Home, End | Move between keys |
| Vim text | FR-060's keys | [data-model.md](../data-model.md#vim-view-key-entities-vim-view-pipe)'s transitions |
| Vim text | Tab, Shift+Tab, any Ctrl, Alt or Meta combination | Not handled (FR-060, FR-065) |
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
| `:q`, or the `:q` chip | The command line (FR-064) |
| `clear` or `Clear output` | The command line |
| `exit` on desktop | 005 FR-023's rule: the next window's title, or the Terminal's dock item |
| `exit` on mobile | The home screen's Terminal icon (005 FR-034) |
| `open cv`, `open about` | The opened window's title, as the dock or site menu would (005 FR-040) |

The focus indicator is 005's: a 2 px `color.focus-shell` outline, 2 px outside, on chips, inline
controls, links, keys, fold lines, the command line and the vim text.

## Announcements (FR-028, FR-065)

Written to `.terminal-status`, once each:

| After | Announced |
|-------|-----------|
| A command whose output is at most 5 rows | The output's text |
| A longer output | `{command}: {count} {unit}`, such as `work: 4 entries`, `help: 22 commands`, `ls: 11 entries` |
| `cd` | `Now in {path}` |
| `clear` | `Cleared` |
| Opening the vim view | `{file}, read only, {n} lines. Type :q to leave.` |
| A vim message change | The message line's text |

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

The greeting has no heading. The vim view is named by its `aria-label`.

## `data-req` targets

Written literally in the TSX, so the traceability check (001) reads them (FR-037):

| Element | `data-req` |
|---------|-----------|
| `div.terminal` | `006-terminal-FR-019 006-terminal-FR-023 006-terminal-FR-031 006-terminal-FR-032 006-terminal-FR-033 006-terminal-FR-035` |
| `h1` | `006-terminal-FR-029` |
| `div.greeting` | `006-terminal-FR-005 006-terminal-FR-030` |
| `section.run` | `006-terminal-FR-006 006-terminal-FR-029` |
| `div.run-output` | `006-terminal-FR-009 006-terminal-FR-010 006-terminal-FR-011 006-terminal-FR-018` |
| `input.command-line` | `006-terminal-FR-004 006-terminal-FR-006 006-terminal-FR-007 006-terminal-FR-017 006-terminal-FR-018 006-terminal-FR-020 006-terminal-FR-026 006-terminal-FR-027` |
| `span.cursor-mirror` | `006-terminal-FR-032` |
| `.terminal-status` | `006-terminal-FR-028` |
| `span.prompt`, live and echoed | `006-terminal-FR-027 006-terminal-FR-046` |
| the Terminal's `WindowTitle` `span` | `006-terminal-FR-046` |
| `help` output | `006-terminal-FR-008` |
| command controls | `006-terminal-FR-015 006-terminal-FR-034`, plus `006-terminal-FR-016` (suggestions), `006-terminal-FR-048` (path replies), `006-terminal-FR-050` (`ls` names) |
| `ls` output | `006-terminal-FR-043 006-terminal-FR-050` |
| `specs` output | `006-terminal-FR-013` |
| `div.pocket` | `006-terminal-FR-024 006-terminal-FR-025 006-terminal-FR-052 006-terminal-FR-053` |
| `div.pocket-case` | `006-terminal-FR-054` |
| `div.pocket-keys` | `006-terminal-FR-051 006-terminal-FR-066` |
| `section.vim` | `006-terminal-FR-058 006-terminal-FR-059 006-terminal-FR-065` |
| `div.vim-text` | `006-terminal-FR-060 006-terminal-FR-063` |
| `button.vim-fold` | `006-terminal-FR-061 006-terminal-FR-034` |
| `mark` (search) | `006-terminal-FR-062` |
| `div.vim-help`, the `:q` and `:help` chips | `006-terminal-FR-064` |
| `json` output rows | `006-terminal-FR-056` |
| dock item and home icon (005's, for the Terminal) | `006-terminal-FR-001` |
| Terminal menu's `Clear output` | `006-terminal-FR-003 006-terminal-FR-019` |

These are Non-UI and carry no target: FR-002, FR-012, FR-014, FR-021, FR-022, FR-036 to FR-042,
FR-044, FR-045, FR-047, FR-049, FR-055, FR-057.
