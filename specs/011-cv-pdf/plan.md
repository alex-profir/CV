# Implementation Plan: CV PDF Download

**Branch**: `011-cv-pdf` | **Date**: 2026-11-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-cv-pdf/spec.md`

**Design**: [design/review.md](./design/review.md): an interim local mockup, approved by the
owner on 2026-11-24 at commit `27606f2`.

## Summary

`/cv` gets a "Download PDF" row as the last row of the intro's contact block. It is a plain
`<a href="/cv.pdf" download="Alex-Profir-CV.pdf">`, a site element, hidden in print.

`npm run build` gains a step between writing the pages and writing the service worker. It serves
the freshly built site with the existing local server, prints `/cv` in Playwright's Chromium to
an A4, tagged PDF with 0.4 in margins, and adds the author. When it can't, the build fails,
naming the cause. Because the PDF is written before the worker, it lands in the worker's precache
and version for free.

The host trial settled FR-020 against FR-021 (research R1). Vercel's build image runs Chromium
once the libraries are installed with `dnf`. So the PDF is built on every deploy, and the
committed-PDF fallback is removed.

A local trial found that Chromium sends `<a download>` straight to the network, bypassing the
service worker (R6). Offline delivery (FR-031) therefore needs two changes:

- **The page**: its one script gains a small enhancement. When a worker controls the page, it
  fetches the PDF through the worker and saves it under the same name.
- **The worker**: it answers the PDF network first, falling back to the stored copy of the same
  version (R7).

`vercel.json` serves `/cv.pdf` with `no-cache`. The site check gains a `pdf` part and an offline
download step. 004's FR-025 is amended so the download link may sit inside `main` (FR-006).

## Technical Context

**Language/Version**: TypeScript with erasable syntax on Node.js 26, and TSX for components, as
004 to 009 use. The service worker is TypeScript, its types stripped at build. One Bash script
for the host build.

**Primary Dependencies**: no new ones. Already in the repository:
- `playwright` 1.64.1 (dev): the build's renderer, and the checks' browser.
- `pdfjs-dist` 6.4.299 (dev): reads the PDF in the checks and tests.
- React 19, Vite 8: the pages and the build, as before.

**Storage**: files only:
- `packages/web/dist/site/cv.pdf`, made by every build and never committed.
- The service worker's `cv-<version>` cache in the visitor's browser.

**Testing**: Vitest 5 with Playwright's Chromium (the slow project, which builds the site once
per run) and the site check (`npm run site-check`, run by CI's `site` job on every pull request).

**Target Platform**:
- **Visitors**: evergreen browsers at phone and desktop widths, with scripting on or off.
- **Build**: the owner's macOS, GitHub's `ubuntu-latest` and Vercel's Amazon Linux 2023 build
  image.

**Project Type**: a static web site with a build script (`packages/web`) and check tools
(`tools/site-check`).

**Shells**: none. The link is on `/cv` only. Both OS shells' CV app and the Terminal show no link
and no command (spec Shell Scope, FR-005).

**Offline Approach**:
- `/cv.pdf` is precached with the rest of the version, and its hash is part of `VERSION`.
- The worker answers it network first within 3 s, then from the stored copy (R7).
- The page's script routes `a[download]` clicks through the worker, which Chromium otherwise skips
  (R6).
- With nothing stored, the plain download fails in the browser's own way, and `/cv` is untouched
  (FR-032).

**Performance Goals**:
- **SC-008**: the PDF step adds ≤ 30 s to `npm run build`; it is expected to add a few seconds.
- **Vercel**: the libraries and browser download add about 50 s per deploy. That is deploy setup
  outside SC-008 (R9).
- **Lighthouse**: `/cv` stays ≥ 90 in every category (SC-007). The enhancement adds well under
  1 KB of script to the existing registration script, run after load.

**Constraints**:
- The PDF is ≤ 1,000,000 bytes (FR-016). The trial gave about 300 KB.
- No literal design values: the 0.4 in margin is Chromium's own print default, a renderer
  setting (R3).
- No owner's name outside the CV document (FR-003).
- `print.css` keeps no `@page` rule (004).

**Scale/Scope**:
- **New files**: one page row, one script enhancement, one build step, one host script, one check
  part.
- **Changed files**: the worker, `vercel.json` and one amendment to 004's spec.
- **Tests**: about 12 touched or added (research R13).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Checked before research and again after Phase 1 design. Both passes are the same.

| # | Principle | Check | Status | Evidence |
|---|-----------|-------|--------|----------|
| I | Spec First | spec.md `Status: Approved`; this plan holds the "how", the spec holds none | Pass | Spec approved 2026-11-24. The trial's outcome is applied as the spec prescribes: FR-021 is marked removed. Libraries, paths and APIs appear only here, in research.md and in contracts/ |
| II | Design Gate | design/ has wireframe, PNGs, Penpot link, signed review.md; or an interim local mockup with PNGs and signed review.md; or spec says "No UI" | Pass | `design/wireframes.md`. Desktop (1440) and phone (375, 320) PNGs of the interim local mockup. `review.md` approved at `27606f2` on 2026-11-24. The markup in contracts/page.md is the mockup's |
| III | Traceable Requirements | Every FR has a planned test and, if UI, a `data-req` target (see Requirement Traceability) | Pass | All 20 live FRs are mapped below. FR-021 is removed. The row carries `data-req` for FR-001 to FR-004 and FR-006 |
| IV | One Source of Truth | CV data read only from `packages/content`; styles use tokens only, from Penpot (or a hand-written export, under the interim provision) or the motion token source | Pass | The file name and the PDF's author come from `resume.basics.name` at build time. The labels are in `site-text.ts`. No new CSS: the row reuses the contact rows' token-based rules. The PDF's margin is a renderer default, not a style (R3). The site check's `pdf` part reads the design's font families from `fonts.json`, as the `fonts` part does, so a font change stays one edit |
| V | Shared Core, Per-Shell Scope | Apps declare shells; shared logic in `os-core`; matches spec Shell Scope | Pass | No app or shell changes. The CV app keeps rendering `CvDocument` without the `download` prop, so FR-005 holds by construction and is tested |
| VI | Offline by Default | Offline Approach delivers everything the spec lists as offline | Pass | The PDF is precached in the page's version and delivered offline through the worker (R6, R7). It is tested by `offline.test.ts` and the site check's offline step |
| VII | Recruiter First | No added steps before the CV; `/cv` stays server-rendered | Pass | The row is server-rendered HTML that works without scripting. The script only enhances an existing link, after load. Nothing comes before the CV |
| VIII | Accessible and Fast | WCAG 2.2 AA, desktop keyboard operation, reduced motion, Lighthouse 90+ planned and verifiable | Pass | The link has its own accessible name, sits in reading order, and shows the focus ring. axe, keyboard and Lighthouse parts run on `/cv` with it (FR-042). The PDF is tagged with a title and language (FR-014, FR-015). No motion is added |
| IX | Original Design | No Apple icons, fonts, wallpapers or other Apple assets | Pass | The ↓ arrow is drawn in the site's own arrow set. The fonts are the site's OFL families |
| X | Simple and Vetted | Every new dependency, skill and abstraction listed below with a reason | Pass | No new dependency. Two small abstractions, each with a reason below |
| XI | Features and Amendments in Pull Requests | A new feature ships in one PR, with any amendment of an older spec it makes, recorded in that spec and linked; any other amendment in one or more PRs of its own, each carrying its part of the spec amendment with its tests and design; each PR links spec.md and tasks.md | Pass | One PR, `011-cv-pdf`. It carries the 004 amendment (FR-006), recorded in 004's spec: an `**Amended**: 2026-11-24 by 011-cv-pdf` line under its Status, approved with 011's spec, as 005 and 008 recorded theirs; a clarification line naming 011, FR-025 and the Site element entity `Amended 2026-11-24 (011-cv-pdf)`, and the out-of-scope line updated. It also carries 004's amended structure test, and marks 004's T023 `Superseded in part 2026-11-24, naming 011-cv-pdf (its T006)` in 004's `tasks.md`. The PR links 011's and 004's `spec.md` and 011's `tasks.md` |

## Requirement Traceability

The test files are in `packages/web/test/` unless they start with `tools/`. Research R13 says
what bug each test catches.

| Requirement | Test(s) | UI target (`data-req`) |
|-------------|---------|------------------------|
| 011-cv-pdf-FR-001 | `structure.test.tsx`: the download row is the intro's last contact row, with the site-text label and link text | `div.contact-row.download` |
| 011-cv-pdf-FR-002 | `structure.test.tsx`: a plain `a[href="/cv.pdf"][download]` in the server HTML. `offline.test.ts`: online with the worker, the click saves the same bytes under the same name | `div.contact-row.download` |
| 011-cv-pdf-FR-003 | `structure.test.tsx`: `download="Alex-Profir-CV.pdf"` on the real CV; `downloadName` keeps accents, drops rejected characters, falls back to `CV.pdf` | `div.contact-row.download` |
| 011-cv-pdf-FR-004 | `pdf.test.ts`: the `pdf` part finds no site element's text in the built PDF | `div.contact-row.download` |
| 011-cv-pdf-FR-005 | `structure.test.tsx`: the OS shell's CV app renders no `a[href="/cv.pdf"]` | Non-UI (absence) |
| 011-cv-pdf-FR-006 | `structure.test.tsx`: the row is inside `main`, the only `[data-site-element]` there; the footer is outside (amends 004 FR-025's test) | `div.contact-row.download` |
| 011-cv-pdf-FR-010 | `pdf.test.ts`: `/cv.pdf` is served `application/pdf` (the `pdf` part's header check). `routes.test.ts`: `vercel.json` routes `/cv.pdf` before the catch-all | Non-UI |
| 011-cv-pdf-FR-011 | `pdf.test.ts`: the `pdf` part finds every expected field in order on the real build; a fixture CV's new highlight is in its printed PDF | Non-UI |
| 011-cv-pdf-FR-012 | `pdf.test.ts`: the `pdf` part finds A4 pages, text inside the margins and no heading at a page end | Non-UI |
| 011-cv-pdf-FR-013 | `pdf.test.ts`: the `pdf` part finds the text in order and a link annotation for every address | Non-UI |
| 011-cv-pdf-FR-014 | `pdf.test.ts`: the `pdf` part finds Title, Author and Language as expected | Non-UI |
| 011-cv-pdf-FR-015 | `pdf.test.ts`: the `pdf` part finds a structure tree with `/cv`'s headings | Non-UI |
| 011-cv-pdf-FR-016 | `pdf.test.ts`: the `pdf` part finds every font embedded and from the design, and the size ≤ 1,000,000 | Non-UI |
| 011-cv-pdf-FR-020 | `pdf.test.ts`: `writeCvPdf` fails naming the cause when Chromium can't start and when `/cv` isn't 200 | Non-UI |
| ~~011-cv-pdf-FR-021~~ | Removed 2026-11-24 (research R1) | – |
| 011-cv-pdf-FR-030 | `offline.test.ts`: online after a new version is served, the link gives the new PDF. `routes.test.ts`: `no-cache` on the host route | Non-UI |
| 011-cv-pdf-FR-031 | `offline.test.ts`: after one visit, offline, the link saves the stored PDF byte for byte | Non-UI |
| 011-cv-pdf-FR-032 | `offline.test.ts`: with no worker, offline, the link leaves `/cv` as it was | Non-UI |
| 011-cv-pdf-FR-040 | `tools/site-check/test/pdf.test.ts`: on a defective fixture PDF the part reports each failure by type | Non-UI |
| 011-cv-pdf-FR-041 | `tools/site-check/test/offline.test.ts`: a fixture site that doesn't precache `/cv.pdf` gets `offline-pdf` | Non-UI |
| 011-cv-pdf-FR-042 | `accessibility.test.ts`: axe on `/cv` at 375 and 1440 px with the link. `focus.test.ts`: Tab reaches the link after the last profile, with a visible focus ring | `div.contact-row.download` |

## Dependencies, Skills & Abstractions

No new dependency or agent skill. `playwright` and `pdfjs-dist` are already dev dependencies.
Vercel installs dev dependencies, as the build already needs Vite.

| Item | Kind | Reason | Simpler alternative rejected because | Vendor-maintained |
|------|------|--------|--------------------------------------|-------------------|
| `writeCvPdf` (`packages/web/scripts/cv-pdf.ts`) with its incremental Info update | abstraction | Prints `/cv` in the build (FR-020). Chromium writes no Author, so it appends one (FR-014, R4) | `pdf-lib` for the author: a dependency for one field, community-maintained, last released 2021. A separate `npm run pdf`: a step to forget, outside the worker's version | n/a (own code) |
| Download click enhancement (`packages/web/src/client/download.ts`) | abstraction | Chromium sends `a[download]` past the service worker, so offline the stored PDF can't be reached otherwise (FR-031, R6) | Dropping `download`: loses the file name (FR-003). `Content-Disposition`: puts the owner's name in host config and still skips the worker | n/a (own code) |
| `packages/web/scripts/vercel-build.sh` | abstraction (script) | Vercel's image lacks Chromium's libraries and browser. The script keeps the host-only steps in one readable place (R9) | A single `buildCommand` string: four chained commands in JSON, hard to read and review | n/a (own code) |

## Project Structure

### Documentation (this feature)

```text
specs/011-cv-pdf/
├── spec.md              # Approved; FR-021 marked removed after the trial
├── design/
│   ├── wireframes.md
│   ├── mockup/          # Interim local mockup: build.mjs, HTML, PNG exports
│   └── review.md        # Owner sign-off, 27606f2, 2026-11-24
├── checklists/requirements.md
├── plan.md              # This file
├── research.md          # R1 to R13
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── page.md          # The download row and the click enhancement
│   ├── pdf.md           # The build step, its failures, the PDF, the host build
│   └── site.md          # Serving, the service worker, the site check's `pdf` part
└── tasks.md             # /speckit-tasks, not created here
```

### Source Code (repository root)

```text
packages/
├── content/                         # Unchanged: resume.json's basics.name feeds the file name and author
└── web/
    ├── scripts/
    │   ├── build-site.ts            # + step: writeCvPdf between pages and sw.js; '.pdf' content type
    │   ├── cv-pdf.ts                # NEW: print /cv to cv.pdf, add Author, name failures (FR-014, FR-020)
    │   └── vercel-build.sh          # NEW: dnf libraries, headless shell, npm run build (host only)
    ├── src/
    │   ├── routes.ts                # + CV_PDF { path: '/cv.pdf', file: 'cv.pdf' }
    │   ├── site-text.ts             # + download { rowLabel, link, suffix, fallbackName }
    │   ├── format/file-name.ts      # NEW: downloadName(name)
    │   ├── cv/Arrow.tsx             # + 'down' arrow
    │   ├── cv/Intro.tsx             # + optional download row, last in .contact-block
    │   ├── cv/CvDocument.tsx        # passes `download` through to Intro
    │   ├── pages/CvPage.tsx         # gives `download` (only /cv)
    │   ├── client/download.ts       # NEW: a[download] through the worker when it controls the page
    │   ├── client/register-sw.ts    # imports download.ts
    │   └── sw/service-worker.ts     # network-first for stored non-page files; navigations answer them offline
    └── test/
        ├── structure.test.tsx       # FR-001–006 (amends 004 FR-025's site-element test)
        ├── pdf.test.ts              # NEW: FR-004, FR-010–016, FR-020
        ├── offline.test.ts          # FR-002, FR-030–032
        ├── routes.test.ts           # vercel.json route (FR-010, FR-030)
        ├── accessibility.test.ts    # FR-042
        └── focus.test.ts            # FR-042

