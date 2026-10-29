---

description: "Task list for the Requirement Inspector"
---

# Tasks: The Requirement Inspector

**Input**: Design documents from `/specs/007-requirement-inspector/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/inspector.md](./contracts/inspector.md),
[contracts/requirement-data.md](./contracts/requirement-data.md),
[contracts/shell.md](./contracts/shell.md), [contracts/site.md](./contracts/site.md),
[contracts/cli.md](./contracts/cli.md), [quickstart.md](./quickstart.md), and the design in
[design/](./design/): [wireframes.md](./design/wireframes.md), [README.md](./design/README.md),
the 14 Penpot PNG exports in `design/exports/`, the
[Penpot link](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=83c58681-afbf-80ee-8008-dc17f0627e87)
and the signed [review.md](./design/review.md) (**007 Requirement inspector — Graphite**, commit
`3ab4dfc`, 2026-10-28).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `007-requirement-inspector-FR-###` IDs it covers, and
every FR in spec.md (FR-001 to FR-034, all active) is covered by at least one test task (see
Requirement Coverage at the end).

**Organization**: Tasks are grouped by user story.

- US1 is the spec view itself: "Show specs" in every window and full-screen view, the menu item,
  the titles, the view with its groups and requirements, "What's this?", and Back restoring the
  app, in both shells.
- US2 closes the trace: each requirement's spec link and tests, the commit link, references in
  the text as links, and the uncommitted-changes note.
- US3 gives About this site the shell's own spec view.
- US4 adds focus moves, structure, keyboard and touch operation.
- US5 adds the cross-fade with its reduced-motion rule, forced colors, layout and zoom, and the
  design's values.
- US6 proves the inspector offline and on the site alone.
- US7 extends the site check to the inspector in both shells.

The design gate, the token rename and the tokens, 001's additive exports, the `os-core` state,
the site text, the link forms, the repository copy's Git commit, the requirement data reader and
its build step, and the inspector test helper come first, in Phase 2, because every story builds
on them.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US7)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 007-requirement-inspector-FR-006"

## Not in this feature

As the spec's Assumptions set: Contact and Settings; a site-wide switch, labels on elements,
picking an element or outlining the elements of a requirement; a Terminal command that shows
specs; filtering, searching or reading whole specs in the site; test results, CI runs, coverage
figures and pull request history; editing specs from the site; the inspector on `/cv`; games,
easter eggs and translations.

The design is in Penpot with its link, so 007 owes nothing to the interim provision on local
mockups beyond writing its tokens into the hand-written export (research R13, R17).

## Path Conventions

- CV data, read only through `@cv/content` (Constitution IV): `packages/content/site.json`
  (`repository`) is the only CV file the inspector reads
- Tokens, read only through `@cv/tokens`: `packages/tokens/penpot/tokens.json` (the hand-written
  export) and the generated `packages/tokens/src/tokens.generated.{css,ts}`
- 001's modules, changed additively: `tools/traceability/src/{specs,test-files}.ts`, tests in
  `tools/traceability/test/`
- The shared core: `packages/os-core/src/{types,state,reducer,index}.ts` and
  `packages/os-core/test/`
- The shell (005, 006), changed as contracts/shell.md sets: `packages/web/src/os/`
  (`Os.tsx`, `View.tsx`, `focus.ts`, `shell-props.ts`),
  `packages/web/src/shells/desktop/{TitleBar,Window,MenuBar}.tsx`,
  `packages/web/src/shells/mobile/FullScreenView.tsx`, `packages/web/src/site-text.ts`,
  `packages/web/src/styles/os.css`, `packages/web/src/pages/ShellPage.tsx`,
  `packages/web/src/render.tsx`
- The inspector (new): `packages/web/src/inspector/` (`ShowSpecs.tsx`, `SpecView.tsx`,
  `SpecGroup.tsx`, `Requirement.tsx`, `InlineText.tsx`, `WhatsThis.tsx`, `Notes.tsx`,
  `derive.ts`, `data.ts`, `transition.ts`, `glyphs/`, `inspector.css`)
- Link forms (new): `packages/web/src/format/repository.ts`
- The requirement data reader (new, build time): `packages/web/scripts/requirements/`
  (`index.ts`, `version.ts`, `carried.ts`, `inline.ts`, `read.ts`), called by
  `packages/web/scripts/build-site.ts`, beside 006's `packages/web/scripts/spec-list.ts`
- Tests:
  - core: `packages/os-core/test/`
  - requirement data (Node): `packages/web/test/requirement-data/*.test.ts`, fixtures in
    `packages/web/test/requirement-data/__fixtures__/`
  - inspector in the browser, on the real build: `packages/web/test/inspector/*.test.ts(x)`
  - the inspector test helper: `packages/web/test/helpers/inspector.ts`
  - web: `packages/web/test/{repository,self-check}.test.ts`, 005's
    `packages/web/test/shell/site-text.test.ts`
  - 001: `tools/traceability/test/{specs,test-files}.test.ts`
  - site check: `tools/site-check/test/`
- The site check: `tools/site-check/src/` (`check.ts`, `shell-states.ts`, `report.ts`,
  `parts/*.ts`)
- Shared test code from 004 to 006: `packages/web/test/helpers/{site,browser,ax,copy,fixtures,offline,shell,terminal}.ts`,
  `tools/site-check/test/helpers/{sites,root}.ts` (`root.ts` builds through `repoCopy`)

## Rules that apply to every task

- **No design literal and no CV fact in source** (FR-009, FR-021, Constitution IV):
  - Everything under `packages/web/` and `packages/os-core/` except `test/` is source for 002's and
    003's checks, with no exception and no skip marker added.
  - Style sheets use only `var(--token-…)`, `@media (--token-…)` and
    `@container (--token-breakpoint-…)`. Inside `@media (forced-colors: active)`, system colors
    such as `Highlight`, `Canvas` and `CanvasText` are allowed (003 FR-056).
  - The inspector reads no design value in script: its layout is CSS only, and the cross-fade
    reads `motion.duration.fast` and `motion.easing.standard` as CSS custom properties (R13).
  - Every non-CV word is in `src/site-text.ts`, under `inspector`. The only CV value the inspector
    reads is `siteData.repository`.
- **No markup from specs** (research R7): nothing in the inspector uses `dangerouslySetInnerHTML`,
  `innerHTML` or `eval`. Requirement text reaches the page only as React text children of
  `InlineText`'s elements. Every `href` comes from `src/format/repository.ts`, or is an `http` or
  `https` address `inline.ts` accepted.
- **`data-req`** (FR-029): written only as a JSX string attribute,
  `data-req="007-requirement-inspector-FR-…"`, on the elements contracts/inspector.md's `data-req`
  targets table names, listing every ID it gives, separated by spaces. Every inspector element is
  in a shell module, so the shell's view lists it (FR-011). 004's, 005's and 006's attributes stay
  where they are.
- **No app declaration changes** (research R4, contracts/shell.md): `apps/cv/` and
  `apps/terminal/` are not edited, nor the Terminal's session store or engine. The inspector is
  shell code.
- **Test titles**: every test or `describe` title carries only full, existing IDs, such as
  `describe('007-requirement-inspector-FR-006: a view lists exactly what its app carries', …)`.
  Tests for success criteria without an FR use titles such as `describe('… (SC-005)', …)`.
  Structural tests that serve no single requirement carry no ID. No other `fr-` text in any letter
  case.
- **Browser tests act like a visitor** (005 R17): the real build, served by `serveBuilt` (004),
  opened in Chromium through `test/helpers/shell.ts` and `test/helpers/inspector.ts`, driven by
  clicks, taps, typed keys and viewport changes. No test hook in the site.
- **Fixtures and tests may hold literal values and CV text.** They live in `test/` and
  `__fixtures__/`, which no check searches. Never copy one into source.
- **No test writes inside the repository**: copies, builds and fixture repositories go to
  temporary directories. Only `npm run build` writes, under `packages/web/dist/`. No test runs Git
  in the repository itself except read-only (`rev-parse`, `status`).
- **The token export is written in Penpot's form** (`JSON.stringify(value, null, 2)`, no final
  newline) under the interim provision on local mockups.
- **Traceability stays red until Phase 10**: 007's spec is Approved, so `npm run traceability` and
  001's self-check tests fail on uncovered `007-requirement-inspector` IDs until every story's
  tests exist. Any other failure is a real one.
- **006's amendments land on their own branch** (owner, 2026-10-29). Nothing here edits 006's
  files beyond what contracts/shell.md lists for the shell. If they merge into `main` first, T001's
  merge is repeated before the pull request (T089); they change nothing this plan relies on.
- Code uses erasable TypeScript only, with explicit `.ts`/`.tsx` extensions on relative imports.
- Run everything with Node 26 active (`nvm use`).
- Commits use Conventional Commits and carry no AI or Claude attribution (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 006's Terminal in the branch, and a clean baseline

- [X] T001 Merge `main` into `007-requirement-inspector` before any code (research R1): `git fetch origin main`, `git merge origin/main` as a merge commit (no rebase, no squash), keeping both branches' `specs/` files. Then `npm ci` with Node 26. Record here which ref was merged and its commit. If `main` changes again before the pull request opens (006's amendments, T089), merge it again the same way.
  - Done 2026-10-29: 006's pull request (#24) had merged into `main` as `bba9650`; merged cleanly as `d4c92f9`, with no conflict. 006's `menuItems`, `WindowTitle`, the Terminal's session store (`apps/terminal/session.ts`) and `readSpecList` (`scripts/spec-list.ts`) are present as research R1 expects.
- [X] T002 Record the baseline after T001: `npm ci`, then `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check` and `npm run site-check` exit 0. `npm run traceability` fails only on the 34 uncovered `007-requirement-inspector` IDs (the rule above); any other failure is reported to the owner, not fixed here. Confirm `tsconfig.json` and `vitest.config.ts`'s `TEST_INCLUDE_GLOBS` already cover `packages/web/scripts/requirements/`, `packages/web/src/inspector/`, `packages/web/test/requirement-data/` and `packages/web/test/inspector/`; change them only if they don't, and say so here.
  - Done 2026-10-29, recorded once Phase 2's code was in (an earlier session wrote it before this baseline): `npm run typecheck`, `npm run content-check`, `npm run token-check` and `npm run site-check` (13 of 13 parts) exit 0. `npm test` fails only on the expected reds: 001's and 004's traceability self-checks (the uncovered `007-requirement-inspector` IDs), `tokens.test.ts`'s "every token in the export is read" (until T043, T065) and T016's FR-001 assertion (until T034). `tsconfig.json` (`packages/**/*.ts(x)`) and `TEST_INCLUDE_GLOBS` (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) already cover the four folders; neither changed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate, the tokens, 001's additive exports, the OS state, site text, link
