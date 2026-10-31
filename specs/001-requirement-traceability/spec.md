# Feature Specification: Requirement Traceability Check

**Feature Branch**: `001-requirement-traceability`

**Created**: 2026-10-21

**Status**: Approved

**Amended**: 2026-10-29: the full test run moves to the owner's machine, proven before merge by a
sign-off on the pull request's head commit, and pull requests run only the fast checks (see
Clarifications, Session 2026-10-29, and Constitution 1.4.0, Merge requirements). Approved
2026-10-21; the amendment approved by the owner 2026-10-29.

**Amended**: 2026-10-30, by 006-terminal: the `site` job's limit rises to 12 minutes (SC-008; see
Clarifications, Session 2026-10-30). Approved by the owner 2026-10-30.

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description:

> Requirement traceability check. Short name: requirement-traceability.
>
> Why: Principle III of the constitution says every requirement maps to at least one test and CI
> fails otherwise. Today nothing enforces that. This check makes the rule real, so the owner, PR
> reviewers and anyone reading the public repo can trust that every approved requirement is
> tested.
>
> Who uses it: the owner, while working and before opening a PR, and reviewers reading PR
> results. It has no visitor-facing behavior.
>
> What it does:
>
> - Finds every functional requirement (FR-###) in every spec under specs/ whose Status is
>   Approved. Draft specs are ignored. Requirements marked as removed are ignored.
> - Finds which automated tests reference each requirement, using the ID form
>   \<feature\>-FR-###, where \<feature\> is the spec's directory name.
> - Fails when any active requirement in an approved spec has no test that references it.
> - Also fails when a test or a data-req attribute references a requirement ID that doesn't
>   exist or was removed, so typos and stale references can't hide.
> - Reports each problem with the requirement ID and the file where it was found or expected,
>   plus a summary. A passing run says how many requirements were checked and covered.
> - Runs on every pull request and blocks merge when it fails. It can also be run locally with
>   the same result, without network access.
> - Applies to its own spec: once this spec is approved, its own requirements must be covered
>   too.
>
> Edge cases: no approved specs yet (passes and says so); a malformed requirement ID; the same
> ID defined twice in one spec; a test that references several requirements.
>
> Out of scope: checking that tests pass (the normal test run does that); checking that every
> UI requirement has a data-req element; the visitor-facing requirement inspector, which is a
> later feature.
>
> Shell scope: not a UI feature. Neither shell is affected, and the CV path is unchanged.
> Offline: no visitor-facing offline behavior. The check itself must run fully offline.
> Design: No UI. Keep the spec free of tool, language and CI-provider choices; the plan decides
> those.

## Clarifications

### Session 2026-10-21

- Q: Do skipped, disabled or placeholder tests count as covering a requirement? → A: No. Tests
  marked in the code as skipped, disabled or placeholders don't count (FR-012).
- Q: Should the check also report malformed and duplicate requirement IDs in Draft specs? → A:
  No. Draft specs are checked only for a valid Status. Their requirements stay valid reference
  targets.
- Q: Does a requirement ID on a group of tests count for every test inside it? → A: Yes. A
  test is covered by the IDs on its own name or tags and on those of every group it belongs to.
- Q: When the check fails, can anyone, including the owner, still merge or push to the main
  branch? → A: No. Changes reach main only through pull requests, and nobody can bypass a
  failing check.
- Q: Besides listing problems, should the check also produce the full map of which tests cover
  each requirement? → A: Not now. The check reports only problems and the summary.
- Q: If the check can't read a file it needs, such as a test file with a syntax error, should
  the check fail? → A: Yes. The file is reported as a problem with its path (FR-029).

### Session 2026-10-29 (the local run and its sign-off)

- Q: Every pull request takes about 19 minutes to test, most of it the site check's own tests,
  which build the site again and again. Where should the full test run happen? → A: On the
  owner's machine, before merge. Pull requests run only the fast checks and the site's checks.
  A sign-off recorded on the exact commit proves the full run passed there, and a pull request
  can't merge without it (FR-030 to FR-037).
- Q: Who can sign off? → A: Only the owner's local full run, with the owner's own credentials.
  The pull requests' checks never record it, and every new commit needs a new run (FR-034).
- Q: Does this change the traceability check itself? → A: No. FR-001 to FR-029 are unchanged.
  The amendment adds the run around the tests and the sign-off; the check still reads every
  test, wherever it runs (FR-030).

### Session 2026-10-30 (from 006-terminal)

- Q: The site check now runs the Terminal's lines in both shells and 007's inspector, and the `site`
  job takes about 5.5 minutes on the hosted runner; two of its last three runs were cancelled at
  the 6-minute limit. Make the job faster or raise its limit? → A: Raise the `site` job's limit to
  12 minutes. The other jobs keep 6 minutes (SC-008, amended by 006-terminal).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find untested requirements before opening a PR (Priority: P1)

The owner runs the check on their own machine while working. It reads every approved spec,
finds the tests that reference each requirement, and lists every active requirement that no
test references. When everything is covered, it says how many requirements it checked.

**Why this priority**: this is the rule in Constitution III. Without it, "every requirement is
tested" is a claim nobody verifies. The other stories build on this one.

**Independent Test**: on a copy of the project with one approved spec and tests that cover only
some of its requirements, run the check and confirm it fails and names exactly the uncovered
requirements. Add the missing tests and confirm it passes.

**Acceptance Scenarios**:

1. **Given** an approved spec `002-example` that defines FR-001, FR-002 and FR-003, and tests
   that reference only `002-example-FR-001` and `002-example-FR-002`, **When** the owner runs
   the check, **Then** it fails and reports `002-example-FR-003` as uncovered, with the spec
   file and line where FR-003 is defined.
2. **Given** every active requirement in every approved spec is referenced by at least one test,
   **When** the owner runs the check, **Then** it passes and reports how many approved specs
   and requirements it checked, and that all of them are covered.
3. **Given** a spec whose Status is Draft, which has no tests and defines FR-002 twice,
   **When** the owner runs the check, **Then** that spec causes no problem.
4. **Given** an approved spec where FR-002 is marked as removed and no test references it,
   **When** the owner runs the check, **Then** FR-002 is not reported.
5. **Given** one test whose name references both `002-example-FR-001` and
   `002-example-FR-003`, **When** the owner runs the check, **Then** both requirements count as
   covered.
6. **Given** the owner's machine has no network connection, **When** the owner runs the check,
   **Then** it completes and gives the same result as with a connection.
7. **Given** the only test that references `002-example-FR-003` is marked as skipped, **When**
   the owner runs the check, **Then** it fails and reports `002-example-FR-003` as uncovered,
   noting that only skipped, disabled or placeholder tests reference it.

---

### User Story 2 - Block merging when the check fails (Priority: P2)

Every pull request runs the check. If it fails, the pull request cannot be merged. A reviewer
reads the problems in the pull request's check results, without running anything locally.

**Why this priority**: Constitution III requires CI to fail when a requirement in an approved
spec has no test. A check that only runs when the owner remembers does not enforce anything.

**Independent Test**: open a pull request that leaves a requirement in an approved spec
uncovered. Confirm the check fails, the pull request cannot be merged, and the check results
name the requirement. Push a test that covers it and confirm merging is unblocked.

**Acceptance Scenarios**:

1. **Given** a pull request whose changes leave an active requirement in an approved spec
   uncovered, **When** the pull request's checks run, **Then** the check fails and the pull
   request cannot be merged.
2. **Given** that failing pull request, **When** a reviewer opens its check results, **Then**
   they see the same problems and summary the owner would see running the check locally on the
   same files.
3. **Given** a follow-up commit that adds the missing test, **When** the checks run again,
   **Then** the check passes and the pull request can be merged.
4. **Given** a pull request whose check fails, **When** the owner tries to merge it anyway, or
   to push the same change straight to the main branch, **Then** both are refused.

---

### User Story 3 - Catch mistyped and stale references (Priority: P3)

Tests and UI elements refer to requirements by ID. When an ID is mistyped, or points to a
requirement that was removed, the check fails and says where the bad reference is, so a
wrong reference can't pass for coverage.

**Why this priority**: coverage counts are only as good as the references behind them. A typo
can leave a requirement looking untested while a test exists, or point at nothing at all. This
matters as soon as there are several specs and many tests.

**Independent Test**: add a test and a `data-req` attribute that reference a requirement that
doesn't exist, one that was removed, and one with a malformed ID. Run the check and confirm
each is reported with its file and line.

**Acceptance Scenarios**:

1. **Given** a test whose name references `002-example-FR-009`, and the `002-example` spec
   defines no FR-009, **When** the check runs, **Then** it fails and reports
   `002-example-FR-009` as unknown, with the test file and line.
2. **Given** a `data-req` attribute that references `002-example-FR-002`, which is marked as
   removed, **When** the check runs, **Then** it fails and reports the reference as pointing to
   a removed requirement, with the file and line.
3. **Given** a test that references `099-missing-FR-001`, and no spec directory is named
   `099-missing`, **When** the check runs, **Then** it fails and reports the reference as
   unknown.
4. **Given** a test whose name contains `FR-001` with no feature prefix, **When** the check
   runs, **Then** it fails and reports the reference as malformed.
5. **Given** a test that references a requirement defined in a Draft spec, **When** the check
   runs, **Then** that reference is accepted and not reported.

---

### User Story 4 - Prove the full test run before merge (Priority: P4) *(added 2026-10-29)*

The owner finishes a change and pushes it. The pull request's checks finish in a few minutes:
type checking, the fast tests, this check, the content and token checks, and the site's checks.
On their own machine, on a clean checkout of that commit, they run the full test run with one
command: every test, every browser test included. It passes, and they sign the commit off. The
pull request now shows a passing `local-verify` check naming what ran, and it can merge. They
push one more fix, and the pull request is blocked again until they run it on the new commit.

**Why this priority**: the full suite is what proves every requirement's test passes, but run
on every pull request it takes about 19 minutes and times out on slow runners. A sign-off tied
to the exact commit keeps the proof without the wait, and stories 1 to 3 don't depend on it.

**Independent Test**: on a pull request, run the local full run with an uncommitted change and
confirm it refuses. Commit, run it, sign off and confirm the pull request shows the sign-off
and can merge. Push another commit and confirm it can't merge until that commit is signed off.
Break one browser test and confirm the run fails and records no passing sign-off.

**Acceptance Scenarios**:

1. **Given** a clean checkout of a pushed commit, **When** the owner runs the local full run and
   every check passes, and signs off, **Then** the commit has a passing `local-verify` check that
   names the number of tests passed, the site check's result, the runtime's version and the
   operating system, and the pull request shows it.
2. **Given** a working copy with a changed or untracked file, **When** the owner starts the local
   full run, **Then** it refuses before running anything and names the files.
3. **Given** one failing test, **When** the local full run ends, **Then** it names the failure and
   no passing sign-off can be recorded for that commit.
4. **Given** a signed-off pull request, **When** a new commit is pushed to it, a merge of the main
   branch included, **Then** it can't be merged until the new commit is signed off.
5. **Given** any pull request, **When** its checks run, **Then** they run type checking, the fast
   tests, this check, the content and token checks and the site's checks, run no other test,
   and never record a sign-off.
6. **Given** a local full run that passed on a commit not yet pushed, **When** the owner signs
   off, **Then** its branch is pushed first, then the sign-off recorded, with no test run again.

---

### Edge Cases

- **No approved specs yet**, or no `specs/` folder at all: there is nothing to cover, so the
  coverage part passes and the summary says no approved specs were found. Invalid references
  are still reported.
- **Malformed requirement ID in an approved spec**, such as `FR-1`, `FR-0001` or `fr-001`:
  reported with the spec file and line, and the check fails.
- **Malformed reference** in the name or a tag of a test or group, or in a `data-req` value,
  such as a missing
  feature prefix, wrong letter case or the wrong number of digits: reported with its file and
  line, and the check fails.
- **The same ID defined twice in one approved spec**, including an active and a removed entry
  with the same ID: reported with every line where it is defined, and the check fails. This also
  catches an ID reused after its requirement was removed.
- **Malformed or duplicate IDs in a Draft spec**: not reported. They are caught once the spec is
  approved, before any code is written for it.
- **The same FR number in two different specs**: not a duplicate, because the feature prefix
  makes the full IDs different.
- **A test that references several requirements**: counts toward each one. If one of its
  references is invalid, that one is reported and the valid ones still count.
- **A requirement ID on a group of tests**: counts for every test in the group, including
  tests in nested groups. A group that contains no tests covers nothing.
- **A `data-req` attribute that lists several IDs**: each ID is checked on its own.
- **A spec with no Status, or a Status other than Draft or Approved** (for example a typo such
  as `Aproved`): reported, and the check fails, so a typo can't take an approved spec out of
  the check.
- **An approved spec that defines no requirements**: reported, and the check fails. It most
  likely means the requirements could not be read.
- **A file the check needs but can't read**, such as a test file with a syntax error: reported
  with its path, and the check fails. Skipping it could hide a covering test or a bad reference.
- **An ID mentioned elsewhere in a spec**, such as in a user story: not a definition, and
  ignored.
- **An ID that appears in a test file but not in the name or tags of a test or group**, such
  as in a comment: does not count as coverage.
- **A skipped, disabled or placeholder test that references a requirement**, either marked
  itself or inside a group that is marked: does not count as coverage. Its references are still
  checked for unknown, removed and malformed IDs.
- **A sign-off and a rewritten commit** (amended or rebased): the new commit has no sign-off, as
  any new commit (FR-034).
- **The local full run without the browser it needs installed**: it says what is missing and how
  to install it, and records nothing (FR-032).
- **Signing off with no connection** to the repository's host: it says so and records nothing.
  The local full run itself needs no connection (FR-027 and FR-036).
- **Signing off a commit whose last local full run failed, or that never ran**: refused, naming
  the commit (FR-033, FR-036).
- **A pull request that changes only the project's documents outside `specs/`**, such as the
  constitution: its checks still run, and it still needs a sign-off. Its local full run passes as
  the default branch's does.
- **Sample specs, tests and markup that exist only to test the check itself**: not treated as
  the project's own specs, tests or UI source, so their deliberately broken IDs don't fail the
  real check.

## Requirements *(mandatory)*

<!--
  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `001-requirement-traceability-FR-###`. UI implementing a requirement carries
`data-req="001-requirement-traceability-FR-###"` (Constitution III).

### Functional Requirements

**Finding requirements**

- **FR-001**: The check MUST examine every spec in the project's `specs/` folder and read its
  Status.
- **FR-002**: The check MUST require test coverage, and check requirement IDs for problems,
  only in specs whose Status is Approved. A Draft spec MUST NOT cause any problem other than one
  under FR-003.
- **FR-003**: The check MUST report a problem for any spec whose Status is missing or is
  neither Draft nor Approved.
- **FR-004**: The check MUST take a spec's requirements only from the entries in its Functional
  Requirements section that start with an ID of the form `FR-###` (`FR-` followed by exactly
  three digits). An ID mentioned anywhere else in the spec MUST NOT count as a definition.
- **FR-005**: The check MUST treat a requirement as removed when its ID is struck through,
  following the spec template's convention for removed requirements. Removed requirements MUST
  NOT need test coverage.
- **FR-006**: The check MUST report a problem for any Functional Requirements entry in an
  approved spec whose ID does not have the form `FR-###`, such as `FR-1`, `FR-0001` or `fr-001`.
- **FR-007**: The check MUST report a problem when one approved spec defines the same ID more
  than once, whether each entry is active or removed, and MUST name every line where it is
  defined.
- **FR-008**: The check MUST report a problem for an approved spec that defines no
  requirements at all.

**Finding references**

- **FR-009**: A requirement's full ID MUST be `<feature>-FR-###`, where `<feature>` is the name
  of the spec's directory. For example, FR-001 of this spec is
  `001-requirement-traceability-FR-001`.
- **FR-010**: The check MUST find full IDs in the names and tags of the project's automated
  tests and of the groups that contain them. A test is covered by every full ID on its own name
  or tags and on those of every group it belongs to. A test with several full IDs MUST count
  toward each of them.
- **FR-011**: A full ID that appears in a test file anywhere other than the name or tags of a
  test or group, such as in a comment, MUST NOT count as coverage.
- **FR-012**: A test marked in the code as skipped, disabled or a placeholder, either itself or
  through a group it belongs to, MUST NOT count as coverage. When only such tests reference a
  requirement, the check MUST report it as uncovered and say so. Their references MUST still be
  checked under FR-016 to FR-018.
- **FR-013**: The check MUST read every `data-req` attribute in the project's UI source. When an
  attribute lists several IDs separated by spaces, each ID MUST be checked on its own.
- **FR-014**: The check MUST examine only the project's own specs, tests and UI source.
  Third-party code, generated files, and sample specs, tests and markup that exist only to test
  the check itself MUST NOT be examined.

**Problems**

- **FR-015**: The check MUST report a problem for every active requirement in an approved spec
  that no test references.
- **FR-016**: The check MUST report a problem for every reference, in a test, a group of tests
  or a `data-req` attribute, to a full ID that does not exist: either no spec directory has that feature name,
  or that spec does not define the requirement.
- **FR-017**: The check MUST report a problem for every reference, in a test, a group of tests
  or a `data-req` attribute, to a removed requirement.
- **FR-018**: The check MUST report a problem when the name or a tag of a test or group
  contains `FR-`, in any letter case, other than as part of a well-formed full ID, and when a
  value in a `data-req` attribute is not a well-formed full ID.
- **FR-019**: A reference to a requirement defined in a Draft spec MUST be accepted as valid.
- **FR-029**: The check MUST report a problem, naming the file, for every file it needs but
  cannot read, such as a test file it cannot parse. It MUST NOT skip the file and carry on as if
  it were absent.
- **FR-020**: The check MUST fail when it reports at least one problem, and pass otherwise.

**Report**

- **FR-021**: The check MUST report every problem it finds in a single run, not stop at the
  first one.
- **FR-022**: Each problem MUST state its type, the full ID or malformed text involved, and the
  file and line where it was found. For an uncovered requirement, the location is where the
  requirement is defined in its spec.
- **FR-023**: Every run MUST end with a summary giving the number of approved specs checked,
  active requirements checked, requirements covered, and problems of each type. A passing run
  MUST say how many requirements were checked and that all are covered. When there are no
  approved specs, the summary MUST say so.
- **FR-024**: Two runs over the same files MUST produce the same report, with problems listed
  in the same order.

**Running**

- **FR-025**: The check MUST run on every pull request. When it fails, the pull request MUST
  NOT be mergeable by anyone, including the owner. The main branch MUST accept changes only
  through pull requests.
- **FR-026**: The owner MUST be able to run the check locally with one command. Over the same
  files, it MUST give the same result and the same report as the pull-request run.
- **FR-027**: The check MUST make no network requests.
- **FR-028**: The check MUST apply to this spec like any other. Once this spec is approved, its
  own requirements need covering tests.

**The pull-request run, the local run and the sign-off** (added 2026-10-29)

- **FR-030**: The project's tests MUST be divided by what they need: the fast set, the tests that
  need neither a browser nor a build of the site, and the full set, every test. Every test MUST
  be in the full set. This check MUST read every test, in either set (FR-010).
- **FR-031**: Every pull request MUST run type checking, the fast set, this check, the content
  check (002), the token check (003) and the site's checks on the built site (004 FR-048), and
  no test outside the fast set.
- **FR-032**: The owner MUST be able to run the full set and every check of FR-031 on their own
  machine with one command, the local full run. It MUST refuse to start, naming the files, when
  the working copy holds any change or untracked file that isn't in the current commit, so it
  runs exactly that commit. When something it needs isn't installed, it MUST say what and how to
  install it, and run nothing.
- **FR-033**: When every check of a local full run passes, the owner MUST be able to sign off its
  commit: a passing check named `local-verify`, recorded on that commit where the pull requests'
  checks are shown, naming the number of tests passed, the site check's result, the runtime's
  version and the operating system. When any check fails, the run MUST name every failure, and
  no passing sign-off may be recorded for that commit.
- **FR-034**: A sign-off MUST be recorded only by signing off after a passing local full run, with
  the owner's own credentials, and never by the pull requests' checks. It MUST belong to one
  commit: a new commit, a merge of the main branch or a rewritten commit included, has none
  until a local full run passes on it.
- **FR-035**: A pull request MUST NOT be mergeable by anyone, the owner included, until its head
  commit has a passing sign-off and every check of FR-031 passes, as FR-025 sets for this check.
- **FR-036**: Signing off MUST NOT run the tests again when a local full run already passed on that
  commit. When the commit isn't on the repository's host yet, signing off MUST push its branch
  first. When it can't reach the host or push, it MUST say so and record nothing.
- **FR-037**: A local full run's result MUST stay on the owner's machine, outside the project's
  tracked files, until it is signed off. Nothing of it may be committed.

### Key Entities

- **Spec**: one feature's specification. It is identified by its directory name (the
  feature), has a Status (Draft or Approved), and defines requirements.
