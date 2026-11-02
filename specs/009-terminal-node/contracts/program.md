# Contract: The program host and its messages

## The host (`program` bundle, on the page)

```ts
start(request: ProgramRequest, events: ProgramEvents): ProgramHandle

type ProgramEvents = {
  onOutput(chunks: { stream: 'stdout' | 'stderr'; text: string }[]): void; // at most every 100 ms
  onProgress(step: 0 | 1 | 2 | 3 | 4): void;                               // TypeScript's download
  onEnded(end: { status: number; reason: EndReason; changes: FileChanges }): void; // exactly once
};
type ProgramHandle = { interrupt(): void; close(): void };
```

`interrupt` implements research R8. `close` ends the program with `closed`, and is called on the Terminal's
close or reset and on `pagehide`. The host knows nothing of the session (R14).

## The frame

008's `contracts/runner.md` The frame, with 009's policy (R2) and its own hidden host, `terminal-runners`, so a
program survives the content unmounting. A nonce on every message, as there.

## Worker to page

The page checks every field: the worker runs the visitor's code.

| Message | Meaning |
|---------|---------|
| `{ out: 'stdout' \| 'stderr', text }` | Output. A non-string is dropped, and the count stops it at 1 MB |
| `{ sigint: boolean }` | A `SIGINT` handler now exists or doesn't |
| `{ file: path, text, binary? }`, `{ file: path, removed: true }` | A file change |
| `{ folder: path, made: boolean }` | A folder change |
| `{ exit: code }` | The program ended. A code outside 0–255 is masked, as a process's is |
| `{ limit: 'output' }` | The runtime reached 1 MB itself |

## Page to worker

| Message | Meaning |
|---------|---------|
| `{ run: true, request, compiled? }` | Starts the program |
| `{ signal: 'SIGINT' }` | Runs the handlers |

## Shell worker additions

`ToWorker` gains `{ type: 'apply'; id; changes: FileChanges }`. `FromWorker` gains
`{ type: 'applied'; id; files: VisitorFiles }`. A change `TerminalFs` refuses is skipped. `Effect` gains
`{ kind: 'program'; request: ProgramRequest }`. The client gains `setStatus(state)` so its restart state stays
current.

## The compile mode (Playground's `ts.worker`)

Started with `new Worker(manifest.compiler, { name: 'compile' })`. Any other name keeps the worker as Monaco's.
`{ root, mode: 'check' | 'strip', files }` in, compile result (data model) out. It parses and checks and never
runs anything. `EngineManifest` gains `compiler: string`, the `ts.worker` file's address, and `api` becomes 2.
