import { describe, expect, test } from 'vitest';
import { checkSources, runCheck } from '../src/check.ts';
import { valueProblem } from '../src/values.ts';
import { SAMPLE_EXPORT, SAMPLE_MOTION, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

// The sample export with tokens added to its `base` set.
function withBase(tokens: Record<string, unknown>) {
  const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
  Object.assign(penpot.base, tokens);
  return penpot;
}

function invalid(root: string) {
  return runCheck(root)
    .problems.filter((problem) => problem.type === 'invalid-value')
    .map(({ subject, detail }) => ({ subject, detail }));
}

// Accepted and rejected forms of each type (data-model.md, Value rules).
const FORMS: Record<string, { accepted: unknown[]; rejected: unknown[] }> = {
  color: {
    accepted: ['#fff', '#ffff', '#1f1d1a', '#1f1d1a80', 'rgb(0, 0, 0)', 'rgb(0 0 0 / 50%)', 'rgba(255, 0, 0, 0.5)', 'hsl(120, 50%, 50%)', 'hsla(120deg 50% 50% / 0.5)', 'RebeccaPurple', 'rgba(#1f1d1a, 0.5)'],
    rejected: ['16', '#ff', '#fffff', 'rgb(256, 0, 0)', 'hsv(0, 0%, 0%)', 'notacolor', 16],
  },
  dimension: { accepted: ['16', '16px', '50%', '-4', 1.5, '0'], rejected: ['1.5rem', '2em', 'auto', ''] },
  spacing: { accepted: ['8', '8px'], rejected: ['8pt'] },
  sizing: { accepted: ['24'], rejected: ['24vh'] },
  borderRadius: { accepted: ['4', '50%'], rejected: ['4rem'] },
  borderWidth: { accepted: ['1', '0'], rejected: ['-1', 'thin'] },
  opacity: { accepted: ['0', '0.5', '1', '50%', '100%', 0.8], rejected: ['1.5', '120%', '-0.1', 'half'] },
  rotation: { accepted: ['45', '-90'], rejected: ['45deg'] },
  number: { accepted: ['1.5', '-2', 3], rejected: ['2px', 'two'] },
  fontFamilies: { accepted: [['Source Serif 4', 'serif'], 'Source Sans 3, sans-serif'], rejected: [[], ['Source', ''], 'a,,b', 4] },
  fontSizes: { accepted: ['16', '16px'], rejected: ['1rem'] },
  fontWeights: { accepted: ['400', '950', 700, 'Regular', 'bold', 'Bold Italic', 'semi bold', '400 italic'], rejected: ['450', '1000', 'Heaviest', 'italic'] },
  letterSpacing: { accepted: ['0', '0.5', '-1px'], rejected: ['5%', '1em'] },
  textCase: { accepted: ['none', 'UPPERCASE', ' lowercase ', 'capitalize'], rejected: ['small-caps'] },
  textDecoration: { accepted: ['none', 'underline', 'Strike-Through'], rejected: ['line-through', 'overline'] },
  typography: {
    accepted: [{ fontFamilies: ['Source Serif 4'], fontSizes: '16', fontWeights: '400', lineHeights: '1.5', letterSpacing: '0', textCase: 'none', textDecoration: 'none' }, { fontSizes: '16', lineHeights: '24px' }],
    rejected: ['{typography.body}', { fontSizes: '1rem' }, { lineHeights: '1.5' }, [{ fontSizes: '16' }]],
  },
  shadow: {
    accepted: [[{ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '#00000029' }], [{ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '#000', inset: true }]],
    rejected: [[], [{ offsetX: '0', offsetY: '1', blur: '-3', spread: '0', color: '#000' }], [{ offsetX: '0', offsetY: '1', blur: '3', spread: '0' }], [{ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '#000', inset: 'yes' }], '0 1px 3px #000'],
  },
};

describe('003-design-tokens-FR-014: every value is one Penpot accepts for its type', () => {
  for (const [type, { accepted, rejected }] of Object.entries(FORMS)) {
    test(`${type} accepts its forms and rejects others`, () => {
      for (const value of accepted) expect(valueProblem(type, value, 'x'), JSON.stringify(value)).toBeNull();
      for (const value of rejected) expect(valueProblem(type, value, 'x'), JSON.stringify(value)).not.toBeNull();
    });
  }

  test('the check covers all 17 Penpot types', () => {
    expect(Object.keys(FORMS)).toHaveLength(17);
  });

  test('a spacing in rem is not a length Penpot accepts', () => {
    expect(invalid(tokenProject({ penpot: withBase({ space: { 4: token('16', 'spacing'), lg: token('1.5rem', 'spacing') } }) }))).toEqual([
      { subject: 'space.lg', detail: '"1.5rem" is not a length Penpot accepts (a number, optionally with px or %)' },
    ]);
  });

  test('a font weight of 450 is rejected', () => {
    expect(invalid(tokenProject({ penpot: withBase({ weight: token('450', 'fontWeights') }) }))).toEqual([
      {
        subject: 'weight',
        detail:
          '"450" is not a font weight Penpot accepts (100 to 900 in hundreds, 950, or a named weight such as Regular or Bold, optionally followed by italic)',
      },
    ]);
  });

  test('a color that refers to a spacing token is reported on the color', () => {
    const penpot = withBase({ muted: token('{space.4}', 'color') });
    expect(invalid(tokenProject({ penpot }))).toEqual([
      { subject: 'muted', detail: '"16" is not a color (#hex, rgb(), rgba(), hsl(), hsla() or a named color)' },
    ]);
  });

  test('a negative border width is reported', () => {
    expect(invalid(tokenProject({ penpot: withBase({ border: token('-1', 'borderWidth') }) }))).toEqual([{ subject: 'border', detail: '"-1" is negative' }]);
  });

  test('arithmetic that mixes units is reported', () => {
    expect(invalid(tokenProject({ penpot: withBase({ gap: token('{space.4} + 2%', 'spacing') }) }))).toEqual([
      { subject: 'gap', detail: 'arithmetic "{space.4} + 2%" mixes units' },
    ]);
  });

  test('a typography with a line height and no font size is reported', () => {
    expect(invalid(tokenProject({ penpot: withBase({ heading: token({ lineHeights: '1.2' }, 'typography') }) }))).toEqual([
      { subject: 'heading', detail: '"lineHeights" needs "fontSizes" in the same typography' },
    ]);
  });

  test('a breakpoint of 50% is reported', () => {
    const penpot = withBase({ breakpoint: { wide: token('768', 'dimension'), half: token('50%', 'dimension') } });
    expect(invalid(tokenProject({ penpot }))).toEqual([{ subject: 'breakpoint.half', detail: 'a breakpoint needs a length in px' }]);
  });

  test('a token whose value comes from a reported token is not reported again', () => {
    const penpot = withBase({ muted: token('{space.4}', 'color'), softer: token('{muted}', 'color') });
    expect(invalid(tokenProject({ penpot })).map(({ subject }) => subject)).toEqual(['muted']);
  });
});

describe('003-design-tokens-FR-019: colors with transparency are accepted in every form', () => {
  test('hex with alpha, rgba() and hsla() are accepted', () => {
    for (const value of ['#0008', '#00000080', 'rgba(0, 0, 0, 0.5)', 'hsla(0, 0%, 0%, 0.5)']) expect(valueProblem('color', value, 'x')).toBeNull();
  });

  test('rgba() around a reference resolves and is accepted', () => {
    const penpot = withBase({ veil: token('rgba({color.base.ink}, 0.5)', 'color') });
    const root = tokenProject({ penpot });
    expect(runCheck(root).problems).toEqual([]);
    expect(checkSources(root).resolved.export.get('mode/light')?.get('veil')?.value).toBe('rgba(#1f1d1a, 0.5)');
  });
});

describe('003-design-tokens-FR-045: motion values follow their own rules', () => {
  // The sample motion source with tokens added to its durations and easing
  // curves.
  function withMotion(durations: Record<string, unknown>, easings: Record<string, unknown> = {}) {
    const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
    Object.assign(motion.motion.motion.duration, durations);
    Object.assign(motion.motion.motion.easing, easings);
    return motion;
  }

  test.each([
    ['duration', '-50ms', '"-50ms" is negative'],
    ['duration', 'fast', '"fast" is not a duration (a number with ms or s, zero or more)'],
    ['duration', '150', '"150" is not a duration (a number with ms or s, zero or more)'],
    ['cubicBezier', [1.5, 0, 0, 1], '[1.5,0,0,1] is not a cubic Bézier: the first and third numbers must be from 0 to 1'],
    ['cubicBezier', [0, 0, 1], '[0,0,1] is not a cubic Bézier: it needs four numbers'],
    ['cubicBezier', [0, 0, -0.1, 1], '[0,0,-0.1,1] is not a cubic Bézier: the first and third numbers must be from 0 to 1'],
  ])('a %s of %j is rejected', (type, value, detail) => {
    expect(valueProblem(type, value, 'motion.x')).toBe(detail);
  });

  test.each([
    ['duration', '0'],
    ['duration', '150ms'],
    ['duration', '0.3s'],
    ['cubicBezier', [0.2, -0.5, 0, 1.5]],
  ])('a %s of %j is accepted', (type, value) => {
    expect(valueProblem(type, value, 'motion.x')).toBeNull();
  });

  test('arithmetic and whole-value references resolve, and mixed units are reported', () => {
    const motion = withMotion(
      { base: token('250ms', 'duration'), slow: token('{motion.duration.base} * 2', 'duration'), odd: token('{motion.duration.base} + 1s', 'duration') },
      { emphasized: token('{motion.easing.standard}', 'cubicBezier') },
    );
    const root = tokenProject({ motion });
    expect(invalid(root)).toEqual([{ subject: 'motion.duration.odd', detail: 'arithmetic "{motion.duration.base} + 1s" mixes units' }]);
    const resolved = checkSources(root).resolved.motion.get('motion/standard')!;
    expect(resolved.get('motion.duration.slow')?.value).toBe('500ms');
    expect(resolved.get('motion.easing.emphasized')?.value).toEqual([0.2, 0, 0, 1]);
  });

  test('negative arithmetic and a bad curve are each reported once, through runCheck', () => {
    const motion = withMotion({ back: token('-50ms', 'duration') }, { bounce: token([1.5, 0, 0, 1], 'cubicBezier') });
    expect(invalid(tokenProject({ motion }))).toEqual([
      { subject: 'motion.duration.back', detail: '"-50ms" is negative' },
      { subject: 'motion.easing.bounce', detail: '[1.5,0,0,1] is not a cubic Bézier: the first and third numbers must be from 0 to 1' },
    ]);
  });
});
