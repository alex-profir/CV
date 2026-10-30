# Implementation Plan: The Requirement Inspector

**Branch**: `007-requirement-inspector` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-requirement-inspector/spec.md`

**Design**: [design/review.md](./design/review.md): the Penpot page **007 Requirement inspector —
Graphite**, exports of commit `3ab4dfc`, approved 2026-10-28, with its
[Penpot link](https://design.penpot.app/#/workspace?team-id=86d07029-2be7-815f-8008-d2a9447f2808&file-id=eaccfa4c-8a01-81ad-8008-d441a46da254&page-id=83c58681-afbf-80ee-8008-dc17f0627e87).

## Summary

Every app, and About this site, gets a "Show specs" control at the top of its window or
full-screen view. It turns that view's content into a spec view: the requirements the app's
elements carry, grouped by spec, each with its text, a link to its line in the spec and the tests
that check it, at the commit the site was built from. "Back to [app]" brings the app back exactly
as it was. About this site's view lists the shell's own requirements. Nothing is in front of the
CV, `/cv` doesn't change, and every view works offline.

Technical approach (details in [research.md](./research.md)):

- **Built on 006.** Code starts once the Terminal has merged; this branch merges `main` first. It
  reuses 006's app fields, its session store and its spec list reader (R1).
- **State in `os-core`.** Which views show their specs, and the app's scroll position to restore,
  is one new field and two actions in the shared reducer, so it survives minimizing, mobile Home
  and shell switches, and is gone on close and reload (R2).
- **Swap, don't hide.** The spec view replaces the app's content in the same scroller. The CV's
  scroll position is saved and restored; the Terminal's state is in its session store, which
  already survives unmounting (R3).
- **The shell renders the inspector.** "Show specs", the menu item and the titles are shell code,
  so no app declaration changes and About this site works the same way (R4).
- **Requirement data, built.** At build time the site reads, with 001's own modules, every spec,
  every requirement's text, every counting test with its name and line, and, from the import graph
  of the site's source, which `data-req` each app's content and the shell carry. Git gives the
  commit and whether the copy has uncommitted changes (R5 to R8).
- **Fetched after the shell is ready.** The data is a hashed JSON file the service worker stores
  with everything else. The page fetches it once the shell is ready, so the first load doesn't
  wait for it, and a version activated mid-visit can't take it away (R9).
- **No markup from specs.** A requirement's text is parsed at build time into a small inline tree
  (code, emphasis, links, requirement references) and rendered as React text (R7).
- **A cross-fade** of the one view's content, its old content a still, inert copy fading out over
  the new, and none with reduced motion (R11). Revised 2026-10-30: it was a view transition, which
  Safari and Firefox draw without the glass blur and the scroll bar.
- **Checks.** A new site check part, `inspector`, compares every view with the repository, sweeps
  every `data-req` in every driven state, and proves Back restores the app. The accessibility,
  keyboard, offline, other-sites, layout, modes and fonts parts cover the new states (R15).

## Technical Context

**Language/Version**: TypeScript with erasable syntax and TSX, run by Node.js 26, as 001 to 006.
CSS compiled by Lightning CSS. Browser code bundled by Vite (Rolldown) into 005's one `os` script.

**Primary Dependencies**: no new package. Used as 005 and 006 use them: `react` and `react-dom`
19.3.1, `vite` 8.3.5, `lightningcss` 1.33.0, `oxc-parser` 0.155.0 (001's, now also read at build
time), `playwright` 1.64.1, `axe-core` 4.14.0, `lighthouse` 13.5.0. Git, already needed to work
on the repository, is now read by the build (R8). Reused: 001's spec, test and UI readers; 002's
`siteData.repository`; 003's tokens and container visitor; 004's service worker, test helpers and
site check; 005's `os-core`, shells, focus, motion tokens and state driver; 006's app fields,
session store and `readSpecList`.

**Storage**: none on a server. In the browser, which views show their specs lives in the OS state
for the visit (FR-004); the requirement data is held in memory once fetched. Offline, 004's single
cache `cv-<version>` holds the data file with the rest of the site.

**Testing**:

- Vitest unit tests in Node: `@cv/os-core` (the new actions and invariant), the requirement data
  reader on fixture repositories and on the real one (`packages/web/test/requirement-data/`), the
  link forms, and 001's new exports.
- Vitest browser tests in Chromium through Playwright on the real build
  (`packages/web/test/inspector/`), with 005's shell helper, 006's Terminal helper and a new
  inspector helper.
- `npm run site-check` on the real build: the `inspector` part and the extended parts (R15).
- `tsc --noEmit`, `npm run traceability`, `npm run token-check`, `npm run content-check`.
- By hand: screen readers on desktop and phone, forced colors in Edge, text-only zoom in Firefox,
  the look against the exports (quickstart 6, 7). They may wait for the final testing phase under
  the interim provision on deferred manual checks (R17).

**Target Platform**: as 005: the current and previous major versions of Chrome, Edge, Firefox and
Safari, on desktop and phone. The cross-fade needs only `element.animate`, which all of them have
(R11, revised 2026-10-30). Build and checks on Node.js 26, macOS and Linux (GitHub
Actions `ubuntu-latest`).

**Project Type**: a static web site. A feature of the existing shell page, a build-time data
reader, one new data file, one new site check part.

**Shells**: Both, as the spec's Shell Scope sets. Desktop: "Show specs" in every window's title bar
and app menu, the spec view in the same window. Mobile: "Specs" in every full-screen view's header,
the spec view in the same view.

**Offline Approach**: the inspector's code is in the precached `os` script, and its data file is a
built file, so 004's service worker stores it after one visit to `/` or `/cv` and answers it
offline. The view shows as online, with a note that its links need a connection, from
`navigator.onLine` (FR-026, FR-027, R9, R12).

**Performance Goals**:

- A spec view within 300 ms of "Show specs", and the app back within 100 ms, with 4× CPU
  throttling (SC-005). **Verify** for the shell's view, the largest; R10 gives the fallback.
- The first load as fast as without the feature: the data is fetched after the shell is ready,
  and the `os` script grows by about 6 KB compressed (FR-015, R9, R16).
- Lighthouse 90+ in every category for `/` and `/cv` on both profiles (SC-006).

**Constraints**:

- Static files only; one `os` script with no lazy chunks (005 R14).
- No request to any other site; only following a link leaves the site (FR-028).
- Nothing typed by hand in the data; nothing in it the repository doesn't make public (FR-013,
  FR-014).
- No markup parsed from a spec (R7). No CV fact or design value in code, with no exception added
  to the content or token check (FR-009, FR-021).
- Nothing in front of the CV: only the control is added to first load (FR-005, Constitution VII).

**Scale/Scope**: 34 requirements; 2 shells; 3 views with a spec view today (CV, Terminal, About
this site), about 140 requirements in the largest; 1 new data file of about 20 KB compressed; 8
tokens; 12 new check states; 1 new site check part and 7 parts extended.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check passed before research (the gate script `tools/speckit-auto/gates.sh` reports
the spec approved and the design signed off), and the re-check after design passed too. The table
shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved` (commit `fd07aa7`). React, `os-core`, the import graph, Git, the View Transitions API, the data file and every path appear only in this plan, research.md and the contracts. The spec needs no amendment: R1 to R17 implement it as written |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | `design/wireframes.md` covers every state the spec's Design section lists, in both shells. `design/exports/` holds 14 Penpot PNGs at 1440, 375, 320 and 812 px. The Penpot link is in spec.md, README.md and review.md. `review.md` is `Approved`, signed by the owner for commit `3ab4dfc` on 2026-10-28. R13's two token renames change the design README's names, not the design, and are committed as `docs:` before code |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 34 FRs have planned tests below, with UI targets as [contracts/inspector.md](./contracts/inspector.md#data-req-targets) sets. `data-req` is written literally in TSX, so 001 reads it, and the inspector itself reads it the same way (R5). The inspector makes traceability visible in the site, which is this principle's rationale |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | The inspector shows no CV fact: its site text is checked by 005's site-text test (FR-009). The repository address comes from `siteData` (002). Requirement data is read from the specs and tests, never typed (FR-013). Styles use `var(--token-…)`, motion `motion.duration.fast` and `motion.easing.standard`. The 8 tokens go into the export under the interim provision on local mockups, which allows a hand-written export even with a Penpot design (R13) |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | Which views show specs, and the focus moves, are in `@cv/os-core`'s reducer (R2). The control, the spec view and the data are shared; only where the control sits is per shell, in `TitleBar.tsx` and `FullScreenView.tsx`. No app declaration changes. Matches the Shell Scope: both shells, every app and About this site |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | The code is in the precached script, the data a precached file (R9). Every view shows offline as online, with the note (FR-026, FR-027). Proven by the `offline` part in both shells on every pull request (FR-033) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | First load is unchanged but for the control in the title bar, which covers nothing; no hint, badge or tooltip appears (FR-005). The data isn't fetched until the shell is ready (FR-015). `/cv` is untouched (FR-025) |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | axe in every FR-024 state of both shells, the keyboard flow of FR-032, forced colors, reduced motion, zoom and text spacing run on every pull request (R15). Focus moves to the view's heading and back to the control (R14). With reduced motion, no fade (R11). Lighthouse 90+ on `/` and `/cv` stays a merge check, with the render time marked **Verify** (R10, R16). Screen readers by hand (quickstart 6), possibly in the final testing phase (R17) |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The sheet, question, offline and commit glyphs, the chips and the layout are the design's own, as committed SVG components and CSS. Fonts are the site's OFL families. The owner's review records the look as original (design/review.md, FR-021) |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | No new package and no agent skill. The Web Animations API is a browser standard. Each abstraction is listed below with the simpler alternative it rejected |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One pull request from `007-requirement-inspector`, after 006's has merged, holding the design README's `docs:` rename, 001's additive exports, the `os-core` change, the tokens, the inspector, the build changes and the check changes. It links spec.md and tasks.md |

