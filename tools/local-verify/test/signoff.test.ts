// Signing off on sample repositories, with a local bare repository standing
// in for GitHub and a fake `gh` (research R20). Nothing reaches the network
// and no status is posted.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { REPO_ROOT } from '../../traceability/test/helpers/project.ts';
import type { Exec } from '../src/git.ts';
import { defaultExec, parseGitHubRepo } from '../src/git.ts';
import { describeSignOff, writeResult } from '../src/result.ts';
import type { LocalRunResult } from '../src/result.ts';
import { signoff } from '../src/signoff.ts';
import { verify } from '../src/verify.ts';
import { fakeBin, makeRepo, withOrigin } from './helpers/repo.ts';
import type { FakeOptions, Repo } from './helpers/repo.ts';

const MAIN = path.join(REPO_ROOT, 'tools/local-verify/src/main.js');

// Each group gets `{ timeout: 30_000 }`: its tests start real git and several
// fake commands, a few hundred milliseconds each and more when the machine is
// busy (the full set runs browsers beside them), so the 5 s default is too
// tight. The options are written inline, because the traceability check
// reads only an object literal there (FR-012).
const OS = `${os.type()} ${os.release()} ${process.arch}`;
const BRANCH = '001-local-verify';

const SAMPLE = {
  'package.json': '{ "name": "sample" }\n',
  'package-lock.json': JSON.stringify({ packages: { '': { name: 'sample' } } }),
  'node_modules/.package-lock.json': JSON.stringify({ packages: {} }),
  'src/a.test.ts': '',
};

const resultDir = (repo: Repo) => path.join(repo.root, '.git/local-verify');

// A result as verify writes it, passing unless changed.
function result(sha: string, changes: Partial<LocalRunResult> = {}): LocalRunResult {
  const names = ['typecheck', 'traceability', 'content', 'tokens', 'test'] as const;
  return {
    version: 1,
    sha,
    branch: BRANCH,
    startedAt: '2026-10-29T10:00:00.000Z',
    finishedAt: '2026-10-29T10:20:00.000Z',
    clean: { atStart: true, atEnd: true, changed: [] },
    checks: names.map((name) => ({ name, command: `npm run ${name}`, status: 'pass', exitCode: 0, durationMs: 1000, detail: null })),
    tests: { files: 152, expectedFiles: 152, passed: 3124, failed: 0, skipped: 0 },
    node: '26.1.0',
    os: 'Darwin 25.1.0 arm64',
    result: 'pass',
    ...changes,
  };
}

function passed(repo: Repo, sha = repo.git(['rev-parse', 'HEAD'])): LocalRunResult {
  const written = result(sha);
  writeResult(resultDir(repo), written);
  return written;
}

function fakes(repo: Repo, options: Omit<FakeOptions, 'env'> = {}) {
  return fakeBin({ ...options, env: repo.env });
}

async function run(repo: Repo, env: NodeJS.ProcessEnv, exec?: Exec) {
  let stdout = '';
  let stderr = '';
  const code = await signoff({ root: repo.root, env, exec, stdout: { write: (text: string) => (stdout += text) }, stderr: { write: (text: string) => (stderr += text) } });
  return { code, stdout, stderr };
}

const ghCalls = (fake: ReturnType<typeof fakeBin>) => fake.log().filter((entry) => entry.command === 'gh');

describe('001-requirement-traceability-FR-033: a sign-off is the passing local-verify status of the commit that passed', { timeout: 30_000 }, () => {
  test('after a passing run it posts exactly one success status, describing what ran', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    const fake = fakes(repo);
    const verified = await verify({ root: repo.root, env: fake.env, prerequisites: { hasChromium: () => true }, stdout: { write: () => true }, stderr: { write: () => true } });
    expect(verified).toBe(0);
    const description = `2 tests in 1 files passed; Node ${process.versions.node}; ${OS}`;
    const { code, stdout, stderr } = await run(repo, fake.env);
    expect({ code, stderr }).toEqual({ code: 0, stderr: '' });
    expect(stdout).toBe(`signed off ${repo.sha} on alex-profir/CV: local-verify success: ${description}\n`);
    expect(ghCalls(fake).map((entry) => entry.args)).toEqual([
      ['api', '--method', 'POST', `repos/alex-profir/CV/statuses/${repo.sha}`, '-f', 'state=success', '-f', 'context=local-verify', '-f', `description=${description}`],
    ]);
    expect(ghCalls(fake)[0]!.args.join(' ')).not.toContain('target_url');
  });

  test('the description fits GitHub limit of 140 characters, shortening only the OS part', () => {
    const short = describeSignOff(result('a'.repeat(40)));
    expect(short).toBe('3124 tests in 152 files passed; Node 26.1.0; Darwin 25.1.0 arm64');
    const longest = describeSignOff({ tests: { files: 999999, expectedFiles: 999999, passed: 999999, failed: 0, skipped: 0 }, node: '26.999.999', os: `Darwin ${'9'.repeat(93)}` });
    expect(longest.length).toBeLessThanOrEqual(140);
    expect(longest.startsWith('999999 tests in 999999 files passed; Node 26.999.999; Darwin 9')).toBe(true);
    expect(longest.endsWith('…')).toBe(true);
  });

  test('a failed run is refused, naming its failing checks, and nothing is posted', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    const fake = fakes(repo);
    const failing = result(repo.sha, { result: 'fail' });
    failing.checks = failing.checks.map((check) => (check.name === 'test' || check.name === 'tokens' ? { ...check, status: 'fail', exitCode: 1 } : check));
    writeResult(resultDir(repo), failing);
    expect(await run(repo, fake.env)).toEqual({ code: 1, stdout: '', stderr: `sign-off refused: the last local full run on ${repo.sha} failed (tokens, test)\n` });
    expect(ghCalls(fake)).toEqual([]);
  });
});

