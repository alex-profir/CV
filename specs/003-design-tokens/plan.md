# Implementation Plan: Design Tokens Source

**Branch**: `003-design-tokens` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-design-tokens/spec.md`

**Design**: No UI (spec.md, Design section)

## Summary

The site's design tokens are created in its Penpot file and committed as Penpot's Single file
export, byte for byte, at `packages/tokens/penpot/tokens.json`. Durations and easing curves,
which Penpot can't hold, live next to it in `packages/tokens/motion/tokens.json`, in the same
layout. Both become the `@cv/tokens` package, which every later feature reads tokens through.

`npm run token-output` generates the token output from the two sources:

- `tokens.generated.css`, holding the active theme's values as `--token-…` custom properties
  and breakpoints as `@custom-media`;
- `tokens.generated.ts`, holding every name, type and theme value.

Both files are committed.

A new check, `npm run token-check`, runs offline and reports every problem in one run, as
`file:line:column` with the token path or line, followed by a summary. It checks three things:

- **Both token sources**:
  - structure and types, against what Penpot writes;
  - references, loops and arithmetic, resolved per theme combination;
  - values, against what Penpot accepts;
  - names code can use;
  - sets, themes and active themes;
  - that every combination gives the same names and types.
- **The derived output**: that the committed files match the sources.
- **The site's styles and components**:
  - every `--token-…` name read is a real token;
  - no local variable is defined in the token namespace;
  - no literal color, length, font family, shadow, duration or easing curve is written out.

A new CI job, `tokens`, runs the same command on every pull request, and the ruleset makes it
required.

Technical approach (details in [research.md](./research.md)):

- **Penpot format**: Penpot 2.18.3's export, read from its source. Anything its writer never
  produces is reported, so the file can be imported back unchanged (R2, R3).
- **Motion source**: the same layout, with the DTCG types `duration` (`"150ms"`) and
  `cubicBezier` (`[x1, y1, x2, y2]`) (R4).
- **Resolution**: per combination of one theme from every group, with later sets winning, as in
  Penpot (R6). Arithmetic uses `expr-eval-fork`, the evaluator Penpot's resolver uses (R7).
- **Reading tokens from code**: TypeScript's `TokenName` union catches a wrong name in code,
  and the check catches one in CSS and in strings (R12).
- **Literal values**: PostCSS parses style sheets, CSSTree types each value, and `oxc-parser`
  (from 001) reads components. Rules are lexical, plus property grammar for bare keywords
  (R14 to R16).
- **No network**: Node's permission model, as in 001 and 002 (R18).

## Technical Context

**Language/Version**: TypeScript with erasable syntax only, run directly by Node.js 26, as set
by 001. JSON token files in UTF-8. Generated CSS.

**Primary Dependencies**:

- New, pinned exactly and loaded by the check: `postcss` 8.5.31, `css-tree` 3.2.1 with
  `@types/css-tree` 3.2.0, and `expr-eval-fork` 3.0.3.
- Reused: `oxc-parser` 0.155.0 (001) and `jsonc-parser` 3.3.1 (002).
- The `@cv/tokens` package has no dependencies.

**Storage**: files in the repository, under `packages/tokens/`:

- the two token sources;
- two generated files;
- the package's reading functions.

The check writes nothing. `npm run token-output` writes only the two generated files.

**Testing**:

- Vitest (`npm test`) and `tsc --noEmit` (`npm run typecheck`).
- A spawned `tsc` run on a fixture project, for the TypeScript side of FR-026, FR-024 and FR-049.
- One manual Penpot round trip for SC-002.

**Target Platform**: Node.js 26 on macOS (owner) and Linux (GitHub Actions `ubuntu-latest`).
Penpot 2.18 for making and exporting tokens.

**Project Type**: a token package (sources, generated output and reading functions), plus a
repository CLI check, one CI job and a ruleset change.

**Shells**: None. The spec's Shell Scope says neither shell is affected.

**Offline Approach**: both sources and the generated output are in the repository. The check
reads only local files under `node --permission`, with no network grant, so any network call
fails in the runtime (R18). It has no Penpot address and no Penpot client. Only `npm ci` and the
owner's export in Penpot use the network, and neither is part of the check.

**Performance Goals**: the whole repository in under 10 seconds on the owner's machine
(SC-006). Two small token files, a handful of combinations and a few site files, so Node
start-up and loading the parsers dominate.

**Constraints**:

- no network, no writes, and byte-identical reports across runs and machines (FR-037, FR-040,
  FR-041);
- the export stays exactly what Penpot wrote: no trailing newline, no reformatting (FR-001);
- no skip markers of any kind (FR-057);
- breakpoints use `@custom-media`, which browsers don't support yet. The web app's CSS build has
  to replace it (R11).

**Scale/Scope**: 24 starter tokens in 2 sets, 4 motion tokens, 2 theme groups, 1 combination,
58 requirements. The code test spawns `tsc` twice.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check passed before research, and the post-design re-check passed too. The table
shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. Constitution 1.1.0, which the spec depends on, is merged (`5a65e5f`). File paths, packages, the CSS name scheme and CI choices appear only in this plan, research.md and the contracts |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or spec says "No UI" | N/A | spec.md Design section: "**No UI**: this feature adds or changes no user interface." |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 58 FRs have planned tests below. All are Non-UI |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot or the motion token source | Pass | This feature creates both token sources, the derived output (the constitution's "token output") and the `@cv/tokens` package that reads it, the only way code reads tokens. Literal values in styles and components fail the `tokens` check, which blocks merge (FR-027, FR-039). A token name lives in one source only (FR-047). Changing a token is one edit at its source. `npm run token-output` then regenerates the output, which is a command, not an edit, as with 002's `content-shape` (R10). No CV data is touched |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | N/A | No app, shell or `os-core` code. `@cv/tokens` is a shared package that both shells will read. Matches spec Shell Scope (neither shell) |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | Sources and output are local, and the check runs under the permission model with no network grant. Tested with a positive control (FR-041). Tokens reach pages as CSS, which needs no network |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | N/A | Nothing visitor-facing. Tokens are plain CSS custom properties, which a server-rendered `/cv` reads without JavaScript |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | N/A | No UI. The motion source's own theme group leaves room for a reduced-motion theme (R4). System colors stay allowed in forced-colors conditions (FR-056) |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | Placeholder families are Source Serif 4 and Source Sans 3, with generic fallbacks. A test asserts no family in the export is an Apple font or the system UI font (FR-006). No icons or images |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | Four packages and five abstractions are listed below, each with the simpler alternative it rejected. No agent skills added |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One PR from `003-design-tokens`. Applying the updated ruleset is a repository setting made during that PR (quickstart scenario 12) |

## Requirement Traceability

Constitution III. Test files are under `tools/token-check/test/` unless a path says otherwise.
Each test or group title carries the `003-design-tokens-FR-###` IDs it covers. "Sample" means a
temporary project built inline with 001's `makeProject` and this feature's `tokenFiles` helper.
Titles hold only full, existing IDs, because the traceability check reads them (R20).

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 003-design-tokens-FR-001 | `packages/tokens/test/tokens.test.ts`: the export exists at `packages/tokens/penpot/tokens.json`, holds every Penpot-held category, and equals `JSON.stringify(JSON.parse(text), null, 2)` with no trailing newline (R2) | Non-UI |
| 003-design-tokens-FR-002 | `self-check.test.ts`: in a copy of the real `packages/tokens`, replacing the export with one where a color changed, then running `token-output`, makes the check pass and changes only the export and the two generated files | Non-UI |
| 003-design-tokens-FR-003 | `packages/tokens/test/tokens.test.ts`: the check reports no `unsupported-content` on the real export. Every theme has all six fields, and `tokenSetOrder` lists every set. The Penpot round trip itself is quickstart scenario 11 (SC-002) | Non-UI |
| 003-design-tokens-FR-004 | `themes.test.ts`: a theme enabling no sets, a theme with `group: ""` and an export with `"$themes": []` give `theme-without-sets`, `theme-without-group` and `theme-without-sets` at `$themes`. `packages/tokens/test/tokens.test.ts`: the real export has exactly one theme, in its own group | Non-UI |
| 003-design-tokens-FR-005 | `output.test.ts`: a committed CSS file with one byte changed, and a missing TS file, each give `stale-output`. The generator writes nothing when a source has a problem. `self-check.test.ts`: the committed output is current | Non-UI |
| 003-design-tokens-FR-006 | `packages/tokens/test/tokens.test.ts`: the real tokens include color, typography, spacing, radius and shadow in the export, a duration and a cubic Bézier in the motion source, a color with alpha, a reference, a multi-value typography, a shadow and a `breakpoint.` token. No font family is an Apple font, `system-ui`, `-apple-system`, `BlinkMacSystemFont` or `ui-*` | Non-UI |
| 003-design-tokens-FR-007 | `packages/tokens/test/tokens.test.ts`: the export is in Penpot's written form (R2), every theme `id` is a UUID, and every token has `$description`, which Penpot always writes. That the owner made it in Penpot is recorded in the pull request (R21) | Non-UI |
| 003-design-tokens-FR-008 | `packages/tokens/test/tokens.test.ts`: every `duration` and `cubicBezier` token is in `packages/tokens/motion/tokens.json`, and the export has none | Non-UI |
| 003-design-tokens-FR-009 | `resolve.test.ts`: `color.text.primary` → `{color.base.ink}` with no such token gives `missing-reference` naming the file, path, missing name and `mode/light` (US1 scenario 2). A reference that resolves in `mode/light` but not in `mode/dark` is reported for `mode/dark` only | Non-UI |
| 003-design-tokens-FR-010 | `resolve.test.ts`: `space.a` ↔ `space.b` gives one `reference-loop` listing `space.a, space.b, space.a` (US1 scenario 3). A three-token loop is listed from its first name. A token referring to the loop gets no problem | Non-UI |
| 003-design-tokens-FR-011 | `themes.test.ts`: a theme enabling `brand-dark`, which doesn't exist, gives `missing-set` naming the theme and the set (US1 scenario 4) | Non-UI |
| 003-design-tokens-FR-012 | `themes.test.ts`: a set `drafts` that no theme enables gives `unused-set` (US4 scenario 6) | Non-UI |
| 003-design-tokens-FR-013 | `sources.test.ts`: each of the following gives `unsupported-content` at its position: a `duration` type in the export (US1 scenario 5), `boolean`, `$extensions` on a token, a group `$type`, a dotted key, legacy `value`/`type` keys, a missing `$description`, an extra theme field, `"disabled"` in `selectedTokenSets`, an extra `$metadata` field, `tokenSetOrder` missing a set, an unknown typography key and a single-object shadow | Non-UI |
| 003-design-tokens-FR-014 | `values.test.ts`: every type's accepted and rejected forms from [data-model.md](./data-model.md#value-rules). `1.5rem`, `450`, a color that resolves to `16`, a negative `borderWidth`, mixed-unit arithmetic and `lineHeights` without `fontSizes` each give `invalid-value`. A breakpoint of `50%` too | Non-UI |
| 003-design-tokens-FR-015 | `resolve.test.ts`: references inside a typography field, a shadow's `color`, `{space.4} * 2` and `roundTo({space.4} / 3, 1)` resolve, and each, pointing at a missing name, gives `missing-reference`. `math.test.ts`: units, `%` as unit and as operator, rounding to 4 digits | Non-UI |
| 003-design-tokens-FR-016 | `sources.test.ts`: a repeated key in one set, and `"text.primary"` beside `text` → `primary`, each give one `duplicate-token` listing every occurrence's line and column | Non-UI |
| 003-design-tokens-FR-017 | `resolve.test.ts`: `base` and `brand` both define `color.accent`, `brand` later in `tokenSetOrder`, and the value from `brand` wins with no problem (US4 scenario 5). With different types, `conflicting-types` names both sets | Non-UI |
| 003-design-tokens-FR-018 | `themes.test.ts`: an enabled set holding `{}` gives no problem | Non-UI |
| 003-design-tokens-FR-019 | `values.test.ts`: `#0008`, `#00000080`, `rgba(0, 0, 0, 0.5)`, `hsla(0, 0%, 0%, 0.5)` and `rgba({color.base.ink}, 0.5)` are accepted. `output.test.ts`: `#00000080` is written unchanged, and `rgba(#1f1d1a, 0.5)` becomes `rgb(31 29 26 / 0.5)` (US2 scenario 5) | Non-UI |
| 003-design-tokens-FR-020 | `names.test.ts`: `color..x`, a key `""`, `color.text.primary$`, `color.tëxt` and `color.text primary` each give `unusable-name` | Non-UI |
| 003-design-tokens-FR-021 | `names.test.ts`: `space.1-5` with `space.1.5` (US2 scenario 6), `Color.x` with `color.x`, `a_b` with `a-b`, and `typography.body-font-size` with typography `typography.body`, each give one `name-collision` naming the code name. The same check across the two sources | Non-UI |
| 003-design-tokens-FR-022 | `names.test.ts`: `color.primary` with `color.primary.light` gives `token-used-as-group`, in one set, across sets and across sources | Non-UI |
| 003-design-tokens-FR-023 | `themes.test.ts`: `dark` missing `color.text.primary` gives `theme-mismatch` naming `mode/dark` (US4 scenario 2). `color.surface` as a color in `light` and a number in `dark` names both types (US4 scenario 3). `mode` × `shell` with equal names passes (US4 scenario 4). A theme without sets or without a group joins no combination and gives no `theme-mismatch` | Non-UI |
| 003-design-tokens-FR-024 | `code.test.ts`: the same unchanged fixture TSX files compile against the output of the one-theme sample and of `two-themes` (US4 scenario 1, SC-004) | Non-UI |
| 003-design-tokens-FR-025 | `output.test.ts`: `tokenTypes` in the generated TS lists every name from both sources with its type and no source field. A token added to a sample appears after regenerating, with no other edit (US2 scenario 4). `packages/tokens/test/tokens.test.ts`: `cssVar` maps every name as the check's `codeName` does | Non-UI |
| 003-design-tokens-FR-026 | `css.test.ts`: `var(--token-color-text-primray)` gives `unknown-token` with file, line and column (US2 scenario 2). `components.test.ts`: the same name in a string gives `unknown-token`. `code.test.ts`: `cssVar('color.text.primray')` fails `tsc` with `TS2345` at its line and column (US2 scenario 3) | Non-UI |
| 003-design-tokens-FR-027 | `css.test.ts`: `padding: 12px` (US3 scenario 1), `font-family: Georgia, serif` (scenario 3), `transition: opacity 200ms ease-out` (scenario 4), `@media (min-width: 768px)` (scenario 9) and a written-out shadow, reported once, each give `literal-value` with kind, file, line and value | Non-UI |
| 003-design-tokens-FR-028 | `components.test.ts`: an inline `style` background `#00000080` (US3 scenario 2), `x.style.padding = '12px'`, `setProperty`, `setAttribute('fill', …)`, `animate` keyframes and options, and `const ink = '#1a1a1a'` each give `literal-value`. `<img width={24} height={24} />` and `<video width={640} />` don't | Non-UI |
| 003-design-tokens-FR-029 | `css.test.ts`: `margin: 0`, `0px`, `0s`, `color: inherit`, `initial`, `unset`, `revert`, `currentColor`, `transparent`, `none`, `auto`, `width: 100%`, `50vw`, `1fr`, `rotate: 45deg` and `line-height: 1.5` give nothing (US3 scenario 6) | Non-UI |
| 003-design-tokens-FR-030 | `css.test.ts`: `color: rebeccapurple`, `border-width: thin` and `font-size: x-large` give `literal-value`. `animation-name: tomato` doesn't. `components.test.ts`: `style={{ color: 'tomato' }}` gives `color` (US3 scenario 7) | Non-UI |
| 003-design-tokens-FR-031 | `css.test.ts`: `var(--token-color-text-primary, #000000)` reports the fallback as `color` (US3 scenario 5). `env(safe-area-inset-top, 12px)` reports `12px` | Non-UI |
| 003-design-tokens-FR-032 | `css.test.ts`: `#1a1a1a` and `12px` in a block comment, and inside a value between parts, give nothing, and the next value's column is exact (US3 scenario 8) | Non-UI |
| 003-design-tokens-FR-033 | `site-files.test.ts`: `#1a1a1a` in `specs/`, `docs/`, a test file, `__fixtures__/`, `tools/`, `node_modules/`, a dot-directory, a `*.generated.*`, the two token sources and a standalone `.svg` is not reported. A new root `.css`, a file in a new `apps/` folder and a new `packages/tokens/src/extra.css` are. A `.scss` file gives `unreadable-file` | Non-UI |
| 003-design-tokens-FR-034 | `check.test.ts`: a sample with problems of many types reports all in one run. An export with a syntax error still lets the motion rules and the literal values search run, and lists the other parts as not run | Non-UI |
| 003-design-tokens-FR-035 | `report.test.ts`: every problem line has file, line, column, type, subject and detail. Theme problems name the combination. A syntax error gives its line and column | Non-UI |
| 003-design-tokens-FR-036 | `report.test.ts`: the summary gives both sources' states and counts, active themes, derived output state, files searched and without styles, checks not run, and every type with zeros. Passing and failing wording, singular and plural | Non-UI |
| 003-design-tokens-FR-037 | `report.test.ts`: two runs give identical output, and the order doesn't depend on discovery order, key order in the sources, or locale | Non-UI |
| 003-design-tokens-FR-038 | `check.test.ts`: a missing export or motion source gives `missing-file` and exit code 1. Any problem gives exit 1, none gives 0 | Non-UI |
| 003-design-tokens-FR-039 | `repo-settings.test.ts`: `ci.yml` has the `tokens` job with the steps and restrictions in [contracts/ci.md](./contracts/ci.md), and the ruleset requires `tokens`. Live enforcement is quickstart scenario 12 | Non-UI |
| 003-design-tokens-FR-040 | `cli.test.ts`: `npm run --silent token-check` and a direct run with the same flags print the same report. The CI job runs exactly `npm run token-check` | Non-UI |
| 003-design-tokens-FR-041 | `cli.test.ts`: the check passes on a sample under the permission flags with no network grant. A positive-control script under the same flags fails `fetch` with `ERR_ACCESS_DENIED` (US1 scenario 7) | Non-UI |
| 003-design-tokens-FR-042 | `motion.test.ts`: `color.flash` in the motion source gives `wrong-source` saying colors belong in Penpot (US5 scenario 2). A `spacing` token too. An unknown type gives `unsupported-content` | Non-UI |
| 003-design-tokens-FR-043 | `motion.test.ts`: the motion source is read with the export's layout rules. An extra theme field or a dotted key there gives `unsupported-content`. `duration` and `cubicBezier` are the accepted types | Non-UI |
| 003-design-tokens-FR-044 | `motion.test.ts`: in the motion source, an unused set, a missing set, a theme without a group, a missing reference, a loop, a duplicate name and an unusable name each give their usual problem | Non-UI |
| 003-design-tokens-FR-045 | `values.test.ts`: `"-50ms"`, `"fast"`, `[1.5, 0, 0, 1]` (US5 scenario 5), `[0, 0, 1]` and `[0, 0, -0.1, 1]` give `invalid-value`. `"0"`, `"150ms"`, `"0.3s"` and `[0.2, -0.5, 0, 1.5]` pass | Non-UI |
| 003-design-tokens-FR-046 | `resolve.test.ts`: `motion.duration.slow` → `{space.4}` (US5 scenario 4), and an export token → `{motion.duration.fast}`, each give `cross-source-reference` | Non-UI |
| 003-design-tokens-FR-047 | `names.test.ts`: `motion.duration.fast` as a number in the export and a duration in the motion source gives `duplicate-token` naming both sources (US5 scenario 3). `motion.Duration.fast` against `motion.duration.fast` gives `name-collision` | Non-UI |
| 003-design-tokens-FR-048 | `themes.test.ts`: a theme `mode/light` in both sources is one theme, and a combination across both sources is compared as one. A group in the motion source multiplies the combinations | Non-UI |
| 003-design-tokens-FR-049 | `code.test.ts`: `cssVar('motion.duration.fast')` compiles like `cssVar('color.text.primary')`, and `cssVar('motion.duration.fsat')` fails (US5 scenario 6). Moving a token between the sample's sources under the same name leaves the generated TS identical | Non-UI |
| 003-design-tokens-FR-050 | `self-check.test.ts`: in a copy of the real `packages/tokens`, changing `motion.duration.fast` to `200ms` and regenerating passes, and the CSS holds `200ms` (US5 scenario 7) | Non-UI |
| 003-design-tokens-FR-051 | `css.test.ts`: `--card-gap: var(--token-space-4)` passes (US2 scenario 7), `--token-card-gap: 4px` and `--TOKEN-x: 0` give `local-in-token-namespace` (US2 scenario 8), and `@custom-media --token-x …` does too. `components.test.ts`: a `'--token-x'` style key and `setProperty('--token-x', …)` too | Non-UI |
| 003-design-tokens-FR-052 | `output.test.ts`: `breakpoint.wide` gives `--token-breakpoint-wide: 768px` and `@custom-media --token-breakpoint-wide (width >= 768px)`, and `mediaQuery` returns `(width >= 768px)`. `css.test.ts`: `@media (--token-breakpoint-wide)` passes, and `(--token-breakpoint-wiide)` and `(--token-space-4)` give `unknown-token` (US3 scenario 9) | Non-UI |
| 003-design-tokens-FR-053 | `components.test.ts`: `style={{ padding: 12, animationDuration: 300 }}` gives `length` and `duration`, while `lineHeight: 1.5`, `opacity: 0.8`, `zIndex: 2` and `'--x': 12` give nothing (US3 scenario 10). `'line-height': 2` gives `length`. `css.test.ts`: `stroke-width: 2` gives `length` | Non-UI |
| 003-design-tokens-FR-054 | `themes.test.ts`: both `light` and `dark` active, or neither, give `invalid-active-themes` naming `mode` and the themes found (US4 scenario 8). A group whose active theme differs between the sources does too. `output.test.ts`: with `light` active, `:root` has `light`'s value and `themeValues` also has `dark`'s (US4 scenario 7) | Non-UI |
| 003-design-tokens-FR-055 | `components.test.ts`: `<svg viewBox="0 0 24 24" width={24}>` with a `circle r={4}`, `strokeWidth={2}` and a `path d` reports only `2` and `24` (US3 scenario 12). `fill="#1a1a1a"` on a `path` is reported (US3 scenario 11) | Non-UI |
| 003-design-tokens-FR-056 | `css.test.ts`: `Highlight` in `@media (forced-colors: active)` passes, and `CanvasText` outside gives `color` (US3 scenario 13). `CanvasText` under `not (forced-colors: active)`, or in `(forced-colors: active), print`, is reported. `12px` inside the forced-colors block is reported. `components.test.ts`: a system color inline is reported | Non-UI |
| 003-design-tokens-FR-057 | `css.test.ts`: `padding: 12px; /* token-check: ignore */`, a `/* token-check-disable */` block and an `eslint-disable`-style comment have no effect (US3 scenario 14). `components.test.ts`: the same in a `// …` comment | Non-UI |
| 003-design-tokens-FR-058 | `css.test.ts`: `padding: var(--token-color-text-primary)` gives nothing (US2 scenario 9). `code.test.ts`: `cssVar('color.text.primary')` assigned to `padding` compiles | Non-UI |

