# Quickstart: Validating the Requirement Traceability Check

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

These scenarios prove the feature works end to end. Output formats are defined in
[contracts/cli.md](./contracts/cli.md). The pull-request checks and merge rule are defined in
[contracts/ci.md](./contracts/ci.md), and the local full run and sign-off in
[contracts/local-verify.md](./contracts/local-verify.md). Scenarios 1 to 6 and 8 to 10 run
locally. Scenarios 7 and 11 to 13 need GitHub. Scenarios 8 to 13 were added with the amendment
of 2026-10-29.

## Prerequisites

- Node.js 26 (`nvm use` reads `.nvmrc`) and the npm bundled with it.
- For scenarios 9 to 13: Playwright's Chromium (`npx playwright install chromium`).
- For scenarios 7 and 11 to 13: the GitHub CLI (`gh`), signed in as the repository owner with
  admin rights.

```sh
npm ci
```

## 1. The repository passes its own check (US1, FR-028, SC-006)

```sh
npm run traceability; echo "exit $?"
```

**Expected**: no problem lines, then the summary. The last lines read, with today's counts:

```text
PASS: all <n> active requirements in <m> approved specs are covered.
exit 0
```

`<m>` includes `001-requirement-traceability`, whose 37 active requirements (FR-001 to FR-037)
are among the `<n>`.

The sample project under `tools/traceability/test/__fixtures__/` contains deliberately broken
IDs, and none of them appear (FR-014).

## 2. Every problem type is found, and nothing else (SC-001, US1 to US3)

The seeded sample project holds at least one case of every problem type and edge case in the
spec. `expected-report.txt` next to it is the exact report it must produce.

```sh
cd tools/traceability/test/__fixtures__/seeded
node --permission --allow-fs-read="$PWD/../../../../.." --allow-addons ../../../src/main.js > /tmp/seeded-report.txt
echo "exit $?"
diff /tmp/seeded-report.txt expected-report.txt && echo "report matches"
cd -
```

**Expected**: `exit 1` and `report matches`. The automated test runs the same comparison
(`npm test`).

## 3. Skipped tests don't count (US1 scenario 7, FR-012)

Temporarily skip every test for one requirement. Pick one that a single `describe` group covers,
such as `001-requirement-traceability-FR-009` in `references.test.ts`, and change that group's
`describe(` to `describe.skip(`. Then run:

```sh
npm run traceability; echo "exit $?"
```

**Expected**: `exit 1` and a line like:

```text
specs/001-requirement-traceability/spec.md:<line>:5 uncovered 001-requirement-traceability-FR-0xx: only skipped, disabled or placeholder tests reference this requirement
```

Undo the change with `git checkout -- <file>`.

## 4. Offline (US1 scenario 6, FR-027, SC-005)

Turn off the network (for example Wi-Fi off), then repeat scenario 1.

**Expected**: identical output and exit code. The automated test also runs the check under
Node's permission model with no network grant. It proves through a positive control that a
network call under those flags is refused.

## 5. Same report every run, on every machine (FR-024, FR-026, SC-002)

```sh
npm run traceability > /tmp/run1.txt; npm run traceability > /tmp/run2.txt
diff /tmp/run1.txt /tmp/run2.txt && echo "identical"
```

**Expected**: `identical`. On a pull request, the `traceability` job's log shows the same lines
as the local run on the same commit.

## 6. Speed (SC-004)

```sh
npx vitest run --project fast tools/traceability/test/performance.test.ts
```

**Expected**: passes. The test generates 50 specs and 2,000 tests and requires the check to
finish in under 10 seconds. It checks the time only off CI: SC-004 is about the owner's
machine.

## 7. Merging is blocked when the check fails (US2, FR-025, SC-003)

Run this once the feature's pull request is open and its workflow has run once.

**Apply the ruleset** (first time only; afterwards use `--method PUT` on
`/repos/alex-profir/CV/rulesets/<id>`, as scenario 13 does):

```sh
gh api --method POST /repos/alex-profir/CV/rulesets --input .github/rulesets/main.json
```

