# Quickstart: Validating the Design Tokens Source

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

These scenarios prove the feature works end to end. The following documents hold the details:

- [contracts/cli.md](./contracts/cli.md): the report format;
- [contracts/token-sources.md](./contracts/token-sources.md): the two sources;
- [contracts/token-output.md](./contracts/token-output.md): the package;
- [contracts/literal-values.md](./contracts/literal-values.md): the literal-value rules;
- [contracts/ci.md](./contracts/ci.md): the pull-request check.

Scenarios 1 to 10 run locally. Scenario 11 needs Penpot, and scenario 12 needs GitHub.

Scenarios that edit files say so. Undo each edit with `git checkout -- <file>`, or delete the new
files, before the next scenario. Scratch site files go in `packages/web/`, which doesn't exist
yet. Any new folder under `packages/` is site source, so the check searches it.

## Prerequisites

- Node.js 26 (`nvm use` reads `.nvmrc`) and the npm bundled with it.
- For scenario 11: the site's Penpot file, open in Penpot 2.18 or later.
- For scenario 12: the GitHub CLI (`gh`), signed in as the repository owner with admin rights.

```sh
npm ci
```

## 1. The repository passes (US1 scenario 1, US5 scenario 1, SC-008)

```sh
npm run token-check; echo "exit $?"
npm run traceability && npm run content-check
npm run typecheck && npm test
```

**Expected**: the token check prints no problem lines, then the summary:

- `Token export: … (checked): 2 sets, 1 theme, 24 tokens`;
- `Motion token source: … (checked): 1 set, 1 theme, 4 tokens`;
- `Active themes: mode/light + motion/standard` and `Derived output: current`;
- it ends with `PASS: both token sources are valid and no literal design values were found.` and
  `exit 0`.

The traceability check counts `003-design-tokens` among the approved specs and passes. The other
checks and the tests pass.

## 2. Every problem type is found, and nothing else (SC-001)

```sh
for sample in seeded seeded-broken seeded-missing seeded-no-theme seeded-stale; do
  cd "tools/token-check/test/__fixtures__/$sample"
  node --permission --allow-fs-read="$PWD/../../../../.." --allow-addons ../../../src/main.js > "/tmp/tokens-$sample.txt"
  echo "$sample exit $?"
  diff "/tmp/tokens-$sample.txt" expected-report.txt && echo "$sample report matches"
  cd - > /dev/null
done
```

**Expected**: `exit 1` and `report matches` for all five. Across the five summaries, each of the
23 problem types has a non-zero count. `seeded-broken` and `seeded-missing` list
`Checks not run: export rules, motion rules, cross-source rules, derived output, token names in site files`,
and `seeded-broken` still reports its literal values (FR-034). `seeded-stale` lists
`Derived output: stale` and `Checks not run: none`. `npm test` runs the same comparisons.

## 3. Broken references, loops, sets and types (US1 scenarios 2 to 5)

Edit `packages/tokens/penpot/tokens.json` with a script, so the rest of the file keeps Penpot's
form:

```sh
node -e '
const fs = require("fs"); const f = "packages/tokens/penpot/tokens.json";
const t = JSON.parse(fs.readFileSync(f, "utf8"));
t.light.color.text.primary.$value = "{color.base.inc}";
t.base.space.a = { $value: "{space.b}", $type: "spacing", $description: "" };
t.base.space.b = { $value: "{space.a}", $type: "spacing", $description: "" };
t.$themes[0].selectedTokenSets["brand-dark"] = "enabled";
t.base.motion = { flash: { $value: "200ms", $type: "duration", $description: "" } };
fs.writeFileSync(f, JSON.stringify(t, null, 2));'
npm run --silent token-check | grep -E 'missing-reference|reference-loop|missing-set|unsupported-content'
git checkout -- packages/tokens/penpot/tokens.json
```

**Expected**: four lines, each with the file, line and column:

- `missing-reference color.text.primary: refers to "color.base.inc", which no enabled set defines in mode/light`;
- one `reference-loop space.a: references form a loop: space.a, space.b, space.a`;
- `missing-set theme "mode/light": enables set "brand-dark", …`;
- `unsupported-content motion.flash: Penpot doesn't support the type "duration"; durations and easing curves go in the motion token source`.

## 4. One export updates the tokens (US1 scenario 6, US2 scenarios 1 and 4, FR-002, SC-003)

In the site's Penpot file:

1. Change `color.base.ink` to another color.
2. Add `color.accent` in set `light`, as a reference to `{color.base.ink}`.
3. Export with the Single file tab.

Save the download over `packages/tokens/penpot/tokens.json`, then:

```sh
npm run --silent token-check | grep stale-output
npm run token-output
npm run token-check && npm run typecheck
git status --short
```

**Expected**:

- The first run reports `stale-output` for both generated files and names `npm run token-output`.
- After regenerating, the check and the typecheck pass.
- `git status` lists only the export and the two generated files: no hand edit anywhere else.
- `tokens.generated.css` holds the new color and `--token-color-accent`.
- `cssVar('color.accent')` now type-checks.

Restore the three files with `git checkout`, or keep the change if it was a real update.

## 5. A wrong token name fails before merge (US2 scenarios 2, 3, 7 and 8)

Create `packages/web/src/oops.css`:

```css
.card {
  color: var(--token-color-text-primary);
  background: var(--token-color-text-primray);
  --card-gap: var(--token-space-4);
  --token-card-pad: 4px;
  gap: var(--card-gap);
}
```

and `packages/web/src/oops.ts`:

```ts
import { cssVar } from '@cv/tokens';

export const ok = cssVar('color.text.primary');
export const typo = cssVar('color.text.primray');
export const raw = 'var(--token-motion-duration-fsat)';
```

