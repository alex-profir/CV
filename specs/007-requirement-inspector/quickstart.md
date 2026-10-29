# Quickstart: Validating the Requirement Inspector

How to prove the inspector works, end to end. Each scenario names the stories and requirements it
covers. The contracts hold the details: [inspector.md](./contracts/inspector.md) for the page,
[requirement-data.md](./contracts/requirement-data.md) for the data, [cli.md](./contracts/cli.md)
for the site check.

## Prerequisites

- Node.js 26 (`.nvmrc`), Git, and the repository cloned with its history (a shallow clone works).
- `npm ci`. Playwright's Chromium comes with the dev dependencies.
- 006 (the Terminal) merged into `main`, and `main` merged into this branch (research R1).

## 1. The automated checks (every pull request)

```bash
npm run typecheck
```

```bash
npm test
```

```bash
npm run traceability
```

```bash
npm run token-check
```

```bash
npm run content-check
```

```bash
npm run site-check
```

Expected: each exits 0. `npm test` includes the os-core, requirement data, inspector and 001
tests. The site check's summary lists the `inspector` part with
`/ desktop/cv-specs/1440px, / desktop/terminal-specs/1440px, / desktop/about-specs/1440px`, the
same at `375px`, and `/ desktop/elements/1440px`, `/ mobile/elements/375px`, all `pass`
(US7, FR-030 to FR-034). Run the same commands with uncommitted changes in the working copy: the
result is the same (FR-034).

## 2. See the specs behind an app (US1, FR-001 to FR-006)

```bash
npm run build
```

```bash
npm run serve
```

Open the address it prints at 1440 × 900.

1. The CV window shows the CV, with `Show specs` at the right of its title bar, and nothing else
   new (FR-005).
2. Scroll the CV halfway. Click `Show specs`. The window keeps its place and size; its title
   reads `CV · Specs`, the tab's title `CV · Specs – …`. The view lists 004's and 005's groups,
   each with its status and, where it doesn't list them all, how many requirements it leaves out,
   with `Open the spec` (FR-002, FR-006).
3. Click `Back to CV`. The CV is at the same scroll position (FR-003).
4. Open the Terminal from the dock, run `help`, type `hel` without Enter. Show its specs, then go
   back: the output, the history (Up arrow) and `hel` are as they were. The CV window behind kept
   showing the CV the whole time (FR-003, FR-004).
5. Show the CV's specs again. Minimize, restore, maximize, move and resize the window: it keeps
   showing specs. Close it and open it from the dock: it shows the CV (FR-004).
6. Narrow the browser below 1024 px: the phone shell shows the CV app's spec view still, with
   `SPECS` under `CV` in the header (FR-004). At 375 px, tap Home, then the CV icon: still the
   specs; tap `Back to CV`.
7. Reload: every app opens showing the app (FR-004).

## 3. Follow a requirement to its spec and tests (US2, FR-007 to FR-010)

In the CV's spec view, pick a requirement.

1. `In the spec, line [n]` opens the spec on GitHub at that line, at the commit the build line
   names; the text there is the text shown (FR-010).
2. Each test link opens the test at its line, at the same commit. The list matches what
   `npm run traceability` counts for that requirement: no skipped test (FR-008).
3. A reference such as `005 FR-013` in a requirement's text is a link to that requirement's line
   (FR-007).
4. Locally, set 007's spec to `**Status**: Draft` and add a requirement `FR-035` with no test,
   carried by `button.show-specs`. Build and reload: in About this site's view, 007's group shows
   `DRAFT`, and `FR-035` says `No test covers this yet.` Undo both (US2 scenario 4). The
   requirement data tests cover the same case with a fixture on every pull request.
5. Change a word in a requirement listed in a view, and save. `npm run build`, reload: the new
   text shows, and the view says the build includes uncommitted changes, naming the commit the
   links lead to. Undo the change and rebuild: the note is gone (US2 scenario 5, FR-010, FR-013).

## 4. The shell's specs (US3, FR-011, FR-012)

From the site menu, open About this site and click its `Show specs`. The heading reads
`Specs for the shell`; the list holds 005's menu bar, dock, window frame and home screen
requirements and 007's own control requirements, and none of 004's. `Back to About this site`
returns.

## 5. First load and speed (FR-015, SC-005, SC-006)

With the browser's network panel open, load the root: `requirements-<hash>.json` is requested
only after the shell is ready (`#os` has `data-ready`), never before. With 4× CPU slowdown in the
browser's performance panel, `Show specs` on About this site paints the view within 300 ms
(**Verify**, research R10). `npm run site-check`'s `lighthouse` part scores 90 or more for `/` and
`/cv` on both profiles.

## 6. Keyboard and screen readers (US4, FR-016 to FR-019) — manual, may be deferred

1. At 1440 px, Tab into the CV window to `Show specs`, press Enter: focus is on `Specs for CV`.
   Tab through `Back to CV`, `What's this?`, the commit link, then each spec's and requirement's
   links, with a visible indicator each time. Enter on `Back to CV`: focus is on `Show specs`.
2. From the CV menu in the menu bar, choose `Show specs`, then `Back to CV`: the same.
3. With VoiceOver on macOS, and NVDA on Windows: the view is announced as `Specs for CV`; moving
   by heading reaches each spec as `004 The /cv Page, Approved`; requirements read as a list,
   each starting with its full ID; tests as a list.
4. On an iPhone with VoiceOver, and an Android phone with TalkBack: open the CV app, swipe to
   `Show specs for CV`, double-tap, and read the view by headings and links; go back.

Record results in tasks.md. Under the interim provision on deferred manual checks, these may wait
for the final testing phase (research R17).

## 7. Reduced motion, forced colors, zoom (US5, FR-020 to FR-024) — partly manual

1. With reduced motion set in the system, show and leave a spec view: the content swaps with no
   fade. Without it, a 150 ms cross-fade, with nothing moving or scaling.
2. In Edge with Windows' contrast themes: every heading, chip (solid or dashed outline), link
   (underlined), note and control is visible.
3. At 200% browser zoom, the phone shell's spec view reads without horizontal scrolling. In
   Firefox's text-only zoom at 200%, the CV window's spec view wraps with no clipping.

The automated `accessibility`, `layout` and `modes` parts cover these on every pull request;
the hand checks in Edge and Firefox may be deferred (research R17).

## 8. Offline (US6, FR-026 to FR-028)

1. Load the root once online and wait a few seconds (the service worker stores the site).
2. In the browser's network panel, go offline. Reload. Show the specs of the CV app, the Terminal
   and About this site: each shows as online, with the note
   `You're offline. Everything here is saved on this device, but the links to GitHub need a
   connection.` (FR-026, FR-027).
3. Go back online: the note goes away.
4. With the network panel recording, show every spec view online: no request leaves the site
   (FR-028).

## 9. The plain CV page (FR-025)

Open `/cv`: no `Show specs`, no spec view. Its page source holds no `data-requirements` and loads
only the service worker's registration script.
