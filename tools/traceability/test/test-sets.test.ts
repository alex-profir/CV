// The fast set and the full set (research R14, the machine check). Vitest's
// own listing is compared with the check's file selection, and every fast
// file's runtime imports are followed to show it needs no browser or site
// build.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import config from '../../../vitest.config.ts';
import { FAST_TEST_GLOBS, TEST_EXCLUDE_GLOBS, TEST_INCLUDE_GLOBS, listFiles } from '../src/files.ts';
import { forbiddenReach } from './helpers/imports.ts';
import type { ReachRules } from './helpers/imports.ts';
import { REPO_ROOT, makeProject } from './helpers/project.ts';

const RULES: ReachRules = {
  packages: ['playwright', 'playwright-core', 'lighthouse', 'chrome-launcher', 'vite'],
  files: ['tools/site-check/src/browser.ts', 'packages/web/scripts/build-site.ts', 'packages/web/test/helpers/site.ts', 'packages/web/test/helpers/browser.ts', 'packages/web/test/helpers/copy.ts'],
  spawnNames: ['build-site', 'site-check/src/main.js'],
  npmScripts: ['build', 'site-check'],
};

type Listed = { file: string; projectName?: string };

// Vitest's listing of every test file with its project, from the repository
// root, with the parent run's VITEST* variables removed so the child is a
// run of its own.
function vitestList(): { file: string; project: string | undefined }[] {
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('VITEST')));
  const result = spawnSync(process.execPath, [path.join(REPO_ROOT, 'node_modules/vitest/vitest.mjs'), 'list', '--filesOnly', '--json'], { cwd: REPO_ROOT, env, encoding: 'utf8' });
  expect(result.status, result.stderr).toBe(0);
  const listed: Listed[] = JSON.parse(result.stdout);
  return listed.map((entry) => ({ file: path.relative(REPO_ROOT, entry.file).split(path.sep).join('/'), project: entry.projectName }));
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

describe('001-requirement-traceability-FR-030: the full set is every test, and the fast set needs no browser or site build', () => {
  let listing: { file: string; project: string | undefined }[] | undefined;
  const list = () => (listing ??= vitestList());

  test('every test file is in the full set exactly once, in the fast or the slow project', () => {
    const files = list().map((entry) => entry.file);
    expect(new Set(files).size).toBe(files.length);
    expect([...files].sort(compare)).toEqual(listFiles(REPO_ROOT).testFiles);
    expect(list().filter((entry) => entry.project !== 'fast' && entry.project !== 'slow')).toEqual([]);
    expect(list().some((entry) => entry.project === 'fast')).toBe(true);
    expect(list().some((entry) => entry.project === 'slow')).toBe(true);
  }, 60_000);

  test('the check reads every test: its file selection never consults the fast set', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'tools/traceability/src/files.ts'), 'utf8');
    const uses = source.split('\n').filter((line) => line.includes('FAST_TEST_GLOBS'));
    expect(uses).toHaveLength(1);
    expect(uses[0]).toMatch(/^export const FAST_TEST_GLOBS\b/);
  });

  test('no fast file reaches a browser, Lighthouse, Vite, the site build or the page-test helpers', () => {
    const fast = list().filter((entry) => entry.project === 'fast').map((entry) => entry.file);
    expect(fast.length).toBeGreaterThan(0);
    const reached = fast.flatMap((file) => {
      const reach = forbiddenReach(REPO_ROOT, file, RULES);
      return reach === null ? [] : [{ file, ...reach }];
    });
    expect(reached).toEqual([]);
  }, 60_000);

  test('the config builds both projects from the constants, and only slow builds the site', () => {
    const projects = config.test?.projects as { extends?: boolean; test: { name: string; include?: string[]; exclude?: string[]; globalSetup?: string[] } }[];
    expect(projects.map((project) => project.test.name)).toEqual(['fast', 'slow']);
    expect(projects.every((project) => project.extends === true)).toBe(true);
    const [fast, slow] = projects;
    expect(fast!.test.include).toEqual(FAST_TEST_GLOBS);
    expect(fast!.test.exclude).toEqual(TEST_EXCLUDE_GLOBS);
    // Both take the test lock, which starts no browser and no build.
    expect(fast!.test.globalSetup).toEqual(['tools/speckit-auto/test-lock.ts']);
    expect(slow!.test.include).toEqual(TEST_INCLUDE_GLOBS);
    expect(slow!.test.exclude).toEqual([...TEST_EXCLUDE_GLOBS, ...FAST_TEST_GLOBS]);
    expect(slow!.test.globalSetup).toEqual(['tools/speckit-auto/test-lock.ts', 'packages/web/test/helpers/site.ts']);
    expect(config.test).not.toHaveProperty('include');
    expect(config.test).not.toHaveProperty('exclude');
    expect(config.test).not.toHaveProperty('globalSetup');
  });

  test('npm test runs the full set with no filter, and test:fast the fast project', () => {
    const scripts = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).scripts;
    expect(scripts.test).toBe('vitest run');
    expect(scripts['test:fast']).toBe('vitest run --project fast');
  });

  test('the fast directories are written out, one glob per directory, with the test file pattern', () => {
    expect(FAST_TEST_GLOBS).toEqual(
      ['tools/traceability/test', 'tools/content-check/test', 'tools/token-check/test', 'tools/local-verify/test', 'packages/content/test', 'packages/os-core/test', 'packages/tokens/test', 'packages/web/test/terminal/engine', 'packages/web/test/playground/unit'].map((dir) => `${dir}/**/*.{test,spec}.?(c|m)[jt]s?(x)`),
    );
  });
});

