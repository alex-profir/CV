import fs from 'node:fs';
import path from 'node:path';
import { compare } from '../../traceability/src/report.ts';
import { readComponent } from './components.ts';
import { readStyleSheet } from './css.ts';
import { crossSourceNameRules, cssNames, mediaNames, unusableNames } from './names.ts';
import { buildOutput } from './output.ts';
import { OUTPUT_CSS_FILE, OUTPUT_TS_FILE } from './paths.ts';
import { PARTS, sortProblems } from './report.ts';
import type { OutputState, Part, Problem, Report } from './report.ts';
import { resolveSource } from './resolve.ts';
import type { Resolution, Resolved } from './resolve.ts';
import { siteFiles } from './site-files.ts';
import { definitionsOf, firstDefinitions, readSource, withArticle } from './sources.ts';
import type { SourceKind, SourceRead } from './sources.ts';
import { activeThemeRules, combinationName, fullCombinations, groupsOf, sourceCombination, sourceCombinations, themeRules } from './themes.ts';
import type { Groups } from './themes.ts';

export type SourceCheck = {
  reads: Record<SourceKind, SourceRead>;
  // Problems from the export rules, the motion rules and the cross-source
  // rules.
  problems: Problem[];
  resolved: Record<SourceKind, Resolution>;
  groups: Groups;
  // The active theme of every group, or null when it isn't known.
  active: Map<string, string> | null;
  activeCombination: string | null;
  // Every full combination with its resolved tokens. Empty unless both
  // sources are checked.
  combinations: { name: string; tokens: Map<string, Resolved> }[];
  // The description: every name and its type. Null unless both sources are
  // checked.
  types: Map<string, string> | null;
  partsNotRun: Part[];
};

// The tokens of every full combination, each source contributing its
// resolution for the combination's picks of its own groups (data-model.md,
// Full combinations). A name in both sources takes the export's.
function combinationTokens(reads: SourceRead[], resolved: Record<SourceKind, Resolution>, groups: Groups) {
  return fullCombinations(groups).map((full) => {
    const tokens = new Map<string, Resolved>();
    for (const read of reads) {
      const picked = sourceCombination(full, read);
      if (picked === null) continue;
      for (const [name, token] of resolved[read.source].get(picked.name) ?? []) if (!tokens.has(name)) tokens.set(name, token);
    }
    return { name: full.name, tokens: new Map([...tokens].sort(([a], [b]) => compare(a, b))) };
  });
}

// FR-023 and FR-048: every full combination has the same names, each with
// the same type.
function themeMismatches(reads: SourceRead[], combinations: SourceCheck['combinations']): Problem[] {
  const problems: Problem[] = [];
  const first = firstDefinitions(reads);
  const names = new Set(combinations.flatMap(({ tokens }) => [...tokens.keys()]));
  for (const name of [...names].sort(compare)) {
    const missing = combinations.filter(({ tokens }) => !tokens.has(name)).map(({ name: combination }) => combination);
    const byType = new Map<string, string[]>();
    for (const { name: combination, tokens } of combinations) {
      const type = tokens.get(name)?.type;
      if (type === undefined || type === null) continue;
      byType.set(type, [...(byType.get(type) ?? []), combination]);
    }
    // The type of the name's first definition comes first, then the others
    // in the order of their first combination.
    const definition = first.get(name)!;
    const types = [...byType].sort(([a], [b]) => Number(b === definition.type) - Number(a === definition.type));
    let detail: string | undefined;
    if (missing.length > 0) detail = `missing in ${missing.join(', ')}`;
    else if (types.length > 1) detail = `is ${types.map(([type, found]) => `${withArticle(type)} in ${found.join(', ')}`).join(' and ')}`;
    if (detail !== undefined) problems.push({ type: 'theme-mismatch', subject: name, location: definition.valueAt, detail });
  }
  return problems;
}

// Reads both sources and runs the export rules, the motion rules and the
// cross-source rules (data-model.md, Check parts).
export function checkSources(root: string): SourceCheck {
  const reads = { export: readSource(root, 'export'), motion: readSource(root, 'motion') };
  const checked = [reads.export, reads.motion].filter((read) => read.state === 'checked');
  const both = checked.length === 2;
  const problems: Problem[] = [reads.export, reads.motion].flatMap((read) => read.problems);
  const partsNotRun: Part[] = [];
  if (reads.export.state !== 'checked') partsNotRun.push('export rules');
  if (reads.motion.state !== 'checked') partsNotRun.push('motion rules');
  if (!both) partsNotRun.push('cross-source rules');

  const resolved: Record<SourceKind, Resolution> = { export: new Map(), motion: new Map() };
  for (const read of checked) {
    const other = checked.find((candidate) => candidate !== read);
    const otherNames = other === undefined ? null : new Set(definitionsOf(other).map((definition) => definition.name));
    problems.push(...themeRules(read), ...unusableNames(read));
    const result = resolveSource(read, sourceCombinations(read), otherNames);
    resolved[read.source] = result.resolution;
    problems.push(...result.problems);
  }
  problems.push(...crossSourceNameRules(checked));

  const groups = groupsOf(checked);
  const activeRules = activeThemeRules(checked);
  problems.push(...activeRules.problems);
  const active = activeRules.active;

  let combinations: SourceCheck['combinations'] = [];
  let types: Map<string, string> | null = null;
  if (both) {
    combinations = combinationTokens(checked, resolved, groups);
    problems.push(...themeMismatches(checked, combinations));
    types = new Map();
    for (const { tokens } of combinations) for (const [name, token] of tokens) if (!types.has(name) && token.type !== null) types.set(name, token.type);
    types = new Map([...types].sort(([a], [b]) => compare(a, b)));
  }

  return {
    reads,
    problems,
    resolved,
    groups,
    active,
    activeCombination: active === null ? null : combinationName([...active]),
    combinations,
    types,
    partsNotRun,
  };
}

