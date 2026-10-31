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
2026-10-27, its "2026-10-29 amendment" section, signed 2026-10-29, and its "2026-10-30
amendment" section, signed 2026-10-30).

**Amended 2026-10-30**: Phases 26 to 34 implement the spec's 2026-10-30 amendment: Tab completion
as bash's (FR-076, FR-077), the pocket terminal's Tab key (FR-078), editing in vim (FR-079 to
FR-081), and the requirements it amends (FR-026, FR-039, FR-058, FR-060, FR-064 to FR-066; plan.md
rows marked *(2026-10-30)*). Tasks it overturns (T025, T039, T066, T075, T076, T141, T182) stay
ticked and are marked superseded in part, naming the tasks that replace them.

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
  - Superseded 2026-10-30 (in part): `i`, `a`, `o`, `x`, `dd`, `p`, `:w`, `:wq`, `:w!` and `:x` changing nothing with `read-only`, `:foo`'s `unknown` message and "the text never changes", by T240 (FR-060, FR-064 and FR-079 to FR-081 as amended).
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
  - Superseded 2026-10-30 (in part): `[RO]` in the status line of every file, by T242 (FR-058 as amended); `:q` and the `:q` chip always restoring the output, by T242 and T243 (`E37` with unwritten changes, FR-064 as amended).
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
  - Superseded 2026-10-30 (in part): the 8 command keys with `skills`, by T252 (`Tab ⇥` in its place, FR-051, FR-078); every key hidden with the keyboard open, by T252 (the strip keeps the Tab key, FR-053); the 8 vim keys, by T252 (11 keys with `i`, `u` and `:w`, FR-066 as amended).
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
  - Superseded 2026-10-30 (in part): Tab moving focus on with text typed, by T233 (Tab completes there; Escape then Tab leaves, FR-026 as amended).
- [X] T076 [P] [US5] Extend `packages/web/test/terminal/vim.test.ts`, covers 006-terminal-FR-065: on opening, focus is on `.vim-text`, named and read only; the status region announces the file's name, read only, the line count and `:q`; a message change is announced once; fold lines expose `aria-expanded`; Tab moves to the chips, then out of the Terminal, and Shift+Tab back.
  - Superseded 2026-10-30 (in part): focus on `.vim-text` named read only, and the opening announcement saying read only, for every file, by T242 and T256 (only a protected file is read only, FR-065 as amended).

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
  - BLOCKED: the owner's manual checks, deferred to the final multi-spec testing phase with T215 and T279.
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
  - Add to the reports: G22 and G23 (T297, T302), not yet written as scripts.
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
  - Superseded 2026-10-30 (in part): `vim nowhere` giving its reply, and the effect's `name` alone, by T223 (a missing path opens a new file; the effect carries `file` with its path, `readonly` and `new`, FR-058 as amended).
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
- [X] T158 [P] [US1] Write `packages/web/test/terminal/shell/bash-parity.test.ts` (SC-014, covers 006-terminal-FR-067 and 006-terminal-FR-068, research R38): first check that `bash --version` and `grep --version` name GNU, and fail with the message naming what to install (`brew install bash coreutils grep gnu-sed gawk findutils diffutils`, `gnubin` first on `PATH`) when they don't; write the real CV's file system to a temporary folder (protected files read-only); run at least 30 lines, covering every feature of FR-067 and every command of FR-068, in the adapter and in `bash` with that folder as `HOME` and working folder, and compare stdout, stderr and status, with bash's `bash: line N: ` prefix removed; the lines include `grep -ril rest ~/work`, `ls | wc -l`, `cat about | tr a-z A-Z | head -3`, `for f in ~/work/*; do wc -l < "$f"; done`, `sed -n 2p skills`, `awk '{print $1}' languages`, `find ~ -name '*.json'`, `X=1; f() { echo $((X+1)); }; f` and `diff about contact`; the differences FR-044, FR-045 and FR-049 set are written beside their lines; no line depends on stdout and stderr interleaving (G3), and none on `jq`'s errors (G12).
  - Written 2026-10-29: `shell/bash-parity.test.ts`, 42 lines; each runs cleanly in the adapter. `grep -ril rest ~/work` is piped to `sort` (GNU grep lists in directory order); `tree` is left out of the lines (not GNU, not in the install list).
  Was blocked: this machine had macOS bash 3.2 and no GNU tools.
  - Done 2026-10-30: the GNU tools installed with Homebrew (GNU bash 5.3.20, coreutils, grep, gnu-sed, gawk, findutils, diffutils), each `gnubin` and `/opt/homebrew/bin` first on `PATH`. All 43 cases pass: every line gives bash's stdout, stderr and status. No line was left out beyond `tree`.
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
- [X] T173 [US1] Finish US1 after T168 to T172: delete the site text no code uses any more (`pipe-usage`, the "doesn't read piped input" reply, `jq`'s "only pretty-prints" and "is not JSON" replies, the old unknown reply's wording) from `packages/web/src/site-text.ts`; run `npm run typecheck`, `npm run content-check`, `npm run token-check` and `npm test`; T154 to T167 pass, and T158 passes with GNU tools on `PATH`. Record any line T158 had to leave out, and why, here and in research R38.
  - Done 2026-10-29 except T158: the five unused strings are gone from `site-text.ts` (`jqNotJson`, `jqFilter`, `noInput`, `pipeUsage`, `pipeExample`; the unknown reply was already reworded). `npm run typecheck`, `content-check` and `token-check` pass. `npm test` at 20:44: 82 failed of 1829, 42 of them T158's; T154 to T157 and T159 to T167 pass, and every other failure is in T153's list or comes from T171's no-box command line: `modes.test.ts` ×3 (the command line's forced-colors border and focus outline, T192 and T195) and `data-req.test.tsx` (`input.command-line` now lists FR-072, T209). T158's left-out line (`tree`) and its `sort` are recorded in research R38.
  Was blocked on T158.
  - Done 2026-10-30, with the GNU tools on `PATH`: `packages/web/test/terminal` passes, 52 files, 743 tests (2 skipped), T158 included; `npm run typecheck` and `token-check` pass.

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
  - Superseded 2026-10-30 (in part): Tab among the keys never `defaultPrevented`, by T233 and T257 (Tab with text before the cursor completes, FR-026 as amended).
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

- [X] T209 [P] Extend `packages/web/test/terminal/data-req.test.tsx`, covers 006-terminal-FR-037: every target contracts/terminal.md's `data-req` table adds or changes carries its IDs in the rendered Terminal (`div.starter`, `input.command-line` with FR-072, FR-074 and FR-075, `span.cursor-mirror` with FR-032, FR-072 and FR-074, `div.terminal-screen`, `p.shell-loading`, `p.shell-failed` and its `try again` control, `p.run-stopped`, `help`'s standard group), reaching each state as T193 does, and every `006-terminal-FR-###` in a `data-req` names an existing requirement.
  - Done 2026-10-29: the rows follow contracts/terminal.md's table (the command line with FR-072, FR-074 and FR-075, the mirror, the screen, the standard group's list, heading and buttons; `.out-columns` rows now exclude the standard group), and a new case reaches loading, failed (with its `try again` control) and a stopped line.