**Check it matches the committed file and nobody can bypass it:**

```sh
id=$(gh api /repos/alex-profir/CV/rulesets --jq '.[] | select(.name=="main") | .id')
gh api /repos/alex-profir/CV/rulesets/$id --jq .current_user_can_bypass
gh api /repos/alex-profir/CV/rulesets/$id \
  | jq -S 'del(.id, .node_id, .source, .source_type, ._links, .created_at, .updated_at, .current_user_can_bypass)
           | (.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[]) |= with_entries(select(.value != null))' \
  > /tmp/live-ruleset.json
diff /tmp/live-ruleset.json <(jq -S . .github/rulesets/main.json) && echo "no drift"
```

**Expected**: `never`, then `no drift`. The second filter drops an `integration_id` that GitHub
may read back as `null` for `local-verify`, which the committed file leaves out (research R19).

**Demonstrate the block:**

1. On a scratch branch, apply scenario 3's change, push, and open a pull request.
2. **Expected**: the `traceability` check fails. Its log names the uncovered requirement with
   the same line as scenario 3. GitHub shows the merge as blocked, with no option to bypass
   (US2 scenarios 1, 2 and 4).
3. Revert the change and push. **Expected**: every check passes. Once the head commit is also
   signed off (scenario 11), the pull request can be merged (US2 scenario 3). Close it without
   merging.

**Demonstrate that direct pushes are refused:**

```sh
git switch main && git pull
git commit --allow-empty -m "chore: direct push probe"
git push origin main            # Expected: rejected by the ruleset
git reset --hard origin/main    # drop the probe commit (it exists only locally)
```

## 8. The fast set and the full set (US4, FR-030, SC-010)

```sh
npx vitest list --filesOnly --json > /tmp/sets.json
jq -r '.[].projectName' /tmp/sets.json | sort | uniq -c
npm run test:fast
```

**Expected**: two counts, `fast` and `slow`, adding up to every test file: 152 before the
amendment, 155 with its three new ones (`fast` 67, `slow` 88, on 2026-10-29). `npm run test:fast` passes without Chromium installed and
without building the site: its log shows no `site build` and finishes in well under a minute.
The automated test `tools/traceability/test/test-sets.test.ts` checks the same partition against
the traceability check's own file list, and that no fast file needs a browser or the build.

**Amended 2026-10-31**: in scenarios 9 to 13 below, `npm run verify` means `npm run verify:feature`.
The run has five checks, stops at the first failure and no longer includes the site check. Merging
needs no sign-off and no up-to-date branch, so the merge-blocking steps in scenarios 11 and 13 no
longer apply (FR-035).

## 9. The local full run refuses what it can't prove (US4 scenario 2, FR-032)

```sh
echo probe > probe.txt
npm run verify; echo "exit $?"
rm probe.txt
```

**Expected**: before anything runs, `local full run refused: the working copy differs from commit
<sha>:`, a line `  ?? probe.txt` and `Commit or remove these, then run it again.`, then
`exit 2`. Repeat with a changed tracked file instead: it is named with ` M`.

Prerequisites: on a machine without Playwright's Chromium (or after
`npx playwright uninstall`), `npm run verify` prints
`site check needs Chromium: run npx playwright install chromium`, runs nothing and exits 2.
With `nvm use 24`, the entry point stops first:
`npm run verify needs Node 26 or later (see .nvmrc), but this is Node 24.<x>.<y>: run nvm use`,
exit 2 (`npm run signoff` names itself the same way). A newer
major than `.nvmrc`'s (say Node 27) gets
`local full run needs Node 26 (see .nvmrc), but this is Node 27.<x>.<y>: run nvm use`.

## 10. A passing run, and a failing one (US4 scenarios 1 and 3, FR-033, FR-037, SC-010)

On a clean checkout of a pushed commit:

```sh
npm run verify; echo "exit $?"
ls "$(git rev-parse --git-common-dir)/local-verify/"
git status --porcelain
```

