---

description: "Task list for the Terminal"
---

# Tasks: The Terminal

**Input**: Design documents from `/specs/006-terminal/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/terminal.md](./contracts/terminal.md),
[contracts/commands.md](./contracts/commands.md), [contracts/shell.md](./contracts/shell.md),
[contracts/site.md](./contracts/site.md), [contracts/cli.md](./contracts/cli.md),
[quickstart.md](./quickstart.md), and the design in [design/](./design/):
[wireframes.md](./design/wireframes.md), [README.md](./design/README.md), the 19 Penpot PNG
exports in `design/exports/`, the
[Penpot link](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f)
and the signed [review.md](./design/review.md) (**006 Terminal — Glass**, commit `c34fd51`,
2026-10-27).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `006-terminal-FR-###` IDs it covers, and every FR in
spec.md (FR-001 to FR-066, all active) is covered by at least one test task (see Requirement
Coverage at the end).

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

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US8)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 006-terminal-FR-016"

## Not in this feature

As the spec's Assumptions set: Settings, Contact and the requirement inspector; running real
programs or reaching the network; tab completion, quotes, scripts and variables; a file system
shared with other apps or a Files app; changing the file system, hidden files and permissions;
Terminal themes, font sizes and preferences; games, easter eggs and translations. `open` gains
names only as later features add apps.

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
- The spec list: `packages/web/scripts/spec-list.ts`, `packages/web/src/virtual-modules.d.ts`,
  registered in `packages/web/vite.config.ts` and `vitest.config.ts`
