import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { EXPORT_FILE, MOTION_FILE } from '../src/paths.ts';
import { REPO_ROOT, SAMPLE_EXPORT, SAMPLE_MOTION, makeProject, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

const TWO_THEMES = path.join(REPO_ROOT, 'tools/token-check/test/__fixtures__/two-themes');

const read = (file: string) => JSON.parse(fs.readFileSync(path.join(TWO_THEMES, file), 'utf8'));

function theme(id: string, group: string, name: string, sets: string[]) {
  return { id, name, group, description: '', isSource: false, selectedTokenSets: Object.fromEntries(sets.map((set) => [set, 'enabled'])) };
}

// The line and column `shift` code units into the first `needle` after
// `after`, in `file`.
function at(file: string, text: string, needle: string, options: { after?: string; shift?: number } = {}) {
  const offset = text.indexOf(needle, options.after === undefined ? 0 : text.indexOf(options.after));
  if (offset === -1) throw new Error(`${needle} not found`);
  const before = text.slice(0, offset + (options.shift ?? 0)).split('\n');
  return { file, line: before.length, column: before.at(-1)!.length + 1 };
}

// Where a theme object starts: the brace before its id.
function themeAt(file: string, text: string, id: string) {
  const offset = text.lastIndexOf('{', text.indexOf(id));
  const before = text.slice(0, offset).split('\n');
  return { file, line: before.length, column: before.at(-1)!.length + 1 };
}

function sample(change: (penpot: Record<string, any>) => void): Record<string, any> {
  const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
  change(penpot);
  return penpot;
}

// A copy of the two-themes fixture, with its sources changed.
function twoThemes(change: { penpot?: (penpot: Record<string, any>) => void; motion?: (motion: Record<string, any>) => void } = {}): string {
  const penpot = read(EXPORT_FILE);
  const motion = read(MOTION_FILE);
  change.penpot?.(penpot);
  change.motion?.(motion);
  const root = makeProject({});
  fs.cpSync(TWO_THEMES, root, { recursive: true });
  fs.writeFileSync(path.join(root, EXPORT_FILE), JSON.stringify(penpot, null, 2));
  fs.writeFileSync(path.join(root, MOTION_FILE), JSON.stringify(motion, null, 2));
  return root;
}

const problems = (root: string) => runCheck(root).problems.map(({ type, subject, location, detail }) => ({ type, subject, location, detail }));

describe('003-design-tokens-FR-004: every theme has a group and sets, and the export has a theme', () => {
  test('a theme that enables no set is reported once', () => {
    const id = '00000000-0000-4000-8000-0000000000a1';
    const penpot = sample((value) => value.$themes.push(theme(id, 'mode', 'hc', [])));
    const text = JSON.stringify(penpot, null, 2);
    expect(problems(tokenProject({ penpot }))).toEqual([
      { type: 'theme-without-sets', subject: 'theme "mode/hc"', location: themeAt(EXPORT_FILE, text, id), detail: 'enables no set' },
    ]);
  });

  test('a theme without a group is reported once', () => {
    const id = '00000000-0000-4000-8000-0000000000a2';
    const penpot = sample((value) => value.$themes.push(theme(id, '', 'print', ['base'])));
    const text = JSON.stringify(penpot, null, 2);
    expect(problems(tokenProject({ penpot }))).toEqual([
      { type: 'theme-without-group', subject: 'theme "/print"', location: themeAt(EXPORT_FILE, text, id), detail: 'has no theme group' },
    ]);
  });

  test('an export with no theme is reported at $themes', () => {
    const penpot = { $themes: [], $metadata: { tokenSetOrder: [], activeThemes: [], activeSets: [] } };
    const text = JSON.stringify(penpot, null, 2);
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'theme-without-sets',
        subject: '$themes',
        location: at(EXPORT_FILE, text, '"$themes": [', { shift: 11 }),
        detail: 'the export has no theme; at least one theme with at least one set is needed',
      },
    ]);
  });
});

