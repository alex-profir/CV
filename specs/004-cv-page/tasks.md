---

description: "Task list for the /cv page"
---

# Tasks: The /cv Page

**Input**: Design documents from `/specs/004-cv-page/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/page.md](./contracts/page.md),
[contracts/site.md](./contracts/site.md), [contracts/fonts.md](./contracts/fonts.md),
[contracts/cli.md](./contracts/cli.md), [contracts/ci.md](./contracts/ci.md),
[quickstart.md](./quickstart.md), and the design in [design/](./design/): wireframes, four PNG
exports from Penpot revision 10, and the signed [review.md](./design/review.md). The Penpot link
is deferred under Constitution 1.2.0's interim provision (research R22).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one
automated test. Each test task names the `004-cv-page-FR-###` IDs it covers, and every FR in
spec.md (FR-001 to FR-058, all active) is covered by at least one test task (see Requirement
Coverage at the end).

**Organization**: Tasks are grouped by user story.

- US1 builds the page itself: content, dates, links, structure, layout, fonts and styles, plus
  the browser measurements its tests share with the site check (accessibility, keyboard, layout,
  modes, fonts).
- US2 builds the site check: the CLI, the report, the remaining parts, the CI job and the ruleset.
- US3 adds print styles.
- US4 adds the service worker.
- US5 adds the title and link-preview metadata.
- US6 proves one edit at the source changes the page, and adds the font-to-token build guards.

The route table, the local server, the build pipeline and the new token export come first, in
Phase 2, because every page test renders and serves the real build.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US6)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 004-cv-page-FR-009"

## Not in this feature: the interim provision's follow-up

Constitution 1.2.0's interim provision ends in a **separate follow-up pull request**, once Penpot
can be reached again (2026-10-26 at the earliest). No task below does any of it, and no task may
start it early:

- adding the Penpot file link to `design/review.md`, or ticking the spec's Design box for it
  (spec.md, Design section, line "Penpot file link: deferred");
- importing `packages/tokens/penpot/tokens.json` into the site's Penpot file and exporting it
  again over itself (quickstart scenario 11, research R6 and R22);
- regenerating the token output and re-running the checks because the round trip changed a value;
- replacing the PNG exports in `design/mockup/`, or rebuilding the design in Penpot.

This feature's pull request only **records** that the follow-up is pending (T106). Also out of
scope, as the spec and research say: tokens in `rem` so text follows the browser's default font
size (research R6, recorded as a follow-up to 003), the PDF download, publishing and the domain,
the shells, and a dark theme.

## Path Conventions

- CV data, read only through `@cv/content` (Constitution IV): `packages/content/resume.json`,
  `packages/content/site.json`
- Tokens, read only through `@cv/tokens`: `packages/tokens/penpot/tokens.json` (the export) and
  the generated `packages/tokens/src/tokens.generated.{css,ts}`
- The site (`@cv/web`, new): `packages/web/`, holding:
  - `package.json`, `vite.config.ts`;
  - `scripts/build-site.ts` and `scripts/fonts-plugin.ts`;
  - `src/render.tsx`, `src/routes.ts`, `src/site-text.ts`, `src/supported.ts`;
  - `src/format/dates.ts`, `src/format/location.ts`, `src/format/meta.ts`;
  - `src/pages/` (`Document.tsx`, `CvPage.tsx`, `NotFoundPage.tsx`) and `src/cv/` (components);
  - `src/styles/` (`global.css`, `cv.css`, `print.css`);
  - `src/client/register-sw.ts`, `src/sw/service-worker.ts`, `src/sw/tsconfig.json`;
  - `src/fonts/` (`README.md`, `fonts.json`, one directory per family);
  - `test/` with `test/helpers/` and `test/__fixtures__/`.
- The site check (new): `tools/site-check/src/` (`main.js`, `cli.ts`, `check.ts`, `report.ts`,
  `server.ts`, `browser.ts`, `expected.ts`, `parts/*.ts`) and `tools/site-check/test/` with
  `test/helpers/sites.ts` and `test/__fixtures__/`
- Shared code from 001:
  - `tools/traceability/src/report.ts` (`compare`);
  - `tools/traceability/src/files.ts` (`EXCLUDED_DIR_NAMES`, `isTestFile`);
  - `tools/traceability/src/node-version.js` (`REQUIRED_NODE_MAJOR`);
  - `tools/traceability/test/helpers/project.ts` (`makeProject`, `REPO_ROOT`).
- Shared code from 003: `tools/token-check/test/helpers/tokens.ts` (`tokenProject`,
  `runGenerate`), `packages/tokens/src/index.ts` (`tokenValue`, `cssVar`, `mediaQuery`).
- Root toolchain: `package.json`, `package-lock.json`, `tsconfig.json`, `vitest.config.ts`
- CI and merge rule: `.github/workflows/ci.yml`, `.github/rulesets/main.json`
- No `os-core`, shells or apps are created (plan Structure Decision)

## Rules that apply to every task

- **Site source holds no design literal and no CV fact** (FR-003, FR-044, Constitution IV):
  - Everything under `packages/web/` except `test/` is site source for 002's and 003's checks.
  - Styles use only `var(--token-…)` and `@media (--token-…)`. Inside
    `@media (forced-colors: active)`, system colors such as `Highlight` are allowed (003 FR-056).
  - No style sheet, component or script names a font family. Families reach CSS only through the
    font tokens, and `@font-face` exists only in the build output (research R5).
  - CV text reaches components only as props from `resume` and `siteData`. Every non-CV word is in
    `src/site-text.ts`, which holds no CV fact.
  - No skip marker for either check, anywhere in `packages/web/`.
- **Fixtures and tests may hold literal values and CV text on purpose.** They live in `test/` and
  `__fixtures__/` directories, which no check searches. Never copy one into site source.
- **`data-req`** (FR-047): written only as a JSX string attribute, `data-req="004-cv-page-FR-…"`,
  on exactly the elements in contracts/page.md's `data-req` targets table, listing every ID that
  row gives, separated by spaces. 001's check reads them from `.tsx` files.
- **Test titles**:
  - Every test or `describe` title carries only full, existing IDs, e.g.
    `describe('004-cv-page-FR-009: dates keep the precision the CV document gives', …)`.
  - Titles and tags contain no other `fr-` text in any letter case. Sample values such as `1fr`
    go in test bodies.
  - Tests for success criteria without an FR use titles such as `describe('… (SC-009)', …)`.
- **No network beyond the machine** (FR-016, FR-057):
  - Every Chromium a test or the check starts, through Playwright or for Lighthouse, is launched
    by `tools/site-check/src/browser.ts` with the two isolation flags of research R17.
  - Nothing is fetched at build, test or check time. Font files are downloaded once, by the owner
    (T036), and committed.
- **No test writes inside the repository**: builds for tests go to temporary directories (T015).
  Only `npm run build` writes, and only under `packages/web/dist/`, which is git-ignored.
- Code uses erasable TypeScript only, with explicit `.ts`/`.tsx` extensions on relative imports.
  Modules are plain functions. Components are function components with no state or effects:
  nothing is hydrated (research R1).
- Sorting in the site check uses 001's `compare` (code-unit order), never `localeCompare`.
- Problem lines, the summary and stderr messages are exactly as contracts/cli.md shows them. If a
  task's wording and the contract differ, the contract wins.
- **The token export is written in Penpot's form** while the interim provision applies (FR-043,
  research R6): `JSON.stringify(value, null, 2)` with no final newline. Scripts that change it for
  a scenario revert it with `git checkout`.
- Run everything with Node 26 active (`nvm use`), as the shell's default Node is older.
- Commits use Conventional Commits and carry no AI or Claude attribution (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The `@cv/web` workspace, the pinned packages, TSX in the toolchain and Chromium

- [X] T001 Create the package and the scripts in `package.json` and `packages/web/package.json` (plan Project Structure, contracts/site.md Commands, contracts/cli.md Command):
  - In the root `package.json`, keep the existing seven scripts and:
    - add `"build": "node packages/web/scripts/build-site.ts"`;
    - add `"serve": "node tools/site-check/src/server.ts"`;
    - add `"site-check": "npm run build && node tools/site-check/src/main.js"`;
    - change `"typecheck"` to `"tsc --noEmit && tsc --noEmit -p packages/web/src/sw/tsconfig.json"`.
  - Create `packages/web/package.json`: `"name": "@cv/web"`, `"private": true`, `"type": "module"`, no `exports`, `scripts`, `author` or `devDependencies`. T002 adds its `dependencies`.

    It's searched by 002's key facts search, so it must not contain the owner's name or email.
- [X] T002 Install the packages into `package.json`, `packages/web/package.json` and `package-lock.json`, after T001, with Node 26 active and its bundled npm (plan Dependencies table):
  1. `npm install --save-exact -w @cv/web react@19.3.1 react-dom@19.3.1`.
  2. `npm install --save-dev --save-exact vite@8.3.5 lightningcss@1.33.0 playwright@1.64.1 axe-core@4.14.0 lighthouse@13.5.0 pdfjs-dist@6.4.299 @types/react@19.3.0 @types/react-dom@19.3.0`.
  3. Confirm `package-lock.json` has a `node_modules/@cv/web` link to `packages/web`, and single top-level copies of `vite` 8.3.5 and `lightningcss` 1.33.0, the same ones Vitest already uses (research R2).
  4. Commit `package-lock.json`.

  The root `package.json` must end with exactly nineteen `devDependencies` (the eleven already there, unchanged, plus these eight, each pinned with no `^` or `~`) and no `dependencies`. `packages/web/package.json` has exactly the two `dependencies` (Constitution X).
- [X] T003 Add TSX to the toolchain in `tsconfig.json`, `packages/web/src/sw/tsconfig.json` and `vitest.config.ts`, after T002 (research R2):
  - `tsconfig.json`: add `"packages/**/*.tsx"` to `include`; add `"jsx": "react-jsx"` and `"lib": ["esnext", "dom", "dom.iterable"]` (the registration script and `page.evaluate` callbacks use DOM types); add `"packages/web/src/sw/**"` to `exclude`. Keep every other option.
  - `packages/web/src/sw/tsconfig.json`: `strict`, `noEmit`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, `"lib": ["esnext", "webworker"]`, `"types": []`, including only `service-worker.ts`.
  - `vitest.config.ts`: set React's automatic JSX runtime for test files in Vite 8's transform options. Keep the include and exclude globs from 001. **Verify** with a scratch `packages/web/test/smoke.test.tsx` rendering `<p>x</p>` through `renderToStaticMarkup`, then delete it.
  - `npm run typecheck` passes. The service worker project may have no input yet: create an empty `packages/web/src/sw/service-worker.ts` holding `export {};` so it does (T086 fills it).
- [X] T004 Install Playwright's Chromium with `npx playwright install chromium`, after T002. Confirm `node -e "import('playwright').then(({ chromium }) => console.log(chromium.executablePath()))"` prints a path that exists. Needs the network, once per machine (quickstart Prerequisites).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate, the new token export, the site data field, the route table, the
local server, the build pipeline, the browser launcher, the check's shared types and the page
test helpers. Every story needs them.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

**Design gate (Constitution II)**: T005 comes first. No task that creates or changes UI may start
until it's done.

- [X] T005 Confirm the design gate in `specs/004-cv-page/design/` under Constitution 1.2.0's interim provision (plan Constitution Check II, research R22):
  - `wireframes.md` covers `/cv` at phone, desktop and print, and the not-found page at both widths;
  - `mockup/` holds `cv-desktop-1440.png`, `cv-phone-375.png`, `not-found-desktop-1440.png` and `not-found-phone-375.png`;
  - `review.md` reads **Status: Approved**, names Penpot revision 10 and 2026-10-22, and carries the 2026-10-23 interim note;
  - `.specify/memory/constitution.md` on `main` is version 1.2.0 with the Interim Provision section.

  The missing Penpot link is allowed by the provision. **Do not add it, and do not tick the spec's Design box**: that is the follow-up pull request's work (see "Not in this feature").
- [X] T006 [P] Add the site data field `repository` by 002's process in `packages/content/schemas/site.schema.json`, `packages/content/site.json` and `packages/content/src/shape.generated.ts` (data-model.md Site data, research R7, 002's contracts/site-data-rules.md):
  - In the schema, add `"repository": { "type": "string", "format": "uri", "pattern": "^https://", "description": "The address of the site's source repository, for the footer link." }`. The data-model rule is "Optional. An `https` address. Holds no CV fact", so it isn't `required`.
  - In `site.json`, add `"repository": "https://github.com/alex-profir/CV"` after `$schema`.
  - Run `npm run content-shape`, then confirm `SiteData` has `repository?: string`.
  - `npm run content-check` passes, and 002's tests pass. If one asserts the old site data shape, update it to the new one and keep its title.
