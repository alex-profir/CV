import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { EXPORT_FILE, MOTION_FILE } from '../src/paths.ts';
import { PROBLEM_TYPES, renderReport, sortProblems } from '../src/report.ts';
import type { Problem, Report } from '../src/report.ts';
import { REPO_ROOT, SAMPLE_EXPORT, SAMPLE_MOTION, makeProject, runCli, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

const ZEROS = PROBLEM_TYPES.map((type) => `    ${type.padEnd(28)}0`);

// A report as contracts/cli.md shows it, with the parts each test changes.
function report(overrides: Partial<Report> = {}): Report {
  return {
    problems: [],
    sources: [
      { label: 'Token export', file: EXPORT_FILE, state: 'checked', sets: 2, themes: 1, tokens: 24 },
      { label: 'Motion token source', file: MOTION_FILE, state: 'checked', sets: 1, themes: 1, tokens: 4 },
    ],
    activeThemes: 'mode/light + motion/standard',
    output: 'current',
    filesSearched: 2,
    filesWithoutStyles: 5,
    checksNotRun: [],
    result: 'pass',
    ...overrides,
  };
}

const problem = (file: string, line: number, column: number, type: Problem['type'], subject: string): Problem => ({
  type,
  subject,
  location: { file, line, column },
  detail: 'something is wrong',
});

describe('003-design-tokens-FR-035: every problem states its file, position, subject and what is wrong', () => {
  test('every problem line has file, line, column, type, subject and detail', () => {
    const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
    penpot.base.flag = token(true, 'boolean');
    penpot.light.color.text.secondary = token('{color.base.inc}', 'color');
    const rendered = renderReport(runCheck(tokenProject({ penpot })));
    const lines = rendered.slice(0, rendered.indexOf('\n\nSummary')).split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) expect(line).toMatch(/^[^\s:]+:\d+:\d+ [a-z-]+ .+: .+$/);
  });

  test('a problem that applies to one combination names it', () => {
    const fixture = path.join(REPO_ROOT, 'tools/token-check/test/__fixtures__/two-themes');
    const penpot = JSON.parse(fs.readFileSync(path.join(fixture, EXPORT_FILE), 'utf8'));
    penpot['mode/dark'].color.text.primary.$value = '{color.base.night}';
    const root = makeProject({ [EXPORT_FILE]: JSON.stringify(penpot, null, 2), [MOTION_FILE]: fs.readFileSync(path.join(fixture, MOTION_FILE), 'utf8') });
    const missing = runCheck(root).problems.filter((found) => found.type === 'missing-reference');
    expect(missing.map(({ detail }) => detail)).toEqual([
      'refers to "color.base.night", which no enabled set defines in mode/dark + shell/desktop, mode/dark + shell/mobile',
    ]);
  });

  test('a syntax error gives the line and column where reading failed', () => {
    const text = JSON.stringify(SAMPLE_EXPORT, null, 2).replace('"$type": "color",', '"$type": "color"');
    const offset = text.indexOf('"$description"');
    const before = text.slice(0, offset).split('\n');
    const found = runCheck(tokenProject({ penpot: text })).problems.filter((found) => found.type === 'unreadable-file');
    expect(found).toEqual([
      {
        type: 'unreadable-file',
        subject: EXPORT_FILE,
        location: { file: EXPORT_FILE, line: before.length, column: before.at(-1)!.length + 1 },
        detail: 'invalid JSON: comma expected',
      },
    ]);
  });
});

