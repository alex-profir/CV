# Specification Quality Checklist: CV Pitch and Personal Projects

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-24
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

- One marker left, by design of the unattended run: FR-019, where personal projects' files sit in
  the Terminal's file system (`~/projects` beside client projects, assumed, or a folder of their
  own). Resolve with `/speckit-clarify` before `/speckit-plan`.
- File names (`resume.json` is not named; `content.md`, `cv.json`, `~/projects`) and "JSON" appear
  because they are the owner's own terms and existing visitor-facing names in 002, 004 and 006, not
  implementation choices. The schema extension, field names and the personal marking are left to
  the plan.
- FR-015 (copy approved text exactly) needs a test approach that doesn't make `content.md` a lasting
  second source of CV data (Constitution IV); flagged in Assumptions for the plan.
- The privacy rule for personal products (SC-007) can't be checked automatically without naming the
  products; it rests on the owner's review, with FR-011's no-URL rule as the automated guard.
- Status left as Draft; the owner approves.
