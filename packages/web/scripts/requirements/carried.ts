// Which requirements each app's content and the shell carry (007 research
// R5): every `data-req` written in the modules each reaches by static
// imports, read with 001's own reader. An app's content starts at the
// modules its declaration takes `Content` from. The shell starts at its
// roots and never enters an app's content, so the frames, the dock, the
// menus, an app's icon and About this site are the shell's.
import fs from 'node:fs';
import path from 'node:path';
import type { Node, Program } from 'oxc-parser';
import { parseSource, visitAll } from '../../../../tools/traceability/src/source.ts';
import { readUiFile } from '../../../../tools/traceability/src/ui-files.ts';

export type Carried = {
  // Each view's IDs, as found: 'shell', then each app by its id.
  views: Map<string, Set<string>>;
  // The modules each view reaches, repository-relative.
  modules: Map<string, Set<string>>;
  // Each app's content roots: one module, or one per component an inline
  // `Content` names.
  roots: Map<string, string[]>;
};

const SRC = 'packages/web/src';
const APPS_FILE = `${SRC}/apps/index.ts`;
// The shell's roots: the hydrated shell, the root document, and the root's
// no-script page, which the server render puts beside `#os` rather than
// the root document importing it.
export const SHELL_ROOTS = [`${SRC}/client/os.tsx`, `${SRC}/pages/ShellPage.tsx`, `${SRC}/os/NoScript.tsx`];

// Modules that can hold UI. Style sheets and JSON are bundled too, but hold
// no element.
const MODULE = /\.(?:[cm]?[jt]s|[jt]sx)$/;

const toPosix = (file: string) => file.split(path.sep).join('/');

// A module's text, its tree, and, once read, its data-req references.
type Module = { text: string; program: Program; references?: readonly string[] };
// Each module read so far, by file, so one reading parses each once.
type Modules = Map<string, Module>;

function readModule(root: string, file: string, cache: Modules): Module {
  const cached = cache.get(file);
  if (cached !== undefined) return cached;
  let text: string;
  try {
    text = fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    throw new Error(`${file}: can't be read (${(error as NodeJS.ErrnoException).code ?? 'unknown error'})`, { cause: error });
  }
  const parsed = parseSource(file, text);
  if ('problem' in parsed) throw new Error(`${file}: ${parsed.problem.detail}`);
  const module = { text, program: parsed.program };
  cache.set(file, module);
  return module;
}

// A relative specifier resolved from the importing file, as written: the
// site's imports name their extensions.
function resolve(from: string, specifier: string): string {
  return path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
}

const relative = (specifier: string) => specifier.startsWith('./') || specifier.startsWith('../');

// The value imports of a module: static `import` and `export … from` with a
// relative specifier. Type-only imports bring no element, and packages hold
// no UI (a test checks that), so both are skipped.
function importsOf(file: string, program: Program): string[] {
  const found: string[] = [];
  for (const statement of program.body) {
    if (statement.type === 'ImportDeclaration') {
      if (statement.importKind === 'type') continue;
      const specifiers = statement.specifiers;
      if (specifiers.length > 0 && specifiers.every((specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type')) continue;
    } else if (statement.type === 'ExportNamedDeclaration') {
      if (statement.source === null || statement.exportKind === 'type') continue;
      if (statement.specifiers.length > 0 && statement.specifiers.every((specifier) => specifier.exportKind === 'type')) continue;
    } else if (statement.type === 'ExportAllDeclaration') {
      if (statement.exportKind === 'type') continue;
    } else {
      continue;
    }
    const specifier = statement.source!.value;
    if (relative(specifier)) found.push(resolve(file, specifier));
  }
  return found;
}

// Every module reached from `entries` by value imports, entries included,
// without entering `stops`.
export function reachable(root: string, entries: readonly string[], stops: ReadonlySet<string> = new Set(), cache: Modules = new Map()): Set<string> {
  const seen = new Set<string>();
  const queue = entries.filter((entry) => !stops.has(entry));
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file) || !MODULE.test(file)) continue;
    seen.add(file);
    const { program } = readModule(root, file, cache);
    for (const next of importsOf(file, program)) if (!seen.has(next) && !stops.has(next)) queue.push(next);
  }
  return seen;
}

// The module each imported name comes from, in one module, with the name
// it is exported under there.
function importBindings(file: string, program: Program): Map<string, { module: string; imported: string | null }> {
  const bindings = new Map<string, { module: string; imported: string | null }>();
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type' || !relative(statement.source.value)) continue;
    for (const specifier of statement.specifiers) {
      const imported =
        specifier.type === 'ImportSpecifier' ? (specifier.imported.type === 'Identifier' ? specifier.imported.name : String(specifier.imported.value)) : null;
      bindings.set(specifier.local.name, { module: resolve(file, statement.source.value), imported });
    }
  }
  return bindings;
}

