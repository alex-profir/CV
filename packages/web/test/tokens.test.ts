// The site and the design tokens (spec US6): every token in the export is
// read by the site, the site source holds no skip marker for either check,
// and the not-found page uses only token values, as /cv does.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Page } from 'playwright';
import { tokenTypes, tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import fonts from '../src/fonts/fonts.json' with { type: 'json' };
import { REPO_ROOT } from '../../../tools/traceability/test/helpers/project.ts';
import { codeName, TYPOGRAPHY_PARTS } from '../../../tools/token-check/src/names.ts';
import { EXPORT_FILE, MOTION_FILE } from '../../../tools/token-check/src/paths.ts';
import { openPage } from './helpers/browser.ts';
import { builtSite, serveBuilt } from './helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

type Token = { name: string; type: string; value: unknown };

// Every token in a source, with its full name.
function tokensOf(source: Record<string, any>): Token[] {
  const found: Token[] = [];
  const visit = (node: Record<string, any>, name: string[]) => {
    if (Object.hasOwn(node, '$value')) {
      found.push({ name: name.join('.'), type: node.$type, value: node.$value });
      return;
    }
    for (const [key, child] of Object.entries(node)) visit(child, [...name, key]);
  };
  for (const [set, tree] of Object.entries(source)) if (!set.startsWith('$')) visit(tree, []);
  return found;
}

const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));

const EXPORT_TOKENS = tokensOf(readJson(EXPORT_FILE));

// The built style sheets, as one text.
function builtCss(): string {
  const { dir, manifest } = builtSite();
  return manifest.files
    .filter((file) => file.type === 'text/css')
    .map((file) => fs.readFileSync(path.join(dir, file.path), 'utf8'))
    .join('\n');
}

