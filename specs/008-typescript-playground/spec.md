# Feature Specification: The TypeScript Playground

**Feature Branch**: `008-typescript-playground`

**Created**: 2026-10-29

**Status**: Draft

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> The TypeScript playground (context: docs/vision.md; builds on the OS shell, specs/005-os-shell;
> follows the per-app "Show specs" pattern of specs/007-requirement-inspector). An app in the
> desktop shell, modeled on the official TypeScript Playground.
>
> Loading: the first time it opens, it shows that TypeScript is downloading, and the editor
> becomes usable once the download finishes. After that it opens without the download, offline
> too. It shows which TypeScript version it runs.
>
> Editing: the visitor writes TypeScript and sees type errors as they type, types on hover and
> autocomplete. Panes show the compiled JavaScript, the type declarations, the errors and the logs,
> and a settings panel changes the compiler options. Examples are included, some of them working
> with the site's own typed CV data, read from the CV content source like every other app.
>
> Running: running code shows its console output in the logs pane. The code has no access to the
> site's storage or other apps, and it never freezes the site. Code can use timers and promises of
> any length: while any are pending, the playground shows the run as still going and how many
> timers are left, and the run ends when nothing is left to do. A Stop control ends a run at any
> time. When the code blocks for more than a few seconds without a pause, as an endless loop does,
> a popup inside the playground says it may be stuck in a loop and offers to stop it or keep
> waiting; keep waiting asks again after another period. Waiting on a timer never triggers the
> popup. The popup belongs to the playground window and never covers the rest of the site or the
> CV. `alert` writes its message to the logs; `prompt` and `confirm` aren't available, and the logs
> say so.
>
> Sharing: the visitor can share code as a link that carries the code. Opening a shared link opens
> the playground with that code but never runs it on its own. Code cannot import packages.
>
> Shells: desktop only. On phones the app shows a "best on desktop" screen with a way to share or
> send the link instead, because a code editor on a phone keyboard is a poor experience.
>
> Covers keyboard and screen-reader use of the editor, the panes and the popup; reduced motion;
> offline behaviour, including a first open with no network; and what happens when code fails to
> compile, throws, never ends, blocks, leaves a timer or an interval running, prints too much, or
> when a shared link is broken, too long or opened on a phone.
>
> Out of scope: a shared file system and saving code as files (Files), searching the playground
> (Spotlight), running code from the Terminal, importing packages, and choosing between TypeScript
> versions. These are separate features or later work.

## Clarifications

### Session 2026-10-29

- Q: How long should the Playground keep the visitor's code and compiler options? → A: Between
  visits, in this browser, with a way to reset them (FR-019, FR-080). Saving the whole state of the
  OS, such as open windows and their positions, may come in later work and is out of scope here.
- Q: Should running code be able to reach the network? → A: Yes, any site the code names, as in
  the official Playground (FR-041). The vision's "Nothing is sent anywhere" is removed, as it isn't
  needed. The Playground itself still loads everything from the site (FR-010).
- Q: Should a shared link opened on a phone show its code, read-only? → A: No. The "best on
  desktop" screen only says that the link holds code to open on a desktop (FR-060).
- Q: How close to VS Code should the editor be? → A: As close as the official TypeScript
  Playground's editor, which works like VS Code in the browser: its editing features, code
  navigation, rename, quick fixes, formatting, command palette and VS Code's keys (FR-015,
  FR-081 to FR-085). Code formatting moves into scope. Where a VS Code key is already the shell's
  or the browser's, the shell and the browser keep it and the editor command gets another key
  (FR-084).
- Q: VS Code's Format Document key, `Shift+Alt+F`, is the shell's Maximize shortcut (005 FR-065).
  Which keeps it? → A: Format Document. The shell drops its Maximize and Minimize shortcuts, which
  aren't needed: the window controls and the window's menu commands stay. This is an amendment of
  005, made in its own pull request (Constitution XI) and merged before this feature's code.
- Q: Constitution XI ships an amendment in pull requests of its own, so how does the Terminal get
  `open playground`? → A: Through an amendment of 006 in its own pull request, after this feature
  ships, as it can only be tested once the Playground exists. FR-006 moves there.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Write TypeScript and see its types (Priority: P1)

An engineer reviewing the craft opens the Playground from the dock. The window says TypeScript is
downloading and shows how far along it is. A few seconds later the editor is ready, holding a short
starting example, and the window shows which TypeScript version it runs. They change a variable's
type, and the line is marked with an error before they finish typing. They point at a name and see
its type, start typing a property and pick it from the suggestions. Beside the editor, the
JavaScript pane shows what their code compiles to, and the Errors pane lists the one error.

**Why this priority**: the vision lists live type errors, types on hover, autocomplete and the
compiled output as what the playground is. Without this story there is no playground. Every other
story builds on it.

**Independent Test**: build the site, open the site root at 1440 px wide with a clear browser,
open the Playground from the dock, and confirm that it shows the download and its progress, then
the editor with the starting example and the TypeScript version. Type code with a type error and
confirm that the error is marked within a second of pausing, that hovering a name shows its type,
that suggestions appear while typing a property, and that the JavaScript, Declarations and Errors
panes match what TypeScript produces for that code.

**Acceptance Scenarios**:

1. **Given** the Playground has never been opened in this browser, **When** the visitor opens it
   from the dock, **Then** its window opens and says that TypeScript is downloading, with how much
   has arrived out of the total, and the editor isn't usable yet.
2. **Given** the download is under way, **When** the visitor uses the rest of the site, **Then**
   the shell, the CV window and every other window keep working as before.
3. **Given** the download finishes, **When** the visitor looks at the window, **Then** the editor
   is usable, holds the starting example, and the window shows the TypeScript version it runs.
4. **Given** the editor is ready, **When** the visitor types `const n: number = "one"`, **Then**
   within a second of pausing the mistake is marked in the editor, its message shows on hover and
   at the cursor, and the Errors pane lists it with its line and column.
5. **Given** code in the editor, **When** the visitor points at a name, or moves the cursor onto it
   and asks with the keyboard, **Then** its type shows.
6. **Given** the visitor types an object's name and a dot, **When** suggestions appear, **Then**
   each shows its name and type, and choosing one inserts it.
7. **Given** a VS Code user, **When** they press F12 on a name, F2 to rename it, `Ctrl+.` on an
   error, or F1, **Then** the editor goes to its definition, renames it everywhere in the code,
   offers TypeScript's quick fixes, or opens the command palette, as VS Code does (`Cmd` in place
   of `Ctrl` on a Mac).
8. **Given** code in the editor, **When** the visitor opens the JavaScript pane or the Declarations
   pane, **Then** it shows the JavaScript or the type declarations TypeScript produces for that code
   with the current compiler options, updated as the code changes.
9. **Given** the visitor opens the settings panel, **When** they turn off strict checks, **Then**
   errors that only strict checks report disappear from the editor and the Errors pane, and the
   JavaScript and Declarations panes update, without a reload.
10. **Given** the Playground was opened once before, online, **When** the visitor opens it again,
   in the same visit or a later one, online or offline, **Then** the editor is usable without any
   download.
11. **Given** the visitor wrote code and changed an option, **When** they close the window, reload
    the page or come back another day in the same browser, and open the Playground, **Then** it
    holds their code and options as they left them.
12. **Given** the visitor's kept code, **When** they choose Reset and confirm, **Then** the editor
    holds the starting example with the default options, and their code is no longer kept.

---

### User Story 2 - Run code and read its logs (Priority: P2)

The engineer writes a small function that logs a few values, waits two seconds on a timer and
logs once more. They press Run. The Logs pane shows the first values at once, the run shows as
still going with one timer left, and two seconds later the last line appears and the run shows as
finished. They write an endless loop by mistake and run it. The site keeps working, and after a few
seconds a popup inside the Playground's window says the code may be stuck in a loop. They choose
Stop, fix the loop and run again.

**Why this priority**: the vision promises a playground that runs code in a sandbox and can be
stopped. Writing code without running it is only half of it. It comes after story 1 because
running needs the editor.

