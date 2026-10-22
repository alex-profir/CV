import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { Validator } from 'jsonschema';
import type { Schema } from 'jsonschema';
import { formatPath, locate } from './json.ts';
import type { DocumentRead, FieldPath } from './json.ts';
import { OFFICIAL_SCHEMA_VERSION } from './paths.ts';
import type { Problem } from './report.ts';

type SchemaNode = Record<string, any>;

// An instance path pattern: property names, with `*` for any array item or
// map value.
export type Pattern = string[];

const NOT_INSTALLED = `@jsonresume/schema ${OFFICIAL_SCHEMA_VERSION} is not installed (run npm ci)`;

// The official schema, read from the installed package. It's resolved from the
// check's own location, never the run root, so sample projects need no
// node_modules of their own.
export function loadOfficialSchema(): { schema: object; version: string } {
  const require = createRequire(import.meta.url);
  let packageFile: string;
  try {
    packageFile = require.resolve('@jsonresume/schema/package.json');
  } catch {
    throw new Error(NOT_INSTALLED);
  }
  try {
    const { version } = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    if (version !== OFFICIAL_SCHEMA_VERSION) throw new Error(NOT_INSTALLED);
    const schema = JSON.parse(fs.readFileSync(path.join(path.dirname(packageFile), 'schema.json'), 'utf8'));
    return { schema, version };
  } catch {
    throw new Error(NOT_INSTALLED);
  }
}

function isNode(value: unknown): value is SchemaNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Every schema node reachable from the root through properties, items and
// $refs to `#/definitions/<name>`, with its instance path pattern. A $ref is
// followed once per path, so recursive definitions can't loop.
function instanceNodes(schema: object): { pattern: Pattern; node: SchemaNode }[] {
  const root = schema as SchemaNode;
  const found: { pattern: Pattern; node: SchemaNode }[] = [];
  const visit = (node: unknown, pattern: Pattern, refs: string[]) => {
    if (!isNode(node)) return;
    found.push({ pattern, node });
    if (typeof node.$ref === 'string') {
      const name = /^#\/definitions\/(.+)$/.exec(node.$ref)?.[1];
      if (name !== undefined && !refs.includes(name)) visit(root.definitions?.[name], pattern, [...refs, name]);
    }
    if (isNode(node.properties)) {
      for (const [key, child] of Object.entries(node.properties)) visit(child, [...pattern, key], refs);
    }
    if (isNode(node.items)) visit(node.items, [...pattern, '*'], refs);
    if (isNode(node.additionalProperties)) visit(node.additionalProperties, [...pattern, '*'], refs);
  };
  visit(root, [], []);
  return found;
}

// The instance path patterns of every node where `test` holds, without
// repeats, in walk order.
export function instancePatterns(schema: object, test: (node: SchemaNode) => boolean): Pattern[] {
  const seen = new Set<string>();
  const result: Pattern[] = [];
  for (const { pattern, node } of instanceNodes(schema)) {
    const key = JSON.stringify(pattern);
    if (test(node) && !seen.has(key)) {
      seen.add(key);
      result.push(pattern);
    }
  }
  return result;
}

// The schema the check validates with (research R4): every object schema with
// `properties` accepts no other field, and every `format` is removed and
// recorded, for the check's own format rules. The input isn't changed.
export function deriveSchema(schema: object): { schema: object; formats: { pattern: Pattern; format: string }[] } {
  const formats: { pattern: Pattern; format: string }[] = [];
  const seen = new Set<string>();
  for (const { pattern, node } of instanceNodes(schema)) {
    const key = JSON.stringify([pattern, node.format]);
    if (typeof node.format === 'string' && !seen.has(key)) {
      seen.add(key);
      formats.push({ pattern, format: node.format });
    }
  }

  const derived = structuredClone(schema) as SchemaNode;
  const strip = (node: unknown) => {
    if (!isNode(node)) return;
    if (isNode(node.properties)) {
      node.additionalProperties = false;
      for (const child of Object.values(node.properties)) strip(child);
    }
    if (typeof node.format === 'string') delete node.format;
    if (isNode(node.items)) strip(node.items);
    if (isNode(node.additionalProperties)) strip(node.additionalProperties);
    if (isNode(node.definitions)) for (const child of Object.values(node.definitions)) strip(child);
  };
  strip(derived);
  return { schema: derived, formats };
}

// Whether a concrete path matches a pattern, `*` matching any one step.
export function matchesPattern(fieldPath: FieldPath, pattern: Pattern): boolean {
  return fieldPath.length === pattern.length && pattern.every((part, index) => part === '*' || part === fieldPath[index]);
}

