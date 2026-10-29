# Research: Requirement Traceability Check

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

**Date**: 2026-10-21. **Amended**: 2026-10-29 (R14 to R21: the fast and full test sets, the
pull-request workflow, the local full run and its sign-off; notes added to R3, R11 and R12).

This is the first feature with code, so it also sets the repository's base toolchain: runtime,
package manager, test runner and CI. Each decision below lists what was chosen, why, and what
was rejected. Facts about tool versions were checked against official docs and release notes on
the date above. The amendment's facts were checked on 2026-10-29 against Vitest 5.0.5's
installed source and types, GitHub's REST documentation for rulesets and commit statuses, and
timings the owner measured on the repository's own CI runs.

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

**Amended 2026-10-29**: the config now declares two Vitest projects, `fast` and `slow`, built
from the same constants (R14). `npm test` still runs every test; the check still selects test
files with `TEST_INCLUDE_GLOBS` and `TEST_EXCLUDE_GLOBS` alone, so the split never narrows what
it reads (FR-030).

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

**Amended 2026-10-29**: later features added the `content`, `tokens` and `site` jobs, and the
`test` job installs Chromium and runs every test. R15 replaces the `test` job's steps with the
typecheck and the fast set, and puts a 6-minute limit on every job. The rest of this decision
holds.

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

**Amended 2026-10-29**: the required checks now also list `content`, `tokens` and `site` (from
002 to 004), and the amendment adds `local-verify` with no `integration_id` (R19).

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

## The amendment of 2026-10-29

The spec's Session 2026-10-29 moves the full test run to the owner's machine and adds a sign-off
on the pull request's head commit (FR-030 to FR-037, SC-008 to SC-010). The check itself
(FR-001 to FR-029) is unchanged. R14 to R21 decide how.

**What was measured** (the owner, on the repository's own CI, before the amendment):

- The `test` job (`npm ci`, Playwright install, `npm run typecheck`, `npm test`) took about
  1,120 s of wall time on `ubuntu-latest` (4 vCPU): 150 test files, 3,124 s summed across workers.
- By area: `tools/site-check/test/` 1,903 s (61%). Within it `cli.test.ts` alone took 819 s,
  because two of its tests run the full check on the real build twice; then `shell.test.ts`
  238 s, `offline.test.ts` 208 s, `shell-states.test.ts` 178 s, `terminal.test.ts` 142 s,
  `pages.test.ts` 88 s and `lighthouse.test.ts` 87 s.
- `packages/web/test/`'s browser tests took 1,197 s (Terminal 553 s, shell 404 s, the rest
  240 s).
- Every test that needs neither a browser nor the site build (the Terminal engine, the tools'
  unit tests, `os-core`, content, tokens, traceability) took about 25 s together.
- The `site` job (`npm run site-check`) takes about 3.5 minutes. `cli.test.ts` (a 300 s budget)
  timed out once on a slow runner.

So the time is in the browser and site-build tests. The site check that runs on pull requests is
already its own job, and stays one (004 FR-048).

## R14. The fast set and the full set: two Vitest projects

**Decision**: `vitest.config.ts` declares two inline projects. Every test file is in exactly one.

- **`fast`**: the test files under the directories whose tests need neither a browser nor the
  site build. The list is a constant, `FAST_TEST_GLOBS`, in `tools/traceability/src/files.ts`,
  next to `TEST_INCLUDE_GLOBS`, one glob per directory:

  ```text
  tools/traceability/test/**     tools/content-check/test/**    tools/token-check/test/**
  tools/local-verify/test/**     packages/content/test/**       packages/os-core/test/**
  packages/tokens/test/**        packages/web/test/terminal/engine/**
  ```

  Each glob ends in the same file pattern as `TEST_INCLUDE_GLOBS`, so only test files match.
  Today that is 64 files, plus the amendment's new ones. `fast` has no `globalSetup`.
- **`slow`**: every other test file, that is `TEST_INCLUDE_GLOBS` minus `TEST_EXCLUDE_GLOBS`
  and minus `FAST_TEST_GLOBS`. Today that is 86 files: all of `tools/site-check/test/` and
  `packages/web/test/` except the Terminal engine. It keeps the `globalSetup` that builds the
  site once per run (`packages/web/test/helpers/site.ts`, 004 research R21).
