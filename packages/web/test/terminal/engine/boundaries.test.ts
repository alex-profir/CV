// The Terminal's engine and its shell stay pure (006 research R2, R23,
// contracts/shell-worker.md): no React, no DOM, no tokens, no component and
// no style sheet, so they run and are tested in Node, and design values and
// words reach them only as arguments. The engine never reaches the shell,
// and the page reaches the shell only through shell-client.ts.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';

const TERMINAL = path.resolve(import.meta.dirname, '../../../src/apps/terminal');
const ENGINE = path.join(TERMINAL, 'engine');
const SHELL = path.join(TERMINAL, 'shell');

const filesIn = (folder: string) => fs.readdirSync(folder).filter((name) => /\.tsx?$/.test(name));
const files = () => filesIn(ENGINE);

// Every file of the Terminal outside shell/, as a path from the Terminal's
// folder.
const outsideShell = (folder = TERMINAL): string[] =>
  fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const at = path.join(folder, entry.name);
    if (entry.isDirectory()) return at === SHELL ? [] : outsideShell(at);
    return /\.tsx?$/.test(entry.name) ? [path.relative(TERMINAL, at)] : [];
  });

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

describe('the shell imports no React, DOM, token, component or style sheet, and only the page’s client reaches it', () => {
  const shellFiles = () => filesIn(SHELL);

  test('the shell folder holds TypeScript files only', () => {
    expect(shellFiles().length).toBeGreaterThan(0);
    for (const name of shellFiles()) expect(name, name).toMatch(/\.ts$/);
  });

  test('no shell file imports react, react-dom, @cv/tokens, a .tsx or .css file, or metrics.ts, or names document, window or navigator', () => {
    for (const name of shellFiles()) {
      const source = fs.readFileSync(path.join(SHELL, name), 'utf8');
      for (const specifier of imports(source)) {
        for (const forbidden of FORBIDDEN_IMPORTS) expect(forbidden.test(specifier), `shell/${name} imports ${specifier} (${forbidden.name})`).toBe(false);
      }
      expect(code(source), `shell/${name}`).not.toMatch(/\b(?:document|window|navigator)\b/);
    }
  });

  test('no engine file imports just-bash or the shell', () => {
    for (const name of files()) {
      for (const specifier of imports(fs.readFileSync(path.join(ENGINE, name), 'utf8'))) {
        expect(specifier.startsWith('just-bash'), `engine/${name} imports ${specifier}`).toBe(false);
        expect(specifier.includes('/shell/') || specifier.startsWith('../shell'), `engine/${name} imports ${specifier}`).toBe(false);
      }
    }
  });

  test('outside shell/, the Terminal imports only shell/protocol.ts, and shell-client.ts names the worker only through new URL', () => {
    for (const name of outsideShell()) {
      const source = fs.readFileSync(path.join(TERMINAL, name), 'utf8');
      for (const specifier of imports(source)) {
        expect(specifier.startsWith('just-bash'), `${name} imports ${specifier}`).toBe(false);
        if (/(^|\/)shell\//.test(specifier)) expect(specifier, `${name} imports ${specifier}`).toMatch(/(^|\/)shell\/protocol\.ts$/);
      }
      const named = [...code(source).matchAll(/['"]([^'"]*shell\/(?!protocol\.ts)[^'"]+)['"]/g)].map((match) => match[0]);
      if (name === 'shell-client.ts') {
        for (const specifier of named) expect(code(source), name).toContain(`new URL(${specifier}, import.meta.url)`);
      } else expect(named, name).toEqual([]);
    }
  });
});
