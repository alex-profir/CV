// The spec list `specs` shows (006 research R10, contracts/site.md The spec
// list): read when the site is built, with 001's own spec reader, so it
// can't drift from the repository or from the traceability check.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { readSpecList } from '../scripts/spec-list.ts';
import { runCheck } from '../../../tools/traceability/src/check.ts';
import { REPO_ROOT, buildCopy, repoCopy } from './helpers/copy.ts';

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) fs.rmSync(root, { recursive: true, force: true });
});

function spec(name: string, status: 'Approved' | 'Draft', requirements: string[]): string {
  return [`# Feature Specification: ${name}`, '', `**Status**: ${status}`, '', '## Requirements *(mandatory)*', '', '### Functional Requirements', '', ...requirements, ''].join('\n');
}

// A repository of four spec folders: approved, draft, approved with a
// removed requirement, and one without a spec.md.
function fixtureRepository(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-list-'));
  roots.push(root);
  const write = (folder: string, text: string) => {
    fs.mkdirSync(path.join(root, 'specs', folder), { recursive: true });
    fs.writeFileSync(path.join(root, 'specs', folder, 'spec.md'), text);
  };
  write('010-gamma', spec('Gamma Thing', 'Approved', ['- **FR-001**: It MUST be.', '- ~~**FR-002**~~: Removed 2026-10-01 - not needed.', '- **FR-003**: It MUST stay.']));
  write('002-beta', spec('Beta Thing', 'Draft', ['- **FR-001**: It MAY be.']));
  write('001-alpha', spec('Alpha Thing', 'Approved', ['- **FR-001**: It MUST be.', '- **FR-002**: It MUST be too.']));
  fs.mkdirSync(path.join(root, 'specs', '003-no-spec'), { recursive: true });
  fs.writeFileSync(path.join(root, 'specs', '003-no-spec', 'notes.md'), '# Notes\n');
  return root;
}

const approved = (list: ReturnType<typeof readSpecList>) => list.filter((entry) => entry.status === 'Approved');
const activeIn = (list: ReturnType<typeof readSpecList>) => approved(list).reduce((sum, entry) => sum + entry.requirements, 0);

describe('006-terminal-FR-013: the spec list is read from the repository when the site is built', () => {
  test('on a fixture repository: numbered order, names, statuses and active counts, as 001 reads them', () => {
    const root = fixtureRepository();
    const list = readSpecList(root);
    expect(list).toEqual([
      { number: '001', folder: '001-alpha', name: 'Alpha Thing', status: 'Approved', requirements: 2 },
      { number: '002', folder: '002-beta', name: 'Beta Thing', status: 'Draft', requirements: 1 },
      { number: '010', folder: '010-gamma', name: 'Gamma Thing', status: 'Approved', requirements: 2 },
    ]);
    const report = runCheck(root);
    expect(approved(list)).toHaveLength(report.approvedSpecs);
    expect(activeIn(list)).toBe(report.activeRequirements);
  });

  test("on the real repository: every spec folder, and the counts npm run traceability gives", () => {
    const list = readSpecList(REPO_ROOT);
    const folders = fs
      .readdirSync(path.join(REPO_ROOT, 'specs'))
      .filter((folder) => /^\d+-/.test(folder) && fs.existsSync(path.join(REPO_ROOT, 'specs', folder, 'spec.md')))
      .sort();
    expect(list.map((entry) => entry.folder)).toEqual(folders);
    const report = runCheck(REPO_ROOT);
    expect(approved(list)).toHaveLength(report.approvedSpecs);
    expect(activeIn(list)).toBe(report.activeRequirements);
    expect(list.find((entry) => entry.folder === '006-terminal')).toMatchObject({ number: '006', name: 'The Terminal' });
  });

  test('an empty specs folder fails the build with site build failed: the spec list is empty', () => {
    const root = repoCopy();
    roots.push(root);
    for (const folder of fs.readdirSync(path.join(root, 'specs'))) fs.rmSync(path.join(root, 'specs', folder), { recursive: true, force: true });
    const build = buildCopy(root);
    expect(build.status).toBe(2);
    expect(build.stderr).toBe('site build failed: the spec list is empty\n');
  }, 300_000);
});
