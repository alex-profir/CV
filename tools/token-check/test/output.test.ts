import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, test } from 'vitest';
import { outputFor, runCheck } from '../src/check.ts';
import { cssText } from '../src/output.ts';
import { OUTPUT_CSS_FILE, OUTPUT_TS_FILE } from '../src/paths.ts';
import { REPO_ROOT, SAMPLE_EXPORT, SAMPLE_MOTION, makeProject, runGenerate, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

const TWO_THEMES = path.join(REPO_ROOT, 'tools/token-check/test/__fixtures__/two-themes');

function sample(change: (penpot: Record<string, any>) => void): Record<string, any> {
  const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
  change(penpot);
  return penpot;
}

const readFile = (root: string, file: string) => fs.readFileSync(path.join(root, file), 'utf8');

// The generated TS module's values.
async function generated(root: string): Promise<Record<string, any>> {
  return import(pathToFileURL(path.join(root, OUTPUT_TS_FILE)).href);
}

// The text of one `export const` declaration in the generated TS.
function declaration(ts: string, name: string): string {
  const start = ts.indexOf(`export const ${name} = `);
  return ts.slice(start, ts.indexOf(' as const;', start));
}

describe('003-design-tokens-FR-005: derived output is produced from the sources and reported when stale', () => {
  test('a committed CSS file with one byte changed is stale', () => {
    const root = tokenProject();
    const css = readFile(root, OUTPUT_CSS_FILE).replace('#1f1d1a', '#1f1d1b');
    fs.writeFileSync(path.join(root, OUTPUT_CSS_FILE), css);
    const report = runCheck(root);
    expect(report.problems).toEqual([
      {
        type: 'stale-output',
        subject: OUTPUT_CSS_FILE,
        location: { file: OUTPUT_CSS_FILE, line: 1, column: 1 },
        detail: "doesn't match the token sources; run npm run token-output",
      },
    ]);
    expect(report.output).toBe('stale');
  });

  test('a missing TS file is stale', () => {
    const root = tokenProject();
    fs.rmSync(path.join(root, OUTPUT_TS_FILE));
    expect(runCheck(root).problems).toEqual([
      {
        type: 'stale-output',
        subject: OUTPUT_TS_FILE,
        location: { file: OUTPUT_TS_FILE, line: 1, column: 1 },
        detail: 'is missing; run npm run token-output',
      },
    ]);
  });

  test('the generator writes nothing when a source has a problem', { timeout: 30_000 }, () => {
    const penpot = sample((value) => (value.light.color.text.primary.$value = '{color.base.inc}'));
    const root = tokenProject({ penpot, output: false });
    const result = runGenerate(root);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/missing-reference color\.text\.primary/);
    expect(result.stdout).toMatch(/\nFAIL: 1 problem found\. Some checks could not run\.\n$/);
    expect(fs.existsSync(path.join(root, OUTPUT_CSS_FILE))).toBe(false);
    expect(fs.existsSync(path.join(root, OUTPUT_TS_FILE))).toBe(false);
  });

  test('the generator writes both files, then reports them unchanged', { timeout: 30_000 }, () => {
    const root = tokenProject({ output: false });
    const first = runGenerate(root);
    expect(first.status).toBe(0);
    expect(first.stdout).toBe(`wrote ${OUTPUT_CSS_FILE}\nwrote ${OUTPUT_TS_FILE}\n`);
    const second = runGenerate(root);
    expect(second.status).toBe(0);
    expect(second.stdout).toBe(`unchanged ${OUTPUT_CSS_FILE}\nunchanged ${OUTPUT_TS_FILE}\n`);
    expect(runCheck(root).output).toBe('current');
  });
});

describe('003-design-tokens-FR-019: code reads transparency unchanged', () => {
  test('a hex color with alpha is written as it is, and rgba() around a hex becomes rgb()', () => {
    const penpot = sample((value) => {
      value.light.color.overlay = token('#00000080', 'color');
      value.light.color.veil = token('rgba({color.base.ink}, 0.5)', 'color');
    });
    const { css } = outputFor(tokenProject({ penpot }))!;
    expect(css).toContain('  --token-color-overlay: #00000080;\n');
    expect(css).toContain('  --token-color-veil: rgb(31 29 26 / 0.5);\n');
  });
});

