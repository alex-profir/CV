import { ENTRY_KINDS, entriesOf, identityKey } from './entries.ts';
import type { EntryKind } from './entries.ts';
import { FORMAT_RULES } from './formats.ts';
import { formatPath, locate } from './json.ts';
import type { DocumentRead, FieldPath } from './json.ts';
import type { Problem } from './report.ts';
import { deriveSchema, schemaProblems, validate, valuesAt } from './schema.ts';
import type { Pattern } from './schema.ts';

type SchemaNode = Record<string, any>;

// The rules, derived for validation (research R4), with the format locations
// the check's own rules apply to.
export type Rules = { schema: object; formats: { pattern: Pattern; format: string }[] };

// A value in site data that names a CV entry (data-model.md, Reference).
export type Reference = { path: FieldPath; kind: string; value: unknown };

function isNode(value: unknown): value is SchemaNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// `a work`, `an education`.
function withArticle(word: string): string {
  return `${/^[aeiou]/.test(word) ? 'an' : 'a'} ${word}`;
}

// `name`, `name and date`, `name, position and startDate`.
function fieldList(items: string[]): string {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

// Every schema node in the rules file, with its path in that file.
function rulesNodes(node: unknown, at: FieldPath = []): { node: SchemaNode; at: FieldPath }[] {
  if (!isNode(node)) return [];
  const found = [{ node, at }];
  for (const key of ['properties', 'definitions']) {
    if (isNode(node[key])) for (const [name, child] of Object.entries(node[key])) found.push(...rulesNodes(child, [...at, key, name]));
  }
  for (const key of ['items', 'additionalProperties']) found.push(...rulesNodes(node[key], [...at, key]));
  return found;
}

// Why a reference schema has the wrong form for its kind, or undefined.
function referenceFormProblem(node: SchemaNode, name: string, kind: EntryKind): string | undefined {
  if (kind.fields.length === 1) return node.type === 'string' ? undefined : `${withArticle(name)} reference must be a string`;
  const fields = isNode(node.properties) ? Object.keys(node.properties) : [];
  const exact = node.type === 'object' && fields.length === kind.fields.length && kind.fields.every((field) => fields.includes(field));
  return exact ? undefined : `${withArticle(name)} reference must be an object with ${fieldList(kind.fields)}`;
}

// The rules, or the problem that makes them unusable for this run (FR-005,
// contracts/site-data-rules.md).
export function loadRules(read: DocumentRead): { rules: Rules | null; problem: Problem | null } {
  const unusable = (at: FieldPath, reason: string) => ({
    rules: null,
    problem: { type: 'unreadable-document', subject: read.file, location: locate(read, at, 'value'), detail: `cannot be used as rules: ${reason}` } satisfies Problem,
  });

  for (const { node, at } of rulesNodes(read.value)) {
    if (Object.hasOwn(node, 'x-cv-reference')) {
      const name = node['x-cv-reference'];
      const kind = typeof name === 'string' && Object.hasOwn(ENTRY_KINDS, name) ? ENTRY_KINDS[name] : undefined;
      if (kind === undefined) return unusable([...at, 'x-cv-reference'], `unknown reference kind ${JSON.stringify(name)}`);
      const wrongForm = referenceFormProblem(node, name, kind);
      if (wrongForm !== undefined) return unusable([...at, 'x-cv-reference'], wrongForm);
    }
    if (Object.hasOwn(node, 'format') && !(typeof node.format === 'string' && Object.hasOwn(FORMAT_RULES, node.format))) {
      return unusable([...at, 'format'], `unsupported format ${JSON.stringify(node.format)}`);
    }
  }

  const rules = deriveSchema(read.value as object);
  try {
    validate(rules.schema, {});
  } catch (error) {
    return unusable([], error instanceof Error ? error.message : String(error));
  }
  return { rules, problem: null };
}

// Validates site data against its rules (FR-005, FR-017), collecting every
// reference on the way (research R7).
export function siteDataRules(site: DocumentRead, rules: Rules): { problems: Problem[]; references: Reference[] } {
  const references = new Map<string, Reference>();
  const errors = validate(rules.schema, site.value, {
    // jsonschema also calls attributes for properties that are absent.
    'x-cv-reference': (instance, schema, _options, context) => {
      if (instance !== undefined) references.set(JSON.stringify(context.path), { path: context.path, kind: schema['x-cv-reference'], value: instance });
      return undefined;
    },
  });
  const problems = schemaProblems(site, errors, { undefinedDetail: 'not a field defined by the site data rules', datePatterns: [] });
  for (const { pattern, format } of rules.formats) {
    const rule = FORMAT_RULES[format]!;
    for (const { path: fieldPath, value } of valuesAt(site.value, pattern)) {
      if (typeof value === 'string' && !rule.test(value)) {
        problems.push({ type: 'invalid-format', subject: formatPath(fieldPath), location: locate(site, fieldPath, 'value'), detail: rule.detail(value) });
      }
    }
  }
  return { problems, references: [...references.values()] };
}

// Resolves each reference against the CV (FR-018, FR-019, FR-021).
export function resolveReferences(references: Reference[], site: DocumentRead, resume: DocumentRead): Problem[] {
  const problems: Problem[] = [];
  for (const reference of references) {
    const kind = ENTRY_KINDS[reference.kind]!;
    const add = (type: Problem['type'], detail: string) =>
      problems.push({ type, subject: formatPath(reference.path), location: locate(site, reference.path, 'value'), detail });

    const { value } = reference;
    const single = kind.fields.length === 1;
    const fields: Record<string, unknown> | undefined = single
      ? typeof value === 'string'
        ? { [kind.fields[0]!]: value }
        : undefined
      : isNode(value) && Object.keys(value).length === kind.fields.length && kind.fields.every((field) => typeof value[field] === 'string')
        ? value
        : undefined;
    if (fields === undefined) {
      add('dangling-reference', `${withArticle(reference.kind)} reference needs ${fieldList(kind.fields)}`);
      continue;
    }

    const key = identityKey(fields, kind);
    const matches = entriesOf(resume.value, kind).filter(({ entry }) => isNode(entry) && identityKey(entry, kind) === key);
    const pairs = fieldList(kind.fields.map((field) => `${field} ${JSON.stringify(fields[field])}`));
    if (matches.length === 0) {
      add('dangling-reference', `no ${kind.noun} with ${pairs} exists in the CV document`);
    } else if (matches.length > 1) {
      const valueText = single ? JSON.stringify(value) : pairs;
      add('ambiguous-reference', `${valueText} matches ${matches.length} ${kind.plural} in the CV document: ${matches.map(({ path }) => formatPath(path)).join(', ')}`);
    }
  }
  return problems;
}
