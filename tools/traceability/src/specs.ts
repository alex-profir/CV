import { fullId } from './ids.ts';
import type { Location, Problem } from './report.ts';

export type RequirementEntry = { rawId: string; wellFormed: boolean; removed: boolean; location: Location };

export type Spec = {
  feature: string;
  file: string;
  status: 'Approved' | 'Draft' | 'Invalid';
  statusText: string | null;
  statusLocation: Location;
  entries: RequirementEntry[];
};

export type Requirement = {
  feature: string;
  id: string;
  fullId: string;
  state: 'active' | 'removed';
  definitions: RequirementEntry[];
};

const STATUS_LABEL = '**Status**:';
const HEADING = /^(#{1,6})[ \t]+(.*?)[ \t]*#*[ \t]*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const ENTRY_START = /^fr[^A-Za-z0-9]?\d/i;
const RAW_ID = /^fr[^A-Za-z0-9]?\d[A-Za-z0-9_-]*/i;

// The index just after the code span whose opening backtick run starts at
// `start`: after the next run of the same length on the line. A run with no
// match is plain backticks, and ends where it does.
function codeSpanEnd(line: string, start: number): number {
  let open = start;
  while (line[open] === '`') open += 1;
  for (let at = open; at < line.length; ) {
    const next = line.indexOf('`', at);
    if (next === -1) break;
    let end = next;
    while (line[end] === '`') end += 1;
    if (end - next === open - start) return end;
    at = end;
  }
  return open;
}

// Replaces HTML comments and fenced code blocks with spaces, keeping every
// line and column where it was. Comments may start mid-line and span lines.
// A `<!--` inside a code span, or one that's never closed, is plain text, so
// it can't hide the rest of the spec.
function blankCommentsAndFences(lines: string[]): string[] {
  let fence: string | null = null;
  // Where the open comment ends: the line, and the column after its `-->`.
  let commentEnd: { line: number; column: number } | null = null;
  const findCommentEnd = (line: number, column: number) => {
    for (let index = line; index < lines.length; index++) {
      const end = lines[index]!.indexOf('-->', index === line ? column : 0);
      if (end !== -1) return { line: index, column: end + 3 };
    }
    return null;
  };

  return lines.map((line, index) => {
    if (fence !== null) {
      const closing = FENCE.exec(line)?.[1];
      if (closing !== undefined && closing[0] === fence[0] && closing.length >= fence.length && line.trim() === closing) {
        fence = null;
      }
      return ' '.repeat(line.length);
    }
    let at = 0;
    if (commentEnd !== null) {
      if (commentEnd.line > index) return ' '.repeat(line.length);
      at = commentEnd.column;
      commentEnd = null;
    } else {
      const opening = FENCE.exec(line)?.[1];
      if (opening !== undefined) {
        fence = opening;
        return ' '.repeat(line.length);
      }
    }
    let result = ' '.repeat(at);
    while (at < line.length) {
      const tick = line.indexOf('`', at);
      const start = line.indexOf('<!--', at);
      if (start === -1 || (tick !== -1 && tick < start)) {
        const stop = tick === -1 ? line.length : codeSpanEnd(line, tick);
        result += line.slice(at, stop);
        at = stop;
        continue;
      }
      const end = findCommentEnd(index, start + 2);
      if (end === null) {
        result += line.slice(at, start + 4);
        at = start + 4;
      } else if (end.line === index) {
        result += line.slice(at, start) + ' '.repeat(end.column - start);
        at = end.column;
      } else {
        result += line.slice(at, start) + ' '.repeat(line.length - start);
        commentEnd = end;
        at = line.length;
      }
    }
    return result;
  });
}

// A spec's lines without their line endings.
function linesOf(text: string): string[] {
  return text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line));
}

export function parseSpec(feature: string, file: string, text: string): Spec {
  const lines = blankCommentsAndFences(linesOf(text));

  let status: Spec['status'] = 'Invalid';
  let statusText: string | null = null;
  let statusLocation: Location = { file, line: 1, column: 1 };
  const statusIndex = lines.findIndex((line) => line.includes(STATUS_LABEL));
  if (statusIndex !== -1) {
    const line = lines[statusIndex]!;
    const afterLabel = line.indexOf(STATUS_LABEL) + STATUS_LABEL.length;
    statusText = line.slice(afterLabel).trim();
    const valueStart = statusText === '' ? 0 : line.indexOf(statusText, afterLabel);
    statusLocation = { file, line: statusIndex + 1, column: valueStart + 1 };
    if (statusText === 'Approved' || statusText === 'Draft') status = statusText;
  }

  const entries: RequirementEntry[] = [];
  let sectionLevel: number | null = null;
  lines.forEach((line, index) => {
    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      if (sectionLevel !== null && level <= sectionLevel) sectionLevel = null;
      else if (sectionLevel === null && heading[2] === 'Functional Requirements') sectionLevel = level;
      return;
    }
    if (sectionLevel === null || !(line.startsWith('- ') || line.startsWith('* '))) return;

    let at = 2;
    let markup = '';
    while (line.startsWith('~~', at) || line.startsWith('**', at)) {
      markup += line.slice(at, at + 2);
      at += 2;
    }
    const rest = line.slice(at);
    if (!ENTRY_START.test(rest)) return;
    const rawId = RAW_ID.exec(rest)![0];
    entries.push({
      rawId,
      wellFormed: /^FR-\d{3}$/.test(rawId),
      removed: markup.includes('~~'),
      location: { file, line: index + 1, column: at + 1 },
    });
  });

  return { feature, file, status, statusText, statusLocation, entries };
}

