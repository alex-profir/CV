# Feature Specification: The OS Shell

**Feature Branch**: `005-os-shell`

**Created**: 2026-10-23

**Status**: Approved

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> The OS shell: the frame every app runs in. On desktop, a macOS-style desktop with a menu bar, a
> dock and windows that can be opened, closed, focused, moved and switched between. On phones, an
> iOS-style home screen where apps open full screen. The CV app is the first app: it opens in one
> click or tap from first load and shows the same content as /cv. Cover keyboard and
> screen-reader use of both shells, reduced motion, and offline behaviour. Terminal, Contact,
> Settings and the requirement inspector are separate features. The look is original, not a
> replica of macOS or iOS. See docs/vision.md.

## Clarifications

### Session 2026-10-24

- Q: When a desktop visitor first opens the site, should the CV already be open in a window, or
  should the desktop start empty with the CV one click away in the dock? → A: The CV is already
  open in a focused window, with the desktop, menu bar and dock around it. Keyboard focus stays
  at the start of the page and isn't moved into the window.
- Q: Besides opening, closing, focusing, moving and switching windows, should visitors also be
  able to resize, minimise or maximise them in this feature? → A: All three: resize, minimise to
  the dock, and maximise (FR-061 to FR-065).
- Q: When a visitor opens or closes an app, should the browser's address and its Back button
  change with it, or should the address stay at the site root, so Back leaves the site? → A:
  The address stays at the site root. On mobile only, Back from a full-screen app returns to the
  home screen. On desktop, Back leaves the site.
- Q: What name should the site use in the menu bar, on the desktop and in the browser tab:
  "AboutThisDev" or "Alex Profir"? → A: "Alex Profir", the owner's name read from the CV
  document wherever the site name appears (FR-066).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reach the CV in one click or tap, on either shell (Priority: P1)

A recruiter opens the site link. On a laptop they see a desktop with a menu bar and a dock, and
the CV already open in a window. On a phone they see a home screen of app icons, and the CV is
one obvious tap away. Nothing is in front of it: no splash screen, boot sequence, onboarding or
banner. The CV app
shows the same CV as `/cv`, with every section, date and link, and offers a link to `/cv` for
printing or sharing.

**Why this priority**: the vision and Constitution VII put the recruiter first. The OS is the
showcase, but the CV is the product. Without this story the shell gets in the way of the CV.
Every other story builds on a shell that can open the CV app.

**Independent Test**: build the site, open the site root at 1440 px wide and confirm the CV app
is already open, then at 375 px wide and open the CV with one tap. Confirm that every shown field of the CV document (004 Key
Entities) appears in the CV app in the same order as on `/cv`, and that nothing appears before
the shell.

**Acceptance Scenarios**:

1. **Given** a desktop browser 1440 px wide, **When** a visitor opens the site root, **Then**
   the desktop shell appears with a menu bar, a desktop and a dock that holds the CV app, with
   the CV app open in a focused window in front, showing the CV, and nothing else in front of
   it.
2. **Given** the desktop shell with the CV app closed, **When** the visitor clicks the CV item
   in the dock once, **Then** the CV app opens in a focused window in front, showing the CV.
3. **Given** a phone 375 px wide, **When** a visitor opens the site root, **Then** the mobile
   shell appears with a home screen that shows the CV app's icon and name.
4. **Given** the home screen, **When** the visitor taps the CV icon once, **Then** the CV app
   opens full screen, showing the CV.
5. **Given** the CV app is open in either shell, **When** the visitor reads it, **Then** it
   holds every section, entry, date and link that `/cv` holds, in the same order and wording.
6. **Given** the CV app is open, **When** the visitor activates its link to `/cv`, **Then**
   `/cv` opens as a plain page.
7. **Given** a visitor with scripting turned off, **When** they open the site root, **Then**
   they see a short page that says the OS needs JavaScript, with a link to `/cv`, and no broken
   controls.

---

### User Story 2 - Use the desktop with windows (Priority: P2)

A hiring manager on a desktop explores the site. The CV is already open in a window, and they
open "About this site" from the menu bar as a second window. They drag one by its title bar,
resize it by a corner, click the other to bring it to the front, maximize it and restore it,
minimize one and bring it back from the dock or the Window menu, switch between them from the
Window menu, and close them. The dock shows
which apps are open, and the menu bar shows the focused app's name and menus.

**Why this priority**: the desktop is the main showcase of the craft for hiring managers and
engineers. It comes after the CV path because a recruiter never needs it.

**Independent Test**: at 1440 px wide, with a mouse, use the CV app open on first load and open
About this site, move and resize each window by dragging and by the non-dragging alternative,
minimize and restore each, maximize and restore each, bring each to the front by clicking it and
from the Window menu, then close both. Confirm the dock's open marks and the menu bar's
app name follow each step.

**Acceptance Scenarios**:

1. **Given** the CV window is open, **When** the visitor opens About this site from the site
   menu, **Then** a second window opens in front, focused, without covering the CV window's
   title bar, and the menu bar shows its name.
2. **Given** two open windows, **When** the visitor clicks anywhere in the window behind,
   **Then** it comes to the front and becomes focused, and the menu bar shows its app's name.
3. **Given** the CV window is focused, **When** the visitor drags its title bar, **Then** the
   window follows the pointer and stays where it is released.
4. **Given** the visitor drags a window toward the top or a side of the screen, **When** the
   title bar reaches the edge of the desktop area, **Then** the window stops there and its title
   bar stays fully visible.
5. **Given** the CV window is open, **When** the visitor moves it with the non-dragging
   alternative the design sets, using single clicks only, **Then** it moves as asked.
6. **Given** two open windows, **When** the visitor chooses the other window in the Window menu,
   **Then** that window comes to the front and becomes focused.
