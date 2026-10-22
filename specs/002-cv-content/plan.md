# Implementation Plan: CV Content Source

**Branch**: `002-cv-content` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-cv-content/spec.md`

**Design**: No UI (spec.md, Design section)

## Summary

The owner's CV moves into `packages/content/resume.json`, a strict JSON Resume 1.3.1 document,
next to a separate site data document, `site.json`, with its own JSON Schema rules. Both become
the `@cv/content` package, which every later feature imports.

A new check, `npm run content-check`, validates both documents in one offline run:

- the CV against the official schema, with unknown fields rejected at every depth;
- the rules the schema can't express: real dates, end after start, newest-first order,
  duplicates, trimmed text, placeholders, and the country code, email and URL formats;
- site data against its rules, and its references against CV entries;
- the owner's name, email and phone (when published), searched for in the site's own source.

It prints every problem as `file:line:column` with the field path, followed by a summary. A new
CI job, `content`, runs the same command on every pull request, and the ruleset makes it
required.

Technical approach (details in [research.md](./research.md)):

- **Official schema**: JSON Resume 1.3.1, the latest release, read from the vendor's
  `@jsonresume/schema` package pinned exactly, never fetched at check time (R2).
- **Validation**: `jsonschema`, the validator JSON Resume's own package uses, on a schema derived
  in code that forbids unknown fields and leaves formats to the check's own rules (R3, R4).
- **Positions**: `jsonc-parser` locates syntax errors and every field (R5).
- **Shape for code**: TypeScript types generated from the same derived schemas, with every CV
  field optional and no index signatures, so `npm run typecheck` enforces FR-027. A test fails
  when the generated file is stale (R10).
- **No network**: Node's permission model, as in 001 (R12).

## Technical Context

**Language/Version**: TypeScript with erasable syntax only, run directly by Node.js 26, as set
by 001. JSON documents in UTF-8.

**Primary Dependencies**: `@jsonresume/schema` 1.3.1 (the official schema), `jsonschema` 1.5.0
and `jsonc-parser` 3.3.1, all pinned exactly and loaded by the check. The `@cv/content` package
has no dependencies.

**Storage**: files in the repository. `resume.json`, `site.json`, the site data rules
(`schemas/site.schema.json`) and a generated TypeScript file under `packages/content/`. The
official schema is read from the installed `@jsonresume/schema` package. The check writes nothing.
`npm run content-shape` writes only `shape.generated.ts`.

**Testing**: Vitest (`npm test`), `tsc --noEmit` (`npm run typecheck`), and a spawned `tsc` run on
a fixture project for FR-027.

**Target Platform**: Node.js 26 on macOS (owner) and Linux (GitHub Actions `ubuntu-latest`).

**Project Type**: a content package (data plus types) and a repository CLI check, plus one CI job
and a ruleset change.

**Shells**: None. The spec's Shell Scope says neither shell is affected.

**Offline Approach**: the content is in the repository. The check reads only local files, and
runs under `node --permission` with no network grant, so any network call fails in the runtime
(R12). The official schema comes from a pinned package installed by `npm ci` (R2). Only
`npm ci` uses the network.

**Performance Goals**: the whole repository in under 10 seconds on the owner's machine
(SC-006). Two small documents and a few dozen text files, so Node start-up dominates.

**Constraints**:

- no network (FR-035), no writes, byte-identical reports across runs and machines (FR-031,
  FR-034);
- the CV document must stay readable by JSON Resume tools unchanged (SC-002);
- the repository is public: the CV holds only what the owner publishes (FR-003).

**Scale/Scope**: 1 CV document (about 250 lines), 1 site data document, 36 requirements. The
shape test spawns `tsc` once.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Initial check: passed before research. Post-design re-check: passed. The table shows the
post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. File names, tools, schema drafts and CI choices appear only in this plan, research.md and the contracts |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or spec says "No UI" | N/A | spec.md Design section: "**No UI**: this feature adds or changes no user interface." |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 36 FRs (FR-001 to FR-036) have planned tests below. All are Non-UI |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use Penpot tokens only | Pass, with one recorded exception | This feature creates `packages/content` as the only source of CV facts, and the key facts search blocks merge when the name, email or phone is hardcoded elsewhere in the site (FR-022). Other CV facts, such as employer names, are left to the owner's review before merge (spec Assumptions, "Unlisted facts"). The ruleset requires no approving review, so no automated gate blocks those. "Exactly one edit" has one exception, recorded in Complexity Tracking: renaming an entry that site data refers to. No styles |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | N/A | No app, shell or `os-core` code. `packages/content` is the shared package Principle V names. Matches spec Shell Scope (neither shell) |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | Content is local, the schema comes from an installed package, and the check runs under the permission model with no network grant. Tested with a positive control (FR-035) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | N/A | Nothing visitor-facing. The package exports plain data, which a server-rendered `/cv` can import |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | N/A | No UI |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | N/A | No visual assets. No photo is published (FR-003) |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | Three packages, the workspace, three small abstractions and one test helper are listed below, each with the simpler alternative rejected. No agent skills added |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One PR from `002-cv-content`. Applying the updated ruleset is a repository setting made during that PR (quickstart scenario 10) |

## Requirement Traceability

Constitution III. Test files are under `tools/content-check/test/` unless a path says otherwise.
Each test or group title carries the `002-cv-content-FR-###` IDs it covers. "Sample project"
means a temporary project built inline with 001's `makeProject` helper. Titles hold only full,
existing IDs, because the traceability check reads them (R14).

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 002-cv-content-FR-001 | `packages/content/test/content.test.ts`: the CV document exists at `packages/content/resume.json` and passes the check. `schema.test.ts`: the schema the check loads comes from `@jsonresume/schema` at exactly 1.3.1 and declares the sections in the spec's Key Entities | Non-UI |
| 002-cv-content-FR-002 | `packages/content/test/content.test.ts`: `basics.name`, `label`, `summary`, `location` and `profiles`, and `work`, `education`, `skills`, `projects`, `languages` and `interests` are present and non-empty in the real CV | Non-UI |
| 002-cv-content-FR-003 | `packages/content/test/content.test.ts`: the real CV has `basics.email` and no `basics.phone`, `basics.image` or `location.address`, and no empty-string value anywhere | Non-UI |
| 002-cv-content-FR-004 | `site-data.test.ts`: the site data document is read from its own file. A site-only field added to a sample CV is `undefined-field`, and the same field in site data with a rule is accepted | Non-UI |
| 002-cv-content-FR-005 | `site-data.test.ts`: the real rules file is a draft-07 schema the check loads. A sample site data value outside its `enum`, a wrong type and a missing `required` field each give `schema-violation` | Non-UI |
| 002-cv-content-FR-006 | `site-data.test.ts`: every identifying field of every entry kind is a property of that list's items in the official schema. A reference resolves by those values alone | Non-UI |
| 002-cv-content-FR-007 | `schema.test.ts`: the derived schema differs from the official one only by `additionalProperties: false` and removed `format`s. `check.test.ts`: a sample with `work` as an object gives `schema-violation` at `work` | Non-UI |
| 002-cv-content-FR-008 | `schema.test.ts`: `basics.picture` and `work[0].featured` (US1 scenarios 2 and 3), and unknown fields in `basics.location`, `meta` and `projects[0]`, each give `undefined-field` at the key's line and column | Non-UI |
| 002-cv-content-FR-009 | `dates.test.ts`: `2018`, `2018-07` and `2018-07-29` pass, including in `certificates[].date`. `2018/07`, `July 2018`, `18-07`, `2020-13`, `2021-02-30` and `2023-02-29` give one `invalid-date` each. `2024-02-29` passes | Non-UI |
| 002-cv-content-FR-010 | `dates.test.ts`: an end of `2017` after a start of `2018-09` gives `end-before-start`. `2020-05` to `2020`, and equal dates, pass | Non-UI |
| 002-cv-content-FR-011 | `dates.test.ts`: a work entry starting `2018-07` with no end date passes and counts as ongoing (US1 scenario 4) | Non-UI |
| 002-cv-content-FR-012 | `resume-rules.test.ts`: `Romania`, `ro` and `XK` as country codes, `alex@` and `a b@c.d` as emails, and `github.com/x`, `mailto:a@b.c` and `ftp://x.y` as URLs (including `basics.image`) each give `invalid-format`. `RO`, a WHATWG-valid email and `https://` URLs pass. The country list cross-checks with `Intl.DisplayNames` | Non-UI |
| 002-cv-content-FR-013 | `resume-rules.test.ts`: `"projects": []`, and a CV with every optional section left out, give no problems | Non-UI |
| 002-cv-content-FR-014 | `resume-rules.test.ts`: the same project twice and the same profile network twice give one `duplicate-entry` each, naming every path. Two roles at one company with different start dates, and entries missing different identifying fields, are not duplicates | Non-UI |
| 002-cv-content-FR-015 | `resume-rules.test.ts`: `"Politehnica University of Timișoara "`, a leading space in a highlight and a trailing tab give `untrimmed-text` | Non-UI |
| 002-cv-content-FR-016 | `resume-rules.test.ts`: URLs on `example.com`, `www.example.org` and `example.net` give `placeholder`. `example.community` doesn't. The owner's original `meta` values each give `placeholder` | Non-UI |
| 002-cv-content-FR-017 | `site-data.test.ts`: a sample site data field the rules don't define gives `undefined-field` at its path, at any depth (US2 scenario 4) | Non-UI |
| 002-cv-content-FR-018 | `site-data.test.ts`: a project reference to a renamed project, a profile reference to a missing network, a work reference with a wrong position, and a string where an object reference is needed each give `dangling-reference` with path, value and kind (US2 scenarios 2 and 3) | Non-UI |
| 002-cv-content-FR-019 | `site-data.test.ts`: a reference to a project listed twice gives `ambiguous-reference` naming both paths, and the CV gives `duplicate-entry` | Non-UI |
| 002-cv-content-FR-020 | `text.test.ts`: the check reports no problem for non-ASCII text, and a sample written in NFD reads back with the same code points, not NFC. `packages/content/test/content.test.ts`: `Timișoara` in the real CV reads back through `@cv/content` identical to the file's bytes (US1 scenario 5) | Non-UI |
| 002-cv-content-FR-021 | `text.test.ts`: NFC and NFD spellings of the same name are duplicates, resolve the same reference, and match the same key fact | Non-UI |
| 002-cv-content-FR-022 | `facts.test.ts`: the email, name and phone in site source each give `hardcoded-fact` at file, line and column. The email in site data gives the site-data detail (US2 scenario 5, US3 scenario 1) | Non-UI |
| 002-cv-content-FR-023 | `facts.test.ts`: after changing the email in a sample CV, the search reports the new address and not the old one. A CV with no phone searches for name and email only (US3 scenarios 4 and 6) | Non-UI |
| 002-cv-content-FR-024 | `facts.test.ts`: the name in `specs/`, `docs/`, a `README.md`, a `LICENSE`, a test file, a `test/` helper, an `__fixtures__` file, `tools/`, `node_modules/`, a dot-directory, a `*.generated.ts`, a root `package.json` and the CV is not reported. A new root file and `site.json` are searched (US3 scenario 5) | Non-UI |
| 002-cv-content-FR-025 | `facts.test.ts`: `ALEX PROFIR`, `Alex  Profir` and an upper-case email are reported. A made-up phone `+44 20 7946 0958` (a range reserved for fiction) in a sample CV matches `+442079460958`, `0044 20-7946-0958`, `(020) 7946.0958` and `20 7946 0958`, but not `20 7946 09581` (US3 scenarios 2 and 3) | Non-UI |
| 002-cv-content-FR-026 | `shape.test.ts`: regenerating the shape gives the committed `shape.generated.ts`. Every `Resume*` property is optional. A sample rules field appears in the generated types with no other edit (US4 scenario 5). Unsupported keywords stop the generator | Non-UI |
| 002-cv-content-FR-027 | `shape.test.ts`: `tsc` on the `__fixtures__/shape` project passes the file that handles a missing `basics.name`, and fails the files reading `basics.nickname`, using `basics.name` as present and using `work[0].endDate` as present, naming the field and `file(line,column)` (US4 scenarios 1 to 4) | Non-UI |
| 002-cv-content-FR-028 | `check.test.ts`: a sample with problems of many types reports all of them in one run. An unreadable site data document still lets CV rules and the key facts search run | Non-UI |
| 002-cv-content-FR-029 | `json.test.ts`: a missing comma, a trailing comma, an unclosed string, a byte order mark and invalid UTF-8 give `unreadable-document` at the right line and column. `report.test.ts`: every problem line has file, line, column, type, subject and detail | Non-UI |
| 002-cv-content-FR-030 | `report.test.ts`: the summary lists the three files and their states, fact kinds, files searched and skipped, checks not run and every problem type with zeros. Passing, failing and "could not run" wording, singular and plural | Non-UI |
| 002-cv-content-FR-031 | `report.test.ts`: two runs give identical output, and the order doesn't depend on discovery order or locale | Non-UI |
| 002-cv-content-FR-032 | `check.test.ts`: a missing CV document, site data document or rules file gives `missing-document` and exit code 1. Any problem gives `fail`, none gives `pass` and 0 | Non-UI |
| 002-cv-content-FR-033 | `repo-settings.test.ts`: `ci.yml` has the `content` job with the steps and restrictions in [contracts/ci.md](./contracts/ci.md), and the ruleset requires `content`. Live enforcement is quickstart scenario 10 | Non-UI |
| 002-cv-content-FR-034 | `cli.test.ts`: `npm run --silent content-check` and a direct run with the same flags print the same report. The CI job runs exactly `npm run content-check` | Non-UI |
| 002-cv-content-FR-035 | `cli.test.ts`: the check passes under the permission flags with no network grant on a CV whose `$schema` is a remote URL. A positive-control script under the same flags fails `fetch` with `ERR_ACCESS_DENIED` | Non-UI |
| 002-cv-content-FR-036 | `dates.test.ts`: an ongoing project after a finished one, and `2019-06` after `2018-08`, give `out-of-order` naming the entry to come before. Equal dates at shared precision, and undated entries, pass. `2020-01`, `2020`, `2020-05` gives one problem, for `2020-05` | Non-UI |

