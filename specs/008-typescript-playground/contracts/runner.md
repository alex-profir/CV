# Contract: The Runner

How the engine runs the code apart from the site (FR-032 to FR-051), as research R13 and R17 to
R19 and R24 set. The host is `engine/runner/host.ts` (on the page); the bootstrap and the runtime
are `engine/runner/bootstrap.ts` and `engine/runner/runtime.ts`, built into script text.

## The call

```ts
type RunInput = { cv: unknown /* a structured clone of the resume */ };

type RunEvents = {
  onStarted(info: { errors: number }): void;       // the code's error count, for the first note (FR-033)
  onLogs(batch: { entries: LogEntry[]; dropped: number; cleared?: true }): void;   // cleared: console.clear came first
  onPending(pending: { timers: number; requests: number }): void;
  onBlocked(since: number | null): void;          // null when the code paused again (R19)
  onEnded(outcome: Run['outcome']): void;          // data-model.md Run
};

type RunHandle = { stop(): void };                 // FR-038; idempotent
```

`run` first asks the TypeScript worker for `getRunnable` and the current imports. With imports, or
no JavaScript (FR-023, `noEmitOnError`), it ends at once with `nothing-ran` and the reason, and no
frame is made (FR-033, FR-042). A new `run` stops the one going first (FR-032).

## The frame

```html
<iframe sandbox="allow-scripts" hidden title="" srcdoc="…"></iframe>
```

The `srcdoc`:

```html
<!doctype html>
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'sha256-<bootstrap>'; worker-src blob:; connect-src *">
<script>/* bootstrap */</script>
```

- No `allow-same-origin`, `allow-popups`, `allow-modals`, `allow-top-navigation`, `allow-forms` or
  `allow-downloads`. One frame per run, removed when the run ends.
- `<bootstrap>`'s hash is computed by the build; a test fails if the policy and the script differ.
- A future site-wide Content Security Policy must allow the bootstrap's hash and `worker-src blob:`
  for the frame, since a `srcdoc` document inherits its parent's policy.

## Messages

All after the first go over one `MessagePort` between the host and the worker, each carrying the
run's nonce; a message without it is ignored.

| From → to | Message | Meaning |
|-----------|---------|---------|
| host → bootstrap | `{ start, nonce, source, port }` (by `postMessage` to the frame, the port transferred) | Make the worker from `source` and hand it the port |
| bootstrap → host | `{ worker: 'started' \| 'failed' \| 'died', nonce, message }` | The worker exists, couldn't be made, or died (an `error` event reached the frame, R24) |
| host → worker | `{ run, nonce, cv }` | Set `cv` and run the code |
| host → worker | `{ ping, nonce, n }` every 250 ms | Heartbeat (R19) |
| worker → host | `{ pong, nonce, n }` | Answered as soon as the worker's event loop is free |
| worker → host | `{ started, nonce }` | The code is about to run; the heartbeat starts |
| worker → host | `{ logs, nonce, entries, dropped, cleared }` | A batch (R18); `cleared` when `console.clear` emptied the logs before it |
| worker → host | `{ pending, nonce, timers, requests }` | When the counts change |
| worker → host | `{ uncaught, nonce, entry, at }` | An uncaught error or rejection, as a log entry, with its place in the worker's script (`at`), which the host maps to the code's line |
| worker → host | `{ end, nonce, uncaught }` | Nothing is left to do (R18) |
| host → bootstrap | `{ stop, nonce }` | `worker.terminate()` (R24) |

Nothing the worker sends is trusted, nonce or not (T182). `runner/messages.ts` checks each field
on the page: an entry that isn't one the runtime could make, by shape, depth or item count, is
dropped, and the page's own notes and an entry's `line` can't come from the worker. The runtime
holds `MessagePort.prototype.postMessage` and `MessageEvent.prototype`'s `data` getter from before
the code runs, so patching them shows the code neither the nonce nor the port. A failure while
rendering stays in the Playground's window, with a Try again that clears the logs.

## What the runtime gives the code

| Name | Behavior |
|------|----------|
| `console.*` | Captured into log entries; `clear` empties the logs (FR-034) |
| `alert(x)` | An `alert` entry; returns `undefined` (FR-043) |
| `prompt(…)`, `confirm(…)` | A note that they aren't available; return `null` and `false` (FR-043) |
| `setTimeout`, `setInterval`, `clearTimeout`, `clearInterval`, `requestAnimationFrame` | As usual, counted while pending (FR-036, FR-037) |
| `fetch`, `XMLHttpRequest`, `EventSource` | As usual, to any site, but with no cookies or other credentials whatever the code asks: `fetch` forces `credentials: 'omit'` (a `Request` too), `withCredentials` is always false, and `EventSource`'s option is dropped. The wrappers replace the originals where the code could reach them (the scope and its prototypes, the original constructor). Counted while pending or open (FR-041) |
| `WebSocket` | As usual; can't be limited this way, so it relies on the sandbox alone (FR-041). Counted while open |
| The browser's own promises | `Response`, `Request` and `Blob` reads, `crypto.subtle`, `caches`, `indexedDB.databases`, `WebAssembly`'s compiling and `createImageBitmap` count as pending, as they settle in a later task (FR-037) |
| `cv` | The run's copy of the CV document (FR-029) |
| `localStorage`, `indexedDB`, `caches`, `document`, `window` | Missing or throwing: the frame's origin is opaque and a worker has no DOM (FR-039) |
| `importScripts`, `import(…)` of a URL | Blocked by the frame's policy: nothing is fetched (FR-042) |
| `Worker`, `SharedWorker` | Not offered (R18) |

`close()`, on the scope and its prototypes, logs the `closed` note and ends the run before closing
the worker, so a closed worker doesn't read as blocked (T188).

## Lines

The runtime reports a thrown error's position in the worker script; the host subtracts the
prelude's lines and maps it through the source map of `getRunnable` to the line in the visitor's
code (R13). A position that maps to nothing gives no line, never a wrong one.
