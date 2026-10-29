// Runs worktree.sh against a throwaway repository with a bare origin. gh, npm
// and the loop are stubs, so nothing reaches GitHub and no session starts.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

const SCRIPT = path.resolve(import.meta.dirname, '../worktree.sh');
// No process has this pid, so a lock naming it is stale.
const DEAD_PID = 2 ** 22 + 1;

type Pr = { number: number; headRefName: string; state: 'OPEN' | 'MERGED' | 'CLOSED'; headRefOid: string; mergedAt: string | null };

let tmp: string;
let repo: string;
let home: string;
let env: NodeJS.ProcessEnv;
let prs: Pr[];

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: repo, env, encoding: 'utf8' }).trim();
}

function run(...args: string[]) {
  fs.writeFileSync(env.GH_PRS!, JSON.stringify(prs));
  const result = spawnSync('bash', [SCRIPT, ...args], { cwd: repo, env, encoding: 'utf8' });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

function stub(name: string, body: string) {
  const file = path.join(tmp, 'bin', name);
  fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return file;
}

// A branch from main with one commit of its own, pushed unless told otherwise.
function branch(name: string, push = true): string {
  git('switch', '-q', '-c', name, 'main');
  fs.writeFileSync(path.join(repo, `${name}.txt`), name);
  git('add', '.');
  git('commit', '-q', '-m', name);
  if (push) git('push', '-q', 'origin', name);
  git('switch', '-q', 'main');
  return git('rev-parse', name);
}

function commitOn(name: string, cwd = repo): string {
  execFileSync('git', ['commit', '-q', '--allow-empty', '-m', `more on ${name}`], { cwd, env });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd, env, encoding: 'utf8' }).trim();
}

function pr(headRefName: string, headRefOid: string, state: Pr['state'] = 'MERGED') {
  prs.push({ number: prs.length + 1, headRefName, state, headRefOid, mergedAt: state === 'MERGED' ? `2026-10-${10 + prs.length}T00:00:00Z` : null });
}

function addWorktree(name: string): string {
  const dir = path.join(home, name);
  git('worktree', 'add', '-q', dir, name);
  return dir;
}

const branches = () => git('for-each-ref', '--format=%(refname:short)', 'refs/heads').split('\n');
const locked = () => git('worktree', 'list', '--porcelain').split('\n').filter((line) => line.startsWith('locked'));

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-worktree-')));
  repo = path.join(tmp, 'repo');
  home = path.join(tmp, 'repo-worktrees');
  fs.mkdirSync(path.join(tmp, 'bin'));
  env = {
    ...process.env,
    PATH: `${path.join(tmp, 'bin')}:${process.env.PATH}`,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'Test',
    GIT_AUTHOR_EMAIL: 'test@example.com',
    GIT_COMMITTER_NAME: 'Test',
    GIT_COMMITTER_EMAIL: 'test@example.com',
    GH_PRS: path.join(tmp, 'prs.json'),
    NPM_LOG: path.join(tmp, 'npm.log'),
    LOOP_LOG: path.join(tmp, 'loop.log'),
    SPECKIT_AUTO_RUN: path.join(tmp, 'bin', 'loop'),
  };
  delete env.PORT;
  delete env.SPECKIT_WORKTREES;
  prs = [];
  stub('gh', 'if [ -n "$GH_FAIL" ]; then exit 1; fi\ncat "$GH_PRS"');
  stub('npm', 'mkdir -p node_modules\necho "$PWD $*" >> "$NPM_LOG"');
  // Records where it ran, with what, and the worktree's lock while it ran.
  stub(
    'loop',
    [
      'echo "cwd=$(pwd -P)" >> "$LOOP_LOG"',
      'echo "args=$*" >> "$LOOP_LOG"',
      'echo "port=$PORT" >> "$LOOP_LOG"',
      'git worktree list --porcelain | grep "^locked" | sed "s/^/lock=/" >> "$LOOP_LOG"',
      'echo "the loop ran"',
      'exit "${LOOP_EXIT:-0}"',
    ].join('\n'),
  );
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', path.join(tmp, 'origin.git')], { env });
  execFileSync('git', ['clone', '-q', path.join(tmp, 'origin.git'), repo], { env, stdio: 'ignore' });
  git('switch', '-q', '-c', 'main');
  git('commit', '-q', '--allow-empty', '-m', 'init');
  git('push', '-q', '-u', 'origin', 'main');
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

const loopLog = () => fs.readFileSync(env.LOOP_LOG!, 'utf8');