tools/site-check/
├── src/
│   ├── report.ts                    # + 'pdf' in PARTS
│   ├── check.ts                     # runs the pdf part
│   └── parts/
│       ├── pdf.ts                   # NEW: the pdf part (FR-040)
│       ├── print.ts                 # shares pdfText and the heading-at-page-end rule
│       └── offline.ts               # + the offline download step (FR-041)
└── test/
    ├── pdf.test.ts                  # NEW: FR-040, on defective fixtures
    └── offline.test.ts              # FR-041

vercel.json                          # + /cv.pdf no-cache route; buildCommand → vercel-build.sh
specs/004-cv-page/spec.md            # FR-025, Site element entity and out-of-scope line amended (FR-006)
```

**Structure Decision**: everything lives in the existing workspaces that 004 established:
`packages/web` for the page, build and worker, and `tools/site-check` for the checks. No new
package. The OS shells (`src/os`, `src/apps`) are untouched (FR-005).

## Complexity Tracking

No Constitution Check violations. Nothing to justify.

## Notes for the owner

- **SC-008 reading** (research R9): SC-008 is measured on `npm run build` with the browser
  installed, a few seconds. The about 50 s that Vercel spends per deploy installing libraries and
  the browser is counted as deploy setup. The spec's clarification recorded that cost when the
  spec was approved. Say so if SC-008 was meant to cover it: then the plan would need a cached
  browser on Vercel, which R9 found no promised place for.
- **Offline needs a script** (research R6): Chromium skips the service worker for `a[download]`.
  So offline delivery relies on a small click enhancement. With scripting off, the link still
  works online, and offline with scripting off there is no service worker at all, as on every
  page.
