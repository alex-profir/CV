// The repository's real tokens: the Penpot export, the motion token source,
// and what @cv/tokens gives code.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { activeThemes, cssVar, mediaQuery, tokenTypes, tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import { REPO_ROOT } from '../../../tools/traceability/test/helpers/project.ts';
import { runCheck } from '../../../tools/token-check/src/check.ts';
import { codeName } from '../../../tools/token-check/src/names.ts';
import { EXPORT_FILE, MOTION_FILE } from '../../../tools/token-check/src/paths.ts';

type Token = { name: string; set: string; $value: unknown; $type: unknown; $description: unknown };

const EXPORT_TEXT = fs.readFileSync(path.join(REPO_ROOT, EXPORT_FILE), 'utf8');
const EXPORT = JSON.parse(EXPORT_TEXT);
const MOTION = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, MOTION_FILE), 'utf8'));

// Every token in a source, with its full name and set.
function tokensOf(source: Record<string, any>): Token[] {
  const found: Token[] = [];
  const visit = (node: Record<string, any>, name: string[], set: string) => {
    if (Object.hasOwn(node, '$value')) {
      found.push({ name: name.join('.'), set, ...(node as Omit<Token, 'name' | 'set'>) });
      return;
    }
    for (const [key, child] of Object.entries(node)) visit(child, [...name, key], set);
  };
  for (const [set, tree] of Object.entries(source)) if (!set.startsWith('$')) visit(tree, [], set);
  return found;
}

const EXPORT_TOKENS = tokensOf(EXPORT);
const MOTION_TOKENS = tokensOf(MOTION);
const ofType = (tokens: Token[], type: string) => tokens.filter((token) => token.$type === type);

// Every font family named in the export: fontFamilies values and the
// families of typography values. References name no family.
function fontFamilies(): string[] {
  const values = [
    ...ofType(EXPORT_TOKENS, 'fontFamilies').map((token) => token.$value),
    ...ofType(EXPORT_TOKENS, 'typography').map((token) => (token.$value as Record<string, unknown>).fontFamilies),
  ];
  return values
    .flatMap((value) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []))
    .map((family) => String(family).trim())
    .filter((family) => family !== '' && !/^\{.*\}$/.test(family));
}

describe('003-design-tokens-FR-001: the export is in the repository exactly as Penpot wrote it', () => {
  test('it exists and holds every category Penpot keeps', () => {
    for (const type of ['color', 'typography', 'spacing', 'borderRadius', 'shadow']) expect(ofType(EXPORT_TOKENS, type).length, type).toBeGreaterThan(0);
  });

  test("it is in Penpot's written form, with no final newline", () => {
    expect(EXPORT_TEXT).toBe(JSON.stringify(EXPORT, null, 2));
    expect(EXPORT_TEXT.endsWith('\n')).toBe(false);
  });
});

describe('003-design-tokens-FR-003: the export holds only what Penpot writes, so it imports back unchanged', () => {
  test('the check finds no unsupported content in it', () => {
    expect(runCheck(REPO_ROOT).problems.filter((problem) => problem.type === 'unsupported-content' && problem.location.file === EXPORT_FILE)).toEqual([]);
  });

  test('every theme has exactly the six fields Penpot writes', () => {
    for (const theme of EXPORT.$themes) expect(Object.keys(theme).sort()).toEqual(['description', 'group', 'id', 'isSource', 'name', 'selectedTokenSets']);
  });

  test('tokenSetOrder lists every set exactly once', () => {
    const sets = Object.keys(EXPORT).filter((key) => !key.startsWith('$'));
    expect([...EXPORT.$metadata.tokenSetOrder].sort()).toEqual(sets.sort());
  });
});

describe('003-design-tokens-FR-004: the export has one theme, in a group of its own', () => {
  test('one theme with a group no motion theme shares', () => {
    expect(EXPORT.$themes).toHaveLength(1);
    const [{ group }] = EXPORT.$themes;
    expect(group).not.toBe('');
    expect(MOTION.$themes.filter((theme: { group: string }) => theme.group === group)).toEqual([]);
  });
});

