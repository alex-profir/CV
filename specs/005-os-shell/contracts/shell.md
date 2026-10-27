# Contract: The Shell Page

What the site root sends, what it becomes after hydration, and what visitors, assistive technology
and tests can rely on. Visual values are the design's ([design/wireframes.md](../design/wireframes.md),
[design/mockup/](../design/mockup/README.md)); this contract fixes structure, names, behavior and
`data-req` targets. Site text is quoted as the design sets it.

## Document

`index.html`, rendered at build time (research R1, R2):

```html
<!doctype html>
<html lang="en">
  <head>
    <script>/* sets data-shell on <html> from matchMedia(shellQuery); records an early tap */</script>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>CV – {site name}</title>
    <meta name="description" content="{summary or label, as 004 FR-036}" />
    <!-- og:title, og:description, og:type, twitter:card, icon: as /cv's Document -->
    <link rel="preload" as="font" … />          <!-- the latin file of each family -->
    <link rel="stylesheet" href="/assets/os-<hash>.css" />
    <script type="module" src="/assets/os-<hash>.js"></script>
    <script type="module" src="/assets/register-sw-<hash>.js"></script>
  </head>
  <body>
    <div class="no-script" data-req="005-os-shell-FR-049">…</div>
    <div id="os" data-req="005-os-shell-FR-001 005-os-shell-FR-002 005-os-shell-FR-004">…</div>
  </body>
</html>
```

- The inline script is the first child of `<head>`, with the query written by the build from
  tokens. It is the page's only inline script, and it makes two statements:
  1. It sets `data-shell` on `<html>` from `matchMedia(<query>).matches`.
  2. It adds one `click` listener on `document`, which records an early tap (FR-004,
     Constitution VII).
- `data-shell` is `desktop` or `mobile` once the script runs. Without scripting it is absent.
- `#os` gets `data-ready` once hydration has finished and the inactive shell is gone. Tests and the
  site check wait for it before acting. It changes nothing a visitor sees.
- **Early tap**: while `#os` has no `data-ready`, the first click on a `#os .app-icon` or
  `#os .about` sets `window.osEarlyView` to that element's `data-view` (`cv` or `about`). Later
  clicks don't change it. The icons are already pre-rendered, so a visitor on a slow phone can tap
  one while the `os` script is still downloading, before React can handle the tap.
- **Replaying it**: once hydrated, if `window.osEarlyView` is set, the shell is mobile and no app is
  open yet, `Os` opens that view full screen, as a tap would: focus moves to its `.app-title` and
  one history entry is pushed (FR-050). React may have replayed the same tap already, in which
  case an app is open and nothing more happens. Either way `Os` then deletes
  `window.osEarlyView`. On desktop the record is ignored.
- `html[data-shell] .no-script` and `html:not([data-shell]) #os` are `display: none`.
  `html[data-shell="desktop"] #os .mobile` and `html[data-shell="mobile"] #os .desktop` are
  `display: none` until hydration removes the inactive shell.
- The page makes no request to another site (FR-054). Nothing in `#os` needs a request beyond the
  files above and the fonts.

## The no-script page (FR-049)

Rendered outside `#os`, in `/cv`'s look, with no `<button>`, form control or element that needs a
script:

```text
p.role            {basics.label}          (left out when absent)
h1                {site name}
p                 "This site is a small operating system that runs in your browser, and it needs
                  JavaScript. The CV reads in full without it."
a.standalone      "Read the CV" → /cv
footer            /cv's footer: "How this page was built" → {siteData.repository}
```

## Desktop shell

