// Seeded test file for the traceability check (SC-001). Each case is noted in a comment.
import { describe, expect, test } from 'vitest';

// A comment naming 002-example-FR-003 doesn't count (FR-011).

// A group title covers the test nested two levels below it (FR-010).
describe('ticks 002-example-FR-005', () => {
  describe('every second', () => {
    test('advances', () => {});
  });
});

// A title and a tag both count. The assertion string doesn't (FR-011).
test('shows the time 002-example-FR-001', { tags: ['002-example-FR-006'] }, () => {
  expect('002-example-FR-003').toBeTruthy();
});

// A skipped test doesn't count (FR-012).
test.skip('shows seconds 002-example-FR-004', () => {});

// A runtime-conditional skip still counts (FR-012).
test.skipIf(process.env.CI)('twin 007-twin-FR-001', () => {});

// A removed requirement (FR-017).
test('old behavior 002-example-FR-002', () => {});

// A requirement the spec doesn't define (FR-016).
test('undefined 002-example-FR-009', () => {});

// A spec directory that doesn't exist (FR-016).
test('missing spec 099-missing-FR-001', () => {});

// No feature prefix (FR-018).
test('bare FR-001', () => {});

// Wrong letter case, in a tag (FR-018).
test('lower-case tag', { tags: ['002-example-fr-005'] }, () => {});

// A malformed ID doesn't stop the valid one next to it from counting (FR-010, FR-018).
test('time zone 002-example-FR-01 002-example-FR-007', () => {});

// A reference into a Draft spec is valid (FR-019).
test('draft 003-draft-FR-001', () => {});

// A placeholder doesn't count, and its undefined ID is still reported (FR-012, FR-016).
test.todo('later 002-example-FR-011');

// A group with no tests covers nothing (FR-010).
describe('date 002-example-FR-003', () => {});
