# Implementation Plan: The /cv Page

**Branch**: `004-cv-page` | **Date**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-cv-page/spec.md`

**Design**: [design/review.md](./design/review.md) (Direction C, Technical timeline, Penpot
revision 10, approved 2026-10-22). Its Penpot link is deferred under Constitution 1.2.0's interim
provision on local mockups (R22).

## Summary

`/cv` becomes the site's first page: the whole CV, from `@cv/content`, styled only with
`@cv/tokens`, in the approved Direction C design. A not-found page and the root redirect come with
it.

A new workspace, `packages/web` (`@cv/web`), holds the pages as TSX components. `npm run build`
renders them to complete HTML files **at build time** with React's `renderToStaticMarkup`, so the
server sends the whole page and no React code reaches the browser. Vite builds the style sheet,
the fonts and a one-line service worker registration script, with content-hashed names. A
hand-written service worker stores one complete version of the site after the first visit, and
answers from it when the network is gone.

A fourth check, `npm run site-check`, builds the site, serves it from the machine, and runs eleven
parts in Chromium through Playwright:

- the merge checks the spec names: accessibility (axe-core), Lighthouse on mobile and desktop,
  no-script, offline, keyboard and other-site requests;
- the parts that enforce the rest of the spec on the real build: unsupported content, fonts,
  layout, print and forced colors with reduced motion.

A new CI job, `site`, runs the same command, and the ruleset makes it required.

Technical approach (details in [research.md](./research.md)):

- **Rendering**: React 19.3.1 at build time, TSX components that 001 and 003 already read (R1).
  The page takes the CV document as a prop, so tests render every edge case with fixture
  documents.
- **Build**: Vite 8.3.5 (already installed through Vitest) for a client build and an SSR build,
  Lightning CSS for the tokens' `@custom-media`, then a prerender script (R2).
- **Addresses**: one route table: `/cv` and `/cv/` → the page, `/` → 307 to `/cv`, anything else →
  404 with the not-found page. A small local server and the service worker read it, and so will
  the publishing feature's host config (R3).
- **Offline**: network first for pages with a 3-second limit, then the stored copy. Storage is
  all or nothing per version. No prompts (R4).
- **Fonts**: Space Grotesk, Schibsted Grotesk and JetBrains Mono, OFL, committed as WOFF2 subsets
  with their licenses. `@font-face` is generated at build time from a description of the files and
  checked against the font tokens, so no style sheet names a family, and **003 needs no
  amendment** (R5, FR-046).
- **Tokens**: the mockup's tokens replace the starter set. Penpot can't be reached until at
  least 2026-10-26, so under Constitution 1.2.0's interim provision the export is written by hand
  in Penpot's exact form, and imported into Penpot and exported again afterwards (R6).
- **Checks**: one CLI in the shape of the other three, with Playwright as a library, axe-core,
  Lighthouse with a median of three runs, Chrome DevTools Protocol font queries and PDF.js for
  print (R11 to R19). Every browser it starts can reach only `127.0.0.1` (R17).

## Technical Context

**Language/Version**: TypeScript with erasable syntax, run by Node.js 26 (as 001 to 003), plus TSX
for components. CSS, compiled by Lightning CSS. The service worker is TypeScript with its types
stripped at build time.

**Primary Dependencies**:

- Site, at build time only: `react` and `react-dom` 19.3.1. Nothing ships to the browser except
  the registration script and the service worker, both hand-written.
- Build: `vite` 8.3.5 and `lightningcss` 1.33.0, both already installed through Vitest, now pinned
  directly.
- Checks: `playwright` 1.64.1, `axe-core` 4.14.0, `lighthouse` 13.5.0, `pdfjs-dist` 6.4.299.
- Types: `@types/react` and `@types/react-dom` 19.3.0.
- Reused: `@cv/content` (002), `@cv/tokens` (003), 001's file walk and ordering, 002's site-file
  walk.

**Storage**:

- In the repository: the pages, styles, fonts with their licenses, and the service worker under
  `packages/web/`; one new site data field, `repository`, in `packages/content/site.json`; the new
  token export.
- Build output in `packages/web/dist/` (git-ignored).
- In the visitor's browser: one cache, `cv-<version>`.

**Testing**:

- Vitest (`npm test`), with Playwright's Chromium opened as a library, for page tests on fixture
  CVs and for the site check's parts on fixture sites.
- `tsc --noEmit` over the root project, now with TSX, and over the service worker's own project.
- `npm run site-check` on the real build in CI.
- By hand before merge: screen readers (SC-004), print in two browsers (SC-005), the mockup
  comparison (FR-042), and the live ruleset (quickstart.md).

**Target Platform**:

- The page: the current and previous major versions of Chrome, Edge, Firefox and Safari, on
  desktop and phone.
- The build and checks: Node.js 26 on macOS (owner) and Linux (GitHub Actions `ubuntu-latest`),
  with Playwright's Chromium.

**Project Type**: a statically rendered web page in a new workspace, plus a repository CLI check,
one new CI job, a change to the `test` job and a ruleset change.

**Shells**: None. `/cv` is independent of the shells (Constitution VII). It works at phone and
desktop widths in any browser, and the root leads to it until the shells feature changes that.

**Offline Approach**: a service worker registered by both pages stores every served file as one
version after the first visit. Pages are network first with a 3-second limit, then the stored
copy. The root and unknown paths are answered from the same route table offline. A failed
download leaves the previous version whole. Nothing is shown or asked. Without scripting, nothing
is stored, which the spec accepts (R4).

**Performance Goals**:

- Lighthouse 90 or more in every category on both profiles (SC-002).
- Name and role visible within 2.5 s under Lighthouse's simulated mobile connection (SC-003).
- The whole site check under 5 minutes locally (SC-009).
- Page weight, estimated: HTML about 6 KB and CSS about 3 KB compressed; about 60 KB of font
  subsets above the fold.

**Constraints**:

- No request to any other site, from the page or the checks (FR-016, FR-057).
- No style, content or layout depends on a script (FR-014).
- No literal design value and no CV fact in site source (003, 002), with no exception.
- Every token in the export is used (FR-043).
- The checks' directory names avoid `build`, `dist`, `out` and `coverage`, which every check
  skips (R2).

**Scale/Scope**: 2 pages and 1 redirect; 7 CV sections; 3 font families; 11 check parts over 2
pages at up to 6 widths, 2 Lighthouse profiles and 2 paper sizes; 58 requirements.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The initial check passed before research, and the post-design re-check passed too. The table
shows the post-design state.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | spec.md line 7 reads `**Status**: Approved`. React, Vite, Playwright, axe-core, PDF.js, file paths and CI choices appear only in this plan, research.md and the contracts. Where the plan reads the spec, it says so: FR-008's country names (R7) and FR-021's text resizing (R6) |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | `design/wireframes.md` covers `/cv` at phone, desktop and print, and the not-found page at both widths. `design/mockup/` holds the four PNG exports from Penpot. `design/review.md` is signed by the owner, naming revision 10 and 2026-10-22. The Penpot link is missing, which Constitution 1.2.0's interim provision allows for a design that already exists in Penpot: it's added in the provision's follow-up pull request (R22). Depends on 1.2.0 being merged first |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 58 FRs have planned tests below. UI targets follow [contracts/page.md](./contracts/page.md#data-req-targets). The traceability check (001) reads `data-req` in TSX, which is why TSX was chosen (R1) |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | Pages read `resume` and `siteData` from `@cv/content` only. The repository address becomes site data, added by 002's process (R7). Site text holds no CV fact, and the content check runs over it. Styles read only `var(--token-…)` and `@media (--token-…)`. The fonts' `@font-face` is generated at build time, with families tied to the font tokens (R5). Token values come from a new export, written by hand in Penpot's form under the interim provision, and round-tripped through Penpot afterwards (R6). Changing a fact or a token is one edit, then a rebuild (SC-008, quickstart 9) |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | N/A | No app, shell or `os-core`. `/cv` is the shell-independent route (Constitution VII). Matches the spec's Shell Scope: neither shell is affected |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | After one visit, `/cv`, `/` and unknown paths work offline with content, styles and fonts (R4). Proven by the `offline` part on every pull request (FR-053) and by update tests (FR-039). The checks run without network beyond the machine (R17) |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | `/` is a 307 to `/cv`, so the CV is zero clicks from first load (FR-018). `/cv`'s full content is in the HTML the server sends, rendered at build time, and reads with scripting off (R1, FR-014). Offline support adds no prompt, banner or install offer (R4) |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | axe-core at three widths on both pages, keyboard order and visible focus, forced colors, no motion, layout at 200% and 400% zoom and with text spacing, and Lighthouse 90+ on both profiles, all blocking merge (R11 to R19). Manual screen reader pass (SC-004). The desktop-shell keyboard clause doesn't apply: no shell exists |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The design is the owner's own (design/review.md). Fonts are Space Grotesk, Schibsted Grotesk and JetBrains Mono, all OFL. A test asserts no font token or `fonts.json` family is an Apple or system UI font. Arrows are the site's own SVG paths |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | Ten packages, two of them already installed, and fourteen abstractions are listed below, each with the simpler alternative it rejected. No agent skill is added |
| XI | One Feature, One PR | Feature ships in one PR linking spec.md and tasks.md | Pass | One PR from `004-cv-page`, with the token export, the site data field and the ruleset change in it. Applying the ruleset is a repository setting made during the PR (quickstart 12) |

## Requirement Traceability

Constitution III. Paths are relative to `packages/web/test/` for page tests and
`tools/site-check/test/` for check tests, as marked. Each test or group title carries the
`004-cv-page-FR-###` IDs it covers. "Fixture CV" means a document in
`packages/web/test/__fixtures__/`, rendered with the real components and style sheet and opened
in Chromium (R21). "Fixture site" means a small site under `tools/site-check/test/__fixtures__/`.

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 004-cv-page-FR-001 | web `content.test.tsx`: the real CV renders the seven blocks in the design's order (US1 scenario 1), and a fixture CV with three projects keeps their document order | `main` |
| 004-cv-page-FR-002 | web `content.test.tsx`: a fixture CV holding every shown field of the Key Entities table renders each one, found by its text or `datetime` | each `section` |
| 004-cv-page-FR-003 | web `content.test.tsx`: every text node in `<main>` is CV text or a site text value. `self-check`: the content check passes over the repository. web `one-edit.test.ts`: changing a position in a copy of the CV document and rebuilding changes the page (US6 scenario 1) | text-bearing sections |
| 004-cv-page-FR-004 | web `content.test.tsx`: `"interests": []` and a missing `interests` give no Interests heading or empty region (US1 scenario 11). A missing email, location and summary leave no label, separator or empty element | each `section` |
| 004-cv-page-FR-005 | check `content.test.ts`: `certificates` with 2 entries gives `unsupported-section` naming it (US6 scenario 5). `basics.phone` and `work[0].contact` give `unsupported-field` with their paths. `"awards": []`, `$schema` and `meta` give nothing | Non-UI |
| 004-cv-page-FR-006 | web `site-text.test.ts`: every site text value is English (a fixed allowed-character test) and holds no key fact of the real CV. The not-found page holds no CV string | Non-UI |
| 004-cv-page-FR-007 | web `content.test.tsx`: `Politehnica University of Timișoara` appears exactly, NFC (US1 scenario 10). check `fonts.test.ts`: a fixture site with a character outside every served subset gives `missing-glyph` naming `U+…`, the section and the element. web `fonts.test.ts`: every character on the real page is drawn by a served face | text-bearing sections |
| 004-cv-page-FR-008 | web `location.test.ts`: `Timișoara`, `RO` gives `Timișoara, Romania`. With a region, three parts. Each of the 249 ISO codes gives a name that isn't the code | location `dd` |
| 004-cv-page-FR-009 | web `dates.test.ts`: `2018`, `2018-07` and `2018-07-29` give `2018`, `Jul 2018` and `29 Jul 2018`, and never a month or day not given | `p.date` |
| 004-cv-page-FR-010 | web `dates.test.ts`: start only → `Dec 2025 – Present` (US1 scenario 8); end only → the end alone; `2018-07` to `2018-07` → once; `2018` to `2018-07` → `2018`; none → no date line (US1 scenario 12) | `p.date` |
| 004-cv-page-FR-011 | web `dates.test.ts`: spoken text is `July 2018 to October 2026` (US1 scenario 7) and `December 2025 to present`. web `structure.test.tsx`: the accessible text of `p.date` equals the spoken text, and each `<time>` has the original string as `datetime` | `p.date` |
| 004-cv-page-FR-012 | web `links.test.tsx`: the email link is `mailto:` the address, the GitHub link goes to `https://github.com/alex-profir` (US1 scenario 9), entry links go to their URLs, and a project with no URL has a plain-text name (US1 scenario 12) | CV links |
| 004-cv-page-FR-013 | web `links.test.tsx`: the profile link's accessible name holds the network and the username; with no username, the network. An entry link's name is the entry's name | CV links |
| 004-cv-page-FR-014 | web `server-html.test.ts`: the built `cv.html`, parsed without running scripts, holds every shown field (as the no-script part, on the file). check `no-script.test.ts` | `main` |
| 004-cv-page-FR-015 | check `no-script.test.ts`: a fixture site whose projects appear only after a script fails with the missing fields (US2 scenario 4); a page with a `<button>` fails. web `server-html.test.ts`: the pages hold no `<button>`, form control or `<noscript>` | Non-UI |
| 004-cv-page-FR-016 | web `server-html.test.ts`: every `src`, `href` of a resource and CSS `url()` in the build is same-origin or `data:`. check `other-sites.test.ts` covers the browser side | Non-UI |
| 004-cv-page-FR-017 | web `routes.test.ts`: `/cv`, `/cv/`, `/cv?x=1` and `/cv#a` return the same body with 200. The head has no canonical and no `og:url` | Non-UI |
| 004-cv-page-FR-018 | web `routes.test.ts`: `/` and `/?x=1` answer 307 with `Location: /cv` and `/cv?x=1`, and no caching header. A browser opening `/` ends at `/cv` | Non-UI |
| 004-cv-page-FR-019 | web `routes.test.ts`: `/nope`, `/cv.html` and `/cv/x` answer 404 with the not-found page, which links to `/cv`. web `accessibility.test.ts` and `tokens.test.ts` include the not-found page | not-found `main` |
| 004-cv-page-FR-020 | web `layout.test.ts`: the real CV at 320, 375, 768, 1024, 1440 and 2560 px has no horizontal scroll, and the content column at 2560 px is no wider than the content width token | Non-UI |
| 004-cv-page-FR-021 | web `layout.test.ts`: at 200% and 400% zoom (R19) nothing scrolls sideways or is clipped, and at 400% the layout is one column (US1 scenarios 4 and 5). With the WCAG 1.4.12 text spacing, nothing is clipped or overlaps | Non-UI |
| 004-cv-page-FR-022 | web `layout.test.ts`: a fixture CV with a 120-character word and a 200-character URL at 320 px stays inside the column | text-bearing sections |
| 004-cv-page-FR-023 | web `structure.test.tsx`: exactly one `h1`, `Alex Profir`. With no name, `CV` | `h1` |
| 004-cv-page-FR-024 | web `structure.test.tsx`: the heading outline is `h1`, then an `h2` per shown section, with `h3` per work, project and education entry under its section; no level skipped (US1 scenario 6) | each `section` |
| 004-cv-page-FR-025 | web `structure.test.tsx`: one `main`; every section is a `region` named by its heading; the footer is outside `main` | `main`, `footer` |
| 004-cv-page-FR-026 | web `structure.test.tsx`: highlights, keywords, courses, profiles, skills, languages and interests are `list` / `listitem` in the accessibility tree | each `section` |
| 004-cv-page-FR-027 | web `structure.test.tsx`: `lang="en"`. web `layout.test.ts`: at every width, each element's box comes after the previous one's in reading order (top, then left), and no rule uses `order` or reversed flex | `main` |
| 004-cv-page-FR-028 | web `accessibility.test.ts`: axe-core with WCAG 2.2 A and AA tags finds no violation on `/cv` (real CV and every fixture CV) and the not-found page, at 320, 375 and 1440 px | Non-UI |
| 004-cv-page-FR-029 | web `focus.test.ts`: every link is reached by Tab in reading order, shows an indicator of 3:1 or more, and isn't covered (the keyboard part, on fixture CVs) | CV links |
| 004-cv-page-FR-030 | web `modes.test.ts`: with forced colors, rules, timeline dots and chips keep a visible border, links keep their underline, and the focus outline is visible. No element has a background image | Non-UI |
| 004-cv-page-FR-031 | web `modes.test.ts`: with and without reduced motion, every element's computed transition and animation durations are 0 | Non-UI |
| 004-cv-page-FR-032 | web `print.test.ts`: on A4 and Letter PDFs, the footer's text is absent and every text item is inside the page (US3 scenarios 1 and 6); the built CSS has no `@page` rule (US3 scenario 7) | `footer` |
| 004-cv-page-FR-033 | web `print.test.ts`: `https://github.com/alex-profir` appears in the PDF text (US3 scenario 2), and the email address appears once (scenario 3) | CV links |
| 004-cv-page-FR-034 | web `print.test.ts`: with the spacer fixture (R18), no page's last line is a section or entry heading (US3 scenario 4) | Non-UI |
| 004-cv-page-FR-035 | web `print.test.ts`: in print emulation, every text color has 4.5:1 or more against white, and no element relies on a background (US3 scenario 5) | Non-UI |
| 004-cv-page-FR-036 | web `sharing.test.tsx`: the title and `og:title` are `Alex Profir — Software Engineer`; the description and `og:description` are the summary; no `og:image` (US5 scenarios 1 and 3). Changing the label in a fixture changes both (scenario 2) | Non-UI |
| 004-cv-page-FR-037 | web `sharing.test.tsx`: no summary → the label as description (US5 scenario 4); no name → the label as title; neither → `CV` and no description element | Non-UI |
| 004-cv-page-FR-038 | web `offline.test.ts`: after one visit to `/cv`, and separately to `/` only, with the server stopped and the context offline, `/cv`, `/cv?utm_source=x`, `/` and `/nope` show their full pages (US4 scenarios 1, 2 and 7) | Non-UI |
| 004-cv-page-FR-039 | web `offline.test.ts`: version A stored, B published: the next online visit shows B, and offline afterwards shows B (US4 scenario 3). C with a failing font: offline shows B whole (scenario 4) | Non-UI |
| 004-cv-page-FR-040 | web `offline.test.ts`: with a stored copy, a server that drops the connection, and one that doesn't answer for 5 s, both show the stored copy (US4 scenario 5) | Non-UI |
| 004-cv-page-FR-041 | web `offline.test.ts`: no dialog, banner or console error during install and update; with service workers blocked (`serviceWorkers: 'block'`), the page loads with no console error | Non-UI |
| 004-cv-page-FR-042 | web `design.test.ts`: section order, fonts per element (name and headings display, body text, dates and chips mono), the content width at 1440 px, the side margin at 375 px, two columns at 1440 px and one at 375 px. The visual comparison is quickstart 1 | Non-UI |
| 004-cv-page-FR-043 | web `tokens.test.ts`: every token in the export is read by the site, directly or by reference; the export holds the five colors of design/review.md; the motion source is unchanged. `self-check`: the token check accepts the export as Penpot's written form (003), which is what makes the hand-written file importable | Non-UI |
| 004-cv-page-FR-044 | `self-check`: `npm run token-check` passes over the repository. web `tokens.test.ts`: no style sheet or component under `packages/web/src` holds a skip marker | Non-UI |
| 004-cv-page-FR-045 | web `fonts.test.ts`: every `fonts.json` file and license exists; each family's directory holds `OFL.txt`; no family is an Apple or system UI font; every face has `font-display: swap`; the build fails for a font token with no entry | Non-UI |
| 004-cv-page-FR-046 | web `fonts.test.ts`: no style sheet or component in the repository holds an `@font-face` rule or a family name, the built CSS holds one `@font-face` per `fonts.json` file, and `npm run token-check` passes with the fonts declared, so no amendment to 003 is needed (R5) | Non-UI |
| 004-cv-page-FR-047 | web `data-req.test.tsx`: every UI target in this table appears on its element in the rendered pages. `self-check`: `npm run traceability` passes | all targets |
| 004-cv-page-FR-048 | check `repo-settings.test.ts`: `ci.yml` has the `site` job with the steps and restrictions of [contracts/ci.md](./contracts/ci.md), and the ruleset requires `site`. Live: quickstart 12 | Non-UI |
| 004-cv-page-FR-049 | check `cli.test.ts`: `npm run --silent site-check` and the CI step run the same command; two runs on a fixture give the same result ([contracts/cli.md](./contracts/cli.md#determinism)) | Non-UI |
| 004-cv-page-FR-050 | check `accessibility.test.ts`: a fixture link with no name (US2 Independent Test) and low-contrast text (US2 scenario 2) each fail, naming page, width, rule and element | Non-UI |
| 004-cv-page-FR-051 | check `lighthouse.test.ts`: a fixture page with a 2 MB blocking script scores under 90 on mobile and fails, reporting profile, category and score (US2 scenario 3); a minimal page passes; the not-found page and the redirect aren't scored | Non-UI |
| 004-cv-page-FR-052 | check `no-script.test.ts`: the expected fields come from the CV document (adding a highlight to a fixture CV adds an expected field); missing and out-of-order fields are named by JSON path | Non-UI |
| 004-cv-page-FR-053 | check `offline.test.ts`: a fixture site whose fonts aren't stored fails, naming the font (US2 scenario 5); one whose root isn't handled offline fails | Non-UI |
| 004-cv-page-FR-054 | check `keyboard.test.ts`: removing the outline fails, naming every link (US2 scenario 6); a positive `tabindex` fails as out of order; a covering element fails | Non-UI |
| 004-cv-page-FR-055 | check `other-sites.test.ts`: a fixture with an analytics script and a style sheet from other sites fails, naming both addresses (US2 scenario 7 and Independent Test) | Non-UI |
| 004-cv-page-FR-056 | check `pages.test.ts`: a fixture manifest with a second page gets it checked by every part, and by Lighthouse because it answers 200, with no change to the command (US2 scenario 9) | Non-UI |
| 004-cv-page-FR-057 | check `cli.test.ts`: the positive control of R17 (`example.com` and `203.0.113.10` requested, both reported, no connection made); every launch carries both isolation flags | Non-UI |
| 004-cv-page-FR-058 | check `report.test.ts`: with several parts failing, every part still runs; a crashing part is reported as `error` and the rest continue; each problem line has part, page, variant and subject; the summary lists every part, page, variant and Lighthouse score | Non-UI |

Success criteria without an FR of their own:

- SC-001: FR-052 and FR-014 above, at 320 and 1440 px.
- SC-002, SC-003: the `lighthouse` part on every pull request. SC-003 is asserted in check
  `lighthouse.test.ts` on the real build off CI: the median first contentful paint on the mobile
  profile is under 2.5 s, and the `h1` and `p.role` lie inside the first 375 × 667 px viewport.
  The page is static HTML with render-blocking CSS, no script and `font-display: swap`, so
  everything in that viewport, the name and role included, is drawn in the first contentful
  frame. On CI, SC-003 is guarded by the Performance score of 90 or more.
- SC-004, SC-005: by hand, quickstart 6 and 7, recorded in the pull request.
- SC-006, SC-007: the `offline` and `other-sites` parts on every pull request.
- SC-008: quickstart 9, with FR-003 and FR-043 as automated guards.
- SC-009: check `cli.test.ts`: the seeded fixture's report equals `expected-report.txt`, with
  Lighthouse scores masked. Check `performance.test.ts` runs `npm run site-check` on the real repository in under
  5 minutes, asserted off CI only, as in 001.
- SC-010: the `self-check` tests above.

## Dependencies, Skills & Abstractions

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `react`, `react-dom` 19.3.1 (exact pin) | dependency of `@cv/web`, used at build time only | Renders TSX pages to HTML with `renderToStaticMarkup` (R1) | Template strings: no typed markup, manual escaping, and `data-req` invisible to 001. Astro: `.astro` unreadable to 001 and 003 | Yes: Meta's React team |
| `@types/react`, `@types/react-dom` 19.3.0 (exact pin) | dev dependency, types only | `npm run typecheck` checks TSX with `strict` | React ships no types | No: DefinitelyTyped |
| `vite` 8.3.5 (exact pin) | dev dependency, already installed through Vitest | Client and SSR builds, asset hashing and the manifest, CSS through Lightning CSS (R2) | Driving Lightning CSS and a TSX compiler by hand re-implements hashing and asset handling | Yes: the Vite team (VoidZero) |
| `lightningcss` 1.33.0 (exact pin) | dev dependency, already installed through Vite | Vite's CSS transformer, replacing `@custom-media` at build time, as 003 R11 requires | PostCSS with `postcss-custom-media` and `@csstools/postcss-global-data`: two community plugins for what one option does | Yes: the Parcel team |
| `playwright` 1.64.1 (exact pin) | dev dependency | Drives Chromium for the site check and the page tests: scripting off, offline, keyboard, emulated media, CDP, PDF (R11) | Puppeteer: Chrome only too, but Playwright's per-context offline, scripting and service worker routing are what the parts need. Playwright Test as a runner: a second runner 001 only partly reads | Yes: Microsoft |
| `axe-core` 4.14.0 (exact pin) | dev dependency | Finds automated WCAG 2.2 A and AA violations with element selectors (R12) | Lighthouse's accessibility category: a subset of axe at one width, reported as a score. `@axe-core/playwright`: a wrapper over two calls | Yes: Deque |
| `lighthouse` 13.5.0 (exact pin) | dev dependency | The constitution names Lighthouse scores (R13). Brings `chrome-launcher` | `@lhci/cli`: adds assertions, uploads and a server the check doesn't use | Yes: Google's Chrome team. Brings about 25 packages, including `puppeteer-core`; its error reporting stays off |
| `pdfjs-dist` 6.4.299 (exact pin) | dev dependency | Reads text positions from Chromium's PDFs, so print rules are verified as printed (R18) | Checking computed `break-after` only proves the rule is written. Rendering pages to images needs a canvas package | Yes: Mozilla's PDF.js |
| npm workspace `@cv/web` | abstraction (package boundary) | Holds the site source, so shells and later pages have one place, and tests import components by package | Site files at the root would be searched as tooling by 002 and mixed with repository configuration | N/A |
| Build script (`scripts/build-site.ts`) | abstraction | Runs the two Vite builds, renders each route, writes the service worker and the site manifest (R2) | A framework's static output: rejected in R1 | N/A |
| Fonts plugin (`scripts/fonts-plugin.ts`) and `fonts.json` | abstraction | Generates `@font-face` from a description of the files and checks it against the font tokens, so no style sheet names a family (R5) | Amending 003 to allow `@font-face` families: writes each family twice by hand and changes another feature's check when none is needed | N/A |
| Route table (`src/routes.ts`) and site manifest | abstraction | One definition of addresses for the server, the service worker, the checks and the later host config (R3) | Each reader keeping its own list: the root redirect and the not-found status would drift | N/A |
| Local server (`tools/site-check/src/server.ts`) | abstraction | Serves the build as a host would: the 307, the 404 page, cache headers, compression (R3) | `vite preview` and static server packages can't answer from the route table without a second copy of it | N/A |
| Service worker and registration script | abstraction | The offline behavior of FR-038 to FR-041 (R4) | Workbox: a build toolchain, and precached pages served cache first against FR-039 | N/A |
| Site text module (`src/site-text.ts`) | abstraction | All non-CV wording in one place, so changing a word is one edit (FR-006, R7) | Strings inline in components: a heading's wording would be spread across files. Site data: needs a schema field per label | N/A |
| Supported content (`src/supported.ts`) | abstraction | The Key Entities table as data, read by the page and the `content` part (FR-005) | Two hand-kept lists, one in the page and one in the check, would drift | N/A |
| Formatters (`src/format/dates.ts`, `src/format/location.ts`, `src/format/meta.ts`) | abstraction | Pure functions for date ranges, location lines and the page title and description, tested on their own (FR-008 to FR-011, FR-036, FR-037) | Formatting inside components: every edge case would need a rendered page to test | N/A |
| Site check CLI (`tools/site-check/`) | abstraction | One command, one report, eleven parts, as the spec requires (FR-049, FR-058, R11) | Separate commands per tool: no single result or summary, and no guarantee every part runs | N/A |
| Expected fields (`tools/site-check/src/expected.ts`) | abstraction | Lists the shown fields from the CV document, so the no-script and offline parts don't use a hand list (FR-052) | A hand-written list: forbidden by FR-052 | N/A |
| Test helpers (`packages/web/test/helpers/site.ts`, `browser.ts`) | abstraction (tests only) | Build once per run; render a fixture CV with the real components, style sheet and fonts; open it in Chromium at a width (R21) | Building per test file: about 10 s each. Testing HTML strings only: no layout, fonts or computed styles | N/A |
| Check test helper (`tools/site-check/test/helpers/sites.ts`) | abstraction (tests only) | Runs the CLI as a process, locates committed fixture sites and builds temporary ones, reusing 001's `makeProject` | Repeating the process spawn and fixture setup in each of the check's thirteen test files | N/A |
| Site data field `repository` | data (002 site data) | The footer link's address, shared later by the shells' repository link (R7) | A constant in the page: it would be a second copy once the shells add their link | N/A |

No agent skill is added. `frontend-design` and `web-design-guidelines` (docs/skill-options.md) were
considered for the page and its review: the design is already approved, and the review is done by
the checks of this plan, so neither has a remaining use here.

## Project Structure

### Documentation (this feature)

```text
specs/004-cv-page/
├── spec.md              # Feature spec (approved)
├── checklists/
│   └── requirements.md  # Spec quality checklist
├── design/
│   ├── wireframes.md    # ASCII wireframes: /cv phone, desktop, print; not-found phone, desktop
│   ├── mockup/          # Penpot PNG exports: cv-desktop-1440, cv-phone-375, not-found-*
│   └── review.md        # Owner sign-off, revision 10, 2026-10-22 (Penpot link deferred, interim provision)
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R22
├── data-model.md        # Phase 1: inputs, derived values, token roles, fonts, build output, check results
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── page.md          # Structure, fields, dates, links, data-req targets, print
│   ├── site.md          # Build output, site manifest, HTTP behavior, service worker
│   ├── fonts.md         # Font files, fonts.json, generated @font-face
│   ├── cli.md           # npm run site-check: exit codes, report, summary
│   └── ci.md            # The site job, the test job change, the ruleset
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
package.json             # scripts build, serve, site-check; typecheck also runs the service worker project;
                         #   devDependencies vite, lightningcss, playwright, axe-core, lighthouse,
                         #   pdfjs-dist, @types/react, @types/react-dom
package-lock.json
tsconfig.json            # + "packages/**/*.tsx", "jsx": "react-jsx"; excludes packages/web/src/sw
vitest.config.ts         # + React's automatic JSX runtime for test files

.github/
├── workflows/
│   └── ci.yml           # + job site; job test installs Chromium (contracts/ci.md)
└── rulesets/
    └── main.json        # + required check site

packages/
├── content/
│   ├── site.json                    # + repository
│   ├── schemas/site.schema.json     # + repository (002's process)
│   └── src/shape.generated.ts       # regenerated by npm run content-shape
├── tokens/
│   ├── penpot/tokens.json           # replaced by the mockup's tokens, hand-written in Penpot's form (FR-043)
│   ├── src/tokens.generated.{css,ts} # regenerated by npm run token-output
│   └── test/
│       ├── tokens.test.ts           # starter-value assertions move to the fixture below
│       └── __fixtures__/starter/tokens.json # verbatim copy of 003's starter export
└── web/                             # @cv/web: the site (new)
    ├── package.json                 # private, type module; dependencies react, react-dom
    ├── vite.config.ts               # client and SSR builds, Lightning CSS with customMedia, fonts plugin
    ├── scripts/
    │   ├── build-site.ts            # npm run build: Vite builds, prerender, sw.js, site-manifest.json
    │   └── fonts-plugin.ts          # virtual:cv-fonts.css from fonts.json, checked against font tokens
    ├── src/
    │   ├── render.tsx               # SSR entry: renderCv, renderNotFound
    │   ├── routes.ts                # the route table (R3)
    │   ├── site-text.ts             # every non-CV word (FR-006)
    │   ├── supported.ts             # shown sections and fields (FR-002, FR-005)
    │   ├── format/
    │   │   ├── dates.ts             # FR-009 to FR-011
    │   │   ├── location.ts          # FR-008
    │   │   └── meta.ts              # FR-036, FR-037
    │   ├── pages/
    │   │   ├── Document.tsx         # html, head, title, metadata, assets
    │   │   ├── CvPage.tsx
    │   │   └── NotFoundPage.tsx
    │   ├── cv/                      # Intro, Section, Timeline, Entry, DateRange, Chips, Skills,
    │   │                            #   Languages, Interests, Arrow (svg), VisuallyHidden, SiteFooter
    │   ├── styles/
    │   │   ├── global.css           # imports @cv/tokens/tokens.css and virtual:cv-fonts.css; base
    │   │   ├── cv.css               # layout and components, tokens only
    │   │   └── print.css            # @media print (R9)
    │   ├── client/
    │   │   └── register-sw.ts       # the only script the pages load
    │   ├── sw/
    │   │   ├── service-worker.ts    # R4; types stripped at build
    │   │   └── tsconfig.json        # lib webworker, for npm run typecheck
    │   └── fonts/
    │       ├── README.md            # source, date and SHA-256 of each file
    │       ├── fonts.json
    │       ├── space-grotesk/       # OFL.txt + WOFF2 subsets
    │       ├── schibsted-grotesk/
    │       └── jetbrains-mono/
    └── test/
        ├── helpers/
        │   ├── site.ts              # build once per run; render a fixture CV; serve
        │   └── browser.ts           # Chromium with the isolation flags; open at a width
        ├── __fixtures__/            # fixture CVs: every-field, no-name, no-summary, empty-sections,
        │                            #   partial-dates, long-words, print-spacer, …
        ├── content.test.tsx  dates.test.ts  location.test.ts  links.test.tsx  site-text.test.ts
        ├── structure.test.tsx  server-html.test.ts  routes.test.ts  layout.test.ts
        ├── accessibility.test.ts  focus.test.ts  modes.test.ts  print.test.ts  sharing.test.tsx
        ├── offline.test.ts  design.test.ts  tokens.test.ts  fonts.test.ts  data-req.test.tsx
        └── one-edit.test.ts  self-check.test.ts

tools/
├── traceability/test/repo-settings.test.ts   # ruleset now includes site
├── content-check/test/repo-settings.test.ts  # ruleset now includes site
├── token-check/test/repo-settings.test.ts    # ruleset now includes site
├── token-check/test/self-check.test.ts       # only if a token name it changes is dropped
└── site-check/                               # new
    ├── src/
    │   ├── main.js          # entry point, plain JS: Node version gate, loads cli.ts
    │   ├── cli.ts           # arguments, exit codes, prints the report
    │   ├── check.ts         # one run: server, browser, every part → Report
    │   ├── server.ts        # serves dist/site by the site manifest (R3); also npm run serve
    │   ├── browser.ts       # Chromium launch with the isolation flags (R17)
    │   ├── expected.ts      # shown fields from the CV document (R14)
    │   ├── parts/
    │   │   ├── content.ts  accessibility.ts  lighthouse.ts  no-script.ts  offline.ts
    │   │   └── keyboard.ts  other-sites.ts  fonts.ts  layout.ts  print.ts  modes.ts
    │   └── report.ts        # ordering, problem lines, summary
    └── test/
        ├── helpers/sites.ts # runs the CLI; committed and temporary fixture sites
        ├── __fixtures__/    # small sites, each a dist/ with site-manifest.json; seeded/ + expected-report.txt
        ├── content.test.ts  accessibility.test.ts  lighthouse.test.ts  no-script.test.ts
        ├── offline.test.ts  keyboard.test.ts  other-sites.test.ts  fonts.test.ts  pages.test.ts
        ├── report.test.ts  cli.test.ts  repo-settings.test.ts  performance.test.ts
```

**Structure Decision**:

- `packages/web` is created here and becomes the third workspace. It holds site source only. Its
  build script is under `scripts/`, because `build/` is skipped by every check (R2).
- `/cv` is `packages/web/src/pages/CvPage.tsx`, rendered at build time to
  `packages/web/dist/site/cv.html`. That's the "cv route path" the plan template asks for.
- The token output path stays `packages/tokens/src/` (003). Font files live with the site, under
  `packages/web/src/fonts/`, because they're assets the site serves, not tokens.
- The site check lives in `tools/site-check/`, beside the other three. It reuses 001's ordering
  and Node version gate. The local server is part of it, and `npm run serve` runs it too, so the
  owner sees exactly what the checks see.
- `os-core`, the shells and the apps aren't created here.
- Replacing the token export (FR-043) breaks 003 tests that pin starter values (a shadow,
  `color.overlay`'s transparency, `breakpoint.wide` at 768). Those assertions move onto a
  committed copy of the 003 starter export at
  `packages/tokens/test/__fixtures__/starter/tokens.json`, keeping every 003 test title and ID.
  003 FR-006 says the tokens *start* with placeholders, and 003's Assumptions expect them to
  change completely with the `/cv` mockup, so 003's requirements stay covered without keeping
  unused tokens.

Conventions set here for later features:

- **Pages** are TSX components in `packages/web/src/pages/`, added to `routes.ts`. They're rendered
  at build time, and the site check covers them with no change (FR-056).
- **Site text** goes in `site-text.ts`. CV text only through `@cv/content`.
- **Styles** are plain CSS files read through `@cv/tokens`. Fonts only through font tokens, with
  files described in `fonts.json`.
- **Scripts** on a page are progressive: the page reads and works without them (FR-014). The
  only script today registers the service worker.
- **Every served file** is stored for offline use by the service worker automatically, because the
  precache list is the build output.
- **Browser tests** use Playwright as a library inside Vitest, with the isolation flags of R17.
- **Merging**: every pull request must pass `traceability`, `test`, `content`, `tokens` and `site`.

## Complexity Tracking

None. Every Constitution Check row is Pass or N/A, and no exception is needed. The missing
Penpot link and the hand-written token export are allowed by Constitution 1.2.0's interim
provision, not by an exception here. The provision's ending steps for this feature are listed in
research.md (R22).
