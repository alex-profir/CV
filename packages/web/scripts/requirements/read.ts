// The requirement data (007 research R6, data-model.md Requirement data):
// every requirement a view carries, with its spec's number, title and status,
// its line and text, and the tests that count for it, all read with 001's own
// modules, so the view and `npm run traceability` can't disagree.
import fs from 'node:fs';
import path from 'node:path';
import { listFiles } from '../../../../tools/traceability/src/files.ts';
import { parseFullId } from '../../../../tools/traceability/src/ids.ts';
import { compare } from '../../../../tools/traceability/src/report.ts';
import { parseSpec, requirementText, requirementsOf, specTitle } from '../../../../tools/traceability/src/specs.ts';
import type { Requirement } from '../../../../tools/traceability/src/specs.ts';
import { coveringTests, readTestFile } from '../../../../tools/traceability/src/test-files.ts';
import { readSpecList } from '../spec-list.ts';
import type { Carried } from './carried.ts';
import { parseInline } from './inline.ts';
import type { Inline } from './inline.ts';
import type { Version } from './version.ts';

export type SpecRecord = {
  feature: string;
  number: string;
  title: string;
  status: 'Approved' | 'Draft';
  file: string;
  // Active requirements in the spec.
  active: number;
};

export type TestReference = { name: string; file: string; line: number };

export type RequirementRecord = {
  fullId: string;
  feature: string;
  id: string;
  line: number;
  text: Inline[];
  tests: TestReference[];
};

export type RequirementData = {
  version: Version;
  specs: SpecRecord[];
  requirements: Record<string, RequirementRecord>;
  views: Record<string, string[]>;
};

type ReadSpec = { record: SpecRecord; text: string; active: Map<string, Requirement> };

function readText(root: string, file: string): string {
  try {
    return fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    throw new Error(`${file}: can't be read (${(error as NodeJS.ErrnoException).code ?? 'unknown error'})`, { cause: error });
  }
}

// Every spec with a valid Status, by feature, with its active requirements.
function readSpecs(root: string): Map<string, ReadSpec> {
  const specs = new Map<string, ReadSpec>();
  const byNumber = new Map<string, string>();
  for (const entry of readSpecList(root)) {
    const other = byNumber.get(entry.number);
    if (other !== undefined) throw new Error(`specs ${other} and ${entry.folder} share the number ${entry.number}`);
    byNumber.set(entry.number, entry.folder);
    if (entry.status === 'Invalid') continue;
    const file = `specs/${entry.folder}/spec.md`;
    const text = readText(root, file);
    const active = new Map(requirementsOf(parseSpec(entry.folder, file, text)).filter((requirement) => requirement.state === 'active').map((requirement) => [requirement.id, requirement]));
    const title = specTitle(text) ?? entry.folder;
    specs.set(entry.folder, { record: { feature: entry.folder, number: entry.number, title, status: entry.status, file, active: active.size }, text, active });
  }
  return specs;
}

// Each full ID's counting tests, over every test file 001 reads, in file
// then line order.
function readTests(root: string, wanted: ReadonlySet<string>): Map<string, TestReference[]> {
  const tests = new Map<string, TestReference[]>();
  for (const file of listFiles(root).testFiles) {
    const { nodes, problem } = readTestFile(file, readText(root, file));
    if (problem !== null) throw new Error(`${file}: ${problem.detail}`);
    for (const { node, tokens } of coveringTests(nodes)) {
      for (const fullId of new Set(tokens.map((token) => token.text))) {
        if (!wanted.has(fullId)) continue;
        const list = tests.get(fullId) ?? [];
        list.push({ name: node.title, file, line: node.location.line });
        tests.set(fullId, list);
      }
    }
  }
  for (const list of tests.values()) list.sort((a, b) => compare(a.file, b.file) || a.line - b.line);
  return tests;
}

export function readRequirementData(root: string, version: Version, carried: Carried): RequirementData {
  const specs = readSpecs(root);
  const lines = new Map([...specs].map(([feature, spec]) => [feature, new Map([...spec.active].map(([id, requirement]) => [id, requirement.definitions.find((entry) => !entry.removed)!.location.line]))]));

  // Each view's IDs, checked against the specs, sorted by spec then ID.
  const views: Record<string, string[]> = {};
  for (const [view, ids] of carried.views) {
    for (const fullId of ids) {
      const parsed = parseFullId(fullId);
      if (parsed === null || specs.get(parsed.feature)?.active.has(parsed.id) !== true) throw new Error(`the ${view} view lists ${fullId}, which no spec defines`);
    }
    views[view] = [...ids].sort(compare);
  }

  const listed = new Set(Object.values(views).flat());
  const tests = readTests(root, listed);
  const requirements: Record<string, RequirementRecord> = {};
  for (const fullId of [...listed].sort(compare)) {
    const { feature, id } = parseFullId(fullId)!;
    const spec = specs.get(feature)!;
    const entry = spec.active.get(id)!.definitions.find((definition) => !definition.removed)!;
    const text = parseInline(requirementText(spec.text, entry), { feature, specDir: `specs/${feature}`, lines });
    requirements[fullId] = { fullId, feature, id, line: entry.location.line, text, tests: tests.get(fullId) ?? [] };
  }

  const features = new Set(Object.values(requirements).map((record) => record.feature));
  const specRecords = [...specs.values()]
    .map((spec) => spec.record)
    .filter((record) => features.has(record.feature))
    .sort((a, b) => compare(a.number, b.number));
  return { version, specs: specRecords, requirements, views };
}
