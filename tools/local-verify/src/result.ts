// The result of a local full run, kept under the clone's git directory so it
// is never tracked or pushed (FR-037, research R17), and the description of
// the sign-off made from it (research R18).
import fs from 'node:fs';
import path from 'node:path';
import type { Exec } from './git.ts';
import { commonDir } from './git.ts';

export const CHECK_NAMES = ['typecheck', 'traceability', 'content', 'tokens', 'test', 'site'] as const;

export type CheckName = (typeof CHECK_NAMES)[number];

export type Check = {
  name: CheckName;
  command: string;
  status: 'pass' | 'fail';
  exitCode: number | null;
  durationMs: number;
  detail: string | null;
};

export type LocalRunResult = {
  version: 1;
  sha: string;
  branch: string | null;
  startedAt: string;
  finishedAt: string;
  clean: { atStart: true; atEnd: boolean; changed: string[] };
  checks: Check[];
  tests: { files: number; expectedFiles: number; passed: number; failed: number; skipped: number };
  siteCheck: 'pass' | 'fail';
  node: string;
  os: string;
  result: 'pass' | 'fail';
};

// GitHub's limit on a commit status description.
export const DESCRIPTION_LIMIT = 140;

// `<git common dir>/local-verify`, absolute. Shared by every worktree of the
// clone; a result is keyed by commit, so it holds in any of them.
export function resultDir(root: string, env: NodeJS.ProcessEnv, exec?: Exec): string | null {
  const dir = commonDir(root, exec, env);
  return dir === null ? null : path.join(path.resolve(root, dir), 'local-verify');
}

export function resultPaths(dir: string, sha: string): { json: string; log: string; vitest: string } {
  return { json: path.join(dir, `${sha}.json`), log: path.join(dir, `${sha}.log`), vitest: path.join(dir, `${sha}.vitest.json`) };
}

// Replaces any earlier result for the same commit.
export function writeResult(dir: string, result: LocalRunResult): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(resultPaths(dir, result.sha).json, `${JSON.stringify(result, null, 2)}\n`);
}

// The passing result for `sha`, or why there is none: no readable result of
// this format for this exact commit, or a failed one, with the checks that
// failed.
export function readPassingResult(dir: string, sha: string): { result: LocalRunResult } | { reason: 'none' } | { reason: 'failed'; checks: string[] } {
  let result: LocalRunResult;
  try {
    result = JSON.parse(fs.readFileSync(resultPaths(dir, sha).json, 'utf8'));
  } catch {
    return { reason: 'none' };
  }
  if (typeof result !== 'object' || result === null || result.version !== 1 || result.sha !== sha || !Array.isArray(result.checks)) return { reason: 'none' };
  if (result.result === 'pass' && result.clean?.atEnd === true && result.checks.every((check) => check.status === 'pass')) return { result };
  const checks: string[] = result.checks.filter((check) => check.status !== 'pass').map((check) => check.name);
  if (result.clean?.atEnd !== true) checks.push('working copy changed');
  return { reason: 'failed', checks };
}

// `<passed> tests in <files> files passed; site check passed; Node <node>;
// <os>`, at most 140 characters: only the OS part is shortened, ending in `…`.
export function describeSignOff(result: Pick<LocalRunResult, 'tests' | 'node' | 'os'>): string {
  const fixed = `${result.tests.passed} tests in ${result.tests.files} files passed; site check passed; Node ${result.node}; `;
  const room = DESCRIPTION_LIMIT - fixed.length;
  const os = result.os.length <= room ? result.os : `${result.os.slice(0, Math.max(0, room - 1)).trimEnd()}…`;
  return `${fixed}${os}`;
}
