import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { listFiles } from '../src/files.ts';
import { parseSpec, requirementsOf, specProblems } from '../src/specs.ts';
import { makeProject } from './helpers/project.ts';

const FILE = 'specs/002-example/spec.md';

// A spec.md whose Status is on line 3 and whose Functional Requirements
// entries start on line 9. A null status leaves line 3 empty.
function spec(status: string | null, entries: string[]): string {
  return [
    '# Feature Specification: Example',
    '',
    status === null ? '' : `**Status**: ${status}`,
    '',
    '## Requirements',
    '',
    '### Functional Requirements',
    '',
    ...entries,
    '',
  ].join('\n');
}

function entriesOf(text: string) {
  return parseSpec('002-example', FILE, text).entries.map((entry) => ({
    rawId: entry.rawId,
    wellFormed: entry.wellFormed,
    removed: entry.removed,
    at: `${entry.location.line}:${entry.location.column}`,
  }));
}

function problemsOf(text: string) {
  const spec = parseSpec('002-example', FILE, text);
  return specProblems(spec, requirementsOf(spec)).map((problem) => ({
    type: problem.type,
    subject: problem.subject,
    at: `${problem.location.file}:${problem.location.line}:${problem.location.column}`,
    detail: problem.detail,
  }));
}

describe('001-requirement-traceability-FR-001: every spec is found and its Status read', () => {
  test('finds every spec directly under specs/ and ignores everything else there', () => {
    const root = makeProject({
      'specs/002-example/spec.md': spec('Approved', ['- **FR-001**: One.']),
      'specs/003-draft/spec.md': spec('Draft', ['- **FR-001**: One.']),
      'specs/notes/notes.md': '# Notes\n',
      'specs/README.md': '# Specs\n',
      'specs/a/b/spec.md': spec('Approved', ['- **FR-1**: Never read.']),
      'src/example.test.ts': "test('covers 002-example-FR-001', () => {});\n",
    });

    expect(listFiles(root).specs).toEqual([
      { feature: '002-example', file: 'specs/002-example/spec.md' },
      { feature: '003-draft', file: 'specs/003-draft/spec.md' },
    ]);

    const report = runCheck(root);
    expect(report.problems).toEqual([]);
    expect(report.approvedSpecs).toBe(1);
  });

  test('reads the Status of each spec', () => {
    expect(parseSpec('002-example', FILE, spec('Approved', [])).status).toBe('Approved');
    expect(parseSpec('002-example', FILE, spec('Draft', [])).status).toBe('Draft');
    expect(parseSpec('002-example', FILE, spec('Aproved', [])).status).toBe('Invalid');
    expect(parseSpec('002-example', FILE, spec(null, [])).status).toBe('Invalid');
  });

  test('an invalid Status is reported for a spec found under specs/', () => {
    const root = makeProject({
      'specs/004-typo/spec.md': spec('Aproved', ['- **FR-001**: One.']),
    });
    expect(runCheck(root).problems.map((problem) => problem.type)).toEqual(['bad-status']);
  });
});

describe('001-requirement-traceability-FR-002: only approved specs need coverage and get their IDs checked', () => {
  const draft = spec('Draft', ['- **FR-001**: One.', '- **FR-1**: Malformed.', '- **FR-001**: Duplicate.']);

  test('a Draft spec with no tests, a malformed entry and a duplicate ID causes no problem', () => {
    expect(problemsOf(draft)).toEqual([]);

    const root = makeProject({ 'specs/003-draft/spec.md': draft });
    const report = runCheck(root);
    expect(report.problems).toEqual([]);
    expect(report.approvedSpecs).toBe(0);
    expect(report.activeRequirements).toBe(0);
  });

  test('only the active requirements of approved specs are counted', () => {
    const root = makeProject({
      'specs/002-example/spec.md': spec('Approved', ['- **FR-001**: One.', '- ~~**FR-002**~~: Removed.']),
      'specs/003-draft/spec.md': draft,
      'src/example.test.ts': "test('covers 002-example-FR-001', () => {});\n",
    });
    const report = runCheck(root);
    expect(report.problems).toEqual([]);
    expect(report.approvedSpecs).toBe(1);
    expect(report.activeRequirements).toBe(1);
    expect(report.coveredRequirements).toBe(1);
  });
});

