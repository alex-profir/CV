// Loading a program's code (009 research R3, R4): each file compiled when first
// loaded with indirect `eval`, all on the source's own lines, so an engine's
// places are the visitor's. `acorn` finds what makes it a module and rewrites
// `import`, `export` and `import.meta` in place, into one wrapper of the same form.
import { parse } from 'acorn';
import type { Node, Options, Program } from 'acorn';
import { resolveModuleFile } from '../messages.ts';
import type { Compiled } from '../messages.ts';
import type { Source } from './errors.ts';
import type { Files } from './files.ts';

const ACORN: Options = { ecmaVersion: 'latest', allowHashBang: true };

// Node's modules that aren't offered here: they also say so (FR-020).
const NOT_OFFERED = new Set(['async_hooks', 'child_process', 'cluster', 'console', 'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain', 'http', 'http2', 'https', 'inspector', 'module', 'net', 'perf_hooks', 'process', 'punycode', 'querystring', 'readline', 'repl', 'sea', 'sqlite', 'stream', 'string_decoder', 'test', 'tls', 'trace_events', 'tty', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib']);

const WRAPPER = '(function (exports, require, module, __filename, __dirname) {';
const TS_EXTENSIONS = /\.[cm]?ts$/;

type Ast = Node & Record<string, any>;

export type LoadedModule = {
  id: string;
  path: string;
  exports: unknown;
  filename: string;
  loaded: boolean;
  children: LoadedModule[];
  paths: string[];
  parent: LoadedModule | null | undefined;
  require?: Require;
};

type Require = ((specifier: string) => unknown) & { resolve: (specifier: string) => string; main: LoadedModule | undefined; cache: Record<string, LoadedModule> };

type EsModule = {
  path: string;
  namespace: Record<string, unknown>;
  // Whether it, or anything it imports, has a top-level `await`.
  async: boolean;
  state: 'prepared' | 'running' | 'done';
  run: () => unknown;
  promise: Promise<void> | null;
  error?: { value: unknown };
  statics: EsModule[];
};

export type LoaderDeps = {
  files: Files;
  sources: Map<string, Source>;
  compiled: Compiled | undefined;
  cwd: () => string;
  builtin: (name: string) => unknown;
  has: (name: string) => boolean;
  // Sets the file being loaded, for the place of an error (research R5).
  loading: (path: string | null) => void;
  mapFor: (map: string) => Source['mapped'];
};

function walk(node: unknown, visit: (node: Ast) => void): void {
  if (Array.isArray(node)) {
    for (const each of node) walk(each, visit);
    return;
  }
  if (node === null || typeof node !== 'object' || typeof (node as Ast).type !== 'string') return;
  visit(node as Ast);
  for (const key of Object.keys(node)) {
    const value = (node as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object') walk(value, visit);
  }
}

// Blank text: only its newlines stay, so what follows keeps its line.
const blank = (text: string) => text.replace(/[^\n]/g, ' ');

const SyntaxPlace = (error: unknown): { line: number; column: number } | null => {
  const { loc } = error as { loc?: { line: number; column: number } };
  return loc === undefined ? null : { line: loc.line, column: loc.column + 1 };
};

const withoutHashbang = (text: string) => text.replace(/^#!.*/, (line) => ' '.repeat(line.length));

function patternNames(pattern: Ast, names: string[]): void {
  switch (pattern.type) {
    case 'Identifier':
      names.push(pattern.name);
      break;
    case 'ObjectPattern':
      for (const property of pattern.properties) patternNames(property.type === 'RestElement' ? property.argument : property.value, names);
      break;
    case 'ArrayPattern':
      for (const element of pattern.elements) if (element !== null) patternNames(element, names);
      break;
    case 'AssignmentPattern':
      patternNames(pattern.left, names);
      break;
    case 'RestElement':
      patternNames(pattern.argument, names);
      break;
  }
}

const quote = JSON.stringify;

type Parsed = { ast: Program | null; module: boolean; error?: unknown };

// As Node detects it: CommonJS unless the file's syntax says module.
function parseSource(text: string, kind: 'module' | 'commonjs' | 'detect'): Parsed {
  const asModule = () => parse(text, { ...ACORN, sourceType: 'module' });
  if (kind === 'module') {
    try {
      return { ast: asModule(), module: true };
    } catch (error) {
      return { ast: null, module: true, error };
    }
  }
  try {
    return { ast: parse(text, { ...ACORN, sourceType: 'script', allowReturnOutsideFunction: true }), module: false };
  } catch (error) {
    if (kind === 'commonjs') return { ast: null, module: false, error };
    try {
      return { ast: asModule(), module: true };
    } catch {
      return { ast: null, module: false, error };
    }
  }
}

// An edit of the source, by offsets.
type Edit = { start: number; end: number; text: string };

const applyEdits = (text: string, edits: readonly Edit[]) => {
  let out = '';
  let at = 0;
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    out += text.slice(at, edit.start) + edit.text;
    at = edit.end;
  }
  return out + text.slice(at);
};

const hasTopAwait = (ast: Program) => {
  let found = false;
  const visit = (node: unknown, inFunction: boolean): void => {
    if (found) return;
    if (Array.isArray(node)) {
      for (const each of node) visit(each, inFunction);
      return;
    }
    if (node === null || typeof node !== 'object' || typeof (node as Ast).type !== 'string') return;
    const ast = node as Ast;
    if (!inFunction && (ast.type === 'AwaitExpression' || (ast.type === 'ForOfStatement' && ast.await === true))) {
      found = true;
      return;
    }
    const inner = inFunction || ast.type === 'FunctionDeclaration' || ast.type === 'FunctionExpression' || ast.type === 'ArrowFunctionExpression' || ast.type === 'PropertyDefinition' || ast.type === 'StaticBlock';
    for (const key of Object.keys(ast)) {
      const value = ast[key];
      if (value !== null && typeof value === 'object') visit(value, inner);
    }
  };
  visit(ast, false);
  return found;
};

export function createLoader(deps: LoaderDeps) {
  const { files, sources } = deps;
  const cache: Record<string, LoadedModule> = {};
  const modules = new Map<string, EsModule>();
  let main: LoadedModule | undefined;
  // `-e`'s code as a module: a file that is never on the disk.
  const given = new Map<string, string>();

  const dirname = (path: string) => files.parentOf(path);

  const normal = (path: string) => {
    const out: string[] = [];
    for (const part of path.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') out.pop();
      else out.push(part);
    }
    return `/${out.join('/')}`;
  };

  const isFile = (path: string) => files.get(path)?.kind === 'file';

  // A file, with the extensions Node tries, or a folder's `index` (FR-014).
  const resolveFile = (path: string): string | null => resolveModuleFile(path, deps.compiled !== undefined, (at) => files.get(at)?.kind);

  const isRelative = (specifier: string) => specifier === '.' || specifier === '..' || specifier.startsWith('./') || specifier.startsWith('../') || specifier.startsWith('/');

  const fileSpecifier = (specifier: string) => (specifier.startsWith('file://') ? decodeURIComponent(new URL(specifier).pathname) : specifier);

  const builtinName = (specifier: string) => (specifier.startsWith('node:') ? specifier.slice(5) : specifier);

  // `Cannot find module`, in Node's form (FR-020).
  function missing(specifier: string, stack: readonly string[]): Error {
    const name = builtinName(specifier);
    const extra = NOT_OFFERED.has(name) ? `\nThe module ${name} isn't available in this Terminal.` : '';
    const lines = stack.length === 0 ? '' : `\nRequire stack:\n${stack.map((each) => `- ${each}`).join('\n')}`;
    return Object.assign(new Error(`Cannot find module '${specifier}'${lines}${extra}`), { code: 'MODULE_NOT_FOUND', requireStack: [...stack] });
  }

  function requireStack(parent: LoadedModule | null | undefined): string[] {
    const stack: string[] = [];
    for (let at = parent; at !== null && at !== undefined; at = at.parent) stack.push(at.filename);
    return stack;
  }

  function resolveFrom(specifier: string, from: string, parent: LoadedModule | null): string {
    const target = fileSpecifier(specifier);
    if (isRelative(target)) {
      const found = resolveFile(normal(target.startsWith('/') ? target : `${dirname(from)}/${target}`));
      if (found !== null) return found;
    }
    throw missing(specifier, parent === null ? [from] : requireStack(parent));
  }

  // What the file's code is: its compiled JavaScript, for TypeScript.
  function codeOf(path: string): { code: string; source: Source } {
    const text = given.get(path) ?? files.get(path)!.text;
    const output = deps.compiled?.[path];
    if (TS_EXTENSIONS.test(path)) {
      if (output === undefined) throw Object.assign(new Error(`A TypeScript program must start from a TypeScript file, to load ${path}.`), { code: 'ERR_UNKNOWN_FILE_EXTENSION' });
      if (output.syntax !== undefined) {
        // Stripping types found it: nothing of this file runs (FR-018).
        sources.set(path, { text, prefix: 0 });
        throw Object.defineProperty(new SyntaxError(output.syntax.message), 'place', { value: { file: path, line: output.syntax.line, column: output.syntax.column }, enumerable: false });
      }
      return { code: output.js.replace(/\n?\/\/# sourceMappingURL=.*\s*$/, '\n'), source: { text, prefix: 0, mapped: deps.mapFor(output.map) } };
    }
    return { code: text, source: { text, prefix: 0 } };
  }

  const kindOf = (path: string): 'module' | 'commonjs' | 'detect' => (/\.m[jt]s$/.test(path) ? 'module' : /\.c[jt]s$/.test(path) ? 'commonjs' : 'detect');

  // The engine's message, the place from `acorn`, before any of that file runs
  // (research R5).
  function syntaxFailure(plain: string, path: string, failure: unknown): Error {
    const at = SyntaxPlace(failure);
    let error: Error;
    try {
      // Only parses: the function is never called. The engine's own words.
      (0, eval)(`(function () {\n${plain}\n})`);
      error = new SyntaxError(String((failure as Error).message).replace(/ \(\d+:\d+\)$/, ''));
    } catch (engine) {
      error = engine instanceof SyntaxError ? engine : new SyntaxError(String((failure as Error).message).replace(/ \(\d+:\d+\)$/, ''));
    }
    if (at !== null) {
      const source = sources.get(path);
      const mapped = source?.mapped?.(at.line, at.column);
      Object.defineProperty(error, 'place', { value: { file: path, line: mapped?.line ?? at.line, column: mapped?.column ?? at.column }, enumerable: false });
    }
    return error;
  }

  // `import()` and `import.meta` in any file, by a global that knows the file.
  function dynamicEdits(ast: Program, path: string): Edit[] {
    const edits: Edit[] = [];
    walk(ast, (node) => {
      if (node.type === 'ImportExpression') edits.push({ start: node.start, end: node.source.start, text: `__nodeImport(${quote(path)})(` });
      if (node.type === 'MetaProperty' && node.meta.name === 'import') edits.push({ start: node.start, end: node.end, text: `__nodeMeta(${quote(path)})` });
    });
    return edits;
  }

  // ---- CommonJS --------------------------------------------------------------

  function makeRequire(module: LoadedModule): Require {
    const resolve = (specifier: string) => {
      if (typeof specifier !== 'string') throw Object.assign(new TypeError(`The "id" argument must be of type string. Received ${specifier === null ? 'null' : `type ${typeof specifier}`}`), { code: 'ERR_INVALID_ARG_TYPE' });
      if (deps.has(builtinName(specifier))) return specifier;
      return resolveFrom(specifier, module.filename, module);
    };
    const require = ((specifier: string) => {
      const resolved = resolve(specifier);
      if (deps.has(builtinName(resolved))) return deps.builtin(builtinName(resolved));
      return load(resolved, module);
    }) as Require;
    require.resolve = resolve;
    require.main = main;
    require.cache = cache;
    return require;
  }

  function makeModule(path: string, parent: LoadedModule | null): LoadedModule {
    const module: LoadedModule = { id: parent === null ? '.' : path, path: dirname(path), exports: {}, filename: path, loaded: false, children: [], paths: [], parent };
    module.require = makeRequire(module);
    return module;
  }

  // `require` of a file (FR-014).
  function load(path: string, parent: LoadedModule | null): unknown {
    const cached = cache[path];
    if (cached !== undefined) return cached.exports;
    const module = makeModule(path, parent);
    if (parent === null) {
      main = module;
      module.require!.main = module;
    } else parent.children.push(module);
    if (path.endsWith('.json')) {
      cache[path] = module;
      try {
        module.exports = JSON.parse(files.get(path)!.text.replace(/^﻿/, ''));
      } catch (error) {
        delete cache[path];
        (error as Error).message = `${path}: ${(error as Error).message}`;
        throw error;
      }
      module.loaded = true;
      return module.exports;
    }
    const { code, source } = codeOf(path);
    sources.set(path, source);
    const parsed = parseSource(withoutHashbang(code), kindOf(path));
    if (parsed.ast === null) throw syntaxFailure(withoutHashbang(code), path, parsed.error);
    if (parsed.module) {
      const esm = prepare(path, parent === null ? [] : [parent.filename]);
      if (esm.async) throw Object.assign(new Error('require() cannot be used on an ESM graph with top-level await. Use import() instead.'), { code: 'ERR_REQUIRE_ASYNC_MODULE' });
      runEs(esm);
      module.exports = esm.namespace;
      module.loaded = true;
      cache[path] = module;
      return module.exports;
    }
    source.prefix = WRAPPER.length;
    cache[path] = module;
    const body = applyEdits(withoutHashbang(code), dynamicEdits(parsed.ast, path));
    let done = false;
    try {
      deps.loading(path);
      const wrapper = (0, eval)(`${WRAPPER}${body}\n})\n//# sourceURL=${path}`) as (...values: unknown[]) => unknown;
      wrapper.call(module.exports, module.exports, module.require, module, path, dirname(path));
      done = true;
    } finally {
      deps.loading(null);
      if (!done) delete cache[path];
    }
    module.loaded = true;
    return module.exports;
  }

  // ---- ES modules ------------------------------------------------------------

  function namespaceOf(specifier: string, from: string, stack: readonly string[]): { es: EsModule } | { value: Record<string, unknown> } {
    const name = builtinName(specifier);
    if (deps.has(name)) return { value: commonNamespace(deps.builtin(name)) };
    const target = fileSpecifier(specifier);
    const found = isRelative(target) ? resolveFile(normal(target.startsWith('/') ? target : `${dirname(from)}/${target}`)) : null;
    if (found === null) {
      const error = missing(specifier, []);
      error.message = `Cannot find module '${specifier}' imported from ${from}${NOT_OFFERED.has(name) ? `\nThe module ${name} isn't available in this Terminal.` : ''}`;
      throw Object.assign(error, { code: 'ERR_MODULE_NOT_FOUND' });
    }
    const path = found;
    if (path.endsWith('.json')) return { value: commonNamespace(load(path, null)) };
    const { code } = codeOf(path);
    const parsed = parseSource(withoutHashbang(code), kindOf(path));
    if (!parsed.module && parsed.ast !== null) return { value: commonNamespace(load(path, cache[from] ?? null)) };
    return { es: prepare(path, [...stack, from]) };
  }

  // What a CommonJS module or a built-in gives `import`: its exports as `default`,
  // and their names beside it.
  function commonNamespace(exported: unknown): Record<string, unknown> {
    const namespace: Record<string, unknown> = Object.create(null);
    if ((exported !== null && typeof exported === 'object') || typeof exported === 'function') {
      for (const key of Object.keys(exported as object)) namespace[key] = (exported as Record<string, unknown>)[key];
      if ((exported as { __esModule?: unknown }).__esModule === true && 'default' in (exported as object)) return namespace;
    }
    namespace['default'] = exported;
    return namespace;
  }

    // Parses a module and everything it imports, so a syntax error anywhere stops
  // the program before any of it runs (FR-018), and knows which are asynchronous.
  function prepare(path: string, stack: readonly string[]): EsModule {
    const known = modules.get(path);
    if (known !== undefined) return known;
    const { code, source } = codeOf(path);
    sources.set(path, source);
    const text = withoutHashbang(code);
    const parsed = parseSource(text, 'module');
    if (parsed.ast === null) throw syntaxFailure(text, path, parsed.error);
    const namespace: Record<string, unknown> = Object.create(null);
    Object.defineProperty(namespace, Symbol.toStringTag, { value: 'Module' });
    const es: EsModule = { path, namespace, async: hasTopAwait(parsed.ast), state: 'prepared', run: () => undefined, promise: null, statics: [] };
    modules.set(path, es);
    const edits: Edit[] = dynamicEdits(parsed.ast, path);
    const hoisted: string[] = [];
    const exportsMade: string[] = [];
    const requested: { specifier: string; names: string[] }[] = [];
    let counter = 0;
    const local = () => `__m${(counter += 1)}`;
    const importCode = (specifier: string, names: readonly string[], use: (holder: string) => string) => {
      const holder = local();
      requested.push({ specifier, names: [...names] });
      hoisted.push(`const ${holder}=__AWAIT__(__load(${quote(specifier)},${quote(names)}));${use(holder)}`);
    };
    for (const statement of parsed.ast.body as Ast[]) {
      if (statement.type === 'ImportDeclaration') {
        const specifier = statement.source.value as string;
        const names: string[] = [];
        const bindings: string[] = [];
        for (const each of statement.specifiers as Ast[]) {
          if (each.type === 'ImportDefaultSpecifier') {
            names.push('default');
            bindings.push(`${each.local.name}=@.default`);
          } else if (each.type === 'ImportNamespaceSpecifier') bindings.push(`${each.local.name}=@`);
          else {
            const imported = each.imported.name ?? each.imported.value;
            names.push(imported);
            bindings.push(`${each.local.name}=@[${quote(imported)}]`);
          }
        }
        importCode(specifier, names, (holder) => (bindings.length === 0 ? '' : `const ${bindings.map((each) => each.replaceAll('@', holder)).join(',')};`));
        edits.push({ start: statement.start, end: statement.end, text: blank(text.slice(statement.start, statement.end)) });
      } else if (statement.type === 'ExportAllDeclaration') {
        const specifier = statement.source.value as string;
        const as = statement.exported === null ? null : (statement.exported.name ?? statement.exported.value);
        importCode(specifier, [], (holder) => (as === null ? `__star(${holder});` : `__export({${quote(as)}:()=>${holder}});`));
        edits.push({ start: statement.start, end: statement.end, text: blank(text.slice(statement.start, statement.end)) });
      } else if (statement.type === 'ExportNamedDeclaration') {
        if (statement.source !== null && statement.source !== undefined) {
          const specifier = statement.source.value as string;
          const pairs = (statement.specifiers as Ast[]).map((each) => [each.local.name ?? each.local.value, each.exported.name ?? each.exported.value] as const);
          importCode(specifier, pairs.map(([name]) => name), (holder) => `__export({${pairs.map(([name, as]) => `${quote(as)}:()=>${holder}[${quote(name)}]`).join(',')}});`);
          edits.push({ start: statement.start, end: statement.end, text: blank(text.slice(statement.start, statement.end)) });
        } else if (statement.declaration !== null && statement.declaration !== undefined) {
          const declaration = statement.declaration as Ast;
          const names: string[] = [];
          if (declaration.type === 'VariableDeclaration') for (const each of declaration.declarations) patternNames(each.id, names);
          else names.push(declaration.id.name);
          exportsMade.push(...names.map((name) => `${quote(name)}:()=>${name}`));
          edits.push({ start: statement.start, end: declaration.start, text: blank(text.slice(statement.start, declaration.start)) });
        } else {
          for (const each of statement.specifiers as Ast[]) exportsMade.push(`${quote(each.exported.name ?? each.exported.value)}:()=>${each.local.name}`);
          edits.push({ start: statement.start, end: statement.end, text: blank(text.slice(statement.start, statement.end)) });
        }
      } else if (statement.type === 'ExportDefaultDeclaration') {
        const declaration = statement.declaration as Ast;
        const named = (declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration') && declaration.id !== null;
        if (named) {
          exportsMade.push(`"default":()=>${declaration.id.name}`);
          edits.push({ start: statement.start, end: declaration.start, text: blank(text.slice(statement.start, declaration.start)) });
        } else {
          exportsMade.push('"default":()=>__default');
          const isDeclaration = declaration.type === 'FunctionDeclaration' || declaration.type === 'ClassDeclaration';
          edits.push({ start: statement.start, end: declaration.start, text: `const __default=${isDeclaration ? '(' : ''}` });
          if (isDeclaration) edits.push({ start: declaration.end, end: declaration.end, text: ');' });
        }
      }
    }
    for (const { specifier } of requested) {
      const found = namespaceOf(specifier, path, stack);
      if ('es' in found) {
        es.statics.push(found.es);
        if (found.es.async) es.async = true;
      }
    }
    const awaited = es.async;
    const prefix = `(${awaited ? 'async ' : ''}function (__load,__export,__star) {"use strict";${exportsMade.length === 0 ? '' : `__export({${exportsMade.join(',')}});`}${hoisted.join('').replaceAll('__AWAIT__(', awaited ? '(await ' : '(')}`;
    source.prefix = prefix.length;
    const body = applyEdits(text, edits);
    const wrapped = `${prefix}${body}\n})\n//# sourceURL=${path}`;
    es.run = () => {
      const lookup = (specifier: string, names: readonly string[]) => {
        const found = namespaceOf(specifier, path, stack);
        const check = (namespace: Record<string, unknown>) => {
          for (const name of names) {
            if (!(name in namespace)) throw new SyntaxError(`The requested module '${specifier}' does not provide an export named '${name}'`);
          }
          return namespace;
        };
        if ('value' in found) return check(found.value);
        const dependency = found.es;
        if (dependency.state === 'running') return dependency.namespace;
        const ran = runEs(dependency);
        return ran === undefined ? check(dependency.namespace) : ran.then(() => check(dependency.namespace));
      };
      const define = (getters: Record<string, () => unknown>) => {
        for (const [name, get] of Object.entries(getters)) Object.defineProperty(namespace, name, { get, enumerable: true, configurable: true });
      };
      const star = (from: Record<string, unknown>) => {
        for (const name of Object.keys(from)) if (name !== 'default' && !(name in namespace)) Object.defineProperty(namespace, name, { get: () => from[name], enumerable: true, configurable: true });
      };
      deps.loading(path);
      try {
        const wrapper = (0, eval)(wrapped) as (...values: unknown[]) => unknown;
        return wrapper(lookup, define, star);
      } finally {
        deps.loading(null);
      }
    };
    return es;
  }

  // Runs a module once; a promise if it is asynchronous.
  function runEs(es: EsModule): Promise<void> | undefined {
    if (es.error !== undefined) throw es.error.value;
    if (es.state === 'done' || es.state === 'running') return es.promise ?? undefined;
    es.state = 'running';
    try {
      const result = es.run();
      if (es.async) {
        es.promise = Promise.resolve(result).then(
          () => {
            es.state = 'done';
          },
          (error: unknown) => {
            es.error = { value: error };
            es.state = 'done';
            throw error;
          },
        );
        return es.promise;
      }
      es.state = 'done';
      return undefined;
    } catch (error) {
      es.error = { value: error };
      es.state = 'done';
      throw error;
    }
  }

  // `import()` from any file (FR-014).
  function dynamicImport(from: string, specifier: unknown): Promise<unknown> {
    return Promise.resolve().then(async () => {
      const found = namespaceOf(String(specifier), from, []);
      if ('value' in found) return found.value;
      await runEs(found.es);
      return found.es.namespace;
    });
  }

  const metaOf = (path: string) => ({ url: `file://${path}`, filename: path, dirname: dirname(path), resolve: (specifier: string) => `file://${resolveFrom(specifier, path, null)}` });

  // ---- The entry -------------------------------------------------------------

  // The main script's module-or-not, read before anything runs.
  function isModuleEntry(path: string): boolean {
    if (path.endsWith('.json')) return false;
    const { code, source } = codeOf(path);
    sources.set(path, source);
    const parsed = parseSource(withoutHashbang(code), kindOf(path));
    if (parsed.ast === null) throw syntaxFailure(withoutHashbang(code), path, parsed.error);
    return parsed.module;
  }

  return {
    resolveMain(script: string): string {
      const found = resolveFile(script);
      if (found === null) throw missing(script, []);
      return found;
    },
    isModuleEntry,
    runCommon: (path: string) => void load(path, null),
    runModule(path: string): Promise<void> | undefined {
      return runEs(prepare(path, []));
    },
    // A module for `-e`'s code, or the code to `eval`, in a file that is never
    // on the disk (research R3).
    prepareEval(code: string): { module: boolean } {
      sources.set('[eval]', { text: code, prefix: 0 });
      const parsed = parseSource(code, 'detect');
      if (parsed.ast === null) throw syntaxFailure(code, '[eval]', parsed.error);
      return { module: parsed.module };
    },
    evalScript(code: string): unknown {
      const parsed = parseSource(code, 'detect');
      const body = parsed.ast === null ? code : applyEdits(code, dynamicEdits(parsed.ast, `${deps.cwd()}/[eval]`));
      return (0, eval)(`${body}\n//# sourceURL=[eval]`);
    },
    evalModule(code: string): Promise<void> | undefined {
      const path = `${deps.cwd()}/[eval1]`;
      given.set(path, code);
      return runEs(prepare(path, []));
    },
    evalRequire(): LoadedModule {
      const module = makeModule(`${deps.cwd()}/[eval]`, null);
      module.id = '[eval]';
      module.filename = `${deps.cwd()}/[eval]`;
      main = module;
      module.require!.main = module;
      return module;
    },
    dynamicImport,
    metaOf,
  };

}

export type Loader = ReturnType<typeof createLoader>;
