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

- [ ] T001 Create the root toolchain files:
  - `package.json`: `"private": true`, `"type": "module"`, `"engines": { "node": ">=26" }`, and these scripts:
    - `"traceability": "node --permission --allow-fs-read=. --allow-addons tools/traceability/src/cli.ts"`
    - `"test": "vitest run"`
    - `"typecheck": "tsc --noEmit"`
  - `.nvmrc`, containing `26`.
  - `.gitignore`, containing `node_modules/`.

  Sources: research R1, R2 and R9, and contracts/cli.md Command.
- [ ] T002 Install the dev dependencies with Node 26 active (`nvm use`) and its bundled npm:
  1. `npm install --save-dev --save-exact oxc-parser` (latest release, exact pin, research R5).
  2. `npm install --save-dev vitest@5 typescript@7 @types/node@26`.
  3. Commit `package-lock.json`.

  `package.json` must end with exactly these four `devDependencies` and no `dependencies` (plan
  Dependencies table, Constitution X).
- [ ] T003 [P] Create `tsconfig.json`:
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

- [ ] T004 [P] Define the shared types in `tools/traceability/src/report.ts`. Use no enums. Rendering comes in T019. The types (data-model.md Location, Problem and Report):
  - `Location`: `{ file: string; line: number; column: number }`. `file` is relative to the root with `/` separators. Lines and columns count from 1.
  - `PROBLEM_TYPES`: an `as const` tuple in exactly this order: `uncovered`, `unknown-reference`, `removed-reference`, `malformed`, `duplicate-id`, `bad-status`, `no-requirements`, `unreadable-file`.
  - `ProblemType`: the tuple's element type.
  - `Problem`: `{ type: ProblemType; subject: string; location: Location; detail: string }`.
  - `Report`: `{ problems: Problem[]; approvedSpecs: number; activeRequirements: number; coveredRequirements: number; countsByType: Record<ProblemType, number>; result: 'pass' | 'fail' }`.
- [ ] T005 [P] Create the shared file-selection constants in `tools/traceability/src/files.ts` (research R6). The directory walk comes in T018.
  - `EXCLUDED_DIR_NAMES`: `node_modules`, `dist`, `build`, `out`, `coverage`, `__fixtures__`.
  - `isExcludedDir(name)`: true for those names and for any name that starts with `.`.
  - `TEST_FILE_PATTERN`: `/\.(test|spec)\.[cm]?[jt]sx?$/`.
  - `TEST_INCLUDE_GLOBS`: `['**/*.{test,spec}.?(c|m)[jt]s?(x)']`.
  - `TEST_EXCLUDE_GLOBS`: `**/<name>/**` for each excluded name, plus `**/.*/**`.
- [ ] T006 Create `vitest.config.ts` at the repository root. Use `defineConfig` from `vitest/config`. Set `test.include` to `TEST_INCLUDE_GLOBS` and `test.exclude` to `TEST_EXCLUDE_GLOBS`, both imported from `./tools/traceability/src/files.ts`. Declare no `tags`, because no tag may carry `skip` or `todo` (research R3).
- [ ] T007 [P] Create the test helper `tools/traceability/test/helpers/project.ts` (plan Dependencies table, research R13):
  - `REPO_ROOT`: the repository root, as a real path, computed from `import.meta.dirname`.
  - `CLI_PATH`: `<REPO_ROOT>/tools/traceability/src/cli.ts`.
  - `makeProject(files: Record<string, string>): string`. It creates a directory with `fs.mkdtempSync(path.join(os.tmpdir(), 'traceability-'))` and returns its `fs.realpathSync`. The real path matters because on macOS `/var` is a symlink to `/private/var`, and the permission grant must match. It writes every file, creating parent directories. A key ending in `/` creates an empty directory instead. It registers removal of the directory with Vitest's `onTestFinished`, so it's called inside tests only.
  - `runCli(cwd: string, args: string[] = []): { status: number | null; stdout: string; stderr: string }`. It calls `spawnSync(process.execPath, ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, '--allow-addons', CLI_PATH, ...args], { cwd, encoding: 'utf8' })`. These are the same grants as the `traceability` script: read and addons only, no network, no writes. The extra read grant on `REPO_ROOT` lets Node load `cli.ts` and `oxc-parser` when `cwd` is a temporary directory.
