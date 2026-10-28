# Implementation Plan: The OS Shell

**Branch**: `005-os-shell` | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-os-shell/spec.md`, and the owner's direction for
this plan: *pre-render the shell at build time and hydrate it on the client; keep the output
static files.*

**Design**: [design/review.md](./design/review.md) (Graphite, interim local mockup, commit
`4d2e29f`, approved 2026-10-26, and amended on 2026-10-27 with the Window menu's Go to the menu
bar and Go to the dock commands). No Penpot link is needed under Constitution 1.2.0's interim
provision on local mockups (research R19).

## Summary

The site root stops redirecting to `/cv` and becomes the OS shell: a desktop with a menu bar,
windows and a dock at 1024 × 640 and up, and a phone home screen with full-screen apps below that.
The CV app shows `/cv`'s CV, and About this site gives the desktop a second window.

The root stays a **static page**. `npm run build` renders it at build time like `/cv`, then
React **hydrates** it in the browser:

- The build writes `index.html` with both shells pre-rendered in it: the desktop with the CV
  window already open, and the home screen (R1, R2).
- A short inline script in `<head>` picks the shell from the space available before the first
  paint, so neither shell ever flashes on the other's screen (R2).
- A single client bundle hydrates the shell, drops the inactive one, and takes over (R1).
- A tap on a home screen icon before hydration finishes isn't lost: the inline script also records
  the first icon activated while `#os` has no `data-ready`, and `Os` opens that view right after
  hydration when no app is open yet. On a slow phone the CV stays one tap away (FR-004,
  Constitution VII).
- Without scripting, the root shows a short page linking to `/cv` (FR-049).
- `/cv` and the not-found page don't change, and still ship no React.

Technical approach (details in [research.md](./research.md)):

- **Behavior** in a new pure-TypeScript workspace, `@cv/os-core`: one reducer for windows, focus,
  minimize, maximize, keyboard sessions and the mobile view, plus geometry and shortcuts. It is
  unit-tested without a browser (R4).
- **Rendering** in `@cv/web`: the two shells, the apps (each declaring its shells), and a shared
  `Os` root that holds the state, the history, announcements and the title (R4).
- **The CV app** reuses `/cv`'s components through a new `CvDocument`. Its layout follows its
  window through container queries. A Lightning CSS visitor turns `@container
  (--token-breakpoint-wide)` into a real condition at build time (R5).
- **Tokens**: the design's 85 tokens are added to the hand-written export, with one renamed:
  `breakpoint.desktop-height` becomes `size.desktop-min-height`, because 003's output turns every
  breakpoint into a width condition (R7).
- **Offline**: the root becomes a page route. The service worker is unchanged, and stores the
  shell with everything else (R14).
- **Checks**: the site check drives the shell into every state of FR-048 by real input. It adds a
  `cv-app` part and the keyboard flows of FR-057, and names shell, state and width in each
  failure (R17).

## Technical Context

**Language/Version**: TypeScript with erasable syntax and TSX, run by Node.js 26 (as 001 to 004).
CSS compiled by Lightning CSS. The browser code is bundled by Vite (Rolldown).

