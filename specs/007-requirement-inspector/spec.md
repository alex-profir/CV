# Feature Specification: The Requirement Inspector

**Feature Branch**: `007-requirement-inspector`

**Created**: 2026-10-28

**Status**: Draft

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

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See which requirement each element implements (Priority: P1)

A hiring manager has read that the site is built spec first. On the desktop, with the CV window
open, they turn on the requirement inspector from the menu bar. A small label appears on each
element that implements a requirement: the dock items, the window's title bar and controls, the
CV's sections. Each label shows the requirement IDs, such as `005 FR-011`. They open the Terminal
and see labels on it too. They turn the inspector off, and the site looks as it did before.

**Why this priority**: the vision's "Showing the process" section names the inspector as the way
a visitor sees the process instead of reading about it. Without labels there is nothing to
inspect. Every other story builds on them.

**Independent Test**: build the site, open the site root at 1440 px wide, turn the inspector on,
and confirm that every visible element with a `data-req` attribute shows one label with exactly
its IDs, and that no other element does. Turn it off and confirm that no label is left. Repeat
at 375 px wide from the home screen and from the CV app.

**Acceptance Scenarios**:

1. **Given** first load of the desktop shell, **When** the visitor looks at the menu bar,
   **Then** it holds the inspector toggle, shown as off, and no label appears anywhere.
2. **Given** the inspector is off, **When** the visitor clicks the toggle once, **Then** every
   visible element that carries a `data-req` attribute shows a label with its requirement IDs,
   and the toggle shows that the inspector is on.
3. **Given** the inspector is on, **When** the visitor opens another app, a menu or About this
   site, **Then** its labelled elements show labels as they appear.
4. **Given** the inspector is on, **When** the visitor moves, resizes or scrolls a window,
   **Then** the labels stay with their elements, and a window in front covers the labels of the
   windows behind it.
5. **Given** the inspector is on, **When** the visitor clicks a dock item, a window control or a
   link in the CV, **Then** it does exactly what it does with the inspector off.
6. **Given** the inspector is on, **When** the visitor clicks the toggle again, **Then** every
   label disappears and nothing else changes: no window moves, closes or scrolls.
7. **Given** a phone 375 px wide, **When** the visitor turns the inspector on from the home
   screen, **Then** the home screen's icons show labels, and opening the CV app shows the CV
   app's labels, with the inspector still on.

---

### User Story 2 - Read a requirement and follow it to its spec and tests (Priority: P2)

The hiring manager activates the label on the dock's CV item. A small panel opens next to it. It
shows the requirement's full ID, the name of the feature it belongs to, the spec's status, and the
requirement's text as the spec states it. Below are a link to the requirement in its spec in the
repository, and the names of the tests that check it, each linked to its place in the repository.
They follow a test link and read the test.

**Why this priority**: an ID alone proves little. The vision's success criteria ask that any
visible element can be traced to its requirement and from there to its tests. This story is that
trace. It needs the labels of story 1.

**Independent Test**: at 1440 px wide, turn the inspector on, open the details of one label per
feature that has UI, and confirm that the requirement text matches the spec in the repository at
the version the site was built from, that the spec link leads to the requirement's line, and that
the list of tests is exactly the list the traceability check (001) finds for that requirement.

**Acceptance Scenarios**:

1. **Given** the inspector is on, **When** the visitor activates a label, **Then** its details
   open next to it and show, for every requirement the element carries, the full ID, the feature's
   name, the spec's status and the requirement's text.
2. **Given** a requirement's details are open, **When** the visitor activates its spec link,
   **Then** the requirement's spec opens in the repository at the requirement's line, in the
   version the site was built from.
3. **Given** a requirement's details are open, **When** the visitor reads the test list, **Then**
   it names every test that references the requirement, each linked to its line in the
   repository, and no skipped or placeholder test.
4. **Given** an element that carries three requirements, **When** the visitor opens its
   details, **Then** all three are shown, in the order the element lists them.
5. **Given** a requirement from a spec that is still a draft, **When** the visitor opens its
   details, **Then** they show the status as Draft, and say in site text that no test covers it
   yet when none does.
