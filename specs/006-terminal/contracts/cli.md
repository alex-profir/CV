# Contract: Site Check, Changes from 005

004's [contracts/cli.md](../../004-cv-page/contracts/cli.md) and 005's
[contracts/cli.md](../../005-os-shell/contracts/cli.md) still hold: the command
(`npm run site-check`), exit codes, streams, problem lines, determinism and variant naming. The
command and the CI job don't change, so the Terminal's checks run in the same command and on the
same pull requests as 004's and 005's, and give the same result locally (FR-042).

## Parts

One new part, `terminal`, after `cv-app`:

```text
content, cv-app, terminal, accessibility, lighthouse, no-script, offline, keyboard, other-sites,
fonts, layout, print, modes
```

| Part | What it adds on `/` |
|------|---------------------|
| `terminal` | In each shell (1440 × 900 and 375 × 812): opens the Terminal and runs every CV command by typing it. Compares each output group's text, links and `<time datetime>` values, in order, with `terminalFields(resume, command)`. Runs `cat cv.json` and `cat cv.json \| jq`, and opens `cv`, comparing each with `JSON.stringify(resume, null, 2)` line by line, with every fold opened by `zR` for the vim view. Lists every folder and `cat`s every file: one file per work, project and education entry and per spec, none more, each showing what the named command shows for its entry (FR-040, SC-003, SC-011) |
| `accessibility` | axe-core in every Terminal state below (FR-035, FR-038) |
| `keyboard` | FR-039's flow at 1440 × 900, with the focus target and a visible indicator checked at each step. After `Alt+Shift+D` reaches the dock, Enter on the Terminal's dock item brings the window to the front with focus back in the command line, and `exit` is typed there |
| `offline` | After one visit to `/`, and separately to `/cv` only: with the network off, at 375 and 1440 px, opens the Terminal, runs every command `help` lists and compares each group's text with the same run online (FR-041, SC-006) |
| `other-sites` | Records requests while the Terminal opens and every command `help` lists runs, in both shells (FR-038, SC-007) |
| `fonts` | Every text node drawn by a served face in `desktop/terminal-help` and `mobile/pocket-vim` |
| `layout` | No horizontal scroll in the Terminal at 320 × 568, at 568 × 320, in a 400 px wide window, at 200% and 400% zoom and with text spacing, in `terminal-help`, `terminal-vim`, `pocket` and `pocket-vim` (FR-023, FR-035, FR-052, FR-063, SC-012) |
| `modes` | Reduced motion: opening the Terminal, running commands and pressing pocket keys move or scale nothing, and the cursor never blinks (FR-032, SC-008). Without it: the focused cursor blinks after a key press and has stopped, filled, 5 s after the last one (FR-032). Forced colors: the prompt, the command line, the cursor filled and hollow, chips, keys, fold lines and focus indicators are visible, with no background image or color alone (FR-033) |

### Added 2026-10-29 (FR-039, FR-040, research R41)

| Part | What it adds |
|------|--------------|
| `terminal` | In each shell, by typing: `work \| grep -i {a word of the first role}` shows only the matching lines of `work`'s text; `grep -ril {that word} ~/work` lists exactly the work files holding it; `jq '.work[0].name' cv.json` prints the first role's name as JSON; `mkdir notes && echo hi > notes/a && mv notes/a notes/b && cat notes/b` prints `hi`, `ls` lists `notes/` after the built names, and `rm -r notes` removes it; `echo hi > about` and `rm about` print `Permission denied` and `cat about` is unchanged; `while true; do :; done` is stopped with FR-069's text, and the window answers a click meanwhile. Failures name the shell, the line and what differed (FR-040) |
| `keyboard` | After FR-039's existing steps: the cursor is filled in the command line and hollow once Tab leaves it, with no outline or border on the line (SC-015); in the command line, Home and End and Ctrl+Left and Ctrl+Right move the cursor as FR-074 sets for Linux, Ctrl+Backspace deletes a word, Ctrl+A selects the Terminal's text and nothing outside it, and Ctrl+C on a typed line shows `^C` and an empty prompt (FR-039) |
| `accessibility` | The new states below |
| `other-sites` | Also runs the `terminal` part's added lines (FR-038) |

## States

Added to 005's state driver (`tools/site-check/src/shell-states.ts`). Each is reached from a fresh
page by real input: clicks, taps and typed keys.

