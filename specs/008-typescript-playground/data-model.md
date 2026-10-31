# Data Model: The TypeScript Playground

Phase 1 of [plan.md](./plan.md). The entities of the spec's Key Entities, as the code holds them.
Types are TypeScript, as in 005's to 007's data models. Research decisions are cited as R1 to R26
([research.md](./research.md)).

## Compiler options

The settings of FR-024, as the approved design lists them (wireframes, Compiler options). One
table, in `packages/web/src/apps/playground/options.ts`, read by the options panel, the engine,
the kept code, shared links and the tests.

```ts
type OptionName =
  | 'target'
  | 'strict' | 'noImplicitAny' | 'strictNullChecks' | 'strictFunctionTypes' | 'strictBindCallApply'
  | 'strictPropertyInitialization' | 'strictBuiltinIteratorReturn' | 'noImplicitThis'
  | 'useUnknownInCatchVariables'
  | 'noUncheckedIndexedAccess' | 'exactOptionalPropertyTypes' | 'noImplicitReturns'
  | 'noFallthroughCasesInSwitch' | 'noImplicitOverride' | 'noPropertyAccessFromIndexSignature'
  | 'noUnusedLocals' | 'noUnusedParameters'
  | 'declaration' | 'removeComments' | 'noEmitOnError' | 'useDefineForClassFields'
  | 'experimentalDecorators' | 'preserveConstEnums';

type Target = 'ES2015' | 'ES2016' | 'ES2017' | 'ES2018' | 'ES2019' | 'ES2020' | 'ES2021' | 'ES2022'
  | 'ES2023' | 'ES2024' | 'ESNext';

type OptionSpec =
  | { name: 'target'; group: 'language'; kind: 'choice'; values: readonly Target[]; default: 'ES2022' }
  | { name: Exclude<OptionName, 'target'>; group: 'strict' | 'checks' | 'output'; kind: 'flag'; default: boolean;
      // The strict checks: `strict` sets each of them; each can then be set alone.
      underStrict: boolean };

// What the visitor chose: only options that differ from the defaults are written down,
// in kept code and in links (FR-026, FR-052).
type ChangedOptions = Partial<{ target: Target } & Record<Exclude<OptionName, 'target'>, boolean>>;
```

- **Defaults**: as the design's table: `target` `ES2022`; `strict` and its eight checks on; the
  other checks off; `declaration` and `useDefineForClassFields` on; the rest off (FR-025).
- **Fixed options**, never shown or changed (FR-024, R9): `module: ESNext`,
  `moduleDetection: force`, `lib` from `target` plus `WebWorker` minus `DOM` (R14), `sourceMap: true`
  (R13), `noEmit: false`, `isolatedModules: false`, `jsx: none`, `types: []`, `allowJs: false`.
- **Reading** a written set (kept code or a link): a name not in `OptionName` is left out and
  named in the message of FR-019 or FR-056; a value of the wrong kind is left out the same way;
  a flag set to its default is dropped, but for a strict check under `strict: false`. There, a strict
  check not written is off, as the panel does and older links mean, so writing sets each strict check
  that is on while `strict` is off, default or not (T206).

Validation: the table is checked against TypeScript's own option list in a test, so a name the
compiler doesn't know fails the build's tests (`options.test.ts`).

## Kept code

What FR-019 keeps between visits, in `localStorage` under one key (R15).

```ts
// localStorage['cv-playground']
type KeptCode = {
  format: 1;
  code: string;
  options: ChangedOptions;
};
```

- Written 300 ms after the last change to the code or an option, and when the window closes or the
  page hides (`pagehide`). Never written while the Playground holds the starting example
  unchanged with the default options, so a visitor who never edits stores nothing.
- **Reset** (FR-080) removes the key; the next edit writes it again.
- **Can't keep**: `localStorage` missing, throwing on read, or throwing on write (a private window,
  storage off, quota). The session store then holds the code for the visit and the message of
  FR-019 shows once.
- **Older format or a bad value**: a `format` other than 1, or JSON that doesn't parse, is ignored
  as if nothing were kept, and the key is left as it is until the next write. Unknown options are
  left out with the message (FR-019).

## Shared link