describe('003-design-tokens-FR-025: code gets a description of every name and type, from both sources', () => {
  test('tokenTypes lists every name with its type, in code-unit order, and nothing about sources', () => {
    const { ts } = outputFor(tokenProject())!;
    const types = declaration(ts, 'tokenTypes');
    expect(types).toBe(
      [
        'export const tokenTypes = {',
        '  "breakpoint.wide": "dimension",',
        '  "color.base.ink": "color",',
        '  "color.base.paper": "color",',
        '  "color.text.primary": "color",',
        '  "font.family.body": "fontFamilies",',
        '  "font.size.body": "fontSizes",',
        '  "motion.duration.fast": "duration",',
        '  "motion.easing.standard": "cubicBezier",',
        '  "space.4": "spacing",',
        '  "typography.body": "typography"',
        '}',
      ].join('\n'),
    );
    for (const word of ['penpot', 'motion token source', 'export"']) expect(types.includes(word)).toBe(false);
  });

  test('a token added to a source appears in both files after regenerating', { timeout: 30_000 }, () => {
    const root = tokenProject();
    const penpot = sample((value) => (value.light.color.accent = token('{color.base.ink}', 'color')));
    fs.writeFileSync(path.join(root, 'packages/tokens/penpot/tokens.json'), JSON.stringify(penpot, null, 2));
    expect(runGenerate(root).status).toBe(0);
    expect(readFile(root, OUTPUT_CSS_FILE)).toContain('  --token-color-accent: #1f1d1a;\n');
    expect(readFile(root, OUTPUT_TS_FILE)).toContain('  "color.accent": "color",\n');
    expect(runCheck(root).problems).toEqual([]);
  });

  test('both files start with their header and are rebuilt byte for byte', () => {
    const root = tokenProject();
    const { css, ts } = outputFor(root)!;
    expect(css.startsWith('/* Generated by npm run token-output from packages/tokens/penpot/tokens.json and\n   packages/tokens/motion/tokens.json. Do not edit. */\n:root {\n')).toBe(true);
    expect(ts.startsWith('// Generated by npm run token-output from packages/tokens/penpot/tokens.json and packages/tokens/motion/tokens.json. Do not edit.\n\nexport const tokenTypes = {\n')).toBe(true);
    expect(outputFor(root)).toEqual({ css, ts });
    expect(readFile(root, OUTPUT_CSS_FILE)).toBe(css);
    expect(readFile(root, OUTPUT_TS_FILE)).toBe(ts);
  });

  test.each([
    ['spacing', '16', '16px'],
    ['sizing', '24px', '24px'],
    ['borderRadius', '50%', '50%'],
    ['rotation', '45', '45deg'],
    ['opacity', '0.8', '0.8'],
    ['number', 2, '2'],
    ['fontFamilies', ['Source Sans 3', 'sans-serif'], '"Source Sans 3", sans-serif'],
    ['fontFamilies', 'Source Serif 4, serif', '"Source Serif 4", serif'],
    ['fontWeights', 'Bold', '700'],
    ['fontWeights', 'Regular Italic', '400'],
    ['letterSpacing', '0.5', '0.5px'],
    ['textCase', 'Uppercase', 'uppercase'],
    ['textDecoration', 'strike-through', 'line-through'],
    ['shadow', [{ offsetX: '0', offsetY: '1', blur: '3', spread: '0', color: '#1f1d1a29' }, { offsetX: '0', offsetY: '0', blur: '1', spread: '0', color: '#000', inset: true }], '0px 1px 3px 0px #1f1d1a29, inset 0px 0px 1px 0px #000'],
    ['duration', '150ms', '150ms'],
    ['cubicBezier', [0.2, 0, 0, 1], 'cubic-bezier(0.2, 0, 0, 1)'],
  ])('a %s of %j is written as %j', (type, value, css) => {
    expect(cssText(type, value)).toBe(css);
  });

  test('a typography token gives only the parts it sets', () => {
    expect(cssText('typography', { fontFamilies: ['Source Serif 4', 'serif'], fontSizes: '16', fontWeights: 'Bold Italic', lineHeights: '1.5' })).toEqual({
      'font-family': '"Source Serif 4", serif',
      'font-size': '16px',
      'font-weight': '700',
      'font-style': 'italic',
      'line-height': '1.5',
    });
    const { css } = outputFor(tokenProject())!;
    expect(css.split('\n').filter((line) => line.includes('--token-typography-body'))).toEqual([
      '  --token-typography-body-font-family: "Source Serif 4", serif;',
      '  --token-typography-body-font-size: 16px;',
      '  --token-typography-body-line-height: 1.5;',
    ]);
  });

  test("a typography's font families written as a list holding a reference give the list it names", () => {
    const penpot = sample((value) => (value.base.typography.body.$value.fontFamilies = ['{font.family.body}']));
    expect(outputFor(tokenProject({ penpot }))!.css).toContain('  --token-typography-body-font-family: "Source Serif 4", serif;\n');
  });
});

describe('003-design-tokens-FR-052: breakpoints are custom properties and custom media', () => {
  test('breakpoint.wide gives both', () => {
    const { css } = outputFor(tokenProject())!;
    expect(css).toContain('  --token-breakpoint-wide: 768px;\n');
    expect(css.endsWith('}\n\n@custom-media --token-breakpoint-wide (width >= 768px);\n')).toBe(true);
  });
});

describe('003-design-tokens-FR-054: the output holds every theme, with the active one in :root', () => {
  test('the two-themes sample', async () => {
    const root = makeProject({});
    fs.cpSync(TWO_THEMES, root, { recursive: true });
    const { css } = outputFor(root)!;
    expect(css).toContain('  --token-color-text-primary: #1f1d1a;\n');
    const values = await generated(root);
    expect(Object.keys(values.themeValues)).toEqual([
      'mode/dark + motion/standard + shell/desktop',
      'mode/dark + motion/standard + shell/mobile',
      'mode/light + motion/standard + shell/desktop',
      'mode/light + motion/standard + shell/mobile',
    ]);
    expect(values.themeValues['mode/dark + motion/standard + shell/desktop']['color.text.primary']).toBe('#faf8f5');
    expect(values.activeThemes).toEqual({ mode: 'light', motion: 'standard', shell: 'desktop' });
    expect(values.themeGroups).toEqual({ mode: ['dark', 'light'], motion: ['standard'], shell: ['desktop', 'mobile'] });
  });

  test('the motion sample is in every combination', () => {
    expect(outputFor(tokenProject({ motion: SAMPLE_MOTION }))!.css).toContain('  --token-motion-duration-fast: 150ms;\n');
  });
});
