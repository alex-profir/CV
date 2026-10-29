// `npm run signoff`: records the passing `local-verify` commit status on the
// head commit with the owner's `gh` login (FR-033 to FR-036, research R18).
// It runs no test. Every refusal records nothing and exits 1.
import type { Exec } from './git.ts';
import { defaultExec, gitIn, parseGitHubRepo } from './git.ts';
import { describeSignOff, readPassingResult, resultDir } from './result.ts';
import type { Output } from './verify.ts';

export type SignoffOptions = {
  root: string;
  env: NodeJS.ProcessEnv;
  exec?: Exec;
  stdout?: Output;
  stderr?: Output;
};

const isSet = (value: string | undefined) => value !== undefined && value !== '';

export async function signoff(options: SignoffOptions): Promise<number> {
  const { root, env } = options;
  const exec = options.exec ?? defaultExec;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const refuse = (message: string) => {
    stderr.write(`${message}\n`);
    return 1;
  };

  // 1. The owner's act, on their machine: checked before anything else.
  if (isSet(env.CI) || isSet(env.GITHUB_ACTIONS)) return refuse("sign-off refused: it runs only on the owner's machine, never in CI");

  // 2. The commit, on a branch.
  const git = gitIn(root, env, exec);
  const sha = git.head();
  if (sha === null) return refuse('sign-off refused: not a git work tree');
  const branch = git.branch();
  if (branch === null) return refuse("sign-off refused: check out the pull request's branch first");

  // 3. A passing local full run of this exact commit. Nothing runs again.
  const dir = resultDir(root, env, exec);
  const found = dir === null ? ({ reason: 'none' } as const) : readPassingResult(dir, sha);
  if ('reason' in found) {
    if (found.reason === 'none') return refuse(`sign-off refused: no local full run on ${sha}: run npm run verify`);
    return refuse(`sign-off refused: the last local full run on ${sha} failed (${found.checks.join(', ')})`);
  }

  // 4. GitHub's CLI.
  if (exec('gh', ['--version'], { cwd: root, env }).status !== 0) {
    return refuse('signing off needs the GitHub CLI: install it from https://cli.github.com and run gh auth login');
  }

  // 5. The repository, from origin's URL.
  const url = git.originUrl();
  const repository = url === null ? null : parseGitHubRepo(url);
  if (repository === null) return refuse(`sign-off refused: origin is not a github.com repository: ${url ?? '(no origin)'}`);

  // 6. The commit must be on the host before its status can be.
  const remote = git.remoteHead(branch);
  if ('error' in remote) return refuse(`can't reach origin, nothing was recorded: ${remote.error}`);
  if (remote.sha !== sha) {
    stdout.write(`pushing ${branch} to origin first\n`);
    const pushed = git.push(branch);
    if ('error' in pushed) return refuse(`could not push ${branch}, nothing was recorded: ${pushed.error}`);
  }

  // 7. The status.
  const description = describeSignOff(found.result);
  const posted = exec(
    'gh',
    ['api', '--method', 'POST', `repos/${repository.owner}/${repository.repo}/statuses/${sha}`, '-f', 'state=success', '-f', 'context=local-verify', '-f', `description=${description}`],
    { cwd: root, env },
  );
  if (posted.status !== 0) return refuse(`could not record the sign-off: ${posted.stderr.trim() || `gh exited with ${posted.status}`}`);
  stdout.write(`signed off ${sha} on ${repository.owner}/${repository.repo}: local-verify success: ${description}\n`);
  return 0;
}
