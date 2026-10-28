# Feature Specification: The Requirement Inspector

**Feature Branch**: `007-requirement-inspector`

**Created**: 2026-10-28

**Status**: Approved

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> The requirement inspector: a toggle in the OS shell (005) that shows which requirement each
> visible UI element implements, read from its `data-req` attribute. Each label shows the
> requirement IDs, and on request the requirement's text, with a link to it in its spec in the
> repository and to the tests that reference it. Requirement data is gathered when the site is
> built. Covers both shells, apps inside the shell (CV, Terminal), keyboard and screen-reader use,
> reduced motion and offline behaviour. It never puts anything in front of the CV. Contact and
> Settings are separate features. See docs/vision.md and specs/005-os-shell.

## Clarifications

### Session 2026-10-28

- Q: Should `/cv` offer the inspector too, or does the CV app inside the shell cover it? → A: The
  CV app covers it. `/cv` stays the plain page 004 defines (FR-025).
- Q: Should the inspector put a label on every traced element at once, work like a browser's
  element picker, or both? → A: Neither. There is no site-wide switch and no labels. Each app has
  a "Show specs" control at its top that turns its window, or its full-screen view on a phone, into
  a text view of the requirements the app implements, with a button back to the app. The rest of
  the site stays as it is (FR-001 to FR-005).
- Q: Should a visitor pick an element to see its requirements, or go from a requirement to the
  elements that implement it? → A: No. The spec view lists the whole app's requirements, per app,
  with no picking and no outlines (FR-006).
- Q: Where should the spec view's "Why" come from? → A: It explains the inspector itself, not
  each requirement: a short "What's this?" that says what the spec view is and how features,
  specs, requirements, the interface and tests tie together (FR-009).
- Q: How are the menu bar, the dock and the home screen covered, as they aren't apps? → A: About
  this site has its own "Show specs", whose spec view lists the shell's own requirements (FR-011).
- Q: Should an app's spec view list only the requirements its elements carry, or every requirement
  the app implements, including ones no element can carry? → A: Only those its elements carry.
  Each spec's group also says how many of that spec's requirements the view doesn't list, with a
  link to the whole spec (FR-006).
- Q: When the site is built from a copy of the repository with uncommitted changes, what should
  the spec view's links point at? → A: The last commit the build sits on, and the spec view says
  in site text that the build includes uncommitted changes, so its links may not match (FR-010).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the specs behind an app (Priority: P1)

A hiring manager has read that the site is built spec first. On the desktop, with the CV window
open, they activate "Show specs" at the top of the window. The window stays where it is, but its
content turns into a list of the requirements the CV app implements, grouped by spec: `/cv`'s
spec, then the OS shell's, each requirement with its ID and its text. A short "What's this?"
explains what they are looking at. They read for a while, activate "Back to CV", and the CV is
back exactly where they left it.

**Why this priority**: the vision's "Showing the process" section names the inspector as the way
a visitor sees the process instead of reading about it. This story is that view. Every other story
builds on it.

**Independent Test**: build the site, open the site root at 1440 px wide, scroll the CV window
partway, activate "Show specs", and confirm that the window shows every requirement the CV app's
elements carry, grouped by spec, with text matching the specs, and nothing outside the window
changes. Activate "Back to CV" and confirm the CV is at the same scroll position. Repeat at 375 px
wide with the CV app full screen.

**Acceptance Scenarios**:

1. **Given** first load of the desktop shell, **When** the visitor looks at the CV window,
   **Then** it shows the CV, with a "Show specs" control at its top, and nothing else of the
   inspector shows.
2. **Given** the CV window is open, **When** the visitor activates "Show specs", **Then** the
   window's content turns into the CV app's spec view: every requirement the CV app implements,
   grouped by spec in numbered order, each with its ID and text, and each spec's group saying how
   many of its requirements the view doesn't list, with a link to the spec. The window keeps its
   place, size and title bar, and the title says it shows specs.
3. **Given** the CV app's spec view, **When** the visitor opens "What's this?", **Then** a short
   text explains what the spec view is and how features, specs, requirements, the interface and
   tests tie together, with a link to the repository.
