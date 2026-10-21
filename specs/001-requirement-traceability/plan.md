# Implementation Plan: Requirement Traceability Check

**Branch**: `001-requirement-traceability` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-requirement-traceability/spec.md`

**Design**: No UI (spec.md, Design section)

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

## Technical Context

**Language/Version**: TypeScript with erasable syntax only, run directly by Node.js 26 (native
type stripping, no build step).

**Primary Dependencies**: `oxc-parser`, pinned to an exact version, is the only package the
check loads. Dev tooling: `vitest` 5, `typescript` 7 (typecheck only) and `@types/node`.

**Storage**: N/A. The check reads repository files and writes nothing.

**Testing**: Vitest (`npm test`) and `tsc --noEmit` (`npm run typecheck`).

**Target Platform**: Node.js 26 on macOS (owner) and Linux (GitHub Actions `ubuntu-latest`).

**Project Type**: a repository CLI tool, plus a CI workflow and a repository ruleset.

**Shells**: None. The spec's Shell Scope says neither shell is affected.

**Offline Approach**: the check reads only local files and runs under
`node --permission` without `--allow-net`, so any network call fails at the runtime level
(research R9). Only `npm ci` (installing) uses the network.

**Performance Goals**: under 10 s for 50 specs and 2,000 tests (SC-004). Parsing 200 test files
measured 16 ms in research, so the budget is dominated by Node start-up.

**Constraints**:

- no network (FR-027) and no disk writes;
- byte-identical stdout for the same files on macOS and Linux (FR-024, FR-026);
- no TypeScript syntax that needs transforming (enums, namespaces, parameter properties).

**Scale/Scope**: today 1 spec with 29 requirements. Designed for 50 specs and 2,000 tests.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Initial check: passed before research. Post-design re-check: passed. The table shows the
post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. Tool, language and CI choices appear only in this plan and research.md |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or spec says "No UI" | N/A | spec.md Design section: "**No UI**: this feature adds or changes no user interface." |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 29 FRs have planned tests below. All are Non-UI. The check enforces this principle in CI from now on (FR-028) |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use Penpot tokens only | N/A | No CV data, no styles |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | N/A | No app, shell or `os-core` code. Matches spec Shell Scope (neither shell) |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | The check runs fully offline, and the permission model enforces it (R9). Tested with a positive control (FR-027) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | N/A | Nothing visitor-facing. The CV path is unchanged |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | N/A | No UI |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | N/A | No visual assets |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | Four packages, two GitHub actions and one test helper are listed below, each with the simpler alternative rejected. No agent skills added. No runtime framework |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One PR from `001-requirement-traceability`. Applying the ruleset is a repository setting made during that PR (quickstart scenario 7), not a separate code change |

## Requirement Traceability

Constitution III. All test files are under `tools/traceability/test/`. Each test or group title
carries the `001-requirement-traceability-FR-###` IDs it covers. "Sample project" means a
temporary project built inline by the `makeProject` helper, unless the seeded one is named.

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
| 001-requirement-traceability-FR-025 | `repo-settings.test.ts`, static: `ci.yml` and `.github/rulesets/main.json` satisfy every **[tested]** point of [contracts/ci.md](./contracts/ci.md). Live enforcement is verified by quickstart scenario 7 | Non-UI |
| 001-requirement-traceability-FR-026 | `cli.test.ts`, integration: `npm run traceability` and a direct run of the CLI with the same flags print the same report. The CI job runs exactly `npm run traceability` (also asserted in `repo-settings.test.ts`) | Non-UI |
| 001-requirement-traceability-FR-027 | `cli.test.ts`, integration: the check runs and passes under the permission flags with no network grant. A positive-control script under the same flags fails `fetch` with `ERR_ACCESS_DENIED` | Non-UI |
| 001-requirement-traceability-FR-028 | `self-check.test.ts`, integration: the check on the real repository passes and counts `001-requirement-traceability` among the approved specs | Non-UI |
| 001-requirement-traceability-FR-029 | `check.test.ts`, integration: a test file with a syntax error and an unreadable `spec.md` produce `unreadable-file`. The broken file's references are not used | Non-UI |

Success criteria without an FR are also tested:

- SC-001: `cli.test.ts` compares the seeded sample project's report with its
  `expected-report.txt`.
- SC-004: `performance.test.ts` runs 50 generated specs and 2,000 tests in under 10 s. The time
  is asserted off CI only, because SC-004 is about the owner's machine.
- SC-003 and SC-007 are covered by FR-025 and FR-022 above, plus quickstart.md.