7. **Given** the CV app is open, **When** the visitor clicks the CV item in the dock again,
   **Then** no second CV window opens, and the existing one comes to the front, focused.
8. **Given** the CV window is open, **When** the visitor clicks its close control, **Then** the
   window disappears, the dock no longer marks the CV as open, and the menu bar shows the name
   of the window now in front, or the desktop's own name when none is left.
9. **Given** an open window near the right edge, **When** the browser window is made narrower
   but stays wide enough for the desktop shell, **Then** the window moves back so its title bar
   is fully inside the desktop area.
10. **Given** the CV window is open and not maximized, **When** the visitor drags its bottom
    right corner, **Then** the window grows or shrinks with the pointer, never below the minimum
    size the design sets, and the CV reflows inside it without horizontal scrolling.
11. **Given** the CV window is open, **When** the visitor clicks its minimize control, **Then**
    the window disappears, the dock still marks the CV as open, and the Window menu lists it as
    minimized. **When** the visitor then clicks the CV item in the dock, **Then** the window
    returns at the same position and size, in front and focused.
12. **Given** the CV window is open, **When** the visitor clicks its maximize control, **Then**
    the window fills the desktop area with the menu bar and dock still visible, and the control
    now restores it. **When** the visitor clicks it again, **Then** the window returns to its
    earlier position and size.

---

### User Story 3 - Use the phone home screen and full-screen apps (Priority: P3)

A recruiter on a phone taps the CV icon, reads the CV full screen, goes back to the home screen,
opens About this site, and returns to the CV where they left it.

**Why this priority**: recruiters often use phones. The mobile shell has fewer moving parts than
the desktop, and the CV path itself is covered by User Story 1.

**Independent Test**: at 375 px wide, with touch, open the CV app, scroll partway, return home
with the visible home control, open About this site, return home, and open the CV app again.
Confirm it is at the same scroll position.

**Acceptance Scenarios**:

1. **Given** the CV app is open full screen, **When** the visitor taps the home control,
   **Then** the home screen appears.
2. **Given** the visitor scrolled halfway down the CV app and went home, **When** they open the
   CV app again in the same visit, **Then** it shows the same scroll position.
3. **Given** the home screen, **When** the visitor opens About this site, **Then** it opens full
   screen with the same header and home control as an app.
4. **Given** the phone is turned to landscape, **When** the visitor uses the home screen or an
   open app, **Then** the mobile shell stays and everything reads without horizontal scrolling.
5. **Given** a 320 px wide phone, **When** the visitor looks at the home screen, **Then** every
   icon and name is fully visible and nothing needs horizontal scrolling.
6. **Given** the CV app is open full screen, **When** the visitor presses the browser's Back
   button or uses the back gesture, **Then** the home screen appears with focus on the CV icon,
   and the address is still the site root. **When** they press Back again, **Then** they leave
   the site.

---

### User Story 4 - Operate both shells with a keyboard or a screen reader (Priority: P4)

A keyboard user on a desktop reaches the dock, opens the CV, opens About this site from the menu
bar, switches between the two windows, moves one with the arrow keys, closes both and is never
trapped. A screen reader user hears where they are: the menu bar, the dock, which apps are open,
which window is focused, and the app that just opened. On a phone, a screen reader user swipes
through the home screen icons, opens the CV and returns home, landing back on the CV icon.

**Why this priority**: Constitution VIII requires the desktop shell to be fully operable by
keyboard and both shells to meet WCAG 2.2 AA. It is a merge gate, but it refines the flows of
stories 1 to 3 rather than adding new ones.

**Independent Test**: at 1440 px wide, with the keyboard alone, perform every action of User
Story 2 and confirm a visible focus indicator at each step. With a desktop screen reader, then a
phone screen reader, open and close the CV app and confirm what is announced and where focus
lands.

**Acceptance Scenarios**:

1. **Given** first load of the desktop shell, **When** a keyboard user presses Tab, **Then**
   focus moves through the shell in a logical order with a visible indicator, and focus reaches
   the open CV window within 3 key presses.
2. **Given** the CV app is closed and focus is on the CV item in the dock, **When** the user
   presses Enter, **Then** the
   CV window opens and focus moves into it, to its title or first heading, and a screen reader
   announces the CV app.
3. **Given** two open windows, **When** the user presses the shortcut for the next window,
   **Then** focus moves to the other window, which comes to the front.
4. **Given** the CV window is focused, **When** the user starts the keyboard move, presses the
   arrow keys and confirms, **Then** the window moves and the end of the move is announced.
   **When** the user cancels instead, **Then** the window returns to where it started.
5. **Given** the CV window is focused and no other window is open, **When** the user closes it
   with the keyboard, **Then** focus returns to the CV item in the dock.
6. **Given** a menu is open, **When** the user presses Escape, **Then** the menu closes and
   focus returns to the menu's title in the menu bar.
7. **Given** focus is anywhere in an open window, **When** the user keeps pressing Tab,
   **Then** focus eventually leaves the window and reaches the dock or the menu bar.
8. **Given** a phone screen reader on the home screen, **When** the user moves to the CV icon
   and activates it, **Then** the app opens, its name is announced, and the home screen behind
   it can't be reached by the screen reader until the user goes home.
9. **Given** the CV app was opened from the home screen, **When** the user activates the home
   control, **Then** focus lands on the CV icon.
10. **Given** the CV window is focused, **When** the user starts the keyboard resize, presses
    the arrow keys and confirms, **Then** the window changes size and the end of the resize is
    announced. **When** the user minimizes it with the keyboard and no other window is visible,
    **Then** focus moves to the CV item in the dock, and pressing Enter there restores it.

---

