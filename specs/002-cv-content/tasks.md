---

description: "Task list for the CV content source"
---

# Tasks: CV Content Source

**Input**: Design documents from `/specs/002-cv-content/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/cli.md](./contracts/cli.md),
[contracts/content-package.md](./contracts/content-package.md),
[contracts/site-data-rules.md](./contracts/site-data-rules.md),
[contracts/ci.md](./contracts/ci.md), [quickstart.md](./quickstart.md). No `design/` folder: the
spec says **No UI**.

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `002-cv-content-FR-###` IDs it covers, and every FR in
spec.md (FR-001 to FR-036) is covered by at least one test task (see Requirement Coverage at the
end).

**Organization**: Tasks are grouped by user story. US1 builds the content package, the CV
document and the check itself. US2, US3 and US4 each add one part on top of US1 and don't depend
on each other. The pull-request check (FR-033) isn't a user story, so it has its own phase after
the stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 002-cv-content-FR-009"

## Path Conventions

- CV data: `packages/content/` (Constitution IV): `resume.json`, `site.json`,
  `schemas/site.schema.json`, `src/index.ts`, `src/shape.generated.ts`, `test/content.test.ts`
- Check source: `tools/content-check/src/`
- Check tests: `tools/content-check/test/`, helper in `tools/content-check/test/helpers/cli.ts`,
  committed samples in `tools/content-check/test/__fixtures__/`
- Shared code from 001: `tools/traceability/src/files.ts` (`isExcludedDir`, `isTestFile`),
  `tools/traceability/src/report.ts` (`compare`, `Location`), `tools/traceability/src/node-version.js`,
  `tools/traceability/test/helpers/project.ts` (`makeProject`, `REPO_ROOT`)
- Root toolchain: `package.json`, `package-lock.json`, `tsconfig.json`
- CI and merge rule: `.github/workflows/ci.yml`, `.github/rulesets/main.json`
- No `os-core`, shells, apps, token output or `/cv` are touched (plan.md Structure Decision)

## Rules that apply to every task

- **Privacy (FR-003)**: the repository is public. Never write the owner's phone number, street
  address or any other unpublished detail into any file, test, fixture, commit message or PR
  text. The owner's current CV contains a phone number: it is dropped, not copied anywhere. Test
  phone numbers use the made-up `+44 20 7946 0958`, from a range reserved for fiction.
- Code uses erasable TypeScript only (no enums, namespaces or parameter properties). Relative
  imports use explicit `.ts` extensions. Modules are plain functions: no classes, plugins or
  configuration file (plan Dependencies table).
- The check reads files with synchronous `node:fs` calls, writes nothing and makes no network
  calls (FR-035). Only `npm run content-shape` writes, and only `shape.generated.ts`.
- Sorting always uses 001's `compare` (code-unit order), never `localeCompare` (FR-031).
- Lines and columns count from 1. Columns count UTF-16 code units (data-model.md Location).
- Values inside problem details are written with `JSON.stringify` (research R11). Every problem
  detail and stderr message is exactly as listed in contracts/cli.md (Details and Output
  streams). The wording in the tasks below repeats it for convenience. If the two differ, the
  contract wins.
- **Test titles**: every test or `describe` title carries only full, existing IDs, e.g.
  `describe('002-cv-content-FR-009: dates are a year, a year and month, or a full date', …)`. One
  `describe` group per requirement works well. Titles and tags must contain no other `fr-` text in
  any letter case, because 001's traceability check reads them (research R14). Sample values go in
  test bodies. Tests for success criteria without an FR use titles such as
  `describe('seeded samples (SC-001)', …)`.
- Never write a JSX `data-req` attribute or a `'data-req'` object property anywhere in this
  feature's code or tests. 001's check reads `.ts` files for them.
- No test writes inside the repository. Sample projects come from 001's `makeProject` (temporary
  directories). Tests that read the real repository can run at the same time as others.
- Run everything with Node 26 active (`nvm use`), as the shell's default Node is older.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The `@cv/content` workspace, the three pinned packages, and the scripts and
TypeScript settings the feature needs