**Independent Test**: at 1440 px wide, with the Playground ready, run code that logs, waits on a
timer and logs again, and confirm the logs, the pending-timer count and the end of the run. Run
an endless loop and confirm that the shell stays responsive, that the popup appears inside the
window after 5 seconds and not before, that Keep waiting asks again 5 seconds later, and that Stop
ends the run. Run code that waits 60 seconds on a timer and confirm no popup appears. Run code
that tries to read the site's storage and confirm it can't.

**Acceptance Scenarios**:

1. **Given** code that calls `console.log`, **When** the visitor runs it, **Then** the Logs pane
   shows, emptied of the previous run's output, and lists each value as it is logged.
2. **Given** code that sets a timer for 2 seconds, **When** it runs, **Then** the Playground shows
   the run as still going with 1 timer left, and the run ends when the timer has fired and nothing
   is left to do, saying how it ended and how long it took.
3. **Given** code that starts an interval and never clears it, **When** it runs, **Then** the run
   shows as still going, with 1 timer left, until the visitor stops it.
4. **Given** a run is going, **When** the visitor activates Stop, **Then** the run ends within a
   second, its pending timers are cancelled, and the logs say it was stopped.
5. **Given** code with an endless loop, **When** it runs, **Then** the shell, the other windows and
   the Playground's own editor and Stop control keep responding, and after 5 seconds without a
   pause a popup inside the Playground's window says the code may be stuck in a loop and offers
   Stop and Keep waiting.
6. **Given** the stuck popup, **When** the visitor chooses Keep waiting and the code is still
   blocked 5 seconds later, **Then** the popup asks again.
7. **Given** the stuck popup, **When** the visitor chooses Stop, **Then** the run ends and the logs
   say it was stopped.
8. **Given** code that waits on a 60-second timer, **When** it runs, **Then** no popup appears,
   and the run ends after the timer fires.
9. **Given** the stuck popup shows, **When** the visitor looks at the rest of the site, **Then**
   the popup is inside the Playground's window only, and the CV window, the dock and the menu bar
   are uncovered and usable.
10. **Given** code that throws, **When** it runs, **Then** the logs show the error's name, its
    message and the line in the visitor's code where it was thrown.
11. **Given** code that calls `alert("hi")`, **When** it runs, **Then** the logs show "hi" as an
    alert, and the code goes on.
12. **Given** code that calls `prompt` or `confirm`, **When** it runs, **Then** the logs say that
    they aren't available in the Playground, and the code goes on as if the visitor had cancelled.
13. **Given** code that tries to read the site's stored data, its page, another app or the visitor's
    files, **When** it runs, **Then** it gets nothing of the site, and nothing outside the logs
    changes.
14. **Given** code that requests data from another site, **When** it runs online, **Then** the
    request is made as the code asks, carrying nothing of the site, and the logs show what the code
    logs; **When** it runs offline, **Then** the request fails as it would in any JavaScript, and
    the logs show the error.

---

### User Story 3 - Try the examples, including the CV as typed data (Priority: P3)

A hiring manager opens the Playground and doesn't know what to type. They open Examples and see a
list, grouped by topic, with a short description of each. They pick one that lists the owner's
jobs from the CV, newest first, and run it. The logs show the jobs, the same as in the CV app. They
point at a field in the code and see its type, taken from the CV's own rules. They try an example
that never ends and see the stuck popup.

**Why this priority**: examples turn the playground into something a visitor who isn't a
TypeScript user can try in one click, and the CV examples tie it to the CV, which is the product.
It builds on stories 1 and 2.

**Independent Test**: at 1440 px wide, open each example in turn, confirm that it shows no errors
with the default options and that running it gives what its description says. For the CV
examples, confirm that their output matches the CV document, and that changing a fact in the CV
document and rebuilding changes their output with no edit to the examples.

**Acceptance Scenarios**:

1. **Given** the Playground is ready, **When** the visitor opens Examples, **Then** it lists every
   example, grouped by topic, each with a title and a short description.
2. **Given** the visitor has edited the code, **When** they choose an example, **Then** the example
   replaces the code, the Playground says so, and undo brings their code back.
3. **Given** a CV example, **When** the visitor runs it, **Then** its output shows facts from the CV
   document, the same as the CV app shows.
4. **Given** a CV example, **When** the visitor points at a CV field in the code, **Then** its type
   shows, following the CV document's rules, and a field the CV document can't have is marked as an
   error.
5. **Given** the CV document changes in a merged pull request, **When** the site is built again,
   **Then** the CV examples show the new facts with no edit to the Playground.

---

### User Story 4 - Share code as a link (Priority: P4)

The engineer has written a neat type and wants to send it to a colleague. They activate Share, and
the Playground says the link is copied. The colleague opens the link on a laptop: the site opens
with the Playground in front, holding exactly that code and those compiler options, and a note that
the code came from a link. Nothing runs until the colleague presses Run.

**Why this priority**: the vision lists sharing by link, and that a shared link never runs on its
own. It adds reach and needs stories 1 and 2 to be worth sharing.

**Independent Test**: at 1440 px wide, write code, change an option, share, open the link in a new
browser profile, and confirm the same code and options, no run, and the note. Open a cut-off link
and an altered link, and confirm the message and that nothing runs. Try to share code too long for
a link and confirm the offer to copy the code instead.

**Acceptance Scenarios**:

1. **Given** code in the editor, **When** the visitor activates Share, **Then** a link that carries
   the code and every compiler option changed from the defaults is copied, the Playground says so,
   and, where the device offers its own way of sharing, that is offered too.
2. **Given** a shared link, **When** someone opens it at a desktop width, **Then** the desktop
   shell opens with the CV window as on first load and the Playground in front of it, focused,
   holding the shared code and options, with a note that the code came from a link, and nothing
   runs.
3. **Given** a shared link opened in the Playground, **When** the visitor activates Run, **Then**
   the code runs as any code does.
4. **Given** a link whose code was cut off or altered, **When** someone opens it, **Then** the
   Playground opens with the starting example and says the shared code couldn't be read, and
   nothing runs.
5. **Given** code too long to share as a link, **When** the visitor activates Share, **Then** the
   Playground says the code is too long for a link and offers to copy the code itself instead.
6. **Given** a link that imports a package, **When** it opens, **Then** the import is marked as an
   error saying packages can't be imported here, and running the code logs the same and fetches
   nothing.

---

### User Story 5 - Open the Playground on a phone (Priority: P5)

A recruiter on a phone taps the Playground icon on the home screen. Instead of an editor, the
screen says the Playground is made for a desktop with a keyboard, and offers to share the link or
copy it, so they can send it to themselves. A colleague's shared link opened on the phone shows the
same screen, says the link holds code to open on a desktop, and shares that same link on.

**Why this priority**: the vision ships the playground on desktop only, with this screen on
phones. It is small, but without it a phone visitor finds a dead icon or a poor editor.

**Independent Test**: at 375 px wide, tap the Playground icon and confirm the screen, its text,
and that sharing and copying give a link that opens the Playground at a desktop width. Open a
shared link at 375 px wide and confirm the screen, that nothing runs, that TypeScript isn't
downloaded, and that the link it shares is the shared link, unchanged.

**Acceptance Scenarios**:

1. **Given** the mobile shell, **When** the visitor taps the Playground's icon, **Then** it opens
   full screen as every app does, showing a "best on desktop" screen that says what the Playground
   is and why it is best on a desktop, with Share link and Copy link.
2. **Given** the "best on desktop" screen, **When** the visitor activates Share link, **Then** the
   device's own sharing opens with a link to the Playground where the device offers it, and the link
   is copied where it doesn't.
3. **Given** a shared link opened at a phone width, **When** the site opens, **Then** the mobile
   shell shows the Playground's "best on desktop" screen full screen, saying the link holds code to
   open on a desktop, nothing runs, and TypeScript isn't downloaded.
4. **Given** that screen opened from a shared link, **When** the visitor shares or copies the
   link, **Then** it is the shared link, unchanged, so the code travels with it.
5. **Given** the Playground is open with code on desktop, **When** the browser window narrows into
   the mobile shell, **Then** the "best on desktop" screen shows, and widening it again shows the
   Playground as it was, with the code, options and logs kept.

---

### User Story 6 - Use the Playground with a keyboard or a screen reader (Priority: P6)