- The **full set** is both projects. The **fast set** is the `fast` project (FR-030).
- The root config keeps the plugins and `oxc` options, which both projects inherit (Vitest 5
  inline projects extend the declaring config by default), and sets no `include`, `exclude` or
  `globalSetup` of its own. Each project writes out its own `include` and `exclude`, so no
  inherited array can widen `fast`.

**Scripts**: `test` stays `vitest run`, the full set. `test:fast` is `vitest run --project fast`.

**Why per directory, not per file**: a new Node-only test placed in one of these directories is
in the fast set with no edit, and a new browser test anywhere else is in the full set only. The
mixed directories (`packages/web/test/` and `tools/site-check/test/`) stay `slow` as a whole.
The four Node-only files there (`dates`, `location`, `self-check` and `shell/amendment` in
`packages/web/test/`, and `tools/site-check/test/report.test.ts`) cost a few seconds locally and
aren't worth per-file globs. A file wrongly in `slow` still runs before merge, in the local
full run. A file wrongly in `fast` is what the machine check below catches.

**Vitest behavior relied on** (checked in Vitest 5.0.5's installed source):

- `globalSetup` is a per-project option. A project's global setup runs only when the run
  includes at least one of that project's files, and an extending project doesn't inherit the
  root's `globalSetup`. So `vitest run --project fast` never builds the site.
- `--project fast` selects that project alone. `vitest run` with no filter runs every project.
- `vitest list --filesOnly --json` prints every selected test file with its `projectName`,
  without running a test or a global setup. The machine check uses it.

**The machine check** (`tools/traceability/test/test-sets.test.ts`, in the fast set, FR-030 and
SC-010):

1. **Every test file is in the full set, exactly once.** It runs Vitest's own listing
   (`vitest list --filesOnly --json`, from the repository root, with the parent run's `VITEST*`
   variables removed) and compares it with the check's `listFiles(REPO_ROOT).testFiles`. The two
   lists must be equal, every file must appear once, and its project must be `fast` or `slow`.
   This asks the runner itself, so a merge or glob surprise in the config can't hide a file.
2. **The check reads every test.** The same comparison proves it: the check selects with
   `TEST_INCLUDE_GLOBS` and `TEST_EXCLUDE_GLOBS` only, and `files.ts` never consults
   `FAST_TEST_GLOBS` when it lists files.
3. **The fast set holds nothing that needs a browser or the site build.** For every `fast`
   file, it follows the file's runtime imports (static `import` and `export … from` without
   `type`, and literal dynamic `import()`), through relative paths and the `@cv/*` workspace
   packages, parsing each module with the check's own `oxc-parser` wrapper (`source.ts`). It
   fails, naming the file and the import chain, when the closure reaches:
   - the packages `playwright`, `playwright-core`, `lighthouse`, `chrome-launcher` or `vite`;
   - `tools/site-check/src/browser.ts` (the only place a browser is launched, 004 FR-057),
     `packages/web/scripts/build-site.ts`, or the page-test helpers `packages/web/test/helpers/site.ts`,
     `browser.ts` and `copy.ts`;
   - a call to `node:child_process` (`spawn`, `spawnSync`, `exec`, `execSync`, `execFile`,
     `execFileSync`, `fork`) in any module of the closure with a string-literal argument, or an
     array element, naming `build-site`, `site-check/src/main.js`, or the npm scripts `build` or
     `site-check`. Plain strings elsewhere don't count, so 001's repo-settings test may still
     compare the workflow's text with `npm run --silent site-check`.

   Today's closure of the fast set reaches none of these (it reaches `vitest`, `oxc-parser`,
   `react`, `postcss`, `css-tree`, `jsonc-parser`, `jsonschema`, `expr-eval-fork` and Node
   built-ins).
4. **The config matches the constants.** `vitest.config.ts`, imported as `files.test.ts`
   already does, has projects named `fast` and `slow` built from the constants, only `slow`
   has a `globalSetup`, and the root has none.

A second guard holds at run time: CI's `test` job installs no browser and `fast` has no global
setup, so a fast test that launches Chromium or reads the built site fails on the pull request.

