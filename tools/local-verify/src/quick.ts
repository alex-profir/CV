// `npm run verify`: the quick checks and the tests a change touches, before
// pushing (FR-038, FR-039). It takes any working copy, and it stops at the
// first failure. Nothing can be signed off from it, and nothing requires it.
import fs from 'node:fs';
import path from 'node:path';
import { listFiles } from '../../traceability/src/files.ts';
import { affectedTests } from './affected.ts';
import { checks, commandLine } from './checks.ts';
import type { Exec } from './git.ts';
import { defaultExec, gitIn } from './git.ts';
import { resultDir } from './result.ts';
import { planPath, readPlan, readReport, remaining, writePlan } from './run-plan.ts';
import type { RunCommand, Output } from './verify.ts';
import { defaultRunCommand } from './verify.ts';

export type QuickOptions = {
  root: string;
  env: NodeJS.ProcessEnv;
  failed?: boolean;
  exec?: Exec;
  runCommand?: RunCommand;
  stdout?: Output;
  stderr?: Output;
};

export async function quick(options: QuickOptions): Promise<number> {
  const { root, env } = options;
  const exec = options.exec ?? defaultExec;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const git = gitIn(root, env, exec);

  const sha = git.head();
  const dir = resultDir(root, env, exec);
  if (sha === null || dir === null) {
    stderr.write('quick run: not a git work tree\n');
    return 2;
  }
  const branch = git.branch();
  const planFile = planPath(dir, 'quick', branch);
  const reportFile = planFile.replace(/\.json$/, '.vitest.json');
  const testFiles = listFiles(root).testFiles;

  let files: string[];
  let passed: Record<string, number> = {};
  let planned: string[];
  if (options.failed === true) {
    const plan = readPlan(planFile);
    if (plan === null) {
      stderr.write(`quick run: no earlier run on ${branch ?? 'this commit'}: run npm run verify\n`);
      return 2;
    }
    const changed = git.changedSince(plan.sha);
    if ('error' in changed) {
      stderr.write(`quick run: git diff failed: ${changed.error}\n`);
      return 2;
    }
    files = remaining(plan, changed.files, testFiles);
    passed = Object.fromEntries(Object.entries(plan.passed).filter(([file]) => !files.includes(file)));
    planned = [...new Set([...plan.planned, ...files])];
  } else {
    const changed = git.changedSince(git.mergeBase() ?? sha);
    if ('error' in changed) {
      stderr.write(`quick run: git diff failed: ${changed.error}\n`);
      return 2;
    }
    files = affectedTests(changed.files, testFiles);
    planned = files;
  }
  writePlan(planFile, { sha, planned, passed });
  fs.rmSync(reportFile, { force: true });

  for (const check of checks(reportFile, files)) {
    if (check.name === 'test' && files.length === 0) break;
    stdout.write(`== ${check.name}: ${check.name === 'test' ? `npm test (${files.length} test files)` : commandLine(check)}\n`);
    const { exitCode } = await runCommand(check.command, check.args, { cwd: root, env, onStdout: (chunk) => stdout.write(chunk), onStderr: (chunk) => stderr.write(chunk) });
    let ok = exitCode === 0;
    if (check.name === 'test') {
      const report = readReport(root, reportFile);
      passed = { ...passed, ...report.passed };
      writePlan(planFile, { sha, planned, passed });
      ok = ok && report.success && files.every((file) => file in report.passed);
    }
    if (!ok) {
      stdout.write(`\nFAIL: ${check.name}. After a fix, take only what's left with: npm run verify -- --failed\n`);
      return 1;
    }
  }
  stdout.write(files.length === 0 ? '\nPASS: the quick checks passed, and no test covers these changes.\n' : `\nPASS: the quick checks and ${files.length} test ${files.length === 1 ? 'file' : 'files'} passed.\n`);
  return 0;
}
