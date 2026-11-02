# Feature Specification: Node in the Terminal

**Feature Branch**: `009-terminal-node`

**Created**: 2026-11-02

**Status**: Approved

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> I want to extend the terminal to include node and tsnode commands, just like in a real terminal,
> with actual node running. Would this be possible? And I also want to be sandboxed so that loops
> don't break the app, and signals so that ctrl + c can kill the process.
>
> It should just behave like node, no need for the actual node pipes or full commands, it can just
> be a sandbox to be able to write some node, attempt to run it and see errors and code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write a script, run it and see what it prints (Priority: P1)

A developer looking through the site opens the Terminal, writes a short script in the vim view,
saves it and types `node hello.js`. What it prints appears as it prints it, and a new prompt follows
when it ends, as in a real terminal.

**Why this priority**: this is the feature. Without it, nothing else here has anything to act on.

**Independent Test**: create a file in the Terminal that logs values and uses a timer, run it with
`node`, and confirm that the output appears as it is printed and that the prompt returns at the end.

**Acceptance Scenarios**:

1. **Given** a saved `hello.js` that logs a line, **When** the visitor runs `node hello.js`, **Then**
   the line appears, a new prompt follows, and `$?` is 0.
2. **Given** a script that logs once a second for three seconds, **When** it runs, **Then** each line
   appears when it is logged, not all together at the end, and the prompt returns after the last.
3. **Given** a script that logs an object, an array, a `Map` and an error, **When** it runs, **Then**
   each prints as Node prints it.
4. **Given** a script run as `node args.js one two`, **When** it reads `process.argv`, **Then** it
   gets the script's path, then `one` and `two`.
5. **Given** a script that calls `process.exit(3)`, **When** it ends, **Then** `$?` is 3.
6. **Given** the Terminal, **When** the visitor runs `node -e "console.log(1 + 1)"`, **Then** `2`
   appears.

---

### User Story 2 - See what went wrong (Priority: P2)

The visitor's script has a mistake. The Terminal shows the error as Node would: the file and line,
the line of code, a marker under the place, and the error with its stack. They open the file, fix it
and run it again.

**Why this priority**: the owner asked for a place to attempt code and see its errors. Errors are half
of what the visitor came to see.

**Independent Test**: run a script with a syntax error, one that throws, and one with a rejected
promise, and confirm each shows its file, line and message, and sets a non-zero status.

**Acceptance Scenarios**:

1. **Given** a script that throws on line 2, **When** it runs, **Then** the Terminal shows the file
   and line, that line of code, a marker under the place, and the error's name, message and stack,
   and `$?` is 1.
2. **Given** a script with a syntax error, **When** it runs, **Then** none of it runs, and the same
   form of error points at the place.
3. **Given** a promise rejected with nothing to catch it, **When** the script reaches that point,
   **Then** the program ends with the error shown, and `$?` is 1.
4. **Given** a script that doesn't exist, **When** the visitor runs `node missing.js`, **Then** the
   Terminal says it cannot find that module, and `$?` is 1.
5. **Given** a script that requires `http`, or a package such as `lodash`, **When** it runs, **Then**
   the error names what isn't available, in Node's form of the error.

---

### User Story 3 - An endless loop can't hurt the site, and Ctrl+C ends it (Priority: P3)

The visitor runs `while (true) {}` by mistake, or on purpose to see what happens. The windows, the
dock and the Terminal's screen keep responding. They press Ctrl+C: `^C` appears, what the program
had printed stays, and a new prompt follows.

**Why this priority**: the owner asked for this by name, and running a visitor's code on a public CV
is only acceptable if it can't damage the site.

**Independent Test**: run a blocking endless loop, confirm the shell still responds, press Ctrl+C,
and confirm the program ends within a second with its earlier output kept.

**Acceptance Scenarios**:

1. **Given** a program in an endless loop, **When** it runs, **Then** the shell's windows and dock and
   the Terminal's screen keep responding.
2. **Given** a running program, **When** the visitor presses Ctrl+C with no text selected, **Then**
   within a second it has ended, `^C` shows, what it had printed stays, `$?` is 130 and a new prompt
   follows.