4. **Given** the CV app's spec view, **When** the visitor activates "Back to CV", **Then** the CV
   shows again, at the scroll position it had.
5. **Given** the CV window shows its specs and the Terminal is open in another window, **When**
   the visitor looks at the Terminal, **Then** it still shows the Terminal, with its own "Show
   specs" control.
6. **Given** the Terminal has output and a half-typed command, **When** the visitor shows its specs
   and goes back, **Then** the output, the history and the half-typed command are as they were.
7. **Given** a phone 375 px wide with the CV app open full screen, **When** the visitor taps "Show
   specs" in the app's header, **Then** the full-screen view turns into the CV app's spec view, and
   "Back to CV" returns to the CV.

---

### User Story 2 - Follow a requirement to its spec and its tests (Priority: P2)

In the CV app's spec view, the hiring manager reads one requirement and wants proof. Below its text
are a link to the requirement in its spec in the repository and the tests that check it, each by
name with a link to its place in the repository. They follow a test link and read the test.

**Why this priority**: the vision's success criteria ask that any visible element can be traced to
its requirement and from there to its tests. Story 1 shows the requirements. This story closes the
trace.

**Independent Test**: at 1440 px wide, open the spec view of each app and of About this site, and
for every requirement confirm that the spec link leads to the requirement's line, and that the
test list is exactly the list the traceability check (001) finds for it, in the version of the
repository the site was built from.

**Acceptance Scenarios**:

1. **Given** a spec view, **When** the visitor reads a requirement, **Then** it shows a link to
   the requirement in its spec, and the tests that reference it, each with its name.
2. **Given** a spec view, **When** the visitor activates a requirement's spec link, **Then** the
   spec opens in the repository at the requirement's line, in the version the site was built from.
3. **Given** a spec view, **When** the visitor activates a test's link, **Then** the test opens in
   the repository at its line, in the version the site was built from.
4. **Given** a requirement from a spec that is still a draft, **When** the visitor reads it,
   **Then** its spec's status shows as Draft, and the view says in site text that no test covers it
   yet when none does.
5. **Given** a requirement's text changes in a merged pull request, **When** the site is built
   again, **Then** the spec view shows the new text with no edit to the inspector.

---

### User Story 3 - See the shell's own specs (Priority: P3)

An engineer wonders which requirements the dock and the windows follow. They open About this site
from the site menu and activate its "Show specs". Its spec view lists the shell's own
requirements: the menu bar, the dock, the windows' frames and controls, the home screen, and the
inspector's own controls.

**Why this priority**: the shell isn't an app, so without this story its requirements can't be seen
in the site. It reuses the view of stories 1 and 2.

**Independent Test**: at 1440 px wide and at 375 px wide, open About this site, show its specs, and
confirm that it lists every requirement carried by an element of the shell outside every app's
content, and nothing else.

**Acceptance Scenarios**:

1. **Given** About this site is open, **When** the visitor activates its "Show specs", **Then** it
   shows the shell's spec view, with every requirement the shell's own elements carry, grouped by
   spec.
2. **Given** the shell's spec view, **When** the visitor activates "Back to About this site",
   **Then** About this site shows again.

---

### User Story 4 - Use the inspector with a keyboard or a screen reader (Priority: P4)

A keyboard user Tabs into the CV window and reaches "Show specs". They press Enter, and a screen
reader announces the CV app's spec view. They jump between specs by heading, read the requirements
as a list, follow a link, come back, and press "Back to CV", landing on "Show specs" again. On a
phone, a screen reader user does the same with swipes.

**Why this priority**: Constitution VIII requires the desktop shell to be fully operable by
keyboard and both shells to meet WCAG 2.2 AA. It is a merge gate, but it refines the flows of
stories 1 to 3 rather than adding new ones.

**Independent Test**: at 1440 px wide, with the keyboard alone, show and leave the spec view of the
CV app, the Terminal and About this site, with the control and with the window's menu, confirming a
visible focus indicator and where focus lands at each step. With a desktop screen reader, then a
phone screen reader, confirm what is announced.

