# Contract: The Requirement Data

How the build gathers the requirement data and writes it, and what 001's traceability modules
gain for it. [data-model.md](../data-model.md) gives the types.

## The reader (`packages/web/scripts/requirements/`)

| Module | Export | Contract |
|--------|--------|----------|
| `version.ts` | `readVersion(root: string): { commit: string; dirty: boolean }` | `git rev-parse HEAD` and `git status --porcelain` at `root`. Throws `can't tell which commit the site is built from (<reason>)` when Git, the repository or a commit is missing (research R8) |
| `carried.ts` | `readCarried(root: string): Carried` | Research R5. Roots: `packages/web/src/client/os.tsx` and `packages/web/src/pages/ShellPage.tsx` for the shell; each app's content root, found from `packages/web/src/apps/index.ts` and the app's `app.tsx`. Reads `data-req` with 001's `readUiFile`. Throws, naming the file, when an app's `Content` can't be traced to an import, or a file reached can't be read or parsed |
| `inline.ts` | `parseInline(text: string, context: { feature: string; specDir: string; lines: Map<string, Map<string, number>> }): Inline[]` | Research R7. `lines` maps a feature to its active requirements' lines, for references. Pure |
| `read.ts` | `readRequirementData(root: string, version, carried): RequirementData` | Research R6. Pure apart from reading files under `root`. Throws on the build failures of data-model.md's validation rules |
| `index.ts` | `buildRequirementData(root: string): RequirementData` | `readVersion`, `readCarried`, then `readRequirementData`. What the build and the site check call |

All paths in the result are repository-relative, with `/`. The result is deterministic: the same
files and commit give byte-identical JSON (sorted keys in `requirements` by full ID, `views` keys
`shell` first, then apps in `APPS` order).

## Changes to 001 (`tools/traceability/src/`)

Additive only. `npm run traceability`'s behavior, output and exit codes don't change, and every
existing 001 test passes unchanged.

| File | Change |
|------|--------|
| `specs.ts` | New `specTitle(text: string): string \| null`: the first heading's text after `Feature Specification: `. New `requirementText(text: string, entry: RequirementEntry): string`: the entry's line from after its `**FR-###**:` (or `**FR-###**` and `:`), plus each following line that is indented and isn't a new list item, heading or blank line, trimmed and joined with single spaces. Both use the same comment and fence blanking as `parseSpec` |
| `test-files.ts` | `TestNode` gains `title: string` (the title argument's literal parts in order, with each substitution as its source text, such as `${shell}`; empty when the title isn't a literal) and `location: Location` (the call's start). New `coveringTests(nodes: TestNode[]): { node: TestNode; tokens: Token[] }[]`: each counting test, by `coverageOf`'s rule, with its effective tokens |

## The build (`packages/web/scripts/build-site.ts`)

After the client build and before rendering the pages:

1. `buildRequirementData(repositoryRoot)`, where the repository root is two levels above
   `packages/web`.
2. `JSON.stringify(data)`, written to `<out>/site/assets/requirements-<hash>.json`, `<hash>` being
   the first 8 hex characters of the text's SHA-256.
3. Its path, `/assets/requirements-<hash>.json`, passed to `renderShell` as `assets.requirements`.

The file is a served file like any other: it is in `site-manifest.json`, in the service worker's
precache list, and in its version hash (004 R4). `.json` is already a served type.

Failures print `site build failed: <message>` and exit 2, as every build failure does (004):

```text
site build failed: can't tell which commit the site is built from (not a git repository)
site build failed: packages/web/src/apps/cv/app.tsx: can't find the module the app's Content comes from
site build failed: the cv view lists 004-cv-page-FR-099, which no spec defines
```

## The browser (`packages/web/src/inspector/data.ts`)

| Export | Contract |
|--------|----------|
| `startLoading(): void` | Called once by `Os` when the shell is ready. Reads `#os`'s `data-requirements` and starts `fetch(url, { priority: 'low' })`. Does nothing when the attribute is missing or loading has started |
| `useRequirements(): RequirementsState` | The loader's state (data-model.md), through `useSyncExternalStore` |
| `retry(): void` | Called by "Show specs" when the state is `failed` |

The file's contents are trusted only as data: every string is rendered as text, and every `href`
is built by `src/format/repository.ts` from `siteData.repository`, the commit and a path, or is an
`http`/`https` address from a spec (research R7).

## Links (`packages/web/src/format/repository.ts`)

| Export | Gives |
|--------|-------|
| `fileUrl(repository, commit, path, line?)` | `{repository}/blob/{commit}/{path}`, with `?plain=1#L{line}` for a `.md` file and `#L{line}` for others when `line` is given |
| `commitUrl(repository, commit)` | `{repository}/commit/{commit}` |
| `shortCommit(commit)` | Its first 7 characters |

`repository` loses a trailing `/` first. Tests cover each form and a repository with and without
the slash.