- [ ] T008 Verify the toolchain: `npm run typecheck` passes and `npx vitest run --passWithNoTests` exits 0 with the new config.

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

- [ ] T009 [P] [US1] Write `tools/traceability/test/specs.test.ts`. It covers 001-requirement-traceability-FR-001, 001-requirement-traceability-FR-002, 001-requirement-traceability-FR-003, 001-requirement-traceability-FR-004, 001-requirement-traceability-FR-005, 001-requirement-traceability-FR-006, 001-requirement-traceability-FR-007 and 001-requirement-traceability-FR-008. It tests `parseSpec(feature, file, text)`, `requirementsOf(spec)` and `specProblems(spec)` from `src/specs.ts`. For discovery, it uses `runCheck(root)` from `src/check.ts` on sample projects.
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
- [ ] T010 [P] [US1] Write `tools/traceability/test/references.test.ts`, covering 001-requirement-traceability-FR-009. `fullId('002-example', 'FR-003')` is `002-example-FR-003`. `parseFullId` splits a full ID into feature and ID, and returns null for anything else. The same FR number in two approved specs gives two distinct IDs: with `runCheck`, a test that references `002-example-FR-001` leaves `003-other-FR-001` reported uncovered.
- [ ] T011 [P] [US1] Write `tools/traceability/test/test-files.test.ts`. It covers 001-requirement-traceability-FR-010, 001-requirement-traceability-FR-011, 001-requirement-traceability-FR-012 and 001-requirement-traceability-FR-022. It tests `readTestFile(file, text)` and `coverageOf(nodes)` from `src/test-files.ts`. `coverageOf` returns `{ counting, skipped, unrecognized }`: the effective tokens of counting tests, of inactive tests (skipped, disabled or placeholder), and of tests inside unrecognized calls.
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
- [ ] T012 [P] [US1] Write `tools/traceability/test/files.test.ts`, covering 001-requirement-traceability-FR-014. It tests `listFiles(root)` from `src/files.ts` and the config:
  - Skipped at any depth: `node_modules`, `dist`, `build`, `out`, `coverage`, `__fixtures__` and every dot-directory. A root whose own name starts with `.` is still listed.
  - Symbolic links are not followed. Create them with `fs.symlinkSync` after `makeProject`.
  - Test files are selected by `TEST_FILE_PATTERN`. Yes: `a.test.ts`, `a.spec.tsx`, `a.test.mjs`, `a.test.cjs`, `a.spec.jsx`. No: `a.tests.ts`, `a.test.md`, `test.ts`.
  - Paths are relative, use `/`, and are sorted by code unit.
  - `vitest.config.ts`'s `test.include` and `test.exclude` deep-equal `TEST_INCLUDE_GLOBS` and `TEST_EXCLUDE_GLOBS`. `TEST_EXCLUDE_GLOBS` names every `EXCLUDED_DIR_NAMES` entry plus `**/.*/**`.
- [ ] T013 [P] [US1] Write `tools/traceability/test/check.test.ts`. It covers 001-requirement-traceability-FR-015, 001-requirement-traceability-FR-020, 001-requirement-traceability-FR-021 and 001-requirement-traceability-FR-029. It tests `runCheck(root)` and `runCli` on sample projects.
  - FR-015 (US1 scenario 1): the approved spec `002-example` defines FR-001 to FR-003, and tests reference only `002-example-FR-001` and `002-example-FR-002`. The problems are exactly one `uncovered` for `002-example-FR-003`, at its spec line and column 5, with the detail `no test references this requirement`.
  - FR-020: `result` is `fail` and `runCli` exits 1 when there are problems. With full coverage, `result` is `pass` and it exits 0 (US1 scenario 2).
  - FR-021: one run over a project with `uncovered`, `malformed`, `duplicate-id`, `bad-status`, `no-requirements` and `unreadable-file` problems reports all of them.
  - FR-029:
    - A test file with a syntax error produces `unreadable-file` at its first error's line and column. The subject is the quoted path and the detail starts with `cannot be parsed: `. A requirement referenced only by that file is reported uncovered.
    - A `spec.md` created as a directory (key `specs/003-x/spec.md/`) produces `unreadable-file` with the detail `cannot be read: EISDIR`. This works as root too, unlike `chmod`.