Success criteria without an FR of their own are also tested:

- SC-001: `cli.test.ts` compares each seeded sample's report with its `expected-report.txt`.
  - `seeded/` holds every problem type and edge case that a readable pair of sources can hold.
    Its sources have problems, so the derived output part doesn't run.
  - Third-party code and version-control data can't be committed inside a sample. The test adds
    them to a copy of `seeded/` and expects the same report.
  - `seeded-broken/` holds an unreadable export and a missing motion source.
  - `seeded-missing/` holds a missing export and an unreadable motion source.
  - `seeded-no-theme/` holds an export with no theme at all.
  - `seeded-stale/` holds valid sources with stale derived output, since `stale-output` needs
    sources with no problem.

  Across the five, every problem type has a non-zero count (R20).
- SC-002: quickstart scenario 11, by hand before merge, with the result recorded in the pull
  request. FR-003 and FR-013 are its automated guards.
- SC-003: `self-check.test.ts`, as FR-002 and FR-050 above.
- SC-004: `code.test.ts` and the `two-themes` sample, as FR-024 above.
- SC-005: covered by FR-037 and FR-040 above.
- SC-006: `performance.test.ts` runs the check on the real repository in under 10 s, asserted
  off CI only, as in 001.
- SC-007: covered by FR-035 above.
- SC-008: `self-check.test.ts` runs the check on the real repository and asserts it passes.

