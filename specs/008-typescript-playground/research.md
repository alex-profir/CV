# Research: The TypeScript Playground

Phase 0 of [plan.md](./plan.md). Each decision gives what was chosen, why, and what else was
weighed. **Verify** marks a fact the plan relies on that is to be confirmed by a test early in
implementation, with the fallback named. Package facts were read from the packages themselves
(`npm pack` of `monaco-editor@0.57.0`, `typescript@6.0.3` and `typescript@7.0.2`, and a trial Vite
8.3.5 build of Monaco outside the repository) on 2026-10-29.

## R1. The editor: Monaco

**Decision**: `monaco-editor` 0.57.0, Microsoft's editor of VS Code, imported through its
tree-shakable ESM entry points (`monaco-editor/editor`, `…/languages/definitions/typescript/register`,
`…/languages/features/typescript/register` and the `features/<name>/register` modules that FR-015
and FR-081 to FR-085 need), with Monaco's own TypeScript language worker.

**Rationale**:

- The spec asks for an editor that works as VS Code does, as the official Playground's editor
  does (FR-015, FR-081 to FR-085). Monaco *is* that editor: the official Playground runs it. It
  brings, with no code of ours, line numbers, folding, several cursors, line moves, expanding the
  selection, find and replace, go to line and to symbol, highlights of other uses, the command
  palette on F1, peek definition, rename, the suggestion and parameter widgets, the lightbulb and
  tab focus mode (`Ctrl+M`, `Ctrl+Shift+M` on a Mac), all on VS Code's default keys.
- Its TypeScript worker exposes what the spec needs: syntactic and semantic diagnostics, quick
  info, completions with details, signature help, definition, references, document highlights,
  the navigation tree, formatting of a document and a range, rename, code fixes, and
  `getEmitOutput` for the JavaScript and the declarations.
- MIT licensed, published by Microsoft (the vendor, Constitution X). Its two dependencies,
  `marked` and `dompurify`, come with it.
- It needs no `eval` (the ESM build has none) and no request to another site.

**Size** (trial build, the editor with every feature): main chunk 3.98 MB (772 KB brotli), the
TypeScript worker 6.93 MB (about 1.0 MB brotli), the editor worker 304 KB, CSS 186 KB, the icon
font 153 KB. Importing only the features listed in R12 instead of `register.all` brings the main
chunk to about 2.8 MB. None of it is in the `os` script or the site's precache (R3, R4).

**Alternatives considered**:

- *CodeMirror 6 with our own TypeScript worker*: smaller, but every VS Code feature above (the
  command palette, peek, rename, quick fixes, multi-cursor keys) would be ours to build and to keep
  matching VS Code: far more code, and against FR-015's "as VS Code does".
- *An `<textarea>` with highlighting*: can't meet FR-015 or FR-081.
- *Monaco's AMD build*: deprecated since 0.53.

## R2. Where the Playground lives

**Decision**: the Playground's interface is React in the `os` script, in
`packages/web/src/apps/playground/`, like the Terminal: the window's content, the toolbar,
messages, panes, logs, options, examples, popups, the status bar, the loading and offline states,
the "best on desktop" screen, the share link code and the session store. The editor, TypeScript,
their workers and the runner are the **engine**, a separate bundle downloaded on the first desktop
open (R3). The interface talks to the engine only through [contracts/engine.md](./contracts/engine.md).

The session store (data-model.md Session) is module-level, outside React, as 006's Terminal
session is: the editor's model lives in the engine and survives the editor's view being unmounted,
and the view's own saved state (cursor, selection, scroll, folds) is kept in the session when the
content unmounts and restored when it mounts. So "Show specs" (FR-005), minimizing and shell
switches (FR-061) lose nothing, and a run goes on through all of them.

**Rationale**:

- One React, one shell: the menu items, focus effects, announcer, "Show specs" and window behavior
  are the shell's, as for every app. 007's requirement walker finds the Playground's `data-req`
  values in the `os` script's import graph with no change (contracts/shell.md).
- The mobile screen, the loading and offline states and shared-link reading must work before and
  without the engine (FR-009, FR-058 to FR-060), so they can't live in it.