- [ ] T001 Create the workspace and scripts (research R1, R10, R12; contracts/cli.md Command):
  - In the root `package.json`, add `"workspaces": ["packages/*"]` and two scripts, keeping the existing three:
    - `"content-check": "node --permission --allow-fs-read=. tools/content-check/src/main.js"` (no network, write or addons grant)
    - `"content-shape": "node tools/content-check/src/generate-shape.ts"`
  - Create `packages/content/package.json`: `"name": "@cv/content"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, and no `dependencies`, `devDependencies`, `author` or `scripts` (contracts/content-package.md Import). It must not contain the owner's name: it's site source, searched for key facts (research R9).
- [ ] T002 Install the dev dependencies, after T001, with Node 26 active and its bundled npm:
  1. `npm install --save-dev --save-exact @jsonresume/schema@1.3.1 jsonschema@1.5.0 jsonc-parser@3.3.1`.
  2. Confirm `package-lock.json` has a single `node_modules/jsonschema` at 1.5.0 (it satisfies `@jsonresume/schema`'s `^1.4.1`), a `node_modules/@cv/content` link to `packages/content`, and no nested `node_modules` under `@jsonresume/schema`.
  3. Commit `package-lock.json`.

  `package.json` must end with exactly seven `devDependencies` (the four from 001 plus these three, each with no `^` or `~`) and no `dependencies` (plan Dependencies table, Constitution X).
- [ ] T003 [P] Update `tsconfig.json` (research R10): add `"packages/**/*.ts"` to `include` and `"resolveJsonModule": true` to `compilerOptions`. Change nothing else. `strict` stays on, `noUncheckedIndexedAccess` stays off, and `exclude` keeps `**/__fixtures__/**`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fixed paths, the shared problem and report types, the shared Node version gate, the
test helper, and the starting site data files. Every story needs them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: omitted. spec.md's Design section says "**No UI**: this feature
adds or changes no user interface."

- [ ] T004 [P] Give 001's Node version gate a check-name parameter (research R11, plan Shared helpers):
  - In `tools/traceability/src/node-version.js`, change the signature to `nodeVersionProblem(version, check)` (JSDoc `@param {string} check`), and the message to `` `${check} needs Node ${REQUIRED_NODE_MAJOR} or later (see .nvmrc) to block network access, but this is Node ${version}` ``.
  - In `tools/traceability/src/main.js`, call it with `'traceability check'`, so 001's message is unchanged.
  - In `tools/traceability/test/cli.test.ts`, pass `'traceability check'` in the existing calls. The expected strings stay the same.
- [ ] T005 [P] Create `tools/content-check/src/paths.ts` (contracts/cli.md fixed paths): `RESUME_FILE = 'packages/content/resume.json'`, `SITE_FILE = 'packages/content/site.json'`, `RULES_FILE = 'packages/content/schemas/site.schema.json'`, `SHAPE_FILE = 'packages/content/src/shape.generated.ts'`, and `OFFICIAL_SCHEMA_VERSION = '1.3.1'`. All are relative to the run root, with `/` separators.
- [ ] T006 [P] Define the shared types in `tools/content-check/src/report.ts`. Rendering comes in T025. Use no enums. The types follow data-model.md:
  - `Location`: import the type from `tools/traceability/src/report.ts`.
  - `PROBLEM_TYPES`: the 14 types as a readonly array, in data-model.md's table order: `unreadable-document`, `missing-document`, `schema-violation`, `undefined-field`, `invalid-date`, `end-before-start`, `invalid-format`, `duplicate-entry`, `out-of-order`, `untrimmed-text`, `placeholder`, `dangling-reference`, `ambiguous-reference`, `hardcoded-fact`. `ProblemType` is its element type.
  - `Problem = { type: ProblemType; subject: string; location: Location; detail: string }`.
  - `DocumentState = 'checked' | 'missing' | 'unreadable'`.
  - `PARTS = ['CV rules', 'site data rules', 'references', 'key facts search']` and `Part`, in that order (contracts/cli.md Summary).
  - `FactKind = 'name' | 'email' | 'phone'`.
  - `Report = { problems: Problem[]; documents: { label: 'CV document' | 'Site data document' | 'Site data rules'; file: string; state: DocumentState }[]; factKinds: FactKind[] | null; filesSearched: number; filesSkipped: number; checksNotRun: Part[]; result: 'pass' | 'fail' }`. `factKinds` is `null` when the CV document couldn't be read. Counts by type are computed when rendering.
- [ ] T007 [P] Create the test helper `tools/content-check/test/helpers/cli.ts` (research R14):
  - Re-export `REPO_ROOT` and `makeProject` from `../../../traceability/test/helpers/project.ts`.
  - `CLI_PATH = path.join(REPO_ROOT, 'tools/content-check/src/main.js')`.
  - `runCli(cwd, args = [])`: `spawnSync(process.execPath, ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, CLI_PATH, ...args], { cwd, encoding: 'utf8' })`, returning `{ status, stdout, stderr }`. No addons, write or network grant: the same grants as the `content-check` script, plus the repository so Node can load the check and its packages.
  - `SAMPLE_RESUME`: a small valid JSON Resume 1.3.1 object with made-up facts and no phone: `basics.name` `"Ioana Testescu"`, `basics.email` `"ioana@cv.test"`, a `location` with `city` and `countryCode: "RO"`, one GitHub profile, one ongoing work entry, two projects newest first. It passes every rule in this spec.
  - `contentFiles({ resume, site, rules, files })`: returns the `Record<string, string>` for `makeProject`. `resume`, `site` and `rules` default to `SAMPLE_RESUME` and the starting `site.json` and rules from contracts/site-data-rules.md. An object value is written as `JSON.stringify(value, null, 2) + '\n'` at its fixed path, a string is written as is (for syntax errors), and `null` leaves the file out (for missing documents). `files` adds any other files.
- [ ] T008 [P] Create the starting site data files exactly as in contracts/site-data-rules.md Starting rules, two-space indentation and a final newline:
  - `packages/content/schemas/site.schema.json`: draft-07, `title` `"Site data"`, `description` `"Data only the site needs. CV facts belong in resume.json."`, `type: "object"`, and `properties` with only `"$schema": { "type": "string" }`.
  - `packages/content/site.json`: `{ "$schema": "./schemas/site.schema.json" }`.
- [ ] T009 Verify the toolchain, after T001 to T008: `npm run typecheck` passes. `npm test` passes, except 001's `tools/traceability/test/self-check.test.ts`, which fails until T061 because 002's spec is Approved and its requirements aren't covered yet. That failure is expected. Any other failure is a defect.

**Checkpoint**: Foundation ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Keep the whole CV in one portable document (Priority: P1) 🎯 MVP

**Goal**: The owner's real CV lives in `packages/content/resume.json` as a strict JSON Resume
1.3.1 document, readable through `@cv/content`. `npm run content-check` reads the three documents,
validates the CV against the official schema with unknown fields rejected at every depth, applies
the CV rules the schema can't express, and prints every problem with `file:line:column`, followed
by the summary. It runs offline and gives the same output every run.

**Independent Test**: run `npm run content-check` on the real repository: it passes and lists the
CV document as checked. Add `"picture"` under `basics` and the check fails, naming
`packages/content/resume.json`, the line and column, and `basics.picture` (spec US1).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.** Sample projects come
> from `makeProject(contentFiles({ … }))`. Most tests call `runCheck(root)` from `src/check.ts`
> in-process and assert on `report.problems` (type, subject, location and detail). Site data,
> references and key facts arrive in later stories and must not change these assertions.

- [ ] T010 [P] [US1] Write `packages/content/test/content.test.ts`. It reads the real CV through `import { resume } from '@cv/content'` and covers 002-cv-content-FR-001, 002-cv-content-FR-002, 002-cv-content-FR-003 and 002-cv-content-FR-020.
  - FR-001: `packages/content/resume.json` exists, its `$schema` is `https://cdn.jsdelivr.net/npm/@jsonresume/schema@1.3.1/schema.json`, and `runCheck(REPO_ROOT)` has no problem whose `location.file` is the CV document.
  - FR-002: `basics.name`, `basics.label`, `basics.summary` are non-empty strings. `basics.location` is a non-empty object. `basics.profiles`, `work`, `education`, `skills`, `projects`, `languages` and `interests` are non-empty arrays.
  - FR-003: `basics.email` is a non-empty string. `basics.phone`, `basics.image` and `basics.location.address` are `undefined`. A recursive walk finds no string value equal to `''` anywhere.
  - FR-020 (US1 scenario 5): `resume.basics?.location?.city` is `'Timișoara'`, and `Buffer.from(value)` equals the bytes of that value in the file as read with `fs.readFileSync`. The same holds for `education[0].institution`, `'Politehnica University of Timișoara'`. Nothing is trimmed or normalized.
- [ ] T011 [P] [US1] Write `tools/content-check/test/schema.test.ts`. It covers 002-cv-content-FR-001, 002-cv-content-FR-007 and 002-cv-content-FR-008. It tests `loadOfficialSchema()` and `deriveSchema(schema)` from `src/schema.ts`, and `runCheck` on samples.
  - FR-001: `loadOfficialSchema()` reads `schema.json` from the installed `@jsonresume/schema`, whose `package.json` `version` is exactly `1.3.1`. The schema's top-level `properties` are exactly `$schema`, `basics`, `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, `projects` and `meta` (spec Key Entities).
  - FR-007: walk the official schema and `deriveSchema(official).schema` side by side. The only differences are an added or changed `additionalProperties: false` on every object schema that lists `properties`, and removed `format` keywords. Every removed `format` is listed in the result's `formats`, with its instance path pattern and format name. The input schema object is unchanged (deep-equal to a copy taken before).
  - FR-008 (US1 scenarios 2 and 3): each of these gives exactly one `undefined-field`, located at the property key's line and column, with detail `not a field defined by JSON Resume 1.3.1`:
    - `basics.picture` (subject `basics.picture`);
    - `work[0].featured: true` (subject `work[0].featured`), which the official schema alone would accept;
    - an unknown field in `basics.location`, in `meta` and in `projects[0]`;
    - an unknown top-level field `theme`.
- [ ] T012 [P] [US1] Write `tools/content-check/test/json.test.ts`, covering 002-cv-content-FR-029. It tests `readDocument(root, file)`, `locate(read, path, target)` and `formatPath(path)` from `src/json.ts`.
  - A missing comma, a trailing comma and an unclosed string each give `unreadable-document` with subject the file, the line and column of the first syntax error, and a detail starting `invalid JSON: ` (e.g. `invalid JSON: comma expected`).
  - A file starting with a byte order mark gives `unreadable-document` at `1:1`, detail `starts with a byte order mark`.
  - A file with an invalid UTF-8 byte (`Buffer.from([0x7b, 0x0a, 0xff, 0x7d])`) gives `unreadable-document` at the first invalid byte's line and column (here `2:1`), detail `not valid UTF-8`.
  - A missing file gives state `missing` and `missing-document` at `1:1`, detail `file not found`.
  - `locate` returns the key's position for `'key'`, the value's for `'value'`, and the array item's opening brace for `'entry'`. Lines count `\n`, and a column after `ș` or an emoji counts UTF-16 code units.
  - `formatPath`: `['basics', 'picture']` → `basics.picture`, `['work', 0, 'featured']` → `work[0].featured`, `['basics', 'odd key']` → `basics["odd key"]`, `['1x']` → `["1x"]`, `[]` → `(document)`.
- [ ] T013 [P] [US1] Write `tools/content-check/test/dates.test.ts`. It covers 002-cv-content-FR-009, 002-cv-content-FR-010, 002-cv-content-FR-011 and 002-cv-content-FR-036, through `runCheck` on samples.
  - FR-009: `2018`, `2018-07` and `2018-07-29` pass, in `work[].startDate` and in `certificates[].date`. `2024-02-29` passes. These each give exactly one `invalid-date` and no `schema-violation`:
    - `2018/07`, `July 2018` and `18-07`, with detail `"<value>" is not a date of the form YYYY, YYYY-MM or YYYY-MM-DD`;
    - `2020-13`, `2021-02-30` and `2023-02-29`, with detail `"<value>" is not a real date`.
  - FR-010: an `education[0]` with start `2018-09` and end `2017` gives `end-before-start`, subject `education[0].endDate`, located at the end date's value, detail `"2017" is before the start date "2018-09"`. Start `2020-05` with end `2020`, and equal start and end, pass.
  - FR-011 (US1 scenario 4): a work entry starting `2018-07` with no `endDate` passes, and comes before a finished one without an `out-of-order`.
  - FR-036:
    - an ongoing project listed after a finished one gives `out-of-order` on the ongoing one;
    - `2019-06` listed after `2018-08` gives `out-of-order`, subject the later-listed entry (e.g. `projects[1]`), located at its opening brace, detail `should come before projects[0] (newest first)`;
    - equal dates at shared precision (`2019-06-01` twice; `2020` and `2020-05`) pass in either order;
    - entries with no date, or an invalid one, are not checked for order;
    - the start dates `2020-01`, `2020`, `2020-05` in that order give exactly one problem, for `projects[2]`, naming `projects[0]`;
    - order is also checked in `awards` (`date`), `certificates` (`date`) and `publications` (`releaseDate`), and in `volunteer` and `education`.
- [ ] T014 [P] [US1] Write `tools/content-check/test/resume-rules.test.ts`. It covers 002-cv-content-FR-012, 002-cv-content-FR-013, 002-cv-content-FR-014, 002-cv-content-FR-015 and 002-cv-content-FR-016, through `runCheck` on samples.
  - FR-012: each of these gives one `invalid-format` at the value, with the detail from contracts/cli.md:
    - `basics.location.countryCode` of `Romania`, `ro` or `XK`;
    - `basics.email` of `alex@` or `a b@c.d`;
    - URLs `github.com/x`, `mailto:a@b.c` and `ftp://x.y`, in `basics.url`, `basics.profiles[0].url`, `projects[0].url` and `basics.image`.

    `RO`, `ioana@cv.test` and `https://` URLs pass. A test in the same group checks the committed country list against `Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' })`: it has 249 codes, each uppercase with a display name, and it contains neither `XK` nor `EU`.
  - FR-013: `"projects": []`, and a CV with only `basics.name` and every other section left out, give no problems.
  - FR-014:
    - the same project name twice gives one `duplicate-entry` at the first entry's opening brace, subject `projects[0]`, detail `the same entry is listed 2 times: projects[0], projects[1]`;
    - the same profile network twice gives one, naming `basics.profiles[0]` and `basics.profiles[1]`;
    - two work entries at one company with the same position and different start dates are not duplicates;
    - two education entries missing different identifying fields are not duplicates, and two entries missing the same field with all others equal are;
    - `GitHub` and `github` are different networks.
  - FR-015: `"Politehnica University of Timișoara "`, a highlight with a leading space and a skill keyword with a trailing tab each give `untrimmed-text`, detail `"<value>" has leading or trailing whitespace` (the JSON string shows the space or `\t`).
  - FR-016:
    - URLs on `example.com`, `www.example.org` and `example.net` give `placeholder`, detail `"<value>" is on a reserved example domain`. `https://example.community/` doesn't;
    - the owner's original `meta` values each give `placeholder` with detail `"<value>" is copied from the JSON Resume sample CV`: `canonical` `https://raw.githubusercontent.com/jsonresume/resume-schema/master/sample.resume.json`, `version` `v1.0.0` and `lastModified` `2017-12-24T15:53:00`.
- [ ] T015 [P] [US1] Write `tools/content-check/test/text.test.ts`. It covers 002-cv-content-FR-020 and 002-cv-content-FR-021. US2 and US3 add cases to the FR-021 group.
  - FR-020: a sample CV full of non-ASCII text (`Timișoara`, `Magyar`, `Ελληνικά`, `日本語`, an emoji) gives no problems. A sample whose `basics.location.city` is written in NFD (`'Timișoara'`) reads back through `readDocument` with the same code points, not NFC.
  - FR-021: two projects named `Timișoara Guide`, one in NFC and one in NFD, give one `duplicate-entry`.
- [ ] T016 [P] [US1] Write `tools/content-check/test/report.test.ts`. It covers 002-cv-content-FR-029, 002-cv-content-FR-030 and 002-cv-content-FR-031. It tests `sortProblems` and `renderReport` from `src/report.ts` on hand-built reports, and `runCheck` for determinism.
  - FR-029: every problem line matches `/^[^\s:]+:\d+:\d+ [a-z-]+ .+: .+$/`, carrying file, line, column, type, subject and detail.
  - FR-030: compare whole rendered strings with contracts/cli.md:
    - the passing summary exactly as in the contract;
    - the summary with an unreadable CV document;
    - a failing run with one problem (`FAIL: 1 problem found.`) and with several (`FAIL: 3 problems found.`);
    - ` Some checks could not run.` appended when `checksNotRun` isn't empty;
    - `Key facts searched for:` reading `name, email`, `none`, or `none (the CV document could not be read)`;
    - `Checks not run:` listing parts in `PARTS` order, or `none`;
    - every problem type listed with its count, zeros included, in `PROBLEM_TYPES` order;
    - no problems: the report starts at `Summary`. With problems: problem lines, one empty line, then the summary. The report ends with exactly one `\n`.
  - FR-031: `sortProblems` orders by file in code-unit order (`Z.json` before `a.json`), then line, column, type order and subject. Shuffling the input doesn't change the result. Two `runCheck` runs on the same sample render identical strings.
- [ ] T017 [P] [US1] Write `tools/content-check/test/check.test.ts`. It covers 002-cv-content-FR-007, 002-cv-content-FR-028 and 002-cv-content-FR-032. US3 adds a case to the FR-028 group.
  - FR-007: a sample with `work` as an object gives `schema-violation` with subject `work`, at the value, detail `must be an array, not an object`. `basics.name: 42` gives `must be a string, not a number`.
  - FR-028: a sample with an undefined field, an invalid date, an end before start, an invalid email, a duplicate project, an out-of-order entry, untrimmed text and a placeholder URL reports all eight in one run. A sample whose `site.json` has a syntax error still reports the CV's problems, and its summary shows the site data document `unreadable`.
  - FR-032:
    - a missing CV document, site data document or rules file each gives `missing-document`, subject the file, at `1:1`, and `result` `fail`;
    - with the CV missing, `checksNotRun` lists `CV rules`, `references` and `key facts search`;
    - any problem gives `fail`, none gives `pass`;
    - the CLI exits 1 and 0 for those (via `runCli`).
- [ ] T018 [P] [US1] Write `tools/content-check/test/cli.test.ts`, covering 002-cv-content-FR-034 and 002-cv-content-FR-035.
  - FR-034:
    - in the repository root, `npm run --silent content-check` and `runCli(REPO_ROOT)` print the same stdout and exit with the same code (run npm as `spawnSync(process.execPath, [process.env.npm_execpath, 'run', '--silent', 'content-check'], { cwd: REPO_ROOT, encoding: 'utf8' })`. When `npm_execpath` isn't set, because Vitest was started without npm, use `npm-cli.js` beside `process.execPath` (`../lib/node_modules/npm/bin/npm-cli.js`));
    - `package.json`'s `content-check` script is exactly `node --permission --allow-fs-read=. tools/content-check/src/main.js`;
    - any argument writes `usage: npm run content-check (takes no arguments)` to stderr and exits 2;
    - stdout holds only the report.
  - FR-035:
    - `runCli` on a sample whose CV `$schema` is `https://json-resume.invalid/schema.json` passes, with exit 0;
    - a positive-control script in a temporary directory, run with `--permission --allow-fs-read=<that directory>` and no network grant, calls `fetch('http://127.0.0.1:9/')` and prints the error code, which is `ERR_ACCESS_DENIED`, as 001's FR-027 test does;
    - `nodeVersionProblem('24.21.0', 'content check')` is `content check needs Node 26 or later (see .nvmrc) to block network access, but this is Node 24.21.0`, and `'26.0.0'` gives `null`.
- [ ] T019 [P] [US1] Write `tools/content-check/test/portability.test.ts` (SC-002). Its title has no FR ID, e.g. `describe('the CV is valid for JSON Resume\'s own validator (SC-002)', …)`. Load `@jsonresume/schema`'s `validator.js` with `createRequire(import.meta.url)`. Call its `validate` on the parsed real CV and assert it reports no error.

### Implementation for User Story 1

- [ ] T020 [P] [US1] Convert the owner's current CV into `packages/content/resume.json` (research R15, spec Assumptions). The source is the JSON Resume file the owner attached to the spec. Ask the owner for its location: it stays outside the repository. Change exactly what R15's table lists and nothing else:
  - `$schema` becomes `https://cdn.jsdelivr.net/npm/@jsonresume/schema@1.3.1/schema.json`.
  - Remove `basics.picture`, `basics.image`, `basics.phone`, and `basics.location.address`, `postalCode` and `region`. **Never copy the phone number anywhere.**
  - `basics.location.countryCode` `Romania` becomes `RO`.
  - `work[0].company` becomes `work[0].name`, in the same key position.
  - Remove the trailing space from `education[0].institution`.
  - Remove `meta`.
  - Typo fixes: `Running and stregth training` becomes `Running and strength training`. `…optimized frontend rendering resolving some memory leak` becomes `…optimized frontend rendering, resolving some memory leaks`.
  - Reorder `projects` newest first:
    1. Cybersecurity Mobile Platform (ongoing, from 2022-01-01)
    2. Guided Tours System (2021-10-01)
    3. 3ndy Job Management App (2021-04-01)
    4. Accessibility Management Platform (2020-09-01)
    5. Video Content Management System (2020-08-01)
    6. Incident Response and Management System (2020-01-01)
    7. Sales Management Platform (2019-06-01)
    8. Fitness Administration Platform (2019-06-01; equal to the previous at shared precision, so either order)
    9. Art Gallery Management Platform (2018-08-01)
    10. Retail Dashboard (2018-07-01)

  Keep every other key and value, and the source's key order (`$schema`, `basics`, `work`, `education`, `skills`, `languages`, `interests`, `projects`). Write it as `JSON.stringify(doc, null, 2)` plus a final `\n`, in UTF-8 without a byte order mark. Diff the result against the source and confirm only the listed changes appear.
- [ ] T021 [P] [US1] Implement `tools/content-check/src/json.ts` (research R5, data-model.md DocumentRead, Location and Field path):
  - `readDocument(root, file): DocumentRead`. `DocumentRead` is `{ file; state: 'ok' | 'missing' | 'unreadable'; value?; tree?; lineStarts?; problem? }`.
    - `ENOENT` → `missing`, with `missing-document` at `1:1`, detail `file not found`.
    - Any other read error → `unreadable`, detail `cannot be read: <code>`.
    - Starts with bytes `EF BB BF` → `unreadable` at `1:1`, detail `starts with a byte order mark`.
    - Decode with `new TextDecoder('utf-8', { fatal: true })`. On failure, find the first invalid byte, decode the valid prefix to place it, and give `unreadable` there with detail `not valid UTF-8`.
    - Parse with `jsonc-parser`'s `parseTree(text, errors, { disallowComments: true, allowTrailingComma: false, allowEmptyContent: false })`. On the first error, `unreadable` at its offset, detail `invalid JSON: <reason>`, where the reason is `printParseErrorCode(error.error)` split from PascalCase into lower-case words (`CommaExpected` → `comma expected`).
    - Then `JSON.parse(text)`. If it throws, `unreadable` at `1:1` with `invalid JSON: <its message>`.
    - Every problem's subject is the file path.
  - `locate(read, path, target: 'key' | 'value' | 'entry'): Location`, using `findNodeAtLocation`. `'key'` is the property's key node, `'value'` the value node, `'entry'` the array item node's offset (its opening brace). When the path doesn't exist, fall back to the nearest existing ancestor's value. The root is `1:1` if absent.
  - `offsetToLocation(file, lineStarts, offset)`: binary search over line starts. Column is `offset - lineStart + 1` in UTF-16 code units.
  - `formatPath(path: (string | number)[])`: names matching `/^[A-Za-z_$][A-Za-z0-9_$]*$/` join with `.`. Other names are `[<JSON string>]`, indexes `[n]`. An empty path is `(document)`.
- [ ] T022 [P] [US1] Implement `tools/content-check/src/schema.ts` (research R2, R3, R4, R6):
  - `loadOfficialSchema(): { schema: object; version: string }`. Resolve `@jsonresume/schema/package.json` with `createRequire(import.meta.url)`, from the check's own location, never the run root, so sample projects need no `node_modules`. Read `schema.json` beside it. Throw `Error('@jsonresume/schema 1.3.1 is not installed (run npm ci)')` when either is missing or the version isn't `OFFICIAL_SCHEMA_VERSION`.
  - `deriveSchema(schema): { schema: object; formats: { pattern: string[]; format: string }[] }`. Pure, and it works on a deep copy. Every object schema with `properties` gets `additionalProperties: false`. Every `format` keyword is removed, and its instance path pattern is recorded. Walk `properties`, `items`, `additionalProperties` schemas and `definitions`. Patterns use `*` for array items, and are found through each `$ref`'s use sites.
  - `instancePatterns(schema, test: (node) => boolean): string[][]`: walks `properties` and `items` from the root, following `$ref`s to `#/definitions/<name>` (with a guard against cycles), and returns the instance path pattern of every node where `test` holds. Date fields are `instancePatterns(official, (node) => node.$ref === '#/definitions/iso8601')`. Format locations reuse the same walk.
  - `valuesAt(value, pattern): { path: (string | number)[]; value: unknown }[]`: the values present at a pattern.
  - `validate(schema, value, attributes = {})`: run `jsonschema`'s `Validator` with each `attributes` entry registered in `validator.attributes`. Return every error normalized to `{ keyword: error.name, path: error.path, argument: error.argument }`.
  - `schemaProblems(read, errors, { undefinedDetail, datePatterns })`: map errors to problems (data-model.md Problem rules):
    - `additionalProperties` → `undefined-field`, subject `formatPath([...path, argument])`, located at the key, with `undefinedDetail` (`not a field defined by JSON Resume 1.3.1`, or `not a field defined by the site data rules`).
    - `pattern` on a path matching a date pattern → `invalid-date`, with the form detail from T013.
    - Everything else → `schema-violation`, at the value, with these details:
      - `type`: `must be <a/an> <expected>, not <a/an> <actual>`, with `array`, `object`, `string`, `number`, `integer`, `boolean`, and `null` without an article;
      - `required`: `required field "<name>" is missing`, subject the object's path;
      - `enum`: `must be one of <JSON values joined by ", ">`;
      - `const`: `must be <JSON value>`;
      - `pattern`: `does not match the pattern <JSON pattern>`;
      - `minLength`, `maxLength`, `minimum`, `maximum`, `minItems`, `maxItems`, `uniqueItems`: `breaks the rule <keyword>: <JSON argument>`;
      - otherwise `breaks the rule <keyword>`.
    - One field gets at most one problem of each type (dedupe by type and subject).
- [ ] T023 [P] [US1] Implement the format rules (research R4):
  - `tools/content-check/src/countries.ts`: `COUNTRY_CODES`, a frozen array of the 249 officially assigned ISO 3166-1 alpha-2 codes, uppercase and sorted. No user-assigned or reserved codes (`XK`, `EU`, `UK`).
  - `tools/content-check/src/formats.ts`:
    - `isEmail(value)`: the WHATWG valid email address pattern, verbatim: ``/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/``.
    - `isWebAddress(value)`: no whitespace (`/\s/`), `URL.parse(value)` isn't null, protocol is `http:` or `https:`, and hostname is non-empty.
    - `isCountryCode(value)`: membership in `COUNTRY_CODES`.
    - `FORMAT_RULES`: maps a schema `format` name to its test and its detail: `email` → `"<value>" is not a well-formed email address`; `uri` → `"<value>" is not an absolute web address (http or https)`. The country detail is `"<value>" is not a two-letter ISO 3166-1 country code`.
- [ ] T024 [P] [US1] Implement entry kinds in `tools/content-check/src/entries.ts` (data-model.md Entry and entry kinds, research R8):
  - `ENTRY_KINDS`: for each of the 12 kinds, its list path (`profile` is `['basics', 'profiles']`, `work` is `['work']`, …), its identifying fields, its dating (`range` for `work`, `volunteer`, `education` and `project`; the single field `date` for `award` and `certificate`, `releaseDate` for `publication`; `null` for the rest), and its singular and plural nouns for details:
    - `profile`/`profiles`, `work entry`/`work entries`, `volunteer entry`/`volunteer entries`, `education entry`/`education entries`;
    - `project`, `skill`, `interest`, `language`, `award`, `certificate`, `publication`, `reference`, each with a plural in `s`.
  - `identityKey(entry, kind)`: `JSON.stringify` of the identifying field values in order. A missing field is `null`, a string is `.normalize('NFC')`, and any other value is kept as is. Comparison stays case-sensitive.
  - `entriesOf(resume, kind)`: `{ path, entry }[]` for the kind's list, or `[]` when it's absent or not an array.
- [ ] T025 [P] [US1] Implement problem ordering and rendering in `tools/content-check/src/report.ts`, following contracts/cli.md exactly:
  - `sortProblems(problems)`: by `location.file` with 001's `compare`, then `line`, `column`, the index in `PROBLEM_TYPES`, and `subject` with `compare`.
  - `renderReport(report)`:
    1. One line per sorted problem: `<file>:<line>:<column> <type> <subject>: <detail>`.
    2. If there were problems, one empty line.
    3. `Summary`.
    4. Seven labelled lines: two spaces, the label with its colon padded with spaces to 30 characters, then the value, so every value starts at column 33:
       - the three documents, as `<file> (<state>)`;
       - `Key facts searched for`;
       - `Files searched for key facts`;
       - `Files skipped (not text)`;
       - `Checks not run`.
    5. `  Problems:` padded the same way, then the total.
    6. One line per type: four spaces, the type padded to 28 characters, then the count.
    7. An empty line, then the result line:
       - `PASS: both documents are valid and no key facts are hardcoded.`;
       - or `FAIL: N problems found.` (`1 problem`), with ` Some checks could not run.` when any part didn't run.
    8. A single trailing `\n`.
- [ ] T026 [US1] Implement the CV rules in `tools/content-check/src/resume-rules.ts`, after T021 to T024 (research R6, data-model.md DateValue and Entry rules). `resumeRules(read, { datePatterns, formats }): Problem[]`. Every rule skips values of the wrong type (the schema reported those) and dates already reported as invalid.
  - `parseDate(text)`: `/^([12]\d{3})(?:-(\d{2})(?:-(\d{2}))?)?$/` (years 1000 to 2999). Returns `{ parts }` when the date exists (month 01 to 12, day within the month, 29 February only in leap years), `'not-real'` when the form matches but the date doesn't exist, or `'bad-form'`. Bad forms come from the schema's `pattern` error (T022). This rule adds `"<value>" is not a real date` for `not-real`, at the value.
  - `compareDates(a, b)`: compares the parts both have. Returns `-1`, `0` or `1`.
  - **End before start** for `range` kinds (FR-010): `end-before-start`, subject `<entry>.endDate`, at the end date's value.
  - **Order** for every dated kind (FR-036). An entry's date is `startDate` for `range` kinds, otherwise its single field. Ongoing means a `range` entry with a valid `startDate` and no `endDate`.
    - For each entry B at index j, find the first i < j where B must come before A: B is ongoing and A isn't, or both are in the same group and `compareDates(B, A) > 0`.
    - Report one `out-of-order` at B's opening brace, subject B's path, detail `should come before <A's path> (newest first)`.
    - Skip entries without a valid date.
  - **Duplicates** (FR-014): group entries by `identityKey`. Each group of two or more gives one `duplicate-entry` at the first's opening brace, subject the first path, detail `the same entry is listed <n> times: <paths joined by ", ">`.
  - **Untrimmed text** (FR-015): every string value at any depth where `value !== value.trim()`.
  - **Placeholders** (FR-016):
    - any string value where `URL.parse` gives a hostname equal to `example.com`, `example.org` or `example.net`, or ending in `.` plus one of them;
    - `meta.canonical` starting `https://raw.githubusercontent.com/jsonresume/resume-schema/`, `meta.version` `v1.0.0`, and `meta.lastModified` `2017-12-24T15:53:00`.
  - **Formats** (FR-012): the `FORMAT_RULES` test at each recorded format pattern, `isWebAddress` at `basics.image`, and `isCountryCode` at `basics.location.countryCode`. Each failure is an `invalid-format` at the value.
- [ ] T027 [US1] Implement `runCheck(root): Report` in `tools/content-check/src/check.ts`, after T005, T021, T022, T025 and T026 (data-model.md Check):
  - Load and derive the official schema once per run, and compute `datePatterns` and `formats`.
  - Read the CV document, the site data document and the rules with `readDocument`. Each document's state in the report is `checked`, `missing` or `unreadable`, and each `missing` or `unreadable` read adds its problem.
  - If the CV is `ok`: validate it against the derived schema, add `schemaProblems` (with the JSON Resume undefined-field detail) and `resumeRules`. Otherwise add `CV rules` to `checksNotRun`.
  - Add `references` and `key facts search` to `checksNotRun` when their inputs aren't `ok` (data-model.md Check table). Their implementations come in US2 and US3. Until then, `factKinds` is `[]` when the CV is readable and `null` when it isn't, and the file counts are 0.
  - `result` is `fail` exactly when there's a problem. Problems are sorted with `sortProblems`.
- [ ] T028 [US1] Implement the entry points, after T027 (contracts/cli.md, research R11):
  - `tools/content-check/src/cli.ts`:
    - with any argument, write `usage: npm run content-check (takes no arguments)` to stderr and set exit code 2;
    - otherwise write `renderReport(runCheck(process.cwd()))` to stdout and set exit code 1 or 0;
    - on any thrown error (including the schema-not-installed error from T022), write `content check could not run: <message>` to stderr and set exit code 2;
    - set `process.exitCode` and never call `process.exit()`.
  - `tools/content-check/src/main.js`: plain JavaScript, as 001's `main.js`. Call `nodeVersionProblem(process.versions.node, 'content check')`. If it returns a message, write it to stderr and exit 2. Otherwise `await import('./cli.ts')`, and on a load failure write `content check could not start: <message>` and exit 2.
  - Then run `npm run content-check` once and confirm Node 26 accepts the permission flags and loads `jsonschema`, `jsonc-parser` and the official schema.
- [ ] T029 [US1] Create `packages/content/src/index.ts`, after T020. Import `../resume.json` and `../site.json` with `with { type: 'json' }`, and export them as `resume` and `siteData`. No types yet: US4 adds them in T047. The file must not contain any CV fact. Confirm `npm run typecheck` passes and that a test importing `@cv/content` resolves through the workspace link.
- [ ] T030 [US1] Checkpoint.
  - `npm run typecheck` passes. `npm test` passes, except 001's self-check (expected until T061).
  - `npm run content-check` exits 0. It shows the three documents `checked`, `Problems: 0`, and the `PASS` line.
  - Quickstart scenario 3 (add `picture` and `featured`) gives exactly two `undefined-field` lines. Revert with `git checkout -- packages/content/resume.json`.
  - `npm run traceability` reports exactly 13 uncovered 002 requirements: FR-004, FR-005, FR-006, FR-017, FR-018, FR-019, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027 and FR-033. Any other problem is a defect.

**Checkpoint**: User Story 1 is fully functional and testable on its own. This is the MVP.

---

## Phase 4: User Story 2 - Keep site-only data separate and its references sound (Priority: P2)

**Goal**: The check validates `site.json` against its own rules, rejects any field the rules don't
define, collects references marked `x-cv-reference`, and reports dangling and ambiguous ones
against the CV.

**Independent Test**: on the `references` sample, the check passes. Rename `Guided Tours System`
in the sample's CV only, and it fails with `dangling-reference featuredProjects[0]`, naming the
missing project (spec US2, quickstart scenario 4).

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T031 [P] [US2] Write `tools/content-check/test/site-data.test.ts`. It covers 002-cv-content-FR-004, 002-cv-content-FR-005, 002-cv-content-FR-006, 002-cv-content-FR-017, 002-cv-content-FR-018 and 002-cv-content-FR-019, through `runCheck` on samples whose rules extend the starting rules.
  - FR-004:
    - the report lists `packages/content/site.json` as its own document;
    - a site-only field `featuredProjects` added to the sample CV gives `undefined-field` on the CV;
    - the same field in site data, with a rule for it, is accepted.
  - FR-005:
    - the real `packages/content/schemas/site.schema.json` declares draft-07 and loads as rules (the real repository reports it `checked`);
    - in a sample, a value outside an `enum`, a wrong `type` and a missing `required` field each give `schema-violation` on `site.json`;
    - a rules file whose `x-cv-reference` is `"projet"` gives `unreadable-document` on the rules file, at that value, with detail `cannot be used as rules: unknown reference kind "projet"`, and `checksNotRun` lists `site data rules` and `references`.
  - FR-006:
    - for every kind in `ENTRY_KINDS`, every identifying field is a property of that list's item schema in the official schema (resolve `$ref`s);
    - a reference resolves with only the CV's own values, with no extra field in the CV.
  - FR-017 (US2 scenario 4): an undefined field in site data gives `undefined-field` with detail `not a field defined by the site data rules`, at top level and nested two levels deep.
  - FR-018 (US2 scenarios 2 and 3):
    - `runCheck` on `tools/content-check/test/__fixtures__/references/` passes;
    - a copy of that sample (via `makeProject`) with the project renamed to `City Tours App` in the CV only gives `dangling-reference`, subject `featuredProjects[0]`, at the value, detail `no project with name "Guided Tours System" exists in the CV document`;
    - a profile reference to `GitHub` with no GitHub profile gives `no profile with network "GitHub" exists in the CV document`;
    - a work reference whose `position` differs gives the three-field detail from contracts/cli.md;
    - a string where the work reference needs an object gives `a work reference needs name, position and startDate`;
    - a work reference to an entry with no `position` in the CV gives `dangling-reference`, even when its `name` and `startDate` match: an entry can't be referred to by a field it doesn't have (spec Edge Cases).
  - FR-019: a reference to a project listed twice gives `ambiguous-reference`, detail `"<name>" matches 2 projects in the CV document: projects[i], projects[j]`, and the CV gets its `duplicate-entry`.
- [ ] T032 [P] [US2] Extend the 002-cv-content-FR-021 group in `tools/content-check/test/text.test.ts`: a site data reference written in NFD resolves to a project whose name is in NFC, with no problem.
- [ ] T033 [P] [US2] Create the committed sample `tools/content-check/test/__fixtures__/references/` (quickstart scenario 4):
  - `packages/content/resume.json`: a valid CV with made-up facts that lists `Guided Tours System` among its projects.
  - `packages/content/schemas/site.schema.json`: the starting rules plus `featuredProjects`, an array of `{ "type": "string", "x-cv-reference": "project" }`.
  - `packages/content/site.json`: `$schema` and `"featuredProjects": ["Guided Tours System"]`.

  It must pass the check as is.

### Implementation for User Story 2

- [ ] T034 [US2] Implement `tools/content-check/src/site-data.ts`, after T022 and T024 (research R7, data-model.md Reference, contracts/site-data-rules.md):
  - `loadRules(read): { schema: object | null; problem: Problem | null }`. Derive the rules with `deriveSchema`. They're unusable, giving `unreadable-document` on the rules file with a `cannot be used as rules: <reason>` detail at the offending value, when:
    - an `x-cv-reference` names a kind not in `ENTRY_KINDS` (`unknown reference kind "<kind>"`);
    - a one-field kind's reference schema isn't `type: "string"`, or a several-field kind's isn't an object whose `properties` are exactly its identifying fields (`a/an <kind> reference must be <a string | an object with <fields>>`, e.g. `an education reference must be an object with institution, area, studyType and startDate`);
    - a `format` isn't in `FORMAT_RULES` (`unsupported format "<name>"`);
    - `jsonschema` throws a `SchemaError` on a trial validation (`<its message>`).
  - `siteDataRules(site, rules)`:
    - validate with an `x-cv-reference` attribute that records `{ path, kind, value }` for every instance it sees, and returns no error;
    - map errors with `schemaProblems` and the site data undefined-field detail;
    - apply `FORMAT_RULES` at the rules' format patterns.

    It returns `{ problems, references }`.
  - `resolveReferences(references, resumeRead)`:
    - a value of the wrong form for its kind (not a string for one-field kinds; not an object with exactly the identifying fields as strings for others) gives `dangling-reference` with `a/an <kind> reference needs <fields joined by ", " and " and ">`. The article is `an` before a vowel (`an education`, `an award`, `an interest`), as contracts/cli.md Details says;
    - otherwise, compare `identityKey` with every entry of the kind;
    - no match gives `dangling-reference`, detail `no <noun> with <field> "<value>"[, … and <field> "<value>"] exists in the CV document`;
    - two or more give `ambiguous-reference`, detail `<value text> matches <n> <plural> in the CV document: <paths joined by ", ">`. The value text is the JSON string for one-field kinds, and the field list for others;
    - located at the reference's value in `site.json`.
- [ ] T035 [US2] Wire site data into `runCheck` in `tools/content-check/src/check.ts`, after T034:
  - when the site data document and the rules are `ok`, run `loadRules`. An unusable rules file reports its problem and counts as `unreadable` in the summary;
  - with usable rules, run `siteDataRules`. Otherwise add `site data rules` to `checksNotRun`;
  - when the CV is also `ok`, run `resolveReferences`. Otherwise add `references`.
- [ ] T036 [US2] Checkpoint.
  - `npm test` passes (001's self-check still excepted).
  - Quickstart scenario 4 gives the expected `PASS`, then the `dangling-reference` line.
  - `npm run content-check` on the real repository still passes.
  - `npm run traceability` no longer lists FR-004, FR-005, FR-006, FR-017, FR-018 or FR-019.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Block CV facts hardcoded outside the content source (Priority: P3)

**Goal**: The check reads the owner's name, email and (if published) phone from the CV on every
run, searches every file that makes up the site for them, and reports each occurrence with file,
line and column. Specs, docs, tests, fixtures, tooling, third-party and generated code are skipped.

**Independent Test**: add a site source file containing the owner's email: the check fails and
names the file, line and fact. The same address in a spec, a doc, a test and a fixture isn't
reported (spec US3, quickstart scenario 5).

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T037 [P] [US3] Write `tools/content-check/test/facts.test.ts`. It covers 002-cv-content-FR-022, 002-cv-content-FR-023, 002-cv-content-FR-024 and 002-cv-content-FR-025, through `runCheck` on samples built from `SAMPLE_RESUME` (made-up facts).
  - FR-022 (US2 scenario 5, US3 scenario 1):
    - the email, the name and (with a phone in the sample CV) the phone in `packages/web/src/footer.tsx` each give `hardcoded-fact`, subject `email`, `name` or `phone`, at the match's line and column, detail `the owner's <kind> is written out; read it from @cv/content instead`;
    - the email in `packages/content/site.json` gives detail `the owner's email is written out in site data; refer to the CV document instead`.
  - FR-023 (US3 scenarios 4 and 6):
    - after changing the email in the sample CV, the search reports the new address and not the old one;
    - a CV with no phone gives `factKinds` `['name', 'email']`;
    - a CV with none of the three gives `[]`, and the summary reads `none`.
  - FR-024 (US3 scenario 5). The name in each of these is not reported:
    - `specs/x.md`, `docs/x.md`, `packages/web/README.md`, `LICENSE`, `packages/web/src/a.test.ts`, `packages/web/test/helper.ts`;
    - `packages/web/__fixtures__/a.ts`, `tools/x.ts`, `node_modules/x/index.js`, `.github/x.yml`, `packages/web/src/a.generated.ts`;
    - the root `package.json`, and the CV document itself.

    A new root file `notes.txt` and `packages/content/site.json` are searched. A symbolic link to a file containing the name is not followed. A file with a NUL byte, and one with invalid UTF-8, count as `filesSkipped`, not searched. A directory made unreadable with `fs.chmodSync(dir, 0o000)` gives `unreadable-document`, subject its path, at `1:1`, detail `cannot be read: EACCES`. Restore its mode in a `finally`, and use `test.skipIf(process.getuid?.() === 0)` for that case.
  - FR-025 (US3 scenarios 2 and 3):
    - `IOANA TESTESCU`, `Ioana  Testescu` (two spaces) and `IOANA@CV.TEST` are reported;
    - with `+44 20 7946 0958` in the sample CV, `+442079460958`, `0044 20-7946-0958`, `(020) 7946.0958` and `20 7946 0958` are each reported, and `20 7946 09581` isn't.
- [ ] T038 [P] [US3] Extend the 002-cv-content-FR-021 group in `tools/content-check/test/text.test.ts`: with a sample CV name containing `ș` in NFC, the same name written in NFD in a site source file is reported, at the column of its first character in the original line.
- [ ] T039 [P] [US3] Extend the 002-cv-content-FR-028 group in `tools/content-check/test/check.test.ts`: with an unreadable `site.json`, the key facts search still runs and reports a hardcoded email in `packages/web/src/a.ts`. With an unreadable CV, `checksNotRun` lists `key facts search` and `factKinds` is `null`.

### Implementation for User Story 3

- [ ] T040 [US3] Implement `tools/content-check/src/facts.ts` (research R9, data-model.md KeyFact and SearchedFile):
  - `keyFacts(resume): { kind; pattern: RegExp }[]`. Read `basics.name`, `basics.email` and `basics.phone`, each only when a non-empty string, in that order, each NFC-normalized. Escape regex metacharacters.
    - name: its words split on whitespace, joined by `\s+`, flags `iu`;
    - email: the address, flags `iu`;
    - phone: let `d` be the digits only, and join digits with `[ .()-]*`. With a leading `+`, the alternatives are `d`, `00` + `d`, and for k = 1, 2, 3, `0?` + `d` without its first k digits. Without `+`, only `d`. Wrap as `(?<!\d)(?:…)(?!\d)`, flags `u`.
  - `searchFiles(root, resumeFile): { files: { file: string; state: 'searched' | 'skipped-binary' }[]; unreadable: { path: string; code: string }[] }`. Walk from the root with `readdirSync(dir, { withFileTypes: true })`, sorting entries with `compare`, and visit only regular files and directories (never follow symbolic links). Skip:
    - any name starting with `.` at any depth;
    - directories for which 001's `isExcludedDir(name)` holds, and directories named `test`, `tests` or `__tests__`;
    - the top-level `specs`, `docs` and `tools` directories;
    - files for which 001's `isTestFile(path)` holds;
    - files whose name matches `/^(README|LICENSE|LICENCE|COPYING)(\..*)?$/i` at any depth;
    - files matching `/\.generated\./` and any `package-lock.json`;
    - the root files `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`, `skills-lock.json` and `CLAUDE.md`;
    - the CV document.

    A file with a NUL byte, or that fails a fatal UTF-8 decode, is `skipped-binary`. Read errors go to `unreadable`.
  - `findFacts(file, text, facts, isSiteData)`:
    - split lines on `\n`, normalize each to NFC, and run every pattern globally;
    - when NFC changed the line, map a match index back to the original column: the smallest prefix of the original line whose NFC form is at least that long;
    - each match is a `hardcoded-fact` with the detail for site source or for site data (T037).
- [ ] T041 [US3] Wire the search into `runCheck` in `tools/content-check/src/check.ts`, after T040:
  - when the CV is `ok`, set `factKinds`, run `searchFiles` and `findFacts` over every searched file, and set `filesSearched` and `filesSkipped`;
  - each unreadable path is an `unreadable-document` at `1:1` with `cannot be read: <code>`;
  - otherwise add `key facts search` to `checksNotRun`.
- [ ] T042 [US3] Checkpoint.
  - `npm test` passes (001's self-check still excepted).
  - `npm run content-check` passes on the real repository, with `Key facts searched for: name, email` (US3 scenario 4).
  - Quickstart scenario 5 gives exactly the two expected lines, both in `packages/content/src/oops.ts`. Delete the three files afterwards.
  - `npm run traceability` no longer lists FR-022 to FR-025.

**Checkpoint**: User Stories 1, 2 and 3 work independently.

---

## Phase 6: User Story 4 - Code that reads the content knows its shape (Priority: P4)

**Goal**: `@cv/content` exports `resume: Resume` and `siteData: SiteData`, with types generated
from the same derived schemas the check uses. Every CV field is optional, and no type has an index
signature, so `npm run typecheck` fails on undefined fields and unhandled absence.

**Independent Test**: code reading `basics.name` with a fallback passes `tsc`. Code reading
`basics.nickname` fails, naming the field and `file(line,column)` (spec US4, quickstart
scenario 6).

### Tests for User Story 4 (REQUIRED) ⚠️

- [ ] T043 [P] [US4] Create the fixture project `tools/content-check/test/__fixtures__/shape/` (research R14). It sits outside the root typecheck (`exclude` has `**/__fixtures__/**`).
  - `tsconfig.json`: `extends` the root `../../../../../tsconfig.json`, sets `include: ["*.ts"]` and `exclude: []`, and keeps every compiler option.
  - Four files, each importing `{ resume }` from `'@cv/content'`:
    - `handles-absence.ts`: `export const name = resume.basics?.name ?? 'Unnamed';`
    - `reads-nickname.ts`: `export const nick = resume.basics?.nickname;`
    - `assumes-name.ts`: `export const shout = resume.basics?.name.toUpperCase();`
    - `assumes-end-date.ts`: `export const year = resume.work?.[0]?.endDate.slice(0, 4);` This form makes `tsc` name the field. The assignment form `const end: string = …` reports only `string | undefined`.
- [ ] T044 [P] [US4] Write `tools/content-check/test/shape.test.ts`. It covers 002-cv-content-FR-026 and 002-cv-content-FR-027.
  - FR-026:
    - `generateShape(...)` (from `src/shape.ts`), run on the derived official schema and the real rules, equals the committed `packages/content/src/shape.generated.ts` byte for byte. On failure the message says to run `npm run content-shape`;
    - parsing the generated text, every property line inside an `interface Resume*` block is optional (`?:`), and no interface contains an index signature (`[key: string]`);
    - a sample rules schema with `featuredProjects` (an array of strings) and a required `theme` (an `enum` of `"light"` and `"dark"`) generates `featuredProjects?: string[];` and `theme: 'light' | 'dark';` in `SiteData` (US4 scenario 5);
    - a rules schema using `oneOf`, a `type` list, or an object with neither `properties` nor `additionalProperties` makes `generateShape` throw, naming the keyword and its schema path.
  - FR-027 (US4 scenarios 1 to 4):
    - spawn `node_modules/.bin/tsc -p tools/content-check/test/__fixtures__/shape --noEmit --pretty false` from `REPO_ROOT`. It exits non-zero;
    - the error lines (`<file>(<line>,<column>): error TS<code>: <message>`) are in exactly `reads-nickname.ts` (message contains `nickname` and `ResumeBasics`), `assumes-name.ts` (contains `name` and `undefined`) and `assumes-end-date.ts` (contains `endDate` and `undefined`);
    - none is in `handles-absence.ts`, and each has a line and column;
    - give the test a 60 s timeout.

### Implementation for User Story 4

- [ ] T045 [US4] Implement the shape generator `generateShape({ resume, site }): string` in `tools/content-check/src/shape.ts`, after T022 (research R10, contracts/site-data-rules.md, contracts/content-package.md Generated file). It takes the two derived schemas.
  - Supported keywords are exactly the contract's table. Also accept `additionalItems` beside a single `items` schema, ignored, if the official schema uses it (research R2). Any other keyword throws `Error('unsupported keyword "<k>" at <schema path>')`. First run it on the official schema. If another keyword turns up, stop and record it in research.md R10 before going on.
  - Types:
    - `string`, `number`, `boolean` and `null` map to themselves, and `integer` to `number`;
    - an array is `T[]`;
    - `enum` and `const` become a union of literals, strings in single quotes;
    - an object with `properties` becomes a named `export interface`;
    - an object with only `additionalProperties` (a schema) becomes `Record<string, T>`;
    - `$ref` to `#/definitions/<name>` inlines a primitive definition, and names an object one.
  - Optionality: a property is optional (`?:`) unless the object's `required` lists it. The official schema lists none, so every `Resume*` property is optional.
  - Names: the roots are `Resume` and `SiteData`. An object property is named the root plus the property in PascalCase (`ResumeBasics`, `ResumeLocation`, `ResumeMeta`). Array items use the singular, by dropping one final `s` (`ResumeProfile`, `ResumeProject`, `ResumeWork`, `ResumeEducation`). A name used twice for different schemas throws.
  - Output:
    - first line `// Generated by npm run content-shape from @jsonresume/schema 1.3.1 (schema.json) and packages/content/schemas/site.schema.json. Do not edit.`;
    - `Resume` and its types first, depth-first in schema property order, then `SiteData`'s;
    - each `description` as a `/** … */` JSDoc line above its property or interface;
    - property names that aren't identifiers in single quotes (`'$schema'?: string;`);
    - two-space indentation, `\n` line endings, one empty line between interfaces, and a final `\n`;
    - no timestamps.
- [ ] T046 [US4] Implement `tools/content-check/src/generate-shape.ts`, after T045. It loads and derives the official schema and the rules from the current directory (it stops with exit code 2 and a message if the rules can't be read or used), calls `generateShape`, and writes `SHAPE_FILE`. Run `npm run content-shape` and commit `packages/content/src/shape.generated.ts`.
- [ ] T047 [US4] Type the exports in `packages/content/src/index.ts`, after T046:
  - `import type { Resume, SiteData } from './shape.generated.ts'`;
  - `export type * from './shape.generated.ts'`;
  - `export const resume: Resume = resumeJson` and `export const siteData: SiteData = siteJson`.

  `npm run typecheck` must pass (contracts/content-package.md Guarantee 5).
- [ ] T048 [US4] Checkpoint.
  - `npm run typecheck` and `npm test` pass (001's self-check still excepted).
  - Quickstart scenario 6 gives the three expected errors in `packages/content/src/oops.ts` and none on line 3. Delete the file afterwards.
  - `npm run content-check` still passes (`shape.generated.ts` isn't searched).
  - `npm run traceability` no longer lists FR-026 or FR-027.

**Checkpoint**: All user stories are independently functional.

---

## Phase 7: Pull-Request Check (FR-033, cross-cutting)

**Purpose**: A `content` CI job runs `npm run content-check` on every pull request, and the
ruleset makes it required (contracts/ci.md, research R13)

- [ ] T049 [P] Write `tools/content-check/test/repo-settings.test.ts`, covering 002-cv-content-FR-033. It asserts every **[tested]** point of contracts/ci.md, reading `.github/workflows/ci.yml` as text with the same layout rules and `block`/`job` approach as 001's `tools/traceability/test/repo-settings.test.ts`, with no YAML dependency.
  - The `content` job has `name: content`, and its steps are exactly `actions/checkout`, `actions/setup-node`, `npm ci`, `npm run content-check`.
  - The job's lines have no `if:`, `strategy:`, `matrix:` or `continue-on-error:` key.
  - The ruleset's `required_status_checks` deep-equals the three entries in contracts/ci.md, each with `integration_id: 15368`.
  - Every `context` is a job id in `ci.yml`, and `content-check` is a `package.json` script whose command the `content` job runs (FR-034).
- [ ] T050 [P] Update 001's exact-match assertion in `tools/traceability/test/repo-settings.test.ts` so the `required_status_checks` rule lists `traceability`, `test` and `content`. Keep its other assertions unchanged.
- [ ] T051 [P] Add the `content` job to `.github/workflows/ci.yml` after `test`: `name: content`, `runs-on: ubuntu-latest`, and the same `actions/checkout` and `actions/setup-node` steps (same SHAs and comments, `node-version-file: .nvmrc`, `cache: npm`) as the other jobs, then `- run: npm ci` and `- run: npm run content-check`. No `if:`, `strategy`, `matrix` or `continue-on-error`.
- [ ] T052 [P] Add `{ "context": "content", "integration_id": 15368 }` as the third entry of `required_status_checks` in `.github/rulesets/main.json`, in the existing two-space format. Change nothing else.
- [ ] T053 Checkpoint, after T049 to T052: `npm test` passes, including both `repo-settings.test.ts` files (001's self-check still excepted until every 002 requirement is covered). `npm run traceability` no longer lists FR-033.

---

## Phase 8: Polish & Constitution Verification

**Purpose**: The seeded samples, self-check and performance tests, the full verification, the
owner's review, and the single PR. Constitution VII, VIII and IX don't apply: the spec says No UI.

- [ ] T054 [P] Create the committed sample `tools/content-check/test/__fixtures__/seeded/` (SC-001, research R14). Every part of the check runs on it, so it holds every problem type except the two that stop a part. Made-up facts only: name `Ioana Testescu`, email `ioana@cv.test`, phone `+44 20 7946 0958`.
  - `packages/content/resume.json` seeds at least one of each:
    - `schema-violation` (`work` item `highlights` as a string);
    - `undefined-field` (`basics.picture`, `work[0].featured`, a top-level `theme`);
    - `invalid-date`, both a bad form and a date that doesn't exist;
    - `end-before-start`;
    - `invalid-format`: a country code and a URL (the email stays valid, so the key facts search can find it);
    - `duplicate-entry`: a project whose name contains `ș`, listed twice, its second listing written in NFD, so the duplicate and the ambiguous reference to it both depend on NFC comparison; and two education entries missing the same identifying field, with all others equal;
    - `out-of-order` (an ongoing role after a finished one);
    - `untrimmed-text`;
    - `placeholder`: an `example.com` URL and the sample `meta` values.

    It also seeds the edge cases that must pass silently:
    - an empty `volunteer: []`;
    - year-only and year-month dates;
    - an end date of a different precision than its start (start `2020-05`, end `2020`);
    - an ongoing role;
    - non-ASCII names, one in NFD;
    - two roles at one company with different start dates;
    - entries missing different identifying fields;
    - equal dates at shared precision;
    - an undated entry;
    - a remote `$schema` link.
  - `packages/content/schemas/site.schema.json` defines `featuredProjects` (project references), `contact.profile` (a profile reference) and `highlight` (a work reference). `packages/content/site.json` has an undefined field, a dangling project, profile and work reference each, a second work reference whose `name` and `startDate` match a CV work entry that has no `position` (dangling, spec Edge Cases), an ambiguous reference to the duplicated project, and the email written out.
  - Site source `packages/web/src/footer.tsx` has the email in upper case, the name with two spaces, and the phone as `(020) 7946.0958`. `packages/web/public/pixel.bin` holds a NUL byte (skipped, not text).
  - The same facts appear in `specs/x/spec.md`, `docs/x.md`, `README.md`, `packages/web/src/footer.test.ts`, `packages/web/__fixtures__/x.ts`, `tools/x.ts` and `packages/web/src/x.generated.ts`, none of which may be reported. Third-party code (`node_modules/`) and version-control data (`.git/`) can't be committed inside a sample, so T056 adds them to a copy.
  - `expected-report.txt`: from the sample, run `node --permission --allow-fs-read=<REPO_ROOT> <REPO_ROOT>/tools/content-check/src/main.js > expected-report.txt`, redirecting straight into the file. It's a root file of the sample, so it's searched for key facts and counts in `Files searched`, and the redirect creates it before the run. Run the same command a second time and confirm the file doesn't change. Check every line against the seeded cases by hand before committing. It must not contain the made-up facts.
- [ ] T055 [P] Create the committed sample `tools/content-check/test/__fixtures__/seeded-broken/` for the two problem types that stop a part (SC-001, spec Edge Cases):
  - a valid `packages/content/resume.json` with made-up facts;
  - a `packages/content/site.json` with a trailing comma (`unreadable-document`);
  - no rules file (`missing-document`);
  - a site source file with the email.

  Its `expected-report.txt` shows the CV `checked`, the key facts search run with one `hardcoded-fact`, `Checks not run: site data rules, references`, and ends `FAIL: 3 problems found. Some checks could not run.` Create it as in T054.
- [ ] T056 Add a seeded-samples test to `tools/content-check/test/cli.test.ts`, after T054 and T055. Its title has no FR ID, e.g. `describe('seeded samples (SC-001)', …)`.
  - For each sample, `runCli(<sample dir>)` exits 1 and its stdout equals `expected-report.txt` byte for byte.
  - Across the two reports, each of the 14 problem types has a non-zero count.
  - A copy of `seeded/` made with `makeProject`, plus `node_modules/x/index.js` and `.git/x` both holding the made-up email, gives the same stdout as `expected-report.txt` (spec Edge Cases: third-party code and version-control data aren't searched).
  - A comment at the top of the test lists each seeded case and the line it produces.
- [X] T057 [P] Record the two-sample split in the design documents. One sample can't hold `missing-document` or `unreadable-document` together with `dangling-reference` and `ambiguous-reference`, because a missing or unreadable document stops the references part (data-model.md Check). Update:
  - `specs/002-cv-content/plan.md` (Project Structure `__fixtures__` and the SC-001 line);
  - `specs/002-cv-content/research.md` R14;
  - `specs/002-cv-content/quickstart.md` scenario 2, which runs and diffs both samples and expects each type non-zero across the two.
  - Result (2026-10-22, during the `/speckit-analyze` fixes, approved by the owner): spec.md SC-001 now says "seeded samples that together hold…". plan.md, research.md R14 and quickstart scenario 2 describe both samples. The same pass also aligned FR-012, FR-032 and SC-002 in spec.md, the details catalogue in contracts/cli.md, the rules-file conditions in data-model.md and contracts/site-data-rules.md, and the `endDate` example in quickstart scenario 6 and contracts/content-package.md.
- [ ] T058 [P] Write `tools/content-check/test/self-check.test.ts` (SC-003, SC-008). Titles have no FR ID.
  - SC-008: `runCheck(REPO_ROOT)` has `result` `pass`, no problems, the three documents `checked`, and `factKinds` `['name', 'email']`.
  - SC-003: copy `packages/content/` from the repository into a `makeProject` sample, change only `basics.email` in its `resume.json`, and `runCheck` on it still passes.
- [ ] T059 [P] Write `tools/content-check/test/performance.test.ts` (SC-006). Its title has no FR ID. Time `runCli(REPO_ROOT)`: it exits 0. The under-10,000 ms assertion uses `test.skipIf(process.env.CI)`, as in 001. Give it a 60 s timeout.
- [ ] T060 [P] Audit Constitution X and IV.
  - `package.json` has exactly the seven `devDependencies` from T002 and no `dependencies`. The three new ones have no `^` or `~`. `packages/content/package.json` has no dependencies.
  - The only abstractions added are those in plan.md's Dependencies table: the `@cv/content` workspace, `deriveSchema`, the shape generator, the reused 001 helpers, and the test helper `helpers/cli.ts` (`runCli`, `SAMPLE_RESUME`, `contentFiles`) with nothing beyond its row. No agent skill was added.
  - No CV fact appears in `packages/` outside `resume.json`, tests and the generated file (the content check's own search confirms it).
- [ ] T061 Run the full verification, after T053 to T060:
  - `npm run typecheck` passes;
  - `npm test` passes, now including 001's self-check;
  - `npm run content-check` exits 0 with the `PASS` line;
  - `npm run traceability` exits 0, and its last line is exactly `PASS: all 65 active requirements in 2 approved specs are covered.` (29 from 001 plus 36 from 002; Constitution III, SC-008).
- [ ] T062 Run quickstart.md scenarios 1 to 9 and record any deviation here.
  - Scenarios 3, 5 and 6 edit files: revert each before the next.
  - Scenario 7 needs the network off: cut it for the process tree with `sandbox-exec -p '(version 1)(allow default)(deny network*)'`, as 001 did, or have the owner turn it off.
  - Scenario 9 needs the network for `npx`. The theme render is SC-002's second, independent tool. `resumed validate` alone doesn't count, because it uses the same validator as `portability.test.ts`.
- [ ] T063 Owner action: review the converted `packages/content/resume.json` against the source CV (spec Assumptions: "The owner reviews the result before merge"). Confirm every change is one R15 lists, the phone, photo and address are absent, and the wording is otherwise unchanged. Record the approval here.
- [ ] T064 Commit the remaining work with Conventional Commits, e.g. `feat(content): …`, `test(content-check): …`. Push `002-cv-content` and open one pull request to `main` (Constitution XI).
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/002-cv-content/spec.md` and `specs/002-cv-content/tasks.md`.
  - Confirm `traceability`, `test` and `content` all run and pass.
  - Confirm the `content` log shows the same report as the local run on the same commit (FR-034, quickstart scenario 8).
