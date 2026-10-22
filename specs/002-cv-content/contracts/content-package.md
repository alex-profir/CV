# Contract: The `@cv/content` Package

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md) |
**Research**: [research.md](../research.md) (R1, R10)

Every later feature reads CV data through this package and nowhere else (Constitution IV). This
contract fixes what they can rely on.

## Import

```ts
import { resume, siteData } from '@cv/content';
import type { Resume, SiteData, ResumeWork } from '@cv/content';
```

| Export | Kind | What it is |
|--------|------|------------|
| `resume` | value, type `Resume` | The CV document, `packages/content/resume.json` |
| `siteData` | value, type `SiteData` | The site data document, `packages/content/site.json` |
| `Resume`, `SiteData` | types | The shape description of each document (FR-026) |
| `Resume*`, `SiteData*` | types | One named type per object in the shape, e.g. `ResumeBasics`, `ResumeLocation`, `ResumeProfile`, `ResumeWork`, `ResumeProject` |

The package is an npm workspace, linked by `npm ci`. Its `package.json` declares
`"type": "module"` and `"exports": { ".": "./src/index.ts" }`. It has no dependencies.

## Guarantees

1. **Every CV field may be absent** (FR-026, clarification 2). Every property of every `Resume*`
   type is optional, `basics.name` included. Code must handle absence:

   ```ts
   const name = resume.basics?.name ?? '';                 // passes
   const shout = resume.basics?.name.toUpperCase();        // fails: possibly undefined
   const job = resume.work?.[0];
   const year = job?.endDate.slice(0, 4);                  // fails: 'job.endDate' is possibly undefined
   ```

   `resume.work?.[0]?.endDate.slice(0, 4)` fails too, but TypeScript 7 reports it as
   `Object is possibly 'undefined'`, at `resume`, without naming the field.

   An assignment such as `const end: string = resume.work?.[0]?.endDate` fails too, but its
   message only says `string | undefined` isn't assignable to `string`, without naming the field.

2. **Undefined fields don't exist** (FR-027). No type has an index signature. Reading a field the
   rules don't define is a type error that names the field and the location:

   ```text
   src/x.ts(3,30): error TS2339: Property 'nickname' does not exist on type 'ResumeBasics'.
   ```

3. **Site data fields follow the rules.** A field listed in the rules' `required` is present in
   `SiteData`. All others are optional. A field the rules add appears in the types once
   `npm run content-shape` regenerates them, with no hand-written type to update (US4
   scenario 5).

4. **The types match the rules** (FR-026). `packages/content/src/shape.generated.ts` is
   generated from the same derived schemas the check validates with. The `test` job fails when
   the committed file differs from a fresh generation.

5. **The values match the types.** `index.ts` assigns the imported JSON to `Resume` and
   `SiteData`, so `npm run typecheck` checks the assignment, and `npm run content-check` checks
   the documents against the full rules.

6. **Text is exact** (FR-020). Values are what `JSON.parse` returns from the file. Nothing is
   trimmed, normalized or reordered.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run content-check` | Checks both documents and searches for hardcoded key facts ([cli.md](./cli.md)) |
| `npm run content-shape` | Regenerates `shape.generated.ts` from the official JSON Resume 1.3.1 schema and the site data rules. The only command in this feature that writes a file |
| `npm run typecheck` | Fails on code that reads undefined fields or ignores possible absence (FR-027) |

## Generated file

`shape.generated.ts` starts with a comment saying it's generated, by which command, and from
which files. Its output is deterministic: properties in schema order, descriptions from the
schema as JSDoc comments, two-space indentation, `\n` line endings. It's excluded from the key
facts search as a generated file (FR-024).
