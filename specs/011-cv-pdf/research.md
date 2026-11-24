# Research: CV PDF Download

Every open point of the plan's Technical Context, settled. Each entry gives the decision, why, and
what else was weighed. R1 is the trial the spec's "How the PDF is made" asks for. R4 and R6 were
settled by local trials on 2026-11-24 with the repository's Playwright 1.64.1 (Chromium 156,
`Skia/PDF m156`).

## R1. The host trial: the build makes the PDF (FR-020), the committed PDF is dropped (FR-021)

- **Decision**: build FR-020. FR-021 is marked removed in the spec, with the trial as its reason.
- **Evidence**: throwaway branch `spike/vercel-chromium` (commits `482398f`, `bcada6e`, `ad7475c`),
  built as a Vercel preview on 2026-11-24:
  - Without system libraries, Chromium fails to launch on Vercel's build image (Amazon Linux 2023):
    `libnspr4.so` is missing.
  - With `dnf install -y -q nss nspr atk at-spi2-atk cups-libs libdrm libxkbcommon libXcomposite
    libXdamage libXfixes libXrandr mesa-libgbm pango cairo alsa-lib`, then
    `npx playwright install chromium`, Playwright's Chromium prints `/cv` to a 300 KB A4 PDF in
    about 1 s. Installing the libraries and downloading the browser add about 50 s to the deploy.
  - Playwright warns that the OS is not officially supported and falls back to its Ubuntu build.
    It ran correctly. The risk that a later image breaks it is covered by FR-020: the deploy then
    fails, and Vercel keeps serving the last good version (spec edge case).
- **Alternatives**: the committed PDF with a fingerprint check (FR-021) was the fallback only. It
  adds a manual step for every CV edit and a staleness check. The trial made it unnecessary.

## R2. Where the PDF is made: a build step between the pages and the service worker

- **Decision**: a new step in `packages/web/scripts/build-site.ts`, after every page is written
  (step 3) and before the service worker (step 4), in its own module
  `packages/web/scripts/cv-pdf.ts`:
  1. It serves the site written so far with the local server (`tools/site-check/src/server.ts`,
     which the build may import as it imports the traceability tool), from a provisional
     `siteManifest(siteDir)`. So Chromium loads `/cv` exactly as a visitor does: the built HTML
     at its route, the hashed style sheets, the fonts from `/assets/`.
  2. It launches Playwright's Chromium in a context with `serviceWorkers: 'block'`, because `sw.js`
     doesn't exist yet. It opens `/cv`, waits for `load` and `document.fonts.ready`, and prints the
     page (R3).
  3. It adds the author (R4), checks that the result is a non-empty PDF (`%PDF-` header), and writes
     `<siteDir>/cv.pdf`.
  4. Then `writeServiceWorker` lists `/cv.pdf` in the precache and hashes it into `VERSION`, and
     `siteManifest` lists it as a served file. So the PDF belongs to the same version as the page
     (FR-031) with no extra code.
- **Failures** (FR-020): each failure throws an `Error` whose message names its cause. The build's
  `main` already prints `site build failed: <message>` and exits 2. The messages:
  - `the CV PDF can't be made: Chromium didn't start (<Playwright's message>). Install it with
    npx playwright install chromium`
  - `the CV PDF can't be made: /cv answered <status>`
  - `the CV PDF can't be made: Chromium gave an empty file`

  The browser and the server are closed in a `finally` block.
- **Why here**: the PDF comes from the very `/cv` page built in the same run (FR-011). The page
  never needs a second build, and the worker's precache and version pick the PDF up for free.
- **Alternatives**:
  - A separate `npm run pdf` after the build. Rejected: it is a second step to forget, and the
    worker's version would not cover the PDF.
  - `page.setContent` with the HTML string. Rejected: relative asset paths and font loading
    differ from what a visitor gets.
  - Printing over `file://`. Rejected: the site's root-relative `/assets/` paths don't resolve
    there.

## R3. How the page is printed