- **Requirement**: an entry in a spec's Functional Requirements section. It has an ID
  (`FR-###`), a full ID (`<feature>-FR-###`), a state (active or removed), and the file and line
  where it is defined.
- **Reference**: an occurrence of a full ID in the name or tags of a test or group, or in a
  `data-req` attribute, with its file and line. A reference is valid, unknown, removed or malformed.
- **Problem**: a finding that fails the check. Its type is one of: uncovered requirement,
  unknown reference, reference to a removed requirement, malformed ID or reference, duplicate
  ID, missing or unrecognized Status, approved spec with no requirements, or unreadable file. It
  carries the ID or text involved and its location.
- **Report**: the list of problems in a stable order, followed by the summary.
- **Fast set** and **full set**: the tests a pull request runs, and every test (FR-030).
- **Local full run**: the full set and every pull-request check, run on the owner's machine on a
  clean checkout of one commit, with a pass or fail result kept on that machine (FR-032, FR-037).
- **Sign-off**: the passing `local-verify` check a local full run's pass records on its commit,
  naming what ran. A pull request needs one on its head commit to merge (FR-033 to FR-035).

## Shell Scope *(mandatory)*

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | No: not a UI feature | Not shown. Nothing changes for visitors. |
| Mobile (iOS-style) | No: not a UI feature | Not shown. Nothing changes for visitors. |