A keyboard user opens the Playground from the dock with the keyboard. Focus lands in the editor,
and a screen reader announces the Playground and how to leave the editor. They type, hear that the
line has an error, move to it with a key and hear its message. They ask for the type under the
cursor and hear it. They leave the editor, move to the Errors pane, and hear the count. They run an
endless loop; the popup appears, focus moves to its Stop, and Enter stops the run.

**Why this priority**: Constitution VIII requires the desktop shell to be fully operable by
keyboard and to meet WCAG 2.2 AA. A code editor, where Tab indents, is easy to get wrong. It
refines the flows of stories 1 to 4 rather than adding new ones.

**Independent Test**: at 1440 px wide, with the keyboard alone, open the Playground, type, find and
read an error, read a type, choose a suggestion, leave the editor, switch panes, change an option,
choose an example, run, handle the popup, stop, share and close the window, confirming a visible
focus indicator and where focus lands at each step. With a desktop screen reader, confirm what is
announced at each step.

**Acceptance Scenarios**:

1. **Given** the Playground is ready, **When** it opens, **Then** focus is in the editor, and a
   screen reader announces the Playground's name, the editor's name, and how to leave the editor
   with the keyboard.
2. **Given** focus in the editor, **When** the user presses Tab, **Then** the line is indented, and
   **When** the user presses VS Code's key for making Tab move focus, which the Playground
   announces, **Then** the next Tab moves focus out of the editor.
3. **Given** code with errors, **When** the user presses the key for the next error, **Then** the
   cursor moves to it and a screen reader reads its message.
4. **Given** the cursor on a name, **When** the user asks for its type with the keyboard, **Then**
   it shows and a screen reader reads it.
5. **Given** suggestions are open, **When** the user moves through them with the arrow keys,
   **Then** a screen reader reads each, and Enter or Tab chooses one.
6. **Given** a run is going, **When** it logs a line or ends, **Then** a screen reader is told,
   without focus moving, and without being told every line when the code prints a lot.
7. **Given** focus is in the Playground's window, **When** the stuck popup appears, **Then** focus
   moves to its Stop control and a screen reader announces the popup, and Escape keeps waiting,
   returning focus where it was.

---

### User Story 7 - Reduced motion, high contrast and larger text (Priority: P7)

A visitor who has asked for reduced motion opens the Playground: the download progress, the
running indicator and the popup show with no movement. Another visitor uses high-contrast mode and
still sees errors, the cursor, focus and the popup. A third zooms to 200% and the Playground
rearranges inside its window.

**Why this priority**: required by Constitution VIII and WCAG 2.2 AA. It changes how the Playground
looks and moves, not what it does.

**Independent Test**: with reduced motion set, open the Playground for the first time, run code
with timers and an endless loop, and confirm nothing moves or scales. With forced colors on,
confirm errors, focus, levels in the logs and the popup stay visible. At 200% zoom, confirm every
part but the code itself reads without horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** the visitor's system asks for reduced motion, **When** the download, a run or the
   popup shows, **Then** progress and state change with no movement, spinning or scaling.
2. **Given** forced colors are active, **When** the Playground shows errors, logs and the popup,
   **Then** each error mark, log level, focus indicator and control is visible and distinguishable,
   and none relies on color alone.
3. **Given** text is zoomed to 200%, **When** the Playground shows, **Then** the panes, the
   settings and the popup read without horizontal scrolling, and only long lines of code scroll
   sideways.

---

### User Story 8 - Use the Playground offline (Priority: P8)

The engineer opened the Playground once at home. On a train with no signal they open it again: it
opens at once, with the same TypeScript version, and they write, check, run and share code as
before, including the CV examples. A friend who never opened it before tries it on the train too:
the Playground says TypeScript needs to be downloaded once with a connection, and how much, and
starts the download by itself when the signal comes back.

**Why this priority**: Constitution VI. Everything the Playground does after the download works
without a network, so it must. The first download is large, so it waits for the first open.

**Independent Test**: with a clear browser, visit the site root online, turn the network off, open
the Playground and confirm the offline state; turn the network on and confirm the download starts
by itself and the editor becomes usable. Then turn the network off again, reload, open the
Playground and confirm it opens with no download, and that editing, every pane, the settings, every
example, running and sharing work as online.

**Acceptance Scenarios**:

1. **Given** the Playground has never been opened in this browser and there is no network, **When**
   the visitor opens it, **Then** it says in site text that TypeScript has to be downloaded once with
   a connection, how large the download is, and offers Retry; the window isn't blank or broken.
2. **Given** that offline state, **When** the network comes back, **Then** the download starts by
   itself, and the editor becomes usable when it finishes.
3. **Given** a download that fails part way, **When** the visitor retries, **Then** the download
   completes and the Playground never uses a part-downloaded TypeScript.
4. **Given** one complete open of the Playground online, **When** the visitor opens it with no
   network, in the same visit or a later one, **Then** it opens without downloading, and editing,
   every pane, the settings, every example, running and sharing work as online.

---

### User Story 9 - Every pull request proves the Playground works (Priority: P9)

The owner opens a pull request that changes the CV document. The checks build the site, open the
Playground, and confirm that every example still has no errors and runs, that runs, Stop, the
popup and the sandbox behave, that a shared link opens without running, and that the phone screen
shows. A failure blocks merge and names what failed.

**Why this priority**: it keeps stories 1 to 8 true after merge, and catches a CV change that
breaks a CV example. It is last because it checks behavior the other stories define.