**Acceptance Scenarios**:

1. **Given** focus is in the CV window, **When** the user reaches "Show specs" and presses Enter or
   Space, **Then** the spec view shows, focus moves to its heading, and a screen reader announces
   it as the CV app's specs.
2. **Given** the CV window is focused, **When** the user chooses "Show specs" from the window's
   menu, **Then** the same happens.
3. **Given** the spec view, **When** the user moves by heading, **Then** each spec is a heading,
   and its requirements follow as a list.
4. **Given** the spec view, **When** the user activates "Back to CV", **Then** the CV shows and
   focus returns to "Show specs".
5. **Given** the Terminal's spec view, **When** the user goes back, **Then** focus returns to the
   Terminal's "Show specs", and Tab reaches the command line as before.

---

### User Story 5 - Reduced motion, high contrast and larger text (Priority: P5)

A visitor who has asked for reduced motion shows an app's specs, and the content changes without
any turning or sliding. Another visitor uses high-contrast mode and sees every heading, link and
control of the spec view. A third zooms to 200% and the spec view reflows inside the window.

**Why this priority**: required by Constitution VIII and WCAG 2.2 AA. It adjusts how the inspector
looks and moves, not what it does.

**Independent Test**: with reduced motion set, show and leave the spec view in both shells and
confirm nothing moves or scales. With forced colors on, confirm every part of the spec view stays
visible. At 200% zoom, confirm the spec view reads without horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** the visitor's system asks for reduced motion, **When** the visitor shows or leaves a
   spec view, **Then** the content changes with no movement or scaling.
2. **Given** forced colors are active, **When** a spec view shows, **Then** its headings, links,
   statuses and controls are visible and distinguishable.
3. **Given** text is zoomed to 200%, **When** a spec view shows, **Then** it reads without
   horizontal scrolling, and long IDs and links wrap.

---

### User Story 6 - Use the inspector offline (Priority: P6)

A hiring manager opened the site once at the office. On the train, with no signal, they show the
CV app's specs. Every requirement shows with its text and its tests. The view says that the links
to the repository need a connection.

**Why this priority**: Constitution VI. The spec view shows facts gathered when the site is built,
so it needs no network. Only following a link leaves the site.

**Independent Test**: visit the site root once online, turn the network off, open the site root at
375 px and at 1440 px wide, show the spec view of every app and of About this site, and confirm
that each matches the online one and says that its links need a connection.

**Acceptance Scenarios**:

1. **Given** one complete online visit to the site root or to `/cv`, **When** the visitor shows an
   app's specs with no network, **Then** the spec view shows as it does online.
2. **Given** no network, **When** a spec view shows, **Then** it says in site text that its links
   to the repository need a connection.

---

### User Story 7 - Every pull request proves the inspector works (Priority: P7)

The owner opens a pull request that adds a requirement and the element that implements it. The
checks build the site, show each app's specs in both shells, and confirm that the new requirement
appears in its app's spec view with its text and its tests. A failure blocks merge and says which
app, shell and requirement failed.

**Why this priority**: it keeps stories 1 to 6 true as features are added. It is last because it
checks behavior the other stories define.

**Independent Test**: break one thing at a time on a branch (leave a requirement out of a spec
view, show a stale requirement text, drop a test from a requirement's list, lose the Terminal's
output on Back) and confirm that the matching check fails with a clear message and that the pull
request can't merge.

**Acceptance Scenarios**:

1. **Given** a pull request where an app carries a requirement its spec view doesn't list, **When**
   the checks run, **Then** the inspector check fails and names the app, the shell and the
   requirement.
2. **Given** a pull request where a requirement's text in a spec view differs from its spec,
   **When** the checks run, **Then** the inspector check fails and names the requirement.
3. **Given** a pull request that passes every check, **When** the owner runs the checks locally
   with the one command, **Then** the result is the same.

---

### Edge Cases

- **Several apps showing specs at once**: each window shows its own view. Showing or leaving one
  doesn't change another (FR-004).
