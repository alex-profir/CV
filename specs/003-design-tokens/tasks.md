---

description: "Task list for the design tokens source"
---

# Tasks: Design Tokens Source

**Input**: Design documents from `/specs/003-design-tokens/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/token-sources.md](./contracts/token-sources.md),
[contracts/token-output.md](./contracts/token-output.md),
[contracts/literal-values.md](./contracts/literal-values.md), [contracts/cli.md](./contracts/cli.md),
[contracts/ci.md](./contracts/ci.md), [quickstart.md](./quickstart.md). No `design/` folder: the
spec says **No UI**.

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `003-design-tokens-FR-###` IDs it covers, and every FR in
spec.md (FR-001 to FR-058, all active) is covered by at least one test task (see Requirement
Coverage at the end).

**Organization**: Tasks are grouped by user story.

- US1 builds the check: reading both token sources, structure, sets, themes, resolution, values,
  the report and the CLI. It also brings in the real export.
- US2 adds names code can use, the generated output, the `@cv/tokens` package, and token names in
  site files.
- US3 adds the literal values search.
- US4 adds the theme rules.
- US5 adds the motion-only rules.

The motion token source exists from Phase 2, because the check reports a missing source
(FR-038), so the real repository can't pass without it. The pull-request check (FR-039) isn't a
user story, so it has its own phase after the stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US5)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 003-design-tokens-FR-009"

## Path Conventions

- Token package (Constitution IV): `packages/tokens/`, holding:
  - `package.json` and `README.md`;
  - `penpot/tokens.json` (the export) and `motion/tokens.json` (the motion source);
  - `src/index.ts`, `src/tokens.generated.ts` and `src/tokens.generated.css`;
  - `test/tokens.test.ts`.
- Check source: `tools/token-check/src/`
- Check tests: `tools/token-check/test/`, helper in `tools/token-check/test/helpers/tokens.ts`,
  committed samples in `tools/token-check/test/__fixtures__/`
- Shared code from 001:
  - `tools/traceability/src/report.ts` (`compare`, `Location`);
  - `tools/traceability/src/source.ts` (`parseSource`, `createLocator`, `literalParts`, `visitAll`);
  - `tools/traceability/src/files.ts` (`isExcludedDir`, `isTestFile`);
  - `tools/traceability/src/node-version.js` (`nodeVersionProblem`);
  - `tools/traceability/test/helpers/project.ts` (`makeProject`, `REPO_ROOT`).
- Shared code from 002:
  - `tools/content-check/src/json.ts` (`readDocument`, `locate`, `offsetToLocation`);
  - `tools/content-check/src/facts.ts` (`searchFiles`).
- Root toolchain: `package.json`, `package-lock.json`. `tsconfig.json` and `vitest.config.ts`
  need no change (plan Structure Decision).
- CI and merge rule: `.github/workflows/ci.yml`, `.github/rulesets/main.json`
- No `os-core`, shells, apps or `/cv` are created (plan Structure Decision)

## Rules that apply to every task

- **The export is Penpot's file** (FR-001, research R2):
  - Never edit `packages/tokens/penpot/tokens.json` by hand, and never save it from an editor
    that adds a final newline.
  - Scripts that change it for a scenario write `JSON.stringify(value, null, 2)` with no final
    newline, and the change is reverted with `git checkout`.
- Code uses erasable TypeScript only: no enums, namespaces with runtime code, or parameter
  properties. Relative imports use explicit `.ts` extensions. Modules are plain functions, with
  no classes, plugins or configuration file (plan Dependencies table).
- **The check writes nothing and makes no network calls** (FR-041):
  - it reads files with synchronous `node:fs` calls;
  - only `npm run token-output` writes, and only the two generated files.
- **Cite sources by repository and path, never by URL**, in comments and anywhere else in
  `tools/token-check/src/`. For example: `penpot/penpot` 2.18.3
  `common/src/app/common/types/token.cljc`, or React 19.3.1
  `packages/react-dom-bindings/src/shared/isUnitlessNumber.js`. T018's no-network test greps
  that folder for `http:`, `https:` and `penpot.app`.
- Sorting always uses 001's `compare` (code-unit order), never `localeCompare` (FR-037).
- Lines and columns count from 1. Columns count UTF-16 code units (data-model.md Location).
- **Problem details**:
  - values inside them are written with `JSON.stringify`;
  - every detail and stderr message is exactly as contracts/cli.md lists it (Details and Output
    streams);
  - the wording in the tasks below repeats it for convenience, and if the two differ, the
    contract wins;
  - where the contract elides wording with `…`, the tasks below give it.
- **Test titles**:
  - Every test or `describe` title carries only full, existing IDs, e.g.
    `describe('003-design-tokens-FR-009: every reference to a missing token is reported', …)`.
  - One `describe` group per requirement works well.
  - Titles and tags must contain no other `fr-` text in any letter case, because 001's
    traceability check reads them (research R20). Sample values, such as `1fr`, go in test
    bodies.
  - Tests for success criteria without an FR use titles such as `describe('seeded samples (SC-001)', …)`.
- Never write a JSX `data-req` attribute or a `'data-req'` object property anywhere in this
  feature's code, tests or fixtures. 001's check reads `.ts` and `.tsx` files for them.
- **No test writes inside the repository**:
  - Sample projects come from `makeProject`, through this feature's `tokenProject` helper
    (temporary directories).
  - Tests that read the real repository or a committed fixture only read, so they can run at the
    same time as others.
- **Samples and fixtures hold literal design values on purpose** (`#1a1a1a`, `12px`). They live
  in test files and `__fixtures__/`, which no check searches. Never put one in a site file of the
  real repository.
- Run everything with Node 26 active (`nvm use`), as the shell's default Node is older.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The `@cv/tokens` workspace, the four pinned packages and the two scripts

- [X] T001 Create the scripts in `package.json` and the package `packages/tokens/package.json` (research R1, R18; contracts/cli.md Commands; contracts/token-output.md):
  - In the root `package.json`, add two scripts, keeping the existing five:
    - `"token-check": "node --permission --allow-fs-read=. --allow-addons tools/token-check/src/main.js"`. No network or write grant;
    - `"token-output": "node tools/token-check/src/generate-output.ts"`.
  - Create `packages/tokens/package.json` with:
    - `"name": "@cv/tokens"`, `"private": true`, `"type": "module"`;
    - `"exports": { ".": "./src/index.ts", "./tokens.css": "./src/tokens.generated.css" }`;
    - no `dependencies`, `devDependencies`, `author` or `scripts`.

    It's searched by 002's key facts search, so it must not contain the owner's name or email.
- [X] T002 Install the dev dependencies into `package.json` and `package-lock.json`, after T001, with Node 26 active and its bundled npm:
  1. `npm install --save-dev --save-exact postcss@8.5.31 css-tree@3.2.1 @types/css-tree@3.2.0 expr-eval-fork@3.0.3`.
  2. Confirm `package-lock.json` has:
     - a `node_modules/@cv/tokens` link to `packages/tokens`;
     - single, top-level copies of the four packages at those versions.
  3. Confirm `expr-eval-fork` resolves with its own types: its `exports["."].types` is `./parser.d.ts`, and `import { Parser } from 'expr-eval-fork'` type-checks.
  4. Commit `package-lock.json`.

  `package.json` must end with exactly eleven `devDependencies`: the seven already there, each unchanged, plus these four, each pinned exactly with no `^` or `~`. It must have no `dependencies` (plan Dependencies table, Constitution X).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared site-file walk, fixed paths, shared types and lists, the starter motion
source, and the test helper. Every story needs them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: omitted. spec.md's Design section says "**No UI**: this feature
adds or changes no user interface."

- [X] T003 [P] Share 002's site-file walk in `tools/content-check/src/facts.ts` (research R13, plan Dependencies "Shared site-file walk"):
  - In `tools/content-check/src/facts.ts`, change `searchFiles(root, resumeFile)` to `searchFiles(root, excluded: readonly string[])`. Each entry is a path relative to the root:
    - a directory whose path is in the list isn't visited;
    - a file whose path is in the list isn't read.
  - Update its comment.
  - In `tools/content-check/src/check.ts`, call `searchFiles(root, [RESUME_FILE])`.
  - Nothing else changes: every content-check test passes unchanged, and `npm run content-check` prints the same report as before.
- [X] T004 [P] Create `tools/token-check/src/paths.ts` (contracts/cli.md fixed paths). All paths are relative to the run root, with `/` separators:
  - `EXPORT_FILE = 'packages/tokens/penpot/tokens.json'`;
  - `MOTION_FILE = 'packages/tokens/motion/tokens.json'`;
  - `OUTPUT_CSS_FILE = 'packages/tokens/src/tokens.generated.css'`;
  - `OUTPUT_TS_FILE = 'packages/tokens/src/tokens.generated.ts'`.
- [X] T005 [P] Define the shared types in `tools/token-check/src/report.ts`. Rendering comes in T024. Use no enums. The types follow data-model.md and contracts/cli.md:
  - `Location`: import the type from `tools/traceability/src/report.ts`.
  - `PROBLEM_TYPES`: the 23 types as a readonly array, in data-model.md's Problem table order, from `unreadable-file` to `literal-value`. `ProblemType` is its element type.
  - `Problem = { type: ProblemType; subject: string; location: Location; detail: string }`.
  - `SourceState = 'checked' | 'missing' | 'unreadable'`.
  - `PARTS`, in this order: `'export rules'`, `'motion rules'`, `'cross-source rules'`, `'derived output'`, `'token names in site files'`, `'literal values search'`. `Part` is its element type.
  - `OutputState = 'current' | 'stale' | 'not checked'`.
  - `LiteralKind = 'color' | 'length' | 'font-family' | 'shadow' | 'duration' | 'easing'`.
  - `Report`:
    - `problems: Problem[]`;
    - `sources`: two entries, `{ label: 'Token export' | 'Motion token source'; file: string; state: SourceState; sets: number; themes: number; tokens: number }`;
    - `activeThemes: string | null`: the active combination, such as `mode/light + motion/standard`, or `null` for `not known`;
    - `output: OutputState`;
    - `filesSearched: number` and `filesWithoutStyles: number`;
    - `checksNotRun: Part[]`;
    - `result: 'pass' | 'fail'`.

    Counts by type are computed when rendering.
- [X] T006 [P] Create the starter motion token source `packages/tokens/motion/tokens.json` (FR-006, FR-008, research R4, data-model.md Starter tokens). It holds exactly the example in contracts/token-sources.md Motion token source:
  - set `motion`, holding:
    - `motion.duration.fast` `"150ms"`;
    - `motion.duration.base` `"250ms"`;
    - `motion.duration.slow` `"{motion.duration.base} * 2"`;
    - `motion.easing.standard` `[0.2, 0, 0, 1]`;
  - each token with `"$description": ""`;
  - theme `standard` in group `motion`, enabling `motion`, with `"isSource": false` and `"description": ""`. Its `id` is one UUID made with `node -e "console.log(crypto.randomUUID())"`;
  - `$metadata`: `tokenSetOrder: ["motion"]`, `activeThemes: ["motion/standard"]`, `activeSets: ["motion"]`.

  Write it as `JSON.stringify(value, null, 2)` with no final newline, the same form as the export.
- [X] T007 [P] Create the shared lists in `tools/token-check/src/classify.ts` (research R8, R10, R15; contracts/literal-values.md). US3 adds the classification functions (T051). Export, each as a frozen array of lower-case strings unless noted:
  - `NAMED_COLORS`: the 148 named colors of CSS Color 4, plus `transparent`;
  - `SYSTEM_COLORS`: the 19 current system colors and the 23 deprecated ones from CSS Color 4, written in their spec case (`Canvas`, `CanvasText`, …). Matching is case-insensitive;
  - `GENERIC_FAMILIES`: `serif`, `sans-serif`, `monospace`, `cursive`, `fantasy`, `math`, `system-ui`, `ui-serif`, `ui-sans-serif`, `ui-monospace`, `ui-rounded`;
  - `LENGTH_UNITS`: `px cm mm q in pt pc em rem ex rex cap rcap ch rch ic ric lh rlh`;
  - `DURATION_UNITS`: `s ms`;
  - `EASING_KEYWORDS`: `linear ease ease-in ease-out ease-in-out step-start step-end`;
  - `LINE_WIDTH_KEYWORDS`: `thin medium thick hairline`;
  - `FONT_SIZE_KEYWORDS`: `xx-small x-small small medium large x-large xx-large xxx-large larger smaller`;
  - `SYSTEM_FONT_KEYWORDS`: `caption icon menu message-box small-caption status-bar`;
  - `NEUTRAL_KEYWORDS`: `inherit initial unset revert currentcolor transparent none auto`.
- [X] T008 [P] Create the test helper `tools/token-check/test/helpers/tokens.ts` (research R20, plan Dependencies "Test helper"):
  - Re-export `REPO_ROOT` and `makeProject` from `../../../traceability/test/helpers/project.ts`.
  - `CLI_PATH = path.join(REPO_ROOT, 'tools/token-check/src/main.js')` and `GENERATE_PATH = path.join(REPO_ROOT, 'tools/token-check/src/generate-output.ts')`.
  - `runCli(cwd, args = [])`:
    - spawns `spawnSync(process.execPath, ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, '--allow-addons', CLI_PATH, ...args], { cwd, encoding: 'utf8' })`;
    - returns `{ status, stdout, stderr }`.

    It uses the same grants as the `token-check` script, plus the repository, so Node can load the check and its packages.
  - `runGenerate(cwd)`: `spawnSync(process.execPath, [GENERATE_PATH], { cwd, encoding: 'utf8' })`, returning the same shape.
  - `SAMPLE_EXPORT`: a small valid export. Sets `base` then `light`, every token with `"$description": ""`:
    - `base`:
      - `color.base.ink` color `#1f1d1a`, `color.base.paper` color `#faf8f5`;
      - `space.4` spacing `"16"`;
      - `breakpoint.wide` dimension `"768"`;
      - `font.family.body` fontFamilies `["Source Serif 4", "serif"]`, `font.size.body` fontSizes `"16"`;
      - `typography.body` typography `{ "fontFamilies": "{font.family.body}", "fontSizes": "{font.size.body}", "lineHeights": "1.5" }`;
    - `light`: `color.text.primary` color `{color.base.ink}`;
    - theme: `id` `00000000-0000-4000-8000-000000000001`, `name` `light`, `group` `mode`, `description` `""`, `isSource` `false`, `selectedTokenSets` `{ "base": "enabled", "light": "enabled" }`;
    - `$metadata`: `tokenSetOrder: ["base", "light"]`, `activeThemes: ["mode/light"]`, `activeSets: ["base", "light"]`.
  - `SAMPLE_MOTION`: set `motion` with `motion.duration.fast` duration `"150ms"` and `motion.easing.standard` cubicBezier `[0.2, 0, 0, 1]`, and theme `standard` in group `motion` with `id` `00000000-0000-4000-8000-000000000002`, laid out like the starter motion source.
  - `tokenFiles({ penpot, motion, files })`: returns the `Record<string, string>` for `makeProject`.
    - `penpot` and `motion` default to the samples. Tests change a copy made with `structuredClone`.
    - An object is written as `JSON.stringify(value, null, 2)` at its fixed path.
    - A string is written as is, for syntax errors and repeated keys.
    - `null` leaves the file out, for missing sources.
    - `files` adds any other files.
  - `tokenProject(options)`: `makeProject(tokenFiles(options))`, returning the root. Call it inside tests only. T045 extends it to write the derived output.
