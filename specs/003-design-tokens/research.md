# Research: Design Tokens Source

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Each section records one decision: what was chosen, why, and what else was considered. The
Technical Context in plan.md had no open questions left after these. The base toolchain (Node 26
running TypeScript directly, npm workspaces, Vitest, GitHub Actions, the permission model) was
set by [001](../001-requirement-traceability/research.md) and
[002](../002-cv-content/research.md) and is reused, not revisited.

Facts about Penpot were read in the `penpot/penpot` source at tag `2.18.3` (commit `ff7a66f5`,
released 2026-10-06, the latest release on 2026-10-22). File references below use these keys:

| Key | File at `2.18.3` |
|-----|------------------|
| TK | `common/src/app/common/types/token.cljc` |
| TL | `common/src/app/common/types/tokens_lib.cljc` |
| FT | `common/src/app/common/files/tokens.cljc` |
| SD | `frontend/src/app/main/data/style_dictionary.cljs` |
| EM | `frontend/src/app/main/ui/workspace/tokens/export/modal.cljs` |
| UG | the user guide, <https://help.penpot.app/user-guide/design-systems/design-tokens/> |

Other facts were checked on 2026-10-22 against the npm registry, the CSS Working Group drafts,
MDN's browser compatibility data and the React source, and are cited where they're used.

## R1. Where the tokens live: `packages/tokens`, an npm workspace

**Decision**:

- `packages/tokens` becomes the second npm workspace, named `@cv/tokens` (private). The root
  already has `"workspaces": ["packages/*"]`, so nothing changes there.
- The token export is `packages/tokens/penpot/tokens.json`. The motion token source is
  `packages/tokens/motion/tokens.json`.
