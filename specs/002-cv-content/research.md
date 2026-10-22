# Research: CV Content Source

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Each section records one decision: what was chosen, why, and what else was considered. The
Technical Context in plan.md had no open questions left after these. The base toolchain (Node 26
running TypeScript directly, npm, Vitest, GitHub Actions, the permission model) was set by
[001's research](../001-requirement-traceability/research.md) and is reused, not revisited.

Facts below were checked on 2026-10-21 against the published packages and the
`jsonresume/resume-schema` repository.

## R1. Where the content lives: `packages/content`, an npm workspace

**Decision**:

- `packages/content` becomes the first npm workspace, named `@cv/content` (private). The root
  `package.json` gains `"workspaces": ["packages/*"]`.
- The CV document is `packages/content/resume.json`. The site data document is
  `packages/content/site.json`, and its rules are `packages/content/schemas/site.schema.json`.
- The package's entry point, `packages/content/src/index.ts`, exports the two documents and
  their shape description ([contracts/content-package.md](./contracts/content-package.md)).
- The check lives in `tools/content-check/`, next to `tools/traceability/`. It's repository
  tooling, so it never ships and isn't searched for key facts (FR-024).

**Rationale**:

- Constitution IV fixes `packages/content`. Every later feature (the `/cv` page, the CV app,
  Terminal, Contact) imports it, so it gets a package name now. The shape tests import it by
  that name, exactly as later features will (US4).
- `resume.json` is the file name JSON Resume tools look for by default, so they can use the
  document unchanged (SC-002).
- The package has no dependencies. Node and TypeScript both read JSON with an import attribute.

**Alternatives considered**:

- *Relative imports with no workspace*: works today, but every later feature would reach into
  `../../packages/content/src`, and the first consumer would have to add the workspace anyway.
  The workspace costs one `package.json` and one lockfile entry.
- *Putting the check inside `packages/content`*: the package would then carry tooling, and the
  key facts search would have to carve the check out of a site directory.
- *`cv.json`*: clearer in this repository, but JSON Resume tools would need a path argument.

## R2. The official schema, offline: `@jsonresume/schema` 1.3.1

**Decision**: the check reads the JSON Resume 1.3.1 schema from the `@jsonresume/schema`
package, pinned to exactly `1.3.1` (`node_modules/@jsonresume/schema/schema.json`). A test
asserts the installed version is 1.3.1, so a version bump can't happen without a spec change
(spec Assumptions).

**Rationale**:

- FR-035 forbids fetching the schema at check time. `npm ci` installs it with the other
  dependencies, so every run reads it from disk.
- 1.3.1 is the latest release (published July 2026). JSON Resume now publishes the schema from
  its maintained `jsonresume/jsonresume.org` monorepo. The old `jsonresume/resume-schema`
  repository stops at tag `v1.2.1`, whose schema differs from 1.3.1 only by `additionalItems`
  keywords that have no effect next to a single `items` schema.
- 1.3.1 defines exactly the same fields as 1.0.0, the version the owner's current CV declares.
  The differences are that it's draft-07, it accepts unknown top-level fields (the check rejects
  them anyway, R4), and `certificates[].date` accepts partial dates like every other date. So the
  move changes no content and removes the one conflict between the schema and FR-009.
- The package is the vendor's own, has one dependency (`jsonschema`, which the check uses anyway,
  R3), and also ships the validator `portability.test.ts` uses (R14).
- The schema's `$id` is a leftover placeholder, `http://example.com/example.json`. `jsonschema`
  uses it only as a name for in-memory `$ref` resolution and never fetches it. Research
  confirmed validation works under the permission flags with no network grant.

**Alternatives considered**:

- *Vendoring a copy of the schema, with a hash test*: needed for 1.0.0, which no maintained
  package ships. For 1.3.1 it would duplicate a pinned vendor package and add a license file.
- *Staying on 1.0.0*: no maintained package, and its `format: date` on certificates contradicts
  FR-009.
- *The `v1.2.1` tag*: not the latest release, and not what current tools such as `resumed`
  install.

## R3. Validator: `jsonschema`

**Decision**: the check validates with `jsonschema` 1.5.0, pinned exactly. It loads the
derived schemas from R4 and collects every error in one pass.

