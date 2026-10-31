---

description: "Task list for the requirement traceability check"
---

# Tasks: Requirement Traceability Check

**Input**: Design documents from `/specs/001-requirement-traceability/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/cli.md](./contracts/cli.md),
[contracts/ci.md](./contracts/ci.md), [quickstart.md](./quickstart.md). No `design/` folder: the
spec says **No UI**.

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `001-requirement-traceability-FR-###` IDs it covers, and
every FR in spec.md (FR-001 to FR-029) is covered by at least one test task.

**Amendment of 2026-10-29**: the local full run and its `local-verify` sign-off (spec.md, Session
2026-10-29, User Story 4, FR-030 to FR-037, SC-008 to SC-010) is built by Phases 8 to 11 below,
appended after the first release's tasks (Constitution XI). Its inputs add
[contracts/local-verify.md](./contracts/local-verify.md), research R14 to R21 and quickstart
scenarios 8 to 13. Earlier tasks keep their record. The ones it overturns (T006, T012, T025,
T026) are marked superseded in part, where they stand.

**Organization**: Tasks are grouped by user story. US2 and US3 build on US1, as the spec says
("The other stories build on this one"). Once US1 is done, US2 and US3 don't depend on each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 001-requirement-traceability-FR-003"

## Path Conventions

- Root toolchain: `package.json`, `package-lock.json`, `.nvmrc`, `.gitignore`, `tsconfig.json`,
  `vitest.config.ts`
- Check source: `tools/traceability/src/`
- Check tests: `tools/traceability/test/`, helper in `tools/traceability/test/helpers/project.ts`,
  committed sample project in `tools/traceability/test/__fixtures__/seeded/`
- CI and merge rule: `.github/workflows/ci.yml`, `.github/rulesets/main.json`
- No CV data, `packages/content`, `os-core`, shells, apps, token output or `/cv` are touched
  (plan.md Structure Decision)

## Rules that apply to every task

- Code uses erasable TypeScript only (no enums, namespaces or parameter properties). Relative
  imports use explicit `.ts` extensions (research R1).
- The check reads files with synchronous `node:fs` calls, writes nothing and makes no network
  calls (FR-027).
- Sorting always uses plain code-unit comparison (`a < b ? -1 : a > b ? 1 : 0`), never
  `localeCompare` (FR-024).
- **Test titles**: every test or `describe` title carries the full IDs it covers. One `describe`
  group per requirement works well, e.g.
  `describe('001-requirement-traceability-FR-004: definitions come only from Functional Requirements entries', …)`.
  Sample IDs such as `FR-1`, `fr-001` or `002-example-FR-009` go only in test bodies, never in
  titles or tags. Titles must contain no other `fr-` text in any letter case, because the check
  reads its own tests (FR-011, FR-018, FR-028).
- Never write a JSX `data-req` attribute or a `'data-req'` object property in the check's own
  source or tests. Sample markup goes in string literals or in `__fixtures__/`.
- No test writes inside the repository. Tests that read the real repository run at the same
  time as others.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The repository's first toolchain: Node 26, npm, TypeScript typecheck, Vitest

- [X] T001 Create the root toolchain files:
  - `package.json`: `"private": true`, `"type": "module"`, `"engines": { "node": ">=26" }`, and these scripts:
    - `"traceability": "node --permission --allow-fs-read=. --allow-addons tools/traceability/src/cli.ts"`
    - `"test": "vitest run"`
    - `"typecheck": "tsc --noEmit"`
  - `.nvmrc`, containing `26`.
  - `.gitignore`, containing `node_modules/`.

  Sources: research R1, R2 and R9, and contracts/cli.md Command.
- [X] T002 Install the dev dependencies with Node 26 active (`nvm use`) and its bundled npm:
  1. `npm install --save-dev --save-exact oxc-parser` (latest release, exact pin, research R5).
  2. `npm install --save-dev vitest@5 typescript@7 @types/node@26`.
  3. Commit `package-lock.json`.

  `package.json` must end with exactly these four `devDependencies` and no `dependencies` (plan
  Dependencies table, Constitution X).
- [X] T003 [P] Create `tsconfig.json`:
  - `compilerOptions`:
    - `target: "esnext"`, `module: "nodenext"`, `moduleResolution: "nodenext"`
    - `strict: true`, `noEmit: true`, `skipLibCheck: true`
    - `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `rewriteRelativeImportExtensions: true`
    - `types: ["node"]`
  - `include: ["tools/**/*.ts", "vitest.config.ts"]`
  - `exclude: ["**/__fixtures__/**"]`

  Sources: research R1, and plan.md Project Structure.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types, the file-selection constants the test runner also uses, and the test
helper. Every story needs them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: omitted. spec.md's Design section says "**No UI**: this feature
adds or changes no user interface."

- [X] T004 [P] Define the shared types in `tools/traceability/src/report.ts`. Use no enums. Rendering comes in T019. The types (data-model.md Location, Problem and Report):
  - `Location`: `{ file: string; line: number; column: number }`. `file` is relative to the root with `/` separators. Lines and columns count from 1.
  - `PROBLEM_TYPES`: an `as const` tuple in exactly this order: `uncovered`, `unknown-reference`, `removed-reference`, `malformed`, `duplicate-id`, `bad-status`, `no-requirements`, `unreadable-file`.
  - `ProblemType`: the tuple's element type.
  - `Problem`: `{ type: ProblemType; subject: string; location: Location; detail: string }`.
  - `Report`: `{ problems: Problem[]; approvedSpecs: number; activeRequirements: number; coveredRequirements: number; countsByType: Record<ProblemType, number>; result: 'pass' | 'fail' }`.
- [X] T005 [P] Create the shared file-selection constants in `tools/traceability/src/files.ts` (research R6). The directory walk comes in T018.
  - `EXCLUDED_DIR_NAMES`: `node_modules`, `dist`, `build`, `out`, `coverage`, `__fixtures__`.
  - `isExcludedDir(name)`: true for those names and for any name that starts with `.`.
  - `TEST_FILE_PATTERN`: `/\.(test|spec)\.[cm]?[jt]sx?$/`.
  - `TEST_INCLUDE_GLOBS`: `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`.
  - `TEST_EXCLUDE_GLOBS`: `**/<name>/**` for each excluded name, plus `**/.*/**`.
- [X] T006 Create `vitest.config.ts` at the repository root. Use `defineConfig` from `vitest/config`. Set `test.include` to `TEST_INCLUDE_GLOBS` and `test.exclude` to `TEST_EXCLUDE_GLOBS`, both imported from `./tools/traceability/src/files.ts`. Declare no `tags`, because no tag may carry `skip` or `todo` (research R3).
  - **Superseded in part 2026-10-29 by T063**: the root `test.include` and `test.exclude` (and the `globalSetup` 004 added) move into the `fast` and `slow` projects (research R14). The rest stands.
- [X] T007 [P] Create the test helper `tools/traceability/test/helpers/project.ts` (plan Dependencies table, research R13):
  - `REPO_ROOT`: the repository root, as a real path, computed from `import.meta.dirname`.
  - `CLI_PATH`: `<REPO_ROOT>/tools/traceability/src/cli.ts`.
  - `makeProject(files: Record<string, string>): string`. It creates a directory with `fs.mkdtempSync(path.join(os.tmpdir(), 'traceability-'))` and returns its `fs.realpathSync`. The real path matters because on macOS `/var` is a symlink to `/private/var`, and the permission grant must match. It writes every file, creating parent directories. A key ending in `/` creates an empty directory instead. It registers removal of the directory with Vitest's `onTestFinished`, so it's called inside tests only.
  - `runCli(cwd: string, args: string[] = []): { status: number | null; stdout: string; stderr: string }`. It calls `spawnSync(process.execPath, ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, '--allow-addons', CLI_PATH, ...args], { cwd, encoding: 'utf8' })`. These are the same grants as the `traceability` script: read and addons only, no network, no writes. The extra read grant on `REPO_ROOT` lets Node load `cli.ts` and `oxc-parser` when `cwd` is a temporary directory.
- [X] T008 Verify the toolchain: `npm run typecheck` passes and `npx vitest run --passWithNoTests` exits 0 with the new config.

**Checkpoint**: Foundation ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Find untested requirements before opening a PR (Priority: P1) 🎯 MVP

**Goal**: `npm run traceability` reads every approved spec and the project's tests. It reports
every active requirement no counting test references, plus every spec-level problem: bad Status,
malformed or duplicate IDs, no requirements, unreadable files. It ends with the summary, runs
fully offline, and gives the same output every run.

**Independent Test**: build a sample project with one approved spec and tests that cover only
some of its requirements. The check fails and names exactly the uncovered requirements. Add the
missing tests and it passes (spec US1). On the real repository, at this checkpoint, it names
exactly the requirements whose tests arrive in later phases (T024).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.** Sample projects
> come from `makeProject`. Their tests use only valid references, unless a test is about invalid
> ones. US3 adds reference problems, and they must not change these assertions.

- [X] T009 [P] [US1] Write `tools/traceability/test/specs.test.ts`. It covers 001-requirement-traceability-FR-001, 001-requirement-traceability-FR-002, 001-requirement-traceability-FR-003, 001-requirement-traceability-FR-004, 001-requirement-traceability-FR-005, 001-requirement-traceability-FR-006, 001-requirement-traceability-FR-007 and 001-requirement-traceability-FR-008. It tests `parseSpec(feature, file, text)`, `requirementsOf(spec)` and `specProblems(spec)` from `src/specs.ts`. For discovery, it uses `runCheck(root)` from `src/check.ts` on sample projects.
  - FR-001: every `specs/*/spec.md` is found and its Status read. These are ignored: a directory under `specs/` without `spec.md`, a `specs/README.md` file, and `specs/a/b/spec.md`.
  - FR-002: a Draft spec with no tests, a malformed entry (`FR-1`) and a duplicate ID produces no problem. Only an Approved spec's active requirements need coverage.
  - FR-003: each of these produces one `bad-status` problem:
    - a missing Status line;
    - `**Status**: Aproved`;
    - an empty value;
    - a Status line that appears only inside an HTML comment.

    The subject is the value as written, in double quotes (`""` when missing). The detail is `spec has no Status line` when the line is missing, otherwise `Status must be Draft or Approved`. The location is the value's first character, e.g. line 7 column 13 for `**Status**: Aproved` on line 7. It is `1:1` when the line is missing, and column 1 of the Status line when the value is empty. A spec with an invalid Status gets no other problem, because it's treated like a Draft spec.
  - FR-004: only `- ` and `* ` list items at the start of a line inside the section headed exactly `Functional Requirements` define requirements. These don't:
    - IDs in user stories, in other sections and in indented continuation lines;
    - IDs inside HTML comments, including comments that span lines;
    - IDs inside fenced code blocks (both ```` ``` ```` and `~~~` fences).

    A bold paragraph label such as `**Finding requirements**` doesn't end the section. The next heading of the same or a higher level does.
  - FR-005: `- ~~**FR-004**~~: Removed …` and `- **~~FR-004~~**: Removed …` are removed and need no coverage.
  - FR-006: `FR-1`, `FR-0001`, `fr-001`, `FR 001` and `FR.001` entries in an approved spec each produce `malformed`. The subject is the raw ID in quotes and the detail is `a requirement ID must be FR- followed by exactly three digits`. The location is the ID's line and column, e.g. column 5 for `- **FR-1**:` and column 7 for `- ~~**FR-1**~~:`.
  - FR-007: an ID defined twice, and an active plus a removed entry with the same ID, each produce one `duplicate-id`. It sits at the first definition, has the full ID as subject, and has the detail `defined 2 times, on lines A and B`. Three definitions read `defined 3 times, on lines A, B and C`.
  - FR-008: an approved spec with no entries produces `no-requirements`, and so does one with only malformed entries. The location is `1:1`, the subject is the feature and the detail is `approved spec defines no requirements`.
- [X] T010 [P] [US1] Write `tools/traceability/test/references.test.ts`, covering 001-requirement-traceability-FR-009. `fullId('002-example', 'FR-003')` is `002-example-FR-003`. `parseFullId` splits a full ID into feature and ID, and returns null for anything else. The same FR number in two approved specs gives two distinct IDs: with `runCheck`, a test that references `002-example-FR-001` leaves `003-other-FR-001` reported uncovered.
- [X] T011 [P] [US1] Write `tools/traceability/test/test-files.test.ts`. It covers 001-requirement-traceability-FR-010, 001-requirement-traceability-FR-011, 001-requirement-traceability-FR-012 and 001-requirement-traceability-FR-022. It tests `readTestFile(file, text)` and `coverageOf(nodes)` from `src/test-files.ts`. `coverageOf` returns `{ counting, skipped, unrecognized }`: the effective tokens of counting tests, of inactive tests (skipped, disabled or placeholder), and of tests inside unrecognized calls.
  - FR-010: IDs are found in all of these:
    - test titles;
    - group titles, at any nesting depth;
    - the literal parts of template-literal titles (substitutions are skipped);
    - `.each(…)(…)` and `.for(…)(…)` titles;
    - literal `tags` options, both `tags: '…'` and `tags: ['…', …]`.

    A test with several IDs covers each one. A group's ID covers every test nested inside it at any depth. A group with no tests covers nothing. A non-literal title, such as a variable, contributes nothing. A test inside a top-level `for` loop or `if` block is found and counts. A test inside a function declaration isn't.
  - FR-011: none of these count:
    - comments;
    - assertion arguments;
    - helper strings and top-level variables;
    - non-test statements inside group callbacks;
    - hooks such as `beforeEach`;
    - `test.step` titles inside test bodies.
  - FR-012: these mark tests inactive:
    - `.skip` and `.todo`;
    - `{ skip: true }` and `{ todo: true }`;
    - a test without a body, and a group without a callback;
    - a test inside a skipped group;
    - an unconditional top-level `ctx.skip()` in a test body, or `skip()` destructured from the context, with no argument or one string.

    These still count: `.skipIf(…)`, `.runIf(…)`, a computed `skip` value, and `ctx.skip(condition)`.

    A call rooted at `test`, `it`, `describe` or `suite` whose shape isn't recognized, such as `test.describe.fixme(…)` or `test.foo(…)`, makes its nested tests non-counting. With `runCheck`, a requirement referenced only there is reported with the detail `only tests inside calls the check doesn't recognize reference this requirement`. One referenced by both kinds, and by no counting test, gets `only skipped, disabled or placeholder tests, or tests inside calls the check doesn't recognize, reference this requirement`.

    With `runCheck`, a requirement referenced only by inactive tests is reported `uncovered`, with the detail `only skipped, disabled or placeholder tests reference this requirement`.

    `vitest.config.ts`, imported directly, declares no tag with `skip` or `todo`.
  - FR-022: each token's location is the line and column of its first character. This holds after non-ASCII text earlier in the file and earlier on the same line, inside template literals that span lines, and in tags.
