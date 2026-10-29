// A temporary copy of the repository's packages and root files, for tests
// that change a source the way the owner does and build the copy (004
// research R21). Nothing is written inside the repository: the copy, its
// `node_modules` links and every build of it live in temporary directories,
// removed when the test finishes.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';
import { REPO_ROOT, makeProject } from '../../../../tools/traceability/test/helpers/project.ts';
import type { SiteManifest } from '../../src/routes.ts';

export { REPO_ROOT };

// The root files the workspace is made of.
const ROOT_FILES = ['package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', '.nvmrc'];

// Outside `packages/`, the build reads only 001's shared sort and spec
// reader, 002's date form, and each spec, for the Terminal's spec list (006
// research R10).
const TOOL_PATHS = ['tools/traceability/src', 'tools/content-check/src/dates.ts'];

// What a copy leaves out: dependencies (linked instead) and build output.
const SKIPPED_DIRS = new Set(['node_modules', 'dist']);

const BUILD_SCRIPT = 'packages/web/scripts/build-site.ts';

// The ignore file a copy's repository gets: the copy's links and its builds
// never make it dirty.
const GITIGNORE = 'node_modules/\ndist/\n';

// Git, run in a copy with a fixed identity and date and none of the user's
// configuration, so every copy's commit is made the same way (007 research
// R8).
const GIT_ENV = {
  GIT_CONFIG_GLOBAL: os.devNull,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Test Copy',
  GIT_AUTHOR_EMAIL: 'copy@example.invalid',
  GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z',
  GIT_COMMITTER_NAME: 'Test Copy',
  GIT_COMMITTER_EMAIL: 'copy@example.invalid',
  GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z',
};

export function git(root: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...GIT_ENV } });
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed in a copy (exit ${result.status}):\n${result.stderr}`);
  return result.stdout;
}

// Commits every change in a copy, so it builds clean.
export function commitAll(root: string, message = 'A test copy'): void {
  git(root, ['add', '-A']);
  git(root, ['commit', '--quiet', '--allow-empty', '--no-verify', '-m', message]);
}

// Makes a copy dirty, as an untracked file does (007 FR-010).
export function dirty(root: string): void {
  fs.writeFileSync(path.join(root, 'untracked-note.txt'), 'Not committed.\n');
}

// A copy of `packages/`, the root files, the tools the build reads, every
// spec and the tools' tests, which the requirement data reads (007 research
// R8). Its `node_modules` links every dependency to the repository's, except
// the workspace packages, which link to the copy's own, so a build of the
// copy reads the copy's CV, tokens and fonts. The copy is a Git repository
// with one commit of its files, so it builds clean; a test that edits it
// commits again with `commitAll`, or leaves it dirty. Call it inside a test.
export function repoCopy(): string {
  const root = makeProject({});
  const filter = (source: string) => !SKIPPED_DIRS.has(path.basename(source));
  fs.cpSync(path.join(REPO_ROOT, 'packages'), path.join(root, 'packages'), { recursive: true, filter });
  for (const file of ROOT_FILES) fs.copyFileSync(path.join(REPO_ROOT, file), path.join(root, file));
  for (const tool of TOOL_PATHS) fs.cpSync(path.join(REPO_ROOT, tool), path.join(root, tool), { recursive: true });
  for (const tool of fs.readdirSync(path.join(REPO_ROOT, 'tools'))) {
    const tests = path.join(REPO_ROOT, 'tools', tool, 'test');
    if (fs.existsSync(tests)) fs.cpSync(tests, path.join(root, 'tools', tool, 'test'), { recursive: true, filter });
  }
  for (const folder of fs.readdirSync(path.join(REPO_ROOT, 'specs'))) {
    const spec = path.join(REPO_ROOT, 'specs', folder, 'spec.md');
    if (!fs.existsSync(spec)) continue;
    fs.mkdirSync(path.join(root, 'specs', folder), { recursive: true });
    fs.copyFileSync(spec, path.join(root, 'specs', folder, 'spec.md'));
  }
  fs.writeFileSync(path.join(root, '.gitignore'), GITIGNORE);
  git(root, ['init', '--quiet', '--initial-branch=main']);
  commitAll(root);

  const modules = path.join(root, 'node_modules');
  fs.mkdirSync(path.join(modules, '@cv'), { recursive: true });
  for (const name of fs.readdirSync(path.join(REPO_ROOT, 'node_modules'))) {
    if (name === '@cv' || name.startsWith('.')) continue;
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules', name), path.join(modules, name));
  }
  for (const name of fs.readdirSync(path.join(root, 'packages'))) {
    fs.symlinkSync(path.join(root, 'packages', name), path.join(modules, '@cv', name));
  }
  return root;
}

// Every file of a copy, by its path relative to the copy, with its bytes as
// hex. `node_modules` and the copy's `.git` are left out.
export function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = dir === '' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') visit(file);
      else if (entry.isFile()) files.set(file, fs.readFileSync(path.join(root, file)).toString('hex'));
    }
  };
  visit('');
  return files;
}

// The files that differ between two snapshots, sorted.
export function changedFiles(before: Map<string, string>, after: Map<string, string>): string[] {
  return [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file)).sort();
}

// Reads a JSON file of the copy, changes it and writes it back as it was
// written: Penpot's form (no final newline) or with one, as the file had.
export function editJson(root: string, file: string, edit: (value: Record<string, any>) => void): void {
  const target = path.join(root, file);
  const text = fs.readFileSync(target, 'utf8');
  const value = JSON.parse(text);
  edit(value);
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}${text.endsWith('\n') ? '\n' : ''}`);
}

export type CopyBuild = { status: number | null; stderr: string; out: string; site: { dir: string; manifest: SiteManifest } | null };

// Runs the copy's `npm run build` script into a temporary directory outside
// the copy, removed when the test finishes.
export function buildCopy(root: string): CopyBuild {
  const out = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cv-copy-site-')));
  onTestFinished(() => fs.rmSync(out, { recursive: true, force: true }));
  const result = spawnSync(process.execPath, [path.join(root, BUILD_SCRIPT), '--out', out], { cwd: root, encoding: 'utf8' });
  const site =
    result.status === 0 ? { dir: path.join(out, 'site'), manifest: JSON.parse(fs.readFileSync(path.join(out, 'site-manifest.json'), 'utf8')) as SiteManifest } : null;
  return { status: result.status, stderr: result.stderr, out, site };
}
