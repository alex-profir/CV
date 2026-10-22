# Contract: The Token Sources

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md) |
**Research**: [research.md](../research.md) (R2, R3, R4, R6, R8)

The two files every design value comes from (Constitution IV). This contract fixes their
layout, what the check accepts, and how the owner changes them.

| Source | Path | Written by |
|--------|------|------------|
| Token export | `packages/tokens/penpot/tokens.json` | Penpot's Single file export, never edited |
| Motion token source | `packages/tokens/motion/tokens.json` | the owner, by hand |

## Layout (both files)

```json
{
  "<set name>": { "<group>": { "<token>": { "$value": "…", "$type": "…", "$description": "" } } },
  "$themes": [
    {
      "id": "0d5a6c2e-8f1b-4c3a-8006-9b1e2f3a4c5d",
      "name": "light",
      "group": "mode",
      "description": "",
      "isSource": false,
      "selectedTokenSets": { "<set name>": "enabled" }
    }
  ],
  "$metadata": {
    "tokenSetOrder": ["<set name>"],
    "activeThemes": ["mode/light"],
    "activeSets": ["<set name>"]
  }
}
```

### Top level

| Key | Holds |
|-----|-------|
| any key not starting with `$` | a set. The key is the set's full name, such as `base` or `mode/light`. It's never nested |
| `$themes` | an array of themes |
| `$metadata` | an object |

Any other `$` key is `unsupported-content`. Key order carries no meaning anywhere.

### Groups and tokens

- An object with `$value` is a token. It has exactly `$value`, `$type` and `$description`
  (`""` when empty).
- Every other object is a group. A group holds groups and tokens, and no `$` keys.
- A token's name is its keys from the set down, joined by `.`. Each key is one name part, so
  `"text.primary"` as a single key is `unsupported-content`. Each part matches
  `^[A-Za-z0-9_-]+$` (FR-020).
- A reference is `{name}` with the full name. It may be the whole value, part of an arithmetic
  expression, or a field of a typography or shadow value (FR-015).

### Themes

| Field | Value |
|-------|-------|
| `id` | a non-empty string. Penpot writes a UUID |
| `name` | non-empty |
| `group` | non-empty. A theme without a group is `theme-without-group` |
| `description` | a string |
| `isSource` | `false` |
| `selectedTokenSets` | object, set name → `"enabled"`. At least one, each an existing set |

### Metadata

| Field | Value |
|-------|-------|
| `tokenSetOrder` | every set exactly once. Later sets win (FR-017) |
| `activeThemes` | `"group/name"` for exactly one theme per group (FR-054). Order carries no meaning |
| `activeSets` | as Penpot writes it. The check reads it as a list of set names, and doesn't otherwise use it |

## Token export

- **Types**: `color`, `dimension`, `spacing`, `sizing`, `borderRadius`, `borderWidth`,
  `opacity`, `rotation`, `number`, `fontFamilies`, `fontSizes`, `fontWeights`,
  `letterSpacing`, `textCase`, `textDecoration`, `typography`, `shadow`. Anything else is
  `unsupported-content` (FR-013).
- **Values**: as in [data-model.md](../data-model.md#value-rules). Lengths are `px`, `%` or
  unitless (meaning pixels). `rem` isn't something Penpot accepts.
- **Form**: exactly the bytes Penpot downloaded: two-space indent, no trailing newline.

### Updating the export (FR-002, SC-003)

1. In the site's Penpot file, change the tokens.
2. Export from the tokens panel. Keep the export dialog's **Single file** tab, the default.
   Penpot downloads `tokens.json`.
3. Save it over `packages/tokens/penpot/tokens.json`. Don't open it in an editor that adds a final
   newline.
4. Run `npm run token-output`, then `npm run token-check`.

If the check passes, commit the export and the regenerated output together. Code that reads a
removed or renamed token now fails the checks, naming each place (US2 scenario 4).

Before exporting, make sure the active themes are the ones the site should use (FR-054). Don't
switch sets on by hand, outside themes (research R3, Known limits).

## Motion token source

- **Types**: `duration` and `cubicBezier` only. A type Penpot supports, such as `color`, is
  `wrong-source` ("colors belong in Penpot"). Anything else is `unsupported-content`.
- **Duration**: a string with `ms` or `s`, zero or more: `"150ms"`, `"0.3s"`, `"0"`. Arithmetic
  and references to other durations are allowed: `"{motion.duration.base} * 2"`.
- **Cubic Bézier**: four JSON numbers `[x1, y1, x2, y2]`, with `x1` and `x2` from 0 to 1. Or a
  whole-value reference to another cubic Bézier.
- **Themes**: its own groups, such as `motion` with theme `standard`. A theme with the same group
  and name as an export theme is the same theme (FR-048), and its active theme must match.
- **References**: only to motion tokens (FR-046). A name defined in both sources is
  `duplicate-token` (FR-047).
- **Form**: two-space indent, like the export.

Example (the starter source):

```json
{
  "motion": {
    "motion": {
      "duration": {
        "fast": { "$value": "150ms", "$type": "duration", "$description": "" },
        "base": { "$value": "250ms", "$type": "duration", "$description": "" },
        "slow": { "$value": "{motion.duration.base} * 2", "$type": "duration", "$description": "" }
      },
      "easing": {
        "standard": { "$value": [0.2, 0, 0, 1], "$type": "cubicBezier", "$description": "" }
      }
    }
  },
  "$themes": [
    {
      "id": "<uuid>",
      "name": "standard",
      "group": "motion",
      "description": "",
      "isSource": false,
      "selectedTokenSets": { "motion": "enabled" }
    }
  ],
  "$metadata": {
    "tokenSetOrder": ["motion"],
    "activeThemes": ["motion/standard"],
    "activeSets": ["motion"]
  }
}
```

The first `"motion"` is the set's name and the second is the first part of each token name.

### Changing a motion value (FR-050)

1. Edit the value in `packages/tokens/motion/tokens.json`.
2. Run `npm run token-output`, then `npm run token-check`.

### Moving motion tokens into Penpot later

When Penpot supports `duration` or `cubicBezier` (issue
[#12337](https://github.com/penpot/penpot/issues/12337)), Constitution IV moves those tokens into
Penpot under the same names. Create them in Penpot, export, and delete them from the motion
source in the same change. Code doesn't change (FR-049). The spec's list of supported types
changes first (spec Assumptions).
