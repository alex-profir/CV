# Contract: Commands

What every command accepts and shows. The words are site text, set by the design
([design/wireframes.md](../design/wireframes.md#site-text)) and kept in
`siteText.terminal`. `{…}` is filled from the CV document, the spec list or what was typed.
Output blocks and their nodes are in [data-model.md](../data-model.md#result-and-output-block-key-entities-output).

## The command line

```text
line   := stage ( "|" stage )*
stage  := word ( space+ arg )*        space is a space or a tab
```

- Matched in lower case, with spaces and tabs ignored around and between words (FR-007). The echo
  in the heading is the line exactly as typed (FR-006).
- Empty line: a new prompt, no message, nothing in `history` (FR-007).
- `|` with nothing on a side: `Usage: {command} | jq, or {command} | vim -` (FR-057, FR-017).
- Only `jq` and `vim -` read piped input. Piping into another command:
  `{command} doesn't read piped input. Pipe into jq or vim -.` (FR-057).
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
| `ls` | | `[path]` | The folder's names in the design's order, as controls: a folder runs `ls ~/{path}` and ends in `/`, a file runs `cat ~/{path}` (FR-043, FR-050). On a file: that file's name alone (FR-048) |
| `cd` | | `[path]` | Nothing printed. The working folder changes. `cd` alone, `cd ~` and `cd /` go home (FR-045, FR-046) |
| `cat` | | `<path>` | The file's block (FR-047). `cat cv.json` shows the JSON text as it is (FR-055) |
| `jq` | | `[path]` or input | The JSON pretty-printed and colored (FR-056) |
| `vim` | | `<path>` or `-` with input | Opens the vim view (FR-058) |
| `pwd` | | none | The working folder's path, such as `~/work` (FR-046) |
| `open` | | `<name>` | `cv` or `about`: opens it in the shell (FR-014) |
| `history` | | none | The commands run since the Terminal opened, oldest first, numbered from 1 (FR-020) |
| `clear` | | none | Clears the output (FR-019) |
| `exit` | | none | Closes the window on desktop, goes home on mobile (FR-008) |

`help` and every CV command take no argument except as shown. So `work 2020` gets the usage reply,
and `help work` shows `work`'s own help (edge cases).

### CV commands (FR-009 to FR-011)

- Fields, order and formatting are `/cv`'s, from `CV_FIELDS` (data-model.md). Dates are `time`
  nodes written as `/cv` writes them, ongoing ones `Present`. Locations read as `/cv` reads them.
- An empty or absent section: `The CV lists no {section}.`, with no heading or list (FR-011). The
  command still exists and still appears in `help`.
- Every word comes from the CV document. The section names come from 004's `siteText.sections`
  (FR-010, FR-030).

## Replies

| Case | Reply |
|------|-------|
| Unknown command | `{typed} is not a command. Run ` control `help` ` to see them all, or try:`, then up to 3 chips. With no suggestion: `{typed} is not a command. Run ` control `help` ` to see them all.` (FR-016, FR-049) |
| No such path | `{path}: no such file or folder.` (FR-048) |
| `cd` on a file | `{path} is a file. Try ` control `cat {path}` `.` (FR-048) |
| `cat` or `vim` on a folder | `{path} is a folder. Try ` control `ls {path}` `.` (FR-048, FR-058) |
| `open` with another name | `open takes cv or about.`, with both as controls (FR-014) |
| `jq` on text that isn't JSON | `jq: {path or |} is not JSON.` (FR-056) |
| `jq` with a filter other than `.` | `jq here only pretty-prints. Usage: jq [path], or … \| jq` (FR-056) |
| `vim -` with nothing piped, `vim` alone | The usage reply (FR-058) |
| `rm`, `mkdir`, `touch`, `mv`, `sudo` and every other word | The unknown-command reply. No hidden command, no joke (FR-049, Assumptions) |

`{typed}` and `{path}` are shown exactly as typed, as text (FR-018).

## Suggestions (FR-016)

For a typed word `w`, in lower case:

1. Every command name and alias `n` with `osa(w, n) ≤ 2`, where `osa` is the optimal string
   alignment distance (an insertion, deletion, substitution or swap of two neighbouring letters
   each cost 1).
2. When `w` is at least 2 letters long, every command name that starts with `w` (distance 0).
3. Sorted by distance, then `help` order. An alias and its command count once, by the nearer
   name, and the chip runs the name that matched. At most 3.

`wrok` → `work`. `hlep` → `help`. `proj` → `projects`. `sudo` → none. Short words reach the
one-character alias: `l` is 1 edit from `ls` and from `?`, and 2 from `cv`, `cd` and `jq`. So it
gets `?`, then `ls`, then `cv`, in `help` order within each distance.

## The vim view's keys

As [data-model.md](../data-model.md#vim-view-key-entities-vim-view-pipe) lists. Messages:

| Case | Message line |
|------|--------------|
| Opened | `"{file}" [readonly] {n} lines  ·  za or click opens a fold` (phone: `"{file}" {n} lines  ·  tap a fold`) |
| An editing key or `:w`, `:wq`, `:w!`, `:x` | `{file} is read only: nothing can be changed` |
| An unknown `:` command | `:{typed} is not a command here. :help lists the keys.` |
| Search | `/{text}   match {i} of {n}  ·  n next  ·  N previous`, or `/{text}   not found` |