- [ ] T065 Owner action, needs admin rights and the open PR from T064: apply the updated ruleset with `gh api -X PUT repos/alex-profir/CV/rulesets/<id> --input .github/rulesets/main.json` (quickstart scenario 10). Confirm the contexts read back as `traceability`, `test` and `content`, and that a drift diff against the committed file shows only server-added fields.
- [ ] T066 Owner action, after T065: demonstrate enforcement (quickstart scenario 10, FR-033).
  1. Push a scratch branch with scenario 3's edit, and open a draft PR.
  2. Confirm `content` fails, naming `basics.picture` and `work[0].featured`, and that merging is blocked with no bypass option.
  3. Close the PR unmerged and delete the branch. Record the result here.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T002 runs after T001. T003 can run alongside T002.
- **Foundational (Phase 2)**: Depends on Setup. T004 to T008 can run together. T009 runs last. It
  BLOCKS all user stories.
- **Design gate**: N/A. The spec says No UI.
- **User Story 1 (Phase 3)**: Depends on Foundational.
- **User Stories 2, 3 and 4 (Phases 4 to 6)**: Each depends on US1, which builds the reader, the
  schema tools, entry kinds, `check.ts` and the package. They don't depend on each other, but
  US2 and US3 both edit `check.ts` (T035, T041) and `text.test.ts` (T032, T038), so if they run
  side by side, those tasks go one after the other.
