# Feature Specification: The Terminal

**Feature Branch**: `006-terminal`

**Created**: 2026-10-27

**Status**: Draft

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
4. **Given** the Terminal is open, **When** the visitor runs `cv`, **Then** every section `/cv`
   shows appears, in the same order, followed by a link to `/cv`.
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
2. **Given** the Terminal is open, **When** the visitor runs `specs`, **Then** it lists the
   site's feature specs as the repository holds them, each with a link to it (FR-013).
3. **Given** a new spec is added to the repository, **When** the site is built again, **Then**
   `specs` lists it with no edit to the Terminal.

---

### User Story 3 - Use the Terminal on a phone (Priority: P3)

A recruiter on a phone sees a Terminal icon on the home screen and taps it out of curiosity. It
opens full screen and is a little odd, in a way that makes them smile (FR-024). They don't want to type on a phone keyboard, so they tap
commands from the help list instead, read the CV that way, and go home.

**Why this priority**: the vision ships the Terminal on both shells and asks for the phone version
to be deliberately a little odd. It comes after the desktop because typing commands is a desktop
habit, and the CV app is the recruiter's real path on a phone.

**Independent Test**: at 375 px wide, with touch, open the Terminal from the home screen, run
`help` and two CV commands without typing, type one command with the on-screen keyboard, and go
home with the home control. Repeat at 320 px wide and in landscape.

**Acceptance Scenarios**:

1. **Given** the home screen, **When** the visitor taps the Terminal icon, **Then** the Terminal
   opens full screen with the shell's header and home control (005 FR-032), showing its greeting
   and the phone's odd touch.
2. **Given** the Terminal is open on a phone, **When** the visitor taps a command offered in the
   greeting or in the output of `help`, **Then** it runs as if typed, without the on-screen
   keyboard opening.
3. **Given** the visitor taps the command line, **When** the on-screen keyboard opens, **Then** the
   command line and the latest output stay visible above it.
4. **Given** a 320 px wide phone, **When** the visitor runs `cv`, **Then** every line wraps
   within the screen and nothing needs horizontal scrolling.
5. **Given** the visitor ran commands and went home, **When** they open the Terminal again in the
   same visit, **Then** its output and scroll position are as they left them (005 FR-034).
6. **Given** the Terminal is open on a phone, **When** the visitor runs `exit`, **Then** the home
   screen appears with focus on the Terminal icon, as the home control would do.

---

### User Story 4 - Use the Terminal with a keyboard or a screen reader (Priority: P4)

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
4. **Given** a screen reader in the command line, **When** the user runs `help`, **Then** the
   output is announced once, focus stays in the command line, and the user can type the next
   command straight away.
5. **Given** several commands were run, **When** a screen reader user browses the output,
   **Then** each command and its output form one group named by the command, lists are read as
   lists, and links as links.
6. **Given** focus is on a command name in the output of `help`, **When** the user presses Enter
   or Space, **Then** the command runs and focus returns to the command line.
7. **Given** the Terminal is the only open window, **When** the user runs `exit`, **Then** the
   window closes and focus moves to the Terminal item in the dock (005 FR-023).

---

### User Story 5 - Reduced motion, high contrast and larger text (Priority: P5)

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
4. **Given** text zoomed to 200%, **When** the visitor runs `cv`, **Then** every line wraps within
   the window and none is cut off or hidden.

---

### User Story 6 - Use the Terminal offline (Priority: P6)

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

### User Story 7 - Every pull request proves the Terminal works (Priority: P7)

The owner opens a pull request that changes the Terminal or the CV. The checks 004 and 005 set up
now also cover the Terminal: accessibility in its states, its keyboard flow, the CV it shows,
offline use and requests to other sites. A failure blocks merge and says which shell, state,
width and command failed.

**Why this priority**: it keeps stories 1 to 6 true after merge. It is last because it checks
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

---

### Edge Cases

- **An empty command line** and Enter: a new prompt appears, with no message.
- **Extra spaces, capitals or tabs** around or inside a command: they are ignored, so ` Work  `
  runs `work`. The echoed command is shown as typed.
- **A misspelt command** close to a known one: the reply names what was typed, offers the closest
  command or commands, and mentions `help` (FR-016).
- **A command nothing like a known one**, such as `sudo` or `rm -rf /`: the same "not a
  command" reply, with no joke reply or hidden command, as easter eggs are a non-goal. Whether
  `ls`, `cd` and `cat` are commands depends on FR-012.
- **A known command with an argument it doesn't take**, such as `work 2020`: the reply says the
  command takes no argument and shows how to use it. `help work` shows that command's own help.
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
- **A very long output**, such as `cv`: the Terminal scrolls to show the new command at the top of
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
- **The Terminal closed and opened again** in the same visit: it starts afresh with the greeting,
  and its command history is empty (FR-021).
- **A new visit**: nothing typed in an earlier visit is kept or shown.
- **The CV document changes**: the next build shows the change in every command, with no edit to
  the Terminal.
