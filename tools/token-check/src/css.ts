import { parse } from 'css-tree';
import type { CssNode, FunctionNode } from 'css-tree';
import postcss from 'postcss';
import type { AtRule, ChildNode, Container, Declaration } from 'postcss';
import { createLocator } from '../../traceability/src/source.ts';
import {
  EASING_FUNCTIONS,
  SYSTEM_FONT_KEYWORDS,
  colorFunctionIsLiteral,
  dimensionKind,
  keywordKind,
  NEUTRAL_KEYWORDS,
} from './classify.ts';
import { capabilities } from './grammar.ts';
import type { Capabilities } from './grammar.ts';
import { inTokenNamespace } from './names.ts';
import type { LiteralKind, Location, Problem } from './report.ts';

// What reading one site file found (data-model.md, StyleValue).
export type Findings = {
  // Token names read: in `var()` or a string, or in a media query.
  reads: { name: string; location: Location; media: boolean }[];
  // Names defined in the token namespace.
  definitions: { name: string; location: Location }[];
  literals: Problem[];
  // Set when the file can't be parsed. Nothing else from it is used.
  problem: Problem | null;
};

export function emptyFindings(): Findings {
  return { reads: [], definitions: [], literals: [], problem: null };
}

// Where one value sits, and how its parts are judged.
export type ValueContext = {
  // The whole file text: every node offset is a file offset.
  text: string;
  locate: (offset: number) => Location;
  found: Findings;
  // The property, attribute or option the value sets, in kebab-case, or null.
  property: string | null;
  // Inside a forced-colors condition (FR-056).
  forced: boolean;
  // A plain number is a length here, as in `stroke-width` (FR-053, FR-055).
  plainNumberIsLength: boolean;
};

type Fallback = 'none' | 'token' | 'plain';

const SHADOW_PROPERTIES = ['box-shadow', 'text-shadow'];

const BRANCHING_FUNCTIONS = ['var', 'env'];

function children(node: CssNode): CssNode[] {
  const list = (node as { children?: { toArray(): CssNode[] } | null }).children;
  return list === undefined || list === null ? [] : list.toArray();
}

function nodeText(context: ValueContext, node: CssNode): string {
  return context.text.slice(node.loc!.start.offset, node.loc!.end.offset);
}

function literal(context: ValueContext, kind: LiteralKind, offset: number, text: string, fallback: Fallback) {
  context.found.literals.push({
    type: 'literal-value',
    subject: kind,
    location: context.locate(offset),
    detail:
      fallback === 'token'
        ? `${JSON.stringify(text)} is written out as the fallback of a token; remove it or use a token`
        : `${JSON.stringify(text)} is written out; use a token`,
  });
}

// A plain number written where it means pixels or milliseconds (FR-053).
export function plainNumber(context: ValueContext, kind: 'length' | 'duration', offset: number, number: string) {
  context.found.literals.push({
    type: 'literal-value',
    subject: kind,
    location: context.locate(offset),
    detail: `${number} is a ${kind} written out; use a token`,
  });
}