### User Story 5 - Reduced motion, high contrast and larger text (Priority: P5)

A visitor who gets dizzy from motion has asked their system for reduced motion. Windows and apps
open and close without sliding or zooming. Another visitor uses high-contrast mode and sees
every window edge, control and focus indicator. A third visitor zooms the page to 200% and the
shell's labels grow without overlapping.

**Why this priority**: required by Constitution VIII and WCAG 2.2 AA. It adjusts how the shells
look and move, not what they do.

**Independent Test**: with reduced motion set, open and close the CV app in both shells and
confirm that nothing slides, zooms or bounces. With forced colors on, confirm every shell element
in each state stays visible. At 200% zoom, and at 400% zoom on a 1280 px window, confirm that
nothing is cut off or hidden.

**Acceptance Scenarios**:

1. **Given** the visitor's system asks for reduced motion, **When** a window or app opens or
   closes, **Then** it appears or disappears with no movement or scaling.
2. **Given** reduced motion, **When** the visitor drags a window, **Then** the window still
   follows the pointer, as that movement is the visitor's own.
3. **Given** forced colors are active, **When** the visitor looks at the desktop with two
   windows open, **Then** window edges, title bars, controls, the focused window, the dock's
   open marks and focus indicators are all visible and distinguishable.
4. **Given** a desktop browser 1280 px wide zoomed to 400%, **When** the visitor uses the site,
   **Then** the mobile shell is shown, and the CV reads without horizontal scrolling.
5. **Given** text is zoomed to 200%, **When** the visitor looks at the menu bar, dock and home
   screen, **Then** all labels are larger and none overlaps, is cut off or is hidden.

---

### User Story 6 - Open the shell and the CV offline (Priority: P6)

A recruiter opened the site once on a train's Wi-Fi. Later, with no signal, they open the link
again. The shell appears, and the CV app opens with all its content, in the site's fonts.

**Why this priority**: Constitution VI. It depends on the shell existing and reuses the stored
copy 004 set up.

**Independent Test**: visit the site root once online, turn the network off, open the site root
at 375 px and at 1440 px wide, open the CV app, and confirm its full content, styles, fonts,
icons and wallpaper.

**Acceptance Scenarios**:

1. **Given** one complete online visit to the site root, **When** the visitor opens the site
   root with no network, **Then** the shell for their screen appears complete, and the CV app
   opens with its full content.
2. **Given** one complete online visit to `/cv` only, **When** the visitor opens the site root
   with no network, **Then** the shell and the CV app work as they do online.
3. **Given** the shell is open and a new version is published, **When** the visitor keeps
   using it, **Then** nothing reloads, closes or interrupts them. **When** they next open the
   site online, **Then** they get the new version.

---

### User Story 7 - Every pull request proves the shells work (Priority: P7)

The owner opens a pull request that changes the shell. The checks 004 set up now also cover both
shells: accessibility in every shell state, Lighthouse for the site root, the keyboard flows of
the desktop shell, the CV app's content, offline use and requests to other sites. A failure
blocks merge and says which shell, state and width failed.

**Why this priority**: it keeps stories 1 to 6 true after merge. It is last because it checks
behavior the other stories define.

**Independent Test**: break one thing at a time on a branch (remove a close control's name, make
a shortcut unreachable, drop a CV field from the CV app, load a font from another site) and
confirm that the matching check fails with a clear message and that the pull request can't merge.

**Acceptance Scenarios**:

1. **Given** a pull request where the CV app leaves out a field `/cv` shows, **When** the checks
   run, **Then** the content check fails and names the field and the shell.
2. **Given** a pull request where a window can't be closed with the keyboard, **When** the
   checks run, **Then** the keyboard check fails and names the step.
3. **Given** a pull request that passes every check, **When** the owner runs the checks locally
   with the one command, **Then** the result is the same.

---

### Edge Cases

- **The browser window crosses the shell breakpoint** (resized, rotated or zoomed) with the CV
  app open: the site switches shell without a reload. The CV app stays open, as a focused window
  on desktop or full screen on mobile. With no app open, desktop becomes the home screen and the
  home screen becomes the empty desktop.
- **A phone turned to landscape**: it keeps the mobile shell, as a phone in landscape is too
  short for a desktop.
- **A tablet**: gets the shell its screen size picks (FR-001), and touch works in either shell.
- **A desktop zoomed to 400% on a 1280 px window** (320 CSS px wide): the mobile shell, which
  reflows to one column, as WCAG 2.2 success criterion 1.4.10 asks.
- **A window dragged toward an edge**: it stops when its title bar reaches the edge of the
  desktop area. Its title bar is never hidden under the menu bar or the dock, or off screen.
- **The browser window shrinks** so a window would fall outside: the window moves back inside.
  A window larger than the remaining desktop area is fitted to it, and its content scrolls.
- **A short desktop browser window**: the menu bar and dock stay visible, windows fit between
  them, and the CV scrolls inside its window.
- **Double-clicking or quickly clicking a dock item**: opens one window, never two.
- **A drag that starts on the close control**: does not move the window. Releasing away from the
  control does not close it. The same holds for the minimize and maximize controls.
- **A resize past the minimum size or the desktop area's edge**: the window stops at the minimum
  size, or at the edge, and its title bar stays inside the desktop area.
- **Dragging the title bar or an edge of a maximized window**: does nothing. The visitor restores
  the window first (FR-065).
- **The browser window shrinks with a window maximized**: the window keeps filling the smaller
  desktop area.
- **Every open window minimized**: the desktop shows no window, the menu bar shows the desktop's
  own name, and the dock and the Window menu bring each window back.
- **The shell switches to mobile with a window minimized or maximized**: on mobile, every app
  opens full screen from its icon as usual. Back on desktop in the same visit, a minimized
  window stays minimized, and a maximized one stays maximized.
