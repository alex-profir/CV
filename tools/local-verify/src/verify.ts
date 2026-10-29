// `npm run verify`: every check of a pull request, with the full test set,
// on the commit checked out (FR-032, FR-033, research R16). It needs no
// network and writes only under the clone's git directory (FR-037). It
// returns the exit code and never calls process.exit().
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listFiles } from '../../traceability/src/files.ts';
import { compare } from '../../traceability/src/report.ts';
import { checks, commandLine } from './checks.ts';
import type { Exec } from './git.ts';
import { defaultExec, gitIn } from './git.ts';
import { resultDir, resultPaths, writeResult } from './result.ts';
import type { Check, LocalRunResult } from './result.ts';

export type Output = { write: (text: string) => unknown };

// Runs one check and streams its output, chunk by chunk, as it comes.
// spawnSync can't stream, so checks don't go through `exec`.
export type RunCommand = (command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv; onStdout: (chunk: string) => void; onStderr: (chunk: string) => void }) => Promise<{ exitCode: number | null }>;

// The real probes for Node and the installed dependencies default here.
// Chromium's can't: it lives in tools/site-check/src/browser.ts, which
// imports playwright, and the fast set's tests import this file (research
// R14, rule 3). main.js supplies it.
export type Prerequisites = {
  hasChromium: () => boolean | Promise<boolean>;
  nodeVersion?: string;
};

export type VerifyOptions = {
  root: string;
  env: NodeJS.ProcessEnv;
  exec?: Exec;
  prerequisites: Prerequisites;
  runCommand?: RunCommand;
  stdout?: Output;
  stderr?: Output;
};

export const defaultRunCommand: RunCommand = (command, args, { cwd, env, onStdout, onStderr }) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.setEncoding('utf8').on('data', onStdout);
    child.stderr.setEncoding('utf8').on('data', onStderr);
    child.on('error', (error) => {
      onStderr(`${error.message}\n`);
      resolve({ exitCode: null });
    });
    child.on('close', (code) => resolve({ exitCode: code }));
  });

function readJson(file: string): unknown {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
}

// What's missing before any check can run, each with the command that fixes
// it, listed together (contracts/local-verify.md).
async function missingPrerequisites(root: string, prerequisites: Prerequisites): Promise<string[]> {
  const missing: string[] = [];
  const version = prerequisites.nodeVersion ?? process.versions.node;
  let nvmrc: string | undefined;
  try {
    nvmrc = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim();
  } catch {
    nvmrc = undefined;
  }
  if (nvmrc !== undefined && nvmrc.replace(/^v/, '').split('.')[0] !== version.split('.')[0]) {
    missing.push(`local full run needs Node ${nvmrc} (see .nvmrc), but this is Node ${version}: run nvm use`);
  }
  if (!dependenciesInstalled(root)) missing.push('local full run needs the locked dependencies installed: run npm ci');
  if (!(await prerequisites.hasChromium())) missing.push('site check needs Chromium: run npx playwright install chromium');
  return missing;
}

type Lockfile = { packages?: Record<string, { version?: string; optional?: boolean }> };

// Every package of package-lock.json is installed at its locked version, as
// npm's hidden lockfile `node_modules/.package-lock.json` records. npm leaves
// out optional packages built for other platforms, so a missing optional one
// is fine.
function dependenciesInstalled(root: string): boolean {
  const locked = readJson(path.join(root, 'package-lock.json')) as Lockfile | undefined;
  const installed = readJson(path.join(root, 'node_modules/.package-lock.json')) as Lockfile | undefined;
  if (locked?.packages === undefined || installed?.packages === undefined) return false;
  for (const [name, entry] of Object.entries(locked.packages)) {
    if (name === '') continue;
    const found = installed.packages[name];
    if (found === undefined ? entry.optional !== true : found.version !== entry.version) return false;
  }
  return true;
}

type VitestReport = { success?: unknown; numPassedTests?: unknown; numFailedTests?: unknown; numPendingTests?: unknown; numTodoTests?: unknown; testResults?: { name?: unknown }[] };

const count = (value: unknown) => (typeof value === 'number' ? value : 0);

// SC-010: the full set ran only when Vitest's report lists exactly the test
// files the traceability check lists, and reports success.
function readTestReport(root: string, file: string): { tests: LocalRunResult['tests']; detail: string | null } {
  const expected = listFiles(root).testFiles;
  const report = readJson(file) as VitestReport | undefined;
  const ran = [...new Set((Array.isArray(report?.testResults) ? report.testResults : []).flatMap((entry) => (typeof entry?.name === 'string' ? [path.relative(root, entry.name).split(path.sep).join('/')] : [])))].sort(compare);
  const tests = {
    files: ran.length,
    expectedFiles: expected.length,
    passed: count(report?.numPassedTests),
    failed: count(report?.numFailedTests),
    skipped: count(report?.numPendingTests) + count(report?.numTodoTests),
  };
  const sameFiles = ran.length === expected.length && ran.every((name, index) => name === expected[index]);
  if (!sameFiles) return { tests, detail: `ran ${ran.length} of ${expected.length} test files` };
  if (report?.success !== true) return { tests, detail: 'the test report shows a failure' };
  return { tests, detail: null };
}

