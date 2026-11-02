---

description: "Task list for Node in the Terminal"
---

# Tasks: Node in the Terminal

**Input**: Design documents from `/specs/009-terminal-node/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/commands.md](./contracts/commands.md),
[contracts/program.md](./contracts/program.md), [contracts/node-api.md](./contracts/node-api.md),
[quickstart.md](./quickstart.md), and the design in [design/](./design/):
[wireframes.md](./design/wireframes.md), the interim local mockup in `design/mockup/` and the signed
[review.md](./design/review.md) (commit `cb38050`, approved 2026-11-02).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one automated
test. Each test task names the `009-terminal-node-FR-###` IDs it covers, and every FR in spec.md
(FR-001 to FR-043) is covered by at least one test task (see Requirement Coverage at the end). A test's
name carries the full ID.

**Organization**: Tasks are grouped by user story. The shell command is in US1, because every story runs
through it. The amendment of 006 (FR-042) and the pull request's browser checks (FR-043) have their own
phases after the stories, and each story adds its own browser cases to the `program` part as it goes.

**Test locations** (a refinement of plan.md's table, whose paths stay under the same folder):

- `packages/web/test/terminal/program/unit/`: no browser. In Vitest's `fast` project, as
  `packages/web/test/playground/unit/` is, so CI runs them (T002).
- `packages/web/test/terminal/program/*.test.ts`: real browser, against the built site, in the `slow`
  project. `sandbox`, `stacks`, `stop` and `memory` also join `npm run test:engines` (T088), the owner's
  three-engine run of research R15.
- `tools/site-check/test/program.test.ts`: the part `program` of the site check (`tools/site-check/src/parts/program.ts`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US7)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 009-terminal-node-FR-016"
- `apps/terminal/` below means `packages/web/src/apps/terminal/`; `program/` means
  `packages/web/src/apps/terminal/program/`; `runtime/` means `packages/web/src/apps/terminal/program/runtime/`

## Not in this feature

As the spec's Assumptions set: an interactive prompt, standard input, pipes and redirects, packages and
`npm`, network access, native modules, `http`, `net`, `crypto`, `child_process`, `worker_threads`,
`ts-node --transpile-only` and any other option beyond FR-003 and FR-005. Nothing is built for a REPL or
pipes now, but research R14's three choices stay as they are: the port's messages are streams by name, the
host knows nothing of the session, and the sole-command check is one function. Don't widen this.

## Rules for every task

- Run `nvm use` first (Node 26). `tsnode` is the same command as `ts-node` throughout.
- Parity scripts run under the real Node on the real disk: they use a temporary working folder and relative
  paths only, never `/tmp` or another absolute path.
- The `os` script has **1,917 bytes gzipped left** (research R13). Only the session's changes, the Stop key and
  the words go in it; everything else is in the `program` bundle or the shell worker. If it doesn't fit, move the
  session's program code to the bundle first. Raising `OS_BUDGET` is the owner's call: mark `BLOCKED:` instead.
- All visible words come from `design/wireframes.md`'s Site text table, verbatim. No literal design values: the
  Stop key uses existing key styles and tokens.
- No AI or Claude attribution in commits or the pull request (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and where the tests live

- [X] T001 Add `acorn` 8.19.0, `buffer` 6.0.3 and `node-inspect-extracted` 3.3.4, pinned to exact versions, to `packages/web/package.json` and `package-lock.json` with `npm install`. Confirm each is MIT, and that a `require` of each works under Node 26. Add `rolldown` 1.2.15, the version Vite 8.3.5 already installs, pinned to the root `devDependencies`, for T012's harness only (plan.md's dependency table).
- [X] T002 [P] Add `packages/web/test/terminal/program/unit` to `FAST_TEST_GLOBS` in `tools/traceability/src/files.ts`, beside `packages/web/test/playground/unit`, and update any test in `tools/traceability/test/` that lists those globs. CI runs only the `fast` project and the site check, so without this the runtime's tests would never run on a pull request.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The types, words, policy, bundle, test harness and bare host every story builds on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Confirm the design gate: `specs/009-terminal-node/design/` has `wireframes.md`, the interim local mockup with its PNG exports (`mockup/desktop-*-1440.png`, `mockup/phone-*-375.png`, `mockup/phone-*-320.png`) and a signed `review.md` naming commit `cb38050`. No task that creates or changes UI starts before this. Record the result here.
  **Result (2026-11-02)**: passed. `wireframes.md`, 9 desktop, 9 phone-375 and 9 phone-320 PNGs, and `review.md` signed and naming `cb38050`.
- [X] T004 [P] Add the shared types in `packages/web/src/apps/terminal/program/messages.ts`: `ProgramRequest` as data-model.md sets (`command` is `node` or `ts-node`; `script` an absolute path, or null with `-e` or `-p`; `code`, `print`, `args`, `cwd`, `env`, `files`), the file snapshot (`entries` of `{ path, kind: 'file' | 'folder', owner, protected, text?, binary? }`; for a `binary` file `text` holds one character a byte; `bytes`), `FileChanges`, `EndReason` (`exit`, `uncaught`, `type-error`, `interrupted`, `output`, `memory`, `died`, `closed`), and the validators of contracts/program.md that check every field of a worker's message. Add `{ kind: 'program'; request: ProgramRequest }` to `Effect` in `apps/terminal/engine/block.ts`, and `{ type: 'apply'; id; changes }` and `{ type: 'applied'; id; files }` to `apps/terminal/shell/protocol.ts`.
- [X] T005 [P] Add this feature's words: the page's to `packages/web/src/site-text.ts` (still running on desktop and phone, the Stop key's name `Stop the program`, the download line, TypeScript offline, out of memory, died, `Program ended, status {n}.`) and the worker's to `packages/web/src/shell-text.ts` (no script, larger line, version, usage, the commands' `help` rows), verbatim from `design/wireframes.md` and contracts/commands.md. Update `packages/web/test/terminal/site-text.test.ts` if it lists them.
- [X] T006 [P] Write `packages/web/test/terminal/program/unit/policy.test.ts`, covers 009-terminal-node-FR-023: `programPolicy(bootstrap)` is exactly `default-src 'none'; script-src '<bootstrap hash>' 'unsafe-eval'; worker-src blob:; connect-src 'none'`, and 008's `runnerPolicy` is unchanged.
- [X] T007 Add `programPolicy` to `packages/web/scripts/runner-policy.ts` (research R2), and a check like `checkRunnerScripts` for the program's scripts. Make T006 pass.
- [X] T008 Write the first `runtime/main.ts` (research R2): before anything else it takes its port into a closure, as 008's `apps/playground/engine/runner/runtime.ts` does, and removes `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `Worker`, `SharedWorker`, `BroadcastChannel`, `indexedDB`, `caches` and `importScripts` from the worker's global and its prototypes. Then it waits for `{ run: true, request, compiled? }`. In `packages/web/scripts/runner-scripts.ts`, factor out a shared `scriptText` and bundle this runtime with it into one classic script. `apps/playground/engine/runner/bootstrap.ts` is reused unchanged.
- [X] T009 [P] Extend `packages/web/test/build.test.ts`, covers 009-terminal-node-FR-036: the build emits one `assets/program-<hash>.js`; the shell worker check still finds exactly one worker script; there is still one `os` file, which doesn't import the bundle statically and is within `OS_BUDGET`; `#os` carries `data-program` with the bundle's address; `acorn`, `buffer` and `node-inspect-extracted` appear nowhere but in the bundle; and the bundle is in the service worker's precache list.
- [X] T010 Build the bundle (research R13) in `packages/web/scripts/build-site.ts`: it holds the page's host (`program/host.ts`), the bootstrap, the policy and the runtime's text; tell the "one worker script" check its name; add `data-program` to `#os` in `packages/web/src/pages/ShellPage.tsx`, read as `data-playground` is. Add a stub entry for the host so the bundle builds. Make T009 pass.
- [X] T011 [P] Write the bundle's license file with `packages/web/scripts/shell-licenses.ts`, as 006 R40 does for the shell worker: the name, version and license text of `acorn`, `buffer` and `node-inspect-extracted` in `assets/program-licenses-<hash>.txt`, named in a comment at the top of the bundle. These packages are MIT, whose notice must stay with the copy, and plan.md doesn't list this file. Add a case to `packages/web/test/build.test.ts`.
- [X] T012 Write the test harness `packages/web/test/terminal/program/unit/helpers/harness.ts`: `runProgram(request, { signals?, timeoutMs? })` bundles `runtime/main.ts` with `rolldown` directly, for the browser, so `buffer` is the npm package and not Node's built-in. It never goes through `packages/web/scripts/runner-scripts.ts`, which imports `vite`: `tools/traceability/test/test-sets.test.ts` fails any fast test that reaches `vite` or `build-site.ts`. It runs that text in a Node `worker_threads` worker, inside a `vm` context holding only what a browser's worker offers (`self`, the port shim, timers, `URL`, `URLSearchParams`, `TextEncoder`, `TextDecoder`, `structuredClone`, `performance`, `queueMicrotask`), and returns its messages. Node's own `process`, `Buffer`, `require` and `setImmediate` are not in that context, so they can't hide a name the runtime forgot; a case proves it by running a runtime stub that defines nothing and seeing `typeof process`, `Buffer` and `setImmediate` as `undefined`; `underNode(files, argv)` runs the same files with the real `process.execPath` in a new temporary folder with relative paths; `comparable(text)` leaves out stack lines and the version line (SC-006).
- [X] T013 [P] Write `packages/web/test/terminal/program/unit/host.test.ts` with a fake worker and frame, covers 009-terminal-node-FR-034: `start` returns a handle, `onEnded` fires exactly once however the end comes, `close()` ends with `closed` and removes the frame, a message with the wrong nonce or a bad field is dropped, and a code outside 0–255 is masked as a process's is.
- [X] T014 Write the bare host in `program/host.ts` to contracts/program.md's `start(request, events): ProgramHandle`: a fresh sandboxed `srcdoc` frame per program (`sandbox="allow-scripts"`) with `programPolicy`, inside a hidden `terminal-runners` host on `document.body` so a program survives the content unmounting, a nonce on every message, a classic worker from a `Blob`, and the state machine of data-model.md. It imports nothing from the session (research R14). Make T013 pass.
- [X] T015 Add the part `program` to the site check: `PARTS` in `tools/site-check/src/report.ts` (right after `playground`), `tools/site-check/src/check.ts`, a new `tools/site-check/src/parts/program.ts` with a helper that opens the Terminal, writes a file, runs a line and reads the output, in both shells, and the expected list in `tools/site-check/test/cli.test.ts`. Keep the part short: it counts toward the site check's time budgets in `tools/site-check/test/performance.test.ts`.

**Checkpoint**: The bundle builds and loads a runtime that does nothing yet, and the host can start and end it.

---

## Phase 3: User Story 1 - Write a script, run it and see what it prints (Priority: P1) 🎯 MVP

**Goal**: `node hello.js`, `node -e` and `node -p` run in the sandbox, print as Node prints, with output arriving as it is printed, and `$?` set.

**Independent Test**: create a file that logs values and uses a timer, run it with `node`, and confirm that output appears as it is printed and the prompt returns (quickstart 1, 2).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T016 [P] [US1] Write `packages/web/test/terminal/program/unit/command.test.ts`, covers 009-terminal-node-FR-001, 009-terminal-node-FR-002, 009-terminal-node-FR-003, 009-terminal-node-FR-004, 009-terminal-node-FR-005, 009-terminal-node-FR-006, 009-terminal-node-FR-007 and 009-terminal-node-FR-042, every row of contracts/commands.md: `node a.js x y` and `node a.ts` give a `program` effect with the path resolved from the working folder; `ts-node` and `tsnode` both give `command: 'ts-node'`; `-e` and `-p`; `A=1 node a.js` and `node $FILE` work; no script gives the site text, status 1 and no effect; `-v`, `--version` print `v26.0.0 (browser runtime, not Node.js)` with status 0; `-h`, `--help` give usage, the modules and `contracts/node-api.md`; other options give `node: bad option: --x` with status 9, including `ts-node -e`, as FR-003 offers those to `node` only; a pipe, a redirect, `&&`, `;`, `&`, a loop, a function, command or process substitution and a script run nothing and give status 1 with the words; `help` and Tab list all three; and `python`, `curl` and the other names stay left out.
- [X] T017 [P] [US1] Write `packages/web/test/terminal/program/unit/runtime-loop.test.ts`, covers 009-terminal-node-FR-008 and 009-terminal-node-FR-035: top-level code, then `nextTick`, microtasks, timers and `setImmediate` in Node's order; it ends when nothing is left; `exit` handlers run on a natural end and on `process.exit`, once, with the code.
- [X] T018 [P] [US1] Write `packages/web/test/terminal/program/unit/globals.test.ts`, covers 009-terminal-node-FR-012, 009-terminal-node-FR-015, 009-terminal-node-FR-016 and 009-terminal-node-FR-025: every global of FR-012 and every `process` name in contracts/node-api.md exists; `process.env` and `process.cwd()` start from the request and `chdir` and changes hold inside; `process.stdin` reads as ended at once; `typeof Worker`, `SharedWorker` and `importScripts` are `undefined`, and `new Worker('x')` gives an error the program can catch and read.
- [X] T019 [P] [US1] Write `packages/web/test/terminal/program/unit/modules.test.ts`, covers 009-terminal-node-FR-013: every name of contracts/node-api.md's table but `fs` and `fs/promises` (T069) exists, by `require` and `import`, with and without `node:`.
- [X] T020 [P] [US1] Write `packages/web/test/terminal/program/unit/parity.test.ts`, covers 009-terminal-node-FR-003, 009-terminal-node-FR-010, 009-terminal-node-FR-011, 009-terminal-node-FR-012 and 009-terminal-node-FR-013 (SC-006): a set of scripts run with `harness.ts` and under the real Node print the same text and exit with the same code after `comparable`. Values: primitives, nested objects, arrays, `Map`, `Set`, dates, errors, functions, classes and circular references, without color. Also `-e`, `-p`, `process.exit(3)`, `process.exitCode`, `process.argv`'s tail, and one script per module but `fs` and `fs/promises`, whose parity cases T069 adds, as T073 writes them in US5.
- [X] T021 [P] [US1] Write `packages/web/test/terminal/program/unit/session.test.ts` with a fake host and client, covers 009-terminal-node-FR-009, 009-terminal-node-FR-010 and 009-terminal-node-FR-015: a `program` effect starts the host; output is added to the running entry in order, each flush a new text node carrying its stream, and existing nodes are kept; lines typed meanwhile wait and run in order; when it ends, `state.status` and `state.pipes` hold its status, so `$?` reads it on the next line, the client's `setStatus` gets it, and a new prompt follows; and the shell's folder and variables haven't changed.
- [X] T022 [US1] Update `packages/web/test/terminal/shell/adapter.test.ts` (its `'%s is command not found'` case lists `node`) and any other test of 006 that states `node` is left out, covers 009-terminal-node-FR-042: `node` leaves those lists, and `python`, `curl`, `wget` and `ssh` stay.

### Implementation for User Story 1

- [X] T023 [US1] Add the commands in `apps/terminal/engine/command-table.ts`, `apps/terminal/engine/commands.ts`, `apps/terminal/shell/site-commands.ts` and `apps/terminal/shell/standard.ts`, per research R6: rows of the command table, which `help` and Tab read, with `009-terminal-node-FR-007` added beside `006-terminal-FR-008` on the `help` list in `apps/terminal/Output.tsx` (the `out-help` list, and T090 updates what `data-req.test.tsx` expects of it); out of `LEFT_OUT`, and not in `STANDARD_COMMANDS`, so just-bash's own `node` is never used. `--version`, `--help`, no script and bad options are answered here, in the worker.
- [X] T024 [US1] Write the sole-command check as one function in `apps/terminal/shell/site-commands.ts` (contracts/commands.md, research R14): the typed line parses to one statement, one pipeline and one simple command whose name is literally one of these, with no redirection, no background, and no command or process substitution in its words; assignments before it are allowed and join the environment. Build the `ProgramRequest` with the snapshot of what the visitor can read, in `apps/terminal/shell/adapter.ts`, and return the `program` effect so the line ends at once. Make T016 and T022 pass.
- [X] T025 [P] [US1] Write the event loop in `runtime/loop.ts`: the timers, `setImmediate`, `queueMicrotask`, `nextTick`, the count of what keeps the program alive, and the end, running `exit` handlers as FR-035 sets. Make T017 pass.
- [X] T026 [P] [US1] Write `runtime/console.ts`, on `node-inspect-extracted`: every method in contracts/node-api.md, without color. Send output by stream name on the port, within an allowance by the clock: at once while it lasts, so a blocked loop's output still arrives, and then held until it refills, as 008's runtime does (research R7).
- [X] T027 [P] [US1] Write `runtime/process.ts`: every name in contracts/node-api.md, with `platform` as `browser`, `version` as `v26.0.0`, `argv` as `[execPath, script, ...args]`, `stdin` ended, and `on`, `once`, `off` and `emit`. Make T018's `process` cases pass.
- [X] T028 [P] [US1] Write `runtime/modules/path.ts` (all of `path.posix`) and `runtime/modules/url.ts`, to contracts/node-api.md.
- [X] T029 [P] [US1] Write `runtime/modules/events.ts` and `runtime/modules/timers.ts` (with `timers/promises`), to contracts/node-api.md.
- [X] T030 [P] [US1] Write `runtime/modules/util.ts` (`inspect` and `types` from `node-inspect-extracted`; `isDeepStrictEqual` from there or written here, research R11) and the `buffer` module on the `buffer` package, to contracts/node-api.md.
- [X] T031 [P] [US1] Write `runtime/modules/assert.ts` (with `assert/strict`) and `runtime/modules/os.ts`, with fixed values that say browser where they can, to contracts/node-api.md.
- [X] T032 [US1] Write `runtime/loader.ts`, per research R3 and R4: each file compiled when first loaded with indirect `eval`, as `(function (exports, require, module, __filename, __dirname) {<source>\n})\n//# sourceURL=<path>`, all on the source's own lines, and never `new Function`; `acorn` finds `import`, `export` and `import.meta` and rewrites them in place, on the same lines, into an `async` wrapper of that form; `.mjs` and `.mts` are modules, `.cjs` and `.cts` CommonJS, `.js` and `.ts` CommonJS unless their syntax says module; built-ins by `require` and `import`, with or without `node:`. Make T019 pass.
- [X] T033 [US1] Finish `runtime/main.ts`: on `{ run: true, … }` set up the globals of FR-012, run the script or the `-e` or `-p` code, print `-p`'s result, and send `{ exit: code }`. Make T020 pass, fixing any difference it finds rather than leaving it out; a difference that can't be fixed goes in contracts/node-api.md's Known differences.
- [X] T034 [US1] Complete the host's output in `program/host.ts` (research R7): collect output and call `onOutput` at most every 100 ms; drop non-strings; keep the order of the two streams.
- [X] T035 [US1] Run programs in `apps/terminal/session.ts` and `apps/terminal/shell-client.ts`, with a small addition to the `os` script (R13): the `program` effect opens the bundle by the computed address from `data-program`, so no code loads before the first program (FR-036). It adds `program: { interrupts, stillShown }`, feeds `running.block`, sets `state.status` and `state.pipes`, and adds the client's `setStatus(state)`. If the bundle can't be loaded, the line ends with the "died" words and status 1, never a blank view. Make T021 pass.
- [X] T036 [US1] Render the running entry in `apps/terminal/Output.tsx`: only new text nodes render, standard error in the existing error tone, `data-req="009-terminal-node-FR-009"` on the running entry's output.
- [X] T037 [US1] Add the part's first cases to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-001 and 009-terminal-node-FR-009: quickstart 1 and 2 in both shells, each line of `tick.js` appearing separately and at most 250 ms after it is printed, then a prompt and `$?` 0.

**Checkpoint**: The MVP. A visitor can write and run JavaScript and read its output.

---

## Phase 4: User Story 2 - See what went wrong (Priority: P2)

**Goal**: errors in Node's form, with the visitor's file, line, code, marker and stack.

**Independent Test**: run a script with a syntax error, one that throws, and one with a rejected promise, and confirm each shows its file, line and message, and sets a non-zero status (quickstart 3, 4).

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T038 [P] [US2] Write `packages/web/test/terminal/program/unit/errors.test.ts`, covers 009-terminal-node-FR-017, 009-terminal-node-FR-018, 009-terminal-node-FR-019 and 009-terminal-node-FR-020: a thrown error prints contracts/commands.md's form (file and line, the code, `^` under the column, name, message, stack, the version line) with `$?` 1; a syntax error prints the same form with none of the program run; an unhandled rejection ends the program unless it handles `unhandledRejection`; an `uncaughtException` handler keeps it alive; `node missing.js` and a missing relative module give `Cannot find module`; `http`, `child_process` and `crypto` also say they aren't available in this Terminal; `lodash` gets the plain form; a script that isn't JavaScript gets the parser's error; and runtime frames never show.
- [X] T039 [P] [US2] Write `packages/web/test/terminal/program/stacks.test.ts`, a real browser in the engine `PLAYGROUND_ENGINE` selects, covers 009-terminal-node-FR-017 and 009-terminal-node-FR-018: the table of research R5, with each engine's top place right in a one-file program. A case states WebKit's limit (no places in stack lines, the top place from the error's `line` and `column`, with no `lineNumber` and no `sourceURL` on a thrown error, and the entry file named when it can't tell), so a later WebKit change is noticed.

### Implementation for User Story 2

- [X] T040 [US2] Write `runtime/errors.ts` (research R5): read a stack per engine into frames, drop the runtime's, print frames with a known file as `at name (path:line:col)`, take the top place from the error's `line` and `column` on WebKit, whose errors have no `lineNumber` (plan.md's Corrections), and print the whole form with the text the program started with. Make T039's thrown-error cases pass.
- [X] T041 [US2] Report syntax errors in `runtime/loader.ts`: the message from the engine, the place from `acorn`, before any of that file runs, for the entry and for files it loads. Make T038's syntax cases pass.
- [X] T042 [US2] Handle what's uncaught in `runtime/loop.ts` and `runtime/process.ts`: `uncaughtException` and `unhandledRejection`, status 1, reason `uncaught`, with `exit` handlers running as in Node.
- [X] T043 [US2] Give `Cannot find module` in `runtime/loader.ts` in Node's form, with `code` and `requireStack`, and the extra words for Node's modules not offered. Make T038 pass.
- [X] T044 [US2] Add quickstart 3 and 4 to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-017 and 009-terminal-node-FR-018 (SC-005): the file and line are in the output, in the error tone, and `$?` is 1.

**Checkpoint**: Stories 1 and 2 give the sandbox's whole purpose, run and see errors, though Ctrl+C isn't wired yet.

---

## Phase 5: User Story 3 - An endless loop can't hurt the site, and Ctrl+C ends it (Priority: P3)

**Goal**: the shell stays live however a program behaves, and Ctrl+C always ends it. The program reaches nothing outside its frame.

**Independent Test**: run a blocking endless loop, confirm the shell still responds, press Ctrl+C, and confirm the program ends within a second with its earlier output kept (quickstart 5 to 10).

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T045 [P] [US3] Extend `packages/web/test/terminal/program/unit/host.test.ts`, covers 009-terminal-node-FR-026, 009-terminal-node-FR-028, 009-terminal-node-FR-031, 009-terminal-node-FR-032 and 009-terminal-node-FR-033: with no handler, `interrupt` terminates the worker and removes the frame; with `{ sigint: true }`, the first posts `{ signal: 'SIGINT' }` and the second terminates, including after the program lies with `{ sigint: false }` or `true`; `{ sigint: false }` then a press terminates; 1 MB by the page's own count stops a program that sends forged or huge messages and never sends `{ limit }`; a worker error with `memory` in it gives reason `memory` and any other death `died`, both status 1.
- [X] T046 [P] [US3] Extend `packages/web/test/terminal/program/unit/session.test.ts`, covers 009-terminal-node-FR-027, 009-terminal-node-FR-031 and 009-terminal-node-FR-034: `^C` shows, output stays, status 130, waiting lines dropped as 006 FR-075 drops them; Ctrl+C with text selected copies and the program carries on; a press during `loading` ends the line with 130; no time limit ends a program; after 5 s with nothing printed one line shows, once, in the shell's words; printing before 5 s restarts that wait; closing, resetting and `pagehide` call the host's `close`.
- [X] T047 [P] [US3] Write `packages/web/test/terminal/program/sandbox.test.ts`, a real browser in the engine `PLAYGROUND_ENGINE` selects, covers 009-terminal-node-FR-022, 009-terminal-node-FR-023 and 009-terminal-node-FR-025 (SC-004), recording every request: deliberate attempts on `document`, `parent`, `top`, `localStorage`, `indexedDB`, `caches`, `document.cookie`, `BroadcastChannel`; `fetch` (inside `try`, and through `self` and its prototypes), `XMLHttpRequest`, `WebSocket`, `EventSource`, `WebTransport`, `importScripts`, dynamic `import()` and `eval`'s `import()`; `new Worker`, and a `Worker` from a saved reference. None reaches anything, no request is seen, and each gives an error the program can catch and read. If `WebTransport` or another name still constructs, add it to T008's list and to research R2.
- [X] T048 [P] [US3] Write `packages/web/test/terminal/program/stop.test.ts`, a real browser in the engine `PLAYGROUND_ENGINE` selects, covers 009-terminal-node-FR-024, 009-terminal-node-FR-031 and 009-terminal-node-FR-033 (SC-002, SC-003): with `while (true) {}` a window moves, an app opens and the Terminal takes typing; Ctrl+C ends it within 1 s; a second Ctrl+C ends a blocked program with a handler, and one whose handler does nothing.
- [X] T049 [P] [US3] Write `packages/web/test/terminal/program/memory.test.ts`, covers 009-terminal-node-FR-028, modelled on 008's `packages/web/test/playground/memory.test.ts`: an allocating program, stating what each engine does; where the browser reports it, the message and status 1.

### Implementation for User Story 3

- [X] T050 [US3] Implement `interrupt` in `program/host.ts` (research R8): the handler's state from `{ sigint }`, the press count per program, terminate and remove the frame, with reason `interrupted` and status 130. Make T045's stop cases pass.
- [X] T051 [US3] First extend `packages/web/test/terminal/program/unit/runtime-loop.test.ts`, covers 009-terminal-node-FR-032 and 009-terminal-node-FR-017: `{ signal: 'SIGINT' }` runs the handler when the program yields, and an error thrown in that handler ends the program as any uncaught error does (spec's Edge Cases). Then send `{ sigint }` from `runtime/process.ts` when a handler is added or removed, and turn `{ signal: 'SIGINT' }` into the event in `runtime/loop.ts`, so it runs when the program yields. No `exit` handlers run after a stop (FR-035).
- [X] T052 [US3] Cap output at 1 MB in `runtime/console.ts` (sends `{ limit: 'output' }`) and in `program/host.ts`, which doesn't trust the runtime's count: end with reason `output`, 006's `stopped.output` line, status 130 and what was shown kept (research R9). The `stopped` line carries `data-req="009-terminal-node-FR-026"` beside its existing IDs, in `apps/terminal/Output.tsx`.
- [X] T053 [US3] End with FR-028's and the "died" words in `program/host.ts` and `apps/terminal/session.ts`: `node: the browser ended this program: it ran out of memory.` and `node: the browser ended this program.`, status 1. Make T045 pass.
- [X] T054 [US3] Wire Ctrl+C in `apps/terminal/session.ts` and `apps/terminal/CommandLine.tsx`: while a program runs, it goes to the host's `interrupt` and not the shell worker's restart; waiting lines are dropped on an end by Ctrl+C. The shell worker's own 5-second limit and restart don't apply, as the line is already over (research R6). Text selected still copies (006 FR-075).
- [X] T055 [US3] Show the still-running line in `apps/terminal/session.ts` (FR-027): after 5 s with nothing printed, once, in the dim tone, in the shell's words (desktop `Still running. Ctrl+C stops it.`, phone `Still running. The Stop key stops it.`), as a `line` node with a new `req` value in `apps/terminal/engine/block.ts`, which `apps/terminal/Output.tsx` renders with `data-req="009-terminal-node-FR-027"`: a `text` node carries no `req` (plan.md's Corrections). The `^C` mark carries `data-req="009-terminal-node-FR-031"`, in `apps/terminal/Output.tsx`. Make T046 pass but for `close`.
- [X] T056 [US3] End a program on close, reset and `pagehide` in `apps/terminal/Terminal.tsx`, `apps/terminal/Pocket.tsx` and `apps/terminal/session.ts` (FR-034), so no frame stays in `terminal-runners`. A program ended by `close` sends no `apply`, and its `onEnded` is dropped by the session's `generation`, as other results from before a reset are: closing empties the visitor's files (006 FR-021). Make T046 pass.
- [X] T057 [US3] Make T047, T048 and T049 pass in Chromium, changing `runtime/main.ts` for anything T047 reaches; T088 adds the other two engines.
- [X] T058 [US3] Add quickstart 5 to 10 and 19 to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-022, 009-terminal-node-FR-023, 009-terminal-node-FR-024, 009-terminal-node-FR-025, 009-terminal-node-FR-026, 009-terminal-node-FR-031, 009-terminal-node-FR-032, 009-terminal-node-FR-033 and 009-terminal-node-FR-034. Use the existing `recordRequests` in `tools/site-check/src/parts/other-sites.ts` for "no request".

**Checkpoint**: Running a visitor's code is now safe on a public site. Stories 1 to 3 together are shippable in spirit, though the single PR carries all seven.

---

## Phase 6: User Story 4 - Run TypeScript (Priority: P4)

**Goal**: `ts-node` checks and runs; `node file.ts` runs without checking; TypeScript comes from the Playground's copy with no second download.

**Independent Test**: run a TypeScript file with a type error and confirm that it reports the error and doesn't run, fix the file, and confirm that it runs (quickstart 13 to 15).

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T059 [P] [US4] Write `packages/web/test/terminal/program/unit/compile.test.ts`, covers 009-terminal-node-FR-002, 009-terminal-node-FR-021 and 009-terminal-node-FR-038: compile mode `check` returns diagnostics as `{ file, line, column, code, message }` for a TypeScript root, and for a JavaScript root; `strip` returns empty diagnostics with JavaScript and a source map for every TypeScript file; the type error prints contracts/commands.md's form with `$?` 1 and nothing run; every name of contracts/node-api.md checks clean under strict options; a name not offered, such as `http`, `document` or `fs.createReadStream`, is an error. **Verify** first that the TypeScript in Monaco's `ts.worker` can be given to `compile.ts`; the test gives it the repository's `typescript` by injection if it has one at 5.9.3, otherwise the engine's. Record which.
- [X] T060 [P] [US4] Write `packages/web/test/terminal/program/unit/typescript.test.ts` with a fake `LoaderEnv`, covers 009-terminal-node-FR-037: an existing current copy downloads nothing; with none, `onProgress` steps print `Downloading TypeScript, once: {n}% of {size} MB`; Ctrl+C aborts it and the line ends with 130; `linkStyle` and `importModule` do nothing, so Monaco never loads; `offline` ends the run with the words and size from `data-playground-bytes`, status 1; a manifest with `api` 1 or no `compiler` isn't used.
- [X] T061 [US4] Extend `packages/web/test/terminal/program/unit/errors.test.ts`, covers 009-terminal-node-FR-020: an error thrown in a TypeScript file shows the visitor's file, line and code, through the source map; a JavaScript program that requires a `.ts` file gets the error of research R12's Known cost.

### Implementation for User Story 4

- [X] T062 [P] [US4] Write `runtime/node.d.ts`, by hand, holding exactly what the runtime offers (contracts/node-api.md, FR-012, FR-013), including `fs` and `fs/promises`, so that what isn't offered is a type error (research R12).
- [X] T063 [US4] Add the compile mode (research R12, contracts/program.md) in `packages/web/src/apps/playground/engine/compile.ts` and `packages/web/src/apps/playground/engine/ts.worker.ts`: started with `{ name: 'compile' }`, it answers `{ root, mode: 'check' | 'strip', files }` with the compile result under strict options, and any other name keeps the worker as Monaco's. It parses and checks and never runs anything. Make T059 pass.
- [X] T064 [US4] In `packages/web/src/apps/playground/engine/contract.ts`, `packages/web/src/apps/playground/engine/loader.ts` and `packages/web/scripts/build-site.ts`: `ENGINE_API` becomes 2, `EngineManifest` gains `compiler: string`, the `ts.worker` file's address, and `loader.ts` exports `browserEnv`. Update `tools/site-check/src/parts/playground.ts` and the Playground's tests that read the manifest or `api`, and run `npx vitest run packages/web/test/playground/unit`: the Playground behaves as before.
- [X] T065 [US4] Get TypeScript in `program/host.ts` (research R12): the `loading` and `compiling` states; `loadEngine` with the browser's environment and with `linkStyle` and `importModule` doing nothing, without importing the engine's entry; progress through `onProgress`; on `offline`, abort and end with FR-037's words; `new Worker(manifest.compiler, { name: 'compile' })`, with `node.d.ts` among its files; `mode` `check` for `ts-node`, and `strip` for `node`. A type error ends with reason `type-error`, status 1 and no worker. Make T060 pass.
- [X] T066 [US4] Print the progress lines and the type error in `apps/terminal/session.ts`, in the dim and error tones. The progress lines are `line` nodes with a new `req` value in `apps/terminal/engine/block.ts`, which `apps/terminal/Output.tsx` renders with `data-req="009-terminal-node-FR-037"`.
- [X] T067 [US4] Run the compiled output in `runtime/loader.ts`, and map places in `runtime/errors.ts` through 008's `apps/playground/engine/source-map.ts`. Make T061 pass.
- [X] T068 [US4] Add quickstart 13 to 15 to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-002, 009-terminal-node-FR-021 and 009-terminal-node-FR-037: a `ts-node` type error, then it runs; `node app.ts` past it; the first run's progress lines; Ctrl+C during them gives 130; after the Playground has downloaded, no request under the engine's folder.

**Results**: T059 used Monaco's bundled TypeScript 5.9.3, the same copy `ts.worker` gives `compile.ts`, by injection. T065 and T066: a type error is printed by the host through `onOutput` on standard error, so the session gets the error tone with no code in the `os` script. A new `EndReason`, `offline`, carries FR-037's words, which the session prints (data-model.md updated).

**Checkpoint**: TypeScript runs, on the Playground's copy.

---

## Phase 7: User Story 5 - Use the Terminal's files and split code across them (Priority: P5)

**Goal**: programs read and write the Terminal's files under the same rules, and load each other.

**Independent Test**: run a script that reads `cv.json`, writes a new file and requires a local module, then confirm the new file with `cat` (quickstart 11, 12).

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T069 [P] [US5] Write `packages/web/test/terminal/program/unit/fs.test.ts`, covers 009-terminal-node-FR-013, 009-terminal-node-FR-029 and 009-terminal-node-FR-030: every `fs` name of contracts/node-api.md in its sync, callback and promise forms; a program sees its own writes at once; writing a protected file gives `EACCES`, a missing folder `ENOENT`, a folder `EISDIR`, past the limit `ENOSPC`, each changing nothing; binary files hold one character a byte. Add a case per form to `parity.test.ts`, with relative paths only.
- [X] T070 [P] [US5] Write `packages/web/test/terminal/program/unit/loader.test.ts`, covers 009-terminal-node-FR-014: relative `require` and `import`, with and without the extension; `exports`, `module.exports`, `__filename`, `__dirname`; `.mjs`, `.cjs`, syntax detection for `.js`; top-level `await`; a require cycle as Node's; `import` bindings read once, as contracts/node-api.md's Known differences say; the program keeps the text it started with when run.
- [X] T071 [P] [US5] Write `packages/web/test/terminal/shell/apply.test.ts`, covers 009-terminal-node-FR-029 and 009-terminal-node-FR-030: `{ type: 'apply' }` applies changes through `TerminalFs`, which checks the rules again; a refused change is skipped and the rest kept; it answers `{ type: 'applied', files }`; forged changes to protected files change nothing.
- [X] T072 [US5] Extend `packages/web/test/terminal/program/unit/host.test.ts` and `packages/web/test/terminal/program/unit/session.test.ts`, covers 009-terminal-node-FR-030: the host keeps the latest change per path, so its memory stays bounded, and ends the program past `QUOTA`; `onEnded` always carries the changes, including after a stop; the session sends them with `apply` when it ends and takes `files` from the answer; a file written before Ctrl+C is there at the prompt; and after a close, reason `closed`, no `apply` is sent and the visitor's files stay empty (006 FR-021).

### Implementation for User Story 5

- [X] T073 [P] [US5] Write `runtime/modules/fs.ts` (research R10): its own copy from the snapshot, the same rules and owners and the same 1 MB as 006 FR-049 and FR-073, Node's error form with `code`, `errno` and `syscall`, and each change sent at once as the whole new file or a removal, and folders as `{ folder, made }`. Include `fs/promises` and `fs.promises`. Make T069 pass.
- [X] T074 [US5] Load files from the snapshot in `runtime/loader.ts`, and add the relative cases of `require` and `import`. Make T070 pass.
- [X] T075 [US5] Keep changes in `program/host.ts` as data-model.md's File changes sets: "per path, the latest of `{ text, binary? }` or `removed`, and folders made or removed. Sum of written bytes is limited to `QUOTA`, on top of what's there. Applied once, at the end, through `TerminalFs`."
- [X] T076 [US5] Add `apply` in `apps/terminal/shell/worker.ts`, `apps/terminal/shell/adapter.ts`, `apps/terminal/shell/fs.ts` and `apps/terminal/shell-client.ts`, and have `apps/terminal/session.ts` send it when a program ends, however it ends but `closed`, replacing `files` and the client's restart state. Make T071 and T072 pass.
- [X] T077 [US5] Add quickstart 11 and 12 to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-029 and 009-terminal-node-FR-030, with a write before a Ctrl+C.

**Checkpoint**: The sandbox feels like a machine.

---

## Phase 8: User Story 6 - Phone, keyboard and screen reader (Priority: P6)

**Goal**: the Stop key, readable announcements, and output that follows without fighting the visitor's scroll.

**Independent Test**: run an endless loop in the pocket terminal and end it with the Stop key; run a fast-printing program with a screen reader and confirm the announcements stay readable (quickstart 18).

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T078 [P] [US6] Write `packages/web/test/terminal/program/pocket.test.ts`, covers 009-terminal-node-FR-039, at 375 and 320 px wide: while a program runs, Stop takes the place of `clear`, the grid doesn't move, its name is `Stop the program`, it is at least 44 by 44 CSS px, is in the keys' toolbar and its arrow-key order, and does what Ctrl+C does, including a second press past a handler; with nothing running the key is `clear`; if it has focus when the program ends, it becomes `clear` in place and focus doesn't move; contrast with the error color and dark text is at least 4.5:1.
- [X] T079 [P] [US6] Write `packages/web/test/terminal/program/unit/announce.test.ts`, covers 009-terminal-node-FR-040: with a fake clock, a fast-printing program's output is announced in batches at most once a second, and `Program ended, status {n}.` once at the end, including after a stop.
- [X] T080 [P] [US6] Write `packages/web/test/terminal/program/scroll.test.ts`, covers 009-terminal-node-FR-041: new output keeps the end in view; after scrolling back, output doesn't pull the view down until the visitor returns to the end; with reduced motion set, nothing animates.

### Implementation for User Story 6

- [X] T081 [US6] Add the Stop key in `apps/terminal/Pocket.tsx` and `apps/terminal/pocket.css`, as design/wireframes.md and `design/mockup/` set, `data-req="009-terminal-node-FR-039"`, on existing key styles and tokens. Make T078 pass.
- [X] T082 [US6] Batch the program's output for the live region in `apps/terminal/engine/announce.ts` and `apps/terminal/Terminal.tsx`, `data-req="009-terminal-node-FR-040"` on the Terminal's live region. Make T079 pass.
- [X] T083 [US6] Follow the output in `apps/terminal/Output.tsx` and `apps/terminal/Terminal.tsx` on both shells, `data-req="009-terminal-node-FR-041"` on the output. Make T080 pass.
- [X] T084 [US6] Add quickstart 18 to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-039, and run the accessibility part with a program running on both shells: the running entry, the still-running line and the Stop key pass axe.

**Result (T084)**: two states join the driver, `terminal-program-running` and `pocket-program-running`, so the accessibility part and the inspector's `elements` sweep measure the running entry, the still-running line and the Stop key: axe passes on both. The sweep found that two computed `data-req` values could not be read from the source; they are now written out.

**Checkpoint**: Both shells and WCAG 2.2 AA hold in the new states.

---

## Phase 9: User Story 7 - Run code offline (Priority: P7)

**Goal**: JavaScript runs offline after one complete online visit, and TypeScript once downloaded.

**Independent Test**: go offline after one online visit and run a JavaScript file; in a browser with no TypeScript download, run a TypeScript file offline and confirm the message (quickstart 17).

### Tests for User Story 7 (REQUIRED) ⚠️

- [X] T085 [US7] Add quickstart 17 to `tools/site-check/src/parts/program.ts` and `tools/site-check/test/program.test.ts`, and a case to `packages/web/test/terminal/offline.test.ts`, covers 009-terminal-node-FR-036 and 009-terminal-node-FR-037: after one complete online visit with no program run, go offline and `node hello.js` runs; `ts-node app.ts` with no copy says it has to be downloaded once with the size, `$?` 1; with a copy it runs offline. Also: on a fresh load the page requests no `program-*` script and no engine file before a first program, at `/`, `/cv` and the Terminal's first open. Read this from the page's own resource timing, as `engineRequests` in `tools/site-check/src/parts/playground.ts` does, not from `recordRequests` or the context's requests: the service worker's install fetches the precached bundle on that same load, as T009 requires.

### Implementation for User Story 7

- [X] T086 [US7] Make T085 pass. `packages/web/src/sw/` should need no change, as `assets` are precached (plan.md); if the bundle's dynamic import or the frame needs something there, change it and record why in research R13.

**Result (T086)**: T085 passed with no change to `packages/web/src/sw/`.

**Checkpoint**: All seven stories work.

---

## Phase 10: The amendment of 006 and the pull request's checks

**Purpose**: FR-042's record in the older spec (Constitution XI) and FR-043's automated proof

- [X] T087 Record the amendment in `specs/006-terminal/spec.md`, as Principle XI sets, naming 009-terminal-node in a new Clarifications session of 2026-11-02 and in each mark: FR-068 (allows the commands of this spec, running only as it sets; the other names stay out), FR-069 (its limits don't apply to a program), FR-075 (Ctrl+C keeps what a program printed), and FR-024 and FR-078 (the Stop key). Each carries `Amended 2026-11-02` with what it said before, and the approval goes beside the spec's `Status`. Update 006's `research.md` and contracts where they state `node` is left out. In `specs/006-terminal/tasks.md`, mark any task this overturns as superseded, naming 009. Add the new tests' links to `006-terminal-FR-068`, `FR-069`, `FR-075`, `FR-024` and `FR-078` where 006's own tests no longer say what the requirement does. Update the Terminal's entry in `docs/vision.md`.
- [X] T088 Add the three-engine tests to `tools/local-verify/src/engines.js`: `packages/web/test/terminal/program/{sandbox,stacks,stop,memory}.test.ts` alongside `ENGINE_TESTS`, with a browser helper reading `PLAYGROUND_ENGINE` from `packages/web/test/helpers/playground.ts`; update `tools/local-verify/test/` if it lists them. Run `npm run test:engines`. A difference that fails an assertion gets a fix or a stated limit, as T039's WebKit case does (SC-003, SC-004).
  **Result (2026-11-02)**: `sandbox`, `stacks`, `stop` and `memory` pass in Firefox and WebKit, with no new limit. Firefox 119 of 119. WebKit 117 of 119: two of 008's `limits.test.ts` timing cases (FR-040, 1,401 and 2,187 ms against 100 ms) failed in the run with other browsers at work, and all 15 of that file passed when run alone. This branch doesn't change the Playground's runner.
- [X] T089 Finish `tools/site-check/test/program.test.ts`, covers 009-terminal-node-FR-043: the part passes on the real build and covers each thing FR-043 lists: output while running, an endless loop with the shell still responding, Ctrl+C on it, a second Ctrl+C past a handler, an error's form, a program reaching for the page and the network, and running offline. As in `tools/site-check/test/playground.test.ts`, a broken copy of the site makes each case fail with a message saying what failed. Measure the part's time, and if `tools/site-check/test/performance.test.ts`'s budgets no longer hold, mark `BLOCKED:` for the owner rather than raising them.
  **Result**: the part took about 19 s on the real build, and the whole site check 553 s (9:13), against the 1,020 s budget. Eight broken copies fail with a line naming what failed. `seeded/expected-report.txt` gains `offline /cv out-of-order projects[0].name`, which main's code gives too (checked at `b7b7c71`): it is not this feature's, and the sample only needs to be exact.

---

## Phase 11: Polish & Constitution Verification

**Purpose**: Traceability, the budgets, the audits, the full verification, the owner's manual checks and the single PR

- [X] T090 [P] Extend `packages/web/test/terminal/data-req.test.tsx`, covers 009-terminal-node-FR-007, 009-terminal-node-FR-009, 009-terminal-node-FR-026, 009-terminal-node-FR-027, 009-terminal-node-FR-031, 009-terminal-node-FR-037, 009-terminal-node-FR-039, 009-terminal-node-FR-040 and 009-terminal-node-FR-041: every UI target of plan.md's table carries exactly its IDs in the rendered Terminal, including the `help` rows, in both shells.
- [X] T091 Run `npm run traceability` (Constitution III): it exits 0 and its PASS line counts 009's 43 requirements; every row of Requirement Coverage below has a passing test. Record the PASS line here.
  **Result**: `PASS: all 508 active requirements in 9 approved specs are covered.` The 508 include 009's 43.
- [X] T092 [P] Verify research R13 and SC-007 on the real build: the `os` script's gzipped size against `OS_BUDGET` 149,778 (147,861 at `2c4906b`), the bundle's size, and Lighthouse on mobile and desktop profiles at `/` and `/cv` (90+ in every category). Record the figures here.
  **Result**: `os` 149,144 bytes by `gzip -9`, against `OS_BUDGET` 149,778 (147,861 at `2c4906b`). The bundle is 285,641 bytes, 89,140 gzipped. Lighthouse, performance / accessibility / best practices / SEO: `/` mobile 97/100/100/100, `/` desktop 100/100/100/100, `/cv` mobile 99/100/100/100, `/cv` desktop 100/100/100/100.
- [X] T093 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/web/`, `tools/`. **X**: the three packages, the `rolldown` dev dependency and the two abstractions of plan.md's table are all that was added (add any helper with its reason). **IV**: no CV fact or literal design value; programs see `cv.json` only as the Terminal holds it. **V**: nothing moved to `os-core`; Stop is only in `Pocket.tsx`. **VII**: the CV is still one click and one tap from first load, and `/cv` is untouched and renders without JavaScript. **IX**: the Stop key is text, no Apple asset. Also: `eval` only in `runtime/loader.ts`; no `innerHTML` or `dangerouslySetInnerHTML`; no `SharedArrayBuffer` or site-wide isolation headers; the frame is `sandbox="allow-scripts"`. Record the result here.
  **Result**: passes. **X**: `acorn`, `buffer`, `node-inspect-extracted` and the `rolldown` dev dependency are all that was added, with the host and the runtime as plan.md's abstractions. **IV**: the Stop key uses tokens, and `token-check` and `content-check` pass. **V**: `os-core` is unchanged, and Stop is only in `Pocket.tsx` and `pocket.css`. **VII**: the `cv-app` and `no-script` parts pass, and `/cv`'s page and the CV document are unchanged. **IX**: the Stop key is text. `eval` is only in `runtime/loader.ts`, no `innerHTML`, no `SharedArrayBuffer` use or isolation headers, and the frame is `sandbox="allow-scripts"`.
- [X] T094 [P] Verify offline behavior against spec.md's Offline Behavior section (Constitution VI), and audit WCAG 2.2 AA, desktop keyboard operation and `prefers-reduced-motion` in the program states (Constitution VIII): the `accessibility`, `keyboard`, `modes` and `offline` parts pass with T084's and T085's states. Record the result here.
  **Result**: the `accessibility`, `keyboard`, `modes` and `offline` parts pass. Axe measures the program states. The `modes` part does not drive a program, so forced colors with a program running stays with T097; reduced motion in the program states is covered by `scroll.test.ts`, and the offline behavior by T085.
- [X] T095 Run the full verification after T090 to T094: `npm run typecheck`, `npx vitest run packages/web/test/terminal/program`, `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` exit 0, the last with the part `program`. Record the counts here.
  **Result**: all exit 0. `typecheck`; `packages/web/test/terminal/program` 445 tests in 21 files; `content-check`; `token-check`; `traceability`; `site-check` `No problems. 16 of 16 parts passed.`, the first full run taking 553 s against the 1,020 s budget. Also run: `packages/web/test/terminal/`, `build.test.ts` and `tools/local-verify/test`; the parity tests need the GNU tools on `PATH`, as they say.
- [X] T096 Walk [quickstart.md](./quickstart.md)'s 19 rows against `npm run build && npm run serve`, by a script in one headless browser where a script can, recording each row and any difference, and fixing it before the PR. Say plainly which rows a script can't show (SC-001's "in under a minute" is a person's).
  **Result**: all 19 rows pass by script on the built site, in headless Chromium, with no difference to fix. Row 9's readable error was then `ReferenceError: fetch is not defined`, thrown before the `.catch`; fixed before the PR, so it is now `fetch failed: a program has no network in this Terminal`, from the `.catch`. A script can't show SC-001's "in under a minute", which is a person's (T097).
- [ ] T097 Owner action, by hand: a screen reader through a program's output and end, on desktop and phone (US6 scenario 3); Ctrl+C, the Stop key and the sandbox attempts in the current Chrome, Edge, Firefox and Safari; forced colors in Edge with a program running; the built Terminal and pocket terminal against `design/mockup/`'s PNGs. Record each result here and in the PR. Under the interim provision on deferred manual checks they may wait for the final testing phase: record that here, list them in the PR and leave this task open.
  **Deferred (2026-11-02)**: under the interim provision on deferred manual checks, these wait for the final testing phase. List them in the PR.
- [ ] T098 Open the PR from `009-terminal-node` to `main` with a Conventional Commits title, e.g. `feat: run node and ts-node programs in the Terminal (009)`, linking 009's `spec.md` and `tasks.md` and the amended `specs/006-terminal/spec.md` (Constitution XI), naming the amendment of 006 (FR-042), any superseded tasks, and the deferred manual checks (T097). No AI or Claude attribution (CLAUDE.md). Pushing and opening it are outward-facing: do them only if the run allows it, else mark `BLOCKED:` for the owner.
  BLOCKED: pushing and opening the PR are outward-facing, and this unattended run was not given leave to do them. For the owner. The PR must mention that the Stop key also replaces Tab in `.pocket-strip` while a program runs, which `design/wireframes.md` doesn't show; that WebKit's two `limits.test.ts` cases failed under load and passed alone; and that `seeded/expected-report.txt` gained a line main's code also gives.
- [ ] T099 Run `npm run verify:feature` once on any commit of the PR, use `--failed` after a fix, and name the commit and result in the PR description (Constitution, Merge requirements). Green CI is what merges it, and the owner merges.
  BLOCKED: needs the PR of T098, whose commit and result it names.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 first.
- **Foundational (Phase 2)**: Depends on Setup; BLOCKS every story. T003 (design gate) first. T007 needs T006; T010 needs T007, T008 and T009; T012 needs T008; T014 needs T010 and T013.
- **US1 (Phase 3)**: Depends on Phase 2. The MVP, and every later story's way in.
- **US2 (Phase 4)**: Depends on US1 (the loader, the loop and the session).
- **US3 (Phase 5)**: Depends on US1. T042's and T051's `process` work touches the same file, so finish US2's T042 first if both run.
- **US4 (Phase 6)**: Depends on US1 and US2 (T061 and T067 extend the errors). T062's `.d.ts` lists `fs`, whose code comes in US5; the two only have to agree with contracts/node-api.md.
- **US5 (Phase 7)**: Depends on US1. T072's stop case needs US3.
- **US6 (Phase 8)**: Depends on US1 and US3 (Stop does what Ctrl+C does).
- **US7 (Phase 9)**: Depends on US1 and US4 for its TypeScript case.
- **Phase 10**: T087 and T088 depend on the stories; T089 on all the part's cases.
- **Polish (Phase 11)**: Depends on every phase. T095 needs T090 to T094. T098 before T099.

### Within Each User Story

- Tests are written first and FAIL before implementation
- Words and types before the runtime, the runtime before the host, the host before the session, the session before UI
- A story's `program` part case last

### Parallel Opportunities

- Phase 2: T004, T005, T006, T009, T011, T013, once T001 and T003 are done
- US1: tests T016 to T021 together; then T025 to T031 together, each its own runtime file
- US2: T038, T039. US3: T045 to T049. US4: T059, T060, then T062. US5: T069, T070, T071, then T073. US6: T078, T079, T080
- `tools/site-check/src/parts/program.ts` and `apps/terminal/session.ts` are shared: tasks on them run one at a time
- Only one full `npm test` on this machine at a time: the test lock (`tools/speckit-auto/test-lock.ts`) enforces it

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Write unit/command.test.ts, covers FR-001 to FR-007 and FR-042"
Task: "Write unit/runtime-loop.test.ts, covers FR-008 and FR-035"
Task: "Write unit/globals.test.ts, covers FR-012, FR-015, FR-016 and FR-025"
Task: "Write unit/modules.test.ts, covers FR-013"

# Then the runtime's separate files together:
Task: "Write runtime/loop.ts"
Task: "Write runtime/console.ts"
Task: "Write runtime/process.ts"
Task: "Write runtime/modules/path.ts and url.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational, including the design gate
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart 1 and 2

### Incremental Delivery

1. Setup + Foundational → the bundle and the bare host
2. US1 → a program runs and prints (MVP)
3. US2 → its errors read as Node's
4. US3 → it can't hurt the site, and Ctrl+C ends it. **This must exist before anyone but the owner uses it**
5. US4 → TypeScript
6. US5 → files and modules
7. US6 → phone and screen readers
8. US7 → offline
9. The amendment, the checks and the polish

All of it ships in one PR (Constitution XI), with the amendment of 006; the increments are checkpoints within it.

---

## Requirement Coverage

| Requirement | Test task(s) |
|-------------|--------------|
| 009-terminal-node-FR-001 | T016, T037 |
| 009-terminal-node-FR-002 | T016, T059, T068 |
| 009-terminal-node-FR-003 | T016, T020 |
| 009-terminal-node-FR-004 | T016 |
| 009-terminal-node-FR-005 | T016 |
| 009-terminal-node-FR-006 | T016 |
| 009-terminal-node-FR-007 | T016, T090 |
| 009-terminal-node-FR-008 | T017 |
| 009-terminal-node-FR-009 | T021, T037, T090 |
| 009-terminal-node-FR-010 | T020, T021 |
| 009-terminal-node-FR-011 | T020 |
| 009-terminal-node-FR-012 | T018, T020 |
| 009-terminal-node-FR-013 | T019, T020, T069 |
| 009-terminal-node-FR-014 | T070 |
| 009-terminal-node-FR-015 | T018, T021 |
| 009-terminal-node-FR-016 | T018 |
| 009-terminal-node-FR-017 | T038, T039, T044, T051 |
| 009-terminal-node-FR-018 | T038, T039, T044 |
| 009-terminal-node-FR-019 | T038 |
| 009-terminal-node-FR-020 | T038, T061 |
| 009-terminal-node-FR-021 | T059, T068 |
| 009-terminal-node-FR-022 | T047, T058 |
| 009-terminal-node-FR-023 | T006, T047, T058 |
| 009-terminal-node-FR-024 | T048, T058 |
| 009-terminal-node-FR-025 | T018, T047, T058 |
| 009-terminal-node-FR-026 | T045, T058, T090 |
| 009-terminal-node-FR-027 | T046, T090 |
| 009-terminal-node-FR-028 | T045, T049 |
| 009-terminal-node-FR-029 | T069, T071, T077 |
| 009-terminal-node-FR-030 | T069, T071, T072, T077 |
| 009-terminal-node-FR-031 | T045, T046, T048, T058, T090 |
| 009-terminal-node-FR-032 | T045, T051, T058 |
| 009-terminal-node-FR-033 | T045, T048, T058 |
| 009-terminal-node-FR-034 | T013, T046, T058 |
| 009-terminal-node-FR-035 | T017 |
| 009-terminal-node-FR-036 | T009, T085 |
| 009-terminal-node-FR-037 | T060, T068, T085, T090 |
| 009-terminal-node-FR-038 | T059 |
| 009-terminal-node-FR-039 | T078, T084, T090 |
| 009-terminal-node-FR-040 | T079, T090 |
| 009-terminal-node-FR-041 | T080, T090 |
| 009-terminal-node-FR-042 | T016, T022 |
| 009-terminal-node-FR-043 | T089 |

SC-006's parity set is T020 and T069's parity cases, SC-004's attempts T047, SC-002 and SC-003 T048, SC-005 T038 and T059, SC-007 T009, T085 and T092, and SC-001 T096 and T097.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Verify tests fail before implementing
- Commit after each task or logical group, using Conventional Commits, with no AI attribution
- Under `/speckit-converge`, new work goes in new phases and doesn't widen the scope above

---

## Phase 12: Convergence

- [X] T100 Flush output the allowance holds back without waiting for the next write, in `runtime/console.ts`, so it arrives within 250 ms however the program goes on and stays after a stop. Today `flush` runs only from `write` and at the end: `for (let i = 0; i < 5000; i++) console.log(i)` then `setTimeout(..., 4000)` shows 200 lines until the end, and the same loop then `while (true) {}` shows 200 lines and loses the rest on Ctrl+C. A blocked loop can't run a timer, so send what is held once it leaves the allowance's reach, or size the allowance so that a loop that stops writing has nothing held. Add both cases to `packages/web/test/terminal/program/stop.test.ts` per FR-009, FR-031 and US1/AC2 (partial)
- [X] T101 Limit the runtime's messages that aren't output, as output is limited, in `runtime/process.ts` (`told`) and `runtime/files.ts` (`send` of files and folders), coalescing the latest per path and handler state within an allowance by the clock, without losing what a stop must keep (FR-030). `const f = () => {}; for (;;) { process.on('SIGINT', f); process.off('SIGINT', f); }` takes the page's process from 445 MB to 2.2 GB in 1.5 s and stalls the main thread for 1.6 to 1.9 s against 53 ms with a blocked loop, and `mkdirSync` with `rmdirSync` in a loop stalls it for 1.7 to 2.2 s. The same `process.on` loop run for 6 s, then `console.log('done'); process.exit(3)`, was still running 45 s later with nothing printed, so its output and exit never arrived. Add these three to `packages/web/test/terminal/program/stop.test.ts` per FR-024, FR-009, FR-010 and spec Assumptions: Memory (partial)
- [X] T102 Stop a syntax error in a TypeScript file run with `node` before any of it runs, and show it in FR-017's form at the place in the visitor's file: `transpileModule` in `packages/web/src/apps/playground/engine/compile.ts` ignores its diagnostics in `strip` mode. `console.log('ran');\nlet y: = 1;` and `console.log('ran');\nfunction (a: number { return a }` print `ran` with status 0 under `node x.ts` and no error at all. Type errors stay unchecked (FR-001). Update `data-model.md`'s "Empty diagnostics for `node`" and `packages/web/test/terminal/program/unit/compile.test.ts` per FR-018 and US2/AC2 (contradicts)
- [X] T103 Announce the last batch of a program's output before its end, in `apps/terminal/session.ts` and `apps/terminal/engine/announce.ts`: `spoken.stop()` says the text and `finishProgram` replaces it at once with the end's words in the same turn. In the built site `node -e "console.log('hello')"` puts only `Program ended, status 0.` in the live region, a program's last batch is never heard (`first`, `second`, no `third`), and `node nope.js` says only `Program ended, status 1.`, so a screen reader hears no error at all. Keep at most one batch a second and the end once. The fake-clock test in `unit/announce.test.ts` doesn't see this: add a case that reads the live region through the session per FR-040 and US6/AC3 (partial)
- [X] T104 Check the whole typed line once, before any of it runs, in `apps/terminal/shell/adapter.ts` and `apps/terminal/shell/site-commands.ts`: a line that holds one of these commands anywhere but alone runs nothing, says the words and sets status 1. The check now runs only if the command is reached, and leaves the rest of the line running: `touch made.txt; node a.js` makes the file, `echo hi; node a.js` prints `hi`, `node a.js; echo ran` prints `ran` with status 0, `node a.js | cat`, `! node a.js` and `echo $(node -v)` give status 0, and `true || node a.js`, `false && node a.js` and `if false; then node a.js; fi` say nothing. Extend `unit/command.test.ts` per FR-006, contracts/commands.md and spec Edge Cases (partial)
- [X] T105 Resolve the script before deciding how to treat it, in `program/typescript.ts` (`needsCompiler`, `compileRequest`) and `playground/engine/compile.ts`: with `app.ts` holding a type error, `ts-node app` finds no root under that name, so it checks nothing, runs the file and gives status 0. `node app` for the same file ends with `A TypeScript program must start from a TypeScript file`, which is false of it. `ts-node` must check the file it runs, whichever way it is named, and a folder's `index.ts` likewise. Add cases to `unit/typescript.test.ts` per FR-002, FR-001 and US4/AC2 (contradicts)
- [X] T106 Apply a program's changes so the end state is what the program saw, in `apply` in `apps/terminal/shell/adapter.ts` and `createChanges` in `program/host.ts`, which keep folders and files apart and files in first-written order. In the built site each of these reports success and loses the result: `unlinkSync('ff'); mkdirSync('ff'); writeFileSync('ff/in', 'y')` leaves neither; `rmSync('dd', { recursive: true }); writeFileSync('dd', 'text')` leaves neither; and with a 900,000-byte `big`, `writeFileSync('nw', 'x'); unlinkSync('big'); writeFileSync('nw', 900,000 bytes)` removes `big` and refuses `nw` for space, leaving neither. Add the three to `packages/web/test/terminal/shell/apply.test.ts` per FR-030 and FR-029 (partial)
- [X] T107 Add the `NodeJS` namespace to `runtime/node.d.ts`, at least `NodeJS.Timeout`, `NodeJS.ErrnoException`, `NodeJS.ProcessEnv` and `NodeJS.Signals`: `ts-node` gives `TS2503: Cannot find namespace 'NodeJS'` for `const t: NodeJS.Timeout = setTimeout(...)` and `(e as NodeJS.ErrnoException).code`, both common in valid code. Everything else in a script using all of FR-012 and FR-013 checked clean. Add both to `unit/compile.test.ts` per FR-038 (partial)
- [X] T108 Give a file with a space in its path the same error form as any other, in `runtime/loader.ts`: `//# sourceURL=<path>` with a space isn't honored, so `node 'my file.js'` throwing on line 2 prints only `Error: sp` and the version line, with no file, line, code, marker or stack. Name such a file in a way the engine accepts and `runtime/errors.ts` maps back. Add a case to `packages/web/test/terminal/program/stacks.test.ts` per FR-017 and FR-020 (partial)
- [X] T109 Print the runtime's own coded errors as Node does, in `runtime/errors.ts`, `runtime/modules/assert.ts` and the `invalid` helpers: a caught or uncaught `assert.strictEqual(1, 2)` prints `[AssertionError: Expected values…` with the stack inside the brackets, no blank line before the stack and no `[ERR_ASSERTION]`; `readFileSync(1.5)` prints `TypeError:` where Node prints `TypeError [ERR_INVALID_ARG_TYPE]:`, and `error.stack` differs the same way; `process.exit('a')` and others leave out Node's `('a')` after `Received type string`; `assert(false)`, `assert.ok(null)` and `assert.match` give `generatedMessage: false` where Node gives `true`. Add them to `unit/parity.test.ts` per FR-011, FR-013 and SC-006 (partial)
- [X] T110 Count what a program's changes weigh the same way in the runtime and the page, in `runtime/files.ts` and `program/host.ts`, so a limit reached by honest use gives `ENOSPC` and a program holding little isn't ended. The host's comment says only a forged change reaches its limit, but `for (let i = 0; i < 200000; i++) { writeFileSync('z' + i, ''); unlinkSync('z' + i); }` holds nothing at any time and ends with `node: the browser ended this program.`, status 1, and writing empty files until an error ends the same way, with no error for its `catch`. Removals of a path that didn't exist at the start need weigh nothing. Add both to `unit/fs.test.ts` and `unit/host.test.ts` per FR-029 (partial)
- [X] T111 Refuse moving a folder into itself with `EINVAL`, in `renameSync` in `runtime/modules/fs.ts`: `fsError` has the code and nothing uses it. `mkdirSync('s'); try { renameSync('s', 's/t') } catch …` recurses until the page's limit, never reaches the `catch` and ends with `node: the browser ended this program.`, and the nested folders it leaves made the next line, `rm -rf s`, hit the shell's 5-second stop. Add a case to `unit/fs.test.ts` and `parity.test.ts` per FR-029 and FR-013 (contradicts)
- [X] T112 Let a program read what the visitor can read outside the home and temporary folders, in `programFiles` in `apps/terminal/shell/fs.ts`, or record the limit in contracts/node-api.md's Known differences and research R10: `ls /` shows `bin dev home tmp usr`, while `readdirSync('/')` gives `home` and `tmp`, and `existsSync('/bin')` is false, so after `cd /bin` `readdirSync('.')` fails with `ENOENT` per FR-029 (partial)
- [X] T113 Correct the ending codes in `runtime/main.ts`: an error thrown in an `uncaughtException` handler gives 1 where Node gives 7, an error thrown in an `exit` handler gives 7 where Node gives 1, and `process.exitCode` read in an `exit` handler on a natural end is 0 where Node's is `undefined`. Add them to `unit/parity.test.ts` per FR-010 and SC-006 (partial)
- [X] T114 Make `ts-node`'s check agree with what runs for a file that uses `import`, in `runtime/node.d.ts` or `runtime/loader.ts`: `import { join } from 'path'; console.log(__dirname, require('path'))` checks clean, then ends with `ReferenceError: __dirname is not defined`, and likewise `require` and `module`. R4 makes such a file a module, so either those names are a type error in a module, or a `.ts` file run by `ts-node` has them, as real `ts-node` gives by default. Record the choice in contracts/node-api.md per FR-038 and FR-012 (partial)
- [X] T115 Make `Buffer` match Node for what it offers, in `runtime/modules/buffer.ts`: `toString('base64url')` and `Buffer.from(text, 'base64url')` throw `Unknown encoding: base64url`, and range, encoding and argument errors have no `code` (`ERR_OUT_OF_RANGE`, `ERR_UNKNOWN_ENCODING`, `ERR_INVALID_ARG_TYPE`) and other words than Node's. Fix them or record what stays in contracts/node-api.md's Known differences. Add them to `unit/parity.test.ts` per FR-013 and SC-006 (partial)
- [X] T116 Fix or record in contracts/node-api.md's Known differences these values that print unlike Node: `new Map([[1, 2]]).entries()` prints `[Map Iterator] {  }` against `[Map Entries] { [ 1, 2 ] }`, and a `Set`'s iterator is empty likewise; an imported namespace prints `{ a: [Getter] }` against `{ a: 1 }`; a `Proxy` prints without `Proxy(…)`, and `console.log` runs its traps, so one whose `get` throws ends the program where Node prints it per FR-011 and SC-006 (partial)
- [X] T117 Point at the place of the `throw` where it can be known, or record in contracts/node-api.md's Known differences that the top place is where the error was made: `const e = new Error('x');\nconsole.log('y');\nthrow e;` shows line 1 and its code where Node shows line 3, and a rethrow from a `catch` likewise per FR-017 and US2/AC1 (partial)
- [X] T118 Keep the runtime's minified names out of stack lines, in `runtime/errors.ts`: a `process.on('SIGINT', () => { throw new Error('x') })` handler's frame prints `at s.eval ([eval]:1:32)` in the built site, where `s` is the bundle's name for `Process` and Node prints `at process.<anonymous>` per FR-020 (partial)