- **A touchscreen laptop**: windows can be moved by touch drag, and dock names are available
  without hover, through the non-hover means the design sets.
- **Scrolling over a window**: scrolls that window's content, not the desktop. The desktop itself
  never scrolls.
- **Tab reaches an element in a window that is behind another**: that window comes to the front
  and becomes focused, so focus is never hidden behind another window.
- **Escape**: closes an open menu, or cancels a keyboard move and returns the window to where it
  started. It does not close a window.
- **A shortcut the browser or a screen reader already uses**: the shell doesn't take it over
  (FR-029).
- **The CV document has no name**: the CV app falls back as `/cv` does (004 FR-023), and the
  site's name falls back to the same site heading (FR-066). Window and app titles are site text
  and don't change.
- **A very long CV**: scrolls inside its window or full-screen view. On mobile, returning to the
  app in the same visit keeps the scroll position.
- **Ctrl-click, middle-click or long-press on the link to `/cv`**: behaves as a normal link, so
  the visitor can open it in a new tab.
- **Scripting turned off**: the site root shows a short page with a link to `/cv` (FR-049).
  `/cv` reads in full, as before (004).
- **Scripting turned off and no network**: offline is not promised, as for `/cv` (004).
- **A first visit with no network**: the browser's own offline message. A first visit needs the
  network.
- **A new version published while the shell is open**: the visit isn't interrupted. The next
  online visit gets the new version (FR-053).
- **Offline storage unavailable or cleared**, as in some private browsing modes: the shell works
  online and shows no error.
- **Reduced motion while dragging**: the window still follows the pointer.
- **Forced colors**: every shell element stays visible and distinguishable (FR-047).
- **A system that prefers a dark theme**: sees the site's one theme, fully legible. Themes belong
  to the Settings feature.
- **Text spacing overridden by the visitor**: shell labels and menus don't cut off or overlap.
- **The browser's Back button**: on mobile, with an app open full screen, it returns to the home
  screen. On the home screen, or on desktop, it leaves the site in one press, even after the shell
  switched while an app was open (FR-050).

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `005-os-shell-FR-###`. UI implementing a requirement carries
`data-req="005-os-shell-FR-###"` (Constitution III).

### Functional Requirements

**Choosing a shell**

- **FR-001**: The site root MUST show the OS shell. It MUST show the desktop shell when the
  browser window is at least as wide and as tall as the minimum the approved design sets, and
  the mobile shell otherwise. The choice MUST depend only on the space available, not on the
  device, the browser or its name.
- **FR-002**: When the browser window crosses that minimum, by resizing, rotating or zooming,
  the site MUST switch shell without reloading and without closing apps. The focused app MUST
  stay in front: as the focused window on desktop, or full screen on mobile. With no app open,
  the desktop MUST become the home screen, and the other way round.
- **FR-003**: Both shells MUST read the same list of apps, and each app's own declaration of the
  shells it supports (Constitution V). The dock and the home screen MUST each show exactly the
  apps that declare support for that shell, in the order the approved design sets, and no
  placeholder for an app that doesn't exist yet. In this feature the CV app is the only app, and
  it declares both shells.

**The CV app**

- **FR-004**: From first load, the CV app MUST be at most one click away on desktop and one tap
  away on mobile, with nothing in front of the shell: no splash screen, boot sequence,
  onboarding, sign-in, banner or modal (Constitution VII).
- **FR-005**: On first load, the desktop shell MUST show the CV app already open, in a focused
  window in front, with the menu bar, the desktop area and the dock visible around it, so the CV
  is zero clicks away. Keyboard focus MUST stay at the start of the page and MUST NOT be moved
  into the window on first load. The mobile shell MUST open on the home screen, as a full-screen
  app would hide the shell.
- **FR-006**: The CV app MUST show the same CV as `/cv`: it MUST meet 004 FR-001 to FR-013
  (sections, fields, order, wording, dates and links) inside its window and its full-screen
  view. Every word of CV text in it MUST come from the CV document, and the content check (002)
  MUST pass over the shell and the CV app with no exception added for them (Constitution IV).
- **FR-007**: The CV app MUST hold a link to `/cv` whose text makes clear it opens the CV as a
  page, for printing and sharing. It MUST behave as a normal link.
- **FR-008**: Inside its window or full-screen view, the CV MUST read without horizontal
  scrolling at every window and screen size the shell allows, and a long word or URL MUST wrap
  within its column (as 004 FR-022 requires of `/cv`).
- **FR-009**: The CV app MUST keep the heading structure `/cv` has (004 FR-023 and FR-024): the
  owner's name, then one heading per shown section, with entries below their section and no
  skipped levels.

**Desktop: menu bar, desktop and dock**

- **FR-010**: The desktop shell MUST show a menu bar along the top, a desktop area with the
  wallpaper, and a dock. The menu bar and the dock MUST stay visible and MUST NOT be covered by a
  window.
- **FR-011**: The dock MUST show one item per app (FR-003), with its icon. Each item's name MUST
  be shown when the item is hovered or focused, and MUST be its accessible name. An open app's
  item MUST carry an open mark that doesn't rely on color alone and is announced by screen
  readers.
- **FR-012**: Activating a closed app's dock item MUST open the app in a new window, in front
  and focused. Activating an open app's dock item MUST bring its window to the front and focus
  it. Each app MUST have at most one window: activating an item again, or several times quickly,
  MUST NOT open a second.
- **FR-013**: The menu bar MUST show a site menu, then the focused window's name and that
  window's menus. With no window focused, because none is open or every open window is
  minimized, it MUST show the site menu and the desktop's own name.
  The site menu MUST hold About this site, a link to `/cv`, and a link to the site's repository.