**Independent Test**: break one thing at a time on a branch (an example with a type error, a CV
field an example uses removed from the CV document, a shared link that runs on open, a popup that
appears for a long timer, code that can read the site's storage) and confirm that the matching check
fails with a clear message and that the pull request can't merge.

**Acceptance Scenarios**:

1. **Given** a pull request where an example has a type error or fails to run, **When** the checks
   run, **Then** the Playground check fails and names the example.
2. **Given** a pull request where a shared link runs its code on open, **When** the checks run,
   **Then** the Playground check fails.
3. **Given** a pull request that passes every check, **When** the owner runs the checks locally
   with the one command, **Then** the result is the same.

---

### Edge Cases

**Loading**

- **A first open with no network**: the offline state of FR-011. The download starts by itself when
  the network returns.
- **The network drops part way through the download**: the Playground says the download stopped,
  offers Retry, retries by itself when the network returns, and never uses a part-downloaded copy
  (FR-011).
- **The window is closed during the download**: nothing broken is kept. The next open goes on with
  the download or starts it again (FR-007).
- **The browser can't keep TypeScript**, such as in a private window, with storage turned off or
  full: the Playground works online, downloads again on each visit, and says in site text that it
  couldn't keep TypeScript for offline use (FR-014). The visitor's code is then kept only while the
  page stays open, and the Playground says so (FR-019).
- **A new version of the site with a newer TypeScript is published**: an open Playground isn't
  interrupted. The stored copy keeps working, offline too, until a complete new one is stored on a
  later online visit, and the version shown is always the one running (FR-013).
- **The visitor clears the site's stored data**: the next open downloads TypeScript again.

**Editing**

- **Code that doesn't compile**, such as a syntax error or a type error: the errors show in the
  editor and the Errors pane. The JavaScript pane still shows what TypeScript produces, as it does
  for any code, unless the options say not to produce any, when it says why (FR-021, FR-023).
- **A very long piece of code pasted in**: the editor stays usable. Checking may take longer, and
  the Playground shows that it is still checking rather than showing stale errors as current
  (FR-016).
- **An `import` of a package, or `require`**: marked as an error saying packages can't be imported
  here; running logs the same and fetches nothing (FR-042).
- **Choosing an example after editing**: the example replaces the code, the Playground says so, and
  undo brings the visitor's code back (FR-027).
- **An option that makes TypeScript produce no declarations or no JavaScript**: the pane says why
  instead of showing nothing (FR-023).

**Running**

- **Code that throws at the top**: the logs show the error, with its line in the visitor's code, and
  the run ends, saying it ended with an error (FR-035).
- **Code that throws inside a timer**: the error is logged, other timers go on firing as in any
  JavaScript, and the end of the run says how many errors were not caught (FR-035).
- **A promise rejected and never handled**: logged as an error, as a thrown error is (FR-035).
- **A promise that never settles, with no timer pending**: nothing is left to do, so the run ends
  (FR-036).
- **An interval left running**: the run shows as still going, with its timers counted, until the
  visitor stops it, runs again or closes the window. It never triggers the popup (FR-036, FR-037).
- **A timer of hours**: the run waits as long as the window stays open, with no popup (FR-037).
- **An endless loop, or a long calculation**: the site stays responsive, the popup appears after 5
  seconds, and Stop ends it (FR-040, FR-048).
- **A loop of promises that never pauses**, such as a promise chain that schedules itself forever:
  it blocks as a loop does, so the popup appears (FR-048).
- **Keep waiting, then the code finishes**: the run ends normally, and no popup appears again.
- **The code pauses while the popup shows**: the popup closes by itself, and screen readers are
  told (FR-049).
- **Code that prints as fast as it can**: the logs keep the latest 1,000 entries and say how many
  earlier ones were dropped. The site and the editor stay responsive (FR-044).
- **One huge log entry**, such as a string of millions of characters: cut to 10,000 characters with
  a note (FR-044).
- **Code that uses all the memory it can**: the run ends, the logs say it ran out of memory, and the
  site and the next run work (FR-045).
- **Values that are hard to show**: circular objects show the circular part marked, functions and
  classes by name, and very deep objects shortened with a note (FR-034).
- **Text in the logs that looks like markup or a link**: shown as text, never as part of the page
  (FR-047).
- **Run while a run is going**: the first run ends, then the new one starts with empty logs
  (FR-032).
- **The window is closed, minimized or the page reloaded during a run**: closing or reloading ends
  the run. Minimizing doesn't: the run goes on, and a popup that comes due shows when the window is
  restored (FR-046, FR-050).
- **The Playground shows its specs during a run** (007): the run goes on. A popup that comes due
  shows when the visitor goes back to the Playground (FR-050).
- **The popup comes due while another window is focused**: it shows in the Playground's window
  without bringing it to the front or taking focus (FR-050).
- **The code tries to open a window, change the page's address, read the site's storage or cookies,
  or reach another app**: it can't. Nothing outside the logs changes (FR-039).
- **`prompt` or `confirm`**: the logs say they aren't available, and they return as if the visitor
  had cancelled (FR-043).

**Sharing**

- **A shared link that was cut off, altered by hand or garbled by an app**: the Playground opens with
  the starting example and says the shared code couldn't be read. Nothing runs, and no part of the
  code is shown as if it were complete (FR-056).
- **A shared link with an option this version doesn't know**: the code opens, the unknown option is
  left out, and the Playground says so (FR-056).
- **Code too long for a link**: Share offers to copy the code itself instead, and never makes a link
  that would be cut (FR-055).
- **A shared link opened while the Playground holds the visitor's code**, from this visit or an
  earlier one: the shared code replaces it, the Playground says so, and undo brings the visitor's
  code back (FR-057).
- **A shared link opened offline**: the site opens from its stored copy. If TypeScript is stored,
  the Playground opens with the code as online; if not, it shows the offline state of FR-011 and
  keeps the shared code for when the download finishes.
- **The clipboard can't be written**, such as when the browser refuses: the link shows in a field,
  selected, to copy by hand (FR-052).
- **Reloading after opening a shared link**: once opened, the shared code is kept as any code is,
  and the address no longer carries it, so a reload shows the code with the visitor's edits
  (FR-053).
- **Reset while a run is going**: the run ends first, as for Run (FR-080).
- **The visitor clears the site's stored data**: their kept code and options are gone, and the next
  open shows the starting example.
- **Kept code from an older version of the site**: it opens as it was. An option the Playground no
  longer offers is left out, and the Playground says so (FR-019).
- **Code that makes many requests, or a request that never answers**: a pending request is work
  left to do, so the run shows as still going until it answers or the visitor stops it; it never
  counts as blocking for the popup (FR-041).

**Phones and shells**

- **A shared link opened on a phone**: the "best on desktop" screen, saying the link holds code to
  open on a desktop. Nothing runs and TypeScript isn't downloaded (FR-060).
- **A tablet or a narrow desktop window that gets the mobile shell** (005 FR-001): it gets the "best
  on desktop" screen, as the shell is chosen by space alone.
- **The shell switches while the Playground has code or a run going** (005 FR-002): nothing is lost.
  The run goes on, and switching back shows the Playground as it was (FR-061).
- **The device has no way of sharing of its own**: Share link copies the link, and says so (FR-058).

**Elsewhere in the site**

- **`open playground` in the Terminal**: until 006 is amended after this feature (Assumptions),
  `open` lists the names it accepts, as for any unknown name (006 FR-014).
- **Scripting turned off**: the site root shows 005's page with a link to `/cv` (005 FR-049). The
  Playground isn't there.
- **Printing the Playground**: not designed, as for the rest of the shell (005).

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `008-typescript-playground-FR-###`. UI implementing a requirement carries
`data-req="008-typescript-playground-FR-###"` (Constitution III).

### Functional Requirements

**The app**

- **FR-001**: The Playground MUST be an app of the OS shell (005 FR-003) that declares support for
  both shells: on desktop it is the editor this spec describes, and on mobile it is the "best on
  desktop" screen (FR-058). The dock and the home screen MUST show it after the CV app and the
  Terminal, so the CV app stays first and the CV path is unchanged (Constitution VII). Its name and
  icon MUST be the ones the approved design sets.
- **FR-002**: The Playground MUST NOT open by itself. On first load the desktop shell MUST still
  show only the CV window open (005 FR-005), and the mobile shell the home screen. The one exception
  is a shared link (FR-053), which the visitor followed to reach the Playground.
- **FR-003**: On desktop the Playground MUST open in a window that behaves as every app's window
  does (005 FR-012, FR-016 to FR-030 and FR-061 to FR-065), with its own menu in the menu bar
  holding Run, Stop, Share, Examples, the settings and Reset (FR-080). On mobile it MUST open full
  screen as every app does (005 FR-032 to FR-035).
- **FR-004**: Opening the Playground while TypeScript is downloading MUST move focus to the window's
  title, so a screen reader announces it (005 FR-040). Once the editor is usable, focus MUST move
  to the editor if it is still in the Playground's window, and a screen reader MUST announce the
  Playground's name and the editor's name, as 005 FR-040 allows an app made for typing to do.
- **FR-005**: The Playground MUST have "Show specs" and a way back, as every app does (007 FR-001 to
  FR-004), on desktop and on its mobile screen. Going back MUST show the Playground as it was: the
  same code, cursor, selection, scroll position, open pane, settings and logs. A run MUST go on
  while the spec view shows.
- ~~**FR-006**~~: Removed 2026-10-29 – moved to an amendment of 006 in its own pull request, after
  this feature ships (Constitution XI). It said: the Terminal's `open` (006 FR-014) MUST accept
  `playground`, opening the Playground or bringing it to the front as its dock item or home-screen
  icon does.

**Loading TypeScript**

- **FR-007**: When the Playground opens on desktop and TypeScript isn't stored in the browser, it
  MUST download it and say in its window that TypeScript is downloading, with how much has arrived
  out of the total, as text and as a progress indicator. The editor MUST NOT be usable until the
  download finishes and MUST be usable as soon as it does. Closing the window during the download
  MUST NOT leave a broken copy: the next open goes on with the download or starts it again.
- **FR-008**: Once downloaded, TypeScript MUST be kept in the browser, so every later open, in the
  same visit or a later one, online or offline, makes the editor usable with no download.
- **FR-009**: TypeScript MUST be downloaded only when the Playground first opens on desktop: never
  on the site's first load, never as part of the stored copy every visit makes (005 FR-052), never
  in the mobile shell, and never for the CV. The site root's first load MUST show the shell and the
  CV as soon as it does without this feature.
- **FR-010**: The Playground MUST load everything it uses from the site itself, including TypeScript
  and its type definitions, and MUST make no request to any other site (005 FR-054). The only
  requests to other sites are those the visitor's own code makes when it runs (FR-041).
- **FR-011**: When the download can't start or stops part way, such as with no network, the
  Playground MUST say in site text that TypeScript has to be downloaded once with a connection, how
  large the download is, and offer Retry. It MUST start the download again by itself when the
  network returns, and MUST never use a part-downloaded copy. The window MUST never be blank or
  broken.
- **FR-012**: The Playground MUST show the version of TypeScript it runs, in the place the approved
  design sets, read from TypeScript itself and never typed by hand. It runs one version, the one the
  site ships with.
- **FR-013**: When a new version of the site ships a different TypeScript, a stored copy MUST keep
  working, offline too, until a complete new copy is stored on a later online visit (004 FR-039 to
  FR-041). A new version MUST NOT interrupt an open Playground, and the version shown MUST always be
  the one running.
- **FR-014**: When the browser can't keep TypeScript, such as in a private window or with storage
  turned off or full, the Playground MUST still work online, downloading it again when needed, and
  MUST say in site text that it couldn't keep TypeScript for offline use.

**Editing**

- **FR-015**: The editor MUST hold one piece of TypeScript code and work as VS Code does, as the
  official TypeScript Playground's editor does. It MUST offer at least: line numbers and syntax
  colors; undo and redo; indenting; commenting out lines; matching, closing and surrounding with
  brackets and quotes; folding; several cursors and selections; moving, copying and deleting lines;
  expanding and shrinking a selection; finding and replacing text; going to a line and to a named
  part of the code; highlighting the other uses of the name under the cursor; and formatting the
  code or a selection as TypeScript formats it.
- **FR-016**: The editor MUST mark every error and warning TypeScript reports for the code with the
  current options, at its place in the code, with its message on hover and at the cursor. The marks
  MUST update within 1 second of the visitor pausing their typing. While checking takes longer, the
  Playground MUST show that it is still checking rather than show earlier results as current.
- **FR-017**: Pointing at a name, or asking with the keyboard with the cursor on it, MUST show its
  type and any documentation it has, as TypeScript describes it.
- **FR-018**: While the visitor types, and when they ask with the keyboard, the editor MUST suggest
  completions, each with its name and type, chosen with the keyboard or a pointer. Inside a call it
  MUST show the function's parameters and which one the cursor is on.
- **FR-019**: The first time the Playground opens in a browser, the editor MUST hold the starting
  example (FR-028) with the default options. After that, the visitor's code and compiler options
  MUST be kept in the browser, on their device, as they change, so closing the window, reloading the
  page or a later visit opens them as they were left. They MUST be kept only in this browser and
  sent nowhere. When the browser can't keep them, such as in a private window or with storage turned
  off or full, they MUST be kept while the page stays open, and the Playground MUST say so in site
  text. An option kept from an older version of the site that the Playground no longer offers MUST
  be left out, and the Playground MUST say so.
- **FR-080**: The Playground's menu MUST hold Reset. After the visitor confirms, it MUST end any run,
  put the starting example and the default options back, and stop keeping the visitor's code and
  options. Until the visitor edits again, undo MUST bring their code back.
- **FR-081**: The editor MUST let the visitor go to where a name is defined, look at its definition
  in place without leaving where they are, list every use of it, and rename it everywhere in the
  code at once, as TypeScript works them out.
- **FR-082**: Where TypeScript offers quick fixes or refactorings, such as declaring a missing
  property, adding a missing `await`, or moving code into a function, the editor MUST show that
  they are there at the line and offer them from the keyboard and a pointer. Choosing one MUST
  change the code as TypeScript sets, and undo MUST take it back. A fix that would add a package
  import MUST NOT be offered (FR-042).
- **FR-083**: The editor's commands MUST use VS Code's default keys for the visitor's system, with
  `Cmd` on a Mac where VS Code uses it, such as `Ctrl+Space` for suggestions, F12 to go to a
  definition, `Shift+F12` for every use, F2 to rename, `Ctrl+.` for quick fixes, F8 and `Shift+F8`
  for the next and previous error, `Ctrl+/` to comment out lines, `Ctrl+F` and `Ctrl+H` to find and
  replace, `Ctrl+G` to go to a line, `Ctrl+D` to add the next match to the selection, `Alt+Up` and
  `Alt+Down` to move lines, F1 for the command palette, `Ctrl+M` to make Tab move focus, and
  `Alt+F1` for the editor's accessibility help, except as FR-084 sets. Run MUST be `Ctrl+Enter`, as
  in the official Playground. These keys work only while focus is in the editor (005 FR-029).
- **FR-084**: The editor MUST NOT take over a key the shell's shortcuts use (005 FR-025 to FR-029),
  so the menu bar, the dock and the other windows are always one shortcut away (005 FR-030), nor a
  key the current main desktop browsers or screen readers reserve. A command whose VS Code key is
  taken MUST get another key, shown in the command palette and the keyboard list (FR-085). Format
  Document MUST keep VS Code's key, `Shift+Alt+F`, which the amendment of 005 frees (Assumptions).
- **FR-085**: A command palette MUST list every editor command with its key, and run the one the
  visitor picks. The Playground's menu MUST show each of its commands with its key (005 FR-029),
  and MUST open a list of every key of the Playground and its editor, saying where one differs from
  VS Code and why (FR-084).

**Panes**

- **FR-020**: Beside the editor, as the approved design sets, the Playground MUST offer four panes:
  JavaScript, Declarations, Errors and Logs. The visitor MUST be able to switch between them, and the
  Errors and Logs panes MUST show their count of entries in their names.
- **FR-021**: The JavaScript and Declarations panes MUST show the JavaScript and the type
  declarations TypeScript produces for the code with the current options, updated whenever the
  errors are (FR-016). They MUST be read-only, with syntax colors, and their text MUST be selectable
  and copyable.
- **FR-022**: The Errors pane MUST list every error and warning of FR-016, each with its line,
  column, message and TypeScript's error number. Activating one MUST move the editor's cursor to it.
  With none, it MUST say in site text that there are no errors.
- **FR-023**: When TypeScript produces no JavaScript or no declarations for the code, such as when
  an option says not to when there are errors, the pane MUST say why in site text instead of
  showing nothing.

**Settings**

- **FR-024**: A settings panel MUST change the compiler options: at least the language version the
  JavaScript targets, strict mode and each check it turns on, and the other checks and output
  options the approved design lists, each with its name and a short description. Options that need
  more than one file, a package or a file system MUST NOT be offered.
- **FR-025**: A change of option MUST apply at once to the marks, the Errors pane and the JavaScript
  and Declarations panes, with no reload. The defaults MUST be the ones the approved design sets,
  with strict mode on, and a control MUST put every option back to its default.
- **FR-026**: The compiler options MUST travel in shared links (FR-052) and be kept as the code is
  (FR-019).

**Examples**

- **FR-027**: An Examples control MUST list every example, grouped by topic, each with a title and a
  short description. Choosing one MUST replace the code with it and set any option it needs, say so,
  and undo MUST bring the previous code back.
- **FR-028**: The examples MUST include at least: a starting example that says what the Playground
  is and how to run code; basic types; narrowing; generics; a timer and a promise, showing a run that
  stays going while timers are pending; an endless loop, showing the stuck popup; and at least three
  that work with the CV data (FR-029).
- **FR-029**: Any code in the Playground MUST be able to use the CV document through a name the
  approved design sets, with no import. Its value MUST be the CV document as read from the CV
  content source when the site is built, as every app reads it (Constitution IV), and its type MUST
  follow the CV document's rules (002), so types on hover, suggestions and errors work on it. A CV
  fact MUST NOT be typed by hand into an example: a change to the CV document MUST show in the CV
  examples at the next build with no edit to the Playground.
- **FR-030**: With the default options and the current CV document, every example MUST show no
  errors, and every example but the endless loop and any that shows an interval MUST run to its end
  with no uncaught error.
- **FR-031**: The examples' titles, descriptions and comments MUST be site text, in English, set by
  the approved design, holding no CV fact (005 FR-043). CV facts reach the examples only through the
  CV data (FR-029).

**Running**

- **FR-032**: A Run control, and a shortcut that follows 005 FR-029, MUST run the JavaScript of the
  current code and show the Logs pane, emptied of any earlier output. Run while a run is going MUST
  end that run first.
- **FR-033**: Errors MUST NOT stop the code from running: Run MUST run the JavaScript TypeScript
  produces, and the logs MUST first say how many errors the code has. When TypeScript produces no
  JavaScript (FR-023), the logs MUST say that nothing ran, and why.
- **FR-034**: The logs MUST show every call to `console.log`, `console.info`, `console.warn`,
  `console.error` and `console.debug` with its level, told apart by more than color. Any other
  console method MUST show its output as a log line, and `console.clear` MUST empty the logs. Values
  MUST be shown readably: strings, numbers, `null` and `undefined`, arrays, objects, nested values,
  maps, sets, dates and errors, with circular parts marked, functions and classes by name, and very
  deep or long values shortened with a note.
- **FR-035**: An error thrown and not caught, and a promise rejected and never handled, MUST show in
  the logs with the error's name, its message and the line in the visitor's code it came from. The
  run MUST go on while work is left, as JavaScript does, and its end MUST say how many errors weren't
  caught.
- **FR-036**: While a run is going, the Playground MUST show that it is: running, and while timers or
  intervals are pending, how many are left. The run MUST end when nothing is left to do, and the
  Playground MUST then show how it ended (finished, stopped, or with errors) and how long it took.
- **FR-037**: Code MUST be able to use timers, intervals and promises of any length. Waiting on them
  MUST never end a run, and MUST never count towards the stuck popup (FR-048).
- **FR-038**: A Stop control MUST end a run at any time, including while the code blocks, within 1
  second. It MUST cancel every pending timer, keep the code and the logs, and the logs MUST say that
  the run was stopped.
- **FR-039**: The code MUST run apart from the site. It MUST have no access to the site's stored
  data or cookies, to the page, the shell, other apps or windows, the visitor's files or settings, or
  the page's address. It MUST NOT be able to open windows, navigate, or show anything anywhere but
  the logs, and nothing it stores MUST outlast its run.
- **FR-040**: Whatever the code does, such as blocking, looping, using memory or printing, the shell,
  every other window, and the Playground's editor and Stop control MUST keep responding.
- **FR-041**: Running code MUST be able to make requests to any site it names, as code in a browser
  can, and nothing more of the site: its requests MUST carry none of the site's stored data or
  cookies. A pending request MUST count as work left to do (FR-036) and never as blocking (FR-048).
  With no network, or when the other site refuses, a request MUST fail as it would in any
  JavaScript, and the code can log the error.
- **FR-042**: Code MUST NOT be able to import packages. An `import` of a package or a `require` MUST
  be marked as an error saying packages can't be imported here, and running it MUST log the same and
  fetch nothing.
- **FR-043**: `alert` MUST write its message to the logs, marked as an alert, and the code MUST go
  on. `prompt` and `confirm` MUST write to the logs that they aren't available in the Playground,
  and MUST return as if the visitor had cancelled.
- **FR-044**: The logs MUST keep at most the latest 1,000 entries and say how many earlier entries
  were dropped. An entry longer than 10,000 characters MUST be cut, with a note. Code that prints
  as fast as it can MUST NOT make the site or the editor stop responding (FR-040).
- **FR-045**: When a run runs out of memory or stops unexpectedly, it MUST end, and the logs MUST
  say what happened. The site MUST keep working, and the next run MUST work.
- **FR-046**: Closing the Playground's window, reloading the page or leaving the site MUST end any
  run. Nothing of a run MUST go on after its window is closed.
- **FR-047**: Everything the code prints MUST show as text: nothing it prints can add markup, links,
  styles or controls to the site.

**The stuck popup**

- **FR-048**: When a run has blocked for 5 seconds without a pause, a popup inside the Playground's
  window MUST say in site text that the code may be stuck in a loop, and offer Stop and Keep waiting.
  Waiting on timers or promises MUST never count as blocking.
- **FR-049**: Keep waiting MUST close the popup, and if the run is still blocked 5 seconds later the
  popup MUST ask again. Stop MUST end the run as FR-038 does. If the code pauses or the run ends
  while the popup shows, it MUST close by itself, and screen readers MUST be told.
- **FR-050**: The popup MUST be inside the Playground's window and MUST never cover the shell, any
  other window or the CV. The rest of the site MUST stay usable while it shows. It MUST NOT bring
  the window to the front or take focus from another window. While the window is minimized or shows
  its specs (FR-005), a popup that comes due MUST wait until the Playground shows again.
- **FR-051**: The popup MUST be announced as a dialog named for what it says. When it appears while
  focus is in the Playground's window, focus MUST move to its Stop control. Escape MUST keep waiting,
  and closing the popup MUST return focus where it was. The shell's shortcuts MUST keep working while
  it shows (005 FR-025 to FR-030).

**Sharing**

- **FR-052**: A Share control MUST make a link to the site that carries the code and every compiler
  option changed from the defaults, copy it, and say so in site text, announced to screen readers.
  Where the device offers its own way of sharing, it MUST be offered too. When the link can't be
  copied, it MUST show in a field, selected, to copy by hand.
- **FR-053**: Opening a shared link at a desktop width MUST open the desktop shell with the CV window
  as on first load (005 FR-005) and the Playground in front of it, focused, holding the shared code
  and options, with a note in site text that the code came from a link. It MUST NOT run the code:
  only the visitor's Run does. Once opened, the shared code MUST be kept as any code is (FR-019), and
  the page's address MUST no longer carry it, so a reload shows the code with the visitor's edits.
- **FR-054**: Everything a shared link opens MUST be in the link itself: sharing MUST send nothing to
  any server, and a shared link MUST open offline as FR-011 and FR-008 allow.
- **FR-055**: A shared link MUST NOT be longer than 8,000 characters. When the code and options don't
  fit, Share MUST say in site text that the code is too long to share as a link, and offer to copy
  the code itself instead. It MUST never make a link that would be cut.
- **FR-056**: When a shared link's code can't be read, such as when it was cut off, altered or
  garbled, the Playground MUST open with the starting example and say in site text that the shared
  code couldn't be read. It MUST run nothing, and MUST never show part of the code as if it were
  complete. An option the Playground doesn't know MUST be left out, and the Playground MUST say so.
- **FR-057**: When a shared link opens while the Playground holds the visitor's code, from this
  visit or an earlier one, the shared code MUST replace it, the Playground MUST say so, and undo MUST
  bring the visitor's code back.

**Phones**

- **FR-058**: In the mobile shell, the Playground MUST show a "best on desktop" screen instead of the
  editor: site text that says what the Playground is and that a code editor works best on a desktop
  with a keyboard, with Share link, which opens the device's own sharing where it has one and copies
  the link where it doesn't, saying so, and Copy link. It MUST NOT show an editor, download
  TypeScript or run code.
- **FR-059**: The link the "best on desktop" screen shares MUST open the Playground at a desktop
  width. When the screen was opened from a shared link, it MUST be that link, unchanged. When the
  Playground holds the visitor's code, such as after the shell switched from desktop, it MUST carry
  that code as Share does (FR-052, FR-055). Otherwise it MUST open the Playground with the starting
  example.
- **FR-060**: Opening a shared link at a phone width MUST open the mobile shell with the Playground's
  "best on desktop" screen full screen, saying in site text that the link holds code to open on a
  desktop. It MUST NOT show the shared code, run anything or download TypeScript.
- **FR-061**: When the shell switches (005 FR-002) while the Playground is open, nothing MUST be
  lost: the code, the options, the open pane and the logs MUST be kept, a run MUST go on, and
  switching back MUST show the Playground as it was.

**Keyboard and screen readers**

- **FR-062**: Every action of the Playground MUST be possible with the keyboard alone: editing,
  reading errors and types, choosing suggestions, switching panes, the settings, the examples, Run,
  Stop, Share, the popup and Show specs, with focus always visible (005 FR-024). Tab in the editor
  indents, so VS Code's key for making Tab move focus (FR-083) MUST let it move focus out of the
  editor, and the editor's description MUST say which key, so focus is never trapped (005 FR-030).
  The shell's shortcuts MUST also work from inside the editor (FR-084).
- **FR-063**: The editor MUST be named for screen readers, and its code MUST be readable line by
  line. A screen reader MUST be able to hear the errors on the current line, move to the next and
  previous error with a key, hear the type under the cursor (FR-017), and hear each suggestion as the
  visitor moves through them (FR-018).
- **FR-064**: The panes MUST be tabs, each named. A change in the count of errors MUST be told to
  screen readers when the visitor pauses typing, not at every key. New log entries MUST be told
  without moving focus, at most once a second when the code prints a lot, summed up.
- **FR-065**: The download's start, its progress at sensible steps, its end and its failure MUST be
  told to screen readers without moving focus, except as FR-004 sets.
- **FR-066**: A run's start, its count of pending timers when it changes, and its end MUST be told to
  screen readers without moving focus, and without a message for every timer that fires when many do.
- **FR-067**: Every control of the Playground MUST have a target of at least 24 by 24 CSS px (005
  FR-037).

**Look, motion and accessibility**

- **FR-068**: The Playground's look MUST be the site's own and MUST match the approved mockup for
  each shell (Constitution II, IX), including the editor's syntax colors. It MUST NOT copy the look
  of the official TypeScript Playground. Every design value MUST come from tokens, and motion values
  from the motion token source. The token check (003) MUST pass over the Playground with no
  exception added for it.
- **FR-069**: When the visitor asks for reduced motion, the download progress, the running state, the
  popup and switching panes MUST change with no movement, spinning or scaling (Constitution VIII).
- **FR-070**: With forced colors active, every error mark, log level, cursor, selection, focus
  indicator, control and the popup MUST stay visible and distinguishable, and MUST NOT rely on color,
  a background color or a background image alone.
- **FR-071**: The Playground MUST conform to WCAG 2.2 Level AA in every state: downloading, the
  offline state, the editor with errors, a type shown, suggestions open, a definition shown in
  place, a rename under way, quick fixes open, the command palette, the list of keys, each pane, the
  settings, the examples, a run with timers pending, the popup, the share message, the too-long and
  broken-link messages, and the "best on desktop" screen. It MUST keep all content and function at
  200% browser zoom and text-only zoom, at 400% zoom on a window 1280 px wide, and with text spacing
  overridden as WCAG 2.2 success criterion 1.4.12 describes.
- **FR-072**: At every window size the shell allows, the Playground MUST read without horizontal
  scrolling, rearranging its editor and panes as the approved design sets. Only lines of code, in
  the editor and the JavaScript and Declarations panes, MAY scroll sideways.

**Offline**

- **FR-073**: After one complete open of the Playground online, every part of it MUST work with no
  network as it does online: opening, editing, types, errors, every pane, the settings, every
  example including the CV data, running, the popup and sharing, in the site's fonts (Constitution
  VI, 005 FR-052).