6. **Given** the details are open, **When** the visitor presses Escape, clicks outside them or
   activates their close control, **Then** they close and the rest of the site is as it was.
7. **Given** a requirement's text changes in a merged pull request, **When** the site is built
   again, **Then** the details show the new text with no edit to the inspector.

---

### User Story 3 - Use the inspector with a keyboard or a screen reader (Priority: P3)

A keyboard user presses the inspector's shortcut. A screen reader announces that the inspector is
on and how many elements and requirements it labels. They Tab from the dock item to its label,
press Enter, read the requirement's details as headings and text, press Escape and land back on
the label. On a phone, a screen reader user turns the inspector on from the home screen and swipes
from each icon to its label.

**Why this priority**: Constitution VIII requires the desktop shell to be fully operable by
keyboard and both shells to meet WCAG 2.2 AA. It is a merge gate, but it refines the flows of
stories 1 and 2 rather than adding new ones.

**Independent Test**: at 1440 px wide, with the keyboard alone, turn the inspector on and off with
its shortcut and with the toggle, reach a label, open and close its details and follow a link,
confirming a visible focus indicator at each step. With a desktop screen reader, then a phone
screen reader, confirm what is announced and where focus lands.

**Acceptance Scenarios**:

1. **Given** focus is anywhere in the desktop shell, **When** the user presses the inspector's
   shortcut, **Then** the inspector turns on, focus stays where it was, and a screen reader
   announces that the inspector is on, with the number of elements and requirements labelled.
2. **Given** the inspector is on and focus is on a labelled control, **When** the user presses
   Tab, **Then** focus moves to that control's label next, which is announced as requirements for
   that control, with every full ID.
3. **Given** focus is on a label, **When** the user presses Enter or Space, **Then** its details
   open, focus moves into them, and a screen reader can move through each requirement by heading.
4. **Given** the details are open, **When** the user presses Escape, **Then** they close and focus
   returns to the label.
5. **Given** the inspector is on, **When** the user turns it off with focus on a label, **Then**
   focus moves to the element that label belonged to.
6. **Given** a phone screen reader on the home screen with the inspector on, **When** the user
   swipes through the icons, **Then** each icon is followed by its label, and the icon's own name
   is unchanged.

---

### User Story 4 - Reduced motion, high contrast and larger text (Priority: P4)

A visitor who has asked for reduced motion turns the inspector on, and the labels appear without
sliding or fading in. Another visitor uses high-contrast mode and sees every label, outline and
details panel. A third zooms the page to 200% and the labels grow without hiding the controls
they belong to.

**Why this priority**: required by Constitution VIII and WCAG 2.2 AA. It adjusts how the
inspector looks and moves, not what it does.

**Independent Test**: with reduced motion set, turn the inspector on and off and open details in
both shells, and confirm that nothing moves or scales. With forced colors on, confirm every label,
outline and details panel stays visible. At 200% zoom, confirm every labelled control can still
be used.

**Acceptance Scenarios**:

1. **Given** the visitor's system asks for reduced motion, **When** the inspector turns on or off
   or details open, **Then** labels and details appear and disappear with no movement or scaling.
2. **Given** forced colors are active, **When** the inspector is on, **Then** every label, the
   outline of every labelled element and the details panel are visible and distinguishable.
3. **Given** text is zoomed to 200%, **When** the inspector is on, **Then** every label is larger,
   and every labelled control can still be clicked or tapped.

---

### User Story 5 - Use the inspector offline (Priority: P5)

A hiring manager opened the site once at the office. On the train, with no signal, they turn the
inspector on. Every label shows, and every requirement's details show its text and its tests. The
details say that the links to the repository need a connection.

**Why this priority**: Constitution VI. The inspector shows facts gathered when the site is built,
so it needs no network. Only following a link leaves the site.

**Independent Test**: visit the site root once online, turn the network off, open the site root at
375 px and at 1440 px wide, turn the inspector on, open the details of several labels, and confirm
that they match what is shown online and that the details say that their links need a connection.

**Acceptance Scenarios**:

