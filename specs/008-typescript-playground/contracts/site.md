# Contract: Build and Output Changes

What 008 changes in `npm run build`, the served files and the service worker. 004's to 007's
contracts/site.md hold for everything not listed.

## The build (`packages/web/scripts/build-site.ts`)

Steps, with 008's in bold:

1. Fonts checked against the font tokens.
2. **The engine build** (research R3): a Vite build of `src/apps/playground/engine/engine.ts` with
   `base: './'`, its workers through `?worker`, the runner's bootstrap and runtime bundled to text
   first (R18), into a temporary folder; every file hashed; the folder moved to
   `<site>/playground/<engine-hash>/` with `files.json`. TypeScript's version is read from the
   bundled `typescriptServices.js` for the manifest. Fails with `site build failed: <message>`
   when a file has no content type or the bootstrap's hash doesn't match the policy.
3. The client build, unchanged but for **`scripts/cv-types.ts`**, a Vite plugin that serves the
   CV declaration file (R10) to the Playground's interface as `virtual:cv-types`.
4. The SSR build and the routes: **`renderShell` gets `assets.playground`** (the manifest's path
   and total bytes) and writes `data-playground` and `data-playground-bytes` on `#os`.
5. The service worker (below).
6. The site manifest: lists every served file, the engine's included.

## Served files

| Change | Contract |
|--------|----------|
| `/playground/<engine-hash>/…` | New: the engine's files (contracts/engine.md). Immutable: a new engine is a new folder |
| Content types | `.ttf` → `font/ttf` added, for the icon font only |
| `/` | `#os` gains the two data attributes; nothing else in the first load changes (FR-009) |
| `/cv`, the not-found page | Unchanged |

## The service worker (`src/sw/service-worker.ts`)

| Change | Contract |
|--------|----------|
| Precache | Every served file **but** those under `/playground/`, so a visit stores no TypeScript (FR-009, SC-009) |
| Fetch | A `GET` under `/playground/` is answered by `caches.match(request)` over every cache, else the network. Everything else as before |
| Activate | Unchanged: deletes `cv-` caches but its own; `playground-*` caches are the loader's to delete (R4, FR-013) |
| `VERSION` | Still a hash over the precached files and the worker's code; a new engine changes the shell page (its `data-playground`), and so the version |

## Tokens (`packages/tokens/penpot/tokens.json`)

The design README's proposed tokens, written by hand in Penpot's export form under the interim
provision, then `npm run token-output` (R22): the code colors (`color.code.*`), the Playground's
colors (`color.playground.*`), the icon's (`color.icon-playground.*`), the two new base washes,
the sizes (`size.playground.*`, `size.code-line`, `font-size.code` unless 006's already hold
them) and `typography.code`. `npm run token-check` passes with no exception added (FR-068).

## Dependencies (`packages/web/package.json`)

| Package | Version | Kind |
|---------|---------|------|
| `monaco-editor` | `0.57.0`, exact | dependency (R1) |

Nothing else. Compression, hashing, clipboard and sharing are the browser's (R16).
