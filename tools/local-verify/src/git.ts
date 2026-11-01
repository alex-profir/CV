// The git calls of the local full run and the sign-off, over an `exec` seam
// so tests can watch them. Each returns data or a failure; none throws on a
// non-zero exit.
import { spawnSync } from 'node:child_process';

export type ExecResult = { status: number | null; stdout: string; stderr: string };

export type Exec = (command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) => ExecResult;

export const defaultExec: Exec = (command, args, { cwd, env }) => {
  const result = spawnSync(command, args, { cwd, env, encoding: 'utf8' });
  return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? (result.error?.message ?? '') };
};

export type Git = ReturnType<typeof gitIn>;

// git's own message for a failed call: its stderr, trimmed, or the exit code
// when it said nothing.
function failure(result: ExecResult): string {
  const message = result.stderr.trim();
  return message !== '' ? message : result.status === null ? 'git could not be started' : `git exited with ${result.status}`;
}

// `git status --porcelain=v1 -z` output as entries. A rename or copy gives
// its new path (the old one follows it as an extra field).
export function parsePorcelain(output: string): { xy: string; path: string }[] {
  const fields = output.split('\0');
  const entries: { xy: string; path: string }[] = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i]!;
    if (field.length < 4) continue;
    const xy = field.slice(0, 2);
    entries.push({ xy, path: field.slice(3) });
    if (xy.includes('R') || xy.includes('C')) i++;
  }
  return entries;
}

// `https://github.com/<owner>/<repo>(.git)` or
// `git@github.com:<owner>/<repo>(.git)`, and nothing else.
export function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const match = /^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+?)(?:\.git)?\/?$/.exec(url.trim());
  if (match === null || match[2] === '' || match[2] === '.' || match[2] === '..') return null;
  return { owner: match[1]!, repo: match[2]! };
}

export function gitIn(root: string, env: NodeJS.ProcessEnv, exec: Exec = defaultExec) {
  const git = (args: string[]) => exec('git', args, { cwd: root, env });
  return {
    // The commit checked out, or null outside a work tree.
    head(): string | null {
      const result = git(['rev-parse', '--verify', '-q', 'HEAD']);
      const inside = git(['rev-parse', '--is-inside-work-tree']);
      return result.status === 0 && inside.status === 0 && inside.stdout.trim() === 'true' ? result.stdout.trim() : null;
    },
    // The branch checked out, or null when HEAD is detached.
    branch(): string | null {
      const result = git(['symbolic-ref', '--short', '-q', 'HEAD']);
      return result.status === 0 ? result.stdout.trim() : null;
    },
    // Every change and untracked file, ignored files left out.
    porcelain(): { xy: string; path: string }[] | { error: string } {
      const result = git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
      return result.status === 0 ? parsePorcelain(result.stdout) : { error: failure(result) };
    },
    trackedFiles(): string[] | { error: string } {
      const result = git(['ls-files', '-z']);
      return result.status === 0 ? result.stdout.split('\0').filter(Boolean) : { error: failure(result) };
    },
    commonDir(): string | null {
      return commonDir(root, exec, env);
    },
    // `origin`'s URL as configured. `git remote get-url` would expand
    // `url.<base>.insteadOf` rewrites, so the configured value is read.
    originUrl(): string | null {
      const result = git(['config', '--get', 'remote.origin.url']);
      return result.status === 0 ? result.stdout.trim() : null;
    },
    // The head of `branch` on origin: a SHA, null when origin has no such
    // branch, or the error that kept origin from answering.
    remoteHead(branch: string): { sha: string | null } | { error: string } {
      const result = git(['ls-remote', 'origin', `refs/heads/${branch}`]);
      if (result.status !== 0) return { error: failure(result) };
      const line = result.stdout.split('\n').find((entry) => entry.endsWith(`\trefs/heads/${branch}`));
      return { sha: line === undefined ? null : line.split('\t')[0]! };
    },
    // Where this branch left the default branch, or null when neither
    // origin's nor a local default branch is known.
    mergeBase(): string | null {
      for (const ref of ['origin/main', 'main']) {
        const result = git(['merge-base', 'HEAD', ref]);
        if (result.status === 0) return result.stdout.trim();
      }
      return null;
    },
    // Every file that differs from `ref`, working copy and untracked files
    // included, ignored files left out.
    changedSince(ref: string): { files: string[] } | { error: string } {
      const diff = git(['diff', '--name-only', '-z', ref]);
      if (diff.status !== 0) return { error: failure(diff) };
      const untracked = git(['ls-files', '--others', '--exclude-standard', '-z']);
      if (untracked.status !== 0) return { error: failure(untracked) };
      return { files: [...new Set([...diff.stdout.split('\0'), ...untracked.stdout.split('\0')].filter(Boolean))] };
    },
    // Pushes HEAD to `branch` on origin, never forced.
    push(branch: string): { ok: true } | { error: string } {
      const result = git(['push', 'origin', `HEAD:refs/heads/${branch}`]);
      return result.status === 0 ? { ok: true } : { error: failure(result) };
    },
  };
}

// `git rev-parse --git-common-dir`, as git prints it (it may be relative to
// `root`), or null outside a repository.
export function commonDir(root: string, exec: Exec = defaultExec, env: NodeJS.ProcessEnv = process.env): string | null {
  const result = exec('git', ['rev-parse', '--git-common-dir'], { cwd: root, env });
  return result.status === 0 ? result.stdout.trim() : null;
}