**Traceability and checks**

- **FR-074**: Every element that implements a requirement in this spec MUST carry
  `data-req="008-typescript-playground-FR-###"`, listing every requirement it implements, and the
  requirement traceability check (001) MUST pass.
- **FR-075**: A Playground check MUST build the site and, at a desktop width, open the Playground,
  wait for the download and confirm: the version shown; errors, types and suggestions; going to a
  definition, every use, renaming, a quick fix, formatting and the command palette, each with its VS
  Code key, and the keys of FR-084 left to the shell; the panes and an option change; every example
  against FR-030, with the CV examples' output matching the CV document; a run with logs, a timer
  count and its end; an interval running until Stop; Stop ending a blocking loop; the popup after 5
  seconds of blocking and asking again after Keep waiting, inside the window only; no popup for a
  60-second timer; `alert`, `prompt` and `confirm`; the sandbox of FR-039; a request from the code
  to another site carrying nothing of the site; the output limits of FR-044; the code and options
  kept across a reload, and Reset; a shared link opening without running; broken and too-long links;
  and Show specs keeping the Playground's state. At a phone width, it MUST confirm the "best on
  desktop" screen, from its icon and from a shared link. It MUST read what it expects from the built
  site, the CV document and TypeScript, not from a hand-written copy.
- **FR-076**: The accessibility check (004, 005 FR-056) MUST cover every state FR-071 lists. The
  other-site check MUST cover the download, a run of code that makes no request, sharing and the
  "best on desktop" screen, and MUST confirm the Playground makes no request to another site of its
  own (FR-010).