What FR-052 to FR-057 carry. [contracts/share-link.md](./contracts/share-link.md) sets the
format byte by byte.

```ts
// https://<site>/#playground=1.<payload>.<check>
type SharedLink = {
  format: 1;
  payload: string;       // base64url of deflate-raw of the UTF-8 JSON below
  check: string;         // the first 11 base64url characters (64 bits) of SHA-256 of `payload`
};

type SharedContent = { c: string; o?: ChangedOptions };

// What reading a link gives.
type ReadLink =
  | { kind: 'none' }                                  // no `#playground` in the address
  | { kind: 'app' }                                   // `#playground` alone: open the app (FR-059)
  | { kind: 'code'; code: string; options: ChangedOptions; unknown: string[]; href: string }
  | { kind: 'broken'; href: string };                 // cut off, altered or garbled (FR-056)
```

- `href` is the address as opened, kept for the mobile screen's Share link and Copy link, which
  pass it on unchanged (FR-059, FR-060).
- A link longer than 8,000 characters, in full, is never made (FR-055).

## TypeScript copy

The engine bundle (R3): the editor, TypeScript, its workers and the runner, built as one versioned
folder and downloaded on the first desktop open (FR-007 to FR-014).

```ts
// /playground/<engine-hash>/files.json, written by the build
type EngineManifest = {
  api: 1;                  // the engine's contract version (contracts/engine.md)
  version: string;         // <engine-hash>: a hash over every file below
  typescript: string;      // TypeScript's own `ts.version`, read at build time, for tests only
  entry: string;           // '/playground/<engine-hash>/engine-<hash>.js'
  style: string;           // '/playground/<engine-hash>/engine-<hash>.css'
  files: { path: string; bytes: number }[];  // every file, entry and workers included
  total: number;           // the sum of `bytes`
};
```

In Cache Storage (R4):

```ts
// cache 'playground-<engine-hash>': every file of `files`, by path, then the marker
// '/playground/<engine-hash>/complete', written last, holding the manifest.
```

- **Complete** means the marker is present. A cache without it is incomplete: it is never used,
  and the next download starts it again (FR-007, FR-011).
- **Which copy runs**: the site's current `<engine-hash>` if complete; else, offline or when the
  download fails, the newest other complete copy whose `api` equals the site's; else none
  (FR-013). The version shown is the one loaded (FR-012).
- **Clean-up**: once a complete copy of the current hash is stored, every other `playground-*`
  cache is deleted.

### Download state

```ts
type DownloadState =
  | { kind: 'idle' }                                   // the window isn't open on desktop
  | { kind: 'checking' }                               // looking for a stored copy
  | { kind: 'downloading'; received: number; total: number; announcedStep: 0 | 1 | 2 | 3 | 4 }
  | { kind: 'offline'; total: number; stopped: boolean; wontOpen?: boolean }   // FR-011: never started, stopped part way, or a whole copy that won't open
  | { kind: 'ready'; typescript: string; kept: boolean };  // kept: false is FR-014
```

Transitions: `idle → checking` on open; `checking → ready` with a complete copy; `checking →
downloading` online; `checking → offline` with no network; `downloading → ready` when the marker is
written (or, with `kept: false`, when every file has loaded from the network); `downloading →
offline { stopped: true }` on a failed fetch; `offline → downloading` on Retry or the `online`
event. Closing the window cancels a download in progress; the partial cache stays incomplete and
is overwritten by the next one. `announcedStep` counts the 25% steps already told to screen readers
(FR-065).

## Session

The Playground's state for the visit, outside React, so it survives unmounting: shell switches
(FR-061), "Show specs" (FR-005), minimizing. A module-level store, as 006's Terminal session
(`packages/web/src/apps/playground/session.ts`).

```ts
type PlaygroundSession = {
  download: DownloadState;
  // The editor's model lives in the engine; the session keeps its view state between mounts.
  viewState: unknown | null;              // the editor's own saved view state (cursor, selection, scroll, folds)
  options: ChangedOptions;
  pane: 'javascript' | 'declarations' | 'errors' | 'logs';
  panel: 'none' | 'options' | 'examples';
  popup: 'none' | 'stuck' | 'reset' | 'keys';
  message: Message | null;
  check: CheckResult | null;              // the latest diagnostics and output, or null while checking
  checking: boolean;                      // FR-016's "still checking"
  run: Run | null;
  logs: LogBook;
  keeping: 'yes' | 'no-storage';           // FR-019
  pendingLink: ReadLink;                  // a link read on load and not yet opened (desktop) or shown (mobile)
  example: string | null;                 // the example the code came from, until it is edited
  tabMovesFocus: boolean;                 // the editor's tab focus mode (FR-062)
};
```

- `close` (the window's) ends the run, empties the logs, closes popups and panels and clears the
  message; the code and options stay kept (FR-046, FR-019).
- `reload` loses everything but the kept code, as nothing else is stored (spec Assumptions).

## Diagnostic and check result

```ts
type Diagnostic = {
  line: number; column: number; endLine: number; endColumn: number;   // 1-based, in the code
  message: string;                    // TypeScript's message, flattened, or the packages message
  code: number;                       // TypeScript's error number; 0 for the packages message (R11)
  category: 'error' | 'warning' | 'suggestion' | 'message';
};

