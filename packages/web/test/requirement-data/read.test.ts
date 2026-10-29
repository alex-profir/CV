// The requirement data, read from specs, tests and source as 001 reads them
// (007 research R6), on a fixture repository and on the real one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';
import { runCheck } from '../../../../tools/traceability/src/check.ts';
import { readCarried } from '../../scripts/requirements/carried.ts';
import { readRequirementData } from '../../scripts/requirements/read.ts';
import type { RequirementData } from '../../scripts/requirements/read.ts';
import { readSpecList } from '../../scripts/spec-list.ts';
import { REPO_ROOT } from '../helpers/copy.ts';

const FIXTURE = path.join(import.meta.dirname, '__fixtures__/repo');
const VERSION = { commit: 'a'.repeat(40), dirty: false };

const read = (root: string): RequirementData => readRequirementData(root, VERSION, readCarried(root));

// A copy of the fixture repository, changed by `edit`.
function fixtureCopy(edit: (root: string) => void): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'requirement-data-')));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(FIXTURE, root, { recursive: true });
  edit(root);
  return root;
}

function replaceIn(root: string, file: string, from: string, to: string): void {
  const target = path.join(root, file);
  const text = fs.readFileSync(target, 'utf8');
  if (!text.includes(from)) throw new Error(`${file} doesn't hold ${from}`);
  fs.writeFileSync(target, text.replace(from, to));
}