describe('001-requirement-traceability-FR-003: a missing or unrecognized Status is reported', () => {
  test('a missing Status line', () => {
    expect(problemsOf(spec(null, ['- **FR-001**: One.']))).toEqual([
      { type: 'bad-status', subject: '""', at: `${FILE}:1:1`, detail: 'spec has no Status line' },
    ]);
  });

  test('a misspelled Status points at the value', () => {
    const text = [
      '# Feature Specification: Example',
      '',
      '**Feature Branch**: `002-example`',
      '',
      '**Created**: 2026-10-21',
      '',
      '**Status**: Aproved',
      '',
      '### Functional Requirements',
      '',
      '- **FR-001**: One.',
      '',
    ].join('\n');
    expect(problemsOf(text)).toEqual([
      { type: 'bad-status', subject: '"Aproved"', at: `${FILE}:7:13`, detail: 'Status must be Draft or Approved' },
    ]);
  });

  test('an empty Status value points at the start of its line', () => {
    expect(problemsOf(spec('', ['- **FR-001**: One.']))).toEqual([
      { type: 'bad-status', subject: '""', at: `${FILE}:3:1`, detail: 'Status must be Draft or Approved' },
    ]);
  });

  test('a Status line inside an HTML comment does not count', () => {
    const text = spec(null, ['- **FR-001**: One.']).replace('\n\n## Requirements', '\n<!--\n**Status**: Approved\n-->\n## Requirements');
    expect(problemsOf(text)).toEqual([
      { type: 'bad-status', subject: '""', at: `${FILE}:1:1`, detail: 'spec has no Status line' },
    ]);
  });

  test('a spec with an invalid Status gets no other problem', () => {
    const root = makeProject({
      'specs/004-typo/spec.md': spec('Aproved', ['- **FR-001**: One.', '- **FR-1**: Malformed.', '- **FR-001**: Again.']),
    });
    const report = runCheck(root);
    expect(report.problems.map((problem) => problem.type)).toEqual(['bad-status']);
    expect(report.approvedSpecs).toBe(0);
  });
});