3. **Given** a program that handled `SIGINT` with its own handler and isn't blocked, **When** the
   visitor presses Ctrl+C, **Then** its handler runs and the program carries on as the handler decides.
4. **Given** a program whose `SIGINT` handler doesn't end it, or one that is blocked, **When** the
   visitor presses Ctrl+C a second time, **Then** the program ends.
5. **Given** a program that has run for 5 seconds without printing, **When** the visitor looks at the
   Terminal, **Then** one line says that it is still running and that Ctrl+C stops it.
6. **Given** a program that prints without end, **When** it has printed 1 MB, **Then** it is stopped
   with the message of 006 FR-069, and the Terminal keeps responding throughout.
7. **Given** a running program, **When** the visitor closes the Terminal, **Then** the program ends.
8. **Given** a running program, **When** it tries to reach the page, the site's storage, another app
   or another site, **Then** it can't, and it gets an error it can read.

---

### User Story 4 - Run TypeScript (Priority: P4)

The visitor writes `app.ts` and runs `ts-node app.ts`. A type error stops it before it runs, as
`ts-node` does, and shows the file, line and error. Once fixed, it runs.

**Why this priority**: the site already shows TypeScript in the Playground, and developers will
expect it here. Plain JavaScript gives value without it.

**Independent Test**: run a TypeScript file with a type error and confirm that it reports the error
and doesn't run, fix the file, and confirm that it runs.

**Acceptance Scenarios**:

1. **Given** a valid `app.ts`, **When** the visitor runs `ts-node app.ts` or `tsnode app.ts`, **Then**
   it runs, and its output appears as with `node`.
2. **Given** an `app.ts` with a type error, **When** the visitor runs `ts-node app.ts`, **Then** the
   error shows with its file, line, column and code, nothing runs, and `$?` is 1.
3. **Given** the same file, **When** the visitor runs `node app.ts`, **Then** it runs without its types
   being checked.
4. **Given** an error thrown from a TypeScript file, **When** it shows, **Then** its lines are those of
   the visitor's file.
5. **Given** TypeScript hasn't been downloaded in this browser, **When** the visitor first runs a
   TypeScript file, **Then** the Terminal says it is downloading and how far along it is, and the
   program runs when it is done.
6. **Given** the Playground has already downloaded TypeScript, **When** the visitor runs a TypeScript
   file, **Then** nothing is downloaded again.

---

### User Story 5 - Use the Terminal's files and split code across them (Priority: P5)

The visitor's script reads `cv.json`, works something out and writes the result to a file, which
`cat` then shows. Another script requires a helper in the same folder.

**Why this priority**: it makes the sandbox feel like a machine, and lets a script work with the
site's own data. Scripts that use only the console already work without it.

**Independent Test**: run a script that reads `cv.json`, writes a new file and requires a local
module, then confirm the new file with `cat`.

**Acceptance Scenarios**:

1. **Given** a script that reads `cv.json`, **When** it runs, **Then** it gets the file's text.
2. **Given** a script that writes `out.txt`, **When** it ends, **Then** `cat out.txt` shows the text.
3. **Given** a script that writes a protected file, or more than the visitor's space holds, **When**
   it runs, **Then** it gets Node's form of the error, and nothing changes.
4. **Given** a script stopped with Ctrl+C after writing a file, **When** the prompt returns, **Then**
   the file written before the stop is there.
5. **Given** `helper.js` beside a script, **When** the script requires it with `./helper.js` or imports
   it, **Then** it gets the helper's exports.

---

### User Story 6 - Phone, keyboard and screen reader (Priority: P6)

A visitor on a phone has no Ctrl key, so the pocket terminal offers a Stop key while a program runs.
A screen-reader user hears the program's output without being flooded by it.

**Why this priority**: both shells and WCAG 2.2 AA are constitutional, but most visitors using this
feature are at a desktop keyboard.

**Independent Test**: run an endless loop in the pocket terminal and end it with the Stop key; run a
fast-printing program with a screen reader and confirm the announcements stay readable.

**Acceptance Scenarios**:

1. **Given** the pocket terminal with a program running, **When** the visitor presses Stop, **Then** it
   does what Ctrl+C does.