- **A window moved, resized, minimized, maximized or restored while showing specs**: it keeps
  showing specs, and the spec view reflows to the window's size.
- **Closing an app while it shows specs**: the next time it opens, in the same visit or later, it
  shows the app, not its specs.
- **The shell switches** (005 FR-002) while an app shows specs: it keeps showing specs in the new
  shell.
- **On mobile, going home and opening the app again** while it shows specs: it still shows specs,
  as an app keeps its state within a visit (005 FR-034).
- **Back on mobile** (005 FR-050) while an app shows specs: returns to the home screen, as from the
  app. It doesn't leave the spec view first.
- **A requirement carried by several elements of one app**: listed once in that app's view.
- **A requirement carried by an app and by the shell**: listed in the app's view and the shell's.
- **A requirement no element carries**, such as one about offline behavior, speed or the checks:
  no view lists it. Every view that shows its spec counts it among the requirements it doesn't
  list (FR-006).
- **A spec whose requirements all show in a view**: its group shows no count.
- **A requirement only an element that isn't shown yet carries**, such as one in Terminal output
  not produced yet or in a folded section: it is listed, as the view lists everything the app can
  show (FR-006).
- **A requirement whose spec is a draft**: its spec's status shows as Draft. A requirement in a
  draft spec can be referenced (001 FR-019), so it can show.
- **A requirement no test covers yet**: possible only in a draft spec (001 FR-015). The view says
  so in site text.
- **A requirement with many tests**: every test is listed. The spec view scrolls.
- **A requirement whose text holds code, a link or a reference to another requirement**: it shows
  as readable text. Links in it behave as normal links.
- **An element whose `data-req` holds an ID the build doesn't know**: it can't be merged, because
  the traceability check (001 FR-016) fails first.
- **A requirement removed between builds**: it can't be referenced (001 FR-017), so no spec view
  shows it after the next build.
- **Ctrl-click, middle-click or long-press on a link in a spec view**: behaves as a normal link.
- **The Terminal's shortcuts and keys while it shows specs**: the command line isn't shown, so its
  keys do nothing. The shell's shortcuts keep working (005 FR-025 to FR-029).
- **`open cv` in the Terminal while the CV window shows specs**: brings the window to the front,
  still showing specs, as the dock does.
- **Scripting turned off**: the site root shows 005's page with a link to `/cv` (005 FR-049). The
  inspector isn't there.
- **Offline storage unavailable or cleared**: the inspector works online and shows no error.
- **Printing a spec view**: printing the shell is not designed (005). The repository holds the
  specs.
- **A build with uncommitted changes**, such as a local build mid-edit: the spec view shows the
  text as it is in that copy, links to the last commit, and says that its links may not match
  (FR-010). Published builds and pull-request builds come from a commit, so they never show it.
- **Reloading the page, or a later visit**: every app opens showing the app (FR-004).

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `007-requirement-inspector-FR-###`. UI implementing a requirement carries
`data-req="007-requirement-inspector-FR-###"` (Constitution III).

### Functional Requirements

**Showing an app's specs**

- **FR-001**: Every app MUST have a "Show specs" control at the top of its window on desktop and of
  its full-screen view on mobile, in the place the approved design sets, visible whenever the app
  shows. Its accessible name MUST name the app, such as "Show specs for CV". On desktop, the app's
  menu (005 FR-013) MUST also hold a "Show specs" command.
- **FR-002**: Activating "Show specs" MUST turn the content of that app's window or full-screen
  view into the app's spec view (FR-006). The window MUST keep its position, size, title bar and
  controls, and the full-screen view its header and home control. The window's title, the header
  and the page title (005 FR-042) MUST say that the app's specs are shown, such as "CV · Specs".
  Nothing outside that window or view MUST change.
- **FR-003**: The spec view MUST hold, at its top, a control that returns to the app, named for it,
  such as "Back to CV". On desktop, the app's menu MUST hold the same command in place of "Show
  specs". Going back MUST show the app exactly as it was: the same scroll position and the same
  state, such as the Terminal's output, history, half-typed command and vim view.
