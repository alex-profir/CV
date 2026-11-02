# Contract: What a program can use

This is the list FR-013 leaves to the plan. Anything else a program reaches for doesn't exist, and `ts-node`
reports it as a type error.

## Globals

The list in FR-012, plus the engine's own standard JavaScript. `process`: `argv`, `argv0`, `execPath`, `env`,
`cwd`, `chdir`, `exit`, `exitCode`, `platform` (`browser`), `arch`, `version`, `versions`, `release`, `pid`,
`title`, `hrtime`, `hrtime.bigint`, `uptime`, `memoryUsage`, `nextTick`, `stdout`, `stderr`, `stdin`, `on`,
`once`, `off`, `emit`, `emitWarning`. `stdout` and `stderr`: `write`, `isTTY` (false), `columns`. `stdin`: reads
as ended at once. `console`: `log`, `info`, `debug`, `error`, `warn`, `trace`, `dir`, `table`, `group`,
`groupEnd`, `time`, `timeEnd`, `timeLog`, `count`, `countReset`, `assert`.
`fetch` exists and always rejects with a `TypeError` that says there is no network (FR-023).

## Modules

With or without `node:`.

| Module | Offers |
|--------|--------|
| `fs` | `readFileSync`, `writeFileSync`, `appendFileSync`, `existsSync`, `statSync`, `lstatSync`, `readdirSync`, `mkdirSync`, `rmSync`, `rmdirSync`, `unlinkSync`, `renameSync`, `copyFileSync`, each with its callback form (`readFile`…) |
| `fs/promises`, `fs.promises` | The same, as promises |
| `path` | All of `path.posix`; `path.posix` and `path.sep` too |
| `events` | `EventEmitter` with `on`, `once`, `off`, `addListener`, `removeListener`, `removeAllListeners`, `prependListener`, `emit`, `listenerCount`, `listeners`, `eventNames`, `setMaxListeners`; `once(emitter, name)` |
| `util` | `inspect`, `format`, `promisify`, `callbackify`, `isDeepStrictEqual`, `inherits`, `deprecate`, `types` as the inspect package gives it, `TextEncoder`, `TextDecoder` |
| `assert` | `ok`, `equal`, `notEqual`, `strictEqual`, `notStrictEqual`, `deepEqual`, `deepStrictEqual`, `notDeepStrictEqual`, `throws`, `doesNotThrow`, `rejects`, `fail`, `match`, `AssertionError`; `assert/strict` |
| `os` | `EOL`, `platform`, `type`, `arch`, `homedir`, `tmpdir`, `hostname`, `cpus`, `totalmem`, `freemem`, `uptime`, `userInfo`, with fixed values that say browser where they can |
| `timers` | The timer functions |
| `timers/promises` | `setTimeout`, `setImmediate`, `setInterval` |
| `buffer` | `Buffer`, `constants` |
| `url` | `URL`, `URLSearchParams`, `fileURLToPath`, `pathToFileURL` |

## Known differences from Node

- Engine error wording and stack detail vary by browser. WebKit's stacks have no places (research R5).
- In WebKit, a program that reads `error.stack` itself sees the runtime's frames, with no places for its own. Errors
  printed by `console` or left uncaught show none of them.
- `import` bindings aren't live (R4).
- An `import()` run through `eval` or `new Function` is the engine's own and not the loader's. The browser refuses it,
  and some browsers never settle its promise rather than reject it.
- A thrown value that is no error, such as `throw 5`, prints without its file and line, as the engine gives no place
  for it.
- There's no `stream`, so no `createReadStream`, and `process.stdout` is only what's listed.
- A JavaScript program can't require a `.ts` file (R12).
- `exit` handlers don't run after a stop (FR-035), and a `SIGINT` handler can't stop the second Ctrl+C (FR-033).
- Timers are throttled when the page is hidden, as for any page.
- `Date`, `performance` and other standards come from the browser, as do its limits.
- A settled promise prints as `Promise { <pending> }`, as a page can't read its state, and an `EventEmitter`
  prints without Node's private fields.
- `assert`'s message for a deep difference lists both values rather than Node's line-by-line difference, and
  `assert.ok`'s doesn't quote the source line.
- `ts-node` gives a `.ts` or `.cts` file `require`, `module`, `exports`, `__filename` and `__dirname` even if it uses
  `import`, as the real `ts-node` does by default, and `node file.ts` doesn't, as Node doesn't. A `.mts` file is checked
  as if it had them, though it doesn't.
- `Buffer`'s errors have Node's names and codes, and the `buffer` package's words.
- A `Map` or `Set` iterator prints without its entries, as `[Map Iterator] {  }`, as a page can't read one without
  using it up.
- A `Proxy` prints as what its traps give, without `Proxy(…)`, as a page can't tell one. `console.log` runs its traps, so
  one whose `get` throws ends the program where Node prints it.
- An uncaught error points at the place it was made, not of its `throw`: `const e = new Error('x');` and a later
  `throw e`, or a rethrow from a `catch`, show the line of the `new`. An engine says nothing of a `throw`.
- `util.types` holds the common checks, written here, as the inspect package has none.