- [X] T009 Verify the toolchain with the root `package.json` scripts, after T001 to T008:
  - `npm run typecheck` passes.
  - `npm test` passes, except 001's `tools/traceability/test/self-check.test.ts`, which fails until T091 because 003's spec is Approved and its 58 requirements aren't covered yet. `npm run traceability` already ends `FAIL: 58 problems found.` That failure is expected. Any other failure is a defect.
  - `npm run content-check` still passes. It now also searches `packages/tokens/package.json` and `packages/tokens/motion/tokens.json` for key facts.

**Checkpoint**: Foundation ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Keep the tokens exactly as Penpot exports them, and check them (Priority: P1) 🎯 MVP

**Goal**: The starter tokens are made in the site's Penpot file and committed as Penpot's Single
file export, byte for byte. `npm run token-check` reads both token sources and checks:

- their structure against what Penpot writes;
- sets and themes;
- references, loops and arithmetic, resolved per combination;
- values against what Penpot accepts.

It prints every problem as `file:line:column`, followed by the summary. It runs offline and gives
the same output every run.

**Independent Test**: run `npm run token-check` on the real repository: it passes and reports the
sets, themes and tokens it checked. Make `color.text.primary` refer to `{color.base.inc}` and the
check fails, naming the file, the path and the missing name (spec US1, quickstart scenario 3).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**
>
> - Sample projects come from `tokenProject({ … })`.
> - Most tests call `runCheck(root)` from `src/check.ts` in-process and assert on
>   `report.problems`: type, subject, location and detail.
> - Until US2, the derived output part doesn't run and file counts are 0. Later stories must
>   not change these assertions.

- [X] T010 [P] [US1] Write `packages/tokens/test/tokens.test.ts`, which reads the real export as text with `fs.readFileSync`. It covers 003-design-tokens-FR-001, 003-design-tokens-FR-003, 003-design-tokens-FR-004, 003-design-tokens-FR-006 and 003-design-tokens-FR-007.
  - FR-001:
    - `packages/tokens/penpot/tokens.json` exists;
    - it holds at least one token of each Penpot-held category: `color`, typography (`typography`), spacing (`spacing`), radii (`borderRadius`) and shadows (`shadow`);
    - its text equals `JSON.stringify(JSON.parse(text), null, 2)`, and it doesn't end with `\n`.
  - FR-003:
    - `runCheck(REPO_ROOT)` has no `unsupported-content` problem in the export;
    - every theme has exactly the six fields `id`, `name`, `group`, `description`, `isSource`, `selectedTokenSets`;
    - `$metadata.tokenSetOrder` lists every set exactly once.
  - FR-004: the export has exactly one theme, its `group` is non-empty, and no other theme in either source shares that group.
  - FR-006, the export's part. US5 adds the motion part (T072):
    - a color with transparency (a 4- or 8-digit hex, or `rgba(`/`hsla(`);
    - a token whose value contains a `{…}` reference;
    - a typography token with at least two fields;
    - a shadow;
    - a token whose name starts with `breakpoint.`;
    - no font family, in any `fontFamilies` value or typography field, is an Apple font or the system interface font. That means none matches `/^\.?SF\b/i`, `San Francisco` or `New York`, none is `system-ui`, `-apple-system` or `BlinkMacSystemFont`, and none starts with `ui-` (Constitution IX).
  - FR-007:
    - the export is in Penpot's written form (the FR-001 form assertion);
    - every theme `id` matches `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/`;
    - every token has a `$description` string.
- [X] T011 [P] [US1] Write `tools/token-check/test/sources.test.ts`, covering 003-design-tokens-FR-013 and 003-design-tokens-FR-016, through `runCheck` on samples.
  - FR-013: each of these gives exactly one `unsupported-content` at its position, with the detail from contracts/cli.md:
    - a `duration` token in the export, at its `$type` value (US1 scenario 5), with detail `Penpot doesn't support the type "duration"; durations and easing curves go in the motion token source`;
    - a `boolean` token;
    - `$extensions` on a token (`Penpot doesn't write "$extensions" in a token`);
    - a `$type` on a group;
    - a dotted key `"text.primary"` (`Penpot writes each name part as its own key, not "text.primary"`);
    - legacy `value`/`type` keys instead of `$value`/`$type`;
    - a token without `$description` (`Penpot always writes "$description" in a token`);
    - an extra theme field;
    - `"disabled"` in `selectedTokenSets` (`Penpot writes only "enabled" here`);
    - an extra `$metadata` field;
    - a top-level `$foo` key;
    - `tokenSetOrder` missing a set (subject `$metadata.tokenSetOrder`);
    - an unknown key in a typography value;
    - a shadow written as a single object instead of an array.
  - FR-016:
    - a key repeated in one set gives one `duplicate-token`, at the first occurrence's key. The export is written as a string, since `JSON.stringify` can't repeat a key. Its detail is `defined 2 times in set "base": <line:column>, <line:column>`;
    - `"text.primary"` beside `text` → `primary` gives one `duplicate-token` listing both occurrences, as well as the dotted key's `unsupported-content`;
    - the same name in two different sets is not a `duplicate-token`.
- [X] T012 [P] [US1] Write `tools/token-check/test/themes.test.ts`. It covers 003-design-tokens-FR-004, 003-design-tokens-FR-011, 003-design-tokens-FR-012 and 003-design-tokens-FR-018. US4 and US5 add groups to this file.
  - FR-004:
    - a theme enabling no sets gives `theme-without-sets`, subject `theme "mode/hc"`, at the theme object, detail `enables no set`;
    - a theme with `"group": ""` gives `theme-without-group`, subject `theme "/print"`, detail `has no theme group`;
    - an export with no sets, `"$themes": []` and empty `$metadata` arrays gives `theme-without-sets` at the `$themes` value, subject `$themes`, detail `the export has no theme; at least one theme with at least one set is needed`.

    Each of these three samples gives exactly that one problem, so assert the whole `report.problems`. A theme with either problem takes no part in combinations or active themes (data-model.md, Which themes take part), so US4's rules add nothing here.
  - FR-011 (US1 scenario 4): a theme enabling `brand-dark`, which no set is named, gives `missing-set`, subject `theme "mode/light"`, at the theme object, detail `enables set "brand-dark", which the export doesn't contain`.
  - FR-012 (US4 scenario 6): a set `drafts`, listed in `tokenSetOrder` but enabled by no theme, gives `unused-set`, subject `set "drafts"`, at the set's key, detail `no theme enables it, so code can never read its tokens`.
  - FR-018: an enabled set holding `{}` gives no problem.
- [X] T013 [P] [US1] Write `tools/token-check/test/resolve.test.ts`. It covers 003-design-tokens-FR-009, 003-design-tokens-FR-010, 003-design-tokens-FR-015 and 003-design-tokens-FR-017. US5 adds a group.
  - FR-009 (US1 scenario 2):
    - `color.text.primary` → `{color.base.ink}` with no such token gives `missing-reference` at its `$value`, detail `refers to "color.base.ink", which no enabled set defines in mode/light`;
    - with themes `light` and `dark` in group `mode` (only `light` active), a reference that resolves through `light`'s sets but not through `dark`'s is reported once, naming `mode/dark` only.
  - FR-010 (US1 scenario 3):
    - `space.a` → `{space.b}` and `space.b` → `{space.a}` give exactly one `reference-loop`, subject `space.a`, at `space.a`'s `$value`, detail `references form a loop: space.a, space.b, space.a`;
    - a loop `space.e` → `space.c` → `space.d` → `space.e` is listed from `space.c`;
    - `space.f` → `{space.a}` gets no problem of its own.
  - FR-015:
    - these resolve with no problem: a reference inside a typography field, inside a shadow's `color`, `{space.4} * 2`, and `roundTo({space.4} / 3, 1)`;
    - each of them, pointing at a missing name, gives `missing-reference` on the token that holds it.
  - FR-017 (US4 scenario 5):
    - sets `base` and `brand` both define `color.accent` as a color, and `brand` comes later in `tokenSetOrder`. That gives no problem, and `checkSources(root).resolved.export.get('mode/light')?.get('color.accent')?.value` is `brand`'s value;
    - with `brand`'s `color.accent` a `number`, the result is one `conflicting-types`, subject `color.accent`, detail `is a color in set "base" and a number in set "brand", both enabled in mode/light`.
- [X] T014 [P] [US1] Write `tools/token-check/test/math.test.ts`, covering 003-design-tokens-FR-015 (arithmetic, research R7). It tests `evaluateMath(text, units)` from `src/math.ts` with `units` `['px', '%']` or `['ms', 's']`.
  - These evaluate:
    - `16 * 2` → `32`, `8px + 8` → `16px`, `50% / 2` → `25%`;
    - `10 % 3` → `1` (a spaced `%` is the remainder);
    - `roundTo(16 / 3, 1)` → `5.3`, `1 / 3` → `0.3333` (4 fraction digits);
    - `250ms * 2` → `500ms`, `-(4) + 2` → `-2`.
  - `8px + 2%` and `0.3s + 100ms` give `mixed-units`.
  - `1rem * 2` gives `unknown-unit`.
  - `1 / 0` gives `not-a-number`.
  - A plain value with no operator, such as `16px`, is returned unchanged.
- [X] T015 [P] [US1] Write `tools/token-check/test/values.test.ts`. It covers 003-design-tokens-FR-014 and 003-design-tokens-FR-019. US5 adds FR-045.
  - FR-014:
    - `valueProblem(type, value, name)` from `src/values.ts` accepts and rejects every form in data-model.md Value rules, for each of the 17 export types. A JSON number is accepted wherever a numeric string is.
    - Through `runCheck` on samples, each of these gives one `invalid-value` with the detail from contracts/cli.md:
      - spacing `1.5rem` (`"1.5rem" is not a length Penpot accepts (a number, optionally with px or %)`);
      - fontWeights `450`;
      - a color referring to `{space.4}`, so it resolves to `16`, reported on the color (`"16" is not a color (#hex, rgb(), rgba(), hsl(), hsla() or a named color)`);
      - borderWidth `-1` (`"-1" is negative`);
      - spacing `{space.4} + 2%` (`arithmetic "{space.4} + 2%" mixes units`);
      - a typography with `lineHeights` and no `fontSizes`;
      - `breakpoint.half` of `50%` (`a breakpoint needs a length in px`).
  - FR-019: `#0008`, `#00000080`, `rgba(0, 0, 0, 0.5)`, `hsla(0, 0%, 0%, 0.5)` and `rgba({color.base.ink}, 0.5)` give no problem.
- [X] T016 [P] [US1] Write `tools/token-check/test/report.test.ts`. It covers 003-design-tokens-FR-035, 003-design-tokens-FR-036 and 003-design-tokens-FR-037. It tests `sortProblems` and `renderReport` from `src/report.ts` on hand-built reports, and `runCheck`/`runCli` on samples.
  - FR-035:
    - every problem line matches `/^[^\s:]+:\d+:\d+ [a-z-]+ .+: .+$/`, carrying file, line, column, type, subject and detail;
    - a `missing-reference` in a two-theme sample names its combination;
    - an export with a missing comma gives `unreadable-file`, subject the file, at the syntax error's line and column, detail `invalid JSON: comma expected`.
  - FR-036: compare whole rendered strings with contracts/cli.md:
    - the passing summary exactly as in the contract;
    - the summary with an unreadable export;
    - a source line reads `<file> (<state>)` and, when `checked`, `: N sets, N themes, N tokens`, singular for 1;
    - `Active themes:` holds the combination or `not known`;
    - `Derived output:` holds `current`, `stale` or `not checked`;
    - `Checks not run:` lists parts in `PARTS` order, or `none`;
    - every problem type is listed with its count, zeros included, in `PROBLEM_TYPES` order;
    - `FAIL: 1 problem found.` and `FAIL: 3 problems found.`, with ` Some checks could not run.` appended when `checksNotRun` isn't empty;
    - with no problems, the report starts at `Summary`. With problems: problem lines, one empty line, then the summary. It ends with exactly one `\n`.
  - FR-037:
    - `sortProblems` orders by file in code-unit order (`Z.json` before `a.json`), then line, column, type order and subject, and shuffling its input doesn't change the result;
    - two `runCheck` runs on the same sample render identical strings;
    - a sample whose `activeThemes` and `selectedTokenSets` keys are listed in another order gives the same report;
    - `runCli` with `LC_ALL=tr_TR.UTF-8` gives the same stdout as with `LC_ALL=C`.
- [X] T017 [P] [US1] Write `tools/token-check/test/check.test.ts`, covering 003-design-tokens-FR-034 and 003-design-tokens-FR-038. US3 adds a case to the FR-034 group.
  - FR-034:
    - one sample with an `unsupported-content`, an `invalid-value`, a `missing-reference`, a `reference-loop`, a `missing-set`, an `unused-set`, a `theme-without-group` and a `duplicate-token` reports all eight in one run;
    - an export with a syntax error still runs the motion rules: an unused set in the motion source is reported;
    - in that case, `checksNotRun` is `['export rules', 'cross-source rules', 'derived output', 'token names in site files']`.
  - FR-038:
    - a missing export or motion source each gives `missing-file`, subject the file, at `1:1`, detail `file not found`, and `result` `fail`;
    - any problem gives `fail`, none gives `pass`;
    - via `runCli`, the CLI exits 1 and 0 for those.
- [X] T018 [P] [US1] Write `tools/token-check/test/cli.test.ts`, covering 003-design-tokens-FR-040 and 003-design-tokens-FR-041.
  - FR-040:
    - in the repository root, `npm run --silent token-check` and `runCli(REPO_ROOT)` print the same stdout and exit with the same code. Run npm the way 002's `cli.test.ts` does: `spawnSync(process.execPath, [npmCli, 'run', '--silent', 'token-check'], …)`;
    - `package.json`'s `token-check` script is exactly `node --permission --allow-fs-read=. --allow-addons tools/token-check/src/main.js`;
    - any argument writes `usage: npm run token-check (takes no arguments)` to stderr and exits 2;
    - stdout holds only the report.
  - FR-041:
    - `runCli` on a passing sample exits 0 (US1 scenario 7);
    - a positive-control script in a temporary directory, run with `--permission --allow-fs-read=<that directory> --allow-addons` and no network grant, calls `fetch('http://127.0.0.1:9/')` and prints `ERR_ACCESS_DENIED`, as 001's and 002's tests do;
    - `nodeVersionProblem('24.21.0', 'token check')` is `token check needs Node 26 or later (see .nvmrc) to block network access, but this is Node 24.21.0`;
    - a grep of `tools/token-check/src/` finds no `http:`, `https:` or `penpot.app`. Source citations use repository paths, not URLs (Rules that apply to every task).

### Implementation for User Story 1

