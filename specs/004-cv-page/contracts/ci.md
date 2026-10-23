# Contract: Pull-Request Check for the Built Site

**Feature**: [spec.md](../spec.md) | **Research**: [research.md](../research.md) (R20)

This feature extends 003's [ci.md](../../003-design-tokens/contracts/ci.md). Everything there still
holds. This contract lists only what changes. Points marked **[tested]** are asserted against the
committed files by the FR-048 test. Points marked **[verified live]** are checked by
[quickstart.md](../quickstart.md), scenario 12.

## Workflow: `.github/workflows/ci.yml`

### Job `site` (new)

| Property | Value |
|----------|-------|
| Job id and `name` | `site`. This is the required status check's name **[tested]** |
| Steps | checkout → setup-node → `npm ci` → cache Playwright browsers → `npx playwright install --with-deps chromium` → `npm run site-check` **[tested]** |
| Browser cache | `actions/cache`, pinned by commit like the other actions, path `~/.cache/ms-playwright`, key `playwright-<os>-<Playwright version from package-lock.json>` |
| Report | The check step runs with `set -o pipefail` and pipes stdout through `tee`, adding it to `$GITHUB_STEP_SUMMARY` inside a fenced code block |
| Forbidden | `if:` (on the job or the check step), `strategy`/`matrix`, `continue-on-error` **[tested]** |
| Passes when | `npm run site-check` exits 0 ([cli.md](./cli.md#exit-codes)) |
| Output | The report, exactly as a local run prints it (FR-049) |

### Job `test` (changed)

Gains the same cache and `npx playwright install --with-deps chromium` step before `npm test`,
because the page tests and the site check's tests open Chromium **[tested]**. Its
`npm run typecheck` step now covers `packages/web`, including the service worker's own
`tsconfig.json`.

## Ruleset: `.github/rulesets/main.json`

`required_status_checks` gains `site` **[tested]**:

```json
"required_status_checks": [
  { "context": "traceability", "integration_id": 15368 },
  { "context": "test", "integration_id": 15368 },
  { "context": "content", "integration_id": 15368 },
  { "context": "tokens", "integration_id": 15368 },
  { "context": "site", "integration_id": 15368 }
]
```

Every other field is unchanged. The exact-match ruleset assertions in 001's, 002's and 003's
`repo-settings.test.ts` are updated in the same change to include `site`.

## Network

`npm ci`, the browser install and the browser cache use the network, as setup. The check step
doesn't (FR-057): every browser it starts can reach only `127.0.0.1` (research R17).

## Live guarantees [verified live]

1. After the updated ruleset is applied with `gh api`, reading it back gives the committed file,
   apart from server-added fields.
2. A pull request whose `site` check fails shows merging as blocked, with no bypass option
   (FR-048).
3. The job summary of a pull request run shows the report, with every part and every Lighthouse
   score.
