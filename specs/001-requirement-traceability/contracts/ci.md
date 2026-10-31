# Contract: Pull-Request Checks and Merge Rule

**Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) (R11, R12, R15,
R19)

**Amended 2026-10-29**: the `test` job runs the typecheck and the fast set only, every job has a
6-minute limit, and the ruleset also requires the owner's `local-verify` sign-off (FR-030 to
FR-037). The jobs `content`, `tokens` and `site` were added by 002, 003 and 004 under their own
contracts, and are listed here because the amendment's "nothing else" rule covers the whole
workflow.

**Amended 2026-10-31**: green CI is what merges a pull request. The ruleset requires neither
`local-verify` nor an up-to-date branch, and `full.yml` runs every test daily on `main` (FR-035,
FR-041). Anything below that says otherwise is superseded.

This contract fixes what the repository promises to reviewers: which checks run on every pull
request, under which names, and what blocks a merge. The automated tests assert every point
marked **[tested]** against the committed files. The points marked **[verified live]** depend on
GitHub's state, and [quickstart.md](../quickstart.md) checks them. The local full run and the
sign-off are in [local-verify.md](./local-verify.md).

## Workflow: `.github/workflows/ci.yml`

| Property | Value |
|----------|-------|
| Trigger | `pull_request` targeting `main`, with no `paths`, `paths-ignore` or `branches-ignore` filters **[tested]** |
| Permissions | `contents: read`, and nothing else. In particular no `statuses: write`, so the workflow's token can't record a sign-off (FR-034) **[tested]** |
| Node version | Read from `.nvmrc` (`26`) |
| Actions | `actions/checkout`, `actions/setup-node` and `actions/cache`, each pinned to a full commit SHA, with the version in a trailing comment **[tested]** |
| Every job | `timeout-minutes: 6` (SC-008). No `if:`, `strategy`/`matrix` or `continue-on-error` **[tested]** |
| Never | A step that runs `npm test`, `vitest` directly, `npm run verify`, `npm run signoff` or `gh`, or names `local-verify` (FR-031, FR-034) **[tested]** |

### Job `traceability`

| Property | Value |
|----------|-------|
| Job id and `name` | `traceability`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → `npm run traceability` **[tested]** |
| Passes when | `npm run traceability` exits 0 ([cli.md](./cli.md#exit-codes)) |
| Output | The check's report, exactly as a local run prints it (FR-026) |

### Job `test` (amended 2026-10-29)

| Property | Value |
|----------|-------|
| Job id and `name` | `test`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → `npm run typecheck` → `npm run test:fast` **[tested]** |
| Installs no browser | No Playwright cache or install step. The fast set needs none (FR-030, research R14) **[tested]** |
| Passes when | The typecheck and every test of the fast set pass |

Before 2026-10-29 its steps were checkout → setup-node → `npm ci` → the Playwright cache →
`npx playwright install --with-deps chromium` → `npm run typecheck` → `npm test`.

### Jobs `content`, `tokens` and `site`

Defined by 002's, 003's and 004's contracts, unchanged by the amendment apart from the 6-minute
limit:

| Job | Steps |
|-----|-------|
| `content` | checkout → setup-node → `npm ci` → `npm run content-check` |
| `tokens` | checkout → setup-node → `npm ci` → `npm run token-check` |
| `site` | checkout → setup-node → `npm ci` → the Playwright cache → `npx playwright install --with-deps chromium` → `npm run --silent site-check`, piped to the job summary |

### Everything a pull request runs (FR-031) [tested]

Across all jobs, the `run:` commands are exactly these, and no other:

```text
npm ci
npm run traceability
npm run typecheck
npm run test:fast
npm run content-check
npm run token-check
npx playwright install --with-deps chromium
set -o pipefail; … npm run --silent site-check | tee -a "$GITHUB_STEP_SUMMARY" …
```

`package.json`'s `test:fast` script is `vitest run --project fast` **[tested]**.

## Ruleset: `.github/rulesets/main.json`

The committed file is the source of truth. It's applied with `gh api` (see quickstart.md) and
read back to detect drift.

| Field | Value |
|-------|-------|
| `name` | `main` |
| `target` | `branch` |
| `enforcement` | `active` **[tested]** |
| `conditions.ref_name.include` | `["refs/heads/main"]`, `exclude`: `[]` **[tested]** |
| `bypass_actors` | `[]`: nobody, including the owner, can bypass **[tested]** |

Rules, with every parameter written out **[tested]**:

| Rule | Parameters | Effect |
|------|------------|--------|
| `deletion` | none | `main` can't be deleted |
| `non_fast_forward` | none | No force pushes to `main` |
| `pull_request` | `required_approving_review_count: 0`, `dismiss_stale_reviews_on_push: false`, `require_code_owner_review: false`, `require_last_push_approval: false`, `require_extra_approval_for_unattributed_changes: false`, `required_review_thread_resolution: false`, `required_reviewers: []`, `allowed_merge_methods: ["squash"]` | Changes reach `main` only through pull requests, squash-merged. No approval is required: with one owner and no bypass, a required approval could never be given |
| `required_status_checks` | `strict_required_status_checks_policy: false`, `do_not_enforce_on_create: false`, `required_status_checks`: `traceability`, `test`, `content`, `tokens` and `site`, each with `"integration_id": 15368` | The five jobs must pass, and only GitHub Actions (app 15368) can satisfy them (FR-035) |

GitHub fills in `require_extra_approval_for_unattributed_changes` (as `true`) and
`required_reviewers` when a ruleset leaves them out, so both are written out here. The first
would require an approval for changes GitHub can't attribute to a user.

Consistency rules between the files **[tested]**:

- Every required check with `integration_id: 15368` is the `name` of a job in `ci.yml`.
- `local-verify` is not a required check, and it is not the name of any job.
- The `traceability` job runs the same script the owner runs locally, `npm run traceability`
  (FR-026).
- A local run's checks are the workflow's `run:` commands, without the site check and with
  `npm run test:fast` replaced by `npm test` on listed files ([local-verify.md](./local-verify.md#checks)).
- The `update` rule is absent. It would block pull-request merges as well.

## Live guarantees [verified live]

These hold once the ruleset is applied. The tests above can't see GitHub, so quickstart.md
checks them on the real repository.

1. Reading the ruleset back (`GET /repos/alex-profir/CV/rulesets/{id}`) and removing
   server-added fields gives the committed file.
2. For the owner, the read-back reports `current_user_can_bypass: "never"`.
3. A pull request with a failing `traceability` check shows merging as blocked, and the owner
   has no "bypass rules" option (FR-025, SC-003).
4. `git push origin main` with a new commit is rejected (FR-025).
5. A pull request with every required job passing can merge, with no `local-verify` status and on
   a branch behind `main` (FR-035, SC-009).
6. Every job of a pull request's run finishes within 6 minutes (SC-008).

## Known limit

A pull request runs its own copy of `ci.yml` and of the check, so it can change what the
required checks run and still pass them, or grant its token `statuses: write` and post a
`local-verify` status. Nothing in a personal-account repository pins the workflow to `main`. Such
a change shows in the pull request's diff, and review catches it (research.md, R12, R18).