describe('start and resume', { timeout: 30_000 }, () => {
  test('checks out a branch that is only on origin next to the repository and runs the loop there, locked', () => {
    branch('008-alpha');
    git('branch', '-q', '-D', '008-alpha');

    const result = run('start', '008-alpha', '--implement-only');

    expect(result.status).toBe(0);
    const dir = path.join(home, '008-alpha');
    expect(loopLog()).toContain(`cwd=${dir}\n`);
    expect(loopLog()).toContain('args=build specs/008-alpha --implement-only\n');
    expect(loopLog()).toMatch(/^port=(\d+)$/m);
    expect(Number(/^port=(\d+)$/m.exec(loopLog())![1])).toBeGreaterThanOrEqual(4174);
    expect(loopLog()).toMatch(/^lock=locked speckit-auto pid=\d+ port=\d+$/m);
    expect(locked()).toEqual([]);
    expect(fs.readFileSync(path.join(home, '.logs', '008-alpha.log'), 'utf8')).toContain('the loop ran');
    expect(fs.readFileSync(env.NPM_LOG!, 'utf8')).toBe(`${dir} ci --no-audit --no-fund\n`);
  });

  test('reuses the worktree, skips installing again and passes on the loop’s exit status, unlocking either way', () => {
    branch('008-alpha');
    expect(run('start', '008-alpha').status).toBe(0);

    env.LOOP_EXIT = '3';
    const result = run('resume', '008-alpha', 'abc123', '-i', 'plan_verdict=approve');

    expect(result.status).toBe(3);
    expect(loopLog()).toContain('args=resume abc123 -i plan_verdict=approve\n');
    expect(fs.readFileSync(env.NPM_LOG!, 'utf8').trim().split('\n')).toHaveLength(1);
    expect(locked()).toEqual([]);
  });

  test('uses PORT when it is set', () => {
    branch('008-alpha');
    env.PORT = '5999';

    expect(run('start', '008-alpha').status).toBe(0);
    expect(loopLog()).toContain('port=5999\n');
  });

  test('refuses a branch that is checked out in another checkout', () => {
    branch('008-alpha');
    git('switch', '-q', '008-alpha');

    const result = run('start', '008-alpha');

    expect(result.status).toBe(1);
    expect(result.err).toContain(`008-alpha is checked out in ${repo}`);
    expect(fs.existsSync(env.LOOP_LOG!)).toBe(false);
  });

  test('refuses a branch that exists neither here nor on origin', () => {
    const result = run('start', '009-missing');

    expect(result.status).toBe(1);
    expect(result.err).toContain('No branch 009-missing');
  });

  test('refuses while the feature’s loop is running, and clears a lock whose loop is gone', () => {
    branch('008-alpha');
    const dir = addWorktree('008-alpha');
    git('worktree', 'lock', '--reason', `speckit-auto pid=${process.pid} port=4174`, dir);

    const running = run('start', '008-alpha');
    expect(running.status).toBe(1);
    expect(running.err).toContain(`already running (pid ${process.pid})`);

    git('worktree', 'unlock', dir);
    git('worktree', 'lock', '--reason', `speckit-auto pid=${DEAD_PID} port=4174`, dir);
    expect(run('start', '008-alpha').status).toBe(0);
    expect(loopLog()).toContain(`cwd=${dir}\n`);
    expect(locked()).toEqual([]);
  });

  test('refuses a worktree someone else locked', () => {
    branch('008-alpha');
    git('worktree', 'lock', addWorktree('008-alpha'));

    const result = run('start', '008-alpha');

    expect(result.status).toBe(1);
    expect(result.err).toContain('008-alpha is locked');
  });

  test('skips the port another running loop holds', () => {
    branch('008-alpha');
    branch('008-beta');
    git('worktree', 'lock', '--reason', `speckit-auto pid=${process.pid} port=4174`, addWorktree('008-beta'));

    expect(run('start', '008-alpha').status).toBe(0);
    expect(/^port=(\d+)$/m.exec(loopLog())![1]).not.toBe('4174');
  });

  test('cleans up before starting, and still starts when GitHub can’t be reached', () => {
    pr('007-done', branch('007-done'));
    addWorktree('007-done');
    branch('008-alpha');
    env.GH_FAIL = '1';

    const offline = run('start', '008-alpha');
    expect(offline.status).toBe(0);
    expect(offline.err).toContain('GitHub could not be reached');
    expect(fs.existsSync(path.join(home, '007-done'))).toBe(true);

    delete env.GH_FAIL;
    const online = run('start', '008-alpha');
    expect(online.status).toBe(0);
    expect(online.out).toContain('removed 007-done: its pull request is merged');
    expect(fs.existsSync(path.join(home, '007-done'))).toBe(false);
  });
});

