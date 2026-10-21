import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { listFiles } from '../src/files.ts';
import { parseSpec, requirementsOf } from '../src/specs.ts';
import { REPO_ROOT } from './helpers/project.ts';

describe('001-requirement-traceability-FR-028: the check applies to this repository and its own spec', () => {
  test('the repository passes its own check, with this spec among the approved ones', () => {
    const approved = listFiles(REPO_ROOT)
      .specs.map(({ feature, file }) => parseSpec(feature, file, fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')))
      .filter((spec) => spec.status === 'Approved');
    expect(approved.map((spec) => spec.feature)).toContain('001-requirement-traceability');

    const report = runCheck(REPO_ROOT);
    expect(report.problems).toEqual([]);
    expect(report.result).toBe('pass');
    expect(report.approvedSpecs).toBe(approved.length);
    expect(report.activeRequirements).toBe(
      approved.flatMap((spec) => requirementsOf(spec)).filter((requirement) => requirement.state === 'active').length,
    );
  });
});