- **FR-077**: The keyboard check (005 FR-057) MUST, at a desktop width and with the keyboard alone,
  open the Playground from the dock, type, move to an error and read it, read a type, choose a
  suggestion, go to a definition and back, rename, apply a quick fix, open the command palette,
  reach the menu bar with the shell's shortcut from inside the editor, leave the editor, switch
  panes, change an option, choose an example, run, handle the popup with Keep waiting and then Stop,
  share and close the window, confirming a visible focus indicator and where focus lands at each
  step.
- **FR-078**: The offline check (005 FR-059) MUST open the Playground with no network before it was
  ever opened and confirm the offline state of FR-011, then with the network back confirm the
  download, then with no network again confirm FR-073 at a desktop width.
- **FR-079**: The checks of this spec MUST run in the same one command and on the same pull requests
  as 004's and 005's, give the same result locally and on the pull request, and name the state, the
  width and, for examples, the example in every failure.

### Key Entities

- **Code**: the one piece of TypeScript the editor holds, kept in the browser with the compiler
  options between visits until the visitor resets it.
- **Compiler options**: the settings that decide how TypeScript checks the code and what it produces,
  each with a default.
- **Editor command**: something the editor does, such as renaming or formatting, with its key,
  VS Code's unless the shell or the browser holds it (FR-084).