- The engine holds the megabytes. The interface adds an estimated 35 KB brotli to the `os` script
  (**Verify**: measured by R25's size check; budget 45 KB, beyond which the examples' code and the
  options' descriptions move into the engine).

**Alternatives considered**: *the whole desktop Playground in the engine, with its own React
root*: keeps the `os` script smaller, but needs a second React, a bridge for menus, focus and
announcements, and a second root for 007's walker. *Everything in the `os` script*: breaks FR-009.

## R3. The engine bundle

**Decision**: `build-site.ts` gains a step before the client build: a second Vite build of
`src/apps/playground/engine/engine.ts` with a relative base, written to a temporary folder, then
hashed and moved to `<site>/playground/<engine-hash>/`, with `files.json` (data-model.md
EngineManifest). Its workers (Monaco's editor worker and our TypeScript worker, R6) are built by
Vite's `?worker` imports into the same folder, so `getWorker` returns them by URL and no worker is
made from a `blob:` URL on the site's page. The shell page carries the manifest's path in
`#os[data-playground]`, as 007 carries its data file in `data-requirements`.

- 005 research R14 holds: the `os` script stays one file; the engine is loaded by a URL read at
  run time, never a Rolldown chunk of the `os` entry. `build-site.ts`'s one-file check is unchanged.
- The served types gain `.ttf` (`font/ttf`) for the editor's icon font (R22).
- The site manifest lists the engine's files like every served file; the service worker's precache
  leaves out everything under `/playground/` (R4).

**Alternatives considered**: *a lazy chunk of the `os` entry*: an update can remove it from the
cache mid-visit, the very reason for 005 R14, and it would be precached. *Monaco from a CDN*:
FR-010.

## R4. Download, the stored copy and the service worker

**Decision**:

- **Download** (FR-007): `engine/loader.ts`, in the `os` script, fetches `files.json` and then
  every file it lists with `cache: 'reload'`, reading each body as a stream to count bytes against
  `total`, and puts each response into the cache `playground-<engine-hash>`. The marker
  `/playground/<engine-hash>/complete` is put last. Then it imports the entry with
  `import(/* @vite-ignore */ entry)`, and links its style sheet.
- **Complete or nothing** (FR-007, FR-011): a copy without its marker is never used. A failed
  fetch stops the download and leaves the cache without the marker; the next attempt starts it
  again and overwrites it.
- **Offline** (FR-011): before downloading, `navigator.onLine === false`, or a failed fetch of
  `files.json`, gives the offline state with the total from the shell page's `data-playground-bytes`
  (written by the build), so the size shows with no network. The `online` event and Retry start
  the download again.
- **The service worker**: `/playground/` paths are answered from any cache with
  `caches.match(request)`, then the network; `activate` deletes only `cv-` caches, as today, so a
  Playground copy outlives a site update (FR-013). The precache list leaves them out (FR-009).
- **Several versions** (FR-013): the loader uses the current hash's complete copy; failing that,
  offline or when the download fails, the newest complete `playground-*` copy whose manifest `api`
  equals the interface's (contracts/engine.md). Once the current copy is complete, the others are
  deleted. An open Playground keeps the engine it loaded until the page goes.
- **Can't keep** (FR-014): `caches` missing, `caches.open` or `put` throwing (a private window,
  storage off, a full quota): the loader imports the entry straight from the network (the
  service worker then answers from the network), and the message `cantKeepTypeScript` shows.

**Rationale**: Cache Storage is what the service worker already answers from; one cache per
version with a marker written last is the simplest way to know a copy is whole. Counting bytes in
the page gives true progress without the service worker's help.

**Alternatives considered**: *the service worker downloading*: no progress events to the page
without a message channel, and harder to cancel. *IndexedDB*: the service worker would have to
build responses from it. *Precaching the engine*: FR-009.

## R5. Which TypeScript

**Decision**: the TypeScript that `monaco-editor` 0.57.0 bundles in its worker, **5.9.3**
(`typescriptServicesMetadata.js`, `versionMajorMinor = "5.9"`). The version shown is `ts.version`,
read in the worker and returned by the engine (FR-012). A Monaco update brings a newer TypeScript
through the site's own release (spec Assumptions: one version).

**Rationale**: TypeScript 7, the repository's own compiler, is the native Go port: its npm package
has no compiler that runs in a browser, and no official WebAssembly build exists (its stable API
is promised for 7.1 at the earliest). The official Playground itself still runs the JavaScript
compiler (its release index tops out at 6.0.3). Monaco's worker is built and tested against the
TypeScript it bundles.

**Alternatives considered**: *`typescript@6.0.3` aliased into Monaco's worker*: possible in
principle (the worker reads TypeScript through one thin module) but unconfirmed, and a second
TypeScript package to keep matched to Monaco's worker; 5.9 to 6.0 changes nothing the spec needs.
*`tsgo-wasm`*: unofficial, 49 MB, no language service API.

## R6. Our TypeScript worker

**Decision**: `engine/ts.worker.ts` imports `initialize` and `TypeScriptWorker` from Monaco's
TypeScript worker module and subclasses it, so Monaco's language features run unchanged and three
things are ours:

- `getCheck(fileName)`: one call that returns the diagnostics (syntactic, semantic and
  compiler-option, filtered as R11 sets), the JavaScript with its source map, the declarations and
  the import list (data-model.md CheckResult). One round trip per check keeps the panes, the marks
  and the count in step (R7).
- `getRunnable(fileName)`: the JavaScript for running (R13).
- `getCodeFixesAtPosition`: TypeScript's fixes without those that add an import (`fixName`
  `import`, or any fix whose text changes add an import declaration), FR-082.