- **FR-004**: Each app's view MUST be its own: showing or leaving one app's specs MUST NOT change
  any other app. An app MUST keep showing its specs while it stays open in the visit, including
  when its window is moved, resized, minimized, maximized or restored, when the visitor goes home
  on mobile, and when the shell switches (005 FR-002). An app MUST always open showing the app, and
  nothing of the inspector MUST be remembered between visits.
- **FR-005**: The inspector MUST NOT put anything in front of the CV (Constitution VII): the CV app
  MUST open on first load showing the CV (005 FR-005), "Show specs" MUST NOT cover any of an app's
  content, and nothing of the inspector MUST appear by itself, such as a hint, tour, badge, banner
  or tooltip.

**The spec view**

- **FR-006**: An app's spec view MUST list every requirement that any element of that app carries
  in a `data-req` attribute, whether or not the element is shown at that moment, such as Terminal
  output not produced yet, and no other requirement. Requirements MUST be grouped by spec, in
  numbered order, and each group MUST show the spec's number, title and status. Inside a group,
  requirements MUST be in ID order, each listed once. Each group MUST also say in site text how
  many of the spec's requirements the view doesn't list, such as "12 more requirements in this
  spec aren't shown here", with a link to the spec, and MUST say nothing of the kind when it lists
  them all. Removed requirements (Constitution III) aren't counted.
- **FR-007**: Each requirement in a spec view MUST show its ID, in the short form the approved
  design sets, such as `FR-011` under its spec, its text in full as its spec states it, a link to
  the requirement in its spec, and the tests that reference it, each with its name and a link to
  its place in the repository. The text MUST be readable as text: code, links and references to
  other requirements in it are shown as such, and links behave as normal links.
- **FR-008**: The tests listed for a requirement MUST be exactly the tests the traceability check
  (001 FR-010 to FR-012) counts as covering it: no skipped, disabled or placeholder test. When
  none does, the spec view MUST say so in site text.
- **FR-009**: Every spec view MUST offer "What's this?": a short text, the same in every spec view,
  that says what the spec view is, why the site has it, and how features, specs, requirements, the
  interface and tests tie together, with a link to the site's repository. It MUST be site text, and
  MUST hold no CV fact (005 FR-043).
- **FR-010**: Each spec link and test link MUST lead to the line in the repository where the
  requirement or the test is, in the version of the repository the site was built from, so the
  text the spec view shows is the text the link shows. A spec group's link MUST lead to the top of
  the spec, in the same version. When the site is built from a copy with uncommitted changes, the
  links MUST lead to the last commit that copy sits on, and every spec view MUST say in site text
  that the build includes uncommitted changes, so its links may not match. A build from a commit
  with no uncommitted changes MUST NOT say it.

**The shell's specs**

- **FR-011**: About this site (005 FR-038) MUST have "Show specs" and "Back to About this site" as
  apps do (FR-001 to FR-004). Its spec view MUST list the shell's own requirements: every
  requirement carried by an element outside every app's content, including the menu bar and its
  menus, the desktop, the dock, the windows' frames and controls, the home screen, the full-screen
  views' headers, About this site, and the inspector's own controls.
- **FR-012**: Every requirement carried in a `data-req` attribute anywhere in the shell or its apps
  MUST appear in at least one spec view: its app's or the shell's.

**Requirement data**

- **FR-013**: Everything a spec view shows MUST be read from the repository when the site is built:
  every spec, its title and status, every requirement and its text, every test that references it,
  and which requirements each app and the shell carry, read as the traceability check (001) reads
  them. Nothing in it may be typed by hand: a requirement or a test added, changed or removed MUST
  show at the next build with no edit to the inspector.
- **FR-014**: The requirement data MUST hold only what the repository makes public: spec titles,
  statuses, requirement IDs and text, test names, file paths and line numbers, the version the
  site was built from, and whether that copy had uncommitted changes.
- **FR-015**: The inspector MUST NOT delay the shell or the CV: the site root's first load MUST
  show the shell and the CV as soon as it does without this feature, and the requirement data MUST
  NOT be needed before a visitor shows a spec view.