Success criteria without an FR of their own are also tested:

- SC-001: `cli.test.ts` compares each seeded sample's report with its `expected-report.txt`.
  `seeded/` holds every problem type that leaves all parts running, and every edge case in the
  spec. Third-party code and version-control data can't be committed inside a sample, so the test
  adds them to a copy of `seeded/` and expects the same report. `seeded-broken/` holds an
  unreadable site data document and a missing rules file, which stop the site data and
  reference parts. Between them, every problem type has a non-zero count (R14).
- SC-002: the first tool is JSON Resume's own validator: `portability.test.ts` validates the real
  CV with `@jsonresume/schema`. The second, independent tool is the separately published theme
  `jsonresume-theme-even`, which renders the CV through `resumed` in quickstart scenario 9.
  `resumed` validates with the same `@jsonresume/schema`, so its `validate` step doesn't count as
  a second tool.
- SC-003: `self-check.test.ts` runs the check on a copy of the real content with a changed email
  and asserts it still passes.
- SC-004: covered by FR-018 above.
- SC-006: `performance.test.ts` runs the check on the real repository in under 10 s, asserted off
  CI only, as in 001.
- SC-008: `self-check.test.ts` runs the check on the real repository and asserts it passes.

## Dependencies, Skills & Abstractions

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `jsonschema` 1.5.0 (exact pin) | dev dependency, loaded by the check | Validates both documents against their draft-07 schemas and reports every error with its path (FR-007, FR-017). Its attribute hook collects references (R3, R7) | Ajv adds four transitive packages, where `jsonschema` is already installed as `@jsonresume/schema`'s only dependency. A hand-written validator wouldn't be "the official schema" (R3) | No: Tom de Grunt and contributors. It's the validator JSON Resume's own `@jsonresume/schema` package uses. JSON Schema has no vendor implementation |
| `jsonc-parser` 3.3.1 (exact pin) | dev dependency, loaded by the check | Gives syntax errors with offsets and a tree that maps every field path to a line and column (FR-029, SC-007) | `JSON.parse` gives positions only in some error messages and none for valid documents. A hand-written parser duplicates a vendor package (R5) | Yes: Microsoft (VS Code's JSON parser) |
| `@jsonresume/schema` 1.3.1 (exact pin) | dev dependency, loaded by the check | Ships the official JSON Resume 1.3.1 schema, read from disk so the check stays offline (FR-007, FR-035). Its validator also checks the real CV in `portability.test.ts` (SC-002) (R2) | Fetching the schema breaks FR-035. A vendored copy with a hash test would duplicate the vendor's own pinned package | Yes: JSON Resume |
| npm workspace `@cv/content` | abstraction (package boundary) | Gives every later feature one import path for CV data (Constitution IV), used by the shape tests as later features will use it (R1) | Relative imports into `packages/content/src` would spread through every later feature, and the first consumer would need the workspace anyway | N/A |
| `deriveSchema` | abstraction | One function makes both schemas strict and moves formats to the check's rules, so the validator and the shape generator read the same rules (FR-008, FR-026, R4) | A separate unknown-field walk would duplicate the validator's traversal. A hand-edited strict copy of the schema wouldn't be the official file | N/A |
| Shape generator (`shape.ts`, `npm run content-shape`) | abstraction | Turns the derived schemas into TypeScript types for FR-026 and FR-027, about 150 lines for a fixed keyword subset (R10) | `json-schema-to-typescript` brings eight dependencies, Prettier among them, with formatting that shifts between versions. `json-schema-to-ts` needs schemas as TS literals. Hand-written types break FR-026 | N/A |
| Shared helpers from 001 | reuse | `isExcludedDir`, `isTestFile` and `compare` are imported from `tools/traceability`, and `nodeVersionProblem` gains a check-name parameter, so both checks agree on what a test and a skipped directory are (R9, R11) | Copies would drift | N/A |
| Test helper `tools/content-check/test/helpers/cli.ts` | abstraction (tests only) | `runCli` spawns the check with the script's permission flags. `SAMPLE_RESUME` and `contentFiles` give the tests one small valid CV and the three fixed document paths, so each test states only what it changes (R14) | Writing a full valid CV inline in each of about 15 test files would repeat it, and a rule change would need edits in all of them. It builds on 001's `makeProject` instead of copying it | N/A |

No runtime dependency is added for the site. `@cv/content` itself depends on nothing. The
check's source is plain modules, with no classes, plugins or configuration file.

## Project Structure

### Documentation (this feature)

```text
specs/002-cv-content/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R15
├── data-model.md        # Phase 1: documents, entry kinds, problems, report
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── cli.md               # Command, exit codes, report format
│   ├── content-package.md   # What @cv/content exports and guarantees
│   ├── site-data-rules.md   # Rules format, references, how to add site data
│   └── ci.md                # The content job and the ruleset change
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

There is no `design/` folder because the feature has no UI.

### Source Code (repository root)

```text
package.json             # + "workspaces": ["packages/*"]; scripts content-check, content-shape;
                         #   devDependencies @jsonresume/schema, jsonschema, jsonc-parser
package-lock.json
tsconfig.json            # include + packages/**/*.ts; resolveJsonModule: true

.github/
├── workflows/
│   └── ci.yml           # + job content (contracts/ci.md)
└── rulesets/
    └── main.json        # + required check content

packages/
└── content/             # @cv/content, all CV data (Constitution IV)
    ├── package.json     # private, type module, exports ./src/index.ts, no dependencies
    ├── resume.json      # CV document, JSON Resume 1.3.1 (FR-001 to FR-003)
    ├── site.json        # site data document (FR-004)
    ├── schemas/
    │   └── site.schema.json   # site data rules (FR-005)
    ├── src/
    │   ├── index.ts             # exports resume, siteData and the types
    │   └── shape.generated.ts   # generated by npm run content-shape (R10)
    └── test/
        └── content.test.ts      # the real CV: FR-001 to FR-003, FR-020

tools/
├── traceability/
│   ├── src/node-version.js      # nodeVersionProblem takes the check's name
│   ├── src/main.js              # passes 'traceability check'
│   └── test/cli.test.ts         # passes the name in the existing calls
└── content-check/
    ├── src/
    │   ├── main.js          # entry point, plain JS: checks the Node version, loads cli.ts
    │   ├── cli.ts           # arguments, exit codes, prints the report
    │   ├── check.ts         # one run over a root directory → Report
    │   ├── paths.ts         # fixed document paths
    │   ├── json.ts          # read + parse with positions; field path → Location
    │   ├── schema.ts        # deriveSchema, date-field discovery, validator wrapper
    │   ├── formats.ts       # email, web address, country code
    │   ├── countries.ts     # ISO 3166-1 alpha-2 codes
    │   ├── entries.ts       # entry kinds, identifying fields, NFC identity
    │   ├── resume-rules.ts  # dates, order, duplicates, trimming, placeholders
    │   ├── site-data.ts     # rules validation, reference collection and resolution
    │   ├── facts.ts         # key facts, file walk, matching
    │   ├── shape.ts         # derived schema → TypeScript
    │   ├── generate-shape.ts # npm run content-shape
    │   └── report.ts        # problem ordering and text rendering
    └── test/
        ├── helpers/
        │   └── cli.ts       # runCli with the script's permission flags; SAMPLE_RESUME, contentFiles
        ├── __fixtures__/
        │   ├── seeded/      # every type that leaves all parts running + expected-report.txt (SC-001)
        │   ├── seeded-broken/ # unreadable site data, missing rules + expected-report.txt (SC-001)
        │   ├── references/  # a sample with project references (quickstart scenario 4)
        │   └── shape/       # tsconfig + files for the FR-027 tsc run
        ├── schema.test.ts
        ├── json.test.ts
        ├── dates.test.ts
        ├── resume-rules.test.ts
        ├── site-data.test.ts
        ├── text.test.ts
        ├── facts.test.ts
        ├── shape.test.ts
        ├── report.test.ts
        ├── check.test.ts
        ├── cli.test.ts
        ├── repo-settings.test.ts
        ├── self-check.test.ts
        ├── portability.test.ts
        └── performance.test.ts
```

001's `tools/traceability/test/repo-settings.test.ts` changes too: its exact-match assertion on
the ruleset's rules now includes `content`.

**Structure Decision**:

- `packages/content` is created here, as Constitution IV requires, and becomes the first npm
  workspace. It holds data, rules and types only. No tooling.
- The check lives in `tools/content-check/`, beside `tools/traceability/`, following 001's
  layout. It reuses 001's directory exclusions, test-file definition, ordering and Node version
  gate, so the two checks can't disagree on what a test is.
- Package tests sit in `packages/content/test/`. Tool tests sit in `tools/content-check/test/`.
  Both match the Vitest globs set by 001.
- `os-core`, the shells, the apps, the token output and `/cv` aren't created here.

Conventions set here for later features:

- Read CV data only through `@cv/content`. Never copy a CV fact into code or site data.
- Add site data with its rules and a regenerated shape, in one change
  ([contracts/site-data-rules.md](./contracts/site-data-rules.md)).
- Site source belongs under `packages/` or `apps/`. Root-level files are repository tooling, and a
  new one is searched for key facts until it's added to the tooling list (R9).
- Every pull request must pass `traceability`, `test` and `content`.

## Complexity Tracking

One exception, to Constitution IV's "changing a CV fact takes exactly one edit". Every other
Constitution Check row is Pass or N/A.

| Exception | Why it's needed | Simpler alternative rejected because |
|-----------|-----------------|--------------------------------------|
| Renaming or removing a CV entry that site data refers to takes a second edit, in site data (FR-006, SC-003, SC-004) | JSON Resume entries have no id field, so a reference can only name an entry by a value it already carries, such as a project's name. The check fails until site data is updated (FR-018), so the second edit can't be missed. Facts that aren't referred to, such as the email, still take exactly one edit | *Stable ids in the CV*: they aren't fields of the standard, so FR-008 rejects them, and every other JSON Resume tool would carry them (SC-002). *References by list position*: reordering entries newest first (FR-036) would silently point them at another entry, with no failure |
