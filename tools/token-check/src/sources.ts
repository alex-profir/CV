import type { Node } from 'jsonc-parser';
import { getNodeValue } from 'jsonc-parser';
import { offsetToLocation, readDocument } from '../../content-check/src/json.ts';
import { EXPORT_FILE, MOTION_FILE } from './paths.ts';
import type { Location, Problem, SourceState } from './report.ts';
import { MOTION_TYPES, PENPOT_TYPES, SHADOW_FIELDS, TYPOGRAPHY_FIELDS } from './values.ts';

export type SourceKind = 'export' | 'motion';

// One part of a token's name, with the key it was written in.
export type NamePart = { text: string; key: Location };

// One token as written in one set (data-model.md, TokenDefinition).
export type Definition = {
  source: SourceKind;
  name: string;
  parts: NamePart[];
  set: string;
  // null when `$type` is missing or isn't a string.
  type: string | null;
  // Whether the source may hold this type. A type it may not hold is reported
  // where it's read, and its values aren't checked.
  typeAllowed: boolean;
  value: unknown;
  description: string | null;
  references: string[];
  key: Location;
  typeAt: Location;
  valueAt: Location;
};

export type TokenSet = { name: string; key: Location; definitions: Definition[] };

// One theme as written in one source.
export type ThemeRead = {
  source: SourceKind;
  group: string;
  name: string;
  // Enabled set names, in the order written.
  sets: string[];
  at: Location;
};

// The result of reading one token source (data-model.md, SourceRead).
export type SourceRead = {
  source: SourceKind;
  file: string;
  state: SourceState;
  // Sets in `tokenSetOrder` order. Sets it doesn't list follow, in the order
  // written.
  sets: TokenSet[];
  themes: ThemeRead[];
  themesAt: Location;
  activeThemes: string[];
  activeThemesAt: Location;
  // The read problem, then structure and duplicate problems.
  problems: Problem[];
  tokens: number;
};

export const SOURCE_FILES: Record<SourceKind, string> = { export: EXPORT_FILE, motion: MOTION_FILE };

export const SOURCE_NAMES: Record<SourceKind, string> = { export: 'export', motion: 'motion token source' };

const TOKEN_KEYS = ['$value', '$type', '$description'];

const THEME_KEYS = ['id', 'name', 'group', 'description', 'isSource', 'selectedTokenSets'];

const METADATA_KEYS = ['tokenSetOrder', 'activeThemes', 'activeSets'];

const REFERENCE = /\{([^{}]*)\}/g;

const START = { line: 1, column: 1 };

function properties(node: Node): { key: string; keyNode: Node; value: Node }[] {
  return (node.children ?? []).flatMap((property) => {
    const [keyNode, value] = property.children ?? [];
    return keyNode === undefined || value === undefined ? [] : [{ key: String(keyNode.value), keyNode, value }];
  });
}

function property(node: Node, key: string): { keyNode: Node; value: Node } | undefined {
  return properties(node).find((entry) => entry.key === key);
}