- **Pull-Request Check (Phase 7)**: Depends on US1 (the CLI the job runs). Independent of US2 to
  US4.
- **Polish (Phase 8)**: Depends on every earlier phase. T056 needs T054 and T055. T061 needs T053
  to T060. T064 needs T061 to T063. T065 needs the open PR from T064. T066 needs T065.

### Within User Story 1

- T010 to T019 (tests) come first. They are all in different files and can run in parallel.
- T020 to T025 can run in parallel.
- T026 runs after T021 to T024.
- T027 runs after T025 and T026.
- T028 runs after T027.
- T029 runs after T020, and T030 last.

### Within User Story 2

- T031, T032 and T033 come first, in parallel.
- T034, then T035, then T036.

### Within User Story 3

- T037, T038 and T039 come first, in parallel.
- T040, then T041, then T042.

### Within User Story 4

- T043 and T044 come first, in parallel.
- T045, then T046, then T047, then T048.

### Parallel Opportunities

- Setup: T003 alongside T002.
- Foundational: T004 to T008 together.
- US1: ten test tasks together, then six implementation tasks together (T020 to T025).
- After US1: US2, US3, US4 and Phase 7 can proceed side by side, apart from the shared
  `check.ts` and `text.test.ts` edits noted above.
- Phase 7: T049 to T052 together.
- Polish: T054, T055, T058, T059 and T060 together (T057 is already done).

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "content.test.ts, covers 002-cv-content-FR-001, FR-002, FR-003, FR-020, in packages/content/test/content.test.ts"
Task: "schema.test.ts, covers 002-cv-content-FR-001, FR-007, FR-008, in tools/content-check/test/schema.test.ts"
Task: "json.test.ts, covers 002-cv-content-FR-029, in tools/content-check/test/json.test.ts"
Task: "dates.test.ts, covers 002-cv-content-FR-009, FR-010, FR-011, FR-036, in tools/content-check/test/dates.test.ts"
Task: "resume-rules.test.ts, covers 002-cv-content-FR-012 to FR-016, in tools/content-check/test/resume-rules.test.ts"
Task: "text.test.ts, covers 002-cv-content-FR-020, FR-021, in tools/content-check/test/text.test.ts"
Task: "report.test.ts, covers 002-cv-content-FR-029, FR-030, FR-031, in tools/content-check/test/report.test.ts"
Task: "check.test.ts, covers 002-cv-content-FR-007, FR-028, FR-032, in tools/content-check/test/check.test.ts"
Task: "cli.test.ts, covers 002-cv-content-FR-034, FR-035, in tools/content-check/test/cli.test.ts"
Task: "portability.test.ts (SC-002), in tools/content-check/test/portability.test.ts"

