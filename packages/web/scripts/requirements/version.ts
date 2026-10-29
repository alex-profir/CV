// The version the site is built from (007 research R8): the commit at HEAD,
// and whether the working copy has changes Git would commit. Read with Git
// itself, run without a shell. Build output and `node_modules` are ignored,
// so a build never makes itself dirty.
import { execFileSync } from 'node:child_process';

export type Version = { commit: string; dirty: boolean };

// Git's output. When it fails, its first line of error is the reason, or `no
// commit` when it says nothing, as `rev-parse --quiet` doesn't.
function git(root: string, args: string[]): string {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const stderr = String((error as { stderr?: unknown }).stderr ?? '').trim();
    const reason = stderr.split('\n')[0]!.replace(/^fatal:\s*/, '') || 'no commit';
    throw new Error(`can't tell which commit the site is built from (${reason})`, { cause: error });
  }
}

export function readVersion(root: string): Version {
  const commit = git(root, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}']).trim();
  if (!/^[0-9a-f]{40,64}$/.test(commit)) throw new Error("can't tell which commit the site is built from (no commit)");
  const dirty = git(root, ['status', '--porcelain', '--untracked-files=normal']).trim() !== '';
  return { commit, dirty };
}
