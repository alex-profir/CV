import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { MOTION_FILE } from '../src/paths.ts';
import { REPO_ROOT, SAMPLE_MOTION, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

function motionSample(change: (motion: Record<string, any>) => void): Record<string, any> {
  const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
  change(motion);
  return motion;
}

// The line and column `shift` code units into the first `needle` after
// `after`, in the motion source written in Penpot's form.
function at(motion: object, needle: string, options: { after?: string; shift?: number } = {}) {
  const text = JSON.stringify(motion, null, 2);
  const offset = text.indexOf(needle, options.after === undefined ? 0 : text.indexOf(options.after));
  if (offset === -1) throw new Error(`${needle} not found`);
  const before = text.slice(0, offset + (options.shift ?? 0)).split('\n');
  return { file: MOTION_FILE, line: before.length, column: before.at(-1)!.length + 1 };
}

const problems = (motion: object) => runCheck(tokenProject({ motion })).problems;

const summary = (motion: object) => problems(motion).map(({ type, subject, detail }) => ({ type, subject, detail }));

describe('003-design-tokens-FR-042: the motion source holds only durations and easing curves', () => {
  test('a color belongs in Penpot', () => {
    const motion = motionSample((value) => (value.motion.color = { flash: token('#ff0000', 'color') }));
    expect(problems(motion)).toEqual([
      {
        type: 'wrong-source',
        subject: 'color.flash',
        location: at(motion, '"color"', { after: '"flash"' }),
        detail: 'a color token belongs in Penpot; the motion token source holds only durations and easing curves',
      },
    ]);
  });

  test('a spacing belongs in Penpot', () => {
    const motion = motionSample((value) => (value.motion.motion.gap = token('8', 'spacing')));
    expect(summary(motion)).toEqual([
      {
        type: 'wrong-source',
        subject: 'motion.gap',
        detail: 'a spacing token belongs in Penpot; the motion token source holds only durations and easing curves',
      },
    ]);
  });

  test('a type neither source supports is unsupported content', () => {
    const motion = motionSample((value) => (value.motion.motion.reduced = token(true, 'boolean')));
    expect(summary(motion)).toEqual([{ type: 'unsupported-content', subject: 'motion.reduced', detail: `Penpot doesn't support the type "boolean"` }]);
  });
});

describe('003-design-tokens-FR-043: the motion source is laid out like the export', () => {
  test('the starter motion source passes', () => {
    const motion = fs.readFileSync(path.join(REPO_ROOT, MOTION_FILE), 'utf8');
    expect(runCheck(tokenProject({ motion })).problems).toEqual([]);
  });

  test('durations and cubic Béziers are accepted', () => {
    const motion = motionSample((value) => {
      value.motion.motion.duration.slow = token('0.3s', 'duration');
      value.motion.motion.easing.out = token([0, 0, 0.2, 1], 'cubicBezier');
    });
    expect(problems(motion)).toEqual([]);
  });

  test('an extra theme field is unsupported content', () => {
    const motion = motionSample((value) => (value.$themes[0].externalId = 'x'));
    expect(problems(motion)).toEqual([
      {
        type: 'unsupported-content',
        subject: 'theme "motion/standard"',
        location: at(motion, '"externalId"'),
        detail: `Penpot doesn't write "externalId" in a theme`,
      },
    ]);
  });

  test('a dotted key is unsupported content', () => {
    const motion = motionSample((value) => (value.motion.motion['duration.slow'] = token('300ms', 'duration')));
    expect(problems(motion)).toEqual([
      {
        type: 'unsupported-content',
        subject: 'motion.duration.slow',
        location: at(motion, '"duration.slow"'),
        detail: 'Penpot writes each name part as its own key, not "duration.slow"',
      },
    ]);
  });
});

describe('003-design-tokens-FR-044: the motion source is checked like the export', () => {
  test('an unused set', () => {
    const motion = motionSample((value) => {
      value.drafts = {};
      value.$metadata.tokenSetOrder.push('drafts');
    });
    expect(summary(motion)).toEqual([{ type: 'unused-set', subject: 'set "drafts"', detail: 'no theme enables it, so code can never read its tokens' }]);
  });

  test('a missing set', () => {
    const motion = motionSample((value) => (value.$themes[0].selectedTokenSets.reduced = 'enabled'));
    expect(summary(motion)).toEqual([
      { type: 'missing-set', subject: 'theme "motion/standard"', detail: `enables set "reduced", which the motion token source doesn't contain` },
    ]);
  });

  test('a theme without a group', () => {
    const motion = motionSample((value) => {
      value.$themes[0].group = '';
      value.$metadata.activeThemes = ['/standard'];
    });
    expect(summary(motion)).toEqual([{ type: 'theme-without-group', subject: 'theme "/standard"', detail: 'has no theme group' }]);
  });

  test('a missing reference', () => {
    const motion = motionSample((value) => (value.motion.motion.duration.slow = token('{motion.duration.base} * 2', 'duration')));
    expect(summary(motion)).toEqual([
      { type: 'missing-reference', subject: 'motion.duration.slow', detail: 'refers to "motion.duration.base", which no enabled set defines in motion/standard' },
    ]);
  });

  test('a loop', () => {
    const motion = motionSample((value) => {
      value.motion.motion.duration.a = token('{motion.duration.b}', 'duration');
      value.motion.motion.duration.b = token('{motion.duration.a}', 'duration');
    });
    expect(summary(motion)).toEqual([
      { type: 'reference-loop', subject: 'motion.duration.a', detail: 'references form a loop: motion.duration.a, motion.duration.b, motion.duration.a' },
    ]);
  });

  test('a key repeated in one set', () => {
    const text = JSON.stringify(SAMPLE_MOTION, null, 2).replace('"fast": {', '"fast": { "$value": "100ms", "$type": "duration", "$description": "" },\n        "fast": {');
    const found = runCheck(tokenProject({ motion: text })).problems.map(({ type, subject, detail }) => ({ type, subject, detail }));
    expect(found).toEqual([{ type: 'duplicate-token', subject: 'motion.duration.fast', detail: expect.stringMatching(/^defined 2 times in set "motion": \d+:\d+, \d+:\d+$/) }]);
  });

  test('an unusable name', () => {
    const motion = motionSample((value) => (value.motion.motion.duration['fast!'] = token('100ms', 'duration')));
    expect(summary(motion)).toEqual([
      { type: 'unusable-name', subject: 'motion.duration.fast!', detail: 'name part "fast!" may hold only ASCII letters, digits, hyphens and underscores' },
    ]);
  });
});