# Then the independent pieces together:
Task: "Convert the owner's CV into packages/content/resume.json"
Task: "Document reader and locations in tools/content-check/src/json.ts"
Task: "Official schema loading and derivation in tools/content-check/src/schema.ts"
Task: "Format rules in tools/content-check/src/formats.ts and countries.ts"
Task: "Entry kinds in tools/content-check/src/entries.ts"
Task: "Problem ordering and rendering in tools/content-check/src/report.ts"
```

## Parallel Example: User Story 2

```bash
Task: "site-data.test.ts, covers 002-cv-content-FR-004 to FR-006, FR-017 to FR-019"
Task: "text.test.ts FR-021 reference case"
Task: "references sample in tools/content-check/test/__fixtures__/references/"
```

## Parallel Example: User Story 3

```bash
Task: "facts.test.ts, covers 002-cv-content-FR-022 to FR-025"
Task: "text.test.ts FR-021 key fact case"
Task: "check.test.ts FR-028 key facts case"
```

## Parallel Example: User Story 4

```bash
Task: "Fixture project in tools/content-check/test/__fixtures__/shape/"
Task: "shape.test.ts, covers 002-cv-content-FR-026, FR-027"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational. It blocks all stories. The design gate is N/A (No UI).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE** (T030). The real CV is in `@cv/content`, and the check passes on it,
   locally and offline. `npm run traceability` reports exactly the 13 requirements whose tests come
   later. That's the check doing its job, not a defect.