- **FR-014**: The menu bar MUST hold a Window menu that lists every open window, including
  minimized ones, marks the focused one and the minimized ones, and brings the chosen window to
  the front, focused, restoring it if it is minimized (FR-064). The focused window's menu MUST
  hold a command that closes it.
- **FR-015**: A menu MUST open when its title is activated, and MUST close when an item is
  chosen, when Escape is pressed, when the visitor clicks or taps outside it, or when focus
  leaves it. Only one menu MUST be open at a time.

**Desktop: windows**

- **FR-016**: Every window MUST have a title bar that shows its app's name and holds a close
  control, a minimize control (FR-063) and a maximize control (FR-065), with the app's content
  below. The close control's accessible name MUST name the
  window, such as "Close CV".
- **FR-017**: At most one window MUST be focused at a time. The focused window MUST be in front
  of every other window, and MUST be distinguishable from the others by more than color.
  Clicking or tapping anywhere in a window MUST bring it to the front and focus it.
- **FR-018**: A new window MUST open fully inside the desktop area, at the position and size the
  approved design sets, never larger than the desktop area. A window opened while others are
  open MUST NOT open with its title bar on top of another window's title bar.
- **FR-019**: Dragging a window's title bar with a mouse, a pen or touch MUST move the window. It
  MUST follow the pointer and stay where it is released.
- **FR-020**: Every move possible by dragging MUST also be possible with single pointer actions
  and no dragging (WCAG 2.2 success criterion 2.5.7), and with the keyboard (FR-027).
- **FR-021**: A window's title bar MUST stay fully inside the desktop area: a move MUST stop at
  its edge. When the desktop area shrinks, every window MUST move back so its title bar is fully
  inside, and a window larger than the area MUST be fitted to it.
- **FR-022**: A window's content MUST scroll inside the window when it is taller than the
  window. Windows MUST also be resizable, and able to be minimized and maximized, as FR-061 to
  FR-065 set.
- **FR-023**: Closing a window MUST remove it and its app's open mark in the dock. Focus MUST
  move to the window now in front, or, when no window is left, to the dock item of the app that
  was closed.

**Desktop: keyboard**

- **FR-024**: Every action of the desktop shell MUST be possible with the keyboard alone: using
  the menu bar and its menus, using the dock, and opening, focusing, switching, moving,
  resizing, minimizing, maximizing, restoring and closing windows (Constitution VIII). Focus MUST always be visible, with an indicator of at
  least 3:1 contrast against its surroundings, and MUST NOT be hidden behind a window, the menu
  bar or the dock.
- **FR-025**: From anywhere in the desktop shell, a keyboard user MUST be able to move focus to
  the menu bar, to the dock and to the next open window, each with one shortcut, without passing
  through every element of every window.
- **FR-026**: A shortcut MUST move focus to the next open window and bring it to the front,
  going through every open window that isn't minimized in turn. The Window menu MUST do the same
  for every open window, minimized or not (FR-014).
- **FR-027**: A keyboard user MUST be able to move the focused window: they start a move from
  the window's menu or with a shortcut, move it with the arrow keys in steps the design sets,
  then confirm with Enter or cancel with Escape. Cancelling MUST return the window to where it
  started. Moves MUST stop at the edges as FR-021 sets.
- **FR-028**: A shortcut MUST close the focused window. The close control MUST also be reachable
  with Tab and usable with Enter and Space.
- **FR-029**: Every shortcut MUST either use a modifier key or work only while focus is on the
  element it acts on (WCAG 2.2 success criterion 2.1.4). No shortcut may take over one the
  current main desktop browsers or screen readers reserve. Every shortcut MUST be shown next to
  its command in the menus and listed in About this site.
- **FR-030**: Focus MUST NOT be trapped in any window or menu: from any element, the keyboard
  MUST reach the menu bar, every open window and the dock. Focus order inside a window MUST
  follow its reading order. When focus moves to an element inside a window that isn't focused,
  that window MUST come to the front and become focused.

**Desktop: resizing, minimizing and maximizing**

- **FR-061**: Dragging any edge or corner of a window that isn't maximized, with a mouse, a pen
  or touch, MUST resize the window from that edge or corner. A window MUST NOT become smaller
  than the minimum size the approved design sets, nor larger than the desktop area, and its
  title bar MUST stay inside the desktop area as FR-021 sets. Its content MUST reflow to the new
  size (FR-008).
- **FR-062**: Every resize possible by dragging MUST also be possible with single pointer actions
  and no dragging (WCAG 2.2 success criterion 2.5.7), and with the keyboard: the user starts a
  resize from the window's menu or with a shortcut, changes the size with the arrow keys in
  steps the design sets, then confirms with Enter or cancels with Escape. Cancelling MUST return
  the window to the size it had. The end of a resize MUST be announced (FR-041).
- **FR-063**: The minimize control's accessible name MUST name the window, such as "Minimize
  CV". The window's menu MUST hold a minimize command with a shortcut. Minimizing MUST hide the
  window without closing its app: the app keeps its open mark in the dock, screen readers are
  told its window is minimized, and the Window menu lists it as minimized. Focus MUST move to
  the window now in front or, when no window is left visible, to the dock item of the app that
  was minimized, or to the site menu's title for About this site.
- **FR-064**: Activating a minimized app's dock item, choosing its window in the Window menu, or,
  for About this site, choosing it again from the site menu MUST restore the window at the
  position and size it had, in front and focused.
- **FR-065**: The maximize control's accessible name MUST name the window, such as "Maximize
  CV". The window's menu MUST hold a maximize command with a shortcut. Maximizing MUST make the
  window fill the desktop area, with the menu bar and the dock still visible (FR-010). While the
  window is maximized, the control and the command MUST restore it to the position and size it
  had before, and their names MUST say so, such as "Restore CV". A maximized window MUST NOT be
  moved or resized until it is restored, and MUST keep filling the desktop area when that area
  changes size.