// The tokens the built CSS reads with `var()`: a typography token through
// any of its parts. The generated definitions hold no `var()`, since the
// output resolves references, so only the site's own rules count.
function readByCss(css: string): Set<string> {
  const used = new Set([...css.matchAll(/var\(\s*(--token-[A-Za-z0-9_-]+)/g)].map((match) => match[1]!));
  return new Set(
    EXPORT_TOKENS.filter((token) =>
      token.type === 'typography' ? TYPOGRAPHY_PARTS.some((part) => used.has(codeName(`${token.name}.${part}`))) : used.has(codeName(token.name)),
    ).map((token) => token.name),
  );
}

// Breakpoints are read as custom media, or since 005 as container
// queries, which the build replaces with the token's value: `(width>=900px)`
// in the built CSS.
function readAsMedia(css: string): Set<string> {
  const conditions = new Set([...css.matchAll(/@(?:media|container)\s*([^{]*)\{/g)].map((match) => match[1]!.replace(/\s+/g, '')));
  return new Set(
    EXPORT_TOKENS.filter(
      (token) => token.name.startsWith('breakpoint.') && conditions.has(`(width>=${tokenValue(token.name as CssVarTokenName)})`),
    ).map((token) => token.name),
  );
}

// The tokens a set of read tokens refers to, directly or through others.
function withReferences(read: Set<string>): Set<string> {
  const all = new Set(read);
  const byName = new Map(EXPORT_TOKENS.map((token) => [token.name, token]));
  const queue = [...all];
  while (queue.length > 0) {
    const token = byName.get(queue.pop()!);
    for (const [, name] of JSON.stringify(token?.value ?? null).matchAll(/\{([^{}]+)\}/g)) {
      if (!all.has(name!)) {
        all.add(name!);
        queue.push(name!);
      }
    }
  }
  return all;
}

// The tokens the shell's scripts read, all through `src/os/metrics.ts`
// (005 research R7): each is named there as a string.
const METRICS_FILE = 'packages/web/src/os/metrics.ts';

function readByMetrics(): Set<string> {
  const source = fs.readFileSync(path.join(REPO_ROOT, METRICS_FILE), 'utf8');
  const named = new Set([...source.matchAll(/\b(?:px|ms|plain|tokenValue)\('([^']+)'\)/g)].map((match) => match[1]!));
  return new Set(EXPORT_TOKENS.map((token) => token.name).filter((name) => named.has(name)));
}

// Every token the site reads, directly or through a reference.
function readTokens(): Set<string> {
  const css = builtCss();
  return withReferences(new Set([...readByCss(css), ...readAsMedia(css), ...readByMetrics(), ...fonts.families.map((entry) => entry.token)]));
}

describe('004-cv-page-FR-043: the export holds the approved tokens, and the site reads every one', () => {
  test('every token in the export is read: in the built CSS, by the shell metrics, through a token that refers to it, or in fonts.json', () => {
    const read = readTokens();
    expect(EXPORT_TOKENS.length).toBeGreaterThan(0);
    expect(EXPORT_TOKENS.map((token) => token.name).filter((name) => !read.has(name))).toEqual([]);
  });

  // 006-terminal-FR-031: the Terminal's tokens (006 T005) are each read by
  // a style sheet or by `metrics.ts`, not only listed in the export.
  test('006-terminal-FR-031: every token the Terminal added is read by a style sheet or by metrics.ts', () => {
    const read = readTokens();
    const terminal = EXPORT_TOKENS.map((token) => token.name).filter((name) => /terminal|pocket|command-line/.test(name));
    expect(terminal.length).toBeGreaterThan(40);
    expect(terminal.filter((name) => !read.has(name))).toEqual([]);
  });

  test("the export holds design/review.md's five colors, compared without regard to case", () => {
    const review = fs.readFileSync(path.join(REPO_ROOT, 'specs/004-cv-page/design/review.md'), 'utf8');
    const bullet = /^- \*\*Color\*\*:[\s\S]*?(?=\n- |\n\n)/m.exec(review)?.[0] ?? '';
    const reviewColors = [...bullet.matchAll(/`(#[0-9A-Fa-f]{6})`/g)].map((match) => match[1]!.toLowerCase());
    expect(reviewColors).toHaveLength(5);
    const exported = EXPORT_TOKENS.filter((token) => token.type === 'color').map((token) => String(token.value).toLowerCase());
    for (const color of reviewColors) expect(exported, color).toContain(color);
  });

  test('the motion token source is unchanged from 003', () => {
    expect(tokensOf(readJson(MOTION_FILE)).map(({ name, value }) => [name, value])).toEqual([
      ['motion.duration.fast', '150ms'],
      ['motion.duration.base', '250ms'],
      ['motion.duration.slow', '{motion.duration.base} * 2'],
      ['motion.easing.standard', [0.2, 0, 0, 1]],
    ]);
  });
});

// Comments and markers that ask a check, or a linter, to skip something.
const SKIP_MARKERS = [
  /\b(?:token|content)[-_ ]?check\b[^\n]*\b(?:ignore|disable|enable|skip|off|allow|exempt)/i,
  /\b(?:ignore|disable|skip)[-_ ]?(?:token|content)[-_ ]?check\b/i,
  /\b(?:stylelint|eslint|prettier)-(?:disable|ignore)/i,
];

const TEXT_FILES = /\.(?:css|ts|tsx|js|jsx|json|md|txt|html)$/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(file);
    return TEXT_FILES.test(entry.name) ? [file] : [];
  });
}

// The shell's tokens, as the design proposed them (005 design/mockup), with
// the desktop height renamed (research R7).
const SHELL_TOKENS_FILE = 'specs/005-os-shell/design/mockup/proposed-tokens.css';

describe('005-os-shell-FR-045: every one of the shell tokens is read by a style sheet or by the metrics', () => {
  test('the 85 tokens the design added are in the export, and each is read', () => {
    const css = fs.readFileSync(path.join(REPO_ROOT, SHELL_TOKENS_FILE), 'utf8');
    const names = new Set([...css.matchAll(/^\s*(--token-[a-z0-9-]+)\s*:/gm)].map((match) => match[1]!));
    const shell = EXPORT_TOKENS.filter((token) => names.has(codeName(token.name))).map((token) => token.name);
    expect(shell).toHaveLength(85);
    const read = readTokens();
    expect(shell.filter((name) => !read.has(name))).toEqual([]);
  });
});

describe('004-cv-page-FR-044: the site reads every design value from tokens, with no exception', () => {
  test('no file under packages/web/src or packages/web/scripts holds a skip marker for either check', () => {
    const files = [...sourceFiles('packages/web/src'), ...sourceFiles('packages/web/scripts')];
    expect(files.length).toBeGreaterThan(10);
    for (const file of files) {
      const text = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
      for (const marker of SKIP_MARKERS) expect(marker.test(text), `${file} ${marker}`).toBe(false);
    }
  });
});

// `#rrggbb` as Chromium computes it.
function rgb(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  return `rgb(${red}, ${green}, ${blue})`;
}

const names = (type: string) => Object.entries(tokenTypes as Record<string, string>).filter(([, kind]) => kind === type).map(([name]) => name as CssVarTokenName);

const TOKEN_COLORS = new Set(names('color').map((name) => rgb(tokenValue(name))));

const TOKEN_FAMILIES = new Set(names('fontFamilies').map((name) => tokenValue(name)));

const TRANSPARENT = 'rgba(0, 0, 0, 0)';

// Every color and font family an element of the page computes to: text,
// background, visible borders and underlines, and SVG strokes and fills.
function computedValues(page: Page): Promise<{ element: string; property: string; value: string }[]> {
  return page.evaluate(() => {
    const found: { element: string; property: string; value: string }[] = [];
    // The root holds no text: only its background is drawn.
    found.push({ element: 'html', property: 'background-color', value: getComputedStyle(document.documentElement).backgroundColor });
    for (const element of [document.body, ...document.querySelectorAll('body *')]) {
      if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(element.tagName)) continue;
      const style = getComputedStyle(element);
      const label = element.tagName.toLowerCase() + (element.className && typeof element.className === 'string' ? `.${element.className}` : '');
      const add = (property: string, value: string) => found.push({ element: label, property, value });
      add('color', style.color);
      add('font-family', style.fontFamily);
      add('background-color', style.backgroundColor);
      for (const side of ['top', 'right', 'bottom', 'left']) {
        if (style.getPropertyValue(`border-${side}-style`) !== 'none' && Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) > 0) {
          add(`border-${side}-color`, style.getPropertyValue(`border-${side}-color`));
        }
      }
      if (style.textDecorationLine !== 'none') add('text-decoration-color', style.textDecorationColor);
      if (element instanceof SVGElement) {
        add('stroke', style.stroke);
        add('fill', style.fill);
      }
    }
    return found;
  });
}

function nonTokenValues(values: { element: string; property: string; value: string }[]): string[] {
  return values
    .filter(({ property, value }) => {
      if (property === 'font-family') return !TOKEN_FAMILIES.has(value);
      if (value === 'none' || (property === 'background-color' && value === TRANSPARENT)) return false;
      return !TOKEN_COLORS.has(value);
    })
    .map(({ element, property, value }) => `${element} ${property}: ${value}`);
}

describe('004-cv-page-FR-019: the not-found page meets the token requirements of /cv', () => {
  test('on the not-found page and on /cv, at 375 and 1440 px, every computed color and font family is a token value', async () => {
    const { url } = await serveBuilt();
    for (const target of ['/missing-page', '/cv']) {
      for (const width of [375, 1440]) {
        const page = await openPage(`${url}${target}`, { width });
        const values = await computedValues(page);
        expect(values.length, `${target} ${width}px`).toBeGreaterThan(10);
        expect(nonTokenValues(values), `${target} ${width}px`).toEqual([]);
      }
    }
  });
});
