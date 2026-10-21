# Contract: Traceability Check Command and Report

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

This is the check's only interface. The owner runs it locally, and the pull-request workflow
runs the same command ([ci.md](./ci.md)). The contract is the command, its exit codes and the
exact text of the report.

## Command

```sh
npm run traceability
```

- Run from the repository root. The check reads the files under the current directory and
  nothing else.
- Takes no arguments. Any argument is a usage error (exit code 2).
- Makes no network requests (FR-027).
- Writes nothing to disk.

Behind the script:

```sh
node --permission --allow-fs-read=. --allow-addons tools/traceability/src/cli.ts
```

npm runs scripts from the repository root, so `.` is the repository. If Node doesn't accept a
relative path there, the script uses `*` instead (research.md, R9).

The permission flags grant no network and no disk writes, so Node itself refuses any network
call (research.md, R9). Tests run the same file with the same permission grants, with a sample
project as the working directory. Their read scope also covers the repository, so Node can load
the check and its parser from outside the sample project.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Pass: no problems (FR-020) |
| `1` | Fail: at least one problem was reported (FR-020) |
| `2` | The check itself couldn't run, e.g. an unexpected argument, a Node version older than 26 (its permission model can't block the network, so FR-027 wouldn't hold) or an internal error. The message goes to stderr |

A pull-request run fails on any non-zero code.

## Output streams

- The report goes to **stdout**, and only the report.
- **stderr** carries usage errors, internal errors and any runtime warnings. Nothing on stderr
  is part of the report, so FR-024 and FR-026 apply to stdout.
- These rules describe the check itself. `npm run traceability` also prints npm's own banner
  (`> traceability` and the command) before the report, unless it's run with `--silent`. The
  banner isn't part of the report, so tests compare the report from
  `npm run --silent traceability`.

## Report format

The report is plain text, UTF-8, with `\n` line endings. It has two parts: one line per problem,
sorted as described in [data-model.md](../data-model.md#problem), then the summary. When there
are problems, one empty line separates the two parts. With no problems, the report starts at
the summary. The report ends with a single `\n` after the result line.

### Problem line

```text
<file>:<line>:<column> <type> <subject>: <detail>
```

- `<file>` is relative to the repository root, with `/` separators. `<file>:<line>:<column>`
  can be clicked in most terminals and editors (SC-007).
- `<type>` is one of the eight problem types in the data model.
- `<subject>` is the full ID, or the text as written in double quotes when it's malformed, a
  Status value, or empty.
- `<detail>` is one short sentence, the same for the same situation in every run.

Problem lines by type (the paths and IDs are examples):

```text
specs/002-example/spec.md:41:5 uncovered 002-example-FR-003: no test references this requirement
specs/002-example/spec.md:43:5 uncovered 002-example-FR-004: only skipped, disabled or placeholder tests reference this requirement
src/clock.test.ts:12:20 unknown-reference 002-example-FR-009: spec 002-example defines no FR-009
src/clock.test.ts:20:9 unknown-reference 099-missing-FR-001: no spec directory is named 099-missing
src/Clock.tsx:8:21 removed-reference 002-example-FR-002: this requirement was removed
src/clock.test.ts:30:14 malformed "FR-001": not a full requirement ID of the form <feature>-FR-###
specs/002-example/spec.md:47:5 malformed "FR-1": a requirement ID must be FR- followed by exactly three digits
specs/002-example/spec.md:39:5 duplicate-id 002-example-FR-002: defined 2 times, on lines 39 and 52
specs/003-other/spec.md:7:13 bad-status "Aproved": Status must be Draft or Approved
specs/004-third/spec.md:1:1 bad-status "": spec has no Status line
specs/005-empty/spec.md:1:1 no-requirements 005-empty: approved spec defines no requirements
src/broken.test.ts:3:7 unreadable-file "src/broken.test.ts": cannot be parsed: ')' expected
```

An `uncovered` detail is one of four sentences, depending on which tests reference the
requirement:

- none: `no test references this requirement`
- only skipped, disabled or placeholder tests:
  `only skipped, disabled or placeholder tests reference this requirement`
- only tests inside calls the check doesn't recognize (research.md, R4):
  `only tests inside calls the check doesn't recognize reference this requirement`
- both kinds, and no counting test:
  `only skipped, disabled or placeholder tests, or tests inside calls the check doesn't recognize, reference this requirement`

### Summary

The summary is always printed (FR-023). Every problem type is listed, including zeros, in the
data model's order.

Failing run:

```text

Summary
  Approved specs checked:       2
  Active requirements checked:  31
  Requirements covered:         29
  Problems:                     12
    uncovered                   2
    unknown-reference           2
    removed-reference           1
    malformed                   2
    duplicate-id                1
    bad-status                  2
    no-requirements             1
    unreadable-file             1

FAIL: 12 problems found.
```

Passing run:

```text
Summary
  Approved specs checked:       1
  Active requirements checked:  29
  Requirements covered:         29
  Problems:                     0
    uncovered                   0
    unknown-reference           0
    removed-reference           0
    malformed                   0
    duplicate-id                0
    bad-status                  0
    no-requirements             0
    unreadable-file             0

PASS: all 29 active requirements in 1 approved spec are covered.
```

No approved specs, or no `specs/` folder (spec Edge Cases). References are still checked, so this
run can still fail:

```text
Summary
  Approved specs checked:       0
  ...

PASS: no approved specs found, so there are no requirements to cover.
```

When that run fails, because references are still checked, the result line says both:

```text
FAIL: 2 problems found. No approved specs found.
```

The singular forms (`1 problem`, `1 approved spec`) are used when the count is 1. The passing
line depends on N, the number of active requirements in M approved specs:

- N of 2 or more: `PASS: all N active requirements in M approved specs are covered.`
- N of 1: `PASS: the 1 active requirement in M approved specs is covered.`
- N of 0, when the approved specs define only removed requirements:
  `PASS: M approved specs define no active requirements, so there are none to cover.`, or
  `PASS: 1 approved spec defines no active requirements, so there are none to cover.`

## Stability guarantees

- The same files produce byte-identical stdout and the same exit code, on any machine, with or
  without a network connection (FR-024, FR-026, FR-027, SC-002, SC-005).
- Output never contains absolute paths, timestamps, durations, colors or anything that depends
  on the machine, the locale or the terminal.
- The problem-line grammar and type names are stable. A later feature, such as the
  requirement inspector, may rely on them.
