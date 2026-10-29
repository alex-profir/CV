# Contract: The Local Full Run and the Sign-Off

**Feature**: [spec.md](../spec.md) (FR-030 to FR-037, added 2026-10-29) | **Research**:
[research.md](../research.md) (R14 to R18) | **Data model**:
[data-model.md](../data-model.md#the-local-full-run-and-the-sign-off-added-2026-10-29)

Four npm scripts make up the interface: the two test sets and the two commands the owner runs
before merge. The pull-request side is in [ci.md](./ci.md).

## Scripts (`package.json`)

| Script | Command | What it runs |
|--------|---------|--------------|
| `test` | `vitest run` | The full set: every test file, both Vitest projects. Unchanged |
| `test:fast` | `vitest run --project fast` | The fast set (FR-030). What the `test` job runs on a pull request |
| `verify` | `node tools/local-verify/src/main.js verify` | The local full run (FR-032, FR-033) |
| `signoff` | `node tools/local-verify/src/main.js signoff` | Signing off the head commit (FR-033 to FR-036) |

`main.js` is plain JavaScript and checks the Node version first, like the other tools'
entry points: below Node 26 it prints `npm run <verify|signoff> needs Node 26 or later (see
.nvmrc), but this is Node <version>: run nvm use` (`local full run` for any other subcommand)
and exits 2. Any argument after the subcommand is a usage error (exit 2).

## `npm run verify`

Runs every check of a pull request, with the full set instead of the fast set, on the commit
checked out, on the owner's machine. It needs no network.

### Before anything runs

| Situation | Output (stderr) | Exit |
|-----------|-----------------|------|
| Not inside a git work tree | `local full run: not a git work tree` | 2 |
| The working copy has changes or untracked files | `local full run refused: the working copy differs from commit <sha>:` then one line per path, `  <XY> <path>` as `git status --porcelain` gives it, then `Commit or remove these, then run it again.` | 2 |
| Node's major version isn't `.nvmrc`'s | `local full run needs Node <nvmrc> (see .nvmrc), but this is Node <version>: run nvm use` | 2 |
| `node_modules/` missing or not matching `package-lock.json` | `local full run needs the locked dependencies installed: run npm ci` | 2 |
| Playwright's Chromium missing | `site check needs Chromium: run npx playwright install chromium` (the site check's own message) | 2 |

The working-copy check comes first, and a refusal there stops the run. Otherwise every missing
prerequisite is listed together. Either way, no check runs.

### Checks

Run in this order. Every check runs, whatever the ones before it returned (FR-033).

| Name | Command | Same as the pull request's job |
|------|---------|--------------------------------|
| `typecheck` | `npm run typecheck` | `test` |
| `traceability` | `npm run traceability` | `traceability` |
| `content` | `npm run content-check` | `content` |
| `tokens` | `npm run token-check` | `tokens` |
| `test` | `npm test -- --reporter=default --reporter=json --outputFile.json=<result dir>/<sha>.vitest.json` | `test`, which runs `npm run test:fast` |
| `site` | `npm run --silent site-check` | `site` |

- Each check's own output goes to the terminal as it runs, after a header line
  `== <name>: <command>`, and to `<sha>.log`.
- `test` also fails, with the detail `ran <n> of <m> test files`, when Vitest's report doesn't
  list exactly the test files the traceability check lists (SC-010).
- After the last check, the run fails when HEAD moved or the working copy is no longer clean,
  naming the paths.

### Summary and exit codes

The summary goes to stdout after the checks:

```text
Local full run on 3f2a…c9e1 (001-local-verify)
  typecheck     pass    14 s
  traceability  pass     2 s
  content       pass     1 s
  tokens        pass     2 s
  test          pass   612 s   3124 tests in 152 files passed
  site          pass   201 s

PASS: every check passed on 3f2a…c9e1. Sign off with: npm run signoff
```

The summary prints the full SHA. On failure, every failing check is listed:

```text
FAIL: 2 checks failed on 3f2a…c9e1: test, site. Nothing can be signed off for this commit.
```

| Exit | Meaning |
|------|---------|
| `0` | Every check passed. The result is `pass` |
| `1` | At least one check failed. The result is `fail` |
| `2` | The run didn't start (table above), or an internal error. No result is written |

### The result (FR-037)

Written to `$(git rev-parse --git-common-dir)/local-verify/<sha>.json`, with `<sha>.log` and
`<sha>.vitest.json` beside it, whenever the checks ran (exit 0 or 1). Its fields are in
data-model.md (LocalRunResult). Nothing is written in the working copy, and a new run on the
same commit replaces all three files.

## `npm run signoff`

Records the passing `local-verify` status on the head commit. Runs no test (FR-036).

| Situation | Output (stderr unless noted) | Exit | Recorded |
|-----------|------------------------------|------|----------|
| `CI` or `GITHUB_ACTIONS` is set | `sign-off refused: it runs only on the owner's machine, never in CI` | 1 | nothing |
| HEAD is detached | `sign-off refused: check out the pull request's branch first` | 1 | nothing |
| No result for HEAD | `sign-off refused: no local full run on <sha>: run npm run verify` | 1 | nothing |
| The last result for HEAD failed | `sign-off refused: the last local full run on <sha> failed (<checks>)` | 1 | nothing |
| `gh` isn't installed | `signing off needs the GitHub CLI: install it from https://cli.github.com and run gh auth login` | 1 | nothing |
| `origin` isn't a GitHub repository URL | `sign-off refused: origin is not a github.com repository: <url>` | 1 | nothing |
| `origin` can't be reached | `can't reach origin, nothing was recorded: <git's message>` | 1 | nothing |
| The commit isn't on `origin` yet | `pushing <branch> to origin first` (stdout), then the push | | |
| The push fails or is rejected | `could not push <branch>, nothing was recorded: <git's message>` | 1 | nothing |
| `gh` fails (not signed in, no access, no network) | `could not record the sign-off: <gh's message>` | 1 | nothing |
| Recorded | `signed off <sha> on <owner>/<repo>: local-verify success: <description>` (stdout) | 0 | the status |

Any argument is a usage error (exit 2).

### The status it records

```sh
gh api --method POST repos/<owner>/<repo>/statuses/<sha> \
  -f state=success -f context=local-verify -f description='<description>'
```

- `<owner>/<repo>` from `git remote get-url origin`: `https://github.com/<owner>/<repo>(.git)` or
  `git@github.com:<owner>/<repo>(.git)`.
- `<description>`: `<passed> tests in <files> files passed; site check passed; Node <version>;
  <os>`, at most 140 characters. Example:
  `3124 tests in 152 files passed; site check passed; Node 26.1.0; Darwin 25.1.0 arm64`.
- No `target_url`.

## Guarantees

- `verify` makes no network request of its own, and `signoff` contacts only `origin` (with
  `git ls-remote` and possibly `git push`) and GitHub's API (through `gh`) (FR-027, spec Offline
  Behavior).
- Neither writes a file in the working copy, and `verify` refuses unless the working copy is
  exactly the commit (FR-032, FR-037).
- A sign-off is only ever recorded for the SHA of a passing result (FR-033, FR-034).
- The pull request's workflow runs neither command and can't create statuses ([ci.md](./ci.md)).