2. **Given** the pocket terminal with nothing running, **When** the visitor looks at its keys, **Then**
   Stop isn't offered, or is shown as unavailable as the approved design sets.
3. **Given** a program that prints quickly, **When** a screen reader follows the Terminal, **Then**
   output is announced in batches, at most once a second, and the program's end is announced once.

---

### User Story 7 - Run code offline (Priority: P7)

After one online visit, `node` works with no connection. TypeScript works offline too, once it has
been downloaded.

**Why this priority**: Principle VI requires it, and nothing in the feature needs a server.

**Independent Test**: go offline after one online visit and run a JavaScript file; in a browser with
no TypeScript download, run a TypeScript file offline and confirm the message.

**Acceptance Scenarios**:

1. **Given** one complete online visit, **When** the visitor runs `node hello.js` offline, **Then** it
   runs.
2. **Given** TypeScript hasn't been downloaded and there is no network, **When** the visitor runs a
   TypeScript file, **Then** the Terminal says that TypeScript has to be downloaded once with a
   connection, and how large it is, and `$?` is 1.

---

### Edge Cases

- **`node` or `ts-node` with no script**: there is no interactive mode. The Terminal says so in site
  text, shows how to run a file, and gives a new prompt, with `$?` as 1. It never waits for input.
- **A program that reads standard input**: it sees the input as already ended.
- **`node` as part of a larger line**, such as a pipe, a redirect, `&&`, a loop, a function or a script:
  nothing runs, the Terminal says that `node` runs only on a line of its own, and `$?` is 1.
- **Lines typed while a program runs**: they wait and run in order, as lines typed while a line runs do
  today (006). Ctrl+C drops them too, as it does today.
- **Ctrl+C with text selected**: it copies, as today (006 FR-075), and the program carries on.
- **A timer or interval left running**: the program keeps running until it ends or is stopped, as in
  Node. No time limit applies.
- **`process.chdir` or a change to `process.env`**: holds for that program only. The shell's folder
  and variables don't change.
- **A program that uses too much memory**: where the browser reports it, the program ends with a
  message saying so. See Assumptions for what can't be prevented.
- **An error thrown inside a `SIGINT` handler**: it ends the program as any uncaught error does.
- **A very long line of output**: it wraps, as all output does (006 FR-023).
- **The file changes while it runs**: the program keeps the text it started with.
- **A script in a protected folder, such as a site file**: it can be run if it can be read, and a
  file that isn't JavaScript or TypeScript gives the error Node's parser gives.
- **`--version`, `-v`, `--help`, `-h`**: `--version` prints a version that says it is a browser
  runtime and not Node itself. `--help` lists what's offered. An unknown option gives Node's `bad option` error, with `$?` as 9.
- **Scrolling back while a program prints**: output stops pulling the view down until the visitor
  returns to the end.

## Requirements *(mandatory)*

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `009-terminal-node-FR-###`. UI implementing a requirement carries
`data-req="009-terminal-node-FR-###"` (Constitution III).

### Functional Requirements

**Commands**

- **FR-001**: The Terminal MUST offer `node <file> [args]`, which runs a JavaScript or TypeScript file
  from the Terminal's files, resolved from the working folder. A TypeScript file run this way MUST run
  without its types being checked.
- **FR-002**: The Terminal MUST offer `ts-node <file> [args]`, and `tsnode` as the same command, which
  check a TypeScript or JavaScript file's types and run it only if they find no error.
- **FR-003**: `node -e <code>` and `node -p <code>` MUST run the code given, `-p` printing its result.
- **FR-004**: `node` and `ts-node` with no script MUST say in site text that there is no interactive
  mode and how to run a file, set the status to 1 and return to the prompt.
- **FR-005**: `--version` and `-v` MUST print a version that says this is a browser runtime and not
  Node itself. `--help` and `-h` MUST list what's offered. An unknown option MUST give Node's `bad
  option` error, with status 9.
- **FR-006**: A line that uses these commands as part of a pipe, a redirect, a list, a loop, a function
  or a script MUST run none of them, say in site text that they run only on a line of their own, and
  set the status to 1.
- **FR-007**: `help` and Tab completion MUST include these commands.