describe('003-design-tokens-FR-011: a theme enabling a set the export does not contain is reported', () => {
  test('brand-dark is a missing set', () => {
    const penpot = sample((value) => (value.$themes[0].selectedTokenSets['brand-dark'] = 'enabled'));
    const text = JSON.stringify(penpot, null, 2);
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'missing-set',
        subject: 'theme "mode/light"',
        location: themeAt(EXPORT_FILE, text, SAMPLE_EXPORT.$themes[0]!.id),
        detail: `enables set "brand-dark", which the export doesn't contain`,
      },
    ]);
  });
});

describe('003-design-tokens-FR-012: a set no theme enables is reported', () => {
  test('drafts is an unused set', () => {
    const penpot = sample((value) => {
      value.drafts = { space: { 9: token('36', 'spacing') } };
      value.$metadata.tokenSetOrder.push('drafts');
    });
    const text = JSON.stringify(penpot, null, 2);
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'unused-set',
        subject: 'set "drafts"',
        location: at(EXPORT_FILE, text, '"drafts": {'),
        detail: 'no theme enables it, so code can never read its tokens',
      },
    ]);
  });
});

describe('003-design-tokens-FR-018: an empty set is accepted', () => {
  test('an enabled set holding nothing gives no problem', () => {
    const penpot = sample((value) => {
      value.empty = {};
      value.$metadata.tokenSetOrder.push('empty');
      value.$metadata.activeSets.push('empty');
      value.$themes[0].selectedTokenSets.empty = 'enabled';
    });
    expect(problems(tokenProject({ penpot }))).toEqual([]);
  });
});

describe('003-design-tokens-FR-023: every combination of themes has the same names and types', () => {
  test('mode and shell themes with the same names pass', () => {
    expect(problems(twoThemes())).toEqual([]);
  });

  test('a name missing from one theme is reported with the combinations', () => {
    const root = twoThemes({ penpot: (penpot) => delete penpot['mode/dark'].color });
    const text = JSON.stringify(read(EXPORT_FILE), null, 2);
    expect(problems(root)).toEqual([
      {
        type: 'theme-mismatch',
        subject: 'color.text.primary',
        location: at(EXPORT_FILE, text, '"$value"', { after: '"mode/light"', shift: 10 }),
        detail: 'missing in mode/dark + motion/standard + shell/desktop, mode/dark + motion/standard + shell/mobile',
      },
    ]);
  });

  test('a name whose type differs names both types', () => {
    const root = twoThemes({
      penpot: (penpot) => {
        penpot['mode/light'].color.surface = token('{color.base.paper}', 'color');
        penpot['mode/dark'].color.surface = token('2', 'number');
      },
    });
    const found = runCheck(root).problems.filter((problem) => problem.type === 'theme-mismatch');
    expect(found.map(({ subject, detail }) => ({ subject, detail }))).toEqual([
      {
        subject: 'color.surface',
        detail:
          'is a color in mode/light + motion/standard + shell/desktop, mode/light + motion/standard + shell/mobile and a number in mode/dark + motion/standard + shell/desktop, mode/dark + motion/standard + shell/mobile',
      },
    ]);
  });

  test('themes without sets or a group take no part', () => {
    const root = twoThemes({
      penpot: (penpot) => {
        penpot.$themes.push(theme('00000000-0000-4000-8000-0000000000b1', 'mode', 'hc', []));
        penpot.$themes.push(theme('00000000-0000-4000-8000-0000000000b2', '', 'print', ['base']));
        penpot.$metadata.activeThemes.push('/print');
      },
    });
    expect(problems(root).map(({ type, subject }) => ({ type, subject }))).toEqual([
      { type: 'theme-without-sets', subject: 'theme "mode/hc"' },
      { type: 'theme-without-group', subject: 'theme "/print"' },
    ]);
  });
});

