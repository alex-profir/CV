import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import config from '../../../vitest.config.ts';
import {
  EXCLUDED_DIR_NAMES,
  TEST_EXCLUDE_GLOBS,
  TEST_FILE_PATTERN,
  TEST_INCLUDE_GLOBS,
  listFiles,
} from '../src/files.ts';
import { makeProject } from './helpers/project.ts';

describe('001-requirement-traceability-FR-014: only the project own files are examined', () => {
  test('skips third-party, generated, sample and dot-directories at any depth', () => {
    const root = makeProject({
      'a.test.ts': '',
      'node_modules/pkg/a.test.ts': '',
      'dist/a.test.ts': '',
      'build/a.test.ts': '',
      'out/a.test.ts': '',
      'coverage/a.test.ts': '',
      '__fixtures__/a.test.ts': '',
      '.cache/a.test.ts': '',
      'src/deep/node_modules/a.test.ts': '',
      'src/deep/__fixtures__/seeded/specs/002-example/spec.md': '**Status**: Approved\n',
      'src/deep/.hidden/a.test.ts': '',
      'src/deep/a.test.ts': '',
      'specs/002-example/spec.md': '',
      'specs/.draft/spec.md': '',
      'specs/node_modules/spec.md': '',
    });
    expect(listFiles(root)).toMatchObject({
      specs: [{ feature: '002-example', file: 'specs/002-example/spec.md' }],
      testFiles: ['a.test.ts', 'src/deep/a.test.ts'],
    });
  });

  test('a root whose own name starts with a dot is still listed', () => {
    const root = path.join(makeProject({ '.root/a.test.ts': '' }), '.root');
    expect(listFiles(root).testFiles).toEqual(['a.test.ts']);
  });

  test('does not follow symbolic links', () => {
    const root = makeProject({
      'real/a.test.ts': '',
      'specs/002-example/spec.md': '',
    });
    fs.symlinkSync(path.join(root, 'real'), path.join(root, 'linked'));
    fs.symlinkSync(path.join(root, 'real/a.test.ts'), path.join(root, 'b.test.ts'));
    fs.symlinkSync(path.join(root, 'specs/002-example'), path.join(root, 'specs/003-linked'));
    expect(listFiles(root)).toMatchObject({
      specs: [{ feature: '002-example', file: 'specs/002-example/spec.md' }],
      testFiles: ['real/a.test.ts'],
    });
  });

  test('selects test files by name', () => {
    for (const name of ['a.test.ts', 'a.spec.tsx', 'a.test.mjs', 'a.test.cjs', 'a.spec.jsx', 'a.test.js', 'a.spec.mts']) {
      expect(TEST_FILE_PATTERN.test(name)).toBe(true);
    }
    for (const name of ['a.tests.ts', 'a.test.md', 'test.ts', 'a.test.ts.bak', 'a.test.d']) {
      expect(TEST_FILE_PATTERN.test(name)).toBe(false);
    }
    const root = makeProject({ 'a.spec.tsx': '', 'a.tests.ts': '', 'a.test.md': '', 'test.ts': '' });
    expect(listFiles(root).testFiles).toEqual(['a.spec.tsx']);
  });

  test('paths are relative, use forward slashes and are sorted by code unit', () => {
    const root = makeProject({
      'src/nested/c.test.ts': '',
      'src/a.test.ts': '',
      'src/B.test.ts': '',
      'src/a/b.test.ts': '',
    });
    expect(listFiles(root).testFiles).toEqual(['src/B.test.ts', 'src/a.test.ts', 'src/a/b.test.ts', 'src/nested/c.test.ts']);
  });

  test('a project with no specs folder has no specs', () => {
    expect(listFiles(makeProject({ 'a.test.ts': '' })).specs).toEqual([]);
  });

  test('the test runner selects files from the same constants', () => {
    expect(config.test?.include).toEqual(TEST_INCLUDE_GLOBS);
    expect(config.test?.exclude).toEqual(TEST_EXCLUDE_GLOBS);
    expect(TEST_EXCLUDE_GLOBS).toEqual([...EXCLUDED_DIR_NAMES.map((name) => `**/${name}/**`), '**/.*/**']);
    expect(EXCLUDED_DIR_NAMES).toEqual(['node_modules', 'dist', 'build', 'out', 'coverage', '__fixtures__']);
  });
});