- [X] T019 [P] [US1] Owner action, with help: make the starter tokens in the site's Penpot file and export them to `packages/tokens/penpot/tokens.json` (FR-001, FR-006, FR-007, research R21, data-model.md Starter tokens). Ask the owner for the site's Penpot file.
  1. Create exactly the 24 export tokens in data-model.md's table, with values as Penpot stores them:
     - sets `base` then `light`;
     - theme `light` in group `mode`, enabling both sets and active;
     - no set switched on outside the theme.

     This can be done in Penpot's tokens panel, or through the Penpot MCP server's `execute_code` with the plugin API (`penpot.library.local.tokens`: `addSet`, `addTheme`, `TokenSet.addToken`, `TokenTheme.addSet`). Penpot validates every value either way.
  2. The owner exports from the tokens panel with the **Single file** tab and saves the download over `packages/tokens/penpot/tokens.json`. Penpot has no API to export tokens.
  3. Confirm the file doesn't end with `\n`, and record the Penpot version for the PR (T094).

  **Done on 2026-10-22**: the 24 tokens, sets `base` and `light` and theme `mode/light` were made
  in the site's Penpot file ("Theme") through the Penpot MCP server's `execute_code`. Penpot
  accepted every value. The owner exported with the Single file tab from Penpot **2.18.4**. The
  file has no final `\n` and is committed byte for byte. Penpot writes a typography's font
  families as a list holding the reference (`"fontFamilies": ["{font.family.body}"]`), which the
  resolver didn't substitute. `resolve.ts` now splices a referenced list into a list, with tests
  in `resolve.test.ts` and `output.test.ts`.
- [X] T020 [P] [US1] Implement `tools/token-check/src/sources.ts` (research R3, R5; data-model.md SourceRead, TokenSet, TokenDefinition; contracts/token-sources.md Layout):
  - **Reading**: `readSource(root, source: 'export' | 'motion')`.
    - Read the source with 002's `readDocument`.
    - Map its `missing-document` to `missing-file` and its `unreadable-document` to `unreadable-file`, keeping the location and detail. The subject is the file.
    - The state is `checked`, `missing` or `unreadable`.
  - **The model**: walk the `jsonc-parser` tree, not the `JSON.parse` value, so repeated keys are seen. It gives:
    - sets: each top-level key not starting with `$`, with its order from `tokenSetOrder`;
    - definitions in source order, each with:
      - `name`: the key parts joined by `.`, a dotted key contributing its parts as written;
      - `set`, `type`, `value` and `description`;
      - `references`: every `{name}` in any string at any depth of the value;
      - the locations of its key, `$type` value and `$value`;
    - themes, with their locations;
    - `$metadata`, with the location of each field's value.
  - **Structure** (FR-013): each of these is `unsupported-content`:
    - a token object without exactly `$value`, `$type` and `$description`;
    - a `$` key in a group;
    - a dotted key;
    - legacy `value`/`type`;
    - a top-level `$` key other than `$themes` and `$metadata`;
    - a theme without exactly `id` (non-empty string), `name` (non-empty string), `group` (string), `description` (string), `isSource` (`false`) and `selectedTokenSets` (an object whose values are all `"enabled"`);
    - `$metadata` without exactly `tokenSetOrder`, `activeThemes` and `activeSets`, each an array of strings;
    - `tokenSetOrder` not listing every set exactly once (`must list every set exactly once; <set list> <missing | repeated>`);
    - a typography value with a key other than the seven in data-model.md Value rules;
    - a shadow `$value` that isn't an array, or a shadow object with a key other than `offsetX`, `offsetY`, `blur`, `spread`, `color` and `inset`.
  - **Structure locations and subjects**:
    - an unexpected key is located at the key, a missing field at its object, and a wrong value at the value;
    - subjects are the token name, `theme "<group>/<name>"`, `$themes`, `$metadata`, `$metadata.<field>` or the top-level key.
  - **Types**: in the export, a `$type` outside the 17 Penpot types (research R3) is `unsupported-content` at the `$type` value. For `duration` and `cubicBezier`, the detail adds `; durations and easing curves go in the motion token source`. In the motion source, any type other than `duration` and `cubicBezier` is `unsupported-content` until US5 (T073).
  - **Duplicates** (FR-016): the same name twice in one set, from repeated keys or a dotted key beside a nested path, is one `duplicate-token`:
    - located at the first occurrence's key;
    - detail `defined <n> times in set "<set>": <line:column list>`.
  - Descriptions are kept exactly, with any characters (spec Edge Cases).
  - Counts for the summary: sets, themes and token definitions.
- [X] T021 [P] [US1] Implement `tools/token-check/src/math.ts` (research R7): `evaluateMath(text, units): { value: string } | { error: 'mixed-units' | 'unknown-unit' | 'not-a-number' }`.
  - **Plain values**: text with no operator or function call is returned unchanged.
  - **Units**: a unit is letters or `%` directly after a number. A `%` with a space before it is the remainder operator.
    - A unit outside `units` gives `unknown-unit`.
    - Two different units give `mixed-units`.
    - Unitless operands take the one unit.
  - **Evaluation**:
    1. Strip the units.
    2. Call `Parser.evaluate(expression)` from `expr-eval-fork`, with no variables and no custom functions.
    3. A throw or a result that isn't a finite number gives `not-a-number`.
    4. Round to 4 fraction digits with `Number(result.toFixed(4))`.
    5. Append the unit.
- [X] T022 [P] [US1] Implement `tools/token-check/src/values.ts` (research R8, data-model.md Value rules): `valueProblem(type, value, name): string | null`. It returns the `invalid-value` detail, or `null` when the value is accepted.
  - **Colors** (FR-019):
    - `#` and 3, 4, 6 or 8 hex digits;
    - `rgb()`/`rgba()` with three numbers from 0 to 255 or percentages and an optional alpha, comma-separated or space-separated with `/` before the alpha;
    - `hsl()`/`hsla()` with a hue, two percentages and an optional alpha;
    - a name in `NAMED_COLORS`, ignoring case;
    - `rgba(<hex>, <alpha>)`.
  - **Dimension-like types** use Penpot's `^\s*(-?[0-9]+\.?[0-9]*)(px|%)?\s*$`. `borderWidth` and shadow `blur` must not be negative (`"<v>" is negative`).
  - **Font weights**: copy the named weights from Penpot 2.18.3's `common/src/app/common/types/token.cljc` lines 624-660.
  - **Typography and shadow** values check each field with its own type's rule. `lineHeights` without `fontSizes` gives `"lineHeights" needs "fontSizes" in the same typography`.
  - **Breakpoints**: a name whose first part is `breakpoint` must resolve to a number, optionally with `px` (`a breakpoint needs a length in px`).
  - **Details** where contracts/cli.md elides them:
    - `<v> is not an opacity (a number from 0 to 1, or a percentage from 0% to 100%)`;
    - `<v> is not a number (a number with no unit)`;
    - `<v> is not a font weight Penpot accepts (100 to 900 in hundreds, 950, or a named weight such as Regular or Bold, optionally followed by italic)`;
    - `<v> is not a font family list (an array of names, or one comma-separated string)`;
    - `<v> is not a letter spacing (a number, optionally with px)`;
    - `<v> is not a text case (none, uppercase, lowercase or capitalize)`;
    - `<v> is not a text decoration (none, underline or strike-through)`.
  - `duration` and `cubicBezier` return `null` until US5 (T074).
- [X] T023 [P] [US1] Implement `tools/token-check/src/themes.ts` (research R6; data-model.md Theme, ThemeGroup and Combination):
  - **Themes**: identify a theme by `group` and `name` across both sources, so a theme in both is one theme (FR-048).
    - A theme that gets `theme-without-group` or `theme-without-sets` takes no part in groups, combinations or active themes. Its sets still count as enabled for `unused-set` (data-model.md, Which themes take part).
    - The groups are the groups with a taking-part theme in either source. A source's own groups are those where it has one.
  - **Combinations** (data-model.md, Full combinations), groups and themes in code-unit order. `combinationName` writes them as `mode/light + motion/standard`.
    - `fullCombinations(groups)`: one theme from every group.
    - `sourceCombinations(source)`: one theme from each of that source's own groups. Resolution runs over these.
    - `sourceCombination(full, source)`: the source combination a full combination picks for that source. It's `null` when one of the source's own groups has no theme of the picked name, and the source then contributes no tokens to that full combination.
  - **Active combination**: the theme each group's `activeThemes` entry names, across both sources, when every group has exactly one. Entries naming a theme that takes no part are ignored. Otherwise `null`. US4 adds the problems (T062).
  - **Rules**, per source:
    - `theme-without-sets` (FR-004): a theme enabling no set, at the theme object; a source with no theme, at `$themes`, with the export or motion token source wording;
    - `theme-without-group` (FR-004);
    - `missing-set` (FR-011): `enables set "<set>", which the <export | motion token source> doesn't contain`;
    - `unused-set` (FR-012): a set no theme of its source enables, at its key;
    - an empty set is accepted (FR-018).
- [X] T024 [P] [US1] Implement problem ordering and rendering in `tools/token-check/src/report.ts`, following contracts/cli.md exactly:
  - `sortProblems(problems)`: by `location.file` with 001's `compare`, then line, column, the index in `PROBLEM_TYPES`, and subject with `compare`.
  - `renderReport(report)`:
    1. One line per sorted problem: `<file>:<line>:<column> <type> <subject>: <detail>`.
    2. If there were problems, one empty line.
    3. `Summary`.
    4. Seven labelled lines: two spaces, then the label with its colon padded to 30 characters, so every value starts at column 33:
       - `Token export` and `Motion token source`;
       - `Active themes`;
       - `Derived output`;
       - `Site files searched` and `Site files without styles`;
       - `Checks not run`.
    5. `  Problems:` padded the same way, then the total.
    6. One line per type: four spaces, the type padded to 28 characters, then the count.
    7. An empty line, then the result line:
       - `PASS: both token sources are valid and no literal design values were found.`;
       - or `FAIL: N problems found.` (`1 problem`), with ` Some checks could not run.` when any part didn't run.
    8. A single trailing `\n`.
- [X] T025 [US1] Implement `tools/token-check/src/resolve.ts`, after T020 to T023 (research R6, R7, R8; data-model.md Resolution). For each source, and each of its source combinations (`sourceCombinations` from T023):
  - **Merge** the enabled sets in `tokenSetOrder`, later sets winning (FR-017). Two candidates with different types are one `conflicting-types` per name, at the winning definition's `$value`. Detail: `is <a type> in set "<a>" and <a type> in set "<b>", both enabled in <combos>`.
  - **References** resolve against the merged tokens of the same source (FR-009, FR-015):
    - the whole value;
    - inside arithmetic;
    - each typography field;
    - each shadow field;
    - inside `rgba({name}, <alpha>)`.

    A name that isn't there is one `missing-reference` per referring definition and missing name, listing every combination where it fails. In US1 this includes names that exist only in the other source. US5 turns those into `cross-source-reference` (T075).
  - **Loops** (FR-010): reference cycles in each combination are each reported once across all combinations:
    - starting from the name that sorts first, and ending with it again;
    - located at that name's `$value`.

    Tokens that only depend on a loop, or on a token already reported, get no problem.
  - **Values**:
    - arithmetic is evaluated with `evaluateMath`, using `['px', '%']`, or `['ms', 's']` for `duration`;
    - `mixed-units` gives `arithmetic <v> mixes units`;
    - the result is checked with `valueProblem`;
    - each definition gets at most one `invalid-value`, unless its value came from a token that is itself reported.
  - **Return** each source's resolved tokens per combination, as `Map<combination name, Map<name, { name, type, value, definition }>>`, plus the problems.
- [X] T026 [US1] Implement `tools/token-check/src/check.ts`, after T024 and T025 (data-model.md Check parts):
  - `checkSources(root)`:
    - reads both sources and runs the export rules and the motion rules (structure, sets, themes, resolution and values within each source);
    - collects the cross-source rules (US2, US4 and US5 add to them);
    - returns `{ reads, problems, resolved: { export, motion }, groups, activeCombination, partsNotRun }`.
  - `runCheck(root): Report`:
    - the derived output, token names in site files and the literal values search arrive in US2 and US3. Until then, `output` is `not checked` and the file counts are 0;
    - `checksNotRun` follows data-model.md's Check parts table from the start, for all six parts: export rules and cross-source rules need the export; motion rules and cross-source rules need the motion source; and so on;
    - `activeThemes` is the active combination's name, or `null` when either source isn't `checked`;
    - `result` is `fail` exactly when there's a problem, and problems are sorted with `sortProblems`.
- [X] T027 [US1] Implement the entry points `tools/token-check/src/cli.ts` and `tools/token-check/src/main.js`, after T026 (contracts/cli.md; research R17, R18):
  - `tools/token-check/src/cli.ts`:
    - with any argument, write `usage: npm run token-check (takes no arguments)` to stderr and set exit code 2;
    - otherwise write `renderReport(runCheck(process.cwd()))` to stdout and set exit code 1 or 0;
    - on any thrown error, write `token check could not run: <message>` to stderr and set exit code 2;
    - set `process.exitCode`, and never call `process.exit()`.
  - `tools/token-check/src/main.js`: plain JavaScript, as 002's `main.js`.
    - Call `nodeVersionProblem(process.versions.node, 'token check')`. If it returns a message, write it to stderr and exit 2.
    - Otherwise `await import('./cli.ts')`. On a load failure, write `token check could not start: <message>` and exit 2.
  - Then run `npm run token-check` once, and confirm Node 26 accepts the flags and loads `jsonc-parser` and `expr-eval-fork`.
- [X] T028 [US1] Checkpoint on the real `packages/tokens/`, after T019 to T027:
  - `npm run typecheck` passes. `npm test` passes, except 001's self-check (expected until T091).
  - `npm run token-check` exits 0. Its summary shows:
    - `Token export: … (checked): 2 sets, 1 theme, 24 tokens`;
    - `Motion token source: … (checked): 1 set, 1 theme, 4 tokens`;
    - `Active themes: mode/light + motion/standard`;
    - `Derived output: not checked`;
    - the `PASS` line.
  - Quickstart scenario 3 gives exactly its four lines. Revert with `git checkout -- packages/tokens/penpot/tokens.json`.
  - `npm run traceability` reports exactly 35 uncovered 003 requirements: FR-002, FR-005, FR-008, FR-020 to FR-033, FR-039, and FR-042 to FR-058. Any other problem is a defect.

**Checkpoint**: User Story 1 is fully functional and testable on its own. This is the MVP.

---

## Phase 4: User Story 2 - Code reads tokens by name, and a wrong name fails before merge (Priority: P2)

**Goal**:

- The check reports token names code can't use.
- `npm run token-output` generates `tokens.generated.css` and `tokens.generated.ts`, and the
  check reports them when stale.
- `@cv/tokens` exports the reading functions, whose `TokenName` types make a wrong name fail
  `npm run typecheck`.
- In style sheets and component strings, the check reports unknown `--token-` names and local
  variables defined in the token namespace.

**Independent Test**: a style reading `var(--token-color-text-primray)` fails the check, naming
the token, file and line. `cssVar('color.text.primray')` fails `npm run typecheck` with `TS2345`.
The correct names pass (spec US2, quickstart scenario 5).

### Tests for User Story 2 (REQUIRED) ⚠️

> Samples that should pass rely on `tokenProject` writing current derived output (T045). Style
> sheets and components in these tests hold no literal design values, so US3 doesn't change their
> results.

