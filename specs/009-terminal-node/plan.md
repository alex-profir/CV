# Implementation Plan: Node in the Terminal

**Branch**: `009-terminal-node` | **Date**: 2026-11-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-terminal-node/spec.md`

**Design**: [design/review.md](./design/review.md): an interim local mockup at commit `cb38050`, approved by the owner 2026-11-02. See
Complexity Tracking.

## Summary

`node`, `ts-node` and `tsnode` in the Terminal, on both shells, as a place to write a little Node, run it and see
its output and errors. It behaves like Node on the browser's own engine; it isn't Node. A line that is only one of
these commands hands a request to the page and ends, so the shell's limits never touch the program. The page runs
it in a sandboxed frame and worker with no network, streams its output into the running entry, and terminates the
worker on Ctrl+C. TypeScript reuses the Playground's downloaded copy.

Details in [research.md](./research.md): sandbox R2, running code R3 and R4, errors R5, starting R6, output R7,
signals R8, limits R9, files R10, APIs R11, TypeScript R12, delivery R13. The list of functions each module
offers, which FR-013 leaves to this plan, is [contracts/node-api.md](./contracts/node-api.md).

### Corrections

Found by `/speckit-analyze` on 2026-11-02. Where these differ from research.md or data-model.md, these hold.

- **R5, WebKit's place**: a probe in Playwright's WebKit 27.2 shows a thrown error has `line` and `column`, and no
  `lineNumber` or `sourceURL`. The top place comes from `line` and `column`. For a syntax error those are the place
  of the `eval` call, not of the mistake, so its place comes from `acorn` in every engine.
- **R10, applying changes**: a program ended by `close` applies nothing, since closing the Terminal empties the
  visitor's files (006 FR-021). Every other ending applies them.
- **R13, what "loads" means**: the page requests nothing of the program before a first program. The service worker's
  install still fetches the bundle on the first visit, which is how FR-036's offline copy comes to hold it.
- **Data model, new lines**: a `text` node carries no `req`. Lines that need a `data-req` (FR-027, FR-037) are `line`
  nodes with a new `req` value.

## Technical Context

**Language/Version**: TypeScript with erasable syntax and TSX on Node.js 26, as 001 to 008. Browser code bundled
by Vite 8. Visitors' TypeScript uses the TypeScript 5.9.3 in the Playground's engine.

**Primary Dependencies**: three new: `acorn` 8.19.0, `buffer` 6.0.3 and `node-inspect-extracted` 3.3.4, all MIT and
all only inside the runtime's text, and one dev dependency, `rolldown` 1.2.15, for the fast tests' harness. Reused: `just-bash` through the adapter, 008's bootstrap, loader, source map and
engine cache, 006's session, client, blocks and `TerminalFs`, and 004's service worker.

**Storage**: none new. Program changes go to the Terminal's files for the visit. TypeScript stays in 008's
`playground-<hash>` cache.

**Testing**: Vitest fast tests, parity tests against the real Node 26 running them, whose harness runs the runtime in
a `vm` context with only a browser worker's globals and bundles it without `vite`, which the fast set can't reach, Playwright browser tests in a
new site-check part `program`, with sandbox and stack tests in all three engines in the owner's run (R15).

**Target Platform**: current main browsers, desktop and phone.

**Project Type**: web, an amendment-bearing feature of an existing app.

**Shells**: Both, matching the spec's Shell Scope.

**Offline Approach**: `assets/program-<hash>.js` is precached with `assets`, so JavaScript runs offline after one
complete visit. TypeScript uses 008's cache and says so when it has none (R12, R13).

**Performance Goals**: output on screen within 250 ms; Ctrl+C within 1 s; nothing added to first load.

**Constraints**: `os` script at most 149,778 bytes gzipped, with **1,917 bytes left at `2c4906b`** (R13). No
`SharedArrayBuffer`, so no site-wide isolation headers. One `os` file, enforced by the build.

**Scale/Scope**: 43 requirements. About 50 to 70 tasks expected, the runtime's modules being the largest part.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: unchanged.*

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | Approved by the owner 2026-11-02; SC-007 amended in the spec from this plan |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | Signed 2026-11-02, after this plan was first written, as Complexity Tracking records |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | Table below |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only | Pass | Programs see `cv.json` as the Terminal holds it. The Stop key uses existing key styles and tokens |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | All in the Terminal app, which declares both. Stop stays in `Pocket.tsx` |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | R13, R12; a site-check case |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | Nothing loads or shows until a program is run |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | FR-039 to FR-041; existing parts cover the new state; no first-load cost |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The Stop key is text in the site's own key style |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | Table below |
| XI | Features and Amendments in Pull Requests | New feature in one PR, with the amendments it makes | Pass | One PR, amending 006 (FR-042), linking both specs |

## Requirement Traceability

Test paths are under `packages/web/test/terminal/program/` unless they name a site-check part, whose browser tests
are `tools/site-check/test/program.test.ts`. Each test's name carries `009-terminal-node-FR-###`.

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 009-terminal-node-FR-001 | `command.test.ts`: resolves and hands over JS and TS; browser: runs | Non-UI |
| 009-terminal-node-FR-002 | `command.test.ts`: `ts-node`, `tsnode`; browser: type error, then runs | Non-UI |
| 009-terminal-node-FR-003 | `command.test.ts`, `parity.test.ts`: `-e`, `-p` | Non-UI |
| 009-terminal-node-FR-004 | `command.test.ts`: no script, status 1, no program | Non-UI |
| 009-terminal-node-FR-005 | `command.test.ts`: version, help, bad option 9 | Non-UI |
| 009-terminal-node-FR-006 | `command.test.ts`: pipe, redirect, list, loop, function, substitution refused | Non-UI |
| 009-terminal-node-FR-007 | `command.test.ts`: `help` and Tab | The `help` rows, as 006 FR-008 |
| 009-terminal-node-FR-008 | `runtime-loop.test.ts`: order, end when nothing left | Non-UI |
| 009-terminal-node-FR-009 | `session.test.ts`, browser: lines appear one at a time, in order | The running entry's output |
| 009-terminal-node-FR-010 | `session.test.ts`, `parity.test.ts`: `$?` for each ending | Non-UI |
| 009-terminal-node-FR-011 | `parity.test.ts`: value forms against Node | Non-UI |
| 009-terminal-node-FR-012 | `globals.test.ts`, `parity.test.ts` | Non-UI |
| 009-terminal-node-FR-013 | `modules.test.ts`: every name in contracts/node-api.md; `parity.test.ts` | Non-UI |
| 009-terminal-node-FR-014 | `loader.test.ts`: relative `require`, `import`, `.mjs`, top-level `await` | Non-UI |
| 009-terminal-node-FR-015 | `globals.test.ts`, `session.test.ts`: env, cwd, no carry-over | Non-UI |
| 009-terminal-node-FR-016 | `globals.test.ts`: stdin ended | Non-UI |
| 009-terminal-node-FR-017 | `errors.test.ts`, browser in three engines | Non-UI |
| 009-terminal-node-FR-018 | `errors.test.ts`, browser in three engines | Non-UI |
| 009-terminal-node-FR-019 | `errors.test.ts`, browser | Non-UI |
| 009-terminal-node-FR-020 | `errors.test.ts`: missing, not offered, TypeScript places | Non-UI |
| 009-terminal-node-FR-021 | `compile.test.ts`, browser | Non-UI |
| 009-terminal-node-FR-022 | Browser in three engines: no page, storage, cookies | Non-UI |
| 009-terminal-node-FR-023 | `policy.test.ts`, browser: no request observed; a readable error | Non-UI |
| 009-terminal-node-FR-024 | Browser: endless loops, window still moves | Non-UI |
| 009-terminal-node-FR-025 | `globals.test.ts`, browser: no `Worker` | Non-UI |
| 009-terminal-node-FR-026 | `host.test.ts`, browser: forged and real floods | The `stopped` line, as 006 FR-069 |
| 009-terminal-node-FR-027 | `session.test.ts`: no limit, one line after 5 s | The still-running line |
| 009-terminal-node-FR-028 | `host.test.ts`; owner's run, as 008's memory test | Non-UI |
| 009-terminal-node-FR-029 | `fs.test.ts`, adapter `apply.test.ts`: rules, errors, quota | Non-UI |
| 009-terminal-node-FR-030 | `session.test.ts`, browser: writes kept after a stop | Non-UI |
| 009-terminal-node-FR-031 | `host.test.ts`, `session.test.ts`, browser | The `^C` mark |
| 009-terminal-node-FR-032 | `host.test.ts`, browser | Non-UI |
| 009-terminal-node-FR-033 | `host.test.ts`, browser: past a handler, past a blocked one | Non-UI |
| 009-terminal-node-FR-034 | `session.test.ts`, browser: close, reset, `pagehide` | Non-UI |
| 009-terminal-node-FR-035 | `runtime-loop.test.ts` | Non-UI |
| 009-terminal-node-FR-036 | Build check and browser: nothing the page requests before a program, by its resource timing; offline copy | Non-UI |
| 009-terminal-node-FR-037 | `typescript.test.ts`, browser: shared cache, progress, stop | The progress lines |
| 009-terminal-node-FR-038 | `compile.test.ts`: every name offered checks clean; one not offered fails | Non-UI |
| 009-terminal-node-FR-039 | `pocket.test.ts`, site check: 44 px, does Ctrl+C's work | The Stop key |
| 009-terminal-node-FR-040 | `announce.test.ts`: batches and the end | The Terminal's live region |
| 009-terminal-node-FR-041 | Browser, reduced motion included | The output |
| 009-terminal-node-FR-042 | 006's tests updated; `command.test.ts`: others still left out | As in 006 |
| 009-terminal-node-FR-043 | Site-check part `program` and its tests | Non-UI |