## Dependencies, Skills & Abstractions

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `oxc-parser` (exact pin) | dev dependency, loaded by the check | Parses JS, TS, JSX and TSX test files and UI source into a tree with offsets and a syntax-error list. That's how titles, groups, skip marks and `data-req` are read (FR-010 to FR-013, FR-029) | Text search can't tell a title from a comment or see groups and skips (R4). TypeScript 7 has no stable parse API, TypeScript 6's is frozen and 23 MB, and Babel throws on some syntax errors (R5) | Yes: the Oxc project (VoidZero, now part of Cloudflare) |
| `vitest` | dev dependency | Runs the check's tests and becomes the project's unit test runner. Its config imports the check's file-selection constants, so the runner and the check agree on what a test is (R3) | `node:test` has no exclude patterns and no tags, so the runner's and the check's file lists would drift (R3) | Yes: the Vitest team |
| `typescript` | dev dependency | `tsc --noEmit` typechecks the code. Node's type stripping removes types without checking them | Without it, type annotations would be unchecked comments | Yes: Microsoft |
| `@types/node` | dev dependency | Type declarations for Node built-ins (`node:fs`, `node:path`, `node:child_process`) used in the typecheck | Node ships no type declarations of its own | No: DefinitelyTyped (community, hosted by Microsoft). It's the standard source of Node's types |
| `actions/checkout`, `actions/setup-node` (pinned SHAs) | CI actions | Check out the code and install Node from `.nvmrc` with an npm cache | Hand-written shell steps would reimplement both | Yes: GitHub |
| `makeProject` test helper | abstraction (test-only) | Writes a sample project from inline file contents to a temporary directory, so each test shows its input next to its assertion | One committed fixture folder per test would scatter dozens of tiny projects. The one seeded project that's worth reading is committed (R13) | N/A |

No runtime dependencies are added for the site. The check's own source is a set of plain
modules with no classes, plugins or configuration file.

## Project Structure

### Documentation (this feature)

```text
specs/001-requirement-traceability/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R13; Appendix A: Playwright notes
├── data-model.md        # Phase 1: entities, rules, classification
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── cli.md           # Command, exit codes, report format
│   └── ci.md            # Pull-request workflow and ruleset
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

There is no `design/` folder because the feature has no UI.

### Source Code (repository root)

```text
package.json             # private; scripts: traceability, test, typecheck; engines.node >=26
package-lock.json
.nvmrc                   # 26
.gitignore               # node_modules/
tsconfig.json            # noEmit, erasableSyntaxOnly, verbatimModuleSyntax, module nodenext;
                         # excludes **/__fixtures__/**
vitest.config.ts         # include/exclude built from tools/traceability/src/files.ts

.github/
├── workflows/
│   └── ci.yml           # jobs: traceability, test (contracts/ci.md)
└── rulesets/
    └── main.json        # ruleset for main, applied with gh api (contracts/ci.md)

tools/
└── traceability/
    ├── src/
    │   ├── main.js        # entry point, plain JS: checks the Node version, then loads cli.ts
    │   ├── node-version.js # refuses Node versions that can't block the network
    │   ├── cli.ts         # arguments, exit codes, prints the report
    │   ├── check.ts       # one run over a root directory → Report
    │   ├── files.ts       # directory walk + shared include/exclude constants
    │   ├── specs.ts       # Status and Functional Requirements entries from spec.md
    │   ├── ids.ts         # full-ID grammar, token finding, reference classification
    │   ├── source.ts      # oxc-parser wrapper: parse errors, offset → line/column
    │   ├── test-files.ts  # tests and groups: titles, tags, inactive marks
    │   ├── ui-files.ts    # data-req attributes
    │   └── report.ts      # problem ordering and text rendering
    └── test/
        ├── helpers/
        │   └── project.ts # makeProject: temporary sample projects from inline files
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
        ├── repo-settings.test.ts
        ├── self-check.test.ts
        └── performance.test.ts
```

**Structure Decision**: the repository has no application code yet, so this feature creates
only the root toolchain files, the CI files and `tools/traceability/`.

- `tools/` holds repository tooling that is never shipped to visitors. It sits apart from the
  future site code, so no shell or app ever depends on it.
- Tests sit next to the tool they test, in `tools/traceability/test/`.
- `packages/content`, `os-core`, the shells, the apps, the token output and `/cv` aren't created
  here. The first plan that needs each one decides its path, and may convert the root
  `package.json` to npm workspaces then.

Conventions set here for later features:

- Test files are named `*.test.ts(x)` or `*.spec.ts(x)`. Requirement IDs go in test or group
  titles.
- Sample projects for tool tests live in `__fixtures__/` folders.
- Every pull request must pass `traceability` and `test`.
- A plan that adds another test runner, such as Playwright for end-to-end tests, extends the
  check's test reader for that runner's syntax in the same pull request, with tests. Until then,
  the guarantee that unrecognized syntax never counts as coverage holds only for Vitest. For
  example, Playwright's bare `test.skip()` inside a group would leave the group's other tests
  counting (research.md, R4 and Appendix A).

## Complexity Tracking

No violations. Every Constitution Check row is Pass or N/A, so nothing needs justifying here.
