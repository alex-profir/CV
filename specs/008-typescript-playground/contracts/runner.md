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

JavaScript the browser refuses fails the worker's whole script before the runtime starts, whatever
TypeScript made of it (T195, T207). The bootstrap tells it apart: an `error` event before the worker's
first message. Chromium's event has the message and line; Firefox's and WebKit's are bare, so the bootstrap
says `refused`, and the page finds them by building, and never calling, an async function of the code,
which a future site-wide policy would have to allow. The frame's policy keeps `blob:` out of `script-src`
(R17), so `importScripts` can't find them in the frame. The run then ends as `nothing-ran` with the reason `unreadable`, the note
`cantRead` counting TypeScript's errors or, with none, this one, and the browser's message logged at
its line in the code (FR-033, FR-035).

## The frame

```html
<iframe sandbox="allow-scripts" hidden title="" srcdoc="…"></iframe>
```

The `srcdoc`:

```html
<!doctype html>
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'sha256-<bootstrap>'; worker-src blob:; connect-src * data: blob:">
<script>/* bootstrap */</script>
```

- No `allow-same-origin`, `allow-popups`, `allow-modals`, `allow-top-navigation`, `allow-forms` or
  `allow-downloads`. One frame per run, removed when the run ends.
- `connect-src` allows `data:` and `blob:` as well as any site: `fetch` of either reads only what's
  already in the worker, reaches no site and runs nothing, as `script-src` still keeps `blob:` out (R17).
- `<bootstrap>`'s hash is computed by the build; a test fails if the policy and the script differ.
- A future site-wide Content Security Policy must allow the bootstrap's hash and `worker-src blob:`
  for the frame, since a `srcdoc` document inherits its parent's policy.

## Messages

All after the first go over one `MessagePort` between the host and the worker, each carrying the
run's nonce; a message without it is ignored.

| From → to | Message | Meaning |
|-----------|---------|---------|
| host → bootstrap | `{ start, nonce, source, port }` (by `postMessage` to the frame, the port transferred) | Make the worker from `source` and hand it the port |
| bootstrap → host | `{ worker: 'started' \| 'failed' \| 'died' \| 'unreadable' \| 'refused', nonce, message?, line?, column? }` | The worker exists, couldn't be made, or died (an `error` event reached the frame, R24) |
| host → worker | `{ run, nonce, cv, prelude }` | Set `cv` and run the code; `prelude` is the script's lines before the code, so an error's line skips the runtime's wrappers (FR-035) |
| host → worker | `{ ping, nonce, n }` every 250 ms | Heartbeat (R19) |
| worker → host | `{ pong, nonce, n }` | Answered as soon as the worker's event loop is free |
| worker → host | `{ started, nonce }` | The code is about to run; the heartbeat starts |
| worker → host | `{ logs, nonce, entries, dropped, cleared, uncaught }` | A batch (R18); `cleared` when `console.clear` emptied the logs before it; `uncaught` counts the run's uncaught errors so far, dropped ones too. An uncaught error or rejection is an `error` entry under the same limit (T220), with its place in the worker's script (`at`), which the host maps to the code's line |
| worker → host | `{ pending, nonce, timers, requests }` | When the counts change, at most once per 50 ms: thousands of timers froze the page otherwise (T220) |
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
| Stream reads, `scheduler.postTask`, locks and the like | Pending until they settle; a read of a stream that never ends keeps the run going until Stop, as a request that never answers does (FR-037) |
| `AbortSignal.timeout` | A pending timer once the code listens for its `abort`; a signal only passed to `fetch` holds nothing (FR-037) |
| A message to the code's own port | Pending until it has arrived, by a short wait (10 ms); one with a handler and no message isn't pending (FR-037) |
| `BroadcastChannel` | Taken away, as `Worker` is: a loop of sends grew the browser's memory by gigabytes, with nothing to pace it. Using one is an error the logs show (FR-040) |
| The worker's own `postMessage` | Sends nothing, on the scope and every holder: nothing listens, and a loop of them took the page down (FR-040) |
| `FileReader`, `OffscreenCanvas.convertToBlob`, `FontFace` and `FontFaceSet`'s `load`, `ImageDecoder.decode`, the codecs' `flush`, `navigator.gpu.requestAdapter` | Pending until they end (FR-037) |
| `setTimeout` and `setInterval` given a string | The browser's refusal, as `eval`'s, is logged as an uncaught error; they return 0 and run nothing (FR-037, T228) |

Not counted, so a run with nothing else pending ends without them: what only an event can say has
ended and the code itself starts with no call of its own to count, as a codec's output with no `flush`,
a `WebTransport`, and work submitted to a GPU device. Awaiting them holds nothing, as with a promise
of the code's own; a timer or Stop is the way to wait (FR-036, T221).

A run ends 10 ms after nothing is left: the browser reports an unhandled rejection in a task of its
own after the microtasks, which the end must not pass (FR-035, T218).

`close()`, on the scope and its prototypes, logs the `closed` note and ends the run before closing
the worker, so a closed worker doesn't read as blocked (T188).

## Lines

The runtime reports a thrown error's position in the worker script; the host subtracts the
prelude's lines and maps it through the source map of `getRunnable` to the line in the visitor's
code (R13). A position that maps to nothing gives no line, never a wrong one.

A thrown value that isn't an `Error` has no stack, so in a callback its line is the browser's, from
the `error` event (T227). Three cases have no line: a value that isn't an `Error` thrown in the code's
own async body, a rejection with such a value, as nothing says where they came from, and in WebKit,
one thrown in a callback, as its `error` event is muted to "Script error." from an opaque origin, so
the runtime catches what its callbacks throw there, to keep the value.
