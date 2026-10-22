# Data Model: CV Content Source

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

This feature has two kinds of data: the content itself (two JSON documents in
`packages/content`), and what the check builds in memory for one run. The check writes nothing
to disk and keeps nothing between runs. Field names in the check's model are descriptive. The
code may name them differently.

All file paths are relative to the repository root, with `/` as the separator. Lines and columns
count from 1. Columns count UTF-16 code units (research.md, R5).

## Stored content

### CV document

`packages/content/resume.json`. The owner's CV as a JSON Resume 1.3.1 document (FR-001). It's
the only source of CV facts (Constitution IV).

| Part | Notes |
|------|-------|
| Sections | `$schema`, `basics`, `work`, `volunteer`, `education`, `awards`, `certificates`, `publications`, `skills`, `languages`, `interests`, `references`, `projects`, `meta`, as the 1.3.1 schema defines them. No other field at any depth (FR-008) |
| Required fields | None. The 1.3.1 schema requires nothing, and neither does the check (clarification 2) |
| Filled in | `basics` (`name`, `label`, `summary`, `location`, `profiles`), `work`, `education`, `skills`, `projects`, `languages`, `interests` (FR-002) |
| Never present | `basics.phone`, `basics.image`, `basics.location.address`, and any field holding an empty string for an unpublished detail (FR-003) |
| Encoding | UTF-8, any characters, kept exactly as written (FR-020) |

The conversion from the owner's current file is in research.md, R15.

### Site data document

`packages/content/site.json`. Data only the site needs (FR-004). It holds site-only values and
references to CV entries, never CV facts.

At first it holds only `"$schema": "./schemas/site.schema.json"` (spec Assumptions). Later
features add fields and their rules in the same change (FR-005).

### Site data rules

`packages/content/schemas/site.schema.json`. A draft-07 JSON Schema defining every field the
site data document may hold, which are required, which values each accepts, and which are
references (FR-005, Key Entities). Its format is fixed in
[contracts/site-data-rules.md](./contracts/site-data-rules.md).

### Official schema

`node_modules/@jsonresume/schema/schema.json`, from the `@jsonresume/schema` package pinned to
exactly 1.3.1 (research.md, R2). Never copied or edited.

### Shape description

`packages/content/src/shape.generated.ts`. TypeScript types for both documents, generated from
the derived schemas (research.md, R10). Committed, never edited by hand.

## Check model

### Location

Where a problem is. Every problem carries one (FR-029, SC-007).

| Field | Type | Notes |
|-------|------|-------|
| `file` | string | e.g. `packages/content/resume.json` |
| `line` | integer ≥ 1 | |
| `column` | integer ≥ 1 | `1:1` when there's no narrower position (a missing file, a file that can't be read) |

For a problem in a document, the location is the field's position in the syntax tree:

- for `undefined-field`, the property's key;
- for problems about a value, the value;
- for problems about a whole entry (`duplicate-entry`, `out-of-order`), the entry's opening
  brace.

### Field path

How a problem names a place in a document (FR-029). Built from the validator's path array or the
check's own walk.

- Property names join with `.`, array indexes are in brackets: `basics.picture`,
  `work[0].featured`, `basics.profiles[1].url`.
- A property name that isn't a plain identifier (letters, digits, `_`, `$`, not starting with a
  digit) is written in brackets as a JSON string: `basics["odd key"]`.
- The document itself is `(document)`.

### DocumentRead

The result of reading one JSON document (CV document, site data document or site data rules).

| Field | Type | Notes |
|-------|------|-------|
| `file` | string | |
| `state` | `ok` \| `missing` \| `unreadable` | |
| `value` | JSON value | When `ok`: what `JSON.parse` returned |
| `tree` | syntax tree | When `ok`: from `jsonc-parser`, used only to locate field paths |
| `problem` | Problem | When `missing` (`missing-document`) or `unreadable` (`unreadable-document`) |

**Rules**

- A file that doesn't exist is `missing` (FR-032). One that can't be read, isn't UTF-8, has a
  byte order mark, or isn't valid JSON is `unreadable`, located at the first syntax error
  (FR-029).
