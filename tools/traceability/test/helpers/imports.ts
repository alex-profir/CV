// Follows a test file's runtime imports, for the fast set's machine check
// (research R14, rule 3). Test-only: it parses with the check's own wrapper.
import fs from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';
import type { Node } from 'oxc-parser';
import { compare } from '../../src/report.ts';
import { literalParts, parseSource, visitAll } from '../../src/source.ts';

export type ReachRules = { packages: string[]; files: string[]; spawnNames: string[]; npmScripts: string[] };

const CHILD_PROCESS = new Set(['node:child_process', 'child_process']);
const PROCESS_CALLS = new Set(['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']);
const BUILTINS = new Set(builtinModules);
// Modules that are parsed and followed. Anything else (CSS, JSON) is a leaf.
const SCRIPT_FILE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

type Resolved = { file: string } | { packageName: string } | { builtin: true } | { missing: string };

function exists(root: string, file: string): boolean {
  try {
    return fs.statSync(path.join(root, file)).isFile();
  } catch {
    return false;
  }
}

function firstExisting(root: string, base: string): string | undefined {
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((file) => exists(root, file));
}

// `@cv/<name>` and `@cv/<name>/<sub>` through the workspace package's
// `exports`.
function resolveWorkspace(root: string, specifier: string): Resolved {
  const [, name, ...rest] = specifier.split('/');
  const key = rest.length === 0 ? '.' : `./${rest.join('/')}`;
  let exports: unknown;
  try {
    exports = JSON.parse(fs.readFileSync(path.join(root, 'packages', name!, 'package.json'), 'utf8')).exports;
  } catch {
    return { missing: specifier };
  }
  const target = typeof exports === 'string' && key === '.' ? exports : (exports as Record<string, unknown> | undefined)?.[key];
  if (typeof target !== 'string') return { missing: specifier };
  const file = firstExisting(root, path.posix.join('packages', name!, target));
  return file === undefined ? { missing: specifier } : { file };
}

function resolve(root: string, from: string, raw: string): Resolved {
  const specifier = raw.replace(/[?#].*$/, '');
  if (specifier.startsWith('./') || specifier.startsWith('../')) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
    if (base.startsWith('../')) return { missing: base };
    const file = firstExisting(root, base);
    return file === undefined ? { missing: base } : { file };
  }
  if (specifier.startsWith('node:') || BUILTINS.has(specifier)) return { builtin: true };
  if (specifier.startsWith('@cv/')) return resolveWorkspace(root, specifier);
  const parts = specifier.split('/');
  return { packageName: specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]! };
}

// A string literal or a template literal with no substitutions.
function literal(node: Node | null | undefined, text: string): string | undefined {
  if (node?.type === 'TemplateLiteral' && node.expressions.length > 0) return undefined;
  const parts = literalParts(node, text);
  return parts.length === 1 ? parts[0]!.text : undefined;
}

function namesNpmScript(value: string, scripts: string[]): boolean {
  return scripts.some((name) => new RegExp(`\\bnpm run (?:--silent )?${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`).test(value));
}

// The process call in `program` whose literal arguments name a forbidden
// command, described for the chain, or undefined.
function forbiddenCall(program: Node, text: string, rules: ReachRules): string | undefined {
  const functions = new Map<string, string>();
  const namespaces = new Set<string>();
  visitAll(program, (node) => {
    if (node.type !== 'ImportDeclaration' || node.importKind === 'type' || !CHILD_PROCESS.has(node.source.value)) return;
    for (const specifier of node.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
        if (specifier.importKind !== 'type' && PROCESS_CALLS.has(imported)) functions.set(specifier.local.name, imported);
      } else {
        namespaces.add(specifier.local.name);
      }
    }
  });
  let found: string | undefined;
  visitAll(program, (node) => {
    if (found !== undefined || node.type !== 'CallExpression') return;
    const callee = node.callee;
    let name: string | undefined;
    if (callee.type === 'Identifier') name = functions.get(callee.name);
    else if (callee.type === 'MemberExpression' && !callee.computed && callee.object.type === 'Identifier' && namespaces.has(callee.object.name) && callee.property.type === 'Identifier' && PROCESS_CALLS.has(callee.property.name)) name = callee.property.name;
    if (name === undefined) return;
    for (const argument of node.arguments) {
      const elements = argument.type === 'ArrayExpression' ? argument.elements.map((element) => literal(element as Node | null, text)) : [literal(argument as Node, text)];
      for (const [index, value] of elements.entries()) {
        if (value === undefined) continue;
        const afterRun = argument.type === 'ArrayExpression' && elements.slice(0, index).includes('run') && rules.npmScripts.includes(value);
        if (rules.spawnNames.some((spawnName) => value.includes(spawnName)) || afterRun || namesNpmScript(value, rules.npmScripts)) {
          found = `${name}(${JSON.stringify(value)})`;
          return;
        }
      }
    }
  });
  return found;
}

// The runtime import specifiers of `program`, in code-unit order. Type-only
// imports and exports are skipped.
function runtimeImports(program: Node, text: string): string[] {
  const specifiers = new Set<string>();
  visitAll(program, (node) => {
    if (node.type === 'ImportDeclaration' && node.importKind !== 'type') specifiers.add(node.source.value);
    else if ((node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration') && node.source !== null && node.exportKind !== 'type') specifiers.add(node.source.value);
    else if (node.type === 'ImportExpression') {
      const value = literal(node.source, text);
      if (value !== undefined) specifiers.add(value);
    }
  });
  return [...specifiers].sort(compare);
}

// The first forbidden target `file`'s runtime import closure reaches, with the
// chain of modules that leads to it, or null. Paths are relative to `root`
// with `/` separators. Breadth-first, so the chain is a shortest one. A module
// that can't be read or parsed is a target too (fail closed).
export function forbiddenReach(root: string, file: string, rules: ReachRules): { target: string; chain: string[] } | null {
  const parent = new Map<string, string | null>([[file, null]]);
  const chainTo = (module: string): string[] => {
    const chain: string[] = [];
    for (let at: string | null = module; at !== null; at = parent.get(at)!) chain.unshift(at);
    return chain;
  };
  if (rules.files.includes(file)) return { target: file, chain: [file] };
  const queue = [file];
  while (queue.length > 0) {
    const module = queue.shift()!;
    if (!SCRIPT_FILE.test(module)) continue;
    let text: string;
    try {
      text = fs.readFileSync(path.join(root, module), 'utf8');
    } catch {
      return { target: module, chain: chainTo(module) };
    }
    const parsed = parseSource(module, text);
    if ('problem' in parsed) return { target: module, chain: chainTo(module) };
    const program = parsed.program as unknown as Node;
    const call = forbiddenCall(program, text, rules);
    if (call !== undefined) return { target: call, chain: [...chainTo(module), call] };
    for (const specifier of runtimeImports(program, text)) {
      const resolved = resolve(root, module, specifier);
      if ('builtin' in resolved) continue;
      if ('packageName' in resolved) {
        if (rules.packages.includes(resolved.packageName)) return { target: resolved.packageName, chain: [...chainTo(module), resolved.packageName] };
        continue;
      }
      if ('missing' in resolved) return { target: resolved.missing, chain: [...chainTo(module), resolved.missing] };
      if (rules.files.includes(resolved.file)) return { target: resolved.file, chain: [...chainTo(module), resolved.file] };
      if (!parent.has(resolved.file)) {
        parent.set(resolved.file, module);
        queue.push(resolved.file);
      }
    }
  }
  return null;
}
