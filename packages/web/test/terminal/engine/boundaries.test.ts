// The Terminal's engine stays pure (006 research R2, R23): no React, no DOM,
// no tokens, no component and no style sheet, so it runs and is tested in
// Node, and design values and words reach it only as arguments.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const ENGINE = path.resolve(import.meta.dirname, '../../../src/apps/terminal/engine');

const files = () => fs.readdirSync(ENGINE).filter((name) => /\.tsx?$/.test(name));

const FORBIDDEN_IMPORTS: { name: string; test: (specifier: string) => boolean }[] = [
  { name: 'react', test: (specifier) => specifier === 'react' || specifier.startsWith('react/') },
  { name: 'react-dom', test: (specifier) => specifier.startsWith('react-dom') },
  { name: '@cv/tokens', test: (specifier) => specifier.startsWith('@cv/tokens') },
  { name: 'a component', test: (specifier) => specifier.endsWith('.tsx') },
  { name: 'a style sheet', test: (specifier) => specifier.endsWith('.css') },
  { name: 'metrics.ts', test: (specifier) => specifier.endsWith('/os/metrics.ts') },
];

const imports = (source: string) => [...source.matchAll(/(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g)].map((match) => match[1] ?? match[2] ?? match[3]!);

// The source without its comments, so a comment may name what it avoids.
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

describe('the engine imports no React, DOM, token, component or style sheet', () => {
  test('the engine folder holds TypeScript files only', () => {
    expect(files().length).toBeGreaterThan(0);
    for (const name of files()) expect(name, name).toMatch(/\.ts$/);
  });

  test('no file imports react, react-dom, @cv/tokens, a .tsx or .css file, or metrics.ts', () => {
    for (const name of files()) {
      const source = fs.readFileSync(path.join(ENGINE, name), 'utf8');
      for (const specifier of imports(source)) {
        for (const forbidden of FORBIDDEN_IMPORTS) expect(forbidden.test(specifier), `${name} imports ${specifier} (${forbidden.name})`).toBe(false);
      }
    }
  });

  test('no file names document, window or navigator', () => {
    for (const name of files()) {
      const source = code(fs.readFileSync(path.join(ENGINE, name), 'utf8'));
      expect(source, name).not.toMatch(/\b(?:document|window|navigator)\b/);
    }
  });
});
