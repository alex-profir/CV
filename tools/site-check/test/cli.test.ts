// The command, its exit codes, its streams and its isolation
// (contracts/cli.md).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, onTestFinished, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { nodeVersionProblem } from '../src/main.js';
import { PARTS } from '../src/report.ts';
import { REPO_ROOT, fixture, makeProject, maskScores, runCli, siteProject } from './helpers/sites.ts';

const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

const WORKFLOW = fs.readFileSync(path.join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');

const SOURCE_DIR = path.join(REPO_ROOT, 'tools/site-check/src');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : /\.(?:ts|js)$/.test(entry.name) ? [full] : [];
  });
}

// A listener on 127.0.0.1:9, the port every browser's proxy points at
// (research R17). Null where the port can't be opened, as on Linux without
// privileges: then nothing can connect to it either.
async function listenOnPort9(): Promise<{ connections: () => number; close: () => Promise<void> } | null> {
  let connections = 0;
  const server = net.createServer((socket) => {
    connections += 1;
    socket.destroy();
  });
  const opened = await new Promise<boolean>((resolve) => {
    server.once('error', () => resolve(false));
    server.listen(9, '127.0.0.1', () => resolve(true));
  });
  if (!opened) return null;
  return { connections: () => connections, close: () => new Promise((resolve) => server.close(() => resolve())) };
}

describe('004-cv-page-FR-049: one local command runs the checks, with the same result as the pull-request run', () => {
  test('the site-check script builds then runs the check, and CI runs the same script', () => {
    expect(PACKAGE.scripts['site-check']).toBe('npm run build && node tools/site-check/src/main.js');
    expect(WORKFLOW).toMatch(/^\s*(?:-\s+)?run: .*\bnpm run --silent site-check\b/m);
  });

  test('two runs on minimal/ give the same exit code and the same report once Lighthouse scores are masked', () => {
    const first = runCli(fixture('minimal'));
    const second = runCli(fixture('minimal'));
    expect(first.stderr).toBe('');
    expect(first.status).toBe(second.status);
    expect(maskScores(first.stdout)).toBe(maskScores(second.stdout));
    expect(maskScores(first.stdout)).toContain('/cv mobile:  performance <n>,');
  }, 300_000);
});

describe('004-cv-page-FR-057: the checks need no network beyond the machine', () => {
  test('requests to another site, by name or by IP address, are reported and never connect', async () => {
    const listener = await listenOnPort9();
    onTestFinished(() => listener?.close());
    const ip = await runCheck(fixture('ip-request'), { parts: ['other-sites'] });
    const other = await runCheck(fixture('other-sites'), { parts: ['other-sites'] });
    const subjects = [...ip.problems, ...other.problems].map((problem) => problem.subject);
    expect(subjects).toContain('http://203.0.113.10/x.js');
    expect(subjects).toContain('https://example.com/x.css');
    expect(subjects).toContain('https://www.googletagmanager.com/gtag/js?id=G-X');
    if (listener !== null) expect(listener.connections()).toBe(0);
  }, 120_000);

  test('every browser is launched by browser.ts, and Lighthouse gets the isolation flags', () => {
    const files = sourceFiles(SOURCE_DIR);
    const launching = files.filter((file) => /chromium\s*\.\s*launch\s*\(/.test(fs.readFileSync(file, 'utf8')));
    expect(launching.map((file) => path.relative(SOURCE_DIR, file))).toEqual(['browser.ts']);
    const launcherUsers = files.filter((file) => /from 'chrome-launcher'/.test(fs.readFileSync(file, 'utf8')));
    expect(launcherUsers.map((file) => path.relative(SOURCE_DIR, file))).toEqual(['parts/lighthouse.ts']);
    const lighthouse = fs.readFileSync(path.join(SOURCE_DIR, 'parts/lighthouse.ts'), 'utf8');
    expect(lighthouse).toMatch(/chromeLauncher\.launch\(\{[^}]*chromeFlags: \[\.\.\.ISOLATION_ARGS, '--headless=new', '--no-sandbox'\]/);
  });
});

describe('004-cv-page-FR-058: every part runs even when another fails, and the run ends in a summary', () => {
  test('when several parts fail and some crash, every part still has a result', async () => {
    const root = siteProject({ 'packages/content/resume.json': '{ not json' }, 'no-link-name');
    const parts = ['content', 'accessibility', 'no-script', 'keyboard'] as const;
    const report = await runCheck(root, { parts });
    expect(new Set(report.results.map((result) => result.part))).toEqual(new Set(parts));
    const content = report.results.find((result) => result.part === 'content')!;
    expect(content.status).toBe('error');
    expect(content.problems).toEqual([expect.objectContaining({ type: 'error', subject: 'content', detail: expect.stringMatching(/^the part crashed: /) })]);
    expect(report.results.filter((result) => result.part === 'no-script').map((result) => result.status)).toEqual(['error', 'error']);
    expect(report.results.filter((result) => result.part === 'accessibility').some((result) => result.status === 'fail')).toBe(true);
    expect(report.results.filter((result) => result.part === 'keyboard')).toHaveLength(4);
    expect(report.result).toBe('fail');
  }, 120_000);

  test('exit codes: 0 on minimal/, 1 on no-link-name/, with every part in the summary', () => {
    const passing = runCli(fixture('minimal'));
    expect(passing.status).toBe(0);
    expect(passing.stdout.startsWith('Site check: PASSED\n')).toBe(true);
    const failing = runCli(fixture('no-link-name'));
    expect(failing.status).toBe(1);
    expect(failing.stdout).toContain('accessibility /cv 375px axe:link-name footer > a: Links must have discernible text\n');
    expect(failing.stdout).toContain('\nSite check: FAILED\n');
    for (const output of [passing.stdout, failing.stdout]) for (const part of PARTS) expect(output).toMatch(new RegExp(`^  ${part} +(?:pass|fail|error)`, 'm'));
  }, 300_000);
});

describe('004-cv-page-FR-058: the check exits 2 with one stderr line when it cannot start', () => {
  test('an argument is a usage error', () => {
    const result = runCli(fixture('minimal'), ['--fast']);
    expect(result).toEqual({ status: 2, stdout: '', stderr: 'usage: npm run site-check (takes no arguments)\n' });
  });

  test('Node older than 26 gets its own message', () => {
    expect(nodeVersionProblem('24.21.0')).toBe('site check needs Node 26 or later (see .nvmrc), but this is Node 24.21.0');
    expect(nodeVersionProblem('26.0.0')).toBeNull();
  });

  test('missing Chromium says how to install it', () => {
    const empty = makeProject({ 'browsers/': '' });
    const result = runCli(fixture('minimal'), [], { PLAYWRIGHT_BROWSERS_PATH: path.join(empty, 'browsers') });
    expect(result).toEqual({ status: 2, stdout: '', stderr: 'site check needs Chromium: run npx playwright install chromium\n' });
  });

  test('a missing build cannot start', () => {
    const root = makeProject({ 'packages/content/resume.json': '{}' });
    const result = runCli(root);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^site check could not start: .+\n$/);
    expect(result.stderr.split('\n')).toHaveLength(2);
  });

  test('in a copy of the repository with a broken render.tsx, npm run site-check exits 2', () => {
    const copy = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'site-check-repo-')));
    onTestFinished(() => fs.rmSync(copy, { recursive: true, force: true }));
    const skip = new Set(['node_modules', 'dist', '.git', '__fixtures__', 'specs', '.specify', '.github']);
    fs.cpSync(REPO_ROOT, copy, { recursive: true, filter: (source) => !skip.has(path.basename(source)) });
    fs.symlinkSync(path.join(REPO_ROOT, 'node_modules'), path.join(copy, 'node_modules'));
    fs.appendFileSync(path.join(copy, 'packages/web/src/render.tsx'), '\nexport const broken = <;\n');
    const result = spawnSync('npm', ['run', '--silent', 'site-check'], { cwd: copy, encoding: 'utf8' });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/^site build failed: /m);
    expect(result.stdout).toBe('');
  }, 120_000);
});