**Primary Dependencies**: no new package. Already pinned and now used in the browser too:
`react` and `react-dom` 19.3.1 (`react-dom/client`'s `hydrateRoot`). Build and checks as 004:
`vite` 8.3.5, `lightningcss` 1.33.0, `playwright` 1.64.1, `axe-core` 4.14.0, `lighthouse` 13.5.0.
Reused: `@cv/content` (002), `@cv/tokens` (003), 004's components, build, server, service worker,
test helpers and site check.

**Storage**: none on a server. In the visitor's browser, the OS state lives in memory for one
visit (spec Assumptions: nothing is remembered between visits). Offline storage is 004's single
cache `cv-<version>`, which now includes the shell.

**Testing**:

- Vitest unit tests for `@cv/os-core` (reducer, geometry, shortcuts, invariants), with no browser.
- Vitest browser tests for the shells in Chromium through Playwright, on the real build (004 R21).
- `npm run site-check` on the real build: the root in both shells and every state (R17).
- `tsc --noEmit` over the new workspace and TSX.
- By hand: screen readers, shortcuts in every browser, forced colors in Edge, text-only zoom in
  Firefox (quickstart 6 to 8). Under Constitution 1.3.0's interim provision on deferred manual
  checks they may wait for the final testing phase, recorded in T122 and the pull request.

**Target Platform**: the current and previous major versions of Chrome, Edge, Firefox and Safari,
on desktop and phone (spec Assumptions). Build and checks on Node.js 26, macOS (owner) and Linux
(GitHub Actions `ubuntu-latest`).

**Project Type**: a static web site. One new page with client-side behavior, one new workspace,
and extensions to the site check.

**Shells**: Both. Desktop (menu bar, desktop area, dock, windows) and mobile (home screen,
full-screen apps), each with the CV app and About this site, as the spec's Shell Scope sets.

**Offline Approach**: the root is a page in the route table, so 004's service worker stores
`index.html`, the shell's script and style sheet, and the fonts after one visit to `/` or `/cv`,
and answers the root from that store offline. The shell's script is one file loaded up front, so a
new version activating mid-visit never leaves the open shell without a file it needs (R14).

**Performance Goals**:

- Lighthouse 90 or more in every category for `/` and `/cv`, on both profiles (SC-004).
- The CV icon visible within 2.5 s on the mobile profile, and the CV app's content within 1 s of
  the tap with the profile's CPU slowdown (SC-003).
- Budget for the root, compressed: script about 85 KB, style sheet about 8 KB, HTML about 15 KB
  (R18).
- Window drags follow the pointer at the display's frame rate: one state update per animation
  frame.

**Constraints**:

- The output is static files only. No server code, and the host serves files by the route table
  (owner's direction, contracts/site.md).
- No request to any other site (FR-054). No literal design value or CV fact in source (003, 002),
  with no exception added.
- Nothing in front of the CV (Constitution VII). On desktop the CV is painted from HTML before any
  script runs. On mobile a tap on the CV icon before hydration still opens the CV, once hydrated,
  with no second tap.
- One JS file for the shell, with no lazy chunks (R14).
- Shortcuts use `Alt+Shift` (`Option+Shift`) and never take one a browser or screen reader
  reserves (FR-029, R9).

**Scale/Scope**: 66 requirements; 2 shells; 1 app and 1 view; 11 desktop and 4 mobile states; 8
shortcuts; 85 new tokens; 1 new site check part and the root added to 9 others.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check passed before research, and the re-check after design passed too. The table
shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. React, hydration, `os-core`, Pointer Events, container queries, the inline script and every file path appear only in this plan, research.md and the contracts. 004's spec is amended in this pull request, as FR-051 requires, before the root changes (R15) |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | `design/wireframes.md` covers every state of both shells and the no-script page. `design/mockup/` holds the interim local mockup with 18 PNG exports at 1440, 375, 320 and 812 px. `design/review.md` is signed by the owner, naming commit `4d2e29f` and 2026-10-26. The one token rename (R7) changes a name in the mockup README, not the design, and is committed as `docs:` before code. The shortcut check (R9) changes the design first if it finds a clash |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 66 FRs have planned tests below, with UI targets as [contracts/shell.md](./contracts/shell.md#data-req-targets) sets. The traceability check (001) reads `data-req` written literally in TSX. 004's FR-018 and FR-038 are marked removed, and FR-059 gets their tests (R15) |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | The CV app, the site name, About this site and the no-script page read `@cv/content` only, in the build and in the browser (R1, R16). The CV app renders 004's components, so `/cv` and the app can't drift (R5). Style sheets use `var(--token-…)`, and scripts read design values only through `metrics.ts` (R7). Site text holds no design value: the pad's step legends are patterns filled from `METRICS.step` and `METRICS.bigStep`, so changing `space.4` or `space.16` is one edit. The 85 tokens go in the hand-written export, under the interim provision. Motion reuses existing tokens. Window positions in `style` are state, not design values (R3) |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | `@cv/os-core` holds every behavior both shells share (R4). Each app declares its shells in `apps/<app>/app.tsx`, and both shells read the same list (FR-003). Desktop and mobile code live in `shells/desktop/` and `shells/mobile/`, including the desktop-only shortcut listener (in `Desktop.tsx`, so it exists only while the desktop shell is shown) and the pad's styles (in `desktop.css`). Matches the spec's Shell Scope: both shells, with the CV app and About this site |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | After one visit to `/` or `/cv`, both shells, the CV app, About this site, fonts, icons and wallpaper work offline (R14). Icons are inline SVG and the wallpaper is CSS, so nothing extra is fetched (R6). Proven by the `offline` part on every pull request (FR-059) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | Desktop: the CV is open in the pre-rendered HTML, zero clicks and no script needed to see it (FR-005). Mobile: one tap (FR-004), including a tap made before hydration finishes, which the inline script records and `Os` replays. No splash, banner or prompt. Without scripts, the root links to `/cv` (FR-049). `/cv` is still rendered at build time with no script but the worker's registration |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | Every desktop action has a keyboard path and a single-click path (R8, R9). axe in every FR-048 state, the keyboard flows of FR-057, forced colors, reduced motion and zoom run on every pull request (R17). Lighthouse 90+ on `/` on both profiles is a merge check. Hydration cost on mobile is marked **Verify**, with a fallback (R18). Screen readers are checked by hand (quickstart 6), before merge or, under 1.3.0's interim provision on deferred manual checks, in the final testing phase, recorded in T122 and the pull request |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The site mark, the CV icon, the control glyphs and the wallpaper are the mockup's own drawings, as inline SVG and CSS (R6). Fonts are the three OFL families of `/cv`. The controls are neutral circles, not three colors (design/review.md). A test asserts no Apple or system UI font is named |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | No new package. React DOM's client, already a dependency, now ships on one page, with the reason below. Sixteen abstractions are listed with the simpler alternative each rejected. No agent skill is added |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One pull request from `005-os-shell`, holding the 004 amendment, the tokens, the code and the check changes. The token rename in the mockup README is a `docs:` commit in the same pull request |

## Requirement Traceability

Constitution III. Paths are relative to `packages/os-core/test/` (marked **core**),
`packages/web/test/shell/` (marked **shell**) and `tools/site-check/test/` (marked **check**).
Each test or group title carries the `005-os-shell-FR-###` IDs it covers. "Shell test" means the
real build opened in Chromium at the given size and driven by clicks, drags, touch and keys
(R17). UI targets follow [contracts/shell.md](./contracts/shell.md).

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 005-os-shell-FR-001 | core `shell.test.ts`: `shellQuery` for the metrics is `(min-width: 1024px) and (min-height: 640px)`. shell `shell-choice.test.ts`: 1440 × 900 and 1024 × 640 get the desktop; 1023 × 900, 1440 × 639, 375 × 812 and 812 × 375 the mobile shell; the same at each size with a desktop and a phone user agent (US5 scenario 4, edge cases) | `#os` |
| 005-os-shell-FR-002 | core `reducer.test.ts`: `shellChanged` both ways keeps the focused app in front, or swaps home and empty desktop. shell `shell-choice.test.ts`: resizing across 1024 px with the CV open, and with nothing open, causes no navigation and keeps the app (edge cases) | `#os` |
| 005-os-shell-FR-003 | core `apps.test.ts`: `appsFor` returns exactly the apps declaring a shell, in list order, for a fixture list of three apps with mixed shells. shell `apps.test.tsx`: the dock and the home screen each show one item, the CV, and no placeholder | `.dock`, `.app-grid` |
| 005-os-shell-FR-004 | shell `first-load.test.ts`: at 1440 and 375 px nothing overlays the shell on load (no dialog, banner or element above the menu bar, dock or home screen), and the CV is visible with 0 clicks on desktop and after 1 tap on mobile (SC-001); at 375 px a tap on the CV icon while the `os` script's request is held opens the CV once the script loads, with no second tap | `#os` |
| 005-os-shell-FR-005 | shell `first-load.test.ts`: on load at 1440 × 900 the CV window is open, focused, in front, 1000 × 716 at 220, 56, with menu bar and dock visible; `document.activeElement` is `body`; at 375 the home screen shows and no app is open. Its box is the same before and after hydration within 0.5 px at 1024 × 640, 1440 × 900 and 2560 × 1440 (R3) | `.desktop` |
| 005-os-shell-FR-006 | check `cv-app.test.ts`: the CV app in each shell holds every expected field in order (the `cv-app` part on the real build). shell `cv-app.test.ts`: the CV app's text equals `/cv`'s `main` text; `npm run content-check` passes (self-check) | CV app root |
| 005-os-shell-FR-007 | shell `cv-app.test.ts`: the link reads `Open as a page to print or share`, goes to `/cv`, and Ctrl-click and middle-click open a new tab (edge cases) | CV app link |
| 005-os-shell-FR-008 | shell `cv-app.test.ts`: the CV window resized to 400 px wide, and the full-screen view at 320 px, have no horizontal scroll, and a fixture CV with a 120-character word stays in its column. At a window content width of 900 px and up the CV has two columns, below it one (R5) | CV app root |
| 005-os-shell-FR-009 | shell `cv-app.test.ts`: in both shells, one `h1` with the name, an `h2` per shown section, `h3` per entry, no skipped level; with the `no-name` fixture, `h1` is `CV` | CV app root |
| 005-os-shell-FR-010 | shell `windows.test.ts`: dragged, resized and maximized windows never cover the menu bar or dock (their boxes don't intersect) | `.desktop` |
| 005-os-shell-FR-011 | shell `dock.test.ts`: each item's accessible name is the app's name, plus `open` or `minimized`; its name shows without hover; the mark is a filled or hollow shape, distinguishable with color removed (grayscale screenshot comparison) | `.dock-item` |
| 005-os-shell-FR-012 | core `reducer.test.ts`: `open` on an open view brings it to the front; never two windows per view. shell `dock.test.ts`: a click and a fast triple click on the CV item give one window, in front and focused (US2 scenario 7, edge cases) | `.dock-item` |
| 005-os-shell-FR-013 | shell `menus.test.ts`: the menu bar shows the site menu, the focused window's name and Window; with none focused, the site name; the site menu holds About this site, `/cv` and the repository link | menu bar |
| 005-os-shell-FR-014 | shell `menus.test.ts`: the Window menu lists every open window with `✓` on the focused one and `(minimized)` on minimized ones, and choosing one brings it to the front, restoring it (US2 scenario 6). The focused window's menu holds Close | Window menu, window menu |
| 005-os-shell-FR-015 | shell `menus.test.ts`: a menu opens on its title, closes on choosing, Escape, a click outside and focus leaving; opening another closes the first | each `role=menu` |
| 005-os-shell-FR-016 | shell `windows.test.ts`: every window's title bar shows its name and three controls named `Close X`, `Minimize X`, `Maximize X`, with content below | title bar, controls |
| 005-os-shell-FR-017 | core `invariants.test.ts`: at most one focused window, always the front one. shell `windows.test.ts`: clicking anywhere in the back window brings it to the front, focused; the focused window differs from the other with color removed (grayscale screenshots of the title bar) (US2 scenario 2) | `section.window` |
| 005-os-shell-FR-018 | core `geometry.test.ts`: `placeWindow` gives the design's boxes at 1440 × 900, fits to small areas, and About's title bar never lands on another title bar, including after five open and close cycles. shell `windows.test.ts`: About opens 48 px right and below the CV (US2 scenario 1) | `section.window` |
| 005-os-shell-FR-019 | shell `windows.test.ts`: a mouse drag, a pen drag and a touch drag of the title bar move the window with the pointer, and it stays where released (US2 scenario 3) | title bar |
| 005-os-shell-FR-020 | shell `windows.test.ts`: Move… then pad clicks move the window by 16 px per click, with no drag; the pad's legends show the step sizes read from the tokens (US2 scenario 5) | pad |
| 005-os-shell-FR-021 | core `geometry.test.ts`: `clampMove` and `fitToArea` keep the title bar inside for moves past each edge and for shrinking areas. shell `windows.test.ts`: dragging toward each edge stops with the title bar inside; narrowing the viewport moves a window back (US2 scenarios 4, 9) | `section.window` |
| 005-os-shell-FR-022 | shell `windows.test.ts`: wheel over a window scrolls its content, not the page; the document never scrolls on desktop (edge cases) | `.window-content` |
| 005-os-shell-FR-023 | core `reducer.test.ts`: `close` focuses the next window, or the dock item, or `site-menu` when About was the last window. shell `windows.test.ts`: closing removes the window and the dock's mark, and the menu bar shows the next name or the site name (US2 scenario 8) | close control |
| 005-os-shell-FR-024 | shell `keyboard.test.ts`: every action of US2 done with keys alone; at each step the focused element has an indicator of 3:1 or more and isn't covered (004's indicator measurement) | `.desktop` |
| 005-os-shell-FR-025 | shell `keyboard.test.ts`: from inside the CV content, `Alt+Shift+M`, `D` and `N` reach the menu bar, the dock and the next window; the Window menu's Go to the menu bar and Go to the dock do the same | `.desktop` |
| 005-os-shell-FR-026 | core `reducer.test.ts`: `next` cycles through shown windows and skips minimized ones. shell `keyboard.test.ts`: `Alt+Shift+N` alternates two windows (US4 scenario 3) | Window menu's Next window |
| 005-os-shell-FR-027 | core `reducer.test.ts`: a move session steps 16 and 64 px, clamps, confirms and cancels to the start. shell `keyboard.test.ts`: `Alt+Shift+P`, arrows, Enter moves and announces; Escape returns (US4 scenario 4) | pad, Move… item |
| 005-os-shell-FR-028 | shell `keyboard.test.ts`: `Alt+Shift+W` closes the focused window; Tab reaches the close control and Enter and Space each close | close control |
| 005-os-shell-FR-029 | core `shortcuts.test.ts`: every shortcut has `Alt` and `Shift`; none of them is in a committed list of combinations reserved by Chrome, Edge, Firefox, Safari, NVDA, JAWS, Narrator and VoiceOver (research R9); Option+Shift on a Mac matches by `code`. shell `menus.test.ts`: each command shows its shortcut and `aria-keyshortcuts`; About lists all eight. Manual: quickstart 8 | menu items, About's shortcut list |
| 005-os-shell-FR-030 | shell `keyboard.test.ts`: from any element, Tab and Shift+Tab reach the menu bar, every window and the dock within the page's element count; focus order in the CV matches reading order; Tab into a window behind brings it to the front (US4 scenario 7, edge cases) | `section.window` |
| 005-os-shell-FR-031 | shell `mobile.test.ts`: the home screen shows one icon per app with its name, and About this site, with no horizontal scroll at 320, 375, 812 × 375 and 1023 px (US3 scenarios 4, 5) | home screen |
| 005-os-shell-FR-032 | shell `mobile.test.ts`: a tap opens the app full screen with a header showing its name and Home | full-screen header |
| 005-os-shell-FR-033 | shell `mobile.test.ts`: one tap on Home returns to the home screen; no gesture is the only way | Home control |
| 005-os-shell-FR-034 | core `reducer.test.ts`: `mobileHome` saves the scroll and focuses the icon. shell `mobile.test.ts`: scroll halfway, Home, reopen: same `scrollTop`; focus lands on the CV icon (US3 scenario 2, US4 scenario 9) | Home control, full-screen view |
| 005-os-shell-FR-035 | shell `mobile.test.ts`: with an app open, the home screen is `inert`, Tab never reaches it, and the accessibility tree (004's `ax.ts`) holds none of it (US4 scenario 8) | home screen |
| 005-os-shell-FR-036 | shell `mobile.test.ts`: with keys alone at 375 px, open the CV in at most 3 presses (SC-002), go home and open About, with a visible indicator at each step; the desktop shortcuts do nothing on mobile. Manual: quickstart 6 | `.mobile` |
| 005-os-shell-FR-037 | shell `targets.test.ts`: every control in every state of both shells is at least 24 × 24 px; Home is 44 × 44 | `.desktop`, `.mobile` |
| 005-os-shell-FR-038 | shell `about.test.tsx`: About opens from the site menu as a window in the Window menu with no dock item, and from the home screen full screen; it holds the text, `/cv` and the repository link, and the shortcuts on desktop only; the name comes from the CV document (a fixture name appears) | About view |
| 005-os-shell-FR-039 | shell `screen-reader.test.ts`: `lang="en"`; the accessibility tree has `Menu bar`, `Desktop`, `Dock` and `Home screen`; each window is named by its app, and only the focused one is current | menu bar, `main`, dock, home screen, `section.window` |
| 005-os-shell-FR-040 | shell `screen-reader.test.ts`: opening from the dock, a menu or the home screen focuses the title; first load doesn't (US4 scenario 2) | `.window-title`, `.app-title` |
| 005-os-shell-FR-041 | shell `screen-reader.test.ts`: the status region reads `CV moved.`, `Move cancelled.`, `CV resized to W by H.`, `Resize cancelled.`, `CV maximized.` and `CV restored.` after each action | status region |
| 005-os-shell-FR-042 | shell `screen-reader.test.ts`: the title is `CV – Alex Profir` with the CV focused, `About this site – Alex Profir` with About, `Alex Profir` with none, on both shells | Non-UI |
| 005-os-shell-FR-043 | shell `site-text.test.ts`: every new site text value is English and holds no key fact of the real CV (as 004's test); every shell label in the rendered page is CV text or site text | Non-UI |
| 005-os-shell-FR-044 | shell `design.test.ts`: the three controls share one color (computed styles); no font token or `fonts.json` family is an Apple or system UI font; the icons are the committed SVG components. Manual: design/review.md's sign-off (SC-011) | icons |
| 005-os-shell-FR-045 | shell `design.test.ts`: at 1440 × 900 the menu bar is 32 px, the dock leaves 104 px, title bars are 40 px, the CV window is 1000 × 716 at 220, 56; at 375 the grid has 4 per row, at 320 3, at 812 × 375 10. web `tokens.test.ts`: every new token is read. `self-check`: `npm run token-check` passes with no skip marker | Non-UI |
| 005-os-shell-FR-046 | shell `motion.test.ts`: opening, closing, minimizing, restoring and maximizing animate with `motion.duration.fast`; with reduced motion, sampled frames show no `transform` or `scale` change and only opacity animates; a drag still follows the pointer (US5 scenarios 1, 2; SC-009) | Non-UI |
| 005-os-shell-FR-047 | shell `modes.test.ts`: with forced colors, windows, menus, dock, pad and menu bar have a visible border; the focused window's is thicker; open marks and focus outlines show; no element relies on a background image alone (US5 scenario 3) | Non-UI |
| 005-os-shell-FR-048 | shell `accessibility.test.ts`: axe (WCAG 2.2 A and AA tags) finds nothing in each FR-048 state of both shells; 200% zoom, text-only 200%, 400% on 1280 px and text spacing keep content (no clipping or overlap). check `shell-states.test.ts`: the driver reaches every state | Non-UI |
| 005-os-shell-FR-049 | shell `no-script.test.ts`: with scripting off, `/` shows the name, the sentence and `Read the CV` → `/cv`, and no visible button, menu or form control. check `no-script.test.ts`: a fixture root showing a dock with scripting off fails | no-script page |
| 005-os-shell-FR-050 | shell `history.test.ts`: the URL stays `/` through every action; on mobile, Back from the CV returns home with focus on its icon and a second Back leaves the site; on desktop one Back leaves; after a mobile-to-desktop switch with the CV open, one Back leaves (US3 scenario 6, edge cases) | Non-UI |
| 005-os-shell-FR-051 | shell `amendment.test.ts`: 004's spec marks FR-018 and FR-038 removed with their replacements and holds FR-059; `npm run traceability` passes with 004's tests renamed | Non-UI |
| 005-os-shell-FR-052 | shell `offline.test.ts`: after one visit to `/`, and separately to `/cv` only, `/` offline at 375 and 1440 px shows the shell complete and opens the CV app with every field, in the site's fonts (US6 scenarios 1, 2) | Non-UI |
| 005-os-shell-FR-053 | shell `offline.test.ts`: version A open, B installed: no reload, the CV window stays open, and a font first used after the update still loads; the next visit shows B (US6 scenario 3); with service workers blocked, no error | Non-UI |
| 005-os-shell-FR-054 | shell `requests.test.ts`: loading `/` and opening the CV app and About in both shells requests only `127.0.0.1`. check `other-sites.test.ts` covers the part on the root | Non-UI |
| 005-os-shell-FR-055 | shell `data-req.test.tsx`: every target in contracts/shell.md carries its IDs in the rendered root. `self-check`: `npm run traceability` passes | all targets |
| 005-os-shell-FR-056 | check `shell-states.test.ts`: the summary lists `/` under accessibility in every FR-048 state at both widths, under lighthouse on both profiles, and under other-sites with the CV app open | Non-UI |
| 005-os-shell-FR-057 | check `shell.test.ts`: on the real build the keyboard flows pass; with the close shortcut's handler removed in a temporary copy, the part fails naming the step (US7 scenario 2) | Non-UI |
| 005-os-shell-FR-058 | check `cv-app.test.ts`: expected fields come from the CV document; with a field left out of the CV app in a temporary copy, the part fails naming the field and the shell (US7 scenario 1) | Non-UI |
| 005-os-shell-FR-059 | check `offline.test.ts`: a fixture whose shell script isn't stored fails on `/` offline at both widths, naming the shell and width | Non-UI |
| 005-os-shell-FR-060 | check `cli.test.ts`: `npm run --silent site-check` and the CI step run the same command; every problem line on `/` has a `<shell>/<state>/<width>` variant; two runs give the same result (US7 scenario 3). check `performance.test.ts`: under 8 minutes off CI (SC-010) | Non-UI |
| 005-os-shell-FR-061 | core `geometry.test.ts`: `clampResize` from each edge and corner stops at 400 × 300 and the area. shell `windows.test.ts`: dragging each edge and the bottom-right corner resizes, never below the minimum; a maximized window doesn't resize (US2 scenario 10) | resize handles |
| 005-os-shell-FR-062 | core `reducer.test.ts`: a resize session steps, clamps, confirms and cancels. shell `keyboard.test.ts`: `Alt+Shift+S` with arrows and Enter resizes and announces; Escape restores; Resize… with pad clicks resizes (US4 scenario 10) | pad, Resize… item |
| 005-os-shell-FR-063 | core `reducer.test.ts`: `minimize` keeps the app open and moves focus by the rule, to the site menu for About. shell `windows.test.ts`: minimizing hides the window, the mark goes hollow, the Window menu says `(minimized)` (US2 scenario 11) | minimize control |
| 005-os-shell-FR-064 | core `reducer.test.ts`: `open` on a minimized view restores its geometry. shell `windows.test.ts`: the dock, the Window menu and the site menu (About) restore at the same box, in front, focused | `.dock-item`, Window menu items |
| 005-os-shell-FR-065 | core `geometry.test.ts`: maximized fills the area and follows it. shell `windows.test.ts`: maximize fills between menu bar and dock, the control is then named `Restore CV`, restore returns the box; title bar and edge drags do nothing while maximized (US2 scenario 12, edge cases) | maximize control |
| 005-os-shell-FR-066 | shell `site-text.test.ts`: the menu bar's desktop name, the title, the home screen and About show `Alex Profir`; with the `no-name` fixture, `CV` | menu bar name, home screen name |

Success criteria without an FR of their own:

- SC-001: FR-004 and FR-005 above.
- SC-002: shell `keyboard.test.ts` (3 presses on desktop to the CV window) and `mobile.test.ts`
  (3 presses on mobile to open the CV).
- SC-003: check `lighthouse.test.ts` on the real build off CI: on the mobile profile, the CV
  icon lies in the first contentful paint's viewport and FCP is under 2.5 s; shell
  `cv-app.test.ts` with 4× CPU throttling over CDP: the CV's `h1` is visible within 1 s of the tap.
- SC-004: the `lighthouse` part on every pull request.
- SC-005, SC-011: by hand, quickstart 6 and design/review.md.
- SC-006 to SC-009: FR-058, FR-052, FR-054 and FR-046 above.
- SC-010: FR-060 above, and the self-checks of FR-006 and FR-045.

## Dependencies, Skills & Abstractions

No new package is added. `react-dom` is already pinned for the build; its `react-dom/client`
entry now ships to the browser on the root page only:

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `react`, `react-dom/client` in the browser (root page only) | existing dependency, new use | Hydrates the pre-rendered shell and runs it, from the same components the build renders (R1) | Hand-written DOM code for windows, menus and two shells: the same components twice, once as TSX for the build and once imperative. Preact: a second renderer and its compat layer for about 50 KB less | Yes: Meta's React team |
| Workspace `@cv/os-core` | abstraction (package boundary) | The constitution's shared core: one pure reducer, geometry and shortcuts both shells read, tested without a browser (R4) | State inside components: rules spread over both shells and testable only in a browser | N/A |
| `Os` root (`src/os/Os.tsx`) | abstraction | Holds the reducer, picks the shell, runs effects (focus, announcements), the title and the history (R4, R10, R11) | Each shell doing these: two copies of the history and focus rules | N/A |
| App declarations (`src/apps/<app>/app.tsx`, `src/apps/index.ts`) | abstraction | Each app declares its shells beside its code, as Constitution V requires; shells read one list (FR-003) | A list inside each shell: the declaration would live in the shell, against Constitution V | N/A |
| Shell components (`src/shells/desktop/`, `src/shells/mobile/`) | abstraction | Shell-specific rendering kept in its shell (Constitution V) | One component switching on the shell everywhere: the two layouts share little markup | N/A |
| `CvDocument` (`src/cv/CvDocument.tsx`) | abstraction | One CV body for `/cv` and the CV app (R5) | Copying `CvPage`'s body: two places to change the CV | N/A |
| Metrics module (`src/os/metrics.ts`) | abstraction | Every design value the scripts need, read from tokens in one place and handed to `os-core` (R7) | `tokenValue` calls spread through components and `os-core` reading tokens itself, which would tie it to the site's tokens | N/A |
| Motion module (`src/os/motion.ts`) | abstraction | `animateIn` and `animateOut` with the Web Animations API: one place for the keyframes, the motion tokens from `metrics.ts` and the reduced-motion switch, used by windows, full-screen views and menus (R13, FR-046) | `element.animate` calls in each of four components, each repeating the keyframes and the reduced-motion check. CSS transitions or `@starting-style`: animate opening only, and can't hold a closing element until it ends (R13) | N/A |
| `fill(pattern, values)` in `src/site-text.ts` | abstraction | Fills `{key}` placeholders, so each phrase with a window name, a size or a step is written once, as site text (FR-043) | Template literals in components: site text would be split between `site-text.ts` and components, and the pad's step legends would hold design values | N/A |
| Container breakpoint visitor (`scripts/container-breakpoints.ts`) | abstraction (build) | Lets `cv.css` use `@container (--token-breakpoint-wide)`, so the CV follows its window (R5) | Duplicated `@media` and class rules; amending 003's output | N/A |
| Shell picker (inline script, from `shellQuery`) | abstraction | Picks the shell before the first paint, with values from tokens (R2), and records a home screen icon tapped before hydration so `Os` can open it once hydrated (FR-004) | A media query: needs a height breakpoint 003's output can't give. Picking after hydration: a flash of the wrong shell. Relying on React's event replay: it only replays events after `hydrateRoot` runs, so a tap while the script is still downloading is lost | N/A |
| `renderShell` and the root page (`src/pages/ShellPage.tsx`, `render.tsx`) | abstraction | Renders the document, the no-script page and the hydratable `#os` (R1, R2) | Rendering the whole document with `renderToString`: React would own `<head>` and the no-script page | N/A |
| Client entry (`src/client/os.tsx`) | abstraction | `hydrateRoot` with the same props as the build | None simpler: hydration needs an entry | N/A |
| Site check shell state driver (`tools/site-check/src/shell-states.ts`) | abstraction | Brings a page to each FR-048 state by real input, for every part that checks states (R17) | Each part repeating the clicks and keys to reach a state | N/A |
| Site check part `cv-app` (`tools/site-check/src/parts/cv-app.ts`) | abstraction | FR-058's check, reusing `expectedFields` and the no-script part's field sequence | Folding it into `no-script`: that part runs with scripting off, where the CV app doesn't exist | N/A |
| Shell test helper (`packages/web/test/helpers/shell.ts`) | abstraction (tests only) | Opens the built root at a size, waits for `data-ready`, and gives drag, touch and key helpers to the shell tests | Repeating the waits and pointer sequences in each of twenty test files | N/A |
| Core test helpers (`packages/os-core/test/helpers.ts`) | abstraction (tests only) | The design's metrics, text and a fixture app as plain values, and `run`, which freezes each state and checks every invariant after each action, for every core test | Each core test file building its own fixtures and checks, so an invariant could go unchecked in one of them | N/A |
| Focus targets (`src/os/focus.ts`) | abstraction | Maps `os-core`'s focus targets to elements by data attributes, so focus moves never depend on markup order; `moveFocus` asks for the focus indicator after a key, as Chrome doesn't count a key pressed with Alt (found in T097) | Each component finding its own element to focus: the selectors and the indicator rule would be repeated in every shell | N/A |
| View renderer (`src/os/View.tsx`) and shell props (`src/os/shell-props.ts`) | abstraction | One place that turns a view ID into an app's content or About, in a window or full screen, and one type for what both shells receive from the `Os` root | Each shell switching on the view itself: two copies of the same lookup | N/A |
| Frame batch (`src/shells/desktop/frame-batch.ts`) | abstraction | One dispatch per animation frame for drags and resizes, the latest move winning (R8) | Dispatching every pointer move: a reducer run and a render per event | N/A |
| Offline test helpers (`packages/web/test/helpers/offline.ts`) | abstraction (tests only) | 004's switchable server and service worker steps, moved out of 004's offline test so the shell's offline test uses the same ones (T098) | Copying them into the shell's test: two servers to keep in step | N/A |
| Root test helpers (`tools/site-check/test/helpers/root.ts`) | abstraction (tests only) | The real build laid out as a repository for `runCheck`, and a copy of the repository with one change, built, for the check's tests on the root (tasks.md Notes) | Each of the check's root tests copying the build or the repository itself: five copies of the same steps | N/A |

No agent skill is added. `frontend-design` and `web-design-guidelines` (docs/skill-options.md)
were considered again. The design is approved, and its review is done by the checks of this plan.

## Project Structure

### Documentation (this feature)

```text
specs/005-os-shell/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── design/
│   ├── wireframes.md    # Every state of both shells, the no-script page, design values, keyboard, site text
│   ├── mockup/          # Interim local mockup: HTML, CSS, proposed tokens, 18 PNG exports
│   └── review.md        # Owner sign-off, Graphite, commit 4d2e29f, 2026-10-26
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R19
├── data-model.md        # Phase 1: metrics, app declarations, OS state and actions, shortcuts, output, check results
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── shell.md         # The root page: document, structure, names, keyboard, focus, title, history, data-req
│   ├── os-core.md       # @cv/os-core's exports and guarantees
│   ├── site.md          # Build and output changes from 004
│   └── cli.md           # Site check changes from 004
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
package.json             # workspaces already packages/*; no new dependency
tsconfig.json            # unchanged: packages/**/*.ts(x) already included

specs/004-cv-page/
├── spec.md              # FR-018 and FR-038 marked removed, FR-059 added (R15)
└── contracts/site.md    # a note on the root, pointing to 005

packages/
├── content/             # unchanged; read by the shell
├── tokens/
│   ├── penpot/tokens.json           # + the design's 85 tokens, size.desktop-min-height renamed (R7)
│   └── src/tokens.generated.{css,ts} # regenerated
├── os-core/                         # @cv/os-core (new)
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                 # exports of contracts/os-core.md
│   │   ├── types.ts                 # ShellName, ViewId, Geometry, Metrics, AppDeclaration, …
│   │   ├── state.ts                 # initialState, invariants
│   │   ├── reducer.ts               # osReducer
│   │   ├── geometry.ts              # placeWindow, clampMove, clampResize, fitToArea
│   │   ├── shortcuts.ts             # SHORTCUTS, matchShortcut, shortcutLabel
│   │   └── shell.ts                 # shellQuery, appsFor
│   └── test/
│       ├── helpers.ts               # METRICS, TEXT, APPS fixtures, run, assertInvariants
│       ├── reducer.test.ts  geometry.test.ts  shortcuts.test.ts
│       ├── shell.test.ts  apps.test.ts  invariants.test.ts
│       └── __fixtures__/reserved-shortcuts.json   # browser and screen reader combinations (R9)
└── web/
    ├── vite.config.ts               # + entry os; Lightning CSS visitor; one chunk
    ├── scripts/
    │   ├── build-site.ts            # + renderShell for '/', output checks (contracts/site.md)
    │   └── container-breakpoints.ts # the Lightning CSS visitor (R5)
    ├── src/
    │   ├── render.tsx               # + renderShell
    │   ├── routes.ts                # + '/' page, redirect removed
    │   ├── site-text.ts             # + os, desktop, mobile, about, noScript, fill()
    │   ├── format/meta.ts           # + siteName, shellTitle
    │   ├── pages/
    │   │   ├── CvPage.tsx           # now <CvDocument as="main"> + footer
    │   │   └── ShellPage.tsx        # the root document: picker, no-script page, #os
    │   ├── cv/CvDocument.tsx        # the CV body, shared (R5)
    │   ├── client/os.tsx            # hydrateRoot
    │   ├── os/
    │   │   ├── Os.tsx               # the root: reducer, shell, effects, title, history
    │   │   ├── metrics.ts           # Metrics from tokens (R7)
    │   │   ├── motion.ts            # animateIn, animateOut (R13)
    │   │   ├── About.tsx            # About this site
    │   │   ├── Announcer.tsx        # the status region
    │   │   ├── NoScript.tsx         # the no-script page
    │   │   ├── icons/               # SiteMark, control glyphs, Home chevron (svg)
    │   │   └── shell.css            # styles both shells share
    │   ├── shells/
    │   │   ├── desktop/             # Desktop (+ the shortcut listener), MenuBar, Menu, Window, TitleBar, ResizeHandles, Pad, Dock, desktop.css
    │   │   └── mobile/              # Mobile, HomeScreen, FullScreenView, mobile.css
    │   ├── apps/
    │   │   ├── index.ts             # APPS, in dock order
    │   │   └── cv/                  # app.tsx (declaration), CvApp.tsx, CvIcon.tsx
    │   └── styles/
    │       ├── base.css             # shared base, split from global.css (R6)
    │       ├── global.css           # /cv and the not-found page
    │       ├── cv.css               # scoped to the CV root, @container (R5)
    │       └── os.css               # the root page's sheet
    └── test/
        ├── helpers/shell.ts         # open the root, wait for data-ready, drag, touch, keys
        ├── routes.test.ts           # 004: FR-018 test replaced; root answers 200
        ├── offline.test.ts          # 004: FR-038 tests renamed FR-059
        └── shell/
            ├── first-load.test.ts  shell-choice.test.ts  apps.test.tsx  cv-app.test.ts
            ├── dock.test.ts  menus.test.ts  windows.test.ts  keyboard.test.ts  targets.test.ts
            ├── mobile.test.ts  about.test.tsx  screen-reader.test.ts  site-text.test.ts
            ├── design.test.ts  motion.test.ts  modes.test.ts  accessibility.test.ts
            ├── no-script.test.ts  history.test.ts  amendment.test.ts  offline.test.ts
            └── requests.test.ts  data-req.test.tsx

tools/site-check/
├── src/
│   ├── check.ts             # root runs per shell and state; variant naming (contracts/cli.md)
│   ├── shell-states.ts      # the state driver (R17)
│   ├── report.ts            # + part cv-app
│   └── parts/
│       ├── cv-app.ts        # new
│       ├── keyboard.ts      # + the FR-057 flows
│       ├── no-script.ts     # + the root's no-script page
│       ├── offline.ts       # root expects the shell, not a redirect
│       └── modes.ts         # + shell motion and forced colors rules
└── test/
    ├── shell-states.test.ts  cv-app.test.ts  shell.test.ts   # new
    └── cli.test.ts  offline.test.ts  no-script.test.ts  other-sites.test.ts  performance.test.ts   # extended
```

**Structure Decision**:

- `os-core` is created here, at `packages/os-core`, as the constitution's shared package. It holds
  behavior only. Rendering stays in `@cv/web`.
- The shells live in `packages/web/src/shells/desktop/` and `packages/web/src/shells/mobile/`, and
  apps in `packages/web/src/apps/`. These are the "desktop shell path", "mobile shell path" and
  "apps path" the plan template asks for. What both shells render in common is in
  `packages/web/src/os/`.
- The token output path stays `packages/tokens/src/` (003). `/cv` stays
  `packages/web/src/pages/CvPage.tsx`, rendered to `cv.html` (004).
- The root page is `packages/web/src/pages/ShellPage.tsx`, rendered to `index.html`.

Conventions set here for later features (Terminal, Contact, Settings, the requirement inspector):

- **A new app** is a folder in `src/apps/<app>/` with an `app.tsx` declaring its shells and network
  need, added to `src/apps/index.ts`. Both shells, the dock, the home screen and the site check's
  states pick it up with no other change.
- **Window rules** change in `@cv/os-core`'s reducer and geometry, with tests there first.
- **Every script the shell runs** is in the one `os` bundle. A later feature that needs code
  splitting must first solve FR-053 for chunks an old version left behind.
- **Shell text** goes in `site-text.ts`. **Design values for scripts** go through `metrics.ts`.

## Complexity Tracking

None. Every Constitution Check row is Pass, and no exception is needed. Shipping React to the
browser on the root page is a use of an existing dependency, justified above (Constitution X). The
interim local mockup and the hand-written token export are allowed by Constitution 1.2.0's
interim provision, not by an exception here. The provision's ending steps for this feature are in
research.md (R19).
