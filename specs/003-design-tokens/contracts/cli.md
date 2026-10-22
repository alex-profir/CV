# Contract: Token Check Command and Report

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

The owner runs these commands locally, and the pull-request workflow runs the check
([ci.md](./ci.md)). It follows 002's [cli.md](../../002-cv-content/contracts/cli.md) wherever
that applies.

## Commands

```sh
npm run token-check     # the check
npm run token-output    # regenerate the derived output
```

### `npm run token-check`

- Run from the repository root. Reads files under the current directory and nothing else.
- Takes no arguments. Any argument is a usage error (exit code 2).
- Makes no network requests and never contacts Penpot (FR-041). Writes nothing.

Behind the script:

```sh
node --permission --allow-fs-read=. --allow-addons tools/token-check/src/main.js
```

No network or write grant is given. `--allow-addons` loads `oxc-parser`'s native binary (research
R18).

The fixed paths, relative to the root:

| What | Path |
|------|------|
| Token export | `packages/tokens/penpot/tokens.json` |
| Motion token source | `packages/tokens/motion/tokens.json` |
| Derived output | `packages/tokens/src/tokens.generated.css`, `packages/tokens/src/tokens.generated.ts` |

### `npm run token-output`

```sh
node tools/token-check/src/generate-output.ts
```

- Runs the source checks first: export rules, motion rules and cross-source rules. If any of
  them reports a problem, it prints the report, writes nothing, and exits 1.
- Otherwise it writes both generated files and exits 0. It prints one line per file:
  `wrote <path>` or `unchanged <path>`.

## Exit codes

| Code | Meaning |
|------|---------|
| `0` | Pass: no problems |
| `1` | Fail: at least one problem was reported (FR-038) |
| `2` | The check couldn't run: an argument was given, Node is older than 26, a dependency isn't installed (run `npm ci`), or an internal error. The message goes to stderr |

## Output streams

- The report goes to **stdout**, and only the report.
- **stderr** carries only these, each followed by `\n`:
  - `usage: npm run token-check (takes no arguments)`;
  - `token check needs Node 26 or later (see .nvmrc) to block network access, but this is Node <version>`;
  - `token check could not start: <message>`;
  - `token check could not run: <message>`.
- Tests compare the report from `npm run --silent token-check`.

## Report format

