---

description: "Task list for the TypeScript Playground"
---

# Tasks: The TypeScript Playground

**Input**: Design documents from `/specs/008-typescript-playground/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/playground.md](./contracts/playground.md),
[contracts/engine.md](./contracts/engine.md), [contracts/runner.md](./contracts/runner.md),
[contracts/share-link.md](./contracts/share-link.md), [contracts/shell.md](./contracts/shell.md),
[contracts/site.md](./contracts/site.md), [contracts/cli.md](./contracts/cli.md),
[quickstart.md](./quickstart.md), and the design in [design/](./design/):
[wireframes.md](./design/wireframes.md), the interim local mockup in `design/mockup/` with its
[README.md](./design/mockup/README.md) and 30 PNG exports, and the signed
[review.md](./design/review.md) (interim local mockup, commit `1188830`, approved 2026-10-29 in
`aab38e0`).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `008-typescript-playground-FR-###` IDs it covers, and
every active FR in spec.md (FR-001 to FR-087, FR-006 removed: 86 requirements), and the amended
`005-os-shell-FR-063`, `005-os-shell-FR-065`, `006-terminal-FR-008` and `006-terminal-FR-014`, are
covered by at least one test task (see Requirement Coverage at the end).

**Organization**: Tasks are grouped by user story.

- US1 is the editor itself: the app in the dock, the download, live errors, types, suggestions,
  navigation, quick fixes, keys, the panes, the options, kept code and Reset.
- US2 runs the code in the sandbox: logs, timers, Stop, the stuck popup, limits and crashes.
- US3 adds the eleven examples, three of them reading the CV as typed data.
- US4 shares code as links and opens them without running.
- US5 gives phones the "best on desktop" screen, and keeps everything across shell switches.
- US6 completes keyboard and screen-reader use.
- US7 settles the look against the design, reduced motion, forced colors, zoom and layout.
- US8 proves the Playground offline and on the site alone, and across site updates.
- US9 extends the site check to the Playground in both shells.

The amendment of 005 (FR-086) is its own phase before US1, because Format Document's key and the
shell's capture-phase listener depend on it. The amendment of 006 (FR-087) is its own phase after
US5, because `open playground` needs the Playground on both shells.

The design gate, the tokens, the `os-core` changes, site text, the options table, the session
store, the CV declaration, the engine build, the service worker, the loader, the starting example,
the test helpers and the plan's first **Verify** items (R6, R17, R24) come first, in Phase 2,
because every story builds on them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US9)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 008-typescript-playground-FR-016"

## Not in this feature

As the spec's Assumptions set: Files and saving code as files, more than one file of code;
Spotlight; running code from the Terminal; saving the OS's state between visits; showing a shared
link's code on a phone; importing packages and their type definitions; choosing a TypeScript
version; JSX, plugins and exporting code to other sites; VS Code features beyond the official
Playground's editor (extensions, editor settings, keymaps, a debugger, a terminal); games, easter
eggs and translations.

The design is an interim local mockup, so 008 owes the provision's follow-up (a Penpot rebuild)
later, not here.

## Path Conventions

- CV data, read only through `@cv/content` (Constitution IV): `resume` from the app's props for
  `cv`'s value, and `packages/content/src/shape.generated.ts` for its type (research R10)
- Tokens, read only through `@cv/tokens`: `packages/tokens/penpot/tokens.json` (the hand-written
  export) and the generated `packages/tokens/src/tokens.generated.{css,ts}`
- The shared core: `packages/os-core/src/{types,geometry,shortcuts,index}.ts` and
  `packages/os-core/test/`
- The shell, changed as contracts/shell.md sets: `packages/web/src/os/{Os.tsx,metrics.ts,About.tsx}`,
  `packages/web/src/shells/desktop/{MenuBar,Desktop}.tsx`, `packages/web/src/apps/index.ts`,
  `packages/web/src/site-text.ts`, `packages/web/src/render.tsx`,
  `packages/web/src/pages/ShellPage.tsx`, `packages/web/src/sw/service-worker.ts`
- The Playground's interface, in the `os` script (new): `packages/web/src/apps/playground/`
  (`app.tsx`, `PlaygroundIcon.tsx`, `PlaygroundApp.tsx`, `Playground.tsx`, `Toolbar.tsx`,
  `Message.tsx`, `Panes.tsx`, `ErrorsPane.tsx`, `LogsPane.tsx`, `OptionsPanel.tsx`,
  `ExamplesPanel.tsx`, `StatusBar.tsx`, `Loading.tsx`, `Popups.tsx`, `BestOnDesktop.tsx`,
  `session.ts`, `options.ts`, `keys.ts`, `share.ts`, `kept.ts`, `logbook.ts`, `examples/`,
  `playground.css`, and `engine/loader.ts`)
- The engine, a separate build (new): `packages/web/src/apps/playground/engine/` (`engine.ts`,
  `editor.ts`, `theme.ts`, `editor.css`, `glyphs/`, `ts.worker.ts`, `source-map.ts`,
  `runner/{host,bootstrap,runtime,format}.ts`)
- Build: `packages/web/scripts/build-site.ts`, `packages/web/scripts/cv-types.ts` (new)
- The Terminal (006's amendment): `packages/web/src/apps/terminal/engine/commands.ts`
- Tests (plan.md Requirement Traceability):
  - **pg**, browser tests on the real build: `packages/web/test/playground/*.test.ts(x)`
  - **unit**, Node, in `fast`: `packages/web/test/playground/unit/*.test.ts`
  - **core**: `packages/os-core/test/`
  - **shell**: `packages/web/test/shell/`; **term**: `packages/web/test/terminal/` (and
    `terminal/engine/`, in `fast`); **web**: `packages/web/test/`
  - **check**: `tools/site-check/test/`
  - helpers (new): `packages/web/test/helpers/{playground,other-site}.ts`
- The site check: `tools/site-check/src/` (`check.ts`, `shell-states.ts`, `report.ts`,
  `parts/*.ts`, new `parts/playground.ts`)
- Shared test code from 004 to 007: `packages/web/test/helpers/{site,browser,ax,copy,fixtures,offline,shell,terminal,inspector}.ts`,
  `tools/site-check/test/helpers/{sites,root}.ts`

## Rules that apply to every task

- **No design literal and no CV fact in source** (FR-029, FR-031, FR-068, Constitution IV):
  - Everything under `packages/web/` and `packages/os-core/` except `test/` is source for 002's and
    003's checks, with no exception and no skip marker added. That includes the examples and
    `engine/`.
  - Style sheets (`playground.css`, `engine/editor.css`) use only `var(--token-…)`,
    `@media (--token-…)` and `@container (--token-breakpoint-…)`. Inside
    `@media (forced-colors: active)`, system colors such as `CanvasText`, `LinkText` and
    `Highlight` are allowed (003 FR-056).
  - The editor's theme (Monaco's `defineTheme` needs values in script) reads only
    `tokens.generated.ts`, through the interface, passed to the engine as `EditorTheme`
    (contracts/engine.md). The engine holds no design value of its own.
  - Every non-CV word is in `src/site-text.ts`, under `playground` (and `os.views.playground`),
    except the examples' titles, descriptions and comments, which live in each example module and
    are site text read by the site-text and content checks (FR-031). No example holds a CV fact:
    CV values reach the code only through `cv`.
- **No markup from the code's output** (FR-047): log values reach the page only as React text
  children. Nothing in `apps/playground/` uses `dangerouslySetInnerHTML`, `innerHTML`, `eval` or
  `new Function`. Monaco's own hovers render TypeScript's quick info through its bundled
  `dompurify`; nothing the code prints goes through Monaco.
- **The engine boundary** (contracts/engine.md, research R2, R3): nothing in the `os` script's
  import graph imports a module under `engine/` except `engine/loader.ts`, which imports the entry
  by URL at run time. `monaco-editor` is imported only under `engine/`. The `os` script stays one
  file (005 R14).
- **The runner** (contracts/runner.md): one `<iframe sandbox="allow-scripts">` per run, never with
  `allow-same-origin`, `allow-popups`, `allow-modals`, `allow-top-navigation`, `allow-forms` or
  `allow-downloads`. No code path from reading a shared link reaches `engine.run` (FR-053).
- **Nothing from another site** (FR-010): no URL outside the site in source, style or build output,
  except what the visitor's code requests at run time.
- **`data-req`** (FR-074): written only as a JSX string attribute,
  `data-req="008-typescript-playground-FR-…"`, on the elements contracts/playground.md's
  `data-req` targets table names, listing every ID it gives, separated by spaces, in modules of
  the `os` script's import graph so 001 and 007 read them. Elements Monaco renders carry none;
  their requirements sit on `div.playground-editor`.
- **Test titles**: every test or `describe` title carries only full, existing IDs, such as
  `describe('008-typescript-playground-FR-016: errors are marked within a second of a pause', …)`.
  Tests for success criteria without an FR use titles such as `describe('… (SC-002)', …)`.
  Structural tests that serve no single requirement carry no ID. No other `fr-` text in any letter
  case.
- **Browser tests act like a visitor** (005 R17): the real build, served by `serveBuilt` (004),
  opened through `test/helpers/shell.ts` and `test/helpers/playground.ts`, driven by clicks, typed
  keys, the clipboard, viewport changes and Playwright's network and clock controls. No test hook
  in the site. Expected values come from the built site (`files.json`), `resume.json` and the
  bundled TypeScript, never from a hand-written copy (FR-075).
- **Three engines** (research R25): `sandbox.test.ts`, `memory.test.ts`, `keys.test.ts` and the
  probe of T025 run in Chromium on every run, and also in Firefox and WebKit in `npm run verify`
  (T024).
- **Fixtures and tests may hold literal values and CV text.** They live in `test/` and
  `__fixtures__/`, which no check searches. Never copy one into source.
- **No test writes inside the repository**: copies, builds and fixture repositories go to
  temporary directories. Only `npm run build` writes, under `packages/web/dist/`.
- **The token export is written in Penpot's form** (`JSON.stringify(value, null, 2)`, no final
  newline) under the interim provision on local mockups.
- **Verify items** (plan Complexity Tracking): R24 (memory, FR-045) and R12 (browser keys, FR-084)
  can change what the spec promises. If either fails, stop and ask the owner to amend the spec
  first (Constitution I); never excuse it in code or tests. R2, R6, R17, R22 and R23 have named
  fallbacks; record each outcome in its task.
- **Traceability stays red until Phase 14**: 008's spec is Approved, so `npm run traceability` and
  001's self-check tests fail on uncovered `008-typescript-playground` IDs until every story's
  tests exist. Any other failure is a real one.
