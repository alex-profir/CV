# Quickstart: Validating the OS Shell

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Scenarios that prove the feature works end to end. Commands run from the repository root. The
automated tests cover each FR (plan.md, Requirement Traceability). These scenarios are how a
reviewer or the owner sees it for themselves. The manual ones (6 to 8) may be done in the final
testing phase shared with 004's manual checks (spec Assumptions), but before this feature's pull
request merges.

## Prerequisites

```sh
nvm use                                # Node 26, from .nvmrc
npm ci
npx playwright install chromium        # once per machine, needs the network
```

## 1. Build and look at both shells

```sh
npm run build
npm run serve                          # http://127.0.0.1:4173
```

Expected:

- `dist/site/` holds `index.html` and `assets/os-<hash>.js` and `.css`, and nothing that runs on a
  server ([contracts/site.md](./contracts/site.md)).
- At 1440 × 900, `/` shows the desktop with the CV already open in a focused window, centered,
  1000 × 716 at x 220, y 56, and nothing in front of it (FR-005, US1 scenario 1). Compare with
  `design/mockup/desktop-first-load-1440.png`.
- At 375 × 812, `/` shows the home screen with the CV icon and its name (US1 scenario 3). Compare
  with `phone-home-375.png`. One tap opens the CV full screen (US1 scenario 4).
- Reloading at each size never shows the other shell first, even for a frame. With the network
  panel's throttling at "Slow 4G", the shell is painted before the script finishes loading.
- `/index.html` answers 404. The address stays `/` whatever is opened or closed (FR-050).
- Every other mockup export matches its state, reached by hand (FR-045).

## 2. The desktop, by mouse (US2)

At 1440 × 900: open About this site from the site menu; drag each window by its title bar and by
an edge and corner; use Move… and Resize… with single clicks on the pad; click the window behind;
maximize and restore; minimize each and bring it back from the dock and from the Window menu;
switch windows from the Window menu; close both.

Expected: every scenario of US2. The dock's mark is filled while open, hollow while minimized,
gone when closed. The menu bar shows the focused window's name, then `Alex Profir` when none is
left. A drag toward any edge stops with the title bar fully visible. Narrowing the browser window
to 1100 px moves a window near the right edge back inside (US2 scenario 9).

## 3. Run every check, as the pull request does

```sh
npm run site-check
```

Expected: `Site check: PASSED`, with the root listed under every part but `print`, the `cv-app`
part passing in both shells, every Lighthouse category at 90 or more for `/` and `/cv` on both
profiles, and the run under 8 minutes (SC-004, SC-010).

## 4. The other checks still pass

```sh
npm test
npm run typecheck
npm run traceability
npm run content-check
npm run token-check
```

Expected: all pass. `traceability` lists all 66 `005-os-shell` requirements as covered, and 004's
FR-018 and FR-038 as removed (FR-051, FR-055). `content-check` and `token-check` pass with no
exception added for the shell (FR-006, FR-045).

## 5. With JavaScript off

Turn scripting off in the browser and open `/` at 1440 and 375 px.

Expected: a short page in `/cv`'s look with the name, the sentence that the OS needs JavaScript,
`Read the CV` → `/cv`, and the footer. No button, menu or dock shows (FR-049, US1 scenario 7).

## 6. Keyboard and screen readers (by hand, SC-005)

With the keyboard alone at 1440 × 900, do every action of US2, then each step of US4, with a
visible indicator throughout. Then:

- VoiceOver with Safari on macOS, or NVDA with Firefox on Windows: hear `Menu bar`, `Desktop`,
  `Dock`, the open state of the CV item, the focused window as current, the CV's name on opening,
  and the move and resize announcements (US4 scenarios 2, 4, 10).
- VoiceOver on iOS, or TalkBack on Android: swipe through the home screen, open the CV, confirm the
  home screen can't be reached behind it, go home with Home and with the back gesture, and land on
  the CV icon (US4 scenarios 8, 9; US3 scenario 6).

Record what was heard in the pull request.

## 7. Reduced motion, forced colors and zoom (by hand)

- Reduced motion on in the operating system: windows and apps fade without moving or scaling;
  a dragged window follows the pointer (US5 scenarios 1, 2).
- Windows contrast themes (forced colors) on Edge: window edges, title bars, controls, the
  focused window, the dock's open marks and focus are all visible (US5 scenario 3).
- 1280 px browser window at 400%: the mobile shell, with the CV readable without sideways
  scrolling (US5 scenario 4). Text-only zoom at 200% in Firefox: menu bar, dock and home screen
  labels are larger and nothing overlaps (US5 scenario 5).

## 8. Shortcuts in every browser and screen reader (by hand, research R9 Verify)

For each of `Alt+Shift+M`, `D`, `N`, `W`, `H`, `F`, `P`, `S` (`Option+Shift` on a Mac), in the
current Chrome, Edge, Firefox and Safari, then with NVDA, JAWS and VoiceOver running: press it with
a window focused.

Expected: the shell acts, and the browser or screen reader does nothing of its own. Record the
matrix in the pull request. A clash changes design/wireframes.md and design/review.md before the
code (Constitution II).

## 9. Offline (by hand)

Visit `/` once online, wait two seconds, then turn the network off in the browser's developer
tools. Reload `/` at 375 and at 1440 px, open the CV app, and check its content, fonts and
wallpaper (US6 scenario 1). Repeat from a fresh profile that visited `/cv` only (US6 scenario 2).
Then, with the shell open and online, rebuild with a visible change and serve it: the open shell
doesn't reload or close anything, and the next visit shows the change (US6 scenario 3).

## 10. Shell switching

With the CV open at 1440 × 900, narrow the window below 1024 px, then widen it again. Then do the
same from the phone width with the CV open full screen.

Expected: the CV stays open: full screen on mobile, a focused window on desktop. With nothing
open, the desktop becomes the home screen and back. After switching to desktop with the CV open,
one Back leaves the site (FR-002, FR-050).

## 11. One edit changes the shell

- Change `basics.name` in a copy of `packages/content/resume.json` and rebuild: the menu bar's
  desktop name, the title, the home screen, About this site and the CV app all change (FR-066).
- Change `size.window-min-width` in the token export, regenerate the output and rebuild: windows
  stop shrinking at the new width (FR-045).

## 12. After Penpot is back (the interim provision's follow-up)

Follow research R19's three steps in their own pull request.