- [ ] T014 [P] [US1] Write `tools/traceability/test/report.test.ts`. It covers 001-requirement-traceability-FR-022, 001-requirement-traceability-FR-023 and 001-requirement-traceability-FR-024. It tests `buildReport` and `renderReport` from `src/report.ts`, and uses `runCheck` for whole runs.
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
- [ ] T015 [P] [US1] Write `tools/traceability/test/cli.test.ts`, covering 001-requirement-traceability-FR-026 and 001-requirement-traceability-FR-027.
  - FR-026: in `REPO_ROOT`, `npm run --silent traceability` (via `spawnSync`) and `runCli(REPO_ROOT)` give identical stdout and exit status.
  - FR-027:
    - `package.json`'s `traceability` script contains `--permission`, an `--allow-fs-read=` grant and `--allow-addons`.
    - The script contains none of `--allow-net`, `--allow-fs-write`, `--allow-child-process`, `--allow-worker` or `--allow-wasi`.
    - `runCli` on a sample project completes with the expected report under those grants.
    - Positive control: run `node --permission --allow-fs-read=<REPO_ROOT> --allow-addons -e "fetch('http://127.0.0.1:9/').then(() => console.log('connected'), (e) => console.log(e.code ?? e.cause?.code))"`. It must print `ERR_ACCESS_DENIED`. The loopback address means a broken guard never reaches the internet.
  - Add one more test, with no ID needed: any argument makes the CLI exit 2, with empty stdout and a usage message on stderr (contracts/cli.md Exit codes).

### Implementation for User Story 1

- [ ] T016 [P] [US1] Implement the full-ID grammar and token finding in `tools/traceability/src/ids.ts` (research R8, data-model Reference):
  - `fullId(feature, id)` returns `<feature>-<id>`.
  - `parseFullId(text)` returns `{ feature, id }` when the whole text matches `/^([a-z0-9]+(?:-[a-z0-9]+)*)-(FR-\d{3})$/`, and null otherwise.
  - `findTokens(text)` returns `{ text, index }[]`. It examines every case-insensitive `fr-` occurrence and takes the longest run of letters, digits, `-` and `_` around it. A run that contains `fr-` more than once is still one token. Tokens come in order of position.
- [ ] T017 [P] [US1] Implement the `oxc-parser` wrapper in `tools/traceability/src/source.ts` (research R5):
  - `parseSource(file, text)` calls `parseSync(file, text)`, with the language inferred from the extension.
    - If `errors` is not empty, it returns an `unreadable-file` problem. The location is the first error's first label `start`, or `1:1` when there is none. The subject is `"<file>"` and the detail is `cannot be parsed: <first error message>`. On a fatal error oxc returns an empty tree, and nothing from the file is used.
    - Otherwise it returns `{ program }`.
  - `createLocator(file, text)` returns `offset → Location`, with lines and columns from 1, computed from `\n` positions. Check whether node `start`/`end` values are JS string (UTF-16) indices. If they are UTF-8 byte offsets, convert them. The T011 non-ASCII test proves which.
  - `literalParts(node, text)` returns `{ text, offset }[]`:
    - a string literal gives its raw source text between the quotes, at `start + 1`;
    - a template literal gives one entry per quasi, with its raw text and the offset where that text starts in the source (check it with `text.slice`);
    - any other node gives `[]`.
  - `visitAll(node, fn)` is a generic visitor over every child object that has a `type`.
- [ ] T018 [P] [US1] Implement `listFiles(root): { specs: { feature: string; file: string }[]; testFiles: string[] }` in `tools/traceability/src/files.ts` (research R6):
  - Walk with `readdirSync(dir, { withFileTypes: true })`. Sort entries by name with code-unit comparison. Skip every symbolic link.
  - Skip directories below the root for which `isExcludedDir` is true. The root itself is never excluded.
  - Specs: each directory directly under `specs/` (same exclusions) that has an entry named `spec.md` of any kind. A `spec.md` that is a directory or unreadable is still listed, and check.ts reports it.
  - Test files: every file whose name matches `TEST_FILE_PATTERN`.
  - All paths are relative to the root with `/` separators. A missing `specs/` gives `specs: []`.
