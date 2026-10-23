// Helpers for the site check's tests (004 research R21). Fixture sites are
// laid out as a repository: `packages/web/dist/site-manifest.json`,
// `packages/web/dist/site/…` and `packages/content/resume.json`.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished } from 'vitest';
import { siteManifest } from '../../../../packages/web/scripts/build-site.ts';
import type { SiteManifest } from '../../../../packages/web/src/routes.ts';
import type { Report } from '../../src/report.ts';
import { REPO_ROOT, makeProject } from '../../../traceability/test/helpers/project.ts';

export { REPO_ROOT, makeProject };

export const MAIN_PATH = path.join(REPO_ROOT, 'tools/site-check/src/main.js');

const FIXTURES = path.join(REPO_ROOT, 'tools/site-check/test/__fixtures__');

const SITE = 'packages/web/dist/site';

const MANIFEST = 'packages/web/dist/site-manifest.json';

// Runs the check's entry point, as `npm run site-check` does after the build.
export function runCli(cwd: string, args: string[] = [], env: Record<string, string> = {}): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [MAIN_PATH, ...args], { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

// The absolute path of a committed fixture site.
export function fixture(name: string): string {
  const root = path.join(FIXTURES, name);
  if (!fs.existsSync(path.join(root, MANIFEST))) throw new Error(`no fixture site ${name}`);
  return root;
}

// A temporary copy of a committed fixture site (`minimal` by default) with
// `files` written over it, by path from the copy's root. The site manifest is
// recomputed for the copy, keeping the routes, unless `files` writes it.
// Removed when the test finishes.
export function siteProject(files: Record<string, string | Buffer>, from = 'minimal'): string {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'site-check-')));
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.cpSync(fixture(from), root, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  if (!(MANIFEST in files)) {
    const routes = (JSON.parse(fs.readFileSync(path.join(root, MANIFEST), 'utf8')) as SiteManifest).routes;
    const manifest = { ...siteManifest(path.join(root, SITE)), routes };
    fs.writeFileSync(path.join(root, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  }
  return root;
}

const SCORE_LINE = /^(.*?\/\S* (?:mobile|desktop):\s+)(.*)$/;

// The report with every Lighthouse score replaced by `<n>` (contracts/cli.md
// Determinism): a report object's scores, or a rendered report's summary
// lines and `low-score` problem lines.
export function maskScores(report: Report): Report;
export function maskScores(report: string): string;
export function maskScores(report: Report | string): Report | string {
  if (typeof report === 'string') {
    return report
      .split('\n')
      .map((line) => {
        const summary = SCORE_LINE.exec(line);
        if (summary !== null) return `${summary[1]}${summary[2]!.replace(/\b\d+\b/g, '<n>')}`;
        if (line.startsWith('lighthouse ') && line.includes(' low-score ')) return line.replace(/: .*$/, ': <n> (runs <n>, <n>, <n>); needs 90');
        return line;
      })
      .join('\n');
  }
  const masked = structuredClone(report);
  for (const result of masked.results) {
    if (result.scores === undefined) continue;
    for (const score of Object.values(result.scores)) {
      (score as { median: number | string }).median = '<n>';
      score.runs = score.runs.map(() => '<n>' as unknown as number);
    }
    for (const problem of result.problems) if (problem.type === 'low-score') problem.detail = '<n>';
  }
  for (const problem of masked.problems) if (problem.type === 'low-score') problem.detail = '<n>';
  return masked;
}
