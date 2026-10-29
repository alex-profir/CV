# CV Constitution

## Core Principles

### I. Spec First

- No production code is written for a feature until `specs/<feature>/spec.md` exists and its
  `Status` field reads `Approved`. The project owner sets that status.
- Specs state **what** the feature does and **why**. They MUST NOT name frameworks, libraries,
  file layouts, or APIs.
- Plans (`plan.md`) state **how**. Implementation choices are made and justified there, never
  in the spec.
- A change in behavior means updating the spec first. Code that does something its spec does not
  describe is a defect.

**Rationale**: the spec-driven process is part of what this site shows. A visitor reading
`specs/` should see the reasoning before the code, and see that the code followed it.

### II. Design Gate

No UI task starts until `specs/<feature>/design/` contains all of:

1. An ASCII wireframe of every screen or state the feature adds or changes.
2. PNG exports of the approved Penpot mockup, plus a link to the Penpot file.
3. A `review.md` sign-off from the project owner. It names the reviewed mockup version and
   gives the date.

- The gate covers both shells. Each shell the feature supports needs its own wireframe and
  mockup exports.
- Features with no UI change MUST say so in `spec.md` ("No UI"). Only then are they exempt.
- If the approved design changes, the PNGs and `review.md` are updated before the code changes.
- Until the interim provision on local mockups ends, an interim local mockup can stand in for
  the Penpot mockup and its link (see that section).

**Rationale**: it makes the visual decision explicit and reviewable before implementation.
It also keeps the published design artifacts in sync with what ships.

### III. Traceable Requirements

- Every functional requirement in a spec has a stable ID of the form `FR-###`. IDs are never
  reused or renumbered. A dropped requirement is marked as removed, not deleted.
- Every UI element that implements a requirement carries
  `data-req="<feature>-FR-###"`. An element serving several requirements lists them separated
  by spaces.
- Every requirement maps to at least one automated test. The test MUST reference
  `<feature>-FR-###` in its name or tags, so the mapping can be checked by a machine.
- CI MUST fail when any requirement in an approved spec has no test that references it.

**Rationale**: anyone can follow a requirement from spec to UI to test. That makes the
process visible and verifiable, not just claimed.

### IV. One Source of Truth

- All CV data lives in `packages/content`. That covers experience, education, skills, projects,
  contact details and any other biographical text. No app, shell or page hardcodes it.
  Each one reads it from that package.
- Design tokens come from Penpot. That covers color, typography, spacing, radii, shadows and
  every other kind of token Penpot can hold.
- Motion (durations and easing curves) is the one exception, because Penpot has no token type
  for it. Motion tokens live in a single motion token source in the repository, in the same
  format as Penpot's token export. That source holds only token types Penpot can't hold. Once
  Penpot can hold one, those tokens move to Penpot under the same names.
- Code consumes tokens only through the token output produced from these two sources, and reads
  both the same way. A token name is defined in only one of them. Literal token values in
  components or styles are violations.
- Changing a CV fact or a design token takes exactly one edit, at its source.
- Until the interim provision on local mockups ends, the token export may be written by hand in
  Penpot's export form (see that section).

**Rationale**: the CV changes over time. Keeping one source means the desktop shell, the
mobile shell and `/cv` can never drift apart. Motion is judged by watching it run, which Penpot
can't show, so its tokens stay where they can be changed and previewed directly.

### V. Shared Core, Per-Shell Scope

- The desktop shell (macOS-style) and the mobile shell (iOS-style) share `os-core` and
  `packages/content`. Shell-specific code stays inside its shell.
- Every app declares which shells it supports. The declaration lives with the app, not in
  the shell.
- Every spec has a per-shell scope statement. For each shell it says whether the feature is
  supported, and what the other shell shows instead (a fallback, a link, or an explicit
  "not shown").

**Rationale**: two shells double the surface area. Explicit scope stops features from
silently missing on one shell, or being half-built there.

### VI. Offline by Default

- Every app spec states its offline behavior.
- Anything that can work offline MUST work offline. That includes all CV content and every
  app that does not need the network.