**Keyboard and screen readers**

- **FR-016**: Every action of the inspector MUST be possible with the keyboard alone: reaching
  "Show specs", showing the spec view, reading it, opening "What's this?", following every link and
  going back, with focus always visible as 005 FR-024 sets and never trapped (005 FR-030).
- **FR-017**: Showing a spec view MUST move focus to its heading, so a screen reader announces it
  as that app's specs. Going back MUST return focus to the app's "Show specs" control.
- **FR-018**: A spec view MUST have one heading that names it, a heading one level below for each
  spec, and each spec's requirements as a list. Each requirement's tests MUST be a list. The spec
  view MUST keep the heading levels of the window or view it is in, with no skipped levels.
- **FR-019**: On mobile, every action of the inspector MUST be possible with touch, with an
  external keyboard and with the main phone screen readers' own gestures. Every control and link of
  the inspector MUST have a target of at least 24 by 24 CSS px (005 FR-037).

**Look, motion and accessibility**

- **FR-020**: The spec view MUST read without horizontal scrolling at every window and screen size
  the shell allows, and a long ID, name or link MUST wrap within its column (005 FR-008). It MUST
  scroll inside its window or view when taller than it (005 FR-022).
- **FR-021**: The inspector's look MUST be the site's own and MUST match the approved mockup for
  each shell (Constitution II, IX). Every design value MUST come from tokens, and motion values
  from the motion token source. The token check (003) MUST pass over the inspector with no
  exception added for it.
- **FR-022**: When the visitor asks for reduced motion, showing and leaving a spec view MUST change
  the content with no movement or scaling, such as a turn or a slide (Constitution VIII).
- **FR-023**: With forced colors active, every heading, status, link and control of a spec view
  MUST stay visible and distinguishable, and MUST NOT rely on a background image or a background
  color alone.
- **FR-024**: The inspector MUST conform to WCAG 2.2 Level AA in every state, in both shells: the
  spec view of the CV app, of the Terminal and of About this site, with "What's this?" open, and on
  desktop with one window showing specs beside another showing its app. It MUST keep all content
  and function at 200% browser zoom and text-only zoom, at 400% zoom on a window 1280 px wide, and
  with text spacing overridden as WCAG 2.2 success criterion 1.4.12 describes.

**The plain CV page**

- **FR-025**: `/cv` MUST stay the plain page 004 defines, with no "Show specs" control or spec
  view. The CV app inside the shell shows the same CV with its specs.

**Offline**

- **FR-026**: After one complete online visit to the site root or to `/cv`, every spec view MUST
  show with no network as it does online, in the site's fonts (Constitution VI, 005 FR-052).
- **FR-027**: With no network, a spec view MUST say in site text that its links to the repository
  need a connection. Online, it MUST NOT say it.
- **FR-028**: The inspector MUST load everything it uses from the site itself, and MUST make no
  request to any other site (005 FR-054). Only following a link leaves the site.

**Traceability and checks**

- **FR-029**: Every element that implements a requirement in this spec MUST carry
  `data-req="007-requirement-inspector-FR-###"`, listing every requirement it implements, and the
  requirement traceability check (001) MUST pass.
- **FR-030**: An inspector check MUST build the site and, in each shell, at a phone width and a
  desktop width, show the spec view of every app and of About this site. It MUST confirm that each
  view lists exactly the requirements its app or the shell carries, that each spec group's count
  of requirements it doesn't list is right, that every requirement's text matches its spec and its
  tests match what the traceability check (001) finds, that every requirement carried anywhere in
  the shell or its apps appears in at least one view, and that going back restores the app's
  scroll position and state. It MUST read what it expects from the built site and the repository,
  not from a hand-written list.
- **FR-031**: The accessibility check (004, 005 FR-056) MUST cover every inspector state FR-024
  lists. The other-site check MUST cover showing every spec view.
- **FR-032**: The keyboard check (005 FR-057) MUST, at a desktop width and with the keyboard alone,
  show the CV app's specs with "Show specs", go back, show them again from the window's menu, open
  "What's this?", go back, and do the same for the Terminal and About this site, confirming a
  visible focus indicator and where focus lands at each step.