- [X] T007 [P] Write the design's token export by hand, in Penpot's form, at `packages/tokens/penpot/tokens.json` (FR-043, research R6, data-model.md Token roles). Then run `npm run token-output`.
  - **Form**, exactly as Penpot 2.18.3 writes (003 R2, R3):
    - sets `base` then `light`;
    - one theme, keeping the starter's `id` `96b08a0d-67e9-80a1-8008-d40116ee9d06`, `name` `light`, `group` `mode`, `description` `""`, `isSource` `false`, `selectedTokenSets` `{ "base": "enabled", "light": "enabled" }`;
    - `$metadata`: `tokenSetOrder: ["base", "light"]`, `activeThemes: ["mode/light"]`, `activeSets: ["base", "light"]`;
    - every token with `$value`, `$type` and `"$description": ""`; sizes as unitless strings;
    - `JSON.stringify(value, null, 2)` with no final newline.
  - **Names and values**: exactly data-model.md's Token roles tables, which the owner approved before implementation: the `base` set (seven base colors, three families, weights, sizes, letter spacing, `font.case.label`, the typography tokens, the spacing scale, sizes, borders, `radius.pill` and `breakpoint.wide` at `900`) and the `light` set (the ten semantic colors). They keep the starter names wherever the role matches, so 003's tests that name them keep working (T008).
  - **Only tokens the site reads**: delete every starter token the design doesn't use (`shadow.raised`, `color.overlay`, `color.base.shadow`, `font.family.ui`, `size.icon`, `radius.small`, `radius.large` and any other). The motion token source doesn't change (the design has no motion).
  - `npm run token-check` passes on the new export and output, except for 003 tests T008 fixes.
- [X] T008 Update 003's tests that read the real export, after T007, in `packages/tokens/test/tokens.test.ts`, `packages/tokens/test/__fixtures__/starter/tokens.json`, `tools/token-check/test/self-check.test.ts` and `packages/tokens/README.md` (plan Structure Decision). 003's spec expects the starter tokens to "change completely with the `/cv` mockup" (003 Assumptions, Starter tokens), but its tests pin starter values. Keep every title and ID, and change only what the starter set pinned:
  - Commit a verbatim copy of the 003 starter export, from `git show 130033e:packages/tokens/penpot/tokens.json`, at `packages/tokens/test/__fixtures__/starter/tokens.json`, with no final newline.
  - `003-design-tokens-FR-001`: keep the form assertion. Replace "holds every category Penpot keeps" with: every token's `$type` is one Penpot holds (no `duration` or `cubicBezier`), and the categories the design uses (`color`, `typography`, `spacing`, `borderRadius`) each have a token. The design has no shadow.
  - `003-design-tokens-FR-006` ("the tokens MUST start with placeholder values covering every category"): run its transparency, reference, typography, shadow and breakpoint assertions on the starter fixture instead of the real export. Keep the Apple and system font assertion on the real export, and add the fixture's families to it.
  - `003-design-tokens-FR-019`: in a `tokenProject` whose export is the starter fixture, run `runGenerate` and assert the CSS holds `--token-color-overlay: #00000080;`.
  - `003-design-tokens-FR-052`: `mediaQuery('breakpoint.wide')` is `(width >= <value>px)`, where `<value>` is the export's `breakpoint.wide`.
  - `self-check.test.ts`: its FR-002 and SC-003 scenarios change `color.base.ink` and `space.4`, which T007 keeps. Change them only if a kept name was dropped.
  - `packages/tokens/README.md`: update any example that names a deleted starter token.
  - `npm test` passes for `packages/tokens/` and `tools/token-check/`, and `npm run token-check` passes.
- [X] T009 [P] Create the route table and manifest types in `packages/web/src/routes.ts` (research R3, data-model.md Route table, contracts/site.md Site manifest):
  - `ROUTES = { pages: [{ path: '/cv', aliases: ['/cv/'], file: 'cv.html' }], redirects: [{ from: '/', to: '/cv', status: 307 }], notFound: { file: '404.html', status: 404 } }`, frozen, with its type `Routes`.
  - `type SiteManifest = { version: string; routes: Routes; files: { path: string; hash: string; type: string }[] }`.
  - `resolveRoute(routes, pathname)`: returns `{ kind: 'page', file }`, `{ kind: 'redirect', to, status }` or `{ kind: 'not-found', file, status }`. Query strings are ignored by the caller. Matching is exact: `/cv.html` and `/cv/x` are not-found.
  - Pure, with no Node or DOM import, so the server, the build, the service worker's generated code and the checks can all use it.
- [X] T010 [P] Define the site check's shared types in `tools/site-check/src/report.ts`, with no enums (data-model.md Site check, contracts/cli.md). Rendering comes in T067:
  - `PARTS`, in the summary's order: `'content'`, `'accessibility'`, `'lighthouse'`, `'no-script'`, `'offline'`, `'keyboard'`, `'other-sites'`, `'fonts'`, `'layout'`, `'print'`, `'modes'`. `Part` is its element type.
  - `Problem = { part: Part; page: string; variant: string; type: string; subject: string; detail: string }`. `page` is a URL path or `-`. `variant` is `375px`, `mobile`, `400%-zoom`, `text-spacing`, `A4`, `Letter`, `forced-colors`, `reduced-motion` or `-`.
  - `CheckResult = { part: Part; page: string; variant: string; status: 'pass' | 'fail' | 'error'; problems: Problem[]; scores?: Record<string, { median: number; runs: number[] }> }`.
  - `Report = { siteDir: string; version: string; pages: { path: string; status: number }[]; results: CheckResult[]; problems: Problem[]; result: 'pass' | 'fail' }`.
- [X] T011 [P] Create the Chromium launcher in `tools/site-check/src/browser.ts` (research R17):
  - `ISOLATION_ARGS = ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--proxy-server=127.0.0.1:9']`.
  - `launchChromium()`: `chromium.launch({ args: ISOLATION_ARGS })` from `playwright`. It's the only place a browser is launched for Playwright.
  - `chromiumPath()`: `chromium.executablePath()`, for Lighthouse's `chrome-launcher` (T070), which must pass `ISOLATION_ARGS` too.
  - `hasChromium()`: whether that path exists, for the CLI's exit 2 (T076).
- [X] T012 [P] Write `packages/web/test/routes.test.ts`, covering 004-cv-page-FR-017, 004-cv-page-FR-018 and 004-cv-page-FR-019, against the built site served by `startServer` (T013, T015). It fails until T013 and T014.
  - FR-017: `/cv`, `/cv/`, `/cv?x=1` and `/cv#a` answer 200 with the same body. The head has no `<link rel="canonical">` and no `og:url`.
  - FR-018: `/` answers 307 with `Location: /cv`, and `/?x=1` with `Location: /cv?x=1`. Neither has a `Cache-Control` that allows storing. A Playwright page opening `/` ends at `/cv` (Constitution VII).
  - FR-019: `/nope`, `/cv.html` and `/cv/x` answer 404 with the body of `404.html`, which holds an `a[href="/cv"]`.
  - In a group with no FR ID ("HTTP behavior (contracts/site.md)"): `HEAD /cv` answers as `GET` with no body; `POST /cv` answers 405 with `Allow: GET, HEAD`; a listed asset has `Cache-Control: public, max-age=31536000, immutable`; HTML has `Cache-Control: no-cache`; with `Accept-Encoding: br`, HTML comes back with `Content-Encoding: br`.
- [X] T013 Create the local server in `tools/site-check/src/server.ts`, after T009 (research R3, contracts/site.md HTTP behavior):
  - `startServer({ siteDir, manifest, port = 0 })` returns `{ url, close }`. It binds `127.0.0.1` only and serves nothing outside `manifest.files` and the routes. It answers every row of the HTTP behavior table, including `HEAD`, 405 and the cache headers, and compresses text with Brotli or gzip from `node:zlib` when the request accepts it.
  - The not-found page is read from `routes.notFound.file`. Redirects keep the original query string.
  - When run as a script (`import.meta.main`), it serves `packages/web/dist/site/` by `packages/web/dist/site-manifest.json` on `PORT` or `4173`, and prints `Serving packages/web/dist/site at http://127.0.0.1:<port>/`. That's `npm run serve`.
