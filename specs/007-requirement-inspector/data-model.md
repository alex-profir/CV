# Data Model: The Requirement Inspector

Phase 1 of [plan.md](./plan.md). The entities of the spec's Key Entities, as the code holds them.
Types are TypeScript, as in 005's and 006's data models.

## Requirement data (built)

What the build gathers (spec: Requirement data, Requirement record, Test reference, App's
requirements). It is written to `assets/requirements-<hash>.json` and is the only thing the spec
view reads from the repository. [contracts/requirement-data.md](./contracts/requirement-data.md)
sets the file and the reader.

```ts
type RequirementData = {
  // The version the site was built from (FR-010, FR-014).
  version: { commit: string; dirty: boolean };
  // Every spec that at least one view lists a requirement of, in numbered order.
  specs: SpecRecord[];
  // Every requirement any view lists, by full ID.
  requirements: Record<string, RequirementRecord>;
  // What each view carries: 'shell' for About this site's view, then each app by its id.
  // Full IDs, sorted by spec number, then ID.
  views: Record<string, string[]>;
};

type SpecRecord = {
  feature: string;        // '004-cv-page'
  number: string;         // '004'
  title: string;          // 'The /cv Page'
  status: 'Approved' | 'Draft';
  file: string;           // 'specs/004-cv-page/spec.md'
  active: number;         // active requirements in the spec (removed ones not counted)
};

type RequirementRecord = {
  fullId: string;         // '004-cv-page-FR-001'
  feature: string;        // '004-cv-page'
  id: string;             // 'FR-001'
  line: number;           // the line its entry starts on, in SpecRecord.file
  text: Inline[];         // its text, parsed (R7)
  tests: TestReference[]; // in file order, then line order
};

type TestReference = {
  name: string;           // the test's own title, as written
  file: string;           // 'packages/web/test/content.test.tsx'
  line: number;
};
```

### Inline

A requirement's text as a tree, never markup (research R7).

```ts
type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'strong' | 'em' | 's'; children: Inline[] }
  | { kind: 'link'; href: string; children: Inline[] }        // http or https only
  | { kind: 'file'; path: string; children: Inline[] }        // a repository path, from the root
  | { kind: 'ref'; feature: string; id: string; line: number; text: string };
```

`ref.text` is the reference as written (`005 FR-013`, `FR-011`). `ref.line` is the referenced
requirement's line, so the link needs no lookup.

### Validation rules

| Rule | Source |
|------|--------|
| Every ID in `views` has a record in `requirements`, and every record is in at least one view | FR-006, FR-012 |
| Every record's `feature` has a `SpecRecord` | FR-006 |
| Only active requirements of specs with a valid Status have records; a removed requirement has none | 001 FR-017, spec Edge Cases |
| `views[app]` holds each ID once, sorted by spec number then ID | FR-006 |
| `views.shell` and each app's list are what research R5's walker reads, and nothing else | FR-006, FR-011 |
| A record's `tests` are exactly 001's counting tests that reference its full ID | FR-008 |
| `active - (listed in a view)` is the count the view's group shows | FR-006 |
| Every `file` is a repository-relative path with `/` separators; nothing else from the machine (no absolute path, user name or environment value) | FR-014 |
| The build fails if two specs share a number, if a view holds an ID with no active requirement, or if the commit can't be read | FR-010, FR-013 |

The last two can't happen in a mergeable pull request, because the traceability check (001)
rejects unknown and removed references first (spec Edge Cases). The build checks anyway, so a
local build never shows a broken view.

### Where each part comes from

| Field | Read from | With |
|-------|-----------|------|
| `version` | Git, at the repository root | `scripts/requirements/version.ts` (R8) |
| `SpecRecord` number, title, status, file | `specs/*/spec.md` | 006's `readSpecList` (R1) |
| `SpecRecord.active`, `RequirementRecord` ID, line | `specs/*/spec.md` | 001's `parseSpec`, `requirementsOf` (R6) |
| `RequirementRecord.text` | the requirement's lines | 001's new `requirementText`, then `scripts/requirements/inline.ts` (R6, R7) |
| `RequirementRecord.tests` | every test file 001 reads | 001's `readTestFile` with `TestNode.title` and `location`, and `coverageOf`'s rule (R6) |
| `views` | `packages/web/src` | `scripts/requirements/carried.ts`, with 001's `readUiFile` (R5) |

## Carried requirements (built, not shipped)

The walker's result, before records are made. Tests read it.

```ts
type Carried = {
  // Each view's IDs, unsorted, as found.
  views: Map<string, Set<string>>;          // 'shell' and each app id
  // The modules each view reaches, repository-relative, for the bundler comparison (R5).
  modules: Map<string, Set<string>>;
  // Each app's content root.
  roots: Map<string, string>;               // 'cv' → 'packages/web/src/apps/cv/CvApp.tsx'
};
```

## OS state additions (`@cv/os-core`)

[contracts/shell.md](./contracts/shell.md) gives the full contract.

