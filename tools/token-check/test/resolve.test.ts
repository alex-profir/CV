import { describe, expect, test } from 'vitest';
import { checkSources, runCheck } from '../src/check.ts';
import { EXPORT_FILE, MOTION_FILE } from '../src/paths.ts';
import { SAMPLE_EXPORT, SAMPLE_MOTION, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

function theme(id: string, group: string, name: string, sets: string[]) {
  return { id, name, group, description: '', isSource: false, selectedTokenSets: Object.fromEntries(sets.map((set) => [set, 'enabled'])) };
}

// Where the value of the token whose key is `key` starts, the first such key
// after `after`.
function valueAt(file: string, source: object, key: string, after?: string) {
  const text = JSON.stringify(source, null, 2);
  const from = after === undefined ? 0 : text.indexOf(after);
  const offset = text.indexOf('"$value": ', text.indexOf(`"${key}": {`, from)) + 10;
  const before = text.slice(0, offset).split('\n');
  return { file, line: before.length, column: before.at(-1)!.length + 1 };
}

function sample(change: (penpot: Record<string, any>) => void): Record<string, any> {
  const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
  change(penpot);
  return penpot;
}

const problems = (root: string) => runCheck(root).problems.map(({ type, subject, location, detail }) => ({ type, subject, location, detail }));

const ofType = (root: string, type: string) => problems(root).filter((problem) => problem.type === type);

describe('003-design-tokens-FR-009: every reference to a missing token is reported, per combination', () => {
  test('a reference to a missing name names the file, the token, the name and the combination', () => {
    const penpot = sample((value) => delete value.base.color.base.ink);
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'missing-reference',
        subject: 'color.text.primary',
        location: valueAt(EXPORT_FILE, penpot, 'primary'),
        detail: 'refers to "color.base.ink", which no enabled set defines in mode/light',
      },
    ]);
  });

  test('a reference that fails in one theme only is reported for that theme', () => {
    const penpot = sample((value) => {
      value.base.color.link = token('{color.accent}', 'color');
      value.light.color.accent = token('#2255aa', 'color');
      value.dark = { color: { text: { primary: token('{color.base.paper}', 'color') } } };
      value.$metadata.tokenSetOrder.push('dark');
      value.$themes.push(theme('00000000-0000-4000-8000-0000000000e1', 'mode', 'dark', ['base', 'dark']));
    });
    expect(ofType(tokenProject({ penpot }), 'missing-reference')).toEqual([
      {
        type: 'missing-reference',
        subject: 'color.link',
        location: valueAt(EXPORT_FILE, penpot, 'link'),
        detail: 'refers to "color.accent", which no enabled set defines in mode/dark',
      },
    ]);
  });
});

describe('003-design-tokens-FR-010: every reference loop is reported once, in order', () => {
  test('loops are listed from their first name, and tokens depending on them get nothing', () => {
    const penpot = sample((value) => {
      Object.assign(value.base.space, {
        a: token('{space.b}', 'spacing'),
        b: token('{space.a}', 'spacing'),
        e: token('{space.c}', 'spacing'),
        c: token('{space.d}', 'spacing'),
        d: token('{space.e}', 'spacing'),
        f: token('{space.a}', 'spacing'),
      });
    });
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'reference-loop',
        subject: 'space.a',
        location: valueAt(EXPORT_FILE, penpot, 'a'),
        detail: 'references form a loop: space.a, space.b, space.a',
      },
      {
        type: 'reference-loop',
        subject: 'space.c',
        location: valueAt(EXPORT_FILE, penpot, 'c'),
        detail: 'references form a loop: space.c, space.d, space.e, space.c',
      },
    ]);
  });
});