describe('001-requirement-traceability-FR-004: definitions come only from Functional Requirements entries', () => {
  test('ignores IDs in user stories, other sections and continuation lines', () => {
    const text = [
      '# Feature Specification: Example',
      '',
      '**Status**: Approved',
      '',
      '## User Scenarios',
      '',
      '- **FR-001**: mentioned in a user story.',
      '',
      '## Requirements',
      '',
      '### Functional Requirements',
      '',
      '**Finding requirements**',
      '',
      '- **FR-002**: The check MUST do this,',
      '  - **FR-003**: an indented line, not an entry.',
      '  FR-004 continues the entry above.',
      '* **FR-005**: A star bullet.',
      '+ **FR-006**: A plus bullet is not an entry.',
      '1. **FR-007**: A numbered item is not an entry.',
      '',
      '#### A lower-level heading does not end the section',
      '',
      '- **FR-008**: Still inside.',
      '',
      '### Key Entities',
      '',
      '- **FR-009**: In another section.',
      '',
    ].join('\n');
    expect(entriesOf(text)).toEqual([
      { rawId: 'FR-002', wellFormed: true, removed: false, at: '15:5' },
      { rawId: 'FR-005', wellFormed: true, removed: false, at: '18:5' },
      { rawId: 'FR-008', wellFormed: true, removed: false, at: '24:5' },
    ]);
  });

  test('ignores IDs inside HTML comments, including comments that span lines', () => {
    const text = spec('Approved', [
      '<!-- - **FR-001**: a one-line comment -->',
      '- **FR-002**: Real. <!-- a comment that starts mid-line',
      '- **FR-003**: still inside the comment',
      '-->',
      '<!--',
      '- **FR-004**: inside a comment',
      '--> - **FR-005**: after a comment ends, not at the start of the line',
      '- **FR-006**: Real.',
    ]);
    expect(entriesOf(text).map((entry) => `${entry.rawId}@${entry.at}`)).toEqual(['FR-002@10:5', 'FR-006@16:5']);
  });

  test('a comment marker inside a code span, or one never closed, hides nothing', () => {
    const text = spec('Approved', [
      '- **FR-001**: The reader ignores `<!--` markers.',
      '- **FR-002**: Also ``a ` <!-- inside`` a double-backtick span.',
      '- **FR-003**: A stray ` backtick does not hide <!-- a real comment --> from the reader.',
      '<!-- - **FR-004**: inside a real comment -->',
      '- **FR-005**: Real.',
      '- **FR-006**: An unclosed <!-- is plain text.',
      '- **FR-007**: Real.',
    ]);
    expect(entriesOf(text).map((entry) => entry.rawId)).toEqual(['FR-001', 'FR-002', 'FR-003', 'FR-005', 'FR-006', 'FR-007']);
  });

  test('a comment marker in a code span does not hide later requirements from the check', () => {
    const root = makeProject({
      'specs/002-example/spec.md': spec('Approved', [
        '- **FR-001**: The reader ignores `<!--` markers.',
        '- **FR-002**: Real.',
        '',
        '<!-- a later comment -->',
      ]),
      'src/example.test.ts': "test('002-example-FR-001', () => {});\n",
    });
    const report = runCheck(root);
    expect(report.activeRequirements).toBe(2);
    expect(report.problems.map((problem) => `${problem.type} ${problem.subject}`)).toEqual(['uncovered 002-example-FR-002']);
  });

  test('ignores IDs inside fenced code blocks of both kinds', () => {
    const text = spec('Approved', [
      '```text',
      '- **FR-001**: inside a backtick fence',
      '```',
      '~~~',
      '- **FR-002**: inside a tilde fence',
      '```',
      '- **FR-003**: a backtick line does not close a tilde fence',
      '~~~',
      '- **FR-004**: Real.',
    ]);
    expect(entriesOf(text).map((entry) => `${entry.rawId}@${entry.at}`)).toEqual(['FR-004@17:5']);
  });

  test('requires the heading text to be exactly Functional Requirements', () => {
    const text = spec('Approved', ['- **FR-001**: One.']).replace(
      '### Functional Requirements',
      '### Functional Requirements (draft)',
    );
    expect(entriesOf(text)).toEqual([]);
  });

  test('a heading of the same level ends the section', () => {
    const text = spec('Approved', ['- **FR-001**: One.', '', '### Notes', '', '- **FR-002**: Not an entry.']);
    expect(entriesOf(text).map((entry) => entry.rawId)).toEqual(['FR-001']);
  });

  test('ignores a trailing carriage return', () => {
    const text = spec('Approved', ['- **FR-001**: One.']).replaceAll('\n', '\r\n');
    const parsed = parseSpec('002-example', FILE, text);
    expect(parsed.status).toBe('Approved');
    expect(parsed.entries.map((entry) => entry.rawId)).toEqual(['FR-001']);
  });
});

