---

description: "Task list for the Terminal"
---

# Tasks: The Terminal

**Input**: Design documents from `/specs/006-terminal/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/terminal.md](./contracts/terminal.md),
[contracts/commands.md](./contracts/commands.md), [contracts/shell.md](./contracts/shell.md),
[contracts/shell-worker.md](./contracts/shell-worker.md) (added 2026-10-29),
[contracts/site.md](./contracts/site.md), [contracts/cli.md](./contracts/cli.md),
[quickstart.md](./quickstart.md), and the design in [design/](./design/):
[wireframes.md](./design/wireframes.md), [README.md](./design/README.md), the Penpot PNG
exports in `design/exports/`, the
[Penpot link](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f)
and the signed [review.md](./design/review.md) (**006 Terminal — Glass**, commit `c34fd51`,
2026-10-27, and its "2026-10-29 amendment" section, signed 2026-10-29).

**Amended 2026-10-29**: Phase 15 implements the removal of the greeting (spec FR-005 as amended,
design approved 2026-10-29). Phases 16 to 25 implement the rest of the spec's 2026-10-29
amendment: the bash-like shell (FR-067 to FR-070, FR-073), the cursor, click to focus and a
terminal's keys (FR-071, FR-072, FR-074, FR-075), and the requirements they amend (plan.md, rows
marked *(amended)* and *(new)*). Phases 1 to 14 are the Terminal as merged in `bba9650`; their
tasks stay ticked, and where the amendment overturns one, the task is marked superseded and names
the task that replaces it (Constitution XI).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `006-terminal-FR-###` IDs it covers, and every FR in
spec.md (FR-001 to FR-075, all active) is covered by at least one test task (see Requirement
Coverage at the end of Phase 11 for FR-001 to FR-066 as first built, and Amendment Requirement
Coverage at the end of this file for the amendment).

**Organization**: Tasks are grouped by user story.

- US1 is the Terminal itself on desktop: the app in the dock, the command line, the parser, every
  CV command, `help`, suggestions and replies, history, `clear`, `exit`, `open`, pipes, `jq`,
  `cat cv.json` and the vim view opened by `cv`.
- US2 adds `site` and `specs`, with the spec list read at build time.
- US3 fills the file system and adds `ls`, `cd` and `pwd`, the path in the prompt and title, and
  the path replies.
- US4 draws the Terminal on mobile as the pocket terminal, with command keys and vim keys.
- US5 adds what screen readers hear and proves the keyboard is never trapped.
- US6 adds reduced motion, forced colors, reduced transparency, target sizes, zoom and wrapping.
- US7 proves the Terminal offline.
- US8 extends the site check to the Terminal in both shells.

Merging 005, the design gate, the token rename, the tokens, the site text, the shell's general
app fields, the spec list's build plumbing, the engine's block types and the Terminal test helper
come first, in Phase 2, because every story builds on them.

The amendment (Phases 16 to 25) follows the same stories. Its Phase 17 moves the Terminal onto the
shell, running in a worker, with every behavior the amendment doesn't change kept as it is; each
story phase after it adds what the amendment changes for that story. US2 (`site`, `specs`) gains
no task of its own: its commands run through the shell from Phase 17 on, and its tests must still
pass there.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US8)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 006-terminal-FR-016"

## Not in this feature

As the spec's Assumptions set (as amended 2026-10-29): Settings, Contact and the requirement
inspector; running real programs or reaching the network; tab completion, job control, background
jobs, interactive programs other than the vim view, and running a script file with `bash` or
`sh`; a file system shared with other apps or a Files app; changing the protected files, keeping
the visitor's files after the Terminal closes, hidden files in the home folder, `chmod`, `chown`
and other users; Terminal themes, font sizes and preferences; games, easter eggs and
translations. `open` gains names only as later features add apps. Phases 1 to 14 were built
before the amendment, when quotes, variables, scripts and every change to the file system were
out of scope too.

The Terminal's design is already in Penpot with its link, so 006 owes nothing to the interim
provision on local mockups beyond writing its tokens into the hand-written export (research R22).

## Path Conventions

- CV data, read only through `@cv/content` (Constitution IV): `packages/content/resume.json`,
  `packages/content/site.json` (`repository`)
- Tokens, read only through `@cv/tokens`: `packages/tokens/penpot/tokens.json` (the hand-written
  export) and the generated `packages/tokens/src/tokens.generated.{css,ts}`
- The shared core: `packages/os-core/src/{types,geometry}.ts` and `packages/os-core/test/`
- The shell (005), changed only in general ways (contracts/shell.md): `packages/web/src/os/`
  (`Os.tsx`, `View.tsx`, `focus.ts`, `metrics.ts`, `shell-props.ts`),
  `packages/web/src/shells/desktop/{MenuBar,TitleBar}.tsx`,
  `packages/web/src/shells/mobile/FullScreenView.tsx`, `packages/web/src/apps/index.ts`,
  `packages/web/src/site-text.ts`, `packages/web/src/fonts/fonts.json`
- The Terminal (new): `packages/web/src/apps/terminal/`:
  - `app.tsx`, `TerminalIcon.tsx`, `data.ts`, `session.ts`, `Terminal.tsx`, `Output.tsx`,
    `CommandLine.tsx`, `VimView.tsx`, `Pocket.tsx`, `useOnScreenKeyboard.ts`, `glyphs/`,
    `terminal.css`, `pocket.css`;
  - `engine/` (`commands.ts`, `parse.ts`, `block.ts`, `cv.ts`, `files.ts`, `json.ts`, `vim.ts`,
    `suggest.ts`, `announce.ts`), pure TypeScript with no React, DOM or `@cv/tokens` import.
    From the amendment: `parse.ts` is removed and `output-map.ts` added.
  - From the amendment: `shell-client.ts` (in the page) and `shell/` (`worker.ts`, `protocol.ts`,
    `adapter.ts`, `fs.ts`, `site-commands.ts`, `standard.ts`, `no-zlib.ts`), the code that runs in
    the shell worker, as contracts/shell-worker.md sets.
- The spec list: `packages/web/scripts/spec-list.ts`, `packages/web/src/virtual-modules.d.ts`,
  registered in `packages/web/vite.config.ts` and `vitest.config.ts`
- Tests:
  - engine (Node): `packages/web/test/terminal/engine/*.test.ts`
  - shell (Node, from the amendment): `packages/web/test/terminal/shell/*.test.ts`, running the
    same modules the worker runs
  - Terminal in the browser, on the real build: `packages/web/test/terminal/*.test.ts(x)`
  - the Terminal test helper: `packages/web/test/helpers/terminal.ts`
  - core: `packages/os-core/test/`
  - web: `packages/web/test/{focus,spec-list,self-check,fonts,tokens}.test.ts`
  - site check: `tools/site-check/test/`
- The site check: `tools/site-check/src/` (`check.ts`, `shell-states.ts`, `expected.ts`,
  `report.ts`, `parts/*.ts`)
- Shared test code from 004 and 005: `packages/web/test/helpers/{site,browser,ax,copy,fixtures,offline,shell}.ts`,
  `packages/web/test/__fixtures__/*.json` (`every-field`, `nothing-optional`, `partial-dates`,
  `non-ascii`, `three-projects`, `empty-sections`, `long-words`, `no-name`),
  `tools/site-check/test/helpers/{sites,root}.ts`, `tools/site-check/src/expected.ts`
  (`expectedFields`), `tools/site-check/src/browser.ts` (`launchChromium`)

## Rules that apply to every task

- **No design literal and no CV fact in source** (FR-010, FR-030, FR-031, Constitution IV):
  - Everything under `packages/web/` and `packages/os-core/` except `test/` is source for 002's and
    003's checks, with no exception and no skip marker added.
  - Style sheets use only `var(--token-…)`, `@media (--token-…)` and
    `@container (--token-breakpoint-…)`. Inside `@media (forced-colors: active)`, system colors
    such as `Highlight`, `Canvas` and `CanvasText` are allowed (003 FR-056).
  - Scripts read design values only through `src/os/metrics.ts` (`METRICS`, `TERMINAL`).
  - Every non-CV word is in `src/site-text.ts`, under `os.views.terminal` and `terminal`. CV text
    reaches the Terminal only from `resume` and `siteData`, through `apps/terminal/data.ts`.
- **The engine stays pure** (research R2, R23): nothing in `apps/terminal/engine/` imports React,
  `react-dom`, a DOM global, `@cv/tokens`, a component or a `.css` file. It reads site text and
  design values as arguments (`RunContext`), never by import of `metrics.ts`.
- **Output is data** (research R3, FR-018): commands return `Block`s. Nothing in the Terminal uses
  `dangerouslySetInnerHTML`, `innerHTML` or `eval`. Typed text reaches the page only as a React text
  child.
- **`data-req`** (FR-037): written only as a JSX string attribute, `data-req="006-terminal-FR-…"`,
  on the elements contracts/terminal.md's `data-req` targets name, listing every ID it gives,
  separated by spaces. 004's and 005's attributes stay where they are.
- **Test titles**: every test or `describe` title carries only full, existing IDs, such as
  `describe('006-terminal-FR-016: suggestions for a mistyped command', …)`. Tests for success
  criteria without an FR use titles such as `describe('… (SC-002)', …)`. Structural tests that
  serve no single requirement (the engine's boundaries) carry no ID. No other `fr-` text in any
  letter case.
- **Browser tests act like a visitor** (005 R17): the real build, served by `serveBuilt` (004),
  opened in Chromium through `test/helpers/shell.ts` and `test/helpers/terminal.ts`, driven by
  clicks, taps, typed keys and viewport changes. No test hook in the site.
- **Fixtures and tests may hold literal values and CV text.** They live in `test/` and
  `__fixtures__/`, which no check searches. Never copy one into source.
- **No test writes inside the repository**: builds for tests and temporary spec folders go to
  temporary directories. Only `npm run build` writes, under `packages/web/dist/`.
- **The token export is written in Penpot's form** (`JSON.stringify(value, null, 2)`, no final
  newline) under the interim provision on local mockups.
- **Traceability stays red until Phase 11**: 006's spec is Approved, so `npm run traceability` and
  001's self-check test fail on uncovered 006 IDs until every story's tests exist. Any other
  failure is a real one. For the amendment, the same holds for FR-067 to FR-075 until their tests
  exist (Phases 17 to 21).
- **The shell stays pure too** (contracts/shell-worker.md): nothing in `apps/terminal/shell/`
  imports React, `react-dom`, a DOM global, `@cv/tokens`, a component or a `.css` file, and
  nothing in `engine/` imports `just-bash` or `shell/`. The page reaches the shell only through
  `shell-client.ts` and the worker's messages.
- **Recordings are the site's own** (research R29, FR-018): a recorded block is made only by a site
  command or wrapper, from the text it printed. Typed, piped or printed text never becomes a link
  or a control, whatever it holds.
- Code uses erasable TypeScript only, with explicit `.ts`/`.tsx` extensions on relative imports.
- Run everything with Node 26 active (`nvm use`).
- Commits use Conventional Commits and carry no AI or Claude attribution (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 005's shell in the branch, and a clean baseline

- [X] T001 Merge 005's shell into `006-terminal` before any code (research R1): `git fetch origin 005-os-shell main`; if 005's pull request has merged, `git merge origin/main`, else `git merge origin/005-os-shell`, as a merge commit (no rebase, no squash). Resolve conflicts in `specs/` by keeping both branches' files. Then `npm ci` with Node 26. Record here which ref was merged and its commit. If 005 changes again before the pull request opens, merge it again the same way (T109).
  - Done 2026-10-28: 005's pull request (#23) had merged into `main` as `29d6ae8`, and `006-terminal` already sits on it (merge base `29d6ae8`), so `git merge origin/main` was "Already up to date" and no merge commit was needed. `npm ci` ran with Node 26.12.1.
- [X] T002 Record the baseline after T001: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check` and `npm run site-check` exit 0. `npm run traceability` fails only on the 66 uncovered `006-terminal` IDs (the rule above); any other failure is fixed on 005's branch first, not here. Create the empty folders `packages/web/src/apps/terminal/engine/`, `packages/web/src/apps/terminal/glyphs/` and `packages/web/test/terminal/engine/` only as their first files are written; `tsconfig.json` and `vitest.config.ts`'s `TEST_INCLUDE_GLOBS` already cover them: confirm, and change neither.
  - Baseline on `4a4f3b7`: `typecheck`, `content-check`, `token-check` and `site-check` (12 of 12 parts) exit 0. `npm test`: 1013 passed, 2 failed, both the traceability self-checks (`packages/web/test/self-check.test.ts`, `tools/traceability/test/self-check.test.ts`) on the 66 uncovered `006-terminal` IDs. `npm run traceability`: `FAIL: 66 problems found.`, all `uncovered`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate, the token rename and the tokens, the font's advance, the shell's
general app fields, the Terminal's placement, site text, the spec list's build plumbing, the
engine's block types and the Terminal test helper

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: T003 comes first. No task that creates or changes UI may start
until it is done.

- [X] T003 Confirm the design gate in `specs/006-terminal/design/` (plan Constitution Check II): `wireframes.md` covers every state the spec's Design section lists, for both shells; `exports/` holds the 19 PNGs `README.md` lists, at 1440, 375, 320 and 568 px; the Penpot link is in `spec.md`, `design/README.md` and `design/review.md`; `review.md` reads `**Status**: Approved`, is signed by the owner, names commit `c34fd51` and 2026-10-27, and records that nothing traces macOS's Terminal, another terminal or a real device (FR-031, FR-054, SC-010). Write the result here.
  - Passes: `wireframes.md` has every desktop and mobile state of the spec's Design section; `exports/` holds the 19 PNGs `README.md` lists (12 at 1440 × 900 with the glass recipe, 5 at 375 × 812, one at 320 × 568, one at 568 × 320); the Penpot link is in all three files; `review.md` reads `**Status**: Approved`, signed by the owner, commit `c34fd51`, 2026-10-27, with the original look confirmed.
- [X] T004 Rename the design's proposed tokens before any code reads them (research R22), in `specs/006-terminal/design/README.md`'s Proposed tokens table only, changing no value: every `size.*` `dimension` becomes `sizing` and unitless (`size.terminal-blur` → `sizing`, `32`), `font.size.*` stays `fontSizes` and becomes unitless, the three `font.line-height.*` rows become `typography.terminal` (14 on 1.5), `typography.terminal-pocket` (12.5 on 1.52) and `typography.terminal-pocket-narrow` (12 on 1.5), `color.vim-match` and `color.vim-match-current` refer to new `color.base.amber-wash` (`#fcd34d33`) and `color.base.amber-wash-strong` (`#fcd34d6b`), `color.vim-status` to new `color.base.wash` (`#ffffff14`), `color.vim-band` and `color.terminal-sheen` to the existing `color.base.speck`, `color.base.sheen` is dropped, the semantic colors are marked for the `light` set, `command-line.max-length` stays `number`, and `breakpoint.pocket-narrow` (`dimension`, `375`) is added. Add one sentence above the table pointing to research R22. Commit it alone as `docs: rename the Terminal's tokens to the export's form (006)`.
- [X] T005 Add the Terminal's tokens to `packages/tokens/penpot/tokens.json` exactly as T004's table now lists them, in the hand-written export's form (base colors in the base set, semantic colors in `light` beside 005's shell colors, `sizing` and `fontSizes` unitless, `typography` composite tokens in the form `typography.cv-*` uses, `command-line.max-length` as `number` like `scale.open-start`, `breakpoint.pocket-narrow` as `dimension`). Run `npm run token-output` to regenerate `packages/tokens/src/tokens.generated.css` and `packages/tokens/src/tokens.generated.ts`, then `npm run token-check` (exits 0, no exception).
  - `token-check` passes. `packages/web/test/tokens.test.ts`'s "every token in the export is read" stays red until the Terminal's style sheets read the new tokens (T041, T055).
- [X] T006 [P] Add `"advance": 0.6` to the JetBrains Mono family in `packages/web/src/fonts/fonts.json` (research R13, contracts/site.md Fonts). Confirm 004's fonts check and `fonts-plugin.ts` ignore the field; change no font file.
- [X] T007 [P] Write the Terminal's core tests first, using a three-app fixture (`cv`, `terminal`, `about`) in `packages/os-core/test/helpers.ts`:
  - `packages/os-core/test/geometry.test.ts`, covers 006-terminal-FR-031: `placeWindow('terminal', windows, area, metrics)` with the CV at its first-load place in the 1440 × 764 area is `{ x: 640, y: 144, width: 760, height: 536 }` (640, 176 in the page, below 005's 32 px menu bar); with no window shown it is centered; at 1024 × 504 it is fitted with at least `firstTop` below it and never below the minimum; with the CV maximized, and with the CV minimized (none shown), and after About has cascaded; always whole pixels;
  - `packages/os-core/test/reducer.test.ts` and `packages/os-core/test/invariants.test.ts`, covers 006-terminal-FR-003: `open`, `close`, `minimize`, `restore`, `maximize`, `focusNext` and the invariants hold with three views, unchanged from two.
- [X] T008 Extend `@cv/os-core` after T007 (contracts/shell.md): `ViewId` becomes `'cv' | 'terminal' | 'about'` and `Metrics` gains `terminalWidth`, `terminalHeight`, `terminalMargin` and `terminalOffset` in `packages/os-core/src/types.ts`; `placeWindow` gains the Terminal's rule in `packages/os-core/src/geometry.ts` (size `terminalWidth × terminalHeight` fitted to the area with `firstTop` below it; with a shown window in front, `x = area.width − terminalMargin − width`, `y = front.y + terminalOffset`; with none, centered; then `clampMove`). The reducer is unchanged. T007 passes.
- [X] T009 Extend `packages/web/src/os/metrics.ts` after T005 and T008 (research R13, R22): `METRICS` gains the four placement values from `size.terminal-window-width`, `size.terminal-window-height`, `size.terminal-window-margin` and `size.terminal-window-offset`; a new `TERMINAL` export holds `maxLength` (`command-line.max-length`), `windowWidth`, `padding` (`size.terminal-padding`), `fontSize` (`font.size.terminal`) and `advance` (read from `fonts.json`'s JetBrains Mono family), with `columns = floor((windowWidth − 2 × padding) / (fontSize × advance))` computed once. No other module of the Terminal reads a token in script.
- [X] T010 [P] Add the Terminal's site text to `packages/web/src/site-text.ts` (contracts/shell.md, design/wireframes.md#site-text, contracts/commands.md Replies): `os.views.terminal: 'Terminal'`, and a `terminal` group with the greeting (desktop and phone lines, with `{name}` and `{label}` placeholders), the prompt's `guest`, the command line's name `Command`, the menu item `Clear output`, `commands[name]` (usage, one-line description, own help) for all 22 commands in `help`'s order, the aliases, `help`'s lead (desktop and phone), every reply of contracts/commands.md (unknown, no such path, file, folder, usage, `open`, `jq`, pipe), the empty-section pattern `The CV lists no {section}.`, the singular names for empty file names (`role`, `project`, `school`), `site`'s text, `specs`' lead and tail, the spec link pattern `{repository}/blob/main/specs/{folder}/spec.md`, the announcement patterns (`{command}: {count} {unit}`, units, `Now in {path}`, `Cleared`, the vim opening), the vim view's messages (desktop and phone), status labels and key help, the pocket case's `cv-os pocket`, and the key names (command keys; vim keys `Down`, `Up`, `Open or close fold`, `Search`, `Next match`, `Top`, `Bottom`, `Quit`; toolbar names `Command keys`, `Vim keys`). Section names reuse 004's `siteText.sections`. No CV fact and no design value.
  - Superseded 2026-10-29 (in part): the greeting's strings, by T124; the old parser's replies (`pipe-usage`, the "doesn't read piped input" reply, `jq`'s "only pretty-prints" and "is not JSON" replies, the old unknown reply's wording), by T173.
- [X] T011 Add the general app fields after T008 (contracts/shell.md, research R6) in `packages/web/src/apps/index.ts`: `App` gains optional `focusOnOpen`, `WindowTitle`, `menuItems` and `onClose`; `AppProps` gains `os: AppOs` with `AppOs = { shell: ShellName; open: (view: 'cv' | 'about') => void; exit: () => void }`. `APPS` stays `[cvApp]` until T056. Update `packages/web/src/apps/cv/app.tsx` and `CvApp.tsx` only as the new required prop needs (the CV app ignores `os`).
- [X] T012 [P] Extend `packages/web/test/focus.test.ts`, covers 006-terminal-FR-004: with a test app declaring `focusOnOpen`, a `window-title` or `mobile-title` focus target for its view focuses the first element matching the selector inside its content; when nothing matches, focus falls back to the title, as 005 sets. The CV app and About this site still focus their titles.
- [X] T013 Wire the fields into the shell after T011 (contracts/shell.md "Other changes"):
  - `packages/web/src/os/Os.tsx`: `isView` accepts `'terminal'`; `act` calls the closed app's `onClose` once, after the reducer applies `close` for its view, whatever started it;
  - `packages/web/src/os/shell-props.ts` gains `onHome` for mobile; `packages/web/src/shells/mobile/FullScreenView.tsx` passes it to `View`;
  - `packages/web/src/os/View.tsx` builds `os` for the content: `open(view)` dispatches `open` on desktop and `mobileOpen` on mobile; `exit()` dispatches `close` through `act` on desktop and calls `onHome` on mobile; `shell` is the rendered shell;
  - `packages/web/src/os/focus.ts` resolves `focusOnOpen` with the title fallback; T012 passes;
  - `packages/web/src/shells/desktop/TitleBar.tsx` renders `WindowTitle` in `.window-title` when given; the dock, menu title, Window menu and page title keep `name`;
  - `packages/web/src/shells/desktop/MenuBar.tsx` lists `menuItems` first in the focused window's own menu, then a separator, then 005's window commands; choosing one runs `run` and closes the menu with 005 FR-015's focus return.
  005's shell tests (`packages/web/test/shell/*.test.ts`) still pass unchanged.
- [X] T014 [P] Build the spec list's plumbing (research R10, contracts/site.md The spec list): `packages/web/scripts/spec-list.ts` exports `readSpecList(root)` (every `specs/<NNN-name>/spec.md` read with 001's `parseSpec`, `requirementsOf` and `specFeature` from `tools/traceability/src/`; entries `{ number, folder, name, status, requirements }` in numbered order; the name after `Feature Specification: `; a folder without a readable `spec.md` left out) and `specListPlugin()`, which resolves `virtual:cv-spec-list` to `export default <JSON>` and adds each `spec.md` to the watch list. Register the plugin in `packages/web/vite.config.ts` and `vitest.config.ts`. Declare the module's type in `packages/web/src/virtual-modules.d.ts`. The build fails with `site build failed: the spec list is empty` when the list is empty.
  - The build reads `specs/*/spec.md` now, so 004's repository copy (`packages/web/test/helpers/copy.ts`) copies each spec's `spec.md` too; without it every copy build failed with `the spec list is empty`. `readSpecList` on the repository gives 6 specs and 312 active requirements, as `npm run traceability` counts them.
- [X] T015 Write `packages/web/src/apps/terminal/data.ts` after T014: the only module importing `virtual:cv-spec-list`; exports `resume` and `siteData` from `@cv/content`, `specList`, and `cvJson = JSON.stringify(resume, null, 2)` (FR-055).
- [X] T016 [P] Write the output block types and builders in `packages/web/src/apps/terminal/engine/block.ts`, exactly as data-model.md's Result and output block sets: `Result`, `Block`, `Node` (`text`, `line`, `heading` with depth 1 or 2, `list`, `link`, `time`, `command` with `style: 'chip' | 'inline'`, `columns`, `rows`, `json`), `Tone`, `Announcement`, and small builders (`text`, `line`, `heading`, `list`, `link`, `time`, `command`) used by every command. No markup type exists.
- [X] T017 [P] Write `packages/web/test/terminal/engine/boundaries.test.ts` (no requirement ID; research R2, R23): scan every file under `packages/web/src/apps/terminal/engine/` and fail if one imports `react`, `react-dom`, `@cv/tokens`, a `.tsx` or `.css` file, or `../os/metrics.ts`, or names `document`, `window` or `navigator`.
- [X] T018 Write the Terminal test helper `packages/web/test/helpers/terminal.ts`, on 005's `test/helpers/shell.ts`: `openTerminal(page, shell)` (the dock item at 1440 × 900, or the home icon at 375 × 812 with touch), `typeLine(page, line)` (types into `input.command-line` and presses Enter), `runGroup(page, line)` (types it and returns the new `section.run`'s locator), `groupText(group)` (004's `axText` of `.run-output`), `vimView(page)`, and `fixtureBuild(name)` (a build with a `packages/web/test/__fixtures__/*.json` CV, through 004's fixture build path). Used by every browser test below.

**Checkpoint**: Foundation ready: the shell gives apps the fields the Terminal needs, the tokens and
site text exist, and the spec list reaches the bundle.

---

## Phase 3: User Story 1 - Explore the CV by typing commands (Priority: P1) 🎯 MVP

**Goal**: On desktop, the Terminal opens from the dock in a glass window with a greeting and a
focused command line. Visitors run `help`, every CV command, `open`, `history`, `clear` and `exit`,
get suggestions for mistyped commands and usage replies, click commands to run them, recall them
with the arrows, and open the CV's JSON in the read-only vim view with `cv`.

**Independent Test**: build, open `/` at 1440 × 900, open the Terminal from the dock, run `help`,
then every CV command it lists, and compare each output with the CV document and with `/cv`. Run
`wrok`, run a command by clicking its name, run `cv`, open a fold, search, try `i`, and `:q`.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T019 [P] [US1] Write `packages/web/test/terminal/engine/parse.test.ts`:
  - covers 006-terminal-FR-007: ` HELP `, `work\t`, `help   work`, tabs and capitals parse to the same command and arguments; an empty or blank line is `{ kind: 'empty' }`;
  - covers 006-terminal-FR-018: the parser builds no block node from typed text except `text`; `<b>hi</b>` stays one word;
  - covers 006-terminal-FR-057: `cat cv.json | jq` is two stages with input passed on; `ls | work` gets the "doesn't read piped input" reply naming `work`; `ls |`, `| jq` and `ls || jq` are `pipe-usage`; `$(ls)`, `` `ls` `` and `;` are plain words, never run.
  - Superseded 2026-10-29: the parser's tests (the "doesn't read piped input" reply, `pipe-usage`, `;` and `$(…)` as plain words), by T140, which deletes the file and moves the cases that still hold to T143, T145 and T154.
- [X] T020 [P] [US1] Write `packages/web/test/terminal/engine/help.test.ts`, covers 006-terminal-FR-008: `COMMANDS` names exactly the 22 commands of FR-008, with `whoami`, `experience` and `?` as aliases of `about`, `work` and `help`; every name and alias is lower case and unique; `help`'s rows list every name and alias as a `command` node and nothing else; 200 generated words not in the table parse as unknown; `help work` gives `work`'s own help.
  - Superseded 2026-10-29 (in part): "200 generated words parse as unknown", as the parser goes, by T155 and T159.
