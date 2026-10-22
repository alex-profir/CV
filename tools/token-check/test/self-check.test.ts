// The check on the repository's own token package: as it is, and in copies
// changed the way the owner changes it.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { EXPORT_FILE, MOTION_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE } from '../src/paths.ts';
import { REPO_ROOT, makeProject, runCli, runGenerate } from './helpers/tokens.ts';

const TIMEOUT = { timeout: 60_000 };

// Every file under `root`, by its path relative to it.
function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  for (const entry of fs.readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.relative(root, path.join(entry.parentPath, entry.name)).split(path.sep).join('/');
    files.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
  }
  return files;
}

// A sample holding a copy of the real packages/tokens, and its files before
// any change.
function copyOfTokens(): { root: string; before: Map<string, string> } {
  const root = makeProject({});
  fs.cpSync(path.join(REPO_ROOT, 'packages/tokens'), path.join(root, 'packages/tokens'), { recursive: true });
  return { root, before: snapshot(root) };
}

// Changes a source in the copy and writes it back in Penpot's form, with no
// final newline.
function change(root: string, file: string, edit: (value: Record<string, any>) => void) {
  const value = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  edit(value);
  fs.writeFileSync(path.join(root, file), JSON.stringify(value, null, 2));
}

function changedFiles(root: string, before: Map<string, string>): string[] {
  const after = snapshot(root);
  return [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file)).sort();
}

const problemLines = (stdout: string) => stdout.slice(0, Math.max(stdout.indexOf('\n\nSummary'), 0)).split('\n').filter((line) => line !== '');

describe('003-design-tokens-FR-002: a new export needs only the export and a regenerated output', () => {
  test('a changed color is stale until token-output runs, then passes with only three files changed', TIMEOUT, () => {
    const { root, before } = copyOfTokens();
    change(root, EXPORT_FILE, (value) => (value.base.color.base.ink.$value = '#2a2723'));
    const stale = runCli(root);
    expect(stale.status).toBe(1);
    expect(problemLines(stale.stdout).map((line) => line.split(' ').slice(1, 3).join(' '))).toEqual([
      `stale-output ${OUTPUT_CSS_FILE}:`,
      `stale-output ${OUTPUT_TS_FILE}:`,
    ]);
    expect(runGenerate(root).status).toBe(0);
    expect(runCli(root).status).toBe(0);
    expect(fs.readFileSync(path.join(root, OUTPUT_CSS_FILE), 'utf8')).toContain('  --token-color-base-ink: #2a2723;\n');
    expect(changedFiles(root, before)).toEqual([EXPORT_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE].sort());
  });
});

describe('003-design-tokens-FR-005: the committed output matches the sources', () => {
  test('the repository output is current', () => {
    const report = runCheck(REPO_ROOT);
    expect(report.output).toBe('current');
    expect(report.problems.filter((problem) => problem.type === 'stale-output')).toEqual([]);
  });
});

describe('003-design-tokens-FR-050: a motion value changes with one edit and a regenerated output', () => {
  test('a faster duration passes with only three files changed', TIMEOUT, () => {
    const { root, before } = copyOfTokens();
    change(root, MOTION_FILE, (value) => (value.motion.motion.duration.fast.$value = '200ms'));
    expect(runGenerate(root).status).toBe(0);
    expect(runCli(root).status).toBe(0);
    expect(fs.readFileSync(path.join(root, OUTPUT_CSS_FILE), 'utf8')).toContain('  --token-motion-duration-fast: 200ms;\n');
    expect(changedFiles(root, before)).toEqual([MOTION_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE].sort());
  });
});

describe('the repository passes its own check (SC-008)', () => {
  test('no problems, both sources checked, output current, and the starter themes active', () => {
    const report = runCheck(REPO_ROOT);
    expect(report.problems).toEqual([]);
    expect(report.result).toBe('pass');
    expect(report.sources.map((source) => source.state)).toEqual(['checked', 'checked']);
    expect(report.output).toBe('current');
    expect(report.activeThemes).toBe('mode/light + motion/standard');
  });
});

describe('a changed spacing needs only the export and a regenerated output (SC-003)', () => {
  test('a changed spacing passes after token-output with only three files changed', TIMEOUT, () => {
    const { root, before } = copyOfTokens();
    change(root, EXPORT_FILE, (value) => (value.base.space['4'].$value = '20'));
    expect(runGenerate(root).status).toBe(0);
    expect(runCli(root).status).toBe(0);
    expect(fs.readFileSync(path.join(root, OUTPUT_CSS_FILE), 'utf8')).toContain('  --token-space-4: 20px;\n');
    expect(changedFiles(root, before)).toEqual([EXPORT_FILE, OUTPUT_CSS_FILE, OUTPUT_TS_FILE].sort());
  });
});
