# Wireframes: The TypeScript Playground

These wireframes show structure, order and behavior only. The interim local mockup sets the visual
design, and its exports are in [mockup/](mockup/README.md). The frames aren't to scale. Desktop
frames stand for a 1440 × 900 browser window, phone frames for 375 × 812 unless a frame says
otherwise.

Text in `[brackets]` comes from the CV document, TypeScript or the repository when the site is
built. Everything else is site text, set by this design (FR-031). The full list is under
[Site text](#site-text).

## Legend

005's and 006's legends hold. These marks are new:

| Mark | Meaning |
|------|---------|
| `(▶ Run)` | A filled button, the window's main action |
| `[■ Stop]` | An outlined button. Dimmed when it does nothing, as Stop with no run going |
| `‹Examples ▾›` | A tool button: a glyph and a name, with no outline until it is open |
| `▏` | The editor's cursor, a steady mint bar |
| `~~~~` | An error mark under code: a wavy rose underline |
| `░░░░` | Other uses of the name under the cursor, on a faint amber band |
| `{ JavaScript } Errors ①` | The pane tabs. Braces mark the open one; `①` is a count pill |
| `\| note \|` | A log entry's level, in small capitals, with a glyph for info, warn, error and alert |
| `:::::` | The scrim inside the Playground's window behind a popup. It never covers the shell |

## Design values the spec leaves to the design

| Value | Set to | Spec |
|-------|--------|------|
| Name and icon | **Playground**. An original glyph: braces around a play mark, in night, on an amber-to-rose tile with 14 px corners. It copies no TypeScript or editor logo | FR-001 |
| Place in the dock and on the home screen | After the CV app and the Terminal | FR-001 |
| Window when opened | 1040 × 648 px. Its right edge 40 px inside the desktop area's right edge, its top 64 px below the top of the window in front, so that window's title bar and app bar stay visible. Fitted to the area as 006's Terminal is: at least 24 px above its bottom, never below 400 × 300. With no window open, centered. At 1440 × 900 with the CV window open: x 360, y 88 in the area | FR-003, 005 FR-018 |
| Layout | A 44 px toolbar; under it, any message; then the editor on the left and a 400 px pane column on the right, split by a hairline; a 28 px status bar at the bottom | FR-020, FR-072 |
| Narrow window | Below 720 px wide, the panes go under the editor, 240 px tall, and the tools show only their glyphs, keeping their names for screen readers | FR-072 |
| Where the version shows | At the right end of the status bar: `TypeScript [version]`, read from TypeScript | FR-012 |
| The run's state | At the right end of the toolbar, as text with a glyph: a dot for running, a tick for finished, a square for stopped, a cross for errors | FR-036 |
| Editor font | JetBrains Mono, 13 px on 20 px lines. A 48 px line-number gutter | FR-015, FR-068 |
| Syntax colors | Keywords lilac, types mint, functions periwinkle, properties haze, strings rose, numbers and `true`, `false`, `null`, `undefined` amber, comments fog in italics, punctuation fog, other code snow. Line numbers fog, the cursor line's snow on a faint band | FR-068 |
| Errors and warnings in the code | A wavy underline: rose for errors, amber for warnings. On the cursor's line, the message after the code, in rose with a cross | FR-016 |
| The panes | Tabs in this order: JavaScript, Declarations, Errors, Logs. Errors and Logs carry a count pill; the Errors pill turns rose when there are errors. JavaScript is open first | FR-020 |
| Compiler options and their defaults | See [Compiler options](#compiler-options) | FR-024, FR-025 |
| The CV data's name | `cv`, of type `Resume`, the CV document's type (002). No import | FR-029 |
| The examples | See [Examples](#examples) | FR-028, FR-031 |
| Keys that differ from VS Code | See [Keys](#keys) | FR-084, FR-085 |
| Messages | One line under the toolbar, with a glyph and a colored left edge: tick and mint when done, triangle and amber for a warning, cross and rose for an error, circle and periwinkle to inform. Each has its action and a dismiss control | FR-019, FR-052 to FR-057 |
| Popups | Inside the Playground's window only: the window's content dims behind them, the shell, the dock and other windows don't | FR-048 to FR-051, FR-080 |
| The stuck popup's text | See [Site text](#site-text) | FR-048 |
| Phone screen | The app's icon, a heading, a paragraph, Share link (filled) and Copy link (outlined), each the full width and 44 px tall, and a note. Centered. In landscape, the icon on the left and the rest beside it, the two buttons side by side | FR-058 |
| Forced colors and reduced motion | See [Accessibility](#accessibility) | FR-069, FR-070 |

## Desktop shell

### The window, as laid out

```
+-- Playground ----------------------------------------------------------- [Show specs] --+
| [x] [-] [^]                         Playground                                          |
+-----------------------------------------------------------------------------------------+
| (▶ Run) [■ Stop] | ‹Examples ▾› ‹Options› ‹Share›                    [run state]        |
+-----------------------------------------------------------------------------------------+
| [message, when there is one]                                          [action]  [x]     |
+-----------------------------------------------+-----------------------------------------+
|  1 │ code                                     | { JavaScript } Declarations Errors ① Logs ③|
|  2 │ code                                     |-----------------------------------------|
|  3 │ code ▏                                   | [caption]                               |
|  … │                                          | [the open pane]                         |
|    │                                          |                                         |
+-----------------------------------------------+-----------------------------------------+
| Ln 3, Col 6   Spaces: 2   ✓ No errors                         TypeScript [version]      |
+-----------------------------------------------------------------------------------------+
```

The menu bar reads: site menu, `Playground`, `Window`. The dock reads `CV`, `Terminal`,
`Playground`, each with its open mark.

### Downloading TypeScript (FR-007, FR-065)

The first open in a browser. Focus is on the window's title (FR-004). The window holds only the
download; there is no toolbar or status bar yet. Export: `desktop-01-downloading-1440.png`.

```
+-----------------------------------------------------------------------------------------+
| [x] [-] [^]                         Playground                          [Show specs]    |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|                                         ⤓                                               |
|                               Downloading TypeScript                                    |
|                         [=================·························]                     |
|                                    2.4 MB of 6.3 MB                                     |
|                  The Playground downloads TypeScript the first time it                  |
|                       opens. After that it opens at once, offline too.                  |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

- The bar is a progress bar named "TypeScript download", its value the text below it. Screen
  readers hear the start, every 25%, the end, and a failure (FR-065).
- When it finishes, the editor shows with the starting example and focus moves to it if it is
  still in the window (FR-004).

### The offline first open (FR-011)

No network on a first open, or the download stopped part way. Export:
`desktop-02-offline-1440.png`.

```
|                                        ☁̸                                                |
|                          TypeScript needs one download                                  |
|         The Playground runs TypeScript in your browser, and downloads it once,          |
|         with a connection: 6.3 MB. You're offline, so the download starts by            |
|                       itself when you're back online.                                   |
|                                     (Retry)                                             |
```

When the download stopped part way, the heading reads **The download stopped** and the text
"TypeScript arrived only in part, so the Playground won't use it. It needs one whole download with
a connection: 6.3 MB. The download starts again by itself when you're back online, or now with
Retry." Nothing part-downloaded is ever used. Export: `desktop-26-download-stopped-1440.png`
(amendment of 2026-10-30, adding the size FR-011 requires).

### TypeScript won't open (FR-011, amendment of 2026-10-30)

A whole copy arrived, or was stored, and won't start. It has the offline state's layout and glyph.
Trying again alone wouldn't help, so the text promises only Retry. Export:
`desktop-27-wont-open-1440.png`.

```
|                                        ☁̸                                                |
|                             TypeScript won't open                                       |
|         The Playground has TypeScript but couldn't start it. Retry downloads it         |
|                         again with a connection: 6.3 MB.                                |
|                                     (Retry)                                             |
```

### The Playground stopped showing (FR-039, FR-040, amendment of 2026-10-30)

A failure while drawing the window stays in the window: the dock, the CV window and the next run
go on working. It has the loading state's layout, with no glyph. The panel is an alert, and Try
again empties the logs, since what they hold may be what failed. Export:
`desktop-25-contained-1440.png`.

```
|                         The Playground stopped showing                                  |
|     Something went wrong while showing the Playground. The rest of the site still       |
|           works, and your code is safe. Try again clears the logs.                      |
|                                   (Try again)                                           |
```

### Ready, with the starting example (FR-004, FR-012, FR-019, FR-028)

Focus is in the editor, the cursor at the start. The JavaScript pane is open. Export:
`desktop-03-ready-1440.png`.

```
| (▶ Run) [■ Stop] | ‹Examples ▾› ‹Options› ‹Share›                                         |
+-----------------------------------------------+-----------------------------------------+
|  1 │ ▏// Welcome to the Playground, a TypeSc… | { JavaScript } Declarations Errors ⓪ Logs ⓪|
|  2 │ // in your browser. Errors show as you … | What TypeScript compiles the code to ·  |
|  3 │ // at a name shows its type. Run the co… |   ES2022 · read only                    |
|  4 │ // Cmd+Enter: what it logs shows in Log… | "use strict";                           |
|  6 │ type Greeting = { name: string; times: … | // Welcome to the Playground, …         |
|  8 │ function greet({ name, times }: Greetin… | function greet({ name, times }) {       |
| 12 │ console.log(greet({ name: "TypeScript",… |     return `Hello, ${name}! `.repeat(…  |
| 14 │ // The CV is here too, as typed data. T… | console.log(greet({ … }));              |
| 15 │ console.log(cv.basics?.label);           | console.log(cv.basics?.label);          |
+-----------------------------------------------+-----------------------------------------+
| Ln 1, Col 1   Spaces: 2   ✓ No errors                         TypeScript [version]      |
```

The code itself is under [Examples](#examples). In the JavaScript and Declarations panes, long
lines scroll sideways; nothing else does (FR-072).

### The editor with errors (FR-016, FR-022)

The visitor typed `const n: number = "one";`. The Errors pane is open. Export:
`desktop-04-errors-1440.png`.

```
| 13 │ const job: Job = { title: "Engineer", … | JavaScript Declarations { Errors ① } Logs ⓪|
| 14 │ const n: number = "one";▏  ⊗ Type 'stri… | 1 error · with the current options      |
|    │       ~                                  | +-------------------------------------+ |
| 16 │ console.log(describe(job));              | | ⊗ 14:7  Type 'string' is not        | |
|                                               | |         assignable to type 'number'.| |
|                                               | |                              TS2322 | |
+-----------------------------------------------+-----------------------------------------+
| Ln 14, Col 25   Spaces: 2   ⊗ 1 error                         TypeScript [version]      |
```

- Each error is a button: activating it moves the editor's cursor to its line and column (FR-022).
- With no errors, the pane reads "✓ No errors. The code checks with the current options."
- While checking takes more than a moment, the status bar reads `Checking…` in place of the count,
  and the marks stay as they were, dimmed (FR-016).

### A type on hover, and the Declarations pane (FR-017, FR-021)

The pointer rests on `describe`. The card shows over the line, the type in code colors and any
documentation under a hairline. Export: `desktop-05-hover-1440.png`.

```
| 14 │ const n: number = "one";                 | JavaScript { Declarations } Errors ① Logs ⓪|
|    │       +------------------------------------+ The type declarations of the code ·  |
|    │       | function describe(job: Job): string|   read only                          |
|    │       |------------------------------------| type Level = "junior" | "mid" | …   |
|    │       | Says what a job is, in one line.   | interface Job { … }                 |
|    │       +------------------------------------+ declare function describe(job: Job…|
| 16 │ console.log(░describe░(job));            | declare const job: Job;               |
```

From the keyboard, `Cmd+K Cmd+I` shows the same card for the name under the cursor, and a screen
reader reads it (FR-063).

### Suggestions open (FR-018)

The visitor typed `job.le`. The list sits under the cursor; the chosen entry has a periwinkle edge
and its type shows under the list. Export: `desktop-06-suggestions-1440.png`.

```
| 16 │ console.log(job.le▏);                    |
|    │                 +---------------------------+
|    │                 | (P) le|vel         Level  |  ← chosen
|    │                 | (P) title          string |
|    │                 | (P) years          number |
|    │                 |---------------------------|
|    │                 | (property) Job.level: Level |
|    │                 +---------------------------+
| Ln 16, Col 19   Spaces: 2   Checking…                         TypeScript [version]      |
```

Inside a call, a card above the cursor shows the function's parameters, the current one in bold
(FR-018). Each entry has a target at least 24 px tall (FR-067).

### A definition shown in place (FR-081)

`Option+F12` on `Job` opens its definition under the line, pushing the code below it down.
Export: `desktop-07-peek-1440.png`.

```
|  9 │ function describe(job: ░Job░): string {                                            |
|    │ +==============================================================================+   |
|    │ | Definition of Job   line 3        Escape closes · Enter goes there        [x] |   |
|    │ |------------------------------------------------------------------------------|   |
|    │ |  3  interface ░Job░ {                                                        |   |
|    │ |  4    title: string;  …                                                      |   |
|    │ +==============================================================================+   |
| 10 │   return `${job.title} …                                                         |
```

F12 goes to the definition, and `Shift+F12` lists every use in the same in-place view, one row
per use with its line.

### A rename (FR-081)

F2 on `job` puts a field over the name, holding it selected; every use is marked. Export:
`desktop-08-rename-1440.png`.

```
|  9 │ function describe([role    ]: Job): string {                                       |
|    │                   Enter renames 4 uses · Escape cancels                             |
| 10 │   return `${░job░.title} (${░job░.level}), ${░job░.years} years`;                  |
```

### Quick fixes (FR-082)

The cursor is on an error TypeScript can fix; a lightbulb shows in the gutter. `Cmd+.` or the
lightbulb opens the list. Export: `desktop-09-quick-fixes-1440.png`.

```
| 💡13 │ const ▏job: Job = { title: "Engineer", level: "senior" };                         |
|      │       ~~~                                                                         |
|      │       +--------------------------------------+                                    |
|      │       | Quick fixes                          |                                    |
|      │       | 💡 Add missing properties            |  ← chosen                          |
|      │       | 💡 Add missing property 'years'      |                                    |
|      │       | 💡 Add all missing properties in …   |                                    |
|      │       | Enter applies · Cmd+. opens this list |                                   |
|      │       +--------------------------------------+                                    |
```

A fix that would add a package import is never listed (FR-082).

### The command palette (FR-085)

F1 opens it over the top of the editor. Typing filters the commands; each shows its key. Export:
`desktop-10-command-palette-1440.png`.

```
|          +---------------------------------------------------+                          |
|          | > fo▏                                             |                          |
|          |---------------------------------------------------|                          |
|          | ▌Format Document                  Shift+Option+F  |  ← chosen                |
|          |  Format Selection                 Cmd+K Cmd+F     |                          |
|          |  Go to Definition                 F12             |                          |
|          |  …                                                |                          |
|          +---------------------------------------------------+                          |
```

### The list of keys (FR-085)

From the Playground menu's `Keys…`, a popup inside the window in two columns, with a note under
each key that differs from VS Code. Export: `desktop-11-keys-1440.png`.

```
| :::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: |
| ::  +------------------------------------------------------------------------+  :::: |
| ::  | Keys                                                               [x] |  :::: |
| ::  | The editor uses VS Code's keys, for a Mac. The menu bar, the dock and   |  :::: |
| ::  | the other windows keep their own shortcuts, Option+Shift with a letter, |  :::: |
| ::  | even from inside the editor.                                            |  :::: |
| ::  | COMMAND               KEY             | COMMAND               KEY       |  :::: |
| ::  | Run the code          Cmd+Enter       | Quick fixes           Cmd+.     |  :::: |
| ::  |  Not a VS Code key: …                 | …                               |  :::: |
| ::  | Every command is in the command palette, F1, with its key.              |  :::: |
| ::  +------------------------------------------------------------------------+  :::: |
```

On Windows and Linux the list shows those systems' keys (`Ctrl` for `Cmd`, `Alt` for `Option`).

### The Playground menu (FR-003, FR-085)

Export: `desktop-12-menu-1440.png`.

```
+-------------------------------+
| Run                 Cmd+Enter |
| Stop                          |  (dimmed with no run going)
|-------------------------------|
| Examples…                     |
| Compiler options…             |
| Share…                        |
|-------------------------------|
| Command palette            F1 |
| Keys…                         |
|-------------------------------|
| Reset…                        |
|-------------------------------|
| Show specs                    |
|-------------------------------|
| Move…          Option+Shift+P |
| Resize…        Option+Shift+S |
|-------------------------------|
| Minimize                      |
| Maximize                      |
|-------------------------------|
| Close          Option+Shift+W |
+-------------------------------+
```

Minimize and Maximize have no shortcut once 005 is amended (FR-086).

### Compiler options (FR-024 to FR-026)

`Options` turns the pane column into the options panel; closing it brings the pane back. Export:
`desktop-13-options-1440.png`.

```
+-----------------------------------------+
| Compiler options   Reset to defaults [x]|
|-----------------------------------------|
| LANGUAGE                                |
| target                     [ES2022  ▾]  |
| The JavaScript version the code …       |
| STRICT CHECKS                           |
| [x] strict                              |
|     Turns on every strict check below.  |
|   [x] noImplicitAny                     |
|   …                                     |
| OTHER CHECKS                            |
| [ ] noUncheckedIndexedAccess   …        |
| OUTPUT                                  |
| …                                       |
|-----------------------------------------|
| Changed from the defaults:              |
|   noUnusedLocals. Shared links carry it.|
+-----------------------------------------+
```

#### Compiler options

Every option has its name in code type and a short description. Changing one applies at once
(FR-025). Turning `strict` off unchecks the strict checks; each can then be set on its own.

| Group | Option | Default | Description |
|-------|--------|---------|-------------|
| Language | `target` | `ES2022` | The JavaScript version the code compiles to. `ES2015` to `ES2024` and `ESNext` |
| Strict checks | `strict` | on | Turns on every strict check below |
| | `noImplicitAny` | on | A value whose type can't be worked out is an error |
| | `strictNullChecks` | on | `null` and `undefined` are their own types |
| | `strictFunctionTypes` | on | Function parameters are checked exactly |
| | `strictBindCallApply` | on | `bind`, `call` and `apply` are checked against the function |
| | `strictPropertyInitialization` | on | Class properties must be set in the constructor |
| | `strictBuiltinIteratorReturn` | on | Built-in iterators return `undefined`, not `any` |
| | `noImplicitThis` | on | `this` with no type is an error |
| | `useUnknownInCatchVariables` | on | A caught error is `unknown`, not `any` |
| Other checks | `noUncheckedIndexedAccess` | off | Reading by index may give `undefined` |
| | `exactOptionalPropertyTypes` | off | An optional property can't be set to `undefined` |
| | `noImplicitReturns` | off | Every path through a function must return |
| | `noFallthroughCasesInSwitch` | off | A `case` can't fall through to the next |
| | `noImplicitOverride` | off | A method that overrides one must say `override` |
| | `noPropertyAccessFromIndexSignature` | off | Index-signature fields are read with brackets |
| | `noUnusedLocals` | off | A name declared and never read is an error |
| | `noUnusedParameters` | off | A parameter never read is an error |
| Output | `declaration` | on | Produce type declarations for the Declarations pane |
| | `removeComments` | off | Leave comments out of the JavaScript |
| | `noEmitOnError` | off | Produce no JavaScript while there are errors |
| | `useDefineForClassFields` | on | Class fields are set as JavaScript sets them |
| | `experimentalDecorators` | off | Use the older, experimental decorators |
| | `preserveConstEnums` | off | Keep `const enum` declarations in the JavaScript |

Options for modules, files, paths, packages, JSX, source maps and the project are not offered
(FR-024). `declaration` off makes the Declarations pane say "No declarations: `declaration` is off
in Compiler options." `noEmitOnError` with errors makes the JavaScript pane say "No JavaScript:
`noEmitOnError` is on and the code has errors." (FR-023).

### The examples (FR-027, FR-028)

`Examples` opens a panel under its button, groups in two columns, the current example marked.
Export: `desktop-14-examples-1440.png`.

```
+--------------------------------------------------------------------------+
| START                               | RUNNING                            |
| ▌Welcome                            |  Timers and promises               |
|  What the Playground is and how …   |  A run that stays going while …    |
| TYPES                               |  An interval                       |
|  Basic types                        |  …                                 |
|  Narrowing                          | THE CV AS DATA                     |
|  Generics                           |  Projects, newest first            |
|                                     |  …                                 |
|--------------------------------------------------------------------------|
| An example replaces your code. Undo brings it back.                      |
+--------------------------------------------------------------------------+
```

#### Examples

| Group | Title | Description | What it shows |
|-------|-------|-------------|---------------|
| Start | Welcome | What the Playground is and how to run code. | The starting example: a typed function, a log, and `cv` |
| Types | Basic types | Strings, numbers, arrays and objects, and the types TypeScript works out. | Inference; hover to see types |
| | Narrowing | How typeof, in and a check on a field narrow a union. | A union of shapes narrowed three ways |
| | Generics | Functions and types that work for any type and keep it exact. | A generic `first<T>` and a keyed lookup |
| Running | Timers and promises | A run that stays going while timers are pending. | `await` on a 2 s timer and a 5 s timer |
| | An interval | A timer that repeats until you press Stop. | A counter logged every second |
| | Catching errors | An error thrown and caught, and how the logs show it. | `try…catch` with `console.error` |
| | An endless loop | A loop that never ends, and the popup that offers to stop it. | `while (true)` |
| The CV as data | Projects, newest first | Sorts the CV's projects by date and logs them. | `cv.projects` with optional fields narrowed |
| | Skills at a glance | Counts the keywords in each group of the CV's skills. | `cv.skills`, `map` and padding |
| | Find a skill | Searches the CV's skills, narrowing its optional fields. | A search that returns the group or `undefined` |

The examples' code is written in the plan; its comments are site text in this voice and hold no
CV fact (FR-031). Every example but An interval and An endless loop runs to its end with no
uncaught error (FR-030).

### A run with timers pending (FR-032, FR-036)

Timers and promises, 2.4 s in. The Logs pane opened by itself, emptied at the start. Export:
`desktop-15-running-1440.png`.

```
| (▶ Run) (■ Stop) | ‹Examples ▾› ‹Options› ‹Share›      • Running · 1 timer left · 2.4 s  |
+-----------------------------------------------+-----------------------------------------+
|  …                                            | JavaScript Declarations Errors ⓪ { Logs ④ }|
|                                               | Waiting on 1 timer                      |
|                                               | | note | No errors in the code. Running.|
|                                               | | log  | Starting                         |
|                                               | | ⓘ info | Waiting 2 seconds              |
|                                               | | log  | Done waiting                     |
```

- The first entry is always the note on the code's errors: "No errors in the code. Running." or
  "The code has 2 errors. Running the JavaScript anyway." (FR-033).
- The run ends with a note: `Finished in 5.01 s`, `Stopped after 7.1 s`, or `Ended with 1 uncaught
  error after 0.4 s`, and the toolbar shows the same (FR-036).
- Levels: `log` and `debug` plain, `info` with a circle, `warn` amber with a triangle, `error` rose
  with a cross on a faint rose band, `alert` with a circle and the words "alert:", `note` in the
  site's own type. An error's entry ends with `line 12`, a button that moves the cursor there
  (FR-034, FR-035).
- When entries are dropped: a note at the top, "1,240 earlier entries were dropped. The logs keep
  the latest 1,000." An entry cut short ends with "… cut at 10,000 characters" (FR-044).
- `prompt` and `confirm` log a note: "`prompt` isn't available in the Playground, so it returned
  `null`." / "`confirm` … so it returned `false`." (FR-043).
- Amendment of 2026-10-30: code that calls `close()` logs a note, "The code closed its own worker
  with close(), so the run ended." and the run ends as finished (FR-045, FR-048). Export:
  `desktop-29-worker-closed-1440.png`.
- Amendment of 2026-10-30: when the code's JavaScript can't be read, nothing runs. The logs open
  with the note "Nothing ran: the code has 1 error, and its JavaScript can't be read." ("2 errors",
  and so on), then the parser's message as an `error` entry that ends with its `line 2` button, and
  the toolbar reads "Nothing ran" (FR-033, FR-035). Export: `desktop-28-cant-parse-1440.png`.

### A CV example, run (FR-027, FR-029)

Projects, newest first, chosen over the visitor's code, then run, with the type of `cv.projects`
on hover. Export: `desktop-16-cv-example-1440.png`.

```
| ⓘ The example Projects, newest first replaced your code.                 Undo   [x]     |
+-----------------------------------------------+-----------------------------------------+
|  4 │ const dated = (cv.░projects░ ?? []).flat…| { Logs [n] }                            |
|    │      +-----------------------------------+| | note | No errors in the code. Running.|
|    │      | (property) Resume.projects?:      || | log  | [year]  [project name]        |
|    │      |   ResumeProject[] | undefined     || | …                                    |
|    │      | [the CV schema's description]     || | note | Finished in 0.03 s            |
```

### The stuck popup, beside the CV window (FR-048 to FR-051)

An endless loop, 5 s without a pause. The Playground's window was moved right, so the CV window
shows beside it, uncovered and usable. Focus is on Stop. Export: `desktop-17-stuck-1440.png`.

```
+------------------------+--------------------------------------------------------------+
| CV window              | [x] [-] [^]               Playground            [Show specs] |
| (uncovered, usable)    |--------------------------------------------------------------|
|                        | (▶ Run) (■ Stop) | ‹…›      • Running · 5.0 s without a pause|
| [label]                | ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: |
| [NAME]                 | :::: +----------------------------------------------+ ::::::: |
|                        | :::: | This code may be stuck in a loop             | ::::::: |
| [summary …]            | :::: | It has run for 5 seconds without a pause.    | ::::::: |
|                        | :::: | Stop it, or keep waiting and the Playground  | ::::::: |
|                        | :::: | asks again in 5 seconds.                     | ::::::: |
|                        | :::: | ((Stop))  [Keep waiting]                     | ::::::: |
|                        | :::: +----------------------------------------------+ ::::::: |
+------------------------+--------------------------------------------------------------+
```

- The popup is an alert dialog named by its heading. Stop is rose and filled; Keep waiting is
  outlined. Escape keeps waiting (FR-051).
- When it comes due while another window is focused, it shows without bringing the Playground to
  the front or taking focus. While the window is minimized or shows its specs, it waits (FR-050).
- If the code pauses or ends while it shows, it closes, and screen readers hear "The code is
  running again." or the run's end (FR-049).

### Share: the link copied (FR-052)

Export: `desktop-18-shared-1440.png`.

```
| ✓ Link copied. It holds this code and the 1 option you changed. Opening it   Share with…  [x] |
|   never runs the code.                                                                  |
```

`Share with…` shows only where the device has its own sharing. When the clipboard refuses, the
message reads "Copy this link:" with the link in a field, selected (FR-052). Amendment of
2026-10-30: `Share with…` shows beside the field too, where the device has its own sharing. Export:
`desktop-30-link-field-1440.png`.

### Share: too long for a link (FR-055)

Export: `desktop-19-too-long-1440.png`.

```
| ⚠ This code is too long to share as a link. Its link would be 11,240 characters,   Copy the code  [x] |
|   and links stop at 8,000.                                                              |
```

### A broken shared link (FR-056)

Export: `desktop-20-broken-link-1440.png`. The editor holds the starting example.

```
| ⊗ The shared code couldn't be read. The link may have been cut off or changed, so the      [x] |
|   Playground opened with the starting example. Nothing ran.                             |
```

An option the link holds that this version doesn't know: "ⓘ The link set 1 option this version
doesn't know, `[name]`, so it was left out." The same message names options left out of kept code
from an older version (FR-019).

### A shared link opened (FR-053, FR-057)

The shell opens with the CV window as on first load and the Playground in front, focused, with the
cursor at the start. Export: `desktop-21-shared-opened-1440.png`.

```
| ⓘ This code came from a shared link and hasn't run. Press Run to run it.   Undo  [Run]  [x] |
|   It replaced the code you had here.                                                    |
```

With no code of the visitor's to replace, the second sentence and Undo are left out.

### Reset, to confirm (FR-080)

From the menu's `Reset…`. Focus is on Reset. Export: `desktop-22-reset-1440.png`.

```
| :::: +----------------------------------------------+ :::: |
| :::: | Reset the Playground?                        | :::: |
| :::: | The starting example and the default options | :::: |
| :::: | come back, and your code is no longer kept   | :::: |
| :::: | in this browser. Until you edit again, Undo  | :::: |
| :::: | brings your code back.                       | :::: |
| :::: | ((Reset))  [Cancel]                          | :::: |
| :::: +----------------------------------------------+ :::: |
```

### The Playground's spec view (FR-005)

007's spec view in the Playground's window, titled `Playground · Specs`. Going back shows the
Playground as it was. Export: `desktop-23-spec-view-1440.png`.

```
| [x] [-] [^]                    Playground · Specs                                       |
|-----------------------------------------------------------------------------------------|
| Back to Playground                                                       ⓘ What's this? |
| Specs for Playground                                                                    |
| Every requirement the Playground app implements, grouped by spec. …                     |
| [n] requirements · [n] specs · built from [commit] ↗                                    |
| 008 The TypeScript Playground  (APPROVED)                                               |
| FR-007  [requirement text]                                                              |
|         In the spec, line [n] ↗                                                         |
|         TESTS, [n]  [test name]  [file:line]                                            |
```

The requirement texts are 008's; the test names in the export are stand-ins until the tests
exist.

### A narrow window (FR-072)

The window resized to 600 px wide: the panes under the editor, the tools as glyphs. Export:
`desktop-24-narrow-1440.png`.

```
+------------------------------------------------------+
| [x] [-] [^]            Playground       [Show specs] |
|------------------------------------------------------|
| (▶ Run) [■ Stop] | ⧉ ⚙ ⇪           ✓ Finished in 0.02 s|
|------------------------------------------------------|
|  1 │ type Greeting = …                               |
|  … │                                                 |
|------------------------------------------------------|
| JavaScript Declarations Errors ⓪ { Logs ③ }          |
| | note | No errors in the code. Running.             |
| | log  | Hello, TypeScript! Hello, TypeScript!       |
| | log  | [label]                                     |
|------------------------------------------------------|
| Ln 3, Col 10  Spaces: 2  ✓ No errors  TypeScript […] |
+------------------------------------------------------+
```

At 200% zoom the window holds the same arrangement; the toolbar's run state moves under the tools
when it doesn't fit, and messages wrap (FR-071).

## Mobile shell

### The home screen (FR-001)

The Playground's icon after the CV app and the Terminal. Export: `phone-1-home-375.png`.

```
+-------------------------------+
|          [NAME]               |
|  [CV]  [❯_]  [{▶}]            |
|   CV  Terminal Playground     |
|                               |
|        ⓘ About this site      |
+-------------------------------+
```

### Best on a desktop, from the icon (FR-058, FR-059)

Exports: `phone-2-best-on-desktop-375.png`, `-320.png` (320 × 568) and `-landscape-812.png`
(812 × 375).

```
+-------------------------------+
| ‹ Home    Playground  [Specs] |
|-------------------------------|
|            [{▶}]              |
|  The Playground is best on a  |
|            desktop            |
|  It's a TypeScript editor     |
|  that checks and runs code in |
|  your browser. Writing code   |
|  needs a keyboard and room    |
|  for its panes, so it opens   |
|  on a desktop.                |
| (      ⇪ Share link        )  |
| [      ⧉ Copy link         ]  |
|  The link opens the           |
|  Playground on a desktop.     |
+-------------------------------+
```

- Share link opens the device's own sharing; where there is none, it copies the link and the
  note reads "Link copied." Copy link always copies, and the note reads "Link copied." Both are
  announced (FR-058).
- The link opens the Playground with the starting example, or with the visitor's code when the
  shell switched from desktop (FR-059).
- Amendment of 2026-10-30: when the link can't be copied, or the device's sharing fails for a reason
  other than the visitor's cancel, the note gives way to "Copy this link:" and the link in a field,
  selected, on the icon's screen and a shared link's alike (FR-052). Exports:
  `phone-4-link-field-375.png` and `-320.png`.

```
| (      ⇪ Share link        )  |
| [      ⧉ Copy link         ]  |
|  Copy this link:              |
|  [ https://…/#playground    ] |
```

### Best on a desktop, from a shared link (FR-060)

Exports: `phone-3-shared-link-375.png` and `-320.png`.

```
|  This link holds TypeScript   |
|            code               |
|  Someone shared code from the |
|  Playground, a TypeScript     |
|  editor that runs in the      |
|  browser. Open the link on a  |
|  desktop to read, check and   |
|  run it. Nothing runs here.   |
| (      ⇪ Share link        )  |
| [      ⧉ Copy link         ]  |
|  Sharing passes on the same   |
|  link, with its code.         |
```

The shared code is never shown, nothing runs, and TypeScript isn't downloaded.

## Keys

The editor's keys are VS Code's defaults for the visitor's system (FR-083). These differ, or are
the Playground's own:

| Command | Mac | Windows and Linux | Why |
|---------|-----|-------------------|-----|
| Run | `Cmd+Enter` | `Ctrl+Enter` | Not a VS Code command; the official Playground's key |
| Command palette | `F1` | `F1` | VS Code's second key, `Shift+Cmd+P` / `Ctrl+Shift+P`, opens a private window in Firefox, which a page can't take, so only F1 is listed |
| Suggestions | `Ctrl+Space`, also `Option+Escape` | `Ctrl+Space` | macOS can take `Ctrl+Space` to switch input sources; VS Code's own second key is kept |
| Format Document | `Shift+Option+F` | `Shift+Alt+F` | VS Code's key, freed by the amendment of 005 (FR-086) |
| The shell's shortcuts | `Option+Shift+M`, `D`, `N`, `W`, `P`, `S` | `Alt+Shift+…` | The shell's, from inside the editor too. No VS Code default the editor offers uses them |

The plan checks every key the editor offers against the current main browsers and screen readers;
any other key found taken gets a replacement here and in the list of keys before it ships (FR-084).

## Accessibility

- **Focus**: 005's periwinkle outline everywhere, 2 px. The editor, when focused, has the same
  outline inside its edge, as the Terminal's command line does; the mint cursor shows where typing
  goes. A popup's first control takes focus when it opens from inside the window (FR-051, FR-062).
- **Leaving the editor**: the editor's description, read when it takes focus, says "Press
  Ctrl+Shift+M to make Tab move focus out of the editor" (`Ctrl+M` on Windows and Linux). With it
  on, the status bar shows a `Tab moves focus` chip (FR-062).
- **Order**: the toolbar, any message, the editor, the pane tabs, the open pane, the status bar.
  The pane tabs are a tab list; arrows move between them (FR-064).
- **Announcements**, without moving focus: the download's start, each 25%, end and failure; the
  error count after typing pauses ("1 error"); new log entries at most once a second, summed up
  ("3 new log entries"); a run's start, its timers when the count changes, and its end; every
  message under the toolbar (FR-064 to FR-066).
- **Forced colors**: the syntax colors drop to `CanvasText`; error and warning marks stay as wavy
  underlines in `LinkText` and `CanvasText`, and the cursor line's message keeps its cross. The
  selected tab, suggestion, fix and example keep their 2 px border. Log levels are told apart by
  their words and glyphs. The scrim drops out; popups keep a 1 px border (FR-070).
- **Reduced motion**: the progress bar fills in steps with no movement inside it; the running dot
  doesn't pulse; popups and panels appear without fading or sliding; switching panes is
  immediate (FR-069). No motion is drawn in the mockup.
- **Contrast**: see [review.md](review.md#design-decisions).
- **Targets**: every control is at least 24 × 24 px; on the phone, the two buttons are 44 px tall
  (FR-067).

## Site text

All of it is in the states above. The longer pieces:

- **Downloading**: "Downloading TypeScript" · "[n] MB of [n] MB" · "The Playground downloads
  TypeScript the first time it opens. After that it opens at once, offline too."
- **Offline**: "TypeScript needs one download" · "The Playground runs TypeScript in your browser,
  and downloads it once, with a connection: [n] MB. You're offline, so the download starts by
  itself when you're back online." · "Retry"
- **Can't keep TypeScript** (FR-014), as a message: "This browser can't keep TypeScript for
  offline use, so the Playground downloads it again on each visit."
- **Can't keep code** (FR-019), as a message: "This browser can't keep your code, so it stays only
  while this page is open."
- **Stuck popup**: "This code may be stuck in a loop" · "It has run for 5 seconds without a pause.
  Stop it, or keep waiting and the Playground asks again in 5 seconds." · "Stop" · "Keep waiting"
- **Packages** (FR-042), as the error and the log: "Packages can't be imported here. The
  Playground runs one file of code, with no packages."
- **Editor's name and description** (FR-063): "Code editor" · "TypeScript code. Press F1 for
  commands, Option+F1 for accessibility help, and Ctrl+Shift+M to make Tab move focus."
