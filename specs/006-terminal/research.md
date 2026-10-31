# Research: The Terminal

Phase 0 of [plan.md](./plan.md). Each decision gives what was chosen, why, and what else was
weighed. The Terminal is built on 005's shell, which is implemented on the `005-os-shell` branch
and not yet merged. Paths, components and checks named here are that branch's (see R1).

**Amendment, 2026-10-30.** Tab completes as bash does, the pocket terminal gets a Tab key, and
the vim view edits files (spec Clarifications, Session 2026-10-30 (owner review of the shell)).
R43 to R52, at the very end, are its decisions.

**Amendment, 2026-10-29.** The spec was amended after the owner's review of the built Terminal: a
real bash-like shell, files the visitor can change, `jq` filters, and a terminal's cursor, focus
and keys (spec Clarifications, Session 2026-10-29). R25 to R42, at the end, are the decisions
for it. R1 to R24 stay as they were decided, and a note under a heading says where a later
decision replaces it in part or in full. The Terminal from R1 to R24 is built and merged
(`bba9650`), so "today" below means that code.

## R1. Building on 005 before it merges

**Decision**: 006 is planned against the `005-os-shell` branch as it stands (its tasks complete,
its pull request open). Before the first implementation task, `006-terminal` merges
`origin/005-os-shell` (or `main`, once 005 has merged there) with a merge commit, as the branch
already did twice for 005's spec changes. If 005 changes after that, it is merged again before the
Terminal's pull request opens. The Terminal's pull request targets `main` after 005's has merged,
so it holds only 006's changes (Constitution XI).

**Rationale**: the Terminal is an app of 005's shell (FR-001). Every integration point it needs
(the app list, windows, focus targets, the site check's state driver) exists only on that branch.

**Alternatives considered**: waiting for 005 to merge before planning (blocks the plan for no
gain, since 005's code is complete); planning against `main` (the shell doesn't exist there).

## R2. Where the Terminal's code lives

**Decision**: an app folder, `packages/web/src/apps/terminal/`, as 005's plan sets for a new app:

- `app.tsx` declares it for both shells, with `needsNetwork: false` (FR-001, Constitution V, VI).
- `engine/` holds the Terminal's behavior as pure TypeScript with no React, DOM or `@cv/tokens`
  import: the parser, the commands, the file system, suggestions, the JSON lexer and printer,
  and the vim view's model. Each is a function from data to data, unit-tested in Node.
- The rest of the folder renders the engine's output with React, in both shells.

The engine isn't put in `@cv/os-core`. `os-core` holds OS behavior that both shells share,
such as windows and focus. The Terminal's commands are one app's behavior, and Constitution V
keeps an app's code with the app.

**Alternatives considered**: a workspace `@cv/terminal` (a package boundary with one consumer;
the folder's `engine/` already keeps React out, and a test enforces it, see R23); logic inside
components (testable only in a browser, and the same rules would be repeated in both shells).

## R3. Output as data, never as markup

**Decision**: a command returns an **output block**: a tree of typed nodes (`text`, `line`,
`heading`, `list`, `link`, `time`, `command` control, `path` control, `json` token rows) defined
in [data-model.md](./data-model.md#output-block). One React component renders every block.
Nothing is ever passed to `dangerouslySetInnerHTML`. Typed text reaches the page only as a React
text child, so `<b>hi</b>` shows as typed and a URL typed by the visitor is never a link (FR-018).

The same block builder produces a CV entry for `work` and for `cat work/<file>`, so FR-047 holds
by construction. The block also knows its heading levels (FR-029), its controls (FR-015) and its
size, which gives the screen reader summary (R13).

**Alternatives considered**: returning strings with ANSI-like escapes (needs a second parser, and
links and controls can't be expressed); returning React elements from commands (ties the engine
to React, and the summary and FR-040's content check would have to read the DOM).

## R4. The CV in the Terminal follows `/cv`'s rules

**Decision**: CV commands read `resume` from `@cv/content` (FR-010) and reuse 004's formatting
modules: `format/dates.ts` for dates and their `datetime` (004 FR-009 to FR-011),
`format/location.ts` for the location (004 FR-008), and 004's labels in `site-text.ts`
(`email`, `website`, `profileLabel`, `present`, `sections`). Fields are shown, left out and
ordered by one table per section, `CV_FIELDS`, which lists the fields `/cv` shows for that
section (004 Key Entities). A test compares it with 004's `expectedFields` so the two can't drift.
Dates are `<time datetime>` nodes. The email, URLs and profiles are `link` nodes whose text
follows 004 FR-012 and FR-013.

**Alternatives considered**: rendering 004's `CvDocument` inside the Terminal (its layout is a
page's, not lines of mono text, and the Terminal's look is set by its own design).

## R5. One Terminal session per visit, outside the shells

> **Extended by R26 and R27 (2026-10-29).** The session also holds the shell's state and the
> visitor's files between lines, and closing clears them too.

**Decision**: the Terminal's state (output, history, working folder, the typed text, the scroll
position and the vim view) lives in a **session store**, `apps/terminal/session.ts`. It is
created once per page and read with `useSyncExternalStore`. The window's content (desktop) and
the full-screen view (mobile) only render it. So the state survives what unmounts those
components: minimizing (the window stays mounted anyway), going home on mobile (the full-screen
view unmounts), and a shell switch (the whole shell unmounts) (FR-021).

The store is emptied only when the visitor **closes** the Terminal (FR-021): the close control,
Close in its menu, `Alt+Shift+W` or `exit` on desktop. 005's `Os` root calls the closed app's
`onClose`, a new optional field of the app declaration (R6). A window that a shell switch drops
isn't closed by the visitor and keeps its session. Nothing is written to storage, so a new visit
starts empty (FR-022).

**Alternatives considered**: component state (lost on mobile Home and on a shell switch); the OS
reducer's state (`os-core` would hold one app's data, against R2); `sessionStorage` (would survive
a reload, and FR-022 says nothing typed is kept after the visit).

## R6. What the shell gives an app, and what changes in 005's code

**Decision**: the Terminal needs five things 005's shell doesn't yet give an app. Each is added in
a general form, so later apps (Contact, Settings) can use it. None changes what the CV app or
About this site do. [contracts/shell.md](./contracts/shell.md) lists them in full:

1. **A third view.** `ViewId` becomes `'cv' | 'terminal' | 'about'`, and `Os`'s `isView` accepts
   it, so the early tap records a tap on the Terminal icon too.
2. **Placement.** `placeWindow` gains the Terminal's rule from the design: 760 × 536, its right
   edge 40 px inside the area's right edge, its top 120 px below the front window's top, fitted
   to the area with at least 24 px below it. With no window shown, it is centered. Four `Metrics`
   fields read the new tokens (R22).
3. **Focus into an input.** An app declaration may name `focusOnOpen`, a selector inside its
   content. `focus.ts` resolves a `window-title` or `mobile-title` target for that view to the
   element, falling back to the title when it's absent. The window and the full-screen view stay
   named by their titles (`aria-labelledby`), so a screen reader announces "Terminal" as focus
   enters, then the command line's name (FR-004, 005 FR-040 as amended).
4. **A window title of its own.** An app declaration may give `WindowTitle`, a component the title
   bar shows in place of the app's name (`Terminal — ~/work`). The dock, the menu bar, the
   Window menu and the page title keep the app's name (005 FR-042).
5. **Its own menu and the OS.** An app declaration may give `menuItems`: commands listed first in
   its menu, before 005's window commands (`Clear output`, FR-003). App content gets an `os`
   handle in its props: `open(view)`, and `exit()`, which closes the window on desktop or goes
   home on mobile, as the controls do (FR-014, US1 scenario 10, US4 scenario 6).

And `onClose` (R5).

**Alternatives considered**: special-casing `'terminal'` in the shell's components, as 005 does
for the CV app's "Open the CV as a page" item (two apps with special cases make every later app a
third; the general fields cost the same code); giving apps `dispatch` (an app could break OS
invariants that the reducer guards).

## R7. Parsing a command line

> **Superseded by R25 and R27 (2026-10-29).** The shell parses every line. The `COMMANDS` table
> stays, as the list `help`, the suggestions and the site text read (R29).

**Decision**: a small hand-written parser, `engine/parse.ts`:

1. Line breaks in pasted text become spaces before the text reaches the command line (FR-018).
2. The line is split on `|` into stages. A stage with no command, such as `ls |`, `| jq` or
   `ls || jq`, gives the usage reply (FR-057, FR-017).
3. Each stage is split on runs of spaces and tabs. The first word, in lower case, names the
   command or alias (FR-007). The rest are arguments, kept as typed and matched without regard to
   capitals where they name paths (FR-045).
4. There are no quotes, escapes, variables or globs. File names never hold spaces (FR-044), so
   none is needed, and the spec rules out a command language beyond FR-008.

Every command is a row of one table, `COMMANDS`, holding its name, aliases, arguments, whether it
reads piped input, and its site text (usage, one-line description, own help). `help` lists the
table, the parser looks words up in it, and suggestions search it. A command that isn't in the
table can't exist, and every command in it is listed (FR-008).

**Alternatives considered**: a shell-words library (quotes and escapes the Terminal doesn't have;
Constitution X); regular expressions per command (the command list would be spread over them).

## R8. Suggestions for a mistyped command