**Rationale**:

- It's the validator JSON Resume's own `@jsonresume/schema` package uses, so "valid here" means
  what the JSON Resume ecosystem means by valid. It's installed anyway as that package's only
  dependency. The direct pin just makes the version explicit.
- It supports draft-07, used by both the 1.3.1 schema and the site data rules (R7). It has no
  dependencies.
- It reports every error with a path array (`["work", 0]`), the failing keyword and its
  argument, which map directly to the report's field paths.
- A custom attribute hook lets the check collect reference fields while validating (R7).

**Finding from research**: `jsonschema`'s built-in formats (`email`, `uri`) can't be replaced,
because built-ins are tested before custom formats. The check therefore removes `format` from
the schema it validates with and applies its own format rules (R4).

**Alternatives considered**:

- *Ajv*: faster and stricter, but it brings four transitive dependencies where `jsonschema` adds
  none beyond what `@jsonresume/schema` already installs. Speed doesn't matter for two small
  documents.
- *A hand-written validator*: FR-007 asks for the official schema, which means a real
  implementation of JSON Schema, not a re-reading of it.

## R4. Strictness and formats: one derived schema, built in code

**Decision**: a pure function, `deriveSchema`, turns a schema into the one the check validates
with. It makes two changes and nothing else:

1. Every object schema that lists `properties` gets `additionalProperties: false`. Unknown
   fields at any depth then fail as `undefined-field` (FR-008, US1 scenario 3), even where the
   1.3.1 schema says `additionalProperties: true`, which it does at every level, the top
   included.
2. Every `format` keyword is removed, and its location is recorded. The check applies its own
   rule there (R6): `email` and `uri`.

The same function is applied to the site data rules (FR-017), and the shape generator reads the
same derived schemas (R10). A test asserts that the derived schema differs from the input only
in those two ways.

**Format rules** (FR-012):

- `email`: the WHATWG HTML definition of a valid email address, the one browsers apply to
  `<input type="email">`, as FR-012 now says. It's a published, deterministic definition of
  "well formed". It's a deliberate narrowing of JSON Schema's `format: email` (RFC 5321
  mailboxes): it rejects rare RFC forms such as a quoted local part (`"a b"@c.d`), which no CV
  needs and many mail forms refuse.
- `uri`, plus `basics.image`, whose description says it's a URL but which has no `format`: a
  value that `URL.parse` accepts, with the `http:` or `https:` scheme, a host, and no
  whitespace. That's the "absolute web address" FR-012 asks for.
- The country code has no `format` in the schema. The check tests
  `basics.location.countryCode` against a committed list of the 249 officially assigned
  ISO 3166-1 alpha-2 codes, uppercase.

**Alternatives considered**:

- *A separate walk for undefined fields*: it would repeat the schema traversal the validator
  already does, and the two could disagree on `$ref`s.
- *Hand-editing a strict copy of the schema*: it would no longer be the official file (R2), and
  nothing would keep the two in step.
- *`Intl.DisplayNames` for country codes*: it also accepts regions that aren't ISO 3166-1 codes,
  such as `EU` and `XK`, and its data changes with the ICU version. A test still uses it to
  cross-check the committed list.

## R5. Reading JSON with positions: `jsonc-parser`, plus `JSON.parse`

**Decision**: each document is read as UTF-8 and parsed twice:

- `jsonc-parser` 3.3.1, pinned exactly, with comments and trailing commas disallowed, gives the
  syntax tree with offsets. On a syntax error, the check reports the first error's line and
  column (FR-029). On success, the tree maps any field path to a line and column, so every
  problem in a document can point at its field (SC-007).
- `JSON.parse` gives the value the checks run on, so the semantics are exactly JSON's. If it
  rejects text `jsonc-parser` accepted, the check reports that as unreadable at 1:1 with
  `JSON.parse`'s message. A byte order mark is reported the same way.

Lines and columns count from 1. Columns count UTF-16 code units, like JS string indices and
like 001's report.

**Rationale**: `JSON.parse` alone isn't enough. V8 includes a position only in some of its
messages (`Unexpected end of JSON input` has none), and it gives no positions for valid
documents. `jsonc-parser` is the parser behind VS Code's JSON support, maintained by Microsoft,
and it has no dependencies.

