import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { RESUME_FILE } from '../src/paths.ts';
import { REPO_ROOT, makeProject } from './helpers/cli.ts';

describe('the repository passes its own content check (SC-008)', () => {
  test('no problems, all three documents checked, name and email searched for', () => {
    const report = runCheck(REPO_ROOT);
    expect(report.problems).toEqual([]);
    expect(report.result).toBe('pass');
    expect(report.documents.map((document) => document.state)).toEqual(['checked', 'checked', 'checked']);
    expect(report.factKinds).toEqual(['name', 'email']);
  });
});

describe('a CV fact changes in one place (SC-003)', () => {
  test('changing the email in the CV only still passes', () => {
    const root = makeProject({});
    fs.cpSync(path.join(REPO_ROOT, 'packages/content'), path.join(root, 'packages/content'), { recursive: true });
    const file = path.join(root, RESUME_FILE);
    const resume = JSON.parse(fs.readFileSync(file, 'utf8'));
    resume.basics.email = 'someone.else@cv.test';
    fs.writeFileSync(file, `${JSON.stringify(resume, null, 2)}\n`);

    const report = runCheck(root);
    expect(report.problems).toEqual([]);
    expect(report.result).toBe('pass');
  });
});