- **FR-033**: The offline check (005 FR-059) MUST also show the spec view of every app and of About
  this site with no network, at a phone width and a desktop width, and confirm each matches the
  online one and says that its links need a connection.
- **FR-034**: The checks of this spec MUST run in the same one command and on the same pull
  requests as 004's and 005's, give the same result locally and on the pull request, and name the
  app, the shell, the width and the requirement in every failure.

### Key Entities

- **Show specs control**: the control at the top of each app, and of About this site, that turns
  its window or full-screen view into its spec view.
- **Spec view**: what a window or full-screen view shows instead of its app: the app's
  requirements, grouped by spec, each group with a count of its spec's requirements the view
  doesn't list, with "What's this?" and a control back to the app. Each app has
  its own, and About this site's covers the shell.
- **Requirement record**: what the build gathers for one requirement: its full ID, its feature and
  spec title, the spec's status, its text, and the file and line where it is defined (as 001's
  Requirement).
- **Test reference**: a test that covers a requirement as 001 counts it: its name, file and line.
- **App's requirements**: the set of requirements the elements of one app carry, or of the shell
  for About this site, gathered when the site is built.
- **Requirement data**: every requirement record, test reference and app's requirements, with the
  version of the repository the site was built from and whether that copy had uncommitted
  changes.
- **Site text**: text in the inspector that isn't CV content or spec content, such as "What's
  this?", set by the design, in English.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: "Show specs" at the top of every app's window and in its menu, and in About this site; the spec view in the same window | - |
| Mobile (iOS-style) | Yes: "Show specs" in every full-screen app's header and in About this site; the spec view in the same full-screen view | - |

**CV path**: Unchanged. The CV app opens showing the CV, and nothing of the inspector shows but
the "Show specs" control at the top of the window (FR-005). The CV stays zero clicks away on
desktop and one tap away on mobile, and `/cv` remains a plain server-rendered page (FR-025).

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after one online visit, except following links to the repository.
- **Available offline**: every app's spec view and the shell's, with every requirement's text and
  tests (FR-026).
- **Needs the network**: following a spec link, a test link or the repository link, which lead to
  the repository on another site.
