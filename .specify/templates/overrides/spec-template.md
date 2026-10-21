# Feature Specification: [FEATURE NAME]

**Feature Branch**: `[###-feature-name]`

**Created**: [DATE]

**Status**: Draft

<!--
  Status moves from Draft to Approved only when the project owner approves the spec.
  No code is written for this feature before then (Constitution I).
-->

**Input**: User description: "$ARGUMENTS"

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - [Brief Title] (Priority: P1)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently - e.g., "Can be fully tested by [specific action] and delivers [specific value]"]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 2 - [Brief Title] (Priority: P2)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### User Story 3 - [Brief Title] (Priority: P3)

[Describe this user journey in plain language]

**Why this priority**: [Explain the value and why it has this priority level]

**Independent Test**: [Describe how this can be tested independently]

**Acceptance Scenarios**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.

  Requirement IDs are permanent (Constitution III): never reuse or renumber them.
  To drop a requirement, keep its line and mark it, e.g.
  "- ~~**FR-004**~~: Removed [DATE] - [reason]".
-->

**Traceability**: Every requirement below MUST be covered by at least one automated test that
references `[###-feature-name]-FR-###`. UI implementing a requirement carries
`data-req="[###-feature-name]-FR-###"` (Constitution III).

### Functional Requirements

- **FR-001**: System MUST [specific capability, e.g., "allow users to create accounts"]
- **FR-002**: System MUST [specific capability, e.g., "validate email addresses"]
- **FR-003**: Users MUST be able to [key interaction, e.g., "reset their password"]
- **FR-004**: System MUST [data requirement, e.g., "persist user preferences"]
- **FR-005**: System MUST [behavior, e.g., "log all security events"]

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **[Entity 1]**: [What it represents, key attributes without implementation]
- **[Entity 2]**: [What it represents, relationships to other entities]

## Shell Scope *(mandatory)*

<!--
  Constitution V and VII. Fill in both rows, even when the feature targets one shell only.
  "Instead" is what a visitor on a shell without the feature sees: a fallback, a link,
  or "Not shown".
-->

| Shell | Supported | Instead |
|-------|-----------|---------|
| Desktop (macOS-style) | [Yes / No] | [What desktop shows if unsupported, or "-"] |
| Mobile (iOS-style) | [Yes / No] | [What mobile shows if unsupported, or "-"] |

**CV path**: [Unchanged / describe the change]. The CV stays one click (desktop) or one tap
(mobile) from first load, and `/cv` remains a plain server-rendered page.

## Offline Behavior *(mandatory)*

<!--
  Constitution VI. Anything that can work offline must. Only network-dependent parts may be
  listed under "Needs the network", each with a reason.
-->

- **Works offline**: [Fully / Partly / No]
- **Available offline**: [What a visitor can still see and do without a connection]
- **Needs the network**: [What requires a connection, and why; or "Nothing"]
- **Offline state shown**: [What the visitor sees for network-dependent parts; never a blank or
  broken view]

## Design *(mandatory)*

<!--
  Constitution II. Choose one option and delete the other.
  If the feature has no UI change, keep only the "No UI" line.
-->

**No UI**: this feature adds or changes no user interface.

**UI change**: design artifacts live in `specs/[###-feature-name]/design/`:

- [ ] ASCII wireframe of every new or changed screen or state, per supported shell
- [ ] PNG exports of the approved Penpot mockup, per supported shell
- [ ] Penpot file link: [URL]
- [ ] `review.md` sign-off by the project owner, naming the mockup version and date

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: [Measurable metric, e.g., "Users can complete account creation in under 2 minutes"]
- **SC-002**: [Measurable metric, e.g., "System handles 1000 concurrent users without degradation"]
- **SC-003**: [User satisfaction metric, e.g., "90% of users successfully complete primary task on first attempt"]
- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- [Assumption about target users, e.g., "Users have stable internet connectivity"]
- [Assumption about scope boundaries, e.g., "Mobile support is out of scope for v1"]
- [Assumption about data/environment, e.g., "Existing authentication system will be reused"]
- [Dependency on existing system/service, e.g., "Requires access to the existing user profile API"]