- An app that truly needs the network MUST say why in its spec. Offline, it shows a clear
  state that it is offline, never a blank or broken view.

**Rationale**: a browser OS should behave like an OS. Recruiters often open links on weak
connections, and an offline CV is still a working CV.

### VII. Recruiter First

- From first load, the CV is at most one click (desktop) or one tap (mobile) away.
  This holds on both shells.
- `/cv` is a plain server-rendered page. Its full content is in the server-rendered HTML,
  so it reads without JavaScript and without the OS shell.
- No feature may add steps or interruptions in front of the CV, such as splash screens, forced
  onboarding or modals.

**Rationale**: the OS is the showcase, but the CV is the product. Whoever just needs the CV
gets it immediately.

### VIII. Accessible and Fast

- Both shells and `/cv` conform to WCAG 2.2 Level AA.
- The desktop shell is fully operable by keyboard. That includes opening, focusing, moving
  and closing windows, using the dock and menus, and leaving every app, with visible focus
  throughout.
- When `prefers-reduced-motion` is set, non-essential animation is removed or replaced with a
  non-moving transition.
- Lighthouse scores are 90 or higher in every category, on both mobile and desktop profiles.

**Rationale**: an inaccessible or slow CV site undercuts the skills it is meant to show.

### IX. Original Design

- Interaction patterns MAY be inspired by macOS and iOS. Examples are windows, a dock, a
  menu bar, a home screen and sheets.
- The visual identity MUST be original. No Apple icons, glyphs, fonts (such as SF Pro or
  New York), wallpapers, logos or other Apple assets, copied or traced.

**Rationale**: it avoids trademark and licensing problems. The design is also part of the
portfolio, so it has to be the author's own work.

### X. Simple and Vetted

- No dependency, agent skill or abstraction is added unless its plan gives a written reason:
  what problem it solves, and why something simpler was not enough.
- Vendor-maintained tools are preferred, meaning those published by the platform or library
  vendor, over community forks or wrappers.
- Unjustified complexity found in review is removed, not grandfathered in.

**Rationale**: a small, explainable stack is easier to maintain and easier for a reviewer
to trust.

### XI. Features and Amendments in Pull Requests

- A new feature ships in one pull request. Its description links the feature's `spec.md` and
  `tasks.md`.
- A shipped feature can be amended. The amendment starts in its spec (Principle I) and is
  recorded there: a dated clarification session that says what changes and why, the owner's
  approval of the amendment beside the spec's `Status`, each changed requirement marked
  `Amended <date>` with what it said before, and each new requirement added under a new ID
  marked `(added <date>)`. IDs are never reused or renumbered (Principle III).
- A new feature can amend an older feature's spec when it needs the change. The new spec says so
  in a requirement that names the older spec and what changes, and the owner's approval of the
  new spec approves the amendment. The older spec records the amendment as above, naming the
  feature it comes from in the clarification session and in each `Amended` or `added` mark.
- Such an amendment ships in the new feature's pull request, with its tests and design, and the
  description also links the amended `spec.md`. Its tasks are part of the new feature's
  `tasks.md`. A task in the older feature's `tasks.md` that it overturns is marked as superseded
  there, naming the new feature.
- Any other amendment ships in one or more pull requests of its own. Each one links the amended
  `spec.md` and `tasks.md` and names the amendment it builds by its date.
- When an amendment ships in several pull requests, each one carries the part of the spec
  amendment it builds, with that part's tests, design and tasks. So the default branch never
  holds an approved requirement without its test (Principle III), or a UI change without its
  approved design (Principle II).
- The tasks of an amendment in pull requests of its own are a new phase in the amended
  feature's `tasks.md`. Earlier tasks keep their record: a task an amendment overturns is marked
  as superseded, never deleted or unticked.