// The values present at a pattern, with their paths.
export function valuesAt(value: unknown, pattern: Pattern): { path: FieldPath; value: unknown }[] {
  let current: { path: FieldPath; value: unknown }[] = [{ path: [], value }];
  for (const part of pattern) {
    const next: { path: FieldPath; value: unknown }[] = [];
    for (const item of current) {
      if (part === '*') {
        if (Array.isArray(item.value)) item.value.forEach((child, index) => next.push({ path: [...item.path, index], value: child }));
        else if (isNode(item.value)) for (const [key, child] of Object.entries(item.value)) next.push({ path: [...item.path, key], value: child });
      } else if (isNode(item.value) && Object.hasOwn(item.value, part)) {
        next.push({ path: [...item.path, part], value: item.value[part] });
      }
    }
    current = next;
  }
  return current;
}

// The value at a concrete path, or undefined.
export function valueAt(value: unknown, fieldPath: FieldPath): unknown {
  let current = value;
  for (const part of fieldPath) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string | number, unknown>)[part];
  }
  return current;
}

export type SchemaError = { keyword: string; path: FieldPath; argument: unknown };

export type Attribute = (instance: unknown, schema: SchemaNode, options: unknown, context: { path: FieldPath }) => undefined;

// Every error `jsonschema` finds, in one pass. `attributes` registers extra
// keywords, such as `x-cv-reference`.
export function validate(schema: object, value: unknown, attributes: Record<string, Attribute> = {}): SchemaError[] {
  const validator = new Validator();
  for (const [name, attribute] of Object.entries(attributes)) {
    (validator.attributes as Record<string, unknown>)[name] = attribute;
  }
  return validator
    .validate(value, schema as Schema)
    .errors.map((error) => ({ keyword: error.name, path: error.path, argument: error.argument }));
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function withArticle(type: string): string {
  if (type === 'null') return type;
  return `${/^[aeiou]/.test(type) ? 'an' : 'a'} ${type}`;
}

const RULE_KEYWORDS = ['minLength', 'maxLength', 'minimum', 'maximum', 'minItems', 'maxItems', 'uniqueItems'];

export const DATE_FORM_DETAIL = 'is not a date of the form YYYY, YYYY-MM or YYYY-MM-DD';

// Schema errors as problems (data-model.md, Problem rules). One field gets at
// most one problem of each type.
export function schemaProblems(
  read: DocumentRead,
  errors: SchemaError[],
  options: { undefinedDetail: string; datePatterns: Pattern[] },
): Problem[] {
  const problems: Problem[] = [];
  const seen = new Set<string>();
  const add = (problem: Problem) => {
    const key = `${problem.type} ${problem.subject}`;
    if (seen.has(key)) return;
    seen.add(key);
    problems.push(problem);
  };

  for (const error of errors) {
    const at = error.path;
    const value = valueAt(read.value, at);
    const atValue = (detail: string, type: Problem['type'] = 'schema-violation') =>
      add({ type, subject: formatPath(at), location: locate(read, at, 'value'), detail });

    if (error.keyword === 'additionalProperties') {
      const field = [...at, String(error.argument)];
      add({ type: 'undefined-field', subject: formatPath(field), location: locate(read, field, 'key'), detail: options.undefinedDetail });
    } else if (error.keyword === 'pattern' && options.datePatterns.some((pattern) => matchesPattern(at, pattern))) {
      atValue(`${JSON.stringify(value)} ${DATE_FORM_DETAIL}`, 'invalid-date');
    } else if (error.keyword === 'type') {
      const expected = (Array.isArray(error.argument) ? error.argument : [error.argument]).map((type) => withArticle(String(type)));
      atValue(`must be ${expected.join(' or ')}, not ${withArticle(typeName(value))}`);
    } else if (error.keyword === 'required') {
      atValue(`required field ${JSON.stringify(error.argument)} is missing`);
    } else if (error.keyword === 'enum') {
      atValue(`must be one of ${(error.argument as unknown[]).map((item) => JSON.stringify(item)).join(', ')}`);
    } else if (error.keyword === 'const') {
      atValue(`must be ${JSON.stringify(error.argument)}`);
    } else if (error.keyword === 'pattern') {
      atValue(`does not match the pattern ${JSON.stringify(error.argument)}`);
    } else if (RULE_KEYWORDS.includes(error.keyword)) {
      atValue(`breaks the rule ${error.keyword}: ${JSON.stringify(error.argument)}`);
    } else {
      atValue(`breaks the rule ${error.keyword}`);
    }
  }
  return problems;
}
