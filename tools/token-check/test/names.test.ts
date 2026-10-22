import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { EXPORT_FILE, MOTION_FILE } from '../src/paths.ts';
import { SAMPLE_EXPORT, SAMPLE_MOTION, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

// Where the `nth` key `key` starts, after `after`.
function keyAt(file: string, source: object, key: string, after?: string) {
  const text = JSON.stringify(source, null, 2);
  const offset = text.indexOf(`${JSON.stringify(key)}: {`, after === undefined ? 0 : text.indexOf(after));
  if (offset === -1) throw new Error(`${key} not found`);
  const before = text.slice(0, offset).split('\n');
  return { file, line: before.length, column: before.at(-1)!.length + 1 };
}

function sample(change: (penpot: Record<string, any>) => void): Record<string, any> {
  const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
  change(penpot);
  return penpot;
}

function ofType(options: Parameters<typeof tokenProject>[0], type: string) {
  return runCheck(tokenProject(options))
    .problems.filter((problem) => problem.type === type)
    .map(({ subject, location, detail }) => ({ subject, location, detail }));
}

describe('003-design-tokens-FR-020: names code cannot use are reported', () => {
  test.each([
    ['color..x', (penpot: Record<string, any>) => (penpot.base['color..x'] = token('#000000', 'color')), 'color..x', 'color..x', 'has an empty name part'],
    ['an empty key', (penpot: Record<string, any>) => (penpot.base[''] = token('#000000', 'color')), '', '', 'has an empty name part'],
    [
      'a $ in a part',
      (penpot: Record<string, any>) => (penpot.light.color.text['primary$'] = token('#000000', 'color')),
      'primary$',
      'color.text.primary$',
      'name part "primary$" may hold only ASCII letters, digits, hyphens and underscores',
    ],
    [
      'a non-ASCII letter',
      (penpot: Record<string, any>) => (penpot.base.color['tëxt'] = token('#000000', 'color')),
      'tëxt',
      'color.tëxt',
      'name part "tëxt" may hold only ASCII letters, digits, hyphens and underscores',
    ],
    [
      'a space',
      (penpot: Record<string, any>) => (penpot.light.color['text primary'] = token('#000000', 'color')),
      'text primary',
      'color.text primary',
      'name part "text primary" may hold only ASCII letters, digits, hyphens and underscores',
    ],
  ])('%s is an unusable name', (_name, change, key, subject, detail) => {
    const penpot = sample(change);
    expect(ofType({ penpot }, 'unusable-name')).toEqual([{ subject, location: keyAt(EXPORT_FILE, penpot, key), detail }]);
  });
});

describe('003-design-tokens-FR-021: names code would read the same are reported', () => {
  test.each([
    [
      'space.1-5 and space.1.5',
      (penpot: Record<string, any>) => Object.assign(penpot.base.space, { '1-5': token('6', 'spacing'), 1: { 5: token('6', 'spacing') } }),
      '1-5',
      'space.1-5',
      'code would read these names the same, as --token-space-1-5: space.1-5, space.1.5',
    ],
    [
      'Color.x and color.x',
      (penpot: Record<string, any>) => {
        penpot.base.Color = { x: token('#000000', 'color') };
        penpot.base.color.x = token('#000000', 'color');
      },
      'x',
      'Color.x',
      'code would read these names the same, as --token-color-x: Color.x, color.x',
    ],
    [
      'a_b and a-b',
      (penpot: Record<string, any>) => Object.assign(penpot.base, { a_b: token('1', 'number'), 'a-b': token('1', 'number') }),
      'a-b',
      'a-b',
      'code would read these names the same, as --token-a-b: a-b, a_b',
    ],
    [
      'a token and a typography part',
      (penpot: Record<string, any>) => (penpot.base.typography['body-font-size'] = token('16', 'fontSizes')),
      'body',
      'typography.body',
      'code would read these names the same, as --token-typography-body-font-size: typography.body, typography.body-font-size',
    ],
  ])('%s collide', (_name, change, key, subject, detail) => {
    const penpot = sample(change);
    const after = key === 'x' ? '"Color"' : key === 'body' ? '"typography": {' : undefined;
    expect(ofType({ penpot }, 'name-collision')).toEqual([{ subject, location: keyAt(EXPORT_FILE, penpot, key, after), detail }]);
  });

  test('a name in the export and one in the motion source collide', () => {
    const penpot = sample((value) => (value.base.motion = { Duration: { fast: token('150', 'number') } }));
    expect(ofType({ penpot }, 'name-collision')).toEqual([
      {
        subject: 'motion.Duration.fast',
        location: keyAt(EXPORT_FILE, penpot, 'fast'),
        detail: 'code would read these names the same, as --token-motion-duration-fast: motion.Duration.fast, motion.duration.fast',
      },
    ]);
  });
});

describe('003-design-tokens-FR-022: a name that is both a token and a group is reported', () => {
  test('in one set, through a dotted key', () => {
    const penpot = sample((value) => (value.light.color = { ...value.light.color, primary: token('#000000', 'color'), 'primary.light': token('#333333', 'color') }));
    expect(ofType({ penpot }, 'token-used-as-group')).toEqual([
      { subject: 'color.primary', location: keyAt(EXPORT_FILE, penpot, 'primary', '"{color.base.ink}"'), detail: 'is a token and also a group of color.primary.light' },
    ]);
    expect(ofType({ penpot }, 'unsupported-content').map(({ subject }) => subject)).toEqual(['color.primary.light']);
  });

  test('across two sets', () => {
    const penpot = sample((value) => {
      value.base.color.primary = token('#000000', 'color');
      value.light.color.primary = { light: token('#333333', 'color') };
    });
    expect(ofType({ penpot }, 'token-used-as-group')).toEqual([
      { subject: 'color.primary', location: keyAt(EXPORT_FILE, penpot, 'primary'), detail: 'is a token and also a group of color.primary.light' },
    ]);
  });

  test('across the two sources', () => {
    const penpot = sample((value) => (value.base.motion = { easing: token('1', 'number') }));
    expect(ofType({ penpot }, 'token-used-as-group')).toEqual([
      { subject: 'motion.easing', location: keyAt(EXPORT_FILE, penpot, 'easing'), detail: 'is a token and also a group of motion.easing.standard' },
    ]);
  });
});

describe('003-design-tokens-FR-047: a name is defined in only one of the two sources', () => {
  test('a name in both sources is one duplicate-token at the motion definition', () => {
    const penpot = sample((value) => (value.base.motion = { duration: { fast: token('150', 'number') } }));
    const exported = keyAt(EXPORT_FILE, penpot, 'fast');
    expect(ofType({ penpot }, 'duplicate-token')).toEqual([
      {
        subject: 'motion.duration.fast',
        location: keyAt(MOTION_FILE, SAMPLE_MOTION, 'fast'),
        detail: `defined in both the token export (${EXPORT_FILE}:${exported.line}:${exported.column}) and the motion token source`,
      },
    ]);
  });
});
