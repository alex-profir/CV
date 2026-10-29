# Feature Specification: The Terminal

**Feature Branch**: `006-terminal`

**Created**: 2026-10-27

**Status**: Approved

**Amended**: 2026-10-29, after the owner's review of the built Terminal: a real bash-like shell
and a terminal's cursor, focus and keys, and, from the design review that day, no greeting and
`help <name>` for the standard commands (see Clarifications, Session 2026-10-29). Approved
2026-10-27; the amendment approved by the owner 2026-10-29.

**Amended**: 2026-10-29: `open` accepts `playground`, for the TypeScript playground (008) (see
Clarifications, Session 2026-10-29, and 008-typescript-playground FR-087). Approved 2026-10-27;
the amendment approved by the owner 2026-10-29.

**Amended**: 2026-10-30, after the owner tried the shell: Tab completes as in bash, with a way
out, and vim edits files (see Clarifications, Session 2026-10-30 (owner review of the shell)).
The amendment approved by the owner 2026-10-30.

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> The Terminal app: a second app in the OS shell (005) where visitors explore the CV and the site
> by typing commands. It ships on both shells. On desktop it opens in a window from the dock like
> any other app. On phones it opens full screen and is deliberately a little odd, as a nice touch,
> while staying usable. Commands read the CV from the CV content source (002), never hardcoded,
> and can tell visitors about the site and how it was built, linking to the repo. Cover keyboard
> and screen-reader use, reduced motion, offline behaviour, and what happens with an unknown
> command. The look is original. Settings, Contact and the requirement inspector are separate
> features. See docs/vision.md and specs/005-os-shell.

## Clarifications

### Session 2026-10-27

- Q: Should the Terminal also offer a pretend file system, where `ls`, `cd` and `cat` browse the
  CV as folders and files, or only named commands such as `work`? And should that file system be
  its own feature first? → A: The Terminal offers a read-only pretend file system of the CV and
  the site, as part of this feature, next to the named commands (FR-012, FR-043 to FR-050). No
  other app in the first release browses files, so it ships with the one app that uses it.
- Q: What should each entry in the output of `specs` show? → A: Each spec's number, name, status
  and count of active requirements, with a link to it in the repository, all read from the
  repository when the site is built (FR-013).
- Q: What is the phone Terminal's odd touch? → A: A pocket terminal: on a phone the Terminal looks
  like a small handheld terminal of the site's own design, with a screen above and big
  physical-looking command keys below it that run the common commands (FR-024, FR-051 to
  FR-054).
- Q: When a command prints a lot, such as `cv` or `work`, what should a screen reader announce?
  → A: Output of at most 5 lines is announced in full. Longer output is announced as a one-line
  summary, such as "work: 4 entries", and the user reads on with their screen reader. Focus stays
  in the command line either way (FR-028).
- Q: How close must a mistyped command be before the Terminal suggests a real one? → A: Every
  command or alias at most 2 single-letter edits away (a letter added, removed or changed, or two
  neighbouring letters swapped), plus every command the typed word begins, when it is at least 2
  letters long (FR-016). Refined 2026-10-28: a typed word of 3 letters or fewer reaches only names
  1 edit away, so a 2-letter word doesn't reach every 2-letter command (FR-016).
- Q: FR-004 needs 005 FR-040 to let focus go to the Terminal's command line on opening. Where is
  that change made? → A: On 005's branch, before 005 merges: 005 FR-040 now lets an app whose spec
  says so move focus to an input inside it. This spec relies on that and amends nothing (FR-004).
- Q: Should the Terminal's output use headings, so screen reader users can jump between commands
  and entries? → A: Yes. Each command run is a heading, and inside its output the sections and
  entries are headings one and two levels below it, as on `/cv` (FR-029).

### Session 2026-10-27 (design review)

- Q: The long output of `cv` reads poorly. How should the whole CV show in the Terminal? → A: As
  the CV document's own JSON, `cv.json` in the home folder, opened in a vim-like view through a
  pipe that pretty-prints it: `cv` runs `cat cv.json | jq | vim -` (FR-055 to FR-066).
- Q: What should the pipe turn the JSON into? → A: Pretty JSON: indented, syntax-colored, with
  line numbers and a fold per top-level section. Dates stay as the JSON writes them (FR-056,
  FR-061).
- Q: How much of vim should the view allow, given the file system is read only? → A: A read-only
  viewer: vim's normal-mode moves, search, folds, `:help` and `:q`. Keys that would edit say the
  file is read only (FR-060).
- Q: What happens to `cv` and the per-section commands? → A: `cv` opens the vim view. `work`,
  `about` and the other section commands keep their short text output (FR-008, FR-009, FR-059).

### Session 2026-10-29 (owner review of the built Terminal)

- Q: The Terminal doesn't feel like a terminal. Whose feel should it have? → A: A real bash-like
  shell running in the page, as the in-browser bash shells built for agents do: a bash command
  language, the standard commands a bash user expects, and a file system they work on. The site's
  own commands (`help`, `about`, `work`, `cv` and the rest) stay, as commands of that shell
  (FR-067, FR-068). The plan names how it is built and why (Constitution X); this spec says what
  it does.
- Q: What does the shell's language cover? → A: Pipes between any commands, `;`, `&&` and `||`,
  quotes and escapes, variables, globs, redirects and `if`, `for` and `while`, with bash's
  meaning. Tab completion stays out (FR-026). A command line that runs too long is stopped with a
  message, and the page never freezes (FR-069).
- Q: Can visitors change files now? → A: Yes, as in a real shell, except the files and folders
  built from the CV and the spec list, which are protected: changing, moving or deleting them
  gets bash's "Permission denied", as for files a user doesn't own. Anywhere else, the home folder
  and `/tmp` included, `touch`, `mkdir`, `mv`, `cp`, `rm` and redirects work, for as long as the
  Terminal is open (FR-049, FR-073).
- Q: Pipes into a command that reads no input, such as `ls | work` or `ls | vim cv.json`? →
  A: As bash does: the command runs and ignores its input. The "doesn't read piped input" reply
  goes (FR-057).
- Q: `jq` only pretty-prints today. → A: `jq` takes jq's filters, so `jq '.work[0].name' cv.json`
  works. With no filter, or `.`, it pretty-prints as before (FR-056).
- Q: The command line has a box around it when focused, and clicking the Terminal doesn't focus
  it. → A: No box. The block cursor is the focus indicator: filled and blinking while the command
  line has focus, hollow when it doesn't. A click or tap anywhere on the Terminal's screen that
  isn't on a link or a control, and doesn't select text, puts focus in the command line (FR-071,
  FR-072, FR-032).
- Q: The shell is far larger than the rest of the site's code. Does it load with the page? →
  A: No. It loads when the Terminal first opens and is kept for offline use like the rest of the
  site, so the site root and `/cv` load as before (FR-070, SC-013).
- Q: Do a terminal's keys work, such as Cmd+A, or Cmd and Option with the arrows to move along
  the command line? → A: Yes. The command line takes the visitor's system's own line-editing keys
  (Cmd+Left/Right or Home/End to the line's ends, Option+Left/Right or Ctrl+Left/Right by word,
  the matching delete keys), with the block cursor and the selection following them, and on macOS
  the readline keys a terminal user expects (Ctrl+A, Ctrl+E, Ctrl+K, Ctrl+U, Ctrl+W, Ctrl+L).
  Cmd+A, or Ctrl+A on other systems, selects all of the Terminal's text and nothing of the rest of
  the page, as a terminal window does. Ctrl+C with no text selected cancels the line or stops the
  running command. No key a browser or screen reader reserves is taken over (FR-074, FR-075,
  FR-026).
- Q: (design review of the amendment) Should the Terminal still open with a greeting? → A: No. It
  opens with the row of starter command controls, `help`, `about`, `work`, `projects` and `cv`,
  then a prompt, as a terminal opens on its prompt. The controls stay so every CV section can still
  be reached without typing (FR-005, SC-001).
- Q: (design review of the amendment) What should clicking a standard command's name in `help` do,
  when most of them need an argument? → A: Show its help: it runs `help <name>`, not the command
  itself. The site's own commands in `help` still run themselves (FR-008, FR-015).
- Q (from `/speckit-analyze`): SC-014 compares output with bash's, but the site's own commands,
  the replies of FR-016 and FR-048 and command controls differ from bash by design. What does it
  compare? → A: Only command lines that use the standard commands of FR-068; the site's commands,
  those replies and controls are not compared (SC-014). Approved by the owner 2026-10-29.
- Q (from `/speckit-analyze`): Should a mistyped standard command, such as `grpe`, get
  suggestions? → A: No. Suggestions come only from the site's commands and aliases, so `sudo`
  keeps getting only `help` (FR-016). Approved by the owner 2026-10-29.
- Q (from `/speckit-analyze`): Where may the shell differ from bash and GNU? → A: Only in the four
  ways FR-068 lists, each to go once the shell no longer has it (FR-049, FR-056, FR-068), and
  SC-014 compares each output stream on its own, without bash's `bash: line N: ` prefix (SC-014).
  Approved by the owner 2026-10-29.
- Q (from `/speckit-analyze`): FR-060 calls Ctrl+D, Ctrl+F and Ctrl+U reserved, but FR-074 takes
  Ctrl+F and Ctrl+U on macOS. Which is it? → A: The vim view takes none of the three on any
  system, and the reserved keys are those of the visitor's system (FR-060). Approved by the owner
  2026-10-29.
- Q (from `/speckit-analyze`): Does the 10,000-command limit count commands the shell runs for
  itself? → A: No. A line runs 10,000 of its own commands before it is stopped (FR-069). Approved
  by the owner 2026-10-29.

### Session 2026-10-30

- Q: With the Terminal's lines in both shells, the site check takes about 5.5 minutes on the
  hosted runner, and 001's SC-008 cancels the `site` job at 6. Make the job faster or raise its
  limit? → A: Raise it. This feature amends 001's SC-008 in its pull request: the `site` job gets
  12 minutes, the other jobs keep 6 (Constitution XI). Approved by the owner 2026-10-30.

### Session 2026-10-30 (owner review of the shell)

- Q: Should Tab complete what was typed, as in a terminal, when FR-026 keeps it for moving focus?
  → A: Yes, as bash does, with a way out. With text before the cursor, Tab completes the word
  before it: a command name as the first word, a path after it. It fills in what all the matches
  share, and a second Tab in a row lists them. On an empty command line Tab leaves, as before, and
  Escape then Tab always leaves, so focus is never trapped. Shift+Tab always leaves. The command
  line's accessible description and `help` say how to leave (WCAG 2.2 success criterion 2.1.2)
  (FR-026, FR-076, FR-077).
- Q: The pocket terminal has no Tab key. → A: Its command keys get one, which completes as Tab
  does (FR-078).
- Q: Should vim edit files now that visitors have files of their own? → A: Yes, as vim does. The
  view gets insert mode and vim's editing keys, undo and redo, and `:w`, `:wq`, `:x` and `:q!`.
  `vim <path>` on a path that doesn't exist yet opens an empty file that `:w` creates. A protected
  file opens as vim opens a read-only one: it can be changed on screen, with vim's warning at the
  first change, but `:w` refuses with vim's error and the file stays as it was (FR-049, FR-060,
  FR-079 to FR-081).
- Q: Does `:q` still always leave? → A: As in vim, not with unsaved changes: it gives vim's
  "No write since last change" error, and `:q!` leaves without saving (FR-064, FR-080).
- Q: Which messages does the vim view give? → A: vim's own, such as `E37`, `E45` and `W10`, as
  the shell gives bash's. They replace the site's "read only" message (FR-060, FR-081).
- Q (from `/speckit-plan`): Real bash 5's completion, driven over a copy of the Terminal's home
  folder, completes folders as well as commands in a command's first word. From the home folder,
  `wo` matches both the `work` command and the `work/` folder, so bash gives `work` with no space,
  where FR-039 and User Story 5 expected `work `. And bash asks `Display all N possibilities?` at
  100 matches or more, not only past 100. Which wins? → A: bash, exactly, as FR-076 and SC-017
  say. The examples change to one bash completes the same way: `ab` gives `about ` (FR-039,
  User Stories 1 and 5), and the question comes at 100 matches or more (FR-076). Approved by the owner
  2026-10-30.