## Dependencies, Skills & Abstractions

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `acorn` | dependency | Syntax-error places in Chromium, and finding `import` and `export` (R4, R5) | The engine gives no place in Chromium; regular expressions can't parse JavaScript | Yes: the acorn project |
| `buffer` | dependency | `Buffer` (FR-012) | Writing `Buffer` by hand is large and error-prone | No: its author, Feross Aboukhadijeh. Last release is old, but the API it targets is stable; parity tests guard it |
| `node-inspect-extracted` | dependency | Node's `inspect`, which all console output goes through (FR-011) | 008's formatter makes the Playground's trees, not Node's text | No: Joe Hildebrand. It is Node's own code extracted, and parity tests catch drift |
| `rolldown` | dev dependency | Bundles the runtime for the fast tests' harness, so `buffer` resolves to the package and not Node's built-in (T012) | `vite`'s build, as `runner-scripts.ts` uses, is forbidden to the fast set by `test-sets.test.ts`; Node's own TypeScript support resolves `buffer` to its built-in | Yes: the Vite project, and the version Vite 8.3.5 already installs |
| Program host | abstraction | One place that owns a program's frame, port and end, free of the session (R14) | Inside the session, it couldn't be left out of the `os` script (R13) | - |
| Node runtime | abstraction | The feature itself (R1) | - | - |

