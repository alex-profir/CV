// The repository's own checks pass over the site as it is, with no exception
// added for it (spec US6 scenarios 3 and 4, SC-010).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { searchFiles } from '../../../tools/content-check/src/facts.ts';
import { RESUME_FILE } from '../../../tools/content-check/src/paths.ts';
import { runCli as runContentCheck } from '../../../tools/content-check/test/helpers/cli.ts';
import { runCheck as runTokenCheckReport } from '../../../tools/token-check/src/check.ts';
import { EXPORT_FILE, MOTION_FILE } from '../../../tools/token-check/src/paths.ts';
import { siteFiles } from '../../../tools/token-check/src/site-files.ts';
import { runCli as runTokenCheck } from '../../../tools/token-check/test/helpers/tokens.ts';
import { parseSpec, requirementsOf } from '../../../tools/traceability/src/specs.ts';
import { runCli as runTraceability } from '../../../tools/traceability/test/helpers/project.ts';
import { REPO_ROOT } from './helpers/copy.ts';

vi.setConfig({ testTimeout: 120_000 });

// The site's files outside its tests: what both checks must read.
function siteSource(dir = 'packages/web'): string[] {
  return fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return ['test', 'dist', 'node_modules'].includes(entry.name) ? [] : siteSource(file);
    return [file];
  });
}

// The checks' own sources, where an exception for the site would be written.
const CHECK_SOURCES = ['tools/content-check/src', 'tools/token-check/src'].flatMap((dir) =>
  fs.readdirSync(path.join(REPO_ROOT, dir)).map((name) => fs.readFileSync(path.join(REPO_ROOT, dir, name), 'utf8')),
);