**Mobile: home screen and full-screen apps**

- **FR-031**: The mobile shell MUST show a home screen with one icon per app (FR-003), each with
  its name shown below it, and a way to open About this site. The home screen MUST read without
  horizontal scrolling at every width from 320 px up to the desktop minimum, in portrait and in
  landscape.
- **FR-032**: Tapping an app's icon MUST open the app full screen, over the home screen, with a
  header that shows the app's name and a visible control that returns to the home screen.
- **FR-033**: Returning home MUST take one tap on that control. Any swipe or other path-based
  gesture the design adds MUST NOT be the only way to do it (WCAG 2.2 success criterion 2.5.1).
- **FR-034**: When the visitor returns home, focus MUST land on the icon of the app they left.
  Opening an app again in the same visit MUST show it where they left it, at the same scroll
  position.
- **FR-035**: While an app is open full screen, the home screen behind it MUST NOT be reachable
  by keyboard or screen reader.
- **FR-036**: Every action of the mobile shell MUST be possible with an external keyboard, with
  visible focus, and with the main phone screen readers' own gestures.
- **FR-037**: Every control in both shells MUST have a target of at least 24 by 24 CSS px (WCAG
  2.2 success criterion 2.5.8), or larger where the approved design sets it.

**About this site**

- **FR-038**: Both shells MUST offer About this site. It MUST say what the site is, and MUST
  hold a link to the site's repository, a link to `/cv`, and, on desktop, the list of keyboard
  shortcuts (FR-029). On desktop it MUST open from the site menu as a window that behaves as an
  app's window does (FR-016 to FR-030) and appears in the Window menu, without an item in the
  dock. On mobile it MUST open full screen as an app does (FR-032 to FR-035). Its text MUST be
  site text, and any CV fact in it, such as the owner's name, MUST come from the CV document.

**Screen readers and structure**

- **FR-039**: The page MUST declare English. The menu bar, the desktop area, the dock and the
  home screen MUST each be named for screen readers. Every window MUST be named by its app's
  name, and screen readers MUST be told which window is focused.
- **FR-040**: Opening a window or a full-screen app MUST move focus into it, to its title or
  first heading, so a screen reader announces it. The CV window open on first load is the one
  exception (FR-005). Closing it MUST move focus as FR-023 and FR-034 set.
- **FR-041**: A change that doesn't move focus, such as the end of a keyboard move, MUST be
  announced to screen readers.
- **FR-042**: The page title MUST name the site (FR-066), and the focused app when there is one.
- **FR-043**: Text in the shell that isn't CV content, such as the names of menus and commands,
  MUST be in English, MUST be set by the approved design, and MUST NOT contain a CV fact (as 004
  FR-006 requires of `/cv`). The site's name is CV content, not site text (FR-066).
- **FR-066**: Wherever the shell shows the site's name, including the desktop's own name in the
  menu bar (FR-013), the page title (FR-042) and About this site (FR-038), it MUST be the owner's
  name, read from the CV document. When the CV document has no name, the shell MUST show instead
  the site heading the design sets, as `/cv` does (004 FR-023).

**Look, motion and accessibility**

- **FR-044**: The shells' look MUST be the site's own: icons, wallpaper, window controls, menu
  bar, dock and home screen are designed for this site and MUST NOT copy or trace Apple's icons,
  glyphs, wallpapers, logos or fonts, nor the look of macOS's or iOS's window controls, such as
  three colored buttons (Constitution IX). Text MUST use the site's fonts (004 FR-045).
- **FR-045**: Both shells MUST match the approved mockup for each shell (Constitution II). Every
  design value MUST come from tokens, and motion values from the motion token source. The token
  check (003) MUST pass over the shells with no exception added for them.
- **FR-046**: When the visitor asks for reduced motion, every non-essential animation of the
  shells, such as windows or apps opening, closing, minimizing, restoring and maximizing, and
  menus appearing, MUST be removed or
  replaced with one that doesn't move or scale (Constitution VIII). A window being dragged MUST
  still follow the pointer.
- **FR-047**: With forced colors active, every shell element MUST stay visible and
  distinguishable, including window edges, title bars, controls, the focused window, the dock's
  open marks, menus and focus indicators. No shell element may rely on a background image or a
  background color alone.
- **FR-048**: Both shells MUST conform to WCAG 2.2 Level AA in every state: with no app open,
  with the CV app open, with About this site open, with a menu open, and, on desktop, with two
  windows open, with a window minimized, with a window maximized, and during a keyboard move and
  a keyboard resize. They MUST keep all content and function at 200% browser zoom and text-only zoom,
  at 400% zoom on a window 1280 px wide, and with text spacing overridden as WCAG 2.2 success
  criterion 1.4.12 describes.

**Without scripts**

- **FR-049**: With scripting turned off, the site root MUST still lead to the CV in at most one
  click or tap. It MUST show a short page, in the site's design, that says the OS needs
  JavaScript and links to `/cv`, with no control that needs a script to work.

**Addresses**

- **FR-050**: The site root's address MUST show the shell, and `/cv` MUST stay the plain page
  004 defines. Opening, closing, minimizing or maximizing an app MUST NOT change the address,
  which stays at the site root. On mobile, the browser's Back button or back gesture, used while
  an app is open full screen, MUST return to the home screen as the home control does (FR-034).
  On the home screen, and on desktop at any time, Back MUST leave the site with one press, as
  from any page.