**Known limit**: a key repeated in one object is legal JSON. `JSON.parse` keeps the last value,
and the check doesn't report it, because the spec defines no such problem. If that's wanted, it's
a spec change first.

**Alternatives considered**:

- *A hand-written JSON parser with positions*: about 150 lines that a vendor-maintained package
  already provides (Constitution X).
- *Parsing V8's error messages*: not every message carries a position, and the wording isn't
  an API.

## R6. CV rules the schema can't express

**Decision**: after schema validation, the check runs its own rules on the parsed CV. Every
rule skips values of the wrong type (the schema already reported those) and values already
reported as invalid dates.

- **Dates** (FR-009): every field that is a `$ref` to `#/definitions/iso8601`, found by walking
  the schema rather than listed by hand. Form `YYYY`,
  `YYYY-MM` or `YYYY-MM-DD`, with years 1000 to 2999 as the schema's pattern allows. Months 01
  to 12. Days valid for the month, leap years included. One problem per field: when the form is
  wrong, the schema's pattern error is reported as `invalid-date` and existence isn't checked.
- **End before start** (FR-010, FR-011): compared at the precision both dates share. `2020-05`
  to `2020` is fine. A start date with no end date is an ongoing entry.
- **Order** (FR-036): in work, volunteer, education, projects, awards, certificates and
  publications. Ongoing entries come first, then the rest. Within each group, by start date (or
  the section's single date: `date`, or `releaseDate` for publications), latest first, compared
  at shared precision. Because "equal at shared precision" isn't transitive (`2020-01` and
  `2020-05` both equal `2020`), every pair is compared, not just neighbours. Each entry that
  should come before an earlier one is reported once, naming the first such entry. Entries with
  no usable date are skipped.
- **Duplicates** (FR-014): entries whose identifying fields (data-model.md, Entry kinds) are
  equal after NFC normalization (R8). A missing field matches only a missing field.
- **Untrimmed text** (FR-015): every string value at any depth where `value !== value.trim()`.
- **Placeholders** (FR-016): any string value that parses as a URL whose host is
  `example.com`, `example.org` or `example.net` or a subdomain of one. And `meta` values from
  the JSON Resume sample CV: a `meta.canonical` under
  `https://raw.githubusercontent.com/jsonresume/resume-schema/` (the published samples use
  three such URLs), `meta.version` of `v1.0.0`, and `meta.lastModified` of
  `2017-12-24T15:53:00`.

**Rationale**: these are the spec's rules, written once in plain code against the parsed value.
Deriving date fields from the schema keeps them in step with it.

**Alternatives considered**: *expressing the rules as extra JSON Schema keywords*. Order,
duplicates and shared-precision comparison don't fit JSON Schema, and the error paths would
be harder to control.

## R7. Site data rules: a JSON Schema file with a reference keyword

**Decision**:

- The rules are a draft-07 JSON Schema, `packages/content/schemas/site.schema.json`. It's the
  "written rules" of FR-005: it defines every field, which are `required`, and which values each
  accepts. Editors use it for completion, because `site.json` points to it with `$schema`.
- A field that refers to a CV entry carries `"x-cv-reference": "<kind>"`, such as `"project"`.
  The kinds and their identifying fields are the spec's Key Entities table (data-model.md).
  A reference to a kind with one identifying field is a string. One to a kind with several,
  such as `work`, is an object with exactly those fields, named as in the CV.
- The check registers `x-cv-reference` as a `jsonschema` attribute. While validating, it
  collects each reference's path, kind and value. It resolves them against the CV afterwards:
  no match is `dangling-reference` (FR-018), several are `ambiguous-reference` (FR-019).
- To start with, the rules allow only `$schema`, and `site.json` holds only that
  (spec Assumptions). Reference checking is proven with fixtures until a later feature adds
  real references.
- The supported subset of JSON Schema, and how a later feature adds fields, is in
  [contracts/site-data-rules.md](./contracts/site-data-rules.md).

**Rationale**: one rules language for both documents, one validator and one shape generator.
JSON Schema is portable and editor-aware, and references stay part of the same rules (Key
Entities: "which fields are references to CV entries").

**Alternatives considered**:

- *Zod rules, with types from `z.infer`*: no generated file for site data, but then the two
  documents would use two rule systems and two shape mechanisms. It would also add a dependency.
- *A hand-written TypeScript validator*: the rules would be code, not written rules a reader or
  editor can use.

## R8. Comparing text: NFC

**Decision**: wherever the check compares text (duplicates, references, key facts), both sides
are normalized to NFC first (FR-021). Nothing is ever written back, so documents keep every
character as written (FR-020). Key facts are matched case-insensitively with the regular
expression flags `iu`, which use Unicode simple case folding, the same on every machine.

**Rationale**: NFC is the canonical composition W3C recommends for text on the web. `ș` written
as one code point and as `s` plus a combining comma compare equal.

**Alternative considered**: *NFKC*. It would also equate compatibility characters (`ﬁ` and
`fi`), which differ in meaning, and FR-021 asks only about encodings of the same characters.

## R9. The key facts search

**Decision**:

- **Facts** (FR-022, FR-023) are read from the CV on every run: `basics.name`, `basics.email`
  and `basics.phone`, each only when present and non-empty. The real CV publishes no phone, so
  the real search is for the name and email (US3 scenario 4).
- **Files searched** (FR-022, FR-024): every regular file under the root, without following
  symbolic links, except:
  - dot-files and dot-directories at any depth (version control, CI, editor and agent
    configuration), and the directories 001 skips (`node_modules`, `dist`, `build`, `out`,
    `coverage`, `__fixtures__`), through 001's own `isExcludedDir`;
  - test files, as 001 and Vitest define them (`isTestFile`), and directories named `test`,
    `tests` or `__tests__`;
  - the top-level `specs/`, `docs/` and `tools/` directories;
  - `README*`, `LICENSE*`, `LICENCE*` and `COPYING*` files at any depth;
  - the root-level tooling files, listed by name: `package.json`, `package-lock.json`,
    `tsconfig.json`, `vitest.config.ts`, `skills-lock.json` and `CLAUDE.md`. A new root file is
    searched until it's added to the list, so the rule fails safe;
  - generated files: `*.generated.*` and `package-lock.json` at any depth;
  - the CV document.

  Third-party code is in `node_modules/`, already skipped.

  The site data document and its rules are searched. Files that aren't text (a NUL byte, or not
  valid UTF-8) are counted as skipped, not searched.
- **Matching** (FR-025), line by line, on NFC text:
  - name: the words of the name, with any run of whitespace between them, case-insensitive;
  - email: the address, case-insensitive;
  - phone: the digits in order, separated only by spaces, hyphens, dots or parentheses, with no
    digit directly before or after. For an international number (`+44 20 …`), it matches with
    the prefix (`+44…` or `0044…`) and without it. Without it means the number with its first
    one, two or three digits (country calling codes are one to three digits long) removed,
    optionally preceded by a trunk `0`. A phone written without `+` in the CV is matched as
    written.
- Each match is reported at its line and column. When NFC normalization changed a line, the
  column is mapped back to the original text.

**Rationale**:

- Reusing 001's exclusions and test-file test means "test" means the same thing to the runner,
  the traceability check and this check.
- Searching everything except a denylist means new site directories (`apps/`, the shells) are
  covered from their first commit, with no edit here.
- Stripping one to three leading digits covers every country calling code with no table, and a
  stray match on eight or more trailing digits of the owner's number is still worth flagging.

**Alternatives considered**:

- *An allowlist of site directories*: today there are none, and each new one would be unchecked
  until someone remembered to add it.
- *A phone number library such as `libphonenumber-js`*: it parses numbers properly, but FR-025
  only asks for digits with separators, and the real CV publishes no phone.

## R10. Shape description: TypeScript generated from the same rules

**Decision**:

- A small generator in `tools/content-check/src/shape.ts` turns both derived schemas (R4) into
  TypeScript types. `npm run content-shape` writes them to
  `packages/content/src/shape.generated.ts`, which is committed.
- Every CV field is optional (`name?: string`), because the 1.3.1 schema requires nothing
  (FR-026, clarification 2). Site data fields are optional unless the rules list them in
  `required`. No type has an index signature, so reading an undefined field is a type error.
