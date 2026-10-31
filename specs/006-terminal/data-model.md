# Data Model: The Terminal

Phase 1 of [plan.md](./plan.md). Types are TypeScript, as the code will declare them. The
Terminal's engine (`packages/web/src/apps/terminal/engine/`) holds every type here except the
session store and the shell's additions. The spec's Key Entities map to them as noted.

**Amendment, 2026-10-29**: the sections from [Shell state](#shell-state-fr-067) on are the
amendment's (research R25 to R37). Where an earlier section changes, a note under its heading
says how. `Parsed`, `Stage`, `Call` and `Piped` are gone with the Terminal's own parser.

**Amendment, 2026-10-30**: [Vim view](#vim-view-key-entities-vim-view-pipe) is amended for
editing, and [Completion](#completion-fr-076-to-fr-078-research-r43-r44) and
[Write request and outcome](#write-request-and-outcome-fr-080-research-r49) are added (research R43
to R50).

## Command (Key Entities: Command, Alias)

> **Amended 2026-10-29.** `run` now takes the shell's arguments and context and returns a
> `SiteRun` (below). `readsInput` is gone: every command can be piped into, and those that read
> no input ignore it (FR-057). The table is the site's commands only; the standard commands are
> `STANDARD_COMMANDS` (research R32).

One row of `COMMANDS`, the only list of commands (research R7). `help`, the parser and the
suggestions all read it.

```ts
type CommandName =
  | 'help' | 'about' | 'work' | 'projects' | 'education' | 'skills' | 'languages' | 'interests'
  | 'contact' | 'cv' | 'site' | 'specs' | 'ls' | 'cd' | 'cat' | 'jq' | 'vim' | 'pwd' | 'open'
  | 'history' | 'clear' | 'exit';

type Command = {
  name: CommandName;
  aliases: readonly string[];          // 'whoami' (about), 'experience' (work), '?' (help)
  args: 'none' | 'optional-path' | 'path' | 'optional-command' | 'name' | 'path-or-input';
  readsInput: boolean;                 // true for jq and vim only (FR-057)
  run: (call: Call, context: RunContext) => Result;
};
```

The usage, the one-line description and the command's own help are site text, keyed by `name`
(`siteText.terminal.commands[name]`). They aren't in the row, so `site-text.ts` stays the one place
for words (FR-030).

**Validation**: every name and alias is lower case, unique across the table, and listed by `help`.
A test checks that the table and `help`'s output name the same words (FR-008).

## Command line and call

> **Removed 2026-10-29.** The shell parses lines (research R25, R27).

```ts
type Parsed =
  | { kind: 'empty' }                                      // FR-007
  | { kind: 'pipe-usage' }                                 // a `|` with nothing on one side (FR-057)
  | { kind: 'stages'; stages: readonly Stage[] };

type Stage = { word: string; command: Command | null; args: readonly string[] };
// `word` as typed, for replies; `command` null when unknown (FR-016)

type Call = { args: readonly string[]; input: Piped | null };
type Piped = { text: string; from: string };              // the text and what it came from, for jq's reply
```

**Rules**: line breaks become spaces before parsing (FR-018). Words are split on runs of spaces
and tabs, and the command word is matched in lower case (FR-007). Arguments keep the case they were
typed in. `input` is set only for a stage after a `|`. A stage whose command doesn't read input
and gets some returns the "doesn't read piped input" reply (FR-057).

## Result and output block (Key Entities: Output)

> **Amended 2026-10-29.** `Result` is replaced by `RunResult` and `Effect` (below). `Block` and
> `Node` stay, and gain `stream` text nodes for what the shell prints as text.

```ts
type Result =
  | { kind: 'output'; block: Block; announce: Announcement; text?: string } // `text`: what a pipe passes on
  | { kind: 'clear' }                                      // clear (FR-019)
  | { kind: 'open-vim'; file: VimSource }                  // vim, and cv (FR-058, FR-059)
  | { kind: 'os'; action: { open: 'cv' | 'about' } | { exit: true } } // open, exit (FR-014)
  | { kind: 'cd'; folder: Path; block: Block; announce: Announcement };

type Block = readonly Node[];

type Node =
  | { kind: 'text'; text: string; tone?: Tone }            // CV or site text, shown as is
  | { kind: 'line'; children: Block }                      // one paragraph
  | { kind: 'heading'; depth: 1 | 2; children: Block }     // relative to the command's heading (FR-029)
  | { kind: 'list'; items: readonly Block[] }
  | { kind: 'link'; href: string; children: Block; external: boolean }
  | { kind: 'time'; datetime: string; text: string; spoken?: string }  // 004 FR-009 to FR-011
  | { kind: 'command'; line: string; label?: string; style: 'chip' | 'inline' } // a command control (FR-015)
  | { kind: 'columns'; cells: readonly Node[] }            // ls's names (FR-043)
  | { kind: 'rows'; rows: readonly (readonly Block[])[] }  // help's and specs' table rows
  | { kind: 'json'; rows: readonly JsonRow[] };            // jq's output (FR-056)

type Tone = 'primary' | 'secondary' | 'dim' | 'heading' | 'error' | 'approved' | 'draft' | 'folder';

type Announcement = { full: string } | { command: string; count: number; unit: 'entries' | 'commands' | 'files' | 'lines' | 'specs' };
```

**Rules**:

- A block never holds markup or HTML. Every string reaches the page as a React text child
  (research R3, FR-018).
- `command.line` is the exact command line the control runs, such as `ls ~/work` or
  `cat ~/work/acme`. Activating it runs that line as if typed (FR-015, FR-050).
- `heading.depth` 1 is a section and 2 an entry. A command that shows one section uses depth 1 for
  its entries (FR-029). The renderer adds the command's own level.
- `tone` only sets a color token. The words carry the meaning, so `Approved` is written, not
  colored (FR-031, design).
- `Announcement` is `full` when the block is at most 5 rows at the desktop column count (research
  R13), else the counted summary (FR-028). `help` counts its commands, not their aliases
  (`help: 22 commands`), and `ls` counts its files and folders together as `entries`
  (`ls: 11 entries`).

## CV fields per section

```ts
const CV_FIELDS: Record<Section, readonly FieldRule[]>;
type Section = 'basics' | 'contact' | 'work' | 'projects' | 'education' | 'skills' | 'languages' | 'interests';
type FieldRule = { path: string; as: 'text' | 'date-range' | 'location' | 'email' | 'url' | 'profiles' | 'list' | 'keywords' };
```

Each section lists the fields `/cv` shows for it, in `/cv`'s order (004 Key Entities, FR-009). An
absent field is left out with no label (004 FR-004). `about` shows `basics` (name, label,
location, summary). `contact` shows the email, `basics.url` and every profile. A test compares
the rules with 004's `expectedFields` on the `every-field` fixture, so the two can't drift
(research R4).

## File system (Key Entities: File system, Folder, File, Path, Working folder)

> **Amended 2026-10-29.** This tree is the protected part of the shell's file system, written
> into `/home/guest` (research R28). `Path` is now a string path from the root, shown with `~`
> for `/home/guest`. See [Terminal file system](#terminal-file-system-fr-045-fr-049-fr-073).

```ts
type FsNode = Folder | File;
type Folder = { kind: 'folder'; name: string; children: readonly FsNode[] };
type File = { kind: 'file'; name: string; show: () => Block; text?: string };   // `text`: cv.json's, for pipes
type Path = readonly string[];                       // [] is the home folder, ['work'] its work folder
```

Built by `buildFileSystem(resume, specs)` once per visit (research R9).

| Name | Kind | Holds | Left out when |
|------|------|-------|---------------|
| `cv.json` | file | `JSON.stringify(resume, null, 2)` (FR-055) | never |
| `about` | file | what `about` shows | `basics` holds none of its shown fields |
| `contact` | file | what `contact` shows | no email, URL or profile |
| `work/` | folder | one file per work entry, in order | `work` empty or absent (FR-043) |
| `projects/` | folder | one file per project | likewise |
| `skills` | file | what `skills` shows | likewise |
| `education/` | folder | one file per education entry | likewise |
| `languages` | file | what `languages` shows | likewise |
| `interests` | file | what `interests` shows | likewise |
| `readme` | file | what `site` shows | never |
| `specs/` | folder | one file per spec, in numbered order | never |

**Names** (FR-044): `fileName(value)` is NFD, combining marks removed, lower case, each run of
characters other than `a`–`z` and `0`–`9` a single `-`, with hyphens trimmed. Clashes in a
folder get `-<start year>`, then `-2`, `-3` in the CV document's order. Deterministic: the same
CV always gives the same names.

**Paths** (FR-045, FR-046): `resolve(path: string, from: Path): Path | null`, with `~`, `/`,
`.`, `..` and names matched without regard to capitals. `..` at `[]` stays `[]`. `formatPath([])`
is `~`, `formatPath(['work'])` is `~/work`.

## Spec list (Key Entities: Spec list)

```ts
type SpecEntry = {
  number: string;          // '006', from the folder name
  folder: string;          // '006-terminal'
  name: string;            // 'The Terminal', from '# Feature Specification: …'
  status: 'Approved' | 'Draft' | 'Invalid';   // as 001 reads it
  requirements: number;    // active FR-### count, as 001 counts it
};
type SpecList = readonly SpecEntry[];   // numbered order
```

Produced at build time by `readSpecList(root)` (research R10), and served to the bundle as
`virtual:cv-spec-list`. A spec folder whose `spec.md` is missing or unreadable is left out, as
001's check reports it separately.

## JSON rows (FR-056)

> **Amended 2026-10-30.** The vim view colors its lines with `lexLine(text): JsonToken[]`, one
> line at a time, so edited text is colored as typed and never re-printed (research R47).
> `printJson` stays for `jq`'s output.

```ts
type JsonToken = { kind: 'key' | 'string' | 'number' | 'literal' | 'punctuation' | 'space'; text: string };
type JsonRow = { indent: number; tokens: readonly JsonToken[] };
type JsonFold = { key: string; start: number; end: number };   // 0-based lines, top-level only (FR-061)

function printJson(text: string): { rows: JsonRow[]; folds: JsonFold[] } | { error: 'not-json' };
```

The printer lexes the text, never `JSON.parse`, so keys keep their order and numbers their
spelling (research R11). `indent` is 2 per level.

## Vim view (Key Entities: Vim view, Pipe)

> **Amended 2026-10-30** (research R47 to R50). The view edits text: the buffer is lines of text,
> with a mode, a register, undo and a file to write to. The read-only message is gone, and the
> messages are vim's.

```ts
type VimFile = {
  name: string;             // as typed, or '[No Name]' for piped text (design decision 2)
  path: string | null;      // absolute; null for piped text until `:w <path>` names it
  readonly: boolean;        // a protected file (FR-081)
  new: boolean;             // the path didn't exist when opened, until first written (FR-080)
};

type VimSource = { file: VimFile; pipe: string | null; text: string; type: 'json' | 'text' };
// `pipe`: the command line for the status line (FR-059). `type`: whether `text` parsed as JSON
// when opened; it stays for the view's life.

type VimState = {
  source: VimSource;
  lines: readonly string[];             // the buffer, never re-printed
  folds: readonly JsonFold[];           // from `lines` after each change (research R47)
  closed: ReadonlySet<string>;          // closed folds, by key
  mode: 'normal' | 'insert';
  cursor: { line: number; column: number };
  numbers: boolean;                     // :set nu / :set nonu
  search: { text: string; matches: readonly Match[]; current: number } | null;
  entry: { kind: '/' | ':'; text: string } | null;   // a / or : being typed
  help: boolean;                        // the :help split (FR-064)
  message: Message;                     // the message line
  pending: Pending | null;              // a count, an operator, `g`, `z`, `Z` or `r` waiting for its key
  register: { text: string; lines: boolean } | null;  // the unnamed register
  undo: readonly Step[];                // at most 1,000 (vim's undolevels)
  redo: readonly Step[];
  modified: boolean;                    // `[+]`: lines differ from what was opened or last written
  warned: boolean;                      // W10 shown for this buffer (FR-081)
  last: readonly VimInput[];            // the last change's inputs, for `.`
  saved: readonly string[];             // the lines as last written, for `modified`
  entered: Step | null;                 // the buffer on entering insert mode: Escape makes one undo step
  typing: readonly VimInput[];          // what insert mode has been given, for `.`
  writing: { name: string; own: boolean; then: 'stay' | 'quit' } | null;  // a write on its way, for its `{ wrote }` answer
};
type Pending = { count: number | null; operator: 'd' | 'c' | 'y' | null; prefix: 'g' | 'z' | 'Z' | 'r' | null; before: number | null };  // `before`: the count typed before the operator, as `2d3w` is 6 words
type Step = { lines: readonly string[]; cursor: { line: number; column: number } };
type Match = { line: number; start: number; end: number };
type Tone = 'info' | 'warning' | 'error';     // haze, color.vim-warning, color.terminal-error
type Message =
  | { kind: 'opened' }                         // the opening line (design site text)
  | { kind: 'written'; name: string; created: boolean; lines: number; bytes: number }
  | { kind: 'vim'; code: 'W10' | 'E13' | 'E32' | 'E37' | 'E45' | 'E212' | 'E492' | 'E514'; arg?: string }
  | { kind: 'oldest' } | { kind: 'newest' }    // u and :redo at the ends of undo
  | { kind: 'match'; index: number; count: number } | { kind: 'not-found'; text: string }
  | { kind: 'none' };

type VimInput =
  | { key: string; ctrl?: boolean; page?: number }   // ctrl only for Ctrl+R on macOS (FR-079)
  | { text: string } | { delete: 'backward' | 'forward' } | { lineBreak: true }   // insert mode (research R48)
  | { submit: string } | { cancel: true } | { fold: number } | { point: { line: number; column: number } }
  | { wrote: WriteOutcome };                  // the worker's answer to a write (research R49)

type VimOutput = VimState | 'quit' | { write: { path: string; text: string; force: boolean }; then: 'stay' | 'quit'; state: VimState };  // the session adds the WriteRequest's `id` and `cwd`
function vimReducer(state: VimState, input: VimInput): VimOutput;
```

**Transitions** (FR-060 to FR-064, FR-079 to FR-081):

| Input | Mode | Result |
|-------|------|--------|
| `h` `j` `k` `l`, arrows, `w` `b`, `0` `$`, `gg` `G`, `{` `}`, Page Up and Down, each after a count | normal | As vim, as before, a count repeating the move. Closed folds count as one line |
| `/` text Enter, `n` `N`, `za` `zo` `zc` `zR` `zM`, a fold activated, `:` number, `:set nu`, `:set nonu`, `:help` | normal | As before (R12) |
| `i` `a` `I` `A` `o` `O` | normal | Insert mode at vim's place; `o` and `O` open a line. `-- INSERT --` |
| text, Backspace, Delete, Enter, Tab | insert | Inserts, deletes, splits the line, inserts `\t` (research R48) |
| Escape | insert | Normal mode; the cursor back one character; the insert is one undo step |
| `x` `dd` `dw` `D` `cw` `cc` `C` `r{c}` `J` `yy` `yw` `p` `P`, with a count | normal | As vim. `c…` ends in insert mode. Line commands take a closed fold whole; other changes open it (research R47) |
| `.` | normal | Replays `last`, with a new count if one was typed |
| `u`, `:redo`, Ctrl+R (macOS) | normal | One step back or forward; `oldest` or `newest` at the ends |
| any change to a `readonly` buffer, the first time | either | The change, and `W10` (FR-081) |
| `:w` `:w!` `:w {path}` `:w! {path}` `:wq` `:x` `ZZ` | normal | research R49's table: a `write` output, or `E45`, `E32`, `E13` at once |
| `{ wrote }` | normal | `written` (and `quit` when it was `:wq`, `:x` or `ZZ`), or `E212` or `E514` |
| `:q` | normal | Closes the help split when open; else `quit`, or `E37` when `modified` |
| `:q!` | normal | `quit` |
| another `:` command | normal | `E492` naming it |
| Escape | normal | Cancels `entry` or `pending` |
| `{ point }` | either | The cursor to that line and column (FR-079, FR-066) |
| any other key | either | Nothing |

**Invariants**: the cursor is always on a shown line, never inside a closed fold, and in insert mode
may sit one past a line's end. `undo` holds at most 1,000 steps. `modified` is false right after
opening and after a write of the buffer to its own file. `search.current` indexes `matches` when
they aren't empty.

## Completion (FR-076 to FR-078, research R43, R44)

```ts
type CompleteRequest = { id: number; line: string; cursor: number; state: ShellState };
type Completion = {
  id: number;
  start: number; end: number; insert: string;   // replace line[start, end) with insert; empty when nothing is added
  matches: readonly CompletionMatch[];           // sorted in byte order, merged
};
type CompletionMatch = { name: string; folder: boolean };   // as listed: the last part of a path, a folder with its `/`

type TabState = { line: string; cursor: number; asked: number | null } | null;
// The command line's: the line and cursor after the last Tab, so the next Tab counts as the
// second in a row; `asked` while `Display all {n} possibilities? (y or n)` waits for its key.
```

**Rules**: `insert` is readline's: the common part of the matches past the word typed, quoted as
bash quotes it; with one match, also its closing quote and a space, or `/` for a folder. Two or
more matches with nothing to add, on the second Tab in a row, give the list entry; 100 or more
first give the question. A `Completion` whose `id` isn't the last request's, or whose line and
cursor no longer match, is dropped.

`columns(names: readonly CompletionMatch[], width: number): string[][]` (`engine/columns.ts`, pure):
readline's layout, as many columns as fit `width` characters, each the longest name plus 2,
filled down.

## Write request and outcome (FR-080, research R49)

```ts
type WriteRequest = { id: number; path: string; text: string; force: boolean; cwd: string };
// `path` as typed or the buffer's; the worker resolves it from `cwd`. `text` ends with a line break.
type WriteOutcome =
  | { id: number; ok: true; path: string; created: boolean; lines: number; bytes: number; files: VisitorFiles }
  | { id: number; ok: false; error: 'exists' | 'cant-open' | 'full'; path: string };
// exists → E13 (not forced, the file is there); cant-open → E212 (protected, a folder, or a
// missing folder); full → E514 (past QUOTA, FR-073).
```

## Terminal session (Key Entities: Terminal, Command history, Working folder)

> **Amended 2026-10-29.** The session gains the shell's status, its waiting lines, the state and
> the visitor's files. See [Session additions](#session-additions-fr-021-fr-069-fr-070).

```ts
type Entry = {
  id: number;
  line: string;                // as typed, for the heading and history (FR-006)
  folder: Path;                // where it ran, for its prompt
  time: string;                // 'hh:mm' when entered (research R17)
  block: Block | null;         // null for an empty line
};

type Session = {
  entries: readonly Entry[];   // the output since opening or the last clear (FR-019)
  history: readonly string[];  // commands run since opening, oldest first (FR-020)
  folder: Path;                // the working folder (FR-046)
  draft: string;               // what is typed (FR-021)
  stepping: { index: number; saved: string } | null;   // Up and Down (FR-020)
  scrollTop: number;           // the output's scroll position (FR-021)
  shellScroll: Partial<Record<'desktop' | 'mobile', number>>;  // each shell's, as a position fits its width only
  vim: VimState | null;        // the open vim view (FR-058)
  announcement: { text: string; id: number } | null;  // FR-028
};
```

`createSession()` returns the store. `run(line)`, `step(direction)`, `setDraft`, `clear()`,
`vim(input)`, `saveScroll` and `reset()` are its only writers.

**Transitions**:

| Event | Session after |
|-------|---------------|
| First open in the visit | `entries` empty, the starter chips shown above them (not an entry; the greeting until 2026-10-29), `folder` `[]` |
| `run(line)` | An entry is appended (`clear` empties `entries` instead), `line` goes on `history` unless empty, `stepping` reset, `draft` empty |
| `cd` | `folder` changes |
| `cv`, `vim` | `vim` set. The entry is appended when the view closes, so its output sits after its prompt (FR-064) |
| `:q` | `vim` null, the opening entry and a new prompt shown |
| Minimize, mobile Home, shell switch | Unchanged (FR-021) |
| Close (`onClose`) | `reset()`: empty, as on first open (FR-021) |
| End of the visit | Gone. Nothing is stored (FR-022) |

## Shell additions (005)

```ts
// @cv/os-core
type ViewId = 'cv' | 'terminal' | 'about';
type Metrics = Metrics005 & { terminalWidth: number; terminalHeight: number; terminalMargin: number; terminalOffset: number };

// @cv/web apps/index.ts
type App = App005 & {
  focusOnOpen?: string;                         // selector inside the content (FR-004)
  WindowTitle?: () => ReactNode;                // title bar text (design: "Terminal — ~/work")
  menuItems?: readonly { key: string; label: string; run: () => void }[];  // FR-003
  onClose?: () => void;                         // research R5
};
type AppProps = { resume: Resume; siteData: SiteData; os: AppOs };
type AppOs = { shell: ShellName; open: (view: 'cv' | 'about') => void; exit: () => void };
```

[contracts/shell.md](./contracts/shell.md) gives each one's behavior.

## Site check results

005's report gains part `terminal`, after `cv-app`, and these problem types:

| Type | Part | Meaning |
|------|------|---------|
| `missing-field`, `out-of-order` | `terminal` | As `cv-app`, naming the command and shell |
| `json-mismatch` | `terminal` | `cat cv.json`, `jq` or the vim view differs from the CV document's JSON, at a line |
| `missing-file`, `extra-file`, `file-mismatch` | `terminal` | The file system lacks a file for an entry, has one for none, or `cat` differs from the named command |
| `offline-mismatch` | `offline` | A command's output offline differs from online |
| `line-mismatch`, `not-stopped`, `unresponsive` | `terminal` | (2026-10-29) One of the shell's lines prints other than expected, a line that never ends isn't stopped, or the window doesn't answer a click while it runs, naming the line |
| `cursor`, `outline`, `line-key`, `select-all`, `cancel` | `keyboard` | (2026-10-29) The cursor isn't filled with focus or hollow without, the line has a box, a Linux key moves or deletes wrongly, select all takes text outside the Terminal, or Ctrl+C on a typed line doesn't end it, naming the step |
| `no-blink` | `modes` | (2026-10-29) The focused cursor doesn't blink after a key press; one still blinking after the idle time is `blinking` |

Variants are 005's `<shell>/<state>/<width>px`, with the Terminal's states and a command where one
applies: `desktop/terminal/work/1440px` ([contracts/cli.md](./contracts/cli.md)). The shell's lines
are `<shell>/terminal/shell/<width>px`, and the blink's stop is `<shell>/cursor-blink/<width>px`.

## Shell state (FR-067)

What the shell adapter carries from one line to the next, since just-bash resets it after each
run (research R27).

```ts
type ShellState = {
  cwd: string;                                  // '/home/guest' on opening (FR-046)
  variables: Readonly<Record<string, string>>;  // those differing from a fresh shell's, without its own (PWD, LINENO…)
  exported: readonly string[];                  // which of them are exported
  functions: Readonly<Record<string, string>>;  // name → its definition, serialized (research R27)
  options: readonly ShellOption[];              // set -o options that are on
  status: number;                               // $? after the last line
  unset: readonly string[];                     // variables of a fresh shell the visitor unset
  declarations: readonly string[];              // declare -p's line for arrays and attributes (research R27)
  positional: readonly string[];                // $1, $2…
  shopts: readonly string[];                    // shopt settings that are on
};
type ShellOption = 'errexit' | 'nounset' | 'pipefail' | 'noglob' | 'noclobber' | 'xtrace' | 'allexport';
```

**Rules**: a variable name matches `[A-Za-z_][A-Za-z0-9_]*`. A function is kept only while
`declare -F` lists it after a line. `HOME`, `USER`, `LOGNAME` and `SHELL` start as the adapter sets
them, and are carried once changed. The initial state is `{ cwd: '/home/guest', variables: {},
exported: [], functions: {}, options: [], status: 0, unset: [], declarations: [], positional: [],
shopts: [] }`.

## Terminal file system (FR-045, FR-049, FR-073)

```ts
type Owner = 'root' | 'guest';
type FsEntryInfo = { path: string; kind: 'file' | 'folder'; owner: Owner; protected: boolean };

type VisitorFiles = {                       // the snapshot the interface keeps (research R26)
  folders: readonly string[];               // absolute paths, parents first
  files: Readonly<Record<string, string>>;  // absolute path → text
  bytes: number;                            // their total, ≤ QUOTA
};
const QUOTA = 1_048_576;                    // 1 MB (FR-073)
```

| Path | Kind | Owner | Protected | Holds |
|------|------|-------|-----------|-------|
| `/` | folder | `root` | yes | `bin`, `dev`, `home`, `tmp`, `usr` (FR-045) |
| `/bin`, `/usr/bin` | folder | `root` | yes | one stub per registered command (research R28) |
| `/dev` | folder | `root` | yes | `null` (writable, discards), `stdin`, `stdout`, `stderr` |
| `/home` | folder | `root` | yes | `guest` |
| `/home/guest` | folder | `guest` | no | the built entries of the tree above, then the visitor's |
| `/home/guest/<built entry>` and everything under it | file or folder | `root` | yes | the tree of [File system](#file-system-key-entities-file-system-folder-file-path-working-folder), each file the text of its block |
| `/tmp` | folder | `guest` | no | the visitor's files, empty on opening |
| anything the visitor creates | file or folder | `guest` | no | counted in `bytes` |

**Rules**:

- A writing operation on a protected path, or one that would create, move or copy something into a
  protected folder, rejects with `Permission denied` and changes nothing (FR-049).
- Protected files report mode `0444`, protected folders `0555`, the visitor's files `0644` and
  folders `0755`.
- A path part that doesn't exist as typed matches a protected name in its folder without regard to
  capitals (FR-045). The visitor's names are case-sensitive.
- A write that would take `bytes` past `QUOTA` rejects with `No space left on device` and changes
  nothing. A write into a folder that doesn't exist rejects with `No such file or directory`.
- `readdir('/home/guest')` lists the built entries in the design's order, then the visitor's in
  name order (FR-043, FR-073).
- Opening the Terminal, and closing it, give the table with no visitor file (FR-021). A restarted
  worker restores `VisitorFiles` (research R26).

## Run request and result (contracts/shell-worker.md)

```ts
type RunRequest = {
  id: number;
  line: string;
  state: ShellState;
  history: readonly string[];
  shell?: 'desktop' | 'mobile';   // added 2026-10-29: the words that differ by shell (help's lead)
};

type RunResult = {
  id: number;
  stdout: string;
  stderr: string;
  status: number;
  recorded: readonly Recorded[];            // research R29, in the order they were printed
  effects: readonly Effect[];               // applied by the interface after the line
  end: 'done' | 'exited' | 'limit' | 'syntax';
  limit?: 'time' | 'commands' | 'output' | 'cancelled';   // when end is 'limit' (FR-069); cancelled: Ctrl+C (FR-075)
  state: ShellState;                        // unchanged when end is 'syntax' or 'limit'
  files?: VisitorFiles;                     // only when the visitor's files changed
};

type Recorded = { text: string; block: Block };   // what a site command printed, and its block

type Effect =
  | { kind: 'clear' }                                       // clear (FR-019)
  | { kind: 'vim'; file: VimFile; pipe: string | null; text: string; type: 'json' | 'text' }  // vim, cv (FR-058, FR-059); file amended 2026-10-30. `type`: the worker decides, so the page has no JSON parser
  | { kind: 'open'; view: 'cv' | 'about' }                 // open (FR-014)
  | { kind: 'clear-history' };                             // history -c (FR-020), added 2026-10-29
```

Added while building (2026-10-29): `Effect` is declared in `engine/block.ts` and re-exported by
`shell/protocol.ts`, so the engine never imports `shell/`. A `line` node may carry
`req: 'stopped'`, the line a stopped run ends with (FR-069), and a `text` node
`stream: 'stdout' | 'stderr'` (research R30).

**Rules**: `recorded[i].text` is exactly what the command wrote to its stdout. A `Recorded` is made
only by the site's own commands and wrappers, never from typed or piped text (FR-018). `exited`
means the last checkpoint didn't run and no limit stopped the line: the interface does what `exit` does
(FR-008).

## Site command run

```ts
type SiteRun = { text: string; block: Block | null; stderr?: string; status: number; effect?: Effect };
// text = blockText(block) when block isn't null (research R29)
```

`blockText(block)` is the block's visible text, in reading order: one line per `line`, heading and
list item, list items prefixed `- `, links by their text, `time` nodes by their text, controls by
their visible label, `json` rows as their tokens' text. A test renders each block and checks its
`textContent`, line by line, equals `blockText` (FR-047, FR-057).

## Shown run (research R30)

`mapOutput(result: ShownResult, typed: string, context: MapContext): { block: Block; announce: Announcement }`,
with `MapContext` the site text, the desktop window's columns and the working folder, in
`engine/output-map.ts`, pure.

| Part of the result | Becomes |
|--------------------|---------|
| A recorded text found whole in stdout, in order | Its block |
| Other stdout | `{ kind: 'text', text, stream: 'stdout' }` lines, as printed |
| stderr | `{ kind: 'text', text, stream: 'stderr', tone: 'error' }` lines, after stdout (G3) |
| `bash: {word}: command not found` | FR-016's reply, starting `{word}: command not found.`, with up to 3 suggestions over FR-008's names |
| `bash: cd: {path}: Not a directory`, `cat: {path}: Is a directory` | That line, then FR-048's control |
| `end: 'limit'` | FR-069's site text, in place of the limit's own message |
| `end: 'syntax'` | The parser's message, without `bash: ` and its line number |

`Node` gains `stream?: 'stdout' | 'stderr'` on `text` nodes. Announcements count recorded blocks as
before, and text in rows (`{command}: {n} lines`) (FR-028).

## Session additions (FR-021, FR-069, FR-070)

```ts
type ShellStatus = 'idle' | 'loading' | 'ready' | 'running' | 'failed';

type Session = Session006 & {
  shell: ShellStatus;
  waiting: readonly Entry[];        // lines entered before the shell was ready, in order (FR-070)
  running: Entry | null;            // the line the worker is running
  state: ShellState;                // research R27
  files: VisitorFiles;              // research R26
  cwd: string;                      // replaces `folder`, for the prompt (FR-046)
};
```

| Event | Session after |
|-------|---------------|
| First open in the visit | `shell` `loading`; the worker starts (research R34) |
| A line entered while `loading` | Appended to `waiting`, shown with its prompt; the loading line stays under the starter chips |
| Worker `ready` | `shell` `ready`; the loading line goes; `waiting` runs in order |
| Worker fails, or no `ready` within 10 s | `shell` `failed`; the loading line becomes the failure line with `try again`; `waiting` is kept |
| A line run | `running` set, `shell` `running`; on its result, the entry's block from `mapOutput`, `state`, `cwd` and `files` updated, effects applied |
| `end: 'exited'` | As `exit` (FR-008): close on desktop, home on mobile |
| Ctrl+C with a line running, or the worker 1 s past the deadline | Worker terminated and restarted from `state` and `files`; the entry shows `^C` or the "stopped" text (FR-069, FR-075) |
| Ctrl+C with no line running | An entry with the typed text and `^C`, not added to `history`; `draft` empty |
| Close (`onClose`) | As before, and `state` and `files` back to their initial values; the worker gets `reset` (FR-021) |
| A vim write answered (added 2026-10-30) | `files` updated from the outcome, so a restarted worker has the written file (research R49) |
| A second Tab's list (added 2026-10-30) | An entry like Ctrl+C's: the line as typed, not in `history`, then the list or the question (research R44) |

## Cursor and selection (FR-072, FR-074, FR-075)

```ts
type CursorView = {
  focused: boolean;                 // filled when true, hollow when false (FR-072)
  blinking: boolean;                // true from a key press or focus until 5 s after the last key, never under reduced motion (FR-032)
  selection: { start: number; end: number; direction: 'forward' | 'backward' | 'none' };
};
```

The cursor sits at `end` when the direction is `forward`, else at `start`. A non-empty selection
is drawn in the mirror with the selection token (research R36).
