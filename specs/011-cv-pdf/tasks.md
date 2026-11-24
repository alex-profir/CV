---

description: "Task list for the CV PDF download"
---

# Tasks: CV PDF Download

**Input**: Design documents from `/specs/011-cv-pdf/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/page.md](./contracts/page.md),
[contracts/pdf.md](./contracts/pdf.md), [contracts/site.md](./contracts/site.md),
[quickstart.md](./quickstart.md), and the design in [design/](./design/):
[wireframes.md](./design/wireframes.md), the interim local mockup in `design/mockup/` and the signed
[review.md](./design/review.md) (commit `27606f2`, approved 2026-11-24).

**Tests**: REQUIRED. The constitution (Principle III) maps every requirement to at least one automated
test. Each test task names the `011-cv-pdf-FR-###` IDs it covers, and every live FR in spec.md (20 of
them; FR-021 is removed) is covered by at least one test task (see Requirement Coverage at the end). A
test's `describe` name carries the full ID. Research R13 says what bug each test catches.

**Organization**: Tasks are grouped by user story. US1 carries the link and the build step that makes a
PDF exist at all, plus the host build, because without them the link is dead and Vercel's deploy fails.
US2 makes the PDF faithful and checked (author, named failures, the site check's `pdf` part). US3 makes
it work offline (the worker and the click enhancement).

**Test locations**: `packages/web/test/` unless they start with `tools/`. All of them run in Vitest's
`slow` project, which builds the site once per run, and CI's `site` job runs the site check.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1 to US3)
- Exact file paths are in each description
- Test tasks name the full IDs they cover, e.g. "covers 011-cv-pdf-FR-003"
- `web/` below means `packages/web/`; `site-check/` means `tools/site-check/`

## Not in this feature

As the spec sets: no link or command in the OS shells' CV app or the Terminal (FR-005), no committed
PDF or fingerprint (FR-021 removed), no `@page` rule in `print.css`, no US Letter PDF, no
`Content-Disposition` header, no new dependency (`pdf-lib` was rejected, research R4). Don't widen this.

## Rules for every task

- Run `nvm use` first (Node 26). `npm run build` now needs Playwright's Chromium:
  `npx playwright install chromium`.
- All visible words come from `design/wireframes.md`'s Site text table and `data-model.md`'s Site text
  additions, verbatim. No literal design values: the row reuses the contact rows' token-based classes.
- The owner's name is written only in `packages/content/` (Constitution IV, FR-003). It reaches the file
  name and the PDF's Author through `resume.basics.name` at build time.
- No AI or Claude attribution in commits or the pull request (CLAUDE.md).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: The renderer the build will need, everywhere the site is built

- [ ] T001 Confirm Playwright's Chromium is installed locally (`npx playwright install chromium`), and that every CI job that builds the site installs it before building: `.github/workflows/ci.yml`'s `site` job and `.github/workflows/full.yml`'s `full` job run `npx playwright install --with-deps chromium` before `npm run site-check` / `npm test`; the `test`, `traceability`, `content` and `tokens` jobs don't build. Also check `tools/local-verify/` (`npm run verify:feature`) builds only after the browser is present. No change is expected; record the result here.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The design gate and the shared constants every story reads

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Confirm the design gate (Constitution II): `specs/011-cv-pdf/design/` has `wireframes.md`, the interim local mockup in `design/mockup/` with its PNG exports at 1440, 375 and 320 px (`desktop-1-intro-1440.png`, `desktop-2-link-focused-1440.png`, `phone-1-intro-375.png`, `phone-2-intro-narrow-320.png`) and `review.md` signed by the owner at `27606f2` on 2026-11-24. No task that creates or changes UI (T014, T015) starts before this.
- [ ] T003 [P] Add `export const CV_PDF = { path: '/cv.pdf', file: 'cv.pdf' } as const` to `web/src/routes.ts` (research R8). It is not a page: `ROUTES.pages` is unchanged. The build, the page, the worker and the checks all read the path from it.
- [ ] T004 [P] Add the `download` group to `web/src/site-text.ts`, beside the contact row labels, with exactly these values from data-model.md: `rowLabel: 'CV'`, `link: 'Download PDF'`, `suffix: '-CV.pdf'`, `fallbackName: 'CV.pdf'`. No CV fact goes in this file (the content check searches it); fix `web/test/site-text.test.ts` if it lists the groups.
- [ ] T005 [P] Add the `down` arrow to `web/src/cv/Arrow.tsx`, path `M5 1v8M1.5 5.5 5 9l3.5-3.5` (wireframes.md, research R11), rendered as the other arrows are: `class="arrow arrow-down"`, `aria-hidden="true"`, `focusable="false"`, `viewBox="0 0 10 10"`, `fill="none"`, `stroke="currentColor"`.

**Checkpoint**: Foundation ready. User story work can begin.

---

## Phase 3: User Story 1 - A recruiter downloads the CV as a file (Priority: P1) 🎯 MVP

**Goal**: `/cv`'s intro ends with a `CV · Download PDF ↓` row, a plain `<a href="/cv.pdf" download="Alex-Profir-CV.pdf">`, and every build (local, CI, Vercel) writes `cv.pdf` from the built `/cv`, served as `application/pdf` with `no-cache`.

**Independent Test**: `npm run build && npm run serve`, open `/cv` at 1440 and 375 px with scripting on and off, activate the link by pointer and by keyboard, and get `Alex-Profir-CV.pdf` holding the CV (quickstart §1 and §4).

### Tests for User Story 1 (REQUIRED) ⚠️

> Write these first and see them fail before T013 to T018.

- [ ] T006 [US1] In `web/test/structure.test.tsx`, add `describe('011-cv-pdf-FR-001, 011-cv-pdf-FR-002, 011-cv-pdf-FR-003, 011-cv-pdf-FR-006: the download row', …)` on the server HTML of `/cv`: `div.contact-row.download[data-site-element]` is the last child of `.contact-block` in the intro, inside `main`; its `span.contact-label` has text `CV` and `aria-hidden="true"`; its `a.contact-link` has `href="/cv.pdf"`, `download="Alex-Profir-CV.pdf"`, text `Download PDF`, and no `target`, `rel` or `type`. Amend 004's test `004-cv-page-FR-025` in the same file (line ~122): `main [data-site-element]` now counts exactly 1, the download row, and `main footer` stays 0; name the amendment `(amended by 011-cv-pdf-FR-006)` in its `describe`.
- [ ] T007 [US1] In `web/test/structure.test.tsx`, add `describe('011-cv-pdf-FR-003: downloadName', …)` calling `downloadName` from `web/src/format/file-name.ts` with data-model.md's table, written out: `'Alex Profir'` → `'Alex-Profir-CV.pdf'`; `'  José   María '` → `'José-María-CV.pdf'`; `'A/B: C'` → `'AB-C-CV.pdf'`; `undefined`, `''` and `'   '` → `'CV.pdf'`; `'/:'` → `'CV.pdf'`. Add one case that an NFD input (`'José'`) gives the NFC result `'José-CV.pdf'`.
- [ ] T008 [US1] In `web/test/structure.test.tsx`, add `describe('011-cv-pdf-FR-005: no download in the OS shells', …)`: the OS shell's CV app (`web/src/apps/cv/CvApp.tsx`), rendered as its existing tests render it, contains no `a[href="/cv.pdf"]` and no `.contact-row.download`.
- [ ] T009 [P] [US1] In `web/test/data-req.test.tsx`, add the row `['div.contact-row.download', '011-cv-pdf-FR-001 011-cv-pdf-FR-002 011-cv-pdf-FR-003 011-cv-pdf-FR-004 011-cv-pdf-FR-006']` to the targets table, and the same row to 004's `contracts/page.md` data-req targets table if the test reads it from there. Covers 011-cv-pdf-FR-001, FR-002, FR-003, FR-004, FR-006.
- [ ] T010 [P] [US1] In `web/test/focus.test.ts`, add `describe('011-cv-pdf-FR-042: the download link in the tab order', …)` at 375 and 1440 px: from the last profile link, one Tab focuses `a[href="/cv.pdf"]`, it shows the site's focus ring (the same computed outline the test already asserts for contact links), and the next Tab reaches the first link in the sections.
- [ ] T011 [P] [US1] In `web/test/accessibility.test.ts`, make the existing axe runs on `/cv` at 375 and 1440 px assert `a[href="/cv.pdf"]` is present before running axe (so they can't pass without the link), and name 011-cv-pdf-FR-042 in their `describe`. Zero WCAG 2.2 AA violations.
- [ ] T012 [P] [US1] In `web/test/routes.test.ts`, add `describe('011-cv-pdf-FR-010, 011-cv-pdf-FR-030: /cv.pdf on the host', …)`: `vercel.json` has a route with `src` `/cv\.pdf`, `headers` `{ "Cache-Control": "no-cache" }` and `continue: true`, placed before `{ "handle": "filesystem" }` and before the 404 catch-all; and its `buildCommand` is `bash packages/web/scripts/vercel-build.sh`.

### Implementation for User Story 1

- [ ] T013 [P] [US1] Create `web/src/format/file-name.ts` exporting `downloadName(name: string | undefined): string` (research R10): normalize to NFC; drop `/ \ : * ? " < > |` and control characters (U+0000 to U+001F, U+007F); split on white space and drop empty words; join with `-`; append `siteText.download.suffix`. Return `siteText.download.fallbackName` when the name is absent or nothing is left. The result never starts with `-` and is never empty.
- [ ] T014 [US1] In `web/src/cv/Intro.tsx`, add the optional prop `download?: { href: string; name: string }`. When given, render as the last child of `.contact-block`, after the profiles list, exactly contracts/page.md's markup: `<div className="contact-row download" data-site-element="" data-req="011-cv-pdf-FR-001 011-cv-pdf-FR-002 011-cv-pdf-FR-003 011-cv-pdf-FR-004 011-cv-pdf-FR-006">`, `<span className="contact-label" aria-hidden="true">{siteText.download.rowLabel}</span>`, `<a className="contact-link" href={download.href} download={download.name}>{siteText.download.link}<Arrow kind="down" /></a>`. When the CV document has no contact rows or profiles, `.intro-body` and `.contact-block` still render, holding the row alone. No new CSS.
- [ ] T015 [US1] Pass `download` through `web/src/cv/CvDocument.tsx` to `Intro`, and give it only in `web/src/pages/CvPage.tsx` as `{ href: CV_PDF.path, name: downloadName(resume.basics?.name) }`. Leave `web/src/apps/cv/CvApp.tsx` and the Terminal unchanged (FR-005). Compare the built row with `design/mockup/desktop-1-intro-1440.png` and `phone-1-intro-375.png`.
- [ ] T016 [US1] Create `web/scripts/cv-pdf.ts` exporting `writeCvPdf(siteDir: string, author: string | undefined): Promise<number>` (contracts/pdf.md, research R2, R3): serve `siteDir` with `tools/site-check/src/server.ts` from a provisional `siteManifest(siteDir)`; launch Playwright's Chromium with a context of `serviceWorkers: 'block'`; open `/cv`, wait for `load` and `document.fonts.ready`; print with `page.pdf({ format: 'A4', margin: { top: '0.4in', right: '0.4in', bottom: '0.4in', left: '0.4in' }, printBackground: false, displayHeaderFooter: false, preferCSSPageSize: false, tagged: true, outline: true })`; check the bytes start with `%PDF-`; write `<siteDir>/cv.pdf`; return its size. Close the browser and the server in `finally`. (Author: T024. Named failures: T025.)
- [ ] T017 [US1] In `web/scripts/build-site.ts`: add `'.pdf': 'application/pdf'` to `CONTENT_TYPES`; call `writeCvPdf(siteDir, present(resume.basics?.name) ? resume.basics.name : undefined)` after every page is written and before `writeServiceWorker`, so `PRECACHE` lists `/cv.pdf`, `VERSION` hashes it, and `site-manifest.json` lists `{ "path": "/cv.pdf", "hash": …, "type": "application/pdf" }`. A successful build still prints nothing. Fix any test that lists the built files, the manifest or the precache (e.g. `web/test/build.test.ts`, `web/test/offline.test.ts`), adding `/cv.pdf` rather than loosening the assertion.
- [ ] T018 [P] [US1] Host build (research R9, contracts/pdf.md): create `web/scripts/vercel-build.sh` with `set -euo pipefail`, then `git update-index --assume-unchanged vercel.json`, `dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite libXdamage libXfixes libXrandr mesa-libgbm pango cairo alsa-lib` (the trial's list; T037 trims it), `npx playwright install --only-shell chromium`, `npm run build`. In `vercel.json`, set `buildCommand` to `bash packages/web/scripts/vercel-build.sh` (replacing the current command, whose `assume-unchanged` step moves into the script) and add `{ "src": "/cv\\.pdf", "headers": { "Cache-Control": "no-cache" }, "continue": true }` after the `/sw\.js` route, before `{ "handle": "filesystem" }`.
- [ ] T019 [US1] Record the amendment in `specs/004-cv-page/spec.md` (FR-006, Constitution XI): an `**Amended**: 2026-11-24 by 011-cv-pdf: …` line under `**Status**`, after the existing 005 and 008 lines and in their form, saying the download link alone sits in the intro block inside `main` and ending `Approved with 011's spec.`; a clarification line dated 2026-11-24 naming 011-cv-pdf; FR-025 becomes "site elements sit outside the main landmark, except the download link (011-cv-pdf-FR-001), which sits in the intro block", marked `Amended 2026-11-24 (011-cv-pdf)` with what it said before; the **Site element** entity amended the same way; the out-of-scope lines (line ~73 and ~786) for "the PDF download, a later feature" name 011-cv-pdf. Add a note to `specs/004-cv-page/contracts/page.md`'s "/cv structure" pointing at `specs/011-cv-pdf/contracts/page.md`. In `specs/004-cv-page/tasks.md`, mark T023 (whose FR-025 test counted no site element in `main`) as overturned in part, leaving its tick and text as they are: add a sub-bullet `**Superseded in part 2026-11-24, naming 011-cv-pdf (its T006)**: the download row is the one site element inside main (011-cv-pdf-FR-006); the footer stays outside.`, in the form of that file's existing 005 marks.
- [ ] T020 [US1] Run T006 to T012 and `web/test/print.test.ts` (the row is absent from print through the existing `[data-site-element]` rule, FR-004) with `npx vitest run --project slow …`, plus `npm run typecheck`, `npm run content-check` and `npm run token-check`. All pass. Walk quickstart §4 by script where a script can.

**Checkpoint**: The link downloads a PDF of `/cv` online, with or without scripting, locally and on the host.

---

## Phase 4: User Story 2 - The PDF always matches the page (Priority: P2)

**Goal**: The PDF carries its title, author and language, the build fails naming the cause when it can't make it, and the site check's `pdf` part proves on every pull request that it holds every CV field in order, no site element, A4 pages within the margins, the design's embedded fonts, and at most 1,000,000 bytes.

**Independent Test**: change one highlight in `packages/content/resume.json`, build, and find the new text in `cv.pdf` and not the old; `npm run site-check` passes its `pdf` part; `PLAYWRIGHT_BROWSERS_PATH=$(mktemp -d) npm run build` exits 2 naming Chromium (quickstart §1 to §3).

### Tests for User Story 2 (REQUIRED) ⚠️

- [ ] T021 [P] [US2] Create `site-check/test/pdf.test.ts`, `describe('011-cv-pdf-FR-040: the pdf part reports each defect by name', …)`, on fixture sites under `site-check/test/__fixtures__/` built as the other parts' tests build theirs: a PDF printed on US Letter gives `pdf-not-a4` naming `page 1` and `612 × 792 pt`; one holding the footer's text gives `pdf-site-element`; one missing a field gives `pdf-missing-field` with that field's path; one with no Author gives `pdf-metadata` `Author`. Assert the exact problem lines of contracts/site.md's format `pdf /cv.pdf - <type> <subject>: <detail>`.
- [ ] T022 [US2] Create `web/test/pdf.test.ts`. `describe('011-cv-pdf-FR-004, 011-cv-pdf-FR-010, 011-cv-pdf-FR-011, 011-cv-pdf-FR-012, 011-cv-pdf-FR-013, 011-cv-pdf-FR-014, 011-cv-pdf-FR-015, 011-cv-pdf-FR-016: the real PDF', …)`: the `pdf` part, run on the real build as the other parts' real-build tests do, reports no problem. `describe('011-cv-pdf-FR-011: the PDF follows the CV', …)`: a build from a fixture CV whose `work[0].highlights[0]` differs from the real one gives a PDF holding the fixture's highlight and not the real one (US2 scenario 1).
- [ ] T023 [US2] In `web/test/pdf.test.ts`, add `describe('011-cv-pdf-FR-020: the build fails naming the cause', …)`: `writeCvPdf` run in a child process with `PLAYWRIGHT_BROWSERS_PATH` set to an empty temporary directory rejects with a message starting `the CV PDF can't be made: Chromium didn't start (` and ending `Install it with npx playwright install chromium`, and writes no `cv.pdf`; on a site directory without `cv/index.html` it rejects with `the CV PDF can't be made: /cv answered 404`.

### Implementation for User Story 2

- [ ] T024 [US2] In `web/scripts/cv-pdf.ts`, add the author by an incremental update (research R4, FR-014): read the trailer's `/Info`, `/Root`, `/Size` and the last `startxref`; append a new Info object holding the old Info entries plus `/Author` as a UTF-16BE hex string with a byte order mark (`<FEFF…>`, as Chromium writes the title), a one-entry cross-reference section for it, and a trailer with `/Size` + 1, the same `/Root`, the new `/Info` and `/Prev` set to the old `startxref`. With `author` undefined, write no update. Confirm by PDF.js `getMetadata()`: `info.Author` is `Alex Profir`, `info.Title` the page's `<title>`, `info.Language` `en`.
- [ ] T025 [US2] In `web/scripts/cv-pdf.ts`, make every failure throw an `Error` with contracts/pdf.md's exact message: `the CV PDF can't be made: Chromium didn't start (<Playwright's message>). Install it with npx playwright install chromium`; `the CV PDF can't be made: /cv answered <status>` for any status but 200; `the CV PDF can't be made: Chromium gave an empty file` for an empty result or one not starting `%PDF-`. Write nothing on failure. `build-site.ts`'s `main` already prints `site build failed: <message>` and exits 2.
- [ ] T026 [P] [US2] In `site-check/src/parts/print.ts`, export `pdfText` and move the "no section or entry heading as a page's last line" rule into an exported helper both the print part and the new part call. The print part's behavior and `site-check/test/` results are unchanged.
- [ ] T027 [US2] Create `site-check/src/parts/pdf.ts` (research R12, contracts/site.md), run once on `CV_PDF.path` with no width, reporting `Problem`s of exactly these types: `pdf-header` (`Content-Type` is `application/pdf`, `Cache-Control` is `no-cache`); `pdf-missing-field`, `pdf-out-of-order` (every text field of `expectedFields(resume)` from `site-check/src/expected.ts`, in order, never a hand-written list); `pdf-missing-link` (every `href` field has a link annotation with its address; printed text alone doesn't count, as FR-013 asks that each link open its address, which replaces research R12's "or printed address"); `pdf-site-element` (no text of `/cv`'s `footer` and `[data-site-element]` elements, read from the served page); `pdf-not-a4` (595.92 × 842.88 pt within 0.5 pt); `pdf-margin` (no text item within 28.8 pt of an edge); `pdf-heading-at-page-end` (T026's rule); `pdf-metadata` (`Title` = the page's `<title>`, `Author` = `resume.basics.name`, `Language` = `en`); `pdf-untagged` (the structure tree has as many headings as `main`'s `h1`, `h2`, `h3`, in the same order of levels); `pdf-font-not-embedded` (`missingFile` false); `pdf-font-family` (one of the families `site-check/src/check.ts`'s `readFamilies()` reads from `web/src/fonts/fonts.json`, passed in as the `fonts` part gets them, never a hand-written list, so changing a font stays one edit, Constitution IV); `pdf-too-large` (at most 1,000,000 bytes, detail like `1,204,331 bytes, over the 1,000,000-byte limit`).
- [ ] T028 [US2] Add `'pdf'` to `PARTS` in `site-check/src/report.ts`, after `'print'`, and run it from `site-check/src/check.ts`. Update the tests and samples that list the parts or a whole report (e.g. `site-check/test/report.test.ts`, `cli.test.ts`, the seeded `expected-report.txt`), adding the part rather than loosening them.
- [ ] T029 [US2] Run T021 to T023, `site-check/test/` and `npm run site-check` (the `pdf` part passes on the real build). Walk quickstart §1 to §3. Measure SC-008: `time npm run build` on this branch and on `main`, the difference under 30 s; record both numbers here and for the PR.

**Checkpoint**: Every published PDF is the same build's `/cv` print view, proved by the site check; a build that can't make it fails.

---

## Phase 5: User Story 3 - The link works offline after one visit (Priority: P3)

**Goal**: After one complete online visit, the link saves the stored version's PDF offline; online after a new version, it saves the new one; with nothing stored, `/cv` stays as it was.

**Independent Test**: quickstart §5: visit `/cv` online, stop the server and go offline, activate the link, and `cmp` the saved file with `dist/site/cv.pdf`.

### Tests for User Story 3 (REQUIRED) ⚠️

- [ ] T030 [US3] In `web/test/offline.test.ts`, add `describe('011-cv-pdf-FR-002, 011-cv-pdf-FR-030, 011-cv-pdf-FR-031: the download through the worker', …)`: (a) online with the worker controlling `/cv`, clicking the link gives a download whose suggested name is `Alex-Profir-CV.pdf` and whose bytes equal the built `cv.pdf`; (b) after one visit, with the browser offline and the server dropping every connection (`setOffline` alone doesn't stop a download, research R6), the same click gives the same bytes and name; (c) after a new version with a different `cv.pdf` is served, online, the click gives the new bytes.
- [ ] T031 [US3] In `web/test/offline.test.ts`, add `describe('011-cv-pdf-FR-032: no stored PDF', …)`: in a fresh context with service workers blocked, offline, clicking the link leaves `/cv`'s URL and its `main` text exactly as before the click.
- [ ] T032 [P] [US3] In `site-check/test/offline.test.ts`, add `describe('011-cv-pdf-FR-041: the offline download step', …)`: on a fixture site whose worker doesn't precache `/cv.pdf`, the `offline` part reports exactly `offline /cv 375px offline-pdf a[href="/cv.pdf"]: no download with the network off`; on the real build it reports nothing.

### Implementation for User Story 3

- [ ] T033 [US3] In `web/src/sw/service-worker.ts` (research R7, contracts/site.md): (1) a fetch that is not a navigation, for a precached file outside `/assets/` and `/playground/` that isn't a page, is answered by the network within the existing 3-second limit, then by this version's cached copy; `/assets/` stays cache first and `/playground/` keeps its rule; (2) `storedAnswer`, for a navigation the network fails or doesn't answer within 3 s, gives a page route's stored page, else a precached non-page file at that path (`/cv.pdf`), else the stored not-found page. Install stays all or nothing.
- [ ] T034 [P] [US3] Create `web/src/client/download.ts` installing one document `click` listener per contracts/page.md's table: do nothing on a non-primary click, a modifier key, `defaultPrevented`, a target not inside `a[download]` with a same-origin `http(s)` address, or no `navigator.serviceWorker.controller`; otherwise `preventDefault()`, `fetch(href)`, and on success save the body through a temporary `<a download="<same name>">` on a `blob:` URL, then revoke it; on a failed fetch, start the plain download of `href` so the browser shows its own failure (FR-032). Import it from `web/src/client/register-sw.ts`. Keep it well under 1 KB.
- [ ] T035 [US3] In `site-check/src/parts/offline.ts`, after the existing one online visit to `/cv` at 375 px, set the browser offline and make the server drop every connection, click `a[href="/cv.pdf"]` and expect a download: report `offline-pdf` with contracts/site.md's details when there is none, when its bytes differ from the built `cv.pdf`, or when its suggested name isn't `downloadName(resume.basics?.name)`.
- [ ] T036 [US3] Run T030 to T032, `web/test/shell/offline.test.ts` and the `offline` part of `npm run site-check`. Walk quickstart §5.

**Checkpoint**: All three stories work on their own and together.

---

## Phase 6: The host build

**Purpose**: Research R9's trimmed library list, proved on a real preview deploy

- [ ] T037 Trim the `dnf install` list in `web/scripts/vercel-build.sh` on the pull request's Vercel preview: start from `nss nspr`, add back only what Chromium's launch proves it needs, and keep the build green. Record the final list and the deploy's added time against `main`'s last deploy in research.md R9 and here. Check quickstart §7 on the preview (`curl -sI …/cv.pdf` 200, `application/pdf`, `no-cache`; `…/CV.pdf` 404; the link downloads). Pushing to get a preview is outward-facing: do it only if the run allows it, else mark `BLOCKED:` for the owner and keep the trial's full list.

---

## Phase 7: Polish & Constitution Verification

**Purpose**: Traceability, the audits, the full verification, the owner's manual checks and the single PR

- [ ] T038 [P] Run `npm run traceability` (Constitution III): it exits 0 and counts 011's 20 live requirements, FR-021 removed; every row of Requirement Coverage below has a passing test. Record the PASS line here.
- [ ] T039 [P] Audit Constitution IV, V, VII, IX and X in `packages/web/`, `tools/site-check/` and `vercel.json`. **IV**: the owner's name only in `packages/content/`, no literal design value, the labels in `site-text.ts`. **V**: no change in `os-core`, the shells or `apps/`. **VII**: the CV is still one click and one tap from first load, and `/cv` renders and downloads without JavaScript (the `no-script` part passes). **IX**: the arrow is the site's own. **X**: no new dependency; `writeCvPdf`, `download.ts` and `vercel-build.sh` are the only abstractions, as plan.md lists. Record the result here.
- [ ] T040 [P] Verify Constitution VI and VIII on the real build: the `accessibility`, `keyboard`, `modes`, `offline` and `lighthouse` parts pass with the link at 375 and 1440 px (FR-042, SC-007), with Lighthouse 90+ in every category on mobile and desktop for `/cv`; and `site-check/test/performance.test.ts`'s 1,020,000 ms budget still holds with the `pdf` part. If it doesn't, mark `BLOCKED:` for the owner rather than raising it. Record the figures here.
- [ ] T041 Run the full verification after T038 to T040: `npm run typecheck`, `npx vitest run --project slow web/test/pdf.test.ts web/test/offline.test.ts web/test/structure.test.tsx web/test/data-req.test.tsx web/test/focus.test.ts web/test/accessibility.test.ts web/test/routes.test.ts web/test/build.test.ts`, `npx vitest run --project slow tools/site-check/test`, `npm run content-check`, `npm run token-check`, `npm run traceability` and `npm run site-check` all exit 0. Record the counts here.
- [ ] T042 Walk [quickstart.md](./quickstart.md) §1 to §6 against `npm run build && npm run serve`, by script in one headless browser where a script can, recording each step and fixing any difference before the PR. Say plainly which steps a script can't show.
- [ ] T043 Owner action, by hand: the download in the current Chrome, Edge, Firefox and Safari, desktop and phone, with scripting on and off (including a phone browser that opens PDFs in its viewer); the PDF read by a screen reader (headings, lists, reading order, FR-015); forced colors and 200% text on the row; the built row against `design/mockup/*.png`. Record each result here and in the PR. Under the interim provision on deferred manual checks they may wait for the final testing phase: record that here, list them in the PR and leave this task open.
- [ ] T044 Open the PR from `011-cv-pdf` to `main` with a Conventional Commits title, e.g. `feat: download the CV as a PDF (011)`, linking 011's `spec.md` and `tasks.md` and the amended `specs/004-cv-page/spec.md` (Constitution XI), naming the amendment of 004 FR-025 (FR-006), T029's SC-008 numbers, T037's host result and the deferred manual checks (T043). No AI or Claude attribution (CLAUDE.md). Pushing and opening it are outward-facing: do them only if the run allows it, else mark `BLOCKED:` for the owner.
- [ ] T045 Run `npm run verify:feature` once on any commit of the PR, use `--failed` after a fix, and name the commit and result in the PR description (Constitution, Merge requirements). Green CI is what merges it, and the owner merges.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: after Setup. Blocks every story. T002 (design gate) blocks T014 and T015.
- **US1 (Phase 3)**: after Foundational. The MVP.
- **US2 (Phase 4)**: after T016 and T017 (it extends `cv-pdf.ts` and checks the built PDF). T021, T026 and T027 can start once Foundational is done.
- **US3 (Phase 5)**: after T014 to T017 (it needs the link and a precached `cv.pdf`). Independent of US2.
- **Host build (Phase 6)**: after T018, and needs a pushed branch.
- **Polish (Phase 7)**: after every story and Phase 6.

### Within Each User Story

- Tests first, seen failing, then the implementation.
- US1: T013 before T015; T014 before T015; T016 before T017. T006 to T008 share one file, so they run in order.
- US2: T024 and T025 edit `cv-pdf.ts`, in order; T026 before T027 before T028.
- US3: T030 and T031 share one file; T033 and T034 before T035.

### Parallel Opportunities

- Phase 2: T003, T004 and T005.
- US1 tests: T009, T010, T011 and T012 beside the `structure.test.tsx` sequence T006 to T008. Implementation: T013 and T018 beside T014.
- US2: T021 and T026 together; T022/T023 beside them.
- US3: T032 and T034 beside T030 and T033.
- US2 and US3 can run side by side once US1's T017 is done.
- Polish: T038, T039 and T040.

---

## Parallel Example: User Story 1

```bash
# Tests in different files, together:
Task: "T009 data-req row for div.contact-row.download in packages/web/test/data-req.test.tsx"
Task: "T010 Tab order and focus ring, covers 011-cv-pdf-FR-042, in packages/web/test/focus.test.ts"
Task: "T011 axe on /cv with the link, covers 011-cv-pdf-FR-042, in packages/web/test/accessibility.test.ts"
Task: "T012 vercel.json /cv.pdf route, covers 011-cv-pdf-FR-010 and FR-030, in packages/web/test/routes.test.ts"

# Implementation in different files, together:
Task: "T013 downloadName in packages/web/src/format/file-name.ts"
Task: "T018 packages/web/scripts/vercel-build.sh and vercel.json"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 and Phase 2, including the design gate.
2. Phase 3: the link, the build step and the host build.
3. **Stop and validate**: quickstart §1 and §4. The link downloads a PDF of `/cv`.

### Incremental Delivery

1. US1 → a working online download (MVP).
2. US2 → the PDF's metadata, the named failures and the `pdf` part in CI.
3. US3 → the offline download.
4. Phase 6 → the trimmed host build.

All of it ships in the single `011-cv-pdf` PR with the 004 amendment (Constitution XI); the increments
are checkpoints within it.

---

## Requirement Coverage

| Requirement | Test task(s) |
|-------------|--------------|
| 011-cv-pdf-FR-001 | T006, T009 |
| 011-cv-pdf-FR-002 | T006, T009, T030 |
| 011-cv-pdf-FR-003 | T006, T007, T009 |
| 011-cv-pdf-FR-004 | T009, T022 |
| 011-cv-pdf-FR-005 | T008 |
| 011-cv-pdf-FR-006 | T006, T009 |
| 011-cv-pdf-FR-010 | T012, T022 |
| 011-cv-pdf-FR-011 | T022 |
| 011-cv-pdf-FR-012 | T022, T021 |
| 011-cv-pdf-FR-013 | T022 |
| 011-cv-pdf-FR-014 | T022, T021 |
| 011-cv-pdf-FR-015 | T022 |
| 011-cv-pdf-FR-016 | T022 |
| 011-cv-pdf-FR-020 | T023 |
| ~~011-cv-pdf-FR-021~~ | Removed 2026-11-24 (research R1) |
| 011-cv-pdf-FR-030 | T012, T030 |
| 011-cv-pdf-FR-031 | T030 |
| 011-cv-pdf-FR-032 | T031 |
| 011-cv-pdf-FR-040 | T021 |
| 011-cv-pdf-FR-041 | T032 |
| 011-cv-pdf-FR-042 | T010, T011 |

SC-001 is T020, T042 and T043; SC-002 and SC-005 T022; SC-003 T023 and T017; SC-004 T030 and T032;
SC-006 T022; SC-007 T011 and T040; SC-008 T029.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- 13 test tasks, against research R13's 12 tests: T006 to T008 split one file's three cases into
  separate tasks, and each requirement (Constitution III) needs a test naming it
- Verify tests fail before implementing
- Commit after each task or logical group, using Conventional Commits, with no AI attribution
- Under `/speckit-converge`, new work goes in new phases and doesn't widen the scope above