**Expected**: every check's output, each after a `== <name>: <command>` line, then the summary:
`Local full run on <sha> (<branch>)`, six `pass` lines (the `test` line ends
`<n> tests in <f> files passed`) and
`PASS: every check passed on <sha>. Sign off with: npm run signoff`, then `exit 0`. The result directory holds `<sha>.json`,
`<sha>.log` and `<sha>.vitest.json`. `git status --porcelain` prints nothing (FR-037).

Then break one browser test on a scratch branch (for example, change an expected text in
`packages/web/test/terminal/output.test.ts`), commit, and run `npm run verify` again.
**Expected**: the `test` check fails and is named in
`FAIL: 1 check failed on <sha>: test. Nothing can be signed off for this commit.`, `exit 1`, and
`npm run signoff` then refuses with
`sign-off refused: the last local full run on <sha> failed (test)`, exit 1. Drop the scratch
commit.

## 11. Signing off (US4 scenarios 1, 4 and 6, FR-033 to FR-036, SC-009)

On a pull request's branch, after scenario 10's passing run, with one more local commit that
isn't pushed yet:

```sh
git commit --allow-empty -m "chore: sign-off probe"
npm run signoff; echo "exit $?"     # refused: no local full run on the new commit
npm run verify && npm run signoff; echo "exit $?"
gh api repos/alex-profir/CV/commits/$(git rev-parse HEAD)/statuses \
  --jq '.[] | select(.context=="local-verify") | "\(.state) \(.description)"'
```

**Expected**:

- The first `signoff` refuses with
  `sign-off refused: no local full run on <sha>: run npm run verify`, naming the new commit
  (FR-034).
- The second prints `pushing <branch> to origin first`, then
  `signed off <sha> on alex-profir/CV: local-verify success: <n> tests in <f> files passed; site
  check passed; Node 26.<x>.<y>; <os>`, `exit 0`, and runs no test after `verify` ended (FR-036).
- The query prints `success` and the same description, at most 140 characters.
- On the pull request, `local-verify` shows as a passing check and the merge is allowed. Push one
  more commit, or merge `main` into the branch: `local-verify` shows as expected again and the
  merge is blocked until that commit is signed off (SC-009). The owner has no bypass option.

## 12. Signing off offline, or from CI (US4, FR-034, FR-036)

Turn the network off and run `npm run signoff` on a commit with a passing run.
**Expected**: `can't reach origin, nothing was recorded: …`, `exit 1`, and no status appears on
the commit once the network is back. `CI=true npm run signoff` refuses with
`sign-off refused: it runs only on the owner's machine, never in CI`, exit 1, and records
nothing.

The pull request's own checks never record a sign-off: in any pull request's checks list,
`local-verify` is created by the owner's account, never by `github-actions`.

## 13. Rolling out the amendment (research R19, SC-008)

On the amendment's own pull request, from `001-local-verify`:

1. **Expected**: its five checks, run by the new workflow, pass, and each job takes under 6
   minutes:

   ```sh
   gh run view <run-id> --json jobs --jq '.jobs[] | "\(.name) \(.startedAt) \(.completedAt)"'
   ```

2. Check out its head commit clean and run `npm ci`, `npx playwright install chromium` and
   `npm run verify`. **Expected**: six `pass` lines and
   `PASS: every check passed on <sha>. Sign off with: npm run signoff`.
3. Apply the new ruleset:

   ```sh
   id=$(gh api /repos/alex-profir/CV/rulesets --jq '.[] | select(.name=="main") | .id')
   gh api --method PUT /repos/alex-profir/CV/rulesets/$id --input .github/rulesets/main.json
   ```

   **Expected**: the pull request now lists `local-verify` as expected, and merging is blocked.
4. `npm run signoff`. **Expected**:
   `signed off <sha> on alex-profir/CV: local-verify success: <description>`, then `local-verify` passes and the pull request can merge. Merge it
   (squash). It is the first pull request merged with a sign-off.
5. On `main`, run scenario 7's drift check. **Expected**: `never`, then `no drift`.