```text
div.desktop                          data-req FR-005 FR-010 FR-024 FR-025 FR-037
├── div[role=menubar]                aria-label "Menu bar"; one Tab stop        FR-013 FR-039 FR-066
│   ├── button[role=menuitem]        aria-label "Site menu", aria-haspopup=menu, the site mark (svg)
│   │   └── div[role=menu]           About this site · Open the CV as a page → /cv · Source code on GitHub ↗   FR-013 FR-015
│   ├── button[role=menuitem]        {focused window's name}, aria-haspopup=menu
│   │   └── div[role=menu]           (CV only: Open the CV as a page) · Move… · Resize… · Minimize · Maximize|Restore · Close   FR-014 FR-015 FR-027 FR-062 FR-063 FR-065
│   │   — or, with no focused window —
│   ├── span[role=menuitem][aria-disabled=true]   {site name}                    FR-013 FR-066
│   └── button[role=menuitem]        "Window", aria-haspopup=menu
│       └── div[role=menu]           Go to the menu bar · Go to the dock · Next window · one item per open window, ✓ focused, "(minimized)"   FR-014 FR-025 FR-026 FR-029 FR-064
├── main.desktop-area                aria-label "Desktop"                       FR-039
│   └── section.window × n           newest first; z-index draws them front to back (DOM order = Tab order)   FR-017 FR-018 FR-021 FR-030 FR-039
│       ├── div.title-bar                                                      FR-016 FR-019
│       │   ├── div.window-title     id, tabindex=-1, {window}; first, so Tab goes on to the controls   FR-040
│       │   ├── button.control       "Close {window}"                           FR-016 FR-023 FR-028
│       │   ├── button.control       "Minimize {window}"                        FR-063
│       │   └── button.control       "Maximize {window}" | "Restore {window}"   FR-065
│       ├── div.window-content       container for the CV's layout; scrolls     FR-022
│       ├── div.resize-handle × 8    aria-hidden, pointer only                  FR-061
│       └── div.pad[role=group]      only during a move or resize               FR-020 FR-027 FR-062
└── div[role=toolbar].dock           aria-label "Dock"; one Tab stop            FR-003 FR-039
    └── button.dock-item × apps      {app name}[, open | , minimized]           FR-011 FR-012 FR-064
```

- Windows keep their DOM order while they are raised: a window opened goes first, as it opens in
  front, and raising one changes only its `z-index`. Reordering the DOM as focus raised windows
  would let Tab go back and forth between two windows for ever (FR-030; found in T079, 005 US4).
- A window: `<section aria-roledescription="window" aria-labelledby="{title id}" data-view="{view}">`.
  The focused one has `aria-current="true"`. A minimized one is `hidden`.
- Menu items show their shortcut beside the command and carry `aria-keyshortcuts`
  (`Alt+Shift+W`). While a window is maximized, Move… and Resize… have `aria-disabled="true"`.
- A dock item shows its icon, its name below it at all times, and its open mark: a filled dot when
  open, a hollow dot when minimized, nothing when closed. The mark is `aria-hidden`; the state is
  in the item's name (`CV, open`, `CV, minimized`).
- The pad: `role="group"`, named `Moving {window}` or `Resizing {window}`. Buttons: `Up`, `Left`,
  `Right`, `Down` (move) or `Shorter`, `Narrower`, `Wider`, `Taller` (resize), then `Done` and
  `Cancel`. While it shows, the title bar shows `Moving` or `Resizing` in place of the controls.
- Every control and dock item is at least 24 × 24 CSS px (FR-037).

## Mobile shell

```text
div.mobile                           data-req FR-031 FR-036 FR-037
└── main
    ├── section.home                 aria-label "Home screen"; inert while an app is open   FR-031 FR-035 FR-039 FR-066
    │   ├── p.site-name              {site name} (not a heading)
    │   ├── ul.app-grid              one li per app supporting mobile, in APPS order   FR-003
    │   │   └── button.app-icon      icon, then {app name} below; data-view {view}      FR-032
    │   └── button.about             "About this site"; data-view "about"              FR-038
    └── section.full-screen          aria-labelledby the header title; only while open; data-view   FR-032 FR-034
        ├── header
        │   ├── button.home          "Home", 44 × 44 px                                 FR-033 FR-034
        │   └── div.app-title        tabindex=-1, {app name}                            FR-040
        └── div.view-content         the scroll container; the CV's layout container    FR-034
```

## Shared

```text
div[role=status].visually-hidden     announcements                              FR-041
```

