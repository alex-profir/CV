# Feature Specification: The Terminal

**Feature Branch**: `006-terminal`

**Created**: 2026-10-27

**Status**: Approved

**Amended**: 2026-10-29: `open` accepts `playground`, for the TypeScript playground (008) (see
Clarifications, Session 2026-10-29, and 008-typescript-playground FR-087). Approved 2026-10-27;
the amendment approved by the owner 2026-10-29.

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

### Session 2026-10-29 (amended by 008-typescript-playground)

- Q: The TypeScript playground (008) is a new app. Should `open` accept it? → A: Yes. `open
  playground` opens the Playground, or brings it to the front, as its dock item or home-screen icon
  does; on mobile that is its "best on desktop" screen. Running code from the Terminal is not part
  of it (FR-008, FR-014).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore the CV by typing commands (Priority: P1)

A hiring manager on a laptop has the CV open and notices a Terminal in the dock. They open it.
A short greeting says what the Terminal is and suggests typing `help`. They type it and see every
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
   focused, showing the greeting and a prompt, with keyboard focus in the command line.
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
15. **Given** the vim view, **When** the visitor presses `i` or types `:w`, **Then** nothing
    changes and the message line says the file is read only.
16. **Given** the vim view, **When** the visitor types `:q` and presses Enter, or clicks the `:q`
    control, **Then** the view closes, the Terminal's output is back with `cv` after its prompt,
    a new prompt follows, and focus is in the command line.
17. **Given** the Terminal is open, **When** the visitor runs `cat cv.json | jq`, **Then** the
    JSON appears in the output, pretty-printed and colored, without the vim view.

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
When they try `rm about`, the Terminal says it doesn't know `rm`.

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
   terminal: its screen shows the greeting and a prompt, and its command keys sit below.
2. **Given** the pocket terminal, **When** the visitor presses one of its command keys, or taps
   a command offered in the greeting or in the output of `help`, **Then** it runs as if typed,
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
2. **Given** focus is in the command line, **When** the user presses Tab, **Then** focus leaves
   the command line for the next element, and Shift+Tab moves it back. Tab never completes or
   inserts text.
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

---

### User Story 6 - Reduced motion, high contrast and larger text (Priority: P6)

A visitor who asked their system for reduced motion sees a cursor that doesn't blink. A visitor in
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
2. **Given** no reduced motion, **When** the Terminal has been open for 5 seconds, **Then** the
   cursor has stopped blinking (WCAG 2.2 success criterion 2.2.2).
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
`work`, make Tab stop leaving the command line, give the command line no name, hardcode a CV fact
in a command) and confirm that the matching check fails with a clear message and the pull request
can't merge.

**Acceptance Scenarios**:

1. **Given** a pull request where `work` leaves out a field `/cv` shows, **When** the checks run,
   **Then** the Terminal content check fails and names the command, the field and the shell.
2. **Given** a pull request where Tab no longer leaves the command line, **When** the checks run,
   **Then** the keyboard check fails and names the step.
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
- **A command nothing like a known one**, such as `sudo` or `rm -rf /`: the same "not a
  command" reply, with no joke reply or hidden command, as easter eggs are a non-goal. Commands
  that would change files, such as `rm`, `mkdir`, `touch` or `mv`, get the same reply, as the file
  system can't be changed (FR-049).
- **A known command with an argument it doesn't take**, such as `work 2020`: the reply says the
  command takes no argument and shows how to use it. `help work` shows that command's own help.
- **A path that doesn't exist**, such as `cat work/nowhere`: the reply names the path as typed
  and says there is no such file or folder. `cd` into a file and `cat` on a folder say what the
  name is and how to read it (FR-048).
- **`cd ..` in the home folder**, or a path such as `../..` above it: the visitor stays in the
  home folder, as the home folder is the top of the file system.
- **`ls` or `cat` with a path from anywhere**, such as `cat ~/work/<file>` from the specs folder,
  or `/` for the home folder: it works, so a path means the same from every folder (FR-045).
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
- **The Terminal closed and opened again** in the same visit: it starts afresh with the greeting
  in the home folder, and its command history is empty (FR-021).
