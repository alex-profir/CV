# Wireframes: Node in the Terminal

These show structure and text only. The [interim local mockup](mockup/README.md) sets the look, built from the
real Terminal. Frames aren't to scale. Everything not listed here is as 006's design has it: window, prompt, output,
starter chips and vim view are unchanged. A program's entry is an ordinary run: the command line stays live below it,
and lines typed there wait.

## Desktop

### 1 A program running and printing

```text
guest ~ ⏱09:41 ❯ node tick.js
tick 1
tick 2
tick 3
guest ~ ⏱09:41 ❯ █            ← typed lines wait until it ends
```

### 2 Still running, after 5 s with nothing printed (FR-027)

```text
guest ~ ⏱09:41 ❯ node -e "while (true) {}"
Still running. Ctrl+C stops it.        ← dim, once
guest ~ ⏱09:41 ❯ █
```

### 3 Stopped with Ctrl+C (FR-031)

```text
guest ~ ⏱09:41 ❯ node tick.js
tick 1
tick 2
tick 3
^C                                      ← dim; output stays
guest ~ ⏱09:41 ❯ █
```

### 4 Uncaught error (FR-017), syntax errors alike

```text
guest ~ ⏱09:41 ❯ node bad.js
/home/guest/bad.js:2                    ← all in the error tone
  throw new Error('no such skill');
  ^

Error: no such skill
    at find (/home/guest/bad.js:2:9)
    at /home/guest/bad.js:5:1

node v26.0.0 (browser runtime, not Node.js)
guest ~ ⏱09:41 ❯ █
```

### 5 Type error (FR-021)

```text
guest ~ ⏱09:41 ❯ ts-node app.ts
TSError: Unable to compile TypeScript:
app.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.
```

### 6 TypeScript downloading (FR-037): one line per 25%, dim

```text
guest ~ ⏱09:41 ❯ ts-node app.ts
Downloading TypeScript, once: 25% of [size] MB
Downloading TypeScript, once: 50% of [size] MB
```

### 7 TypeScript offline, with no copy

```text
guest ~ ⏱09:41 ❯ ts-node app.ts
ts-node: TypeScript has to be downloaded once with a connection: [size] MB.
```

### 8 No script (FR-004) and 9 a larger line (FR-006)

```text
guest ~ ⏱09:41 ❯ node
node: there is no interactive mode here. Run a file: node hello.js
guest ~ ⏱09:41 ❯ node a.js | cat
node: runs only on a line of its own here.
```

## Phone (375 × 812 and 320 × 568)

The same nine states in the pocket terminal. Differences:

- No time in the prompt, as today.
- State 2 reads `Still running. The Stop key stops it.`
- **While a program runs, Stop takes the place of `clear`** (FR-039). Its line could only wait, so it's the key
  least missed, and the grid doesn't move. With nothing running the key is `clear` again.

```text
┌───────┬───────┬───────┬──────────┐
│ help  │ about │ work  │ projects │
├───────┼───────┼───────┼──────────┤
│ cv    │ ls    │▓Stop ▓│ Tab ⇥    │
└───────┴───────┴───────┴──────────┘
```

**With the phone's keyboard open** (amended 2026-11-02), the row above it holds one key, so while a program runs Stop
takes Tab's place there. Otherwise Stop would be out of reach. With nothing running the key is Tab again.

```text
┌───────────────────────────────────┐
│                            ▓Stop ▓│
├───────────────────────────────────┤
│         the phone's keyboard      │
└───────────────────────────────────┘
```

## Keyboard and screen readers

- Stop is a button named `Stop the program`, in the keys' toolbar and its arrow-key order, at least 44 by 44 px.
  If it has focus when the program ends, it becomes `clear` in place, so focus doesn't move.
- Output is announced in batches at most once a second, and the end once, with its status (FR-040):
  `Program ended, status 1.`
- No motion is added.

## Site text

| Where | Text |
|-------|------|
| Still running, desktop | `Still running. Ctrl+C stops it.` |
| Still running, phone | `Still running. The Stop key stops it.` |
| Stop key's name | `Stop the program` |
| Download | `Downloading TypeScript, once: {n}% of {size} MB` |
| Offline | `ts-node: TypeScript has to be downloaded once with a connection: {size} MB.` |
| No script | `node: there is no interactive mode here. Run a file: node hello.js` |
| Larger line | `node: runs only on a line of its own here.` |
| Ran out of memory | `node: the browser ended this program: it ran out of memory.` |
| Died | `node: the browser ended this program.` |
| Announced at the end | `Program ended, status {n}.` |
| Printed 1 MB | 006's `stopped.output`, unchanged |