- [X] T029 [P] [US2] Write `tools/token-check/test/names.test.ts`. It covers 003-design-tokens-FR-020, 003-design-tokens-FR-021 and 003-design-tokens-FR-022, through `runCheck` on samples. US5 adds cases across the two sources.
  - FR-020: each of these gives `unusable-name` at the offending key:
    - a dotted key `"color..x"` and an empty key `""`, each with `has an empty name part`;
    - `color.text.primary$`, `color.tëxt` and a key `"text primary"`, each with `name part "<part>" may hold only ASCII letters, digits, hyphens and underscores`.
  - FR-021: each pair gives exactly one `name-collision`, at the first name in code-unit order. Its detail is `code would read these names the same, as <code name>: <names>`:
    - `space.1-5` with `space.1.5` (US2 scenario 6), as `--token-space-1-5`;
    - `Color.x` with `color.x`;
    - `a_b` with `a-b`;
    - a token `typography.body-font-size` with the typography token `typography.body`.
  - FR-022: `color.primary` with `color.primary.light` gives `token-used-as-group` at `color.primary`'s key, detail `is a token and also a group of color.primary.light`:
    - in one set, through a dotted key `"primary.light"`, which also gives its `unsupported-content`;
    - across two sets.
- [X] T030 [P] [US2] Write `tools/token-check/test/output.test.ts`. It covers 003-design-tokens-FR-005, 003-design-tokens-FR-019, 003-design-tokens-FR-025 and 003-design-tokens-FR-052. US4 adds FR-054. It tests `buildOutput` and `outputFor(root)`, `runCheck` on samples, and `runGenerate`.
  - FR-005:
    - a sample whose committed CSS has one byte changed gives `stale-output`, subject the CSS path, at `1:1`, detail `doesn't match the token sources; run npm run token-output`. `report.output` is `stale`;
    - a sample without the TS file gives `is missing; run npm run token-output`;
    - `runGenerate` on a sample with a `missing-reference` prints the report, exits 1 and writes nothing;
    - on a sample with no generated files, it writes both, printing `wrote <path>` for each and exiting 0;
    - run again, it prints `unchanged <path>` for each.
  - FR-019 (US2 scenario 5): `#00000080` is written unchanged in the CSS, and `rgba(#1f1d1a, 0.5)` becomes `rgb(31 29 26 / 0.5)`.
  - FR-025:
    - `tokenTypes` in the generated TS lists every name from both sources with its `$type`, in code-unit order, and the text contains none of `penpot`, `motion token source` or `export"`;
    - a token added to a sample appears in both files after `runGenerate`, with no other edit (US2 scenario 4);
    - the CSS and TS start with the header comments in contracts/token-output.md and are rebuilt byte for byte from the same sources;
    - each conversion in contracts/token-output.md Values gives the expected text: a unitless length gets `px`, `rotation` gets `deg`, font families are quoted except generic ones, a named weight becomes a number, `strike-through` becomes `line-through`, a shadow list, a duration as resolved, and `cubic-bezier(0.2, 0, 0, 1)`;
    - `typography.body` gives only the custom properties for the parts it sets, under `--token-typography-body-<part>`.
  - FR-052: `breakpoint.wide` of `768` gives `--token-breakpoint-wide: 768px;` in `:root` and `@custom-media --token-breakpoint-wide (width >= 768px);`.
- [X] T031 [P] [US2] Write `tools/token-check/test/css.test.ts`, the token-name groups. It covers 003-design-tokens-FR-026, 003-design-tokens-FR-051, 003-design-tokens-FR-052 and 003-design-tokens-FR-058, through `runCheck` on samples with `packages/web/src/card.css`. US3 adds the literal-value groups.
  - FR-026 (US2 scenarios 1 and 2):
    - `color: var(--token-color-text-primary)` gives nothing;
    - `background: var(--token-color-text-primray)` gives `unknown-token`, subject `--token-color-text-primray`, at the name's line and column, detail `no token has this name`;
    - `var(--token-typography-body-font-size)` gives nothing, and `var(--token-typography-body)` gives `unknown-token`.
  - FR-051:
    - `--card-gap: var(--token-space-4)` gives nothing (US2 scenario 7);
    - `--token-card-gap: var(--token-space-4)` and `--TOKEN-x: 0` each give `local-in-token-namespace` at the property, detail `--token- names are reserved for tokens; use another name for a local variable` (US2 scenario 8);
    - `@custom-media --token-x (orientation: landscape);` does too.
  - FR-052: `@media (--token-breakpoint-wide)` and `@media not (--token-breakpoint-wide)` give nothing. `@media (--token-breakpoint-wiide)` and `@media (--token-space-4)` give `unknown-token`, detail `no breakpoint token has this name`.
  - FR-058 (US2 scenario 9): `padding: var(--token-color-text-primary)` gives nothing.
- [X] T032 [P] [US2] Write `tools/token-check/test/components.test.ts`, the token-name groups. It covers 003-design-tokens-FR-026 and 003-design-tokens-FR-051, through `runCheck` on samples with `packages/web/src/card.tsx`. US3 adds the literal-value groups.
  - FR-026 (US2 scenario 3):
    - `const raw = 'var(--token-color-text-primray)'` gives `unknown-token` at the name's column inside the string;
    - the same in a template literal part does too;
    - `'var(--token-color-text-primary)'` gives nothing.
  - FR-051: each of these gives `local-in-token-namespace`:
    - `<div style={{ '--token-x': 'var(--token-space-4)' }} />`;
    - `el.style.setProperty('--token-x', 'var(--token-space-4)')`.

    `<div style={{ '--card-gap': 'var(--token-space-4)' }} />` gives nothing.
- [X] T033 [P] [US2] Create the code fixture `tools/token-check/test/__fixtures__/code/` (research R12, R20). It sits outside the root typecheck (`exclude` has `**/__fixtures__/**`). US5 adds two files (T070).
  - `package.json`: `{ "type": "module" }`. With `module: nodenext`, a TSX file with no `"type": "module"` above it is CommonJS, and `verbatimModuleSyntax` then rejects every `import` and `export` with TS1295 and TS1287 (checked with tsc 7.0.2). The temporary project has no other `package.json` above the fixture files.
  - `tsconfig.json`, self-contained because it's copied into a temporary project:
    - the root `tsconfig.json`'s `compilerOptions`, with `"types": []` and `"jsx": "preserve"`;
    - `"include": ["*.tsx", "*.d.ts"]`.
  - `jsx.d.ts`: a global `declare namespace JSX { interface IntrinsicElements { [element: string]: { style?: Record<string, string | number | undefined> } } }`. No React types are added (Constitution X).
  - `reads-tokens.tsx`, importing from `'@cv/tokens'`. It must compile:
    - `<p style={{ ...typography('typography.body'), color: cssVar('color.text.primary') }} />`;
    - `padding: cssVar('color.text.primary')` (FR-058);
    - `cssVar('space.4')`;
    - `mediaQuery('breakpoint.wide')`.
  - `misspelled-color.tsx`: `export const typo = cssVar('color.text.primray');` on line 3, after the import and an empty line.
- [X] T034 [P] [US2] Write `tools/token-check/test/code.test.ts`. It covers 003-design-tokens-FR-026 and 003-design-tokens-FR-058. US4 and US5 add groups. A local helper `compileAgainst(outputRoot)`:
  1. Builds a temporary project with `makeProject`, holding:
     - the fixture's files, `package.json` included;
     - `packages/tokens/package.json` and `packages/tokens/src/index.ts`, copied from the real package;
     - `packages/tokens/src/tokens.generated.ts`, from `outputFor(outputRoot)`.
  2. Links `node_modules/@cv/tokens` to `packages/tokens` with `fs.symlinkSync(…, 'dir')`, as the real workspace does.
  3. Spawns `<REPO_ROOT>/node_modules/.bin/tsc -p . --noEmit --pretty false` with `cwd` set to the temporary project, so error paths are relative to it.
  4. Returns the parsed `<file>(<line>,<column>): error TS<code>: <message>` lines.

  It caches the parsed lines by the generated TS text, so `tsc` runs once per output however many groups compile against it: once for the one-theme sample and once for `two-themes` (plan Scale/Scope). Each case has a 60 s timeout.
  - FR-026 (US2 scenario 3): against a `tokenProject()` sample, `misspelled-color.tsx` has exactly one error: `TS2345` at line 3, at the column of the string, with a message containing `"color.text.primray"`.
  - FR-058: `reads-tokens.tsx` has no error, including the color token used as a padding.
- [X] T035 [P] [US2] Write `tools/token-check/test/self-check.test.ts`, the requirement groups. It covers 003-design-tokens-FR-002 and 003-design-tokens-FR-005. US5 adds FR-050, and Polish adds the SC groups.
  - FR-002 (US1 scenario 6, SC-003):
    1. Copy the real `packages/tokens/` into a `makeProject` sample.
    2. Change `color.base.ink` in its export to `#2a2723`, and rewrite it as `JSON.stringify(value, null, 2)` with no final newline.
    3. `runCli` now gives `stale-output` for both generated files.
    4. After `runGenerate`, `runCli` exits 0.
    5. The CSS holds `--token-color-base-ink: #2a2723;`.
    6. Comparing every file with the original copy, only the export and the two generated files differ.
  - FR-005: `runCheck(REPO_ROOT).output` is `current`, with no `stale-output`.
- [X] T036 [P] [US2] Add 003-design-tokens-FR-019, 003-design-tokens-FR-025 and 003-design-tokens-FR-052 groups to `packages/tokens/test/tokens.test.ts`. They import from `'@cv/tokens'`.
  - FR-019: `tokenValue('color.overlay')` is `'#00000080'` (US2 scenario 5).
  - FR-025:
    - `cssVar('color.text.primary')` is `'var(--token-color-text-primary)'`;
    - for every name in `tokenTypes` except typography tokens, `cssVar(name)` equals `` `var(${codeName(name)})` `` from `tools/token-check/src/names.ts`, so the package's mapping and the check's can't drift (research R9).
  - FR-052: `mediaQuery('breakpoint.wide')` is `'(width >= 768px)'`.

### Implementation for User Story 2

- [X] T037 [P] [US2] Implement `tools/token-check/src/names.ts` (research R9; data-model.md Code name):
  - `codeName(name)`: `'--token-' + name.toLowerCase().replace(/[._]/g, '-')`.
  - `TYPOGRAPHY_PARTS`: `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, `text-transform`, `text-decoration`.
  - `isBreakpoint(name)`: the first part is `breakpoint`.
  - `inTokenNamespace(cssName)`: it starts with `--token-`, ignoring case.
  - `cssNames(types)`: the CSS names the description defines:
    - every token's code name, except typography tokens, which have no single custom property;
    - for each typography token, the code names of its eight `<name>.<part>` sub-names;
  - `mediaNames(types)`: breakpoint code names.
  - Rules, given every definition from both sources:
    - `unusable-name` (FR-020): a part that's empty or doesn't match `^[A-Za-z0-9_-]+$`, at the key, with the cli.md details;
    - `name-collision` (FR-021): different names sharing a code name, including typography sub-names. Located at the first name's key, in code-unit order;
    - `token-used-as-group` (FR-022): a token name that also begins another token's name, at the shorter name's key, detail naming the first longer name in code-unit order.
- [X] T038 [P] [US2] Implement `tools/token-check/src/output.ts` (research R10, R11; contracts/token-output.md). It holds `buildOutput(input): { css: string; ts: string }`, a pure function. The input is the resolved tokens of every full combination (`fullCombinations` from T023, each source contributing its resolution through `sourceCombination`), `tokenTypes`, the theme groups and the active combination.
  - **CSS**:
    1. The two-line header comment from contracts/token-output.md.
    2. `:root {`, then one `  <code name>: <value>;` per custom property of the active combination, sorted by code name with `compare`, then `}`.
    3. If any breakpoint exists, an empty line and one `@custom-media <code name> (width >= <value>);` per breakpoint, sorted.
    4. A final `\n`.
  - **Values**: converted per contracts/token-output.md Values. A typography token gives one property per part it sets. `font-style` is written `italic` only when the weight ends in ` italic`.
  - **TS**:
    - the first line is `// Generated by npm run token-output from packages/tokens/penpot/tokens.json and packages/tokens/motion/tokens.json. Do not edit.`, then an empty line;
    - then four `export const … = { … } as const;` declarations, separated by empty lines:
      - `tokenTypes`: each source name → its `$type`;
      - `themeGroups`: each group → its theme names;
      - `activeThemes`: each group → its active theme;
      - `themeValues`: each combination name → each source name → its CSS text. A typography token maps to an object of its parts' CSS texts, keyed by part.
    - Keys sort in code-unit order, keys and strings are written with `JSON.stringify`, indentation is two spaces, and the file ends with `\n`.
  - Nothing in either file tells which source a token came from (FR-025, FR-049).
- [X] T039 [P] [US2] Implement `tools/token-check/src/site-files.ts` (research R13; data-model.md SiteFile): `siteFiles(root)`.
  - Call `searchFiles(root, [EXPORT_FILE, MOTION_FILE])`. The walk already skips the generated files, `packages/tokens/test/` and the package README. `packages/tokens/src/index.ts` and any other file in the package is searched like any site file (FR-033, data-model.md SiteFile).
  - Then drop files with the image and font extensions in data-model.md (`.svg`, `.png`, …, `.eot`).
  - Classify what's left:
    - `style-sheet`: `.css`;
    - `component`: `.ts .tsx .js .jsx .mts .cts .mjs .cjs`;
    - `no-reader`: `.scss .sass .less .styl .pcss .postcss .html .htm .vue .svelte .astro .mdx`. Each is an `unreadable-file` at `1:1`, detail `no reader for .<ext> files; the token check must support this file type before it can be used`;
    - `without-styles`: every other text file.
  - Each unreadable path from the walk is an `unreadable-file` at `1:1`, detail `cannot be read: <code>`.
  - **Counts**:
    - `filesSearched` counts style sheets and components, whether or not they parse;
    - `filesWithoutStyles` counts the rest;
    - `no-reader` files and the walk's binary files count in neither.
- [X] T040 [P] [US2] Implement `tools/token-check/src/css.ts`, the structure and token names (research R14; contracts/literal-values.md Token names): `readStyleSheet(file, text)`.
  - **Parsing**:
    - Parse with `postcss.parse(text, { from: file })`.
    - A `CssSyntaxError` gives `unreadable-file` at its `line` and `column`, detail `cannot be parsed: <reason>`.
    - Locate offsets with 001's `createLocator(file, text)`.
  - **Declaration values**: the raw value is `decl.raws.value?.raw ?? decl.value`. It starts at `decl.source.start.offset + decl.prop.length + decl.raws.between.length`. Parse it with css-tree `parse(raw, { context: 'value', positions: true, parseCustomProperty: true, offset: <start> })`, so every node's `loc.start.offset` is a file offset.
  - **Preludes**: `@media`, `@container` and `@custom-media` preludes are `atRule.raws.params?.raw ?? atRule.params`, starting after `@<name>` and `raws.afterName`. Parse them with `context: 'mediaQueryList'` the same way.
  - **Reads**:
    - every `var()` whose first argument is in the token namespace is a property read;
    - every media feature `(--token-…)` in a `@media` or `@container` prelude is a media read.
  - **Definitions**:
    - every declaration whose property is in the namespace;
    - every `@custom-media` whose name is.
  - Return `{ reads, definitions, problem }`, each with its location. US3 adds the literal values to the same walk.
- [X] T041 [P] [US2] Implement `tools/token-check/src/components.ts`, the token names (research R16): `readComponent(file, text)`.
  - Parse with 001's `parseSource`. On a parse problem, return this check's `unreadable-file`, subject the file, with that problem's location and detail.
  - With `visitAll` and `literalParts`, find every `--token-[A-Za-z0-9_-]+` in every string literal and template literal part. It's a definition when the string is:
    - a key of a JSX `style` prop's object literal;
    - the first argument of a `.setProperty(` call.

    Otherwise it's a read.
  - Locate each at the string offset plus its index with `createLocator`. US3 adds the literal values.