const HEX = /^(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// Whether a parsed value holds a literal, without reporting it.
function holdsLiteral(context: ValueContext, nodes: CssNode[], caps: Capabilities): boolean {
  const probe: ValueContext = { ...context, found: emptyFindings() };
  for (const node of nodes) scan(probe, node, caps, 'none');
  return probe.found.literals.length > 0;
}

// Classifies every node of a parsed value (contracts/literal-values.md,
// Style sheets), and notes token names read in `var()`.
function scan(context: ValueContext, node: CssNode, caps: Capabilities, fallback: Fallback): void {
  switch (node.type) {
    case 'Dimension': {
      const kind = dimensionKind(node.value, node.unit);
      if (kind !== null) literal(context, kind, node.loc!.start.offset, nodeText(context, node), fallback);
      return;
    }
    case 'Number':
      if (context.plainNumberIsLength && Number(node.value) !== 0) plainNumber(context, 'length', node.loc!.start.offset, nodeText(context, node));
      return;
    case 'Hash':
      if (HEX.test(node.value)) literal(context, 'color', node.loc!.start.offset, nodeText(context, node), fallback);
      return;
    case 'Identifier': {
      const kind = keywordKind(node.name, caps, context.forced);
      if (kind !== null) literal(context, kind, node.loc!.start.offset, nodeText(context, node), fallback);
      return;
    }
    case 'String':
    case 'Url':
    case 'Raw':
      return;
    case 'Function':
      scanFunction(context, node, caps, fallback);
      return;
    default:
      for (const child of children(node)) scan(context, child, caps, fallback);
  }
}

function scanFunction(context: ValueContext, node: FunctionNode, caps: Capabilities, fallback: Fallback): void {
  const name = node.name.toLowerCase();
  if (name === 'url') return;
  if (BRANCHING_FUNCTIONS.includes(name)) {
    const args = children(node);
    const comma = args.findIndex((child) => child.type === 'Operator' && child.value === ',');
    const first = args[0];
    let named: Fallback = 'plain';
    if (name === 'var' && first?.type === 'Identifier' && inTokenNamespace(first.name)) {
      context.found.reads.push({ name: first.name, location: context.locate(first.loc!.start.offset), media: false });
      named = 'token';
    }
    if (comma !== -1) for (const child of args.slice(comma + 1)) scan(context, child, caps, fallback === 'none' ? named : fallback);
    return;
  }
  if (colorFunctionIsLiteral(node)) {
    literal(context, 'color', node.loc!.start.offset, nodeText(context, node), fallback);
    return;
  }
  if (EASING_FUNCTIONS.includes(name)) {
    literal(context, 'easing', node.loc!.start.offset, nodeText(context, node), fallback);
    return;
  }
  if (name === 'drop-shadow') {
    const args = children(node);
    if (holdsLiteral(context, args, capabilities('box-shadow'))) {
      literal(context, 'shadow', node.loc!.start.offset, nodeText(context, node), fallback);
      // Token names inside are still read.
      const reads: ValueContext = { ...context, found: { ...emptyFindings(), reads: context.found.reads } };
      for (const child of args) scan(reads, child, caps, fallback);
      return;
    }
  }
  for (const child of children(node)) scan(context, child, caps, fallback);
}

// The family part of a `font` value: everything after the size and the
// optional `/ line-height`.
function fontFamilyPart(nodes: CssNode[]): number {
  const size = nodes.findIndex(
    (node) =>
      node.type === 'Dimension' ||
      node.type === 'Percentage' ||
      (node.type === 'Function' && ['var', 'calc', 'min', 'max', 'clamp', 'env'].includes(node.name.toLowerCase())) ||
      (node.type === 'Identifier' && keywordKind(node.name, { ...capabilities('font-size'), color: false }, false) !== null),
  );
  if (size === -1) return nodes.length;
  const next = nodes[size + 1];
  return next?.type === 'Operator' && next.value === '/' ? size + 3 : size + 1;
}

// Classifies one declaration value: its own rules for font families and
// shadows, then every node (FR-027 to FR-031, FR-053).
export function scanDeclaration(context: ValueContext, ast: CssNode, start: number, raw: string): void {
  const property = context.property ?? '';
  const caps = capabilities(property);
  const nodes = children(ast).filter((node) => node.type !== 'WhiteSpace');
  const trimmed = raw.trim();
  const at = start + raw.length - raw.trimStart().length;

  if (SHADOW_PROPERTIES.includes(property)) {
    if (holdsLiteral(context, nodes, caps)) {
      literal(context, 'shadow', at, trimmed, 'none');
      const reads: ValueContext = { ...context, found: { ...emptyFindings(), reads: context.found.reads } };
      for (const node of nodes) scan(reads, node, caps, 'none');
    } else {
      for (const node of nodes) scan(context, node, caps, 'none');
    }
    return;
  }

  if (property === 'font-family' || property === 'font') {
    const families = property === 'font' ? fontFamilyPart(nodes) : 0;
    const family = nodes.slice(families);
    const named = family.some(
      (node) => node.type === 'String' || (node.type === 'Identifier' && !NEUTRAL_KEYWORDS.includes(node.name.toLowerCase())),
    );
    if (property === 'font' && nodes.length === 1 && nodes[0]!.type === 'Identifier' && SYSTEM_FONT_KEYWORDS.includes(nodes[0]!.name.toLowerCase())) {
      literal(context, 'font-family', nodes[0]!.loc!.start.offset, nodeText(context, nodes[0]!), 'none');
      return;
    }
    if (named && family.length > 0) {
      const from = family[0]!.loc!.start.offset;
      const to = family.at(-1)!.loc!.end.offset;
      literal(context, 'font-family', from, context.text.slice(from, to), 'none');
    }
    for (const node of nodes.slice(0, families)) scan(context, node, caps, 'none');
    // Token names in the family part are still read.
    const reads: ValueContext = { ...context, found: { ...emptyFindings(), reads: context.found.reads } };
    for (const node of family) scan(reads, node, caps, 'none');
    return;
  }

  for (const node of nodes) scan(context, node, caps, 'none');
}

// Parses a value at a file offset. css-tree recovers from errors with Raw
// nodes, which hold no value the check reads.
export function parseValue(raw: string, offset: number): CssNode | null {
  try {
    return parse(raw, { context: 'value', positions: true, parseCustomProperty: true, offset, onParseError: () => {} });
  } catch {
    return null;
  }
}

function forcedColorsQuery(query: CssNode): boolean {
  if (query.type !== 'MediaQuery' || (query as { modifier?: string | null }).modifier) return false;
  const condition = (query as { condition?: CssNode | null }).condition;
  if (condition === null || condition === undefined) return false;
  const parts = children(condition);
  let forced = false;
  for (const part of parts) {
    if (part.type === 'Identifier') {
      if (part.name.toLowerCase() !== 'and') return false;
    } else if (part.type === 'Feature' && part.name.toLowerCase() === 'forced-colors') {
      const value = part.value;
      if (value === null || (value.type === 'Identifier' && value.name.toLowerCase() === 'active')) forced = true;
      else return false;
    }
  }
  return forced;
}

// A `@media` whose every query requires forced colors, alone or joined with
// `and`, and none negated or joined with `or` (FR-056).
function isForcedColors(atRule: AtRule): boolean {
  if (atRule.name.toLowerCase() !== 'media') return false;
  const ast = parsePrelude(atRule, 0);
  if (ast === null) return false;
  const queries = children(ast);
  return queries.length > 0 && queries.every(forcedColorsQuery);
}

function preludeRaw(atRule: AtRule): string {
  return (atRule.raws.params as { raw?: string } | undefined)?.raw ?? atRule.params;
}

function preludeStart(atRule: AtRule): number {
  return atRule.source!.start!.offset + 1 + atRule.name.length + (atRule.raws.afterName ?? '').length;
}

function parsePrelude(atRule: AtRule, offset: number): CssNode | null {
  try {
    return parse(preludeRaw(atRule), { context: 'mediaQueryList', positions: true, offset, onParseError: () => {} });
  } catch {
    return null;
  }
}

const forcedColors = new WeakMap<AtRule, boolean>();

function inForcedColors(node: ChildNode): boolean {
  for (let parent = node.parent as Container | undefined; parent !== undefined; parent = parent.parent as Container | undefined) {
    if (parent.type !== 'atrule') continue;
    const atRule = parent as AtRule;
    if (!forcedColors.has(atRule)) forcedColors.set(atRule, isForcedColors(atRule));
    if (forcedColors.get(atRule)) return true;
  }
  return false;
}

// Reads a `@media`, `@container` or `@custom-media` prelude: token media
// reads, a custom media definition, and literal values in features.
function readPrelude(atRule: AtRule, context: ValueContext): void {
  const start = preludeStart(atRule);
  const raw = preludeRaw(atRule);
  let body = raw;
  let bodyStart = start;
  if (atRule.name.toLowerCase() === 'custom-media') {
    const name = /^\S+/.exec(raw)?.[0] ?? '';
    if (inTokenNamespace(name)) context.found.definitions.push({ name, location: context.locate(start) });
    body = raw.slice(name.length);
    bodyStart = start + name.length;
  }
  let ast: CssNode | null;
  try {
    ast = parse(body, { context: 'mediaQueryList', positions: true, offset: bodyStart, onParseError: () => {} });
  } catch {
    ast = null;
  }
  if (ast === null) return;
  const visit = (node: CssNode) => {
    if (node.type === 'Feature') {
      if (node.value === null && inTokenNamespace(node.name)) {
        const offset = context.text.indexOf(node.name, node.loc!.start.offset);
        context.found.reads.push({ name: node.name, location: context.locate(offset), media: true });
      } else if (node.value !== null) {
        scan({ ...context, property: node.name }, node.value, capabilities(node.name), 'none');
      }
      return;
    }
    if (node.type === 'FeatureRange') {
      // In `(width >= 768px)`, the identifier is the feature and the rest are
      // its values.
      const parts = [node.left, node.middle, node.right].filter((part) => part !== null);
      const name = parts.find((part) => part.type === 'Identifier')?.name ?? '';
      for (const part of parts) if (part.type !== 'Identifier') scan({ ...context, property: name }, part, capabilities(name), 'none');
      return;
    }
    // A media query holds its features in its condition, not its children.
    const condition = (node as { condition?: CssNode | null }).condition;
    if (condition !== null && condition !== undefined) visit(condition);
    for (const child of children(node)) visit(child);
  };
  visit(ast);
}

// Reads one style sheet (research R14; contracts/literal-values.md).
export function readStyleSheet(file: string, text: string): Findings {
  const found = emptyFindings();
  let root: postcss.Root;
  try {
    root = postcss.parse(text, { from: file });
  } catch (error) {
    const syntax = error as { name?: string; reason?: string; line?: number; column?: number; message?: string };
    found.problem = {
      type: 'unreadable-file',
      subject: file,
      location: { file, line: syntax.line ?? 1, column: syntax.column ?? 1 },
      detail: `cannot be parsed: ${syntax.reason ?? syntax.message ?? String(error)}`,
    };
    return found;
  }
  const locate = createLocator(file, text);
  const base: ValueContext = { text, locate, found, property: null, forced: false, plainNumberIsLength: false };

  root.walk((node) => {
    if (node.type === 'decl') {
      const declaration = node as Declaration;
      const property = declaration.prop;
      if (inTokenNamespace(property)) found.definitions.push({ name: property, location: locate(declaration.source!.start!.offset) });
      const raw = (declaration.raws.value as { raw?: string } | undefined)?.raw ?? declaration.value;
      const start = declaration.source!.start!.offset + property.length + (declaration.raws.between ?? '').length;
      const ast = parseValue(raw, start);
      if (ast === null) return;
      const lower = property.startsWith('--') ? property : property.toLowerCase();
      scanDeclaration(
        { ...base, property: lower, forced: inForcedColors(declaration), plainNumberIsLength: lower === 'stroke-width' },
        ast,
        start,
        raw,
      );
    } else if (node.type === 'atrule') {
      const atRule = node as AtRule;
      if (['media', 'container', 'custom-media'].includes(atRule.name.toLowerCase())) {
        readPrelude(atRule, { ...base, forced: inForcedColors(atRule) });
      }
    }
  });
  return found;
}
