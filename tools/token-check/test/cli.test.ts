import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { nodeVersionProblem } from '../../traceability/src/node-version.js';
import { REPO_ROOT, makeProject, runCli, tokenProject } from './helpers/tokens.ts';

const PACKAGE = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'));

// npm's own CLI script. Vitest started without npm has no npm_execpath, so
// fall back to the npm bundled beside this Node.
const NPM_CLI = process.env.npm_execpath ?? path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js');

describe('003-design-tokens-FR-040: one local command gives the same report as a direct run', () => {
  test('npm run token-check and the CLI print the same report with the same exit code', { timeout: 30_000 }, () => {
    const viaNpm = spawnSync(process.execPath, [NPM_CLI, 'run', '--silent', 'token-check'], { cwd: REPO_ROOT, encoding: 'utf8' });
    const direct = runCli(REPO_ROOT);
    expect(direct.stdout).toMatch(/(^|\n)Summary\n/);
    expect(viaNpm.stdout).toBe(direct.stdout);
    expect(viaNpm.status).toBe(direct.status);
  });

  test('the script is exactly the documented command', () => {
    expect(PACKAGE.scripts['token-check']).toBe('node --permission --allow-fs-read=. --allow-addons tools/token-check/src/main.js');
  });

  test('any argument is a usage error', () => {
    const result = runCli(tokenProject(), ['--fix']);
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    // Node's own warning about --allow-addons may come first, as in 001.
    expect(result.stderr.endsWith('usage: npm run token-check (takes no arguments)\n')).toBe(true);
  });

  test('stdout holds only the report', () => {
    const result = runCli(tokenProject());
    expect(result.status).toBe(0);
    expect(result.stdout.startsWith('Summary\n')).toBe(true);
    expect(result.stdout.endsWith('\nPASS: both token sources are valid and no literal design values were found.\n')).toBe(true);
  });
});