- **A new visit**: nothing typed in an earlier visit is kept or shown.
- **The CV document changes**: the next build shows the change in every command, with no edit to
  the Terminal.
- **An empty or absent CV section**: its command still exists, still appears in `help`, and says
  the CV lists nothing for it (FR-011). Its folder or file is left out of the file system, as
  `/cv` leaves out an empty section (FR-043).
- **The CV document has no name**: the greeting falls back to the site heading the design sets,
  as the shell does (005 FR-066), and the pocket terminal's case leaves the name out. The prompt
  holds no name, so it doesn't change.
- **A shortcut a terminal user expects**, such as Ctrl+C or Ctrl+L: it keeps the browser's
  meaning. The Terminal takes over no key a browser or screen reader reserves (005 FR-029).
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
- **Forced colors**: every part of the Terminal stays visible and distinguishable (FR-033).
- **Editing keys in the vim view**, such as `i`, `dd` or `:w`: nothing changes, and the message
  line says the file is read only (FR-060). `:w!` and `:wq` get the same message.
- **An unknown `:` command** in the vim view, such as `:foo`: the message line names it and says
  it isn't a command there. Escape cancels a `:` or `/` being typed.
- **A search with no match**: the message line says the text wasn't found, and the cursor stays.
- **`vim` with no input**, such as `vim -` with nothing piped, `vim work` on a folder or `vim nowhere`:
  the usage or path reply, and the view doesn't open (FR-058).
- **A pipe into a command that reads no input**, such as `ls | work`: the reply names the command
  and says it doesn't read piped input (FR-057). `jq` on text that isn't JSON, such as
  `cat about | jq`, says the input isn't JSON.
- **`jq` with a filter**, such as `jq .work`: the reply says the Terminal's `jq` only pretty-prints,
  and shows its usage.
- **The Terminal closed, minimized or the shell switched** with the vim view open: closing ends the
  view with the rest of the Terminal (FR-021). Minimizing and switching keep it open, with its
  cursor, folds and search.
- **Ctrl+D, Ctrl+U or Ctrl+F** in the vim view: they keep the browser's meaning. Page Down and
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
- **FR-005**: When it opens, the Terminal MUST show a short greeting that says what the Terminal is,
  suggests `help`, and offers a few commands as controls that run them (FR-015), then a prompt.
  The greeting and prompt MUST be site text set by the design (FR-030), and any CV fact in them,
  such as the owner's name, MUST come from the CV document.

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
  | `vim <path>`, `vim -` | Opens the file, or the piped input, in the read-only vim view (FR-058). |
  | `pwd` | The working folder's path. |
  | `open <name>` | Opens the CV app (`open cv`), the Playground (`open playground`) or About this site (`open about`) in the shell. |
  | `history` | The commands run since the Terminal opened, oldest first. |
  | `clear` | Clears the output. |
  | `exit` | Closes the Terminal on desktop, or returns to the home screen on mobile. |

  Commands MAY be joined with `|` (FR-057). `whoami` MUST run `about`, `experience` MUST run
  `work`, and `?` MUST run `help`. Every command
  and alias MUST be listed by `help`, and there MUST be no command `help` doesn't list. Amended
  2026-10-29 (008-typescript-playground): the `open <name>` row said "Opens the CV app (`open cv`)
  or About this site (`open about`) in the shell."
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
- **FR-012**: Besides the named commands, the Terminal MUST offer a pretend file system that
  holds the CV and the site as folders and files, browsed with `ls`, `cd`, `cat` and `pwd`, as
  FR-043 to FR-050 set. It holds the same CV as the named commands, and is never needed to read
  it.
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
- **FR-045**: `ls`, `cd` and `cat` MUST accept a path relative to the working folder, with `.` and
  `..`, or a path from the home folder starting with `~/` or `/`. Names MUST be matched without
  regard to capitals. `..` in the home folder MUST stay in the home folder.
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
- **FR-049**: The file system MUST be read only. No command may create, change, move or delete a
  file or folder, and commands that would, such as `rm`, `mkdir`, `touch` or `mv`, MUST get the
  reply for an unknown command (FR-016).
