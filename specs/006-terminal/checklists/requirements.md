# Specification Quality Checklist: The Terminal

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-27
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Three [NEEDS CLARIFICATION] markers are open, put to the owner as questions:
  - **FR-012**: does the Terminal also offer a pretend file system (`ls`, `cd`, `cat` over the CV
    as folders and files), or only the commands FR-008 lists?
  - **FR-013**: does `specs` show only each spec's number, name and link, or also its status and
    its count of requirements?
  - **FR-024**: what is the phone Terminal's odd touch?
- Command names (`help`, `work` and so on) and key names (Tab, Enter, the arrows) describe what the
  visitor types and presses, not how it is built. Named standards and tools (WCAG 2.2, Lighthouse,
  Penpot) appear because the constitution names them, as in 004 and 005.
- FR-004 needs 005 FR-040 amended for the Terminal, so focus goes to the command line on opening.
  005 isn't merged yet, so the owner may instead amend 005 on its own branch.
- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`.
