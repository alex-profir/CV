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

| File | Change |
|------|--------|
| `assets/os-<hash>.js` | Holds the Terminal: still one file, with no import and no dynamic import. 005's check in `build-site.ts` still fails the build otherwise (005 R14) |
| `assets/os-<hash>.css` | Holds the Terminal's and the pocket terminal's styles |
| `index.html` | Unchanged in structure. The dock and the home screen gain the Terminal's item, after the CV's. The Terminal isn't pre-rendered open |
| `sw.js` | Unchanged code. Its precache list and version follow the files above, so a spec or CV change gives a new version |

No new route, page, font file or other-site request. Budget for `/`, compressed: script about
102 KB, style sheet about 12 KB, HTML about 16 KB (research R21).

## Tokens

`packages/tokens/penpot/tokens.json` gains the tokens of research R22, in the hand-written
export's form. `npm run token-output` regenerates `packages/tokens/src/tokens.generated.{css,ts}`.
`npm run token-check` passes with no exception (FR-031).

## Fonts

`src/fonts/fonts.json` gains `"advance": 0.6` on the JetBrains Mono family (research R13). The
fonts check (004) ignores the field. No font file changes.