describe('004-cv-page-FR-003: the content check passes over the site with no exception added for it', () => {
  test('npm run content-check exits 0', () => {
    const result = runContentCheck(REPO_ROOT);
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  test("the check searches every file of the site's source, and none of its exclusions names packages/web", () => {
    const searched = new Set(searchFiles(REPO_ROOT, [RESUME_FILE]).files.map((file) => file.file));
    // README and license notices are skipped by name everywhere (002), not
    // for the site.
    const source = siteSource().filter((file) => !/^(?:README|LICENSE|LICENCE|COPYING)(?:\..*)?$/i.test(path.basename(file)));
    expect(source.length).toBeGreaterThan(20);
    expect(source.filter((file) => !searched.has(file))).toEqual([]);
    for (const text of CHECK_SOURCES) expect(text).not.toMatch(/packages\/web/);
  });
});

describe('004-cv-page-FR-043: the token check accepts the export as Penpot writes it', () => {
  test("npm run token-check exits 0, with the export checked and in Penpot's written form", () => {
    const result = runTokenCheck(REPO_ROOT);
    expect(result.status).toBe(0);
    const report = runTokenCheckReport(REPO_ROOT);
    expect(report.sources.map((source) => [source.file, source.state])).toEqual([
      [EXPORT_FILE, 'checked'],
      [MOTION_FILE, 'checked'],
    ]);
    expect(report.problems).toEqual([]);
    const text = fs.readFileSync(path.join(REPO_ROOT, EXPORT_FILE), 'utf8');
    expect(text).toBe(JSON.stringify(JSON.parse(text), null, 2));
  });
});

describe("004-cv-page-FR-044: the token check passes over the site's styles and components with no exception", () => {
  test("npm run token-check exits 0, reads every style sheet and component of the site, and none of its exclusions names packages/web", () => {
    const result = runTokenCheck(REPO_ROOT);
    expect(result.stdout).toContain('PASS: both token sources are valid and no literal design values were found.');
    expect(result.status).toBe(0);
    const read = new Set(siteFiles(REPO_ROOT).files.map((file) => file.file));
    const styled = siteSource().filter((file) => /\.(?:css|tsx?)$/.test(file));
    expect(styled.length).toBeGreaterThan(20);
    expect(styled.filter((file) => !read.has(file))).toEqual([]);
    for (const text of CHECK_SOURCES) expect(text).not.toMatch(/packages\/web/);
  });
});

describe('004-cv-page-FR-047: the requirement traceability check passes', () => {
  test('npm run traceability exits 0', () => {
    const result = runTraceability(REPO_ROOT);
    expect(result.stdout.trim().split('\n').at(-1)).toMatch(/^PASS: /);
    expect(result.status).toBe(0);
  });
});

// Comments and markers that ask a check, or a linter, to skip something.
const TERMINAL_SKIP_MARKERS = [
  /\b(?:token|content)[-_ ]?check\b[^\n]*\b(?:ignore|disable|enable|skip|off|allow|exempt)/i,
  /\b(?:ignore|disable|skip)[-_ ]?(?:token|content)[-_ ]?check\b/i,
  /\b(?:stylelint|eslint|prettier)-(?:disable|ignore)/i,
  /\btraceability\b[^\n]*\b(?:ignore|skip|exempt)/i,
];

describe('006-terminal-FR-010, 006-terminal-FR-031 and 006-terminal-FR-037: the checks pass over the Terminal with no exception for it', () => {
  test('content-check, token-check and traceability exit 0 on the repository', () => {
    const content = runContentCheck(REPO_ROOT);
    expect(content.stderr).toBe('');
    expect(content.status).toBe(0);
    const tokens = runTokenCheck(REPO_ROOT);
    expect(tokens.stdout).toContain('PASS: both token sources are valid and no literal design values were found.');
    expect(tokens.status).toBe(0);
    const traceability = runTraceability(REPO_ROOT);
    expect(traceability.stdout.trim().split('\n').at(-1)).toMatch(/^PASS: /);
    expect(traceability.status).toBe(0);
  });

  test("the checks read every file of the Terminal, no check's source names it, and no file of it holds a skip marker", () => {
    const terminal = siteSource('packages/web/src/apps/terminal');
    expect(terminal.length).toBeGreaterThan(15);
    const searched = new Set(searchFiles(REPO_ROOT, [RESUME_FILE]).files.map((file) => file.file));
    expect(terminal.filter((file) => !searched.has(file))).toEqual([]);
    const read = new Set(siteFiles(REPO_ROOT).files.map((file) => file.file));
    expect(terminal.filter((file) => /\.(?:css|tsx?)$/.test(file) && !read.has(file))).toEqual([]);
    const traceabilitySources = fs.readdirSync(path.join(REPO_ROOT, 'tools/traceability/src')).map((name) => fs.readFileSync(path.join(REPO_ROOT, 'tools/traceability/src', name), 'utf8'));
    for (const text of [...CHECK_SOURCES, ...traceabilitySources]) expect(text).not.toMatch(/apps\/terminal|006-terminal/);
    for (const file of [...terminal, 'packages/web/src/site-text.ts', 'packages/web/src/os/metrics.ts']) {
      const text = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      for (const marker of TERMINAL_SKIP_MARKERS) expect(text, file).not.toMatch(marker);
    }
  });
});

describe('007-requirement-inspector-FR-009, 007-requirement-inspector-FR-021 and 007-requirement-inspector-FR-029: the checks pass over the inspector with no exception for it', () => {
  test('content-check, token-check and traceability exit 0 on the repository, traceability counting 007 among the approved specs', () => {
    const content = runContentCheck(REPO_ROOT);
    expect(content.stderr).toBe('');
    expect(content.status).toBe(0);
    const tokens = runTokenCheck(REPO_ROOT);
    expect(tokens.stdout).toContain('PASS: both token sources are valid and no literal design values were found.');
    expect(tokens.status).toBe(0);
    // 007's spec is approved with its 34 active requirements, so the PASS
    // line counts them.
    const file = 'specs/007-requirement-inspector/spec.md';
    const spec = parseSpec('007-requirement-inspector', file, fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
    expect(spec.status).toBe('Approved');
    expect(requirementsOf(spec).filter((requirement) => requirement.state === 'active')).toHaveLength(34);
    const traceability = runTraceability(REPO_ROOT);
    const pass = traceability.stdout.trim().split('\n').at(-1)!.match(/^PASS: all (\d+) active requirements in \d+ approved specs are covered\.$/);
    expect(Number(pass?.[1])).toBeGreaterThanOrEqual(34);
    expect(traceability.status).toBe(0);
  });

  test("the checks read every file of the inspector and its data, no check's source names them, and none holds a skip marker", () => {
    const inspector = [...siteSource('packages/web/src/inspector'), ...siteSource('packages/web/scripts/requirements')];
    expect(inspector.length).toBeGreaterThan(15);
    const searched = new Set(searchFiles(REPO_ROOT, [RESUME_FILE]).files.map((file) => file.file));
    expect(inspector.filter((file) => !searched.has(file))).toEqual([]);
    const read = new Set(siteFiles(REPO_ROOT).files.map((file) => file.file));
    expect(inspector.filter((file) => file.startsWith('packages/web/src/') && /\.(?:css|tsx?)$/.test(file) && !read.has(file))).toEqual([]);
    const traceabilitySources = fs.readdirSync(path.join(REPO_ROOT, 'tools/traceability/src')).map((name) => fs.readFileSync(path.join(REPO_ROOT, 'tools/traceability/src', name), 'utf8'));
    for (const text of [...CHECK_SOURCES, ...traceabilitySources]) expect(text).not.toMatch(/src\/inspector|007-requirement-inspector/);
    for (const file of [...inspector, 'packages/web/src/site-text.ts']) {
      const text = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      for (const marker of TERMINAL_SKIP_MARKERS) expect(text, file).not.toMatch(marker);
    }
  });
});

describe('008-typescript-playground-FR-068: the token check passes over the Playground and its editor with no exception for them', () => {
  test("npm run token-check exits 0, reads every style sheet and component of the Playground, engine/editor.css included, names none of them, and none holds a skip marker", () => {
    const tokens = runTokenCheck(REPO_ROOT);
    expect(tokens.stdout).toContain('PASS: both token sources are valid and no literal design values were found.');
    expect(tokens.status).toBe(0);
    const playground = siteSource('packages/web/src/apps/playground');
    const styled = playground.filter((file) => /\.(?:css|tsx?)$/.test(file));
    expect(styled).toContain('packages/web/src/apps/playground/engine/editor.css');
    expect(styled).toContain('packages/web/src/apps/playground/playground.css');
    const read = new Set(siteFiles(REPO_ROOT).files.map((file) => file.file));
    expect(styled.filter((file) => !read.has(file))).toEqual([]);
    const tokenSources = fs.readdirSync(path.join(REPO_ROOT, 'tools/token-check/src')).map((name) => fs.readFileSync(path.join(REPO_ROOT, 'tools/token-check/src', name), 'utf8'));
    for (const text of tokenSources) expect(text).not.toMatch(/apps\/playground|editor\.css|008-typescript-playground/);
    for (const file of playground) {
      const text = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      for (const marker of TERMINAL_SKIP_MARKERS) expect(text, file).not.toMatch(marker);
    }
  });
});