// The object literal a module exports under this name, as
// `export const name = { … }`, through any type annotation, `as` or
// `satisfies`.
function exportedObject(program: Program, name: string): Node | null {
  for (const statement of program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || statement.declaration?.type !== 'VariableDeclaration') continue;
    for (const declarator of statement.declaration.declarations) {
      if (declarator.id.type !== 'Identifier' || declarator.id.name !== name) continue;
      let init: Node | null = declarator.init;
      while (init?.type === 'TSAsExpression' || init?.type === 'TSSatisfiesExpression' || init?.type === 'ParenthesizedExpression') init = init.expression;
      return init?.type === 'ObjectExpression' ? init : null;
    }
  }
  return null;
}

// The value of the object literal's own non-computed property with this
// name, not one in an object nested in it.
function propertyValue(object: Node, name: string): Node | null {
  if (object.type !== 'ObjectExpression') return null;
  for (const property of object.properties) {
    if (property.type !== 'Property' || property.computed) continue;
    const key = property.key.type === 'Identifier' ? property.key.name : property.key.type === 'Literal' ? property.key.value : null;
    if (key === name) return property.value;
  }
  return null;
}

// The apps' declarations, in `APPS` order: each one's file and the name it
// is exported under.
function appFiles(root: string, cache: Modules): { file: string; name: string }[] {
  const { program } = readModule(root, APPS_FILE, cache);
  const bindings = importBindings(APPS_FILE, program);
  let elements: string[] | null = null;
  visitAll(program, (node) => {
    if (node.type !== 'VariableDeclarator' || node.id.type !== 'Identifier' || node.id.name !== 'APPS') return;
    visitAll(node, (inner) => {
      if (elements === null && inner.type === 'ArrayExpression') {
        elements = inner.elements.flatMap((element) => (element?.type === 'Identifier' ? [element.name] : []));
      }
    });
  });
  if (elements === null) throw new Error(`${APPS_FILE}: can't find the APPS list`);
  return (elements as string[]).map((name) => {
    const binding = bindings.get(name);
    if (binding?.imported == null) throw new Error(`${APPS_FILE}: can't find the module ${name} comes from`);
    return { file: binding.module, name: binding.imported };
  });
}

// An app's id and content roots, from its declaration, the object its file
// exports under `name`: the module `Content` is imported from, or, for a
// `Content` written inline, each imported component it renders as an
// element.
function appOf(root: string, file: string, name: string, cache: Modules): { id: string; roots: string[] } {
  const { program } = readModule(root, file, cache);
  const declaration = exportedObject(program, name);
  if (declaration === null) throw new Error(`${file}: can't find the app's declaration, ${name}`);
  const idValue = propertyValue(declaration, 'id');
  if (idValue?.type !== 'Literal' || typeof idValue.value !== 'string') throw new Error(`${file}: can't find the app's id`);
  const bindings = importBindings(file, program);
  const content = propertyValue(declaration, 'Content');
  const roots: string[] = [];
  if (content?.type === 'Identifier') {
    const binding = bindings.get(content.name);
    if (binding !== undefined) roots.push(binding.module);
  } else if (content?.type === 'ArrowFunctionExpression' || content?.type === 'FunctionExpression') {
    // Only elements' names: a helper or text the function also uses isn't
    // content.
    visitAll(content, (node) => {
      if (node.type !== 'JSXOpeningElement' || node.name.type !== 'JSXIdentifier') return;
      const module = bindings.get(node.name.name)?.module;
      if (module !== undefined && !roots.includes(module)) roots.push(module);
    });
  }
  if (roots.length === 0) throw new Error(`${file}: can't find the module the app's Content comes from`);
  return { id: idValue.value, roots };
}

// The data-req references written in the modules.
function referencesOf(root: string, modules: Iterable<string>, cache: Modules): Set<string> {
  const references = new Set<string>();
  for (const file of modules) {
    const module = readModule(root, file, cache);
    if (module.references === undefined) {
      const { references: found, problem } = readUiFile(file, module.text);
      if (problem !== null) throw new Error(`${file}: ${problem.detail}`);
      module.references = found.map((token) => token.text);
    }
    for (const reference of module.references) references.add(reference);
  }
  return references;
}

export function readCarried(root: string): Carried {
  const cache: Modules = new Map();
  const apps = appFiles(root, cache).map(({ file, name }) => appOf(root, toPosix(file), name, cache));
  const stops = new Set(apps.flatMap((app) => app.roots));
  const modules = new Map<string, Set<string>>([['shell', reachable(root, SHELL_ROOTS, stops, cache)]]);
  for (const app of apps) modules.set(app.id, reachable(root, app.roots, new Set(), cache));
  const views = new Map([...modules].map(([view, files]) => [view, referencesOf(root, files, cache)] as const));
  return { views, modules, roots: new Map(apps.map((app) => [app.id, app.roots])) };
}
