// The version the site is built from: the commit, and whether the copy has
// uncommitted changes (007 research R8), read with Git in temporary
// repositories.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { makeProject } from '../../../../tools/traceability/test/helpers/project.ts';
import { readVersion } from '../../scripts/requirements/version.ts';
import { commitAll, git } from '../helpers/copy.ts';

// A repository with two files and one commit, `dist/` ignored.
function repository(): string {
  const root = makeProject({ 'a.txt': 'a\n', 'b.txt': 'b\n', '.gitignore': 'dist/\n' });
  git(root, ['init', '--quiet', '--initial-branch=main']);
  commitAll(root);
  return root;
}

describe('007-requirement-inspector-FR-010: the build names its commit and says when the copy has uncommitted changes', () => {
  test("a clean tree gives HEAD's commit and dirty false", () => {
    const root = repository();
    expect(readVersion(root)).toEqual({ commit: git(root, ['rev-parse', 'HEAD']).trim(), dirty: false });
    expect(readVersion(root).commit).toMatch(/^[0-9a-f]{40}$/);
  });

  test('a changed, a staged, a deleted and an untracked file each make it dirty', () => {
    const changed = repository();
    fs.writeFileSync(path.join(changed, 'a.txt'), 'changed\n');
    expect(readVersion(changed).dirty).toBe(true);

    const staged = repository();
    fs.writeFileSync(path.join(staged, 'c.txt'), 'c\n');
    git(staged, ['add', 'c.txt']);
    expect(readVersion(staged).dirty).toBe(true);

    const deleted = repository();
    fs.rmSync(path.join(deleted, 'b.txt'));
    expect(readVersion(deleted).dirty).toBe(true);

    const untracked = repository();
    fs.writeFileSync(path.join(untracked, 'new.txt'), 'new\n');
    expect(readVersion(untracked).dirty).toBe(true);
  });

  test('a file .gitignore excludes leaves it clean', () => {
    const root = repository();
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'dist/site.html'), '<p>built</p>\n');
    expect(readVersion(root).dirty).toBe(false);
  });

  test("a folder that isn't a repository, and a repository with no commit, can't be built", () => {
    const plain = makeProject({ 'a.txt': 'a\n' });
    expect(() => readVersion(plain)).toThrow(/^can't tell which commit the site is built from \(.+\)$/);
    const empty = makeProject({ 'a.txt': 'a\n' });
    git(empty, ['init', '--quiet']);
    expect(() => readVersion(empty)).toThrow(/^can't tell which commit the site is built from \(.+\)$/);
  });
});