- The rules file is also `unreadable` when it's valid JSON but can't be used as rules:
  - the validator rejects it as a schema;
  - an `x-cv-reference` names an unknown kind;
  - a reference's schema has the wrong form for its kind: not `type: "string"` for a kind with
    one identifying field, or not an object whose `properties` are exactly the identifying
    fields for a kind with several ([contracts/site-data-rules.md](./contracts/site-data-rules.md#references));
  - a `format` names a format the check has no rule for (it has rules for `email` and `uri`).

  Each is reported at the offending value, with the details in
  [contracts/cli.md](./contracts/cli.md#details).
- The official schema is part of the tool. If `@jsonresume/schema` isn't installed, or isn't
  version 1.3.1, the check can't run and exits with code 2.

### Check (run unit)

The check's parts, and what each needs. A part whose input isn't `ok` doesn't run, and is listed
under "Checks not run" in the summary (FR-028, FR-030).

| Part | Needs | Produces |
|------|-------|----------|
| CV rules | CV document | `schema-violation`, `undefined-field`, `invalid-date`, `end-before-start`, `invalid-format`, `duplicate-entry`, `out-of-order`, `untrimmed-text`, `placeholder` |
| Site data rules | site data document, rules | `schema-violation`, `undefined-field` |
| References | CV document, site data document, rules | `dangling-reference`, `ambiguous-reference` |
| Key facts search | CV document | `hardcoded-fact`, plus `unreadable-document` for a directory or file it can't read |

### DateValue

A date from a date field (FR-009). Date fields are found by walking the official schema: every
`$ref` to `#/definitions/iso8601` (research.md, R6).

| Field | Type | Notes |
|-------|------|-------|
| `text` | string | As written |
| `parts` | `[year]`, `[year, month]` or `[year, month, day]` | Present only when the text is a valid date |

**Rules**

- Valid forms: `YYYY`, `YYYY-MM`, `YYYY-MM-DD`, years 1000 to 2999 (the schema's pattern).
  Anything else is `invalid-date`: `2018/07`, `July 2018`, `18-07`.
- The date must exist: month 01 to 12, day within the month, 29 February only in leap years.
  `2020-13` and `2021-02-30` are `invalid-date`.
- **Comparing two dates** uses the parts both have. If those are equal, the dates are equal at
  shared precision. `2020-05` and `2020` are equal. `2020-05` is before `2021`.

### Entry and entry kinds

One item of a CV section list (Key Entities). Its kind fixes its identifying fields, used for
duplicates (FR-014) and references (FR-006, FR-018).

| Kind (`x-cv-reference`) | CV list | Identifying fields | Dated by (FR-036) |
|-------------------------|---------|--------------------|-------------------|
| `profile` | `basics.profiles` | `network` | not dated |
| `work` | `work` | `name`, `position`, `startDate` | `startDate` / `endDate` |
| `volunteer` | `volunteer` | `organization`, `position`, `startDate` | `startDate` / `endDate` |
| `education` | `education` | `institution`, `area`, `studyType`, `startDate` | `startDate` / `endDate` |
| `project` | `projects` | `name` | `startDate` / `endDate` |
| `skill` | `skills` | `name` | not dated |
| `interest` | `interests` | `name` | not dated |
| `language` | `languages` | `language` | not dated |
| `award` | `awards` | `title`, `date` | `date` |
| `certificate` | `certificates` | `name`, `date` | `date` |
| `publication` | `publications` | `name`, `releaseDate` | `releaseDate` |
| `reference` | `references` | `name` | not dated |

Every identifying field is a 1.3.1 field of that list's items, so the CV needs no extra field to
be referred to (FR-006). A test asserts this against the official schema.

**Rules**

- **Identity**: two entries in the same list are the same when every identifying field is equal
  after NFC normalization, where a missing field equals only a missing field. Comparison is
  case-sensitive. `GitHub` and `github` are different networks.
- **Duplicates** (FR-014): a group of two or more same entries produces one `duplicate-entry`,
  located at the first, listing every path.
- **Ongoing**: an entry of a ranged kind with a valid `startDate` and no `endDate` (FR-011).
- **End before start** (FR-010): `endDate` before `startDate` at shared precision.
- **Order** (FR-036): entry B must come before entry A when B is ongoing and A isn't, or when
  both are in the same group (both ongoing, or both not) and B's date is after A's at shared
  precision. The date is `startDate` for ranged kinds, the single date otherwise. Every pair is
  compared. Each entry that must come before an earlier one gets one `out-of-order`, naming the
  first such earlier entry. Entries without a valid date are not compared.

### Reference

A value in site data that names a CV entry (Key Entities). Collected while validating site data
(research.md, R7).

| Field | Type | Notes |
|-------|------|-------|
| `path` | field path | Where it is in `site.json` |
| `kind` | entry kind | From the rules' `x-cv-reference` |
| `value` | string, or object of identifying fields | String for kinds with one identifying field, object with exactly those fields otherwise |

**Rules**

- It resolves against the CV list of its kind, comparing each identifying field after NFC
  normalization.
- No matching entry, or a value of the wrong form for its kind: `dangling-reference` (FR-018).
  An entry missing an identifying field can't be matched (spec Edge Cases).
- Two or more matching entries: `ambiguous-reference` (FR-019). The duplicate is reported in the
  CV separately.

### KeyFact

One of the owner's key CV facts, read from the CV on every run (FR-022, FR-023).

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `name` \| `email` \| `phone` | |
| `source` | field path | `basics.name`, `basics.email`, `basics.phone` |
| `pattern` | regular expression | Built from the value (research.md, R9) |

**Rules**

- A fact exists only when its field is a non-empty string. If the CV publishes no phone, no phone
  is searched for (US3 scenario 4).
- Patterns, all applied to NFC text, line by line:
  - **name**: the name's words, split on whitespace, joined by `\s+`, flags `iu`;
  - **email**: the address, flags `iu`;
  - **phone**: the phone's digits, each pair joined by `[ .()-]*`, with `(?<!\d)` before and
    `(?!\d)` after. For a phone written with a leading `+`, also the variants with `00` in front,
    and with the first 1, 2 or 3 digits removed, optionally preceded by `0`. For a phone without
    `+`, only the digits as written.

### SearchedFile

A file the key facts search looks at (FR-022, FR-024).

| Field | Type | Notes |
|-------|------|-------|
| `file` | string | |
| `state` | `searched` \| `skipped-binary` \| `unreadable` | Binary means it contains a NUL byte or isn't valid UTF-8 |

The exclusions are listed in research.md, R9. Directories and files are visited in code-unit
order, and symbolic links are never followed.

### Problem

A finding that fails the check (Key Entities, FR-029).

| Field | Type | Notes |
|-------|------|-------|
| `type` | ProblemType | See the table below |
| `subject` | string | A field path, a file path, or a key fact kind |
| `location` | Location | |
| `detail` | string | One short sentence, the same for the same situation in every run ([contracts/cli.md](./contracts/cli.md)) |

| `type` | Spec name | Meaning | Requirement |
|--------|-----------|---------|-------------|
| `unreadable-document` | unreadable document | A document, the rules or a searched file or directory can't be read or parsed | FR-028, FR-029 |
| `missing-document` | missing document | The CV document, site data document or rules file doesn't exist | FR-032 |
| `schema-violation` | schema violation | A value breaks its schema: wrong type, a missing `required` field, a value outside an `enum`, and so on | FR-007, FR-017 |
| `undefined-field` | undefined field | A field the standard or the rules don't define | FR-008, FR-017 |
| `invalid-date` | invalid date | A date of the wrong form, or one that doesn't exist | FR-009 |
| `end-before-start` | end before start | An end date before its start date | FR-010 |
| `invalid-format` | invalid format | Not an ISO 3166-1 alpha-2 country code, a well-formed email address or an absolute web address | FR-012 |
| `duplicate-entry` | duplicate entry | The same entry listed more than once in a section | FR-014 |
| `out-of-order` | entry out of order | An entry listed after one it should come before | FR-036 |
| `untrimmed-text` | untrimmed text | A text value with leading or trailing whitespace | FR-015 |
| `placeholder` | placeholder value | A URL on an `example.*` domain, or a `meta` value from the sample CV | FR-016 |
| `dangling-reference` | dangling reference | Site data refers to a CV entry that doesn't exist | FR-018 |
| `ambiguous-reference` | ambiguous reference | Site data refers to a CV entry that's listed more than once | FR-019 |
| `hardcoded-fact` | hardcoded CV fact | A key CV fact written out in site source or site data | FR-022 |

**Rules**

- Every problem found is reported. Nothing stops at the first one (FR-028).
- One field gets at most one problem of each type. A wrong date form is one `invalid-date`, not a
  `schema-violation` too.
- Schema errors map to types by keyword: `additionalProperties` → `undefined-field`; `pattern`
  on a date field → `invalid-date`; everything else → `schema-violation`.
- **Ordering** (FR-031): by `file` in code-unit order, then `line`, `column`, the type order in
  the table above, and `subject`.

### Report

The output of one run (FR-030).

| Field | Type | Notes |
|-------|------|-------|
| `problems` | Problem[] | Sorted |
| `documents` | list of `{ file, state }` | The CV document, the site data document and the rules, each `checked`, `missing` or `unreadable` |
| `factKinds` | KeyFact kinds | The facts searched for, e.g. `name, email` |
| `filesSearched` | integer | `SearchedFile`s with state `searched` |
| `filesSkipped` | integer | `skipped-binary` |
| `checksNotRun` | list of parts | Parts that couldn't run, in the order of the Check table. The reason is the `missing-document` or `unreadable-document` problem already in `problems` |
| `countsByType` | map ProblemType → integer | Every type, zeros included, in table order |
| `result` | `pass` \| `fail` | `fail` exactly when `problems` isn't empty (FR-032). A part that couldn't run always comes with the problem that stopped it |

The text rendering is in [contracts/cli.md](./contracts/cli.md).