**CV path**: Unchanged. The CV stays one click (desktop) or one tap (mobile) from first load,
and `/cv` remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

- **Works offline**: Fully. The check makes no network requests, locally or on a pull request.
  The local full run needs no connection either.
- **Available offline**: nothing visitor-facing. The owner can run the full check, and the local
  full run, without a connection.
- **Needs the network**: only signing off, which records the sign-off on the repository's host
  (FR-036).
- **Offline state shown**: Not applicable. The feature has no visitor-facing state.

## Design *(mandatory)*

**No UI**: this feature adds or changes no user interface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a sample project seeded with at least one case of every problem type and edge
  case in this spec, the check reports 100% of the seeded problems and no others.
- **SC-002**: For the same files, the local run and the pull-request run give the same result
  and identical reports every time.
- **SC-003**: No change reaches the main branch while the check reports a problem, whoever
  makes it, including the owner.
- **SC-004**: The check finishes in under 10 seconds on the owner's machine for a project with
  up to 50 specs and 2,000 tests.
- **SC-005**: The check completes with the network turned off.
- **SC-006**: When this feature is merged, the check passes on the repository, and every
  requirement in this spec is covered by at least one test.
- **SC-007**: For every reported problem, a reviewer can go straight to the file and line
  involved using only the report, without reading the check's code.
