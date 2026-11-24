# Feature Specification: CV PDF Download

**Feature Branch**: `011-cv-pdf`

**Created**: 2026-11-24

**Status**: Draft

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> CV PDF download. Short name: cv-pdf.
>
> Why: recruiters still file CVs as files. 004 left "the PDF download (a later feature)" out of
> scope; this is that feature.
>
> What:
>
> 1. A "Download PDF" link on /cv, in the intro block: a plain `<a href="/cv.pdf"
>    download="Alex-Profir-CV.pdf">`, so it works without JavaScript. Its label lives in
>    site-text.ts. It is a site element, hidden in print, so the PDF never contains its own
>    download link.
> 2. /cv.pdf is generated during `npm run build`: the build opens the built /cv page in headless
>    Chromium (Playwright, already used in CI) and prints it to PDF with the existing print styles
>    (print.css), A4. The PDF's content therefore always matches /cv's print view. If Chromium
>    can't launch or render, the build fails (non-zero exit) rather than shipping /cv with a dead
>    link.
> 3. Fallback, chosen only if a spike on a Vercel preview deploy shows Vercel's build image can't
>    run Chromium: the PDF is committed, regenerated with `npm run pdf`, and CI fails when it no
>    longer matches its inputs (for example a fingerprint of resume.json and the print styles
>    stored in the PDF's metadata). The spike's result is recorded in research.md and decides
>    which of the two the plan builds.
> 4. vercel.json serves /cv.pdf (before the 404 catch-all) with Cache-Control: no-cache.
>
> Shells: /cv only this round. The OS shell's CV app and the Terminal are out of scope (no link,
> no command). Offline: state what the link does offline (the service worker either precaches
> /cv.pdf or the download fails visibly); prefer precaching if the size budget allows. Print: the
> link is hidden. UI feature: interim local mockup of the intro with the link, desktop and phone,
> for the design gate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A recruiter downloads the CV as a file (Priority: P1)

A recruiter reads `/cv` and wants the CV in their applicant tracking system or a shared folder.
In the intro block, next to the owner's contact details, they find a "Download PDF" link. One
click or tap saves the CV as a PDF named after the owner, such as `Alex-Profir-CV.pdf`. It works
with scripting turned off, because it is a plain link.

**Why this priority**: this is the feature's reason to exist. Until now the only way to get a
file was the browser's print dialog, which is several steps and poor on phones.

**Independent Test**: open `/cv` at a desktop width and at a phone width, with scripting on and
then off, activate the link with a pointer and with the keyboard, and confirm that a PDF named
after the owner is saved or opened, and that it holds the CV.

**Acceptance Scenarios**:

1. **Given** a visitor on `/cv`, **When** they look at the intro block, **Then** they see the
   download link, with its text from the site text, where the approved mockup places it.
2. **Given** the CV document names the owner "Alex Profir", **When** a visitor activates the link
   in a browser that honors a suggested file name, **Then** the file is saved as
   `Alex-Profir-CV.pdf`.
3. **Given** scripting is turned off, **When** a visitor activates the link, **Then** the PDF is
   downloaded exactly as with scripting on.
4. **Given** a keyboard user tabbing through `/cv`, **When** they reach the link, **Then** it is
   reached in reading order, with a visible focus indicator, and Enter starts the download.
5. **Given** a visitor in the OS shell's CV app or the Terminal, **When** they read the CV there,
   **Then** no download link or command is offered (out of scope this round).

---

### User Story 2 - The PDF always matches the page (Priority: P2)

The owner edits a CV fact and publishes. The PDF published with that version is the same CV
`/cv` prints: same text, same order, same link addresses, A4, with no site elements, so it never
contains its own download link and never lags behind the page.

