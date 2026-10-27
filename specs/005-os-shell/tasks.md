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

- [ ] T001 Create the `@cv/os-core` workspace in `packages/os-core/package.json` and `packages/os-core/src/index.ts` (plan Project Structure, contracts/os-core.md):
  - `package.json`: `"name": "@cv/os-core"`, `"private": true`, `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, and no `dependencies`, `devDependencies` or `scripts`.
  - `src/index.ts`: a header comment saying what the package is (Constitution V), and no exports yet.
  - Run `npm install` with Node 26 so `package-lock.json` records the workspace and `node_modules/@cv/os-core` links to it. No package is added (plan Dependencies).
  - `tsconfig.json` (`packages/**/*.ts`) and `vitest.config.ts` (`TEST_INCLUDE_GLOBS`) already cover the new folder: confirm, and change neither.
- [ ] T002 Record the baseline, after T001: `npm run typecheck`, `npm test`, `npm run content-check`, `npm run token-check` and `npm run site-check` pass on the branch as it is. `npm run traceability` fails only because 005's 66 requirements have no test yet. Write the result here.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate, the 004 amendment, tokens, site text, the shared CV body, container
queries, the root page and its build, the `Os` root, and the shell test helper

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: T003 comes first. No task that creates or changes UI may start
until it is done.

- [ ] T003 Confirm the design gate in `specs/005-os-shell/design/` under Constitution 1.2.0's interim provision (plan Constitution Check II, research R19): `wireframes.md` covers every state of both shells and the no-script page; `mockup/` holds the interim local mockup with its 18 PNG exports at 1440, 375, 320 and 812 px; `review.md` is signed by the owner, naming commit `4d2e29f` and 2026-10-26, and records the look as original (FR-044, SC-011). Write the result here.
- [ ] T004 Rename the desktop height token in the design before any code reads it (research R7), in `specs/005-os-shell/design/mockup/README.md` (Proposed tokens: `breakpoint.desktop-height` → `size.desktop-min-height`, dimension, `640px`) and `specs/005-os-shell/design/mockup/proposed-tokens.css` (`--token-breakpoint-desktop-height` → `--token-size-desktop-min-height`). Change no value and nothing else. Commit it alone as `docs: rename the desktop height token (005)`.
- [ ] T005 Owner action: approve the amendment of 004 (FR-051, research R15), written in `specs/004-cv-page/spec.md` and `specs/004-cv-page/contracts/site.md`, before the root changes (T018):
  - FR-018 becomes `- ~~**FR-018**~~: Removed <date> – replaced by 005-os-shell-FR-001: the site root shows the OS shell.`, keeping its line.
  - FR-038 becomes `- ~~**FR-038**~~: Removed <date> – replaced by 004-cv-page-FR-059.`
  - A new active **FR-059** after FR-058: "After one complete online visit to `/cv` or the site root, opening `/cv` or an unknown path with no network MUST show the same page as online, with all its content, styles and fonts. 005-os-shell-FR-052 covers the site root."
  - The Shell Scope's CV path text and the Offline Behavior lines that mention FR-018 or FR-038 get a note pointing to 005. The site contract's redirect row gets the same note.
  - `<date>` is the day the owner approves, filled in then. Commit as `docs: amend 004 for the shell (005)`.
- [ ] T006 [P] Write `packages/web/test/shell/amendment.test.ts`, covering 005-os-shell-FR-051: it reads `specs/004-cv-page/spec.md` with 001's spec parser (`tools/traceability/src/specs.ts`) and asserts FR-018 and FR-038 are removed, each naming its replacement, FR-059 is active, and no test file in the repository references `004-cv-page-FR-018` or `004-cv-page-FR-038` (001's `listFiles`). It fails until T005 and T007.
- [ ] T007 Update 004's tests for the amendment, after T005 (research R15):
  - `packages/web/test/routes.test.ts`: replace the FR-018 test (the 307 to `/cv`) with `describe('005-os-shell-FR-001 005-os-shell-FR-050: the site root is a page', …)`: `GET /` and `GET /?utm_source=x` answer 200, `text/html; charset=utf-8`, `Cache-Control: no-cache`, with `#os` in the body; `GET /index.html` answers 404 with the not-found page; the built manifest has `/` as a page with `index.html` and an empty `redirects` (contracts/site.md). It fails until T017 and T018.
  - `packages/web/test/offline.test.ts`: rename every `004-cv-page-FR-038` title to `004-cv-page-FR-059`, and drop the case where the root leads to `/cv` offline (005's `shell/offline.test.ts`, T104, covers the root).
- [ ] T008 [P] Add the design's 85 tokens to `packages/tokens/penpot/tokens.json`, in Penpot's form, then run `npm run token-output` (research R7, design/mockup/README.md Proposed tokens):
  - Names, types and values exactly as the README's table after T004, with `size.desktop-min-height` in place of `breakpoint.desktop-height`. `breakpoint.desktop-width` keeps its name.
  - Base colors (`color.base.*`, 8-digit hex for the translucent ones) go in the `base` set with the existing ones; semantic colors (`color.wallpaper*`, `color.chrome*`, `color.shell-*`, `color.title-bar*`, `color.window-border*`, `color.control*`, `color.selection*`, `color.icon-*`, `color.ghost`, `color.focus-shell`) go where 004's semantic colors are, as references such as `{color.base.night}`. `color.base.indigo` and `color.base.white` already exist.
  - Shadows, radii, sizes and the two font tokens in their sets by type, following the existing entries' form. No motion token is added.
  - `npm run token-check` passes. Commit as `feat(tokens): add the shell's tokens (005)`.
- [ ] T009 [P] Declare `@cv/os-core`'s types in `packages/os-core/src/types.ts` and export them from `src/index.ts` (data-model.md, contracts/os-core.md). Copy data-model.md's definitions verbatim: `ShellName` (`'desktop' | 'mobile'`), `ViewId` (`'cv' | 'about'`), `Geometry`, `WindowState` (`placement: 'initial' | 'set'`, `maximized: { restore: Geometry } | null`), `Session`, `OsState` (`shell: ShellName | 'both'`, `area: … | null`, `windows` front first, `focused` "always `windows[0]` when set", `mobile.{open, scroll, historyEntry}`, `effects`), `Effect`, `FocusTarget` (seven kinds), `AppDeclaration` (with `Icon` and `Content` typed as a generic component type, so no React import), `Shortcut` (`needs: 'none' | 'window' | 'restored-window'`), and `Metrics` with the fields of data-model.md's Metrics table. Add `OsAction`, a union discriminated on `type` with the 17 actions of contracts/os-core.md, and `ReducerContext = { apps, metrics, text }` where `text` holds the window names and announcement patterns.
- [ ] T010 [P] Add the shell's site text to `packages/web/src/site-text.ts`, under new `os`, `desktop`, `mobile`, `about` and `noScript` keys, with exactly the strings of design/wireframes.md's Site text and Screen readers tables and contracts/shell.md (FR-043, research R16):
  - `os`: view names (`CV`, `About this site`), the CV app's link (`Open as a page to print or share`), and the announcement patterns `{window} moved.`, `Move cancelled.`, `{window} resized to {width} by {height}.`, `Resize cancelled.`, `{window} maximized.`, `{window} restored.`;
  - `desktop`: `Menu bar`, `Desktop`, `Dock`, `Site menu`, the site menu's items (`About this site`, `Open the CV as a page`, `Source code on GitHub`), `Window`, `Next window`, `(minimized)`, the window menu's items (`Open the CV as a page`, `Move…`, `Resize…`, `Minimize`, `Maximize`, `Restore`, `Close`), the control patterns `Close {window}`, `Minimize {window}`, `Maximize {window}`, `Restore {window}`, the dock item suffixes `open` and `minimized`, and the pad's text (`Moving {window}`, `Resizing {window}`, `Up`, `Down`, `Left`, `Right`, `Narrower`, `Wider`, `Shorter`, `Taller`, `Done`, `Cancel`, `Arrows: {step} px`, `Shift+arrows: {bigStep} px`, `Moving`, `Resizing`). The step legends are patterns, not the wireframes' literal `16 px` and `64 px`: those numbers are design values (`space.4`, `space.16`), so they reach the text only from `METRICS` (T061), and changing either token stays one edit (Constitution IV);
  - `mobile`: `Home`, `Home screen`, `About this site`;
  - `about`: the heading, the paragraph with a `{name}` placeholder (contracts/shell.md Shared), the link texts `Open the CV as a page` and `Source code, specs and history on GitHub`, `Keyboard shortcuts`, the eight command names of data-model.md's Shortcuts table, and the two notes from design/wireframes.md's About this site section;
  - `noScript`: the sentence and `Read the CV`.
  - Export one `fill(pattern, values)` from the same file that replaces `{key}` placeholders, so each phrase is written once. 004's existing keys don't change, and the file holds no CV fact.
- [ ] T011 [P] Add `siteName(resume)` and `shellTitle(resume, appName?)` to `packages/web/src/format/meta.ts` (data-model.md Site name and title, FR-042, FR-066): `siteName` is `basics.name` when present, else `siteText.siteHeading` (`CV`); `shellTitle` is `{app} – {site name}`, with an en dash between spaces, when `appName` is given, else the site name. `pageMeta` doesn't change.
- [ ] T012 Build the metrics in `packages/web/src/os/metrics.ts`, after T008 and T009 (research R7, data-model.md Metrics). Export `METRICS: Metrics`, read once with `tokenValue` and `durationMs`, one field per row of data-model.md's table: `desktopMinWidth` ← `breakpoint.desktop-width`, `desktopMinHeight` ← `size.desktop-min-height`, `menuBar` ← `size.menu-bar`, `dockReserve` ← `size.dock-reserve`, `titleBar` ← `size.title-bar`, `cvWidth` ← `size.window-cv-width`, `aboutWidth`/`aboutHeight` ← `size.window-about-width`/`-height`, `minWidth`/`minHeight` ← `size.window-min-width`/`-height`, `firstTop` ← `space.6`, `sideMargin` ← `space.8`, `bottomMargin` and `cascade` ← `space.12`, `step` ← `space.4`, `bigStep` ← `space.16`, `motionMs` ← `motion.duration.fast`. Also export `MOTION_EASING` from `tokenValue('motion.easing.standard')`, a string outside `Metrics`. Throw at import, naming the token, when a length isn't a plain `px` value or a duration isn't in `ms`, "so a bad token fails the build rather than a visit".
- [ ] T013 Verify the container query rewrite (research R5 **Verify**), after T008: in a scratch script outside the repository, run Lightning CSS 1.33.0's `transform` with a visitor on `@container (--token-breakpoint-wide) { … }` and confirm the prelude is parsed as a feature with a custom name, kept, and can be replaced by `mediaQuery('breakpoint.wide')`'s condition. Record the result here. If it can't, T014 uses the fallback: a post-build rewrite of the same prelude in `build-site.ts`.
- [ ] T014 Create the Lightning CSS visitor in `packages/web/scripts/container-breakpoints.ts` and pass it through `css.lightningcss` in `packages/web/vite.config.ts`, after T013 (research R5): it rewrites `@container (--token-breakpoint-<name>)` to the token's width condition from `@cv/tokens`' `mediaQuery()`. `build-site.ts` fails with `site build failed: <file> still holds --token-breakpoint-` when any emitted CSS has that text (contracts/site.md step 4).
- [ ] T015 Split the style sheets and move the CV's layout to container queries, after T014 (research R5, R6), in `packages/web/src/styles/base.css`, `global.css` and `cv.css`:
  - `base.css` takes box sizing, resets, links, `.visually-hidden` and the focus outline from `global.css`. `global.css` imports the fonts, tokens, `base.css`, `cv.css` and `print.css`, and keeps the page frame.
  - In `cv.css`, every `@media (--token-breakpoint-wide)` becomes `@container (--token-breakpoint-wide)`, and every element selector (`main`, `h2`, `h3`, `footer`, `li > h3`, …) is scoped under the CV's root class `.cv`, so it styles the CV in the shell without reaching shell elements.
  - On `/cv`, `body` is the size container (`container-type: inline-size`), so `/cv` lays out as before.
  - 004's tests (`layout`, `design`, `print`, `modes`, `structure`) and `npm run token-check` still pass with no change to them.
- [ ] T016 Extract the CV body into `packages/web/src/cv/CvDocument.tsx` and use it in `packages/web/src/pages/CvPage.tsx` (research R5): `CvDocument({ resume, as })`, with `as: 'main' | 'div'`, renders `Intro` and the shown sections exactly as `CvPage` does now, on a root with class `cv` and 004's `data-req="004-cv-page-FR-001 004-cv-page-FR-014 004-cv-page-FR-025 004-cv-page-FR-027"`. `CvPage` becomes `<CvDocument as="main" …/>` plus `SiteFooter`. `/cv`'s HTML is unchanged byte for byte (compare a build before and after), and 004's tests pass unchanged.
- [ ] T017 Make the root a page in `packages/web/src/routes.ts`, after T005 (research R14, data-model.md route table): `pages` becomes `[{ path: '/', aliases: [], file: 'index.html' }, { path: '/cv', aliases: ['/cv/'], file: 'cv.html' }]` and `redirects` becomes `[]`. Keep the `RedirectRoute` type and `resolveRoute`'s redirect branch: the server, the worker and the checks read them.
- [ ] T018 Build the root page, with a stub shell, after T009, T012, T014, T015, T017 and T021 (research R1, R2, R14, contracts/site.md, contracts/shell.md Document), in `packages/web/vite.config.ts`, `packages/web/scripts/build-site.ts`, `packages/web/src/render.tsx`, `packages/web/src/pages/ShellPage.tsx`, `packages/web/src/os/Os.tsx`, `packages/web/src/client/os.tsx` and `packages/web/src/styles/os.css`. It needs `shellQuery` (T021), `base.css` and the scoped `cv.css` (T015):
  - `Os.tsx` is a stub here: `Os` renders an empty `div.desktop` and `div.mobile`, so `renderShell` and the client entry have a component to render. T023 replaces it with the real root.
  - Vite gains the client entry `os` (`src/client/os.tsx`, which imports `src/styles/os.css`), configured so Rolldown emits it as **one** JS file with no dynamic chunk.
  - `render.tsx` gains `renderShell({ resume, siteData, assets })`: the document by `renderToStaticMarkup` (as `/cv`'s `Document`, with the meta of 004 FR-036 and the title `shellTitle(resume, 'CV')`), and inside it `<div id="os" data-req="005-os-shell-FR-001 005-os-shell-FR-002 005-os-shell-FR-004">` holding `renderToString(<Os …/>)`.
  - `ShellPage.tsx`: the inline picker as the first child of `<head>`, which sets `data-shell` on `<html>` from `matchMedia(<shellQuery(METRICS)>).matches`, then adds one `click` listener on `document` that, while `#os` has no `data-ready`, records on `window` the `data-view` of the first `#os .app-icon` or `#os .about` activated (T044 sets `data-view` on them), so a tap made before hydration isn't lost (FR-004, Constitution VII; T023 replays it). Update contracts/shell.md's Document section to describe both statements. Then charset, viewport, `color-scheme: light`, title, description, sharing meta, the `latin` font preloads of the three families, the `os` style sheet, the `os` module script and the worker's registration script. The no-script page's slot sits beside `#os`, outside it (T046 fills it).
  - `build-site.ts` renders `/` with `renderShell` into `index.html`, with the assets from the manifest's `os` entry. It fails with `site build failed: <message>` when the `os` entry has more than one script file, or `index.html` lacks the inline script, `#os` or the no-script page.
  - `os.css` imports the fonts, tokens, `base.css`, `cv.css`, `src/os/shell.css`, `src/shells/desktop/desktop.css` and `src/shells/mobile/mobile.css` (each created here, empty but for a header comment), and holds contracts/shell.md's visibility rules: `html[data-shell] .no-script` and `html:not([data-shell]) #os` hidden; `html[data-shell="desktop"] #os .mobile` and `html[data-shell="mobile"] #os .desktop` hidden.
  - T007's routes test passes. `/cv` and the not-found page load what they loaded before, and no React.
- [ ] T019 [P] Write `packages/os-core/test/shell.test.ts`, covering 005-os-shell-FR-001: `shellQuery` for the design's metrics is exactly `(width >= 1024px) and (height >= 640px)`, and follows other metrics.
- [ ] T020 [P] Write `packages/os-core/test/apps.test.ts`, covering 005-os-shell-FR-003: for a fixture list of three apps with mixed shells, `appsFor(apps, shell)` returns exactly the apps declaring that shell, in list order, and nothing else; ids in the real list are unique (T034 makes it importable from `packages/web/src/apps/index.ts`; until then the uniqueness case uses the fixture).
- [ ] T021 Implement `shellQuery(metrics)` and `appsFor(apps, shell)` in `packages/os-core/src/shell.ts`, export them, after T009 (contracts/os-core.md). T019 and T020 pass.
- [ ] T022 Create the reducer's frame in `packages/os-core/src/state.ts` and `packages/os-core/src/reducer.ts`, after T009 (data-model.md OS state, contracts/os-core.md): `initialState(apps, metrics)` returns `shell: 'both'`, `area: null`, the CV window with `placement: 'initial'` and a zero geometry until measured, `focused: 'cv'`, `session: null`, `mobile: { open: null, scroll: {}, historyEntry: false }`, `effects: []`; `osReducer(state, action, context)` handles `effectsDone` (clears `effects`) and returns `state` unchanged for every other action until the stories add them. Export both.
- [ ] T023 Replace T018's stub with the `Os` root, and finish the client entry, after T018 and T022 (research R1, R2, R4, R10), in `packages/web/src/os/Os.tsx`, `packages/web/src/os/Announcer.tsx` and `packages/web/src/client/os.tsx`:
  - `Os({ resume, siteData, apps })` holds `useReducer` over `osReducer` with `{ apps, metrics: METRICS, text }` built from `siteText`. Its first render is the pre-rendered tree: both shells (`div.desktop` and `div.mobile`, stubs until US1) and the announcer.
  - After hydration it reads `matchMedia(shellQuery(METRICS))`, measures the desktop area, dispatches `hydrated { shell, area }`, renders only the active shell, and sets `data-ready` on `#os` (contracts/shell.md Document). Then, if the inline script recorded a view, the shell is mobile and no app is open yet (React may have replayed the same tap), it dispatches `mobileOpen` for that view, with its usual focus move and history entry, and clears the record.
  - An effect runs `state.effects` after each render: `focus` resolves the target by data attributes (window title, dock item, site menu title, menu title, pad, mobile title, home icon) and focuses it; `announce` writes the message to the announcer. Then it dispatches `effectsDone`.
  - Another effect sets `document.title` with `shellTitle` from the focused window's or open app's name, on every change, including right after hydration on a phone.
  - `Announcer.tsx`: one `div role="status" class="visually-hidden" data-req="005-os-shell-FR-041"`.
  - `client/os.tsx`: `hydrateRoot(document.getElementById('os'), <Os …/>)` with `resume` and `siteData` imported from `@cv/content` and the app list, the same props as the build.
- [ ] T024 Create the shell test helper in `packages/web/test/helpers/shell.ts`, after T023 (plan Dependencies "Shell test helper"):
  - `openShell({ width, height, javaScriptEnabled?, reducedMotion?, forcedColors?, hasTouch?, userAgent?, cpuThrottling? })`: opens the built root from `serveBuilt()` with 004's `openPage`, and waits for `#os[data-ready]` when scripting is on.
  - `drag(page, from, to, { pointerType: 'mouse' | 'pen' | 'touch', steps })`: mouse through Playwright's mouse; pen and touch through CDP's `Input.dispatchMouseEvent` (with `pointerType: 'pen'`) and `Input.dispatchTouchEvent`.
  - `box(page, selector)`, `tap(page, selector)`, `press(page, keys)`, and `focusedElement(page)` returning a stable description of `document.activeElement`.
  - `focusIndicator(page)`: reuses 004's indicator measurement from `tools/site-check/src/parts/keyboard.ts` (contrast of 3:1 or more, not covered).
- [ ] T025 Create the core test helpers in `packages/os-core/test/helpers.ts`, after T022: `METRICS`, the design's numbers as plain values (data-model.md Metrics); `TEXT`, plain patterns matching site text; `APPS`, a fixture CV declaration with stub components; `run(state, actions)`, which deep-freezes each state, applies the actions one by one, and calls `assertInvariants` after each; and `assertInvariants(state, metrics)`, which checks every row of data-model.md's Invariants table and names the one that failed.
- [ ] T026 Checkpoint, after T003 to T025: `npm run build` writes `index.html` and one `assets/os-<hash>.js` and `.css`; `npm run serve` answers `/` with 200 and the stub shell, and `/cv` as before; `npm run typecheck`, `npm run content-check` and `npm run token-check` pass; `npm test` passes except 001's self-check, and T006 passes. Commit by area, such as `feat(os-core): …`, `feat(web): …`, `test(web): …`.

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

- [ ] T027 [P] [US1] Write the first cases of `packages/os-core/test/reducer.test.ts`, using `run` (T025):
  - covers 005-os-shell-FR-005: `initialState` has the CV window open, `placement: 'initial'`, focused, no effects; `hydrated` on `desktop` sets `placement: 'set'` with `placeWindow`'s box and adds no effect; on `mobile` it closes the CV window and leaves `mobile.open: null`;
  - covers 005-os-shell-FR-012: `open` on a closed view adds it in front, focused, with a `window-title` focus effect; `open` on an open view brings it to the front; never two windows for one view;
  - covers 005-os-shell-FR-023: `close` removes the window and, with none left, adds a `dock-item` focus effect for the CV;
  - covers 005-os-shell-FR-032 and 005-os-shell-FR-040: `mobileOpen` sets `mobile.open`, `historyEntry: true` and a `mobile-title` focus effect.
- [ ] T028 [P] [US1] Write the CV cases of `packages/os-core/test/geometry.test.ts`, covering 005-os-shell-FR-005 and 005-os-shell-FR-018: `placeWindow('cv', [], area, METRICS)` is `{ x: 220, y: 24, width: 1000, height: 716 }` for the 1440 × 764 area, `{ x: 32, y: 24, width: 960, height: 456 }` for the 1024 × 504 area, never larger than the area, and always whole pixels.
- [ ] T029 [P] [US1] Write `packages/web/test/shell/first-load.test.ts`:
  - covers 005-os-shell-FR-004 (SC-001): at 1440 × 900 and 375 × 812, nothing overlays the shell on load (no dialog, banner or element above the menu bar, dock or home screen); the CV is visible with 0 clicks on desktop and after 1 tap on mobile; at 375 × 812, with the `os` script's request held, one tap on the CV icon, then releasing the request, opens the CV full screen with no second tap; at 1440, after closing the CV with its close control, one click on the CV dock item opens it in front, focused (US1 scenario 2);
  - covers 005-os-shell-FR-005: at 1440 × 900 the CV window is open, focused, in front, 1000 × 716 at x 220, y 56 in the page, with the menu bar and dock visible, and `document.activeElement` is `body`; at 375 the home screen shows and no app is open; the window's box is the same before and after hydration within 0.5 px at 1024 × 640, 1440 × 900 and 2560 × 1440 (research R3).
- [ ] T030 [P] [US1] Write `packages/web/test/shell/shell-choice.test.ts`, covering 005-os-shell-FR-001: 1440 × 900 and 1024 × 640 get the desktop; 1023 × 900, 1440 × 639, 375 × 812 and 812 × 375 get the mobile shell; each size gives the same shell with a desktop and with a phone user agent; the first paint already shows the right shell (screenshot before the script runs, with the script's request held).
- [ ] T031 [P] [US1] Write `packages/web/test/shell/apps.test.tsx`, covering 005-os-shell-FR-003: the dock and the home screen each show one item, the CV, in `APPS` order, and no placeholder.
- [ ] T032 [P] [US1] Write `packages/web/test/shell/cv-app.test.ts`:
  - covers 005-os-shell-FR-006: in each shell, the CV app's text equals `/cv`'s `main` text (004's `axText`);
  - covers 005-os-shell-FR-007: the link reads `Open as a page to print or share` and goes to `/cv`; Ctrl-click and middle-click open a new tab;
  - covers 005-os-shell-FR-008: the full-screen view at 320 px has no horizontal scroll; a fixture CV with a 120-character word (004's `long-words.json`) stays in its column; at a window content width of 900 px and up the CV has two columns, below it one;
  - covers 005-os-shell-FR-009: in both shells, one `h1` with the name, an `h2` per shown section, `h3` per entry, no skipped level; with the `no-name` fixture the `h1` is `CV`;
  - `describe('… (SC-003)')`: at 375 px with 4× CPU throttling over CDP, the CV's `h1` is visible within 1 s of the tap.
- [ ] T033 [P] [US1] Write `packages/web/test/shell/site-text.test.ts`:
  - covers 005-os-shell-FR-043: every value under `os`, `desktop`, `mobile`, `about` and `noScript` is English and holds no key fact of the real CV (as 004's `site-text.test.ts`); every shell label in the rendered root is CV text or site text;
  - covers 005-os-shell-FR-066: the menu bar's desktop name (with the CV closed), the title, the home screen's site name and About this site show `basics.name`; with the `no-name` fixture they show `CV`.
- [ ] T034 [P] [US1] Write `packages/web/test/shell/no-script.test.ts`, covering 005-os-shell-FR-049: with scripting off, at 1440 and 375 px, `/` shows the role, the name, the sentence and `Read the CV` → `/cv`, then `/cv`'s footer, in the site's style sheet; no visible `button`, `role=menu`, dock or form control; `html` has no `data-shell`.
- [ ] T035 [P] [US1] Write `packages/web/test/shell/design.test.ts`, and extend `packages/web/test/tokens.test.ts`:
  - covers 005-os-shell-FR-044: the three window controls share one color (computed styles); no font token or `fonts.json` family is an Apple or system UI font (`-apple-system`, `system-ui`, `SF Pro`, `San Francisco`, `BlinkMacSystemFont`, `Helvetica Neue`); the icons in the root are the committed SVG components;
  - covers 005-os-shell-FR-045: at 1440 × 900 the menu bar is 32 px tall, the dock leaves 104 px, title bars are 40 px, the CV window is 1000 × 716 at 220, 56; at 375 the home grid has 4 icons per row, at 320 3, at 812 × 375 10 (with a fixture app list of 12, through the build's test fixture path); `tokens.test.ts` asserts every one of the 85 new tokens is read by a style sheet or by `metrics.ts`.
- [ ] T036 [P] [US1] Write `packages/web/test/shell/requests.test.ts`, covering 005-os-shell-FR-054: loading `/` and opening the CV app, at 1440 and 375 px, requests only `127.0.0.1` (T070 adds About this site).

### Implementation for User Story 1

- [ ] T037 [US1] Implement `placeWindow` for the CV in `packages/os-core/src/geometry.ts` (data-model.md, design/wireframes.md Design values): centered, `firstTop` below the area's top, `min(cvWidth, area.width − 2 × sideMargin)` wide, `area.height − bottomMargin` tall, fitted to the area and rounded to whole pixels. Export it. T028 passes.
- [ ] T038 [US1] Implement `initialState`'s CV window and the actions `hydrated`, `open`, `close`, `focus` and `mobileOpen` in `packages/os-core/src/reducer.ts`, after T037, by data-model.md's Actions table and Focus rules. T027 passes.
- [ ] T039 [P] [US1] Create the CV app's declaration and icon in `packages/web/src/apps/cv/app.tsx`, `packages/web/src/apps/cv/CvIcon.tsx` and `packages/web/src/apps/index.ts` (data-model.md App declaration, Constitution V): `{ id: 'cv', name: siteText.os.views.cv, shells: ['desktop', 'mobile'], needsNetwork: false, Icon: CvIcon, Content: CvApp }`; `CvIcon` is the mockup's original drawing as inline SVG, `aria-hidden="true"`, drawn in `currentColor` and `var(--token-color-icon-*)`, with `data-req="005-os-shell-FR-044"`; `APPS` lists the CV app.
- [ ] T040 [P] [US1] Create the shell's icons in `packages/web/src/os/icons/` (`SiteMark.tsx`, `CloseGlyph.tsx`, `MinimizeGlyph.tsx`, `MaximizeGlyph.tsx`, `RestoreGlyph.tsx`, `HomeChevron.tsx`), each the mockup's own drawing as inline SVG, `aria-hidden="true"`, in `currentColor`, with `data-req="005-os-shell-FR-044"` (research R6).
- [ ] T041 [US1] Create the CV app in `packages/web/src/apps/cv/CvApp.tsx`, after T016 and T039 (research R5, contracts/shell.md Shared): a root with `data-req="005-os-shell-FR-006 005-os-shell-FR-008 005-os-shell-FR-009"`, `a.standalone` with `siteText.os.cvLink` → `/cv` and `data-req="005-os-shell-FR-007"`, then `<CvDocument as="div" resume={resume} />`.
- [ ] T042 [US1] Build the desktop shell's markup in `packages/web/src/shells/desktop/Desktop.tsx`, `MenuBar.tsx`, `Dock.tsx`, `Window.tsx` and `TitleBar.tsx`, after T038, T040 and T041, by contracts/shell.md's Desktop tree:
  - `div.desktop` with `data-req="005-os-shell-FR-005 005-os-shell-FR-010 005-os-shell-FR-024 005-os-shell-FR-025 005-os-shell-FR-037"`;
  - the menu bar `role="menubar"` named `Menu bar` with the site menu's title (the site mark) and either the focused window's name or `span[role=menuitem][aria-disabled=true]` with the site name (menus come in T060), `data-req="005-os-shell-FR-013 005-os-shell-FR-039 005-os-shell-FR-066"`;
  - `main.desktop-area` named `Desktop`, holding one `section.window` per open window in front-to-back order, each `aria-roledescription="window"`, `aria-labelledby` its title, `data-view`, `aria-current="true"` when focused, `data-placement="initial"` until measured, with `data-req="005-os-shell-FR-017 005-os-shell-FR-018 005-os-shell-FR-021 005-os-shell-FR-030 005-os-shell-FR-039"`;
  - the title bar with the close, minimize and maximize controls named by `fill(siteText.desktop.close, …)` and so on, then `div.window-title` with an id and `tabindex="-1"`; then `div.window-content` holding the app's `Content`;
  - the dock `role="toolbar"` named `Dock`, one `button.dock-item` per `appsFor(APPS, 'desktop')` with its icon, its name shown below at all times, and its open mark, named `CV` or `CV, open`, with `data-req="005-os-shell-FR-011 005-os-shell-FR-012 005-os-shell-FR-064"`, inside `data-req="005-os-shell-FR-003 005-os-shell-FR-039"` on the toolbar.
  - Activating a dock item dispatches `open`; the close control dispatches `close` on `click`. Minimize and maximize are wired in US2.
- [ ] T043 [US1] Style the desktop shell in `packages/web/src/shells/desktop/desktop.css`, after T042 (design/wireframes.md Design values, design/mockup/shell.css, research R3, R6): with `data-shell="desktop"` the shell is fixed to the viewport and never scrolls; the menu bar at `size.menu-bar` with glass (`color.chrome`, `backdrop-filter: blur(var(--token-size-chrome-blur))`); the desktop area between it and `size.dock-reserve`; the wallpaper as radial gradients and a dot grid from `color.wallpaper*`, `size.wallpaper-glow` and `size.wallpaper-dots`; windows with `radius.window`, `shadow.window` and `shadow.window-focused`, `color.window-border*`; title bars at `size.title-bar`, focused and not focused as the wireframes describe; controls 24 × 24 with a 14 px circle and a 10 px glyph, all one color; `section.window[data-placement="initial"]` placed by research R3's rule; `div.window-content` as a size container that scrolls; the dock with `radius.dock`, `shadow.dock`, `size.dock-icon` and `size.open-mark`. Every value a `var(--token-…)`.
- [ ] T044 [US1] Build the mobile shell's markup in `packages/web/src/shells/mobile/Mobile.tsx`, `HomeScreen.tsx` and `FullScreenView.tsx`, after T038, T040 and T041, by contracts/shell.md's Mobile tree: `div.mobile` with `data-req="005-os-shell-FR-031 005-os-shell-FR-036 005-os-shell-FR-037"`; `main` holding `section.home` named `Home screen` (`data-req="005-os-shell-FR-031 005-os-shell-FR-035 005-os-shell-FR-039 005-os-shell-FR-066"`) with `p.site-name`, `ul.app-grid` (`data-req="005-os-shell-FR-003"`) of `button.app-icon` per `appsFor(APPS, 'mobile')` (`data-req="005-os-shell-FR-032"`), and `button.about`, each with `data-view` set to its view (`cv`, `about`) for the inline script's early-tap record (T018); and, while an app is open, `section.full-screen` labelled by its header title, with `header` (`button.home` named `Home`, `data-req="005-os-shell-FR-033 005-os-shell-FR-034"`, and `div.app-title` with `tabindex="-1"`, `data-req="005-os-shell-FR-040"`), then `div.view-content` holding the app. Tapping an icon dispatches `mobileOpen`. Home, Back, About and `inert` are wired in US3.
- [ ] T045 [US1] Style the mobile shell in `packages/web/src/shells/mobile/mobile.css`, after T044 (design/wireframes.md Mobile shell, design/mockup/shell.css): the home screen with the wallpaper, the site name at `font.size.home-name` and `font.letter-spacing.home-name`, the grid of `size.app-icon` icons with `radius.icon` and names below, as many per row as fit at 76 px or more (a `repeat(auto-fill, minmax(…))` from tokens); the full-screen view over it with a sticky header at `size.mobile-header` and a `size.home-target` Home button; `div.view-content` as the scroll and size container.
- [ ] T046 [US1] Create the no-script page in `packages/web/src/os/NoScript.tsx` and render it in `ShellPage.tsx`, after T018 (contracts/shell.md The no-script page, FR-049): `div.no-script` with `data-req="005-os-shell-FR-049"`: `p.role` with `basics.label` (left out when absent), `h1` with `siteName(resume)`, the sentence, `a.standalone` `Read the CV` → `/cv`, and 004's `SiteFooter`. No `button`, form control or element that needs a script. Its rules in `os.css` use `/cv`'s look.
- [ ] T047 [US1] Wire both shells into `Os.tsx`, after T042 to T046: render `Desktop` and `Mobile` from state, with `dispatch` and the apps; window content gets each app's `Content` with `resume` and `siteData`; the shared styles both shells need (content areas, the live region) go in `packages/web/src/os/shell.css`.
- [ ] T048 [US1] Checkpoint, after T027 to T047: T019, T020 and T027 to T036 pass; quickstart scenario 1 (minus the states US2 and US3 add) and 5 give their expected results; `content-check` and `token-check` pass with no exception added. Commit by area.

**Checkpoint**: User Story 1 is fully functional and testable on its own (the MVP)

---

## Phase 4: User Story 2 - Use the desktop with windows (Priority: P2)

**Goal**: With a mouse, pen or touch, the visitor opens About this site as a second window, moves
and resizes windows by dragging and by single clicks, focuses, minimizes, maximizes, restores,
switches and closes them, while the dock and the menu bar follow.

**Independent Test**: at 1440 × 900 with a mouse, do quickstart scenario 2 and confirm every
scenario of US2.

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T049 [P] [US2] Add to `packages/os-core/test/reducer.test.ts`:
  - covers 005-os-shell-FR-017: `focus` brings a window to the front and focuses it;
  - covers 005-os-shell-FR-023: closing the front of two windows focuses the other's title;
  - covers 005-os-shell-FR-026: `next` cycles through shown windows and skips minimized ones;
  - covers 005-os-shell-FR-063: `minimize` keeps the app open, and moves focus to the new front window's title, or the CV's dock item, or `site-menu` for About when none is left shown;
  - covers 005-os-shell-FR-064: `open` on a minimized view restores it at its geometry, in front, focused, and a minimized maximized window comes back maximized;
  - covers 005-os-shell-FR-065: `toggleMaximize` saves `restore`, fills the area, announces `CV maximized.`, and restores with `CV restored.`; `dragMove`, `dragResize` and `sessionStart` are ignored while maximized;
  - covers 005-os-shell-FR-020, 005-os-shell-FR-027 and 005-os-shell-FR-062: a move session steps `step` and `bigStep`, clamps, confirms (announcing `CV moved.`) and cancels to `start` (`Move cancelled.`); a resize session does the same from the top-left corner, announcing `CV resized to W by H.` or `Resize cancelled.`; both focus the window title at the end.
- [ ] T050 [P] [US2] Add to `packages/os-core/test/geometry.test.ts`:
  - covers 005-os-shell-FR-018: About opens at 560 × 520, 48 px right of and below the front window, or centered with none shown; when that lands its title bar on another's, it steps 48 px more, wrapping to the area's top left; after five open and close cycles no title bar overlaps another;
  - covers 005-os-shell-FR-021: `clampMove` keeps the title bar inside for moves past each edge; `fitToArea` moves windows back inside and fits ones larger than the area;
  - covers 005-os-shell-FR-061: `clampResize` from each of the eight edges and corners stops at 400 × 300 and at the area's edges, keeping the opposite edge fixed;
  - covers 005-os-shell-FR-065: a maximized window fills the area and follows it when it changes.
- [ ] T051 [P] [US2] Write `packages/os-core/test/invariants.test.ts`, covering 005-os-shell-FR-017 (and every invariant of data-model.md through `assertInvariants`): named scenarios, and 500 generated sequences of 40 actions each from a seeded pseudo-random generator (fixed seed, so runs are deterministic), at area sizes from 400 × 300 to 2560 × 1336, with every state frozen.
- [ ] T052 [P] [US2] Write `packages/web/test/shell/dock.test.ts`:
  - covers 005-os-shell-FR-011: each item's accessible name is the app's name, plus `, open` or `, minimized`; its name is visible without hover; the mark is a filled dot when open, hollow when minimized, none when closed, and the three states differ in grayscale screenshots;
  - covers 005-os-shell-FR-012: a click and a fast triple click on the CV item give one window, in front and focused (US2 scenario 7, spec edge cases).
- [ ] T053 [P] [US2] Write `packages/web/test/shell/menus.test.ts`:
  - covers 005-os-shell-FR-013: the menu bar shows the site menu, the focused window's name and Window; with none focused, the site name; the site menu holds About this site, `/cv` and the repository link from `site.json`;
  - covers 005-os-shell-FR-014: the Window menu lists every open window with `✓` on the focused one and `(minimized)` on minimized ones, and choosing one brings it to the front, restoring it (US2 scenario 6); the focused window's menu holds Close;
  - covers 005-os-shell-FR-015: a menu opens on its title and closes on choosing an item, on Escape, on a click outside and when focus leaves; opening another closes the first.
- [ ] T054 [P] [US2] Write `packages/web/test/shell/windows.test.ts`, at 1440 × 900:
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
- [ ] T055 [P] [US2] Write the desktop cases of `packages/web/test/shell/about.test.tsx`, covering 005-os-shell-FR-038: About opens from the site menu as a window listed in the Window menu, with no dock item; it holds the heading, the paragraph with the name from the CV document (a fixture name appears), `Open the CV as a page` → `/cv` and the repository link (T091 adds the shortcut list).
- [ ] T056 [P] [US2] Add to `packages/web/test/shell/cv-app.test.ts`, covering 005-os-shell-FR-008: the CV window resized to 400 px wide has no horizontal scroll, and a 120-character word stays in its column.

### Implementation for User Story 2

- [ ] T057 [US2] Implement the rest of `packages/os-core/src/geometry.ts` (contracts/os-core.md): `placeWindow` for About (cascade by `cascade`, stepping and wrapping until its title bar is on no other), `clampMove`, `clampResize(geometry, edge, area, metrics)` with the eight edges, and `fitToArea(window, area, metrics)`. Export them. T050 passes.
- [ ] T058 [US2] Implement the actions `next`, `minimize`, `toggleMaximize`, `dragMove`, `dragResize`, `areaResized`, `sessionStart`, `sessionStep` and `sessionEnd`, and the full focus rules of `close` and `minimize`, in `packages/os-core/src/reducer.ts`, after T057 (data-model.md Actions table and Window lifecycle). Announcements are built from `context.text` patterns. T049 and T051 pass.
- [ ] T059 [US2] Create `packages/web/src/shells/desktop/Menu.tsx` and finish `MenuBar.tsx`, after T058 (contracts/shell.md, research R9 Menus, FR-013 to FR-015):
  - the site menu (`About this site`, `Open the CV as a page` → `/cv`, `Source code on GitHub ↗` → `siteData.repository`), the focused window's menu (`Open the CV as a page` for the CV only, `Move…`, `Resize…`, `Minimize`, `Maximize` or `Restore`, `Close`; Move… and Resize… `aria-disabled="true"` while maximized), and the Window menu (`Next window`, then one item per open window with `✓` on the focused one and `(minimized)` on minimized ones), each `role="menu"` with `data-req` as contracts/shell.md gives;
  - one menu open at a time; it closes when an item is chosen, on Escape (focus back to its title), on a pointer down outside, and on `focusout` leaving it; Up and Down move inside an open menu and Enter chooses.
- [ ] T060 [US2] Make windows move, resize, minimize and maximize in `packages/web/src/shells/desktop/Window.tsx`, `TitleBar.tsx` and `ResizeHandles.tsx`, after T058 (research R8):
  - `pointerdown` anywhere in a window dispatches `focus`;
  - the title bar drags with Pointer Events, `setPointerCapture` and `touch-action: none`, batching `dragMove` to one per animation frame; a drag starting on a control doesn't move; controls act on `click`;
  - eight `div.resize-handle` (`aria-hidden`, 8 px edges, 16 × 16 px corners, a grip on the bottom-right) dispatch `dragResize`, with `data-req="005-os-shell-FR-061"`;
  - the minimize control (`data-req="005-os-shell-FR-063"`) dispatches `minimize`; a minimized window stays mounted with `hidden`; the maximize control (`data-req="005-os-shell-FR-065"`) dispatches `toggleMaximize` and is named `Restore {window}` while maximized;
  - geometry from state is set as inline `left`, `top`, `width` and `height` once `placement` is `'set'`.
- [ ] T061 [US2] Create the pad in `packages/web/src/shells/desktop/Pad.tsx`, after T058 (contracts/shell.md, research R9, FR-020, FR-062): `div.pad[role=group]` named `Moving {window}` or `Resizing {window}`, with `data-req="005-os-shell-FR-020 005-os-shell-FR-027 005-os-shell-FR-062"`, the four direction buttons (`Up`, `Left`, `Right`, `Down`, or `Shorter`, `Narrower`, `Wider`, `Taller`), `Done`, `Cancel` and the two step legends, filled with `METRICS.step` and `METRICS.bigStep` through `fill()`; one click is one `sessionStep` of `step`; the title bar shows `Moving` or `Resizing` in place of the controls; a pointer down outside the window counts as Done. Move… and Resize… dispatch `sessionStart`. Its styles in `packages/web/src/shells/desktop/desktop.css` with `size.pad-button`, as the pad is desktop-only (Constitution V).
- [ ] T062 [US2] Finish the desktop area and the dock in `Desktop.tsx` and `Dock.tsx`, after T058: a `ResizeObserver` on the desktop area dispatches `areaResized`; dock items show a filled mark when open, hollow when minimized, and are named `CV, open` or `CV, minimized`; activating a minimized app's item dispatches `open`, which restores it.
- [ ] T063 [US2] Create About this site in `packages/web/src/os/About.tsx`, after T058 (contracts/shell.md Shared, FR-038): a root with `data-req="005-os-shell-FR-038"`, `h1` `About this site`, the paragraph filled with `siteName(resume)`, `Open the CV as a page` → `/cv` and `Source code, specs and history on GitHub` → `siteData.repository`. The site menu's About item dispatches `open { view: 'about' }`, which opens or restores it; it is listed in the Window menu and has no dock item. Its styles in `os/shell.css`.
- [ ] T064 [US2] Checkpoint, after T049 to T063: T049 to T056 pass with US1's tests; quickstart scenario 2 gives its expected results. Commit by area.

**Checkpoint**: User Stories 1 and 2 both work on their own

---

## Phase 5: User Story 3 - Use the phone home screen and full-screen apps (Priority: P3)

**Goal**: On a phone the visitor opens an app full screen, goes home with one tap or Back, finds
the app where they left it, and opens About this site. The site switches shell without reloading
when the space crosses the desktop minimum.

**Independent Test**: at 375 × 812 with touch, open the CV, scroll partway, go home, open About,
go home, open the CV again at the same scroll position; then quickstart scenario 10.

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T065 [P] [US3] Add to `packages/os-core/test/reducer.test.ts`:
  - covers 005-os-shell-FR-034: `mobileHome { scrollTop }` saves `scroll[open]`, clears `mobile.open` and `historyEntry`, and adds a `home-icon` focus effect for the view left;
  - covers 005-os-shell-FR-002: `shellChanged` to mobile opens the focused window's view full screen, or shows the home screen with none shown, keeping minimized and maximized flags; to desktop focuses the full-screen view's window, opening it by `placeWindow` if needed, or leaves the desktop empty; each focuses the open view's title.
- [ ] T066 [P] [US3] Write `packages/web/test/shell/mobile.test.ts`:
  - covers 005-os-shell-FR-031: the home screen shows one icon per app with its name, and About this site, with no horizontal scroll at 320 × 640, 375 × 812, 812 × 375 and 1023 × 900 (US3 scenarios 4, 5);
  - covers 005-os-shell-FR-032: a tap opens the app full screen with a header showing its name and Home;
  - covers 005-os-shell-FR-033: one tap on Home returns to the home screen, and no gesture is the only way;
  - covers 005-os-shell-FR-034: scroll the CV halfway, Home, reopen: the same `scrollTop`; focus lands on the CV icon (US3 scenario 2, US4 scenario 9);
  - covers 005-os-shell-FR-035: with an app open the home screen is `inert`, Tab never reaches it, and the accessibility tree (004's `ax.ts`) holds none of it (US4 scenario 8).
- [ ] T067 [P] [US3] Write `packages/web/test/shell/history.test.ts`, covering 005-os-shell-FR-050: the URL stays `/` through every action of both shells; on mobile, Back from the CV returns home with focus on its icon, and a second Back leaves the site; on desktop one Back leaves; after a mobile-to-desktop switch with the CV open, one Back leaves (US3 scenario 6, spec edge cases); a CV tap made before hydration (T029's held request) adds exactly one entry, so one Back returns home and a second leaves.
- [ ] T068 [P] [US3] Add to `packages/web/test/shell/shell-choice.test.ts`, covering 005-os-shell-FR-002: resizing across 1024 px with the CV open, both ways, causes no navigation and keeps the CV open (focused window or full screen); with nothing open, the empty desktop becomes the home screen and back.
- [ ] T069 [P] [US3] Add the mobile cases to `packages/web/test/shell/about.test.tsx`, covering 005-os-shell-FR-038: About opens full screen from the home screen with the same header and Home as an app (US3 scenario 3), holds the text and both links, and no shortcut list.
- [ ] T070 [P] [US3] Add About this site to `packages/web/test/shell/requests.test.ts`, covering 005-os-shell-FR-054: opening About in both shells requests only `127.0.0.1`.

### Implementation for User Story 3

- [ ] T071 [US3] Implement `mobileHome` and `shellChanged` in `packages/os-core/src/reducer.ts` (data-model.md, research R12). T065 passes.
- [ ] T072 [US3] Wire Home, scroll and Back in `Os.tsx`, `Mobile.tsx` and `FullScreenView.tsx`, after T071 (research R11): `mobileOpen` pushes a history entry with the same URL and a marker in its state; `popstate` dispatches `mobileHome` with the view's `scrollTop`; Home calls `history.back()`, so its entry is used up; reopening restores `scrollTop` in a layout effect before paint; the home screen gets `inert` while an app is open.
- [ ] T073 [US3] Switch shells while open in `Os.tsx`, after T071 (research R12): a `change` listener on `matchMedia(shellQuery(METRICS))` dispatches `shellChanged` and keeps `data-shell` on `<html>` in step; moving to desktop with a pushed entry calls `history.back()` and ignores the `popstate` it causes; the desktop never pushes an entry.
- [ ] T074 [US3] Open About this site on mobile, in `HomeScreen.tsx` and `FullScreenView.tsx`, after T063: `button.about` dispatches `mobileOpen { view: 'about' }`; the full-screen view shows `About` without the shortcut list.
- [ ] T075 [US3] Finish `packages/web/src/shells/mobile/mobile.css` for landscape and narrow widths: no horizontal scroll from 320 px to 1023 px in portrait and landscape; the header stays at the top while the view scrolls.
- [ ] T076 [US3] Checkpoint, after T065 to T075: T065 to T070 pass with US1's and US2's tests; quickstart scenario 10 gives its expected results. Commit by area.

**Checkpoint**: User Stories 1 to 3 work on their own

---

## Phase 6: User Story 4 - Operate both shells with a keyboard or a screen reader (Priority: P4)

**Goal**: Every desktop action works with the keyboard alone, with visible focus and no trap;
screen readers hear names, the focused window, opened apps and changes; the phone shell works
with an external keyboard and screen reader gestures.

**Independent Test**: at 1440 × 900 with the keyboard alone, do every action of US2 with a visible
indicator at each step; at 375 × 812, open the CV in at most 3 key presses and go home.

- [ ] T077 [US4] Owner action, research R9 **Verify** (quickstart 8): for each of `Alt+Shift+M`, `D`, `N`, `W`, `H`, `F`, `P` and `S` (`Option+Shift` on a Mac), in the current Chrome, Edge, Firefox and Safari and with NVDA, JAWS and VoiceOver running, confirm the key reaches the page and the browser or screen reader does nothing of its own. Record the matrix here. If one clashes, design/wireframes.md and design/review.md change first (Constitution II), then `SHORTCUTS` (T085). If the owner defers this to the final testing phase, as 004's manual checks were, record that here; T078's reserved list then stands in until it's done.

### Tests for User Story 4 (REQUIRED) ⚠️

- [ ] T078 [P] [US4] Write `packages/os-core/test/shortcuts.test.ts` and `packages/os-core/test/__fixtures__/reserved-shortcuts.json`, covering 005-os-shell-FR-029: the fixture lists the key combinations Chrome, Edge, Firefox, Safari, NVDA, JAWS, Narrator and VoiceOver reserve, each with its source document (research R9); every entry of `SHORTCUTS` has `Alt` and `Shift`, no Ctrl or Meta, and none is in the list; `matchShortcut` matches by `key` off a Mac and by `code` on a Mac (`Option+Shift+M` gives `key: 'Â'`, `code: 'KeyM'`), and returns `null` with Ctrl or Meta held; `shortcutLabel` gives `Alt+Shift+W` and `Option+Shift+W`; the eight are in data-model.md's order.
- [ ] T079 [P] [US4] Write `packages/web/test/shell/keyboard.test.ts`, at 1440 × 900 with keys alone:
  - covers 005-os-shell-FR-024: every action of US2 done with keys alone; at each step the focused element has an indicator of 3:1 or more and isn't covered (T024's `focusIndicator`);
  - covers 005-os-shell-FR-025: from inside the CV content, `Alt+Shift+M`, `D` and `N` reach the menu bar's first title, the dock's first item and the next window;
  - covers 005-os-shell-FR-026: `Alt+Shift+N` alternates two windows, bringing each to the front (US4 scenario 3);
  - covers 005-os-shell-FR-027: `Alt+Shift+P`, arrows and Enter move the window and announce it; Escape returns it to the start (US4 scenario 4);
  - covers 005-os-shell-FR-028: `Alt+Shift+W` closes the focused window; Tab reaches the close control, and Enter and Space each close;
  - covers 005-os-shell-FR-030: from any element, Tab and Shift+Tab reach the menu bar, every window and the dock within the page's element count; focus order in the CV follows reading order; Tab into a window behind brings it to the front (US4 scenario 7);
  - covers 005-os-shell-FR-062: `Alt+Shift+S`, arrows and Enter resize and announce; Escape restores; minimizing with the keyboard and none left shown moves focus to the CV dock item, and Enter there restores it (US4 scenario 10);
  - `describe('… (SC-002)')`: from first load, the open CV window is reached in at most 3 presses.
- [ ] T080 [P] [US4] Write `packages/web/test/shell/screen-reader.test.ts`:
  - covers 005-os-shell-FR-039: `lang="en"`; the accessibility tree has `Menu bar`, `Desktop`, `Dock` and, on mobile, `Home screen`; each window is named by its app, and only the focused one is current;
  - covers 005-os-shell-FR-040: opening from the dock, a menu or the home screen focuses the window's or app's title; first load doesn't (US4 scenario 2);
  - covers 005-os-shell-FR-041: the status region reads `CV moved.`, `Move cancelled.`, `CV resized to W by H.`, `Resize cancelled.`, `CV maximized.` and `CV restored.` after each action;
  - covers 005-os-shell-FR-042: the title is `CV – <name>` with the CV focused, `About this site – <name>` with About, and `<name>` with none, in both shells.
- [ ] T081 [P] [US4] Add to `packages/web/test/shell/mobile.test.ts`, covering 005-os-shell-FR-036 (SC-002): with keys alone at 375 × 812, open the CV in at most 3 presses, go home and open About, with a visible indicator at each step; after opening the CV at 1440 × 900 and narrowing to 375 px, each of the eight `Alt+Shift` shortcuts does nothing (the CV stays open full screen, focus doesn't move).
- [ ] T082 [P] [US4] Write `packages/web/test/shell/targets.test.ts`, covering 005-os-shell-FR-037: every control in every state of both shells (driven as in T079 and T066) is at least 24 × 24 px, and Home is 44 × 44.
- [ ] T083 [P] [US4] Add to `packages/web/test/shell/menus.test.ts` and `about.test.tsx`, covering 005-os-shell-FR-029 and 005-os-shell-FR-038: each menu command with a shortcut shows its label and carries `aria-keyshortcuts`; About on desktop lists all eight shortcuts and the two notes, and not on mobile; labels read `Option+Shift+…` with a Mac platform.

### Implementation for User Story 4

- [ ] T084 [US4] Implement `SHORTCUTS`, `matchShortcut` and `shortcutLabel` in `packages/os-core/src/shortcuts.ts` and export them (data-model.md Shortcuts, research R9): ids `menu-bar` M, `dock` D, `next-window` N, `close` W, `minimize` H, `maximize` F, `move` P, `resize` S, with `needs` as the table gives. T078 passes.
- [ ] T085 [US4] Add the shortcut listener to `packages/web/src/shells/desktop/Desktop.tsx`, after T084 (research R9, Constitution V): the shortcuts are desktop shell commands, so the listener lives in the desktop shell and is added and removed with it, and does nothing while the mobile shell is shown, even with windows kept in state after a shell switch. One `keydown` listener on the document calls `matchShortcut(event, mac)`; a shortcut whose `needs` isn't met does nothing; one that acts calls `preventDefault`; `menu-bar` and `dock` move focus to the first title or item; `mac` comes from `navigator.userAgentData?.platform`, falling back to `navigator.platform`, read after hydration only.
- [ ] T086 [US4] Add roving focus and the Tab order to `MenuBar.tsx`, `Menu.tsx`, `Dock.tsx` and `Window.tsx`, after T085 (research R9, design/wireframes.md Tab order): the menu bar and the dock are one Tab stop each with a roving `tabindex`; Left and Right move between titles or items, Home and End to the ends; Enter, Space or Down open a menu; Enter or Space activate a dock item; Tab inside a menu closes it and moves on; `focusin` in a window that isn't focused dispatches `focus`; Escape never closes a window.
- [ ] T087 [US4] Add keys to the pad in `Pad.tsx`, after T085 (FR-027, FR-062): arrows step by `step`, Shift+arrows by `bigStep`, Enter confirms, Escape cancels, Tab moves between the pad's buttons; `Alt+Shift+P` and `S` start a session with focus on the pad's first button.
- [ ] T088 [US4] Show the shortcuts in `Menu.tsx` and `About.tsx`, after T084: each command with a shortcut shows `shortcutLabel` beside it and carries `aria-keyshortcuts`; About on desktop adds `Keyboard shortcuts`, a `dl` of the eight in `SHORTCUTS` order, and the two notes, in an element with `data-req="005-os-shell-FR-029"`. Labels read `Alt+Shift+…` in the pre-rendered page and switch on a Mac after hydration, changing text only.
- [ ] T089 [US4] Style focus in `packages/web/src/os/shell.css`, `desktop.css` and `mobile.css` (design/wireframes.md Focus indicator, FR-024): a 2 px `color.focus-shell` outline, 2 px outside the element, everywhere in the shell; inside the CV, `/cv`'s own indicator; nothing in the shell hides a focused element (scroll padding in window content, windows never under the menu bar or dock).
- [ ] T090 [US4] Checkpoint, after T077 to T089: T078 to T083 pass with every earlier test; quickstart scenario 6's keyboard part gives its expected results. Commit by area.

**Checkpoint**: User Stories 1 to 4 work on their own

---

## Phase 7: User Story 5 - Reduced motion, high contrast and larger text (Priority: P5)

**Goal**: Windows and apps animate as designed, without movement or scaling under reduced motion;
every shell element stays visible in forced colors; zoom and text spacing cut nothing off.

**Independent Test**: with reduced motion, open and close the CV in both shells and confirm only
opacity changes; with forced colors, confirm every element in every state; at 200% zoom, text-only
zoom and 400% on 1280 px, confirm nothing is clipped.

### Tests for User Story 5 (REQUIRED) ⚠️

- [ ] T091 [P] [US5] Write `packages/web/test/shell/motion.test.ts`, covering 005-os-shell-FR-046 (SC-009): opening, closing, minimizing, restoring and maximizing a window, opening a full-screen app and showing a menu animate over `motion.duration.fast`; with reduced motion, sampled frames (`element.getAnimations()` and computed `transform`) show no `transform` or `scale` change and only opacity animates; first load and hydration don't animate; a drag still follows the pointer (US5 scenarios 1, 2).
- [ ] T092 [P] [US5] Write `packages/web/test/shell/modes.test.ts`, covering 005-os-shell-FR-047: with forced colors, windows, title bars, menus, the dock, the pad and the menu bar have a visible border; the focused window's border is thicker; each control's circle keeps an outline; open marks and focus outlines show; no element relies on a background image or color alone (US5 scenario 3).
- [ ] T093 [P] [US5] Write `packages/web/test/shell/accessibility.test.ts`, covering 005-os-shell-FR-048: axe-core with the WCAG 2.2 A and AA tags finds nothing in each state of FR-048 in both shells (desktop: no app, CV, About, a menu, two windows, minimized, maximized, keyboard move, keyboard resize; mobile: home, CV, About, a menu-less About); 200% zoom of 1440 × 900 and 400% of 1280 px show the mobile shell with the CV readable and no horizontal scroll (US5 scenario 4); text-only zoom at 200% and 1.4.12 text spacing leave menu bar, dock, title bar and home screen labels unclipped and not overlapping (US5 scenario 5; 004's `clippedOrOverlapping`).

### Implementation for User Story 5

- [ ] T094 [US5] Add motion in `packages/web/src/os/motion.ts` and use it in `Window.tsx`, `FullScreenView.tsx`, `Menu.tsx` and `Os.tsx`, after T012 (research R13): `animateIn(element)` and `animateOut(element)` with the Web Animations API, `METRICS.motionMs` and `MOTION_EASING`, keyframes opacity 0 to 1 and scale 0.96 to 1, or opacity only while `prefers-reduced-motion: reduce` matches (read at each call); used for opening, closing, minimizing, restoring and maximizing a window, opening a full-screen app and showing a menu; closing and minimizing wait for `finished` before dispatching; first load, hydration and shell switches don't animate; drags and keyboard moves never do.
- [ ] T095 [US5] Add forced colors rules to `desktop.css`, `mobile.css` and `os/shell.css` (research R6, design/wireframes.md Forced colors): `@media (forced-colors: active)` borders on every window, title bar, menu, the dock, the pad and the menu bar; the focused window's border thicker and in `Highlight`; each control's circle outlined; open marks as filled and hollow shapes in `CanvasText`.
- [ ] T096 [US5] Make the shell hold up at text-only zoom and text spacing, in `desktop.css` and `mobile.css`, after T093: the menu bar and title bars grow with their text (`min-block-size` from tokens, not a fixed height), dock names wrap rather than clip, and nothing overlaps. Fix whatever T093 reports, in the style sheets only.
- [ ] T097 [US5] Checkpoint, after T091 to T096: T091 to T093 pass with every earlier test; quickstart scenario 7 gives its expected results in Chromium. Commit by area.

**Checkpoint**: User Stories 1 to 5 work on their own

---

## Phase 8: User Story 6 - Open the shell and the CV offline (Priority: P6)

**Goal**: After one visit to `/` or `/cv`, the root opens offline in either shell with the CV app's
full content and the site's fonts, and an update never interrupts an open shell.

**Independent Test**: quickstart scenario 9.

### Tests for User Story 6 (REQUIRED) ⚠️

- [ ] T098 [P] [US6] Write `packages/web/test/shell/offline.test.ts`:
  - covers 005-os-shell-FR-052: after one visit to `/`, and separately after one visit to `/cv` only, `/` opened offline at 375 × 812 and 1440 × 900 shows the shell complete (icons, wallpaper, styles) and opens the CV app with every field of `expectedFields(resume)`, with text in the site's fonts (`document.fonts`) (US6 scenarios 1, 2);
  - covers 005-os-shell-FR-053: with version A open and version B installed, nothing reloads, the CV window stays open, and a font first used after the update still loads; the next visit shows B (US6 scenario 3); with service workers blocked, the shell works and shows no error.

### Implementation for User Story 6

- [ ] T099 [US6] Make the root offline-ready, after T098 (research R14, contracts/site.md Service worker): confirm the worker's precache (every built file) holds `index.html` at `/` with status 200 and both `os` assets, and that a failed navigation to `/` answers the stored page, with no change to `packages/web/src/sw/service-worker.ts`. If T098 finds a gap, fix it in `ShellPage.tsx` or `build-site.ts` first (for example a missing font preload), and change the worker only if the gap is there, recording why here.
- [ ] T100 [US6] Checkpoint, after T098 and T099: T098 and 004's offline tests pass; quickstart scenario 9 gives its expected results. Commit by area.

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

- [ ] T101 [P] [US7] Write `tools/site-check/test/shell-states.test.ts`:
  - covers 005-os-shell-FR-048: on the real build, the driver reaches every state of data-model.md's Shell state list from a fresh page, by real input, and each state's DOM shows it (two windows, a menu open, the pad, …);
  - covers 005-os-shell-FR-056: the report lists `/` under `accessibility` in every desktop state at 1440px and every mobile state at 375px, under `lighthouse` on both profiles, and under `other-sites` with the CV app open.
- [ ] T102 [P] [US7] Write `tools/site-check/test/cv-app.test.ts`:
  - covers 005-os-shell-FR-006 and 005-os-shell-FR-058: on the real build the `cv-app` part passes in both shells, and its expected fields come from `expectedFields(resume)`; in a temporary copy whose CV app leaves out `work[0].position`, the part fails with `cv-app / <shell>/cv-app/<width>px missing-field work[0].position: …` for both shells (US7 scenario 1); a copy with two sections swapped gives `out-of-order`.
- [ ] T103 [P] [US7] Write `tools/site-check/test/shell.test.ts`, covering 005-os-shell-FR-057: on the real build the `keyboard` part passes its desktop and mobile flows; in temporary copies with one change each, the matching part fails with contracts/cli.md's line: the close control's name removed (`accessibility`, `axe:button-name`), the close shortcut's handler removed (`keyboard`, `shortcut Alt+Shift+W` or `focus-target` naming the step) (US7 scenario 2), a font loaded from another site (`other-sites`), and a minimized window's focus sent to `body` (`keyboard`, `focus-target`).
- [ ] T104 [P] [US7] Extend the part tests in `tools/site-check/test/offline.test.ts`, `no-script.test.ts`, `other-sites.test.ts` and `cli.test.ts`:
  - covers 005-os-shell-FR-059 (`offline.test.ts`): a copy whose worker doesn't store the `os` script fails on `/` offline at both widths, naming the shell and the width;
  - covers 005-os-shell-FR-049 (`no-script.test.ts`): a copy whose root shows the dock with scripting off fails with `visible-control`;
  - covers 005-os-shell-FR-054 (`other-sites.test.ts`): a copy whose root loads a script from another site fails with the root's variant;
  - covers 005-os-shell-FR-060 (`cli.test.ts`): `npm run --silent site-check` and the CI step in `.github/workflows/ci.yml` run the same command; every problem line on `/` has a `<shell>/<state>/<width>px` variant; two runs on the real build give the same report (US7 scenario 3).
- [ ] T105 [P] [US7] Extend `tools/site-check/test/lighthouse.test.ts` with `describe('… (SC-003)')`, off CI (`test.skipIf(process.env.CI)`): on the real build's root under the mobile profile, the CV icon is inside the first contentful paint's viewport and FCP is under 2,500 ms.
- [ ] T106 [P] [US7] Change `tools/site-check/test/performance.test.ts` (SC-010): `npm run site-check` on the real repository exits 0 in under 480,000 ms, with an 9-minute test timeout, still `test.skipIf(process.env.CI)`.

### Implementation for User Story 7

- [ ] T107 [US7] Add the `cv-app` part and the new problem types to `tools/site-check/src/report.ts` (contracts/cli.md Parts, data-model.md Site check results): `PARTS` gains `'cv-app'` right after `'content'`; the `variant` comment lists `<shell>/<state>/<width>px`; the problem types `focus-target`, `shortcut`, `trapped` and `moved` render as contracts/cli.md's examples.
- [ ] T108 [US7] Create the state driver in `tools/site-check/src/shell-states.ts` (research R17): `SHELL_STATES`, the desktop states `first-load`, `no-window`, `about`, `two-windows`, `site-menu`, `window-menu`, `minimized`, `maximized`, `keyboard-move`, `keyboard-resize` at 1440 × 900 and the mobile states `home`, `home-landscape`, `cv-app`, `about` at 375 × 812 (812 × 375 for `home-landscape`); `reachState(page, state)` gets there from a fresh page by real clicks and keys after `#os[data-ready]`, never through a hook; `stateVariant(shell, state, width)` gives `<shell>/<state>/<width>px`.
- [ ] T109 [US7] Run the root per shell and state in `tools/site-check/src/check.ts`, after T107 and T108 (contracts/cli.md): when the manifest lists `/` as a page, every part but `print` runs on it with its shell variants; `accessibility` in every state, `fonts` in `desktop/two-windows` and `mobile/cv-app`, `other-sites` with the CV app open in both shells, `lighthouse` on both profiles; the root's status is 200 in `pages`. When the manifest still redirects `/`, the check behaves as 004's (see Notes).
- [ ] T110 [US7] Create `tools/site-check/src/parts/cv-app.ts`, after T107 (contracts/cli.md, FR-058): opens the CV app in each shell (the window open on first load; one tap on the CV icon) and compares its fields, in order, with `expectedFields(resume)`, reusing the `no-script` part's field sequence; problems `missing-field` and `out-of-order` with the field's JSON path.
- [ ] T111 [US7] Add FR-057's flows to `tools/site-check/src/parts/keyboard.ts`, after T108: at 1440 × 900 with keys alone, reach the CV window open on first load, close it, open the CV from the dock, open About from the menu bar, switch windows, move one, cancel a move, resize one, cancel a resize, minimize and restore one, maximize and restore one, and close both, checking a visible indicator and the focus targets of FR-023 and FR-063 at each step; at 375 × 812, open the CV, go home with Home, open it again, go home with Back, and check focus lands on the CV icon each time. Problems `focus-target` (naming the step and the expected target), `shortcut` and `trapped`.
- [ ] T112 [P] [US7] Extend `tools/site-check/src/parts/no-script.ts`, `offline.ts`, `other-sites.ts`, `fonts.ts`, `layout.ts` and `lighthouse.ts` for the root, after T109, as contracts/cli.md's Parts table says: the no-script page's name, link, style sheet and no visible control; offline after a visit to `/` and to `/cv` only, at both widths, opening the CV app with every field in the site's fonts; requests while loading `/` and opening the CV app in both shells; served faces in the two states; the CV window narrowed to 400 px, 200% and 400% zoom, and text-only zoom; Lighthouse on `/` with both profiles.
- [ ] T113 [US7] Extend `tools/site-check/src/parts/modes.ts`, after T108 (FR-046, FR-047): forced colors on the root (borders on windows, menus, dock, pad and menu bar; the focused window distinguishable); reduced motion while opening and closing the CV app and About, minimizing, restoring, maximizing and opening a menu, reporting `moved` for any element that moves or scales.
- [ ] T114 [US7] Update the committed sample and its notes in `tools/site-check/test/__fixtures__/seeded/expected-report.txt` and `tools/site-check/test/__fixtures__/README.md`: regenerate the report by the README's steps for the new `cv-app` line in the summary, run it twice to confirm it doesn't change, and note in the README that root-page cases use copies of the real build.
- [ ] T115 [US7] Checkpoint, after T101 to T114: every site check test passes; `npm run site-check` prints `Site check: PASSED` with the root listed under every part but `print`. Commit as `feat(site-check): …` and `test(site-check): …`.

**Checkpoint**: All user stories are independently functional

---

## Phase 10: Polish & Constitution Verification

**Purpose**: Traceability, the audits, speed, the full verification, the owner's manual checks and
the single PR

- [ ] T116 [P] Write `packages/web/test/shell/data-req.test.tsx`, covering 005-os-shell-FR-055: every target in contracts/shell.md's structure carries its IDs in the rendered root (desktop with two windows, a menu and the pad open; mobile with an app open), and every `005-os-shell-FR-###` in a `data-req` names an existing requirement.
- [ ] T117 Run `npm run traceability`, after T116 (Constitution III, SC-010): it exits 0 and its last line is exactly `PASS: all 246 active requirements in 5 approved specs are covered.` That's 29 from 001, 36 from 002, 58 from 003, 57 from 004 (FR-018 and FR-038 removed, FR-059 added) and 66 from 005. Every row of Requirement Coverage below has a passing test.
- [ ] T118 [P] Verify research R18 (**Verify**): on the real build, the root's compressed script, style sheet and HTML are near 85 KB, 8 KB and 15 KB, and Lighthouse's mobile Performance on `/` is 90 or more (SC-004). If it isn't, apply the first fallback: render the inactive shell as an empty placeholder with `suppressHydrationWarning` on the client, so only the active shell hydrates, then measure again. Record both here.
- [ ] T119 [P] Audit Constitution X, IV, V, VII and IX in `package.json`, `packages/os-core/`, `packages/web/` and `tools/site-check/`:
  - **X**: no package added; `react-dom/client` ships on the root only; the abstractions added are exactly plan.md's Dependencies table (add any helper this list created to it, with its reason); no agent skill added.
  - **IV**: `npm run content-check` and `npm run token-check` pass with no exception or skip marker for the shell; `site-text.ts` holds no CV fact and no design value (the pad's step legends are patterns); no script reads a token outside `metrics.ts`; `os-core` imports nothing it mustn't.
  - **V**: each app declares its shells beside its code; both shells read `APPS` through `appsFor`.
  - **VII**: the desktop paints the CV from HTML before any script; nothing is in front of it; `/cv` ships no React.
  - **IX**: no Apple or system font, the icons are the mockup's own SVG, and the controls are one neutral color.
- [ ] T120 Run the full verification, after T117 to T119: `npm run typecheck`, `npm test` (now including 001's self-check), `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0, the last with every Lighthouse category at 90 or more for `/` and `/cv` on both profiles, in under 8 minutes (SC-004, SC-010).
- [ ] T121 Run quickstart.md scenarios 1 to 5 and 9 to 11, and record any deviation here. Write scratch output to the scratchpad. Scenario 11 edits files: revert each change with `git checkout`. Scenarios 6 to 8 are T122. Skip scenario 12: it's the interim provision's follow-up.
- [ ] T122 Owner action, by hand, before the PR merges (spec Assumptions, quickstart 6 to 8): screen readers on a desktop and a phone (SC-005), reduced motion, forced colors in Edge and text-only zoom in Firefox, and the shortcut matrix if T077 was deferred; and the design comparison of every state against `design/mockup/` (FR-045). Record each result here and in the PR. If the owner defers these to the final testing phase shared with 004's manual checks, record that here and leave the task open.
- [ ] T123 Commit the remaining work with Conventional Commits, push `005-os-shell` and open one pull request to `main` (Constitution XI):
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description links `specs/005-os-shell/spec.md` and `specs/005-os-shell/tasks.md`; records the 004 amendment (T005) and the token rename (T004); records that the 85 tokens were written by hand under Constitution 1.2.0's interim provision and that **the provision's follow-up pull request is still pending** (research R19); and records the results of T077, T118, T121 and T122.
  - Confirm `traceability`, `test`, `content`, `tokens` and `site` run and pass, and that the `site` job summary matches a local `npm run site-check` on the same commit (FR-060). Merging is the owner's.

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