describe('001-requirement-traceability-FR-005: struck-through requirements are removed', () => {
  const text = spec('Approved', [
    '- **FR-001**: Active.',
    '- ~~**FR-002**~~: Removed 2026-10-21 - no longer needed.',
    '- **~~FR-003~~**: Removed 2026-10-21 - no longer needed.',
  ]);

  test('both strike-through forms mark an entry removed', () => {
    expect(entriesOf(text)).toEqual([
      { rawId: 'FR-001', wellFormed: true, removed: false, at: '9:5' },
      { rawId: 'FR-002', wellFormed: true, removed: true, at: '10:7' },
      { rawId: 'FR-003', wellFormed: true, removed: true, at: '11:7' },
    ]);
    expect(requirementsOf(parseSpec('002-example', FILE, text)).map((r) => [r.fullId, r.state])).toEqual([
      ['002-example-FR-001', 'active'],
      ['002-example-FR-002', 'removed'],
      ['002-example-FR-003', 'removed'],
    ]);
  });

  test('removed requirements need no coverage', () => {
    const root = makeProject({
      [FILE]: text,
      'src/example.test.ts': "test('covers 002-example-FR-001', () => {});\n",
    });
    const report = runCheck(root);
    expect(report.problems).toEqual([]);
    expect(report.activeRequirements).toBe(1);
  });
});

describe('001-requirement-traceability-FR-006: malformed entry IDs in approved specs are reported', () => {
  test('each malformed form is reported at its ID', () => {
    const text = spec('Approved', [
      '- **FR-001**: Well formed.',
      '- **FR-1**: Too few digits.',
      '- **FR-0001**: Too many digits.',
      '- **fr-001**: Wrong case.',
      '- **FR 001**: A space.',
      '- **FR.001**: A dot.',
      '- ~~**FR-1**~~: Removed and malformed.',
    ]);
    const detail = 'a requirement ID must be FR- followed by exactly three digits';
    expect(problemsOf(text)).toEqual([
      { type: 'malformed', subject: '"FR-1"', at: `${FILE}:10:5`, detail },
      { type: 'malformed', subject: '"FR-0001"', at: `${FILE}:11:5`, detail },
      { type: 'malformed', subject: '"fr-001"', at: `${FILE}:12:5`, detail },
      { type: 'malformed', subject: '"FR 001"', at: `${FILE}:13:5`, detail },
      { type: 'malformed', subject: '"FR.001"', at: `${FILE}:14:5`, detail },
      { type: 'malformed', subject: '"FR-1"', at: `${FILE}:15:7`, detail },
    ]);
  });
});

describe('001-requirement-traceability-FR-007: an ID defined more than once is reported with every line', () => {
  test('two active definitions', () => {
    expect(problemsOf(spec('Approved', ['- **FR-001**: One.', '- **FR-002**: Two.', '- **FR-001**: Again.']))).toEqual([
      { type: 'duplicate-id', subject: '002-example-FR-001', at: `${FILE}:9:5`, detail: 'defined 2 times, on lines 9 and 11' },
    ]);
  });

  test('an active and a removed definition', () => {
    expect(problemsOf(spec('Approved', ['- ~~**FR-001**~~: Removed.', '- **FR-001**: Reused.']))).toEqual([
      { type: 'duplicate-id', subject: '002-example-FR-001', at: `${FILE}:9:7`, detail: 'defined 2 times, on lines 9 and 10' },
    ]);
  });

  test('three definitions', () => {
    expect(problemsOf(spec('Approved', ['- **FR-001**: One.', '- **FR-001**: Two.', '- **FR-001**: Three.']))).toEqual([
      { type: 'duplicate-id', subject: '002-example-FR-001', at: `${FILE}:9:5`, detail: 'defined 3 times, on lines 9, 10 and 11' },
    ]);
  });
});

describe('001-requirement-traceability-FR-008: an approved spec with no requirements is reported', () => {
  const noRequirements = { type: 'no-requirements', subject: '002-example', at: `${FILE}:1:1`, detail: 'approved spec defines no requirements' };

  test('no entries at all', () => {
    expect(problemsOf(spec('Approved', []))).toEqual([noRequirements]);
  });

  test('only malformed entries', () => {
    expect(problemsOf(spec('Approved', ['- **FR-1**: Malformed.']))).toEqual([
      {
        type: 'malformed',
        subject: '"FR-1"',
        at: `${FILE}:9:5`,
        detail: 'a requirement ID must be FR- followed by exactly three digits',
      },
      noRequirements,
    ]);
  });
});