**Decision**: optimal string alignment distance (Levenshtein with adjacent transposition, each
pair swapped at most once), computed on lower-case words, over every command name and alias. A
word gets each name at distance 1 or 2 (only 1 for a word of 3 letters or fewer, so a 2-letter
word doesn't reach every 2-letter command), and, when it is at least 2 letters long, each command
whose name starts with it (FR-016). The list is sorted by distance (a prefix match counts as its
distance), then by `help` order, without duplicates. An alias and its command count once, by the
nearer name, and at most 3 are offered. `sudo`, `rm` and `mkdir` find nothing within their limit
of a name and get only `help`; `mv` gets `cv`.

**Alternatives considered**: full Damerau–Levenshtein (the same results on single words this short,
with more code); a fuzzy-search package (Constitution X, and its scores would not match FR-016's
rule).

## R9. The file system

> **Replaced in part by R28 (2026-10-29).** The tree, its order and its names (FR-043, FR-044)
> stay as below, as the protected part of the shell's file system. Paths, writing and permissions
> are R28's.

**Decision**: `engine/files.ts` builds a read-only tree once, from `resume` and the spec list, when
the Terminal first opens in the visit. It is a pure function, so a test builds it from fixtures.

- **Home folder order**: `cv.json`, `about`, `contact`, `work/`, `projects/`, `skills`,
  `education/`, `languages`, `interests`, `readme`, `specs/` (the design's order, FR-043). An empty
  or absent section is left out. `cv.json`, `readme` and `specs/` are always there.
- **Names** (FR-044): the identifying field (`name` for work and projects, `institution` for
  education, the folder name for specs), Unicode-normalized to NFD, combining marks removed
  (`Timișoara` → `timisoara`), lower-cased, and every run of characters other than `a`–`z` and
  `0`–`9` replaced by one hyphen, with hyphens trimmed from the ends. An empty result becomes
  the section's singular site text (`role`, `project`, `school`). When two names in a folder are
  the same, each gets `-<start year>` (or nothing, without a start date). If any are still the
  same, each of those gets `-2`, `-3` and so on, in the CV document's order, after the first.
- **Paths** (FR-045): `~`, `~/x`, `/x`, `.`, `..` and names, each part matched without regard
  to capitals. `..` at the home folder stays there. The tree is two levels deep, so this is a
  short loop over the parts, not a general path library.
- `cat` on a file returns the file's block builder's output: the same builder as the named
  command (R3, FR-047).

**Alternatives considered**: a general in-memory file system package (writing, permissions and
deep trees the Terminal must not have, FR-049); building the tree at build time (it is a few
dozen nodes, cheap to build in the browser from data the bundle already holds).

## R10. The spec list, read when the site is built

**Decision**: `packages/web/scripts/spec-list.ts` exports `readSpecList(root)`. It reads every
`specs/<NNN-name>/spec.md` with 001's own reader, `tools/traceability/src/specs.ts`
(`parseSpec`, `requirementsOf`, and `specFeature` from `files.ts`). So the status and the count of
active requirements (FR-013) are exactly what the traceability check reads, and a removed
requirement isn't counted. Each entry is
`{ number, folder, name, status, requirements }`. The name is the spec's first heading after
`Feature Specification: `.

It reaches the browser through a **Vite virtual module**, `virtual:cv-spec-list`, served by a
small plugin, `specListPlugin()`, in `vite.config.ts` and `vitest.config.ts`. Only
`apps/terminal/data.ts` imports it. A spec added, approved or changed changes the next build's
bundle with no edit to the Terminal, and the service worker's version with it.

The link to each spec is `{repository}/blob/main/specs/{folder}/spec.md`, with the repository
from `siteData` (002) and the pattern in the Terminal's site text. `main` is the branch the site
is built from.

**Alternatives considered**: a generated file committed to the repository (it can drift from the
specs between regenerations, against FR-013); passing the list through `renderShell`'s props
(the client bundle would still need it, so it would need a second path to the browser); fetching
`specs/` from GitHub at run time (a request to another site, against FR-022 and offline use).

## R11. `cv.json`, `jq` and the JSON printer

> **Replaced in part by R31 (2026-10-29).** `cv.json` and the lexer stay. `jq` is the shell's own,
> with filters, and the lexer colors what it prints.

**Decision**:

- **`cv.json`** is `JSON.stringify(resume, null, 2)`, from `@cv/content` (FR-055). That is the
  CV document's JSON value exactly, every key and value in its order, as the content source holds
  it. The committed `resume.json` is written the same way, with 2-space indents, so `cat cv.json`
  shows the file as it is. A test asserts both: the value with its key order, and the text
  against `packages/content/resume.json`'s, ignoring a final line break.
- That makes a rule for the content source: `resume.json` stays in the form
  `JSON.stringify(value, null, 2)` writes, with 2-space indents, no `\u` escapes for characters
  JSON allows as written, no integer-like keys and every number as JavaScript prints it (`1.5`,
  not `1.50`). A CV edit that breaks the rule fails that test, naming `cv.json`, and is fixed by
  rewriting `resume.json` in that form, never by changing the Terminal. Importing the file's raw
  text instead was weighed and rejected: it would add a second way to read the CV beside
  `@cv/content` (Constitution IV).
- **`jq`** doesn't call `JSON.parse`. A small lexer, `engine/json.ts`, reads the text into
  tokens (punctuation, keys, strings, numbers, `true`, `false`, `null`), checks the structure, and
  prints it with 2-space indents. That keeps every key in its order even where `JSON.parse` would
  reorder it (keys that look like integers), and keeps each number as written. Its output is rows
  of tokens, colored by class, so colors carry no meaning on their own (FR-056). Text that isn't
  JSON gives FR-056's reply.
- `jq .` is accepted as the identity filter. Any other argument starting with `.` is a filter and
  gets the "only pretty-prints" reply (FR-056). Any other argument is a path.
- The printer also returns each top-level object or array's first and last line, for the vim
  view's folds (FR-061).

**Alternatives considered**: `JSON.parse` and `JSON.stringify` (reorders integer-like keys and
can rewrite numbers, against FR-055 and FR-056's "keys in their order"); a JSON highlighting
package (Constitution X; the lexer is about 100 lines, and folds need its line positions).

## R12. The vim view

> **Replaced in part by R47 to R50 (2026-10-30).** The view now edits text, as vim does. The
> structure, the wrapping, the folds, the search and focus on opening stay.

**Decision**: a model and a view, as the rest of the Terminal.

- **Model**, `engine/vim.ts`: the lines (token rows from R11, or plain text for a file that isn't
  JSON), the folds, the cursor, the search, the line number setting, the help split, the mode and
  the message. A pure `vimReducer(state, input)` takes a key or a command (`/text`, `:12`, `:q`)
  and returns the next state. Every key of FR-060 is a case, and a key not listed does nothing.
  Editing keys and commands (`i`, `a`, `o`, `x`, `dd`, `p`, `:w`, `:wq`, `:w!`) set the read-only
  message (FR-060). Counts (`5j`) aren't supported, as FR-060 doesn't list them.
- **View**, `VimView.tsx`: a `section` filling the window's content or the pocket terminal's
  screen. It renders every line. The CV's JSON is under 400 lines, so it needs no virtual
  scrolling, which would also break the screen reader's reading of the whole file (FR-065). The
  text area is one focusable element (`tabindex="0"`), with `role="document"`,
  an `aria-label` naming it read only (`role=document` allows no `aria-readonly`) and `aria-roledescription` from site text. It holds the key handler,
  so a screen reader reads it in browse mode and passes keys through in focus mode. Fold lines
  are `button`s with `aria-expanded` (FR-061, FR-065). `/` and `:` show a real `<input>` in the
  message line. On a phone that opens the keyboard for the search text (design), and Escape
  cancels (FR-060).
- **Wrapping** (FR-063): each line is a grid row with a line-number cell and a text cell. The text
  cell wraps at spaces (`white-space: pre-wrap`, `overflow-wrap: anywhere` for a long word). It
  carries its indent as `--indent: <n>ch`, `padding-inline-start: calc(var(--indent) + 2ch)` and
  `text-indent: -2ch`, so a continuation sits 2 characters past the line's own indent. The number
  sits in its cell's first row only.
- **Keys taken**: only unmodified printable keys and Escape, Page Up and Page Down, Home and End,
  and the arrows, while the text area has focus. Ctrl, Alt and Meta combinations are never handled,
  so `Ctrl+D`, `Ctrl+F`, `Ctrl+U` and 005's `Alt+Shift` shortcuts keep their meaning (FR-060,
  FR-026). Tab is never handled (FR-065).
- **Opening and leaving** (FR-064, FR-065): opening sets the session's `vim` field. The Terminal
  renders the view in place of the output and moves focus to its text area. A one-time message
  (R13) gives the file's name, "read only", its line count and "Type :q to leave". `:q` clears
  `vim`, appends the opening command and a new prompt, and returns focus to the command line.

**Alternatives considered**: CodeMirror or Monaco in read-only mode (hundreds of kilobytes in the
one shell bundle, their own key maps, and their own looks against FR-031; Constitution X); a
`<textarea readonly>` (no folds, highlights or colors).

## R13. What screen readers hear

> **Extended by R30 (2026-10-29).** Output the shell prints as text is counted in lines.

**Decision**:

- The output is a plain container, not a live region. Earlier output that scrolls into view is
  never announced again (FR-028).
- The Terminal has its own visually hidden `role="status"` element. After a command runs, it gets
  either the output's text, when the output is at most 5 rows, or the summary pattern from site
  text (`{command}: {count} {unit}`, such as `work: 4 entries`) (FR-028). The text is replaced
  each time, with a counter so that the same message twice is announced twice, as 005's
  `Announcer` does.
- **Rows** are counted on the output block, as it shows at the desktop window's width. The column
  count is `floor((window width − 2 × padding) / (font size × advance))`, from the tokens (R22)
  and the mono face's advance width. That advance (600 units per em for JetBrains Mono) is a fact
  of the font file. It is recorded beside the family in `fonts/mono-advance.json` as `"advance": 0.6` (moved out of `fonts.json` on 2026-10-30, so the page's script doesn't carry that file),
  and a font test measures it in Chromium against the served file. A text node counts
  `ceil(length / columns)` rows. Each list item, heading and line counts at least 1. So a phone
  gets the same announcement as a desktop, as FR-028 requires.
- Headings (FR-029): one visually hidden `h1` names the Terminal. Each command run is an `h2`
  holding the command as typed. The prompt's `guest`, path and time are `aria-hidden` (FR-027).
  Inside the output, a section is `h3` and an entry `h4`, or an entry is `h3` when the command
  shows one section. This matches the CV app, whose window content starts at `h1`.
- The working folder is read once when it changes, as part of `cd`'s announcement ("Now in
  ~/work"), since the prompt is hidden from screen readers.

**Alternatives considered**: `role="log"` on the output (a live region: it would read every output
in full, against FR-028's summary); 005's shared `Announcer` (it is driven by the OS reducer's
effects, and the Terminal's announcements aren't OS actions); measuring rows in the DOM (the phone
would count different rows from the desktop).

## R14. Scrolling after a command

**Decision**: the output container scrolls, never the page (FR-019). After a command runs, the
Terminal measures its group. If the group is taller than the view, the container's `scrollTop`
puts the command's heading at the top. Otherwise the view scrolls to the end, so the new prompt
shows. It sets `scrollTop` itself rather than calling `scrollIntoView`, which can scroll the page
or the window behind. The same runs after a command control is activated, wherever the visitor
had scrolled to (edge cases). The position is saved in the session on scroll, so it survives
leaving and coming back (FR-021).

## R15. The command line, its cursor and the phone's keyboard

> **Replaced in part by R36 and R37 (2026-10-29).** The input, its name, the touch rule and the
> keyboard detection stay. The cursor now blinks and turns hollow, the line has no box, and the
> line takes a terminal's keys.

**Decision**:

- The command line is a real `<input type="text">`. It is named "Command" by a visually hidden
  `label` (FR-027), with `autocomplete="off"`, `autocapitalize="off"`, `spellcheck="false"`,
  `enterkeyhint="go"` and `maxlength` from the `command-line.max-length` token (500, FR-017). A
  `paste` handler replaces line breaks with spaces (FR-018). Up and Down step through the
  history (FR-020). Tab, Shift+Tab and every modified key are left to the browser (FR-026).
- **Cursor**: the design's steady block never blinks (FR-032). The input's own caret is hidden
  (`caret-color: transparent`), and an `aria-hidden` mirror, laid over the input in the same font,
  draws the text and a block at the caret's index. The index is read from `selectionStart` on
  `input`, `select`, `keyup` and `pointerup`. In forced colors the block is `Highlight` (FR-033).
- **Command controls on touch** (FR-015): focusing an input opens a phone's keyboard. So a control
  activated by touch first sets `inputmode="none"` on the command line, then focuses it. The next
  pointer down on the command line itself removes the attribute, so tapping it to type still opens
  the keyboard.
- **The keyboard open** (FR-053): while the command line has focus, a `visualViewport` `resize`
  that makes the visual viewport shorter, at the same width, sets `data-keyboard` on the pocket
  terminal. The keys are hidden and the screen fills the visual viewport's height below the
  header. Losing focus, or the viewport growing back, clears it. A shorter viewport at the same
  width is how both phone browsers report a keyboard by default, and the site check can produce
  it by resizing the page (R20).

**Alternatives considered**: a `contenteditable` command line (inconsistent across screen readers
and phone keyboards); the native caret with `caret-shape: block` (not supported by Safari or
Firefox, and it blinks); the `interactive-widget` viewport meta (changes every app's page,
and Safari ignores it).

## R16. Glyphs the site's fonts don't cover

**Decision**: the served JetBrains Mono subsets (004 FR-045) have no `❯`, `◷`, `█` or `↗`, and the
`fonts` part fails on any text drawn by a fallback face. So the prompt's `❯`, the clock, the dock
and home screen icon, and the cursor are drawn as inline SVG or CSS boxes, `aria-hidden`, in
`currentColor`. External links reuse 004's `Arrow` component. `—`, `·`, `•`, `~` and `+` are in
the latin subset and stay text. A unit test lists every character of the Terminal's site text and
checks it against the served subsets' `unicodeRange`.

**Alternatives considered**: serving another subset of JetBrains Mono (more bytes for four glyphs,
and 004 FR-045 fixes the subsets).

## R17. The prompt's time

**Decision**: the time a prompt appeared is stored with its command when the command is entered,
and shown as `hh:mm` in the visitor's local time, 24-hour, from `Date`. It is the same on the
desktop and in the output after a shell switch. The phone leaves it out (design). It is
`aria-hidden` (FR-027). Tests fix the clock.

## R18. The pocket terminal's layout

**Decision**: CSS in `apps/terminal/pocket.css`, scoped to the full-screen view. It isn't in
`shells/mobile/`, because the pocket terminal is the Terminal's own look on mobile, not the shell's.

- Portrait or landscape: `@media (orientation: landscape)`, as the design sets ("width >
  height"). Below 375 px wide, the narrow sizes: a new breakpoint token
  `breakpoint.pocket-narrow` (375), read through the token output's `@custom-media` (003 R11).
- The case is one decorative `div` with `aria-hidden="true"`. It holds the power light, the grille
  and the owner's name, from `resume.basics.name`. The screen and the keys are its siblings in the
  accessibility tree (FR-054).
- Keys are a `div[role=toolbar]` named "Command keys" (or "Vim keys") of 8 `button`s, at least
  `size.pocket-key-narrow` (48 px) tall and 44 px in landscape (FR-051, FR-066). A pressed key's
  state is a color change only under reduced motion (FR-054).
- The screen is `flex: 1` with its own scroll, so nothing scrolls sideways at 320 px or in
  landscape (FR-052).

## R19. Motion, transparency and forced colors

**Decision**: output appears in the same frame as the Enter key, with no typing effect, ever
(FR-032). The only motion is 005's window and full-screen animations, already removed under
reduced motion (005 FR-046), and the pocket keys' pressed state, which only changes color under
reduced motion. The glass's `backdrop-filter`, sheen and rim are dropped under
`prefers-reduced-transparency: reduce` (solid `color.shell-surface`) and under
`forced-colors: active` (`Canvas`, `CanvasText`, a solid border; chips, keys and fold lines
outlined; the cursor in `Highlight`) (FR-033).

## R20. The site check: states, a content part and flows

> **Extended by R41 (2026-10-29).**

**Decision**: 005's state driver gains the Terminal's states, reached by real input. A new part,
`terminal`, checks the content. Existing parts cover the rest. [contracts/cli.md](./contracts/cli.md)
gives the details.

- **States** (FR-035, FR-038). Desktop: `terminal-open`, `terminal-help`, `terminal-vim`,
  `terminal-vim-search`, `terminal-vim-help`, `terminal-unknown`, `terminal-ls`,
  `terminal-cat`, `terminal-clear`, `terminal-long-command`, `terminal-minimized`,
  `terminal-maximized` and `terminal-two-windows`. Mobile: `pocket`, `pocket-landscape`,
  `pocket-keyboard` (the command line tapped, then the page made 300 px shorter at the same
  width, R15), `pocket-vim`, and the shared states again at the phone width, so FR-038's phone
  width covers every FR-035 state: `pocket-help`, `pocket-unknown`, `pocket-ls`, `pocket-cat`,
  `pocket-clear`, `pocket-long-command`, `pocket-vim-search` and `pocket-vim-help`. Desktop also
  has `terminal-specs` and `terminal-menu`, the two wireframed states FR-035 names on desktop only.
  Each runs in `accessibility`. `fonts` adds `terminal-help` and
  `pocket-vim`. `layout` adds zoom and text spacing on `terminal-help`, `terminal-vim`, `pocket`
  and `pocket-vim`.
- **`terminal` part** (FR-040, FR-042): in each shell, it runs every CV command by typing it. It
  reads the output group's text, links and `<time datetime>` in order, and compares them with
  `terminalFields(resume)`. That helper is built from 004's `expectedFields`, with the Terminal's
  differences (no section labels and no `/cv`-only links) written once and tested. It also
  checks `cat cv.json`, `cat cv.json | jq` and the vim view against `JSON.stringify(resume, null, 2)`,
  token by token. It lists every folder and `cat`s every file, checking there is one file per
  entry and that each matches the named command. Failures name the shell, the command and the
  field, or the folder and the entry.
- **`keyboard`** adds FR-039's flow. **`offline`** opens the Terminal offline in both shells and
  runs every command `help` lists, comparing each group's text with the online run (FR-041).
  **`other-sites`** records requests while the Terminal opens and every command runs (FR-038).
  **`modes`** adds the Terminal to its reduced motion and forced colors sequences (FR-032,
  FR-033).

**Alternatives considered**: asserting the Terminal's content only in Vitest (it would not run
against the real build in both shells with the check's naming, against FR-042); a test hook in
the site to reach states faster (005 R17 rejected it, and the check would no longer prove what a
visitor can do).

## R21. Bundle size and speed

> **Replaced in part by R34 (2026-10-29).** The Terminal's interface stays in the `os` script. The
> shell is a second script, loaded when the Terminal first opens.

**Decision**: the Terminal ships in 005's one `os` script, as 005's plan requires (no lazy chunks
until FR-053's stale-chunk problem is solved). Its estimated cost, compressed: engine about 9 KB,
components about 7 KB, style sheet about 4 KB, the spec list under 1 KB. That takes 005's budget
from about 85 to about 102 KB of script. Lighthouse 90+ on `/` (SC-005) stays a merge check, and
this is marked **Verify** in the plan: if `/` drops below 90 on the mobile profile, the first
fallback is to drop `react-dom`'s development-only paths (already done by Vite) and the second is
to move the vim view's key help text into a lazily built string. Code splitting stays out until
005 FR-053 allows it.

SC-002 (100 ms desktop, 300 ms with the mobile CPU slowdown): every command is synchronous and
renders in one commit. The largest, `cv`, lexes about 9 KB of JSON and renders about 300 lines.
A browser test times it with 4× CPU throttling over CDP, as 005 times the CV app.

## R22. Tokens

**Decision**: the design's proposed tokens go into the hand-written export
(`packages/tokens/penpot/tokens.json`), under the constitution's interim provision. They are
written in the form every existing token uses, which changes a few of the design's names and
types. As in 005 R7, the changes are made in the design README first, in a `docs:` commit:

| Design proposed | In the export | Why |
|-----------------|---------------|-----|
| `dimension` values with `px` (`size.*`, `command-line.max-length` aside) | `sizing`, unitless (`"24"`) | Every existing `size.*` token is `sizing` and unitless. The token output adds `px` |
| `fontSizes` with `px` | `fontSizes`, unitless (`"14"`) | As `font.size.mono` |
| `font.line-height.terminal`, `-pocket`, `-pocket-narrow` | Removed. Three typography tokens `typography.terminal` (14 on 1.5), `typography.terminal-pocket` (12.5 on 1.52) and `typography.terminal-pocket-narrow` (12 on 1.5) | Line height has no token type of its own here. It lives in typography tokens, as for every other text style. 21, 19 and 18 px are what these give |
| `color.vim-match`, `color.vim-match-current`, `color.vim-band`, `color.vim-status` as literal values | Base colors `color.base.amber-wash` (`#fcd34d33`), `color.base.amber-wash-strong` (`#fcd34d6b`), `color.base.wash` (`#ffffff14`), with `color.vim-band` referring to the existing `color.base.speck` (`#ffffff0d`, the same value) | Semantic tokens refer to base colors, as every existing one does |
| `color.base.sheen` (`#ffffff0d`) | Not added. `color.terminal-sheen` refers to `color.base.speck`, the same value | One name per value in the base set |
| Semantic colors in the base set | In the `light` set, beside 005's shell colors | As 005's |
| `command-line.max-length`, `number` | `number`, as `scale.open-start` | Read as a plain number by `metrics.ts` |
| (none) | `breakpoint.pocket-narrow`, `dimension`, `375` | The design's narrow pocket sizes below 375 px (R18) |

Scripts read the window's size and position, the column count's inputs (R13) and the command
line's limit through 005's `metrics.ts`, which gains a `TERMINAL` group. `os-core` gets the four
placement values in `Metrics` (R6). Every other value is used in CSS as `var(--token-…)`. The
token check (003) passes with no exception (FR-031).

## R23. Tests and where they live

**Decision**:

- **Engine unit tests** (Node, no browser) in `packages/web/test/terminal/engine/`: parser,
  every command's output block from fixture CVs (004's `__fixtures__`), suggestions, the file
  system and its names, paths, JSON lexing and printing, every vim key, summary counting. A test
  scans `apps/terminal/engine/` and fails if it imports React, the DOM, `@cv/tokens` or a
  component.
- **Browser tests** on the real build, in `packages/web/test/terminal/`, with 005's shell helper:
  opening, focus, typing, controls, history, scroll, announcements, headings, the vim view, the
  pocket terminal, offline, requests, motion, forced colors, zoom and targets.
- **Core tests** in `packages/os-core/test/`: the Terminal's placement, and the reducer with
  three apps.
- **Site check tests** in `tools/site-check/test/`: the new states, the `terminal` part, and each
  part's Terminal additions, each failing on a broken copy of the build as 005's do (US8).

Every test title carries the `006-terminal-FR-###` IDs it covers (Constitution III).

## R24. Manual checks

**Decision**: the screen reader passes of SC-004 (one desktop and one phone screen reader through
stories 1, 3, 4 and 5), the real phone keyboard (FR-053) on iOS Safari and Android Chrome, browse
mode and focus mode in the vim view with NVDA and VoiceOver, forced colors in Edge, and
comparing the build with the design's exports, are done by hand (quickstart 7 to 9). Under the
constitution's interim provision on deferred manual checks, they may wait for the final testing
phase. They stay as open tasks in `tasks.md` and are listed in the pull request.

---

# Amendment, 2026-10-29: a bash-like shell, and a terminal's cursor and keys

R25 to R42 decide how the amended requirements (FR-005, FR-008, FR-012, FR-015, FR-016 to FR-018,
FR-021, FR-032, FR-039, FR-040, FR-043, FR-045, FR-049, FR-056, FR-057, FR-067 to FR-075, SC-013 to
SC-015) are built. Every measurement below was taken on 2026-10-29 with just-bash 3.6.0, in Node 22
and in Playwright's Chromium, from scripts kept outside the repository.

## R25. Which shell

**Decision**: [just-bash](https://github.com/vercel-labs/just-bash) **3.6.0**, pinned exactly, as
a dependency of `@cv/web`. It is a bash interpreter written in TypeScript, with an in-memory
file system and about 80 commands, built by Vercel Labs for agents that need a shell without a
machine. It is the in-browser bash the spec's clarification describes.

What it gives, checked by running it:

- **The language of FR-067**: pipes, `;`, `&&`, `||`, quotes and escapes, `$VAR`, `${VAR}`,
  `${VAR:-default}`, `export`, `$?`, `$(…)`, arithmetic, arrays, `[[ … ]]`, globs, here-strings
  and heredocs, the redirects `>`, `>>`, `2>`, `2>&1` and `<`, `if`, `for`, `while`, `until`,
  `case` and functions. `for i in $(seq 3); do echo $i; done | sort -r` gives `3 2 1`.
- **The commands of FR-068**: every one FR-068 names, with GNU's options and messages
  (`ls: unrecognized option '--badopt'`), and `--help` on each. `jq` takes jq's filter language
  (R31).
- **Custom commands** (`defineCommand`) that take part in pipes, redirects and loops like any
  other, and that can wrap a built-in one through `ctx.origCommand` (R29).
- **A pluggable file system** (`IFileSystem`), so the protected files are the Terminal's own
  (R28).
- **Execution limits** for time, command count and output size, with its own messages (R33).
- **No network and no other language by default**: `curl` exists only when a network is
  configured, and `python3` and `js-exec` only when enabled, which the Terminal never does
  (FR-022, FR-068).
- **Browser support**: a browser build, `just-bash/browser`, one file with no dynamic import.
  It runs in a module worker in Chromium (R26).
- **Its parser and serializer are reachable**, which R27 uses. The package exports `parse` and
  `serialize`, but `just-bash/browser` doesn't, so the adapter reaches both through a second
  `Bash`'s public `transform`: a transform plugin captures the parsed tree, or swaps in a given
  one, and `transform(…).script` is its serialized text (built 2026-10-29, T144).

Its cost (R34): the browser build is 1.26 MB, 343 KB with gzip and 274 KB with Brotli, about
three times the rest of the site's script. That is why FR-070 loads it only when the Terminal
first opens.

Its gaps, found while researching. Each is handled where named, and G1, G2, G5, G11, G13 and G14 are
reported upstream with a failing test before the Terminal relies on them (tasks):

| # | Gap in 3.6.0 | Handled by |
|---|--------------|------------|
| G1 | A write that the file system refuses inside a redirect (`echo hi > about`) rejects `exec` instead of printing `bash: about: Permission denied` with status 1. The line's earlier output is lost | Upstream fix first. Until it is released, the adapter checks each redirect's target as the command runs, and a write past the limit fails its command alone (R28, which lists what stays until the fix) |
| G2 | A trailing `\|` (`ls \|`) parses as a complete line and runs | The adapter's syntax check (R27) |
| G3 | stdout and stderr come back as two strings, so their lines can't be interleaved as a terminal shows them, even under `2>&1` in a group | Shown stdout first, then stderr (R30). SC-014 compares each stream on its own (R38) (spec FR-068, SC-014) |
| G4 | Every `exec` starts from a fresh copy of the shell's state: variables, functions, options and the working folder reset after each line. Files are kept | The adapter carries the state (R27) |
| G5 | `tee` reports any write error as "No such file or directory" | Upstream fix. Until then, `tee` onto a protected file says the wrong reason, and the file is still unchanged (spec FR-068) |
| G6 | The default file system creates missing parent folders on write (`echo hi > /nope/x` succeeds) | The Terminal's file system refuses it with "No such file or directory" (R28) |
| G7 | `FsStat` has no owner, so `ls -l` always shows `user user` | The `ls` wrapper writes the owner (R28) |
| G8 | Functions can't override `exit` | Not needed: R27 detects `exit` |
| G9 | `$HOME` defaults to `/` | Set to `/home/guest` (R27) |
| G10 | `compgen -b` prints nothing, `type` abbreviates a function's body with `...`, and `declare -f` prints a placeholder for it | R27 takes bodies from the parser and from what `eval` and `source` read, R32 lists builtins in a tested constant |
| G11 | `env` also lists variables that weren't exported | Upstream fix. Until then, `env` lists them. `export -p` is right (spec FR-068) |
| G12 | `jq`'s error messages are worded differently from jq 1.7's (`jq: parse error: Unexpected token EOF at position 2`) | Accepted: they are jq's errors as the shell's jq gives them (FR-056). R38 leaves jq's errors out of the parity list (spec FR-068) |
| G13 | `yes` ends with status 0 when it reaches the output limit, printing exactly that much, instead of being stopped | The adapter treats a line whose output reached 1,048,576 bytes as stopped by the output limit (R33) |
| G14 | A command that passes the output limit (`seq 1000000`) prints none of its output, where bash would have printed up to the stop | Accepted: the line shows FR-069's text with what earlier commands printed. Upstream report |
| G15 | `maxLoopIterations` (100,000 by default) makes `seq 200000` fail with "iteration limit exceeded", which bash never says | Set to 1,000,000,000, so FR-069's three limits are the ones that stop a line (R33) |
| G16 | `cat` on a folder says `cat: work: No such file or directory`, where GNU's says `Is a directory` | The `cat` wrapper rewrites the line when the path is a folder (R29) |
| G17 | A command only the Node build holds (`python`, `python3`, `js-exec`, `sqlite3`…) says `bash: python: command not available in browser environments. Exclude 'python' from your commands or use the Node.js bundle.` | The adapter rewrites it to `bash: python: command not found` (FR-022, R27) |
| G18 | `rm`, `mkdir`, `touch` and `seq` don't answer `--help` (`rm: unrecognized option '--help'`, `seq: invalid floating point argument: '--help'`) | Wrappers in `site-commands.ts` print their help in the form just-bash's other commands use (`MISSING_HELP` in `standard.ts`), with the options it implements (FR-068). Upstream report |
| G19 | `sed -i` reports any write error as "No such file or directory", like `tee` (G5): `sed -i s/a/b/ about` says `sed: about: No such file or directory` | The `sed` wrapper in `site-commands.ts` rewrites it to `Permission denied` when the file exists and the write is refused, as it does `tee`'s (FR-049). Upstream report |
| G20 | `cp` and `mv` name only the source of a refused copy or move (`cp: cannot copy 'skills': Permission denied`, `mv: cannot move 'mine': Permission denied`), where GNU's name the destination (`cp: cannot create regular file 'about': Permission denied`, `mv: cannot move 'mine' to 'work/mine': Permission denied`) | The `cp` and `mv` wrappers rewrite the line in GNU's form, so the protected path is named as typed (FR-049). `awk`'s `print > "about"` and `sort -o about` still say only `awk: Permission denied` and `sort: Permission denied`, without the path; the file is unchanged. Upstream report |
| G21 | `printf "\xff\xfe"` prints each byte above 127 that isn't valid UTF-8 as a character, so `wc -c` counts 4, through a pipe or a file (T295) | `printf` and `echo -e` wrappers in `site-commands.ts` mask the byte and print bytes back, and a snapshot marks the file `binary` so a restarted worker has the same bytes. Stays: `x=$'\xff'` holds a character, and on the screen such a byte shows as that character, where a terminal shows a replacement. Upstream report |
| G22 | A command name from an expansion isn't split: `x='echo hi'; $x` says `bash: echo hi: command not found`, status 127 (T297) | The adapter expands the name and arguments into an array, and its `name` command picks the name it runs under (`rewriteExpanded`): `IFS`, globs and site commands hold. 8 commands against bash's 1 |
| G23 | Listed options that fail or differ: `xargs -n1`, `head -n -1`, `uniq -c`'s width, `sed -f /dev/null`, `sed -i.bak`, `s/a/b/w o`, `date -I`, `date -d` in the browser's zone, `env -i env`, `cp -v`, `tail -c` by character; wrong-use wordings (T302, T306) | `shell/gnu.ts`, in front of each command. `w` is handled for a script that is one `s` command only; a longer script still writes every line, for T129 |
| G24 | `pushd` and PIPESTATUS, `export -f`, `break`, `continue` and `return` out of place, `test`'s integer errors, `~+`, `set -o`'s layout (T305) | The adapter: `rewriteBashBuiltin` and `markOutOfPlace`. `break` and `continue` in a function called outside a loop, and these words in `eval` or `source` text, stay just-bash's, as only the line's own tree is seen |

| G25 | Limits bash doesn't have: `maxBraceExpansionResults` and fixed caps of 10,000 a range and 100,000 in all cut a list in silence; awk's and sed's iterations, awk's records, jq's iterations and elements stop a line in just-bash's words, any of which used to close the window (T314, T315) | Raised (`UNREACHED` in the adapter); the adapter expands a long brace list itself up to FR-069's 1 MB, and past that stops with FR-069's text. A limit's words never show. Upstream report: the silent cut |
| G26 | jq's generators are eager: `[limit(3;repeat(1))]` and `first(range(10;infinite))` run out of room, and `def f: f; f` overflows the stack as a "parse error" (T315) | Stopped with FR-069's time text. Cannot be fixed around it, where jq prints `[1,1,1]` and `10`. Upstream report |
| G27 | `exec < file; read l` reads nothing, as `exec` keeps no standard input (T323). `$((…))` is a double, so a variable past 2^53 is off (`x=9007199254740993; echo $((x+1))`) | A `$((…))` of numbers alone is worked in 64 bits by the adapter. Neither of these can be fixed around it. Upstream report |
| G28 | awk's language, where a wrapper can't reach it (T319): `BEGIN { getline }` reads nothing; `printf`'s `0` and `+` flags and two-digit exponents; `"10"<"9"` compares as numbers; `a["x"]` doesn't create the element; `CONVFMT`; `+inf`, `-inf` and `+nan`; `print > "/dev/stderr"`; `print | "sort"` | Upstream report, and open for the owner under FR-068 (T319). `-v`, `NAME=value` operands, bare `length`, `int`, `RS` as one character or paragraphs (a record's inner newlines read as spaces), and GNU's words and statuses are done in `gnu.ts` |
| G29 | sed, where a wrapper can't reach it (T320): `H`'s first line break, `s/./&&/2g`, `\U`, `\u`, `\L`, `\l` and `\E`, and a bad script's words beyond an unterminated `s` or `y`. `sed` and `awk` alone give their usage's first lines only | Upstream report, and open for the owner under FR-068 (T320). `T`, `a\text`, `i\text`, `c\text`, `q5`, `Q5`, `--in-place=` and `can't read` are done in `gnu.ts` |
| G30 | `grep` has no back references, lookaround or `-H`, and no name for standard input (T318) | `jsGrep` in `gnu.ts`, on JavaScript's regular expressions; not with `-r`, where a back reference still says it's invalid. Upstream report |
| G31 | A negated pattern, `!(x)`: its glob becomes a regular expression with a lookahead, which just-bash's RE2 refuses. It matches nothing in a word, leaves a `case` or `${x/…}` unmatched, and in `[[ ]]` prints RE2's error. At a word's start the parser also takes `!` as the operator (T344) | The Terminal says `bash: !(x): negated patterns aren't supported`, status 1, and runs nothing of the line. `@`, `+`, `?` and `*` patterns work. FR-067 doesn't allow this: the owner decides. Upstream report |
| G32 | `type`, `command -v` and `command -V` name as builtins and keywords what doesn't run: `trap`, `alias`, `unalias`, `kill`, `jobs`, `fg`, `bg`, `disown`, `times`, `enable`, `caller`, `suspend`, `umask`, `ulimit`, `fc`, `select`, `coproc` (T336) | Each word is looked at once expanded, and these aren't found (`NAMED_NOT_RUN`). Upstream report |
| G33 | `export d` sets an unset `d` to the empty string; `$BASH_SUBSHELL` and `$SHLVL` are empty; `declare -i` reads a bad expression as 0; `failglob`'s error doesn't stop the line; `find -exec` passes on its command's status and takes `{}` only as a whole word; `grep -c` doesn't stop at `-m`, and `-m0` prints every match; `sort -u` with `-n` or `-f` compares the whole line; `diff` of a file with itself under `-s` says nothing (T333 to T345) | The adapter and `gnu.ts`. `$BASH_SUBSHELL` counts the subshells the text is written in, so a function called from a subshell reads as where it's defined. A `declare -i i` with no value isn't carried to a later line, as just-bash's `declare -p` doesn't list it. Upstream report |
| G34 | A redirect counts a command's output twice over when it holds bytes and its stderr isn't empty: `{ stdout: bytes, stderr, exitCode }` with a multi-byte letter and any redirect says `bash: redirection: invalid stdout accounting`, status 126, and drops the line (T347) | `fixed` in `site-commands.ts` hands such output on as text. Bytes that aren't valid UTF-8 lose those bytes there, only when the command also wrote to stderr. Report upstream (T129) |
| G35 | A `$(…)` in arithmetic or an array's subscript runs in a shell of its own, with none of the line's functions or variables, and only its first number counts: `f() { echo 3; }; echo $(( $(f) ))` (T348) | `hoistArithmetic` in `adapter.ts` runs it before the command, in the line's shell. Each costs 3 more of the 10,000 commands. Text only `eval` and `source` read isn't covered, nor a C-style `for`'s condition and step. Report upstream (T129) |
| G36 | `awk`'s `for (k in x)` finds an array by the name written there, so an array passed to a function lists nothing; `length(array)` is 0, `for (k in ARGV)` finds nothing, `close` gives no status, and `system`, `strftime` and `asort` aren't there (T358) | `awkBuiltins` in `gnu.ts` writes them in `awk`, a function for each array, and `length(ARGV)` as `ARGC`. `length` of a function's array parameter stays 0. Report upstream (T129) |

**Rationale**: FR-067 and FR-068 ask for bash's language and about thirty GNU commands with their
options and messages. That is far beyond what the Terminal's own parser could grow into (R7).
just-bash covers it, runs only in the page, and keeps everything the Terminal needs in its hands:
the file system, the commands, the limits, and no network. It is maintained by Vercel Labs, takes
outside fixes often (3.6.0 holds GNU-fidelity fixes such as `find`'s EACCES handling, #414), and is
Apache-2.0 (R40).

**Alternatives considered**:

- **Extending the Terminal's own parser and commands** (R7): bash's grammar, `sed`, `awk` and
  `jq` alone are each larger than the whole Terminal. Constitution X asks for the simpler
  option, and here that is a vetted interpreter, not a second one written for one app.
- **Real bash and BusyBox in WebAssembly** (v86 or container2wasm images, WebVM/CheerpX, Wasmer's
  bash): they run real programs, against FR-068, weigh several to tens of MB, and the hosted ones
  fetch packages from another site, against FR-022.
- **Other JavaScript shells**: ShellJS needs Node; the small browser "bash emulators" offer a
  handful of commands and no language, which is what the owner's review rejected.
- **Running the shell on a server**: a request to another site and no offline use (FR-022,
  FR-036).

## R26. Where the shell runs: a worker

**Decision**: the shell runs in a **module worker**, `apps/terminal/shell/worker.ts`, created by
the Terminal's interface on first open (R34). The interface and the worker talk through one small
message protocol ([contracts/shell-worker.md](./contracts/shell-worker.md)). The worker holds the
interpreter, the file system and the site's commands. The interface holds the session (R5), the
output, the vim view and every key.

- **Stopping** (FR-069, FR-075): just-bash checks its time limit between commands, so a line such
  as `while true; do :; done` ends at the limit. But it never yields its thread meanwhile: an
  interval timer set beside it didn't fire once during a 1 s run, and an `AbortSignal` aborted
  after 300 ms took effect only at the 1 s limit. In a worker that only blocks the worker. The
  interface keeps answering, and it stops a line that must end now (Ctrl+C, or a worker past the
  limit by more than 1 s) by **terminating the worker** and starting a new one from the last
  snapshot (below).
- **Snapshots**: after every line the worker returns the shell's state (R27) and, when they
  changed, the visitor's files (R28, at most 1 MB). The interface keeps both in the session. A
  new worker starts from them. So a stopped line leaves the state as it was before that line,
  where bash would keep what the line had done before it was stopped. The spec asks only that the
  line stops and says so (FR-069), and this is the honest limit of stopping a thread.
- **Lifetime**: one worker per visit, outside React, so minimizing, going home and a shell switch
  keep it (FR-021). Closing the Terminal sends `reset`, which clears the file system and the
  state, and keeps the loaded code, so a second open needs no load (FR-070's "first opens").

**Rationale**: FR-069 asks that the page keep responding while a line runs, and a JavaScript
interpreter on the page's own thread can't, as measured. A worker is the browser's way to run
code that may not yield. It also makes the shell's code a separate file by construction (R34),
and leaves it no DOM to reach (R39).

**Alternatives considered**: the main thread with the limits alone (freezes the page for up to
5 s); `Atomics` with `SharedArrayBuffer` for a cancel flag (needs cross-origin isolation headers,
which the static host can't be relied on to send, and just-bash wouldn't read the flag between
statements anyway); a worker per line (loses the file system between lines, and costs a start per
command against SC-002).

## R27. Carrying the shell's state from line to line

**Decision**: `apps/terminal/shell/adapter.ts`, the **shell adapter**, runs each line as one
`exec` with a **prelude** before it and a **checkpoint** after it, and keeps the state between lines
itself, since just-bash resets it after each `exec` (G4). Each part is parsed alone and they are
joined as trees by a transform plugin; `exec`'s own text is a placeholder. So the line's text can't
run into the adapter's (T290: `echo a \` prints `a \`), and each statement keeps its line number:

1. **Syntax first.** The line alone goes through just-bash's parser (R25: a second `Bash`'s
   `transform`). A parse error is worded as bash words it, with status 2, and nothing runs: a line
   that isn't finished says `line 1: syntax error: unexpected end of file` (`for i in 1`, `f() {`,
   `(`, `true &&`, `if true; then`), and just-bash's own words (`Expected DO, got EOF`,
   `Parse error at 1:3`) don't show, in `eval` too, which then gives status 2 (T293). A pipeline with
   an empty side (`ls |`, `| jq`) is a syntax error too, worded as bash words it
   (`syntax error near unexpected token '|'`) (FR-057, G2). An unterminated here-document warns as
   bash does and runs with no input. The interface shows syntax errors without bash's `bash: ` prefix
   and line number, as the approved design sets (R30).
2. **Prelude**: the variables and `$1`, `$2`… go with `exec`'s `env`, outside the script, as the
   parser takes at most 1,000,000 bytes and a variable may be bigger (T283). `OLDPWD` goes the same
   way, and `exec` hands it to `cd -`. In the script, before the visitor's functions so that none of
   them runs in it (T290): `unset` for what the visitor unset, `export` for those exported, the
   `declare -p` line of each array and each variable with an attribute (readonly, integer, lower or
   upper case, nameref), `shopt`, and `set -o` for `errexit`, `nounset`, `pipefail`, `noglob`,
   `noclobber`, `xtrace` and `allexport`. Then the functions (below), and `(exit N) && __cv_ok` so
   `$?` is the last line's status. The working folder is passed as `exec`'s `cwd`. `PWD`, `LINENO`,
   `SHELLOPTS` and the like are left to the shell. `HOME=/home/guest`, `USER=guest`, `LOGNAME=guest`
   and `SHELL=/bin/bash` are only the first values (G9): the visitor can change or unset them, and
   the prompt's `~` still means `/home/guest` (FR-045, FR-046).
3. **The line**, as typed, in one group, so an arithmetic error drops the rest of the line as bash
   does (T293) and the checkpoint still runs. A group reports `set -u`'s error and a bad substitution
   by their messages alone, and the adapter gives them back their `bash: `.
4. **Checkpoint**, after the line: `__cv_begin "$?"` takes the status, the working folder and the
   variables; `{ builtin declare -F; builtin declare -p; } | __cv_read "$SHELLOPTS" "$BASHOPTS"` the
   functions, attributes and settings; `__cv_end && __cv_ok` puts `$?` back. A value of 64 KB or more
   stays out of `declare -p`, whose output counts towards the line's, so it can't stop a line it
   didn't print (a variable that long keeps its value and loses any attribute). An array too big to
   list stops its line at the output limit, and one whose `declare -p` line passes the parser's
   1,000,000 bytes would have to be left out of the prelude. Every adapter command runs by path
   (`/usr/bin/__cv_begin`), so the visitor's `PATH` can't hide it (T286), and `echo`, `printf`, `pwd`,
   `true`, `false`, `test` and `[`, which just-bash runs as commands and bash as builtins, go by path
   too once the line or the state touches `PATH`.
5. **Functions**: just-bash can't print a function's body (G10). So the adapter takes bodies from
   the parser: each definition in a line is serialized (R25) and reports itself when it runs, so the
   one that ran wins over a later one in the text that didn't (T289). `eval` and `source` are
   rewritten to hand their text to `__cv_saw` first, with their words expanded once, into a hidden
   array, and `$?` kept for the text. After the line, only the names `declare -F` listed are kept, so
   `unset -f` is honored. Known limits: a name reached by expansion (`e=eval; $e "f() { :; }"`) isn't
   seen and its function isn't carried; inside the text of `eval` or `source`, the last definition
   counts whether or not it ran; and a visitor's function named `builtin` would run in the checkpoint,
   as bash has no way past it either.
6. **`exit`**: when the last checkpoint didn't run and no limit stopped the line, the shell exited.
   The interface then does what `exit` does (FR-008): closes the window on desktop, goes home on
   mobile. `set -e` and a failing command exit the shell the same way, as in an interactive bash.
   Lines that only fail keep the Terminal (T286): just-bash ends a line with `readonly`'s error and
   `${x:?word}` as it does with `exit`, so a line that might hit one has a checkpoint after each of
   its statements, the state up to the last one stays, and they are told from `exit` by the message,
   which for `${x:?word}` holds a mark the plugin adds and also gives bash's `bash: x: word`. The
   checkpoints are only on such lines, as one changes `$_` and PIPESTATUS for the next statement.
   Recursion runs into FR-069's limit on commands: `maxCallDepth` is 20,000, as bash has no depth
   limit a line would meet here first (`:(){ :|:& };:` stops with the site's text).
7. **Line numbers**: the line is parsed alone, so `$LINENO` and a runtime message that names a line
   are the visitor's, in a function too.
8. **`cd`** is finished by the adapter (T287), as just-bash's looks at every folder on the way, keeps
   `cd -` apart from `OLDPWD`, and ignores extra operands. `__cv_cd` decides as bash does (too many
   arguments, `OLDPWD not set`, `HOME not set`, `..` from a folder that has gone), and the builtin
   moves. A dynamic name (`c=cd; $c a b`) goes to just-bash's own. `<builtin> --help` as a literal word
   prints `help <builtin>`'s text with bash's status 2 (T294).

Measured: variables with quotes, exported variables, arrays, `$?`, `set -o pipefail`, the working
folder and a function with `local`, `if` and a pipe all carry to the next line, and `unset -f`
removes one. The prelude and checkpoint are counted on top of FR-069's 10,000.

The state is data, `ShellState` ([data-model.md](./data-model.md#shell-state-fr-067)), held in
the session (R5). Closing the Terminal empties it (FR-021).

**Alternatives considered**: one endless `exec` reading lines from a custom command (the time and
command limits are per `exec`, so FR-069's per-line limits would have to be rebuilt by hand, and
a stopped worker would lose everything); reading just-bash's private state (`bash.state`, not a
public interface, and it changes between versions); asking upstream for persistent sessions
(worth proposing, and the adapter is the fallback until then).

**Hidden names** (T299): every command and variable of the adapter's holds `MARK`, random per worker,
so a typed word or an expansion can't name one, and `__cv_x` is any other word. `__CV_PIPED` goes only
on commands that read it. A name from an expansion runs beside the adapter's variables, so `x=set; $x`
has their lines taken out of its output in `plainText`; `x=set; $x | wc -l` counts them.
`directoryStack` is set on `bash.state` before each run, the one private field read, as no command sets
it whole; just-bash is pinned exactly (T305).

## R28. The file system: protected files and the visitor's own

**Decision**: `apps/terminal/shell/fs.ts`, **TerminalFs**, an `IFileSystem` over just-bash's
`InMemoryFs`:

- **Layout** (FR-045): `/home/guest` is home. The root holds `home` and `tmp`, and what the shell
  needs to run: `bin` and `usr/bin` (the command stubs that `which` and `/bin/ls` use) and `dev`
  (`null` and the standard streams). The `proc` folder just-bash would add is dropped.
- **Protected** (FR-049): the tree of R9, built from the CV and the spec list, is written into
  `/home/guest` as files whose text is each node's block as text (R29), so `cat`, `grep`, `wc`
  and the rest read what the named commands show (FR-047). Every one of those paths, the root,
  `/home`, `/bin`, `/usr` and `/dev` (other than writing to `/dev/null`), is in a protected set.
  Every writing operation (`writeFile`, `appendFile`, `mkdir`, `rm`, `cp` and `mv` onto or out of
  it, `chmod`, `symlink`, `link`, `utimes`) checks the path and its parent and rejects with
  `Permission denied`, the text just-bash's commands print after the path. `/home/guest` itself
  isn't protected, so the visitor can write beside the built files (FR-073).
- **`rm -r`** (FR-049): just-bash's `rm` removes a folder in one call. A wrapper of `rm` (R29)
  walks a recursive target itself, deepest first, so `rm -rf ~` removes the visitor's files, says
  `rm: cannot remove '…': Permission denied` once per protected path, and leaves every protected
  file and folder as it was.
- **Names without regard to capitals** (FR-045): when a part of a path doesn't exist as typed,
  the file system looks for a protected name in that folder that matches it without regard to
  capitals. So `cat ABOUT` reads `about`, and `touch About` names the protected `about` and gets
  "Permission denied" (edge cases). The visitor's own names are case-sensitive, as on Linux.
- **The visitor's files** (FR-073): anywhere outside the protected set. Their bytes, with `/tmp`'s,
  are counted. A write that would pass **1 MB** (1,048,576 bytes) rejects with
  `No space left on device` and leaves what was there. A write into a folder that doesn't exist
  rejects with `No such file or directory` (G6).
- **`ls -l`** (FR-049): protected files report mode `0444` and folders `0555`, so `ls -l` shows
  them read only. The `ls` wrapper replaces the owner and group columns of protected entries
  with `root root`, and the visitor's with `guest guest`, as the approved design sets (G7). When
  `ls -l`'s output reaches the screen unchanged, folder names keep their trailing slash and are
  controls, as in `ls` (design); piped, it is GNU's text.
- **The home folder's order** (FR-043, FR-073): `readdir` of `/home/guest` returns the built names
  in the design's order, then the visitor's in name order. GNU `ls` sorts names itself, so when
  `ls`'s output reaches the screen unchanged, the interface shows the design's order (R29, R30),
  and piped output stays GNU's order (R38).
- **Until G1 is fixed upstream** (rebuilt 2026-10-30, T282): just-bash reports a refused open only
  for a redirect to a descriptor above 2. So a transform plugin puts before each output redirect
  one more, `99>> <target>`, with the target's word and a marker character at its end. The word
  expands as the command runs, so a target from a variable, after a `cd`, in a loop or in a function
  is checked like a literal one, in the redirects' order. TerminalFs sees the marker, answers for
  that target and creates nothing, and the adapter words the refusal as bash does:
  `bash: <target>: Permission denied`, or `No such file or directory`, or `Not a directory`. A folder
  is left to just-bash, which says `Is a directory`. Only that command fails, with status 1.
  A write past 1 MB is known only after the command, so the plugin wraps the command as
  `{ command; __cv_wrote $?; }`. TerminalFs takes a redirect's write past the limit without
  throwing, and `__cv_wrote` prints `bash: <target>: No space left on device` and returns 1, or
  returns the command's status. As on a full disk, the target is left empty or as `>>` found it.
  What stays until the fix: (1) a word with effects (`$(…)`, `$((…))`, `${x:=y}`) isn't expanded a
  second time, so isn't checked first; its refusal is still named and fails its command, and the
  file system words it; (2) `eval`, `source` and `bash -c` parse at run time, past the plugin, so a
  refused redirect in them ends the line with its error, loses what the line printed, and keeps the
  state and files (FR-021); (3) a command reading the refusal through a pipe,
  `(echo x > about) 2>&1 | grep x`, sees just-bash's `cannot open redirect target`, and one reading
  `type f` through a pipe sees `__cv_wrote`, as the wording is corrected where output reaches the
  screen or a file; (4) `__cv_wrote` counts as a command, so a command with an output redirect counts
  as three of FR-069's 10,000 (measured), and in the same way (T287, T289) a `cd` counts as ten and an
  `eval` or `source` as twelve, so a loop of them stops sooner than in the 10,000 commands the spec
  names. The plugin, the marker and `__cv_wrote` are deleted once the fix is
  released.
- **`rm -r /`** is refused as GNU's `rm` refuses it by default (`--preserve-root`), and a folder
  the visitor can empty but not remove (`rm -rf /tmp`, as `/` is protected) says
  `rm: cannot remove '/tmp': Permission denied` once. The command stubs of the adapter's own
  commands (`__cv_help`, `__cv_wrote`, `__cv_begin` and the rest) aren't listed in `/bin` or `/usr/bin`.
- **Reset** (FR-021): `reset` rebuilds TerminalFs from the CV and the spec list. `restore(files)`
  rebuilds it with the visitor's files from a snapshot (R26).

**Alternatives considered**: just-bash's `MountableFs` with the CV mounted read-only (its
read-only file systems answer with `EROFS`, "Read-only file system", not the "Permission denied"
FR-049 sets, and the home folder must hold both kinds of file side by side); permissions through
`chmod` modes alone (the default file system ignores modes when writing).

## R29. The site's commands as commands of the shell

**Decision**: every command of FR-008 is a just-bash custom command, built from the `COMMANDS`
table (R7's table, kept), in `apps/terminal/shell/site-commands.ts`. Custom commands win over
standard commands of the same name, so `whoami`, `history` and `clear` are the site's (FR-068).
just-bash's `help` builtin wins over a custom command, so the adapter's transform plugin renames
a typed `help` to `__cv_help` (`RENAMED` in `site-commands.ts`), which is the site's `help`.

- **Text out**: each command prints its block (R3) as text, through one function,
  `blockText(block)`: the visible text of every node, line by line, in reading order, with list
  items marked `- ` and links shown by their text (and their address, where `/cv` shows it). So
  `work | grep -i engineer` filters the lines a visitor sees (FR-057, US1 scenario 19). The
  protected files hold the same text (R28).
- **Rich out, when nothing changed it**: each command also **records** its block with the exact
  text it printed, in the run's list of recorded outputs. After the line, the interface looks for
  each recorded text in the line's stdout, in order. Where one appears whole, that part is drawn
  as its block, with headings, links and controls (FR-009, FR-015, FR-029). Where a pipe or a
  redirect changed it, the text is drawn as text. This is how a real command prints color and
  columns to a terminal and plain lines to a pipe. A
  recording carries no text of its own beyond what the command printed, so a visitor can't make
  one: typed or piped text never becomes a link or a control (FR-018).
- **Piped commands record nothing** (built 2026-10-29): the adapter's transform plugin adds
  `__CV_PIPED=1` to every command whose output goes into a pipe or a `$(…)`, and a site command
  or wrapper that sees it prints its text and records no block. Without it, a block piped through
  a command that passes it on unchanged (`work | cat`) would be found whole in the output and
  drawn rich. The mark is decided where the line is parsed, so a function defined elsewhere and
  called in a pipe records its blocks, and the output match above then draws them only where
  they appear whole: a known limit.
- **Wrappers** of built-ins, through `ctx.origCommand`: `cat` records the block of each protected
  file it prints whole (FR-047); `ls` records a listing with controls for the names it printed
  (FR-050), fixes the owner columns (R28) and, for the home folder, the order; `rm` walks
  recursive targets (R28); `jq` records a `json` block of what it printed (R31).
- **Effects**: `clear`, `vim`, `open` and the site commands that act on the interface return an
  **effect** with the run's result, applied by the interface after the line, in order: clear the
  output, open the vim view (R12), open an app (FR-014). `cv` runs
  `cat cv.json | jq | vim -` through `ctx.exec` from the home folder (FR-059). `history` prints the
  session's history, sent with each line (FR-020), and takes `history N` and `history -c`.
- **Usage errors** (FR-017): a site command's wrong argument prints its usage reply on stderr with
  status 2. A standard command's wrong option prints GNU's error, as just-bash gives it.
- **A command that reads no input** ignores what is piped into it, as just-bash does for any
  command (FR-057): `ls | work` runs `work`.

**Alternatives considered**: telling a command whether its output is a terminal through that
assignment alone, as `isatty` does, with no output match (it is decided where the line is parsed,
so a function defined in one place and called in a pipe elsewhere gets it wrong; the build uses it
only to keep piped commands from recording, above); escape
sequences in the output, as OSC 8 links are (a visitor could print them with `printf`, against
FR-018).

## R30. From the shell's output to the screen

**Decision**: a pure function, `engine/output-map.ts`, turns a run's result (stdout, stderr,
status, recorded outputs, effects, whether it was stopped) into the run's block. It is unit-tested
in Node.

- **stdout** is split around recorded outputs (R29). The rest is text, split into lines, shown as
  typed: never markup, never a link (FR-018).
- **stderr** follows stdout (G3), as text in the error tone. Some lines are bash's and get a reply
  in site text added after them:
  - `bash: {word}: command not found` becomes FR-016's reply, starting with the typed word as the
    approved design sets: `{word}: command not found. Run help to see them all, or try:` and the
    suggestions as controls (R8). Suggestions search FR-008's commands and aliases only, so `sudo`
    gets only `help`, as the spec's edge case says. The standard commands are what a bash user
    already knows, and `sudo` is 2 edits from `sed`.
  - A syntax error (R27) is shown without `bash: `, as the design sets.
  - `bash: cd: {path}: Not a directory` gets FR-048's `cat` control. `cat: {path}: Is a directory`
    gets its `ls` control.
  - A limit's message (R33) is replaced by FR-069's site text, after what the line printed before
    it stopped (design).
- **Announcements** (FR-028, R13): a block made only of recorded outputs is counted as before
  (`work: 4 entries`). Text is counted in rows at the desktop width, as R13 sets, and summarized as
  `{command}: {n} lines`, where `{command}` is the line's first command word.
- **The prompt** shows the working folder the run returned, as `~`, `~/work` or `/tmp`
  (FR-046).

## R31. `jq` with filters, and its colors

**Decision**: `jq` is just-bash's, with jq's filter language: `jq '.work[0].name' cv.json` and
`jq '.skills[].name' cv.json` print what jq prints, and a filter that doesn't parse, or input that
isn't JSON, gives jq's own error (FR-056). The wrapper records what `jq` printed as a `json` block,
lexed by R11's lexer. So when jq's output reaches the screen unchanged, as in `cat cv.json | jq`,
it is drawn indented with the token colors, and piped on, it is plain text, as jq itself colors a
terminal and not a pipe. With no filter or `.`, jq prints 2-space indents with keys in order,
which is FR-056's pretty print. Measured, and kept as a test: `cat cv.json | jq` prints exactly
`cv.json`'s text (FR-040, FR-055).

**Alternatives considered**: keeping the Terminal's own `jq` (no filters, FR-056 now requires
them); a second jq package (just-bash's is already loaded).

## R32. Which standard commands, and `help`

**Decision**: just-bash registers only the commands in **`STANDARD_COMMANDS`**
(`shell/standard.ts`), passed as its `commands` option, plus the site's. The list is the commands
FR-068 names, `yes`, which the spec's edge cases name, and the four FR-008 commands just-bash
implements and the site's table already lists (`ls`, `cat`, `pwd`, `jq`):

`awk basename cp cut date diff dirname echo env false find grep head mkdir mv printf rm sed seq
sort tail tee touch tr tree true uniq wc which xargs yes`, and `cat jq ls pwd`

That is the group the approved design lists ("every command of FR-068, alphabetical"). Every
other command just-bash has is left out, for one of these reasons, which a test names per command:
the network (`curl`, `html-to-markdown`, FR-022); another language (`python3`, `python`,
`js-exec`, `node`, `sqlite3`, FR-068); running scripts (`bash`, `sh`, out of scope); permissions
and links (`chmod`, `ln`, `readlink`, out of scope, and a link would be a way around R28's checks);
Node's `zlib` (`gzip`, `gunzip`, `zcat`, `tar`, R34); aliases, which can't be carried between lines
(`alias`, `unalias`, R27); the site's own (`help`, `history`, `clear`, `whoami`); and the rest
(`rmdir`, `sleep`, `stat`, `nl`, `tac`, `rev`, `md5sum` and about 25 more), because each listed
command is a promise that it behaves as its GNU version does, which SC-014 must prove. A later
change can add any of them with its parity lines.

The shell's builtins (`cd`, `export`, `unset`, `set`, `read`, `test` and `[`, `type`, `declare`,
`local`, `eval`, `source`, `exit`, `return`, `shift`, `break`, `continue`, `true`, `false` and the
rest) are listed in **`SHELL_BUILTINS`**, which a test checks against `type <name>` answering "is
a shell builtin", since `compgen -b` prints nothing (G10).

`help` (FR-008) lists the site's commands and aliases as before, then the design's group,
"Standard commands", with every name of `STANDARD_COMMANDS` the site's table doesn't already list
and every name of `SHELL_BUILTINS` the table doesn't (so not `cd`, `exit` or `history`), in name
order, each a control that runs `help <name>` (FR-015). The design left whether builtins are
listed to the plan (review.md, decision 5). They are, because FR-008 allows no command `help`
doesn't list, and in bash a builtin is a command (`type export`). `help <name>` shows a site
command's own help, runs `<name> --help` for a standard command, and for a builtin runs
just-bash's own help through `ctx.exec('builtin help <name>')`, since the site's `help` runs
under another name (R29). A test
runs every registered name and every listed name and checks the two sets are equal, so no
command exists that `help` doesn't list.

## R33. Limits and stopping

**Decision**: just-bash's limits, set to FR-069's: `maxExecutionTimeMs: 5000`, `maxCommandCount:
10000` (plus the prelude's own lines, built) and `maxOutputSize: 1048576` (4 MB as built, below),
and `maxLoopIterations: 1000000000` so its own iteration limit
never stops a line first (G15), with the `normal` profile for the rest. Measured: `while true; do :;
done` ends at 10,000 commands in about 200 ms, and with a higher count at the 5 s deadline; `seq
1000000` ends at the output limit with status 126; `yes` prints exactly 1,048,576 bytes and ends
with status 0 (G13), which the adapter counts as the output limit. The adapter recognizes each
limit's message and status (124 for the deadline, 126 for the others) and the interface shows
FR-069's site text in their place, after what the line printed before it stopped: `stopped: it ran
for 5 seconds, the longest a command line runs here.`, or the design's line for 10,000 commands or 1
MB, then a new prompt. As a second guard, the interface terminates a worker that hasn't answered 1 s
after the deadline (R26).

**Built 2026-10-29**: just-bash's `maxOutputSize` applies to every command's output, a pipe's
inside included, so with 1 MB `seq 200000 | tail -1` stopped, though the line prints 7 bytes.
FR-069 limits what the line prints. So just-bash gets 4 MB (`LIMITS.pipe`), what any one command
may pass on, and the adapter stops a line whose own stdout and stderr reach 1,048,576 bytes
(`LIMITS.output`). `yes | head -1` then takes about 175 ms (650 ms with 16 MB). A line stopped by
the output limit shows none of what it printed, only the stopped line, as G14 already had for
`seq 1000000`: a megabyte of text would freeze the screen, against FR-069's second sentence.

**Ctrl+C** (FR-075): with no text selected, while a line runs, it terminates the worker as above
and shows `^C` after the line, then `stopped: you pressed Ctrl+C.` With no line running, it shows
the typed text with `^C` after it, as an entry that isn't added to the history, and a new prompt.
Lines waiting show `^C`, stay in the history and never run (T308).

**A stopped line's state** (T310): a check now runs between a line's statements, so a stop at the
shell's own limits keeps the variables, folder and functions as of the last statement that finished.
A check leaves `$?`, `$_` and PIPESTATUS as it found them. It isn't carried for what a single statement
did before it stopped (`x=1 && while :; do :; done`), or when the page ended the worker (Ctrl+C, the
6 s watchdog), which can't answer: those lines keep the state from before them, as
contracts/shell-worker.md says. Each statement of a line costs 8 commands more, added to the limit's
overhead, so the visitor's 10,000 are unchanged.

## R34. Loading the shell, and the build

**Decision**:

- **One worker file.** The interface creates the worker with
  `new Worker(new URL('./shell/worker.ts', import.meta.url), { type: 'module' })`. Vite emits it as
  `assets/shell-<hash>.js`, one file with no import of its own. The `os` entry stays one file with
  no import or dynamic import (005 R14). `build-site.ts`'s check changes from "one script" to
  "the `os` script and exactly one worker script, each one file", and fails otherwise. Module
  workers are in every browser 005 targets (Safari since 15, Firefox since 114).
- **`node:zlib`**: just-bash's browser build still imports it for `gzip` and `tar`, which the
  Terminal leaves out (R32). A Vite alias points it at `shell/no-zlib.ts`, whose functions throw,
  so the build prints no warning and ships no Node code.
- **When** (FR-070, SC-013): the worker starts when the Terminal first opens in a visit. The site
  root and `/cv` load none of it. The interface shows the starter chips, the prompt and the command
  line at once, with the design's loading line under the chips (`loading the shell · type away,
  commands run once it is ready`), announced once. Lines entered meanwhile wait after their
  prompts, in order, and run as soon as the worker answers `ready`; the loading line then goes.
- **Failure** (FR-070): a worker that fails to load, or doesn't answer `ready` within 10 s, turns
  the loading line into the design's error, `The shell couldn't load. Check the connection, then
  try again.`, with a `try again` control. Waiting lines stay and run once a try succeeds.
- **Cost**, measured on a build like the site's: the worker is 1.26 MB, 343 KB gzip, 274 KB
  Brotli, which 004's server sends. Started and running its first line: 241 ms in Chromium; 2.08 s
  with 4× CPU slowdown and Lighthouse's mobile network (1.6 Mb/s, 150 ms) with gzip. Both are
  within SC-013's 1 s and 3 s, with Brotli's smaller file to spare. **Verify** in
  `loading.test.ts` on the real build.
- **The `os` script** keeps the interface, the session, the output renderer and the vim view. The
  command implementations, the file system and the JSON lexer used by `jq` move into the worker,
  so the `os` script doesn't grow. SC-013's "within 5%" is checked by `build-site.ts` against a
  budget written next to the check: as built, the `os` script's size on `main` before the
  amendment plus 5%. T127 measured 108,962 bytes (gzip -9); merging 007's inspector from `main`
  (`a3f9532`) raised that base to 113,581, so `OS_BUDGET = 119_260`.
- **Warm-up**: the worker runs `true` once before it answers `ready`, so the first visitor line
  doesn't pay just-bash's first-run cost (about 100 ms in Node) (SC-002).

**Alternatives considered**: a dynamic `import()` on the main thread (the shell would block the
page, R26); loading the shell with the page in the background (loads it on `/` and `/cv`, against
FR-070 and SC-013); a CDN copy (a request to another site, FR-022).

## R35. A new version published while the shell isn't loaded yet

**Decision**: the service worker keeps the cache of the version a still-open page was loaded from,
until no such page is left. Today it deletes every older cache when a new version activates (005
R14). That was safe because the shell loaded every script up front. Now a page loaded under
version A may open the Terminal after B has activated, and ask for A's `shell-<hash>.js`, which
B's cache doesn't hold and the host no longer serves.

- On `activate`, the worker lists the window clients. If there are none, it deletes older caches
  as today. Otherwise it keeps them and records, in a small entry of its own cache
  (`/__cv/kept`), each older cache with the ids of every window open at activation.
- Its `fetch` handler answers an `/assets/` request from the current cache, then from a kept one.
- On later events (`fetch`, `message`, the next `activate`), it deletes a kept cache once none of
  its recorded clients is open.

Each cache stays one complete version (004 FR-039), nothing reloads or interrupts the visitor
(005 FR-053), and the Terminal loads after an update, online or not (FR-070). A test in
`packages/web/test/offline.test.ts` publishes a second build while a page is open, and opens the
Terminal afterwards, online and offline.

**Alternatives considered**: keeping every old shell file in the new cache (a cache would mix two
versions, against 004 FR-039); a stable file name for the worker (a page from A would run B's
worker, and the message protocol could differ); a "reload" control when the file is missing
(interrupts the visitor, against 005 FR-053).

## R36. The cursor, the box and the click

**Decision**:

- **No box** (FR-072): the command line has no border, outline, background or shadow, focused or
  not. 005's focus outline is turned off for it only. Every other control keeps it.
- **The cursor is the focus indicator** (FR-072): the mirror's block (R15) is **filled** in haze
  while the input has focus, the letter under it in `color.terminal-cursor-text`, and **hollow**, a
  2 px haze outline, when it doesn't: 7.4:1 against the worst-case glass, both (design). In forced
  colors the filled cursor is `Highlight` with a 1 px `Highlight` bottom edge and its letter
  `HighlightText`, and the hollow one a 2 px `Highlight` outline (FR-033). There it doesn't
  blink: an animation's colors are computed values, which forced colors paints over as `Canvas`,
  so a blinking cursor would vanish half the time; a steady `Highlight` block keeps it shown.
- **Blinking** (FR-032): a CSS animation on the filled cursor, `steps(1)` over
  `motion.duration.cursor-blink` (1000 ms: 500 ms on, 500 ms off, the off half showing no cursor,
  as the design sets). It runs from focus and each key press, and a timer of
  `motion.duration.cursor-idle` (5000 ms) after the last one removes it, leaving the cursor filled
  (WCAG 2.2.2). Under reduced motion there is no animation at all.
- **The selection** (FR-074): the mirror draws the input's selection, from `selectionStart`,
  `selectionEnd` and `selectionDirection`, with the cursor at the selection's moving end, in
  `color.terminal-selection` behind `color.terminal-selection-text` (lilac behind night, design).
  The same colors style `::selection` in the output. It updates on `selectionchange`. The input's
  own text and caret stay transparent, as before.
- **Click to focus** (FR-071): a `pointerup` (for a touch, its `click`, since a tap's
  compatibility `mousedown` moves focus after the `pointerup`) on `.terminal-screen` that isn't on or inside an
  `a`, a `button`, an `input` or the vim view, and after which the page's selection is collapsed
  or unchanged from the `pointerdown`, focuses the command line with `preventScroll` and no change
  to its text. A drag that selected text keeps its selection and moves no focus (FR-023). On
  touch, the tap focuses the line without `inputmode="none"`, so the keyboard opens, as tapping
  the line does.

**Alternatives considered**: `:focus-visible` with a subtle outline (FR-072 rules out any box);
the native caret (R15).

## R37. A terminal's keys in the command line

> **Extended by R44 (2026-10-30).** Tab completes with text before the cursor, and Escape then
> Tab leaves.

**Decision**: the input is a real text field, so the system's own line-editing keys work without
any code: Left and Right, Home and End, Cmd+Left and Cmd+Right and Option+Left and Option+Right on
macOS, Ctrl+Left and Ctrl+Right elsewhere, Shift with any of them, the delete keys with their
modifiers, and undo and redo. The Terminal adds only what a text field doesn't do:

| Key | Systems | Does | How |
|-----|---------|------|-----|
| Ctrl+A, Ctrl+E, Ctrl+B, Ctrl+F | macOS | Line start, line end, back and forward a character | Selection set on the input. Safari and Chrome already do this on macOS; the code makes Firefox match |
| Ctrl+K, Ctrl+U, Ctrl+W | macOS | Delete to the end, to the start, the word before | The range is selected, then `document.execCommand('delete')`, so undo still works. `setRangeText` where `execCommand` is missing |
| Ctrl+L | macOS | Clears the output, as `clear`, keeping the line | The `clear` effect, without a run |
| Cmd+A (macOS), Ctrl+A (others) | All | Selects the Terminal's text and nothing else (FR-075) | `Selection.selectAllChildren` on `.terminal-screen`, so the output, the prompt line and the mirror's text are selected. The cursor's block draws no text when it sits past the end, and controls copy their visible text, so the system's copy gives the text as shown |
| A printable key after that | All | Clears the selection and types the letter | The input keeps focus throughout. On the next `beforeinput` the page's selection is collapsed |
| Ctrl+C with nothing selected | All | Cancels the line or stops the run (R33) | With text selected, it is left to the browser |
| Up, Down | All | History (FR-020) | As before |

The platform is read from `navigator.userAgentData?.platform`, then `navigator.platform`. On
Windows and Linux, Ctrl+W, Ctrl+L, Ctrl+U, Ctrl+K and Ctrl+E are left to the browser, which uses
them (closing a tab, the address bar, page source, search), so those systems get the system's
editing keys instead (FR-026, 005 FR-029). Nothing with Alt+Shift (005's shortcuts), Cmd+L, Cmd+W,
Cmd+T, the screen readers' modifier keys or Tab is ever handled. A test sends every key above on
each platform and checks which are `defaultPrevented`, against a table of the keys browsers and
screen readers reserve (FR-026).

**Alternatives considered**: a terminal emulator component such as xterm.js (its own canvas or
DOM, weak with screen readers and phone keyboards, and its own look against FR-031); handling
every editing key in script (re-implements what the field already does, and breaks the system's
undo).

## R38. Parity with bash (SC-014)

**Decision**: `packages/web/test/terminal/shell/bash-parity.test.ts`, in Node, writes the
Terminal's file system for the real CV to a temporary folder (protected files as read-only files),
then runs a fixed list of at least 30 command lines both in the shell adapter and in real bash
with GNU tools, from that folder as `HOME`, and compares stdout, stderr and status. The list
covers every feature of FR-067 and every command FR-068 names, over the CV's files: such as
`grep -ril rest ~/work`, `ls | wc -l`, `cat about | tr a-z A-Z | head -3`,
`for f in ~/work/*; do wc -l < "$f"; done`, `sed -n 2p skills`, `awk '{print $1}' languages`,
`find ~ -name '*.json'`, `X=1; f() { echo $((X+1)); }; f`, and `diff about contact`.

Where the spec sets otherwise, a line is left out or compared with an expected difference written
beside it: names matched without regard to capitals (FR-045), and protected files' owner and mode
(FR-049). Non-interactive bash starts its own messages with `bash: line 1: `, and the Terminal's
shell with `bash: `; the test compares them with that prefix removed. The comparison is of the
shell's own output, before R30 maps it for the screen. Lines whose output depends on interleaving stdout and stderr aren't in the list (G3).
`ls` piped is compared as GNU prints it to a pipe, one name per line.

It runs in `npm test`, so in CI on `ubuntu-latest`, which has bash 5 and the GNU tools. The test
first checks `bash --version` and `grep --version` name GNU, and fails with a message naming the
tools to install when they don't (macOS: `brew install bash coreutils grep gnu-sed gawk findutils
diffutils`, then those first on `PATH`), so the result is the same locally and in CI (FR-042).

**Built 2026-10-29** (T158, T173): 42 lines. Two differ from the list above: `grep -ril rest
~/work` is piped to `sort`, as GNU grep lists files in directory order and the shell in name
order; and `tree` has no line, as it isn't a GNU tool and isn't in the install list, so bash
on a stock system has none to compare with. The bash side hasn't run yet: the machine the
amendment was built on has macOS bash 3.2 and no GNU tools, so the real differences are still to
be seen in CI or with the tools installed.

**Alternatives considered**: committed expected outputs (every CV edit would need a second edit
to them, against Constitution IV); only hand-written expectations (would test the test's author's
idea of GNU, not GNU).

## R39. What the shell can reach

**Decision** (FR-018, FR-022, FR-068):

- The worker has no DOM, no access to the page, and no storage the Terminal uses.
- Before importing just-bash, the worker's entry replaces `fetch`, `XMLHttpRequest`, `WebSocket`,
  `EventSource` and `importScripts` on its global object with functions that throw, so no code in
  it can make a request, whatever just-bash's own settings are.
- just-bash is created with no `network`, `fetch`, `python` or `javascript` option, and with the
  allow-list of R32.
- The worker sends back data only: text, recorded blocks built by the site's own commands, effects
  from a closed list, the state and the visitor's files. The interface renders it as R3 sets.
- The `other-sites` check records requests while the Terminal opens and every command line of its
  list runs, in both shells (FR-038).

## R40. Licenses of what the shell bundles

**Decision**: the worker file bundles just-bash (Apache-2.0), `diff` (BSD-3-Clause), `sprintf-js`
(BSD-3-Clause), `re2js` (MIT) and `ieee754` (BSD-3-Clause), the last two inlined by just-bash, and
`turndown` (MIT, pulled in by a command the Terminal leaves out, and kept
rather than stubbed: about 3 KB). Apache-2.0 asks that whoever receives the work gets a copy of
the license. The build writes `assets/shell-licenses-<hash>.txt` with each bundled package's name,
version and license text, from their `package.json` and `LICENSE` files, and the worker file
starts with a comment naming it. The text file is precached like every built file.
The approved design has no line naming the shell in the Terminal, so the license file and the
worker's comment are where it is credited.

## R41. Tests and checks for the amendment

**Decision**:

- **Node tests** in `packages/web/test/terminal/shell/`: `adapter.test.ts` (R27: state carried,
  syntax errors, the empty pipe side, `exit`, line numbers), `fs.test.ts` (R28: every writing
  operation on every kind of protected path, `rm -rf ~`, capitals, the 1 MB limit, a missing
  parent, reset and restore), `site-commands.test.ts` (R29: every FR-008 command's text equals
  `blockText` of its block, recordings, effects, usage errors), `standard.test.ts` (R32: the
  registered set equals `help`'s, `--help` on each, the left-out names are "command not found"),
  `limits.test.ts` (R33), `jq.test.ts` (R31) and `bash-parity.test.ts` (R38). `output-map.test.ts`
  sits with the engine's tests (R30). The engine's boundaries test also covers `shell/`: it
  imports no React, no DOM types and no component.
- **Browser tests** in `packages/web/test/terminal/`: `loading.test.ts` (FR-070, SC-013),
  `cursor.test.ts` (FR-072, FR-032, SC-015), `focus-click.test.ts` (FR-071), `line-keys.test.ts`
  (FR-074), `select-all.test.ts` (FR-075), `stop.test.ts` (FR-069, FR-075) and `shell.test.ts`
  (FR-067, FR-073 in the real build). Existing tests whose expectations the amendment changes
  (`files.test.ts` on `rm`, `commands.test.ts` on `jq .work`, `parse.test.ts`, `motion.test.ts` on
  the blink) are rewritten, not left to fail.
- **The site check** (FR-039, FR-040, contracts/cli.md): new states `terminal-unfocused`,
  `terminal-loading`, `terminal-load-failed`, `terminal-stopped`, `terminal-selected-all` and
  `terminal-help-standard`, and `pocket-stopped`. The `terminal` part runs FR-040's added lines in
  each shell. The `keyboard` part adds FR-039's new steps: the cursor filled and hollow, line
  start and end and by word with the check's platform keys (Linux in CI: Home, End,
  Ctrl+Left, Ctrl+Right), a word deleted (Ctrl+Backspace), select all (Ctrl+A) holding the
  Terminal's text and nothing else, and Ctrl+C on a typed line. The macOS keys are covered by
  `line-keys.test.ts` with the platform set to macOS, and by hand (R24).

## R42. The amendment's design, and what this plan takes from it

**Decision**: the amendment's design is approved (design/review.md, "2026-10-29 amendment", signed
by the owner on 2026-10-29), so Constitution II's gate is open for the amendment's UI tasks. The
review also removed the greeting (FR-005) and made the standard commands' names in `help` run
`help <name>` (FR-008, FR-015), which the spec now says. This plan follows the design on:

- **Tokens** (design README, "The cursor and the selection"): `color.terminal-cursor-text`,
  `color.terminal-selection` and `color.terminal-selection-text`, referring to existing base
  colors, go into the hand-written export, and `motion.duration.cursor-blink` (1000ms) and
  `motion.duration.cursor-idle` (5000ms) into the motion token source (R36). The cursor token is
  haze at full strength, not 90%.
- **The opening**: the starter chips, then the prompt, with no greeting text (FR-005). Tasks
  T121 to T126 already cover it.
- **Replies**: "command not found" and syntax errors start with the typed word or the error, with
  no `bash: ` prefix (decision 3, R30); the loading, failure and "stopped" lines in the design's
  words (R33, R34); jq's own errors (R31); `ls -l` owned by `root` and `guest` (decision 7, R28).
- **`help`'s standard group**: FR-068's commands in name order, and the builtins, which the design
  left to the plan (decision 5, R32).
- **Phones**: Ctrl+C and Cmd+A need a hardware keyboard on a phone, as the design notes (decision
  9). The spec sets no phone-only way, and the plan adds none.

# Amendment, 2026-10-30: Tab completion, and editing in vim

R43 to R52 decide how the 2026-10-30 amendment (spec Clarifications, Session 2026-10-30 (owner
review of the shell); FR-026, FR-039, FR-058, FR-060, FR-064 to FR-066, FR-076 to FR-081, SC-016,
SC-017) is built, on the code as it stands at `852ba9c`. The bash measurements below were taken on
2026-10-30 with GNU bash 5.3.20 and its own readline, started as `bash --norc --noprofile -i` with
`INPUTRC=/dev/null`, so no completion script and no user setting was loaded, over a copy of the
Terminal's home folder. just-bash's were taken with 3.6.0 in Node 26. The scripts are kept outside
the repository, as for R25.

## R43. Where Tab's completions come from

`select` and `coproc` aren't among a command's first words: just-bash's parser refuses both, so
`type` doesn't name them and Tab doesn't offer them (T336, research G32).

**Decision**: a pure completer, `apps/terminal/shell/complete.ts`, in the worker beside the file
system it reads. Given the line, the cursor and the shell's state, it returns what bash's readline
would insert and the full list of matches. It doesn't use just-bash's `compgen`, which can't give
what readline gives:

| # | Gap in just-bash 3.6.0 | Handled by |
|---|------------------------|------------|
| G21 | `compgen -c` prints nothing: no command, custom or registered, is ever a match | The completer lists commands itself, from the tables the shell is built from (below) |
| G22 | `compgen -f ~/` prints `/home/guest/about`, expanding the tilde; `compgen -o default -f c` prints each match twice; `compgen -f /` lists `/proc`, which TerminalFs drops (R28) | The completer reads TerminalFs directly, and keeps the word as typed |

And `compgen` is in any case only the match list: the common part, the quoting, the space or slash
after one match, and the second Tab's list are readline's, not `compgen`'s.

What bash 5's readline does with no completion scripts, measured (the rules the completer follows):

| Typed, then Tab | Bash gives | Rule |
|-----------------|------------|------|
| `cat cv` | `cat cv.json ` | One file: completed, then a space |
| `cd wo`, `cat ~/sk`, `./w` | `cd work/`, `cat ~/skills `, `./work/` | A folder gets `/` and no space. `~/` stays as typed |
| `cat "cv` | `cat "cv.json" ` | Inside a quote: one match closes the quote, then a space |
| `cat my` (a file `my file`) | `cat my\ file ` | Outside quotes, a space and the other characters bash quotes get a backslash |
| `echo hi > ab` | `echo hi > about ` | After a redirect: a path |
| `ab`, `gr`, `hist`, `ls \| wc` | `about `, `grep `, `history `, `ls \| wc ` | A command's first word, also after `\|`, `;`, `&&`, `\|\|`, `(` and keywords such as `then` and `do`: commands, aliases, builtins, keywords, the visitor's functions and **folders** of the working folder |
| `wo`, from the home folder | `work`, no space; a second Tab lists `work` | The `work` command and the `work/` folder both match; readline adds nothing past the shared `work`, and lists the one name left once the two are merged. From any folder without `work/`, `work ` (spec Clarifications, the owner chose bash's behavior 2026-10-30) |
| `c`, `ca`, `i` | nothing; a second Tab lists `caller case cat`, `if in` | Keywords and builtins match too |
| `cat c` | nothing; a second Tab lists `contact  cv.json` | The list holds the names only, not the folder part typed before them |
| `xyz` | nothing, and nothing on a second Tab | No match changes nothing |
| `ls h100/f` (100 files) | a second Tab asks `Display all 100 possibilities? (y or n)` | Readline asks at 100 or more (`completion-query-items`); 99 are listed at once. FR-076 now says 100 or more (spec Clarifications) |

The completer's sources, all in the worker already:

- **Commands**: the names of `COMMANDS` and its aliases (R7), `STANDARD_COMMANDS` (R32),
  `SHELL_BUILTINS` (R32), bash's reserved words that just-bash parses (`if then else elif fi case
  esac for while until do done in function select time { } [[ ]] !`, listed as `SHELL_KEYWORDS` in
  `standard.ts`), and the functions in `ShellState` (R27). Never the adapter's own `__cv_*`
  commands. Aliases the visitor would define don't exist (`alias` is left out, R32), and FR-076
  names none.
- **Folders**: in a command's first word, the folders of the working folder, as readline offers
  them there (the `wo` row above).
- **Paths**: TerminalFs's `readdir` and `stat` from the working folder, `/` or `~`, matched with
  regard to capitals, as readline's default `completion-ignore-case off` does. FR-045's matching
  without regard to capitals is the file system's, for names typed whole; completion stays bash's.
- **Variables**: a word starting with `$` completes the names in `ShellState.variables` and the
  shell's own (`HOME`, `PWD`, `USER`…), as readline does.
- **Word boundaries**: readline's for bash, `rl_completer_word_break_characters` (space, tab,
  newline, `"`, `'`, `` ` ``, `@`, `$`, `>`, `<`, `=`, `;`, `|`, `&`, `{`, `(`), with an open quote
  starting the word after it, and a backslash escaping the next character.
- **Order**: names sorted as bash sorts them in the C locale (byte order), duplicates merged.

**Rationale**: the file system and the state are in the worker (R26, R28), so the completer reads
them where they are, with no copy kept in the page. A pure function over a small file system
interface is tested in Node and against bash (R45).

**Alternatives considered**: `compgen` in a hidden line (G21, G22, and no readline behavior); a
copy of the file tree in the page (a second source of the visitor's files, stale after every
line); a JavaScript readline library (none found that copies bash's completion and not a shell
of its own; Constitution X).

**As built (2026-10-30)**: `ca` lists `case cat`, not `caller case cat`: `caller` isn't in
`SHELL_BUILTINS`, and the parity test, which disables every other builtin, agrees. `$HO` adds
nothing when several variables match; one variable gets a space, or `/` when it holds a folder. A
word with `*`, `?` or `[...]` completes to nothing, and `~` alone gives `~/` (bash lists users).
Folders in the list use `font-weight-semibold`, the only heavier weight token.

## R44. Tab in the command line

**Decision**: `CommandLine.tsx` handles Tab only when FR-026 lets it:

- **Tab with no modifier**, with text other than spaces before the cursor, and Escape not pressed
  since the last key: `preventDefault`, then a `complete` message to the worker
  ([contracts/shell-worker.md](./contracts/shell-worker.md)) with the line, the cursor and the
  state. Otherwise Tab isn't handled, and focus moves on, as before. Shift+Tab and every modified
  Tab are never handled.
- **Escape** is never `preventDefault`ed (005 keeps its meaning) and arms the way out: the next
  Tab isn't handled. Any other key, or focus leaving, disarms it.
- **The answer** is applied only if the line and the cursor are as they were when Tab was pressed;
  a key typed meanwhile wins. The text is replaced with `setRangeText` inside the field's own
  editing (`execCommand('insertText')` where it exists), so the system's undo takes back a
  completion, as FR-074 keeps undo.
- **A second Tab in a row** (no other key between, the line unchanged since the first) with two or
  more matches and nothing to add lists them: an output entry like Ctrl+C's (R33), the prompt and
  the line as typed, not added to `history`, then the list, then the live prompt with the line
  unchanged and the cursor where it was (FR-076). The list is output, never controls (design
  decision 6).
- **100 matches or more** first shows `Display all {n} possibilities? (y or n)` as one haze line of
  that entry. The command line then takes one key: `y` lists them; any other key removes nothing,
  adds nothing to the line, and brings the prompt back, as readline does.
- **The list's columns** are readline's: as many columns as fit the screen's text width, each the
  longest name plus 2, filled down, the last column with no padding. The text width is the
  screen's `clientWidth` over the mono advance (R13's measure, at the screen's real width, not the
  desktop's), so a phone gets 3 columns where a window gets 7, as designed. Folders are bold
  periwinkle with their `/`, files snow (design). A pure `engine/columns.ts` lays the names out;
  the parity test calls it with 80 columns (R45).
- **While the shell loads, fails or runs a line**, Tab does nothing and focus stays, as with no
  match. Escape then Tab still leaves.
- **Announcements** (FR-077, R13): after a completion, the line's new text, once; after a second
  Tab's list, `{n} possibilities`, bash's own word, from the design's `Display all [n]
  possibilities?`; after the question, its text. Nothing for no match.
- **The command line's description** (FR-077): `aria-describedby` a visually hidden element with
  the design's `Tab completes. Escape then Tab leaves.`, and `help`'s lead adds the design's
  sentence (FR-077, design decision 7).

**Rationale**: FR-026 leaves Tab to the browser everywhere a visitor could be trapped, and the
answer arriving after other keys must never overwrite them.

**Alternatives considered**: completing in the page with no round trip (needs the visitor's files
in the page, R43); Escape clearing the line, as some terminals do (005's edge case keeps Escape's
meaning and keeps the line).

**As built (2026-10-30)**: the line and caret are noted when Tab is pressed, not when its answer
comes, so a second Tab ahead of the first's answer still counts as the second. The list measures
`.terminal-screen`'s width less its padding, over the list's own font size: a phone's font is
smaller than the window's, and `.pocket .terminal` has `min-inline-size: 0` so the list's rows can't
widen the screen before it is measured.

## R45. Proving completion against bash (SC-017)

**Decision**: `packages/web/test/terminal/shell/completion-parity.test.ts`, in Node, beside
`bash-parity.test.ts` and sharing its temporary home folder (R38): the Terminal's file system for
the real CV, plus a few visitor files (`notes/`, `todo`, `my file`). For a fixed list of at least
20 partly typed lines, it compares the Terminal's completer and real bash 5's readline:

- **Driving readline**: readline completes only in an interactive bash on a terminal. Node can't
  open a pseudo-terminal without a native package (`node-pty`), and macOS's `script` gives no
  output with a pipe for its input (tried). So the test runs a small driver,
  `test/terminal/shell/readline-driver.py`, with the system's `python3 -I` and its standard `pty`
  module, which is on the CI image and on macOS. The driver starts
  `bash --norc --noprofile -i` with `INPUTRC=/dev/null`, `HISTFILE=/dev/null`, `LC_ALL=C`,
  `TERM=dumb`, an 80-column terminal, `bell-style none` and `page-completions off`, and binds a key
  to `printf '<<%s|%d>>' "$READLINE_LINE" "$READLINE_POINT"` to read the line and the cursor after
  a Tab. A second Tab is sent straight after the first, so readline sees two in a row, and its
  list is read up to the next prompt.
- **The same commands on both sides**: `PATH` is a folder of empty executables named after every
  command the Terminal registers (the site's commands and aliases, `STANDARD_COMMANDS`), and
  `enable -n` turns off each bash builtin not in `SHELL_BUILTINS`, which also takes it out of
  readline's matches. So `ca` lists the same names in both, or the line names the difference.
- **Compared**: the line and the cursor after one Tab, and the list after two, as SC-014 compares:
  each on its own, the Terminal's list laid out by `engine/columns.ts` at 80 columns. The list
  covers FR-076's cases: a command, an alias, a builtin, a keyword, a function, a folder in the
  first word, a file, a folder, a path from `/` and from `~/`, a word in double and in single
  quotes, a name with a space, a word after a redirect and after `|`, several matches with and
  without a common part, no match, and the 100-match question (a visitor folder of 100 files).
- **Tools**: the test checks `python3` and bash 5 as `bash-parity.test.ts` checks GNU tools, and
  fails naming what to install. It runs in `npm test`, so in CI (FR-042), and only locally with
  GNU tools on `PATH` on macOS, as T158 does.

**Alternatives considered**: hand-written expected lines (the test author's idea of readline);
`node-pty` (a native dependency for one test, Constitution X); `expect` (on macOS, but not on the
CI image by default).

**As built (2026-10-30)**: `readline-driver.py` marks with `echo -n`, as `printf` is turned off with
the other builtins.

## R46. The pocket terminal's Tab key (FR-078)

**Decision**: `Pocket.tsx`'s command keys become `help`, `about`, `work`, `projects`, `cv`, `ls`,
`clear` and `Tab ⇥` (design: `Tab ⇥` takes `skills`' place). The Tab key is a `button` named
`Tab, complete` (design), 75 × 52 px, 66 × 48 below 375 px, from the key tokens (R22).

- **Pressing it** sends the same `complete` as Tab, from the command line's text and cursor, and
  counts as a second Tab when pressed twice in a row. It never moves focus out of the command
  line: its `pointerdown` is `preventDefault`ed, so the field keeps focus and a phone's keyboard
  stays open, and its `click` acts. Reached by the keyboard (the toolbar's arrows), Enter or Space
  acts and focus goes back to the command line, as a command key does (FR-015).
- **With the phone's keyboard open** (`data-keyboard`, R15) the command keys hide as before, and a
  strip, `div.pocket-strip`, 60 px tall between the screen and the keyboard, holds the Tab key
  alone at its right (design). In the vim view's insert mode the strip holds `Esc` instead (R48).
- **With nothing to complete** it changes nothing (FR-078).

**Alternatives considered**: a ninth key (the design keeps two rows of four); the Tab key only in
the strip (the design shows it in the key rows too, so a visitor can complete without opening the
keyboard).

**As built (2026-10-30)**: the served subsets have no `⇥`, so by R16 it is drawn: `glyphs/TabMark.tsx`,
`aria-hidden`, after the key's text `Tab`, named `Tab, complete`. Text can't hold a drawn mark, so
`help`'s phone sentence reads `Tab completes a command or path.`, without the mark the design
writes: a small adjustment (constitution 1.6.0). A vim key pressed from insert mode leaves it
first, as the `:help` and `:q` chips do. While `/` or `:` is typed in vim, the strip is empty.

## R47. The vim view as an editor

> Replaces R12's "the text never changes" and its editing message. The view's structure, wrapping,
> folds, search and focus on opening stay.

**Decision**: `engine/vim.ts` stays a pure reducer, now over editable text:

- **Text**: the buffer is `lines: readonly string[]`, the text as given, never re-printed. Colors
  for a `json` buffer come from a new one-line lexer, `lexLine` in `engine/json.ts`, run per shown
  line, so an edited line is colored as typed. Folds are recomputed after each change from the
  text: a top-level key at indent 2 opening `{` or `[`, to the line at indent 2 that closes it, as
  the CV's JSON is laid out (R11). A fold keeps its closed state by its key. Text that has no such
  shape has no folds. The type (`json` or `text`, for the status line) is set when the view opens,
  from whether the text parses as JSON, and stays.
- **Modes**: `normal` and `insert` (FR-079). Visual mode, registers other than the unnamed one,
  macros, `:s`, `:g` and other splits stay out (spec Assumptions).
- **Normal keys** (FR-060, FR-079): the moves as before, and `i a I A o O` into insert mode, `x dd
  dw D cw cc C r{char} J yy yw p P`, a count before a move or any of these (`3dd`, `5j`), `.` to
  repeat the last change with its count, `u` to undo and `:redo` to redo, and Ctrl+R to redo on
  macOS only (FR-079: no current main browser reserves Ctrl+R there; on Windows and Linux it
  reloads the page). `ZZ` is `:x`. `pending` grows to hold a count, an operator (`d`, `c`, `y`)
  and `r`'s character.
- **The register**: one unnamed register, its text and whether it holds whole lines, as vim's
  `"` register. `dd`, `yy` and `D` fill it; `p` and `P` put it after or before, by line or by
  character.
- **Undo** (FR-079): each change, one normal command or everything from entering insert mode to
  Escape, is one step, as vim's undo blocks. A step keeps the lines before it (the array is
  copied, the unchanged strings shared) and the cursor. At most 1,000 steps, vim's default
  `undolevels`. At the ends, vim's `Already at oldest change` and `Already at newest change`;
  otherwise the message line clears (vim's "1 change; before #4 …" lines aren't shown, as they
  need a clock in the reducer).
- **`.`**: the reducer records the inputs of the last change, from its first key to its Escape or
  its last key, and replays them.
- **Closed folds** (FR-079): line commands (`dd`, `yy`, `cc`, `J`, `o`, `O`, `p` and `P` by line)
  act on every line of a closed fold, as vim includes a closed fold whole. Any other change on a
  closed fold's line, or entering insert mode there, opens the fold first, then acts.
- **Changed**: `modified` is true once the text differs from what was last written or opened, and
  the status line shows `[+]` (design).
- **Keys taken**: as R12, plus Backspace and Delete in insert mode, and Ctrl+R on macOS. Tab and
  every other Ctrl, Alt and Meta combination stay untaken (FR-060, FR-026). In insert mode Tab is
  taken and inserts a tab (R48).

**Rationale**: the view stays the Terminal's own small vim (R12's reasons against CodeMirror and
Monaco still hold), and every rule above is a reducer case with a Node test.

**Alternatives considered**: keeping JSON rows and re-lexing the whole text on each key (an
unfinished edit isn't JSON, and re-printing would change the visitor's text); an undo log of
operations (more code than copies of a few hundred lines, with the same result).

**As built (2026-10-30)**: `D` and `C` ignore a count; `dw` with a count stops at the line's end; `i`
and its kin ignore a count. Vim's name is shown with home as `~`, as vim does. The help split still
has one status line, not the wireframe's second `[HELP] keys [RO]` line. Below the text, `~` rows are
drawn by `.vim-text::after` in the height left, with empty alternative text, so they add no scroll
and aren't read.

**Several views** (T311, decided for the unattended run): a shell can't wait inside a line here, so
`vim a; vim b` runs the whole line first, then opens each view when the one before closes, and the
line's output follows the last. A `vim` from a line that waited queues behind an open view, its changes
kept. The owner can amend FR-058.

**`ls nope`** (T306): FR-048 wins over GNU's wording, as it sets a site reply for a path that isn't
there, so `ls: nope: No such file or directory` stays.

## R48. Typing in insert mode

**Decision**: a real `textarea.vim-insert`, as the command line is a real input (R15, R36):

- On entering insert mode, focus moves to the textarea, which holds the buffer's whole text with
  its caret at the cursor. It is laid over the text, transparent, as the command line is over its
  mirror; the view draws the text and the insert cursor, a 2 px haze bar (`border.thick`,
  `color.terminal-cursor`) before the character it inserts at (design). On a phone, focusing it
  inside the key's or the tap's own event handler opens the keyboard (FR-066).
- Its `beforeinput` is turned into reducer inputs (`insertText`, `insertLineBreak`,
  `deleteContentBackward`, `deleteContentForward`) and `preventDefault`ed, so the reducer's text is
  the only text and its undo the only undo. Input that can't be cancelled, a phone's composition or
  autocorrect, is read on `input` by comparing the textarea's value with the buffer, then
  replaced by the buffer's text.
- A screen reader hears what is typed and deleted as in any text field, since it is one (FR-065).
  It is named after the file and described by the status line, as `.vim-text` is.
- **Tab** in the textarea inserts a tab, with no modifier and Escape not pressed since (FR-079).
  **Shift+Tab** isn't handled: while insert mode lasts, `.vim-text` has `tabindex="-1"`, so focus
  leaves the view backwards, not to its own text. **Escape** returns to normal mode, moves the
  cursor back one character as vim does, and puts focus back on `.vim-text`; a Tab then leaves it
  as in normal mode (FR-065, R50).
- **A click or tap on the text** (FR-079, FR-066) moves the cursor to the character under it, from
  `caretPositionFromPoint` (`caretRangeFromPoint` in Safari) on the line's code, mapped back
  through the line's tokens to a column. In insert mode it sets the textarea's caret too.
- On a phone in insert mode, the vim keys hide with the keyboard open, and the strip (R46) holds
  `Esc`, named `Esc, back to normal mode` (design), which sends Escape.

**Rationale**: a phone's keyboard opens only for an editable element, and a screen reader reads
typing only in one. The pattern is the command line's, already built and tested.

**Alternatives considered**: `contenteditable` on `.vim-text` (R15's reasons: unreliable with
screen readers and phone keyboards, and the browser would edit React's markup); a one-line input
for the current line (Enter, Backspace at a line start and `J` cross lines).

## R49. Opening and writing files from the vim view

**Decision**:

- **Opening** (FR-058, FR-081): the `vim` command's effect carries the name as typed, the
  absolute path (none for `vim -`), the text, `readonly` (the path is protected, R28) and `new`
  (the path doesn't exist). `vim <path>` on a missing path opens an empty new buffer, also inside a
  protected or missing folder, as vim does; only a folder, `vim -` with nothing piped and `vim`
  alone get their replies. Piped text, `cv`'s included, is `[No Name]`, not read only (design
  decision 2).
- **Writing** (FR-080): the view sends `{ type: 'write', request }` to the worker
  ([contracts/shell-worker.md](./contracts/shell-worker.md)) with the target path, resolved from
  the working folder, the text with vim's final line break (`fixeol`), and whether it may
  overwrite. The worker writes through TerminalFs, so the file system's rules hold: protected
  paths and missing folders refuse, the 1 MB limit holds (FR-073), and the file is in the shell at
  once. It answers with the outcome and the visitor's files when they changed, which the session
  keeps for a restarted worker (R26).
- **The commands**, each as vim gives it, with vim's messages:

| Command | Buffer | Result |
|---------|--------|--------|
| `:w` | named, not read only | Written: `"{name}" [New] {n}L, {b}B written` (`[New]` only when the file didn't exist), `[+]` goes |
| `:w` | read only | `E45: 'readonly' option is set (add ! to override)`, nothing written |
| `:w!` | read only | Tried: protected, so `"{name}" E212: Can't open file for writing` |
| `:w` | `[No Name]` | `E32: No file name` |
| `:w {path}` | any | Writes there if `{path}` doesn't exist; an existing file gives `E13: File exists (add ! to override)`, and `:w! {path}` overwrites it. A `[No Name]` buffer takes the path as its name; a named buffer stays as it was, `[+]` included, as vim keeps 'modified' when writing a copy |
| `:wq`, `:x`, `ZZ` | | Write as `:w`, then close; `:x` and `ZZ` write only when changed. A failed write keeps the view open |
| `:q` | changed | `E37: No write since last change (add ! to override)`, the view stays |
| `:q!` | any | Closes, the changes unwritten |
| any write | the 1 MB limit passed | `"{name}" E514: Write error (file system full?)`, the file as before, the view open with the changes |
| any write | a protected or missing folder | `"{path}" E212: Can't open file for writing` |
| `:{unknown}` | | `E492: Not an editor command: {typed}` |

- **The first change** to a read-only buffer shows `W10: Warning: Changing a readonly file`, once
  per buffer, as vim does (FR-081).
- **Tones** (design): information haze, `W10` in `color.vim-warning` (new token, amber), errors in
  `color.terminal-error` (rose). A message longer than the line wraps to a second line, and the
  text above gives up a row (design decision 5).
- **Closing the Terminal** with changes unwritten ends the view with them, with no question, as the
  visitor's files end (FR-021, FR-080).

**Alternatives considered**: writing through a hidden shell line such as `printf … > path` (the
redirect guard and G1 would word the errors as bash, not vim, and the line would enter the
history); writing in the page and sending files on the next run (the shell wouldn't have the file
"at once", FR-080).

## R50. Leaving, and SC-016

**Decision**: SC-016's "leaves" means leaving the command line or the vim view's text, as SC-016
and FR-065 say (both amended 2026-10-30 from `/speckit-analyze`): focus goes out of the element
that takes keys to the next element in the page's tab order, where Tab works as everywhere. So:

| From | Leaves with | Focus goes to |
|------|-------------|---------------|
| The command line, empty or spaces before the cursor | Tab | The next element after the command line, as before (FR-026) |
| The command line, text typed | Escape, Tab | The same |
| The command line, any state | Shift+Tab | The element before it |
| The vim text, normal mode | Tab, or Shift+Tab | The `:help` and `:q` chips, then out of the Terminal; or the element before the view (FR-065) |
| The vim view, insert mode | Escape, Tab; or Shift+Tab | As normal mode; or the element before the view (R48) |

The keyboard check confirms each row in at most two keys (SC-016), and that no later Tab is taken.

**Alternatives considered**: skipping the vim view's chips in the tab order, to leave the Terminal
itself in two keys (the chips would be unreachable by keyboard, against FR-064's `:q` control).

**As built (2026-10-30)**: the `keyboard` part tries Escape then Tab, and Shift+Tab, on a fresh page
from four states rather than from a copy of every step: an empty line, a typed line, the vim text and
insert mode. Every step with focus there is one of those four, and a fresh page per step would add
minutes for the same check. The flow's own steps also try the ways out in place. A step that can't
write adds the problem type `not-written`.

## R51. Tests and checks for the 2026-10-30 amendment

**Decision**:

- **Node**: `shell/complete.test.ts` (R43: every row of its table, the sources, quoting, `$`
  names, never `__cv_*`), `shell/completion-parity.test.ts` (R45, SC-017),
  `engine/columns.test.ts` (R44's layout), `engine/vim.test.ts` rewritten for R47 (every key and
  command of FR-060 and FR-079, counts, `.`, undo to 1,000 steps, closed folds, `W10`, the
  messages of R49) and `engine/json.test.ts` for `lexLine`. `shell/site-commands.test.ts`: the
  `vim` effect's `readonly`, `new` and path (R49). `shell/adapter.test.ts`: `write` through
  TerminalFs, each outcome of R49's table.
- **Browser**: `completion.test.ts` (FR-076, FR-077: the line after Tab, the second Tab's entry,
  the 100-match question, stale answers dropped, undo of a completion, announcements, the
  description), `keyboard.test.ts` (FR-026: Tab leaves an empty line, Escape then Tab leaves a
  typed one, Shift+Tab always), `pocket.test.ts` (FR-078's key and strip, FR-066's vim keys and
  `Esc`), `vim.test.ts` and a new `vim-edit.test.ts` (FR-058, FR-064, FR-065, FR-079 to FR-081 in
  the real build: insert mode through the textarea, a click moving the cursor, `:w` making a file
  that `cat` then shows, protected files refused, the Tab rules of R48).
- **The site check**: the `keyboard` part gains FR-039's new steps (complete `ab` to `about `,
  leave with Escape then Tab, `vim todo`, a typed line, `:wq`, `cat todo`) and SC-016's leaving
  checks; new states `terminal-tab-list`, `terminal-vim-insert`, `terminal-vim-readonly`,
  `pocket-tab-key`, `pocket-vim-insert`; the `terminal` part writes a file with `vim` and reads it
  back in each shell. [contracts/cli.md](./contracts/cli.md) lists them.
- Tests whose expectations change are rewritten, not left to fail: `vim.test.ts`'s read-only
  message, `pocket.test.ts`'s `skills` key, `keyboard.test.ts`'s "Tab always leaves", and
  `data-req.test.tsx`'s count (81 requirements).

## R52. The amendment's design, and what this plan takes from it

**Decision**: the design of the 2026-10-30 amendment is approved (design/review.md, "2026-10-30
amendment", signed by the owner on 2026-10-30, commit `bad9df6`), so Constitution II's gate is
open for its UI tasks. This plan takes:

- **Token**: `color.vim-warning`, `{color.base.amber}`, into the hand-written export (design
  decision 1). The insert bar reuses `color.terminal-cursor` and `border.thick`; the Tab and `Esc`
  keys the key tokens; errors `color.terminal-error`. No other new value.
- **Status line**: `[NORMAL]` or `-- INSERT --` in the mint pill, the name or `[No Name]`, then
  `[RO]`, `[+]` and the pipe in haze (the contrast fix, design decision 3).
- **Messages and wrapping**: R49.
- **The pocket keys**: R46, and the vim keys in three rows of four with `:q` twice as wide, the
  third row in the grille's place at 375 px, and at 320 px taking a row from the screen (design
  decision 4).
- **Wording**: `help`'s lead and the command line's description (design decision 7), the
  opening lines (`"{file}" {n} lines`, `"{file}" [readonly] {n} lines`, `"{file}" [New]`,
  `"[No Name]" {n} lines`), and the key names of the design's site text.
- **`[New]`**: in the message line only, as the approved boards and vim show it (FR-058 as
  amended 2026-10-30 from `/speckit-analyze`); the status line's marks are `[RO]` and `[+]`.