- The CV app: `a.standalone` "Open as a page to print or share" → `/cv` (FR-007), then 004's
  `CvDocument` as a `div`, with its own `data-req` attributes unchanged, inside a root that
  carries `data-req="005-os-shell-FR-006 005-os-shell-FR-008 005-os-shell-FR-009"`.
- About this site (`data-req="005-os-shell-FR-038"`): `h1` "About this site", the paragraph
  ("This is {name}'s CV, presented as a small operating system that runs in the browser. It was
  built spec first: every feature has a public spec, a reviewed design and tests that trace back
  to its requirements."), "Open the CV as a page" → `/cv`, "Source code, specs and history on
  GitHub" → `{siteData.repository}`, and on desktop only, "Keyboard shortcuts": a `dl` of the eight
  shortcuts, then the two notes (`data-req="005-os-shell-FR-029"`).
- Icons (the site mark, the CV icon, the control glyphs, the Home chevron) are inline SVG with
  `aria-hidden="true"`, drawn in `currentColor`, carrying `data-req="005-os-shell-FR-044"`.

## Keyboard

| Where | Keys | Does |
|-------|------|------|
| Anywhere | `Alt+Shift+M` / `D` / `N` | Menu bar's first title / dock's first item / next shown window (FR-025, FR-026) |
| A window focused | `Alt+Shift+W` / `H` / `F` | Close / minimize / maximize or restore (FR-028, FR-063, FR-065) |
| A window focused, not maximized | `Alt+Shift+P` / `S` | Start a keyboard move / resize (FR-027, FR-062) |
| Menu bar | `←` `→`, `Enter` `Space` `↓`, `Home` `End` | Move between titles, open a menu |
| Menu | `↑` `↓`, `Enter` `Space`, `Escape`, `Tab` | Move, choose, close to its title (FR-015), close and move on |
| Dock | `←` `→`, `Enter` `Space` | Move between items, activate (FR-012) |
| Pad | arrows, `Shift`+arrows, `Enter`, `Escape`, `Tab` | 16 px, 64 px, confirm, cancel (FR-027, FR-062), move between pad buttons |
| Window controls | `Enter` `Space` | Activate (FR-028) |

On a Mac the modifier is `Option+Shift`. `Escape` never closes a window. No other key is taken.

## Focus

| After | Focus goes to |
|-------|---------------|
| First load | Stays at the start of the page (FR-005) |
| Opening or restoring a window | Its `.window-title` (FR-040, FR-064) |
| Closing or minimizing, another window still shown | The new front window's `.window-title` |
| Closing or minimizing the CV, none left shown | The CV's dock item (FR-023, FR-063) |
| Closing or minimizing About this site, none left shown | The site menu's title (FR-023, FR-063) |
| A menu closed with `Escape` | Its title (FR-015) |
| Ending or cancelling a move or resize | The window's `.window-title` |
| Tab or a click reaching a window behind | It comes to the front, focused (FR-017, FR-030) |
| Opening an app on the home screen | Its `.app-title` (FR-040) |
| Going home, by Home or Back | The icon of the app that was open (FR-034) |

The focus indicator everywhere in the shell is a 2 px `color.focus-shell` outline, 2 px outside the
element. Inside the CV, `/cv`'s own indicator applies (FR-024).

## Announcements (FR-041)

`{window} moved.`, `Move cancelled.`, `{window} resized to {width} by {height}.`,
`Resize cancelled.`, `{window} maximized.`, `{window} restored.`

## Title (FR-042, FR-066)

`{app} – {site name}` with a focused window or an open full-screen app, otherwise `{site name}`.

## Address and history (FR-050)

- The address is the site root's whatever the visitor does.
- Mobile: opening an app full screen pushes one history entry with the same URL. Back, or Home,
  returns to the home screen and uses that entry up.
- Desktop: no history entry is ever pushed. Switching from mobile to desktop with an app open
  removes the pushed entry.

## `data-req` targets

Every requirement above with an element carries its ID on that element as
`data-req="005-os-shell-FR-###"`, several separated by spaces. These are Non-UI and carry no
target: FR-042, FR-043, FR-045 to FR-048, FR-050 to FR-060. The traceability check (001) reads the
attributes from the TSX source, written literally (FR-055).
