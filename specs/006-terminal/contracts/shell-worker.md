# Contract: The Shell Worker

Added 2026-10-29 (research R25 to R34). The Terminal's interface and its shell talk through this
protocol and nothing else. Types are in [data-model.md](../data-model.md#run-request-and-result-contractsshell-workermd).

## Files

| File | Runs in | Holds |
|------|---------|-------|
| `src/apps/terminal/shell-client.ts` | the page, in the `os` script | Starts the worker on first open, queues lines, the watchdog, Ctrl+C, restarts, `reset` |
| `src/apps/terminal/shell/worker.ts` | the worker | The entry: imports `no-network.ts` first, creates the adapter, answers messages |
| `src/apps/terminal/shell/no-network.ts` | the worker | Replaces `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and `importScripts` with functions that throw, before just-bash's module body runs (research R39) |
| `src/apps/terminal/shell/adapter.ts` | the worker, and Node in tests | `createShell(siteInput)`: just-bash with the limits, the allow-list, TerminalFs, the site's commands and two transform plugins (the site's names and pipe mark, research R29; the redirect check, G1); `warm()`, `run(request)`, `reset()`, `restore(state, files)` (research R27) |
| `src/apps/terminal/shell/fs.ts` | the worker, and Node | TerminalFs (research R28) |
| `src/apps/terminal/shell/site-commands.ts` | the worker, and Node | The FR-008 commands and the `cat`, `ls`, `rm` and `jq` wrappers (research R29) |
| `src/apps/terminal/shell/standard.ts` | the worker, and Node | `STANDARD_COMMANDS`, `SHELL_BUILTINS`, and from 2026-10-30 `SHELL_KEYWORDS` (research R32, R43) |
| `src/apps/terminal/shell/complete.ts` | the worker, and Node | Added 2026-10-30: `complete(request, sources)`, Tab's matches and what readline inserts (research R43) |
| `src/apps/terminal/shell/no-zlib.ts` | the worker | The `node:zlib` stub (research R34) |
| `src/apps/terminal/shell/protocol.ts` | both | The message types below |

`shell/` imports `engine/` (blocks, the CV builders, the file tree, the JSON lexer, the site text
it prints) and `just-bash`, and nothing from React, the DOM, the shells or `@cv/tokens`. The
boundaries test enforces it.

## Messages

From the page to the worker:

| Message | When | Answer |
|---------|------|--------|
| `{ type: 'start', data: ShellData }` | Once, after `new Worker` | `{ type: 'ready' }` after the warm-up line, or `{ type: 'failed', reason }` |
| `{ type: 'run', request: RunRequest }` | A line, when `ready` and nothing runs | `{ type: 'result', result: RunResult }` |
| `{ type: 'restore', state: ShellState, files: VisitorFiles }` | After a restart, before the next `run` | `{ type: 'ready' }` |
| `{ type: 'reset' }` | The Terminal closed (FR-021) | `{ type: 'ready' }` |
| `{ type: 'complete', request: CompleteRequest }` | Tab, or the pocket Tab key, when `ready` and nothing runs (added 2026-10-30, research R44) | `{ type: 'completion', completion: Completion }` |
| `{ type: 'write', request: WriteRequest }` | `:w` and its kin in the vim view (added 2026-10-30, research R49) | `{ type: 'wrote', outcome: WriteOutcome }` |

`ShellData` is what the worker can't build alone: nothing today, since the worker imports the CV,
the site data and the spec list from the same modules as the page. As built, it is typed empty
and the worker ignores it: tests that need a fixture CV call `createShell` in Node instead.

One line runs at a time. The page never sends `run` while one is running. A line entered then
waits, as a line entered before `ready` does (FR-070). The page sends `complete` only when no line
runs, and drops a `completion` whose `id` isn't its last request's (research R44). A `write` comes
only from the vim view, which no line runs under; the worker writes through TerminalFs, so its
rules and the 1 MB limit hold, and answers with the visitor's files when they changed (research
R49). Types: [data-model.md](../data-model.md#completion-fr-076-to-fr-078-research-r43-r44) and
[Write request and outcome](../data-model.md#write-request-and-outcome-fr-080-research-r49).

## Timing

| Limit | Value | Who enforces it |
|-------|-------|-----------------|
| A line's run time | 5,000 ms | just-bash's `maxExecutionTimeMs` (FR-069) |
| Commands in a line | 10,000 | `maxCommandCount` |
| A line's output, stdout and stderr | 1,048,576 bytes | The adapter (`LIMITS.output`); just-bash's `maxOutputSize` is 4,194,304 (`LIMITS.pipe`), what one command may pass on inside the line (research R33, Built) |
| No answer to `run` | 6,000 ms | The page terminates the worker, starts a new one with `restore`, and shows the "stopped" text |
| No `ready` after `start` | 10,000 ms | The page shows the failure line with its retry control (FR-070) |
| Ctrl+C while a line runs | at once | The page terminates the worker and restarts it as above (FR-075) |
| No answer to `complete` or `write` | 2,000 ms | The page drops the completion (Tab did nothing), or shows the write's `E212` and keeps the view open; the worker isn't restarted, as nothing runs (added 2026-10-30) |

## The shell just-bash is given

```ts
new Bash({
  fs: terminalFs,                       // research R28
  cwd: '/home/guest',
  env: { HOME: '/home/guest', USER: 'guest', LOGNAME: 'guest', SHELL: '/bin/bash' },
  commands: STANDARD_COMMANDS,          // research R32
  customCommands: [...siteCommands, ...adapterCommands],  // research R27, R28, R29
  executionLimits: { maxExecutionTimeMs: 5000, maxCommandCount: 10000 + overhead, maxCallDepth: 20000,
                     maxOutputSize: 4 * 1048576,            // LIMITS.pipe, research R33
                     maxLoopIterations: 1_000_000_000 },   // research R33, G15
});
// then registerTransformPlugin for the line's tree (R27), sitePlugin, redirectPlugin and the checkpoints
// no network, fetch, python or javascript option (research R39)
```

`__cv_begin`, `__cv_read`, `__cv_end`, `__cv_wrote` and the other `__cv_*` names are the adapter's own commands. `help` doesn't list them, and a line
that names them gets "command not found" (the adapter refuses a line whose words name them).

## Build

- Vite emits the worker as `assets/shell-<hash>.js`, one file with no import, and the license file
  `assets/shell-licenses-<hash>.txt` (research R34, R40).
- `build-site.ts` fails with `site build failed: the shell worker is not one file` when the worker
  imports anything, and `site build failed: the os script loads the shell` when the `os` entry
  imports it other than through `new Worker`.
- A worker-only Vite plugin (`cv:no-zlib`, in `worker.plugins`) resolves `node:zlib` and `zlib` to
  `shell/no-zlib.ts`.