- **Decision**: `page.pdf({ format: 'A4', margin: { top: '0.4in', right: '0.4in', bottom:
  '0.4in', left: '0.4in' }, printBackground: false, displayHeaderFooter: false,
  preferCSSPageSize: false, tagged: true, outline: true })`.
  - **A4** (FR-012): the spec's assumption. Printing from the browser keeps A4 and US Letter (004).
  - **Margin 0.4 in on every side** (FR-012): the default margin of Chromium's own print to PDF
    (the DevTools protocol's `Page.printToPDF` default). So the PDF is what a visitor gets from
    Chromium's print dialog with its default margins and with headers and footers off. Playwright's
    own default margin is 0, which FR-012 forbids. This is a renderer setting, not a design value,
    so it isn't a token. `print.css` stays without an `@page` rule: 004's test "the built style
    sheets have no @page rule" keeps holding, and the visitor's dialog keeps its choices.
  - **No header or footer** (FR-012): `displayHeaderFooter: false`, so Chromium adds no date,
    address, title or page number.
  - **Backgrounds off**: print.css already makes nothing depend on them (004 FR-035).
  - **`tagged: true`** (FR-015): Chromium writes a structure tree from the DOM. A local trial gave
    `/StructTreeRoot`, `/MarkInfo`, and roles `H1`, `H2`, `L`, `LI` and `Lbl` in DOM order, read
    back by PDF.js's `getStructTree()`.
  - **`outline: true`**: a bookmark per heading, so a reader can jump between sections. It costs
    nothing.
- **What Chromium sets on its own**, per the same trial: the PDF's `Title` from the page's
  `<title>` (FR-014: the owner's name and role, 004 FR-036), the catalog's `/Lang` from
  `<html lang="en">` (PDF.js reports `Language: "en"`), real text (FR-013), and a link annotation
  per `<a href>` with its address (FR-013).
- **Alternatives**: an `@page { size: A4; margin: … }` rule with `preferCSSPageSize`. Rejected: it
  would change what visitors get from the print dialog (004 leaves paper and margins to them),
  and it breaks 004's no-`@page` test.

## R4. The author: an incremental update of the PDF's Info dictionary

- **Decision**: Chromium writes no `Author`. The trial page had `<meta name="author">`, and the PDF
  still had none. So after printing, `cv-pdf.ts` appends a standard PDF incremental update:
  - a new Info object: the old Info dictionary's entries plus `/Author`, the CV document's
    `basics.name`, as a UTF-16BE hex string with a byte order mark, as Chromium writes its title;
  - a one-entry cross-reference section for that object;
  - a trailer with `/Size` + 1, the same `/Root`, the new `/Info` and `/Prev` set to the old
    `startxref`.

  Skia's output makes this safe. The trial showed a classic cross-reference table with no object
  or cross-reference streams and no XMP metadata stream, so readers take the author from the Info
  dictionary alone. When the CV document has no name, no Author is written (FR-014 has no author
  to give).
- **Why**: it is about 40 lines of standard PDF syntax, tested by reading the result back with
  PDF.js (`getMetadata().info.Author`), which the repository already has.
- **Alternatives**:
  - `pdf-lib`. Rejected: a new dependency for one field. It is community-maintained, and its last
    release was in 2021 (Constitution X prefers vendor-maintained tools).
  - Rewriting the Info object in place. Rejected: every later offset in the cross-reference table
    would have to shift, which is more code for no gain.
  - Leaving the author out. Rejected: FR-014 requires it.

## R5. Fonts and size

- **Decision**: Skia embeds a subset of every font a PDF uses. The three families (Space Grotesk,
  Schibsted Grotesk, JetBrains Mono) are under the SIL Open Font License 1.1, which allows
  embedding in documents. The OFL's conditions cover distributing the fonts themselves, and its
  FAQ states that documents embedding them are not affected. 004 R5 committed their licenses.
  - The checks confirm embedding per font through PDF.js: every font the PDF's pages use has its
    font file (`missingFile` is false), and its name is one of the three families (FR-016).
  - Size: the trial's PDF was about 300 KB, against FR-016's 1,000,000-byte cap. The cap is
    checked by the site check (FR-040), not by the build. A PDF over the cap fails CI on the pull
    request that grew it, before it is published.
- **Alternatives**: a size check in the build too. Rejected: the site check already runs on every
  pull request. A second gate for the same problem goes against Speed First's "cost matches
  risk".

## R6. Offline: a plain download link skips the service worker in Chromium

- **Finding** (local trial, 2026-11-24): on a page the worker controls, clicking
  `<a href="/cv.pdf" download="…">` never reaches the worker's `fetch` handler, in the headless
  shell or in full Chromium. The request goes straight to the network: the server saw it, and a
  worker answering every `/cv.pdf` request was bypassed. With the network gone, such a download
  fails. A plain `<a href="/cv.pdf">` without `download` does go through the worker, as a
  navigation (`mode: navigate`, `destination: document`).
- **Decision**: keep the plain link, so it works with scripting off (FR-002) and gives the file
  name (FR-003). Add a small progressive enhancement to the page's one script
  (`src/client/register-sw.ts`, through a new `src/client/download.ts`):
  - One `click` listener on the document handles a primary click with no modifier keys on an
    `a[download]` whose address is same-origin `http(s)`. It acts only when a service worker
    controls the page.
  - It prevents the default and fetches the address. The fetch goes through the worker (R7). It
    then saves the body through a temporary `<a download="<same name>" href="blob:…">`, and
    revokes the object URL afterwards.
  - If the fetch fails (offline with nothing stored), it falls back to the plain download of the
    original address. The browser then shows its own failed-download message, and `/cv` stays
    as it was (FR-032).
  - Without a controlling worker (first visit, storage blocked, scripting off), the link behaves
    as plain HTML.
- **Why**: it is the only way the stored PDF reaches a Chromium visitor offline (FR-031) while
  keeping the suggested name. Online, the result is the same file under the same name (FR-002:
  "behave the same with scripting on").
- **Alternatives**:
  - Drop the `download` attribute. Rejected: Chromium then opens its viewer, and saving from
    there names the file `cv.pdf`, which breaks FR-003.
  - Set `Content-Disposition` on the host. Rejected: the owner's name would be written in
    `vercel.json` (Constitution IV), and the download would still skip the worker.
  - Accept that the offline download fails in Chromium. Rejected: it breaks FR-031 and
    Constitution VI.

## R7. The service worker: stored files at fixed addresses are fetched network first

- **Decision**: two changes to `src/sw/service-worker.ts`:
  1. A request outside `/assets/` and the Playground's engine, for a precached file that isn't a
     page, is answered network first within the existing 3-second limit, then from this version's
     cache. Today that file is only `/cv.pdf`; `/404.html` is precached but already answered by
     the not-found rule.
     - Online after a new version is published, the PDF comes fresh (FR-030, US3 scenario 3).
       Cache-first would hand out the old one until the new worker took over.
     - Offline, it comes from the stored version (FR-031).
     - `/assets/` files keep cache-first: their names change with their content.
  2. `storedAnswer`, which answers navigations when the network fails, also answers a precached
     non-page file at its own path, before falling back to the not-found page. So opening
     `/cv.pdf` directly while offline gives the stored PDF, as the server would online.
- **Version**: `/cv.pdf` is in `PRECACHE` and hashed into `VERSION` (R2). The cache that answers
  is therefore always the version the page came from (FR-031, US3 scenario 2). Install is all or
  nothing (004 FR-039), so a version without its PDF is never stored.
- **Cost**: about 300 KB more on the worker's background install, once per version. The spec
  prefers precaching while the size allows, and FR-016 caps it.

## R8. Serving `/cv.pdf`

- **Decision**:
  - **Build**: `CONTENT_TYPES` gains `'.pdf': 'application/pdf'`, so the manifest and the local
    server give it its type (FR-010). The local server already sends `no-cache` for every file
    outside `/assets/` (FR-030), and serves only exact manifest paths, so `/cv.pdf/` and `/CV.pdf`
    are not found (004 FR-019).
  - **Host**: `vercel.json` gets `{ "src": "/cv\\.pdf", "headers": { "Cache-Control": "no-cache" },
    "continue": true }`, beside the `sw.js` route and before `{ "handle": "filesystem" }`. The
    filesystem handler serves the file with Vercel's type for `.pdf`, `application/pdf`. Every
    other path falls through to the 404 catch-all as before.
  - **Path**: one constant, `CV_PDF = { path: '/cv.pdf', file: 'cv.pdf' }` in `src/routes.ts`. The
    build, the page and the checks all read it.
- **Alternatives**: adding the PDF to the route table's `pages`. Rejected: pages are HTML, served
  by route, and stored under their route. The PDF is a plain served file.

## R9. The host's build: a Vercel-only script, and how SC-008 is measured

- **Decision**: `vercel.json`'s `buildCommand` runs a new script,
  `packages/web/scripts/vercel-build.sh` (`set -euo pipefail`):
  1. `git update-index --assume-unchanged vercel.json`, as today.
  2. `dnf install` of Chromium's libraries.
  3. `npx playwright install --only-shell chromium`.
  4. `npm run build`.

  Only the host runs it. Locally and in CI the browser is already installed (CI's `site` job runs
  `npx playwright install --with-deps chromium` before `npm run site-check`), so `npm run build`
  stays one command everywhere.
  - **Library list**: start from the trial's working list (R1). One implementation task trims it on
    a preview deploy, to `nss nspr` and whatever else launch proves it needs. The goal is less
    install time.
  - **`--only-shell`**: the headless shell is the binary `chromium.launch()` uses headless. It is
    a smaller download than full Chromium.
- **SC-008** ("making the PDF adds no more than 30 seconds to the site build") is measured on
  `npm run build` with Chromium installed: the print step itself. The trial measured about 1 s,
  and the step also starts the browser and serves the site, so a few seconds in all. The host's
  one-time provisioning per deploy (libraries and browser download, about 50 s in the trial,
  recorded in the spec's clarification when the owner approved it) is deploy setup, not the site
  build. No pull request waits on it, so Speed First's 10-minute budget is unaffected. The
  quickstart records both numbers.
- **Alternatives**:
  - Install the browser in `installCommand`. Rejected: no gain, and it hides the Vercel-only steps
    in two places.
  - Cache the browser between deploys. Rejected for now: `npm ci` empties `node_modules`, and
    Vercel's build cache doesn't promise other directories. Worth revisiting only if deploy time
    becomes a problem.

## R10. The suggested file name

- **Decision**: a pure function `downloadName(name: string | undefined): string` in
  `src/format/file-name.ts`. It returns `siteText.download.fallbackName` (`CV.pdf`) when the name
  is absent or nothing is left after cleaning. Otherwise it:
  1. normalizes to NFC;
  2. drops `/ \ : * ? " < > |` and control characters;
  3. splits on white space and drops empty words;
  4. joins the words with `-`;
  5. appends `siteText.download.suffix` (`-CV.pdf`).

  Accented letters are kept (spec edge case). `CvPage` calls it with `resume.basics?.name`, so the
  name is written only in the CV document (FR-003, Constitution IV).
- **Alternatives**: transliterating accents to ASCII. Rejected: the spec keeps them, and every
  current file system and browser handles them.

## R11. The link's place and markup

- **Decision**: as the approved mockup (`design/mockup/build.mjs`, commit `27606f2`) renders it:
  - **Markup**: `<div class="contact-row download" data-site-element="" data-req="…">`, as the
    last child of `.contact-block`, after the profiles. It holds
    `<span class="contact-label" aria-hidden="true">CV</span>` and
    `<a class="contact-link" href="/cv.pdf" download="Alex-Profir-CV.pdf">Download PDF<Arrow
    kind="down"/></a>`.
  - **Styles**: it reuses the contact rows' existing classes, so it adds no new CSS. `print.css`'s
    `[data-site-element] { display: none }` already leaves it out of print and so out of the PDF
    (FR-004).
  - **Arrow**: `Arrow` gains `down: 'M5 1v8M1.5 5.5 5 9l3.5-3.5'` (wireframes.md).
  - **Accessible name**: "Download PDF", the link's own text. The row label is hidden from
    assistive technology, as the profiles' network labels are.
- **Only on `/cv`** (FR-005):
  - `Intro` takes an optional `download?: { href: string; name: string }` prop.
  - `CvDocument` passes it through, and only `CvPage` gives it.
  - The OS shell's CV app (`apps/cv/CvApp.tsx`) renders `CvDocument` without it. The Terminal
    renders no `Intro`.
- **Intro with no contact rows**: the download row still renders. `.contact-block` is then
  rendered for the row alone. The link is on `/cv` whatever the CV document holds.
- **Alternatives**:
  - A button-styled link under the summary. Rejected: the owner approved the contact-row design.
  - Placing it outside `main`. Rejected in the spec's clarification: FR-006 amends 004 FR-025
    instead.

## R12. The checks

- **Decision**:
  - **New site-check part, `pdf`** (FR-040), in `tools/site-check/src/parts/pdf.ts`, run once on
    `/cv.pdf`:
    - **Headers**: `GET /cv.pdf` has `Content-Type: application/pdf` and `Cache-Control:
      no-cache`.
    - **Fields**: PDF.js text (reusing `pdfText` from `parts/print.ts`) holds every
      `expectedFields(resume)` text field in order, and every `href` field as a link annotation
      or printed address (FR-011, FR-013).
    - **No site elements**: no text of `/cv`'s `footer` and `[data-site-element]` elements is in
      the PDF, read from the served page as the print part does.
    - **Pages**: every page is A4 within half a point. No text item lies within the margin
      (FR-012). No page but the last ends on a heading, with the print part's rule, moved into a
      shared helper.
    - **Metadata**: `Title` equals the page's `<title>`, `Author` the CV document's
      `basics.name`, and `Language` `en` (FR-014).
    - **Structure**: the structure tree holds as many headings as `/cv` has `h1`, `h2` and `h3`
      in `main`, in the same order of levels (FR-015).
    - **Fonts and size**: every font is embedded and one of the design's families, and the file
      is at most 1,000,000 bytes (FR-016).

    Each failure is a `Problem` with a type such as `pdf-missing-field`, `pdf-site-element`,
    `pdf-not-a4`, `pdf-metadata`, `pdf-font-not-embedded` or `pdf-too-large`, and a detail naming
    the field, page, value or limit (004 FR-058).
  - **Offline part** (FR-041): after the existing one online visit to `/cv`, with the browser
    offline and the server dropping connections (R6 showed `setOffline` alone doesn't stop a
    download), click the link. Expect a download whose suggested name is `downloadName(name)` and
    whose bytes equal the built `cv.pdf`. Problem type `offline-pdf`.
  - **Keyboard, accessibility, Lighthouse** (FR-042): these parts already run on `/cv` at phone
    and desktop widths. With the link on the page, they cover it with no change.
- **Alternatives**: checking the PDF in the print part. Rejected: the print part prints the live
  page on two paper sizes, while this part reads the built file once. They share helpers, not a
  run.

## R13. Tests: what each one catches

Tests reference `011-cv-pdf-FR-###` in their `describe` names (Constitution III), as 004's do.
Unless noted, each is a test in an existing file, or a new file only where none fits. The bug
each one catches:

| Test | Catches |
|---|---|
| `structure.test.tsx`: the download row is the last contact row in the intro, inside `main`, the only site element there, with `href="/cv.pdf"`, the site-text label and `download="Alex-Profir-CV.pdf"` (FR-001, FR-002, FR-003, FR-006). Amends 004's FR-025 test, which counted no site element in `main` | The link misplaced, unnamed, or a second site element slipping into `main` |
| `structure.test.tsx`: `downloadName` keeps accents, drops `/\:` and joins words, and gives `CV.pdf` for no name or a name of rejected characters only (FR-003) | A hyphen-led or empty name, or rejected characters in a file name |
| `structure.test.tsx`: the OS shell's CV app shows no download link (FR-005) | The shared `CvDocument` leaking the link into the shell |
| new `pdf.test.ts`: the `pdf` part finds no problem on the real build (FR-004, FR-010 to FR-016) | Any regression in the real PDF, by the same rules CI applies |
| `pdf.test.ts`: the print step on a fixture CV gives a PDF with the fixture's highlight and not the real one (FR-011, US2 scenario 1) | A PDF printed from a stale page |
| `pdf.test.ts`: the print step fails, naming the cause, when Chromium can't start (browsers path pointed at an empty directory, in a child process) and when `/cv` doesn't answer 200 (FR-020) | A build that ships a missing or empty PDF |
| `offline.test.ts`: after one visit, offline, the link downloads the stored PDF, byte for byte, under its suggested name. After a new version is published, online, the link gives the new PDF (FR-030, FR-031) | The download skipping the worker (R6), or a cache-first worker handing out an old PDF |
| `offline.test.ts`: with no worker, offline, activating the link leaves `/cv` as it was (FR-032) | The enhancement breaking the page when nothing is stored |
| `tools/site-check/test/pdf.test.ts`: on a fixture site whose PDF is US Letter, holds the footer's text, lacks a field and has no author, the part reports each, by name (FR-040) | A check that passes everything |
| `tools/site-check/test/offline.test.ts`: on a fixture site whose worker doesn't precache `/cv.pdf`, the offline part reports `offline-pdf` (FR-041) | An offline check that can't fail |
| `accessibility.test.ts` and `focus.test.ts`: the existing `/cv` axe runs and tab order at both widths, with the link reached after the last profile with a visible focus ring (FR-042) | The link breaking keyboard order or WCAG |
| `routes.test.ts`: `vercel.json` serves `/cv.pdf` with `no-cache`, before the filesystem handler and the catch-all (FR-010, FR-030) | A route missing from the host's config, which no local check would see |

That is 12 tests touched or added, more than the usual five. The reason is Constitution III: each
of the spec's 19 live requirements needs a test that names it. The table groups requirements
where one test can honestly cover them. The `pdf` part's no-problem test carries seven
requirements alone.