- Q (from `/speckit-analyze`): SC-016 says focus leaves the Terminal in two keys, but Tab from the
  vim text reaches the `:help` and `:q` controls first; FR-076's list for a command's first word
  leaves out the keywords and folders bash completes there, and names the visitor's aliases, which
  the shell doesn't have; and FR-058 puts `[New]` in the status line where the approved design and
  vim put it in the message line. → A: SC-016 and FR-065 say focus leaves the command line or the
  vim text; FR-076 lists keywords and the working folder's folders, without aliases the visitor
  defined; a new file shows `[New]` in the message line only (FR-058, FR-065, FR-076, SC-016).
  Approved by the owner 2026-10-30.
### Session 2026-10-29 (amended by 008-typescript-playground)

- Q: The TypeScript playground (008) is a new app. Should `open` accept it? → A: Yes. `open
  playground` opens the Playground, or brings it to the front, as its dock item or home-screen icon
  does; on mobile that is its "best on desktop" screen. Running code from the Terminal is not part
  of it (FR-008, FR-014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore the CV by typing commands (Priority: P1)

A hiring manager on a laptop has the CV open and notices a Terminal in the dock. They open it.
It opens on a prompt with a few commands offered above it, `help` first. They type `help` and see every
command with a one-line description. They type `work` and read each role with its dates and
links, then `projects` and `skills`. They mistype `wrok`, and the Terminal says it doesn't know
that command and offers `work` instead. Later they click a command name in the help list rather
than typing it, and it runs.

**Why this priority**: this is the feature. The Terminal shows the same CV in a second, playful
way, and every other story builds on a Terminal that can run commands over the CV document.

**Independent Test**: build the site, open the site root at 1440 px wide, open the Terminal from
the dock, run `help`, then every CV command it lists, and compare each output with the CV document
and with `/cv`. Run an unknown command and a misspelt one, and run a command by clicking its name.

**Acceptance Scenarios**:

1. **Given** the desktop shell on first load, with the CV window open, **When** the visitor
   clicks the Terminal item in the dock, **Then** the Terminal opens in a new window in front,
   focused, showing the starter command controls and a prompt, with keyboard focus in the command
   line.
2. **Given** the Terminal is open, **When** the visitor types `help` and presses Enter, **Then**
   the typed command appears after the prompt, followed by every command the Terminal offers,
   each with a one-line description, and a new prompt appears below.
3. **Given** the Terminal is open, **When** the visitor runs `work`, **Then** every work entry of
   the CV document appears, in the CV document's order, with every field `/cv` shows for it, the
   dates written as `/cv` writes them, and each link working as a link.
4. **Given** the Terminal is open, **When** the visitor runs `cv`, **Then** the vim view opens
   on `cv.json`, the CV document's JSON pretty-printed, with each top-level section folded to
   one line, and the status line says the file is read only.
5. **Given** the Terminal is open, **When** the visitor runs `wrok`, **Then** the Terminal says
   that `wrok` is not a command, offers `work` as a command they can run with one click, and
   mentions `help`.
6. **Given** the output of `help`, **When** the visitor clicks a command's name, **Then** that
   command runs as if typed: it appears after a prompt, then its output.
7. **Given** the Terminal is open, **When** the visitor runs ` HELP ` with capitals and spaces
   around it, **Then** it runs `help`.
8. **Given** the visitor ran `work` and then `skills`, **When** they press the Up arrow twice in
   an empty command line, **Then** the command line holds `work`, and Down brings back `skills`.
9. **Given** a Terminal full of output, **When** the visitor runs `clear`, **Then** the earlier
   output disappears and only a new prompt is left.
10. **Given** the Terminal is open on desktop, **When** the visitor runs `exit`, **Then** the
    Terminal window closes as its close control would close it (005 FR-023).
11. **Given** the CV window is closed, **When** the visitor runs `open cv` in the Terminal,
    **Then** the CV app opens in a focused window in front, as the dock would open it.
12. **Given** the CV document's projects section is empty, **When** the visitor runs
    `projects`, **Then** the Terminal says the CV lists no projects, and shows no empty list.
13. **Given** the vim view on `cv.json`, **When** the visitor clicks the fold line of `"work"`,
    or moves to it and presses `za`, **Then** the work section opens in place.
14. **Given** the vim view, **When** the visitor types `/REST` and presses Enter, **Then** every
    match in view is highlighted, the cursor moves to the first, and the message line says which
    match of how many it is. `n` moves to the next.
15. **Given** the vim view on `cv.json`, **When** the visitor presses `i` and types, **Then** the
    text changes on screen and the message line shows vim's warning that the file is read only.
    **When** they type `:w`, **Then** vim's "'readonly' option is set" error appears and
    `cat cv.json` shows it as before.
    Amended 2026-10-30: `i` and `:w` changed nothing and the message line said the file was read
    only.
16. **Given** the vim view, **When** the visitor types `:q` and presses Enter, or clicks the `:q`
    control, **Then** the view closes, the Terminal's output is back with `cv` after its prompt,
    a new prompt follows, and focus is in the command line.
17. **Given** the Terminal is open, **When** the visitor runs `cat cv.json | jq`, **Then** the
    JSON appears in the output, pretty-printed and colored, without the vim view.
18. **Given** the Terminal is open and focus is elsewhere, **When** the visitor clicks anywhere on
    its screen that isn't a link or a control, **Then** focus moves to the command line, and the
    cursor turns from hollow to filled and blinks. No box or outline appears around the command
    line.
19. **Given** the Terminal is open, **When** the visitor runs `work | grep -i engineer`, **Then**
    only the lines of `work`'s output that hold "engineer" appear, as bash would show them.
20. **Given** `ab` typed in the command line, **When** the visitor presses Tab, **Then** the line
    reads `about ` with the cursor after the space. (added 2026-10-30; amended 2026-10-30 from
    `/speckit-plan`: the example was `wo` and `work `)
21. **Given** `cat cv` typed in the home folder, **When** the visitor presses Tab, **Then** the line
    reads `cat cv.json `. **Given** `cd wo`, **Then** Tab gives `cd work/`. (added 2026-10-30)
22. **Given** `c` typed, which more than one command starts with, **When** the visitor presses Tab
    twice, **Then** the first Tab adds nothing, and the second lists every command starting with
    `c` below the line, as bash does, followed by the prompt and `c` again, with the cursor after
    it. (added 2026-10-30)

---

### User Story 2 - Learn how the site was built (Priority: P2)

An engineering leader wants to know how the site was made. They type `site` and read that it is a
CV presented as a browser OS, built spec first, with every requirement traced from its spec to the
interface and to a test, and a link to the repository where the specs, plans, tasks and pull
requests are. They follow up with `specs` and see the features the site was built from.

**Why this priority**: the vision's second audience looks for evidence of how the work was done.
The Terminal is a natural place to point them to it, but recruiters never need it.

**Independent Test**: at 1440 px wide, run `site` and `specs` in the Terminal. Confirm the text
says what the site is and how it was built, the repository link leads to the repository, and
`specs` lists the site's specs as the repository holds them.

**Acceptance Scenarios**:

1. **Given** the Terminal is open, **When** the visitor runs `site`, **Then** it says what the
   site is and how it was built, and holds a link to the site's repository.
2. **Given** the Terminal is open, **When** the visitor runs `specs`, **Then** it lists every
   feature spec in the repository, in numbered order, each with its number, name, status and
   count of active requirements, and a link to it in the repository.
3. **Given** a new spec is added to the repository, or a spec's status or requirements change,
   **When** the site is built again, **Then** `specs` shows the change with no edit to the
   Terminal.

---

### User Story 3 - Browse the CV as files (Priority: P3)

An engineer who lives in a terminal ignores `help` and types `ls`. They see folders for work,
projects and education, files for the rest, and a `specs` folder. They `cd work`, `ls`, and
`cat` one role, and the prompt shows where they are. `cd ..` takes them back, `cat readme` tells
them about the site, and `cat specs/005-os-shell` shows the shell's spec in one line with a link.
They `grep -ri rest ~/work` to find the roles that mention REST, and `ls | wc -l` to count
files. When they try `rm about`, the Terminal answers as bash does for a file they don't own, but
`touch notes`, `echo hi > notes` and `mv notes todo` work as they would at home.

**Why this priority**: engineers reviewing the craft will try the commands they know. A file
system that holds the same CV as the named commands rewards them, but nobody needs it to read the
CV, so it comes after the named commands and the site's story.

**Independent Test**: at 1440 px wide, run `ls`, then `cd` into each folder, `ls` it and `cat`
every file, and compare each output with the CV document and with the matching named command.
Try a path that doesn't exist, `cd` into a file and `cat` a folder.

**Acceptance Scenarios**:

1. **Given** the Terminal just opened, **When** the visitor runs `ls`, **Then** it lists the
   folders and files of the home folder, folders marked as folders by more than color, each name a
   control that lists the folder or shows the file.
2. **Given** the home folder, **When** the visitor runs `cd work`, **Then** the prompt shows that
   they are in the work folder, and `ls` lists one file per work entry, in the CV document's order.
3. **Given** the work folder, **When** the visitor runs `cat` with one of its files, **Then** it
   shows that entry as `work` shows it.
4. **Given** the work folder, **When** the visitor runs `cd ..`, `cd ~` or `cd` alone, **Then**
   they are back in the home folder.
5. **Given** the home folder, **When** the visitor runs `cat nothing-here`, **Then** the reply
   names `nothing-here` and says there is no such file or folder.
6. **Given** the home folder, **When** the visitor runs `cd about` on a file, or `cat work` on a
   folder, **Then** the reply says that it is a file, or a folder, and how to read it.
7. **Given** the home folder, **When** the visitor runs `pwd`, **Then** it shows the home folder's
   path.
8. **Given** a new work entry in the CV document, **When** the site is built again, **Then** the
   work folder holds a file for it with no edit to the Terminal.
9. **Given** the home folder, **When** the visitor runs `rm about`, `mv work jobs` or
   `echo hi > cv.json`, **Then** the reply is bash's "Permission denied" naming the path, and
   `cat about`, `ls work` and `cat cv.json` show them as before.
10. **Given** the home folder, **When** the visitor runs `mkdir notes && echo hi > notes/a &&
    mv notes/a notes/b && cat notes/b`, **Then** `hi` appears, `ls` lists `notes/` after the
    built files, and `rm -r notes` removes it. After the Terminal is closed and opened again,
    `notes` is gone.
11. **Given** the home folder, **When** the visitor runs `grep -ril rest ~/work`, **Then** the
    paths of the work files that mention REST appear, one per line.
12. **Given** the home folder, **When** the visitor runs `vim todo`, presses `i`, types `ship it`,
    presses Escape and types `:wq`, **Then** the view closes, and `cat todo` shows `ship it`.
    (added 2026-10-30)
13. **Given** `vim todo` with a line changed and not written, **When** the visitor types `:q`,
    **Then** the view stays open with vim's "No write since last change" error. **When** they type
    `:q!`, **Then** the view closes and `todo` is as it was. (added 2026-10-30)
14. **Given** the vim view, **When** the visitor deletes a line with `dd`, then presses `u`,
    **Then** the line is back. (added 2026-10-30)

---

### User Story 4 - Use the pocket terminal on a phone (Priority: P4)

A recruiter on a phone sees a Terminal icon on the home screen and taps it out of curiosity. It
opens full screen as a small handheld terminal, with a screen at the top and big chunky keys below
it, each a command (FR-024). They don't want to type on a phone keyboard, so they press the
keys and the commands in the help list instead, read the CV that way, and go home.

**Why this priority**: the vision ships the Terminal on both shells and asks for the phone version
to be deliberately a little odd. It comes after the desktop because typing commands is a desktop
habit, and the CV app is the recruiter's real path on a phone.

**Independent Test**: at 375 px wide, with touch, open the Terminal from the home screen, run
`help` and two CV commands with its keys and without typing, type one command with the on-screen
keyboard, and go home with the home control. Repeat at 320 px wide and in landscape, and with a
phone screen reader.

**Acceptance Scenarios**:

1. **Given** the home screen, **When** the visitor taps the Terminal icon, **Then** the Terminal
   opens full screen with the shell's header and home control (005 FR-032), drawn as a pocket
   terminal: its screen shows the starter command controls and a prompt, and its command keys sit
   below.
2. **Given** the pocket terminal, **When** the visitor presses one of its command keys, or taps
   a starter command control or a command in the output of `help`, **Then** it runs as if typed,
   without the on-screen keyboard opening.
3. **Given** the visitor taps the command line, **When** the on-screen keyboard opens, **Then** the
   command line and the latest output stay visible above it, and the command keys make room for
   it.
4. **Given** a 320 px wide phone, **When** the visitor runs `cv`, **Then** the vim view opens
   in the screen, every line wraps within it, nothing needs horizontal scrolling, and the command
   keys become vim keys until `:q`.
5. **Given** the visitor ran commands and went home, **When** they open the Terminal again in the
   same visit, **Then** its output and scroll position are as they left them (005 FR-034).
6. **Given** the Terminal is open on a phone, **When** the visitor runs `exit`, **Then** the home
   screen appears with focus on the Terminal icon, as the home control would do.
7. **Given** the phone is turned to landscape, **When** the visitor uses the pocket terminal,
   **Then** its screen and its keys both fit, and nothing needs horizontal scrolling.
8. **Given** a phone screen reader, **When** the user moves through the pocket terminal, **Then**
   they hear the command line, the output and each key as a button named by its command, and
   nothing of the device's drawn case.

---

### User Story 5 - Use the Terminal with a keyboard or a screen reader (Priority: P5)

A keyboard user opens the Terminal from the dock, types commands, recalls one with the Up arrow,
and presses Tab to leave the Terminal for the dock, without ever being trapped. A screen reader
user hears that they are in the Terminal's command line, hears each command's output when it
appears, and can browse the earlier output, its lists and its links, as they would a page.

**Why this priority**: Constitution VIII and WCAG 2.2 AA are merge gates. A command line is easy
to make into a keyboard trap or a silent box for a screen reader, so this story sets how it
behaves for both.

**Independent Test**: at 1440 px wide, with the keyboard alone, open the Terminal from the dock,
run three commands, recall one, run a command from the help list, leave the Terminal with Tab and
with each shell shortcut, and close it. With a desktop screen reader, then a phone screen reader,
run `help` and `work` and confirm what is announced and that the output can be browsed.

**Acceptance Scenarios**:

1. **Given** focus is on the Terminal item in the dock, **When** the user presses Enter,
   **Then** the Terminal opens and focus lands in its command line, and a screen reader announces
   the Terminal and the command line's name.
2. **Given** focus is in an empty command line, **When** the user presses Tab, **Then** focus
   leaves the command line for the next element, and Shift+Tab moves it back. With text typed,
   Tab completes it (FR-076), and Escape then Tab leaves; Shift+Tab always leaves. A screen reader
   hears how to leave as part of the command line's description.
   Amended 2026-10-30: Tab always left and never completed or inserted text.
3. **Given** focus is in the command line, **When** the user presses the shell's shortcut for the
   dock, the menu bar or the next window (005 FR-025, FR-026), **Then** the shell acts on it as it
   would anywhere else.
4. **Given** a screen reader in the command line, **When** the user runs `pwd`, **Then** its
   one-line output is announced in full, once. **When** the user runs `work`, **Then** a one-line
   summary naming the command and its number of entries is announced instead of the whole output.
   Either way, focus stays in the command line and the user can type the next command straight
   away.
5. **Given** several commands were run, **When** a screen reader user moves by heading,
   **Then** they move from one command to the next, and within the output of `projects` from
   entry to entry. Lists are read as lists, and links as links.
6. **Given** focus is on a command name in the output of `help`, **When** the user presses Enter
   or Space, **Then** the command runs and focus returns to the command line.
7. **Given** the Terminal is the only open window, **When** the user runs `exit`, **Then** the
   window closes and focus moves to the Terminal item in the dock (005 FR-023).
8. **Given** `cat cv.json | jq` typed in the command line on a Mac, **When** the user presses
   Cmd+Left, then Option+Right twice, then Cmd+Right, **Then** the block cursor moves to the start
   of the line, then to the end of `cv`, then to the end of `json`, then to the end of the line,
   as in a terminal. Ctrl+A and Ctrl+E move it to the start and the end, Ctrl+W deletes the word
   before it and Ctrl+U everything before it.
9. **Given** the Terminal with output and a command typed, **When** the user presses Cmd+A (Ctrl+A
   outside macOS) and then Cmd+C, **Then** all of the Terminal's text, the output and the typed
   command, is selected and copied, and nothing of the dock, the menu bar or other windows.
   Typing a letter then clears the selection and adds the letter to the command line.
10. **Given** a command line typed or running, with no text selected, **When** the user presses
    Ctrl+C, **Then** the line shows `^C`, nothing more runs, and a new empty prompt follows.
11. **Given** `ab` typed and completed to `about ` with Tab, **When** a screen reader user listens,
    **Then** they hear the line's new text. **When** a second Tab lists several matches, **Then**
    they hear how many there are, once. (added 2026-10-30; amended 2026-10-30 from `/speckit-plan`:
    the example was `wo` completed to `work `, which bash doesn't do from the home folder)

---

### User Story 6 - Reduced motion, high contrast and larger text (Priority: P6)

Every other visitor sees the command line's block cursor blink while it has focus, as a
terminal's does, and stop blinking a few seconds after their last key press. A visitor who asked
their system for reduced motion sees a cursor that doesn't blink. A visitor in
high-contrast mode sees the prompt, the command line, the cursor and every link. A visitor who
zooms text to 200% reads output that wraps rather than running off the side.

**Why this priority**: Constitution VIII and WCAG 2.2 AA. It changes how the Terminal looks and
moves, not what it does.

**Independent Test**: with reduced motion set, open the Terminal in both shells and run commands,
and confirm nothing blinks, moves or types itself out. With forced colors on, confirm every part
of the Terminal stays visible. At 200% text zoom, and at 400% zoom on a 1280 px window, confirm
nothing is cut off and nothing needs horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** reduced motion, **When** the Terminal is open, **Then** its cursor doesn't blink, and
   output appears at once, with no movement.
2. **Given** no reduced motion and focus in the command line, **When** the visitor presses a key,
   **Then** the cursor blinks, and 5 seconds after the last key press it has stopped blinking and
   stays filled (WCAG 2.2 success criterion 2.2.2).
3. **Given** forced colors, **When** the visitor looks at the Terminal with output, **Then** the
   prompt, typed commands, output, links, command controls, the command line, its cursor and focus
   indicators are all visible and distinguishable.
4. **Given** text zoomed to 200%, **When** the visitor runs `cv`, **Then** every line of the vim
   view wraps within the window and none is cut off or hidden.

---

### User Story 7 - Use the Terminal offline (Priority: P7)

A visitor opened the site once. On a plane, they open it again and use the Terminal. Every command
works as it did online. Only following a link to another site needs the network.

**Why this priority**: Constitution VI. Nothing the Terminal does needs the network, so it must
all work offline. It depends on the shell's stored copy (005).

**Independent Test**: visit the site root once online, turn the network off, open the site root
at 375 px and at 1440 px wide, open the Terminal and run every command `help` lists. Confirm each
output matches the online output.

**Acceptance Scenarios**:

1. **Given** one complete online visit to the site root or `/cv`, **When** the visitor opens the
   Terminal with no network, **Then** it opens complete, in the site's fonts, and every command
   gives the same output as online.
2. **Given** the Terminal offline, **When** the visitor runs any command, **Then** no offline
   message or error appears, because no command needs the network.

---

### User Story 8 - Every pull request proves the Terminal works (Priority: P8)

The owner opens a pull request that changes the Terminal or the CV. The checks 004 and 005 set up
now also cover the Terminal: accessibility in its states, its keyboard flow, the CV it shows,
offline use and requests to other sites. A failure blocks merge and says which shell, state,
width and command failed.

**Why this priority**: it keeps stories 1 to 7 true after merge. It is last because it checks
behavior the other stories define.

**Independent Test**: break one thing at a time on a branch (drop a field from the output of
`work`, make Tab stop leaving an empty command line, give the command line no name, hardcode a CV fact
in a command) and confirm that the matching check fails with a clear message and the pull request
can't merge.

**Acceptance Scenarios**:

1. **Given** a pull request where `work` leaves out a field `/cv` shows, **When** the checks run,
   **Then** the Terminal content check fails and names the command, the field and the shell.
2. **Given** a pull request where Tab no longer leaves an empty command line, or Escape then Tab
   no longer leaves a typed one, **When** the checks run, **Then** the keyboard check fails and
   names the step.
   Amended 2026-10-30: the pull request was one where Tab no longer left the command line.
3. **Given** a pull request where a command's text holds the owner's email typed by hand,
   **When** the checks run, **Then** the content check (002) fails and names the file and line.
4. **Given** a pull request where the file system has no file for one project, **When** the
   checks run, **Then** the Terminal content check fails and names the project and the folder.

---

### Edge Cases

- **An empty command line** and Enter: a new prompt appears, with no message.
- **Extra spaces, capitals or tabs** around or inside a command: they are ignored, so ` Work  `
  runs `work`. The echoed command is shown as typed.
- **A misspelt command** close to a known one, such as `wrok`, `hlep` or `proj`: the reply names
  what was typed, offers the closest commands, at most 3, and mentions `help` (FR-016). A word
  nothing like any command, such as `sudo`, gets no suggestion besides `help`.
- **A command nothing like a known one**, such as `sudo`, `ssh`, `curl` or `python`: the same "not
  a command" reply, with no joke reply or hidden command, as easter eggs are a non-goal. Nothing
  the shell offers reaches the network or runs a program (FR-022, FR-068).
- **A command that would change the protected files**, such as `rm -rf ~`, `mv about x`,
  `touch work/new` or `echo hi > about`: bash's "Permission denied", once per path, and the
  protected files and folders don't change (FR-049). Any of the visitor's own files that the
  command reaches, such as with `rm -rf ~`, are changed or removed as bash would (FR-073).
- **The visitor's files reach the limit** of FR-073: the write that would pass it gives bash's
  "No space left on device", and what was written before stays.
- **A visitor's file named as a built file would be**, such as `touch About` beside `about`: names
  are matched without regard to capitals (FR-045), so it names the protected `about` and gets
  "Permission denied".
- **A known command with an argument it doesn't take**, such as `work 2020`: the reply says the
  command takes no argument and shows how to use it. `help work` shows that command's own help.
- **A path that doesn't exist**, such as `cat work/nowhere`: the reply names the path as typed
  and says there is no such file or folder. `cd` into a file and `cat` on a folder say what the
  name is and how to read it (FR-048).
- **`cd ..` in the home folder**, or `cd /`: the visitor goes up, as in bash. The file system
  above the home folder holds only what FR-045 sets, and `cd` alone or `cd ~` comes back home.
- **`ls` or `cat` with a path from anywhere**, such as `cat ~/work/<file>` from the specs folder:
  it works, so a path means the same from every folder (FR-045).
- **Two CV entries that would get the same file name**, such as two roles at one company: each
  gets its own name, told apart as FR-044 sets.
- **A file name with capitals, spaces or characters other than ASCII letters** in the CV, such as
  a company name with an accent: the file name is made from it as FR-044 sets, and the file shows
  the name exactly as written.
- **`ls` on a long folder** at 320 px: names wrap onto as many lines as they need, one name per
  line when the width is short.
- **`open` with an unknown name**, such as `open settings` before Settings exists: the reply lists
  the names `open` accepts.
- **`open cv` with the CV already open**: the CV window comes to the front, focused, as the dock
  does (005 FR-012).
- **Typed text that looks like markup or a link**, such as `<b>hi</b>` or a URL: it is shown
  exactly as typed, never run, rendered or turned into a link.
- **Pasted text with line breaks**: the line breaks become spaces in the command line, and nothing
  runs until the visitor presses Enter.
- **A very long command**: the command line and the echo wrap within the window. The command line
  takes at most the length FR-017 sets.
- **A very long output**, such as `projects`: the Terminal scrolls to show the new command at the top of
  the view, not the end of its output, so the visitor reads from the start.
- **The visitor scrolled up to read earlier output** when a command is run from the help list:
  the view moves to the new command.
- **Up arrow with no earlier command**: nothing changes. Down past the newest command gives back
  what the visitor had typed before recalling.
- **Selecting and copying output**: works as it does on a page. Selecting text doesn't move focus
  to the command line or clear the selection.
- **Ctrl-click, middle-click or long-press on a link in the output**: behaves as a normal link.
- **The shell switches between desktop and mobile** with the Terminal open: it stays open, with its
  output, command history and what was typed (005 FR-002).
- **The Terminal window resized, minimized or maximized** (005 FR-061 to FR-065): output reflows
  to the new width and is kept.
- **The Terminal closed and opened again** in the same visit: it starts afresh with the starter
  command controls and a prompt in the home folder, and its command history is empty (FR-021).
- **A new visit**: nothing typed in an earlier visit is kept or shown.
- **The CV document changes**: the next build shows the change in every command, with no edit to
  the Terminal.
- **An empty or absent CV section**: its command still exists, still appears in `help`, and says
  the CV lists nothing for it (FR-011). Its folder or file is left out of the file system, as
  `/cv` leaves out an empty section (FR-043).
- **The CV document has no name**: the pocket terminal's case leaves the name out. Nothing else in
  the Terminal shows the name: the prompt and the starter command controls hold none, so they
  don't change.
- **A shortcut a terminal user expects**: the line-editing keys of FR-074 and the keys of FR-075
  work as in a terminal. A key a browser or screen reader reserves on the visitor's system keeps
  the browser's meaning, such as Ctrl+W, Ctrl+L or Ctrl+U on Windows and Linux, so those systems
  get the system's own editing keys instead (005 FR-029, FR-026). Ctrl+C with text selected
  copies it.
- **The command line's text selected**, with Shift and the arrows, a double click or Cmd+A: the
  selection is shown in the command line as on the rest of the screen, and typing or deleting
  replaces it, as in a text field (FR-074).
- **Escape in the command line**: does what the shell gives it (005 edge cases), and doesn't clear
  what was typed.
- **Scripting turned off**: the site root shows the page 005 sets (005 FR-049). The Terminal
  needs scripting and isn't shown.
- **Offline**: every command works. Following a link to another site needs the network, as any
  link does.
- **The on-screen keyboard opens on the pocket terminal**: the command keys give it room, and the
  screen keeps the command line and the newest output in view (FR-053).
- **A phone at 320 px or in landscape**: the pocket terminal rearranges its screen and keys, as the
  design sets, so both fit with no horizontal scrolling (FR-052).
- **A tablet or a narrow desktop window that gets the mobile shell**: it gets the pocket terminal,
  as the shell picks the look by the space available (005 FR-001), not by the device.
- **Reduced motion**: the cursor doesn't blink, output never types itself out, and the pocket
  terminal's keys don't move when pressed.
- **The command line loses focus**, such as when the visitor tabs to the dock: the cursor turns
  hollow and stops blinking, and comes back filled when focus returns (FR-072).
- **Forced colors**: every part of the Terminal stays visible and distinguishable (FR-033).
- **Editing a protected file in the vim view**, such as `cv.json` or `about`: the text changes on
  screen, with vim's `W10` warning at the first change. `:w`, `:wq` and `:x` give vim's `E45`
  error, `:w!` the error vim gives for a file it can't write, and the file stays as it was. `:q!`
  leaves (FR-081). Amended 2026-10-30: every editing key changed nothing and said the file was
  read only.
- **`vim` on a new path**, such as `vim notes/todo` with `notes` made by the visitor: an empty file
  marked new, which `:w` creates. In a protected folder, such as `vim work/new`, `:w` gives the
  error vim gives for a file it can't write, and nothing is created (FR-080).
- **`:w` past the 1 MB the visitor's files may hold** (FR-073): vim's write error, the file as it
  was before, and the view still open with the changes.
- **`vim -` with piped input, then `:w`**: vim's "No file name" error. `:w <name>` writes it
  there, if that path may be written (FR-080).
- **The Terminal closed with unsaved changes in the vim view**: they are gone, with no question,
  as the visitor's files are when it closes (FR-021).
- **Tab with nothing to complete**, such as `xyz` or a path no file starts with: nothing changes and
  focus stays. A second Tab lists nothing (FR-076).
- **Tab with 100 matches or more**, such as `ls /usr/` if it held that many: as bash, the second
  Tab asks `Display all N possibilities? (y or n)`, and `y` lists them (FR-076).
- **Tab inside quotes or after a redirect**, such as `cat "cv` or `echo hi > no`: it completes the
  path, keeping the quote, as bash does (FR-076).
- **Tab in the vim view**: in normal mode it leaves the view, as before (FR-065). In insert mode it
  inserts a tab, as vim does, and Escape then Tab leaves (FR-079).
- **An unknown `:` command** in the vim view, such as `:foo`: the message line names it and says
  it isn't a command there. Escape cancels a `:` or `/` being typed.
- **A search with no match**: the message line says the text wasn't found, and the cursor stays.
- **`vim` with no input**, such as `vim -` with nothing piped, `vim work` on a folder or `vim nowhere`:
  the usage or path reply, and the view doesn't open (FR-058).
- **A pipe into a command that reads no input**, such as `ls | work` or `ls | vim cv.json`: the
  command runs and ignores its input, as in bash (FR-057). `jq` on text that isn't JSON, such as
  `cat about | jq`, gives jq's parse error.
- **`jq` with a filter**, such as `jq .work cv.json` or `jq '.skills[].name' cv.json`: it applies
  the filter as jq does. A filter jq can't parse gives jq's error (FR-056).
- **A command line that never ends or prints without end**, such as `while true; do :; done` or
  `yes`: the shell stops it within the limit FR-069 sets, says it was stopped, and gives a new
  prompt. The page, the shell and the other windows keep responding throughout.
- **A command line with bash syntax the shell can't parse**, such as an unclosed quote: bash's
  syntax error, naming what it expected, and a new prompt.
- **The shell not loaded yet** when the Terminal first opens, such as on a slow connection: the
  starter command controls, the prompt and the command line show at once, the visitor can type, and a command run before
  the shell is ready runs as soon as it is (FR-070).
- **A click on the Terminal's screen** that isn't on a link or a control: focus goes to the command
  line, the screen doesn't scroll, and what was typed stays (FR-071). A click that ends a text
  selection keeps the selection and doesn't move focus.
- **The Terminal closed, minimized or the shell switched** with the vim view open: closing ends the
  view with the rest of the Terminal (FR-021). Minimizing and switching keep it open, with its
  cursor, folds and search.
- **Ctrl+D, Ctrl+U or Ctrl+F** in the vim view: they keep the browser's meaning on every system. Page Down and
  Page Up move by a page instead (FR-060).
- **A screen reader and a long output**, such as `projects`: only a one-line summary is announced,
  not every project, and the user reads the output from its start with their screen reader (FR-028).

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `006-terminal-FR-###`. UI implementing a requirement carries
`data-req="006-terminal-FR-###"` (Constitution III).

### Functional Requirements

**The app in both shells**

- **FR-001**: The Terminal MUST be an app of the OS shell (005 FR-003) that declares support for
  both shells. The dock and the home screen MUST show it after the CV app, so the CV app stays
  first and the CV path is unchanged (Constitution VII).
- **FR-002**: The Terminal MUST NOT open by itself. On first load the desktop shell MUST still show
  only the CV window open (005 FR-005), and the mobile shell the home screen.
- **FR-003**: On desktop the Terminal MUST open in a window that behaves as every app's window does
  (005 FR-012, FR-016 to FR-030 and FR-061 to FR-065), with its own menu in the menu bar holding a
  command that clears its output (FR-019). On mobile it MUST open full screen as every app does
  (005 FR-032 to FR-035).
- **FR-004**: Opening the Terminal MUST move focus to its command line, so the visitor can type at
  once, and a screen reader MUST announce the Terminal's name and the command line's name, as 005
  FR-040 allows an app made for typing to do.
- **FR-005**: When it opens, the Terminal MUST show a row of starter command controls that run a few
  commands, `help` first (FR-015), then a prompt, and no greeting text. The controls and the prompt
  MUST be site text set by the design (FR-030). Amended 2026-10-29: the Terminal opened with a
  short greeting that said what it is, named the owner and suggested `help`.

**Running commands**

- **FR-006**: The Terminal MUST show a command line after a prompt. Pressing Enter MUST run what
  was typed: the command appears in the output after the prompt, exactly as typed, then its
  output, then a new empty prompt.
- **FR-007**: Commands MUST be matched without regard to capitals and to spaces or tabs before,
  after or between words. An empty command MUST give a new prompt and no message.
- **FR-008**: The Terminal MUST offer at least these commands, each listed by `help` with a
  one-line description:

  | Command | What it shows or does |
  |---------|-----------------------|
  | `help` | Every command with its description. `help <command>` shows that command's own help. |
  | `about` | The CV's basics: name, label, location and summary. |
  | `work` | Every work entry. |
  | `projects` | Every project entry. |
  | `education` | Every education entry. |
  | `skills` | Every skill with its level and keywords. |
  | `languages` | Every language with its fluency. |
  | `interests` | Every interest with its keywords. |
  | `contact` | The email, the basics URL and every profile. |
  | `cv` | Opens the CV document's JSON in the vim view: runs `cat cv.json \| jq \| vim -` (FR-059). |
  | `site` | What the site is and how it was built, with a link to the repository. |
  | `specs` | The site's feature specs (FR-013). |
  | `ls [path]` | The folders and files of the working folder or of the path (FR-043). |
  | `cd [path]` | Changes the working folder. `cd` alone returns to the home folder. |
  | `cat <path>` | Shows a file. |
  | `jq [path]` | Pretty-prints JSON from the path or from piped input (FR-056). |
  | `vim <path>`, `vim -` | Opens the file, the piped input, or a new file, in the vim view, to read or edit (FR-058, FR-079). |
  | `pwd` | The working folder's path. |
  | `open <name>` | Opens the CV app (`open cv`), the Playground (`open playground`) or About this site (`open about`) in the shell. |
  | `history` | The commands run since the Terminal opened, oldest first. |
  | `clear` | Clears the output. |
  | `exit` | Closes the Terminal on desktop, or returns to the home screen on mobile. |

  The Terminal MUST also offer the standard commands of FR-068, and every command line follows
  the shell language of FR-067, pipes (FR-057) included. `whoami` MUST run `about`, `experience`
  MUST run `work`, and `?` MUST run `help`. `help` MUST list every command above and every alias
  with its description, then every standard command by name in a group of its own, each name a
  control that runs `help <name>` (FR-015), and there MUST be no command `help` doesn't list. `help <command>` MUST show any command's own help, standard
  commands included.
  Amended 2026-10-29: commands could only be joined with `|`, the Terminal offered no standard
  commands, and `help` listed only the commands above and their aliases. Amended 2026-10-29
  (008-typescript-playground): the `open <name>` row said "Opens the CV app (`open cv`) or About
  this site (`open about`) in the shell."
- **FR-009**: The output of every CV command other than `cv`, which shows the CV document's JSON
  (FR-055, FR-059), MUST show the same fields `/cv` shows for that section
  (004 Key Entities), in the CV document's order, and MUST follow 004's rules for them: an absent
  field is left out with no empty label (004 FR-004), every character is shown as written (004
  FR-007), the location reads as `/cv` writes it (004 FR-008), dates are written and read as `/cv`
  writes and reads them (004 FR-009 to FR-011), and the email, URLs and profiles are links whose
  text makes their purpose clear (004 FR-012 and FR-013).
- **FR-010**: Every word of CV text the Terminal shows MUST come from the CV document when the site
  is built. Changing a CV fact MUST take one edit, in the CV document, and no edit to the Terminal.
  The content check (002) MUST pass over the Terminal with no exception added for it
  (Constitution IV).
- **FR-011**: A CV command whose section is empty or absent in the CV document MUST say, in site
  text, that the CV lists nothing for it, and MUST show no empty list or heading.
- **FR-012**: Besides the named commands, the Terminal MUST offer a file system that holds the CV
  and the site as folders and files, browsed and searched with the shell's commands (FR-068), as
  FR-043 to FR-050 and FR-073 set. It holds the same CV as the named commands, and is never needed to read
  it.
  Amended 2026-10-29: the file system was a pretend one, browsed only with `ls`, `cd`, `cat` and
  `pwd`.
- **FR-013**: `specs` MUST list every feature spec the repository holds when the site is built,
  in numbered order. Each entry MUST show the spec's number, its name, its status and its count of
  active requirements, read as the requirement traceability check (001) reads them, so a removed
  requirement isn't counted, and MUST link to the spec in the repository. Nothing in the list may
  be typed by hand: a spec added, approved or changed MUST show at the next build with no edit to
  the Terminal.
- **FR-014**: `open cv`, `open playground` and `open about` MUST open, or bring to the front, the
  CV app, the Playground (008) or About this site exactly as the dock or the site menu does on
  desktop (005 FR-012, FR-064) and as the home screen does on mobile, where the Playground shows
  its "best on desktop" screen (008 FR-058). `open` with any other name MUST list the names it
  accepts. Amended 2026-10-29 (008-typescript-playground): it said "`open cv` and `open about`
  MUST open, or bring to the front, the CV app or About this site".

**The shell** (added 2026-10-29)

- **FR-067** (added 2026-10-29): Every command line MUST be run by the Terminal's own bash-like shell, with bash's
  meaning for at least: pipes (FR-057); `;`, `&&` and `||`; single and double quotes and
  backslash escapes; variables, `$VAR`, `${VAR}`, `${VAR:-default}`, `export` and `$?`; globs
  `*`, `?` and `[...]`; redirects `>`, `>>`, `2>`, `2>&1` and `<`; `if`, `for`, `while` and
  `until`; and functions. Variables and functions last until the Terminal closes (FR-021). The
  commands of FR-008 MUST behave as commands of that shell: they can be piped, redirected,
  chained and run in loops.
- **FR-068** (added 2026-10-29): Besides the commands of FR-008, the shell MUST offer the standard commands a bash
  user expects, at least `echo`, `printf`, `grep`, `head`, `tail`, `wc`, `sort`, `uniq`, `cut`,
  `tr`, `sed`, `awk`, `find`, `tree`, `cp`, `mv`, `rm`, `mkdir`, `touch`, `tee`, `xargs`, `diff`,
  `seq`, `date`, `env`, `which`, `basename`, `dirname`, `true` and `false`. `ls`, `cd`, `cat`,
  `pwd` and `history` MUST also take bash's common options for them, such as `ls -la` and
  `cat -n`, still naming files as FR-044 and FR-050 set. Each standard command MUST behave as its
  GNU version does for the options its own `--help` lists, and MUST answer `--help`. Four
  differences from bash and GNU are allowed, and no other: `tee` refused a write to a protected
  file may name a reason other than "Permission denied", with the file still unchanged (FR-049);
  `env` may also list variables that weren't exported, while `export -p` lists only those that
  were; `jq`'s error messages may be worded otherwise than jq 1.7's, still starting `jq:`, with a
  non-zero status (FR-056); and a command line's error output is shown after its other output,
  not interleaved with it. Each goes once the shell no longer has it. No command
  may reach the network, run a real program or run code in another language, so the shell offers
  no `curl`, `wget`, `ssh`, `python`, `node` or the like (FR-022). Where a standard command's name
  is also a command of FR-008, such as `whoami`, FR-008's meaning wins.
- **FR-069** (added 2026-10-29): A command line MUST be stopped, with a message in site text that says it ran too
  long or printed too much, and a new prompt, once it has run for 5 seconds, run 10,000 of its own commands
  or printed 1 MB, whichever comes first. While a command line runs, the Terminal's screen, the
  shell's windows and the rest of the page MUST keep responding to input.

**The file system**

- **FR-043**: The file system MUST start at a home folder, shown as `~`. The home folder MUST hold
  a file `cv.json` (FR-055), a file `about` (the CV's basics), a file `contact`, a folder `work` with one file per work
  entry, a folder `projects` with one file per project, a folder `education` with one file per
  education entry, files `skills`, `languages` and `interests`, a file `readme` with what `site`
  shows, and a folder `specs` with one file per feature spec (FR-013). A CV section that is empty
  or absent in the CV document MUST be left out. `ls` MUST list the home folder in the order the
  approved design sets, entries in the CV document's order and specs in numbered order. Folders
  MUST be told apart from files by more than color, such as a trailing slash.
- **FR-044**: Every file of a CV entry or a spec MUST be named from the entry's identifying field
  (002 Key Entities): the organization's name for work, the project's name, the institution for
  education, and the spec's folder name for specs. Names MUST be in lower case, with accents
  removed, letters and digits kept, and every other run of characters becoming one hyphen. When
  two entries would get the same name, each MUST get its start year added, and then a number if
  they are still the same. The same CV document MUST always give the same names, and no name may
  be typed by hand.
- **FR-045**: Every command MUST accept a path relative to the working folder, with `.` and `..`,
  a path from the home folder starting with `~/`, or a path from the root starting with `/`, and
  globs such as `~/work/*` (FR-067). The home folder MUST be `/home/guest`, shown as `~`, and the
  root MUST hold only `home` and `tmp` and whatever the plan needs for the shell to run. Names of
  the home folder's files and folders MUST be matched without regard to capitals.
  Amended 2026-10-29: only `ls`, `cd` and `cat` took paths, with no globs; `/` meant the home
  folder, and `..` in the home folder stayed there.
- **FR-046**: The prompt MUST show the working folder's path, with `~` for the home folder, and
  `pwd` MUST show the same path.
- **FR-047**: `cat` on a CV entry's file MUST show exactly what the matching named command shows
  for that entry (FR-009). `cat about`, `cat contact`, `cat skills`, `cat languages` and
  `cat interests` MUST show what `about`, `contact`, `skills`, `languages` and `interests` show,
  `cat readme` what `site` shows, a spec's file the entry `specs` shows for it, and `cat cv.json`
  the JSON as FR-055 sets.
- **FR-048**: A path that doesn't exist MUST get a reply, in site text, that names the path as
  typed and says there is no such file or folder. `cd` on a file MUST say it is a file and suggest
  `cat`, and `cat` on a folder MUST say it is a folder and suggest `ls`, each as a command control
  (FR-015). `ls` on a file MUST list that file alone.
- **FR-049**: Every file and folder built from the CV document and the spec list (FR-043,
  FR-055) MUST be protected, and so MUST the root and `/home`. A command that would change, move,
  rename or delete a protected file or folder, or create something inside a protected folder,
  such as `rm`, `mv`, `touch`, `mkdir`, `cp` onto it or a redirect into it, MUST leave it as it
  was and give bash's "Permission denied", naming the path as typed (FR-068 allows another
  reason for `tee`). `ls -l` MUST show protected
  files and folders as read only and owned by someone other than the visitor. The home folder
  itself is not protected (FR-073). Amended 2026-10-29: the whole file system was read only, and
  such commands had the reply for an unknown command.
- **FR-050**: In the output of `ls`, every folder name MUST be a command control that runs `ls`
  with that folder's path from the home folder, and every file name one that runs `cat` with its
  path from the home folder (FR-015), so the whole file system can be read without typing.
- **FR-073** (added 2026-10-29): Outside the protected files and folders (FR-049), the visitor
  MUST be able to create, change, move, copy and delete files and folders as in bash, with any
  command or redirect, in the home folder, in folders they made and in `/tmp`. `/tmp` and the
  visitor's files MUST be gone each time the Terminal opens, MUST together hold at most 1 MB, past
  which a write MUST give bash's "No space left on device" error, and MUST never leave the
  browser or outlast the Terminal (FR-021, FR-022). `ls` of the home folder MUST list the
  visitor's files and folders after the built ones, in name order, marked as FR-043 marks folders,
  and they MUST be command controls as FR-050 sets.

**Help for visitors who don't know terminals**

- **FR-015**: Every starter command control (FR-005), every command name in the output of `help`,
  every command offered after an unknown one (FR-016) or a wrong path (FR-048), every name in the
  output of `ls` (FR-050) and every key of the pocket terminal (FR-051) MUST be a control that runs
  that command when activated with a click, a tap, Enter or Space. A name in `help`'s group of
  standard commands (FR-008) MUST run `help <name>` instead, as most standard commands need an
  argument. Running it MUST behave as if the command had
  been typed and Enter pressed, including in the output and the command history, MUST NOT open the
  on-screen keyboard, and MUST return focus to the command line.
  Amended 2026-10-29: the controls were the command names in the greeting and in `help`, and every
  name in `help` ran its own command.
- **FR-016**: A command the Terminal doesn't know MUST get a reply, in site text, that names what
  was typed, shown exactly as typed, says it is not a command, and mentions `help`. The reply MUST
  offer, as controls (FR-015), every command of FR-008 or alias whose name is at most 2
  single-letter edits from the typed word, or at most 1 when the typed word has 3 letters or fewer
  (a letter added, removed or changed, or two neighbouring letters swapped), and every command of
  FR-008 whose name begins with the typed word when it is at least 2 letters long, closest first
  and at most 3. Capitals don't count as edits. The standard commands of FR-068 are never
  offered: a bash user already knows them, and `sudo` would be offered `sed`. When none
  qualifies, the reply offers only `help`. The reply MUST start as bash's does, with the word
  typed and "command not found". Amended 2026-10-29: the reply's start wasn't set, and every
  command was one of FR-008, as there were no standard commands.
- **FR-017**: A command of FR-008 with an argument it doesn't take, or missing one it needs, MUST
  get a reply that says so and shows how to use the command. A standard command (FR-068) with a
  wrong option or argument MUST give the error bash's version of it gives. The command line MUST accept at least 200
  characters and MAY stop accepting more after a limit the design sets.
  Amended 2026-10-29: the first sentence covered every command, and there were no standard
  commands.
- **FR-018**: Typed and pasted text MUST be shown exactly as typed, and MUST never be rendered as
  markup, turned into a link, or run as anything but a command line of the Terminal's own shell
  (FR-067), which runs no code of the page, the browser or any real program. Output MUST be shown
  as text, so a file or command that prints markup shows the markup. Line breaks in pasted text
  MUST become spaces, and nothing MUST run until Enter is pressed.
  Amended 2026-10-29: typed text MUST never be run as code, and nothing said output is shown as
  text.

**Output, history and scrolling**

- **FR-019**: The output MUST keep every command and its output until `clear` or the Terminal's
  clear command is used, or the Terminal is closed. The Terminal MUST scroll its output inside its
  window or full-screen view, never the page, and after a command runs it MUST show the start of
  that command's output, with the command at the top of the view when the output is longer than
  the view.
- **FR-020**: In the command line, the Up and Down arrows MUST step through the commands run since
  the Terminal opened, newest first, without running them. Down past the newest MUST give back
  what the visitor had typed before stepping. `history` MUST list the same commands.
- **FR-021**: Closing the Terminal MUST clear its output, its command history, its variables and
  every file and folder the visitor made (FR-073), and return its working folder to the home
  folder.
  Minimizing it, going home on mobile and the shell switching between desktop and mobile MUST
  keep all of them, along with what was typed and the scroll position (005 FR-002, FR-034).
  Amended 2026-10-29: closing cleared only the output and the command history, as there were no
  variables or visitor's files.
- **FR-022**: Nothing typed in the Terminal MUST leave the visitor's browser or be kept after the
  visit ends. The Terminal MUST make no request to any other site (005 FR-054).
- **FR-023**: Output MUST wrap within the Terminal's width at every window and screen size the
  shell allows, from 320 px wide, so nothing needs horizontal scrolling. A long word or URL MUST
  wrap too (as 004 FR-022 requires of `/cv`). Text in the output MUST be selectable and copyable
  as it is on a page. The vim view wraps as FR-063 sets.

**The phone**

- **FR-024**: On mobile, the Terminal MUST be deliberately a little odd: it MUST look like a
  pocket terminal, a small handheld terminal of the site's own design, with a screen that holds
  the prompt, the command line and the output, and command keys below or beside it, as FR-051 to
  FR-054 set. Every other requirement of this spec MUST still hold.
- **FR-025**: On mobile, every CV section, the site's story, the spec list and every file MUST be
  possible to reach without typing, through the command keys (FR-051) and the command controls in
  the output (FR-015, FR-050). When the on-screen keyboard is open, the command line and the newest
  output MUST stay visible above it.

- **FR-051**: The pocket terminal MUST have command keys that run at least `help`, `about`,
  `work`, `projects`, `cv`, `ls` and `clear`, in the order the approved design sets. Every key MUST
  be a command control (FR-015), a button named by the command it runs, with a target of at least
  44 by 44 CSS px. While the vim view is open the keys are vim keys (FR-066).
- **FR-052**: At every width from 320 px up to the desktop shell's minimum, in portrait and in
  landscape, the pocket terminal's screen and keys MUST fit below the shell's header (005 FR-032)
  with nothing needing horizontal scrolling, and the output MUST scroll inside the screen. At 200%
  text zoom the keys MAY take more rows, or scroll, but none may be cut off or hidden.
- **FR-053**: While the on-screen keyboard is open, the command keys MUST give it room, so the
  command line and the newest output stay visible above the keyboard (FR-025). When the keyboard
  closes, the keys MUST come back as they were.
- **FR-078** (added 2026-10-30): The pocket terminal's command keys MUST include a Tab key, a
  button named for completing, at least 44 by 44 CSS px, in the place the approved design sets.
  With text before the cursor it MUST complete as Tab does (FR-076), a second press in a row
  listing the matches; with none it MUST change nothing. Pressing it MUST keep the on-screen
  keyboard open, and focus in the command line.
- **FR-054**: The pocket terminal's drawn case MUST be decoration only: it MUST NOT be announced by
  screen readers, take focus or carry meaning. It MUST be of the site's own design and MUST NOT
  copy or trace any real device (Constitution IX). A pressed key MAY show a pressed state, which
  MUST NOT move or scale when the visitor asks for reduced motion (FR-032).

**The CV as JSON in a vim view**

- **FR-055**: The home folder MUST hold a file `cv.json` whose text is the CV document's JSON
  exactly as the content source (002) holds it, every key and value in its order, read when the
  site is built. No part of it may be typed by hand, and `cat cv.json` MUST show it as it is.
- **FR-056**: `jq` MUST take a filter, with jq's filter language, and a path or piped input, and
  MUST print what jq prints for them. With no filter, or `.`, it MUST pretty-print the JSON:
  indented by 2 spaces, keys in their order, with syntax colors for keys, strings, numbers,
  booleans and null that carry no meaning on their own. Input that isn't JSON, or a filter jq
  can't parse, MUST give a jq error (FR-068). Amended 2026-10-29: `jq` took no filter but `.`.
- **FR-057**: A command line MAY join any commands with `|`, with bash's meaning: each command's
  output becomes the next command's input. The output of the commands of FR-008 MUST be piped as
  the text they show, so `work | grep -i rest` works. A command that reads no input MUST run and
  ignore it, as in bash, and a `|` with nothing on one side MUST give bash's syntax error.
  Amended 2026-10-29: only `jq` and `vim -` read input, and piping into another command got a
  reply that it doesn't read piped input.
- **FR-058**: `vim <path>` and `vim -` with piped input MUST open the vim view: the text shown in
  place of the Terminal's output, filling the Terminal window, or the pocket terminal's screen,
  with line numbers, a status line and a message line. The status line MUST show the mode, the
  file's name, whether it is read only or changed since it was last written, the file type, the
  cursor's line and column, and how far through the file the view is. A new file MUST be marked
  `[New]` in the message line when the view opens and in the message `:w` gives (FR-080). `vim`
  on a folder MUST get the reply FR-048 sets, and `vim -` with nothing piped or `vim` alone the
  usage reply (FR-017), without opening the view. `vim` on a path that doesn't exist MUST open an
  empty, new file (FR-080). Amended 2026-10-30: the status line always said the file was read
  only, and a path that didn't exist got FR-048's reply. Amended 2026-10-30 (from
  `/speckit-analyze`): the status line showed whether the file was new.
- **FR-059**: `cv` MUST run `cat cv.json | jq | vim -` as if typed, and the status line MUST show
  that pipe. `help` MUST say what `cv` runs.
- **FR-060**: The vim view MUST support at least these keys in normal mode: `h`, `j`, `k`,
  `l` and the arrow keys, `w` and `b`, `0` and `$`, `gg` and `G`, `{` and `}`, Page Up and Page
  Down, `/` with text and Enter to search, `n` and `N`, `za`, `zo`, `zc`, `zR` and `zM` for
  folds, `:` with a line number, `:set nu` and `:set nonu`, `:help`, and `:q` and `:q!`, with the
  editing keys and commands of FR-079 and FR-080. Its messages MUST be vim's own, such as `E37`,
  `E45` and `W10`, with vim's wording. An unknown `:` command MUST show vim's "Not an editor
  command" error naming it. Escape MUST cancel a `/` or `:` being typed. The view MUST NOT take
  Ctrl+D, Ctrl+F or Ctrl+U on any system, nor any other key a current main browser or screen
  reader reserves on the visitor's system (FR-026). Amended 2026-10-29: it named Ctrl+D, Ctrl+F
  and Ctrl+U as keys every browser reserves. Amended 2026-10-30: the view was read only, and keys
  and commands that would change the file, such as `i`, `a`, `o`, `x`, `dd`, `p`, `:w` and `:wq`,
  changed nothing and showed a message, in site text, that the file was read only; an unknown `:`
  command got a message in site text.
- **FR-061**: JSON in the vim view MUST open with each top-level object or array closed to one
  fold line that names its key and its number of lines, and everything else open. Each fold line
  MUST be a control that opens or closes the fold when clicked, tapped, or activated with Enter
  or Space, with a target of at least 24 by 24 CSS px (FR-034).
- **FR-062**: A search MUST highlight every match in view and mark the current one by more than
  color. The message line MUST say which match of how many the cursor is on, or that there is no
  match.
- **FR-063**: Long lines in the vim view MUST wrap at a space, each continuation indented under its
  line, at every width from 320 px, so nothing needs horizontal scrolling. Line numbers MUST be
  shown on a line's first row only.
- **FR-064**: `:q`, or the `:q` control in the message line, MUST close the vim view and bring
  back the Terminal's output as it was, with the command that opened the view after its prompt,
  then a new prompt, with focus in the command line. With changes not yet written, `:q` and its
  control MUST instead keep the view open and give vim's `E37` error, and `:q!` MUST close it
  without writing them (FR-080). Amended 2026-10-30: `:q` always closed the view. `:help`, or its control, MUST open the
  view's keys in a split below the file, and `:q` MUST close that split first.
- **FR-065**: When the vim view opens, focus MUST move into it, and a screen reader MUST announce the
  file's name, whether it is read only or new, its number of lines, and that `:q` leaves. The text
  MUST be readable with the screen reader's own reading keys, fold lines MUST be buttons that say
  whether they are open, and a change to the mode, the status line or the message line MUST be
  announced once. In insert mode, what is typed and deleted MUST be announced as in a text field.
  In normal mode, Tab and Shift+Tab MUST move focus out of the view's text, Tab to its `:help`
  and `:q` controls (FR-064); in insert mode, Shift+Tab MUST, and Escape then Tab MUST, so focus
  is never trapped (FR-026, FR-079). Amended 2026-10-30: the view was always read only, announced
  as read only, and Tab always left it. Amended 2026-10-30 (from `/speckit-analyze`): it said
  focus moved out of the view, where the `:help` and `:q` controls are.
- **FR-066**: On mobile, while the vim view is open, the pocket terminal's command keys MUST become
  vim keys: `j`, `k`, `za`, `/`, `n`, `gg`, `G`, `i`, `u`, `:w` and `:q`, and in insert mode
  `Esc`, in the order the approved design sets, each a button named by what it does, at least 44
  by 44 CSS px. Entering insert mode MUST open the on-screen keyboard, and a tap on the text MUST
  move the cursor there. Closing the view MUST bring the command keys back. Fold lines MUST be
  tappable. Amended 2026-10-30: the vim keys had no `i`, `u`, `:w` or `Esc`, and the view took no
  typing.

- **FR-079** (added 2026-10-30): The vim view MUST edit text as vim does, with at least: `i`, `a`,
  `I`, `A`, `o` and `O` to enter insert mode, where typed text is inserted, Backspace and Delete
  delete, Enter splits the line, Tab inserts a tab, the arrow keys move, and Escape returns to
  normal mode; in normal mode `x`, `dd`, `dw`, `D`, `cw`, `cc`, `C`, `r` with a character, `J`,
  `yy`, `yw`, `p` and `P`, a count before a move or any of these, such as `3dd`, and `.` to repeat
  the last change; `u` to undo and `:redo` to redo, and Ctrl+R to redo on systems where no current
  main browser reserves it, such as macOS (FR-026). The status line MUST show `-- INSERT --` in
  insert mode. A click or tap on the text MUST move the cursor there. Editing a closed fold MUST
  act on it as vim acts on a closed fold, and a change inside one MUST open it.
- **FR-080** (added 2026-10-30): `:w` MUST write the view's text to its file, `:w <path>` to that
  path, and `:wq`, `:x` and `ZZ` MUST write and close the view, each as vim does, with vim's
  message saying what was written. Writing MUST follow FR-073: the file appears or changes in the
  shell's file system at once, and a write past the 1 MB limit MUST give vim's write error and
  change nothing. A view with no file name, as opened by `vim -`, MUST give vim's `E32` error for
  `:w` without a path. A path that can't be written, inside a protected folder or a folder that
  doesn't exist, MUST give vim's error for a file it can't open for writing, and change nothing.
  `:q!` MUST close the view without writing, and closing the Terminal MUST end it with its
  changes unwritten (FR-021).
- **FR-081** (added 2026-10-30): A protected file (FR-049) MUST open in the vim view marked read
  only, as vim marks a file it may not write. It MAY be changed on screen, with vim's `W10`
  warning at the first change. `:w`, `:wq` and `:x` MUST give vim's `E45` error, `:w!` vim's error
  for a file it can't open for writing, and the file MUST stay as it was. `:w <path>` to a path the
  visitor may write MUST write the changed text there, so a visitor can keep an edited copy.

**Keyboard and screen readers**

- **FR-026**: Focus MUST never be trapped in the command line (WCAG 2.2 success criterion 2.1.2,
  005 FR-030): Shift+Tab MUST always move focus out of it; Tab MUST move focus out of an empty
  command line, or one holding only spaces before the cursor; and Escape then Tab MUST move focus
  out whatever was typed. Otherwise Tab completes (FR-076). The command line's accessible
  description and `help` MUST say that Tab completes and how to leave (FR-077). The shell's
  shortcuts MUST keep working while focus is in the command line (005 FR-025 to FR-029). The
  Terminal MUST add no shortcut that takes over one a current main browser or screen reader
  reserves (005 FR-029). Amended 2026-10-30: Tab and Shift+Tab always moved focus out and never
  completed or inserted text.
- **FR-027**: The command line MUST have an accessible name that says it takes a command. The
  prompt MUST NOT be read as part of what was typed.
- **FR-028**: After a command runs, its output MUST be announced to screen readers once, without
  moving focus from the command line. Output of at most 5 lines, as shown at a desktop width, MUST
  be announced in full. Longer output MUST be announced as a one-line summary in site text that
  names the command and how many entries, files or lines it showed, such as "work: 4 entries",
  and the full output MUST stay available to read with the screen reader (FR-029). Output that
  only scrolls into view, such as earlier output, MUST NOT be announced again. Opening the vim view
  is announced as FR-065 sets.
- **FR-029**: In the output, each command and its output MUST form one group named by the command.
  The Terminal MUST have one heading that names it, and each command run MUST be a heading one
  level below it, holding the command as typed and not the prompt. In a command's output, each
  section MUST be a heading one level below the command, and each work, project and education
  entry a heading one level below its section, or one level below the command when the command
  shows a single section, such as `work`. No level may be skipped. Lists MUST be lists, links
  MUST be links, and command controls (FR-015) MUST be buttons named by the command they run. The
  reading order MUST follow the visual order.
- **FR-071** (added 2026-10-29): A click or tap anywhere on the Terminal's screen, its output
  included, that isn't on a link or a control MUST move focus to the command line, without
  scrolling the output or changing what was typed. A click that ends a text selection MUST keep
  the selection and MUST NOT move focus (FR-023). On mobile, such a tap MAY open the on-screen
  keyboard, as tapping the command line does (FR-053).
- **FR-072** (added 2026-10-29): The command line MUST look like a terminal's: no box, border,
  outline or background around it, focused or not. Its block cursor MUST be its focus indicator:
  filled while the command line has focus, hollow when it doesn't, each with a contrast of at
  least 3:1 against the screen behind it (WCAG 2.2 success criteria 1.4.11 and 2.4.7). Every other
  control in the Terminal keeps the site's focus indicator.
- **FR-074** (added 2026-10-29): The command line MUST take the visitor's system's own
  line-editing keys, with the block cursor and any selection shown where they are after each key:
  Left and Right by character; Cmd+Left and Cmd+Right on macOS, and Home and End everywhere, to
  the line's start and end; Option+Left and Option+Right on macOS, and Ctrl+Left and Ctrl+Right
  elsewhere, by word; Shift with any of these to select; Backspace and Delete; Option+Backspace on
  macOS, and Ctrl+Backspace elsewhere, to delete a word; Cmd+Backspace on macOS to delete to the
  line's start; and the system's undo and redo. On macOS it MUST also take the readline keys a
  terminal user expects: Ctrl+A and Ctrl+E to the line's start and end, Ctrl+B and Ctrl+F by
  character, Ctrl+K to delete to the end, Ctrl+U to delete to the start, Ctrl+W to delete the word
  before the cursor, and Ctrl+L to clear the screen as `clear` does, keeping the line. Selected
  text in the command line MUST be shown as selected, never hidden.
- **FR-075** (added 2026-10-29): Cmd+A on macOS, and Ctrl+A elsewhere, with focus in the command
  line or the output, MUST select all of the Terminal's text, the output and the command line,
  and nothing outside the Terminal, as a terminal window does. The system's copy then MUST copy
  that text as shown, without the cursor or any control's name added. Ctrl+C with no text
  selected MUST cancel what was typed, showing it with `^C` after it and giving a new prompt, or,
  while a command line runs, stop it as FR-069 stops one, saying it was stopped. Up and Down keep
  stepping through the history (FR-020). No key of this requirement or FR-074 may take over one a
  current main browser or screen reader reserves on the visitor's system (FR-026, 005 FR-029); in
  the vim view, its own keys apply (FR-060).
- **FR-076** (added 2026-10-30): Tab with text before the cursor MUST complete the word before the
  cursor as bash's own completion does, with no completion scripts: the first word of a command
  against the site's commands and aliases, the standard commands, the shell's builtins and
  keywords, the functions the visitor defined and the folders of the working folder; any later
  word, and a word after a redirect, against the paths in the shell's file system, from the working folder, `/` or `~`. One match MUST be
  completed, followed by a space for a command or file and a `/` for a folder. Several matches
  MUST be completed as far as they all agree; when that adds nothing, a second Tab in a row MUST
  list them below the line, in columns, folders marked as `ls` marks them, then show the prompt
  and the line again, unchanged. 100 matches or more MUST first ask bash's
  `Display all N possibilities? (y or n)`. No match MUST change nothing. A word inside quotes
  MUST keep its quote. The listed matches are output: they scroll and select as output does and
  are never command controls. Amended 2026-10-30 (from `/speckit-plan`): it said more than 100
  matches. Amended 2026-10-30 (from `/speckit-analyze`): the first word's list left out keywords
  and folders, and named aliases the visitor defined, which the shell doesn't have (`alias` is
  out of scope).
- **FR-077** (added 2026-10-30): A completion MUST be announced to screen readers once: the
  line's new text after a completion, or the number of matches when a second Tab lists them,
  without reading the list (FR-028). The command line's accessible description MUST say that Tab
  completes and that Escape then Tab leaves, and `help` MUST say the same in its text about the
  command line. The keyboard check covers both (FR-039).

**Look, motion and accessibility**

- **FR-030**: Text in the Terminal that isn't CV content, such as the prompt, the command names,
  their descriptions, the replies of FR-011, FR-016 and FR-017, and the text of `site`, MUST be in
  English, MUST be set by the approved design, and MUST NOT contain a CV fact typed by hand (as 004
  FR-006 and 005 FR-043 require).
  Amended 2026-10-29: the first example was the greeting.
- **FR-031**: The Terminal's look MUST be the site's own. It MUST NOT copy or trace the look of
  macOS's Terminal, its icon or its default themes, nor any other terminal's (Constitution IX).
  Text MUST use the site's fonts (004 FR-045). The Terminal MUST match the approved mockup for each
  shell (Constitution II), every design value MUST come from tokens and motion values from the
  motion token source, and the token check (003) MUST pass over it with no exception added.
- **FR-032**: Output MUST appear at once, never typed out letter by letter. While the command
  line has focus its cursor MUST blink, as a terminal's does, and MUST stop blinking, staying
  filled, within 5 seconds of the last key press (WCAG 2.2 success criterion 2.2.2). A key press
  MUST start it blinking again. When the visitor asks for reduced motion, the cursor MUST NOT blink and no part of the
  Terminal may move or scale, except scrolling (Constitution VIII).
  Amended 2026-10-29: the cursor MAY blink, and nothing said a key press starts it again.
- **FR-033**: With forced colors active, the prompt, typed commands, output, links, command
  controls, the command line, its cursor, focus indicators and, on mobile, the pocket terminal's
  screen and keys MUST stay visible and distinguishable. None may rely on a background image or a
  background color alone. When the visitor asks for reduced transparency, the Terminal's glass
  MUST become a solid surface, with nothing behind it showing through.
- **FR-034**: Every control in the Terminal, including command controls in the output, MUST have a
  target of at least 24 by 24 CSS px (WCAG 2.2 success criterion 2.5.8), or larger where this spec
  (FR-051) or the approved design sets it.
- **FR-035**: The Terminal MUST conform to WCAG 2.2 Level AA in every state: just opened, after
  `help`, with the vim view open (folded, with a fold open and a search, and with its key help),
  after an unknown command, after `ls`, inside a folder after `cat`, after `clear`, with a long
  command typed and, on desktop, after `specs`, with its menu open, minimized, maximized, and as one
  of two open windows, and on mobile, as the pocket terminal in portrait and in landscape, and with
  the on-screen keyboard open, and with the vim view and its vim keys. It MUST keep all content and
  function at 200% browser zoom and text-only zoom, at 400% zoom on a window 1280 px wide, and with
  text spacing overridden as WCAG 2.2 success criterion 1.4.12 describes.

**Offline**

- **FR-036**: After one complete online visit to the site root or `/cv`, the Terminal MUST open and
  every command MUST give the same output with no network as online, in the site's fonts
  (Constitution VI, 005 FR-052). No command MUST need the network, so the Terminal MUST show no
  offline message.
- **FR-070** (added 2026-10-29): The shell's code (FR-067, FR-068) MUST NOT be part of what the
  site root or `/cv` load. It MUST load when the Terminal first opens in a visit, and the site's
  offline copy MUST hold it after one complete online visit (FR-036). Until it is ready, the
  starter command controls, the prompt and the command line MUST show and take typing, and command lines run
  before then MUST run in order once it is. If it can't load, the Terminal MUST say so in site
  text, with a control that tries again.

**Traceability and checks**

- **FR-037**: Every element that implements a requirement in this spec MUST carry
  `data-req="006-terminal-FR-###"`, listing every requirement it implements, and the requirement
  traceability check (001) MUST pass.
- **FR-038**: The accessibility check (004, 005 FR-056) MUST cover every Terminal state FR-035
  lists, at a phone width and a desktop width. The other-site check MUST cover opening the Terminal
  and running every command.
- **FR-039**: The keyboard check (005 FR-057) MUST, at a desktop width and with the keyboard alone,
  open the Terminal from the dock, run `help`, run a command from its output with Enter, recall a
  command with the Up arrow, run `cv`, move with `j`, open a fold with `za` and leave the vim view
  with `:q`, leave the empty command line with Tab and come back with Shift+Tab, complete `ab` to
  `about ` with Tab and leave the typed line with Escape then Tab, open `vim todo`, type a line in
  insert mode, write it with `:wq` and confirm `cat todo` shows it, reach
  the dock with the shell's shortcut, and close the Terminal with `exit`, confirming a visible
  focus indicator and where focus lands at each step. In the command line, the visible focus
  indicator is its filled cursor (FR-072), and the check MUST confirm that the cursor is filled
  there and hollow once focus leaves. It MUST also, in the command line, move to the line's start
  and end and by word with the keys FR-074 sets for the check's system, delete a word, select all
  with the key FR-075 sets and confirm the selection holds the Terminal's text and nothing else,
  and cancel a typed line with Ctrl+C.
  Amended 2026-10-29: the check didn't cover the cursor, the line-editing keys, select all or
  Ctrl+C. Amended 2026-10-30 (from `/speckit-plan`): the completion step completed `wo` to `work `,
  which bash doesn't do from the home folder.
- **FR-040**: A Terminal content check MUST run every CV command in each shell and confirm that its
  output holds every shown field the CV document holds for that section, in the CV document's
  order, and that `cat cv.json`, `cat cv.json | jq` and the vim view opened by `cv` hold the CV
  document's JSON exactly, every key and value in its order. It MUST also list every folder of the
  file system and `cat` every file, confirming there is one file per CV entry and that each shows
  what the matching named command shows for that entry. It MUST read the expected fields and
  entries from the CV document, not from a hand-written list. It MUST also run, in each shell, a
  pipe from a command of FR-008 into `grep`, a `grep` over the work folder, a `jq` filter on
  `cv.json`, a file made, moved and removed in the home folder, a write to a protected file, and a
  command line that never ends, confirming each gives what FR-049, FR-056, FR-057, FR-069 and
  FR-073 set.
  Amended 2026-10-29: the check ran no pipe, `grep`, `jq` filter, write or line that never ends.
- **FR-041**: The offline check (005 FR-059) MUST also open the Terminal with no network at a phone
  width and a desktop width and run every command `help` lists, confirming each output matches the
  online one.
- **FR-042**: The checks of this spec MUST run in the same one command and on the same pull
  requests as 004's and 005's, give the same result locally and on the pull request, and name the
  shell, the state, the width and the command in every failure.

### Key Entities

- **Terminal**: the app this feature adds. It declares both shells and doesn't need the network.
- **Command**: a word the Terminal runs, with an optional argument, a one-line description and its
  own help. Every command is listed by `help`.
- **Shell**: the Terminal's own bash-like interpreter, which runs every command line with bash's
  meaning (FR-067). It runs nothing outside the Terminal and loads when the Terminal first opens
  (FR-070).
- **Standard command**: a command of the shell that a bash user expects, such as `grep` or `wc`,
  behaving as its GNU version does (FR-068).
- **Command line (as run)**: what the visitor typed, in the shell's language: one or more commands
  joined by pipes, `;`, `&&` or `||`.
- **Alias**: another word for a command, such as `whoami` for `about`, also listed by `help`.
- **CV command**: a command that shows one or more sections of the CV document, the same fields
  `/cv` shows (004 Key Entities).
- **Prompt**: the site text shown before the command line and before each command in the output.
- **Command line**: where the visitor types a command. It has an accessible name.
- **Output**: every command run since the Terminal opened or was cleared, each with what it showed,
  grouped by command.
- **Command history**: the commands run since the Terminal opened, stepped through with the arrow
  keys and listed by `history`. Kept only while the Terminal is open in the visit.
- **Command control**: a command name in the output that runs that command when activated.
- **Spec list**: the site's feature specs, each with its number, name, status and count of active
  requirements, read from the repository when the site is built (FR-013).
- **File system**: the folders and files of the CV and the site, protected, and the visitor's own,
  with the home folder
  at `/home/guest` (FR-043, FR-045). Built from the CV document and the spec list, never typed by
  hand.
- **Protected file**: a file or folder built from the CV document or the spec list, which no
  command can change, move or delete (FR-049).
- **Visitor's file**: a file or folder the visitor made in the Terminal, gone when it closes
  (FR-073).
- **Cursor**: the command line's block cursor, filled and blinking with focus, hollow without; the
  command line's focus indicator (FR-072). It follows every line-editing key (FR-074).
- **Folder**: a named group of files, such as `work`, with one file per entry.
- **File**: a named piece of the CV or the site that `cat` shows, such as one work entry. Its name
  comes from the entry's identifying field (FR-044).
- **Working folder**: the folder the visitor is in, shown in the prompt. It starts at the home
  folder each time the Terminal opens.
- **Path**: how a visitor names a file or folder, from the working folder or from the home folder.
- **Pocket terminal**: the Terminal's look on mobile, a small handheld terminal of the site's own
  design, with a screen, command keys and a drawn case that is decoration only (FR-024).
- **Command key**: a key of the pocket terminal that runs one command (FR-051).
- **CV document**: the owner's CV from the content source (002), read by the Terminal as `/cv`
  reads it (004).
- **Site text**: text in the Terminal that isn't CV content, set by the design, in English.
- **`cv.json`**: the CV document's JSON as the content source holds it, a file in the home folder
  (FR-055).
- **Pipe**: commands joined with `|`, each one's output the next one's input, with bash's meaning
  (FR-057).
- **Vim view**: the vim-like view of a file, piped text or a new file, with line numbers, folds,
  search, insert mode and vim's editing keys, a status line and a message line; it writes the
  visitor's files and not protected ones (FR-058 to FR-066, FR-079 to FR-081). Amended
  2026-10-30: it was read only.
- **Completion**: what Tab adds to the word before the cursor, or the list of matches a second
  Tab shows, from the commands and the file system as bash completes them (FR-076, FR-077).
  (added 2026-10-30)

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: a Terminal window opened from the dock, with its own menu | - |
| Mobile (iOS-style) | Yes: the Terminal full screen from the home screen, as the pocket terminal, with command keys and commands that run without typing | - |

**CV path**: Unchanged. The CV app stays first in the dock and on the home screen, the desktop
still opens with only the CV window open, and the Terminal never opens by itself (FR-001,
FR-002). The CV stays zero clicks away on desktop and one tap away on mobile, and `/cv` remains a
plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after one online visit.
- **Available offline**: the Terminal, its shell and every command, with the same output as online,
  after one visit to the site root or `/cv` (FR-036, FR-070).
- **Needs the network**: nothing the Terminal does. Following the repository link, a spec link or a
  profile or project link leads to another site, as any link does.
- **Offline state shown**: the Terminal itself, complete. It shows no offline message, as nothing
  in it is missing offline.

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/006-terminal/design/`:

- [x] ASCII wireframes, per shell, of every state: on desktop, the Terminal just opened beside the
  CV window, after `help`, the vim view opened by `cv` (folded, with a fold open and a search,
  and with its key help), after an unknown command, after `ls`, inside a folder after
  `cat`, after `specs`, maximized, and its menu open; on mobile, the pocket terminal just opened,
  after `help`, after `ls`, with the on-screen keyboard open, the vim view with its vim keys, at
  320 px wide and in landscape
- [x] PNG exports of the approved Penpot mockup of the Terminal in both shells, at a phone width
  and a desktop width, and of the pocket terminal at 320 px wide and in landscape (or of the
  interim local mockup, under the constitution's interim provision)
- [x] Penpot file link: [006 Terminal — Glass](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=07f3159c-7750-805c-8008-dade1b6b707f)
- [x] `review.md` sign-off by the project owner, naming the mockup version and date, and
  confirming the look is original (FR-031, FR-054)
- [x] For the 2026-10-29 amendment: the mockup and wireframes updated for the command line with
  no box and its cursor filled and hollow (FR-072), `help` with its group of standard commands
  (FR-008), the shell loading and failing to load (FR-070), a command line stopped by its limit
  (FR-069), and the command line's selection and the Terminal's text selected all (FR-074,
  FR-075), the greeting removed (FR-005), with the owner's sign-off added to `review.md`
- [x] For the 2026-10-30 amendment: the mockup and wireframes updated for a completion and the
  list a second Tab shows (FR-076), the pocket terminal's Tab key (FR-078), the vim view in insert
  mode with its status line, a changed file, a protected file with vim's `W10` warning and `E45`
  error, a new file, and `E37` after `:q` (FR-079 to FR-081), and the pocket terminal's vim keys
  with `i`, `u`, `:w` and `Esc` and the on-screen keyboard open (FR-066), with the owner's
  sign-off added to `review.md`

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the Terminal as it opens, every CV section can be shown with at most 2 clicks or
  taps and no typing, in both shells. On mobile, `help`, `about`, `work`, `projects` and `cv` each
  take 1 tap on a command key.
- **SC-002**: A command's output appears within 100 ms of pressing Enter at a desktop width, and
  within 300 ms with the CPU slowed as Lighthouse's mobile profile slows it, for every command
  including `cv`.
- **SC-003**: In both shells, every CV command shows 100% of the shown fields the CV document holds
  for its section, in the CV document's order, every time the content check runs.
- **SC-004**: The automated accessibility check finds 0 WCAG 2.2 AA violations in every Terminal
  state of FR-035, in both shells. The owner also checks by hand, with one screen reader on a
  desktop and one on a phone, that every action of stories 1, 3, 4 and 5 can be done and is
  announced.
- **SC-005**: With the Terminal added, 005's SC-001, SC-003 and SC-004 still hold: the CV is as
  quick to reach as before, and every Lighthouse category still scores 90 or more on both profiles
  for the site root.
- **SC-006**: After one online visit, 100% of the commands `help` lists give the same output with
  no network as online, every time the offline check runs.
- **SC-007**: Opening the Terminal and running every command makes 0 requests to any other site.
- **SC-008**: With reduced motion set, 0 elements of the Terminal blink, move or scale, other than
  scrolling, in either shell.
- **SC-009**: When this feature is merged, every requirement in this spec is covered by at least
  one test, the content check (002) and the token check (003) pass with no exception added for the
  Terminal, and the local run of every check gives the same result as the pull-request run.
- **SC-010**: The owner's design review records that nothing in the Terminal's look, icon or
  colors comes from or traces macOS's Terminal or another terminal's default look, and that the
  pocket terminal copies or traces no real device.
- **SC-011**: For 100% of the entries in the CV document's work, projects and education sections,
  and for 100% of the specs in the repository, the file system holds exactly one file, and `cat`
  on it shows what the matching named command shows, every time the content check runs.
- **SC-012**: At 320 px wide and in landscape at 568 by 320 px, the pocket terminal shows its
  screen and every command key with 0 px of horizontal scrolling.
- **SC-013**: With the shell added, the site root and `/cv` load 0 bytes of the shell's code, and
  their gzipped script stays within 5% of its size before the amendment. After the Terminal is
  opened, the shell is ready within 1 s on a desktop connection and within 3 s with the network
  and CPU slowed as Lighthouse's mobile profile slows them.
- **SC-014**: For a fixed list of at least 30 command lines that use only the standard commands
  of FR-068 over the CV's files, covering every feature of FR-067 and every command of FR-068, the
  Terminal's output and error output, each compared on its own, and its exit status are the same
  as bash's with GNU tools on the same files, every time the tests run. The exceptions are where
  FR-044, FR-045 or FR-049, or a difference FR-068 allows, sets otherwise, and the
  `bash: line N: ` prefix bash adds when it reads commands from a file rather than a prompt. The
  commands of FR-008, the replies of FR-016 and FR-048, and command controls (FR-015) are this
  site's and are not compared. Amended 2026-10-29, after its approval that day: it compared the
  output as one stream, every time the content check runs, with no exception for bash's prefix.
- **SC-015**: In 100% of the keyboard check's steps with focus in the command line, its cursor is
  filled, and there is no outline or border around the command line; in 100% of the steps with
  focus elsewhere, the cursor is hollow.
- **SC-016** (added 2026-10-30): From every state the keyboard check reaches with focus in the
  command line or the vim view's text, typed text or insert mode included, focus leaves that
  element in at most two key presses (Escape, then Tab), and Shift+Tab leaves it in one, and no
  later Tab is taken, in 100% of the steps. Amended 2026-10-30 (from `/speckit-analyze`): it said
  focus leaves the Terminal, which the vim view's `:help` and `:q` controls, next in the tab
  order, would not allow.
- **SC-017** (added 2026-10-30): For a fixed list of at least 20 partly typed command lines, of
  commands, files, folders and paths in quotes, on the same files, a first and a second Tab give
  the line and the list that bash 5's own completion gives, with no completion scripts, in 100%
  of the cases, compared as SC-014 compares.

## Assumptions

- **Users**: hiring managers and engineers explore the Terminal on desktop. Recruiters may try it
  on a phone out of curiosity, but their path is the CV app. The owner changes the Terminal and
  reads the check results on pull requests.
- **Commands**: the list in FR-008 covers every section `/cv` shows, the site and its process, and
  the shell's other views. Names follow common terminal habits (`help`, `clear`, `exit`,
  `history`, `whoami`), so engineers can guess them, and `help` lists every one for visitors who
  can't. Their exact wording and descriptions are site text set by the design.
- **No hidden commands**: every command is listed by `help`. Joke replies to commands such as
  `sudo` would be easter eggs, a non-goal in the vision. `rm` is a real command of the shell: it
  removes the visitor's own files and gives bash's "Permission denied" on protected ones (FR-049).
- **A real shell** (2026-10-29): engineers who open a terminal try the commands and syntax they
  know, and a short list of pretend commands broke that feel. The Terminal now runs a bash-like
  shell in the page, with the site's commands as commands of that shell. It runs entirely in the
  visitor's browser, reaches no network and runs no real program, so it can't harm the visitor,
  the site or anyone else (FR-022, FR-068). It is large next to the rest of the site, so it loads
  only when the Terminal opens (FR-070). Which shell is used, and why it is worth its size, is the
  plan's to say (Constitution X).
- **A terminal's cursor** (2026-10-29): a terminal shows focus with its cursor, not a box. The
  filled, blinking cursor is a clear focus indicator, the hollow one shows where focus isn't, and
  clicking anywhere on the screen puts focus back, as in a terminal (FR-071, FR-072).
- **A terminal's keys** (2026-10-29): engineers' hands go to the keys their terminal takes. The
  command line takes the system's own editing keys everywhere, and on macOS, where browsers leave
  Ctrl free, the readline keys too. On Windows and Linux the browser reserves most readline keys
  (Ctrl+W closes the tab), so there the system's editing keys do the same work (FR-074, FR-026).
- **Completion with Tab** (2026-10-30): engineers press Tab without thinking, and a terminal that
  ignores it doesn't feel like one. In a page, Tab moves focus, so taking it over everywhere would
  trap keyboard users. Tab completes only when there is something typed to complete; on an empty
  line it leaves as before, and Escape then Tab always leaves, as many web code editors do. The
  command line says so, which WCAG 2.2 success criterion 2.1.2 asks of any exit that isn't plain
  Tab (FR-026, FR-077). Visitors who don't know a command still have the command controls
  (FR-015) and the suggestions for near misses (FR-016). Until 2026-10-30, Tab never completed.
- **Focus on opening**: a terminal is for typing, so focus goes to the command line rather than to
  a heading (FR-004). 005 FR-040 was widened to allow this on 005's branch, before 005 merged.
- **Output appears at once**: typing output out letter by letter would slow every reader and be
  noise for a screen reader, so the Terminal never does it, with or without reduced motion
  (FR-032).
- **Nothing is remembered between visits**: as in 005. The output, the command history, variables
  and the visitor's files last only while the Terminal is open in the visit (FR-021).
- **Contact**: `contact` shows the CV's own contact fields, as `/cv` does. How visitors reach the
  owner beyond that belongs to the Contact feature, which may change what `contact` does.
- **Fonts**: the Terminal uses a fixed-width font from the site's fonts, chosen in the approved
  design and served by the site under 004 FR-045's rules.
- **Theme**: one look, set by the design. Terminal color themes belong to the Settings feature, if
  anywhere.
- **Spec list**: `specs` reads the repository's `specs/` folders when the site is built, so the
  site needs no network to show it and the list can't drift from the repository. A spec's status
  and its active requirements are read the way the traceability check (001) reads them, so the
  Terminal and the check never disagree.
- **File system**: the CV is laid out as files so engineers can browse it with the commands they
  know. It is part of this feature, not a feature of its own, because no other app in the first
  release browses files. If a later app does, such as a Files app, its spec can move the file
  system into the shared core. Files have no extensions except `cv.json` (FR-055), and `cat`,
  `jq` and `vim` read them.
- **Pocket terminal**: the phone's odd touch is visual. It is drawn by the site's designer, so it
  is original by construction, and its keys are the way in for visitors who don't want to type
  on a phone. The design sets which device it evokes, as long as it copies none.
- **Vim view**: engineers know vim, and the CV document is JSON, so the whole CV is shown as that
  JSON in a vim-like view rather than as a long page of text. Since 2026-10-30 it is an editor as
  well, as vim is: visitors write their own files with it, and protected files behave as
  read-only files do in vim, so the CV can't change. It covers the editing most vim users reach
  for, not all of vim: no visual mode, registers beyond the one yank, macros, splits other than
  `:help`, or `:s`. It copies vim's keys and layout conventions, not any
  vim color scheme, so the look stays the site's own (FR-031). The section commands keep their
  readable text for visitors who don't read JSON, and `/cv` stays the plain CV.
- **Command keys are big**: they are the phone's main way in, so FR-051 sets 44 by 44 CSS px, the
  common size for touch targets, above WCAG's 24 px minimum (FR-034).
- **Manual checks**: the screen-reader pass of SC-004 is done by hand, and may be deferred to the
  final testing phase under the constitution's interim provision on deferred manual checks.
- **Out of scope**:
  - Settings, Contact and the requirement inspector, each a separate feature.
  - Running real programs, reaching the network, or any command that changes the site or the
    files built from the CV and the spec list.
  - A file system shared with other apps, or a Files app. A later feature may add them.
  - Job control, background jobs, interactive programs other than the vim view, running a script
    file with `bash` or `sh`, and completion scripts (bash-completion's completion of options and
    arguments). Amended 2026-10-30: Tab completion was out of scope.
  - In the vim view: visual mode, named registers, macros, `:s` and `:g`, splits other than
    `:help`, and settings other than `:set nu` and `:set nonu`.
  - Changing the protected files, keeping the visitor's files after the Terminal closes, hidden
    files in the home folder, `chmod`, `chown` and users other than the visitor.
  - Commands for apps that don't exist yet. `open` gains names as later features add apps.
  - Terminal themes, font sizes and preferences, which belong to Settings.
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II to IX and the interim provisions on local mockups and deferred
  manual checks; the requirement traceability check (001); the CV content source and content check
  (002); the design tokens source and token check (003); `/cv`, its rules for showing the CV, its
  fonts and its checks (004); the OS shell, its app list, windows, full-screen apps, About this site
  and its checks (005), including 005 FR-040's rule for apps made for typing (FR-004); and an
  approved mockup of the Terminal in both shells with its review sign-off.