`MonacoEnvironment.getWorker` returns this worker for the `typescript` label. Monaco's own
diagnostics adapter is turned off (`setModeConfiguration({ diagnostics: false })`); the markers
come from `getCheck` (R7). Monaco's `customWorkerPath` is not used: it relies on `importScripts`,
which module workers don't have.

**Verify**: the subclass and `initialize` exports work with Vite's `?worker` build (trial build of
the worker first; fallback: a copy of Monaco's ~300-line `tsWorker` entry, MIT, in our worker).

## R7. Checking as the visitor types

**Decision**: on each change of the model, the interface waits 250 ms without a change, then calls
`getCheck`. While a call is out, a newer change queues one more call; results for an older model
version are dropped. If no result for the current version has arrived 300 ms after the change
stopped, `checking` turns on: the status bar reads `Checking…` and the marks and the Errors pane
dim (FR-016). Markers are set with `setModelMarkers(model, 'playground', …)`. The error count's
announcement waits for the same pause (FR-064).

**Rationale**: 250 ms plus a check of a 300-line file (tens of milliseconds in the worker) keeps
SC-002's one second with room to spare; Monaco's own adapter waits 500 ms and can't share its
result with the panes.

## R8. The panes

**Decision**: the JavaScript and Declarations panes are read-only Monaco editors (no line numbers,
no minimap, `readOnly`, `domReadOnly`), so their text has the editor's syntax colors and is
selectable and copyable, and only their long lines scroll sideways (FR-021, FR-072). The Errors
and Logs panes are React lists. The four are a tab list (`role="tablist"`), JavaScript first
(FR-020, FR-064). When `getCheck` gives no output, the pane shows the design's sentence instead
(FR-023).

## R9. Compiler options

**Decision**: the options table of data-model.md, read by the options panel, applied with
`typescriptDefaults.setCompilerOptions` merged with the fixed options. The fixed ones:
`module: ESNext` and `moduleDetection: force`, so top-level `await` checks and every file is its
own scope; `lib` from `target` (`es2022` and so on, `esnext` for ESNext) with `webworker` added and
no `dom` (R14); `sourceMap: true` (R13); no `jsx`, no `types`. `options.test.ts` checks every name
in the table against `ts.optionDeclarations` of the bundled TypeScript (run in Node on Monaco's
`typescriptServices.js`), and every default against the design's table.

**Alternatives considered**: *exposing every TypeScript option*: FR-024 rules out options that
need several files, packages or a file system.

## R10. The CV as typed data

**Decision**:

- **Type**: at build time, a Vite plugin (`scripts/cv-types.ts`) turns
  `packages/content/src/shape.generated.ts` (002's generated shape of the CV document's rules) into
  a declaration file: every `export interface` as a global `interface`, and
  `declare const cv: Resume;`. The interface imports it as a string and gives it to the engine,
  which adds it with `addExtraLib(…, 'file:///cv.d.ts')`. So hovering `cv.projects` shows
  `ResumeProject[] | undefined` with the schema's own descriptions (FR-029, design).
- **Value**: the interface has `resume` from its props (002, Constitution IV) and sends a
  structured clone of it with each run; the runtime sets `globalThis.cv` before the code runs.
  Each run gets its own copy, so a run that changes `cv` changes nothing after it.
- No CV fact is typed by hand anywhere: a change to `resume.json` reaches the examples' output at
  the next build (FR-029, SC-008), and a change to the schema reaches their types.

**Rationale**: passing the declaration from the interface, not baking it into the engine, keeps it
current even when an older stored engine runs (R4).

## R11. Packages can't be imported

**Decision**: in `getCheck`, the worker walks the file's syntax tree for import and export-from
declarations with a module specifier, `import x = require(…)`, `import(…)` calls and calls to a
`require` that isn't declared in the code. Each gives a diagnostic at the specifier (or the call)
with the site text "Packages can't be imported here. The Playground runs one file of code, with no
packages." (code 0), and TypeScript's own diagnostics on the same range (2307, 2792, 2580, 2591,
1323 and the like) are dropped. The list goes into `CheckResult.imports`. Run with a non-empty list
logs the same text and runs nothing (FR-042). Beneath that, the runner's policy (R17) blocks every
remote script load, so a computed `import(url)` fetches nothing either.