- [X] T014 Create the build pipeline, with stub pages, in `packages/web/vite.config.ts`, `packages/web/scripts/build-site.ts`, `packages/web/src/render.tsx`, `packages/web/src/pages/Document.tsx`, `packages/web/src/pages/CvPage.tsx`, `packages/web/src/pages/NotFoundPage.tsx` and `packages/web/src/styles/global.css`, after T005, T007 and T009 (research R2, contracts/site.md Output layout):
  - `vite.config.ts`:
    - `css.transformer: 'lightningcss'` with `lightningcss.drafts.customMedia: true`, and `build.cssMinify: 'lightningcss'`;
    - `build.manifest: true`, `build.assetsInlineLimit: 0`, output under `dist/site/assets/`;
    - client input `{ cv: 'src/styles/global.css' }`, so the style sheet is `cv-<hash>.css`;
    - `logLevel: 'warn'`, so a successful build prints nothing on stdout (the site check's report owns stdout).
  - `global.css`: `@import "@cv/tokens/tokens.css";` and a base rule for `body` using `--token-color-surface`, `--token-color-text-primary` and the body typography tokens. **Verify** that the built CSS holds no `@custom-media`, and that a `@media (--token-breakpoint-wide)` rule comes out with the export's px value.
  - `render.tsx`: `renderCv({ resume, siteData, assets })` and `renderNotFound({ siteData, assets })`, each returning `<!doctype html>` plus `renderToStaticMarkup` of the page. `assets` is `{ css: string[]; scripts: string[]; preloadFonts: string[] }`.
  - `Document.tsx`: everything in contracts/page.md's Document that doesn't depend on later stories: `html lang="en"`, `meta charset`, `viewport`, `color-scheme` `light`, a `title` prop, `<link rel="icon" href="data:,">`, the style sheet links, then `children`. US5 adds the description and preview tags. US4 adds the script.
  - `CvPage.tsx`: a stub `<main>` with the `h1` (name, or `CV`). US1 replaces it.
  - `NotFoundPage.tsx`: complete per contracts/page.md's Not-found page, with its text from site text. Until T032, hold the four strings in a local constant that T032 moves.
  - `build-site.ts`:
    1. a Vite client build;
    2. a Vite SSR build of `src/render.tsx` into a temporary directory;
    3. render each route to `dist/site/<file>`, with asset links from Vite's manifest;
    4. write `dist/site-manifest.json`, with `version` the first 16 hex characters of a SHA-256 over every file's path and hash, and `files` sorted with `compare`.

    It takes an optional `--out <dir>` (default `packages/web/dist`) so tests build into a temporary directory. On any failure it prints `site build failed: <message>` to stderr and exits **2**, so `npm run site-check` exits 2 when the build fails (contracts/cli.md Exit codes). Two builds of the same files give the same manifest byte for byte.
- [X] T015 Create the page test helpers in `packages/web/test/helpers/site.ts` and `packages/web/test/helpers/browser.ts`, register the global setup in `vitest.config.ts`, after T011, T013 and T014 (research R21, plan Dependencies "Test helpers"):
  - `site.ts`:
    - default-exports a Vitest `globalSetup` `setup({ provide })` that runs `build-site.ts --out <temp dir>` once per run and provides `siteDir`. It removes the directory in `teardown`;
    - `builtSite()`: `{ dir, manifest }` from `inject('siteDir')`;
    - `serveBuilt()`: starts `startServer` on the built site, and closes it when the test finishes;
    - `serveFixture(resume, siteData?)`: copies the built site to a temporary directory, renders `cv.html` from the fixture with the SSR `renderCv` and the same assets, serves it, and cleans up when the test finishes;
    - `renderFixtureHtml(resume, siteData?)`: the HTML string, without serving.
  - `browser.ts`: `openPage(url, { width, height = 900, deviceScaleFactor, javaScriptEnabled, forcedColors, reducedMotion, colorScheme, serviceWorkers, media })` on one `launchChromium()` browser per test file, closed after it.
  - `vitest.config.ts`: add `globalSetup: ['packages/web/test/helpers/site.ts']`. Browser test files set a 60 s timeout.
- [X] T016 Checkpoint, after T005 to T015:
  - `npm run build` writes `packages/web/dist/site/{cv.html,404.html,assets/…}` and `dist/site-manifest.json`, and `npm run serve` shows the stub page;
  - `routes.test.ts` passes;
  - `npm run typecheck`, `npm run content-check` and `npm run token-check` pass;
  - `npm test` passes except 001's `tools/traceability/test/self-check.test.ts`. That fails until T103, because 004's spec is Approved and its 58 requirements aren't covered yet. `npm run traceability` ends `FAIL: 55 problems found.` or close to it (FR-017 to FR-019 are covered now). That's expected. Any other failure is a defect.

**Checkpoint**: Foundation ready. User story implementation can now begin.

---

## Phase 3: User Story 1 - Read the whole CV on any screen, with or without JavaScript (Priority: P1) 🎯 MVP

**Goal**: `/cv` shows every supported section of the CV document in the design's order, as
server-rendered HTML styled only with tokens, in the design's fonts. It reads from 320 px to
2560 px, at 200% and 400% zoom and with text spacing overridden. It has one `h1`, a heading per
section and per entry, and named regions, and dates read as words. Every link is reachable by
keyboard with a visible indicator, and it holds up in forced colors.

**Independent Test**: build the site, open `/cv` with JavaScript off at 320 and 1440 px, and
confirm every shown field of the CV document appears, in order, with no horizontal scrolling. The
heading list is `Alex Profir`, then one heading per section (spec US1, quickstart 1 and 5).

### Tests for User Story 1 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**
>
> - Fixture CVs come from `packages/web/test/__fixtures__/` (T017). The real CV comes from
>   `@cv/content`.
> - Browser tests use `serveBuilt` or `serveFixture` (T015) and `openPage`.
> - Assertions on HTML strings parse with a DOM-free approach: Chromium's `page.setContent` with
>   `javaScriptEnabled: false`, or a regular expression only for attributes.

- [X] T017 [P] [US1] Create the fixture CVs in `packages/web/test/__fixtures__/`, each a JSON Resume document valid for 002's schema (research R21, spec Edge Cases). Each file's top comment can't exist in JSON, so `packages/web/test/__fixtures__/README.md` lists each file and what it seeds:
  - `every-field.json`: every shown field of the Key Entities table, each with a distinct value, including `basics.url`, a profile with no username, a work entry with `location` and `url`, a project with `entity`, `type`, `roles`, `url` and `keywords`, an education entry with `url`, `score` and `courses`, a skill with `level`, and an interest with keywords;
  - `three-projects.json`: three projects in a non-chronological order;
  - `no-name.json`: no `basics.name`; `no-summary.json`: no summary; `nothing-optional.json`: no email, location, summary or profiles;
  - `empty-sections.json`: `"interests": []` and no `languages`;
  - `partial-dates.json`: entries for each row of data-model.md's Date range table, plus `2018` to `2018-07`, `2018` to `2019-03`, `2018-07-29` alone, and same-month start and end;
  - `no-url-no-dates.json`: a project with no URL and no dates, a role with no highlights, a skill with no keywords, an education entry with no courses, and a profile with no URL;
  - `entry-without-heading.json`: a work entry with neither position nor name, and an entry holding nothing shown;
  - `long-words.json`: a 120-character word in a project name and a 200-character URL in a summary;
  - `non-ascii.json`: names and places with `ș`, `ț`, `ă`, `é`, `ü` and `ß`.
- [X] T018 [P] [US1] Write `packages/web/test/dates.test.ts`, covering 004-cv-page-FR-009, 004-cv-page-FR-010 and 004-cv-page-FR-011. It tests `dateValue(raw)` and `dateRange(start, end)` from `src/format/dates.ts` (data-model.md Date value and Date range).
  - FR-009: `2018`, `2018-07` and `2018-07-29` give precision `year`, `month`, `day`, visible `2018`, `Jul 2018`, `29 Jul 2018`, spoken `2018`, `July 2018`, `29 July 2018`, and `raw` unchanged. No output holds a month or a day the input didn't give.
  - FR-010, one case per row of the Date range table:
    - start and end → visible `Jul 2018 – Oct 2026`;
    - `2025-12` and no end → `Dec 2025 – Present` (US1 scenario 8);
    - end only → `Oct 2026`;
    - `2018-07` to `2018-07` → `Jul 2018`; `2018` to `2018-07` → `2018`; `2018` to `2019-03` → `2018 – Mar 2019`;
    - neither → `null` (no date line, US1 scenario 12).
  - FR-011: spoken `July 2018 to October 2026` (US1 scenario 7) and `December 2025 to present`. Every month name, short and long, and `Present`, `present`, `to` and the separator come from `siteText` (T032).
- [X] T019 [P] [US1] Write `packages/web/test/location.test.ts`, covering 004-cv-page-FR-008. It tests `locationLine(location)` from `src/format/location.ts`:
  - `{ city: 'Timișoara', countryCode: 'RO' }` → `Timișoara, Romania`;
  - with a region → `city, region, Country`;
  - each part only when present, and `{}` → `null`;
  - each of the 249 codes in `tools/content-check/src/countries.ts` gives a name that isn't the code itself (research R7).
- [X] T020 [P] [US1] Write `packages/web/test/content.test.tsx`, covering 004-cv-page-FR-001, 004-cv-page-FR-002, 004-cv-page-FR-003, 004-cv-page-FR-004 and 004-cv-page-FR-007, on the real CV and fixtures through `renderFixtureHtml` and the browser:
  - FR-001: the real CV gives the intro block, then sections `Experience`, `Projects`, `Skills`, `Education`, `Languages`, `Interests`, in that order (US1 scenario 1). `three-projects.json` keeps its document order.
  - FR-002: `every-field.json` renders every shown field of the Key Entities table, each found by its text, or by `time[datetime]` for dates.
  - FR-003: every text node inside `<main>` of the real CV is either a substring of a CV string (after the formatting of T033 to T035) or a `siteText` value. No text is hardcoded.
  - FR-004: `empty-sections.json` has no Interests or Languages heading and no empty `section`. `nothing-optional.json` has no `dl` row, label, separator or empty element for the missing fields.
  - FR-007: `Politehnica University of Timișoara` appears exactly, in NFC, in the real CV's page (US1 scenario 10). Every string of `non-ascii.json` appears exactly. No CV string is passed as HTML: a fixture summary holding `<b>x</b>` is shown as text.
- [X] T021 [P] [US1] Write `packages/web/test/links.test.tsx`, covering 004-cv-page-FR-012 and 004-cv-page-FR-013:
  - FR-012: the real CV's email link is `mailto:alexprofir512@gmail.com`; the GitHub link's `href` is `https://github.com/alex-profir` (US1 scenario 9); `every-field.json`'s basics, work, project and education URLs are links to their URLs. In `no-url-no-dates.json`, the project's name and the profile without a URL are plain text, not links (US1 scenario 12). No link has a `target`.
  - FR-013: the profile link's accessible name is `GitHub: alex-profir`, from Chromium's accessibility tree. With no username, it's the network. An entry link's accessible name is the entry's name.
- [X] T022 [P] [US1] Write `packages/web/test/site-text.test.ts`, covering 004-cv-page-FR-006:
  - every string in `siteText` uses only printable ASCII plus `–`, `—`, `·`, `’` and `↗`, as a fixed allowed-character test for English;
  - no `siteText` string contains a key fact of the real CV: the name, email, username, city, any work, project or education name;
  - the rendered not-found page holds no CV string from the real CV.
- [X] T023 [P] [US1] Write `packages/web/test/structure.test.tsx`, covering 004-cv-page-FR-011, 004-cv-page-FR-023, 004-cv-page-FR-024, 004-cv-page-FR-025, 004-cv-page-FR-026 and 004-cv-page-FR-027, reading Chromium's accessibility tree:
  - FR-011: each `p.date`'s accessible text equals the spoken form, and each `time` has the CV string as `datetime`.
  - FR-023: exactly one `h1`, `Alex Profir`. With `no-name.json`, `CV`.
  - FR-024: the heading outline is `h1`, then one `h2` per shown section, with an `h3` per work, project and education entry under its section; no level is skipped (US1 scenario 6). In `entry-without-heading.json`, the `h3` falls back to the organization, then the date, and the empty entry isn't rendered.
  - FR-025: one `main`; every section is a `region` named by its `h2`; the footer is outside `main`.
  - FR-026: highlights, keywords, courses, profiles, skills, languages and interests are `list` and `listitem`.
  - FR-027: `html` has `lang="en"`.
- [X] T024 [P] [US1] Write `packages/web/test/server-html.test.ts`, covering 004-cv-page-FR-014, 004-cv-page-FR-015 and 004-cv-page-FR-016, on the built `cv.html` and `404.html` files:
  - FR-014: `cv.html`, loaded with scripting off, holds every shown field of the real CV in order (as the no-script part does, through `expectedFields` of T068 once it exists; until then, a list built from `resume` in the test).
  - FR-015: neither page holds a `<button>`, form control or `<noscript>`.
  - FR-016: every `src`, resource `href` and CSS `url()` in the build output is a path on the site or a `data:` address.
- [X] T025 [P] [US1] Write `packages/web/test/layout.test.ts`, covering 004-cv-page-FR-020, 004-cv-page-FR-021, 004-cv-page-FR-022 and 004-cv-page-FR-027, calling the layout part's page functions (T049):
  - FR-020: the real CV at 320, 375, 768, 1024, 1440 and 2560 px has no horizontal scroll, and at 2560 px the page column is no wider than `size.page`.
  - FR-021: at 200% zoom (640 px, scale 2) and 400% zoom (320 px, scale 4), nothing scrolls sideways or is clipped, and at 400% the layout is one column (US1 scenarios 4 and 5). With the WCAG 1.4.12 text spacing style sheet, nothing is clipped and no two text boxes overlap.
  - FR-022: `long-words.json` at 320 px stays inside the column.
  - FR-027: at every width, each element's box comes after the previous one's in reading order, and no rule in the built CSS uses `order` or a reversed flex direction.
- [X] T026 [P] [US1] Write `packages/web/test/accessibility.test.ts`, covering 004-cv-page-FR-028 and 004-cv-page-FR-019, calling the accessibility part's page function (T047): axe-core with the tags of research R12 finds no violation on `/cv` with the real CV and with every fixture CV, and on the not-found page, at 320, 375 and 1440 px, and once more at 375 px with `colorScheme: 'dark'` (spec Edge Cases: a visitor whose system prefers a dark theme).
- [X] T027 [P] [US1] Write `packages/web/test/focus.test.ts`, covering 004-cv-page-FR-029, calling the keyboard part's page function (T048) on the real CV, `every-field.json` and the not-found page at 375 and 1440 px: every link is reached by Tab in reading order, shows an indicator of 3:1 or more, and isn't covered.
- [X] T028 [P] [US1] Write `packages/web/test/modes.test.ts`, covering 004-cv-page-FR-030 and 004-cv-page-FR-031, calling the modes part's page functions (T050):
  - FR-030: with `forcedColors: 'active'`, rules, timeline line and dots, and chips keep a visible border; links keep their underline; the focus outline is visible; no element has a background image.
  - FR-031: with and without `reducedMotion: 'reduce'`, every element's computed transition and animation durations are 0.
- [X] T029 [P] [US1] Write `packages/web/test/design.test.ts`, covering 004-cv-page-FR-042, on the real CV:
  - section order as design/review.md lists it;
  - fonts per element: `h1` and `h2` use `font.family.display`, body text `font.family.body`, `p.date`, `p.role`, skill levels and chips `font.family.mono`, read as computed `font-family` against `tokenValue`;
  - at 1440 px the page column is `size.page` wide with `space.14` padding on each side, and sections are two columns with a `size.section-label` heading column; at 375 px the side padding is `space.5` and sections are one column.

  The visual comparison with the PNG exports is by hand (T105).
- [X] T030 [P] [US1] Write the FR-007 group of `packages/web/test/fonts.test.ts`, covering 004-cv-page-FR-007, calling the fonts part's page function (T051): on the real CV and `non-ascii.json` at 375 and 1440 px, every character is drawn by a served face whose family is in `fonts.json`. US6 adds FR-045 and FR-046 groups to this file (T094).
- [X] T031 [P] [US1] Write `packages/web/test/data-req.test.tsx`, covering 004-cv-page-FR-047: in the rendered `/cv` (`every-field.json`) and not-found page, every element of contracts/page.md's `data-req` targets table carries exactly that row's IDs, and no other element carries a `data-req`.

### Implementation for User Story 1

- [X] T032 [P] [US1] Create `packages/web/src/site-text.ts`, one exported frozen object with every key and value of data-model.md's Site text table (FR-006). Move T014's not-found strings into it, and update `NotFoundPage.tsx` to read them.
- [X] T033 [P] [US1] Create `packages/web/src/supported.ts`, the Key Entities table as data (FR-002, FR-005, data-model.md Supported content):
  - `SUPPORTED_SECTIONS` in the design's order: `work`, `projects`, `skills`, `education`, `languages`, `interests`, with `basics` before them;
  - `SHOWN_FIELDS`: the per-section field lists exactly as data-model.md gives them;
  - `UNSUPPORTED_SECTIONS`: `volunteer`, `awards`, `certificates`, `publications`, `references`;
  - `IGNORED`: `$schema`, `meta`.
- [X] T034 [P] [US1] Create `packages/web/src/format/dates.ts` (FR-009 to FR-011, research R7, data-model.md Date value and Date range): `dateValue(raw)` and `dateRange(start, end)` returning `{ start?: DateValue; end?: DateValue; ongoing: boolean; visible: string; spoken: string } | null`. Month names and words come from `siteText`, never `Intl`. Equality is compared at the coarser precision, and each side keeps its own.
- [X] T035 [P] [US1] Create `packages/web/src/format/location.ts` (FR-008, research R7): `countryName(code)` with `new Intl.DisplayNames(['en'], { type: 'region' })`, and `locationLine({ city, region, countryCode })` joining the present parts with `, `, or `null`.
- [X] T036 [US1] Owner action, with help, needs the network once: download the fonts into `packages/web/src/fonts/` (FR-045, research R5, contracts/fonts.md Files). For Space Grotesk, Schibsted Grotesk and JetBrains Mono:
  - every WOFF2 subset file Google Fonts serves for the web, as variable files with a weight axis, saved as `<family-dir>/<subset>.woff2` (`latin`, `latin-ext`, and every other subset the family has);
  - each subset's `unicode-range` from the same CSS;
  - the family's `OFL.txt` from its upstream repository, in the family's directory.

  Files are committed as downloaded and never edited.
- [X] T037 [US1] Write `packages/web/src/fonts/fonts.json` and `packages/web/src/fonts/README.md`, after T036 (contracts/fonts.md):
  - `fonts.json`: one entry per family, `family` equal to the font token's first value, `token` (`font.family.display`, `font.family.body`, `font.family.mono`), `license`, and `files[]` with `file`, `subset`, `weight` (the file's range, such as `300 700`), `style` and `unicodeRange`.
  - `README.md`: each file's source address, download date and SHA-256 (`shasum -a 256`), and the license.