## Dependencies, Skills & Abstractions

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `postcss` 8.5.31 (exact pin) | dev dependency, loaded by the check | Parses style sheets into rules and declarations with positions, accepting every form of CSS nesting (FR-027, FR-035, R14) | CSSTree alone can't parse relaxed nesting, and its raw fallback swallows the declarations after it. Lightning CSS keeps no positions on declarations | Yes: the PostCSS project (Andrey Sitnik). It's also Vite's default CSS processor |
| `css-tree` 3.2.1 (exact pin) | dev dependency, loaded by the check | Turns each value and media prelude into typed nodes with exact positions, and gives each property's grammar, so bare keywords are judged by what the property accepts (FR-027, FR-029, FR-030, R14, R15) | `postcss-value-parser` gives untyped words and no media-query structure. Hand-written value tokenizing would re-implement CSS Syntax 3, and a hand-kept property list would drift | No: Roman Dvornov and contributors. No vendor publishes a CSS value parser. Its grammar comes from MDN's `mdn-data` |
| `@types/css-tree` 3.2.0 (exact pin) | dev dependency, types only | `css-tree` ships no types, and `npm run typecheck` runs with `strict` and `checkJs` | A local declaration file would have to be kept in step with the package by hand | No: DefinitelyTyped |
| `expr-eval-fork` 3.0.3 (exact pin) | dev dependency, loaded by the check | Evaluates token arithmetic exactly as Penpot's resolver does, through sd-transforms (FR-014, FR-015, R7) | Style Dictionary with sd-transforms brings 13 dependencies and reports by log text. A hand-written evaluator would have to copy expr-eval's precedence and functions anyway | Partly: Joren Broekema, who maintains Style Dictionary and sd-transforms, the tools Penpot resolves tokens with. No dependencies |
| npm workspace `@cv/tokens` | abstraction (package boundary) | Gives every later feature one import for tokens, CSS and TypeScript alike (Constitution IV, R1) | Relative imports into `packages/tokens/src` would spread through every later feature | N/A |
| Reading functions (`cssVar`, `typography`, `mediaQuery`, `tokenValue`, `durationMs`) | abstraction | One place maps a token name to its CSS name, so TypeScript checks the name and the mapping can't drift (FR-026, FR-049, R12) | Writing `'var(--token-…)'` by hand in components gets no type check, and the CSS name scheme would be copied into every caller | N/A |
| Output generator (`output.ts`, `npm run token-output`) | abstraction | Builds the description, CSS and TS from the resolved sources. The check uses the same function in memory to report staleness (FR-005, FR-025, R10) | Style Dictionary: rejected in R7. Hand-written CSS breaks FR-005 | N/A |
| Property capability table (`grammar.ts`) | abstraction | Asks CSSTree's grammar once per property whether it takes a color, an easing curve, a line width, a font size, a length or a time (R14, R15) | A hand-kept list of properties would miss new CSS properties | N/A |
| Shared site-file walk | reuse | Content-check's `searchFiles` takes a list of excluded paths, so both checks agree on what site source is (FR-033, R13) | A copy would drift from 002's definition, which the spec's Assumptions refer to | N/A |
| Test helper `tools/token-check/test/helpers/tokens.ts` | abstraction (tests only) | `tokenFiles` writes a minimal valid export and motion source into a sample, so each of about 15 test files states only what it changes (R20) | Writing both sources inline in every test would repeat them, and a format change would need edits in all of them | N/A |

