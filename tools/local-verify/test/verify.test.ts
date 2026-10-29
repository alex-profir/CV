// The local full run on sample repositories, with fake `npm` checks
// (research R20). No real check, test or build runs here.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT, makeProject } from '../../traceability/test/helpers/project.ts';
import { checks, commandLine } from '../src/checks.ts';
import type { LocalRunResult } from '../src/result.ts';
import { verify } from '../src/verify.ts';
import type { Prerequisites } from '../src/verify.ts';
import { fakeBin, makeRepo } from './helpers/repo.ts';
import type { FakeOptions, Repo } from './helpers/repo.ts';

const MAIN = path.join(REPO_ROOT, 'tools/local-verify/src/main.js');

const LOCK = {
  name: 'sample',
  lockfileVersion: 3,
  packages: {
    '': { name: 'sample' },
    'node_modules/left-pad': { version: '1.3.0' },
    'node_modules/@scope/other-platform': { version: '2.0.0', optional: true },
  },
};
const INSTALLED = { name: 'sample', lockfileVersion: 3, packages: { 'node_modules/left-pad': { version: '1.3.0' } } };

const SAMPLE = {
  '.gitignore': 'node_modules/\ndist/\n',
  'package.json': '{ "name": "sample" }\n',
  'package-lock.json': JSON.stringify(LOCK),
  'node_modules/.package-lock.json': JSON.stringify(INSTALLED),
  'src/a.test.ts': '',
  'src/b.test.ts': '',
};

const CHROMIUM: Prerequisites = { hasChromium: () => true };

function sample(files: Record<string, string> = {}): Repo {
  return makeRepo({ ...SAMPLE, ...files });
}

async function run(repo: Repo | { root: string }, fake: ReturnType<typeof fakeBin>, prerequisites: Prerequisites = CHROMIUM) {
  let stdout = '';
  let stderr = '';
  const code = await verify({
    root: repo.root,
    env: fake.env,
    prerequisites,
    stdout: { write: (text: string) => (stdout += text) },
    stderr: { write: (text: string) => (stderr += text) },
  });
  return { code, stdout, stderr };
}

function fakes(repo: Repo, options: Omit<FakeOptions, 'env'> = {}) {
  return fakeBin({ ...options, env: repo.env });
}

const resultDir = (repo: Repo) => path.join(repo.root, '.git/local-verify');
const readResult = (repo: Repo, sha = repo.sha): LocalRunResult => JSON.parse(fs.readFileSync(path.join(resultDir(repo), `${sha}.json`), 'utf8'));
const porcelain = (repo: Repo) => repo.git(['status', '--porcelain=v1', '--untracked-files=all']);
const npmScripts = (fake: ReturnType<typeof fakeBin>) => fake.log().filter((entry) => entry.command === 'npm').map((entry) => (entry.args[0] === 'test' ? 'test' : entry.args.at(-1)));