| Shell | State | How it is reached |
|-------|-------|-------------------|
| desktop | `terminal-open` | Click the Terminal's dock item |
| desktop | `terminal-help` | Then type `help`, Enter |
| desktop | `terminal-vim` | Then type `cv`, Enter |
| desktop | `terminal-vim-search` | Then `za` on the work fold, `/` a word from the CV's first work summary, Enter |
| desktop | `terminal-vim-help` | From `terminal-vim`, `:help` Enter |
| desktop | `terminal-unknown` | From `terminal-open`, type `wrok`, Enter |
| desktop | `terminal-ls` | From `terminal-open`, type `ls`, Enter |
| desktop | `terminal-cat` | From `terminal-open`, `cd work`, then `cat` the first file |
| desktop | `terminal-clear` | From `terminal-help`, `clear` |
| desktop | `terminal-long-command` | From `terminal-open`, type 500 characters |
| desktop | `terminal-minimized` | From `terminal-open`, its minimize control |
| desktop | `terminal-maximized` | From `terminal-help`, its maximize control |
| desktop | `terminal-two-windows` | `terminal-open`, with the CV window behind it |
| desktop | `terminal-specs` | From `terminal-open`, type `specs`, Enter |
| desktop | `terminal-menu` | From `terminal-open`, click the menu bar's `Terminal` menu |
| mobile | `pocket` | Tap the Terminal icon |
| mobile | `pocket-landscape` | `pocket` at 812 × 375 |
| mobile | `pocket-keyboard` | Tap the command line, then make the page 300 px shorter at the same width (research R15) |
| mobile | `pocket-vim` | Tap the `cv` key |
| mobile | `pocket-help` | From `pocket`, tap the `help` key |
| mobile | `pocket-unknown` | From `pocket`, tap the command line, type `wrok`, Enter |
| mobile | `pocket-ls` | From `pocket`, tap the `ls` key |
| mobile | `pocket-cat` | From `pocket-ls`, tap `work/`, then the first file |
| mobile | `pocket-clear` | From `pocket-help`, tap the `clear` key |
| mobile | `pocket-long-command` | From `pocket`, tap the command line, type 500 characters |
| mobile | `pocket-vim-search` | From `pocket-vim`, tap the work fold, then the `/` key, a word from the CV's first work summary, Enter |
| mobile | `pocket-vim-help` | From `pocket-vim`, tap the `:help` chip |
| desktop | `terminal-unfocused` | From `terminal-help`, Tab out of the command line: the hollow cursor (added 2026-10-29) |
| desktop | `terminal-help-standard` | From `terminal-help`, scrolled to its standard commands (FR-008) |
| desktop | `terminal-loading` | The Terminal opened with the worker's file held back by the check's server, and `help` typed: the waiting line (FR-070) |
| desktop | `terminal-load-failed` | The Terminal opened with the worker's file answered 503: the failure text and `Try again` (FR-070) |
| desktop | `terminal-stopped` | From `terminal-open`, `while true; do :; done` and its stop (FR-069) |
| desktop | `terminal-selected-all` | From `terminal-help`, Ctrl+A in the command line (FR-075) |
| mobile | `pocket-stopped` | From `pocket`, tap the command line, the same loop, Enter (FR-069) |

## Variants

005's `<shell>/<state>/<width>px`, with these names and no other:

| Variant | Part |
|---------|------|
| `<shell>/terminal/<command>/<width>px` | `terminal`, `offline`: a CV command's output, such as `desktop/terminal/work/1440px` |
| `<shell>/terminal/files/<width>px` | `terminal`: the file system |
| `<shell>/terminal/json/<width>px` | `terminal`: `cv.json`, `jq` and the vim view |
| `<shell>/<terminal state>/<width>px` | `accessibility`, `fonts`, `layout` |
| `desktop/terminal-keyboard/1440px` | `keyboard` |

## Problem lines (examples)

```text
terminal / mobile/terminal/work/375px missing-field work[0].endDate: "Oct 2026" is not in the output of work
terminal / desktop/terminal/files/1440px missing-file projects[2].name: ~/projects has no file for "Guided Tours System"
terminal / desktop/terminal/files/1440px file-mismatch ~/work/sc-moredevs-srl: cat differs from work's entry at "Software Developer"
terminal / desktop/terminal/json/1440px json-mismatch cv.json line 26: the vim view shows "summary" where the CV document has "highlights"
keyboard / desktop/terminal-keyboard/1440px trapped input.command-line: Tab didn't move focus out of the command line
keyboard / desktop/terminal-keyboard/1440px focus-target step 9 "exit": focus went to body, expected the Terminal dock item
offline / mobile/terminal/specs/375px offline-mismatch specs: output differs from the online run at row 3
accessibility / mobile/pocket-keyboard/375px axe:target-size button.pocket-key: Target size is too small
```

## Tests

`tools/site-check/test/terminal.test.ts` (new) and the extended `shell-states.test.ts`,
`keyboard.test.ts`, `offline.test.ts`, `other-sites.test.ts`, `layout` and `modes` tests run the
check on the real build. Each one also runs it on a copy of the build with one fault, which must
fail with the line above that names it (US8):

- `work` without its end date.
- No file for a project.
- `Tab` caught by the command line.
- The command line with no name.
- The owner's email typed into the Terminal's site text. Here the content check (002) fails,
  naming the file and line (US8 scenario 3).
- (2026-10-29) `rm about` succeeding: the `terminal` part fails, naming the line and `about`.
- (2026-10-29) An outline on the focused command line, or a cursor that stays filled after Tab:
  the `keyboard` part fails, naming the step (SC-015).
