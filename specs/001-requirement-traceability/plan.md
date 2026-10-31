# Implementation Plan: Requirement Traceability Check

**Branch**: `001-requirement-traceability`; the amendment on `001-local-verify` | **Date**:
2026-10-21, amended 2026-10-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-requirement-traceability/spec.md`, with its
amendment of 2026-10-29 (Clarifications, Session 2026-10-29; User Story 4; FR-030 to FR-037;
SC-008 to SC-010), approved by the owner on 2026-10-29

**Design**: No UI (spec.md, Design section)

**Amendment of 2026-10-29**: this plan was written for FR-001 to FR-029 and shipped with them.
The amendment's decisions are added in place: the Summary's last part, Technical Context, the
Constitution Check, rows FR-030 to FR-037 of the Requirement Traceability table, the
Dependencies table and Project Structure, with research.md R14 to R21,
[contracts/local-verify.md](./contracts/local-verify.md), the amended
[contracts/ci.md](./contracts/ci.md), data-model.md's last section and quickstart.md scenarios 8
to 13. Everything else still holds.

## Summary

The check reads every `specs/*/spec.md` and finds the functional requirements of approved
specs. It then reads the project's tests and UI source and fails when an active requirement has
no counting test, or when a test, group or `data-req` attribute references an ID that is
malformed, unknown or removed. It prints every problem as `file:line:column`, followed by a
summary.

The owner runs it with `npm run traceability`, and a GitHub Actions job runs the same command on
every pull request. A repository ruleset with no bypass makes that job required and keeps
`main` pull-request-only.

Technical approach (details in [research.md](./research.md)):

- **Runtime**: a TypeScript CLI run directly by Node 26, with no build step.
- **Reading tests**: test files are parsed statically with `oxc-parser`, not run, so skipped
  tests stay visible and every reference has an exact location.
- **Reading specs**: a small line-based reader.
- **No network**: Node's permission model blocks network access for every run.

This is the repository's first code, so the plan also sets the base toolchain: Node 26, npm,
Vitest and GitHub Actions.

**The amendment of 2026-10-29** moves the full test run off pull requests and onto the owner's
machine, proven by a sign-off on the exact commit (research.md, R14 to R21):

- **Two test sets** (R14): `vitest.config.ts` declares two Vitest projects. `fast` holds the
  directories of tests that need neither a browser nor the site build (64 files today, about
  25 s of test time); `slow` holds the rest and keeps the global setup that builds the site.
  `npm test` still runs both. `npm run test:fast` runs `fast`. A test asks Vitest's own listing
  which files each project holds, checks it equals the traceability check's list, and follows
  the fast files' imports to prove none reaches a browser or the build.
- **Pull requests** (R15): the five jobs keep their names. `test` now runs `npm run typecheck`
  and `npm run test:fast`, with no browser install. Every job gets `timeout-minutes: 6`
  (SC-008). The `site` job is unchanged.
- **The local full run** (R16, R17): `npm run verify` refuses a working copy that isn't exactly
  the commit, checks Node, the installed dependencies and Chromium, then runs every pull-request
  check with the full set in place of the fast set, every check even after a failure. It keeps
  its result in the clone's git directory, keyed by commit SHA.
- **Signing off** (R18): `npm run signoff` reads that result, pushes the branch if the commit
  isn't on GitHub yet, and posts a `success` commit status named `local-verify` with the owner's
  `gh` login, naming the tests passed, the site check's result, Node's version and the OS. It
  refuses in CI, without a passing result, or without a connection.
- **Merging** (R19): the ruleset also requires `local-verify` (no `integration_id`). The
  amendment's pull request runs the new workflow, then is the first one signed off.

## Technical Context

**Language/Version**: TypeScript with erasable syntax only, run directly by Node.js 26 (native
type stripping, no build step). The amendment's tool, `tools/local-verify/`, is the same: a
plain-JavaScript `main.js` gate, then TypeScript.

**Primary Dependencies**: `oxc-parser`, pinned to an exact version, is the only package the
check loads. Dev tooling: `vitest` 5, `typescript` 7 (typecheck only) and `@types/node`.
The amendment adds **no package**. It uses Vitest 5's projects, `git`, and on the owner's machine
only, the GitHub CLI `gh` to record the sign-off (research R18). It reuses the site check's
`hasChromium()` and the check's `listFiles` and parser wrapper.

**Storage**: the check reads repository files and writes nothing. The local full run keeps its
result, log and Vitest report in `$(git rev-parse --git-common-dir)/local-verify/<sha>.*`, outside
the working copy (FR-037, R17). The sign-off is a commit status on GitHub.

**Testing**: Vitest (`npm test`, the full set; `npm run test:fast`, the fast set) and
`tsc --noEmit` (`npm run typecheck`). The amendment's tests use real `git` with local bare
remotes, a fake `gh` and `npm` on `PATH`, and function seams, with no network (R20).

**Target Platform**: Node.js 26 on macOS (owner) and Linux (GitHub Actions `ubuntu-latest`).
`verify` and `signoff` run on the owner's machine; `verify` also runs in a cloud session, which
has no `gh` and so can't sign off.

**Project Type**: a repository CLI tool, plus a CI workflow and a repository ruleset. The
amendment adds a second local tool with two commands, `verify` and `signoff`.

**Shells**: None. The spec's Shell Scope says neither shell is affected.

**Offline Approach**: the check reads only local files and runs under
`node --permission` without `--allow-net`, so any network call fails at the runtime level
(research R9). Only `npm ci` (installing) uses the network. The local full run needs no
connection; signing off is the only step that does, and without one it records nothing (spec
Offline Behavior, FR-036).

**Performance Goals**: under 10 s for 50 specs and 2,000 tests (SC-004). Parsing 200 test files
measured 16 ms in research, so the budget is dominated by Node start-up. Every pull request's
checks within 6 minutes (SC-008): before the amendment the `test` job took about 1,120 s of wall
time; after it, `site` (about 3.5 minutes) is the slowest job and `test` takes under 2 (R15).

**Constraints**:

- no network (FR-027) and no disk writes;
- byte-identical stdout for the same files on macOS and Linux (FR-024, FR-026);
- no TypeScript syntax that needs transforming (enums, namespaces, parameter properties);
- amendment: no test the pull request runs may need a browser or the site build (FR-031); the
  local full run must run exactly the checked-out commit and 100% of the test files (FR-032,
  SC-010); a sign-off description is at most 140 characters (GitHub's limit); nothing the
  amendment writes is tracked (FR-037).

**Scale/Scope**: when first planned, 1 spec with 29 requirements. Today 6 specs, this one with
37 active requirements, and 150 test files (64 fast, 86 slow). Designed for 50 specs and 2,000
tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Initial check: passed before research. Post-design re-check: passed. The table shows the
post-design state.

**Re-checked 2026-10-29** against Constitution 1.4.0 for the amendment, before research and
again after Phase 1 design: passed. The rows below show both the original feature and the
amendment.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`, with the amendment's approval of 2026-10-29 beside it (line 9). Tool, language and CI choices (Vitest projects, `gh`, commit statuses, file locations) appear only in this plan, research.md and the contracts |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or spec says "No UI" | N/A | spec.md Design section: "**No UI**: this feature adds or changes no user interface." The amendment adds none |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 37 FRs, the amendment's FR-030 to FR-037 included, have planned tests below. All are Non-UI. FR-030's test also proves the check still reads every test file, so the split can't take a test out of the check |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use Penpot tokens only | N/A | No CV data, no styles |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | N/A | No app, shell or `os-core` code. Matches spec Shell Scope (neither shell) |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | The check runs fully offline, and the permission model enforces it (R9, FR-027, unchanged). The local full run needs no connection; only signing off does, as spec Offline Behavior says, and offline it records nothing (R16, R18, quickstart 12) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | N/A | Nothing visitor-facing. The CV path is unchanged |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | N/A (supports) | No UI. The amendment keeps the site check (accessibility, keyboard, Lighthouse, offline) on every pull request and moves the browser tests that verify them to the signed-off local run, as the merge requirements allow |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | N/A | No visual assets |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | The amendment adds no package and no agent skill. Its new pieces (two Vitest projects, the `local-verify` tool, the process seam, the fake-`bin` test helper, the use of `gh`) are in the Dependencies table with the simpler alternative each one beat. `gh` is GitHub's own CLI and runs only on the owner's machine |
| XI | Features and Amendments in Their Own PRs | A feature ships in one PR; an amendment in PRs of its own, each linking spec.md and tasks.md and naming the amendment by date; the amendment's tasks are a new phase; Conventional Commits | Pass | FR-001 to FR-029 shipped in one PR from `001-requirement-traceability`. The amendment of 2026-10-29 ships in one PR of its own from `001-local-verify`, linking spec.md and tasks.md and naming the amendment. Its spec part is recorded as Principle XI asks (dated session, approval beside Status, FR-030 to FR-037 under a group marked `(added 2026-10-29)`, SC-008 to SC-010 and User Story 4 each marked `(added 2026-10-29)`, and the amended Assumptions marked `Amended 2026-10-29`; no existing FR changes). The tasks run adds a new phase to tasks.md and marks overturned tasks superseded. The edits to 002's to 004's repo-settings tests are part of this amendment because they read the same workflow and ruleset it changes (R20). Commits use `docs(001):`, `feat(001):`, `test(001):` |
| — | Merge requirements (1.4.0): cloud and local runs, local sign-off | Pull requests run the fast checks; the full suite runs on the owner's machine on a clean checkout of the head commit; a passing `local-verify` status posted only by the owner's run, never CI, is required on the head commit; a new commit needs a new run; the status names what ran | Pass | This amendment is what implements them: R14 (fast set), R15 (CI runs exactly the fast checks and can't post statuses), R16 and R17 (clean-checkout full run, result per SHA), R18 (status posted with the owner's `gh`, refused in CI, naming tests, site check, Node and OS), R19 (ruleset requires it, strict up-to-date) |

## Requirement Traceability

Constitution III. The tests for FR-001 to FR-029 are under `tools/traceability/test/`. The
amendment's are there too (`test-sets.test.ts`, `repo-settings.test.ts`) and under
`tools/local-verify/test/`. All of them are in the fast set. Each test or group title carries the
`001-requirement-traceability-FR-###` IDs it covers. "Sample project" means a temporary project
built inline by the `makeProject` helper, unless the seeded one is named. "Sample repository"
means a sample project made a git repository, with a local bare `origin` and a fake `gh` and
`npm` on `PATH` (research R20).

The check reads its own tests like any others (FR-028). Their titles must therefore contain
only well-formed, existing full IDs. Sample IDs such as `FR-1`, `002-example-FR-009` or
`fr-001` go in test bodies, where the check doesn't look (FR-011), never in titles.

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 001-requirement-traceability-FR-001 | `specs.test.ts`, unit: every `specs/*/spec.md` is found and its Status read. Directories without `spec.md` are ignored | Non-UI |
| 001-requirement-traceability-FR-002 | `specs.test.ts`, unit: a Draft spec with no tests, a malformed ID and a duplicate ID produces no problem. Only Approved specs need coverage | Non-UI |
| 001-requirement-traceability-FR-003 | `specs.test.ts`, unit: a missing Status line, `Aproved`, and Status text inside an HTML comment each produce `bad-status` | Non-UI |
| 001-requirement-traceability-FR-004 | `specs.test.ts`, unit: only list entries in the Functional Requirements section define requirements. IDs in user stories, comments, code blocks and other sections don't | Non-UI |
| 001-requirement-traceability-FR-005 | `specs.test.ts`, unit: `~~**FR-004**~~` and `**~~FR-004~~**` are removed and need no coverage | Non-UI |
| 001-requirement-traceability-FR-006 | `specs.test.ts`, unit: `FR-1`, `FR-0001` and `fr-001` in an approved spec produce `malformed` at their line | Non-UI |
| 001-requirement-traceability-FR-007 | `specs.test.ts`, unit: an ID defined twice, and an active plus a removed entry with the same ID, each produce one `duplicate-id` naming every line | Non-UI |
| 001-requirement-traceability-FR-008 | `specs.test.ts`, unit: an approved spec with no entries produces `no-requirements` | Non-UI |
| 001-requirement-traceability-FR-009 | `references.test.ts`, unit: the full ID is `<directory>-FR-###`. The same FR number in two specs gives two distinct IDs | Non-UI |
| 001-requirement-traceability-FR-010 | `test-files.test.ts`, unit: IDs in test titles, group titles (nested), template-literal parts and `tags` options are found. A test with several IDs covers each. A group with no tests covers nothing | Non-UI |
| 001-requirement-traceability-FR-011 | `test-files.test.ts`, unit: IDs in comments, assertions, helper strings and `test.step` titles don't count | Non-UI |
| 001-requirement-traceability-FR-012 | `test-files.test.ts`, unit: `.skip`, `.todo`, `{ skip: true }`, a test without a body, a skipped parent group and a `ctx.skip()` that always skips, `.skipIf(true)` and `.each([])` don't count. `.skipIf` with a runtime condition does count. The report says "only skipped…". References on skipped tests are still validated. The Vitest config declares no tags with `skip` or `todo` | Non-UI |
| 001-requirement-traceability-FR-013 | `ui-files.test.ts`, unit: `data-req` in JSX (string and expression-container literals) and in `'data-req'` object properties is read. Space-separated values are checked one by one. Test files aren't UI source | Non-UI |
| 001-requirement-traceability-FR-014 | `files.test.ts`, unit: `node_modules`, dot-directories, `dist`, `build`, `out`, `coverage` and `__fixtures__` are skipped. `vitest.config.ts` builds its include and exclude from the same constants | Non-UI |
| 001-requirement-traceability-FR-015 | `check.test.ts`, integration: US1 scenario 1. `002-example-FR-003` is reported uncovered at its spec line | Non-UI |
| 001-requirement-traceability-FR-016 | `references.test.ts`, unit: `002-example-FR-009` (missing FR) and `099-missing-FR-001` (missing spec) produce `unknown-reference` with file and line | Non-UI |
| 001-requirement-traceability-FR-017 | `references.test.ts`, unit: references to a removed FR from a test, a group and a `data-req` produce `removed-reference` | Non-UI |
| 001-requirement-traceability-FR-018 | `references.test.ts`, unit: `FR-001`, `fr-001`, `002-example-FR-01` and `002-example-FR-0001` in titles and tags, plus a malformed `data-req` value, produce `malformed` | Non-UI |
| 001-requirement-traceability-FR-019 | `references.test.ts`, unit: a reference to an active requirement in a Draft spec isn't reported | Non-UI |
| 001-requirement-traceability-FR-020 | `check.test.ts`, integration: result is `fail` with exit code 1 when problems exist and `pass` with 0 when none | Non-UI |
| 001-requirement-traceability-FR-021 | `check.test.ts`, integration: a project with several problems of different types reports all of them in one run | Non-UI |
| 001-requirement-traceability-FR-022 | `report.test.ts`, unit: every problem line has type, subject and `file:line:column`. An uncovered requirement points at its definition | Non-UI |
| 001-requirement-traceability-FR-023 | `report.test.ts`, unit: the summary shows counts per type (zeros included). Passing, failing and "no approved specs" wording, singular and plural | Non-UI |
| 001-requirement-traceability-FR-024 | `report.test.ts`, unit: two runs give identical output. The order is independent of discovery order and locale. Paths use `/` | Non-UI |
| 001-requirement-traceability-FR-025 | `repo-settings.test.ts`, static: `ci.yml` and `.github/rulesets/main.json` satisfy every **[tested]** point of [contracts/ci.md](./contracts/ci.md). Amended 2026-10-29: the `test` job's expected steps and the required-check list follow R15 and R19, and "every required check is a job" applies to the Actions-bound ones. Live enforcement is verified by quickstart scenario 7 | Non-UI |
| 001-requirement-traceability-FR-026 | `cli.test.ts`, integration: `npm run traceability` and a direct run of the CLI with the same flags print the same report. The CI job runs exactly `npm run traceability` (also asserted in `repo-settings.test.ts`) | Non-UI |
| 001-requirement-traceability-FR-027 | `cli.test.ts`, integration: the check runs and passes under the permission flags with no network grant. A positive-control script under the same flags fails `fetch` with `ERR_ACCESS_DENIED` | Non-UI |
| 001-requirement-traceability-FR-028 | `self-check.test.ts`, integration: the check on the real repository passes and counts `001-requirement-traceability` among the approved specs | Non-UI |
| 001-requirement-traceability-FR-029 | `check.test.ts`, integration: a test file with a syntax error and an unreadable `spec.md` produce `unreadable-file`. The broken file's references are not used | Non-UI |
| 001-requirement-traceability-FR-030 | `test-sets.test.ts`, integration: Vitest's own listing (`vitest list --filesOnly --json`) equals the check's `listFiles(REPO_ROOT).testFiles`, each file once, in project `fast` or `slow`; no `fast` file's import closure reaches a browser, Lighthouse, Vite, the site build or the page-test helpers, and a sample project with a fast file that imports `playwright` (or reaches `helpers/site.ts` through a helper) is reported with its import chain; the config's projects are built from `FAST_TEST_GLOBS`, `TEST_INCLUDE_GLOBS` and `TEST_EXCLUDE_GLOBS`, only `slow` has a `globalSetup`; `files.ts` never reads `FAST_TEST_GLOBS`. `files.test.ts` (FR-014) checks each project's globs instead of the root's | Non-UI |
| 001-requirement-traceability-FR-031 | `repo-settings.test.ts`, static: across all jobs the `run:` commands are exactly the set in [contracts/ci.md](./contracts/ci.md#everything-a-pull-request-runs-fr-031-tested); the `test` job runs `npm run typecheck` then `npm run test:fast` and has no Playwright step; `test:fast` is `vitest run --project fast`; no step runs `npm test` or `vitest` | Non-UI |
| 001-requirement-traceability-FR-032 | `verify.test.ts`, integration on sample repositories: a modified, a staged, a deleted and an untracked file each refuse the run with exit 2, naming every path, and the fake `npm` log is empty; a wrong Node major, a lockfile mismatch and a missing Chromium (prerequisites probe) are each named with their fix, with nothing run; the checks run are those of ci.yml's `run:` commands with `test:fast` replaced by `npm test`, in contract order, and `site` runs `npm run --silent site-check` (the same command as 004 FR-049); `npm run verify` is `node tools/local-verify/src/main.js verify` | Non-UI |
| 001-requirement-traceability-FR-033 | `verify.test.ts`: with every fake check passing, the result reads `pass` with the test counts, `siteCheck: pass`, Node and OS, and the summary ends `PASS`; with two checks failing, both still run, both are named in `FAIL: 2 checks failed`, exit 1, result `fail`. `signoff.test.ts`: the posted status is `state=success`, `context=local-verify` and a description naming tests passed, files, the site check, Node and OS; descriptions built from the longest plausible values stay within 140 characters; a failed result is refused, naming the failing checks, and `gh` isn't called | Non-UI |
| 001-requirement-traceability-FR-034 | `signoff.test.ts`: after a passing run, a new commit, an amended commit and a merge commit each have no result, so signing off refuses naming the new SHA; with `CI` or `GITHUB_ACTIONS` set it refuses before reading anything, and `gh` isn't called. `repo-settings.test.ts`: the workflow's permissions are exactly `contents: read`, and no step names `local-verify`, `signoff`, `verify` or `gh` | Non-UI |
| 001-requirement-traceability-FR-035 | `repo-settings.test.ts`, static: the ruleset's required checks end with `{ context: 'local-verify' }` and no `integration_id`, it is no job's name, the strict up-to-date policy and the empty bypass list stay. Live: quickstart scenarios 11 and 13 | Non-UI |
| 001-requirement-traceability-FR-036 | `signoff.test.ts`, sample repositories: signing off a passing run starts no `npm` or `vitest` (fake `npm` log empty); a commit not yet on `origin` is pushed first, and the fake `gh` saw the bare remote's branch at that SHA when called; an unreachable `origin` and a rejected push each print their message, exit 1, and leave the `gh` log empty; a `gh` failure is reported with its message; a missing `gh` names how to install it | Non-UI |
| 001-requirement-traceability-FR-037 | `verify.test.ts`: after a run, the result, log and Vitest report are under `git rev-parse --git-common-dir`/`local-verify/`, `git status --porcelain` is empty and `git ls-files` is unchanged; a check that leaves an untracked file fails the run, naming it | Non-UI |

Success criteria without an FR are also tested:

- SC-001: `cli.test.ts` compares the seeded sample project's report with its
  `expected-report.txt`.
- SC-004: `performance.test.ts` runs 50 generated specs and 2,000 tests in under 10 s. The time
  is asserted off CI only, because SC-004 is about the owner's machine.
- SC-003 and SC-007 are covered by FR-025 and FR-022 above, plus quickstart.md.
- SC-008 (added 2026-10-29, amended 2026-10-30 by 008): `repo-settings.test.ts` asserts `timeout-minutes: 6` on every job but `site`, which has 20,
  and no browser install in `test`, so a job past the budget fails. Quickstart scenario 13
  measures a real run.
- SC-009 (added 2026-10-29): covered by FR-035 and FR-034 above; quickstart scenarios 11 and 13
  show the block and its release live.
- SC-010 (added 2026-10-29): `test-sets.test.ts` (the full set is every test file) and
  `verify.test.ts` (the `test` check runs `npm test` with no project or file filter, and fails
  when Vitest's report lists fewer files than the check, naming both counts).

## Dependencies, Skills & Abstractions

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `oxc-parser` (exact pin) | dev dependency, loaded by the check | Parses JS, TS, JSX and TSX test files and UI source into a tree with offsets and a syntax-error list. That's how titles, groups, skip marks and `data-req` are read (FR-010 to FR-013, FR-029) | Text search can't tell a title from a comment or see groups and skips (R4). TypeScript 7 has no stable parse API, TypeScript 6's is frozen and 23 MB, and Babel throws on some syntax errors (R5) | Yes: the Oxc project (VoidZero, now part of Cloudflare) |
| `vitest` | dev dependency | Runs the check's tests and becomes the project's unit test runner. Its config imports the check's file-selection constants, so the runner and the check agree on what a test is (R3) | `node:test` has no exclude patterns and no tags, so the runner's and the check's file lists would drift (R3) | Yes: the Vitest team |
| `typescript` | dev dependency | `tsc --noEmit` typechecks the code. Node's type stripping removes types without checking them | Without it, type annotations would be unchecked comments | Yes: Microsoft |
| `@types/node` | dev dependency | Type declarations for Node built-ins (`node:fs`, `node:path`, `node:child_process`) used in the typecheck | Node ships no type declarations of its own | No: DefinitelyTyped (community, hosted by Microsoft). It's the standard source of Node's types |
| `actions/checkout`, `actions/setup-node` (pinned SHAs) | CI actions | Check out the code and install Node from `.nvmrc` with an npm cache | Hand-written shell steps would reimplement both | Yes: GitHub |
| `makeProject` test helper | abstraction (test-only) | Writes a sample project from inline file contents to a temporary directory, so each test shows its input next to its assertion | One committed fixture folder per test would scatter dozens of tiny projects. The one seeded project that's worth reading is committed (R13) | N/A |
| Two Vitest projects, `fast` and `slow` (added 2026-10-29) | configuration | Splits the suite into the fast set and the rest, with the site-building global setup only on `slow`, while `npm test` still runs every test (FR-030, R14) | Tags would need one on each of 86 files and fail open when missing; two config files or file arguments in npm scripts would drift from the check's selection | Yes: Vitest's own feature |
| Import-closure helper `tools/traceability/test/helpers/imports.ts` (added 2026-10-29) | abstraction (test-only) | Follows a test file's runtime imports with the check's own parser wrapper, so the machine check can prove no fast file reaches a browser or the build (FR-030, R14) | Grepping for `playwright` misses imports through helpers; relying only on CI's missing Chromium wouldn't catch a fast test that builds the site | N/A |
| `FAST_TEST_GLOBS` in `files.ts` (added 2026-10-29) | constant | The one list of fast directories, read by the config and by the machine check | A list written only in `vitest.config.ts` would sit apart from the selection constants the check and the config already share; a computed split would parse 150 files on every run (R14) | N/A |
| `tools/local-verify/` (`verify`, `signoff`) (added 2026-10-29) | abstraction (repository tool) | The one command for the local full run and the one for signing off, with the clean-tree, prerequisite and result rules FR-032 to FR-037 ask for (R16 to R18) | A shell script would be the repository's only one and is harder to test; a self-hosted Actions runner would make CI post the sign-off, which FR-034 forbids; a git hook can't record anything on the host | N/A |
| `exec` and `prerequisites` seams in `verify` and `signoff` (added 2026-10-29) | abstraction (two function parameters) | Let tests run both commands on sample repositories with fake checks and a fake Chromium probe, so they make no network request and need no browser (R20) | Running the real checks inside a test would run the full suite recursively; mocking modules hides the process boundary the commands depend on | N/A |
| Fake `bin/` test helper (`gh`, `npm`) and local bare remotes (added 2026-10-29) | abstraction (test-only) | Records what `signoff` would post, answers `verify`'s checks with chosen results, and proves no test ran, with `GIT_ALLOW_PROTOCOL=file` refusing any real transport (R20) | Calling the real `gh` would post statuses or need the network; stubbing `git` too would stop the push-first rule from being tested for real | N/A |
| GitHub CLI `gh` (added 2026-10-29) | tool on the owner's machine, not a package | Posts the `local-verify` commit status with the owner's own login (FR-033, FR-034, R18) | `fetch` to the REST API would need the owner's token handled by the script; `gh` already holds it, is already installed, and adds nothing to `package.json` | Yes: GitHub |

No runtime dependencies are added for the site. The check's own source is a set of plain
modules with no classes, plugins or configuration file. The amendment adds no npm package, and
`tools/local-verify/` follows the same style.

## Project Structure

### Documentation (this feature)

```text
specs/001-requirement-traceability/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R13, the amendment's R14–R21; Appendix A
├── data-model.md        # Phase 1: entities, rules, classification
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── cli.md           # Command, exit codes, report format
│   ├── ci.md            # Pull-request workflow and ruleset (amended 2026-10-29)
│   └── local-verify.md  # verify and signoff (added 2026-10-29)
└── tasks.md             # Phase 2 (/speckit-tasks); the amendment's phase is added by a tasks run
```

There is no `design/` folder because the feature has no UI.

### Source Code (repository root)

Files this feature created, with the amendment's changes marked `(2026-10-29)`. The other
tools and packages (`tools/content-check`, `tools/token-check`, `tools/site-check`,
`packages/*`) belong to features 002 to 006 and are listed only where the amendment touches them.

```text
package.json             # private; scripts: traceability, test, typecheck; engines.node >=26
                         # (2026-10-29) + test:fast, verify, signoff
package-lock.json        # (2026-10-29) unchanged: no new package
.nvmrc                   # 26; verify checks Node's major against it
.gitignore               # node_modules/ (2026-10-29: unchanged; results live in .git/)
tsconfig.json            # noEmit, erasableSyntaxOnly, verbatimModuleSyntax, module nodenext;
                         # excludes **/__fixtures__/**
vitest.config.ts         # (2026-10-29) projects fast and slow, built from files.ts;
                         # globalSetup only on slow

.github/
├── workflows/
│   └── ci.yml           # jobs: traceability, test, content, tokens, site (contracts/ci.md)
│                        # (2026-10-29) test: typecheck + test:fast; timeout-minutes: 6 each
└── rulesets/
    └── main.json        # ruleset for main, applied with gh api (contracts/ci.md)
                         # (2026-10-29) + required check local-verify

tools/
├── local-verify/        # (2026-10-29) the local full run and the sign-off
│   ├── src/
│   │   ├── main.js      # plain JS: Node gate, then `verify` or `signoff`
│   │   ├── verify.ts    # clean tree, prerequisites, the checks, the result
│   │   ├── signoff.ts   # refusals, push-first, the commit status
│   │   ├── checks.ts    # the checks and their commands, in run order
│   │   ├── git.ts       # git through the exec seam: status, HEAD, origin, ls-remote, push
│   │   └── result.ts    # result path, read and write, the status description
│   └── test/
│       ├── helpers/
│       │   └── repo.ts  # sample repositories, bare origin, fake bin/ (gh, npm)
│       ├── verify.test.ts
│       └── signoff.test.ts
└── traceability/
    ├── src/
    │   ├── main.js        # entry point, plain JS: checks the Node version, then loads cli.ts
    │   ├── node-version.js # refuses Node versions that can't block the network
    │   ├── cli.ts         # arguments, exit codes, prints the report
    │   ├── check.ts       # one run over a root directory → Report
    │   ├── files.ts       # directory walk + shared include/exclude constants
    │   │                  # (2026-10-29) + FAST_TEST_GLOBS
    │   ├── specs.ts       # Status and Functional Requirements entries from spec.md
    │   ├── ids.ts         # full-ID grammar, token finding, reference classification
    │   ├── source.ts      # oxc-parser wrapper: parse errors, offset → line/column
    │   ├── test-files.ts  # tests and groups: titles, tags, inactive marks
    │   ├── ui-files.ts    # data-req attributes
    │   └── report.ts      # problem ordering and text rendering
    └── test/
        ├── helpers/
        │   ├── project.ts # makeProject: temporary sample projects from inline files
        │   └── imports.ts # (2026-10-29) runtime import closure of a test file (R14)
        ├── __fixtures__/
        │   └── seeded/    # sample project with every problem type + expected-report.txt
        ├── specs.test.ts
        ├── references.test.ts
        ├── test-files.test.ts
        ├── ui-files.test.ts
        ├── files.test.ts
        ├── check.test.ts
        ├── report.test.ts
        ├── cli.test.ts
        ├── repo-settings.test.ts # (2026-10-29) + FR-031, FR-034, FR-035, SC-008
        ├── test-sets.test.ts     # (2026-10-29) FR-030, SC-010
        ├── self-check.test.ts
        └── performance.test.ts
```

Other features' tests the amendment edits, because they read the workflow and ruleset it changes
(research R20): `tools/content-check/test/repo-settings.test.ts`,
`tools/token-check/test/repo-settings.test.ts` and `tools/site-check/test/repo-settings.test.ts`.
`tools/site-check/test/cli.test.ts` stays as it is.

**Structure Decision**: the repository has no application code yet, so this feature creates
only the root toolchain files, the CI files and `tools/traceability/`.

- `tools/` holds repository tooling that is never shipped to visitors. It sits apart from the
  future site code, so no shell or app ever depends on it.
- Tests sit next to the tool they test, in `tools/traceability/test/`.
- `packages/content`, `os-core`, the shells, the apps, the token output and `/cv` aren't created
  here. The first plan that needs each one decides its path, and may convert the root
  `package.json` to npm workspaces then.
- (2026-10-29) `tools/local-verify/` is a separate tool, not part of `tools/traceability/`: the
  check stays network-free and write-free under its permission flags, while `verify` starts
  processes and writes its result, and `signoff` reaches the host. `FAST_TEST_GLOBS` lives in
  `tools/traceability/src/files.ts` because it is one more file-selection constant beside the
  ones the config already imports from there.

Conventions set here for later features:

- Test files are named `*.test.ts(x)` or `*.spec.ts(x)`. Requirement IDs go in test or group
  titles.
- Sample projects for tool tests live in `__fixtures__/` folders.
- Every pull request must pass `traceability` and `test`. (2026-10-29: and `content`,
  `tokens`, `site` and the owner's `local-verify` sign-off.)
- (2026-10-29) A test that needs a browser or the site build lives outside the fast directories
  (`FAST_TEST_GLOBS`). A new directory of Node-only tests joins the fast set by adding its glob
  there, and `test-sets.test.ts` checks the choice.
- A plan that adds another test runner, such as Playwright for end-to-end tests, extends the
  check's test reader for that runner's syntax in the same pull request, with tests. Until then,
  the guarantee that unrecognized syntax never counts as coverage holds only for Vitest. For
  example, Playwright's bare `test.skip()` inside a group would leave the group's other tests
  counting (research.md, R4 and Appendix A).

## Complexity Tracking

No violations. Every Constitution Check row is Pass or N/A, so nothing needs justifying here.
The amendment's re-check (2026-10-29) found none either.

## Open points for the amendment

- **The ruleset read-back for `local-verify`**: GitHub may return the missing `integration_id` as
  absent or as `null`. The drift check in quickstart scenario 7 removes `null` values first, so
  either form compares equal; the first application (scenario 13) shows which.
- **`timeout-minutes: 6` and slow runners**: the limit makes SC-008 a failing check instead of a
  slow one. The `site` job's measured 3.5 minutes leaves room; if a hosted runner ever needs
  more, the fix is to make that job faster (or amend SC-008), not to raise the limit quietly.
  Amended 2026-10-30 by 006-terminal: SC-008 gives the `site` job 12 minutes, as it had grown to
  about 5.5 minutes with the Terminal's lines and 007's inspector. Amended 2026-10-30 by
  008-typescript-playground: SC-008 gives it 20 minutes, as 008's part took the site check past 7
  minutes before Lighthouse.
