// Sample git repositories, a local stand-in for GitHub and fake `gh` and
// `npm` commands, for the local full run's and the sign-off's tests (research
// R20). Nothing here reaches the network: git may use the file transport
// only, and `origin`'s github.com URL is rewritten to a local bare repository.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { onTestFinished } from 'vitest';
import { makeProject } from '../../../traceability/test/helpers/project.ts';

export const ORIGIN_URL = 'https://github.com/alex-profir/CV';

const IDENTITY = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false'];

const GIT = (() => {
  const found = spawnSync('/bin/sh', ['-c', 'command -v git'], { encoding: 'utf8' }).stdout.trim();
  if (found === '') throw new Error('the local-verify tests need git on PATH');
  return found;
})();

function tempDir(prefix: string): string {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
  onTestFinished(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// An environment with no user or system git config, no credential prompt and
// the file transport only, without the CI variables (signing off refuses
// under CI, and the fast set runs there). PATH is left as it is: fakeBin()
// replaces it.
export function testEnv(): NodeJS.ProcessEnv {
  const home = tempDir('local-verify-home-');
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('GIT_') || key.startsWith('VITEST') || key === 'CI' || key === 'GITHUB_ACTIONS' || key === 'XDG_CONFIG_HOME') continue;
    env[key] = value;
  }
  return { ...env, HOME: home, XDG_CONFIG_HOME: home, GIT_ALLOW_PROTOCOL: 'file', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' };
}

export type Repo = {
  root: string;
  sha: string;
  env: NodeJS.ProcessEnv;
  // Runs git in the repository with a fixed identity, and returns its
  // trimmed stdout. Throws when git fails.
  git: (args: string[]) => string;
};

function runGit(cwd: string, env: NodeJS.ProcessEnv, args: string[]): string {
  const result = spawnSync(GIT, [...IDENTITY, ...args], { cwd, env, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed (${result.status}): ${result.stderr}`);
  return result.stdout.trim();
}

// A repository holding `files`, all committed on `branch`, with `.gitignore`
// (`node_modules/`) and `.nvmrc` (`26`) unless given.
export function makeRepo(files: Record<string, string>, options: { branch?: string; env?: NodeJS.ProcessEnv } = {}): Repo {
  const env = options.env ?? testEnv();
  const root = makeProject({ '.gitignore': 'node_modules/\n', '.nvmrc': '26\n', ...files });
  const git = (args: string[]) => runGit(root, env, args);
  git(['init', '-q', '-b', options.branch ?? '001-local-verify']);
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'sample']);
  return { root, sha: git(['rev-parse', 'HEAD']), env, git };
}

// Gives `repo` an `origin` of the real repository's URL, rewritten to a bare
// repository in another temporary directory. `pushed` pushes the current
// branch; `reachable: false` rewrites the URL to a path that doesn't exist.
export function withOrigin(repo: Repo, { reachable = true, pushed = true }: { reachable?: boolean; pushed?: boolean } = {}): { bare: string; remoteHead: (branch: string) => string | null } {
  const dir = tempDir('local-verify-origin-');
  const bare = path.join(dir, 'CV.git');
  runGit(dir, repo.env, ['init', '-q', '--bare', bare]);
  const target = reachable ? bare : path.join(dir, 'missing.git');
  repo.git(['remote', 'add', 'origin', ORIGIN_URL]);
  repo.git(['config', `url.${pathToFileURL(target).href}.insteadOf`, ORIGIN_URL]);
  if (pushed && reachable) repo.git(['push', '-q', 'origin', 'HEAD']);
  return {
    bare,
    remoteHead: (branch) => {
      const result = spawnSync(GIT, ['--git-dir', bare, 'rev-parse', '-q', '--verify', `refs/heads/${branch}`], { env: repo.env, encoding: 'utf8' });
      return result.status === 0 ? result.stdout.trim() : null;
    },
  };
}

export type NpmBehavior = {
  exitCode?: number;
  // A path, relative to the repository, the fake writes as it runs, leaving
  // an untracked file behind.
  leaveFile?: string;
  // For `npm test`: the Vitest JSON report it writes. `files` defaults to
  // every test file of the repository, as the traceability check lists them.
  report?: { files?: string[]; success?: boolean; passed?: number; failed?: number; skipped?: number };
};

export type FakeOptions = {
  env?: NodeJS.ProcessEnv;
  // `null` leaves `gh` out of `bin/`.
  gh?: { exitCode?: number; stderr?: string } | null;
  // By script name: `typecheck`, `traceability`, `content-check`,
  // `token-check`, `test` or `site-check`. A script not given exits 0.
  npm?: Record<string, NpmBehavior>;
};

export type LogEntry = { command: 'gh' | 'npm'; args: string[]; cwd: string; remoteHead?: string | null };

// The fakes' behavior, run by node from the `#!/bin/sh` wrappers below. Each
// call appends one JSON line to the log.
const FAKE_SCRIPT = `
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { listFiles } from ${JSON.stringify(path.resolve(import.meta.dirname, '../../../traceability/src/files.ts'))};

const [command, ...args] = process.argv.slice(2);
const dir = import.meta.dirname;
const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'));
const cwd = process.cwd();
const log = (entry) => fs.appendFileSync(path.join(dir, 'log.jsonl'), JSON.stringify({ command, args, cwd, ...entry }) + '\\n');

if (command === 'gh') {
  if (args[0] === '--version') {
    process.stdout.write('gh version 0.0.0 (fake)\\n');
  } else {
    const branch = spawnSync(config.git, ['symbolic-ref', '--short', '-q', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
    const remote = spawnSync(config.git, ['ls-remote', 'origin', 'refs/heads/' + branch], { encoding: 'utf8' });
    log({ remoteHead: remote.status === 0 ? (remote.stdout.split('\\t')[0] || null) : null });
    process.stderr.write(config.gh.stderr ?? '');
    process.exitCode = config.gh.exitCode ?? 0;
  }
} else {
  log({});
  const script = args[0] === 'test' ? 'test' : args.slice(1).find((arg) => !arg.startsWith('-'));
  const behavior = config.npm[script] ?? {};
  process.stdout.write('fake npm ' + args.join(' ') + '\\n');
  if (behavior.leaveFile) fs.writeFileSync(path.join(cwd, behavior.leaveFile), 'left behind\\n');
  const output = args.find((arg) => arg.startsWith('--outputFile.json='));
  if (output !== undefined) {
    const report = behavior.report ?? {};
    const files = report.files ?? listFiles(cwd).testFiles;
    const passed = report.passed ?? files.length * 2;
    const failed = report.failed ?? 0;
    const skipped = report.skipped ?? 0;
    fs.writeFileSync(output.slice('--outputFile.json='.length), JSON.stringify({
      success: report.success ?? true,
      numTotalTests: passed + failed + skipped,
      numPassedTests: passed,
      numFailedTests: failed,
      numPendingTests: skipped,
      testResults: files.map((file) => ({ name: path.join(cwd, file), status: 'passed' })),
    }));
  }
  process.exitCode = behavior.exitCode ?? 0;
}
`;

// A temporary `bin/` holding fake `gh` and `npm` and a link to the real git.
// The returned env's PATH is that directory alone, so no real `gh` or `npm`
// can be found.
export function fakeBin(options: FakeOptions = {}): { bin: string; env: NodeJS.ProcessEnv; log: () => LogEntry[] } {
  const bin = path.join(tempDir('local-verify-bin-'), 'bin');
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'config.json'), JSON.stringify({ git: GIT, gh: options.gh ?? {}, npm: options.npm ?? {} }));
  fs.writeFileSync(path.join(bin, 'fake.mjs'), FAKE_SCRIPT);
  const commands = options.gh === null ? ['npm'] : ['gh', 'npm'];
  for (const command of commands) {
    fs.writeFileSync(path.join(bin, command), `#!/bin/sh\nexec ${JSON.stringify(process.execPath)} ${JSON.stringify(path.join(bin, 'fake.mjs'))} ${command} "$@"\n`, { mode: 0o755 });
  }
  fs.symlinkSync(GIT, path.join(bin, 'git'));
  const logFile = path.join(bin, 'log.jsonl');
  return {
    bin,
    env: { ...(options.env ?? testEnv()), PATH: bin },
    log: () => (fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []),
  };
}