- [X] T042 [US2] Wire US2 into `tools/token-check/src/check.ts`, after T037 to T041:
  - **Names**: `unusable-name` joins each source's rules. `name-collision` and `token-used-as-group` join the cross-source rules. Both run over every definition of the sources that are `checked`.
  - **Description**: from the resolved names and types, build `cssNames` and `mediaNames`.
  - **`outputFor(root)`**: `{ css, ts }` from `buildOutput`, or `null` when either source isn't `checked`, any source-rule problem exists, or the active combination is `null`.
  - **Derived output**:
    - when `outputFor` gives output, compare it byte for byte with both committed files, and add `stale-output` at `1:1` for each that differs or is missing;
    - `output` is `current` or `stale`;
    - otherwise `output` is `not checked`, and `derived output` is in `checksNotRun`.
  - **Site files**:
    - run `siteFiles`, and read style sheets and components;
    - set `filesSearched` and `filesWithoutStyles`;
    - add `local-in-token-namespace` for every definition. This is part of the literal values search, which always runs;
    - when both sources are `checked`, add `unknown-token` for every property read not in `cssNames` and every media read not in `mediaNames`, with the cli.md details. Otherwise add `token names in site files` to `checksNotRun`.
- [X] T043 [US2] Implement `tools/token-check/src/generate-output.ts`, after T042 (contracts/cli.md `npm run token-output`). It runs from `process.cwd()`:
  - when `outputFor` gives `null`, write `renderReport(runCheck(root))` to stdout, write nothing else, and set exit code 1;
  - otherwise, for each generated file, compare it with what's on disk, write it only if it differs, and print `wrote <path>` or `unchanged <path>`. Set exit code 0;
  - on a thrown error, write `token output could not run: <message>` to stderr and set exit code 2.

  Then run `npm run token-output`, and commit `packages/tokens/src/tokens.generated.css` and `packages/tokens/src/tokens.generated.ts`.
- [X] T044 [US2] Create `packages/tokens/src/index.ts`, after T043 (contracts/token-output.md Import; research R12). Import the four constants from `./tokens.generated.ts` and re-export them. Then:
  - `export type TokenName = keyof typeof tokenTypes`;
  - `TokenType`: the union of the 19 type strings;
  - `NamesOfType<T>`: the names whose `tokenTypes` entry is `T`;
  - `TypographyTokenName = NamesOfType<'typography'>`, `CssVarTokenName = Exclude<TokenName, TypographyTokenName>`, `DurationTokenName = NamesOfType<'duration'>`, and `BreakpointTokenName = Extract<TokenName, `breakpoint.${string}`>`;
  - a local `cssName(name)` with the same mapping as `names.ts`'s `codeName`. T036 asserts they agree;
  - `cssVar(name: CssVarTokenName)` returns `` `var(${cssName(name)})` ``;
  - `typography(name: TypographyTokenName)` returns `{ fontFamily, fontSize, fontWeight, fontStyle, lineHeight, letterSpacing, textTransform, textDecoration }`, each `var(<code name of name.<part>>)`;
  - `tokenValue(name: CssVarTokenName)` returns the active combination's CSS text from `themeValues`;
  - `mediaQuery(name: BreakpointTokenName)` returns `` `(width >= ${tokenValue(name)})` ``;
  - `durationMs(name: DurationTokenName)` returns the active value in milliseconds (`ms` as is, `s` × 1000).

  The active combination's name is built from `activeThemes` with the same rule as `combinationName`. The file holds no token name or value.

  It's site source, so the token-name and literal values searches read it (T039). Build each CSS name from `'--token-'` and the token name, so no string holds a whole `--token-…` name, and write no design value. Confirm `npm run typecheck` passes.
