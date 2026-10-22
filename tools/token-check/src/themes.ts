import { compare } from '../../traceability/src/report.ts';
import type { Problem } from './report.ts';
import { SOURCE_NAMES } from './sources.ts';
import type { SourceKind, SourceRead, ThemeRead } from './sources.ts';

// Theme groups and the names of the themes in each that take part, both in
// code-unit order.
export type Groups = Map<string, string[]>;

// One theme from each of some groups, groups in code-unit order.
export type Combination = { name: string; picks: [group: string, theme: string][] };

const label = (theme: { group: string; name: string }) => `${theme.group}/${theme.name}`;

const subject = (theme: ThemeRead) => `theme ${JSON.stringify(label(theme))}`;

// A theme without a group or without sets takes no part in groups,
// combinations or active themes (data-model.md, Which themes take part).
export function takesPart(theme: ThemeRead): boolean {
  return theme.group !== '' && theme.sets.length > 0;
}

// `mode/light + motion/standard`.
export function combinationName(picks: [string, string][]): string {
  return picks.map(([group, theme]) => `${group}/${theme}`).join(' + ');
}

function combination(picks: [string, string][]): Combination {
  return { name: combinationName(picks), picks };
}

// The groups of the given sources, from the themes that take part.
export function groupsOf(reads: SourceRead[]): Groups {
  const groups = new Map<string, Set<string>>();
  for (const theme of reads.flatMap((read) => read.themes).filter(takesPart)) {
    groups.set(theme.group, (groups.get(theme.group) ?? new Set()).add(theme.name));
  }
  return new Map(
    [...groups]
      .sort(([a], [b]) => compare(a, b))
      .map(([group, names]) => [group, [...names].sort(compare)]),
  );
}

// Every way to pick one theme from every group.
export function fullCombinations(groups: Groups): Combination[] {
  let found: [string, string][][] = [[]];
  for (const [group, names] of groups) found = found.flatMap((picks) => names.map((name) => [...picks, [group, name] as [string, string]]));
  return found.map(combination);
}

// One theme from each of a source's own groups. Resolution runs over these.
export function sourceCombinations(read: SourceRead): Combination[] {
  return fullCombinations(groupsOf([read]));
}

// The source combination a full combination picks for a source, or null when
// one of the source's own groups has no theme of the picked name.
export function sourceCombination(full: Combination, read: SourceRead): Combination | null {
  const own = groupsOf([read]);
  const picks: [string, string][] = [];
  for (const [group, names] of own) {
    const pick = full.picks.find(([picked]) => picked === group)?.[1];
    if (pick === undefined || !names.includes(pick)) return null;
    picks.push([group, pick]);
  }
  return combination(picks);
}

// The sets a source combination enables in a source, in set order.
export function enabledSets(read: SourceRead, picks: [string, string][]): string[] {
  const enabled = new Set<string>();
  for (const [group, name] of picks) {
    for (const theme of read.themes) if (takesPart(theme) && theme.group === group && theme.name === name) theme.sets.forEach((set) => enabled.add(set));
  }
  return read.sets.map((set) => set.name).filter((set) => enabled.has(set));
}

// FR-004, FR-011, FR-012 and FR-018 for one source.
export function themeRules(read: SourceRead): Problem[] {
  const problems: Problem[] = [];
  if (read.themes.length === 0) {
    problems.push({
      type: 'theme-without-sets',
      subject: '$themes',
      location: read.themesAt,
      detail: `the ${SOURCE_NAMES[read.source]} has no theme; at least one theme with at least one set is needed`,
    });
  }
  const setNames = new Set(read.sets.map((set) => set.name));
  for (const theme of read.themes) {
    if (theme.sets.length === 0) problems.push({ type: 'theme-without-sets', subject: subject(theme), location: theme.at, detail: 'enables no set' });
    if (theme.group === '') problems.push({ type: 'theme-without-group', subject: subject(theme), location: theme.at, detail: 'has no theme group' });
    for (const set of theme.sets) {
      if (setNames.has(set)) continue;
      problems.push({
        type: 'missing-set',
        subject: subject(theme),
        location: theme.at,
        detail: `enables set ${JSON.stringify(set)}, which the ${SOURCE_NAMES[read.source]} doesn't contain`,
      });
    }
  }
  const enabled = new Set(read.themes.flatMap((theme) => theme.sets));
  for (const set of read.sets) {
    if (enabled.has(set.name)) continue;
    problems.push({
      type: 'unused-set',
      subject: `set ${JSON.stringify(set.name)}`,
      location: set.key,
      detail: 'no theme enables it, so code can never read its tokens',
    });
  }
  return problems;
}

// FR-054: every group has exactly one active theme in each source where it
// takes part, and a group in both sources has the same one in both. Returns
// the problems, and the active theme of every group when there are none.
export function activeThemeRules(reads: SourceRead[]): { problems: Problem[]; active: Map<string, string> | null } {
  const problems: Problem[] = [];
  const perSource = new Map<SourceKind, Map<string, string>>();
  for (const read of reads) {
    const own = groupsOf([read]);
    const found = new Map<string, string[]>([...own.keys()].map((group) => [group, []]));
    for (const entry of read.activeThemes) {
      const theme = read.themes.find((candidate) => label(candidate) === entry);
      if (theme === undefined) {
        problems.push({
          type: 'invalid-active-themes',
          subject: `group ${JSON.stringify(entry.split('/')[0])}`,
          location: read.activeThemesAt,
          detail: `activeThemes lists ${JSON.stringify(entry)}, which is not a theme`,
        });
      } else if (takesPart(theme)) {
        found.get(theme.group)!.push(theme.name);
      }
    }
    const active = new Map<string, string>();
    for (const [group, names] of found) {
      if (names.length === 1) {
        active.set(group, names[0]!);
        continue;
      }
      const list = names.length === 0 ? '' : `: ${names.map((name) => `${group}/${name}`).sort(compare).join(', ')}`;
      problems.push({
        type: 'invalid-active-themes',
        subject: `group ${JSON.stringify(group)}`,
        location: read.activeThemesAt,
        detail: `needs exactly one active theme, found ${names.length}${list}`,
      });
    }
    perSource.set(read.source, active);
  }

  const exported = perSource.get('export');
  const motion = perSource.get('motion');
  const motionRead = reads.find((read) => read.source === 'motion');
  if (exported !== undefined && motion !== undefined && motionRead !== undefined) {
    for (const [group, name] of exported) {
      const other = motion.get(group);
      if (other === undefined || other === name) continue;
      problems.push({
        type: 'invalid-active-themes',
        subject: `group ${JSON.stringify(group)}`,
        location: motionRead.activeThemesAt,
        detail: `the active theme is ${group}/${name} in the export and ${group}/${other} in the motion token source`,
      });
    }
  }

  if (problems.length > 0) return { problems, active: null };
  const active = new Map<string, string>();
  for (const map of perSource.values()) for (const [group, name] of map) active.set(group, name);
  return { problems, active: new Map([...active].sort(([a], [b]) => compare(a, b))) };
}
