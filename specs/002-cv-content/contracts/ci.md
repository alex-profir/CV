# Contract: Pull-Request Check for Content

**Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) (R13)

This feature extends 001's [ci.md](../../001-requirement-traceability/contracts/ci.md). Everything
there still holds. This contract lists only what changes. Points marked **[tested]** are
asserted against the committed files by the FR-033 test. Points marked **[verified live]** are
checked by [quickstart.md](../quickstart.md), scenario 10.

## Workflow: `.github/workflows/ci.yml`

A third job. The trigger, permissions, Node version and pinned actions are 001's.

### Job `content`

| Property | Value |
|----------|-------|
| Job id and `name` | `content`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → `npm run content-check` **[tested]** |
| Forbidden | `if:`, `strategy`/`matrix`, `continue-on-error` **[tested]** |
| Passes when | `npm run content-check` exits 0 ([cli.md](./cli.md#exit-codes)) |
| Output | The report, exactly as a local run prints it (FR-034) |

The `test` job is unchanged. Its `npm run typecheck` step now also covers `packages/`, which is
where FR-027 is enforced, and its `npm test` step runs the shape staleness test (FR-026).

## Ruleset: `.github/rulesets/main.json`

`required_status_checks` gains one entry, so it reads **[tested]**:

```json
"required_status_checks": [
  { "context": "traceability", "integration_id": 15368 },
  { "context": "test", "integration_id": 15368 },
  { "context": "content", "integration_id": 15368 }
]
```

Every other field is unchanged: no bypass actors, squash merges only, strict status checks.
001's consistency rule still holds, so every `context` names a job in `ci.yml` **[tested]**.

001's exact-match assertion on the ruleset's rules is updated in the same change to include
`content`.

## Live guarantees [verified live]

1. After the updated ruleset is applied with `gh api`, reading it back gives the committed file,
   apart from server-added fields.
2. A pull request whose `content` check fails shows merging as blocked, with no bypass option
   (FR-033).
