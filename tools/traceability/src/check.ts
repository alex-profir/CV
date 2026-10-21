import fs from 'node:fs';
import path from 'node:path';
import { listFiles } from './files.ts';
import { referenceProblem } from './ids.ts';
import type { SpecTargets, Token } from './ids.ts';
import { buildReport } from './report.ts';
import type { Problem, Report } from './report.ts';
import { parseSpec, requirementsOf, specProblems } from './specs.ts';
import type { Requirement } from './specs.ts';
import { coverageOf, readTestFile } from './test-files.ts';
import { readUiFile } from './ui-files.ts';

// Reads a file as UTF-8. A read error is reported by its code only, because
// error messages contain absolute paths.
function readText(root: string, file: string, problems: Problem[]): string | null {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    problems.push({
      type: 'unreadable-file',
      subject: `"${file}"`,
      location: { file, line: 1, column: 1 },
      detail: `cannot be read: ${(error as NodeJS.ErrnoException).code ?? 'unknown error'}`,
    });
    return null;
  }
}

function uncoveredDetail(skipped: boolean, unrecognized: boolean): string {
  if (skipped && unrecognized) {
    return "only skipped, disabled or placeholder tests, or tests inside calls the check doesn't recognize, reference this requirement";
  }
  if (skipped) return 'only skipped, disabled or placeholder tests reference this requirement';
  if (unrecognized) return "only tests inside calls the check doesn't recognize reference this requirement";
  return 'no test references this requirement';
}

// One run of the check over the files under `root`.
export function runCheck(root: string): Report {
  const files = listFiles(root);
  const problems: Problem[] = [];

  let approvedSpecs = 0;
  const active = new Map<string, Requirement>();
  const targets: SpecTargets = new Map();
  for (const { feature, file } of files.specs) {
    const text = readText(root, file, problems);
    const ids = new Map<string, 'active' | 'removed'>();
    targets.set(feature, { readable: text !== null, ids });
    if (text === null) continue;
    const spec = parseSpec(feature, file, text);
    problems.push(...specProblems(spec));
    for (const requirement of requirementsOf(spec)) {
      ids.set(requirement.id, requirement.state);
      if (spec.status === 'Approved' && requirement.state === 'active') active.set(requirement.fullId, requirement);
    }
    if (spec.status === 'Approved') approvedSpecs += 1;
  }

  const checkReferences = (tokens: Token[]) => {
    for (const token of tokens) {
      const problem = referenceProblem(token.text, token.location, targets);
      if (problem !== null) problems.push(problem);
    }
  };

  const covered = new Set<string>();
  const skipped = new Set<string>();
  const unrecognized = new Set<string>();
  const note = (tokens: Token[], into: Set<string>) => {
    for (const token of tokens) {
      if (active.has(token.text)) into.add(token.text);
    }
  };
  for (const file of files.testFiles) {
    const text = readText(root, file, problems);
    if (text === null) continue;
    const { nodes, problem } = readTestFile(file, text);
    if (problem !== null) problems.push(problem);
    // Every node's own references are checked once, whether or not it counts.
    for (const node of nodes) checkReferences(node.tokens);
    const coverage = coverageOf(nodes);
    note(coverage.counting, covered);
    note(coverage.skipped, skipped);
    note(coverage.unrecognized, unrecognized);
  }

  for (const file of files.uiFiles) {
    const text = readText(root, file, problems);
    if (text === null) continue;
    const { references, problem } = readUiFile(file, text);
    if (problem !== null) problems.push(problem);
    checkReferences(references);
  }

  for (const [id, requirement] of active) {
    if (covered.has(id)) continue;
    problems.push({
      type: 'uncovered',
      subject: id,
      location: requirement.definitions.find((entry) => !entry.removed)!.location,
      detail: uncoveredDetail(skipped.has(id), unrecognized.has(id)),
    });
  }

  return buildReport({ problems, approvedSpecs, activeRequirements: active.size, coveredRequirements: covered.size });
}