- **FR-051**: Before the site root changes, 004's spec MUST be amended in this feature's pull
  request, with the owner's approval and keeping its IDs (Constitution III): 004 FR-018, the
  redirect from the site root to `/cv`, is marked as removed and replaced by this spec's FR-001;
  004 FR-038 is marked as removed and replaced by a new 004 requirement that keeps its offline
  promise for `/cv` and unknown paths, while this spec's FR-052 covers the site root. 004's tests
  for those requirements are changed to match.

**Offline and updates**

- **FR-052**: After one complete online visit to the site root or to `/cv`, opening the site
  root with no network MUST show the shell for the visitor's screen, complete with its icons,
  wallpaper, styles and fonts. Every app that doesn't need the network MUST work, including the
  CV app with its full content (Constitution VI).
- **FR-053**: 004 FR-039 to FR-041 MUST apply to the shell: an online visit after a new version
  is published gets the new version, a stored copy is always one complete version, a failing
  network falls back to the stored copy, and offline support adds no step or prompt. A new
  version published while the shell is open MUST NOT reload it, close an app or interrupt the
  visitor.
- **FR-054**: The shell MUST load everything it uses, including icons and wallpaper, from the
  site itself, and MUST make no request to any other site (as 004 FR-016 requires).

**Traceability and checks**

- **FR-055**: Every element that implements a requirement in this spec MUST carry
  `data-req="005-os-shell-FR-###"`, listing every requirement it implements, and the requirement
  traceability check (001) MUST pass.
- **FR-056**: The checks 004 set up (004 FR-048 to FR-058) MUST cover the site root in both
  shells. The accessibility check MUST cover every state FR-048 lists, at a phone width and a
  desktop width. The Lighthouse check MUST score the site root on both profiles. The other-site
  check MUST cover the site root with the CV app open.
- **FR-057**: The keyboard check MUST, at a desktop width and with the keyboard alone, reach the
  CV window open on first load, close it, open the CV app again from the dock, open About this
  site from the menu bar, switch between the two windows, move one, cancel a move, resize one,
  cancel a resize, minimize and restore one, maximize and restore one, and close both,
  confirming a visible focus indicator and the focus targets of FR-023 and FR-063 at each step. At a phone width it MUST open the CV app, return home, once
  with the home control and once with the browser's Back, and confirm focus lands on the CV icon
  each time.
- **FR-058**: The CV app check MUST open the CV app in each shell and confirm that every shown
  field the CV document holds is present, in the same order as on `/cv`. It MUST read the
  expected fields from the CV document, not from a hand-written list.
- **FR-059**: The offline check MUST visit the site root once online, turn the network off, open
  the site root at a phone width and a desktop width, open the CV app, and confirm the shell and
  the CV app show their full content and styles, with text in the site's fonts.
- **FR-060**: The checks of this spec MUST run in the same one command and on the same pull
  requests as 004's, give the same result locally and on the pull request, and name the shell,
  the state and the width in every failure.

### Key Entities

- **Shell**: the frame apps run in, either the desktop shell (menu bar, desktop area, dock and
  windows) or the mobile shell (home screen and full-screen apps). The space available picks it
  (FR-001).
- **App**: something a visitor opens in a shell. It has a name, an icon, the shells it supports
  (declared with the app) and whether it needs the network. The CV app is the only one in this
  feature.
- **Window**: an open app on desktop. It has its app, a position, a size, a place in the
  front-to-back order, whether it is focused, and whether it is minimized or maximized, with the
  position and size to restore. Each app has at most one.
- **Full-screen view**: an open app on mobile, with a header and a home control. It keeps its
  scroll position for the rest of the visit.
- **Dock**: the desktop's row of app items, each with an open mark when its app is open.
- **Menu bar**: the desktop's top bar, with the site menu, the focused window's name and menus,
  and the Window menu.
- **Home screen**: the mobile shell's grid of app icons with names.
- **About this site**: a shell view, not an app, that says what the site is and links the
  repository, `/cv` and the keyboard shortcuts.
- **Shortcut**: a key combination for a desktop shell command, shown in the menus and in About
  this site.
- **CV document**: the owner's CV from the content source (002), read by the CV app as `/cv`
  reads it (004).
- **Stored copy**: the site's pages, styles, fonts, icons and wallpaper kept by the visitor's
  browser after one visit (004), now including the shell.
- **Site text**: text in the shell that isn't CV content, set by the design, in English.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: menu bar, desktop, dock and windows that can be moved, resized, minimized and maximized, with the CV app and About this site | - |
| Mobile (iOS-style) | Yes: home screen and full-screen apps, with the CV app and About this site | - |

**CV path**: Changed. The site root no longer redirects to `/cv` (004 FR-018 is replaced,
FR-051). It shows the shell. On desktop the CV app is already open in a focused window (FR-005),
and on mobile it is one tap away. Without scripts the root links to `/cv`
(FR-049). `/cv` remains a plain server-rendered page, unchanged.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after one online visit.
- **Available offline**: both shells, with their icons, wallpaper, styles and fonts, the CV app
  with its full content, and About this site, after one visit to the site root or `/cv`
  (FR-052). `/cv` and unknown paths stay available offline as 004 sets.
- **Needs the network**: the first visit, which has to fetch the site before it can be stored.
  Following the repository link or a profile or project link in the CV leads to another site.
