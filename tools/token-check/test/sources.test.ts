import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { EXPORT_FILE } from '../src/paths.ts';
import { SAMPLE_EXPORT, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

// The line and column `shift` code units into the `nth` occurrence of
// `needle` after `after`.
function at(text: string, needle: string, options: { nth?: number; after?: string; shift?: number } = {}) {
  let offset = options.after === undefined ? -1 : text.indexOf(options.after);
  for (let count = 0; count <= (options.nth ?? 0); count += 1) offset = text.indexOf(needle, offset + 1);
  if (offset === -1) throw new Error(`${needle} not found`);
  const before = text.slice(0, offset + (options.shift ?? 0)).split('\n');
  return { file: EXPORT_FILE, line: before.length, column: before.at(-1)!.length + 1 };
}

function sample(change: (penpot: Record<string, any>) => void): Record<string, any> {
  const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
  change(penpot);
  return penpot;
}

function problemsOf(penpot: object | string, type: string) {
  return runCheck(tokenProject({ penpot }))
    .problems.filter((problem) => problem.type === type)
    .map(({ subject, location, detail }) => ({ subject, location, detail }));
}

describe('003-design-tokens-FR-013: content Penpot does not write in an export is reported', () => {
  const cases: [string, (penpot: Record<string, any>) => void, string, (text: string) => ReturnType<typeof at>, string][] = [
    [
      'a duration token',
      (penpot) => (penpot.base.motion = { flash: token('200ms', 'duration') }),
      'motion.flash',
      (text) => at(text, '"duration"'),
      `Penpot doesn't support the type "duration"; durations and easing curves go in the motion token source`,
    ],
    ['a boolean token', (penpot) => (penpot.base.flag = token(true, 'boolean')), 'flag', (text) => at(text, '"boolean"'), `Penpot doesn't support the type "boolean"`],
    [
      '$extensions on a token',
      (penpot) => (penpot.base.space[4].$extensions = { studio: {} }),
      'space.4',
      (text) => at(text, '"$extensions"'),
      `Penpot doesn't write "$extensions" in a token`,
    ],
    ['a $type on a group', (penpot) => (penpot.base.color = { $type: 'color', ...penpot.base.color }), 'color', (text) => at(text, '"$type": "color"'), `Penpot doesn't write "$type" in a group`],
    [
      'a dotted key',
      (penpot) => (penpot.light.color = { 'text.primary': token('{color.base.ink}', 'color') }),
      'color.text.primary',
      (text) => at(text, '"text.primary"'),
      `Penpot writes each name part as its own key, not "text.primary"`,
    ],
    [
      'legacy value and type keys',
      (penpot) => (penpot.base.legacy = { value: '#ffffff', type: 'color' }),
      'legacy',
      (text) => at(text, '"value"'),
      `Penpot doesn't write "value" in a token`,
    ],
    [
      'a token without $description',
      (penpot) => (penpot.base.space[4] = { $value: '16', $type: 'spacing' }),
      'space.4',
      (text) => at(text, '"4": {', { shift: 5 }),
      `Penpot always writes "$description" in a token`,
    ],
    [
      'an extra theme field',
      (penpot) => (penpot.$themes[0].modifiedAt = '2026-10-22'),
      'theme "mode/light"',
      (text) => at(text, '"modifiedAt"'),
      `Penpot doesn't write "modifiedAt" in a theme`,
    ],
    [
      'a disabled set in selectedTokenSets',
      (penpot) => (penpot.$themes[0].selectedTokenSets.light = 'disabled'),
      'theme "mode/light"',
      (text) => at(text, '"disabled"'),
      'Penpot writes only "enabled" here',
    ],
    ['an extra $metadata field', (penpot) => (penpot.$metadata.version = '1'), '$metadata.version', (text) => at(text, '"version"'), `Penpot doesn't write "version" in $metadata`],
    ['a top-level $foo key', (penpot) => (penpot.$foo = {}), '$foo', (text) => at(text, '"$foo"'), `Penpot doesn't write "$foo" in the top level`],
    [
      'tokenSetOrder missing a set',
      (penpot) => (penpot.$metadata.tokenSetOrder = ['base']),
      '$metadata.tokenSetOrder',
      (text) => at(text, '"tokenSetOrder": [', { shift: 17 }),
      'must list every set exactly once; "light" missing',
    ],
    [
      'an unknown key in a typography value',
      (penpot) => (penpot.base.typography.body.$value.fontStyle = 'italic'),
      'typography.body',
      (text) => at(text, '"fontStyle"'),
      `Penpot doesn't write "fontStyle" in a typography value`,
    ],
    [
      'a shadow written as a single object',
      (penpot) => (penpot.base.shadow = { raised: token({ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '#00000029' }, 'shadow') }),
      'shadow.raised',
      (text) => at(text, '"$value": {', { after: '"raised"', shift: 10 }),
      'Penpot writes "$value" as an array in a shadow',
    ],
  ];

  for (const [name, change, subject, where, detail] of cases) {
    test(`${name} gives one unsupported-content at its position`, () => {
      const penpot = sample(change);
      const text = JSON.stringify(penpot, null, 2);
      expect(problemsOf(penpot, 'unsupported-content')).toEqual([{ subject, location: where(text), detail }]);
    });
  }

  test('the sample export has none', () => {
    expect(problemsOf(SAMPLE_EXPORT, 'unsupported-content')).toEqual([]);
  });
});

describe('003-design-tokens-FR-016: a name defined twice in one set is reported with every occurrence', () => {
  test('a repeated key gives one duplicate-token at the first occurrence', () => {
    const text = JSON.stringify(SAMPLE_EXPORT, null, 2).replace(
      '"paper": {',
      '"ink": {\n          "$value": "#000000",\n          "$type": "color",\n          "$description": ""\n        },\n        "paper": {',
    );
    const first = at(text, '"ink"');
    const second = at(text, '"ink"', { nth: 1 });
    expect(problemsOf(text, 'duplicate-token')).toEqual([
      {
        subject: 'color.base.ink',
        location: first,
        detail: `defined 2 times in set "base": ${first.line}:${first.column}, ${second.line}:${second.column}`,
      },
    ]);
  });

  test('a dotted key beside the nested path gives one duplicate-token listing both', () => {
    const penpot = sample((value) => (value.light.color['text.primary'] = token('{color.base.paper}', 'color')));
    const text = JSON.stringify(penpot, null, 2);
    const nested = at(text, '"primary"', { after: '"light"' });
    const dotted = at(text, '"text.primary"');
    expect(problemsOf(penpot, 'duplicate-token')).toEqual([
      {
        subject: 'color.text.primary',
        location: nested,
        detail: `defined 2 times in set "light": ${nested.line}:${nested.column}, ${dotted.line}:${dotted.column}`,
      },
    ]);
    expect(problemsOf(penpot, 'unsupported-content').map(({ subject }) => subject)).toEqual(['color.text.primary']);
  });

  test('the same name in two sets is not a duplicate', () => {
    const penpot = sample((value) => (value.light.space = { 4: token('20', 'spacing') }));
    expect(problemsOf(penpot, 'duplicate-token')).toEqual([]);
  });
});
