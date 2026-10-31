# Implementation Plan: The TypeScript Playground

**Branch**: `008-typescript-playground` | **Date**: 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-typescript-playground/spec.md`

**Design**: [design/review.md](./design/review.md): an interim local mockup, under the
constitution's interim provision on local mockups, `design/mockup/` at commit `1188830`, approved
2026-10-29 (sign-off commit `aab38e0`).

## Summary

A third app, the Playground, after the CV app and the Terminal. On desktop it is a TypeScript
editor that works like VS Code: live errors, types on hover, suggestions, navigation, rename,
quick fixes, formatting and the command palette, with JavaScript, Declarations, Errors and Logs
panes, compiler options and eleven examples, three of them reading the CV as typed data. Code runs
in a sandbox that can't reach the site, never freezes it, counts pending timers, ends when nothing
is left, stops on demand, and asks after 5 seconds of blocking. Code and options are kept in the
browser and shared as links that never run on open. On phones it is a "best on desktop" screen.
TypeScript downloads on the first desktop open and works offline after that. The feature also
amends 005 (the shell drops its Minimize and Maximize shortcuts, freeing `Shift+Alt+F`) and 006
(`open playground`).

Technical approach (details in [research.md](./research.md)):

- **Monaco** 0.57.0, VS Code's editor, with its TypeScript worker (TypeScript 5.9.3, the newest
  that runs in a browser: TypeScript 7 has no browser build) (R1, R5).
- **Interface in the `os` script, engine downloaded.** The Playground's React interface, its
  session store, the mobile screen and the share links are in the `os` script. Monaco, TypeScript,
  their workers and the runner are a separate, hashed **engine** bundle under
  `/playground/<hash>/`, downloaded with progress into its own cache on the first desktop open,
  never precached, kept across site updates until a newer copy is whole (R2 to R4).
- **Our TypeScript worker** subclasses Monaco's: one call returns diagnostics, JavaScript,
  declarations and imports for the panes; the packages message replaces TypeScript's; fixes that
  add imports are dropped (R6, R7, R11).
- **The sandbox**: a fresh `sandbox="allow-scripts"` `srcdoc` iframe per run, with a strict policy,
  makes a classic worker from a `Blob`: an opaque origin with no storage, no DOM, requests to any
  site without cookies, no script loads, its own thread. A 250 ms heartbeat over a private port
  tells blocking from waiting; Stop terminates the worker (R17 to R19, R24). The frame lives
  outside the Playground's content, in a hidden host the runner appends to `document.body` once
  and never moves, because removing or moving a frame ends its worker: so a run goes on while the
  content unmounts for Show specs or a shell switch (FR-005, FR-061). Stop, the window's close and
  `pagehide` remove the run's frame (FR-038, FR-046). This replaces the placement inside the
  window in contracts/playground.md and R17, which T173 brings in line.
- **The CV** is `cv`, typed `Resume` from 002's generated shape, its value the resume the app
  already has, a copy per run (R10).
- **Links**: `#playground=1.<deflate-raw base64url>.<SHA-256 check>`, read on hydration, never
  run, never sent to a server (R16).
- **Checks**: a new site check part, `playground`, Playground states in seven existing parts, and
  browser tests on the real build, with the sandbox, memory and key tests in all three engines in
  the owner's run (R25).

## Technical Context

**Language/Version**: TypeScript with erasable syntax and TSX, run by Node.js 26, as 001 to 007.
CSS compiled by Lightning CSS. Browser code bundled by Vite 8 (Rolldown): the `os` script as
before, and the engine as a second build (R3). The Playground runs the visitor's code with the
TypeScript 5.9.3 that Monaco bundles; the repository itself stays on TypeScript 7.0.2.