- **SC-008** *(added 2026-10-29)*: Every pull request's checks finish within 6 minutes of
  starting, on the hosting service's standard runners, except the `site` job, which finishes
  within 12 minutes. Before the amendment the slowest took about 19 minutes. Amended 2026-10-30
  by 006-terminal: every job, `site` included, had to finish within 6 minutes.
- **SC-009** *(added 2026-10-29)*: No pull request merges without a passing sign-off on its head
  commit, whoever merges it, the owner included.
- **SC-010** *(added 2026-10-29)*: The local full run runs 100% of the project's test files, and
  gives the same pass or fail as running every test, every time.

## Assumptions

- **Users**: the owner is the only author. Reviewers read results on pull requests. Visitors
  never see the check.
- **Automated tests** are the tests the project's test suites run, whatever tools the plan
  chooses. The plan decides how a test's name and tags are read for each tool.
- **UI source** is the project's own source that produces the site's markup. The plan decides
  which files that covers.
- **Status values** are Draft and Approved, as in the spec template. If another status is
  introduced, this spec is updated first.
- **Removed requirements** follow the spec template's convention: the ID is struck through,
  followed by "Removed", the date and the reason.
- **References to Draft specs are valid**, because a spec can be back in Draft while it is
  being changed, and its existing tests and `data-req` attributes stay in place meanwhile.