1. **Given** one complete online visit to the site root or to `/cv`, **When** the visitor turns the
   inspector on with no network, **Then** every label and every requirement's details show as they
   do online.
2. **Given** no network, **When** the visitor opens a requirement's details, **Then** they say in
   site text that the links to the repository need a connection.

---

### User Story 6 - Every pull request proves the inspector works (Priority: P6)

The owner opens a pull request that adds a requirement and the element that implements it. The
checks build the site, turn the inspector on in every shell state they cover, and confirm that the
new element shows its label and that its details show the new requirement's text and tests. A
failure blocks merge and says which shell, state, width and element failed.

**Why this priority**: it keeps stories 1 to 5 true as features are added. It is last because it
checks behavior the other stories define.

**Independent Test**: break one thing at a time on a branch (hide one labelled element's label,
show a stale requirement text, drop a test from a requirement's list, give a label no name) and
confirm that the matching check fails with a clear message and that the pull request can't merge.

**Acceptance Scenarios**:

1. **Given** a pull request where an element with a `data-req` attribute shows no label with the
   inspector on, **When** the checks run, **Then** the inspector check fails and names the
   element, the shell, the state and the width.
2. **Given** a pull request where a requirement's details show text that differs from its spec,
   **When** the checks run, **Then** the inspector check fails and names the requirement.
3. **Given** a pull request that passes every check, **When** the owner runs the checks locally
   with the one command, **Then** the result is the same.

---

### Edge Cases

- **An element with several requirements**: one label, which shows them as the design sets
  (FR-008). Its details show each requirement, in the order the element lists them.
- **A labelled element inside another labelled element**, such as a window and its close control:
  each has its own label, placed as the design sets so that neither hides the other.
- **Many labels close together**, such as on the dock: labels may overlap each other, as the design
  sets, but never hide the text or a control's target (FR-009).
- **A labelled element that is hidden**: a minimized window, a closed menu, a folded section in the
  Terminal's vim view, an app behind a full-screen app, or the home screen behind an app. It shows
  no label. Its label appears when the element does.
- **A labelled element scrolled out of its window**: its label scrolls with it, and is clipped by
  the window as the element is.
- **A window behind another**: its labels are covered by the window in front, as its content is.
  Clicking a label of a window that isn't focused brings the window to the front, as clicking
  anywhere in it does (005 FR-017), and opens the label's details.
- **Content added while the inspector is on**, such as Terminal output or an opened fold: its
  labelled elements show labels as they appear.
- **The shell switches** (005 FR-002) with the inspector on: it stays on, the new shell shows its
  labels, and open details close.
- **A window moved or resized with open details**: the details close.
- **The visitor types in the Terminal with the inspector on**: typing works as before. The labels
  don't take any key the Terminal or the shell uses.
- **The inspector's own toggle**: it carries this spec's requirement IDs and shows its own label
  while the inspector is on. Labels and details show no labels.
- **A requirement whose spec is a draft**: its details say Draft. A requirement in a draft spec
  can be referenced (001 FR-019), so it can show.
- **A requirement no test covers yet**: possible only in a draft spec (001 FR-015). Its details say
  so in site text.
- **A requirement with many tests**: the list shows every one. The details scroll.
- **A requirement whose text holds code, a link or a reference to another requirement**: it shows
  as readable text. Links in it behave as normal links.
- **An element whose `data-req` holds an ID the build doesn't know**: it can't be merged, because
  the traceability check (001 FR-016) fails first.
- **A spec renamed or a requirement removed between builds**: the next build shows the change. A
  removed requirement can't be referenced (001 FR-017), so no label shows it.
- **Ctrl-click, middle-click or long-press on a link in the details**: behaves as a normal link.
- **Turning the inspector on from the Terminal's command line with the shortcut**: works, and focus
  stays in the command line.
- **Scripting turned off**: the site root shows 005's page with a link to `/cv` (005 FR-049). The
  inspector isn't there.
- **Offline storage unavailable or cleared**: the inspector works online and shows no error.
- **Printing with the inspector on**: printing the shell is not designed (005), and `/cv` prints
  without labels.
- **Reloading the page, or a later visit**: the inspector is off again (FR-004).

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

**Turning it on and off**

- **FR-001**: Both shells MUST offer one inspector toggle. On desktop it MUST be in the menu bar,
  always visible, and its state MUST also be changeable with a shortcut that follows 005 FR-029.
  On mobile it MUST be on the home screen and in the header of every full-screen app, at the place
  the approved design sets.
- **FR-002**: The toggle MUST show whether the inspector is on by more than color, and MUST tell
  screen readers its state. Its accessible name MUST say that it shows requirements.
- **FR-003**: Turning the inspector on or off MUST NOT reload the page, open or close an app, move,
  resize or reorder a window, change a scroll position or change what is focused, except as FR-021
  sets. The inspector MUST stay on while apps open and close, and when the shell switches (005
  FR-002), until the visitor turns it off or the visit ends.
- **FR-004**: The inspector MUST be off on every first load, and MUST NOT be remembered between
  visits. While it is off, nothing of it MUST show other than the toggle: no hint, tour, badge,
  banner or tooltip that appears by itself (Constitution VII).
- **FR-005**: Turning the inspector on MUST be announced to screen readers, with the number of
  elements labelled and the number of requirements they carry, such as "Requirement inspector on:
  24 elements, 31 requirements". Turning it off MUST be announced too.

**Labels**

- **FR-006**: While the inspector is on, every element that carries a `data-req` attribute and is
  shown to the visitor MUST show one label, in both shells and in every part of them: the menu
  bar, its menus, the desktop, the dock, windows, the home screen, full-screen views, About this
  site, and every app, including the CV app and the Terminal with its output, its vim view and
  the pocket terminal's keys. No other element MUST show a label.
- **FR-007**: An element that isn't shown, such as a minimized window, a closed menu, a folded
  section, or a view behind a full-screen app, MUST show no label. When it is shown while the
  inspector is on, its label MUST appear with it. Content added while the inspector is on, such as
  Terminal output, MUST show labels as it appears.
- **FR-008**: A label MUST show every requirement ID its element carries, with the feature number
  and the requirement number, in the short form the approved design sets, such as `005 FR-011`.
  When an element carries more IDs than the design fits in one label, the label MUST show the
  first and the number of the others. The labelled element MUST be outlined while the inspector is
  on, in a way that doesn't rely on color alone.
- **FR-009**: A label MUST NOT hide its element's text, nor make any part of a control's target
  unreachable, nor make a target smaller than 005 FR-037 allows. Labels MUST move, scroll and clip
  with their element, and a window in front MUST cover the labels of the windows behind it.
- **FR-010**: While the inspector is on, every element MUST keep working as it does with the
  inspector off: a click, tap or key on an element MUST do what it does without the inspector.
  Only activating a label opens its details. [NEEDS CLARIFICATION: should the inspector show a
  label on every labelled element at once, or work like a browser's element picker, where the
  visitor points at or taps an element to see its requirements, or both?]
- **FR-011**: The inspector's own toggle MUST carry this spec's requirement IDs and show its own
  label while the inspector is on. Labels and details MUST NOT show labels.

**Details**

- **FR-012**: Activating a label MUST open its details next to it. For every requirement the
  element carries, in the order the element lists them, the details MUST show the full ID, the
  name of the feature as its spec's title gives it, the spec's status, the requirement's text as
  the spec states it, a link to the requirement in its spec, and the list of tests that reference
  it, each with its name and a link to its place in the repository.
- **FR-013**: The test list MUST hold exactly the tests the traceability check (001 FR-010 to
  FR-012) counts as covering the requirement: no skipped, disabled or placeholder test. When none
  does, the details MUST say so in site text.
- **FR-014**: The requirement's text MUST be shown in full, never cut short, and readable as text:
  code, links and references to other requirements in it are shown as such. Links in it, and every
  link in the details, MUST behave as normal links.
- **FR-015**: The details MUST NOT block the rest of the site. Only one label's details MUST be
  open at a time. They MUST close when the visitor presses Escape, activates their close control,
  clicks or taps outside them, opens another label's details, turns the inspector off, or when
  their element is moved, resized, hidden or the shell switches.
- **FR-016**: Each spec link and test link MUST lead to the line in the repository where the
  requirement or the test is, in the version of the repository the site was built from, so the
  text the details show is the text the link shows.

**Requirement data**

- **FR-017**: Everything the inspector shows about a requirement MUST be read from the repository
  when the site is built: every spec, its title and status, every requirement and its text, and
  every test that references it, read as the traceability check (001) reads them. Nothing in it may
  be typed by hand: a requirement or a test added, changed or removed MUST show at the next build
  with no edit to the inspector.
- **FR-018**: The requirement data MUST hold only what the repository makes public: spec titles,
  statuses, requirement IDs and text, test names, file paths and line numbers, and the version the
  site was built from.
- **FR-019**: The inspector MUST NOT delay the shell or the CV: the site root's first load MUST
  show the shell and the CV as soon as it does without this feature, and the requirement data MUST
  NOT be needed before the visitor turns the inspector on.

**Keyboard and screen readers**

- **FR-020**: Every action of the inspector MUST be possible with the keyboard alone: turning it on
  and off, reaching every label, opening and closing details, and following every link, with focus
  always visible as 005 FR-024 sets. While the inspector is on, each label MUST follow its element
  in the focus order and the reading order, and focus MUST never be trapped (005 FR-030).
- **FR-021**: Opening details MUST move focus into them, and closing them MUST return focus to
  their label. Turning the inspector off while focus is on a label or in details MUST move focus to
  the element the label belonged to.
- **FR-022**: Each label's accessible name MUST say that it shows requirements, name its element,
  and list every full ID it carries. A label MUST NOT change its element's own accessible name or
  role.
- **FR-023**: The details MUST be named for screen readers, and each requirement in them MUST be a
  heading, with its text, spec link and test list below it.
- **FR-024**: On mobile, every action of the inspector MUST be possible with touch, with an
  external keyboard, and with the main phone screen readers' own gestures. Every label, link and
  control of the inspector MUST have a target of at least 24 by 24 CSS px (005 FR-037).

**Look, motion and accessibility**

- **FR-025**: The inspector's look MUST be the site's own and MUST match the approved mockup for
  each shell (Constitution II, IX). Every design value MUST come from tokens, and motion values
  from the motion token source. The token check (003) MUST pass over the inspector with no
  exception added for it.
- **FR-026**: When the visitor asks for reduced motion, labels and details MUST appear and
  disappear with no movement or scaling (Constitution VIII).
- **FR-027**: With forced colors active, every label, outline, details panel and the toggle's state
  MUST stay visible and distinguishable, and MUST NOT rely on a background image or a background
  color alone.
- **FR-028**: The inspector MUST conform to WCAG 2.2 Level AA in every state, in both shells: on
  with no app open, on with the CV app open, on with the Terminal open, on with a menu open, on with
  details open, and on desktop on with two windows open. It MUST keep all content and function at
  200% browser zoom and text-only zoom, at 400% zoom on a window 1280 px wide, and with text spacing
  overridden as WCAG 2.2 success criterion 1.4.12 describes.

**The plain CV page**

- **FR-029**: `/cv` MUST stay the plain page 004 defines, and MUST show no inspector toggle, label
  or details. [NEEDS CLARIFICATION: should `/cv` offer the inspector too, for example a separate
  address that shows the same page with each element's requirement IDs as plain text and no
  script, or does the CV app inside the shell cover it?]

**About this site**

- **FR-030**: About this site (005 FR-038) MUST say in one or two sentences what the inspector
  shows and how to turn it on, and MUST list its shortcut with the other shortcuts (005 FR-029).

**Offline**

- **FR-031**: After one complete online visit to the site root or to `/cv`, the inspector MUST work
  with no network as it does online: every label and every requirement's details, in the site's
  fonts (Constitution VI, 005 FR-052).
- **FR-032**: With no network, the details MUST say in site text that their links to the
  repository need a connection. Online, they MUST NOT say it.
- **FR-033**: The inspector MUST load everything it uses from the site itself, and MUST make no
  request to any other site (005 FR-054). Only following a link leaves the site.

**Traceability and checks**

- **FR-034**: Every element that implements a requirement in this spec MUST carry
  `data-req="007-requirement-inspector-FR-###"`, listing every requirement it implements, and the
  requirement traceability check (001) MUST pass.
- **FR-035**: An inspector check MUST build the site, turn the inspector on in each shell, in every
  state FR-028 lists, at a phone width and a desktop width, and confirm that every shown element
  with a `data-req` attribute shows exactly one label with exactly its IDs, and that no other
  element does. For at least one requirement of every feature with UI, it MUST open the details
  and confirm the text matches the spec and the test list matches what the traceability check
  (001) finds. It MUST read the expected labels, texts and tests from the built site and the
  repository, not from a hand-written list.
- **FR-036**: The accessibility check (004, 005 FR-056) MUST cover every inspector state FR-028
  lists. The other-site check MUST cover turning the inspector on and opening details.
- **FR-037**: The keyboard check (005 FR-057) MUST, at a desktop width and with the keyboard alone,
  turn the inspector on with its shortcut, Tab from a dock item to its label, open its details,
  close them with Escape, turn the inspector off from a label, and turn it on and off with the
  toggle, confirming a visible focus indicator and where focus lands at each step.
- **FR-038**: The offline check (005 FR-059) MUST also turn the inspector on with no network at a
  phone width and a desktop width, open details, and confirm they match the online ones and say
  that the links need a connection.
- **FR-039**: The checks of this spec MUST run in the same one command and on the same pull
  requests as 004's and 005's, give the same result locally and on the pull request, and name the
  shell, the state, the width and the element in every failure.

### Key Entities

- **Inspector**: the site-wide mode that shows labels. It is on or off, off on every first load,
  and lasts only for the visit.
- **Toggle**: the control that turns the inspector on and off, in the desktop's menu bar and on the
  mobile home screen and app headers, with a shortcut on desktop.
- **Label**: the mark on a shown element that carries a `data-req` attribute. It shows the
  element's requirement IDs in short form and opens its details.
- **Details**: the panel a label opens. It shows each of the element's requirements with its text,
  spec link and tests.
- **Requirement record**: what the build gathers for one requirement: its full ID, its feature and
  spec title, the spec's status, its text, and the file and line where it is defined (as 001's
  Requirement).