function changedLines(entries: { xy: string; path: string }[]): string {
  return entries.map((entry) => `  ${entry.xy} ${entry.path}\n`).join('');
}

function summaryLine(check: Check, tests: LocalRunResult['tests']): string {
  const seconds = `${Math.round(check.durationMs / 1000)}`.padStart(6);
  const note = check.detail ?? (check.name === 'test' && check.status === 'pass' ? `${tests.passed} tests in ${tests.files} files passed` : null);
  return `  ${check.name.padEnd(14)}${check.status.padEnd(4)}${seconds} s${note === null ? '' : `   ${note}`}\n`;
}

export async function verify(options: VerifyOptions): Promise<number> {
  const { root, env, prerequisites } = options;
  const exec = options.exec ?? defaultExec;
  const runCommand = options.runCommand ?? defaultRunCommand;
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const git = gitIn(root, env, exec);

  // 1. The commit.
  const sha = git.head();
  if (sha === null) {
    stderr.write('local full run: not a git work tree\n');
    return 2;
  }

  // 2. A clean tree, before any probe.
  const atStart = git.porcelain();
  if ('error' in atStart) {
    stderr.write(`local full run: git status failed: ${atStart.error}\n`);
    return 2;
  }
  if (atStart.length > 0) {
    stderr.write(`local full run refused: the working copy differs from commit ${sha}:\n${changedLines(atStart)}Commit or remove these, then run it again.\n`);
    return 2;
  }

  // 3. Prerequisites, all listed together.
  const missing = await missingPrerequisites(root, prerequisites);
  if (missing.length > 0) {
    stderr.write(missing.map((line) => `${line}\n`).join(''));
    return 2;
  }

  const dir = resultDir(root, env, exec);
  if (dir === null) {
    stderr.write('local full run: not a git work tree\n');
    return 2;
  }
  const paths = resultPaths(dir, sha);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(paths.log, '');
  fs.rmSync(paths.vitest, { force: true });
  const toOut = (chunk: string) => {
    stdout.write(chunk);
    fs.appendFileSync(paths.log, chunk);
  };
  const toErr = (chunk: string) => {
    stderr.write(chunk);
    fs.appendFileSync(paths.log, chunk);
  };

  // 4. Every check, in order, whatever the ones before returned.
  const branch = git.branch();
  const startedAt = new Date().toISOString();
  const results: Check[] = [];
  let tests: LocalRunResult['tests'] = { files: 0, expectedFiles: 0, passed: 0, failed: 0, skipped: 0 };
  for (const check of checks(paths.vitest)) {
    const line = commandLine(check);
    toOut(`== ${check.name}: ${line}\n`);
    const started = performance.now();
    const { exitCode } = await runCommand(check.command, check.args, { cwd: root, env, onStdout: toOut, onStderr: toErr });
    const durationMs = Math.round(performance.now() - started);
    let detail: string | null = null;
    // 5. The full set really ran.
    if (check.name === 'test') {
      const report = readTestReport(root, paths.vitest);
      tests = report.tests;
      detail = report.detail;
    }
    results.push({ name: check.name, command: line, status: exitCode === 0 && detail === null ? 'pass' : 'fail', exitCode, durationMs, detail });
  }

  // 6. Still the same commit, and nothing left behind.
  const headAtEnd = git.head();
  const atEnd = git.porcelain();
  const changed = 'error' in atEnd ? [] : atEnd;
  const clean = headAtEnd === sha && !('error' in atEnd) && changed.length === 0;
  if (headAtEnd !== sha) toErr(`local full run: HEAD moved from ${sha} to ${headAtEnd ?? 'nothing'} during the run\n`);
  if ('error' in atEnd) toErr(`local full run: git status failed after the checks: ${atEnd.error}\n`);
  if (changed.length > 0) toErr(`local full run: the checks left the working copy different from commit ${sha}:\n${changedLines(changed)}`);

  // 7. The result and the summary.
  const failed = results.filter((check) => check.status === 'fail').map((check) => check.name);
  const result: LocalRunResult = {
    version: 1,
    sha,
    branch,
    startedAt,
    finishedAt: new Date().toISOString(),
    clean: { atStart: true, atEnd: clean, changed: changed.map((entry) => entry.path) },
    checks: results,
    tests,
    siteCheck: results.find((check) => check.name === 'site')?.status ?? 'fail',
    node: process.versions.node,
    os: `${os.type()} ${os.release()} ${process.arch}`,
    result: failed.length === 0 && clean ? 'pass' : 'fail',
  };
  writeResult(dir, result);

  let summary = `\nLocal full run on ${sha} (${branch ?? 'detached HEAD'})\n${results.map((check) => summaryLine(check, tests)).join('')}\n`;
  if (result.result === 'pass') {
    summary += `PASS: every check passed on ${sha}. Sign off with: npm run signoff\n`;
  } else {
    const changedNote = clean ? '' : failed.length === 0 ? `the working copy changed during the run on ${sha}.` : ' The working copy changed during the run.';
    const checksNote = failed.length === 0 ? '' : `${failed.length} ${failed.length === 1 ? 'check' : 'checks'} failed on ${sha}: ${failed.join(', ')}.`;
    summary += `FAIL: ${checksNote}${changedNote} Nothing can be signed off for this commit.\n`;
  }
  toOut(summary);
  return result.result === 'pass' ? 0 : 1;
}