**Alternatives considered**:

- *A computed split*: the config parses every test file at load time and puts each in `fast`
  when its imports allow. No list to keep, but the config would parse 150 files on every run,
  and the split would be invisible to a reader. The static rule above is the same analysis, run
  once as a test.
- *Tags* (`tags: ['browser']` and `--tags-filter`): every one of the 86 files would need a tag,
  a missing tag would silently put a browser test in the fast set, and the traceability check
  reads tags as references (R3, R8).
- *Two config files*: the two lists would drift, and `npm test` would need two commands.
- *Separate npm scripts with file arguments*: the same drift, and nothing ties the arguments to
  the check's selection.

## R15. The pull-request workflow after the amendment

**Decision**: `.github/workflows/ci.yml` keeps its five jobs and their names, so the required
checks keep their names. Only the `test` job's steps change, and every job gets a 6-minute limit.

| Job | Steps |
|-----|-------|
| `traceability` | checkout, setup-node, `npm ci`, `npm run traceability` (unchanged) |
| `test` | checkout, setup-node, `npm ci`, `npm run typecheck`, `npm run test:fast` |
| `content` | checkout, setup-node, `npm ci`, `npm run content-check` (unchanged) |
| `tokens` | checkout, setup-node, `npm ci`, `npm run token-check` (unchanged) |
| `site` | checkout, setup-node, `npm ci`, the Playwright cache, `npx playwright install --with-deps chromium`, the `npm run --silent site-check` step (unchanged) |

- The `test` job loses its Playwright cache and install steps. The fast set needs no browser,
  and installing one would hide a fast test that wrongly needs it (R14).
- Every job has `timeout-minutes: 6` (SC-008). A job that runs longer fails instead of
  stretching the wait, so a regression past the budget is a red check, not a slow one. Expected
  times: `site` about 3.5 minutes as measured, `test` under 2 minutes (`npm ci`, the typecheck and
  about 25 s of tests over 4 workers), the other three about a minute each. The jobs run in
  parallel, so the pull request's checks finish when `site` does.
- `permissions: contents: read` stays the workflow's only permission. The workflow's token
  therefore can't create commit statuses (that needs `statuses: write`), and no step mentions
  `local-verify`, `signoff` or `gh`. CI can't record a sign-off (FR-034, R18).
- The layout rules the repo-settings tests rely on stay: two-space indentation, one command per
  `run:` line, no `if:`, matrix or `continue-on-error`, actions pinned to full SHAs.
- "Nothing else" (FR-031) is checked as a whole: across all jobs, the `run:` commands are exactly
  `npm ci`, `npm run traceability`, `npm run typecheck`, `npm run test:fast`,
  `npm run content-check`, `npm run token-check`, `npx playwright install --with-deps chromium`
  and the site-check step. A test asserts that set (R20).

**How the 001 pull request runs under it**: GitHub runs a pull request's own copy of `ci.yml`
(R12, known limit), so the amendment's pull request is the first to run the new workflow. The
job names don't change, so the ruleset in force at the time is satisfied by them as before. The
ruleset change (R19) is applied during that pull request (R19, rollout).

**Alternatives considered**:

- *A path-filtered or conditional full run on pull requests*: path filters leave required checks
  pending forever and `if:` makes a skipped required job pass (R11).