- **An empty or absent CV section**: its command still exists, still appears in `help`, and says
  the CV lists nothing for it (FR-011).
- **The CV document has no name**: the prompt and greeting fall back to the site heading the
  design sets, as the shell does (005 FR-066).
- **A shortcut a terminal user expects**, such as Ctrl+C or Ctrl+L: it keeps the browser's
  meaning. The Terminal takes over no key a browser or screen reader reserves (005 FR-029).
- **Escape in the command line**: does what the shell gives it (005 edge cases), and doesn't clear
  what was typed.
- **Scripting turned off**: the site root shows the page 005 sets (005 FR-049). The Terminal
  needs scripting and isn't shown.
- **Offline**: every command works. Following a link to another site needs the network, as any
  link does.
- **Reduced motion**: the cursor doesn't blink and output never types itself out.
- **Forced colors**: every part of the Terminal stays visible and distinguishable (FR-033).

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
  once, and a screen reader MUST announce the Terminal's name and the command line's name. This
  replaces, for the Terminal only, 005 FR-040's rule that focus moves to an app's title or first
  heading. Before the Terminal ships, 005's spec MUST be amended to allow it, with the owner's
  approval and keeping its IDs (Constitution III).
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
  | `cv` | Every section `/cv` shows, in its order, then a link to `/cv`. |
  | `site` | What the site is and how it was built, with a link to the repository. |
  | `specs` | The site's feature specs (FR-013). |
  | `open <name>` | Opens the CV app (`open cv`) or About this site (`open about`) in the shell. |
  | `history` | The commands run since the Terminal opened, oldest first. |
  | `clear` | Clears the output. |
  | `exit` | Closes the Terminal on desktop, or returns to the home screen on mobile. |

  `whoami` MUST run `about`, `experience` MUST run `work`, and `?` MUST run `help`. Every command
  and alias MUST be listed by `help`, and there MUST be no command `help` doesn't list.
- **FR-009**: The output of every CV command MUST show the same fields `/cv` shows for that section
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
- **FR-012**: The Terminal's commands MUST be the ones FR-008 lists [NEEDS CLARIFICATION: should
  the Terminal also offer a pretend file system, where `ls`, `cd` and `cat` browse the CV as
  folders and files, or only the commands FR-008 lists?].
- **FR-013**: `specs` MUST list the site's feature specs as the repository holds them when the site
  is built, in their numbered order, each with a link to it in the repository, with no list typed
  by hand. A spec added to the repository MUST appear at the next build with no edit to the
  Terminal [NEEDS CLARIFICATION: does each entry show only the spec's number, name and link, or
  also its status and its count of requirements?].
- **FR-014**: `open cv` and `open about` MUST open, or bring to the front, the CV app or About this
  site exactly as the dock or the site menu does on desktop (005 FR-012, FR-064) and as the home
  screen does on mobile. `open` with any other name MUST list the names it accepts.

**Help for visitors who don't know terminals**

- **FR-015**: Every command name in the greeting and in the output of `help`, and every command
  offered after an unknown one (FR-016), MUST be a control that runs that command when activated
  with a click, a tap, Enter or Space. Running it MUST behave as if the command had been typed and
  Enter pressed, MUST NOT open the on-screen keyboard, and MUST return focus to the command line.
- **FR-016**: A command the Terminal doesn't know MUST get a reply, in site text, that names what
  was typed, shown exactly as typed, says it is not a command, and mentions `help`. When it is
  close to one or more known commands or aliases, the reply MUST offer them, as controls (FR-015).
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
- **FR-021**: Closing the Terminal MUST clear its output and its command history. Minimizing it,
  going home on mobile and the shell switching between desktop and mobile MUST keep both, along
  with what was typed and the scroll position (005 FR-002, FR-034).
- **FR-022**: Nothing typed in the Terminal MUST leave the visitor's browser or be kept after the
  visit ends. The Terminal MUST make no request to any other site (005 FR-054).
- **FR-023**: Output MUST wrap within the Terminal's width at every window and screen size the
  shell allows, from 320 px wide, so nothing needs horizontal scrolling. A long word or URL MUST
  wrap too (as 004 FR-022 requires of `/cv`). Text in the output MUST be selectable and copyable
  as it is on a page.

**The phone**

- **FR-024**: On mobile, the Terminal MUST be deliberately a little odd while every requirement of
  this spec still holds [NEEDS CLARIFICATION: what is the phone Terminal's odd touch?].
- **FR-025**: On mobile, every command FR-008 lists MUST be possible to run without typing, through
  the controls FR-015 sets. When the on-screen keyboard is open, the command line and the newest
  output MUST stay visible above it.

**Keyboard and screen readers**

- **FR-026**: Tab and Shift+Tab MUST always move focus out of the command line, and MUST NOT
  complete or insert text, so focus is never trapped (WCAG 2.2 success criterion 2.1.2, 005
  FR-030). The shell's shortcuts MUST keep working while focus is in the command line (005 FR-025
  to FR-029). The Terminal MUST add no shortcut that takes over one a current main browser or
  screen reader reserves (005 FR-029).