describe('003-design-tokens-FR-054: every theme group has exactly one active theme', () => {
  const activeAt = (root: string) => {
    const text = fs.readFileSync(path.join(root, EXPORT_FILE), 'utf8');
    return at(EXPORT_FILE, text, '"activeThemes": [', { shift: 16 });
  };

  test('two active themes in one group are reported', () => {
    const root = twoThemes({ penpot: (penpot) => penpot.$metadata.activeThemes.push('mode/dark') });
    const report = runCheck(root);
    expect(problems(root)).toEqual([
      {
        type: 'invalid-active-themes',
        subject: 'group "mode"',
        location: activeAt(root),
        detail: 'needs exactly one active theme, found 2: mode/dark, mode/light',
      },
    ]);
    expect(report.activeThemes).toBeNull();
  });

  test('no active theme in a group is reported', () => {
    const root = twoThemes({ penpot: (penpot) => (penpot.$metadata.activeThemes = ['shell/desktop']) });
    expect(problems(root)).toEqual([
      { type: 'invalid-active-themes', subject: 'group "mode"', location: activeAt(root), detail: 'needs exactly one active theme, found 0' },
    ]);
    expect(runCheck(root).activeThemes).toBeNull();
  });

  test('an active theme that does not exist is reported', () => {
    const root = twoThemes({ penpot: (penpot) => penpot.$metadata.activeThemes.push('mode/sepia') });
    expect(problems(root)).toEqual([
      { type: 'invalid-active-themes', subject: 'group "mode"', location: activeAt(root), detail: 'activeThemes lists "mode/sepia", which is not a theme' },
    ]);
    expect(runCheck(root).activeThemes).toBeNull();
  });

  test('a group whose active theme differs between the sources is reported', () => {
    const root = twoThemes({
      motion: (motion) => {
        motion.$themes = [theme('00000000-0000-4000-8000-0000000000c1', 'mode', 'light', ['motion']), theme('00000000-0000-4000-8000-0000000000c2', 'mode', 'dark', ['motion'])];
        motion.$metadata.activeThemes = ['mode/dark'];
      },
    });
    const text = fs.readFileSync(path.join(root, MOTION_FILE), 'utf8');
    expect(problems(root)).toEqual([
      {
        type: 'invalid-active-themes',
        subject: 'group "mode"',
        location: at(MOTION_FILE, text, '"activeThemes": [', { shift: 16 }),
        detail: 'the active theme is mode/light in the export and mode/dark in the motion token source',
      },
    ]);
    expect(runCheck(root).activeThemes).toBeNull();
  });
});

describe('003-design-tokens-FR-048: themes span both sources', () => {
  const motionIn = (themes: object[], extra: Record<string, unknown> = {}) => {
    const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
    motion.$themes = themes;
    Object.assign(motion, extra);
    return motion;
  };

  test('a theme with the same group and name in both sources is one theme', () => {
    const motion = motionIn([theme('00000000-0000-4000-8000-0000000000d1', 'mode', 'light', ['motion'])]);
    motion.$metadata.activeThemes = ['mode/light'];
    const root = tokenProject({ motion });
    expect(problems(root)).toEqual([]);
    expect(runCheck(root).activeThemes).toBe('mode/light');
  });

  test('a theme only the export has leaves every motion token missing there', () => {
    const penpot = sample((value) => {
      value.dark = { color: { text: { primary: token('{color.base.paper}', 'color') } } };
      value.$metadata.tokenSetOrder.push('dark');
      value.$themes.push(theme('00000000-0000-4000-8000-0000000000d2', 'mode', 'dark', ['base', 'dark']));
    });
    const motion = motionIn([theme('00000000-0000-4000-8000-0000000000d1', 'mode', 'light', ['motion'])]);
    motion.$metadata.activeThemes = ['mode/light'];
    const found = problems(tokenProject({ penpot, motion }));
    expect(found.map(({ type, subject, detail }) => ({ type, subject, detail }))).toEqual([
      { type: 'theme-mismatch', subject: 'motion.duration.fast', detail: 'missing in mode/dark' },
      { type: 'theme-mismatch', subject: 'motion.easing.standard', detail: 'missing in mode/dark' },
    ]);
  });

  test('a motion group multiplies the combinations', () => {
    const motion = motionIn(
      [theme('00000000-0000-4000-8000-000000000002', 'motion', 'standard', ['motion']), theme('00000000-0000-4000-8000-0000000000d3', 'motion', 'reduced', ['reduced'])],
      { reduced: { motion: { easing: { standard: token([0, 0, 1, 1], 'cubicBezier') } } } },
    );
    motion.$metadata.tokenSetOrder = ['motion', 'reduced'];
    const found = problems(tokenProject({ motion }));
    expect(found.map(({ type, subject, detail }) => ({ type, subject, detail }))).toEqual([
      { type: 'theme-mismatch', subject: 'motion.duration.fast', detail: 'missing in mode/light + motion/reduced' },
    ]);
  });
});