```ts
type OsState = {
  // 005's and 006's fields, unchanged, and:
  // The views showing their specs, with the app's scroll position to restore (FR-003, FR-004).
  specs: Partial<Record<ViewId, { appScroll: number }>>;
};

type OsAction =
  // 005's and 006's actions, and:
  | { type: 'showSpecs'; view: ViewId; appScroll: number }
  | { type: 'showApp'; view: ViewId };

type FocusTarget =
  // 005's targets, and:
  | { kind: 'spec-heading'; view: ViewId }
  | { kind: 'show-specs'; view: ViewId };
```

### State transitions

```text
                 showSpecs (view open)
   showing app  ─────────────────────▶  showing specs
       ▲   ▲                                │   │
       │   └──────────── showApp ───────────┘   │
       │                                        │
       └─────────────── close ─────────────────┘   (entry removed; next open shows the app)

   showing specs ── minimize, restore, maximize, move, resize, open, focus,
                    mobileHome, mobileOpen, shellChanged ──▶ showing specs
```

| Action | Effect on `specs` | Effects |
|--------|-------------------|---------|
| `showSpecs { view, appScroll }` | Adds `view` with `appScroll`, if `view` is open and not already showing specs | Desktop: the window comes to the front, focused. Focus: `spec-heading` |
| `showApp { view }` | Removes `view`, if present | Desktop: the window comes to the front, focused. Focus: `show-specs` |
| `close { view }` | Removes `view` | 005's |
| `open { view }` on desktop, when it creates a new window | Removes `view`, so an app opened afresh shows the app (FR-004). Possible only for a view shown on mobile before a shell switch | 005's |
| Any other | None | 005's and 006's |

On mobile an app stays open in the visit after Home (005 FR-034), so an entry outlives
`mobile.open`. That is why no invariant ties `specs` to the open windows or view; the reducer tests
cover each row instead.

## The loader (browser)

`src/inspector/data.ts` holds the visit's requirement data:

```ts
type RequirementsState =
  | { status: 'idle' }                                  // before the shell is ready
  | { status: 'loading'; promise: Promise<void> }
  | { status: 'ready'; data: RequirementData }
  | { status: 'failed' };                               // retried on the next "Show specs"
```

Read with `useSyncExternalStore`, like 006's session store. Started once, when `#os` gains
`data-ready` (R9). Never written to storage.

## The spec view (browser)

What the view derives from the data for one view id, in `src/inspector/derive.ts`, so the site
check and the component group the same way:

```ts
type SpecGroup = {
  spec: SpecRecord;
  requirements: RequirementRecord[];   // ID order
  notShown: number;                    // spec.active - requirements.length
};

type SpecViewModel = {
  view: ViewId;                        // 'cv', 'terminal', 'about'
  title: string;                       // 'CV', 'Terminal', 'the shell'
  groups: SpecGroup[];                 // spec number order
  total: number;                       // requirements listed
  version: { commit: string; short: string; dirty: boolean };
};
```

`about` reads `views.shell`. An app id missing from `views` (data from another version, R9) gives
no groups.

## Site text

Added to `src/site-text.ts` under `inspector`, from the design's Site text table, with `fill`
patterns for `[app]`, `[n]` and `[commit]`. Every string is English and holds no CV fact (FR-009,
005 FR-043).

| Key | Text (the design's) |
|-----|---------------------|
| `show`, `showShort`, `showName` | `Show specs`, `Specs`, `Show specs for {view}` |
| `back` | `Back to {view}` |
| `windowTitle`, `headerSuffix`, `pageTitle` | `{view} · Specs`, `Specs`, the window title then 005's ` – {site}` |
| `region`, `heading`, `shellName` | `{view} specs`, `Specs for {view}`, `the shell` |
| `ledeApp`, `ledeShell` | The two ledes of the design's Site text table |
| `requirements`, `specs` | `{n} requirements` / `1 requirement`, `{n} specs` / `1 spec` |
| `builtFrom` | `built from` |
| `notShown` | `{n} more requirements in this spec aren't shown here` / `1 more requirement in this spec isn't shown here` |
| `openSpec`, `approved`, `draft` | `Open the spec`, `Approved`, `Draft` |
| `inTheSpec`, `tests`, `testsCount`, `noTests` | `In the spec, line {line}`, `Tests`, `Tests, {n}`, `No test covers this yet.` |
| `whatsThis` | The button and heading `What's this?`, its two paragraphs, the chain's five labels and its spoken form, `The site's repository on GitHub` |
| `offline`, `uncommitted` | The two notes, the second with `{commit}` |

## Check results (site check)

The `inspector` part's problem types ([contracts/cli.md](./contracts/cli.md)):

| Type | Means |
|------|-------|
| `missing-requirement` | A requirement the view's app or the shell carries isn't listed |
| `extra-requirement` | The view lists a requirement its app or the shell doesn't carry |
| `out-of-order` | Groups or requirements aren't in number and ID order |
| `wrong-count` | A group's "more requirements" count, or its absence, is wrong |
| `text-mismatch` | A requirement's text differs from its spec |
| `tests-mismatch` | A requirement's tests differ from 001's counting tests |
| `link-mismatch` | A spec, test or commit link doesn't name the built commit, file and line |
| `uncarried-element` | An element in the page carries a requirement no view lists |
| `state-lost` | Going back lost the app's scroll position or the Terminal's state |
| `focus-target` | Focus didn't land where FR-017 sets |