- [X] T038 [US1] Create the fonts plugin in `packages/web/scripts/fonts-plugin.ts`, and use it in `vite.config.ts`, `global.css` and `build-site.ts`, after T037 (research R5, contracts/fonts.md What the build generates). US6 adds its validation (T097).
  - It serves `virtual:cv-fonts.css`: one `@font-face` per file, with `font-family` from `fonts.json`, `src: url("/src/fonts/<file>") format("woff2")`, `font-weight`, `font-style`, `font-display: swap` and `unicode-range`. Vite hashes the files.
  - `global.css` imports `virtual:cv-fonts.css` first, and `body`, headings and mono text use the font tokens only.
  - Font assets are named `assets/<family-dir>-<subset>-<hash>.woff2`: `assetFileNames` maps them from the asset's original path. **Verify** with the build output, since every family has a `latin.woff2`.
  - `build-site.ts` passes the hashed `latin` file of each family as `assets.preloadFonts`, and `Document.tsx` renders `<link rel="preload" as="font" type="font/woff2" crossorigin href>` for each. Find the hashed names in Vite's manifest; if it doesn't list CSS assets (**Verify**), record them in the plugin's `generateBundle` hook.
  - `npm run token-check` and `npm run content-check` still pass with the plugin and the font files in the repository.
- [X] T039 [P] [US1] Create the shared components in `packages/web/src/cv/` (contracts/page.md):
  - `VisuallyHidden.tsx`: a `span` with the `visually-hidden` class (T045);
  - `Arrow.tsx`: inline `<svg aria-hidden="true" focusable="false">` for `→` and `↗`, stroked with `currentColor`, sized by CSS;
  - `DateRange.tsx`: `p.date` with the `data-req` of its row, an `aria-hidden` span of `time` elements and the visible separator or `Present`, then the spoken text in `VisuallyHidden`. Renders nothing when `dateRange` is `null`;
  - `Chips.tsx`: `ul.chips > li`, or nothing for an empty list;
  - `Section.tsx`: `section[aria-labelledby]` with its `data-req`, the `aria-hidden` number (`01`… by sections shown), and the `h2`.
- [X] T040 [US1] Create `packages/web/src/cv/Intro.tsx` (contracts/page.md /cv structure, Fields): `div.intro` with `p.role`, the `h1` with its `data-req` (name, or `siteText.siteHeading`), `p.summary`, and `dl.contact` with the location row (the `dd` with its `data-req`), the email row, the website row and `ul.profiles`. Profile links show the username, with `${network}: ` in `VisuallyHidden` before it, as `siteText.profileLabel` gives. A row, label or list is left out when its field is (FR-004).
- [X] T041 [US1] Create `packages/web/src/cv/Timeline.tsx` and `packages/web/src/cv/Entry.tsx` for work, projects and education (contracts/page.md): `ol.timeline > li`, with, in DOM order, `DateRange`, the `h3` (with its fallback), `p.org` or `p.meta`, the text paragraphs, `ul.highlights` and `Chips`. Entry links wrap the heading text or organization name. CV links carry the `data-req` of their row. Nothing is reordered by CSS.
- [X] T042 [US1] Create `packages/web/src/cv/Skills.tsx`, `Languages.tsx` and `Interests.tsx` (contracts/page.md): lists in CV order; skill name, level (written as in the CV, capitals by CSS) and chips; language and fluency; interest name and keywords joined by `, `.
- [X] T043 [US1] Create `packages/web/src/cv/SiteFooter.tsx` and use it in both pages (contracts/page.md, research R8): `<footer data-site-element>` with its `data-req`, holding a link to `siteData.repository` with `siteText.builtWith` and the `↗` arrow. No footer when `repository` is absent.
- [X] T044 [US1] Replace the stub in `packages/web/src/pages/CvPage.tsx` and finish `Document.tsx` and `render.tsx` (contracts/page.md): `main` with its `data-req`, `Intro`, then each supported section with at least one entry, in `SUPPORTED_SECTIONS` order, then `SiteFooter` outside `main`. Until US5, `render.tsx` passes the name, or `siteText.siteHeading`, as the title.
- [X] T045 [US1] Write the base styles in `packages/web/src/styles/global.css` (research R8, R19): the `visually-hidden` class; `overflow-wrap: anywhere` on text that holds CV content; link color and underline from tokens (`border.thick` in `color.link.underline`, offset `space.1`); a focus `outline` (not `box-shadow`) `border.thick` wide in `color.focus`, offset `space.0_5`; `@media (forced-colors: active)` with the outline in `Highlight`; a minimum block size of `size.target` on standalone links (contact rows, footer, "Go to the CV"); no transition or animation anywhere.
- [X] T046 [US1] Write the layout in `packages/web/src/styles/cv.css`, matching the revision 10 exports and the wireframes (FR-020, FR-042): one column by default with `space.5` side padding; from `@media (--token-breakpoint-wide)` a centered column at most `size.page` wide with `space.14` side padding, and each section's heading in `size.section-label` (data-model.md Token roles, How the layout uses them); the timeline line and dots as borders; chips as bordered `li`; light and strong rules as borders; the not-found page's layout. Only tokens. No `order`, reversed flex or out-of-order grid placement.
- [X] T047 [P] [US1] Create `tools/site-check/src/parts/accessibility.ts` (research R12): `axeProblems(page, pageLabel, variant)` injects `node_modules/axe-core/axe.min.js` with `page.addScriptTag({ path })`, runs `axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })`, and returns one `Problem` per violation node: type `axe:<rule id>`, subject the node's selector, detail axe's summary.
- [X] T048 [P] [US1] Create `tools/site-check/src/parts/keyboard.ts` (research R15): `keyboardProblems(page, pageLabel, variant)` with the four steps of R15. Types `not-reached`, `out-of-order`, `no-focus-indicator` and `covered`, subjects and details as contracts/cli.md shows. Every link without a visible indicator is listed.
- [X] T049 [P] [US1] Create `tools/site-check/src/parts/layout.ts` (research R19): `horizontalScroll(page)`, `clippedOrOverlapping(page)`, `isOneColumn(page)` and the text-spacing style sheet, each returning problems with types `horizontal-scroll`, `clipped`, `overlap` and `not-one-column`, plus `LAYOUT_VARIANTS` (the six widths, `200%-zoom`, `400%-zoom` and `text-spacing`).
- [X] T050 [P] [US1] Create `tools/site-check/src/parts/modes.ts` (FR-030, FR-031): `forcedColorsProblems(page)` (types `invisible-separator`, `invisible-link`, `invisible-focus`, `background-image`) and `motionProblems(page)` (type `motion`, detail naming the property and duration).
- [X] T051 [P] [US1] Create `tools/site-check/src/parts/fonts.ts` (research R16): `fontProblems(page, families)` opens a CDP session, enables `DOM` and `CSS`, and for each element with text calls `CSS.getPlatformFontsForNode`. A font that isn't custom or isn't in `families` gives `missing-glyph` per character (`U+0219 ș`), with the section and selector. **Verify** first, on a scratch page, that a character outside every subset reports a fallback font.
- [X] T052 [US1] Checkpoint, after T017 to T051:
  - every US1 test passes;
  - `npm run build`, then `npm run serve`: `/cv` matches the revision 10 exports at 1440 and 375 px by eye (the full comparison is T105), and reads in full with JavaScript off (quickstart 5);
  - `npm run token-check` and `npm run content-check` pass with no exception;
  - `npm run traceability` lists only FRs whose tests come in later stories. Any other failure is a defect.