## Requirement Traceability

Constitution III. Paths are relative to `packages/os-core/test/` (marked **core**),
`packages/web/test/requirement-data/` (marked **data**, Node), `packages/web/test/inspector/`
(marked **insp**, the real build in Chromium), `packages/web/test/` (marked **web**),
`tools/traceability/test/` (marked **trace**) and `tools/site-check/test/` (marked **check**).
Each test or group title carries the `007-requirement-inspector-FR-###` IDs it covers. "Both
shells" means at 1440 × 900 and at 375 × 812 with touch. UI targets follow
[contracts/inspector.md](./contracts/inspector.md#data-req-targets).

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 007-requirement-inspector-FR-001 | insp `controls.test.ts`: the CV window, the Terminal and About this site each have `button.show-specs` named `Show specs for X`, at the title bar's right end, visible, its box outside `.window-content`; at 375 the header's is labelled `Specs` and named the same; the CV, Terminal and About menus hold `Show specs` after the app's own commands (About: first) | `button.show-specs`, menu item |
| 007-requirement-inspector-FR-002 | core `reducer.test.ts`: `showSpecs` keeps every window's geometry and order, the view in front. insp `spec-view.test.ts`: the window's box and controls are equal before and after; the title reads `CV · Specs`, the header `CV` with `Specs`, `document.title` `CV · Specs – [name]`; a screenshot with the window masked is identical before and after, in both shells | `.window-title`, `.app-title`, `section.spec-view` |
| 007-requirement-inspector-FR-003 | core `reducer.test.ts`: `showApp` removes the entry and focuses `show-specs`. insp `back.test.ts`: the CV scrolled to 1,200 px is at 1,200 px after Back, in both shells; the Terminal after `help`, `ls`, Up, a draft `hel` and an open vim view with a fold toggled is the same after Back; the menu reads `Back to CV` while the specs show, and choosing it goes back | `button.spec-back`, menu item |
| 007-requirement-inspector-FR-004 | core `reducer.test.ts`: one view's `showSpecs` leaves another's state equal; `close` removes the entry, so `open` shows the app; `minimize`, `toggleMaximize`, drags, `mobileHome`, `mobileOpen`, `shellChanged` both ways keep it; `initialState` has none. core `invariants.test.ts`: random runs with the new actions. insp `state.test.ts`: move, resize, minimize, restore, maximize, a 1440 → 375 → 1440 resize, mobile Home and reopen, and `open cv` from the Terminal keep the spec view; close and reopen, and a reload, show the app; storage and cookies stay empty | Non-UI |
| 007-requirement-inspector-FR-005 | insp `first-load.test.ts`: at 1440 the CV window shows the CV and, of the inspector, only `button.show-specs`; no element of the inspector appears within 10 s; hovering and focusing the control adds no element and it has no `title`; at 375 the home screen is as 005's; 005's first-load tests pass unchanged | `button.show-specs` |
| 007-requirement-inspector-FR-006 | data `carried.test.ts`: on a fixture site with two apps, a module both import, a shell module, a type-only import, a re-export and a computed `data-req`, each view's set is exact; the walker's modules from `client/os.tsx` equal Rolldown's module list for the `os` chunk on the real source. insp `spec-view.test.ts`: each view lists exactly `views[view]`, grouped in number order, IDs ascending, each once; each group shows number, title, status, and `[n] more …` equal to `active − listed`, absent when all are listed (fixture); check `inspector` | `section.spec-view`, `section.spec-group` |
| 007-requirement-inspector-FR-007 | data `inline.test.ts`: code, strong, em, struck text, `http(s)` and relative links, `NNN FR-###`, bare `FR-###` and the `to`/`and` run rule, unknown references and other schemes as text, on a fixture holding every form in today's specs. insp `requirement.test.ts`: each item shows `FR-###`, starts with the full ID for assistive technology, shows the text with `code` and links, `In the spec, line [n]`, and its tests by name with path and line | `li.requirement` |
| 007-requirement-inspector-FR-008 | trace `test-files.test.ts`: `title`, `location` and `coveringTests` on skipped, `todo`, `skipIf(true)`, unrecognized and group-inherited tests. data `read.test.ts`: on a fixture repository, a requirement's tests are exactly the counting ones; on the real repository, the approved requirements with a test are exactly those `runCheck` doesn't report uncovered, and their number equals its covered count. insp `requirement.test.ts`: a fixture draft requirement with no test shows `Tests` and `No test covers this yet.` and no list | `li.requirement` |
| 007-requirement-inspector-FR-009 | insp `whats-this.test.ts`: the button toggles `aria-expanded` and the panel, which pushes the heading down and covers nothing; its text equals the site text and is the same in every view; its link is `siteData.repository`; it closes on Back. web `site-text.test.ts` (005's): every `inspector` string is English and holds no key CV fact | `button.whats-this`, `section.whats-this-panel` |
| 007-requirement-inspector-FR-010 | data `version.test.ts`: in a Git copy, a clean tree gives `HEAD` and `dirty: false`; a changed, a staged and an untracked file each give `dirty: true`; an ignored file doesn't; no repository fails with the message. web `repository.test.ts`: each link form, `?plain=1` on Markdown, a trailing slash. insp `links.test.ts`: every spec, group, test and commit link names the data's commit, file and line; the uncommitted note shows in a dirty copy's build, naming the short commit, and not in a clean one; check `inspector` | `a.spec-line`, `a.open-spec`, `a.test-name`, `a.build-commit`, `p.note-uncommitted` |
| 007-requirement-inspector-FR-011 | data `carried.test.ts`: on the real source, the shell's set holds 005's menu bar, dock, window frame, home screen and About requirements and 007's control requirements, and none of 004's. insp `about.test.ts`: About has `Show specs for About this site` and `Back to About this site`; its view, headed `Specs for the shell`, lists exactly `views.shell`, in both shells | About's `button.show-specs`, `section.spec-view` |
| 007-requirement-inspector-FR-012 | data `carried.test.ts`: every `data-req` in every module reached from the shell's roots is in at least one view; no `data-req` exists outside `packages/web/src`. check `inspector` (`elements` variant): every `data-req` in the page, in every driven state, is in its app's view or the shell's | `section.spec-view` |
| 007-requirement-inspector-FR-013 | data `read.test.ts`: in a fixture repository, changing a requirement's text, adding a test, removing a requirement and adding a `data-req` each change the data with no other edit; spec numbers, titles and statuses equal `readSpecList`'s. check `inspector.test.ts`: a requirement's text changed in a copy shows after its build (US2 scenario 5) | `p.spec-build` |
| 007-requirement-inspector-FR-014 | data `public.test.ts`: the built file validates against data-model.md's shape with no other key; every path is repository-relative; it holds none of the machine's absolute paths, user name or environment values (searched for each); the same files and commit give byte-identical output | Non-UI |
| 007-requirement-inspector-FR-015 | insp `first-load.test.ts`: the data file is requested only after `#os[data-ready]` is set; neither `index.html` nor the `os` script holds a requirement's text (searched for each listed one); the CV's first-load timings of 005's tests hold | Non-UI |
| 007-requirement-inspector-FR-016 | insp `keyboard.test.ts`: with keys alone, reach `Show specs` by Tab, show with Enter and with Space, reach every link and control of the view in the contract's order, open and close "What's this?", go back, with an indicator of 3:1 or more at each step (004's measurement); Tab leaves the view and the window within the page's element count | `button.show-specs`, the view's controls |
| 007-requirement-inspector-FR-017 | insp `focus.test.ts`: after `Show specs` (control and menu) focus is on `h1.spec-heading`, named `Specs for CV`; after Back, on that view's `button.show-specs`; the same for the Terminal, then Tab reaches the command line; on mobile the same with taps | `h1.spec-heading`, `button.spec-back` |
| 007-requirement-inspector-FR-018 | insp `structure.test.ts`: in the accessibility tree (004's `ax.ts`), a region `CV specs`, one `h1` `Specs for CV`, an `h2` per spec named `004 The /cv Page, Approved`, the panel's `h2`, a list of requirements per spec and a list of tests per requirement; no skipped level in the window or view | `section.spec-view`, `h1.spec-heading` |
| 007-requirement-inspector-FR-019 | insp `mobile.test.ts`: at 375 by touch, tap `Specs`, open "What's this?", follow a link's `href`, tap Back; the same with an external keyboard; every inspector control and link is at least 24 × 24 px; `Specs` fills the header's 52 px height and is at least 44 px wide. Manual: phone screen readers (quickstart 6) | mobile `button.show-specs` |
| 007-requirement-inspector-FR-020 | insp `layout.test.ts`: in a 400 px wide window, at 320 × 568, 812 × 375 and 1440 × 900, and with a fixture requirement holding a 120-character word and a long test path, no horizontal scroll; two columns from 480 px of content, stacked below; the view scrolls inside its window while `.spec-bar` stays at the top | `section.spec-view` |
| 007-requirement-inspector-FR-021 | insp `design.test.ts`: computed colors, fonts and sizes are token values; `Show specs` is 24 px tall, 10 px from the window's right edge; the top bar is 40 px on desktop and 48 px on mobile; padding is 40 px from 700 px of width and 24 px below, 20 px on mobile; reading width 760 px; the glyphs are the committed SVG components. web `self-check.test.ts`: `npm run token-check` passes with no skip marker. Manual: design/review.md | Non-UI |
| 007-requirement-inspector-FR-022 | insp `motion.test.ts`: without reduced motion, no view transition starts; an inert copy of the old content covers the scroller and only fades out while the new content only fades in, each over `motion.duration.fast` with `motion.easing.standard` and changing only opacity; the scroll bar stays; every box outside the view is unchanged; with reduced motion, nothing fades and sampled frames show no change of `transform` or `scale` (revised 2026-10-30) | Non-UI |
| 007-requirement-inspector-FR-023 | insp `modes.test.ts`: with forced colors, headings, links (underlined), the status chips (solid and dashed borders, filled and hollow dots), the notes, `Show specs`, Back and "What's this?" have visible borders or text; no element relies on a background image or color alone | Non-UI |
| 007-requirement-inspector-FR-024 | insp `accessibility.test.ts`: axe (WCAG 2.2 A and AA tags) finds nothing in the spec views of the CV, the Terminal and About, with "What's this?" open, and with the Terminal's view beside the CV, in both shells; at 200% zoom, text-only 200%, 400% on a 1280 px window and with text spacing, no clipping or overlap | `section.spec-view` |
| 007-requirement-inspector-FR-025 | insp `cv-page.test.ts`: `/cv`'s HTML holds no `show-specs`, `spec-view` or `data-requirements`, and loads only the registration script; 004's tests pass unchanged | Non-UI |
| 007-requirement-inspector-FR-026 | insp `offline.test.ts`: after one visit to `/`, and separately to `/cv` only, with the network off at 375 and 1440 px, each view's text equals the online run's, and its text is drawn in a served face | Non-UI |
| 007-requirement-inspector-FR-027 | insp `offline.test.ts`: offline, `p.note-offline` shows the site text; online it is absent; going online and offline with the view open adds and removes it | `p.note-offline` |
| 007-requirement-inspector-FR-028 | insp `requests.test.ts`: loading `/` and showing every spec view in both shells requests only `127.0.0.1`; check `other-sites` | Non-UI |
| 007-requirement-inspector-FR-029 | insp `data-req.test.tsx`: every target in contracts/inspector.md carries its IDs in the rendered page. web `self-check.test.ts`: `npm run traceability` passes | Non-UI |
| 007-requirement-inspector-FR-030 | check `inspector.test.ts`: passes on the real build; copies with a requirement left out of a view, a stale text, a test dropped and the Terminal's draft lost on Back each fail with a line naming the part, view, shell, width and requirement (US7 scenarios 1, 2) | Non-UI |
| 007-requirement-inspector-FR-031 | check `shell-states.test.ts`: the summary lists `/` under `accessibility` in every inspector state at both widths, and `other-sites` records every spec view in both shells | Non-UI |
| 007-requirement-inspector-FR-032 | check `keyboard.test.ts`: the inspector flow passes on the real build; a copy where Back leaves focus on `body` fails, naming the step | Non-UI |
| 007-requirement-inspector-FR-033 | check `offline.test.ts`: the spec views pass offline at both widths; a copy whose data file isn't precached fails, naming the view, shell and width | Non-UI |
| 007-requirement-inspector-FR-034 | check `cli.test.ts`: the local command and the CI step are the same; every inspector problem line names the view, shell and width, and the requirement where there is one; two runs give the same result; with an untracked file in a copy, the result is the same as without; the whole check stays within 006's budget plus 3 minutes off CI | Non-UI |

Success criteria without an FR of their own:

- SC-001, SC-002: insp `controls.test.ts` counts the actions: "Show specs", then a test link
  (2), and Back (1 more).
- SC-003, SC-004: FR-006, FR-008, FR-012 and the `inspector` part.
- SC-005: insp `performance.test.ts`: with 4× CPU throttling over CDP, the shell's view paints
  within 300 ms of the click and the app is back within 100 ms (**Verify**, R10).
- SC-006: the `lighthouse` part on `/` and `/cv` on both profiles, and 005's first-load tests.
- SC-007: FR-024 above, and by hand, quickstart 6.
- SC-008 to SC-011: FR-026, FR-028, FR-022 and FR-003 above.
- SC-012: FR-029, the self-checks of FR-021 and FR-009, and FR-034.

## Dependencies, Skills & Abstractions

No new package and no agent skill. Git and the Web Animations API are a tool and a browser
standard already present.

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `OsState.specs`, `showSpecs`, `showApp`, two focus targets (`@cv/os-core`) | abstraction | Which views show their specs, kept through minimize, mobile Home and shell switches, cleared on close, with the focus moves of FR-017 (R2) | Component state: lost on mobile Home and shell switches. A store per app: every app repeats it, and About isn't an app | N/A |
| 001's additive exports: `specTitle`, `requirementText`, `TestNode.title`, `TestNode.location`, `coveringTests` | abstraction (change) | The spec view reads specs and tests exactly as the check counts them (FR-008, FR-013, R6) | A second parser in the site: it would drift from the check | N/A |
| Requirement data reader (`packages/web/scripts/requirements/`: `read.ts`, `version.ts`, `index.ts`) | abstraction (build) | Builds the data from the repository at build time, used by the build and the site check (R6, R8) | A committed generated file: drifts between regenerations, against FR-013 | N/A |
| Carried-requirements walker (`scripts/requirements/carried.ts`) | abstraction (build) | Which `data-req` each app's content and the shell carry, including elements not shown yet (R5) | DOM reading: misses unshown elements. Folder convention: misattributes icons and titles. Rolldown's graph: known too late to name the data file | N/A |
| Inline parser and renderer (`scripts/requirements/inline.ts`, `src/inspector/InlineText.tsx`) | abstraction | Code, links and requirement references shown as such, with no markup parsed from a spec (R7) | A Markdown package: HTML to sanitize and no references. Raw text: shows Markdown marks, against FR-007 | N/A |
| Data file and loader (`assets/requirements-<hash>.json`, `src/inspector/data.ts`) | abstraction | The data reaches the browser without delaying the shell and survives a mid-visit update (R9) | In the `os` script or the HTML: delays hydration (FR-015). Fetched on first use: can vanish after an update (005 FR-053) | N/A |
| Spec view components (`src/inspector/`) | abstraction | One view for every app and About, in both shells (R4, R14) | Per-app views: three copies of the same structure | N/A |
| View model (`src/inspector/derive.ts`) | abstraction | Groups, order and counts in one pure function the view and the site check share (FR-006) | Grouping in the component: the check would have to repeat it | N/A |
| Cross-fade (`src/inspector/transition.ts`) | abstraction | The design's cross-fade, scoped to one view, none with reduced motion (R11) | A fade-in only: not the approved look. Keeping both mounted: two Terminals on one session. A view transition (until 2026-10-30): Safari and Firefox lose the blur and the scroll bar while it runs | N/A |
| Link forms (`src/format/repository.ts`) | abstraction | Every repository link built in one place, with GitHub's `?plain=1` for Markdown lines (R8) | Links written in each component: four copies of the same pattern | N/A |
| Git copy in `repoCopy` (`packages/web/test/helpers/copy.ts`) | abstraction (tests only) | Copies built in tests need a commit, and some need uncommitted changes (R8) | An environment override for the commit: local builds would differ from CI, against FR-034 | N/A |
| Inspector test helper (`packages/web/test/helpers/inspector.ts`) | abstraction (tests only) | Shows and leaves a view in a shell, reads its groups and requirements, for every inspector browser test | Repeating those steps in about twenty test files | N/A |
| Site check part `inspector` (`tools/site-check/src/parts/inspector.ts`) | abstraction | FR-030's check, reusing the data reader, 001's modules and the state driver (R15) | Folding it into `cv-app` or `terminal`: it covers every view and the shell | N/A |

## Project Structure

### Documentation (this feature)

```text
specs/007-requirement-inspector/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── design/
│   ├── README.md        # Notes, sample data, proposed tokens (two renamed per research R13, docs: commit)
│   ├── wireframes.md    # Every state of both shells, design values, keyboard, screen readers, site text
│   ├── exports/         # 14 Penpot PNG exports
│   └── review.md        # Owner sign-off, commit 3ab4dfc, 2026-10-28
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R17
├── data-model.md        # Phase 1: requirement data, inline text, OS state, loader, view model, site text, check results
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── inspector.md         # The interface: controls, menu, titles, spec view, focus, data-req
│   ├── requirement-data.md  # The reader, 001's additions, the build step, the loader, links
│   ├── shell.md             # Changes to os-core and the shell
│   ├── site.md              # Build and output changes
│   └── cli.md               # Site check changes
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
tools/traceability/
├── src/specs.ts                     # + specTitle, requirementText
├── src/test-files.ts                # + TestNode.title, TestNode.location, coveringTests
└── test/specs.test.ts  test-files.test.ts   # extended

packages/
├── tokens/
│   ├── penpot/tokens.json           # + 8 tokens (research R13)
│   └── src/tokens.generated.{css,ts} # regenerated
├── os-core/
│   ├── src/types.ts                 # OsState.specs, showSpecs, showApp, two FocusTargets
│   ├── src/state.ts                 # initialState, invariant
│   ├── src/reducer.ts               # the two actions; close clears
│   └── test/                        # reducer, invariants extended
└── web/
    ├── scripts/
    │   ├── build-site.ts            # + the data file, its path to renderShell
    │   └── requirements/
    │       ├── index.ts             # buildRequirementData
    │       ├── version.ts           # readVersion (Git)
    │       ├── carried.ts           # readCarried (import graph, 001's readUiFile)
    │       ├── inline.ts            # parseInline
    │       └── read.ts              # readRequirementData
    ├── src/
    │   ├── site-text.ts             # + inspector
    │   ├── render.tsx               # renderShell: assets.requirements
    │   ├── pages/ShellPage.tsx      # #os data-requirements
    │   ├── format/repository.ts     # link forms
    │   ├── styles/os.css            # imports inspector.css
    │   ├── os/
    │   │   ├── Os.tsx               # viewTitle, act through crossFade, startLoading
    │   │   ├── View.tsx             # SpecView when the view shows its specs
    │   │   ├── focus.ts             # spec-heading, show-specs
    │   │   └── shell-props.ts       # + viewTitle
    │   ├── shells/
    │   │   ├── desktop/TitleBar.tsx # ShowSpecs, the specs title
    │   │   ├── desktop/Window.tsx   # scroll save and restore
    │   │   ├── desktop/MenuBar.tsx  # Show specs / Back to [view]
    │   │   └── mobile/FullScreenView.tsx # ShowSpecs, Specs under the title, scroll
    │   └── inspector/
    │       ├── ShowSpecs.tsx        # the control
    │       ├── SpecView.tsx         # the view: bar, panel, heading, lede, build line, notes, groups
    │       ├── SpecGroup.tsx  Requirement.tsx  InlineText.tsx  WhatsThis.tsx  Notes.tsx
    │       ├── derive.ts            # the view model
    │       ├── data.ts              # the loader
    │       ├── transition.ts        # crossFade
    │       ├── glyphs/              # sheet, question, offline, commit, no-tests mark (svg)
    │       └── inspector.css
    └── test/
        ├── helpers/copy.ts          # + specs/, tools/*/test, a Git commit, dirty()
        ├── helpers/inspector.ts     # show, leave, read a view
        ├── repository.test.ts       # link forms
        ├── requirement-data/        # carried, inline, read, version, public
        └── inspector/
            ├── controls, spec-view, back, state, first-load, requirement, whats-this, links,
            ├── about, keyboard, focus, structure, mobile, layout, design, motion, modes,
            └── accessibility, cv-page, offline, requests, performance, data-req

tools/site-check/
├── src/
│   ├── shell-states.ts              # + the inspector's states (contracts/cli.md)
│   ├── report.ts                    # + part inspector, problem types
│   ├── check.ts                     # runs the inspector part
│   └── parts/
│       ├── inspector.ts             # new
│       ├── keyboard.ts              # + FR-032's flow
│       ├── offline.ts               # + the spec views offline
│       ├── other-sites.ts           # + every spec view
│       └── layout.ts  modes.ts  fonts.ts  accessibility.ts   # + the inspector's states
└── test/
    ├── inspector.test.ts            # new
    └── shell-states.test.ts  keyboard.test.ts  offline.test.ts  other-sites.test.ts  cli.test.ts   # extended
```

**Structure Decision**: the inspector is shell code, in `packages/web/src/inspector/`, rendered by
the shells and `View.tsx`, because it serves every app and About this site alike (Constitution V:
an app's own behavior stays in its folder; this belongs to none of them). Its state is in
`@cv/os-core`, tests first, as 005 set for window rules. The build-time reader sits beside 006's
`spec-list.ts` in `packages/web/scripts/`, reusing 001's modules, as 006 did. Site text stays in
`site-text.ts`; design values are CSS tokens only. 005's convention holds for later apps: a new
app gets "Show specs" and its spec view with no change of its own, and its requirements show as
soon as its elements carry them.

## Complexity Tracking

None. Every Constitution Check row is Pass, and no exception is needed. The hand-written token
export is allowed by the constitution's interim provision on local mockups, not by an exception
here. The two token renames of R13 keep the design's values and are recorded in the design README
before code, as 005 R7 and 006 R22 did.