**Running**

- **FR-008**: A program MUST behave as a Node program does for what this spec lists: top-level code
  runs, then timers and promises, and it ends when nothing is left to do.
- **FR-009**: Standard output and standard error MUST appear in the Terminal while the program runs,
  in the order they were printed, within a quarter of a second of being printed.
- **FR-010**: The status after a program (`$?`) MUST be its exit code: the value given to `process.exit`
  or `process.exitCode`, 0 when it ends normally, 1 after an uncaught error, and 130 when stopped.
- **FR-011**: Values MUST print as Node prints them for primitives, objects, arrays, `Map`, `Set`,
  dates, errors, functions, classes and circular references, without color.
- **FR-012**: Programs MUST have these globals: `console`, `process`, `Buffer`, `URL`,
  `URLSearchParams`, `TextEncoder`, `TextDecoder`, `structuredClone`, `performance`, `setTimeout`,
  `setInterval`, `setImmediate`, `queueMicrotask` and their clearing functions, and in a CommonJS file
  `require`, `module`, `exports`, `__filename` and `__dirname`. `process` MUST offer `argv`, `env`,
  `cwd`, `chdir`, `exit`, `exitCode`, `platform`, `version`, `versions`, `pid`, `hrtime`, `uptime`,
  `memoryUsage`, `nextTick`, `stdout.write`, `stderr.write`, and `on` for `exit`, `SIGINT`,
  `uncaughtException` and `unhandledRejection`.
- **FR-013**: Programs MUST be able to load, by `require` or `import` and with or without the `node:`
  prefix: `fs`, `fs/promises`, `path`, `events`, `util`, `assert`, `os`, `timers`, `timers/promises`,
  `buffer` and `url`. For the functions that exist, behavior MUST match Node's; `plan.md` lists which
  functions each module offers, and `--help` points to that list.
- **FR-014**: Programs MUST be able to load other files from the Terminal's files by relative path, by
  `require` or `import`. `.mjs` files and `import` MUST work as modules, including top-level `await`.
- **FR-015**: `process.env` MUST start from the shell's exported variables and `process.cwd()` from its
  working folder. Changes to them MUST NOT outlive the program.
- **FR-016**: Standard input MUST read as already ended.

**Errors**

- **FR-017**: An uncaught error MUST show as Node shows it: the file and line, that line of code, a
  marker under the place, the error's name and message, its stack, and then the version line.
- **FR-018**: A syntax error MUST show in the same form, and none of the program MUST run.
- **FR-019**: A promise rejected with nothing to catch it MUST end the program as an uncaught error
  does, unless the program handles `unhandledRejection`.
- **FR-020**: A missing script, or a module not offered, MUST give Node's form of `Cannot find module`.
  A module of Node's that isn't offered, such as `http`, `child_process` or `crypto`, MUST also say that
  it isn't available in this Terminal. Stack lines and error lines MUST refer to the visitor's files and
  lines, including for TypeScript.
- **FR-021**: A type error from `ts-node` MUST show its file, line, column, code and message, and set
  the status to 1, with nothing run.

**Sandbox**

- **FR-022**: A program MUST have no access to the page, the shell, other apps, the site's storage or
  cookies, or the visitor's data, and MUST reach the Terminal's files only as FR-029 sets.
- **FR-023**: A program MUST NOT be able to make a request to any site, this one included. Requests it
  tries MUST fail with an error it can catch and read, so nothing typed in the Terminal leaves the
  browser (006 FR-022).
- **FR-024**: While a program runs, however it loops, blocks or prints, the shell, its windows, the
  Terminal's screen and the rest of the page MUST keep responding to input (006 FR-069). Running out of
  memory is the one exception (FR-028, Assumptions).
- **FR-025**: A program MUST NOT be able to start further threads or processes, and any it tries MUST
  fail with an error it can read.
- **FR-026**: A program that prints 1 MB MUST be stopped with the message of 006 FR-069, keeping what
  the Terminal shows, and with status 130. The Terminal MUST keep responding while it prints.
- **FR-027**: No time limit MUST apply to a program. After 5 seconds with nothing printed, the Terminal
  MUST show one line in site text saying that it is still running and how to stop it.
