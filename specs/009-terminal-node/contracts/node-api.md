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
- `util.types` holds the common checks, written here, as the inspect package has none.