**Checkpoint**: User Story 1 is fully functional and testable on its own. This is the MVP.

---

## Phase 4: User Story 2 - Every pull request proves the page is accessible, fast, readable without scripts and offline (Priority: P2)

**Goal**: `npm run site-check` builds the site, serves it, runs all eleven parts in isolated
Chromium, prints every problem and a summary with every Lighthouse score, and exits 0, 1 or 2. A
`site` CI job runs the same command, and the ruleset requires it.

**Independent Test**: on a copy of the site, remove a link's text so it has no accessible name.
Run the check and confirm it fails, naming the page, the width and the element. Add a style sheet
from another site and confirm it fails, naming the address (spec US2).

### Tests for User Story 2 (REQUIRED) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation.**
>
> - Fixture sites live in `tools/site-check/test/__fixtures__/<name>/`, laid out as a repository:
>   `packages/web/dist/site-manifest.json`, `packages/web/dist/site/…` and
>   `packages/content/resume.json`. `dist` under `__fixtures__` is skipped by every check.
> - Most tests call `runCheck(root, { parts })` from `src/check.ts` in-process and assert on
>   `report.problems`. CLI tests use `runCli` (T053).

- [X] T053 [P] [US2] Create the check's test helper `tools/site-check/test/helpers/sites.ts`:
  - re-export `REPO_ROOT` and `makeProject` from 001's helper;
  - `MAIN_PATH`, and `runCli(cwd, args = [], env = {})` spawning `node MAIN_PATH` with `{ cwd, encoding: 'utf8' }`, returning `{ status, stdout, stderr }`;
  - `fixture(name)`: the absolute path of a committed fixture site;
  - `siteProject(files)`: a temporary fixture site from a minimal valid site plus `files`, for cases too large or too many to commit;
  - `maskScores(report)`: the report with every Lighthouse score replaced by `<n>` (contracts/cli.md Determinism), used by T056 and T100.