- **FR-027**: The command line MUST have an accessible name that says it takes a command. The
  prompt MUST NOT be read as part of what was typed.
- **FR-028**: After a command runs, its output MUST be announced to screen readers once, without
  moving focus from the command line. Output that only scrolls into view, such as earlier output,
  MUST NOT be announced again.
- **FR-029**: In the output, each command and its output MUST form one group named by the command,
  so a screen reader user can move from one command to the next. Lists MUST be lists, links MUST
  be links, and command controls (FR-015) MUST be buttons named by the command they run. The
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
  controls, the command line, its cursor and focus indicators MUST stay visible and
  distinguishable. None may rely on a background image or a background color alone.
- **FR-034**: Every control in the Terminal, including command controls in the output, MUST have a
  target of at least 24 by 24 CSS px (WCAG 2.2 success criterion 2.5.8), or larger where the
  approved design sets it.
- **FR-035**: The Terminal MUST conform to WCAG 2.2 Level AA in every state: just opened, after
  `help`, after `cv`, after an unknown command, after `clear`, with a long command typed and, on
  desktop, minimized, maximized, and as one of two open windows, and on mobile with the on-screen
  keyboard open. It MUST keep all content and function at 200% browser zoom and text-only zoom, at
  400% zoom on a window 1280 px wide, and with text spacing overridden as WCAG 2.2 success
  criterion 1.4.12 describes.

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
  command with the Up arrow, leave the command line with Tab and come back with Shift+Tab, reach
  the dock with the shell's shortcut, and close the Terminal with `exit`, confirming a visible
  focus indicator and where focus lands at each step.
- **FR-040**: A Terminal content check MUST run every CV command in each shell and confirm that its
  output holds every shown field the CV document holds for that section, in the CV document's
  order, and that `cv` holds every section in `/cv`'s order. It MUST read the expected fields from
  the CV document, not from a hand-written list.
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
- **Spec list**: the site's feature specs, read from the repository when the site is built (FR-013).
- **CV document**: the owner's CV from the content source (002), read by the Terminal as `/cv`
  reads it (004).
- **Site text**: text in the Terminal that isn't CV content, set by the design, in English.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: a Terminal window opened from the dock, with its own menu | - |
| Mobile (iOS-style) | Yes: the Terminal full screen from the home screen, with the phone's odd touch and commands that run without typing | - |

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

- [ ] ASCII wireframes, per shell, of every state: on desktop, the Terminal just opened beside the
  CV window, after `help`, after `cv`, after an unknown command, maximized, and its menu open; on
  mobile, the Terminal full screen just opened with its odd touch, after `help`, with the
  on-screen keyboard open, and at 320 px wide
- [ ] PNG exports of the approved Penpot mockup of the Terminal in both shells, at a phone width
  and a desktop width (or of the interim local mockup, under the constitution's interim provision)
- [ ] Penpot file link: to be added (not needed for an interim local mockup until the provision
  ends)
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date, and
  confirming the look is original (FR-031)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the Terminal's greeting, every CV section can be shown with at most 2 clicks or
  taps and no typing, in both shells.
- **SC-002**: A command's output appears within 100 ms of pressing Enter at a desktop width, and
  within 300 ms with the CPU slowed as Lighthouse's mobile profile slows it, for every command
  including `cv`.
- **SC-003**: In both shells, every CV command shows 100% of the shown fields the CV document holds
  for its section, in the CV document's order, every time the content check runs.
- **SC-004**: The automated accessibility check finds 0 WCAG 2.2 AA violations in every Terminal
  state of FR-035, in both shells. The owner also checks by hand, with one screen reader on a
  desktop and one on a phone, that every action of stories 1, 3 and 4 can be done and is
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
  colors comes from or traces macOS's Terminal or another terminal's default look.

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
  a heading. This needs 005 FR-040 amended for the Terminal (FR-004), as 005 amended 004.
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
  site needs no network to show it and the list can't drift from the repository.
- **Manual checks**: the screen-reader pass of SC-004 is done by hand, and may be deferred to the
  final testing phase under the constitution's interim provision on deferred manual checks.
- **Out of scope**:
  - Settings, Contact and the requirement inspector, each a separate feature.
  - Running real programs, reaching the network, or any command that changes the site.
  - Tab completion, pipes, scripts, variables and a command language beyond FR-008.
  - Commands for apps that don't exist yet. `open` gains names as later features add apps.
  - Terminal themes, font sizes and preferences, which belong to Settings.
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II to IX and the interim provisions on local mockups and deferred
  manual checks; the requirement traceability check (001); the CV content source and content check
  (002); the design tokens source and token check (003); `/cv`, its rules for showing the CV, its
  fonts and its checks (004); the OS shell, its app list, windows, full-screen apps, About this site
  and its checks (005), and an amendment to 005 FR-040 (FR-004); and an approved mockup of the
  Terminal in both shells with its review sign-off.
