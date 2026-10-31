# Local Mockup: The TypeScript Playground

The interim local mockup of the Playground in both shells, under the constitution's interim
provision on local mockups. Once the provision ends, this design is rebuilt in Penpot to match, and
Penpot's exports replace these PNGs (the provision's step 2).

Each HTML page is one state from [the wireframes](../wireframes.md). The pages have no scripts.
Each PNG is a page rendered at the width named in its file name, at 1× scale.

The shell around the Playground is the site's own: the pages use the shell's markup and link the
site's style sheets, so the menu bar, windows, dock, mobile header and spec view look as they do
today. Only `playground.css` and `proposed-tokens.css` are new. The CV window frames the built
`/cv`, as 005's mockup does.

## What's here

| File | What it is |
|------|------------|
| `*.html` | One page per state, written by `build.mjs` |
| `*.png` | The exports, one per state and width, rendered by `render.mjs` |
| `playground.css` | The Playground's styles. Every value is a `var(--token-…)` |
| `proposed-tokens.css` | Tokens the Playground needs that the export doesn't hold yet (see below) |
| `fonts.css` | The site's three fonts, read from `packages/web/src/fonts/`, as in 005's mockup |
| `build.mjs` | Writes the pages: the shell's markup around each state, and the code with its colors |
| `render.mjs` | Renders the PNGs from the pages |

## Sample data

- The CV example's logs, the phone's home-screen name and the starting example's last log are read
  from `packages/content/resume.json` when `build.mjs` runs, as the Playground reads the CV when
  the site is built (FR-029).
- The TypeScript version in the status bar is the repository's own TypeScript, a stand-in. The
  Playground shows the version it runs, read from TypeScript itself (FR-012).
- The download's sizes, 2.4 MB of 6.3 MB, and the too-long link's 11,240 characters are stand-ins.
- In the spec view, the requirement texts are 008's; the counts, the commit and the test names are
  stand-ins until the tests exist.

## Exports

| State | Export |
|-------|--------|
| Desktop, downloading TypeScript | `desktop-01-downloading-1440.png` |
| Desktop, the offline first open | `desktop-02-offline-1440.png` |
| Desktop, ready, with the starting example and the JavaScript pane | `desktop-03-ready-1440.png` |
| Desktop, the editor with errors and the Errors pane | `desktop-04-errors-1440.png` |
| Desktop, a type on hover and the Declarations pane | `desktop-05-hover-1440.png` |
| Desktop, suggestions open | `desktop-06-suggestions-1440.png` |
| Desktop, a definition shown in place | `desktop-07-peek-1440.png` |
| Desktop, a rename | `desktop-08-rename-1440.png` |
| Desktop, quick fixes | `desktop-09-quick-fixes-1440.png` |
| Desktop, the command palette | `desktop-10-command-palette-1440.png` |
| Desktop, the list of keys | `desktop-11-keys-1440.png` |
| Desktop, the Playground menu | `desktop-12-menu-1440.png` |
| Desktop, compiler options | `desktop-13-options-1440.png` |
| Desktop, the examples | `desktop-14-examples-1440.png` |
| Desktop, a run with timers pending and the Logs pane | `desktop-15-running-1440.png` |
| Desktop, a CV example run, with a CV type on hover | `desktop-16-cv-example-1440.png` |
| Desktop, the stuck popup, beside the CV window | `desktop-17-stuck-1440.png` |
| Desktop, Share: the link copied | `desktop-18-shared-1440.png` |
| Desktop, Share: too long for a link | `desktop-19-too-long-1440.png` |
| Desktop, a broken shared link | `desktop-20-broken-link-1440.png` |
| Desktop, a shared link opened | `desktop-21-shared-opened-1440.png` |
| Desktop, Reset, to confirm | `desktop-22-reset-1440.png` |
| Desktop, the Playground's spec view | `desktop-23-spec-view-1440.png` |
| Desktop, a narrow window | `desktop-24-narrow-1440.png` |
| Desktop, the Playground stopped showing (amendment) | `desktop-25-contained-1440.png` |
| Desktop, the download stopped part way (amendment) | `desktop-26-download-stopped-1440.png` |
| Desktop, TypeScript won't open (amendment) | `desktop-27-wont-open-1440.png` |
| Desktop, JavaScript that can't be read (amendment) | `desktop-28-cant-parse-1440.png` |
| Desktop, the code closed its worker (amendment) | `desktop-29-worker-closed-1440.png` |
| Desktop, Share: the link to copy by hand (amendment) | `desktop-30-link-field-1440.png` |
| Desktop, a run that stopped unexpectedly (amendment) | `desktop-31-crashed-1440.png` |
| Desktop, a run out of memory (amendment) | `desktop-32-out-of-memory-1440.png` |
| Desktop, the Logs pane before a run (amendment) | `desktop-33-no-logs-1440.png` |
| Desktop, values in the logs (amendment) | `desktop-34-log-values-1440.png` |
| Desktop, Reset: done (amendment) | `desktop-35-reset-done-1440.png` |
| Desktop, Share: the code copied (amendment) | `desktop-36-code-copied-1440.png` |
| Desktop, kept code with an unknown option (amendment) | `desktop-37-kept-options-1440.png` |
| Desktop, compiler options at their defaults (amendment) | `desktop-38-options-default-1440.png` |
| Desktop, the list of keys, every command (amendment) | `desktop-39-keys-all-1440.png` |
| Desktop, Share: the clipboard refused the code (second amendment) | `desktop-40-code-refused-1440.png` |
| Desktop, a broken shared link with Undo (proposed, not signed) | `desktop-41-broken-link-undo-1440.png` |
| Desktop, declarations that can't be written (proposed, not signed) | `desktop-42-no-declarations-1440.png` |
| Phone, the home screen | `phone-1-home-375.png` |
| Phone, best on a desktop | `phone-2-best-on-desktop-375.png`, `-320.png` (320 × 568), `-landscape-812.png` (812 × 375) |
| Phone, a shared link | `phone-3-shared-link-375.png`, `-320.png` (320 × 568) |
| Phone, the link to copy by hand (amendment) | `phone-4-link-field-375.png`, `-320.png` (320 × 568) |
| Phone, code too long for a link (amendment) | `phone-5-too-long-375.png`, `-320.png` (320 × 568) |