- **Test reference**: a test that covers a requirement as 001 counts it: its name, file and line.
- **Requirement data**: every requirement record and test reference, gathered when the site is
  built, with the version of the repository it was built from.
- **Site text**: text in the inspector that isn't CV content or spec content, set by the design,
  in English.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: a toggle in the menu bar and a shortcut, labels on the shell and every app, details next to each label | - |
| Mobile (iOS-style) | Yes: a toggle on the home screen and in every full-screen app's header, labels on the shell and every app, details next to each label | - |

**CV path**: Unchanged. The inspector is off on first load and shows nothing but its toggle
(FR-004). The CV stays zero clicks away on desktop and one tap away on mobile, and `/cv` remains a
plain server-rendered page (FR-029).

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after one online visit, except following links to the repository.
- **Available offline**: the toggle, every label, and every requirement's details with its text
  and tests (FR-031).
- **Needs the network**: following a spec link or a test link, which leads to the repository on
  another site.
- **Offline state shown**: the details say that their links need a connection (FR-032). Nothing
  else changes.

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/007-requirement-inspector/design/`:

- [ ] ASCII wireframes, per shell, of every state: on desktop, the toggle off and on, the inspector
  on with the CV window open, with two windows open, with a menu open, with the Terminal open, and
  with details open; on mobile, the toggle on the home screen and in an app header, the inspector
  on over the home screen, the CV app and the pocket terminal, and with details open, at 320 px
  wide and in landscape
- [ ] PNG exports of the approved Penpot mockup of the inspector in both shells, at a phone width
  and a desktop width (or of the interim local mockup, under the constitution's interim provision)
- [ ] Penpot file link
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date, and
  confirming the look is original (FR-025)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From first load, a visitor goes from a visible element to a test that covers its
  requirement in at most 3 actions: turn the inspector on, activate the element's label, follow a
  test link.
- **SC-002**: From any state of either shell, the inspector turns on with 1 click on desktop, 1 tap
  on mobile, or 1 shortcut.
- **SC-003**: In every state the inspector check covers, 100% of the shown elements with a
  `data-req` attribute show exactly one label with exactly their IDs, and 0 other elements show a
  label.
- **SC-004**: For 100% of the requirements the inspector check opens, the details show the spec's
  text for the version the site was built from, and exactly the tests the traceability check (001)
  counts.
- **SC-005**: With the CPU slowed as Lighthouse's mobile profile slows it, labels appear within
  500 ms of turning the inspector on, and details within 100 ms of activating a label.
- **SC-006**: With this feature added, 005's SC-001, SC-003 and SC-004 still hold: the CV is as
  quick to reach as before, and every Lighthouse category still scores 90 or more on both profiles
  for the site root and for `/cv`.
- **SC-007**: The automated accessibility check finds 0 WCAG 2.2 AA violations in every inspector
  state of FR-028, in both shells. The owner also checks by hand, with one screen reader on a
  desktop and one on a phone, that every action of stories 1 to 3 can be done and is announced.
- **SC-008**: After one online visit, 100% of the labels and details show with no network as they
  do online, every time the offline check runs.
- **SC-009**: Turning the inspector on and opening details makes 0 requests to any other site.
- **SC-010**: With reduced motion set, turning the inspector on and off and opening details moves
  or scales 0 elements, in either shell.
- **SC-011**: When this feature is merged, every requirement in this spec is covered by at least
  one test, the content check (002) and the token check (003) pass with no exception added for the
  inspector, and the local run of every check gives the same result as the pull-request run.

## Assumptions

- **Users**: hiring managers and engineers turn the inspector on to see how the site was built.
  Recruiters never need it, so it stays out of their way. The owner reads the check results on
  pull requests.
- **What is labelled**: exactly the elements that carry a `data-req` attribute, as Constitution III
  requires of every element that implements a requirement. An element without one shows nothing,
  and the inspector doesn't mark elements as untraced.
- **Short IDs on labels**: full IDs such as `005-os-shell-FR-011` are long, so labels show a short
  form the design sets. Screen readers and the details get the full ID.
- **Links point at the built version**: links name the version the site was built from, so line
  numbers and text match what the inspector shows, even after the main branch moves on.
- **Requirement data is read like 001 reads it**: the inspector, the Terminal's `specs` (006
  FR-013) and the traceability check read specs and tests the same way, so they never disagree.
- **Test results**: every test passes on the main branch before merge (001, Constitution), so the
  details list the tests and don't show pass or fail results or CI runs.
- **Nothing is remembered between visits**: as in 005. Remembering that the inspector was on
  belongs to the Settings feature, if anywhere.
- **Shortcut and placement**: the exact shortcut, the toggle's place on each shell and the labels'
  short form are set by the design within FR-001, FR-008 and 005 FR-029.
- **Manual checks**: the screen-reader pass of SC-007 is done by hand, and may be deferred to the
  final testing phase under the constitution's interim provision on deferred manual checks.
- **Out of scope**:
  - Contact and Settings, each a separate feature.
  - A Terminal command that turns the inspector on or lists an element's requirements. A later
    change to the Terminal's spec may add one.
  - Filtering labels by feature, searching requirements, or reading whole specs inside the site.
    The links lead to the repository for that.
  - Test results, CI runs, coverage figures and pull request history in the details.
  - Marking elements that carry no `data-req` attribute.
  - Editing specs or requirements from the site.
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II to IX and the interim provisions on local mockups and deferred
  manual checks; the requirement traceability check (001) and its rules for reading specs and
  tests; the design tokens source and token check (003); `/cv` and its checks (004); the OS shell,
  its menu bar, home screen, windows, full-screen apps, About this site and its checks (005); the
  Terminal (006), whose elements the inspector labels; and an approved mockup of the inspector in
  both shells with its review sign-off.