- [X] T210 Run `npm run traceability` after T209 (Constitution III, SC-009): it exits 0, and its PASS line counts `006-terminal`'s 75 active requirements among the approved specs; every row of Amendment Requirement Coverage below has a passing test. Record the PASS line here.
  - Done 2026-10-29: `PASS: all 334 active requirements in 6 approved specs are covered.` (006-terminal's 75 among them). `shell.test.ts`'s US3 title had short IDs (`FR-073`), fixed to full ones.
- [X] T211 [P] Verify SC-013 and SC-005 on the real build: `/` and `/cv` load no shell bytes; the `os` script's gzipped size is within T127's measured size plus 5%; the worker's sizes are near research R34's; the shell is ready within 1 s, and 3 s with Lighthouse's mobile CPU and network slowdown; Lighthouse's mobile and desktop scores on `/` and `/cv` are 90 or more in every category. Record each number here.
  - Done 2026-10-29, on the build of `ff69b41` plus T209: `/` makes no `shell-*` request and `cv.html` and `404.html` reference no shell asset (only `register-sw`). `os-*.js` is 366,146 bytes raw and 110,467 gzip -9, against T127's 108,962: +1.4%, within 5%. The worker `shell-*.js` is 1,335,444 bytes raw, 367,053 gzip -9 and 294,943 Brotli, against R34's 1.26 MB, 343 KB and 274 KB (about 7% more, from the amendment's wrappers). Ready after opening: 105 and 127 ms warm, 1,318 ms on the run's first, cold server; with 4× CPU and Lighthouse's mobile network (150 ms, 1.6 Mb/s, cache off) 1,866 to 1,870 ms, within 3 s. Lighthouse (site check): `/` mobile 98/100/100/100, desktop 100/100/100/100; `/cv` mobile 99/100/100/100, desktop 100/100/100/100 (performance, accessibility, best practices, SEO).
- [X] T212 [P] Audit Constitution X, IV, V, VII and IX for the amendment in `package.json`, `packages/web/` and `tools/site-check/`:
  - **X**: the only package added is `just-bash` 3.6.0, exact; the abstractions added are exactly plan.md's Dependencies table (add any helper this list made, with its reason); the redirect guard is marked temporary with its issue link;
  - **IV**: every new word is in `site-text.ts`; no design value is in script but through `metrics.ts`; the limits and timings are the spec's and contract's numbers, set once each; no CV fact is typed in `shell/`, `content-check` covering it;
  - **V**: `os-core` is unchanged by the amendment; the shell worker and client are the Terminal's own, used by both shells;
  - **VII**: `/` and `/cv` load as before, with none of the shell; the Terminal still never opens by itself;
  - **IX**: the cursor, the selection and the new states are drawn in the site's tokens, with nothing from another terminal's look.
  - Done 2026-10-29. X: `just-bash` 3.6.0, exact, is the only package added since `519e5fc`; plan.md's Dependencies table gains the site check's Linux key sender and notes the `sed`, `tee`, `cp` and `mv` wrappers; the redirect guard's comment names G1 and T129's issue. IV: the new words are in `site-text.ts` (stopped texts, `^C`, announcements); the wrappers' messages are bash's and GNU's own wording; the limits are set once (`LIMITS` in `adapter.ts`, `TIMING` in `shell-client.ts`) and the cursor's timings come from `metrics.ts`; `content-check` passes. V: `packages/os-core` is unchanged since `519e5fc`; the worker and client are the Terminal's, used by both shells. VII: `/` and `/cv` load none of the shell (T211), and the Terminal opens only when asked. IX: `token-check` passes; the cursor, selection and new states use the site's tokens and system colors only.
  Record the result here.
- [X] T213 Run the full verification after T210 to T212: `npm run typecheck`, `npm test` (with GNU tools on `PATH` for T158), `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with the `terminal` part's added lines in both shells. Update plan.md, research.md, data-model.md and the contracts wherever the build differs from what they say, before the PR (Constitution I).
  - Done 2026-10-29: `typecheck`, `content-check`, `token-check`, `traceability` (334 of 334) and `site-check` (`No problems. 13 of 13 parts passed.`, the `terminal` part's lines in both shells) exit 0. `npm test`: 1935 passed, 2 skipped, 42 failed, all 42 T158's parity cases (no GNU bash here; BLOCKED, they run in CI on `ubuntu-latest`). Five other failures fixed in tests: 003 FR-008's motion count reads the source's token count (T131 added the cursor's two); 004 FR-039 and FR-041 and 005 FR-053 wait for B's activation (`keptRecord`, now in `helpers/offline.ts`) before closing A's pages, and 005 FR-053 expects A's cache beside B's while A is open; FR-026's reserved keys open the Terminal again after `Alt+Shift+W`, the OS shell's close. Docs updated to the build (Constitution I): research R25, R27, R29, R32, R33, R34, R35, R36 and R40 (parse and serialize through `transform`, the `__CV_PIPED` mark, `help` renamed to `__cv_help`, the 4 MB pipe limit, the os budget's 108,962-byte base, the kept-cache record, touch's `click`, `re2js` and `ieee754`); plan.md (G1 to G20, six upstream, the worker's size, `shell-licenses.ts`); data-model.md (`cancelled`, `mapOutput`'s context); contracts/shell-worker.md, site.md and terminal.md (`data-shell-state`).
- [X] T214 Run quickstart.md scenarios 10 and 11's automatable steps (10.1 to 10.9; 11.1, 11.2, 11.4 and 11.5 on Linux keys) on the real build, scripted with Playwright, with scratch output in the scratchpad, and record any deviation here. Scenario 11.3's macOS keys are T215's.
  - Done 2026-10-29, on the build of `26b0b29`, 1440 × 900, `platform: 'Linux'`, a scratch Playwright script (deleted): every step of 10.1 to 10.9 and 11.1, 11.2, 11.4 and 11.5 as expected (one `shell-B8y2Myiw.js` request, on open only; `ls | wc -l` 11; `rm -rf ~` 26 `Permission denied` lines and the files unchanged; `notes/` last and gone after closing; 65 standard names; the cursor blinks, stops 5 s after the last key, turns hollow on Tab; select all stays in the Terminal). Two deviations:
    - **Quickstart 10.7** (fixed in quickstart.md): `while true; do :; done` stops at 10,000 commands in about 30 ms, too soon to drag a window while it runs, and `sleep` is left out (R32). The drag now runs during `seq 500000 | sed 's/1/2/g' | sort -rn | wc -l` (about 1 s): the CV window moved 100 px while the line was still running, and it then printed `500000`.
    - **Bug, open, for the owner**: after a line stores more than about 1 MB in a variable (`x=$(seq 200000)`, 1,288,894 bytes), every later line fails with `syntax error: Parse error at 1:1: Input too large: 1288981 bytes exceeds limit of 1000000`, `unset x` included, until the Terminal closes. The adapter's prelude carries the variable as text, and just-bash's parser refuses input over 1,000,000 bytes (not one of its configurable limits). Real bash keeps such a variable. A fix needs a decision (for example, stop the line that sets it as FR-069's output limit does, or carry state outside the prelude), so it isn't made here; it goes in the PR description.
    - **Fixed in review (2026-10-31)**: the variables now go in as the run's environment (`exec`'s `env`), not as prelude text, so such a variable carries as in bash, `unset x` removes it, and the command limit no longer grows with a value's lines. `adapter.test.ts` covers it.
- [ ] T215 Owner action, by hand (quickstart 11, research R24): the macOS line-editing and readline keys in Safari and Firefox (FR-074); VoiceOver and NVDA with the new cursor, the loading line, a stopped line and Ctrl+C (SC-004); forced colors in Edge with the filled and hollow cursor and a selection (FR-033); and comparing every amendment state with `design/exports/` (FR-031, SC-010). Record each result here and in the PR. Under the constitution's interim provision on deferred manual checks, the owner may defer them to the final testing phase: then record that here, list each one in the PR, and leave this task open.
  - BLOCKED: the owner's manual checks, deferred to the final multi-spec testing phase with T108 and T279. The PR lists each one.
- [X] T217 Amend 001's SC-008 for the `site` job (spec Clarifications, Session 2026-10-30; Constitution XI): in `specs/001-requirement-traceability/spec.md`, the amendment line, a clarification session naming 006-terminal and SC-008 marked `Amended 2026-10-30` with what it said before; the risk note in 001's `plan.md`; `timeout-minutes: 12` on the `site` job in `.github/workflows/ci.yml`; and `tools/traceability/test/repo-settings.test.ts`'s SC-008 group expecting 12 for `site` and 6 for every other job.
  - Done 2026-10-30, at the owner's decision. `repo-settings.test.ts` passes.
- [ ] T216 Commit the remaining work with Conventional Commits, push `006-terminal-shell` and open one pull request to `main` holding the spec amendment, the plan's changes, the design update, the shell and every change above, naming the 2026-10-29 amendment (Constitution XI as amended in 1.4.0, plan Constitution Check XI):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/006-terminal/spec.md` and `specs/006-terminal/tasks.md`; names the one new dependency and its reason (research R25); lists the upstream issues of T129 and the temporary redirect guard; and records the results of T211, T214 and T215, listing every manual check deferred under the interim provision.
  - Confirm the CI jobs run and pass, that the `site` job's summary matches a local `npm run site-check` on the same commit (FR-042), and that the parity test ran with GNU tools on `ubuntu-latest`. Merging is the owner's.
  - Owner action: run the local full run on a clean checkout of the PR's head commit and sign it off, so its `local-verify` status passes (Constitution 1.4.0, Merge requirements; 001's amendment of 2026-10-29 builds the run). Run it again after every new commit, a merge of `main` included. If 001's amendment hasn't merged yet, CI still runs the full suite, and the sign-off waits for it.
  - BLOCKED: the `site` job can't finish within 001's SC-008 limit. CI on `03fa937` (run 40981188923): `traceability`, `test`, `content` and `tokens` pass; `site` was cancelled by `timeout-minutes: 6` after about 5.5 minutes of `npm run site-check`, which now runs the Terminal's lines in both shells and 007's inspector. 001's plan (risks, "`timeout-minutes: 6` and slow runners") says the fix is to make that job faster or amend SC-008, not to raise the limit quietly. Both are the owner's decision, and neither is in this feature's tasks. Also, since #28 CI's `test` job runs only `test:fast`, so T158's parity test (slow project) doesn't run on `ubuntu-latest`. It runs in the local full run, where it needs the GNU tools.
    CI on `9f3c076` (run 40982022316, 2026-10-30): the same. `traceability`, `test`, `content` and `tokens` pass; `site` was cancelled at 6 minutes 30 seconds, during `npm run site-check`.
    CI on `36cd33b` (run 40982730341, 2026-10-30, docs only since `9f3c076`): all five jobs pass. `site` took 5 minutes 32 seconds, and its summary, `No problems. 14 of 14 parts passed.`, matches a local `npm run site-check` on the same commit (4 minutes 19 seconds on this Mac; FR-042). So the job fits the limit on some runners and not on others: three runs, two cancelled, one passed with 28 seconds to spare. The owner's decision on SC-008 still stands, as the next run may be cancelled again.
    Still open for this task: the parity test with GNU tools on `ubuntu-latest` (CI runs `test:fast` only), the owner's `local-verify` sign-off, T129's issue links and T215's results.
  - BLOCKED (2026-10-30): the owner's. The `site` limit is settled by T217, and the parity test passes locally with the GNU tools (T158, T277), not on `ubuntu-latest`, as CI runs `test:fast` only. Left: the `local-verify` sign-off, T129's issue links and T215's results.
  - Done so far 2026-10-30: `main` (`a3f9532`, 007's inspector and constitution 1.5.0) merged as `7713a1b`. SC-013's base was re-measured on that `main`: 113,581 bytes gzip -9, so `OS_BUDGET = 119_260`, and the merged `os` script is 114,945 bytes (+1.2%). Two site-check fixes followed in `03fa937`: 007's inspector keyboard flow checks the filled cursor when the Terminal opens (FR-072), and the worker's other-sites case also expects 007's Terminal spec views. On the merge, `typecheck`, `content-check`, `token-check` and `traceability` pass (`PASS: all 368 active requirements in 7 approved specs are covered.`). `site-check` gives `No problems. 14 of 14 parts passed.`. `npm test`: 2,194 tests; 2,138 passed, 2 skipped, 54 failed: T158's 42 and 12 from the two site-check issues. After the fix, those five files pass, 60 of 60. Pushed without rewriting and opened PR #32 (no AI attribution). Merging and the `local-verify` sign-off are the owner's.

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

---

## Phase 26: Amendment of 2026-10-30: setup and design gate

**Purpose**: a clean baseline for the second amendment (Tab completion, the pocket Tab key and
editing in vim: spec Clarifications, Session 2026-10-30 (owner review of the shell); FR-026,
FR-039, FR-058, FR-060, FR-064 to FR-066 amended; FR-076 to FR-081, SC-016 and SC-017 added),
built on `006-terminal-shell` and shipped in PR #32 with the 2026-10-29 amendment (plan
Constitution Check XI). Research R43 to R52 decide how.

- [X] T218 Bring `006-terminal-shell` up to date and record the baseline, with Node 26 active (`nvm use`): commit the plan's output and this tasks.md first if they aren't yet (`docs(006): plan and tasks for the Tab and vim amendment`); `git fetch origin main`, and since `main` has moved past the branch (#33 `2de6ace`, #34 `c7059d8`), `git merge origin/main` as a merge commit (no rebase); `npm ci`. Then `npm run typecheck`, `npm run content-check`, `npm run token-check` and `npm run site-check` exit 0; `npm run traceability` fails only on the 6 uncovered IDs `006-terminal-FR-076` to `006-terminal-FR-081`; `npm test` (with GNU tools first on `PATH` for T158, as the 006 notes say) fails only on the traceability self-check and `data-req.test.tsx`'s requirement count (81 in the spec, 75 in the test, fixed by T271). Run `npm run build` and record here the gzipped size (`gzip -9`) of `packages/web/dist/site/assets/os-*.js` against `OS_BUDGET` in `packages/web/scripts/build-site.ts` (119,260 bytes), so T275 knows the amendment's headroom.
- [X] T219 Confirm the design gate for the 2026-10-30 amendment in `specs/006-terminal/design/` (Constitution II, research R52): `review.md`'s "2026-10-30 amendment" section reads `**Status**: Approved`, signed by the owner on 2026-10-30 with its 7 decisions (commit `852ba9c`); `exports/` holds `desktop-21-tab-list-1440.png` to `desktop-26-vim-e37-1440.png`, `phone-22-tab-key-list-375.png` to `phone-25-vim-e45-320.png`, `tab-vim-editing-1440.png` and the re-exported phone boards with `Tab ⇥` (`review.md` lists them); `wireframes.md` has "States added by the amendment of 2026-10-30" and the amended vim help; the spec's Design checklist item for the 2026-10-30 amendment is ticked; the Penpot link is unchanged in `spec.md`, `design/README.md` and `design/review.md`. Write the result here. No task that creates or changes UI (T237, T238, T248, T249, T253, T258, T262) starts before it.
  - T218 so far (2026-10-30): plan and tasks committed (3064450), `main` already merged (e1e9484), `npm ci`, typecheck, content-check, token-check and site-check (`No problems. 14 of 14 parts passed.`) exit 0 at 3064450; traceability fails only on the 6 uncovered IDs. Baseline `os` script: 115,395 bytes gzipped against `OS_BUDGET` 119,260. `npm test` at 3064450: a full run under heavy load (another worktree's suite beside it) ended with 28 of 2,195 failing, mostly 30 s timeouts waiting for the shell; its 19 affected files, rerun one at a time with the machine quieter, leave only the 3 `packages/web/test/self-check.test.ts` cases that run `npm run traceability`, with `tools/traceability/test/self-check.test.ts` and `data-req.test.tsx`'s count (81 for 75) from the first run: all from the 6 uncovered IDs, as this task expected.
  - T219 result (2026-10-30): the gate holds. `review.md`'s 2026-10-30 section is Approved and signed, the exports and wireframes section are there, the spec's Design item is ticked, and the Penpot link is the same in all three files.


---

## Phase 27: Amendment 2026-10-30 foundational: the vim effect and writing files

**Purpose**: the token, the site text, the message types, the `vim` effect with its file, and the
worker's `write`, which the vim view (US3) and the pocket keys (US4) build on.

**⚠️ CRITICAL**: no story task of this amendment can begin until this phase is complete.

- [X] T220 Add `color.vim-warning` after T219, exactly as `design/README.md`'s tokens for the 2026-10-30 amendment list it (research R52, design decision 1): in `packages/tokens/penpot/tokens.json`, in the `light` set beside `color.terminal-error`, `color.vim-warning` → `{color.base.amber}`, in the hand-written export's form (`JSON.stringify(value, null, 2)`, no final newline). Run `npm run token-output`, then `npm run token-check` (exits 0, no exception). `packages/web/test/tokens.test.ts`'s "every token in the export is read" stays red until T248 reads it.
- [X] T221 [P] Add the amendment's site text to `packages/web/src/site-text.ts` after T219, in the design's words (design/wireframes.md "States added by the amendment of 2026-10-30" and its amended vim help; contracts/commands.md "The vim view" and the `help` row; contracts/terminal.md Announcements), with no CV fact and no design value (FR-030): `help`'s lead sentence for Tab beside `helpLead` (`Tab completes a command or path; Escape then Tab leaves the command line.`, phone `Tab ⇥ completes a command or path.`); the command line's description `Tab completes. Escape then Tab leaves.`; the question `Display all {n} possibilities? (y or n)` and the announcement `{n} possibilities`; under `terminal.vim`, the mode `-- INSERT --`, the marks `[+]` and `[No Name]`, the four opening lines (`"{file}" {n} lines`, `"{file}" [readonly] {n} lines`, `"{file}" [New]`, `"[No Name]" {n} lines`, each with the existing fold hint on desktop and phone), the written message `"{file}" {new}{n}L, {b}B written` with `[New] `, vim's messages word for word (`W10: Warning: Changing a readonly file`, `E13: File exists (add ! to override)`, `E32: No file name`, `E37: No write since last change (add ! to override)`, `E45: 'readonly' option is set (add ! to override)`, `"{path}" E212: Can't open file for writing`, `E492: Not an editor command: {typed}`, `"{path}" E514: Write error (file system full?)`, `Already at oldest change`, `Already at newest change`), the view's label forms (`{file}`, `{file}, read only`, `{file}, new`), the help heading `KEYS FOR {file}` with its two suffixes (`· :w <path> writes it to a file`, `· read only: :w <path> keeps a copy`) and the help's new rows and note (Insert, Edit, Write, Leave, the count and Ctrl+R sentence); the opening announcement's three forms (`{file}, {n} lines. Type :q to leave.`, with `read only` or `new` after the name); under `terminal.pocket`, the Tab key (`Tab ⇥`, named `Tab, complete`), `Esc` (named `Esc, back to normal mode`) and the vim keys `i` `Insert`, `u` `Undo`, `:w` `Write`; and `cv`'s and `vim`'s `help` rows as contracts/commands.md amends them (`vim`: `Edit a file in vim. - reads what is piped in`; `cv` no longer "read-only"). Keep `vim.readOnly`, `vim.unknown`, the old `helpNote`, `readOnlyMark`'s use and `pocket.commands`' `skills` until T250 and T253 remove their last use; `content-check` passes.
- [X] T222 [P] Add the 2026-10-30 types, exactly as data-model.md's "Vim view", "Completion" and "Write request and outcome" and contracts/shell-worker.md's Messages set them: in `packages/web/src/apps/terminal/engine/block.ts`, `VimFile` (`name`, `path: string | null`, `readonly`, `new`) and the effect `{ kind: 'vim'; file: VimFile; pipe: string | null; text: string }` in place of `name`; in `packages/web/src/apps/terminal/shell/protocol.ts`, `CompleteRequest`, `Completion`, `CompletionMatch`, `WriteRequest`, `WriteOutcome` (`error: 'exists' | 'cant-open' | 'full'`), the page-to-worker messages `{ type: 'complete', request }` and `{ type: 'write', request }`, and the worker-to-page `{ type: 'completion', completion }` and `{ type: 'wrote', outcome }`. Types only; `typecheck` names every reader of the old effect for T226.
- [X] T223 [P] Extend `packages/web/test/terminal/shell/site-commands.test.ts` before T226, covers 006-terminal-FR-058 and 006-terminal-FR-081: `vim cv.json` and `cat cv.json | vim -` return the `vim` effect with `file.name` as typed (`[No Name]` for piped text, `path` null), the absolute `path`, the text, `readonly` and `new`; `vim about` and `vim ~/work/<file>` are `readonly: true`; `vim notes.txt` and `vim work/new` on missing paths open with empty text and `new: true`, and so does a missing path inside a protected or missing folder (research R49); `cv` gives the `[No Name]` effect with its pipe, not read only, from any working folder; `vim work`, `vim -` with nothing piped and `vim` alone still give their replies on stderr and no effect. Write them to fail against today's build.
- [X] T224 [P] Extend `packages/web/test/terminal/shell/adapter.test.ts` before T227, covers 006-terminal-FR-080, 006-terminal-FR-081 and 006-terminal-FR-073: `write(request)` through TerminalFs creates a visitor's file (`created: true`, lines and bytes as vim counts them, `text` ending in its line break) that `cat` then prints and `ls` lists, and replaces one (`created: false`); a path relative to `cwd`, `~/` and `/tmp/` resolve; an existing file without `force` gives `exists`, with `force` is replaced; a protected file (with or without `force`), a folder and a path in a missing or protected folder give `cant-open` and change nothing; a write past `QUOTA` (1,048,576 bytes) gives `full` and leaves the file as it was; the outcome holds the visitor's files (`VisitorFiles`) after a change; the history doesn't change.
- [X] T225 [P] Extend `packages/web/test/terminal/engine/session.test.ts` before T228 (driving the real shell client with a worker in Node, as T185 does), covers 006-terminal-FR-080 and 006-terminal-FR-021: `client.write(request)` posts `write` and resolves with the worker's `wrote` outcome, matched by `id`; with no answer in 2,000 ms it resolves `{ ok: false, error: 'cant-open' }` and the worker isn't restarted (contracts/shell-worker.md Timing); after an `ok` outcome the session's `files` equal its `files`, so a worker restarted by Ctrl+C restores the written file; `reset()` (close) still empties them.
- [X] T226 Give the `vim` effect its file in `packages/web/src/apps/terminal/shell/site-commands.ts` after T222 and T223 (research R49): `vim <path>` resolves the path, sets `readonly` from TerminalFs's protected rule and `new` when nothing is there (no "no such file" reply any more), and opens a folder with FR-048's reply as before; `vim -` and `cv` give `name: '[No Name]'`, `path: null`. Update the effect's readers (`session.ts`, `Terminal.tsx`, `VimView.tsx`, `engine/vim.ts`'s opening) to read `effect.file`, with the view still behaving as today; T223's cases pass and `vim.test.ts` and `pocket.test.ts` still pass.
- [X] T227 Add `write` to `packages/web/src/apps/terminal/shell/adapter.ts` and the worker after T222 and T224 (research R49, contracts/shell-worker.md): `write(request): WriteOutcome` resolves `path` from `cwd` (`~` as home), refuses as T224 sets, writes through TerminalFs so the protected rules and `QUOTA` hold, counts lines and bytes as vim does, and returns the visitor's `snapshot()` when they changed; `shell/worker.ts` answers `{ type: 'write' }` with `{ type: 'wrote', outcome }`, only between runs. T224's cases pass.
- [X] T228 Add `write(request)` to `packages/web/src/apps/terminal/shell-client.ts` and keep its outcome in `packages/web/src/apps/terminal/session.ts` after T225 and T227: the client posts `write`, resolves on the `wrote` with the same `id`, and resolves `cant-open` after 2,000 ms with no answer (a new `TIMING` entry, set once); the session takes `files` from an `ok` outcome (data-model.md Session, "A vim write answered"). T225's cases pass.

**Checkpoint**: the shell writes a visitor's file on request and the `vim` effect says what was
opened; the Terminal behaves as before.

---

## Phase 28: User Story 1 - Tab completes as bash does (Priority: P1) 🎯 MVP of the 2026-10-30 amendment

**Goal**: on desktop, Tab with text before the cursor completes the word as bash 5's readline
does (commands, builtins, keywords, functions and the working folder's folders in a first word;
paths after it; quotes kept; the common part; `/` or a space), a second Tab in a row lists the
matches in readline's columns, 100 or more ask first, and focus is never trapped: Tab on an empty
line, Escape then Tab, and Shift+Tab leave (US1 scenarios 20 to 22; FR-026, FR-076, SC-016,
SC-017).

**Independent Test**: at 1440 × 900, `ab` Tab gives `about `; `cat cv` Tab `cat cv.json `; `cd wo`
Tab `cd work/`; `c` Tab Tab lists `caller case cat …` then the prompt and `c` again; type `ls`,
Escape, Tab, and focus leaves; Shift+Tab leaves with text typed; Tab on an empty line leaves.
`npm test -- completion-parity` passes with bash 5 and `python3`.

### Tests for User Story 1 (REQUIRED) ⚠️

- [X] T229 [P] [US1] Write `packages/web/test/terminal/shell/complete.test.ts` before T234, against `complete(request, sources)` on the Terminal's file system for the real CV (through `test/terminal/shell/context.ts`), covers 006-terminal-FR-076: every row of research R43's table (`cat cv` → `cat cv.json `; `cd wo`, `cat ~/sk`, `./w` → `cd work/`, `cat ~/skills `, `./work/`; `cat "cv` → `cat "cv.json" `; `cat my` with a visitor file `my file` → `cat my\ file `; `echo hi > ab` → `echo hi > about `; `ab`, `gr`, `hist`, `ls | wc` → `about `, `grep `, `history `, `ls | wc `; `wo` from home → `work`, no space, matches `work` once; `c`, `ca`, `i` add nothing and list `caller case cat`, `if in`; `cat c` lists `contact  cv.json` by last part only; `xyz` nothing); a first word after `|`, `;`, `&&`, `||`, `(`, `then` and `do`; a visitor's function (`f() { :; }` then `f` Tab); `$HO` → `$HOME`, and a variable the visitor set; folders marked `folder: true`; `~/` and quotes kept as typed; no match is `__cv_*`; matches merged and in byte order; a word in the middle of the line (cursor before the end) completes only the word before the cursor; `insert` empty when nothing is added. Each case names its R43 row.
- [X] T230 [P] [US1] Write `packages/web/test/terminal/engine/columns.test.ts` before T235, covers 006-terminal-FR-076: `columns(matches, width)` lays names out as readline does (research R44): as many columns as fit `width`, each the longest name plus 2, filled down, the last column unpadded; the home folder's 13 names at 80, 40 and 20 characters give 7, 3 and 1 columns as the design draws; folders keep their `/`; one name is one row.
- [X] T231 [P] [US1] Write `packages/web/test/terminal/shell/readline-driver.py` and `packages/web/test/terminal/shell/completion-parity.test.ts` before T234 (research R45), covers SC-017 (no FR of its own, plan "Success criteria without an FR"): the driver, run with the system's `python3 -I`, starts `bash --norc --noprofile -i` in a `pty` with `INPUTRC=/dev/null`, `HISTFILE=/dev/null`, `LC_ALL=C`, `TERM=dumb`, 80 columns, `bell-style none` and `page-completions off`, binds a key to `printf '<<%s|%d>>' "$READLINE_LINE" "$READLINE_POINT"`, sends a line then Tab (and Tab again), and prints the line, the cursor and the list up to the next prompt as JSON. The test shares `bash-parity.test.ts`'s temporary home folder (the real CV's files plus `notes/`, `todo` and `my file`), puts on `PATH` a folder of empty executables named after every site command, alias and `STANDARD_COMMANDS` name, and runs `enable -n` for every bash builtin not in `SHELL_BUILTINS`. For at least 20 partly typed lines covering R45's list (a command, an alias, a builtin, a keyword, a function, a folder in the first word, a file, a folder, a path from `/` and from `~/`, a word in double and in single quotes, a name with a space, after a redirect and after `|`, several matches with and without a common part, no match, and a visitor folder of 100 files for the question), the line and cursor after one Tab, and the list after two laid out by `engine/columns.ts` at 80 columns, equal bash's, each compared on its own and named on failure. It checks `python3` and bash 5 as `bash-parity.test.ts` checks GNU tools and fails naming what to install; it runs in the slow project, as T158 does.
- [X] T232 [P] [US1] Write `packages/web/test/terminal/completion.test.ts` on the real build at 1440 × 900 before T237 and T238, covers 006-terminal-FR-076: `ab` Tab reads `about ` with the caret after the space and focus kept; `cat cv` Tab reads `cat cv.json `; after `mkdir notes && touch todo`, `cat ~/` Tab Tab adds a `section.run` whose heading is `cat ~/` as typed, not added to `history`, holding `div.completion-list` with the names in readline's columns as text (no `button`, no link; folders with `/`), then the live prompt with `cat ~/` and the caret where it was; a visitor folder of 100 files (made with `mkdir h && touch h/f{1..100}`) asks `Display all 100 possibilities? (y or n)` as one line, `y` lists them and `n` (or another key) lists nothing and brings the prompt back with the line unchanged and nothing typed; a key typed while the answer is on its way wins (the answer is dropped); Cmd+Z on macOS and Ctrl+Z elsewhere takes a completion back; Tab while the shell loads or runs a line does nothing and focus stays.
- [X] T233 [P] [US1] Rewrite the FR-026 Tab cases of `packages/web/test/terminal/keyboard.test.ts` before T238, covers 006-terminal-FR-026 and SC-016: Tab on an empty line, and with only spaces before the caret, moves focus on and leaves the value; with `ab` typed Tab completes and focus stays; `ls` typed then Escape then Tab moves focus on, the value unchanged, and Escape isn't `defaultPrevented`; a key between Escape and Tab (or focus leaving and coming back) makes Tab complete again; Shift+Tab with text typed leaves backwards and is never `defaultPrevented`; Ctrl+Tab, Alt+Tab and Meta+Tab aren't `defaultPrevented`; after leaving, the next Tab isn't taken by the Terminal; `Alt+Shift+D` and `Alt+Shift+M` still reach the dock and the menu bar. Write them to fail against today's build.

### Implementation for User Story 1

- [X] T234 [US1] Write the completer in `packages/web/src/apps/terminal/shell/complete.ts` and add `SHELL_KEYWORDS` to `packages/web/src/apps/terminal/shell/standard.ts` after T229 (research R43, contracts/shell-worker.md): `SHELL_KEYWORDS` is `if then else elif fi case esac for while until do done in function select time { } [[ ]] !`; `complete(request, sources)` is pure over the file system interface it's given and the `ShellState`, and follows R43: readline's word boundaries (space, tab, newline, `"`, `'`, `` ` ``, `@`, `$`, `>`, `<`, `=`, `;`, `|`, `&`, `{`, `(`), an open quote starting the word and a backslash escaping; a command's first word (also after `|`, `;`, `&&`, `||`, `(` and keywords) against `COMMANDS` and its aliases, `STANDARD_COMMANDS`, `SHELL_BUILTINS`, `SHELL_KEYWORDS`, `ShellState.functions` and the working folder's folders, never an `__cv_*` name; later words and words after a redirect against TerminalFs's `readdir` and `stat` from the working folder, `/` or `~`, with regard to capitals; `$` words against variable names; names merged and sorted in byte order; `insert` the common part past the word, quoted as bash quotes it, with the closing quote and a space, or `/`, for one match. Read the command names from the tables the adapter registers, not a copy (Constitution IV). T229's cases pass.
- [X] T235 [P] [US1] Write `packages/web/src/apps/terminal/engine/columns.ts` after T230: `columns(names, width): string[][]`, readline's layout as data-model.md Completion sets it, pure, imported by the page and by T231's test. T230's cases pass.
- [X] T236 [US1] Carry `complete` between the page and the worker after T234: extend `packages/web/test/terminal/engine/session.test.ts` first (`client.complete(line, cursor)` posts `complete` with the shell state and resolves with the `completion` whose `id` is the last request's; an earlier answer arriving late is dropped; no answer in 2,000 ms resolves to no completion; while a line runs or the shell isn't `ready` it resolves to no completion without posting), then answer `{ type: 'complete' }` in `packages/web/src/apps/terminal/shell/worker.ts` with `complete(request, sources)` over the adapter's TerminalFs and command tables, and add `complete()` to `packages/web/src/apps/terminal/shell-client.ts` with the 2,000 ms timeout in `TIMING` (contracts/shell-worker.md Timing).
- [X] T237 [US1] Show a second Tab's list after T219, T232 and T235: in `packages/web/src/apps/terminal/session.ts`, an entry like Ctrl+C's (the line as typed, not in `history`) holding the matches, or the question, then the live prompt with the line and cursor unchanged (data-model.md Session, "A second Tab's list"); in `packages/web/src/apps/terminal/Output.tsx`, `div.completion-list` (`data-req="006-terminal-FR-076"`) laying the names out with `engine/columns.ts` at the screen's text width (`.terminal-screen`'s `clientWidth` over the mono advance from `../os/metrics.ts`, so the phone gets 3 columns and the window 7), each name a `span`, folders bold periwinkle with their `/`, files snow, all selectable output; the question as one haze line; in `packages/web/src/apps/terminal/terminal.css`, the list's grid and colors from tokens only (`token-check`). Compare with `design/exports/desktop-21-tab-list-1440.png`.
- [X] T238 [US1] Take Tab in `packages/web/src/apps/terminal/CommandLine.tsx` only where FR-026 lets it, after T219, T233, T236 and T237 (research R44, contracts/terminal.md Keyboard): Tab with no modifier, text other than spaces before the caret and no Escape since the last key is `preventDefault`ed and sends `complete`; Escape is never `preventDefault`ed and arms the way out until the next other key or focus leaving; Shift+Tab and modified Tabs are never handled; the answer is applied only if the line and caret are unchanged since Tab, through `execCommand('insertText')` (or `setRangeText` where it isn't supported) inside the field's own editing so its undo takes it back; a second Tab in a row with nothing to add and two or more matches asks the session for the list entry, and 100 or more for the question, after which the line takes one key (`y` lists; any other key adds nothing and brings the prompt back); while the shell loads, fails or runs, Tab does nothing and focus stays. Add `006-terminal-FR-076` to `input.command-line`'s `data-req` (contracts/terminal.md data-req targets). T232's and T233's cases pass.
- [X] T239 [US1] After T234 to T238, run `npm run typecheck`, `npm run token-check`, `npm run content-check` and the US1 tests (`shell/complete.test.ts`, `engine/columns.test.ts`, `shell/completion-parity.test.ts` with GNU tools and bash 5 first on `PATH`, `completion.test.ts`, `keyboard.test.ts`, `line-keys.test.ts`, `command-line.test.ts`, `history.test.ts`); then quickstart 12 steps 1 to 3 at 1440 × 900 by script. Record the results here, and any line where bash and the Terminal differ (fix the completer, or ask the owner if bash's behavior seems wrong for the site).

  - T239 result (2026-10-30): typecheck, token-check and content-check exit 0. `shell/complete.test.ts`, `engine/columns.test.ts`, `shell/completion-parity.test.ts` (GNU tools and bash 5 first on `PATH`), `completion.test.ts`, `keyboard.test.ts`, `line-keys.test.ts`, `command-line.test.ts` and `history.test.ts` pass, and bash and the Terminal differ on no line of the parity list. Quickstart 12 steps 1 to 3 pass by script at 1440 × 900. A first run had 30 s timeouts waiting for the shell while two full test runs loaded the machine (load average 28); they passed once it fell.
  - Fixed along the way: a second Tab pressed before the first's answer arrived didn't count as the second, because the line was noted only on the answer. `tabComplete` now notes it at the key press.

**Checkpoint**: Tab completes as bash does on desktop, and focus is never trapped. The amendment's
MVP.

---

## Phase 29: User Story 3 - vim edits files (Priority: P3)

**Goal**: the vim view edits text as vim does: insert mode through a real text area, vim's editing
keys, counts, `.`, one register and undo; `:w` and its kin write the visitor's files through the
worker with vim's messages; a protected file opens `[RO]`, can change on screen with `W10`, and
refuses `:w` with `E45`; `:q` with changes gives `E37` (US3 scenarios 12 to 14; FR-058, FR-060,
FR-064, FR-065, FR-079 to FR-081).

**Independent Test**: at 1440 × 900, `vim todo`, `i`, `ship it`, Escape, `:wq`, then `cat todo`
prints `ship it`; `vim todo`, `dd`, `u`, and the line is back; `o`, a word, Escape, `:q` gives
`E37`, `:q!` closes and `todo` is unchanged; `vim about`, `dd` shows `W10` in amber, `:w` `E45`
in rose, `:w ~/about-copy` makes a copy; `cv`, `:w` gives `E32: No file name`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T240 [P] [US3] Rewrite `packages/web/test/terminal/engine/vim.test.ts` for the editor before T247 (research R47, R49; data-model.md Vim view transitions), on buffers opened from text:
  - covers 006-terminal-FR-060: every move of the transitions table, each after a count (`5j`, `3w`), closed folds as one line; Escape cancels `/`, `:` and a pending count, operator, `g`, `z`, `Z` or `r`; Ctrl, Alt and Meta keys are ignored except `{ key: 'r', ctrl: true }`; each message is vim's own, word for word, with its tone (`info`, `warning`, `error`), and `:foo` gives `E492: Not an editor command: foo`;
  - covers 006-terminal-FR-079: `i a I A o O` enter insert mode at vim's places (`o` and `O` opening a line) and set `-- INSERT --`; `{ text }`, `{ delete: 'backward' | 'forward' }`, `{ lineBreak: true }` and Tab (`{ text: '\t' }`) edit; Escape returns to normal mode with the cursor back one character and the insert as one undo step; `x dd dw D cw cc C r{c} J yy yw p P` act as vim on characters and lines, `c…` ending in insert mode; counts (`3dd`, `2yy`, `5x`, `3p`); `.` replays the last change with its count, or a new one; `u` and `:redo` step through changes, `Already at oldest change` and `Already at newest change` at the ends, at most 1,000 steps kept; Ctrl+R redoes only when sent with `ctrl: true`; on a closed fold `dd` and `yy` take the whole fold, and `x` or `i` open it first; folds are recomputed from the lines after each change and keep their closed state by key; `{ point }` moves the cursor in both modes; the cursor never lands inside a closed fold;
  - covers 006-terminal-FR-080: `:w`, `:w {path}`, `:w! {path}`, `:wq`, `:x` and `ZZ` return `{ write, then }` as research R49's table sets (`:x` and `ZZ` only when `modified`, else `quit`), `:w` with `[No Name]` gives `E32`; `{ wrote }` with `ok` gives `"{name}" [New] {n}L, {b}B written` (`[New]` only when created), clears `modified` for the buffer's own file and keeps it for a copy, names a `[No Name]` buffer after its path, and `quit`s after `:wq`, `:x` or `ZZ`; `exists` gives `E13`, `cant-open` `E212` and `full` `E514`, the view open and the text kept;
  - covers 006-terminal-FR-081: a `readonly` buffer changes on screen, with `W10` once at the first change (not again); `:w`, `:wq` and `:x` give `E45` and no `write`; `:w!` gives a `write` with `force` (refused by the worker as `cant-open`, so `E212`); `:w ~/copy` gives a `write` of the changed text;
  - covers 006-terminal-FR-064 and 006-terminal-FR-061: `:help` opens the split; the first `:q` closes it, the second quits, or gives `E37: No write since last change (add ! to override)` when `modified`; `:q!` always quits; on opening, each top-level object or array of a JSON buffer is one closed fold, and plain text has none.
- [X] T241 [P] [US3] Extend `packages/web/test/terminal/engine/json.test.ts` before T246, covers 006-terminal-FR-079: `lexLine(text)` gives, for each line `printJson` prints of the `every-field` CV, the same tokens and colors as `printJson`'s row; an unfinished line (`"work": [`, `"na`, `12,`) is colored as far as it lexes and the rest is plain; the tokens' text joins back to the line exactly.
- [X] T242 [P] [US3] Update `packages/web/test/terminal/vim.test.ts` before T248:
  - covers 006-terminal-FR-058: the status line holds the mode, the name (`[No Name]` for `cv`), `[RO]` only for a protected file, `[+]` after a change and gone after `:w`, the pipe for `cv`, the type, line and column and position, and never `[New]`; the message line opens with `"todo" [New]` for a new file, `"about" [readonly] {n} lines` for a protected one, `"[No Name]" {n} lines` for `cv` (each with the fold hint where it has folds);
  - covers 006-terminal-FR-060: `Ctrl+D`, `Ctrl+F` and `Ctrl+U` aren't `defaultPrevented` on any platform, nor Ctrl+R off macOS (platform set per case as `line-keys.test.ts` does), and Ctrl+R on macOS redoes;
  - covers 006-terminal-FR-064: the `:q` chip with unwritten changes shows `E37` and the view stays; `:q!` then closes it with focus in the command line; the `:help` chip opens the split, whose rows include the Insert, Edit, Write and Leave keys and whose heading has the suffix for piped text and for a protected file (design);
  - covers 006-terminal-FR-065: on opening, `.vim-text`'s name is the file's, with `, read only` for `about` and `, new` for a new file; in normal mode Tab moves to the `:help` and `:q` chips, then out of the Terminal.
- [X] T243 [P] [US3] Write `packages/web/test/terminal/vim-edit.test.ts` on the real build before T248 and T249:
  - covers 006-terminal-FR-079: `vim todo`, `i` puts focus on `textarea.vim-insert`, holding the text with its caret at the cursor; typed keys (through `beforeinput`), Backspace, Delete and Enter edit the buffer and the drawn lines; a composition's `input` (set through `InputEvent` with `isComposing` then the textarea's value) reaches the buffer; Escape returns to normal mode with focus on `.vim-text`; a click on a character moves the cursor there in both modes; `-- INSERT --` shows in the status line; the insert cursor is a 2 px bar of `color.terminal-cursor`;
  - covers 006-terminal-FR-080: `vim notes.txt`, `i`, a line, Escape, `:wq`: the view closes with focus in the command line, `cat notes.txt` prints the line and `ls` lists `notes.txt`; after Ctrl+C on a running line restarts the worker, `cat notes.txt` still prints it; `:w ~/nowhere/x` shows `E212`; `vim todo`, a change, `:q` shows `E37`, `:q!` closes and `todo` is unchanged;
  - covers 006-terminal-FR-081: `vim about`, `dd` shows `W10` in `color.vim-warning`, `[RO] [+]` in the status line; `:w` shows `E45` in `color.terminal-error`; after `:q!`, `cat about` is unchanged; `vim about`, `dd`, `:w ~/about-copy` makes a file holding the change;
  - covers 006-terminal-FR-065 and SC-016: in insert mode Tab inserts a tab, Shift+Tab leaves the view backwards (with `.vim-text` at `tabindex=-1`), and Escape then Tab leaves the text for the `:help` chip; after leaving, no later Tab is taken.
- [X] T244 [P] [US3] Extend `packages/web/test/terminal/state.test.ts` before T249, covers 006-terminal-FR-021: minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep an open vim view's mode, unwritten changes (`[+]`), cursor and undo (`u` after restoring takes back the change made before); close and reopen starts afresh, the unwritten changes gone with no question and `todo` as last written.
- [X] T245 [P] [US3] Extend `packages/web/test/terminal/engine/announce.test.ts` before T249, covers 006-terminal-FR-028: opening a visitor's file → `{file}, {n} lines. Type :q to leave.`; a protected file → `{file}, read only, {n} lines…`; a new file → `{file}, new, 0 lines…`; `cv` → `[No Name], {n} lines…`.

### Implementation for User Story 3

- [X] T246 [US3] Add `lexLine(text): JsonToken[]` to `packages/web/src/apps/terminal/engine/json.ts` after T241 (data-model.md JSON lexer, amended): one line at a time, the same token kinds and colors as `printJson`'s rows, plain text for what doesn't lex; `printJson` stays for `jq`. T241's cases pass.
- [X] T247 [US3] Rewrite `packages/web/src/apps/terminal/engine/vim.ts` as the editor after T240 and T246 (research R47, R49; data-model.md `VimState`, `VimInput`, `VimOutput` and the transitions): `lines` as the buffer, folds recomputed from the lines after each change (a top-level key at indent 2 opening `{` or `[` to the indent-2 line closing it) with `closed` by key, `mode`, `pending` with count, operator and prefix, the unnamed `register`, `undo` and `redo` as copies of the lines (at most 1,000), `modified`, `warned`, `last` for `.`, and the `{ write, then }` output with its `{ wrote }` answer, every message kind of data-model.md `Message`. No DOM, no worker: still a pure reducer under `engine/` (`boundaries.test.ts`). T240's cases pass.
- [X] T248 [US3] Make `packages/web/src/apps/terminal/VimView.tsx` the editor's view after T219, T220, T228, T242, T243 and T247 (research R48, contracts/terminal.md "The vim view"): each shown line colored with `lexLine` for a `json` buffer, only changed lines re-rendered (keyed by line, memoized); the status line `[NORMAL]`, `-- INSERT --` or `HELP` in the mint pill, the name or `[No Name]`, `[RO]`, `[+]` and the pipe in haze; `div.vim-status` with `data-req="006-terminal-FR-058 006-terminal-FR-081"`, `div.vim-message` with `data-req="006-terminal-FR-060 006-terminal-FR-080"` toned info (haze), warning (`color.vim-warning`) or error (`color.terminal-error`) and wrapping to a second line with the text above giving up a row; `textarea.vim-insert` (`data-req="006-terminal-FR-065 006-terminal-FR-079"`) in insert mode, laid transparent over the text, named and described as `.vim-text`, its `beforeinput` turned into reducer inputs and `preventDefault`ed, a composition read on `input` and replaced by the buffer's text, Tab inserting a tab with no Escape since, Shift+Tab unhandled with `.vim-text` at `tabindex=-1`, Escape back to `.vim-text`; the insert cursor a 2 px bar (`border.thick`, `color.terminal-cursor`) before its character; a click or tap mapped to `{ point }` through `caretPositionFromPoint` (`caretRangeFromPoint` in Safari) and the line's tokens; Ctrl+R sent as `{ key: 'r', ctrl: true }` only on macOS (the platform test the Terminal already uses); a `{ write }` output sent through `shell-client.ts`'s `write()` with the buffer's path, `force` and the text with its final line break, and the outcome fed back as `{ wrote }`; the help split's rows and heading suffix from T221's site text; `div.vim-text` adds `006-terminal-FR-079` to its `data-req`. Styles in `packages/web/src/apps/terminal/terminal.css`, tokens only (`token-check`; `tokens.test.ts` now reads `color.vim-warning`). T242's and T243's cases pass. Compare with `design/exports/desktop-22-vim-insert-1440.png` to `desktop-26-vim-e37-1440.png`.
- [X] T249 [US3] Open, announce and close the editor in `packages/web/src/apps/terminal/session.ts` and `Terminal.tsx` after T219, T244, T245 and T248: the view opens from the effect's `file` (`section.vim`'s label with `, read only` or `, new`), the opening announcement in `engine/announce.ts` takes the three forms of T221's site text, the vim state (mode, changes, undo) is kept with the session as the view's cursor, folds and search already are, and closing the Terminal drops it with no question (FR-021, FR-080); `:wq`, `:x` and `ZZ` after a write, and `:q!`, close the view with `vim <path>` after its prompt and focus in the command line, as `:q` does. T244's and T245's cases pass.
- [X] T250 [US3] Delete the read-only view's text from `packages/web/src/site-text.ts` after T248 and T249: `terminal.vim.readOnly`, `unknown`, the old `helpNote` and `helpHeading`, `label`'s `(read only)` form and the `announce.vim` read-only form, with any test that still names them; `content-check` and `site-text.test.ts` pass.
- [X] T251 [US3] After T246 to T250, run `npm run typecheck`, `npm run token-check`, `npm run content-check` and the US3 tests (`engine/vim.test.ts`, `engine/json.test.ts`, `engine/announce.test.ts`, `engine/boundaries.test.ts`, `shell/adapter.test.ts`, `shell/site-commands.test.ts`, `vim.test.ts`, `vim-edit.test.ts`, `state.test.ts`, `files.test.ts`); then quickstart 12 steps 4 to 6 at 1440 × 900 by script. Record the results here.

  - T244 result (2026-10-30): the "close and reopen" timeout was the test's, not a bug: it clicked the dock during the closing animation, and opening a window then stops the close and keeps it, by 005's design (research R13), so the vim view rightly stayed. It now waits for the window to go, as the other close tests do. Insert mode across minimize and the phone's Home and reopen are added; all pass.
  - T251 result (2026-10-30): typecheck, token-check and content-check exit 0; `engine/` (vim, json, announce, boundaries among them), `shell/adapter.test.ts`, `shell/site-commands.test.ts`, `vim.test.ts`, `vim-edit.test.ts`, `state.test.ts` and `files.test.ts` pass. Quickstart 12 steps 4 to 6 pass by script at 1440 × 900.

**Checkpoint**: vim edits and writes the visitor's files, and protected files stay as they were.

---

## Phase 30: User Story 4 - the pocket terminal's Tab key and vim keys (Priority: P4)

**Goal**: on a phone, the eighth command key is `Tab ⇥` in `skills`' place, completing as Tab does
and keeping the keyboard open; with the keyboard open a strip keeps the Tab key (or `Esc` in vim's
insert mode); the vim keys are 11 in three rows with `i`, `u` and `:w`, and `:q` twice as wide
(FR-051, FR-053, FR-066, FR-078).

**Independent Test**: at 375 × 812 with touch, tap the command line, type `cat ~/sk`, tap `Tab ⇥`:
`cat ~/skills `, keyboard still open; tap it twice after `cat ~/`: the list. `vim notes.txt`, tap
`i`: the keyboard opens and the strip shows `Esc`; type, tap `Esc`, tap `:w`.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T252 [P] [US4] Update `packages/web/test/terminal/pocket.test.ts` before T253:
  - covers 006-terminal-FR-051: 8 command keys in the design's order, `help`, `about`, `work`, `projects`, `cv`, `ls`, `clear`, `Tab ⇥`, each a `button` named by its command or `Tab, complete`, at least 44 × 44 px; `skills` is still reached in 2 taps through `help` or `ls` (SC-001's search over controls);
  - covers 006-terminal-FR-078: tapped with `cat ~/sk` typed, the Tab key gives `cat ~/skills `, focus stays in the command line and its `pointerdown` is `defaultPrevented`; tapped twice after `cat ~/`, the list shows; with nothing typed, nothing changes; reached with the arrow keys and pressed with Enter, it completes and focus returns to the command line;
  - covers 006-terminal-FR-053: with the page made 300 px shorter after a tap on the command line, the other keys hide and `div.pocket-strip`, 60 px tall, holds the Tab key alone at its right; restoring the height brings the keys back and hides the strip;
  - covers 006-terminal-FR-066: with the vim view open the keys are `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `i`, `u`, `:w`, `:q` in three rows of four, named `Down` to `Quit` after their key (`i, Insert`, `u, Undo`, `:w, Write`), at least 44 × 44, `:q` twice as wide; `i` focuses `textarea.vim-insert` inside the tap's handler; with the page made 300 px shorter, the strip shows `Esc` (named `Esc, back to normal mode`), which returns to normal mode; `u` undoes; `:w` writes; a tap on the text moves the cursor there; after `:q` the command keys are back; a tap on a fold line toggles it; at 320 × 568 the third row fits with no horizontal scroll.

### Implementation for User Story 4

- [X] T253 [US4] Add the Tab key, the strip and the new vim keys to `packages/web/src/apps/terminal/Pocket.tsx` and `pocket.css` after T219, T238, T248 and T252 (research R46, R48; contracts/terminal.md "The pocket terminal"): `siteText.terminal.pocket.commands` becomes `help`, `about`, `work`, `projects`, `cv`, `ls`, `clear` with the Tab key last (`skills` removed); the Tab key sends the same completion as Tab from the command line's text and caret (sharing `CommandLine.tsx`'s path, so a second press in a row counts as the second Tab), its `pointerdown` `preventDefault`ed and its `click` acting, and from the keyboard focus returns to the command line; `div.pocket-strip` (`data-req="006-terminal-FR-066 006-terminal-FR-078"`) shows only while `data-keyboard` is set, holding the Tab key, or `Esc` in insert mode; `div.pocket-keys` adds `006-terminal-FR-078` to its `data-req`; the vim keys from T221's site text in three rows of four, `:q` spanning two, the third row in the grille's place at 375 px and taking a row from the screen at 320 px, `i` entering insert mode and focusing `textarea.vim-insert` in the same handler; key sizes from the key tokens (75 × 52, 66 × 48 below 375 px). Tokens only (`token-check`). T252's cases pass.
- [X] T254 [US4] After T253, run the US4 tests (`pocket.test.ts`, `controls.test.ts`, `layout.test.ts`, `targets.test.ts`) and compare the phone states with `design/exports/phone-22-tab-key-list-375.png` to `phone-25-vim-e45-320.png` and the re-exported phone boards with `Tab ⇥`. Record the results here.

  - T254 result (2026-10-30): `pocket.test.ts`, `controls.test.ts`, `layout.test.ts` and `targets.test.ts` pass. Compared with phone-22 to phone-25 and phone-7: the keys, the strip and `:q`'s width and mint match. Differences (the list's columns on a phone, the status line, the fold line's overlap, `~` rows) are carried to T263. Pressing a vim key from insert mode leaves it first, as the `:help` and `:q` chips do; the design doesn't say, and a key that typed its letter would surprise. The strip is empty while `/` or `:` is typed in vim: nothing there completes.

**Checkpoint**: the pocket terminal completes and edits by taps.

---

## Phase 31: User Story 5 - completion for keyboard and screen reader users (Priority: P5)

**Goal**: a completion is announced once (the line's new text, or the number of matches), the
command line's description and `help` say that Tab completes and how to leave, insert mode is read
as a text field, and no key a browser or screen reader reserves is taken (US5 scenario 11;
FR-008, FR-026, FR-028, FR-065, FR-077).

**Independent Test**: with VoiceOver or NVDA, `ab` Tab is announced as `about `; `cat ~/` Tab Tab
as `13 possibilities`, not the names; the command line reads its description; `help` holds the
Tab sentence.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T255 [P] [US5] Extend `packages/web/test/terminal/completion.test.ts` and `packages/web/test/terminal/engine/help.test.ts` before T258:
  - covers 006-terminal-FR-077: after `ab` Tab the status region holds `about ` once; after `cat ~/` Tab Tab, `{n} possibilities` once and none of the names; after the question, its text once; nothing for no match; `input.command-line`'s accessible description (through `aria-describedby`) is `Tab completes. Escape then Tab leaves.`, and the element it names is visually hidden; `help`'s lead holds the desktop sentence at 1440 and the phone's at 375;
  - covers 006-terminal-FR-008: `help`'s block leads with the Tab sentence for the shell it runs in, before the table, and the rest of `help` is unchanged.
- [X] T256 [P] [US5] Extend `packages/web/test/terminal/screen-reader.test.ts` before T258, covers 006-terminal-FR-065 and 006-terminal-FR-028: in insert mode `textarea.vim-insert` is in the accessibility tree as a text field named after the file (with `read only` or `new` as the case is) and described by the status line; entering and leaving insert mode announce `-- INSERT --` and `NORMAL` once each; a vim message change (`W10`, `E45`, `E37`, a written message) is announced once; opening `about` announces `about, read only, …` and a new file `{file}, new, 0 lines…`; focus stays where it was.
- [X] T257 [P] [US5] Update `packages/web/test/terminal/line-keys.test.ts` before T258, covers 006-terminal-FR-026 and 006-terminal-FR-079: Tab leaves the reserved-key list for the command line with text typed (it completes there; T233 covers its rules), but Tab on an empty line, Shift+Tab and every modified Tab stay never `defaultPrevented` on each platform; in the vim view, Ctrl+R isn't `defaultPrevented` on Linux and Windows, and is on macOS; Ctrl+W, Ctrl+L, Ctrl+T and Cmd+L, Cmd+W, Cmd+T aren't taken in insert mode either.

### Implementation for User Story 5

- [X] T258 [US5] Describe and announce completion after T219, T238 and T255 to T257 (research R44, contracts/terminal.md Announcements): in `packages/web/src/apps/terminal/CommandLine.tsx`, `aria-describedby` a visually hidden element holding T221's description, and `006-terminal-FR-077` in `input.command-line`'s `data-req`; in `packages/web/src/apps/terminal/engine/commands.ts` (`help`'s block), the Tab sentence for the shell after the existing lead; in `packages/web/src/apps/terminal/engine/announce.ts` and `session.ts`, a completion's announcement (the line's new text), a list's (`{n} possibilities`), the question's text, and vim's mode and message changes once each; `.terminal-status` gains `006-terminal-FR-077` in its `data-req`. T255 to T257 pass.
- [X] T259 [US5] After T258, run the US5 tests (`completion.test.ts`, `screen-reader.test.ts`, `line-keys.test.ts`, `keyboard.test.ts`, `engine/help.test.ts`, `engine/announce.test.ts`, `vim-edit.test.ts`) and record the results here.

  - T259 result (2026-10-30): `completion.test.ts`, `screen-reader.test.ts`, `line-keys.test.ts`, `keyboard.test.ts`, `engine/help.test.ts`, `engine/announce.test.ts` and `vim-edit.test.ts` pass. `os` script: 119,001 bytes gzipped against 119,260.

**Checkpoint**: completion and editing work by keyboard alone and are heard once.

---

## Phase 32: User Story 6 - the new states in forced colors, at larger text and to axe (Priority: P6)

**Goal**: the completion list, the Tab key and strip, insert mode and vim's toned messages hold in
forced colors and reduced transparency, at 200% and 400% zoom and with text spacing, pass axe, and
meet the target sizes (FR-031, FR-033 to FR-035).

**Independent Test**: emulate `forced-colors: active` and open `terminal-tab-list`,
`terminal-vim-insert` and `terminal-vim-readonly`; zoom to 200%; run axe.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T260 [P] [US6] Extend `packages/web/test/terminal/modes.test.ts` before T262, covers 006-terminal-FR-033: in forced colors the completion list's folders keep their `/` and stay distinct from files without color; the insert cursor is a `Highlight` bar; `W10` and the `E` messages show as text in `CanvasText` (their code says what they are, not their color); `[RO]` and `[+]` show; the Tab key, `Esc` and the strip show their borders; with reduced transparency the strip is solid like the keys.
- [X] T261 [P] [US6] Extend `packages/web/test/terminal/targets.test.ts`, `accessibility.test.ts` and `design.test.ts` before T262:
  - covers 006-terminal-FR-034: the Tab key, `Esc`, `i`, `u`, `:w` and the double `:q` are at least 44 × 44 px in every pocket state at 320, 375 and 568 wide; the vim chips at least 24 × 24 in insert mode;
  - covers 006-terminal-FR-035: axe (WCAG 2.2 A and AA tags) finds nothing with the Tab list shown, in insert mode, with `W10` and with `E45`, in both shells; 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep the list, the strip, the insert text area and a wrapped vim message visible, with no clipping or overlap;
  - covers 006-terminal-FR-031: the warning's computed color is `color.vim-warning`'s, the error's `color.terminal-error`'s, the insert bar `color.terminal-cursor` at `border.thick`'s width, the folders' periwinkle the token's; `packages/web/test/tokens.test.ts`'s "every token in the export is read" passes.

### Implementation for User Story 6

- [X] T262 [US6] Fix what T260 and T261 find in `packages/web/src/apps/terminal/terminal.css` and `pocket.css` after T219 and T248: forced-colors rules for the insert bar, the toned messages and the strip; zoom and text-spacing fixes for the list and the wrapped message; every value a token (`token-check`). T260 and T261 pass.
- [X] T263 [US6] Compare every 2026-10-30 state with its export, scripted with Playwright on the real build with screenshots in the scratchpad (desktop 21 to 26, phone 22 to 25, the re-exported phone boards), and record each difference here; a difference the design doesn't explain is fixed or put to the owner.

  - T262 result (2026-10-30): `modes.test.ts`, `targets.test.ts`, `accessibility.test.ts`, `design.test.ts`, `completion.test.ts` and `tokens.test.ts` pass with the new states (the list, insert mode, `W10`, `E45`; on a phone, the strip with each key and the vim keys at 320). Added forced-colors rules for the insert bar, the toned messages, the mode pill, the list and the `~` rows.
  - T263 result (2026-10-30), compared by script on the real build. **Fixed**: a phone's list had 5 columns and ran off the screen (the wide row widened the Terminal before it was measured; it now measures the screen, with the font's real size, and gets 3); closed fold lines drew over the line numbers; the mode is now the mint pill the design and T248 set (it was mint text); `~` rows below the text, not read by screen readers; the type, position and scroll sit at the status line's right. **Kept, for the owner to look at**: (1) on a phone the status line shows the type and `cv`'s pipe, so it wraps to two rows where phone-7, phone-24 and phone-25 show one: FR-058 and FR-059 require them, and the exports leave them out; (2) on a phone the message line keeps the `:help` and `:q` chips, which the exports leave out, as FR-064 and the wireframes' table keep them; (3) these aren't the amendment's and were there before it: the prompt on one line where the exports have two, line numbers in `color.vim-number` (amber) where the exports have grey with the current line bold, every pocket key in `color.pocket-key-accent` where the exports have dark keys with `help` accented, the fold lines' band and `····` fill, and the CV window behind. The exports are hand-made mockups (constitution interim provision), and the tokens hold the implemented values.

**Checkpoint**: the new states are as accessible as the rest of the Terminal.

---

## Phase 33: User Story 8 - the site check proves Tab and vim (Priority: P8)

**Goal**: the site check covers the 2026-10-30 amendment: the keyboard flow's new steps and
SC-016's leaving checks, the `terminal` part's vim write in each shell, and the new states
(contracts/cli.md "Added 2026-10-30"; FR-038 to FR-040, SC-016).

**Independent Test**: break one thing at a time in a copy of the build (Tab taken after Escape,
`:wq` writing nothing, `:w` writing a protected file) and see the matching part fail with the line
contracts/cli.md shows.

### Tests for User Story 8 (REQUIRED) ⚠️

- [X] T264 [P] [US8] Extend `tools/site-check/test/shell-states.test.ts`, covers 006-terminal-FR-038: the states `terminal-tab-list`, `terminal-vim-insert`, `terminal-vim-readonly`, `pocket-tab-key` and `pocket-vim-insert` (contracts/cli.md States, added 2026-10-30) are each reached by real input on the real build and checked for what they show (the list, `-- INSERT --` with focus in the text area, `[RO] [+]` and `E45`, the strip's Tab key with the list, the strip's `Esc`), and the summary lists `/` under `accessibility` in each.
- [X] T265 [P] [US8] Extend `tools/site-check/test/keyboard.test.ts`, covers 006-terminal-FR-039 and SC-016: the flow passes on the real build with its new steps; copies where Tab is taken after Escape (`keyboard / desktop/terminal-keyboard/1440px trapped step … "Escape then Tab"`), where Tab on an empty line completes, where Shift+Tab is taken in insert mode, and where `:wq` writes nothing each fail naming the step.
- [X] T266 [P] [US8] Extend `tools/site-check/test/terminal.test.ts`, covers 006-terminal-FR-040: the `terminal` part passes on the real build with the vim lines in both shells; a copy where `:w` writes a protected file fails with `line-mismatch vim about :w: wrote about, where it should show E45`, and one where `:wq` loses the typed line fails naming the shell and `cat notes`.

### Implementation for User Story 8

- [X] T267 [US8] Add the 5 states to `tools/site-check/src/shell-states.ts` after T264 (contracts/cli.md States), each from a fresh page by clicks, taps and typed keys: `terminal-tab-list` (`cat ~/`, Tab, Tab, after `mkdir notes && touch todo`), `terminal-vim-insert` (`vim notes.txt`, `i`, a line), `terminal-vim-readonly` (`vim about`, `o`, a word, Escape, `:w`), `pocket-tab-key` (tap the command line, `cat ~/`, the Tab key twice, the page 300 px shorter) and `pocket-vim-insert` (`vim notes.txt`, Enter, the `i` key, the page 300 px shorter).
- [X] T268 [US8] Extend `tools/site-check/src/parts/keyboard.ts` after T265 (contracts/cli.md "Added 2026-10-30"): after the existing steps, type `ab`, Tab, and the line reads `about ` with focus still in the command line; Escape then Tab leaves the typed line; `vim todo`, `i`, a typed line, Escape, `:wq`, and focus is back in the command line; `cat todo` shows the line. At every step with focus in the command line or the vim view, try Escape then Tab, and Shift+Tab, on a copy of the state (a fresh page brought to the same step) and require focus out of the element in at most two keys and one, and no later Tab taken (SC-016, research R50), failing with `trapped step {n} "{name}"`; add the problem type to `tools/site-check/src/report.ts` and data-model.md if it isn't there.
- [X] T269 [US8] Extend `tools/site-check/src/parts/terminal.ts` and `parts/accessibility.ts` after T266 and T267: in each shell, by typing, `vim notes` then `i`, a line, Escape, `:wq`, and `cat notes` prints the line; `vim about`, `x`, `:w` shows `E45`, and after `:q!` `cat about` is unchanged; failures as contracts/cli.md shows. `accessibility` runs axe in the 5 new states.
- [X] T270 [US8] After T267 to T269, run `npm run site-check`: it exits 0 with the new states, steps and lines in both shells. Record the summary line and the run's time here (the CI `site` job's limit is 12 minutes since T217).

  - T270 result (2026-10-30): `npm run site-check`: `No problems. 14 of 14 parts passed.` in 4 min 14 s, well inside the CI `site` job's 12 minutes. `shell-states.test.ts`, `keyboard.test.ts` and `terminal.test.ts` pass (106 tests). T268's SC-016 check runs on fresh pages from four states (an empty line, a typed line, the vim text, insert mode), each with Escape then Tab and with Shift+Tab, not on a copy of every step: every step with focus there is one of the four (research R51). A Tab on an empty line that's taken is caught by the flow's first Tab, as `trapped input.command-line`, before the step of that name. `modes`' hollow-cursor check now presses Escape first, as Tab with a line typed completes.

**Checkpoint**: every pull request proves Tab and vim in both shells.

---

## Phase 34: Amendment 2026-10-30 polish & constitution verification

**Purpose**: traceability for 81 requirements, sizes and speed, the audits, the full verification,
the owner's manual checks, and PR #32 carrying both amendments

- [X] T271 [P] Extend `packages/web/test/terminal/data-req.test.tsx`, covers 006-terminal-FR-037: the requirement count is 81, and every target contracts/terminal.md's `data-req` table adds or changes on 2026-10-30 carries its IDs in the rendered Terminal (`input.command-line` with FR-076 and FR-077, `div.completion-list`, the pocket Tab key and `div.pocket-strip`, `textarea.vim-insert`, `div.vim-status`, `div.vim-message`, `div.pocket-keys` with FR-078, `div.vim-text` with FR-079, `.terminal-status` with FR-077), reaching each state as T267 does.
- [X] T272 [P] Extend `packages/web/test/terminal/site-text.test.ts`, covers 006-terminal-FR-030: every value T221 added is English and holds no key fact of the real CV; every text node of the rendered Terminal after a Tab list, in insert mode with typed text, after `W10`, `E45` and a written message, and in the pocket's Tab and vim states is CV text, spec list text, site text, text the shell printed, a completion list's names or text the visitor typed; every character of the new site text is inside the served subsets' `unicodeRange` (`⇥` included, research R16), or the subset gains it.
- [X] T273 [P] Extend `packages/web/test/terminal/performance.test.ts` (plan Performance Goals), covers 006-terminal-FR-079: at 1440 px, the line after Tab changes within 100 ms of the key, over a folder of a few dozen names; in insert mode on `cv`'s JSON (about 300 lines), each typed key's character is drawn within the next animation frame, and only the changed line re-renders.
- [X] T274 Run `npm run traceability` after T271 to T273 (Constitution III, SC-009): it exits 0, and its PASS line counts `006-terminal`'s 81 active requirements; every row of "Amendment 2026-10-30 Requirement Coverage" below has a passing test. Record the PASS line here.
- [X] T275 [P] Verify SC-013 and SC-005 on the real build: `/` and `/cv` load no shell bytes; the `os` script's gzipped size is within `OS_BUDGET` (record it beside T218's); the worker's sizes beside T211's (the completer adds a little); the shell still ready within 1 s, and 3 s with Lighthouse's mobile slowdown; Lighthouse 90 or more in every category on `/` and `/cv`, mobile and desktop. Record each number here.
- [X] T276 [P] Audit Constitution X, IV, V and IX for the 2026-10-30 amendment in `package.json`, `packages/web/` and `tools/site-check/`: **X**, no package added; the abstractions added are exactly plan.md's Dependencies table rows marked 2026-10-30 (completer, columns, `complete` and `write` messages, the insert text area, the readline driver), with any other helper added there with its reason; **IV**, every new word in `site-text.ts`, the completer reading the shell's own tables (no second list of commands), the 2,000 ms timeout set once, no design value in script but through `metrics.ts`; **V**, `packages/os-core` unchanged by the amendment; **IX**, the list, the Tab key, the insert bar and the toned messages in the site's tokens, nothing from another terminal's or editor's look. Record the result here.
  - T274 result (2026-10-30): `PASS: all 374 active requirements in 7 approved specs are covered.`
  - T275 result (2026-10-30): no `shell-` asset in `index.html` or `cv.html`, and `requests.test.ts` passes. `os` script 118,405 bytes gzipped against `OS_BUDGET` 119,260 (baseline 115,395 at T218), budget unchanged; 740 bytes of that came from no longer inlining `fonts.json` for one number (`fonts/mono-advance.json`, research R13), without which fixture builds went over. Worker 1,344,287 bytes raw and 370,065 gzip -9, against T211's 1,335,444 and 367,053. Brotli wasn't measured: `brotli` isn't installed here. `loading.test.ts`'s "ready within 1 s, and within 3 s with 4× CPU throttling on a mobile network" passes. Lighthouse: `/` mobile 96, 100, 100, 100; `/` desktop 100 in all; `/cv` mobile 99, 100, 100, 100; `/cv` desktop 100 in all.
  - T276 result (2026-10-30): **X**: `package.json`, the lockfile and `packages/os-core` unchanged since 3064450, so no package added; beyond plan.md's table, `engine/command-table.ts` and `glyphs/TabMark.tsx`, both now added there with their reasons. **IV**: the new words are in `site-text.ts`; the completer reads the shell's tables; the 2,000 ms is set once, as `TIMING.answer`; `COMPLETION_QUERY` 100 is readline's constant, not a design value. **V**: `packages/os-core` unchanged. **IX**: the list, the Tab key, the insert bar and the toned messages use the site's tokens (`token-check` passes).
  - T278 result (2026-10-30): quickstart 12.1 to 12.6 pass by script at 1440 × 900 on the real build, with no deviation. 12.7's emulated part is covered by `pocket.test.ts`; its real phones are T279's.
- [X] T277 Run the full verification after T274 to T276: `npm run typecheck`, `npm test` (with GNU tools and bash 5 first on `PATH` for T158 and T231, and `python3`), `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0. Update plan.md, research.md (R43 to R52), data-model.md and the contracts wherever the build differs from what they say, before pushing (Constitution I). Record the results here.
- [X] T278 Run quickstart.md scenario 12's automatable steps (12.1 to 12.6) on the real build, scripted with Playwright, with scratch output in the scratchpad, and record any deviation here. Step 12.7's real phones are T279's.
- [ ] T279 Owner action, by hand (quickstart 12.7, research R24): the pocket Tab key and `i` key with real phone keyboards (iOS Safari, Android Chrome), keeping the keyboard open; VoiceOver, TalkBack and NVDA with a completion, a second Tab's list and insert mode (FR-077, FR-065); Ctrl+R in the vim view in Safari and Firefox on macOS; forced colors in Edge with the list, the insert bar and the toned messages (FR-033); comparing the 2026-10-30 states with `design/exports/` (FR-031). Record each result here and in the PR. Under the constitution's interim provision on deferred manual checks, the owner may defer them to the final testing phase: then record that here, list each one in the PR, and leave this task open.
  - T277 so far (2026-10-30): typecheck, content-check, token-check, traceability (`PASS: all 374 active requirements in 7 approved specs are covered.`) and site-check (`No problems. 14 of 14 parts passed.`, 5 min 3 s under load) exit 0. plan.md, research.md, data-model.md and the contracts are updated. **`npm test` hasn't had a clean full run**: on 9053f2b, beside another worktree's full suite (load average 13), 8 of 2,428 failed, in 1,326 s. Rerun one file at a time, `cli`, `focus-click`, `output`, `specs`, `stop` and `completion` pass (51 tests); `completion`'s "a key typed while the answer is on its way wins" was a real race in the test and now holds the request. Not rerun on this commit: the timeouts in `tools/site-check/test/keyboard.test.ts` (inspector's "Back") and `shell.test.ts` ("the keyboard part passes both flows"). T277 stays open until a full run passes.
  - T277 result (2026-10-30): done, with no other suite running. A first full run on 4d06411 (load average about 2) had 3 failures of 2,428: `keyboard.test.ts`'s Ctrl+C copy (480 s) and `shell.test.ts`'s two-fault copy (300 s) hit their limits, and `performance.test.ts`'s Tab timing read 474 ms. These weren't a slow flow: the Ctrl+C copy takes 28 s alone, and both files pass alone (30 of 30). The cause was a race, in the site check's `nextTabTaken` and in the timing test: a listener put on the page by an evaluate that wasn't awaited, with the key sent straight after. On a busy page the key can arrive first (scratch script: 27 and 34 of 150 presses, none of 400 on an idle page). The site check then waited for ever, as nothing limits an evaluate, and the timing test counted from the page's start. Both now put the listener on first and send the key after; no limit was raised. `npm test` then exits 0: 2,426 passed, 2 skipped, 206 files, 1,013 s. `typecheck`, `content-check`, `token-check` and `traceability` (`PASS: all 374 active requirements in 7 approved specs are covered.`) exit 0, and `site-check` gives `No problems. 14 of 14 parts passed.` in 255 s. The site's own code is unchanged by this fix, so the sizes and the audits above stand.
  - Added by T285 (2026-10-30): on Android Chrome and iOS Safari, answer the 100-match question with `y` and with `n` on the on-screen keyboard, and with the Tab key with no keyboard open; the line must stay as it was.
  - T279 (2026-10-30): the owner's manual checks are deferred to the final multi-spec testing phase, as the owner's standing decision for T108 and T215 has it and the interim provision allows. List each in the PR. Stays open.
  - BLOCKED: the owner's manual checks, deferred to the final multi-spec testing phase with T108 and T215.
- [ ] T280 Commit the remaining work with Conventional Commits and push `006-terminal-shell` to PR #32, which carries both amendments (plan Constitution Check XI):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - Update the PR's title and description to name the 2026-10-29 and 2026-10-30 amendments; link `specs/006-terminal/spec.md` and `specs/006-terminal/tasks.md`; state that no dependency is added for the second; record T275's, T278's and T279's results, listing every manual check deferred under the interim provision, beside T216's items (T129's issue links, T214's open >1 MB variable bug, T215).
  - Confirm the CI jobs run and pass, that the `site` job's summary matches a local `npm run site-check` on the same commit (FR-042), and that it fits its 12-minute limit.
  - Owner action: the local full run on a clean checkout of the PR's head commit, signed off so its `local-verify` status passes (Constitution, Merge requirements), again after every new commit. Merging is the owner's.
  - Done 2026-10-30: pushed `27fbd14` to PR #32 without rewriting, and updated its title and description as above, with no AI or Claude attribution. CI on `27fbd14` (run 41116273583): `content`, `site`, `test`, `tokens` and `traceability` pass. `site` took 6 minutes 44 seconds, within its 12-minute limit, and its summary matches a local `npm run site-check` on the same code line for line, scores masked (FR-042).
  - BLOCKED: the `local-verify` sign-off and the merge are the owner's.

---

## Amendment 2026-10-30: Dependencies & Execution Order

### Phase dependencies

- **Phase 26 (Setup)**: T218 first (the merge of `main` and the baseline), then T219.
- **Phase 27 (Foundational)**: after T218. BLOCKS every story of this amendment.
  - T220 and T221 after T219; T222 to T225 in parallel after T218.
  - T226 after T222 and T223; T227 after T222 and T224; T228 after T225 and T227.
- **Design gate**: every task that creates or changes UI (T237, T238, T248, T249, T253, T258,
  T262) depends on T219.
- **US1 (Phase 28)**: after Phase 27. The amendment's MVP. T234 after T229; T235 after T230; T236
  after T234; T237 after T232 and T235; T238 after T233, T236 and T237; T231 needs T234 and T235
  to pass; T239 last.
- **US3 (Phase 29)**: after Phase 27; independent of US1 except that both change
  `session.ts` (T237, T249), so run T249 after T237 if both are in flight. T246 after T241; T247
  after T240 and T246; T248 after T228, T242, T243 and T247; T249 after T244, T245 and T248; T250
  after T249; T251 last.
- **US4 (Phase 30)**: after US1 (the Tab key shares T238's completion path) and US3 (the `i`,
  `u`, `:w` keys and the insert text area of T248).
- **US5 (Phase 31)**: after US1 and US3.
- **US6 (Phase 32)**: after US1, US3 and US4 (every new state exists).
- **US8 (Phase 33)**: after US1 to US6.
- **US2 and US7**: nothing in this amendment changes them; their tests must still pass (T277).
- **Polish (Phase 34)**: after every story above. T280 last.

### Within each phase

- Tests first, failing before the code they cover.
- Types before the adapter, the adapter before the worker, the worker before the client, the
  client before the session, the session before the components.
- The pure modules (`complete.ts`, `columns.ts`, `json.ts`'s `lexLine`, `vim.ts`) before the
  components that use them.

### Parallel opportunities

- Phase 27: T221 to T225 together after T219 (different files).
- US1: T229 to T233 are all [P]; T235 alongside T234.
- US3: T240 to T245 are all [P]; US3's tests can be written while US1 is built.
- US5: T255 to T257 [P]. US6: T260, T261 [P]. US8: T264 to T266 [P].
- Polish: T271, T272, T273, T275 and T276 [P].

## Amendment 2026-10-30: Parallel Example, User Story 1

```bash
Task: "Write shell/complete.test.ts (FR-076, research R43's table) (T229)"
Task: "Write engine/columns.test.ts (FR-076) (T230)"
Task: "Write shell/readline-driver.py and shell/completion-parity.test.ts (SC-017) (T231)"
Task: "Write terminal/completion.test.ts (FR-076) (T232)"
Task: "Rewrite keyboard.test.ts's Tab cases (FR-026, SC-016) (T233)"
```

## Amendment 2026-10-30: Parallel Example, User Story 3

```bash
Task: "Rewrite engine/vim.test.ts for the editor (FR-060, FR-064, FR-079 to FR-081) (T240)"
Task: "Extend engine/json.test.ts with lexLine (FR-079) (T241)"
Task: "Update terminal/vim.test.ts (FR-058, FR-060, FR-064, FR-065) (T242)"
Task: "Write terminal/vim-edit.test.ts (FR-065, FR-079 to FR-081) (T243)"
Task: "Extend terminal/state.test.ts (FR-021) (T244)"
Task: "Extend engine/announce.test.ts (FR-028) (T245)"
```

## Amendment 2026-10-30: Implementation Strategy

### MVP first

1. T218 (the baseline, with `main` merged) and T219 (the design gate).
2. Phase 27: the token, site text, types, the `vim` effect's file and the worker's `write`.
3. Phase 28 (US1): Tab completes as bash does, with the way out.
4. **STOP and VALIDATE**: quickstart 12 steps 1 to 3 at 1440 × 900, and the completion parity
   test.

### Incremental delivery

1. Phase 27 → the worker writes files; nothing visible has changed.
2. US1 → Tab completion on desktop (the MVP).
3. US3 → vim edits and writes files.
4. US4 → the pocket Tab key and vim keys.
5. US5 → completion and editing heard once, and described.
6. US6 → the new states in forced colors, zoom and axe.
7. US8 → the site check.

The amendment ships in PR #32 with the 2026-10-29 one (Constitution XI); the increments are
checkpoints within it.

## Amendment 2026-10-30 Requirement Coverage

The requirements the 2026-10-30 amendment adds or amends, or whose tests it changes (plan.md rows
marked *(2026-10-30)*), and the test tasks that cover them now. Every other requirement keeps its
coverage from the tables above.

| Requirement | Test task(s) |
|-------------|--------------|
| 006-terminal-FR-008 | T255 |
| 006-terminal-FR-021 | T225, T244 |
| 006-terminal-FR-026 | T233, T257 |
| 006-terminal-FR-028 | T245, T256 |
| 006-terminal-FR-030 | T272 |
| 006-terminal-FR-031 | T261 |
| 006-terminal-FR-033 | T260 |
| 006-terminal-FR-034 | T261 |
| 006-terminal-FR-035 | T261 |
| 006-terminal-FR-037 | T271 |
| 006-terminal-FR-038 | T264 |
| 006-terminal-FR-039 | T265 |
| 006-terminal-FR-040 | T266 |
| 006-terminal-FR-051 | T252 |
| 006-terminal-FR-053 | T252 |
| 006-terminal-FR-058 | T223, T242 |
| 006-terminal-FR-060 | T240, T242 |
| 006-terminal-FR-061 | T240 |
| 006-terminal-FR-064 | T240, T242 |
| 006-terminal-FR-065 | T242, T243, T256 |
| 006-terminal-FR-066 | T252 |
| 006-terminal-FR-073 | T224 |
| 006-terminal-FR-076 | T229, T230, T232 |
| 006-terminal-FR-077 | T255 |
| 006-terminal-FR-078 | T252 |
| 006-terminal-FR-079 | T240, T241, T243, T257, T273 |
| 006-terminal-FR-080 | T224, T225, T240, T243 |
| 006-terminal-FR-081 | T223, T240, T243 |

Success criteria added: SC-016 T233, T243, T265; SC-017 T231. SC-013 and SC-005 T275; SC-004 and
SC-010 T279.

## Amendment 2026-10-30: Notes

- Superseded by this amendment, in part, and marked where they are: T025 (by T240), T039 (by
  T242 and T243), T066 (by T252), T075 (by T233), T076 (by T242 and T256), T141 (by T223) and
  T182 (by T233 and T257). They stay ticked; their tests are rewritten, not left to fail.
- T279's and T280's owner actions are the owner's: the hand checks, the `local-verify` sign-off
  and the merge.
- **Choices made here that the design documents don't fix**. If the owner prefers otherwise,
  change the plan or contract first:
  - **One foundational phase for the `vim` effect's file and the worker's `write`** (T222 to
    T228), as both US3 and US4 need them and neither changes what a visitor sees.
  - **The client's `complete()` is US1's** (T236), not foundational: only the command line and
    the pocket Tab key use it, and the Tab key comes after US1.
  - **FR-026's new Tab rules are tested in US1** (T233), with completion, since completing
    without the way out would trap focus; US5 keeps the reserved-key list (T257).
  - **The 2,000 ms timeout for `write` resolves as `cant-open`**, so the view shows `E212` and
    keeps the text, as contracts/shell-worker.md's Timing row says.
  - **The completion parity test runs in the slow project**, as T158 does, so it runs in the
    local full run with GNU tools, bash 5 and `python3`, not in CI's `test:fast`.

---

## Phase 35: Convergence

- [X] T281 Stop a line that fails inside the shell from closing the Terminal, in `packages/web/src/apps/terminal/shell/adapter.ts` (`runLine`) and `packages/web/src/apps/terminal/session.ts` (`finish`), per FR-021 (contradicts). Today any line that doesn't reach the epilogue gets `end: 'exited'`, which `finish` treats as `exit`. So on the real build (1440 × 900, the build of `fd10b48`) `touch keep; f=about; echo x > $f` closes the Terminal, and reopening it shows `keep` gone along with the output, the history and the variables. `exited` must mean only what `exit`, `set -e` and the like mean in bash. A rejected `exec` or a parse failure of the adapter's own script must show its error, keep the state and the visitor's files as they were, and give a new prompt. Test at the session level and on the build, with the line above and `seq 300000 > big`, confirming the Terminal stays open and `ls keep` still finds the file.
  - Done 2026-10-30: `exited` now means only what `exit`, `set -e` and the like mean. A rejected `exec` or a parse failure of the adapter's script gives `end: 'done'` with its error and status, and keeps the state and files. Tested in `adapter.test.ts`, `engine/session.test.ts` and on the build in both shells (`shell.test.ts`). As T282 now handles the task's two lines without a rejection, the tests use `eval "echo x > about"`, the one way left to reach it, and also run both of the task's lines.
- [X] T282 Make every refused output redirect behave as bash does, whatever its target is written as, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/shell/fs.ts`, per FR-049, FR-067, FR-068 and FR-073 (contradicts). Today `guardPlugin` catches only a literal target from the folder the line starts in. In the shell adapter, `echo before; f=about; echo x > $f; echo after` and `cd work; echo before; echo x > y; echo after` both print only `bash: Permission denied`, not naming the path and losing `before` and `after`. `for f in about skills; do echo x > "$f"; echo next; done; echo after` prints `Permission denied` once and loses `next`. `echo before; seq 300000 > big; echo after` prints only `bash: No space left on device`, losing the same lines. FR-068 allows four differences from bash and none of these, though research R28 records them as accepted until G1 is fixed upstream. Don't wait for T129's upstream fix: each refused redirect must give `bash: <target>: Permission denied` or bash's "No space left on device" error, fail only that command with status 1, and let the line go on with its earlier output kept. Cover a target from an expansion, a target after a `cd`, a target in a loop and in a function, and a redirect past the 1 MB limit, in `packages/web/test/terminal/shell/` and in T158's parity list where bash's output can be compared. Update research R28 and G1, the plan and contracts/shell-worker.md to the build (Constitution I).
  - Done 2026-10-30: research R28 and G1, the plan and contracts/shell-worker.md are updated. `guardPlugin` and `__cv_denied` are gone. A redirect past 1 MB says `bash: big: No space left on device`, which is the form bash uses for a target it can't open; bash has no quota, so T158 can't compare it. T158's list gains nine lines, all equal to real bash. **Not fully as bash, recorded in R28 until the upstream fix**: a refused redirect inside `eval`, `source` or `bash -c` still ends the line and loses its earlier output, though it now names the target and keeps the Terminal open; a pipe reading the refusal or `type f` sees just-bash's words; a command with an output redirect counts as two of FR-069's 10,000.
- [X] T283 Keep a variable over about 1 MB from breaking later lines, in `packages/web/src/apps/terminal/shell/adapter.ts` (`prelude`), per FR-067 and FR-021 (partial). This is T214's open bug. After `x=$(seq 200000)`, which stores 1,288,894 bytes, `prelude` carries the variable as text, so every later line fails with `Input too large: 1288981 bytes exceeds limit of 1000000`, `unset x` included. On the build, because of T281's fault, the next line closes the Terminal. Decided for this unattended run, as FR-067 says variables last and FR-068 allows no such difference: carry the state outside the parsed script, so such a variable works as in bash and `unset x` clears it. If just-bash 3.6.0 has no way to do that, mark this task BLOCKED for the owner, as stopping the line that sets the variable would need a spec amendment to FR-069. Test `x=$(seq 200000)`, then `echo ${#x}`, then `unset x`, then `echo ok`, including after a restarted worker (Ctrl+C), which gets the same state back.
  - Done 2026-10-30: `prelude` no longer holds the variables. They go with `exec`'s `env`, which doesn't export them. T214's bug is fixed. Tested with `x=$(seq 200000)`, `echo ${#x}`, `unset x`, `echo ok`, from the same state in a second shell (a restarted worker), and on the build.
- [X] T284 Match the site's commands without regard to capitals wherever a command can stand, in `packages/web/src/apps/terminal/shell/adapter.ts` (`sitePlugin`, `lowerFirst`), per FR-007 and FR-067 (partial). Today only a line's first word is matched that way: `Work | head -1` runs, but `true && WORK | head -1`, `echo a; ABOUT` and a loop's `do WORK; done` all give `command not found`. A site command or alias (FR-008) must run in any command position, in any case, with replies still naming the word as typed (FR-017). Standard commands keep bash's meaning, so `GREP` stays unknown. Add the cases to `packages/web/test/terminal/shell/`.
  - Done 2026-10-30: `sitePlugin` matches any literal command word in any case, unless the visitor's function has that name, and marks the word as typed with `__CV_TYPED`, so replies name it. `lowerFirst` and `RunRecord.typed` are gone. Also: `set -x` no longer prints the adapter's `__CV_` assignments.
- [X] T285 Make the 100-match question answerable on the pocket terminal, in `packages/web/src/apps/terminal/CommandLine.tsx` and `packages/web/src/apps/terminal/Pocket.tsx`, per FR-076 and FR-078 (partial). Found by reading the code, not on a real phone. `asked` is answered only by a `keydown` whose `key` is `y`. Android Chrome's on-screen keyboard reports `Unidentified`, so the key would count as "no" and put `y` in the line. And after a tap on the Tab key, the command line has `inputmode="none"`, so no keyboard is open to answer with. Read the answer from what is typed where `key` can't say, and make sure the question can be answered from the Tab key's state, with focus and the on-screen keyboard kept as FR-078 sets. Test in `packages/web/test/terminal/pocket.test.ts` with an emulated phone and a key event of `Unidentified`, and add the real-phone step to the list T279 defers.
  - Done 2026-10-30: a key the browser can't name (`Unidentified`, `Process`) is read from the text it would add, and the line is put back; the pocket's Tab key answers a waiting question with yes, so no keyboard is needed. Tested on an emulated phone with synthetic events only. The real-phone step is added to T279's list.
- Phase 35 result (2026-10-30): `npm test` passes in full, 2,463 passed and 2 skipped, in 1,022 s, with the GNU tools first on PATH. `typecheck`, `content-check`, `token-check`, `traceability` (374 of 374) and `site-check` (`No problems. 14 of 14 parts passed.`) exit 0. An earlier full run, at load average 12 to 15, had 10 failures: a malformed requirement ID in a new test title, two `tools/site-check/test/terminal.test.ts` cases patching the adapter's old text, both fixed, and seven timeouts or focus failures that passed unchanged alone and in the full rerun at load average 3 to 8. T214's >1 MB variable bug is fixed by T283, so T280's PR description no longer needs to list it as open. CI hasn't run on this commit: it isn't pushed.

## Phase 36: Convergence

Found by running lines through the real adapter, Tab's completer and the vim reducer on `dc865c5`, and comparing the suspect ones with interactive bash 5.3 and vim. These weren't run on the build; the session closing on `end: 'exited'` is read from `session.ts`, `finish`.

- [X] T286 Stop lines that merely fail from closing the Terminal, in `packages/web/src/apps/terminal/shell/adapter.ts` (`runLine`, `limitOf`, `EPILOGUE`), per FR-021 and FR-069 (contradicts). T281 fixed `exec` rejecting and parse failures, but these still end with `end: 'exited'`, which closes the Terminal and wipes the visitor's files: `f() { f; }; f` and the well-known `:(){ :|:& };:` (just-bash's recursion limit, status 126, with the message `increase executionLimits.maxCallDepth`); `PATH=` and `export PATH=/x` (`bash: __cv_state: command not found`, as the epilogue looks its command up on the visitor's PATH); and `set -u; echo $nope`, `echo ${nope:?boom}` and `readonly q=1; q=2`, which end the line but leave an interactive bash open (checked on bash 5.3 with `-i`). The recursion limit must stop the line as FR-069 does, with its site text and a new prompt, and no internal words. The PATH lines must keep the Terminal open and later lines behave as bash does with that PATH. The last three must print bash's error (`bash: nope: boom`, where the shell now says `bash: boom`), drop the rest of the line, keep the state and files and give a new prompt. `exit`, and `set -e` with a failing command, still close it (R27). Test each line at the session level with `touch keep` before it and `ls keep` after it, and on the build in both shells. Update R27 item 6.
  - Done 2026-10-31: recursion and the fork bomb stop at FR-069's limit on commands (`maxCallDepth` raised, so a recursion that ends runs as in bash); hidden commands run by path, and bash's builtins go by path once `PATH` is touched; `set -u`, `${x:?word}` and `readonly` errors print bash's words, drop the rest of the line, and keep the state up to the last checkpoint. Tested at the session level and on the build in both shells. R27 item 6 updated.
- [X] T287 Make `cd` behave as bash across lines, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/shell/protocol.ts`, per FR-008, FR-045 and contracts/commands.md's "`cd -` back" (contradicts). `cd work` and then `cd -` on the next line prints `bash: cd: /home/user: No such file or directory`, naming a folder that doesn't exist, because `OLDPWD` isn't carried (R27 leaves it to the shell). Carry the previous folder in the state, including after a restarted worker, so `cd -` goes back and prints the folder, and `$OLDPWD` holds it. `OLDPWD=/tmp; cd -` must go to `/tmp`. Also `cd a b` must say `bash: cd: too many arguments`, where it now reports `a` missing; and after `mkdir d; cd d; rm -r ../d`, `cd ..` must go up, where it now fails and leaves the visitor in the removed folder. Add these to `packages/web/test/terminal/shell/adapter.test.ts` and, where bash's output can be compared, T158's parity list.
  - Done 2026-10-31: `__cv_cd` decides, the builtin moves. A name reached by expansion (`c=cd; $c a b`) still goes to just-bash's own `cd`. `cd a b` gives status 2, which is what bash 5.3 gave in the parity test, not 1. A `cd` now counts as ten of FR-069's commands (measured; research R28).
- [X] T288 Carry the rest of the shell's variables and settings from line to line, in `packages/web/src/apps/terminal/shell/adapter.ts` (`OWN`, `stateFrom`, `prelude`) and `packages/web/src/apps/terminal/shell/protocol.ts` (`ShellState`), per FR-067 (partial). FR-067 says variables last until the Terminal closes, but on the next line: `a=(1 2 3)` then `echo ${a[1]} ${#a[@]}` prints `0` (bash `2 3`); `HOME=/tmp`, `USER=me` and `IFS=,` are back to their old values, and `unset HOME` is undone; `readonly r=1` then `r=2` succeeds; `declare -i n=1` then `n=1+1` gives `1+1`; `set -- a b c` then `echo $#` gives `0`; and `shopt -s nullglob` is off again. Carry each, through `exec`'s `env` or outside the parsed script as T283 does, and from the same state in a restarted worker. The prompt's `~` keeps meaning `/home/guest` whatever `HOME` holds (FR-045, FR-046). Test each pair of lines and add them to T158's parity list. Update R27 item 2 and data-model.md's Shell state (Constitution I). If just-bash 3.6.0 has no way to carry one of them, leave that one out, record it in research as a gap and mark this task BLOCKED for the owner, as FR-067 and FR-068 allow no such difference without an amendment.
  - Done 2026-10-31: arrays and attributes through `declare -p`, `$1`… and `HOME`, `USER`, `IFS` through `exec`'s `env`, `unset` and `shopt` in the prelude, all from the state, so a restarted worker has them too. Limits recorded in R27 item 4, so the owner can check them against FR-067: a value of 64 KB or more keeps its value and loses any attribute, and an array too big to list stops its line at the output limit.
- [X] T289 Keep the functions a line really defined, in `packages/web/src/apps/terminal/shell/adapter.ts` (`definitions`, `stateFrom`), per FR-067 (partial). Bodies are taken from the line's AST, so `eval "f() { echo hi; }"` and `source lib` define a function that's gone on the next line, which R27 records as a known limit for `eval` only and FR-067 doesn't allow. And `h() { echo 1; }; if false; then h() { echo 2; }; fi` leaves `h` printing `2` on the next line, where bash prints `1`, as the last definition in the text wins over the one that ran. Carry `eval` and `source` definitions and the definition that ran. If just-bash 3.6.0 can't give a body (G10) by any route, fix the conditional case, record the rest in research R27 and mark this task BLOCKED for the owner, as carrying them on would need FR-067 amended.
  - Done 2026-10-31, not BLOCKED: each definition reports itself when it runs, and `eval` and `source` hand their text to the adapter first. Limits in R27 item 5: a name reached by expansion isn't seen, and inside `eval` or `source` text the last definition counts whether or not it ran. An `eval` or `source` counts as twelve of FR-069's commands (measured).
- [X] T290 Keep the adapter's script apart from the visitor's line, in `packages/web/src/apps/terminal/shell/adapter.ts` (`prelude`, `EPILOGUE`), per FR-067 and plan R27 (contradicts). `echo a \` prints `a __cv_s=0`, as the trailing backslash joins the line to the epilogue; bash, at the end of its input, prints `a \`. After `:() { echo colon; }`, every later line prints `colon` first, because the prelude runs `&& :`; `set` and `export` are used the same way when options or exported variables exist. `echo $LINENO` prints `2` on the first line, and inside a function too, where bash prints `1`, as R27 item 7 shifts only messages. No line may show or be changed by the adapter's words, and the visitor's functions must not run in the prelude or epilogue. Test these in `packages/web/test/terminal/shell/adapter.test.ts`.
  - Done 2026-10-31: prelude, line and checkpoint are parsed apart and joined as trees, and no visitor function runs in them, except a function named `builtin` (R27 item 5).
- [X] T291 Complete `.` and `..` and list on every further Tab, as bash's readline does, in `packages/web/src/apps/terminal/shell/complete.ts` and `packages/web/src/apps/terminal/CommandLine.tsx` (`tabComplete`), per FR-076 (partial). On bash 5.3, `cd ..` then Tab gives `cd ../`, and `ls .` then two Tabs lists `./`, `../` and any hidden entries; here both have no matches, as the file system's `readdir` doesn't return `.` and `..`. In bash the third and later Tabs in a row list the matches again; here `tabbed = null` makes the third do nothing and the fourth list. Add these to `packages/web/test/terminal/shell/completion-parity.test.ts` and `packages/web/test/terminal/completion.test.ts`, the pocket's Tab key included (FR-078).
  - Done 2026-10-31. After the 100-match question the Tab count starts over, which keeps the existing test; not compared with readline.
- [X] T292 Match vim where the reducer differs, in `packages/web/src/apps/terminal/engine/vim.ts`, per FR-079 and FR-060 (partial). Of 120 key sequences run on the reducer and on real vim (`vim -u NONE -N -s`) over the same text, 13 differ. Counts: `3D` and `j3D` must delete to the line's end and the next two lines, and `2C` likewise before inserting (`toEnd` ignores the count, though FR-079 asks for a count before any of them). `3ix<Esc>`, `3ax<Esc>`, `3Ax<Esc>`, `3Ix<Esc>`, `3ox<Esc>` and `3Ox<Esc>` must repeat what was typed. On an empty line: `J` must add no leading space, and `dw` must delete the line. Moves: `2G`, and so `gg`, `G` and `:N`, must land on the line's first non-blank; `{` and `}` in a text file must stop at blank lines, where `}` now goes to the last line (JSON keeps the fold jumps). Read from the code, not run: `x` and `h`/`l` step by UTF-16 unit, so `x` on an emoji leaves half a character, though insert mode handles pairs; they must treat a character as whole. Add each to `packages/web/test/terminal/engine/vim.test.ts`, the expected text and cursor taken from real vim.
  - Done 2026-10-31: 152 sequences diffed against `vim -u NONE -N -s` 9.1; 151 agree. The other, `xxuu<C-r>`, is vim taking a script's `xx` as one undo step, which typed keys aren't. `3dd` and `3yy` on the last line now refuse as vim does (found by the same diff). The emoji cases are read from vim's rules, not compared, as its column is in bytes.
- [X] T293 Word the shell's failures as bash does, in `packages/web/src/apps/terminal/shell/adapter.ts` (`parseMessage`), per FR-067, FR-068 and the edge case "bash's syntax error" (partial). Today: `for i in 1` says `Expected DO, got EOF`, `f() {` says `Expected RBRACE, got EOF`, and `(` and `case x in` likewise; `if true; then` and `while true; do` blame a `fi` and a `done` that aren't in the line; `echo ${` names `line 0`; `eval "if"` says `Parse error at 1:3`; and `cat <<EOF` says `Cannot serialize an unterminated here-document`, where bash warns that it was delimited by end-of-file, runs it with no input and gives status 0. An unfinished line must give bash's `syntax error: unexpected end of file`. `echo $((1/0)); echo after` must say `1/0: division by 0 (error token is "0")` and drop `after`, as bash does. No message may hold just-bash's parser or limit words. Update R27 item 1, and add the cases to T158's parity list where bash's output can be compared.
  - Done 2026-10-31. Wording is `syntax error: unexpected end of file`, as this task sets; `bash -c` 5.3 adds ``from `if' command on line 1`` for some, which isn't copied. `echo ${a b}` stays a syntax error with status 2, where bash reports it when it runs, with status 1.
- [X] T294 Answer `--help` on the commands that take bash's options, in `packages/web/src/apps/terminal/shell/site-commands.ts`, per FR-068 (partial). `cd --help` prints nothing with status 0, `pwd --help` prints the folder, and `history --help` gives the usage reply; bash prints each one's help. Check every name in `SHELL_BUILTINS` the same way and fix those that don't answer, keeping `help <name>`'s text as the one source (Constitution IV). Test in `packages/web/test/terminal/shell/standard.test.ts`.
  - Done 2026-10-31, with bash's status 2, for a literal `--help` only. `cd`, `pwd`, `exit`, `help` and `history` print the site's `help` text, not bash's, as this task keeps `help <name>` as the one source.
- [X] T295 Keep a file's bytes as written, in `packages/web/src/apps/terminal/shell/fs.ts` (`writeFile`, `spoken`) or the adapter, per FR-073 and FR-068 (partial). `printf "\xff\xfe" > bin; wc -c bin` gives `4 bin` where bash gives `2 bin`, as the bytes are stored re-encoded as text. Check the same through a pipe, record the cause in research R25's gaps, and test in `packages/web/test/terminal/shell/fs.test.ts`. If it's just-bash's and can't be handled in the adapter, add it to T129's upstream reports and mark this task BLOCKED for the owner, as FR-068 allows no such difference.
  - Done 2026-10-31, not BLOCKED: `printf` and `echo -e` wrappers, and a snapshot keeps the bytes for a restarted worker (research G21). Stays: `x=$'\xff'` holds a character, and such a byte shows on screen as a character.
- [X] T296 Bring the docs in line with the adapter, per plan: T282's documentation (contradicts) and Constitution I. T282 records `contracts/shell-worker.md` as updated, but its lines 75 and 79 still name `guardPlugin` and `__cv_denied`, and `research.md` line 765 names `__cv_denied`; all are gone from the code. They must name `redirectPlugin` and `__cv_wrote`. Do this after T286 to T295, with whatever they change in R27 and R28, and confirm with a search that neither old name is left outside `tasks.md`.
  - Done 2026-10-31: a search finds neither old name outside `tasks.md`.
- Phase 36 result (2026-10-31): `npm test --maxWorkers=4` passes in full, 2,615 passed and 2 skipped, in 1,228 s, with the GNU tools first on PATH (the pocket test for T291 came after it, and passed alone). `typecheck`, `content-check`, `token-check`, `traceability` (374 of 374) and `site-check` (`No problems. 14 of 14 parts passed.`) exit 0. Two earlier full runs beside 008's suite, at load 12 to 20, had 14 and then 4 failures. One was real: the os script grew past `OS_BUDGET` in a fixture build, fixed by trimming `vim.ts` (118,971 bytes, budget 119,260, which was left alone). The others timed out and passed alone. The keyboard flow's Shift+Tab walk takes about 140 presses and 8.8 s at load 20 against a 10 s limit, now 30 s. CI hasn't run on this commit: it isn't pushed.

## Phase 37: Convergence

Found on `9918def` by running lines through the real adapter, Tab's completer and the vim reducer and comparing them with bash 5.3, GNU tools and vim 9.1, and on a build in Chromium at 1440 × 900 where a task says so. FR-068 holds a command to the options its own `--help` lists, so an option it doesn't list isn't a gap here. The scripts are in `CV-worktrees/.scratch/006-converge3`. Its `diff.ts` runs each line in real bash on this machine, so give it no line that removes or moves anything or writes by an absolute path; use `ours.ts`, which runs only the adapter's in-memory file system. Reducer changes go in the `os` script, which has about 20 bytes free in a fixture build (`handoff.md`): trim, don't raise `OS_BUDGET`, and if T300, T307 and T308 can't fit, mark what's left BLOCKED for the owner.

- [X] T297 Split a command name that comes from an expansion into words, as bash does, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (contradicts). `x='echo hi'; $x` gives `bash: echo hi: command not found`, status 127, where bash prints `hi`; likewise `x="wc -l"; $x languages`, `x="grep -c a"; echo a | $x` and `c='cat languages'; $c | wc -l`. Plain just-bash 3.6.0 does the same, so record it in research R25's gaps and add it to T129's upstream reports, but don't wait for a fix. Splitting must follow `IFS`, globs must expand, and a site command reached this way must run as a site command, pipes included (`x='work -x'; $x` gives `work`'s usage reply). Add the lines to T158's parity list. If just-bash 3.6.0 can't be made to do this in the adapter, mark this task BLOCKED for the owner, as FR-067 and FR-068 allow no such difference.
  - Done 2026-10-31: `rewriteExpanded` in the adapter; research G22; lines in T158's list. For T129's reports: G22.
- [X] T298 Keep what a line prints after `clear`, in `packages/web/src/apps/terminal/session.ts` (`finish`), `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/engine/commands.ts`, per FR-019 and FR-067 (contradicts). On the build `clear; echo two` shows nothing, as `finish` adds the entry and the `clear` effect then empties `entries`, that entry included. `clear; ls` shows nothing either. The effect needs its place in the line's output: `echo one; clear; echo two` must show the line's run with only `two`, and `echo one; clear` must behave as now. Announce what stays (FR-028). Test at the session level and on the build in both shells.
  - Done 2026-10-31: `clear` prints a mark where its output reaches the screen; tests at the session level and on the build in both shells.
- [X] T299 Keep the adapter's words out of everything a visitor can read, in `packages/web/src/apps/terminal/shell/adapter.ts`, `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/fs.ts`, per FR-067 and research R27 (contradicts). T290 says no line may show them, but: `env | sort`, `env | cat`, `set | cat` and `declare -p | cat` print `__CV_PIPED`, and `compgen -v` lists it, as the mark is a real variable of the command it's put on; `echo a` and then `echo $_` on the next line prints `/usr/bin/__cv_ok`, where bash prints `a`; `set -v; echo a` prints the checkpoint's script to stderr; `n=__c; ${n}v_end` prints `__cv_end: Cannot destructure property 'taken' of 'reading' as it is null.`, and `${n}v_help`, `${n}v_cd` and the rest run, as `HIDDEN` reads only the typed line. And `echo __cv_x` gives `bash: __cv_x: command not found`, where bash prints `__cv_x`, so a word that only looks like the adapter's must behave as any other. A hidden command must answer only the adapter's own tree, and `$_` must carry from line to line. Test each in `packages/web/test/terminal/shell/adapter.test.ts`, and add a check that runs `env`, `set`, `declare -p` and `compgen -v`, each piped and not, and finds no `__cv` in any case.
  - Done 2026-10-31: names hold a per-worker `MARK`; `$_` is carried; `HIDDEN` is gone. A function that prints `set` inside a pipe is covered by a count, no variable. Left: `x=set; $x | wc -l` counts the adapter's lines (research R27).
- [X] T300 Match vim's column memory and its word and paragraph moves, in `packages/web/src/apps/terminal/engine/vim.ts`, per FR-060 and FR-079 (partial). Compared with `vim -u NONE -N -s`: `j` and `k` lose the column, so on `abc`, `abcdef` `$j` lands at 2,3 (vim 2,6), and on `abcdef`, `ab`, `abcdef` `lllljj` lands at 3,2 (vim 3,5); an empty line between gives 3,1 (vim 3,5). Any other move or change sets the remembered column, and `$` remembers the line's end. `w` must stop on an empty line: from line 1 of `a`, ``, ``, `b c`, it lands at 4,1 (vim 2,1), and `2w` at 4,3 (vim 3,1). `b` at the file's first word must go to column 1 past leading blanks. A count on `dw` and `cw` must cross lines: `d3w` on that text leaves `b c`, ` d(e) f.g` (here it deletes only `a`), `2d3w` on the other text and `2cwM<Esc>` likewise, with the register and `p` following it (`d3w2p`). `2}` past the last paragraph must leave the cursor where it was, as vim fails the move, while one `}` still goes to the end. Take each expected text and cursor from real vim, add them to `packages/web/test/terminal/engine/vim.test.ts`, and run `fuzz2.ts` in the scratch folder until the only differences left are ones you can name as a script's undo steps (T292).
  - Done 2026-10-31: `fuzz2.ts` seeds 7, 11, 29 and 41 give 0 differences of 1,168 sequences. Table of vim's results in `vim.test.ts`.
- [X] T301 Complete the words bash completes, in `packages/web/src/apps/terminal/shell/complete.ts`, per FR-076 (partial). Compared with bash 5.3's readline through `readline-driver.py`: `cat $HOME/ab` must give `cat $HOME/about ` and `echo $HOME/wo` must give `echo $HOME/work/`, here nothing, as a `$` word is only ever a variable's name; `x=1 ec` must give `x=1 echo `, as a word after assignments is a command's first word; `cat wo*` must give `cat work/`, here nothing, as a pattern is refused outright (keep `cat c?`'s result as bash gives it); ``echo `ab`` must give ``echo `about`` with no space, and `echo "$(ab` must give `echo "$(about`; `~` alone as the first word must stay `~`, where it gives `~/`. Add every line to `packages/web/test/terminal/shell/completion-parity.test.ts`'s list.
  - Done 2026-10-31: all in `completion-parity.test.ts`. Real bash leaves `cat ~` as `cat ~` too, so `~` adds nothing anywhere; those two get one Tab in the test, as bash's second lists the machine's users.
- [X] T302 Fix the standard commands' listed options that fail or differ from GNU, in `packages/web/src/apps/terminal/shell/site-commands.ts` or `packages/web/src/apps/terminal/shell/standard.ts`, per FR-068 and SC-014 (partial). Each is listed by that command's own `--help`. `xargs -n1` and `xargs -I{}` give `invalid option`, though `-n 1` and `-I {}` work, and GNU takes both forms; `echo | xargs echo` and `xargs echo < /dev/null` must run once, printing an empty line, as GNU does without `-r`. `head -n -1` gives `invalid number of lines`. `uniq -c` pads to 4 columns where GNU pads to 7, which changes every `sort | uniq -c`. `sed -f /dev/null f` gives `no script specified`; `sed -i.bak` makes no backup; `sed 's/a/b/w o'` writes every line to `o`, not only the changed ones. `date -I` prints a time as well, and `date -u -d '2020-01-02 03:04:05' +%c` is an hour off here, as it reads the time in the browser's zone. `env -i env` also prints `PWD`. `rm -rv d` prints nothing, and `cp -v a c` prints `/home/guest/c` where GNU prints `c`. `tail -c5` cuts by character where GNU cuts by byte. Add each to T158's parity list. For one just-bash has wrong and the adapter can't reach, add it to research R25's gaps and T129's reports, and mark this task BLOCKED for the owner for that one, as FR-068 allows no such difference.
  - Done 2026-10-31: `shell/gnu.ts`; lines in T158's list. `s…w file` is handled when the script is one `s` command; a longer script is G23, for T129.
- [X] T303 Print the JSON when `cv`'s output doesn't reach the screen, in `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-057 and FR-067 (partial). `cv | head -1` and `cv | wc -l` print nothing and open the vim view behind the pipe, and `cv > out` leaves `out` empty, where FR-057 says a command of FR-008 is piped as the text it shows. Decided for this unattended run: with its output going to a pipe, a file or a `$(…)`, `cv` prints the pretty-printed JSON and opens no view; `cv` alone is unchanged (FR-059). `PIPED` covers pipes and `$(…)` only, so a redirect needs covering too. `clear | wc -l` and `clear > f` must likewise leave the screen as it was. Test at the session level, with the owner able to reverse the decision by amending FR-059.
  - Done 2026-10-31: as decided; `walk` counts a command's own output redirect. Tested in `site-commands.test.ts` and at the session level.
- [X] T304 Use the site's `help` wherever a line can reach it, and answer an unknown name, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/engine/commands.ts`, per FR-008 and FR-017 (partial). `"help"`, `\help`, `h=help; $h`, `command help` and `builtin help` print just-bash's list, headed `just-bash shell builtins`, where FR-008 sets `help`'s text and the spec leaves the shell's name to the plan. Only an unquoted literal word is renamed today. `x=WORK; $x` gives `command not found` where FR-007 matches without regard to capitals. `help nope` says `help takes at most one command`, though one was given; it must say that no command has that name and mention `help`, keeping status 2 unless bash's differs (`help: no help topics match`, status 1). Test in `packages/web/test/terminal/shell/site-commands.test.ts`.
  - Done 2026-10-31. `eval help` and `source` text still reach just-bash's list, as their text isn't parsed by the plugins (research G24).
- [X] T305 Match bash's builtins where they differ, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/shell/protocol.ts` (`ShellState`), per FR-067 and FR-068 (partial). `pushd /tmp` and then `popd` on the next line says `directory stack empty`, and `dirs` starts over, as the stack isn't carried; carry it, including through a restarted worker. `false | true` and then `echo ${PIPESTATUS[@]}` on the next line prints `0`, where an interactive bash prints `1 0`. `export -f f` gives `` `-f': not a valid identifier ``, so a function can't be exported. `break` and `continue` outside a loop say nothing, where bash says ``only meaningful in a `for', `while', or `until' loop``. `return` outside a function gives status 1 (bash 2). `shift 5` prints an error bash doesn't print. `[ a` and `printf '%d\n' x` lack the `bash: ` prefix, and `test 1 -lt x` prints no error at all (bash: `integer expected`). `echo ~+` isn't expanded. `set -o` prints spaces where bash prints a tab, and calls `braceexpand` off though braces expand. Add what bash's output can be compared on to T158's parity list. Record any that just-bash 3.6.0 can't do in research R25's gaps and mark this task BLOCKED for the owner for those.
  - Done 2026-10-31, in T158's list. Gaps left in research G24: `break` in a function called outside a loop, and these in `eval` text.
- [X] T306 Word a standard command's wrong use as GNU does, in `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-017 (partial). Missing: the `Try 'x --help' for more information.` line on `cp`, `mv`, `rm`, `mkdir`, `touch`, `cut`, `tr`, `seq`, `basename`, `dirname`, `cat --bad`, `date --bad`. Different: `grep` alone says `missing pattern` (GNU's usage lines); `cp a` and `mv` name the wrong operand; `diff a` and `diff nope a`; `sort nope` (`sort: cannot read: nope: …`, status 2); `find nope` and `mkdir nope/x` quote the path otherwise than GNU in UTF-8; `xargs nope` and `env nope` give `bash: nope: command not found` with the wrong status. `ls --bad` gives status 1 (GNU 2); `pwd --bad` prints the folder with status 0 (bash an error and 2); `history --bad` gives the usage reply where FR-017 asks bash's error for a standard command's wrong option. Leave alone what FR-048 sets as site text, and decide `ls nope` against it: FR-048 words the reply, so record in research which wins. Add the rest to T158's parity list.
  - Done 2026-10-31: `ls nope` stays FR-048's (research R47). The rest in T158's list.
- [X] T307 Treat a character as whole in the cursors and the readline keys, in `packages/web/src/apps/terminal/CommandLine.tsx` (`parts`, `added`) and `packages/web/src/apps/terminal/VimView.tsx` (`tokenRuns`), per FR-018, FR-074 and FR-079 (partial). On the build, with `echo 😀 x` typed and the caret on the emoji, `.cursor-block` holds the lone surrogate `d83d`, so the line draws two broken glyphs; Ctrl+B and Ctrl+F on macOS step by UTF-16 unit, so into the pair; Ctrl+W and the rest must keep it whole too. In the vim view, `.vim-cursor` on an emoji holds `d83d` the same way, though T292 made the reducer's moves whole. Test on the build with an emoji in the command line and in a vim line, reading that the cursor's text is one whole character and the line's text is unchanged.
  - Done 2026-10-31: tested on the build for the command line and vim. Ctrl+B and Ctrl+F by code point; no macOS-key test was added for them.
- [X] T308 Drop the waiting lines when Ctrl+C is pressed, in `packages/web/src/apps/terminal/session.ts` (`cancel`), per FR-075 and User Story 5's scenario 10 (partial). On the build, with the shell's script held back, `echo queued-ran`, Enter and Ctrl+C show `^C` and then, once the shell is ready, the line runs and prints `queued-ran`, where the scenario says nothing more runs. The same goes for lines waiting behind a running one. Ctrl+C must drop every waiting line, showing each with `^C`, and they stay in the history, as a terminal's interrupt discards what's waiting. FR-070's order still holds for lines nobody cancelled. Test in `packages/web/test/terminal/stop.test.ts` and `packages/web/test/terminal/loading.test.ts`.
  - Done 2026-10-31: tested in `session.test.ts`, `stop.test.ts` and `loading.test.ts`.
- [X] T309 Tell a file of one blank line from an empty one in the vim view, in `packages/web/src/apps/terminal/engine/vim.ts` (`fileText`, `openVim`), `packages/web/src/apps/terminal/session.ts` (`lineCount`) and `packages/web/src/apps/terminal/shell/site-commands.ts` (`vim`), per FR-080 and FR-058 (partial). On the build, `echo > f; vim f` says `"f" 0 lines`, and `:w` says `0L, 0B written` and empties `f`, where vim says one line, and `:w` keeps its one byte. `x` on that line, by the same rule, must not count as deleting the only line. Deleting a buffer's only line with `dd` still writes an empty file, as vim does. Expected text from real vim, in `packages/web/test/terminal/engine/vim.test.ts` and at the session level.
  - Done 2026-10-31: `VimFile.blank` and a `NO_LINES` buffer; tested with vim's results and on the build.
- [X] T310 Keep what a stopped line did before it stopped, in `packages/web/src/apps/terminal/shell/adapter.ts` (`runLine`), per FR-067 and FR-021 (partial). `x=1; touch f; cd work; while :; do :; done` and then `echo "[$x]"; pwd; ls ~/f` prints `[]`, `/home/guest` and the file: the files stay and the variable and folder don't, where bash, stopped with Ctrl+C, keeps all three. For a stop at FR-069's limits, carry the state as far as the last point it can be read, as T286 does for lines that end early, without a checkpoint changing `$_` or `PIPESTATUS` (T299). A worker the page terminated can't answer (research R33, contracts/shell-worker.md), so leave that case as the contract says and record which lines it covers. Update research R33.
  - Done 2026-10-31: research R33 records the lines it doesn't cover. Every statement has a check now, 8 commands each, outside the visitor's 10,000.
- [X] T311 Open each `vim` of a line in turn, in `packages/web/src/apps/terminal/session.ts` (`finish`, `vim`), per FR-058 and FR-064 (partial). `vim a; vim b` and `for f in a b; do vim $f; done` open only the last, as each effect replaces the view before it; a `vim` from a line that was waiting replaces an open view the same way, changes included. Open the next when `:q` closes the one before, with what the line printed after it shown as the output is now. Decided for this unattended run, as a shell can't wait inside a line here: the line's other commands have already run by then, so say so in research R47. Test at the session level.
  - Done 2026-10-31: `vimQueue`; research R47.
- [X] T312 Keep the caret where a paste with line breaks leaves it, in `packages/web/src/apps/terminal/CommandLine.tsx` (`paste`), per FR-018 and FR-074 (partial). With `xy` typed and the caret after `x`, pasting `a` line break `b` makes the line `xa by`, with the field's caret at 5, the line's end, where it should be 4, before `y`, as React's controlled value moves it. Set the field's selection after the render, keep the mirror in step, and keep the system's undo if it can be kept. Test on the build in `packages/web/test/terminal/command-line.test.ts`.
  - Done 2026-10-31: the paste goes through the field's own editing, so undo works; tested on the build.
- [X] T313 Draw long plain output without holding up the page, in `packages/web/src/apps/terminal/Output.tsx` and `packages/web/src/apps/terminal/engine/output-map.ts`, per FR-069 and SC-002 (partial). Measured in Chromium at load 13, so take it again at low load first: `seq 150000`, 788,895 characters and under the output limit, gives one long task of 1,058 ms and 300,039 elements, and `seq 100000` 693 ms and 200,039, as each line of output is two elements. A line's plain stdout can be one text node that wraps and selects as now (FR-023). Keep FR-029's headings and lists where a block draws them. Record the measure before and after, and add one to `packages/web/test/terminal/performance.test.ts`. If it's under FR-069's second sentence at low load, say so here and close the task with no change.
  - Done 2026-10-31: at load about 2.5, `seq 150000` was 300,000 elements and a 919 ms task; now 2 elements and 161 ms. Over 1,000 lines a run is one text node. Test in `performance.test.ts`.
- Phase 37 result (2026-10-31): `typecheck`, `content-check` and `token-check` pass; the shell, engine, site-text, command-line, loading, stop, vim-edit and performance tests pass. The full `npm test`, `site-check` and CI have NOT run on this commit. The os script is 118,380 bytes against 119,260, after moving the words only the worker prints to `shell-text.ts`.

## Phase 38: Convergence

Found on `e6c4079`, where the full `npm test` (2,769 passed, 2 skipped) and `site-check` (14 of 14) pass, so none of this is covered by a test yet. Lines went through the real adapter and were compared with bash 5.3 and GNU tools, and on a build in Chromium at 1440 × 900 where a task says so. As in Phase 37, an option a command's own `--help` doesn't list isn't a gap under FR-068. The scripts are in `CV-worktrees/.scratch/006-converge4`: `diff.ts` runs each line in real bash on this machine, so give it no line that removes or moves anything or writes by an absolute path; `ours.ts` and `lim.ts` stay in memory. Tab's completer (92 lines) and vim's listed keys (239 random sequences against vim 9.1) showed no gap but T329's first item. Each fix adds its lines to T158's list where bash can run them, and a gap of just-bash's goes in research R25 and T129's reports. Words only the worker prints go in `shell-text.ts`, not `site-text.ts`, as the os script's budget is tight.

- [X] T314 Close the Terminal only for a line that really exits, in `packages/web/src/apps/terminal/shell/adapter.ts` (`runLine`, `limitOf`, `FATAL_MESSAGE`), per FR-021, FR-069 and FR-067 (contradicts). Confirmed on the build: `yes | grep -m1 y`, `printf "%99999999d" 1`, `echo {a..z}{a..z}{a..z}{a..z}{a..z}`, `a[1+]=1`, `f() { x=$(f); }; f` and `x=a; while :; do x=$x$x; done` each close the window and wipe the visitor's files, as any error the adapter doesn't recognize gets `end: 'exited'`; so do `yes | grep y | head -1` and `yes | xargs echo | head -1` in the adapter. T281 and T286 fixed this by listing messages, and the list keeps missing some. Turn the rule round: `exited` only when the line ran `exit` or `set -e` ended it, and every other unfinished line stays open with its state as far as the last check. A stop by one of just-bash's limits shows FR-069's text; `a[1+]=1` shows bash's error with status 1. Test each line above with a file made first, and that the file is still there.
  - Done 2026-10-31: `exit` says so first (`markExits`, and in `eval`, `source` and a name from an expansion), and errexit is read from the line's `set` commands and the last check. Anything else stays open, with the state as far as the last check. A subshell's or a pipe part's `exit` isn't marked. A limit's message never shows. Tests in `limits.test.ts`.
- [X] T315 Make FR-069's three limits the only ones a line meets, in `packages/web/src/apps/terminal/shell/adapter.ts` (`executionLimits`), per FR-069, FR-067, FR-068 and research R33 (contradicts). `echo {1..10001} | wc -w` prints `10000`, and `x=({1..20000}); echo ${#x[@]}` and `printf '%s\n' {1..12000} | wc -l` likewise, with no error: `maxBraceExpansionResults` cuts the list silently. `seq 150000 | awk 'END{print NR}'` says `awk: record limit exceeded (100000)`, `awk 'BEGIN{for(i=0;i<200000;i++)n++; print n}'` `awk: awk: for loop exceeded maximum iterations (100000)`, `seq 150000 | sed ':a;N;$!ba;s/\n/,/g'` `sed: sed: command execution exceeded maximum iterations (100000)`, and `jq -n '[limit(3;repeat(1))]'` and `jq -n 'first(range(10;infinite))'` `too many iterations` or `element limit exceeded`, where jq prints `[1,1,1]` and `10`. `jq -n 'def f: f; f'` says `jq: parse error: Maximum call stack size exceeded`. Raise `maxBraceExpansionResults`, `maxAwkIterations`, `maxSedIterations`, `maxJqIterations`, `maxArrayElements`, `maxStringLength` and awk's record limit as G15 did `maxLoopIterations`, leaving the 5 s deadline and the worker's 6 s guard to stop what never ends: `awk 'BEGIN{while(1);}'` and `sed ':a;ba'` must end in FR-069's time text with the page responding. No line may show just-bash's own words for a limit, such as `increase executionLimits`. An eager `jq` generator just-bash can't stop early goes in research R25 for T129.
  - Done 2026-10-31: `UNREACHED` in the adapter. The adapter expands a brace list past just-bash's caps up to FR-069's 1 MB, and past that stops with the output text. `maxJqIterations` stays at 10,000,000, so a `jq` generator that never ends stops fast with the time text: research G26 holds the ones bash would finish. `awk 'BEGIN{while(1);}'` and `sed ':a;ba'` never reach the shell's clock, so the worker's 6 s guard ends them (`stop.test.ts`).
- [X] T316 Quote the path a command control runs, in `packages/web/src/apps/terminal/shell/site-commands.ts` (`ls`, lines with `shownPath`, and the `isFolder` and `isFile` replies) and `packages/web/src/apps/terminal/engine/output-map.ts` (`tryLine`), per FR-050, FR-073, FR-015 and FR-018 (contradicts). Confirmed on the build: after `mkdir "my dir"`, the control `my dir/` runs `ls ~/my dir`, which fails on two paths, and `cat "my dir"` offers `ls my dir`. Worse, a click runs part of a file's name as a command: the control of a file named `q;touch pwned` creates `pwned`, and of one named `$(touch sub)` creates `sub`, so a name made with `touch` can run anything when clicked, against FR-018's "never run as anything". A control's line must quote its path as bash's `%q` or Tab's completion would, keep `~/` outside the quotes, and put `--` before a name starting with `-`. The built files' names need no quotes and must run what they run now (FR-050's tests). Test on the build with each of these names, and that what the control echoes is what runs.
  - Done 2026-10-31: `pathWord` and `pathLine` in `engine/block.ts`, the set of characters shared with Tab's. Tests in `site-commands.test.ts`, `replies.test.ts` and, on the build, `controls.test.ts`.
- [X] T317 Match only folders with a glob ending in `/`, and keep the slash, per FR-067 and FR-045 (contradicts), in `packages/web/src/apps/terminal/shell/adapter.ts` or `packages/web/src/apps/terminal/shell/fs.ts`. `echo */` lists every file and folder with no slashes, where bash gives `education/ projects/ specs/ work/`; `for d in */; do echo "$d"; done` and `ls -d */` run on files too; `ls -d w*/` and `echo ~/w*/` lose the slash; `echo work/*/`, with no folder inside, gives `work/sc-moredevs-srl` where bash keeps `work/*/`. If plain just-bash 3.6.0 does the same, add it to T129's reports.
  - Done 2026-10-31: `wrapSlashGlobs`. A `for` and a command's words are covered; `x=(*/)`, an array's own words, still reaches just-bash's glob. Each match costs a hidden command against the 10,000, listed in `handoff.md`.
- [X] T318 Make `grep`'s basic regular expressions GNU's, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `printf 'foo\n' | grep 'fo\+'` and `grep 'fo\?'` print nothing and `grep '\<b\>'` finds nothing, where GNU matches, though `\|` works; `grep '\(f\)o\1*'` and `grep -P '(?<=a)b'` say `invalid regular expression` where GNU runs them (`-P` is listed; back references and lookbehind may need just-bash, so if they can't be done, record them in research R25 and T129); `grep '\w\d'` matches `a1`, where GNU warns of a stray `\` and doesn't. `printf 'a\n' | grep -l a` prints `a`, GNU `(standard input)`. `grep a work` ends with status 1, GNU's 2. `grep '['` and `grep -E '('` must say GNU's `Invalid regular expression` and `Unmatched ( or \(`.
  - Done 2026-10-31: `translated` and `jsGrep` in `gnu.ts`. Back references and `-P` with `-r` still say invalid: research G30.
- [ ] T319 Fix `awk`'s language where it differs from GNU's, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `-v`, which `--help` lists, doesn't set `OFS`: `printf 'x y\n' | awk -v OFS=- '{print $1,$2}'` prints `x y`, and `awk -F: -v OFS=: '{ $2="c" } 1'` likewise. `{print length}` with no parentheses prints an empty line, GNU the length. An operand `OFS=-` after the program is read as a file. `RS` has no effect: `RS=";"` and `RS=""` (paragraphs). `BEGIN { getline; print }` reads nothing. `printf`: `%05.2f` and `%08.3f` lose the zeros, `%+.1f` the sign, `%e` prints `e+0` for `e+00`. `int(-1.5)` gives `-2`, GNU `-1`. `"3x"` as a number is `0`, GNU `3`. `"10"<"9"` compares as numbers, GNU as strings. A reference such as `a["x"]` must create the element. `CONVFMT` is ignored. `print 1e300*1e300` prints `Infinity`, GNU `+inf`. `print > "/dev/stderr"` and `> "/dev/stdout"` say `awk: Permission denied`. `print "b\na" | "sort"` is a parse error, though `"echo hi" | getline` works: run it as that does. A missing file ends with status 2, not 1. If a fix can't wrap just-bash's `awk`, add it to T129's reports and to research R25, with a BLOCKED note for the owner on FR-068.
  - Done in part 2026-10-31, `awk` in `gnu.ts`: `-v` and `NAME=value` for the built-in variables, bare `length`, `int`, `RS` as one character or paragraphs, a missing file's status and words, and the `awk: cmd. line:1:` form.
  - BLOCKED: `BEGIN { getline }`, `printf`'s `0` and `+` flags and exponents, string comparison of `"10"<"9"`, `a["x"]` creating its element, `CONVFMT`, `+inf`/`+nan`, `print > "/dev/stderr"` and `print | "sort"` are inside just-bash's `awk` and can't be wrapped (research G28, for T129's reports). The owner decides under FR-068: accept them, report them upstream, or replace `awk`.
- [ ] T320 Fix `sed` where it differs from GNU's in what its `--help` lists, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `sed -n 'H;${x;s/\n/,/g;p}'` loses the first `H`'s line break (GNU `,a,b,c`); `sed ':l;s/a/b/;T;bl'` loops until the iteration limit, as `T` with no label doesn't end the script; `sed 'a\x'`, `sed '1i\top'` and `sed '1c\new'` keep the backslash; `q5` and `Q5` say `command expected` where GNU exits with 5; `s/./&&/2g` ignores the `2`; `s/h/\U&/` and `\u` print the letters `U` and `u`; `--in-place=.bak` is refused, though `-i.bak` works; a missing file ends with status 2 and says `sed: can't read nope: No such file or directory`; `sed` alone gives GNU's usage; a bad script says `sed: -e expression #1, char N: …`.
  - Done in part 2026-10-31, `sed` in `gnu.ts`: `T` (labelled too, as just-bash's never fires), one-line `a\`, `i\` and `c\`, `q5` and `Q5` where the script is that command alone, `--in-place=`, `can't read` with status 2, and the words of an unterminated `s` or `y`.
  - BLOCKED: `H`'s first line break, `s/./&&/2g`, `\U`, `\u` and `\E`, other bad scripts' words and `sed`'s whole usage are inside just-bash's `sed` (research G29, for T129's reports). The owner decides under FR-068.
- [X] T321 Make `date -d` read what GNU reads, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). In any zone east of Greenwich `date -u -d '15 Jan 2020' +%F`, `'2020/01/15'`, `'01/15/2020'`, `'Jan 15'` and `'jan 5 2021'` are a day early, as they're read in the browser's zone and printed in UTC, which T302's fix for ISO dates didn't reach. `date -d '2020-02-30'` prints 1 March, and `date foo` prints the time with status 0: both must say `date: invalid date ‘…’` with status 1, as `date -d nonsense` must with GNU's quotes. `'2020-01-01 +1 day'`, `'1 day ago'`, `'next monday'`, `'12:00'` and `@1.5` are refused. A format's flags aren't read: `date '+%-d %_d %02d %^a %#a %10Y'` prints the text as given and nothing else. A test holds with `TZ` set to a zone each side of Greenwich.
  - Done 2026-10-31: `readDate` and `dateFormat` in `gnu.ts`. Every date is read in UTC, the zone `date` prints, and reaches just-bash as `@seconds`. Tests each side of Greenwich in `standard.test.ts`, the parity lines with `date -u`.
- [X] T322 Fix the other standard commands' listed options that differ from GNU, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `printf 'a\n' | wc` prints `1 1 2`, GNU `      1       1       2`, with `wc -` too. `uniq i o` doesn't write its OUTPUT. `cut -d: -f3,1` prints `c:a`, GNU in the line's order `a:c`; `cut -d::` must refuse. `xargs` doesn't read quotes or backslashes (`"a b" c`, `a\ b`, an unmatched `'`), `xargs -I %` splits at spaces where GNU takes the whole line, and a failing command ends with 123, not 1. `seq 3.5` prints `1.0 2.0 3.0`, GNU `1 2 3`; `seq 1 2 3 4`, `seq a` and `seq 1 0 1` need GNU's messages and quotes; `--separator=` and `--equal-width` are GNU's forms of the listed `-s` and `-w`. `head -c-3` and `tail -c +3` give the wrong byte count. `tr -d '[:vowel:]'` must refuse a class it doesn't know; `tr a-c '[x*]'` must repeat `x`. `find -size -1k` must round up as GNU does (0 of these files), `find work/ -maxdepth 0` keeps the slash, and `find -delete`'s refusal must read `find: cannot delete ‘./about’: Permission denied`. `basename /` and `dirname /` give `/`, and `basename a b c` refuses. `diff --version`, which its help lists, says `missing operand`; `diff d d` on a folder and `diff <(echo a) <(echo a)` say `No such file or directory`, though `grep`, `wc` and `sed` read the same `<(…)` paths. `mv a a`, `cp a a` and `cp a b nope` need GNU's words. `sort -k` alone must say `option requires an argument`.
  - Done 2026-10-31 in `gnu.ts`, each with a parity line. `find -size -Nk` under 4 KB leaves folders out, as GNU's are 4096 bytes. `find about -delete` keeps FR-049's refusal, where a real writable folder would delete it.
- [X] T323 Close the shell language's remaining gaps with bash, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 and SC-014 (partial). `x=1 echo $x` prints `1`, bash an empty line, as the word is expanded before the assignment applies. `$((…))` is a double, not 64 bits: `$((2**53+1))` and `$((9007199254740993))` are off by one, `$((2**64))` prints `18446744073709552000`, bash `0`, and `$((1<<100))` `16`, bash `68719476736`; if the parser hands over a number already rounded, add it to T129's reports. `f() { :; }; declare -f f` prints nothing, bash the body. `$((` runs `0` as a command; it's a syntax error. `echo a | cat /dev/stdin` and `cat /dev/stdin <<< s` print nothing. `cat /dev/zero | head -c 3 | wc -c` gives `0`, and `/dev/urandom` doesn't exist. `exec < x; read l` reads nothing. `unset HOME; echo ~` gives `/home/user`, not `/home/guest`. `${x~}` is a bad substitution. `command -v ls nope` ends with 1 where bash 5.3 gives 0. `shopt -s nocaseglob` has no effect, and `shopt` lists only some of its names.
  - Done 2026-10-31 in `adapter.ts` and `fs.ts`, but for `exec < x; read l` and `$((x+1))` past 2^53 from a variable, which just-bash can't do and which go to T129 (research G27). `$((…))` of numbers alone is worked in 64 bits and shows as its value in `type f`, as a long brace list does. `/dev/zero` and `/dev/urandom` hold 1 MB, so `cat /dev/zero` meets the output limit.
- [X] T324 Word a syntax error as bash does, in `packages/web/src/apps/terminal/shell/adapter.ts` (`parseMessage`), per the spec's edge case on syntax it can't parse, FR-017 and FR-067 (partial). These show just-bash's parser: `echo >`, `echo a 2>`, `cat <`, `<<<`, `>&`, `&>` and the rest say `Expected redirection target`, `cat <<` `Expected here-document delimiter`, `[[` `Expected conditional expression`, `function` `Expected function name`, `for` `Expected variable name in for loop` and `case` `Expected word after 'case'`, where bash says `syntax error near unexpected token `newline'`. `if true`, `for i in; do` and the like need `syntax error: unexpected end of file from `if' command on line 1`, as bash 5.3 words it. Compare the list in `lim.txt` and `l.txt` with bash 5.3, without the `line 1` prefix and the echo of the line, which an interactive bash doesn't print (SC-014).
  - Done 2026-10-31: `parseMessage`, `openConstruct` and the checks in `runLine`, compared with bash 5.3 (`syn.txt` in the scratch folder). `ls |` now says bash's `unexpected end of file`, and the tests that held the old words changed with it.
- [X] T325 Don't count what a pipe holds as printed, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-069 and research R33 (partial). `yes | head -1` works, but `echo a; yes | head -1; echo b` and `yes | head -1; yes | head -1` stop at the output limit, printing 2 to 6 bytes; `seq 1000000 | head -1` and `seq 1000000 | wc -l` stop there too, as `LIMITS.pipe` is 4 MB and bash prints `1` and `1000000`. Find how `yes` meets the limit when a statement stands beside it and fix that; raise `LIMITS.pipe` if `yes | head -1` still meets SC-002, and otherwise record `seq 1000000 | wc -l` in `handoff.md` for the owner, as FR-069 limits only what's printed. And `echo a; yes` shows nothing of `a`, where R33's first paragraph and G14 say the stopped line follows what earlier commands printed: keep the text of statements finished before the limit, when it's under it.
  - Done 2026-10-31: `LIMITS.pipe` is 32 MB, as just-bash counts every byte a line's pipes pass, and `yes` is the adapter's, printing what the output limit lets through. Measured in Node at load 8: `yes | head -1` 31 to 38 ms, within SC-002; `seq 1000000 | wc -l` 456 to 689 ms and `seq 1000000 | head -1` 336 to 675 ms, over SC-002's 100 ms, as they pass 7 MB. A check prints a mark between statements, so a stopped line shows the text before the last one; with `exec` on the line it doesn't, as the mark would go wherever `exec` sent the output. `yes | wc -l` counts what `yes` printed, as G13 has it.
- [X] T326 Keep the adapter's words out of a line that closes its output, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 and research R27 (contradicts). `exec > f; echo a; exec 1>&-; echo b` prints `bash: dirs: write error: Bad file descriptor` and `bash: declare: write error: Bad file descriptor`, from the hidden checks T310 added, where bash prints only `echo`'s line. Checks must run with their own output, and their failure must leave the line's state as it was at the last good one.
  - Done 2026-10-31: the check's listings go by their own redirects to `CHECK_FILE`, which `fs.ts` keeps apart. It also fixes `exec > f` writing them into `f`.
- [X] T327 Draw `ls`'s names as controls with its other options, in `packages/web/src/apps/terminal/shell/site-commands.ts` (`ls`), per FR-050, FR-015 and `contracts/commands.md` (partial). On the build `ls` and `ls -l` have controls, but `ls -a`, `ls -F`, `ls -1`, `ls -R work`, `ls -d ../about` and `ls work about` show plain text, where the contract says the names are controls whenever `ls`'s output reaches the screen unchanged. Cover every option `ls --help` lists, a name of `-R`'s and of several paths included, with each path from the home folder; `.` and `..` may stay text. Keep GNU's text and order for each.
  - Done 2026-10-31: `ls` in `site-commands.ts` draws each line of any option's text, with sections for `-R` and several paths; plain `ls` keeps its columns. With other options a name's label is GNU's text, so `ls -F` has the `/` and `ls -1` doesn't; `ls -l`'s folders end in `/` as before. Tests in `site-commands.test.ts`.
- [X] T328 Word the remaining wrong uses as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-017 (partial). `head nope` and `tail nope` need `cannot open 'nope' for reading: No such file or directory`; `head -n x` and `tail -n x` `invalid number of lines: ‘x’`; `cut -f` alone `option requires an argument -- 'f'`; `tr a` `missing operand after ‘a’` with its second line; `awk` alone and `awk 'BEGIN {'` GNU's usage and `awk: cmd. line:1:` forms; `find . -bogus` ``unknown predicate `-bogus'``. `seq`, `tr`, `cut` and `date` use GNU's `‘…’` quotes.
  - Done 2026-10-31 in `gnu.ts`, with T322's. `awk` and `sed` alone give their usage's first lines, not the whole text (research G28, G29).
- [X] T329 Tidy the small differences left, per FR-076, FR-068 and FR-049 (partial). In `packages/web/src/apps/terminal/shell/complete.ts`, `FOO=cv` completes to `FOO=cv ` as the `cv` command, where bash's readline gives `FOO=cv.json ` (add it to SC-017's list). In `packages/web/src/apps/terminal/shell/site-commands.ts`, `ls -l about` pads the size to 5 columns, so `ls -l f | cut -d' ' -f5` is empty: GNU's columns are as wide as the listing's widest, and a folder shows a size of 0 and one link where GNU's would differ, and `ls -la`'s `.` line shows `Jan  1 00:00` beside today's. `ls --color=auto`, which many bash users alias, is refused, though FR-068 asks `ls` for bash's common options: take `--color`, `-p`, `-C` and `-m` and list them in `ls --help`.
  - Done 2026-10-31: `FOO=cv` is in SC-017's list. `ls -l`'s columns are per section as wide as the widest; a folder shows 4096 and 2 plus its subfolders' links; `.` and `..` show the section's newest date. `--color`, `-p`, `-C` and `-m` are in `ls --help`.
- Phase 38 result (2026-10-31): `npm test` 2,911 passed, 2 skipped, 3 failed, those 3 `tools/site-check` tests timing out at load about 20 and passing alone (106 of 106); `site-check` 14 of 14, and `content-check`, `token-check` and `traceability` pass, on the code committed here. CI hasn't run. T319 and T320 stay open, BLOCKED on the owner under FR-068. New for T129's reports: research G25 to G30.

## Phase 39: Convergence

Found on `e08de21`. Lines went through the real adapter and were compared with bash 5.3 and GNU tools, none of this on a build. As in Phases 37 and 38, an option a command's own `--help` doesn't list isn't a gap under FR-068, and neither is a command or word FR-067, FR-068 and research R32 leave out. The scripts are in `CV-worktrees/.scratch/006-converge5`: `diff.ts` runs each line in real bash on this machine, so give it no line that removes or moves anything or writes by an absolute path; `ours.ts` stays in memory.

- [X] T330 Refuse `rm -f` on a protected file, in `packages/web/src/apps/terminal/shell/site-commands.ts` (`rm`), per FR-049 and the edge case "A command that would change the protected files" (contradicts). `rm -f about`, `rm -fv about` and `rm -f ~/about work/sc-moredevs-srl` print nothing with status 0 and the files stay, where `rm about` and `rm -rf about` give `rm: cannot remove 'about': Permission denied`, status 1. `-f` silences a missing file only: `rm -f nope` and `rm -f work/nope` stay silent with status 0. In `rm -f mine about`, `mine` still goes.
  - Done 2026-10-31. `rm -f` now drops only what's missing and runs just-bash's `rm` on the rest.
- [X] T331 Make `diff` read two process substitutions, in `packages/web/src/apps/terminal/shell/gnu.ts` or `packages/web/src/apps/terminal/shell/site-commands.ts`, per FR-068 and SC-014 (contradicts). `diff <(echo a) <(echo b)` prints nothing with status 0, so two different inputs are reported as the same; `diff -u <(echo a) <(echo b) | wc -l` gives 0, GNU 5, and `diff <(cat f) <(cat about)` also gives no difference. One substitution beside a file works (`diff f <(echo b)`), and so does `cat <(echo a) <(echo b)`. Add the lines to T158's list; if the cause is in just-bash, add it to T129's reports.
  - Done 2026-10-31. The cause was the adapter's own shortcut: two `ctx.exec` reads of the substitutions came back alike. Removed; just-bash's `diff` reads both.
- [X] T332 Let commands write to `/dev/stdout`, `/dev/stderr` and `/dev/fd/N`, in `packages/web/src/apps/terminal/shell/fs.ts`, per FR-068, FR-067 and SC-014 (contradicts). `echo a > /dev/stdout` works, but `echo a | tee /dev/stdout` and `tee /dev/stderr` say `tee: /dev/stdout: Permission denied` with status 1, `sort -o /dev/stdout` says `sort: Permission denied`, `cp about /dev/stdout` refuses, `sed 'w /dev/stdout'` drops the copy in silence, `echo a > /dev/fd/1` and `> /dev/fd/2` say `Permission denied`, and `cat /dev/fd/0 < about` says no such file. FR-049 protects none of these. The output must follow the line's redirects and count toward FR-069's 1 MB.
  - Done 2026-10-31. `TerminalFs` keeps what a command writes to these names, and the fix around the command adds it to its output, so it follows the line's redirects and counts toward the limit. `sed`'s `w /dev/stdout` becomes `p`, so it keeps its place among the lines. `> /dev/fd/1` becomes `> /dev/stdout`.
- [X] T333 Make `grep`'s listed options GNU's, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). An option that takes a value is refused in a bundle: `grep -nA1 x`, `-iA1`, `-nB1`, `-nC1`, `-cm1` and `-ie x` say `invalid option`. `-m0` prints every match with status 0, GNU nothing with status 1; `printf 'x\nx\n' | grep -c -m1 x` gives 2, GNU 1. `grep -rn a g1`, with one file, adds the name, GNU `1:a`. `grep -m x a about` and `grep -A x a about` ignore the bad number, GNU `grep: invalid max count` and `grep: x: invalid context length argument`, status 2. `grep -m`, `-A` and `-f` alone need `grep: option requires an argument -- 'm'` before the usage, and `grep --include` alone `grep: option '--include' requires an argument`.
  - Done 2026-10-31. `grepOptions` splits bundles, `-NUM` included.
- [X] T334 Make `sort`'s listed options GNU's, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `printf '1\n1.0\n' | sort -nu` keeps both lines, GNU `1`; `printf 'A\na\n' | sort -fu` gives `a`, GNU `A`. Bad keys run with status 0 where GNU refuses with status 2: `sort -k0` (`field number is zero: invalid field specification ‘0’`), `sort -k1.0` (`character offset is zero: invalid field specification ‘1.0’`), `sort -k x` (`invalid number at field start: invalid count at start of ‘x’`) and `sort -t ab` (`multi-character tab ‘ab’`). `sort -c -o x` needs `sort: options '-co' are incompatible`, status 2.
  - Done 2026-10-31. `-u` with `-n` or `-f` only without `-k` or `-o`; with those it stays just-bash's.
- [X] T335 Make `find`'s listed actions and tests GNU's, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `find . -name about -exec echo a{}b \;` prints `a{}b`, GNU `a./aboutb`, and `{}{}` likewise. `-exec false \;` ends with status 1, GNU 0. `-exec nope \;` says `bash: nope: command not found` with status 127, GNU `find: ‘nope’: No such file or directory`, status 0 for `\;` and 1 for `{} +`. `find . -newer nope` prints nothing with status 0, GNU `find: ‘nope’: No such file or directory`, status 1. `find . -size x` needs ``find: invalid -size type `x'``, `find . -perm x` `find: invalid file mode ‘x’`, and `find . -a -name about` GNU's whole sentence, ending `you have used a binary operator '-a' with nothing before it.`
  - Done 2026-10-31. `-exec … \;` as the last action runs through `findExec`; with another action before it, only the status and the wording change, not `{}` inside a word.
- [X] T336 Stop `type` and Tab's words from naming what doesn't run, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/shell/standard.ts`, per FR-067, FR-068, FR-076 and research R32 (contradicts). `type` says `trap is a shell builtin`, and likewise for `alias`, `unalias`, `jobs`, `fg`, `bg`, `kill`, `disown`, `times`, `enable`, `caller`, `suspend`, `umask` and `ulimit`, while each says `bash: trap: command not found` and R32 leaves `alias` and `unalias` out. Make `type`, `type -t`, `command -v` and `command -V` agree with what runs, and test every name both ways, where today's test only checks `SHELL_BUILTINS` from one side. `SHELL_KEYWORDS` holds `select` as a word just-bash parses, but `select x in a; do break; done` is a syntax error, while `type select` says it's a keyword and Tab completes it: run it if just-bash can, and otherwise take it out of the table, `type` and FR-076's list in `completion-parity.test.ts`, recording why in research R43.
  - Done 2026-10-31. `compopt` runs, so `type` is right about it; it isn't in `NAMED_NOT_RUN`. `select` and `coproc` went from the words (research R43, G32).
- [X] T337 List variables as bash does, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 and FR-068 (contradicts). `declare -x` lists every variable as `NAME=value`, starting `?=0`, where bash lists the exported ones as `declare -x HOME="/home/guest"`. `declare` and `declare -p` start with `?=0` and `declare -- ?="0"`, and `env` lists `?=0`: `?` isn't a variable, which FR-068's allowance for `env` doesn't cover. `export d` with no value sets it, so `echo "[${d+set}]"` prints `[set]` and `declare -p d` `declare -x d=""`, where bash prints `[]` and `declare -x d`. `declare -i i; i=1+; echo $?` prints `0` with no error, bash `bash: 1+: arithmetic syntax error: operand expected (error token is "+")`, status 1.
  - Done 2026-10-31. Research G33: a `declare -i i` with no value isn't carried to a later line.
- [X] T338 Keep JavaScript's errors out of `xargs`, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-017, FR-068 and SC-014 (contradicts). `xargs -n` says `xargs: Cannot read properties of undefined (reading 'replaceAll')`, and `xargs -d` and `-P` likewise; GNU `xargs: option requires an argument -- 'n'` and `Try 'xargs --help' for more information.`, status 1. `xargs -I` alone says `invalid option -- 'I'`. `xargs -n x` needs `xargs: invalid number "x" for -n option` and `-P x` the same with status 1, not 123, and `-n 2 -I{}` GNU's warning that the two options are mutually exclusive. Add a test that no standard command's wrong use prints a JavaScript error's words.
- [X] T339 Word the remaining missing and bad arguments as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-017, FR-068 and SC-014 (partial). `head -n`, `tail -c`, `seq -s`, `basename -s`, `awk -F`, `awk -v`, `sed -e` and `sed -f` need `<command>: option requires an argument -- '<letter>'` (`awk`'s letter has no quotes) with the second line GNU prints. `env -u` lists the environment with status 0, GNU refuses with status 125. `date -d` prints today's midnight with status 0, GNU refuses with status 1; `date a b` needs `date: extra operand ‘b’`; `date -u +` prints the date, GNU an empty line. `sed -f nope about` says `sed: can't read couldn't open file nope: No such file or directory`, status 2, GNU `sed: couldn't open file nope: No such file or directory`, status 4. `ls --color=bad` lists the folder with status 0, GNU `ls: invalid argument ‘bad’ for ‘--color’`, status 1. `touch -d nonsense` needs `‘nonsense’` in GNU's quotes.
  - Done 2026-10-31. `awk` and `sed` print their usage's first lines, as they do alone (handoff).
- [X] T340 Make `tree`'s listed options match `tree`'s, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 (partial). `tree -f` prints `/home/guest/about`, and `tree -f work` `/home/guest/work/sc-moredevs-srl`, where `tree` prefixes the path as given, `./about` and `work/sc-moredevs-srl`. `tree -L x` lists everything with status 0 and `tree -L 0` nothing but the summary, where `tree` says `tree: Invalid level, must be greater than 0.` `tree` isn't installed on this machine, so these expected results come from `tree`'s known behavior: install it and confirm them first.
  - Done 2026-10-31. `tree` 2.3.2 installed with Homebrew: the expected results hold. `tree -L` alone says `tree: Missing argument to -L option.`. Left as they are: its ASCII lines and that it doesn't count the root folder.
- [X] T341 Close the builtins' remaining gaps with bash, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067, FR-017 and research R27 (partial). `[ a b ]`, `[ a = ]` and `[ 1 -lt ]` print nothing with status 1, bash `bash: [: a: unary operator expected` for the first and status 2 for all three (`test` likewise). `set -z` prints just-bash's whole usage with status 1, bash `bash: set: -z: invalid option` and one usage line, status 2; `set -o nope` has status 1, bash 2. `shopt nope` lacks `bash: `. `echo ${}` prints an empty line with status 0, bash `bash: ${}: bad substitution`, status 1; `echo ${a!}` has status 2, bash 1. `x=(1; echo $?` has status 2, bash 1. `let 'x=(1'` shows `Parse error at 1:11: Expected DPAREN_END, got EOF`, and `echo $((a b))` has no `bash: ` and bash 5.3's words: `bash: a b: arithmetic syntax error in expression (error token is "b")`. `((1+))`, `let '1+'` and `x[1+]=1` need bash 5.3's `arithmetic syntax error`. With `shopt -s failglob`, `echo zzz*; echo $?` must stop the line after its message. `shopt`'s table pads the name as bash does.
  - Done 2026-10-31. `${}` runs nothing of its line, where bash runs what comes before it.
- [X] T342 Finish syntax errors as bash reports them, in `packages/web/src/apps/terminal/shell/adapter.ts` (`parseMessage`, `openConstruct`), per the edge case on syntax it can't parse, FR-017 and FR-067 (partial). `echo a &; echo b` runs both, bash ``syntax error near unexpected token `;'``, status 2. T324's end-of-file words stand where bash names a token: `echo a && ;`, `a |;`, `(;`, `{ echo a; ;`, `if;`, `case x in;` and `f() ;` near `;`, and `for x in a; echo $?` near `echo`. `[[ ;`, `[[ a;`, `[[ a == ;` and `[[ a -eq ]]` must name what's there, as ``unexpected token `;' in conditional command``, not `newline`. `echo ${a; echo $?` needs ``unexpected EOF while looking for matching `}'``. `syn.txt` in `006-converge4` and `f.txt` in `006-converge5` hold the lines to compare.
- [X] T343 Replace the shell on `exec` with a command, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 and FR-021 (contradicts). `exec ls; echo after` and `exec echo a; echo after` print `after`, where bash never reaches it: the command's output shows, then the Terminal closes as for `exit`, with the command's status (T314's `markExits`). `exec nope; echo $?` keeps going, as an interactive bash does, but must say `bash: exec: nope: not found`. `exec` with only redirects stays as it is.
  - Done 2026-10-31. `exec` of a builtin, `cd` or `exit`, is `not found` as there's no such file; `exec help` runs the site's.
- [ ] T344 Give `shopt -s extglob` its meaning, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 and FR-045 (partial). With `shopt -s extglob` on an earlier line, `echo @(about|skills)`, `echo !(about)` and `echo +(a)bout ?(x)about *(z)about` say ``syntax error near unexpected token `('``, where bash prints `about skills`, ten names and `about about about`. Without it, `case a in @(a|b)) echo y;; esac` prints nothing, `${x/@(a|b)/z}` leaves `a` and `ls @(about|skills)` looks for that literal name; compare each with bash, on both sides of the `shopt` line. `[[ a == @(a|b) ]]` already works. If just-bash's parser can't do it, make `shopt -s extglob` say so rather than succeed, record it in research R27 and add it to T129's reports, and leave the task BLOCKED for the owner under FR-067.
  - BLOCKED: done in part. `@`, `+`, `?` and `*` patterns work with `extglob` on, and without it are syntax errors outside `[[ ]]`, as in bash. `!(…)` needs a lookahead just-bash's RE2 doesn't have (research G31), so the Terminal says it isn't supported and runs nothing of that line. FR-067 doesn't allow that: the owner accepts it, reports it upstream (T129) or replaces the glob matching.
- [X] T345 Tidy the small differences left, per FR-068, FR-067 and FR-074 (partial). In `packages/web/src/apps/terminal/shell/gnu.ts`: `diff -s a1 a1` and `diff --report-identical-files a1 a1` print nothing, GNU `Files a1 and a1 are identical`, though two different files work; `diff work about` says `diff: work: No such file or directory`, as GNU compares `work/about` it names that path. `awk '{print FILENAME}' < a1` prints an empty line, gawk here `-`: if a wrapper can't reach it, add it to research G28. In `packages/web/src/apps/terminal/shell/adapter.ts`: `$BASH_SUBSHELL` and `$SHLVL` are empty, bash `0` in the Terminal's shell and `1` in `(…)`, and `1`. In `packages/web/test/terminal/line-keys.test.ts`: add the emoji case for Ctrl+B and Ctrl+F on macOS, which T307 fixed with no test.
  - Done 2026-10-31. gawk's `-` is a first rule on the program, so `BEGIN` still reads an empty name.

- Phase 39 result (2026-10-31): on `1eb73f5`, `npm test` 3,882 passed, 2 skipped, none failed, with GNU tools first on PATH; `site-check` 14 of 14. T344 is BLOCKED in part (research G31). Not pushed, so CI hasn't run on it.

## Phase 40: Convergence

Found on `fa5ce7f`. Lines went through the real adapter and were compared with bash 5.3 and GNU tools, and key sequences through the view's reducer were compared with vim 9.1, none of this on a build. As in Phases 37 to 39, an option a command's own `--help` doesn't list isn't a gap under FR-068, and neither is a command or word FR-067, FR-068 and research R32 leave out, or a vim key FR-060 and FR-079 don't name. The scripts are in `CV-worktrees/.scratch/006-converge6`: `diff.ts` runs each line in real bash on this machine, so give it no destructive line, and `vimdiff.ts` runs vim on a scratch file. `ours.ts` stays in memory. Each task adds its lines to `bash-parity.test.ts` where real bash can run them. A task whose fix can't wrap just-bash adds the rest to T129's reports and to research R25, with a BLOCKED note for the owner under FR-067 or FR-068.

- [X] T346 Stop refusing an empty array, in `packages/web/src/apps/terminal/shell/adapter.ts` (`STRAY_SEMICOLON`), per FR-067 and the edge case on syntax it can't parse (contradicts). `a=(); echo ok`, `a=( ); echo ${#a[@]}`, `declare -a c=(); echo x`, `a=(1 2); a=(); echo done` and `f() { local a=(); echo ${#a[@]}; }; f` say ``syntax error near unexpected token `;'``, status 2, and run nothing; bash prints `ok`, `0`, `x`, `done` and `0`. The pattern's `\(\s*\)` alternative, meant for `f();`, takes the `()` of an assignment. `f();` stays a syntax error.
- [X] T347 Keep just-bash's internal error out of a line whose command both prints and fails, in `packages/web/src/apps/terminal/shell/gnu.ts` and `packages/web/src/apps/terminal/shell/site-commands.ts`, per FR-067, FR-017 and SC-014 (contradicts). `cat about nope 2>/dev/null; echo after`, `cat nope about 2>/dev/null | wc -l`, `cat about nope 2>e | wc -l`, `tee nope/x < about`, `tee nope/x < about | wc -l`, `tee o nope/x < about | wc -l` and `tee about < skills | wc -l` say `bash: redirection: invalid stdout accounting`, status 126, and drop the whole line, `echo after` too. Bash prints the file's text or `4`, then what follows, with `cat`'s or `tee`'s own error and status 1. Test the other commands wrapped in `gnu.ts` with a redirect in the same way, so none can throw this.
  - Done 2026-10-31. Output that isn't valid UTF-8 loses those bytes when the same command also wrote to stderr (research G34).
- [X] T348 Make functions run from a command substitution in arithmetic, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (contradicts). `f() { echo 3; }; echo $(( $(f) + 1 ))` says `bash: f: command not found` and prints `1`, bash `4`; `(( $(f) == 3 ))`, `y=$(( $(f) ))` and `a[$(f)]=1` fail alike, on one line or across lines, though `echo $(f)`, `x=$(f)` and `[ $(f) = 3 ]` work. So the usual recursion is wrong: `fact() { [ $1 -le 1 ] && echo 1 && return; echo $(( $1 * $(fact $(( $1 - 1 ))) )); }; fact 5` prints `0`, bash `120`, and `fib 6` written the same way `0`, bash `8`.
  - Done 2026-10-31. Each `$(…)` runs before its command and costs 3 more of the 10,000. Text only `eval` or `source` reads, and a C-style `for`'s condition and step, keep just-bash's behaviour (research G35).
- [X] T349 Sort in the order bash gives with the parity test's `LC_ALL=C.UTF-8`, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `printf 'b\nB\na\nA\n_\n1\n' | sort` gives `_ 1 a A b B`, bash `1 A B _ a b`, and `sort -r` is off the same way; `printf 'x_y\nxa\nxB\n' | sort` gives `x_y xa xB`, bash `xB x_y xa`. On the CV's own file, `sort -r skills | head -1` starts `React Native`, bash `React ·`, and `sort -k2 skills | head -1` starts `GCP`, bash `- Agentic Engineering`. Globs and Tab (research R43) already use this order. `-f`, `-d` and the other listed options keep their meanings over it.
- [X] T350 Accept options bundled with one that takes a value, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). T333 did this for `grep` only. These are refused or misread, though `--help` lists each option: `sort -nk2`, `-rnk2`, `-rk2` and `-bk2` (`invalid option -- 'nk2'`); `head -qn1`, `-vn1` and `-vc1`; `tail -qn1` and `-vn1`; `xargs -tn1`, `-rn1` and `-0n1`; `seq -ws, 8 10` (`invalid floating point argument`); `cut -sd' ' -f1`; `sed -ne1p` and `sed -n -e1p` (`invalid option -- '1'`). `basename -as .t a.t b.t` prints `.t` and `a.t`, GNU `a` and `b`.
- [X] T351 Keep a command's output when another of its files is missing, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `cut -c1 about nope` and `cut -c1 nope about` print only the error with status 1, GNU `A`, `S`, `T`, `F` with the error and status 1. `sed -n 1p about nope` and `sed -n 1p nope about` print only the error with status 2, GNU `Alex Profir` with it. `awk 'NR==1' about nope` loses `Alex Profir`, and says `awk: fatal: cannot open file` where gawk says `awk: cmd. line:1: fatal: cannot open file`.
  - Done 2026-10-31. A file `awk` can't open also stops it with no `END`, as gawk does.
- [X] T352 Make `cut` GNU's on lines with no delimiter and on bad lists, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-017 and SC-014 (contradicts). `cut -f2 about | head -1` prints an empty line and `printf 'a b\nc\n' | cut -d' ' -f2` prints `b` and an empty line, where GNU prints a line with no delimiter whole unless `-s` is given: `Alex Profir`, and `b`, `c`. `cut -f0 about; echo $?` says `bash: cut: invalid range`, status 126, and drops the rest of the line, GNU `cut: fields are numbered from 1` with `Try 'cut --help' for more information.`, status 1. `cut -c0` (`byte/character positions are numbered from 1`), `cut -d ab -f1` (`the delimiter must be a single character`), `cut -f a` (`invalid field value ‘a’`) and `cut -c1 -f1` (`only one list may be specified`) need GNU's words and status 1 too.
- [X] T353 Make `grep -r` search the working folder and keep the path it was given, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `grep -r Alex` and `grep -rl Alex` read an empty input and end with status 1, GNU searches `.` and prints `about:Alex Profir` and the rest, status 0. `grep -r Alex .` prints `about:Alex Profir` and `grep -rl Alex .` prints `about`, and from `work`, `grep -rl Software .` prints `sc-moredevs-srl`, where GNU prints `./about:Alex Profir`, `./about` and `./sc-moredevs-srl`. `grep -rh` and a path that isn't `.` are right already.
- [X] T354 Count and write bytes, not text, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `uniq about o; wc -c o` gives 127, GNU 125: the output file is encoded twice, so `diff o about` shows `TimiÈoara`. `tail -c 110 about | head -1 | wc -c` gives 13, GNU 15. `tail -c +2 about | wc -c` and `head -c -1 about | wc -c` give 126, more than the file's 125 bytes, GNU 124, and `head -c -5 about | wc -c` gives 122, GNU 120.
- [X] T355 Open a line's redirects as bash does when a file is both read and written, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-067, FR-068 and SC-014 (contradicts). After `echo a > f`, `cat < f > f` and `sort < f > f` leave 2 bytes and `tee f < f | wc -c` prints 2, where bash empties the file first and they leave 0 bytes and print 0. `cat f >> f` and `cat < f >> f` double the file with status 0, GNU `cat: f: input file is output file` and `cat: -: input file is output file`, status 1, file unchanged; `cat f - >> f <<< b` keeps `a` and appends `b` once, with the same error for `f`. `grep a f >> f` doubles it with status 0, GNU `grep: f: input file is also the output`, status 2, file unchanged.
  - Done 2026-10-31. By the words as typed: `./f` counts as `f`, a path reached another way doesn't. `tee -a f < f` is left out, as GNU's runs until something stops it.
- [X] T356 Make `tr` GNU's on NUL, operands and multi-byte letters, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-017 and SC-014 (contradicts). `printf 'a\0b\0' | tr '\0' '\n'` and `tr '\000' '\n'` leave the NULs, and `tr -d '\0'` keeps them, so `find . -print0 | tr '\0' '\n' | wc -l` gives 14 where GNU gives 32. `tr a b about`, `tr a b c about`, `tr -d a b about` and `tr -s a b about` read an empty input and end with status 0, GNU `tr: extra operand ‘about’` (or `‘c’`, `‘b’`) with its second line, status 1. `tr z-a b` runs, GNU `tr: range-endpoints of 'z-a' are in reverse collating sequence order`, status 1. `sed -n 3p about | tr ș s` gives `Timisoara, Romania` and `echo 'é' | tr 'é' e` gives `e`, where GNU, working on bytes, gives `Timissoara, Romania` and `ee`.
- [X] T357 Keep the Terminal open on an `exit` bash refuses, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067, FR-017 and FR-021 (contradicts). `exit 1 2; echo $?` closes the Terminal with no message and `exit nope; echo not` closes it too, so the visitor's files are gone. An interactive bash 5.3 stays open: `bash: exit: too many arguments` and `bash: exit: nope: numeric argument required`, status 2, and the next command runs.
  - Done 2026-10-31. Differs from this task's words, by what an interactive bash 5.3 does: `exit 1 2` ends the line with status 1, so `echo $?` on the same line doesn't run. `exit nope` has status 2 and the next command runs. The Terminal stays open on both.
- [X] T358 Fix `awk`'s array lengths and `system`, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-017 and SC-014 (partial). `awk 'BEGIN{a[1]=1;a[2]=2;delete a[1];print length(a)}'` prints 0, gawk 1; `split("a b c",t);delete t[1];print length(t)` 0, gawk 2; `a["x"]=1;a["y"]=2;for(k in a)n++;delete a["x"];print length(a)` 0, gawk 1; `print length(ARGV)` 0, gawk 1. `system("echo sys")` says `system() is not supported - shell execution not allowed in sandboxed environment`, though `"echo hi" | getline` runs: run it as that does, printing what it prints and returning its status. `strftime` says `function 'strftime()' is not implemented`, and `asort` prints nothing where gawk returns the count.
  - Done 2026-10-31. `length` of an array passed as a function's parameter stays 0 (research G36).
- [X] T359 Finish `jq`'s listed output options, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-056 and SC-014 (partial). `jq -j .basics.name cv.json` prints `"Alex Profir"` with the quotes, jq `Alex Profir`. `jq -a -n '"é"'` prints `"é"`, jq `"é"`.
- [X] T360 Tidy the small differences left, per FR-067, FR-068, FR-060 and SC-014 (partial). In `packages/web/src/apps/terminal/shell/adapter.ts`: `shopt -s nocaseglob; echo z*` prints `[zZ]*`, bash `z*`; `k() [[ 1 == 1 ]]` and `k() (( 1 ))` are syntax errors, though the other compound bodies work; `set -u; echo $1` says `bash: 1: unbound variable`, bash `bash: $1: unbound variable`; `x=$(printf 'a\0b'); echo ${#x}` gives 3, bash 2 with `bash: warning: command substitution: ignored null byte in input`; `cat < work` and the same redirect on `wc`, `grep`, `read`, `sort` and `head` say `bash: work: No such file or directory`, though `work` exists, where bash opens it and each command gives its own `Is a directory` error and status. In `packages/web/src/apps/terminal/shell/gnu.ts`: `mkdir -pv x/y/z` prints only the last folder and `mkdir -pv a` on a folder that exists prints it again, GNU one line for each folder made and none for one that exists; `cp -rv work w` prints one line, GNU a line for the folder and one for each file; `cp -n f f` says `are the same file`, status 1, GNU nothing, status 0; `tree nope` says `tree: nope: No such file or directory`, status 1, and `tree about` prints `about`, where `tree` 2.3.2 prints `nope  [error opening dir]` with status 2 and `about  [error opening dir]` with status 0, each with its summary; `xargs -d, echo <<< a,b` drops the line the last item's newline makes; `wc < about` uses a width of 7 and `wc -l about -` a width of 3, GNU 3 and 7. In `packages/web/src/apps/terminal/engine/vim.ts`: a count of `w` past the file's last word, `20w`, stops at that word's start, vim at its last letter.
  - Done 2026-10-31. `< folder` gives the command's own error for a folder that holds something when the line starts. NULs in `$(…)` are dropped where its text shows `\0` or `-print0`.

- Phase 40 result (2026-10-31): `npm test` 4,095 passed, 2 skipped, none failed, with GNU tools first on PATH; `site-check` 14 of 14; `content-check`, `token-check` and `traceability` pass. Not pushed, so CI hasn't run on it. Research G34 to G36 are new for T129's reports.

## Phase 41: Convergence

Found on `ea29312`. Lines went through the real adapter and were compared with bash 5.3 and GNU tools, key sequences through the view's reducer were compared with vim 9.1, and Tab through a real bash on a terminal, none of this on a build. As in Phases 37 to 40, an option a command's own `--help` doesn't list isn't a gap under FR-068, and neither is a command or word FR-067, FR-068 and research R32 leave out, or a vim key FR-060 and FR-079 don't name. What T319 and T320 already hold isn't repeated. The scripts are in `CV-worktrees/.scratch/006-converge7`: `diff.ts` runs each line in real bash on this machine, so give it no destructive line, and `vimdiff.ts` runs vim on a scratch file. `ours.ts` stays in memory. Each task adds its lines to `bash-parity.test.ts` where real bash can run them. A task whose fix can't wrap just-bash adds the rest to T129's reports and to research R25, with a BLOCKED note for the owner under FR-067 or FR-068.

- [X] T361 Keep a double-quoted word that follows `"$name"`, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (contradicts). `x=a; echo "$x""y"` prints an empty line, bash `ay`; `echo "$HOME""y"` and `x=a; echo "a$x""y"` lose everything or the end, `echo "$x""y" z` prints ` z`, `printf '[%s]\n' "$x""y"` prints `[]`. It isn't only output: `touch "$x""f"` tries to touch an empty name, `case "$x""y" in y)` takes the wrong branch, `[ "$x""y" = y ]` is false and `for i in "$x""y"` gives an empty item. just-bash alone does this (`new Bash().exec`), so join neighbouring `DoubleQuoted` parts of a word in the parsed tree, as the adapter's other rewrites do, and add it to T129's reports and research R25 as a new G number. `"${x}""y"`, `"$x""$x"`, `"$x"'y'` and `y="$x""b"` are right already and stay so.
  - Done 2026-10-31. The tree can't do it: the parser has already read `"$x""y"` as `"$xy"`, so `keepNames` closes the name in the text first (research G37). A function's body lost `${x}y` on the next line for the same reason, now fixed by `closedNames`. `eval` and `source` text isn't covered, and `type f` shows `"$xy"` for `"${x}y"` (G10).
- [X] T362 Make `for` without `in` keep each positional parameter whole, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (contradicts). `set -- 'a b' c; for a; do echo [$a]; done`, the same with `for a do`, and `f() { for a; do echo [$a]; done; }; f 'x y' z` print three items, bash two: `[a b]`, `[c]`. `for a in "$@"` is right already.
- [X] T363 Use `find -exec … \;`'s status as its test, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `--help` lists `-exec` and `-print`. `find . -maxdepth 1 -type f -exec grep -q Alex {} \; -print` lists all seven files, GNU only `./about` and `./cv.json`. `find . -maxdepth 1 -name about -exec false \; -print` prints `./about` with status 1, GNU nothing with status 0. `-name about ! -exec false \; -print` prints nothing with status 1, GNU `./about` with status 0. `-name about -exec false \; -o -print` must list `./about` too, status 0. A command that fails under `-exec … \;` doesn't change `find`'s own status; under `-exec … +` it does.
- [X] T364 Read a file operand of `-` and leave a program's operands alone when it doesn't read them, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `head - < about`, `head -c 2 - < about`, `tail - < about` and `awk 'NR==1' - < about` say they can't open `-`, GNU reads standard input; `cut`, `sort`, `uniq`, `grep` and `sed` are right already. `awk 'BEGIN{print ARGC}' a b` says `cannot open file`, gawk `3`; `awk 'BEGIN{print ARGV[1]}' nope` gawk `nope`; `awk 'BEGIN{exit}' nope; echo $?` gawk `0`. A program with only `BEGIN` actions doesn't open its operands. `awk 'END{print NR}' nope` keeps its error.
- [X] T365 Treat a folder given as a file as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-068, FR-017 and SC-014 (contradicts). After `mkdir d`, these say or imply that `d` doesn't exist. `head d` and `tail d`: GNU `head: error reading 'd': Is a directory`, status 1, and `head d about` still prints `about` under its header with the `==> d <==` header too. `uniq d`: `uniq: error reading 'd': Is a directory`. `wc d`: GNU prints `      0       0       0 d` as well as `wc: d: Is a directory`, status 1, and `wc d about` counts that line in its widths and total. `sed 1p d`: `sed: read error on d: Is a directory`, status 4. `awk 1 d`: ``awk: warning: command line argument `d' is a directory: skipped``, status 0. `tee d < /dev/null` says nothing with status 0, GNU `tee: d: Is a directory`, status 1. `jq . d` says nothing with status 0, jq an error with status 2. `tr a b < d`: `tr: read error: Is a directory`, status 1. `cat < d`, `wc < d` and `read x < d`, when `d` was made on the same line or is empty, still say `No such file or directory`, which T360 fixed only for a folder holding something when the line starts. `diff` gets the same treatment in T366.
  - Done 2026-10-31. `jq . d` says `jq: error: Input error: Is a directory`, status 2: the jq on this machine gives the status with no words. Every `<` target that isn't a file when the line starts costs 1 more of the 10,000.
- [X] T366 Make `diff` take folders, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `mkdir p q; diff p q; echo $?` says `diff: p: No such file or directory`, status 2, GNU nothing, status 0. With `p/f` in only one, GNU prints `Only in p: f`, status 1. `diff f p` with `p/f` there compares `f` with `p/f`; with no `p/f`, GNU `diff: p/f: No such file or directory`, status 2. Files in both folders are compared and shown under GNU's `diff p/f q/f` line. `-r` isn't listed, so a folder inside a folder is GNU's `Common subdirectories: p/x and q/x`. `diff about about - < about` runs with status 0, GNU `diff: extra operand ‘-’` with `diff: Try 'diff --help' for more information.`, status 2.
- [X] T367 Fix `${#@}`, `${#*}` and an unquoted array's empty results, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (contradicts). `set -- 'a b' c; echo ${#@} ${#*}` prints `5 5`, bash `2 2`; `f() { echo ${#@}; }; f a b c` prints `5`, bash `3`: they give the length of the joined text, not the count. `a=(a b c); printf '[%s]' ${a[@]#a}` prints `[][b][c]`, bash `[b][c]`, so an unquoted `${a[@]…}` must drop an empty result; `"${a[@]#a}"` keeps it.
- [X] T368 Keep what ran before an arithmetic error, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067, FR-017 and the edge case on syntax it can't parse (contradicts). `echo a; echo $((1.5)); echo b` prints only `bash: line 1: 1.5...: syntax error: invalid arithmetic operator`, status 2, as the whole line is refused before it runs. Bash prints `a`, then `bash: 1.5: arithmetic syntax error: invalid arithmetic operator (error token is ".5")`, status 1, and drops the rest of the line; `x=$((1.5)); echo b` and `echo $((1.5)); echo $?` have the same error and status. `$((1+))` and `$((a b))` are right already. `[[ ]]` says `Expected conditional expression`, bash ``syntax error near `]]'``.
  - Done 2026-10-31. `(( 1.5 ))` fails alone, as in bash; `a[1.5]=1` keeps just-bash's words and doesn't stop the line.
- [X] T369 Make `mv` and `cp` refuse and speak as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-073 and SC-014 (contradicts). `mkdir f; mkdir -p g/f; touch g/f/x; mv f g; echo $?` gives status 0 and `f` is gone, GNU `mv: cannot overwrite 'g/f': Directory not empty`, status 1, with `f` kept. `cp about nope/x` says `cp: cannot copy 'about': No such file or directory`, GNU `cp: cannot create regular file 'nope/x': No such file or directory`. `cp -r d d/x` says `cp: cannot copy 'd' into itself, '/home/guest/d/x'`, GNU `cp: cannot copy a directory, 'd', into itself, 'd/x'`, and `cp -r d d` needs `… into itself, 'd/d'` where it says `are the same file`. `mv d d/x` and `mv d d` need `mv: cannot move 'd' to a subdirectory of itself, 'd/x/d'` and `'d/d'`. `mkdir ''` says `cannot create directory '': Permission denied`, GNU `mkdir: cannot create directory ‘’: No such file or directory`.
- [X] T370 Draw `tree` as `tree` does, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). T340 left these, and none of FR-068's four allowed differences covers them. Every listing has `|--` and `` `-- `` for `├──` and `└──`, and `|` for `│`. The summary doesn't count the root: `tree` says `4 directories, 27 files`, `tree` 2.3.2 `5 directories, 27 files`, and `mkdir d; touch d/.h; tree -a d` says `0 directories, 1 file`, `tree` `1 directory, 1 file`. `tree -d` and `tree work` count the same way, and `tree d` on an empty folder stays `0 directories, 0 files`. The Terminal's font must draw the three characters at the cell's width, at the zooms FR-035 sets; check it, and change any test that holds the old lines.
  - Done 2026-10-31. The Terminal's font files don't hold the three characters, so another font draws them. `Output.tsx` gives each a cell of `1ch`, whichever font it is, at any zoom; checked in a browser by `output.test.ts`.
- [X] T371 Complete `${name` with Tab, in `packages/web/src/apps/terminal/shell/complete.ts`, per FR-076 (partial). With `f1`, `f2` and `fone` set, `echo ${f` then Tab offers the commands `false`, `fi`, `find`, as `{` starts a command word. Bash, on a real terminal, adds nothing and on the second Tab lists `${f1}`, `${f2}`, `${fone}`. `echo ${fo` gives `echo ${fone} ` and `echo "${fo` gives `echo "${fone}" `. `echo ${HOM` gives `echo ${HOME`, as `HOME` and any longer name share that text in bash's list. `{ ca` still completes commands.
  - Done 2026-10-31.
- [X] T372 Give `history` its common options and keep site-library text out of `printf`, in `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and FR-017 (partial). `history -d 1` and `history -w` say `-d` and `-w` are invalid options, and `history a` says `history takes no arguments`, where FR-068 asks for bash's common options: bash's `-d` deletes that entry, its out-of-range error is `bash: history: 1: history position out of range`, and `history a` says `bash: history: a: numeric argument required`, status 1. Decide `-w` by what a visitor's Terminal can do, with no file written past the session (FR-021), and say what was decided in the task. `printf '%z\n'` says `bash: printf: [sprintf] unexpected placeholder` and prints a line, bash ``bash: printf: `\': invalid format character``, status 1, no line. `printf` alone says `bash: printf: usage: printf format [arguments]`, bash `printf: usage: printf [-v var] format [arguments]`, status 2.
  - Done 2026-10-31. `-w` writes `$HISTFILE` or `~/.bash_history` among the visitor's own files, under the same rules as any other write, so it goes when the session does (FR-021). `history a` has status 2, what bash 5.3 gives, not the 1 this task says. `-a`, `-n`, `-r`, `-p` and `-s` still say invalid option.
- [X] T373 Fix the small GNU differences left, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-017 and SC-014 (partial). `wc -lw about` uses a width of 2, GNU 3; `wc -l about skills cv.json` a width of 3, GNU 5, the digits of the total bytes; `wc - < about` a width of 5, GNU 3 with `  4  18 125 -`. `uniq -d -u` prints the repeated lines, GNU nothing. `uniq a b c` says `uniq: a: No such file or directory`, GNU `uniq: extra operand ‘c’` with its second line. `basename .t .t` prints an empty line, GNU `.t`. `xargs -n0 < /dev/null` runs, GNU `xargs: value 0 for -n option should be >= 1` with its second line, status 1. `head -1 -2 about` runs, GNU `head: invalid trailing option -- 2`, status 1; `head -c x about` needs GNU's `head: invalid number of bytes: ‘x’`. `which ''` prints `/usr/bin`, status 0, where it finds nothing, status 1. `date -d tomorrow` says `invalid date`, though `yesterday`, `1 day ago` and `next monday` work; `--iso-8601=ns` and `-Ins` are refused, GNU `1970-01-01T00:00:00,000000000+00:00` for `date -u -Ins -d @0`; `-Ix` needs GNU's `date: invalid argument ‘x’ for ‘--iso-8601’` with its list; `+%q` prints `%q`, GNU the quarter. `grep -E '*a' about` says `invalid regular expression`, GNU `grep: warning: * at start of expression` and matches as `a`; `find . -maxdepth x` needs GNU's `find: Expected a positive decimal integer argument to -maxdepth, but got ‘x’`.
  - Done 2026-10-31. `wc` is the site's own now, over bytes.
- [ ] T374 Fix what's left of `awk` and `sed` that T319 and T320 don't hold, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `awk`: `printf "%u\n",7` prints `%u`, gawk `7`; `printf "%s %s\n","a"` prints `a `, gawk ``fatal: not enough arguments to satisfy format string``, status 2; `print 2^53` prints `9.0072e+15`, gawk `9007199254740992`, as a whole number prints whole; `gsub(/a/,"x",s="aa")` runs, gawk `gsub third parameter is not a changeable object`, status 1; `srand(1), srand()` returns the time for the second, gawk the previous seed, `1`; `-v 1=2` says `Invalid assignment target`, status 1, gawk ``awk: fatal: `1' is not a legal variable name``, status 2. `sed`: `l 10` says `command expected`, GNU wraps at that width, `Alex Prof\` then `ir$`; `sed -n '2,~2p'` says `expected context address`, GNU runs to the next multiple; `sed '1i\  b'` loses the two spaces, GNU keeps them. If a fix can't wrap just-bash, add it to T129's reports and research R25, with a BLOCKED note for the owner on FR-068.
  - BLOCKED: `print 2^53` and `print 1e16` still print `9.0072e+15` and `1e+16`: just-bash's `awk` turns a number past 2^53 into text itself, and no rewrite of the program reaches that (research G38, for T129). Accept, report upstream or replace it, under FR-068. The rest of this task is done and tested: `%u`, too few `printf` arguments, `gsub`'s third parameter, `srand`'s previous seed, `-v 1=2`, `l 10`, `2,~2` and `1i\  b`. `l N` works only as a script of that one command, and `gsub`'s and `printf`'s checks go by the program's text.
- [X] T375 Tidy the shell's and vim's small differences left, per FR-067 and FR-079 (partial). In `packages/web/src/apps/terminal/shell/adapter.ts`: `echo ${BASH_VERSION%%.*} ${BASH_VERSINFO[0]} ${BASH_VERSINFO[1]}` prints `5` and two empties, bash `5 5 3`; `SECONDS=5; echo $SECONDS` prints `0`, bash `5`; `cd /tmp; cd /home; echo ~-` prints `~-`, bash `/tmp`; `cd //; pwd` prints `/`, bash `//`, and `cd //tmp; pwd`, bash `//tmp`. With `shopt -s globstar`, `echo d/**`, `echo **` and `ls d/**` stay as typed, bash `d/ d/e d/e/f d/g` and every path below; `d/**/f` is right already. In `packages/web/src/apps/terminal/engine/vim.ts`: after `ddjddu` then Ctrl+R the cursor is at line 2, column 3, vim line 1, column 1; `G3{`, with fewer paragraphs above than the count, moves to line 1, where vim stays on line 7.
  - Done 2026-10-31. Differs from this task's words on `ddjddu` then Ctrl+R: a real vim on a terminal gives line 2, column 1, which is what the view gives now. The line 1 came from `vim -s`, which merges changes into one undo step, so `vimdiff.ts` can't judge undo; `ptyvim.py` in the scratch folder sends keys one at a time. `a`, `A` and `I` now start their undo step where the typing begins. `echo **/` still stays as typed. `$BASH_VERSION` still says just-bash's 5.1.0. Two slashes are kept across lines but not after a reload, and the prompt shows one.

- Phase 41 result (2026-10-31): one full `npm test`, with GNU tools first on PATH, had 4,261 passed, 2 skipped and 8 failed: 7 were one `1ch` the token check refused, since fixed, and 1 was `targets.test.ts`, which passes alone. After the fix, the 47 test files holding those 8 and the shell's and engine's tests passed (2,786), and `site-check` 14 of 14, `token-check`, `content-check`, `traceability` and `typecheck` pass. The whole suite wasn't run again. Not pushed, so CI hasn't run on it. Research G37 and G38 are new for T129's reports.

## Phase 42: Convergence

Found on `ee24054`. Lines went through the real adapter and were compared with bash 5.3, GNU tools and jq 1.7.1, key sequences through the view's reducer were compared with vim 9.1, and Tab through a real bash on a terminal, none of this on a build. As in Phases 37 to 41, an option a command's own `--help` doesn't list isn't a gap under FR-068, and neither is a command or word FR-067, FR-068 and research R32 leave out, or a vim key FR-060 and FR-079 don't name. What T319, T320 and T374 already hold isn't repeated, and jq's error wording stays as FR-068 allows. Each line named below goes in `bash-parity.test.ts`, or in `completion-parity.test.ts` for Tab, where it compares the same on any machine. The scripts are in `CV-worktrees/.scratch/006-converge8`: `diff.ts` runs each line in real bash on this machine, so give it no destructive line (`d3.txt` holds what only `ours.ts` may run), and `vimdiff.ts` can't judge undo. If a `jq` fix can't wrap just-bash's own jq, add it to T129's reports and to research R25 with a BLOCKED note for the owner on FR-056.

- [X] T376 Find `jq`'s filter by its place, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-056, FR-068 and SC-014 (contradicts). T365's check, `args.slice(1)` in `jq`, takes the first argument for the filter, so with any option before it `.` counts as a file and is refused as a folder. `jq -c . cv.json`, `cat cv.json | jq -c .`, `jq -r . <<< '"a"'`, `jq -S . cv.json`, `jq --tab . cv.json`, `jq -R .`, `jq -s .`, `jq -e .`, `jq --arg x y .` and `jq -c ..` all say `jq: error: Input error: Is a directory`, status 2, and each of the options `--help` lists only works with some other filter. `jq --arg x . '$x'` is refused for the value too. Skip each option with its values, take the first other word as the filter, and check only what follows it: `jq -c . work` keeps today's error, `jq -c work` is a jq compile error about `work`, `jq . about work` fails on `about` first.
  - Done 2026-10-31. An option `--help` doesn't list stops there, as jq does. A later folder fails after what comes before it has run.
- [X] T377 Make `rm -r` refuse `.` and `..` as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068, FR-073 and SC-014 (contradicts). `touch v; rm -r .; ls v` lists every protected file as refused and deletes `v`, and `cd work; rm -r ..`, `rm -rf .`, `rm -r ./`, `mkdir d; rm -r d/.` and `rm -r d/..` delete the visitor's files the same way, where GNU removes nothing: `rm: refusing to remove '.' or '..' directory: skipping '.'`, naming the operand as typed (`..`, `./`, `d/.`, `d/..`), status 1, then on to the next operand. Checked by hand with GNU rm 9.12 in a scratch folder. Add these to the adapter's tests, not to `diff.ts` or to the parity lines.
  - Done 2026-10-31. In `rm`'s fix in `gnu.ts`, so `.` and `..` never reach the walk in `site-commands.ts`. In the adapter's tests only, as the task says.
- [X] T378 Treat a final slash as naming a folder, in `packages/web/src/apps/terminal/shell/gnu.ts`, `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/fs.ts`, per FR-067, FR-068, FR-073 and SC-014 (contradicts). `cp about nope/` makes a file `nope` with status 0, GNU `cp: cannot create regular file 'nope/': No such file or directory`, status 1, nothing made. `touch f; mv f nope/` renames `f` to `nope`, GNU `mv: cannot move 'f' to 'nope/': No such file or directory` with `f` kept. `echo x > nope/` writes `nope` with status 0, bash `bash: nope/: No such file or directory`, status 1. `touch f/` makes `f`, GNU `touch: cannot touch 'f/': No such file or directory`. With a file `f`, `cat f/` prints it, GNU `cat: f/: Not a directory`, status 1, `ls f/` lists `f/`, GNU `ls: cannot access 'f/': Not a directory`, status 2, and `cp f f/` says they're the same file, GNU `cp: cannot stat 'f/': Not a directory`.
  - Done 2026-10-31. For `cp`, `mv`, `touch`, `cat`, `ls` and a redirect, as named. `head f/`, `wc f/` and `grep x f/` still read the file.
- [ ] T379 Make `jq`'s assignments and `del` act on their paths, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-056 (contradicts). On null, `jq -nc '.a=1'`, `.a|=2`, `.a//=3` and `.a+=1` print `null`, jq `{"a":1}`, `{"a":2}`, `{"a":3}`, `{"a":1}`. `{}|.a.b=1` prints `{"a":null}`, jq `{"a":{"b":1}}`; `[]|.[1].a=1` prints `[null,null]`, jq `[null,{"a":1}]`. `{a:1}|.a|=empty` prints `{"a":null}`, jq `{}`. `{a:1,b:2}|del(.a,.b)` changes nothing, jq `{}`; `[1,2,3]|del(.[0,2])` prints `[2,3]`, jq `[2]`; `del(.[1:])` changes nothing, jq `[1]`. `[1,2,3]|.[1:]=[9]` prints `[9]`, jq `[1,9]`, and `.[:1]=[9]` prints `[9]`, jq `[9,2,3]`.
  - BLOCKED: can't wrap just-bash's `jq` (research G39). Each is inside its path and assignment code, which no option or wrapper reaches, and a `def` can't stand in for a builtin: `def unique: 5; unique` still runs just-bash's. Owner decides under FR-056: accept, report upstream, or give the site its own `jq`.
- [ ] T380 Fix `jq`'s builtins and syntax where they differ, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-056 (contradicts). `[3,1,2,1]|unique` prints `[3,1,2]`, jq `[1,2,3]`. `sort_by(.a,.b)` and `group_by(.a,.b)` use only `.a`. `[match("a";"g").offset]` on `"abab"` prints `[0]`, jq `[0,2]`, so the `g` flag does nothing, with `"gi"` too. `sub("(?<l>[a-z])X";"\(.l)!")` says `Cannot index string`, jq `"a!bX"`, and `gsub` likewise. `split(", *";"g")` doesn't split. `[1]<[2]`, `[2]>[1]` and `{a:1}<{a:2}` are false, jq true, and `nan<1` is false, jq true. `{a:1}|add` prints `null`, jq `1`; `{a:true}|any` is false, `{a:false}|all` true, as neither looks in an object. `walk(if type=="number" then .+1 else . end)` changes nothing, jq `[2,[3]]` from `[1,[2]]`. `def h($a):$a+1;h(1)` prints `1`, jq `2`, and `def h($a;$b):$a+$b;h(1;2)` prints `null`, jq `3`. `label $o|1,break $o,2` prints nothing, jq `1`. `1 as $x|{$x}` prints `{"$x":null}`, jq `{"x":1}`. `[{a:1}]|INDEX(.a)` says `Cannot index array`, jq `{"1":{"a":1}}`. `[1,[2]]|tostream` ends with `[[]]`, jq `[[1,0]]` and `[[1]]`.
  - BLOCKED: can't wrap just-bash's `jq` (research G39), as for T379. Builtins, comparison, `label`, `{$x}` and `$a` parameters are its parser's and evaluator's. Owner decides under FR-056.
- [ ] T381 Fix `jq`'s `@` formats, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-056 (contradicts). `[1,"a b",null,true]|@csv` prints `"1,a b,,true"`, jq `"1,\"a b\",,true"`. On anything but a string, `@html`, `@uri` and `@base64` print `null`, jq the escaped JSON text: `[1,2]|@html` is `"[1,2]"`, `@uri` `"%5B1%2C2%5D"`, `@base64` `"WzEsMl0="`. `[1,"a"]|@sh` prints `null`, jq `"1 'a'"`. `[1,"a"]|@text` prints `"1,a"`, jq `"[1,\"a\"]"`. `{a:1}|@text`, with any `@` format, stops with `Cannot convert object to primitive value`, jq `"{\"a\":1}"`. `@csv` and `@tsv` of a string or object must be jq's error, which `?` catches, not `null`. A format before a string is a parse error: `@html "x\("<")"`, jq `"x&lt;"`, and `@json`, `@text`, `@uri`, `@sh`, `@base64`, `@base64d`, `@csv` and `@tsv` the same way, as well as `{@base64 "x":5}` for a key.
  - BLOCKED: can't wrap just-bash's `jq` (research G39), as for T379. `@` formats and a format before a string are its parser's and evaluator's. Owner decides under FR-056.
- [ ] T382 Give `jq` its errors, and take a filter starting with `-`, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-056 and FR-068 (contradicts). These print `null` with status 0, jq an error with status 5: `{}+1`, `[1]+1`, `"a"-1`, `[1]*2`, `{}|.[0]`, `true|length`, `1|ascii_downcase`, `null|ascii_downcase`, and `splits("a")` on null. So `(…)?` gives `null` where jq gives nothing, and `.a-=1` on null must fail. These print `null` with status 0, jq a compile error with status 3: `$nope`, `ltrimstr` and `ascii(65)`, a builtin called with the wrong number of arguments. `repeat(.;1)` runs out the 5 seconds with FR-069's text, jq the same compile error. `jq -e empty` has status 1, jq 4. A filter starting with `-` is refused as an option: `jq -n '-1'`, `jq -nc '-1|floor'`, `jq -n '-(1)'` and `jq -c '-.'` say `jq: invalid option`, jq `-1`. An option `--help` doesn't list, such as `jq -Z .`, must say `jq: Unknown option -Z` with jq's two lines after it, status 2.
  - BLOCKED, done in part: a filter starting with `-`, `jq: Unknown option` with its two lines and status 2, and `jq -e empty` with status 4 work. The type errors and the compile errors for `$nope` and a wrong argument count can't wrap just-bash's `jq`, which gives `null` with status 0 (research G39). Owner decides under FR-056.
- [ ] T383 Add `jq`'s input and exit functions, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-056 (missing). `input`, `inputs`, `input_filename`, `halt`, `halt_error`, `halt_error(n)` and `stderr` say `Unknown function`. `jq -n '[inputs]|length' <<< '1 2 3'` is `3`, `jq -c '[.,input]' <<< '1 2 3 4'` is `[1,2]` and `[3,4]`, `jq -n input <<< 1` is `1`, `jq input <<< 1` fails with status 5, `jq -nR -c '[inputs]' <<< $'a\nb'` is `["a","b"]`, `jq -c input_filename cv.json` is `"cv.json"`, `'"bye\n"|halt_error(1)'` writes `bye` to stderr with status 1, `{a:1}|halt_error` writes `{"a":1}` with status 5, `halt,1` prints nothing with status 0. `1|debug("x")` writes nothing, jq `["DEBUG:","x"]` to stderr. `$__loc__` prints `null`, jq `{"file":"<top-level>","line":1}`, and `{$__loc__}` the same under its key. `input_line_number` with `-n` is `1`, jq `0`. `infinite|tostring` and `-infinite|tostring` are `"null"`, jq `"1.7976931348623157e+308"` with its sign. Numbers keep what jq 1.7 keeps: `jq . <<< 1.0` prints `1.0`, `1.10` prints `1.10`, `100000000000000000000` stays whole, `1e1000` isn't `null`.
  - BLOCKED: can't wrap just-bash's `jq` (research G39). `input`, `inputs`, `halt` and the rest need its evaluator, and numbers are parsed to doubles before any filter runs. Owner decides under FR-056.
- [X] T384 Read `head`'s and `tail`'s numbers as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `head -n 1k about`, `-n 1K`, `-n 1M`, `-n 1kB`, `head -c 1k`, `-c 1M`, `-c 1b`, `tail -n 1k`, `tail -c 1k` and `tail -c 1b` all act as `1`, GNU multiplies, so each prints the whole of `about`, and the same for each of GNU's suffixes (`b`, `K`, `kB`, `M`, `MB`, `G`). `head -c 1x about` prints `A` with status 0, GNU `head: invalid number of bytes: ‘1x’`, status 1; `head -c 1kx`, `tail -n 1x` likewise with their words. `head -n -x about` says `‘-x’`, GNU `‘x’`.
  - Done 2026-10-31. `counted` in `gnu.ts` turns every count into plain digits first, so the fixes behind it are as they were. A negative `tail` count reads as no sign, as GNU's.
- [X] T385 Refuse an empty operand as GNU does, in `packages/web/src/apps/terminal/shell/gnu.ts`, `packages/web/src/apps/terminal/shell/site-commands.ts` and `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067, FR-068 and SC-014 (contradicts). `ls ''` lists the working folder with status 0, GNU `ls: cannot access '': No such file or directory`, status 2, so `ls "$x"` with `x` empty shows the wrong thing. `cd ''` succeeds, bash `bash: cd: null directory`, status 1. `rm ''` says `Is a directory`, GNU `rm: cannot remove '': No such file or directory`; `rm -f ''` has status 1, GNU 0 with no words. `touch ''` says `Permission denied`, GNU `touch: cannot touch '': No such file or directory`. `cat ''` says `cat: : No such…`, GNU `cat: '': No such file or directory`. `cp '' x` says `-r not specified; omitting directory ''`, GNU `cp: cannot stat '': No such file or directory`. `mv '' x` says `to a subdirectory of itself`, GNU `mv: cannot stat '': No such file or directory`. FR-048's reply for a wrong path keeps its place where it applies.
  - Done 2026-10-31. `wc ''` says GNU's `wc: invalid zero-length file name`, status 1.
- [X] T386 Make `--` end the options everywhere, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `head -- about`, `tail -- about`, `sed -- 1p about`, `awk -- 'NR==1' about` and `env -- A=1 echo hi` say `unrecognized option '--'`. `seq -- 2` says `invalid floating point argument: ‘--’`, GNU `1` and `2`. `basename -- -a` and `dirname -- -a/b` say `missing operand`, GNU `-a` and `-a`. `find -- about` says `unknown predicate`, GNU `about`. Past it nothing is an option. `tr -d a --` runs, GNU `tr: extra operand ‘--’` with its two lines after it, status 1. `seq 3 -s,` and `seq 1 -w 3` run, GNU doesn't take an option after a number there: `seq: invalid floating point argument: ‘-s,’` with its `Try` line, status 1.
  - Done 2026-10-31. `basename` and `dirname` are the site's own now, since just-bash's can't be told an operand like `-a` is one. `seq` and `tr` stop at their first operand, as their `getopt` strings do.
- [X] T387 Take GNU's long forms of what `--help` lists, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). A value as the next word: `head --lines 1 about`, `tail --lines 1 about`, `grep --max-count 1 a about` are refused, GNU runs them; so must each listed long option with a value (`--bytes`, `--key`, `--field-separator`, `--output`, `--unset`, `--suffix`, `--date`, `--file`). A shortened name that's still unique: `head --line=1`, `grep --cou a about`, `wc --lin about`, `sort --rev` are refused, GNU runs them, and a name that could be two gives GNU's `option '--…' is ambiguous` with its possibilities. `-e PATTERN` as `grep --regexp=a about` is refused where the short form is listed. Do this once, around the commands, not in each one.
  - Done 2026-10-31. `LONG` in `gnu.ts` holds GNU's names in GNU's order, taken from the real tools, so a name that could be two lists what GNU lists, and one GNU has that `--help` doesn't list is refused by its full name.
- [X] T388 Stop options `--help` doesn't list from running as something else, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and FR-017 (contradicts). `tree -F`, `-i`, `-I work`, `-P 'a*'`, `-s`, `-h`, `-J`, `--noreport` and `-Z` print an empty line and `0 directories, 0 files`, status 0, as if the folder were empty: give `tree: Invalid argument -`Z'.` with `tree`'s usage, status 1, or do what `tree` does. `xargs -Z`, `basename -Z a` and `dirname -Z a` run as if it weren't there, GNU `invalid option -- 'Z'` with its `Try` line, status 1. `diff -N about nope` and `--new-file` read as no option at all. `seq -Z` and `seq -f %g 2` say `invalid floating point argument`, GNU's `invalid option` form for what isn't listed. The words and status of the refusal itself: `grep -z` has status 1 with one line, GNU's form is the `Usage:` and `Try` lines, status 2; `xargs -L1` has status 123 with one line, GNU 1 with `Try`; `diff -r` has no `Try` line; `env -Z` has status 1, GNU 125; `date -u -r about +%Y` says `extra operand`, it must say `invalid option -- 'r'`.
  - Done 2026-10-31. `tree` refuses each option `--help` doesn't list, the first of the task's two ways, even those a real `tree` has. `diff -N`, `seq -f` and `xargs -L1` say `invalid option`, so a real GNU tool differs there by design. This drops `-f` and `--format` from `seq`, and `-L`, `-s`, `-a`, `-E` and the long forms that `--help` doesn't list from `xargs`.
- [X] T389 Show every standard command's own help, in `packages/web/src/apps/terminal/shell/site-commands.ts`, `packages/web/src/apps/terminal/shell/standard.ts` and `packages/web/src/shell-text.ts`, per FR-008 and FR-015 (contradicts). `help` lists `echo`, `true` and `false` and says `help <command> shows its options`, and each name there is a control that runs it, but `help echo` runs `echo --help` and prints `--help`, `help true` prints nothing, and `help false` prints nothing with status 1. Add their text from what bash's `help` says, with status 0, leave `echo --help` as bash has it, and test every name in `help`'s group: each prints at least one line, status 0.
  - Done 2026-10-31. The text is bash's `help`, kept in `BUILTIN_HELP` in `standard.ts`, as `MISSING_HELP` is: GNU's and bash's words aren't the site's, so `shell-text.ts` didn't change.
- [X] T390 Apply case changes to each item, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (contradicts). `a=(x y); echo "${a[@]^}"` prints `X y`, bash `X Y`, with `"${a[*]^}"` too; `set -- ab cd; echo "${@^}"` prints `Ab cd`, bash `Ab Cd`. `a=(Xa Ya); echo "${a[@]~}" "${a[@]~~}"` refuses the whole line with `bad substitution`, bash `xa ya xA yA`. `x=abc; echo ${x^b}` prints `aBc`, bash `abc`, as `^` with a pattern tests only the first character.
  - Done 2026-10-31. In a command's words, a `for`'s list and an array's items. `x="${a[@]^}"` as a plain assignment still changes the first item only, and `x="${a[@]~}"` keeps the value unchanged.
- [X] T391 Make `mapfile` and `readarray` do their options, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (partial). All are taken and ignored. `mapfile -n1 a < about` keeps 4 lines, bash 1; `-s1` 4, bash 3; `-O2 a <<< x` puts it at 0, bash 2; `-d: a <<< a:b` keeps 1 item, bash 2; `-t -n2 -s1 a < about` gives `4 Alex Profir`, bash `2 Software Engineer`; `-C echo -c1 a <<< x` calls nothing, bash prints `0 x` and a blank line.
  - Done 2026-10-31. Rewritten only with one of those options: plain `mapfile` and `mapfile -t` stay just-bash's. `type f` drops the redirect of a rewritten `mapfile`, as with G10.
- [X] T392 Make `compgen` list what Tab lists, in `packages/web/src/apps/terminal/shell/adapter.ts` and `packages/web/src/apps/terminal/shell/complete.ts`, per FR-067 and FR-076 (partial). `compgen -c ca` prints nothing with status 1, though `ca` then two Tabs lists `case` and `cat`; `compgen -b` prints nothing, bash the builtins from `.` and `:`; `compgen -k` starts `!` and `[[`, bash `if` and `then`; `compgen -A function` with none has status 0, bash 1; `compgen -u` prints nothing, here `guest`. `compopt` says `compopt: not…`, bash `bash: compopt: not…`.
  - Done 2026-10-31. The other kinds (`-f`, `-d`, `-v`, `-W`) stay just-bash's. The site's commands follow the builtins in `compgen -c`, where bash has `PATH`'s.
- [X] T393 Fix Tab's first word, a quoted `$` and a glob, in `packages/web/src/apps/terminal/shell/complete.ts`, per FR-076 and SC-017 (contradicts). Checked on a real bash terminal. After a keyword the word is an argument to bash's completion: `if ca`, `then ca`, `while ca`, `! ca` and `time ca` offer files, so nothing here where ours lists `case` and `cat`. `ls {a` offers `about` and `awk`, as T371's rule takes `{` for a command's start anywhere; bash adds and lists nothing there, and `{ ca` keeps commands. In double quotes a file's `$` isn't escaped: with a file `d$f`, `cat "d` gives `cat "d$f" `, ours `cat "d\$f" `. A glob with one match replaces itself: with a folder `zed`, `echo z*/` gives `echo zed/`, ours nothing.
  - Done 2026-10-31. Readline has no keywords: only `;|&({` and the backtick make the next word a command, so the `keywords` source is gone from the completer. `else`, `elif`, `do` and `until` went with it, the same way, and `completion-parity.test.ts` confirms `do` and `then` against real bash.
- [X] T394 Count `printf`'s widths in bytes, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (contradicts). `--help` lists width and precision, and bash and GNU count bytes in them: `printf '%6s|' ș` pads 4 spaces, ours 5, `%-6s` the same, `%5s` inside `$(…)` too. `printf '%.1s' ș` writes the first byte, ours the letter. `printf '%c\n' ș | wc -c` is 2, ours 3.
  - Done 2026-10-31. `printf -v` still counts characters.
- [X] T395 Read `date -d`'s common forms and print `%:z`, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `--help` lists `-d STRING`. These say `invalid date`, and GNU reads them: `2020-01-31 +1 month` (`2020-03-02`), `2020-01-01 next day`, `2020-01-01 12:00:00 +0200` (`10:00:00` with `-u`), `20200102`, and `Thu, 02 Jan 2020 00:00:00 +0000`, which is what `date -R` itself prints. `%:z` and `%::z` print as typed, GNU `+00:00` and `+00:00:00`.
  - Done 2026-10-31. `date -d '2020-01-01 monday'` gives `2020-01-06` where this GNU `date` gives `2020-01-01`: seen, not in the task, unchanged.
- [X] T396 Tidy the GNU differences left, in `packages/web/src/apps/terminal/shell/gnu.ts`, per FR-068 and SC-014 (partial). `mkdir work` and `mkdir about`, and `mkdir -p about`, say `Permission denied`, GNU `File exists`, as the name is taken before anything would change; `mkdir -p about/x` says `Permission denied` for `about/x`, GNU `mkdir: cannot create directory ‘about’: Not a directory`. `xargs -d, -n1 echo <<< 'a,,b'`, and `-d '\n'` over a blank line, drop the empty item, GNU keeps it, and `xargs -d '\n' echo` must then print two spaces. `awk 1 about -` and `awk 1 - about` can't open `-`, gawk reads standard input in its place. `awk` alone has status 2, gawk 1. `uniq -i <<< $'É\né'` folds them, GNU in this locale folds only ASCII and keeps both. `tr '[a*2]' x <<< a` says the repeat can't be in string1, GNU `x`.
  - Done 2026-10-31. `gawk` alone does end with status 1, checked, so T345's test changed. `awk 1 about -` reads all as one input, so `FNR` and `FILENAME` don't restart. `xargs -I` over an empty item still drops it.
- [X] T397 Tidy the shell's differences left, in `packages/web/src/apps/terminal/shell/adapter.ts`, per FR-067 (partial). Most were seen in earlier phases and left outside their tasks. `echo $((0x))` is an error, bash `0`; `$((0b))` and `$((0xg))` lack bash's `bash: ` prefix. `a[1.5]=1; echo after` keeps just-bash's words and runs on, bash `bash: 1.5: arithmetic syntax error: invalid arithmetic operator (error token is ".5")`, status 1, dropping the rest of the line as T368 does for `$((1.5))`. `break 0`, `continue 0` and `break -1` say `numeric argument required` and end the line, bash `bash: break: 0: loop count out of range` and go on with status 1. `echo a >&-` and `printf x >&-` have status 0, bash `bash: echo: write error: Bad file descriptor`, status 1. `echo $BASH_VERSION` says 5.1.0 where `${BASH_VERSINFO[1]}` says 3: make them agree. `echo $BASH` and `echo $TERM` are empty. With `shopt -s globstar`, `echo **/` and `echo d/**/` stay as typed, bash every folder below (`d/ d/e/`).
  - Done 2026-10-31. Differs from this task's words on `break 0`: a real bash doesn't go on inside the loop, it ends every loop with status 1 and goes on after them, which is what the shell does now. `$TERM` shows in `env`, as just-bash lists what isn't exported (G11). `BASH` and `BASH_VERSION` are taken out of `env`, and `break x` still has status 128 where bash has 2.
- [X] T398 Make a counted `cw` and `yw` run past the line as vim does, in `packages/web/src/apps/terminal/engine/vim.ts`, per FR-079 (partial). On the seven lines of the scratch text, `c20wq<Esc>` and `20cwq<Esc>` leave the first line changed and the rest there, vim takes the rest of the file and leaves `q`; `jc20wq<Esc>` likewise from line 2. `y20wP` pastes whole lines above, vim's yank is by characters, so `P` puts it in the first line and its last word joins what the cursor was on (`twelve thirteenone two three`). `d20w` and `20dw` are right already. Check `.` after them.
  - Done 2026-10-31. Checked with `vimdiff.ts`, `.` too. Only `d` turns into whole lines, as vim's `op_delete` alone does: `y9w` from column 0 was also whole lines, and isn't now.

- Phase 42 result (2026-10-31): one full `npm test`, with GNU tools first on PATH, had 4,543 passed, 2 skipped and 7 failed, all one `.1s` the token check refused, since fixed. After the fix, `token-check`, `content-check`, `traceability`, `typecheck` and the 4 test files that failed pass. The whole suite wasn't run again, and `site-check` wasn't run on this phase. Not pushed, so CI hasn't run on it. T379 to T383 are BLOCKED under FR-056 (T382 in part), and research G39 is new for T129's reports.