- [X] T012 [P] [US1] Write `tools/traceability/test/files.test.ts`, covering 001-requirement-traceability-FR-014. It tests `listFiles(root)` from `src/files.ts` and the config:
  - Skipped at any depth: `node_modules`, `dist`, `build`, `out`, `coverage`, `__fixtures__` and every dot-directory. A root whose own name starts with `.` is still listed.
  - Symbolic links are not followed. Create them with `fs.symlinkSync` after `makeProject`.
  - Test files are selected by `TEST_FILE_PATTERN`. Yes: `a.test.ts`, `a.spec.tsx`, `a.test.mjs`, `a.test.cjs`, `a.spec.jsx`. No: `a.tests.ts`, `a.test.md`, `test.ts`.
  - Paths are relative, use `/`, and are sorted by code unit.
  - `vitest.config.ts`'s `test.include` and `test.exclude` deep-equal `TEST_INCLUDE_GLOBS` and `TEST_EXCLUDE_GLOBS`. `TEST_EXCLUDE_GLOBS` names every `EXCLUDED_DIR_NAMES` entry plus `**/.*/**`.
  - **Superseded in part 2026-10-29 by T055**: the config assertion now checks each project's `include` and `exclude` against the constants, and that the root sets none (research R20). The other assertions stand.
- [X] T013 [P] [US1] Write `tools/traceability/test/check.test.ts`. It covers 001-requirement-traceability-FR-015, 001-requirement-traceability-FR-020, 001-requirement-traceability-FR-021 and 001-requirement-traceability-FR-029. It tests `runCheck(root)` and `runCli` on sample projects.
  - FR-015 (US1 scenario 1): the approved spec `002-example` defines FR-001 to FR-003, and tests reference only `002-example-FR-001` and `002-example-FR-002`. The problems are exactly one `uncovered` for `002-example-FR-003`, at its spec line and column 5, with the detail `no test references this requirement`.
  - FR-020: `result` is `fail` and `runCli` exits 1 when there are problems. With full coverage, `result` is `pass` and it exits 0 (US1 scenario 2).
  - FR-021: one run over a project with `uncovered`, `malformed`, `duplicate-id`, `bad-status`, `no-requirements` and `unreadable-file` problems reports all of them.
  - FR-029:
    - A test file with a syntax error produces `unreadable-file` at its first error's line and column. The subject is the quoted path and the detail starts with `cannot be parsed: `. A requirement referenced only by that file is reported uncovered.
    - A `spec.md` created as a directory (key `specs/003-x/spec.md/`) produces `unreadable-file` with the detail `cannot be read: EISDIR`. This works as root too, unlike `chmod`.
- [X] T014 [P] [US1] Write `tools/traceability/test/report.test.ts`. It covers 001-requirement-traceability-FR-022, 001-requirement-traceability-FR-023 and 001-requirement-traceability-FR-024. It tests `buildReport` and `renderReport` from `src/report.ts`, and uses `runCheck` for whole runs.
  - FR-022: problems built from every example in contracts/cli.md render to exactly those lines, in the form `<file>:<line>:<column> <type> <subject>: <detail>`. An `uncovered` problem from `runCheck` points at the requirement's definition.
  - FR-023:
    - The summary lists every type, zeros included, in `PROBLEM_TYPES` order.
    - Each row is its label padded with spaces to 32 characters, then the number. Copy the rows from contracts/cli.md.
    - Failing runs end `FAIL: 12 problems found.`, or `FAIL: 1 problem found.` for one.
    - Passing runs end `PASS: all 29 active requirements in 1 approved spec are covered.`. Also test the N = 1 line (`PASS: the 1 active requirement in 2 approved specs is covered.`), the N = 0 line (`PASS: 1 approved spec defines no active requirements, so there are none to cover.`), and the singular and plural forms of `problem` and `approved spec`.
    - With no `specs/` folder, or only Draft specs, the run ends `PASS: no approved specs found, so there are no requirements to cover.` and shows `Approved specs checked:` 0.
    - With no approved specs and an invalid reference, the run ends `FAIL: 1 problem found. No approved specs found.`
    - One empty line separates problems from the summary, only when there are problems.
    - The output ends with exactly one `\n`.
  - FR-024:
    - Problems given in shuffled order render identically.
    - Sorting is by file with code-unit comparison, so `src/B.ts` comes before `src/a.ts`. Then by line, column, the `PROBLEM_TYPES` order, and subject.
    - Two `runCheck` runs over the same project render byte-identical text.
    - Nested paths use `/`.