## Rendering the mockup

Use Node 26 (`nvm use`), from the repository root:

1. `npm run build`, then `npm run serve`. It serves the built site on `http://127.0.0.1:4173`,
   which the CV window frames.
2. `node specs/008-typescript-playground/design/mockup/build.mjs` writes the pages.
3. `node specs/008-typescript-playground/design/mockup/render.mjs` renders every PNG. Give it part
   of a page name, such as `phone`, to render only those pages.

To look at a page in a browser, serve the repository root with any static file server, such as
`python3 -m http.server 8008 --bind 127.0.0.1`, and open
`http://127.0.0.1:8008/specs/008-typescript-playground/design/mockup/desktop-03-ready.html` in a
window of the export's size.

## Proposed tokens

The table is reconciled with the token export as research R22 sets: where an existing token already holds a value, the design names it instead of adding one, and the new names follow the export's existing forms.

`proposed-tokens.css` writes these new tokens as the token output would write them. Once the
design is approved, the plan adds them to `packages/tokens/penpot/tokens.json`, in Penpot's form,
under these names. Under the interim provision that export is written by hand. Every color refers
to a base color; two base colors are new, both translucent: `color.base.lilac-wash` (`#818cf840`)
and `color.base.rose-wash` (`#fda4af29`).

| Token | Type | Refers to |
|-------|------|-----------|
| `color.code.surface` | color | `color.base.carbon` |
| `color.code.text` | color | `color.base.snow` |
| `color.code.keyword` | color | `color.base.lilac` |
| `color.code.type` | color | `color.base.mint` |
| `color.code.function` | color | `color.base.periwinkle` |
| `color.code.property` | color | `color.base.haze` |
| `color.code.string` | color | `color.base.rose` |
| `color.code.number` | color | `color.base.amber` |
| `color.code.comment`, `color.code.punctuation`, `color.code.line-number` | color | `color.base.fog` |
| `color.code.line-number-current` | color | `color.base.snow` |
| `color.code.current-line` | color | `color.base.speck` |
| `color.code.selection` | color | `color.base.lilac-wash` |
| `color.code.occurrence` | color | `color.base.amber-wash` |
| `color.code.caret` | color | `color.base.mint` |
| `color.code.error` | color | `color.base.rose` |
| `color.code.error-band` | color | `color.base.rose-wash` |
| `color.code.warning` | color | `color.base.amber` |
| `color.code.info` | color | `color.base.periwinkle` |
| `color.playground.panel` | color | `color.base.soot` |
| `color.playground.raised` | color | `color.base.smoke` |
| `color.playground.primary` | color | `color.base.periwinkle` |
| `color.playground.primary-text`, `color.playground.danger-text` | color | `color.base.night` |
| `color.playground.danger` | color | `color.base.rose` |
| `color.playground.scrim` | color | `color.base.shade` |
| `color.icon-playground.top` | color | `color.base.amber` |
| `color.icon-playground.bottom` | color | `color.base.rose` |
| `color.icon-playground.glyph` | color | `color.base.night` |
| `size.playground-window-width` | sizing | 1040 |
| `size.playground-window-height` | sizing | 648 |
| `size.playground-window-offset` | sizing | 64 |
| The window's right margin | sizing | `size.terminal-window-margin` (40), which already holds it |
| `size.playground-toolbar` | sizing | 44 |
| `size.playground-status` | sizing | 28 |
| `size.playground-side` | sizing | 400 |
| `size.playground-gutter` | sizing | 48 |
| `size.playground-popover` | sizing | 380 |
| `size.playground-dialog` | sizing | 440 |
| `size.playground-progress` | sizing | 6 |
| `size.playground-loading` | sizing | 420 |
| `breakpoint.playground-stack` | dimension | 720, read in a container query |
| `size.playground-stacked-side` | sizing | 240 |
| `size.code-line` | sizing | 20 |
| The code's font size | fontSizes | `font.size.small` (13), which already holds it |
| The code's typography | typography | `typography.small` (JetBrains Mono, 13, regular), which already holds it |

The token names in the CSS are the token output's (`--token-color-code-keyword` for
`color.code.keyword`). The plan may fold a few into existing tokens where one already fits.