No runtime dependency is added for the site. `@cv/tokens` depends on nothing. The check's
source is plain modules, with no classes, plugins or configuration file.

## Project Structure

### Documentation (this feature)

```text
specs/003-design-tokens/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R21
├── data-model.md        # Phase 1: sources, resolution, value rules, problems, report
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── token-sources.md   # The export and motion source, and how to update them
│   ├── token-output.md    # What @cv/tokens exports and guarantees
│   ├── literal-values.md  # What the literal values search reports, and where
│   ├── cli.md             # Commands, exit codes, report format
│   └── ci.md              # The tokens job and the ruleset change
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

There is no `design/` folder because the feature has no UI.

### Source Code (repository root)

```text
package.json             # scripts token-check, token-output; devDependencies postcss, css-tree,
                         #   @types/css-tree, expr-eval-fork
package-lock.json

.github/
├── workflows/
│   └── ci.yml           # + job tokens (contracts/ci.md)
└── rulesets/
    └── main.json        # + required check tokens

packages/
├── content/             # unchanged
└── tokens/              # @cv/tokens: the token sources, the derived output and the reading functions (Constitution IV)
    ├── package.json     # private, type module, exports "." and "./tokens.css", no dependencies
    ├── README.md        # how to update the tokens (contracts/token-sources.md)
    ├── penpot/
    │   └── tokens.json  # the Penpot export, byte for byte (FR-001)
    ├── motion/
    │   └── tokens.json  # the motion token source (FR-008)
    ├── src/
    │   ├── index.ts               # cssVar, typography, mediaQuery, tokenValue, durationMs; re-exports
    │   ├── tokens.generated.ts    # generated by npm run token-output
    │   └── tokens.generated.css   # generated by npm run token-output
    └── test/
        └── tokens.test.ts         # the real tokens: FR-001, FR-003, FR-004, FR-006 to FR-008

