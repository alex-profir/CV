# Feature Specification: CV Content Source

**Feature Branch**: `002-cv-content`

**Created**: 2026-10-21

**Status**: Approved

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description (with the owner's current CV attached as a JSON Resume file):

> CV content source. Short name: cv-content.
>
> Why: Principle IV says all CV data lives in one place and nothing hardcodes it. Every later
> feature (the /cv page and PDF, the CV app, Terminal, Contact) reads from it, so it comes first.
> The CV follows the JSON Resume standard so it stays portable: any JSON Resume tool can use it
> unchanged, which is part of the showcase.
>
> Who uses it: the owner, when editing the CV; later features, which read it; reviewers, who see
> the check results on pull requests. It has no visitor-facing behavior yet.
>
> What it does:
>
> - All CV data (basics, work, education, skills, projects, languages and so on) lives in one
>   CV document following the JSON Resume standard, filled with my real CV.
> - Data only the site needs, which the standard has no place for, lives in a separate site data
>   document. The CV document never carries site-only fields.
> - Both documents are checked on every pull request and locally with one command, with the same
>   result, and without network access. The CV document is checked against the official JSON
>   Resume schema. The site data document is checked against its own rules.
> - The check fails when the CV document contains fields the standard doesn't define, so
>   site-only data can't creep in and break portability.
> - The check fails when site data refers to a CV entry that doesn't exist (for example a project
>   or profile), so renaming or removing an entry can't leave dangling references.
> - Code that reads the content gets a description of its shape, so reading a field that doesn't
>   exist fails the checks before merge, not at runtime.
> - A check fails when key CV facts (at least my name, email and phone, if published) appear
>   written out in the site's own source outside the content source. Specs, docs and test
>   fixtures are not checked.
> - Every problem is reported with the document, the field path and what is wrong, all in one run,
>   followed by a summary.
> - The repo is public: the CV document holds only details I choose to publish.
>
> Edge cases: a document that isn't valid syntax; an empty optional section; partial dates
> (year only, year and month); a current role with no end date; non-ASCII characters in names and
> places; the same entry listed twice.
>
> Out of scope: displaying the CV anywhere (the /cv page and PDF are the next features); design
> tokens; the web app and deploys; translations (a non-goal); how the Contact app works.
>
> Shell scope: not a UI feature. Neither shell is affected, and the CV path is unchanged (no
> shells exist yet).
> Offline: no visitor-facing offline behavior. The checks must run fully offline.
> Design: No UI. Keep the spec free of tool, language and CI-provider choices; the plan decides
> those.

## Clarifications

### Session 2026-10-21

- Q: Which contact details does the CV document publish in the public repo? → A: Email only.
  The phone number is left out entirely, so the hardcoded-facts check searches for the owner's
  name and email (FR-003).
- Q: Should the check require certain CV fields to always be present, even though the standard
  makes every field optional? → A: No. Every field stays optional, as the standard says, and
  code that reads the content must handle the absence of any field, including the name
  (FR-026, FR-027).
- Q: Should the hardcoded-facts check skip all test code, or only test fixtures? → A: All test
  code, tests and fixtures alike. Only the files that make up the site are searched (FR-022,
  FR-024).
- Q: Should the CV document include a photo of the owner? → A: No photo for now. The `image`
  field is left out, and adding one later is a content edit (FR-003).
- Q: Should the check require dated entries to be listed newest first in the CV document? →
  A: Yes. In every dated section, ongoing entries come first, then the rest by start date,
  latest first. The check reports any entry out of order (FR-036).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keep the whole CV in one portable document (Priority: P1)

The owner keeps the entire CV in one document that follows the JSON Resume standard. They edit
it in one place, run the check, and learn straight away whether the document is still valid
and still portable, meaning any JSON Resume tool can read it unchanged.

**Why this priority**: every later feature (the `/cv` page and PDF, the CV app, Terminal,
Contact) reads from this document. Without it, Principle IV has nothing to point at, and
nothing stops a field outside the standard from breaking portability.