describe('001-requirement-traceability-FR-030: the import rule catches what it must', () => {
  const reach = (files: Record<string, string>, file = 'fast/a.test.ts') => forbiddenReach(makeProject(files), file, RULES);

  test('a direct import of a browser package', () => {
    expect(reach({ 'fast/a.test.ts': "import { chromium } from 'playwright';\n" })).toEqual({ target: 'playwright', chain: ['fast/a.test.ts', 'playwright'] });
    expect(reach({ 'fast/a.test.ts': "import x from 'playwright-core/lib/x.js';\n" })?.target).toBe('playwright-core');
  });

  test('a page-test helper reached through a relative helper, with the whole chain', () => {
    const files = {
      'fast/a.test.ts': "import { helper } from './helper.ts';\n",
      'fast/helper.ts': "export { builtSite as helper } from '../packages/web/test/helpers/site.ts';\n",
      'packages/web/test/helpers/site.ts': 'export const builtSite = 1;\n',
    };
    expect(reach(files)).toEqual({ target: 'packages/web/test/helpers/site.ts', chain: ['fast/a.test.ts', 'fast/helper.ts', 'packages/web/test/helpers/site.ts'] });
  });

  test('a workspace package is followed through its exports', () => {
    const files = {
      'fast/a.test.ts': "import '@cv/sample';\n",
      'packages/sample/package.json': JSON.stringify({ name: '@cv/sample', exports: { '.': './src/index.ts' } }),
      'packages/sample/src/index.ts': "import 'vite';\n",
    };
    expect(reach(files)).toEqual({ target: 'vite', chain: ['fast/a.test.ts', 'packages/sample/src/index.ts', 'vite'] });
  });

  test('type-only imports and exports are not followed', () => {
    const files = {
      'fast/a.test.ts': "import type { Browser } from 'playwright';\nexport type { Page } from 'playwright';\nimport { readFileSync } from 'node:fs';\nimport { describe } from 'vitest';\n",
    };
    expect(reach(files)).toBeNull();
  });

  test('a literal dynamic import is followed', () => {
    expect(reach({ 'fast/a.test.ts': "await import('lighthouse');\n" })?.target).toBe('lighthouse');
    expect(reach({ 'fast/a.test.ts': 'await import(`chrome-launcher`);\n' })?.target).toBe('chrome-launcher');
  });

  test('a process call that starts the site check or the build', () => {
    expect(reach({ 'fast/a.test.ts': "import { spawnSync } from 'node:child_process';\nspawnSync('npm', ['run', 'site-check']);\n" })).toEqual({
      target: 'spawnSync("site-check")',
      chain: ['fast/a.test.ts', 'spawnSync("site-check")'],
    });
    expect(reach({ 'fast/a.test.ts': "import * as child from 'child_process';\nchild.execSync('npm run --silent build');\n" })?.target).toBe('execSync("npm run --silent build")');
    expect(reach({ 'fast/a.test.ts': "import { execFileSync as run } from 'node:child_process';\nrun(process.execPath, ['packages/web/scripts/build-site.ts']);\n" })?.target).toBe('execFileSync("packages/web/scripts/build-site.ts")');
  });

  test('plain strings outside a process call never count', () => {
    const files = {
      'fast/a.test.ts': "import { spawnSync } from 'node:child_process';\nconst step = 'npm run --silent site-check';\nconst args = ['run', 'site-check'];\nspawnSync('npm', ['run', 'traceability']);\nspawnSync('npm', args);\nexport { step };\n",
    };
    expect(reach(files)).toBeNull();
  });

  test('a module of the closure that cannot be parsed or found is reported', () => {
    expect(reach({ 'fast/a.test.ts': "import './broken.ts';\n", 'fast/broken.ts': 'export const = ;\n' })).toEqual({ target: 'fast/broken.ts', chain: ['fast/a.test.ts', 'fast/broken.ts'] });
    expect(reach({ 'fast/a.test.ts': "import './gone.ts';\n" })).toEqual({ target: 'fast/gone.ts', chain: ['fast/a.test.ts', 'fast/gone.ts'] });
  });

  test('non-script files and Node built-ins are leaves', () => {
    expect(reach({ 'fast/a.test.ts': "import './style.css';\nimport data from './data.json' with { type: 'json' };\nimport fs from 'fs';\n", 'fast/style.css': 'a {}\n', 'fast/data.json': '{}' })).toBeNull();
  });
});