- **Blocking merge** depends on repository settings that require this check to pass before a
  pull request can be merged, block direct pushes to the main branch, and allow no bypass, not
  even for admins. Turning these on is part of delivering this feature. The repository already
  allows squash merges only. Amended 2026-10-29: the same settings also require the
  `local-verify` sign-off of FR-035, and turning that on is part of delivering the amendment.
- **The owner's credentials** (2026-10-29): signing off uses the owner's own login to the
  repository's host, already on their machine. The plan says which tool records it.
- **Out of scope**:
  - Checking that tests pass, inside the check itself. The normal test run does that. Amended
    2026-10-29: the full run's pass is now a merge requirement through the local full run and
    its sign-off (FR-030 to FR-037), which stay outside the check.
  - Tests skipped only by a condition checked while the tests run, such as "skip on this
    platform". The code doesn't mark them as skipped, so they count as coverage. The normal test
    run reports those skips.
  - Checking that every UI requirement has a `data-req` element.
  - Checking `data-req` values that are computed when the site runs instead of written in the
    source, such as a value one element passes on to another. Only values written literally, as
    Constitution III asks, are checked. A value passed on is checked where it is written.
  - The visitor-facing requirement inspector, which is a later feature.
  - Listing which tests cover each requirement, or saving that map for other features. The
    requirement inspector's spec decides how it gets the map.
  - Detecting IDs that were renumbered or reused across the project's history. Reuse within one
    spec is caught as a duplicate (FR-007); the rest is caught in review.
- **Depends on**: Constitution III, and the spec template's ID and removal conventions.