Plain text, UTF-8, `\n` line endings. One line per problem, sorted by file, line, column, type
(in the data model's order) and subject. Then one empty line, then the summary. With no
problems, the report starts at the summary. It ends with a single `\n`.

### Problem line

```text
<file>:<line>:<column> <type> <subject>: <detail>
```

| Subject | Used for |
|---------|----------|
| a token name: `color.text.primary` | token problems |
| `set "<name>"` | set problems |
| `theme "<group>/<name>"` | theme problems. `theme "/<name>"` for a theme without a group |
| `group "<name>"` | `invalid-active-themes` |
| `$themes`, `$metadata`, `$metadata.tokenSetOrder` and similar | structure problems |
| a CSS name: `--token-color-text-primray` | `unknown-token`, `local-in-token-namespace` |
| a kind: `color`, `length`, `font-family`, `shadow`, `duration`, `easing` | `literal-value` |
| the file path | `missing-file`, `unreadable-file`, `stale-output` |

Values in details are written with `JSON.stringify`. Combinations are written
`mode/light + motion/standard`. Lists are joined by `, `.

Problem lines by type (paths and values are examples):

```text
packages/tokens/penpot/tokens.json:14:7 unreadable-file packages/tokens/penpot/tokens.json: invalid JSON: comma expected
packages/tokens/motion/tokens.json:1:1 missing-file packages/tokens/motion/tokens.json: file not found
packages/tokens/penpot/tokens.json:40:19 unsupported-content motion.duration.fast: Penpot doesn't support the type "duration"; durations and easing curves go in the motion token source
packages/tokens/penpot/tokens.json:52:9 unsupported-content color.brand: Penpot doesn't write "$extensions" in a token
packages/tokens/penpot/tokens.json:30:20 invalid-value color.text.muted: "16px" is not a color (#hex, rgb(), rgba(), hsl(), hsla() or a named color)
packages/tokens/penpot/tokens.json:61:20 invalid-value space.lg: "1.5rem" is not a length Penpot accepts (a number, optionally with px or %)
packages/tokens/motion/tokens.json:18:20 invalid-value motion.easing.bounce: [1.5,0,0,1] is not a cubic Bézier: the first and third numbers must be from 0 to 1
packages/tokens/penpot/tokens.json:22:20 missing-reference color.text.primary: refers to "color.base.ink", which no enabled set defines in mode/light
packages/tokens/penpot/tokens.json:70:20 reference-loop space.a: references form a loop: space.a, space.b, space.a
packages/tokens/motion/tokens.json:12:20 cross-source-reference motion.duration.slow: refers to "space.4", which is in the token export; motion tokens may refer only to motion tokens
packages/tokens/penpot/tokens.json:90:5 missing-set theme "mode/dark": enables set "brand-dark", which the export doesn't contain
packages/tokens/penpot/tokens.json:3:3 unused-set set "drafts": no theme enables it, so code can never read its tokens
packages/tokens/penpot/tokens.json:95:5 theme-without-sets theme "mode/hc": enables no set
packages/tokens/penpot/tokens.json:100:5 theme-without-group theme "/print": has no theme group
packages/tokens/penpot/tokens.json:120:21 invalid-active-themes group "mode": needs exactly one active theme, found 2: mode/dark, mode/light
packages/tokens/penpot/tokens.json:44:9 duplicate-token color.accent: defined 2 times in set "base": 44:9, 51:9
packages/tokens/motion/tokens.json:5:9 duplicate-token motion.duration.fast: defined in both the token export (packages/tokens/penpot/tokens.json:80:13) and the motion token source
packages/tokens/motion/tokens.json:9:9 wrong-source color.flash: a color token belongs in Penpot; the motion token source holds only durations and easing curves
packages/tokens/penpot/tokens.json:33:20 conflicting-types color.accent: is a color in set "base" and a number in set "brand", both enabled in mode/light
packages/tokens/penpot/tokens.json:12:9 unusable-name color.text.primary$: name part "primary$" may hold only ASCII letters, digits, hyphens and underscores
packages/tokens/penpot/tokens.json:15:9 name-collision space.1-5: code would read these names the same, as --token-space-1-5: space.1-5, space.1.5
packages/tokens/penpot/tokens.json:18:9 token-used-as-group color.primary: is a token and also a group of color.primary.light
packages/tokens/penpot/tokens.json:22:20 theme-mismatch color.text.primary: missing in mode/dark + motion/standard
packages/tokens/penpot/tokens.json:25:20 theme-mismatch color.surface: is a color in mode/light + motion/standard and a number in mode/dark + motion/standard
packages/tokens/src/tokens.generated.css:1:1 stale-output packages/tokens/src/tokens.generated.css: doesn't match the token sources; run npm run token-output
packages/web/src/card.css:3:10 unknown-token --token-color-text-primray: no token has this name
packages/web/src/card.css:9:8 local-in-token-namespace --token-card-gap: --token- names are reserved for tokens; use another name for a local variable
packages/web/src/card.css:4:12 literal-value length: "12px" is written out; use a token
packages/web/src/card.css:7:41 literal-value color: "#000000" is written out as the fallback of a token; remove it or use a token
packages/web/src/card.tsx:8:30 literal-value duration: 300 is a duration written out; use a token
packages/web/src/app.scss:1:1 unreadable-file packages/web/src/app.scss: no reader for .scss files; the token check must support this file type before it can be used
packages/web/src/broken.css:5:3 unreadable-file packages/web/src/broken.css: cannot be parsed: Unclosed block
```

### Details

`<v>` is a value written with `JSON.stringify`. `<combos>` is a list of combinations.

| Type | Situation | Detail |
|------|-----------|--------|
| `unreadable-file` | a token source, as 002's `unreadable-document` | `cannot be read: <code>`, `not valid UTF-8`, `starts with a byte order mark`, `invalid JSON: <reason>` |
| | a site file PostCSS, CSSTree or `oxc-parser` can't parse | `cannot be parsed: <parser message>` |
| | a style format without a reader | `no reader for .<ext> files; the token check must support this file type before it can be used` |
| | a directory or file that can't be read | `cannot be read: <code>` |
| `missing-file` | | `file not found` |
| `unsupported-content` | unknown or unsupported type | `Penpot doesn't support the type <v>`, plus `; durations and easing curves go in the motion token source` for `duration` and `cubicBezier` |
| | an unexpected key | `Penpot doesn't write <v> in <a token \| a group \| a theme \| $metadata \| the top level \| a typography value \| a shadow>` |
| | a missing field | `Penpot always writes <v> in <…>` |
| | a dotted key | `Penpot writes each name part as its own key, not <v>` |
| | a value of the wrong JSON kind | `Penpot writes <field> as <a string \| an array \| …>` |
| | `tokenSetOrder` not listing every set exactly once | `must list every set exactly once; <set list> <missing \| repeated>` |
| | `selectedTokenSets` value other than `"enabled"` | `Penpot writes only "enabled" here` |
| `invalid-value` | | `<v> is not <a color \| a length Penpot accepts \| …> (<accepted forms>)`, `<v> is negative`, `arithmetic <v> mixes units`, `<v> is not a cubic Bézier: …`, `a breakpoint needs a length in px` |
| `missing-reference` | | `refers to <v>, which no enabled set defines in <combos>` |
| `reference-loop` | at the first name's value | `references form a loop: <names>, <first name>` |
| `cross-source-reference` | from the export | `refers to <v>, which is in the motion token source; tokens in the export may not refer to motion tokens` |
| | from the motion source | `refers to <v>, which is in the token export; motion tokens may refer only to motion tokens` |
| `missing-set` | | `enables set <v>, which the <export \| motion token source> doesn't contain` |
| `unused-set` | | `no theme enables it, so code can never read its tokens` |
| `theme-without-sets` | a theme | `enables no set` |
| | no theme at all, at `$themes` | `the <export \| motion token source> has no theme; at least one theme with at least one set is needed` |
| `theme-without-group` | | `has no theme group` |
| `invalid-active-themes` | none or several | `needs exactly one active theme, found <n>[: <themes>]` |
| | an entry naming no theme | `activeThemes lists <v>, which is not a theme` |
| | differs between sources | `the active theme is <a> in the export and <b> in the motion token source` |
| `duplicate-token` | in one set | `defined <n> times in set <v>: <line:column list>` |
| | in both sources | `defined in both the token export (<file:line:column>) and the motion token source` |
| `wrong-source` | | `a <type> token belongs in Penpot; the motion token source holds only durations and easing curves` |
| `conflicting-types` | | `is <a type> in set <v> and <a type> in set <v>, both enabled in <combos>` |
| `unusable-name` | | `name part <v> may hold only ASCII letters, digits, hyphens and underscores`, or `has an empty name part` |
| `name-collision` | at the first name in code-unit order | `code would read these names the same, as <code name>: <names>` |
| `token-used-as-group` | | `is a token and also a group of <first longer name>` |
| `theme-mismatch` | missing | `missing in <combos>` |
| | type differs | `is <a type> in <combos> and <a type> in <combos>` |
| `stale-output` | | `doesn't match the token sources; run npm run token-output`, or `is missing; run npm run token-output` |
| `unknown-token` | | `no token has this name`, or `no breakpoint token has this name` in a media query |
| `local-in-token-namespace` | | `--token- names are reserved for tokens; use another name for a local variable` |
| `literal-value` | | `<v> is written out; use a token`, `<v> is written out as the fallback of a token; remove it or use a token`, or, for a plain number, `<n> is a <length \| duration> written out; use a token` |

Type names in details use the source's own spelling, with an article: `a color`, `a
fontFamilies`, `a borderRadius`.

### Summary

Always printed (FR-036). Every problem type is listed, including zeros, in the data model's
order.

Passing run:

```text
Summary
  Token export:                 packages/tokens/penpot/tokens.json (checked): 2 sets, 1 theme, 24 tokens
  Motion token source:          packages/tokens/motion/tokens.json (checked): 1 set, 1 theme, 4 tokens
  Active themes:                mode/light + motion/standard
  Derived output:               current
  Site files searched:          2
  Site files without styles:    5
  Checks not run:               none
  Problems:                     0
    unreadable-file             0
    missing-file                0
    unsupported-content         0
    invalid-value               0
    missing-reference           0
    reference-loop              0
    cross-source-reference      0
    missing-set                 0
    unused-set                  0
    theme-without-sets          0
    theme-without-group         0
    invalid-active-themes       0
    duplicate-token             0
    wrong-source                0
    conflicting-types           0
    unusable-name               0
    name-collision              0
    token-used-as-group         0
    theme-mismatch              0
    stale-output                0
    unknown-token               0
    local-in-token-namespace    0
    literal-value               0

PASS: both token sources are valid and no literal design values were found.
```

Failing run where the export can't be read:

```text
Summary
  Token export:                 packages/tokens/penpot/tokens.json (unreadable)
  Motion token source:          packages/tokens/motion/tokens.json (checked): 1 set, 1 theme, 4 tokens
  Active themes:                not known
  Derived output:               not checked
  Site files searched:          2
  Site files without styles:    5
  Checks not run:               export rules, cross-source rules, derived output, token names in site files
  Problems:                     1
    unreadable-file             1
    ...

FAIL: 1 problem found. Some checks could not run.
```

- A source's state is `checked`, `missing` or `unreadable`. Counts follow only when it's
  `checked`. Counts are singular for 1 (`1 set`, `1 theme`, `1 token`).
- "Derived output" is `current`, `stale` or `not checked`.
- "Checks not run" names the parts from the data model, in its order, or `none`.
- The result line is `FAIL: N problems found.` (`1 problem`), with ` Some checks could not run.`
  appended when any part didn't run.

## Stability guarantees

- The same files give byte-identical stdout and the same exit code, on any machine, with or
  without a network (FR-037, FR-040, FR-041, SC-005).
- The output never contains absolute paths, timestamps, durations, colors or anything else that
  depends on the machine, locale or terminal.
- The problem-line grammar and type names are stable.