type CheckResult = {
  version: number;                    // the model's version the result is for
  diagnostics: Diagnostic[];          // errors and warnings only, in line then column order
  javascript: { text: string; map: string } | { none: 'noEmitOnError' };
  declarations: { text: string } | { none: 'declaration-off' | 'noEmitOnError' };
  imports: { line: number; column: number; specifier: string }[];      // FR-042 (R11)
};
```

The Errors pane, the status bar's count and the run's first note all read the same result. A
result whose `version` isn't the model's current version is shown dimmed as stale while
`checking` is true (FR-016).

## Run

One running of the code (FR-032 to FR-050). The runner's protocol is in
[contracts/runner.md](./contracts/runner.md).

```ts
type Run = {
  id: number;
  startedAt: number;                   // performance.now() on the page
  state: 'starting' | 'running' | 'waiting' | 'ended';
  pending: { timers: number; requests: number };   // 'waiting' when the code is idle with pending > 0
  blockedSince: number | null;         // the page's time of the last unanswered heartbeat
  stuck: 'no' | 'due' | 'shown' | 'kept-waiting';   // FR-048 to FR-050
  askAgainAt: number | null;           // Keep waiting: blockedSince-independent, 5 s after the choice
  uncaught: number;                    // FR-035
  outcome: null | { kind: 'finished' | 'stopped' | 'errors' | 'crashed' | 'nothing-ran'; ms: number; reason?: string; errors?: number };
};
```

State transitions:

| From | Event | To |
|------|-------|----|
| none | Run (FR-032) | `starting`: logs emptied, the errors note logged (FR-033) |
| `starting` | the runner reports the code started | `running` |
| `running` | the code goes idle with `pending > 0` | `waiting` |
| `waiting` | a timer fires or a request settles | `running` |
| `running`, `waiting` | idle with `pending = 0` | `ended`, `finished` or `errors` (uncaught > 0) |
| any but `ended` | Stop (FR-038), Run again, Reset, close, `pagehide` | `ended`, `stopped` (close and reload log nothing) |
| any but `ended` | the worker dies or reports out of memory (FR-045) | `ended`, `crashed`, with the reason |
| `starting` | imports found, or no JavaScript (FR-033, FR-042) | `ended`, `nothing-ran` |

Stuck popup (FR-048 to FR-051): `stuck` goes `no → due` when a heartbeat has gone unanswered for
5 s; `due → shown` when the window is on screen, not minimized and not showing its specs (FR-050);
`shown → kept-waiting` on Keep waiting or Escape, which sets `askAgainAt` 5 s on; `kept-waiting →
due` at `askAgainAt` if still unanswered; any → `no` when a heartbeat is answered (the code paused)
or the run ends, announcing it (FR-049).

## Log book

```ts
type LogBook = {
  entries: LogEntry[];        // at most 1,000, oldest first (FR-044)
  dropped: number;            // entries dropped from the front, from the runner's count and the page's
  newSinceAnnounce: number;   // for the once-a-second summary (FR-064)
};

type LogEntry = {
  id: number;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug' | 'alert' | 'note';
  values: Shown[];            // what was logged, formatted in the runner
  line?: number;              // in the visitor's code, for errors (FR-035)
  cut?: true;                 // the entry was cut at 10,000 characters (FR-044)
  note?: NoteKey;             // for 'note': which site text, and its values
};