describe('clean', { timeout: 30_000 }, () => {
  // One worktree or branch for each case clean tells apart.
  function scene() {
    pr('w-merged', branch('w-merged'));
    pr('w-stale', branch('w-stale'));
    pr('w-dirty', branch('w-dirty'));
    pr('w-ahead', branch('w-ahead'));
    pr('w-running', branch('w-running'));
    pr('w-reopened', branch('w-reopened'));
    pr('w-reopened', git('rev-parse', 'w-reopened'), 'OPEN');
    branch('w-none');
    pr('b-merged', branch('b-merged'));
    pr('b-unpushed', branch('b-unpushed', false));
    pr('b-closed', branch('b-closed'), 'CLOSED');
    pr('b-here', branch('b-here'));

    const dirs = Object.fromEntries(
      ['w-merged', 'w-stale', 'w-dirty', 'w-ahead', 'w-running', 'w-reopened', 'w-none'].map((name) => [name, addWorktree(name)]),
    );
    fs.mkdirSync(path.join(home, '.logs'));
    fs.writeFileSync(path.join(home, '.logs', 'w-merged.log'), 'old run');
    fs.writeFileSync(path.join(dirs['w-dirty']!, 'notes.txt'), 'unsaved');
    commitOn('w-ahead', dirs['w-ahead']);
    git('worktree', 'lock', '--reason', `speckit-auto pid=${process.pid} port=4174`, dirs['w-running']!);
    git('worktree', 'lock', '--reason', `speckit-auto pid=${DEAD_PID} port=4175`, dirs['w-stale']!);
    // Merged as a later commit than the local branch has: nothing is lost.
    pr('b-behind', branch('b-behind'));
    git('switch', '-q', 'b-behind');
    prs.at(-1)!.headRefOid = commitOn('b-behind');
    git('push', '-q', 'origin', 'b-behind');
    git('reset', '-q', '--hard', 'HEAD~1');
    git('switch', '-q', 'b-here');
    fs.mkdirSync(path.join(home, 'stray'));
    return dirs;
  }

  test('with --dry-run, reports what it would remove and changes nothing', () => {
    scene();
    const before = { branches: branches(), worktrees: git('worktree', 'list') };

    const result = run('clean', '--dry-run');

    expect(result.status).toBe(0);
    expect(result.out).toContain('would remove w-merged: its pull request is merged');
    expect(result.out).toContain('would delete branch b-merged: its pull request is merged');
    expect({ branches: branches(), worktrees: git('worktree', 'list') }).toEqual(before);
    expect(fs.existsSync(path.join(home, '.logs', 'w-merged.log'))).toBe(true);
  });

  test('removes only merged worktrees and branches that would lose nothing, and says why it kept the rest', () => {
    const dirs = scene();

    const result = run('clean');

    expect(result.status).toBe(0);
    expect(result.err).toBe('');
    expect(result.out.trim().split('\n').sort()).toEqual(
      [
        'removed w-merged: its pull request is merged',
        'removed w-stale: its pull request is merged',
        'kept w-dirty: it has uncommitted changes',
        'kept w-ahead: has commits that pull request #4 did not merge',
        `kept w-running: its loop is running (pid ${process.pid})`,
        'kept w-reopened: pull request #7 is open',
        'kept w-none: no merged pull request',
        'deleted branch b-merged: its pull request is merged',
        'deleted branch b-unpushed: its pull request is merged',
        'deleted branch b-behind: its pull request is merged',
        'left stray: not a worktree of this repository',
      ].sort(),
    );
    expect(fs.existsSync(dirs['w-merged']!)).toBe(false);
    expect(fs.existsSync(dirs['w-stale']!)).toBe(false);
    expect(fs.existsSync(path.join(home, '.logs', 'w-merged.log'))).toBe(false);
    expect(branches().sort()).toEqual(
      ['b-closed', 'b-here', 'main', 'w-ahead', 'w-dirty', 'w-none', 'w-reopened', 'w-running'].sort(),
    );
  });

  test('never removes the worktree it runs from', () => {
    pr('w-merged', branch('w-merged'));
    const dir = addWorktree('w-merged');
    fs.writeFileSync(env.GH_PRS!, JSON.stringify(prs));

    const result = spawnSync('bash', [SCRIPT, 'clean'], { cwd: dir, env: { ...env }, encoding: 'utf8' });

    expect(result.stdout).toContain('kept w-merged: it is the checkout this ran from');
    expect(fs.existsSync(dir)).toBe(true);
  });

  test('changes nothing when GitHub can’t be reached', () => {
    pr('w-merged', branch('w-merged'));
    addWorktree('w-merged');
    env.GH_FAIL = '1';

    const result = run('clean');

    expect(result.status).toBe(0);
    expect(result.err).toContain('GitHub could not be reached');
    expect(fs.existsSync(path.join(home, 'w-merged'))).toBe(true);
  });
});

describe('list', { timeout: 30_000 }, () => {
  test('shows each worktree’s loop state and pull request', () => {
    pr('w-open', branch('w-open'), 'OPEN');
    branch('w-none');
    git('worktree', 'lock', '--reason', `speckit-auto pid=${process.pid} port=4174`, addWorktree('w-open'));
    addWorktree('w-none');

    const result = run('list');

    expect(result.status).toBe(0);
    expect(result.out.trim().split('\n').sort()).toEqual(
      [`w-none\tidle\tno pull request`, `w-open\trunning (pid ${process.pid})\t#1 open`].sort(),
    );
  });
});