// Well-formed entries grouped by ID, in file order.
export function requirementsOf(spec: Spec): Requirement[] {
  const byId = new Map<string, Requirement>();
  for (const entry of spec.entries) {
    if (!entry.wellFormed) continue;
    let requirement = byId.get(entry.rawId);
    if (requirement === undefined) {
      requirement = { feature: spec.feature, id: entry.rawId, fullId: fullId(spec.feature, entry.rawId), state: 'removed', definitions: [] };
      byId.set(entry.rawId, requirement);
    }
    requirement.definitions.push(entry);
    if (!entry.removed) requirement.state = 'active';
  }
  return [...byId.values()];
}

function listLines(lines: number[]): string {
  return lines.length === 2 ? `${lines[0]} and ${lines[1]}` : `${lines.slice(0, -1).join(', ')} and ${lines.at(-1)}`;
}

// A Draft spec gets no problem. An invalid Status is the only problem its spec
// gets, because the spec is then treated like a Draft one. `requirements` is
// requirementsOf(spec).
export function specProblems(spec: Spec, requirements: Requirement[]): Problem[] {
  if (spec.status === 'Invalid') {
    return [
      {
        type: 'bad-status',
        subject: `"${spec.statusText ?? ''}"`,
        location: spec.statusLocation,
        detail: spec.statusText === null ? 'spec has no Status line' : 'Status must be Draft or Approved',
      },
    ];
  }
  if (spec.status === 'Draft') return [];

  const problems: Problem[] = spec.entries
    .filter((entry) => !entry.wellFormed)
    .map((entry) => ({
      type: 'malformed',
      subject: `"${entry.rawId}"`,
      location: entry.location,
      detail: 'a requirement ID must be FR- followed by exactly three digits',
    }));
  for (const requirement of requirements) {
    const { definitions } = requirement;
    if (definitions.length < 2) continue;
    problems.push({
      type: 'duplicate-id',
      subject: requirement.fullId,
      location: definitions[0]!.location,
      detail: `defined ${definitions.length} times, on lines ${listLines(definitions.map((entry) => entry.location.line))}`,
    });
  }
  if (requirements.length === 0) {
    problems.push({
      type: 'no-requirements',
      subject: spec.feature,
      location: { file: spec.file, line: 1, column: 1 },
      detail: 'approved spec defines no requirements',
    });
  }
  return problems;
}

const TITLE_PREFIX = 'Feature Specification:';

// The spec's title: the text after `Feature Specification:` in its first
// heading, or null when the first heading doesn't start that way or there's
// none. Comments and fences are blanked first, as parseSpec blanks them.
export function specTitle(text: string): string | null {
  for (const line of blankCommentsAndFences(linesOf(text))) {
    const heading = HEADING.exec(line);
    if (!heading) continue;
    const title = heading[2]!;
    return title.startsWith(TITLE_PREFIX) ? title.slice(TITLE_PREFIX.length).trim() || null : null;
  }
  return null;
}

const LIST_ITEM = /^(?:[-*+]|\d+[.)])(?:[ \t]|$)/;

// A requirement's text (007 research R6): its entry's line from after its ID,
// its closing markup and the colon, then each following line that is indented
// and isn't blank, a list item or a heading, trimmed and joined with single
// spaces. Comments and fences are blanked as parseSpec blanks them: a line a
// comment blanks whole is passed over, and a fence ends the text.
export function requirementText(text: string, entry: RequirementEntry): string {
  const original = linesOf(text);
  const lines = blankCommentsAndFences(original);
  const first = lines[entry.location.line - 1] ?? '';
  let at = entry.location.column - 1 + entry.rawId.length;
  while (first.startsWith('**', at) || first.startsWith('~~', at)) at += 2;
  const rest = first.slice(at).replace(/^[ \t]*:/, '');
  const parts = [rest];
  for (let index = entry.location.line; index < lines.length; index++) {
    const line = lines[index]!;
    if (!/^[ \t]/.test(original[index]!)) break;
    const trimmed = line.trim();
    if (trimmed === '') {
      if (original[index]!.trim() === '') break;
      continue;
    }
    if (LIST_ITEM.test(trimmed) || HEADING.test(trimmed)) break;
    parts.push(trimmed);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}