- [ ] T019 [P] [US1] Implement problem ordering and rendering in `tools/traceability/src/report.ts`. Follow contracts/cli.md exactly.
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
- [ ] T020 [US1] Implement the spec reader in `tools/traceability/src/specs.ts`, after T016 (data-model Spec, RequirementEntry and Requirement; research R7). Split lines on `\n` and ignore a trailing `\r`.
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
- [ ] T021 [US1] Implement the test reader in `tools/traceability/src/test-files.ts`, after T016 and T017 (research R4, data-model TestNode).
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
- [ ] T022 [US1] Implement `runCheck(root): Report` in `tools/traceability/src/check.ts`. It is synchronous and reads files as UTF-8.
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
- [ ] T023 [US1] Implement the entry point `tools/traceability/src/cli.ts` (contracts/cli.md):
  - With any argument, write `usage: npm run traceability (takes no arguments)` to stderr and set exit code 2.
  - Otherwise write `renderReport(runCheck(process.cwd()))` to stdout and set exit code 1 or 0.
  - Catch internal errors: message to stderr, exit code 2.
  - Set `process.exitCode`. Never call `process.exit()`, because piped stdout is asynchronous on macOS and the report could be cut off.
  - Then run `npm run traceability` once. Confirm Node 26 accepts `--allow-fs-read=.` and loads `cli.ts` and `oxc-parser`'s native binding. If it rejects the relative path, change the script to `--allow-fs-read=*` and record that in research.md R9 (the R9 fallback).
- [ ] T024 [US1] Checkpoint.
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

- [ ] T025 [P] [US2] Write `tools/traceability/test/repo-settings.test.ts`, covering 001-requirement-traceability-FR-025 and 001-requirement-traceability-FR-026. It asserts every **[tested]** point of contracts/ci.md.

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

### Implementation for User Story 2

- [ ] T026 [P] [US2] Create `.github/workflows/ci.yml` (contracts/ci.md Workflow, research R11):
  - Workflow `name: CI`, `on: pull_request: branches: [main]`, `permissions: contents: read`.
  - Jobs `traceability` and `test`. Each has `name:` equal to its id and `runs-on: ubuntu-latest`.
  - Steps:
    - `traceability`: `actions/checkout`, then `actions/setup-node` with `node-version-file: .nvmrc` and `cache: npm`, then `npm ci`, then `npm run traceability`.
    - `test`: the same first three steps, then `npm run typecheck`, then `npm test`.
  - Pin each action to the full commit SHA of its latest v7 release tag, with the version in a trailing comment, e.g. `uses: actions/checkout@<sha> # v7.x.y`. Find the SHA with `git ls-remote --tags https://github.com/actions/checkout 'v7*'`, and use the peeled `^{}` entry for annotated tags. Do the same for `actions/setup-node`.
  - No `if:`, `strategy`, `matrix`, `continue-on-error` or path filters.
- [ ] T027 [P] [US2] Create `.github/rulesets/main.json` with exactly the fields in contracts/ci.md, formatted with two-space indentation:
  - `name: "main"`, `target: "branch"`, `enforcement: "active"`
  - `conditions.ref_name`: `include: ["refs/heads/main"]`, `exclude: []`
  - `bypass_actors: []`
  - `rules`, in this order, with every parameter written out:
    1. `{ "type": "deletion" }`
    2. `{ "type": "non_fast_forward" }`
    3. `pull_request`, with `required_approving_review_count: 0`, `dismiss_stale_reviews_on_push: false`, `require_code_owner_review: false`, `require_last_push_approval: false`, `required_review_thread_resolution: false` and `allowed_merge_methods: ["squash"]`
    4. `required_status_checks`, with `strict_required_status_checks_policy: true`, `do_not_enforce_on_create: false` and `required_status_checks: [{ "context": "traceability", "integration_id": 15368 }, { "context": "test", "integration_id": 15368 }]`
- [ ] T028 [US2] Checkpoint.
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