- *Splitting the full set across a matrix of CI runners (sharding)*: four or more runners per
  pull request, a matrix changes check names, and the slowest shard would still hold the
  site-check self-tests that time out (spec Session 2026-10-29: the full run moves to the
  owner's machine).
- *A nightly full run on `main`*: it reports after merge, not before, which the constitution's
  merge requirements forbid.
- *A new job name for the fast tests* (`fast`): the ruleset, five repo-settings tests and the
  live ruleset would all change for no gain. `test` still runs the tests a pull request runs.

## R16. The local full run: `npm run verify`

**Decision**: a small repository tool, `tools/local-verify/`, run by
`npm run verify` (`node tools/local-verify/src/main.js verify`). Its `main.js` is plain JavaScript
with the same Node-version gate as the other tools, then loads the TypeScript.

**What it does, in order** (FR-032, FR-033, SC-010):

1. **The commit**: `git rev-parse HEAD`. Not in a git work tree: exit 2.
2. **A clean tree**: `git status --porcelain=v1 -z --untracked-files=all`. Any entry (modified,
   staged, deleted, renamed or untracked) refuses the run before anything else runs, naming
   every path, with exit 2. Files ignored by `.gitignore` (`node_modules/`, `dist/`) aren't
   entries: they aren't part of a commit, and the site check rebuilds `dist/` itself.
3. **Prerequisites**, each with what is missing and the command that fixes it, exit 2, and
   nothing run:
   - Node's major version equals `.nvmrc` (`26`), as CI's setup-node reads it: `nvm use`.
   - `node_modules/` matches `package-lock.json`: every package entry in the lockfile has the
     same version in npm's hidden lockfile `node_modules/.package-lock.json`: `npm ci`.
   - Playwright's Chromium is installed, using the site check's own `hasChromium()`
     (`tools/site-check/src/browser.ts`): `npx playwright install chromium`. The message is
     the site check's.
4. **The checks**, in this order, each named by its CI job and run with inherited output, the
   same commands as the pull request's (R15) except that `test` runs the full set:

   | Name | Command |
   |------|---------|
   | `typecheck` | `npm run typecheck` |
   | `traceability` | `npm run traceability` |
   | `content` | `npm run content-check` |
   | `tokens` | `npm run token-check` |
   | `test` | `npm test -- --reporter=default --reporter=json --outputFile.json=<result dir>/<sha>.vitest.json` |
   | `site` | `npm run --silent site-check` |

   The cheap checks run first. Every check runs even when an earlier one fails, so the run ends
   naming every failure (FR-033).
5. **The full set really ran** (SC-010): the Vitest JSON report must list exactly the files
   `listFiles(root).testFiles` lists, with `success: true`. A report that ran fewer files, or
   none, fails the `test` check with the count it ran and the count expected.
6. **Still the same commit**: HEAD unchanged and `git status` still empty after the checks. A
   check that changed a tracked file, or left an untracked one, fails the run, naming the files,
   because the result would no longer describe the commit.
7. **The result** is written (R17) and a summary printed: each check `pass` or `fail` with its
   duration, then `PASS: local full run on <sha>: <n> tests in <f> files passed, site check
   passed. Sign off with: npm run signoff`, or `FAIL: <k> checks failed: <names>`. Exit 0 or 1.

`npm run verify` makes no network request of its own, and the checks it runs need none
(FR-027, spec Offline Behavior). It runs anywhere, cloud sessions included, because it records
nothing on the host. Only signing off does (R18).

**Alternatives considered**:

- *A shell script*: `git status`, the lockfile comparison and the Vitest report are easier to
  get right and to test in TypeScript, like the other tools, and a shell script would be the
  repository's only one.
- *`git stash` or a temporary worktree instead of refusing*: either would run something other
  than what the owner sees, and a worktree needs its own `node_modules`. FR-032 asks to refuse.
- *Stop at the first failing check*: FR-033 asks for every failure.
- *A self-hosted Actions runner on the owner's machine*: it would run the full set there, but its
  result is posted by CI, which FR-034 forbids, and it means installing and running a service.

## R17. Where the result is kept

**Decision**: under the clone's git directory, `$(git rev-parse --git-common-dir)/local-verify/`:

- `<sha>.json`: the result (data-model.md, LocalRunResult), written once the run ends, pass or
  fail. A new run on the same commit replaces it, so it is always the last run's.
- `<sha>.log`: the run's whole output, for reading back a failure.
- `<sha>.vitest.json`: Vitest's JSON report, from which the test counts come.

**Rationale**:

- The git directory is outside the work tree, so nothing there is tracked, shown by
  `git status` or committable (FR-037).
- It belongs to the clone. The common directory, rather than `--git-path`, is shared by all
  worktrees of one clone. A result is keyed by commit, so it holds in any of them.
- Keyed by the full SHA, so a result can only ever describe one commit (FR-034).
- The files are a few kilobytes. Nothing prunes them: deleting the folder is always safe.

**Alternatives considered**: a git note on the commit (`git notes`) is a git object under
`refs/notes/`, one `git push origin 'refs/notes/*'` away from the host, and FR-037 keeps the
result off it. A file in the work tree with a `.gitignore` entry can still be force-added, and
shows in editors. A folder in the user's home directory needs a per-repository key and outlives
the clone.

## R18. Signing off: a commit status posted with `gh`

**Decision**: `npm run signoff` (`node tools/local-verify/src/main.js signoff`) records the
sign-off as a **commit status** on the head commit, with GitHub's own CLI:

```sh
gh api --method POST repos/<owner>/<repo>/statuses/<sha> \
  -f state=success -f context=local-verify -f description='<description>'
```

**Steps, in order**, each refusal saying why and recording nothing (exit 1):

1. `CI` or `GITHUB_ACTIONS` is set: refused. Signing off is the owner's act on their machine
   (FR-034).
2. The commit is `git rev-parse HEAD`, on a branch (`git symbolic-ref --short HEAD`). A detached
   HEAD is refused: there's no branch to push.
3. The result `<sha>.json` must exist and read `pass` with a clean tree. None: "no local full run
   on <sha>: run npm run verify". Failed: "the last local full run on <sha> failed: <checks>".
   No test runs again (FR-036).
4. `gh` must be installed (`gh --version`): otherwise "signing off needs the GitHub CLI: install
   it from https://cli.github.com and run gh auth login".
5. Owner and repository come from the `origin` remote's URL
   (`git remote get-url origin`), in its `https://github.com/<owner>/<repo>(.git)` or
   `git@github.com:<owner>/<repo>(.git)` form. Any other host is refused.
6. **On the host?** `git ls-remote origin refs/heads/<branch>`. When it fails, the host can't be
   reached: "can't reach origin: <git's message>", nothing recorded (FR-036). When the remote
   branch's head isn't `<sha>`, the branch is pushed: `git push origin HEAD:refs/heads/<branch>`
   (never forced). A rejected push (the remote has commits this one lacks) or a failed one is
   reported with git's message, and nothing is recorded.
7. The status is posted. A failure from `gh` (not signed in, no access, no network) is reported
   with its message and exit 1. On success it prints
   `signed off <sha> on <owner>/<repo>: local-verify success: <description>`.

**The description** names what ran (FR-033): `<n> tests in <f> files passed; site check passed;
Node <version>; <os>`, where `<os>` is `os.type() os.release() process.arch`, for example
`3124 tests in 152 files passed; site check passed; Node 26.1.0; Darwin 25.1.0 arm64`. GitHub
limits a status description to 140 characters. The fixed parts take about 70, and the OS part is
shortened to fit when needed. No `target_url`: the run's log stays on the owner's machine.

**Why a commit status**:

- Commit statuses are the API made for an external system reporting on a commit. Required
  status checks in a ruleset match them by context (`local-verify`), they show among the pull
  request's checks, and they belong to exactly one SHA, so a new, amended, rebased or merge
  commit has none (FR-034, FR-035). Users with push access can create them.
- Check runs, the other kind, can only be created by a GitHub App, not by the owner's login.
- `gh` is GitHub's own CLI (Constitution X, vendor-maintained), is already on the owner's
  machine and signed in with the owner's credentials (spec Assumptions), and adds no package to
  the repository. Its `api` command handles authentication and the host.

**Only the owner, never CI** (FR-034): the workflow's token is read-only (R15), no workflow
step runs `signoff` or `gh`, and `signoff` refuses under `CI`. Cloud sessions have no `gh`, so
they can run `verify` but not sign off. Like R12's known limit, a pull request could edit the
workflow to grant `statuses: write` and post a `local-verify` status itself. That shows in its
diff, and review catches it.

**Alternatives considered**:

- *Owner and repository from `gh repo view` or `gh api repos/{owner}/{repo}/…` placeholders*: they
  resolve through gh's own remote selection, which can pick a fork's remote, and make tests
  depend on gh's resolution. The `origin` URL is the remote the branch is pushed to.
- *Re-running the checks inside `signoff`*: FR-036 forbids it, and it would double the wait.
- *Posting `failure` after a failed run*: not required. A missing status already blocks the
  merge, and a failure posted from a dirty state would be noise.
- *A `pre-push` git hook that runs the full set*: a hook can't record anything on the host, a
  push can't wait 20 minutes, and hooks are easy to skip.

## R19. The ruleset change and the rollout

**Decision**: `.github/rulesets/main.json` adds one entry, last, to `required_status_checks`:

```json
{ "context": "local-verify" }
```

- No `integration_id`. GitHub's ruleset API makes it optional ("the optional integration ID
  that this status check must originate from"), and a status posted with the owner's `gh` login
  comes from no GitHub App, so there is no id to give. Any source with write access can satisfy
  it, which is why R15 keeps the workflow's token read-only.
- `strict_required_status_checks_policy: true` stays, so a branch must be up to date with
  `main`. Updating it is a merge commit, which needs a new run and sign-off (FR-034).
- Everything else stays: no bypass, squash only, `main` pull-request-only (FR-025, FR-035).
- The other required checks keep `integration_id: 15368` (GitHub Actions).

**Applying it**: by hand, with `gh api --method PUT /repos/alex-profir/CV/rulesets/<id> --input
.github/rulesets/main.json`, then reading it back to check for drift (quickstart.md, scenario
7). When reading it back, GitHub may write the missing `integration_id` as absent or as `null`.
If it is `null`, the drift check deletes that key before comparing (an open point the first
application settles).

**Rollout**:

1. The amendment's pull request, from `001-local-verify`, runs the new workflow (R15). Its five
   checks pass, each within 6 minutes.
2. The owner checks out its head commit clean, runs `npm ci`, `npx playwright install chromium`
   and `npm run verify`.
3. The owner applies the new ruleset. The pull request now shows `local-verify` as expected and
   can't merge (SC-009, seen live).
4. `npm run signoff`. The pull request shows the passing `local-verify` check and can merge. It is
   the first pull request merged under the sign-off.
5. After the merge, the drift check against `main`'s file passes.

Applying the ruleset before the merge blocks every other open pull request until it's signed off
too, which is the intent. Applying it after the merge would let this pull request merge without
the sign-off it introduces.

## R20. Testing the amendment without a network

**Decision**: every new test is in the fast set, makes no network request and posts no status.

- **Real git, local remotes.** Tests build a temporary repository with `makeProject` and
  `git init`, commit with a fixed author (`-c user.name=… -c user.email=…`), and give it an
  `origin` of `https://github.com/alex-profir/CV` that git rewrites to a local bare repository
  with `url.<file path>.insteadOf`. The URL parses like the real one, and pushes and
  `ls-remote` go to the bare repository. `GIT_ALLOW_PROTOCOL=file` is set for every git the
  tests start, so any other transport is refused rather than tried. An unreachable host is an
  `insteadOf` pointing at a missing path.
- **A fake `gh` and `npm` on `PATH`.** A temporary `bin/` comes first on `PATH`, with small
  executable scripts named `gh` and `npm` that append their arguments, and for `gh` the bare
  repository's head at that moment, to a log file, and exit with a code the test chooses. A test
  reads the log to see what was posted, and that nothing else ran.
- **The checks are faked too.** In the `verify` tests, the fake `npm` answers each script with
  the exit code the test chooses, and for `npm test` writes a Vitest-shaped JSON report to the
  `--outputFile.json` path it's given, listing the sample repository's test files (or fewer, to
  test SC-010's guard). No real check, test or build runs inside these tests.
- **Function seams.** `verify` and `signoff` are functions taking `{ root, env, exec,
  prerequisites }`, where `exec` defaults to `spawnSync` and `prerequisites` to the real probes.
  Tests pass a prerequisites probe that reports Chromium present (or missing), so they run the
  same way on a runner with no browser.
  - **As built (2026-10-29)**: `spawnSync` can't stream a check's output while it runs, so
    `verify` runs the checks through a third seam, `runCommand`, whose default is an async
    `spawn` that writes each chunk to the terminal and to `<sha>.log`. `exec` (`spawnSync`)
    stays for git and the probes. `verify` and `signoff` also take `stdout` and `stderr`
    writers, so tests read the output without a subprocess.
  - The Chromium probe has no default in `verify.ts`: `browser.ts` imports `playwright`, which
    no fast test may reach (R14, rule 3). `main.js` passes a probe that imports `browser.ts`
    only when it runs, after the clean-tree check, so a refused run never loads Playwright.
    `main.js` has its own Node-version message, as the site check does: 001's
    `nodeVersionProblem` names blocking network access, which isn't this tool's reason.
  - `origin`'s URL is read with `git config --get remote.origin.url`, not
    `git remote get-url origin`: `get-url` expands `url.<base>.insteadOf` rewrites, which would
    hide the github.com URL from the parser (in the tests, and for an owner who rewrites
    GitHub URLs to SSH).
  - The installed-dependencies probe skips lockfile entries marked `optional` that aren't in
    `node_modules/.package-lock.json`: npm leaves out optional packages built for other
    platforms (71 on the owner's Mac), so a strict comparison would always refuse.
  - Messages the contract doesn't list: a check that leaves the working copy changed prints
    `local full run: the checks left the working copy different from commit <sha>:` with the
    paths, and the run ends `FAIL: the working copy changed during the run on <sha>. Nothing
    can be signed off for this commit.`; `signoff` outside a work tree prints
    `sign-off refused: not a git work tree`.
- A few tests run `main.js` itself as a subprocess, for the exit codes and the refusal messages.

FR-027 is unaffected: the traceability check's own permission flags and its positive control
stay as they are, and `verify` runs it through the same script.

**Existing tests that read the workflow, the scripts or the ruleset**, and how each stays true:

| Test | Reads | Change |
|------|-------|--------|
| `tools/traceability/test/repo-settings.test.ts` (001 FR-025, FR-026) | `ci.yml`, ruleset, `package.json` | The `test` job's steps become checkout, setup-node, `npm ci`, `npm run typecheck`, `npm run test:fast`. The ruleset's expected list gains `{ context: 'local-verify' }`. "Every required check is a workflow job" becomes "every required check bound to GitHub Actions (15368) is a workflow job, and `local-verify` is none". New describes for FR-031, FR-034, FR-035 and SC-008 |
| `tools/traceability/test/files.test.ts` (001 FR-014) | `vitest.config.ts` | The root's `include`/`exclude` move into the projects: each project's must be built from the constants |
| `tools/content-check/test/repo-settings.test.ts` (002 FR-033) | `ci.yml`, ruleset, `package.json` | The expected required list gains `local-verify`; "every required check is a workflow job" is limited to Actions-bound checks |
| `tools/token-check/test/repo-settings.test.ts` (003 FR-039) | same | Same change as 002's |
| `tools/site-check/test/repo-settings.test.ts` (004 FR-048) | `ci.yml`, ruleset, `package-lock.json` | The required list gains `local-verify`. The browser-cache key is checked for `site` only. "The test job caches and installs the browser" becomes "the test job installs no browser and runs the typecheck and the fast set". The `site` job's assertions don't change |
| `tools/site-check/test/cli.test.ts` (004 FR-049, 005 FR-060, 006 FR-042) | `package.json` `site-check`, `ci.yml` | No change: the script and the `npm run --silent site-check` CI step stay. The local full run runs the same command, which 001's new test asserts |
| `tools/traceability/test/cli.test.ts`, `tools/content-check/test/cli.test.ts`, `tools/token-check/test/cli.test.ts` | `package.json` scripts of their checks | No change |

The edits to 002's, 003's and 004's tests keep their requirement IDs and their meaning: each
still proves its check runs on every pull request and is required. Only the lists they compare
grow, as they did when each later feature added its job.

## R21. The slow site-check self-tests

**Decision**: they stay as they are, in the full set, and run in the local full run.
`tools/site-check/test/cli.test.ts` keeps its two full-check runs and its 300 s budgets. On the
owner's machine they no longer hold up a pull request's checks.

Making them cheaper (for example, sharing one run of the full check between the two tests that
each run it twice) would shorten the local full run. It changes 004's to 006's tests and is
unrelated to this amendment, so it is left for a separate change with its own pull request
(Constitution XI, unrelated changes go in their own PR).

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