- The derived output (the constitution's "token output") is
  `packages/tokens/src/tokens.generated.css` and `packages/tokens/src/tokens.generated.ts`,
  written by `npm run token-output` (R10).
- The package's entry point, `packages/tokens/src/index.ts`, is the only way code reads tokens
  ([contracts/token-output.md](./contracts/token-output.md)).
- The check lives in `tools/token-check/`, next to the other two checks. `npm run token-check`
  runs it.

**Rationale**:

- The constitution's plan template leaves the token output path to "the first plan that creates
  it". A package gives every later feature one import, `@cv/tokens`, as `@cv/content` does for CV
  data.
- Two folders, `penpot/` and `motion/`, make it plain which file is Penpot's and which is
  edited by hand. Both keep the file name Penpot gives its download (R2), so the motion source
  reads as "the same format".
- The check is repository tooling, so it sits in `tools/`, where it's never searched for literal
  values (FR-033).

**Alternatives considered**:

- *Tokens inside `packages/content`*: that package is CV data only (Constitution IV), and the
  content check would have to carve tokens out of its key facts search.
- *A root `tokens/` folder*: code would import it by relative path, and there'd be no package
  boundary to hang the generated files and the reading functions on.

## R2. The export form: one file, kept byte for byte

**Decision**:

- The owner exports with Penpot's **Single file** tab, the dialog's default. Penpot downloads
  `tokens.json` (EM 50-65). The owner saves it over `packages/tokens/penpot/tokens.json`. That
  is the one export of FR-002.
- The committed file is exactly the downloaded bytes. Penpot writes `JSON.stringify(data, null,
  2)`: two-space indent and **no trailing newline** (EM 56). Nothing adds one.
- A test asserts that the committed export equals `JSON.stringify(JSON.parse(text), null, 2)`.
  That's the form Penpot writes, so a hand-formatted or re-saved file fails (FR-001, FR-007).

**Rationale**:

- One file replaces one file. With **Multiple files**, Penpot downloads `tokens.zip`, one file
  per set plus `$themes.json` and `$metadata.json` (TL 2062-2081). Replacing a folder means
  deleting the old one first, or a removed set would linger.
- Re-stringifying keeps the file's own key order, so the form test passes for any real export,
  whatever order Penpot chose (R3).
- The spec's edge case "a file the export lists, that is missing" can't arise with one file.
  `missing-file` still covers a missing export.

**Alternatives considered**:

- *Multiple files*: smaller diffs per set, but it breaks "one export replaces one file", and the
  set files' names come from set names, which may contain `/` and spaces.
- *Reformatting the export* (sorted keys, a trailing newline): diffs would be stable, but the
  file would no longer be what Penpot wrote (FR-001).

## R3. What Penpot writes, as the check reads it

**Decision**: the check accepts exactly what Penpot 2.18.3's single-file export writes, and
reports anything else as `unsupported-content` (FR-013). The format is fixed in
[contracts/token-sources.md](./contracts/token-sources.md). In short:

- **Top level** (TL 2083-2111): one key per set, holding that set's tokens. The key is the
  **full set name as a literal string**, such as `"mode/light"`, never nested. Then `"$themes"`
  and `"$metadata"`. No other `$` key.
- **Tokens** are nested by name part: `color.text.primary` is
  `{"color": {"text": {"primary": {...}}}}` (TL 498-506). Export never writes a dotted key.
  An object with `$value` is a token. Every other object is a group.
- **A token** has exactly `$value`, `$type` and `$description`. Penpot always writes
  `$description`, as `""` when empty (TL 145). It never writes `$extensions`, ids or timestamps.
- **Types** (TK 87-107): `color`, `dimension`, `spacing`, `sizing`, `borderRadius`,
  `borderWidth`, `opacity`, `rotation`, `number`, `fontFamilies`, `fontSizes`, `fontWeights`,
  `letterSpacing`, `textCase`, `textDecoration`, `typography` and `shadow`. These are the 17 in
  the spec's Key Entities. Penpot's type map also has `boolean`, `string` and `other`, but
  they have no panel and aren't in the plugin API's `TokenType`, so the check reports them as
  unsupported. Penpot has **no** duration or easing type (open issue
  [#12337](https://github.com/penpot/penpot/issues/12337)).
- **A theme** (TL 2034-2049) has exactly `id` (a UUID string), `name`, `group` (`""` when the
  theme has no group), `description`, `isSource` (`false`) and `selectedTokenSets`, an object
  mapping each enabled set to `"enabled"`. Penpot lists only enabled sets.
- **`$metadata`** has exactly `tokenSetOrder` (every set, in panel order), `activeThemes`
  (`"group/name"`, or `"/name"` for a theme without a group, TL 756-770) and `activeSets`.
- **Key order isn't stable.** Penpot's maps keep insertion order up to 8 entries and use hash
  order beyond. The check never depends on key order. Set order comes only from
  `tokenSetOrder`. The order of `activeThemes` and `activeSets` is undefined too, so the check
  compares them as sets.
- **Values** are strings as typed in Penpot (`"16"`). Numbers that came in through an import stay
  numbers, so the check accepts a JSON number wherever it accepts a numeric string.

The check reads `activeThemes` to know which themes are active (FR-054). It doesn't use
`activeSets`, which can also hold sets switched on by hand in Penpot. See Known limits below.

**Rationale**: FR-013 exists so the committed export can be imported back unchanged (FR-003).
Anything Penpot's writer never produces is either a hand edit or something an import would drop
or rewrite: an unknown type is dropped with a toast (TL 2113-2138), an extra typography key is
dropped (TL 1690-1700), and a single shadow object becomes an array. So "content Penpot doesn't
write" is defined by the writer, not by what the import tolerates.

Penpot's import also accepts legacy Tokens Studio `value`/`type` keys, singular type aliases
(`fontWeight`, `boxShadow`) and dotted keys (TL 1572-1583, 1756-1758). The export never writes
them, so the check reports them.

**Known limits**:

- **Sets switched on by hand**: Penpot can show a set as active without any active theme
  enabling it, and `activeSets` then lists it. The site uses only the active themes' sets
  (FR-054), so the mockup in Penpot could show a value the site doesn't. The spec defines no
  problem for this. The quickstart's round-trip scenario has the owner confirm that
  `activeSets` equals the sets of the active themes.
- **Set descriptions** are stored by Penpot but never exported (TL 192-211). They can't
  round-trip, so they shouldn't be used.

## R4. The motion token source: the same layout, with `duration` and `cubicBezier`

**Decision**:

- `packages/tokens/motion/tokens.json` uses the export's layout exactly: sets as top-level keys,
  nested tokens with `$value`, `$type` and `$description`, `$themes` and `$metadata` with the same
  fields (FR-043, FR-044). It's written by hand, two-space indented like the export.
- Its only types are `duration` and `cubicBezier`, the DTCG names. They're also the names
  Penpot's open issue #12337 asks for.
- **Duration** values are strings with `ms` or `s`, like `"150ms"`, `"0.15s"` or `"0"`. They're
  zero or positive (FR-045). This is the string form of the DTCG drafts that Penpot's dialect
  follows. Penpot writes every other length as a string too (`"16"`, `"8px"`). The stable DTCG
  2025.10 form, `{"value": 150, "unit": "ms"}`, isn't used: Penpot writes no type in the stable
  structured form (its colors and dimensions are strings), so it would be a different format.
- **Cubic Bézier** values are an array of four JSON numbers, `[x1, y1, x2, y2]`, with `x1` and
  `x2` from 0 to 1 and `y1` and `y2` any number. That form is the same in every DTCG version
  ([2025.10 §8.6](https://www.designtokens.org/tr/2025.10/format/)).
- A motion token may refer to another motion token, as a whole value (`"{motion.duration.base}"`)
  or, for durations, inside arithmetic (`"{motion.duration.base} * 2"`), resolved by R7's rules
  with `ms` and `s` as the units.
- The motion source has its own theme group. The starter is group `motion`, theme `standard`,
  enabling the set `motion`. A later reduced-motion theme can join that group (spec Assumptions).
  Theme `id`s are any non-empty string, because nothing generates them. The starter uses a
  UUID, like Penpot.

**Rationale**:

- "The same format" means the same file layout and the same value dialect, so moving a token
  into Penpot later is a cut and paste between files under the same name (FR-043, FR-049).
- A separate group keeps the motion source independent of the export's themes. If motion used
  the export's `mode/light`, adding `mode/dark` in Penpot would also need a `mode/dark` theme in
  the motion source, or every motion token would be missing from that combination (FR-023).

**Alternatives considered**:

- *DTCG 2025.10 structured values* (`{"value": 150, "unit": "ms"}`): the stable form, but no
  value in the export uses that style, so the two sources would follow different versions of the
  format.
- *CSS easing strings* (`"cubic-bezier(0.2, 0, 0, 1)"`, `"ease-out"`): not a DTCG type, and
  keywords would hide the four numbers FR-045 asks the check to validate.
- *Reusing the `mode` group*: rejected above.

## R5. Reading the sources with positions

**Decision**:

- Both sources are read with content-check's `readDocument` (`tools/content-check/src/json.ts`).
  It reports a missing file, invalid UTF-8, a byte order mark and the first syntax error with
  its line and column, and gives a `jsonc-parser` tree for locating any value (002 research R5).
  Its two problem types are mapped to this check's `missing-file` and `unreadable-file`.
- The check walks the `jsonc-parser` tree, not the `JSON.parse` value, to find tokens. The tree
  keeps keys repeated in one object, which `JSON.parse` drops. That makes FR-016 checkable: the
  same name twice in one set is either a repeated key or a dotted key (`"text.primary"`)
  alongside a nested path. Both are reported as `duplicate-token`, naming every occurrence. The
  dotted key is also `unsupported-content`, since Penpot never writes one.
- Every problem about a token points at its `$value` (or the key, for name problems), so the
  report gives `file:line:column` (SC-007).

**Rationale**: the same reader as 002 means the same positions and the same syntax messages in
both checks, and no second JSON parser.

## R6. Themes, combinations and resolution

**Decision**:

- **Themes** are identified by group and name. A theme with the same group and name in both
  sources is one theme (FR-048). The **theme groups** are every group in either source.
- **A combination** is one theme from every group (clarification 2). The **active combination**
  is the themes listed in `activeThemes` (FR-054).
- **Resolution runs per source, over that source's own groups.** For each combination of the
  export's groups, the enabled export sets are merged in `tokenSetOrder`, later sets winning
  (FR-017). The same is done for the motion source. A reference resolves only against the merged
  tokens of its own source. A motion group can never change an export value, so resolving per
  source gives the same values as resolving over every full combination, with fewer runs.
- **FR-009 resolves per combination** (clarification 12). With one group, as in this feature, a
  combination is one theme. With several groups, a reference from a `dark` set to a token in a
  `mobile` set resolves only when both are active, so resolving one theme alone would report
  references that work.
- **Names and types are compared over full combinations** across both sources (FR-023, FR-048).
  A full combination picks one theme from every group in either source, and each source
  contributes its resolution for its own groups' picks. When a group is in both sources, the two
  share that pick. When one source has no theme of the picked name in that group, it contributes
  no tokens, so every one of its names is missing there. For each full combination, the resolved
  names and the type of each name's winning definition are collected. Every name missing from a
  combination, or with a different type there, is one `theme-mismatch` naming the combinations.
  Crossing each source's own combinations instead would pair `mode/dark` from one source with
  `mode/light` from the other.
- **Themes with a structural problem** (`theme-without-group`, `theme-without-sets`) take no
  part in groups, combinations or active themes (clarification 13). Each is reported once,
  instead of again for every token in every combination it would join. Its sets still count as
  enabled, so they aren't also `unused-set`.
- **Missing references** (FR-009): one problem per referring definition and missing name,
  listing every combination where it fails. If the name exists in the other source, the problem
  is `cross-source-reference` instead (FR-046).
- **Loops** (FR-010): references form a graph in each combination. Each cycle is reported once
  across all combinations, starting from its name that sorts first in code-unit order and
  ending with that name again: `space.a, space.b, space.a`. A token that only depends on a loop,
  or on a missing or invalid token, gets no problem of its own (spec Edge Cases).
- **Invalid values** (FR-014) are reported on the token whose resolved value is invalid for its
  type, unless that value came from a token that is itself reported. A color that refers to
  `space.4` is reported on the color.
- **Conflicting types** (FR-017): two enabled sets in one combination defining the same name with
  different `$type`s.

**Rationale**: the spec's acceptance scenarios all use one group per source, where every reading
of "theme" agrees. Resolving per combination is the reading that stays right when the
`shell` group arrives.

**Alternative considered**: *resolving every full combination across both sources*. It gives the
same answers, but runs the export's resolution again for every motion theme.

## R7. Math: Penpot's own evaluator

**Decision**:

- Arithmetic in values is evaluated as Penpot's resolver does it. Penpot resolves tokens with
  Style Dictionary 5.5.2 and `@tokens-studio/sd-transforms` 2.0.3 (`frontend/package.json` lines
  66 and 116). sd-transforms' `checkAndEvaluateMath` does the following:
  1. removes `px`;
  2. finds at most one other unit;
  3. evaluates the expression with `expr-eval-fork`;
  4. rounds the result to 4 fraction digits;
  5. puts the unit back.
- The check depends on `expr-eval-fork`, pinned to exactly `3.0.3` (the latest version, inside
  sd-transforms' `^3.0.1` range). It calls `Parser.evaluate` with no variables and no custom
  functions. The check's own code does the unit handling around it.
- **Units**: dimension-like values allow `px` or `%`, durations `ms` or `s`. Unit-bearing
  operands in one expression must share a unit. Unitless operands take it. Mixed units, or a
  result that isn't a finite number, make the value `invalid-value`.
- **Operators and functions** are expr-eval's: `+ - * / % ^`, parentheses, and `abs ceil floor
  round max min sqrt pow log exp sin cos tan asin acos atan atan2 roundTo` (UG lines 54-84). A
  `%` directly after a number is a unit. A `%` with spaces around it is the remainder operator.
- References inside an expression are replaced by their resolved values first (FR-015).

**Rationale**: FR-014 asks whether Penpot accepts a value, and the derived output must hold the
number Penpot shows. Using the same evaluator removes the risk of a hand-written parser
disagreeing on precedence, `^`, unary minus or `roundTo`. `expr-eval-fork` has no dependencies
and is maintained by Joren Broekema, who also maintains Style Dictionary and sd-transforms.

**Alternatives considered**:

- *Style Dictionary and sd-transforms themselves*: exact parity, but Style Dictionary 5.5.2
  brings 13 dependencies (Prettier, a zip library and an in-memory file system among them). It
  also reports problems as log text with no positions, one batch at a time.
- *A hand-written evaluator*: about 150 lines plus tests that would have to copy expr-eval's
  behaviour anyway.

## R8. Values Penpot accepts

**Decision**: after resolution, each value must be one Penpot accepts for its type (FR-014). The
rules come from Penpot's resolver and validators. The full table is in
[data-model.md](./data-model.md#value-rules). The main points:

- **Dimension-like types** (`dimension`, `spacing`, `sizing`, `borderRadius`, `borderWidth`,
  `fontSizes`, `rotation`, shadow offsets, blur and spread): the resolved value must match
  Penpot's `^\s*(-?[0-9]+\.?[0-9]*)(px|%)?\s*$` (FT 347-361). That means a number, optionally
  with `px` or `%`. **`rem` and `em` are rejected**: the user guide says "px for now" (UG 409).
  `borderWidth` and shadow `blur` must not be negative (SD 150-172).
- **`opacity`**: 0 to 1, or a percentage from 0% to 100%. **`number`**: a number with no unit.
- **`fontWeights`**: `100` to `900` in hundreds, or `950`, or one of Penpot's named weights
  (`Regular`, `Bold` and so on, in any case), optionally followed by ` italic` (TK 624-660).
  `450` is rejected.
- **`fontFamilies`**: an array of strings, or one comma-separated string. Every family is
  non-empty.
- **`letterSpacing`**: a number, optionally with `px` (SD 174-181). **`textCase`**: `none`,
  `uppercase`, `lowercase` or `capitalize`. **`textDecoration`**: `none`, `underline` or
  `strike-through`. Both are trimmed and compared ignoring case (SD 183-216).
- **`typography`**: an object with only `fontFamilies`, `fontSizes`, `fontWeights`,
  `lineHeights`, `letterSpacing`, `textCase` and `textDecoration`, each following its own type's
  rule. It can also be a whole-value reference to another typography token. `lineHeights` is a
  number, a percentage or `px`, and needs `fontSizes` in the same token (SD 235-261).
- **`shadow`**: an array of objects with `offsetX`, `offsetY`, `blur`, `spread`, `color` and an
  optional boolean `inset`, or a whole-value reference to another shadow. `color` is required.
- **`color`** (FR-019): `#` followed by 3, 4, 6 or 8 hex digits, `rgb()`, `rgba()`, `hsl()`,
  `hsla()`, or a CSS named color. Also `rgba(<hex>, <alpha>)`, which is what
  `rgba({color.base.ink}, 0.5)` becomes once its reference is resolved. Penpot's own test files
  use that form.

**Deliberate narrowing**: Penpot's resolver accepts any color `tinycolor2` parses, which
includes `hsv()` and forms without parentheses such as `rgb 255 0 0`. The check accepts only the
forms the user guide documents (UG 182-187), plus named colors and the `rgba(<hex>, <alpha>)`
form. The guide's forms are a published, stable promise. The rest are parser leniency that
would also need converting before CSS can use them. A value outside them is reported with the
accepted forms in its detail, and the fix is a re-entry in Penpot. This is the same kind of
choice as 002's email rule (002 research R4).

**Breakpoints**: a token whose first name part is `breakpoint` must also resolve to a length in
`px`, or a plain number, which means pixels. A percentage would make an invalid media query
(R11). It's reported as `invalid-value`.

**Rationale**: matching Penpot's own validators keeps FR-014 honest: a value the check accepts
imports into Penpot and resolves the same way there.

## R9. Names code can use, and the token namespace

**Decision**:

- **Name parts** (FR-020): every part between dots must be non-empty and match
  `^[A-Za-z0-9_-]+$`. That's stricter than Penpot, which also allows `$` inside a part (TK
  136-148). A `$` can't be used in a CSS custom property name without escaping.
- **Code name**: each token's name in CSS is `--token-` followed by its name in lower case, with
  every `.` and `_` replaced by `-`. So `color.text.primary` becomes
  `--token-color-text-primary`. **Two names with the same code name collide** (FR-021): that's
  exactly "differ only in letter case or only in separator". The comparison covers every name in
  both sources and the sub-names typography tokens expand to (R10).
- **Token used as group** (FR-022): a name that is a token in any set of either source while
  also being the start of another token's name (`color.primary` and `color.primary.light`).
- **The token namespace** (FR-051) is every CSS name starting with `--token-`, compared ignoring
  case. It covers custom properties and custom media. Site files may define any other custom
  property (`--card-padding`). Defining one inside the namespace is
  `local-in-token-namespace`.
- In TypeScript the namespace is the `@cv/tokens` API. Code passes source names
  (`'color.text.primary'`), and the package builds the CSS name.

**Rationale**:

- One mapping, used by the generator, the reading functions and the check, means every rule
  about names follows from it. Lower-casing everything makes collisions impossible to miss in
  any tool.
- `--token-` reads as what it is in a stylesheet or a browser's style panel. A short prefix such
  as `--t-` saves a few characters but tells a reviewer nothing.

**Alternative considered**: *camelCase to kebab-case* (`textPrimary` → `text-primary`). It's
nicer to read, but it would make `textPrimary` and `text-primary` collide, which FR-021 doesn't
ask for. It would also make the mapping harder to state.

## R10. Derived output: generated, committed and checked for staleness

**Decision**:

- `npm run token-output` (`node tools/token-check/src/generate-output.ts`) reads both sources,
  runs every source check, and writes two files only if there are no source problems:
  - `packages/tokens/src/tokens.generated.css`: a `:root` rule holding every token of the active
    combination as a custom property, then one `@custom-media` rule per breakpoint (R11).
  - `packages/tokens/src/tokens.generated.ts`: every token's name and type, the theme groups and
    the active themes, and every combination's resolved values (FR-025, FR-054).
- Both files are committed. They start with a comment naming the command and saying not to edit
  them. The check builds both texts in memory and reports `stale-output` when a committed file
  is missing or differs by a byte (FR-005).
- **Values in CSS** are the resolved values in a form CSS accepts, converted only where Penpot's
  form isn't CSS: a unitless length gets `px`, `rotation` gets `deg`, font families become a CSS
  family list, named weights become numbers, `strike-through` becomes `line-through`, and
  `rgba(<hex>, <alpha>)` becomes `rgb(r g b / alpha)`. A color is written as resolved, so
  `#00000080` stays `#00000080` (FR-019, US2 scenario 5). The full table is in
  [contracts/token-output.md](./contracts/token-output.md#values).
- **Typography** tokens expand into one custom property per CSS property:
  - `font-family`, `font-size`, `font-weight` and `font-style` (italic, from a weight such as
    `Bold Italic`);
  - `line-height`, `letter-spacing`, `text-transform` and `text-decoration`.

  So `typography.body` gives `--token-typography-body-font-size` and the other seven. All eight
  are in the description. Only the parts the token sets are written. An unset part leaves its
  `var()` invalid, so the property falls back to its inherited value.
- **Shadows** become one custom property holding the full `box-shadow` list.
- **Order**: custom properties are sorted by code name, combinations and names by code unit. The
  files never depend on key order in the sources.

**How this meets "no other edit"**: US1 scenario 6, US2 scenario 4, US5 scenario 7, FR-002,
FR-050 and SC-003 all describe the step after an export or a motion edit as needing no *hand*
edit. FR-002, FR-050 and SC-003 say "hand edit" in so many words, and FR-005 expects derived output
kept in the repository to be reported when stale. The owner's update is one export, then
`npm run token-output`, which rewrites the generated files with no hand edit. Until it runs, the
check fails with `stale-output` and names the command. The README in `packages/tokens` gives
the steps.

**Rationale**:

- Committed output means a fresh clone type-checks, and an editor's TypeScript server sees the
  token names, with no pre-step. Neither can run an npm script first.
- Reviewers see every resolved value change in the pull request's diff, next to the export.
- It follows 002's `shape.generated.ts`, which is also committed and checked for staleness.

**Alternatives considered**:

- *Generated, git-ignored output*, made by `pretypecheck`, `pretest` and later the web build. It
  would satisfy "no other edit" literally. But a fresh clone and the editor would show every
  token import as an error until a script ran, and `stale-output` could never occur. That leaves
  part of FR-005 with nothing to test.
- *Types inferred from the JSON import*: TypeScript keeps the JSON's key names, so token names
  could be derived at the type level with no generated file. But `$type` widens to `string`, so
  the description would have no types (FR-025). Deep recursive types over the whole export would
  also slow `tsc`. CSS still needs a generated file.
- *Style Dictionary as the generator*: rejected in R7.

## R11. Breakpoints: `@custom-media`, plus a media query string

**Decision**:

- Every breakpoint token (first name part `breakpoint`) gets a custom property and a custom
  media query in the generated CSS: `@custom-media --token-breakpoint-wide (width >= 768px);`.
  Styles write `@media (--token-breakpoint-wide)`, and `@media not (--token-breakpoint-wide)`
  for below it (FR-052).
- TypeScript gets `mediaQuery('breakpoint.wide')`, returning `'(width >= 768px)'` for
  `matchMedia`.
- The check treats `(--token-…)` in a media query as a token read, which FR-026 checks against
  the breakpoint names in the description.

**Finding from research**: no browser supports `@custom-media` natively. Chrome and Safari don't
support it at all. Firefox has it from version 148, behind the pref
`layout.css.custom-media.enabled` ([BCD](https://github.com/mdn/browser-compat-data/blob/main/css/at-rules/custom-media.json),
web-features `custom-media-queries`, `baseline: false`). `var()` can't be used in a media query at
all ([css-variables-1](https://www.w3.org/TR/css-variables-1/)). So there's no native way for a
breakpoint to come from a variable.

**Constraint for the plan that adds the web app**: its CSS pipeline must replace custom media
at build time. With Lightning CSS (Vite's `css.transformer: 'lightningcss'`, or as a PostCSS
step), that takes `drafts: { customMedia: true }` plus `targets`. With PostCSS,
`postcss-custom-media` plus `@csstools/postcss-global-data`, so every file sees the generated
definitions. This feature doesn't choose a bundler. It's recorded in the plan's Structure
Decision for that plan.

**Rationale**: `@custom-media` is the standard way to name a media query, and the transforms
above are the vendor tools for it. Written this way, styles stay plain CSS and keep working once
browsers ship it.

**Alternatives considered**:

- *Breakpoints only in TypeScript*: styles would have to apply layout changes through JavaScript,
  which `/cv` can't need (Constitution VII).
- *Generating one class per breakpoint*: it replaces media queries with markup, and it can't
  express a range.
- *Container style queries with a range* (`@container style(--x > 1em)`): Chrome 142 only, and a
  container query is not a viewport breakpoint.

## R12. Reading tokens from code, and catching a wrong name

**Decision**: a name that doesn't exist fails before merge through two channels, one for each
kind of file (FR-026, FR-049):

- **TypeScript and TSX**: the reading functions take a `TokenName`, a union of every name in
  the description. `cssVar('color.text.primray')` fails `npm run typecheck` with `TS2345`,
  naming the string and the `file(line,column)`. That's the `test` job (US2 scenario 3).
- **Style sheets, and strings in code**: the check reads every `var(--token-…)` and every
  `(--token-…)` in a media query, in CSS files and in every string in component code. A name the
  description doesn't define is `unknown-token`, with its file, line and column (US2 scenario 2).
  So a hand-written `'var(--token-x)'` in a component is checked too.
- Only names are checked. A color token used as a padding passes (FR-058, US2 scenario 9).
- The check reads the description from the sources in memory, not from the generated files. A
  stale generated file can't hide an unknown name.

**Rationale**: TypeScript already reports misspelled literal arguments precisely, and CSS files
are outside its reach, so the check covers them. Reading the sources directly keeps this part
running even when the output is stale.

## R13. Which site files are searched

**Decision**:

- **Site files** are those 002's key facts search uses (002 research R9). Content-check's
  `searchFiles` walk takes a list of excluded paths instead of the one CV document path, so both
  checks share it. The token check also excludes:
  - the two token sources, `packages/tokens/penpot/tokens.json` and
    `packages/tokens/motion/tokens.json` (FR-033). The derived output is already skipped as
    generated files, and the package's tests as tests. The reading functions in
    `packages/tokens/src/index.ts` ship with the site, so they're site source and are searched
    like any component. They hold no literal value, and any other file added to the package is
    searched too;
  - image and font files by extension: `.svg`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.avif`,
    `.ico`, `.bmp`, `.woff`, `.woff2`, `.ttf`, `.otf` and `.eot`. A standalone `.svg` is text, so
    it's skipped by name, not by content (FR-033, clarification 6).

  The walk already skips binary files, tests, fixtures, specs, docs, tooling, generated files,
  third-party code and version-control data.
- **Readers**, by extension:
  - **Style sheets**: `.css`, read as in R14.
  - **Component code**: `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, `.mjs` and `.cjs`, read with
    `oxc-parser` as in R16. This is 001's "UI source", the same parser and file set.
  - **Style-carrying kinds without a reader**: `.scss`, `.sass`, `.less`, `.styl`, `.pcss`,
    `.postcss`, `.html`, `.htm`, `.vue`, `.svelte`, `.astro` and `.mdx`. Each such file is an
    `unreadable-file` ("no reader for .scss files"), so a new style format fails safe until the
    plan that adds it extends the check.
  - **Other text files** (`.json`, `.md`, `.webmanifest` and so on) hold no styles. They're
    counted in the summary as site files without styles.

**Rationale**:

- Sharing the walk means the two checks can't disagree about what "site source" is, which the
  spec's Assumptions define by reference to 002.
- 001 took the same stance on markup formats: "The plan that adds one … extends the reader."
  Reporting an unread style format instead of skipping it keeps FR-057's "no way to skip"
  true for whole file types.

**Known consequence**: a web app manifest with `theme_color` is a site file without styles, so
it isn't checked. The plan that adds it should generate it from tokens.

## R14. Style sheets: PostCSS for structure, CSSTree for values

**Decision**:

- **`postcss` 8.5.31** parses each `.css` file into rules, at-rules and declarations, with every
  node's line and column. It accepts every form of CSS nesting. On a syntax error it throws a
  `CssSyntaxError` with a line and column, reported as `unreadable-file`.
- **`css-tree` 3.2.1** parses each declaration value and each `@media`, `@container` and
  `@custom-media` prelude, with `positions: true` and `parseCustomProperty: true`, starting from
  the position PostCSS gives. Every value node then has its exact line and column. Values are
  read from the raw text, `decl.raws.value.raw` when present, because PostCSS strips comments
  from `decl.value` and offsets would drift.
- Comments never reach either tree, so values in comments are never reported (FR-032).
- **Property knowledge** comes from CSSTree's lexer. The check walks
  `lexer.getProperty(name).syntax` once per property to learn whether it accepts `<color>`,
  `<easing-function>`, `<line-width>`, `<absolute-size>`/`<relative-size>`, `<length>` and
  `<time>`. That decides whether a bare keyword such as `red` or `ease-out` is a design value
  there (R15). A property CSSTree doesn't know, and every custom property, is treated as
  accepting all of them, so nothing is missed.
- Both are pinned exactly.

**Findings from research**:

- **CSSTree alone** gives typed value nodes with positions and a grammar lexer, which nothing
  else offers. But it can't parse relaxed nesting: `.card & {}` or a nested `div {}` becomes raw
  text that swallows the declarations after it (csstree issue
  [#337](https://github.com/csstree/csstree/issues/337), open). It also treats `@custom-media`
  as unknown, so its prelude is re-parsed as a media query list. Its lexer can't match values
  containing `var()`, which is why the check walks property grammars instead.
- **PostCSS with `postcss-value-parser`** gives positions but untyped words (`#333` and `12px`
  are both "word"), and media queries as raw strings.
- **Lightning CSS** gives locations only on rules, and rewrites values (`#fff` becomes an rgb
  object, `margin` becomes four lengths), so it can't say where a value was written.

**Rationale**: each package does the part it's best at. PostCSS is the most-used CSS parser,
releases often, and is what Vite uses by default, so the site will probably depend on it anyway.
CSSTree turns values into typed nodes.

**Risks**:

- CSSTree releases slowly (3.2.0 in March 2026, after 15 months), and there's an open
  "maintenance status" issue. Its grammar comes from `mdn-data` 2.27.1. If it stops, only the
  value parsing and property knowledge need replacing. W3C's `@webref/css` can refresh the
  grammar through `fork()`.
- PostCSS stops at the first syntax error in a file. That file is reported as unreadable and
  every other file is still searched (FR-034).

**Alternative considered**: *CSSTree alone, requiring `&` before every nested selector*. It saves
a dependency, but it puts a tooling limit on how the site may write valid CSS, and an unparsed
block could hide values if the error were ever missed.

## R15. Literal design values in style values

**Decision**: the rules are fixed in [contracts/literal-values.md](./contracts/literal-values.md).
In outline, every value node in a declaration, a `var()` fallback, an `env()` fallback or a
media or container prelude is classified:

- **Length** (FR-027): a dimension in an absolute unit (`px`, `cm`, `mm`, `Q`, `in`, `pt`, `pc`)
  or a font-relative unit (`em`, `rem`, `ex`, `rex`, `cap`, `rcap`, `ch`, `rch`, `ic`, `ric`,
  `lh`, `rlh`) other than zero ([CSS Values 4](https://drafts.csswg.org/css-values-4/)). Also:
  - the `thin`, `medium`, `thick` and `hairline` keywords where a `<line-width>` is accepted;
  - the font-size keywords (`xx-small` to `xxx-large`, `larger`, `smaller`) where a font size is
    accepted. These keywords are CSS's own built-in scales (FR-030).
- **Duration**: a dimension in `s` or `ms` other than zero.
- **Color**:
  - a hex color;
  - a color function (`rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`,
    `color`), unless it derives from a token with `from`;
  - a named color (148 in CSS Color 4) or a system color (19 current, 23 deprecated), where the
    property accepts `<color>`. Named colors are CSS's built-in palette (FR-030, US3 scenario 7).
- **Easing curve**: `cubic-bezier()`, `steps()` or `linear()`, or an easing keyword (`linear`,
  `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`) where the property
  accepts `<easing-function>`.
- **Font family**: any family name or generic family in `font-family`, or in the family part of
  `font`, and the system font keywords (`caption`, `menu` and so on). One problem per
  declaration, with the whole family list as its value.
- **Shadow**: a `box-shadow`, `text-shadow` or `drop-shadow()` with any literal length or color
  inside is one problem, with the whole shadow as its value. The parts inside aren't reported
  again (spec Edge Cases).
- **Plain numbers** (FR-053): only in `stroke-width`, which treats a number as user units. CSS
  rejects a unitless length everywhere else.
- **Neutral values** (FR-029) are never reported:
  - zero in any unit, and the keywords `inherit`, `initial`, `unset`, `revert`, `currentcolor`,
    `transparent`, `none` and `auto`;
  - percentages, viewport and container units, `fr`, angles and plain numbers outside FR-053.
- **Forced colors** (FR-056): system colors are allowed inside an `@media` whose every query
  requires `(forced-colors: active)` or `(forced-colors)`, directly or through `and`, but not
  through `not` or `or`. That also covers rules nested inside one. Everything else there is
  checked as usual.
- **Not style values**: selectors, `@supports` conditions, strings, and `url()`. An `@supports`
  test such as `(color: oklch(0 0 0))` asks whether the browser understands a value and sets no
  style. No token can stand in for it, because `@supports` can't read a variable.
- **No skip markers** (FR-057): there's nothing to parse. Comments are dropped before rules run.

**Known consequence**: an `@font-face` rule names its family as a literal. Fonts are out of
scope here (spec Assumptions), so no `@font-face` exists yet. The feature that hosts fonts will
need a spec change to exempt `@font-face` descriptors, or a generated `@font-face` file.

**Rationale**: lexical forms that are always design values (a hex, a `px` length, a `ms`
duration) are reported anywhere. Bare keywords are reported only where the property's grammar
says they mean a color, a curve or a size, so `animation-name: tomato` or a `grid-area` named
`red` isn't a color. Properties the grammar doesn't know fail safe.

**Alternative considered**: *reporting named colors in every property except a hand-kept list of
"name" properties* (`animation-name`, `grid-area` and so on). That list would have to track new
CSS properties by hand. The grammar already knows them.

## R16. Component code: JSX, SVG, style APIs and constants

**Decision**: in component code, these are style values, read with `oxc-parser` (pinned at
0.155.0 by 001). The full list is in
[contracts/literal-values.md](./contracts/literal-values.md#component-code).

- **`style` props** on any JSX element: an object literal whose keys are CSS properties in
  camelCase, kebab-case or custom property form. String values are parsed as CSS values for that
  property, as in R15.
- **Numbers in `style`** (FR-053) follow React DOM's rule: React appends `px` to a non-zero
  number on any property outside its unitless list (`packages/react-dom-bindings/src/shared/isUnitlessNumber.js`
  in React 19.3.1). A custom property never gets a unit. So:
  - a number on a property that accepts a length, and isn't unitless, is a literal length;
  - a number on a property that accepts a time is a literal duration;
  - `lineHeight: 1.5`, `opacity: 0.8`, `zIndex` and `fontWeight` aren't reported.

  React matches its list by exact camelCase name, so `'line-height': 2` becomes `2px` and is
  reported.
- **SVG elements** (lowercase JSX names from SVG 2):
  - checked like any style value:
    - colors in `fill`, `stroke`, `stop-color`, `flood-color`, `lighting-color` and `color`;
    - `stroke-width`, where a plain number is a literal length;
    - `font-family`;
    - `width` and `height` on `<svg>`, the displayed size;
    - the `style` prop;
  - geometry, not checked (FR-055): every other attribute. That includes `viewBox`, `d`,
    `points`, `x`, `y`, `cx`, `cy`, `r`, `rx`, `ry`, `x1`–`y2`, `dx`, `dy`, `width` and `height`
    on shapes, `transform`, and `stroke-dasharray`/`stroke-dashoffset`, which are in drawing units.
  - Both camelCase and kebab-case attribute names count.
- **Style APIs in code**:
  - `x.style.<prop> = …` and `x.style['<prop>'] = …`;
  - `x.style.setProperty(name, value)` and `x.style.cssText = …`;
  - `x.setAttribute(name, value)` for `style` and the SVG attributes above;
  - `x.animate(keyframes, options)`, with keyframe properties as style values. The `duration`,
    `delay` and `endDelay` options are durations in milliseconds (plain numbers included), and
    `easing` is an easing curve.
- **Literal leaves**: a value is read when it's a string, a number, or a template literal, or a
  ternary, `??`, `||` or `&&` of those, through parentheses, `as` and `satisfies`. In a template
  literal with substitutions, each literal part is read on its own, so `` `${x}px` `` isn't a
  length, but `` `${x} 12px` `` reports `12px`. A value computed any other way can't be read.
- **Constants**: outside these places, a string literal whose whole text is one unambiguous
  design value is reported too: a hex color, a color function, a length with a unit, a duration,
  an easing function, or a full shadow. So `const ink = '#1a1a1a'` is caught before it reaches a
  style. Bare keywords and plain numbers outside style contexts aren't reported. `'red'` or `12`
  could mean anything there.
- **Token names in strings**: every `--token-…` in a string is either a definition (a `style`
  key, or the first argument to `setProperty`) or a read. A definition is
  `local-in-token-namespace`, and a read of an unknown name is `unknown-token` (R12).

**Choice recorded here**: the check reads JSX with React DOM's style rules, because the number
rule depends on the runtime. If the web app picks a JSX runtime with other rules, that plan
updates this list in the same pull request. No utility-class framework (such as Tailwind), CSS
preprocessor or CSS-in-JS library is used. CSS itself is the styling tool whose built-in palette
and scales FR-030 covers. A plan that adds such a tool extends the check to report its scale and
palette before the tool is used.

**Known limits**:

- A value passed to a custom component's own prop (`<Icon size={24} />`) isn't read, because the
  prop's meaning isn't known. The convention is to pass tokens.
- HTML `width` and `height` on `<img>`, `<video>`, `<canvas>` and `<iframe>` set intrinsic size
  for layout stability, not design. They aren't checked (FR-028, clarification 14). A size set
  through the element's `style` is.
- A number computed at runtime can't be traced.

**Rationale**: these are the places where component code sets a style value. Catching whole-value
constants closes the easiest way around the check, moving a literal into a variable, without
flagging ordinary strings.

## R17. Report, exit codes and determinism

**Decision**: the same conventions as 001 and 002
([002 contracts/cli.md](../002-cv-content/contracts/cli.md)):

- the report goes to stdout as plain text with `\n` endings;
- problem lines read `<file>:<line>:<column> <type> <subject>: <detail>`;
- the summary comes last, and the exit codes are 0, 1 and 2;
- the entry point is plain JavaScript and checks the Node version first, through the shared
  `nodeVersionProblem`.

Problems sort by file, line, column, type order and subject. Lists inside details (loop members,
combinations, occurrences) are in code-unit order or source order, never discovery order. The
exact text is in [contracts/cli.md](./contracts/cli.md).

**Rationale**: FR-034 to FR-037 ask for what 001 and 002 already give, and the owner reads the
three reports side by side.

## R18. No network

**Decision**: `npm run token-check` runs
`node --permission --allow-fs-read=. --allow-addons tools/token-check/src/main.js`, as 001's
check does. `--allow-addons` is needed for `oxc-parser`'s native binary. No network or write
grant is given (FR-041). Nothing in the check knows a Penpot address.

**Test**: as in 001 and 002, the check passes on a sample under these flags, and a positive control
shows `fetch` fails with `ERR_ACCESS_DENIED` under the same flags.

## R19. CI and merge blocking

**Decision**: a fourth job, `tokens`, joins `.github/workflows/ci.yml`: checkout → setup-node →
`npm ci` → `npm run token-check`. The ruleset's `required_status_checks` gains
`{ "context": "tokens", "integration_id": 15368 }`. The `test` job's `npm run typecheck` covers
the TypeScript channel of FR-026. 001's and 002's `repo-settings` tests, which match the ruleset
exactly, are updated in the same change. Applying the ruleset is a repository setting made with
`gh api` during the pull request (quickstart scenario 12).

**Rationale**: FR-039 asks for the same rules as the traceability check. A named job tells
reviewers what failed, and it runs exactly the owner's command (FR-040).

## R20. Testing

**Decision**:

- Tests live in `tools/token-check/test/` and `packages/tokens/test/`. They build samples with
  001's `makeProject` and spawn the CLI with the script's flags, as 002 does. A helper,
  `test/helpers/tokens.ts`, writes a minimal valid export and motion source, so each test states
  only what it changes.
- **Seeded samples** (SC-001), each with an `expected-report.txt` the output must equal byte for
  byte:
  - `__fixtures__/seeded/`: both sources readable, and at least one case of every problem type
    and edge case that a readable pair of sources can hold. That includes an unreadable site CSS
    file and a `.scss` file, which are `unreadable-file` problems that stop nothing. The sources
    have problems, so the derived output part doesn't run there.
  - `__fixtures__/seeded-broken/`: an export with a syntax error and a missing motion source. Every
    part needing a source is listed as not run, and the literal values search still runs
    (FR-034).
  - `__fixtures__/seeded-missing/`: a missing export and a motion source with a syntax error.
  - `__fixtures__/seeded-no-theme/`: an export with no theme at all.
  - `__fixtures__/seeded-stale/`: valid sources with a hand-edited CSS file and no TS file, for
    `stale-output`, which needs sources with no problem.

  Each source state and edge case needs its own sample where two can't share one. Across the
  five, every problem type has a non-zero count.
- `__fixtures__/two-themes/`: a sample with `light` and `dark` in `mode` and `desktop` and
  `mobile` in `shell`, all giving the same names. It passes (SC-004, US4 scenario 4).
- `__fixtures__/code/`: a `package.json` with `"type": "module"`, a `tsconfig.json` and TSX
  files that import `@cv/tokens`. Without the `package.json`, `module: nodenext` treats the TSX
  files as CommonJS, and `verbatimModuleSyntax` then rejects every `import` and `export` (TS1295,
  TS1287). A test runs the generator into a temporary copy for one-theme and two-theme samples,
  then spawns `tsc` once for each. The same unchanged code files pass against both, and a file
  reading `'color.text.primray'` fails with `TS2345` at its line and column (FR-024, FR-026,
  FR-049).
- `packages/tokens/test/tokens.test.ts` checks the real tokens:
  - every starter category is present (FR-006), and the export is in Penpot's written form (R2);
  - `color.overlay` reads back as `#00000080` (FR-019);
  - the generated files are current, and the active combination is `mode/light` and
    `motion/standard` (FR-054).
- Test titles carry only full, existing `003-design-tokens-FR-###` IDs, because the
  traceability check reads them.

## R21. Making the starter tokens in Penpot, and the round trip

**Decision**:

- The starter export tokens are created in the site's Penpot file and exported from it (FR-007).
  They can be entered in Penpot's tokens panel, or created through the Penpot plugin API (from
  2.14: `penpot.library.local.tokens`, with `addSet`, `addTheme`, `TokenSet.addToken` and
  `TokenTheme.addSet`), for example through the Penpot MCP server. Either way Penpot validates
  them, and the owner exports them with the Single file tab. Penpot has no API or CLI to export
  tokens, so the export is always a click in Penpot.
- The starter motion tokens are written by hand, as the spec's Assumptions say.
- SC-002 is checked by hand before merge (quickstart scenario 11): import `tokens.json` into an
  empty Penpot file, export it again, and compare the two after sorting keys and the
  `activeThemes` and `activeSets` arrays. Import keeps each theme's `id`, so ids match. Set
  descriptions don't survive (R3), and the starter sets have none.

**Rationale**: the plugin API makes the starter set repeatable and exact, and it still goes
through Penpot's own validation, so the export is Penpot's, not a hand-written file.
