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

// Replaces HTML comments and fenced code blocks with spaces, keeping every
// line and column where it was. Comments may start mid-line and span lines.
function blankCommentsAndFences(lines: string[]): string[] {
  let inComment = false;
  let fence: string | null = null;
  return lines.map((line) => {
    if (fence !== null) {
      const closing = FENCE.exec(line)?.[1];
      if (closing !== undefined && closing[0] === fence[0] && closing.length >= fence.length && line.trim() === closing) {
        fence = null;
      }
      return ' '.repeat(line.length);
    }
    if (!inComment) {
      const opening = FENCE.exec(line)?.[1];
      if (opening !== undefined) {
        fence = opening;
        return ' '.repeat(line.length);
      }
    }
    let result = '';
    let at = 0;
    while (at < line.length) {
      if (inComment) {
        const end = line.indexOf('-->', at);
        const stop = end === -1 ? line.length : end + 3;
        result += ' '.repeat(stop - at);
        at = stop;
        inComment = end === -1;
      } else {
        const start = line.indexOf('<!--', at);
        const stop = start === -1 ? line.length : start;
        result += line.slice(at, stop);
        at = stop;
        inComment = start !== -1;
      }
    }
    return result;
  });
}

export function parseSpec(feature: string, file: string, text: string): Spec {
  const lines = blankCommentsAndFences(text.split('\n').map((line) => (line.endsWith('\r') ? line.slice(0, -1) : line)));

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
// gets, because the spec is then treated like a Draft one.
export function specProblems(spec: Spec): Problem[] {
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
  const requirements = requirementsOf(spec);
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
