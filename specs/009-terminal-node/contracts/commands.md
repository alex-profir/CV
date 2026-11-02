# Contract: Commands

`tsnode` is the same command as `ts-node`. A script path resolves from the working folder.

| Line | Result | Status |
|------|--------|--------|
| `node <file> [args]` | Runs a JS or TS file, TS without checking types | Program's |
| `ts-node <file> [args]` | Checks types, then runs if none failed | Program's, or 1 on a type error |
| `node -e <code>` | Runs the code | Program's |
| `node -p <code>` | Runs the code and prints its result | Program's |
| `node` or `ts-node`, no script | Site text: no interactive mode, and how to run a file | 1 |
| `-v`, `--version` | `v26.0.0 (browser runtime, not Node.js)` | 0 |
| `-h`, `--help` | Usage, the modules offered, and this spec's `contracts/node-api.md` | 0 |
| Other option | `node: bad option: --x` | 9 |
| Any larger line with one of these | Site text: runs only on a line of its own | 1 |

## The sole-command check

The typed line must parse to one statement, one pipeline and one simple command, whose name is literally one
of these, with no redirection, no background, and no command or process substitution in its words. Assignments
before it are allowed and join the environment.

## Formats

Uncaught error, as FR-017 sets (`^` under the column):

```text
/home/guest/a.js:2
  throw new Error('x');
  ^

Error: x
    at foo (/home/guest/a.js:2:9)

node v26.0.0 (browser runtime, not Node.js)
```

Type error:

```text
TSError: Unable to compile TypeScript:
app.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

Stopped: `^C` as today, then the prompt. `$?` is 130. Printed 1 MB: 006's `stopped.output` line.