describe('003-design-tokens-FR-041: the check makes no network requests', () => {
  test('the check passes on a sample with no network grant', () => {
    const result = runCli(tokenProject());
    expect(result.status).toBe(0);
  });

  // Port 2 because fetch refuses ports on its bad-ports list, such as 9, before
  // the permission model is consulted. Loopback means a broken guard never
  // reaches the internet: it fails with ECONNREFUSED instead.
  test('a network call under the same grants is refused', () => {
    const dir = makeProject({
      'control.js': "fetch('http://127.0.0.1:2/').then(() => console.log('connected'), (e) => console.log(e.code ?? e.cause?.code));\n",
    });
    const control = spawnSync(process.execPath, ['--permission', `--allow-fs-read=${dir}`, '--allow-addons', path.join(dir, 'control.js')], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(control.stdout.trim()).toBe('ERR_ACCESS_DENIED');
  });

  test('Node versions whose permission model cannot block the network are refused', () => {
    expect(nodeVersionProblem('24.21.0', 'token check')).toBe(
      'token check needs Node 26 or later (see .nvmrc) to block network access, but this is Node 24.21.0',
    );
  });

  test('the check source names no network address', () => {
    const dir = path.join(REPO_ROOT, 'tools/token-check/src');
    for (const file of fs.readdirSync(dir)) {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      for (const word of ['http:', 'https:', 'penpot.app']) expect(text.includes(word), `${file} holds ${word}`).toBe(false);
    }
  });
});

// The seeded samples, each with the report the check must print (SC-001).
// Across the five, every problem type appears.
//
// seeded/, both sources readable:
// - export: `color.muted` refers to a spacing (invalid-value), `space.lg` is
//   1.5rem (invalid-value), `space.big` refers to a missing name inside
//   arithmetic (missing-reference), `color.link` refers to `color.accent`,
//   which only `mode/light` defines (missing-reference in the dark
//   combinations, and theme-mismatch for `color.accent`), `space.a` and
//   `space.b` form a loop that `space.c` depends on (one reference-loop),
//   `color.brand` has `$extensions`, `font.size.small` is a dotted key and
//   `anim.fast` is a duration (unsupported-content), `radius.small` is
//   written twice (duplicate-token), `size.gap` is a spacing in `base` and a
//   number in `brand` (conflicting-types), `color.` and `color.tëxt`
//   (unusable-name), `space.1-5` with `space.1.5`, and `motion.Duration.fast`
//   with the motion source's `motion.duration.fast` (name-collision),
//   `color.primary` with `color.primary.light` (token-used-as-group),
//   `drafts` (unused-set), `mode/hc` (theme-without-sets), `/print`
//   (theme-without-group), `density/regular` enabling `brand-dark`
//   (missing-set), and both `mode` themes active, no `density` theme active,
//   and `contrast` active as `normal` in the export and `high` in the motion
//   source (invalid-active-themes). `mode/hc` and `/print` cause nothing
//   else. Passing: the empty set `empty`, every transparent color form, a
//   non-ASCII description, references in `typography.body` and
//   `shadow.raised`, and `color.surface` in `base` and `brand`.
// - motion source: `color.flash` (wrong-source), `-50ms`, `[1.5, 0, 0, 1]`
//   and `[0, 0, 1]` (invalid-value), `motion.duration.gap` referring to
//   `space.4` and the export's `space.anim` referring to
//   `motion.duration.fast` (cross-source-reference), and
//   `motion.duration.slow` in both sources (duplicate-token).
// - card.css: `--token-color-text-primray` (unknown-token),
//   `--token-card-gap` (local-in-token-namespace), and literal values: 12px,
//   the fallback #ffffff, a shadow, a font family, 200ms, ease-out,
//   rebeccapurple, CanvasText, `stroke-width: 2`, 8px after a skip comment,
//   and the 768px breakpoint. Passing: a comment, the local variable
//   `--card-gap`, a color token as padding, 50%, 100vh, `1fr 2fr`, a
//   line-height of 1.5 and Highlight in forced colors.
// - card.tsx: Canvas and `padding: 12` inline, the `<svg>` width 24 and an
//   icon fill. Passing: viewBox, d, and the image's width and height.
// - broken.css (unreadable-file: Unclosed block) and app.scss (unreadable-file:
//   no reader). Not searched: public/icon.svg, specs/, docs/, the test file,
//   __fixtures__/, tools/ and the generated file, all holding #1a1a1a.
//
// seeded-broken/: an export with a syntax error (unreadable-file), no motion
// source (missing-file), and 12px in a.css (literal-value).
// seeded-missing/: no export (missing-file), and a motion source with a
// syntax error (unreadable-file).
// seeded-no-theme/: an export with no theme (theme-without-sets at $themes).
// seeded-stale/: valid sources, a generated CSS file with one value changed
// and no generated TS file (two stale-output).
const SEEDED = ['seeded', 'seeded-broken', 'seeded-missing', 'seeded-no-theme', 'seeded-stale'];

const sampleDir = (name: string) => path.join(REPO_ROOT, 'tools/token-check/test/__fixtures__', name);

const expected = (name: string) => fs.readFileSync(path.join(sampleDir(name), 'expected-report.txt'), 'utf8');

describe('seeded samples (SC-001)', () => {
  test.each(SEEDED)('%s prints its expected report and fails', { timeout: 30_000 }, (name) => {
    const result = runCli(sampleDir(name));
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(expected(name));
  });

  test('every problem type appears in at least one sample', () => {
    const counts = new Map<string, number>();
    for (const name of SEEDED) {
      for (const [, type, count] of expected(name).matchAll(/^ {4}([a-z-]+) +(\d+)$/gm)) counts.set(type!, (counts.get(type!) ?? 0) + Number(count));
    }
    expect(counts.size).toBe(23);
    expect([...counts].filter(([, count]) => count === 0)).toEqual([]);
  });

  test('third-party code and version-control data are not searched', { timeout: 30_000 }, () => {
    const root = makeProject({ 'node_modules/x/a.css': '.a {\n  color: #1a1a1a;\n}\n', '.git/x.css': '.a {\n  color: #1a1a1a;\n}\n' });
    fs.cpSync(sampleDir('seeded'), root, { recursive: true });
    expect(runCli(root).stdout).toBe(expected('seeded'));
  });
});