describe('003-design-tokens-FR-006: the starter tokens prove every part of the pipeline', () => {
  test('the export holds transparency, a reference, a typography, a shadow and a breakpoint', () => {
    expect(ofType(EXPORT_TOKENS, 'color').some((token) => /^#(?:[0-9a-f]{4}|[0-9a-f]{8})$/i.test(String(token.$value)) || /^(rgba|hsla)\(/i.test(String(token.$value)))).toBe(
      true,
    );
    expect(EXPORT_TOKENS.some((token) => /\{[^{}]+\}/.test(JSON.stringify(token.$value)))).toBe(true);
    expect(ofType(EXPORT_TOKENS, 'typography').some((token) => Object.keys(token.$value as object).length >= 2)).toBe(true);
    expect(ofType(EXPORT_TOKENS, 'shadow').length).toBeGreaterThan(0);
    expect(EXPORT_TOKENS.some((token) => token.name.startsWith('breakpoint.'))).toBe(true);
  });

  test('no font family is an Apple font or the system interface font', () => {
    const families = fontFamilies();
    expect(families.length).toBeGreaterThan(0);
    for (const family of families) {
      expect(family, family).not.toMatch(/^\.?SF\b/i);
      expect(family, family).not.toMatch(/San Francisco|New York/i);
      expect(['system-ui', '-apple-system', 'blinkmacsystemfont'], family).not.toContain(family.toLowerCase());
      expect(family.toLowerCase().startsWith('ui-'), family).toBe(false);
    }
  });

  test('the motion source holds a duration and a cubic Bézier', () => {
    expect(ofType(MOTION_TOKENS, 'duration').length).toBeGreaterThan(0);
    expect(ofType(MOTION_TOKENS, 'cubicBezier').length).toBeGreaterThan(0);
  });
});

describe('003-design-tokens-FR-007: the export was made in Penpot', () => {
  test('every theme id is a UUID and every token has a description, as Penpot writes them', () => {
    for (const theme of EXPORT.$themes) expect(theme.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    for (const token of EXPORT_TOKENS) expect(typeof token.$description, token.name).toBe('string');
  });
});

describe('003-design-tokens-FR-008: durations and easing curves live in the motion token source', () => {
  test('every duration and cubic Bézier is in the motion source, and the export has none', () => {
    expect([...ofType(EXPORT_TOKENS, 'duration'), ...ofType(EXPORT_TOKENS, 'cubicBezier')]).toEqual([]);
    expect(MOTION_TOKENS.every((token) => token.$type === 'duration' || token.$type === 'cubicBezier')).toBe(true);
    expect(runCheck(REPO_ROOT).sources[1]).toMatchObject({ label: 'Motion token source', state: 'checked', tokens: 4 });
  });
});

describe('003-design-tokens-FR-019: code reads transparency unchanged', () => {
  test('the overlay keeps its alpha', () => {
    expect(tokenValue('color.overlay')).toBe('#00000080');
  });
});

describe('003-design-tokens-FR-025: code reads every token by name', () => {
  test('cssVar gives the custom property of a token', () => {
    expect(cssVar('color.text.primary')).toBe('var(--token-color-text-primary)');
  });

  test("cssVar maps every name as the check's codeName does", () => {
    const names = Object.entries(tokenTypes).filter(([, type]) => type !== 'typography');
    expect(names.length).toBeGreaterThan(0);
    for (const [name] of names) expect(cssVar(name as CssVarTokenName)).toBe(`var(${codeName(name)})`);
  });
});

describe('003-design-tokens-FR-052: code reads breakpoints as media queries', () => {
  test('mediaQuery gives the media condition', () => {
    expect(mediaQuery('breakpoint.wide')).toBe('(width >= 768px)');
  });
});

describe('003-design-tokens-FR-054: one theme is active in every group', () => {
  test('light and standard are active', () => {
    expect(activeThemes).toEqual({ mode: 'light', motion: 'standard' });
    expect(runCheck(REPO_ROOT).activeThemes).toBe('mode/light + motion/standard');
  });
});