- **FR-028**: Where the browser reports that a program ran out of memory, the program MUST end with a
  message in site text saying so, and the status 1.

**Files**

- **FR-029**: A program MUST see the Terminal's files, read and write them as the visitor can, with the
  same protected files, owners and 1 MB of space (006 FR-049, FR-073). Refused writes MUST give Node's
  form of the error (`EACCES`, `ENOENT`, `ENOSPC`, `EISDIR`), and MUST change nothing.
- **FR-030**: What a program wrote MUST be in the Terminal's files once it ends, including when it was
  stopped, as far as it had got. It MUST also be seen by the program itself at once.

**Stopping and signals**

- **FR-031**: Ctrl+C with no text selected, while a program runs and has no `SIGINT` handler, MUST end
  it within a second, however it is behaving: show `^C`, keep what it printed, set the status to 130 and
  give a new prompt. Lines waiting behind it MUST be dropped as 006 FR-075 drops them.
- **FR-032**: With a `SIGINT` handler, the first Ctrl+C MUST call the handler as soon as the program
  can run it, and the program MUST carry on as the handler decides.
- **FR-033**: A second Ctrl+C for a running program MUST always end it as FR-031 does, handler or not,
  so no program can refuse to stop.
- **FR-034**: Closing the Terminal, resetting it or leaving the page MUST end a running program.
- **FR-035**: A program's `exit` handlers MUST run when it ends by itself or by `process.exit`. They
  MUST NOT run when it is ended by FR-031 or FR-033.

**TypeScript**

- **FR-036**: No code for running programs MUST load before the first program runs in a visit, and
  TypeScript MUST NOT load before the first TypeScript run, keeping what the Terminal loads at first
  open as it is (006 FR-070). The site's offline copy MUST hold the code for running JavaScript after one
  complete online visit.
- **FR-037**: The first TypeScript run MUST use the Playground's copy of TypeScript if this browser has
  one. With none, the Terminal MUST say it is downloading and show how far along it is. Ctrl+C MUST stop
  that wait, and the line it began MUST end with status 130.
- **FR-038**: `ts-node` MUST check with strict options and types for the program's globals and the
  modules of FR-013, so valid code that uses them shows no error.

**Phone, keyboard and screen readers**

- **FR-039**: While a program runs, the pocket terminal MUST offer a Stop key, a button at least 44 by
  44 CSS px in the place the approved design sets, that does what Ctrl+C does.
- **FR-040**: Output printed while a program runs MUST reach screen readers in batches, at most once a
  second, and the program's end MUST be announced once with its status.
- **FR-041**: New output MUST keep the end of the output in view unless the visitor has scrolled back,
  until they return to the end. With reduced motion set, this MUST NOT animate.

**Amendments of older specs**

- **FR-042**: This feature amends 006-terminal: FR-068's rule that no command may run a real program or
  code in another language, and that the shell offers no `node`, changes to allow the commands of this
  spec, running only as this spec sets; the other names it lists stay out. FR-069's limits do not apply
  to a program. FR-075's Ctrl+C keeps what a program printed, as FR-031 sets. The pocket terminal's
  command keys of FR-024 and FR-078 gain the Stop key of FR-039. 006 records each change as the
  constitution's Principle XI sets, naming this feature.

**Checks**

- **FR-043**: Every pull request's automated checks MUST cover, in a real browser: a program's output
  while it runs, an endless loop with the shell still responding, Ctrl+C on that loop, a second Ctrl+C
  past a handler, an error's form, a program that tries to reach the page and the network, and running
  offline. A failure MUST say what failed.

### Key Entities

- **Program**: one run of a file or of code given with `-e` or `-p`. Has its path, arguments, working
  folder, environment, the text it started with, and a state: starting, running, handling a stop, or
  ended with a status.
- **Program output**: what a program has printed so far, in order, with whether each part was standard
  output or standard error. Stays in the Terminal after the program ends.
- **Stop request**: a Ctrl+C or Stop key press for a running program. The first goes to a handler if
  there is one; the second always ends the program.