// A value as the runner formats it (FR-034). Text only: rendered as React text, never markup (FR-047).
type Shown =
  | { t: 'str'; v: string } | { t: 'num' | 'bigint' | 'bool' | 'sym' | 'text'; v: string }
  | { t: 'null' } | { t: 'undef' }
  | { t: 'fn'; name: string; cls: boolean }
  | { t: 'arr'; items: Shown[]; more: number }
  | { t: 'obj'; ctor: string | null; entries: [string, Shown][]; more: number }
  | { t: 'map'; entries: [Shown, Shown][]; more: number } | { t: 'set'; items: Shown[]; more: number }
  | { t: 'date'; v: string } | { t: 'err'; name: string; message: string }
  | { t: 'circ' } | { t: 'deep' };   // a circular reference; a value below the depth limit
```

Limits, applied in the runner (R18): depth 4, 100 items or entries per array, object, map or set,
then `more`; 10,000 characters per entry, counted over the formatted text. The page keeps the
latest 1,000 entries; the runner also keeps only the latest 1,000 between two sends and reports
what it dropped.

## Example

FR-027 to FR-031. The list is in `packages/web/src/apps/playground/examples/`.

```ts
type Example = {
  id: string;                    // 'welcome', 'basic-types', … 'find-a-skill'
  group: 'start' | 'types' | 'running' | 'cv';
  title: string;                 // site text
  description: string;           // site text
  code: string;                  // its comments are site text; it holds no CV fact (FR-031)
  options?: ChangedOptions;      // any option it needs (none today)
  runs: 'to-end' | 'interval' | 'endless';   // FR-030, read by the Playground check
};
```

The eleven examples are the design's (wireframes, Examples); their code is in research R20.

## Editor command and key

FR-083 to FR-085.

```ts
type KeyCommand = {
  id: string;              // the editor's command id, or 'playground.run'
  label: string;           // as the command palette and the list of keys show it
  keys: { mac: string[]; other: string[] };          // what the Playground binds
  vsCode: { mac: string[]; other: string[] };        // VS Code's defaults, for the list's notes
  differs?: 'shell' | 'browser' | 'screen-reader' | 'not-vs-code';  // why `keys` differs (FR-084)
};
```

The table (`packages/web/src/apps/playground/keys.ts`) lists the commands the list of keys shows;
the command palette lists every command the editor registers, with the key it actually has.
Research R12 sets the rebinds.

## Message

The one-line message under the toolbar (design: Messages).

```ts
type Message = {
  kind: 'done' | 'warn' | 'error' | 'info';
  text: MessageKey;                // site text, with its values
  actions: ('undo' | 'run' | 'share-with' | 'copy-code' | 'retry')[];
  link?: string;                   // the field of FR-052 when the clipboard refuses
};

type MessageKey =
  | 'linkCopied' | 'linkField' | 'tooLong' | 'brokenLink' | 'unknownOptions' | 'sharedOpened'
  | 'sharedReplaced' | 'exampleReplaced' | 'resetDone' | 'cantKeepCode' | 'cantKeepTypeScript';
```

A new message replaces the one shown. Each is announced politely (FR-052, FR-064). The notices a
visitor must read (`unknownKeptOptions`, `unknownOptions`, `cantKeepTypeScript`, `cantKeepCode`) aren't
lost that way: each waits its turn behind what shows, comes back after a message that replaces it,
and shows when the one before is dismissed. `cantKeepCode` goes once a write works (T213, T214).

## OS state

The Playground is a third app: `ViewId` gains `'playground'` (`@cv/os-core`), and the window's
opening geometry follows the design (contracts/shell.md). A link to the Playground opens it with
the existing `open` and `mobileOpen` actions after hydration (contracts/shell.md, Opening from a
link); no new action is needed.

## Site text

New keys under `siteText.playground`, every string of wireframes.md's states and Site text section,
the options' descriptions and the examples' titles and descriptions (FR-031). 005's site-text test
reads them like any other: English, no CV fact. The examples' code comments are site text too, and
the content check reads the example files like any site file.