- **Offline state shown**: each spec view says that its links need a connection (FR-027). Nothing
  else changes.

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/007-requirement-inspector/design/`:

- [x] ASCII wireframes, per shell, of every state: on desktop, the CV window with "Show specs", the
  CV app's spec view, with "What's this?" open, the Terminal's spec view, About this site's spec
  view, a requirement with no tests yet, the offline note, and one window showing specs beside one
  showing its app; on mobile, the CV app's header with "Show specs", the CV app's spec view, the
  pocket terminal's spec view, and About this site's spec view, at 320 px wide and in landscape
- [x] PNG exports of the approved Penpot mockup of the inspector in both shells, at a phone width
  and a desktop width (or of the interim local mockup, under the constitution's interim provision)
- [x] Penpot file link: [007 Requirement inspector — Graphite](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=83c58681-afbf-80ee-8008-dc17f0627e87)
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date, and
  confirming the look is original (FR-021)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any open app, a visitor reaches a test that covers one of its requirements in at
  most 2 actions: "Show specs", then a test's link.
- **SC-002**: From any open app, its spec view shows with 1 click or tap, and the app is back with
  1 more.
- **SC-003**: For every app and for the shell, in both shells, the spec view lists 100% of the
  requirements its elements carry and 0 others, and 100% of the requirements carried anywhere in
  the shell or its apps appear in at least one spec view, every time the inspector check runs.
- **SC-004**: For 100% of the requirements in every spec view, the text matches the spec in the
  version the site was built from, and the tests listed are exactly those the traceability check
  (001) counts.
- **SC-005**: With the CPU slowed as Lighthouse's mobile profile slows it, a spec view shows within
  300 ms of activating "Show specs", and the app is back within 100 ms of going back.
- **SC-006**: With this feature added, 005's SC-001, SC-003 and SC-004 still hold: the CV is as
  quick to reach as before, and every Lighthouse category still scores 90 or more on both profiles
  for the site root and for `/cv`.
- **SC-007**: The automated accessibility check finds 0 WCAG 2.2 AA violations in every inspector
  state of FR-024, in both shells. The owner also checks by hand, with one screen reader on a
  desktop and one on a phone, that every action of stories 1 to 4 can be done and is announced.
- **SC-008**: After one online visit, 100% of the spec views show with no network as they do
  online, every time the offline check runs.
- **SC-009**: Showing every spec view makes 0 requests to any other site.
- **SC-010**: With reduced motion set, showing and leaving a spec view moves or scales 0 elements,
  in either shell.
- **SC-011**: Going back from a spec view restores the app's scroll position and state in 100% of
  the cases the inspector check covers.
- **SC-012**: When this feature is merged, every requirement in this spec is covered by at least
  one test, the content check (002) and the token check (003) pass with no exception added for the
  inspector, and the local run of every check gives the same result as the pull-request run.

## Assumptions

- **Users**: hiring managers and engineers show an app's specs to see how the site was built.
  Recruiters never need to, so the inspector stays a single control at the top of each app. The
  owner reads the check results on pull requests.
- **Per app, not per element**: the spec view lists everything an app implements, so a visitor sees
  the whole set at once. It doesn't point at the element behind each requirement. Picking an
  element or outlining the elements of a requirement may come in a later feature. Requirements no
  element carries, such as offline, speed or check requirements, show in no view. Each spec's group
  counts what it doesn't list and links to the spec, so a visitor never takes the view for the
  whole spec.
- **What an app carries**: an app's requirements are those in the `data-req` attributes of every
  element the app can show, read when the site is built. Constitution III requires such an
  attribute on every element that implements a requirement. The window's frame belongs to the
  shell, so its requirements show in About this site's view.
- **Short IDs**: inside a spec's group, IDs show as `FR-###`. Screen readers and links use the full
  ID, such as `005-os-shell-FR-011`.
- **"What's this?"**: one short text for the whole inspector, set by the design. It explains the
  view, not each requirement. Each requirement's own reasons are in its spec, a link away.
- **Links point at the built version**: links name the version the site was built from, so line
  numbers and text match what the spec view shows, even after the main branch moves on. A build
  with uncommitted changes links to its last commit and says its links may not match, so local
  work in progress isn't blocked.
- **Requirement data is read like 001 reads it**: the inspector, the Terminal's `specs` (006
  FR-013) and the traceability check read specs and tests the same way, so they never disagree.
- **Test results**: every test passes on the main branch before merge (001, Constitution), so the
  spec view lists the tests and doesn't show pass or fail results or CI runs.
- **About this site**: it is a shell view, not an app (005), so it has no dock item. It hosts the
  shell's spec view because the shell has no window of its own.
- **Nothing is remembered between visits**: as in 005. Remembering which apps showed specs belongs
  to the Settings feature, if anywhere.
- **Manual checks**: the screen-reader pass of SC-007 is done by hand, and may be deferred to the
  final testing phase under the constitution's interim provision on deferred manual checks.
- **Out of scope**:
  - Contact and Settings, each a separate feature.
  - A site-wide switch, labels on elements, picking an element, and outlining the elements that
    implement a requirement.
  - A Terminal command that shows specs. The Terminal's `specs` (006) already lists the specs.
  - Filtering or searching requirements, or reading whole specs inside the site. The links lead to
    the repository for that.
  - Test results, CI runs, coverage figures and pull request history.
  - Editing specs or requirements from the site.
  - The inspector on `/cv` (FR-025).
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II to IX and the interim provisions on local mockups and deferred
  manual checks; the requirement traceability check (001) and its rules for reading specs and
  tests; the design tokens source and token check (003); `/cv` and its checks (004); the OS shell,
  its windows, menus, full-screen apps, About this site and its checks (005); the Terminal (006),
  which gets a spec view like every app; and an approved mockup of the inspector in both shells
  with its review sign-off.
