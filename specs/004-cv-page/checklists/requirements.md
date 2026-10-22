# Specification Quality Checklist: The /cv Page

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-22
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
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

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- The spec names Penpot and Lighthouse because the constitution names them, plus WCAG 2.2,
  JSON Resume 1.3.1 (through 002) and ISO 3166-1, which are standards, not tool choices.
  Accessibility terms (landmark, region, focus indicator, forced colors) and web terms (query
  parameters, not-found status, scripting) describe behavior a tester can observe. They choose
  no framework, host or CI provider.
- The spec makes these choices without clarification markers. Each one is recorded under
  Assumptions and can be revisited with `/speckit-clarify`:
  - Sections the standard defines but the CV doesn't hold yet (volunteer, awards, certificates,
    publications, references) are not supported. The checks fail if one appears, so it can't be
    silently missing from the page (FR-005).
  - The share description is the CV summary, falling back to the role (FR-036).
  - The not-found page is in scope and goes through the design gate. Constitution II requires a
    wireframe and mockup for every screen or state the feature adds.
  - The country is shown by its English name, taken from the country code (FR-008).
  - The checks run at a phone width of 375 px and a desktop width of 1440 px, plus 320 px.
- SC-004 (screen reader pass) and SC-005 (print in two browsers) are checked by hand before
  merge, because automated tools cover only part of WCAG and print layout.
- FR-046 depends on what the plan finds: if declaring the fonts fails 003's literal-value
  check, 003's spec is amended first, in this feature's pull request.
- The Design section's boxes stay unchecked until the design gate passes. The spec has to be
  approved before the design gate starts.
- All items pass. The spec is ready for `/speckit-clarify` or `/speckit-plan`.
