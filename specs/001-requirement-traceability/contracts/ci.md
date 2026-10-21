# Contract: Pull-Request Check and Merge Rule

**Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) (R11, R12)

This contract fixes what the repository promises to reviewers: which checks run on every pull
request, under which names, and what blocks a merge. The automated test for FR-025 asserts
every point marked **[tested]** against the committed files. The points marked **[verified
live]** depend on GitHub's state, and [quickstart.md](../quickstart.md) checks them.

## Workflow: `.github/workflows/ci.yml`

| Property | Value |
|----------|-------|
| Trigger | `pull_request` targeting `main`, with no `paths`, `paths-ignore` or `branches-ignore` filters **[tested]** |
| Permissions | `contents: read` |
| Node version | Read from `.nvmrc` (`26`) |
| Actions | `actions/checkout` and `actions/setup-node`, each pinned to a full commit SHA, with the version in a trailing comment **[tested]** |

### Job `traceability`

| Property | Value |
|----------|-------|
| Job id and `name` | `traceability`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → `npm run traceability` **[tested]** |
| Forbidden | `if:`, `strategy`/`matrix`, `continue-on-error` **[tested]** |
| Passes when | `npm run traceability` exits 0 ([cli.md](./cli.md#exit-codes)) |
| Output | The check's report, exactly as a local run prints it (FR-026) |

### Job `test`

| Property | Value |
|----------|-------|
| Job id and `name` | `test`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → `npm run typecheck` → `npm test` **[tested]** |
| Forbidden | `if:`, `strategy`/`matrix`, `continue-on-error` **[tested]** |
| Passes when | The typecheck and every test pass |

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
| `pull_request` | `required_approving_review_count: 0`, `dismiss_stale_reviews_on_push: false`, `require_code_owner_review: false`, `require_last_push_approval: false`, `required_review_thread_resolution: false`, `allowed_merge_methods: ["squash"]` | Changes reach `main` only through pull requests, squash-merged |
| `required_status_checks` | `strict_required_status_checks_policy: true`, `do_not_enforce_on_create: false`, `required_status_checks: [{ "context": "traceability", "integration_id": 15368 }, { "context": "test", "integration_id": 15368 }]` | Both jobs must pass on a branch that's up to date with `main`. Only GitHub Actions (app 15368) can satisfy them |

Consistency rules between the two files **[tested]**:

- Every `context` in the ruleset is the `name` of a job in `ci.yml`.
- The `traceability` job runs the same script the owner runs locally, `npm run traceability`
  (FR-026).
- The `update` rule is absent. It would block pull-request merges as well.

## Live guarantees [verified live]

These hold once the ruleset is applied. The test above can't see GitHub, so quickstart.md
checks them on the real repository.

1. Reading the ruleset back (`GET /repos/alex-profir/CV/rulesets/{id}`) and removing
   server-added fields gives the committed file.
2. For the owner, the read-back reports `current_user_can_bypass: "never"`.
3. A pull request with a failing `traceability` check shows merging as blocked, and the owner
   has no "bypass rules" option (FR-025, SC-003).
4. `git push origin main` with a new commit is rejected (FR-025).