- Tests:
  - engine (Node): `packages/web/test/terminal/engine/*.test.ts`
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
  failure is a real one.
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
- [X] T020 [P] [US1] Write `packages/web/test/terminal/engine/help.test.ts`, covers 006-terminal-FR-008: `COMMANDS` names exactly the 22 commands of FR-008, with `whoami`, `experience` and `?` as aliases of `about`, `work` and `help`; every name and alias is lower case and unique; `help`'s rows list every name and alias as a `command` node and nothing else; 200 generated words not in the table parse as unknown; `help work` gives `work`'s own help.
- [X] T021 [P] [US1] Write `packages/web/test/terminal/engine/cv-output.test.ts`:
  - covers 006-terminal-FR-009: on the `every-field`, `nothing-optional`, `partial-dates`, `non-ascii` and `three-projects` fixtures, `about`, `work`, `projects`, `education`, `skills`, `languages`, `interests` and `contact` show the fields of `CV_FIELDS` in order, absent fields with no label, dates as 004's `format/dates.ts` writes and dates them (`time` nodes, ongoing as `Present`), the location as 004's `format/location.ts` writes it, and links named as 004 FR-012 and FR-013 name them; `CV_FIELDS` matches 004's `expectedFields` (`tools/site-check/src/expected.ts`) on `every-field`;
  - covers 006-terminal-FR-010: changing one fact in a fixture CV changes the output, with no other edit (as 004's `one-edit.test.ts`);
  - covers 006-terminal-FR-011: on `empty-sections`, each empty section's command gives `The CV lists no {section}.` with no heading or list, and `help` still lists it.
- [X] T022 [P] [US1] Write `packages/web/test/terminal/engine/suggest.test.ts`, covers 006-terminal-FR-016: `wrok` → `work`, `hlep` → `help`, `proj` → `projects`, `experiance` → `experience`, `WROK` → `work` (capitals free), `sudo`, `rm`, `mkdir` → none; `l` → `?`, `ls` (distance, then `help` order); `mv` → `cv`; `cta` → `cat` (words of 3 letters or fewer reach names 1 edit away only); `cl` → `cv`, `cd`, `clear` (a prefix match sorts by its own distance, after nearer names); at most 3; an alias and its command count once, the chip running the name that matched.
- [X] T023 [P] [US1] Write `packages/web/test/terminal/engine/replies.test.ts`:
  - covers 006-terminal-FR-016: the unknown reply names the word exactly as typed, says it is not a command and holds a `help` control, then the suggestions as chips, or only `help`;
  - covers 006-terminal-FR-017: `work 2020`, `cat`, `open` alone, `vim` alone and `help work extra` get `{command} takes {what}. Usage: {usage}`.
- [X] T024 [P] [US1] Write `packages/web/test/terminal/engine/json.test.ts`:
  - covers 006-terminal-FR-055: `cvJson` equals `JSON.stringify(resume, null, 2)` and `packages/content/resume.json`'s text without its final line break, and the printer's text parses to the CV with every key in order;
  - covers 006-terminal-FR-056: 2-space indents; key order kept, integer-like keys (`{"2":1,"1":2}`) included; numbers kept as written (`1.50`, `1e3`); token classes `key`, `string`, `number`, `literal`, `punctuation`; top-level folds with key, start and end; `jq .` accepted; `jq .work` gets the "only pretty-prints" reply; `{` alone, `cat about | jq` and `jq readme` get `jq: {path or |} is not JSON.`.
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
- [X] T032 [P] [US1] Write `packages/web/test/terminal/command-line.test.ts`:
  - covers 006-terminal-FR-006: typing `Help ` and Enter adds a `section.run` whose `h2` reads `Help ` exactly, then `help`'s output, then an empty prompt;
  - covers 006-terminal-FR-007: Enter on an empty line adds a prompt and no message, and nothing to `history`;
  - covers 006-terminal-FR-017: `maxlength` equals `command-line.max-length` (500); typing and pasting 600 characters keeps 500; a 500-character line wraps inside the window;
  - covers 006-terminal-FR-018: `<b>hi</b>`, `<img src=x onerror=alert(1)>` and a URL echo as text, with no `b`, `img` or `a` created and no dialog; a pasted `help\nwork` becomes `help work` and nothing runs until Enter.
- [X] T033 [P] [US1] Write `packages/web/test/terminal/output.test.ts`:
  - covers 006-terminal-FR-005: the greeting holds the design's site text with the fixture CV's name and label, then 5 chips that run `help`, `about`, `work`, `projects` and `cv`; with the `no-name` fixture it shows the site heading;
  - covers 006-terminal-FR-019: output stays until `clear`, `Clear output` or closing; the wheel scrolls `.terminal-screen`, never the document; after `help` the run's heading is at the top of the view; after `pwd` the new prompt is in view; scrolled up, a control moves the view to the new run.
- [X] T034 [P] [US1] Write `packages/web/test/terminal/controls.test.ts`, covers 006-terminal-FR-015: every control in the greeting, `help`, the unknown reply and `open`'s reply runs its line on click, Enter and Space, as typed (in the output and in `history`), and focus returns to the command line; each control is a `button` named by its full line (SC-001: every CV section within 2 clicks of the greeting).
- [X] T035 [P] [US1] Write `packages/web/test/terminal/history.test.ts`, covers 006-terminal-FR-020: after `work` and `skills`, Up twice gives `work`, Down gives `skills`, Down again the saved draft; Up with no history changes nothing; `history` lists the commands oldest first, numbered from 1.
- [X] T036 [P] [US1] Write `packages/web/test/terminal/state.test.ts`, covers 006-terminal-FR-021: minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep the output, history, draft, scroll position and an open vim view's cursor, folds and search; closing (control, menu, `Alt+Shift+W`, `exit`) and reopening starts afresh with the greeting.
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
- [X] T043 [P] [US1] Write `packages/web/src/apps/terminal/engine/suggest.ts` (research R8): optimal string alignment distance on lower-case words, over every name and alias; a name qualifies at distance 1 or 2, or only 1 when the typed word has 3 letters or fewer; a command whose name begins with a typed word of 2 letters or more qualifies too, counted at its own distance; sorted by distance then `help` order; an alias and its command once, by the nearer name; at most 3. T022 passes.
- [X] T044 [P] [US1] Write `packages/web/src/apps/terminal/engine/cv.ts` (research R4, data-model.md CV fields per section): `CV_FIELDS` for `basics`, `contact`, `work`, `projects`, `education`, `skills`, `languages` and `interests`, in `/cv`'s order; one block builder per section and per entry (entries as `heading` depth 1 when the command shows one section), using 004's `format/dates.ts` and `format/location.ts` through `RunContext` (so the engine imports no component), `time` nodes for dates, `link` nodes named by 004's labels, and the empty-section line (FR-011). The per-entry builders are exported for `cat` (T064). T021 passes.
- [X] T045 [P] [US1] Write `packages/web/src/apps/terminal/engine/json.ts` (research R11, data-model.md JSON rows): a lexer (never `JSON.parse`) that checks structure and returns `{ rows, folds }` or `{ error: 'not-json' }`, with 2-space indents, keys and numbers as written, and each top-level object or array's first and last line. T024 passes.
- [X] T046 [P] [US1] Write `packages/web/src/apps/terminal/engine/vim.ts` (research R12, data-model.md Vim view): `VimSource`, `VimState`, `openVim(source)` with top-level folds closed, and `vimReducer(state, input)` handling every row of the transition table, returning `'quit'` on `:q` without the help split. T025 passes.
- [X] T047 [US1] Write `packages/web/src/apps/terminal/engine/files.ts`'s first part (research R9, data-model.md File system): `FsNode`, `Folder`, `File`, `Path`; `buildFileSystem(resume, specs, builders)` returning, for now, the home folder holding `cv.json` only (`text: cvJson`, `show` its text); `resolve(path, from)` and `formatPath(path)` as FR-045 sets. T028's cases pass.
- [X] T048 [US1] Write `packages/web/src/apps/terminal/engine/commands.ts` after T042 to T047 (research R7, contracts/commands.md): `COMMANDS` with all 22 rows in `help`'s order (`args`, `readsInput` true for `jq` and `vim` only, aliases), `RunContext` (site text, formatters, `TERMINAL.columns`, the file system, the working folder, history), and `runLine(line, context)` that pipes stages (each output's `text` the next one's `input`; "doesn't read piped input" for others). Implement `help` (table rows of `command` controls, the output block carrying `data-req="006-terminal-FR-008"` through its renderer node; `help <command>`), `about`, `work`, `projects`, `education`, `skills`, `languages`, `interests`, `contact` (from T044), `cv` (runs `cat cv.json | jq | vim -`), `cat` (a file's `show()`; `cat cv.json` its text; no such path; a folder), `jq` (path or input, `.` only), `vim` (path or `-` with input; `open-vim`), `open`, `history`, `clear`, `exit`, the unknown reply with suggestions and the usage reply. `site`, `specs`, `ls`, `cd` and `pwd` give their usage until T060 and T065 (they are listed by `help` from the start). T020, T023 and T027 pass.
- [X] T049 [US1] Write the session store in `packages/web/src/apps/terminal/session.ts` (research R5, data-model.md Terminal session): `createSession()` with `entries`, `history`, `folder`, `draft`, `stepping`, `scrollTop`, `vim` and `announcement`; writers `run(line)`, `step(direction)`, `setDraft`, `clear()`, `vim(input)`, `saveScroll` and `reset()`; one store per page, read with `useSyncExternalStore`; nothing written to storage (FR-022); the prompt's `hh:mm` stored with each entry from `Date` (research R17). T026 passes.
- [X] T050 [P] [US1] Draw the Terminal's own glyphs as `aria-hidden` SVG components in `currentColor`: `packages/web/src/apps/terminal/TerminalIcon.tsx` (the dock and home screen icon, as the design draws it), `packages/web/src/apps/terminal/glyphs/PromptMark.tsx` (`❯`) and `packages/web/src/apps/terminal/glyphs/Clock.tsx` (`◷`) (research R16, FR-031). External links reuse 004's `src/cv/Arrow.tsx`.
- [X] T051 [US1] Write `packages/web/src/apps/terminal/Output.tsx` after T048: renders every `Node` kind (headings at the run's level + depth, `ul` lists, `a` links with 004's `Arrow`, `<time datetime>`, `button.command-chip` and `button.command-inline` named by `aria-label` = the full line with `data-req="006-terminal-FR-015 006-terminal-FR-034"` (plus FR-016 for suggestions, FR-048 for path replies, FR-050 for `ls` names), `columns`, `rows`, `json` rows as token spans with `data-req="006-terminal-FR-056"`), every string as a React text child.
- [X] T052 [US1] Write `packages/web/src/apps/terminal/CommandLine.tsx` (research R15, contracts/terminal.md): `form.prompt-line` with the `aria-hidden` `span.prompt` (`guest`, path, `◷ hh:mm` on desktop, `❯`; `data-req="006-terminal-FR-027 006-terminal-FR-046"`), a visually hidden `label` `Command`, `input.command-line` (`type=text`, `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`, `enterkeyhint="go"`, `maxlength={TERMINAL.maxLength}`, `data-focus-home`, `data-req` as contracts/terminal.md lists), Enter submits with `preventDefault`, Up and Down step history, a `paste` handler turning line breaks to spaces, Tab, Escape and every modified key left alone; and `span.cursor-mirror` (`aria-hidden`, `data-req="006-terminal-FR-032"`) drawing the text and a steady block at `selectionStart`, with `caret-color: transparent` on the input.
- [X] T053 [US1] Write `packages/web/src/apps/terminal/VimView.tsx` after T046 (research R12, contracts/terminal.md The vim view): `section.vim` named `{file} (read only)`; `div.vim-text` (`tabindex=0`, `role=document`, `aria-readonly`, `aria-roledescription` from site text, `aria-describedby` the status line, `data-focus-home` while open) handling only unmodified printable keys, Escape, Page Up and Down, Home, End and the arrows, never Tab; `div.vim-line` grids with an `aria-hidden` `span.vim-number` on the first row and `span.vim-code` carrying `--indent` for FR-063's wrap; `button.vim-fold` with `aria-expanded`; search `mark`s with `aria-current` on the current one; `div.vim-help`; `div.vim-status`; `div.vim-message` with `input.vim-entry` for `/` and `:` and the `:help` and `:q` chips; every `data-req` contracts/terminal.md lists.
- [X] T054 [US1] Write `packages/web/src/apps/terminal/Terminal.tsx` after T049, T051, T052 and T053 (contracts/terminal.md Structure): `div.terminal` (`data-shell-look`, `data-req` as listed), a visually hidden `h1` `Terminal`, `div.terminal-screen` (the scroll container) holding `div.greeting` (site text with `basics.name` and `basics.label`, or the site heading without a name; 5 chips), `section.run` per entry (`aria-labelledby` its `h2.run-command` with the `aria-hidden` `span.prompt`, carrying `data-req="006-terminal-FR-027 006-terminal-FR-046"`, and the line as typed) with `div.run-output`, and the prompt line; or `section.vim` in its place while `vim` is set. A control or `:q` runs through `session.run` and refocuses the command line; after each run, scroll the screen as research R14 sets (`scrollTop`, never `scrollIntoView`) and save it on scroll; `os` results call `props.os.open` and `props.os.exit`.
  - The scroll position is kept per shell (`shellScroll` in data-model.md), as a pixel offset fits only the width it was taken at; a minimized window gets its position back when shown, and `focus.ts` focuses an app's own `focusOnOpen` target with `preventScroll`, so the shell's focus move doesn't scroll the output to the command line (T036).
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
- [X] T062 [P] [US3] Extend `packages/web/test/terminal/engine/commands.test.ts` and `replies.test.ts`:
  - covers 006-terminal-FR-046: `pwd` shows `~`, and `~/work` after `cd work`; `cd`, `cd ~`, `cd /` and `cd ..` go home;
  - covers 006-terminal-FR-048: `cat nothing-here`, `cat work/nowhere`, `cd about`, `cat work`, `vim work` and `ls about` give FR-048's replies with the path as typed and `cat` or `ls` as controls; `ls about` lists that file alone.
- [ ] T063 [P] [US3] Write `packages/web/test/terminal/files.test.ts`:
  - covers 006-terminal-FR-043: folder names differ from files by their trailing slash, with color removed (computed style forced to one color);
  - covers 006-terminal-FR-046: after `cd work` the next prompt and the window title read `~/work` (`Terminal — ~/work`);
  - covers 006-terminal-FR-021: after `cd work`, minimize and restore, mobile Home and reopen, and a 1440 → 375 → 1440 resize keep `~/work` in the prompt and in `pwd`; closing and reopening starts at `~`;
  - covers 006-terminal-FR-050: each name in `ls`'s output runs `ls ~/{folder}` or `cat ~/{path}` as typed; a search over controls from `ls` reaches and reads every file without typing.

### Implementation for User Story 3

- [X] T064 [US3] Complete `buildFileSystem` in `packages/web/src/apps/terminal/engine/files.ts` (research R9, data-model.md table): `about`, `contact`, `work/`, `projects/`, `skills`, `education/`, `languages`, `interests`, `readme` and `specs/` in the design's order, left out when empty as the table sets, each file's `show` the matching builder from T044 and T060; `fileName(value)` (NFD, combining marks removed, lower case, `[^a-z0-9]+` → `-`, trimmed, empty → singular site text) and the clash rule. T061 passes.
- [ ] T065 [US3] Implement `ls`, `cd` and `pwd`, and FR-048's replies for `cat`, `cd`, `ls` and `vim`, in `packages/web/src/apps/terminal/engine/commands.ts` (contracts/commands.md): `ls` returns a `columns` block of `command` controls (`ls ~/{path}` for folders, ending in `/` with tone `folder`; `cat ~/{path}` for files) with the output carrying `data-req="006-terminal-FR-043 006-terminal-FR-050"`; `cd` returns `{ kind: 'cd' }`; `pwd` its path. In `session.ts`, `cd` sets `folder`; the prompt and `WindowTitle` show `formatPath(folder)`. T062 and T063 pass.

**Checkpoint**: The file system is complete and browsable by typing and by clicking.

---

## Phase 6: User Story 4 - Use the pocket terminal on a phone (Priority: P4)

**Goal**: On mobile, the Terminal is a pocket terminal of the site's own design: a recessed screen,
8 big command keys that become vim keys in the vim view, and room for the on-screen keyboard.

**Independent Test**: at 375 × 812 with touch, open the Terminal from the home screen, run `help`
and two CV commands with its keys and chips without typing, open `cv` and use its vim keys, and go
home. Repeat at 320 × 568 and 568 × 320.

### Tests for User Story 4 (REQUIRED) ⚠️

- [ ] T066 [P] [US4] Write `packages/web/test/terminal/pocket.test.ts`:
  - covers 006-terminal-FR-024: at 375 the Terminal is a `div.pocket` with its case, screen and keys; the command line, output and controls cases of T032, T033 and T034 also run at 375 with touch (`describe.each` over both shells);
  - covers 006-terminal-FR-025 (SC-001): by taps alone, from the greeting and the keys, every CV section, `site`, `specs` and every file is reached (a search over controls), each CV section within 2 taps and `help`, `about`, `work`, `projects` and `cv` in 1 key tap; in `pocket-keyboard` the command line and the last output are inside the visual viewport;
  - covers 006-terminal-FR-051: 8 keys in the design's order (`help`, `about`, `work`, `projects`, `skills`, `cv`, `ls`, `clear`), each a `button` named by its command, at least 44 × 44 px, each running its command; the toolbar is one Tab stop and Left, Right, Home and End move between keys;
  - covers 006-terminal-FR-052 (SC-012): at 320 × 568, 375 × 812, 568 × 320, 812 × 375 and 1023 × 700, the screen and keys fit below the header with no horizontal scroll and the output scrolls inside the screen; at 200% text zoom no key is cut off;
  - covers 006-terminal-FR-053: after a tap on the command line and the page made 300 px shorter at the same width, `data-keyboard` is set, the keys are hidden and the command line and newest output are visible; restoring the height brings the keys back;
  - covers 006-terminal-FR-054: the case is `aria-hidden`, holds no focusable element and none of its text is in the accessibility tree; with reduced motion a pressed key changes no `transform`;
  - covers 006-terminal-FR-058 and 006-terminal-FR-063 (US4 scenario 4): at 375 × 812 and 320 × 568 with touch, the `cv` key opens the vim view filling the pocket's screen, with line numbers, the status line and the message line; with the `long-words` fixture at 320 × 568, every line wraps inside the screen with no horizontal scroll, each continuation starts 2 characters past its line's text, and the number shows on the first row only;
  - covers 006-terminal-FR-066: with the vim view open the keys are `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `:q`, named `Down` to `Quit`, at least 44 × 44, acting on the view; after `:q` the command keys are back; a tap on a fold line toggles it.
- [ ] T067 [P] [US4] Extend `packages/web/test/terminal/controls.test.ts`, covers 006-terminal-FR-015: at 375 with touch, a tapped chip or key leaves the command line focused with `inputmode="none"` (no keyboard), and a tap on the command line itself removes it; `exit` on mobile shows the home screen with focus on the Terminal icon (US4 scenario 6).

### Implementation for User Story 4

- [ ] T068 [P] [US4] Write `packages/web/src/apps/terminal/useOnScreenKeyboard.ts` (research R15): while the command line has focus, a `visualViewport` `resize` that makes the visual viewport shorter at the same width reports the keyboard open; losing focus or the viewport growing back reports it closed.
- [ ] T069 [US4] Write `packages/web/src/apps/terminal/Pocket.tsx` after T068 (contracts/terminal.md The pocket terminal, research R18): `div.pocket` (`data-keyboard` from the hook, `data-req="006-terminal-FR-024 006-terminal-FR-025 006-terminal-FR-052 006-terminal-FR-053"`) holding `div.pocket-case` (`aria-hidden="true"`, `data-req="006-terminal-FR-054"`: power light, `cv-os pocket`, grille, `basics.name`), the `Terminal` in its screen, and `div[role=toolbar].pocket-keys` (`aria-label` `Command keys` or `Vim keys`, `data-req="006-terminal-FR-051 006-terminal-FR-066"`) of 8 `button.pocket-key` with roving focus (Left, Right, Home, End). A command key runs through the same path as a command control; a vim key sends its key to the vim view and keeps focus in it; `/` focuses `input.vim-entry`. In `app.tsx`, `Content` wraps `Terminal` in `Pocket` when `os.shell` is `mobile`. The greeting, `help`'s lead and the vim messages use the phone's site text there, and the prompt drops the time.
- [ ] T070 [US4] In `packages/web/src/apps/terminal/Terminal.tsx` and `CommandLine.tsx`, a control or key activated by touch sets `inputmode="none"` on the command line before focusing it, and the next pointer down on the command line removes it (research R15, FR-015).
- [ ] T071 [P] [US4] Write `packages/web/src/apps/terminal/pocket.css` (research R18, design values): the case in the glass with `radius.pocket`, the recessed screen (`radius.pocket-screen`, `flex: 1`, its own scroll), `typography.terminal-pocket` and `-pocket-narrow` below `@media (--token-breakpoint-pocket-narrow)`, keys of `size.pocket-key` (52) or `size.pocket-key-narrow` (48) in 4 columns below the screen in portrait, 2 columns of 4 to its right in `@media (orientation: landscape)` at 44 px or more, max widths, `[data-keyboard]` hiding the keys, a pressed state that only changes color under reduced motion. T066 and T067 pass.

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
- [ ] T073 [P] [US5] Extend `packages/web/test/fonts.test.ts`, covers 006-terminal-FR-028: in Chromium, the served JetBrains Mono's measured advance width equals `fonts.json`'s `advance` (0.6) within 0.001 em, so the desktop column count is right.
- [ ] T074 [P] [US5] Write `packages/web/test/terminal/screen-reader.test.ts`:
  - covers 006-terminal-FR-027: the command line's accessible name is `Command`; the prompt is `aria-hidden`; each run's heading name is the command as typed, with no prompt;
  - covers 006-terminal-FR-028: after Enter, `.terminal-status` holds the announcement once, focus stays in the command line, and scrolling earlier output doesn't change it; `cd work` announces `Now in ~/work`; `clear` announces `Cleared`;
  - covers 006-terminal-FR-029: one `h1` `Terminal`; an `h2` per run; in `projects` and `work` an `h3` per entry, with no section heading between; no level skipped (004's `ax.ts`); lists are `ul`, links `a`, controls `button`s named by their line; the reading order follows the boxes on screen.
- [ ] T075 [P] [US5] Write `packages/web/test/terminal/keyboard.test.ts`, covers 006-terminal-FR-026: Tab from the command line moves focus on and leaves its value unchanged; Shift+Tab comes back; `Alt+Shift+D` and `Alt+Shift+M` from the command line reach the dock and the menu bar; Ctrl and Alt key events reaching the page aren't `defaultPrevented`; Escape leaves the typed text.
- [ ] T076 [P] [US5] Extend `packages/web/test/terminal/vim.test.ts`, covers 006-terminal-FR-065: on opening, focus is on `.vim-text`, named and read only; the status region announces the file's name, read only, the line count and `:q`; a message change is announced once; fold lines expose `aria-expanded`; Tab moves to the chips, then out of the Terminal, and Shift+Tab back.

### Implementation for User Story 5

- [X] T077 [P] [US5] Write `packages/web/src/apps/terminal/engine/announce.ts` (research R13): `rows(block, columns)` (a text node `ceil(length / columns)` rows; each list item, heading and line at least 1) and `announce(command, block, columns, text)` returning `{ full }` up to 5 rows or the counted summary with its unit. In `engine/commands.ts`, `runLine` fills each output `Result`'s `announce` from it; `cd` gives `Now in {path}`. T072 passes.
- [ ] T078 [US5] In `packages/web/src/apps/terminal/session.ts` and `Terminal.tsx`, write each run's announcement, `Cleared`, the vim view's opening message and each vim message change to a visually hidden `div.terminal-status[role=status]` (`data-req="006-terminal-FR-028"`), replaced each time with a counter so the same text is announced twice, never on scroll (research R13). Confirm `CommandLine.tsx` and `VimView.tsx` handle no Tab and no modified key, and that opening the vim view moves focus to `.vim-text` and `:q` back to the command line. T073, T074, T075 and T076 pass.

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

- [ ] T079 [P] [US6] Write `packages/web/test/terminal/motion.test.ts`, covers 006-terminal-FR-032 (SC-008): a command's whole output is in the frame after Enter; the cursor has no animation at 0 and 6 s; with reduced motion, sampled frames while opening, running commands and pressing pocket keys show no `transform` or `scale` change, in both shells.
- [ ] T080 [P] [US6] Write `packages/web/test/terminal/modes.test.ts`, covers 006-terminal-FR-033: with forced colors the window, chips, keys, fold lines and command line have visible borders, the cursor uses `Highlight`, focus outlines show, and no element relies on a background image or color alone; with `prefers-reduced-transparency: reduce` the window is solid `color.shell-surface` with no `backdrop-filter`.
- [ ] T081 [P] [US6] Write `packages/web/test/terminal/targets.test.ts`, covers 006-terminal-FR-034: every control in every FR-035 state of both shells is at least 24 × 24 px, pocket keys at least 44 × 44, fold lines at least 24 × 24.
- [ ] T082 [P] [US6] Write `packages/web/test/terminal/accessibility.test.ts`, covers 006-terminal-FR-035: axe (WCAG 2.2 A and AA tags) finds nothing in each FR-035 state of both shells (just opened, after `help`, the vim view folded, with a fold open and a search, and with its key help, after an unknown command, after `ls`, inside a folder after `cat`, after `clear`, a long command typed; on desktop after `specs`, the Terminal menu open, minimized, maximized, two windows; pocket portrait and landscape, keyboard open, vim keys); 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep every part visible with no clipping or overlap.
- [ ] T083 [P] [US6] Write `packages/web/test/terminal/layout.test.ts`, covers 006-terminal-FR-023: with the `long-words` fixture, in a 400 px wide window and at 320 px, the output has no horizontal scroll and long words and URLs wrap; `ls` on a long folder at 320 px wraps names one per line; a mouse drag selects output text and copies it, and focus doesn't move to the command line; at 200% text zoom `cv`'s lines wrap within the window (US6 scenario 4).

### Implementation for User Story 6

- [ ] T084 [US6] Add the modes to `packages/web/src/apps/terminal/terminal.css` and `pocket.css` (research R19): under `prefers-reduced-transparency: reduce` and `forced-colors: active`, drop `backdrop-filter`, sheen and rim; in forced colors use `Canvas`, `CanvasText`, a solid border, outlined chips, keys and fold lines, the cursor block in `Highlight`, and the current match outlined; under `prefers-reduced-motion: reduce` the pressed key only changes color. The cursor never animates. T079 and T080 pass.
- [ ] T085 [US6] Fix any target, wrap or zoom failure T081, T082 and T083 find in `terminal.css`, `pocket.css` or the components, with tokens only (`size.terminal-control-row`, `size.terminal-chip`, `size.pocket-key*`). Record each fix here. T081, T082 and T083 pass.

**Checkpoint**: The Terminal holds WCAG 2.2 AA in every state, with every mode.

---

## Phase 9: User Story 7 - Use the Terminal offline (Priority: P7)

**Goal**: After one online visit to `/` or `/cv`, the Terminal opens offline in both shells and
every command gives the online output, with no offline message.

**Independent Test**: visit `/` once, go offline, open the Terminal at 375 and 1440 px and run
every command `help` lists; each output equals the online one.

### Tests for User Story 7 (REQUIRED) ⚠️

- [ ] T086 [P] [US7] Write `packages/web/test/terminal/offline.test.ts`, with 005's `test/helpers/offline.ts`, covers 006-terminal-FR-036 (SC-006): after one visit to `/`, and separately to `/cv` only, `/` offline at 375 and 1440 px opens the Terminal in the site's fonts (`document.fonts` loaded, no fallback face), every command `help` lists gives the same group text as online, and no offline message shows.

### Implementation for User Story 7

- [ ] T087 [US7] Confirm the Terminal needs nothing new offline (research R21, contracts/site.md Output): the `os` script and style sheet hold the Terminal and the spec list, the service worker's precache list and version follow them, and no command fetches. Fix only what T086 finds, in `packages/web/src/apps/terminal/` (never in the service worker unless the precache list misses a Terminal file). T086 passes.

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

- [ ] T088 [P] [US8] Extend `tools/site-check/test/shell-states.test.ts`, covers 006-terminal-FR-038: every Terminal state of contracts/cli.md (15 desktop, 12 mobile) is reached by real input on the real build; the summary lists `/` under `accessibility` in every Terminal state at both widths.
- [ ] T089 [P] [US8] Write `tools/site-check/test/terminal.test.ts`:
  - covers 006-terminal-FR-040 (SC-003, SC-011): the `terminal` part passes on the real build, with expected fields read from the CV document (a temporary CV with an extra work entry still passes); copies where `work` drops the end date, a project has no file, or the vim view drops a line fail with `missing-field`, `missing-file` and `json-mismatch` lines naming the command, field and shell, or the folder and entry, as contracts/cli.md shows;
  - covers 006-terminal-FR-009: on the real build, every CV command's output in both shells matches `terminalFields(resume, command)`;
  - covers 006-terminal-FR-010: a copy with the owner's email typed into `siteText.terminal` fails `npm run content-check`, naming the file and line (US8 scenario 3);
  - covers 006-terminal-FR-013: a spec folder added in a temporary copy of the repository shows in `specs` after the build.
- [ ] T090 [P] [US8] Extend `tools/site-check/test/keyboard.test.ts`, covers 006-terminal-FR-039: the Terminal's flow passes on the real build; a copy where the command line catches Tab fails with `trapped input.command-line`; a copy whose `exit` sends focus to `body` fails with `focus-target`, naming the step.
- [ ] T091 [P] [US8] Extend `tools/site-check/test/offline.test.ts`, covers 006-terminal-FR-041: a copy whose `os` script isn't precached fails the Terminal's offline run at both widths, naming the shell and width.
- [ ] T092 [P] [US8] Extend `tools/site-check/test/other-sites.test.ts`, covers 006-terminal-FR-038: `other-sites` records the Terminal's commands in both shells; a copy whose Terminal fetches an outside URL on `help` fails, naming the shell.
- [ ] T093 [P] [US8] Extend `tools/site-check/test/cli.test.ts`, covers 006-terminal-FR-042: the local command and the CI step are the same; every Terminal problem line names the shell, the state or command, and the width; two runs give the same result; the whole check stays within 005's time budget plus 3 minutes off CI.
- [ ] T094 [P] [US8] Extend `tools/site-check/test/shell.test.ts`, covers 006-terminal-FR-035 and 006-terminal-FR-038: a copy with the command line's name removed fails `accessibility` with `axe:label` in `desktop/terminal-open/1440px`; `layout` and `modes` pass on the real build with the Terminal's states and fail on copies with a fixed-width output and a blinking cursor.

### Implementation for User Story 8

- [ ] T095 [US8] Add the Terminal's states to `tools/site-check/src/shell-states.ts` (contracts/cli.md States): `terminal-open`, `terminal-help`, `terminal-vim`, `terminal-vim-search`, `terminal-vim-help`, `terminal-unknown`, `terminal-ls`, `terminal-cat`, `terminal-clear`, `terminal-long-command`, `terminal-minimized`, `terminal-maximized`, `terminal-two-windows`, `terminal-specs`, `terminal-menu`; `pocket`, `pocket-landscape`, `pocket-keyboard`, `pocket-vim`, `pocket-help`, `pocket-unknown`, `pocket-ls`, `pocket-cat`, `pocket-clear`, `pocket-long-command`, `pocket-vim-search`, `pocket-vim-help`; each reached from a fresh page by clicks, taps and typed keys, the search word read from the CV's first work summary.
- [ ] T096 [P] [US8] Add `terminalFields(resume, command)` to `tools/site-check/src/expected.ts`, built from 004's `expectedFields` with the Terminal's differences (no section labels, no `/cv`-only links) written once (research R20).
- [ ] T097 [P] [US8] Extend `tools/site-check/src/report.ts` (data-model.md Site check results): part `terminal` after `cv-app`; problem types `missing-field`, `out-of-order`, `json-mismatch`, `missing-file`, `extra-file`, `file-mismatch`, `offline-mismatch`; variants `<shell>/terminal/<command>/<width>px`, `<shell>/terminal/files/<width>px`, `<shell>/terminal/json/<width>px`, `desktop/terminal-keyboard/1440px`.
- [ ] T098 [US8] Write `tools/site-check/src/parts/terminal.ts` after T095 to T097 (contracts/cli.md `terminal`): in each shell, run every CV command by typing it and compare each group's text, links and `<time datetime>` in order with `terminalFields`; compare `cat cv.json`, `cat cv.json | jq` and the vim view after `zR` with `JSON.stringify(resume, null, 2)` line by line; list every folder and `cat` every file, checking one file per entry and spec and that each matches the named command. Run it from `tools/site-check/src/check.ts` after `cv-app`. T089 passes.
- [ ] T099 [US8] Extend the existing parts (contracts/cli.md Parts): `parts/accessibility.ts` runs axe in every Terminal state; `parts/keyboard.ts` adds FR-039's flow at 1440 × 900 (open from the dock, `help`, a command from its output with Enter, Up, `cv`, `j`, `za`, `:q`, Tab and Shift+Tab, `Alt+Shift+D`, Enter on the Terminal's dock item back to the command line, `exit`), checking the focus target and a visible indicator at each step; `parts/offline.ts` opens the Terminal offline after `/` and after `/cv` only, at 375 and 1440, runs every command `help` lists and compares each group's text with the online run; `parts/other-sites.ts` records requests while the Terminal opens and every command runs, in both shells; `parts/fonts.ts` adds `terminal-help` and `pocket-vim`; `parts/layout.ts` adds 320 × 568, 568 × 320, a 400 px window, 200% and 400% zoom and text spacing in `terminal-help`, `terminal-vim`, `pocket` and `pocket-vim`; `parts/modes.ts` adds the Terminal to the reduced motion and forced colors sequences. T088 and T090 to T094 pass.

**Checkpoint**: Every pull request proves the Terminal in both shells.

---

## Phase 11: Polish & Constitution Verification

**Purpose**: Traceability, speed, the audits, the full verification, the owner's manual checks and
the single PR

- [ ] T100 [P] Write `packages/web/test/terminal/data-req.test.tsx`, covers 006-terminal-FR-037: every target in contracts/terminal.md's `data-req` table carries its IDs in the rendered Terminal (desktop after `help`, `ls`, `specs`, `cd work` (the prompt and the window title), an unknown command, a missing path and with the vim view searched and its help open; mobile with the pocket and vim keys), and every `006-terminal-FR-###` in a `data-req` names an existing requirement.
- [ ] T101 [P] Extend `packages/web/test/self-check.test.ts`, covers 006-terminal-FR-010, 006-terminal-FR-031 and 006-terminal-FR-037: `npm run content-check`, `npm run token-check` and `npm run traceability` pass on the repository with no exception or skip marker added for the Terminal.
- [ ] T102 [P] Write `packages/web/test/terminal/performance.test.ts` (SC-002): for every command `help` lists, `cv` included, Enter to the output in the frame is under 100 ms at 1440 px, and under 300 ms with 4× CPU throttling over CDP.
- [ ] T103 Run `npm run traceability` after T100 (Constitution III, SC-009): it exits 0, its PASS line counts `006-terminal`'s 66 active requirements among the approved specs, and every row of Requirement Coverage below has a passing test. Record the PASS line here.
- [ ] T104 [P] Verify research R21 (**Verify**): on the real build, the root's compressed script, style sheet and HTML are near 102 KB, 12 KB and 16 KB, and Lighthouse's mobile and desktop scores on `/` are 90 or more in every category (SC-005). If mobile Performance drops below 90, apply R21's fallbacks in order and measure again. Record both here.
- [ ] T105 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/os-core/`, `packages/web/` and `tools/site-check/`:
  - **X**: no package added; the abstractions added are exactly plan.md's Dependencies table (add any helper this list created to it, with its reason); no agent skill added;
  - **IV**: `site-text.ts` holds no CV fact and no design value; no Terminal script reads a token outside `metrics.ts`; `data.ts` is the only importer of `virtual:cv-spec-list`; `cv.json` is never typed by hand;
  - **V**: the Terminal declares both shells beside its code; `os-core` gained only the view id and the placement; the shell changes are the general fields of contracts/shell.md, with no `'terminal'` special case in the shells;
  - **VII**: the desktop still opens with only the CV window; the Terminal is after the CV in the dock and on the home screen and never opens by itself; `/cv` is untouched;
  - **IX**: the icon, glyphs, case and colors are the design's own, with no Apple or system font.
- [ ] T106 Run the full verification after T103 to T105: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with the `terminal` part in both shells and every Lighthouse category at 90 or more for `/` and `/cv` on both profiles (SC-005, SC-009).
- [ ] T107 Run quickstart.md scenarios 1 to 6 and record any deviation here. Write scratch output to the scratchpad. Scenario 4.3 edits files: revert each change with `git checkout`. Scenarios 7 to 9 are T108.
- [ ] T108 Owner action, by hand (quickstart 7 to 9, research R24): screen readers on a desktop (NVDA with Firefox or VoiceOver with Safari) and on a phone (VoiceOver or TalkBack) through stories 1, 3, 4 and 5, including the vim view in browse and focus mode (SC-004); real phone keyboards on iOS Safari and Android Chrome (FR-053); forced colors in Edge and reduced transparency (FR-033); and comparing every state with `design/exports/` (FR-031, SC-010). Record each result here and in the PR. Under the constitution's interim provision on deferred manual checks, the owner may defer them to the final testing phase: then record that here, list each one in the PR, and leave this task open.
- [ ] T109 Commit the remaining work with Conventional Commits, merge 005 again if it changed (T001), push `006-terminal` and open one pull request to `main` once 005's has merged, so it holds only 006's changes (Constitution XI, research R1):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/006-terminal/spec.md` and `specs/006-terminal/tasks.md`; records the token rename (T004) and that the Terminal's tokens were written into the hand-written export under the interim provision on local mockups; and records the results of T104, T107 and T108, listing every manual check deferred under the interim provision on deferred manual checks.
  - Confirm the CI jobs run and pass, and that the `site` job summary matches a local `npm run site-check` on the same commit (FR-042). Merging is the owner's.

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

Every FR in spec.md and the test task that covers it:

| Requirement | Test task(s) |
|-------------|--------------|
| 006-terminal-FR-001 | T029, T030 |
| 006-terminal-FR-002 | T030 |
| 006-terminal-FR-003 | T007, T030, T031 |
| 006-terminal-FR-004 | T012, T030 |
| 006-terminal-FR-005 | T033 |
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