describe('001-requirement-traceability-FR-034: only the owner signs off, and only the exact commit that passed', { timeout: 30_000 }, () => {
  test.each(['CI', 'GITHUB_ACTIONS'])('with %s set it refuses before reading git or the result', async (variable) => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    passed(repo);
    const fake = fakes(repo);
    const calls: string[][] = [];
    const exec: Exec = (command, args, options) => {
      calls.push([command, ...args]);
      return defaultExec(command, args, options);
    };
    expect(await run(repo, { ...fake.env, [variable]: 'true' }, exec)).toEqual({ code: 1, stdout: '', stderr: "sign-off refused: it runs only on the owner's machine, never in CI\n" });
    expect(calls).toEqual([]);
    expect(fake.log()).toEqual([]);
  });

  const later: [string, (repo: Repo) => void][] = [
    ['a new commit', (repo) => repo.git(['commit', '-q', '--allow-empty', '-m', 'later'])],
    ['an amended commit', (repo) => repo.git(['commit', '-q', '--amend', '-m', 'amended'])],
    [
      'a merge commit',
      (repo) => {
        repo.git(['switch', '-q', '-c', 'side']);
        repo.git(['commit', '-q', '--allow-empty', '-m', 'side']);
        repo.git(['switch', '-q', BRANCH]);
        repo.git(['commit', '-q', '--allow-empty', '-m', 'main line']);
        repo.git(['merge', '-q', '--no-ff', '-m', 'merge side', 'side']);
      },
    ],
  ];

  test.each(later)('%s after a passing run has no result of its own', async (_, change) => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    passed(repo);
    change(repo);
    const head = repo.git(['rev-parse', 'HEAD']);
    expect(head).not.toBe(repo.sha);
    const fake = fakes(repo);
    expect(await run(repo, fake.env)).toEqual({ code: 1, stdout: '', stderr: `sign-off refused: no local full run on ${head}: run npm run verify\n` });
    expect(fake.log()).toEqual([]);
  });

  test('a result for another commit, or of an unknown format, counts as none', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    const fake = fakes(repo);
    const refusal = { code: 1, stdout: '', stderr: `sign-off refused: no local full run on ${repo.sha}: run npm run verify\n` };
    fs.mkdirSync(resultDir(repo), { recursive: true });
    fs.writeFileSync(path.join(resultDir(repo), `${repo.sha}.json`), JSON.stringify(result('0'.repeat(40))));
    expect(await run(repo, fake.env)).toEqual(refusal);
    fs.writeFileSync(path.join(resultDir(repo), `${repo.sha}.json`), JSON.stringify({ ...result(repo.sha), version: 2 }));
    expect(await run(repo, fake.env)).toEqual(refusal);
    fs.writeFileSync(path.join(resultDir(repo), `${repo.sha}.json`), '{ not json');
    expect(await run(repo, fake.env)).toEqual(refusal);
    expect(ghCalls(fake)).toEqual([]);
  });

  test('a detached HEAD is refused', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    passed(repo);
    repo.git(['switch', '-q', '--detach']);
    const fake = fakes(repo);
    expect(await run(repo, fake.env)).toEqual({ code: 1, stdout: '', stderr: "sign-off refused: check out the pull request's branch first\n" });
    expect(fake.log()).toEqual([]);
  });

  test('an origin on another host is refused', async () => {
    const repo = makeRepo(SAMPLE);
    repo.git(['remote', 'add', 'origin', 'https://gitlab.com/alex-profir/CV.git']);
    passed(repo);
    const fake = fakes(repo);
    expect(await run(repo, fake.env)).toEqual({ code: 1, stdout: '', stderr: 'sign-off refused: origin is not a github.com repository: https://gitlab.com/alex-profir/CV.git\n' });
    expect(ghCalls(fake)).toEqual([]);
  });

  test("origin's two github.com forms parse, and nothing else does", () => {
    for (const url of ['https://github.com/alex-profir/CV', 'https://github.com/alex-profir/CV.git', 'git@github.com:alex-profir/CV', 'git@github.com:alex-profir/CV.git']) {
      expect(parseGitHubRepo(url), url).toEqual({ owner: 'alex-profir', repo: 'CV' });
    }
    for (const url of ['http://github.com/alex-profir/CV', 'https://github.com.example.com/alex-profir/CV', 'https://gitlab.com/alex-profir/CV', 'ssh://git@github.com/alex-profir/CV', 'https://github.com/alex-profir', 'file:///tmp/CV.git']) {
      expect(parseGitHubRepo(url), url).toBeNull();
    }
  });

  test('npm run signoff through its entry point: an argument is a usage error, and CI is refused', () => {
    const repo = makeRepo(SAMPLE);
    const fake = fakes(repo);
    const main = (args: string[], env: NodeJS.ProcessEnv) => spawnSync(process.execPath, [MAIN, ...args], { cwd: repo.root, env, encoding: 'utf8' });
    expect(main(['signoff', 'extra'], fake.env)).toMatchObject({ status: 2, stderr: 'usage: npm run verify [-- --failed] | npm run verify:feature [-- --failed] | npm run signoff\n' });
    expect(main(['signoff'], { ...fake.env, CI: 'true' })).toMatchObject({ status: 1, stderr: "sign-off refused: it runs only on the owner's machine, never in CI\n" });
    expect(fake.log()).toEqual([]);
  });
});

