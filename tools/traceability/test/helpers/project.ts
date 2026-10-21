import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';

export const REPO_ROOT = fs.realpathSync(path.resolve(import.meta.dirname, '../../../..'));

export const CLI_PATH = path.join(REPO_ROOT, 'tools/traceability/src/main.js');

// Writes a sample project to a temporary directory and returns its real path.
// A key ending in `/` creates an empty directory. Call it inside tests only:
// the directory is removed when the test finishes.
export function makeProject(files: Record<string, string>): string {
  // The real path matters on macOS, where /var is a symlink to /private/var
  // and the permission grant must name the real directory.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'traceability-')));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    if (name.endsWith('/')) {
      fs.mkdirSync(target, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content);
    }
  }
  return root;
}

// Runs the CLI with the same grants as the `traceability` script: read and
// addons only. The read grant on REPO_ROOT lets Node load the CLI and its
// parser when `cwd` is a temporary directory.
export function runCli(cwd: string, args: string[] = []): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    ['--permission', `--allow-fs-read=${REPO_ROOT}`, `--allow-fs-read=${cwd}`, '--allow-addons', CLI_PATH, ...args],
    { cwd, encoding: 'utf8' },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}
