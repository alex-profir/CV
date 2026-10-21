# Research: Requirement Traceability Check

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Date**: 2026-10-21

This is the first feature with code, so it also sets the repository's base toolchain: runtime,
package manager, test runner and CI. Each decision below lists what was chosen, why, and what
was rejected. Facts about tool versions were checked against official docs and release notes on
the date above.

## R1. Runtime: Node.js 26, TypeScript run directly

**Decision**: Node.js 26, pinned in `.nvmrc` and `package.json` `engines`. The check is written
in TypeScript and run directly with Node's built-in type stripping. There is no build step and
no compiled output.

**Rationale**:

- Node 26 becomes Active LTS on 2026-10-28 and stays supported until 2029-04-30. Node 24 entered
  maintenance on 2026-10-20. Node 26 is also the first LTS line whose permission model can block
  network access (R9).
- Type stripping is stable and on by default (stable since v24.12.0 and v25.2.0). Running `.ts`
  files directly removes a build step and a dependency such as `tsx`.
- Type stripping only erases types. Enums, namespaces with runtime code and parameter properties
  aren't supported, and Node 26 removed the `--experimental-transform-types` fallback. The
  `tsconfig.json` therefore sets `erasableSyntaxOnly`, `verbatimModuleSyntax`,
  `rewriteRelativeImportExtensions`, `module: nodenext` and `noEmit`, and relative imports use
  explicit `.ts` extensions.
- Type stripping doesn't check types, so a separate `tsc` typecheck runs in CI (R11).

**Alternatives considered**:

- *Node 24 (current LTS)*: it's in maintenance as of yesterday, and its permission model can't
  block the network, so FR-027 would need a hand-written network patch (R9).
- *Compile with `tsc` or bundle*: adds a build step and an output folder for a tool that only
  ever runs from source.
- *`tsx` or `ts-node`*: a dependency that does what Node now does natively.

## R2. Package manager: npm

**Decision**: npm, the version bundled with Node 26 (npm 11). A single private `package.json` at
the repository root, with a committed `package-lock.json`. No workspaces yet.

**Rationale**:

- npm ships with Node, so it needs no extra install locally or in CI. Corepack is no longer
  bundled from Node 25 onwards, so pnpm or Yarn would need a separate install step on every
  machine.
- This feature is one small tool. npm workspaces exist if a later plan adds packages such as
  `packages/content`, and that plan decides the workspace layout.

**Alternatives considered**: *pnpm*, faster installs and stricter dependency isolation, but
neither solves a problem this feature has, and it adds a tool to install everywhere (Constitution
X). A later plan may revisit this with its own reason.

## R3. Test runner: Vitest