**Independent Test**: with only the CV document and its check in place, run the check on the
real CV and confirm it passes. Add a field the standard doesn't define, such as `picture` under
`basics`, and confirm the check fails and names the document and the field path.

**Acceptance Scenarios**:

1. **Given** the CV document holds the owner's real CV and meets the standard, **When** the
   owner runs the check, **Then** it passes and reports that the CV document was checked.
2. **Given** the CV document has a `picture` field under `basics`, which the standard does not
   define, **When** the check runs, **Then** it fails and reports the CV document, the path
   `basics.picture`, and that the field is not defined by the standard.
3. **Given** a work entry with an unknown field `featured: true`, **When** the check runs,
   **Then** it fails and reports the path `work[0].featured`, even though the official schema
   alone would accept it.
4. **Given** a work entry with the start date `2018-07` and no end date, **When** the check
   runs, **Then** the entry is accepted as a current role.
5. **Given** an education entry whose institution is `Politehnica University of Timișoara`,
   **When** the check runs, **Then** the text is accepted, and it reads back with every
   character exactly as written.
6. **Given** the owner's machine has no network connection, **When** the owner runs the check,
   **Then** it completes and gives the same result as with a connection.

---

### User Story 2 - Keep site-only data separate and its references sound (Priority: P2)

Some data matters only to the site, and the standard has no place for it. The owner keeps it
in a separate site data document. When site data points at a CV entry, such as a project or a
profile, the check makes sure that entry exists, so renaming or removing an entry can't leave
a dangling reference.

**Why this priority**: later features need somewhere to put site-only data. Without a separate,
checked document, that data either leaks into the CV document and breaks portability, or goes
stale silently when the CV changes.

**Independent Test**: add a site data entry that refers to a project by name. Run the check and
confirm it passes. Rename the project in the CV document only, run the check again, and confirm
it fails and names the site data path and the missing project.

**Acceptance Scenarios**:

1. **Given** site data refers to the project `Guided Tours System`, and the CV document lists
   that project, **When** the check runs, **Then** the reference is accepted.
2. **Given** that project is renamed to `City Tours App` in the CV document only, **When** the
   check runs, **Then** it fails and reports the site data path holding the reference, the
   value `Guided Tours System`, and that no project of that name exists in the CV document.
3. **Given** site data refers to the profile `GitHub`, and the CV document lists no GitHub
   profile, **When** the check runs, **Then** it fails and reports the reference as pointing
   to a profile that doesn't exist.
4. **Given** site data contains a field its rules don't define, **When** the check runs,
   **Then** it fails and reports the site data document, the field path, and that the field is
   not defined.
5. **Given** site data contains the owner's email address written out, **When** the check runs,
   **Then** it fails and reports that the owner's email is hardcoded in site data, which should
   refer to the CV document instead.

---

### User Story 3 - Block CV facts hardcoded outside the content source (Priority: P3)

When the owner's name, email or phone appears written out in the site's own source, outside
the content source, the check fails and says where. That way a change to the CV is always one
edit, and no page or app can drift from the CV.

**Why this priority**: Constitution IV says hardcoded CV data blocks merge. It matters as soon
as the first feature reads the content, which is the next feature.

**Independent Test**: add a source file that contains the owner's email address. Run the check
and confirm it fails and names the file, line and fact. Put the same address in a spec, a doc,
a test and a test fixture, and confirm none of those is reported.

**Acceptance Scenarios**:

1. **Given** a site source file contains the owner's email address, **When** the check runs,
   **Then** it fails and reports the file, the line, and that the owner's email is hardcoded.
2. **Given** a site source file contains the owner's name in different letter case, such as
   `ALEX PROFIR`, **When** the check runs, **Then** it is reported.
3. **Given** a test CV document that publishes a phone number, and a source file that contains
   the same number with spaces between the digit groups, **When** the check runs, **Then** it
   is reported.