- **FR-050**: In the output of `ls`, every folder name MUST be a command control that runs `ls`
  with that folder's path from the home folder, and every file name one that runs `cat` with its
  path from the home folder (FR-015), so the whole file system can be read without typing.

**Help for visitors who don't know terminals**

- **FR-015**: Every command name in the greeting and in the output of `help`, every command
  offered after an unknown one (FR-016) or a wrong path (FR-048), every name in the output of `ls`
  (FR-050) and every key of the pocket terminal (FR-051) MUST be a control that runs that command
  when activated with a click, a tap, Enter or Space. Running it MUST behave as if the command had
  been typed and Enter pressed, including in the output and the command history, MUST NOT open the
  on-screen keyboard, and MUST return focus to the command line.
- **FR-016**: A command the Terminal doesn't know MUST get a reply, in site text, that names what
  was typed, shown exactly as typed, says it is not a command, and mentions `help`. The reply MUST
  offer, as controls (FR-015), every command or alias whose name is at most 2 single-letter edits
  from the typed word, or at most 1 when the typed word has 3 letters or fewer (a letter added,
  removed or changed, or two neighbouring letters swapped), and every command whose name begins with the typed word when it is at least 2 letters long,
  closest first and at most 3. Capitals don't count as edits. When none qualifies, the reply
  offers only `help`.
- **FR-017**: A command with an argument it doesn't take, or missing one it needs, MUST get a reply
  that says so and shows how to use the command. The command line MUST accept at least 200
  characters and MAY stop accepting more after a limit the design sets.
- **FR-018**: Typed and pasted text MUST be shown exactly as typed, and MUST never be run as code,
  rendered as markup or turned into a link. Line breaks in pasted text MUST become spaces, and
  nothing MUST run until Enter is pressed.

**Output, history and scrolling**

- **FR-019**: The output MUST keep every command and its output until `clear` or the Terminal's
  clear command is used, or the Terminal is closed. The Terminal MUST scroll its output inside its
  window or full-screen view, never the page, and after a command runs it MUST show the start of
  that command's output, with the command at the top of the view when the output is longer than
  the view.
- **FR-020**: In the command line, the Up and Down arrows MUST step through the commands run since
  the Terminal opened, newest first, without running them. Down past the newest MUST give back
  what the visitor had typed before stepping. `history` MUST list the same commands.
- **FR-021**: Closing the Terminal MUST clear its output and its command history, and return its
  working folder to the home folder. Minimizing it, going home on mobile and the shell switching
  between desktop and mobile MUST keep all three, along with what was typed and the scroll
  position (005 FR-002, FR-034).
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
- **FR-054**: The pocket terminal's drawn case MUST be decoration only: it MUST NOT be announced by
  screen readers, take focus or carry meaning. It MUST be of the site's own design and MUST NOT
  copy or trace any real device (Constitution IX). A pressed key MAY show a pressed state, which
  MUST NOT move or scale when the visitor asks for reduced motion (FR-032).

**The CV as JSON in a vim view**

- **FR-055**: The home folder MUST hold a file `cv.json` whose text is the CV document's JSON
  exactly as the content source (002) holds it, every key and value in its order, read when the
  site is built. No part of it may be typed by hand, and `cat cv.json` MUST show it as it is.
- **FR-056**: `jq` with a path, or with piped input, MUST pretty-print JSON: indented by 2
  spaces, keys in their order, with syntax colors for keys, strings, numbers, booleans and null
  that carry no meaning on their own. `jq` accepts no filter but `.`; any other filter MUST get a
  reply, in site text, that says the Terminal's `jq` only pretty-prints and shows its usage. Input
  that isn't JSON MUST get a reply that says so and names the path or `|`.
- **FR-057**: A command line MAY join commands with `|`. Each command's output MUST become the next
  command's input. Only `jq` and `vim -` read input. Piping into any other command MUST get a
  reply, in site text, that names the command and says it doesn't read piped input, and a `|`
  with nothing on one side MUST get the usage reply (FR-017). The Terminal parses the pipe itself
  and runs no code (FR-018).