- [X] T021 [P] [US1] Write `packages/web/test/terminal/engine/cv-output.test.ts`:
  - covers 006-terminal-FR-009: on the `every-field`, `nothing-optional`, `partial-dates`, `non-ascii` and `three-projects` fixtures, `about`, `work`, `projects`, `education`, `skills`, `languages`, `interests` and `contact` show the fields of `CV_FIELDS` in order, absent fields with no label, dates as 004's `format/dates.ts` writes and dates them (`time` nodes, ongoing as `Present`), the location as 004's `format/location.ts` writes it, and links named as 004 FR-012 and FR-013 name them; `CV_FIELDS` matches 004's `expectedFields` (`tools/site-check/src/expected.ts`) on `every-field`;
  - covers 006-terminal-FR-010: changing one fact in a fixture CV changes the output, with no other edit (as 004's `one-edit.test.ts`);
  - covers 006-terminal-FR-011: on `empty-sections`, each empty section's command gives `The CV lists no {section}.` with no heading or list, and `help` still lists it.
- [X] T022 [P] [US1] Write `packages/web/test/terminal/engine/suggest.test.ts`, covers 006-terminal-FR-016: `wrok` → `work`, `hlep` → `help`, `proj` → `projects`, `experiance` → `experience`, `WROK` → `work` (capitals free), `sudo`, `rm`, `mkdir` → none; `l` → `?`, `ls` (distance, then `help` order); `mv` → `cv`; `cta` → `cat` (words of 3 letters or fewer reach names 1 edit away only); `cl` → `cv`, `cd`, `clear` (a prefix match sorts by its own distance, after nearer names); at most 3; an alias and its command count once, the chip running the name that matched.
- [X] T023 [P] [US1] Write `packages/web/test/terminal/engine/replies.test.ts`:
  - covers 006-terminal-FR-016: the unknown reply names the word exactly as typed, says it is not a command and holds a `help` control, then the suggestions as chips, or only `help`;
  - covers 006-terminal-FR-017: `work 2020`, `cat`, `open` alone, `vim` alone and `help work extra` get `{command} takes {what}. Usage: {usage}`.
  - Superseded 2026-10-29 (in part): the unknown reply's old wording, by T145 and T159 (FR-016 as amended).
- [X] T024 [P] [US1] Write `packages/web/test/terminal/engine/json.test.ts`:
  - covers 006-terminal-FR-055: `cvJson` equals `JSON.stringify(resume, null, 2)` and `packages/content/resume.json`'s text without its final line break, and the printer's text parses to the CV with every key in order;
  - covers 006-terminal-FR-056: 2-space indents; key order kept, integer-like keys (`{"2":1,"1":2}`) included; numbers kept as written (`1.50`, `1e3`); token classes `key`, `string`, `number`, `literal`, `punctuation`; top-level folds with key, start and end; `jq .` accepted; `jq .work` gets the "only pretty-prints" reply; `{` alone, `cat about | jq` and `jq readme` get `jq: {path or |} is not JSON.`.
  - Superseded 2026-10-29 (in part): `jq .work`'s "only pretty-prints" reply and the "is not JSON" cases, by T157 and T159 (FR-056 as amended).
- [X] T025 [P] [US1] Write `packages/web/test/terminal/engine/vim.test.ts`:
  - covers 006-terminal-FR-060: every key of data-model.md's transition table (`h` `j` `k` `l`, arrows, `w` `b`, `0` `$`, `gg` `G`, `{` `}`, Page Up and Page Down, `:12`, `:set nu`, `:set nonu`) moves as set, skipping closed folds as one line; `i`, `a`, `o`, `x`, `dd`, `p`, `:w`, `:wq`, `:w!` and `:x` change nothing and set `read-only`; `:foo` sets `unknown` naming `foo`; Escape cancels `/`, `:` and a pending `g`, `z` or `d`; a Ctrl, Alt or Meta key is ignored; the text never changes and the cursor is never inside a closed fold;
  - covers 006-terminal-FR-061: on opening, each top-level object or array is one closed fold and everything else is open; `za`, `zo`, `zc`, `zR`, `zM` and `{ fold: n }` toggle, open, close, open all and close all;
  - covers 006-terminal-FR-062: `/REST` Enter finds every match case-insensitively across the file, opens the fold holding the current one, `n` and `N` move between them with wrap, a missing word gives `not-found` and the cursor stays;
  - covers 006-terminal-FR-064: `:help` opens the split; the first `:q` closes it, the second returns `'quit'`; `:q!` likewise.
- [X] T026 [P] [US1] Write `packages/web/test/terminal/engine/session.test.ts`:
  - covers 006-terminal-FR-020: Up and Down step newest first, Down past the newest restores the saved draft, Up with no history changes nothing; empty lines don't enter `history`;
  - covers 006-terminal-FR-021: `reset()` empties entries, history, folder, draft, scroll and `vim`; `run('cv')` sets `vim` and appends its entry only on `'quit'`.
- [X] T027 [P] [US1] Write `packages/web/test/terminal/engine/commands.test.ts`:
  - covers 006-terminal-FR-058: `vim cv.json` and `cat cv.json | vim -` return `open-vim` with the JSON rows and folds; `vim nowhere`, `vim -` with nothing piped and `vim` alone give their replies without `open-vim`;
  - covers 006-terminal-FR-059: `cv`'s result equals running `cat cv.json | jq | vim -`, with that pipe on the source; `help` describes `cv` with that pipe;
  - covers 006-terminal-FR-014: `open cv` and `open about` return the `os` action; `open settings` gives `open takes cv or about.` with both as controls.
- [X] T028 [P] [US1] Write the first cases of `packages/web/test/terminal/engine/files.test.ts`, covers 006-terminal-FR-045: `resolve` handles relative names, `.`, `..`, `~`, `~/x`, `/x` and capitals from the home folder; `..` and `../..` at home stay home; `formatPath([])` is `~`. `cat cv.json` shows `cvJson` as a text block (covers 006-terminal-FR-055).
- [X] T029 [P] [US1] Extend `packages/os-core/test/apps.test.ts`, covers 006-terminal-FR-001: `appsFor` on a `[cv, terminal]` declaration list with both shells returns `[cv, terminal]` in order for `desktop` and `mobile`.
- [X] T030 [P] [US1] Write `packages/web/test/terminal/open.test.ts`:
  - covers 006-terminal-FR-001: the dock and the home screen show CV, then Terminal; the Terminal declares both shells and no network need;
  - covers 006-terminal-FR-002: on first load at 1440 only the CV window is open, at 375 the home screen with nothing open; after 5 s nothing else has opened;
  - covers 006-terminal-FR-003: the window moves, resizes, minimizes, maximizes, restores and closes as 005's CV window does, through 005's helpers; it opens at 640, 176 in front of the CV window; at 375 it opens full screen with the header and Home;
  - covers 006-terminal-FR-004: from the dock, the Window menu, `Alt+Shift+N`, a dock restore and the home screen, `document.activeElement` is `input.command-line`, its window or view is named `Terminal…`, and its name is `Command`.
- [X] T031 [P] [US1] Write `packages/web/test/terminal/menu.test.ts`, covers 006-terminal-FR-003 and 006-terminal-FR-019: with the Terminal focused, the menu bar's app menu is titled `Terminal` and holds `Clear output` first, a separator, then 005's window commands; `Clear output` removes every run and the greeting and returns focus to the command line.
  - Superseded 2026-10-29 (in part): "`Clear output` removes the greeting", by T122 (FR-005 as amended).
- [X] T032 [P] [US1] Write `packages/web/test/terminal/command-line.test.ts`:
  - covers 006-terminal-FR-006: typing `Help ` and Enter adds a `section.run` whose `h2` reads `Help ` exactly, then `help`'s output, then an empty prompt;
  - covers 006-terminal-FR-007: Enter on an empty line adds a prompt and no message, and nothing to `history`;
  - covers 006-terminal-FR-017: `maxlength` equals `command-line.max-length` (500); typing and pasting 600 characters keeps 500; a 500-character line wraps inside the window;
  - covers 006-terminal-FR-018: `<b>hi</b>`, `<img src=x onerror=alert(1)>` and a URL echo as text, with no `b`, `img` or `a` created and no dialog; a pasted `help\nwork` becomes `help work` and nothing runs until Enter.
- [X] T033 [P] [US1] Write `packages/web/test/terminal/output.test.ts`:
  - covers 006-terminal-FR-005: the greeting holds the design's site text with the fixture CV's name and label, then 5 chips that run `help`, `about`, `work`, `projects` and `cv`; with the `no-name` fixture it shows the site heading;
  - covers 006-terminal-FR-019: output stays until `clear`, `Clear output` or closing; the wheel scrolls `.terminal-screen`, never the document; after `help` the run's heading is at the top of the view; after `pwd` the new prompt is in view; scrolled up, a control moves the view to the new run.
  - Superseded 2026-10-29 (in part): the greeting case of FR-005, by T121.
- [X] T034 [P] [US1] Write `packages/web/test/terminal/controls.test.ts`, covers 006-terminal-FR-015: every control in the greeting, `help`, the unknown reply and `open`'s reply runs its line on click, Enter and Space, as typed (in the output and in `history`), and focus returns to the command line; each control is a `button` named by its full line (SC-001: every CV section within 2 clicks of the greeting).
  - Superseded 2026-10-29 (in part): the greeting's controls and "within 2 clicks of the greeting", by T122.
- [X] T035 [P] [US1] Write `packages/web/test/terminal/history.test.ts`, covers 006-terminal-FR-020: after `work` and `skills`, Up twice gives `work`, Down gives `skills`, Down again the saved draft; Up with no history changes nothing; `history` lists the commands oldest first, numbered from 1.
- [X] T036 [P] [US1] Write `packages/web/test/terminal/state.test.ts`, covers 006-terminal-FR-021: minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep the output, history, draft, scroll position and an open vim view's cursor, folds and search; closing (control, menu, `Alt+Shift+W`, `exit`) and reopening starts afresh with the greeting.
  - Superseded 2026-10-29 (in part): "starts afresh with the greeting", by T122.
- [X] T037 [P] [US1] Write `packages/web/test/terminal/requests.test.ts`, covers 006-terminal-FR-022 (SC-007): opening the Terminal and running every command `help` lists, at 1440 and 375 px, requests only `127.0.0.1`; `localStorage`, `sessionStorage`, IndexedDB and cookies are empty afterwards; a new page shows nothing typed before.
- [X] T038 [P] [US1] Write `packages/web/test/terminal/open-command.test.ts`, covers 006-terminal-FR-014: `open cv` with the CV closed opens it focused in front; with it behind, brings it to the front; `open about` opens About this site; at 375 `open cv` opens the CV full screen; `exit` closes the window on desktop and focus lands on the Terminal's dock item when it was the only window (US1 scenario 10, US5 scenario 7).
- [X] T039 [P] [US1] Write `packages/web/test/terminal/vim.test.ts`:
  - covers 006-terminal-FR-056: `cat cv.json | jq` shows colored rows whose text equals the plain printed text, with no vim view;
  - covers 006-terminal-FR-058: the view fills the window's content, with line numbers, a status line holding `NORMAL`, the name, `[RO]`, `json`, line and column and position, and a message line;
  - covers 006-terminal-FR-059: the status line shows `cat cv.json | jq | vim -`;
  - covers 006-terminal-FR-060: `Ctrl+D`, `Ctrl+F` and `Ctrl+U` reaching the page aren't `defaultPrevented`;
  - covers 006-terminal-FR-061: a fold line is a `button` with `aria-expanded`, toggled by click, Enter and Space, at least 24 × 24 px;
  - covers 006-terminal-FR-062: `/REST` Enter makes matches `mark`s, the current one with `aria-current="true"` and an outline, and the message reads `match 1 of {n}`;
  - covers 006-terminal-FR-063: with the `long-words` fixture, in a 400 px window, no horizontal scroll; a wrapped line's second row starts 2 characters past its first row's text; its number shows on the first row only;
  - covers 006-terminal-FR-064: `:q` and the `:q` chip restore the output with `cv` after its prompt and a new prompt, focus in the command line; the `:help` chip opens the split.
- [X] T040 [P] [US1] Write `packages/web/test/terminal/site-text.test.ts`, covers 006-terminal-FR-030: every value under `siteText.terminal` is English and holds no key fact of the real CV (004's check); every text node of the rendered Terminal after `help`, `work` and `cv` is CV text, spec list text or site text; every character of `siteText.terminal` is inside the served subsets' `unicodeRange` (research R16).
- [X] T041 [P] [US1] Write `packages/web/test/terminal/design.test.ts`, and extend `packages/web/test/tokens.test.ts`, covers 006-terminal-FR-031: the output and command line use the mono token's family; the window opens at 760 × 536 at 640, 176 at 1440 × 900; the glass's computed background, `backdrop-filter` and rim come from the tokens; the icon, prompt mark, clock and cursor are the committed SVG components or CSS boxes; no Apple or system UI font is named; `tokens.test.ts` asserts every token T005 added is read by a style sheet or by `metrics.ts`.

### Implementation for User Story 1

- [X] T042 [P] [US1] Write the parser in `packages/web/src/apps/terminal/engine/parse.ts` (research R7, data-model.md Command line and call): line breaks to spaces, split on `|` into stages (`pipe-usage` for an empty side), split each stage on runs of spaces and tabs, look the lower-cased first word up in `COMMANDS` names and aliases, keep arguments as typed. No quotes, escapes, variables or globs. T019 passes.
  - Superseded 2026-10-29: the Terminal's own parser, by T140, which deletes it, and T144's shell adapter.
- [X] T043 [P] [US1] Write `packages/web/src/apps/terminal/engine/suggest.ts` (research R8): optimal string alignment distance on lower-case words, over every name and alias; a name qualifies at distance 1 or 2, or only 1 when the typed word has 3 letters or fewer; a command whose name begins with a typed word of 2 letters or more qualifies too, counted at its own distance; sorted by distance then `help` order; an alias and its command once, by the nearer name; at most 3. T022 passes.
- [X] T044 [P] [US1] Write `packages/web/src/apps/terminal/engine/cv.ts` (research R4, data-model.md CV fields per section): `CV_FIELDS` for `basics`, `contact`, `work`, `projects`, `education`, `skills`, `languages` and `interests`, in `/cv`'s order; one block builder per section and per entry (entries as `heading` depth 1 when the command shows one section), using 004's `format/dates.ts` and `format/location.ts` through `RunContext` (so the engine imports no component), `time` nodes for dates, `link` nodes named by 004's labels, and the empty-section line (FR-011). The per-entry builders are exported for `cat` (T064). T021 passes.
- [X] T045 [P] [US1] Write `packages/web/src/apps/terminal/engine/json.ts` (research R11, data-model.md JSON rows): a lexer (never `JSON.parse`) that checks structure and returns `{ rows, folds }` or `{ error: 'not-json' }`, with 2-space indents, keys and numbers as written, and each top-level object or array's first and last line. T024 passes.
- [X] T046 [P] [US1] Write `packages/web/src/apps/terminal/engine/vim.ts` (research R12, data-model.md Vim view): `VimSource`, `VimState`, `openVim(source)` with top-level folds closed, and `vimReducer(state, input)` handling every row of the transition table, returning `'quit'` on `:q` without the help split. T025 passes.
- [X] T047 [US1] Write `packages/web/src/apps/terminal/engine/files.ts`'s first part (research R9, data-model.md File system): `FsNode`, `Folder`, `File`, `Path`; `buildFileSystem(resume, specs, builders)` returning, for now, the home folder holding `cv.json` only (`text: cvJson`, `show` its text); `resolve(path, from)` and `formatPath(path)` as FR-045 sets. T028's cases pass.
- [X] T048 [US1] Write `packages/web/src/apps/terminal/engine/commands.ts` after T042 to T047 (research R7, contracts/commands.md): `COMMANDS` with all 22 rows in `help`'s order (`args`, `readsInput` true for `jq` and `vim` only, aliases), `RunContext` (site text, formatters, `TERMINAL.columns`, the file system, the working folder, history), and `runLine(line, context)` that pipes stages (each output's `text` the next one's `input`; "doesn't read piped input" for others). Implement `help` (table rows of `command` controls, the output block carrying `data-req="006-terminal-FR-008"` through its renderer node; `help <command>`), `about`, `work`, `projects`, `education`, `skills`, `languages`, `interests`, `contact` (from T044), `cv` (runs `cat cv.json | jq | vim -`), `cat` (a file's `show()`; `cat cv.json` its text; no such path; a folder), `jq` (path or input, `.` only), `vim` (path or `-` with input; `open-vim`), `open`, `history`, `clear`, `exit`, the unknown reply with suggestions and the usage reply. `site`, `specs`, `ls`, `cd` and `pwd` give their usage until T060 and T065 (they are listed by `help` from the start). T020, T023 and T027 pass.
  - Superseded 2026-10-29 (in part): `runLine`, `readsInput`, the engine's own `jq` and its pipe handling, by T140 and T142.
- [X] T049 [US1] Write the session store in `packages/web/src/apps/terminal/session.ts` (research R5, data-model.md Terminal session): `createSession()` with `entries`, `history`, `folder`, `draft`, `stepping`, `scrollTop`, `vim` and `announcement`; writers `run(line)`, `step(direction)`, `setDraft`, `clear()`, `vim(input)`, `saveScroll` and `reset()`; one store per page, read with `useSyncExternalStore`; nothing written to storage (FR-022); the prompt's `hh:mm` stored with each entry from `Date` (research R17). T026 passes.
- [X] T050 [P] [US1] Draw the Terminal's own glyphs as `aria-hidden` SVG components in `currentColor`: `packages/web/src/apps/terminal/TerminalIcon.tsx` (the dock and home screen icon, as the design draws it), `packages/web/src/apps/terminal/glyphs/PromptMark.tsx` (`❯`) and `packages/web/src/apps/terminal/glyphs/Clock.tsx` (`◷`) (research R16, FR-031). External links reuse 004's `src/cv/Arrow.tsx`.
- [X] T051 [US1] Write `packages/web/src/apps/terminal/Output.tsx` after T048: renders every `Node` kind (headings at the run's level + depth, `ul` lists, `a` links with 004's `Arrow`, `<time datetime>`, `button.command-chip` and `button.command-inline` named by `aria-label` = the full line with `data-req="006-terminal-FR-015 006-terminal-FR-034"` (plus FR-016 for suggestions, FR-048 for path replies, FR-050 for `ls` names), `columns`, `rows`, `json` rows as token spans with `data-req="006-terminal-FR-056"`), every string as a React text child.
- [X] T052 [US1] Write `packages/web/src/apps/terminal/CommandLine.tsx` (research R15, contracts/terminal.md): `form.prompt-line` with the `aria-hidden` `span.prompt` (`guest`, path, `◷ hh:mm` on desktop, `❯`; `data-req="006-terminal-FR-027 006-terminal-FR-046"`), a visually hidden `label` `Command`, `input.command-line` (`type=text`, `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="go"`, `maxlength={TERMINAL.maxLength}`, `data-focus-home`, `data-req` as contracts/terminal.md lists), Enter submits with `preventDefault`, Up and Down step history, a `paste` handler turning line breaks to spaces, Tab, Escape and every modified key left alone; and `span.cursor-mirror` (`aria-hidden`, `data-req="006-terminal-FR-032"`) drawing the text and a steady block at `selectionStart`, with `caret-color: transparent` on the input.
- [X] T053 [US1] Write `packages/web/src/apps/terminal/VimView.tsx` after T046 (research R12, contracts/terminal.md The vim view): `section.vim` named `{file} (read only)`; `div.vim-text` (`tabindex=0`, `role=document`, `aria-readonly`, `aria-roledescription` from site text, `aria-describedby` the status line, `data-focus-home` while open) handling only unmodified printable keys, Escape, Page Up and Down, Home, End and the arrows, never Tab; `div.vim-line` grids with an `aria-hidden` `span.vim-number` on the first row and `span.vim-code` carrying `--indent` for FR-063's wrap; `button.vim-fold` with `aria-expanded`; search `mark`s with `aria-current` on the current one; `div.vim-help`; `div.vim-status`; `div.vim-message` with `input.vim-entry` for `/` and `:` and the `:help` and `:q` chips; every `data-req` contracts/terminal.md lists.
- [X] T054 [US1] Write `packages/web/src/apps/terminal/Terminal.tsx` after T049, T051, T052 and T053 (contracts/terminal.md Structure): `div.terminal` (`data-shell-look`, `data-req` as listed), a visually hidden `h1` `Terminal`, `div.terminal-screen` (the scroll container) holding `div.greeting` (site text with `basics.name` and `basics.label`, or the site heading without a name; 5 chips), `section.run` per entry (`aria-labelledby` its `h2.run-command` with the `aria-hidden` `span.prompt`, carrying `data-req="006-terminal-FR-027 006-terminal-FR-046"`, and the line as typed) with `div.run-output`, and the prompt line; or `section.vim` in its place while `vim` is set. A control or `:q` runs through `session.run` and refocuses the command line; after each run, scroll the screen as research R14 sets (`scrollTop`, never `scrollIntoView`) and save it on scroll; `os` results call `props.os.open` and `props.os.exit`.
  - The scroll position is kept per shell (`shellScroll` in data-model.md), as a pixel offset fits only the width it was taken at; a minimized window gets its position back when shown, and `focus.ts` focuses an app's own `focusOnOpen` target with `preventScroll`, so the shell's focus move doesn't scroll the output to the command line (T036).
  - Superseded 2026-10-29 (in part): `div.greeting` with the name and label, by T123.
- [X] T055 [P] [US1] Write `packages/web/src/apps/terminal/terminal.css` (design/README.md The glass, wireframes.md design values): the glass window (`backdrop-filter` blur, tint, sheen, rim and top light from `--token-…`), the title bar part of the glass, `typography.terminal` text, padding, prompt colors, chips (26 px) and inline controls (24 px rows), tones, JSON token colors, the vim view's grid, status and message lines, fold lines, matches and the wrap of FR-063 (`white-space: pre-wrap`, `overflow-wrap: anywhere`, `padding-inline-start: calc(var(--indent) + 2ch)`, `text-indent: -2ch`); output wraps with `overflow-wrap: anywhere`; no horizontal scroll. Import it where 005 imports app styles into the one `os` style sheet.
- [X] T056 [US1] Declare the Terminal in `packages/web/src/apps/terminal/app.tsx` after T054 and T050 (contracts/shell.md): `id: 'terminal'`, `name` from `siteText.os.views.terminal`, both shells, `needsNetwork: false`, `Icon: TerminalIcon`, `Content` rendering `Terminal`, `focusOnOpen: '.terminal [data-focus-home]'`, `WindowTitle` (a `span` with `data-req="006-terminal-FR-046"` reading `Terminal — {path}`, or `Terminal — vim` while the view is open), `menuItems: [Clear output]` (its menu item element carrying `data-req="006-terminal-FR-003 006-terminal-FR-019"` through 005's menu item rendering), and `onClose: session.reset`. Add it to `packages/web/src/apps/index.ts` as `APPS = [cvApp, terminalApp]`, and add `data-req="006-terminal-FR-001"` to the Terminal's dock item and home icon through the app declaration. Run `npm run build`: the `os` script is still one file with no import (005 R14). T029 to T041 pass.

**Checkpoint**: The Terminal works on desktop: every CV command, `help`, suggestions, history,
`clear`, `exit`, `open` and the vim view. This is the MVP.

---

## Phase 4: User Story 2 - Learn how the site was built (Priority: P2)

**Goal**: `site` says what the site is and how it was built, with the repository link; `specs`
lists every spec in the repository, read at build time, with its number, name, status, active
requirement count and link.

**Independent Test**: at 1440 px wide, run `site` and `specs`. The text says what the site is and
how it was built, the repository link leads to the repository, and `specs` matches
`npm run traceability`'s view of `specs/`.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T057 [P] [US2] Write `packages/web/test/spec-list.test.ts`, covers 006-terminal-FR-013: on a fixture repository in a temporary directory (an approved spec, a draft, one with a removed requirement, a folder without `spec.md`), `readSpecList` gives numbered order, names, statuses and active counts equal to 001's `runCheck`; on the real repository it equals `npm run traceability`'s per-spec counts; an empty `specs/` fails the build with `site build failed: the spec list is empty`.
- [X] T058 [P] [US2] Extend `packages/web/test/terminal/engine/commands.test.ts`, covers 006-terminal-FR-013: on a fixture spec list, `specs` shows the lead with `{n}`, one row per spec with number, name as a link to `{repository}/blob/main/specs/{folder}/spec.md`, the status in words and `{n} requirements`, then the tail with the repository link; `site` ends with `Source code, specs and history:` and the repository link from `siteData`; both hold no CV fact typed by hand.
- [X] T059 [P] [US2] Write `packages/web/test/terminal/specs.test.ts`, covers 006-terminal-FR-013: on the real build, `specs` lists every folder of `specs/` with a `spec.md` in numbered order, and each link's `href` is the pattern above; a build from a temporary copy of the repository with one more spec shows it with no change to the Terminal.

### Implementation for User Story 2

- [X] T060 [US2] Implement `site` and `specs` in `packages/web/src/apps/terminal/engine/commands.ts` (contracts/commands.md), from site text, `siteData.repository` and `RunContext.specs` (passed from `data.ts`'s `specList`), with the `specs` output block carrying `data-req="006-terminal-FR-013"` through its renderer node. Export both block builders for `readme` and spec files (T064). T057 to T059 pass.

**Checkpoint**: The site's story and the spec list are in the Terminal.

---

## Phase 5: User Story 3 - Browse the CV as files (Priority: P3)

**Goal**: `ls`, `cd`, `cat` and `pwd` browse a read-only file system holding the same CV as the
named commands, and the site, with names made from the CV and controls that make it readable
without typing.

**Independent Test**: at 1440 px wide, run `ls`, `cd` into each folder, `ls` it and `cat` every
file, and compare each output with the matching named command. Try a missing path, `cd` into a
file and `cat` a folder.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T061 [P] [US3] Extend `packages/web/test/terminal/engine/files.test.ts`:
  - covers 006-terminal-FR-012: on every fixture, the tree holds every section of the CV, and `ls`, `cd`, `cat` and `pwd` reach all of it; every section is also shown by its named command;
  - covers 006-terminal-FR-043: the home folder lists `cv.json`, `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme`, `specs/` in that order; on `empty-sections` the empty ones are left out; entries keep the CV's order and specs numbered order; folders end in `/`;
  - covers 006-terminal-FR-044: `fileName` lower-cases, strips accents (`non-ascii`), keeps letters and digits and turns every other run into one hyphen, trimmed; two roles at one company get `-<start year>`, then `-2`, `-3` in order; an empty result becomes the singular site text; the same CV gives the same names twice;
  - covers 006-terminal-FR-047: on every fixture, `cat` on each entry's file equals the named command's block for that entry; `cat about`, `contact`, `skills`, `languages`, `interests` and `readme` equal `about`, `contact`, `skills`, `languages`, `interests` and `site`; a spec's file equals its `specs` row;
  - covers 006-terminal-FR-049: `rm`, `mkdir`, `touch`, `mv` and `sudo` get the unknown reply; the tree is deep-equal before and after a scripted run of every command.
  - Superseded 2026-10-29 (in part): the FR-049 case (`rm`, `mkdir`, `touch`, `mv` and `sudo` get the unknown reply), by T174 and T175 (FR-049 as amended).
- [X] T062 [P] [US3] Extend `packages/web/test/terminal/engine/commands.test.ts` and `replies.test.ts`:
  - covers 006-terminal-FR-046: `pwd` shows `~`, and `~/work` after `cd work`; `cd`, `cd ~`, `cd /` and `cd ..` go home;
  - covers 006-terminal-FR-048: `cat nothing-here`, `cat work/nowhere`, `cd about`, `cat work`, `vim work` and `ls about` give FR-048's replies with the path as typed and `cat` or `ls` as controls; `ls about` lists that file alone.
  - Superseded 2026-10-29 (in part): "`cd /` and `cd ..` go home", by T138 (FR-045 as amended).
- [X] T063 [P] [US3] Write `packages/web/test/terminal/files.test.ts`:
  - covers 006-terminal-FR-043: folder names differ from files by their trailing slash, with color removed (computed style forced to one color);
  - covers 006-terminal-FR-046: after `cd work` the next prompt and the window title read `~/work` (`Terminal — ~/work`);
  - covers 006-terminal-FR-021: after `cd work`, minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep `~/work` in the prompt and in `pwd`; closing and reopening starts at `~`;
  - covers 006-terminal-FR-050: each name in `ls`'s output runs `ls ~/{folder}` or `cat ~/{path}` as typed; a search over controls from `ls` reaches and reads every file without typing.

### Implementation for User Story 3

- [X] T064 [US3] Complete `buildFileSystem` in `packages/web/src/apps/terminal/engine/files.ts` (research R9, data-model.md table): `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme` and `specs/` in the design's order, left out when empty as the table sets, each file's `show` the matching builder from T044 and T060; `fileName(value)` (NFD, combining marks removed, lower case, `[^a-z0-9]+` → `-`, trimmed, empty → singular site text) and the clash rule. T061 passes.
- [X] T065 [US3] Implement `ls`, `cd` and `pwd`, and FR-048's replies for `cat`, `cd`, `ls` and `vim`, in `packages/web/src/apps/terminal/engine/commands.ts` (contracts/commands.md): `ls` returns a `columns` block of `command` controls (`ls ~/{path}` for folders, ending in `/` with tone `folder`; `cat ~/{path}` for files) with the output carrying `data-req="006-terminal-FR-043 006-terminal-FR-050"`; `cd` returns `{ kind: 'cd' }`; `pwd` its path. In `session.ts`, `cd` sets `folder`; the prompt and `WindowTitle` show `formatPath(folder)`. T062 and T063 pass.

**Checkpoint**: The file system is complete and browsable by typing and by clicking.

---

## Phase 6: User Story 4 - Use the pocket terminal on a phone (Priority: P4)

**Goal**: On mobile, the Terminal is a pocket terminal of the site's own design: a recessed screen,
8 big command keys that become vim keys in the vim view, and room for the on-screen keyboard.

**Independent Test**: at 375 × 812 with touch, open the Terminal from the home screen, run `help`
and two CV commands with its keys and chips without typing, open `cv` and use its vim keys, and go
home. Repeat at 320 × 568 and 568 × 320.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T066 [P] [US4] Write `packages/web/test/terminal/pocket.test.ts`:
  - covers 006-terminal-FR-024: at 375 the Terminal is a `div.pocket` with its case, screen and keys; the command line, output and controls cases of T032, T033 and T034 also run at 375 with touch (`describe.each` over both shells);
  - covers 006-terminal-FR-025 (SC-001): by taps alone, from the greeting and the keys, every CV section, `site`, `specs` and every file is reached (a search over controls), each CV section within 2 taps and `help`, `about`, `work`, `projects` and `cv` in 1 key tap; in `pocket-keyboard` the command line and the last output are inside the visual viewport;
  - covers 006-terminal-FR-051: 8 keys in the design's order (`help`, `about`, `work`, `projects`, `skills`, `cv`, `ls`, `clear`), each a `button` named by its command, at least 44 × 44 px, each running its command; the toolbar is one Tab stop and Left, Right, Home and End move between keys;
  - covers 006-terminal-FR-052 (SC-012): at 320 × 568, 375 × 812, 568 × 320, 812 × 375 and 1023 × 700, the screen and keys fit below the header with no horizontal scroll and the output scrolls inside the screen; at 200% text zoom no key is cut off;
  - covers 006-terminal-FR-053: after a tap on the command line and the page made 300 px shorter at the same width, `data-keyboard` is set, the keys are hidden and the command line and newest output are visible; restoring the height brings the keys back;
  - covers 006-terminal-FR-054: the case is `aria-hidden`, holds no focusable element and none of its text is in the accessibility tree; with reduced motion a pressed key changes no `transform`;
  - covers 006-terminal-FR-058 and 006-terminal-FR-063 (US4 scenario 4): at 375 × 812 and 320 × 568 with touch, the `cv` key opens the vim view filling the pocket's screen, with line numbers, the status line and the message line; with the `long-words` fixture at 320 × 568, every line wraps inside the screen with no horizontal scroll, each continuation starts 2 characters past its line's text, and the number shows on the first row only;
  - covers 006-terminal-FR-066: with the vim view open the keys are `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `:q`, named `Down` to `Quit`, at least 44 × 44, acting on the view; after `:q` the command keys are back; a tap on a fold line toggles it.
  - Superseded 2026-10-29 (in part): "from the greeting", by T122.
- [X] T067 [P] [US4] Extend `packages/web/test/terminal/controls.test.ts`, covers 006-terminal-FR-015: at 375 with touch, a tapped chip or key leaves the command line focused with `inputmode="none"` (no keyboard), and a tap on the command line itself removes it; `exit` on mobile shows the home screen with focus on the Terminal icon (US4 scenario 6).

### Implementation for User Story 4

- [X] T068 [P] [US4] Write `packages/web/src/apps/terminal/useOnScreenKeyboard.ts` (research R15): while the command line has focus, a `visualViewport` `resize` that makes the visual viewport shorter at the same width reports the keyboard open; losing focus or the viewport growing back reports it closed.
- [X] T069 [US4] Write `packages/web/src/apps/terminal/Pocket.tsx` after T068 (contracts/terminal.md The pocket terminal, research R18): `div.pocket` (`data-keyboard` from the hook, `data-req="006-terminal-FR-024 006-terminal-FR-025 006-terminal-FR-052 006-terminal-FR-053"`) holding `div.pocket-case` (`aria-hidden="true"`, `data-req="006-terminal-FR-054"`: power light, `cv-os pocket`, grille, `basics.name`), the `Terminal` in its screen, and `div[role=toolbar].pocket-keys` (`aria-label` `Command keys` or `Vim keys`, `data-req="006-terminal-FR-051 006-terminal-FR-066"`) of 8 `button.pocket-key` with roving focus (Left, Right, Home, End). A command key runs through the same path as a command control; a vim key sends its key to the vim view and keeps focus in it; `/` focuses `input.vim-entry`. In `app.tsx`, `Content` wraps `Terminal` in `Pocket` when `os.shell` is `mobile`. The greeting, `help`'s lead and the vim messages use the phone's site text there, and the prompt drops the time.
  - The case is two `aria-hidden` parts, `div.pocket-case` (light and brand) above the screen and `div.pocket-foot` (grille and name) after the keys, so the page holds them in the order they are seen with no grid placement (004 FR-027's layout test); contracts/terminal.md is updated. When the keyboard opens, the screen scrolls to the command line (FR-053).
- [X] T070 [US4] In `packages/web/src/apps/terminal/Terminal.tsx` and `CommandLine.tsx`, a control or key activated by touch sets `inputmode="none"` on the command line before focusing it, and the next pointer down on the command line removes it (research R15, FR-015).
- [X] T071 [P] [US4] Write `packages/web/src/apps/terminal/pocket.css` (research R18, design values): the case in the glass with `radius.pocket`, the recessed screen (`radius.pocket-screen`, `flex: 1`, its own scroll), `typography.terminal-pocket` and `-pocket-narrow` below `@media (--token-breakpoint-pocket-narrow)`, keys of `size.pocket-key` (52) or `size.pocket-key-narrow` (48) in 4 columns below the screen in portrait, 2 columns of 4 to its right in `@media (orientation: landscape)` at 44 px or more, max widths, `[data-keyboard]` hiding the keys, a pressed state that only changes color under reduced motion. T066 and T067 pass.

**Checkpoint**: The Terminal works on phones, by taps alone.

---

## Phase 7: User Story 5 - Use the Terminal with a keyboard or a screen reader (Priority: P5)

**Goal**: Keyboard users are never trapped and keep every shell shortcut. Screen reader users hear
the Terminal and its command line, hear each output once (in full or summarized), move by heading
through runs and entries, and hear the vim view's state.

**Independent Test**: at 1440 px with the keyboard alone, open the Terminal from the dock, run
three commands, recall one, run one from `help`, leave with Tab and each shell shortcut, and
close it. With a screen reader, run `pwd` and `work` and move by heading.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T072 [P] [US5] Write `packages/web/test/terminal/engine/announce.test.ts`, covers 006-terminal-FR-028: rows counted at `TERMINAL.columns`; `pwd` → its text in full; `work` on a 4-entry fixture → `work: 4 entries`; `help` → `help: 22 commands` (aliases not counted); `ls` → `ls: 11 entries` on `every-field` (files and folders together); a 5-row output in full, a 6-row one summarized.
- [X] T073 [P] [US5] Extend `packages/web/test/fonts.test.ts`, covers 006-terminal-FR-028: in Chromium, the served JetBrains Mono's measured advance width equals `fonts.json`'s `advance` (0.6) within 0.001 em, so the desktop column count is right.
- [X] T074 [P] [US5] Write `packages/web/test/terminal/screen-reader.test.ts`:
  - covers 006-terminal-FR-027: the command line's accessible name is `Command`; the prompt is `aria-hidden`; each run's heading name is the command as typed, with no prompt;
  - covers 006-terminal-FR-028: after Enter, `.terminal-status` holds the announcement once, focus stays in the command line, and scrolling earlier output doesn't change it; `cd work` announces `Now in ~/work`; `clear` announces `Cleared`;
  - covers 006-terminal-FR-029: one `h1` `Terminal`; an `h2` per run; in `projects` and `work` an `h3` per entry, with no section heading between; no level skipped (004's `ax.ts`); lists are `ul`, links `a`, controls `button`s named by their line; the reading order follows the boxes on screen.
- [X] T075 [P] [US5] Write `packages/web/test/terminal/keyboard.test.ts`, covers 006-terminal-FR-026: Tab from the command line moves focus on and leaves its value unchanged; Shift+Tab comes back; `Alt+Shift+D` and `Alt+Shift+M` from the command line reach the dock and the menu bar; Ctrl and Alt key events reaching the page aren't `defaultPrevented`; Escape leaves the typed text.
- [X] T076 [P] [US5] Extend `packages/web/test/terminal/vim.test.ts`, covers 006-terminal-FR-065: on opening, focus is on `.vim-text`, named and read only; the status region announces the file's name, read only, the line count and `:q`; a message change is announced once; fold lines expose `aria-expanded`; Tab moves to the chips, then out of the Terminal, and Shift+Tab back.

### Implementation for User Story 5

- [X] T077 [P] [US5] Write `packages/web/src/apps/terminal/engine/announce.ts` (research R13): `rows(block, columns)` (a text node `ceil(length / columns)` rows; each list item, heading and line at least 1) and `announce(command, block, columns, text)` returning `{ full }` up to 5 rows or the counted summary with its unit. In `engine/commands.ts`, `runLine` fills each output `Result`'s `announce` from it; `cd` gives `Now in {path}`. T072 passes.
- [X] T078 [US5] In `packages/web/src/apps/terminal/session.ts` and `Terminal.tsx`, write each run's announcement, `Cleared`, the vim view's opening message and each vim message change to a visually hidden `div.terminal-status[role=status]` (`data-req="006-terminal-FR-028"`), replaced each time with a counter so the same text is announced twice, never on scroll (research R13). Confirm `CommandLine.tsx` and `VimView.tsx` handle no Tab and no modified key, and that opening the vim view moves focus to `.vim-text` and `:q` back to the command line. T073, T074, T075 and T076 pass.
  - Confirmed: the status region replaces its one child per announcement (keyed by the counter), `CommandLine.tsx` handles only unmodified Up and Down and `VimView.tsx` no Tab and no modified key. `.vim-text` now also carries `aria-label` `{file} (read only)`, so the focused element is named (contracts/terminal.md updated).

**Checkpoint**: The Terminal is fully operable by keyboard and announced as FR-028 sets.

---

## Phase 8: User Story 6 - Reduced motion, high contrast and larger text (Priority: P6)

**Goal**: Nothing blinks or types out; with reduced motion nothing moves or scales; with forced
colors every part is visible; with reduced transparency the glass is solid; every control is big
enough; output wraps at every size and zoom.

**Independent Test**: with reduced motion, open the Terminal in both shells and run commands;
with forced colors, check every part is visible; at 200% text zoom and 400% zoom on a 1280 px
window, nothing is cut off or scrolls sideways.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T079 [P] [US6] Write `packages/web/test/terminal/motion.test.ts`, covers 006-terminal-FR-032 (SC-008): a command's whole output is in the frame after Enter; the cursor has no animation at 0 and 6 s; with reduced motion, sampled frames while opening, running commands and pressing pocket keys show no `transform` or `scale` change, in both shells.
  - Superseded 2026-10-29 (in part): "the cursor has no animation at 0 and 6 s", by T191 (FR-032 as amended).
- [X] T080 [P] [US6] Write `packages/web/test/terminal/modes.test.ts`, covers 006-terminal-FR-033: with forced colors the window, chips, keys, fold lines and command line have visible borders, the cursor uses `Highlight`, focus outlines show, and no element relies on a background image or color alone; with `prefers-reduced-transparency: reduce` the window is solid `color.shell-surface` with no `backdrop-filter`.
  - Superseded 2026-10-29 (in part): "the command line has a visible border" in forced colors, by T192 (FR-072).
- [X] T081 [P] [US6] Write `packages/web/test/terminal/targets.test.ts`, covers 006-terminal-FR-034: every control in every FR-035 state of both shells is at least 24 × 24 px, pocket keys at least 44 × 44, fold lines at least 24 × 24.
- [X] T082 [P] [US6] Write `packages/web/test/terminal/accessibility.test.ts`, covers 006-terminal-FR-035: axe (WCAG 2.2 A and AA tags) finds nothing in each FR-035 state of both shells (just opened, after `help`, the vim view folded, with a fold open and a search, and with its key help, after an unknown command, after `ls`, inside a folder after `cat`, after `clear`, a long command typed; on desktop after `specs`, the Terminal menu open, minimized, maximized, two windows; pocket portrait and landscape, keyboard open, vim keys); 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep every part visible with no clipping or overlap.
- [X] T083 [P] [US6] Write `packages/web/test/terminal/layout.test.ts`, covers 006-terminal-FR-023: with the `long-words` fixture, in a 400 px wide window and at 320 px, the output has no horizontal scroll and long words and URLs wrap; `ls` on a long folder at 320 px wraps names one per line; a mouse drag selects output text and copies it, and focus doesn't move to the command line; at 200% text zoom `cv`'s lines wrap within the window (US6 scenario 4).

### Implementation for User Story 6

- [X] T084 [US6] Add the modes to `packages/web/src/apps/terminal/terminal.css` and `pocket.css` (research R19): under `prefers-reduced-transparency: reduce` and `forced-colors: active`, drop `backdrop-filter`, sheen and rim; in forced colors use `Canvas`, `CanvasText`, a solid border, outlined chips, keys and fold lines, the cursor block in `Highlight`, and the current match outlined; under `prefers-reduced-motion: reduce` the pressed key only changes color. The cursor never animates. T079 and T080 pass.
  - The pocket's mode rules moved into `pocket.css`, which loads after `terminal.css` and otherwise won. Forced colors also outline the command field, and give the cursor block a block-end border in `Highlight` (the site check's modes part flags a filled box with no border; on an inline box it moves no text).
  - Superseded 2026-10-29 (in part): "the cursor never animates" and the one cursor style in forced colors, by T171 and T195 (FR-032 and FR-033 as amended).
- [X] T085 [US6] Fix any target, wrap or zoom failure T081, T082 and T083 find in `terminal.css`, `pocket.css` or the components, with tokens only (`size.terminal-control-row`, `size.terminal-chip`, `size.pocket-key*`). Record each fix here. T081, T082 and T083 pass.
  - Fixes: the command field and every Terminal link get `min-block-size: size.terminal-control-row` (they were 19–21 px and 18 px; links stay `inline-block` with `max-inline-size: 100%` so they still wrap); `ls` names stack one a line below `breakpoint.pocket-narrow` (spec edge case); axe: `role=document` allows no `aria-readonly`, so `.vim-text` drops it and keeps its `{file} (read only)` name; vim keys are named `{key}, {name}` (`gg, Top`) for WCAG 2.5.3, as axe drops a parenthesized key; the key help, which scrolls, is a focusable named region. contracts/terminal.md and research R12 are updated. Zoom at 200% and 400% gets the phone shell; the check of clipping and overlap is the Terminal's own (scrolled-out output and the home screen behind a full-screen view are not overlaps).

**Checkpoint**: The Terminal holds WCAG 2.2 AA in every state, with every mode.

---

## Phase 9: User Story 7 - Use the Terminal offline (Priority: P7)

**Goal**: After one online visit to `/` or `/cv`, the Terminal opens offline in both shells and
every command gives the online output, with no offline message.

**Independent Test**: visit `/` once, go offline, open the Terminal at 375 and 1440 px and run
every command `help` lists; each output equals the online one.

### Tests for User Story 7 (REQUIRED) ⚠️

- [X] T086 [P] [US7] Write `packages/web/test/terminal/offline.test.ts`, with 005's `test/helpers/offline.ts`, covers 006-terminal-FR-036 (SC-006): after one visit to `/`, and separately to `/cv` only, `/` offline at 375 and 1440 px opens the Terminal in the site's fonts (`document.fonts` loaded, no fallback face), every command `help` lists gives the same group text as online, and no offline message shows.

### Implementation for User Story 7

- [X] T087 [US7] Confirm the Terminal needs nothing new offline (research R21, contracts/site.md Output): the `os` script and style sheet hold the Terminal and the spec list, the service worker's precache list and version follow them, and no command fetches. Fix only what T086 finds, in `packages/web/src/apps/terminal/` (never in the service worker unless the precache list misses a Terminal file). T086 passes.
  - Confirmed with nothing to fix: the build's one `os` script and style sheet hold the Terminal and the spec list, the service worker precaches them, T086 passes after `/` and after `/cv` only, and `requests.test.ts` sees no request but `127.0.0.1`. The shell has no offline message of its own; T086 checks for no alert and nothing about the network in the shell's status region.

**Checkpoint**: The Terminal works offline, in both shells.

---

## Phase 10: User Story 8 - Every pull request proves the Terminal works (Priority: P8)

**Goal**: The site check covers the Terminal: its content in both shells, its states in
accessibility, fonts, layout and modes, its keyboard flow, offline use and requests, with failures
naming shell, state, width and command.

**Independent Test**: break one thing at a time in a copy of the build (drop `work`'s end date, a
project's file, Tab caught by the command line, the command line's name, the owner's email in site
text) and see the matching check fail with the line contracts/cli.md shows.

### Tests for User Story 8 (REQUIRED) ⚠️

- [X] T088 [P] [US8] Extend `tools/site-check/test/shell-states.test.ts`, covers 006-terminal-FR-038: every Terminal state of contracts/cli.md (15 desktop, 12 mobile) is reached by real input on the real build; the summary lists `/` under `accessibility` in every Terminal state at both widths.
- [X] T089 [P] [US8] Write `tools/site-check/test/terminal.test.ts`:
  - covers 006-terminal-FR-040 (SC-003, SC-011): the `terminal` part passes on the real build, with expected fields read from the CV document (a temporary CV with an extra work entry still passes); copies where `work` drops the end date, a project has no file, or the vim view drops a line fail with `missing-field`, `missing-file` and `json-mismatch` lines naming the command, field and shell, or the folder and entry, as contracts/cli.md shows;
  - covers 006-terminal-FR-009: on the real build, every CV command's output in both shells matches `terminalFields(resume, command)`;
  - covers 006-terminal-FR-010: a copy with the owner's email typed into `siteText.terminal` fails `npm run content-check`, naming the file and line (US8 scenario 3);
  - covers 006-terminal-FR-013: a spec folder added in a temporary copy of the repository shows in `specs` after the build.
- [X] T090 [P] [US8] Extend `tools/site-check/test/keyboard.test.ts`, covers 006-terminal-FR-039: the Terminal's flow passes on the real build; a copy where the command line catches Tab fails with `trapped input.command-line`; a copy whose `exit` sends focus to `body` fails with `focus-target`, naming the step.
  - It found two real indicator faults, fixed in `terminal.css`: the vim text's and help's outline was drawn outside boxes that fill the view, so it was cut off (now inside, one thin border wider, since an inside band loses its corners); and `scroll-padding-block` on the screen, so a command line brought back into view keeps room for its outline. The flow closes the CV window first, so `exit` has no next window and focus goes to the Terminal's dock item (contracts/terminal.md). FR-019 keeps a new output's start in view, so each command line step scrolls the focused line into view before measuring, as typing would.
- [X] T091 [P] [US8] Extend `tools/site-check/test/offline.test.ts`, covers 006-terminal-FR-041: a copy whose `os` script isn't precached fails the Terminal's offline run at both widths, naming the shell and width.
- [X] T092 [P] [US8] Extend `tools/site-check/test/other-sites.test.ts`, covers 006-terminal-FR-038: `other-sites` records the Terminal's commands in both shells; a copy whose Terminal fetches an outside URL on `help` fails, naming the shell.
- [X] T093 [P] [US8] Extend `tools/site-check/test/cli.test.ts`, covers 006-terminal-FR-042: the local command and the CI step are the same; every Terminal problem line names the shell, the state or command, and the width; two runs give the same result; the whole check stays within 005's time budget plus 3 minutes off CI.
  - The time budget case is in `tools/site-check/test/performance.test.ts`, which shares that file's one real run, not in `cli.test.ts`, which would start a second. A full `npm run site-check` took 129 s on 2026-10-29, inside 005's 480 s alone.
- [X] T094 [P] [US8] Extend `tools/site-check/test/shell.test.ts`, covers 006-terminal-FR-035 and 006-terminal-FR-038: a copy with the command line's name removed fails `accessibility` with `axe:label` in `desktop/terminal-open/1440px`; `layout` and `modes` pass on the real build with the Terminal's states and fail on copies with a fixed-width output and a blinking cursor.
  - The layout part found text reaching past the Terminal in the visually hidden status region (a 1 px box with a wider span): `horizontalScroll` and `boxScroll` now leave out text inside a box of 1 px or less, as the existing comment on that pattern says.

### Implementation for User Story 8

- [X] T095 [US8] Add the Terminal's states to `tools/site-check/src/shell-states.ts` (contracts/cli.md States): `terminal-open`, `terminal-help`, `terminal-vim`, `terminal-vim-search`, `terminal-vim-help`, `terminal-unknown`, `terminal-ls`, `terminal-cat`, `terminal-clear`, `terminal-long-command`, `terminal-minimized`, `terminal-maximized`, `terminal-two-windows`, `terminal-specs`, `terminal-menu`; `pocket`, `pocket-landscape`, `pocket-keyboard`, `pocket-vim`, `pocket-help`, `pocket-unknown`, `pocket-ls`, `pocket-cat`, `pocket-clear`, `pocket-long-command`, `pocket-vim-search`, `pocket-vim-help`; each reached from a fresh page by clicks, taps and typed keys, the search word read from the CV's first work summary.
- [X] T096 [P] [US8] Add `terminalFields(resume, command)` to `tools/site-check/src/expected.ts`, built from 004's `expectedFields` with the Terminal's differences (no section labels, no `/cv`-only links) written once (research R20).
- [X] T097 [P] [US8] Extend `tools/site-check/src/report.ts` (data-model.md Site check results): part `terminal` after `cv-app`; problem types `missing-field`, `out-of-order`, `json-mismatch`, `missing-file`, `extra-file`, `file-mismatch`, `offline-mismatch`; variants `<shell>/terminal/<command>/<width>px`, `<shell>/terminal/files/<width>px`, `<shell>/terminal/json/<width>px`, `desktop/terminal-keyboard/1440px`.
- [X] T098 [US8] Write `tools/site-check/src/parts/terminal.ts` after T095 to T097 (contracts/cli.md `terminal`): in each shell, run every CV command by typing it and compare each group's text, links and `<time datetime>` in order with `terminalFields`; compare `cat cv.json`, `cat cv.json | jq` and the vim view after `zR` with `JSON.stringify(resume, null, 2)` line by line; list every folder and `cat` every file, checking one file per entry and spec and that each matches the named command. Run it from `tools/site-check/src/check.ts` after `cv-app`. T089 passes.
- [X] T099 [US8] Extend the existing parts (contracts/cli.md Parts): `parts/accessibility.ts` runs axe in every Terminal state; `parts/keyboard.ts` adds FR-039's flow at 1440 × 900 (open from the dock, `help`, a command from its output with Enter, Up, `cv`, `j`, `za`, `:q`, Tab and Shift+Tab, `Alt+Shift+D`, Enter on the Terminal's dock item back to the command line, `exit`), checking the focus target and a visible indicator at each step; `parts/offline.ts` opens the Terminal offline after `/` and after `/cv` only, at 375 and 1440, runs every command `help` lists and compares each group's text with the online run; `parts/other-sites.ts` records requests while the Terminal opens and every command runs, in both shells; `parts/fonts.ts` adds `terminal-help` and `pocket-vim`; `parts/layout.ts` adds 320 × 568, 568 × 320, a 400 px window, 200% and 400% zoom and text spacing in `terminal-help`, `terminal-vim`, `pocket` and `pocket-vim`; `parts/modes.ts` adds the Terminal to the reduced motion and forced colors sequences. T088 and T090 to T094 pass.
  - Layout variants: sizes as `<shell>/<state>/<width>px` (`mobile/pocket/320px`, `mobile/pocket-vim/568px`), conditions as `<shell>/<state>-<condition>/<width>px` (`desktop/terminal-help-narrow-window/1440px`, `mobile/pocket-200%-zoom/640px`, `mobile/pocket-vim-400%-zoom/320px`, `desktop/terminal-vim-text-spacing/1440px`), since 320 × 568 and 400% zoom would otherwise share a name. Offline after the visit to `/cv` uses `<shell>/terminal-after-cv/<command>/<width>px`, as 005's `cv-app-after-cv`. `other-sites` uses the state the Terminal opens in: `desktop/terminal-open/1440px`, `mobile/pocket/375px`.

**Checkpoint**: Every pull request proves the Terminal in both shells.

---

## Phase 11: Polish & Constitution Verification

**Purpose**: Traceability, speed, the audits, the full verification, the owner's manual checks and
the single PR

- [X] T100 [P] Write `packages/web/test/terminal/data-req.test.tsx`, covers 006-terminal-FR-037: every target in contracts/terminal.md's `data-req` table carries its IDs in the rendered Terminal (desktop after `help`, `ls`, `specs`, `cd work` (the prompt and the window title), an unknown command, a missing path and with the vim view searched and its help open; mobile with the pocket and vim keys), and every `006-terminal-FR-###` in a `data-req` names an existing requirement.
  - It found that `cv` run inside a folder read `cv.json` from that folder and failed; `cv` now runs its pipe from the home folder (engine test added under FR-059).
- [X] T101 [P] Extend `packages/web/test/self-check.test.ts`, covers 006-terminal-FR-010, 006-terminal-FR-031 and 006-terminal-FR-037: `npm run content-check`, `npm run token-check` and `npm run traceability` pass on the repository with no exception or skip marker added for the Terminal.
  - Written in `packages/web/test/self-check.test.ts`; its first case stays red until `npm run traceability` passes, which needs Phase 10's tests to cover FR-038 to FR-042. Tick it once that passes.
  - Passes since Phase 10 (`npm test` on 2026-10-29).
- [X] T102 [P] Write `packages/web/test/terminal/performance.test.ts` (SC-002): for every command `help` lists, `cv` included, Enter to the output in the frame is under 100 ms at 1440 px, and under 300 ms with 4× CPU throttling over CDP.
  - Measured in the page, from the Enter key's event to the first frame after the output is in the document: desktop at 1440 px under 100 ms, the phone at 375 px with 4× CPU throttling under 300 ms, for every command `help` lists (Lighthouse's mobile profile slows the CPU 4×, as SC-002 names).
- [X] T103 Run `npm run traceability` after T100 (Constitution III, SC-009): it exits 0, its PASS line counts `006-terminal`'s 66 active requirements among the approved specs, and every row of Requirement Coverage below has a passing test. Record the PASS line here.
  - 2026-10-29: `PASS: all 312 active requirements in 6 approved specs are covered.` (006-terminal's 66 among them; 0 problems).
- [X] T104 [P] Verify research R21 (**Verify**): on the real build, the root's compressed script, style sheet and HTML are near 102 KB, 12 KB and 16 KB, and Lighthouse's mobile and desktop scores on `/` are 90 or more in every category (SC-005). If mobile Performance drops below 90, apply R21's fallbacks in order and measure again. Record both here.
  - 2026-10-29, gzip -9 of the real build: root script `os-*.js` 107 KB (estimate about 102), style sheet `os-*.css` 10.8 KB (about 12), `index.html` 6.4 KB (about 16). Lighthouse on `/`: mobile performance 98, accessibility, best practices, SEO and agentic browsing 100; desktop 100 in every category. `/cv`: mobile performance 99, the rest 100. No fallback needed.
- [X] T105 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/os-core/`, `packages/web/` and `tools/site-check/`:
  - **X**: no package added; the abstractions added are exactly plan.md's Dependencies table (add any helper this list created to it, with its reason); no agent skill added;
  - **IV**: `site-text.ts` holds no CV fact and no design value; no Terminal script reads a token outside `metrics.ts`; `data.ts` is the only importer of `virtual:cv-spec-list`; `cv.json` is never typed by hand;
  - **V**: the Terminal declares both shells beside its code; `os-core` gained only the view id and the placement; the shell changes are the general fields of contracts/shell.md, with no `'terminal'` special case in the shells;
  - **VII**: the desktop still opens with only the CV window; the Terminal is after the CV in the dock and on the home screen and never opens by itself; `/cv` is untouched;
  - **IX**: the icon, glyphs, case and colors are the design's own, with no Apple or system font.
  - 2026-10-29, against 005's merge (29d6ae8): **X** no change to any `package.json`, the lock file, `.claude/` or `skills-lock.json`; Phase 10 added no abstraction beyond plan.md's `terminal` part and `terminalFields` row (the other parts gained runs, not new modules). **IV** `site-text.ts` holds no CV fact (`content-check` passes) and no design value; no Terminal script imports `@cv/tokens` or calls `tokenValue`; `data.ts` is the only importer of `virtual:cv-spec-list` (beside its declaration and the plugin that serves it); no `cv.json` file exists, its text is `JSON.stringify(resume, null, 2)` at build. **V** the Terminal declares both shells in `apps/terminal/app.tsx`; `os-core` gained only the view id and `placeTerminal`; the shells have no `'terminal'` case (`Os.tsx`'s `isView` accepts it, as contracts/shell.md says). **VII** the desktop opens with only the CV window (state `first-load`), `APPS` is `[cvApp, terminalApp]`, and no file under `packages/web/src/cv` or `pages` changed. **IX** every Terminal font is JetBrains Mono, served; the icon and glyphs are the design's own; no Apple or system font.
- [X] T106 Run the full verification after T103 to T105: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with the `terminal` part in both shells and every Lighthouse category at 90 or more for `/` and `/cv` on both profiles (SC-005, SC-009).
  - 2026-10-29: `typecheck`, `content-check`, `token-check`, `traceability` and `site-check` exit 0 (site check: 13 of 13 parts, 129 s, Lighthouse as in T104). `npm test`: 1412 passed, 2 failed, both 005 keyboard tests whose expected lists predated the Terminal's keyboard variant; updated, they pass.
- [X] T107 Run quickstart.md scenarios 1 to 6 and record any deviation here. Write scratch output to the scratchpad. Scenario 4.3 edits files: revert each change with `git checkout`. Scenarios 7 to 9 are T108.
  - 2026-10-29, scripted with Playwright on the real build (scratch script, not committed). 1 and 2: as T106. 3: every step as written, the window at 640, 176, `/REST` 2 matches. Deviation in the text only: step 6's `exit` puts focus on the Terminal's dock item only when no other window is open; with the CV window open it goes to the CV window's title (contracts/terminal.md Focus, 005 FR-023), which is what the site check's flow relies on after closing the CV first. 4.1 and 4.2: as written, `specs` showing 001 to 006 with the counts `traceability` gives. 4.3: not done by editing the repository; the same case runs in `tools/site-check/test/terminal.test.ts` (a copy with one more work entry, and a copy with one more spec folder). 5: as written at 375 × 812, 320 × 568 and 568 × 320. 6: the site check's `offline` part, which does this in both shells after both visits, passes.
- [ ] T108 Owner action, by hand (quickstart 7 to 9, research R24): screen readers on a desktop (NVDA with Firefox or VoiceOver with Safari) and on a phone (VoiceOver or TalkBack) through stories 1, 3, 4 and 5, including the vim view in browse and focus mode (SC-004); real phone keyboards on iOS Safari and Android Chrome (FR-053); forced colors in Edge and reduced transparency (FR-033); and comparing every state with `design/exports/` (FR-031, SC-010). Record each result here and in the PR. Under the constitution's interim provision on deferred manual checks, the owner may defer them to the final testing phase: then record that here, list each one in the PR, and leave this task open.
  - DEFERRED 2026-10-29 by the owner to the final testing phase, under the constitution's interim provision on deferred manual checks, with 004's T105: the screen readers, the real phone keyboards, forced colors in Edge and reduced transparency, and the comparison with `design/exports/`. The PR lists each one. This task stays open until that phase records the results here.
- [X] T109 Commit the remaining work with Conventional Commits, merge 005 again if it changed (T001), push `006-terminal` and open one pull request to `main` once 005's has merged, so it holds only 006's changes (Constitution XI, research R1):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/006-terminal/spec.md` and `specs/006-terminal/tasks.md`; records the token rename (T004) and that the Terminal's tokens were written into the hand-written export under the interim provision on local mockups; and records the results of T104, T107 and T108, listing every manual check deferred under the interim provision on deferred manual checks.
  - Confirm the CI jobs run and pass, and that the `site` job summary matches a local `npm run site-check` on the same commit (FR-042). Merging is the owner's.
  - 2026-10-29: pushed (no rewrite) and opened PR #24. CI on e6a5fa0: content, tokens, traceability, test and site pass; the `site` job's summary is the local `npm run site-check`'s line for line, scores masked (and the scores themselves equal). Merging is the owner's, after T108.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001, then T002. No other task starts before T001: every path
  the Terminal changes exists only after 005 is merged in.
- **Foundational (Phase 2)**: after Setup. BLOCKS all user stories.
  - T003 first. T004 before T005, T005 before T009.
  - T007 before T008; T008 before T009 and T011.
  - T011 before T013; T012 before T013.
  - T014 before T015.
  - T006, T010, T016, T017 and T018 only need T003 (and T001).
- **Design gate**: every task that creates or changes UI (T013, T050, T051 to
  T056, T069 to T071, T078, T084, T085) depends on T003.
- **User Story 1 (Phase 3)**: after Foundational. The MVP; every later story builds on its
  Terminal (the engine, the session, the components and the app declaration).
- **User Story 2 (Phase 4)**: after US1 (it adds two commands to `commands.ts`).
- **User Story 3 (Phase 5)**: after US1 and US2: `readme` and the `specs/` folder show US2's
  `site` and spec row builders (T064 uses T060).
- **User Story 4 (Phase 6)**: after US1. Independent of US2 and US3, though its reachability
  test (T066, FR-025) expects `site`, `specs` and the file system: run it after US3, or
  accept that those cases fail until US3 is done.
- **User Story 5 (Phase 7)**: after US1. T074's `cd` case needs US3.
- **User Story 6 (Phase 8)**: after US1; its pocket states need US4, its `ls` and `cat` states
  need US3, and its `specs` state needs US2.
- **User Story 7 (Phase 9)**: after US1.
- **User Story 8 (Phase 10)**: after US1 to US7, since the check covers every state and command
  they add.
- **Polish (Phase 11)**: after every story.

### Within Each User Story

- Tests are written first and fail before implementation.
- Engine before components, components before the app declaration.
- Shared shell fields (Phase 2) before anything that uses them.
- Story complete before moving to the next priority.

### Parallel Opportunities

- Phase 2: T006, T007, T010, T012, T014, T016 and
  T017 touch different files and can run together after T003.
- US1 tests T019 to T041 are all [P]: different files.
- US1 engine modules T042, T043, T044, T045, T046 are [P]; T050 and T055
  are [P] with them.
- US3, US5 and US6 tests are [P] within their phase.
- US4's T068 and T071 are [P].
- US8's tests T088 to T094 are [P], and T096 and T097 are [P].
- Polish: T100, T101, T102, T104 and T105 are [P].

---

## Parallel Example: User Story 1

```bash
# Launch the engine tests together:
Task: "Write packages/web/test/terminal/engine/parse.test.ts (FR-007, FR-018, FR-057)"
Task: "Write packages/web/test/terminal/engine/suggest.test.ts (FR-016)"
Task: "Write packages/web/test/terminal/engine/json.test.ts (FR-055, FR-056)"
Task: "Write packages/web/test/terminal/engine/vim.test.ts (FR-060 to FR-062, FR-064)"

# Then the engine modules together:
Task: "Write packages/web/src/apps/terminal/engine/parse.ts"
Task: "Write packages/web/src/apps/terminal/engine/suggest.ts"
Task: "Write packages/web/src/apps/terminal/engine/cv.ts"
Task: "Write packages/web/src/apps/terminal/engine/json.ts"
Task: "Write packages/web/src/apps/terminal/engine/vim.ts"
Task: "Draw TerminalIcon.tsx and glyphs/"
Task: "Write terminal.css"
```

## Parallel Example: User Story 4

```bash
Task: "Write packages/web/test/terminal/pocket.test.ts (FR-024, FR-025, FR-051 to FR-054, FR-066)"
Task: "Extend packages/web/test/terminal/controls.test.ts (FR-015 on touch)"
Task: "Write packages/web/src/apps/terminal/useOnScreenKeyboard.ts"
Task: "Write packages/web/src/apps/terminal/pocket.css"
```

## Parallel Example: User Story 8

```bash
Task: "Extend tools/site-check/test/shell-states.test.ts (FR-038)"
Task: "Write tools/site-check/test/terminal.test.ts (FR-040)"
Task: "Extend tools/site-check/test/keyboard.test.ts (FR-039)"
Task: "Extend tools/site-check/test/offline.test.ts (FR-041)"
Task: "Extend tools/site-check/test/cli.test.ts (FR-042)"
Task: "Add terminalFields to tools/site-check/src/expected.ts"
Task: "Extend tools/site-check/src/report.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: merge 005 and record the baseline.
2. Complete Phase 2: Foundational, including the design gate (CRITICAL: blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: quickstart 3 on the real build at 1440 × 900.

### Incremental Delivery

1. Setup + Foundational → the shell gives apps the fields; tokens, site text and the spec list
   exist.
2. US1 → the Terminal on desktop (MVP).
3. US2 → `site` and `specs`.
4. US3 → the file system.
5. US4 → the pocket terminal.
6. US5 → keyboard and screen readers.
7. US6 → modes, targets, zoom.
8. US7 → offline.
9. US8 → the site check.

All stories ship in the feature's single PR (Constitution XI); the increments above are
checkpoints within it.

---

## Requirement Coverage

Every FR in spec.md as first built and the test task that covers it. The 2026-10-29 amendment's
coverage is in Amendment Requirement Coverage, at the end of this file.

| Requirement | Test task(s) |
|-------------|--------------|
| 006-terminal-FR-001 | T029, T030 |
| 006-terminal-FR-002 | T030 |
| 006-terminal-FR-003 | T007, T030, T031 |
| 006-terminal-FR-004 | T012, T030 |
| 006-terminal-FR-005 | T033, T121 |
| 006-terminal-FR-006 | T032 |
| 006-terminal-FR-007 | T019, T032 |
| 006-terminal-FR-008 | T020 |
| 006-terminal-FR-009 | T021, T089 |
| 006-terminal-FR-010 | T021, T089, T101 |
| 006-terminal-FR-011 | T021 |
| 006-terminal-FR-012 | T061 |
| 006-terminal-FR-013 | T057, T058, T059, T089 |
| 006-terminal-FR-014 | T027, T038 |
| 006-terminal-FR-015 | T034, T067 |
| 006-terminal-FR-016 | T022, T023 |
| 006-terminal-FR-017 | T023, T032 |
| 006-terminal-FR-018 | T019, T032 |
| 006-terminal-FR-019 | T031, T033 |
| 006-terminal-FR-020 | T026, T035 |
| 006-terminal-FR-021 | T026, T036, T063 |
| 006-terminal-FR-022 | T037 |
| 006-terminal-FR-023 | T083 |
| 006-terminal-FR-024 | T066 |
| 006-terminal-FR-025 | T066 |
| 006-terminal-FR-026 | T075 |
| 006-terminal-FR-027 | T074 |
| 006-terminal-FR-028 | T072, T073, T074 |
| 006-terminal-FR-029 | T074 |
| 006-terminal-FR-030 | T040 |
| 006-terminal-FR-031 | T007, T041, T101 |
| 006-terminal-FR-032 | T079 |
| 006-terminal-FR-033 | T080 |
| 006-terminal-FR-034 | T081 |
| 006-terminal-FR-035 | T082, T094 |
| 006-terminal-FR-036 | T086 |
| 006-terminal-FR-037 | T100, T101 |
| 006-terminal-FR-038 | T088, T092, T094 |
| 006-terminal-FR-039 | T090 |
| 006-terminal-FR-040 | T089 |
| 006-terminal-FR-041 | T091 |
| 006-terminal-FR-042 | T093 |
| 006-terminal-FR-043 | T061, T063 |
| 006-terminal-FR-044 | T061 |
| 006-terminal-FR-045 | T028 |
| 006-terminal-FR-046 | T062, T063 |
| 006-terminal-FR-047 | T061 |
| 006-terminal-FR-048 | T062 |
| 006-terminal-FR-049 | T061 |
| 006-terminal-FR-050 | T063 |
| 006-terminal-FR-051 | T066 |
| 006-terminal-FR-052 | T066 |
| 006-terminal-FR-053 | T066 |
| 006-terminal-FR-054 | T066 |
| 006-terminal-FR-055 | T024, T028 |
| 006-terminal-FR-056 | T024, T039 |
| 006-terminal-FR-057 | T019 |
| 006-terminal-FR-058 | T027, T039, T066 |
| 006-terminal-FR-059 | T027, T039 |
| 006-terminal-FR-060 | T025, T039 |
| 006-terminal-FR-061 | T025, T039 |
| 006-terminal-FR-062 | T025, T039 |
| 006-terminal-FR-063 | T039, T066 |
| 006-terminal-FR-064 | T025, T039 |
| 006-terminal-FR-065 | T076 |
| 006-terminal-FR-066 | T066 |

Success criteria: SC-001 T034, T066; SC-002 T102; SC-003 and SC-011
T089, T061; SC-004 T082 and T108; SC-005 T104, T106; SC-006
T086; SC-007 T037; SC-008 T079; SC-009 T101, T103, T093;
SC-010 T003, T108; SC-012 T066.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- The coverage table abbreviates nothing: test titles always carry the full `006-terminal-FR-###`
  form.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md). T004 is its own `docs:` commit, before any code.
- T108 is the owner's. T109 pushes and opens the PR; merging is the owner's.
- **Choices made here that the design documents don't fix**. If the owner prefers otherwise,
  change the plan or contract first:
  - **The file system grows by story** (T047, T064): US1 builds the home folder
    with `cv.json` only, because `cv` runs `cat cv.json | jq | vim -`; US3 adds every other file
    and folder, so its tests fail first.
  - **Where announcements are computed** (T077): `announce.ts` fills each `Result`'s
    `announce` inside `runLine`, so the command builders stay free of row counting.
  - **`specs.test.ts`** (T059) is a browser test file the plan's Project Structure
    doesn't list; it holds FR-013's real-build case, which the plan gives to the site check's
    `terminal.test.ts` too.

---

## Phase 12: Convergence

- [X] T110 After `:q` (or the `:q` chip), show the new `cv` run and the new prompt, with the command line fully in view, in `packages/web/src/apps/terminal/Terminal.tsx`. Today the restore effect (`[vimOpen, os.shell]`) runs after the scroll-to-new-run effect and puts back the old `scrollTop`, so at 1440 × 900 after `help`, `work`, `cv`, `:q` the focused command line sits at 700–724 px in a screen that ends at 711 px. Restore the saved position only when the session is shown again (Home, a shell switch, restoring a minimized window), not when the vim view closes and adds its run. Extend `packages/web/test/terminal/vim.test.ts` (covers 006-terminal-FR-064 and 006-terminal-FR-019): after a long output then `cv` and `:q`, the `cv` run's heading and the whole command line are inside `.terminal-screen`'s box, with focus in the command line. Per US1/AC16, FR-064, FR-019 (partial)
  - The restore effect now skips the render where the vim view closes, so the scroll to the new `cv` run stands; Home, a shell switch and a restored window still get the saved position. New test in `vim.test.ts`: after `help`, `work`, `cv` and `:q` at 1440 × 900, the `cv` heading and the command line are inside `.terminal-screen`, focus in the line (it failed before the fix with the heading at 971 px in a screen ending at 712).
- [X] T111 Let Enter and Space toggle the fold line under the cursor when focus is on `.vim-text`, in `packages/web/src/apps/terminal/VimView.tsx` (and `engine/vim.ts` if the reducer takes the key). Today `button.vim-fold` has `tabindex=-1` and the text's key handler ignores Enter and turns Space into a no-op, so a keyboard user can open a fold only with `za`. T039's test passes only because it calls `focus()` on the button from the script. Extend `packages/web/test/terminal/vim.test.ts` (covers 006-terminal-FR-061) so it reaches the fold by keyboard alone (`j` to the `"work"` fold line, then Enter, then Space, each changing `aria-expanded`), and `packages/web/test/terminal/engine/vim.test.ts` if the reducer changes. Keep Tab and every modified key unhandled (FR-065). Per FR-061 (partial)
  - The reducer takes `Enter` and Space: on a fold's first line they toggle it, elsewhere they do nothing; `VimView` passes Enter on (Tab and modified keys still aren't handled). The browser test now reaches the `"work"` fold with `j` and toggles it with Enter then Space, focus staying on `.vim-text`; the click test no longer focuses the button from the script. `engine/vim.test.ts` covers the reducer.
- [X] T112 Make `jq` treat only an argument that is `.` or starts with `.` and isn't a path as a filter, in `packages/web/src/apps/terminal/engine/commands.ts`. Today any argument starting with `.` gets the "only pretty-prints" reply, so `jq ./cv.json`, and `jq ../cv.json` from `~/work`, refuse a valid path (FR-045's `.` and `..`). For example: when the argument resolves to a file, read it as a path; otherwise any other `.`-filter gets the reply. Extend `packages/web/test/terminal/engine/json.test.ts` (covers 006-terminal-FR-056): `jq ./cv.json` and `jq ../cv.json` from `~/work` print the JSON, `jq .work` still gets the filter reply, and `jq ./nowhere` gets the no-such-path reply. Per FR-056, FR-045 (partial)
  - An argument is a filter only when it starts with `.`, isn't `.`, doesn't start with `./` or `../`, and names nothing in the tree. New case in `json.test.ts`: `jq ./cv.json`, and `jq ../cv.json` from `~/work`, print the JSON; `jq .work` gets the filter reply; `jq ./nowhere` the no-such-path reply.
  - Superseded 2026-10-29 (in part): `jq ./cv.json` read as a path, by T159, as `jq` now takes its first argument as the filter (FR-056 as amended).
- [X] T113 Give the counted announcements and the spec list a singular form for a count of 1, in `packages/web/src/site-text.ts` (`terminal.announce.units`, `terminal.specs.lead` and `terminal.specs.requirements`) and where they're filled (`session.ts` `announcementText`, `engine/commands.ts` `specsBlock` and `specRow`). With the real CV, `work` and `cat ~/work/<file>` are announced as `work: 1 entries` and `cat: 1 entries`. Extend `packages/web/test/terminal/engine/announce.test.ts` and `engine/commands.test.ts` (covers 006-terminal-FR-028 and 006-terminal-FR-013): a 1-entry section longer than 5 rows is announced as `work: 1 entry`, and a 1-spec list or 1-requirement spec reads in the singular. Put no new word in code (FR-030). Per FR-028, FR-030 (partial)
  - `terminal.announce.units`, `terminal.specs.lead` and `terminal.specs.requirements` are now `{ one, other }` pairs, and `counted(forms, n)` in `site-text.ts` picks one; the code holds no word. New cases: `work: 1 entry` (and `history: 1 line`) in `announce.test.ts`, and a 1-spec list with a 1-requirement spec in `commands.test.ts`.

---

## Phase 13: Convergence

- [X] T114 Make the `:q` and `:help` controls and the pocket's `:q` vim key quit or open help even while a `/` search or `:` command is being typed, in `packages/web/src/apps/terminal/VimView.tsx` (`chip`) and `packages/web/src/apps/terminal/Pocket.tsx` (`vimKey`): send `{ cancel: true }` before `{ key: ':' }` and the submit. Today the reducer ignores `:` while an entry is open, so the submit goes to the open entry: after `/`, the `:q` chip or key searches for `q` (`match 1 of 2` on a line holding two `q`s) and the view stays open; `:help` searches for `help`. Extend `packages/web/test/terminal/vim.test.ts` (covers 006-terminal-FR-064): type `/`, then click the `:q` chip, and the view closes with focus in the command line; type `/`, click `:help`, and the split opens. Extend `packages/web/test/terminal/pocket.test.ts` (covers 006-terminal-FR-066): tap the `/` key, then the `:q` key, and the command keys are back. per FR-064, FR-066, US1/AC16 (partial)
  - The `:help` and `:q` chips and the pocket's `:q` key now send `{ cancel: true }` before `{ key: ':' }`, so a `/` or `:` being typed is dropped first. New tests: in `vim.test.ts`, with `/` open the `:q` chip closes the view (focus in the command line) and the `:help` chip opens the help split; in `pocket.test.ts`, with `/` open the `:q` key quits and the command keys are back. All three failed before the fix.
- [X] T115 Expose `help`'s command rows, `specs`' spec rows and `history`'s numbered lines to assistive technology as lists (or as a table, if the design's columns need it), in `packages/web/src/apps/terminal/Output.tsx` (`Rows`) and `engine/commands.ts` (`history`). Today `rows` render as `div.out-rows` of `div.out-row` and `span.out-cell` with no role, and `history` as one `p` per command, so a screen reader hears 22 commands, the spec list and the history as a run of text with no item count. Keep the visual layout, the `data-req` on `.out-help` and `.out-specs`, the row count `announce.ts` uses, and the text the site check's `terminal` part reads. Extend `packages/web/test/terminal/screen-reader.test.ts` (covers 006-terminal-FR-029): after `help`, `specs` and `history`, each output's rows are list items (or table rows) in the accessibility tree, one per command, spec or history line; run `packages/web/test/terminal/accessibility.test.ts` and `npm run site-check` again. per FR-029, US5/AC5 (partial)
  - `rows` render as `ul.out-rows` of `li.out-row` (each row a `subgrid` of the list's columns, so the layout and the `.out-help`/`.out-specs` `data-req` stay); `history` is a `list` node with `req: 'history'`, drawn as `ul.out-history`, one `li` per line, with the same text, and `announce.ts` still counts its `lines`. New test in `screen-reader.test.ts`: after `help`, `specs` and `history`, each output is a `list` in Chromium's accessibility tree with a `listitem` per command (22), spec (one per spec folder) and history line (3). It failed before the change (`role: none`). `accessibility.test.ts` and the site check pass again.
- [X] T116 Show in the vim status line how far through the file the view is, not the cursor, in `packages/web/src/apps/terminal/VimView.tsx` (`position`): `All` when every shown line fits in `.vim-text`, `Top` when its first shown line is in view, `Bot` when its last is, else the percentage of lines above the view, as vim's ruler does and as `design/wireframes.md` draws it (`json  3,1  Top` on opening). Today `position` reads `cursor.line`, so `cv` opens on the first fold with `0%`, and `All` shows only for a one-line file. Compute it from the view's scroll after layout (and on scroll and resize), not in the engine. Extend `packages/web/test/terminal/vim.test.ts` (covers 006-terminal-FR-058): on opening `cv` at 1440 × 900 the status line ends in `All` or `Top` as the folded file fits or not; after `zR` and `G`, `Bot`. per FR-058, FR-031 (partial)
  - `position` now reads the laid-out `.vim-text`: lines above its top and below its bottom, `All`, `Top`, `Bot` or `above / (above + below)` as vim's ruler, measured after each render, on scroll and on resize (`ResizeObserver`). New test in `vim.test.ts`: on opening at 1440 × 900 `All` or `Top` as the folded file fits or not (it fits: `All`), `Top` after `zR`, `Bot` after `G`, a share between 30 and 70 % scrolled halfway, `Top` after `gg`. The FR-058 opening test now reads `.vim-scroll` itself: its old pattern matched `3,10%` as `10%`. The same joined status text broke `state.test.ts`'s `vimState` (`30,35` and `21%` read as `30,3521`); it now reads `.vim-position`. Then `typecheck`, `content-check`, `token-check`, `traceability` and `npm test` (1426 tests) pass, and `npm run site-check` passes 13 of 13 parts in both shells, Lighthouse 98 to 100.
- [X] T117 Give the greeting's name line a site text pattern for a CV with a name and no label, in `packages/web/src/site-text.ts` (`terminal.greeting`, beside `name: '{name} — {label}'`) and `packages/web/src/apps/terminal/Terminal.tsx`. Today `Terminal.tsx` fills `{name} — {label}` with an empty label and strips the separator with `.replace(/ — $/, '')`, a copy of the design's separator in code that silently stops working if the site text changes. Pick the pattern by whether `basics.label` is present; put no word or separator in code. Extend `packages/web/test/terminal/output.test.ts` (covers 006-terminal-FR-005 and 006-terminal-FR-030): with a fixture CV that has a name and no label, the greeting's name line is the name alone, with no trailing separator. per FR-005, FR-030 (partial)
  - `terminal.greeting.nameAlone` (`'{name}'`) beside `name`; `Terminal.tsx` picks it when `basics.label` is missing or empty, and the `.replace(/ — $/, '')` is gone. New test in `output.test.ts` with the `three-projects` fixture (a name, no label): the name line is `nameAlone` filled, the name alone.
  - Superseded 2026-10-29 (in part): the greeting's name line, by T121, T123 and T124 (FR-005 as amended).

---

## Phase 14: Convergence

- [X] T118 Keep every letter and digit in a file's name, not only ASCII ones, in `packages/web/src/apps/terminal/engine/files.ts` (`fileName`): after NFD and removing combining marks, lower-case the value and turn each run of characters that aren't letters or digits (`[^\p{L}\p{N}]+` with the `u` flag) into one hyphen, trimmed, with the singular site text when nothing is left. Today `[^a-z0-9]+` drops every letter that doesn't decompose to ASCII, so `Łódź Tech` becomes `odz-tech`, `Straße GmbH` `stra-e-gmbh`, `Øresund AB` `resund-ab`, and a name in Cyrillic or another script becomes the fallback `role`, which then clashes with every other such entry. Name matching stays case-insensitive (FR-045), so a typed `Łódź-tech` still finds `łódź-tech`. Extend `packages/web/test/terminal/engine/files.test.ts` (covers 006-terminal-FR-044): `Łódź Tech` → `łódź-tech`, `Straße GmbH` → `straße-gmbh`, `Øresund AB` → `øresund-ab`, a Cyrillic name keeps its letters, `Café Ünïcode` still → `cafe-unicode`, and `cat ~/work/łódź-tech` and `cat ~/work/ŁÓDŹ-TECH` both show the entry. Run `tools/site-check/test/terminal.test.ts` and `npm run site-check` again, since the `terminal` part lists every file. per FR-044 (partial)
  - `fileName` keeps `[\p{L}\p{N}]` after NFD and removing marks; names are matched through the same folding (`folded`), so capitals and accents typed or not both find a file. Letters that decompose still lose their accent, so `Łódź Tech` is `łodz-tech` (`ó` and `ź` decompose, `Ł` doesn't), not `łódź-tech` as written above; `łódź-tech`, `ŁÓDŹ-TECH` and `Łodz-Tech` all find it, `lodz-tech` doesn't. New tests in `files.test.ts`: `straße-gmbh`, `øresund-ab`, Cyrillic, CJK and full-width digits kept, `cafe-unicode` and `istanbul` unchanged.
- [X] T119 Leave `about` and `contact` out of the home folder whenever their commands would say the CV lists nothing for them, in `packages/web/src/apps/terminal/engine/files.ts` (`buildFileSystem`). Today `has()` there counts any object as shown, so a CV whose `basics` holds only an empty `location` (`{}`), or only profiles with no shown field (`[{}]`), gets `about` and `contact` files whose `cat` prints `The CV lists no basics.` and `The CV lists no contact details.`. Decide by the same rule the builders use, for example by whether `aboutBlock` and `contactBlock` give the empty-section line (or by 004's `locationLine` and the profile rule in `contactBlock`), with no second copy of the rule. Extend `packages/web/test/terminal/engine/files.test.ts` (covers 006-terminal-FR-043): with `basics: { location: {}, profiles: [{}] }` the home folder lists neither `about` nor `contact`, and `about` and `contact` still say the CV lists nothing; a `basics` with only a city still gets `about`. per FR-043, FR-011 (partial)
  - `cv.ts` splits `aboutLines` and `contactLines` out of `aboutBlock` and `contactBlock`; `buildFileSystem` lists each file only when its lines aren't empty, and `has()` is gone. New test in `files.test.ts` with `basics: { location: {}, profiles: [{}] }` and with a city alone.
- [X] T120 Give piping into `vim <path>` the "doesn't read piped input" reply, in `packages/web/src/apps/terminal/engine/commands.ts` (`vim`): only `vim -` reads input (FR-057). Today `ls | vim cv.json` opens `cv.json`, drops what `ls` printed, and shows `ls | vim cv.json` as the pipe in the status line. When `call.input` isn't null and the argument isn't `-`, reply with `replies.noInput` naming `vim` as typed, without opening the view. Extend `packages/web/test/terminal/engine/parse.test.ts` or `engine/commands.test.ts` (covers 006-terminal-FR-057): `ls | vim cv.json` gets the reply naming `vim` and returns no `open-vim`; `cat cv.json | vim -` and `cv` still open the view with their pipe. per FR-057 (partial)
  - `vim <path>` with piped input gives `replies.noInput` naming `vim` as typed (shared `noInput` with `runLine`), and the view no longer shows a pipe for a path. New test in `parse.test.ts`. Then `typecheck`, `content-check`, `token-check`, `traceability` and `npm test` (1430 tests) pass; `shell/history.test.ts`'s phone double-click-on-Home test timed out once under the full run and passed three times alone. `npm run site-check` passes 13 of 13 parts, Lighthouse 98 to 100.
  - Superseded 2026-10-29: `ls | vim cv.json` gets the "doesn't read piped input" reply, by T154, which opens `cv.json` (FR-057 as amended).

---

## Phase 15: Amendment of 2026-10-29: no greeting

**Goal**: The Terminal opens on its starter command controls and a prompt, with no greeting text,
in both shells (spec FR-005 as amended 2026-10-29; design/review.md, "2026-10-29 amendment",
decision 2; exports `desktop-1-just-opened-1440.png`, `phone-1-just-opened-375.png`,
`phone-5-just-opened-320.png`, `phone-6-landscape-568.png`). The chips keep every CV section
within 2 clicks or taps without typing (SC-001). The rest of the 2026-10-29 amendment (FR-067 to
FR-075 and the requirements it amends) is Phases 16 to 25.

**Independent Test**: open the Terminal at 1440 × 900, 375 × 812, 320 × 568 and 568 × 320; the
screen shows the 5 starter chips, then the prompt, and no other text; each chip runs its command;
`clear` removes the chips with the runs.

### Tests (REQUIRED) ⚠️

- [X] T121 [P] Rewrite the FR-005 tests in `packages/web/test/terminal/output.test.ts`, covers 006-terminal-FR-005 and 006-terminal-FR-030: before the first prompt `.terminal .starter` holds only the 5 chips, `help`, `about`, `work`, `projects`, `cv`, in that order, each running its line; no text node in the Terminal before the prompt besides the chips' names; the same with the `three-projects` (no label) and `no-name` fixtures, which replace the name-line tests T117 added; `clear` and the menu's `Clear output` remove `.starter`. Write them to fail against today's build.
  - Done 2026-10-29: `output.test.ts`'s FR-005 block now checks `.terminal .starter` holds the 5 chips and no other text node comes before the prompt, on `every-field`, `three-projects` and `no-name`; each chip runs its line; `clear` and `Clear output` remove `.starter`. All four failed on the build with the greeting.
- [X] T122 [P] Update the selectors and titles that name the greeting, from `.greeting` to `.starter`, in `packages/web/test/terminal/controls.test.ts` (FR-015 and SC-001: the starter chips are the 5 controls before the prompt; the inline `help` in the intro is gone, so the expected list is `help`, `about`, `work`, `projects`, `cv`), `menu.test.ts` (FR-003, FR-019), `state.test.ts` (FR-021: reopened, it shows the starter chips), `modes.test.ts`, `design.test.ts`, `pocket.test.ts` (FR-025, FR-051: the 5 chips; the tap search starts from the chips and the keys) and `data-req.test.tsx` (`.terminal .starter` carries 006-terminal-FR-005 and 006-terminal-FR-030, its buttons FR-015 and FR-034).
  - Done 2026-10-29: `controls.test.ts` (starter list `help`, `about`, `work`, `projects`, `cv`; 15 runs by click, Enter and Space), `menu.test.ts`, `state.test.ts`, `modes.test.ts`, `design.test.ts`, `pocket.test.ts` and `data-req.test.tsx` read `.starter`. `data-req.test.tsx`'s count of requirements is now 75, the amended spec's.

### Implementation

- [X] T123 Remove the greeting's text from `packages/web/src/apps/terminal/Terminal.tsx` after T121 and T122: `div.greeting` becomes `div.starter` (`data-req="006-terminal-FR-005 006-terminal-FR-030"`) holding only the chips from `siteText.terminal.starter`; drop the status line, the name line and `Intro`, and with them the use of `basics.name` and `basics.label` there (the pocket case's engraving keeps the name, FR-054). In `session.ts` rename `greeting` to `starter` (shown until the output is first cleared, as now).
  - Done 2026-10-29: `div.starter` holds only the chips from `siteText.terminal.starter`; `Intro`, the status and name lines and the use of `basics` in `Terminal.tsx` are gone; `session.ts`'s `greeting` is `starter`.
- [X] T124 [P] In `packages/web/src/site-text.ts`, replace `terminal.greeting` (`desktop`, `phone`, `statusNarrow`, `name`, `nameAlone`, `commands`) with `terminal.starter: ['help', 'about', 'work', 'projects', 'cv']`; delete the strings nothing uses any more, and keep `content-check` passing.
  - Done 2026-10-29: `terminal.greeting` replaced by `terminal.starter`; `content-check` passes.
- [X] T125 [P] In `packages/web/src/apps/terminal/terminal.css` and `pocket.css`, replace the `.greeting`, `.greeting-status`, `.greeting-name` and `.greeting-intro` rules with one `.starter` rule: the chip row, wrapping, with the gap to the first prompt the exports show; drop the phone rule that hid the status line in landscape. Every value stays a token (`token-check`).
  - Done 2026-10-29: one `.starter` rule (flex row, wrapping, `space-2` gap, `space-4` to the prompt); the landscape rule hiding the status line is gone; `token-check` passes.
- [X] T126 After T123 to T125, run `typecheck`, `content-check`, `token-check`, `traceability`, `npm test` and `npm run site-check`, and compare the four just-opened states with their exports. `tools/site-check/` reads no greeting (checked 2026-10-29), so the site check needs no change.
  - Done 2026-10-29: `typecheck`, `content-check`, `token-check` pass; `traceability` fails only on FR-067 to FR-075; the Phase 15 browser tests (output, controls, menu, state, modes, design, pocket, data-req) and the engine tests pass (195 tests); `npm run site-check` passes 13 of 13 parts, Lighthouse 98 to 100. Screenshots at 1440 × 900, 375 × 812, 320 × 568 and 568 × 320 show the 5 chips then the prompt, as the four exports do; the box around the line and the prompt's layout are the amendment's later tasks (T171).

---

## Phase 16: Amendment of 2026-10-29: setup

**Purpose**: a clean baseline on `006-terminal-shell`, the one new dependency, and the upstream
reports research R25 asks for before the Terminal relies on just-bash's gaps

- [X] T127 Bring `006-terminal-shell` up to date and record the baseline, with Node 26 active: `git fetch origin main`; if `main` moved past this branch's base, `git merge origin/main` as a merge commit (no rebase). `npm ci`. Then `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check` and `npm run site-check` exit 0, and `npm run traceability` fails only on the 9 uncovered IDs `006-terminal-FR-067` to `006-terminal-FR-075` (the spec is Approved with 75 active requirements). Run `npm run build` and record the gzipped size (`gzip -9`) of `packages/web/dist/assets/os-*.js` here: it is SC-013's "size before the amendment". T104 measured 107 KB, not research R21's estimate of 102 KB, so the budget T148 writes is this measured size plus 5%, not 102 KB plus 5%. T127 runs before Phase 15, so the baseline is today's build with `main` merged; Phase 15 then comes before any amendment task that changes UI (Dependencies below).
  - Done 2026-10-29: `main` (`daf8082`) is already in the branch (`519e5fc`), so no merge; `npm ci` with Node 26.12.1. `typecheck`, `content-check` and `token-check` pass; `traceability` fails only on the 9 uncovered IDs FR-067 to FR-075. `npm test`: 1525 of 1539 pass; the 14 failures are the 3 traceability tests and tests already changed for Phase 15 (they read `.starter` before the source did), and `data-req.test.tsx`'s requirement count, 66 where the amended spec has 75 (fixed with T122). `npm run site-check` passes 13 of 13 on the Phase 15 build. **SC-013's size before the amendment**: `assets/os-*.js` built from `HEAD` (`519e5fc`) is 362,241 bytes raw and **108,962 bytes with `gzip -9`**, so T148's budget is 114,410 bytes (108,962 plus 5%). The build's assets are under `packages/web/dist/site/assets/`.
- [X] T128 Add `just-bash` 3.6.0, exact, as a dependency of `@cv/web` (research R25, plan Primary Dependencies): `npm install just-bash@3.6.0 --save-exact --workspace @cv/web`, so `packages/web/package.json` reads `"just-bash": "3.6.0"` and `package-lock.json` pins it. Confirm in `node_modules/just-bash/package.json` that the version is 3.6.0, the license is Apache-2.0 and the `./browser` export exists, and that the browser build's bundled packages are `diff` (BSD-3-Clause), `sprintf-js` (BSD-3-Clause) and `turndown` (MIT) (research R40). Add no other package (Constitution X). Commit it alone as `build(web): add just-bash 3.6.0 for the Terminal's shell (006)`.
  - Done 2026-10-29: `packages/web/package.json` reads `"just-bash": "3.6.0"` and the lock pins it. `node_modules/just-bash/package.json`: version 3.6.0, Apache-2.0, `./browser` export present. The browser build imports only `diff` 8.0.4 (BSD-3-Clause), `sprintf-js` 1.1.3 (BSD-3-Clause), `turndown` 7.2.4 (MIT) and `node:zlib`; it also inlines `re2js` (MIT) and `ieee754` (BSD-3-Clause) with their license comments, which T148's license file names too. The browser build exports neither `parse` nor `serialize`; `Bash.transform` (public, in the browser build) gives both: it throws just-bash's syntax error, and serializes the AST a transform plugin returns (T144 uses it).
- [ ] T129 [P] Prepare the upstream reports of research R25 after T128: for each of G1, G2, G5, G11, G13 and G14, write a minimal Node script against just-bash 3.6.0 in the scratchpad (not the repository) that fails as the gap's row says, and a draft issue holding the script, what 3.6.0 prints and what bash 5 prints for the same line. Also run one line for each of G3, G4, G6 to G10, G12 and G15 and confirm 3.6.0 still behaves as its row says, since the tasks below rely on it; if one doesn't, stop and update research.md and the task that relies on it first. Owner action: filing the issues on `github.com/vercel-labs/just-bash` is an outside post and is the owner's; record each issue's link here once filed.
  - BLOCKED: filing the six issues upstream is an outside post, the owner's (Owner action above). Everything else is done.
  - Prepared 2026-10-29: the scripts and draft issues are in `CV-worktrees/.scratch/006-upstream/` (`gaps.mjs`, `g10.mjs`, `ISSUES.md`), outside the repository. G1, G2, G5, G11, G13 and G14 fail as their rows say. G3, G4, G6, G7, G8, G12 and G15 behave as their rows say. Two details differ and change no handling: G9, `$HOME` defaults to `/home/user` (not `/`) when no `env` is given; G10, `type f` abbreviates only compound bodies (`local a=1; ...; ...`) and `declare -f f` prints nothing. Also found: just-bash's defense-in-depth is on by default and blocks `process.env` inside commands and file system calls, and `type` calls some names "a shell builtin" that answer "command not found" (`alias`, `trap`, `kill`, `umask` and others), so `SHELL_BUILTINS` lists only the builtins that run (T136).

---

## Phase 17: Amendment foundational: the Terminal runs on the shell

**Purpose**: the design gate for the amendment, its tokens and site text, and the shell itself,
running in a worker and loaded on first open, with the site's commands as its commands. At the end
of this phase every behavior the amendment doesn't change works as before, through the shell.

**⚠️ CRITICAL**: no amendment story task can begin until this phase is complete.

**Design gate (Constitution II)**: T130 comes first. No amendment task that creates or changes UI
may start until it is done, and Phase 15 is done.

- [X] T130 Confirm the design gate for the amendment in `specs/006-terminal/design/` (plan Constitution Check II, research R42): `review.md`'s "2026-10-29 amendment" section reads `**Status**: Approved` and is signed by the owner on 2026-10-29; `exports/` holds `desktop-10-cursor-unfocused-1440.png` to `desktop-20-syntax-error-not-found-1440.png`, `phone-8-cursor-unfocused-375.png` to `phone-18-syntax-error-not-found-375.png`, `phone-19-after-help-320.png`, `phone-20-permission-denied-320.png`, `phone-21-pipe-and-filter-320.png` and `cursor-selection-1440.png`, and the re-exports `review.md` lists; `wireframes.md` has "States added by the amendment of 2026-10-29" covering every state of the spec's amended Design checklist item in both shells; the Penpot link is unchanged in `spec.md`, `design/README.md` and `design/review.md`; and the review records that nothing is taken from another terminal's look (SC-010). Write the result here.
  - Confirmed 2026-10-29: `review.md`'s "2026-10-29 amendment" reads `**Status**: Approved`, signed by Alex Profir (project owner) on 2026-10-29; `exports/` holds the 26 new files (desktop-10 to -20, phone-8 to -18, phone-19 to -21 at 320, `cursor-selection-1440.png`) and the re-exports it lists; `wireframes.md` has "States added by the amendment of 2026-10-29"; the Penpot link (`file-id=eaccfa4c…`, `page-id=07f3159c…`) is the same in `spec.md`, `design/README.md` and `design/review.md`; "Original look (FR-031, SC-010)" is checked. The gate is open.
- [X] T131 Add the amendment's tokens after T130, exactly as `design/README.md`'s "Proposed tokens (2026-10-29)" table lists them (research R36, R42): in `packages/tokens/penpot/tokens.json`, in the `light` set beside the Terminal's other semantic colors, `color.terminal-cursor-text` → `{color.base.night}`, `color.terminal-selection` → `{color.base.lilac}` and `color.terminal-selection-text` → `{color.base.night}`, in the hand-written export's form (`JSON.stringify(value, null, 2)`, no final newline); in `packages/tokens/motion/tokens.json`, under `motion.duration`, `cursor-blink` (`1000ms`, `duration`) and `cursor-idle` (`5000ms`, `duration`), in the form `fast` and `base` use. `color.terminal-cursor` stays as it is, at full strength. Run `npm run token-output`, then `npm run token-check` (exits 0, no exception). `packages/web/test/tokens.test.ts`'s "every token in the export is read" stays red until T171 and T190 read them.
  - Done 2026-10-29: the three colors in the `light` set after `terminal-cursor`, the two durations under `motion.duration`; `token-output` regenerated the CSS and TS; `token-check` passes; the export keeps no final newline.
- [X] T132 [P] Add the amendment's site text to `packages/web/src/site-text.ts`, in the design's words (design/wireframes.md Site text, contracts/commands.md Replies), with no CV fact and no design value (FR-030): under `terminal`, `help`'s standard group heading `Standard commands` and its note `as in bash. help <command> shows its options.`; the unknown reply as `{typed}: command not found. Run ` … `help` … ` to see them all, or try:` and its form with no suggestion; the `cd`-on-a-file and `cat`-on-a-folder replies that follow bash's line (`{path} is a file. Try ` … `cat {path}` … `.`, `{path} is a folder. Try ` … `ls {path}` … `.`); the three "stopped" lines (`stopped: it ran for 5 seconds, the longest a command line runs here.`, `stopped: it ran 10,000 commands, the most a command line runs here.`, `stopped: it printed 1 MB, the most a command line prints here.`), `stopped: you pressed Ctrl+C.` and the `^C` mark; the loading line `loading the shell · type away, commands run once it is ready`, the failure line `The shell couldn't load. Check the connection, then try again.` and the control's name `try again`; the announcements `Cancelled` and `Loading the shell`, and the unit `lines` as a `{ one, other }` pair (`line`, `lines`) for `counted`; and the owner names `ls -l` shows, `root` and `guest` (the prompt's `guest` may be reused). Keep the strings the old parser's replies use (`pipe-usage`, the "doesn't read piped input" reply, `jq`'s "only pretty-prints" and "is not JSON" replies) until T173 deletes them with their last use; `content-check` passes.
  - Done 2026-10-29: `replies.unknown` is `{typed}: command not found.`; added `replies.stopped` (`time`, `commands`, `output`, `cancelled`), `replies.cancelMark`, `standard` (`heading`, `note`), `shellLoading`, `shellFailed`, `tryAgain`, `owners` (`protected: root`, `visitor: guest`) and `announce.cancelled`/`loading`. `isFile`, `isFolder` and the `lines` unit already existed. The old parser's strings stay until T173. `content-check` passes.
- [X] T133 [P] Write the message and state types in `packages/web/src/apps/terminal/shell/protocol.ts`, exactly as data-model.md's "Shell state", "Terminal file system", "Run request and result" and contracts/shell-worker.md's Messages set: `ShellState` (initial value `{ cwd: '/home/guest', variables: {}, exported: [], functions: {}, options: [], status: 0 }`), `ShellOption` (`'errexit' | 'nounset' | 'pipefail' | 'noglob' | 'noclobber' | 'xtrace'`), `Owner`, `FsEntryInfo`, `VisitorFiles` and `QUOTA = 1_048_576`, `RunRequest`, `RunResult` (`end: 'done' | 'exited' | 'limit' | 'syntax'`, `limit?: 'time' | 'commands' | 'output'`, `files?` only when the visitor's files changed), `Recorded`, `Effect` (`clear`, `vim` with `name`, `pipe` and `text`, `open` with `'cv' | 'about'`), `ShellData`, and the page-to-worker (`start`, `run`, `restore`, `reset`) and worker-to-page (`ready`, `failed`, `result`) messages. Types only, imported by both sides; it imports only `engine/block.ts`'s types.
  - Done 2026-10-29: `shell/protocol.ts`, with `INITIAL_STATE`, `NO_FILES` and `QUOTA` as values. Two additions to data-model.md's types, to be recorded there: `RunRequest.shell?` (`help`'s lead differs by shell) and the effect `{ kind: 'clear-history' }` for `history -c`. `Effect` lives in `engine/block.ts`, which protocol re-exports, so the engine never imports `shell/`.
- [X] T134 [P] Amend `packages/web/src/apps/terminal/engine/block.ts` (data-model.md "Site command run", research R29): `text` nodes gain `stream?: 'stdout' | 'stderr'`, and a new export `blockText(block)` gives the block's visible text in reading order: one line per `line`, heading and list item, list items prefixed `- `, links by their text (with their address only where `/cv` shows it), `time` nodes by their text, controls by their visible label, `json` rows as their tokens' text. Write `packages/web/test/terminal/engine/block.test.ts` first, covers 006-terminal-FR-047 and 006-terminal-FR-057: on the `every-field` and `empty-sections` fixtures, `blockText` of every CV command's block, `help`'s, `specs`' and `site`'s gives the lines this rule sets, with no markup, and the same text twice for the same block.
  - Done 2026-10-29: `blockText` in `engine/block.ts` (list items marked `- `, history's lines not), and `engine/block.test.ts` (4 tests) passes.
- [X] T135 [P] Extend `packages/web/test/terminal/engine/boundaries.test.ts` (no requirement ID; contracts/shell-worker.md, research R2): every file under `packages/web/src/apps/terminal/shell/` is scanned as `engine/` is (no `react`, `react-dom`, `@cv/tokens`, `.tsx`, `.css` or `../os/metrics.ts` import, no `document`, `window` or `navigator`); no file under `engine/` imports `just-bash` or `../shell/`; and no file of the Terminal outside `shell/` imports a `shell/` module other than `shell/protocol.ts`'s types, except `shell-client.ts` naming `./shell/worker.ts` inside `new URL(…, import.meta.url)`.
  - Done 2026-10-29: `boundaries.test.ts` covers `shell/` and the imports into and out of it (7 tests pass).
- [X] T136 [P] Write `packages/web/src/apps/terminal/shell/standard.ts` (research R32): `STANDARD_COMMANDS`, the names `awk basename cp cut date diff dirname echo env false find grep head mkdir mv printf rm sed seq sort tail tee touch tr tree true uniq wc which xargs yes` and `cat jq ls pwd`, as the `commands` option just-bash takes; `SHELL_BUILTINS`, the builtins of R32 (`cd`, `export`, `unset`, `set`, `read`, `test`, `[`, `type`, `declare`, `local`, `eval`, `source`, `exit`, `return`, `shift`, `break`, `continue`, `true`, `false` and the rest just-bash's `type` calls "a shell builtin"); and `LEFT_OUT`, each name just-bash offers that the Terminal leaves out with its reason from R32 (network, another language, scripts, permissions and links, Node's `zlib`, aliases, the site's own, not yet proved), read by T155's test.
  - Done 2026-10-29: `shell/standard.ts`. `SHELL_BUILTINS` lists the 40 builtins that run in 3.6.0 (`type` also calls `alias`, `trap`, `kill`, `umask` and others builtins, but they answer "command not found"). `LEFT_OUT` has a reason for every other name `getCommandNames()` gives.
- [X] T137 [P] Write the shell test helper `packages/web/test/terminal/shell/context.ts`, as `engine/context.ts` is for the engine: `shellFor(fixture?)` creates the adapter (T143) on the real CV or a `packages/web/test/__fixtures__/*.json` CV with the real spec list, in Node; `runLine(shell, line, state?)` sends one `RunRequest` and returns the `RunResult`; `runLines(shell, lines)` runs them in order, carrying `state` and `history` as the session does, and returns every result. Used by every shell test below.
  - Done 2026-10-29: `test/terminal/shell/context.ts` with `shellFor`, `runLine`, `runLines` and `treeFor` (the shell's own tree, with the real spec list).
- [X] T138 [P] Write `packages/web/test/terminal/shell/fs.test.ts` before T139, against TerminalFs directly and through `shellFor`:
  - covers 006-terminal-FR-045: home is `/home/guest`; `ls /` lists `bin dev home tmp usr`; there is no `/proc`; relative paths, `.`, `..`, `~/`, `/`, globs (`~/work/*`, `?`, `[a-c]*`) and capitals in built names resolve as FR-045 sets, from every folder; `cd ..` from home reaches `/home`, and `cd` comes back;
  - covers 006-terminal-FR-043: `readdir('/home/guest')` gives the built names in the design's order (`cv.json`, `about`, `contact`, `work`, `projects`, `skills`, `education`, `languages`, `interests`, `readme`, `specs`, empty sections left out), then the visitor's in name order;
  - covers 006-terminal-FR-049: `writeFile`, `appendFile`, `mkdir`, `rm`, `cp` and `mv` onto, out of or into every kind of protected path (a file, a folder, the root, `/home`, `/bin`, `/usr`, `/dev` other than writing to `/dev/null`) reject with `Permission denied` and change nothing; protected files report mode `0444`, folders `0555`, the visitor's `0644` and `0755`; `/home/guest` itself takes writes; a part that doesn't exist as typed matches a protected name without regard to capitals (`ABOUT` reads `about`, `About` written names `about` and is refused), and the visitor's names are case-sensitive;
  - covers 006-terminal-FR-073: writes work in home, in a visitor's folder and in `/tmp`; a write that takes the visitor's bytes past 1,048,576 rejects with `No space left on device` and leaves the earlier files; a write into a missing folder rejects with `No such file or directory` (research G6); `snapshot()` gives `VisitorFiles` with parents first; `restore(files)` rebuilds them; `reset()` leaves no visitor file and the protected tree equal to a fresh one.
  - Done 2026-10-29: `shell/fs.test.ts`, 12 tests. `echo hi > /nope/x` is refused with "No such file or directory", as bash does, not "Permission denied".
- [X] T139 Write TerminalFs in `packages/web/src/apps/terminal/shell/fs.ts` after T134 and T138 (research R28, data-model.md "Terminal file system"): an `IFileSystem` over just-bash's `InMemoryFs`; the root's `bin`, `usr/bin` (a stub per registered command, so `which` and `/bin/ls` work), `dev` (`null`, `stdin`, `stdout`, `stderr`), `home/guest` and `tmp`; the protected tree of `engine/files.ts`'s `buildFileSystem`, written into `/home/guest` with each file's text `blockText` of its block (`cv.json` its JSON text, FR-055); the protected set, checked on the path and its parent by every writing operation (`writeFile`, `appendFile`, `mkdir`, `rm`, `cp`, `mv`, `chmod`, `symlink`, `link`, `utimes`); the modes; case-insensitive lookup of protected names only; the visitor's byte count against `QUOTA`; the missing-parent refusal; `readdir('/home/guest')`'s order; `snapshot()`, `restore(files)` and `reset()`. T138 passes.
  - Done 2026-10-29: `shell/fs.ts`, `TerminalFs extends InMemoryFs`. just-bash writes its layout through `mkdirSync`, `writeFileSync` and `writeFileLazy` and swallows `ENOSYS` there, which is how `/proc` is left out. Refusals throw `Error('Permission denied')` (code `EACCES`): just-bash prints the message after the path. Its defense-in-depth is on and blocks `process.env` inside fs calls.
- [X] T140 [P] Amend the engine's command table in `packages/web/src/apps/terminal/engine/commands.ts` (data-model.md "Command table", amended; contracts/commands.md): each row's `run` now takes the shell's arguments and a context (site text, formatters, `TERMINAL.columns`, the file tree, the working folder as a path string, the history) and returns a `SiteRun` (`{ text, block, stderr?, status, effect? }`, `text = blockText(block)` when a block is given); a wrong argument gives the usage reply as `stderr` with status 2 (FR-017); `readsInput` and `runLine` are gone, and with them the engine's own `jq` and the pipe handling. Delete `engine/parse.ts` and `packages/web/test/terminal/engine/parse.test.ts`, first moving its cases that still hold: FR-007's capitals and spaces to T142's `adapter.test.ts`, FR-018's "typed text stays text" to T145's `output-map.test.ts`, and FR-057's pipe cases to T154 (the "doesn't read piped input" and `pipe-usage` cases are dropped, as FR-057 is amended). Update `engine/commands.test.ts`, `replies.test.ts` and `help.test.ts` to call the new `run` shape; their expectations change only in T159.
  - Done 2026-10-29: `engine/commands.ts` is rewritten (rows' `run(args, context, word)` give a `SiteRun`; `cv`, `vim`, `ls`, `cd`, `cat`, `jq`, `pwd` and `exit` have no `run`; `usage` goes to stderr with status 2; `RunContext` has `cwd` and no `columns`), and `engine/parse.ts` and `parse.test.ts` are deleted. `test/terminal/engine/context.ts`'s `run`, `textOf` and `blockOf` are now async: they run the line through the shell adapter made for the context and `mapOutput`, and give a `Shown` in the old result's shape (`output`, `cd`, `os`, `open-vim`, `clear`); a `folder` override is now `cwd`. The engine tests await them with their expectations unchanged; `help.test.ts`'s `readsInput` case goes with the field, and its 200 generated words are checked with `commandNamed`. A site command's usage reply names the first word as typed (`WORK 2020` → `WORK takes no arguments.`): the adapter passes the word it lower-cased in the run record (`typed`). The FR-007 cases moved to `shell/adapter.test.ts`, FR-018's to `output-map.test.ts`; FR-057's pipe cases are T154's. The engine cases whose expectations the amendment changes are listed under T153.
- [X] T141 [P] Write `packages/web/test/terminal/shell/site-commands.test.ts` before T142:
  - covers 006-terminal-FR-008 and 006-terminal-FR-047: every command of FR-008 that prints, and every alias, prints exactly `blockText` of its block, ends with a line break, and records `{ text, block }` once; every protected file's text equals `blockText` of its block, and `cat` on it prints that text and records that block; `cat` on two files records two blocks in order; `cat -n about` records nothing;
  - covers 006-terminal-FR-050: `ls` and `ls ~/work` record a listing whose names are controls (`ls ~/{folder}` for folders, `cat ~/{path}` for files), the home folder in the design's order; `ls | cat` records nothing;
  - covers 006-terminal-FR-058 and 006-terminal-FR-059: `vim cv.json` and `cat cv.json | vim -` return the `vim` effect with the file's name and text; `vim work`, `vim nowhere`, `vim -` with nothing piped and `vim` alone give their replies on stderr and no effect; `cv` gives the effect `cat cv.json | jq | vim -` gives, with that pipe, from any working folder;
  - covers 006-terminal-FR-014 and 006-terminal-FR-019: `open cv`, `open about` and `clear` return their effects, in order after the line (`clear; open cv` gives both); `open settings` gives its reply listing `cv` and `about`;
  - covers 006-terminal-FR-017 and 006-terminal-FR-020: `work 2020` and `open` alone give the usage reply on stderr with status 2; `history` prints the request's history numbered from 1, `history 2` the last two, and `history -c` empties it.
  - Done 2026-10-29: `shell/site-commands.test.ts`, 12 tests pass.
- [X] T142 Write the site's commands in `packages/web/src/apps/terminal/shell/site-commands.ts` after T136, T139, T140 and T141 (research R29): one just-bash custom command per row of `COMMANDS` and per alias, printing the row's `SiteRun.text` to stdout and its `stderr`, returning its status, recording `{ text, block }`, and returning its effect; `cv` runs `cat cv.json | jq | vim -` through `ctx.exec` from `/home/guest`; `history` prints the request's history and takes `history N` and `history -c`; wrappers of the built-ins through `ctx.origCommand`: `cat` records the block of each protected file it prints whole, `ls` records a listing with controls for the names it printed (the design's order for the home folder) and `jq` records a `json` block of what it printed, lexed by `engine/json.ts`. The `rm` wrapper and `ls -l`'s owners are US3's (T178, T179).
  - Done 2026-10-29: `shell/site-commands.ts`. just-bash's `help` builtin wins over a custom command, so the site's `help` runs as `__cv_help`: the adapter's transform renames the typed word (`RENAMED`). A command whose output goes into a pipe or a `$(…)` gets the prefix assignment `__CV_PIPED=1` from the same transform and records nothing. Bundled commands may give stdout as latin1 bytes (`stdoutKind: 'bytes'`), so the wrappers decode it before comparing.
- [X] T143 [P] Write the first cases of `packages/web/test/terminal/shell/adapter.test.ts` before T144:
  - covers 006-terminal-FR-067: variables (quoted values included), exported variables, a function using `local`, `if` and a pipe, `set -o pipefail`, `$?` and the working folder carry to the next line; `unset -f f` removes `f`; a function defined in a line that failed before reaching it isn't kept; `HOME`, `USER`, `LOGNAME` and `SHELL` are `/home/guest`, `guest`, `guest` and `/bin/bash`; a runtime message naming a line (`bash: line N: …`) names the visitor's line, not the prelude's;
  - covers 006-terminal-FR-007: ` HELP `, `work\t`, `Work  ` and `help   work` run the site command; `GREP x` is `bash: GREP: command not found`; an empty or blank line runs nothing and returns status 0;
  - covers 006-terminal-FR-057: ``echo "a`` gives just-bash's ``unexpected EOF while looking for matching `"'`` with `end: 'syntax'`, status 2 and nothing run; `ls |`, `| jq` and `ls |||  x` give `syntax error near unexpected token '|'` and run nothing (research G2);
  - covers 006-terminal-FR-008: `exit` and `exit 3` give `end: 'exited'`; a line naming `__cv_state` or `__cv_denied` is `command not found`;
  - covers 006-terminal-FR-021: `reset()` empties the state and the visitor's files; `restore(state, files)` gives back a variable, a function and a file.
  - Done 2026-10-29: `shell/adapter.test.ts`, 11 tests pass. Syntax errors read ``syntax error near unexpected token `|'`` (bash's quotes).
- [X] T144 Write the shell adapter in `packages/web/src/apps/terminal/shell/adapter.ts` after T142 and T143 (research R27, contracts/shell-worker.md "The shell just-bash is given"): `createShell(data)` makes just-bash with TerminalFs, `cwd: '/home/guest'`, the `env` of the contract, `commands: STANDARD_COMMANDS`, the site's commands, `__cv_state` and `__cv_denied`, and no `network`, `fetch`, `python` or `javascript` option; `run(request)` checks syntax with just-bash's `parse` (and the empty side of a pipe), lower-cases a first word that names a site command or alias in another case, builds the prelude (variables quoted, `export`, functions serialized with `serialize`, `set -o`, `(exit N)`), runs prelude, line and epilogue in one `exec` with the request's `cwd`, reads the new state from `__cv_state`, keeps function bodies taken from the line's parse tree for names `declare -F` lists, shifts line numbers back by the prelude's length, detects `exited`, and returns a `RunResult` with `files` only when they changed; `reset()` and `restore(state, files)`. Limits come in T168. T143 passes.
  - Done 2026-10-29: `shell/adapter.ts`. The browser build doesn't export `parse` or `serialize`: a second `Bash` used only for `transform` parses (it throws just-bash's error) and serializes (a plugin swaps in the AST to print). A new `Bash` is made per line over the same TerminalFs (about 1.5 ms), so `maxCommandCount` can be 10,000 plus the prelude's lines. `$?` is restored with `(exit N) && :`, which keeps it under errexit. The limits and their detection are already in (T168 can check them against T156). `warm()` runs `true` once and takes the shell's own variables as the baseline that isn't carried.
- [X] T145 [P] Write `packages/web/test/terminal/engine/output-map.test.ts` before T146 (research R30, data-model.md "Shown run"):
  - covers 006-terminal-FR-016: `bash: wrok: command not found` becomes `wrok: command not found. Run ` `help` ` to see them all, or try:` with a `work` chip; `bash: sudo: command not found` offers only `help`; suggestions search FR-008's names and aliases only (`sl` → `ls`, `grpe` → none from the standard commands); the `bash: ` prefix never shows;
  - covers 006-terminal-FR-018: stdout that equals a site command's text, printed by `echo` with no recording, stays text; `<b>x</b>` and an OSC 8 sequence printed by `printf` stay text nodes;
  - covers 006-terminal-FR-046: the prompt path is `~` for `/home/guest`, `~/work` below it, `/home` and `/tmp` outside it;
  - covers 006-terminal-FR-048: `bash: cd: about: Not a directory` is shown, then `about is a file. Try ` and a `cat about` control; `cat: work: Is a directory`, then the `ls work` control; the path as typed;
  - covers 006-terminal-FR-069: `end: 'limit'` with each `limit` shows its "stopped" line after the stdout printed before it, and not the limit's own message;
  - covers 006-terminal-FR-057 and 006-terminal-FR-067: a syntax error is shown without `bash: ` and its line number; stdout comes first, then stderr in the error tone (research G3); recorded texts found whole in stdout, in order, become their blocks, and the rest stays text;
  - covers 006-terminal-FR-028: a result made only of recorded blocks is counted as before (`work: 4 entries`), and text in rows at the desktop column count as `{command}: {n} lines`, `{command}` the line's first word.
  - Done 2026-10-29: `engine/output-map.test.ts`, 12 tests, running real lines through `shellFor`; all pass after T146.
- [X] T146 Write `packages/web/src/apps/terminal/engine/output-map.ts` after T145: `mapOutput(result, line, context)` returning `{ block, announce }` as data-model.md's "Shown run" table sets, with FR-016's reply and suggestions from `engine/suggest.ts`, FR-048's controls, FR-069's lines from site text, and the prompt's path formatter (`formatPrompt(cwd)`) the session and `WindowTitle` use. T145 passes.
  - Done 2026-10-29: `engine/output-map.ts` (`mapOutput`, `formatPrompt`, `ShownResult` typed in the engine so the engine doesn't import `shell/`). just-bash's `cat` on a folder says `No such file or directory`; the `cat` wrapper in `shell/site-commands.ts` rewrites it to `cat: {path}: Is a directory` when the path is a folder (research G16, added). T145's 12 tests pass.
- [X] T147 [P] Write `packages/web/test/build.test.ts` before T148, covers 006-terminal-FR-070 and SC-013: on a build in a temporary directory, `assets/` holds one `os-*.js` and one `shell-*.js`, the worker file has no `import` or `importScripts` and starts with a comment naming `shell-licenses-*.txt`, which exists and names `just-bash`, `diff`, `sprintf-js` and `turndown` with their versions and license texts; a copy whose worker imports another file fails with `site build failed: the shell worker is not one file`; a copy whose `os` entry imports `shell/worker.ts` other than through `new Worker` fails with `site build failed: the os script loads the shell`; a copy whose `os` script passes its gzip budget fails naming the budget; `index.html` names no `shell-*` file.
  - Done 2026-10-29: `test/build.test.ts`, 6 tests: on the global build, one `os-*.js` and one `shell-*.js`, neither with an import (oxc-parser's module record) nor `importScripts`; the worker's first line names `shell-licenses-*.txt`, which names `just-bash`, `diff`, `sprintf-js`, `turndown`, `re2js` and `ieee754` with their versions and licenses; no page names a shell file and `sw.js` precaches both. On copies: a worker with a dynamic `import()` fails with `the shell worker is not one file`; an `os` entry importing `shell/worker.ts` fails with `the os script loads the shell` (its last line: Vite warns about just-bash's size first); padding past the budget fails naming it.
- [X] T148 Build the worker after T144 and T147 (research R34, R39, R40, contracts/site.md, contracts/shell-worker.md Build):
  - `packages/web/src/apps/terminal/shell/worker.ts`: before just-bash's module body runs, replace `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `importScripts` on the worker's global with functions that throw (ES imports are hoisted, so do it in `packages/web/src/apps/terminal/shell/no-network.ts`, imported first by `worker.ts`); then create the adapter, run `true` once as the warm-up, answer `start` with `ready` or `failed`, and handle `run`, `restore` and `reset` as the contract's Messages set;
  - `packages/web/src/apps/terminal/shell/no-zlib.ts`: `node:zlib`'s functions, each throwing;
  - `packages/web/vite.config.ts`: the worker built as one ES module file named `assets/shell-[hash].js`, with the spec list plugin and the fonts plugin the page uses in `worker.plugins` (so `data.ts` resolves `virtual:cv-spec-list` in the worker), and `resolve.alias` of `node:zlib` to `no-zlib.ts` for the worker build only;
  - `packages/web/scripts/build-site.ts`: the "one script" check becomes "the `os` script and exactly one worker script, each one file", with the two messages T147 names; the `os` script's gzipped size checked against a budget written next to the check, T127's measured size plus 5% (SC-013); `assets/shell-licenses-<hash>.txt` written from each bundled package's `package.json` and `LICENSE`, and named in a comment at the top of the worker file; both files in the service worker's precache list as every built file is.
  T147 passes. Record the worker's raw, gzip and Brotli sizes here (research R34 measured 1.26 MB, 343 KB, 274 KB).
  - Done 2026-10-29: `shell/worker.ts`, `shell/no-network.ts` (each name replaced by a throwing, non-writable property), `shell/no-zlib.ts` (`gzipSync`, `gunzipSync`, `constants`); `vite.config.ts`'s `worker` (ES format, `assets/shell-[hash].js`, `codeSplitting: false`, plugins `noZlib`, `cvFonts`, `specListPlugin` and the new `scripts/shell-licenses.ts`, which collects the chunk's packages plus those a prebuilt package lists under "Bundled license information", emits `shell-licenses.txt` and prepends the comment); `build-site.ts`'s `checkScripts` with `OS_BUDGET = 114_410`. Sizes on this build: worker 1,327,981 bytes raw, 365,754 gzip, 293,049 Brotli (larger than R34's 1.26 MB, 343 KB, 274 KB: the CV, site text and the site's commands are in it too); `os` script 360,286 raw, 108,950 gzip (Node's level 9), within its budget. T147 passes.
- [X] T149 Write `packages/web/src/apps/terminal/shell-client.ts` after T133 and T148 (research R26, R34, contracts/shell-worker.md Timing): created once per visit, outside React; `start()` on the Terminal's first open makes `new Worker(new URL('./shell/worker.ts', import.meta.url), { type: 'module' })` and sends `start`; status `loading`, `ready` or `failed` (an error, or no `ready` within 10,000 ms), with `retry()`; `run(request)` sends one line at a time and resolves with its `RunResult`; a `run` with no answer within 6,000 ms terminates the worker, starts a new one, sends `restore` with the last result's state and files, and resolves with a stopped result (`end: 'limit'`, `limit: 'time'`, the state as before the line); `cancel()` does the same at once for Ctrl+C (FR-075); `reset()` sends `reset`. Timings are the contract's numbers, set once in this file, not design values.
  - Done 2026-10-29: `shell-client.ts`, `createShellClient(makeWorker?)` (a test passes a fake worker), `TIMING` (`ready` 10,000 ms, `run` 6,000 ms). A restart posts `start` then `restore` with the last result's state and files; `cancel()` resolves the running line as stopped with no `limit` (T189 shows `^C`).
- [X] T150 Amend the session store in `packages/web/src/apps/terminal/session.ts` after T146 and T149 (data-model.md "Session additions"): `shell`, `waiting`, `running`, `state`, `files` and `cwd` (replacing `folder`); a line entered while `loading` is appended to `waiting` and shown with its prompt; on `ready` the waiting lines run in order; each run sends `{ line, state, history }`, maps the result with `mapOutput`, updates `state`, `cwd` and `files`, then applies its effects in order (`clear`, `vim`, `open` through the `os` handle); `end: 'exited'` does what `exit` does; `reset()` also resets the shell client and empties `state` and `files`. Update `packages/web/test/terminal/engine/session.test.ts` (covers 006-terminal-FR-020 and 006-terminal-FR-021) to drive the store with a fake client: lines entered while loading wait and run in order, `reset()` empties output, history, draft, the shell state and the visitor's files, and Up and Down behave as before.
  - Done 2026-10-29: `session.ts` keeps `shell`, `waiting`, `running`, `state`, `files` and `cwd`; `run(line, shell, actions)` queues the line, `pump()` runs one at a time when the client is `ready`, `finish()` maps the result and applies `clear`, `clear-history`, `vim` and `open` in order, then `exit` for `end: 'exited'`; `reset()` drops results from before it. Loading and failing are announced once. The engine no longer builds its own run context in the page. `engine/session.test.ts` drives it with a fake client over the real adapter (8 tests).
- [X] T151 Wire the interface to the shell after T150 (contracts/terminal.md Structure): `Output.tsx` renders `text` nodes by `stream`, stderr in the error tone, still as React text children; `Terminal.tsx` shows waiting lines after their prompts, `p.shell-loading` under the starter chips while `shell` is `loading` (`data-req="006-terminal-FR-070"`), and in its place after a failure `p.shell-failed` with a `try again` chip that calls `retry()` (both `data-req="006-terminal-FR-070"`); `app.tsx`'s `onClose` resets the session and the shell, and `WindowTitle` reads `formatPrompt(cwd)`. Run `npm run build`: the `os` script is one file with no import, and the worker file is the only other script.
  - Done 2026-10-29: `Terminal.tsx` renders entries, the running line and the waiting lines (`aria-busy="true"` while pending), `p.shell-loading`, and `p.shell-failed` with its `try again` chip; `.terminal` carries `data-shell-state` for tests. stderr lines reach `Output.tsx` in the error tone from `mapOutput`, as text children. `Prompt` and `WindowTitle` read `formatPrompt(cwd)`; `onClose` is still `session.reset`, which now resets the client. `npm run build`: the `os` script is one file with no import, and besides `register-sw` the worker is the only other script. Fixed on the way: the local server (`tools/site-check/src/server.ts`) compressed with `brotliCompressSync`, which took the worker about 1.2 s and blocked a test's own Playwright calls while the service worker precached it; it now compresses asynchronously, once per content in the process.
- [X] T152 Update the Terminal test helper `packages/web/test/helpers/terminal.ts` after T151: `openTerminal` waits until `.terminal p.shell-loading` is gone, so every browser test starts with the shell ready; `typeLine` and `runGroup` wait for the line's run to finish (its `section.run` has its output and the next prompt is empty); add `openTerminalLoading(page, shell)` that holds back `**/assets/shell-*.js` with Playwright's `page.route` and returns a function that releases it, for T161.
  - Done 2026-10-29: `openTerminal` waits for `.terminal[data-shell-state]` ready or running; `typeLine` (and so `runGroup`) waits until no `section.run[aria-busy="true"]` is left (`linesRun`); `openTerminalLoading(page, shell)` holds `**/assets/shell-*.js` and returns the release.
- [X] T153 Checkpoint after T151 and T152: run `npm run typecheck` and `npm test`. Every engine, browser and core test whose expectation the amendment doesn't change passes on the shell, unchanged. Record here, by file and case, the tests that fail because the amendment changed what they expect (such as `rm about`'s reply in `engine/files.test.ts`, `jq .work`'s reply, `help`'s count, the hollow cursor in `motion.test.ts`): each is rewritten in the story phase named in Amendment Requirement Coverage, not changed here. Any other failure is fixed here.
  - Done 2026-10-29: `npm run typecheck` passes. `npm test` at 20:13: 106 failed of 1800 (42 of them T158's BLOCKED parity cases). Sorted:
    - **Expectation changed by the amendment, rewritten in its story phase**: engine `help.test.ts`, `replies.test.ts`, `json.test.ts`, `commands.test.ts` (pwd prints `/home/guest`), `suggest.test.ts` (T159, done in this run); engine `files.test.ts` FR-012 ×7 (pwd), FR-044 (`cat:` message), FR-049 (`rm` refused) (T175); engine `announce.test.ts` pwd (T185); browser `files.test.ts` FR-021 ×4 (pwd text) and FR-050 (`cat ~/cv.json` is text now, FR-055) (T176); `screen-reader.test.ts` ×2 (pwd announced) (T186); `controls.test.ts` FR-015's control list (help's standard group) (T165); `motion.test.ts` cursor animation (T191); `site-text.test.ts` FR-030 (the standard names aren't site text) (T167); `data-req.test.tsx` (`.out-columns` now also the standard group) (T209); `packages/tokens/test/tokens.test.ts` and `packages/web/test/tokens.test.ts` ×3 (motion source holds the two cursor durations; `color.terminal-selection*` read in T188) (T188, T194); traceability `self-check.test.ts` ×2 and `tools/traceability/test/self-check.test.ts` (FR-068 to FR-075 uncovered until their story tests, T210); site-check `keyboard.test.ts` (seeded copies match old source text; the command line's indicator is now its cursor, FR-072) (T203, T208), `other-sites.test.ts` seeded copy (T204), `shell.test.ts` modes in forced colors on `input.command-line` (T195, T208), `cli.test.ts` ×2 and `performance.test.ts` ×2 (fail through those parts) (T205, T208).
    - **Fixed here** (the worker made runs asynchronous; the expectation is unchanged): `controls.test.ts` SC-001 and `pocket.test.ts` FR-025 read a run before it finished (now `linesRun`); `motion.test.ts`'s first frame was the pending run's (now the frame it has run in); the site check's `openTerminal` now waits for the shell, and `typeLine` and `newRun` for no busy run (`tools/site-check/src/shell-states.ts`), which fixed `terminal.test.ts` ×6, `other-sites.test.ts` on the real build, `shell-states.test.ts` ×2 and `offline.test.ts` ×3.
    - **Load only**: `open.test.ts`, `state.test.ts` and `performance.test.ts` timed out in the full run and pass alone.

**Checkpoint**: the Terminal runs every command through the shell in a worker, loaded on first open,
with today's behavior wherever the amendment doesn't change it.

---

## Phase 18: User Story 1 - the shell's language, its commands and the cursor (Priority: P1) 🎯 MVP of the amendment

**Goal**: on desktop, every command line is bash's: pipes into any command, `;`, `&&`, `||`,
quotes, variables, globs, redirects, loops and functions, with the standard commands and their
`--help`, `jq` filters, `help`'s standard group, "command not found" as bash starts it, the
limits that stop a runaway line while the page keeps answering, the shell loading on first open,
the command line with no box and its cursor as its focus indicator, and a click that puts focus
back (US1 scenarios 18 and 19).

**Independent Test**: build, open `/` at 1440 × 900 with DevTools' Network panel; no `shell-*.js`
is requested until the Terminal opens. Run `work | grep -i engineer`, `X=1; f() { echo $((X+1)); }`
then `f`, `jq '.work[0].name' cv.json`, `help` and a name in its standard group, `wrok`, and
`while true; do :; done` while dragging the CV window. Tab to the dock and click the output.

### Tests for User Story 1 (REQUIRED) ⚠️

- [X] T154 [P] [US1] Extend `packages/web/test/terminal/shell/adapter.test.ts`:
  - covers 006-terminal-FR-067: one case per feature FR-067 names, each run in the shell: `;`, `&&`, `||`, single and double quotes, backslash escapes, `$VAR`, `${VAR}`, `${VAR:-d}`, `export`, `$?`, the globs `*`, `?` and `[...]`, the redirects `>`, `>>`, `2>`, `2>&1` and `<`, `if`, `for`, `while`, `until` and functions; a site command in a pipe (`work | head -2`), a redirect (`skills > /tmp/s; cat /tmp/s`), a chain (`false || about`) and a loop (`for c in about skills; do $c | wc -l; done`);
  - covers 006-terminal-FR-057: `cat cv.json | jq`, `work | grep -i rest`, `ls | wc -l` and `help | head -3` pipe as bash does; `ls | work` runs `work` and ignores its input; `ls | vim cv.json` opens `cv.json`;
  - covers 006-terminal-FR-022: `curl x`, `wget x`, `python`, `node` and `ssh h` are `command not found`.
  - Done 2026-10-29: 23 FR-067 feature cases, the pipe/redirect/chain/loop case, two FR-057 cases and the FR-022 names. `python` said "command not available in browser environments"; the adapter now rewrites it to `command not found` (research G17, added).
- [X] T155 [P] [US1] Write `packages/web/test/terminal/shell/standard.test.ts`:
  - covers 006-terminal-FR-068: every name of FR-068 and `yes` is registered and answers `--help` with status 0, and no other standard command is (the registered set, read by running `type` on every name just-bash offers, equals `STANDARD_COMMANDS` plus the site's); `ls -la`, `cat -n about`, `pwd -P` and `history 3` take their options; every name in `LEFT_OUT` is `command not found` (each with its reason in the test title); `whoami` runs `about`, not the standard command;
  - covers 006-terminal-FR-008: the names `help`'s standard group lists equal `STANDARD_COMMANDS` and `SHELL_BUILTINS` less the names `COMMANDS` already lists, in name order; every builtin in `SHELL_BUILTINS` is "a shell builtin" to `type`; `help grep` prints `grep --help`'s text, `help export` the shell's own help for `export`, `help work` `work`'s own help, and `help nosuch` the usage reply with status 2; no name runs that `help` doesn't list;
  - covers 006-terminal-FR-017: `ls --badopt`, `grep` alone and `head -n x about` give GNU's messages and statuses, as just-bash gives them.
  - Done 2026-10-29: `shell/standard.test.ts`. `rm`, `mkdir`, `touch` and `seq` gave no `--help` in just-bash: wrappers print it from `MISSING_HELP` in `standard.ts` (research G18, added). `time` left `LEFT_OUT`: it is a reserved word that runs, as in bash. One case (the group's heading and note in `help`'s text) still fails: see T169.
- [X] T156 [P] [US1] Write `packages/web/test/terminal/shell/limits.test.ts`, covers 006-terminal-FR-069: `while true; do :; done` ends with `end: 'limit'`, `limit: 'commands'`; `i=0; while :; do i=$((i+1)); done` with a raised command count and a fake clock ends with `limit: 'time'` at 5,000 ms; `seq 1000000` ends with `limit: 'output'`; `yes` ends with `limit: 'output'`, not status 0 (research G13); `seq 200000 | tail -1` prints `200000` (G15: no iteration limit); after each, the state is as before the line; a line runs 10,000 of its own commands before it is stopped, whatever the prelude and epilogue run (FR-069 as amended).
  - Done 2026-10-29: `shell/limits.test.ts`, 5 tests, the 5 s case with `createShell(input, { limits: { commands } })` and a stepped `Date.now`. `seq 200000 | tail -1` needed the line's 1 MB counted on what the line prints, not per command: see T168 and research R33's "Built 2026-10-29".
- [X] T157 [P] [US1] Write `packages/web/test/terminal/shell/jq.test.ts`:
  - covers 006-terminal-FR-055: `cat cv.json` prints `cv.json`'s text, and `cat cv.json | jq` prints it too, the final line break removed;
  - covers 006-terminal-FR-056: `jq '.work[0].name' cv.json`, `jq '.skills[].name' cv.json`, `jq 'keys' cv.json` and `cat cv.json | jq .basics` print what jq 1.7 prints for them on the real CV (written in the test as the expected JSON, built from `resume`, never typed as CV text); `jq` and `jq .` pretty-print with 2-space indents and keys in order; `cat about | jq` and `jq '.[' cv.json` give a `jq: parse error` with a non-zero status, as just-bash words it (research G12); `jq . cv.json` records a `json` block and `jq . cv.json | head` records nothing.
  - Done 2026-10-29: `shell/jq.test.ts`, 5 tests pass.
- [ ] T158 [P] [US1] Write `packages/web/test/terminal/shell/bash-parity.test.ts` (SC-014, covers 006-terminal-FR-067 and 006-terminal-FR-068, research R38): first check that `bash --version` and `grep --version` name GNU, and fail with the message naming what to install (`brew install bash coreutils grep gnu-sed gawk findutils diffutils`, `gnubin` first on `PATH`) when they don't; write the real CV's file system to a temporary folder (protected files read-only); run at least 30 lines, covering every feature of FR-067 and every command of FR-068, in the adapter and in `bash` with that folder as `HOME` and working folder, and compare stdout, stderr and status, with bash's `bash: line N: ` prefix removed; the lines include `grep -ril rest ~/work`, `ls | wc -l`, `cat about | tr a-z A-Z | head -3`, `for f in ~/work/*; do wc -l < "$f"; done`, `sed -n 2p skills`, `awk '{print $1}' languages`, `find ~ -name '*.json'`, `X=1; f() { echo $((X+1)); }; f` and `diff about contact`; the differences FR-044, FR-045 and FR-049 set are written beside their lines; no line depends on stdout and stderr interleaving (G3), and none on `jq`'s errors (G12).
  - Written 2026-10-29: `shell/bash-parity.test.ts`, 42 lines; each runs cleanly in the adapter. `grep -ril rest ~/work` is piped to `sort` (GNU grep lists in directory order); `tree` is left out of the lines (not GNU, not in the install list).
  BLOCKED: this machine has macOS bash 3.2 and no GNU tools, so the bash side can't run and every case fails with the install message, as designed. Needs `brew install bash coreutils grep gnu-sed gawk findutils diffutils` with gnubin first on PATH (owner decision), or a CI run, to see the real differences.
- [X] T159 [P] [US1] Rewrite the engine tests whose expectations the amendment changes, in `packages/web/test/terminal/engine/`:
  - `help.test.ts`, covers 006-terminal-FR-008: `COMMANDS` names FR-008's commands with `whoami`, `experience` and `?` as aliases; `help`'s block lists them, then the standard group's heading, note and names as controls running `help <name>`;
  - `replies.test.ts`, covers 006-terminal-FR-017: `work 2020`, `open` alone, `vim` alone and `help nosuch` give the usage reply as `stderr` with status 2; `help work` shows `work`'s own help;
  - `suggest.test.ts`, covers 006-terminal-FR-016: the cases over FR-008's names stay; `rm` and `mv` cases go (they are standard commands now and run); `sl` → `ls`;
  - `commands.test.ts` and `json.test.ts`, covers 006-terminal-FR-056: the lexer's cases stay; the "only pretty-prints" and "is not JSON" reply cases go (T157 covers `jq` now), and so do T112's `jq ./cv.json` cases, as `jq` now takes its first argument as the filter, as jq does.
  - Done 2026-10-29: `help.test.ts` (help nothing → the usage reply; a case for the standard group's heading, note and `help <name>` controls after the table), `replies.test.ts` (FR-016's reply starts `{typed}: command not found.` with status 127; FR-017's usage replies on stderr with status 2, `help nosuch` included; `cat` alone reads its input; FR-048's cases give the command's own message first, as contracts/commands.md Replies says), `suggest.test.ts` (`rm`, `mkdir`, `touch` and `mv` cases gone, `sl` → `ls`), `commands.test.ts` (`pwd` prints `/home/guest`; `cd a b` is bash's), `json.test.ts` (the printer's cases stay; the reply and `jq ./cv.json` cases go, `jq . cv.json` shows the block).
- [X] T160 [P] [US1] Write `packages/web/test/terminal/shell.test.ts` on the real build, at 1440 × 900:
  - covers 006-terminal-FR-067: the lines of T154's first case, typed, show the same text as in Node; a variable and a function set in one line are used in the next;
  - covers 006-terminal-FR-057: `work | grep -i {a word of the first role's summary, read from resume}` shows only the matching lines, as text with no heading or control (US1 scenario 19); for every command `help` lists that prints, the run's `.run-output` text, line by line, equals what `{command} | cat` shows (data-model.md, `blockText`).
  - Done 2026-10-29: `terminal/shell.test.ts`, 4 tests. T154's language cases moved to `shell/context.ts` (`LANGUAGE_CASES`) so both read them. It found that printed text collapsed runs of spaces on screen: `text` nodes with a `stream` now render in `span.out-stream`, `white-space: pre-wrap`. `ls` alone is compared as a set without the folders' `/`, as the design orders and marks the home folder (FR-043).
- [X] T161 [P] [US1] Write `packages/web/test/terminal/loading.test.ts` with T152's `openTerminalLoading`, covers 006-terminal-FR-070 and SC-013: `/` and `/cv` request no `shell-*.js`; opening the Terminal requests it once, and closing and reopening requests nothing more; with its response held, the starter chips, the prompt and the command line show at once with `p.shell-loading` under the chips, two lines typed wait after their prompts and run in order once it is released, and the loading line goes; with it answered 503, `p.shell-failed` and `try again` show, and `try again` after the route answers again runs the waiting lines; the `os` script's gzipped size is within T127's budget; the shell is ready within 1 s, and within 3 s with 4× CPU throttling and Lighthouse's mobile network (1.6 Mb/s, 150 ms) over CDP.
  - Done 2026-10-29: `terminal/loading.test.ts`, 5 tests (requests read with the page's own `request` events and service workers blocked). Ready in under 1 s, and under 3 s with 4× CPU and Lighthouse's mobile network.
- [X] T162 [P] [US1] Write `packages/web/test/terminal/stop.test.ts`, covers 006-terminal-FR-069: during `i=0; while :; do i=$((i+1)); done` (raised command count through a variable the line sets, so it runs to the 5 s limit), a click on the CV window brings it to the front and a key types in another app; within 6 s the run shows `p.run-stopped` with the time line and a new prompt; a worker made to hang (a fixture build whose worker never answers `run`) is terminated after 6 s and restarted from the snapshot, so a variable and a visitor's file made before survive.
  - Done 2026-10-29: `terminal/stop.test.ts`, 2 tests, on a fixture build (`serveShellFixture` with `edit`) whose `LIMITS.commands` is raised, so the loop runs to the 5 s limit, and whose worker spins forever on the line `hang`: no line can raise the count on the real build.
- [X] T163 [P] [US1] Write `packages/web/test/terminal/cursor.test.ts`, covers 006-terminal-FR-072 (US1 scenario 18): the command line's computed `outline-style`, `border-*-width`, `box-shadow` and `background-color` are none, 0 or transparent, focused and not; `span.cursor-mirror`'s cursor has `data-focused` and the filled style with focus, and the hollow style (a 2 px outline, no fill) without; both colors are at least 3:1 against the screen's computed background (004's contrast helper); every other control's focus outline still shows.
  - Done 2026-10-29: `terminal/cursor.test.ts`, 3 tests (contrast from the site check's `contrast`, against the window's glass).
- [X] T164 [P] [US1] Write `packages/web/test/terminal/focus-click.test.ts`, covers 006-terminal-FR-071: with focus on the dock, a click on the output's empty space, on a line of text and beside the starter chips focuses the command line, keeps `.terminal-screen`'s `scrollTop` and the typed text; a click on a link, a chip and a fold line, and inside the vim view, doesn't; a drag that selects output text keeps the selection and doesn't move focus.
  - Done 2026-10-29: `terminal/focus-click.test.ts`, 4 tests. Links keep their click (the test stops their navigation in the page), a chip runs its line once, and a click in the vim view leaves focus there.
- [X] T165 [P] [US1] Update `packages/web/test/terminal/command-line.test.ts` and `controls.test.ts`:
  - covers 006-terminal-FR-018: `echo '<b>x</b>'` and `printf '\e]8;;https://x\e\\x'` print text, with no `b` or `a` element made; the old cases stay;
  - covers 006-terminal-FR-015: a name in `help`'s standard group runs `help <name>` on click, Enter and Space, as typed in the output and `history`; the site's commands in `help` still run themselves.
  - Done 2026-10-29: `command-line.test.ts` gains the `echo`/`printf` case; `controls.test.ts`'s control list now ends with `help <name>` for every name of `STANDARD_GROUP`, and `grep`, `export` and `yes` run `help <name>` by click, Enter and Space.
- [X] T166 [P] [US1] Update `packages/web/test/terminal/output.test.ts`, `open-command.test.ts`, `history.test.ts` and `vim.test.ts`:
  - covers 006-terminal-FR-005: while the shell loads, its loading line sits under the starter chips;
  - covers 006-terminal-FR-014: `true && open cv` opens the CV, after the line's output;
  - covers 006-terminal-FR-020: `history 2` lists the last two, `history -c` empties it;
  - covers 006-terminal-FR-056: `cat cv.json | jq`'s colored rows' text equals the plain printed text, and `jq . cv.json | head` is plain text.
  - Done 2026-10-29: cases added to `output.test.ts` (FR-005), `open-command.test.ts` (FR-014, `true && echo before && open cv`), `history.test.ts` (FR-020) and `vim.test.ts` (FR-056).
- [X] T167 [P] [US1] Update `packages/web/test/terminal/state.test.ts`, `requests.test.ts`, `site-text.test.ts` and `performance.test.ts`:
  - covers 006-terminal-FR-021: minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize also keep a variable, a function, a visitor's file and the working folder; closing and reopening shows nothing of them (`echo $X`, `f`, `ls notes`);
  - covers 006-terminal-FR-022: running every command `help` lists and T160's lines requests only `127.0.0.1`, and storage stays empty;
  - covers 006-terminal-FR-030: every value T132 added is English and holds no key fact of the real CV;
  - SC-002: Enter to output stays under 100 ms at 1440 px and 300 ms with 4× CPU throttling, through the worker, for every command `help` lists.
  - Done 2026-10-29: `state.test.ts` gains 4 cases (minimize, Home, resize, close); `requests.test.ts` also runs `LANGUAGE_CASES`; `site-text.test.ts` checks T132's 15 values and lets the standard group's names show; `performance.test.ts` now stops its clock when no run is busy, so it times the worker's answer.

### Implementation for User Story 1

- [X] T168 [US1] Add the limits to `packages/web/src/apps/terminal/shell/adapter.ts` after T156 (research R33, G13, G15): `executionLimits` `{ maxExecutionTimeMs: 5000, maxCommandCount, maxOutputSize: 1048576, maxLoopIterations: 1_000_000_000 }`, set once in the adapter (the spec's numbers, not design values), where `maxCommandCount` is 10,000 plus the prelude's and epilogue's command count for that line (FR-069); recognize each limit's message and status (124 for the deadline, 126 for the others) and output that reached exactly 1,048,576 bytes, and return `end: 'limit'` with its kind, the stdout printed before it, and the state as before the line. T156 passes.
  - Done 2026-10-29: the limits were already in (T144). Changed: just-bash's `maxOutputSize` is `LIMITS.pipe` (4 MB) and the adapter stops a line whose own stdout and stderr reach 1 MB; a line stopped by the output limit returns no stdout, stderr or recordings, only `end: 'limit'` (research R33 "Built 2026-10-29"). `pipeline: total output size exceeded` is recognized too. T156 passes.
- [X] T169 [US1] Implement `help`'s standard group and `help <name>` in `packages/web/src/apps/terminal/engine/commands.ts` and `shell/site-commands.ts` after T155 and T159 (research R32): `help`'s block lists the site's commands and aliases, then the group's heading and note and every name of `STANDARD_COMMANDS` and `SHELL_BUILTINS` the table doesn't list, in name order, each a control running `help <name>`; `help <name>` gives a site command's own help, runs `<name> --help` for a standard command, and for a builtin the shell's own `help <name>` through `ctx.origCommand`. The adapter registers only `STANDARD_COMMANDS` and the site's commands. T154, T155 and T159 pass.
  - Done 2026-10-29: the heading and note share one line, two spaces apart, as the design draws them; `standard.test.ts` reads it so. T154, T155 and T159 pass.
- [X] T170 [US1] Render the standard group in `packages/web/src/apps/terminal/Output.tsx` after T169 (design/wireframes.md, `help` states): the heading and note in their design colors, the names as inline controls in rows of `size.terminal-control-row`, spaced as the design sets for WCAG 2.5.8's spacing exception, the group carrying `data-req="006-terminal-FR-008 006-terminal-FR-068"`; and `p.run-stopped` for a stopped run, `data-req="006-terminal-FR-069 006-terminal-FR-075"`. T157, T160 and T165 pass.
  - Done 2026-10-29: the standard group's line is `p.out-standard-heading` (heading bold, `font.weight.semibold`) and its names `ul.out-columns.out-standard`, both `data-req="006-terminal-FR-008 006-terminal-FR-068"`, names `space.4` apart, each at least a 24 px target; a stopped run's line is `p.run-stopped` (`data-req="006-terminal-FR-069 006-terminal-FR-075"`), `stopped` in the error tone and the reason in the secondary (`stoppedLine` in `output-map.ts`). T157, T160 and T165 pass.
- [X] T171 [US1] Give the command line a terminal's cursor in `packages/web/src/apps/terminal/CommandLine.tsx` and `terminal.css` after T131 and T163 (research R36, design/README.md "The cursor and the selection"): no border, outline, background or shadow on `input.command-line`, focused or not, with 005's focus outline turned off for it only; `span.cursor-mirror` sets `data-focused` from the input's focus and draws the cursor filled in `--token-color-terminal-cursor` with the letter under it in `--token-color-terminal-cursor-text`, or hollow as a `border.thick` outline inside its box; `data-blinking` set on focus and on each key press, and removed by a timer of `motion.duration.cursor-idle` read through `src/os/metrics.ts` (add `cursorIdle` to `TERMINAL`), the blink a `steps(1)` animation over `--token-motion-duration-cursor-blink` (on half, off half showing no cursor); no animation at all under `prefers-reduced-motion: reduce`. `input.command-line` lists `006-terminal-FR-072` beside its IDs, and `span.cursor-mirror` `006-terminal-FR-032 006-terminal-FR-072`. T163 passes.
  - Done 2026-10-29: as written, but the blink isn't `steps(1)`: token-check refuses a written-out easing and there is no step easing token, so `@keyframes cursor-blink` holds the filled cursor from 0% to 50% and none from 50.01% to 100% (a 0.1 ms change: no fade). Each key press remounts the cursor block, so the blink starts again shown. The forced-colors rule for the hollow cursor reads `data-focused`. T163 passes.
- [X] T172 [US1] Add click to focus in `packages/web/src/apps/terminal/Terminal.tsx` after T164 (research R36): on `div.terminal-screen` (`data-req="006-terminal-FR-071 006-terminal-FR-075"`), a `pointerdown` records the page's selection, and a `pointerup` that isn't on or inside an `a`, a `button`, an `input` or `section.vim`, and after which the selection is collapsed or unchanged, focuses the command line with `preventScroll` and no change to its text; on touch, it focuses without `inputmode="none"`, so the keyboard opens. T164 passes.
  - Done 2026-10-29: `pointerdown`/`pointerup` on `div.terminal-screen` in `Terminal.tsx`, comparing the selection's text and ends; it removes `inputmode` before focusing, so a tap opens the keyboard. T164 passes.
- [ ] T173 [US1] Finish US1 after T168 to T172: delete the site text no code uses any more (`pipe-usage`, the "doesn't read piped input" reply, `jq`'s "only pretty-prints" and "is not JSON" replies, the old unknown reply's wording) from `packages/web/src/site-text.ts`; run `npm run typecheck`, `npm run content-check`, `npm run token-check` and `npm test`; T154 to T167 pass, and T158 passes with GNU tools on `PATH`. Record any line T158 had to leave out, and why, here and in research R38.
  - Done 2026-10-29 except T158: the five unused strings are gone from `site-text.ts` (`jqNotJson`, `jqFilter`, `noInput`, `pipeUsage`, `pipeExample`; the unknown reply was already reworded). `npm run typecheck`, `content-check` and `token-check` pass. `npm test` at 20:44: 82 failed of 1829, 42 of them T158's; T154 to T157 and T159 to T167 pass, and every other failure is in T153's list or comes from T171's no-box command line: `modes.test.ts` ×3 (the command line's forced-colors border and focus outline, T192 and T195) and `data-req.test.tsx` (`input.command-line` now lists FR-072, T209). T158's left-out line (`tree`) and its `sort` are recorded in research R38.
  BLOCKED: T158 can't pass on this machine (macOS bash 3.2, no GNU tools); needs the GNU tools on PATH or a CI run.

**Checkpoint**: the Terminal is a bash-like shell on desktop, its cursor is its focus indicator,
and a runaway line never freezes the page. This is the amendment's MVP.

---

## Phase 19: User Story 3 - files the visitor can make, beside protected ones (Priority: P3)

**Goal**: the CV and spec files are protected with bash's "Permission denied", the visitor makes,
moves and removes files anywhere else up to 1 MB, `ls -l` shows who owns what, and the standard
commands search the CV's files (US3 scenarios 9 to 11).

**Independent Test**: at 1440 × 900, run `rm about`, `mv work jobs`, `echo hi > cv.json` and
`rm -rf ~`, then `cat about`, `ls work` and `cat cv.json`; run
`mkdir notes && echo hi > notes/a && mv notes/a notes/b && cat notes/b`, `ls`, `ls -l`,
`grep -ril rest ~/work`; close the Terminal, open it, and `ls` has no `notes`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T174 [P] [US3] Extend `packages/web/test/terminal/shell/fs.test.ts` with whole command lines through `shellFor`, covers 006-terminal-FR-049: `rm about`, `rm -rf ~`, `mv work jobs`, `cp skills about`, `touch work/new`, `mkdir specs/x`, `echo hi > about`, `echo hi >> about`, `echo hi | tee about` and `sed -i s/a/b/ about` on every kind of protected path give a message ending `Permission denied` that names the path as typed, once per path (`tee`'s reason may be wrong until research G5's fix, and the test says so); `rm -rf ~` removes the visitor's files and leaves every protected file; the protected tree is equal before and after a scripted run of every command of FR-068 on it; `ls -l` shows protected entries `-r--r--r--` or `dr-xr-xr-x` with `root root`, and the visitor's with `guest guest`; `echo hi > about` keeps the output of `echo a; echo hi > about; echo b` (`a`, then the error, then `b`, research G1).
  - Done 2026-10-29: 31 refused lines over a built file, a built folder, a file in one (there and new), `/bin`, `/usr/bin`, `/home`, `/` and other capitals, each with its exact message and the tree unchanged after; `rm -rf ~` names each protected file once and keeps the visitor's none; `rm -rf /` gives GNU's preserve-root lines; a dump of every protected path and file is equal before and after one line per command of FR-068; `ls -l` owners and modes, piped and recorded. Fixes it led to: `cp`/`mv` name the destination as GNU's do (research G20), `tee`/`sed` keep "No such file or directory" for a missing file or folder, `rm -rf /tmp` says why once, and `/bin` no longer lists `__cv_*`.
- [X] T175 [P] [US3] Rewrite `packages/web/test/terminal/engine/files.test.ts`'s FR-049 case, covers 006-terminal-FR-049 and 006-terminal-FR-012: the case that `rm`, `mkdir`, `touch`, `mv` and `sudo` get the unknown reply goes (T174 covers FR-049 now); the protected tree's builder still holds every section of every fixture CV, in order, and every entry's file; `sudo` stays in `suggest.test.ts`.
  - Done 2026-10-29: the FR-049 "unknown commands" case is gone; the tree-unchanged case also runs `rm -rf ~`, `mv work jobs` and `echo hi > about`; the FR-012 cases read `pwd` as `/home/guest/{folder}` and FR-044's missing file gives `cat`'s own message.
- [X] T176 [P] [US3] Rewrite `packages/web/test/terminal/files.test.ts` on the real build:
  - covers 006-terminal-FR-043 and 006-terminal-FR-073: `touch zz aa` then `ls` lists `aa` and `zz` after `specs/`, as controls; `mkdir notes` lists `notes/`, a folder by its slash;
  - covers 006-terminal-FR-046: after `cd /tmp` the prompt and the window title read `/tmp`; `pwd` in `~/work` prints `/home/guest/work`, and the prompt reads `~/work`;
  - covers 006-terminal-FR-049: `ls -l` is drawn with `root root` and `guest guest`, the folder names ending in `/` and still controls; piped (`ls -l | cat`) it is GNU's text;
  - covers 006-terminal-FR-050: `ls | cat` shows plain names with no control; the old cases stay.
  - Done 2026-10-29: the new cases (visitor's names after `specs/`, `cd /tmp`, `pwd`'s full path, `ls -l` drawn and piped, `ls | cat`) pass on the real build; the old FR-050 walk now waits for each run to finish (`cat ~/cv.json` was read while pending), and FR-021's cases read `pwd` as `/home/guest/work`.
- [X] T177 [P] [US3] Extend `packages/web/test/terminal/shell.test.ts` in both shells (`describe.each` over 1440 × 900 and 375 × 812 with touch):
  - covers 006-terminal-FR-049: US3 scenario 9 as written, with `cat about`, `ls work` and `cat cv.json` unchanged after;
  - covers 006-terminal-FR-073 and 006-terminal-FR-021: US3 scenario 10 as written; after closing and opening the Terminal, `ls` has no `notes`, and `ls /tmp` is empty;
  - covers 006-terminal-FR-012 and 006-terminal-FR-068: US3 scenario 11, `grep -ril {a word of the first role's summary, read from resume} ~/work` lists exactly the work files whose text holds it; `find ~ -name '*.json'` lists `/home/guest/cv.json`; `tree ~/work` lists every work file.
  - Done 2026-10-29: in both shells. The phone shell has no close and `exit` there goes home keeping the session (FR-021), so the mobile case closes the Terminal as a desktop window after a resize, and opens it again at 375 px.

### Implementation for User Story 3

- [X] T178 [US3] Give `ls` its owners in `packages/web/src/apps/terminal/shell/site-commands.ts` (`ls` wrapper) and `Output.tsx` after T174 and T176 (research R28, G7): replace the owner and group columns of `ls -l`'s lines with `root root` for protected entries and `guest guest` for the visitor's, from TerminalFs's `FsEntryInfo`; when `ls -l`'s output reaches the screen unchanged, record it so folder names keep their trailing slash and are controls, as in `ls`, with the owners in the design's colors (`guest` in haze, the details in fog); keep `ls`'s home order for the visitor's names after the built ones.
  - Done 2026-10-29, tested by T174 and T176. `ls` with an `-l` flag goes through `longListing` in `site-commands.ts`: owner and group become `root`/`guest` padded to one width, protected modes `-r--r--r--`/`dr-xr-xr-x`, and unpiped it records a block of `p.out-line`s (text with `stream: 'stdout'`, so spaces keep) whose names are `ls`/`cat` controls, folders ending in `/`, `guest` in the secondary tone and the rest dim. Only zero or one path is handled; `ls -ld a b` is left as just-bash prints it.
- [X] T179 [US3] Protect the tree from whole commands in `packages/web/src/apps/terminal/shell/site-commands.ts` and `adapter.ts` after T174 (research R28): an `rm` wrapper that walks a recursive target itself, deepest first, removing the visitor's entries and printing `rm: cannot remove '{path}': Permission denied` once per protected path; and, until just-bash's G1 fix is released, the redirect guard: a transform plugin registered with `registerTransformPlugin` that replaces a command whose literal output redirect target resolves to a protected path with `__cv_denied '{target}'`, which prints `bash: {target}: Permission denied` and returns 1. Mark the plugin with a comment naming G1 and T129's issue, to be deleted once the fix ships (plan's Dependencies table). T174, T175, T176 and T177 pass.
  - Done 2026-10-29: T174 to T177 pass. `rm` wrapper (`-r`/`-R` walk deepest first, `rm: cannot remove '{path}': Permission denied` per protected file, folders keeping one stay silent; without `-r` it is just-bash's; it now answers `--help`, so `rm` left `helped`). Redirect guard `guardPlugin(fs, cwd)` in `adapter.ts` (comment names G1), with `fs.refusesWrite(path)` and `__cv_denied` (`DENIED`), which prints `bash: {target}: Permission denied`, `~` expanded as bash does. Limit: the target is resolved from the folder the line starts in, so `cd work; echo x > y` still ends the line. Also added: `sed` and `tee` wrappers that turn "No such file or directory" into "Permission denied" for a refused write (G5 and a new one for `sed -i`, research G19). The guard's start-folder limit is written under R28. Probed in Node: `rm -rf ~` removes the visitor's files and lists each protected one with status 1; `echo a; echo hi > about; echo b` prints `a`, the error and `b`.

**Checkpoint**: the file system is a real one beside the protected CV.

---

## Phase 20: User Story 4 - the pocket terminal with the shell (Priority: P4)

**Goal**: the amendment's states fit the pocket terminal at 320 px and in landscape, and a tap on
its screen puts focus in the command line and opens the keyboard.

**Independent Test**: at 375 × 812 and 320 × 568 with touch, run `help` and scroll to its standard
commands, `ls -l` and `work | grep -i {word}`; nothing scrolls sideways. Tap an empty part of the
screen: the command line takes focus and the keyboard opens.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T180 [P] [US4] Extend `packages/web/test/terminal/pocket.test.ts`:
  - covers 006-terminal-FR-052 and 006-terminal-FR-023: at 320 × 568, 375 × 812 and 568 × 320, after `help` (scrolled to the standard group), `ls -l` and `work | grep -i {word}`, the screen has no horizontal scroll and every standard name wraps inside it (exports `phone-19-after-help-320.png` to `phone-21-pipe-and-filter-320.png`);
  - covers 006-terminal-FR-071 and 006-terminal-FR-053: a tap on the screen's empty space focuses the command line without `inputmode="none"`, and with the page made 300 px shorter `data-keyboard` is set; a tap on a chip or key still leaves `inputmode="none"`;
  - covers 006-terminal-FR-025: the tap search from the starter chips and the keys still reaches every CV section, `site`, `specs` and every file, and a standard group name reached that way runs `help <name>`.
  - Done 2026-10-29: at 320 × 568, 375 × 812 and 568 × 320 nothing in the screen reaches past its edge after `help` (its standard names on several rows), `ls -l` and `work | grep -i {word}`; the tap search also runs `help <name>` for every standard name; the two tap cases found T181's fix.

### Implementation for User Story 4

- [X] T181 [US4] Fix what T180 finds in `packages/web/src/apps/terminal/Pocket.tsx`, `pocket.css` and `terminal.css`, with tokens only: the standard group and `ls -l` rows at `typography.terminal-pocket` and `-pocket-narrow`, the hollow and filled cursor in the pocket's type size, and the screen's tap path through T172's handler without `inputmode="none"`. Record each fix here. T180 passes.
  - Done 2026-10-29. One fix, in `Terminal.tsx`: a tap's compatibility `mousedown` comes after its `pointerup`, so the screen's handler focused the line and the `mousedown` then moved focus to the page. A tap now focuses on its `click` (a mouse still on `pointerup`), and a line that already has focus with `inputmode="none"` (after a key or chip) is focused again without it, so the keyboard opens. No CSS change: the standard group, `ls -l`'s rows, the line and the cursor all measure 12.5/19 px at 375 and 12/18 px at 320, the `terminal-pocket` and `-pocket-narrow` tokens.

**Checkpoint**: the amendment works on phones.

---

## Phase 21: User Story 5 - a terminal's keys, select all and Ctrl+C (Priority: P5)

**Goal**: the command line takes the system's editing keys with the cursor and selection following
them, and on macOS the readline keys; Cmd+A or Ctrl+A selects the Terminal's text and nothing
else; Ctrl+C cancels a line or stops a run; screen readers hear the new events once (US5
scenarios 8 to 10).

**Independent Test**: at 1440 × 900, type `cat cv.json | jq`; with the platform set to macOS,
Cmd+Left, Option+Right twice and Cmd+Right move the cursor as US5 scenario 8 sets; Ctrl+W then
Cmd+Z; Cmd+A then copy; Ctrl+C on a typed line and on `while true; do :; done`.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T182 [P] [US5] Write `packages/web/test/terminal/line-keys.test.ts`, with the platform set per case through `navigator.userAgentData` and `navigator.platform` overrides in an init script:
  - covers 006-terminal-FR-074: on macOS, in `cat cv.json | jq`, Cmd+Left puts the caret at 0, each Option+Right at the next word end the field gives, and Cmd+Right at 16, and the mirror's cursor is at the field's caret after each (US5 scenario 8); Ctrl+A, Ctrl+E, Ctrl+B, Ctrl+F, Ctrl+K, Ctrl+U and Ctrl+W do readline's, and Cmd+Z after Ctrl+W restores the word; Ctrl+L clears the output and keeps the line; Shift+Option+Left selects a word and the mirror shows it selected in the selection colors; on macOS, Option+Backspace deletes the word before the caret, Cmd+Backspace everything before it, and Delete the character after it; the system's redo (Cmd+Shift+Z on macOS, Ctrl+Y on Windows, Ctrl+Shift+Z on Linux) after an undo restores the change; on Linux and Windows, Home, End, Ctrl+Left, Ctrl+Right, Ctrl+Backspace and Shift+Home do the same through the field;
  - covers 006-terminal-FR-026: on each platform, every key the plan's FR-026 table and research R37 reserve (Ctrl+W, Ctrl+L, Ctrl+U, Ctrl+K and Ctrl+E on Linux and Windows; Cmd+L, Cmd+W, Cmd+T; every `Alt+Shift` shortcut; Tab) is not `defaultPrevented`.
  - Done 2026-10-29. `test/helpers/shell.ts`'s `platform` option gains `Linux`. Playwright gives a key its macOS editing command by the machine it runs on, not the page's platform, so the case of the system's macOS keys (Cmd+Left, Option+Right, Option+Backspace, Cmd+Backspace, Cmd+Z, Cmd+Shift+Z) runs only on a Mac, and the Linux and Windows field keys only elsewhere; each is skipped on the other host. The readline keys and the reserved keys run on every host. A reserved key counts as taken only when the Terminal prevented it: the OS shell's own Alt+Shift shortcuts (005) are handled before, on the document. Screen readers' own keys (NVDA's Insert) never reach the page, so aren't in the list.
- [X] T183 [P] [US5] Write `packages/web/test/terminal/select-all.test.ts`, covers 006-terminal-FR-075: after `help` and `work` with `abc` typed, Cmd+A (macOS) and Ctrl+A (others), from the command line and from the output, select a range inside `.terminal-screen` only, whose text holds the outputs and `abc`, and nothing of the dock, the menu bar or the CV window; the copied text (read through the clipboard permission) has no cursor character and no control's `aria-label`; a letter typed then clears the selection and is added to the command line.
  - Done 2026-10-29, on macOS (Cmd+A) and Windows (Ctrl+A), from the command line and from a control in the output; the copy is made with the system's copy command (`execCommand('copy')`), as Playwright's copy key follows the host.
- [X] T184 [P] [US5] Extend `packages/web/test/terminal/stop.test.ts`, covers 006-terminal-FR-075: Ctrl+C with `abc` typed and nothing selected shows `abc` with `^C` and an empty prompt, and `abc` isn't in `history`; during `while true; do :; done` it stops the line at once with `stopped: you pressed Ctrl+C.`, and a variable set before survives; with output text selected, Ctrl+C isn't `defaultPrevented`.
  - Done 2026-10-29: the loop runs on the runaway build (commands not limited), so Ctrl+C, not the command limit, stops it.
- [X] T185 [P] [US5] Update `packages/web/test/terminal/engine/announce.test.ts`, covers 006-terminal-FR-028: `help` → `help: {n} commands`, counting the standard group too (design); `grep -r a ~` printing 12 lines → `grep: 12 lines`; one line of text → `grep: 1 line`; Ctrl+C → `Cancelled`; a stopped line → its "stopped" text; the shell loading → `Loading the shell`.
  - Done 2026-10-29: `pwd` reads `/home/guest`; the session cases drive the real shell client with a worker in Node (`hang` never answered).
- [X] T186 [P] [US5] Update `packages/web/test/terminal/screen-reader.test.ts` and `keyboard.test.ts`:
  - covers 006-terminal-FR-028: the status region holds `Loading the shell` once while loading, a stopped line's text once, and `Cancelled` once after Ctrl+C, and focus stays in the command line;
  - covers 006-terminal-FR-029: `work | grep -i {word}` shows text with no heading inside its run; `help`'s standard group is one list in the accessibility tree, a `listitem` per name;
  - covers 006-terminal-FR-026: Tab from the command line still moves focus on with the value unchanged, with the readline keys in place.
  - Done 2026-10-29: the stopped line is the command limit's (`while true; do :; done` on the real build); `keyboard.test.ts`'s "not prevented" case now sends only keys the Terminal doesn't add (R37's are `line-keys.test.ts`'s), and its Tab case presses macOS's Ctrl+A first.

### Implementation for User Story 5

- [X] T187 [US5] Add the line keys to `packages/web/src/apps/terminal/CommandLine.tsx` after T182 (research R37's table): read the platform from `navigator.userAgentData?.platform`, then `navigator.platform`; on macOS only, Ctrl+A, Ctrl+E, Ctrl+B and Ctrl+F set the field's selection, and Ctrl+K, Ctrl+U and Ctrl+W select their range and delete it with `document.execCommand('delete')` (`setRangeText` where it is missing), so the system's undo still works; Ctrl+L sends the `clear` effect without a run, keeping the line; leave every other key to the field and the browser, and on Windows and Linux leave Ctrl+W, Ctrl+L, Ctrl+U, Ctrl+K and Ctrl+E alone. `input.command-line` lists `006-terminal-FR-074 006-terminal-FR-075` beside its IDs.
  - Done 2026-10-29: `isMac()` and the keys in `CommandLine.tsx`; Ctrl+L calls the session's `clear()`, as the menu's Clear output does.
- [X] T188 [US5] Draw the line's selection in `packages/web/src/apps/terminal/CommandLine.tsx` and `terminal.css` after T187 (research R36, data-model.md "Cursor and selection"): the mirror draws `selectionStart` to `selectionEnd` in `--token-color-terminal-selection` behind `--token-color-terminal-selection-text`, with the cursor at the selection's moving end (`selectionDirection`), updated on `selectionchange`; `::selection` in the output uses the same two tokens; the input's own text and caret stay transparent. `span.cursor-mirror` lists `006-terminal-FR-074` beside its IDs.
  - Done 2026-10-29: the mirror draws runs of the line, plain or `span.cursor-selected`, with the cursor's block at the moving end (on a backward selection it sits on the selection's first letter); the field's own `::selection` is transparent.
- [X] T189 [US5] Add select all and Ctrl+C after T183 and T184, in `packages/web/src/apps/terminal/Terminal.tsx`, `CommandLine.tsx` and `session.ts` (research R33, R37): Cmd+A (macOS) and Ctrl+A (others) in the command line or the output call `Selection.selectAllChildren` on `.terminal-screen`, keeping focus in the input, and the next `beforeinput` collapses the page's selection so the letter is typed; the cursor's block draws no text past the line's end and controls copy their visible text; Ctrl+C with the page's selection collapsed calls the session's `cancel()`: with a line running, `shell-client.cancel()` and the "stopped" Ctrl+C line, else an entry with the typed text and `^C`, not added to `history`, and an empty draft. In the vim view its own keys apply (FR-060).
  - Done 2026-10-29: `Terminal.tsx` selects all from the command line (its key handler) and from the output (a `keydown` listener on the screen); a `beforeinput` on the field collapses the page's selection. Past the line's end the cursor's block draws a no-break space with `::before`, which a copy leaves out. Ctrl+C: `session.cancel()`; the client's `cancel()` now ends the line with the new limit `cancelled`, so the output map adds the Ctrl+C "stopped" line, and the entry carries `cancelled`, drawn as `span.run-cancel` with `^C`.
- [X] T190 [US5] Update `packages/web/src/apps/terminal/engine/announce.ts` and `session.ts` after T185 (contracts/terminal.md announcements): `help` counts its standard names; text runs give `{command}: {n} lines` through `counted`; `Cancelled`, the "stopped" lines and `Loading the shell` are written to `.terminal-status` once each, `Loading the shell` politely and only on the first open. T182 to T186 pass.
  - Done 2026-10-29: `counted()` adds `help`'s standard names to its table's and counts a text run's lines (not its rows); a stopped line is announced by its "stopped" text alone; `Cancelled` on a typed line's Ctrl+C. `Loading the shell` was already said once, on the first open, in the polite status region. T182 to T186 pass.

**Checkpoint**: the command line works as a terminal's, and is heard once per event.

---

## Phase 22: User Story 6 - the blink, forced colors and the new states (Priority: P6)

**Goal**: the cursor blinks while the line has focus and stops within 5 s, never under reduced
motion; forced colors keep the filled and hollow cursor and the selection visible; every new state
holds WCAG 2.2 AA, its targets and its wrapping.

**Independent Test**: type in the command line and watch the cursor stop blinking after 5 s; with
reduced motion it never blinks; with forced colors the filled and hollow cursor and a selection
show; at 200% text zoom `seq -s ' ' 400` wraps.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T191 [P] [US6] Rewrite `packages/web/test/terminal/motion.test.ts`, covers 006-terminal-FR-032 (SC-008): with focus in the line and no reduced motion, the cursor has a running animation after a key press and none 5 s after the last one, staying filled, and a key press starts it again; with focus elsewhere it never animates; with reduced motion it never has one, and sampled frames while opening, running commands, a stopped line and pressing pocket keys show no `transform` or `scale` change, in both shells. The old "no animation at 0 and 6 s" case goes.
  - Done 2026-10-29: the blink is read as the cursor's running animations; the reduced-motion watch also covers a line stopped by its limit.
- [X] T192 [P] [US6] Extend `packages/web/test/terminal/modes.test.ts`, covers 006-terminal-FR-033: with forced colors the filled cursor is `Highlight` with a 1 px `Highlight` bottom edge and its letter `HighlightText`, the hollow one a 2 px `Highlight` outline, a selection in the line and in the output the system's `Highlight` and `HighlightText`, `p.shell-failed`'s `try again` chip and `p.run-stopped` are visible, and the command line has no border though every other control's focus outline shows; with reduced transparency the window stays solid.
  - Done 2026-10-29: the command line's box check is now "no border" and "no outline" (FR-072); the selection in the line is set through the field, as Playwright's Home and End follow the host. The failed state answers the worker's file with 503.
- [X] T193 [P] [US6] Add the amendment's states to `packages/web/test/helpers/terminal.ts`'s `TERMINAL_STATES` and extend `packages/web/test/terminal/targets.test.ts` and `accessibility.test.ts`, covers 006-terminal-FR-034 and 006-terminal-FR-035: the states focus elsewhere (the hollow cursor), after `help` scrolled to its standard group, a selection in the line, selected all, after Ctrl+C, loading, failed to load, stopped by its limit, `ls` with the visitor's files, `rm` and `ls -l`, a pipe and a filter, and a syntax error after "command not found", on desktop and mobile; in each, every control is at least 24 × 24 px or within the design's spacing exception for the standard names, pocket keys 44 × 44, and axe finds nothing; 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep every part of `help`'s standard group and `ls -l` visible.
  - Done 2026-10-29: 12 states in `SHELL_STATES`, shared by both shells; `TerminalState.shell` opens the Terminal with the worker held back (`loading`) or answered 503 (`failed`). The zoom, text-zoom and spacing cases also run `touch mine; ls -l`. All 110 target and axe cases pass.
- [X] T194 [P] [US6] Extend `packages/web/test/terminal/layout.test.ts`, `design.test.ts` and `packages/web/test/tokens.test.ts`:
  - covers 006-terminal-FR-023: `seq -s ' ' 400` and a 400-character `echo` wrap with no horizontal scroll in a 400 px window and at 320 px; selecting output by drag still copies it;
  - covers 006-terminal-FR-031: the filled cursor's computed fill and letter, the hollow outline, and the selection's colors come from T131's tokens, and the blink's duration from `motion.duration.cursor-blink`; `tokens.test.ts` asserts every token T131 added is read by a style sheet or `metrics.ts`.
  - Done 2026-10-29. The motion tokens aren't in the Penpot export, so `tokens.test.ts` checks them by name in the built CSS and `metrics.ts`; the old "motion source unchanged from 003" case now lists T131's two durations.

### Implementation for User Story 6

- [X] T195 [US6] Add the modes to `packages/web/src/apps/terminal/terminal.css` and `pocket.css` after T191 and T192 (research R19, R36): under `forced-colors: active`, the filled cursor in `Highlight` with a 1 px `Highlight` block-end border and `HighlightText` for its letter, the hollow cursor a 2 px `Highlight` outline, `::selection` and the mirror's selection in `Highlight` and `HighlightText`, the command line with no border, outline or background; under `prefers-reduced-motion: reduce`, no animation on the cursor. T191 and T192 pass.
  - Done 2026-10-29: the forced-colors rules for the hollow cursor, the selection (`::selection` and `.cursor-selected`) and the command line (no border, outline or background). In forced colors the cursor doesn't blink: the blink's computed colors were painted over as `Canvas`, so it showed white half the time (research R36). Reduced motion already had no animation.
- [X] T196 [US6] Fix any target, wrap, zoom or axe failure T193 and T194 find in `terminal.css`, `pocket.css` or the components, with tokens only. Record each fix here. T193 and T194 pass.
  - Done 2026-10-29: nothing to fix; T193 and T194 passed with the CSS as T195 left it.

**Checkpoint**: every new state holds WCAG 2.2 AA in every mode.

---

## Phase 23: User Story 7 - the shell offline and after an update (Priority: P7)

**Goal**: after one online visit, the shell loads from the cache and every command works offline;
a page from an older version still loads its shell after a new version activates.

**Independent Test**: visit `/` once, go offline, open the Terminal at 375 and 1440 px, run every
command `help` lists and a pipe. Then publish a second build with the page open, and open the
Terminal: the shell loads, online and offline.

### Tests for User Story 7 (REQUIRED) ⚠️

- [X] T197 [P] [US7] Extend `packages/web/test/terminal/offline.test.ts`, covers 006-terminal-FR-036 and 006-terminal-FR-070: after one visit to `/`, and separately to `/cv` only, `/` offline at 375 and 1440 px opens the Terminal, the shell starts from the cache (no `p.shell-failed`), every command `help` lists and `work | grep -i {word}` give the online output, and no offline message shows.
  - Done 2026-10-29: the outputs also hold `work | grep -i {word}`, each page checks no `p.shell-failed`, and the first case checks the stored copy lists one `shell-*.js` and one `shell-licenses-*.txt`.
- [X] T198 [P] [US7] Extend `packages/web/test/offline.test.ts`, covers 006-terminal-FR-070 (research R35): with a page from build A open, build B is published and its service worker activates; the page then opens the Terminal and its shell loads, online and offline; once that page closes, A's cache is deleted on the next `fetch`, `message` or `activate`; with no page open, `activate` deletes older caches at once, as before; every cache holds one complete version.
  - Done 2026-10-29: two A pages are open when B is published; A's page finds it with `registration.update()`, and B's activation keeps A's cache (its record under `/__cv/kept` shows it activated). One A page runs a line online, the other opens the Terminal offline; A's cache holds A's files and B's B's plus the record; after both close, the next visit's request deletes A's. A second case closes the page before B activates: A's cache is gone at once. 004's "B replaces A" and "no dialog" cases now close their pages before expecting one cache, as a visiting page keeps the older cache open (contracts/site.md).

### Implementation for User Story 7

- [X] T199 [US7] Keep the caches open pages need in `packages/web/src/sw/service-worker.ts` after T198 (contracts/site.md "Service worker"): `activate` deletes older caches only when `clients.matchAll({ type: 'window' })` finds none, else keeps them and records, under `/__cv/kept` in its own cache, each kept cache's name and the open clients' ids; `fetch` answers a request under `/assets/` from the current cache, then a kept one, then the network; on `fetch`, `message` and `activate`, a kept cache whose recorded clients are all gone is deleted with its record. Nothing reloads or interrupts the page (005 FR-053). T198 passes.
  - Done 2026-10-29: `activate` keeps older caches when `clients.matchAll({ type: 'window', includeUncontrolled: true })` finds a window (a page under the older worker isn't yet this one's client), recording their ids; `/assets/` requests try the kept caches after the current one; `fetch`, `message` and `activate` drop a kept cache whose windows have all closed.
- [X] T200 [US7] Confirm after T199 that the precache list holds `shell-*.js` and `shell-licenses-*.txt` and that the worker makes no request offline; fix only what T197 finds. T197 passes.
  - Done 2026-10-29: confirmed by T197's first case (the precache list) and its offline runs with the server closed; nothing to fix.

**Checkpoint**: the shell works offline and survives an update.

---

## Phase 24: User Story 8 - the site check proves the shell (Priority: P8)

**Goal**: the site check covers the amendment: its states in accessibility and the other parts,
the `terminal` part's shell lines, the keyboard flow's cursor and keys, the worker offline and
its requests, with failures naming shell, state, width and line.

**Independent Test**: break one thing at a time in a copy of the build (`rm about` succeeding, an
outline on the focused command line, a cursor still filled after Tab, the worker not precached, a
worker that fetches an outside URL) and see the matching check fail with the line
contracts/cli.md shows.

### Tests for User Story 8 (REQUIRED) ⚠️

- [X] T201 [P] [US8] Extend `tools/site-check/test/shell-states.test.ts`, covers 006-terminal-FR-038: the states `terminal-unfocused`, `terminal-help-standard`, `terminal-loading`, `terminal-load-failed`, `terminal-stopped`, `terminal-selected-all` and `pocket-stopped` (contracts/cli.md, added 2026-10-29) are each reached by real input on the real build, and the summary lists `/` under `accessibility` in each.
  - Done 2026-10-29: the 7 states are reached by real input on the real build, each checked for what it shows (hollow cursor, standard group in view, the waiting line with one busy run, the failure text and `try again`, the stopped line, a selection inside the screen with focus kept); the state list is 21 desktop and 13 mobile, and the accessibility summary lists each new state.
- [X] T202 [P] [US8] Extend `tools/site-check/test/terminal.test.ts`, covers 006-terminal-FR-040: the `terminal` part passes on the real build with contracts/cli.md's added lines in both shells; copies where `rm about` succeeds, `jq '.work[0].name' cv.json` prints nothing, `grep -ril` misses a work file, and a line that never ends isn't stopped fail with lines naming the shell, the line and what differed.
  - Done 2026-10-29: a `shell` variant per shell, and 4 one-fault copies (`rm about` succeeding, `jq` printing nothing, `grep -ril` missing the work file, the loop never stopped), each failing with a line naming the shell, the line and what differed. The jq and grep faults empty those lines' output in `adapter.ts`, the only way to break one line alone.
- [X] T203 [P] [US8] Extend `tools/site-check/test/keyboard.test.ts`, covers 006-terminal-FR-039 and SC-015: the flow passes on the real build with its new steps; copies where the focused command line has an outline, where the cursor stays filled after Tab, where Ctrl+A selects the dock too, and where Ctrl+C clears nothing each fail naming the step.
  - Done 2026-10-29: 4 one-fault copies (outline on the focused line, the hollow rule removed, select all over `#os`, Ctrl+C clearing nothing) each fail naming the step (`outline`, `cursor`, `select-all`, `cancel`); the older "exit sends focus to body" copy was brought up to date.
- [X] T204 [P] [US8] Extend `tools/site-check/test/offline.test.ts` and `other-sites.test.ts`:
  - covers 006-terminal-FR-041: a copy whose shell worker isn't precached fails the Terminal's offline run at both widths, naming the shell and width;
  - covers 006-terminal-FR-038: `other-sites` records requests while the `terminal` part's added lines run in both shells; a copy whose worker fetches an outside URL fails, naming the shell.
  - Done 2026-10-29: a copy without `shell-*.js` in the precache fails every Terminal offline variant in both shells (`not-available`); a copy whose worker fetches an outside URL fails `desktop/terminal-open/1440px` and `mobile/pocket/375px` (Playwright records a dedicated worker's request as the page's). The older page-fetch copy was brought up to date.
- [X] T205 [P] [US8] Extend `tools/site-check/test/shell.test.ts` and `performance.test.ts`:
  - covers 006-terminal-FR-035 and 006-terminal-FR-038: `modes` passes on the real build with the blink stopping within 5 s, and fails on a copy whose cursor never stops blinking and one whose cursor blinks under reduced motion;
  - covers 006-terminal-FR-042: every new problem line names the shell, the state or line, and the width; two runs give the same result; the whole check stays within 005's time budget plus 4 minutes off CI.
  - Done 2026-10-29: `modes` gains `<shell>/cursor-blink/<width>px`, failing on a copy whose blink never stops and one that blinks under reduced motion; two runs of a two-fault copy give identical reports; the performance budget is 005's plus 240,000 ms. The full check ran in 2 min 40 s.

### Implementation for User Story 8

- [X] T206 [US8] Add the amendment's states to `tools/site-check/src/shell-states.ts` after T201 (contracts/cli.md States): `terminal-unfocused` (Tab out from `terminal-help`), `terminal-help-standard` (scrolled to the standard group), `terminal-loading` (the worker's file held back with `page.route` and `help` typed), `terminal-load-failed` (the worker's file answered 503), `terminal-stopped` (`while true; do :; done` and its stop), `terminal-selected-all` (Ctrl+A in the command line), and `pocket-stopped`; each from a fresh page by clicks, taps and typed keys.
  - Done 2026-10-29: the 7 states in `shell-states.ts`; loading holds `**/assets/shell-*.js` unanswered and types `help`, failed answers it 503, select all presses the page platform's key, the stopped states wait for `p.run-stopped`.
- [X] T207 [US8] Add the shell's lines to `tools/site-check/src/parts/terminal.ts` after T202 (contracts/cli.md "Added 2026-10-29"), in each shell by typing, with the word read from the CV's first work summary: `work | grep -i {word}`, `grep -ril {word} ~/work`, `jq '.work[0].name' cv.json` compared with `JSON.stringify(resume.work[0].name)`, the `notes` line, `ls`, `rm -r notes`, `echo hi > about` and `rm about` with `cat about` unchanged, and `while true; do :; done` stopped with FR-069's text while a click on the window is answered; add any problem type the lines need to `tools/site-check/src/report.ts` (data-model.md Site check results).
  - Done 2026-10-29: the added lines run under `<shell>/terminal/shell/<width>px`, the word read from the first work summary; during the loop a click and a key must be answered, and it must end with one of FR-069's texts within 10 s. New problem types `line-mismatch`, `not-stopped` and `unresponsive`, in `report.ts` and data-model.md; contracts/cli.md's Variants table lists the new variants.
- [X] T208 [US8] Extend the other parts after T203 to T205 (contracts/cli.md Parts): `parts/keyboard.ts` adds FR-039's steps after the existing ones (cursor filled in the line and hollow after Tab with no outline or border on the line; Home, End, Ctrl+Left and Ctrl+Right; Ctrl+Backspace; Ctrl+A holding only the Terminal's text; Ctrl+C on a typed line), checking each step's focus target and indicator; `parts/accessibility.ts` runs axe in T206's states; `parts/modes.ts` adds the blink's stop without reduced motion and the filled and hollow cursor in forced colors; `parts/other-sites.ts` records requests during the `terminal` part's added lines; `parts/offline.ts` checks the worker loads offline in both shells. T201 to T205 pass.
  - Done 2026-10-29: keyboard reopens the Terminal after `exit` and checks the filled cursor with no box, hollow after Tab, Home, Ctrl+Right, End, Ctrl+Left, Ctrl+Backspace, Ctrl+A and Ctrl+C (types `cursor`, `outline`, `line-key`, `select-all`, `cancel`). The flow's page reports Linux; on a Mac host the Linux keys are sent through CDP with their editing command, as Playwright gives keys the host's commands. Steps landing in the command line check the cursor instead of a pixel outline (FR-072). accessibility covers the new states; modes adds the blink run and the forced-colors cursor (`no-blink`); other-sites runs the added lines; offline checks the shell didn't fail. `npm run site-check` exits 0, 13 of 13 parts. T201 to T205 pass.

**Checkpoint**: every pull request proves the shell in both shells.

---

## Phase 25: Amendment polish & constitution verification

**Purpose**: traceability for 75 requirements, sizes and speed, the audits, the full verification,
the owner's manual checks and the amendment's one pull request

- [ ] T209 [P] Extend `packages/web/test/terminal/data-req.test.tsx`, covers 006-terminal-FR-037: every target contracts/terminal.md's `data-req` table adds or changes carries its IDs in the rendered Terminal (`div.starter`, `input.command-line` with FR-072, FR-074 and FR-075, `span.cursor-mirror` with FR-032, FR-072 and FR-074, `div.terminal-screen`, `p.shell-loading`, `p.shell-failed` and its `try again` control, `p.run-stopped`, `help`'s standard group), reaching each state as T193 does, and every `006-terminal-FR-###` in a `data-req` names an existing requirement.
- [ ] T210 Run `npm run traceability` after T209 (Constitution III, SC-009): it exits 0, and its PASS line counts `006-terminal`'s 75 active requirements among the approved specs; every row of Amendment Requirement Coverage below has a passing test. Record the PASS line here.
- [ ] T211 [P] Verify SC-013 and SC-005 on the real build: `/` and `/cv` load no shell bytes; the `os` script's gzipped size is within T127's measured size plus 5%; the worker's sizes are near research R34's; the shell is ready within 1 s, and 3 s with Lighthouse's mobile CPU and network slowdown; Lighthouse's mobile and desktop scores on `/` and `/cv` are 90 or more in every category. Record each number here.
- [ ] T212 [P] Audit Constitution X, IV, V, VII and IX for the amendment in `package.json`, `packages/web/` and `tools/site-check/`:
  - **X**: the only package added is `just-bash` 3.6.0, exact; the abstractions added are exactly plan.md's Dependencies table (add any helper this list made, with its reason); the redirect guard is marked temporary with its issue link;
  - **IV**: every new word is in `site-text.ts`; no design value is in script but through `metrics.ts`; the limits and timings are the spec's and contract's numbers, set once each; no CV fact is typed in `shell/`, `content-check` covering it;
  - **V**: `os-core` is unchanged by the amendment; the shell worker and client are the Terminal's own, used by both shells;
  - **VII**: `/` and `/cv` load as before, with none of the shell; the Terminal still never opens by itself;
  - **IX**: the cursor, the selection and the new states are drawn in the site's tokens, with nothing from another terminal's look.
  Record the result here.
- [ ] T213 Run the full verification after T210 to T212: `npm run typecheck`, `npm test` (with GNU tools on `PATH` for T158), `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with the `terminal` part's added lines in both shells. Update plan.md, research.md, data-model.md and the contracts wherever the build differs from what they say, before the PR (Constitution I).
- [ ] T214 Run quickstart.md scenarios 10 and 11's automatable steps (10.1 to 10.9; 11.1, 11.2, 11.4 and 11.5 on Linux keys) on the real build, scripted with Playwright, with scratch output in the scratchpad, and record any deviation here. Scenario 11.3's macOS keys are T215's.
- [ ] T215 Owner action, by hand (quickstart 11, research R24): the macOS line-editing and readline keys in Safari and Firefox (FR-074); VoiceOver and NVDA with the new cursor, the loading line, a stopped line and Ctrl+C (SC-004); forced colors in Edge with the filled and hollow cursor and a selection (FR-033); and comparing every amendment state with `design/exports/` (FR-031, SC-010). Record each result here and in the PR. Under the constitution's interim provision on deferred manual checks, the owner may defer them to the final testing phase: then record that here, list each one in the PR, and leave this task open.
- [ ] T216 Commit the remaining work with Conventional Commits, push `006-terminal-shell` and open one pull request to `main` holding the spec amendment, the plan's changes, the design update, the shell and every change above, naming the 2026-10-29 amendment (Constitution XI as amended in 1.4.0, plan Constitution Check XI):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/006-terminal/spec.md` and `specs/006-terminal/tasks.md`; names the one new dependency and its reason (research R25); lists the upstream issues of T129 and the temporary redirect guard; and records the results of T211, T214 and T215, listing every manual check deferred under the interim provision.
  - Confirm the CI jobs run and pass, that the `site` job's summary matches a local `npm run site-check` on the same commit (FR-042), and that the parity test ran with GNU tools on `ubuntu-latest`. Merging is the owner's.
  - Owner action: run the local full run on a clean checkout of the PR's head commit and sign it off, so its `local-verify` status passes (Constitution 1.4.0, Merge requirements; 001's amendment of 2026-10-29 builds the run). Run it again after every new commit, a merge of `main` included. If 001's amendment hasn't merged yet, CI still runs the full suite, and the sign-off waits for it.

---

## Amendment: Dependencies & Execution Order

### Phase dependencies

- **Phase 16 (Setup)**: T127 first, before Phase 15; T128 after Phase 15; T129 after T128, in
  parallel with Phase 17.
- **Phase 15 before the amendment's UI**, after T127: T121 to T126 change `Terminal.tsx`, `site-text.ts`,
  `terminal.css`, `pocket.css` and the tests that name the greeting, which T132, T151 and every UI
  task below change too. Finish Phase 15 first.
- **Phase 17 (Foundational)**: after T128. BLOCKS every amendment story.
  - T130 first; T131 after T130; T132 after T130 and Phase 15.
  - T133, T134, T135, T136 and T137 in parallel; T138 then T139 (T139 needs T134).
  - T140 after T134; T141 then T142 (needs T136, T139, T140); T143 then T144 (needs T142).
  - T145 then T146; T147 then T148 (needs T144); T149 after T133 and T148.
  - T150 after T146 and T149; T151 after T150; T152 after T151; T153 last.
- **Design gate**: every amendment task that creates or changes UI (T151, T170, T171, T172, T178,
  T181, T187 to T189, T195, T196) depends on T130 and Phase 15.
- **US1 (Phase 18)**: after Phase 17. The amendment's MVP; every later amendment story runs on it.
- **US3 (Phase 19)**: after US1 (its wrappers sit in `site-commands.ts` and `adapter.ts` after
  T168 and T169).
- **US4 (Phase 20)**: after US1 and US3 (its states include `ls -l`).
- **US5 (Phase 21)**: after US1 (T187 to T189 change `CommandLine.tsx` after T171, and T189 uses
  T149's `cancel()`).
- **US6 (Phase 22)**: after US1 and US5 (the selection and select-all states); its pocket states
  need US4.
- **US7 (Phase 23)**: after Phase 17 (the worker file); T197 needs US1's lines.
- **US8 (Phase 24)**: after US1 to US7, since the check covers every state and line they add.
- **Polish (Phase 25)**: after every amendment story.

### Within each phase

- Tests first, failing before the code they cover.
- `shell/` modules before the adapter, the adapter before the worker, the worker before the
  client, the client before the session, the session before the components.
- The token and site text tasks before the components that read them.

### Parallel opportunities

- Phase 17: T133 to T138 together after T130; T140, T141, T143, T145 and T147 are test or type
  tasks on different files.
- US1: T154 to T167 are all [P] (different files); T168 and T169 touch different files from T170
  to T172.
- US3: T174 to T177 [P]. US5: T182 to T186 [P]. US6: T191 to T194 [P]. US7: T197 and T198 [P].
  US8: T201 to T205 [P].
- Polish: T209, T211 and T212 [P].

## Amendment: Parallel Example, Phase 17

```bash
# After T130, the shell's types, lists, block text and their tests together:
Task: "Write shell/protocol.ts (T133)"
Task: "Amend engine/block.ts with stream and blockText, and engine/block.test.ts (T134)"
Task: "Extend engine/boundaries.test.ts over shell/ (T135)"
Task: "Write shell/standard.ts (T136)"
Task: "Write test/terminal/shell/context.ts (T137)"
Task: "Write test/terminal/shell/fs.test.ts (T138)"
```

## Amendment: Parallel Example, User Story 1

```bash
Task: "Extend shell/adapter.test.ts (FR-067, FR-057, FR-022)"
Task: "Write shell/standard.test.ts (FR-068, FR-008, FR-017)"
Task: "Write shell/limits.test.ts (FR-069)"
Task: "Write shell/jq.test.ts (FR-055, FR-056)"
Task: "Write shell/bash-parity.test.ts (SC-014)"
Task: "Write terminal/loading.test.ts (FR-070, SC-013)"
Task: "Write terminal/cursor.test.ts (FR-072)"
Task: "Write terminal/focus-click.test.ts (FR-071)"
```

## Amendment: Implementation Strategy

### MVP first

1. T127 (the baseline, with `main` merged), then Phase 15 (no greeting), then T128 and T129:
   `just-bash` and the upstream reports prepared.
2. Phase 17: the Terminal on the shell, with today's behavior kept (CRITICAL: blocks every story).
3. Phase 18 (US1): the shell's language and commands, limits, loading, the cursor and click to
   focus.
4. **STOP and VALIDATE**: quickstart 10 on the real build at 1440 × 900.

### Incremental delivery

1. Phase 17 → the shell runs every command; nothing the amendment doesn't change has moved.
2. US1 → a bash-like shell on desktop (the amendment's MVP).
3. US3 → files the visitor can make beside protected ones.
4. US4 → the pocket terminal with the new states.
5. US5 → a terminal's keys, select all, Ctrl+C.
6. US6 → the blink, forced colors, the new states' accessibility.
7. US7 → the shell offline and after an update.
8. US8 → the site check.

The amendment ships in one PR from `006-terminal-shell` (Constitution XI); the increments are
checkpoints within it.

## Amendment Requirement Coverage

The requirements the 2026-10-29 amendment adds or amends, and the test tasks that cover them now.
Every other requirement keeps the coverage of the table at the end of Phase 11, through tests that
must still pass on the shell (T153).

| Requirement | Test task(s) |
|-------------|--------------|
| 006-terminal-FR-005 | T121, T166 |
| 006-terminal-FR-007 | T143 |
| 006-terminal-FR-008 | T143, T155, T159 |
| 006-terminal-FR-012 | T175, T177 |
| 006-terminal-FR-014 | T141, T166 |
| 006-terminal-FR-015 | T165 |
| 006-terminal-FR-016 | T145, T159 |
| 006-terminal-FR-017 | T141, T155, T159 |
| 006-terminal-FR-018 | T145, T165 |
| 006-terminal-FR-019 | T141 |
| 006-terminal-FR-020 | T141, T150, T166 |
| 006-terminal-FR-021 | T143, T150, T167, T177 |
| 006-terminal-FR-022 | T154, T167 |
| 006-terminal-FR-023 | T180, T194 |
| 006-terminal-FR-025 | T180 |
| 006-terminal-FR-026 | T182, T186 |
| 006-terminal-FR-028 | T145, T185, T186 |
| 006-terminal-FR-029 | T186 |
| 006-terminal-FR-030 | T167 |
| 006-terminal-FR-031 | T194 |
| 006-terminal-FR-032 | T191 |
| 006-terminal-FR-033 | T192 |
| 006-terminal-FR-034 | T193 |
| 006-terminal-FR-035 | T193, T205 |
| 006-terminal-FR-036 | T197 |
| 006-terminal-FR-037 | T209 |
| 006-terminal-FR-038 | T201, T204, T205 |
| 006-terminal-FR-039 | T203 |
| 006-terminal-FR-040 | T202 |
| 006-terminal-FR-041 | T204 |
| 006-terminal-FR-042 | T205 |
| 006-terminal-FR-043 | T138, T176 |
| 006-terminal-FR-045 | T138 |
| 006-terminal-FR-046 | T145, T176 |
| 006-terminal-FR-047 | T134, T141 |
| 006-terminal-FR-048 | T145 |
| 006-terminal-FR-049 | T138, T174, T175, T176, T177 |
| 006-terminal-FR-050 | T141, T176 |
| 006-terminal-FR-052 | T180 |
| 006-terminal-FR-053 | T180 |
| 006-terminal-FR-055 | T157 |
| 006-terminal-FR-056 | T157, T159, T166 |
| 006-terminal-FR-057 | T134, T143, T145, T154, T160 |
| 006-terminal-FR-058 | T141 |
| 006-terminal-FR-059 | T141 |
| 006-terminal-FR-067 | T143, T145, T154, T158, T160 |
| 006-terminal-FR-068 | T155, T158, T177 |
| 006-terminal-FR-069 | T145, T156, T162 |
| 006-terminal-FR-070 | T147, T161, T197, T198 |
| 006-terminal-FR-071 | T164, T180 |
| 006-terminal-FR-072 | T163 |
| 006-terminal-FR-073 | T138, T177 |
| 006-terminal-FR-074 | T182 |
| 006-terminal-FR-075 | T183, T184 |

Success criteria added or changed: SC-002 T167; SC-013 T147, T161, T211; SC-014 T158; SC-015
T203; SC-004 and SC-010 T215.

## Amendment: Notes

- T129's and T215's owner actions are the owner's: filing issues upstream and the hand checks.
- **Choices made here that the design documents don't fix**. If the owner prefers otherwise,
  change the plan or contract first:
  - **One foundational phase moves the Terminal onto the shell** (T140 to T153), keeping every
    behavior the amendment doesn't change, before any story adds what it changes. A story-by-story
    move would leave the old parser and the shell side by side.
  - **`blockText`'s unit test** is `engine/block.test.ts` (T134), as `blockText` is the engine's.
  - **`shell/context.ts`** (T137) is the shell's test helper, as `engine/context.ts` is for the
    engine.
  - **`packages/web/test/build.test.ts`** (T147) is new, as the plan allows ("or in the existing
    build tests"); no build test file exists today.
  - **SC-013's budget** is T127's measured `os` script size plus 5%, not research R34's 102 KB
    plus 5%: T104 measured 107 KB before the amendment, so 102 KB plus 5% would fail a build that
    hasn't grown.
  - **The network lock** is `shell/no-network.ts`, imported first by `worker.ts` (T148), since ES
    imports are hoisted and the lock must run before just-bash's module body.
