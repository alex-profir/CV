// Helpers for the site check's tests on the site root, the OS shell (005
// tasks.md Notes). A hand-written shell would have to pass every keyboard
// flow, so these tests use the real build, or a temporary copy of the
// repository with one change, built into the copy. Nothing is written inside
// the repository.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inject, onTestFinished } from 'vitest';
import { repoCopy } from '../../../../packages/web/test/helpers/copy.ts';
import { REPO_ROOT } from './sites.ts';

const DIST = 'packages/web/dist';

const RESUME = 'packages/content/resume.json';

const BUILD_SCRIPT = 'packages/web/scripts/build-site.ts';

// The real build the tests' global setup made, laid out as a repository for
// `runCheck`: the built site, its manifest and the CV document. Removed when
// the test finishes.
export function realSiteProject(): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'site-check-root-')));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(inject('siteDir'), path.join(root, DIST), { recursive: true });
  fs.mkdirSync(path.join(root, path.dirname(RESUME)), { recursive: true });
  fs.copyFileSync(path.join(REPO_ROOT, RESUME), path.join(root, RESUME));
  return root;
}

// Replaces `from` with `to` in a file of a copy, failing when `from` isn't
// there exactly once, so a change to the source shows here first.
export function replaceIn(root: string, file: string, from: string, to: string): void {
  const target = path.join(root, file);
  const text = fs.readFileSync(target, 'utf8');
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${file} holds ${JSON.stringify(from)} ${count} times, expected once`);
  fs.writeFileSync(target, text.replace(from, to));
}

// A copy of the repository changed by `edit`, built into its own
// `packages/web/dist/`, for `runCheck`. Removed when the test finishes.
export function seededCopy(edit: (root: string) => void): string {
  const root = repoCopy();
  edit(root);
  const result = spawnSync(process.execPath, [path.join(root, BUILD_SCRIPT), '--out', path.join(root, DIST)], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`the seeded copy's build failed (exit ${result.status}):\n${result.stderr}`);
  return root;
}
