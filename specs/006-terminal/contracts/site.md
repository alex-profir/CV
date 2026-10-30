# Contract: Build and Output, Changes from 005

004's and 005's [contracts/site.md](../../005-os-shell/contracts/site.md) still hold: the command
(`npm run build`), the output layout, the route table, the service worker and the root page. This
file lists what 006 adds.

## The spec list

- `packages/web/scripts/spec-list.ts` exports `readSpecList(root: string): SpecList` (data-model.md
  Spec list). It reads `specs/*/spec.md` under `root` with 001's `parseSpec`, `requirementsOf` and
  `specFeature`. It returns entries in numbered order, with the status and the count of active
  requirements exactly as `npm run traceability` reads them.
- `specListPlugin()` in the same file is a Vite plugin. It resolves `virtual:cv-spec-list` to
  `export default <JSON of readSpecList(repository root)>` and adds every `spec.md` it read to
  the build's watch list. `vite.config.ts` and `vitest.config.ts` both register it.
- `src/apps/terminal/data.ts` is the only module that imports `virtual:cv-spec-list`. A
  `virtual-modules.d.ts` declares its type for `tsc`.
- The build fails with `site build failed: the spec list is empty` if `readSpecList` finds no spec.
  An empty list would mean the build ran from the wrong root.

## Output

> **Amended 2026-10-29** (research R34, R35, R40). The `os` script no longer holds everything the
> Terminal runs: the shell is a second script, loaded when the Terminal first opens (FR-070).

| File | Change |
|------|--------|
| `assets/os-<hash>.js` | Holds the Terminal's interface, still one file with no import and no dynamic import. It creates the shell worker with `new Worker(new URL(…), { type: 'module' })` and loads nothing else. Gzipped, within 5% of its size before the amendment (SC-013) |
| `assets/shell-<hash>.js` | New: the shell worker, one file with no import, about 1.34 MB, 368 KB gzip, 295 KB Brotli as built (just-bash alone: 1.26 MB, 343 KB, 274 KB). Loaded only when the Terminal first opens. Starts with a comment naming the license file |
| `assets/shell-licenses-<hash>.txt` | New: the name, version and license text of every package the worker bundles (research R40) |
| `assets/os-<hash>.css` | Holds the Terminal's and the pocket terminal's styles |
| `index.html` | Unchanged in structure. The dock and the home screen gain the Terminal's item, after the CV's. The Terminal isn't pre-rendered open. No preload of the shell |
| `sw.js` | Its precache list and version follow the files above, so the worker is stored after one visit (FR-070). Its code changes as below |

`build-site.ts` fails the build when the `os` entry imports anything (as today), when the worker
isn't exactly one file with no import, or when the `os` script's gzipped size passes its budget:
113,581 bytes (gzip -9, `main` before the amendment, re-measured at `a3f9532` when 007 was merged; T127 measured 108,962 before 007) plus 5%, `OS_BUDGET = 119_260` (research R34).
The license file and the worker's header comment are written by the worker build's
`scripts/shell-licenses.ts` plugin.

No new route, page or font file, and no other-site request. Budget for `/`, compressed: script
about 115 KB as built with 007 merged, within 5% of its 113,581 bytes (gzip -9) before the amendment; style sheet
about 12 KB and HTML about 16 KB, unchanged by the shell (SC-005, SC-013).

## Service worker (research R35, added 2026-10-29)

- `activate` deletes older caches only when no window client is open. Otherwise it keeps them,
  and records in its own cache, under `/__cv/kept`, each kept cache's name and the ids of the
  clients open at activation.
- `fetch` answers a request under `/assets/` from the current cache, then from a kept cache, then
  from the network.
- On `fetch`, `message` and `activate`, a kept cache is deleted once none of its recorded clients
  is open, and the record with it.
- Every cache is still one complete version (004 FR-039), and a new version still reloads nothing
  (005 FR-053).

## Tokens

`packages/tokens/penpot/tokens.json` gains the tokens of research R22, in the hand-written
export's form. The 2026-10-29 amendment adds research R42's, and the 2026-10-30 amendment
`color.vim-warning` (`{color.base.amber}`, research R52). `npm run token-output` regenerates `packages/tokens/src/tokens.generated.{css,ts}`.
`npm run token-check` passes with no exception (FR-031).

## Fonts

`src/fonts/fonts.json` gains `"advance": 0.6` on the JetBrains Mono family (research R13). The
fonts check (004) ignores the field. No font file changes.
