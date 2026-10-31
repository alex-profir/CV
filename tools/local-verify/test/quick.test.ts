// The quick run and picking up after a failure, on sample repositories with
// fake `npm` checks (research R20). No real check, test or build runs here.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from '../../traceability/test/helpers/project.ts';
import { listFiles } from '../../traceability/src/files.ts';
import { AREAS, affectedTests, withoutSiteCheckTests } from '../src/affected.ts';
import { quick } from '../src/quick.ts';
import { readPassingResult } from '../src/result.ts';
import { verify } from '../src/verify.ts';
import { fakeBin, makeRepo } from './helpers/repo.ts';
import type { FakeOptions, Repo } from './helpers/repo.ts';

const LOCK = JSON.stringify({ packages: {} });
const SAMPLE = {
  'package.json': '{ "name": "sample" }\n',
  'package-lock.json': LOCK,
  'node_modules/.package-lock.json': LOCK,
  'tools/token-check/src/a.ts': '',
  'tools/token-check/test/a.test.ts': '',
  'tools/content-check/test/b.test.ts': '',
  'tools/site-check/test/slow.test.ts': '',
};

type Fake = ReturnType<typeof fakeBin>;
const sample = (): Repo => {
  const repo = makeRepo(SAMPLE);
  repo.git(['branch', 'main']);
  return repo;
};
const fakes = (repo: Repo, options: Omit<FakeOptions, 'env'> = {}) => fakeBin({ ...options, env: repo.env });
const tested = (fake: Fake) => fake.log().find((entry) => entry.args[0] === 'test')?.args.filter((arg) => arg.endsWith('.test.ts'));
const silent = { write: () => true };

async function runQuick(repo: Repo, fake: Fake, failed = false) {
  let stdout = '';
  let stderr = '';
  const code = await quick({ root: repo.root, env: fake.env, failed, stdout: { write: (text: string) => (stdout += text) }, stderr: { write: (text: string) => (stderr += text) } });
  return { code, stdout, stderr };
}

const runFeature = (repo: Repo, fake: Fake, failed = false) => verify({ root: repo.root, env: fake.env, failed, prerequisites: { hasChromium: () => true }, stdout: silent, stderr: silent });

const change = (repo: Repo, file: string) => fs.writeFileSync(path.join(repo.root, file), '// changed\n');
const commit = (repo: Repo) => {
  repo.git(['add', '-A']);
  repo.git(['commit', '-q', '-m', 'change']);
  return repo.git(['rev-parse', 'HEAD']);
};

describe('001-requirement-traceability-FR-038: the quick run takes the tests a change touches', { timeout: 30_000 }, () => {
  const TESTS = ['packages/web/test/a.test.ts', 'packages/web/test/terminal/b.test.ts', 'packages/web/test/shell/c.test.ts', 'tools/site-check/test/d.test.ts', 'tools/token-check/test/e.test.ts'];

  test.each([
    ['a terminal file', ['packages/web/src/apps/terminal/x.ts'], ['packages/web/test/terminal/b.test.ts']],
    ['a page file', ['packages/web/src/cv/x.tsx'], ['packages/web/test/a.test.ts']],
    ['a document', ['docs/x.md', 'README.md', '.specify/memory/constitution.md'], []],
    ['the site check', ['tools/site-check/src/x.ts'], ['tools/site-check/test/d.test.ts']],
    ['a shared web file', ['packages/web/src/routes.ts'], ['packages/web/test/a.test.ts', 'packages/web/test/terminal/b.test.ts', 'packages/web/test/shell/c.test.ts']],
    ['a file no rule names', ['package.json'], TESTS.filter((file) => !file.includes('site-check'))],
    ['a test file, whatever its area', ['tools/site-check/test/d.test.ts'], ['tools/site-check/test/d.test.ts']],
  ])('%s', (_, changed, expected) => {
    expect(affectedTests(changed, TESTS)).toEqual(expected);
  });

  test('every test glob of the rules still finds a test file in this repository', () => {
    const files = listFiles(REPO_ROOT).testFiles;
    const orphans = AREAS.flatMap((area) => area.tests).filter((glob) => !files.some((file) => path.posix.matchesGlob(file, glob)));
    expect(orphans).toEqual([]);
  });

  test('a feature run leaves out only the site check tests', () => {
    expect(withoutSiteCheckTests(TESTS)).toEqual(TESTS.filter((file) => !file.startsWith('tools/site-check/')));
  });

  test('it runs on a changed working copy, with the quick checks first, and only the touched tests', async () => {
    const repo = sample();
    const fake = fakes(repo, { npm: { test: { report: { files: ['tools/token-check/test/a.test.ts'] } } } });
    change(repo, 'tools/token-check/src/a.ts');
    const { code, stdout } = await runQuick(repo, fake);
    expect(code).toBe(0);
    expect(fake.log().map((entry) => (entry.args[0] === 'test' ? 'test' : entry.args.at(-1)))).toEqual(['typecheck', 'traceability', 'content-check', 'token-check', 'test']);
    expect(tested(fake)).toEqual(['tools/token-check/test/a.test.ts']);
    expect(stdout).toContain('PASS: the quick checks and 1 test file passed.');
    expect(repo.git(['status', '--porcelain=v1'])).toBe('M tools/token-check/src/a.ts');
  });

  test('a change that touches no test runs only the quick checks', async () => {
    const repo = sample();
    const fake = fakes(repo);
    change(repo, 'notes.md');
    const { code, stdout } = await runQuick(repo, fake);
    expect(code).toBe(0);
    expect(tested(fake)).toBeUndefined();
    expect(stdout).toContain('no test covers these changes');
  });

  test('it leaves nothing that can be signed off', async () => {
    const repo = sample();
    await runQuick(repo, fakes(repo));
    expect(readPassingResult(path.join(repo.root, '.git/local-verify'), repo.sha)).toEqual({ reason: 'none' });
  });
});