forms, Git in test copies, the requirement data and its build step, and the inspector test helper

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: T003 comes first. No task that creates or changes UI may start
until it is done.

- [X] T003 Confirm the design gate in `specs/007-requirement-inspector/design/` (plan Constitution Check II): `wireframes.md` covers every state the spec's Design section lists, in both shells; `exports/` holds the 14 PNGs (8 desktop at 1440, 4 phone at 375, one at 320, one at 812 landscape); the Penpot link is in `spec.md`, `design/README.md` and `design/review.md`; `review.md` reads `**Status**: Approved`, is signed by the owner, names commit `3ab4dfc` and 2026-10-28, and records the look as original (FR-021, Constitution IX). Write the result here.
  - Done 2026-10-29: passes. `wireframes.md` has desktop states 1 to 8 (with 7b) and mobile states 1 to 6, covering every state spec.md's Design section lists in both shells, plus keyboard, screen readers, modes and site text; `exports/` holds the 14 PNGs (8 `desktop-*-1440`, 4 `phone-*-375`, one `-320`, one `landscape-812`); the Penpot link is in spec.md (Design), `design/README.md` and `design/review.md`; `review.md` reads `**Status**: Approved`, signed by Alex Profir for commit `3ab4dfc` on 2026-10-28, with the original-look box ticked.
- [X] T004 Rename the design's two width tokens before any code reads them (research R13), in `specs/007-requirement-inspector/design/README.md`'s Proposed tokens table only, changing no value: `size.spec-two-column` (`dimension`, `480px`) becomes `breakpoint.spec-two-column` (`dimension`, `480`), and `size.spec-wide` (`dimension`, `700px`) becomes `breakpoint.spec-wide` (`dimension`, `700`). Replace the sentence under the table about `color.base.mint` and `color.base.amber` with one saying 006 added them. Add one sentence above the table pointing to research R13. Commit it alone as `docs: rename the inspector's width tokens to breakpoints (007)`.
- [X] T005 Add the inspector's 8 tokens to `packages/tokens/penpot/tokens.json` exactly as T004's table now lists them, in the hand-written export's form: `color.shell-text-soft` (`{color.base.haze}`), `color.status-approved` (`{color.base.mint}`) and `color.status-draft` (`{color.base.amber}`) in the `light` set beside 005's shell colors; `size.spec-bar-touch` (48), `size.spec-id-column` (64) and `size.spec-measure` (760) as unitless `sizing` in `base`, as `size.title-bar` is; `breakpoint.spec-two-column` (480) and `breakpoint.spec-wide` (700) as `dimension` in `base`, as `breakpoint.pocket-narrow` is. Run `npm run token-output` to regenerate `packages/tokens/src/tokens.generated.css` and `packages/tokens/src/tokens.generated.ts`, then `npm run token-check` (exits 0, no exception).
  - `packages/web/test/tokens.test.ts`'s "every token in the export is read" stays red until `inspector.css` reads the new tokens (T043, T065).
- [X] T006 [P] Write 001's new cases first (contracts/requirement-data.md Changes to 001), with fixtures in `tools/traceability/test/__fixtures__/`:
  - `tools/traceability/test/specs.test.ts`, covers 007-requirement-inspector-FR-013: `specTitle` gives the text after `Feature Specification: ` of the first heading, and `null` without one; `requirementText` gives a one-line requirement, one continued on indented lines (joined with single spaces), one followed by a nested list item, a heading and a blank line (each ending it), one inside an HTML comment or a fence (blanked, as `parseSpec` blanks it), and the `**FR-###**:` and `**FR-###** :` forms; every existing `parseSpec` case still compares whole, unchanged;
  - `tools/traceability/test/test-files.test.ts`, covers 007-requirement-inspector-FR-008: `TestNode.title` is the literal title, a template literal with `${shell}` kept as its source text, and `''` for a computed title; `location` is the call's start; `coveringTests` gives each counting test with its effective tokens (own and ancestors'), and leaves out `test.skip`, `it.todo`, `test.skipIf(true)`, an unrecognized call, and a test inside a skipped `describe`.
- [X] T007 Add 001's exports after T006 (research R6, contracts/requirement-data.md): `specTitle(text)` and `requirementText(text, entry)` in `tools/traceability/src/specs.ts`, reusing `parseSpec`'s comment and fence blanking; `TestNode.title`, `TestNode.location` and `coveringTests(nodes)` in `tools/traceability/src/test-files.ts`, using `coverageOf`'s counting rule. Additive only: `npm run traceability`'s output and exit codes, and every existing 001 test, are unchanged. T006 passes.
- [X] T008 [P] Write the OS state's tests first (contracts/shell.md `@cv/os-core`, data-model.md State transitions), with 005's `desktop()`, `mobile()` and `run()` helpers:
  - `packages/os-core/test/reducer.test.ts`, covers 007-requirement-inspector-FR-002, 007-requirement-inspector-FR-003, 007-requirement-inspector-FR-004 and 007-requirement-inspector-FR-017: `initialState` has `specs: {}`; `showSpecs { view, appScroll }` on an open view adds `{ appScroll }`, brings the window to the front, focused, restoring it if minimized, keeps every window's geometry, and emits focus `{ kind: 'spec-heading', view }`; on a closed view, or one already showing specs, it changes nothing; `showApp` removes the entry, brings the window to the front and emits focus `{ kind: 'show-specs', view }`, and does nothing for a view without an entry; one view's `showSpecs` leaves another's entry, geometry and order equal; `close` removes the entry, so `open` afterwards shows the app; desktop `open` that creates a new window removes a stale entry, while `open` of an open or minimized window keeps it; `minimize`, `toggleMaximize`, `dragMove`, `dragResize`, `focus`, `next`, `mobileHome`, `mobileOpen` and `shellChanged` both ways keep it; on mobile, `showSpecs` on the open view works and the entry survives `mobileHome` then `mobileOpen`;
  - `packages/os-core/test/invariants.test.ts`, covers 007-requirement-inspector-FR-004: 005's random runs, with `showSpecs` and `showApp` added to the action pool, keep every invariant.
- [X] T009 Extend `@cv/os-core` after T008 (research R2, contracts/shell.md): `OsState.specs: Partial<Record<ViewId, { appScroll: number }>>`, the actions `{ type: 'showSpecs'; view: ViewId; appScroll: number }` and `{ type: 'showApp'; view: ViewId }`, and the focus targets `{ kind: 'spec-heading'; view: ViewId }` and `{ kind: 'show-specs'; view: ViewId }` in `packages/os-core/src/types.ts`; `specs: {}` in `packages/os-core/src/state.ts`'s `initialState`; the two actions, `close`'s removal and desktop `open`'s removal on a new window in `packages/os-core/src/reducer.ts`; any new type exported from `packages/os-core/src/index.ts`. No invariant ties `specs` to open windows (data-model.md). T008 passes; `npm run typecheck` passes (`packages/web/src/os/focus.ts` may need a placeholder branch for the new targets until T036; if so, it returns `null` so focus falls back as 005 sets).
- [X] T010 [P] Add the `inspector` group to `packages/web/src/site-text.ts` exactly as data-model.md Site text and design/wireframes.md#site-text set: `show` (`Show specs`), `showShort` (`Specs`), `showName` (`Show specs for {view}`), `back` (`Back to {view}`), `windowTitle` (`{view} · Specs`), `headerSuffix` (`Specs`), `region` (`{view} specs`), `heading` (`Specs for {view}`), `shellName` (`the shell`), `ledeApp` (with `{view}`), `ledeShell`, `requirements` and `specs` (singular and plural), `builtFrom` (`built from`), `notShown` (singular and plural, with `{n}`), `openSpec`, `approved`, `draft`, `inTheSpec` (`In the spec, line {line}`), `tests` (`Tests`), `testsCount` (`Tests, {n}`), `noTests` (`No test covers this yet.`), `whatsThis` (button and heading, both paragraphs, the chain's five labels, its spoken form `Feature, then Spec, then Requirement, then Interface, then Tests`, `The site's repository on GitHub`), `offline` (quickstart 8's sentence) and `uncommitted` (with `{commit}`). Use 005's `fill` for patterns. The page title reuses 005's `– {site}` rule. No CV fact and no design value.
- [X] T011 [P] Write `packages/web/test/repository.test.ts`, covers 007-requirement-inspector-FR-010: `fileUrl` gives `{repository}/blob/{commit}/{path}`, adds `?plain=1#L{line}` for a `.md` file and `#L{line}` for any other file when a line is given, and no anchor without one; `commitUrl` gives `{repository}/commit/{commit}`; `shortCommit` gives the first 7 characters; each with a repository with and without a trailing `/`; and the real `site.json` has a `repository` (research R8).
- [X] T012 Write `packages/web/src/format/repository.ts` after T011 (contracts/requirement-data.md Links): `fileUrl(repository, commit, path, line?)`, `commitUrl(repository, commit)` and `shortCommit(commit)`. Pure; no import of `@cv/content`. T011 passes.
  - `#L` on its own read as a hex color to the token check (`literal-value`), so the anchor is built as `#` plus `L{line}`; T011 passes and `npm run token-check` exits 0.