describe('007-requirement-inspector-FR-008 007-requirement-inspector-FR-013: the data is read from the repository as the check reads it', () => {
  const data = read(FIXTURE);

  test('specs in number order, with their titles, statuses, files and active counts, as the spec list reads them', () => {
    expect(data.specs).toEqual([
      { feature: '002-alpha', number: '002', title: 'Alpha Things', status: 'Approved', file: 'specs/002-alpha/spec.md', active: 4 },
      { feature: '003-beta', number: '003', title: 'Beta Draft', status: 'Draft', file: 'specs/003-beta/spec.md', active: 2 },
    ]);
    const list = readSpecList(FIXTURE);
    expect(data.specs.map((spec) => [spec.number, spec.title, spec.status])).toEqual(list.map((entry) => [entry.number, entry.name, entry.status]));
  });

  test('views list each carried ID once, sorted, the shell first', () => {
    expect(data.views).toEqual({
      shell: ['002-alpha-FR-004'],
      main: ['002-alpha-FR-001', '002-alpha-FR-002', '002-alpha-FR-005', '003-beta-FR-001'],
    });
    expect(Object.keys(data.requirements)).toEqual(['002-alpha-FR-001', '002-alpha-FR-002', '002-alpha-FR-004', '002-alpha-FR-005', '003-beta-FR-001']);
  });

  test("each requirement's line and text, with its references parsed", () => {
    expect(data.requirements['002-alpha-FR-001']).toMatchObject({
      fullId: '002-alpha-FR-001',
      feature: '002-alpha',
      id: 'FR-001',
      line: 9,
      text: [{ kind: 'text', text: 'The first requirement, which runs on to a second line.' }],
    });
    expect(data.requirements['002-alpha-FR-005']!.text).toEqual([
      { kind: 'text', text: 'Uses ' },
      { kind: 'code', text: 'code' },
      { kind: 'text', text: ' and follows ' },
      { kind: 'ref', feature: '003-beta', id: 'FR-001', line: 9, text: '003 FR-001' },
      { kind: 'text', text: ' and ' },
      { kind: 'ref', feature: '003-beta', id: 'FR-001', line: 9, text: 'FR-001' },
      { kind: 'text', text: '.' },
    ]);
  });

  test("a requirement's tests are exactly its counting tests, by name, file and line, in file then line order", () => {
    expect(data.requirements['002-alpha-FR-001']!.tests).toEqual([
      { name: 'second in this file 002-alpha-FR-001', file: 'packages/web/test/alpha.test.ts', line: 3 },
      { name: 'first in this file covers 002-alpha-FR-001 for the ${shell}', file: 'packages/web/test/alpha.test.ts', line: 12 },
      { name: "another file covers 002-alpha-FR-001 in the ${'desktop'} shell", file: 'tools/extra/test/extra.test.ts', line: 3 },
    ]);
    expect(data.requirements['002-alpha-FR-004']!.tests).toEqual([{ name: 'inherits the group', file: 'packages/web/test/alpha.test.ts', line: 6 }]);
    // Skipped and placeholder tests don't count, and a draft with no test has none.
    expect(data.requirements['002-alpha-FR-002']!.tests).toEqual([]);
    expect(data.requirements['003-beta-FR-001']!.tests).toEqual([]);
  });

  test('a removed requirement and an uncarried one have no record', () => {
    expect(data.requirements['002-alpha-FR-003']).toBeUndefined();
    expect(data.requirements['003-beta-FR-002']).toBeUndefined();
  });

  test('one edit to a spec, a test or the source changes the data, with nothing else to do', () => {
    const text = read(fixtureCopy((root) => replaceIn(root, 'specs/002-alpha/spec.md', 'Covered by a group', 'Covered by a whole group')));
    expect(text.requirements['002-alpha-FR-004']!.text).toEqual([{ kind: 'text', text: "Covered by a whole group's title." }]);

    const added = read(fixtureCopy((root) => fs.writeFileSync(path.join(root, 'packages/web/test/beta.test.ts'), "test('covers 003-beta-FR-001', () => {});\n")));
    expect(added.requirements['003-beta-FR-001']!.tests).toEqual([{ name: 'covers 003-beta-FR-001', file: 'packages/web/test/beta.test.ts', line: 1 }]);

    const removed = read(fixtureCopy((root) => replaceIn(root, 'specs/003-beta/spec.md', '- **FR-002**:', '- ~~**FR-002**~~:')));
    expect(removed.specs.find((spec) => spec.feature === '003-beta')!.active).toBe(1);

    const carried = read(fixtureCopy((root) => replaceIn(root, 'packages/web/src/os/Shell.tsx', 'data-req="002-alpha-FR-004"', 'data-req="002-alpha-FR-004 003-beta-FR-002"')));
    expect(carried.views.shell).toEqual(['002-alpha-FR-004', '003-beta-FR-002']);
    expect(carried.requirements['003-beta-FR-002']!.text).toEqual([{ kind: 'text', text: 'Not carried by any view.' }]);
  });

  test('two specs with one number, and a view listing an ID no spec defines, fail the build', () => {
    const twice = fixtureCopy((root) => {
      fs.mkdirSync(path.join(root, 'specs/002-other'));
      fs.copyFileSync(path.join(root, 'specs/003-beta/spec.md'), path.join(root, 'specs/002-other/spec.md'));
    });
    expect(() => read(twice)).toThrow('specs 002-alpha and 002-other share the number 002');
    const unknown = fixtureCopy((root) => replaceIn(root, 'packages/web/src/os/Shell.tsx', 'data-req="002-alpha-FR-004"', 'data-req="002-alpha-FR-099"'));
    expect(() => read(unknown)).toThrow('the shell view lists 002-alpha-FR-099, which no spec defines');
    const gone = fixtureCopy((root) => replaceIn(root, 'packages/web/src/os/Shell.tsx', 'data-req="002-alpha-FR-004"', 'data-req="002-alpha-FR-003"'));
    expect(() => read(gone)).toThrow('the shell view lists 002-alpha-FR-003, which no spec defines');
  });
});

describe('007-requirement-inspector-FR-008 007-requirement-inspector-FR-013: on the real repository the data agrees with the traceability check', () => {
  test('a listed requirement of an approved spec has a test exactly when the check finds it covered', () => {
    const data = readRequirementData(REPO_ROOT, VERSION, readCarried(REPO_ROOT));
    const report = runCheck(REPO_ROOT);
    const uncovered = new Set(report.problems.filter((problem) => problem.type === 'uncovered').map((problem) => problem.subject));
    const approved = new Set(data.specs.filter((spec) => spec.status === 'Approved').map((spec) => spec.feature));
    const listed = Object.values(data.requirements).filter((record) => approved.has(record.feature));
    expect(listed.length).toBeGreaterThan(100);
    for (const record of listed) expect(record.tests.length > 0, record.fullId).toBe(!uncovered.has(record.fullId));
    const covered = listed.filter((record) => record.tests.length > 0).length;
    expect(covered).toBe(listed.filter((record) => !uncovered.has(record.fullId)).length);
    expect(covered).toBeLessThanOrEqual(report.coveredRequirements);
  });
});