- `packages/content/src/index.ts` imports both documents as JSON and exports them typed as
  `Resume` and `SiteData`. That assignment is itself checked by `npm run typecheck`.
- `shape.test.ts` regenerates the file in memory and fails when it differs from the committed
  one. The description and the rules then can't disagree on `main` (FR-026).
- Type names come from property names: the root is `Resume` or `SiteData`, an object property
  gets its name in PascalCase after the root (`ResumeBasics`, `ResumeLocation`), and an array's
  items get the singular, made by dropping a final `s` (`ResumeProfile`, `ResumeProject`,
  `ResumeWork`). A name collision stops the generator.
- The generator supports the JSON Schema subset in
  [contracts/site-data-rules.md](./contracts/site-data-rules.md), and stops with an error on
  anything else, so a rules change it can't describe fails the shape test.
- `tsconfig.json` adds `packages/**/*.ts` to `include` and turns on `resolveJsonModule`.
  `strict` is already on. FR-027 then holds through the existing `npm run typecheck` step:
  `tsc` names the property and the `file(line,column)`.

**Rationale**: TypeScript can't infer literal types from a JSON file, so the description has to
be generated or written by hand, and FR-026 rules out writing it by hand. Generating from the
derived schema means the check and the types read the same rules.

**Alternatives considered**:

- *`json-schema-to-typescript`*: eight dependencies, Prettier among them, whose output
  formatting changes between versions and would make the staleness test flaky.
- *`json-schema-to-ts` (types inferred from a schema literal)*: needs every schema as a
  TypeScript `as const` literal, so the official schema would become a hand-made copy of the
  package's file (R2). Deep type
  instantiation also slows `tsc` and produces unreadable error messages.
- *`noUncheckedIndexedAccess`*: would also make array elements possibly absent. FR-027 is about
  fields, which `strict` already covers, and the flag would change the meaning of existing
  tooling code.

## R11. Report, exit codes and determinism

**Decision**: the same conventions as 001 (its research R10 and
[contracts/cli.md](../001-requirement-traceability/contracts/cli.md)):

- the report goes to stdout as plain text with `\n` line endings, and stderr carries only usage
  and internal errors;