- [ ] T029 [P] [US3] Extend `tools/traceability/test/references.test.ts`. It covers 001-requirement-traceability-FR-016, 001-requirement-traceability-FR-017, 001-requirement-traceability-FR-018 and 001-requirement-traceability-FR-019, using `runCheck` on sample projects and checking each problem's exact `file:line:column`.
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
- [ ] T030 [P] [US3] Write `tools/traceability/test/ui-files.test.ts`, covering 001-requirement-traceability-FR-013 and 001-requirement-traceability-FR-014. Put all sample markup in string literals.
  - `readUiFile(file, text)` reads JSX `data-req="…"`, `data-req={'…'}` and ``data-req={`…`}`` with no substitutions. It also reads `{ 'data-req': '…' }` object properties, including inside `createElement` calls.
  - A computed value is skipped: `data-req={ids}`, or a template with substitutions.
  - A file whose text doesn't contain `data-req` isn't parsed.
  - Space-separated values give one reference each, at its own column.
  - With `runCheck`, all of these hold:
    - `.tsx`, `.ts` and `.jsx` files with `data-req` are UI source;
    - a test file containing the same markup is not;
    - files under excluded directories aren't read;
    - a UI file with a syntax error gives `unreadable-file`.
- [ ] T031 [P] [US3] Extend `tools/traceability/test/test-files.test.ts` with a group covering 001-requirement-traceability-FR-012, 001-requirement-traceability-FR-016, 001-requirement-traceability-FR-017 and 001-requirement-traceability-FR-018. Using `runCheck`, unknown, removed and malformed references are still reported in all of these places:
  - `.skip` and `.todo` tests;
  - tests inside skipped groups;
  - groups with no tests;
  - the titles of unrecognized call shapes;
  - tests declared inside a top-level loop or `if` block.

  IDs in test bodies are still not read (FR-011).

### Implementation for User Story 3

- [ ] T032 [P] [US3] Extend `tools/traceability/src/ids.ts` with reference classification (data-model Reference, the classification tree):
  - `SpecTargets` is `Map<feature, { readable: boolean; ids: Map<'FR-###', 'active' | 'removed'> }>`. An ID is `active` when any of its definitions is active.
  - `referenceProblem(text, location, targets): Problem | null`. The subject is the full ID without quotes, except for `malformed`:
    - `malformed` when `parseFullId` rejects the text. The subject is the quoted text.
    - `unknown-reference` when no feature matches. The detail is `no spec directory is named <feature>`.
    - null when the spec is unreadable.
    - `unknown-reference` when the ID isn't defined. The detail is `spec <feature> defines no <FR-###>`.
    - `removed-reference` when every definition is removed.
    - Otherwise null. Draft and invalid-Status specs are valid targets.
  - `splitDataReq(value)` returns `{ text, index }[]`, one per whitespace-separated piece. A value that is empty or only whitespace gives one empty piece at index 0.
- [ ] T033 [P] [US3] Extend `listFiles` in `tools/traceability/src/files.ts` to also return `uiFiles`. It includes every file matching `/\.(?:[cm]?[jt]s|[jt]sx)$/` (`.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs`, `.cjs`) that doesn't match `TEST_FILE_PATTERN`. The exclusions and order are the same as for test files (research R6).
- [ ] T034 [US3] Implement `readUiFile(file, text)` in `tools/traceability/src/ui-files.ts`, after T032. It returns `{ references: Token[]; problem: Problem | null }`.
  - Return no references, without parsing, when `text` doesn't include `data-req`.
  - Otherwise call `parseSource` and walk every node with `visitAll`.
  - Read a `JSXAttribute` named `data-req` whose value is a string literal, or a `JSXExpressionContainer` holding a string literal or a template literal with no substitutions. Read a non-computed property whose key is the string literal `'data-req'` with the same kinds of value.
  - Split each value with `splitDataReq`, and locate each piece with `createLocator`.
  - Skip computed values (research R6).
- [ ] T035 [US3] Wire reference checking into `runCheck` in `tools/traceability/src/check.ts`:
  - Build `SpecTargets` from every spec, of any Status. Mark specs whose `spec.md` couldn't be read as unreadable.
  - For every node of every readable test file, apply `referenceProblem` to each of its own tokens, once. That includes inactive tests, groups with no tests and unrecognized shapes.
  - Read every `uiFiles` entry, with read errors handled as in T022. Call `readUiFile` and apply `referenceProblem` to each reference.
  - Add these problems before `buildReport`.
- [ ] T036 [US3] Checkpoint.
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

