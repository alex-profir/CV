import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { EXPORT_FILE, MOTION_FILE } from '../src/paths.ts';
import { SAMPLE_EXPORT, SAMPLE_MOTION, runCli, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

const BROKEN_EXPORT = JSON.stringify(SAMPLE_EXPORT, null, 2).replace('"$type": "color",', '"$type": "color"');

function motionWithUnusedSet() {
  const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
  motion.drafts = {};
  motion.$metadata.tokenSetOrder.push('drafts');
  return motion;
}

describe('003-design-tokens-FR-034: every problem is reported in one run', () => {
  test('problems of many types are all reported', () => {
    const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
    penpot.base.flag = token(true, 'boolean');
    penpot.base.space.lg = token('1.5rem', 'spacing');
    Object.assign(penpot.base.space, { a: token('{space.b}', 'spacing'), b: token('{space.a}', 'spacing') });
    penpot.light.color.text.secondary = token('{color.base.inc}', 'color');
    penpot.light.color['text.primary'] = token('{color.base.paper}', 'color');
    penpot.drafts = {};
    penpot.$metadata.tokenSetOrder.push('drafts');
    penpot.$themes[0].selectedTokenSets['brand-dark'] = 'enabled';
    penpot.$themes.push({ id: '00000000-0000-4000-8000-0000000000f1', name: 'print', group: '', description: '', isSource: false, selectedTokenSets: { base: 'enabled' } });
    const types = new Set(runCheck(tokenProject({ penpot })).problems.map((problem) => problem.type));
    for (const type of ['unsupported-content', 'invalid-value', 'missing-reference', 'reference-loop', 'missing-set', 'unused-set', 'theme-without-group', 'duplicate-token']) {
      expect(types, type).toContain(type);
    }
  });

  test('an export that cannot be read does not stop the motion rules', () => {
    const report = runCheck(tokenProject({ penpot: BROKEN_EXPORT, motion: motionWithUnusedSet() }));
    expect(report.problems.map(({ type, location }) => `${type} ${location.file}`)).toEqual([`unused-set ${MOTION_FILE}`, `unreadable-file ${EXPORT_FILE}`]);
    expect(report.checksNotRun).toEqual(['export rules', 'cross-source rules', 'derived output', 'token names in site files']);
  });

  test('an export that cannot be read does not stop the literal values search', () => {
    const report = runCheck(tokenProject({ penpot: BROKEN_EXPORT, files: { 'packages/web/src/a.css': '.a {\n  padding: 12px;\n}\n' } }));
    expect(report.problems.filter((problem) => problem.type === 'literal-value').map(({ subject, location, detail }) => ({ subject, location, detail }))).toEqual([
      { subject: 'length', location: { file: 'packages/web/src/a.css', line: 2, column: 12 }, detail: '"12px" is written out; use a token' },
    ]);
  });
});

describe('003-design-tokens-FR-038: a missing source is reported, and any problem fails the check', () => {
  test.each([
    ['export', { penpot: null }, EXPORT_FILE],
    ['motion token source', { motion: null }, MOTION_FILE],
  ] as const)('a missing %s is a missing file', (_name, options, file) => {
    const report = runCheck(tokenProject(options));
    expect(report.problems).toContainEqual({ type: 'missing-file', subject: file, location: { file, line: 1, column: 1 }, detail: 'file not found' });
    expect(report.result).toBe('fail');
  });

  test('any problem fails the check, and none passes it', () => {
    expect(runCheck(tokenProject({ motion: motionWithUnusedSet() })).result).toBe('fail');
    expect(runCheck(tokenProject()).result).toBe('pass');
  });

  test('the command exits 1 when it fails and 0 when it passes', () => {
    expect(runCli(tokenProject({ penpot: null })).status).toBe(1);
    expect(runCli(tokenProject({ motion: motionWithUnusedSet() })).status).toBe(1);
    expect(runCli(tokenProject()).status).toBe(0);
  });
});
