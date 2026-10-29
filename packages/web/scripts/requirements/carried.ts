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

function readModule(root: string, file: string): { text: string; program: Program } {
  let text: string;
  try {
    text = fs.readFileSync(path.join(root, file), 'utf8');
  } catch (error) {
    throw new Error(`${file}: can't be read (${(error as NodeJS.ErrnoException).code ?? 'unknown error'})`, { cause: error });
  }
  const parsed = parseSource(file, text);
  if ('problem' in parsed) throw new Error(`${file}: ${parsed.problem.detail}`);
  return { text, program: parsed.program };
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
export function reachable(root: string, entries: readonly string[], stops: ReadonlySet<string> = new Set()): Set<string> {
  const seen = new Set<string>();
  const queue = entries.filter((entry) => !stops.has(entry));
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (seen.has(file) || !MODULE.test(file)) continue;
    seen.add(file);
    const { program } = readModule(root, file);
    for (const next of importsOf(file, program)) if (!seen.has(next) && !stops.has(next)) queue.push(next);
  }
  return seen;
}

// The module each imported name comes from, in one module.
function importBindings(file: string, program: Program): Map<string, string> {
  const bindings = new Map<string, string>();
  for (const statement of program.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type' || !relative(statement.source.value)) continue;
    for (const specifier of statement.specifiers) bindings.set(specifier.local.name, resolve(file, statement.source.value));
  }
  return bindings;
}

// The value of the last non-computed property with this name in any object
// literal of the module.
function propertyValue(program: Program, name: string): Node | null {
  let value: Node | null = null;
  visitAll(program, (node) => {
    if (node.type !== 'Property' || node.computed) return;
    const key = node.key.type === 'Identifier' ? node.key.name : node.key.type === 'Literal' ? node.key.value : null;
    if (key === name) value = node.value;
  });
  return value;
}

// The apps' declaration files, in `APPS` order.
function appFiles(root: string): string[] {
  const { program } = readModule(root, APPS_FILE);
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
    const file = bindings.get(name);
    if (file === undefined) throw new Error(`${APPS_FILE}: can't find the module ${name} comes from`);
    return file;
  });
}

// An app's id and content roots, from its declaration: the module `Content`
// is imported from, or, for a `Content` written inline, each imported
// component it names.
function appOf(root: string, file: string): { id: string; roots: string[] } {
  const { program } = readModule(root, file);
  const idValue = propertyValue(program, 'id');
  if (idValue?.type !== 'Literal' || typeof idValue.value !== 'string') throw new Error(`${file}: can't find the app's id`);
  const bindings = importBindings(file, program);
  const content = propertyValue(program, 'Content');
  const roots: string[] = [];
  if (content?.type === 'Identifier') {
    const module = bindings.get(content.name);
    if (module !== undefined) roots.push(module);
  } else if (content?.type === 'ArrowFunctionExpression' || content?.type === 'FunctionExpression') {
    visitAll(content, (node) => {
      const name = node.type === 'JSXIdentifier' || node.type === 'Identifier' ? node.name : null;
      const module = name === null ? undefined : bindings.get(name);
      if (module !== undefined && !roots.includes(module)) roots.push(module);
    });
  }
  if (roots.length === 0) throw new Error(`${file}: can't find the module the app's Content comes from`);
  return { id: idValue.value, roots };
}

// The data-req references written in the modules.
function referencesOf(root: string, modules: Iterable<string>): Set<string> {
  const references = new Set<string>();
  for (const file of modules) {
    const { text } = readModule(root, file);
    const { references: found, problem } = readUiFile(file, text);
    if (problem !== null) throw new Error(`${file}: ${problem.detail}`);
    for (const token of found) references.add(token.text);
  }
  return references;
}

export function readCarried(root: string): Carried {
  const apps = appFiles(root).map((file) => appOf(root, toPosix(file)));
  const stops = new Set(apps.flatMap((app) => app.roots));
  const modules = new Map<string, Set<string>>([['shell', reachable(root, SHELL_ROOTS, stops)]]);
  for (const app of apps) modules.set(app.id, reachable(root, app.roots));
  const views = new Map([...modules].map(([view, files]) => [view, referencesOf(root, files)] as const));
  return { views, modules, roots: new Map(apps.map((app) => [app.id, app.roots])) };
}
