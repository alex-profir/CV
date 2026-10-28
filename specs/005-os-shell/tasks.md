---

description: "Task list for the OS shell"
---

# Tasks: The OS Shell

**Input**: Design documents from `/specs/005-os-shell/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/shell.md](./contracts/shell.md),
[contracts/os-core.md](./contracts/os-core.md), [contracts/site.md](./contracts/site.md),
[contracts/cli.md](./contracts/cli.md), [quickstart.md](./quickstart.md), and the design in
[design/](./design/): [wireframes.md](./design/wireframes.md), the interim local mockup in
[design/mockup/](./design/mockup/README.md) with its 18 PNG exports, and the signed
[review.md](./design/review.md) (Graphite, commit `4d2e29f`, 2026-10-26). The Penpot link isn't
needed under Constitution 1.2.0's interim provision (research R19).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `005-os-shell-FR-###` IDs it covers, and every FR in
spec.md (FR-001 to FR-066, all active) is covered by at least one test task (see Requirement
Coverage at the end).

**Organization**: Tasks are grouped by user story.

- US1 renders the root as the shell: both shells pre-rendered and hydrated, the CV window open on
  desktop, the home screen and the CV app on mobile, the no-script page, the look and the tokens.
- US2 makes desktop windows work by pointer: menus, the Window menu, focus, moving, resizing,
  minimizing, maximizing, the pad, the dock's marks and About this site as a window.
- US3 finishes the mobile shell: Home, scroll memory, Back, About this site full screen, and
  switching shells while the site is open.
- US4 adds keyboard operation and screen reader support: shortcuts, roving focus, keyboard moves
  and resizes, names, focus moves and announcements.
- US5 adds motion with reduced motion, forced colors, zoom and text spacing.
- US6 proves the shell offline and through updates.
- US7 extends the site check to the root in both shells.

The 004 amendment, the tokens, the shared `CvDocument`, the container queries, the root page and
its build, the `Os` root and the shell test helper come first, in Phase 2, because every shell test
opens the real build.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US7)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 005-os-shell-FR-012"

## Not in this feature

Constitution 1.2.0's interim provision ends in a **separate follow-up pull request**, once Penpot
can be reached again (research R19). No task below does any of it:

- rebuilding the Graphite shells in Penpot and replacing the PNGs in `design/mockup/`;
- adding the Penpot link to `design/review.md` or ticking the spec's Design box for it;
- importing the 85 tokens into Penpot and exporting them again.

Also out of scope, as the spec says: Terminal, Contact, Settings and the requirement inspector;
several windows per app, desktop icons, right-click menus, several desktops and an app switcher on
mobile; themes, wallpapers and preferences; installing the site as an app; the PDF download,
publishing and the domain; printing the shell.

## Path Conventions

- CV data, read only through `@cv/content` (Constitution IV): `packages/content/resume.json`,
  `packages/content/site.json` (`repository`)
- Tokens, read only through `@cv/tokens`: `packages/tokens/penpot/tokens.json` (the hand-written
  export) and the generated `packages/tokens/src/tokens.generated.{css,ts}`; `tokenValue`,
  `cssVar`, `mediaQuery` and `durationMs` from `packages/tokens/src/index.ts`
- The shared core (new): `packages/os-core/` with `src/{index,types,state,reducer,geometry,shortcuts,shell}.ts`
  and `test/` (plus `test/helpers.ts` and `test/__fixtures__/reserved-shortcuts.json`)
- The site (`@cv/web`): `packages/web/`, adding:
  - `scripts/container-breakpoints.ts`;
  - `src/pages/ShellPage.tsx`, `src/cv/CvDocument.tsx`, `src/client/os.tsx`;
  - `src/os/` (`Os.tsx`, `metrics.ts`, `motion.ts`, `About.tsx`, `Announcer.tsx`, `NoScript.tsx`,
    `icons/`, `shell.css`);
  - `src/shells/desktop/` (`Desktop.tsx`, `MenuBar.tsx`, `Menu.tsx`, `Window.tsx`, `TitleBar.tsx`,
    `ResizeHandles.tsx`, `Pad.tsx`, `Dock.tsx`, `desktop.css`);
  - `src/shells/mobile/` (`Mobile.tsx`, `HomeScreen.tsx`, `FullScreenView.tsx`, `mobile.css`);
  - `src/apps/index.ts`, `src/apps/cv/` (`app.tsx`, `CvApp.tsx`, `CvIcon.tsx`);
  - `src/styles/base.css`, `src/styles/os.css`;
  - `test/helpers/shell.ts` and `test/shell/*.test.ts(x)`.
- The site check: `tools/site-check/src/` (`check.ts`, `shell-states.ts`, `report.ts`,
  `parts/*.ts`) and `tools/site-check/test/`
- Shared test code from 004: `packages/web/test/helpers/{site,browser,ax,copy,fixtures}.ts`,
  `tools/site-check/test/helpers/sites.ts`, `tools/site-check/src/expected.ts`
  (`expectedFields`), `tools/site-check/src/browser.ts` (`launchChromium`)
- The 004 amendment: `specs/004-cv-page/spec.md`, `specs/004-cv-page/contracts/site.md`,
  `packages/web/test/routes.test.ts`, `packages/web/test/offline.test.ts`

## Rules that apply to every task

- **No design literal and no CV fact in source** (FR-006, FR-043, FR-045, Constitution IV):
  - Everything under `packages/web/` and `packages/os-core/` except `test/` is source for 002's and
    003's checks, with no exception and no skip marker added.
  - Style sheets use only `var(--token-…)`, `@media (--token-…)` and
    `@container (--token-breakpoint-…)`. Inside `@media (forced-colors: active)`, system colors
    such as `Highlight` and `CanvasText` are allowed (003 FR-056).
  - Scripts read design values only through `src/os/metrics.ts` (R7). Window geometry set in
    `style` from state is state, not a design value (R3).
  - Every non-CV word is in `src/site-text.ts`. CV text, including the site name, reaches
    components only as props from `resume` and `siteData`.
- **`@cv/os-core` imports nothing** from React, the DOM, Node, `@cv/content` or `@cv/tokens`
  (contracts/os-core.md). Design values arrive as `Metrics`, text as `context.text`, apps as
  declarations. Its functions don't mutate their arguments, and round to whole pixels.
- **`data-req`** (FR-055): written only as a JSX string attribute,
  `data-req="005-os-shell-FR-…"`, on the elements contracts/shell.md's structure and `data-req`
  targets name, listing every ID it gives, separated by spaces. 004's attributes stay where they
  are.
- **Test titles**: every test or `describe` title carries only full, existing IDs, such as
  `describe('005-os-shell-FR-012: one window per app', …)`. Tests for success criteria without
  an FR use titles such as `describe('… (SC-003)', …)`. No other `fr-` text in any letter case.
- **Shell tests act like a visitor** (R17): the real build, served by `serveBuilt` (004), opened in
  Chromium through `test/helpers/shell.ts` (T024), driven by clicks, drags, touch, keys and
  viewport changes. No test hook in the site. Every Chromium is launched by
  `tools/site-check/src/browser.ts` with 004's isolation flags.
- **Fixtures and tests may hold literal values and CV text.** They live in `test/` and
  `__fixtures__/`, which no check searches. Never copy one into source.
- **No test writes inside the repository**: builds for tests go to temporary directories, as in
  004. Only `npm run build` writes, under `packages/web/dist/`.
- **The token export is written in Penpot's form** (`JSON.stringify(value, null, 2)`, no final
  newline) while the interim provision applies.
- **Traceability stays red until Phase 10**: 005's spec is Approved, so `npm run traceability` and
  001's self-check test fail on uncovered 005 IDs until every story's tests exist. Any other
  failure is a real one.