// The seeded sample, `__fixtures__/seeded/` (research R21): one site with at
// least one problem in every part. Each seeded case, and the lines it gives:
// - content: `basics.phone` in resume.json -> `unsupported-field
//   basics.phone`; two `certificates` entries -> `unsupported-section
//   certificates`.
// - accessibility: `.summary` is `#a8a8a0` on `#f4f4ef` on screen ->
//   `axe:color-contrast .summary` on /cv at 320, 375 and 1440 px; the
//   not-found page's footer link holds only a hidden SVG -> `axe:link-name
//   footer > a` on /missing-page at the same widths.
// - lighthouse: /cv loads `assets/big.js`, a 2 MB classic script in the
//   head -> `low-score performance` on mobile and desktop; the GitHub link's
//   `tabindex="1"` fails Lighthouse's `tabindex` audit, so `low-score
//   agentic-browsing` on both profiles too. Scores are masked as `<n>`.
// - no-script: `assets/enhance.js` inserts the projects section and moves
//   the education section after the skills section, so with scripting off
//   -> `missing-field projects[0].name` and `out-of-order
//   education[0].institution` at 320 and 1440 px.
// - offline: sw.js answers `/` with a network error -> `no-redirect /`; it
//   doesn't store the not-found page -> `not-available /missing-page`.
// - keyboard: `tabindex="1"` on the GitHub link -> `out-of-order` for it and
//   for the email link; `.contact a:focus-visible` has a transparent outline
//   -> `no-focus-indicator` for the email link; `div.cover` lies over the
//   footer -> `covered` for the footer link (each on /cv at 375 and
//   1440 px); "Go to the CV" has `tabindex="-1"` -> `not-reached a[href="/cv"]`
//   on /missing-page at 375 and 1440 px.
// - other-sites: /cv loads `https://www.googletagmanager.com/gtag/js?id=G-X`
//   -> `other-site-request` at 375 and 1440 px.
// - fonts: the not-found page's hint holds `ș` (U+0219), outside every
//   served subset -> `missing-glyph U+0219 ș` on /missing-page at 375 and
//   1440 px. The worker doesn't store that page, so the offline part never
//   draws it, and no line names a fallback font, which differs by system.
// - layout: `div.wide` is 340 px wide -> `horizontal-scroll document` at
//   320px and 400%-zoom; the role line is 24 px tall with `overflow: hidden`
//   -> `clipped p.role` with text spacing (30 px lines).
// - print: `#section-skills` breaks the page after it -> `heading-at-page-end
//   h2 "Skills"`; the GitHub link's address isn't printed -> `missing-address`;
//   the footer is printed -> `site-element-printed footer` (each on A4 and
//   Letter).
// - modes: `hr.rule` is drawn with a background and no border ->
//   `invisible-separator hr.rule` in forced colors; `.date` has a 200 ms
//   transition -> `motion p.date` at 375 px, 1440 px and with reduced motion.
// The offline part's `missing-font` isn't seeded: its detail names the
// system's fallback font, which differs between macOS and Linux.
describe('seeded sample (SC-009)', () => {
  test('the check on seeded/ exits 1 and its report, scores masked, is expected-report.txt byte for byte', () => {
    const root = fixture('seeded');
    const expected = fs.readFileSync(path.join(root, 'expected-report.txt'), 'utf8');
    const result = runCli(root);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(1);
    expect(maskScores(result.stdout)).toBe(expected);
  }, 300_000);
});