**Decision**: Vitest 5 is the project's unit test runner. The check's own tests use it, and the
check reads Vitest's test syntax (R4). End-to-end tests (for example Playwright) aren't part of
this feature. The plan that adds another runner extends the check's reader for that runner's
syntax **in the same pull request**, with tests (spec Assumptions: "the plan decides how a
test's name and tags are read for each tool"). For Playwright, the syntax research is already
done. [Appendix A](#appendix-a-notes-for-the-plan-that-adds-playwright) keeps it for that plan.

**Rationale**:

- The check has to read exactly the test files the suite runs, and sample projects with
  deliberately broken IDs must be excluded from both (FR-014). Vitest's config is a TypeScript
  module, so `vitest.config.ts` imports the check's file-selection constants (R6). The runner
  and the check then can't disagree about which files are tests. Node's built-in runner takes
  file globs on the command line and has no exclude option, so the two lists would have to be
  kept in sync by hand.
- Vitest has a `tags` option on tests and groups, inherited by nested tests (since 4.1). That
  gives Constitution III's "name or tags" a real tags channel.
- The site's UI tests will need a runner that handles TSX and a DOM environment. Using one runner
  for the whole repository keeps the check to one syntax for unit tests.
- Vitest is maintained by its own core team. It isn't a wrapper.

**Alternatives considered**:

- *`node:test`*: no dependency, and enough for this feature's tests alone. It was rejected
  because it can't share the check's exclusion list and has no tags, as described above.
- *Jest*: slower, needs a transform for TypeScript, and has no advantage here.

**Constraints this creates**:

- Vitest rejects tags that aren't declared in its config (`strictTags`). Tests should therefore
  carry requirement IDs **in their titles**. The check still reads `tags` (FR-010) for any
  declared tags.
- A Vitest tag definition can carry `skip` or `todo`, which would skip tests in a way the source
  code doesn't show. The project's Vitest config declares no tags with `skip` or `todo`, and a
  test enforces that (FR-012).

## R4. How tests are read: static parsing, not running the runner

**Decision**: the check parses each test file itself and walks the syntax tree. It doesn't run
the tests or ask the runner to list them.

**Rationale**: each runner-based option breaks a requirement.

- `vitest list --json` leaves out skipped and todo tests and has no tags field. The check then
  couldn't say "only skipped tests reference it" (FR-012) and couldn't validate references on
  skipped tests (FR-012, FR-016 to FR-018).
- Vitest's static collection API (`parseSpecifications`, v5) marks `skipIf` and `runIf` tests as
  skipped. The spec says runtime-conditional skips count as coverage. It also doesn't treat a
  test with no body as a placeholder, and it reports locations per test, not per reference
  (FR-022).
- Listing by running executes the test files' top-level code and needs the runner's whole
  config. That is slower and harder to keep offline and deterministic.

**What the reader recognizes** (Vitest 5):

| Form | Treated as |
|------|------------|
| `test(…)`, `it(…)` | Test |
| `describe(…)`, `suite(…)`, `test.describe(…)`, `test.suite(…)` | Group. Tests lexically inside its callback belong to it |
| Modifiers `.only`, `.concurrent`, `.fails`, `.shuffle` | No effect on coverage |
| Modifiers `.skip`, `.todo` | Marked inactive (skipped / placeholder) |
| Options object whose `skip` or `todo` is a truthy literal, such as `skip: true` | Marked inactive |
| A test with no function body, a group with no callback | Placeholder, inactive |
| `.skipIf(…)` with a truthy literal, `.runIf(…)` with a falsy literal or no argument | Marked inactive. The literal decides in the code that the test never runs |
| `.skipIf(…)` and `.runIf(…)` with any other argument, computed `skip` or `todo` values | Runtime condition: counts (spec Assumptions) |
| `.each(…)(…)`, `.for(…)(…)` | Test or group. The title's literal text is read, placeholders included. A literal empty table, `.each([])` or `.for([])`, declares no tests, so it's marked inactive |
| A top-level `skip(…)` call on the test context inside a test body (`ctx.skip()`, or `skip()` destructured from the context) that always skips: no argument, a string note, or any other literal except `false`, because Vitest skips unless the condition is exactly `false`. The context is the body's first parameter. In a `.for(…)` body it's the second, and an `.each(…)` body gets none | Marked inactive. It is written in the code and always skips |
| Options `tags: 'x'` or `tags: ['x', …]` with literal strings | Tags, read for references |

- Only calls whose root identifier is `test`, `it`, `describe` or `suite` are considered.
  Extended fixtures (`test.extend(…)`) must be exported under one of those names, as Vitest's
  docs do.
- **Fail closed**: a call rooted at one of those names whose shape isn't in the table (for
  example `test.describe.fixme` or `test.step`) is not a test. Tests nested inside it don't
  count toward coverage. References in their titles are still validated. For Vitest syntax, an
  unsupported form can produce a false "uncovered" but never a false "covered".
- **The guarantee is Vitest-only.** Another runner's syntax can break it. Example: in
  Playwright, a bare `test.skip()` inside a `test.describe` skips every test in the group. This
  reader would treat that call as a bodiless placeholder test and still count the group's other
  tests. That's why a new runner and its reader support ship in the same pull request (R3,
  Appendix A).