- **FR-058**: `vim <path>` and `vim -` with piped input MUST open the vim view: the text shown in
  place of the Terminal's output, filling the Terminal window, or the pocket terminal's screen,
  with line numbers, a status line and a message line. The status line MUST show the mode, the
  file's name, that it is read only, the file type, the cursor's line and column, and how far
  through the file the view is. `vim` on a folder or a path that doesn't exist MUST get the
  replies FR-048 sets, and `vim -` with nothing piped or `vim` alone the usage reply (FR-017),
  without opening the view.
- **FR-059**: `cv` MUST run `cat cv.json | jq | vim -` as if typed, and the status line MUST show
  that pipe. `help` MUST say what `cv` runs.
- **FR-060**: The vim view MUST be read only. It MUST support at least these keys: `h`, `j`, `k`,
  `l` and the arrow keys, `w` and `b`, `0` and `$`, `gg` and `G`, `{` and `}`, Page Up and Page
  Down, `/` with text and Enter to search, `n` and `N`, `za`, `zo`, `zc`, `zR` and `zM` for
  folds, `:` with a line number, `:set nu` and `:set nonu`, `:help`, and `:q` and `:q!`. Keys and
  commands that would change the file, such as `i`, `a`, `o`, `x`, `dd`, `p`, `:w` and `:wq`,
  MUST change nothing and show a message, in site text, that the file is read only. An unknown
  `:` command MUST show a message that names it. Escape MUST cancel a `/` or `:` being typed. The
  view MUST take over no key a current main browser or screen reader reserves, such as Ctrl+D,
  Ctrl+F or Ctrl+U (FR-026).
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
  then a new prompt, with focus in the command line. `:help`, or its control, MUST open the
  view's keys in a split below the file, and `:q` MUST close that split first.
- **FR-065**: When the vim view opens, focus MUST move into it, and a screen reader MUST announce the
  file's name, that it is read only, its number of lines, and that `:q` leaves. The text MUST be
  readable with the screen reader's own reading keys as a read-only document, fold lines MUST be
  buttons that say whether they are open, and a change to the status or message line MUST be
  announced once. Tab and Shift+Tab MUST move focus out of the view, never trapping it (FR-026).
- **FR-066**: On mobile, while the vim view is open, the pocket terminal's command keys MUST become
  vim keys: `j`, `k`, `za`, `/`, `n`, `gg`, `G` and `:q`, in the order the approved design sets,
  each a button named by what it does, at least 44 by 44 CSS px. Closing the view MUST bring the
  command keys back. Fold lines MUST be tappable.

**Keyboard and screen readers**

- **FR-026**: Tab and Shift+Tab MUST always move focus out of the command line, and MUST NOT
  complete or insert text, so focus is never trapped (WCAG 2.2 success criterion 2.1.2, 005
  FR-030). The shell's shortcuts MUST keep working while focus is in the command line (005 FR-025
  to FR-029). The Terminal MUST add no shortcut that takes over one a current main browser or
  screen reader reserves (005 FR-029).
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

**Look, motion and accessibility**

- **FR-030**: Text in the Terminal that isn't CV content, such as the greeting, the command names,
  their descriptions, the replies of FR-011, FR-016 and FR-017, and the text of `site`, MUST be in
  English, MUST be set by the approved design, and MUST NOT contain a CV fact typed by hand (as 004
  FR-006 and 005 FR-043 require).
- **FR-031**: The Terminal's look MUST be the site's own. It MUST NOT copy or trace the look of
  macOS's Terminal, its icon or its default themes, nor any other terminal's (Constitution IX).
  Text MUST use the site's fonts (004 FR-045). The Terminal MUST match the approved mockup for each
  shell (Constitution II), every design value MUST come from tokens and motion values from the
  motion token source, and the token check (003) MUST pass over it with no exception added.
- **FR-032**: Output MUST appear at once, never typed out letter by letter. The cursor MAY blink,
  but MUST stop blinking within 5 seconds of the last key press (WCAG 2.2 success criterion
  2.2.2). When the visitor asks for reduced motion, the cursor MUST NOT blink and no part of the
  Terminal may move or scale, except scrolling (Constitution VIII).
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
  with `:q`, leave the command line with Tab and come back with Shift+Tab, reach
  the dock with the shell's shortcut, and close the Terminal with `exit`, confirming a visible
  focus indicator and where focus lands at each step.
