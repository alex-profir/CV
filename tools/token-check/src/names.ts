import { compare } from '../../traceability/src/report.ts';
import type { Problem } from './report.ts';
import { definitionsOf, firstDefinitions } from './sources.ts';
import type { Definition, SourceRead } from './sources.ts';

// The CSS properties a typography token expands to (research R10).
export const TYPOGRAPHY_PARTS = [
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-decoration',
] as const;

const PART = /^[A-Za-z0-9_-]+$/;

// How code reads a token: `--token-` and the name in lower case, with `.` and
// `_` replaced by `-` (research R9). @cv/tokens builds the same name.
export function codeName(name: string): string {
  return `--token-${name.toLowerCase().replace(/[._]/g, '-')}`;
}

export function isBreakpoint(name: string): boolean {
  return name.split('.')[0] === 'breakpoint';
}

// Custom properties and custom media names starting with `--token-`,
// ignoring case, belong to tokens (FR-051).
export function inTokenNamespace(cssName: string): boolean {
  return cssName.toLowerCase().startsWith('--token-');
}

// The CSS names the description defines: every token's code name, except
// typography tokens, which give one per part instead.
export function cssNames(types: Map<string, string>): Set<string> {
  const names = new Set<string>();
  for (const [name, type] of types) {
    if (type === 'typography') for (const part of TYPOGRAPHY_PARTS) names.add(codeName(`${name}.${part}`));
    else names.add(codeName(name));
  }
  return names;
}

// The custom media names the description defines: one per breakpoint.
export function mediaNames(types: Map<string, string>): Set<string> {
  return new Set([...types.keys()].filter(isBreakpoint).map(codeName));
}

// FR-020 for one definition: an empty part, or one with other characters
// than ASCII letters, digits, hyphens and underscores, at its key.
export function unusableNames(read: SourceRead): Problem[] {
  return definitionsOf(read).flatMap((definition) => {
    const part = definition.parts.find((candidate) => !PART.test(candidate.text));
    if (part === undefined) return [];
    return [
      {
        type: 'unusable-name' as const,
        subject: definition.name,
        location: part.key,
        detail:
          part.text === ''
            ? 'has an empty name part'
            : `name part ${JSON.stringify(part.text)} may hold only ASCII letters, digits, hyphens and underscores`,
      },
    ];
  });
}

// FR-021, FR-022 and FR-047 over every definition of the given sources.
export function crossSourceNameRules(reads: SourceRead[]): Problem[] {
  const problems: Problem[] = [];
  const first = firstDefinitions(reads);
  const all = reads.flatMap(definitionsOf);
  const names = [...first.keys()].sort(compare);

  // Names code would read the same, typography parts included (FR-021).
  const byCode = new Map<string, Set<string>>();
  const add = (code: string, name: string) => byCode.set(code, (byCode.get(code) ?? new Set()).add(name));
  for (const definition of all) {
    add(codeName(definition.name), definition.name);
    if (definition.type === 'typography') for (const part of TYPOGRAPHY_PARTS) add(codeName(`${definition.name}.${part}`), definition.name);
  }
  const reported = new Set<string>();
  for (const code of [...byCode.keys()].sort(compare)) {
    const colliding = [...byCode.get(code)!].sort(compare);
    const key = colliding.join('\n');
    if (colliding.length < 2 || reported.has(key)) continue;
    reported.add(key);
    problems.push({
      type: 'name-collision',
      subject: colliding[0]!,
      location: first.get(colliding[0]!)!.key,
      detail: `code would read these names the same, as ${code}: ${colliding.join(', ')}`,
    });
  }

  // A token that is also a group of other tokens (FR-022).
  for (const name of names) {
    const longer = names.find((candidate) => candidate.startsWith(`${name}.`));
    if (longer === undefined) continue;
    problems.push({
      type: 'token-used-as-group',
      subject: name,
      location: first.get(name)!.key,
      detail: `is a token and also a group of ${longer}`,
    });
  }

  // A name in both sources (FR-047).
  const firstIn = (source: Definition['source']) => firstDefinitions(reads.filter((read) => read.source === source));
  const exported = firstIn('export');
  for (const [name, definition] of firstIn('motion')) {
    const other = exported.get(name);
    if (other === undefined) continue;
    problems.push({
      type: 'duplicate-token',
      subject: name,
      location: definition.key,
      detail: `defined in both the token export (${other.key.file}:${other.key.line}:${other.key.column}) and the motion token source`,
    });
  }
  return problems;
}