- Test bodies aren't searched for tests, and nothing outside titles and tags is read (FR-011).
- Tests declared inside blocks, `if`/`else`, loops, `try` and `switch`, at file level or inside a
  group callback, are read like any other, with the enclosing group as their parent. Whether they
  run is a runtime condition, so they count. Tests inside any other function, such as a helper
  that declares tests, aren't read: it may never be called, so counting them could fake coverage.
- A title that is a template literal is read part by part. Each literal part is scanned and
  substitutions are skipped. A title that isn't a literal at all, such as a variable or a
  function reference, contributes no references.

**Alternatives considered**: the runner-listing approaches above, and plain text search over
test files. Text search can't tell a title from a comment (FR-011), can't attach group IDs to
the tests inside (FR-010), and can't see skip markers (FR-012).

## R5. Parser: `oxc-parser`

**Decision**: `oxc-parser`, pinned to an exact version, parses test files and UI source.

**Rationale**:

- TypeScript 7 (the native Go compiler, `typescript@latest` since 2026-07-08) ships no stable
  programmatic API. Its 7.1 beta API runs the compiler as a background process. The classic JS
  API survives only in the frozen TypeScript 6 line (`@typescript/typescript6`, about 23 MB).
  Over time it would flag newer syntax as errors.
- `oxc-parser` parses JS, JSX, TS and TSX and returns an ESTree / TS-ESTree tree with character
  offsets and an `errors` list. It is maintained by the Oxc project, the same organization
  behind the Rolldown and Vite toolchain that Vitest runs on. It installs about 4.6 MB with a
  prebuilt binary per platform, has no install scripts, and parsed 200 sample test files
  (27,400 lines) in 16 ms.
- Offsets are converted to line and column with a small helper.
- Any entry in `errors` makes the file an `unreadable-file` problem, located at the first
  error, and nothing from that file is used (FR-029). On a fatal error oxc returns an empty
  tree, so a partial file can never count as coverage.

**Risks**: `oxc-parser` is pre-1.0 and releases weekly. It's pinned exactly and upgraded on
purpose, with the full test suite run on each upgrade. Under the permission model it loads as a
native addon (R9).

**Alternatives considered**:

- *`@typescript/typescript6`*: vendor-made (Microsoft) and pure JS, but frozen and five times
  larger.
- *`@babel/parser`*: pure JS, but it throws on some syntax errors even with `errorRecovery`, it
  isn't made by the language or runner vendor, and it is slower.
- *TypeScript 7.1 API*: beta, stability unstated, and it starts a child process.

## R6. Which files the check reads

**Decision**:

- **Specs**: `specs/*/spec.md`, one level deep. A directory without `spec.md` is ignored.
- **Test files**: files whose path matches Vitest's default include,
  `**/*.{test,spec}.?(c|m)[jt]s?(x)`, with Node's `path.matchesGlob`.
- **UI source**: every other `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs` or `.cjs`
  file whose text contains `data-req`. Files without that text have nothing to check and aren't
  parsed. No other markup format exists in the repository yet. The plan that adds one, such as
  `.html` or `.mdx`, extends the reader.
- **Where `data-req` is read**: JSX attributes named `data-req`, and object-literal properties
  with the key `'data-req'` (props objects, `createElement` calls). The value is read only when
  it is a string literal, or a template literal with no substitutions, directly or inside a JSX
  expression container. A computed value, such as `data-req={ids}`, can't be checked statically
  and is skipped. This limitation is accepted because checking that every UI requirement has a
  `data-req` element is out of scope. Constitution III's convention is to write the IDs
  literally on the element.
