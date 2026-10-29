# Contract: The Playground's Interface

The structure, names, focus and announcements of the Playground, as the approved design
(design/wireframes.md) sets them and the tests read them. Class names are the ones the mockup's
`playground.css` uses, without its `pg-` prefix. Every element listed carries its `data-req`
values literally in TSX (Constitution III, FR-074).

## Desktop: the window's content

```text
section.playground                                   aria-label "Playground"
├── div.playground-loading            (download states only)
│   ├── h2                              "Downloading TypeScript" | "TypeScript needs one download" | "The download stopped"
│   ├── progress.playground-progress    aria-label "TypeScript download", aria-valuetext "2.4 MB of 6.3 MB"
│   ├── p                               sizes and the explanation
│   └── button.playground-retry         (offline only)
├── div.playground-toolbar              role="toolbar", aria-label "Playground tools"
│   ├── button.run                      "Run", aria-keyshortcuts "Meta+Enter" | "Control+Enter"
│   ├── button.stop                     "Stop", aria-disabled with no run
│   ├── button.examples                 aria-expanded, aria-controls the panel
│   ├── button.options                  aria-pressed
│   ├── button.share
│   └── p.run-state                     "Running · 1 timer left · 2.4 s" | "Finished in 5.01 s" | …
├── div.playground-message              role="status" (each new message announced politely)
│   ├── p                               the message
│   ├── button | input[readonly]        its action, or the link field (FR-052)
│   └── button.dismiss                  "Dismiss"
├── div.playground-body
│   ├── div.playground-editor           data-focus-home: Monaco's editor (contracts/engine.md)
│   └── div.playground-side
│       ├── div.pane-tabs               role="tablist", aria-label "Panes"
│       │   └── button[role=tab] × 4    "JavaScript", "Declarations", "Errors 1", "Logs 4"
│       ├── div.pane[role=tabpanel]     one shown: .pane-javascript | .pane-declarations | .pane-errors | .pane-logs
│       ├── section.options-panel       (when open, in place of the panes) aria-labelledby its heading
│       └── section.examples-panel      (when open, under its button) aria-labelledby its heading
├── div.playground-status               "Ln 3, Col 6", "Spaces: 2", "✓ No errors" | "⊗ 1 error" | "Checking…", "Tab moves focus", span.ts-version "TypeScript 5.9.3"
├── div.playground-scrim + section.playground-popup   role="alertdialog" (stuck) | "dialog" (reset, keys), aria-modal="false"
└── iframe.playground-runner            hidden, one per run (contracts/runner.md)
```

- **Errors pane**: `ol` of `li > button.error` ("⊗ 14:7 Type 'string' is not assignable … TS2322"),
  each moving the editor's cursor to its place and focusing the editor; or `p` "✓ No errors. The
  code checks with the current options."
- **Logs pane**: `p.logs-dropped` when entries were dropped; `ol.logs` of `li.log[data-level]`, each
  with `span.level` (the word and its glyph), the values as text, and for errors
  `button.log-line` "line 12". Text only: no value is ever rendered as markup (FR-047).
- **Options panel**: groups as fieldsets with legends (Language, Strict checks, Other checks,
  Output); `select` for `target`, a checkbox per flag with its name in `code` and its description
  as the control's description; `button.options-defaults` "Reset to defaults"; `p` naming the
  options changed from the defaults.
- **Examples panel**: a `ul` per group under its heading, each example a `button` with title and
  description, the current one `aria-current="true"`; the note "An example replaces your code. Undo
  brings it back."
- **Popups** cover the Playground's window only (`.playground-scrim` is inside
  `section.playground`), never the shell or another window (FR-050).

## Mobile: the full-screen view's content

```text
section.playground-mobile             aria-labelledby its h2
├── svg (the app's icon)
├── h2                                  "The Playground is best on a desktop" | "This link holds TypeScript code"
├── p
├── button.share-link                   "Share link" (navigator.share, else copies and says so)
├── button.copy-link                    "Copy link"
└── p.playground-mobile-note            role="status": "The link opens the Playground on a desktop." → "Link copied."
```

## Focus

| When | Focus goes to |
|------|---------------|
| Opened, downloading or offline | The window's title (005 FR-040, FR-004) |
| Ready, if focus is still in the window | The editor (`[data-focus-home]`), and the editor's name and description are announced (FR-004) |
| A message with an action appears | Stays where it is; the message is announced |
| Examples or Options opened | The panel's first control; Escape closes and returns to its button |
| Stuck popup, appearing while focus is in the window | `Stop` (FR-051); Escape keeps waiting and returns focus where it was |
| Stuck popup, appearing while focus is elsewhere | Stays where it is (FR-050) |
| Reset… or Keys… | `Reset` or the Keys popup's close; Escape cancels and returns to the menu bar's title (005's menu rule) |
| An error in the Errors pane, or a log's line | The editor, at that place |
| Shared link opened | The editor, once ready (FR-053) |

Tab order: the toolbar, the message, the editor, the pane tabs, the open pane, the status bar.
`Ctrl+M` (`Ctrl+Shift+M` on a Mac) toggles Tab moving focus out of the editor (FR-062).

## Announcements

Through the shell's announcer (005), polite, never moving focus (research R23): the download's
start, each 25% and its end or failure (FR-065); the error count after a pause in typing (FR-064);
"3 new log entries", at most once a second (FR-064); a run's start, its timer count when it changes
(at most once a second), its end (FR-066); every message; "The code is running again." when the
popup closes by itself (FR-049).

## `data-req` targets

| Element | Requirements |
|---------|--------------|
| The dock item's and home icon's `PlaygroundIcon` (through the shell's item) | FR-001 |
| `section.playground` | FR-003 FR-068 FR-071 FR-072 FR-074 |
| `div.playground-loading`, `progress.playground-progress` | FR-007 FR-065 FR-069 |
| `div.playground-loading` (offline), `button.playground-retry` | FR-011 |
| `button.run` | FR-032 FR-033 FR-083 |
| `button.stop` | FR-038 |
| `p.run-state` | FR-036 FR-066 |
| `div.playground-message` | FR-014 FR-019 FR-052 FR-053 FR-055 FR-056 FR-057 |
| `div.playground-editor` | FR-015 FR-016 FR-017 FR-018 FR-062 FR-063 FR-081 FR-082 FR-083 FR-084 |
| `div.pane-tabs` | FR-020 FR-064 |
| `.pane-javascript`, `.pane-declarations` | FR-021 FR-023 |
| `.pane-errors` | FR-016 FR-022 |
| `.pane-logs` | FR-034 FR-035 FR-043 FR-044 FR-047 |
| `section.options-panel` | FR-024 FR-025 FR-026 |
| `button.examples`, `section.examples-panel` | FR-027 FR-028 FR-031 |
| `button.share` | FR-052 FR-055 |
| `section.playground-popup` (stuck) | FR-048 FR-049 FR-050 FR-051 |
| `section.playground-popup` (reset) | FR-080 |
| `section.playground-popup` (keys) | FR-083 FR-085 |
| `span.ts-version` | FR-012 |
| `div.playground-status` | FR-016 FR-062 |
| `section.playground-mobile`, `button.share-link`, `button.copy-link` | FR-058 FR-059 FR-060 |
| The Playground's menu items (`menuItems`) | FR-003 FR-085 (Reset…: FR-080) |