```sh
npm run --silent token-check | grep -E 'unknown-token|local-in-token-namespace|literal-value'
npm run typecheck
```

**Expected**:

- the check reports `unknown-token --token-color-text-primray` at `oops.css:3`;
- `unknown-token --token-motion-duration-fsat` at `oops.ts:5`;
- `local-in-token-namespace --token-card-pad` at `oops.css:5`, and `literal-value length "4px"`
  on the same line;
- nothing for line 2 or the local `--card-gap`;
- the typecheck fails with one `TS2345` at `packages/web/src/oops.ts(4,…)`, naming
  `"color.text.primray"`.

Delete `packages/web/` afterwards.

## 6. Literal design values are caught where they matter (US3)

Create `packages/web/src/oops.css` and `packages/web/src/oops.tsx` with the values in
[literal-values.md, The spec's scenarios](./contracts/literal-values.md#the-specs-scenarios), one
per line, and a `packages/web/public/icon.svg` holding `fill="#1a1a1a"`. Put `#1a1a1a` in
`docs/oops.md` and `packages/web/src/oops.test.ts` as well.

```sh
npm run --silent token-check | grep literal-value
```

**Expected**: exactly the reports in that table's Result column, each at its file and line.
There is nothing from the comment, the `.svg` file, `docs/` or the test file, and nothing for the
line marked `token-check: ignore` except its `12px`. Delete the files afterwards.

## 7. A second theme changes no code (US4, SC-004)

```sh
cd tools/token-check/test/__fixtures__/two-themes
node --permission --allow-fs-read="$PWD/../../../../.." --allow-addons ../../../src/main.js | tail -1
cd - > /dev/null
npx vitest run tools/token-check/test/code.test.ts
```

**Expected**:

- `PASS: …` for the sample with `mode/light`, `mode/dark`, `shell/desktop` and `shell/mobile`;
- the code test compiles the same unchanged TSX files against the one-theme and two-theme
  outputs, and both pass.

`npm test` also runs the variants of this sample. One with `color.text.primary` missing from
`dark` gives
`theme-mismatch … missing in mode/dark + motion/standard + shell/desktop, mode/dark + motion/standard + shell/mobile`.
One with both `light` and `dark` active gives `invalid-active-themes group "mode"`.

## 8. Motion is tuned in the repository (US5)

Change `motion.duration.fast` to `"200ms"` in `packages/tokens/motion/tokens.json`, then:

```sh
npm run token-output && npm run token-check && grep motion-duration-fast packages/tokens/src/tokens.generated.css
```

**Expected**: the check passes, and the CSS holds `--token-motion-duration-fast: 200ms;`.

Then add `"flash": { "$value": "#ff0000", "$type": "color", "$description": "" }` under the
first `motion` group, and change the easing to `[1.5, 0, 0, 1]`:

```sh
npm run --silent token-check | grep -E 'wrong-source|invalid-value'
git checkout -- packages/tokens/motion/tokens.json packages/tokens/src
```

**Expected**: `wrong-source motion.flash: a color token belongs in Penpot; …` and
`invalid-value motion.easing.standard: [1.5,0,0,1] is not a cubic Bézier: …`.

## 9. Offline (US1 scenario 7, FR-041, SC-006)

Turn the network off, then:

```sh
time npm run --silent token-check > /tmp/tokens-offline.txt; echo "exit $?"
```

**Expected**: `exit 0` and a report identical to scenario 1's, in well under 10 seconds. With the
network back on, `npm test` includes the positive control proving `fetch` is refused under the
check's permission flags.

## 10. Same report every run, locally and on the pull request (FR-037, FR-040, SC-005)

```sh
npm run --silent token-check > /tmp/a.txt; npm run --silent token-check > /tmp/b.txt
cmp /tmp/a.txt /tmp/b.txt && echo identical
```

**Expected**: `identical`. On the pull request, the `tokens` job's log shows the same report
after npm's banner.

## 11. The export round-trips through Penpot (SC-002, FR-003)

Before merge, by hand:

1. In Penpot, create an empty file and import `packages/tokens/penpot/tokens.json` into its
   tokens.
2. Check that the active themes are `mode/light`, and that no set is switched on outside a theme
   (research R3).
3. Export again with the Single file tab, saving as `/tmp/roundtrip.json`.

```sh
node -e '
const fs = require("fs");
const norm = (v) => Array.isArray(v) ? v.map(norm) : v && typeof v === "object"
  ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, norm(v[k])])) : v;
const read = (f) => { const t = JSON.parse(fs.readFileSync(f, "utf8"));
  t.$metadata.activeThemes.sort(); t.$metadata.activeSets.sort(); return JSON.stringify(norm(t)); };
console.log(read("packages/tokens/penpot/tokens.json") === read("/tmp/roundtrip.json") ? "same" : "different");'
```

**Expected**: `same`. That means the same tokens, sets, themes, set order, active themes and
descriptions. Record the result and the Penpot version in the pull request.

## 12. Merging is blocked when the check fails (FR-039)

Apply the updated ruleset once, during the pull request:

```sh
ID=$(gh api repos/alex-profir/CV/rulesets --jq '.[] | select(.name=="main") | .id')
gh api -X PUT "repos/alex-profir/CV/rulesets/$ID" --input .github/rulesets/main.json
gh api "repos/alex-profir/CV/rulesets/$ID" --jq '.rules[] | select(.type=="required_status_checks") | .parameters.required_status_checks[].context'
```

**Expected**: the contexts `traceability`, `test`, `content` and `tokens`.

Then push a throwaway branch with scenario 5's CSS file and open a draft pull request.
**Expected**: the `tokens` check fails, and the merge button is blocked with no bypass option.
Close the pull request and delete the branch.
