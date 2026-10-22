# Contract: Site Data Rules

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md) |
**Research**: [research.md](../research.md) (R4, R7, R10)

The site data document's rules live in `packages/content/schemas/site.schema.json` (FR-005).
This contract fixes the rules' format, so later features can add fields to it.

## Format

A JSON Schema, draft-07, whose root is an object. The check validates `site.json` against it
after deriving it like the CV schema (research.md, R4): every object that lists `properties`
accepts no other field (FR-017), and `format` is checked by the check's own rules.

Supported keywords. The shape generator stops with an error on anything else, so the shape test
fails before such a rule can be merged:

| Keyword | Notes |
|---------|-------|
| `$schema`, `$id`, `title`, `description`, `$comment`, `default`, `examples` | Annotations. `description` becomes the field's JSDoc |
| `type` | One of `object`, `array`, `string`, `number`, `integer`, `boolean`, `null`. A single type, not a list |
| `properties`, `required` | Fields of an object. Only `required` fields are non-optional in `SiteData` |
| `additionalProperties` | Ignored for objects with `properties` (always `false` after derivation). On an object without `properties`, a schema for the values of a map, typed `Record<string, T>`. An object with neither is rejected, because it would accept any field |
| `items` | One schema for every element |
| `enum`, `const` | Strings, numbers, booleans or null, typed as a union of literals |
| `definitions` and `$ref` to `#/definitions/<name>` | Shared parts |
| `minLength`, `maxLength`, `pattern`, `format`, `minimum`, `maximum`, `minItems`, `maxItems`, `uniqueItems` | Validation only. They don't change the type. `format` may only be `email` or `uri`, the formats the check has rules for |
| `x-cv-reference` | Marks a reference to a CV entry, see below |

## References

A field that refers to a CV entry carries `"x-cv-reference": "<kind>"`. The kinds and their
identifying fields are in [data-model.md](../data-model.md#entry-and-entry-kinds).

- For a kind with one identifying field, the field is a string:

  ```json
  "featuredProjects": {
    "type": "array",
    "items": { "type": "string", "x-cv-reference": "project" }
  }
  ```

- For a kind with several, it's an object with exactly those fields, named as in the CV:

  ```json
  "highlight": {
    "type": "object",
    "x-cv-reference": "work",
    "properties": {
      "name": { "type": "string" },
      "position": { "type": "string" },
      "startDate": { "type": "string" }
    },
    "required": ["name", "position", "startDate"]
  }
  ```

These rules file mistakes make it unreadable for the run, and the site data rules and reference
checks are listed as not run:

- an unknown kind;
- a reference schema of the wrong form for its kind: not `"type": "string"` for a kind with one
  identifying field, or not an object whose `properties` are exactly the identifying fields for
  a kind with several;
- a `format` other than `email` or `uri`.

The exact details are in [cli.md](./cli.md#details).

## Starting rules

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Site data",
  "description": "Data only the site needs. CV facts belong in resume.json.",
  "type": "object",
  "properties": {
    "$schema": { "type": "string" }
  }
}
```

and `site.json`:

```json
{
  "$schema": "./schemas/site.schema.json"
}
```

## Adding site data (for later features)

In one change (FR-005):

1. Add the field to `site.schema.json`, with `x-cv-reference` on any field that names a CV entry.
2. Add the value to `site.json`. Never copy a CV fact into it. Refer to the entry instead.
3. Run `npm run content-shape` and commit the regenerated `shape.generated.ts`.
4. Run `npm run content-check`.
