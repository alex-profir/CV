import { compare } from '../../traceability/src/report.ts';
import { evaluateMath } from './math.ts';
import type { Problem } from './report.ts';
import { withArticle } from './sources.ts';
import type { Definition, SourceRead } from './sources.ts';
import { enabledSets } from './themes.ts';
import type { Combination } from './themes.ts';
import { valueProblem } from './values.ts';

// One name's winning definition in one combination, and its value once
// references and arithmetic are resolved. `value` is undefined when it
// couldn't be resolved, which is reported once, on the token at fault.
export type Resolved = { name: string; type: string | null; value: unknown; definition: Definition };

// Combination name → name → resolved token.
export type Resolution = Map<string, Map<string, Resolved>>;

// Types whose values can hold arithmetic, and the units each allows
// (research R7).
const LENGTH_UNITS = ['px', '%'];
const MATH_UNITS: Record<string, string[]> = {
  dimension: LENGTH_UNITS,
  spacing: LENGTH_UNITS,
  sizing: LENGTH_UNITS,
  borderRadius: LENGTH_UNITS,
  borderWidth: LENGTH_UNITS,
  fontSizes: LENGTH_UNITS,
  rotation: LENGTH_UNITS,
  opacity: LENGTH_UNITS,
  number: LENGTH_UNITS,
  letterSpacing: LENGTH_UNITS,
  lineHeights: LENGTH_UNITS,
  duration: ['ms', 's'],
};

// The type of each part of a composite value that can hold arithmetic.
const PART_TYPES: Record<string, Record<string, string>> = {
  typography: { fontSizes: 'fontSizes', lineHeights: 'lineHeights', letterSpacing: 'letterSpacing' },
  shadow: { offsetX: 'dimension', offsetY: 'dimension', blur: 'dimension', spread: 'dimension' },
};

const WHOLE_REFERENCE = /^\{([^{}]*)\}$/;

// Types whose unitless values mean pixels.
const PIXEL_TYPES = ['dimension', 'spacing', 'sizing', 'borderRadius', 'borderWidth', 'fontSizes', 'letterSpacing'];

const UNITLESS = /^\s*-?(?:\d+\.?\d*|\.\d+)\s*$/;

// Cycles in a reference graph: for each strongly connected component with a
// cycle, the shortest cycle through its name that sorts first, from that name
// back to it. Neighbours are tried in code-unit order.
function cycles(graph: Map<string, string[]>): { members: Set<string>; cycles: string[][] } {
  let index = 0;
  const indexes = new Map<string, number>();
  const lows = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  const connect = (node: string) => {
    indexes.set(node, index);
    lows.set(node, index);
    index += 1;
    stack.push(node);
    onStack.add(node);
    for (const next of graph.get(node) ?? []) {
      if (!indexes.has(next)) {
        connect(next);
        lows.set(node, Math.min(lows.get(node)!, lows.get(next)!));
      } else if (onStack.has(next)) {
        lows.set(node, Math.min(lows.get(node)!, indexes.get(next)!));
      }
    }
    if (lows.get(node) === indexes.get(node)) {
      const component: string[] = [];
      let member: string;
      do {
        member = stack.pop()!;
        onStack.delete(member);
        component.push(member);
      } while (member !== node);
      components.push(component);
    }
  };
  for (const node of [...graph.keys()].sort(compare)) if (!indexes.has(node)) connect(node);

  const members = new Set<string>();
  const found: string[][] = [];
  for (const component of components) {
    const start = component.sort(compare)[0]!;
    if (component.length === 1 && !(graph.get(start) ?? []).includes(start)) continue;
    component.forEach((member) => members.add(member));
    const inside = new Set(component);
    // Breadth-first from the start back to it.
    const previous = new Map<string, string>();
    const queue = [start];
    let end: string | undefined;
    while (queue.length > 0 && end === undefined) {
      const node = queue.shift()!;
      for (const next of [...(graph.get(node) ?? [])].sort(compare)) {
        if (!inside.has(next)) continue;
        if (next === start) {
          end = node;
          break;
        }
        if (previous.has(next)) continue;
        previous.set(next, node);
        queue.push(next);
      }
    }
    const path = [start];
    for (let node = end!; node !== start; node = previous.get(node)!) path.splice(1, 0, node);
    found.push([...path, start]);
  }
  return { members, cycles: found };
}