- [X] T045 [US2] Extend `tokenProject` in `tools/token-check/test/helpers/tokens.ts`, after T042. Unless `output: false` is passed, write both generated files from `outputFor(root)` into the sample after `makeProject`, when it isn't `null`.
- [X] T046 [US2] Checkpoint, with `packages/tokens/src/tokens.generated.css` and `tokens.generated.ts` committed:
  - `npm run typecheck` and `npm test` pass (001's self-check still excepted).
  - `npm run token-check` passes. Its summary shows `Derived output: current`, `Site files searched: 2` (`packages/content/src/index.ts` and `packages/tokens/src/index.ts`) and `Site files without styles: 5`.
  - Quickstart scenario 5 gives its expected lines, except the `literal-value` line, which US3 adds. The typecheck fails with one `TS2345` in `oops.ts`. Delete `packages/web/` afterwards.
  - `npm run traceability` no longer lists FR-002, FR-005, FR-020 to FR-022, FR-025, FR-026, FR-051, FR-052 or FR-058.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Block literal design values in the site's styles and components (Priority: P3)

**Goal**: The literal values search reports every color, length, font family, shadow, duration
and easing curve written out in the site's style sheets and components. The only exceptions are
the neutral values, comments, and the excluded files and contexts the spec lists. Nothing in a
file can switch it off.

**Independent Test**: a style setting `color: #1a1a1a` fails the check, naming the file, line and
value. The same value in a spec, a doc and a test isn't reported. `margin: 0` and
`border-color: currentColor` aren't reported (spec US3, quickstart scenario 6).

### Tests for User Story 3 (REQUIRED) ⚠️

> Each case asserts the `literal-value` subject (the kind), file, line, column and detail.
> Details: `<v> is written out; use a token`, or `<v> is written out as the fallback of a token;
> remove it or use a token` for the fallback of a `var(--token-…)`, or `<n> is a <length |
> duration> written out; use a token` for a plain number.

- [X] T047 [P] [US3] Add the literal-value groups to `tools/token-check/test/css.test.ts`. They cover 003-design-tokens-FR-027, 003-design-tokens-FR-029, 003-design-tokens-FR-030, 003-design-tokens-FR-031, 003-design-tokens-FR-032, 003-design-tokens-FR-053, 003-design-tokens-FR-056 and 003-design-tokens-FR-057. The cases are those of contracts/literal-values.md Style sheets and its scenario table.
  - FR-027: each of these is reported:
    - `padding: 12px` → `length "12px"` (US3 scenario 1);
    - `font-family: Georgia, serif` → one `font-family "Georgia, serif"` (scenario 3);
    - `transition: opacity 200ms ease-out` → `duration "200ms"` and `easing "ease-out"` (scenario 4);
    - `@media (min-width: 768px)` → `length "768px"` (scenario 9);
    - `box-shadow: 0 1px 3px #1f1d1a29` → exactly one `shadow "0 1px 3px #1f1d1a29"`;
    - `--card-gap: 12px` and `calc(100% - 12px)` → `length "12px"`;
    - `cubic-bezier(0.2, 0, 0, 1)` → `easing`;
    - a declaration in `@keyframes` and one in `@font-face`;
    - `--token-card-gap: 4px` → both its `local-in-token-namespace` and `length "4px"`.
  - FR-029 (US3 scenario 6): none of these gives anything:
    - `margin: 0`, `0px`, `0s`;
    - `color: inherit`, `initial`, `unset`, `revert`, `currentColor`, `transparent`, `none`, `auto`;
    - `width: 100%`, `50vw`, `1fr`;
    - `rotate: 45deg`, `line-height: 1.5`, `z-index: 10`, `font-weight: 700`;
    - `color-mix(in srgb, var(--token-color-surface) 80%, transparent)`;
    - `rgb(from var(--token-color-base-ink) r g b / 50%)`.
  - Never read, so nothing is reported for:
    - selectors (`#main`);
    - `@supports (color: oklch(0 0 0))`;
    - `content: "#fff"`;
    - `url(#a)`.
  - FR-030:
    - `color: rebeccapurple`, `border-width: thin` and `font-size: x-large` are reported;
    - `animation-name: tomato` and `grid-area: red` aren't.
  - FR-031 (US3 scenario 5):
    - `color: var(--token-color-text-primary, #000000)` gives `color "#000000"` with the fallback detail;
    - `env(safe-area-inset-top, 12px)` gives `length "12px"` with the plain detail.
  - FR-032 (US3 scenario 8):
    - `#1a1a1a` and `12px` in a block comment give nothing;
    - so does a comment between two parts of a value;
    - `margin: /* #fff */ 12px` reports `12px` at its exact column.
  - FR-053: `stroke-width: 2` gives `length` with `2 is a length written out; use a token`.
  - FR-056 (US3 scenario 13):
    - `outline-color: Highlight` in `@media (forced-colors: active)`, directly and in a rule nested inside it, gives nothing;
    - `border-color: CanvasText` outside gives `color "CanvasText"`;
    - `CanvasText` under `@media not (forced-colors: active)`, `@media (forced-colors: active), print` and `@media (forced-colors: active) or (hover)` is reported;
    - `padding: 12px` inside the forced-colors block is reported.
  - FR-057 (US3 scenario 14): `padding: 12px; /* token-check: ignore */`, a `/* token-check-disable */ … /* token-check-enable */` block and a `/* stylelint-disable */` comment each leave `length "12px"` reported.
- [X] T048 [P] [US3] Add the literal-value groups to `tools/token-check/test/components.test.ts`. They cover 003-design-tokens-FR-028, 003-design-tokens-FR-030, 003-design-tokens-FR-053, 003-design-tokens-FR-055, 003-design-tokens-FR-056 and 003-design-tokens-FR-057. The cases are those of contracts/literal-values.md Component code and its scenario table.
  - FR-028: each of these is reported:
    - `<div style={{ background: '#00000080' }} />` → `color "#00000080"` (US3 scenario 2);
    - `x.style.padding = '12px'`, `x.style['padding'] = '12px'`, `x.style.cssText = 'padding: 12px'` and `x.style.setProperty('padding', '12px')` → `length`;
    - `x.setAttribute('fill', '#1a1a1a')` → `color`;
    - `x.animate([{ color: '#fff' }], { duration: 300, easing: 'ease-out' })` → `color`, `duration 300` and `easing`;
    - `x.animate(frames, 300)` → `duration`;
    - `const ink = '#1a1a1a'` → `color`;
    - `` `${x} 12px` `` → `length "12px"`;
    - `cond ? '#fff' : '#000'` inside a `style` prop → both;
    - `<img style={{ width: '24px' }} />` → `length "24px"`, as a size set through styles.
  - Not reported:
    - `` `${x}px` ``;
    - `const accent = 'red'` and `const gap = 12`;
    - `<Icon size={24} />`;
    - `<img width={24} height={24} />` and `<video width={640} />`, which give the media's own size (spec FR-028);
    - `className="red"`.
  - FR-030 (US3 scenario 7): `style={{ color: 'tomato' }}` gives `color "tomato"`.
  - FR-053 (US3 scenario 10):
    - `style={{ padding: 12, animationDuration: 300 }}` gives `length` (`12 is a length written out; use a token`) and `duration`;
    - `lineHeight: 1.5`, `opacity: 0.8`, `zIndex: 2` and `'--x': 12` give nothing;
    - `'line-height': 2` gives `length`.
  - FR-055 (US3 scenarios 11 and 12):
    - `<svg viewBox="0 0 24 24" width={24}><circle r={4} strokeWidth={2} /><path d="M0 0h24" /></svg>` reports only `length 2` and `length 24`;
    - `<path fill="#1a1a1a" />` reports `color`;
    - `stroke-width="2"`, `stopColor` and `font-family` attributes are checked;
    - `x`, `cx`, `points`, `transform`, `strokeDasharray` and `width` on a `<rect>` aren't.
  - FR-056: `style={{ color: 'Canvas' }}` gives `color "Canvas"`.
  - FR-057: `// token-check: ignore` and `/* eslint-disable */` before an inline `padding: '12px'` have no effect.
- [X] T049 [P] [US3] Write `tools/token-check/test/site-files.test.ts`, covering 003-design-tokens-FR-033, through `runCheck` on samples (US3 scenarios 8 and 11).
  - `#1a1a1a` as a CSS declaration is not reported in any of these:
    - `specs/x/a.css`, `docs/a.css`;
    - `packages/web/src/a.test.ts`, `packages/web/test/a.css`, `packages/web/__fixtures__/a.css`;
    - `tools/a.css`, `node_modules/x/a.css`, `.cache/a.css`;
    - `packages/web/src/a.generated.css`;
    - the two token sources, holding `#1a1a1a` as a color token's value;
    - `packages/web/public/icon.svg`;
    - a `.woff2` file.
  - A new root `site.css`, `apps/notes/a.css` and `packages/tokens/src/extra.css` are reported. Only the two sources are excluded from the token package (FR-033).
  - `packages/web/src/a.scss` gives `unreadable-file` with the no-reader detail.
  - `packages/web/src/broken.css` with an unclosed block gives `unreadable-file` at the error's position, detail `cannot be parsed: Unclosed block`. The other files are still searched.
  - `packages/web/data.json` counts in `filesWithoutStyles`.
- [X] T050 [P] [US3] Add a case to the 003-design-tokens-FR-034 group in `tools/token-check/test/check.test.ts`: with an export that has a syntax error, the literal values search still runs, and `padding: 12px` in `packages/web/src/a.css` is reported.

### Implementation for User Story 3

- [X] T051 [P] [US3] Add the classification functions to `tools/token-check/src/classify.ts` (research R15, R16; contracts/literal-values.md What is reported):
  - `dimensionKind(value, unit)`: `length` or `duration` for a non-zero number in a unit from `LENGTH_UNITS` or `DURATION_UNITS`, otherwise `null`. Units match ignoring case.
  - `colorFunctionIsLiteral(node)`:
    - true for `rgb rgba hsl hsla hwb lab lch oklab oklch color` functions;
    - false when the arguments start with `from` followed by a `var(--token-…)`.
  - `keywordKind(word, capabilities, inForcedColors)`:
    - named colors and system colors where `capabilities.color` holds, except system colors when `inForcedColors`;
    - easing keywords where `easing` holds;
    - line-width keywords where `lineWidth` holds;
    - font-size keywords where `fontSize` holds;
    - never a neutral keyword.
  - `wholeStringKind(text)`: the kind of a string whose whole trimmed text is one hex color, color function, length or duration with a unit, `cubic-bezier()`/`steps()`/`linear()`, or a full shadow. A full shadow is a value CSSTree's lexer matches as `box-shadow`, holding a literal length or color. Otherwise `null`.
  - `REACT_UNITLESS`: React DOM 19.3.1's unitless property list, copied verbatim from `packages/react-dom-bindings/src/shared/isUnitlessNumber.js` at tag `v19.3.1`, with exact camelCase names.
- [X] T052 [P] [US3] Implement `tools/token-check/src/grammar.ts` (research R14, R15): `capabilities(property)`, memoized.
  - It returns `{ color, easing, lineWidth, fontSize, length, time }`.
  - Walk `lexer.getProperty(name)?.syntax` with css-tree's `definitionSyntax.walk`:
    - follow `<type>` references through `lexer.getType` and `<'property'>` references through `lexer.getProperty`, with a visited set;
    - set `color` for `<color>`, `easing` for `<easing-function>`, `lineWidth` for `<line-width>`, `fontSize` for `<absolute-size>` or `<relative-size>`, `length` for `<length>` or `<length-percentage>`, and `time` for `<time>` or `<time-percentage>`.
  - A custom property, or a property CSSTree doesn't know, gets all six `true`.
  - `kebab(camel)` turns `backgroundColor` into `background-color`, `WebkitX` into `-webkit-x` and `msX` into `-ms-x`.
- [X] T053 [US3] Add the literal values to `tools/token-check/src/css.ts`, after T051 and T052. These are the rules of contracts/literal-values.md Style sheets, applied to every node of every parsed value and prelude:
  - **Dimensions**: by `dimensionKind`.
  - **Colors and keywords**:
    - hex colors anywhere;
    - color functions by `colorFunctionIsLiteral`;
    - identifiers by `keywordKind` with the declaration property's `capabilities`. In a prelude, the media feature's property is used.
  - **Easing functions**: `cubic-bezier()`, `steps()` and `linear()` anywhere.
  - **Font families**: in `font-family`, and the family part of `font`, one `font-family` problem per declaration, with the trimmed family list. `font` with a system font keyword gives that keyword.
  - **Shadows**: `box-shadow`, `text-shadow` and each `drop-shadow()` holding any literal length or color are one `shadow` problem with the whole value. The parts inside aren't reported again.
  - **Plain numbers**: a non-zero number in `stroke-width` is a `length`.
  - **Functions and fallbacks**:
    - `calc()`, `min()`, `max()`, `clamp()`, `color-mix()` and `light-dark()` are walked into;
    - `var()` and `env()` fallbacks are checked, with the fallback detail when the `var()` names a token;
    - strings and `url()` are skipped.
  - **Contexts**:
    - selectors and `@supports` aren't read;
    - forced colors: a node is in a forced-colors condition when any ancestor `@media` has every query in its list requiring `(forced-colors: active)` or `(forced-colors)`, alone or joined with `and`, and none negated or joined with `or`.
  - **Locations**: the node's start offset, through `createLocator`. The value text is `raw.slice(start, end)` of the node.
- [X] T054 [US3] Add the literal values to `tools/token-check/src/components.ts`, after T051 and T052. These are the places and rules of contracts/literal-values.md Component code:
  - **Literal leaves**: string, number and template literal parts, through ternaries, `??`, `||`, `&&`, parentheses, `as` and `satisfies`.
  - **`style` props**: object literals, with keys normalized by `kebab`.
    - String values are parsed with css-tree as values of that property and classified as in T053, with `inForcedColors` false.
    - A non-zero number is a `length` when the key isn't in `REACT_UNITLESS` and `capabilities(key).length` holds, and a `duration` when `time` holds.
    - Custom property keys never take a unit.
  - **SVG elements**: lowercase JSX names from SVG 2.
    - `fill`, `stroke`, `stopColor`/`stop-color`, `floodColor`/`flood-color`, `lightingColor`/`lighting-color` and `color` are colors;
    - `strokeWidth`/`stroke-width` is a length, a plain number included;
    - `fontFamily`/`font-family` is a font family;
    - `width` and `height` on `<svg>` are lengths, a plain number included;
    - every other attribute is geometry and isn't read (FR-055).
  - **Style APIs**:
    - `.style.<prop> =`, `.style['<prop>'] =`, `.style.cssText =` (parsed as a declaration list), `.style.setProperty(name, value)`;
    - `.setAttribute(name, value)` for `style` and the SVG attributes above;
    - `.animate(keyframes, options)`: keyframe properties as styles; `duration`, `delay` and `endDelay` as durations, with a plain number in milliseconds; `easing` as an easing curve; a number as the second argument as a duration.
  - **Constants**: any other string literal is reported by `wholeStringKind`, with no property.
- [X] T055 [US3] Wire the literal values search into `tools/token-check/src/check.ts`, after T053 and T054. It always runs, over every style sheet and component from `siteFiles`, and adds every `literal-value` problem.
- [X] T056 [US3] Checkpoint, with scratch files in `packages/web/`:
  - `npm test` passes (001's self-check still excepted).
  - `npm run token-check` still passes on the real repository. `packages/content/src/index.ts` and `packages/tokens/src/index.ts` hold no literal.
  - Quickstart scenario 6 gives exactly the Result column of contracts/literal-values.md's scenario table, and nothing from the comment, `icon.svg`, `docs/` or the test file. Quickstart scenario 5 now also gives `literal-value length "4px"` on line 5. Delete the scratch files afterwards.
  - `npm run traceability` no longer lists FR-027 to FR-033, FR-053 or FR-055 to FR-057.

**Checkpoint**: User Stories 1, 2 and 3 work independently.

---

## Phase 6: User Story 4 - Add themes later without changing code (Priority: P4)

**Goal**:

- Every combination of one theme per group, across both sources, resolves the same names with the
  same types.
- Every group has exactly one active theme, the same in both sources.
- The derived output holds every combination's values, and the same code compiles against a
  second theme.

**Independent Test**: the `two-themes` sample, with `mode` × `shell`, passes, and the unchanged
code fixture compiles against it. Remove `color.text.primary` from `dark` and the check names the
token and the combinations (spec US4, quickstart scenario 7).

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T057 [P] [US4] Write the two-themes fixture `tools/token-check/test/__fixtures__/two-themes/` (SC-004, research R20). Every token has `"$description": ""`.
  - `packages/tokens/penpot/tokens.json`:
    - sets `base`, `mode/light`, `mode/dark`, `shell/desktop` and `shell/mobile`, in that `tokenSetOrder`;
    - `base` holds `SAMPLE_EXPORT`'s `base` tokens except `space.4`;
    - `mode/light` has `color.text.primary` `{color.base.ink}`, and `mode/dark` has it as `{color.base.paper}`;
    - `shell/desktop` has `space.4` `"16"`, and `shell/mobile` has `space.4` `"12"`;
    - themes `mode/light` and `mode/dark` each enable `base` and their own set. Themes `shell/desktop` and `shell/mobile` each enable their own set;
    - `activeThemes` is `["mode/light", "shell/desktop"]`, and `activeSets` lists those themes' sets.
  - `packages/tokens/motion/tokens.json`: `SAMPLE_MOTION`.
  - `packages/tokens/src/tokens.generated.css` and `tokens.generated.ts`: made by running `node <REPO_ROOT>/tools/token-check/src/generate-output.ts` from inside the fixture.

  From inside the fixture, `node --permission --allow-fs-read=<REPO_ROOT> --allow-addons <REPO_ROOT>/tools/token-check/src/main.js` must print `PASS: …` (US4 scenario 4).
- [X] T058 [P] [US4] Add the 003-design-tokens-FR-023 and 003-design-tokens-FR-054 groups to `tools/token-check/test/themes.test.ts`, through `runCheck` on samples and on `makeProject` copies of `two-themes`.
  - FR-023:
    - `two-themes` gives no problem (US4 scenario 4);
    - with `color.text.primary` removed from `mode/dark`'s set (US4 scenario 2), the result is one `theme-mismatch`, subject `color.text.primary`, at its first definition's `$value`. Its detail is `missing in mode/dark + motion/standard + shell/desktop, mode/dark + motion/standard + shell/mobile`: full combinations, groups in code-unit order;
    - with `color.surface` a color in `light` and a number in `dark` (US4 scenario 3), the detail is `is a color in <light combos> and a number in <dark combos>`;
    - a theme `mode/hc` that enables no set, beside `mode/light` and `mode/dark`, and a theme `/print`, give only their `theme-without-sets` and `theme-without-group`. No `theme-mismatch` names `mode/hc`, and an `activeThemes` entry `/print` gives no `invalid-active-themes` (data-model.md, Which themes take part).
  - FR-054 (US4 scenario 8). Each gives `invalid-active-themes`, subject `group "mode"`, at the `activeThemes` value:
    - `light` and `dark` both active: `needs exactly one active theme, found 2: mode/dark, mode/light`;
    - neither active: `found 0`;
    - an entry `mode/sepia`: `activeThemes lists "mode/sepia", which is not a theme`;
    - a group in both sources with a different active theme in each: `the active theme is mode/light in the export and mode/dark in the motion token source`.

    In each case, `report.activeThemes` is `null`.
- [X] T059 [P] [US4] Add a 003-design-tokens-FR-054 group to `tools/token-check/test/output.test.ts`, on `outputFor` of the `two-themes` fixture (US4 scenario 7):
  - the CSS `:root` holds `--token-color-text-primary: #1f1d1a;`, `light`'s value;
  - `themeValues['mode/dark + motion/standard + shell/desktop']['color.text.primary']` is `#faf8f5`;
  - `themeValues` has all four combinations;
  - `activeThemes` is `{ mode: 'light', motion: 'standard', shell: 'desktop' }`.
- [X] T060 [US4] Add a 003-design-tokens-FR-024 group to `tools/token-check/test/code.test.ts`, after T057 (US4 scenario 1, SC-004). The same unchanged fixture files compile against the `two-themes` fixture's output exactly as against the one-theme sample:
  - no error in `reads-tokens.tsx`;
  - the same single `TS2345` in `misspelled-color.tsx`.
- [X] T061 [P] [US4] Add a 003-design-tokens-FR-054 group to `packages/tokens/test/tokens.test.ts`: `activeThemes` from `@cv/tokens` is `{ mode: 'light', motion: 'standard' }`, and `runCheck(REPO_ROOT).activeThemes` is `mode/light + motion/standard`.

### Implementation for User Story 4

- [X] T062 [US4] Add the theme rules to `tools/token-check/src/themes.ts` (FR-023, FR-054; data-model.md Theme rules):
  - **`invalidActiveThemes(sources, groups)`**:
    - a group with none or several active themes;
    - an `activeThemes` entry naming no theme;
    - a group in both sources whose active theme differs.

    Each is located at that source's `activeThemes` value, with the cli.md details. Entries naming a theme that takes no part (T023) are ignored. The active combination is `null` while any is reported.
  - **`themeMismatches(resolved, groups)`**:
    - for every full combination (`fullCombinations` from T023, written with all groups in code-unit order), collect each name and its winning type. Each source contributes its resolution for `sourceCombination(full, source)`, or nothing when that's `null`;
    - a name missing from some combinations is one `theme-mismatch` listing them;
    - a name whose type differs is one `theme-mismatch` listing each type with its combinations, the types in the order of their first combination;
    - located at the name's first definition's `$value`, export before motion, then by position.
- [X] T063 [US4] Wire T062 into the cross-source rules in `tools/token-check/src/check.ts`, after T062, so `outputFor` and the summary use the validated active combination.
- [X] T064 [US4] Checkpoint on `tools/token-check/test/__fixtures__/two-themes/` and the real repository:
  - `npm test` passes (001's self-check still excepted).
  - Quickstart scenario 7 gives `PASS` for `two-themes`, and the code test passes.
  - `npm run token-check` still passes.
  - `npm run traceability` no longer lists FR-023, FR-024 or FR-054.

**Checkpoint**: User Stories 1 to 4 work independently.

---

## Phase 7: User Story 5 - Tune motion in the repository (Priority: P5)

**Goal**:

- The motion token source holds only durations and easing curves, with their own value rules.
- It can't share names with the export or refer across to it.
- Code reads motion tokens exactly like any other token.

**Independent Test**: with the starter motion tokens, the check passes. Put a color token in the
motion source and the check fails, naming the file, the path and that colors belong in Penpot
(spec US5, quickstart scenario 8).

**Starts after US4**: T069 (FR-048) expects the `theme-mismatch` rule that T062 adds.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T065 [P] [US5] Write `tools/token-check/test/motion.test.ts`. It covers 003-design-tokens-FR-042, 003-design-tokens-FR-043 and 003-design-tokens-FR-044, through `runCheck` on samples.
  - FR-042:
    - a color `color.flash` in the motion source gives `wrong-source`, subject `color.flash`, at its `$type` value, detail `a color token belongs in Penpot; the motion token source holds only durations and easing curves` (US5 scenario 2);
    - a `spacing` token gives `a spacing token belongs in Penpot; …`;
    - a `boolean` token gives `unsupported-content`.
  - FR-043:
    - the starter layout passes;
    - an extra theme field, or a dotted key, in the motion source gives `unsupported-content`;
    - `duration` and `cubicBezier` are accepted.
  - FR-044: in the motion source, each of these gives its usual problem: an unused set, a missing set, a theme without a group, a missing reference, a loop, a key repeated in one set, and an unusable name.
- [X] T066 [P] [US5] Add a 003-design-tokens-FR-045 group to `tools/token-check/test/values.test.ts`.
  - `valueProblem` rejects `"-50ms"` (`is negative`), `"fast"`, `[1.5, 0, 0, 1]` (`[1.5,0,0,1] is not a cubic Bézier: the first and third numbers must be from 0 to 1`, US5 scenario 5), `[0, 0, 1]` (`… is not a cubic Bézier: it needs four numbers`) and `[0, 0, -0.1, 1]`.
  - It accepts `"0"`, `"150ms"`, `"0.3s"` and `[0.2, -0.5, 0, 1.5]`.
  - Through `runCheck`, `{motion.duration.base} * 2` passes, and `{motion.duration.base} + 1s` gives `arithmetic … mixes units`.
- [X] T067 [P] [US5] Add a 003-design-tokens-FR-046 group to `tools/token-check/test/resolve.test.ts`:
  - `motion.duration.slow` → `{space.4}` gives `cross-source-reference` at its `$value`, detail `refers to "space.4", which is in the token export; motion tokens may refer only to motion tokens` (US5 scenario 4);
  - an export token → `{motion.duration.fast}` gives `refers to "motion.duration.fast", which is in the motion token source; tokens in the export may not refer to motion tokens`;
  - neither also gives `missing-reference`.
- [X] T068 [P] [US5] Add a 003-design-tokens-FR-047 group to `tools/token-check/test/names.test.ts`, and cross-source cases to its 003-design-tokens-FR-021 and 003-design-tokens-FR-022 groups.
  - FR-047 (US5 scenario 3): `motion.duration.fast` as a `number` in the export and a duration in the motion source gives one `duplicate-token`, at the motion definition's key, detail `defined in both the token export (packages/tokens/penpot/tokens.json:<line>:<column>) and the motion token source`.
  - FR-021: a `number` token `motion.Duration.fast` in the export against `motion.duration.fast` in the motion source gives one `name-collision`, as `--token-motion-duration-fast`.
  - FR-022: a `number` token `motion.easing` in the export with `motion.easing.standard` in the motion source gives `token-used-as-group`.
- [X] T069 [P] [US5] Add a 003-design-tokens-FR-048 group to `tools/token-check/test/themes.test.ts`:
  - a motion source whose only theme is `mode/light` is the same theme as the export's: there's one combination, `mode/light`, and no problem;
  - adding `mode/dark` to the export but not to the motion source gives `theme-mismatch` for every motion token, naming `mode/dark`;
  - a motion group with `standard` and `reduced` multiplies the combinations: a duration missing from `reduced` gives `theme-mismatch` naming `mode/light + motion/reduced`.
- [X] T070 [P] [US5] Add the motion cases to `tools/token-check/test/__fixtures__/code/` and `tools/token-check/test/code.test.ts`. It covers 003-design-tokens-FR-049.
  - Add `tools/token-check/test/__fixtures__/code/reads-motion.tsx`, which reads `cssVar('motion.duration.fast')`, `durationMs('motion.duration.fast')` and `tokenValue('motion.easing.standard')`.
  - Add `tools/token-check/test/__fixtures__/code/misspelled-motion.tsx`, with `export const typo = cssVar('motion.duration.fsat');` on line 3.
  - Add a FR-049 group to `tools/token-check/test/code.test.ts` (US5 scenario 6):
    - `reads-motion.tsx` has no error;
    - `misspelled-motion.tsx` has exactly one `TS2345` naming `"motion.duration.fsat"`;
    - `buildOutput` on two inputs that differ only in which source `motion.duration.fast` came from gives identical CSS and TS.
- [X] T071 [P] [US5] Add a 003-design-tokens-FR-050 group to `tools/token-check/test/self-check.test.ts` (US5 scenario 7):
  1. Copy the real `packages/tokens/` into a sample.
  2. Change `motion.duration.fast` to `"200ms"`, then `runGenerate`.
  3. `runCli` exits 0, and the CSS holds `--token-motion-duration-fast: 200ms;`.
  4. Only the motion source and the two generated files differ from the copy.
- [X] T072 [P] [US5] Add the motion parts to `packages/tokens/test/tokens.test.ts`:
  - in the 003-design-tokens-FR-006 group, the motion source holds at least one `duration` and one `cubicBezier` (US5 scenario 1);
  - a new 003-design-tokens-FR-008 group: every `duration` and `cubicBezier` token is in `packages/tokens/motion/tokens.json`, the export has none, and `runCheck(REPO_ROOT)` counts 4 motion tokens.

### Implementation for User Story 5

- [X] T073 [P] [US5] In `tools/token-check/src/sources.ts`, report a Penpot type in the motion source as `wrong-source` at its `$type` value, detail `a <type> token belongs in Penpot; the motion token source holds only durations and easing curves` (FR-042). Any other non-motion type stays `unsupported-content`.
- [X] T074 [P] [US5] Add the motion value rules to `tools/token-check/src/values.ts` (FR-045):
  - **`duration`**: a number with `ms` or `s`, or plain `0`. Negative gives `is negative`, and anything else gives `<v> is not a duration (a number with ms or s, zero or more)`.
  - **`cubicBezier`**: an array of four finite numbers, the first and third from 0 to 1, or a whole-value reference.
    - `<v> is not a cubic Bézier: it needs four numbers`;
    - `<v> is not a cubic Bézier: the first and third numbers must be from 0 to 1`.
- [X] T075 [US5] Add the cross-source rules to `tools/token-check/src/resolve.ts` and `tools/token-check/src/check.ts`:
  - a reference whose name isn't in its own source but is in the other is `cross-source-reference`, with the detail for its direction, instead of `missing-reference` (FR-046). When the other source isn't `checked`, it stays `missing-reference` (data-model.md Check parts);
  - a name defined in both sources is one `duplicate-token` at the motion definition's key, naming the export definition's `file:line:column` (FR-047).
- [X] T076 [US5] Checkpoint on the real `packages/tokens/motion/tokens.json`:
  - `npm test` passes (001's self-check still excepted).
  - Quickstart scenario 8 gives `200ms` in the CSS, then the `wrong-source` and `invalid-value` lines. Revert with `git checkout`.
  - `npm run token-check` still passes.
  - `npm run traceability` lists only FR-039 among 003's requirements.

**Checkpoint**: All user stories are independently functional.

---

## Phase 8: Pull-Request Check (FR-039, cross-cutting)

**Purpose**: A `tokens` CI job runs `npm run token-check` on every pull request, and the ruleset
makes it required (contracts/ci.md, research R19)

- [X] T077 [P] Write `tools/token-check/test/repo-settings.test.ts`, covering 003-design-tokens-FR-039. It asserts every **[tested]** point of contracts/ci.md. It reads `.github/workflows/ci.yml` as text with the same `block`/`job` approach as 002's `tools/content-check/test/repo-settings.test.ts`, with no YAML dependency.
  - The `tokens` job has `name: tokens`, and its steps are exactly `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run token-check`.
  - Its lines have no `if:`, `strategy:`, `matrix:` or `continue-on-error:` key.
  - The ruleset's `required_status_checks` deep-equals the four entries in contracts/ci.md, each with `integration_id: 15368`.
  - Every `context` is a job id in `ci.yml`, and the `token-check` script is what the `tokens` job runs (FR-040).
- [X] T078 [P] Update the exact-match ruleset assertions in `tools/traceability/test/repo-settings.test.ts` and `tools/content-check/test/repo-settings.test.ts`, so `required_status_checks` lists `traceability`, `test`, `content` and `tokens`. Update the content test's title to match. Keep their other assertions unchanged.
- [X] T079 [P] Add the `tokens` job to `.github/workflows/ci.yml`, after `content`:
  - `name: tokens` and `runs-on: ubuntu-latest`;
  - the same `actions/checkout` and `actions/setup-node` steps as the other jobs: same SHAs and comments, `node-version-file: .nvmrc`, `cache: npm`;
  - then `- run: npm ci` and `- run: npm run token-check`;
  - no `if:`, `strategy`, `matrix` or `continue-on-error`.
- [X] T080 [P] Add `{ "context": "tokens", "integration_id": 15368 }` as the fourth entry of `required_status_checks` in `.github/rulesets/main.json`, in the existing two-space format. Change nothing else.
- [X] T081 Checkpoint, after T077 to T080: `npm test` passes, including all three `repo-settings.test.ts` files (001's self-check still excepted). `npm run traceability` no longer lists FR-039.

---

## Phase 9: Polish & Constitution Verification

**Purpose**: The seeded samples, self-check and performance tests, the README, the full
verification, the owner's Penpot round trip, and the single PR. Constitution VII and VIII don't
apply: the spec says No UI.

- [X] T082 [P] Create the committed sample `tools/token-check/test/__fixtures__/seeded/` (SC-001, research R20). Both sources are readable. It seeds at least one of every problem type except `missing-file` and `stale-output`. Every edge case in spec.md that two readable sources can hold is seeded, as listed below, with the passing ones causing no problem. T083 holds the cases that need a missing, unreadable or theme-less export, or an unreadable motion source.
  - **Export, problems**:
    - `unsupported-content`: a `duration` type, `$extensions`, a dotted key;
    - `invalid-value`: a color referring to a spacing token, and `1.5rem`;
    - `missing-reference`: one inside arithmetic, and one that fails only in `mode/dark`;
    - `reference-loop` with a token that depends on it;
    - `missing-set`, `unused-set`, `theme-without-sets`, `theme-without-group`. The last two cause nothing else (data-model.md, Which themes take part);
    - `invalid-active-themes`: both `mode` themes active, a second group with no active theme, and a group in both sources whose active theme differs. Those groups' themes define the same names, so they add no `theme-mismatch`;
    - `duplicate-token`: a repeated key, written as text;
    - `conflicting-types`;
    - `unusable-name`: an empty name part, and a part with a non-ASCII letter;
    - `name-collision`: two export names, and an export name against a motion name;
    - `token-used-as-group`;
    - `theme-mismatch`: a name missing from `mode/dark`.
  - **Export, edge cases that pass**:
    - an empty enabled set;
    - colors with transparency in every accepted form;
    - a non-ASCII description;
    - references inside typography and shadow values;
    - the same name in two sets with the same type, later set winning.
  - **Motion source**: `wrong-source` (a color), `invalid-value` (`"-50ms"`, `[1.5, 0, 0, 1]` and `[0, 0, 1]`), `cross-source-reference` (both directions), and `duplicate-token` (a name in both sources).
  - **Site files**, with `packages/web/src/card.css` and `packages/web/src/card.tsx`:
    - `unknown-token` and `local-in-token-namespace`;
    - every `literal-value` kind, including a fallback, a breakpoint, a shadow, a plain number, an icon fill, a built-in named color (FR-030), `CanvasText` in a style sheet and a system color in an inline style;
    - passing cases: `Highlight` in forced colors, a comment, a skip comment that has no effect, a color token used as padding, a local variable, SVG geometry, a percentage, a viewport unit, a grid fraction, a line-height ratio, and an image's `width` and `height` attributes;
    - `packages/web/src/broken.css` (unreadable) and `packages/web/src/app.scss` (no reader);
    - `packages/web/public/icon.svg` with colors.
  - **Not site source**: `#1a1a1a` in `specs/x/spec.md`, `docs/x.md`, `packages/web/src/card.test.ts`, `packages/web/__fixtures__/x.css`, `tools/x.css` and `packages/web/src/x.generated.css`. None may be reported. Third-party code and version-control data can't be committed inside a sample, so T086 adds them to a copy.
  - **`expected-report.txt`**:
    1. From the sample directory, run `node --permission --allow-fs-read=<REPO_ROOT> --allow-addons <REPO_ROOT>/tools/token-check/src/main.js > expected-report.txt`, redirecting straight into the file. It's a root file of the sample, so it counts as a site file without styles, and the redirect creates it before the run.
    2. Run the same command a second time and confirm the file doesn't change.
    3. Check every line against the seeded cases by hand before committing.

    Its summary lists `Checks not run: derived output`, because the sources have problems (data-model.md Check parts).
- [X] T083 [P] Create the committed samples for source states that can't share `seeded/` (SC-001, spec Edge Cases). Each has an `expected-report.txt` made as in T082.
  - `tools/token-check/test/__fixtures__/seeded-broken/`:
    - an export with a syntax error (`unreadable-file`);
    - no motion source (`missing-file`);
    - `packages/web/src/a.css` with `padding: 12px`.

    Its report shows `Checks not run: export rules, motion rules, cross-source rules, derived output, token names in site files`, one `literal-value`, and ends `FAIL: 3 problems found. Some checks could not run.`
  - `tools/token-check/test/__fixtures__/seeded-missing/`: no export (`missing-file`), and a motion source with a syntax error (`unreadable-file`). Its report shows the same `Checks not run` line and ends `FAIL: 2 problems found. Some checks could not run.`
  - `tools/token-check/test/__fixtures__/seeded-no-theme/`: an export with no sets, `"$themes": []` and empty `$metadata` arrays, and `SAMPLE_MOTION`. Its report holds one `theme-without-sets` at `$themes` with the export wording, shows `Checks not run: derived output`, and ends `FAIL: 1 problem found. Some checks could not run.`
- [X] T084 [P] Create the committed sample `tools/token-check/test/__fixtures__/seeded-stale/` for `stale-output` (SC-001). `stale-output` can't share a sample with source problems, because the derived output part runs only when the sources have none (data-model.md Check parts). The sample holds:
  - `SAMPLE_EXPORT` and `SAMPLE_MOTION`;
  - a generated CSS file with one value changed by hand;
  - no generated TS file.

  Its `expected-report.txt`, made as in T082, shows two `stale-output` lines, `Derived output: stale`, `Checks not run: none`, and `FAIL: 2 problems found.`
- [x] T085 [P] Record the seeded-sample split and a combination-name fix in `specs/003-design-tokens/plan.md`, `research.md` and `quickstart.md`. Done on 2026-10-22 during `/speckit-analyze`, with the owner's approval:
  - the five-sample split (`seeded`, `seeded-broken`, `seeded-missing`, `seeded-no-theme`, `seeded-stale`) is in plan.md's SC-001 line and Project Structure, and in research.md R20;
  - quickstart.md scenario 2 runs and diffs all five samples and expects each type non-zero across them;
  - quickstart.md scenario 7 writes the `theme-mismatch` combinations with the motion group, `mode/dark + motion/standard + shell/desktop, mode/dark + motion/standard + shell/mobile`, as data-model.md's Combination rule gives.
- [X] T086 Add a seeded-samples test to `tools/token-check/test/cli.test.ts`, after T082 to T084. Its title has no FR ID, e.g. `describe('seeded samples (SC-001)', …)`.
  - For each of the five samples (`seeded`, `seeded-broken`, `seeded-missing`, `seeded-no-theme`, `seeded-stale`), `runCli(<sample dir>)` exits 1, and its stdout equals `expected-report.txt` byte for byte.
  - Across the five reports, each of the 23 problem types has a non-zero count.
  - A `makeProject` copy of `seeded/`, plus `node_modules/x/a.css` and `.git/x.css` holding `color: #1a1a1a`, gives the same stdout as `expected-report.txt`.
  - A comment at the top of the test lists each seeded case and the line it produces.
- [X] T087 [P] Add the success-criteria groups to `tools/token-check/test/self-check.test.ts`. Titles have no FR ID.
  - SC-008: `runCheck(REPO_ROOT)` has no problems and `result` `pass`. Both sources are `checked`, `output` is `current`, and `activeThemes` is `mode/light + motion/standard`.
  - SC-003: in a copy of the real `packages/tokens/`, a changed spacing value, after `runGenerate`, passes with only the export and the generated files changed.
- [X] T088 [P] Write `tools/token-check/test/performance.test.ts` (SC-006). Its title has no FR ID.
  - Time `runCli(REPO_ROOT)`: it exits 0.
  - The under-10,000 ms assertion uses `test.skipIf(process.env.CI)`, as in 001 and 002.
  - Give it a 60 s timeout.
- [X] T089 [P] Write `packages/tokens/README.md` (plan Project Structure; contracts/token-sources.md). It covers:
  - updating the export: the four steps, Single file, no final newline, active themes, no sets switched on by hand;
  - changing a motion value;
  - moving motion tokens into Penpot later;
  - reading tokens in CSS and TypeScript (contracts/token-output.md Reading tokens);
  - the `--token-` namespace rule;
  - that `@custom-media` needs the web app's CSS build to replace it.

  It holds no literal values outside code examples.
- [X] T090 [P] Audit Constitution X, IV and IX in `package.json`, `packages/tokens/` and the check's report.
  - **X**:
    - `package.json` has exactly the eleven `devDependencies` from T002, and no `dependencies`;
    - `packages/tokens/package.json` has no dependencies;
    - the only abstractions added are those in plan.md's Dependencies table. The test helper holds `REPO_ROOT` and `makeProject` (re-exported), `CLI_PATH`, `GENERATE_PATH`, `runCli`, `runGenerate`, `SAMPLE_EXPORT`, `SAMPLE_MOTION`, `tokenFiles` and `tokenProject` (T008, T045), and nothing else;
    - no agent skill was added.
  - **IV**: `npm run token-check` finds no literal design value in the repository, and `npm run content-check` still passes.
  - **IX**: no font family in either source names an Apple font or the system interface font (T010).
- [X] T091 Run the full verification with the root `package.json` scripts, after T081 to T090:
  - `npm run typecheck` passes;
  - `npm test` passes, now including 001's self-check;
  - `npm run token-check` exits 0 with the `PASS` line, and `npm run content-check` exits 0;
  - `npm run traceability` exits 0, and its last line is exactly `PASS: all 123 active requirements in 3 approved specs are covered.` That's 29 from 001, 36 from 002 and 58 from 003 (Constitution III, SC-008).
- [X] T092 Run quickstart.md scenarios 1 to 3 and 5 to 10, and record any deviation here. Write scratch output to the scratchpad, not `/tmp`.
  - Scenarios 3, 5, 6 and 8 edit files: revert each before the next.
  - Scenario 9 needs the network off. Cut it for the process tree with `sandbox-exec -p '(version 1)(allow default)(deny network*)'`, as 001 and 002 did, or have the owner turn it off.
  - Scenario 10's CI half is checked in T094.

  **Run on 2026-10-22**: scenarios 1, 2, 3, 5, 6, 7, 8, 9 and 10 gave their expected results.
  Deviations:
  - `packages/tokens/` wasn't committed yet, so scenarios 3 and 8 restored it from a scratchpad
    copy instead of `git checkout`. Scratch output went to the scratchpad, not `/tmp`.
  - Scenario 8 says to add `flash` "under the first `motion` group", but the expected subject
    `motion.flash` needs it under the token group, the second `motion` key. It was added there.
  - Scenario 9 cut the network with `sandbox-exec -p '(version 1)(allow default)(deny network*)'`.
    A control `fetch` under it failed, and the check exited 0 with scenario 1's report.
  - The checkpoints' intermediate counts (T028's 35 uncovered requirements and the like) weren't
    seen, because the story tests were written before the export arrived. At T091,
    `npm run traceability` reports all 123 requirements covered.
  - Writing the US2 and US3 tests found that `@media` and `@container` conditions were never
    read: css-tree keeps a media query's features under `condition`, not `children`. `css.ts`
    now walks it.
- [ ] T093 Owner action, in Penpot, on `packages/tokens/penpot/tokens.json`, after T091. Record both results here and in the PR:
  - **Quickstart scenario 4** (US1 scenario 6, FR-002, SC-003): change `color.base.ink`, add `color.accent`, export, run `npm run token-output`, and confirm `git status` lists only the export and the two generated files. Keep it or revert it.
  - **Quickstart scenario 11** (SC-002, FR-003):
    - import `packages/tokens/penpot/tokens.json` into an empty Penpot file;
    - confirm the active themes are `mode/light` and that `activeSets` equals the sets of the active themes (research R3);
    - export again, and run the comparison script. It prints `same`;
    - record the Penpot version.
- [ ] T094 Commit the remaining work under `packages/tokens/`, `tools/` and `.github/` with Conventional Commits, e.g. `feat(tokens): …`, `test(token-check): …`, `ci: …`. Push `003-design-tokens` and open one pull request to `main` (Constitution XI).
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description:
    - links `specs/003-design-tokens/spec.md` and `specs/003-design-tokens/tasks.md`;
    - records that the starter export was made in Penpot by the owner (FR-007, T019);
    - records the round-trip result from T093.
  - Confirm `traceability`, `test`, `content` and `tokens` all run and pass.
  - Confirm the `tokens` log shows the same report as the local run on the same commit (FR-040, quickstart scenario 10).
- [ ] T095 Owner action, needs admin rights and the open PR from T094: apply the updated ruleset with `gh api -X PUT repos/alex-profir/CV/rulesets/<id> --input .github/rulesets/main.json` (quickstart scenario 12).
  - Confirm the contexts read back as `traceability`, `test`, `content` and `tokens`.
  - Confirm a drift diff against the committed file shows only server-added fields.
- [ ] T096 Owner action, after T095: demonstrate enforcement with a scratch `packages/web/src/oops.css` (quickstart scenario 12, FR-039).
  1. Push a scratch branch with scenario 5's CSS file, and open a draft PR.
  2. Confirm `tokens` fails and that merging is blocked, with no bypass option.
  3. Close the PR unmerged, delete the branch, and record the result here.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T002 runs after T001.
- **Foundational (Phase 2)**: Depends on Setup. T003 to T008 can run together, and T009 runs
  last. It BLOCKS all user stories.
- **Design gate**: N/A. The spec says No UI.
- **User Story 1 (Phase 3)**: Depends on Foundational. Its checkpoint (T028) also needs the
  owner's export (T019).
- **User Story 2 (Phase 4)**: Depends on US1, which builds the reader, resolution and
  `check.ts`.
- **User Story 3 (Phase 5)**: Depends on US2, which builds the site-file walk and the `css.ts`
  and `components.ts` readers that US3 extends.
- **User Story 4 (Phase 6)**: Depends on US2 for the output and the code test. It doesn't depend
  on US3.
- **User Story 5 (Phase 7)**: Depends on US4, whose `theme-mismatch` rule (T062) T069 relies on
  for FR-048, and through it on US2 for the output and the code test. It doesn't depend on US3.
- **Shared files across stories**:
  - `check.ts`: T042, T055, T063, T075;
  - `themes.test.ts`: T058, T069;
  - `code.test.ts`: T060, T070;
  - `tokens.test.ts`: T061, T072.

  After US2, US3 can run beside US4 and US5, and US5 starts after US4. The shared-file tasks
  above go one after the other.
- **Pull-Request Check (Phase 8)**: Depends on US1 (the CLI the job runs). Independent of US2 to
  US5.
- **Polish (Phase 9)**:
  - depends on every earlier phase;
  - T086 needs T082 to T084;
  - T091 needs T081 to T090;
  - T093 needs Penpot and the owner;
  - T094 needs T091 to T093;
  - T095 needs the open PR from T094;
  - T096 needs T095.

### Within User Story 1

- T010 to T018 (tests) come first. They're all in different files and can run in parallel.
- T019 to T024 can run in parallel. T019 is the owner's.
- T025 runs after T020 to T023.
- T026 runs after T024 and T025, T027 after T026, and T028 last.

### Within User Story 2

- T029 to T036 come first, in parallel.
- T037 to T041 can run in parallel.
- Then T042, then T043, then T044.
- T045 runs after T042, and T046 last.

### Within User Story 3

- T047 to T050 come first, in parallel.
- T051 and T052 in parallel.
- Then T053 and T054, which can run side by side.
- Then T055, then T056.

### Within User Story 4

- T057, T058, T059 and T061 come first, in parallel. T060 runs after T057.
- Then T062, then T063, then T064.

### Within User Story 5

- T065 to T072 come first, in parallel.
- T073 and T074 in parallel.
- Then T075, then T076.

### Parallel Opportunities

- **Foundational**: T003 to T008 together.
- **US1**: nine test tasks together, then six implementation tasks together (T019 to T024).
- **US2**: eight test tasks together, then five implementation tasks together (T037 to T041).
- **After US2**: US3, US4 followed by US5, and Phase 8 can proceed side by side, apart from the
  shared files noted above.
- **Phase 8**: T077 to T080 together.
- **Polish**: T082 to T085 together, and T087 to T090 together.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "tokens.test.ts, covers 003-design-tokens-FR-001, FR-003, FR-004, FR-006, FR-007, in packages/tokens/test/tokens.test.ts"
Task: "sources.test.ts, covers 003-design-tokens-FR-013, FR-016, in tools/token-check/test/sources.test.ts"
Task: "themes.test.ts, covers 003-design-tokens-FR-004, FR-011, FR-012, FR-018, in tools/token-check/test/themes.test.ts"
Task: "resolve.test.ts, covers 003-design-tokens-FR-009, FR-010, FR-015, FR-017, in tools/token-check/test/resolve.test.ts"
Task: "math.test.ts, covers 003-design-tokens-FR-015, in tools/token-check/test/math.test.ts"
Task: "values.test.ts, covers 003-design-tokens-FR-014, FR-019, in tools/token-check/test/values.test.ts"
Task: "report.test.ts, covers 003-design-tokens-FR-035, FR-036, FR-037, in tools/token-check/test/report.test.ts"
Task: "check.test.ts, covers 003-design-tokens-FR-034, FR-038, in tools/token-check/test/check.test.ts"
Task: "cli.test.ts, covers 003-design-tokens-FR-040, FR-041, in tools/token-check/test/cli.test.ts"

# Then the independent pieces together:
Task: "Owner: starter tokens in Penpot, exported to packages/tokens/penpot/tokens.json"
Task: "Source reading and structure in tools/token-check/src/sources.ts"
Task: "Token arithmetic in tools/token-check/src/math.ts"
Task: "Value rules in tools/token-check/src/values.ts"
Task: "Themes, groups and combinations in tools/token-check/src/themes.ts"
Task: "Problem ordering and rendering in tools/token-check/src/report.ts"
```

## Parallel Example: User Story 2

```bash
Task: "names.test.ts, covers 003-design-tokens-FR-020, FR-021, FR-022"
Task: "output.test.ts, covers 003-design-tokens-FR-005, FR-019, FR-025, FR-052"
Task: "css.test.ts token names, covers 003-design-tokens-FR-026, FR-051, FR-052, FR-058"
Task: "components.test.ts token names, covers 003-design-tokens-FR-026, FR-051"
Task: "Code fixture in tools/token-check/test/__fixtures__/code/"
Task: "code.test.ts, covers 003-design-tokens-FR-026, FR-058"
Task: "self-check.test.ts, covers 003-design-tokens-FR-002, FR-005"
Task: "tokens.test.ts reading back, covers 003-design-tokens-FR-019, FR-025, FR-052"

# Then:
Task: "Names in tools/token-check/src/names.ts"
Task: "Output generator in tools/token-check/src/output.ts"
Task: "Site files in tools/token-check/src/site-files.ts"
Task: "Style sheet token names in tools/token-check/src/css.ts"
Task: "Component token names in tools/token-check/src/components.ts"
```

## Parallel Example: User Story 3

```bash
Task: "css.test.ts literal values, covers 003-design-tokens-FR-027, FR-029 to FR-032, FR-053, FR-056, FR-057"
Task: "components.test.ts literal values, covers 003-design-tokens-FR-028, FR-030, FR-053, FR-055 to FR-057"
Task: "site-files.test.ts, covers 003-design-tokens-FR-033"
Task: "check.test.ts FR-034 literal values case"

# Then:
Task: "Classification in tools/token-check/src/classify.ts"
Task: "Property capabilities in tools/token-check/src/grammar.ts"
```

## Parallel Example: User Story 4

```bash
Task: "two-themes fixture in tools/token-check/test/__fixtures__/two-themes/"
Task: "themes.test.ts, covers 003-design-tokens-FR-023, FR-054"
Task: "output.test.ts, covers 003-design-tokens-FR-054"
Task: "tokens.test.ts active themes, covers 003-design-tokens-FR-054"
```

## Parallel Example: User Story 5

```bash
Task: "motion.test.ts, covers 003-design-tokens-FR-042, FR-043, FR-044"
Task: "values.test.ts, covers 003-design-tokens-FR-045"
Task: "resolve.test.ts, covers 003-design-tokens-FR-046"
Task: "names.test.ts, covers 003-design-tokens-FR-047"
Task: "themes.test.ts, covers 003-design-tokens-FR-048"
Task: "code fixture and code.test.ts, covers 003-design-tokens-FR-049"
Task: "self-check.test.ts, covers 003-design-tokens-FR-050"
Task: "tokens.test.ts motion, covers 003-design-tokens-FR-006, FR-008"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational. It blocks all stories. The design gate is N/A (No UI).
3. Complete Phase 3: User Story 1, including the owner's export from Penpot (T019).
4. **STOP and VALIDATE** (T028). The starter tokens are in the repository as Penpot wrote them,
   and the check passes on them, locally and offline. `npm run traceability` reports exactly the
   35 requirements whose tests come later. That's the check doing its job, not a defect.

### Incremental Delivery

1. Setup + Foundational: the workspace, packages, shared types and the motion source are ready.
2. US1: the export and the check. 35 requirements remain uncovered.
3. US2: names, generated output, `@cv/tokens` and token names in site files. 25 remain.
4. US3: the literal values search. 14 remain.
5. US4: theme rules. 11 remain (FR-008, FR-039, FR-042 to FR-050).
6. US5: motion rules. 1 remains (FR-039).
7. Phase 8: the `tokens` job and ruleset. 0 remain.
8. Polish: seeded samples, self-check and performance tests, the README, full verification, the
   owner's round trip, the PR, and live enforcement.

The counts assume this order. US3 and Phase 8 can move elsewhere after US2, and each phase still
removes the same requirements. US5 always follows US4. All stories ship in the feature's single PR (Constitution XI). The increments above
are checkpoints within it. 001's self-check test fails until every 003 requirement is covered,
which is expected until T091.

---

## Requirement Coverage

Every FR in spec.md and the test task that covers it:

| Requirement | Test task(s) |
|-------------|--------------|
| 003-design-tokens-FR-001, FR-003, FR-007 | T010 |
| 003-design-tokens-FR-002 | T035 |
| 003-design-tokens-FR-004 | T010, T012 |
| 003-design-tokens-FR-005 | T030, T035 |
| 003-design-tokens-FR-006 | T010, T072 |
| 003-design-tokens-FR-008 | T072 |
| 003-design-tokens-FR-009, FR-010, FR-017 | T013 |
| 003-design-tokens-FR-011, FR-012, FR-018 | T012 |
| 003-design-tokens-FR-013, FR-016 | T011 |
| 003-design-tokens-FR-014 | T015 |
| 003-design-tokens-FR-015 | T013, T014 |
| 003-design-tokens-FR-019 | T015, T030, T036 |
| 003-design-tokens-FR-020 | T029 |
| 003-design-tokens-FR-021, FR-022 | T029, T068 |
| 003-design-tokens-FR-023 | T058 |
| 003-design-tokens-FR-024 | T060 |
| 003-design-tokens-FR-025 | T030, T036 |
| 003-design-tokens-FR-026 | T031, T032, T034 |
| 003-design-tokens-FR-027, FR-029, FR-031, FR-032 | T047 |
| 003-design-tokens-FR-028, FR-055 | T048 |
| 003-design-tokens-FR-030, FR-053, FR-056, FR-057 | T047, T048 |
| 003-design-tokens-FR-033 | T049 |
| 003-design-tokens-FR-034 | T017, T050 |
| 003-design-tokens-FR-035, FR-036, FR-037 | T016 |
| 003-design-tokens-FR-038 | T017 |
| 003-design-tokens-FR-039 | T077 |
| 003-design-tokens-FR-040, FR-041 | T018 |
| 003-design-tokens-FR-042, FR-043, FR-044 | T065 |
| 003-design-tokens-FR-045 | T066 |
| 003-design-tokens-FR-046 | T067 |
| 003-design-tokens-FR-047 | T068 |
| 003-design-tokens-FR-048 | T069 |
| 003-design-tokens-FR-049 | T070 |
| 003-design-tokens-FR-050 | T071 |
| 003-design-tokens-FR-051 | T031, T032 |
| 003-design-tokens-FR-052 | T030, T031, T036 |
| 003-design-tokens-FR-054 | T058, T059, T061 |
| 003-design-tokens-FR-058 | T031, T034 |

Success criteria:

| Criterion | Task(s) |
|-----------|---------|
| SC-001 | T086 |
| SC-002 | T093 (scenario 11) |
| SC-003 | T035, T087, T093 (scenario 4) |
| SC-004 | T057, T060 |
| SC-005 | T016, T018, T094 |
| SC-006 | T088, T092 (scenario 9) |
| SC-007 | T016 |
| SC-008 | T087, T091 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- Requirement IDs in task descriptions map tasks to spec.md requirements. The coverage table
  abbreviates them, but test titles always carry the full `003-design-tokens-FR-###` form.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md).
- T019, T093, T095 and T096 are the owner's. T095 and T096 change GitHub state, so the owner runs
  or explicitly approves them. T085's changes to the design documents were approved and applied
  during `/speckit-analyze`.
- **Choices made here that the design documents don't fix**:
  - **Description**: `tokenTypes` holds source names only. Typography sub-names live in the
    check's in-memory description as CSS names (`cssNames`), and TypeScript reaches them through
    `typography()`. That keeps `TokenType` to the 19 strings.
  - **Site-file counts** (T039).
  - **Type problem locations**: unsupported types and `wrong-source` are located at the `$type`
    value.
  - **Detail wording** where contracts/cli.md writes `…` (T022, T074).

  If the owner prefers otherwise, change the contract first.