- [X] T054 [P] [US2] Create the fixture sites in `tools/site-check/test/__fixtures__/` (research R21), each with a `site-manifest.json` whose routes match `routes.ts`, and a `README.md` listing what each seeds:
  - `minimal/`: a valid one-page site that passes every part, with a tiny `resume.json` and the real fonts copied from T036's `latin` files;
  - `no-link-name/` (a link with no accessible name), `low-contrast/` (body text below 4.5:1);
  - `script-only-projects/` (projects inserted by a script), `has-button/`;
  - `fonts-not-stored/` (the worker leaves fonts out), `root-not-offline/` (the worker doesn't answer `/`);
  - `no-focus-outline/`, `positive-tabindex/`, `covered-link/`;
  - `other-sites/` (an analytics script from `https://www.googletagmanager.com/…` and a style sheet from `https://example.com/x.css`), `ip-request/` (`http://203.0.113.10/x.js`);
  - `missing-glyph/` (a character outside every served subset);
  - `certificates/` (`resume.json` with 2 certificates, `basics.phone` and `work[0].contact`), `empty-unsupported/` (`"awards": []`, `$schema` and `meta` only);
  - `second-page/` (a manifest with a second page at `/about`).

  The Lighthouse "2 MB blocking script" case is generated by `siteProject` in T059, not committed.
- [X] T055 [P] [US2] Write `tools/site-check/test/report.test.ts`, covering 004-cv-page-FR-058, on hand-built reports and `renderReport`:
  - every problem line matches `<part> <page> <variant> <type> <subject>: <detail>`;
  - lines are sorted by part (in `PARTS` order), page, variant, type and subject with `compare`, and shuffling the input doesn't change the output;
  - the summary is byte for byte contracts/cli.md's example for the same report: first line `Site check: PASSED` or `FAILED`, the site and version, pages with statuses, every part with every page and variant and its pass or fail with counts, every Lighthouse category with its median, and the closing count line;
  - with no problems the report starts at the summary, and it ends with exactly one `\n`.
- [X] T056 [P] [US2] Write `tools/site-check/test/cli.test.ts`, covering 004-cv-page-FR-049, 004-cv-page-FR-057 and 004-cv-page-FR-058:
  - FR-049: `package.json`'s `site-check` script is exactly `npm run build && node tools/site-check/src/main.js`, and the CI step runs `npm run site-check` (read from `ci.yml`). Two `runCli` runs on `minimal/` give the same result (contracts/cli.md Determinism): the same exit code, and the same stdout once Lighthouse scores are masked with `maskScores` from `test/helpers/sites.ts`.
  - FR-057: on `ip-request/` and `other-sites/`, both addresses are reported and no connection is made (the positive control of R17, checked with a local TCP listener on port 9 that receives nothing). Every launch in `src/` goes through `browser.ts` (a grep of `tools/site-check/src/` finds `chromium.launch` only there, and `chrome-launcher` is given `ISOLATION_ARGS`).
  - FR-058: on a site where several parts fail, every part still has a result. A part that throws is reported as `error` with `the part crashed: <message>`, and the others continue. Exit codes: 0 on `minimal/`, 1 on `no-link-name/`.
  - Exit 2, with the exact stderr line of contracts/cli.md: an argument (`usage: npm run site-check (takes no arguments)`); Node 24 (`site check needs Node 26 or later (see .nvmrc), but this is Node 24.21.0`, through the version function); missing Chromium (with `PLAYWRIGHT_BROWSERS_PATH` pointed at an empty directory); a missing `dist/` (`site check could not start: …`). In a copy of the repository with a broken `render.tsx`, `npm run site-check` exits 2.
  - stdout holds only the report: `npm run --silent site-check` on the real repository (off CI only, `test.skipIf(process.env.CI)`) prints nothing before `Site check:` or the first problem line.
- [X] T057 [P] [US2] Write `tools/site-check/test/content.test.ts`, covering 004-cv-page-FR-005: on `certificates/`, `unsupported-section certificates` with its entry count (US6 scenario 5), and `unsupported-field basics.phone` and `work[0].contact`; on `empty-unsupported/`, no problem.
- [X] T058 [P] [US2] Write `tools/site-check/test/accessibility.test.ts`, covering 004-cv-page-FR-050: `no-link-name/` fails with `axe:link-name` (US2 Independent Test) and `low-contrast/` with `axe:color-contrast` (US2 scenario 2), each naming the page, the width and the element's selector; `minimal/` passes at 320, 375 and 1440 px on both pages.
- [X] T059 [P] [US2] Write `tools/site-check/test/lighthouse.test.ts`, covering 004-cv-page-FR-051 and SC-003:
  - FR-051: a `siteProject` page with a 2 MB blocking script scores under 90 on the mobile profile and fails with `low-score performance: <median> (runs a, b, c); needs 90` (US2 scenario 3); `minimal/` passes on both profiles; the not-found page and the redirect aren't scored.
  - SC-003, in a group with no FR ID, off CI only: on the real build, the median first contentful paint on the mobile profile is under 2,500 ms, and the `h1` and `p.role` lie inside the first 375 × 667 px viewport (plan, SC-003).
  - Give the file a 5-minute timeout.
- [X] T060 [P] [US2] Write `tools/site-check/test/no-script.test.ts`, covering 004-cv-page-FR-052, 004-cv-page-FR-014 and 004-cv-page-FR-015:
  - FR-052: the expected fields come from the CV document: adding a highlight to a copy of `minimal/`'s `resume.json` adds an expected field, which then fails as `missing-field work[0].highlights[1]`; a swapped section fails as `out-of-order`; an unstyled page fails as `unstyled body`.
  - FR-014 and FR-015: `script-only-projects/` fails with the missing project fields (US2 scenario 4); `has-button/` fails.
- [X] T061 [P] [US2] Write `tools/site-check/test/offline.test.ts`, covering 004-cv-page-FR-053: `fonts-not-stored/` fails with `missing-font` naming the family (US2 scenario 5); `root-not-offline/` fails with `no-redirect /`; `minimal/` passes for `/cv`, `/` and an unknown path.
- [X] T062 [P] [US2] Write `tools/site-check/test/keyboard.test.ts`, covering 004-cv-page-FR-054: `no-focus-outline/` fails naming every link (US2 scenario 6); `positive-tabindex/` fails as `out-of-order`; `covered-link/` fails as `covered`.
- [X] T063 [P] [US2] Write `tools/site-check/test/other-sites.test.ts`, covering 004-cv-page-FR-055 and 004-cv-page-FR-016: `other-sites/` fails naming both full addresses (US2 scenario 7 and Independent Test), on both pages; requests made by the service worker are recorded too; `data:` addresses are allowed.
- [X] T064 [P] [US2] Write `tools/site-check/test/fonts.test.ts`, covering 004-cv-page-FR-007: `missing-glyph/` fails with `missing-glyph U+…` naming the character, the section and the element.
- [X] T065 [P] [US2] Write `tools/site-check/test/pages.test.ts`, covering 004-cv-page-FR-056: on `second-page/`, `/about` is checked by every page part and by Lighthouse (it answers 200), with no change to the command. The not-found page is requested at the fixed unknown path `/missing-page`.
- [X] T066 [P] [US2] Write `tools/site-check/test/repo-settings.test.ts`, covering 004-cv-page-FR-048, and update the exact-match ruleset assertions in `tools/traceability/test/repo-settings.test.ts`, `tools/content-check/test/repo-settings.test.ts` and `tools/token-check/test/repo-settings.test.ts` to list `traceability`, `test`, `content`, `tokens` and `site` (contracts/ci.md). Read `ci.yml` as text with the same `block`/`job` approach as 003's test, with no YAML dependency:
  - job `site` has `name: site`, and its steps are exactly checkout, setup-node, `npm ci`, `actions/cache`, `npx playwright install --with-deps chromium`, and the check step running `npm run site-check`;
  - its cache path is `~/.cache/ms-playwright` and its key is `playwright-${{ runner.os }}-<v>`, where `<v>` equals the Playwright version in `package-lock.json`;
  - the check step sets `-o pipefail`, pipes through `tee`, and writes to `$GITHUB_STEP_SUMMARY` inside a fenced code block;
  - no `if:`, `strategy:`, `matrix:` or `continue-on-error:`;
  - job `test` has the same cache and install steps before `npm test`;
  - every action is pinned by a 40-character SHA with a version comment;
  - the ruleset's `required_status_checks` deep-equals contracts/ci.md's five entries.

### Implementation for User Story 2

- [X] T067 [US2] Add rendering to `tools/site-check/src/report.ts` (contracts/cli.md Report format): `sortProblems`, `renderProblem` and `renderReport`, exactly as the contract shows, with `compare` and no locale-dependent formatting.
- [X] T068 [P] [US2] Create `tools/site-check/src/expected.ts` (research R14, FR-052): `expectedFields(resume)` lists every shown field the document holds, in `SUPPORTED_SECTIONS` order, as `{ path, text }` or `{ path, datetime }`: text after NFC, dates by their CV string, and the country by `countryName`. It imports `supported.ts` and `location.ts` from `packages/web/src/`, and never holds a hand-written list. T024 switches to it.
- [X] T069 [P] [US2] Create `tools/site-check/src/parts/content.ts` (FR-005, data-model.md Supported content Validation): walks the CV document with `SHOWN_FIELDS`, `UNSUPPORTED_SECTIONS` and `IGNORED`. Page and variant are `-`.
- [X] T070 [P] [US2] Create `tools/site-check/src/parts/lighthouse.ts` (research R13): for each status-200 page and each profile (default mobile, and `lighthouse/core/config/desktop-config.js`), three runs through `chrome-launcher` with `chromiumPath()` and `ISOLATION_ARGS` plus `--headless=new`, storage cleared each run. The median per category is the score. Any category under 90 is `low-score <category>`.
- [X] T071 [P] [US2] Create `tools/site-check/src/parts/no-script.ts` (research R14): with `javaScriptEnabled: false`, at 320 and 1440 px on `/cv`, find each expected field in `<main>`'s text after the previous one (`missing-field`, `out-of-order`), check the body's computed font family and background against the tokens (`unstyled`), and report any `<button>`, form control or `<noscript>` (`script-only-control`).
- [X] T072 [P] [US2] Create `tools/site-check/src/parts/offline.ts` (research R4, R16, FR-053): at 375 px, visit `/cv` online and wait for the service worker to activate; set the context offline and stop answering on the server; open `/cv`, `/` and `/missing-page`; check full content (as no-script), styles, that `/` ends at `/cv`, and that text is drawn in served fonts (`fontProblems`), naming a missing font as `missing-font "<family>"`.
- [X] T073 [P] [US2] Create `tools/site-check/src/parts/other-sites.ts` (research R17, FR-055): records every request of each page and its service worker through `context.on('request')` and `context.route`, at 375 and 1440 px, and reports each one whose origin isn't the server's as `other-site-request <full address>`. `data:` is allowed.
- [X] T074 [P] [US2] Create `tools/site-check/src/parts/print.ts` (research R18): for A4 and Letter, `page.pdf({ format, printBackground: false })`, then `pdfjs-dist`'s legacy build reads each page's text items with positions. Export `pdfText(buffer)` for T081. Problems: `text-cut-off`, `site-element-printed`, `missing-address`, `address-twice`, `heading-at-page-end`, and `low-contrast` (under 4.5:1 against white in print emulation).
- [X] T075 [US2] Create `tools/site-check/src/check.ts`, after T067 to T074 and T047 to T051: `runCheck(root, { parts = PARTS } = {})` reads `packages/web/dist/site-manifest.json` and `packages/content/resume.json`, starts `startServer`, launches one browser, and runs each part over its pages and variants (research R11's table). A part that throws becomes an `error` result, and the rest continue. It stops the server and the browser, removes temporary files, and returns the `Report`.
- [X] T076 [US2] Create `tools/site-check/src/cli.ts` and `tools/site-check/src/main.js` (contracts/cli.md):
  - `main.js` is plain JavaScript: it checks Node with `REQUIRED_NODE_MAJOR` from 001's `node-version.js` and its own message, `site check needs Node 26 or later (see .nvmrc), but this is Node <version>` (001's `nodeVersionProblem` wording mentions blocking network access, which doesn't apply here), then imports `cli.ts`.
  - `cli.ts`: any argument → usage, exit 2; no Chromium (`hasChromium()`) → exit 2; a missing or unreadable manifest → `site check could not start: <message>`, exit 2; otherwise runs `runCheck(process.cwd())`, writes `renderReport` to stdout, exits 0 or 1.
- [X] T077 [P] [US2] Add the `site` job to `.github/workflows/ci.yml` and change the `test` job (contracts/ci.md, research R20):
  - `site`, after `tokens`: `name: site`, `runs-on: ubuntu-latest`; the same checkout and setup-node steps as the other jobs; `npm ci`; `actions/cache` pinned by the full commit SHA of its latest release, with a version comment (look it up with `gh api repos/actions/cache/git/ref/tags/<tag>`), path `~/.cache/ms-playwright`, key `playwright-${{ runner.os }}-1.64.1`; `npx playwright install --with-deps chromium`; then a bash step that runs `set -o pipefail`, `npm run --silent site-check | tee` into a fenced block in `$GITHUB_STEP_SUMMARY`, and exits with the check's status;
  - `test`: the same cache and install steps after `npm ci`, before `npm run typecheck`;
  - no `if:`, `strategy`, `matrix` or `continue-on-error`.
- [X] T078 [P] [US2] Add `{ "context": "site", "integration_id": 15368 }` as the fifth entry of `required_status_checks` in `.github/rulesets/main.json`, in the existing format. Change nothing else.
- [X] T079 [US2] Checkpoint, after T053 to T078:
  - every US2 test passes;
  - `npm run site-check` runs end to end on the real repository in under 5 minutes and prints all eleven parts. The `print` part fails until US3 and the `offline` part until US4, and Lighthouse's SEO category may miss its description until US5. Any other failure is a defect to fix now;
  - `npm run traceability` lists only FRs whose tests come later.

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Print or save a clean CV (Priority: P3)

**Goal**: Printing `/cv` on A4 or US Letter gives the CV and nothing else, in one column, with
every link's address written out, no heading ending a page, and nothing relying on a background.

**Independent Test**: print `/cv` to A4 and US Letter. No site element appears, every link's
address is printed, no text is cut off, and no heading is the last line of a page (spec US3).

### Tests for User Story 3 (REQUIRED) ⚠️

- [X] T080 [P] [US3] Create `packages/web/test/__fixtures__/print-spacer.json` and a helper in `packages/web/test/helpers/site.ts` (research R18): the real CV, rendered with a spacer of a given height before Projects (`serveFixture(resume, siteData, { spacerBefore: 'projects', height })`). The spacer is test-only markup injected by the helper, never in site source.
- [X] T081 [US3] Write `packages/web/test/print.test.ts`, covering 004-cv-page-FR-032, 004-cv-page-FR-033, 004-cv-page-FR-034 and 004-cv-page-FR-035, using `pdfText` from the print part (T074):
  - FR-032: on A4 and Letter, the footer's text is absent and every text item is inside the page box (US3 scenarios 1 and 6); the built CSS has no `@page` rule (scenario 7).
  - FR-033: `https://github.com/alex-profir` appears in the PDF text (scenario 2); the email address appears exactly once (scenario 3); every external link whose text isn't its address is followed by its address.
  - FR-034: with the spacer stepped one line at a time across one page height, no page's last line is a section or entry heading (scenario 4).
  - FR-035: in print emulation, every text color has 4.5:1 or more against white, and no element's information relies on a background (scenario 5).

### Implementation for User Story 3

- [X] T082 [US3] Write `packages/web/src/styles/print.css` and import it from `global.css` (research R9, contracts/page.md Print): inside `@media print`, one column; `footer` and `[data-site-element]` not displayed; text and links in `color.text.primary`; `a[href^="http"]::after { content: " (" attr(href) ")"; }` except where the text is the address; `overflow-wrap: anywhere`; `break-after: avoid` on `h2` and `h3`; `break-inside: avoid` on each entry's date, heading and organization; no `@page` rule; no `print-color-adjust`.
- [X] T083 [US3] Checkpoint, after T080 to T082: `print.test.ts` passes, and `npm run site-check` shows `print pass /cv A4, /cv Letter`.

**Checkpoint**: User Stories 1 to 3 work independently.

---

## Phase 6: User Story 4 - Open the CV again offline or on a weak connection (Priority: P4)

**Goal**: After one visit to `/cv` or `/`, the site opens offline in full, with styles and fonts.
A new version shows on the next online visit and replaces the stored copy whole. Nothing is
shown or asked.

**Independent Test**: visit `/cv` once online, turn the network off, and open `/cv` and `/`. Every
shown field is present, styled, and drawn in the design's fonts (spec US4, quickstart 8).

### Tests for User Story 4 (REQUIRED) ⚠️

- [X] T084 [US4] Write `packages/web/test/offline.test.ts`, covering 004-cv-page-FR-038, 004-cv-page-FR-039, 004-cv-page-FR-040 and 004-cv-page-FR-041 (research R4, R21). Builds of version B (one text changed) and C (a font answering 500) are temporary copies made by the test, served by one server whose files are switched between visits.
  - FR-038: after one visit to `/cv`, and separately to `/` only, with the server stopped and the context offline, `/cv`, `/cv/`, `/cv?utm_source=x`, `/` and `/nope` show their full pages, styled and in served fonts (US4 scenarios 1, 2 and 7).
  - FR-039: A stored, B published: the next online visit shows B, and offline afterwards shows B (scenario 3). Then C: offline still shows B whole (scenario 4).
  - FR-040: with a stored copy, a server that drops the connection, and one that doesn't answer for 5 s, both show the stored copy (scenario 5).
  - FR-041: no dialog, banner or console error during install and update; with `serviceWorkers: 'block'`, the page loads with no console error.

### Implementation for User Story 4

- [X] T085 [P] [US4] Create `packages/web/src/client/register-sw.ts` (research R4): after `load`, if `'serviceWorker' in navigator`, register `/sw.js` with scope `/`, and catch and ignore any failure. It shows and logs nothing.
- [X] T086 [P] [US4] Write `packages/web/src/sw/service-worker.ts` (contracts/site.md Service worker): it reads `PRECACHE`, `VERSION` and `ROUTES`, which the build prepends. Install, activate, navigation and same-origin `GET` handling exactly as the contract's table, with the 3-second network limit and the route table's offline answers. **Verify** that Chromium follows `Response.redirect('/cv', 307)` for a navigation (T084's root case).
- [X] T087 [US4] Extend `packages/web/scripts/build-site.ts`, `vite.config.ts` and `Document.tsx`, after T085 and T086: add `register-sw: 'src/client/register-sw.ts'` to the client inputs; pass its hashed path as `assets.scripts`, rendered as `<script type="module" src>`; write `dist/site/sw.js` by stripping the worker's types with `module.stripTypeScriptTypes` and prepending `const PRECACHE = […]`, `const VERSION = "…"` and `const ROUTES = …` (every manifest file except `/sw.js`). `sw.js` is in the manifest. `npm run typecheck` covers the worker through its own project.
- [X] T088 [US4] Checkpoint, after T084 to T087: `offline.test.ts` passes, and `npm run site-check` shows `offline pass /cv, /, /missing-page`. quickstart 8 behaves as written.

**Checkpoint**: User Stories 1 to 4 work independently.

---

## Phase 7: User Story 5 - Share the link with a clear preview (Priority: P5)

**Goal**: The page's title and link preview carry the owner's name and role, and its
description is the summary, all from the CV document. No address or image is declared.

**Independent Test**: read the head of `cv.html` and compare it with the CV document. Change the
role in a fixture and rebuild: the title follows (spec US5, quickstart 10).

### Tests for User Story 5 (REQUIRED) ⚠️

- [X] T089 [US5] Write `packages/web/test/sharing.test.tsx`, covering 004-cv-page-FR-036 and 004-cv-page-FR-037, on rendered HTML:
  - FR-036: with the real CV, `<title>` and `og:title` are `Alex Profir — Software Engineer`; `meta[name=description]` and `og:description` are the summary; `og:type` is `website`, `twitter:card` is `summary`; there's no `og:image`, `og:url` or canonical (US5 scenarios 1 and 3). Changing the label in a fixture changes both titles (scenario 2).
  - FR-037: one case per row of data-model.md's Page title and description table: no summary → the label as description (scenario 4); no name → the label as title; neither → `CV` and no description element. No empty `content` is ever declared. The not-found page's title is `404 · Not found` with no description.

### Implementation for User Story 5

- [X] T090 [US5] Create `packages/web/src/format/meta.ts` (research R10, data-model.md Page title and description): `pageMeta(basics)` returning `{ title, description? }`, with the separator and fallback from `siteText`.
- [X] T091 [US5] Use `pageMeta` in `packages/web/src/render.tsx`, and add the description and preview tags to `Document.tsx`, as contracts/page.md's Document lists them. The description tags are rendered only when there is a description.
- [X] T092 [US5] Checkpoint, after T089 to T091: `sharing.test.tsx` passes, quickstart 10 behaves as written, and the `lighthouse` part shows SEO at 90 or more on both profiles.

**Checkpoint**: User Stories 1 to 5 work independently.

---

## Phase 8: User Story 6 - The owner changes a fact or the design in one edit (Priority: P6)

**Goal**: One edit to the CV document, or to the token export followed by `npm run token-output`,
changes the page after a rebuild, with no other edit. The content and token checks pass over the
site with no exception, every token in the export is used, and the build refuses fonts that
don't match the font tokens.

**Independent Test**: change the work entry's position in the CV document and rebuild: the page
follows, and only `resume.json` changed. Change the primary text color in the export, run
`npm run token-output` and rebuild: the page uses the new color (spec US6, quickstart 9).

### Tests for User Story 6 (REQUIRED) ⚠️

- [X] T093 [P] [US6] Write `packages/web/test/tokens.test.ts`, covering 004-cv-page-FR-043, 004-cv-page-FR-044 and 004-cv-page-FR-019:
  - FR-043: every token in the export is read by the site: its custom property, or a token referring to it, appears in the built CSS, or its name in `fonts.json`; the export holds the five colors of design/review.md, compared without regard to case; the motion source is unchanged from 003: exactly `motion.duration.fast` `150ms`, `motion.duration.base` `250ms`, `motion.duration.slow` `{motion.duration.base} * 2` and `motion.easing.standard` `[0.2, 0, 0, 1]`.
  - FR-044: no file under `packages/web/src` or `packages/web/scripts` holds a skip marker for either check.
  - FR-019: the not-found page's computed colors and fonts are token values, as on `/cv`.
- [X] T094 [P] [US6] Add the FR-045 and FR-046 groups to `packages/web/test/fonts.test.ts`:
  - 004-cv-page-FR-045: every `fonts.json` file and license exists; each family's directory holds `OFL.txt`; no family matches the Apple and system font patterns of 003's FR-006 test; every built `@font-face` has `font-display: swap`; a build of a copy whose `font.family.display` names a family with no `fonts.json` entry fails, naming the token; a build with a missing file fails, naming it.
  - 004-cv-page-FR-046: no style sheet or component in the repository holds an `@font-face` rule or a family name; the built CSS holds one `@font-face` per `fonts.json` file; `npm run token-check` passes with the fonts declared.
- [X] T095 [P] [US6] Write `packages/web/test/one-edit.test.ts`, covering 004-cv-page-FR-003, on a temporary copy of `packages/` and the root files: changing `work[0].position` in the copy's `resume.json` and building it changes the page's `h3`, with only `resume.json` changed (US6 scenario 1); changing `color.base.ink` in the copy's export, running `runGenerate` and building changes the body's computed color, with only the export and the two generated files changed (scenario 2, SC-008).
- [X] T096 [P] [US6] Write `packages/web/test/self-check.test.ts`, covering 004-cv-page-FR-003, 004-cv-page-FR-043, 004-cv-page-FR-044 and 004-cv-page-FR-047, on the real repository:
  - FR-003: `npm run content-check` exits 0, and its exceptions list holds nothing added for `packages/web` (US6 scenario 4);
  - FR-043 and FR-044: `npm run token-check` exits 0, and the export is accepted as Penpot's written form (US6 scenario 3);
  - FR-047: `npm run traceability` exits 0 (run off CI only until T103, when every requirement is covered).

### Implementation for User Story 6

- [X] T097 [US6] Add the validation to `packages/web/scripts/fonts-plugin.ts` (data-model.md Font family entry Validation, contracts/fonts.md): fail the build, naming the token or file, when a `fontFamilies` token the site reads has no entry whose `family` equals the token's first value; when an entry's `token` doesn't exist or its first value isn't `family`; or when a listed file or license is missing.
- [X] T098 [US6] Checkpoint, after T093 to T097: every US6 test passes, and quickstart 9 behaves as written (revert each change).

**Checkpoint**: All user stories are independently functional.

---

## Phase 9: Polish & Constitution Verification

**Purpose**: The seeded sample, the performance test, the constitution audits, the full
verification, the owner's manual checks, and the single PR. The interim provision's follow-up is
not here (see "Not in this feature").

- [X] T099 [P] Create the committed sample `tools/site-check/test/__fixtures__/seeded/` (research R21): one site with at least one problem in every part, each kind of problem line in contracts/cli.md's examples where a static site can hold it, and an `expected-report.txt` made by running the check from the sample directory and redirecting stdout into the file. Run it twice and confirm the file doesn't change. Check every line against the seeded cases by hand before committing. Lighthouse scores may vary by a point between machines, so the sample's Lighthouse result is a clear fail (the 2 MB script) and the test compares scores as `<n>` placeholders (T100).
- [X] T100 Add a seeded-sample test to `tools/site-check/test/cli.test.ts`, after T099. Its title has no FR ID, e.g. `describe('seeded sample (SC-009)', …)`. `runCli(<seeded>)` exits 1, and its stdout, after `maskScores` (T053), equals `expected-report.txt` byte for byte. A comment at the top lists each seeded case and the line it produces.
- [X] T101 [P] Write `tools/site-check/test/performance.test.ts` (SC-009), with a title with no FR ID: `npm run site-check` on the real repository exits 0 in under 300,000 ms. Use `test.skipIf(process.env.CI)`, as 001 to 003 do, since the CI `site` job already runs it, and a 6-minute timeout.
- [X] T102 [P] Audit Constitution X, IV, VII and IX in `package.json`, `packages/web/` and `tools/site-check/`:
  - **X**: the root has the nineteen `devDependencies` of T002 and no `dependencies`; `packages/web` has exactly `react` and `react-dom`; the abstractions added are exactly those in plan.md's Dependencies table; no agent skill was added.
  - **IV**: `npm run content-check` and `npm run token-check` pass with no exception for the site; `site-text.ts` holds no CV fact; no file under `packages/web/src` names a font family or a literal design value.
  - **VII**: `/` is a 307 to `/cv`; `/cv` reads in full with scripting off; offline support adds no prompt, banner or install offer (no web app manifest).
  - **IX**: no font is an Apple or system font, and the arrows are the site's own SVG paths.

  **Audited on 2026-10-23**: compliant, with one fix. X: nineteen root
  `devDependencies` (the eight new ones pinned exactly) and no `dependencies`, `react` and
  `react-dom` only in `packages/web`, no
  agent skill added, and single copies of `vite` and `lightningcss`. Three page-test helpers,
  `ax.ts`, `fixtures.ts` and `copy.ts`, weren't in plan.md's Dependencies table; its test-helper
  row now names them with their reason. `chrome-launcher` is imported but comes with
  `lighthouse`, as the table says. IV: both checks pass with their code unchanged from `main`
  (no exception and no skip marker); `site-text.ts` holds no CV fact; `packages/web/src` names no
  family (only `fonts.json` does, by design) and has no literal value under 003's rules (`100vh`
  is not one of its units). VII: `/` answers 307 to `/cv`, the no-script part passes, and there's
  no web app manifest, install offer or prompt. IX: the families are Space Grotesk, Schibsted
  Grotesk and JetBrains Mono (OFL), with generic fallbacks only; the arrows are `Arrow.tsx`'s SVG
  paths.
- [X] T103 Run the full verification with the root `package.json` scripts, after T079 to T102:
  - `npm run typecheck` passes, including the service worker project;
  - `npm test` passes, now including 001's self-check;
  - `npm run content-check`, `npm run token-check` and `npm run site-check` exit 0, the last with `Site check: PASSED` and every Lighthouse category at 90 or more on both profiles;
  - `npm run traceability` exits 0, and its last line is exactly `PASS: all 181 active requirements in 4 approved specs are covered.` That's 29 from 001, 36 from 002, 58 from 003 and 58 from 004 (Constitution III, SC-010).
- [X] T104 Run quickstart.md scenarios 1 to 5 and 8 to 10, and record any deviation here. Write scratch output to the scratchpad, not `/tmp`. Scenario 9 edits files: revert each change. Scenario 3 needs the network off: cut it for the process tree with `sandbox-exec -p '(version 1)(allow default)(deny network*)'`, as 001 to 003 did, or have the owner turn it off. **Skip scenario 11**: it's the interim provision's follow-up. Scenario 12 is T106 to T108.

  **Run on 2026-10-23** (with T103's results: `npm test` 774 of 774, `site-check` PASSED in 43 s,
  Lighthouse medians 99/100/100/100/100 on mobile and 100 on every category on desktop):
  scenarios 1, 2, 4, 5, 8, 9 and 10 gave their expected results, and scenario 3 did for 10 of 11
  parts. Deviations:
  - Scratch output went to `/tmp/cv-phase9/`, outside the repository, as the run was asked to,
    not the scratchpad.
  - 1: `/` answered 307 to `/cv` and Chromium ended at `/cv`; `/cv/` and `/cv?utm_source=x` gave
    the same bytes as `/cv`; `/nope` and `/cv.html` answered 404 with the not-found page and its
    link to `/cv`. The side-by-side comparison with the four exports is the owner's (T105).
  - 3: `sandbox-exec -p '(version 1)(allow default)(deny network*)'` also denies the check's own
    server on 127.0.0.1 (`listen EPERM`, exit 2). The run used a profile that denies every
    network operation except loopback: `(deny network*)`, then `(allow network-bind (local ip
    "localhost:*"))`, `(allow network-inbound (local ip "localhost:*"))`, `(allow
    network-outbound (remote ip "localhost:*"))` and unix sockets. A control `curl` to
    `https://example.com` and to an IP address failed under it. (An `(allow network* (local ip
    "localhost:*"))` rule, tried first, let the control through, so it wasn't used.) Under it the
    check exited 1: the other 10 parts gave scenario 2's results line for line, but `lighthouse`
    crashed on both profiles with `Connection closed.` The cause is the sandbox, not the network:
    Chromium's own renderer sandbox can't start inside a `sandbox-exec` profile, so the page's
    renderer dies (Playwright's headless shell, used by the other parts, is unaffected). A
    scratch script outside the repository ran the Lighthouse part's three runs per profile on the
    real build under the same profile, with `--no-sandbox` added for Chromium: every category 99
    or 100, as in scenario 2. The check's code is unchanged. The owner can repeat scenario 3 with
    Wi-Fi off to see the whole report.
  - 4: run as T103: every command passed.
  - 5 and 8: run in Playwright's Chromium, not by hand. 5: with scripting off at 375 and 1440 px,
    the h1 and all six section headings were present, the body had the background token and the
    body font, and the page didn't scroll sideways (screenshots in the scratch directory). 8:
    after one visit the worker controlled the page; offline, `/cv` showed the CV with its six
    sections in the three families, `/` ended at `/cv`, and `/nope` showed the not-found page
    with status 404.
  - 9: (1) `work[0].position` changed to "Senior Software Developer": the built page showed it,
    and `git status` listed only `resume.json`. (2) `light.color.text.primary` set to `#20206a`
    in the export, kept in Penpot's form: after `npm run token-output` and `npm run build` the
    built style sheet had `--token-color-text-primary:#20206a`, and only the export and the two
    generated files changed. (3) `"certificates": [{ "name": "X" }]`: `site-check` exited 1 with
    `content - - unsupported-section certificates: the CV document has 1 certificates entry,
    which /cv doesn't show yet`, and the other 10 parts passed. Each change was reverted with
    `git checkout`.
  - 10: the title is `Alex Profir — Software Engineer`, the description and `og:description` are
    the summary, and there's no canonical link, `og:url` or image.
- [ ] T105 Owner action, by hand, after T103. Record each result here and in the PR:
  - **FR-042, quickstart 1**: `/cv` and the not-found page side by side with the four revision 10 exports at 1440 and 375 px. List any difference, and either fix it or record the owner's acceptance.
  - **SC-004, quickstart 6**: VoiceOver on macOS with Safari, and VoiceOver on iOS or TalkBack on Android: the heading list, moving by heading, dates read as words, and the GitHub link announced with network and username.
  - **SC-005, quickstart 7**: print to PDF on A4 and US Letter, in Chrome and in Firefox or Safari, with headers and footers on and background graphics off.
  - **Off-scale values**: the places data-model.md's Token roles lists as snapped to the scale or derived with `calc()` (the phone timeline indent, chip padding, the dot's offset), checked against the exports.
- [ ] T106 Commit the remaining work with Conventional Commits, e.g. `feat(web): …`, `feat(site-check): …`, `test(web): …`, `ci: …`, `chore(tokens): …`. Push `004-cv-page` and open one pull request to `main` (Constitution XI).
  - Per CLAUDE.md, commits, the PR title and the PR description contain no AI or Claude attribution.
  - The description:
    - links `specs/004-cv-page/spec.md` and `specs/004-cv-page/tasks.md`;
    - records that the token export was written by hand in Penpot's form under Constitution 1.2.0's interim provision, and that **the provision's follow-up pull request is still pending**: the Penpot link, the import and re-export of the export, and any regenerated output (research R22). It is not done here;
    - records T008's change to 003's tests, for the owner to accept;
    - records the results of T104 and T105.
  - Confirm `traceability`, `test`, `content`, `tokens` and `site` all run and pass, and that the `site` job summary gives the same result as a local run on the same commit (FR-049, contracts/cli.md Determinism).
- [ ] T107 Owner action, needs admin rights and the open PR from T106: apply the updated ruleset with `gh api -X PUT repos/alex-profir/CV/rulesets/<id> --input .github/rulesets/main.json` (quickstart 12). Confirm the contexts read back as `traceability`, `test`, `content`, `tokens` and `site`, and that a drift diff shows only server-added fields.
- [ ] T108 Owner action, after T107: demonstrate enforcement (quickstart 12, FR-048). Push a scratch branch from `004-cv-page` that removes the focus outline from links, and open a draft PR. Confirm `site` fails, naming every link in the `keyboard` part, and that merging is blocked with no bypass option. Close the PR unmerged, delete the branch, and record the result here.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup. Blocks every story. T005 (the design gate) comes
  before any task that creates or changes UI: T014 and every page and style task after it.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on US1. Its parts reuse US1's page measurements (T047 to T051), and
  its real-site run needs the page.
- **US3 (Phase 5)**: depends on US1, and on T074 (`pdfText`) from US2.
- **US4 (Phase 6)**: depends on US1. Its real-site checkpoint uses the `offline` part from US2.
- **US5 (Phase 7)**: depends on US1 only.
- **US6 (Phase 8)**: depends on US1. T096's traceability case passes only after every story.
- **Polish (Phase 9)**: depends on every story.

### Within User Story 1

- T017 to T031 (tests) before T032 to T051.
- T032 to T035 (text and formatters) and T047 to T051 (page measurements) in parallel.
- T036 → T037 → T038 (fonts), before T045 and T046.
- T039 → T040, T041, T042 → T043 → T044, then T045 and T046.

### Within User Story 2

- T053 and T054 before the other tests.
- T067 and T068 before T069 to T074, which run in parallel, then T075 → T076.
- T077 and T078 in parallel, any time after T066.

### Parallel Opportunities

- Phase 2: T006, T007, T009, T010, T011 and T012 in parallel. T008 after T007.
- US1: every test task, then T032 to T035 and T047 to T051.
- US2: T055 to T066, then T068 to T074.
- US3, US4 and US5 can run in parallel once US1 is done (US3 also needs T074).

---

## Parallel Example: User Story 1

```bash
# Launch the formatter and structure tests together:
Task: "Write packages/web/test/dates.test.ts, covers 004-cv-page-FR-009, FR-010, FR-011"
Task: "Write packages/web/test/location.test.ts, covers 004-cv-page-FR-008"
Task: "Write packages/web/test/structure.test.tsx, covers 004-cv-page-FR-011, FR-023 to FR-027"

# Launch the page measurements together:
Task: "Create tools/site-check/src/parts/accessibility.ts"
Task: "Create tools/site-check/src/parts/keyboard.ts"
Task: "Create tools/site-check/src/parts/layout.ts"
Task: "Create tools/site-check/src/parts/modes.ts"
Task: "Create tools/site-check/src/parts/fonts.ts"
```

## Parallel Example: User Story 2

```bash
# Launch the part tests together:
Task: "Write tools/site-check/test/accessibility.test.ts, covers 004-cv-page-FR-050"
Task: "Write tools/site-check/test/no-script.test.ts, covers 004-cv-page-FR-052, FR-015"
Task: "Write tools/site-check/test/other-sites.test.ts, covers 004-cv-page-FR-055, FR-016"

# Then the parts:
Task: "Create tools/site-check/src/parts/lighthouse.ts"
Task: "Create tools/site-check/src/parts/offline.ts"
Task: "Create tools/site-check/src/parts/print.ts"
```

## Parallel Example: User Stories 3 to 5

```bash
# After US1 (and T074 for US3):
Task: "Write packages/web/test/print.test.ts, covers 004-cv-page-FR-032 to FR-035"
Task: "Write packages/web/test/offline.test.ts, covers 004-cv-page-FR-038 to FR-041"
Task: "Write packages/web/test/sharing.test.tsx, covers 004-cv-page-FR-036, FR-037"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational, including the design gate (T005) and the new token export
   (T007, T008). It blocks every story.
3. Complete Phase 3: User Story 1, including the owner's font download (T036).
4. **STOP and VALIDATE** (T052): `/cv` reads in full with scripting off, matches the exports by
   eye, and passes its page tests. `npm run traceability` still reports the requirements whose
   tests come later. That's expected.

### Incremental Delivery

1. Setup + Foundational: the workspace, the export, routes, server and build.
2. US1: the page. FR-001 to FR-031, FR-042 and FR-047 covered.
3. US2: the site check and CI. FR-005, FR-048 to FR-058 covered.
4. US3: print. FR-032 to FR-035.
5. US4: offline. FR-038 to FR-041.
6. US5: sharing. FR-036 and FR-037.
7. US6: one edit, tokens and font guards. FR-043 to FR-046.
8. Polish: seeded sample, performance, audits, full verification, manual checks, the PR, and live
   enforcement.

All stories ship in the feature's single PR (Constitution XI). The increments above are
checkpoints within it. 001's self-check test fails until every 004 requirement is covered, which
is expected until T103.

---

## Requirement Coverage

Every FR in spec.md and the test task that covers it:

| Requirement | Test task(s) |
|-------------|--------------|
| 004-cv-page-FR-001, FR-002, FR-004 | T020 |
| 004-cv-page-FR-003 | T020, T095, T096 |
| 004-cv-page-FR-005 | T057 |
| 004-cv-page-FR-006 | T022 |
| 004-cv-page-FR-007 | T020, T030, T064 |
| 004-cv-page-FR-008 | T019 |
| 004-cv-page-FR-009, FR-010 | T018 |
| 004-cv-page-FR-011 | T018, T023 |
| 004-cv-page-FR-012, FR-013 | T021 |
| 004-cv-page-FR-014 | T024 |
| 004-cv-page-FR-015 | T024, T060 |
| 004-cv-page-FR-016 | T024, T063 |
| 004-cv-page-FR-017, FR-018 | T012 |
| 004-cv-page-FR-019 | T012, T026, T093 |
| 004-cv-page-FR-020, FR-021, FR-022 | T025 |
| 004-cv-page-FR-023, FR-024, FR-025, FR-026 | T023 |
| 004-cv-page-FR-027 | T023, T025 |
| 004-cv-page-FR-028 | T026 |
| 004-cv-page-FR-029 | T027 |
| 004-cv-page-FR-030, FR-031 | T028 |
| 004-cv-page-FR-032, FR-033, FR-034, FR-035 | T081 |
| 004-cv-page-FR-036, FR-037 | T089 |
| 004-cv-page-FR-038, FR-039, FR-040, FR-041 | T084 |
| 004-cv-page-FR-042 | T029 (and T105 by hand) |
| 004-cv-page-FR-043, FR-044 | T093, T096 |
| 004-cv-page-FR-045, FR-046 | T094 |
| 004-cv-page-FR-047 | T031, T096 |
| 004-cv-page-FR-048 | T066 |
| 004-cv-page-FR-049, FR-057 | T056 |
| 004-cv-page-FR-050 | T058 |
| 004-cv-page-FR-051 | T059 |
| 004-cv-page-FR-052 | T060 |
| 004-cv-page-FR-053 | T061 |
| 004-cv-page-FR-054 | T062 |
| 004-cv-page-FR-055 | T063 |
| 004-cv-page-FR-056 | T065 |
| 004-cv-page-FR-058 | T055, T056, T100 |

Success criteria:

| Criterion | Task(s) |
|-----------|---------|
| SC-001 | T024, T060 |
| SC-002 | T059, T103 |
| SC-003 | T059 |
| SC-004 | T105 |
| SC-005 | T081, T105 |
| SC-006 | T061, T088 |
| SC-007 | T063 |
| SC-008 | T095, T104 |
| SC-009 | T056, T100, T101 |
| SC-010 | T096, T103 |

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- The [Story] label maps each task to its user story for traceability.
- Requirement IDs in task descriptions map tasks to spec.md requirements. The coverage table
  abbreviates them, but test titles always carry the full `004-cv-page-FR-###` form.
- Verify tests fail before implementing.
- Commit after each task or logical group, using Conventional Commits and no AI attribution
  (CLAUDE.md).
- T036, T105, T107 and T108 are the owner's. T107 and T108 change GitHub state, so the owner runs
  or explicitly approves them.
- **Choices made here that the design documents don't fix**. If the owner prefers otherwise,
  change the plan or contract first:
  - **Build failure exit code** (T014): `build-site.ts` exits 2 on failure, so `npm run site-check`
    exits 2 when the build fails, as contracts/cli.md requires. The `&&` in the script would
    otherwise pass on npm's exit code 1.
  - **Node version message** (T076): the site check uses contracts/cli.md's wording, not 001's
    `nodeVersionProblem`, whose wording mentions blocking network access.
  - **Playwright cache key** (T077): the version is written in the key and checked against
    `package-lock.json` by T066, so no extra step is needed to read it.
  - **Page measurements in US1** (T047 to T051): the page tests and the site check share them, so
    they're written with the page that needs them, and US2 adds the rest of the parts.
  - **Test build once per run** (T015): a Vitest `globalSetup` builds the site once, so page tests
    don't rebuild per file.