describe('001-requirement-traceability-FR-036: signing off runs no test, and records nothing unless the commit is on the host', { timeout: 30_000 }, () => {
  test('signing off a passing run starts no check', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    passed(repo);
    const fake = fakes(repo);
    expect((await run(repo, fake.env)).code).toBe(0);
    expect(fake.log().filter((entry) => entry.command === 'npm')).toEqual([]);
  });

  test('a commit not yet on origin is pushed first, without force, then signed off', async () => {
    const repo = makeRepo(SAMPLE);
    const origin = withOrigin(repo, { pushed: false });
    passed(repo);
    const fake = fakes(repo);
    const { code, stdout } = await run(repo, fake.env);
    expect(code).toBe(0);
    expect(stdout.startsWith(`pushing ${BRANCH} to origin first\nsigned off ${repo.sha} on alex-profir/CV: `)).toBe(true);
    expect(origin.remoteHead(BRANCH)).toBe(repo.sha);
    expect(ghCalls(fake).map((entry) => entry.remoteHead)).toEqual([repo.sha]);
  });

  test('an unreachable origin records nothing', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo, { reachable: false });
    passed(repo);
    const fake = fakes(repo);
    const { code, stdout, stderr } = await run(repo, fake.env);
    expect({ code, stdout }).toEqual({ code: 1, stdout: '' });
    expect(stderr).toMatch(/^can't reach origin, nothing was recorded: \S/);
    expect(ghCalls(fake)).toEqual([]);
  });

  test('a rejected push records nothing', async () => {
    const repo = makeRepo(SAMPLE);
    const origin = withOrigin(repo);
    repo.git(['commit', '-q', '--allow-empty', '-m', 'pushed elsewhere']);
    repo.git(['push', '-q', 'origin', 'HEAD']);
    const elsewhere = repo.git(['rev-parse', 'HEAD']);
    repo.git(['reset', '-q', '--hard', 'HEAD~1']);
    repo.git(['commit', '-q', '--allow-empty', '-m', 'local only']);
    const head = repo.git(['rev-parse', 'HEAD']);
    passed(repo, head);
    const fake = fakes(repo);
    const { code, stdout, stderr } = await run(repo, fake.env);
    expect(code).toBe(1);
    expect(stdout).toBe(`pushing ${BRANCH} to origin first\n`);
    expect(stderr).toMatch(new RegExp(`^could not push ${BRANCH}, nothing was recorded: \\S`));
    expect(origin.remoteHead(BRANCH)).toBe(elsewhere);
    expect(ghCalls(fake)).toEqual([]);
  });

  test("a failing gh is reported with its message", async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    passed(repo);
    const fake = fakes(repo, { gh: { exitCode: 1, stderr: 'HTTP 401: Bad credentials (https://api.github.com/)\n' } });
    expect(await run(repo, fake.env)).toEqual({ code: 1, stdout: '', stderr: 'could not record the sign-off: HTTP 401: Bad credentials (https://api.github.com/)\n' });
  });

  test('without the GitHub CLI it says how to get it', async () => {
    const repo = makeRepo(SAMPLE);
    withOrigin(repo);
    passed(repo);
    const fake = fakes(repo, { gh: null });
    expect(fs.readdirSync(fake.bin)).not.toContain('gh');
    expect(await run(repo, fake.env)).toEqual({ code: 1, stdout: '', stderr: 'signing off needs the GitHub CLI: install it from https://cli.github.com and run gh auth login\n' });
  });
});
