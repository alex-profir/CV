# Research: The Terminal

Phase 0 of [plan.md](./plan.md). Each decision gives what was chosen, why, and what else was
weighed. The Terminal is built on 005's shell, which is implemented on the `005-os-shell` branch
and not yet merged. Paths, components and checks named here are that branch's (see R1).

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
  `aria-readonly="true"` and `aria-roledescription` from site text. It holds the key handler,
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