## Project Structure

### Documentation (this feature)

```text
specs/009-terminal-node/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/{commands,program,node-api}.md
├── design/              # Before UI tasks: wireframes, local mockup, PNGs, review.md
└── tasks.md             # /speckit-tasks
```

### Source Code (repository root)

```text
packages/web/
├── scripts/
│   ├── build-site.ts              # Builds the program bundle, names it to the one-worker check; budget and one-`os` checks stay
│   ├── runner-policy.ts           # + programPolicy
│   └── runner-scripts.ts          # + the runtime's script, shared `scriptText`
├── src/
│   ├── site-text.ts, shell-text.ts # The new words: page's in the first, worker's in the second
│   ├── pages/ShellPage.tsx         # `data-program`, the bundle's address (R13)
│   ├── sw/                         # Unchanged: `assets` are precached already
│   └── apps/
│       ├── terminal/
│       │   ├── session.ts, shell-client.ts, Terminal.tsx, Pocket.tsx, CommandLine.tsx
│       │   ├── engine/{block,command-table,commands}.ts # The `program` effect; the commands' rows
│       │   ├── shell/{adapter,site-commands,standard,protocol}.ts # Commands, out of `LEFT_OUT`; `apply`
│       │   └── program/
│       │       ├── host.ts                            # R7, R8, R9, R10; the bundle's entry
│       │       ├── policy, messages                   # What the page accepts
│       │       └── runtime/                           # Text for the worker
│       │           ├── main.ts, loop.ts, loader.ts, errors.ts, process.ts, console.ts
│       │           ├── modules/{fs,path,events,util,assert,os,timers,url}.ts
│       │           └── node.d.ts                      # For `ts-node` (R12)
│       └── playground/engine/
│           ├── ts.worker.ts, compile.ts               # R12: the compile mode, no second TypeScript
│           ├── contract.ts, loader.ts                 # `api` 2; `loader` exports `browserEnv`, manifest gains `compiler`
│           └── runner/bootstrap.ts                    # Used as it is
├── test/terminal/program/
tools/site-check/src/parts/program.ts
specs/006-terminal/spec.md, docs/vision.md             # FR-042; the Terminal's entry
```

**Structure Decision**: all of it lives in the Terminal app, with the runtime and host in a bundle of their own,
because of the `os` budget. Nothing moves to `os-core`, since no other app runs programs.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle II and the workflow's gate order: this plan was written before the Design gate passed | The owner asked for the plan directly after approving the spec, and this plan fixes which states the design must show. Only two things need design: the Stop key's place and the program states in the Terminal | Stopping for design first would delay a plan that has almost no UI in it. **Resolved**: no UI work started before the owner signed `design/review.md` on 2026-11-02, so the gate is met, and UI tasks still list it as a prerequisite |