- [X] T013 [P] Give test copies a Git history (research R8, contracts/site.md Tests that build a copy) in `packages/web/test/helpers/copy.ts`: `repoCopy()` also copies `tools/*/test` (with their `__fixtures__`) and a `.gitignore` leaving out `node_modules` and `dist`, then runs `git init`, `git add -A` and one `git commit` with a fixed author, committer, date and message (environment variables, never the user's Git config), so a copy builds clean. Add `dirty(root)`, which writes one untracked file. Confirm `snapshot()` and `changedFiles()` leave `.git/` out, and that `tools/site-check/test/helpers/root.ts`, which builds through `repoCopy`, still works. Run 004's to 006's copy-building tests: they pass unchanged.
- [X] T014 [P] Write `packages/web/test/requirement-data/version.test.ts`, covers 007-requirement-inspector-FR-010: in a temporary Git repository, a clean tree gives `HEAD`'s commit and `dirty: false`; a changed file, a staged file, a deleted file and an untracked file each give `dirty: true`; a file `.gitignore` excludes doesn't; a folder that isn't a repository, and a repository with no commit, throw `can't tell which commit the site is built from (…)`.
- [X] T015 [P] Write `packages/web/test/requirement-data/inline.test.ts`, covers 007-requirement-inspector-FR-007, with `__fixtures__/inline.md` holding every form today's specs use (collect them from `specs/*/spec.md` while writing it): `` `code` ``; `**strong**`, `*em*`, `_em_`; `~~struck~~`; `[text](https://…)` and `[text](http://…)` as `link`; `[text](../005-os-shell/spec.md)` as `file`, resolved from the spec's folder to a repository path; `[text](mailto:…)` and `[text](javascript:…)` as text; `005 FR-013` as a `ref` with its feature, ID, line and text as written; a bare `FR-011` as a ref to the same spec; `001 FR-010 to FR-012`, `005 FR-025 to FR-029`, `FR-003 and FR-004`, `FR-001, FR-002, and FR-003` after a numbered reference resolving to that spec; a reference to an unknown spec or requirement, or to a removed one, as text; nested marks; unclosed marks as text. The output is a plain `Inline[]` with no HTML string anywhere.
- [X] T016 [P] Write `packages/web/test/requirement-data/carried.test.ts`, covers 007-requirement-inspector-FR-006, 007-requirement-inspector-FR-011 and 007-requirement-inspector-FR-012:
  - on a fixture site in `__fixtures__/carried/` (`src/apps/index.ts` listing two apps, each `app.tsx` taking `Content` from an import; a module both apps import; a shell module; a type-only import carrying a `data-req` in its file that must not count; an `export … from` re-export; a computed `data-req` that must not count; a package import, skipped), each view's set, `modules` and `roots` are exactly the expected ones, a module reached from an app and the shell counts for both, and an `app.tsx` whose `Content` can't be traced throws naming the file;
  - on the real source: `views.shell` holds 005's menu bar, dock, window frame, home screen and About this site requirements and 007's control requirements, and none of 004's; `views.cv` holds 004's; `views.terminal` holds 006's, including output requirements no command has produced; every `data-req` in every module reached from the shell's roots is in at least one view; no `.ts` or `.tsx` file outside `packages/web/src` (packages and tools, tests and fixtures excluded) holds a `data-req`;
  - **bundler proof** (research R5): after a Vite build of the real source, the walker's modules from `src/client/os.tsx` equal Rolldown's module list for the `os` chunk (packages and virtual modules excluded).
  - The real-source assertion that `views.shell` holds `007-requirement-inspector-FR-001` stays red until `ShowSpecs.tsx` carries it (T034); every other case passes, the bundler proof included.
- [X] T017 [P] Write `packages/web/test/requirement-data/read.test.ts`, covers 007-requirement-inspector-FR-008 and 007-requirement-inspector-FR-013, on a fixture repository in `__fixtures__/repo/` (two specs, one `Approved` and one `Draft`, a removed requirement, a requirement with two counting tests, a skipped test, a `todo`, a group-inherited token, and a draft requirement no test covers):
  - `specs` are in number order with `feature`, `number`, `title`, `status`, `file` and `active` (removed not counted), and equal `readSpecList`'s numbers, titles and statuses; `requirements` hold only active, carried requirements, with `line` and `text` from `requirementText` and `parseInline`; a requirement's `tests` are exactly its counting tests, by name, file and line, in file then line order; the draft requirement's `tests` is empty; `views` are sorted by spec number then ID, each ID once, `shell` first then apps in `APPS` order;
  - in a copy of the fixture, changing a requirement's text, adding a test, removing a requirement and adding a `data-req` each change the data with no other edit;
  - the build failures of data-model.md's validation rules: two specs sharing a number, and a view holding an ID with no active requirement, each throw with the contract's message;
  - on the real repository (**cross-check**): every active requirement of an approved spec that some view lists has at least one test exactly when `runCheck` doesn't report it uncovered, and the counts agree.
- [X] T018 [P] Write `packages/web/test/requirement-data/public.test.ts`, covers 007-requirement-inspector-FR-014: the built `assets/requirements-*.json` (from `builtSite()`) parses and matches data-model.md's shape with no other key at any level; every `file` and `path` is repository-relative with `/`; it holds none of the machine's absolute repository path, home directory, user name, or the value of any environment variable longer than 8 characters (searched for each); `buildRequirementData` run twice on the same copy gives byte-identical JSON; its name's hash is the first 8 hex characters of its SHA-256; it is in `site-manifest.json` and in `sw.js`'s precache list.
- [X] T019 Write `packages/web/scripts/requirements/version.ts` after T014: `readVersion(root)` with `git rev-parse HEAD` and `git status --porcelain`, run with `execFileSync` (no shell), throwing `can't tell which commit the site is built from (<reason>)` (research R8). T014 passes.
- [X] T020 Write `packages/web/scripts/requirements/inline.ts` after T015: `parseInline(text, { feature, specDir, lines })`, pure, as research R7's table sets. T015 passes.
- [X] T021 Write `packages/web/scripts/requirements/carried.ts` after T016: `readCarried(root)` returning `Carried` (data-model.md), following static relative `import` and `export … from` (type-only skipped, packages skipped) with 001's `oxc-parser` as `readUiFile` uses it, reading `data-req` with 001's `readUiFile`; app roots found from `packages/web/src/apps/index.ts` and each `app.tsx`'s `Content`; the shell's roots `src/client/os.tsx` and `src/pages/ShellPage.tsx`, never entering an app's content root. T016 passes, the bundler proof included.
- [X] T022 Write `packages/web/scripts/requirements/read.ts` and `index.ts` after T007, T019 to T021: `readRequirementData(root, version, carried)` as research R6 sets, with `readSpecList` (006) for numbers, titles, statuses and files, 001's `parseSpec`, `requirementsOf`, `requirementText`, `readTestFile` and `coveringTests` over every test file 001 reads (001's own file list, not a new glob), and the validation failures of data-model.md; `buildRequirementData(root)` runs `readVersion`, `readCarried`, then `readRequirementData`. Deterministic key order (contracts/requirement-data.md). T017 passes.
- [X] T023 Write the data file from the build after T022 (contracts/requirement-data.md The build, contracts/site.md): `packages/web/scripts/build-site.ts` calls `buildRequirementData` on the repository root after the client build, writes `assets/requirements-<hash>.json` (`JSON.stringify(data)`, hash as Vite names assets), lists it in `site-manifest.json` and the service worker's precache as every built file is, and passes `/assets/requirements-<hash>.json` to `renderShell` as `assets.requirements`; `packages/web/src/render.tsx` and `packages/web/src/pages/ShellPage.tsx` put it on `#os` as `data-requirements`, outside what React hydrates. Failures print `site build failed: <message>` and exit 2, as the contract's examples show. `cv.html` and `404.html` are unchanged. T018 passes; 004's to 006's build and page tests pass.
- [X] T024 Write the inspector test helper `packages/web/test/helpers/inspector.ts`, on 005's `test/helpers/shell.ts` and 006's `test/helpers/terminal.ts`: `showSpecs(page, view, shell)` (opens the view if needed, clicks or taps its `button.show-specs`, waits for `section.spec-view[data-view=…]` with its groups), `leaveSpecs(page, view)` (`button.spec-back`), `readView(page, view)` (each group's feature, number, title, status, `not-shown` count and `open-spec` href, and each requirement's full ID, short ID, text, spec-line href and tests as name, place and href), `requirementData(site)` (the built data file, parsed), and `copyBuild(edit)` (a `repoCopy` with `edit(root)` applied, committed unless `dirty` is asked, then built and served) for fixture cases. Used by every browser test below.

**Checkpoint**: Foundation ready: the OS state knows which views show their specs, the build
writes the requirement data, and tests can show and read a view.

---

## Phase 3: User Story 1 - See the specs behind an app (Priority: P1) 🎯 MVP

**Goal**: Every window and full-screen view has "Show specs". It swaps the content for the app's
spec view, grouped by spec with counts, titles say so, "What's this?" explains it, and "Back to
[app]" brings the app back exactly as it was, in both shells.

**Independent Test**: build, open `/` at 1440 × 900, scroll the CV window, show its specs: every
requirement the CV app carries, grouped by spec, with text matching the specs, and nothing outside
the window changes; Back puts the CV at the same scroll position. Repeat at 375 × 812 with the CV
full screen.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T025 [P] [US1] Write `packages/web/test/inspector/controls.test.ts`, covers 007-requirement-inspector-FR-001 (and SC-001, SC-002's first action): at 1440, the CV window, the Terminal and About this site each have one `button.show-specs` named `Show specs for CV` / `Terminal` / `About this site`, labelled `Show specs`, at the title bar's right end, visible, its box outside `.window-content`; a pointer down on it starts no title bar drag; at 375 each full-screen header's is labelled `Specs`, named the same, at the header's right end; the CV, Terminal and About menus hold `Show specs` after the app's own commands (About: first), with no shortcut; one action ("Show specs") reaches the view.
- [X] T026 [P] [US1] Write `packages/web/test/inspector/spec-view.test.ts`, covers 007-requirement-inspector-FR-002 and 007-requirement-inspector-FR-006: in both shells, the window's box, title bar controls and z-order are equal before and after "Show specs"; `.window-title` reads `CV · Specs`, the mobile `.app-title` `CV` with `Specs` below and accessible name `CV · Specs`, `document.title` `CV · Specs – [site name]`; a screenshot with the CV window masked is identical before and after; each of the CV, Terminal and About views lists exactly the built data's `views[view]` (`views.shell` for About), grouped in number order, IDs ascending, each once; each group shows its number, title and status, `[n] more …` equal to `active − listed` and absent when all are listed (a `copyBuild` fixture where a view lists every requirement of one spec), and `Open the spec`; the view starts at the top; while the data loads, the bar, heading and lede show (held response).
- [X] T027 [P] [US1] Write `packages/web/test/inspector/back.test.ts`, covers 007-requirement-inspector-FR-003 (and SC-011): the CV scrolled to 1,200 px is at 1,200 px after Back, in both shells; the Terminal after `help`, `ls`, Up, a draft `hel` and an open vim view with a fold toggled is the same after Back (output text, history by Up, draft, vim view and fold); the CV menu reads `Back to CV` while the specs show and choosing it goes back; "Show specs" shows again after Back; Back on mobile (005 FR-050) while the specs show goes home, and reopening shows the specs.
- [X] T028 [P] [US1] Write `packages/web/test/inspector/state.test.ts`, covers 007-requirement-inspector-FR-004: the CV's spec view stays through move, resize, minimize and restore, maximize and restore, a 1440 → 375 → 1440 resize (shell switches), mobile Home and reopen, and `open cv` typed in the Terminal; the Terminal's window beside it keeps showing the Terminal; close and reopen from the dock, and a reload, show the app; `localStorage`, `sessionStorage`, IndexedDB and cookies stay empty throughout.
- [X] T029 [P] [US1] Write `packages/web/test/inspector/first-load.test.ts`, covers 007-requirement-inspector-FR-005 and 007-requirement-inspector-FR-015: at 1440 the CV window shows the CV and, of the inspector, only `button.show-specs`; no other inspector element appears within 10 s; hovering and focusing the control adds no element and it has no `title`; at 375 the home screen is as 005's; the data file is requested only after `#os[data-ready]` is set (request log with timestamps); neither `index.html` nor the `os` script holds any listed requirement's text (searched for each); 005's first-load tests pass unchanged.
- [X] T030 [P] [US1] Write `packages/web/test/inspector/whats-this.test.ts`, covers 007-requirement-inspector-FR-009: `button.whats-this` toggles `aria-expanded` and the panel; open, the panel sits above the heading, pushes it down by its height and covers nothing; its text equals `siteText.inspector.whatsThis` and is the same in the CV, Terminal and About views; its link is `siteData.repository`; it is closed again after Back and Show specs.
- [X] T031 [P] [US1] Write `packages/web/test/inspector/cv-page.test.ts`, covers 007-requirement-inspector-FR-025: `/cv`'s HTML holds no `show-specs`, `spec-view` or `data-requirements`, and loads only the registration script; 004's `/cv` tests pass unchanged.

### Implementation for User Story 1

- [X] T032 [P] [US1] Write `packages/web/src/inspector/derive.ts` (data-model.md The spec view): `deriveView(data, view)` returns `SpecViewModel` with `title` (`the shell` for `about`), groups in spec number order with requirements in ID order and `notShown = active − listed`, `total`, and `version` with `short`; `about` reads `views.shell`; an id missing from `views` gives no groups. Pure, shared with the site check (T078).
- [X] T033 [P] [US1] Write the loader `packages/web/src/inspector/data.ts` (data-model.md The loader, contracts/requirement-data.md The browser): `startLoading()` reads `#os`'s `data-requirements` and starts one `fetch(url, { priority: 'low' })`, once; `useRequirements()` through `useSyncExternalStore`; `retry()` from `failed`. Never touches storage. Call `startLoading()` in `packages/web/src/os/Os.tsx` right where it sets `data-ready`.
- [X] T034 [P] [US1] Write the sheet glyph in `packages/web/src/inspector/glyphs/` (an original SVG component, a page holding a two-line list, `aria-hidden`) and `packages/web/src/inspector/ShowSpecs.tsx`: `button.show-specs` with `aria-label` from `showName`, the glyph and `show` (desktop) or `showShort` (mobile), no `title`, `data-req="007-requirement-inspector-FR-001 007-requirement-inspector-FR-005 007-requirement-inspector-FR-016 007-requirement-inspector-FR-019"`; on activation it reads its window's or view's scroller `scrollTop` and calls `act({ type: 'showSpecs', view, appScroll })` (retrying the loader if `failed`).
- [X] T035 [US1] Add titles and actions to the shell after T009 and T010 (research R4, contracts/shell.md): `viewTitle(view)` in `packages/web/src/os/Os.tsx` gives `fill(siteText.inspector.windowTitle, { view: name })` while `state.specs[view]` is set, else the name; the page title rule uses it; `packages/web/src/os/shell-props.ts` gains `viewTitle`; `act` passes `showSpecs` and `showApp` to the reducer (the cross-fade comes in T063).
- [X] T036 [US1] Resolve the new focus targets in `packages/web/src/os/focus.ts` after T009: `spec-heading` → `#os [data-view="{view}"] .spec-heading`, `show-specs` → `#os [data-view="{view}"] .show-specs`, inside the shown window or full-screen view, through 005's `moveFocus`.
  - Done in Phase 2 with T009: `focus.ts` resolves both targets inside the shown window or full-screen view.
- [X] T037 [US1] Render the control and title on desktop in `packages/web/src/shells/desktop/TitleBar.tsx` after T034 and T035: `ShowSpecs` after `.controls` while the view shows its app, none while it shows its specs; `viewTitle(view)` in `.window-title` in place of the name or 006's `WindowTitle` while it shows its specs, with that span carrying `data-req="007-requirement-inspector-FR-002"`; hidden during a keyboard move or resize, as the controls are; the drag ignores pointer downs on it, as on 005's controls.
- [X] T038 [US1] Render the control, title and scroll rule on mobile in `packages/web/src/shells/mobile/FullScreenView.tsx` after T034 and T035: `ShowSpecs` at the header's right while the app shows; `.app-title` gains `span.title-suffix` (`headerSuffix`) below the name while the specs show, accessible name `[view] · Specs`, `data-req="007-requirement-inspector-FR-002"`; the scroller set to 0 when the spec view shows and to `specs[view].appScroll` in a layout effect when the app comes back; 005's `mobile.scroll` saves and restores the spec view's own position on Home.
  - The title is the name as text, then a visually hidden ` · Specs` and `span.title-suffix` (`aria-hidden`, carrying FR-002), so the full-screen view is named `CV · Specs`; a generic `div` takes no name of its own. The control stretches to the header's row, so the header keeps its height.
- [X] T039 [US1] Add the menu item in `packages/web/src/shells/desktop/MenuBar.tsx` after T035: in the focused window's menu, after 006's `menuItems` and before 005's window commands, in the same group, `Show specs` or `Back to [view]`, first for About this site, no shortcut, carrying `data-req="007-requirement-inspector-FR-001 007-requirement-inspector-FR-003"`; choosing it reads the scroller's `scrollTop` and acts as the control does, closing the menu with 005 FR-015's rules.
  - The CV's menu reads `Open the CV as a page`, `Show specs`, then 005's commands; the Terminal's `Clear output`, `Show specs`; About's `Show specs` first. 005's `menus.test.ts` (two lists) and 006's `terminal/menu.test.ts` now expect the new item, as contracts/shell.md adds it; 005's `design.test.ts` accepts the inspector's own `-glyph` SVG components beside 005's icons.
- [X] T040 [US1] Swap the content after T035 (research R3): `packages/web/src/os/View.tsx` renders `SpecView` for the view when `state.specs[view]` is set, else the app's content or About as before; `packages/web/src/shells/desktop/Window.tsx` sets `.window-content`'s `scrollTop` to 0 when the spec view shows and to `appScroll` in a layout effect when the app comes back, before paint.
- [X] T041 [US1] Write the view after T032, T033 and T040 (contracts/inspector.md The spec view): `packages/web/src/inspector/SpecView.tsx` (`section.spec-view` with `aria-label` from `region` and `data-view`, `data-req="007-requirement-inspector-FR-002 007-requirement-inspector-FR-006 007-requirement-inspector-FR-018 007-requirement-inspector-FR-020 007-requirement-inspector-FR-024"`; `.spec-bar` with `button.spec-back` (`Back to [view]`, `data-req="007-requirement-inspector-FR-003 007-requirement-inspector-FR-017"`, acting `showApp`) and `WhatsThis`; `h1.spec-heading` `tabindex="-1"` with `data-req="007-requirement-inspector-FR-017 007-requirement-inspector-FR-018"`; `p.spec-lede` (`ledeApp` or `ledeShell`); `p.spec-build` with the counts and `builtFrom`, `data-req="007-requirement-inspector-FR-010 007-requirement-inspector-FR-013"`; the groups once data is ready; while loading, no groups); `packages/web/src/inspector/SpecGroup.tsx` (`section.spec-group` with `aria-labelledby`, `data-feature`, `data-req="007-requirement-inspector-FR-006"`; its `h2` with `.spec-number`, `.spec-title` and `.status[data-status]` with the visually hidden `, `; `p.not-shown` only when `notShown > 0`; `a.open-spec` from `fileUrl`; `ul.requirements`); `packages/web/src/inspector/Requirement.tsx` (`li.requirement[data-id]` with `data-req="007-requirement-inspector-FR-007 007-requirement-inspector-FR-008"`, the visually hidden full ID, `.short-id` `aria-hidden`, `p.requirement-text` through `InlineText`); `packages/web/src/inspector/InlineText.tsx` rendering `text`, `code`, `strong`, `em` and `s` as elements, and `link`, `file` and `ref` as their text for now (anchors in T047).
- [X] T042 [P] [US1] Write `packages/web/src/inspector/WhatsThis.tsx` and the question glyph (contracts/inspector.md): `button.whats-this` with `aria-expanded`, `aria-controls`, the glyph `aria-hidden`; `section.whats-this-panel` (`hidden` when closed, `aria-labelledby` its `h2`) with the two paragraphs, the chain (shown form `aria-hidden`, spoken form visually hidden) and the repository link rendered only when `siteData.repository` is set; both carry `data-req="007-requirement-inspector-FR-009"`. Closed whenever the view mounts.
- [X] T043 [US1] Write `packages/web/src/inspector/inspector.css` and import it from `packages/web/src/styles/os.css` (design/wireframes.md Design values, contracts/inspector.md Layout): `button.show-specs` (24 px pill, `size.control`, `radius.pill`, `color.chrome-border` hairline, label in Schibsted Grotesk 12/500, haze focused and fog behind; mobile 33 px pill, 52 px tall target at least 44 px wide); the spec view's surface `color.shell-surface` (none in the Terminal's glass window); `.spec-bar` sticky, 40 px desktop, `size.spec-bar-touch` mobile, `color.chrome-solid`, hairline below; reading width `size.spec-measure`; the status chips (`color.status-approved` filled dot and solid outline; `color.status-draft` hollow dot and dashed outline); the short ID in JetBrains Mono 13/500; the text in Schibsted Grotesk 14 on 22; `color.shell-text-soft` where the design uses it; the panel on `color.shell-raised` with `radius.menu`. Tokens only. T025 to T031 pass.
  - Site text gained `inspector.separator` (` · `, the build line), `inspector.whatsThis.chainArrow` (` › `) and `inspector.refName` (`{text}, {id}`, for T047); 004's `site-text.test.ts` allows `›`. T025 to T031 pass (42 tests); `tokens.test.ts` and T016's FR-001 assertion pass now. Later stories' code was written alongside (Requirement links, notes, About's `data-req`, the cross-fade, forced colors, the offline note); their tasks are ticked when their tests pass.

**Checkpoint**: User Story 1 works on its own: every view shows its spec view and comes back
exactly as it was, in both shells.

---

## Phase 4: User Story 2 - Follow a requirement to its spec and its tests (Priority: P2)

**Goal**: Each requirement shows a link to its line in the spec and its tests by name with links,
at the built commit; references in the text are links; a draft with no test says so; a dirty build
says its links may not match.

**Independent Test**: at 1440, in every view, every spec link names the built commit, file and
the requirement's line, and every requirement's tests are exactly 001's counting tests for it.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T044 [P] [US2] Write `packages/web/test/inspector/requirement.test.ts`, covers 007-requirement-inspector-FR-007 and 007-requirement-inspector-FR-008 (and SC-001's second action): each `li.requirement` shows `FR-###`, starts with the full ID for assistive technology, shows its text with `code` elements and links where the data has them (a requirement whose text holds `code`, a URL and a `005 FR-013`-style reference), `In the spec, line [n]`, `Tests, [n]` and its tests by name with `path:line`, equal to the built data; a `ref` link's accessible name adds the full ID; a `copyBuild` fixture where 007's spec is `Draft` with an added `FR-035` carried by `button.show-specs` and no test shows the `DRAFT` status, `Tests` with no count, `No test covers this yet.` with the dashed mark, and no `ul.tests`.
- [X] T045 [P] [US2] Write `packages/web/test/inspector/links.test.ts`, covers 007-requirement-inspector-FR-010: every `a.spec-line`, `a.open-spec`, `a.test-name`, `a.build-commit` and in-text `file` and `ref` link names the data's commit, the right file and line (`?plain=1#L{line}` on specs); links have no `target`; the build line's short commit is the data's first 7 characters; a `copyBuild` with `dirty` shows `p.note-uncommitted` naming the short commit, before any offline note, and the clean build doesn't; a build of a copy with no `repository` in `site.json` renders the link texts without anchors.

### Implementation for User Story 2

- [X] T046 [US2] Finish `packages/web/src/inspector/Requirement.tsx` after T012 and T041: `a.spec-line` (`inTheSpec`, `fileUrl` with the line); `p.tests-label` (`testsCount` or `tests`); `ul.tests` with one `li` per test, `a.test-name` (`fileUrl` with its line) and `span.test-place` (`file:line`); with none, `p.no-tests` (`noTests`) after the no-tests glyph (`aria-hidden`, in `glyphs/`). Each link carries `data-req="007-requirement-inspector-FR-010"`; so does `a.open-spec` in `SpecGroup.tsx`.
- [X] T047 [US2] Render links in `packages/web/src/inspector/InlineText.tsx` after T046: `link` as `a href` (only the `http`/`https` address the data holds), `file` as `fileUrl(repository, commit, path)`, `ref` as `fileUrl` to its feature's spec at its line, with an `aria-label` adding the full ID when the text has the short one. Without `siteData.repository`, `file` and `ref` stay text.
- [X] T048 [US2] Write `packages/web/src/inspector/Notes.tsx` and the commit glyph after T046: `a.build-commit` in `p.spec-build` (`commitUrl`, the short commit, `data-req="007-requirement-inspector-FR-010 007-requirement-inspector-FR-013"`); `p.spec-note.note-uncommitted` (`uncommitted` with the short commit, `data-req="007-requirement-inspector-FR-010"`) when `version.dirty`, never a live region. T044 and T045 pass.

**Checkpoint**: User Stories 1 and 2 work: every requirement leads to its spec line and its tests.

---

## Phase 5: User Story 3 - See the shell's own specs (Priority: P3)

**Goal**: About this site has "Show specs"; its view, headed "Specs for the shell", lists
everything the shell's own elements carry.

**Independent Test**: at 1440 and 375, open About this site, show its specs: it lists exactly
`views.shell`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T049 [P] [US3] Write `packages/web/test/inspector/about.test.ts`, covers 007-requirement-inspector-FR-011: in both shells About this site has `Show specs for About this site`; its view is the region `the shell specs`, headed `Specs for the shell`, with `ledeShell`, lists exactly `views.shell`, including 005's menu bar, dock, window frame and home screen requirements and 007-requirement-inspector-FR-001, and no 004 requirement; its title reads `About this site · Specs`; `Back to About this site` returns to About; About's menu has `Show specs` first.
  - Deviation (2026-10-29): About's view also lists `004-cv-page-FR-012`, `FR-013` and `FR-029`. `CvLink.tsx` carries them, and the Terminal's `apps/terminal/session.ts` imports `withoutScheme` from it, so research R5's module reader counts that `data-req` for the shell (and the Terminal). Moving `withoutScheme` to `src/format/` fixes it, but means editing the Terminal's session store, which this plan's rules forbid; left for the owner. The test asserts FR-011 instead: the view equals `views.shell`, holds every ID the shell's parts carry in the page, and none that only the CV's content carries.

### Implementation for User Story 3

- [X] T050 [US3] Make About this site's view the shell's after T041: `SpecView.tsx` uses `shellName` for its heading and region and `ledeShell` when the view is `about`, and carries `data-req="007-requirement-inspector-FR-011 007-requirement-inspector-FR-012"` on that `section.spec-view` (contracts/inspector.md's About row), keeping the other IDs; the title, `Back to About this site` and the menu order come from T035 to T039 with no `about` special case beyond the name. T049 passes.

**Checkpoint**: All three views (CV, Terminal, About this site) work.

---

## Phase 6: User Story 4 - Use the inspector with a keyboard or a screen reader (Priority: P4)

**Goal**: Every action by keyboard alone with a visible indicator; focus moves to the heading and
back to "Show specs"; headings and lists as the contract sets; touch and an external keyboard on
mobile.

**Independent Test**: at 1440 with the keyboard alone, show and leave the CV, Terminal and About
views by control and by menu, checking where focus lands and that it is visible at each step.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T051 [P] [US4] Write `packages/web/test/inspector/keyboard.test.ts`, covers 007-requirement-inspector-FR-016: with keys alone, Tab reaches `Show specs`; Enter and, separately, Space show the view; Tab then visits `button.spec-back`, `button.whats-this`, the panel link when open, `a.build-commit`, then per spec `a.open-spec` and per requirement its text links, `a.spec-line` and each `a.test-name`, in that order; Enter opens and closes "What's this?"; Back works by Enter; each stop has an indicator of 3:1 or more (004's `focusIndicator`); with focus on the heading, arrow keys, Page Down and End scroll the view; Escape does nothing; Tab leaves the view and the window within the page's element count (never trapped).
- [X] T052 [P] [US4] Write `packages/web/test/inspector/focus.test.ts`, covers 007-requirement-inspector-FR-017: after `Show specs` by control and by menu, focus is on `h1.spec-heading`, accessible name `Specs for CV`; after Back by control and by menu, on that view's `button.show-specs`; the same for the Terminal, then Tab from `Show specs` reaches the command line as before; opening or closing "What's this?" keeps focus on its button; on mobile the same with taps.
- [X] T053 [P] [US4] Write `packages/web/test/inspector/structure.test.ts`, covers 007-requirement-inspector-FR-018: in the accessibility tree (004's `ax.ts`), a region `CV specs`, one `h1` `Specs for CV`, an `h2` per spec named like `004 The /cv Page, Approved`, the panel's `h2` when open, a list of requirements per spec, each item starting with its full ID, and a list of tests per requirement; no skipped heading level in the window or the full-screen view.
- [X] T054 [P] [US4] Write `packages/web/test/inspector/mobile.test.ts`, covers 007-requirement-inspector-FR-019: at 375 by touch, tap `Specs`, open "What's this?", check a link's `href`, tap Back; the same with an external keyboard; every inspector control and link is at least 24 × 24 px; `Specs` fills the header's 52 px height and is at least 44 px wide.

### Implementation for User Story 4

- [X] T055 [US4] Fix what T051 to T054 find, within contracts/inspector.md: the view's own key scrolling when focus is on its heading (005's content rule), no `tabindex` beyond the heading's `-1`, the visible focus indicator from 005's focus style on every inspector control and link, the heading's accessible name, and the spoken forms of the status and chain. Record each fix here. T051 to T054 pass.
  - Fixes (2026-10-29): each spec's `h2` read "004 The /cv Page , APPROVED": the browser puts a space between the heading's flex items, and the chip's capitals reached the name. The `h2` is now named by `aria-label` from `siteText.inspector.groupName` (`{number} {title}, {status}`), in place of the hidden `statusSeparator`. Nothing else needed a change: the heading takes the scroll keys (005's content rule), the heading's `-1` is the only `tabindex`, 005's focus style gives every kind of stop a 3:1 indicator, and the chain already has its spoken form.
- [X] T056 [US4] Give every inspector link and control a 24 × 24 px target in `packages/web/src/inspector/inspector.css` (inline links by padding or line height, within tokens), and the mobile `Specs` its 52 × 44 px target (`size.spec-bar-touch` for the mobile bar, 005's header height). T054 passes.
  - Done (2026-10-29): the panel's link, `a.open-spec` and `a.spec-line` are `inline-flex` with `min-block-size: var(--token-size-target)`; `a.build-commit`, `a.test-name` and in-text links take `padding-block: var(--token-space-1)`, which moves no line; the short commit and its arrow no longer wrap apart. On mobile, `Specs` fills the 51 px inside the header's 52 px (its bottom rule is the last pixel) and is 44 px or wider.

**Checkpoint**: The inspector works by keyboard, by touch and with assistive technology.

---

## Phase 7: User Story 5 - Reduced motion, high contrast and larger text (Priority: P5)

**Goal**: The design's cross-fade, none with reduced motion; every part visible in forced colors;
reflow at every size and zoom; the design's values from tokens.

**Independent Test**: with reduced motion, show and leave a view: nothing fades, moves or scales.
With forced colors, every heading, chip, link and control is visible. At 200% zoom, no
horizontal scroll.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T057 [P] [US5] Write `packages/web/test/inspector/motion.test.ts`, covers 007-requirement-inspector-FR-022 (and SC-010): without reduced motion, a view transition runs whose animations last `motion.duration.fast` with `motion.easing.standard`, change only opacity, and leave every box outside the scroller unchanged (sampled each frame); with `prefers-reduced-motion: reduce`, no view transition starts and sampled frames show no change of opacity, `transform` or `scale`; in a page without `document.startViewTransition` (deleted before load), the swap still happens.
- [X] T058 [P] [US5] Write `packages/web/test/inspector/modes.test.ts`, covers 007-requirement-inspector-FR-023: with `forcedColors: 'active'`, headings, links (underlined), the status chips (solid and dashed borders, filled and hollow dots), the notes, `Show specs`, Back and "What's this?" have a visible border or text in a system color; no element relies on a background image or color alone.
- [X] T059 [P] [US5] Write `packages/web/test/inspector/layout.test.ts`, covers 007-requirement-inspector-FR-020: in a 400 px wide CV window, at 320 × 568, 812 × 375 and 1440 × 900, and with a `copyBuild` fixture requirement holding a 120-character word and a long test path, no horizontal scroll and every long ID, name, path and link wraps in its column; two columns from 480 px of content, stacked below; padding 40 px from a 700 px scroller, 24 px below, 20 px on mobile; the view scrolls inside its window while `.spec-bar` stays at the top.
- [X] T060 [P] [US5] Write `packages/web/test/inspector/accessibility.test.ts`, covers 007-requirement-inspector-FR-024 (and SC-007): axe-core with WCAG 2.2 A and AA tags finds nothing in the CV, Terminal and About views, with "What's this?" open, and with the Terminal's view beside the CV showing the CV, in both shells; at 200% zoom, text-only 200%, 400% on a 1280 px window and with WCAG 1.4.12 text spacing, no clipping or overlap of the view's text.
- [X] T061 [P] [US5] Write `packages/web/test/inspector/design.test.ts`, covers 007-requirement-inspector-FR-021: computed colors, fonts and sizes of the control, bar, heading, chips, short IDs, text, tests and notes are token values; `Show specs` is 24 px tall and 10 px from the window's right edge; the top bar is 40 px on desktop and 48 px on mobile; reading width 760 px; the glyphs are the committed SVG components (no image request, no system font).

### Implementation for User Story 5

- [X] T062 [US5] Write `packages/web/src/inspector/transition.ts` (research R11): `crossFade(scroller, swap)` gives the scroller `view-transition-name: spec-swap`, runs `document.startViewTransition(() => flushSync(swap))` and removes the name when it finishes; with `matchMedia('(prefers-reduced-motion: reduce)')` or no API, it runs `swap` at once.
- [X] T063 [US5] Route `showSpecs` and `showApp` through `crossFade` in `packages/web/src/os/Os.tsx`'s `act` after T062, finding the view's scroller (`.window-content` or `.view-content`); focus still moves after the swap from the reducer's effect. In `inspector.css`, `::view-transition-old(spec-swap)` and `::view-transition-new(spec-swap)` animate opacity only, over `var(--token-motion-duration-fast)` with `var(--token-motion-easing-standard)`, and no animation under `@media (prefers-reduced-motion: reduce)`. T057 passes.
- [X] T064 [US5] Add `@media (forced-colors: active)` rules to `inspector.css` (contracts/inspector.md Motion and modes): `button.show-specs`, chips and notes keep a solid or dashed border in `CanvasText` or `ButtonText`, dots filled or hollow, links underlined, the offline and uncommitted notes bordered. T058 passes.
- [X] T065 [US5] Finish the layout in `inspector.css`: `@container (--token-breakpoint-spec-two-column)` for the two columns with `size.spec-id-column`, `@container (--token-breakpoint-spec-wide)` for the 40 or 24 px padding (`space.10`, `space.6`), `space.5` on mobile, `overflow-wrap: anywhere` on IDs, names, paths and links, and the container set on the scroller (005's container visitor turns the breakpoint tokens into conditions). Fix anything T059 to T061 find, within tokens. T059 to T061 pass, and `packages/web/test/tokens.test.ts` passes.
  - Done (2026-10-29): the layout needed no change for T059 to T061. T060 found two tests whose titles are built at run time (006's and 007's zoom tests), which the data names `''`: their links had no text (axe `link-name`). `Requirement.tsx` now shows `siteText.inspector.unnamedTest` for them, and requirement.test.ts covers it. T061 measures `Show specs`' 10 px from the title bar's edge, inside the window's 1 px border, as 005 places its controls 8 px from the left edge.

**Checkpoint**: The inspector looks as approved and holds up to motion, contrast and zoom
settings.

---

## Phase 8: User Story 6 - Use the inspector offline (Priority: P6)

**Goal**: After one visit to `/` or `/cv`, every view shows offline as online, with the offline
note; nothing is requested from another site.

**Independent Test**: visit `/` online, go offline, reload at 375 and 1440, show every view: each
matches the online one and shows the offline note.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T066 [P] [US6] Write `packages/web/test/inspector/offline.test.ts`, covers 007-requirement-inspector-FR-026 and 007-requirement-inspector-FR-027 (and SC-008): after one visit to `/`, and separately to `/cv` only, with `context.setOffline(true)` at 375 and 1440, each view's text (offline note aside) equals the online run's, drawn in a served face (004's fonts helper); `p.note-offline` shows `siteText.inspector.offline` offline and is absent online; going online and offline with the view open removes and adds it; with storage blocked and the network gone after load, the view shows its bar, heading, lede and the offline note with no groups and no error, and a later "Show specs" online shows the groups.
- [X] T067 [P] [US6] Write `packages/web/test/inspector/requests.test.ts`, covers 007-requirement-inspector-FR-028 (and SC-009): loading `/` and showing every view in both shells, with "What's this?" open, requests only the test server's origin.

### Implementation for User Story 6

- [X] T068 [US6] Add the offline note to `packages/web/src/inspector/Notes.tsx` after T048 (research R12): `p.spec-note.note-offline` with the offline glyph (`aria-hidden`, in `glyphs/`) and `offline`, `data-req="007-requirement-inspector-FR-027"`, shown while `navigator.onLine` is `false`, following `online` and `offline` events, after the uncommitted note, never a live region; shown too when the loader is `failed`. Confirm `sw.js` and `register-sw.ts` needed no change (the data file is precached as a built file). T066 and T067 pass.
  - Confirmed (2026-10-29): `sw.js` and `register-sw.ts` needed no change; T066 shows every view offline after a visit to `/` or `/cv` only, so the worker precaches the data file as a built file.

**Checkpoint**: The inspector works offline and stays on the site.

---

## Phase 9: User Story 7 - Every pull request proves the inspector works (Priority: P7)

**Goal**: `npm run site-check` gains the `inspector` part and extends `accessibility`, `keyboard`,
`offline`, `other-sites`, `layout`, `modes` and `fonts`, with the same result locally and on CI,
and failures naming the view, shell, width and requirement.

**Independent Test**: break one thing at a time in a copy (a requirement left out of a view, a
stale text, a test dropped, the Terminal's draft lost on Back, Back leaving focus on `body`, the
data file not precached): the matching part fails with the contract's line.

### Tests for User Story 7 (REQUIRED) ⚠️

- [X] T069 [P] [US7] Write `tools/site-check/test/inspector.test.ts`, covers 007-requirement-inspector-FR-012, 007-requirement-inspector-FR-013 and 007-requirement-inspector-FR-030 (and SC-003, SC-004): the part passes on the real build with `/ <shell>/<view>-specs/<width>px` and `<shell>/elements/<width>px` variants; on copies, each fails with the contract's line: the CV view leaving a requirement out (a filter in the copy's `derive.ts`) → `missing-requirement`; the built data file's text edited after the build → `text-mismatch`; the copy's `read.ts` dropping the last test → `tests-mismatch`; a requirement's text changed in the copy's spec → passes, with the new text in the view (US2 scenario 5); the Terminal's session reset on unmount → `state-lost`; each line names the part, variant, view and requirement.
- [X] T070 [P] [US7] Extend `tools/site-check/test/shell-states.test.ts`, covers 007-requirement-inspector-FR-031: the driver reaches the twelve states of contracts/cli.md States by real input, and the summary lists `/` under `accessibility`, `fonts`, `layout` and `modes` in each inspector state at both widths.
- [X] T071 [P] [US7] Extend `tools/site-check/test/keyboard.test.ts`, covers 007-requirement-inspector-FR-032: the inspector flow (`desktop/inspector-keyboard/1440px`) passes on the real build; a copy where Back leaves focus on `body` fails with `focus-target step … "Back to CV"`.
- [X] T072 [P] [US7] Extend `tools/site-check/test/offline.test.ts`, covers 007-requirement-inspector-FR-033: the spec views pass offline at 375 and 1440 after a visit to `/`, and after `/cv` only; a copy whose data file is left out of the precache list fails, naming the view, shell and width.
- [X] T073 [P] [US7] Extend `tools/site-check/test/other-sites.test.ts` and `tools/site-check/test/cli.test.ts`, covers 007-requirement-inspector-FR-031 and 007-requirement-inspector-FR-034: `other-sites` records every spec view in both shells; the parts' order is contracts/cli.md's; the CI step runs the same command as the local one; every inspector problem line names the view, shell and width, and the requirement where there is one; two runs give the same result; with an untracked file in a copy the result is the same as without; the whole check stays within 006's measured time plus 3 minutes off CI.
  - Done (2026-10-29): the unchanged-result check compares every result and problem line, not the whole report. An untracked file makes the build dirty (R8), so the site's version in the header changes, as it should. 005's two-run test now passes `repository` too, since PARTS includes `inspector`. The site check's time budget is covered by `performance.test.ts` (006's budget plus 180,000 ms, off CI).

### Implementation for User Story 7

- [X] T074 [US7] Add the inspector's states to `tools/site-check/src/shell-states.ts` (contracts/cli.md States): desktop `cv-specs`, `cv-specs-whats-this`, `terminal-specs` (after 006's `terminal-help`), `terminal-specs-beside-cv`, `about-specs`, `cv-specs-narrow`; mobile `cv-specs`, `cv-specs-whats-this`, `terminal-specs` (after `pocket-help`), `about-specs`, `cv-specs-320`, `cv-specs-landscape`; each reached from a fresh page by real input.
  - Deviation (2026-10-29): 006 already has a desktop state `terminal-specs` (the `specs` command's output), so the Terminal's spec view states are `terminal-app-specs` and `terminal-app-specs-beside-cv` (the CV window clicked to the front, showing the CV). The mobile sizes come from a map (`cv-specs-320` 320 × 568, `cv-specs-landscape` 812 × 375). `TERMINAL_STATES` leaves the inspector's states out; `INSPECTOR_SHELL_STATES` lists them. The elements sweep reaches every state, these included, on the real build.
- [X] T075 [US7] Add the part and its problem types to `tools/site-check/src/report.ts` (`inspector`; `missing-requirement`, `extra-requirement`, `out-of-order`, `wrong-count`, `text-mismatch`, `tests-mismatch`, `link-mismatch`, `uncarried-element`, `state-lost`, `focus-target`, as data-model.md Check results sets) and run it after `terminal` in `tools/site-check/src/check.ts`.
- [X] T076 [US7] Write `tools/site-check/src/parts/inspector.ts` after T074 and T075 (research R15): in each shell at 1440 × 900 and 375 × 812, show each view and compare with `buildRequirementData` on the repository (through `deriveView`) and with the built data file: requirements listed and their order, each group's number, title, status and count, each requirement's text against its spec's lines read again with Markdown marks removed, its tests against 001's `coveringTests`, every link's commit, file and line; then in every state 005's and 006's driver reaches, every `data-req` in the page is in the view of the app whose content holds the element, or the shell's (`elements` variants); then Back restores the CV's scroll position and the Terminal's output, history, draft and vim view. T069 passes.
  - Done (2026-10-29): `runCheck` takes a `repository` option (the root by default), as the tests check the global build laid out apart from the repository. The view comparison uses the check's own `buildRequirementData` and `deriveView`; the elements sweep uses the built data file, what the page shows. The sweep found a real gap in research R5's walker: the root's no-script page (`os/NoScript.tsx`, with /cv's footer) is put beside `#os` by `render.tsx`, so `ShellPage.tsx` never imports it and 005-os-shell-FR-049, 004-cv-page-FR-025 and FR-032 were in no view. `carried.ts` now has it as a third shell root (fixtures and carried.test.ts updated). The part takes about 35 s on the real build.
- [X] T077 [US7] Extend `tools/site-check/src/parts/keyboard.ts` with FR-032's flow at 1440 × 900 (Show specs by control, Back, Show specs from the menu, What's this?, Back, then the Terminal and About this site), checking the focus target and a visible indicator at each step. T071 passes.
  - Done (2026-10-29): wired into `check.ts`'s `keyboard` run as `desktop/inspector-keyboard/1440px`. A focus-target failure moves on to the next step, so a broken Back is named at steps 3, 7, 11 and 14.
- [X] T078 [US7] Extend `tools/site-check/src/parts/offline.ts` to show every view offline at both widths after a visit to `/` and after `/cv` only, compare its text with the online run and check the offline note (`offline-mismatch` otherwise). T072 passes.
  - Done (2026-10-29): variants `<shell>/<view>-specs/<width>px` and `<shell>/<view>-specs-after-cv/<width>px`. T072's broken copy drops the data file from the worker's `PRECACHE`.
- [X] T079 [US7] Extend `tools/site-check/src/parts/other-sites.ts`, `accessibility.ts`, `layout.ts`, `modes.ts` and `fonts.ts` with the inspector's states (contracts/cli.md Parts): requests while every view shows; axe in every state; no horizontal scroll at 320 × 568, 812 × 375, in a 400 px window, at 200% and 400% zoom and with text spacing; reduced motion moves nothing and forced colors keep every part visible; every text node in `desktop/cv-specs` and `mobile/about-specs` drawn by a served face. T070 and T073 pass.
  - Done (2026-10-29): other-sites per view, with What's this? open; fonts in `desktop/cv-specs` and `mobile/about-specs`; layout in the three inspector layout states plus 200%/400% zoom and text spacing for each view's spec state; forced colors in every inspector state (`inspectorForcedColorsProblems`); reduced motion through `shellMotionProblems`' `inspectorMotion`; accessibility through `SHELL_STATES`.

**Checkpoint**: Every pull request proves the inspector works, in the one command.

---

## Phase 10: Polish & Constitution Verification

**Purpose**: Traceability, speed, the audits, the full verification, the owner's manual checks and
the single PR

- [X] T080 [P] Write `packages/web/test/inspector/data-req.test.tsx`, covers 007-requirement-inspector-FR-029: every target in contracts/inspector.md's `data-req` table carries exactly its IDs in the rendered page (desktop: the CV window's control and its menu item, the CV, Terminal and About views with "What's this?" open, the title span; mobile: the header's control and title suffix; the uncommitted note in a dirty `copyBuild`; the offline note offline).
  - Done (2026-10-29): passes on the real build in both shells, with the dirty `copyBuild` and offline.
- [X] T081 [P] Extend `packages/web/test/self-check.test.ts`, covers 007-requirement-inspector-FR-009, 007-requirement-inspector-FR-021 and 007-requirement-inspector-FR-029: `npm run content-check`, `npm run token-check` and `npm run traceability` pass on the repository with no exception or skip marker added for the inspector; and confirm 005's `packages/web/test/shell/site-text.test.ts` covers the `inspector` group (English, no key CV fact), extending its list if it reads groups by name.
  - Done (2026-10-29): the self-check's new `describe` passes. 005's `site-text.test.ts` reads groups by name, so its list now has `inspector`, and its English pattern allows the chain's `›`.
- [X] T082 [P] Write `packages/web/test/inspector/performance.test.ts` (SC-005, research R10 **Verify**): with 4× CPU throttling over CDP, the click on About this site's `Show specs` to the last group's paint is under 300 ms, and Back to the app's paint under 100 ms; the same for the CV. If the shell's view misses, apply R10's fallback (first two groups in the click's commit, the rest in `startTransition`) in `SpecView.tsx` and measure again. Record both here.
  - Done (2026-10-29), 4× CPU throttling, on the real build, with other test runs going at the same time: mobile About show 105 ms, back 63 ms; mobile CV 63 / 48 ms; desktop About 118 / 62 ms; desktop CV 94 / 42 ms. All are under 300 ms and 100 ms, so R10's fallback isn't needed and `SpecView.tsx` is unchanged.
- [X] T083 Run `npm run traceability` after T080 (Constitution III, SC-012): it exits 0, its PASS line counts `007-requirement-inspector`'s 34 active requirements among the approved specs, and every row of Requirement Coverage below has a passing test. Record the PASS line here.
  - Done (2026-10-29): `npm run traceability` exits 0 with `PASS: all 351 active requirements in 7 approved specs are covered.` The self-check confirms 007 is Approved with 34 active requirements, all counted.
- [X] T084 [P] Verify research R16 (**Verify**): on the real build, the root's compressed script, style sheet and HTML are near 108 KB, 14 KB and 16 KB, the data file near 20 KB, and Lighthouse's mobile and desktop scores on `/` and `/cv` are 90 or more in every category (SC-006). Record the figures here.
  - Done (2026-10-29), real build: the root's HTML is 7.0 KB gzip (5.7 KB brotli), near 16 KB;
    `os-*.css` is 12.4 KB gzip, near 14 KB; `os-*.js` is 113.4 KB gzip (98.2 KB brotli), near 108 KB. The data file
    `requirements-*.json` is 37.8 KB gzip (30.0 KB brotli, 184 KB raw), not near 20 KB: R16's estimate was low.
    It loads after the shell is ready (quickstart 5) and isn't render-blocking, so the Lighthouse scores don't move.
    Lighthouse (`npm run site-check` on b12e55d): `/` mobile performance 98, accessibility 100, best-practices 100,
    SEO 100; `/` desktop all 100; `/cv` mobile 99/100/100/100; `/cv` desktop all 100. Every score is 90 or more (SC-006).
- [X] T085 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/os-core/`, `packages/web/`, `tools/traceability/` and `tools/site-check/`:
  - **X**: no package added; the abstractions added are exactly plan.md's Dependencies table (add any helper this list created, with its reason); no agent skill added;
  - **IV**: `site-text.ts` holds no CV fact and no design value; the inspector reads no token in script; the data is never typed by hand; `siteData.repository` is the only CV value read;
  - **V**: `os-core` gained only `specs`, the two actions and the two focus targets; no app declaration changed; the shell has no app-specific case for the inspector beyond About's name and lede;
  - **VII**: first load shows only the control added; `/cv` is untouched;
  - **IX**: the glyphs, chips and layout are the design's own, with no Apple asset or system font.
  Record the result here.
  - Result (2026-10-29, against `origin/main` 89f2650): all pass.
    - **X**: no `package.json` or lockfile change, and no skill under `.claude/`. The source files added
      are the Dependencies table's, plus one helper: `src/inspector/scroll.ts` (`useSpecScroll`), part of
      the spec view components. It puts the scroller at the top for the specs and back where the app
      was before the browser paints (FR-003, R3). Keeping this in each shell would mean two copies.
      001's changes are additive (`specTitle`, `requirementText`, `coveringTests`, and
      `TestNode.title`/`location`).
    - **IV**: `site-text.ts`'s `inspector` group has no CV fact (005's `site-text.test.ts` now reads it).
      No inspector script reads a token or calls `getComputedStyle`: the cross-fade takes its timing
      from the style sheet. No requirement data file is committed; the build writes it. `siteData.repository`
      is the only `siteData` read, in `WhatsThis.tsx`, `SpecGroup.tsx` and `Notes.tsx`. No
      `dangerouslySetInnerHTML`, `innerHTML` or `eval`.
    - **V**: `os-core` gained `OsState.specs`, `showSpecs`/`showApp` and the `spec-heading`/`show-specs`
      focus targets, and nothing else. `apps/` is unchanged. The only `view === 'about'` cases are About's
      title, its lede and its own `data-req` (FR-011, FR-012) in `SpecView.tsx`.
    - **VII**: the root's first load adds only `Show specs` (US1's FR-005 tests). `CvPage` and `src/cv/`
      are unchanged from `main`.
    - **IX**: the glyphs are the design's SVG components under `src/inspector/glyphs/`. Fonts come only
      from `var(--token-font-family-…)`. There is no image, Apple asset or system font.
- [ ] T086 Run the full verification after T083 to T085: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with the `inspector` part in both shells. Run them again with an untracked file in the working copy: the same result (FR-034). Record the counts here.
  - Pass 1 (2026-10-29, b12e55d, clean copy): `typecheck`, `content-check`, `token-check` and `traceability` exit 0.
    `npm test`: 1,683 of 1,684 tests passed in 182 files (966 s). The one failure was 005's `shell.test.ts`
    keyboard result list, which didn't yet expect `desktop/inspector-keyboard/1440px`; fixed in 0620c46 (10/10).
    `npm run site-check`: `PASSED`, 14 of 14 parts, `inspector` passing in both shells (228 s).
  - Pass 2 (0620c46, with an untracked file at the root): the four checks exit 0. `npm test`: 1,683 of 1,684
    passed (958 s). The one failure was a different, load-dependent one: `inspector/keyboard.test.ts`'s ArrowUp
    after End, while other browser runs were going. It passes alone (3/3), and now waits for the scroll to settle
    before the next key. `npm run site-check`: `PASSED`, 14 of 14. Its report is the same as pass 1's except the
    version line (the build is dirty, R8) and `/` mobile Lighthouse performance (98, then 97) (FR-034).
  - Pass 3: `npm test` again on the committed fixes (see below).
- [X] T087 Run quickstart.md scenarios 1 to 5, 8 and 9, and the automated parts of 7, and record any deviation here. Scenario 3.4 and 3.5 edit files: do them in a `repoCopy` or revert each change with `git checkout`. Write scratch output to the scratchpad. Scenarios 6 and the hand parts of 7 are T088.
  - Done (2026-10-29). Scenario 1 is T086. Scenarios 2, 3.1–3.3, 4, 5, 8 and 9 were run by a Playwright script on
    the built site (scratch, `/tmp/claude-007/scripts/quickstart.ts`), and 3.4 and 3.5 in `copyBuild` repository
    copies. Everything matched except one deviation:
    - **4**: About this site's view lists 005, 006 and 007, and also five of 004's requirements (FR-012, FR-013, FR-025,
      FR-029, FR-032). The root's no-script page (`os/NoScript.tsx`) is shell code and holds /cv's footer, so these are
      the shell's. T076 recorded this, and the site check's `inspector` part agrees with the data. The quickstart's
      "none of 004's" predates that change; the implementation is right.
    - 2.5 (close and reopen shows the CV) passed on a second, careful run. The first run's script checked while the
      window was still closing.
    - 3.4: 007 as Draft shows `DRAFT`, and an uncovered FR-035 on `button.show-specs` says `No test covers this yet.`
      3.5: a changed word in 004 FR-012 shows in the CV view, with the uncommitted note naming the commit. A clean
      build has no note.
    - 7, automated parts: covered by `npm run site-check`'s `modes` (forced colors and reduced motion in every
      inspector state) and `layout` (200%/400% zoom, text spacing, 320 px, landscape, narrow window). Both pass.
- [ ] T088 Owner action, by hand (quickstart 6 and 7, research R17): screen readers on a desktop (VoiceOver on macOS and NVDA on Windows) and on a phone (VoiceOver on iPhone and TalkBack on Android) through stories 1 to 4 (SC-007); forced colors in Edge with Windows' contrast themes (FR-023); text-only zoom at 200% in Firefox (FR-024); and comparing the built views with `design/exports/` (FR-021). Record each result here and in the PR. Under the interim provision on deferred manual checks they may wait for the final testing phase: record that here, list them in the PR and leave this task open.
  - Deferred (2026-10-29) under the interim provision on deferred manual checks, to the final multi-spec testing phase,
    as 004's T105 and 006's T108 were. Still to do by hand: VoiceOver (macOS, iPhone), NVDA (Windows) and TalkBack
    (Android) through stories 1–4 (SC-007); Edge with Windows' contrast themes (FR-023); Firefox's text-only zoom at
    200% (FR-024); the built views against `design/exports/` (FR-021). Left open for the owner.
- [ ] T089 Commit the remaining work with Conventional Commits; merge `main` again if it changed since T001, such as 006's amendments (as T001 sets, a merge commit, then rerun T086); push `007-requirement-inspector` and open one pull request to `main` (Constitution XI):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/007-requirement-inspector/spec.md` and `specs/007-requirement-inspector/tasks.md`; records the token rename (T004) and that the tokens were written into the hand-written export under the interim provision on local mockups; and records the results of T082, T084, T087 and T088, listing every manual check deferred under the interim provision on deferred manual checks.
  - Confirm the CI jobs run and pass, and that the `site` job summary matches a local `npm run site-check` on the same commit (FR-034). Merging is the owner's.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 is done; T002 next.
- **Foundational (Phase 2)**: depends on Setup. BLOCKS all user stories.
  - T003 (design gate) before any UI task (T034 onward).
  - T004 → T005 (rename before tokens).
  - T006 → T007; T008 → T009; T011 → T012; T014 → T019; T015 → T020; T016 → T021;
    T007 + T017 + T019 + T020 + T021 → T022 → T023 (T018 passes after T023).
  - T013 before T017's copy cases and T024.
  - T024 after T023.
- **User Stories (Phase 3 to 9)**: all depend on Phase 2.
  - US1 first: every later story reads the view it builds.
  - US2, US3, US4 and US6 depend on US1's view (T041) and can then run in parallel.
  - US5 depends on US1 (T035 for `act`, T043 for the style sheet).
  - US7 depends on US1 to US6 being in place, as it checks their behavior on the real build.
- **Polish (Phase 10)**: depends on every story. T083 needs all test tasks; T089 is last.

### Within Each User Story

- Tests are written first and FAIL before implementation.
- Tokens and site text (Phase 2) before components.
- `os-core` behavior (T009) before shell UI.
- Data and derive (T022, T032) before the view (T041).
- Story complete before moving to the next priority.

### Parallel Opportunities

- Phase 2: T006, T008, T010, T011, T013, T014, T015, T016, T017, T018 are independent test and
  content tasks; T019, T020 and T021 can run in parallel once their tests exist.
- US1: T025 to T031 in parallel; then T032, T033, T034 and T042 in parallel; T037, T038 and T039
  after T034 and T035 (different files).
- US2 tests T044, T045; US4 tests T051 to T054; US5 tests T057 to T061; US6 tests T066, T067; US7
  tests T069 to T073, each set in parallel.
- After US1, US2, US3, US4 and US6 can proceed in parallel.
- Polish: T080, T081, T082, T084, T085 in parallel.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "controls.test.ts, covers 007-requirement-inspector-FR-001"
Task: "spec-view.test.ts, covers 007-requirement-inspector-FR-002 and FR-006"
Task: "back.test.ts, covers 007-requirement-inspector-FR-003"
Task: "state.test.ts, covers 007-requirement-inspector-FR-004"
Task: "first-load.test.ts, covers 007-requirement-inspector-FR-005 and FR-015"
Task: "whats-this.test.ts, covers 007-requirement-inspector-FR-009"
Task: "cv-page.test.ts, covers 007-requirement-inspector-FR-025"

# Then the independent pieces together:
Task: "derive.ts, the view model"
Task: "data.ts, the loader"
Task: "ShowSpecs.tsx and the sheet glyph"
Task: "WhatsThis.tsx and the question glyph"
```

## Parallel Example: User Story 7

```bash
Task: "tools/site-check/test/inspector.test.ts, covers FR-012, FR-013, FR-030"
Task: "tools/site-check/test/shell-states.test.ts, covers FR-031"
Task: "tools/site-check/test/keyboard.test.ts, covers FR-032"
Task: "tools/site-check/test/offline.test.ts, covers FR-033"
Task: "tools/site-check/test/other-sites.test.ts and cli.test.ts, covers FR-031, FR-034"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational, including the design gate (CRITICAL, blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: quickstart scenario 2 on the real build.

### Incremental Delivery

1. Setup + Foundational → the data is built and the state exists.
2. US1 → every view shows its specs and comes back (MVP).
3. US2 → the trace to spec lines and tests.
4. US3 → the shell's own view.
5. US4, US5, US6 → keyboard and assistive technology, motion and modes, offline.
6. US7 → the site check keeps it all true.

All stories ship in the feature's single PR (Constitution XI); the increments above are
checkpoints within it.

---

## Requirement Coverage

Every FR in spec.md and the test task that covers it:

| Requirement | Test task(s) |
|-------------|--------------|
| 007-requirement-inspector-FR-001 | T025 |
| 007-requirement-inspector-FR-002 | T008, T026 |
| 007-requirement-inspector-FR-003 | T008, T027 |
| 007-requirement-inspector-FR-004 | T008, T028 |
| 007-requirement-inspector-FR-005 | T029 |
| 007-requirement-inspector-FR-006 | T016, T026 |
| 007-requirement-inspector-FR-007 | T015, T044 |
| 007-requirement-inspector-FR-008 | T006, T017, T044 |
| 007-requirement-inspector-FR-009 | T030, T081 |
| 007-requirement-inspector-FR-010 | T011, T014, T045 |
| 007-requirement-inspector-FR-011 | T016, T049 |
| 007-requirement-inspector-FR-012 | T016, T069 |
| 007-requirement-inspector-FR-013 | T006, T017, T069 |
| 007-requirement-inspector-FR-014 | T018 |
| 007-requirement-inspector-FR-015 | T029 |
| 007-requirement-inspector-FR-016 | T051 |
| 007-requirement-inspector-FR-017 | T008, T052 |
| 007-requirement-inspector-FR-018 | T053 |
| 007-requirement-inspector-FR-019 | T054 |
| 007-requirement-inspector-FR-020 | T059 |
| 007-requirement-inspector-FR-021 | T061, T081 |
| 007-requirement-inspector-FR-022 | T057 |
| 007-requirement-inspector-FR-023 | T058 |
| 007-requirement-inspector-FR-024 | T060 |
| 007-requirement-inspector-FR-025 | T031 |
| 007-requirement-inspector-FR-026 | T066 |
| 007-requirement-inspector-FR-027 | T066 |
| 007-requirement-inspector-FR-028 | T067, T073 |
| 007-requirement-inspector-FR-029 | T080, T081 |
| 007-requirement-inspector-FR-030 | T069 |
| 007-requirement-inspector-FR-031 | T070, T073 |
| 007-requirement-inspector-FR-032 | T071 |
| 007-requirement-inspector-FR-033 | T072 |
| 007-requirement-inspector-FR-034 | T073, T086 |

Success criteria: SC-001 and SC-002 T025, T044; SC-003 and SC-004 T016, T017, T069; SC-005 T082;
SC-006 T084, T086; SC-007 T060 and T088; SC-008 T066; SC-009 T067; SC-010 T057; SC-011 T027;
SC-012 T080, T081, T073, T083.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- The coverage table abbreviates nothing: test titles always carry the full
  `007-requirement-inspector-FR-###` form.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md). T004 is its own `docs:` commit, before any code.
- T088 is the owner's. T089 pushes and opens the PR; merging is the owner's.
- **Choices made here that the design documents don't fix**. If the owner prefers otherwise,
  change the plan or contract first:
  - **The whole data reader is foundational** (T014 to T023), the inline parser included, because
    every view reads the same file; US2 adds only how links render (T046 to T048).
  - **`InlineText` grows by story** (T041, T047): US1 renders marks and shows links and references
    as text; US2 turns them into anchors, so T044's link cases fail first.
  - **The cross-fade comes in US5** (T062, T063): US1 swaps at once, which is also the
    reduced-motion behavior, so US1's tests don't depend on the View Transitions API.
  - **Git in test copies** (T013) changes 004's shared `repoCopy`, which the site check's tests
    also use, because the build now refuses to run without a commit (research R8).