const describe = (value: unknown) => (typeof value === 'string' ? value : typeof value === 'number' ? String(value) : JSON.stringify(value));

// Resolves one source over its combinations (research R6, R7, R8; FR-009,
// FR-010, FR-014, FR-015, FR-017). A reference resolves only against the
// same source. `otherNames` holds the other source's names when it's
// checked: a reference to one of them is `cross-source-reference` (FR-046).
export function resolveSource(
  read: SourceRead,
  combinations: Combination[],
  otherNames: Set<string> | null,
): { resolution: Resolution; problems: Problem[] } {
  const problems: Problem[] = [];
  const resolution: Resolution = new Map();
  const missing = new Map<Definition, Map<string, string[]>>();
  const crossSource = new Map<Definition, Set<string>>();
  const conflicts = new Map<string, { winner: Definition; other: Definition; combinations: string[] }>();
  const loops = new Set<string>();
  const invalid = new Set<Definition>();

  for (const combination of combinations) {
    const sets = enabledSets(read, combination.picks);
    const merged = new Map<string, Definition>();
    const candidates = new Map<string, Definition[]>();
    for (const set of sets) {
      for (const definition of read.sets.find((candidate) => candidate.name === set)!.definitions) {
        merged.set(definition.name, definition);
        candidates.set(definition.name, [...(candidates.get(definition.name) ?? []), definition]);
      }
    }

    // Two enabled sets defining one name with different types (FR-017).
    for (const [name, winner] of merged) {
      const other = (candidates.get(name) ?? []).findLast((candidate) => candidate.set !== winner.set && candidate.type !== null && winner.type !== null && candidate.type !== winner.type);
      if (other === undefined) continue;
      const conflict = conflicts.get(name) ?? { winner, other, combinations: [] };
      conflict.combinations.push(combination.name);
      conflicts.set(name, conflict);
    }

    // References to names the combination doesn't define.
    const broken = new Set<string>();
    for (const [name, definition] of merged) {
      for (const reference of definition.references) {
        if (merged.has(reference)) continue;
        broken.add(name);
        if (otherNames?.has(reference)) {
          crossSource.set(definition, (crossSource.get(definition) ?? new Set()).add(reference));
        } else {
          const byName = missing.get(definition) ?? new Map<string, string[]>();
          byName.set(reference, [...(byName.get(reference) ?? []), combination.name]);
          missing.set(definition, byName);
        }
      }
    }

    // Loops (FR-010).
    const graph = new Map([...merged].map(([name, definition]) => [name, definition.references.filter((reference) => merged.has(reference))]));
    const found = cycles(graph);
    for (const cycle of found.cycles) {
      const key = cycle.join('\n');
      if (loops.has(key)) continue;
      loops.add(key);
      problems.push({
        type: 'reference-loop',
        subject: cycle[0]!,
        location: merged.get(cycle[0]!)!.valueAt,
        detail: `references form a loop: ${cycle.join(', ')}`,
      });
    }

    // Values, resolved depth first. A token that depends on one already
    // reported is left unresolved with no problem of its own.
    const values = new Map<string, { value: unknown } | null>();
    const resolve = (name: string): { value: unknown } | null => {
      if (values.has(name)) return values.get(name)!;
      values.set(name, null);
      const definition = merged.get(name)!;
      if (broken.has(name) || found.members.has(name)) return null;
      const dependencies = new Map<string, unknown>();
      for (const reference of definition.references) {
        const dependency = resolve(reference);
        if (dependency === null) return null;
        dependencies.set(reference, dependency.value);
      }

      let mixed = false;
      // Replaces references in one written part, then evaluates arithmetic
      // when the part's type allows it.
      const substitute = (part: unknown, type: string | undefined): unknown => {
        if (typeof part !== 'string') return part;
        const whole = WHOLE_REFERENCE.exec(part);
        if (whole !== null) return dependencies.get(whole[1]!);
        const text = part.replace(/\{([^{}]*)\}/g, (_match, reference: string) => {
          const written = describe(dependencies.get(reference));
          // A unitless length means pixels, so arithmetic sees its unit.
          return PIXEL_TYPES.includes(merged.get(reference)?.type ?? '') && UNITLESS.test(written) ? `${written.trim()}px` : written;
        });
        const units = type === undefined ? undefined : MATH_UNITS[type];
        if (units === undefined) return text;
        const result = evaluateMath(text, units);
        if ('value' in result) return result.value;
        if (result.error === 'mixed-units') mixed = true;
        return text;
      };
      // Replaces references in each item of a list. Penpot writes a font
      // family list that refers to another as `["{font.family.body}"]`, so an
      // item that resolves to a list is spliced in.
      const substituteList = (list: unknown[]): unknown[] =>
        list.flatMap((item) => {
          const resolved = substitute(item, undefined);
          return typeof item === 'string' && Array.isArray(resolved) ? resolved : [resolved];
        });
      const parts = PART_TYPES[definition.type ?? ''];
      let value: unknown;
      if (typeof definition.value === 'string' || parts === undefined) {
        value = Array.isArray(definition.value) ? substituteList(definition.value) : substitute(definition.value, definition.type ?? undefined);
      } else if (Array.isArray(definition.value)) {
        value = definition.value.map((item) => (item !== null && typeof item === 'object' ? substituteObject(item, parts, substitute, substituteList) : item));
      } else if (definition.value !== null && typeof definition.value === 'object') {
        value = substituteObject(definition.value, parts, substitute, substituteList);
      } else {
        value = definition.value;
      }

      if (definition.typeAllowed && definition.type !== null) {
        const detail = mixed ? `arithmetic ${JSON.stringify(definition.value)} mixes units` : valueProblem(definition.type, value, name);
        if (detail !== null) {
          if (!invalid.has(definition)) {
            invalid.add(definition);
            problems.push({ type: 'invalid-value', subject: name, location: definition.valueAt, detail });
          }
          return null;
        }
      }
      const resolved = { value };
      values.set(name, resolved);
      return resolved;
    };

    const tokens = new Map<string, Resolved>();
    for (const [name, definition] of [...merged].sort(([a], [b]) => compare(a, b))) {
      tokens.set(name, { name, type: definition.type, value: resolve(name)?.value, definition });
    }
    resolution.set(combination.name, tokens);
  }

  for (const [definition, byName] of missing) {
    for (const [reference, names] of byName) {
      problems.push({
        type: 'missing-reference',
        subject: definition.name,
        location: definition.valueAt,
        detail: `refers to ${JSON.stringify(reference)}, which no enabled set defines in ${names.join(', ')}`,
      });
    }
  }
  for (const [definition, references] of crossSource) {
    for (const reference of references) {
      problems.push({
        type: 'cross-source-reference',
        subject: definition.name,
        location: definition.valueAt,
        detail:
          definition.source === 'export'
            ? `refers to ${JSON.stringify(reference)}, which is in the motion token source; tokens in the export may not refer to motion tokens`
            : `refers to ${JSON.stringify(reference)}, which is in the token export; motion tokens may refer only to motion tokens`,
      });
    }
  }
  for (const [name, { winner, other, combinations: names }] of conflicts) {
    problems.push({
      type: 'conflicting-types',
      subject: name,
      location: winner.valueAt,
      detail: `is ${withArticle(other.type!)} in set ${JSON.stringify(other.set)} and ${withArticle(winner.type!)} in set ${JSON.stringify(winner.set)}, both enabled in ${names.join(', ')}`,
    });
  }
  return { resolution, problems };
}

function substituteObject(
  value: object,
  parts: Record<string, string>,
  substitute: (part: unknown, type: string | undefined) => unknown,
  substituteList: (list: unknown[]) => unknown[],
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).map(([key, part]) => [key, Array.isArray(part) ? substituteList(part) : substitute(part, parts[key])]));
}
