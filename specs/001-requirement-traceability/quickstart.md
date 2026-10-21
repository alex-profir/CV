# Quickstart: Validating the Requirement Traceability Check

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

These scenarios prove the feature works end to end. Output formats are defined in
[contracts/cli.md](./contracts/cli.md). The pull-request check and merge rule are defined in
[contracts/ci.md](./contracts/ci.md). Scenarios 1 to 6 run locally. Scenario 7 needs GitHub.

## Prerequisites

- Node.js 26 (`nvm use` reads `.nvmrc`) and the npm bundled with it.
- For scenario 7 only: the GitHub CLI (`gh`), signed in as the repository owner with admin
  rights.

```sh
npm ci
```

## 1. The repository passes its own check (US1, FR-028, SC-006)

```sh
npm run traceability; echo "exit $?"
```

**Expected**: no problem lines, then the summary. The last lines read:

```text
PASS: all 29 active requirements in 1 approved spec are covered.
exit 0
```

The sample project under `tools/traceability/test/__fixtures__/` contains deliberately broken
IDs, and none of them appear (FR-014).

## 2. Every problem type is found, and nothing else (SC-001, US1 to US3)

The seeded sample project holds at least one case of every problem type and edge case in the
spec. `expected-report.txt` next to it is the exact report it must produce.

```sh
cd tools/traceability/test/__fixtures__/seeded
node --permission --allow-fs-read="$PWD/../../../../.." --allow-addons ../../../src/cli.ts > /tmp/seeded-report.txt
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
npx vitest run tools/traceability/test/performance.test.ts
```

**Expected**: passes. The test generates 50 specs and 2,000 tests and requires the check to
finish in under 10 seconds.

## 7. Merging is blocked when the check fails (US2, FR-025, SC-003)

Run this once the feature's pull request is open and its workflow has run once.

**Apply the ruleset** (first time only; afterwards use `--method PUT` on
`/repos/alex-profir/CV/rulesets/<id>`):

```sh
gh api --method POST /repos/alex-profir/CV/rulesets --input .github/rulesets/main.json
```

**Check it matches the committed file and nobody can bypass it:**

```sh
id=$(gh api /repos/alex-profir/CV/rulesets --jq '.[] | select(.name=="main") | .id')
gh api /repos/alex-profir/CV/rulesets/$id --jq .current_user_can_bypass
gh api /repos/alex-profir/CV/rulesets/$id \
  | jq -S 'del(.id, .node_id, .source, .source_type, ._links, .created_at, .updated_at, .current_user_can_bypass)' \
  > /tmp/live-ruleset.json
diff /tmp/live-ruleset.json <(jq -S . .github/rulesets/main.json) && echo "no drift"
```

**Expected**: `never`, then `no drift`.

**Demonstrate the block:**

1. On a scratch branch, apply scenario 3's change, push, and open a pull request.
2. **Expected**: the `traceability` check fails. Its log names the uncovered requirement with
   the same line as scenario 3. GitHub shows the merge as blocked, with no option to bypass
   (US2 scenarios 1, 2 and 4).
3. Revert the change and push. **Expected**: both checks pass and the pull request can be merged
   (US2 scenario 3). Close it without merging.

**Demonstrate that direct pushes are refused:**

```sh
git switch main && git pull
git commit --allow-empty -m "chore: direct push probe"
git push origin main            # Expected: rejected by the ruleset
git reset --hard origin/main    # drop the probe commit (it exists only locally)
```
