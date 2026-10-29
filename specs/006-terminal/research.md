# Research: The Terminal

Phase 0 of [plan.md](./plan.md). Each decision gives what was chosen, why, and what else was
weighed. The Terminal is built on 005's shell, which is implemented on the `005-os-shell` branch
and not yet merged. Paths, components and checks named here are that branch's (see R1).

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
  of the font file. It is recorded beside the family in `fonts/fonts.json` as `"advance": 0.6`,
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
- **Its parser and serializer are public** (`parse`, `serialize`), which R27 uses.

Its cost (R34): the browser build is 1.26 MB, 343 KB with gzip and 274 KB with Brotli, about
three times the rest of the site's script. That is why FR-070 loads it only when the Terminal
first opens.

Its gaps, found while researching. Each is handled where named, and G1, G2, G5, G11, G13 and G14 are
reported upstream with a failing test before the Terminal relies on them (tasks):

| # | Gap in 3.6.0 | Handled by |
|---|--------------|------------|
| G1 | A write that the file system refuses inside a redirect (`echo hi > about`) rejects `exec` instead of printing `bash: about: Permission denied` with status 1. The line's earlier output is lost | Upstream fix first. Until it is released, the adapter refuses a redirect to a protected path before the line runs (R28) |
| G2 | A trailing `\|` (`ls \|`) parses as a complete line and runs | The adapter's syntax check (R27) |
| G3 | stdout and stderr come back as two strings, so their lines can't be interleaved as a terminal shows them, even under `2>&1` in a group | Shown stdout first, then stderr (R30). SC-014 compares each stream on its own (R38) (spec FR-068, SC-014) |
| G4 | Every `exec` starts from a fresh copy of the shell's state: variables, functions, options and the working folder reset after each line. Files are kept | The adapter carries the state (R27) |
| G5 | `tee` reports any write error as "No such file or directory" | Upstream fix. Until then, `tee` onto a protected file says the wrong reason, and the file is still unchanged (spec FR-068) |
| G6 | The default file system creates missing parent folders on write (`echo hi > /nope/x` succeeds) | The Terminal's file system refuses it with "No such file or directory" (R28) |
| G7 | `FsStat` has no owner, so `ls -l` always shows `user user` | The `ls` wrapper writes the owner (R28) |
| G8 | Functions can't override `exit` | Not needed: R27 detects `exit` |
| G9 | `$HOME` defaults to `/` | Set to `/home/guest` (R27) |
| G10 | `compgen -b` prints nothing, and `type` abbreviates a function's body with `...` | R27 takes bodies from the parser, R32 lists builtins in a tested constant |
| G11 | `env` also lists variables that weren't exported | Upstream fix. Until then, `env` lists them. `export -p` is right (spec FR-068) |
| G12 | `jq`'s error messages are worded differently from jq 1.7's (`jq: parse error: Unexpected token EOF at position 2`) | Accepted: they are jq's errors as the shell's jq gives them (FR-056). R38 leaves jq's errors out of the parity list (spec FR-068) |
| G13 | `yes` ends with status 0 when it reaches the output limit, printing exactly that much, instead of being stopped | The adapter treats a line whose output reached 1,048,576 bytes as stopped by the output limit (R33) |
| G14 | A command that passes the output limit (`seq 1000000`) prints none of its output, where bash would have printed up to the stop | Accepted: the line shows FR-069's text with what earlier commands printed. Upstream report |
| G15 | `maxLoopIterations` (100,000 by default) makes `seq 200000` fail with "iteration limit exceeded", which bash never says | Set to 1,000,000,000, so FR-069's three limits are the ones that stop a line (R33) |

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
`exec` with a **prelude** and an **epilogue** around it, and keeps the state between lines
itself, since just-bash resets it after each `exec` (G4):

