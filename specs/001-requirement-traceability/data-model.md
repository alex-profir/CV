# Data Model: Requirement Traceability Check

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

The check holds everything in memory for one run. Nothing is stored between runs, and nothing is
written to disk. The model below is the in-memory shape the check builds while it reads the
repository, and the rules it applies to each piece. Field names are descriptive. The code may
name them differently.

All file paths in the model are relative to the repository root, with `/` as the separator, so
a run on macOS and a run on Linux produce the same text (FR-024, FR-026). Lines and columns
count from 1.

## Location

Where something was found. Every problem carries one (FR-022, SC-007).

| Field | Type | Notes |
|-------|------|-------|
| `file` | string | Relative POSIX path, e.g. `specs/002-example/spec.md` |
| `line` | integer ≥ 1 | |
| `column` | integer ≥ 1 | Column of the first character of the ID or text involved. `1` when the problem has no narrower position (missing Status, unreadable file with no parse position) |

## Spec

One `specs/<feature>/spec.md` file (FR-001).

| Field | Type | Notes |
|-------|------|-------|
| `feature` | string | The directory name, e.g. `001-requirement-traceability` |
| `file` | string | `specs/<feature>/spec.md` |
| `status` | `Approved` \| `Draft` \| `Invalid` | Parsed from the `**Status**:` line |
| `statusText` | string \| null | The raw value after `**Status**:`, or null when the line is missing |
| `statusLocation` | Location | The Status line, or line 1 when missing |
| `entries` | RequirementEntry[] | Every entry found in the Functional Requirements section, in file order |

**Validation rules**

- A directory under `specs/` with no `spec.md` isn't a spec and is ignored. A `spec.md` that
  exists but can't be read produces an `unreadable-file` problem (FR-029).
- Before parsing, HTML comments (`<!-- … -->`) and fenced code blocks are blanked out while
  keeping line numbers. Text inside them is never a Status or a definition.
- `status` is `Approved` or `Draft` only when the trimmed value is exactly that word. Anything
  else, including a missing line, makes it `Invalid` and produces a `bad-status` problem
  (FR-003).
- Only an `Approved` spec needs coverage and gets its entries checked (FR-002, FR-006 to
  FR-008). `Draft` and `Invalid` specs still provide reference targets (FR-019). An `Invalid`
  spec is treated like a Draft one, so a typo in Status produces one problem rather than a
  cascade of unknown references.
- An `Approved` spec with no well-formed entries produces a `no-requirements` problem (FR-008).

## RequirementEntry

One list item in the spec's Functional Requirements section whose leading token looks like a
requirement ID (FR-004).

| Field | Type | Notes |
|-------|------|-------|
| `rawId` | string | The token as written, without bold or strike markup, e.g. `FR-003`, `FR-1`, `fr-001` |
| `wellFormed` | boolean | `rawId` matches `FR-` followed by exactly three digits |
| `removed` | boolean | The token is struck through (`~~**FR-004**~~` or `**~~FR-004~~**`) (FR-005) |
| `location` | Location | Position of the ID token |

**Validation rules**

- The Functional Requirements section starts at a heading whose text is exactly `Functional
  Requirements` and ends at the next heading of the same or a higher level. Bold paragraph
  labels such as `**Finding requirements**` aren't headings and don't end it.
- An entry is a list item (`- ` or `* ` at the start of the line) whose first token, after
  optional `~~` and `**` markup, starts with `fr` in any letter case followed by an optional
  separator and a digit. Other list items and indented continuation lines are ignored.
- IDs mentioned anywhere else in the spec are never entries (FR-004).
- In an `Approved` spec, an entry with `wellFormed = false` produces a `malformed` problem
  (FR-006). In a Draft spec it's ignored (clarification 2026-10-21).

## Requirement

A well-formed ID defined in a spec. Derived from the spec's entries.

| Field | Type | Notes |
|-------|------|-------|
| `feature` | string | From the spec |
| `id` | string | `FR-###` |
| `fullId` | string | `<feature>-FR-###` (FR-009) |
| `state` | `active` \| `removed` | `active` when at least one definition is active |
| `definitions` | Location[] | Every line that defines this ID in the spec, in file order |
| `approved` | boolean | Whether the spec is `Approved` |

**Validation rules**

- In an `Approved` spec, `definitions.length > 1` produces one `duplicate-id` problem. It is
  located at the first definition and names every line (FR-007). Active and removed entries with
  the same ID count as duplicates.
- Only `active` requirements in `Approved` specs need coverage (FR-002, FR-005, FR-015).

**Coverage state** (for an active requirement in an approved spec)

```text
                ┌─ at least one counting test references it ───────▶ covered
requirement ────┼─ only skipped/disabled/placeholder tests do ─────▶ uncovered (note: "only skipped…")
                └─ no test references it ──────────────────────────▶ uncovered
```

## TestNode

A test or group of tests declared in a test file. The check reads test files statically, without
running them (see research.md, R4 and R5).

| Field | Type | Notes |
|-------|------|-------|
| `kind` | `test` \| `group` | `test`/`it` declare tests, `describe`/`suite` declare groups |
| `file` | string | The test file |
| `titleTexts` | TextSpan[] | Literal text of the title. A template literal gives one span per literal part. A non-literal title gives none |
| `tagTexts` | TextSpan[] | Each literal tag value from the declaration's options |
| `markedInactive` | boolean | Statically marked skipped, disabled or placeholder in the code (see rules) |
| `parent` | TestNode \| null | The enclosing group, if the declaration is lexically inside a group's callback |

`TextSpan` is a piece of literal source text plus the Location of its first character.