describe('003-design-tokens-FR-015: references are resolved in composite values and arithmetic', () => {
  const penpot = sample((value) => {
    value.base.shadow = { raised: token([{ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '{color.base.ink}' }], 'shadow') };
    Object.assign(value.base.space, { 8: token('{space.4} * 2', 'spacing'), third: token('roundTo({space.4} / 3, 1)', 'spacing') });
  });

  test('references in typography, shadows and arithmetic resolve', () => {
    const root = tokenProject({ penpot });
    expect(problems(root)).toEqual([]);
    const resolved = checkSources(root).resolved.export.get('mode/light')!;
    expect(resolved.get('typography.body')?.value).toEqual({ fontFamilies: ['Source Serif 4', 'serif'], fontSizes: '16', lineHeights: '1.5' });
    expect(resolved.get('shadow.raised')?.value).toEqual([{ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '#1f1d1a' }]);
    expect(resolved.get('space.8')?.value).toBe('32px');
    expect(resolved.get('space.third')?.value).toBe('5.3px');
  });

  test('each, pointing at a missing name, is a missing reference on the token that holds it', () => {
    const broken = structuredClone(penpot);
    broken.base.typography.body.$value.fontSizes = '{font.size.missing}';
    broken.base.shadow.raised.$value[0].color = '{color.base.missing}';
    broken.base.space[8].$value = '{space.missing} * 2';
    broken.base.space.third.$value = 'roundTo({space.gone} / 3, 1)';
    expect(ofType(tokenProject({ penpot: broken }), 'missing-reference').map(({ subject, detail }) => ({ subject, detail }))).toEqual([
      { subject: 'space.8', detail: 'refers to "space.missing", which no enabled set defines in mode/light' },
      { subject: 'space.third', detail: 'refers to "space.gone", which no enabled set defines in mode/light' },
      { subject: 'typography.body', detail: 'refers to "font.size.missing", which no enabled set defines in mode/light' },
      { subject: 'shadow.raised', detail: 'refers to "color.base.missing", which no enabled set defines in mode/light' },
    ]);
  });

  // Penpot writes a typography's font families as a list, even when it holds
  // one reference.
  test('a reference inside a font family list resolves to the list it names', () => {
    const listed = sample((value) => {
      value.base.typography.body.$value.fontFamilies = ['{font.family.body}'];
      value.base.font.family.ui = token(['{font.family.body}', 'sans-serif'], 'fontFamilies');
    });
    const root = tokenProject({ penpot: listed });
    expect(problems(root)).toEqual([]);
    const resolved = checkSources(root).resolved.export.get('mode/light')!;
    expect(resolved.get('typography.body')?.value).toEqual({ fontFamilies: ['Source Serif 4', 'serif'], fontSizes: '16', lineHeights: '1.5' });
    expect(resolved.get('font.family.ui')?.value).toEqual(['Source Serif 4', 'serif', 'sans-serif']);
  });

  test('a missing name inside a font family list is a missing reference', () => {
    const listed = sample((value) => (value.base.typography.body.$value.fontFamilies = ['{font.family.gone}']));
    expect(ofType(tokenProject({ penpot: listed }), 'missing-reference').map(({ subject, detail }) => ({ subject, detail }))).toEqual([
      { subject: 'typography.body', detail: 'refers to "font.family.gone", which no enabled set defines in mode/light' },
    ]);
  });
});

describe('003-design-tokens-FR-017: the later set wins, and different types are reported', () => {
  const withBrand = (type: string, value: unknown) =>
    sample((penpot) => {
      penpot.base.color.accent = token('#2255aa', 'color');
      penpot.brand = { color: { accent: token(value, type) } };
      penpot.$metadata.tokenSetOrder.push('brand');
      penpot.$themes[0].selectedTokenSets.brand = 'enabled';
    });

  test('the definition from the later set wins with no problem', () => {
    const root = tokenProject({ penpot: withBrand('color', '#aa5522') });
    expect(problems(root)).toEqual([]);
    expect(checkSources(root).resolved.export.get('mode/light')?.get('color.accent')?.value).toBe('#aa5522');
  });

  test('two definitions with different types are conflicting types', () => {
    const penpot = withBrand('number', '2');
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'conflicting-types',
        subject: 'color.accent',
        location: valueAt(EXPORT_FILE, penpot, 'accent', '"brand"'),
        detail: 'is a color in set "base" and a number in set "brand", both enabled in mode/light',
      },
    ]);
  });
});

describe('003-design-tokens-FR-046: references between the two sources are reported', () => {
  test('a motion token referring to an export token', () => {
    const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
    motion.motion.motion.duration.slow = token('{space.4}', 'duration');
    expect(problems(tokenProject({ motion }))).toEqual([
      {
        type: 'cross-source-reference',
        subject: 'motion.duration.slow',
        location: valueAt(MOTION_FILE, motion, 'slow'),
        detail: 'refers to "space.4", which is in the token export; motion tokens may refer only to motion tokens',
      },
    ]);
  });

  test('an export token referring to a motion token', () => {
    const penpot = sample((value) => (value.base.pause = token('{motion.duration.fast}', 'number')));
    expect(problems(tokenProject({ penpot }))).toEqual([
      {
        type: 'cross-source-reference',
        subject: 'pause',
        location: valueAt(EXPORT_FILE, penpot, 'pause'),
        detail: 'refers to "motion.duration.fast", which is in the motion token source; tokens in the export may not refer to motion tokens',
      },
    ]);
  });
});