- [ ] T037 [P] Create the committed sample project `tools/traceability/test/__fixtures__/seeded/` (SC-001, research R13).

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
- [ ] T038 Add a seeded-project test to `tools/traceability/test/cli.test.ts`, after T037 (SC-001). Its title has no FR ID, e.g. `describe('seeded sample project (SC-001)', …)`. `runCli('<REPO_ROOT>/tools/traceability/test/__fixtures__/seeded')` exits 1, and its stdout equals `expected-report.txt` byte for byte.
- [ ] T039 [P] Write `tools/traceability/test/performance.test.ts` (SC-004). Use `makeProject` to generate 50 approved specs with 40 requirements each, and 200 test files with 10 tests each. Each test references one distinct full ID. Time `runCli` on the project: it must exit 0 in under 10,000 ms. Give the test a 60 s timeout.
- [ ] T040 [P] Write `tools/traceability/test/self-check.test.ts`, covering 001-requirement-traceability-FR-028 (SC-006).
  - `runCheck(REPO_ROOT)` has `result` `pass` and no problems.
  - Parsing the repository's specs with `listFiles` and `parseSpec` shows `001-requirement-traceability` as Approved.
  - The report's `approvedSpecs` and `activeRequirements` equal the counts computed from those parsed approved specs.
  - Don't hard-code 29, so later specs don't break the test.
- [ ] T041 [P] Correct the illustrative `bad-status` line in `specs/001-requirement-traceability/contracts/cli.md` from `specs/003-other/spec.md:7:15` to `:7:13`. The value of `**Status**: Aproved` starts at column 13, per data-model.md's Location rule.
- [ ] T042 [P] Audit Constitution X:
  - `package.json` has exactly the four `devDependencies` from plan.md (`oxc-parser`, `vitest`, `typescript`, `@types/node`) and no `dependencies`.
  - `oxc-parser` has no `^` or `~`, and `package-lock.json` is committed.
  - Both actions are pinned to full SHAs.
  - No agent skill or other abstraction beyond `makeProject` (and its `runCli` companion) was added.
- [ ] T043 Run the full verification, after T038 to T040.
  - `npm run typecheck` passes.
  - `npm test` passes.
  - `npm run traceability` exits 0, and its last line is exactly `PASS: all 29 active requirements in 1 approved spec are covered.` (Constitution III, SC-006).
- [ ] T044 Run quickstart.md scenarios 1 to 6 and record any deviation.
  - Scenario 3 temporarily changes one requirement's group to `describe.skip(`. Revert it with `git checkout -- <file>`.
  - Scenario 4 needs the owner to turn the network off.
  - Scenario 6 is the performance test.
- [ ] T045 Commit the remaining work with Conventional Commits, e.g. `feat(traceability): …`, `test(traceability): …`. Push, and mark the draft pull request from T028 ready for review (Constitution XI). If US2 was skipped or done later, open it now.
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/001-requirement-traceability/spec.md` and `specs/001-requirement-traceability/tasks.md`.
  - Confirm both `traceability` and `test` jobs run and pass.
  - Confirm the `traceability` log shows the same report as the local run on the same commit (FR-026, quickstart scenario 5).
- [ ] T046 Owner action, needs admin rights and the open PR from T045: apply the ruleset with `gh api --method POST /repos/alex-profir/CV/rulesets --input .github/rulesets/main.json` (quickstart scenario 7).
  - Confirm `current_user_can_bypass` reads `never`, and the drift diff prints `no drift`.
  - If the diff shows parameters the server added with default values, add them to `.github/rulesets/main.json` and the contracts/ci.md table. Then update `repo-settings.test.ts`, re-apply with `--method PUT /repos/alex-profir/CV/rulesets/<id>`, and push the change to the PR.
- [ ] T047 Owner action, after T046: demonstrate enforcement (quickstart scenario 7, US2 scenarios 1 to 4, SC-003).
  1. On a scratch branch based on `001-requirement-traceability`, apply scenario 3's skip change, push, and open a PR.
  2. Confirm `traceability` fails, names the uncovered requirement, and GitHub shows the merge blocked with no bypass option.
  3. Revert, push, and confirm both checks pass. Then close the PR without merging and delete the scratch branch.
  4. Run the direct-push probe from quickstart scenario 7 only after `current_user_can_bypass` reads `never`. Confirm `git push origin main` is rejected, then drop the local probe commit with `git reset --hard origin/main`.

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