## R12. Keys

**Decision**: Monaco's defaults are VS Code's for the visitor's system (FR-083). The Playground:

- adds **Run** on `Ctrl+Enter` (`Cmd+Enter`), and Monaco's `Option+Escape` second key for
  suggestions on a Mac stays (design Keys);
- removes `Ctrl+Shift+P` (`Cmd+Shift+P`) from the command palette with a `-` keybinding rule:
  Firefox opens a private window on it (design Keys);
- registers **Format Document** on `Shift+Alt+F` (Monaco binds it already) and checks the shell no
  longer does (FR-086);
- registers **accessibility help** on `Alt+F1` (`Option+F1`), which Monaco 0.57 doesn't register
  in the standalone editor: it opens the design's Keys popup, whose lede says how to leave the
  editor, move to errors and hear a type (FR-083, FR-063). **Verify** in a browser that Monaco has
  no Alt+F1 action of its own; if it has one, ours replaces it;
- leaves the shell's shortcuts alone: the shell listens in the capture phase (contracts/shell.md),
  so `Alt+Shift+M`, `D`, `N`, `W`, `P` and `S` reach it from inside the editor and type nothing.

**The conflict check** (FR-084, wireframes Keys): `keys.test.ts` reads every keybinding the editor
registers (the standalone keybinding service's resolver) and fails on any that matches a shell
shortcut or a key in the reserved table (`keys.ts`): the keys a page can't take in the current
Chrome, Edge, Firefox and Safari on macOS, Windows and Linux (new window, tab, private window,
close, quit, address bar, tab switching, the developer tools' own keys) and those NVDA, JAWS and
VoiceOver reserve (their modifier chords and Insert/Caps Lock layers). Known now:

| Key | Taken by | Decision |
|-----|----------|----------|
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Firefox private window | Removed; F1 only (design) |
| `Ctrl+Shift+K` (Windows, Linux: delete line) | Firefox web console | **Verify** in Firefox; if the page can't take it, Delete Line gets `Ctrl+Shift+Alt+K`, listed |
| `F12`, `Shift+F12`, `Alt+F12` | Developer tools in Chrome, Edge and Firefox on Windows and Linux | **Verify** a page's `preventDefault` keeps them (vscode.dev relies on it); if not, `Ctrl+F12`, `Ctrl+Shift+F12` and `Ctrl+Alt+F12` are added and listed |
| `Ctrl+Space` on a Mac | macOS input sources, when set | VS Code's `Option+Escape` kept (design) |

The verification is a Playwright test per browser engine that presses each key in the editor and
asserts the editor acted (Chromium on every pull request; Firefox and WebKit in the owner's local
run, R25). The list of keys (FR-085) is generated from `keys.ts`, with the reason for each
difference.

## R13. Running the code

**Decision**: `getRunnable` emits the file through the program with an `after` transformer that
removes `export` modifiers and `export {}`, so the JavaScript is a plain script body, with its
source map. The runtime wraps it as `(async () => {\n<code>\n})()` inside the worker's script, so
top-level `await` works and a rejection of the wrapper is an uncaught error (FR-035). Stack frames
of errors name the worker script's URL with a line and column; the runtime subtracts the
prelude's lines and the page maps the rest through the source map with a small VLQ decoder
(`engine/source-map.ts`) to the line in the visitor's code (FR-035).

**Rationale**: a classic worker needs no `import` of a `blob:` URL (R17); the wrapper is the one
transform that gives a script top-level `await`.

**Alternatives considered**: *a module worker importing the code from a `blob:` URL*: needs
`blob:` in `script-src`, which would let code import anything it fetched, and WebKit fails a blob
module importing another blob. *`new Function`*: needs `unsafe-eval`.

## R14. What the code sees

**Decision**: the code's types are a worker's (`lib` with `webworker`, no `dom`), since it runs in
one, plus `file:///playground.d.ts` declaring `alert`, `prompt` and `confirm` as the runtime gives
them (FR-043) and `cv` (R10). `document`, `window` and `localStorage` are errors in the editor, as
they would fail when run (FR-039).

## R15. Kept code

**Decision**: `localStorage['cv-playground']` (data-model.md Kept code). Written 300 ms after the
last change and on `pagehide`; read once when the Playground first mounts in a visit.

**Rationale**: a few kilobytes of text, read once; `localStorage` is the simplest store that works
in every browser and that "clear site data" empties. It is the site's first stored item: 005's and
007's tests that find storage empty don't open the Playground and stay true.

## R16. Shared links

**Decision**: [contracts/share-link.md](./contracts/share-link.md): a `#playground=` fragment
with deflate-raw (`CompressionStream`, in every target browser) and base64url, a 64-bit SHA-256
check, read in the `os` script on hydration, never run. The code path from reading a link to
the editor never calls the runner; the Playground check asserts no runner frame exists after a
link opens (FR-053, SC-006).

**Alternatives considered**: *a query string*: sent to the server with the request, against
FR-054. *LZ-string as the official Playground uses*: a package for what the browser already does.
*No check*: a hand-altered payload can still inflate to other text, against FR-056.

## R17. The sandbox

**Decision**: each run gets a new `<iframe sandbox="allow-scripts">` with a `srcdoc` and no
`allow-same-origin`, hidden in a host of its own appended once to `document.body`, never inside
the Playground's window and never moved: removing or moving a frame ends its worker, and the
window's content unmounts for Show specs and shell switches (FR-005, FR-061), which must not end
a run. Stop, a new run, the window's close and `pagehide` remove it. The `srcdoc` holds a meta policy,
`default-src 'none'; script-src 'sha256-<bootstrap>'; worker-src blob:; connect-src *`, and one
inline bootstrap script. The page sends the bootstrap a `MessagePort`, a nonce and the worker's
source (runtime plus code, R13, R18); the bootstrap makes a classic `Worker` from a `Blob` URL,
passes it the port, and revokes the URL after the worker's first message (a WebKit bug fails an
early revoke). The page and the worker then talk over that port only.

What this gives (FR-039 to FR-041):

- An opaque origin: no `localStorage`, `indexedDB`, `caches` or cookies of the site (each throws or
  is missing), no reach into the page, the shell or other windows, and nothing stored outlasts the
  run, since a new iframe is made for each.
- No navigation or new windows (`allow-top-navigation` and `allow-popups` aren't given), and the
  worker has no DOM.
- Requests to any site, with `Origin: null` (`connect-src *`); script loads from anywhere are
  blocked by `script-src`, so packages fetch nothing (FR-042). The sandbox alone doesn't keep
  cookies off: T025 found that with `credentials: 'include'`, Firefox and WebKit send the site's
  cookie to another port on its host. So the runtime forces credentials off on `fetch`,
  `XMLHttpRequest` and `EventSource` (FR-041 as amended 2026-10-30, T177); WebSocket relies on the
  sandbox alone.
- Its own thread: a loop in the worker can't block the page, so the shell, the editor and Stop keep
  responding (FR-040, SC-005).
- It needs no network: `srcdoc` and a `blob:` worker, so it runs offline (FR-073). A sandboxed
  iframe loaded by `src` would not be served by the service worker.

The site sends no CSP header or meta today; a `srcdoc` inherits its parent's policy, so a future
site-wide policy must allow the bootstrap's hash and `worker-src blob:` (noted in
contracts/runner.md).

**Verify** (the runner's first test, in Chromium, Firefox and WebKit through Playwright): the blob
worker starts in the sandboxed frame; `localStorage`, `indexedDB.open`, `caches.open` and
`document.cookie` give the code nothing; a cross-origin `fetch` carries no cookie. Fallback if
WebKit refuses the worker: a `data:` URL worker, which the same report shows WebKit creates.

**Alternatives considered**: *a worker on the site's origin*: reads the site's caches and
IndexedDB. *A sandboxed iframe with no worker*: shares the page's thread in most browsers, so a
loop freezes the site. *A second origin*: the site has one, and FR-010.

## R18. The runtime

**Decision**: `engine/runner/runtime.ts`, bundled at build time into one classic script text and
embedded in the engine (with the bootstrap, whose hash the build computes). Before the code runs it:

- captures `postMessage`, the port and the nonce in a closure, so the code can't forge messages;
- replaces `console` (`log`, `info`, `warn`, `error`, `debug`; every other method writes a `log`
  entry; `clear` empties the logs), formatting values into `Shown` trees (data-model.md Log book)
  with the limits there: depth 4, 100 items, 10,000 characters per entry, circular parts marked,
  functions and classes by name (FR-034, FR-044, FR-047);
- sends entries in batches: at once if 50 ms have passed since the last send, else on the next
  task, keeping at most the latest 1,000 between sends and counting the rest as dropped, so a
  printing loop still shows its latest output and the page receives at most 20 batches a second;
- gives `alert` (an `alert` entry), `prompt` (a note, returns `null`) and `confirm` (a note, returns
  `false`), FR-043;
- wraps `setTimeout`, `setInterval`, `clear*`, `requestAnimationFrame`, `fetch`, `XMLHttpRequest`,
  `WebSocket` and `EventSource` to count what is pending (FR-036, FR-041); a nested `Worker` isn't
  offered, since its loop couldn't be watched for the popup;
- reports uncaught errors (`error`) and unhandled rejections (`unhandledrejection`) with name,
  message and line (FR-035), and keeps running.

**The end of a run** (FR-036): after the code's body settles, and after every wrapped callback or
settled request, the runtime posts itself a message on a private `MessageChannel`. That message is
a task, so it runs only once the microtask queue is empty; if nothing is pending then, the run has
nothing left to do and the runtime reports the end. A promise that never settles with nothing
pending ends the run, as the spec's edge cases set.

## R19. Blocking and the stuck popup

**Decision**: the page pings the worker over the port every 250 ms; the worker's handler answers
at once with the nonce. A ping is a task, so a loop, a long calculation or a microtask chain that
never yields leaves it unanswered, while a worker waiting on a 60-second timer answers every ping
(FR-037, FR-048, SC-004). The page keeps `blockedSince`, the `performance.now()` of the oldest
unanswered ping:

- 5 s blocked → `stuck: due`; shown when the window is on screen, not minimized, not showing its
  specs (FR-050), without bringing it to the front or taking focus from another window;
- Keep waiting or Escape → asks again 5 s later if still blocked (FR-049);
- any answer → the popup closes and "The code is running again." is announced (FR-049);
- while `document.hidden`, the browser slows the page's timers, so detection pauses and
  `blockedSince` restarts when the page shows again.

A popup due between 5.0 s and 5.25 s after blocking starts meets SC-004's 5 to 6 seconds.

## R20. The examples

**Decision**: eleven examples, the design's list, each a module in
`src/apps/playground/examples/` exporting an `Example`. Their comments are site text, in the
design's voice, with no CV fact (FR-031); the CV examples read `cv` only. The code, as it ships
(comments may be tightened during implementation, never with a CV fact):

**Welcome** (start, `to-end`)

```ts
// Welcome to the Playground, a TypeScript editor that runs in your browser.
// Errors show as you type, and pointing at a name shows its type.
// Run the code with Cmd+Enter (Ctrl+Enter on Windows and Linux):
// what it logs shows in Logs.

type Greeting = { name: string; times: number };

function greet({ name, times }: Greeting): string {
  return `Hello, ${name}! `.repeat(times).trim();
}

console.log(greet({ name: "TypeScript", times: 2 }));

// The CV is here too, as typed data. Try typing cv. to see what it holds.
console.log(cv.basics?.label);
```

(The comment's key names follow the visitor's system: `Cmd+Enter` on a Mac, `Ctrl+Enter`
elsewhere; the example's text is built with the key label.)

**Basic types** (types, `to-end`)

```ts
// TypeScript works out most types by itself. Point at each name to see its type.
const title = "Playground";
const lines = 12;
const tags = ["types", "checks"];
const point = { x: 3, y: 4 };

// Some types are written out, where they say what a value may be.
let status: "draft" | "done" = "draft";
status = "done";

const distance = Math.hypot(point.x, point.y);
console.log(title, lines, tags.join(", "), distance, status);
```

**Narrowing** (types, `to-end`)

```ts
// A union is narrowed by checks TypeScript understands.
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "label"; text: string };

function describe(shape: Shape): string {
  if ("text" in shape) return `a label: ${shape.text}`;  // narrowed by "in"
  switch (shape.kind) {                                   // narrowed by a field
    case "circle": return `a circle of area ${(Math.PI * shape.radius ** 2).toFixed(1)}`;
    case "square": return `a square of area ${shape.side ** 2}`;
  }
}

function size(value: string | number): number {
  return typeof value === "string" ? value.length : value; // narrowed by typeof
}

console.log(describe({ kind: "circle", radius: 2 }));
console.log(describe({ kind: "label", text: "hello" }));
console.log(size("four"), size(4));
```

**Generics** (types, `to-end`)

```ts
// A generic function keeps the exact type of what it is given.
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

const word = first(["alpha", "beta"]);   // string | undefined
const number = first([1, 2, 3]);         // number | undefined

// A keyed lookup: the result's type follows the key.
function pick<T, K extends keyof T>(value: T, key: K): T[K] {
  return value[key];
}

const settings = { theme: "night", size: 13, wrap: false };
console.log(word, number, pick(settings, "size"), pick(settings, "wrap"));
```

**Timers and promises** (running, `to-end`)

```ts
// A run stays going while timers are pending. Watch the toolbar count them down.
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

console.log("Starting");
setTimeout(() => console.info("A 5 second timer fired"), 5_000);
console.info("Waiting 2 seconds");
await wait(2_000);
console.log("Done waiting");
// The run ends when the last timer has fired and nothing is left to do.
```

**An interval** (running, `interval`)

```ts
// An interval repeats until it is cleared, so this run goes on until you press Stop.
let count = 0;
setInterval(() => {
  count += 1;
  console.log(`Tick ${count}`);
}, 1_000);
```

**Catching errors** (running, `to-end`)

```ts
// An error that is caught doesn't end the run. The logs show what was caught.
function parseAge(text: string): number {
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) throw new RangeError(`Not an age: ${text}`);
  return age;
}

for (const text of ["42", "forty-two"]) {
  try {
    console.log(parseAge(text));
  } catch (error) {
    console.error(error);
  }
}
```

**An endless loop** (running, `endless`)

```ts
// This loop never ends and never pauses. After 5 seconds the Playground asks
// whether to stop it. The rest of the site keeps working meanwhile.
let turns = 0;
while (true) {
  turns += 1;
}
```

**Projects, newest first** (cv, `to-end`)

```ts
// The CV's projects, sorted by when they started, newest first.
// Point at projects to see its type: optional fields may be missing.
const dated = (cv.projects ?? []).flatMap((project) =>
  project.startDate === undefined ? [] : [{ name: project.name ?? "", start: project.startDate }],
);

dated.sort((a, b) => b.start.localeCompare(a.start));

for (const { name, start } of dated) {
  console.log(start.slice(0, 4), name);
}
```

**Skills at a glance** (cv, `to-end`)

```ts
// How many keywords each group of the CV's skills holds.
const groups = cv.skills ?? [];
const widest = Math.max(0, ...groups.map((group) => (group.name ?? "").length));

for (const group of groups) {
  const name = (group.name ?? "").padEnd(widest);
  console.log(`${name}  ${group.keywords?.length ?? 0}`);
}
```

**Find a skill** (cv, `to-end`)

```ts
// Searches the CV's skills. The result is a group or undefined, and
// TypeScript makes the code say what happens in each case.
function findSkill(word: string): ResumeSkill | undefined {
  const wanted = word.toLowerCase();
  return cv.skills?.find((group) =>
    group.keywords?.some((keyword) => keyword.toLowerCase() === wanted),
  );
}

const found = findSkill(cv.skills?.[0]?.keywords?.[0] ?? "");
console.log(found === undefined ? "Not found" : `In ${found.name ?? "a group"}`);
console.log(findSkill("cobol") === undefined ? "Not found" : "Found");
```

The examples test (FR-030, SC-008) loads each in the built site's Playground with the default
options, asserts no diagnostics, runs every `to-end` example to `finished`, and compares the CV
examples' logs with values computed from `resume.json` in the test, never typed by hand (FR-075).
The `"cobol"` search word is site text, not a CV fact; the test checks it isn't in the CV
document, so its line logs "Not found".

## R21. The amendments of 005 and 006

**Decision**: as [contracts/shell.md](./contracts/shell.md) sets. The 005 amendment's design
change (the window menu and About this site without the two shortcuts) is drawn in 005's interim
mockup pages and exported again, with a dated line in 005's `review.md`, in `docs:` commits before
the code. 006's amendment changes only the Terminal's text and needs no design (design/review.md,
"Not reviewed here").

## R22. Tokens and the look

**Decision**:

- **Tokens**: the design README's proposed tokens go into `packages/tokens/penpot/tokens.json`
  under the interim provision's hand-written export, with the two new base colors
  (`color.base.lilac-wash`, `color.base.rose-wash`), and the token output is regenerated. Where an
  existing token already holds the value, the design README's name refers to it rather than
  adding a token (`size.code-line` and `font-size.code` are checked against 006's code tokens
  first); any rename is written into the design README in a `docs:` commit before code, as 007 R13
  did.
- **The editor's colors**: a Monaco theme (`defineTheme`, base `vs-dark`) built in the engine from
  values the interface passes from `tokens.generated.ts` (contracts/engine.md), never literals:
  the syntax colors by TypeScript token class, the surface, line numbers, cursor, selection,
  occurrence band, error and warning colors. Monaco's widgets (hover, suggestions, peek, rename,
  palette, find) are restyled in `engine/editor.css` with `var(--token-…)` only, to the design's
  raised panels; the token check reads that file like any site style sheet (FR-068).
- **Icons**: the design's own glyphs (the lightbulb, the suggestion kind letters, close, the error
  and warning marks) replace Monaco's for every state the mockup draws, by CSS on Monaco's icon
  classes with the site's SVGs. Monaco's icon font, `codicon.ttf` (MIT, in Monaco's package), stays
  for icons of widgets the design doesn't draw (the find widget's toggles); it is an icon font, not
  a text face, and is loaded only with the engine. **Verify** that the fonts check (004
  contracts/fonts.md) scopes to text faces; if it lists every served font, the part names the
  engine's icon font as the editor's, through its own rule, not an exception.
- Forced colors, reduced motion and zoom as wireframes.md Accessibility sets; Monaco's own
  `forcedColors` handling plus our CSS for the marks (wavy underlines in `CanvasText` and
  `LinkText`), FR-069, FR-070.

## R23. Screen readers

**Decision**: the editor is created with `ariaLabel: "Code editor"`, its description (site text)
as `aria-describedby` on the editor's input area, and `accessibilitySupport: 'on'`, Monaco's
screen-reader mode, so the code is readable line by line (FR-063); Monaco can't detect a screen
reader in a browser, so `auto` would leave it off. **Verify** in the keyboard and screen-reader
checks that `on` keeps every FR-015 feature (folding, several cursors); fallback: `auto` with the
accessibility help's toggle named in the description. Announcements go through the shell's
`Announcer` (005), politely, never moving focus: the download (start, each 25%, end, failure),
the error count after a pause, log entries summed at most once a second, a run's start, its timer
count when it changes and its end, messages, and the popup closing by itself (FR-064 to FR-066).
F8 and `Shift+F8`, and Monaco's hover on `Cmd+K Cmd+I`, are read through Monaco's own live regions.

## R24. Stop, crashes and memory

**Decision**:

- **Stop** (FR-038): the page calls `terminate()` on the worker through the bootstrap (the frame's
  thread is free), then removes the iframe, and logs "Stopped after [n] s". `terminate` interrupts a
  running loop at once; one long native call ends when it returns. The check measures Stop under
  an endless loop within 1 s (SC-003).
- **Close, reload, leaving** (FR-046): the window's `onClose` and the page's `pagehide` stop the
  run the same way; nothing of a run outlives its iframe.
- **A crash or out of memory** (FR-045, amended 2026-10-30), where the page lives on: a worker `error` event with no message, the iframe's
  `load` of a blank document, or the heartbeat lost while the bootstrap still answers mean the
  worker died: the run ends `crashed`, the logs say it stopped unexpectedly, or ran out of memory
  when the error says so, and the next run makes a new frame. A single huge allocation throws a
  catchable `RangeError`, logged as any error.
- **Verified in implementation (T025, T089), and FR-045 amended 2026-10-30**: Chromium loses the
  whole page when a run exhausts memory (its renderer crashes at about 3.8 GB), and no page code
  can catch a process crash. So the owner amended FR-045 and FR-040: the page may crash when the
  browser ends it, and the run's note and a working next run are required wherever the page lives
  on. Firefox and WebKit reached the tests' 6 GB cap with no failure, the page still answering.

## R25. Checks

**Decision**:

- **Unit tests in Node** (`fast`): options, share-link encoding and reading (round trips of every
  example and of 8,000-character edges, cut-off, altered and garbled links), the session store, the
  log book's limits, value formatting (`Shown`), the source-map decoder, the download state
  machine, kept code, the keys table and the key conflict check (R12), `os-core` geometry and
  shortcuts, the CV types plugin.
- **Browser tests on the real build** (`slow`), in `packages/web/test/playground/`, with a
  `playground.ts` helper that opens the Playground, waits for the editor, types, runs and reads the
  logs. Chromium on every pull request's local run; the sandbox, memory and key tests also in
  Firefox and WebKit (Playwright's own engines) in the owner's local run, which `npm run verify`
  includes.
- **A test for another site** (FR-041, FR-075): a second local server on another host
  (`localhost` against the site's `127.0.0.1`, two sites) that answers with CORS and records the
  request; the code's `fetch` reaches it with `Origin: null` and no `Cookie`.
- **Site check**: a new part, `playground` (contracts/cli.md), and the states of the Playground in
  `accessibility`, `keyboard`, `offline`, `other-sites`, `layout`, `modes`, `fonts` and
  `lighthouse`; the TypeScript download's bytes are reported, and `lighthouse` asserts the site
  root's first load fetches none of `/playground/` (SC-009).
- **Size budget**: a test reads the built `os` script's brotli size and fails above the recorded
  size plus 45 KB (R2).
- **Timings**: SC-001's 15 s on 10 Mbit/s through CDP throttling in the `playground` part; SC-002
  with 300 lines of code; SC-004 between 5 and 6 s; SC-005 click and key response within 100 ms
  while a loop runs.

## R26. Manual checks

Screen readers on desktop (SC-010, story 6), the keys tried by hand in each browser with a screen
reader running, forced colors in Edge, text-only zoom in Firefox, and the look against the design
exports, as quickstart.md lists. Under the interim provision on deferred manual checks they may
wait for the final testing phase, each kept as an open task in `tasks.md` and listed in the pull
request. Every automated check above still runs and passes before merge.
