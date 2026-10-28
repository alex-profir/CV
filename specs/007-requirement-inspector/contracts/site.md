# Contract: Build and Output, Changes from 006

004's, 005's and 006's contracts/site.md still hold: the command (`npm run build`), the output
layout, the route table, the service worker and the root page. This file lists what 007 adds.

## Output

| File | Change |
|------|--------|
| `assets/requirements-<hash>.json` | New: the requirement data ([requirement-data.md](./requirement-data.md)). Served as `application/json`, precached, in the version hash |
| `assets/os-<hash>.js` | Holds the inspector's code: still one file, with no import and no dynamic import (005 R14). It holds no requirement text (FR-015) |
| `assets/os-<hash>.css` | Holds the inspector's styles |
| `index.html` | `#os` gains `data-requirements="/assets/requirements-<hash>.json"`. Each pre-rendered window's title bar holds "Show specs". Nothing else |
| `cv.html`, `404.html` | Unchanged (FR-025) |
| `sw.js` | Unchanged code. Its precache list and version follow the files above, so a change to any spec, test or `data-req` gives a new version |

No new route, page, font file or other-site request (FR-028). Budget for `/`, compressed: script
about 108 KB, style sheet about 14 KB, HTML about 16 KB, and the data file about 20 KB fetched
after the shell is ready (research R16).

## Build inputs

The build now reads, besides `packages/`: every `specs/*/spec.md`, every test file 001 reads, and
Git's view of the repository (research R8). A build outside a Git repository, or in one with no
commit, fails.

## Tokens

`packages/tokens/penpot/tokens.json` gains, in the hand-written export's form (research R13):
`color.shell-text-soft`, `color.status-approved`, `color.status-draft`, `size.spec-bar-touch`,
`size.spec-id-column`, `size.spec-measure`, `breakpoint.spec-two-column`, `breakpoint.spec-wide`.
`npm run token-output` regenerates `packages/tokens/src/tokens.generated.{css,ts}`.
`npm run token-check` passes with no exception (FR-021). The design README records the two
renames in a `docs:` commit before code.

## Tests that build a copy

`packages/web/test/helpers/copy.ts`'s `repoCopy` also copies `specs/` and `tools/*/test`, and makes
the copy a Git repository with one commit (fixed author, date and message), so the copy builds
clean. A helper, `dirty(root)`, writes an untracked file for tests of the uncommitted-changes note.