describe('001-requirement-traceability-FR-039: --failed takes only what the last run left', { timeout: 30_000 }, () => {
  const A = 'tools/token-check/test/a.test.ts';
  const B = 'tools/content-check/test/b.test.ts';

  test('a quick rerun takes the failed file and not the one that passed', async () => {
    const repo = sample();
    change(repo, 'package.json');
    const failing = fakes(repo, { npm: { test: { report: { files: [A, B], failedFiles: [A], success: false }, exitCode: 1 } } });
    const first = await runQuick(repo, failing);
    expect(first.code).toBe(1);
    expect(first.stdout).toContain('npm run verify -- --failed');
    const fixed = fakes(repo, { npm: { test: { report: { files: [A] } } } });
    expect((await runQuick(repo, fixed, true)).code).toBe(0);
    expect(tested(fixed)).toEqual([A]);
  });

  test('a file a stopped run never reached is taken too', async () => {
    const repo = sample();
    change(repo, 'package.json');
    await runQuick(repo, fakes(repo, { npm: { test: { report: { files: [A], failedFiles: [A], success: false }, exitCode: 1 } } }));
    const next = fakes(repo, { npm: { test: { report: { files: [A, B] } } } });
    await runQuick(repo, next, true);
    expect(tested(next)).toEqual([B, A].sort());
  });

  test('with no earlier run it says what to run', async () => {
    const repo = sample();
    const { code, stderr } = await runQuick(repo, fakes(repo), true);
    expect(code).toBe(2);
    expect(stderr).toBe('quick run: no earlier run on 001-local-verify: run npm run verify\n');
  });

  test('a feature run fixed on a later commit can be signed off without running what passed', async () => {
    const repo = sample();
    expect(await runFeature(repo, fakes(repo, { npm: { test: { report: { files: [A, B], failedFiles: [A], success: false }, exitCode: 1 } } }))).toBe(1);
    change(repo, 'tools/token-check/src/a.ts');
    const sha = commit(repo);
    const fixed = fakes(repo, { npm: { test: { report: { files: [A] } } } });
    expect(await runFeature(repo, fixed, true)).toBe(0);
    expect(tested(fixed)).toEqual([A]);
    const found = readPassingResult(path.join(repo.root, '.git/local-verify'), sha);
    expect(found).toMatchObject({ result: { sha, result: 'pass', tests: { files: 2, expectedFiles: 2, passed: 4 } } });
  });

  test('a test file changed since the last run is taken again, even if it passed', async () => {
    const repo = sample();
    await runFeature(repo, fakes(repo, { npm: { test: { report: { files: [A, B], failedFiles: [A], success: false }, exitCode: 1 } } }));
    change(repo, B);
    commit(repo);
    const fixed = fakes(repo, { npm: { test: { report: { files: [A, B] } } } });
    expect(await runFeature(repo, fixed, true)).toBe(0);
    expect(tested(fixed)?.sort()).toEqual([A, B].sort());
  });

  test('when nothing is left, it runs the quick checks and the engines check, and passes', async () => {
    const repo = sample();
    expect(await runFeature(repo, fakes(repo, { npm: { test: { report: { files: [A, B] } } } }))).toBe(0);
    const next = fakes(repo);
    expect(await runFeature(repo, next, true)).toBe(0);
    expect(tested(next)).toBeUndefined();
    expect(next.log().some((entry) => entry.args.join(' ') === 'run test:engines')).toBe(true);
  });
});
