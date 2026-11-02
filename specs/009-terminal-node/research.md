# Research: Node in the Terminal

Decisions for [plan.md](./plan.md). The owner chose on 2026-11-02 to behave like Node rather than
run Node, and to keep a simple version 1. R3 and R5 rest on a probe run on 2026-11-02 in Playwright's
Chromium 156, Firefox 157 and WebKit 27.2: a `sandbox="allow-scripts"` `srcdoc` frame with the policy of
R2, making a classic worker from a `Blob`.

## R1: Runtime

- **Decision**: a Node-compatible runtime written for this site, on the browser's JavaScript engine.
- **Rationale**: it needs no vendor or server, works offline, and reuses the sandbox 008 already proved.
- **Alternatives**: WebAssembly Node (WebContainers, BrowserPod) needs site-wide cross-origin isolation
  and a third-party runtime. A server-side microVM needs a backend and anonymous compute. The owner
  rejected both.

## R2: Sandbox

- **Decision**: 008's approach: a fresh sandboxed `srcdoc` frame per program, in a hidden host on
  `document.body`, and a classic worker from a `Blob`. It reuses 008's `bootstrap.ts` unchanged, with its
  own policy:
  `default-src 'none'; script-src '<bootstrap hash>' 'unsafe-eval'; worker-src blob:; connect-src 'none'`.
  Before any program code runs, the runtime removes `fetch`, `XMLHttpRequest`, `WebSocket`,
  `EventSource`, `Worker`, `SharedWorker`, `BroadcastChannel`, `indexedDB`, `caches` and `importScripts`,
  and takes its port into a closure as 008's runtime does.
  `fetch` is then put back as a function that always rejects, so a program's `.catch` gets the failure.
- **Rationale**: `connect-src 'none'` is what enforces FR-023, and removing the names gives a readable
  error and FR-025. `'unsafe-eval'` applies only inside the opaque-origin frame, which holds nothing, and
  is needed by R3. Probe: `fetch` and `importScripts` were blocked in all three engines. `WebSocket`
  constructs in Chromium but can't connect, so it is removed too. `Worker` deletes cleanly in all three.
- **Alternatives**: sharing 008's policy, whose `connect-src *` breaks 006 FR-022, and whose lack of
  `'unsafe-eval'` rules out R3.

## R3: Running code

- **Decision**: each file is compiled when first loaded with indirect `eval`, as
  `(function (exports, require, module, __filename, __dirname) {<source>\n})\n//# sourceURL=<path>`,
  all on the source's own lines, as Node's wrapper is. `new Function` adds lines, so it isn't used.
- **Rationale**: `require` is synchronous and paths can be computed, so code can't be prepared up front.
  Probe: Chromium and Firefox report `/home/guest/a.js:3:9` for this form, the correct place.
- **Alternatives**: blob-URL modules for everything, which can't serve a synchronous `require` and would
  need two mechanisms.

## R4: ES modules

- **Decision**: a parser (`acorn`) finds `import`, `export` and `import.meta`, and rewrites them in place,
  on the same lines, into an `async` wrapper of the R3 form that takes a loader and an exports object.
  `.mjs` and `.mts` are modules, `.cjs` and `.cts` CommonJS, and `.js` and `.ts` are CommonJS unless their
  syntax says module, as Node detects.
- **Rationale**: one mechanism for both kinds, one stack form, and top-level `await` for free.
- **Known difference**: imported bindings are read once the imported module has run, so they aren't live.
  This shows only with cycles or a module that reassigns its own exports. Recorded in
  [contracts/node-api.md](./contracts/node-api.md).
- **Alternatives**: blob-URL modules, which keep live bindings but need `blob:` in `script-src`, and
  specifier rewriting anyway.

## R5: Errors and stacks

- **Decision**: the runtime prints errors itself in Node's form (FR-017). A syntax error takes its message
  from the engine and its place from `acorn`. A stack is read per engine into frames; frames in the runtime
  are dropped, and frames with a known file are printed as `at name (path:line:col)`. TypeScript places go
  through the source map (R12), using 008's `source-map.ts`.
- **Evidence from the probe**:

| Engine | Thrown error's stack | Syntax error |
|--------|----------------------|--------------|
| Chromium | `at foo (/home/guest/a.js:3:9)` | Message, **no place**: needs the parser |
| Firefox | `foo@/home/guest/a.js:3:9` | Message and `lineNumber` |
| WebKit | `foo@` with **no file or place**, and `lineNumber` 3 on the error | Message and `lineNumber` |

- **WebKit's limit**: the top place comes from `lineNumber`, and the file is the one being loaded, else the
  entry file, so it can name the wrong file in a program of several files. Its stack lines carry no place,
  so they are left out. FR-017 and FR-020 hold in the common case of one file; Assumptions allow this
  browser difference. A test states the limit so a later WebKit change is noticed.
- **Alternatives**: bundling a stack-mapping library, which can't recover what WebKit doesn't report.

## R6: Starting a program

- **Decision**: `node`, `ts-node` and `tsnode` are site commands of the shell worker: rows of the command
  table, which `help` and Tab already read (FR-007), and out of `LEFT_OUT`. They stay out of
  `STANDARD_COMMANDS`, the list handed to just-bash, whose own `node` is never used. The shell expands the words, so `node $FILE` and `A=1 node a.js` work. The command parses the typed line, and
  it is a program only if the line is one simple command of that name, with no redirect, background,
  or command or process substitution. Otherwise it prints FR-006's message with status 1. `--version`,
  `--help`, no script and bad options are answered there too. A real run returns a new `program` effect with
  the program's request, and the line ends at once.
- **Rationale**: the shell line is over before the program starts, so the 5-second limit, the worker's
  queue and the restart on Ctrl+C never touch it. FR-069 needs no exception in code, and just-bash isn't
  involved in what a program does.
- **Alternatives**: a long-running shell command, which pipes would need later, but which means streaming
  through just-bash's batch result and exempting it from every limit. See R14.

## R7: Output

- **Decision**: output reaches the page on the program's port and is added to the running entry, each flush
  a new text node carrying its stream. Within an allowance by the clock the runtime sends at once, so a
  blocked loop's output still arrives; past it, it holds output until the allowance refills, as 008's runtime
  does. The page flushes to the session every 100 ms at most.
- **Rationale**: FR-009 asks for 250 ms. Append-only nodes mean only new output renders.

## R8: Ctrl+C and signals

- **Decision**: the runtime tells the page when a `SIGINT` handler is added or removed. Ctrl+C with no
  handler, or a second Ctrl+C for this program, terminates the worker and removes the frame. With a handler,
  the first Ctrl+C posts a message the runtime turns into the event.
- **Rationale**: a worker can't be interrupted, so a handler can run only when the program yields. Real Node
  behaves the same in a tight loop. No `SharedArrayBuffer` is needed. Termination can't be blocked, and the
  second press guarantees FR-033, however the program lies about its handlers.
- **Alternatives**: `SharedArrayBuffer` and `Atomics`, which need site-wide isolation and still can't
  interrupt a loop.

## R9: Limits

- **Decision**: output is capped at 1 MB by both the runtime and the page, which doesn't trust the count, and
  the program is then ended with 006's `stopped.output` words and status 130. There is no time limit. One
  still-running line shows after 5 s with nothing printed. A worker that dies with `memory` in its error gets
  FR-028's message, and any other death a generic one, both status 1.
- **Rationale**: browsers give pages no memory cap, so a tab crash stays possible (spec Assumptions). 008's
  memory test shows how it can be observed; a test states what each engine does.

## R10: Files

- **Decision**: the `program` effect carries a snapshot of the Terminal's readable files, with owners and
  protection. The runtime keeps its own copy, applies the same rules and 1 MB limit at once, and sends each
  change as the whole new file or a removal. The page keeps the latest change per path, so its memory stays
  bounded and it ends the program if the changes exceed the limit. When the program ends, however it ends,
  the page sends them to the shell worker in one `apply` message, through `TerminalFs`, which checks the
  rules again.
- **Rationale**: `readFileSync` must answer at once and a worker can't wait on the page, so a snapshot is the
  only way without `SharedArrayBuffer`. Changes sent as they happen survive termination (FR-030).
- **Alternatives**: writing the whole file set back at the end, which a stop would lose.

## R11: Node APIs