- Code uses erasable TypeScript only, with explicit `.ts`/`.tsx` extensions on relative imports.
- Run everything with Node 26 active (`nvm use`), as the shell's default Node is older.
- Commits use Conventional Commits and carry no AI or Claude attribution (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The `@cv/os-core` workspace and a clean baseline

- [X] T001 Create the `@cv/os-core` workspace in `packages/os-core/package.json` and `packages/os-core/src/index.ts` (plan Project Structure, contracts/os-core.md):
  - `package.json`: `"name": "@cv/os-core"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, and no `dependencies`, `devDependencies` or `scripts`.
  - `src/index.ts`: a header comment saying what the package is (Constitution V), and no exports yet.
  - Run `npm install` with Node 26 so `package-lock.json` records the workspace and `node_modules/@cv/os-core` links to it. No package is added (plan Dependencies).
  - `tsconfig.json` (`packages/**/*.ts`) and `vitest.config.ts` (`TEST_INCLUDE_GLOBS`) already cover the new folder: confirm, and change neither.
- [X] T002 Record the baseline, after T001: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check` and `npm run site-check` pass on the branch as it is. `npm run traceability` fails only because 005's 66 requirements have no test yet. Write the result here.
  - **Result (2026-10-27)**: `typecheck`, `content-check`, `token-check` and `site-check` exit 0 (site check: 11 of 11 parts passed, `/cv` Lighthouse 99/100 mobile). `npm test`: 773 passed, 2 failed, both the traceability self-checks (`packages/web/test/self-check.test.ts` 004-cv-page-FR-047 and `tools/traceability/test/self-check.test.ts` 001 FR-028). `npm run traceability`: `FAIL: 66 problems found.`, all `uncovered` 005-os-shell requirements. No other failure.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate, the 004 amendment, tokens, site text, the shared CV body, container
queries, the root page and its build, the `Os` root, and the shell test helper

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: T003 comes first. No task that creates or changes UI may start
until it is done.

- [X] T003 Confirm the design gate in `specs/005-os-shell/design/` under Constitution 1.2.0's interim provision (plan Constitution Check II, research R19): `wireframes.md` covers every state of both shells and the no-script page; `mockup/` holds the interim local mockup with its 18 PNG exports at 1440, 375, 320 and 812 px; `review.md` is signed by the owner, naming commit `4d2e29f` and 2026-10-26, records the look as original (FR-044, SC-011), and lists the owner's changes of 2026-10-27 (the Window menu's two commands, and focus after closing About) under "Changes after sign-off". Write the result here.
  - **Result (2026-10-27)**: confirmed. `wireframes.md` covers both shells' states and the no-script page; `mockup/` holds the 18 PNGs (1440, 375, 320 and 812 px); `review.md` is `Approved`, signed by the owner naming commit `4d2e29f` and 2026-10-26, ticks the original-look box (FR-044, SC-011) and lists both 2026-10-27 changes under "Changes after sign-off".
- [X] T004 Rename the desktop height token in the design before any code reads it (research R7), in `specs/005-os-shell/design/mockup/README.md` (Proposed tokens: `breakpoint.desktop-height` → `size.desktop-min-height`, dimension, `640px`) and `specs/005-os-shell/design/mockup/proposed-tokens.css` (`--token-breakpoint-desktop-height` → `--token-size-desktop-min-height`). Change no value and nothing else. Commit it alone as `docs: rename the desktop height token (005)`.
- [X] T005 Owner action: approve the amendment of 004 (FR-051, research R15), written in `specs/004-cv-page/spec.md` and `specs/004-cv-page/contracts/site.md`, before the root changes (T018):
  - FR-018 becomes `- ~~**FR-018**~~: Removed <date> – replaced by 005-os-shell-FR-001: the site root shows the OS shell.`, keeping its line.
  - FR-038 becomes `- ~~**FR-038**~~: Removed <date> – replaced by 004-cv-page-FR-059.`
  - A new active **FR-059** after FR-058: "After one complete online visit to `/cv` or the site root, opening `/cv` or an unknown path with no network MUST show the same page as online, with all its content, styles and fonts. 005-os-shell-FR-052 covers the site root."
  - The Shell Scope's CV path text and the Offline Behavior lines that mention FR-018 or FR-038 get a note pointing to 005. The site contract's redirect row gets the same note.
  - `<date>` is the day the owner approves, filled in then. Commit as `docs: amend 004 for the shell (005)`.
  BLOCKED: the owner must approve the amendment; this unattended run can't get that approval. The amendment text is written (commit `docs: amend 004 for the shell (005)`) with `[DATE: the day the owner approves]` in place of the date, and later tasks build on it. Before merge: the owner approves, the date is filled in, and this task is ticked.
  Done: the owner approved the amendment on 2026-10-28, and the date is filled in for FR-018 and FR-038.
- [X] T006 [P] Write `packages/web/test/shell/amendment.test.ts`, covering 005-os-shell-FR-051: it reads `specs/004-cv-page/spec.md` with 001's spec parser (`tools/traceability/src/specs.ts`) and asserts FR-018 and FR-038 are removed, each naming its replacement, FR-059 is active, and no test file in the repository references `004-cv-page-FR-018` or `004-cv-page-FR-038` (001's `listFiles`). It fails until T005 and T007.
- [X] T007 Update 004's tests for the amendment, after T005 (research R15):
  - `packages/web/test/routes.test.ts`: replace the FR-018 test (the 307 to `/cv`) with `describe('005-os-shell-FR-001 005-os-shell-FR-050: the site root is a page', …)`: `GET /` and `GET /?utm_source=x` answer 200, `text/html; charset=utf-8`, `Cache-Control: no-cache`, with `#os` in the body; `GET /index.html` answers 404 with the not-found page; the built manifest has `/` as a page with `index.html` and an empty `redirects` (contracts/site.md). It fails until T017 and T018.
  - `packages/web/test/offline.test.ts`: rename every `004-cv-page-FR-038` title to `004-cv-page-FR-059`, and drop the case where the root leads to `/cv` offline (005's `shell/offline.test.ts`, T104, covers the root).
- [X] T008 [P] Add the design's 85 tokens to `packages/tokens/penpot/tokens.json`, in Penpot's form, then run `npm run token-output` (research R7, design/mockup/README.md Proposed tokens):
  - Names, types and values exactly as the README's table after T004, with `size.desktop-min-height` in place of `breakpoint.desktop-height`. `breakpoint.desktop-width` keeps its name.
  - Base colors (`color.base.*`, 8-digit hex for the translucent ones) go in the `base` set with the existing ones; semantic colors (`color.wallpaper*`, `color.chrome*`, `color.shell-*`, `color.title-bar*`, `color.window-border*`, `color.control*`, `color.selection*`, `color.icon-*`, `color.ghost`, `color.focus-shell`) go where 004's semantic colors are, as references such as `{color.base.night}`. `color.base.indigo` and `color.base.white` already exist.
  - Shadows, radii, sizes and the two font tokens in their sets by type, following the existing entries' form. No motion token is added.
  - `npm run token-check` passes. Commit as `feat(tokens): add the shell's tokens (005)`.
- [X] T009 [P] Declare `@cv/os-core`'s types in `packages/os-core/src/types.ts` and export them from `src/index.ts` (data-model.md, contracts/os-core.md). Copy data-model.md's definitions verbatim: `ShellName` (`'desktop' | 'mobile'`), `ViewId` (`'cv' | 'about'`), `Geometry`, `WindowState` (`placement: 'initial' | 'set'`, `maximized: { restore: Geometry } | null`), `Session`, `OsState` (`shell: ShellName | 'both'`, `area: … | null`, `windows` front first, `focused` "always `windows[0]` when set", `mobile.{open, scroll, historyEntry}`, `effects`), `Effect`, `FocusTarget` (seven kinds), `AppDeclaration` (with `Icon` and `Content` typed as a generic component type, so no React import), `Shortcut` (`needs: 'none' | 'window' | 'restored-window'`), and `Metrics` with the fields of data-model.md's Metrics table. Add `OsAction`, a union discriminated on `type` with the 17 actions of contracts/os-core.md, and `ReducerContext = { apps, metrics, text }` where `text` holds the window names and announcement patterns.
- [X] T010 [P] Add the shell's site text to `packages/web/src/site-text.ts`, under new `os`, `desktop`, `mobile`, `about` and `noScript` keys, with exactly the strings of design/wireframes.md's Site text and Screen readers tables and contracts/shell.md (FR-043, research R16):
  - `os`: view names (`CV`, `About this site`), the CV app's link (`Open as a page to print or share`), and the announcement patterns `{window} moved.`, `Move cancelled.`, `{window} resized to {width} by {height}.`, `Resize cancelled.`, `{window} maximized.`, `{window} restored.`;
  - `desktop`: `Menu bar`, `Desktop`, `Dock`, `Site menu`, the site menu's items (`About this site`, `Open the CV as a page`, `Source code on GitHub`), `Window`, `Go to the menu bar`, `Go to the dock`, `Next window`, `(minimized)`, the window menu's items (`Open the CV as a page`, `Move…`, `Resize…`, `Minimize`, `Maximize`, `Restore`, `Close`), the control patterns `Close {window}`, `Minimize {window}`, `Maximize {window}`, `Restore {window}`, the dock item suffixes `open` and `minimized`, and the pad's text (`Moving {window}`, `Resizing {window}`, `Up`, `Down`, `Left`, `Right`, `Narrower`, `Wider`, `Shorter`, `Taller`, `Done`, `Cancel`, `Arrows: {step} px`, `Shift+arrows: {bigStep} px`, `Moving`, `Resizing`). The step legends are patterns, not the wireframes' literal `16 px` and `64 px`: those numbers are design values (`space.4`, `space.16`), so they reach the text only from `METRICS` (T061), and changing either token stays one edit (Constitution IV);
  - `mobile`: `Home`, `Home screen`, `About this site`;
  - `about`: the heading, the paragraph with a `{name}` placeholder (contracts/shell.md Shared), the link texts `Open the CV as a page` and `Source code, specs and history on GitHub`, `Keyboard shortcuts`, the eight command names of data-model.md's Shortcuts table, and the two notes from design/wireframes.md's About this site section;
  - `noScript`: the sentence and `Read the CV`.
  - Export one `fill(pattern, values)` from the same file that replaces `{key}` placeholders, so each phrase is written once. 004's existing keys don't change, and the file holds no CV fact.
- [X] T011 [P] Add `siteName(resume)` and `shellTitle(resume, appName?)` to `packages/web/src/format/meta.ts` (data-model.md Site name and title, FR-042, FR-066): `siteName` is `basics.name` when present, else `siteText.siteHeading` (`CV`); `shellTitle` is `{app} – {site name}`, with an en dash between spaces, when `appName` is given, else the site name. `pageMeta` doesn't change.
- [X] T012 Build the metrics in `packages/web/src/os/metrics.ts`, after T008 and T009 (research R7, data-model.md Metrics). Export `METRICS: Metrics`, read once with `tokenValue` and `durationMs`, one field per row of data-model.md's table: `desktopMinWidth` ← `breakpoint.desktop-width`, `desktopMinHeight` ← `size.desktop-min-height`, `menuBar` ← `size.menu-bar`, `dockReserve` ← `size.dock-reserve`, `titleBar` ← `size.title-bar`, `cvWidth` ← `size.window-cv-width`, `aboutWidth`/`aboutHeight` ← `size.window-about-width`/`-height`, `minWidth`/`minHeight` ← `size.window-min-width`/`-height`, `firstTop` ← `space.6`, `sideMargin` ← `space.8`, `bottomMargin` and `cascade` ← `space.12`, `step` ← `space.4`, `bigStep` ← `space.16`, `motionMs` ← `motion.duration.fast`. Also export `MOTION_EASING` from `tokenValue('motion.easing.standard')`, a string outside `Metrics`. Throw at import, naming the token, when a length isn't a plain `px` value or a duration isn't in `ms`, "so a bad token fails the build rather than a visit".
- [X] T013 Verify the container query rewrite (research R5 **Verify**), after T008: in a scratch script outside the repository, run Lightning CSS 1.33.0's `transform` with a visitor on `@container (--token-breakpoint-wide) { … }` and confirm the prelude is parsed as a feature with a custom name, kept, and can be replaced by `mediaQuery('breakpoint.wide')`'s condition. Record the result here. If it can't, T014 uses the fallback: a post-build rewrite of the same prelude in `build-site.ts`.
  - **Result (2026-10-27)**: it can. Lightning CSS 1.33.0 parses `@container (--token-breakpoint-wide)` as a `feature` condition of type `boolean` named `--token-breakpoint-wide`, keeps it, and a `Rule.container` visitor replaces the condition with the one parsed from `mediaQuery('breakpoint.wide')`. The built `cv-*.css` and `os-*.css` each hold `@container (width>=900px)` and no `--token-breakpoint-` in a query. No fallback needed.
- [X] T014 Create the Lightning CSS visitor in `packages/web/scripts/container-breakpoints.ts` and pass it through `css.lightningcss` in `packages/web/vite.config.ts`, after T013 (research R5): it rewrites `@container (--token-breakpoint-<name>)` to the token's width condition from `@cv/tokens`' `mediaQuery()`. `build-site.ts` fails with `site build failed: <file> still holds --token-breakpoint-` when any emitted CSS has that text (contracts/site.md step 4).
- [X] T015 Split the style sheets and move the CV's layout to container queries, after T014 (research R5, R6), in `packages/web/src/styles/base.css`, `global.css` and `cv.css`:
  - `base.css` takes box sizing, resets, links, `.visually-hidden` and the focus outline from `global.css`. `global.css` imports the fonts, tokens, `base.css`, `cv.css` and `print.css`, and keeps the page frame.
  - In `cv.css`, every `@media (--token-breakpoint-wide)` becomes `@container (--token-breakpoint-wide)`, and every element selector (`main`, `h2`, `h3`, `footer`, `li > h3`, …) is scoped under the CV's root class `.cv`, so it styles the CV in the shell without reaching shell elements.
  - On `/cv`, `body` is the size container (`container-type: inline-size`), so `/cv` lays out as before.
  - 004's tests (`layout`, `design`, `print`, `modes`, `structure`) and `npm run token-check` still pass with no change to them.
- [X] T016 Extract the CV body into `packages/web/src/cv/CvDocument.tsx` and use it in `packages/web/src/pages/CvPage.tsx` (research R5): `CvDocument({ resume, as })`, with `as: 'main' | 'div'`, renders `Intro` and the shown sections exactly as `CvPage` does now, on a root with class `cv` and 004's `data-req="004-cv-page-FR-001 004-cv-page-FR-014 004-cv-page-FR-025 004-cv-page-FR-027"`. `CvPage` becomes `<CvDocument as="main" …/>` plus `SiteFooter`. `/cv`'s HTML is unchanged byte for byte (compare a build before and after), and 004's tests pass unchanged.
- [X] T017 Make the root a page in `packages/web/src/routes.ts`, after T005 (research R14, data-model.md route table): `pages` becomes `[{ path: '/', aliases: [], file: 'index.html' }, { path: '/cv', aliases: ['/cv/'], file: 'cv.html' }]` and `redirects` becomes `[]`. Keep the `RedirectRoute` type and `resolveRoute`'s redirect branch: the server, the worker and the checks read them.
- [X] T018 Build the root page, with a stub shell, after T009, T012, T014, T015, T017 and T021 (research R1, R2, R14, contracts/site.md, contracts/shell.md Document), in `packages/web/vite.config.ts`, `packages/web/scripts/build-site.ts`, `packages/web/src/render.tsx`, `packages/web/src/pages/ShellPage.tsx`, `packages/web/src/os/Os.tsx`, `packages/web/src/client/os.tsx` and `packages/web/src/styles/os.css`. It needs `shellQuery` (T021), `base.css` and the scoped `cv.css` (T015):
  - `Os.tsx` is a stub here: `Os` renders an empty `div.desktop` and `div.mobile`, so `renderShell` and the client entry have a component to render. T023 replaces it with the real root.
  - Vite gains the client entry `os` (`src/client/os.tsx`, which imports `src/styles/os.css`), configured so Rolldown emits it as **one** JS file with no dynamic chunk.
  - `render.tsx` gains `renderShell({ resume, siteData, assets })`: the document by `renderToStaticMarkup` (as `/cv`'s `Document`, with the meta of 004 FR-036 and the title `shellTitle(resume, 'CV')`), and inside it `<div id="os" data-req="005-os-shell-FR-001 005-os-shell-FR-002 005-os-shell-FR-004">` holding `renderToString(<Os …/>)`.
  - `ShellPage.tsx`: the inline picker as the first child of `<head>`, which sets `data-shell` on `<html>` from `matchMedia(<shellQuery(METRICS)>).matches`, then adds one `click` listener on `document` that, while `#os` has no `data-ready`, sets `window.osEarlyView` to the `data-view` of the first `#os .app-icon` or `#os .about` activated (T044 sets `data-view` on them), so a tap made before hydration isn't lost (FR-004, Constitution VII; T023 replays it). contracts/shell.md's Document section describes both statements, the early tap and its replay. Then charset, viewport, `color-scheme: light`, title, description, sharing meta, the `latin` font preloads of the three families, the `os` style sheet, the `os` module script and the worker's registration script. The no-script page's slot sits beside `#os`, outside it (T046 fills it).
  - `build-site.ts` renders `/` with `renderShell` into `index.html`, with the assets from the manifest's `os` entry. It fails with `site build failed: <message>` when the `os` entry has more than one script file, or `index.html` lacks the inline script, `#os` or the no-script page.
  - `os.css` imports the fonts, tokens, `base.css`, `cv.css`, `src/os/shell.css`, `src/shells/desktop/desktop.css` and `src/shells/mobile/mobile.css` (each created here, empty but for a header comment), and holds contracts/shell.md's visibility rules: `html[data-shell] .no-script` and `html:not([data-shell]) #os` hidden; `html[data-shell="desktop"] #os .mobile` and `html[data-shell="mobile"] #os .desktop` hidden.
  - T007's routes test passes. `/cv` and the not-found page load what they loaded before, and no React.
- [X] T019 [P] Write `packages/os-core/test/shell.test.ts`, covering 005-os-shell-FR-001: `shellQuery` for the design's metrics is exactly `(width >= 1024px) and (height >= 640px)`, and follows other metrics.
- [X] T020 [P] Write `packages/os-core/test/apps.test.ts`, covering 005-os-shell-FR-003: for a fixture list of three apps with mixed shells, `appsFor(apps, shell)` returns exactly the apps declaring that shell, in list order, and nothing else; ids in the real list are unique (T034 makes it importable from `packages/web/src/apps/index.ts`; until then the uniqueness case uses the fixture).
- [X] T021 Implement `shellQuery(metrics)` and `appsFor(apps, shell)` in `packages/os-core/src/shell.ts`, export them, after T009 (contracts/os-core.md). T019 and T020 pass.
- [X] T022 Create the reducer's frame in `packages/os-core/src/state.ts` and `packages/os-core/src/reducer.ts`, after T009 (data-model.md OS state, contracts/os-core.md): `initialState(apps, metrics)` returns `shell: 'both'`, `area: null`, the CV window with `placement: 'initial'` and a zero geometry until measured, `focused: 'cv'`, `session: null`, `mobile: { open: null, scroll: {}, historyEntry: false }`, `effects: []`; `osReducer(state, action, context)` handles `effectsDone` (clears `effects`) and returns `state` unchanged for every other action until the stories add them. Export both.
- [X] T023 Replace T018's stub with the `Os` root, and finish the client entry, after T018 and T022 (research R1, R2, R4, R10), in `packages/web/src/os/Os.tsx`, `packages/web/src/os/Announcer.tsx` and `packages/web/src/client/os.tsx`:
  - `Os({ resume, siteData, apps })` holds `useReducer` over `osReducer` with `{ apps, metrics: METRICS, text }` built from `siteText`. Its first render is the pre-rendered tree: both shells (`div.desktop` and `div.mobile`, stubs until US1) and the announcer.
  - After hydration it reads `matchMedia(shellQuery(METRICS))`, measures the desktop area, dispatches `hydrated { shell, area }`, renders only the active shell, and sets `data-ready` on `#os` (contracts/shell.md Document). Then, if `window.osEarlyView` is set, the shell is mobile and no app is open yet (React may have replayed the same tap), it dispatches `mobileOpen` for that view, with its usual focus move and history entry. Either way it then deletes `window.osEarlyView` (contracts/shell.md Document).
  - An effect runs `state.effects` after each render: `focus` resolves the target by data attributes (window title, dock item, site menu title, menu title, pad, mobile title, home icon) and focuses it; `announce` writes the message to the announcer. Then it dispatches `effectsDone`.
  - Another effect sets `document.title` with `shellTitle` from the focused window's or open app's name, on every change, including right after hydration on a phone.
  - `Announcer.tsx`: one `div role="status" class="visually-hidden" data-req="005-os-shell-FR-041"`.
  - `client/os.tsx`: `hydrateRoot(document.getElementById('os'), <Os …/>)` with `resume` and `siteData` imported from `@cv/content` and the app list, the same props as the build.
- [X] T024 Create the shell test helper in `packages/web/test/helpers/shell.ts`, after T023 (plan Dependencies "Shell test helper"):
  - `openShell({ width, height, javaScriptEnabled?, reducedMotion?, forcedColors?, hasTouch?, userAgent?, cpuThrottling? })`: opens the built root from `serveBuilt()` with 004's `openPage`, and waits for `#os[data-ready]` when scripting is on.
  - `drag(page, from, to, { pointerType: 'mouse' | 'pen' | 'touch', steps })`: mouse through Playwright's mouse; pen and touch through CDP's `Input.dispatchMouseEvent` (with `pointerType: 'pen'`) and `Input.dispatchTouchEvent`.
  - `box(page, selector)`, `tap(page, selector)`, `press(page, keys)`, and `focusedElement(page)` returning a stable description of `document.activeElement`.
  - `focusIndicator(page)`: reuses 004's indicator measurement from `tools/site-check/src/parts/keyboard.ts` (contrast of 3:1 or more, not covered).
- [X] T025 Create the core test helpers in `packages/os-core/test/helpers.ts`, after T022: `METRICS`, the design's numbers as plain values (data-model.md Metrics); `TEXT`, plain patterns matching site text; `APPS`, a fixture CV declaration with stub components; `run(state, actions)`, which deep-freezes each state, applies the actions one by one, and calls `assertInvariants` after each; and `assertInvariants(state, metrics)`, which checks every row of data-model.md's Invariants table and names the one that failed.
- [X] T026 Checkpoint, after T003 to T025: `npm run build` writes `index.html` and one `assets/os-<hash>.js` and `.css`; `npm run serve` answers `/` with 200 and the stub shell, and `/cv` as before; `npm run typecheck`, `npm run content-check` and `npm run token-check` pass; `npm test` passes except 001's self-check, and T006 passes. Commit by area, such as `feat(os-core): …`, `feat(web): …`, `test(web): …`.
  - **Result (2026-10-27)**: `npm run build` writes `index.html`, one `assets/os-<hash>.js` and one `assets/os-<hash>.css`; the routes test answers `/` with 200 and the stub shell, and `/cv`'s HTML is byte for byte as before apart from its style sheet's hash (compared with a build of `f864f90`). `typecheck`, `content-check` and `token-check` pass. `npm test`: T006 passes; failing are the two traceability self-checks (expected until Phase 10), `tokens.test.ts`'s "every token is read" (the 85 new tokens have no reader until US1's style sheets) and `performance.test.ts`, whose site check still expects `/` to redirect and finds no paint on the stub shell (US1 paints it, US7 teaches the check the root). Two 004 tests changed for the new style sheet: `fonts.test.ts` checks each built sheet's `@font-face` rules separately, and `site-text.test.ts` allows the design's `…`.

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Reach the CV in one click or tap, on either shell (Priority: P1) 🎯 MVP

**Goal**: The root shows the desktop with the CV already open in a focused window at 1024 × 640 and
up, and the home screen with the CV one tap away below that. The CV app shows `/cv`'s CV and links
to `/cv`. Without scripts, the root links to `/cv`.

**Independent Test**: build, open `/` at 1440 × 900 and see the CV window open, close it and
reopen it from the dock with one click; open `/` at 375 × 812 and open the CV with one tap.
Every shown field of the CV document is in the CV app in `/cv`'s order, and nothing is in front of
the shell.

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T027 [P] [US1] Write the first cases of `packages/os-core/test/reducer.test.ts`, using `run` (T025):
  - covers 005-os-shell-FR-005: `initialState` has the CV window open, `placement: 'initial'`, focused, no effects; `hydrated` on `desktop` sets `placement: 'set'` with `placeWindow`'s box and adds no effect; on `mobile` it closes the CV window and leaves `mobile.open: null`;
  - covers 005-os-shell-FR-012: `open` on a closed view adds it in front, focused, with a `window-title` focus effect; `open` on an open view brings it to the front; never two windows for one view;
  - covers 005-os-shell-FR-023: `close` removes the window and, with none left, adds a `dock-item` focus effect for the CV;
  - covers 005-os-shell-FR-032 and 005-os-shell-FR-040: `mobileOpen` sets `mobile.open`, `historyEntry: true` and a `mobile-title` focus effect.
- [X] T028 [P] [US1] Write the CV cases of `packages/os-core/test/geometry.test.ts`, covering 005-os-shell-FR-005 and 005-os-shell-FR-018: `placeWindow('cv', [], area, METRICS)` is `{ x: 220, y: 24, width: 1000, height: 716 }` for the 1440 × 764 area, `{ x: 32, y: 24, width: 960, height: 456 }` for the 1024 × 504 area, never larger than the area, and always whole pixels.
- [X] T029 [P] [US1] Write `packages/web/test/shell/first-load.test.ts`:
  - covers 005-os-shell-FR-004 (SC-001): at 1440 × 900 and 375 × 812, nothing overlays the shell on load (no dialog, banner or element above the menu bar, dock or home screen); the CV is visible with 0 clicks on desktop and after 1 tap on mobile; at 375 × 812, with the `os` script's request held, one tap on the CV icon, then releasing the request, opens the CV full screen with no second tap; at 1440, after closing the CV with its close control, one click on the CV dock item opens it in front, focused (US1 scenario 2);
  - covers 005-os-shell-FR-005: at 1440 × 900 the CV window is open, focused, in front, 1000 × 716 at x 220, y 56 in the page, with the menu bar and dock visible, and `document.activeElement` is `body`; at 375 the home screen shows and no app is open; the window's box is the same before and after hydration within 0.5 px at 1024 × 640, 1440 × 900 and 2560 × 1440 (research R3).
- [X] T030 [P] [US1] Write `packages/web/test/shell/shell-choice.test.ts`, covering 005-os-shell-FR-001: 1440 × 900 and 1024 × 640 get the desktop; 1023 × 900, 1440 × 639, 375 × 812 and 812 × 375 get the mobile shell; each size gives the same shell with a desktop and with a phone user agent; the first paint already shows the right shell (screenshot before the script runs, with the script's request held).
- [X] T031 [P] [US1] Write `packages/web/test/shell/apps.test.tsx`, covering 005-os-shell-FR-003: the dock and the home screen each show one item, the CV, in `APPS` order, and no placeholder.
- [X] T032 [P] [US1] Write `packages/web/test/shell/cv-app.test.ts`:
  - covers 005-os-shell-FR-006: in each shell, the CV app's text equals `/cv`'s `main` text (004's `axText`);
  - covers 005-os-shell-FR-007: the link reads `Open as a page to print or share` and goes to `/cv`; Ctrl-click and middle-click open a new tab;
  - covers 005-os-shell-FR-008: the full-screen view at 320 px has no horizontal scroll; a fixture CV with a 120-character word (004's `long-words.json`) stays in its column; at a window content width of 900 px and up the CV has two columns, below it one;
  - covers 005-os-shell-FR-009: in both shells, one `h1` with the name, an `h2` per shown section, `h3` per entry, no skipped level; with the `no-name` fixture the `h1` is `CV`;
  - `describe('… (SC-003)')`: at 375 px with 4× CPU throttling over CDP, the CV's `h1` is visible within 1 s of the tap.
- [X] T033 [P] [US1] Write `packages/web/test/shell/site-text.test.ts`:
  - covers 005-os-shell-FR-043: every value under `os`, `desktop`, `mobile`, `about` and `noScript` is English and holds no key fact of the real CV (as 004's `site-text.test.ts`); every shell label in the rendered root is CV text or site text;
  - covers 005-os-shell-FR-066: the menu bar's desktop name (with the CV closed), the title, the home screen's site name and About this site show `basics.name`; with the `no-name` fixture they show `CV`.
- [X] T034 [P] [US1] Write `packages/web/test/shell/no-script.test.ts`, covering 005-os-shell-FR-049: with scripting off, at 1440 and 375 px, `/` shows the role, the name, the sentence and `Read the CV` → `/cv`, then `/cv`'s footer, in the site's style sheet; no visible `button`, `role=menu`, dock or form control; `html` has no `data-shell`.
- [X] T035 [P] [US1] Write `packages/web/test/shell/design.test.ts`, and extend `packages/web/test/tokens.test.ts`:
  - covers 005-os-shell-FR-044: the three window controls share one color (computed styles); no font token or `fonts.json` family is an Apple or system UI font (`-apple-system`, `system-ui`, `SF Pro`, `San Francisco`, `BlinkMacSystemFont`, `Helvetica Neue`); the icons in the root are the committed SVG components;
  - covers 005-os-shell-FR-045: at 1440 × 900 the menu bar is 32 px tall, the dock leaves 104 px, title bars are 40 px, the CV window is 1000 × 716 at 220, 56; at 375 the home grid has 4 icons per row, at 320 3, at 812 × 375 10 (with a fixture app list of 12, through the build's test fixture path); `tokens.test.ts` asserts every one of the 85 new tokens is read by a style sheet or by `metrics.ts`.
- [X] T036 [P] [US1] Write `packages/web/test/shell/requests.test.ts`, covering 005-os-shell-FR-054: loading `/` and opening the CV app, at 1440 and 375 px, requests only `127.0.0.1` (T070 adds About this site).

### Implementation for User Story 1

- [X] T037 [US1] Implement `placeWindow` for the CV in `packages/os-core/src/geometry.ts` (data-model.md, design/wireframes.md Design values): centered, `firstTop` below the area's top, `min(cvWidth, area.width − 2 × sideMargin)` wide, `area.height − bottomMargin` tall, fitted to the area and rounded to whole pixels. Export it. T028 passes.
- [X] T038 [US1] Implement `initialState`'s CV window and the actions `hydrated`, `open`, `close`, `focus` and `mobileOpen` in `packages/os-core/src/reducer.ts`, after T037, by data-model.md's Actions table and Focus rules. T027 passes.
- [X] T039 [P] [US1] Create the CV app's declaration and icon in `packages/web/src/apps/cv/app.tsx`, `packages/web/src/apps/cv/CvIcon.tsx` and `packages/web/src/apps/index.ts` (data-model.md App declaration, Constitution V): `{ id: 'cv', name: siteText.os.views.cv, shells: ['desktop', 'mobile'], needsNetwork: false, Icon: CvIcon, Content: CvApp }`; `CvIcon` is the mockup's original drawing as inline SVG, `aria-hidden="true"`, drawn in `currentColor` and `var(--token-color-icon-*)`, with `data-req="005-os-shell-FR-044"`; `APPS` lists the CV app.
- [X] T040 [P] [US1] Create the shell's icons in `packages/web/src/os/icons/` (`SiteMark.tsx`, `CloseGlyph.tsx`, `MinimizeGlyph.tsx`, `MaximizeGlyph.tsx`, `RestoreGlyph.tsx`, `HomeChevron.tsx`), each the mockup's own drawing as inline SVG, `aria-hidden="true"`, in `currentColor`, with `data-req="005-os-shell-FR-044"` (research R6).
- [X] T041 [US1] Create the CV app in `packages/web/src/apps/cv/CvApp.tsx`, after T016 and T039 (research R5, contracts/shell.md Shared): a root with `data-req="005-os-shell-FR-006 005-os-shell-FR-008 005-os-shell-FR-009"`, `a.standalone` with `siteText.os.cvLink` → `/cv` and `data-req="005-os-shell-FR-007"`, then `<CvDocument as="div" resume={resume} />`.
- [X] T042 [US1] Build the desktop shell's markup in `packages/web/src/shells/desktop/Desktop.tsx`, `MenuBar.tsx`, `Dock.tsx`, `Window.tsx` and `TitleBar.tsx`, after T038, T040 and T041, by contracts/shell.md's Desktop tree:
  - `div.desktop` with `data-req="005-os-shell-FR-005 005-os-shell-FR-010 005-os-shell-FR-024 005-os-shell-FR-025 005-os-shell-FR-037"`;
  - the menu bar `role="menubar"` named `Menu bar` with the site menu's title (the site mark) and either the focused window's name or `span[role=menuitem][aria-disabled=true]` with the site name (menus come in T060), `data-req="005-os-shell-FR-013 005-os-shell-FR-039 005-os-shell-FR-066"`;
  - `main.desktop-area` named `Desktop`, holding one `section.window` per open window in front-to-back order, each `aria-roledescription="window"`, `aria-labelledby` its title, `data-view`, `aria-current="true"` when focused, `data-placement="initial"` until measured, with `data-req="005-os-shell-FR-017 005-os-shell-FR-018 005-os-shell-FR-021 005-os-shell-FR-030 005-os-shell-FR-039"`;
  - the title bar with the close, minimize and maximize controls named by `fill(siteText.desktop.close, …)` and so on, then `div.window-title` with an id and `tabindex="-1"`; then `div.window-content` holding the app's `Content`;
  - the dock `role="toolbar"` named `Dock`, one `button.dock-item` per `appsFor(APPS, 'desktop')` with its icon, its name shown below at all times, and its open mark, named `CV` or `CV, open`, with `data-req="005-os-shell-FR-011 005-os-shell-FR-012 005-os-shell-FR-064"`, inside `data-req="005-os-shell-FR-003 005-os-shell-FR-039"` on the toolbar.
  - Activating a dock item dispatches `open`; the close control dispatches `close` on `click`. Minimize and maximize are wired in US2.
- [X] T043 [US1] Style the desktop shell in `packages/web/src/shells/desktop/desktop.css`, after T042 (design/wireframes.md Design values, design/mockup/shell.css, research R3, R6): with `data-shell="desktop"` the shell is fixed to the viewport and never scrolls; the menu bar at `size.menu-bar` with glass (`color.chrome`, `backdrop-filter: blur(var(--token-size-chrome-blur))`); the desktop area between it and `size.dock-reserve`; the wallpaper as radial gradients and a dot grid from `color.wallpaper*`, `size.wallpaper-glow` and `size.wallpaper-dots`; windows with `radius.window`, `shadow.window` and `shadow.window-focused`, `color.window-border*`; title bars at `size.title-bar`, focused and not focused as the wireframes describe; controls 24 × 24 with a 14 px circle and a 10 px glyph, all one color; `section.window[data-placement="initial"]` placed by research R3's rule; `div.window-content` as a size container that scrolls; the dock with `radius.dock`, `shadow.dock`, `size.dock-icon` and `size.open-mark`. Every value a `var(--token-…)`.
- [X] T044 [US1] Build the mobile shell's markup in `packages/web/src/shells/mobile/Mobile.tsx`, `HomeScreen.tsx` and `FullScreenView.tsx`, after T038, T040 and T041, by contracts/shell.md's Mobile tree: `div.mobile` with `data-req="005-os-shell-FR-031 005-os-shell-FR-036 005-os-shell-FR-037"`; `main` holding `section.home` named `Home screen` (`data-req="005-os-shell-FR-031 005-os-shell-FR-035 005-os-shell-FR-039 005-os-shell-FR-066"`) with `p.site-name`, `ul.app-grid` (`data-req="005-os-shell-FR-003"`) of `button.app-icon` per `appsFor(APPS, 'mobile')` (`data-req="005-os-shell-FR-032"`), and `button.about`, each with `data-view` set to its view (`cv`, `about`) for the inline script's early-tap record (T018); and, while an app is open, `section.full-screen` labelled by its header title, with `header` (`button.home` named `Home`, `data-req="005-os-shell-FR-033 005-os-shell-FR-034"`, and `div.app-title` with `tabindex="-1"`, `data-req="005-os-shell-FR-040"`), then `div.view-content` holding the app. Tapping an icon dispatches `mobileOpen`. Home, Back, About and `inert` are wired in US3.
- [X] T045 [US1] Style the mobile shell in `packages/web/src/shells/mobile/mobile.css`, after T044 (design/wireframes.md Mobile shell, design/mockup/shell.css): the home screen with the wallpaper, the site name at `font.size.home-name` and `font.letter-spacing.home-name`, the grid of `size.app-icon` icons with `radius.icon` and names below, as many per row as fit at 76 px or more (a `repeat(auto-fill, minmax(…))` from tokens); the full-screen view over it with a sticky header at `size.mobile-header` and a `size.home-target` Home button; `div.view-content` as the scroll and size container.
- [X] T046 [US1] Create the no-script page in `packages/web/src/os/NoScript.tsx` and render it in `ShellPage.tsx`, after T018 (contracts/shell.md The no-script page, FR-049): `div.no-script` with `data-req="005-os-shell-FR-049"`: `p.role` with `basics.label` (left out when absent), `h1` with `siteName(resume)`, the sentence, `a.standalone` `Read the CV` → `/cv`, and 004's `SiteFooter`. No `button`, form control or element that needs a script. Its rules in `os.css` use `/cv`'s look.
- [X] T047 [US1] Wire both shells into `Os.tsx`, after T042 to T046: render `Desktop` and `Mobile` from state, with `dispatch` and the apps; window content gets each app's `Content` with `resume` and `siteData`; the shared styles both shells need (content areas, the live region) go in `packages/web/src/os/shell.css`.
- [X] T048 [US1] Checkpoint, after T027 to T047: T019, T020 and T027 to T036 pass; quickstart scenario 1 (minus the states US2 and US3 add) and 5 give their expected results; `content-check` and `token-check` pass with no exception added. Commit by area.
  - **Result (2026-10-27)**: T019, T020 and T027 to T036 pass; `content-check` and `token-check` pass with no exception. Scenario 1: the build holds `index.html` and one `os-<hash>.js` and `.css`; at 1440 × 900 the CV window is 1000 × 716 at 220, 56 with nothing in front, at 375 × 812 the home screen shows and one tap opens the CV full screen; the window's box is the same before and after hydration. Scenario 5 is `no-script.test.ts`. Found on the way: test builds ran with Vitest's `NODE_ENV=test`, which bundled React's development build and made 004's `one-edit.test.ts` see Vite's chunk size warning; `build-site.ts` now sets `NODE_ENV=production` before building, and the output is the same byte for byte whatever the caller's environment. `axText` (004's helper) now reads the text under a plain `div` root, which Chromium marks ignored. The dock's height matches the mockup (88 px plus its border) once the shell's button reset carries no specificity.

**Checkpoint**: User Story 1 is fully functional and testable on its own (the MVP)

---

## Phase 4: User Story 2 - Use the desktop with windows (Priority: P2)

**Goal**: With a mouse, pen or touch, the visitor opens About this site as a second window, moves
and resizes windows by dragging and by single clicks, focuses, minimizes, maximizes, restores,
switches and closes them, while the dock and the menu bar follow.

**Independent Test**: at 1440 × 900 with a mouse, do quickstart scenario 2 and confirm every
scenario of US2.

### Tests for User Story 2 (REQUIRED) ⚠️

- [X] T049 [P] [US2] Add to `packages/os-core/test/reducer.test.ts`:
  - covers 005-os-shell-FR-017: `focus` brings a window to the front and focuses it;
  - covers 005-os-shell-FR-023: closing the front of two windows focuses the other's title; closing the CV as the last window focuses its dock item, and closing About as the last window focuses `site-menu`;
  - covers 005-os-shell-FR-026: `next` cycles through shown windows and skips minimized ones;
  - covers 005-os-shell-FR-063: `minimize` keeps the app open, and moves focus to the new front window's title, or the CV's dock item, or `site-menu` for About when none is left shown;
  - covers 005-os-shell-FR-064: `open` on a minimized view restores it at its geometry, in front, focused, and a minimized maximized window comes back maximized;
  - covers 005-os-shell-FR-065: `toggleMaximize` saves `restore`, fills the area, announces `CV maximized.`, and restores with `CV restored.`; `dragMove`, `dragResize` and `sessionStart` are ignored while maximized;
  - covers 005-os-shell-FR-020, 005-os-shell-FR-027 and 005-os-shell-FR-062: a move session steps `step` and `bigStep`, clamps, confirms (announcing `CV moved.`) and cancels to `start` (`Move cancelled.`); a resize session does the same from the top-left corner, announcing `CV resized to W by H.` or `Resize cancelled.`; both focus the window title at the end.
- [X] T050 [P] [US2] Add to `packages/os-core/test/geometry.test.ts`:
  - covers 005-os-shell-FR-018: About opens at 560 × 520, 48 px right of and below the front window, or centered with none shown; when that lands its title bar on another's, it steps 48 px more, wrapping to the area's top left; after five open and close cycles no title bar overlaps another;
  - covers 005-os-shell-FR-021: `clampMove` keeps the title bar inside for moves past each edge; `fitToArea` moves windows back inside and fits ones larger than the area;
  - covers 005-os-shell-FR-061: `clampResize` from each of the eight edges and corners stops at 400 × 300 and at the area's edges, keeping the opposite edge fixed;
  - covers 005-os-shell-FR-065: a maximized window fills the area and follows it when it changes.
- [X] T051 [P] [US2] Write `packages/os-core/test/invariants.test.ts`, covering 005-os-shell-FR-017 (and every invariant of data-model.md through `assertInvariants`): named scenarios, and 500 generated sequences of 40 actions each from a seeded pseudo-random generator (fixed seed, so runs are deterministic), at area sizes from 400 × 300 to 2560 × 1336, with every state frozen.
- [X] T052 [P] [US2] Write `packages/web/test/shell/dock.test.ts`:
  - covers 005-os-shell-FR-011: each item's accessible name is the app's name, plus `, open` or `, minimized`; its name is visible without hover; the mark is a filled dot when open, hollow when minimized, none when closed, and the three states differ in grayscale screenshots;
  - covers 005-os-shell-FR-012: a click and a fast triple click on the CV item give one window, in front and focused (US2 scenario 7, spec edge cases).
- [X] T053 [P] [US2] Write `packages/web/test/shell/menus.test.ts`:
  - covers 005-os-shell-FR-013: the menu bar shows the site menu, the focused window's name and Window; with none focused, the site name; the site menu holds About this site, `/cv` and the repository link from `site.json`;
  - covers 005-os-shell-FR-014: the Window menu lists every open window with `✓` on the focused one and `(minimized)` on minimized ones, and choosing one brings it to the front, restoring it (US2 scenario 6); the focused window's menu holds Close;
  - covers 005-os-shell-FR-015: a menu opens on its title and closes on choosing an item, on Escape, on a click outside and when focus leaves; opening another closes the first.
- [X] T054 [P] [US2] Write `packages/web/test/shell/windows.test.ts`, at 1440 × 900:
  - covers 005-os-shell-FR-010: dragged, resized and maximized windows never cover the menu bar or the dock (their boxes don't intersect);
  - covers 005-os-shell-FR-016: every window's title bar shows its name and the controls `Close X`, `Minimize X`, `Maximize X`, with content below;
  - covers 005-os-shell-FR-017: clicking anywhere in the window behind brings it to the front, focused; the focused window's title bar differs from the other's in grayscale screenshots (US2 scenario 2);
  - covers 005-os-shell-FR-018: About opens 48 px right of and below the CV, its title bar clear of the CV's (US2 scenario 1);
  - covers 005-os-shell-FR-019: a mouse drag, a pen drag and a touch drag of the title bar move the window with the pointer, and it stays where released (US2 scenario 3); a drag that starts on a control doesn't move the window, and releasing away from it doesn't act;
  - covers 005-os-shell-FR-020: Move… then pad clicks move the window 16 px per click with no drag (US2 scenario 5); Resize… then pad clicks resize it; the pad's legends read `Arrows: 16 px` and `Shift+arrows: 64 px`, the design's `space.4` and `space.16`;
  - covers 005-os-shell-FR-021: dragging toward each edge stops with the title bar fully inside; narrowing the viewport to 1100 px moves a window near the right edge back inside (US2 scenarios 4, 9);
  - covers 005-os-shell-FR-022: the wheel over a window scrolls its content, not the page; the document never scrolls on desktop;
  - covers 005-os-shell-FR-023: closing removes the window and the dock's mark, and the menu bar shows the next window's name, or the site name (US2 scenario 8);
  - covers 005-os-shell-FR-061: dragging each edge and the bottom-right corner resizes, never below 400 × 300, and the CV reflows without horizontal scroll (US2 scenario 10);
  - covers 005-os-shell-FR-063: minimizing hides the window, the mark goes hollow, and the Window menu says `(minimized)` (US2 scenario 11);
  - covers 005-os-shell-FR-064: the dock, the Window menu and, for About, the site menu restore it at the same box, in front, focused;
  - covers 005-os-shell-FR-065: maximize fills the space between the menu bar and the dock, the control is then named `Restore CV`, and restoring returns the box; title bar and edge drags do nothing while maximized; a smaller viewport keeps it filling (US2 scenario 12, spec edge cases).
- [X] T055 [P] [US2] Write the desktop cases of `packages/web/test/shell/about.test.tsx`, covering 005-os-shell-FR-038: About opens from the site menu as a window listed in the Window menu, with no dock item; it holds the heading, the paragraph with the name from the CV document (a fixture name appears), `Open the CV as a page` → `/cv` and the repository link (T091 adds the shortcut list).
- [X] T056 [P] [US2] Add to `packages/web/test/shell/cv-app.test.ts`, covering 005-os-shell-FR-008: the CV window resized to 400 px wide has no horizontal scroll, and a 120-character word stays in its column.

### Implementation for User Story 2

- [X] T057 [US2] Implement the rest of `packages/os-core/src/geometry.ts` (contracts/os-core.md): `placeWindow` for About (cascade by `cascade`, stepping and wrapping until its title bar is on no other), `clampMove`, `clampResize(geometry, edge, area, metrics)` with the eight edges, and `fitToArea(window, area, metrics)`. Export them. T050 passes.
- [X] T058 [US2] Implement the actions `next`, `minimize`, `toggleMaximize`, `dragMove`, `dragResize`, `areaResized`, `sessionStart`, `sessionStep` and `sessionEnd`, and the full focus rules of `close` and `minimize`, in `packages/os-core/src/reducer.ts`, after T057 (data-model.md Actions table and Window lifecycle). Announcements are built from `context.text` patterns. T049 and T051 pass.
- [X] T059 [US2] Create `packages/web/src/shells/desktop/Menu.tsx` and finish `MenuBar.tsx`, after T058 (contracts/shell.md, research R9 Menus, FR-013 to FR-015):
  - the site menu (`About this site`, `Open the CV as a page` → `/cv`, `Source code on GitHub ↗` → `siteData.repository`), the focused window's menu (`Open the CV as a page` for the CV only, `Move…`, `Resize…`, `Minimize`, `Maximize` or `Restore`, `Close`; Move… and Resize… `aria-disabled="true"` while maximized), and the Window menu (`Go to the menu bar`, `Go to the dock` and `Next window`, each with its shortcut, Go to the menu bar focusing the menu bar's first title and Go to the dock its first item, as their shortcuts do, then one item per open window with `✓` on the focused one and `(minimized)` on minimized ones), each `role="menu"` with `data-req` as contracts/shell.md gives;
  - one menu open at a time; it closes when an item is chosen, on Escape (focus back to its title), on a pointer down outside, and on `focusout` leaving it; Up and Down move inside an open menu and Enter chooses.
- [X] T060 [US2] Make windows move, resize, minimize and maximize in `packages/web/src/shells/desktop/Window.tsx`, `TitleBar.tsx` and `ResizeHandles.tsx`, after T058 (research R8):
  - `pointerdown` anywhere in a window dispatches `focus`;
  - the title bar drags with Pointer Events, `setPointerCapture` and `touch-action: none`, batching `dragMove` to one per animation frame; a drag starting on a control doesn't move; controls act on `click`;
  - eight `div.resize-handle` (`aria-hidden`, 8 px edges, 16 × 16 px corners, a grip on the bottom-right) dispatch `dragResize`, with `data-req="005-os-shell-FR-061"`;
  - the minimize control (`data-req="005-os-shell-FR-063"`) dispatches `minimize`; a minimized window stays mounted with `hidden`; the maximize control (`data-req="005-os-shell-FR-065"`) dispatches `toggleMaximize` and is named `Restore {window}` while maximized;
  - geometry from state is set as inline `left`, `top`, `width` and `height` once `placement` is `'set'`.
- [X] T061 [US2] Create the pad in `packages/web/src/shells/desktop/Pad.tsx`, after T058 (contracts/shell.md, research R9, FR-020, FR-062): `div.pad[role=group]` named `Moving {window}` or `Resizing {window}`, with `data-req="005-os-shell-FR-020 005-os-shell-FR-027 005-os-shell-FR-062"`, the four direction buttons (`Up`, `Left`, `Right`, `Down`, or `Shorter`, `Narrower`, `Wider`, `Taller`), `Done`, `Cancel` and the two step legends, filled with `METRICS.step` and `METRICS.bigStep` through `fill()`; one click is one `sessionStep` of `step`; the title bar shows `Moving` or `Resizing` in place of the controls; a pointer down outside the window counts as Done. Move… and Resize… dispatch `sessionStart`. Its styles in `packages/web/src/shells/desktop/desktop.css` with `size.pad-button`, as the pad is desktop-only (Constitution V).
- [X] T062 [US2] Finish the desktop area and the dock in `Desktop.tsx` and `Dock.tsx`, after T058: a `ResizeObserver` on the desktop area dispatches `areaResized`; dock items show a filled mark when open, hollow when minimized, and are named `CV, open` or `CV, minimized`; activating a minimized app's item dispatches `open`, which restores it.
- [X] T063 [US2] Create About this site in `packages/web/src/os/About.tsx`, after T058 (contracts/shell.md Shared, FR-038): a root with `data-req="005-os-shell-FR-038"`, `h1` `About this site`, the paragraph filled with `siteName(resume)`, `Open the CV as a page` → `/cv` and `Source code, specs and history on GitHub` → `siteData.repository`. The site menu's About item dispatches `open { view: 'about' }`, which opens or restores it; it is listed in the Window menu and has no dock item. Its styles in `os/shell.css`.
- [X] T064 [US2] Checkpoint, after T049 to T063: T049 to T056 pass with US1's tests; quickstart scenario 2 gives its expected results. Commit by area.
  - **Result (2026-10-27)**: T049 to T056 pass with US1's tests (os-core 45 tests, including 500 generated sequences of 40 actions; 13 shell test files). Scenario 2's steps are `windows.test.ts`, `menus.test.ts`, `dock.test.ts` and `about.test.tsx`. The generated sequences found two faults, fixed in `geometry.ts` and `reducer.ts`: a resize from one edge didn't hold the other dimension to the minimum, and a cancelled session after the area shrank put the window back outside it. The desktop area clips its windows, so a window moved low, with only its title bar inside, never draws over the dock (FR-010). A maximized window keeps its restore box through area changes and is fitted when restored.

**Checkpoint**: User Stories 1 and 2 both work on their own

---

## Phase 5: User Story 3 - Use the phone home screen and full-screen apps (Priority: P3)

**Goal**: On a phone the visitor opens an app full screen, goes home with one tap or Back, finds
the app where they left it, and opens About this site. The site switches shell without reloading
when the space crosses the desktop minimum.

**Independent Test**: at 375 × 812 with touch, open the CV, scroll partway, go home, open About,
go home, open the CV again at the same scroll position; then quickstart scenario 10.

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T065 [P] [US3] Add to `packages/os-core/test/reducer.test.ts`:
  - covers 005-os-shell-FR-034: `mobileHome { scrollTop }` saves `scroll[open]`, clears `mobile.open` and `historyEntry`, and adds a `home-icon` focus effect for the view left;
  - covers 005-os-shell-FR-002: `shellChanged` to mobile opens the focused window's view full screen, or shows the home screen with none shown, keeping minimized and maximized flags; to desktop focuses the full-screen view's window, opening it by `placeWindow` if needed, or leaves the desktop empty; each focuses the open view's title.
- [X] T066 [P] [US3] Write `packages/web/test/shell/mobile.test.ts`:
  - covers 005-os-shell-FR-031: the home screen shows one icon per app with its name, and About this site, with no horizontal scroll at 320 × 640, 375 × 812, 812 × 375 and 1023 × 900 (US3 scenarios 4, 5);
  - covers 005-os-shell-FR-032: a tap opens the app full screen with a header showing its name and Home;
  - covers 005-os-shell-FR-033: one tap on Home returns to the home screen, and no gesture is the only way;
  - covers 005-os-shell-FR-034: scroll the CV halfway, Home, reopen: the same `scrollTop`; focus lands on the CV icon (US3 scenario 2, US4 scenario 9);
  - covers 005-os-shell-FR-035: with an app open the home screen is `inert`, Tab never reaches it, and the accessibility tree (004's `ax.ts`) holds none of it (US4 scenario 8).
- [X] T067 [P] [US3] Write `packages/web/test/shell/history.test.ts`, covering 005-os-shell-FR-050: the URL stays `/` through every action of both shells; on mobile, Back from the CV returns home with focus on its icon, and a second Back leaves the site; on desktop one Back leaves; after a mobile-to-desktop switch with the CV open, one Back leaves (US3 scenario 6, spec edge cases); a CV tap made before hydration (T029's held request) adds exactly one entry, so one Back returns home and a second leaves.
- [X] T068 [P] [US3] Add to `packages/web/test/shell/shell-choice.test.ts`, covering 005-os-shell-FR-002: resizing across 1024 px with the CV open, both ways, causes no navigation and keeps the CV open (focused window or full screen); with nothing open, the empty desktop becomes the home screen and back.
- [X] T069 [P] [US3] Add the mobile cases to `packages/web/test/shell/about.test.tsx`, covering 005-os-shell-FR-038: About opens full screen from the home screen with the same header and Home as an app (US3 scenario 3), holds the text and both links, and no shortcut list.
- [X] T070 [P] [US3] Add About this site to `packages/web/test/shell/requests.test.ts`, covering 005-os-shell-FR-054: opening About in both shells requests only `127.0.0.1`.

### Implementation for User Story 3

- [X] T071 [US3] Implement `mobileHome` and `shellChanged` in `packages/os-core/src/reducer.ts` (data-model.md, research R12). T065 passes.
- [X] T072 [US3] Wire Home, scroll and Back in `Os.tsx`, `Mobile.tsx` and `FullScreenView.tsx`, after T071 (research R11): `mobileOpen` pushes a history entry with the same URL and a marker in its state; `popstate` dispatches `mobileHome` with the view's `scrollTop`; Home calls `history.back()`, so its entry is used up; reopening restores `scrollTop` in a layout effect before paint; the home screen gets `inert` while an app is open.
- [X] T073 [US3] Switch shells while open in `Os.tsx`, after T071 (research R12): a `change` listener on `matchMedia(shellQuery(METRICS))` dispatches `shellChanged` and keeps `data-shell` on `<html>` in step; moving to desktop with a pushed entry calls `history.back()` and ignores the `popstate` it causes; the desktop never pushes an entry.
- [X] T074 [US3] Open About this site on mobile, in `HomeScreen.tsx` and `FullScreenView.tsx`, after T063: `button.about` dispatches `mobileOpen { view: 'about' }`; the full-screen view shows `About` without the shortcut list.
- [X] T075 [US3] Finish `packages/web/src/shells/mobile/mobile.css` for landscape and narrow widths: no horizontal scroll from 320 px to 1023 px in portrait and landscape; the header stays at the top while the view scrolls.
- [X] T076 [US3] Checkpoint, after T065 to T075: T065 to T070 pass with US1's and US2's tests; quickstart scenario 10 gives its expected results. Commit by area.
  - **Result (2026-10-27)**: T065 to T070 pass with US1's and US2's tests (20 files, 134 tests across `packages/web/test/shell` and `packages/os-core`). Scenario 10's steps are `shell-choice.test.ts` and `history.test.ts`. One test fault, fixed in the test: FR-002's "no navigation" counted Playwright's `framenavigated`, which also fires for R12's same-URL `pushState` and `history.back()`; it now counts page loads and checks the same document is still shown at `/`. T075: a sweep from 320 px to 1023 px in 37 px steps, at 812 px and 360 px high, found no horizontal scroll on the home screen, the CV app or About, and the header stayed at the top while the view scrolled; mobile.css needed no change.

**Checkpoint**: User Stories 1 to 3 work on their own

---

## Phase 6: User Story 4 - Operate both shells with a keyboard or a screen reader (Priority: P4)

**Goal**: Every desktop action works with the keyboard alone, with visible focus and no trap;
screen readers hear names, the focused window, opened apps and changes; the phone shell works
with an external keyboard and screen reader gestures.

**Independent Test**: at 1440 × 900 with the keyboard alone, do every action of US2 with a visible
indicator at each step; at 375 × 812, open the CV in at most 3 key presses and go home.

- [X] T077 [US4] Owner action, research R9 **Verify** (quickstart 8): for each of `Alt+Shift+M`, `D`, `N`, `W`, `H`, `F`, `P` and `S` (`Option+Shift` on a Mac), in the current Chrome, Edge, Firefox and Safari and with NVDA, JAWS and VoiceOver running, confirm the key reaches the page and the browser or screen reader does nothing of its own. Record the matrix here. If one clashes, design/wireframes.md and design/review.md change first (Constitution II), then `SHORTCUTS` (T085). If the owner defers this to the final testing phase, as 004's manual checks were, record that here; T078's reserved list then stands in until it's done.
  - BLOCKED: owner action (unattended run, 2026-10-27). The matrix needs the owner's browsers and screen readers. T078's reserved list (`packages/os-core/test/__fixtures__/reserved-shortcuts.json`) stands in until it's done, and T122 lists it if the owner defers it.
  - **Result (2026-10-28)**: the owner ran the eight shortcuts against a local build (`npm run serve`) and reports they all work: each reaches the page, and nothing clashed. No change to `SHORTCUTS` or the design.

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T078 [P] [US4] Write `packages/os-core/test/shortcuts.test.ts` and `packages/os-core/test/__fixtures__/reserved-shortcuts.json`, covering 005-os-shell-FR-029: the fixture lists the key combinations Chrome, Edge, Firefox, Safari, NVDA, JAWS, Narrator and VoiceOver reserve, each with its source document (research R9); every entry of `SHORTCUTS` has `Alt` and `Shift`, no Ctrl or Meta, and none is in the list; `matchShortcut` matches by `key` off a Mac and by `code` on a Mac (`Option+Shift+M` gives `key: 'Â'`, `code: 'KeyM'`), and returns `null` with Ctrl or Meta held; `shortcutLabel` gives `Alt+Shift+W` and `Option+Shift+W`; the eight are in data-model.md's order.
- [X] T079 [P] [US4] Write `packages/web/test/shell/keyboard.test.ts`, at 1440 × 900 with keys alone:
  - covers 005-os-shell-FR-024: every action of US2 done with keys alone; at each step the focused element has an indicator of 3:1 or more and isn't covered (T024's `focusIndicator`);
  - covers 005-os-shell-FR-025: from inside the CV content, `Alt+Shift+M`, `D` and `N` reach the menu bar's first title, the dock's first item and the next window; choosing Go to the menu bar and Go to the dock in the Window menu reaches the same places;
  - covers 005-os-shell-FR-026: `Alt+Shift+N` alternates two windows, bringing each to the front (US4 scenario 3);
  - covers 005-os-shell-FR-027: `Alt+Shift+P`, arrows and Enter move the window and announce it; Escape returns it to the start (US4 scenario 4);
  - covers 005-os-shell-FR-028: `Alt+Shift+W` closes the focused window; Tab reaches the close control, and Enter and Space each close;
  - covers 005-os-shell-FR-030: from any element, Tab and Shift+Tab reach the menu bar, every window and the dock within the page's element count; focus order in the CV follows reading order; Tab into a window behind brings it to the front (US4 scenario 7);
  - covers 005-os-shell-FR-062: `Alt+Shift+S`, arrows and Enter resize and announce; Escape restores; minimizing with the keyboard and none left shown moves focus to the CV dock item, and Enter there restores it (US4 scenario 10);
  - `describe('… (SC-002)')`: from first load, the open CV window is reached in at most 3 presses.
- [X] T080 [P] [US4] Write `packages/web/test/shell/screen-reader.test.ts`:
  - covers 005-os-shell-FR-039: `lang="en"`; the accessibility tree has `Menu bar`, `Desktop`, `Dock` and, on mobile, `Home screen`; each window is named by its app, and only the focused one is current;
  - covers 005-os-shell-FR-040: opening from the dock, a menu or the home screen focuses the window's or app's title; first load doesn't (US4 scenario 2);
  - covers 005-os-shell-FR-041: the status region reads `CV moved.`, `Move cancelled.`, `CV resized to W by H.`, `Resize cancelled.`, `CV maximized.` and `CV restored.` after each action;
  - covers 005-os-shell-FR-042: the title is `CV – <name>` with the CV focused, `About this site – <name>` with About, and `<name>` with none, in both shells.
- [X] T081 [P] [US4] Add to `packages/web/test/shell/mobile.test.ts`, covering 005-os-shell-FR-036 (SC-002): with keys alone at 375 × 812, open the CV in at most 3 presses, go home and open About, with a visible indicator at each step; after opening the CV at 1440 × 900 and narrowing to 375 px, each of the eight `Alt+Shift` shortcuts does nothing (the CV stays open full screen, focus doesn't move).
- [X] T082 [P] [US4] Write `packages/web/test/shell/targets.test.ts`, covering 005-os-shell-FR-037: every control in every state of both shells (driven as in T079 and T066) is at least 24 × 24 px, and Home is 44 × 44.
- [X] T083 [P] [US4] Add to `packages/web/test/shell/menus.test.ts` and `about.test.tsx`, covering 005-os-shell-FR-029 and 005-os-shell-FR-038: each menu command with a shortcut shows its label and carries `aria-keyshortcuts`; About on desktop lists all eight shortcuts and the two notes, and not on mobile; labels read `Option+Shift+…` with a Mac platform.

### Implementation for User Story 4

- [X] T084 [US4] Implement `SHORTCUTS`, `matchShortcut` and `shortcutLabel` in `packages/os-core/src/shortcuts.ts` and export them (data-model.md Shortcuts, research R9): ids `menu-bar` M, `dock` D, `next-window` N, `close` W, `minimize` H, `maximize` F, `move` P, `resize` S, with `needs` as the table gives. T078 passes.
- [X] T085 [US4] Add the shortcut listener to `packages/web/src/shells/desktop/Desktop.tsx`, after T084 (research R9, Constitution V): the shortcuts are desktop shell commands, so the listener lives in the desktop shell and is added and removed with it, and does nothing while the mobile shell is shown, even with windows kept in state after a shell switch. One `keydown` listener on the document calls `matchShortcut(event, mac)`; a shortcut whose `needs` isn't met does nothing; one that acts calls `preventDefault`; `menu-bar` and `dock` move focus to the first title or item; `mac` comes from `navigator.userAgentData?.platform`, falling back to `navigator.platform`, read after hydration only.
- [X] T086 [US4] Add roving focus and the Tab order to `MenuBar.tsx`, `Menu.tsx`, `Dock.tsx` and `Window.tsx`, after T085 (research R9, design/wireframes.md Tab order): the menu bar and the dock are one Tab stop each with a roving `tabindex`; Left and Right move between titles or items, Home and End to the ends; Enter, Space or Down open a menu; Enter or Space activate a dock item; Tab inside a menu closes it and moves on; `focusin` in a window that isn't focused dispatches `focus`; Escape never closes a window.
- [X] T087 [US4] Add keys to the pad in `Pad.tsx`, after T085 (FR-027, FR-062): arrows step by `step`, Shift+arrows by `bigStep`, Enter confirms, Escape cancels, Tab moves between the pad's buttons; `Alt+Shift+P` and `S` start a session with focus on the pad's first button.
- [X] T088 [US4] Show the shortcuts in `Menu.tsx` and `About.tsx`, after T084: each command with a shortcut shows `shortcutLabel` beside it and carries `aria-keyshortcuts`; About on desktop adds `Keyboard shortcuts`, a `dl` of the eight in `SHORTCUTS` order, and the two notes, in an element with `data-req="005-os-shell-FR-029"`. Labels read `Alt+Shift+…` in the pre-rendered page and switch on a Mac after hydration, changing text only.
- [X] T089 [US4] Style focus in `packages/web/src/os/shell.css`, `desktop.css` and `mobile.css` (design/wireframes.md Focus indicator, FR-024): a 2 px `color.focus-shell` outline, 2 px outside the element, everywhere in the shell; inside the CV, `/cv`'s own indicator; nothing in the shell hides a focused element (scroll padding in window content, windows never under the menu bar or dock).
- [X] T090 [US4] Checkpoint, after T077 to T089: T078 to T083 pass with every earlier test; quickstart scenario 6's keyboard part gives its expected results. Commit by area.
  - **Result (2026-10-27)**: T078 to T083 pass with every earlier test (24 files, 160 tests in `packages/web/test/shell` and `packages/os-core`). The full suite has 934 of 937 passing; the three failures are the expected ones (the two traceability self-checks until Phase 10, and the site check's performance test until US7). Scenario 6's keyboard part is `keyboard.test.ts`. T079 found two faults, fixed in the source:
    - **Tab skipped a window's controls** (T086): the title came after the controls in the DOM, so Tab from a focused title went straight to the content. `TitleBar.tsx` now puts the title first; the style sheet still centers it.
    - **Tab could go back and forth between two windows for ever** (FR-030): with DOM order following the stacking, Tab into the window behind raised it and put the other one after it again. `Desktop.tsx` now keeps the windows' DOM order while they are raised (a new window goes first, as it opens in front) and only `z-index` follows the stacking. This departs from contracts/shell.md's "front to back (DOM order = Tab order)", which now says so; design/wireframes.md's Tab order ("the open windows, front to back") holds until a window is raised. **The owner should confirm this reading of the design.**
  - Test-side changes: US2's checks of "in front" read `z-index` (`frontWindow` in `test/helpers/shell.ts`) rather than DOM order; `focusIndicator` measures against the element's shape, so a rounded control's perimeter is shorter than its box's (WCAG 2.4.13); `openShell` takes a `platform` to test `Alt` and `Option` labels. T089 added scroll padding to the window and full-screen content so a focused element keeps its whole outline.

**Checkpoint**: User Stories 1 to 4 work on their own

---

## Phase 7: User Story 5 - Reduced motion, high contrast and larger text (Priority: P5)

**Goal**: Windows and apps animate as designed, without movement or scaling under reduced motion;
every shell element stays visible in forced colors; zoom and text spacing cut nothing off.

**Independent Test**: with reduced motion, open and close the CV in both shells and confirm only
opacity changes; with forced colors, confirm every element in every state; at 200% zoom, text-only
zoom and 400% on 1280 px, confirm nothing is clipped.

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T091 [P] [US5] Write `packages/web/test/shell/motion.test.ts`, covering 005-os-shell-FR-046 (SC-009): opening, closing, minimizing, restoring and maximizing a window, opening a full-screen app and showing a menu animate over `motion.duration.fast`; with reduced motion, sampled frames (`element.getAnimations()` and computed `transform`) show no `transform` or `scale` change and only opacity animates; first load and hydration don't animate; a drag still follows the pointer (US5 scenarios 1, 2).
- [X] T092 [P] [US5] Write `packages/web/test/shell/modes.test.ts`, covering 005-os-shell-FR-047: with forced colors, windows, title bars, menus, the dock, the pad and the menu bar have a visible border; the focused window's border is thicker; each control's circle keeps an outline; open marks and focus outlines show; no element relies on a background image or color alone (US5 scenario 3).
- [X] T093 [P] [US5] Write `packages/web/test/shell/accessibility.test.ts`, covering 005-os-shell-FR-048: axe-core with the WCAG 2.2 A and AA tags finds nothing in each state of FR-048 in both shells (desktop: no app, CV, About, a menu, two windows, minimized, maximized, keyboard move, keyboard resize; mobile: home, CV, About, a menu-less About); 200% zoom of 1440 × 900 and 400% of 1280 px show the mobile shell with the CV readable and no horizontal scroll (US5 scenario 4); text-only zoom at 200% and 1.4.12 text spacing leave menu bar, dock, title bar and home screen labels unclipped and not overlapping (US5 scenario 5; 004's `clippedOrOverlapping`).

### Implementation for User Story 5

- [X] T094 [US5] Add motion in `packages/web/src/os/motion.ts` and use it in `Window.tsx`, `FullScreenView.tsx`, `Menu.tsx` and `Os.tsx`, after T012 (research R13): `animateIn(element)` and `animateOut(element)` with the Web Animations API, `METRICS.motionMs` and `MOTION_EASING`, keyframes opacity 0 to 1 and scale 0.96 to 1, or opacity only while `prefers-reduced-motion: reduce` matches (read at each call); used for opening, closing, minimizing, restoring and maximizing a window, opening a full-screen app and showing a menu; closing and minimizing wait for `finished` before dispatching; first load, hydration and shell switches don't animate; drags and keyboard moves never do.
- [X] T095 [US5] Add forced colors rules to `desktop.css`, `mobile.css` and `os/shell.css` (research R6, design/wireframes.md Forced colors): `@media (forced-colors: active)` borders on every window, title bar, menu, the dock, the pad and the menu bar; the focused window's border thicker and in `Highlight`; each control's circle outlined; open marks as filled and hollow shapes in `CanvasText`.
- [X] T096 [US5] Make the shell hold up at text-only zoom and text spacing, in `desktop.css` and `mobile.css`, after T093: the menu bar and title bars grow with their text (`min-block-size` from tokens, not a fixed height), dock names wrap rather than clip, and nothing overlaps. Fix whatever T093 reports, in the style sheets only.
  - **Result (2026-10-28)**: T093 reported nothing to fix at 200% text-only zoom or with 1.4.12 text spacing: the menu bar and title bars already take `min-block-size` from tokens and dock names wrap (`overflow-wrap: anywhere`). No style sheet changed. The test's detector does report clipped and overlapping labels at 600%, so it isn't vacuous.
- [X] T097 [US5] Checkpoint, after T091 to T096: T091 to T093 pass with every earlier test; quickstart scenario 7 gives its expected results in Chromium. Commit by area.
  - **Result (2026-10-28)**: T091 to T093 pass with every earlier test (27 files, 177 tests in `packages/web/test/shell` and `packages/os-core`; 951 of 954 in the full suite, the three failures being the expected ones: the two traceability self-checks until Phase 10, and the site check's performance test, now failing only on offline `/` still expected to redirect, until US7). The site check's `modes` part now passes on `/`. Scenario 7's Chromium equivalents are `motion.test.ts` (reduced motion, drags), `modes.test.ts` (forced colors) and `accessibility.test.ts` (400% zoom; text-only zoom emulated by doubling each element's computed font size, as Chromium has no text-only zoom). Firefox's real text-only zoom and Edge's contrast themes stay with T122. Findings fixed in the source:
    - **No focus indicator after a shortcut that followed a click** (FR-024): Chrome doesn't count a key pressed with Alt as keyboard use for `:focus-visible`, so `Alt+Shift+M`, `D` and `N` after a click moved focus with no outline. `src/os/focus.ts` now tracks whether a key came last and moves focus with `focus({ focusVisible: true })` then (`moveFocus`, used by `focusTarget`, `focusMenuBar` and `focusDock`). A test in `keyboard.test.ts` covers it.
    - **Forced colors** (T095): the wallpaper's gradients removed; the focused window's border thick and in `Highlight`; each control's circle bordered; the open marks drawn in `CanvasText` with `forced-color-adjust: none` (filled and hollow); the open menu's title bordered in `Highlight` (its padding shrinks by the border, so nothing moves); the focused menu item outlined; link menu items (`a.menu-item`) underlined, as the site check asks of every link.
  - Test-side changes: `settle` in `test/helpers/shell.ts` waits for running animations, and US1 to US4 tests that check a window gone or hidden right after closing or minimizing now wait for it; `openShell` takes `deviceScaleFactor` (browser zoom) and `beforeGoto` (the motion test's recording init script).

**Checkpoint**: User Stories 1 to 5 work on their own

---

## Phase 8: User Story 6 - Open the shell and the CV offline (Priority: P6)

**Goal**: After one visit to `/` or `/cv`, the root opens offline in either shell with the CV app's
full content and the site's fonts, and an update never interrupts an open shell.

**Independent Test**: quickstart scenario 9.

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T098 [P] [US6] Write `packages/web/test/shell/offline.test.ts`:
  - covers 005-os-shell-FR-052: after one visit to `/`, and separately after one visit to `/cv` only, `/` opened offline at 375 × 812 and 1440 × 900 shows the shell complete (icons, wallpaper, styles) and opens the CV app with every field of `expectedFields(resume)`, with text in the site's fonts (`document.fonts`) (US6 scenarios 1, 2);
  - covers 005-os-shell-FR-053: with version A open and version B installed, nothing reloads, the CV window stays open, and a font first used after the update still loads; the next visit shows B (US6 scenario 3); with service workers blocked, the shell works and shows no error.

### Implementation for User Story 6

- [X] T099 [US6] Make the root offline-ready, after T098 (research R14, contracts/site.md Service worker): confirm the worker's precache (every built file) holds `index.html` at `/` with status 200 and both `os` assets, and that a failed navigation to `/` answers the stored page, with no change to `packages/web/src/sw/service-worker.ts`. If T098 finds a gap, fix it in `ShellPage.tsx` or `build-site.ts` first (for example a missing font preload), and change the worker only if the gap is there, recording why here.
  - **Result (2026-10-28)**: no gap. T098's tests show the precache holds `/` (after a visit to `/cv` only, `/` opens offline in both shells with the CV app's every field, the wallpaper, the icons and every text in the site's fonts) and that the open shell needs nothing more after an update (every font face loads with the network dropping connections). `packages/web/src/sw/service-worker.ts`, `ShellPage.tsx` and `build-site.ts` are unchanged.
- [X] T100 [US6] Checkpoint, after T098 and T099: T098 and 004's offline tests pass; quickstart scenario 9 gives its expected results. Commit by area.
  - **Result (2026-10-28)**: T098 (4 tests) and 004's offline tests pass, with 004's link, server HTML and site check no-script and offline tests, which share the readers changed here. Scenario 9's steps are `shell/offline.test.ts`: the one-visit cases at 375 and 1440 px from `/` and from `/cv`, and the update case with a rebuilt copy. Test-side changes: 004's switchable server and offline steps moved from `test/offline.test.ts` to `test/helpers/offline.ts`, unchanged, for both tests; the site check's `mainSequence` takes an optional root selector (`main` by default), since the shell's CV app isn't the page's first `main` (T110's `cv-app` part reuses it); the update case builds a whole copy of the repository for version B, as 004's `version()` rebuilds only `/cv`.

**Checkpoint**: User Stories 1 to 6 work on their own

---

## Phase 9: User Story 7 - Every pull request proves the shells work (Priority: P7)

**Goal**: `npm run site-check` covers the root in both shells and every state, names the shell,
state and width in every failure, and fails on each seeded break.

**Independent Test**: run the seeded breaks of T103 and confirm each fails its part with a clear
message; `npm run site-check` passes on the real build.

### Tests for User Story 7 (REQUIRED) ⚠️

> The check's tests on the root use the real build or a temporary copy of the repository (004's
> `copy.ts`) with one change, not hand-written fixtures (see Notes).

- [X] T101 [P] [US7] Write `tools/site-check/test/shell-states.test.ts`:
  - covers 005-os-shell-FR-048: on the real build, the driver reaches every state of data-model.md's Shell state list from a fresh page, by real input, and each state's DOM shows it (two windows, a menu open, the pad, …);
  - covers 005-os-shell-FR-056: the report lists `/` under `accessibility` in every desktop state at 1440px and every mobile state at 375px, under `lighthouse` on both profiles, and under `other-sites` with the CV app open.
- [X] T102 [P] [US7] Write `tools/site-check/test/cv-app.test.ts`:
  - covers 005-os-shell-FR-006 and 005-os-shell-FR-058: on the real build the `cv-app` part passes in both shells, and its expected fields come from `expectedFields(resume)`; in a temporary copy whose CV app leaves out `work[0].position`, the part fails with `cv-app / <shell>/cv-app/<width>px missing-field work[0].position: …` for both shells (US7 scenario 1); a copy with two sections swapped gives `out-of-order`.
- [X] T103 [P] [US7] Write `tools/site-check/test/shell.test.ts`, covering 005-os-shell-FR-057: on the real build the `keyboard` part passes its desktop and mobile flows; in temporary copies with one change each, the matching part fails with contracts/cli.md's line: the close control's name removed (`accessibility`, `axe:button-name`), the close shortcut's handler removed (`keyboard`, `shortcut Alt+Shift+W` or `focus-target` naming the step) (US7 scenario 2), a font loaded from another site (`other-sites`), and a minimized window's focus sent to `body` (`keyboard`, `focus-target`).
- [X] T104 [P] [US7] Extend the part tests in `tools/site-check/test/offline.test.ts`, `no-script.test.ts`, `other-sites.test.ts` and `cli.test.ts`:
  - covers 005-os-shell-FR-059 (`offline.test.ts`): a copy whose worker doesn't store the `os` script fails on `/` offline at both widths, naming the shell and the width;
  - covers 005-os-shell-FR-049 (`no-script.test.ts`): a copy whose root shows the dock with scripting off fails with `visible-control`;
  - covers 005-os-shell-FR-054 (`other-sites.test.ts`): a copy whose root loads a script from another site fails with the root's variant;
  - covers 005-os-shell-FR-060 (`cli.test.ts`): `npm run --silent site-check` and the CI step in `.github/workflows/ci.yml` run the same command; every problem line on `/` has a `<shell>/<state>/<width>px` variant; two runs on the real build give the same report (US7 scenario 3).
- [X] T105 [P] [US7] Extend `tools/site-check/test/lighthouse.test.ts` with `describe('… (SC-003)')`, off CI (`test.skipIf(process.env.CI)`): on the real build's root under the mobile profile, the CV icon is inside the first contentful paint's viewport and FCP is under 2,500 ms.
- [X] T106 [P] [US7] Change `tools/site-check/test/performance.test.ts` (SC-010): `npm run site-check` on the real repository exits 0 in under 480,000 ms, with an 9-minute test timeout, still `test.skipIf(process.env.CI)`.

### Implementation for User Story 7

- [X] T107 [US7] Add the `cv-app` part and the new problem types to `tools/site-check/src/report.ts` (contracts/cli.md Parts, data-model.md Site check results): `PARTS` gains `'cv-app'` right after `'content'`; the `variant` comment lists `<shell>/<state>/<width>px`; the problem types `focus-target`, `shortcut`, `trapped` and `moved` render as contracts/cli.md's examples.
- [X] T108 [US7] Create the state driver in `tools/site-check/src/shell-states.ts` (research R17): `SHELL_STATES`, the desktop states `first-load`, `no-window`, `about`, `two-windows`, `site-menu`, `window-menu`, `minimized`, `maximized`, `keyboard-move`, `keyboard-resize` at 1440 × 900 and the mobile states `home`, `home-landscape`, `cv-app`, `about` at 375 × 812 (812 × 375 for `home-landscape`); `reachState(page, state)` gets there from a fresh page by real clicks and keys after `#os[data-ready]`, never through a hook; `stateVariant(shell, state, width)` gives `<shell>/<state>/<width>px`.
- [X] T109 [US7] Run the root per shell and state in `tools/site-check/src/check.ts`, after T107 and T108 (contracts/cli.md): when the manifest lists `/` as a page, every part but `print` runs on it with its shell variants; `accessibility` in every state, `fonts` in `desktop/two-windows` and `mobile/cv-app`, `other-sites` with the CV app open in both shells, `lighthouse` on both profiles; the root's status is 200 in `pages`. When the manifest still redirects `/`, the check behaves as 004's (see Notes).
- [X] T110 [US7] Create `tools/site-check/src/parts/cv-app.ts`, after T107 (contracts/cli.md, FR-058): opens the CV app in each shell (the window open on first load; one tap on the CV icon) and compares its fields, in order, with `expectedFields(resume)`, reusing the `no-script` part's field sequence; problems `missing-field` and `out-of-order` with the field's JSON path.
- [X] T111 [US7] Add FR-057's flows to `tools/site-check/src/parts/keyboard.ts`, after T108: at 1440 × 900 with keys alone, reach the CV window open on first load, close it, open the CV from the dock, open About from the menu bar, switch windows, move one, cancel a move, resize one, cancel a resize, minimize and restore one, maximize and restore one, and close both, checking a visible indicator and the focus targets of FR-023 and FR-063 at each step; at 375 × 812, open the CV, go home with Home, open it again, go home with Back, and check focus lands on the CV icon each time. Problems `focus-target` (naming the step and the expected target), `shortcut` and `trapped`.
- [X] T112 [P] [US7] Extend `tools/site-check/src/parts/no-script.ts`, `offline.ts`, `other-sites.ts`, `fonts.ts`, `layout.ts` and `lighthouse.ts` for the root, after T109, as contracts/cli.md's Parts table says: the no-script page's name, link, style sheet and no visible control; offline after a visit to `/` and to `/cv` only, at both widths, opening the CV app with every field in the site's fonts; requests while loading `/` and opening the CV app in both shells; served faces in the two states; the CV window narrowed to 400 px, 200% and 400% zoom, and text-only zoom; Lighthouse on `/` with both profiles.
- [X] T113 [US7] Extend `tools/site-check/src/parts/modes.ts`, after T108 (FR-046, FR-047): forced colors on the root (borders on windows, menus, dock, pad and menu bar; the focused window distinguishable); reduced motion while opening and closing the CV app and About, minimizing, restoring, maximizing and opening a menu, reporting `moved` for any element that moves or scales.
- [X] T114 [US7] Update the committed sample and its notes in `tools/site-check/test/__fixtures__/seeded/expected-report.txt` and `tools/site-check/test/__fixtures__/README.md`: regenerate the report by the README's steps for the new `cv-app` line in the summary, run it twice to confirm it doesn't change, and note in the README that root-page cases use copies of the real build.
- [X] T115 [US7] Checkpoint, after T101 to T114: every site check test passes; `npm run site-check` prints `Site check: PASSED` with the root listed under every part but `print`. Commit as `feat(site-check): …` and `test(site-check): …`.
  - **Result (2026-10-28)**: every site check test passes (16 files, 92 tests, with the full run on the real repository in the performance test). `npm run site-check` prints `Site check: PASSED`, 12 of 12 parts, in 95 s on the owner's machine, with `/` listed under every part but `print` (and `content`, which has no page). Lighthouse on `/`: mobile performance 99, desktop 100, every other category 100. The seeded breaks (T102 to T104) each fail their part with contracts/cli.md's line: `missing-field work[0].position` and `out-of-order` in both shells; `axe:button-name` in the desktop states; `shortcut Alt+Shift+W: the CV window did not close`; `focus-target step … "minimize the CV window": focus went to body`; `other-site-request` for a remote font and a remote script in both shells; `not-ready #os` offline at both widths without the `os` script stored; `visible-control button.dock-item` with scripting off. Run without reduced motion, T113's check reports the windows, the menu and the full-screen apps scaling, so it isn't vacuous. Choices made here:
    - With no shell at the root (004's fixtures, which keep their redirect), `cv-app` has no CV app to open: it passes with nothing measured and keeps its line in the summary. `seeded/expected-report.txt` gains that line (`1 of 12 parts passed`), and the README says the seeded sample has a problem in every part but `cv-app`.
    - The root's no-script page puts its text in `main`, which gets /cv's body font; `unstyledDetail` takes the element to read the font from (the body by default).
    - The check works out the site's name itself (the CV's name, else the site heading), since `format/meta.ts` imports a `.tsx` module plain Node can't load.
    - The root's tests use `test/helpers/root.ts` (the real build laid out as a repository, or a copy of the repository with one source change, built), added to plan.md's Dependencies table.

**Checkpoint**: All user stories are independently functional

---

## Phase 10: Polish & Constitution Verification

**Purpose**: Traceability, the audits, speed, the full verification, the owner's manual checks and
the single PR

- [X] T116 [P] Write `packages/web/test/shell/data-req.test.tsx`, covering 005-os-shell-FR-055: every target in contracts/shell.md's structure carries its IDs in the rendered root (desktop with two windows, a menu and the pad open; mobile with an app open), and every `005-os-shell-FR-###` in a `data-req` names an existing requirement.
  - **Result (2026-10-28)**: passes. Writing it found one target without its ID: the phone's `div.view-content` now carries FR-034, as contracts/shell.md says. The contract's row for the resize handles now names their container, `div.resize-handles`, which carries FR-061 once for its eight handles.
- [X] T117 Run `npm run traceability`, after T116 (Constitution III, SC-010): it exits 0 and its last line is exactly `PASS: all 246 active requirements in 5 approved specs are covered.` That's 29 from 001, 36 from 002, 58 from 003, 57 from 004 (FR-018 and FR-038 removed, FR-059 added) and 66 from 005. Every row of Requirement Coverage below has a passing test.
  - **Result (2026-10-28)**: exits 0, last line `PASS: all 246 active requirements in 5 approved specs are covered.` Every coverage row's test passes in T120's full run.
- [X] T118 [P] Verify research R18 (**Verify**): on the real build, the root's compressed script, style sheet and HTML are near 85 KB, 8 KB and 15 KB, and Lighthouse's mobile Performance on `/` is 90 or more (SC-004). If it isn't, apply the first fallback: render the inactive shell as an empty placeholder with `suppressHydrationWarning` on the client, so only the active shell hydrates, then measure again. Record both here.
  - **Result (2026-10-28)**: no fallback needed. On the real build the root's script is 87.5 KB with gzip (75.7 KB with Brotli), its style sheet 7.8 KB (6.8 KB), and `index.html` 6.2 KB (5.0 KB): the HTML is well under the estimate, the rest near it. Lighthouse's mobile Performance on `/` is 99 (desktop 100), the median of three runs in `npm run site-check`; the median first contentful paint is under 2,500 ms with the CV icon in the first paint (T105).
- [X] T119 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/os-core/`, `packages/web/` and `tools/site-check/`:
  - **X**: no package added; `react-dom/client` ships on the root only; the abstractions added are exactly plan.md's Dependencies table (add any helper this list created to it, with its reason); no agent skill added.
  - **IV**: `npm run content-check` and `npm run token-check` pass with no exception or skip marker for the shell; `site-text.ts` holds no CV fact and no design value (the pad's step legends are patterns); no script reads a token outside `metrics.ts`; `os-core` imports nothing it mustn't.
  - **V**: each app declares its shells beside its code; both shells read `APPS` through `appsFor`.
  - **VII**: the desktop paints the CV from HTML before any script; nothing is in front of it; `/cv` ships no React.
  - **IX**: no Apple or system font, the icons are the mockup's own SVG, and the controls are one neutral color.
  - **Result (2026-10-28)**: passes.
    - **X**: no dependency added; the only package change is the workspace `@cv/os-core` (no dependencies). `react-dom/client` is imported only by `src/client/os.tsx`, the root's entry; `/cv` and the not-found page load only `register-sw`. plan.md's Dependencies table now also lists the root test helpers (`tools/site-check/test/helpers/root.ts`), with the rows for `focus.ts`, `View.tsx`/`shell-props.ts`, `frame-batch.ts` and the offline test helpers added during the build. No agent skill was added (`.claude/` is unchanged against `main`).
    - **IV**: `content-check` and `token-check` pass, with no exception or skip marker in `packages/web/src` or `packages/os-core/src`. Only `src/os/metrics.ts` reads `@cv/tokens` from a script (the style sheets use custom properties). `os-core` imports only its own modules.
    - **V**: the CV app declares `shells: ['desktop', 'mobile']` in `src/apps/cv/app.tsx`; the dock and the home screen list apps through `appsFor(apps, shell)`.
    - **VII**: the CV window is in the server's HTML and paints before the script (US1's tests and T105); nothing covers it on first load (quickstart 1 below); `/cv` ships no React.
    - **IX**: no Apple or system font in the source; the icons are inline SVG; the three window controls share `color.control` and `color.control-focused`.
- [X] T120 Run the full verification, after T117 to T119: `npm run typecheck`, `npm test` (now including 001's self-check), `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with every Lighthouse category at 90 or more for `/` and `/cv` on both profiles, in under 8 minutes (SC-004, SC-010).
  - **Result (2026-10-28)**: all exit 0. `npm run typecheck`; `npm test`: 112 files, 997 tests, including 001's self-check; `content-check`; `token-check`; `traceability` (246 of 246); `npm run site-check`: PASSED, 12 of 12 parts, in 95 s, every Lighthouse category 99 or 100 for `/` and `/cv` on both profiles.
  - **CI (PR #23, first run)**: `test` and `site` failed on Linux, where the passes above came from macOS: the window titles' focus indicator measured 458 changed pixels for 463 needed. Linux rounds glyph advances to whole pixels, so a title can be an odd whole width (95 px for About this site), and `translate: -50%` put it half a pixel off the grid, drawing the outline's sides at half strength. Forcing a 95 px title reproduces the exact numbers on macOS. Fixed in `desktop.css`: the title is centered by its insets and auto margins, with no transform; a 95 px title then measures 512. A new test in `shell/keyboard.test.ts` forces odd and even title widths, so any platform catches it. The full suite passes again (998 tests).
- [X] T121 Run quickstart.md scenarios 1 to 5 and 9 to 11, and record any deviation here. Write scratch output to the scratchpad. Scenario 11 edits files: revert each change with `git checkout`. Scenarios 6 to 8 are T122. Skip scenario 12: it's the interim provision's follow-up.
  - **Result (2026-10-28)**: no deviation. The by-hand steps were run as Chromium scripts on the real build (scratch output outside the repository):
    - 1: `dist/site/` holds `index.html`, `cv.html`, `404.html`, `sw.js` and `assets/` with `os-<hash>.js` and `.css`. At 1440 × 900 the CV window is focused at x 220, y 56, 1000 × 716, with nothing in front; at 375 × 812 the home screen shows the CV icon and its name, and one tap opens the CV full screen. `/index.html` answers 404; the address stays `/` through closing, opening and the phone's app. The screenshots match the mockup's first-load and home states; the full design comparison is T122's.
    - 2: covered by US2's tests; spot checks: the menu bar names About this site when it's focused, and `Alex Profir` when no window is left.
    - 3 and 4: T120.
    - 5: with scripting off at 1440 and 375 px, the name, the sentence, `Read the CV` → `/cv` and the footer, in /cv's look, with no button, menu or dock shown.
    - 9: covered by `shell/offline.test.ts` (T098) and the site check's `offline` part on `/`; the by-hand run in a real browser stays with T122.
    - 10: with the CV open, desktop → phone → desktop keeps it open (full screen, then a focused window), and from the phone width the same; with nothing open the desktop becomes the home screen and back; after switching to desktop with the CV open, one Back leaves the site.
    - 11: done in a temporary copy of the repository rather than with edits reverted by `git checkout`, so the working tree never changed: `basics.name` set to another name changes the title, the CV window's heading, the menu bar's name, About this site and the home screen; `size.window-min-width` set to 600 in the token export, the output regenerated and the site rebuilt, a keyboard resize stops at 600 px.
- [X] T122 Owner action, by hand, before the PR merges (spec Assumptions, quickstart 6 to 8): screen readers on a desktop and a phone (SC-005), reduced motion, forced colors in Edge and text-only zoom in Firefox, and the shortcut matrix if T077 was deferred; and the design comparison of every state against `design/mockup/` (FR-045). Record each result here and in the PR. Under Constitution 1.3.0's interim provision on deferred manual checks, the owner may defer them to the final testing phase shared with 004's manual checks: record that here, list each deferred check in the PR and leave the task open.
  - BLOCKED: owner action (unattended run, 2026-10-28). Screen readers on a desktop and a phone, reduced motion, forced colors in Edge, text-only zoom in Firefox, the shortcut matrix (T077) and the design comparison of every state against `design/mockup/` need the owner's devices and eyes. Their Chromium equivalents pass (T120, T121). The owner either runs them or defers them to the final testing phase shared with 004's manual checks; T123's PR lists each one.
  - **Result (2026-10-28)**: the owner ran the checks against a local build and reports they pass. The design comparison found two focus indicator faults, fixed the same day: in a menu, the focused item's outline covered the menu's edge and the next item, and the item under the pointer was filled as well; and a window's content that took focus drew its outline under the title bar and over the window's edge. The owner also found the content's scroll bar square at the window's rounded corner in Safari. The pointer now moves focus in a menu (`Menu.tsx`); a menu item's outline sits on its edge, with 2 px between items and 6 px of menu padding; the whole window shows the outline when its content has focus; and the content is clipped to the window's corner (`desktop.css`). `tools/site-check/test/shell.test.ts`'s menu mutation follows the new selectors; the site check and every test pass. design/wireframes.md's focus indicator row and design/review.md record it first (Constitution II).
- [X] T123 Commit the remaining work with Conventional Commits, push `005-os-shell` and open one pull request to `main` (Constitution XI):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/005-os-shell/spec.md` and `specs/005-os-shell/tasks.md`; records the 004 amendment (T005) and the token rename (T004); records that the 85 tokens were written by hand under Constitution 1.2.0's interim provision and that **the provision's follow-up pull request is still pending** (research R19); and records the results of T077, T118, T121 and T122, listing every manual check deferred under Constitution 1.3.0's interim provision.
  - Confirm `traceability`, `test`, `content`, `tokens` and `site` run and pass, and that the `site` job summary matches a local `npm run site-check` on the same commit (FR-060). Merging is the owner's.
  - **Result (2026-10-28)**: pushed `005-os-shell` and opened PR #23. The first CI run failed `test` and `site` on Linux (see T120's CI note); after the fix (`07c03d7`), `traceability`, `test`, `content`, `tokens` and `site` all pass, and the `site` job's report matches a local `npm run site-check` on the same commit once Lighthouse scores are masked. Merging is the owner's, after T005, T077 and T122.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **Design gate**: T003 comes before every task that creates or changes UI (T015 onward)
- **004 amendment**: T005 (owner approval) comes before T007 and T017, so the root changes only
  after 004's spec does (FR-051)
- **User Stories (Phase 3+)**: All depend on Phase 2. In priority order:
  - US1 (P1) has no dependency on other stories.
  - US2 (P2) needs US1's desktop shell (T042, T043).
  - US3 (P3) needs US1's mobile shell (T044, T045), and About (T063) for T069 and T074.
  - US4 (P4) needs US2's menus, windows and pad, and US3's mobile flows.
  - US5 (P5) needs the elements it animates and styles: US1 to US3.
  - US6 (P6) needs US1 only; it can run beside US2 to US5.
  - US7 (P7) needs every state it drives: US1 to US5.
- **Polish (Phase 10)**: Depends on every story

### Within Each User Story

- Tests are written first and fail before implementation
- `os-core` (tests, then geometry, then the reducer) before the components that dispatch to it
- Tokens and site text (Phase 2) before components; markup before style sheets
- The shared reducer file (`packages/os-core/src/reducer.ts`) and its test file are changed by
  each story in turn, never in parallel

### Parallel Opportunities

- Phase 2: T006, T008, T009, T010 and T011 together; T019 and T020 together
- Every test task marked [P] within a story can run together
- US1: T039 and T040 (app declaration and icons) together; desktop (T042, T043) and mobile (T044,
  T045) can run in parallel once T038 is done
- US6 can run beside US2 to US5 after US1
- US7: T112's part changes together once T109 is done

---

## Parallel Example: User Story 1

```bash
# Launch the core and shell tests for User Story 1 together:
Task: "Write the first cases of packages/os-core/test/reducer.test.ts (FR-005, FR-012, FR-023, FR-032, FR-040)"
Task: "Write the CV cases of packages/os-core/test/geometry.test.ts (FR-005, FR-018)"
Task: "Write packages/web/test/shell/first-load.test.ts (FR-004, FR-005)"
Task: "Write packages/web/test/shell/cv-app.test.ts (FR-006 to FR-009, SC-003)"
Task: "Write packages/web/test/shell/no-script.test.ts (FR-049)"

# Then the desktop and mobile shells together:
Task: "Build the desktop shell's markup in packages/web/src/shells/desktop/"
Task: "Build the mobile shell's markup in packages/web/src/shells/mobile/"
```

## Parallel Example: User Story 2

```bash
# Launch the tests for User Story 2 together:
Task: "Add to packages/os-core/test/geometry.test.ts (FR-018, FR-021, FR-061, FR-065)"
Task: "Write packages/os-core/test/invariants.test.ts (FR-017)"
Task: "Write packages/web/test/shell/dock.test.ts (FR-011, FR-012)"
Task: "Write packages/web/test/shell/menus.test.ts (FR-013 to FR-015)"
Task: "Write packages/web/test/shell/windows.test.ts (FR-010, FR-016 to FR-023, FR-061, FR-063 to FR-065)"
```

## Parallel Example: User Story 7

```bash
# Launch the check's tests together:
Task: "Write tools/site-check/test/shell-states.test.ts (FR-048, FR-056)"
Task: "Write tools/site-check/test/cv-app.test.ts (FR-006, FR-058)"
Task: "Write tools/site-check/test/shell.test.ts (FR-057)"

# Then, after check.ts runs the root, the part changes together:
Task: "Extend no-script, offline, other-sites, fonts, layout and lighthouse for the root"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational, including the design gate and the owner's approval of the 004
   amendment (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: the root shows the CV open on desktop and one tap away on mobile, and
   links to `/cv` without scripts
5. Demo locally with `npm run serve`

### Incremental Delivery

1. Setup + Foundational → the root is a page with a stub shell, `/cv` unchanged
2. US1 → the CV in zero clicks or one tap (MVP)
3. US2 → desktop windows by pointer
4. US3 → the phone shell complete, and shell switching
5. US4 → keyboard and screen readers
6. US5 → motion, forced colors, zoom
7. US6 → offline (can come any time after US1)
8. US7 → the site check covers it all on every pull request

All stories ship in the feature's single PR (Constitution XI); the increments above are
checkpoints within it.

---

## Requirement Coverage

Every FR in spec.md and the test task that covers it:

| Requirement | Test task(s) |
|-------------|--------------|
| 005-os-shell-FR-001 | T007, T019, T030 |
| 005-os-shell-FR-002 | T065, T068 |
| 005-os-shell-FR-003 | T020, T031 |
| 005-os-shell-FR-004 | T029 |
| 005-os-shell-FR-005 | T027, T028, T029 |
| 005-os-shell-FR-006 | T032, T102 |
| 005-os-shell-FR-007 | T032 |
| 005-os-shell-FR-008 | T032, T056 |
| 005-os-shell-FR-009 | T032 |
| 005-os-shell-FR-010 | T054 |
| 005-os-shell-FR-011 | T052 |
| 005-os-shell-FR-012 | T027, T052 |
| 005-os-shell-FR-013, FR-014, FR-015 | T053 |
| 005-os-shell-FR-016 | T054 |
| 005-os-shell-FR-017 | T049, T051, T054 |
| 005-os-shell-FR-018 | T028, T050, T054 |
| 005-os-shell-FR-019 | T054 |
| 005-os-shell-FR-020 | T049, T054 |
| 005-os-shell-FR-021 | T050, T054 |
| 005-os-shell-FR-022 | T054 |
| 005-os-shell-FR-023 | T027, T049, T054 |
| 005-os-shell-FR-024, FR-025, FR-028, FR-030 | T079 |
| 005-os-shell-FR-026 | T049, T079 |
| 005-os-shell-FR-027 | T049, T079 |
| 005-os-shell-FR-029 | T078, T083 |
| 005-os-shell-FR-031, FR-033, FR-035 | T066 |
| 005-os-shell-FR-032 | T027, T066 |
| 005-os-shell-FR-034 | T065, T066 |
| 005-os-shell-FR-036 | T081 |
| 005-os-shell-FR-037 | T082 |
| 005-os-shell-FR-038 | T055, T069, T083 |
| 005-os-shell-FR-039, FR-041, FR-042 | T080 |
| 005-os-shell-FR-040 | T027, T080 |
| 005-os-shell-FR-043 | T033 |
| 005-os-shell-FR-044, FR-045 | T035 |
| 005-os-shell-FR-046 | T091 |
| 005-os-shell-FR-047 | T092 |
| 005-os-shell-FR-048 | T093, T101 |
| 005-os-shell-FR-049 | T034, T104 |
| 005-os-shell-FR-050 | T007, T067 |
| 005-os-shell-FR-051 | T006 |
| 005-os-shell-FR-052, FR-053 | T098 |
| 005-os-shell-FR-054 | T036, T070, T104 |
| 005-os-shell-FR-055 | T116 |
| 005-os-shell-FR-056 | T101 |
| 005-os-shell-FR-057 | T103 |
| 005-os-shell-FR-058 | T102 |
| 005-os-shell-FR-059 | T104 |
| 005-os-shell-FR-060 | T104 |
| 005-os-shell-FR-061 | T050, T054 |
| 005-os-shell-FR-062 | T049, T079 |
| 005-os-shell-FR-063, FR-064, FR-065 | T049, T054 |
| 005-os-shell-FR-066 | T033 |

Success criteria:

| Criterion | Task(s) |
|-----------|---------|
| SC-001 | T029 |
| SC-002 | T079, T081 |
| SC-003 | T032, T105 |
| SC-004 | T112, T118, T120 |
| SC-005 | T093, T122 (by hand) |
| SC-006 | T102 |
| SC-007 | T098 |
| SC-008 | T036, T070 |
| SC-009 | T091, T113 |
| SC-010 | T106, T117, T120 |
| SC-011 | T003, T035 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- The coverage table abbreviates IDs, but test titles always carry the full `005-os-shell-FR-###`
  form.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md).
- T005, T077 and T122 are the owner's. T123 pushes and opens the PR; merging is the owner's.
- **Choices made here that the design documents don't fix**. If the owner prefers otherwise,
  change the plan or contract first:
  - **Root-page fixtures** (T101 to T104, T109): the check's tests on the root use the real build
    or a temporary copy of it with one change, not hand-written fixtures, since a hand-written
    shell would have to pass every keyboard flow. 004's hand-written fixtures keep their redirect
    at `/`, and the check treats a redirect at `/` as 004 did, so they keep testing what they
    test. Only the real site's manifest lists `/` as a page.
  - **Where the session reducer lives** (T049, T058): keyboard move and resize sessions are built
    in US2, because the pad's single clicks (FR-020) use them; US4 adds the keys.
  - **Placement before measuring** (T022): the pre-rendered CV window's state geometry is zero
    until `hydrated`, while CSS places it (research R3). The invariants apply once `area` is set.
  - **`fill()` in `site-text.ts`** (T010): the one function that fills placeholders lives beside
    the text it fills.
  - **`MOTION_EASING`** (T012): the easing is a string, so it sits beside `METRICS` rather than in
    the numeric `Metrics` type, still read only in `metrics.ts`.

---

## Phase 11: Convergence

- [X] T124 CRITICAL: Owner action: confirm or reject the desktop Tab order T090 shipped. Windows keep their DOM order when raised and only `z-index` follows the stacking (`domOrder` in `packages/web/src/shells/desktop/Desktop.tsx`), so after a raise Tab no longer visits the open windows "front to back" as item 2 of design/wireframes.md's "Tab order on desktop" says. T090 asked the owner to confirm this reading, but no task tracks it and design/review.md has no entry for it. If confirmed: amend item 2 in `design/wireframes.md` and add a dated entry under "Changes after sign-off" in `design/review.md`, in a `docs:` commit. If rejected: the owner picks a Tab order that never loops between two windows (FR-030), the design records it first, then `Desktop.tsx` and contracts/shell.md follow, per Constitution II (contradicts)
  - BLOCKED: owner action (unattended run, 2026-10-28). Confirming or rejecting the shipped Tab order is the owner's decision, and the design changes first either way (Constitution II). The design files and `Desktop.tsx` stay as they are until then.
  - **Result (2026-10-28)**: the owner confirms the shipped order. Item 2 of design/wireframes.md's "Tab order on desktop" now says the windows go newest first, and design/review.md has a dated entry. contracts/shell.md already says so; no code changes.
- [X] T125 Move the window and full-screen opening scale into a token. `START_SCALE = 0.96` in `packages/web/src/os/motion.ts` (design/wireframes.md's "grow from 96%") is a design value written as a literal in a script, outside `metrics.ts`. Add it to the proposed tokens in `design/mockup/README.md` (`docs:` commit) and to `packages/tokens/penpot/tokens.json` as a Penpot `number` token, in Penpot's form, then run `npm run token-output`. Read it in `src/os/metrics.ts` beside `MOTION_EASING`, throwing at import when it isn't a plain number, and use it in `motion.ts`. Add it to `test/tokens.test.ts`'s every-token-is-read case. `token-check` and `motion.test.ts` still pass, per FR-045 (contradicts)
  - **Result (2026-10-28)**: `scale.open-start` (`number`, `0.96`) is in the export's `base` set and the README's proposed tokens (`2b6261a`). `metrics.ts` reads it as `MOTION_START_SCALE`, throwing when it isn't a plain number; `motion.ts` uses it and `motion.test.ts` reads the token rather than `0.96`. `token-check`, `tokens.test.ts` and `motion.test.ts` pass (`e2bc77a`).
- [X] T126 Keep About this site's whole box off every shown window's title bar when it opens, in `placeWindow` (`packages/os-core/src/geometry.ts`). Today the loop only checks title bar against title bar. With the CV moved down 176 px or more in a 1440 × 764 area (CV at y 200, 300 or 400), the cascade box doesn't fit, About wraps to 0, 0, and its 560 × 520 box covers the CV's title bar. Pick the first cascade position whose box meets no other window's title bar, keeping today's rule only when no such position exists. Add the moved-CV cases to `packages/os-core/test/geometry.test.ts` (005-os-shell-FR-018) and one shell case to `packages/web/test/shell/windows.test.ts`, per US2/AC1 (partial)
  - **Result (2026-10-28)**: `placeWindow` now returns the first cascade box that meets no shown window's title bar, falling back to the first box whose title bar is clear (`d596025`). With the CV at y 200, About opens at 240, 240, clear of it (os-core and shell tests). At y 300 and 400 no 560 × 520 box fully inside the 1440 × 764 area clears the CV's title bar (the test checks every position), so FR-018's "fully inside" wins and today's rule stands there. If the owner would rather have About extend past the area's bottom in that case, the design changes first.
- [X] T127 Resolve the resize handles' target size. The 8 px edges and 16 × 16 px corners (`ResizeHandles.tsx`, `desktop.css`, design/wireframes.md "Resize handles") are pointer targets under 24 × 24 px, and `packages/web/test/shell/targets.test.ts` doesn't measure them: it reads only buttons, links, menu items and tab stops. Do one of two things. Give each handle a hit area of at least 24 px without changing how it looks, for example by extending it past the window's edge. Or, with the owner's approval, record in research R8 and contracts/shell.md that the handles rely on WCAG 2.5.8's "equivalent" exception (Resize… and the pad, FR-062). Either way, make `targets.test.ts` cover the handles under the chosen rule, per FR-037 (contradicts)
  - **Result (2026-10-28)**: option one, no owner approval needed. Each handle keeps its 8 px or 16 × 16 px inside the window and reaches past the edge, 16 px for an edge and 8 px for a corner, for 24 px. `.window` no longer clips, so the title bar and the content round their own corners. Screenshots of every window state, in both color modes, match the old ones but for anti-aliasing at the corners. Design recorded first (`cc6a895`: wireframes row, review.md "Changes after sign-off"), code and `targets.test.ts` after (`fb6fb32`).
- [X] T128 Bring main's constitution 1.3.0 (#22, which only touches `.specify/`) into `005-os-shell`. plan.md's Constitution Check (row VIII and Testing), T077, T122 and PR #23 all rely on 1.3.0's interim provision for deferred manual checks, but the branch's `.specify/memory/constitution.md` is still 1.2.0, which says manual checks MUST be verified before merge. Merge `origin/main` into the branch, or rebase and force-push if the owner prefers (force-pushing is the owner's call), and confirm the checks still pass, per plan: Constitution Check (partial)
  - **Result (2026-10-28)**: `origin/main` merged (`a77f05a`), not rebased, so no force-push is needed. The branch's constitution is 1.3.0. Typecheck, `npm test` (1001 tests), content-check, token-check, traceability (246/246) and `npm run site-check` (12/12 parts) pass.

---

## Phase 12: Convergence

- [X] T129 Push Phase 11's commits and bring PR #23 up to date. `005-os-shell` is 8 commits ahead of `origin/005-os-shell` (`2b6261a` to `c98ecdb`: the `scale.open-start` token, About's placement, the 24 px resize handles, the merge of main's constitution 1.3.0 and Phase 11's record), so CI has never run on them, and T123's "CI passes on the PR" no longer holds for the branch's head. Push with a normal push (no force-push is needed after `a77f05a`'s merge). Confirm `traceability`, `test`, `content`, `tokens` and `site` pass on the new head, and that the `site` job's report matches a local `npm run site-check` on the same commit once Lighthouse scores are masked. Update the PR description, which still says `main` has a commit the branch lacks: remove that paragraph; record the new token `scale.open-start`, review.md's 2026-10-28 resize handles entry that the owner confirms in the PR, and T126's result that About may still cover a CV moved to y 300 or lower; and add T124's open owner decision (the desktop Tab order) to the owner's list beside T005, T077 and T122. No AI or Claude attribution (CLAUDE.md), per Constitution XI and FR-060 (partial)
  - **Result (2026-10-28)**: pushed with a normal push (`8130591..c98ecdb`). CI passes every job (`traceability`, `test`, `content`, `tokens`, `site`) on `c98ecdb`, and on `86db09f` after T130. On each commit the `site` job's report matches a local `npm run site-check` on the same commit once Lighthouse scores are masked, with the same build version (`7bf44b1d15753889`, `a7a7260fa51e86b1`); only `/` mobile Performance differed, 98 in CI and 99 locally on `86db09f`. PR #23's description no longer has the branch note. It now records `scale.open-start`, the 2026-10-28 resize handles entry for the owner to confirm, T126's result for a CV at y 300 or lower, T130's fix and the new test count (1002), and lists T124 among the owner's open decisions beside T005, T077 and T122. No AI or Claude attribution.
- [X] T130 Make the phone's Home control go home exactly once when it is activated twice quickly. `onHome` in `packages/web/src/os/Os.tsx` calls `history.back()` while `pushed.current` is true, and `pushed.current` turns false only when `popstate` arrives, so a second activation before then calls `history.back()` again and leaves the site. Probed on the real build at 375 × 812: open the CV, double-click Home, and the page is the one visited before the site. Two touch taps 120 ms apart don't do it, but a double click, or Enter pressed twice quickly, does. Clear `pushed.current` (or ignore further Home requests) as soon as Home calls `history.back()`, keeping Back after Home leaving the site in one press. Add a case to `packages/web/test/shell/history.test.ts` (005-os-shell-FR-050): after a double click on Home, the URL is still `/`, the home screen shows with focus on the CV icon, and one Back then leaves the site. Per FR-033 and FR-050 (partial)
  - **Result (2026-10-28)**: `onHome` now ignores further Home requests while its `history.back()` is on its way (a `homing` ref, cleared on `popstate`). The full-screen app stays until then, so a second click can't reach the home screen underneath, and a switch to the desktop in that time doesn't go back again. The new `history.test.ts` case failed first (the page was `about:blank`) and passes now (`86db09f`). Typecheck, `npm test` (1002 tests), content-check, token-check, traceability (246/246) and `npm run site-check` (12/12 parts) pass.

---

## Phase 13: Convergence

- [X] T131 Keep the CV window's title bar off every shown window's title bar when it opens while About this site is open. `placeWindow` (`packages/os-core/src/geometry.ts`) always centers the CV, and About opened with no window shown is centered the same way, so both title bars sit at the same `y`. Probed on the real build at 1440 × 900: close the CV, open About from the site menu (440, 24, 560 × 520), click the CV in the dock, and the CV opens at 220, 24, 1000 × 716 with its title bar over the whole of About's (the element at the middle of About's title bar belongs to the CV window). The same happens in a 1024 × 504 area (About at 232, 0, the CV at 32, 24) and on a switch from mobile to desktop with the CV open and About's window kept. Record the rule first, per Constitution II: amend the "CV window on first load and when opened" row of `design/wireframes.md` (for example: centered when no other window is shown; otherwise stepped by `cascade`, as About is, until its title bar meets no shown window's title bar, fully inside the area) and add a dated entry under "Changes after sign-off" in `design/review.md`, in a `docs:` commit. Then change `placeWindow` for the CV, keeping first load and the empty desktop exactly as they are (FR-005's 220, 56 at 1440 × 900). Add the About-then-CV cases at 1440 × 764 and 1024 × 504 to `packages/os-core/test/geometry.test.ts` (005-os-shell-FR-018), and one shell case to `packages/web/test/shell/windows.test.ts` that checks About's title bar stays uncovered, per FR-018 and US2/AC1 (contradicts)
  - **Result (2026-10-28)**: The rule the task suggested, a cascade like About's, finds no box for the CV: at 1000 × 716 in the 1440 × 764 area it has 48 px of room down and none sideways, too little to clear About's 40 px title bar at y 24. So the design (`907a131`, `docs:`) keeps the CV centered when that box covers no shown window's title bar, and otherwise moves its top down 48 px at a time with its bottom edge kept, never shorter than 300 px. If no step clears every title bar with the whole box, the first step whose title bar meets no other title bar is used, else the centered box. Changed: wireframes.md (the CV window row), review.md (a dated entry under Changes after sign-off), contracts/os-core.md and research.md (the placement notes). `placeWindow` follows. With About open alone the CV opens at 220, 72, 1000 × 668 in the 1440 × 764 area (viewport y 104), and at 32, 72, 960 × 408 in the 1024 × 504 area. First load and the empty desktop are unchanged (220, 24 in the area). A switch from mobile to desktop goes through the same `placeWindow`. Four `geometry.test.ts` cases and one `windows.test.ts` case (About's title bar uncovered, `elementFromPoint` at its middle is About). The two size cases and the shell case failed before the change.
- [X] T132 Make Enter on the move and resize pad's Cancel button cancel. `Pad`'s `onKeyDown` (`packages/web/src/shells/desktop/Pad.tsx`) treats every Enter in the pad as Done and prevents the button's own activation, so a keyboard user who tabs to Cancel and presses Enter confirms instead. Probed on the real build at 1440 × 900: `Alt+Shift+P`, Right twice, focus Cancel, Enter: the CV stays 32 px to the right and the status region reads `CV moved.` design/wireframes.md says "Escape or Cancel returns the window", so the design needs no change. Let Enter on Cancel cancel (and Enter on Done confirm), keeping Enter elsewhere in the pad as the confirm the design sets. Add a case for a move and one for a resize to `packages/web/test/shell/keyboard.test.ts` (005-os-shell-FR-027, 005-os-shell-FR-062): after Enter on Cancel the window is back at its start and the status reads `Move cancelled.` or `Resize cancelled.`, per US4/AC4, US4/AC10, FR-027 and FR-062 (contradicts)
  - **Result (2026-10-28)**: `Pad`'s Enter handler confirms unless the event's target is the Cancel button (a ref), which cancels. Enter on Done, on the step buttons and anywhere else in the pad still confirms. contracts/shell.md's Pad row says so. Two `keyboard.test.ts` cases, for a move (Enter on Cancel, then Enter on Done) and a resize, failed first and pass now.
- [X] T133 Check the focus indicator at the keyboard flow's "open the site menu" step. In `tools/site-check/src/parts/keyboard.ts` that step passes `indicator: false`, so focus on About this site in the site menu is never checked for a visible indicator, though FR-057 asks for one at each step (the two "start another move/resize" steps also skip it, but the same pad button is checked at the first "start a move" and "start a resize"). A probe on the real build shows the item is `:focus-visible` with a 2 px outline, so remove `indicator: false` from that step. If the indicator measurement can't read the outline against the menu's highlighted background, fix the measurement or, if the indicator falls below 3:1, the style (design first, per Constitution II). Add a case to the check's keyboard tests in `tools/site-check/test/` showing that an invisible indicator on the menu item fails the step, per FR-057 and FR-024 (partial)
  - **Result (2026-10-28)**: With `indicator: false` removed, the step failed: `indicatorProblem` blurred the item to shoot it unfocused, focus left the menu bar and the menu closed, so the next step's Enter opened nothing. The measurement now moves focus, inside an open `role="menu"`, to a 1 px probe in the menu out of view, then puts focus back and removes the probe. Everywhere else it still blurs. On the real build the keyboard part passes with the step measured (the item's selection background and 2 px outline). A new `shell.test.ts` case uses a copy whose menu items show neither on focus. It fails with exactly one desktop line, `no-focus-indicator step 6 "open the site menu"`, and gave no line before the change.
- [X] T134 Name the shell, state and width when the offline part crashes on `/`. In `tools/site-check/src/check.ts`'s `offline` runner, an error thrown by `offlineProblems` is reported for `[cvPath, rootPath, NOT_FOUND_PATH]` with `OFFLINE_VARIANT` (`375px`), so with the shell root `/` shows as `offline / 375px error` rather than its `<shell>/<state>/<width>px` variants. With `shellRoot`, report the crash on `/` under each of the root's offline variants (`stateVariant(...)`, as the normal run gives) and keep the plain variant for `/cv` and the not-found page. Add a case to `tools/site-check/test/cli.test.ts` or `offline.test.ts` (005-os-shell-FR-060) in which the offline part throws and every line for `/` carries a `<shell>/<state>/<width>px` variant, per FR-060 (partial)
  - **Result (2026-10-28)**: `offline.ts` exports `rootOfflineVariants()`, the root's four variants in the order the part gives them. With `shellRoot`, the runner's crash path reports `/` under each of them and keeps `375px` for `/cv` and the not-found page. A new `offline.test.ts` case corrupts `resume.json` in a copy of the real build so the part throws. Every line for `/` then carries a `<shell>/<state>/<width>px` variant. The case failed first (`/ 375px error`).
- [X] T135 Bring contracts/cli.md's list of variant states in line with the states the check reports. contracts/cli.md says `<state>` is a data-model shell state or one of the sequence names `keyboard`, `reduced-motion` and `forced-colors`, but the check also reports `cv-app-after-cv` (`tools/site-check/src/parts/offline.ts`), `narrow-window` and `text-zoom` (`check.ts`), and `200%-zoom`, `400%-zoom` and `text-spacing` (`parts/layout.ts`). Either list these names in contracts/cli.md, each with the part that uses it, or rename them to the contract's names, and make `tools/site-check/test/cli.test.ts`'s variant pattern accept only the listed names, per plan: contracts/cli.md and FR-060 (contradicts)
  - **Result (2026-10-28)**: contracts/cli.md's Variants on the root now lists every `<state>` name the check reports, each with the parts that use it: the data-model shell states, `cv-app` (on both shells), `cv-app-after-cv`, `keyboard`, `reduced-motion`, `forced-colors`, `narrow-window`, `text-zoom`, `200%-zoom`, `400%-zoom` and `text-spacing`. Nothing is renamed, so reports keep their names. `cli.test.ts`'s `ROOT_VARIANT` accepts only those names, and passes on the real build.
- [X] T136 Push Phase 13's commits with a normal push and bring PR #23 up to date. Confirm `traceability`, `test`, `content`, `tokens` and `site` pass on the new head, and that the `site` job's report matches a local `npm run site-check` on the same commit once Lighthouse scores are masked. Add to the PR description T131's design change (the review.md entry for the owner to confirm), T132's fix and the new test count. No AI or Claude attribution (CLAUDE.md), per Constitution XI and FR-060 (partial)
  - **Result (2026-10-28)**: pushed with a normal push (`9e8c9dc..ddad919`). CI passes every job (`traceability`, `test`, `content`, `tokens`, `site`) on `ddad919`. The `site` job's report is the same as a local `npm run site-check` on that commit, Lighthouse scores included, with the same build version (`f98460ecdda4254f`). PR #23's description now records T131's design change, with the review.md entry for the owner to confirm, T132's fix, T133 to T135, and the new test count (1011). No AI or Claude attribution.