- **Diagnostic**: an error or warning TypeScript reports: its line, column, message, number and
  whether it is an error or a warning.
- **TypeScript copy**: the downloaded TypeScript the Playground runs, with its version, kept in the
  browser after the first open.
- **Example**: a piece of code with a topic, a title, a short description and any options it needs.
  CV examples read the CV data.
- **CV data**: the CV document as read from the CV content source when the site is built, with its
  type following the CV document's rules (002), available to any code.
- **Run**: one running of the code's JavaScript, apart from the site: its state (running, waiting on
  timers, finished, stopped, ended with errors), its pending timers, its log entries and how long it
  took.
- **Log entry**: one line of output: its level (log, info, warn, error, debug, alert or note), its
  values shown as text, and for errors the line in the code it came from.
- **Stuck popup**: the popup inside the Playground's window that offers Stop and Keep waiting when a
  run blocks.
- **Shared link**: a link to the site that carries code and changed options, no longer than 8,000
  characters, and never runs on open.
- **"Best on desktop" screen**: what the Playground shows in the mobile shell.
- **Site text**: text in the Playground that isn't CV content or code, such as messages, labels and
  example descriptions, set by the design, in English.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: the Playground in a window from the dock, with its menu in the menu bar | - |
| Mobile (iOS-style) | No: the editor isn't offered, because a code editor on a phone keyboard is a poor experience | The Playground's icon on the home screen opens a full-screen "best on desktop" screen that says why and offers to share or copy the link (FR-058 to FR-060) |

**CV path**: Unchanged. The Playground never opens by itself, so first load shows only the CV
window on desktop and the home screen on mobile (FR-002), and the Playground comes after the CV app
in the dock and on the home screen (FR-001). A shared link opens the Playground in front of the CV
window, because the visitor followed a link to it, and the CV window is still open behind it, one
click away (FR-053). TypeScript is never downloaded on first load (FR-009). `/cv` remains a plain
server-rendered page, unchanged by this feature.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after the Playground has been opened once online.
- **Available offline**: after one open online, everything: opening, editing, types and errors,
  every pane, the settings, every example including the CV data, running, Stop, the popup, and
  sharing (FR-073). The "best on desktop" screen works offline after one online visit, as the rest of
  the shell does (005 FR-052).
- **Needs the network**: the first download of TypeScript, on the first open of the Playground in a
  browser, and again after the visitor clears the site's stored data or when the browser can't keep
  it. It is several megabytes, more than the rest of the site, and most visitors never open the
  Playground, so it isn't part of the copy every visit stores (FR-009). A shared link's recipient
  needs the network to open the site the first time, as for any first visit (005). Requests the
  visitor's own code makes to other sites need it too; offline they fail as in any JavaScript, and
  the code can log the error (FR-041).