- **Decision**: written here: `process`, `console`, timers, `fs`, `fs/promises`, `path`, `events`, `assert`,
  `os`, `timers`, `timers/promises`, `url`, and the module loader. From packages: `buffer` for `Buffer` and
  `node-inspect-extracted` for `util.inspect`. The exact list is
  [contracts/node-api.md](./contracts/node-api.md), and `util.isDeepStrictEqual` comes with the inspect
  package or is written here.
- **Rationale**: `Buffer` and `inspect` are large and detailed enough that parity by hand isn't credible, and
  FR-011 is about exactly that output. The rest are small, and parity tests against the real Node 26 that runs
  the repository's tests check them (SC-006).
- **Alternatives**: `node-stdlib-browser`, which brings far more than FR-013 offers, along with `stream` and
  `crypto` polyfills.

## R12: TypeScript

- **Decision**: a compile mode in the engine's existing `ts.worker`, chosen by the worker's name: started as
  `compile`, it answers compile requests instead of starting Monaco's worker. Given the snapshot and a root, it
  returns diagnostics for the root's program under strict options, unless run by `node`, and JavaScript and a
  source map for every TypeScript file in the visitor's files. The page gets the engine through 008's
  `loadEngine`, reporting progress in its 25% steps as output lines, and starts the worker by address from the
  manifest. It **does not import the engine's entry**, so Monaco never loads on the page: the host gives
  `loadEngine` the browser's environment with `linkStyle` and `importModule` doing nothing. `loadEngine` waits
  and retries while offline, as the Playground's window wants, so the host treats its `offline` state as the end
  of the run: it aborts, and says FR-037's words with the size from `data-playground-bytes`. `ENGINE_API` goes
  to 2 and the manifest gains `compiler`, so an older copy isn't used for this. Types come from a hand-written
  `node.d.ts` holding exactly what the runtime offers.
- **Rationale**: no second copy of TypeScript, and FR-037's sharing comes from the shared cache. Engine workers
  are built as single `iife` files that share no code, so a separate `compile.worker` would carry its own copy.
  `ts.worker` is 6.9 MB of the engine's 11.6 MB, so that copy would add about 60% to every Playground download.
  Phones download only when a visitor asks. A hand-written `.d.ts` makes something not offered a type error,
  which is accurate here, where `@types/node` would describe APIs that don't exist.
- **Known cost**: anyone who has the Playground's engine downloads it again once, as the bundle changes
  anyway. A JavaScript program that requires a `.ts` file gets an error saying a TypeScript program must
  start from a TypeScript file, since compiling happens before the program starts.
- **Alternatives**: importing the engine's entry, which brings Monaco to phones; a separate compile worker, for
  the size above; TypeScript 7, which has no browser build (008 R5).

## R13: Delivery

- **Decision**: a separate `assets/program-<hash>.js` holds the page's program host, the bootstrap, the
  policy and the runtime's text. Like the engine, the `os` script opens it by a computed address, read from a
  `data-program` attribute on `#os` as the engine's is from `data-playground`, so the build still emits one `os`
  file. It is precached with the rest of `assets`, which gives offline use after one visit (FR-036), and loads
  only at a first program. `acorn` and the rest stay inside the runtime's text. The build's check that `assets`
  holds one worker script counts every script missing from Vite's manifest, so it must be told this file's
  name.
- **Rationale**: a build of `2c4906b` on 2026-11-02 gives an `os` script of **147,861 bytes gzipped, measured
  as the build's check measures it, against a budget of 149,778, leaving 1,917 bytes**. Session changes, the
  Stop key and the words must fit in that; all else lives in this bundle or the shell worker. If they don't fit,
  the session's program code moves here first, and raising the budget is the owner's call.

## R14: Room for later

- **Decision**: nothing built for a REPL or pipes now, but three choices keep them open. The program port's
  messages are streams by name, so `stdin` can be added. The host takes a request and returns events, knowing
  nothing of the session. The sole-command check is one function, so a later feature can replace R6's
  effect with a command that waits on the host.
- **Rationale**: the owner's scope for this version, recorded in the spec's Assumptions.

## R15: Tests

- **Decision**: fast tests for the shell command, session, host (with a fake worker) and the runtime's
  modules; parity tests that run scripts under the runtime in a test harness and under real Node, and compare
  text (SC-006); browser tests of the built site for FR-043, in a new site-check part `program`, with sandbox
  and stack tests in all three engines in the owner's run, as 008 does.