- **Excluded everywhere** (FR-014):
  - directories named `node_modules`, `dist`, `build`, `out`, `coverage` or `__fixtures__`;
  - any directory whose name starts with `.` (`.git`, `.next`, `.github`, `.specify` and so on).
  - Symbolic links aren't followed.
- `__fixtures__` is the project's convention for sample projects that exist only to test a tool,
  like this check's seeded sample project.

These constants live in one module of the check. `vitest.config.ts` builds its `include` and
`exclude` from them, so the runner and the check always agree on what a test file is. Directory
entries are sorted by plain code-unit order before walking, so the order never depends on the
file system (FR-024).

**Alternatives considered**:

- *`git ls-files`*: respects `.gitignore` for free, but makes the check depend on git and on a
  repository. Tests would need a git repo for every sample project, and untracked files would
  count differently on the owner's machine than in CI.
- *A `.gitignore` parser*: a dependency, or a reimplementation, for little gain while the list
  of generated folders is this short. A later plan that adds a generated folder adds its name
  here.

## R7. Reading specs

**Decision**: a small line-based reader with no Markdown library. The grammar comes from the
spec template. It is defined in [data-model.md](./data-model.md#spec):

- HTML comments and fenced code blocks are blanked out first, keeping line numbers. A `<!--`
  inside an inline code span, or one that no `-->` closes, is plain text, so it can't hide the
  rest of the spec.
- The first `**Status**:` line gives the Status.
- Entries are the list items in the `Functional Requirements` section whose first token looks
  like `FR-…`. They may be bold or struck through.

**Rationale**: the template fixes the format, and the reader needs about four patterns. A full
Markdown parser would be a dependency that still needs the same rules on top (Constitution X).

## R8. Reference grammar

**Decision**:

- A **well-formed full ID** is `<feature>-FR-<three digits>`, where `<feature>` is lowercase
  letters and digits in hyphen-separated words, matching Spec Kit's directory names such as
  `001-requirement-traceability`.
- In titles and tags, every case-insensitive `fr-` is examined. Its token is the longest run of
  letters, digits, `-` and `_` around it. A token is either a well-formed full ID or `malformed`
  (FR-018).
- Punctuation such as `.`, `,`, `:`, `(`, `)`, `@` or a space ends a token. A title can say
  `covers 001-requirement-traceability-FR-004.` or carry a Playwright-style `@` tag.
- `data-req` values are split on whitespace, and every piece must be a well-formed full ID
  (FR-013, FR-018).

Classification into valid, unknown, removed or malformed follows
[data-model.md](./data-model.md#reference).

**Consequences**:

- Any `fr-` in a title that isn't part of a full ID is reported, even in unrelated words such as
  `fr-CA`. FR-018 asks for exactly this, and English-only content (vision non-goals) makes such
  words rare.
- A spec directory whose name doesn't fit the grammar can't be referenced. All of Spec Kit's
  sequential names fit.

## R9. No network: the permission model

**Decision**: the `npm run traceability` script runs the check under Node's permission model:
`node --permission --allow-fs-read=. --allow-addons tools/traceability/src/main.js`.

- `main.js` is plain JavaScript. It checks the Node version before it loads the TypeScript
  check, so a Node that's too old, or can't strip types, gets a clear message and exit code 2.
  Node versions without the `--permission` flag (Node 22 before 22.13, Node 23 before 23.5,
  and older lines) refuse the command line themselves, with Node's exit code 9, before any
  script runs.

- `--allow-net` is not granted, so any network call fails with `ERR_ACCESS_DENIED` (FR-027).
- `--allow-fs-write` is not granted, so the check also can't write to disk.
- `--allow-addons` is needed to load `oxc-parser`'s native binary.
- The read scope is `.`, the repository root, because npm runs scripts from there. If Node turns
  out not to accept a relative path for it, the scope widens to `*`. Reads aren't what FR-027 is
  about.

**Rationale**:

- Node 25 added network restriction to the permission model (`--allow-net`, stability 1.1,
  active development). It covers HTTP, HTTPS, DNS, TCP and UDP. With it, the guarantee comes
  from the runtime, not from the check's own code.
- It holds in every run, locally and on pull requests, because both use the same script.

**Test** (FR-027): the test runs the check through the script on a sample project and
asserts it completes with the expected report. A positive control runs a tiny script under the
same flags that calls `fetch` and asserts it fails with `ERR_ACCESS_DENIED`. That proves the
guard is actually on.

**Known limit**: native addon code runs outside the permission model. The addon here is a parser
with no network code. The guarantee covers everything written in JavaScript.

**Alternatives considered**:

- *A preload that patches `net`, `dns`, `dgram` and `fetch`*: needed on Node 24, but it's
  hand-written, easy to get wrong, and it only covers what it patches.
- *Turning the network off in CI*: needs extra runner configuration and only proves the
  pull-request run.

## R10. Output and determinism

**Decision**:

- The report goes to stdout as plain text with `\n` line endings, and contains nothing that
  depends on the machine: no absolute paths, colors, timestamps or durations.
- Paths are relative to the repository root with `/` separators.
- Problems are sorted with plain code-unit comparison, never locale-aware comparison.
- Exit codes are 0 (pass), 1 (problems) and 2 (the check couldn't run).

The full format is in [contracts/cli.md](./contracts/cli.md).

**Rationale**: FR-024 and FR-026 require identical reports across runs and across the owner's
macOS machine and the Linux CI runner. Locale-aware sorting, `\` separators and absolute paths
are the usual reasons such output differs. The `path:line:column` prefix opens straight to the
location in terminals and editors (SC-007).

**Alternatives considered**:

- *GitHub annotations (`::error file=…`) or a job summary*: they show problems inline on the
  pull request, but they make the CI output differ from the local output (FR-026). They'd also
  need CI-only code. A GitHub problem matcher could add annotations later without changing the
  report, if it's ever wanted.
- *JSON output*: no consumer needs it yet. The requirement inspector's spec decides how it gets
  its data (spec Assumptions).

## R11. CI: GitHub Actions workflow

**Decision**: `.github/workflows/ci.yml` runs on every `pull_request` to `main`, with no path
filters. It has two jobs:

- **`traceability`**: checkout, set up Node from `.nvmrc`, `npm ci`, then `npm run traceability`.
  This is the same command the owner runs (FR-026).
- **`test`**: checkout, set up Node, `npm ci`, `npm run typecheck`, `npm test`. It runs the
  check's own tests and the TypeScript typecheck, which Node's type stripping skips.

Further details:

- The workflow has `permissions: contents: read`.
- Actions are pinned to full commit SHAs, as GitHub's security guidance recommends:
  `actions/checkout` v7 and `actions/setup-node` v7.
- `setup-node` caches the npm download cache. `npm ci` needs the network. The check itself
  doesn't.
- No job has an `if:` condition, a matrix or `continue-on-error`. A skipped required job reports
  success on GitHub, a path-filtered workflow leaves the check pending forever, and a matrix
  changes the check's name.
- The test for FR-025 reads `ci.yml` as plain text with a few line rules, because a YAML parser
  would be a new dependency for one test (Constitution X). The workflow therefore keeps a simple
  layout: two-space indentation and one command per `run:` line.

**Rationale**: GitHub Actions is the repository host's own CI, so nothing else is added. The
required check names are the job names: `traceability` and `test`.

**Alternatives considered**: a single job running everything, which would put the traceability
report and test output in one log. Reviewers read the traceability result on its own (US2), so
it gets its own check.

## R12. Blocking merge: a repository ruleset

**Decision**: a repository ruleset on `refs/heads/main`, kept as code in
`.github/rulesets/main.json` and applied with `gh api`. It contains:

- `pull_request`, with 0 required approvals (a solo owner can't approve their own pull request)
  and squash as the only merge method;
- `required_status_checks` for `traceability` and `test`, both bound to the GitHub Actions app
  (`integration_id` 15368) so another app can't post a fake passing status. With
  `strict_required_status_checks_policy: true`, a branch must be up to date with `main` before
  merging. A pull request can't merge on a result computed against an older `main`;
- `non_fast_forward`, which blocks force pushes;
- `deletion`, which blocks deleting `main`;
- `enforcement: active` and an empty `bypass_actors` list.

**Rationale**:

- Rulesets are available for public repositories on GitHub Free.
- Unlike classic branch protection, admins get no bypass unless they're listed. With an empty
  bypass list the owner can't merge a failing pull request or push to `main` (FR-025, SC-003).
  GitHub returns `current_user_can_bypass` when the ruleset is read back. The owner's value must
  be `never`, and quickstart.md checks it.
- Keeping the ruleset in the repository makes the merge rule reviewable like code. It also
  lets an offline test check that the ruleset and the workflow agree. The test checks that the
  required check names match the job names, that bypass is empty and that every rule is present.
- Every rule parameter is written out, so reading the live ruleset back can be compared with
  the file without server defaults showing up as differences.

**Known limit**: the owner, as admin, can still edit or disable the ruleset itself. That's an
administrative act, not a merge, and the spec's "no bypass" is about merges and pushes.
Comparing the live ruleset with the committed file (quickstart.md) detects any drift. The
`update` rule ("restrict updates") is deliberately left out, because it blocks pull-request
merges too.

**Known limit**: a pull request runs its own copy of `ci.yml`, of the check and of its tests,
and the ruleset matches required checks by job name and app only. A pull request can therefore
change what the required checks run, for example to `npm run traceability || true` together
with `repo-settings.test.ts`, and still pass them. GitHub's rule that requires a workflow from a
protected branch ("require workflows to pass before merging") exists only in organization
rulesets, and this repository belongs to a personal account. Even that rule would still run the
check's code from the pull request. A guard on `pull_request_target`, which runs `main`'s copy of
the workflow, could fail any pull request that touches these files, but every legitimate change
to the workflow or the check would then need the ruleset turned off to merge. Such a change is
in the pull request's diff, like a change to a spec's Status or to the check itself, so review
catches it, as it catches renumbered IDs (spec Assumptions).

**Alternatives considered**: *classic branch protection*. It needs the separate "Do not allow
bypassing" setting to bind admins, and it can't be exported as a file the way a ruleset can.

## R13. Testing the check itself

**Decision**:

- **Focused tests** build small sample projects in a temporary directory from inline file
  contents, through a test helper. Each covers one rule.
- **One seeded sample project** is committed under
  `tools/traceability/test/__fixtures__/seeded/`. It contains at least one case of every problem
  type and edge case in the spec, next to the exact report it must produce
  (`expected-report.txt`). This is SC-001, and it's readable by anyone browsing the repository.
- **The real repository**: a test runs the check on the repository itself and asserts it passes
  with `001-requirement-traceability` among the approved specs (FR-028, SC-006).
- **Performance**: a test generates 50 specs and 2,000 tests in a temporary directory and
  asserts the run takes under 10 seconds (SC-004). SC-004 is about the owner's machine, so the
  time isn't asserted on CI, where shared runners vary too much for a required check.
- Test titles carry `001-requirement-traceability-FR-###`, so the check covers its own spec.
  The full mapping is in plan.md's Requirement Traceability table.

**Rationale**:

- Inline sample projects keep each test's input next to its assertion.
- The committed seeded project shows the whole behavior in one place, and it exercises the
  `__fixtures__` exclusion for real. The repository contains broken sample IDs, and the
  repository run must still pass.

## Appendix A. Notes for the plan that adds Playwright

Not part of this feature. These findings came out of this feature's research and are kept so
the plan that adds end-to-end tests doesn't repeat it. Facts were checked on 2026-10-21 against
Playwright Test 1.64.1, its docs ([class-test](https://playwright.dev/docs/api/class-test),
[annotations](https://playwright.dev/docs/test-annotations),
[release notes](https://playwright.dev/docs/release-notes)) and its source. Lines marked
*Inference* are suggestions, not verified behavior.

**Declarations**

| Form | Meaning | Coverage rule |
|------|---------|---------------|
| `test(title, body)`, `test(title, details, body)`, `test.only(…)` | Test | Counts |
| `test.describe(title, cb)`, `test.describe(cb)` (anonymous), `test.describe(title, details, cb)`, with `.only`, `.serial`, `.parallel` (and `.serial.only`, `.parallel.only`) | Group | Its tests count |
| `test.describe.skip(…)`, `test.describe.fixme(…)` | Group statically skipped | Inactive, inherited by its tests |
| `test.skip(title, body)`, `test.fixme(title, body)` (also with `details`) | Test declared with a static skip | Inactive |
| `test.fail(title, body)` | Test expected to fail | Counts, like Vitest's `.fails` |
| `test.describe.configure(…)`, `test.step(…)`, `test.step.skip(…)`, `test.use`, `test.info`, `test.abort`, `test.setTimeout`, hooks | Not tests | Ignored |
| `test.extend(…)` | Returns a test object with the same API | Must be exported as `test` (R4 naming rule) |

**Scope markers** are `test.skip`, `test.fixme`, `test.fail` and `test.slow` called inside a
group or at file level without declaring a test:

| Form | Meaning | Coverage rule |
|------|---------|---------------|
| `test.skip()`, `test.fixme()` with no arguments | Every test in that scope is skipped | Mark the enclosing group, or the whole file, inactive. **This is the gap in today's reader** (R4) |
| `test.skip(condition, description)` | The condition is evaluated when the file loads | Runtime condition: counts (spec Assumptions) |
| `test.skip(callback, description)` | Evaluated per worker, with fixtures | Runtime condition: counts |
| `test.fail()`, `test.slow()` | Expected failure, longer timeout | No effect on coverage |
| Inside a test body: `test.skip()` / `test.fixme()` with no arguments | The test always aborts there | Inactive, like Vitest's `ctx.skip()` |
| Inside a test body, with a condition | Runtime condition | Counts |

*Inference*: no runner detection is needed. Vitest has no argument-less `test.skip()` form, so
one reader can treat a bare `test.skip()` or `test.fixme()` as a scope marker for both runners.

**Tags**

- The option is `tag` (singular), a string or an array of strings. Each must start with `@`;
  Playwright throws otherwise. Group tags are inherited, and any `@word` in a title is also a
  tag. Since 1.57, a config-level `tag` applies to every test.
- A requirement tag looks like `{ tag: '@002-example-FR-003' }`. The reference grammar already
  ends a token at `@` (R8), so it needs no change. The reader must read `tag` (Playwright) as
  well as `tags` (Vitest).
- The `annotation` option (`{ type, description }`) is neither a name nor a tag, and isn't read.

**File selection**

- Playwright's default `testMatch` is `**/*.@(spec|test).?(c|m)[jt]s?(x)`. That's the same set of
  files as Vitest's default include, so without configuration each runner would pick up the
  other's tests.
- *Inference*: give end-to-end tests their own directory, set it as Playwright's `testDir` and
  exclude it from Vitest. Build both runners' configs from the check's shared constants (R6), so
  the check keeps reading every test file of both runners.

**Why the reader should stay static**

`playwright test --list --reporter=json` reports title, tags (without the `@`), file, line,
column and `expectedStatus: 'skipped'` for static skips, inherited ones included. It still
doesn't fit, for the same reasons as Vitest's listing (R4):

- It runs the config, the imports, top-level code and group callbacks.
- It reports a load-time conditional skip that evaluates to true as `skipped`. The spec counts
  that kind of skip as coverage.
