# Contract: Commands

What every command accepts and shows. The words are site text, set by the design
([design/wireframes.md](../design/wireframes.md#site-text)) and kept in
`siteText.terminal`. `{…}` is filled from the CV document, the spec list or what was typed.
Output blocks and their nodes are in [data-model.md](../data-model.md#result-and-output-block-key-entities-output).

## The command line

> **Amended 2026-10-29.** The line is bash's, run by the shell (research R25, R27). The grammar
> below was the Terminal's own and is gone.

- Every line is a bash command line, with FR-067's language: pipes, `;`, `&&`, `||`, quotes,
  escapes, variables, globs, redirects, `if`, `for`, `while`, `until` and functions. Variables and
  functions last until the Terminal closes (research R27).
- The command word of a site command is matched in lower case, with spaces and tabs ignored around
  and between words (FR-007): the adapter lower-cases a line's first word when it names a site
  command or alias in another case, so ` HELP ` runs `help`. A standard command's name is
  case-sensitive, as in bash. The echo in the heading is the line exactly as typed (FR-006).
- Empty line: a new prompt, no message, nothing in `history` (FR-007).
- A syntax error, an empty side of a `|` included, prints bash's message and runs nothing (FR-057,
  research R27).
- Any command can be piped into. One that reads no input ignores it (FR-057).
- At most `command-line.max-length` characters (500). Typing or pasting past it adds nothing
  (FR-017). Pasted line breaks become spaces (FR-018).

## Commands

In `help`'s order. Each takes exactly the arguments shown. A command given an argument it doesn't
take, or missing one it needs, replies `{command} takes {what}. Usage: {usage}` (FR-017).

| Command | Aliases | Arguments | Shows |
|---------|---------|-----------|-------|
| `help` | `?` | `[command]` | `help`'s table: every command and alias as a control, with its usage and description (FR-008, FR-015). With a command or alias: that command's usage, description and own help. An unknown name gets the unknown-command reply |
| `about` | `whoami` | none | `basics`: name, label, location as `/cv` writes it, summary (FR-009) |
| `work` | `experience` | none | Every work entry in order: position · organization, the date range, location, summary, highlights as a list, URL as a link |
| `projects` | | none | Every project: name, dates, description, highlights, keywords, URL |
| `education` | | none | Every entry: institution, study type and area, dates, score, courses |
| `skills` | | none | Every skill: name, level, keywords |
| `languages` | | none | Every language with its fluency |
| `interests` | | none | Every interest with its keywords |
| `contact` | | none | The email (`mailto:`), `basics.url` and every profile, as links named as `/cv` names them (004 FR-012, FR-013) |
| `cv` | | none | Runs `cat cv.json \| jq \| vim -` as if typed (FR-059) |
| `site` | | none | What the site is and how it was built, ending with `Source code, specs and history:` and the repository link (FR-008, US2) |
| `specs` | | none | `Every feature is specified before it is built. {n} specs:`, then one row per spec: number, name as a link to its `spec.md`, status in words, `{n} requirements`. Then `All specs, plans and history:` and the repository link (FR-013) |
| `ls` | | GNU `ls`'s options and paths | GNU `ls`. When its output reaches the screen unchanged, the names are drawn as controls, in the design's order for the home folder, folders ending in `/`: a folder runs `ls ~/{path}`, a file `cat ~/{path}` (FR-043, FR-050, research R29). `ls -l` shows protected entries read only and owned by `root`, the visitor's by `guest` (FR-049) |
| `cd` | | bash's `cd` | bash's builtin. `cd` alone and `cd ~` go home, `cd /` goes to the root, `cd -` back (FR-045, FR-046) |
| `cat` | | GNU `cat`'s options and paths | GNU `cat`. A protected file printed whole is drawn as its block (FR-047, research R29). `cat cv.json` shows the JSON text as it is (FR-055) |
| `jq` | | `[filter] [path]` or input | jq, with its filter language. Output that reaches the screen unchanged is colored (FR-056, research R31) |
| `vim` | | `<path>` or `-` with input | Opens the vim view (FR-058) |
| `pwd` | | bash's `pwd` | The working folder's path, such as `/home/guest/work`. The prompt shows it as `~/work` (FR-046) |
| `open` | | `<name>` | `cv` or `about`: opens it in the shell (FR-014) |
| `history` | | `[n]`, `-c` | The commands run since the Terminal opened, oldest first, numbered from 1, or the last `n`. `-c` empties the history (FR-020) |
| `clear` | | none | Clears the output (FR-019) |
| `exit` | | `[n]` | bash's builtin: the shell exits, so the Terminal closes the window on desktop and goes home on mobile (FR-008, research R27) |

`help` and every CV command take no argument except as shown. So `work 2020` gets the usage reply,
and `help work` shows `work`'s own help (edge cases). `whoami` is `about`'s alias, not the standard
command (FR-068).

### Standard commands (FR-068, added 2026-10-29)

FR-068's commands and `yes` (`STANDARD_COMMANDS`), and the shell's builtins (`SHELL_BUILTINS`)
(research R32), as just-bash runs them, with GNU's options and messages and `--help` on each.
`help` lists them after the site's commands, under `Standard commands` and the design's note
`as in bash. help <command> shows its options.`, in name order, leaving out names the site's
table already lists, each a control that runs `help {name}` (FR-015). `help {name}` runs
`{name} --help`, or for a builtin the shell's own help for it.

### CV commands (FR-009 to FR-011)

- Fields, order and formatting are `/cv`'s, from `CV_FIELDS` (data-model.md). Dates are `time`
  nodes written as `/cv` writes them, ongoing ones `Present`. Locations read as `/cv` reads them.
- An empty or absent section: `The CV lists no {section}.`, with no heading or list (FR-011). The
  command still exists and still appears in `help`.
- Every word comes from the CV document. The section names come from 004's `siteText.sections`
  (FR-010, FR-030).

## Replies

> **Amended 2026-10-29.** The shell's own messages come first, as bash prints them. The Terminal
> adds site text after some of them (research R30).

| Case | Reply |
|------|-------|
| Unknown command | `{typed}: command not found. Run ` control `help` ` to see them all, or try:` and up to 3 chips. With no suggestion: `{typed}: command not found. Run ` control `help` ` to see them all.` The shell's `bash: ` prefix is dropped (FR-016, design) |
| No such path | A standard command's or builtin's own message, such as `cat: {path}: No such file or directory`. The site's own commands (`vim`): `{path}: no such file or folder.` (FR-048) |
| `cd` on a file | `bash: cd: {path}: Not a directory`, then `{path} is a file. Try ` control `cat {path}` `.` (FR-048) |
| `cat` on a folder | `cat: {path}: Is a directory`, then `{path} is a folder. Try ` control `ls {path}` `.` (FR-048) |
| `vim` on a folder | `{path} is a folder. Try ` control `ls {path}` `.` (FR-048, FR-058) |
| `open` with another name | `open takes cv or about.`, with both as controls (FR-014) |
| `jq` on text that isn't JSON, or a filter that doesn't parse | jq's own error (FR-056) |
| `vim -` with nothing piped, `vim` alone | The usage reply (FR-058) |
| A change to a protected file or folder (`rm about`, `mv work jobs`, `echo hi > cv.json`, `touch work/new`) | The command's message ending `Permission denied`, naming the path as typed, once per path (FR-049) |
| The visitor's files past 1 MB | The command's message ending `No space left on device` (FR-073) |
| A syntax error | bash's message without its `bash: ` prefix, such as ``unexpected EOF while looking for matching `"'`` or `syntax error near unexpected token '|'` (FR-057, FR-067) |
| A line stopped by a limit (FR-069) | After what it printed: `stopped: it ran for 5 seconds, the longest a command line runs here.`, `stopped: it ran 10,000 commands, the most a command line runs here.` or `stopped: it printed 1 MB, the most a command line prints here.` |
| Ctrl+C (FR-075) | The line as typed with `^C` after it; while it ran, also `stopped: you pressed Ctrl+C.` |
| The shell not ready yet (FR-070) | Under the starter chips: `loading the shell · type away, commands run once it is ready`. Lines run meanwhile wait after their prompts |
| The shell couldn't load (FR-070) | In the loading line's place: `The shell couldn't load. Check the connection, then try again.` and the control `try again` |
| `sudo`, `ssh`, `curl`, `python` and every other word that isn't a command | The unknown-command reply. No hidden command, no joke (Assumptions) |

`{typed}` and `{path}` are shown exactly as typed, as text (FR-018). The words are the approved
design's (design/wireframes.md, Site text).

## Suggestions (FR-016)

Over FR-008's commands and aliases only, not the standard commands (research R30). For a typed
word `w`, in lower case:

1. Every command name and alias `n` with `osa(w, n) ≤ 2`, or `≤ 1` when `w` has 3 letters or
   fewer, where `osa` is the optimal string alignment distance (an insertion, deletion,
   substitution or swap of two neighbouring letters each cost 1).
2. When `w` is at least 2 letters long, every command name that starts with `w` (distance 0).
3. Sorted by distance, then `help` order. An alias and its command count once, by the nearer
   name, and the chip runs the name that matched. At most 3.

`wrok` → `work`. `hlep` → `help`. `proj` → `projects`. `sudo` → none. Short words reach the
one-character alias: `l` is 1 edit from `ls` and from `?`, so it gets `?`, then `ls`, in `help`
order. `sl` gets `ls`, two letters swapped; `cta` gets `cat`. `rm` and `mv` are standard
commands and run (FR-068).

## The vim view's keys

As [data-model.md](../data-model.md#vim-view-key-entities-vim-view-pipe) lists. Messages:

| Case | Message line |
|------|--------------|
| Opened | `"{file}" [readonly] {n} lines  ·  za or click opens a fold` (phone: `"{file}" {n} lines  ·  tap a fold`) |
| An editing key or `:w`, `:wq`, `:w!`, `:x` | `{file} is read only: nothing can be changed` |
| An unknown `:` command | `:{typed} is not a command here. :help lists the keys.` |
| Search | `/{text}   match {i} of {n}  ·  n next  ·  N previous`, or `/{text}   not found` |
