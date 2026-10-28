# Data Model: The Terminal

Phase 1 of [plan.md](./plan.md). Types are TypeScript, as the code will declare them. The
Terminal's engine (`packages/web/src/apps/terminal/engine/`) holds every type here except the
session store and the shell's additions. The spec's Key Entities map to them as noted.

## Command (Key Entities: Command, Alias)

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

```ts
type JsonToken = { kind: 'key' | 'string' | 'number' | 'literal' | 'punctuation' | 'space'; text: string };
type JsonRow = { indent: number; tokens: readonly JsonToken[] };
type JsonFold = { key: string; start: number; end: number };   // 0-based lines, top-level only (FR-061)

function printJson(text: string): { rows: JsonRow[]; folds: JsonFold[] } | { error: 'not-json' };
```

The printer lexes the text, never `JSON.parse`, so keys keep their order and numbers their
spelling (research R11). `indent` is 2 per level.

## Vim view (Key Entities: Vim view, Pipe)

```ts
type VimSource = { name: string; pipe: string | null; rows: readonly JsonRow[]; folds: readonly JsonFold[]; type: 'json' | 'text' };
// `name` '-' for piped text shows as cv.json when it came from cat cv.json; `pipe` the command line for the status line (FR-059)

type VimState = {
  source: VimSource;
  cursor: { line: number; column: number };
  closed: ReadonlySet<number>;          // fold start lines that are closed
  numbers: boolean;                     // :set nu / :set nonu
  search: { text: string; matches: readonly Match[]; current: number } | null;
  entry: { kind: '/' | ':'; text: string } | null;   // a / or : being typed
  help: boolean;                        // the :help split (FR-064)
  message: Message;                     // the message line
  pending: 'g' | 'z' | 'd' | null;      // the first key of gg, za…, dd
};
type Match = { line: number; start: number; end: number };
type Message =
  | { kind: 'opened' } | { kind: 'read-only' } | { kind: 'unknown'; command: string }
  | { kind: 'match'; index: number; count: number } | { kind: 'not-found'; text: string } | { kind: 'none' };

type VimInput = { key: string } | { submit: string } | { cancel: true } | { fold: number };
function vimReducer(state: VimState, input: VimInput): VimState | 'quit';
```

**Transitions** (FR-060 to FR-064):

| Input | Result |
|-------|--------|
| `h` `j` `k` `l`, arrows | Move by one, skipping closed folds as one line |
| `w` `b`, `0` `$`, `gg` `G`, `{` `}`, Page Up and Page Down | As vim. `{` and `}` move between top-level sections |
| `/` text Enter, `n` `N` | Search, case-insensitive, matches across the whole file. Opens folds holding the current match |
| `za` `zo` `zc` `zR` `zM`, fold activated | Toggle, open, close, open all, close all |
| `:` number, `:set nu`, `:set nonu`, `:help` | Go to line, show and hide line numbers, open the help split |
| `:q`, `:q!` | Close the help split when open, else `'quit'` |
| `i` `a` `o` `x` `dd` `p`, `:w` `:wq` `:w!` `:x` | Nothing changes. Message `read-only` |
| Another `:` command | Message `unknown` |
| Escape | Cancels `entry` or `pending` |
| Any other key | Nothing |

**Invariants**: the cursor is always on a shown line, never inside a closed fold. `search.current`
indexes `matches` when they aren't empty. The text never changes.

## Terminal session (Key Entities: Terminal, Command history, Working folder)

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
  vim: VimState | null;        // the open vim view (FR-058)
  announcement: { text: string; id: number } | null;  // FR-028
};
```

`createSession()` returns the store. `run(line)`, `step(direction)`, `setDraft`, `clear()`,
`vim(input)`, `saveScroll` and `reset()` are its only writers.

**Transitions**:

| Event | Session after |
|-------|---------------|
| First open in the visit | `entries` empty, the greeting shown above them (not an entry), `folder` `[]` |
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

Variants are 005's `<shell>/<state>/<width>px`, with the Terminal's states and a command where one
applies: `desktop/terminal/work/1440px` ([contracts/cli.md](./contracts/cli.md)).