- **Node module**: a built-in name a program can load (FR-013), or a file from the Terminal's files
  (FR-014).

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: in the Terminal's window | - |
| Mobile (iOS-style) | Yes: in the pocket terminal, with a Stop key while a program runs (FR-039) | - |

**CV path**: Unchanged. Nothing loads for this feature until a visitor runs a program (FR-036), and no
program runs by itself. The CV stays one click (desktop) or one tap (mobile) from first load, and `/cv`
remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully for JavaScript after one complete online visit; for TypeScript once it has
  been downloaded in this browser.
- **Available offline**: `node`, `ts-node`, errors, Ctrl+C and the Terminal's files. A program's code
  needs no connection.
- **Needs the network**: only the first download of TypeScript. It is several megabytes and most visitors
  never ask for it, so it isn't part of the copy every visit stores (008 FR-009).
- **Offline state shown**: a TypeScript run with no copy says that it has to be downloaded once with a
  connection and how large it is, with status 1. Never a blank or broken view.

## Design *(mandatory)*

**UI change**: the pocket terminal's keys change, and a running program is a new state of the Terminal,
so the design gate applies to that part (Constitution II). Design artifacts live in
`specs/009-terminal-node/design/`:

- [ ] ASCII wireframes: a program running and printing, one stopped with `^C`, an uncaught error, a
  TypeScript download in progress, and the still-running line, on desktop; the same in the pocket
  terminal with the Stop key, at 320 px wide
- [ ] PNG exports of the approved Penpot mockup, per supported shell (or of the interim local mockup,
  under the constitution's interim provision)
- [ ] Penpot file link: not needed for an interim local mockup until the provision ends
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can write a five-line script in the Terminal, run it and read its output
  in under a minute, with no instructions beyond `help`.
- **SC-002**: With a program in a blocking endless loop, moving a window, opening an app and typing in
  the Terminal all respond as they do with no program running.
- **SC-003**: Ctrl+C ends any running program within 1 second of the press, or the second press where
  the program has a handler, in all three current main browser engines.
- **SC-004**: No program, in a test set of deliberate attempts, reaches the page, the site's storage,
  cookies or the network.
- **SC-005**: For each of a set of errors (syntax, thrown, rejected, missing module, type error), the
  visitor can see the file and line to fix from the Terminal's output alone.
- **SC-006**: A set of scripts using only what FR-012 and FR-013 list prints the same text here as under
  Node, leaving out stack lines and the version line.
- **SC-007**: The code that runs programs and TypeScript is no part of what loads at the site root, `/cv`
  or the Terminal's first open. Those gain only this feature's words, controls and command names, within
  the site's existing size budget, and Lighthouse scores stay at 90 or higher. Amended 2026-11-02 (from
  `/speckit-plan`): it said what loads does not grow, which the Stop key's own words and code can't meet.

## Assumptions

- **Not real Node**: the owner chose on 2026-11-02 that this should behave like Node rather than be Node.
  Programs run on the browser's own JavaScript engine, which differs by browser in small ways, such as
  the wording of an engine's error messages and stack lines. The version output says so (FR-005).
- **Out of scope**: an interactive prompt, standard input, pipes and redirects, packages and `npm`,
  network access, native modules, `http`, `net`, `crypto`, `child_process`, `worker_threads`, and options
  beyond those in FR-003 and FR-005, including `ts-node`'s `--transpile-only`. The owner said full commands
  and pipes aren't needed. Each could be later work.
- **Type errors stop `ts-node`**: as the real command does by default. `node file.ts` is the way to run
  past them.
- **Memory**: browsers offer a page no firm cap on a program's memory. A program that allocates without
  end can make the browser end the tab, as any page can. Loops and output can't do this (FR-024, FR-026).
  Reloading recovers, with the CV unaffected.
- **Files**: programs use the Terminal's files as they are. When the Files feature moves the Terminal onto
  the shared files (docs/vision.md), programs move with it.
- **Writing code**: the vim view and the shell's own commands are how a visitor writes a file. This
  feature adds no editor. The Terminal's files last for the visit, as they do today.
- **Dependencies**: the Terminal (006), and the Playground (008) for its copy of TypeScript and its
  sandbox approach. `docs/vision.md`'s Terminal entry gains this in the feature's pull request.
