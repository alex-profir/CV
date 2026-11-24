# Feature Specification: CV Pitch and Personal Projects

**Feature Branch**: `010-cv-pitch`

**Created**: 2026-11-24

**Status**: Draft

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> CV pitch and personal projects. Short name: cv-pitch.
>
> Why: the CV reads as a list of jobs. The owner wants it to sell: open with the problems they
> solve, and let the experience, projects and skills underneath be the proof a reader can check.
> It should also show that they build their own products, not only client work.
>
> What:
>
> 1. A pitch section, the first section after the intro block: a short tagline, then 2-3 roles,
>    each naming 2-4 problems the owner fixes in that role. It comes from a new top-level field in
>    packages/content/resume.json, validated by content-check (the schema extension and its shape
>    are for the plan). Each problem is plain text, not a link. When the field is absent or empty,
>    the section is left out like any empty section (004 FR-004) and section numbers stay
>    continuous.
> 2. A personal projects section after the client projects section, built from projects[] entries
>    marked as personal (the marking is for the plan). Personal projects have generic names (the
>    products are private and are never named anywhere in the repo), no start or end date, a
>    one-line description, at most two highlights and keywords. An undated entry shows no date
>    line, no "Present" and no stray separator. Each project appears in exactly one of the two
>    sections.
> 3. basics.summary stays as a short summary; it still feeds the page's meta and link-preview
>    description, the intro and the terminal.
> 4. In skills, Next.js moves from "Also Familiar With" to "Web Frameworks & Libraries"; the rest
>    of that group stays.
> 5. Every CV text (summary, work entries, client projects, pitch, personal projects) is rewritten
>    in a short, confident, problem-first voice. The wording is drafted, checked with AI-writing
>    detectors and approved by the owner before the build; the approved text is supplied in
>    specs/010-cv-pitch/content.md and the build copies it into resume.json exactly. The build
>    never invents CV text or metrics.
>
> Shells: /cv (004), the OS shell's CV app (005, shares CvDocument) and the Terminal's cv, about
> and projects output (006, engine/cv.ts) all show the pitch and the personal projects section;
> the terminal labels the two project groups. This feature amends 002 (content rules), 004
> (sections and order), 005 and 006, each named in a requirement. Print: both sections print in the
> one-column print layout. Offline: unchanged, all static. UI feature: interim local mockup for
> the design gate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A recruiter sees what problems the owner solves before the job list (Priority: P1)

A recruiter opens `/cv`, or the CV app the site root opens. Right after the owner's name, role,
summary and contact details, they read a short tagline and two or three roles, each naming the
problems the owner fixes in that role. Below it, the experience, skills and projects are the proof
they can check against those claims.

**Why this priority**: this is the feature's reason to exist. Without the pitch the CV still reads
as a list of jobs, and every other story only adds to it.

**Independent Test**: fill the pitch in the CV document, open `/cv` and the CV app on both shells,
and confirm the pitch is the first section after the intro, with its tagline, every role and every
problem in the CV document's order, and that the other sections follow unchanged.

**Acceptance Scenarios**:

1. **Given** the CV document holds a pitch with a tagline and three roles, **When** a visitor opens
   `/cv`, **Then** the pitch is the first section after the intro block, showing the tagline, then
   each role's name with its problems as a list, in the CV document's order.
2. **Given** the same CV document, **When** a visitor opens the CV app on desktop or on mobile,
   **Then** it shows the same pitch, in the same place, with the same headings as `/cv`.
3. **Given** a problem's text looks like a web address, **When** it is shown, **Then** it is plain
   text, not a link.
4. **Given** the CV document has no pitch, or an empty one, **When** a visitor opens `/cv`,
   **Then** no pitch section, heading or empty space is shown, and the section numbers run from
   `01` with no gap.
5. **Given** a pitch with one role, or a role with five problems, **When** the content check runs,
   **Then** it reports a problem naming the path, and the pull request can't merge.

---

### User Story 2 - A reader sees that the owner builds their own products (Priority: P2)

Below the client projects, a reader finds a separate section of the owner's own products. Each has
a generic name, one line on what it is, at most two highlights and its keywords. There are no
dates, because the products are ongoing side work, and nothing names the real, private products.

**Why this priority**: it is the second gap the owner named, showing initiative beyond client work.
It needs the pitch only to frame it, so it can ship on its own.

**Independent Test**: mark two projects as personal, open `/cv`, and confirm they appear only in
the personal projects section, directly after the client projects section, with no date line, and
that every other project appears only in the client projects section.

**Acceptance Scenarios**:

1. **Given** the CV document has four client projects and two projects marked personal, **When** a
   visitor opens `/cv`, **Then** the client projects section shows the four, the personal projects
   section directly after it shows the two, each in the CV document's order, and no project shows
   in both.
2. **Given** a personal project with no dates, **When** it is shown, **Then** it has no date line,
   no "Present", no separator and no empty space where a date would be.
3. **Given** no project is marked personal, **When** a visitor opens `/cv`, **Then** no personal
   projects section is shown and the section numbers stay continuous.
4. **Given** every project is marked personal, **When** a visitor opens `/cv`, **Then** no client
   projects section is shown and the personal projects section takes its place in the order.
5. **Given** a personal project with a start date, a URL, three highlights, or a description on two
   lines, **When** the content check runs, **Then** it reports a problem naming the path.

---

### User Story 3 - The owner's approved words reach the CV exactly (Priority: P3)

The owner drafts every CV text in a short, confident, problem-first voice, checks it with
AI-writing detectors and approves it in `specs/010-cv-pitch/content.md`. The build copies each
approved text into the CV document exactly, moves Next.js into "Web Frameworks & Libraries", and
writes no CV text or number of its own.

**Why this priority**: the pitch only sells if the rest of the CV backs it in the same voice, and
the owner's trust depends on nothing being invented. It depends on the owner's content, which can
arrive after the structure is built.

**Independent Test**: compare every summary, work, project and pitch text in the CV document with
`content.md`, character for character, and confirm the skills groups.

**Acceptance Scenarios**:

1. **Given** `content.md` holds the owner's approved texts, **When** the feature is built, **Then**
   the summary, every work entry, every client project, the pitch and every personal project in
   the CV document match `content.md` exactly.
2. **Given** `content.md` lacks an approved text for a field the build would change, **When** the
   build reaches it, **Then** it stops and leaves that field for the owner, rather than writing
   one.
3. **Given** the built CV document, **When** a reader looks at skills, **Then** Next.js is in "Web
   Frameworks & Libraries" and not in "Also Familiar With", and every other keyword of "Also
   Familiar With" is still there.
4. **Given** the built CV, **When** a visitor shares the `/cv` link, **Then** the link preview's
   description is the summary, not the pitch.

---

### User Story 4 - A Terminal visitor finds the pitch and both kinds of project (Priority: P4)

A developer uses the Terminal. `about` shows the basics and then the pitch. `projects` shows the
client projects and the personal projects as two labelled groups. `cv` shows the CV document's
JSON, which now holds the pitch and the marking.

**Why this priority**: the Terminal is a second way into the same CV, used by fewer visitors.

**Independent Test**: run `about`, `projects`, `cat about` and `cv` in the Terminal on desktop and
in the pocket terminal, and confirm the pitch and the two labelled groups.

**Acceptance Scenarios**:

1. **Given** a CV document with a pitch, **When** a visitor runs `about`, **Then** the output shows
   the name, label, location and summary, then the tagline and each role with its problems.
2. **Given** client and personal projects, **When** a visitor runs `projects`, **Then** the output
   shows the client projects under one label and the personal projects under another, client
   first, each in the CV document's order, and personal entries show no date line.
3. **Given** no project is marked personal, **When** a visitor runs `projects`, **Then** only the
   client group and its label are shown.
4. **Given** the pocket terminal, **When** a visitor taps the `about` key, **Then** the pitch is
   shown and readable without typing.

---

### User Story 5 - A recruiter prints the CV with the pitch and personal projects (Priority: P5)

A recruiter prints `/cv` on A4 or US Letter. The pitch and the personal projects print in the
one-column print layout, in the same order as on screen.

**Why this priority**: printing already works for every other section; this keeps the new two from
breaking it.

**Independent Test**: print `/cv` to A4 and US Letter and confirm both sections print in order,
in one column, with no heading left alone at the bottom of a page.

**Acceptance Scenarios**:

1. **Given** a CV with a pitch and personal projects, **When** a visitor prints `/cv`, **Then** both
   sections print in the one-column print layout, in the screen order, with no text cut off.
2. **Given** a pitch role's name falls at the bottom of a page, **When** printed, **Then** it moves
   to the next page with its first problem.

---

### Edge Cases

- **Pitch present but empty**: a pitch with no tagline and no roles is treated as absent: no
  section, no heading, numbers continuous.
- **Tagline without roles, or roles without a tagline**: the content check reports a problem, so
  it never reaches the page.
- **A role with no name**: the content check reports a problem; a role's problems never show
  without their role.
- **A problem holding a URL or an email address**: shown as plain text, never a link, and printed
  as written, with no address added after it (004 FR-033 applies only to links).