1. **Syntax first.** The line alone goes through just-bash's `parse`. A parse error is returned
   as just-bash words it (``line 1: unexpected EOF while looking for matching `"'``), with
   status 2, and nothing runs. A pipeline with an empty side (`ls |`, `| jq`) is a syntax error
   too, worded as bash words it (`syntax error near unexpected token '|'`) (FR-057, G2). The
   interface shows both without bash's `bash: ` prefix and line number, as the approved design
   sets (R30).
2. **Prelude**: the variables (as `NAME='value'`, quoted), `export` for those exported, the
   functions (below), the `set -o` options that were on (`errexit`, `nounset`, `pipefail`,
   `noglob`, `noclobber`, `xtrace`), and `(exit N)` so `$?` is the last line's status. The working
   folder is passed as `exec`'s `cwd`. The shell's own variables (`PWD`, `OLDPWD`, `IFS`,
   `SHELLOPTS` and the like) are left to it. `HOME=/home/guest`, `USER=guest`, `LOGNAME=guest` and
   `SHELL=/bin/bash` are set once (G9).
3. **The line**, as typed.
4. **Epilogue**: `__cv_s=$?; __cv_state "$__cv_s" "$(declare -F)" "$SHELLOPTS"`. `__cv_state` is a
   hidden custom command that reads the variables, the exported names and the working folder from
   its context. Its arguments give the status, the names of the functions that exist now, and the
   options.
5. **Functions**: just-bash can't print a function's body (G10). So the adapter takes bodies from
   the parser: every function definition in each line is serialized with `serialize` and kept by
   name. After the line, only the names `declare -F` listed are kept, so `unset -f` and a
   definition that never ran are honored. A function defined only through `eval` has no known
   body and isn't carried, a known limit.
6. **`exit`**: when the epilogue didn't run and no limit stopped the line, the shell exited. The
   interface then does what `exit` does (FR-008): closes the window on desktop, goes home on
   mobile. `set -e` and a failing command exit the shell the same way, as in an interactive bash.
7. **Line numbers**: the prelude's lines are counted, and a runtime message that names a line
   (`bash: line 7: …`) is shifted back by that count, so it names the visitor's line.

Measured: variables with quotes, exported variables, `$?`, `set -o pipefail`, the working folder
and a function with `local`, `if` and a pipe all carry to the next line, and `unset -f` removes
one. The prelude and epilogue add about 10 statements, within the 10,000 of FR-069.

The state is data, `ShellState` ([data-model.md](./data-model.md#shell-state-fr-067)), held in
the session (R5). Closing the Terminal empties it (FR-021).

**Alternatives considered**: one endless `exec` reading lines from a custom command (the time and
command limits are per `exec`, so FR-069's per-line limits would have to be rebuilt by hand, and
a stopped worker would lose everything); reading just-bash's private state (`bash.state`, not a
public interface, and it changes between versions); asking upstream for persistent sessions
(worth proposing, and the adapter is the fallback until then).

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
- **Until G1 is fixed upstream**: a transform plugin (just-bash's public `registerTransformPlugin`)
  finds each output redirect whose target is a literal word, and replaces a command whose target
  resolves to a protected path with `__cv_denied '<target>'`. That prints bash's
  `bash: <target>: Permission denied` and returns 1 without running the command, which is what
  bash does when a redirect fails. A target built from an expansion, and a redirect that passes
  the 1 MB limit, still lose the line's output and show only the error, until the fix. The plugin
  is deleted once the fix is released.
- **Reset** (FR-021): `reset` rebuilds TerminalFs from the CV and the spec list. `restore(files)`
  rebuilds it with the visitor's files from a snapshot (R26).

**Alternatives considered**: just-bash's `MountableFs` with the CV mounted read-only (its
read-only file systems answer with `EROFS`, "Read-only file system", not the "Permission denied"
FR-049 sets, and the home folder must hold both kinds of file side by side); permissions through
`chmod` modes alone (the default file system ignores modes when writing).

## R29. The site's commands as commands of the shell

**Decision**: every command of FR-008 is a just-bash custom command, built from the `COMMANDS`
table (R7's table, kept), in `apps/terminal/shell/site-commands.ts`. Custom commands win over
built-ins of the same name, so `whoami`, `help`, `history` and `clear` are the site's (FR-068).

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
  columns to a terminal and plain lines to a pipe, without the command having to know which. A
  recording carries no text of its own beyond what the command printed, so a visitor can't make
  one: typed or piped text never becomes a link or a control (FR-018).
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

**Alternatives considered**: telling a command whether its output is a terminal, through an
assignment the parser adds (`__tty=1 work`), as `isatty` does (it is decided where the line is
parsed, so a function defined in one place and called in a pipe elsewhere gets it wrong); escape
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
just-bash's own `help <name>`, which the site's `help` wraps through `ctx.origCommand`. A test
runs every registered name and every listed name and checks the two sets are equal, so no
command exists that `help` doesn't list.

## R33. Limits and stopping

**Decision**: just-bash's limits, set to FR-069's: `maxExecutionTimeMs: 5000`, `maxCommandCount:
10000` and `maxOutputSize: 1048576`, and `maxLoopIterations: 1000000000` so its own iteration limit
never stops a line first (G15), with the `normal` profile for the rest. Measured: `while true; do :;
done` ends at 10,000 commands in about 200 ms, and with a higher count at the 5 s deadline; `seq
1000000` ends at the output limit with status 126; `yes` prints exactly 1,048,576 bytes and ends
with status 0 (G13), which the adapter counts as the output limit. The adapter recognizes each
limit's message and status (124 for the deadline, 126 for the others) and the interface shows
FR-069's site text in their place, after what the line printed before it stopped: `stopped: it ran
for 5 seconds, the longest a command line runs here.`, or the design's line for 10,000 commands or 1
MB, then a new prompt. As a second guard, the interface terminates a worker that hasn't answered 1 s
after the deadline (R26).

**Ctrl+C** (FR-075): with no text selected, while a line runs, it terminates the worker as above
and shows `^C` after the line, then `stopped: you pressed Ctrl+C.` With no line running, it shows
the typed text with `^C` after it, as an entry that isn't added to the history, and a new prompt.

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
  budget written next to the check (R21's 102 KB, plus 5%).
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
  as today. Otherwise it keeps them and records, in a small entry of its own cache, which old
  cache each open client came from.
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
  `HighlightText`, and the hollow one a 2 px `Highlight` outline (FR-033).
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
- **Click to focus** (FR-071): a `pointerup` on `.terminal-screen` that isn't on or inside an
  `a`, a `button`, an `input` or the vim view, and after which the page's selection is collapsed
  or unchanged from the `pointerdown`, focuses the command line with `preventScroll` and no change
  to its text. A drag that selected text keeps its selection and moves no focus (FR-023). On
  touch, the tap focuses the line without `inputmode="none"`, so the keyboard opens, as tapping
  the line does.

**Alternatives considered**: `:focus-visible` with a subtle outline (FR-072 rules out any box);
the native caret (R15).

## R37. A terminal's keys in the command line

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
(BSD-3-Clause) and `turndown` (MIT, pulled in by a command the Terminal leaves out, and kept
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