**Why this priority**: a stale or different PDF is worse than none (the design's anti-goal "a PDF
that drifts from the page"). It needs Story 1's link to be useful, but it is what makes the file
trustworthy.

**Independent Test**: change one CV fact, build the site, and confirm that the new fact is in the
PDF, that the PDF holds every shown field of the CV document in the page's order, and that it
holds neither the link's text nor any other site element's text.

**Acceptance Scenarios**:

1. **Given** the owner changes a work highlight in the CV document, **When** the site is built,
   **Then** the PDF built with it shows the new highlight and not the old one.
2. **Given** a built site, **When** the checks read the PDF, **Then** every shown field of the CV
   document is in it, in the page's order, and the text of the download link and the footer is
   not.
3. **Given** the PDF, **When** a reader opens it, **Then** it has A4 pages with a margin on every
   side, no text cut off at an edge, no section or entry heading as the last line of a page, and
   no header, footer, date, address or page number added by the browser.
4. **Given** the PDF, **When** a reader selects, searches or copies its text, or an applicant
   tracking system parses it, **Then** the text is real text in reading order, and each link in it
   opens its address.
5. **Given** the PDF can't be produced during the build, for example because the renderer can't
   start or the page fails to render, **When** the build runs, **Then** it fails with a message
   naming the cause, and no site is published from it.

---

### User Story 3 - The link works offline after one visit (Priority: P3)

A recruiter opened `/cv` once on a good connection. Later, offline, they open `/cv` from the
browser's history and activate the link. The PDF downloads, matching the page they see.

**Why this priority**: Constitution VI says anything that can work offline must. The PDF is a
static file of the same version as the page, so it can be stored with it. It depends on Stories 1
and 2.

**Independent Test**: visit `/cv` once online, turn the network off, open `/cv`, activate the
link, and confirm that the PDF downloads and matches the stored page's version.

**Acceptance Scenarios**:

1. **Given** one complete online visit to `/cv` or the site root, **When** the visitor is offline
   and activates the link, **Then** the PDF downloads from the stored copy.
2. **Given** a stored copy of an older version, **When** the visitor is offline, **Then** the PDF
   they get is the one built with that stored page, never one from another version.
3. **Given** a visitor online after a new version is published, **When** they activate the link,
   **Then** they get the new version's PDF.
4. **Given** offline storage is unavailable, or the visitor has never visited online, **When**
   they activate the link offline, **Then** the browser shows its own failed-download or offline
   message, and `/cv` itself stays as it was, never blank or broken.

---

### Edge Cases

- **No name in the CV document**: the suggested file name is the site text's fallback,
  `CV.pdf`, never a hyphen-led or empty name.
- **A name with accents, several words or characters file systems reject**: words are joined by
  hyphens, accented letters are kept, and characters that file names can't hold (such as `/`, `\`,
  `:`) are dropped.
- **A browser that ignores the suggested file name or opens PDFs in a viewer**, as some phone
  browsers do: the PDF opens in the browser's viewer, from where the visitor can save or share it.
  This is acceptable; the link still delivers the CV.
- **Opening `/cv.pdf` directly**: the browser shows or saves the PDF as it chooses. Only the exact
  path `/cv.pdf` serves it; any other path, such as `/cv.pdf/` or `/CV.pdf`, follows the
  not-found rule (004 FR-019).
- **Printing `/cv`**: the link is left out, like every site element (004 FR-032).
- **Narrow widths, 200% text, forced colors**: the link wraps and stays readable and usable, as
  every element of `/cv` must (004 FR-020, FR-021, FR-030).
- **The build environment can't run the renderer**: the build fails and the host keeps serving the
  last published version, with its PDF. `/cv` is never published with a dead link.
- **The PDF grows past its size limit** (FR-016), for example after a font change: the build
  check fails and names the size and the limit.
- **A CV edit merged without regenerating the PDF** (fallback path only, FR-021): CI fails and
  names the command that regenerates it.

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `011-cv-pdf-FR-###`. UI implementing a requirement carries
`data-req="011-cv-pdf-FR-###"` (Constitution III).

### Functional Requirements

**The link**

- **FR-001**: `/cv` MUST show a download link in its intro block, placed as the approved mockup
  places it. The link's text MUST come from the site text and name the action and the format
  ("Download PDF"), so its purpose is clear from its own text (004 FR-013).
- **FR-002**: The link MUST be a plain link to the site's PDF of the CV that downloads it with
  scripting turned off, and MUST behave the same with scripting on.
- **FR-003**: The link MUST suggest a file name built from the owner's name in the CV document:
  its words joined by hyphens, followed by a suffix from the site text, giving
  `Alex-Profir-CV.pdf` for "Alex Profir". Characters a file name can't hold MUST be dropped. With
  no name in the CV document, the suggested name MUST be the site text's fallback, `CV.pdf`. No
  part of the owner's name is written anywhere but the CV document (Constitution IV).
- **FR-004**: The link is a site element. It MUST be left out of print, and so out of the PDF.
- **FR-005**: The link MUST appear on `/cv` only. The OS shell's CV app (005) and the Terminal
  (006) MUST show no link and offer no command for the PDF.