function outputOf(sources: SourceCheck): { css: string; ts: string } | null {
  if (sources.types === null || sources.active === null || sources.problems.length > 0) return null;
  return buildOutput({
    combinations: sources.combinations.map(({ name, tokens }) => ({
      name,
      tokens: new Map([...tokens].map(([token, { type, value }]) => [token, { type: type!, value }])),
    })),
    types: sources.types,
    groups: sources.groups,
    active: sources.active,
  });
}

// The derived output for the sources under `root`, or null when either
// source isn't checked, any source rule reports a problem, or the active
// combination isn't known.
export function outputFor(root: string): { css: string; ts: string } | null {
  return outputOf(checkSources(root));
}

function readCommitted(root: string, file: string): string | null {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch {
    return null;
  }
}

// Identical problems found twice, such as by two combinations, are reported
// once.
function unique(problems: Problem[]): Problem[] {
  const seen = new Set<string>();
  return problems.filter((problem) => {
    const { file, line, column } = problem.location;
    const key = JSON.stringify([file, line, column, problem.type, problem.subject, problem.detail]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// One run of the check over a root directory.
export function runCheck(root: string): Report {
  const sources = checkSources(root);
  const problems = [...sources.problems];
  const checksNotRun = [...sources.partsNotRun];

  // The derived output (FR-005).
  let output: OutputState = 'not checked';
  const built = outputOf(sources);
  if (built === null) {
    checksNotRun.push('derived output');
  } else {
    output = 'current';
    for (const [file, text] of [
      [OUTPUT_CSS_FILE, built.css],
      [OUTPUT_TS_FILE, built.ts],
    ] as const) {
      const committed = readCommitted(root, file);
      if (committed === text) continue;
      output = 'stale';
      problems.push({
        type: 'stale-output',
        subject: file,
        location: { file, line: 1, column: 1 },
        detail: committed === null ? 'is missing; run npm run token-output' : "doesn't match the token sources; run npm run token-output",
      });
    }
  }

  // The site files: token names, and the literal values search, which always
  // runs.
  const site = siteFiles(root);
  problems.push(...site.problems);
  const names = sources.types === null ? null : { css: cssNames(sources.types), media: mediaNames(sources.types) };
  if (names === null) checksNotRun.push('token names in site files');
  for (const file of site.files) {
    const found = file.kind === 'style-sheet' ? readStyleSheet(file.file, file.text) : readComponent(file.file, file.text);
    if (found.problem !== null) {
      problems.push(found.problem);
      continue;
    }
    problems.push(...found.literals);
    for (const definition of found.definitions) {
      problems.push({
        type: 'local-in-token-namespace',
        subject: definition.name,
        location: definition.location,
        detail: '--token- names are reserved for tokens; use another name for a local variable',
      });
    }
    if (names === null) continue;
    for (const read of found.reads) {
      if ((read.media ? names.media : names.css).has(read.name)) continue;
      problems.push({
        type: 'unknown-token',
        subject: read.name,
        location: read.location,
        detail: read.media ? 'no breakpoint token has this name' : 'no token has this name',
      });
    }
  }

  const sorted = sortProblems(unique(problems));
  const both = sources.reads.export.state === 'checked' && sources.reads.motion.state === 'checked';
  const source = (label: Report['sources'][number]['label'], read: SourceRead) => ({
    label,
    file: read.file,
    state: read.state,
    sets: read.sets.length,
    themes: read.themes.length,
    tokens: read.tokens,
  });
  return {
    problems: sorted,
    sources: [source('Token export', sources.reads.export), source('Motion token source', sources.reads.motion)],
    activeThemes: both ? sources.activeCombination : null,
    output,
    filesSearched: site.filesSearched,
    filesWithoutStyles: site.filesWithoutStyles,
    checksNotRun: PARTS.filter((part) => checksNotRun.includes(part)),
    result: sorted.length > 0 ? 'fail' : 'pass',
  };
}