- [X] T015 [P] [US1] Write `tools/traceability/test/cli.test.ts`, covering 001-requirement-traceability-FR-026 and 001-requirement-traceability-FR-027.
  - FR-026: in `REPO_ROOT`, `npm run --silent traceability` (via `spawnSync`) and `runCli(REPO_ROOT)` give identical stdout and exit status.
  - FR-027:
    - `package.json`'s `traceability` script contains `--permission`, an `--allow-fs-read=` grant and `--allow-addons`.
    - The script contains none of `--allow-net`, `--allow-fs-write`, `--allow-child-process`, `--allow-worker` or `--allow-wasi`.
    - `runCli` on a sample project completes with the expected report under those grants.
    - Positive control: run `node --permission --allow-fs-read=<REPO_ROOT> --allow-addons -e "fetch('http://127.0.0.1:2/').then(() => console.log('connected'), (e) => console.log(e.code ?? e.cause?.code))"`. It must print `ERR_ACCESS_DENIED`. The loopback address means a broken guard never reaches the internet. (Implementation note: port 9 was planned, but fetch refuses it as a "bad port" before the permission model is consulted, so the control printed `undefined` and proved nothing. Port 2 isn't on that list: it prints `ERR_ACCESS_DENIED` with the guard on and `ECONNREFUSED` with it off.)
  - Add one more test, with no ID needed: any argument makes the CLI exit 2, with empty stdout and a usage message on stderr (contracts/cli.md Exit codes).

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement the full-ID grammar and token finding in `tools/traceability/src/ids.ts` (research R8, data-model Reference):
  - `fullId(feature, id)` returns `<feature>-<id>`.
  - `parseFullId(text)` returns `{ feature, id }` when the whole text matches `/^([a-z0-9]+(?:-[a-z0-9]+)*)-(FR-\d{3})$/`, and null otherwise.
  - `findTokens(text)` returns `{ text, index }[]`. It examines every case-insensitive `fr-` occurrence and takes the longest run of letters, digits, `-` and `_` around it. A run that contains `fr-` more than once is still one token. Tokens come in order of position.
- [X] T017 [P] [US1] Implement the `oxc-parser` wrapper in `tools/traceability/src/source.ts` (research R5):
  - `parseSource(file, text)` calls `parseSync(file, text)`, with the language inferred from the extension.
    - If `errors` is not empty, it returns an `unreadable-file` problem. The location is the first error's first label `start`, or `1:1` when there is none. The subject is `"<file>"` and the detail is `cannot be parsed: <first error message>`. On a fatal error oxc returns an empty tree, and nothing from the file is used.
    - Otherwise it returns `{ program }`.
  - `createLocator(file, text)` returns `offset → Location`, with lines and columns from 1, computed from `\n` positions. Check whether node `start`/`end` values are JS string (UTF-16) indices. If they are UTF-8 byte offsets, convert them. The T011 non-ASCII test proves which.
  - `literalParts(node, text)` returns `{ text, offset }[]`:
    - a string literal gives its raw source text between the quotes, at `start + 1`;
    - a template literal gives one entry per quasi, with its raw text and the offset where that text starts in the source (check it with `text.slice`);
    - any other node gives `[]`.
  - `visitAll(node, fn)` is a generic visitor over every child object that has a `type`.
- [X] T018 [P] [US1] Implement `listFiles(root): { specs: { feature: string; file: string }[]; testFiles: string[] }` in `tools/traceability/src/files.ts` (research R6):
  - Walk with `readdirSync(dir, { withFileTypes: true })`. Sort entries by name with code-unit comparison. Skip every symbolic link.
  - Skip directories below the root for which `isExcludedDir` is true. The root itself is never excluded.
  - Specs: each directory directly under `specs/` (same exclusions) that has an entry named `spec.md` of any kind. A `spec.md` that is a directory or unreadable is still listed, and check.ts reports it.
  - Test files: every file whose name matches `TEST_FILE_PATTERN`.
  - All paths are relative to the root with `/` separators. A missing `specs/` gives `specs: []`.
- [X] T019 [P] [US1] Implement problem ordering and rendering in `tools/traceability/src/report.ts`. Follow contracts/cli.md exactly.
  - `sortProblems(problems)`: by file (code units), then line, column, `PROBLEM_TYPES` index, and subject.
  - `buildReport({ problems, approvedSpecs, activeRequirements, coveredRequirements })`: returns a `Report` with sorted problems, `countsByType` for every type (zeros included), and `result` `fail` exactly when there are problems.
  - `renderReport(report)` produces, in order:
    1. One `<file>:<line>:<column> <type> <subject>: <detail>` line per problem.
    2. An empty line, only when there are problems.
    3. `Summary`.
    4. The rows `  Approved specs checked:`, `  Active requirements checked:`, `  Requirements covered:` and `  Problems:`, then one `    <type>` row per type. Each label is padded to 32 characters, followed by the number.
    5. An empty line.
    6. The result line, worded exactly as in contracts/cli.md:
       - with problems: `FAIL: N problems found.`, followed by ` No approved specs found.` when there are no approved specs;
       - with no problems and no approved specs: `PASS: no approved specs found, so there are no requirements to cover.`;
       - otherwise, the passing line for N of 2 or more, N of 1, or N of 0 active requirements.

       Use singular nouns when a count is 1.
    7. A single trailing `\n`.
- [X] T020 [US1] Implement the spec reader in `tools/traceability/src/specs.ts`, after T016 (data-model Spec, RequirementEntry and Requirement; research R7). Split lines on `\n` and ignore a trailing `\r`.
  - `parseSpec(feature, file, text): Spec`:
    - First blank out HTML comments (which may start mid-line and span lines) and fenced code blocks (```` ``` ```` or `~~~` fences). Replace every character except `\n` with a space, so lines and columns stay exact.
    - Status: the first line matching `**Status**:`. `Approved` or `Draft` only when the trimmed value is exactly that word, otherwise `Invalid`. `statusText` is the trimmed value, or null when the line is missing. `statusLocation` is as described in T009 (FR-003).
    - The section starts at a heading whose text is exactly `Functional Requirements`, and ends at the next heading of the same or a higher level.
    - An entry is a `- ` or `* ` line at column 1. Skip any `~~` and `**` markup after the bullet. If the rest matches `/^fr[^A-Za-z0-9]?\d/i`, it's an entry:
      - `rawId` is the match of `/^fr[^A-Za-z0-9]?\d[A-Za-z0-9_-]*/i` there, e.g. `FR 001` or `FR-0001`;
      - `wellFormed` is whether `rawId` matches `/^FR-\d{3}$/`;
      - `removed` is whether `~~` appears in the markup before it;
      - the location is the position of `rawId`.
  - `requirementsOf(spec)`: well-formed entries grouped by ID, in file order. Each has `fullId` (from `ids.ts`), `definitions`, and a state that is `active` when any definition is active.
  - `specProblems(spec)`:
    - For any spec with an `Invalid` Status: `bad-status`.
    - For `Approved` specs only:
      - `malformed` per non-well-formed entry;
      - one `duplicate-id` per ID with more than one definition;
      - `no-requirements` when there is no well-formed entry.

    Subjects, details and locations are as in T009.
- [X] T021 [US1] Implement the test reader in `tools/traceability/src/test-files.ts`, after T016 and T017 (research R4, data-model TestNode).
  - `readTestFile(file, text)` returns `{ nodes: TestNode[]; problem: Problem | null }`. When the file fails to parse, `nodes` is empty.
  - A `TestNode` is `{ kind: 'test' | 'group'; tokens: Token[]; markedInactive: boolean; unrecognized: boolean; parent: TestNode | null }`. Its `tokens` come from `findTokens` over its title parts and literal tag strings, each located through `createLocator`.
  - Visit the statements of the program body and of each recognized group's callback: its block body, or its expression body as a single statement. Recognize an `ExpressionStatement`, optionally wrapped in `await`, whose expression is a call rooted at `test`, `it`, `describe` or `suite`.
  - Also visit statements nested in blocks, `if`/`else` branches, loops (`for`, `for…of`, `for…in`, `while`, `do…while`), `try`/`catch`/`finally` and `switch` cases, keeping the enclosing group as parent (research R4).
  - Never descend into function bodies other than group callbacks, or into test bodies. A test inside a helper function must not count (fail closed).
  - Read the callee chain from the root outwards.
    - `test.describe` and `test.suite` make a group. So do `describe` and `suite`. `test` and `it` make a test.
    - `.only`, `.concurrent`, `.fails` and `.shuffle` have no effect.
    - `.skip` and `.todo` mark the node inactive.
    - `.skipIf(…)`, `.runIf(…)`, `.each(…)` and `.for(…)` must each be called. They have no effect on coverage.
    - Any other name, a computed member, or a call shape that doesn't match is an unrecognized call. Treat it as a group with `unrecognized: true` (not `markedInactive`). Its title is still read, and its first function argument is visited as a group callback.
  - Arguments:
    - The title is argument 0, read with `literalParts`.
    - The options are the first object literal after the title. Literal `skip: true` or `todo: true` marks the node inactive. Read `tags` as a string literal, or as an array of string literals and templates without substitutions.
    - The body or callback is the first argument after the title that is neither the options object nor a number literal. A test without a body, or a group without a callback, is inactive.
  - A test body also marks the test inactive when it has a top-level statement calling `<ctx>.skip()` or a destructured `skip()`, with no argument or one string literal. `<ctx>` is the body's first parameter.
  - `coverageOf(nodes)`: for every `test` node, its effective tokens are its own plus those of every ancestor. They go in `counting` when neither the test nor any ancestor is inactive or unrecognized. Otherwise they go in `unrecognized` when the test or an ancestor is unrecognized, and in `skipped` when not.
- [X] T022 [US1] Implement `runCheck(root): Report` in `tools/traceability/src/check.ts`. It is synchronous and reads files as UTF-8.
  1. Call `listFiles(root)`.
  2. Read each spec file. A read error gives `unreadable-file` at `1:1`, with the quoted path as subject and the detail `cannot be read: <error code>`. Never put error messages in the report: they contain absolute paths. Otherwise call `parseSpec`, then `specProblems`.
  3. Collect the active requirements of `Approved` specs, keyed by full ID.
  4. Read each test file, with read errors handled as in step 2, then call `readTestFile` and `coverageOf`. A token covers a requirement when `parseFullId` accepts it and it names one of those active requirements. Also note which requirements the `skipped` tokens reference, and which the `unrecognized` tokens reference.
  5. For every active requirement not covered, add `uncovered` at its first active definition. Its detail is one of the four sentences in contracts/cli.md:
     - `no test references this requirement` when neither list references it;
     - `only skipped, disabled or placeholder tests reference this requirement` when only `skipped` tokens do;
     - `only tests inside calls the check doesn't recognize reference this requirement` when only `unrecognized` tokens do;
     - `only skipped, disabled or placeholder tests, or tests inside calls the check doesn't recognize, reference this requirement` when both do.
  6. Return `buildReport` with `approvedSpecs` (readable Approved specs), `activeRequirements` and `coveredRequirements`.
- [X] T023 [US1] Implement the entry point `tools/traceability/src/cli.ts` (contracts/cli.md):
  - With any argument, write `usage: npm run traceability (takes no arguments)` to stderr and set exit code 2.
  - Otherwise write `renderReport(runCheck(process.cwd()))` to stdout and set exit code 1 or 0.
  - Catch internal errors: message to stderr, exit code 2.
  - Set `process.exitCode`. Never call `process.exit()`, because piped stdout is asynchronous on macOS and the report could be cut off.
  - Then run `npm run traceability` once. Confirm Node 26 accepts `--allow-fs-read=.` and loads `cli.ts` and `oxc-parser`'s native binding. If it rejects the relative path, change the script to `--allow-fs-read=*` and record that in research.md R9 (the R9 fallback).
- [X] T024 [US1] Checkpoint.
  - `npm run typecheck` and `npm test` pass.
  - `npm run traceability` exits 1 with exactly seven problems, all `uncovered`. They are 001-requirement-traceability-FR-013, -FR-016, -FR-017, -FR-018, -FR-019, -FR-025 and -FR-028, whose tests arrive in US2, US3 and Polish.
  - The summary shows 29 active requirements checked and 22 covered.
  - Any other problem is a defect to fix before moving on.

**Checkpoint**: User Story 1 is fully functional and testable on its own.

---

## Phase 4: User Story 2 - Block merging when the check fails (Priority: P2)

**Goal**: Every pull request to `main` runs `npm run traceability` as the required check
`traceability`, and `npm run typecheck` plus `npm test` as `test`. A ruleset with no bypass makes
both required and keeps `main` pull-request-only.

**Independent Test**: `repo-settings.test.ts` proves the committed workflow and ruleset match
contracts/ci.md. Live enforcement is proved on GitHub in T046 and T047 (quickstart scenario 7),
once this feature's pull request exists.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T025 [P] [US2] Write `tools/traceability/test/repo-settings.test.ts`, covering 001-requirement-traceability-FR-025 and 001-requirement-traceability-FR-026. It asserts every **[tested]** point of contracts/ci.md.

  It reads `.github/workflows/ci.yml` as text. There is no YAML dependency (Constitution X; the plan adds none). A comment at the top of the test documents the layout it relies on: two-space indentation, one command per `run:` line, and no `run: |` or `run: >` blocks, which the test rejects. It reads `.github/rulesets/main.json` with `JSON.parse`.
  - Trigger: the `on:` block has `pull_request:` with `branches: [main]`. No line has a `paths:`, `paths-ignore:` or `branches-ignore:` key.
  - Actions: every `uses:` line matches `actions/checkout@<40 hex> # v<version>` or `actions/setup-node@<40 hex> # v<version>`.
  - Jobs: the two-space-indented keys under `jobs:` include `traceability` and `test`, with `name: traceability` and `name: test`.
  - Steps: in order, the `uses:` and `run:` values are:
    - for `traceability`: `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run traceability`;
    - for `test`: `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run typecheck`, `npm test`.
  - Forbidden keys: no line in the file has an `if:`, `strategy:`, `matrix:` or `continue-on-error:` key.
  - Ruleset:
    - `enforcement` is `active`;
    - `conditions.ref_name` is `{ include: ['refs/heads/main'], exclude: [] }`;
    - `bypass_actors` is `[]`;
    - `rules` deep-equals the four rules with every parameter from contracts/ci.md, and there is no `update` rule.
  - Consistency: every `context` in `required_status_checks` is the name of a `ci.yml` job. `traceability` is a script in `package.json`, and it is the command the `traceability` job runs (FR-026).
  - **Superseded in part 2026-10-29 by T056**: the `test` job's expected steps become `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run typecheck`, `npm run test:fast`, and "every `context` is a job" applies only to checks bound to GitHub Actions (`integration_id: 15368`), since `local-verify` is no job (research R15, R19, R20). The rest stands.

### Implementation for User Story 2

- [X] T026 [P] [US2] Create `.github/workflows/ci.yml` (contracts/ci.md Workflow, research R11):
  - Workflow `name: CI`, `on: pull_request: branches: [main]`, `permissions: contents: read`.
  - Jobs `traceability` and `test`. Each has `name:` equal to its id and `runs-on: ubuntu-latest`.
  - Steps:
    - `traceability`: `actions/checkout`, then `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`, then `npm ci`, then `npm run traceability`.
    - `test`: the same first three steps, then `npm run typecheck`, then `npm test`.
  - Pin each action to the full commit SHA of its latest v7 release tag, with the version in a trailing comment, e.g. `uses: actions/checkout@<sha> # v7.x.y`. Find the SHA with `git ls-remote --tags https://github.com/actions/checkout 'v7*'`, and use the peeled `^{}` entry for annotated tags. Do the same for `actions/setup-node`.
  - No `if:`, `strategy`, `matrix`, `continue-on-error` or path filters.
  - **Superseded in part 2026-10-29 by T071**: the `test` job runs `npm run typecheck` then `npm run test:fast`, with no browser cache or install (004 had added them), and every job gets `timeout-minutes: 6` (research R15). The rest stands.
- [X] T027 [P] [US2] Create `.github/rulesets/main.json` with exactly the fields in contracts/ci.md, formatted with two-space indentation:
  - `name: "main"`, `target: "branch"`, `enforcement: "active"`
  - `conditions.ref_name`: `include: ["refs/heads/main"]`, `exclude: []`
  - `bypass_actors: []`
  - `rules`, in this order, with every parameter written out:
    1. `{ "type": "deletion" }`
    2. `{ "type": "non_fast_forward" }`
    3. `pull_request`, with `required_approving_review_count: 0`, `dismiss_stale_reviews_on_push: false`, `require_code_owner_review: false`, `require_last_push_approval: false`, `required_review_thread_resolution: false` and `allowed_merge_methods: ["squash"]`
    4. `required_status_checks`, with `strict_required_status_checks_policy: true`, `do_not_enforce_on_create: false` and `required_status_checks: [{ "context": "traceability", "integration_id": 15368 }, { "context": "test", "integration_id": 15368 }]`
- [X] T028 [US2] Checkpoint.
  - `npm test` passes, including `repo-settings.test.ts`.
  - `npm run traceability` no longer lists 001-requirement-traceability-FR-025. If US3 isn't done yet, six remain uncovered: -FR-013, -FR-016, -FR-017, -FR-018, -FR-019 and -FR-028. If it is, only -FR-028 remains.
  - Commit (Conventional Commits, no AI attribution), push `001-requirement-traceability`, and open the feature's pull request to `main` as a **draft**. CI then runs on Linux from here on. `traceability` is expected to fail until T043. It's still the feature's single PR (Constitution XI).

**Checkpoint**: User Stories 1 and 2 both work. The live merge block is verified in Polish
(T046, T047), because it needs the open pull request.

---

## Phase 5: User Story 3 - Catch mistyped and stale references (Priority: P3)

**Goal**: References in test and group titles and tags, and every `data-req` value in UI source,
are classified. Unknown, removed and malformed references are reported with file, line and
column. References to Draft specs are accepted.

**Independent Test**: add a test and a `data-req` attribute that reference a missing
requirement, a removed one and a malformed ID. Each is reported with its file and line (spec US3).

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T029 [P] [US3] Extend `tools/traceability/test/references.test.ts`. It covers 001-requirement-traceability-FR-016, 001-requirement-traceability-FR-017, 001-requirement-traceability-FR-018 and 001-requirement-traceability-FR-019, using `runCheck` on sample projects and checking each problem's exact `file:line:column`.
  - FR-016:
    - `002-example-FR-009`, when the spec defines no FR-009, gives `unknown-reference` with the detail `spec 002-example defines no FR-009`.
    - `099-missing-FR-001` gives `unknown-reference` with the detail `no spec directory is named 099-missing`.
    - Both are reported from a test title, a group title and a `data-req` value.
    - A reference into a spec whose `spec.md` can't be read is not classified. Only the `unreadable-file` problem appears.
  - FR-017:
    - References to a removed requirement from a test, a group and a `data-req` give `removed-reference` with the detail `this requirement was removed`.
    - An ID with one active and one removed definition is a valid reference. Its `duplicate-id` is reported separately.
  - FR-018:
    - These, in titles and in tags, each give `malformed` with the quoted token as subject and the detail `not a full requirement ID of the form <feature>-FR-###`: `FR-001`, `fr-001`, `002-example-fr-001`, `002-example-FR-01`, `002-example-FR-0001`, `002-example-FR-001x` and `fr-CA`.
    - A malformed `data-req` value gives `malformed` too.
    - An empty `data-req=""` gives `malformed` with subject `""`.
    - A test with one malformed and one valid ID still covers the valid one.
  - FR-019: a reference to an active requirement in a Draft spec isn't reported, and neither is one into a spec with an invalid Status.
- [X] T030 [P] [US3] Write `tools/traceability/test/ui-files.test.ts`, covering 001-requirement-traceability-FR-013 and 001-requirement-traceability-FR-014. Put all sample markup in string literals.
  - `readUiFile(file, text)` reads JSX `data-req="…"`, `data-req={'…'}` and ``data-req={`…`}`` with no substitutions. It also reads `{ 'data-req': '…' }` object properties, including inside `createElement` calls.
  - A computed value is skipped: `data-req={ids}`, or a template with substitutions.
  - A file whose text doesn't contain `data-req` isn't parsed.
  - Space-separated values give one reference each, at its own column.
  - With `runCheck`, all of these hold:
    - `.tsx`, `.ts` and `.jsx` files with `data-req` are UI source;
    - a test file containing the same markup is not;
    - files under excluded directories aren't read;
    - a UI file with a syntax error gives `unreadable-file`.
- [X] T031 [P] [US3] Extend `tools/traceability/test/test-files.test.ts` with a group covering 001-requirement-traceability-FR-012, 001-requirement-traceability-FR-016, 001-requirement-traceability-FR-017 and 001-requirement-traceability-FR-018. Using `runCheck`, unknown, removed and malformed references are still reported in all of these places:
  - `.skip` and `.todo` tests;
  - tests inside skipped groups;
  - groups with no tests;
  - the titles of unrecognized call shapes;
  - tests declared inside a top-level loop or `if` block.

  IDs in test bodies are still not read (FR-011).

### Implementation for User Story 3

- [X] T032 [P] [US3] Extend `tools/traceability/src/ids.ts` with reference classification (data-model Reference, the classification tree):
  - `SpecTargets` is `Map<feature, { readable: boolean; ids: Map<'FR-###', 'active' | 'removed'> }>`. An ID is `active` when any of its definitions is active.
  - `referenceProblem(text, location, targets): Problem | null`. The subject is the full ID without quotes, except for `malformed`:
    - `malformed` when `parseFullId` rejects the text. The subject is the quoted text.
    - `unknown-reference` when no feature matches. The detail is `no spec directory is named <feature>`.
    - null when the spec is unreadable.
    - `unknown-reference` when the ID isn't defined. The detail is `spec <feature> defines no <FR-###>`.
    - `removed-reference` when every definition is removed.
    - Otherwise null. Draft and invalid-Status specs are valid targets.
  - `splitDataReq(value)` returns `{ text, index }[]`, one per whitespace-separated piece. A value that is empty or only whitespace gives one empty piece at index 0.
- [X] T033 [P] [US3] Extend `listFiles` in `tools/traceability/src/files.ts` to also return `uiFiles`. It includes every file matching `/\.(?:[cm]?[jt]s|[jt]sx)$/` (`.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`) that doesn't match `TEST_FILE_PATTERN`. The exclusions and order are the same as for test files (research R6).
- [X] T034 [US3] Implement `readUiFile(file, text)` in `tools/traceability/src/ui-files.ts`, after T032. It returns `{ references: Token[]; problem: Problem | null }`.
  - Return no references, without parsing, when `text` doesn't include `data-req`.
  - Otherwise call `parseSource` and walk every node with `visitAll`.
  - Read a `JSXAttribute` named `data-req` whose value is a string literal, or a `JSXExpressionContainer` holding a string literal or a template literal with no substitutions. Read a non-computed property whose key is the string literal `'data-req'` with the same kinds of value.
  - Split each value with `splitDataReq`, and locate each piece with `createLocator`.
  - Skip computed values (research R6).
- [X] T035 [US3] Wire reference checking into `runCheck` in `tools/traceability/src/check.ts`:
  - Build `SpecTargets` from every spec, of any Status. Mark specs whose `spec.md` couldn't be read as unreadable.
  - For every node of every readable test file, apply `referenceProblem` to each of its own tokens, once. That includes inactive tests, groups with no tests and unrecognized shapes.
  - Read every `uiFiles` entry, with read errors handled as in T022. Call `readUiFile` and apply `referenceProblem` to each reference.
  - Add these problems before `buildReport`.
- [X] T036 [US3] Checkpoint.
  - `npm run typecheck` and `npm test` pass. The US1 and US2 tests pass unchanged.
  - `npm run traceability` exits 1 with only uncovered 001-requirement-traceability-FR-028 (its test comes in T040), plus -FR-025 if US2 isn't done yet. Any other problem is a defect.
  - The check's own test titles produce no reference problems.

**Checkpoint**: All user stories are independently functional.

---

## Phase 6: Polish & Constitution Verification

**Purpose**: The success-criteria tests, the self-check, and the constitution checks that apply.
These are N/A per plan.md's Constitution Check, so they have no tasks: II (No UI), IV (no CV data
or tokens), V (no shells or apps), VII (nothing visitor-facing), VIII (no UI) and IX (no visual
assets).

- [X] T037 [P] Create the committed sample project `tools/traceability/test/__fixtures__/seeded/` (SC-001, research R13).

  Write `expected-report.txt` by hand from the cases below before running the check. When the run differs, find out whether the fixture or the check is wrong. Never copy the output over. Note each case in the fixture itself, using HTML comments in spec.md files and `//` comments in code. The check ignores both by design.

  Cases:
  - `specs/002-example/spec.md` (Approved):
    - FR-001: active, covered.
    - FR-002: removed (`~~**FR-002**~~: Removed …`).
    - FR-003: active, uncovered. It is referenced only by an empty group, a comment, an assertion string and the broken file.
    - FR-004: active. Only a `test.skip` references it.
    - FR-005: active. It is covered through a group title by a test nested two levels deep.
    - FR-006: defined twice, both active, and covered through a tag.
    - FR-007: one active and one removed entry, covered by a test that also carries the malformed `002-example-FR-01`.
    - Malformed entries `FR-1`, `FR-0001` and `fr-008`.
    - FR-003 is mentioned in a user story, and `- **FR-010**:` lines appear inside an HTML comment and inside a fenced code block. None of these is a definition.
  - `specs/003-draft/spec.md` (Draft): FR-001 defined twice, and `FR-2`. A test references `003-draft-FR-001`.
  - `specs/004-typo/spec.md`: `**Status**: Aproved`, defines FR-001.
  - `specs/005-nostatus/spec.md`: its Status line appears only inside an HTML comment.
  - `specs/006-empty/spec.md` (Approved): an empty Functional Requirements section.
  - `specs/007-twin/spec.md` (Approved): FR-001, covered only by a `test.skipIf(process.env.CI)(…)` test.
  - `specs/notes/notes.md`: a directory with no `spec.md`.
  - `src/clock.test.ts`, containing exactly these:
    - a comment naming `002-example-FR-003`;
    - `describe('… 002-example-FR-005', …)`, containing a `describe` that contains one `test`;
    - one with `002-example-FR-001` in the title and `tags: ['002-example-FR-006']`. Its body asserts `expect('002-example-FR-003')`;
    - `test.skip('… 002-example-FR-004', …)`;
    - `test.skipIf(process.env.CI)('… 007-twin-FR-001', …)`;
    - one with `002-example-FR-002`;
    - one with `002-example-FR-009`;
    - one with `099-missing-FR-001`;
    - one with a bare `FR-001`;
    - one with the tag `002-example-fr-005`;
    - one with `002-example-FR-01` and `002-example-FR-007`;
    - one with `003-draft-FR-001`;
    - `test.todo('… 002-example-FR-011')`;
    - an empty `describe('… 002-example-FR-003', () => {})`.
  - `src/broken.test.ts`: a test titled with `002-example-FR-003`, followed by a syntax error.
  - `src/Clock.tsx`, with these attributes:
    - `data-req="002-example-FR-001 002-example-FR-006"`;
    - `data-req="002-example-FR-002"`;
    - `data-req="FR-005"`;
    - `data-req="099-missing-FR-002"`;
    - `data-req=""`;
    - `{ 'data-req': '002-example-FR-012' }`;
    - `data-req={ids}`.
  - `dist/ignored.test.ts`, `__fixtures__/ignored.test.ts` and `.cache/ignored.test.ts`, each with a malformed title ID and a syntax error. None of them may appear in the report. `node_modules` can't be committed, so T012 covers it.

  With exactly these cases, the summary is:

  | Row | Count |
  |-----|-------|
  | Approved specs checked | 3 |
  | Active requirements checked | 7 |
  | Requirements covered | 5 |
  | Problems | 23 |
  | uncovered | 2 |
  | unknown-reference | 5 |
  | removed-reference | 2 |
  | malformed | 8 |
  | duplicate-id | 2 |
  | bad-status | 2 |
  | no-requirements | 1 |
  | unreadable-file | 1 |

  The last line is `FAIL: 23 problems found.`
- [X] T038 Add a seeded-project test to `tools/traceability/test/cli.test.ts`, after T037 (SC-001). Its title has no FR ID, e.g. `describe('seeded sample project (SC-001)', …)`. `runCli('<REPO_ROOT>/tools/traceability/test/__fixtures__/seeded')` exits 1, and its stdout equals `expected-report.txt` byte for byte.
- [X] T039 [P] Write `tools/traceability/test/performance.test.ts` (SC-004). Use `makeProject` to generate 50 approved specs with 40 requirements each, and 200 test files with 10 tests each. Each test references one distinct full ID. Time `runCli` on the project: it must exit 0 in under 10,000 ms. Give the test a 60 s timeout.
- [X] T040 [P] Write `tools/traceability/test/self-check.test.ts`, covering 001-requirement-traceability-FR-028 (SC-006).
  - `runCheck(REPO_ROOT)` has `result` `pass` and no problems.
  - Parsing the repository's specs with `listFiles` and `parseSpec` shows `001-requirement-traceability` as Approved.
  - The report's `approvedSpecs` and `activeRequirements` equal the counts computed from those parsed approved specs.
  - Don't hard-code 29, so later specs don't break the test.
- [X] T041 [P] Correct the illustrative `bad-status` line in `specs/001-requirement-traceability/contracts/cli.md` from `specs/003-other/spec.md:7:15` to `:7:13`. The value of `**Status**: Aproved` starts at column 13, per data-model.md's Location rule.
- [X] T042 [P] Audit Constitution X:
  - `package.json` has exactly the four `devDependencies` from plan.md (`oxc-parser`, `vitest`, `typescript`, `@types/node`) and no `dependencies`.
  - `oxc-parser` has no `^` or `~`, and `package-lock.json` is committed.
  - Both actions are pinned to full SHAs.
  - No agent skill or other abstraction beyond `makeProject` (and its `runCli` companion) was added.
- [X] T043 Run the full verification, after T038 to T040.
  - `npm run typecheck` passes.
  - `npm test` passes.
  - `npm run traceability` exits 0, and its last line is exactly `PASS: all 29 active requirements in 1 approved spec are covered.` (Constitution III, SC-006).
- [X] T044 Run quickstart.md scenarios 1 to 6 and record any deviation.
  - Scenario 3 temporarily changes one requirement's group to `describe.skip(`. Revert it with `git checkout -- <file>`.
  - Scenario 4 needs the owner to turn the network off.
  - Scenario 6 is the performance test.
  - Result (2026-10-21, macOS, Node 26.12.1): scenarios 1, 2, 3, 5 and 6 ran as expected, with no
    deviation. Scenario 1 passed 29 of 29 with exit 0. Scenario 2's report matched
    `expected-report.txt` with exit 1. Scenario 3 (FR-009's group skipped) exited 1 with
    `specs/001-requirement-traceability/spec.md:251:5 uncovered 001-requirement-traceability-FR-009: only skipped, disabled or placeholder tests reference this requirement`,
    and was reverted. Scenario 5 gave identical runs. Scenario 6 took 115 ms against the 10 s
    budget. Scenario 4 (network off) is still the owner's to run.
  - Scenario 4 result (2026-10-21, macOS, Node 26.12.1): the network was cut for the whole process
    tree with `sandbox-exec -p '(version 1)(allow default)(deny network*)'`, which is stricter than
    turning Wi-Fi off because it also blocks loopback. A `fetch` probe under that profile failed
    with `EPERM`. `npm run --silent traceability` exited 0 both online and offline, and the two
    reports were byte-identical.
- [X] T045 Commit the remaining work with Conventional Commits, e.g. `feat(traceability): …`, `test(traceability): …`. Push, and mark the draft pull request from T028 ready for review (Constitution XI). If US2 was skipped or done later, open it now.
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/001-requirement-traceability/spec.md` and `specs/001-requirement-traceability/tasks.md`.
  - Confirm both `traceability` and `test` jobs run and pass.
  - Confirm the `traceability` log shows the same report as the local run on the same commit (FR-026, quickstart scenario 5).
  - Result (2026-10-21): pull request #7 opened ready for review, after all phases were done locally, so there was no draft stage (T028). On commit 0fba0de, `traceability` and `test` passed on `ubuntu-latest` with Node 26.12.0, and the `traceability` log's report matched the local macOS run line for line.
- [X] T046 Owner action, needs admin rights and the open PR from T045: apply the ruleset with `gh api --method POST /repos/alex-profir/CV/rulesets --input .github/rulesets/main.json` (quickstart scenario 7).
  - Confirm `current_user_can_bypass` reads `never`, and the drift diff prints `no drift`.
  - If the diff shows parameters the server added with default values, add them to `.github/rulesets/main.json` and the contracts/ci.md table. Then update `repo-settings.test.ts`, re-apply with `--method PUT /repos/alex-profir/CV/rulesets/<id>`, and push the change to the PR.
  - Result (2026-10-21, approved by the owner): ruleset 25562339 was created and reads `current_user_can_bypass: never`. The first drift diff showed two `pull_request` parameters the server added: `required_reviewers: []` and `require_extra_approval_for_unattributed_changes: true`, a preview setting GitHub turns on when it's omitted. It would require an approval for changes GitHub can't attribute to a user, which a sole owner can't give while nobody can bypass, so the committed file writes it out as `false`, matching `required_approving_review_count: 0`. Both parameters were added to `.github/rulesets/main.json`, contracts/ci.md and `repo-settings.test.ts`, and the ruleset was re-applied with `PUT`. It then read back with `no drift`.
- [X] T047 Owner action, after T046: demonstrate enforcement (quickstart scenario 7, US2 scenarios 1 to 4, SC-003).
  1. On a scratch branch based on `001-requirement-traceability`, apply scenario 3's skip change, push, and open a PR.
  2. Confirm `traceability` fails, names the uncovered requirement, and GitHub shows the merge blocked with no bypass option.
  3. Revert, push, and confirm both checks pass. Then close the PR without merging and delete the scratch branch.
  4. Run the direct-push probe from quickstart scenario 7 only after `current_user_can_bypass` reads `never`. Confirm `git push origin main` is rejected, then drop the local probe commit with `git reset --hard origin/main`.
  - Result (2026-10-21, approved by the owner): scratch pull request #8 skipped FR-009's group. `traceability` failed with `specs/001-requirement-traceability/spec.md:251:5 uncovered 001-requirement-traceability-FR-009: only skipped, disabled or placeholder tests reference this requirement`, the same line as the local run. `test` failed too, through the self-check (FR-028). GitHub reported `mergeStateStatus: BLOCKED` and `viewerCanMergeAsAdmin: false`, so the owner had no bypass. After the revert both checks passed and the state was `CLEAN`. #8 was closed unmerged and its branch deleted. The direct push of an empty commit to `main` was refused with `GH013: Repository rule violations found` ("Changes must be made through a pull request", "2 of 2 required status checks are expected"), `origin/main` was unchanged, and the local probe commit was dropped.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T002 runs after T001. T003 can run alongside T002.
- **Foundational (Phase 2)**: Depends on Setup. T006 runs after T005, and T008 after T004 to T007.
  It BLOCKS all user stories.
- **Design gate**: N/A. The spec says No UI.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Story 2 (Phase 4)**: Depends on US1, because the CI job runs the CLI built there.
- **User Story 3 (Phase 5)**: Depends on US1, because it extends `ids.ts`, `files.ts`,
  `check.ts` and the US1 test files. It is independent of US2.
- **Polish (Phase 6)**: Depends on US1 to US3. T045 needs T043 and T044. T046 needs the open PR
  from T045. T047 needs T046.

### Within User Story 1

- T009 to T015 (tests) come first. They are all in different files and can run in parallel.
- T016 to T019 can run in parallel.
- T020 runs after T016.
- T021 runs after T016 and T017.
- T022 runs after T018 to T021.
- T023 runs after T022, and T024 last.

### Within User Story 2

- T025, T026 and T027 can run in parallel. T028 runs last.

### Within User Story 3

- T029, T030 and T031 (tests) come first, in parallel.
- T032 and T033 can run in parallel.
- T034 runs after T032.
- T035 runs after T032 to T034, and T036 last.

### Parallel Opportunities

- Setup: T003 alongside T002.
- Foundational: T004, T005 and T007 together.
- US1: seven test tasks together, then four implementation tasks together.
- After US1: US2 (T025 to T028) and US3 (T029 to T036) can proceed side by side.
- Polish: T037, T039, T040, T041 and T042 together.

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "specs.test.ts, covers 001-requirement-traceability-FR-001 to FR-008, in tools/traceability/test/specs.test.ts"
Task: "references.test.ts, covers 001-requirement-traceability-FR-009, in tools/traceability/test/references.test.ts"
Task: "test-files.test.ts, covers 001-requirement-traceability-FR-010, FR-011, FR-012, FR-022, in tools/traceability/test/test-files.test.ts"
Task: "files.test.ts, covers 001-requirement-traceability-FR-014, in tools/traceability/test/files.test.ts"
Task: "check.test.ts, covers 001-requirement-traceability-FR-015, FR-020, FR-021, FR-029, in tools/traceability/test/check.test.ts"
Task: "report.test.ts, covers 001-requirement-traceability-FR-022, FR-023, FR-024, in tools/traceability/test/report.test.ts"
Task: "cli.test.ts, covers 001-requirement-traceability-FR-026, FR-027, in tools/traceability/test/cli.test.ts"

# Then the independent modules together:
Task: "Full-ID grammar and token finding in tools/traceability/src/ids.ts"
Task: "oxc-parser wrapper in tools/traceability/src/source.ts"
Task: "listFiles walk in tools/traceability/src/files.ts"
Task: "Problem ordering and rendering in tools/traceability/src/report.ts"
```

## Parallel Example: User Story 2

```bash
Task: "repo-settings.test.ts, covers 001-requirement-traceability-FR-025, FR-026, in tools/traceability/test/repo-settings.test.ts"
Task: "Pull-request workflow in .github/workflows/ci.yml"
Task: "Ruleset in .github/rulesets/main.json"
```

## Parallel Example: User Story 3

```bash
Task: "references.test.ts additions, covers 001-requirement-traceability-FR-016 to FR-019"
Task: "ui-files.test.ts, covers 001-requirement-traceability-FR-013, FR-014"
Task: "test-files.test.ts addition, covers 001-requirement-traceability-FR-012, FR-016 to FR-018"
# Then:
Task: "Reference classification and data-req splitting in tools/traceability/src/ids.ts"
Task: "uiFiles in listFiles, tools/traceability/src/files.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational. It blocks all stories. The design gate is N/A (No UI).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE** (T024). The local check works end to end. On the repository it reports
   exactly the seven requirements whose tests come later. That is the check doing its job, not a
   defect.

### Incremental Delivery

1. Setup + Foundational: the toolchain is ready.
2. US1: the check runs locally, offline and deterministically. 7 requirements remain uncovered.
3. US2: the CI workflow and ruleset are committed and statically verified. 6 remain uncovered.
   The draft PR opens here, so CI runs on Linux from now on.
4. US3: reference validation and `data-req` reading. 1 remains uncovered (FR-028).
5. Polish: the seeded project, performance and self-check tests. The repository passes its own
   check (29 of 29). Then the PR is opened and enforcement verified live.

All stories ship in the feature's single PR (Constitution XI). The increments above are
checkpoints within it. The PR can't merge until the repository passes its own check (FR-028).

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- Requirement IDs in task descriptions map tasks to spec.md requirements.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md).
- T046 and T047 change GitHub state. The owner runs them or explicitly approves them.

---

## Phase 7: Convergence

**Purpose**: Gaps found by `/speckit-converge` on 2026-10-21. The open owner tasks T044 (scenario
4), T046 and T047 still stand and aren't repeated here.

- [X] T048 Report unreadable directories as `unreadable-file` problems instead of aborting the run per FR-029 (partial)
  - Today `entries()` in `tools/traceability/src/files.ts` rethrows every `readdirSync` error except `ENOENT` and `ENOTDIR`. A directory the check can't read, such as `src/locked` with mode `000` or an unreadable `specs/<feature>`, makes the CLI exit 2 with `traceability check failed: EACCES: …` and an absolute path on stderr. No report is printed, so every other problem is lost (FR-021) and the path isn't relative (FR-022).
  - Have `listFiles` also return each directory it couldn't read, as a relative path with the error code, and carry on with the rest of the walk. `runCheck` reports each one like T022's file read errors: `unreadable-file` at `1:1`, the quoted path as subject, and the detail `cannot be read: <code>`.
  - An unreadable `specs/<feature>` directory also makes `<feature>` an unreadable reference target, so references into it aren't classified (data-model.md, Reference).
  - Add a test to the 001-requirement-traceability-FR-029 group in `tools/traceability/test/check.test.ts`. Make a directory unreadable with `fs.chmodSync(dir, 0o000)` after `makeProject`, and restore its mode in a `finally` so cleanup can remove it. Root ignores file modes, so use `test.skipIf(process.getuid?.() === 0)`. The existing EISDIR test keeps FR-029 covered when it's skipped.
- [X] T049 Make the CLI refuse to run on a Node version whose permission model can't block the network per plan: R9 no-network guard (partial)
  - R9 says the guard "holds in every run", but it only holds on Node 25 and later. In the owner's default shell (Node 24.21.0), `npm run traceability` passes with no warning while network calls stay allowed: the FR-027 positive control prints `ECONNREFUSED`, not `ERR_ACCESS_DENIED`. `engines` doesn't stop `npm run`.
  - In `tools/traceability/src/cli.ts`, before reading any file, write a message naming the required version (Node 26, as in `.nvmrc`) to stderr and set exit code 2 when the Node major version is below 26. Exit code 2 already means the check couldn't run (contracts/cli.md). Add this case to that table.
  - Keep the version comparison in a side-effect-free function outside `cli.ts`, because importing `cli.ts` runs the check. Test it with values such as `'24.21.0'` and `'26.0.0'` in the 001-requirement-traceability-FR-027 group in `tools/traceability/test/cli.test.ts`.

---

## Amendment of 2026-10-29: the local full run and its sign-off

The phases below build the amendment of 2026-10-29 (spec.md, Clarifications, Session
2026-10-29; User Story 4; FR-030 to FR-037; SC-008 to SC-010; the amended Edge Cases and
Assumptions). The design is in plan.md (its amendment parts), research.md R14 to R21,
data-model.md (The local full run and the sign-off), contracts/ci.md (amended),
contracts/local-verify.md and quickstart.md scenarios 8 to 13. FR-001 to FR-029 don't change.

It ships in one pull request of its own, from `001-local-verify` (plan.md, Constitution Check
row XI). Phases 1 to 7 stay as recorded. The tasks it overturns are marked superseded in part
where they stand: T006 (by T063), T012 (by T055), T025 (by T056) and T026 (by T071).

**Rules for these phases**, in addition to "Rules that apply to every task" above, which still
hold:

- Every new test is in the fast set, makes no network request, posts no status and needs no
  browser or site build (research R20). Sample repositories live in temporary directories, never
  inside the repository.
- `tools/local-verify/` follows the other tools' style: plain modules, erasable TypeScript,
  explicit `.ts` import extensions, a plain-JavaScript `main.js` gate. It adds no npm package
  (Constitution X).
- **The fast set's import rule applies to the tool's own code** (research R14, the machine check,
  rule 3). `tools/local-verify/test/` is a fast directory, so nothing `verify.test.ts` or
  `signoff.test.ts` imports may reach `tools/site-check/src/browser.ts` (which imports
  `playwright`), and no `node:child_process` call in that closure may take a string literal, or
  an array-literal element, naming `site-check`, `build`, `build-site` or
  `site-check/src/main.js`. So:
  - the real Chromium probe (`hasChromium()`) is imported only by `main.js`, after its Node gate,
    and passed to `verify` through the `prerequisites` seam. `verify.ts` never imports
    `browser.ts`, statically or by a literal `import()`. (Decision taken in this tasks run: the
    plan says the seam "defaults to the real probes"; the Node and lockfile probes can default
    in `verify.ts`, the Chromium probe can't.)
  - the check commands are data in `checks.ts`, and the process call receives them through
    variables.
- Test titles carry the full IDs they cover. They contain no other `fr-` text in any letter case
  (FR-011, FR-018, FR-028). The edits to 002's, 003's and 004's tests keep those features' IDs and
  meaning (research R20).
- Commits use Conventional Commits with the `001` scope (`test(001):`, `feat(001):`,
  `ci(001):`, `docs(001):`) and no AI or Claude attribution (CLAUDE.md).

---

## Phase 8: Foundational for the amendment (Blocking Prerequisites)

**Purpose**: the baseline, the one list of fast directories, and the two test helpers the
amendment's tests need.

**⚠️ CRITICAL**: no User Story 4 task can begin until this phase is complete.

**Design gate (Constitution II)**: omitted. The spec still says **No UI**, and the amendment adds
none.

- [X] T050 Confirm the baseline on `001-local-verify`, with Node 26 active (`nvm use`): `npm ci`, then `npm run typecheck` and `npm test` pass. `npm run traceability` exits 1 with exactly eight `uncovered` problems, 001-requirement-traceability-FR-030 to -FR-037, which the amendment approved and whose tests come in Phase 9. Any other problem is a defect to fix first. Record the counts here.
  - **Recorded 2026-10-29** (macOS, Darwin 25.6.0 arm64, Node 26.12.1, npm 11.20.0): `npm ci` and `npm run typecheck` pass. `npm run traceability` exits 1: 6 approved specs, 325 active requirements, 317 covered, `FAIL: 8 problems found.`, all `uncovered`, exactly 001-requirement-traceability-FR-030 to -FR-037. `npm test`: 152 files, 1470 tests, 1467 passed and 3 failed in 550 s. The 3 failures are the self-check tests that run the check on the repository (001 FR-028 in `tools/traceability/test/self-check.test.ts`, 004 FR-047 and 006 FR-010 in `packages/web/test/self-check.test.ts`), each failing only on those eight uncovered requirements, so no other defect.
- [X] T051 [P] Add `FAST_TEST_GLOBS` to `tools/traceability/src/files.ts`, beside `TEST_INCLUDE_GLOBS` (research R14, data-model.md TestSet). It is a `string[]`, one glob per directory, each the directory followed by `/**/` and the same file pattern as `TEST_INCLUDE_GLOBS` (`*.{test,spec}.?(c|m)[jt]s?(x)`), in this order:
  - `tools/traceability/test`, `tools/content-check/test`, `tools/token-check/test`, `tools/local-verify/test`
  - `packages/content/test`, `packages/os-core/test`, `packages/tokens/test`, `packages/web/test/terminal/engine`

  Add a comment that a directory joins the fast set only when none of its tests needs a browser or the site build, and that `test-sets.test.ts` checks the choice. `listFiles` and every other function in `files.ts` must not read `FAST_TEST_GLOBS`: the check reads every test, in either set (FR-030).
- [X] T052 [P] Create the import-closure helper `tools/traceability/test/helpers/imports.ts` (plan Dependencies table, research R14 rule 3). It is test-only and uses the check's own `parseSource` and `visitAll` from `tools/traceability/src/source.ts`.
  - `forbiddenReach(root: string, file: string, rules: { packages: string[]; files: string[]; spawnNames: string[]; npmScripts: string[] }): { target: string; chain: string[] } | null`. `file` and every path are relative to `root` with `/` separators. `chain` runs from `file` to the module that reaches the target, then the target.
  - Follow only runtime imports: `import … from '<literal>'` and `export … from '<literal>'` whose `importKind`/`exportKind` isn't `type`, side-effect `import '<literal>'`, and `import('<literal>')` with a string-literal or substitution-free template argument. Skip `import type` and `export type`.
  - Resolve relative specifiers against the importing file (the repository writes explicit extensions; also try `.ts`, `.tsx`, `/index.ts` when the file doesn't exist). Resolve `@cv/<name>` and `@cv/<name>/<sub>` through `packages/<name>/package.json` `exports`. Any other bare specifier is a package: record its name (`@scope/name` or `name`), don't follow it. `node:` built-ins are neither followed nor forbidden.
  - A target is reached when a package name is in `rules.packages`, a resolved file is in `rules.files`, or a module of the closure calls `spawn`, `spawnSync`, `exec`, `execSync`, `execFile`, `execFileSync` or `fork` (imported from `node:child_process` or `child_process`, by name or as a namespace member) with a string-literal argument, or an element of an array-literal argument, that contains one of `rules.spawnNames`, or that names one of `rules.npmScripts` as an npm script (an element equal to the name after `run`, or a string matching `npm run [--silent ]<name>` as a whole word). Plain strings outside such a call never count.
  - Visit each module once (breadth-first, in code-unit order of specifiers), so the chain reported is a shortest one and the result is deterministic. A module that can't be read or parsed is reported as the target, with its chain, rather than skipped (fail closed, like FR-029).
- [X] T053 [P] Create the sample-repository helper `tools/local-verify/test/helpers/repo.ts` (research R20). Reuse `makeProject` from `tools/traceability/test/helpers/project.ts` for files.
  - `makeRepo(files, options?)`: writes the files, runs `git init -b <branch>` (default `001-local-verify`), and commits everything with `git -c user.name=Test -c user.email=test@example.invalid -c commit.gpgsign=false commit`. It adds `.gitignore` (`node_modules/`) and `.nvmrc` (`26`) unless given. Returns `{ root, sha, git(args) }`.
  - `withOrigin(repo, { reachable = true, pushed = true })`: creates a bare repository in another temporary directory, sets `origin` to `https://github.com/alex-profir/CV` and rewrites it with `git config url.<file URL of the bare repo>.insteadOf https://github.com/alex-profir/CV`. `pushed` pushes the branch; `reachable: false` points the rewrite at a missing path. Returns the bare repository's path and `remoteHead(branch)`.
  - Every git the helper or the code under test starts gets `GIT_ALLOW_PROTOCOL=file`, `GIT_CONFIG_NOSYSTEM=1`, `GIT_TERMINAL_PROMPT=0` and a `HOME` in a temporary directory, so no real transport, credential helper or user config is used. Export the resulting `env` for tests to pass to `verify` and `signoff`.
  - `fakeBin({ gh?: { exitCode, stderr }, npm?: Record<string, { exitCode, leaveFile?, report? }> })`: a temporary `bin/` with executable `#!/bin/sh` scripts `gh` and `npm` that append their arguments (and, for `gh`, the bare repository's head of the branch at that moment) as one JSON line to a log file, then exit with the chosen code. For `npm test -- … --outputFile.json=<path>`, the fake `npm` writes a Vitest-shaped JSON report to `<path>` (`success`, `numTotalTests`, `numPassedTests`, `numFailedTests`, `numPendingTests`, `testResults[].name` as absolute paths), listing the sample repository's test files, or the subset the test chooses (SC-010's guard). `leaveFile` makes a check leave an untracked file behind (FR-037). Also put a symlink to the real `git` in `bin/`, so a test can set `PATH` to `bin/` alone and a real `gh` or `npm` elsewhere is never found. Returns `{ bin, env, log(): Entry[] }`.
  - Register cleanup with `onTestFinished`, as `makeProject` does.

**Checkpoint**: the foundation is ready; User Story 4's tests can be written.

---

## Phase 9: User Story 4 - Prove the full test run before merge (Priority: P4) *(added 2026-10-29)*

**Goal**: pull requests run only the fast checks, within 6 minutes. `npm run verify` runs every
check with the full set on a clean commit and keeps its result outside the working copy.
`npm run signoff` records a passing `local-verify` commit status on that exact commit with the
owner's `gh` login. The ruleset makes that status required.

**Independent Test**: on a pull request, `npm run verify` refuses with an uncommitted change.
Commit, run it, sign off, and the pull request shows `local-verify` passing and can merge. Push
another commit and it can't merge until that commit is signed off. Break one browser test, and
the run fails and no passing sign-off can be recorded (spec US4). Statically, the tests below
prove all of it on sample repositories and the committed files; live, Phase 11 does.

### Tests for User Story 4 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.** T054 to T061 are in
> different files and can be written in parallel once Phase 8 is done.

- [X] T054 [P] [US4] Write `tools/traceability/test/test-sets.test.ts`, covering 001-requirement-traceability-FR-030 (and SC-010). Title the group `001-requirement-traceability-FR-030: …`. Following research R14's machine check:
  - **Every test file is in the full set, exactly once**: run `npx vitest list --filesOnly --json` with `spawnSync` from `REPO_ROOT`, with every `VITEST*` variable removed from `env`. Parse it; map each entry's file to a repository-relative path with `/`. The sorted list equals `listFiles(REPO_ROOT).testFiles`, no file appears twice, and every `projectName` is `fast` or `slow`. Give the test a generous timeout (60 s).
  - **The check reads every test**: the same equality proves it; also assert `tools/traceability/src/files.ts`'s `listFiles` source doesn't mention `FAST_TEST_GLOBS` (read the file and find no use outside its declaration).
  - **The fast set needs no browser or build**: for every `fast` file from the listing, `forbiddenReach` (T052) with `packages: ['playwright', 'playwright-core', 'lighthouse', 'chrome-launcher', 'vite']`, `files: ['tools/site-check/src/browser.ts', 'packages/web/scripts/build-site.ts', 'packages/web/test/helpers/site.ts', 'packages/web/test/helpers/browser.ts', 'packages/web/test/helpers/copy.ts']`, `spawnNames: ['build-site', 'site-check/src/main.js']` and `npmScripts: ['build', 'site-check']` returns null. Assert the whole list at once, so a failure names every offending file with its chain. 001's repo-settings test may still compare text with `npm run --silent site-check` in plain strings (R14).
  - **The rule catches what it must** (sample projects from `makeProject`, inputs in bodies only): a fast file that imports `playwright` directly is reported with chain `[file, 'playwright']`; one that reaches `packages/web/test/helpers/site.ts` through a relative helper is reported with the three-step chain; one that imports only `import type { Browser } from 'playwright'` is not; one that calls `spawnSync('npm', ['run', 'site-check'])` is; one with the string `'npm run --silent site-check'` outside a process call is not; an unparseable module in the closure is reported.
  - **The config matches the constants**: import `vitest.config.ts` as `files.test.ts` does. `test.projects` has exactly two inline projects named `fast` and `slow`. `fast`: `include` deep-equals `FAST_TEST_GLOBS`, `exclude` deep-equals `TEST_EXCLUDE_GLOBS`, no `globalSetup`. `slow`: `include` deep-equals `TEST_INCLUDE_GLOBS`, `exclude` deep-equals `[...TEST_EXCLUDE_GLOBS, ...FAST_TEST_GLOBS]`, `globalSetup` deep-equals `['packages/web/test/helpers/site.ts']`. The root `test` has no `include`, `exclude` or `globalSetup`.
  - **The scripts**: `package.json`'s `test` is `vitest run` (no project or file filter, SC-010) and `test:fast` is `vitest run --project fast`.
- [X] T055 [P] [US4] Update the config assertion in `tools/traceability/test/files.test.ts` (supersedes that part of T012), keeping its group title `001-requirement-traceability-FR-014: …`: each project's `include` and `exclude` are built from the constants exactly as in T054, and the root sets none. Add one test titled with 001-requirement-traceability-FR-030 asserting `listFiles` returns the same `testFiles` for a sample project whether or not its paths match `FAST_TEST_GLOBS` (a fast-directory file and a slow-directory file are both listed).
- [X] T056 [P] [US4] Update `tools/traceability/test/repo-settings.test.ts` (supersedes that part of T025), reading `ci.yml` as text and the ruleset with `JSON.parse` as before. Keep the layout guard and the existing FR-025 and FR-026 groups, with these changes and additions:
  - 001-requirement-traceability-FR-025: the `test` job's steps are `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run typecheck`, `npm run test:fast`. The ruleset's `required_status_checks` deep-equals `traceability`, `test`, `content`, `tokens`, `site`, each with `integration_id: 15368`, then `{ context: 'local-verify' }`. "Every required check is a workflow job" becomes "every required check with `integration_id: 15368` is the name of a `ci.yml` job".
  - New group `001-requirement-traceability-FR-031: pull requests run the fast checks and nothing else`: across all jobs, the set of `run:` commands is exactly the eight of contracts/ci.md (`npm ci`, `npm run traceability`, `npm run typecheck`, `npm run test:fast`, `npm run content-check`, `npm run token-check`, `npx playwright install --with-deps chromium`, and the site-check step, matched by containing `npm run --silent site-check`); the `test` job has no `actions/cache` step and no `playwright` text; `package.json`'s `test:fast` is `vitest run --project fast`; no line runs `npm test`, `npm run test ` or `vitest` directly.
  - New group `001-requirement-traceability-FR-034: the workflow can't record a sign-off`: the top-level `permissions:` block is exactly `contents: read`; no job has its own `permissions:`; no line of `ci.yml` contains `local-verify`, `signoff`, `npm run verify` or a `gh ` command.
  - New group `001-requirement-traceability-FR-035: merging needs the owner's sign-off`: the last required check is `{ context: 'local-verify' }` with no `integration_id` key; it is the only one without one; it is the name of no job; `strict_required_status_checks_policy` is `true`; `bypass_actors` is `[]`; no `update` rule.
  - New group `SC-008: every pull-request job has a 6-minute limit` (no FR ID needed, as SC-001's test): every job under `jobs:` has `timeout-minutes: 6`, and the `test` job installs no browser.
- [X] T057 [P] [US4] Update `tools/content-check/test/repo-settings.test.ts`, keeping its group 002-cv-content-FR-033 (research R20): the expected required list gains `{ context: 'local-verify' }` last, and "every required check is a workflow job" is limited to checks with `integration_id: 15368`. Rename the test titles that list the checks to include `local-verify`.
- [X] T058 [P] [US4] Update `tools/token-check/test/repo-settings.test.ts`, keeping its group 003-design-tokens-FR-039, with the same change as T057.
- [X] T059 [P] [US4] Update `tools/site-check/test/repo-settings.test.ts`, keeping its group 004-cv-page-FR-048 (research R20): the expected required list gains `local-verify`; the browser-cache key (Playwright version from `package-lock.json`) is checked for the `site` job only; "the test job caches and installs the browser before running the tests" becomes "the test job installs no browser and runs the typecheck and the fast set" (`npm ci`, `npm run typecheck`, `npm run test:fast`, no `actions/cache`, no `playwright install`). The `site` job's assertions don't change. `tools/site-check/test/cli.test.ts` stays as it is.
- [X] T060 [P] [US4] Write `tools/local-verify/test/verify.test.ts`, covering 001-requirement-traceability-FR-032, 001-requirement-traceability-FR-033 and 001-requirement-traceability-FR-037 (and SC-010). Call `verify({ root, env, exec, prerequisites })` from `tools/local-verify/src/verify.ts` on sample repositories (T053) with the fake `npm` first on `PATH`, and a `prerequisites` stub reporting Chromium present unless the test says otherwise. Assert stdout, stderr, the exit code it returns, the fake `npm` log and the result files. Messages are contracts/local-verify.md's, word for word.
  - FR-032, the clean tree: a modified, a staged, a deleted and an untracked file (including one in a new directory, `--untracked-files=all`) each refuse with exit 2, the message `local full run refused: the working copy differs from commit <sha>:`, one `  <XY> <path>` line per path and `Commit or remove these, then run it again.`; the fake `npm` log is empty and no result is written. A file ignored by `.gitignore` (`node_modules/x`, `dist/x`) doesn't refuse. Outside a git work tree: `local full run: not a git work tree`, exit 2.
  - FR-032, prerequisites: `.nvmrc` naming another major gives `local full run needs Node <nvmrc> (see .nvmrc), but this is Node <version>: run nvm use`; a missing `node_modules/.package-lock.json`, or one whose package versions differ from `package-lock.json`, gives `local full run needs the locked dependencies installed: run npm ci`; the stub reporting no Chromium gives `site check needs Chromium: run npx playwright install chromium`. Several missing ones are listed together. Each exits 2 with nothing run and no result written.
  - FR-032, the checks: read `.github/workflows/ci.yml` from `REPO_ROOT`; the commands `checks.ts` runs are its `run:` commands other than `npm ci` and the Playwright install (for the site step, the `npm run --silent site-check` inside it), with `npm run test:fast` replaced by `npm test` plus the reporter flags, in the contract's order `typecheck`, `traceability`, `content`, `tokens`, `test`, `site`; `site` runs exactly `npm run --silent site-check` (the same command as 004 FR-049). `package.json`'s `verify` is `node tools/local-verify/src/main.js verify`. Each check's output follows a `== <name>: <command>` header in stdout and in `<sha>.log`.
  - FR-033: with every fake check passing, exit 0; the summary lists six `pass` lines and ends `PASS: every check passed on <sha>. Sign off with: npm run signoff`; the result reads `result: 'pass'`, the test counts from the report, `siteCheck: 'pass'`, `node: process.versions.node`, and `os` as `os.type() os.release() process.arch`. With `traceability` and `site` failing, every check still runs (all six in the fake log, in order), exit 1, `FAIL: 2 checks failed on <sha>: traceability, site. Nothing can be signed off for this commit.`, result `fail`, `siteCheck: 'fail'`.
  - SC-010: the `test` check runs `npm test` with no `--project` or file argument; a report listing fewer files than `listFiles(root).testFiles` fails `test` with the detail `ran <n> of <m> test files`; a report with `success: false` fails it.
  - FR-037: after a run, `<git common dir>/local-verify/<sha>.json`, `<sha>.log` and `<sha>.vitest.json` exist (for a linked worktree too, via `git worktree add`, using the common directory); `git status --porcelain` is empty and `git ls-files` is unchanged. A check that leaves an untracked file fails the run, naming the path, with `clean.atEnd: false`. A second run on the same commit replaces the result.
  - Through `main.js` as a subprocess (a few tests only, refusals that come before the prerequisites, so no browser is probed): `verify extra` is a usage error, exit 2; a dirty tree exits 2 with the same message.
- [X] T061 [P] [US4] Write `tools/local-verify/test/signoff.test.ts`, covering 001-requirement-traceability-FR-033, 001-requirement-traceability-FR-034 and 001-requirement-traceability-FR-036. Call `signoff({ root, env, exec })` from `tools/local-verify/src/signoff.ts` on sample repositories with a local bare `origin` and the fake `gh` and `npm` (T053). Produce a passing result by running T060's `verify` with passing fakes, or by writing a result file through `result.ts`.
  - FR-033: after a passing run, the fake `gh` log holds exactly one call: `api --method POST repos/alex-profir/CV/statuses/<sha> -f state=success -f context=local-verify -f description=<d>`, where `<d>` is `<passed> tests in <files> files passed; site check passed; Node <version>; <os>`, with no `target_url`. stdout is `signed off <sha> on alex-profir/CV: local-verify success: <d>`, exit 0. `describeSignOff` (from `result.ts`) with the longest plausible values (six-digit counts, `Node 26.999.999`, a 100-character OS string) returns at most 140 characters, shortening only the OS part. A failed result is refused with `sign-off refused: the last local full run on <sha> failed (<checks>)`, exit 1, and the `gh` log is empty.
  - FR-034: with `CI=true`, and separately `GITHUB_ACTIONS=true`, signing off refuses with `sign-off refused: it runs only on the owner's machine, never in CI` before reading git or the result (assert via the `exec` seam's call list), and `gh` isn't called. After a passing run, a new commit, an amended commit (`commit --amend`) and a merge commit each have no result: signing off refuses with `sign-off refused: no local full run on <new sha>: run npm run verify`. A result file whose `sha` isn't HEAD, or whose `version` isn't `1`, counts as none.
  - FR-036: signing off a passing run starts no check (the fake `npm` log is empty). A commit not yet on `origin` prints `pushing <branch> to origin first`, then is pushed without force, and the fake `gh` logged the bare repository's branch head equal to `<sha>` when it was called. An unreachable `origin` prints `can't reach origin, nothing was recorded: <git's message>`, exit 1, `gh` log empty. A rejected push (the bare repository has a commit the local branch lacks) prints `could not push <branch>, nothing was recorded: …`, exit 1, `gh` log empty. A failing fake `gh` gives `could not record the sign-off: <gh's message>`, exit 1. With `PATH` set to a `bin/` holding only `git`, `signing off needs the GitHub CLI: install it from https://cli.github.com and run gh auth login`, exit 1.
  - The other refusals of the contract, titled with 001-requirement-traceability-FR-034: a detached HEAD gives `sign-off refused: check out the pull request's branch first`; an `origin` on another host gives `sign-off refused: origin is not a github.com repository: <url>`; both `https://github.com/<o>/<r>(.git)` and `git@github.com:<o>/<r>(.git)` forms parse.
  - Through `main.js` as a subprocess: `signoff extra` is a usage error, exit 2; `CI=true` refuses with exit 1.
- [X] T062 [US4] Red check, after T054 to T061: run `npx vitest run` on the new and edited test files. Each fails for the expected reason (missing `tools/local-verify/src/` modules, the config without projects, `ci.yml` and the ruleset not yet changed), not because of a helper defect. The 002, 003 and 004 repo-settings tests fail only on the lists they compare. Note any surprise here.
  - **Recorded 2026-10-29**: 8 files, 56 tests: 17 failed and 39 passed, each failure for the expected reason. `verify.test.ts` and `signoff.test.ts` fail to load (`Cannot find module '../src/checks.ts'`, `'../src/git.ts'`). `test-sets.test.ts` and `files.test.ts` fail on the config without projects and the missing `test:fast`. 001's repo-settings test fails on the `test` job's steps, the ruleset list, the run commands, `npm test`, `local-verify` and `timeout-minutes`. 002's, 003's and 004's fail only on the lists they compare (004's also on the `test` job's steps). No helper defect. The import rule's sample-project tests already pass, because they exercise only the T052 helper. Surprise: none.

### Implementation for User Story 4

- [X] T063 [US4] Rewrite `vitest.config.ts` as two inline projects (research R14, data-model.md TestSet; supersedes that part of T006). Keep the root `plugins` (`specListPlugin()`) and `oxc` options, which both projects inherit, and the comment that no `tags` are declared. Set `test.projects` to two `{ extends: true, test: { … } }` entries:
  - `name: 'fast'`, `include: FAST_TEST_GLOBS`, `exclude: TEST_EXCLUDE_GLOBS`, no `globalSetup`;
  - `name: 'slow'`, `include: TEST_INCLUDE_GLOBS`, `exclude: [...TEST_EXCLUDE_GLOBS, ...FAST_TEST_GLOBS]`, `globalSetup: ['packages/web/test/helpers/site.ts']`.

  The root `test` sets no `include`, `exclude` or `globalSetup`. Confirm with `npx vitest list --filesOnly --json` that the two counts add up to every test file (quickstart scenario 8), and that `npx vitest run --project fast` builds no site.
  - **Recorded 2026-10-29**: the listing has 155 files, `fast` 67 and `slow` 88, equal to `listFiles` (152 before the amendment, plus its 3 new test files). `npm run test:fast`: 67 files, 839 tests passed in 14 s, no global setup.
- [X] T064 [US4] Add three scripts to `package.json`, leaving every other script and `devDependencies` unchanged (contracts/local-verify.md Scripts): `"test:fast": "vitest run --project fast"`, `"verify": "node tools/local-verify/src/main.js verify"`, `"signoff": "node tools/local-verify/src/main.js signoff"`. `test` stays `vitest run`. Run `npm install --package-lock-only` only if npm insists, and confirm `package-lock.json` is unchanged (no new package).
  - **Recorded 2026-10-29**: npm didn't insist; `package-lock.json` is unchanged.
- [X] T065 [P] [US4] Implement `tools/local-verify/src/result.ts` (research R17, data-model.md LocalRunResult and SignOff):
  - `resultDir(root, exec)`: `<git rev-parse --git-common-dir>/local-verify`, made absolute against `root`. `resultPaths(dir, sha)`: `<sha>.json`, `<sha>.log`, `<sha>.vitest.json`.
  - The `LocalRunResult` type with exactly data-model.md's fields: `version: 1`; `sha`; `branch: string | null`; `startedAt`, `finishedAt` (ISO 8601); `clean: { atStart: true; atEnd: boolean; changed: string[] }`; `checks: Check[]` in run order, each `{ name: 'typecheck' | 'traceability' | 'content' | 'tokens' | 'test' | 'site'; command: string; status: 'pass' | 'fail'; exitCode: number | null; durationMs: number; detail: string | null }`; `tests: { files; expectedFiles; passed; failed; skipped }` (zeros when `test` couldn't run); `siteCheck: 'pass' | 'fail'`; `node`; `os`; `result: 'pass' | 'fail'`, `pass` exactly when every check passed and `clean.atEnd` is true.
  - `writeResult` (replaces any earlier file) and `readPassingResult(dir, sha)`, which returns the result only when the file parses, `version` is `1`, `sha` equals the given SHA; otherwise a reason (`none` or `failed` with the failing check names).
  - `describeSignOff(result)`: `<passed> tests in <files> files passed; site check passed; Node <node>; <os>`, at most 140 characters, shortening only the OS part (cut and end with `…`) when needed.
- [X] T066 [P] [US4] Implement `tools/local-verify/src/git.ts`: small functions over the `exec` seam (`(command, args, { cwd, env }) => { status, stdout, stderr }`, default `spawnSync` with `encoding: 'utf8'`), each returning data or a typed failure, never throwing on a non-zero exit: `head` (`rev-parse HEAD`, null outside a work tree), `branch` (`symbolic-ref --short -q HEAD`, null when detached), `porcelain` (`status --porcelain=v1 -z --untracked-files=all`, parsed into `{ xy, path }[]`, renames giving the new path), `trackedFiles` (`ls-files -z`), `commonDir`, `originUrl` (`remote get-url origin`), `parseGitHubRepo(url)` (only `https://github.com/<owner>/<repo>(.git)` and `git@github.com:<owner>/<repo>(.git)`), `remoteHead(branch)` (`ls-remote origin refs/heads/<branch>`, distinguishing failure from "no such branch"), and `push(branch)` (`push origin HEAD:refs/heads/<branch>`, never `--force`).
- [X] T067 [P] [US4] Implement `tools/local-verify/src/checks.ts`: the ordered `CHECKS` table of contracts/local-verify.md as data (`name`, `command`, `args`), with `test`'s args built by `testArgs(vitestJsonPath)`: `['test', '--', '--reporter=default', '--reporter=json', `--outputFile.json=${path}`]`, and `site` as `['run', '--silent', 'site-check']`. Comment that these are the pull request's `run:` commands with `test:fast` replaced by `npm test` (FR-031, FR-032), that T060 checks them against `ci.yml`, and that the arrays must stay out of process-call argument positions (Rules above).
- [X] T068 [US4] Implement `verify({ root, env, exec, prerequisites, runCommand })` in `tools/local-verify/src/verify.ts`, after T065 to T067, following research R16 and contracts/local-verify.md step by step. It returns the exit code and writes to stdout/stderr; it never calls `process.exit()`.
  1. HEAD via `git.ts`, or `local full run: not a git work tree`, exit 2.
  2. The clean-tree refusal, naming every path, exit 2, before any probe.
  3. Prerequisites, all listed together, exit 2, nothing run: Node major against `.nvmrc`; every `packages` entry of `package-lock.json` (other than the root `""`) with the same `version` in `node_modules/.package-lock.json`; `prerequisites.hasChromium()` (supplied by `main.js`, see Rules above). The Node and lockfile probes may default here.
  4. Run every check in order, even after a failure, printing `== <name>: <command>` before each and streaming its stdout and stderr to the terminal and to `<sha>.log` as it runs. Implementation note: `spawnSync` can't stream, so run checks through a `runCommand` seam whose default is an async `spawn` that writes each chunk to both; the `exec` seam (git, probes) stays `spawnSync` as the plan says. Record the deviation in research R20's "Function seams" bullet in the same commit.
  - **Recorded 2026-10-29**: the deviations are in R20's "Function seams" bullet, "As built": the `runCommand` seam, plus `stdout`/`stderr` writers; the Chromium probe loaded lazily by `main.js`; `origin` read with `git config --get remote.origin.url`, because `git remote get-url` expands `insteadOf`; optional lockfile entries for other platforms skipped by the dependencies probe (71 such entries here, so a strict comparison always refuses); and the two messages the contract doesn't list.
  5. After `test`, read `<sha>.vitest.json`: fail `test` with `ran <n> of <m> test files` unless its files equal `listFiles(root).testFiles` (imported from `tools/traceability/src/files.ts`) and `success` is true; take `tests` counts from it (SC-010).
  6. After the last check, fail the run when HEAD moved or `porcelain` isn't empty, naming the paths (`clean.atEnd: false`, `changed`).
  7. Write the result (T065) and print the summary of contracts/local-verify.md (each check, status, duration in seconds, and for `test` `<n> tests in <f> files passed`), then the `PASS:` or `FAIL:` line with the full SHA. Exit 0 or 1.
- [X] T069 [US4] Implement `signoff({ root, env, exec })` in `tools/local-verify/src/signoff.ts`, after T065 and T066, following research R18's steps in order, each refusal recording nothing and exiting 1 with contracts/local-verify.md's message: `CI`/`GITHUB_ACTIONS` set (checked before anything else); detached HEAD; no passing result for HEAD (none, or failed naming the checks), never running a test (FR-036); `gh --version` fails; `origin` not a github.com URL; `ls-remote` fails (`can't reach origin, nothing was recorded: …`); remote head not `<sha>`: print `pushing <branch> to origin first` to stdout and push, reporting a failure as `could not push <branch>, nothing was recorded: …`; then `gh api --method POST repos/<owner>/<repo>/statuses/<sha> -f state=success -f context=local-verify -f description=<describeSignOff(result)>`, reporting a failure as `could not record the sign-off: <gh's stderr>`; on success print `signed off <sha> on <owner>/<repo>: local-verify success: <description>`, exit 0.
- [X] T070 [US4] Create `tools/local-verify/src/main.js`, plain JavaScript like `tools/traceability/src/main.js`: reuse `nodeVersionProblem` from `tools/traceability/src/node-version.js` (exit 2 with its message on an old Node), then read `process.argv`: exactly one subcommand, `verify` or `signoff`, else `usage: npm run verify | npm run signoff (takes no arguments)` on stderr, exit 2. For `verify`, import `hasChromium` from `../../site-check/src/browser.ts` here (only here) and pass it as `prerequisites.hasChromium`; then `await import('./verify.ts')` or `./signoff.ts` and set `process.exitCode` from the result. Catch internal errors: message on stderr, exit 2. Never call `process.exit()`. Check that `tsconfig.json`'s `include` already covers `tools/local-verify/**/*.ts` (it does: `tools/**/*.ts`).
  - **Recorded 2026-10-29**: `main.js` reuses `REQUIRED_NODE_MAJOR` with a message of its own, as `tools/site-check/src/main.js` does, rather than `nodeVersionProblem`, whose message names blocking network access. `hasChromium` is imported by a probe that loads `browser.ts` only when it runs (R20, As built).
- [X] T071 [P] [US4] Change `.github/workflows/ci.yml` (contracts/ci.md amended, research R15; supersedes that part of T026):
  - The `test` job's steps become checkout, setup-node (`.nvmrc`, `cache: npm`), `npm ci`, `npm run typecheck`, `npm run test:fast`. Remove its `actions/cache` (Playwright) step and its `npx playwright install --with-deps chromium` step.
  - Add `timeout-minutes: 6` to every job (`traceability`, `test`, `content`, `tokens`, `site`), right after `runs-on:` (SC-008). **Note for the owner**: the limit makes a slow runner fail the job rather than run slow, which is the point of SC-008. The owner may loosen it; if so, that is an explicit decision recorded in this file (T081) and in plan.md's Open points, made in one commit that also updates contracts/ci.md and T056's SC-008 assertion, and ideally the job is made faster or SC-008 amended instead (plan.md, Open points). Never raise it quietly.
  - The `site` job's steps are unchanged. `permissions: contents: read` stays the only permission. Job ids and names are unchanged, so the required checks keep their names. Keep the layout rules (two-space indentation, one command per `run:` line, no `if:`, matrix or `continue-on-error`, SHA-pinned actions).
- [X] T072 [P] [US4] Add `{ "context": "local-verify" }` as the last entry of `required_status_checks` in `.github/rulesets/main.json`, with **no `integration_id`** (research R19, contracts/ci.md Ruleset). Keep everything else byte for byte: the other five checks with `integration_id: 15368`, `strict_required_status_checks_policy: true`, `do_not_enforce_on_create: false`, empty `bypass_actors`, squash only. **Open point, recorded here**: GitHub may read the missing `integration_id` back as absent or as `null`. The owner's first application (T083) settles which, and the drift check of quickstart scenario 7 already drops `null` values before comparing, so it must accept either. Don't add `"integration_id": null` to the committed file.
- [X] T073 [US4] Checkpoint.
  - `npm run typecheck`, `npm run test:fast` and `npm test` pass. `npm run test:fast` passes with Chromium unavailable (e.g. `PLAYWRIGHT_BROWSERS_PATH` pointing at an empty directory) and builds no site.
  - `npm run traceability` exits 0. Its passing line counts every active requirement of the approved specs (001 now has 37), and FR-030 to FR-037 are no longer uncovered.
  - Quickstart scenario 9 by hand: `echo probe > probe.txt && npm run verify` refuses with exit 2 naming `?? probe.txt`; remove it.
  - Commit the work in logical groups (`test(001):`, `feat(001):`, `ci(001):`), no AI attribution.
  - **Recorded 2026-10-29** (Darwin 25.6.0 arm64, Node 26.12.1): `npm run typecheck` passes. `npm run test:fast` with `PLAYWRIGHT_BROWSERS_PATH` set to an empty directory passes: 67 files, 839 tests in 14 s, no site build. `npm run traceability` exits 0: `PASS: all 325 active requirements in 6 approved specs are covered.` (001 has 37). The full set ran through `npm run verify` on `afa4542` (the `test` check is `npm test`): 155 files, 1538 tests passed in 519 s. Scenario 9: `echo probe > probe.txt && npm run verify` refused with exit 2, naming `  ?? probe.txt`, and `npm run verify extra` gave the usage line, exit 2. Commits `6220805` (test), `835dfcb` (feat), `afa4542` (ci).

**Checkpoint**: User Story 4 is complete in the repository. Its live half (the new workflow on a
real pull request, the ruleset, the first sign-off) is Phase 11.

---

## Phase 10: Polish & Constitution Verification (amendment)

**Purpose**: the cross-cutting checks for the amendment. As in Phase 6, Principles II, IV, V,
VII, VIII and IX are N/A (plan.md Constitution Check): no UI, no CV data or tokens, no shells or
apps, nothing visitor-facing, no visual assets. So there is no task for screen readers, forced
colors or comparing pages with design exports, and none is deferred under the interim provision.

- [X] T074 [P] Verify Constitution III for the amendment: each of 001-requirement-traceability-FR-030 to -FR-037 is in the title of at least one counting test (see Requirement Coverage below), `npm run traceability` passes, and the plan's Requirement Traceability rows for FR-030 to FR-037 and SC-008 to SC-010 match the tests as built. Fix the tests, not the table, when they differ.
  - **Recorded 2026-10-29**: FR-030 is in the titles of `test-sets.test.ts` (two groups) and `files.test.ts`; FR-031, FR-034, FR-035 and SC-008 in `tools/traceability/test/repo-settings.test.ts`; FR-032, FR-033 and FR-037 in `verify.test.ts`; FR-033, FR-034 and FR-036 in `signoff.test.ts`. `npm run traceability` passes (325 of 325 covered). The plan's rows for FR-030 to FR-037 and SC-008 to SC-010 describe the tests as built; no change was needed.
- [X] T075 [P] Audit Constitution X for the amendment: `git diff main -- package-lock.json` is empty and `package.json`'s `devDependencies` and `dependencies` are unchanged; no agent skill was added; the new abstractions are exactly those in plan.md's Dependencies table (two Vitest projects, `FAST_TEST_GLOBS`, `imports.ts`, `tools/local-verify/`, the `exec`/`prerequisites` seams plus T068's `runCommand` seam, the fake-`bin` helper); `gh` is used only by `signoff`, on the owner's machine.
  - **Recorded 2026-10-29**: `git diff origin/main -- package-lock.json` is empty; `package.json` changes only by the three scripts; no file under `.claude/` changed. The new abstractions are the plan's: the two Vitest projects, `FAST_TEST_GLOBS`, `imports.ts`, `tools/local-verify/` (`main.js`, `verify.ts`, `signoff.ts`, `result.ts`, `git.ts`, `checks.ts`), the `exec`/`prerequisites` seams plus `runCommand` (and the `stdout`/`stderr` writers, R20 As built) and the fake-`bin` helper `repo.ts`. `gh` appears only in `signoff.ts`.
- [X] T076 [P] Verify FR-037 and the offline rules on the real repository: after `npm run verify`, the result files are under `$(git rev-parse --git-common-dir)/local-verify/`, `git status --porcelain` is empty, `.gitignore` is unchanged, and no file of the run is tracked. `npm run verify` makes no network request of its own (spec Offline Behavior): read `verify.ts`, `checks.ts` and `git.ts` and confirm no `fetch`, `http`, `ls-remote` or `push` is reachable from `verify`.
  - **Recorded 2026-10-29**: after `npm run verify` on `afa4542`, `/Volumes/Dock/Projects/HKP/CV/.git/local-verify/` (the common directory of this worktree's clone) holds `<sha>.json`, `<sha>.log` and `<sha>.vitest.json`. `git status --porcelain` is empty, `.gitignore` is unchanged and no run file is tracked. `verify.ts` uses only `head`, `branch`, `porcelain` and `commonDir` from `git.ts`; `remoteHead` (`ls-remote`) and `push` are called only by `signoff.ts`, and none of `verify.ts`, `checks.ts`, `result.ts` or `git.ts` uses `fetch` or `node:http(s)`.
- [X] T077 Bring `specs/001-requirement-traceability/quickstart.md` in line with the built commands (scenarios 8 to 13 and Prerequisites): every expected message and summary line is the one the tools print, word for word. contracts/local-verify.md is authoritative; research R16 step 7's summary wording (`PASS: local full run on <sha>: …`) differs from the contract's (`PASS: every check passed on <sha>. Sign off with: npm run signoff`), so correct R16 to the contract's wording in the same commit. If the T068 seam deviation was recorded, check R20 says so. `docs(001):` commit.
  - **Recorded 2026-10-29**: quickstart scenarios 8 to 13 now quote the tools' lines in full (the refusal's last line, the `PASS:`/`FAIL:` lines, the sign-off refusals and the `signed off` line). Scenario 8 gives the counts (152 before, 155 after: `fast` 67, `slow` 88). Scenario 9's Node case is corrected: on Node 24 the entry point stops first with `local full run needs Node 26 or later (see .nvmrc), but this is Node 24.21.0` (checked on Node 24.21.0), and the `.nvmrc` message applies to a different major of 26 or later. R16 step 7 now uses the contract's wording. R20 records the seam deviation (As built).
- [X] T078 Run quickstart.md scenarios 8, 9 and 10 locally, and scenario 12's CI half (`CI=true npm run signoff` refuses and records nothing), and record each result and any deviation here. Scenario 10's failing half breaks one browser test on a scratch commit; drop that commit afterwards and make sure its result file doesn't matter (it's keyed by the dropped SHA). Scenario 12's network-off half is the owner's (T086).
  - **Recorded 2026-10-29** (Darwin 25.6.0 arm64, Node 26.12.1):
    - Scenario 8: 155 files, `fast` 67 and `slow` 88. `npm run test:fast` passes with no Chromium (`PLAYWRIGHT_BROWSERS_PATH` empty): 67 files, 839 tests, 14 s, no site build.
    - Scenario 9: `?? probe.txt` refused, exit 2. On Node 24.21.0 the entry point stops with `local full run needs Node 26 or later (see .nvmrc), but this is Node 24.21.0`, exit 2.
    - Scenario 10, passing half, on `afa4542`: six `pass` lines (`test` 519 s, `1538 tests in 155 files passed`; `site` 131 s), `PASS: every check passed on afa4542d322b8a21dcf269fe3a67022037f3f8ae. Sign off with: npm run signoff`, exit 0. The three result files were in the common directory's `local-verify/`, and `git status --porcelain` was empty.
    - Scenario 10, failing half, on scratch commit `e4895f8` (Terminal `output.test.ts` expecting `'scratch-break'`). The first attempt doesn't count: another session's full Vitest run in the main checkout was competing for the machine, and an outside SIGTERM stopped `npm test` after 347 s (exit 143). No report was written, so `test` failed with `ran 0 of 155 test files`. The second attempt failed for the real reason: `FAIL: 1 check failed on e4895f8…: test. Nothing can be signed off for this commit.`, exit 1, with the detail `the test report shows a failure`. Four tests failed: the broken one and three timing-dependent ones under the concurrent load. One of those was this amendment's `a second run on the same commit replaces the result`, which hit Vitest's 5 s default, so every group of `verify.test.ts` and `signoff.test.ts` now has `{ timeout: 30_000 }`, written inline so the check still reads them (FR-012). The scratch commit was dropped; its result file is keyed by that unreachable SHA and doesn't matter.
    - **Not run here**: `npm run signoff` after the failing run (expected `sign-off refused: the last local full run on <sha> failed (test)`). This session's auto-mode permission classifier refused to run `npm run signoff` at all, as self-approval. The refusal is covered by `signoff.test.ts` (FR-033 group); the owner can see it live during T084 or T086.
    - Scenario 12, CI half: `CI=true npm run signoff` and `GITHUB_ACTIONS=true npm run signoff` each print `sign-off refused: it runs only on the owner's machine, never in CI`, exit 1, and record nothing.
- [X] T079 Final local run of every check, on the clean head commit, after T074 to T078, with Node 26: `npm run typecheck`, `npm run test:fast`, `npm test`, `npm run traceability`, `npm run content-check`, `npm run token-check` and `npm run site-check`. Each passes. Record here, for each, the exit code and its summary line (test counts and files for `test:fast` and `test`, the passing line for `traceability`, the site check's result), with the date, OS and Node version.
  - **Recorded 2026-10-29**, on clean head `f543809`, macOS (Darwin 25.6.0 arm64), Node 26.12.1:
    - `npm run typecheck`: exit 0.
    - `npm run test:fast`: exit 0, `Test Files 67 passed (67)`, `Tests 839 passed (839)`, 14 s.
    - `npm test`: exit 0, `Test Files 155 passed (155)`, `Tests 1538 passed (1538)`, 518 s. This is the second run. The first (exit 1, 596 s) failed one 006 browser test, `packages/web/test/terminal/controls.test.ts` "help’s controls, clear and exit among them", on a Playwright click timeout ("element is outside of the viewport") while another session ran browser tests in the main checkout. That file passed alone twice, and then the whole set passed. It's a load flake, unrelated to this amendment, which changes no UI.
    - `npm run traceability`: exit 0, `PASS: all 325 active requirements in 6 approved specs are covered.`
    - `npm run content-check`: exit 0, `PASS: both documents are valid and no key facts are hardcoded.`
    - `npm run token-check`: exit 0, `PASS: both token sources are valid and no literal design values were found.`
    - `npm run site-check`: exit 0, `Site check: PASSED`, `No problems. 13 of 13 parts passed.`
- [X] T080 Push `001-local-verify` and open the amendment's pull request to `main` (Constitution XI), after T079:
  - The title and every commit use Conventional Commits; per CLAUDE.md none carries AI or Claude attribution.
  - The description names the amendment by its date, "the amendment of 2026-10-29 to 001-requirement-traceability", links `specs/001-requirement-traceability/spec.md` and `specs/001-requirement-traceability/tasks.md`, summarizes T074 to T079's results, and lists the owner actions of Phase 11 in order. It notes that 002's, 003's and 004's repo-settings tests change only the lists they compare (research R20), and that no manual check is deferred (No UI).
  - It is the only pull request for this amendment.
  - **Recorded 2026-10-29**: pushed and opened as https://github.com/alex-profir/CV/pull/28, `feat(001): run the fast checks on pull requests and sign off the full run locally`, with no AI attribution.

---

## Phase 11: Rollout (owner actions, in order)

**Purpose**: the live half of the amendment (research R19, quickstart scenario 13). Each task
needs the one before it. They change GitHub state, so the owner runs them or explicitly
approves them; merging is the owner's alone.

**Recording results**: note each result in the pull request as it happens. Ticking these tasks
and copying the results into this file is a new commit: before the merge it needs its own
`npm run verify` and `npm run signoff` (FR-034), so prefer recording them after the merge, in a
follow-up `docs(001):` pull request (itself signed off).

- [ ] T081 Owner action: the amendment's pull request (T080) runs the new workflow and is green. Its five checks pass, `test` runs the typecheck and the fast set with no browser install, and each job finishes within 6 minutes (quickstart scenario 13 step 1, SC-008): record each job's duration from `gh run view <run-id> --json jobs`. If a job hits the 6-minute limit on a slow runner, it fails rather than runs slow, as designed; the owner may loosen `timeout-minutes`, as the explicit, recorded decision T071 describes, or make the job faster first.
  - BLOCKED: owner action. It changes GitHub state (the ruleset, the sign-off, the merge) or needs the owner's own `gh` login, so the owner runs it after T080's pull request is open.
- [ ] T082 Owner action: on a clean checkout of the pull request's head commit, run `npm ci`, `npx playwright install chromium` and `npm run verify` (quickstart scenario 13 step 2, FR-032, FR-033, SC-010). Expected: six `pass` lines and `PASS: every check passed on <sha>`. Record the summary (test count, files, durations).
  - BLOCKED: owner action. It changes GitHub state (the ruleset, the sign-off, the merge) or needs the owner's own `gh` login, so the owner runs it after T080's pull request is open.
- [ ] T083 Owner action: apply the new ruleset with `PUT` (quickstart scenario 13 step 3): `id=$(gh api /repos/alex-profir/CV/rulesets --jq '.[] | select(.name=="main") | .id')`, then `gh api --method PUT /repos/alex-profir/CV/rulesets/$id --input .github/rulesets/main.json`. Then run scenario 7's read-back: `current_user_can_bypass` is `never` and the drift check prints `no drift`.
  - **Settle the open point**: record whether GitHub read `local-verify`'s `integration_id` back as absent or as `null`. Either way the drift filter accepts it. If it comes back as anything else (for example a number), stop: the ruleset may not accept the owner's status, so decide with the owner, update contracts/ci.md, research R19 and T056's assertion, and re-apply before signing off.
  - Expected on the pull request: `local-verify` is listed as expected and merging is blocked, with no bypass (SC-009, live). Applying it before the merge is the intent: it also blocks other open pull requests until they're signed off (R19).
  - BLOCKED: owner action. It changes GitHub state (the ruleset, the sign-off, the merge) or needs the owner's own `gh` login, so the owner runs it after T080's pull request is open.
- [ ] T084 Owner action: run the full suite locally on the PR's clean head commit and sign it off, so the required `local-verify` status passes (Constitution, Merge requirements): `npm run signoff` on the commit T082 verified (FR-033, FR-034, FR-036). Expected: `signed off <sha> on alex-profir/CV: local-verify success: <description>`, exit 0, and no test runs. Check with `gh api repos/alex-profir/CV/commits/<sha>/statuses` that the status is `success`, at most 140 characters, and created by the owner's account, not `github-actions`. If any commit lands on the branch after T082, a merge of `main` included, run T082 and this task again on the new head.
  - BLOCKED: owner action. It changes GitHub state (the ruleset, the sign-off, the merge) or needs the owner's own `gh` login, so the owner runs it after T080's pull request is open.
- [ ] T085 Owner action: merge the pull request (squash) once every check of FR-031 and `local-verify` pass on its head commit (FR-035). It is the first pull request merged with a sign-off. Merging is the owner's; nobody merges it on their behalf.
  - BLOCKED: owner action. It changes GitHub state (the ruleset, the sign-off, the merge) or needs the owner's own `gh` login, so the owner runs it after T080's pull request is open.
- [ ] T086 Owner action, after T085, on `main`:
  - Run scenario 7's drift check against `main`'s file (R19 step 5): `never`, then `no drift`.
  - Demonstrate quickstart scenarios 11 and 12 live (US4 scenarios 4 and 6, SC-009): on a scratch branch from `main`, open a pull request, verify and sign off its head, then push one more commit and confirm `local-verify` is expected again and merging is blocked until that commit is signed off; sign off with the network off and confirm `can't reach origin, nothing was recorded`, exit 1, and no status once the network is back. Close the pull request unmerged and delete the branch.
  - Record T081 to T086's results in this file and tick them, in the follow-up `docs(001):` pull request described above.
  - BLOCKED: owner action. It changes GitHub state (the ruleset, the sign-off, the merge) or needs the owner's own `gh` login, so the owner runs it after T080's pull request is open.

---

## Requirement Coverage (amendment of 2026-10-29)

Every requirement and success criterion the amendment adds, with the tasks that test and build
it. Test tasks name the full IDs in their test titles (Constitution III).

| Requirement | Test tasks | Implementation tasks | Live check |
|-------------|------------|----------------------|------------|
| 001-requirement-traceability-FR-030 | T054 (`test-sets.test.ts`), T055 (`files.test.ts`) | T051, T052, T063, T064 | T078 (scenario 8) |
| 001-requirement-traceability-FR-031 | T056 (`repo-settings.test.ts`); T057, T058, T059 keep 002 FR-033, 003 FR-039 and 004 FR-048 true | T064, T071 | T081 |
| 001-requirement-traceability-FR-032 | T060 (`verify.test.ts`) | T066, T067, T068, T070 | T073, T078 (scenario 9), T082 |
| 001-requirement-traceability-FR-033 | T060, T061 (`signoff.test.ts`) | T065, T068, T069 | T078 (scenario 10), T082, T084 |
| 001-requirement-traceability-FR-034 | T061, T056 | T069, T071 | T078 (scenario 12, CI half), T084, T086 |
| 001-requirement-traceability-FR-035 | T056 | T072 | T083, T085, T086 |
| 001-requirement-traceability-FR-036 | T061 | T066, T069 | T084, T086 (scenario 12, offline half) |
| 001-requirement-traceability-FR-037 | T060 | T065, T068 | T076, T078 (scenario 10) |
| SC-008 | T056 (`timeout-minutes: 6` on every job, no browser in `test`) | T071 | T081 (measured durations) |
| SC-009 | T056 (FR-035), T061 (FR-034) | T069, T072 | T083, T085, T086 |
| SC-010 | T054 (full set is every file; `test` has no filter), T060 (`ran <n> of <m> test files`) | T063, T068 | T082 |

Every FR from FR-030 to FR-037 has at least one test task. Nothing in the amendment is left
unmapped. FR-001 to FR-029 keep the coverage of Phases 3 to 7; T055 and T056 edit FR-014's and
FR-025's tests without dropping what they cover.

---

## Dependencies & Execution Order (amendment)

### Phase Dependencies

- **Phase 8 (Foundational)**: depends on the shipped feature (Phases 1 to 7). T050 first; T051,
  T052 and T053 then in parallel. It blocks Phase 9.
- **Phase 9 (US4)**: tests T054 to T061 in parallel (T054 and T055 need T051 and T052; T060 and
  T061 need T053), then T062. Implementation: T063 needs T051; T064 any time; T065, T066 and
  T067 in parallel; T068 after T065 to T067; T069 after T065 and T066; T070 after T068 and T069;
  T071 and T072 in parallel with the tool work; T073 last.
- **Phase 10 (Polish)**: after T073. T074, T075 and T076 in parallel; T077 then T078; T079 after
  T074 to T078; T080 after T079.
- **Phase 11 (Rollout)**: strictly in order, T081 → T082 → T083 → T084 → T085 → T086. T081 needs
  the open pull request from T080. A new commit at any point sends the owner back to T082.

### Parallel Opportunities

- Phase 8: T051, T052, T053.
- Phase 9 tests: T054 to T061, eight files.
- Phase 9 implementation: T065, T066, T067 together, with T063, T064, T071 and T072 alongside.
- Phase 10: T074, T075, T076.

## Parallel Example: User Story 4

```bash
# Tests first, together:
Task: "test-sets.test.ts, covers 001-requirement-traceability-FR-030, in tools/traceability/test/test-sets.test.ts"
Task: "files.test.ts config assertion, covers 001-requirement-traceability-FR-014 and FR-030"
Task: "repo-settings.test.ts, covers 001-requirement-traceability-FR-025, FR-031, FR-034, FR-035 and SC-008"
Task: "repo-settings.test.ts lists for 002, 003 and 004, in tools/{content,token,site}-check/test/"
Task: "verify.test.ts, covers 001-requirement-traceability-FR-032, FR-033, FR-037, in tools/local-verify/test/"
Task: "signoff.test.ts, covers 001-requirement-traceability-FR-033, FR-034, FR-036, in tools/local-verify/test/"

# Then the independent modules together:
Task: "result.ts in tools/local-verify/src/"
Task: "git.ts in tools/local-verify/src/"
Task: "checks.ts in tools/local-verify/src/"
Task: "ci.yml test job and timeouts; ruleset local-verify entry"
```

## Implementation Strategy (amendment)

1. Phase 8: baseline (eight uncovered requirements, as expected), the fast-set constant and the
   helpers.
2. Phase 9: tests first and red (T062), then the config and scripts, the tool, the workflow and
   the ruleset, until T073 is green and the check passes again.
3. Phase 10: audits, quickstart alignment, the full local run of every check, and the pull
   request.
4. Phase 11: the owner's rollout, in order. The pull request is the first merged with a sign-off.

The amendment ships in this one pull request (Constitution XI). The ruleset change is applied
during it, not after, so it can't merge without the sign-off it introduces (research R19).

---

## Phase 12: Convergence

**Purpose**: Gaps found by `/speckit-converge` on 2026-10-29 in the amendment. The owner tasks
T081 to T086 still stand and aren't repeated here. PR #28 merged without these tasks, so they ship
in a follow-up pull request of their own, signed off locally like any other.

- [X] T087 Remove the earlier `<sha>.json` before the first check of a local full run, so an interrupted or still-running run can't leave an earlier pass to sign off, per FR-033 (partial)
  - Today `verify()` in `tools/local-verify/src/verify.ts` empties `<sha>.log` and removes `<sha>.vitest.json` before the checks, but keeps `<sha>.json` until `writeResult` runs after the last check. If a second run on a commit that already passed shows a failing check and is then stopped (Ctrl-C, an outside SIGTERM), or `npm run signoff` is run while it's still going, `readPassingResult` still finds the old `pass`. data-model.md (States of a commit) says another `verify` on the same commit replaces its result, "so a later failure takes back a pass that wasn't signed off yet", and contracts/local-verify.md says a new run replaces all three files.
  - Remove `<sha>.json` with `fs.rmSync(…, { force: true })` beside the existing `<sha>.vitest.json` removal, which runs after the clean-tree and prerequisite refusals (a refused run still writes and removes nothing, data-model.md Validation rules).
  - Add a test to the 001-requirement-traceability-FR-033 group in `tools/local-verify/test/verify.test.ts`. After a passing run, start a second `verify` whose `runCommand` seam checks, while the first check is running, that `readPassingResult(dir, sha)` returns `{ reason: 'none' }`. Keep the group's `{ timeout: 30_000 }`.
  - **Recorded 2026-10-29**: `verify()` removes `<sha>.json` beside `<sha>.vitest.json`. The new FR-033 test, "a second run on a commit that passed takes the earlier pass back before its first check", sees `{ reason: 'none' }` in the first check and a pass again after the run; without the removal it fails (it read the earlier pass).
- [X] T088 Make the entry point's Node-version refusal name the command that was run and say how to fix it, per FR-032 (partial)
  - Today `tools/local-verify/src/main.js` prints `local full run needs Node 26 or later (see .nvmrc), but this is Node <version>` on an old Node. It doesn't say how to fix it, which FR-032 asks for and every other prerequisite message does (`: run nvm use`, `: run npm ci`). It also says "local full run" when the command was `npm run signoff`.
  - Print `npm run <verify|signoff> needs Node 26 or later (see .nvmrc), but this is Node <version>: run nvm use`. Use the subcommand when it's `verify` or `signoff`, and `local full run` otherwise. Exit 2 as before.
  - Update quickstart.md scenario 9's Node case, and the T077 and T078 notes' quoted line if you quote it again, word for word. Add a test titled with 001-requirement-traceability-FR-032 in `tools/local-verify/test/verify.test.ts` that runs `main.js` as a subprocess under a stubbed version. For example, use `--import` with a data-URL module that sets `process.versions` through `Object.defineProperty`, or move the comparison and the message into a side-effect-free function, as T049 did, and test that. It must stay in the fast set and start no check.
  - **Recorded 2026-10-29**: the gate is `nodeVersionProblem(version, command)` in a new `tools/local-verify/src/node-version.js`, apart from `main.js`, because importing `main.js` from a fast test reaches `tools/site-check/src/browser.ts` through its dynamic import, which FR-030's import-graph test refuses. The new FR-032 test checks the three wordings and runs `main.js signoff` under `--import` with `process.versions.node` stubbed to 24.21.0: `npm run signoff needs Node 26 or later (see .nvmrc), but this is Node 24.21.0: run nvm use`, exit 2, no fake command started. quickstart.md scenario 9 and contracts/local-verify.md quote the new line; the T077 and T078 notes keep the line as it was then. Typecheck, traceability (325 requirements) and the fast set (67 files, 841 tests) pass; the full set wasn't run here, since only local-verify's code and its fast tests changed, and T082 runs it on the new head.

---

## Phase 13: Speed First (amendment of 2026-10-31)

**Purpose**: Constitution 2.0.0 and this spec's amendment of 2026-10-31. It ships in one pull request with the constitution, at the owner's request. T081 to T086's sign-off steps are superseded by FR-035 as amended.

- [X] T089 Stop a local run at the first failing check and its test check at the first failing test, per FR-040: `tools/local-verify/src/verify.ts`, `tools/local-verify/src/checks.ts`
- [X] T090 Leave the site check and its own tests out of a feature's run, per FR-032 and SC-010, and rename the commands: `npm run verify:feature` is that run, `npm run verify` is the quick run
- [X] T091 Add the quick run and the area rules, per FR-038: `tools/local-verify/src/quick.ts`, `tools/local-verify/src/affected.ts`
- [X] T092 Add `--failed` to both runs, per FR-039: `tools/local-verify/src/run-plan.ts`
- [X] T093 Drop `local-verify` and the up-to-date requirement from the committed ruleset, per FR-035: `.github/rulesets/main.json`, and its four `repo-settings.test.ts`
- [X] T094 Add the daily full run, per FR-041: `.github/workflows/full.yml`, on Linux, without `OWNER_MAC_TESTS` (`tools/traceability/src/files.ts`). Trials on 2026-10-31: Linux 37 minutes and 121 failures, macOS 62 minutes and 1,007 failures, the most from bash 3.2 and from a slow machine and no glass, so Linux it is
- [ ] T095 Owner action: apply `.github/rulesets/main.json` to the live ruleset, which already leaves `local-verify` out but still requires up-to-date branches