// Every `{name}` in any string at any depth of a value, once each, in order.
export function referencesIn(value: unknown): string[] {
  const found: string[] = [];
  const visit = (part: unknown) => {
    if (typeof part === 'string') {
      for (const [, name] of part.matchAll(REFERENCE)) if (!found.includes(name!)) found.push(name!);
    } else if (Array.isArray(part)) {
      part.forEach(visit);
    } else if (part !== null && typeof part === 'object') {
      Object.values(part).forEach(visit);
    }
  };
  visit(value);
  return found;
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

// `a color`, `an opacity`, `a fontFamilies`: a type in its source's spelling.
export function withArticle(type: string): string {
  return `${article(type)} ${type}`;
}

// Reads one source and checks its structure against what Penpot writes
// (FR-013, FR-016, FR-043, research R3, R5).
export function readSource(root: string, source: SourceKind): SourceRead {
  const file = SOURCE_FILES[source];
  const document = readDocument(root, file);
  const read: SourceRead = {
    source,
    file,
    state: 'checked',
    sets: [],
    themes: [],
    themesAt: { file, ...START },
    activeThemes: [],
    activeThemesAt: { file, ...START },
    problems: [],
    tokens: 0,
  };
  if (document.problem !== undefined) {
    const type = document.state === 'missing' ? 'missing-file' : 'unreadable-file';
    read.state = document.state === 'missing' ? 'missing' : 'unreadable';
    read.problems.push({ type, subject: file, location: document.problem.location, detail: document.problem.detail });
    return read;
  }

  const lineStarts = document.lineStarts!;
  const at = (node: Node): Location => offsetToLocation(file, lineStarts, node.offset);
  const problem = (subject: string, node: Node, detail: string) => {
    read.problems.push({ type: 'unsupported-content', subject, location: at(node), detail });
  };
  const tree = document.tree!;
  if (tree.type !== 'object') {
    problem(file, tree, 'Penpot writes the top level as an object');
    return read;
  }

  const sets = new Map<string, TokenSet>();
  const definitions: Definition[] = [];

  const readToken = (node: Node, parts: NamePart[], set: string) => {
    const name = parts.map((part) => part.text).join('.');
    const typeEntry = property(node, '$type');
    const valueEntry = property(node, '$value')!;
    const descriptionEntry = property(node, '$description');
    for (const { key, keyNode } of properties(node)) {
      if (!TOKEN_KEYS.includes(key)) problem(name, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in a token`);
    }
    for (const key of ['$type', '$description']) {
      if (property(node, key) === undefined) problem(name, node, `Penpot always writes ${JSON.stringify(key)} in a token`);
    }
    if (typeEntry !== undefined && typeEntry.value.type !== 'string') problem(name, typeEntry.value, 'Penpot writes "$type" as a string');
    if (descriptionEntry !== undefined && descriptionEntry.value.type !== 'string') {
      problem(name, descriptionEntry.value, 'Penpot writes "$description" as a string');
    }

    const type = typeEntry?.value.type === 'string' ? String(typeEntry.value.value) : null;
    const typeAt = at(typeEntry?.value ?? node);
    let typeAllowed = type !== null;
    if (type !== null && source === 'export' && !(PENPOT_TYPES as readonly string[]).includes(type)) {
      const motion = (MOTION_TYPES as readonly string[]).includes(type) ? '; durations and easing curves go in the motion token source' : '';
      problem(name, typeEntry!.value, `Penpot doesn't support the type ${JSON.stringify(type)}${motion}`);
      typeAllowed = false;
    } else if (type !== null && source === 'motion' && !(MOTION_TYPES as readonly string[]).includes(type)) {
      typeAllowed = false;
      if ((PENPOT_TYPES as readonly string[]).includes(type)) {
        read.problems.push({
          type: 'wrong-source',
          subject: name,
          location: typeAt,
          detail: `${withArticle(type)} token belongs in Penpot; the motion token source holds only durations and easing curves`,
        });
      } else {
        problem(name, typeEntry!.value, `Penpot doesn't support the type ${JSON.stringify(type)}`);
      }
    }

    let value = getNodeValue(valueEntry.value);
    if (type === 'typography' && valueEntry.value.type === 'object') {
      for (const { key, keyNode } of properties(valueEntry.value)) {
        if (!Object.hasOwn(TYPOGRAPHY_FIELDS, key)) problem(name, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in a typography value`);
      }
    }
    if (type === 'shadow' && (valueEntry.value.type === 'object' || valueEntry.value.type === 'array')) {
      // A single shadow object becomes a list when Penpot imports it.
      const shadows = valueEntry.value.type === 'object' ? [valueEntry.value] : (valueEntry.value.children ?? []);
      if (valueEntry.value.type === 'object') {
        problem(name, valueEntry.value, 'Penpot writes "$value" as an array in a shadow');
        value = [value];
      }
      for (const shadow of shadows) {
        if (shadow.type !== 'object') continue;
        for (const { key, keyNode } of properties(shadow)) {
          if (!Object.hasOwn(SHADOW_FIELDS, key)) problem(name, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in a shadow`);
        }
      }
    }

    definitions.push({
      source,
      name,
      parts,
      set,
      type,
      typeAllowed,
      value,
      description: descriptionEntry?.value.type === 'string' ? String(descriptionEntry.value.value) : null,
      references: referencesIn(value),
      key: parts.at(-1)!.key,
      typeAt,
      valueAt: at(valueEntry.value),
    });
  };

  const readGroup = (node: Node, parts: NamePart[], set: string) => {
    const groupName = parts.length === 0 ? `set ${JSON.stringify(set)}` : parts.map((part) => part.text).join('.');
    for (const { key, keyNode, value } of properties(node)) {
      if (key.startsWith('$')) {
        problem(groupName, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in a group`);
        continue;
      }
      const keyAt = at(keyNode);
      const childParts = [...parts, ...key.split('.').map((text) => ({ text, key: keyAt }))];
      const childName = childParts.map((part) => part.text).join('.');
      if (key.includes('.')) problem(childName, keyNode, `Penpot writes each name part as its own key, not ${JSON.stringify(key)}`);
      if (value.type !== 'object') {
        problem(childName, value, `Penpot writes ${JSON.stringify(key)} as a token or a group`);
      } else if (property(value, '$value') !== undefined) {
        readToken(value, childParts, set);
      } else if (property(value, 'value') !== undefined && property(value, 'type')?.value.type === 'string') {
        // A Tokens Studio token, which Penpot imports but never writes.
        problem(childName, property(value, 'value')!.keyNode, `Penpot doesn't write "value" in a token`);
      } else {
        readGroup(value, childParts, set);
      }
    }
  };

  let themesEntry: { keyNode: Node; value: Node } | undefined;
  let metadataEntry: { keyNode: Node; value: Node } | undefined;
  for (const { key, keyNode, value } of properties(tree)) {
    if (key === '$themes') {
      themesEntry = { keyNode, value };
    } else if (key === '$metadata') {
      metadataEntry = { keyNode, value };
    } else if (key.startsWith('$')) {
      problem(key, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in the top level`);
    } else {
      if (!sets.has(key)) sets.set(key, { name: key, key: at(keyNode), definitions: [] });
      if (value.type === 'object') readGroup(value, [], key);
      else problem(`set ${JSON.stringify(key)}`, value, `Penpot writes ${JSON.stringify(key)} as an object`);
    }
  }
  for (const definition of definitions) sets.get(definition.set)!.definitions.push(definition);

  // Themes.
  if (themesEntry === undefined) {
    problem('$themes', tree, 'Penpot always writes "$themes" in the top level');
  } else if (themesEntry.value.type !== 'array') {
    read.themesAt = at(themesEntry.value);
    problem('$themes', themesEntry.value, 'Penpot writes "$themes" as an array');
  } else {
    read.themesAt = at(themesEntry.value);
    for (const themeNode of themesEntry.value.children ?? []) {
      if (themeNode.type !== 'object') {
        problem('$themes', themeNode, 'Penpot writes each theme as an object');
        continue;
      }
      const field = (key: string) => property(themeNode, key)?.value;
      const group = field('group')?.type === 'string' ? String(field('group')!.value) : '';
      const name = field('name')?.type === 'string' ? String(field('name')!.value) : '';
      const subject = `theme ${JSON.stringify(`${group}/${name}`)}`;
      for (const { key, keyNode } of properties(themeNode)) {
        if (!THEME_KEYS.includes(key)) problem(subject, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in a theme`);
      }
      for (const key of THEME_KEYS) {
        const value = field(key);
        if (value === undefined) {
          problem(subject, themeNode, `Penpot always writes ${JSON.stringify(key)} in a theme`);
        } else if ((key === 'id' || key === 'name') && (value.type !== 'string' || value.value === '')) {
          problem(subject, value, `Penpot writes ${JSON.stringify(key)} as a non-empty string`);
        } else if ((key === 'group' || key === 'description') && value.type !== 'string') {
          problem(subject, value, `Penpot writes ${JSON.stringify(key)} as a string`);
        } else if (key === 'isSource' && value.value !== false) {
          problem(subject, value, 'Penpot writes "isSource" as false');
        } else if (key === 'selectedTokenSets' && value.type !== 'object') {
          problem(subject, value, 'Penpot writes "selectedTokenSets" as an object');
        }
      }
      const enabled: string[] = [];
      const selected = field('selectedTokenSets');
      if (selected?.type === 'object') {
        for (const { key, value } of properties(selected)) {
          if (value.value === 'enabled' && value.type === 'string') {
            if (!enabled.includes(key)) enabled.push(key);
          } else {
            problem(subject, value, 'Penpot writes only "enabled" here');
          }
        }
      }
      read.themes.push({ source, group, name, sets: enabled, at: at(themeNode) });
    }
  }

  // Metadata.
  let order: string[] = [];
  if (metadataEntry === undefined) {
    problem('$metadata', tree, 'Penpot always writes "$metadata" in the top level');
  } else if (metadataEntry.value.type !== 'object') {
    problem('$metadata', metadataEntry.value, 'Penpot writes "$metadata" as an object');
  } else {
    const metadata = metadataEntry.value;
    read.activeThemesAt = at(metadata);
    for (const { key, keyNode } of properties(metadata)) {
      if (!METADATA_KEYS.includes(key)) problem(`$metadata.${key}`, keyNode, `Penpot doesn't write ${JSON.stringify(key)} in $metadata`);
    }
    for (const key of METADATA_KEYS) {
      const value = property(metadata, key)?.value;
      if (value === undefined) {
        problem(`$metadata.${key}`, metadata, `Penpot always writes ${JSON.stringify(key)} in $metadata`);
        continue;
      }
      if (key === 'activeThemes') read.activeThemesAt = at(value);
      const list = getNodeValue(value) as unknown;
      if (!Array.isArray(list) || !list.every((entry) => typeof entry === 'string')) {
        problem(`$metadata.${key}`, value, `Penpot writes ${JSON.stringify(key)} as an array of strings`);
        continue;
      }
      if (key === 'activeThemes') read.activeThemes = [...new Set(list as string[])];
      if (key !== 'tokenSetOrder') continue;
      order = list as string[];
      const missing = [...sets.keys()].filter((set) => !order.includes(set));
      const repeated = [...new Set(order.filter((set, index) => order.indexOf(set) !== index))];
      const unknown = [...new Set(order.filter((set) => !sets.has(set)))];
      const names = (list: string[]) => list.map((set) => JSON.stringify(set)).join(', ');
      for (const [found, word] of [
        [missing, 'missing'],
        [repeated, 'repeated'],
        [unknown, 'not a set'],
      ] as const) {
        if (found.length > 0) problem('$metadata.tokenSetOrder', value, `must list every set exactly once; ${names(found)} ${word}`);
      }
    }
  }

  // Sets in `tokenSetOrder`, then any it doesn't list, in the order written.
  const rank = (set: string) => (order.includes(set) ? order.indexOf(set) : order.length);
  read.sets = [...sets.values()].sort((a, b) => rank(a.name) - rank(b.name));

  // The same name twice in one set (FR-016).
  for (const set of read.sets) {
    const byName = new Map<string, Definition[]>();
    for (const definition of set.definitions) byName.set(definition.name, [...(byName.get(definition.name) ?? []), definition]);
    for (const [name, found] of byName) {
      if (found.length < 2) continue;
      const keys = found.map((definition) => definition.key).sort((a, b) => a.line - b.line || a.column - b.column);
      read.problems.push({
        type: 'duplicate-token',
        subject: name,
        location: keys[0]!,
        detail: `defined ${found.length} times in set ${JSON.stringify(set.name)}: ${keys.map((key) => `${key.line}:${key.column}`).join(', ')}`,
      });
    }
  }

  read.tokens = definitions.length;
  return read;
}

// Every definition of a source, set by set in set order.
export function definitionsOf(read: SourceRead): Definition[] {
  return read.sets.flatMap((set) => set.definitions);
}

// The first definition of each name: export before motion, then by position.
export function firstDefinitions(reads: SourceRead[]): Map<string, Definition> {
  const all = reads
    .flatMap(definitionsOf)
    .sort(
      (a, b) =>
        (a.source === b.source ? 0 : a.source === 'export' ? -1 : 1) || a.key.line - b.key.line || a.key.column - b.key.column,
    );
  const first = new Map<string, Definition>();
  for (const definition of all) if (!first.has(definition.name)) first.set(definition.name, definition);
  return first;
}