describe('001-requirement-traceability-FR-032: the local full run starts only on a clean commit with its prerequisites', () => {
  const dirty: [string, (repo: Repo) => void, string][] = [
    ['a modified file', (repo) => fs.writeFileSync(path.join(repo.root, 'src/a.test.ts'), '// changed\n'), ' M src/a.test.ts'],
    ['a staged file', (repo) => (fs.writeFileSync(path.join(repo.root, 'staged.txt'), 'x\n'), repo.git(['add', 'staged.txt'])), 'A  staged.txt'],
    ['a deleted file', (repo) => fs.rmSync(path.join(repo.root, 'src/b.test.ts')), ' D src/b.test.ts'],
    ['an untracked file in a new directory', (repo) => (fs.mkdirSync(path.join(repo.root, 'new/deep'), { recursive: true }), fs.writeFileSync(path.join(repo.root, 'new/deep/file.txt'), 'x\n')), '?? new/deep/file.txt'],
  ];

  test.each(dirty)('refuses with %s, naming it, and runs nothing', async (_, change, line) => {
    const repo = sample();
    const fake = fakes(repo);
    change(repo);
    const { code, stdout, stderr } = await run(repo, fake);
    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toBe(`local full run refused: the working copy differs from commit ${repo.sha}:\n  ${line}\nCommit or remove these, then run it again.\n`);
    expect(fake.log()).toEqual([]);
    expect(fs.existsSync(resultDir(repo))).toBe(false);
  });

  test('names every changed path at once', async () => {
    const repo = sample();
    const fake = fakes(repo);
    fs.writeFileSync(path.join(repo.root, 'src/a.test.ts'), '// changed\n');
    fs.writeFileSync(path.join(repo.root, 'z.txt'), 'x\n');
    const { stderr } = await run(repo, fake);
    expect(stderr).toBe(`local full run refused: the working copy differs from commit ${repo.sha}:\n   M src/a.test.ts\n  ?? z.txt\nCommit or remove these, then run it again.\n`);
  });

  test('files ignored by .gitignore are not part of the commit and do not refuse', async () => {
    const repo = sample({ 'node_modules/x/index.js': '', 'dist/x.html': '' });
    const fake = fakes(repo);
    const { code, stderr } = await run(repo, fake);
    expect(stderr).toBe('');
    expect(code).toBe(0);
  });

  test('outside a git work tree it says so', async () => {
    const root = makeProject({ 'a.test.ts': '' });
    const repo = sample();
    const { code, stdout, stderr } = await run({ root }, fakes(repo));
    expect({ code, stdout, stderr }).toEqual({ code: 2, stdout: '', stderr: 'local full run: not a git work tree\n' });
  });

  test("a Node major other than .nvmrc's refuses", async () => {
    const repo = sample({ '.nvmrc': '24\n' });
    const fake = fakes(repo);
    const { code, stderr } = await run(repo, fake);
    expect(code).toBe(2);
    expect(stderr).toBe(`local full run needs Node 24 (see .nvmrc), but this is Node ${process.versions.node}: run nvm use\n`);
    expect(fake.log()).toEqual([]);
    expect(fs.existsSync(resultDir(repo))).toBe(false);
  });

  test('dependencies that are missing or differ from package-lock.json refuse', async () => {
    const message = 'local full run needs the locked dependencies installed: run npm ci\n';
    const missing = sample();
    fs.rmSync(path.join(missing.root, 'node_modules'), { recursive: true, force: true });
    const differing = sample({ 'node_modules/.package-lock.json': JSON.stringify({ packages: { 'node_modules/left-pad': { version: '1.2.0' } } }) });
    const notInstalled = sample({ 'node_modules/.package-lock.json': JSON.stringify({ packages: {} }) });
    for (const repo of [missing, differing, notInstalled]) {
      const fake = fakes(repo);
      expect(await run(repo, fake)).toEqual({ code: 2, stdout: '', stderr: message });
      expect(fake.log()).toEqual([]);
      expect(fs.existsSync(resultDir(repo))).toBe(false);
    }
  });

  test("Chromium missing refuses with the site check's message", async () => {
    const repo = sample();
    const fake = fakes(repo);
    expect(await run(repo, fake, { hasChromium: () => false })).toEqual({ code: 2, stdout: '', stderr: 'site check needs Chromium: run npx playwright install chromium\n' });
    expect(fake.log()).toEqual([]);
  });

  test('several missing prerequisites are listed together', async () => {
    const repo = sample({ '.nvmrc': '24\n', 'node_modules/.package-lock.json': '{}' });
    const fake = fakes(repo);
    const { code, stderr } = await run(repo, fake, { hasChromium: async () => false });
    expect(code).toBe(2);
    expect(stderr).toBe(
      [
        `local full run needs Node 24 (see .nvmrc), but this is Node ${process.versions.node}: run nvm use`,
        'local full run needs the locked dependencies installed: run npm ci',
        'site check needs Chromium: run npx playwright install chromium',
        '',
      ].join('\n'),
    );
    expect(fake.log()).toEqual([]);
  });

  test("the checks are the pull request's run commands, with the full set for the fast one, in the contract's order", () => {
    const runs = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8').split('\n').flatMap((line) => /^\s*(?:-\s+)?run:\s*(.+?)\s*$/.exec(line)?.[1] ?? []);
    const pullRequest = runs
      .filter((command) => command !== 'npm ci' && !command.startsWith('npx playwright install'))
      .map((command) => (command.includes('npm run --silent site-check') ? 'npm run --silent site-check' : command === 'npm run test:fast' ? 'npm test' : command));
    const local = checks('/results/sha.vitest.json');
    const comparable = local.map((check) => (check.name === 'test' ? 'npm test' : commandLine(check)));
    expect([...new Set(pullRequest)].sort()).toEqual([...comparable].sort());
    expect(local.map((check) => check.name)).toEqual(['typecheck', 'traceability', 'content', 'tokens', 'test', 'site']);
    expect(local.find((check) => check.name === 'test')).toEqual({ name: 'test', command: 'npm', args: ['test', '--', '--reporter=default', '--reporter=json', '--outputFile.json=/results/sha.vitest.json'] });
    expect(local.find((check) => check.name === 'site')).toEqual({ name: 'site', command: 'npm', args: ['run', '--silent', 'site-check'] });
    expect(JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8')).scripts.verify).toBe('node tools/local-verify/src/main.js verify');
  });

  test("each check's output follows its header, on the terminal and in the log", async () => {
    const repo = sample();
    const fake = fakes(repo);
    const { stdout } = await run(repo, fake);
    const log = fs.readFileSync(path.join(resultDir(repo), `${repo.sha}.log`), 'utf8');
    const vitest = path.join(resultDir(repo), `${repo.sha}.vitest.json`);
    for (const [name, args] of [
      ['typecheck', 'run typecheck'],
      ['traceability', 'run traceability'],
      ['content', 'run content-check'],
      ['tokens', 'run token-check'],
      ['test', `test -- --reporter=default --reporter=json --outputFile.json=${vitest}`],
      ['site', 'run --silent site-check'],
    ]) {
      const block = `== ${name}: npm ${args}\nfake npm ${args}\n`;
      expect(stdout).toContain(block);
      expect(log).toContain(block);
    }
  });
});

describe('001-requirement-traceability-FR-033: every check runs and the run ends naming each failure', () => {
  test('with every check passing it exits 0 and records a passing result', async () => {
    const repo = sample();
    const fake = fakes(repo);
    const { code, stdout } = await run(repo, fake);
    expect(code).toBe(0);
    const summary = stdout.slice(stdout.indexOf(`Local full run on ${repo.sha} (001-local-verify)\n`));
    const lines = summary.trimEnd().split('\n');
    expect(lines.slice(1, 7).map((line) => /^ {2}(\w+) +(pass|fail) +\d+ s/.exec(line)?.slice(1))).toEqual(['typecheck', 'traceability', 'content', 'tokens', 'test', 'site'].map((name) => [name, 'pass']));
    expect(lines[5]).toMatch(/^ {2}test +pass +\d+ s {3}4 tests in 2 files passed$/);
    expect(lines.at(-1)).toBe(`PASS: every check passed on ${repo.sha}. Sign off with: npm run signoff`);
    const result = readResult(repo);
    expect(result).toMatchObject({
      version: 1,
      sha: repo.sha,
      branch: '001-local-verify',
      clean: { atStart: true, atEnd: true, changed: [] },
      tests: { files: 2, expectedFiles: 2, passed: 4, failed: 0, skipped: 0 },
      siteCheck: 'pass',
      node: process.versions.node,
      os: `${os.type()} ${os.release()} ${process.arch}`,
      result: 'pass',
    });
    expect(result.checks.map((check) => [check.name, check.status, check.exitCode, check.detail])).toEqual(['typecheck', 'traceability', 'content', 'tokens', 'test', 'site'].map((name) => [name, 'pass', 0, null]));
    expect(Date.parse(result.finishedAt)).toBeGreaterThanOrEqual(Date.parse(result.startedAt));
  });

  test('failing checks do not stop the others, and each one is named', async () => {
    const repo = sample();
    const fake = fakes(repo, { npm: { traceability: { exitCode: 1 }, 'site-check': { exitCode: 1 } } });
    const { code, stdout } = await run(repo, fake);
    expect(code).toBe(1);
    expect(npmScripts(fake)).toEqual(['typecheck', 'traceability', 'content-check', 'token-check', 'test', 'site-check']);
    expect(stdout).toMatch(/\n {2}traceability +fail +\d+ s\n/);
    expect(stdout.trimEnd().split('\n').at(-1)).toBe(`FAIL: 2 checks failed on ${repo.sha}: traceability, site. Nothing can be signed off for this commit.`);
    expect(readResult(repo)).toMatchObject({ result: 'fail', siteCheck: 'fail' });
    expect(readResult(repo).checks.filter((check) => check.status === 'fail').map((check) => [check.name, check.exitCode])).toEqual([['traceability', 1], ['site', 1]]);
  });

  test('SC-010: the test check runs npm test with no project or file filter', async () => {
    const repo = sample();
    const fake = fakes(repo);
    await run(repo, fake);
    const testCall = fake.log().find((entry) => entry.command === 'npm' && entry.args[0] === 'test');
    expect(testCall?.args).toEqual(['test', '--', '--reporter=default', '--reporter=json', `--outputFile.json=${path.join(resultDir(repo), `${repo.sha}.vitest.json`)}`]);
    expect(testCall?.args.some((arg) => arg.startsWith('--project') || arg.endsWith('.test.ts'))).toBe(false);
  });

  test('SC-010: a report that ran fewer test files than the check lists fails the test check', async () => {
    const repo = sample();
    const fake = fakes(repo, { npm: { test: { report: { files: ['src/a.test.ts'] } } } });
    const { code, stdout } = await run(repo, fake);
    expect(code).toBe(1);
    expect(stdout).toMatch(/\n {2}test +fail +\d+ s {3}ran 1 of 2 test files\n/);
    expect(readResult(repo).checks.find((check) => check.name === 'test')).toMatchObject({ status: 'fail', exitCode: 0, detail: 'ran 1 of 2 test files' });
    expect(readResult(repo).tests).toMatchObject({ files: 1, expectedFiles: 2 });
  });

  test('SC-010: a report that says the run failed fails the test check', async () => {
    const repo = sample();
    const fake = fakes(repo, { npm: { test: { report: { success: false } } } });
    const { code } = await run(repo, fake);
    expect(code).toBe(1);
    expect(readResult(repo).checks.find((check) => check.name === 'test')?.status).toBe('fail');
  });
});

describe('001-requirement-traceability-FR-037: the result stays outside the working copy', () => {
  test('the result, the log and the report are under the git common directory, and nothing is tracked or left', async () => {
    const repo = sample();
    const tracked = repo.git(['ls-files']);
    await run(repo, fakes(repo));
    for (const suffix of ['json', 'log', 'vitest.json']) expect(fs.existsSync(path.join(resultDir(repo), `${repo.sha}.${suffix}`))).toBe(true);
    expect(porcelain(repo)).toBe('');
    expect(repo.git(['ls-files'])).toBe(tracked);
  });

  test("a linked worktree's run is kept in the clone's common directory", async () => {
    const repo = sample();
    const worktree = path.join(makeProject({}), 'linked');
    repo.git(['worktree', 'add', '-q', '-b', 'linked', worktree]);
    fs.mkdirSync(path.join(worktree, 'node_modules'));
    fs.writeFileSync(path.join(worktree, 'node_modules/.package-lock.json'), JSON.stringify(INSTALLED));
    const { code } = await run({ root: worktree }, fakes(repo));
    expect(code).toBe(0);
    expect(readResult(repo)).toMatchObject({ sha: repo.sha, branch: 'linked', result: 'pass' });
    expect(fs.readdirSync(worktree).sort()).toEqual(['.git', '.gitignore', '.nvmrc', 'node_modules', 'package-lock.json', 'package.json', 'src']);
  });

  test('a check that leaves a file behind fails the run, naming it', async () => {
    const repo = sample();
    const fake = fakes(repo, { npm: { 'content-check': { leaveFile: 'left.txt' } } });
    const { code, stdout, stderr } = await run(repo, fake);
    expect(code).toBe(1);
    expect(stderr).toContain(`the checks left the working copy different from commit ${repo.sha}:\n  ?? left.txt\n`);
    expect(stdout.trimEnd().split('\n').at(-1)).toBe(`FAIL: the working copy changed during the run on ${repo.sha}. Nothing can be signed off for this commit.`);
    expect(readResult(repo)).toMatchObject({ result: 'fail', clean: { atStart: true, atEnd: false, changed: ['left.txt'] } });
  });

  test('a second run on the same commit replaces the result', async () => {
    const repo = sample();
    expect((await run(repo, fakes(repo, { npm: { 'site-check': { exitCode: 1 } } }))).code).toBe(1);
    expect(readResult(repo).result).toBe('fail');
    expect((await run(repo, fakes(repo))).code).toBe(0);
    expect(readResult(repo).result).toBe('pass');
    expect(fs.readFileSync(path.join(resultDir(repo), `${repo.sha}.log`), 'utf8').match(/^== typecheck:/gm)).toHaveLength(1);
  });
});

describe('001-requirement-traceability-FR-032: npm run verify through its entry point', () => {
  const main = (repo: Repo, args: string[]) => spawnSync(process.execPath, [MAIN, ...args], { cwd: repo.root, env: fakes(repo).env, encoding: 'utf8' });

  test('an argument after the subcommand is a usage error', () => {
    const result = main(sample(), ['verify', 'extra']);
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 2, stderr: 'usage: npm run verify | npm run signoff (takes no arguments)\n' });
  });

  test('a dirty tree refuses with exit 2 before any prerequisite is probed', () => {
    const repo = sample();
    fs.writeFileSync(path.join(repo.root, 'probe.txt'), 'probe\n');
    const result = main(repo, ['verify']);
    expect(result.status).toBe(2);
    expect(result.stderr).toBe(`local full run refused: the working copy differs from commit ${repo.sha}:\n  ?? probe.txt\nCommit or remove these, then run it again.\n`);
  });
});
