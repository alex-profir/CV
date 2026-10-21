# Feature Specification: Seeded Example

**Status**: Approved

<!--
  Sample spec for the traceability check's seeded project (SC-001). Each case is noted in an
  HTML comment like this one, which the check ignores.
-->

## User Scenarios & Testing

<!-- An ID in a user story is not a definition (FR-004). -->
- **FR-003**: The visitor sees the date. Mentioned in a user story only.

## Requirements

### Functional Requirements

**Clock**

<!-- Active, covered by a test title. -->
- **FR-001**: The clock MUST show the time.
<!-- Removed, so it needs no coverage. A test and a data-req still reference it. -->
- ~~**FR-002**~~: Removed 2026-10-21 - replaced by FR-001.
<!-- Active and uncovered: only an empty group, a comment, an assertion and an unreadable file mention it. -->
- **FR-003**: The clock MUST show the date.
<!-- Active, but only a skipped test references it. -->
- **FR-004**: The clock MUST show seconds.
<!-- Active, covered through a group title by a test nested two levels deep. -->
- **FR-005**: The clock MUST tick.
<!-- Defined twice, both active: a duplicate. Covered through a tag. -->
- **FR-006**: The clock MUST use 24-hour time.
- **FR-006**: The clock MUST use 24-hour time, again.
<!-- One removed and one active definition: a duplicate. Covered by a test that also carries a malformed ID. -->
- ~~**FR-007**~~: Removed 2026-10-21 - reused below by mistake.
- **FR-007**: The clock MUST show the time zone.
<!-- Malformed IDs: FR- and exactly three digits are required. -->
- **FR-1**: Too few digits.
- **FR-0001**: Too many digits.
- **fr-008**: Lower case.

<!--
- **FR-010**: Inside an HTML comment, so not a definition.
-->

```text
- **FR-010**: Inside a fenced code block, so not a definition.
```

### Key Entities

- **Clock**: shows the time.