- **FR-006**: The download link MUST sit in the intro block, inside the page's main landmark, and
  MUST be the only site element there. This amends 004-cv-page: FR-025 said site elements sit
  outside the main landmark; it becomes "site elements sit outside the main landmark, except the
  download link (011-cv-pdf-FR-001), which sits in the intro block". 004's **Site element** entity
  is amended the same way, and its out-of-scope line for the PDF download names this feature.
  Approved with this spec. [NEEDS CLARIFICATION: The intro block is inside the main landmark, where
  004 FR-025 allows no site elements. Amend 004 FR-025 as written here (the link in the intro, as
  asked), or keep FR-025 and place the link just outside the main landmark, above or below the
  CV?]

**The PDF**

- **FR-010**: The site MUST serve the CV as a PDF at `/cv.pdf`, with a PDF content type.
- **FR-011**: The PDF MUST be the print view of the `/cv` page built in the same build: the same
  text in the same order, every link's address shown as print shows it (004 FR-033), and no site
  element. It MUST hold every shown field of the CV document that `/cv` shows.
- **FR-012**: The PDF MUST be on A4 pages, with a margin on every side, no text cut off at a page
  edge and no section or entry heading as the last line of a page (004 FR-032, FR-034). It MUST
  carry no header, footer, date, address or page number of its own or of the renderer's.
- **FR-013**: The PDF's text MUST be real text, selectable, searchable and extractable in reading
  order, and each link in it MUST open its address.
- **FR-014**: The PDF MUST carry the page's title (the owner's name and role, 004 FR-036) as its
  document title, the owner's name as its author, and English as its language.
- **FR-015**: The PDF MUST expose its structure to assistive technology: its headings, lists and
  reading order, matching the page's.
- **FR-016**: The PDF MUST use the design's fonts, embedded, so it looks the same on any reader's
  machine, and MUST be no larger than 1,000,000 bytes, so storing it for offline use costs little.

**How the PDF is made**

Which of FR-020 and FR-021 is built is decided before the plan, by a trial build on the host's
preview deploys that shows whether the host's build environment can produce the PDF. The result
and its evidence are recorded in the feature's research. FR-020 is built when the trial succeeds,
FR-021 when it fails; the other is then marked removed, with the trial as its reason.

- **FR-020**: The PDF MUST be produced as part of the site build, from the built `/cv` page, with
  no separate step for the owner. When it can't be produced (the renderer can't start, the page
  fails to render, or the result is missing or empty), the build MUST fail with a message naming
  the cause, so a site with a dead link is never published.
- **FR-021**: Fallback, built only if the trial fails: the PDF MUST be kept in the repository and
  regenerated with one command. The PDF MUST record a fingerprint of every input that changes its
  content or look: the CV document, the site text, and the styles and fonts the print view uses.
  The checks on every pull request MUST fail when the recorded fingerprint differs from the
  current inputs', naming the command that regenerates it.

**Serving and offline**

- **FR-030**: `/cv.pdf` MUST be served so that every online request checks for a newer version,
  as `/cv` is, so the first download after a new version is published is the new PDF. Unknown
  paths MUST still answer as not found (004 FR-019).
- **FR-031**: The PDF MUST be stored with the rest of the site after one complete online visit to
  `/cv` or the site root, as part of the same complete version as the page (004 FR-039). Offline,
  the link MUST download the PDF of the stored page's version.
- **FR-032**: When the PDF isn't stored (offline storage unavailable, or no complete online visit
  yet), activating the link offline MUST leave `/cv` as it was; the browser's own failed-download
  or offline message is shown.

**The checks**

- **FR-040**: The checks on the built site (004 FR-048) MUST also confirm that `/cv.pdf` is served
  with a PDF content type and the caching of FR-030; that the PDF holds every shown field of the
  CV document in the page's order, read from the CV document and not from a hand-written list;
  that it holds no site element's text; that its pages are A4; that its title, author and language
  are those of FR-014; and that it is within FR-016's size. Each failure MUST name what failed,
  as 004 FR-058 asks.
- **FR-041**: The offline check (004 FR-053) MUST also, after one online visit, turn the network
  off, activate the link on `/cv` and confirm that the PDF of the stored version is delivered.