4. **Given** the real CV document publishes no phone number, **When** the check runs, **Then**
   it searches for the owner's name and email only.
5. **Given** the owner's name appears in a spec, a documentation file, a test and a test
   fixture, **When** the check runs, **Then** none of them is reported.
6. **Given** the owner changes their email in the CV document, **When** the check runs, **Then**
   it looks for the new address, with no other edit needed.

---

### User Story 4 - Code that reads the content knows its shape (Priority: P4)

Later features read the content through a description of both documents' shape. When code
reads a field that doesn't exist, or relies on an optional field always being present, the
project's checks fail before merge, not when a visitor loads a page.

**Why this priority**: it protects every later feature, but nothing reads the content yet. It
must be in place before the next feature starts, not before this one is usable.

**Independent Test**: write a small piece of code that reads `basics.name` and handles its
absence, and one that reads `basics.nickname`. Run the project's checks and confirm the first
passes and the second fails before merge, naming the field.

**Acceptance Scenarios**:

1. **Given** code that reads `basics.name` through the content source and handles the name
   being absent, **When** the project's checks run, **Then** they pass.
2. **Given** code that uses `basics.name` as if it were always present, **When** the project's
   checks run, **Then** they fail, because every field of the CV document is optional.
3. **Given** code that reads `basics.nickname`, which the standard does not define, **When**
   the project's checks run, **Then** they fail and name the field and the code location.
4. **Given** code that uses `work[0].endDate` as if it were always present, **When** the
   project's checks run, **Then** they fail, because the field is optional.
5. **Given** the site data rules gain a new field, **When** code reads it, **Then** the checks
   pass, with no separate, hand-written description to update.

---

### Edge Cases

- **A document that isn't valid syntax**: reported with the document and the line and column
  where reading failed. The other document is still checked. Checks that need the unreadable
  document, such as site data references or the hardcoded facts search, are reported as not
  run, and the check fails.
- **A document that is missing**: reported, and the check fails.
- **An empty optional section**, such as `"projects": []`, or an optional section left out
  entirely: accepted.
- **Partial dates**: a year (`2018`), a year and month (`2018-07`) and a full date
  (`2018-07-29`) are all accepted. Other forms, such as `2018/07`, `July 2018` or `18-07`, are
  reported.
- **Dates that match the form but don't exist**, such as `2020-13` or `2021-02-30`: reported.
- **An end date before its start date**: reported. Dates of different precision are compared
  at the precision they share, so a start of `2020-05` and an end of `2020` are accepted.
- **A current role with no end date**: accepted as ongoing.
- **Non-ASCII characters** in names and places, such as `Timișoara`: accepted and kept exactly.
  Text that differs only in how the same characters are encoded counts as equal wherever the
  check compares text.
- **The same entry listed twice** in one section: reported with the path of every occurrence.
  Two entries count as the same when their identifying fields match (see Key Entities). Two
  roles at the same company with different start dates are different entries.
- **Entries out of order** in a dated section: reported with the path of the entry and the
  entry it should come before. An ongoing role listed after a finished one is out of order.
  Entries with no date are not checked for order.
- **An entry missing an identifying field**: accepted, as every field is optional. For
  duplicates, a missing field matches only another missing field. Site data can't refer to an
  entry by a field it doesn't have, so such a reference is reported as dangling.
- **Text with leading or trailing spaces**, such as `"Politehnica University of Timișoara "`:
  reported, because it breaks comparisons and references.
- **Placeholder values**, such as a URL on an `example.com` domain or the JSON Resume sample's
  `meta` values: reported.
- **A detail the owner doesn't publish**: left out of the CV document, not kept as an empty
  value. A key fact that isn't published is not searched for.
- **Site data that refers to an entry listed twice** in the CV document: the duplicate is
  reported, and the reference is reported as ambiguous.
