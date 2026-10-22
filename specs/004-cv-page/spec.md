# Feature Specification: The /cv Page

**Feature Branch**: `004-cv-page`

**Created**: 2026-10-22

**Status**: Approved

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> /cv page. Short name: cv-page.
>
> Why: Principle VII says the CV is the product, and /cv is a plain server-rendered page that
> reads in full without JavaScript and without the OS. It's the first thing a visitor can see, and
> the first feature that reads the content source (002) and the design tokens (003), so it proves
> both with real data and real token values. As the first UI feature, it also sets up the checks
> every later UI feature must pass before merge: accessibility, Lighthouse, reading without
> JavaScript, and offline.
>
> Who uses it: recruiters, often on a phone with a weak connection, who read, print and share the
> link; hiring managers and engineers, who also check its accessibility and speed; the owner, when
> the CV changes; reviewers, who see the check results on pull requests.
>
> What it does:
>
> - /cv shows every section the content source has: basics and profiles, work, projects,
>   education, skills, languages and interests, in the order the design sets. Every word of CV
>   text comes from the content source, so changing a CV fact is still one edit. An empty optional
>   section is left out, with no empty heading.
> - The full content is in the HTML the server sends. With JavaScript off, nothing is missing and
>   nothing is broken.
> - It reads well from a 320px-wide phone to a wide desktop, with no horizontal scrolling, and at
>   200% text size and 400% zoom.
> - The structure is semantic: one main heading (the owner's name), a heading per section, and
>   landmarks, so a screen reader can move by section. Dates read naturally, including partial
>   dates and a current role. Email and profiles are links.
> - Printing gives a clean CV on A4 and US Letter: no site chrome, link addresses visible, and no
>   section heading left alone at the bottom of a page.
> - A shared link shows the owner's name and role as its title and description, taken from the
>   content source.
> - After one visit, /cv opens offline with all its content, styles and fonts. When a newer
>   version is published, the next online visit gets it.
> - Until the shells exist, the site root opens the CV, so it is zero clicks from first load.
> - The page makes no requests to any other site: no external fonts, scripts or analytics.
> - The visual design comes from the approved Penpot mockup. Its token values replace the starter
>   set from 003. The page uses only tokens, so the token check passes with no exception for it.
> - Fonts are chosen in the design, are open-licensed, and are served by the site itself, with
>   their licenses in the repo. If declaring a font needs a change to 003's literal-value rule,
>   003's spec is updated first, in this same pull request.
> - Every element that implements a requirement carries its data-req attribute.
> - On every pull request, and locally with one command with the same result, the built page is
>   checked, and a failure blocks merge: no automated WCAG 2.2 AA violations; Lighthouse 90 or
>   higher in every category on both mobile and desktop profiles; full content present with
>   JavaScript off; opens offline after one visit; every link reachable by keyboard with visible
>   focus. The checks need no network access beyond the machine running them.
>
> Edge cases: a very long word or URL on a narrow phone; a project with no URL or no dates; a role
> with no highlights; non-ASCII characters in names and places; forced colors (high-contrast
> mode); reduced motion; /cv/ with a trailing slash; an unknown path.
>
> Out of scope: the PDF download (a later feature); publishing the site at a public URL, pull
> request previews and choosing the domain (a later feature); the shells, os-core and the CV app;
> the requirement inspector; a dark theme and theme switching (Settings); a contact form
> (Contact); a profile photo; link preview images; translations (a non-goal).
>
> Shell scope: /cv is independent of the shells (Principle VII), and neither shell exists yet.
> Desktop shell: not affected. Mobile shell: not affected. The page itself must work at phone and
> desktop widths. CV path: the site root opens the CV until the shells feature changes that.
> Offline: after one visit, /cv reads in full offline. A first visit needs the network.
> Design: UI feature, so the design gate applies: ASCII wireframes at phone and desktop widths
> and for print, the Penpot mockup with PNG exports at both widths, and a signed-off review.md.
> Keep the spec free of framework, tool, hosting and CI-provider choices; the plan decides those.
> Penpot and Lighthouse are named because the constitution names them.

## Clarifications

### Session 2026-10-22

- Q: When a visitor opens the site root, should it send them on to `/cv`, or show the CV right
  there at the root address? → A: The root sends visitors on to `/cv` with a temporary redirect
  that browsers don't remember, so the address bar and every copied link show `/cv`.
- Q: The site has no public domain yet, so how should `/cv` state its own address to search
  engines and link previews? → A: It states no address of its own until the publishing feature
  adds the domain. `/cv/` and query parameters still show the same page.
- Q: FR-056 says the Lighthouse check covers every page the site serves, but Lighthouse won't
  score a page that answers "not found". Should the Lighthouse check skip the not-found page?
  → A: Yes. Lighthouse covers every page that loads successfully. The not-found page and
  redirects such as the site root are left out, and the accessibility, keyboard and other-site
  checks still cover the not-found page.
- Q: If the CV document has an unsupported section that is empty, such as `"awards": []`,
  should the checks still fail because of it? → A: No. An empty or absent unsupported section
  passes. Only an unsupported section with at least one entry fails the checks.
- Q: Apart from the CV itself, should anything appear on the printed pages, such as the
  owner's name or page numbers on every page, or are the browser's own print headers and
  footers left to the visitor's print dialog? → A: Only the CV is printed. The browser's own
  headers and footers are the visitor's choice in the print dialog, and the page doesn't
  change them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the whole CV on any screen, with or without JavaScript (Priority: P1)

A recruiter opens the link on a phone, or a hiring manager opens it on a wide desktop monitor.
Either way, the whole CV is there as soon as the page arrives: the owner's name and role,
contact links, work, projects, education, skills, languages and interests. It reads top to
bottom without horizontal scrolling, at any text size the visitor picks, and works the same
with JavaScript turned off. A screen reader user can jump from section to section by heading
and hears dates as words.

**Why this priority**: Constitution VII says the CV is the product. This story is the page
itself. Every other story (printing, sharing, offline, the merge checks) builds on a page that
exists and reads in full.

**Independent Test**: build the site, open `/cv` with JavaScript turned off at 320 px and at
1440 px wide, and confirm that every shown field of the CV document (see Key Entities) appears,
in order, with no horizontal scrolling. Move through it with a screen reader's heading
navigation and confirm there is one main heading, the owner's name, and one heading per
section.

**Acceptance Scenarios**:

1. **Given** the CV document holds basics, work, projects, education, skills, languages and
   interests, **When** a visitor opens `/cv`, **Then** every section is shown in the order the
   approved design sets, and every entry within a section in the CV document's order.
2. **Given** JavaScript is turned off in the browser, **When** a visitor opens `/cv`, **Then**
   every shown field is present and styled, and no control on the page fails to work.
3. **Given** a phone 320 px wide, **When** a visitor reads the page from top to bottom,
   **Then** nothing needs horizontal scrolling and no text is cut off.
4. **Given** a desktop browser zoomed to 400% on a window 1280 px wide, **When** the visitor
   reads the page, **Then** the content reflows into one column with no horizontal scrolling.
5. **Given** the visitor's text size is set to 200%, **When** they read the page, **Then** all
   text is larger and nothing overlaps, is cut off or is hidden.
6. **Given** a screen reader user lists the page's headings, **When** they look at the list,
   **Then** it holds exactly one main heading, `Alex Profir`, then one heading per shown
   section, with entry headings below their section's heading.
7. **Given** the work entry starts `2018-07` and ends `2026-10`, **When** a screen reader reads
   its dates, **Then** it reads them as words, such as "July 2018 to October 2026".
8. **Given** the project `Faith-Based Social Network Mobile App` starts `2025-12` and has no end
   date, **When** the page shows its dates, **Then** it shows the project as ongoing since
   December 2025.
9. **Given** the CV document's email and GitHub profile, **When** a visitor activates them,
   **Then** the email opens a new message to the address, and the profile opens
   `https://github.com/alex-profir`.
10. **Given** the education entry's institution is `Politehnica University of Timișoara`,
    **When** the page shows it, **Then** every character appears exactly as written, drawn in
    the design's font.
11. **Given** the CV document has `"interests": []`, **When** a visitor opens `/cv`, **Then**
    there is no Interests heading and no empty space where it would be.
12. **Given** a project with no URL and no dates, **When** the page shows it, **Then** its name
    is plain text, not a link, and there is no empty date line or stray separator.

---

### User Story 2 - Every pull request proves the page is accessible, fast, readable without scripts and offline (Priority: P2)

A reviewer opens a pull request and sees one result for the built site. It says whether the
pages have automated accessibility violations, whether Lighthouse scores 90 or more in every
category on mobile and desktop, whether the full CV is present with JavaScript off, whether
`/cv` opens offline after one visit, whether every link is reachable by keyboard with visible
focus, and whether any page asks another site for anything. If any of these fails, the pull
request can't be merged. The owner runs the same checks locally with one command and gets the
same result.

**Why this priority**: Constitution VIII and the merge requirements say these qualities are
verified before merge. This is the first UI feature, so it sets up the checks that every later
UI feature must pass. Without them, Story 1 is a claim, not a guarantee.

**Independent Test**: on a copy of the site, remove the text alternative from a link, so it has
no accessible name. Run the checks and confirm they fail and name the page, the width and the
element. Separately, add a style sheet loaded from another site and confirm the checks fail and
name the request.

**Acceptance Scenarios**:

1. **Given** the built site meets every check, **When** the checks run on a pull request,
   **Then** they pass and the summary lists each check, each page, each width or profile, and
   the Lighthouse score of every category.
2. **Given** a change that lowers the color contrast of body text below the WCAG 2.2 AA
   minimum, **When** the checks run, **Then** they fail, name the page, the width, the rule and
   the element, and the pull request can't be merged.
3. **Given** a change that drops the Lighthouse Performance score on the mobile profile to 85,
   **When** the checks run, **Then** they fail and report the profile, the category and the
   score.
4. **Given** a change that makes the projects section appear only after a script runs, **When**
   the checks run, **Then** the no-JavaScript check fails and names the missing fields.
5. **Given** a change that leaves the page's fonts out of what is stored for offline use,
   **When** the offline check runs, **Then** it fails and names the font that didn't load.
6. **Given** a change that removes the focus indicator from links, **When** the keyboard check
   runs, **Then** it fails and names every link without a visible focus indicator.
7. **Given** a change that loads an analytics script from another site, **When** the checks
   run, **Then** they fail and report the address requested.
8. **Given** the owner's machine has no internet connection, **When** the owner runs the checks
   with one command, **Then** they complete and give the same result as on the pull request.
9. **Given** a later feature adds a new page to the site, **When** the checks run, **Then** the
   accessibility, Lighthouse, keyboard and other-site checks cover that page too, with no
   change to how the checks are run. Lighthouse scores pages that load with a success status,
   so the not-found page is covered by the other three checks only.

---

### User Story 3 - Print or save a clean CV (Priority: P3)

A recruiter prints the CV, or saves it as a document from the browser's print dialog, to attach
to a hiring file. What comes out is the CV and only the CV, on A4 or US Letter, with every link's
address written out so it still works on paper, and no section heading stranded at the bottom
of a page.

**Why this priority**: recruiters still print and file CVs, and until the PDF download feature
exists, printing is the only way to get a document. It needs Story 1's page to exist first.

**Independent Test**: print `/cv` to A4 and to US Letter in two different browsers. Confirm
that no site element that isn't CV content appears, that every link's address is printed, that
no text is cut off at a page edge, and that no section or entry heading is the last line on a
page.

**Acceptance Scenarios**:

1. **Given** the page holds site elements that aren't CV content, such as a link to the site's
   repository, **When** a visitor prints it, **Then** they are left out, and the whole CV is
   printed.
2. **Given** the GitHub profile link, **When** the page is printed, **Then** the address
   `https://github.com/alex-profir` is printed with it.
3. **Given** the email link shows the address itself, **When** the page is printed, **Then**
   the address is printed once, not twice.
4. **Given** the Projects heading would fall on the last line of a page, **When** the page is
   printed, **Then** the heading moves to the next page together with the start of the section.
5. **Given** the browser's option to print background colors is off, **When** the page is
   printed, **Then** all text is still legible and nothing relies on a background color.
6. **Given** paper size A4, and then US Letter, **When** the page is printed, **Then** no line
   of text is cut off at either page edge.
7. **Given** the browser's print headers and footers are turned on in the print dialog, **When**
   the page is printed, **Then** they appear as the browser sets them, and the page adds no
   header, footer or page number of its own.

---

### User Story 4 - Open the CV again offline or on a weak connection (Priority: P4)

A recruiter opened the link once on the office Wi-Fi. Later, on a train with no signal, they
open it again and get the whole CV, styled and in the design's fonts. When the owner publishes
an update, the recruiter's next online visit shows the new version, with no prompt to reload.

**Why this priority**: Constitution VI says all CV content works offline, and recruiters often
open links on weak connections. It needs Story 1's page, and it is the first offline behavior
the site has.

**Independent Test**: visit `/cv` once online, turn the network off, and open `/cv` and the site
root again. Confirm that every shown field is present, that the page is styled, and that its
text is drawn in the design's fonts, not a fallback font.

**Acceptance Scenarios**:

1. **Given** a visitor has opened `/cv` once online, **When** they open `/cv` with no network,
   **Then** the full CV appears, with its styles and fonts.
2. **Given** a visitor has opened only the site root once online, **When** they open `/cv` with
   no network, **Then** the full CV appears.
3. **Given** a stored copy of the page, and the owner has since published a new version,
   **When** the visitor next opens `/cv` online, **Then** that visit shows the new version, and
   the stored copy is replaced by it.
4. **Given** a new version fails to download completely, **When** the visitor later opens `/cv`
   offline, **Then** they get the last complete version, never a mix of old and new parts.
5. **Given** a stored copy, and the network fails while the visitor is opening the page,
   **When** the page loads, **Then** it shows the stored copy, not a browser error page.
6. **Given** a visitor who has never opened the site, **When** they open `/cv` with no network,
   **Then** the browser shows its own offline message. A first visit needs the network.
7. **Given** a stored copy, **When** the visitor opens a shared link to `/cv` that carries extra
   query parameters, such as a campaign tag, **Then** the full CV appears offline as well.

---

### User Story 5 - Share the link with a clear preview (Priority: P5)

A recruiter pastes the `/cv` link into a chat or an email to a hiring manager. The preview shows
the owner's name and role, and a short description, all taken from the CV document. The
browser tab shows the same title.

**Why this priority**: sharing is how a CV travels between recruiters and hiring managers. It
makes the link better, but the CV is fully usable without it.

**Independent Test**: read the title and description the page declares for link previews, and
compare them with the CV document. Change the role in the CV document, rebuild, and confirm the
title follows with no other edit.

**Acceptance Scenarios**:

1. **Given** the CV document's name `Alex Profir` and role `Software Engineer`, **When** the
   link is shared, **Then** the preview's title holds both, and its description is the CV
   document's summary.
2. **Given** the owner changes the role in the CV document, **When** the site is rebuilt,
   **Then** the page's title and preview follow, with no other edit.
3. **Given** the page is open in a browser tab, **When** the visitor looks at the tab, **Then**
   it shows the same title as the preview.
4. **Given** the CV document has no summary, **When** the link is shared, **Then** the
   description is the role, and no empty description is declared.

---

### User Story 6 - The owner changes a fact or the design in one edit (Priority: P6)

The owner updates the CV document, or changes a color in Penpot and exports the tokens again.
After a rebuild, the page shows the change, with no edit to the page itself. The page's styles
use only tokens from 003 and its text only facts from 002, so both checks keep passing with no
exception for the page.

**Why this priority**: Constitution IV requires one edit at the source for every CV fact and
design token. This story proves that 002 and 003 work end to end with real data and real token
values. It matters at every later change, not for a visitor's first read.

**Independent Test**: change the work entry's position in the CV document and rebuild. Confirm
the page shows the new position with no other edit. Change a color token in Penpot, export,
rebuild, and confirm the page uses the new color. Run the content check and the token check and
confirm both pass.

**Acceptance Scenarios**:

1. **Given** the owner changes the work entry's position in the CV document, **When** the site
   is rebuilt, **Then** the page shows the new position, and no other file was edited.
2. **Given** the owner changes the text color token in Penpot and exports again, **When** the
   site is rebuilt, **Then** the page uses the new color, and no other file was edited by hand.
3. **Given** the page's styles and components, **When** the token check runs, **Then** it
   reports no literal design value, and the check holds no exception added for this page.
4. **Given** the page's source, **When** the content check runs, **Then** it reports no
   hardcoded CV fact.
5. **Given** the owner adds a `certificates` section to the CV document, **When** the checks
   run, **Then** they fail and report that `/cv` doesn't show certificates yet, so the section
   can't be silently missing from the page.
6. **Given** a font file the page uses, **When** a reviewer looks for its license, **Then** the
   license is in the repository next to the font.

---

### Edge Cases

- **A very long word or URL** on a 320 px phone, such as a long project name or an address in a
  summary: it wraps within its column. Nothing overflows the screen or is cut off.
- **A project with no URL**: its name is plain text, not a link. **A project with no dates**: no
  date line is shown.
- **A role with no highlights**: no empty list or heading. The same holds for a project with no
  highlights or keywords, a skill with no keywords, and an education entry with no courses.
- **An entry whose start and end fall in the same month** (or the same year, for year-only
  dates): the date is shown once, not as a range from a date to itself.
- **An entry with an end date and no start date**: the end date is shown alone, not as an
  ongoing range.
- **Partial dates**: a year-only date is shown as a year, never with an invented month. A
  year-and-month date is shown with its month, never with an invented day.
- **An ongoing entry**, with a start date and no end date: shown as running from its start date
  to the present, in words a screen reader reads naturally.
- **Non-ASCII characters in names and places**, such as `Timișoara`: shown exactly, in the
  design's fonts, not a fallback font. The checks fail if the CV document uses a character the
  fonts can't draw.
- **An empty or absent optional section**: left out, with no heading.
- **An absent field**, such as a missing email or location: left out, with no empty label,
  separator or placeholder.
- **An absent name**: every field of the CV document is optional (002). The page still has one
  main heading, using a site heading such as "CV" in place of the name, and the title falls back
  the same way.
- **A profile with no URL**: shown as plain text. **A profile with no username**: its link is
  named by its network.
- **A section or field the page doesn't show yet**, such as `certificates` or a published phone
  number: the checks fail and name it, so nothing in the CV document is silently missing. An
  unsupported section that is present but empty, such as `"awards": []`, passes.
- **Forced colors (high-contrast mode)**: all text, links, headings and focus indicators stay
  visible and distinguishable in the colors the visitor's system chooses. Nothing relies on a
  background image or a background color alone.
- **Reduced motion**: the page has no non-essential motion. If the design adds any, it is
  removed when the visitor asks for reduced motion.
- **A visitor whose system prefers a dark theme**: sees the page's one theme, fully legible. A
  dark theme is out of scope.
- **Text spacing overridden by the visitor** (wider line, letter, word and paragraph spacing,
  as WCAG 2.2 defines): nothing is cut off or overlaps.
- **`/cv/` with a trailing slash**: shows the same page. Neither address is declared as the
  page's own until the domain exists (FR-017).
- **`/cv` with query parameters or a fragment**: shows the same page, online and offline.
- **The site root**: sends the visitor on to `/cv` with no click, online and offline, until the
  shells feature changes that. A link copied from the address bar is always the `/cv` link.
- **An unknown path**: a not-found page, with a not-found status, that says the page doesn't
  exist and links to the CV. After one visit to the site, it also works offline, never a browser
  error.
- **Offline storage unavailable or cleared**, as in some private browsing modes: the page still
  works online, and no error is shown.
- **JavaScript turned off and no network**: the page can't be stored for offline use without
  scripts, so offline is not promised in this case. Online, the page reads in full.
- **A first visit with no network**: the browser's own offline message. A first visit needs the
  network.

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `004-cv-page-FR-###`. UI implementing a requirement carries
`data-req="004-cv-page-FR-###"` (Constitution III).

### Functional Requirements

**Content**

- **FR-001**: `/cv` MUST show every section of the CV document that this spec supports (basics
  with its profiles, work, projects, education, skills, languages and interests), in the order
  the approved design sets. Entries within a section MUST keep the CV document's order.
- **FR-002**: For each supported section, the page MUST show every field the Key Entities table
  lists as shown, whenever the CV document holds it.
- **FR-003**: Every word of CV text on the page MUST come from the CV document when the site is
  built. Changing a CV fact MUST take one edit, in the CV document, and no edit to the page. The
  content check (002) MUST pass over the page's source with no exception added for it.
- **FR-004**: An optional section that is empty or absent MUST be left out, with no heading and
  no empty space. An absent field MUST be left out, with no empty label, separator or
  placeholder.
- **FR-005**: The checks (FR-048) MUST fail when the CV document holds a section this spec
  doesn't support (volunteer, awards, certificates, publications or references) with at least
  one entry, or a field the Key Entities table lists as not supported, and MUST name the section
  or field. An unsupported section that is empty or absent MUST pass, as it has nothing to show
  (FR-004). Nothing in the CV document may be silently missing from the page.
- **FR-006**: Text on the page that isn't CV content, such as section headings, the word used
  for an ongoing date and the not-found message, MUST be in English, MUST be set by the approved
  design, and MUST NOT contain a CV fact.
- **FR-007**: The page MUST show every character of the CV document exactly as written,
  including non-ASCII characters. The site's fonts MUST draw every character the CV document
  uses, and the checks MUST fail, naming the character and where it appears, when a font can't
  draw one.
- **FR-008**: The location MUST be shown as the city, the region if present, and the country's
  English name, taken from its country code using the ISO 3166-1 list.

**Dates**

- **FR-009**: Dates MUST be shown in English at the precision the CV document gives: a year
  alone, a month and year, or a day, month and year. The page MUST NOT add a month or a day the
  CV document doesn't give.
- **FR-010**: An entry with a start date and no end date MUST be shown as ongoing, from its
  start date to the present. An entry with only an end date MUST show that date alone. An entry
  whose start and end are the same at the precision given MUST show the date once. An entry with
  no dates MUST show no date line.
- **FR-011**: Every date MUST read naturally to a screen reader, with month names as words and
  a word, not a bare symbol, between a start and an end date. Every date MUST also carry a
  machine-readable form.

**Links**

- **FR-012**: The email MUST be a link that opens a new message to it. Every profile with a URL,
  the basics URL, and every work, project and education entry with a URL MUST be a link to that
  URL. An entry or profile without a URL MUST show its name as plain text.
- **FR-013**: Every link's purpose MUST be clear from its own text: a profile link names its
  network, and a link to an entry names the entry.

**What the server sends**

- **FR-014**: The full content of `/cv` MUST be in the page the server sends. No content, style
  or layout may depend on a script running.
- **FR-015**: With scripting turned off, nothing on the page may be missing or broken, and the
  page MUST NOT show a control that needs a script to work.
- **FR-016**: Every page MUST load everything it uses (fonts, styles, scripts and images) from
  the site itself, and MUST make no request to any other site. There MUST be no analytics,
  tracking or third-party embeds. Following a link is the visitor's choice and is not a request
  the page makes.

**Addresses**

- **FR-017**: `/cv` and `/cv/` MUST show the same page. Query parameters and fragments MUST NOT
  change what the page shows. Until the publishing feature adds the domain, the page MUST NOT
  declare an address of its own, for search engines or for link previews. That feature adds the
  full address of `/cv`.
- **FR-018**: Until the shells feature changes it, the site root MUST open the CV with no click,
  tap or other step in front of it (Constitution VII). It does so by sending the visitor on to
  `/cv` with a temporary redirect, one that browsers don't remember, so the address bar shows
  `/cv` and the shells feature can later give the root a page of its own. The root MUST NOT
  show the CV at its own address.
- **FR-019**: An unknown path MUST answer with a not-found status and a not-found page that says
  the page doesn't exist and links to `/cv`. The not-found page MUST meet the same requirements
  as `/cv` for accessibility, tokens, fonts and requests to other sites.

**Layout and reading**

- **FR-020**: The page MUST read without horizontal scrolling at every width from 320 px to at
  least 2560 px, with line lengths kept readable on wide screens as the design sets.
- **FR-021**: The page MUST keep all content and function when text is resized to 200%, when
  the page is zoomed to 400% on a window 1280 px wide, and when text spacing is overridden as
  WCAG 2.2 success criterion 1.4.12 describes.
- **FR-022**: A long word or URL MUST wrap within its column at every width, and never overflow
  the screen or be cut off.

**Structure**

- **FR-023**: The page MUST have exactly one main heading. It holds the owner's name, or a site
  heading set by the design when the CV document has no name.
- **FR-024**: Every shown section MUST have its own heading, one level below the main heading.
  Every work, project and education entry MUST have its own heading, one level below its
  section's heading. Heading levels MUST NOT skip.
- **FR-025**: The CV MUST sit inside one main landmark. Every shown section MUST be a region
  named by its heading. Site elements that aren't CV content MUST sit outside the main landmark.
- **FR-026**: Lists in the CV, such as highlights, keywords, courses, profiles and languages,
  MUST be marked as lists.
- **FR-027**: The page MUST declare English as its language. The reading order of the page MUST
  match its visual order at every width, and keyboard focus MUST follow the same order.

**Accessibility**

- **FR-028**: `/cv` and the not-found page MUST conform to WCAG 2.2 Level AA at every width in
  FR-020, including color contrast and target size (Constitution VIII).
- **FR-029**: Every link MUST be reachable and usable with the keyboard alone, in reading order.
  When focused, it MUST show a visible focus indicator with a contrast of at least 3:1 against
  its surroundings, and MUST NOT be hidden behind other content.
- **FR-030**: With forced colors active, all text, links, headings, separators and focus
  indicators MUST stay visible and distinguishable. No content may rely on a background image or
  a background color alone.
- **FR-031**: When the visitor asks for reduced motion, the page MUST show no non-essential
  motion.

**Print**

- **FR-032**: Printing `/cv` on A4 and on US Letter MUST give the whole CV and nothing else: site
  elements that aren't CV content are left out, and no text is cut off at a page edge. The page
  MUST NOT add a running header, footer or page number of its own. The browser's own headers
  and footers are the visitor's choice in the print dialog, and the page MUST NOT try to remove
  or replace them.
- **FR-033**: In print, every link MUST show its address next to its text, unless its text
  already is the address.
- **FR-034**: In print, no section heading or entry heading may be the last line on a page. It
  MUST stay on the same page as the start of what it introduces.
- **FR-035**: In print, all text MUST be legible with background colors and images turned off,
  and no information may rely on color alone.

**Sharing**

- **FR-036**: The page's title MUST hold the owner's name and role from the CV document. Its
  description MUST be the CV document's summary, or the role when there is no summary. Link
  previews MUST use the same title and description, and no preview image (out of scope).
- **FR-037**: When the CV document has no name, or no role, the title MUST use what is present,
  falling back to the site heading of FR-023. No empty title or description may be declared.

**Offline**

- **FR-038**: After one complete online visit to `/cv` or the site root, opening `/cv`, the site
  root or an unknown path with no network MUST show the same page as online, with all its
  content, styles and fonts (Constitution VI). Opening the site root offline MUST lead to `/cv`,
  as it does online.
- **FR-039**: An online visit after a new version is published MUST show the new version on
  that visit, and MUST replace the stored copy with it. A stored copy MUST always be one complete
  version, never a mix of parts from two versions.
- **FR-040**: When the network fails or is unavailable and a stored copy exists, the page MUST
  show the stored copy, not a browser error.
- **FR-041**: Offline support MUST NOT add any step, prompt or interruption in front of the CV,
  such as an install prompt or a reload request (Constitution VII). When offline storage isn't
  available, the page MUST work online and show no error.

**Design, tokens and fonts**

- **FR-042**: The page and the not-found page MUST match the approved Penpot mockup at phone and
  desktop widths, and the approved print wireframe in print (Constitution II).
- **FR-043**: The token export (003) MUST be replaced by the tokens of the approved mockup,
  exported from the site's Penpot file. Starter tokens that the design doesn't use MUST be
  removed. The motion token source changes only if the design uses motion.
- **FR-044**: The page's styles and components MUST read every design value from tokens. The
  token check (003) MUST pass over them, and MUST hold no exception added for this page, other
  than an amendment made under FR-046.
- **FR-045**: The page's fonts MUST be chosen in the approved design, MUST be under a license
  that allows them to be served by the site and published in a public repository, and MUST be
  served by the site itself. Each font's license MUST be in the repository next to the font. No
  font may be an Apple font or the operating system's interface font (Constitution IX). Text
  MUST stay visible in a fallback font while the design's fonts load.
- **FR-046**: If declaring the site's fonts can't pass 003's literal-value check, 003's spec
  MUST be amended first, in the same pull request as this feature: the amendment adds new
  requirements to 003, keeping its existing IDs (Constitution III), the owner approves it before
  the fonts are declared, and the token check is changed to match. A skip marker is not an
  option (003 FR-057).
- **FR-047**: Every element that implements a requirement in this spec MUST carry
  `data-req="004-cv-page-FR-###"`, listing every requirement it implements, and the requirement
  traceability check (001) MUST pass.

**The checks**

- **FR-048**: The checks MUST run on the built site on every pull request. When any check fails,
  the pull request MUST NOT be mergeable, under the same repository rules as the requirement
  traceability check.
- **FR-049**: The owner MUST be able to run the checks locally with one command. Over the same
  files, it MUST give the same result as the pull-request run.
- **FR-050**: The accessibility check MUST find no automated WCAG 2.2 Level AA violation on
  `/cv` or the not-found page, at a phone width and a desktop width.
- **FR-051**: The Lighthouse check MUST find a score of 90 or more in every Lighthouse category,
  on both the mobile and the desktop profile, for every page that loads with a success status,
  which today is `/cv`. The not-found page, which answers with a not-found status, and
  redirects such as the site root are not scored by Lighthouse.
- **FR-052**: The no-JavaScript check MUST load `/cv` with scripting turned off and confirm that
  every shown field the CV document holds is present, in order. It MUST read the expected fields
  from the CV document, not from a hand-written list.
- **FR-053**: The offline check MUST visit `/cv` once online, then turn the network off, open
  `/cv`, the site root and an unknown path, and confirm that each shows its full content and
  styles, with text drawn in the design's fonts.
- **FR-054**: The keyboard check MUST move through `/cv` and the not-found page with the keyboard
  alone, and confirm that every link is reached, in reading order, with a visible focus
  indicator.
- **FR-055**: The other-site check MUST load `/cv` and the not-found page and confirm that no
  request goes to any other site, naming any address requested.
- **FR-056**: The accessibility, keyboard and other-site checks MUST cover every page the site
  serves, including the not-found page. The Lighthouse check MUST cover every page that loads
  with a success status (FR-051). A later feature's pages are checked once they exist, with no
  change to how the checks are run.
- **FR-057**: The checks MUST need no network access beyond the machine running them.
- **FR-058**: Every check MUST run even when another fails. Each failure MUST name the check, the
  page, the width or profile, and what failed: the rule and element, the category and score, the
  missing field, the link, the font or the address requested. Every run MUST end with a summary
  of every check's result and every Lighthouse score.

### Key Entities

- **CV document**: the owner's CV in JSON Resume 1.3.1 form, from the content source (002). Every
  field is optional.
- **Supported section**: a section of the CV document that `/cv` shows: basics (with profiles),
  work, projects, education, skills, languages and interests. The other sections the standard
  defines (volunteer, awards, certificates, publications and references) are not supported yet,
  and FR-005 reports them.
- **Shown field**: a field the page shows when the CV document holds it:

  | Section | Shown | Not supported (FR-005) |
  |---------|-------|------------------------|
  | Basics | name, label (the role), email, url, summary, location (city, region, country code) | phone, image, location address and postal code, which 002 doesn't publish |
  | Profiles | network, username, url | - |
  | Work | name, position, location, url, start date, end date, description, summary, highlights | - |
  | Projects | name, description, entity, type, roles, url, start date, end date, highlights, keywords | - |
  | Education | institution, area, study type, url, start date, end date, score, courses | - |
  | Skills | name, level, keywords | - |
  | Languages | language, fluency | - |
  | Interests | name, keywords | - |

  The CV document's `$schema` field and `meta` section describe the document, not the CV. They
  are not shown and not reported.
- **Site text**: text on the page that isn't CV content, such as section headings, the word for
  an ongoing date and the not-found message. Set by the design, in English, with no CV fact.
- **Site element**: anything on the page that isn't CV content, such as a link to the site's
  repository. It sits outside the main landmark and is left out of print.
- **Stored copy**: the version of the site's pages, styles and fonts kept by the visitor's
  browser after one visit, used when the network is unavailable.
- **Token export**: the site's tokens as Penpot exports them (003), replaced by the approved
  mockup's tokens.
- **Site fonts**: the open-licensed font files the design chooses, served by the site, each with
  its license in the repository.
- **Check result**: one check's pass or fail, for one page and one width or profile, with what
  failed.
- **Report**: every check result, followed by the summary.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | No: `/cv` is independent of the shells (Constitution VII) | Not affected. No shell exists yet. `/cv` itself works at desktop widths in any browser. |
| Mobile (iOS-style) | No: `/cv` is independent of the shells (Constitution VII) | Not affected. No shell exists yet. `/cv` itself works at phone widths in any browser. |

**CV path**: Changed. Until the shells feature changes it, the site root sends the visitor on to
`/cv` with no click or tap, through a temporary redirect (FR-018). Once the shells exist, the CV stays one click (desktop) or one tap
(mobile) from first load, and `/cv` remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, after one online visit.
- **Available offline**: the whole of `/cv`, with all its content, styles and fonts, and the
  site root and the not-found page, after one visit to `/cv` or the site root (FR-038). The
  checks also run without network access beyond the machine running them (FR-057).
- **Needs the network**: the first visit, which has to fetch the page before it can be stored.
  Following a profile or project link leads to another site, which needs the network.
- **Offline state shown**: the page itself, complete. It shows no offline banner, because
  nothing is missing. On a first visit with no network, the browser's own offline message
  appears, as the site has not been fetched yet.

## Design *(mandatory)*

**UI change**: design artifacts live in `specs/004-cv-page/design/`:

- [x] ASCII wireframes of `/cv` at a phone width and a desktop width, of `/cv` in print, and of
  the not-found page at a phone width and a desktop width
- [x] PNG exports of the approved Penpot mockup of `/cv` and the not-found page, at a phone width
  and a desktop width
- [ ] Penpot file link: added with the mockup
- [x] `review.md` sign-off by the project owner, naming the mockup version and date

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: With scripting turned off, `/cv` shows 100% of the shown fields the CV document
  holds, in order, at 320 px and at 1440 px wide.
- **SC-002**: Every Lighthouse category scores 90 or more on both the mobile and the desktop
  profile, on every build merged to the main branch.
- **SC-003**: Under Lighthouse's mobile profile, with its simulated slow connection, the owner's
  name and role are visible within 2.5 seconds of the request.
- **SC-004**: The automated accessibility check finds 0 WCAG 2.2 AA violations. Before merge,
  the owner also checks by hand, with one screen reader on a desktop and one on a phone, that
  moving by heading reaches every section and that dates are read as words.
- **SC-005**: Printed on A4 and on US Letter, in two different browsers, the CV has 0 headings
  left as the last line of a page, 0 lines cut off, and every link's address printed. This is
  verified by hand before merge, alongside the automated tests of FR-032 to FR-035.
- **SC-006**: After one online visit, `/cv` opens with no network with 100% of its content, its
  styles and its fonts, every time the offline check runs.
- **SC-007**: Loading `/cv` and the not-found page makes 0 requests to any other site.
- **SC-008**: Changing any CV fact takes exactly one edit, in the CV document, and changing a
  token value takes one export from Penpot. In both cases the page follows after a rebuild, and
  every check passes with no other edit.
- **SC-009**: For the same files, the local run and the pull-request run give the same result
  every time. The local run completes in under 5 minutes on the owner's machine, with no internet
  connection.
- **SC-010**: When this feature is merged, the content check (002) and the token check (003)
  pass with no exception added for the page, other than an amendment made under FR-046, and every
  requirement in this spec is covered by at least one test.

## Assumptions

- **Users**: recruiters, hiring managers and engineers read the page. The owner edits the CV
  document and the design. Reviewers read check results on pull requests.
- **Browsers**: the current and previous major versions of the main desktop and phone browsers.
  "Phone width" in the design and the checks means 375 px, "desktop width" means 1440 px, and
  the page is also checked at 320 px. The plan may add widths.
- **Section order and site text**: the design sets the order of sections and the wording of
  section headings and other site text. Where site text lives is a plan decision. It is not CV
  data, so Constitution IV doesn't require it in the content source.
- **Dates**: English month names, as translations are a non-goal. The exact format, such as
  "Jul 2018 – Oct 2026", and the word for an ongoing entry, such as "Present", are set by the
  design within FR-009 to FR-011.
- **Country names**: the country's English name is derived from its code (FR-008). That is a
  standard list, not a CV fact, so it doesn't break Constitution IV.
- **Share description**: the description is the CV document's summary, because it is the
  owner's own short pitch. If the owner prefers the role alone, that is a change to FR-036.
- **Unsupported sections and fields**: the real CV holds only supported sections, so nothing is
  reported today. A later change that adds, for example, certificates to the CV document also
  adds them to this page, through a change to this spec and its design (FR-005).
- **Offline needs scripts**: storing the page for offline use relies on browser features that
  need scripting. With scripting off, the page reads in full online, and offline is not
  promised (FR-014, FR-038).
- **Updates on the next visit**: "the next online visit gets it" (FR-039) means the visit itself
  shows the new version, not the one after it. How long the page waits for a slow network before
  using the stored copy is a plan decision, within the Lighthouse and SC-003 targets.
- **Lighthouse categories**: those Lighthouse reports when this spec is written: Performance,
  Accessibility, Best Practices and SEO. If Lighthouse adds or removes a category, the check
  follows it. How many runs make a score is a plan decision, as long as SC-009 holds.
- **Automated and manual checks**: automated accessibility checks find only part of WCAG 2.2 AA.
  FR-028 is met by the automated check plus the manual screen-reader and keyboard pass of
  SC-004. Print layout is tested automatically where the tooling can render print, and checked
  by hand (SC-005).
- **The built site**: the checks run against the site as built for publishing, served from the
  machine running them. Publishing at a public URL is a later feature, so `/cv` declares no
  address of its own until then. The full address arrives with the domain (FR-017). Nothing is
  public before then, so two addresses showing the same page do no harm.
- **Fonts**: "open-licensed" means a license such as the SIL Open Font License, which allows
  serving, subsetting and publishing in a public repository. The design may choose one family
  or two. Subsetting is allowed as long as FR-007 holds.
- **003 amendment**: the font declaration names a font family and points at font files, which
  003's literal-value check may report. Whether an amendment is needed is found out in the plan.
  If it is, it is limited to font declarations and recorded as new 003 requirements (FR-046).
- **The not-found page** is part of this feature, because the site needs an answer for unknown
  paths once it serves pages. It is simple: a heading, a short message and a link to `/cv`.
- **Blocking merge** reuses the repository rules set up by the requirement traceability feature:
  required checks, no direct pushes to the main branch, and no bypass.
- **Out of scope**:
  - The PDF download, a later feature.
  - Publishing the site at a public URL, pull request previews and choosing the domain, a later
    feature.
  - The shells, `os-core` and the CV app.
  - The requirement inspector.
  - A dark theme and theme switching, which belong to the Settings feature.
  - A contact form, which belongs to the Contact feature.
  - A profile photo.
  - Link preview images.
  - Translations, a non-goal in the vision.
  - Sections of the CV document beyond those listed as supported.
- **Depends on**: Constitution II, IV, VI, VII, VIII and IX; the requirement traceability check
  (001); the CV content source and content check (002); the design tokens source and token check
  (003); and an approved Penpot mockup with its review sign-off.