tools/
├── traceability/
│   └── test/repo-settings.test.ts   # ruleset now includes tokens
├── content-check/
│   ├── src/facts.ts                 # searchFiles takes a list of excluded paths
│   ├── src/check.ts                 # passes [the CV document]
│   └── test/repo-settings.test.ts   # ruleset now includes tokens
└── token-check/
    ├── src/
    │   ├── main.js          # entry point, plain JS: checks the Node version, loads cli.ts
    │   ├── cli.ts           # arguments, exit codes, prints the report
    │   ├── check.ts         # one run over a root directory → Report
    │   ├── paths.ts         # fixed paths
    │   ├── sources.ts       # read both sources; sets, definitions, themes, metadata; structure
    │   ├── names.ts         # name parts, code names, collisions, groups, namespace
    │   ├── themes.ts        # groups, combinations, active themes
    │   ├── resolve.ts       # per-combination merge, references, loops, conflicting types
    │   ├── math.ts          # unit handling around expr-eval-fork
    │   ├── values.ts        # value rules per type
    │   ├── output.ts        # description, CSS text, TS text
    │   ├── generate-output.ts # npm run token-output
    │   ├── site-files.ts    # site file kinds, on the shared walk
    │   ├── css.ts           # PostCSS + CSSTree reading of style sheets
    │   ├── grammar.ts       # property capabilities from CSSTree's lexer
    │   ├── classify.ts      # literal kinds, neutral values, keyword and unit lists
    │   ├── components.ts    # oxc-parser reading of JSX and style APIs
    │   └── report.ts        # problem ordering and text rendering
    └── test/
        ├── helpers/
        │   └── tokens.ts    # tokenFiles: minimal valid sources for samples
        ├── __fixtures__/
        │   ├── seeded/          # every case readable sources can hold + expected-report.txt
        │   ├── seeded-broken/   # unreadable export, missing motion source + expected-report.txt
        │   ├── seeded-missing/  # missing export, unreadable motion source + expected-report.txt
        │   ├── seeded-no-theme/ # an export with no theme + expected-report.txt
        │   ├── seeded-stale/    # valid sources, stale derived output + expected-report.txt
        │   ├── two-themes/      # mode × shell, same names: passes (SC-004)
        │   └── code/            # package.json (type module), tsconfig + TSX files importing @cv/tokens (FR-024, FR-026, FR-049)
        ├── sources.test.ts
        ├── names.test.ts
        ├── themes.test.ts
        ├── resolve.test.ts
        ├── math.test.ts
        ├── values.test.ts
        ├── motion.test.ts
        ├── output.test.ts
        ├── code.test.ts
        ├── css.test.ts
        ├── components.test.ts
        ├── site-files.test.ts
        ├── report.test.ts
        ├── check.test.ts
        ├── cli.test.ts
        ├── repo-settings.test.ts
        ├── self-check.test.ts
        └── performance.test.ts