- **Offline state shown**: on a first open with no network, the Playground's window says that
  TypeScript has to be downloaded once with a connection, how large it is, and offers Retry; the
  download starts by itself when the network returns (FR-011). Never a blank or broken view.

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/008-typescript-playground/design/`:

- [ ] ASCII wireframes of every state: on desktop, the window downloading TypeScript, the offline
  first open, the editor with errors, a type on hover, suggestions open, a definition shown in
  place, a rename, quick fixes, the command palette, the list of keys, each pane, the settings
  panel, the examples list, a run with timers pending, the stuck popup inside the window beside the
  CV window, the share message, the too-long and broken-link messages, a shared link opened, the
  Playground's spec view, and a narrow window; on mobile, the "best on desktop" screen from its icon
  and from a shared link, at 320 px wide and in landscape
- [ ] PNG exports of the approved Penpot mockup, per shell, at a phone width and a desktop width (or
  of the interim local mockup, under the constitution's interim provision)
- [ ] Penpot file link: [URL] (not needed for an interim local mockup until the provision ends)
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date, and confirming
  the look is original and doesn't copy the official TypeScript Playground (FR-068)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a 10 Mbit/s connection, the editor is usable within 15 seconds of first opening the
  Playground, and within 2 seconds on every later open, online or offline.
- **SC-002**: For code up to 300 lines, errors update within 1 second of the visitor pausing their
  typing, and a type or a list of suggestions shows within 500 ms of asking, in 95% of attempts.
- **SC-003**: Stop ends a run within 1 second in 100% of the cases the Playground check covers,
  including an endless loop.
- **SC-004**: The stuck popup appears between 5 and 6 seconds after code starts blocking in 100% of
  check runs, and never for a run that only waits on timers, including a 60-second timer.
- **SC-005**: While code blocks, loops or prints as fast as it can, the shell, other windows and the
  Playground's editor respond to a click or a key within 100 ms.
- **SC-006**: Code reads 0 items of the site's stored data, page or other apps in every sandbox test,
  and 0 shared links run their code on open.
- **SC-007**: 100% of codes that fit a shared link reopen from it identical, with the same options.
- **SC-008**: 100% of the examples show no errors with the default options and the current CV
  document, every time the Playground check runs.
- **SC-009**: The site root's first load downloads 0 bytes of TypeScript, and with this feature
  added 005's SC-001, SC-003 and SC-004 still hold: the CV is as quick to reach as before, and every
  Lighthouse category still scores 90 or more on both profiles for the site root and for `/cv`.
- **SC-010**: The automated accessibility check finds 0 WCAG 2.2 AA violations in every state of
  FR-071. The owner also checks by hand, with one screen reader on a desktop, that every action of
  story 6 can be done and is announced.
- **SC-011**: After one open online, 100% of the Playground's actions of FR-073 work with no
  network, every time the offline check runs.
- **SC-012**: The Playground makes 0 requests to any other site of its own; the only ones are those
  the visitor's code makes when it runs.
- **SC-013**: With reduced motion set, the Playground moves, spins or scales 0 elements.
- **SC-014**: A first-time visitor who doesn't write TypeScript can run an example within 3 actions
  of opening the Playground: Examples, an example, Run.
- **SC-015**: When this feature is merged, every requirement in this spec is covered by at least one
  test, the content check (002) and the token check (003) pass with no exception added for the
  Playground, and the local run of every check gives the same result as the pull-request run.

## Assumptions

- **Users**: engineers reviewing the craft are the main users; hiring managers may try an example.
  Recruiters don't need the Playground, so it never stands in front of the CV.
- **Modeled on the official Playground, in features only**: the editing, panes, settings, examples,
  running and sharing follow what the official TypeScript Playground offers, as the vision asks. The
  look is the site's own (Constitution IX), and the name and icon are set by the design.
- **The editor works like VS Code**: as the official Playground's editor does, so a VS Code user's
  habits carry over: the same editing features and the same default keys for their system. The
  shell's shortcuts (005) and keys the browser or a screen reader reserve win over the editor, so
  any editor command whose key is taken gets another one, listed in the Playground. Format Document
  keeps `Shift+Alt+F`, freed by the amendment of 005 below.
- **The amendment of 005**: the shell drops its Minimize and Maximize shortcuts (005 FR-063 and
  FR-065), so `Shift+Alt+F` (`Shift+Option+F` on a Mac) is free for Format Document. The minimize
  and maximize controls and the window's menu commands stay. It is made in its own pull request,
  spec first with its design and tests (Constitution XI), and merges before this feature's code.
  Editor settings, keymaps, themes chosen by the visitor and extensions are not part of it.
- **When TypeScript is downloaded**: on the Playground's first open, as the description says, not on
  the site's first visit, so recruiters on phones never pay for it. Constitution VI is met by keeping
  it after that first open; the first download is the one part that needs the network, and the
  spec says why (Offline Behavior).
- **One TypeScript version**: the one the site ships with, updated through the site's own releases.
  Choosing a version is out of scope.
- **The stuck popup's period**: 5 seconds, for both the first popup and each ask after Keep waiting.
  "Blocking" means running without a pause; waiting on a timer or a promise is a pause.
- **Errors don't block running**: as in the official Playground, code with type errors still runs
  the JavaScript TypeScript produces, and the logs say how many errors there were.
- **`prompt` and `confirm`**: they return as if the visitor had cancelled (`null` and `false`), so
  code that uses them goes on and shows what it does with no answer.
- **Output limits**: 1,000 log entries and 10,000 characters per entry keep the logs readable and the
  site responsive.
- **Link length**: 8,000 characters is within what common browsers and messaging apps keep whole.
- **A shared link on desktop**: it opens the Playground in front of the CV window, which still opens
  as on first load, so the CV stays one click away (Constitution VII).
- **The CV data**: available to any code, not only examples, through one name, typed by the CV
  document's rules (002), so optional fields are optional in the code. It is read from the CV content
  source when the site is built, as every app reads it (Constitution IV).
- **Phones**: "phones" means the mobile shell, which 005 chooses by space alone, so tablets and
  narrow desktop windows get the "best on desktop" screen too. The Playground declares the mobile
  shell so its icon shows on the home screen, leading to that screen.
- **The Terminal**: gets `open playground` through an amendment of 006 in its own pull request,
  after this feature ships, as 006 expects `open` to gain names as apps are added and it can only
  be tested once the Playground exists (FR-006, removed). Running code from the Terminal is out of
  scope.
- **Show specs**: the Playground follows 007's per-app pattern, now merged.
- **What the Playground remembers**: the visitor's code and compiler options, in their browser, on
  their device, until they reset them or clear the site's data, as the vision allows for what the
  visitor makes. The run, the logs and the open pane aren't kept between visits. 005 and 006 still
  remember nothing; saving the whole state of the OS, such as open windows and their positions, may
  come in later work.
- **Network from code**: code can reach other sites as in the official Playground, so examples and
  visitors can call public services. It runs apart from the site, so its requests carry nothing of
  the site (FR-039, FR-041). The Playground itself still loads only from the site.
- **Manual checks**: the screen-reader pass of SC-010 is done by hand, and may be deferred to the
  final testing phase under the constitution's interim provision on deferred manual checks.
- **Out of scope**:
  - A shared file system and saving code as files (Files), and more than one file of code.
  - Searching the Playground (Spotlight).
  - Running code from the Terminal.
  - Saving the rest of the OS's state between visits, such as open windows and their positions.
  - Showing a shared link's code on a phone.
  - Importing packages, and type definitions for packages.
  - Choosing between TypeScript versions.
  - JSX, plugins, and exporting code to other sites.
  - VS Code features beyond the official Playground's editor: extensions, editor settings and
    keymaps, a debugger with breakpoints, and a terminal.
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II to IX and the interim provisions on local mockups and deferred
  manual checks; the requirement traceability check (001); the CV content source and its rules
  (002); the design tokens source and token check (003); `/cv`, its offline rules and its checks
  (004); the OS shell, its windows, menus, full-screen apps and checks (005), amended to drop its
  Minimize and Maximize shortcuts before this feature's code; the requirement inspector's "Show
  specs" (007); and an approved mockup of the Playground in both shells with its review sign-off.
  The amendment of the Terminal (006) for `open playground` follows this feature.