describe('003-design-tokens-FR-036: every run ends with the summary', () => {
  test('a passing run renders exactly as the contract shows', () => {
    expect(renderReport(report())).toBe(
      [
        'Summary',
        '  Token export:                 packages/tokens/penpot/tokens.json (checked): 2 sets, 1 theme, 24 tokens',
        '  Motion token source:          packages/tokens/motion/tokens.json (checked): 1 set, 1 theme, 4 tokens',
        '  Active themes:                mode/light + motion/standard',
        '  Derived output:               current',
        '  Site files searched:          2',
        '  Site files without styles:    5',
        '  Checks not run:               none',
        '  Problems:                     0',
        ...ZEROS,
        '',
        'PASS: both token sources are valid and no literal design values were found.',
        '',
      ].join('\n'),
    );
  });

  test('a run where the export cannot be read renders exactly as the contract shows', () => {
    const unreadable = problem(EXPORT_FILE, 14, 7, 'unreadable-file', EXPORT_FILE);
    unreadable.detail = 'invalid JSON: comma expected';
    const rendered = renderReport(
      report({
        problems: [unreadable],
        sources: [
          { label: 'Token export', file: EXPORT_FILE, state: 'unreadable', sets: 0, themes: 0, tokens: 0 },
          { label: 'Motion token source', file: MOTION_FILE, state: 'checked', sets: 1, themes: 1, tokens: 4 },
        ],
        activeThemes: null,
        output: 'not checked',
        checksNotRun: ['export rules', 'cross-source rules', 'derived output', 'token names in site files'],
        result: 'fail',
      }),
    );
    expect(rendered).toBe(
      [
        'packages/tokens/penpot/tokens.json:14:7 unreadable-file packages/tokens/penpot/tokens.json: invalid JSON: comma expected',
        '',
        'Summary',
        '  Token export:                 packages/tokens/penpot/tokens.json (unreadable)',
        '  Motion token source:          packages/tokens/motion/tokens.json (checked): 1 set, 1 theme, 4 tokens',
        '  Active themes:                not known',
        '  Derived output:               not checked',
        '  Site files searched:          2',
        '  Site files without styles:    5',
        '  Checks not run:               export rules, cross-source rules, derived output, token names in site files',
        '  Problems:                     1',
        '    unreadable-file             1',
        ...ZEROS.slice(1),
        '',
        'FAIL: 1 problem found. Some checks could not run.',
        '',
      ].join('\n'),
    );
  });

  test('counts are plural except for one', () => {
    const rendered = renderReport(
      report({
        sources: [
          { label: 'Token export', file: EXPORT_FILE, state: 'checked', sets: 1, themes: 2, tokens: 1 },
          { label: 'Motion token source', file: MOTION_FILE, state: 'missing', sets: 0, themes: 0, tokens: 0 },
        ],
      }),
    );
    expect(rendered).toContain('  Token export:                 packages/tokens/penpot/tokens.json (checked): 1 set, 2 themes, 1 token\n');
    expect(rendered).toContain('  Motion token source:          packages/tokens/motion/tokens.json (missing)\n');
  });

  test('derived output and checks not run are shown as given, in part order', () => {
    const rendered = renderReport(report({ output: 'stale', checksNotRun: ['derived output'] }));
    expect(rendered).toContain('  Derived output:               stale\n');
    expect(rendered).toContain('  Checks not run:               derived output\n');
  });

  test('every type is counted, zeros included, in type order', () => {
    const problems = [problem('a.css', 1, 1, 'literal-value', 'color'), problem('a.css', 2, 1, 'literal-value', 'length'), problem('b.css', 1, 1, 'unknown-token', '--token-x')];
    const lines = renderReport(report({ problems, result: 'fail' })).split('\n');
    const counts = lines.filter((line) => /^ {4}[a-z-]+ +\d+$/.test(line));
    expect(counts.map((line) => line.trim().split(/ +/)[0])).toEqual([...PROBLEM_TYPES]);
    expect(counts.at(-1)).toBe(`    ${'literal-value'.padEnd(28)}2`);
    expect(counts.at(-3)).toBe(`    ${'unknown-token'.padEnd(28)}1`);
    expect(lines.at(-2)).toBe('FAIL: 3 problems found.');
  });

  test('a failing run where some part did not run says so', () => {
    const rendered = renderReport(report({ problems: [problem('a.css', 1, 1, 'literal-value', 'color')], checksNotRun: ['derived output'], result: 'fail' }));
    expect(rendered.endsWith('\nFAIL: 1 problem found. Some checks could not run.\n')).toBe(true);
  });

  test('problem lines come first, then one empty line, then the summary, ending with one newline', () => {
    const rendered = renderReport(report({ problems: [problem('a.css', 1, 1, 'literal-value', 'color')], result: 'fail' }));
    expect(rendered.startsWith('a.css:1:1 literal-value color: something is wrong\n\nSummary\n')).toBe(true);
    expect(renderReport(report()).startsWith('Summary\n')).toBe(true);
    expect(rendered.endsWith('found.\n')).toBe(true);
    expect(rendered.endsWith('\n\n')).toBe(false);
  });
});

describe('003-design-tokens-FR-037: the same files give the same report', () => {
  test('problems sort by file, line, column, type and subject, whatever the input order', () => {
    const sorted = [
      problem('Z.json', 1, 1, 'missing-file', 'Z.json'),
      problem('a.json', 1, 1, 'unsupported-content', 'b'),
      problem('a.json', 1, 1, 'invalid-value', 'a'),
      problem('a.json', 1, 1, 'invalid-value', 'b'),
      problem('a.json', 1, 2, 'unreadable-file', 'a'),
      problem('a.json', 2, 1, 'unreadable-file', 'a'),
    ];
    // `unsupported-content` comes before `invalid-value` in type order.
    expect(sortProblems([...sorted].reverse()).map(({ type, subject, location }) => `${location.file}:${location.line}:${location.column} ${type} ${subject}`)).toEqual([
      'Z.json:1:1 missing-file Z.json',
      'a.json:1:1 unsupported-content b',
      'a.json:1:1 invalid-value a',
      'a.json:1:1 invalid-value b',
      'a.json:1:2 unreadable-file a',
      'a.json:2:1 unreadable-file a',
    ]);
    for (let round = 0; round < 5; round += 1) {
      const shuffled = [...sorted].sort(() => Math.random() - 0.5);
      expect(sortProblems(shuffled)).toEqual(sortProblems(sorted));
    }
  });

  test('two runs over the same files render the same report', () => {
    const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
    penpot.base.flag = token(true, 'boolean');
    const root = tokenProject({ penpot });
    expect(renderReport(runCheck(root))).toBe(renderReport(runCheck(root)));
  });

  test('the order of activeThemes and selectedTokenSets keys does not change the report', () => {
    const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
    motion.drafts = {};
    motion.$metadata.tokenSetOrder.push('drafts');
    const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
    penpot.$metadata.activeThemes = ['mode/light'];
    const reordered = structuredClone(penpot);
    reordered.$themes[0].selectedTokenSets = { light: 'enabled', base: 'enabled' };
    reordered.$metadata.activeSets = ['light', 'base'];
    expect(renderReport(runCheck(tokenProject({ penpot: reordered, motion })))).toBe(renderReport(runCheck(tokenProject({ penpot, motion }))));
  });

  test('the locale does not change the report', { timeout: 30_000 }, () => {
    const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
    penpot.base.Icon = { x: token('1', 'number') };
    penpot.base.icon = { y: token('{missing}', 'number') };
    penpot.base.I = token(true, 'boolean');
    const root = tokenProject({ penpot });
    const turkish = runCli(root, [], { ...process.env, LC_ALL: 'tr_TR.UTF-8' });
    const plain = runCli(root, [], { ...process.env, LC_ALL: 'C' });
    expect(turkish.stdout).toMatch(/Summary/);
    expect(turkish.stdout).toBe(plain.stdout);
  });
});