- **Offline state shown**: the shell itself, complete. It shows no offline banner, as nothing in
  this feature is missing offline. Apps that need the network belong to later features, and
  their specs set their offline state. On a first visit with no network, the browser's own
  offline message appears.

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/005-os-shell/design/`:

- [x] ASCII wireframes, per shell, of every state: on desktop, first load with the CV window
  open, the desktop with no window open, two windows open, a menu open, the Window menu, a
  window resized, a window minimized, a window maximized, and a keyboard move and a keyboard
  resize in progress; on
  mobile, the home screen in portrait and landscape, the CV app full screen and About this site
  full screen; and the page shown without scripts
- [x] PNG exports of the approved Penpot mockup of both shells, at a phone width and a desktop
  width (or of the interim local mockup, under the constitution's interim provision)
- [ ] Penpot file link: to be added (not needed for an interim local mockup until the provision
  ends)
- [x] `review.md` sign-off by the project owner, naming the mockup version and date, and
  confirming the look is original (FR-044)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From first load, the CV app's content is visible with 0 clicks on desktop at
  1440 px wide and after at most 1 tap on mobile at 375 px wide, in every check run.
- **SC-002**: From first load, a keyboard user reaches the open CV window with at most 3 key
  presses on the desktop shell, and opens the CV app with at most 3 key presses on the mobile
  shell with an external keyboard.
- **SC-003**: Under Lighthouse's mobile profile, with its simulated slow connection, the CV app's
  icon is visible within 2.5 seconds of the request. With the CPU slowed as that profile slows
  it, the CV app's content appears within 1 second of the click or tap.
- **SC-004**: Every Lighthouse category scores 90 or more on both the mobile and the desktop
  profile, for the site root and for `/cv`, on every build merged to the main branch.
- **SC-005**: The automated accessibility check finds 0 WCAG 2.2 AA violations in every state of
  FR-048, in both shells. The owner also checks by hand, with one screen reader on a desktop and
  one on a phone, that every action of stories 2 to 4 can be done and is announced.
- **SC-006**: In both shells, the CV app shows 100% of the shown fields the CV document holds, in
  the same order as `/cv`.
- **SC-007**: After one online visit, the site root opens with no network with the complete
  shell, and the CV app with 100% of its content, every time the offline check runs.
- **SC-008**: Loading the site root and opening the CV app makes 0 requests to any other site.
- **SC-009**: With reduced motion set, opening and closing the CV app and About this site,
  minimizing, restoring and maximizing a window, and opening a menu, moves or scales 0 elements
  in either shell.
- **SC-010**: When this feature is merged, every requirement in this spec is covered by at least
  one test, the content check (002) and the token check (003) pass with no exception added for
  the shells, and the local run of every check gives the same result as the pull-request run,
  in under 8 minutes on the owner's machine with no internet connection.
- **SC-011**: The owner's design review records that no icon, glyph, wallpaper, font or window
  control in either shell comes from or traces an Apple asset.

## Assumptions

- **Users**: recruiters open the CV, often on a phone. Hiring managers and engineers explore the
  desktop and check its keyboard and screen-reader use. The owner changes the shell and reads the
  check results on pull requests.
- **Picking the shell**: the space available picks the shell, not the device. The design sets the
  minimum width and height for the desktop shell, such as about 1024 by 640 px, so a phone in
  landscape keeps the mobile shell and a large tablet may get the desktop shell, with touch.
  "Phone width" means 375 px and "desktop width" means 1440 px, as in 004.
- **Browsers**: the current and previous major versions of the main desktop and phone browsers,
  as in 004.
- **Apps in this feature**: the CV app is the only app. About this site is a shell view, not an
  app, so it has no dock item. It gives the shell a second window, so switching between windows
  can be used and tested before Terminal, Contact and Settings exist.
- **One window per app**: the dock opens or brings forward an app's only window. More than one
  window per app is not needed by any planned app.
- **No desktop icons and no app switcher on mobile**: the dock is the way to open apps on
  desktop. On mobile, the visitor goes home to open another app.
- **Nothing is remembered between visits**: each visit starts at first load, with no windows
  restored and no positions kept. Mobile keeps an app's scroll position only within a visit.
  Remembering preferences belongs to the Settings feature.
- **Shortcuts, keyboard moves and resizes**: the exact keys, the step sizes of a keyboard move
  and a keyboard resize, a window's minimum size, and the non-dragging pointer alternatives for
  moving and resizing (FR-020, FR-062) are set by the design within FR-024 to FR-030 and FR-061
  to FR-065.
- **Site name**: the site is named after the owner, "Alex Profir", read from the CV document
  (FR-066). This settles the vision's open question about the name ("AboutThisDev" or "Alex
  Profir").
- **Theme and wallpaper**: one theme and one wallpaper, set by the design. Choosing them belongs
  to the Settings feature, as does a site-level reduced-motion setting. This feature follows the
  visitor's system setting.
- **Printing**: printing the shell is not designed. The CV app links to `/cv`, which prints a
  clean CV (004).
- **The page shown without scripts**: the shells need scripting. Without it, the root links to
  `/cv`, which keeps the CV one click away and reads in full.
- **Manual checks**: automated checks find only part of WCAG 2.2 AA, so the screen-reader pass of
  SC-005 is done by hand. It may be done in the final testing phase that also covers 004's manual
  checks.
- **Out of scope**:
  - Terminal, Contact and Settings, each a separate feature.
  - The requirement inspector, a separate feature. This feature still adds `data-req` attributes
    (FR-055).
  - Several windows per app, desktop icons, right-click menus, drag and drop between apps,
    several desktops, search, notifications, sounds, lock or sign-in screens and an app switcher
    on mobile.
  - Themes, wallpapers and preferences, which belong to Settings.
  - Installing the site as an app, or any install prompt (Constitution VII).
  - The PDF download, publishing at a public URL and choosing the domain, later features.
  - Games, easter eggs and translations, non-goals in the vision.
- **Depends on**: Constitution II and IV to IX, and 1.2.0's interim provision; the requirement
  traceability check (001); the CV content source and content check (002); the design tokens
  source and token check (003); `/cv`, its offline storage, its fonts and its checks (004); and an
  approved mockup of both shells with its review sign-off.
