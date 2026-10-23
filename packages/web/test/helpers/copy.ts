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

// Outside `packages/`, the build reads only 001's shared sort.
const TOOL_DIRS = ['tools/traceability/src'];

// What a copy leaves out: dependencies (linked instead) and build output.
const SKIPPED_DIRS = new Set(['node_modules', 'dist']);

const BUILD_SCRIPT = 'packages/web/scripts/build-site.ts';

// A copy of `packages/`, the root files and the tools the build reads. Its
// `node_modules` links every dependency to the repository's, except the
// workspace packages, which link to the copy's own, so a build of the copy
// reads the copy's CV, tokens and fonts. Call it inside a test.
export function repoCopy(): string {
  const root = makeProject({});
  const filter = (source: string) => !SKIPPED_DIRS.has(path.basename(source));
  fs.cpSync(path.join(REPO_ROOT, 'packages'), path.join(root, 'packages'), { recursive: true, filter });
  for (const file of ROOT_FILES) fs.copyFileSync(path.join(REPO_ROOT, file), path.join(root, file));
  for (const dir of TOOL_DIRS) fs.cpSync(path.join(REPO_ROOT, dir), path.join(root, dir), { recursive: true });

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
// hex. `node_modules` is left out.
export function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const visit = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const file = dir === '' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory() && entry.name !== 'node_modules') visit(file);
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