- **FR-042**: The keyboard, accessibility and Lighthouse checks of `/cv` (004 FR-050, FR-051,
  FR-054) MUST pass with the link present, at phone and desktop widths.

### Key Entities

- **CV PDF**: the CV as a file, A4, built from `/cv`'s print view in the same build as the page.
  It has a title, an author and a language, and is stored for offline use with the page's
  version.
- **Download link**: the one site element inside the intro block. It holds a site-text label and
  a suggested file name made from the owner's name and a site-text suffix.
- **Site text** (004): gains the link's label, the file name suffix and the fallback file name.
- **Fingerprint** (fallback path only): a short record, stored in the PDF, of the inputs the PDF
  was made from, compared with the current inputs to detect a stale PDF.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | No: the link is on `/cv` only this round | The CV app shows the CV with no download link (FR-005). `/cv` itself, with its link, works at desktop widths in any browser. |
| Mobile (iOS-style) | No: the link is on `/cv` only this round | The CV app shows the CV with no download link (FR-005). `/cv` itself, with its link, works at phone widths in any browser. |

The Terminal (006) offers no command for the PDF this round.

**CV path**: Unchanged. The CV stays one click (desktop) or one tap (mobile) from first load, and
`/cv` remains a plain server-rendered page. The link adds no step in front of the CV.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after one complete online visit.
- **Available offline**: `/cv` as before (004 FR-059), and the PDF through its link, from the
  same stored version as the page (FR-031).
- **Needs the network**: the first visit, which has to fetch the site before it can be stored.
- **Offline state shown**: none is needed when the PDF is stored. When it isn't (offline storage
  unavailable, or no complete visit yet), the browser's own failed-download or offline message
  appears and `/cv` stays as it was (FR-032).

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/011-cv-pdf/design/`:

- [ ] ASCII wireframe of `/cv`'s intro block with the download link, at phone and desktop widths
  (print is unchanged: 004's print wireframe holds, as the link is left out)
- [ ] PNG exports of the interim local mockup of the intro block with the link, at phone and
  desktop widths, under the constitution's interim provision
- [ ] Penpot file link: not needed for an interim local mockup until the provision ends
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date

The OS shells get no design work: they show no link (FR-005).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From `/cv`, a visitor gets the CV as a file in one click or one tap, at phone and
  desktop widths, with scripting on or off.
- **SC-002**: In every published version, the PDF holds 100% of the CV fields `/cv` shows, in
  the same order, and none of the site elements' text.
- **SC-003**: No version of the site is ever published with `/cv` linking to a missing or
  outdated PDF.
- **SC-004**: After one online visit, the link delivers the PDF offline in 100% of offline check
  runs.
- **SC-005**: Copying all text out of the PDF yields every shown CV field, so a recruiter's
  system can read it without retyping.
- **SC-006**: The PDF is at most 1,000,000 bytes.
- **SC-007**: `/cv` keeps a Lighthouse score of 90 or more in every category on both profiles and
  no automated WCAG 2.2 Level AA violation, with the link added.
- **SC-008**: Making the PDF adds no more than 30 seconds to the site build.

## Assumptions

- 010-cv-pitch ships first. The PDF shows whatever `/cv`'s print view shows, so it includes the
  pitch and personal projects once 010 has merged; this feature needs no change for that.
- The PDF is A4 only; the owner is EU-based, and US readers print A4 PDFs fine with scaling.
  Printing `/cv` from the browser keeps its A4 and US Letter support (004).
- The renderer the site's checks already use in CI is the one the build uses; whether the host's
  build environment can run it is what the trial (before FR-020) settles.
- The site's fonts are under licenses that allow embedding them in a document (the licenses 004
  FR-045 chose allow serving and publishing them, which embedding a subset in the PDF falls
  under). The plan confirms this per font.
- There is no existing size limit for what the site stores offline; the only size budget today
  is the OS script's. FR-016's 1,000,000-byte cap is this spec's own, chosen so precaching the
  PDF stays cheap; a CV PDF with embedded font subsets is typically well under it.
- A direct visit to `/cv.pdf` opens or saves the PDF as the browser chooses; the server does not
  force a download, so the browser's viewer remains an option.
- The browser's headers and footers, which 004 leaves to the visitor's print dialog, are left out
  of the generated PDF, as there is no dialog for the visitor to choose them in.
- Adding the link changes the layout of an existing screen (the intro block), so the design gate
  applies (Constitution II).