### Incremental Delivery

1. Setup + Foundational: the workspace, packages and shared types are ready.
2. US1: the CV document and the check. 13 requirements remain uncovered.
3. US2: site data rules and references. 7 remain (FR-022 to FR-027, FR-033).
4. US3: the key facts search. 3 remain (FR-026, FR-027, FR-033).
5. US4: the generated shape and typed exports. 1 remains (FR-033).
6. Phase 7: the `content` job and ruleset. 0 remain.
7. Polish: seeded samples, self-check and performance tests, full verification, the owner's
   review, the PR, and live enforcement.

The counts assume this order. Done in another order after US1, each phase removes the same
requirements. All stories ship in the feature's single PR (Constitution XI). The increments above
are checkpoints within it. 001's self-check test fails until every 002 requirement is covered,
which is expected until T061.

---

## Requirement Coverage

Every FR in spec.md and the test task that covers it:

| Requirement | Test task(s) |
|-------------|--------------|
| 002-cv-content-FR-001 | T010, T011 |
| 002-cv-content-FR-002, FR-003 | T010 |
| 002-cv-content-FR-004, FR-005, FR-006 | T031 |
| 002-cv-content-FR-007 | T011, T017 |
| 002-cv-content-FR-008 | T011 |
| 002-cv-content-FR-009, FR-010, FR-011, FR-036 | T013 |
| 002-cv-content-FR-012 to FR-016 | T014 |
| 002-cv-content-FR-017, FR-018, FR-019 | T031 |
| 002-cv-content-FR-020 | T010, T015 |
| 002-cv-content-FR-021 | T015, T032, T038 |
| 002-cv-content-FR-022 to FR-025 | T037 |
| 002-cv-content-FR-026, FR-027 | T044 |
| 002-cv-content-FR-028 | T017, T039 |
| 002-cv-content-FR-029 | T012, T016 |
| 002-cv-content-FR-030, FR-031 | T016 |
| 002-cv-content-FR-032 | T017 |
| 002-cv-content-FR-033 | T049 |
| 002-cv-content-FR-034, FR-035 | T018 |

Success criteria: SC-001 T056, SC-002 T019 and T062 (scenario 9), SC-003 and SC-008 T058, SC-004
T031, SC-005 T018 and T064, SC-006 T059 and T062 (scenario 7), SC-007 T012 and T016.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- Requirement IDs in task descriptions map tasks to spec.md requirements. This table abbreviates
  them, but test titles always carry the full `002-cv-content-FR-###` form.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md).
- T063, T065 and T066 are the owner's. T065 and T066 change GitHub state, so the owner runs or
  explicitly approves them.
- Second `/speckit-analyze` pass (2026-10-22, fixes approved by the owner): spec.md SC-003 now
  excludes entries site data refers to, the Documentation assumption names no folders, and the
  site-files assumption states the tooling list's fail-safe. plan.md records the Constitution IV
  exception in Complexity Tracking, corrects the IV evidence and Storage, and lists every 001 file
  T004 touches. T034, T054 and T056 above, and quickstart scenario 9, were updated to match.