- **The CV document's `$schema` link**: allowed, as the standard defines it, and never fetched.
- **Key facts in files that aren't site source**: specs, documentation, tests and test
  fixtures, the CV document, the project's own tooling, third-party code, generated files and
  version-control data are not searched. The site data document is searched.

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `002-cv-content-FR-###`. UI implementing a requirement carries
`data-req="002-cv-content-FR-###"` (Constitution III).

### Functional Requirements

**The CV document**

- **FR-001**: All CV data MUST live in one CV document that follows version 1.0.0 of the JSON
  Resume standard.
- **FR-002**: The CV document MUST hold the owner's real CV, with at least these sections
  filled in: basics (name, label, summary, location and profiles), work, education, skills,
  projects, languages and interests.
- **FR-003**: The CV document MUST hold only details the owner has chosen to publish. Of the
  owner's contact details, it publishes the email address only. The phone number, the street
  address and a photo are not published. A detail that isn't published MUST be left out, not kept as
  an empty value.

**The site data document**

- **FR-004**: Data the site needs, which the standard has no place for, MUST live in a separate
  site data document, and never in the CV document.
- **FR-005**: The site data document MUST have its own written rules that define every field
  it may contain, which fields are required, and which values each accepts. A later feature
  that adds site data MUST add its rules in the same change.
- **FR-006**: Site data MUST refer to a CV entry by a value the entry already carries in the CV
  document, such as a project's name or a profile's network, so the CV document needs no extra
  field to be referred to.

**Checking the CV document**

- **FR-007**: The check MUST validate the CV document against the official JSON Resume schema
  for version 1.0.0.
- **FR-008**: The check MUST report a problem for every field, at any depth, that the standard
  does not define, including where the official schema itself would accept unknown fields.
- **FR-009**: The check MUST accept a date written as a year, a year and month, or a full date,
  and MUST report a problem for any other form and for any date that does not exist.
- **FR-010**: The check MUST report a problem for an entry whose end date is before its start
  date, comparing the two at the precision they share.
- **FR-011**: The check MUST accept an entry with a start date and no end date, as an ongoing
  entry.
- **FR-012**: The check MUST report a problem for a country code that isn't a two-letter
  ISO 3166-1 code, an email address that isn't well formed, and a URL that isn't an absolute
  web address, as the standard describes them.
- **FR-013**: The check MUST accept an optional section that is empty or left out.
- **FR-014**: The check MUST report a problem when a section lists the same entry more than
  once, and MUST name the path of every occurrence. Entries are the same when their identifying
  fields match (see Key Entities).
- **FR-015**: The check MUST report a problem for a text value with leading or trailing spaces.
- **FR-016**: The check MUST report a problem for placeholder values: URLs on the `example.com`,
  `example.org` or `example.net` domains, and the `meta` values copied from the JSON Resume
  sample CV.