- Commits follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:` and so on).
- Unrelated changes go in their own PR. An amendment a new feature needs is related to it.

**Rationale**: one PR per feature keeps history readable, with spec, tasks and code reviewed
together. A shipped feature still changes as the owner learns from it. Recording each amendment
in its spec, and building it in PRs that each keep the default branch true to its specs, lets
a reader follow what changed, when and why, without one PR growing too large to review. A new
feature sometimes needs an older one to change, such as a shortcut its own keys need. Amending
the older spec in the new feature's PR keeps the cause and the change reviewed together, while
the older spec still records what changed, when, why and for which feature.

## Product Scope & Architecture

- **Product**: a public CV site presented as a browser OS. Desktop visitors get a macOS-style
  shell, phone visitors an iOS-style shell. The site also shows spec-driven development in
  practice. Product context, audience and goals live in `docs/vision.md`, and specs MUST stay
  consistent with it.
- **Shared packages**: `os-core` (OS behavior shared by both shells) and `packages/content`
  (all CV data, Principle IV).
- **Shells**: desktop and mobile. Apps declare the shells they support (Principle V).
- **Recruiter route**: `/cv`, server-rendered and independent of the shells (Principle VII).
- **Design source**: Penpot holds the approved mockups (Principle II) and the design tokens,
  except motion tokens, which live in the repository's motion token source until Penpot can
  hold them (Principle IV). The interim provision on local mockups temporarily allows local
  mockups and a hand-written token export.
- **Public process**: everything under `specs/` is public and part of the showcase. Spec
  artifacts are kept current, are readable by an outside reviewer, and contain no secrets or
  private data.

## Development Workflow & Quality Gates

Every feature moves through these gates in order. A gate that has not passed blocks the
next one. An amendment of a shipped feature moves through the same gates, from Specify, for the
part it changes (Principle XI).

1. **Specify**: `/speckit-specify` produces `spec.md`, with `FR-###` IDs, per-shell scope and
   offline behavior. Open questions are resolved with `/speckit-clarify`. The owner then sets
   `Status: Approved` (Principle I).
2. **Design** (UI features only): the wireframe, Penpot PNG exports, Penpot link and
   `review.md` sign-off go in `specs/<feature>/design/` (Principle II), or an interim local
   mockup under the interim provision.
3. **Plan**: `/speckit-plan` produces `plan.md`. Its Constitution Check covers every
   principle. New dependencies, skills and abstractions get written reasons (Principle X).
4. **Tasks**: `/speckit-tasks` produces `tasks.md`. UI tasks list the design gate as a
   prerequisite.
5. **Implement**: tests reference the `<feature>-FR-###` IDs they cover, and UI elements carry
   `data-req` attributes (Principle III).
6. **Pull request**: one PR per new feature, carrying any amendment of an older spec it makes,
   and one or more per amendment of its own, each linking its spec and tasks (Principle XI). It merges once CI passes and the owner's local run has signed
   off its head commit (Merge requirements).

Merge requirements:

- CI MUST enforce requirement-to-test traceability (Principle III).
- Accessibility (WCAG 2.2 AA, keyboard operation, reduced motion), Lighthouse 90+, offline
  behavior and the one-click/one-tap CV path MUST be verified before merge. They are
  automated wherever tooling allows, in CI or in the owner's local run below.
- **Cloud and local runs**: CI on every pull request runs the fast checks: type checking, the
  tests that need no browser, the traceability, content and token checks, and the site's checks
  on the built site. The full test suite, every browser test included, runs on the owner's
  machine before merge, on a clean checkout of the pull request's head commit.
- **Local sign-off**: a pull request merges only with a passing `local-verify` status on its head
  commit. The owner's local run posts it, and only after every check of the full run passes on
  that commit. CI never posts it. A new commit, a merge of the default branch included, needs a
  new run. The status names what ran, so the pull request records it.
- Until the interim provision on deferred manual checks ends, checks that only a person can do
  may be done after merge (see that section).
- Hardcoded CV data or literal design-token values block merge (Principle IV).

## Interim Provision: Local Mockups

The site's Penpot file can't be reached from 2026-10-23 until at least 2026-10-26. So work
doesn't stop, this provision temporarily changes what Principles II and IV accept. It ends only
through the steps under **Ending the provision**.

While it applies:

- **Design gate (Principle II)**: a local mockup can stand in for the Penpot mockup. A local
  mockup is a static HTML and CSS page in `specs/<feature>/design/mockup/` that reads the site's
  tokens, with PNG exports rendered from it at every width the gate needs. The wireframes and
  the owner's `review.md` sign-off are still required. `review.md` says the design is an interim
  local mockup and names the reviewed commit and date. No Penpot link is required.
- **Design tokens (Principle IV)**: the token export may be written by hand, in exactly the form
  Penpot exports, so the token check accepts it and Penpot can import it. Code still reads tokens
  only through the token output, and a token is still defined in one place. Only who writes the
  export changes.
- **Merging**: a feature may merge with an interim local mockup and a hand-written export. Every
  other gate and merge requirement still applies.
- A design that already exists in Penpot keeps its exports and sign-off. Only its Penpot link
  may be added later.

Ending the provision, once the Penpot file can be reached again:

1. The hand-written token export is imported into the site's Penpot file and exported again. The
   new export replaces the committed one. Any difference is reviewed, and the token output is
   regenerated.
2. For every feature whose `review.md` names an interim local mockup, its design is rebuilt in
   Penpot to match. Its PNG exports are replaced by Penpot's, and its Penpot link and an updated
   `review.md` sign-off are added. A Penpot link that was missing is added too.
3. Steps 1 and 2 are done in follow-up pull requests, one per feature, with `docs:` commits for
   design artifacts. The Penpot design matches the approved local mockup. If the owner changes
   the design while rebuilding it, that is a design change under Principle II: the spec, the
   artifacts and the code follow in that feature's follow-up pull request.
4. A further amendment removes this section once steps 1 to 3 are done for every feature.

## Interim Provision: Deferred Manual Checks

The owner can't do hands-on testing while the first features are built, and would rather test
several features together. So features don't wait on that, this provision temporarily changes
when the merge requirements' manual checks are done. It ends only through the steps under
**Ending the provision**.

While it applies:

- **What may wait**: a check that only a person can do. Examples are a pass with a screen
  reader, shortcuts tried by hand in each browser and screen reader, forced colors and text-only
  zoom in a given browser, printing, and comparing the built pages with the approved design
  exports. These may be done after merge, in a final testing phase that covers several features.
- **What may not wait**: every automated check still runs and passes before merge, in CI or in
  the owner's signed-off local run, as do the requirement-to-test traceability check
  (Principle III) and the checks in CI. A deferred manual
  check doesn't excuse a missing automated check where tooling allows one.
- **Recording**: a deferred check stays an open task in the feature's `tasks.md`, with a note
  that it is deferred to the final testing phase. The feature's pull request lists every
  deferred check.
- **Defects** a deferred check finds are fixed in follow-up pull requests, with `fix:` commits.
  A behavior change still goes through the spec first (Principle I).
- 004-cv-page's manual checks (its T105), deferred before this provision, are covered by it.

Ending the provision:

1. The owner runs the final testing phase: every deferred check of every feature merged under
   this provision.
2. Each result is recorded in that feature's `tasks.md`, and the task is ticked. Defects are
   fixed as above.
3. A further amendment removes this section once steps 1 and 2 are done for every feature.

## Governance

- This constitution overrides every other practice, template or guide in the repository. When
  it conflicts with any of them, it wins, and the other document is updated to match.
- **Amendments** are made in a dedicated PR with a `docs:` commit. The PR updates the version
  and `Last Amended` date, explains what changed and why, and lists any dependent templates or
  specs that need updating.
- **Versioning** follows semantic versioning:
  - MAJOR: a principle is removed or redefined in a way that breaks compatibility.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications, wording and typo fixes with no change in meaning.
- **Compliance review** happens at three points:
  - Each plan's Constitution Check.
  - `/speckit-analyze` before implementation. It treats constitution conflicts as CRITICAL.
  - PR review.
- A justified exception is recorded in the plan's Complexity Tracking table, with the
  simpler alternative that was rejected. An unrecorded exception is a violation.

**Version**: 1.5.0 | **Ratified**: 2026-10-21 | **Last Amended**: 2026-10-29