- Code uses erasable TypeScript only, with explicit `.ts`/`.tsx` extensions on relative imports.
- Run everything with Node 26 active (`nvm use`).
- Commits use Conventional Commits and carry no AI or Claude attribution (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: A clean baseline on `main`, the plan committed, and Monaco installed

- [X] T001 Confirm the branch is on `main`'s head before any code: `git fetch origin main`; `git merge-base HEAD origin/main` equals `origin/main` (at tasks time `a3f9532`, with 007 merged in #29 and Constitution 1.5.0 in #31). If `main` moved, `git merge origin/main` as a merge commit (no rebase, no squash). Commit the plan's artifacts if they are still uncommitted, as `docs(008): plan the playground` (`plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/`), then this file as `docs(008): break the playground into tasks`. Record the base commit here.
  - Done 2026-10-29: `origin/main` is `a3f9532`, the merge base of `HEAD`; nothing to merge. The plan's artifacts and this file were committed together in `de62111` (`docs: add the plan and tasks (008-typescript-playground)`). Base commit: `a3f9532`.
- [X] T002 Record the baseline after T001 with Node 26: `npm ci`, then `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check` and `npm run site-check` exit 0; `npm run traceability` fails only on the 86 uncovered `008-typescript-playground` IDs (the rule above). Run `npm run build` and record the built `os-*.js` brotli size here: it is SC-009's base, which T057's size test holds as a constant. Any other failure is reported to the owner, not fixed here.
  - Done 2026-10-29: `npm ci`, `npm run typecheck`, `npm run content-check` and `npm run token-check` exit 0. `npm test` ran while Phase 2 edits were being made, so besides the expected traceability failures (001 self-check, 004/006/007 self-check rows) its other failures (005 shell site-text, the site check's `cli` and `inspector` rows) came from files changing under it (a temporary file, shifted test lines), not from `main`. SC-009 base, built from `a3f9532` in a clean temporary worktree: `os-C2BMMFYx.js`, 378,754 bytes, **98,293 bytes brotli** (quality 11). T057 holds 98,293 + 45 KB.
- [X] T003 Add `monaco-editor` `0.57.0`, exact, to `packages/web/package.json`'s dependencies (research R1, contracts/site.md Dependencies), then `npm install` to update the lockfile. Confirm from the installed package: MIT license, its dependencies are `marked` and `dompurify` only, the ESM entries `monaco-editor/editor` and `…/languages/{definitions,features}/typescript/register` exist, and `typescriptServicesMetadata.js` reads `5.9`. No other package is added (Constitution X). Commit as `build(008): add monaco-editor 0.57.0`.
  - Done 2026-10-29: `monaco-editor` `0.57.0` exact in `packages/web/package.json`; MIT; dependencies `marked` `14.0.0` and `dompurify` `3.4.15` only; `esm/vs/editor.js`, `esm/vs/languages/definitions/typescript/register.js` and `esm/vs/languages/features/typescript/register.js` exist; `typescriptServicesMetadata.js` reads `5.9.3`.
- [X] T004 [P] Add `packages/web/test/playground/unit` to `FAST_TEST_GLOBS` in `tools/traceability/src/files.ts` (plan Testing), so `vitest.config.ts`'s `fast` project runs it and `slow` leaves it out. Confirm `tsconfig.json` and `TEST_INCLUDE_GLOBS` already cover `packages/web/src/apps/playground/`, `packages/web/scripts/cv-types.ts` and `packages/web/test/playground/`; change them only if they don't, and say so here. Run 001's `files` tests: they pass.
  - Done 2026-10-29: `packages/web/test/playground/unit` added to `FAST_TEST_GLOBS` and to 001's `test-sets.test.ts` list. `tsconfig.json` (`packages/**/*.ts(x)`) and `TEST_INCLUDE_GLOBS` already cover the new paths; unchanged.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate, tokens, the OS state, site text, the options table, the session
store, the CV declaration, the engine build, the service worker, the loader, the starting example,
the test helpers, and the first Verify items

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: T005 comes first. No task that creates or changes UI may start
until it is done.

- [X] T005 Confirm the design gate in `specs/008-typescript-playground/design/` (plan Constitution Check II): `wireframes.md` covers every state spec.md's Design section lists, in both shells; `mockup/` holds the 30 PNGs (24 `desktop-*-1440`, `phone-1-home-375`, `phone-2-best-on-desktop-{375,320,landscape-812}`, `phone-3-shared-link-{375,320}`); `review.md` reads `**Status**: Approved`, is signed by the owner for the interim local mockup at commit `1188830` on 2026-10-29, and records the look as original and not the official Playground's (FR-068, Constitution IX); the Penpot link is marked not needed under the interim provision. Write the result here.
  - Done 2026-10-29: wireframes cover every state in both shells; `mockup/` holds the 30 PNGs (24 desktop, `phone-1-home-375`, `phone-2-best-on-desktop-{375,320,landscape-812}`, `phone-3-shared-link-{375,320}`); `review.md` is `Approved`, signed for `1188830` on 2026-10-29, records the look as original; Penpot not needed under the interim provision.
- [X] T006 Reconcile the design's proposed tokens with the export before any code reads them (research R22), in `specs/008-typescript-playground/design/mockup/README.md`'s Proposed tokens table (and the names in `proposed-tokens.css` and `playground.css` to match), changing no value:
  - Done in `b7ce93a`: `typography.code` → `typography.small`, `font-size.code` → `font.size.small`, the window margin → `size.terminal-window-margin` (40), `size.playground.*` → `size.playground-*`, `size.playground.stack` → `breakpoint.playground-stack`. Every base color exists; only `lilac-wash` and `rose-wash` are new. No value changed.
  - where an existing token already holds the value, the design names it instead of adding one: check `size.code-line`, `font-size.code` and `typography.code` against 006's Terminal tokens (`font.size.terminal` and its line height), and `size.playground.*` against 006's `size.terminal-window-*` naming form, so the new names follow the export's existing form;
  - add the window's right margin, 40 px (wireframes Design values; contracts/shell.md `playgroundMargin`), which the table lacks: reuse `size.terminal-window-margin` if it holds 40, else add `size.playground-window-margin`;
  - a width read in a container query becomes a breakpoint, as 007 R13 did: `size.playground.stack` (720px) becomes `breakpoint.playground-stack` (`dimension`, `720`), so `playground.css` can write `@container (--token-breakpoint-playground-stack)`;
  - confirm every base color the table refers to exists (`carbon`, `snow`, `lilac`, `mint`, `periwinkle`, `haze`, `rose`, `amber`, `fog`, `speck`, `amber-wash`, `soot`, `smoke`, `night`, `shade`) and that only `color.base.lilac-wash` (`#818cf840`) and `color.base.rose-wash` (`#fda4af29`) are new.
  Add one sentence above the table pointing to research R22. Commit it alone as `docs: reconcile the playground's tokens with the export (008)`. If nothing changes, record that here and skip the commit.
- [X] T007 Add the Playground's tokens to `packages/tokens/penpot/tokens.json` exactly as T006's table now lists them, in the hand-written export's form: the two base washes beside the other base colors; `color.code.*`, `color.playground.*` and `color.icon-playground.*` in the `light` set as references to base colors, beside 006's Terminal colors; the sizes as unitless `sizing` in `base`, as `size.terminal-window-width` is; the breakpoint as `dimension` in `base`, as `breakpoint.spec-wide` is; `typography.code` as 006's typography tokens are. Run `npm run token-output` to regenerate `packages/tokens/src/tokens.generated.css` and `packages/tokens/src/tokens.generated.ts`, then `npm run token-check` (exits 0, no exception). `packages/web/test/tokens.test.ts`'s "every token in the export is read" stays red until T075 and T063 read them.
  - Done: tokens added as T006's table lists; `npm run token-output` regenerated the output; `npm run token-check` passes.
- [X] T008 [P] Write `@cv/os-core`'s tests first (contracts/shell.md `@cv/os-core`), with 005's helpers and a four-app fixture (`cv`, `terminal`, `playground`, `about`) in `packages/os-core/test/__fixtures__/`:
  - Done: `test/__fixtures__/four-apps.ts`; geometry (360, 88, 1040 × 648; centered 200, 58; 1024 × 640 → 0, 88, 1024 × 392; beside the Terminal 360, 208, 1040 × 532), reducer and invariants cases pass.
  - `packages/os-core/test/geometry.test.ts`, covers 008-typescript-playground-FR-003: `placeWindow('playground', …)` at 1440 × 900 with the CV at its first-load place gives 360, 88, 1040 × 648 in the area; with no shown window, centered; at 1024 × 640, fitted with at least `firstTop` below it and never below the minimum; beside an open Terminal, offset from the front window; after a cascade, clamped; 006's Terminal cases give the same boxes as before (`placeBeside` replaces `placeTerminal`);
  - `packages/os-core/test/reducer.test.ts` and `packages/os-core/test/invariants.test.ts`, covers 008-typescript-playground-FR-003: with the four-app fixture, `open`, `close`, `minimize`, `toggleMaximize`, `showSpecs`, `showApp`, `next`, `mobileOpen` and `shellChanged` work for `playground` as for any view, and 005's random runs keep every invariant.
- [X] T009 Extend `@cv/os-core` after T008 (contracts/shell.md): `ViewId` gains `'playground'` and `Metrics` gains `playgroundWidth`, `playgroundHeight`, `playgroundMargin` and `playgroundOffset` in `packages/os-core/src/types.ts`; `packages/os-core/src/geometry.ts` gets `placeBeside(view, size, margin, offset)`, used for `'terminal'` and `'playground'`, with the Terminal's rule unchanged; exports from `packages/os-core/src/index.ts`. The reducer is unchanged. T008 passes; `npm run typecheck` may fail in `@cv/web` until T010.
  - Done: `ViewId` gains `'playground'`, `Metrics` the four values, `placeBeside` replaces `placeTerminal`, exported.
- [X] T010 Wire the third view into `@cv/web` after T009 (contracts/shell.md Other changes): `packages/web/src/os/metrics.ts`'s `METRICS` gains the four values with `px(…)` from T007's tokens; `packages/web/src/os/Os.tsx`'s `isView` accepts `'playground'`; `AppOs.open` in `packages/web/src/apps/index.ts` accepts `'cv' | 'playground' | 'about'`. `npm run typecheck` passes; 005's to 007's tests pass unchanged.
  - Done: `METRICS` gains the four values (`playgroundMargin` from `size.terminal-window-margin`), `isView`, `AppOs.open`. `npm run typecheck` passes; 005–007 browser suites run at T077.
- [X] T011 [P] Add the site text to `packages/web/src/site-text.ts` exactly as design/wireframes.md's states and Site text section and data-model.md Site text set: `os.views.playground` (`Playground`), and a `playground` group holding the download and offline states (with `{received}`, `{total}` patterns), Retry, the toolbar's names (Run, Stop, Examples, Options, Share, `Share with…`), the run states (`Running · {n} timer left` and plural, `Finished in {s} s`, stopped, errors, crashed, out of memory), the pane names and their counts, `✓ No errors. The code checks with the current options.`, the panes' none sentences (FR-023), the logs' level words, the dropped and cut notes, the errors note (`The code has {n} errors. Running the JavaScript anyway.`), the nothing-ran note, `Stopped after {s} s`, the `alert`, `prompt` and `confirm` notes, every `MessageKey` of data-model.md Message, the stuck, reset and keys popups, the options panel (legends, every option's description, `Reset to defaults`, the changed-options sentence), the examples panel's heading and note, the status bar (`Ln {line}, Col {column}`, `Spaces: {n}`, the error count, `Checking…`, `Tab moves focus`, `TypeScript {version}`), the editor's name and its two descriptions (Mac and other keys), the packages message (research R11), the mobile screen (both headings, paragraphs, Share link, Copy link, the note, `Link copied.`), the menu items, and the announcements (download steps, `{n} new log entries`, `The code is running again.`). Use 005's `fill` for patterns. The examples' titles and descriptions are not here (FR-031). No CV fact and no design value: numbers such as `5 seconds` that are design values come from constants passed through `fill`, as 005's pad legends do.
  - Done: `os.views.playground` and the `playground` group (also `keyLabels`, read by `keys.ts`). Patterns take `{seconds}`, `{limit}` and the like through `fill`.
- [X] T012 [P] Write `packages/web/test/playground/unit/options.test.ts`, covers 008-typescript-playground-FR-024, 008-typescript-playground-FR-025 and 008-typescript-playground-FR-026 (data-model.md Compiler options, research R9): every name in the table is an option of the bundled TypeScript (read `optionDeclarations` from `monaco-editor`'s `typescriptServices.js` in Node); every default is the design's (`target` `ES2022`; `strict` and its eight checks on; the other checks off; `declaration` and `useDefineForClassFields` on; the rest off); groups and order are the design's; no module, file, package or JSX option is offered; `readOptions` leaves out "a name not in `OptionName`" and "a value of the wrong kind", naming each, drops "a flag set to its default", and with "`strict: false` with no strict check written turns every strict check off"; `changedOptions` writes only options that differ, in the table's order; `compilerOptions(changed)` adds the fixed ones: `module: ESNext`, `moduleDetection: force`, `lib` from `target` plus `WebWorker` minus `DOM`, `sourceMap: true`, `noEmit: false`, `isolatedModules: false`, `jsx: none`, `types: []`, `allowJs: false`.
  - Done: 9 tests pass against the bundled TypeScript 5.9.3.
- [X] T013 Write `packages/web/src/apps/playground/options.ts` after T012: `OptionName`, `Target`, `OptionSpec`, `ChangedOptions` and the `OPTIONS` table as data-model.md sets them, descriptions read from site text, and `readOptions`, `changedOptions` and `compilerOptions`. T012 passes.
  - Done: the table and its rules are in `compiler-options.ts` (no words, so the engine can import it); `options.ts` adds the descriptions from site text and re-exports it.
- [X] T014 [P] Write `packages/web/test/playground/unit/session.test.ts`, covers 008-typescript-playground-FR-005 and 008-typescript-playground-FR-061 (data-model.md Session): the store's initial state (`download` idle, `pane` `javascript`, `panel` `none`, `popup` `none`, `keeping` `yes`, `pendingLink` `none`); subscribers see each change; the state survives every subscriber leaving and a new one arriving (an unmount and a mount); `close` ends the run, empties the logs, closes popups and panels and clears the message, and keeps the options and `viewState`.
  - Done: 4 tests pass.
- [X] T015 Write `packages/web/src/apps/playground/session.ts` after T014: the module-level store of data-model.md Session, with `useSyncExternalStore` as 006's `apps/terminal/session.ts` does, its actions, and `close`. T014 passes.
  - Done: `createStore`, `session`, `useSession`; shared data types in `apps/playground/types.ts` (types only, read by the engine too).
- [X] T016 [P] Write `packages/web/test/playground/unit/cv-types.test.ts`, covers 008-typescript-playground-FR-029 (research R10): the declaration generated from `packages/content/src/shape.generated.ts` declares every exported interface as a global `interface` with its JSDoc descriptions, and `declare const cv: Resume;`; `ResumeProject`, `ResumeSkill` and `Resume` are present; `projects` is optional; a copy of the shape with a field renamed in a temporary folder changes the output; the plugin resolves `virtual:cv-types` to that text.
  - Done: 5 tests pass.
- [X] T017 Write `packages/web/scripts/cv-types.ts` after T016: a Vite plugin serving `virtual:cv-types` as a string export, built from `shape.generated.ts` with TypeScript's own parser (the repository's TypeScript, at build time), and its module declaration for `tsc`. Register it in the client build in `packages/web/scripts/build-site.ts` (contracts/site.md step 3). T016 passes.
  - Done, one deviation: the repository's TypeScript 7 has no JavaScript parser API, so `cv-types.ts` parses the shape with the TypeScript parser Monaco bundles (5.9.3, the one the Playground runs). Registered in the client build; `virtual:cv-types` declared in `src/virtual-modules.d.ts`.
- [X] T018 Verify research R6 first in implementation: write the engine's skeleton, `packages/web/src/apps/playground/engine/engine.ts` (`export const api = 1`, `createEngine` stubbed) and `packages/web/src/apps/playground/engine/ts.worker.ts` importing `initialize` and `TypeScriptWorker` from Monaco's TypeScript worker module and subclassing it with an empty `getCheck`, and build it with Vite's `?worker` import in a trial build. If the subclass or `initialize` doesn't work with the build, apply R6's fallback: a copy of Monaco's ~300-line `tsWorker` entry (MIT, with its notice) in `ts.worker.ts`. Record the outcome here.
  - Verified at build time 2026-10-29: `ts.worker.ts` subclasses `TypeScriptWorker` (`monaco-editor/languages/features/typescript/tsWorker`) and calls `initialize` (`monaco-editor/internal/common/initialize`); Vite's `?worker` builds it. No fallback needed. Monaco 0.57's worker manager makes its own worker only when `MonacoEnvironment.getWorker` is unset, so the build drops that fallback (`withoutMonacoOwnWorker` in `build-site.ts`) and no second TypeScript worker is shipped. The runtime check comes with the first browser test (T042/T077).
- [X] T019 Add the engine build to `packages/web/scripts/build-site.ts` after T018 (research R3, contracts/site.md step 2, contracts/engine.md Files): a second Vite build of `engine/engine.ts` with `base: './'`, its workers through `?worker` (Monaco's editor worker and `ts.worker.ts`), into a temporary folder; every file hashed; the folder moved to `<site>/playground/<engine-hash>/` with `files.json` as data-model.md EngineManifest (`api: 1`, `version`, `typescript` read from the bundled `typescriptServices.js`, `entry`, `style`, `files` with `bytes`, `total`); `.ttf` → `font/ttf` in the served types; `renderShell` gets `assets.playground` and `packages/web/src/render.tsx` / `packages/web/src/pages/ShellPage.tsx` write `#os[data-playground]` and `#os[data-playground-bytes]`; the site manifest lists the engine's files; the `os` script's one-file check is unchanged; `site build failed: <message>` when a file has no content type. `npm run build` succeeds and `npm run site-check` still passes.
  - Done 2026-10-30: the engine build works (`buildEngine`, `placeEngine` in `build-site.ts`; one script with `codeSplitting: false`, one style sheet, the editor and TypeScript workers, `codicon-*.ttf`; `files.json`; `#os[data-playground]` and `[data-playground-bytes]`; `.ttf` → `font/ttf`; the site manifest lists the engine's 7 files). `npm run site-check` passes, 14 of 14 parts. The TypeScript version is imported from Monaco's `typescriptServicesMetadata` module rather than read through `import.meta.resolve`, which Vitest's module runner doesn't support (it broke the `slow` project's global setup).
- [X] T020 Change the service worker in `packages/web/src/sw/service-worker.ts` (research R4, contracts/site.md The service worker): the precache leaves out every path under `/playground/`; a `GET` under `/playground/` is answered by `caches.match(request)` over every cache, else the network; `activate` still deletes only `cv-` caches but its own. `VERSION` is unchanged in form. 004's and 005's offline tests pass unchanged.
  - Done 2026-10-30: `service-worker.ts` answers `/playground/` from any cache, else the network; `writeServiceWorker` leaves `/playground/` out of the precache. 004's `test/offline.test.ts` and 005's `test/shell/offline.test.ts` pass unchanged (10 tests).
- [X] T021 [P] Write `packages/web/test/playground/unit/download.test.ts`, covers 008-typescript-playground-FR-007, 008-typescript-playground-FR-011 and 008-typescript-playground-FR-013 (data-model.md Download state, research R4), with fake `caches` and `fetch`: every transition of the table (`idle → checking → ready | downloading | offline`, `downloading → ready | offline { stopped: true }`, `offline → downloading` on Retry and `online`); "a cache without [the marker] is incomplete: it is never used"; the marker is put last; the choice of copy: the current hash if complete, else the newest other complete copy whose `api` equals the interface's, else none; once the current copy is complete every other `playground-*` cache is deleted; with `caches` missing or `put` throwing, the entry loads from the network and `kept` is `false`; `announcedStep` steps at 25, 50, 75 and 100%; an abort cancels and leaves the cache incomplete.
  - Done: 11 tests pass with fake caches and network.
- [X] T022 Write `packages/web/src/apps/playground/engine/loader.ts` after T021 (contracts/engine.md The loader): `loadEngine(manifestPath, totalBytes, events, signal)` fetching `files.json` and every file with `cache: 'reload'`, counting streamed bytes, putting each into `playground-<engine-hash>`, the marker last, then `import(/* @vite-ignore */ entry)` and linking `style`; the offline rule (`navigator.onLine === false` or a failed `files.json`, with the total from `data-playground-bytes`); the older-copy fallback; the clean-up; the can't-keep path. It is the only module of the `os` script that reaches the engine. T021 passes.
  - Done: `loadEngine(manifestPath, totalBytes, events, signal, env?)`, `requestRetry`, `stepOf`; the optional `env` gives the tests their fakes.
- [X] T023 [P] Write the test helpers (research R25): `packages/web/test/helpers/playground.ts`, with `openPlayground(page)` from the dock, `waitReady`, `setCode` (through the clipboard and `Ctrl+A`/`Cmd+A`, `Ctrl+V`, as a visitor pastes), `typeCode`, `run`, `stop`, `readLogs`, `readErrors`, `paneText`, `chooseExample(title)`, `menu(item)`, `holdEngine(page)` (holds `/playground/` responses to keep the download state), `freshProfile` and `engineManifest(site)` reading the built `files.json`; and `packages/web/test/helpers/other-site.ts`, a second server on `localhost` (the site is `127.0.0.1`, so another site) that answers with CORS, can answer slowly, and records each request with its headers.
  - Done 2026-10-30: `helpers/playground.ts` (also `openPlaygroundPage`, `focusEditor`, `showPane`, `paneTab`, `running`, `primary`; `setCode` pastes in Chromium, where Playwright grants the clipboard, and inserts the text as one input in Firefox and WebKit) and `helpers/other-site.ts` (`startOtherSite({ delay, pages, name })`; `name: '127.0.0.1'` serves a fixture page as the site). `helpers/browser.ts` gains `engine` and `permissions`, `helpers/shell.ts` passes them through. One shared change: Chromium's isolation flags now let the name `localhost` resolve (`EXCLUDE localhost` in `tools/site-check/src/browser.ts`), still to this machine only, so `localhost` can stand for another site.
- [X] T024 [P] Run the three-engine tests in the owner's local run (research R25): `npm run verify` (`tools/local-verify/src/verify.ts`) also runs `sandbox.test.ts`, `memory.test.ts`, `keys.test.ts` and `probe.test.ts` of `packages/web/test/playground/` in Firefox and WebKit, through an environment variable `helpers/playground.ts` reads to choose Playwright's engine; CI and `npm test` stay Chromium only. Add the case to `tools/local-verify/test/`, and the browsers to quickstart's prerequisites if missing.
  - Done 2026-10-30: a new check `engines`, `npm run test:engines` (`tools/local-verify/src/engines.js`), runs after `test` and runs the four files once with `PLAYGROUND_ENGINE=firefox` and once with `webkit`; `npm run verify` refuses with `browser tests in other engines need Firefox and WebKit: run npx playwright install firefox webkit` when they're missing (`hasOtherEngines` in `tools/site-check/src/browser.ts`). 001's `verify.test.ts` covers both, and 001's contracts/local-verify.md lists the check. Quickstart already lists the browsers. CI and `npm test` stay Chromium only.
- [X] T025 Verify research R17 and R24 first in implementation, in Chromium, Firefox and WebKit: write `packages/web/test/playground/probe.test.ts` (structural, no ID) with a fixture page in `packages/web/test/playground/__fixtures__/probe.html` that builds contracts/runner.md's frame (`sandbox="allow-scripts"`, the `srcdoc` with its policy, a bootstrap making a classic `Worker` from a `Blob`): the worker starts; `localStorage`, `indexedDB.open`, `caches.open` and `document.cookie` give the code nothing; a `fetch` to `helpers/other-site.ts` arrives with `Origin: null` and no `Cookie`; `importScripts` of a URL fetches nothing; and code that grows memory until it fails ends the worker while the page still answers a click within 100 ms and a new frame runs. If WebKit refuses the blob worker, apply R17's fallback (a `data:` URL worker) and record it. **If any browser loses the page in the memory case, stop: ask the owner to amend FR-045 first (R24), then go on.** Record each engine's result here.
  - Done 2026-10-30, with FR-045 and FR-041 as amended. Memory, last run of each engine: Chromium's page crashes (Playwright's `crash` event, which the amended FR-045 allows); Firefox and WebKit reach the test's 6 GB cap with no failure, the page answering within 100 ms and a new frame running, so no limit was reached there. `probe.test.ts`'s frame has no runtime, so its `credentials: 'include'` check on the cookie holds for Chromium only; T177's `network.test.ts` proves the runtime forces them off in all three.
  - Was blocked: R24 failed, so FR-045 needs the owner's amendment before the memory behavior is built (T025's rule, Constitution I). There is also an FR-041 finding for Firefox and WebKit, below. Results on 2026-10-30, `probe.test.ts` with `__fixtures__/probe.html`, Chromium 156.0.8078.4 (Playwright 1.64.1), Firefox 1555, WebKit 27.2, on a 16 GB Mac:
    - Blob worker: starts in the sandboxed `srcdoc` frame in all three engines; R17's `data:` fallback not needed.
    - Storage (FR-039): passes in all three. No `localStorage`, `document` or `window`; `self.origin` is `null`; the frame's `document.cookie` holds none of the site's cookies; the site's IndexedDB database and cache are never listed. WebKit does open an IndexedDB database for the opaque origin, but it is empty and a new frame never sees what an earlier run wrote. So the test checks "none of the site's, nothing kept" rather than "missing".
    - Requests (FR-041, FR-042): in all three, a `fetch` to `localhost` arrives with `Origin: null` and no `Cookie`, and `importScripts` and `import()` of a URL fetch nothing. **Firefox and WebKit:** `fetch(…, { credentials: 'include' })` to another origin on the site's own host sends the site's cookie (`site=kept`); Chromium sends none. The site sets no cookies today, so nothing is actually sent, but FR-041's "MUST carry none of the site's … cookies" holds there only because the site has none. The owner decides whether FR-041 says so, or whether the runtime should force `credentials: 'omit'` on `fetch`, `XMLHttpRequest` and `EventSource` (WebSocket can't be covered that way).
    - **Memory (FR-045, R24): fails.** In Chromium the worker grows to about 3.8 GB, then the whole page's renderer crashes (Playwright's `crash` event), in every run of the headless shell and 6 of 7 runs of full Chromium (`channel: 'chromium'`). Firefox and WebKit allocate up to the test's 6 GB safety cap without failing; they weren't pushed further, so as not to exhaust the test machine's memory. On a machine with less memory, WebKit would likely have its process killed by the system. The owner is asked to amend FR-045 (R24 suggests "ends the run where the browser allows it"). The memory case in `probe.test.ts` stays red until then, in `npm test` (Chromium) and in `npm run test:engines`.
- [X] T026 Write the starting example, which US1 needs (FR-019, FR-028): `packages/web/src/apps/playground/examples/types.ts` with data-model.md's `Example` type (`id`, `group: 'start' | 'types' | 'running' | 'cv'`, `title`, `description`, `code`, `options?`, `runs: 'to-end' | 'interval' | 'endless'`), `packages/web/src/apps/playground/examples/welcome.ts` with research R20's Welcome, its key label built for the visitor's system (`Cmd+Enter` on a Mac, `Ctrl+Enter` elsewhere), and `packages/web/src/apps/playground/examples/index.ts` exporting `EXAMPLES` (Welcome only until US3) and `welcome(mac)`.
  - Done, one change: `examples/index.ts` exports `examples(mac)` and `welcome(mac)` rather than a constant `EXAMPLES`, since Welcome's text depends on the visitor's system.

**Checkpoint**: Foundation ready: the OS knows the third view, the build writes the engine and the
service worker keeps it out of the precache, the loader can download and store it, and the sandbox
and memory behavior are known in all three engines.

---

## Phase 3: The amendment of 005 (FR-086)

**Goal**: The shell drops its Minimize and Maximize shortcuts, so `Shift+Alt+F` is free for
Format Document, and the shell's listener moves to the capture phase so its shortcuts work from
inside the editor (contracts/shell.md The amendment of 005, research R21). 005's spec already
records the amendment (the 2026-10-29 session; FR-063 and FR-065 marked Amended).

**Independent Test**: at 1440 × 900, `Alt+Shift+H` and `Alt+Shift+F` do nothing; the minimize
and maximize controls and the window menu's Minimize and Maximize still work and show no key;
About this site lists six shortcuts; 005's wireframes and review record the change.

The design change comes first, in `docs:` commits, before any code (Constitution II, R21).

- [X] T027 Update `specs/005-os-shell/design/wireframes.md` (research R21): the window menu's Minimize and Maximize show no key; About this site's `Keyboard shortcuts` list has six entries (`M`, `D`, `N`, `W`, `P`, `S`); a dated note names 008 FR-086 and 005 FR-063, FR-065. Commit as `docs(005): drop the minimize and maximize shortcuts from the design (008)`.
  - Done 2026-10-30: the window menu frame shows no key for Minimize and Maximize, with a note under it; About's list and the Shortcuts table hold six; a dated amendment note under Shortcuts names 008 FR-086 and 005 FR-063, FR-065.
- [X] T028 Rebuild 005's interim mockup pages in `specs/005-os-shell/design/mockup/` that draw the window menu or About this site with the shortcuts, with the mockup's own build script, and export their PNGs again at the same widths. Commit as `docs(005): re-export the window menu and About without the two shortcuts (008)`.
  - Done 2026-10-30: 005's mockup has no build script; its pages are written by hand, so `desktop-window-own-menu.html` (no key beside Minimize and Maximize), `desktop-two-windows.html` and `desktop-window-menu.html` (About's six shortcuts) were edited, and their PNGs exported again at 1440 × 900, 1×, as its README says (the built site on 4173, the repository on 8005, Playwright's Chromium).
- [X] T029 Owner action: the owner reviews T027 and T028 and adds a dated sign-off line for the amendment to `specs/005-os-shell/design/review.md`, naming 008 FR-086 and the mockup commit. No code task in this phase starts before it (Constitution II). Record the date and commit here.
  - Done 2026-10-30: the owner approved `f5143a1` (wireframes) and `f06573b` (the re-export); the sign-off is in `specs/005-os-shell/design/review.md`. T030 to T037, T055, T060's `Keys…`, T071 and T072 can go ahead.
- [X] T030 [P] Update `packages/os-core/test/shortcuts.test.ts`, covers 005-os-shell-FR-063, 005-os-shell-FR-065 and 008-typescript-playground-FR-086: `SHORTCUTS` holds six entries, `menu-bar` M, `dock` D, `next-window` N, `close` W, `move` P, `resize` S, in that order; `matchShortcut` gives `null` for `Alt+Shift+H` and `Alt+Shift+F`, off a Mac by `key` and on a Mac by `code`; the reserved-keys fixture still holds none of the six.
- [X] T031 [P] Add a `describe` to `packages/web/test/shell/amendment.test.ts`, covers 008-typescript-playground-FR-086: `specs/005-os-shell/spec.md` records the 2026-10-29 session and marks FR-063 and FR-065 Amended, keeping the controls and menu commands; `specs/005-os-shell/design/wireframes.md` and `review.md` carry the dated amendment lines naming 008; `specs/005-os-shell/tasks.md` marks the shortcut tasks superseded by 008 (T037).
- [X] T032 [P] Update 005's shell tests, each naming 005-os-shell-FR-063 or 005-os-shell-FR-065 and 008-typescript-playground-FR-086: `packages/web/test/shell/menus.test.ts` (the window menu's Minimize and Maximize work and show no key or `aria-keyshortcuts`; the controls are named for their window), `packages/web/test/shell/keyboard.test.ts` (`Alt+Shift+H` and `Alt+Shift+F` do nothing with a window focused; the other six still work, also from inside a text input, so the capture phase is in place), `packages/web/test/shell/about.test.tsx` (About lists six shortcuts in `SHORTCUTS`' order).
  - Also moved `screen-reader.test.ts` and `targets.test.ts`, which pressed the two keys, to the controls.
- [X] T033 [P] Update `tools/site-check/test/keyboard.test.ts`, covers 005-os-shell-FR-063 and 005-os-shell-FR-065: the keyboard part's flow minimizes and maximizes by the window menu, not a shortcut, and a copy where `Alt+Shift+H` still minimizes fails, naming the step.
- [X] T034 Remove `minimize` (`H`) and `maximize` (`F`) from `SHORTCUTS` in `packages/os-core/src/shortcuts.ts` after T029 and T030; the six left keep their letters and order. The `minimize` and `toggleMaximize` actions stay. T030 passes.
- [X] T035 Update the shell after T034 (contracts/shell.md Other changes): `packages/web/src/shells/desktop/Desktop.tsx`'s key listener drops the two shortcuts and listens in the capture phase, calling `preventDefault` and `stopPropagation` on a matched shortcut so no character is typed (FR-062, FR-084); `packages/web/src/shells/desktop/MenuBar.tsx`'s Minimize and Maximize entries show no key; `packages/web/src/os/About.tsx` follows `SHORTCUTS`, so only its text changes if it names the count. T031 (but its tasks.md case, until T037) and T032 pass.
  - Also removes the two words from `site-text.ts`'s `about.commands`.
- [X] T036 Update `tools/site-check/src/parts/keyboard.ts` after T035: minimize and restore, maximize and restore by the window menu; check `Alt+Shift+H` and `Alt+Shift+F` change nothing. T033 passes.
  - A command chosen from the menu leaves focus on the menu's title (FR-015), so maximize and restore land there, not on the window's title as the shortcuts did. `ownMenuCommand` also replaces the inspector flow's own copy.
- [X] T037 Mark 005's superseded tasks in `specs/005-os-shell/tasks.md`: T084's `minimize` H and `maximize` F, T088's "the eight", T077's and T078's eight shortcuts, each with a dated line `Superseded 2026-10-29 by 008-typescript-playground FR-086: the shell keeps six shortcuts`, leaving each task's checkbox and text as they were. T031 passes.

**Checkpoint**: The shell answers six shortcuts, from inside text fields too, and `Shift+Alt+F` is
free. 005's tests and the keyboard part pass.

---

## Phase 4: User Story 1 - Write TypeScript and see its types (Priority: P1) 🎯 MVP

**Goal**: The Playground in the dock; the first open downloads TypeScript with progress, then the
editor works as VS Code does: live errors, types, suggestions, navigation, rename, quick fixes,
formatting, the command palette and VS Code's keys; the four panes; the options; kept code; Reset.

**Independent Test**: build the site, open `/` at 1440 px wide in a clear browser, open the
Playground from the dock: the download and its progress, then the editor with Welcome and
`TypeScript <version>`. Type `const n: number = "one"`: marked within a second, hover shows types,
suggestions appear, the JavaScript, Declarations and Errors panes match TypeScript's output.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T038 [P] [US1] Write `packages/web/test/playground/app.test.ts`, covers 008-typescript-playground-FR-001: the dock reads CV, Terminal, Playground in that order, the home screen at 375 the same; the item's name is `siteText.os.views.playground` and its icon the design's (braces around a play mark, `aria-hidden`); the app declares `['desktop', 'mobile']`.
- [X] T039 [P] [US1] Write `packages/web/test/playground/first-load.test.ts`, covers 008-typescript-playground-FR-002 and 008-typescript-playground-FR-009 (and SC-009): at 1440 only the CV window opens and at 375 the home screen; no Playground element exists and nothing under `/playground/` is requested within 10 s; the service worker's precache list holds nothing under `/playground/`; loading `/` and `/cv` and opening the CV and the Terminal request nothing there; at 375, opening the Playground requests nothing there; 005's first-load tests pass unchanged.
- [X] T040 [P] [US1] Write `packages/web/test/playground/window.test.ts`, covers 008-typescript-playground-FR-003: the window moves, resizes, minimizes, maximizes, closes and cascades as every window; its box at 1440 × 900 with the CV is 360, 88, 1040 × 648; at 375 it opens full screen; the Playground menu lists Compiler options…, Command palette (`F1`), Keys… and Reset… with the design's separators (US2 to US4 add Run, Stop, Examples… and Share… to this test, in the design's order).
  - Done 2026-10-30. Passes but the menu case, which expects the design's `Keys…` after Command palette: that item comes with T071, which is BLOCKED behind T029. The design's y 88 is in the desktop area (y 120 in the viewport, under the 32 px menu bar).
- [X] T041 [P] [US1] Write `packages/web/test/playground/focus.test.ts`, covers 008-typescript-playground-FR-004: opened while downloading (`holdEngine`), focus is on the window's title; when ready, on the editor, and the announced text holds `Playground`, `Code editor` and the description; with focus moved to the CV window during the download, it stays there when the editor becomes ready.
- [X] T042 [P] [US1] Write `packages/web/test/playground/download.test.ts`, covers 008-typescript-playground-FR-007 and 008-typescript-playground-FR-008: in a fresh profile the loading state shows `[n] MB of [total] MB` matching `files.json`, `progress.playground-progress`'s value rises, and no editor exists until the end; closing the window mid-download and reopening completes it; the cache lacks the marker while incomplete; a second open in the visit, a reload, and a reload offline make no request under `/playground/` that the network answers, and the editor shows within 2 s.
- [X] T043 [P] [US1] Write `packages/web/test/playground/version.test.ts`, covers 008-typescript-playground-FR-012: `span.ts-version` reads `TypeScript ` plus the engine manifest's `typescript`, which equals the version in `monaco-editor`'s bundled `typescriptServices.js`; no file under `packages/web/src/` holds that version literally (searched).
- [X] T044 [P] [US1] Write `packages/web/test/playground/no-storage.test.ts`, covers 008-typescript-playground-FR-014: with Cache Storage throwing (an init script replacing `caches.open`), the Playground opens online, the editor works, and the `cantKeepTypeScript` message shows in `div.playground-message`.
- [X] T045 [P] [US1] Write `packages/web/test/playground/editing.test.ts`, covers 008-typescript-playground-FR-015: line numbers; undo and redo; indent; `Ctrl+/`; bracket closing and surrounding; folding; `Ctrl+D` and `Alt`+click cursors; `Alt+Up`, `Alt+Down`, `Shift+Alt+Down`; expand selection; find and replace; `Ctrl+G`; `Ctrl+Shift+O`; other uses highlighted; `Shift+Alt+F` and Format Selection give TypeScript's formatting (Mac keys when the test fakes a Mac platform).
  - Done 2026-10-30. `Shift+Alt+F` formats in the editor already: the editor handles the key before the shell's bubbling listener sees it, so the test passes before T035; T035 still changes the shell as FR-086 sets.
- [X] T046 [P] [US1] Write `packages/web/test/playground/diagnostics.test.ts`, covers 008-typescript-playground-FR-016 (and SC-002's 1 s): `const n: number = "one"` is marked within 1 s of the last key, with its message on hover and after the line; every diagnostic of a fixture with errors and warnings is marked; with checking slowed (a 2,000-line paste), the status reads `Checking…` and the marks and Errors pane dim until the result. And `packages/web/test/playground/unit/check.test.ts`, covers 008-typescript-playground-FR-016 (research R7, with fake timers): a check is asked 250 ms after the last change; a change while a check is out queues one more; a result for an older version is dropped; `checking` turns on 300 ms after the change stopped with no current result.
  - Done 2026-10-30. The design shows the message of the cursor's line after the line (wireframes, The editor with errors), which the engine lacked: added as an `after` decoration (`.playground-inline-message`) in `editor.ts`, and the marks and that message dim under the scrim color while `checking` (`div.playground-editor.is-checking`, `editor.css`). Test helpers' `viewText` leaves the message out.
- [X] T047 [P] [US1] Write `packages/web/test/playground/hover.test.ts`, covers 008-typescript-playground-FR-017: hovering a name, and `Ctrl+K Ctrl+I` on it, show its type and JSDoc as the TypeScript worker's quick info gives (a fixture with a documented function).
- [X] T048 [P] [US1] Write `packages/web/test/playground/suggestions.test.ts`, covers 008-typescript-playground-FR-018: `job.` lists properties with names and types; Enter, Tab and a click insert; `Ctrl+Space` opens them; inside a call, the parameters card marks the current parameter.
- [X] T049 [P] [US1] Write `packages/web/test/playground/kept.test.ts`, covers 008-typescript-playground-FR-019 and 008-typescript-playground-FR-026: a fresh browser holds Welcome with the defaults and stores nothing in `localStorage`; after an edit and an option change, closing the window, reloading and a new page hold both; with `localStorage` throwing, the `cantKeepCode` message shows once and the code stays for the page; a kept unknown option is left out and named. And `packages/web/test/playground/unit/kept.test.ts`, covers 008-typescript-playground-FR-019 (data-model.md Kept code): `localStorage['cv-playground']` holds `{ format: 1, code, options }`; written 300 ms after the last change and on `pagehide`; "Never written while the Playground holds the starting example unchanged with the default options"; "a `format` other than 1, or JSON that doesn't parse, is ignored as if nothing were kept, and the key is left as it is until the next write"; reading, writing or a missing store throwing gives `no-storage`; Reset removes the key.
  - Done 2026-10-30. Found and fixed a bug: `createKeeper`'s default timers called `setTimeout` as a method of another object, which browsers refuse ("Illegal invocation"), so nothing was ever kept.
- [X] T050 [P] [US1] Write `packages/web/test/playground/panes.test.ts`, covers 008-typescript-playground-FR-020, 008-typescript-playground-FR-021, 008-typescript-playground-FR-022 and 008-typescript-playground-FR-023: four tabs in the design's order, JavaScript open first, Errors and Logs naming their counts; arrows move between them; the JavaScript and Declarations panes equal the worker's emit for a fixture with the current options, update after a change, are read-only, colored, and copy their selection; each error shows line, column, message and `TS` number, and activating one puts the cursor there; with none, the site text; `declaration` off and `noEmitOnError` with an error show the design's sentences.
- [X] T051 [P] [US1] Write `packages/web/test/playground/options.test.ts`, covers 008-typescript-playground-FR-024 and 008-typescript-playground-FR-025: the panel lists the design's options by group as fieldsets, each with its name and description; turning `strict` off removes a strict-only error from the editor and the Errors pane and changes the panes with no reload; Reset to defaults restores each; the changed-options sentence names what differs.
- [X] T052 [P] [US1] Write `packages/web/test/playground/reset.test.ts`, covers 008-typescript-playground-FR-080: Reset… asks in a popup; confirming restores Welcome and the defaults and removes the kept code; Undo brings the code back; Cancel and Escape change nothing (US2 adds: Reset during an interval stops it).
- [X] T053 [P] [US1] Write `packages/web/test/playground/navigation.test.ts`, covers 008-typescript-playground-FR-081: F12 goes to a definition, `Alt+F12` peeks it in place, `Shift+F12` lists every use, F2 renames every use, each matching the worker's results for a fixture.
- [X] T054 [P] [US1] Write `packages/web/test/playground/quick-fixes.test.ts`, covers 008-typescript-playground-FR-082: the lightbulb shows on a fixable line; `Ctrl+.` lists "Add missing properties"; choosing it changes the code as TypeScript sets; Undo reverts; no import fix is offered for a missing name a package would export.
  - Done 2026-10-30. Two fixes: the engine's markers carried `TS2739` as their code, and Monaco's code-action adapter reads a number from it, so no fix was ever asked for (now `"2739"`; the Errors pane keeps `TS2739`); and Monaco passes the editor's format options by their older names, which TypeScript's fixes don't read, so fixes came unindented (the worker renames them). The design puts the lightbulb in the gutter, so the editor now has its glyph margin.
- [X] T055 [P] [US1] Write `packages/web/test/playground/keys.test.ts` (three engines, T024), covers 008-typescript-playground-FR-083, 008-typescript-playground-FR-084 and 008-typescript-playground-FR-085: each key of FR-083 does its command on Windows and Mac key maps (the platform faked per test); Run is `Ctrl+Enter` (once US2 wires it); keys do nothing with focus outside the editor; no editor keybinding (read from the standalone keybinding service) equals a shell shortcut or a key of `keys.ts`'s reserved table; `Ctrl+Shift+P` doesn't open the palette; `Shift+Alt+F` formats; F1 lists every registered command with its key and runs the chosen one; the menu shows the palette's key; Keys… lists every command of `keys.ts` with notes where it differs and why; in Firefox and WebKit, R12's Verify keys reach the editor. And `packages/web/test/playground/unit/keys.test.ts`, covers 008-typescript-playground-FR-084 and 008-typescript-playground-FR-085: every `KeyCommand` has a `differs` reason when `keys` and `vsCode` differ, none of `keys` is a shell shortcut (`SHORTCUTS`) or in the reserved table, and the reserved table cites its source per entry.
  - Done 2026-10-30. Both key maps are faked per test in each engine (platform and user agent). Playwright can't reach the standalone keybinding service without a test hook, so the conflict check is black-box: pressing each reserved key in the editor must leave the event's `defaultPrevented` false, and no key listed in the palette may be a shell shortcut or reserved. It found real clashes: `Ctrl+L`/`Cmd+L` (Expand Line Selection) and, on a Mac, `Ctrl+Option+Left` and `Right` (word-part moves), now unbound.
- [X] T056 [P] [US1] Write `packages/web/test/playground/specs.test.ts`, covers 008-typescript-playground-FR-005: with code, a cursor, a selection, a scroll, the Declarations pane and an option changed, Show specs and Back restore each (US2 and US5 extend this test).
- [X] T057 [P] [US1] Write `packages/web/test/size.test.ts` (SC-009, research R2 **Verify**): the built `os-*.js`'s brotli size is at most T002's recorded size plus 45 KB, and no file under `/playground/` is referenced by the `os` script except through `data-playground`.
  - Done 2026-10-30. **Verify R2**: the built `os-DH9dSifL.js` is 432,116 bytes, **111,366 bytes brotli**, 13,073 over T002's base (budget 45,000).
- [X] T058 [P] [US1] Write `packages/web/test/playground/performance.test.ts` (SC-001, SC-002): with CDP throttling to 10 Mbit/s, the editor is usable within 15 s of the first open, and within 2 s on a later open online and offline; with 300 lines of code, errors within 1 s of a pause, and a type and suggestions within 500 ms, in 95 of 100 tries. On CI's shared runner the test logs the times without asserting them, as 007's T082 does; locally it asserts.
  - Done 2026-10-30, locally (16 GB Mac, Chromium): SC-001 first open 10.4 s at 10 Mbit/s, a later open 231 ms, offline 456 ms; SC-002 p95 over 100 tries: errors 291 ms, a type 28 ms, suggestions 188 ms.

### Implementation for User Story 1

> **2026-10-30, second session**: every US1 test but T055 (BLOCKED) is written and run; T059 to
> T076 are ticked where their tests pass. Open: T060 and T071 (`Keys…`, BLOCKED behind T029), T063
> (the widgets' restyle and glyphs), T072 (BLOCKED). The note below is the first session's.
>
> **In progress (2026-10-30)**: written but not yet run as tests: T038 `app.test.ts`, T039
> `first-load.test.ts`, the unit tests of T046 (`unit/check.test.ts`) and T049 (`unit/kept.test.ts`,
> both passing). Written and seen working in a Chromium smoke run of the real build (download, editor
> focused, Welcome with no errors, panes, status bar `TypeScript 5.9.3`), no browser test yet:
> T059 `PlaygroundIcon.tsx`; T060 `app.tsx` (Compiler options…, Command palette `F1`, Reset…; Keys…
> waits on T071), `AppMenuItem` gains `shortcut`, `disabled`, `separatorBefore` and `separatorAfter`
> (the design puts a separator before Show specs); T061 `Playground.tsx`, `Loading.tsx`
> (`PlaygroundApp.tsx` was not needed: `app.tsx` picks `Playground` or `BestOnDesktop`); T066
> `Panes.tsx`, `ErrorsPane.tsx`; T067 `Toolbar.tsx`, `OptionsPanel.tsx`; T068 `StatusBar.tsx`; T069
> `Message.tsx`; the reset popup of T073 in `Popups.tsx`; T075 `playground.css`; T076's view state
> in `Playground.tsx`. Also `Glyphs.tsx`, `text.ts`, `globals-types.ts`. Engine fixes: the globals lib
> is `file:///playground-globals.d.ts` (as `playground.d.ts` it clashed with the code's own declaration
> output); `editor.ts` imports Monaco's TypeScript features before `monaco-editor/editor`, else two
> contributions miss their services. `cvTypesPlugin` moved into `vite.config.ts` and
> `vitest.config.ts`, since the SSR build and the tests import the app too. None of T059 to T076 is
> ticked until its tests pass.

- [X] T059 [P] [US1] Create `packages/web/src/apps/playground/PlaygroundIcon.tsx`: the design's tile (braces around a play mark, night glyph on an amber-to-rose tile with the design's corners), inline SVG, `aria-hidden="true"`, colors from `var(--token-color-icon-playground-…)`, `data-req="008-typescript-playground-FR-001"` as the Terminal's icon carries its own.
- [X] T060 [US1] Declare the app (contracts/shell.md App declaration): `packages/web/src/apps/playground/app.tsx` with `id`, `name`, `shells: ['desktop', 'mobile']`, `needsNetwork: false`, `Icon`, `Content`, `focusOnOpen: '.playground [data-focus-home]'`, `menuItems` and `onClose`; `APPS` in `packages/web/src/apps/index.ts` becomes `[cvApp, terminalApp, playgroundApp]`; `AppMenuItem` gains `shortcut`, `disabled` and `separatorBefore`, which `packages/web/src/shells/desktop/MenuBar.tsx` reads (the key shown beside the item with `aria-keyshortcuts`, `aria-disabled` when disabled, a separator above). US1's menu items: Compiler options…, Command palette (`F1`), Keys…, Reset…. T038 passes.
  - Done 2026-10-30, with the menu's `Keys…`; T038 and T040's menu case pass.
- [X] T061 [US1] Write `packages/web/src/apps/playground/PlaygroundApp.tsx` (the mobile branch renders `BestOnDesktop`, a heading and paragraph from site text until US5) and `packages/web/src/apps/playground/Playground.tsx` and `packages/web/src/apps/playground/Loading.tsx` as contracts/playground.md's structure sets: `section.playground` (`aria-label`, `data-req="008-typescript-playground-FR-003 008-typescript-playground-FR-068 008-typescript-playground-FR-071 008-typescript-playground-FR-072 008-typescript-playground-FR-074"`), `div.playground-loading` and `progress.playground-progress` (`aria-valuetext` `2.4 MB of 6.3 MB` form, `data-req` FR-007 FR-065 FR-069), the body, the side and the status bar. On mount on desktop, start `loadEngine` with `#os`'s `data-playground` and `data-playground-bytes`, store `DownloadState` in the session, and abort on `onClose`. Focus (FR-004): the title while downloading through the shell's usual fallback; when ready, `[data-focus-home]` is set on the editor and focused only if focus is still in the window. T041 and T042 pass (with T062).
  - Done 2026-10-30. `PlaygroundApp.tsx` was not needed: `app.tsx` picks `Playground` or `BestOnDesktop` by shell.
- [X] T062 [US1] Write `packages/web/src/apps/playground/engine/editor.ts` and complete `engine.ts`'s `createEngine` (contracts/engine.md, research R1, R6, R9, R10, R14, R23): import Monaco's tree-shakable entries and only the features FR-015 and FR-081 to FR-085 need (as `monaco-editor` 0.57.0's `features/<name>/register` modules name them: brackets, clipboard, comments, the context menu, find, folding, format, go to line, go to symbol, hover, line operations, multicursor, parameter hints, the command palette, the quick outline, rename, smart select, suggestions, word highlights, code actions, markers navigation, references and peek, tab focus mode); `MonacoEnvironment.getWorker` returning the editor worker and `ts.worker.ts`; one model `file:///playground.ts`; `addExtraLib` of `cvTypes` as `file:///cv.d.ts` and `globalsTypes` as `file:///playground.d.ts` (`alert`, `prompt`, `confirm`); `setCompilerOptions(compilerOptions(options))`; `setModeConfiguration({ diagnostics: false })`; `mountEditor(element, viewState, description)` with `ariaLabel` from site text, the description as `aria-describedby` on the input area and `accessibilitySupport: 'on'`; `mountOutput` read-only editors (no line numbers, no minimap, `readOnly`, `domReadOnly`); `replaceCode` as one undoable edit; `setOptions`; `check`; `reveal`; `commands`; `runCommand`; `typescript` from the worker's `ts.version`; `dispose`. The interface passes `cvTypes` from `virtual:cv-types` (T017).
- [X] T063 [US1] Write `packages/web/src/apps/playground/engine/theme.ts` and `packages/web/src/apps/playground/engine/editor.css` (research R22): `defineTheme` with base `vs-dark` from `EditorTheme` (syntax colors by TypeScript token class as wireframes Design values set, the surface, line numbers, the cursor line, cursor, selection, occurrence band, error and warning colors, the code font), built in the interface from `tokens.generated.ts`; Monaco's widgets (hover, suggestions, parameter hints, peek, rename, the palette, find, the lightbulb menu) restyled to the design's raised panels with `var(--token-…)` only; the design's glyphs in `engine/glyphs/` for every icon the mockup draws. FR-068's full comparison is US7's.
  - In progress (2026-10-30): `theme.ts` gives Monaco's widgets the design's colors; `editor.css` restyles the hover, suggestions, parameter hints, peek, rename, palette, find and fixes menu to the mockup's raised panels with `var(--token-…)` only, and holds the after-line message and the checking dim. The build (`withSiteStyleRules`, `withSitePaths` in `build-site.ts`) keeps Monaco's style sheet under the site's rules: no `order` or reversed flex direction (004/005's reading-order rule), the icon font with `font-display: swap` and a site path (004 FR-010). **R22 Verify**: the fonts check listed every served font, so `fonts.test.ts` names the engine's icon font through its own rule (FR-068), not an exception. Still to do: the mockup's glyphs in `engine/glyphs/` (lightbulb, suggestion kind letters, close, the error and warning marks) replacing Monaco's icons; the side-by-side comparison is US7's.
  - Done 2026-10-30, third session: `engine/glyphs/{lightbulb,close,error,warning,info}.svg` (the mockup's paths) replace Monaco's icon-font glyphs by CSS masks over each icon's own color (`codicon-light-bulb`, `-lightbulb-autofix`, `-gutter-lightbulb*`, `-close`, `-widget-close`, `-error`, `-warning`, `-info`), with `CanvasText` under forced colors; the engine build emits them as hashed files listed in `files.json`. A suggestion's kind shows as the mockup's letter on the wash (`P` property and field, `M` method, `F` function, `V` variable, `C` class, `I` interface, `E` enum, `T` type parameter, `N` namespace, `K` keyword, `S` snippet, `W` word), colored as what it names. Seen in a Chromium screenshot of the built site. For US7's comparison: Monaco draws its lightbulb at the start of the next line when the fixable line starts with code, not always in the gutter as the mockup does; the fixes menu cuts long titles at its width.
- [X] T064 [US1] Complete `packages/web/src/apps/playground/engine/ts.worker.ts` (research R6, R11, data-model.md CheckResult): `getCheck(fileName)` returns syntactic, semantic and option diagnostics as `Diagnostic` (1-based, "errors and warnings only, in line then column order", the message flattened), the JavaScript with its source map or `{ none: 'noEmitOnError' }`, the declarations or `{ none: 'declaration-off' | 'noEmitOnError' }`, and `imports`; the R11 walk (import and export-from declarations with a specifier, `import x = require(…)`, `import(…)` calls, calls to an undeclared `require`) gives the packages message with code `0` at the specifier and drops TypeScript's own diagnostics on the same range (2307, 2792, 2580, 2591, 1323 and the like); `getCodeFixesAtPosition` drops fixes named `import` or whose changes add an import declaration (FR-082).
- [X] T065 [US1] Add checking to `packages/web/src/apps/playground/session.ts` (research R7): on `onChange`, wait 250 ms, call the engine's check, queue one more while a call is out, drop results for an older version, set `checking` 300 ms after the change stopped with no current result; markers set with `setModelMarkers(model, 'playground', …)` in the engine from `onCheck`. T046's unit test passes.
- [X] T066 [US1] Write `packages/web/src/apps/playground/Panes.tsx` and `packages/web/src/apps/playground/ErrorsPane.tsx` (contracts/playground.md, research R8): `div.pane-tabs` (`role="tablist"`, `aria-label` `Panes`, `data-req` FR-020 FR-064) with four `role="tab"` buttons in the design's order, counts in Errors and Logs (the Errors pill marked when there are errors), arrows moving between them; `.pane-javascript` and `.pane-declarations` (`data-req` FR-021 FR-023) holding `mountOutput` views or the none sentences; `.pane-errors` (`data-req` FR-016 FR-022) with an `ol` of `li > button.error` (`⊗ line:column message TS####`) that `reveal`s and focuses the editor, or the no-errors sentence; dimmed while `checking`. The open pane lives in the session. T050 passes.
- [X] T067 [US1] Write `packages/web/src/apps/playground/Toolbar.tsx` with `button.options` (`aria-pressed`) and `p.run-state` (empty until US2), and `packages/web/src/apps/playground/OptionsPanel.tsx` (`section.options-panel`, `aria-labelledby`, `data-req` FR-024 FR-025 FR-026): fieldsets with legends (Language, Strict checks, Other checks, Output), a `select` for `target`, a checkbox per flag with its name in `code` and its description as the control's description, `strict` setting its checks, `button.options-defaults`, the changed-options sentence; changes call `setOptions` at once. Focus moves to the panel's first control on open; Escape closes and returns to its button. The menu's Compiler options… opens it. T051 passes.
  - Done 2026-10-30. The Options button now opens the panel as the menu does, focusing its first control (it toggled the session only).
- [X] T068 [P] [US1] Write `packages/web/src/apps/playground/StatusBar.tsx`: `div.playground-status` (`data-req` FR-016 FR-062) with `Ln {line}, Col {column}`, `Spaces: 2`, `✓ No errors` / `⊗ {n} errors` / `Checking…`, the `Tab moves focus` chip when on, and `span.ts-version` (`data-req="008-typescript-playground-FR-012"`) reading `TypeScript {version}` from the loaded engine. T043 passes.
- [X] T069 [P] [US1] Write `packages/web/src/apps/playground/Message.tsx`: `div.playground-message` (`role="status"`, `data-req` FR-014 FR-019 FR-052 FR-053 FR-055 FR-056 FR-057) showing the session's one `Message` with its glyph and kind, its action buttons (`undo`, `run`, `share-with`, `copy-code`, `retry`) or the read-only link field, and `button.dismiss`; a new message replaces the shown one.
- [X] T070 [US1] Write `packages/web/src/apps/playground/kept.ts` after T049's unit test and wire it (research R15): read once when the Playground first mounts in a visit (Welcome with the defaults when nothing is kept), write 300 ms after a change of the code or an option and on the window's close and `pagehide`, never while Welcome is unchanged with the defaults; `no-storage` keeps the code in the session and shows `cantKeepCode` once; unknown kept options show `unknownOptions`. T049 passes.
- [X] T071 [US1] Write `packages/web/src/apps/playground/keys.ts` (data-model.md Editor command and key, research R12) and apply it in the engine: the `KeyCommand` table (with `vsCode` defaults and `differs` reasons) and the reserved table (browser and screen-reader keys, each with its source); keybinding rules removing `Ctrl+Shift+P` / `Cmd+Shift+P` from the palette, Run on `Ctrl+Enter` / `Cmd+Enter` calling `onCommand('playground.run')`, Format Document on `Shift+Alt+F`, accessibility help on `Alt+F1` calling `onCommand('playground.keys')` (R12: **Verify** Monaco has no `Alt+F1` action of its own; if it has, ours replaces it), Monaco's `Option+Escape` kept on a Mac. Add the Keys popup to `packages/web/src/apps/playground/Popups.tsx` (`section.playground-popup` `role="dialog"`, `aria-modal="false"`, `data-req` FR-083 FR-085, its lede saying how to leave the editor, move to errors and hear a type, the list generated from `keys.ts` with notes) and the menu's Command palette (`runCommand`) and Keys…. T055's unit test passes.
  - Done 2026-10-30. **Verify**: Monaco has no `Alt+F1` action of its own: `Alt+F1` opens the Keys popup and the palette lists one such command. Besides `Ctrl+Shift+P`, the engine's rules remove the three clashes T055 found. From `Alt+F1` the popup returns focus to the editor rather than the menu title, as the menu's rule is for the menu. `kept` is per system, so the note names `Shift+Cmd+P` on a Mac.
- [X] T072 [US1] Verify research R12 after T071, in Chromium, Firefox and WebKit through T055: `Ctrl+Shift+K` in Firefox, and `F12`, `Shift+F12`, `Alt+F12` in Chrome, Edge and Firefox on Windows and Linux keymaps, reach the editor with the page's `preventDefault`. **For any key a page can't take, change the design first**: add its replacement (R12's named fallback, e.g. `Ctrl+Shift+Alt+K`, `Ctrl+F12`) to design/wireframes.md's Keys table in a `docs:` commit, then to `keys.ts`. If FR-084 itself can't hold, stop and ask the owner to amend the spec first. Record each engine's result here.
  - Done 2026-10-30, through T055: on both key maps in Chromium 156, Firefox 1555 and WebKit 27.2, `Ctrl+Shift+K`, `F12`, `Shift+F12` and `Alt+F12` reach the editor and it calls `preventDefault`; no replacement needed, so FR-084 holds as written. Limit: Playwright delivers keys to the page and never runs the browser's own shortcut handling, so this doesn't prove a real browser hands them over: T170's by-hand keys in Chrome, Edge, Firefox and Safari do.
- [X] T073 [US1] Add Reset (FR-080) after T070: the menu's Reset… opens the reset popup in `Popups.tsx` (`section.playground-popup` `role="dialog"`, `data-req="008-typescript-playground-FR-080"`, focus on Reset, Escape and Cancel returning to the menu bar's title as 005's menu rule sets); confirming ends any run (US2), puts Welcome back with `replaceCode` and the default options, removes the kept key and shows `resetDone` with Undo. T052 passes.
- [X] T074 [US1] Show `cantKeepTypeScript` when the loader resolves with `kept: false` (FR-014). T044 passes.
- [X] T075 [US1] Write `packages/web/src/apps/playground/playground.css` from the mockup's `playground.css` (class names without `pg-`), `var(--token-…)` only: the 44 px toolbar, the message line, the editor and the 400 px side split by a hairline, the 28 px status bar, the loading state, popups and the scrim inside `section.playground` only, focus outlines as 005's. Import it as the Terminal's style sheet is.
- [X] T076 [US1] Keep the editor's state across unmounts (FR-005, research R2): `PlaygroundApp` saves `saveViewState()` into the session when its content unmounts (Show specs, minimizing does not unmount, shell switches) and passes it to `mountEditor` on mount; the open pane, panel and options come from the session. T056 passes.
- [ ] T077 [US1] Run US1's tests T038 to T058 and the existing suites: all pass but the menu-order assertions US2 to US4 add. `npm run typecheck` passes. Record any **Verify** outcome (R2's size: the `os` script's growth, here) in this task.
  - Run 2026-10-30 (`npx vitest run`, then the affected files again after fixes; `npm run site-check` passes, Lighthouse 97 to 100; `npm run typecheck`, `content-check` and `token-check` pass). Left open, as these stay red: `window.test.ts`'s menu case (`Keys…`, T071, BLOCKED behind T029); `probe.test.ts`'s memory case (FR-045, T025, BLOCKED on the owner); `npm run traceability` and 001's self-check rows (57 uncovered 008 IDs, as the rules expect until Phase 14); and `performance.test.ts`'s SC-001 case, which passes alone (10.4 s first open) but took 19.9 s with the rest of the suite sharing the machine.
  - Older suites changed for the third app (FR-001): 005's `apps.test.tsx`, `about.test.tsx`, `mobile.test.ts` (the home screen's Tab order and icons) and `design.test.ts` (its twelve-app fixture), 006's `open.test.ts` and `os-core/test/apps.test.ts` (the Terminal still follows the CV). 004's `site-text.test.ts` allows the design's `✓` and `⊗`, as 005 and 007 added theirs; 004's `tokens.test.ts` counts the tokens the editor theme reads in `theme-values.ts`; `fonts.test.ts` names the engine's icon font through its own rule (T063). `controller.ts` imports Welcome from `examples/welcome.ts`, so 007's walker and Rolldown agree on the `os` script's modules.

**Checkpoint**: User Story 1 works on its own: the Playground downloads, edits, checks and keeps
code, as the MVP.

---

## Phase 5: User Story 2 - Run code and read its logs (Priority: P2)

**Goal**: Run the code in a sandbox apart from the site, with logs, pending timers, the end of the
run, Stop, the stuck popup, uncaught errors, limits, crashes and the site's responsiveness.

**Independent Test**: at 1440 px wide, run code that logs, waits on a 2 s timer and logs again:
the logs, `1 timer left`, the end. Run an endless loop: the shell stays responsive, the popup
appears after 5 s inside the window, Keep waiting asks again 5 s later, Stop ends it. A 60 s
timer gives no popup. Code that reads the site's storage gets nothing.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T078 [P] [US2] Write `packages/web/test/playground/run.test.ts`, covers 008-typescript-playground-FR-032, 008-typescript-playground-FR-033 and 008-typescript-playground-FR-036: Run and `Ctrl+Enter` run the code, open Logs and empty it; Run during a run ends the first, then starts; code with 2 errors runs and logs "The code has 2 errors. Running the JavaScript anyway." first; with `noEmitOnError` and errors, the logs say nothing ran and why; a 2 s timer shows `Running · 1 timer left`, then `Finished in 2.0 s` and the tick; a never-settling promise with nothing pending ends the run.
  - Done 2026-10-30: 9 tests pass. Seconds show one decimal, or two under a tenth (`Finished in 0.02 s`, `2.4 s`), so a 2 s timer reads `Finished in 2.0 s` to `2.1 s`.
- [X] T079 [P] [US2] Write `packages/web/test/playground/logs.test.ts`, covers 008-typescript-playground-FR-034 and 008-typescript-playground-FR-047: each console level with its word and glyph; other methods as log lines; `console.clear`; strings, numbers, `null`, `undefined`, arrays, objects, nested, maps, sets, dates, errors, circular, functions, classes, deep and long values as the formats set; logging `<img src=x onerror=…>`, a link and a style string adds no element, link or style to the page. And `packages/web/test/playground/unit/format.test.ts`, covers 008-typescript-playground-FR-034 and 008-typescript-playground-FR-044: every `Shown` form; "depth 4, 100 items or entries per array, object, map or set, then `more`"; "10,000 characters per entry, counted over the formatted text"; circular parts as `circ`; functions and classes by name.
  - Done 2026-10-30: `logs.test.ts` (3) and `unit/format.test.ts` (8) pass. `console.clear` empties the page's first note too: the logs are empty, as FR-034 says.
- [X] T080 [P] [US2] Write `packages/web/test/playground/errors.test.ts`, covers 008-typescript-playground-FR-035: a throw at the top, in a timer and an unhandled rejection each log name, message and the TypeScript line (`button.log-line` moving the cursor there); other timers go on; the end says `Ended with 2 uncaught errors`. And `packages/web/test/playground/unit/source-map.test.ts`, covers 008-typescript-playground-FR-035: VLQ decoding of TypeScript's maps for a fixture; a generated position maps to its source line; "a position that maps to nothing gives no line, never a wrong one".
  - Done 2026-10-30: `errors.test.ts` (2) and `unit/source-map.test.ts` (3) pass.
- [X] T081 [P] [US2] Write `packages/web/test/playground/timers.test.ts`, covers 008-typescript-playground-FR-037: a 60 s timer waits with no popup and ends after it fires (Playwright's clock sped up; if the clock doesn't reach the sandboxed worker, the test runs the real 60 s with its timeout raised, recorded here); a `fetch` to `helpers/other-site.ts` answering slowly counts as pending and never as blocking.
  - Done 2026-10-30: Playwright's clock doesn't reach the sandboxed frame's worker, so the 60 s case waits the real 60 s (timeout 240 s). 2 tests pass.
- [X] T082 [P] [US2] Write `packages/web/test/playground/stop.test.ts`, covers 008-typescript-playground-FR-038 (and SC-003): Stop during an endless loop ends it within 1 s; during an interval cancels it; the code and logs stay, and the logs say `Stopped after [n] s`.
  - Done 2026-10-30: Stop under an endless loop ends it in some 30 ms. 2 tests pass.
- [X] T083 [P] [US2] Write `packages/web/test/playground/sandbox.test.ts` (three engines), covers 008-typescript-playground-FR-039 (and SC-006): the code reads nothing of `localStorage`, `indexedDB`, `caches`, cookies, `document`, `parent`, `top` and the page's `location`; `open()` and navigation fail; a value stored in a run is gone in the next; the site's storage and cookies are unchanged after the run.
  - Done 2026-10-30: 2 tests pass in Chromium; `npm run test:engines` runs it in Firefox and WebKit. Also `unit/runner-scripts.test.ts`: the frame's policy allows only its bootstrap, by hash, and the build fails when they differ.
- [X] T084 [P] [US2] Write `packages/web/test/playground/responsive.test.ts`, covers 008-typescript-playground-FR-040 (and SC-005): during an endless loop, a printing loop and a memory-growing loop, a click on the dock, a key in the editor and Stop each respond within 100 ms.
  - Done 2026-10-30: 3 tests pass. The memory loop grows to some 200 MB and stays there, so it never exhausts the page (FR-045's case is T089's, BLOCKED). The dock click is on the Playground's own item: once the CV window comes in front, the Playground's editor can't be clicked.
- [X] T085 [P] [US2] Write `packages/web/test/playground/network.test.ts`, covers 008-typescript-playground-FR-041: `fetch` to `helpers/other-site.ts` arrives with `Origin: null` and no `Cookie` while the site holds a cookie, and the code logs the reply; offline it fails and the code logs the error.
  - Done 2026-10-30: Playwright's offline switch doesn't reach the sandboxed frame's worker, so the offline case cuts the network where the request goes (the other site down) as well as switching the page offline. 2 tests pass.
- [X] T086 [P] [US2] Write `packages/web/test/playground/packages.test.ts`, covers 008-typescript-playground-FR-042: `import _ from "lodash"`, `require("x")`, `import("https://…")` and `export * from "x"` are marked with the packages message; Run logs it and runs nothing (no runner frame); the request log has no request; quick fixes offer no import.
  - Done 2026-10-30: 1 test passes; that quick fixes offer no import is `quick-fixes.test.ts` (FR-082).
- [X] T087 [P] [US2] Write `packages/web/test/playground/dialogs.test.ts`, covers 008-typescript-playground-FR-043: `alert("hi")` logs an alert entry and the code goes on; `prompt` and `confirm` log their notes and return `null` and `false`.
  - Done 2026-10-30: 1 test passes.
- [X] T088 [P] [US2] Write `packages/web/test/playground/limits.test.ts`, covers 008-typescript-playground-FR-044: 5,000 lines keep the latest 1,000 and `p.logs-dropped` says how many were dropped; a 3 MB string is cut at 10,000 characters with the note; the editor responds within 100 ms meanwhile. And `packages/web/test/playground/unit/logbook.test.ts`, covers 008-typescript-playground-FR-044 and 008-typescript-playground-FR-064: "at most 1,000, oldest first"; `dropped` sums the runner's and the page's; `newSinceAnnounce` counts for the summary; `console.clear` empties it.
  - Done 2026-10-30: `limits.test.ts` (2) and `unit/logbook.test.ts` (4) pass.
- [X] T089 [P] [US2] Write `packages/web/test/playground/memory.test.ts` (three engines, research R24 **Verify**, T025), covers 008-typescript-playground-FR-045 as amended 2026-10-30: code that grows memory until it fails either ends the run with the out-of-memory or stopped-unexpectedly note, the page still working and the next run logging; or the browser crashes the page (Playwright's `crash` event), which the amended FR-045 allows. A run that stops unexpectedly with the page alive (the worker's error, not memory) always gets the note and a working next run.
  - Done 2026-10-30: passes in all three. Chromium's page crashes (the `crash` event); Firefox and WebKit reach the 6 GB cap and the next run works. The unexpected stop is a worker whose script doesn't parse. A run that calls `self.close()` isn't told from a loop (its heartbeat is lost, so it reads as blocked and the stuck popup offers Stop): not changed.
- [X] T090 [P] [US2] Write `packages/web/test/playground/lifecycle.test.ts`, covers 008-typescript-playground-FR-046: closing the window during an interval removes the runner frame and nothing logs after reopening; a reload ends it; minimizing doesn't.
  - Done 2026-10-30: 3 tests pass.
- [X] T091 [P] [US2] Write `packages/web/test/playground/stuck.test.ts`, covers 008-typescript-playground-FR-048, 008-typescript-playground-FR-049, 008-typescript-playground-FR-050 and 008-typescript-playground-FR-051 (and SC-004): an endless loop shows the popup between 5 and 6 s with the site text, Stop and Keep waiting; a microtask chain that never yields does too; a 60 s timer and a pending request never do; Keep waiting closes it and it returns 5 s later; a loop that ends after 7 s closes it by itself with the announcement; Stop ends the run; the popup's box is inside the window and the CV window, dock and menu bar are uncovered and take clicks; due while the CV window is focused, it neither brings the window to the front nor takes focus; while minimized or showing specs it waits, then shows; it is an `alertdialog` named by its heading; focus moves to Stop when focus was in the window; Escape keeps waiting and returns focus; `Alt+Shift+M` reaches the menu bar meanwhile.
  - Done 2026-10-30: 10 tests pass; the popup comes between 5 and 6 s after the run starts (SC-004).
- [X] T092 [US2] Extend `packages/web/test/playground/specs.test.ts` (covers 008-typescript-playground-FR-005: with logs, Show specs and Back keep them, and a run's timer keeps counting while the spec view shows, its `iframe.playground-runner` the same element before and after and never inside `section.playground`), `packages/web/test/playground/window.test.ts` (covers 008-typescript-playground-FR-003: the menu adds Run with `Cmd+Enter`/`Ctrl+Enter` and Stop, disabled with no run) and `packages/web/test/playground/reset.test.ts` (covers 008-typescript-playground-FR-080: Reset during an interval stops it).
  - Done 2026-10-30: `specs.test.ts`, `reset.test.ts` and `window.test.ts`'s new case pass; `window.test.ts`'s menu-order case stays red only on `Keys…` (T071, BLOCKED behind T029).
- [X] T177 [US2] Enforce FR-041 as amended 2026-10-30 in `packages/web/src/apps/playground/engine/runner/runtime.ts`: wrap `fetch` so every request goes with `credentials: 'omit'` (a `Request` input too), make `XMLHttpRequest`'s `withCredentials` always false, and construct `EventSource` without credentials, all captured in the runtime's closure before the code runs, so the code can't restore the originals. Extend `packages/web/test/playground/network.test.ts` (and its three-engine run in T024's list): with the site holding a cookie, `fetch(…, { credentials: 'include' })`, `new Request(…, { credentials: 'include' })`, XHR with `withCredentials = true` and `EventSource(…, { withCredentials: true })` to another port on the site's host arrive with no `Cookie`, in Chromium, Firefox and WebKit. Update `contracts/runner.md` (What the runtime gives the code) and research R17 to match, in a `docs(008):` commit.
  - Done 2026-10-30. The first test passes in all three, and `network` joins `npm run test:engines`. The wrappers also stop the code going round them: `delete self.fetch`, the prototypes' `fetch`, and the original `EventSource` by `constructor`. Docs in `docs(008)`. Found on the way and fixed under FR-037: the browser's own promises weren't pending, so `await new Blob(…).text()` ended the run before it settled, in every engine; `countCalls` in `runtime.ts` now counts them (`timers.test.ts`), which also turned `sandbox.test.ts` green in WebKit. `setCode` for Firefox and WebKit now sends a paste event, as inserted text came in twice in Firefox.
- [X] T178 [US2] Bring `specs/008-typescript-playground/research.md` R24, `contracts/runner.md` and plan.md's notes on FR-045 in line with the amendment of 2026-10-30 (the page may crash when the browser ends it), in a `docs(008):` commit.
  - Done 2026-10-30 in `docs(008)`.

### Implementation for User Story 2

- [X] T173 [US2] Bring the contracts in line with plan.md's runner placement before T099, in a `docs(008):` commit: in `specs/008-typescript-playground/contracts/playground.md`'s structure, move `iframe.playground-runner` out of `section.playground` into a hidden host appended once to `document.body` (one frame per run, never moved, removed by Stop, a new run, the window's close and `pagehide`); in `research.md` R17, replace "hidden inside the Playground's window" with the same rule and its reason: removing or moving a frame ends its worker, and the content unmounts for Show specs and shell switches (FR-005, FR-061). Nothing else changes.
- [X] T093 [US2] Add `getRunnable(fileName)` to `packages/web/src/apps/playground/engine/ts.worker.ts` (research R13): emit through the program with an `after` transformer removing `export` modifiers and `export {}`, returning the script body, its source map and the current imports.
  - `getRunnable` was written with T064; it now also says when TypeScript gave no JavaScript (`skipped`).
- [X] T094 [P] [US2] Write `packages/web/src/apps/playground/engine/runner/format.ts` (data-model.md Log book `Shown`, research R18): the formatter with depth 4, 100 items then `more`, 10,000 characters per entry, circular parts, functions and classes by name. T079's unit test passes.
  - Done: the limits live in `limits.ts`, read by the runner and the page.
- [X] T095 [P] [US2] Write `packages/web/src/apps/playground/logbook.ts` (data-model.md Log book): the page's `LogBook` with "at most 1,000, oldest first", `dropped` and `newSinceAnnounce`. T088's unit test passes.
  - Done: `logbook.ts` was written in Phase 2; `LOG_LIMIT` now reads `limits.ts`.
- [X] T096 [P] [US2] Write `packages/web/src/apps/playground/engine/source-map.ts` (research R13): a VLQ decoder of some 60 lines and `mapLine(map, line, column)`. T080's unit test passes.
- [X] T097 [US2] Write `packages/web/src/apps/playground/engine/runner/runtime.ts` (research R18, contracts/runner.md What the runtime gives the code): capture `postMessage`, the port and the nonce in a closure; replace `console` with batched entries (at once if 50 ms have passed, else on the next task; the latest 1,000 between sends, the rest counted as dropped); `alert`, `prompt` (`null`) and `confirm` (`false`); wrap `setTimeout`, `setInterval`, `clear*`, `requestAnimationFrame`, `fetch`, `XMLHttpRequest`, `WebSocket` and `EventSource` to count pending work; no `Worker` or `SharedWorker`; report `error` and `unhandledrejection` with name, message and position; answer pings at once; run the code wrapped as `(async () => {\n<code>\n})()` after setting `globalThis.cv`; detect the end through a private `MessageChannel` task when nothing is pending.
  - Done: a `fetch` response's body read counts as a request too, so `await (await fetch(…)).text()` keeps the run going. `requestAnimationFrame` uses a 16 ms timer where a worker has none.
- [X] T098 [US2] Write `packages/web/src/apps/playground/engine/runner/bootstrap.ts` and its build (research R17, contracts/runner.md The frame): the bootstrap makes the classic `Worker` from a `Blob` of runtime plus code, hands it the port, revokes the URL after the worker's first message, and terminates it on `stop`; `build-site.ts` bundles the bootstrap and the runtime to script text before the engine build, computes the bootstrap's `sha256`, writes the policy `default-src 'none'; script-src 'sha256-<bootstrap>'; worker-src blob:; connect-src *`, and fails with `site build failed: …` if the policy and the script differ.
  - Done: `scripts/runner-scripts.ts` bundles both to text with Vite's library build and serves them, with the policy, as `virtual:playground-runner`; `build-site.ts` runs it before the engine build.
- [X] T099 [US2] Write `packages/web/src/apps/playground/engine/runner/host.ts` and `engine.run` (contracts/runner.md, research R19, R24): `run` asks `getRunnable`; with imports or no JavaScript it ends at once with `nothing-ran` and no frame; else it stops any run going, makes a hidden `iframe.playground-runner` with `sandbox="allow-scripts"` and the `srcdoc` in the runner's own hidden host on `document.body` (T173), never inside `section.playground` and never moved, so the run outlives the content's unmounting (FR-005, FR-061), sends `{ start, nonce, source, port }`, then `{ run, nonce, cv }` with a structured clone of `resume` (R10); pings every 250 ms and reports `onBlocked(since)` from the oldest unanswered ping, restarting while `document.hidden`; ignores messages without the nonce; maps uncaught positions through `source-map.ts` minus the prelude's lines; `stop()` (idempotent) posts `stop`, removes the frame and ends `stopped`; a worker `error` with no message, a blank `load` of the frame, or lost heartbeats while the bootstrap answers end `crashed` with the out-of-memory reason when the error says so.
  - Done, one change: the crash rule "lost heartbeats while the bootstrap answers" isn't used, since an endless loop looks the same and must give the stuck popup; a worker's `error` reaching the frame, or the frame's document loading again, ends the run `crashed`. contracts/runner.md updated for the events: `onStarted` carries the code's error count (FR-033), a log batch can say `cleared`, and the bootstrap reports `died`.
- [X] T100 [US2] Add the run to `packages/web/src/apps/playground/session.ts` (data-model.md Run, its State transitions table and the stuck transitions): `starting → running ⇄ waiting → ended` with `finished`, `errors`, `stopped`, `crashed` or `nothing-ran` and `ms`; the errors note first (FR-033); `stuck` `no → due → shown → kept-waiting → due`, `shown` only while the window is on screen, not minimized and not showing its specs, and `askAgainAt` 5 s after Keep waiting; any answer or the end returns to `no`.
  - Done in `running.ts`: the run, its notes and the stuck transitions, looked at every 100 ms; the popup shows once the window is on screen (not minimized, not showing specs).
- [X] T101 [US2] Add Run and Stop to `Toolbar.tsx` and the menu (`button.run` with `aria-keyshortcuts` and `data-req` FR-032 FR-033 FR-083, `button.stop` `aria-disabled` with no run and `data-req="008-typescript-playground-FR-038"`, `p.run-state` with `data-req` FR-036 FR-066 showing `Running · {n} timer left · {s} s`, `Finished in {s} s` and the other outcomes with the design's glyphs); Run opens Logs and empties it; `onCommand('playground.run')` runs; the menu's Run shows `Cmd+Enter`/`Ctrl+Enter` and Stop is disabled with no run. Reset (T073) now ends a run first.
  - Done. `AppMenuItem.shortcut` may be a function, asked when the menu shows, so Run shows `Cmd+Enter` or `Ctrl+Enter` (read from `keys.ts`).
- [X] T102 [US2] Write `packages/web/src/apps/playground/LogsPane.tsx` (`.pane-logs`, `data-req` FR-034 FR-035 FR-043 FR-044 FR-047): `p.logs-dropped`; `ol.logs` of `li.log[data-level]` with `span.level` (word and glyph), the `Shown` values rendered as React text only, the cut note, and `button.log-line` (`line {n}`) that reveals and focuses the editor.
- [X] T103 [US2] Add the stuck popup to `Popups.tsx` (`div.playground-scrim` and `section.playground-popup` `role="alertdialog"` `aria-modal="false"` named by its heading, `data-req` FR-048 FR-049 FR-050 FR-051) inside `section.playground` only: Stop and Keep waiting; focus to Stop only when focus was in the window, Escape keeps waiting and returns focus where it was; it never raises the window or takes focus from another; closing by itself when the code pauses or the run ends.
- [X] T104 [US2] End runs with the window and the page (FR-046): the app's `onClose` stops any run, empties the logs, closes popups and panels and clears the message; `pagehide` stops the run; minimizing doesn't. T078 to T092 pass.
  - Done 2026-10-30: T078 to T092 pass but T089 (BLOCKED) and the menu-order case (`Keys…`).

**Checkpoint**: User Stories 1 and 2 work: code runs apart from the site, and every way a run can
end is shown.

---

## Phase 6: User Story 3 - Try the examples, including the CV as typed data (Priority: P3)

**Goal**: Eleven examples, grouped by topic, three reading `cv`, whose type comes from 002's
shape and whose value is the built CV document.

**Independent Test**: at 1440 px wide, open each example: no errors with the default options, and
running gives what its description says; the CV examples' logs match `resume.json`, and a changed
CV fact in a repository copy changes their output after its build.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T105 [P] [US3] Write `packages/web/test/playground/unit/examples.test.ts`, covers 008-typescript-playground-FR-028: `EXAMPLES` holds Welcome (`start`), Basic types, Narrowing, Generics (`types`), Timers and promises, An interval, Catching errors, An endless loop (`running`), and Projects newest first, Skills at a glance, Find a skill (`cv`), each with a title, a description and `runs` as research R20 sets; the three CV examples read `cv`; ids are unique.
  - Done 2026-10-30: 3 tests pass.
- [X] T106 [P] [US3] Write `packages/web/test/playground/examples.test.ts`, covers 008-typescript-playground-FR-027 and 008-typescript-playground-FR-030 (and SC-008, SC-014): the panel lists every example by group with title and description; choosing one replaces the code, sets its options, shows `exampleReplaced`, and Undo brings the code back; every example shows no diagnostics with the defaults and the current CV, and every `to-end` one finishes with no uncaught error; from a fresh open, Examples, an example and Run are three actions.
- [X] T107 [P] [US3] Write `packages/web/test/playground/cv.test.ts`, covers 008-typescript-playground-FR-029: `cv` needs no import; hovering `cv.projects` shows `ResumeProject[] | undefined`; `cv.nope` is an error; a run logging `JSON.stringify(cv)` equals `resume.json`; the three CV examples' logs equal values computed in the test from `resume.json` (never typed by hand); `"cobol"` isn't in the CV document; a run that changes `cv` leaves the next run's `cv` unchanged.
- [X] T108 [P] [US3] Extend `packages/web/test/site-text.test.ts`, covers 008-typescript-playground-FR-001 and 008-typescript-playground-FR-031: `siteText.os.views.playground` and the `playground` group are English with no CV fact; every example's title, description and comment, read from the example files, is English and holds no CV fact (comments extracted with the repository's TypeScript parser); and extend 005's `packages/web/test/shell/site-text.test.ts`'s group list with `playground` if it reads groups by name. Confirm `npm run content-check` reads `src/apps/playground/examples/` as site files.
  - Done 2026-10-30: two describes in `site-text.test.ts` (comments read with `oxc-parser`, the content check's `searchFiles` reads all 13 files); 005's group list holds `playground`. `npm run content-check` passes.

### Implementation for User Story 3

- [X] T109 [P] [US3] Write `packages/web/src/apps/playground/examples/{basic-types,narrowing,generics}.ts` with research R20's code, titles and descriptions as the design's Examples table sets (group `types`, `runs: 'to-end'`).
- [X] T110 [P] [US3] Write `packages/web/src/apps/playground/examples/{timers-and-promises,an-interval,catching-errors,an-endless-loop}.ts` with research R20's code (group `running`; `to-end`, `interval`, `to-end`, `endless`).
- [X] T111 [P] [US3] Write `packages/web/src/apps/playground/examples/{projects-newest-first,skills-at-a-glance,find-a-skill}.ts` with research R20's code (group `cv`, `to-end`), reading only `cv`, with no CV fact.
- [X] T112 [US3] List the eleven in `packages/web/src/apps/playground/examples/index.ts` in the design's order. T105 passes.
  - Done: `examples(mac)` lists the eleven; T105 passes.
- [X] T113 [US3] Write `packages/web/src/apps/playground/ExamplesPanel.tsx` and the Examples control: `button.examples` in the toolbar (`aria-expanded`, `aria-controls`) and the menu's Examples…; `section.examples-panel` (`aria-labelledby`, `data-req` FR-027 FR-028 FR-031 on the panel and the button) with a `ul` per group under its heading, each example a `button` with title and description, the current one `aria-current="true"`, and the design's note; choosing calls `replaceCode` and `setOptions`, sets `example`, and shows `exampleReplaced` with Undo; focus and Escape as the options panel's. Extend T040's menu test with Examples…. T106 and T107 pass.
  - Done 2026-10-30: `ExamplesPanel.tsx`, `button.examples`, the menu's `Examples…` and `chooseExample`; T106 and T107 pass; T040's menu test lists `Examples…` (that case stays red only for `Keys…`, T071, blocked on T029).

**Checkpoint**: User Stories 1 to 3 work: every example checks and runs, and the CV examples
follow the CV document.

---

## Phase 7: User Story 4 - Share code as a link (Priority: P4)

**Goal**: Share makes a `#playground=` link carrying the code and changed options; opening one
shows the code in front of the CV window and never runs it; broken and too-long links are handled.

**Independent Test**: at 1440 px wide, write code, change an option, share, open the link in a
new profile: the same code and options, the note, no run. A cut-off and an altered link show the
broken-link message; code too long for a link offers to copy the code instead.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T114 [P] [US4] Write `packages/web/test/playground/unit/share.test.ts`, covers 008-typescript-playground-FR-052, 008-typescript-playground-FR-055 and 008-typescript-playground-FR-056 (contracts/share-link.md): round trips of every example, with and without options, give identical code and options (SC-007); the payload is `{"c":…,"o":…}` in that key order and the table's option order, deflate-raw, base64url without padding; the check is the first 11 base64url characters of SHA-256 over the payload's ASCII; the full link is at most 8,000 characters and one character over makes no link; `readLink` gives `none`, `app`, `code` (with `unknown` options left out) and `broken` for a cut-off, an altered, a garbled payload, a wrong format, a bad check, non-JSON, a non-string `c` and a non-object `o`; it stops inflating at 1 MiB and calls the link broken; it never throws.
  - Done 2026-10-30: 11 tests pass (links checked against `node:zlib` and `node:crypto`; the 8,000 limit tested by growing the origin one character at a time).
- [X] T115 [P] [US4] Write `packages/web/test/playground/share.test.ts`, covers 008-typescript-playground-FR-026, 008-typescript-playground-FR-052, 008-typescript-playground-FR-053, 008-typescript-playground-FR-054, 008-typescript-playground-FR-055, 008-typescript-playground-FR-056 and 008-typescript-playground-FR-057: Share copies a link holding the code and changed options and says so, announced; `Share with…` shows only with `navigator.share` (stubbed) and passes `{ url }`; with the clipboard refused, the link shows selected in a read-only field; opening a link in a fresh profile at 1440 opens the CV window and the Playground in front, focused, with the code, options and `sharedOpened`; no runner frame exists and the logs are empty after 10 s; the address is `/` after; a reload shows the code with edits; sharing makes no request and the server log holds no fragment; a link opens offline with the engine stored; code over 8,000 characters shows `tooLong` with the length and Copy the code, and no link is made; a cut-off, an altered and a garbled link open Welcome with `brokenLink` and run nothing, leaving kept code untouched; a link with an unknown option opens without it and names it; a link opened over kept code replaces it with `sharedReplaced`, and Undo brings the kept code back. Extend T040's menu test with Share….
  - Done 2026-10-30: 12 tests pass in Chromium; T040's menu test lists `Share…`. Links are built in the test with `node:zlib` from the page's own origin (each `serveBuilt()` is a new server).

### Implementation for User Story 4

- [X] T116 [US4] Write `packages/web/src/apps/playground/share.ts` after T114 (contracts/share-link.md): `makeLink(origin, code, options)` (`{ link } | { tooLong: length }`) with `CompressionStream('deflate-raw')`, base64url and `crypto.subtle.digest`; `readLink(href)` with `DecompressionStream`, the 1 MiB stop and `readOptions`, never throwing and never running anything. T114 passes.
  - Done 2026-10-30: `makeLink` and `readLink` are async (the streams and `crypto.subtle`); `holdsLink` tells at once whether the address holds a link.
- [X] T117 [US4] Add Share (FR-052, FR-055): `button.share` in the toolbar (`data-req` FR-052 FR-055) and the menu's Share…: make the link from the session's code and options; copy with `navigator.clipboard.writeText` and show `linkCopied` with `share-with` where `navigator.share` exists and `canShare({ url })` is true; when the clipboard rejects or is missing, show `linkField` with the link in a read-only field, selected; when too long, show `tooLong` with the length and `copy-code`, which copies the code.
  - Done 2026-10-30: `shareCode`, `shareWith` and `copyCode` in `controller.ts`; the message's actions and its selected link field in `Message.tsx`. `sharedOpened` has Run only; `sharedReplaced` Undo and Run (wireframes).
- [X] T118 [US4] Read the link on hydration (contracts/shell.md Opening from a link): `packages/web/src/os/Os.tsx` calls `readLink` before the first render of the windows; for `app`, `code` and `broken`, after `hydrated` it dispatches `open` for `playground` on desktop (the CV window opens as on first load and the Playground in front) or `mobileOpen` on mobile, and puts the result in the Playground session's `pendingLink`. With no fragment nothing changes (FR-002).
  - Done 2026-10-30: in `Os.tsx`'s ready effect, `holdsLink` opens the Playground at once and `readLink(href).then(receiveLink)` fills `pendingLink`. Since T124 the desktop alone decodes it: `readAddressLink` runs once a visit, from `Os.tsx` on a desktop load and from the desktop content's mount.
- [X] T119 [US4] Open a pending link once the editor is ready (contracts/share-link.md Opening a link): `code` replaces the editor's code as one undoable edit, sets the options, shows `sharedOpened` (and `sharedReplaced` when the visitor had code) with Undo and Run, then `unknownOptions` if any; `broken` shows Welcome with the defaults and `brokenLink` without touching kept code; then `history.replaceState(history.state, '', '/')`; the code is kept as any code is. No code path from here reaches `engine.run`. T115 passes.
  - Done 2026-10-30: `openPendingLink` in `controller.ts`, called when the engine is ready and when the link arrives; `unknownOptions` follows once `sharedOpened` is dismissed.

**Checkpoint**: User Stories 1 to 4 work: links carry code and options, open without running, and
fail safely.

---

## Phase 8: User Story 5 - Open the Playground on a phone (Priority: P5)

**Goal**: The mobile shell's "best on desktop" screen, from the icon and from a shared link, with
Share link and Copy link; nothing is lost when the shell switches.

**Independent Test**: at 375 px wide, tap the Playground icon: the screen, its text, sharing and
copying give a link that opens the Playground at a desktop width. A shared link at 375 shows the
link screen, runs nothing, downloads nothing, and shares the link unchanged.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T120 [P] [US5] Write `packages/web/test/playground/mobile.test.ts`, covers 008-typescript-playground-FR-058, 008-typescript-playground-FR-059 and 008-typescript-playground-FR-060: at 375 the icon opens the screen full screen with the design's text, Share link and Copy link; with `navigator.share` stubbed it is called with the link; without it the link is copied and `Link copied.` announced; no editor, no request under `/playground/` and no runner frame; the shared link opens the Playground at 1440; after a shell switch from desktop with code, it carries that code; from a shared link it is that link unchanged; a link opened at 375 shows "This link holds TypeScript code", no code, no run, no request under `/playground/`.
  - Done 2026-10-30: 6 tests pass.
- [X] T121 [P] [US5] Write `packages/web/test/playground/shell-switch.test.ts`, covers 008-typescript-playground-FR-061: with code, an option, the Logs pane, logs and an interval running, 1440 → 375 → 1440 keeps all, the interval's count goes on, and its `iframe.playground-runner` is the same element throughout; a link read at 375 and not yet opened opens when widened.
  - Done 2026-10-30: 2 tests pass.
- [X] T122 [US5] Extend `packages/web/test/playground/specs.test.ts`, covers 008-typescript-playground-FR-005: at 375, Show specs from the mobile screen and Back restore it.
  - Done 2026-10-30: the 375 case passes with the file's other cases.

- [X] T179 [US5] Extend `packages/web/test/playground/mobile.test.ts` for FR-059 as amended 2026-10-30 (covers 008-typescript-playground-FR-059): with no code to carry, the screen's link opens the Playground at 1440 as its dock item does, with the code a recipient's browser keeps, and with Welcome in a fresh profile. Then mark the analysis's C2 settled in this task.
  - Done 2026-10-30: passes. C2 of the analysis is settled by FR-059's amendment and this test.

### Implementation for User Story 5

- [X] T123 [US5] Complete `packages/web/src/apps/playground/BestOnDesktop.tsx` (contracts/playground.md Mobile): `section.playground-mobile` (`aria-labelledby` its `h2`, `data-req` FR-058 FR-059 FR-060) with the icon, the heading and paragraph for the icon or the shared link, `button.share-link` and `button.copy-link` (`data-req` FR-058 FR-059 FR-060), and `p.playground-mobile-note` (`role="status"`); styles in `playground.css` for 375, 320 and landscape (icon left, buttons side by side), buttons full width and 44 px tall, tokens only.
  - Done 2026-10-30: `div.playground-mobile-card` holds the parts, as the mockup's `pg-phone-card`; landscape uses `@media (orientation: landscape)` as `terminal/pocket.css` does (no token names it).
- [X] T124 [US5] Choose the link the screen passes on (FR-059, contracts/share-link.md Mobile): from a shared link, its `href` unchanged (the address keeps the fragment, the code isn't decoded beyond the check); with the visitor's code in the session, `makeLink` as Share does (falling back to `copy-code`'s rule when too long); otherwise `#playground`. Share link calls `navigator.share({ url })` where it exists, else copies and says so; Copy link copies and says so. The engine is never loaded on mobile. T120 passes.
  - Done 2026-10-30: `phoneLink` in `controller.ts`; the screen reads the address with `holdsCode` and never decodes it. Kept code from an earlier visit counts as the visitor's code. When too long, both buttons copy the code and the note says `Code copied.`.
- [X] T125 [US5] Keep everything across shell switches (FR-061): `PlaygroundApp` on mobile leaves the session, the engine and any run as they are (the runner's frame is outside the content, T099, so unmounting `section.playground` doesn't end it); a pending link read on mobile opens as on desktop after widening (T119); the editor remounts with its view state (T076). T121 and T122 pass.
  - Done 2026-10-30: no change needed beyond `readAddressLink`, which the desktop content calls on mount, so a link read on the phone opens after widening.

**Checkpoint**: User Stories 1 to 5 work: phones get the screen, and the shell can switch at any
time.

---

## Phase 9: The amendment of 006 (FR-087)

**Goal**: The Terminal's `open` accepts `playground` (006 FR-008, FR-014), and `help` lists it.
006's spec already records the amendment (the 2026-10-29 session). It draws no new state, but it
changes one row of 006's approved Site text (`open` with another name, `open takes cv or about.`)
and overturns 006's T027 case for that reply, so the design row and its sign-off come first
(Constitution II), and the overturned task is marked superseded (Constitution XI). No 006 export
shows the row, so no PNG changes.

**Independent Test**: in the Terminal, `open playground` opens the Playground on desktop, or brings
it to the front, and the "best on desktop" screen on mobile; `open x` lists `cv`, `playground` and
`about`; `help` shows the amended row.

- [X] T174 Update 006's design text before any code of this phase (Constitution II): in `specs/006-terminal/design/wireframes.md`'s Site text table, the `open` with another name row reads as 006's amended FR-014 sets (listing `cv`, `playground` and `about`, each as a control), with a dated note naming 008 FR-087 and 006 FR-014; the same row in `specs/006-terminal/contracts/commands.md` Replies. Confirm no export in `specs/006-terminal/design/exports/` shows the row or `help`'s `open <name>` row (`desktop-2-after-help-1440.png` and `phone-2-after-help-375.png` stop above it); if one does, stop and ask the owner, as it needs a Penpot change. Commit as `docs(006): list playground in open's reply (008)`.
  - Done 2026-10-30 in `2a548c0`: the Site text row, the wireframe's `help` row (`Open cv, playground or about in the shell`, wrapped) and contracts/commands.md's `open` rows. Neither `desktop-2-after-help-1440.png` nor `phone-2-after-help-375.png` reaches the `open` row (checked by eye), so no Penpot change.
- [X] T175 Owner action: the owner reviews T174 and adds a dated sign-off line for the amendment to `specs/006-terminal/design/review.md`, naming 008 FR-087 and T174's commit. T129 doesn't start before it (Constitution II). Record the date and commit here.
  - Done 2026-10-30: the owner approved `2a548c0`; the sign-off is in `specs/006-terminal/design/review.md`. T129 and T130 can go ahead.
- [X] T176 Mark 006's overturned task in `specs/006-terminal/tasks.md` (Constitution XI): T027's `open settings gives open takes cv or about.` case, with a dated line `Superseded 2026-10-29 by 008-typescript-playground FR-087: open also accepts playground`, leaving its checkbox and text as they were. Check 006's other tasks for any case the amendment overturns (`help`'s `open <name>` row text included) and mark each the same way; record which here.
  - Done 2026-10-30: T027's FR-014 case marked. No other 006 task is overturned: T038 (`open cv`, `open about`) still holds, and no task fixes `help`'s `open` row text.
- [X] T126 [P] Extend `packages/web/test/terminal/engine/commands.test.ts` (fast), covers 006-terminal-FR-008, 006-terminal-FR-014 and 008-typescript-playground-FR-087: `help` lists `open <name>` with the amended text; `open playground` asks the OS to open `playground`; `open x` replies listing `cv`, `playground` and `about`.
  - Done 2026-10-30 (written, red until T129): three cases in a `008-typescript-playground-FR-087` describe; 006's `open settings` case moved there with the new reply (006 T027 superseded). Each fails only on the old wording or the missing `playground`.
- [X] T127 [P] Extend `packages/web/test/terminal/open-command.test.ts`, covers 006-terminal-FR-014 and 008-typescript-playground-FR-087: on the real build at 1440, `open playground` opens the Playground in front, focused, and again brings it to the front; at 375 it shows the "best on desktop" screen full screen.
  - Done 2026-10-30 (written, red until T129): the 1440 and 375 cases.
- [X] T128 [P] Extend `tools/site-check/test/terminal.test.ts`, covers 008-typescript-playground-FR-087: the terminal part runs `open playground` in both shells, and a copy whose `open` rejects `playground` fails, naming the step.
  - Done 2026-10-30 (written, red until T130): the real-build results list gains `open-playground` after `files` in each shell; the broken copy expects `open-failed open playground: the Playground didn't open` per shell. T130 must report it that way.
- [X] T129 Add `playground` to `open` in `packages/web/src/apps/terminal/engine/commands.ts` after T175 (contracts/shell.md The amendment of 006): `os.open('playground')`; the unknown-name reply lists `cv`, `playground` and `about`; `help`'s row reads as 006's amended FR-008 sets, from site text. T126 and T127 pass.
  - Done 2026-10-30: T126 and T127 pass.
- [X] T130 Add `open playground` to `tools/site-check/src/parts/terminal.ts` in both shells. T128 passes.
  - Done 2026-10-30: T128 passes.

**Checkpoint**: The Terminal opens the Playground on both shells.

---

## Phase 10: User Story 6 - Use the Playground with a keyboard or a screen reader (Priority: P6)

**Goal**: Every action by keys alone with visible focus; Tab can leave the editor; the editor is
named and readable; errors, types and suggestions are heard; the panes, the download, runs and
logs are announced without moving focus; targets are large enough.

**Independent Test**: at 1440 px wide, with the keyboard alone: open, type, find and read an
error, read a type, choose a suggestion, leave the editor, switch panes, change an option, choose
an example, run, handle the popup, stop, share and close, with a visible indicator and the
expected focus at each step.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T131 [P] [US6] Write `packages/web/test/playground/keyboard.test.ts`, covers 008-typescript-playground-FR-062: every action of FR-062's list by keys alone with a visible focus indicator; Tab indents in the editor; `Ctrl+M` (`Ctrl+Shift+M` on a faked Mac) then Tab leaves the editor, and the editor's description names the key; `Alt+Shift+M`, `D`, `N` and `W` work from the editor and type nothing; Show specs is reachable.
  - Done 2026-10-30: 4 tests pass. A faked system fakes the user agent too (Monaco reads its keys from it) and types code rather than pasting. Found and fixed: the status bar's chip never showed (Monaco's option event doesn't report the mode; the engine now listens to `TabFocus`), and the Terminal's unscoped `.run` margin pushed `button.run` off centre, clipping its focus ring.
- [X] T132 [P] [US6] Write `packages/web/test/playground/screen-reader.test.ts`, covers 008-typescript-playground-FR-063: the editor's input is named `Code editor` with the description; Monaco's screen-reader mode is on; F8 moves to the next error and its message is in a live region; `Ctrl+K Ctrl+I` text is in a live region; suggestions are an `aria-activedescendant` list.
  - Done 2026-10-30: 4 tests pass. Difference from this task's wording: `Ctrl+K Ctrl+I` doesn't put the type in a live region; Monaco moves focus into the hover (`role="tooltip"`, focusable), which is how a screen reader reads it, and Escape gives focus back. The test checks that. F8's message is in Monaco's `role="alert"` region.
- [X] T133 [P] [US6] Write `packages/web/test/playground/announce.test.ts`, covers 008-typescript-playground-FR-064, 008-typescript-playground-FR-065 and 008-typescript-playground-FR-066: the panes are a named tab list; the error count is announced once after a pause, not per key; 200 log lines in a second give at most two summed announcements; the download's start, 25%, 50%, 75%, end and a failure are announced with focus unmoved; a run's start, its timer count changes (at most once a second with 100 timers) and its end are announced with focus unmoved; every message is announced.
  - Done 2026-10-30: 8 tests pass. Found and fixed: two announcements in one task or one frame kept only the last (the download's start was lost when it failed at once, and new logs when the timer count changed in the same tick). `announce()` now joins calls made in the same task, and the shell's `Announcer` joins those that arrive before its frame. `0` timers is told as `No timers left.` (the `none` form) rather than `0 timers left.`.
- [X] T134 [P] [US6] Write `packages/web/test/playground/targets.test.ts`, covers 008-typescript-playground-FR-067: every control of every state is at least 24 × 24 px; the phone's two buttons are 44 px tall.
  - Done 2026-10-30: 3 tests pass. Found and fixed: the options' checkboxes were 16 × 16; each now sits in a 24 × 24 `label.option-box` (pixel-identical to before), and the test measures a checkbox's target as its label.

### Implementation for User Story 6

- [X] T135 [US6] Add the tab focus mode (FR-062): the session's `tabMovesFocus` follows Monaco's tab focus mode, the status bar shows the `Tab moves focus` chip, and the editor's description is the Mac or other text of wireframes Site text, built with the key labels. T131 passes.
  - Done 2026-10-30: built in US1; the chip now follows the mode (T131's fix: the engine listens to Monaco's `TabFocus`).
- [X] T136 [US6] Verify research R23 through T045 and T131: with `accessibilitySupport: 'on'`, folding, several cursors and every FR-015 feature still work. If not, apply R23's fallback (`auto`, with the accessibility help's toggle named in the description, a `docs:` change of wireframes Site text first). Record the outcome here.
  - Done 2026-10-30: R23 holds with `accessibilitySupport: 'on'`: `editing.test.ts` (folding, several cursors, the FR-015 features) and T131 pass. No fallback needed.
- [X] T137 [US6] Announce through the shell's `Announcer`, politely, never moving focus (research R23, contracts/playground.md Announcements): the download's start, each 25% (`announcedStep`), its end and failure; the error count after the check's pause; `{n} new log entries` at most once a second from `newSinceAnnounce`; a run's start, its timer count when it changes at most once a second, and its end; every message; `The code is running again.` when the popup closes by itself. T132 and T133 pass.
  - Done 2026-10-30: the announcements were in place from US1 and US2; T133's fixes make none of them lost. T132 and T133 pass.
- [X] T138 [US6] Settle keyboard order and targets: the tab order is the toolbar, the message, the editor, the pane tabs, the open pane, the status bar; Escape closes panels and popups as contracts/playground.md's Focus table sets; every control is at least 24 × 24 px through `size.*` tokens. T134 passes.
  - Done 2026-10-30: Tab goes toolbar, message, editor (with Tab moving focus), pane tabs, open pane; Escape closes the panels and popups (T131 walks it). T134 passes.

**Checkpoint**: The Playground works by keyboard alone and with assistive technology.

---

## Phase 11: User Story 7 - Reduced motion, high contrast and larger text (Priority: P7)

**Goal**: The look matches the approved mockup with tokens only; no motion with reduced motion;
everything visible in forced colors; nothing scrolls sideways but code, at every size and zoom.

**Independent Test**: with reduced motion set, open the Playground for the first time and run code
with timers and an endless loop: nothing moves. With forced colors, errors, focus, log levels and
the popup stay visible. At 200% zoom, every part but the code reads without horizontal scrolling.

### Tests for User Story 7 (REQUIRED) ⚠️

- [X] T139 [P] [US7] Write `packages/web/test/playground/design.test.ts`, covers 008-typescript-playground-FR-068: computed colors, fonts and sizes of the toolbar, panes, editor theme (syntax colors by token class), popups and the mobile screen equal token values read from `tokens.generated.ts`; the window, toolbar, side and status sizes are the design's. And extend `packages/web/test/self-check.test.ts`, covers 008-typescript-playground-FR-068: `npm run token-check` passes over `apps/playground/` and `engine/editor.css` with no skip marker.
  - Done 2026-10-30: 6 tests pass, and the self-check's 008-typescript-playground-FR-068 test. Fixed on the way: the gutter was 67 px (Monaco's folding chevrons and a hard-coded 8 px); the engine now fits it to `EditorTheme.gutter` and hides the chevrons (folding stays on its keys and in the palette); the output panes' inset is `EditorTheme.inset` (`space.2`, contracts/engine.md updated); brackets were in Monaco's depth colors, now the punctuation color through the theme; Monaco's chrome used the system UI font, now the body font. Monaco appends its platform fonts after the code's `monospace`, where they are never reached, so the test checks the families a browser can reach. In forced colors, Monaco's other highlights (occurrences, find matches, quick-fix edits) and the find widget's resize edge were background-only: now framed, and T141 covers find matches.
- [X] T140 [P] [US7] Write `packages/web/test/playground/motion.test.ts`, covers 008-typescript-playground-FR-069 (and SC-013): with reduced motion, the progress, the running dot, the popup and pane switches show no animation or transition of `transform`, `scale` or position, including Monaco's widgets.
  - Done 2026-10-30: 3 tests pass. Only animations and transitions count inside Monaco (its content's transform changes at once as the code scrolls). The stuck popup's scrim covers the toolbar, so the test stops from the popup.
- [X] T141 [P] [US7] Write `packages/web/test/playground/modes.test.ts`, covers 008-typescript-playground-FR-070: with forced colors, error marks, log levels, the cursor, the selection, focus, controls and the popup have visible borders, underlines or text; none relies on a background alone.
  - Done 2026-10-30: 4 tests pass (the editor, the logs, the examples panel with suggestions and quick fixes, the reset and stuck popups), each also running 004's `forcedColorsProblems`. That check tabs through the links and brings the CV's window to the front, so the test brings the Playground's back from the dock.
- [X] T142 [P] [US7] Write `packages/web/test/playground/accessibility.test.ts`, covers 008-typescript-playground-FR-071 (and SC-010): axe (WCAG 2.2 A and AA) finds nothing in every state of FR-071 (contracts/cli.md States); at 200% zoom, text-only 200%, 400% on a 1280 px window and with text spacing, no clipping or overlap.
  - Done 2026-10-30: 34 tests pass: axe in every desktop and phone state of contracts/cli.md States but `playground-keys` (the Keys popup comes with T071, blocked on T029; add its state then), and zoomed (200% of 1440 × 900 and 400% of 1280 × 1024 are the phone screen; 200% of 2560 × 1440 the desktop), text-only 200% and text spacing. The site check's layout helpers are page-wide and would flag Monaco's own views, so the test checks the Playground itself, as the Terminal's does. Fixed on the way: Monaco's palette options carry `aria-level` and its quick-fix list owns separators; `engine/aria.ts` mends both as Monaco draws them. The pane tabs wrap at 200% text. `linkFrom` moved to `test/helpers/playground.ts`.
- [X] T143 [P] [US7] Write `packages/web/test/playground/layout.test.ts`, covers 008-typescript-playground-FR-072: at 1040, 720 and 600 px wide windows and at 200% zoom, nothing scrolls sideways but code lines; below 720 px the panes are under the editor, 240 px tall, and the tools are glyphs keeping their names.
  - Done 2026-10-30: 5 tests pass. The breakpoint is the Playground's own width (the window's content, the container), 2 px less than the window's for its border: a 720 px Playground is a 722 px window. The test sizes the Playground at 720, 719 and 600 px, and 200% zoom is a 2560 × 1440 screen (1440 × 900 at 200% is the phone's).

### Implementation for User Story 7

- [X] T144 [US7] Settle the editor's icons and fonts (research R22): the design's glyphs replace Monaco's for every state the mockup draws (lightbulb, suggestion kinds, close, error and warning marks), by CSS on Monaco's icon classes with the site's SVGs; `codicon.ttf` stays for widgets the design doesn't draw. **Verify** that 004's fonts check scopes to text faces; if it lists every served font, the `fonts` part names the engine's icon font through its own rule, not an exception (T161). Record the outcome here.
  - Done 2026-10-30. **Verify** outcome: 004's fonts part measures the faces that drew each element's own text (CSS.getPlatformFontsForNode); it lists no served font files, and Monaco's codicons are drawn in `::before` of elements without text, so `codicon.ttf` never reaches it: no rule is needed in T161. The glyphs were already CSS masks (T063); design.test.ts now checks suggestion kinds are letters in the mono font and the lightbulb is the design's glyph.
- [X] T145 [US7] Add reduced motion to `playground.css` and `engine/editor.css` (wireframes Accessibility, FR-069): the progress fills in steps, the running dot doesn't pulse, popups and panels appear without fading or sliding, pane switches are immediate, Monaco's widget animations off, motion values from the motion tokens only. T140 passes.
  - Done 2026-10-30: the Playground draws no motion of its own; `engine/editor.css` turns off every animation and transition under `.playground` with `prefers-reduced-motion: reduce` (Monaco's scrollbar and widget fades, in the editor and the output panes). T140 passes.
- [X] T146 [US7] Add forced colors (FR-070): syntax colors to `CanvasText`; wavy underlines in `LinkText` and `CanvasText`; the cursor line's message keeps its cross; selected tab, suggestion, fix and example keep their 2 px border; the scrim drops out and popups keep a 1 px border. T141 passes.
  - Done 2026-10-30: Monaco sets `forced-color-adjust: none` on its editor and widgets (for its own high-contrast themes); `engine/editor.css` sets it back to `auto` inside `.playground`, so the syntax colors are CanvasText. The wavy marks are a bottom border cut to a wave by `glyphs/wavy.svg`; the cursor a 2 px CanvasText border; the selection a 1 px Highlight border; the masked glyphs (and the cursor line message's new cross, also added outside forced colors) a border filling their box; the margin, current-line margin and suggestion letters lose their backgrounds. T141 passes.
- [X] T147 [US7] Add the narrow layout and zoom rules (FR-072, FR-071): `@container (--token-breakpoint-playground-stack)` puts the panes under the editor and the tools to glyphs with their names kept; panels, panes and popups reflow at 200% and 400% zoom and with text spacing; only the editor and the output panes scroll sideways. Compare each desktop and phone state with the mockup's PNGs and fix differences in CSS. T139, T142 and T143 pass.
  - Done 2026-10-30: below the breakpoint the tools' names are visually hidden (their accessible names kept) and the Examples chevron goes; the pane tabs wrap. Compared the ready and narrow states with `desktop-03-ready-1440.png` and `desktop-24-narrow-1440.png`: fixed the code's start (the mockup's 48 px gutter, then `space.2` before the code and above the first line, now `EditorTheme.inset`) and function and property colors, which the tokenizer can't tell: the TypeScript worker's `getNameKinds` gives TypeScript's 2020 classifications and a range semantic-tokens provider colors them by the theme's `function`, `property` and `type` rules (Monaco keeps `semanticHighlighting.enabled` for every editor, so the output panes no longer set it). Not compared state by state against all 30 PNGs: that stays with T170's check by hand. T139, T142 and T143 pass.

**Checkpoint**: The Playground looks as approved and holds up to motion, contrast and zoom
settings.

---

## Phase 12: User Story 8 - Use the Playground offline (Priority: P8)

**Goal**: The first open offline shows its state and starts the download when the network comes
back; a cut download is never used; after one open everything works offline; a site update keeps
the stored copy until a new one is whole; the Playground requests nothing from another site.

**Independent Test**: in a clear browser, visit `/` online, go offline, open the Playground: the
offline state; go online: the download starts by itself. Offline again, reload: the editor opens
with no download, and editing, every pane, the options, every example, running and sharing work.

### Tests for User Story 8 (REQUIRED) ⚠️

- [X] T148 [P] [US8] Write `packages/web/test/playground/offline.test.ts`, covers 008-typescript-playground-FR-011 and 008-typescript-playground-FR-073 (and SC-011): a fresh profile offline shows "TypeScript needs one download" with the size from `data-playground-bytes` and Retry; going online starts the download by itself; a download cut part way (a file aborted by the test) shows "The download stopped", is never used, and completes after Retry; after one open, offline: open, edit, a type, an error, each pane, an option, every example including the CV ones, a run, the popup and Share work, in the site's fonts; a shared link opened offline before the engine is stored stays pending and opens after the download.
  - Done 2026-10-30: 4 tests pass. The site's worker must be settled before the network goes, and a link is followed as a new load (via `about:blank`): a hash change alone is the same document. Found and fixed: after an example replaced code with an error on its line 1, the old error's message stayed after the new line 1 (the old marks outlived the code); `replaceCode` now clears the marks until the new code's check.
- [X] T149 [P] [US8] Write `packages/web/test/playground/update.test.ts`, covers 008-typescript-playground-FR-013: with an engine stored, a rebuilt site copy with a different engine hash (`copyBuild`): offline, the old copy opens and shows its version; online, the new one downloads, then the old cache is gone; an open Playground isn't interrupted when the new service worker activates.
  - Done 2026-10-30: 2 tests pass, both versions served at one address by `switchableServer` (the engine's copies are kept per origin); the rebuilt copy's engine differs by one exported name.
- [X] T150 [P] [US8] Write `packages/web/test/playground/requests.test.ts`, covers 008-typescript-playground-FR-010 (and SC-012): the download, editing, every example, a run of code that makes no request, sharing and the mobile screen request only `127.0.0.1`.
  - Done 2026-10-30: 2 tests pass; every request of the page's context, workers and frames included, is to the site (`data:` and `blob:` URLs aside).

### Implementation for User Story 8

- [X] T151 [US8] Add the offline and stopped states to `Loading.tsx` (FR-011, `data-req` FR-011 on `div.playground-loading` offline and `button.playground-retry`): the headings and sentences of wireframes Site text with the size; Retry and the `online` event start the download again; the failure is announced (T137). T148's first cases pass.
  - Done 2026-10-30: already in place from Phase 2 (offline and stopped headings and sentences with the size, Retry, the `online` event, `downloadFailed` announced, `data-req` FR-011); T148's first cases pass with no change.
- [X] T152 [US8] Complete the loader's update path (FR-013, research R4): offline or on a failed download, open the newest complete copy with the same `api`, its version shown; once the current copy is complete, delete the others; never touch the engine an open Playground loaded. T149 passes.
  - Done 2026-10-30: already in place from Phase 2 (the newest older complete copy with the same `api` offline or on a failed download; others deleted once the current copy is whole); T149 passes with no change.
- [X] T153 [US8] Keep a shared link pending through the offline state (contracts/share-link.md, spec Edge Cases Sharing), and confirm the service worker answers `/playground/` and the site's fonts offline. T148 and T150 pass.
  - Done 2026-10-30: the pending link survives the offline state and opens after the download, and the worker answers `/playground/` and the fonts offline (T148's offline walk checks the code's and body's faces loaded); T148 and T150 pass.

**Checkpoint**: The Playground works offline after one open, survives site updates and stays on
the site.

---

## Phase 13: User Story 9 - Every pull request proves the Playground works (Priority: P9)

**Goal**: The site check's new `playground` part and the Playground's states in seven existing
parts, in the one command, failing with lines that name the part, state, width and example.

**Independent Test**: break one thing at a time in a repository copy (an example with a type error,
a CV field an example uses removed from the schema, a shared link that runs on open, a popup for a
60 s timer, code that reads the site's storage) and confirm the matching check fails, naming it.

### Tests for User Story 9 (REQUIRED) ⚠️

- [X] T154 [P] [US9] Write `tools/site-check/test/playground.test.ts`, covers 008-typescript-playground-FR-075: the part passes on the real build with every variant of contracts/cli.md Variants; repository copies with an example with a type error, a CV field an example uses removed from the schema, a link that runs on open, a popup for a 60 s timer and code that reads the site's storage each fail with a line naming the part, the check, the width and the example, as contracts/cli.md's problem lines show.
  - Done 2026-10-30: `tools/site-check/test/playground.test.ts`. Each copy runs only the check it breaks (`runCheck`'s `playgroundChecks`). A copy whose code gets `allow-same-origin` fails on the request carrying the site's cookies and Origin.
- [X] T155 [P] [US9] Extend `tools/site-check/test/shell-states.test.ts`, `tools/site-check/test/accessibility.test.ts` and `tools/site-check/test/other-sites.test.ts`, covers 008-typescript-playground-FR-076: the summary lists every Playground state of contracts/cli.md States under `accessibility`; `other-sites` records the download, a run, sharing and the mobile screen, and a copy that loads a file from another site fails.
  - Done 2026-10-30: `shell-states.test.ts` (every Playground state under `accessibility`; the part needed no change, as it walks `SHELL_STATES`) and `other-sites.test.ts`. `accessibility.test.ts` holds only fixture cases, so it gained nothing. `playground-keys` waits for T071 (T029).
- [X] T156 [P] [US9] Extend `tools/site-check/test/keyboard.test.ts`, covers 008-typescript-playground-FR-077: FR-077's flow passes on the real build as `desktop/playground-keyboard/1440px`; a copy where the stuck popup doesn't take focus fails, naming the step.
  - Done 2026-10-30.
- [X] T157 [P] [US9] Extend `tools/site-check/test/offline.test.ts`, covers 008-typescript-playground-FR-078: FR-078's sequence passes as `desktop/playground-offline/1440px`; a copy whose service worker doesn't answer `/playground/` fails, naming the state.
  - Done 2026-10-30.
- [X] T158 [P] [US9] Extend `tools/site-check/test/cli.test.ts`, `layout`, `modes`, `fonts` and `lighthouse` tests in `tools/site-check/test/`, covers 008-typescript-playground-FR-079: `playground` runs after `inspector` in the part order; the local command and the CI step are the same; every Playground problem line names the part, state, width and example; two runs give the same result; `lighthouse` fails a copy whose first load requests a file under `/playground/` (SC-009).
  - Done 2026-10-30: `cli.test.ts`, `lighthouse.test.ts` and `fonts.test.ts` (fonts, layout and modes together, one run on the real build).

### Implementation for User Story 9

- [X] T159 [US9] Add the Playground's states to `tools/site-check/src/shell-states.ts` (contracts/cli.md States), each reached from a fresh page by real input, desktop states after `playground-downloading` and `playground-offline` starting once the engine is stored in the profile.
  - Done 2026-10-30: 22 desktop and 4 mobile states in `tools/site-check/src/shell-states.ts` (`PLAYGROUND_SHELL_STATES`, `PLAYGROUND` selectors, `drivePlayground`, and helpers the part can reuse: `openPlayground`, `playgroundReady`, `putCode` by select-all + `insertText`, `cursorAt`, `runPlayground`, `shareLink`, `followLink`, `tooLongCode`). `playground-keys` waits for T071's popup (T029). Each is reached on the real build (shell-states.test.ts). The stuck state isn't moved right of the CV.
- [X] T160 [US9] Write `tools/site-check/src/parts/playground.ts` (contracts/cli.md Parts): every check of FR-075 at 1440 × 900 and 375 × 812, reading expectations from the built `files.json`, `resume.json` and the bundled TypeScript; register it after `inspector` in `tools/site-check/src/check.ts`; variants and problem lines through `tools/site-check/src/report.ts`. T154 passes.
  - Done 2026-10-30: 31 variants, each check from a fresh profile. FR-075's editing, panes and option promises had no variant in contracts/cli.md, so `editing` and `panes` were added there. It found a real bug: `setCompilerOptions` restarts Monaco's worker even with unchanged options, and a check out on the old worker never settled, so the status stayed on `Checking…` for good (about 1 in 2 when an example was chosen just after opening). Fixed in `engine/editor.ts` and `checker.ts` (`onCheckLost` in contracts/engine.md), tested in `options.test.ts` and `unit/check.test.ts`. `putCode` now pastes, as `insertText` went through Monaco's auto-closing and mangled multi-line code.
- [X] T161 [US9] Extend `tools/site-check/src/parts/{accessibility,other-sites,layout,modes,fonts,lighthouse}.ts` as contracts/cli.md's Parts table sets (the `fonts` part's icon-font rule per T144). T155 and T158 pass.
  - Done 2026-10-30. `fonts` found `✓` and `⊗` in the status bar and Errors pane drawn in a fallback font: they are now the design's `OkMark` and `ErrorMark` glyphs, with the same look. No icon-font rule was needed (T144). `lighthouse` gained a `first-load` result.
- [X] T162 [US9] Extend `tools/site-check/src/parts/keyboard.ts` with FR-077's flow and `tools/site-check/src/parts/offline.ts` with FR-078's sequence. T156 and T157 pass. `npm run site-check` passes with every part.
  - Done 2026-10-30: `npm run site-check` exits 0 with all 15 parts. The editor's focus indicator is measured by its outline, as Monaco's cursor covers its input. `Keys…` isn't in the flow (T071). After closing, focus goes to the CV window's title, the window then in front.

**Checkpoint**: Every pull request proves the Playground works, in the one command.

---

## Phase 14: Polish & Constitution Verification

**Purpose**: Traceability, the budgets, the audits, the full verification, the owner's manual
checks and the single PR

- [X] T163 [P] Write `packages/web/test/playground/data-req.test.tsx`, covers 008-typescript-playground-FR-074: every target in contracts/playground.md's `data-req` table carries exactly its IDs in the rendered page (desktop: each state that shows it; mobile: the screen and its buttons; the menu items through `menuItems`); and the Playground's spec view (007) lists 008's requirements carried through `src/apps/playground/`.
  - Done 2026-10-30: every row but the keys popup's, which joins with T071 (T029). The menu items carry FR-003 and the requirement each acts on (Run FR-032, Stop FR-038 and so on), more exact than the contract's one row.
- [ ] T164 [P] Extend `packages/web/test/self-check.test.ts`, covers 008-typescript-playground-FR-031 and 008-typescript-playground-FR-074: `npm run content-check`, `npm run token-check` and `npm run traceability` pass on the repository with no exception or skip marker added for the Playground (SC-015).
- [ ] T165 Run `npm run traceability` after T163 (Constitution III, SC-015): it exits 0 and its PASS line counts 008's 86 active requirements among the approved specs, with 005's FR-063 and FR-065 and 006's FR-008 and FR-014 covered; every row of Requirement Coverage below has a passing test. Record the PASS line here.
- [ ] T166 [P] Verify research R2 and SC-009 on the real build: the `os` script's brotli growth over T002's base (budget 45 KB; beyond it, move the examples' code and the options' descriptions into the engine, as R2 sets), the engine's total and brotli sizes, and Lighthouse's mobile and desktop scores on `/` and `/cv` (90+ in every category). Record the figures here.
- [ ] T180 Make opening from an address generic, at the owner's decision of 2026-10-30 (Constitution V; T167's "the shell names no app"), before T167 and T168: the `App` type in `packages/web/src/apps/index.ts` gains an optional `opensFromAddress?: (href: string) => boolean` and `onOpenFromAddress?: (shell: 'desktop' | 'mobile') => void`; the Playground's declaration in `packages/web/src/apps/playground/app.tsx` sets them from `holdsLink` and `readAddressLink` (desktop only, as now); `packages/web/src/os/Os.tsx` drops its imports from `apps/playground/` and, on hydration, opens the first app whose `opensFromAddress(location.href)` is true and that runs in the current shell, calling its `onOpenFromAddress` first, with the same `open` / `mobileOpen` dispatch as today. No behavior changes: the link tests (T117 to T125, the shared-link and phone cases) and `apps.test.tsx` pass unchanged, and a new case in `packages/web/test/os/` (or the existing apps test) checks that an app declaring `opensFromAddress` opens from a matching address and that `Os.tsx` imports nothing from `apps/<id>/`. Update contracts/shell.md (App declaration; Opening from a link) and plan.md's Constitution V row in a `docs(008):` commit. If T168 already ran, run it again after this task.
- [ ] T167 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/os-core/`, `packages/web/`, `packages/tokens/`, `tools/`:
  - **X**: one package added (`monaco-editor`); the abstractions added are exactly plan.md's Dependencies table (add any helper this list created, with its reason); no agent skill added;
  - **IV**: no CV fact in `site-text.ts`, the examples or the engine; `cv`'s value is `resume` and its type generated; no literal design value in source, style or the theme;
  - **V**: `os-core` gained only `'playground'`, the metrics and `placeBeside`, and lost two shortcuts; the shell names no app; the app declares its shells beside its code;
  - **VII**: first load without a fragment is unchanged; `/cv` is untouched;
  - **IX**: the icon and glyphs are the design's own; no Apple or TypeScript asset; Monaco's icon font only for undrawn widgets.
  Also confirm the rules above: no `innerHTML`, `dangerouslySetInnerHTML`, `eval` or `new Function` in `apps/playground/`; the runner's frame attributes; no URL to another site. Record the result here.
- [ ] T168 Run the full verification after T165 to T167: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` exit 0, the last with the `playground` part in both shells. Run them again with an untracked file in the working copy: the same result (FR-079). Record the counts here.
- [ ] T169 Run quickstart.md sections 1 and 2's commands and walk sections 3 and 4 against `npm run build && npm run serve`; record any difference here and fix it before the PR.
- [ ] T170 Owner action, by hand (research R26, quickstart 5): a desktop screen reader through every step of story 6 (SC-010); the keys of R12 in Chrome, Edge, Firefox and Safari with a screen reader running; forced colors in Edge; text-only zoom to 200% in Firefox; the built Playground against `design/mockup/`'s PNGs in both shells. Record each result here and in the PR. Under the interim provision on deferred manual checks they may wait for the final testing phase: record that here, list them in the PR and leave this task open.
- [ ] T171 Open the PR from `008-typescript-playground` to `main` with a Conventional Commits title, e.g. `feat: add the TypeScript playground (008)`, linking 008's `spec.md` and `tasks.md` and the amended `specs/005-os-shell/spec.md` and `specs/006-terminal/spec.md` (Constitution XI), naming the amendments of 005 (FR-086) and 006 (FR-087), 005's and 006's superseded tasks (T037, T176) and 006's design text change (T174, T175), the **Verify** outcomes (T018, T025, T072, T136, T144, T166), and the deferred manual checks (T170). No AI or Claude attribution.
- [ ] T172 Owner action: run `npm run verify` on the PR's clean head commit (Chromium, and the three-engine tests in Firefox and WebKit) and `npm run signoff`, so the required `local-verify` status passes (Constitution, Merge requirements). Run it again after every new commit, a merge of `main` included.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies; T001 first.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS every story. T005 (design gate) first;
  T006 → T007; T008 → T009 → T010; T012 → T013; T014 → T015; T016 → T017; T018 → T019; T021 →
  T022; T023 → T024 and T025. T025 can stop the feature (R24) until the owner amends FR-045.
- **The amendment of 005 (Phase 3)**: Depends on Phase 2's T010. T027 → T028 → T029 (owner) before
  any of T034 to T036. BLOCKS US1's keys (T055, T071, T072) and every story that types in the
  editor while using a shell shortcut (US6).
- **Design gate**: every task that creates or changes UI depends on T005; the shell's menu and
  About changes (T035) also on T029; the Terminal's `open` reply (T129) also on T175.
- **US1 (Phase 4)**: Depends on Phases 2 and 3. The MVP.
- **US2 (Phase 5)**: Depends on US1 (the editor and `getCheck`).
- **US3 (Phase 6)**: Depends on US1; its running checks (T106, T107) need US2.
- **US4 (Phase 7)**: Depends on US1; T115's "no runner frame" needs US2's runner to exist.
- **US5 (Phase 8)**: Depends on Phase 2 for the screen; T124's link from code needs US4's
  `share.ts`; T121's run across switches needs US2.
- **The amendment of 006 (Phase 9)**: Depends on US1 (desktop) and US5 (mobile). T174 → T175
  (owner) before T129 and T130; T176 any time in the phase.
- **Runner placement**: T173 before T099 (US2).
- **US6 (Phase 10)**: Depends on US1 and US2; the announcements touch every story's UI.
- **US7 (Phase 11)**: Depends on US1 to US5 (every state exists).
- **US8 (Phase 12)**: Depends on US1 to US4 (every action FR-073 lists).
- **US9 (Phase 13)**: Depends on US1 to US8 (it checks what they define).
- **Polish (Phase 14)**: Depends on every phase.

### User Story Dependencies

- **US1 (P1)**: after Foundational and the 005 amendment. No other story.
- **US2 (P2)**: needs US1's editor. Independently testable by running code typed in the editor.
- **US3 (P3)**: needs US1; uses US2 to run the examples.
- **US4 (P4)**: needs US1; links never touch the runner.
- **US5 (P5)**: the screen needs only Phase 2; sharing the visitor's code needs US4.
- **US6 to US8**: refine US1 to US5 rather than adding flows.
- **US9 (P9)**: checks every story.

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Tokens and site text before components; the session store before the components that read it
- `@cv/os-core` before the shell; the engine contract before the interface calls it
- Core implementation before integration
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup: T004 beside T003.
- Foundational: T008, T011, T012, T014, T016, T021 and T023 in parallel once T005 is done; T018
  beside them.
- 005 amendment: T030 to T033 in parallel after T029.
- Every story's test tasks marked [P] in parallel; within US2, T094 to T096 in parallel; within
  US3, T109 to T111 in parallel.
- US4 and US5's screen (T123) in parallel after US2; US7 and US8 in parallel after US5.

---

## Parallel Example: User Story 1

```bash
# Launch US1's tests together:
Task: "Write packages/web/test/playground/diagnostics.test.ts and unit/check.test.ts, covers 008-typescript-playground-FR-016"
Task: "Write packages/web/test/playground/hover.test.ts, covers 008-typescript-playground-FR-017"
Task: "Write packages/web/test/playground/suggestions.test.ts, covers 008-typescript-playground-FR-018"
Task: "Write packages/web/test/playground/panes.test.ts, covers 008-typescript-playground-FR-020 to FR-023"
Task: "Write packages/web/test/playground/keys.test.ts and unit/keys.test.ts, covers 008-typescript-playground-FR-083 to FR-085"

# Then the independent components together:
Task: "Create packages/web/src/apps/playground/PlaygroundIcon.tsx"
Task: "Write packages/web/src/apps/playground/StatusBar.tsx"
Task: "Write packages/web/src/apps/playground/Message.tsx"
```

## Parallel Example: User Story 2

```bash
# The runner's pure parts together:
Task: "Write packages/web/src/apps/playground/engine/runner/format.ts"
Task: "Write packages/web/src/apps/playground/logbook.ts"
Task: "Write packages/web/src/apps/playground/engine/source-map.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational, including the design gate and the R6, R17 and R24 Verify items
   (CRITICAL: blocks all stories; R24 may need a spec amendment first)
3. Complete Phase 3: the amendment of 005, with the owner's design sign-off
4. Complete Phase 4: User Story 1
5. **STOP and VALIDATE**: test User Story 1 independently

### Incremental Delivery

1. Setup + Foundational + the 005 amendment → foundation ready
2. US1 → the editor (MVP checkpoint)
3. US2 → running; US3 → examples; US4 → links; US5 → phones; the 006 amendment → `open playground`
4. US6 → keyboard and screen readers; US7 → look, motion and zoom; US8 → offline
5. US9 → the site check; Polish → traceability, audits, PR

A new feature's stories ship in its single PR (Constitution XI), with the amendments of 005 and
006 it makes; the increments above are checkpoints within it.

---

## Requirement Coverage

| Requirement | Test task(s) |
|-------------|--------------|
| 008-typescript-playground-FR-001 | T038, T108 |
| 008-typescript-playground-FR-002 | T039 |
| 008-typescript-playground-FR-003 | T008, T040, T092 |
| 008-typescript-playground-FR-004 | T041 |
| 008-typescript-playground-FR-005 | T014, T056, T092, T122 |
| ~~008-typescript-playground-FR-006~~ | Removed, replaced by FR-087 |
| 008-typescript-playground-FR-007 | T021, T042 |
| 008-typescript-playground-FR-008 | T042 |
| 008-typescript-playground-FR-009 | T039 |
| 008-typescript-playground-FR-010 | T150 |
| 008-typescript-playground-FR-011 | T021, T148 |
| 008-typescript-playground-FR-012 | T043 |
| 008-typescript-playground-FR-013 | T021, T149 |
| 008-typescript-playground-FR-014 | T044 |
| 008-typescript-playground-FR-015 | T045 |
| 008-typescript-playground-FR-016 | T046 |
| 008-typescript-playground-FR-017 | T047 |
| 008-typescript-playground-FR-018 | T048 |
| 008-typescript-playground-FR-019 | T049 |
| 008-typescript-playground-FR-020 to FR-023 | T050 |
| 008-typescript-playground-FR-024, FR-025 | T012, T051 |
| 008-typescript-playground-FR-026 | T012, T049, T115 |
| 008-typescript-playground-FR-027 | T106 |
| 008-typescript-playground-FR-028 | T105 |
| 008-typescript-playground-FR-029 | T016, T107 |
| 008-typescript-playground-FR-030 | T106 |
| 008-typescript-playground-FR-031 | T108, T164 |
| 008-typescript-playground-FR-032, FR-033, FR-036 | T078 |
| 008-typescript-playground-FR-034 | T079 |
| 008-typescript-playground-FR-035 | T080 |
| 008-typescript-playground-FR-037 | T081 |
| 008-typescript-playground-FR-038 | T082 |
| 008-typescript-playground-FR-039 | T083 |
| 008-typescript-playground-FR-040 | T084 |
| 008-typescript-playground-FR-041 | T085 |
| 008-typescript-playground-FR-042 | T086 |
| 008-typescript-playground-FR-043 | T087 |
| 008-typescript-playground-FR-044 | T079, T088 |
| 008-typescript-playground-FR-045 | T089 |
| 008-typescript-playground-FR-046 | T090 |
| 008-typescript-playground-FR-047 | T079 |
| 008-typescript-playground-FR-048 to FR-051 | T091 |
| 008-typescript-playground-FR-052 | T114, T115 |
| 008-typescript-playground-FR-053, FR-054, FR-057 | T115 |
| 008-typescript-playground-FR-055, FR-056 | T114, T115 |
| 008-typescript-playground-FR-058 to FR-060 | T120 |
| 008-typescript-playground-FR-061 | T014, T121 |
| 008-typescript-playground-FR-062 | T131 |
| 008-typescript-playground-FR-063 | T132 |
| 008-typescript-playground-FR-064 | T088, T133 |
| 008-typescript-playground-FR-065, FR-066 | T133 |
| 008-typescript-playground-FR-067 | T134 |
| 008-typescript-playground-FR-068 | T139 |
| 008-typescript-playground-FR-069 | T140 |
| 008-typescript-playground-FR-070 | T141 |
| 008-typescript-playground-FR-071 | T142 |
| 008-typescript-playground-FR-072 | T143 |
| 008-typescript-playground-FR-073 | T148 |
| 008-typescript-playground-FR-074 | T163, T164 |
| 008-typescript-playground-FR-075 | T154 |
| 008-typescript-playground-FR-076 | T155 |
| 008-typescript-playground-FR-077 | T156 |
| 008-typescript-playground-FR-078 | T157 |
| 008-typescript-playground-FR-079 | T158 |
| 008-typescript-playground-FR-080 | T052, T092 |
| 008-typescript-playground-FR-081 | T053 |
| 008-typescript-playground-FR-082 | T054 |
| 008-typescript-playground-FR-083 to FR-085 | T055 |
| 008-typescript-playground-FR-086 | T030, T031, T032 |
| 008-typescript-playground-FR-087 | T126, T127, T128 |
| 005-os-shell-FR-063, FR-065 | T030, T032, T033 |
| 006-terminal-FR-008 | T126 |
| 006-terminal-FR-014 | T126, T127 |
| SC-001, SC-002 | T046, T058 |
| SC-003 to SC-008 | T082, T091, T084, T083, T115, T114, T106 |
| SC-009 | T039, T057, T158, T166 |
| SC-010 to SC-013 | T142, T148, T150, T140, and by hand T170 |
| SC-014 | T106 |
| SC-015 | T164, T165, T168 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps a task to its user story; the two amendment phases carry no story label
- T173 to T176 were added after `/speckit-analyze` (see `.specify/analysis.md`) and sit in their
  phases out of number order, so no existing task ID changed
- Requirement IDs in task descriptions map tasks to spec.md requirements
- Verify tests fail before implementing
- Commit after each task or logical group, using Conventional Commits, with no AI attribution
- Record every **Verify** outcome and owner action in its task, as 007's tasks.md does
- Stop at any checkpoint to validate a story on its own