- **FR-036**: In every dated section (work, volunteer, education, projects, awards,
  certificates and publications), the check MUST report a problem for an entry out of order.
  Entries are ordered newest first: ongoing entries first, then the others; within each group,
  by start date (or the section's single date), latest first. Dates are compared at the precision
  they share, and entries whose dates are equal at that precision may be in either order. An
  entry with no date is not checked for order.

**Checking the site data document**

- **FR-017**: The check MUST validate the site data document against its rules (FR-005), and
  MUST report a problem for every field the rules don't define.
- **FR-018**: The check MUST report a problem for every reference from site data to a CV entry
  that doesn't exist, naming the site data path, the value referred to and the kind of entry
  expected.
- **FR-019**: The check MUST report a problem for a reference that matches more than one CV
  entry.

**Text**

- **FR-020**: Both documents MUST keep every character exactly as written, including
  non-ASCII characters. The check MUST NOT report non-ASCII characters as problems.
- **FR-021**: Wherever the check compares text (duplicates, references and key facts), text
  that differs only in how the same characters are encoded MUST count as equal.

**Hardcoded CV facts**

- **FR-022**: The check MUST report every occurrence of a key CV fact written out in the files
  that make up the site, including the site data document. Key facts are the
  owner's name, and their email and phone when the CV document publishes them.
- **FR-023**: The check MUST read the key facts from the CV document, so changing a fact there
  needs no other edit for the check to follow it.
- **FR-024**: The check MUST NOT search specs, documentation, tests, test fixtures, the CV
  document, the project's own tooling, third-party code, generated files or version-control
  data.
- **FR-025**: The check MUST match the name and email regardless of letter case, and MUST match
  the phone number when its digits appear in the same order separated only by spaces, hyphens,
  dots or parentheses, with or without the international prefix.

**Shape for code that reads the content**

- **FR-026**: The content source MUST give code that reads it a description of the shape of
  both documents, produced from the same rules the check uses, so the description and the check
  can't disagree. Every field of the CV document MUST be described as possibly absent, as the
  standard makes all of them optional, including the name.
- **FR-027**: The project's checks MUST fail before merge when code reads a field the
  description doesn't define, or uses an optional field without handling its absence, and MUST
  name the field and the code location.

**Report**

- **FR-028**: The check MUST report every problem it finds in a single run, not stop at the
  first one. A document that can't be read MUST NOT stop the checks that don't need it.
- **FR-029**: Each problem MUST state the document or file, the field path or the line, and
  what is wrong. A syntax problem MUST give the line and column where reading failed.
- **FR-030**: Every run MUST end with a summary giving the documents checked, the number of
  files searched for key facts, the number of problems of each type, and any checks that could
  not run. A passing run MUST say that both documents are valid and no key facts are hardcoded.
- **FR-031**: Two runs over the same files MUST produce the same report, with problems listed in
  the same order.
- **FR-032**: The check MUST report a problem when either document is missing, and MUST fail
  when it reports at least one problem.

**Running**

- **FR-033**: The check MUST run on every pull request. When it fails, the pull request MUST NOT
  be mergeable, under the same repository rules as the requirement traceability check.
- **FR-034**: The owner MUST be able to run the check locally with one command. Over the same
  files, it MUST give the same result and the same report as the pull-request run.
- **FR-035**: The check MUST make no network requests. It MUST NOT fetch the official schema or
  the address in the CV document's `$schema` field.

### Key Entities

- **CV document**: the owner's CV in JSON Resume 1.0.0 form. It is the only source of CV facts.
  Its sections are basics, work, volunteer, education, awards, certificates, publications,
  skills, languages, interests, references, projects and meta.
- **Site data document**: data only the site needs. It holds no CV facts, only references to CV
  entries and site-only values, and has its own rules.
- **Site data rules**: the definition of every field the site data document may hold, which
  fields are required, which values they accept, and which fields are references to CV entries.
- **CV entry**: one item in a CV section list, such as one role, one project or one profile.
  Its identifying fields decide whether two entries are the same and how site data refers to
  it:

  | Section | Identifying fields |
  |---------|--------------------|
  | Profiles | network |
  | Work, volunteer | organization name, position, start date |
  | Education | institution, area, study type, start date |
  | Projects | name |
  | Skills, interests | name |
  | Languages | language |
  | Awards, certificates, publications | title or name, and date (release date for publications) |
  | References | name |

- **Reference**: a value in site data that names a CV entry by its identifying field, with the
  kind of entry it expects (for example "a project").
- **Key CV fact**: the owner's name, email or phone, as published in the CV document.
- **Shape description**: what code that reads the content sees of both documents: every field,
  its kind of value, and whether it may be absent.
- **Problem**: a finding that fails the check. Its type is one of: unreadable document, missing
  document, schema violation, undefined field, invalid date, end before start, invalid format,
  duplicate entry, entry out of order, untrimmed text, placeholder value, dangling reference,
  ambiguous reference, or hardcoded CV fact. It carries the document or file and the
  field path or line.
- **Report**: the list of problems in a stable order, followed by the summary.

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | No: not a UI feature | Not shown. Nothing changes for visitors. |
| Mobile (iOS-style) | No: not a UI feature | Not shown. Nothing changes for visitors. |

**CV path**: Unchanged. No shells exist yet. Once they do, the CV stays one click (desktop) or
one tap (mobile) from first load, and `/cv` remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully. The content is part of the project, and the check makes no network
  requests, locally or on a pull request.
- **Available offline**: nothing visitor-facing yet. The owner can edit the content and run the
  full check without a connection.
- **Needs the network**: Nothing.
- **Offline state shown**: Not applicable. The feature has no visitor-facing state.

## Design *(mandatory)*

**No UI**: this feature adds or changes no user interface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a sample seeded with at least one case of every problem type and edge case in
  this spec, the check reports 100% of the seeded problems and no others.
- **SC-002**: The CV document is read without errors by at least two independent JSON Resume
  tools, used unchanged.
- **SC-003**: Changing any CV fact, such as the email address, takes exactly one edit, in the CV
  document, and every check still passes with no other change.
- **SC-004**: Renaming or removing a CV entry that site data refers to fails the check every
  time, until site data is updated.
- **SC-005**: For the same files, the local run and the pull-request run give the same result
  and identical reports every time.
- **SC-006**: The check completes with the network turned off, in under 10 seconds on the
  owner's machine for the whole repository.
- **SC-007**: For every reported problem, a reviewer can go straight to the document and field,
  or the file and line, using only the report.
- **SC-008**: When this feature is merged, the check passes on the repository, and every
  requirement in this spec is covered by at least one test.

## Assumptions

- **Users**: the owner is the only author of the content. Reviewers read results on pull
  requests. Visitors see nothing from this feature until the `/cv` feature.
- **Standard version**: JSON Resume 1.0.0, the latest release and the version the owner's
  current CV declares. Moving to a later version is a change to this spec.
- **Starting content**: the owner's current CV, as attached, is the starting point. Where it
  doesn't meet the standard, it is converted without changing any fact. For example, `picture`
  is not a 1.0.0 field (the standard calls it `image`), work entries name the organization in
  `name` rather than `company`, and the country is the code `RO`, not `Romania`. Entries are reordered newest first,
  as FR-036 requires. Placeholder
  values in it are removed: the sample photo URL goes, as no photo is published, and the sample
  `meta` values are removed or replaced with real ones. The owner reviews the result before merge.
- **Initial site data**: this feature creates the site data document and its rules. It holds
  only what this feature needs, which may be no more than its structure. Later features add
  their fields and rules. Reference checking is proven with test fixtures until real references
  exist.
- **Documentation** includes the README, license files and everything under `docs/`.
- **Tests and test fixtures** are files that exist only to test the project's checks and code.
  They never ship with the site, so they may write out the owner's real facts or use made-up
  ones.
- **Files that make up the site** are the source of the site's pages, apps, shells and shared
  packages, plus the site data document. The project's own tooling, such as the checks, is not
  part of the site.
- **Site name**: the vision lists "Alex Profir" as a possible site name. If chosen, wherever the
  site shows it, it is read from the content source like any other key fact.
- **Unlisted facts**: other CV facts, such as profile handles or employer names, are not searched
  for. Review catches those. The repository's own address, which contains the owner's GitHub
  handle, is not a key fact.
- **Blocking merge** reuses the repository rules set up by the requirement traceability feature:
  required checks, no direct pushes to the main branch, and no bypass.
- **Out of scope**:
  - Displaying the CV anywhere. The `/cv` page and PDF are the next features.
  - Design tokens.
  - The web app and deploys.
  - Translations, a non-goal in the vision.
  - How the Contact app works, including whether contact details beyond those in the CV document
    are offered.
  - Spelling and wording of the CV text. The owner reviews that.
- **Depends on**: Constitution IV, the requirement traceability check (001), and the official
  JSON Resume 1.0.0 schema.