```

**Structure Decision**:

- `packages/tokens` is created here, and becomes the second npm workspace. It holds the sources,
  the derived output (the constitution's "token output") and the reading functions. No tooling.
  The reading functions are site source, so the token check searches them (FR-033).
- The check lives in `tools/token-check/`, beside the other two checks. It reuses:
  - 001's parser setup, ordering and Node version gate;
  - 002's JSON reader and site-file walk.

  So the three checks agree on what a test, a site file and a position are.
- `tsconfig.json` already includes `packages/**/*.ts` and excludes `__fixtures__`, so the
  generated TS is type-checked and the code fixture runs its own `tsc`. The Vitest globs already
  cover both test folders.
- `os-core`, the shells, the apps and `/cv` aren't created here.

Conventions set here for later features:

- **Reading tokens**: only through `@cv/tokens`. In CSS that's `var(--token-…)` and
  `@media (--token-breakpoint-…)`. In TypeScript it's the reading functions. Never copy a value.
- **Local variables**: style variables may use any name except `--token-…`.
- **After an export or a motion edit**: run `npm run token-output` and commit the generated
  files with the change.
- **The web app's CSS build** must replace `@custom-media` (Lightning CSS with
  `drafts.customMedia`, or `postcss-custom-media` with `@csstools/postcss-global-data`). No
  browser supports it yet (R11).
- **A new style format** (`.scss`, `.html`, `.vue`, `.svelte`, `.astro`, `.mdx`) is reported as
  unreadable until the plan that adds it extends the token check's readers.
- **A styling tool** with its own scale or palette (Tailwind, a CSS-in-JS library) extends
  FR-030's detection first.
- **JSX** is read with React DOM's style rules. A different runtime updates them (R16).
- **Fonts**: hosting fonts needs `@font-face`, which names a family literally. That feature's spec
  must exempt it, or generate it (R15).
- **Merging**: every pull request must pass `traceability`, `test`, `content` and `tokens`.

## Complexity Tracking

None. Every Constitution Check row is Pass or N/A, and no exception is needed.