- **Two personal projects with the same generic name**: the content check reports a duplicate (002
  FR-014, projects are identified by name), so the Terminal never has to tell two undated files
  apart.
- **An undated client project**: any undated entry in any section shows no date line (004 FR-010);
  the timeline shows the entry without a date label and without a stray separator.
- **Personal projects placed between client projects in the CV document**: each section keeps the
  CV document's order of its own entries; the content check's date order (002 FR-036) skips
  undated entries, so the placement is accepted.
- **Only the pitch changes and every project is client work**: the CV shows one more section than
  today, numbered `01`, and every other number moves up by one.
- **A long tagline or problem**: wraps within its column at every width, never overflows (004
  FR-022).
- **Another JSON Resume tool reading the CV document**: it ignores the pitch and shows personal
  projects as ordinary projects; the CV document stays valid against the official schema.
- **`content.md` missing or unapproved when the build starts**: the build does not change CV text;
  the structural work (sections, checks, Terminal) can still be built and tested against fixture
  data.

## Requirements *(mandatory)*

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `010-cv-pitch-FR-###`. UI implementing a requirement carries
`data-req="010-cv-pitch-FR-###"` (Constitution III).

### Functional Requirements

**The pitch**

- **FR-001**: The CV document MAY hold a pitch: a tagline, then two or three roles, each with a
  name and two to four problems the owner fixes in that role. Every part of it is plain text, and
  it is CV content (Constitution IV).
- **FR-002**: `/cv` MUST show the pitch as the first section after the intro block, before every
  other section: the tagline, then each role's name as a heading one level below the section's
  heading, followed by its problems as a list, all in the CV document's order.
- **FR-003**: The tagline, role names and problems MUST be shown as plain text, never as links,
  with every character as written (004 FR-007).
- **FR-004**: A pitch that is absent, or has neither a tagline nor a role, MUST be left out with no
  heading and no empty space (004 FR-004). The section numbers of the shown sections MUST run from
  `01` with no gap, whether or not the pitch is shown.
- **FR-005**: The content check MUST report a problem, naming the path, for a pitch that has roles
  but no tagline, a tagline but no roles, fewer than two or more than three roles, a role without a
  name, a role with fewer than two or more than four problems, an empty text, or a field the pitch's
  shape doesn't define. Its other rules (002 FR-015, FR-028 to FR-031) apply to the pitch.

**Personal projects**

- **FR-006**: Each entry of the CV document's projects MUST be either a personal project, marked as
  such, or a client project, which is any project not marked personal. No entry can be both.
- **FR-007**: `/cv` MUST show the client projects in the projects section and the personal projects
  in a personal projects section directly after it. Every project MUST appear in exactly one of the
  two, and each section MUST keep the CV document's order of its entries.
- **FR-008**: The personal projects section MUST be left out when no project is marked personal,
  and the client projects section when every project is, each with no heading and no empty space,
  and the section numbers MUST stay continuous (FR-004).
- **FR-009**: A personal project MUST show its name as its heading, then its description, its
  highlights and its keywords, whichever the CV document holds. The personal marking itself MUST
  NOT be shown as text; the section it sits in says it.
- **FR-010**: An entry with no start or end date, in any section, MUST show no date line, no
  "Present", no date separator and no empty date label or space, and its heading and content MUST
  stay aligned with the dated entries around it.
- **FR-011**: The content check MUST report a problem, naming the path, for a personal project
  that has a start date, an end date or a URL, more than two highlights, or a description with
  more than one line.
- **FR-012**: The headings of the client and personal projects sections, and the pitch's section
  heading, MUST be site text set by the approved design (004 FR-006), and the two project headings
  MUST tell the two kinds of project apart in words.

**Summary, skills and CV text**

- **FR-013**: The basics summary MUST stay a short summary and MUST remain what the page's
  description and link previews use (004 FR-036), what the intro block shows, and what the
  Terminal's `about` shows as the summary. The pitch MUST NOT be used as the page's description.
- **FR-014**: In skills, Next.js MUST be in "Web Frameworks & Libraries" and MUST NOT be in "Also
  Familiar With". Every other keyword of both groups MUST stay, and every other group MUST be
  unchanged.
- **FR-015**: The basics summary, every work entry's text, every client project's text, the pitch
  and every personal project's text MUST be the texts the owner approved in
  `specs/010-cv-pitch/content.md`, copied into the CV document character for character. The build
  MUST NOT write, change or add a CV text, fact or number that `content.md` doesn't hold. Where
  `content.md` lacks an approved text, the field is left as it is and the gap is reported to the
  owner.

**Other shells**

