# Data Model: Node in the Terminal

Additions to 006's [data model](../006-terminal/data-model.md). Nothing is kept between visits. Message forms
are in [contracts/program.md](./contracts/program.md).

## Program request

What the shell worker gives the page in the `program` effect (research R6).

| Field | Meaning |
|-------|---------|
| `command` | `node` or `ts-node` (`tsnode` becomes `ts-node`) |
| `script` | Absolute path, or null with `-e` or `-p` |
| `code`, `print` | The code of `-e` or `-p`, and whether to print its result |
| `args` | Words after the script |
| `cwd`, `env` | The working folder, and exported variables with any on the line |
| `files` | The snapshot below |

Rule: there is at most one per line, and only when the line passes the sole-command check.

## File snapshot

`entries`: `{ path, kind: 'file' | 'folder', owner, protected, text?, binary? }` for what the visitor can read.
`text` follows `VisitorFiles`: for a `binary` file it holds one character a byte. `bytes` is the visitor's
total. It is at most 1 MB of visitor files plus the site's own.

## Program

Lives in the page's host and the session, from the effect until it ends.

```text
loading ─▶ compiling ─▶ running ─▶ stopping ─▶ ended(status)
   │           │           │  ▲        │
   │           │           │  └────────┘  first Ctrl+C with a handler; the handler decides
   └───────────┴───────────┴────────────▶ ended(130)  Ctrl+C, second Ctrl+C, close, 1 MB
```

`loading` fetches the program bundle, and TypeScript if needed. `compiling` applies to TypeScript only, and a
type error ends it with status 1 with nothing run. `ended` holds `status` and a `reason`: `exit`, `uncaught`,
`type-error`, `offline`, `interrupted`, `output`, `memory`, `died` or `closed`.

## Session additions

| Field | Meaning |
|-------|---------|
| `running.block` | Grows as output arrives. Existing lines keep their nodes |
| `program` | `null`, or `{ interrupts, stillShown }`: Ctrl+C presses so far, and whether FR-027's line has shown |
| `state.status`, `state.pipes` | Set from the program's status when it ends, so `$?` reads it on the next line |
| `files` | Replaced by what `apply` returns |

The client's own restart state takes the same status and files.

## File changes

A list, in the order the changes happened, of the latest of each path's file (`{ path, text, binary? }` or
`{ path, removed }`) and of its folder (`{ path, made }`). Nothing is kept of a removal of a path that wasn't there at the
start. The sum of written bytes is limited to `QUOTA`, on top of what's there, and the paths of what's made to a quarter
of that, which the runtime refuses with `ENOSPC`. Applied once, at the end, through `TerminalFs`, in turn, and a write
refused for space is tried again once the rest has made room.

## Compile result

`{ diagnostics: { file, line, column, code, message }[], outputs: { path → { js, map, syntax? } } }`. Empty
diagnostics for `node`, which checks no types. `syntax` is `{ line, column, message }`, the first syntax error in that
file under `node`, which the runtime throws in FR-017's form when it loads the file, before any of it runs.

## Output block

Unchanged kinds: `text` with `stream`, and the `stopped` line. New site-text lines (still running, TypeScript
download, no interactive mode, own line) use `text` with the `dim` tone.