- **FR-040**: A Terminal content check MUST run every CV command in each shell and confirm that its
  output holds every shown field the CV document holds for that section, in the CV document's
  order, and that `cat cv.json`, `cat cv.json | jq` and the vim view opened by `cv` hold the CV
  document's JSON exactly, every key and value in its order. It MUST also list every folder of the
  file system and `cat` every file, confirming there is one file per CV entry and that each shows
  what the matching named command shows for that entry. It MUST read the expected fields and
  entries from the CV document, not from a hand-written list.
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
- **File system**: the read-only pretend folders and files of the CV and the site, starting at the
  home folder (FR-043). Built from the CV document and the spec list, never typed by hand.
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
- **Pipe**: commands joined with `|`, each one's output the next one's input (FR-057).
- **Vim view**: the read-only, vim-like view of a file or piped text, with line numbers, folds,
  search, a status line and a message line (FR-058 to FR-066).

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
- **Available offline**: the Terminal and every command, with the same output as online, after one
  visit to the site root or `/cv` (FR-036).
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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the Terminal's greeting, every CV section can be shown with at most 2 clicks or
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

## Assumptions

- **Users**: hiring managers and engineers explore the Terminal on desktop. Recruiters may try it
  on a phone out of curiosity, but their path is the CV app. The owner changes the Terminal and
  reads the check results on pull requests.
- **Commands**: the list in FR-008 covers every section `/cv` shows, the site and its process, and
  the shell's other views. Names follow common terminal habits (`help`, `clear`, `exit`,
  `history`, `whoami`), so engineers can guess them, and `help` lists every one for visitors who
  can't. Their exact wording and descriptions are site text set by the design.
- **No hidden commands**: every command is listed by `help`. Joke replies to commands such as
  `sudo` or `rm` would be easter eggs, a non-goal in the vision.
- **No completion with Tab**: in a page, Tab moves focus, and taking it over would trap keyboard
  users (FR-026). Visitors who don't know a command use the command controls (FR-015) and the
  suggestions for near misses (FR-016) instead.
- **Focus on opening**: a terminal is for typing, so focus goes to the command line rather than to
  a heading (FR-004). 005 FR-040 was widened to allow this on 005's branch, before 005 merged.
- **Output appears at once**: typing output out letter by letter would slow every reader and be
  noise for a screen reader, so the Terminal never does it, with or without reduced motion
  (FR-032).
- **Nothing is remembered between visits**: as in 005. The output and command history last only
  while the Terminal is open in the visit (FR-021).
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
  JSON in a vim-like view rather than as a long page of text. It is a viewer: the file system is
  read only, so nothing in it can change. It copies vim's keys and layout conventions, not any
  vim color scheme, so the look stays the site's own (FR-031). The section commands keep their
  readable text for visitors who don't read JSON, and `/cv` stays the plain CV.
- **Command keys are big**: they are the phone's main way in, so FR-051 sets 44 by 44 CSS px, the
  common size for touch targets, above WCAG's 24 px minimum (FR-034).
- **Manual checks**: the screen-reader pass of SC-004 is done by hand, and may be deferred to the
  final testing phase under the constitution's interim provision on deferred manual checks.
- **Out of scope**:
  - Settings, Contact and the requirement inspector, each a separate feature.
  - Running real programs, reaching the network, or any command that changes the site.
  - A file system shared with other apps, or a Files app. A later feature may add them.
  - Tab completion, quotes, scripts, variables, and a command language beyond FR-008 and the `|`
    of FR-057.
  - Changing the file system, hidden files, file permissions, and any file not built from the CV
    document or the spec list.
  - Commands for apps that don't exist yet. `open` gains names as later features add apps.
  - Terminal themes, font sizes and preferences, which belong to Settings.
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II to IX and the interim provisions on local mockups and deferred
  manual checks; the requirement traceability check (001); the CV content source and content check
  (002); the design tokens source and token check (003); `/cv`, its rules for showing the CV, its
  fonts and its checks (004); the OS shell, its app list, windows, full-screen apps, About this site
  and its checks (005), including 005 FR-040's rule for apps made for typing (FR-004); and an
  approved mockup of the Terminal in both shells with its review sign-off.