- **FR-016**: The CV app MUST show the pitch and the personal projects section exactly as `/cv`
  does, in its window on desktop and its full-screen view on mobile, with the same headings,
  order and section numbers.
- **FR-017**: The Terminal's `about` MUST show the pitch after the summary: the tagline, then each
  role's name with its problems, in the CV document's order, as plain text. `cat about` and the
  `about` file MUST show the same (006 FR-047). With no pitch, `about` MUST show what it shows today.
- **FR-018**: The Terminal's `projects` MUST show the client projects and the personal projects as
  two groups, client first, each under its own label in site text and in the CV document's order.
  A group with no entries MUST be left out with its label. A personal project MUST show its name,
  description, highlights and keywords, with no date line (FR-010). With no projects at all,
  `projects` MUST give the reply 006 FR-011 sets.
- **FR-019**: The Terminal's file system MUST hold a file for every personal project, named as 006
  FR-044 names a project's file, and `cat` on it MUST show what `projects` shows for that entry.
  [NEEDS CLARIFICATION: should personal projects' files sit in `~/projects` beside the client
  projects (the default assumed here), or in a folder of their own, such as `~/projects/personal`?]

**Print and accessibility**

- **FR-020**: Printing `/cv` on A4 and on US Letter MUST print the pitch and the personal projects
  section in the one-column print layout, in the screen order, with no text cut off (004 FR-032)
  and no section heading, role name or project heading as the last line on a page (004 FR-034).
- **FR-021**: The pitch and the personal projects section MUST each be a region named by its
  heading (004 FR-025), with no skipped heading levels (004 FR-024), and the problems, highlights
  and keywords MUST be marked as lists (004 FR-026). Both MUST meet 004 FR-027 to FR-031 at every
  width, including with forced colors and reduced motion.
- **FR-022**: The no-JavaScript check (004 FR-052), the CV app check (005 FR-058) and the Terminal
  content check (006 FR-040) MUST cover the pitch and the personal projects, reading what to expect
  from the CV document, not from a hand-written list.

**Amendments of older specs**

- **FR-023**: This feature amends 002-cv-content: FR-008, which reports every field the JSON
  Resume standard doesn't define, MUST accept the pitch and the personal marking, and only them;
  FR-004, which puts data the standard has no place for in the site data document, MUST say that
  the pitch and the marking are CV content and live in the CV document. Its Key Entities gain the
  pitch and the personal marking, and its checks gain FR-005 and FR-011 of this spec.
- **FR-024**: This feature amends 004-cv-page: FR-001's supported sections and order MUST include
  the pitch, first after the intro block, and the personal projects, directly after the projects
  section; the Key Entities' shown-field table MUST list the pitch (tagline, roles, role name,
  problems) and the personal projects (name, description, highlights, keywords); FR-005 MUST NOT
  report the pitch or the marking as unsupported.
- **FR-025**: This feature amends 005-os-shell: FR-006 and FR-009 MUST include the pitch and the
  personal projects section among the sections and headings the CV app shows as `/cv` does.
- **FR-026**: This feature amends 006-terminal: FR-008's rows for `about` and `projects` MUST read
  as FR-017 and FR-018 set, FR-009 MUST cover the pitch's fields, and FR-043 MUST say the `about`
  file holds the pitch and where personal projects' files sit (FR-019).

### Key Entities

- **Pitch**: an optional part of the CV document, shown first after the intro block. Holds a
  tagline and two or three roles.
- **Tagline**: one short line of plain text that opens the pitch.
- **Pitch role**: a role the owner works in, with a name and two to four problems, in the CV
  document's order.
- **Problem**: one plain-text statement of a problem the owner fixes in a role. Never a link.
- **Client project**: a projects entry not marked personal. Shown in the projects section, as
  today.
- **Personal project**: a projects entry marked personal: one of the owner's own products, with a
  generic name, no dates, no URL, a one-line description, at most two highlights, and keywords.
  Identified by its name (002 Key Entities), so two can't share one.
- **Approved content**: `specs/010-cv-pitch/content.md`, the owner-approved wording of every CV text
  this feature rewrites, with the date of the owner's approval. The build copies from it; once
  built, the CV document is again the one source of CV data (Constitution IV).
- **Site text**: the new section headings and the Terminal's two group labels, in English, set by
  the approved design, holding no CV fact (004 FR-006).

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | Yes: in the CV app's window and in the Terminal's `about` and `projects` | - |
| Mobile (iOS-style) | Yes: in the CV app's full-screen view and in the pocket terminal | - |

`/cv`, which is independent of the shells, shows both sections at every width and in print.