**Primary Dependencies**: one new package, `monaco-editor` 0.57.0 (MIT, Microsoft; brings `marked`
and `dompurify`) (R1). Used as before: `react` and `react-dom` 19.3.1, `vite` 8.3.5,
`lightningcss` 1.33.0, `playwright` 1.64.1 (now also its Firefox and WebKit in the owner's run),
`axe-core` 4.14.0, `lighthouse` 13.5.0. Browser standards: Web Workers, sandboxed iframes, Cache
Storage, `CompressionStream`, Web Crypto, the Clipboard and Web Share APIs. Reused: 002's resume
and shape, 003's tokens, 004's service worker and site check, 005's `os-core`, shells, announcer
and focus, 006's app fields and session pattern, 007's spec view.

**Storage**: none on a server. In the browser: the engine in Cache Storage, `playground-<hash>`,
after the first desktop open (R4); the visitor's code and changed options in
`localStorage['cv-playground']` (R15); everything else for the visit in the session store.
Running code stores nothing that outlasts its run (R17).

**Testing**:

- Vitest in Node (`fast`, new directory `packages/web/test/playground/unit/` added to
  `FAST_TEST_GLOBS`): options, share links, kept code, the session store, the log book and value
  formatting, the source-map decoder, the download state machine, the keys table, the CV types
  plugin; `@cv/os-core` geometry and shortcuts.
- Vitest browser tests in Chromium through Playwright on the real build
  (`packages/web/test/playground/`), with a new `playground.ts` helper; the sandbox, memory and
  key tests also in Firefox and WebKit in `npm run verify` (R25).
- `npm run site-check`: the `playground` part and seven extended parts (contracts/cli.md).
- `tsc --noEmit`, `npm run traceability`, `npm run token-check`, `npm run content-check`.
- By hand: a desktop screen reader, keys in each browser, forced colors, text-only zoom, the look
  against the exports (quickstart 5); may wait for the final testing phase (R26).

**Target Platform**: as 005: the current and previous major Chrome, Edge, Firefox and Safari, on
desktop and phone. The Playground's editor is desktop only; phones get its screen. Build and
checks on Node.js 26, macOS and Linux (GitHub Actions `ubuntu-latest`).

**Project Type**: a static web site. A new app of the existing shell page, a second bundle
loaded on demand, a sandboxed runner, one new site check part.

**Shells**: Both, as the spec's Shell Scope sets. Desktop: the Playground in a window from the
dock, with its menu. Mobile: the "best on desktop" screen, full screen, from the home screen.

**Offline Approach**: the interface is in the precached `os` script, so the mobile screen and the
offline state work offline after one visit (005 FR-052). The engine is downloaded once on the first
desktop open into its own cache, which the service worker answers from, offline too, all but the
download's own requests, which go to the network so Retry can replace a bad file (R4, T236); a site update
keeps the stored engine until a newer one is whole (R4). The runner needs no network: a `srcdoc`
frame and a `blob:` worker (R17). Kept code is in `localStorage`. Shared links are fragments of
the site root, which the service worker already answers offline.

**Performance Goals**:

- The editor usable within 15 s of the first open on 10 Mbit/s, within 2 s on later opens
  (SC-001): the engine is about 2.6 MB gzip, 11 MB decoded, so under 3 s compressed and 9 s
  uncompressed on that link.
- Errors within 1 s of a pause, a type or suggestions within 500 ms, for 300 lines (SC-002): a
  250 ms pause, then one worker call (R7).
- Stop within 1 s, even in an endless loop (SC-003); the popup between 5 and 6 s (SC-004); the
  shell, windows and editor responding within 100 ms while code blocks or prints (SC-005): the
  code is on its own thread, and logs arrive at most 20 times a second (R18).
- The first load as fast as before: no byte of TypeScript, and the `os` script within 45 KB brotli
  of its size before the feature (SC-009, R2, **Verify**). Lighthouse 90+ on `/` and `/cv`.

**Constraints**:

- The `os` script stays one file (005 R14); the engine is never a chunk of it (R3).
- No request to any other site from the Playground itself (FR-010); only the visitor's running
  code may make them (FR-041).
- No markup from the code's output (FR-047); no CV fact in code, site text or examples (FR-031);
  no literal design value, with no exception added to the token check (FR-068).
- Nothing in front of the CV: without a `#playground` fragment, first load is unchanged (FR-002).
- A run outlives the Playground's content, never its window: the runner frame is never a child of
  `section.playground`, and only Stop, a new run, the window's close or `pagehide` removes it
  (FR-005, FR-046, FR-061).

**Scale/Scope**: 87 active requirements (FR-006 removed) and 4 amended ones of 005 and 006; 2
shells; 24 desktop and 3 mobile design states; 11 examples; 24 compiler options; about 40 tokens;
27 new check states; 1 new site check part and 8 parts extended; 1 new package.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check passed before research (spec approved in `e8b2042`/`4a4a0a3`, design signed off
in `aab38e0`), and the re-check after design passed too. The table shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. Monaco, TypeScript's version, Cache Storage, iframes, workers, `localStorage`, the link format and every path appear only in this plan, research.md and the contracts. The spec needs no change: R1 to R26 implement it as written. R24's **Verify** on memory may lead to an amendment of FR-045, which would go through the spec first |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | `design/wireframes.md` covers every state the spec's Design section lists in both shells; `design/mockup/` holds the interim local mockup and 30 PNGs at 1440, 375, 320 and 812 px; `review.md` is `Approved` for commit `1188830` on 2026-10-29, confirming the look is original (FR-068). Alt+F1 reuses the approved Keys popup (R12), so no state is added. 005's amendment updates 005's design artifacts in `docs:` commits before code (R21). 006's amendment changes one row of 006's approved Site text, `open` with another name (`open takes cv or about.`, wireframes.md), so that row is updated in a `docs(006):` commit with the owner's dated line in 006's `review.md` before the Terminal's code changes (T174, T175); no 006 export shows the row, so no PNG changes |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | Every active FR, and the four amended FRs of 005 and 006, has planned tests below; UI targets follow [contracts/playground.md](./contracts/playground.md#data-req-targets), written literally in TSX in the `os` script's import graph, so 001 and 007 read them |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | `cv`'s value is the app's `resume` prop and its type is generated from 002's shape (R10); the examples hold no CV fact and their CV output is checked against `resume.json` (FR-029, FR-031). Styles, the editor theme and the widgets' restyling read the token output only (R22); the new tokens go into the hand-written export under the interim provision |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | The Playground declares `['desktop', 'mobile']` beside its code; its content is the editor on desktop and its screen on mobile. Window placement and the shortcut change are in `@cv/os-core`, tests first. Opening from an address is declared by the app (`opensFromAddress`), so `Os.tsx` imports nothing from `apps/<id>/` (T180). Matches the Shell Scope table |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | After one open, the engine is in its own cache, answered offline by the service worker; the runner needs no network; every FR-073 action is proven offline by the `offline` part (R4, R17). The first download, the one part that needs the network, shows its offline state (FR-011), as the spec explains |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | First load is unchanged without a fragment (FR-002); the Playground is third in the dock; a shared link opens it in front of the CV window, which stays open behind it (FR-053). No TypeScript on first load, checked by `lighthouse` (SC-009). `/cv` is untouched |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | axe in every FR-071 state, FR-077's keyboard flow, forced colors, reduced motion, zoom and text spacing in the site check (R25). Monaco's screen-reader mode, the tab focus key and announcements (R23). The `os` script's growth is budgeted and measured; Lighthouse 90+ stays a merge check. Screen readers by hand (R26) |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The icon and glyphs are the design's own SVGs; fonts are the site's OFL families; the editor's theme is built from the site's tokens. Monaco's icon font is Microsoft's, MIT, used only for widgets the design doesn't draw (R22). The review records the look as original, not the official Playground's |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | One package, Monaco, by its vendor, with the simpler alternatives it beat (R1). Each abstraction is listed below. No agent skill |
| XI | Features and Amendments in Pull Requests | A new feature ships in one PR, with any amendment of an older spec it makes, recorded in that spec and linked; any other amendment in one or more PRs of its own, each carrying its part of the spec amendment with its tests and design; each PR links spec.md and tasks.md | Pass | One pull request from `008-typescript-playground`, carrying the amendments of 005 (FR-086) and 006 (FR-087): both are already recorded in their specs; their design (005's), tasks and tests are in this PR (contracts/shell.md, R21). The PR links 008's spec.md and tasks.md and the amended 005 and 006 spec.md files; 005's superseded tasks are marked in its tasks.md (T037), and so is 006's T027, whose `open settings` reply `open takes cv or about.` the amendment overturns (T176) |

## Requirement Traceability

Constitution III. Paths are relative to `packages/web/test/playground/` (marked **pg**, the real
build in Chromium), `packages/web/test/playground/unit/` (**unit**, Node), `packages/os-core/test/`
(**core**), `packages/web/test/shell/` (**shell**), `packages/web/test/terminal/` (**term**),
`packages/web/test/` (**web**) and `tools/site-check/test/` (**check**). Each test or group title
carries the `<feature>-FR-###` IDs it covers. "Ready" means the Playground opened at 1440 × 900 and
the editor shown. UI targets follow [contracts/playground.md](./contracts/playground.md#data-req-targets).

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 008-typescript-playground-FR-001 | pg `app.test.ts`: the dock reads CV, Terminal, Playground in that order, the home screen the same; the item's name and icon are the design's; the declaration's shells are both. web `site-text.test.ts`: the name is site text | the dock item, the home icon |
| 008-typescript-playground-FR-002 | pg `first-load.test.ts`: at 1440 only the CV window opens, at 375 the home screen; no Playground element exists and nothing under `/playground/` is requested within 10 s; 005's first-load tests pass unchanged | Non-UI |
| 008-typescript-playground-FR-003 | pg `window.test.ts`: the window moves, resizes, minimizes, maximizes, closes, cascades as every window; its box at 1440 × 900 with the CV is 360, 88, 1040 × 648; the menu lists Run, Stop, Examples…, Compiler options…, Share…, Command palette, Keys…, Reset… with keys and separators; at 375 it opens full screen. core `geometry.test.ts` | `section.playground`, menu items |
| 008-typescript-playground-FR-004 | pg `focus.test.ts`: on open while downloading, focus is on the title; when ready, on the editor, and the announced text holds the Playground's and the editor's names; with focus moved to the CV window during the download, it stays there | Non-UI |
| 008-typescript-playground-FR-005 | pg `specs.test.ts`: with code, a cursor, a selection, a scroll, the Logs pane, an option and logs, Show specs and Back restore each; a run's timer keeps counting while the spec view shows, and its runner frame is the same element before and after; at 375 the same from the mobile screen | Non-UI (007's controls) |
| ~~008-typescript-playground-FR-006~~ | Removed 2026-10-29, replaced by FR-087 | — |
| 008-typescript-playground-FR-007 | pg `download.test.ts`: in a fresh profile the loading state shows "[n] MB of [total] MB" matching `files.json`, the progress bar's value rises, the editor isn't present until the end; closing the window mid-download and reopening completes it; the cache lacks the marker while incomplete. unit `download.test.ts`: the state machine | `div.playground-loading`, `progress.playground-progress` |
| 008-typescript-playground-FR-008 | pg `download.test.ts`: a second open in the visit, a reload, and a reload offline make no request under `/playground/` that the network answers, and the editor shows within 2 s | Non-UI |
| 008-typescript-playground-FR-009 | pg `first-load.test.ts`: the service worker's precache holds nothing under `/playground/`; loading `/` and `/cv` and opening the CV and Terminal requests nothing there; at 375, opening the Playground requests nothing there | Non-UI |
| 008-typescript-playground-FR-010 | pg `requests.test.ts`: the download, editing, every example, a run of code that makes no request, sharing and the mobile screen request only `127.0.0.1`; check `other-sites` | Non-UI |
| 008-typescript-playground-FR-011 | pg `offline.test.ts`: a fresh profile offline shows "TypeScript needs one download" with the size and Retry; going online starts the download by itself; a download cut part way (a file aborted by the test) shows "The download stopped", is never used, and completes after Retry | `div.playground-loading`, `button.playground-retry` |
| 008-typescript-playground-FR-012 | pg `version.test.ts`: `span.ts-version` reads `TypeScript ` + the engine manifest's `typescript`, which the build read from the bundled TypeScript; no source file holds the version literally (searched) | `span.ts-version` |
| 008-typescript-playground-FR-013 | pg `update.test.ts`: with an engine stored, a rebuilt site with a different engine hash: offline, the old copy opens and shows its version; online, the new one downloads, then the old cache is gone; an open Playground isn't interrupted when the new service worker activates. unit `download.test.ts`: the choice of copy by `api` | Non-UI |
| 008-typescript-playground-FR-014 | pg `no-storage.test.ts`: with Cache Storage throwing (an init script), the Playground works online and shows the `cantKeepTypeScript` message | `div.playground-message` |
| 008-typescript-playground-FR-015 | pg `editing.test.ts`: line numbers, undo and redo, indent, `Ctrl+/`, bracket closing and surrounding, folding, `Ctrl+D` and `Alt`+click cursors, `Alt+Up` and `Alt+Down`, `Shift+Alt+Down`, expand selection, find and replace, `Ctrl+G`, `Ctrl+Shift+O`, other uses highlighted, `Shift+Alt+F` and Format Selection give TypeScript's formatting (Mac keys on WebKit in the local run) | `div.playground-editor` |
| 008-typescript-playground-FR-016 | pg `diagnostics.test.ts`: `const n: number = "one"` is marked within 1 s of the last key, with its message on hover and at the cursor; every diagnostic of a fixture with errors and warnings is marked; with checking slowed (a 2,000-line paste), the status reads `Checking…` and the marks dim until the result. unit `check.test.ts`: stale results are dropped | `div.playground-editor`, `.pane-errors` |
| 008-typescript-playground-FR-017 | pg `hover.test.ts`: hovering a name and `Ctrl+K Ctrl+I` on it show its type and JSDoc as the TypeScript worker's quick info gives | `div.playground-editor` |
| 008-typescript-playground-FR-018 | pg `suggestions.test.ts`: `job.` lists properties with names and types; Enter, Tab and a click insert; `Ctrl+Space` opens them; inside a call, the parameters card marks the current one | `div.playground-editor` |
| 008-typescript-playground-FR-019 | pg `kept.test.ts`: a fresh browser holds Welcome with the defaults and stores nothing; after an edit and an option change, closing, reloading and a new page hold them; with `localStorage` throwing, the `cantKeepCode` message shows and the code stays for the page; a kept unknown option is left out and named. unit `kept.test.ts` | `div.playground-message` |
| 008-typescript-playground-FR-020 | pg `panes.test.ts`: four tabs in the design's order, JavaScript open first, Errors and Logs naming their counts; arrows move between them | `div.pane-tabs` |
| 008-typescript-playground-FR-021 | pg `panes.test.ts`: the JavaScript and Declarations panes equal the worker's emit for a fixture with the current options, update after a change, are read-only, colored, and copy their selection | `.pane-javascript`, `.pane-declarations` |
| 008-typescript-playground-FR-022 | pg `panes.test.ts`: each error shows line, column, message and `TS` number; activating one puts the cursor there; with none, the site text | `.pane-errors` |
| 008-typescript-playground-FR-023 | pg `panes.test.ts`: `declaration` off and `noEmitOnError` with an error show the design's sentences | `.pane-javascript`, `.pane-declarations` |
| 008-typescript-playground-FR-024 | pg `options.test.ts`: the panel lists the design's options by group, each with name and description; nothing for modules, files or JSX. unit `options.test.ts`: every name is an option of the bundled TypeScript, every default the design's | `section.options-panel` |
| 008-typescript-playground-FR-025 | pg `options.test.ts`: `strict` off removes a strict-only error and changes the panes with no reload; Reset to defaults restores each | `section.options-panel` |
| 008-typescript-playground-FR-026 | pg `share.test.ts` and `kept.test.ts`: a changed option travels in a link and is kept across a reload | `section.options-panel` |
| 008-typescript-playground-FR-027 | pg `examples.test.ts`: the panel lists every example by group with title and description; choosing one replaces the code, sets its options, shows the message, and Undo brings the code back | `button.examples`, `section.examples-panel` |
| 008-typescript-playground-FR-028 | unit `examples.test.ts`: the list holds the starting example, basic types, narrowing, generics, timers and promises, an interval, catching errors, an endless loop, and three CV examples reading `cv` | `section.examples-panel` |
| 008-typescript-playground-FR-029 | pg `cv.test.ts`: `cv` needs no import; hovering `cv.projects` shows `ResumeProject[] \| undefined`; `cv.nope` is an error; a run logs `JSON.stringify(cv)` equal to `resume.json`. unit `cv-types.test.ts`: the declaration is generated from `shape.generated.ts`; a copy with a changed schema field changes it. check `playground`: a changed CV fact in a repository copy changes the CV examples' output after its build | Non-UI |
| 008-typescript-playground-FR-030 | pg `examples.test.ts` and check `playground`: every example shows no diagnostics with the defaults and the current CV, and every `to-end` one finishes with no uncaught error | Non-UI |
| 008-typescript-playground-FR-031 | web `site-text.test.ts`: every example title, description and comment, read from the example files, is English and holds no CV fact; content check passes over the examples | `section.examples-panel` |
| 008-typescript-playground-FR-032 | pg `run.test.ts`: Run and `Ctrl+Enter` run the code, open Logs and empty it; Run during a run ends the first, then starts | `button.run` |
| 008-typescript-playground-FR-033 | pg `run.test.ts`: code with 2 errors runs and logs "The code has 2 errors. Running the JavaScript anyway." first; with `noEmitOnError` and errors, the logs say nothing ran and why | `button.run` |
| 008-typescript-playground-FR-034 | pg `logs.test.ts`: each console level with its word and glyph; other methods as log lines; `console.clear`; strings, numbers, `null`, `undefined`, arrays, objects, nested, maps, sets, dates, errors, circular, functions, classes, deep and long values as the formats set. unit `format.test.ts` | `.pane-logs` |
| 008-typescript-playground-FR-035 | pg `errors.test.ts`: a throw at the top, in a timer and an unhandled rejection log name, message and the TypeScript line; other timers go on; the end says "Ended with 2 uncaught errors". unit `source-map.test.ts` | `.pane-logs` |
| 008-typescript-playground-FR-036 | pg `run.test.ts`: a 2 s timer shows "Running · 1 timer left", then "Finished in 2.0 s" and the run state's tick; a never-settling promise with nothing pending ends the run | `p.run-state` |
| 008-typescript-playground-FR-037 | pg `timers.test.ts`: a 60 s timer (the page's clock sped up through Playwright's clock) waits with no popup and ends after it fires; `fetch` to a slow local server counts as pending | Non-UI |
| 008-typescript-playground-FR-038 | pg `stop.test.ts`: Stop during an endless loop ends it within 1 s; during an interval cancels it; the code and logs stay, and the logs say stopped | `button.stop` |
| 008-typescript-playground-FR-039 | pg `sandbox.test.ts` (Chromium, Firefox, WebKit): the code reads nothing of `localStorage`, `indexedDB`, `caches`, cookies, `document`, `parent`, `top`, `location` of the page; `open()` and navigation fail; a value stored in a run is gone in the next; the site's storage is unchanged | Non-UI |
| 008-typescript-playground-FR-040 | pg `responsive.test.ts`: during an endless loop, a printing loop and a memory-growing loop, a click on the dock, a key in the editor and Stop respond within 100 ms (SC-005) | Non-UI |
| 008-typescript-playground-FR-041 | pg `network.test.ts`: `fetch` to a second local server on another site arrives with `Origin: null` and no `Cookie` while the site holds a cookie, and `fetch`, `Request`, XHR and `EventSource` asking for credentials send none in all three engines (amended 2026-10-30); offline it fails and the code logs the error | Non-UI |
| 008-typescript-playground-FR-042 | pg `packages.test.ts`: `import _ from "lodash"`, `require("x")`, `import("https://…")` and `export * from "x"` are marked with the packages message; Run logs it and runs nothing; the request log has no request; quick fixes offer no import | Non-UI |
| 008-typescript-playground-FR-043 | pg `dialogs.test.ts`: `alert("hi")` logs an alert and the code goes on; `prompt` and `confirm` log their notes and return `null` and `false` | `.pane-logs` |
| 008-typescript-playground-FR-044 | pg `limits.test.ts`: 5,000 lines keep the latest 1,000 and say how many were dropped; a 3 MB string is cut at 10,000 characters with the note; the editor responds within 100 ms meanwhile. unit `logbook.test.ts` | `.pane-logs` |
| 008-typescript-playground-FR-045 | pg `memory.test.ts` (three engines, **Verify** R24): code that grows memory until it fails ends the run with the out-of-memory note, the page still working and the next run logging, or the browser crashes the page, which FR-045 as amended 2026-10-30 allows | Non-UI |
| 008-typescript-playground-FR-046 | pg `lifecycle.test.ts`: closing the window during an interval removes the runner frame and nothing logs after reopening; a reload ends it; minimizing doesn't | Non-UI |
| 008-typescript-playground-FR-047 | pg `logs.test.ts`: logging `<img src=x onerror=…>`, a link and a style string adds no element, link or style to the page | `.pane-logs` |
| 008-typescript-playground-FR-048 | pg `stuck.test.ts`: an endless loop shows the popup between 5 and 6 s with the site text, Stop and Keep waiting; a microtask chain that never yields does too; a 60 s timer and a pending request never do | `section.playground-popup` |
| 008-typescript-playground-FR-049 | pg `stuck.test.ts`: Keep waiting closes it and it returns 5 s later; a loop that ends after 7 s closes it by itself with the announcement; Stop ends the run | `section.playground-popup` |
| 008-typescript-playground-FR-050 | pg `stuck.test.ts`: the popup's box is inside the window; the CV window, dock and menu bar are uncovered and take clicks; due while the CV window is focused, it neither brings the window to the front nor takes focus; while minimized or showing specs it waits, then shows | `section.playground-popup` |
| 008-typescript-playground-FR-051 | pg `stuck.test.ts`: the popup is an `alertdialog` named by its heading; focus moves to Stop when focus was in the window; Escape keeps waiting and returns focus; `Alt+Shift+M` reaches the menu bar meanwhile | `section.playground-popup` |
| 008-typescript-playground-FR-052 | pg `share.test.ts`: Share copies a link holding the code and changed options and says so; the message is announced; `Share with…` shows only with `navigator.share`; with the clipboard refused, the link shows selected in a field. unit `share.test.ts` | `button.share`, `div.playground-message` |
| 008-typescript-playground-FR-053 | pg `share.test.ts`: opening a link in a fresh profile at 1440 opens the CV window and the Playground in front, focused, with the code, options and note; no runner frame exists and the logs are empty after 10 s; the address is `/` after; a reload shows the code with edits | `div.playground-message` |
| 008-typescript-playground-FR-054 | pg `share.test.ts`: sharing makes no request; the server log holds no fragment; a link opens offline with the engine stored | Non-UI |
| 008-typescript-playground-FR-055 | pg `share.test.ts`: code whose link would exceed 8,000 characters shows the too-long message with its length and Copy the code; no link is made. unit `share.test.ts`: the edge at 8,000 | `button.share`, `div.playground-message` |
| 008-typescript-playground-FR-056 | pg `share.test.ts`: a cut-off, an altered and a garbled link open Welcome with the broken-link message and run nothing; a link with an unknown option opens without it and names it. unit `share.test.ts`: every broken form, the 1 MiB inflate limit | `div.playground-message` |
| 008-typescript-playground-FR-057 | pg `share.test.ts`: a link opened over kept code replaces it with the message, and Undo brings the kept code back | `div.playground-message` |
| 008-typescript-playground-FR-058 | pg `mobile.test.ts`: at 375 the icon opens the screen full screen with the design's text, Share link and Copy link; with `navigator.share` stubbed it is called with the link; without it the link is copied and "Link copied." announced; no editor, no request under `/playground/`, no runner frame | `section.playground-mobile`, `button.share-link`, `button.copy-link` |
| 008-typescript-playground-FR-059 | pg `mobile.test.ts`: the shared link opens the Playground at 1440; after a shell switch from desktop with code, it carries that code; from a shared link it is that link unchanged | `button.share-link`, `button.copy-link` |
| 008-typescript-playground-FR-060 | pg `mobile.test.ts`: a link opened at 375 shows "This link holds TypeScript code", no code, no run, no request under `/playground/` | `section.playground-mobile` |
| 008-typescript-playground-FR-061 | pg `shell-switch.test.ts`: with code, an option, the Logs pane, logs and an interval running, 1440 → 375 → 1440 keeps all, the interval's count goes on and its runner frame is never removed | Non-UI |
| 008-typescript-playground-FR-062 | pg `keyboard.test.ts`: every action of the list by keys alone with a visible indicator; Tab indents; `Ctrl+M` then Tab leaves the editor, and the description names the key; `Alt+Shift+M`, `D`, `N`, `W` work from the editor and type nothing | `div.playground-editor`, `div.playground-status` |
| 008-typescript-playground-FR-063 | pg `screen-reader.test.ts`: the editor's input is named "Code editor" with the description; Monaco's screen-reader mode is on; F8 moves to the next error and its message is in a live region; `Ctrl+K Ctrl+I` text is in a live region; suggestions are an `aria-activedescendant` list. Manual: R26 | `div.playground-editor` |
| 008-typescript-playground-FR-064 | pg `announce.test.ts`: the panes are a named tab list; the error count is announced once after a pause, not per key; 200 log lines in a second give at most two summed announcements | `div.pane-tabs` |
| 008-typescript-playground-FR-065 | pg `announce.test.ts`: the download's start, 25%, 50%, 75%, end and a failure are announced, focus unmoved | `progress.playground-progress` |
| 008-typescript-playground-FR-066 | pg `announce.test.ts`: a run's start, timer count changes (at most once a second with 100 timers) and end are announced, focus unmoved | `p.run-state` |
| 008-typescript-playground-FR-067 | pg `targets.test.ts`: every control of every state is at least 24 × 24 px; the phone's two buttons 44 px tall | Non-UI |
| 008-typescript-playground-FR-068 | pg `design.test.ts`: computed colors, fonts and sizes of the toolbar, panes, editor theme, popups and screen are token values; window, toolbar, side and status sizes as the design. web `self-check.test.ts`: `npm run token-check` passes with no skip marker. Manual: R26 | `section.playground` |
| 008-typescript-playground-FR-069 | pg `motion.test.ts`: with reduced motion, the progress, the running dot, the popup and pane switches show no animation or transition of `transform`, `scale` or position | `div.playground-loading` |
| 008-typescript-playground-FR-070 | pg `modes.test.ts`: with forced colors, error marks, log levels, the cursor, the selection, focus, controls and the popup have visible borders, underlines or text; none relies on a background alone | Non-UI |
| 008-typescript-playground-FR-071 | pg `accessibility.test.ts`: axe (WCAG 2.2 A and AA) finds nothing in every state of FR-071; at 200% zoom, text-only 200%, 400% on a 1280 px window and with text spacing, no clipping or overlap; check `accessibility` | `section.playground` |
| 008-typescript-playground-FR-072 | pg `layout.test.ts`: at 1040, 720 and 600 px wide windows and at 200% zoom, nothing scrolls sideways but code lines; below 720 px the panes are under the editor and the tools are glyphs with names; check `layout` | `section.playground` |
| 008-typescript-playground-FR-073 | pg `offline.test.ts`: after one open, offline: open, edit, a type, an error, each pane, an option, every example including CV ones, a run, the popup, Share, in the site's fonts | Non-UI |
| 008-typescript-playground-FR-074 | pg `data-req.test.tsx`: every target in contracts/playground.md carries its IDs; web `self-check.test.ts`: `npm run traceability` passes | Non-UI |
| 008-typescript-playground-FR-075 | check `playground.test.ts`: passes on the real build; copies with an example with a type error, a CV field an example uses removed from the schema, a link that runs on open, a popup for a 60 s timer and code that reads the site's storage each fail with a line naming the check, width and example (story 9) | Non-UI |
| 008-typescript-playground-FR-076 | check `shell-states.test.ts`: the summary lists every Playground state under `accessibility`; `other-sites` records the download, a run, sharing and the mobile screen | Non-UI |
| 008-typescript-playground-FR-077 | check `keyboard.test.ts`: FR-077's flow passes on the real build; a copy where the stuck popup doesn't take focus fails, naming the step | Non-UI |
| 008-typescript-playground-FR-078 | check `offline.test.ts`: FR-078's sequence passes; a copy whose service worker doesn't answer `/playground/` fails, naming the state | Non-UI |
| 008-typescript-playground-FR-079 | check `cli.test.ts`: the local command and the CI step are the same; every Playground problem line names the part, state, width and example; two runs give the same result | Non-UI |
| 008-typescript-playground-FR-080 | pg `reset.test.ts`: Reset… asks; Reset during an interval stops it, restores Welcome and the defaults, removes the kept code; Undo brings the code back; Cancel changes nothing | `section.playground-popup` (reset) |
| 008-typescript-playground-FR-081 | pg `navigation.test.ts`: F12 goes to a definition, `Alt+F12` peeks it in place, `Shift+F12` lists every use, F2 renames every use, each as the worker's results | `div.playground-editor` |
| 008-typescript-playground-FR-082 | pg `quick-fixes.test.ts`: the lightbulb shows on a fixable line; `Ctrl+.` lists "Add missing properties"; choosing changes the code as TypeScript sets; Undo reverts; no import fix is offered for a missing name that a package would export | `div.playground-editor` |
| 008-typescript-playground-FR-083 | pg `keys.test.ts`: each key of FR-083 does its command on Windows and Mac key maps (the platform faked per test); Run on `Ctrl+Enter`; keys do nothing with focus outside the editor | `div.playground-editor`, `button.run` |
| 008-typescript-playground-FR-084 | pg `keys.test.ts`: no editor keybinding equals a shell shortcut or a key of the reserved table (R12); `Ctrl+Shift+P` doesn't open the palette; `Shift+Alt+F` formats; in Firefox and WebKit (local run) the R12 **Verify** keys reach the editor | `div.playground-editor` |
| 008-typescript-playground-FR-085 | pg `keys.test.ts`: F1 lists every registered command with its key and runs the chosen one; the menu shows Run's and the palette's keys; Keys… lists every command of `keys.ts` with notes where it differs and why | `section.playground-popup` (keys), menu items |
| 008-typescript-playground-FR-086 | shell `amendment.test.ts`: 005's spec, wireframes and review record the amendment; `Alt+Shift+H` and `Alt+Shift+F` do nothing in the shell; About lists six shortcuts. core `shortcuts.test.ts` | Non-UI |
| 008-typescript-playground-FR-087 | term `open-command.test.ts`: `open playground` opens the Playground on desktop and its screen on mobile; `open x` lists `cv`, `playground`, `about`; `help` shows the row; check `terminal` | Non-UI |
| 005-os-shell-FR-063 | shell `menus.test.ts` and `keyboard.test.ts`: the minimize control is named for its window; the menu's Minimize works and shows no key; `Alt+Shift+H` does nothing | the minimize control, menu item |
| 005-os-shell-FR-065 | shell `menus.test.ts` and `keyboard.test.ts`: the maximize control is named for its window; the menu's Maximize works and shows no key; `Alt+Shift+F` does nothing | the maximize control, menu item |
| 006-terminal-FR-008 | term `commands.test.ts` (engine, fast): `help` lists `open <name>` with the amended text | Non-UI |
| 006-terminal-FR-014 | term `open-command.test.ts`: as FR-087 | Non-UI |

Success criteria without an FR of their own:

- SC-001: pg `performance.test.ts`: with CDP throttling to 10 Mbit/s, the editor is usable within
  15 s of the first open, and within 2 s on a later one, online and offline.
- SC-002: pg `performance.test.ts`: with 300 lines, errors within 1 s of a pause, and a type and
  suggestions within 500 ms, in 95 of 100 tries.
- SC-003 to SC-008: FR-038, FR-048, FR-040, FR-039 with FR-053, FR-052 to FR-056, FR-030 above.
- SC-009: the `lighthouse` part and pg `first-load.test.ts`; web `size.test.ts`: the `os` script's
  brotli size within its recorded size plus 45 KB (R2).
- SC-010 to SC-013: FR-071, FR-073, FR-010 and FR-069 above, and by hand (R26).
- SC-014: pg `examples.test.ts`: from a fresh open, Examples, an example and Run are three
  actions.
- SC-015: FR-074, the self-checks of FR-068 and FR-031, and FR-079.

## Dependencies, Skills & Abstractions

One new package; no agent skill.

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `monaco-editor` 0.57.0 | dependency | The editor that works as VS Code does, with TypeScript's language service, as FR-015 and FR-081 to FR-085 ask (R1) | CodeMirror plus our own language features: far more code to match VS Code. A textarea: can't meet FR-015 | Yes: Microsoft |
| The engine bundle and its build step (`src/apps/playground/engine/`, `build-site.ts`) | abstraction (build) | Keeps megabytes out of the first load and the precache, versioned so a stored copy survives updates (FR-009, FR-013, R3) | A lazy chunk of `os`: removed by updates and precached (005 R14) | N/A |
| The loader (`engine/loader.ts`) | abstraction | Download with progress, whole copies only, offline fallback to an older copy (FR-007, FR-011, FR-013, R4) | Letting the browser import on demand: no progress, partial copies, no offline state | N/A |
| Service worker: `/playground/` from any cache, left out of the precache | abstraction (change) | Serves the stored engine offline (FR-008, R4) | The loader serving files from the cache itself: workers and module imports need URLs | N/A |
| Our TypeScript worker (`engine/ts.worker.ts`) | abstraction | One call for the panes and marks, the packages message, no import fixes, the runnable emit (R6, R11, R13) | Monaco's adapter alone: can't share results with the panes or add the packages message | N/A |
| The runner: host, bootstrap and runtime (`engine/runner/`) | abstraction | Runs code apart from the site, never freezing it, with pending counts, the heartbeat and Stop (FR-032 to FR-051, R17 to R19) | Running in the page: freezes the site and reaches its storage. A worker on the site's origin: reaches its caches | N/A |
| Message checks (`runner/messages.ts`) | abstraction | Everything from the worker is untrusted: only entries the runtime could make reach the page's render (FR-039, FR-040, T182) | Inline in `host.ts`: it imports the bundled scripts, so the checks couldn't run in the fast suite. Trusting the nonce: code in the worker can't be fully kept from it, and one forged message emptied `#os` | N/A |
| Source-map decoder (`engine/source-map.ts`) | abstraction | Maps a thrown error to the visitor's line (FR-035, R13) | A source-map package: a dependency for some 60 lines of VLQ decoding | N/A |
| Value formatter and log book (`runner/format.ts`, `logbook.ts`) | abstraction | FR-034 and FR-044's readable values and limits, text only (R18) | `JSON.stringify`: fails on circular values, maps, functions | N/A |
| Session store (`apps/playground/session.ts`) | abstraction | State that survives unmounting, specs and shell switches (FR-005, FR-061, R2) | Component state: lost on every unmount | N/A |
| Share links (`apps/playground/share.ts`) | abstraction | The link format, read and written in the `os` script for both shells (R16) | A compression package: the browser compresses | N/A |
| CV types plugin (`scripts/cv-types.ts`) | abstraction (build) | `cv`'s type from 002's shape, never typed by hand (FR-029, R10) | A hand-written declaration: drifts from the schema, against Constitution IV | N/A |
| Options and keys tables (`options.ts`, `keys.ts`) | abstraction | One source for the panel, links, kept code, the list of keys and their tests (R9, R12) | Values spread over components | N/A |
| `placeBeside` in `@cv/os-core` | abstraction (change) | The Terminal's and the Playground's placement in one rule (contracts/shell.md) | A copy of `placeTerminal`: two copies of one rule | N/A |
| `AppMenuItem` `shortcut`, `disabled`, `separatorBefore` | abstraction (change) | The Playground's menu as the design draws it (FR-003, FR-085) | Hard-coding the Playground in `MenuBar.tsx`: the shell would name an app | N/A |
| Playground test helper (`test/helpers/playground.ts`) and a second-site test server | abstraction (tests only) | Opens, types, runs and reads logs for some forty test files; the other site of FR-041 (R25) | Repeating those steps in every file | N/A |
| Site check part `playground` (`tools/site-check/src/parts/playground.ts`) | abstraction | FR-075's check on the real build (R25) | Folding it into `terminal`: a different app with its own states | N/A |
| Playground controller (`apps/playground/controller.ts`) | abstraction | The engine once loaded, its checks, kept code, links and messages, alive for the visit so the content can unmount and mount again (FR-005, FR-061, R2) | Doing this in `Playground.tsx`'s effects: an unmount for Show specs or a shell switch would lose the editor's model and any download in progress | N/A |
| Run state (`apps/playground/running.ts`) | abstraction | A run's state, logs, the stuck popup and the announcements on the page's side, outside React, so a run goes on while the content is unmounted and the popup waits for the window (FR-005, FR-050, FR-061) | Folding it into the controller: one file with two lifetimes' worth of timers, and a run's transitions couldn't be read on their own. In the runner's host: the host is in the engine bundle, and the interface must read the state before the engine loads | N/A |
| Check timing (`apps/playground/checker.ts`) | abstraction | The 250 ms pause, the queued check, stale results, the 300 ms "still checking" and lost checks (FR-016, R7), testable with fake timers in the fast suite | Inline in the controller: its imports need the site and the browser, so these rules could only be tested in a browser, slowly and by timing | N/A |
| Compiler options table (`apps/playground/compiler-options.ts`) | abstraction | The option names, values and defaults, without words, read by the engine as well as the interface (FR-024 to FR-026, R9) | One table in `options.ts`: its descriptions are site text, which would pull the site's words into the engine's separate bundle | N/A |
| Editor theme values (`apps/playground/theme-values.ts`) | abstraction | Reads the editor's theme from the token output in the `os` script and passes it to the engine, which holds no design value (Constitution IV, R22) | Reading tokens in `engine/theme.ts`: the engine's bundle would carry its own copy of the token output, a second source that an update could leave behind | N/A |
| Three-engine run (`tools/local-verify/src/engines.js`, `npm run test:engines`) | abstraction (tests only) | Runs the tests that depend on a browser's engine, sandbox, memory and keys again in Firefox and WebKit, as the local full run's `engines` check (R25); and the timing test alone, where other browsers can't decide its result (SC-001, T190) | Vitest's browser matrix for every test: only these depend on the engine, and the rest would multiply a full run's half hour by three. Doing it by hand: skipped in time | N/A |
| `App` `opensFromAddress`, `onOpenFromAddress` (`apps/index.ts`) | abstraction (change) | An app says which addresses open it, so the shell names none (Constitution V, T180) | `Os.tsx` importing the Playground's `holdsLink` and `readAddressLink`: the shell would name an app, and a second such app would mean a second import | N/A |

## Project Structure

### Documentation (this feature)

```text
specs/008-typescript-playground/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── design/
│   ├── wireframes.md    # Every state of both shells, design values, options, examples, keys, site text
│   ├── mockup/          # Interim local mockup: pages, styles, proposed tokens, 30 PNGs
│   └── review.md        # Owner sign-off, commit 1188830, 2026-10-29
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R26
├── data-model.md        # Phase 1: options, kept code, links, engine copy, session, run, logs, examples, keys
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── playground.md    # The interface: structure, focus, announcements, data-req
│   ├── engine.md        # The engine bundle, its loader and API
│   ├── runner.md        # The sandbox: frame, messages, what code sees
│   ├── share-link.md    # The link format
│   ├── shell.md         # os-core, the shell, the 005 and 006 amendments
│   ├── site.md          # Build, served files, service worker, tokens, package
│   └── cli.md           # Site check changes
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
packages/
├── tokens/
│   ├── penpot/tokens.json           # + the Playground's tokens (R22)
│   └── src/tokens.generated.{css,ts} # regenerated
├── os-core/
│   ├── src/types.ts                 # ViewId 'playground', Metrics
│   ├── src/geometry.ts              # placeBeside; the Playground's box
│   ├── src/shortcuts.ts             # minimize and maximize removed (FR-086)
│   └── test/                        # geometry, shortcuts, reducer, invariants
└── web/
    ├── package.json                 # + monaco-editor 0.57.0
    ├── scripts/
    │   ├── build-site.ts            # + the engine build, .ttf, assets.playground
    │   └── cv-types.ts              # the CV declaration file (R10)
    ├── src/
    │   ├── site-text.ts             # + os.views.playground, playground
    │   ├── render.tsx  pages/ShellPage.tsx   # #os data-playground, data-playground-bytes
    │   ├── sw/service-worker.ts     # /playground/ from any cache; out of the precache
    │   ├── os/Os.tsx  os/metrics.ts # 'playground'; the link on hydration
    │   ├── shells/desktop/MenuBar.tsx  Desktop.tsx   # app item fields; capture phase; two shortcuts gone
    │   ├── apps/index.ts            # APPS + playgroundApp; AppMenuItem, AppOs
    │   ├── apps/terminal/engine/commands.ts   # open playground (FR-087)
    │   └── apps/playground/
    │       ├── app.tsx  PlaygroundIcon.tsx  Glyphs.tsx
    │       ├── Playground.tsx  Toolbar.tsx  Message.tsx  Panes.tsx  ErrorsPane.tsx  LogsPane.tsx
    │       ├── OptionsPanel.tsx  ExamplesPanel.tsx  StatusBar.tsx  Loading.tsx  Popups.tsx
    │       ├── BestOnDesktop.tsx            # the mobile screen
    │       ├── controller.ts  running.ts  checker.ts   # the work outside React
    │       ├── session.ts  options.ts  compiler-options.ts  keys.ts  share.ts  kept.ts  logbook.ts
    │       ├── theme-values.ts  globals-types.ts  limits.ts  text.ts  types.ts
    │       ├── examples/                    # eleven examples (R20)
    │       ├── playground.css
    │       └── engine/
    │           ├── loader.ts                # in the os script
    │           ├── engine.ts                # the engine's entry (separate build)
    │           ├── editor.ts  theme.ts  editor.css  glyphs/
    │           ├── ts.worker.ts  source-map.ts
    │           └── runner/  host.ts  bootstrap.ts  runtime.ts  format.ts  messages.ts
    └── test/
        ├── helpers/playground.ts  helpers/other-site.ts
        ├── size.test.ts
        └── playground/              # browser tests (pg), and unit/ (fast)

tools/
├── traceability/src/files.ts        # FAST_TEST_GLOBS + packages/web/test/playground/unit
├── local-verify/src/engines.js      # npm run test:engines: Firefox and WebKit; timing alone
└── site-check/
    ├── src/shell-states.ts          # + the Playground's states
    ├── src/parts/playground.ts      # new
    ├── src/parts/{accessibility,keyboard,offline,other-sites,layout,modes,fonts,lighthouse,terminal}.ts
    └── test/                        # playground.test.ts new; others extended

specs/005-os-shell/design/           # the amendment's wireframes, mockup pages, exports, review line (R21)
specs/005-os-shell/tasks.md          # the two shortcut tasks marked superseded by 008
specs/006-terminal/design/           # wireframes.md's `open` reply row; review.md's amendment line
specs/006-terminal/contracts/commands.md  # the same reply row
specs/006-terminal/tasks.md          # T027's `open settings` case marked superseded by 008
```

**Structure Decision**: the Playground is an app in `packages/web/src/apps/playground/`, as 006
set for apps, declaring its shells beside its code (Constitution V). Its interface is in the `os`
script's import graph so 007's walker and 001's checks read its `data-req` values; its engine is
a separate build under the same folder, loaded at run time (R2, R3). Window rules and shortcuts
stay in `@cv/os-core`, tests first, as 005 set. Site text stays in `site-text.ts`, except the
examples' titles, descriptions and comments, which live with each example and are read by the
site-text and content checks as site files (FR-031). Design values are tokens only.

## Complexity Tracking

None. Every Constitution Check row is Pass, and no exception is needed. The hand-written token
export is allowed by the constitution's interim provision on local mockups. Two plan facts may
change what the spec can promise and are marked **Verify** to be settled first in implementation:
the memory behavior of FR-045 in each browser (R24), and which VS Code keys each browser lets a
page take (R12, FR-084). If either fails, the spec is amended before the code, not excused here.