- problem lines read `<file>:<line>:<column> <type> <subject>: <detail>`;
- paths are relative with `/` separators, sorted by code unit, never by locale;
- exit codes are 0 (pass), 1 (problems found) and 2 (the check couldn't run);
- the entry point is plain JavaScript that checks the Node version first. 001's
  `nodeVersionProblem` gains a parameter for the check's name, so both checks share it.

Values in details are written with `JSON.stringify`, so leading and trailing spaces, tabs and
newlines show (`"Timișoara "`). Non-ASCII characters print as they are.

The exact format is in [contracts/cli.md](./contracts/cli.md).

**Rationale**: FR-031 and FR-034 ask for the same guarantees FR-024 and FR-026 asked of 001, and
the owner reads both reports side by side.

## R12. No network

**Decision**: `npm run content-check` runs
`node --permission --allow-fs-read=. tools/content-check/src/main.js`. No network grant, no
write grant, and no addons grant, because nothing here is native (FR-035). The check never
reads the CV's `$schema` value as an address, and `jsonschema` resolves only references
registered with it in memory.

**Rationale and test**: as 001's R9. The test runs the check under the same flags and passes,
and a positive control proves `fetch` fails under them.

## R13. CI and merge blocking

**Decision**: a third job, `content`, joins `.github/workflows/ci.yml`: checkout → setup-node →
`npm ci` → `npm run content-check`. The ruleset's `required_status_checks` gains
`{ "context": "content", "integration_id": 15368 }`. The typecheck and the shape tests run in the
existing `test` job. Applying the updated ruleset is a repository setting, made with `gh api`
during the pull request (quickstart.md, scenario 10).

**Rationale**: FR-033 asks for the same rules as the traceability check. A separate job gives
reviewers a named result, `content`, and runs exactly the command the owner runs (FR-034).

**Alternative considered**: *adding the check as a step in the `test` job*. A failure would be
harder to see, and the job's name wouldn't say what failed.

## R14. Testing the check

**Decision**:

- Tests live in `tools/content-check/test/`. They build sample projects with 001's
  `makeProject` helper, and spawn the CLI with the same permission flags as the script. The
  helper `test/helpers/cli.ts` adds `runCli`, a small valid `SAMPLE_RESUME` with made-up facts,
  and `contentFiles`, which writes the three documents at their fixed paths, so each test states
  only what it changes (plan Dependencies table).
- Two committed samples, each with an `expected-report.txt` the CLI's output must equal byte for
  byte (SC-001). One sample can't hold every problem type: a missing or unreadable document stops
  the parts that need it, so `missing-document` and `unreadable-document` can't appear in the same
  run as `dangling-reference` and `ambiguous-reference`.
  - `test/__fixtures__/seeded/`: every part runs, with at least one case of every other problem
    type and edge case in the spec.
  - `test/__fixtures__/seeded-broken/`: an unreadable site data document and a missing rules file.
    The CV rules and the key facts search still run (FR-028).

  Between the two reports, every problem type has a non-zero count.
- `shape.test.ts` spawns `tsc --noEmit --pretty false` on a fixture project under
  `test/__fixtures__/shape/` that imports `@cv/content`. It asserts which files fail, with the
  field name and the `file(line,column)` (FR-027). The fixture folder is outside the root
  typecheck, as 001 set up.
- `packages/content/test/content.test.ts` checks the real CV through the package: the sections
  FR-002 requires, the details FR-003 forbids, and characters read back exactly (FR-020).
- `portability.test.ts` validates the real CV with the validator `@jsonresume/schema` ships,
  JSON Resume's own and lenient one, independent of the check's strict rules. The second,
  independent tool for SC-002 is the separately published theme `jsonresume-theme-even`, which
  reads the document itself to render it. It runs through `resumed` as a quickstart step, because
  themes bring large dependency trees. `resumed validate` uses the same `@jsonresume/schema`, so
  it doesn't count as a second tool.
- Test titles carry only full, existing `002-cv-content-FR-###` IDs, because the traceability
  check reads them. Sample IDs and values go in test bodies.
- Fixtures use the owner's published facts or made-up ones, never an unpublished detail. The
  repository is public, so a fixture phone number is a made-up one from a range reserved for
  fiction, such as `+44 20 7946 0958` (FR-003).

## R15. Converting the owner's CV

**Decision**: the owner's current file is converted to a valid, strict 1.3.1 document without
changing any fact (spec Assumptions, clarifications 6 and 7):

| In the current file | In `resume.json` | Why |
|---------------------|------------------|-----|
| `$schema` pointing to the 1.0.0 schema | `https://cdn.jsdelivr.net/npm/@jsonresume/schema@1.3.1/schema.json` | The version the CV now follows (FR-001). It serves the same bytes as the pinned package. Editors may fetch it for completion. The check never does (FR-035) |
| `basics.picture` (an `example.com` URL) and an empty `basics.image` | removed | Not a field of the standard, a placeholder, and no photo is published (FR-003, FR-008, FR-016) |
| `basics.phone` | removed | Email only is published (FR-003) |
| `basics.location` `address`, `postalCode` and `region`, all empty | removed | Unpublished details are left out, not kept empty (FR-003) |
| `countryCode: "Romania"` | `"RO"` | ISO 3166-1 alpha-2 (FR-012) |
| `work[0].company` | `work[0].name` | The standard's field name (FR-008) |
| `"Politehnica University of Timișoara "` | trailing space removed | FR-015 |
| `meta` (copied from the sample CV) | removed | Placeholder values (FR-016). A real `meta` can come later, when the site has a canonical URL |
| `"Running and stregth training"` (Sports interest) | `"Running and strength training"` | Typo (clarification 7) |
| `"…optimized frontend rendering resolving some memory leak"` (Incident Response and Management System) | `"…optimized frontend rendering, resolving some memory leaks"` | Grammar slip (clarification 7) |
| projects in no particular order | newest first: the ongoing Cybersecurity Mobile Platform, then by start date | FR-036. Sales Management Platform and Fitness Administration Platform both start `2019-06-01`, so either order is accepted |

No other text changes. The 1.0.0 to 1.3.1 move needs only the new `$schema` link, because both
versions define the same fields (R2). Rewording beyond typos is left to the owner's review
(spec Assumptions).