**CV path**: Unchanged. The pitch is a section of the CV, not a step in front of it. The CV stays one
click (desktop) or one tap (mobile) from first load, and `/cv` remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully, as today, after one complete online visit.
- **Available offline**: the pitch and the personal projects, in `/cv`, the CV app and the Terminal,
  like every other CV section. They are static text built into the site.
- **Needs the network**: Nothing new.
- **Offline state shown**: the full CV, unchanged. No offline banner, as nothing is missing.

## Design *(mandatory)*

**UI change**: `/cv` and the CV app gain two sections, the timeline gains an undated entry, and the
Terminal's `about` and `projects` output change, so the design gate applies to those parts
(Constitution II). Design artifacts live in `specs/010-cv-pitch/design/`:

- [ ] ASCII wireframes of `/cv` at a phone width and a desktop width, and in print, showing the
  pitch, the client projects, the personal projects with an undated entry, and the section
  numbers; of the CV app in its desktop window and mobile full-screen view; and of the Terminal's
  `about` and `projects` output, on desktop and in the pocket terminal
- [ ] PNG exports of the interim local mockup, per supported shell, at every width the gate needs
  (interim provision)
- [ ] Penpot file link: not needed for an interim local mockup until the provision ends
- [ ] `review.md` sign-off by the project owner, naming the interim local mockup, its commit and
  date

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On `/cv`, in the CV app on both shells and in the Terminal's `about`, a reader reaches
  the pitch before any job, project or skill, on all four surfaces.
- **SC-002**: Every problem in the approved pitch can be traced, in `content.md`, to at least one
  work entry, project or skill below it that backs it.
- **SC-003**: 100% of the CV texts FR-015 lists match `content.md` character for character, and no
  CV text or number in the CV document is missing from `content.md` or the CV as it was before this
  feature.
- **SC-004**: Every project appears exactly once across the two project sections on `/cv`, in the
  CV app and in the Terminal, for every combination of client-only, personal-only, mixed and no
  projects.
- **SC-005**: No undated entry shows a date, "Present" or a separator, on any surface or in print.
- **SC-006**: `/cv` still scores 90 or more in every Lighthouse category on both profiles, the
  accessibility checks still find no WCAG 2.2 AA violation, and the whole CV still prints on A4 and
  US Letter with nothing cut off.
- **SC-007**: No real name of a personal product appears anywhere in the repository, including its
  history from this feature's commits on, in the CV document, `content.md`, the mockup, tests and
  pull request text.

## Assumptions

- **Privacy**: the personal products are private. Their real names, URLs and other identifying
  details are never written in the repository, as the constitution's public-process rule already
  requires of `specs/`. The owner checks this when approving `content.md` and the mockup; no
  automated check can look for a name the repository must not hold. Leaving out the URL (FR-011)
  is the one guard a check can enforce.
- **Content first, structure regardless**: drafting, the AI-writing detector checks and the owner's
  approval happen outside the build, before it copies the text. The detectors used and the approval
  date are recorded in `content.md`; the owner judges the results, with no fixed score. The voice
  this feature asks for replaces the plain, formal voice approved on 2026-11-02; the rules that no
  metric is invented and that drafts are shown before they are applied still hold.
- **`content.md` is a record, not a second source**: once copied, the CV document is the one source
  (Constitution IV). Later CV edits change the CV document only. How FR-015 is tested without
  making `content.md` a lasting second source is for the plan.
- **Next.js position**: within "Web Frameworks & Libraries", Next.js follows React unless
  `content.md` sets another place.
- **Pitch numbering**: the pitch counts as a shown section and takes `01` when shown; every other
  number moves up by one. The approved design may change how the pitch is numbered, as long as the
  numbers of the shown sections stay continuous.
- **One line**: a personal project's description is one line when it holds no line break; how long
  it may run is the approved content's choice, and it wraps on screen like any text.
- **Pitch and marking shape**: the schema extension, the field names, and how a project is marked
  personal are for the plan (002 FR-005-style written rules apply). The CV document stays valid
  against the official JSON Resume 1.3.1 schema.
- **Unchanged**: the basics label, education, languages, interests and every skills group but the
  two FR-014 names; the page's title (004 FR-036); `cv.json` and `cv`, which show the CV document's
  JSON as it is and so include the pitch and the marking with no change (006 FR-055, FR-059); the
  order of the other sections (Experience, Skills, Projects, Education, Languages, Interests).
- **Dependencies**: 002 (content source and check), 004 (`/cv` and its checks), 005 (CV app, which
  shares the CV document view with `/cv`), 006 (Terminal). `docs/vision.md` is unchanged.