**Validation rules**

- A test counts toward coverage only when neither it nor any ancestor group is `markedInactive`
  (FR-012).
- `markedInactive` is true when the declaration uses a `.skip` or `.todo` modifier, when its
  options set `skip` or `todo` to `true`, when a test has no function body or a group has no
  callback (a placeholder), or when a test body unconditionally calls the context's `skip()` as
  a top-level statement. Runtime-conditional forms (`.skipIf(…)`, `.runIf(…)`, computed option
  values) don't mark anything (spec Assumptions). The full table is in research.md, R4.
- A test's effective references are the references in its own `titleTexts` and `tagTexts` plus
  those of every ancestor group (FR-010). A group with no tests covers nothing.
- Text in a test file outside a title or tag, such as comments, assertions, helper strings or
  `.step` titles, is never read (FR-011).
- A call whose shape the reader doesn't recognize is not a test or group. It counts toward
  nothing and isn't checked for references, so an unsupported form can never fake coverage.

## Reference

One occurrence of something ID-like in a test or group title or tag, or one value of a
`data-req` attribute (FR-010, FR-013).

| Field | Type | Notes |
|-------|------|-------|
| `text` | string | The token as written, e.g. `002-example-FR-003`, `FR-001`, `002-example-fr-003` |
| `source` | `test` \| `group` \| `data-req` | Where it was found |
| `location` | Location | Position of the token's first character |
| `counts` | boolean | For `test`/`group` sources: the reference sits on a node whose tests can count. Always false for `data-req` |
| `classification` | `valid` \| `unknown` \| `removed` \| `malformed` | See below |

**Finding tokens**

- In a title or tag, every case-insensitive occurrence of `fr-` is examined. Its token is the
  longest run of letters, digits, `-` and `_` around it. Each token is one reference, even if it
  contains `fr-` more than once.
- In a `data-req` value, the value is split on whitespace and every piece is one reference.
  An empty value is one `malformed` reference with empty text.

**Classification** (FR-016 to FR-019)

```text
token matches  <feature>-FR-<3 digits>,
with <feature> = lowercase letters/digits in hyphen-separated words?
 ├─ no  ─────────────────────────────────────────────────────▶ malformed
 └─ yes ─▶ a spec with directory <feature> exists?
            ├─ no  ──────────────────────────────────────────▶ unknown
            └─ yes ─▶ that spec defines FR-###?
                       ├─ no  ───────────────────────────────▶ unknown
                       └─ yes ─▶ every definition removed?
                                  ├─ yes ────────────────────▶ removed
                                  └─ no  ────────────────────▶ valid (Draft specs included, FR-019)
```

- When the target spec exists but its `spec.md` couldn't be read, the reference isn't
  classified. The `unreadable-file` problem already fails the check.
- Every `unknown`, `removed` and `malformed` reference is a problem, including references on
  inactive tests and on groups with no tests (FR-012, FR-016 to FR-018).
- A `valid` reference with `counts = true` covers its requirement. One test with several valid
  references covers each of them (FR-010).

## DataReqAttribute

One `data-req` attribute in UI source (FR-013). It yields one Reference per value.

| Field | Type | Notes |
|-------|------|-------|
| `file` | string | A UI source file (see research.md, R6) |
| `valueSpan` | TextSpan | The attribute's literal value |

**Validation rules**

- The attribute is a JSX attribute named `data-req`, or an object-literal property with the key
  `'data-req'`.
- The value is read only when it's a literal: a string, or a template literal without
  substitutions. A computed value can't be checked statically and is skipped. This limitation is
  recorded in research.md, R6.

## Problem

A finding that fails the check (FR-020).

| Field | Type | Notes |
|-------|------|-------|
| `type` | ProblemType | See the table below |
| `subject` | string | The full ID, the malformed text, the feature or the Status text involved |
| `location` | Location | Where it was found. For `uncovered`, the requirement's definition (FR-022) |
| `detail` | string | One short sentence, e.g. `no test references this requirement` |

| `type` | Meaning | Requirement |
|--------|---------|-------------|
| `uncovered` | Active requirement in an approved spec with no counting test | FR-015, FR-012 |
| `unknown-reference` | Reference to a feature or requirement that doesn't exist | FR-016 |
| `removed-reference` | Reference to a removed requirement | FR-017 |
| `malformed` | Malformed ID in an approved spec's entries, or a malformed reference | FR-006, FR-018 |
| `duplicate-id` | Same ID defined more than once in one approved spec | FR-007 |
| `bad-status` | Missing Status, or a Status other than Draft or Approved | FR-003 |
| `no-requirements` | Approved spec with no requirements | FR-008 |
| `unreadable-file` | A spec, test or UI file the check needs but can't read or parse | FR-029 |

**Ordering** (FR-024): problems are sorted by `file` (plain code-unit comparison, not
locale-aware), then `line`, then `column`, then by the type order in the table above, then by
`subject`. Two runs over the same files therefore list problems in the same order.

## Report

The output of one run (FR-021, FR-023).

| Field | Type | Notes |
|-------|------|-------|
| `problems` | Problem[] | All problems from the run, sorted |
| `approvedSpecs` | integer | Approved specs checked |
| `activeRequirements` | integer | Active requirements in approved specs |
| `coveredRequirements` | integer | Of those, how many are covered |
| `countsByType` | map ProblemType → integer | Every type is listed, including zeros, in table order |
| `result` | `pass` \| `fail` | `fail` exactly when `problems` is not empty (FR-020) |

The text rendering of the report is defined in [contracts/cli.md](./contracts/cli.md).
