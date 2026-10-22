# Contract: Pull-Request Check for Tokens

**Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) (R19)

This feature extends 001's [ci.md](../../001-requirement-traceability/contracts/ci.md) and 002's
[ci.md](../../002-cv-content/contracts/ci.md). Everything there still holds. This contract lists
only what changes. Points marked **[tested]** are asserted against the committed files by the
FR-039 test. Points marked **[verified live]** are checked by [quickstart.md](../quickstart.md),
scenario 12.

## Workflow: `.github/workflows/ci.yml`

A fourth job. The trigger, permissions, Node version and pinned actions are 001's.

### Job `tokens`

| Property | Value |
|----------|-------|
| Job id and `name` | `tokens`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → `npm run token-check` **[tested]** |
| Forbidden | `if:`, `strategy`/`matrix`, `continue-on-error` **[tested]** |
| Passes when | `npm run token-check` exits 0 ([cli.md](./cli.md#exit-codes)) |
| Output | The report, exactly as a local run prints it (FR-040) |

The `test` job is unchanged. Its `npm run typecheck` step now also covers
`packages/tokens/src/`, which is where a misspelled token name in TypeScript fails (FR-026). Its
`npm test` step runs the code fixture's `tsc` test.

## Ruleset: `.github/rulesets/main.json`

`required_status_checks` gains one entry, so it reads **[tested]**:

```json
"required_status_checks": [
  { "context": "traceability", "integration_id": 15368 },
  { "context": "test", "integration_id": 15368 },
  { "context": "content", "integration_id": 15368 },
  { "context": "tokens", "integration_id": 15368 }
]
```

Every other field is unchanged: no bypass actors, squash merges only, strict status checks.
001's consistency rule still holds, so every `context` names a job in `ci.yml` **[tested]**.

The exact-match assertions on the ruleset in 001's and 002's `repo-settings.test.ts` are updated
in the same change to include `tokens`.

## Live guarantees [verified live]

1. After the updated ruleset is applied with `gh api`, reading it back gives the committed file,
   apart from server-added fields.
2. A pull request whose `tokens` check fails shows merging as blocked, with no bypass option
   (FR-039).
