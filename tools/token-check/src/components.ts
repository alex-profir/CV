import { parse } from 'css-tree';
import type { CssNode } from 'css-tree';
import type { Node } from 'oxc-parser';
import { createLocator, literalParts, parseSource } from '../../traceability/src/source.ts';
import { REACT_UNITLESS, wholeStringKind } from './classify.ts';
import { emptyFindings, parseValue, plainNumber, scanDeclaration } from './css.ts';
import type { Findings, ValueContext } from './css.ts';
import { capabilities, kebab } from './grammar.ts';

// SVG 2's element names, as JSX writes them.
const SVG_ELEMENTS = new Set(
  `a animate animateMotion animateTransform circle clipPath defs desc ellipse feBlend feColorMatrix
  feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight
  feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode
  feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter
  foreignObject g image line linearGradient marker mask metadata mpath path pattern polygon polyline
  radialGradient rect script set stop style svg switch symbol text textPath title tspan use view`.split(/\s+/),
);

// SVG attributes read as style values, by their CSS property (FR-055).
const SVG_ATTRIBUTES: Record<string, string> = {
  fill: 'fill',
  stroke: 'stroke',
  stopColor: 'stop-color',
  'stop-color': 'stop-color',
  floodColor: 'flood-color',
  'flood-color': 'flood-color',
  lightingColor: 'lighting-color',
  'lighting-color': 'lighting-color',
  color: 'color',
  strokeWidth: 'stroke-width',
  'stroke-width': 'stroke-width',
  fontFamily: 'font-family',
  'font-family': 'font-family',
};

// Elements whose `width` and `height` give the media's own size (FR-028).
const MEDIA_ELEMENTS = ['img', 'video', 'canvas', 'iframe'];

const TOKEN_NAME = /--token-[A-Za-z0-9_-]+/g;

type AnyNode = Node & Record<string, any>;

// How a leaf value is read.
type Setting = {
  // The CSS property, in kebab-case.
  property: string;
  // The key as written, for React's unitless list.
  key?: string;
  // How a plain number is read: as React DOM reads a `style` number, as a
  // length, as a duration in milliseconds, or not at all.
  numbers: 'react' | 'length' | 'duration' | 'none';
};

function unwrap(node: AnyNode | null | undefined): AnyNode | null {
  let current = node ?? null;
  while (
    current !== null &&
    ['ParenthesizedExpression', 'TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression', 'JSXExpressionContainer'].includes(current.type)
  ) {
    current = current.expression as AnyNode;
  }
  return current;
}

// The literal values an expression can take: strings, numbers and template
// literals, through ternaries, `??`, `||`, `&&`, parentheses, `as` and
// `satisfies` (research R16).
function leaves(node: AnyNode | null | undefined): AnyNode[] {
  const current = unwrap(node);
  if (current === null) return [];
  if (current.type === 'ConditionalExpression') return [...leaves(current.consequent), ...leaves(current.alternate)];
  if (current.type === 'LogicalExpression') return [...leaves(current.left), ...leaves(current.right)];
  if (current.type === 'Literal' && (typeof current.value === 'string' || typeof current.value === 'number')) return [current];
  if (current.type === 'TemplateLiteral') return [current];
  if (current.type === 'UnaryExpression' && current.operator === '-' && unwrap(current.argument)?.type === 'Literal' && typeof unwrap(current.argument)!.value === 'number') {
    return [current];
  }
  return [];
}

function propertyName(node: AnyNode): string | null {
  if (node.computed !== true && node.key?.type === 'Identifier') return node.key.name as string;
  const key = unwrap(node.key);
  return key?.type === 'Literal' && typeof key.value === 'string' ? key.value : null;
}

function memberName(node: AnyNode): string | null {
  if (node.type !== 'MemberExpression') return null;
  if (node.computed !== true && node.property?.type === 'Identifier') return node.property.name as string;
  const property = unwrap(node.property);
  return property?.type === 'Literal' && typeof property.value === 'string' ? property.value : null;
}

function stringValue(node: AnyNode | null | undefined): string | null {
  const current = unwrap(node);
  return current?.type === 'Literal' && typeof current.value === 'string' ? current.value : null;
}

// Reads one component file (research R16; contracts/literal-values.md,
// Component code).
export function readComponent(file: string, text: string): Findings {
  const found = emptyFindings();
  const parsed = parseSource(file, text);
  if ('problem' in parsed) {
    found.problem = { type: 'unreadable-file', subject: file, location: parsed.problem.location, detail: parsed.problem.detail };
    return found;
  }
  const locate = createLocator(file, text);
  // Values are classified with a throwaway list of reads: token names in
  // strings are read once, below.
  const context = (setting: Setting): ValueContext => ({
    text,
    locate,
    found: { ...found, reads: [] },
    property: setting.property,
    forced: false,
    // A plain number in a string is a length only where it means user units,
    // as in `stroke-width` and `<svg>`'s size.
    plainNumberIsLength: setting.numbers === 'length' || setting.property === 'stroke-width',
  });
  // String and template nodes already read as style values, or never read.
  const handled = new Set<AnyNode>();
  // String nodes that define a name: `style` keys and setProperty's first
  // argument.
  const defining = new Set<AnyNode>();

  const readNumber = (leaf: AnyNode, setting: Setting) => {
    const number = text.slice(leaf.start, leaf.end);
    if (Number(number) === 0 || setting.property.startsWith('--')) return;
    if (setting.numbers === 'length') return plainNumber(context(setting), 'length', leaf.start, number);
    if (setting.numbers === 'duration') return plainNumber(context(setting), 'duration', leaf.start, number);
    if (setting.numbers !== 'react' || REACT_UNITLESS.includes(setting.key ?? '')) return;
    const caps = capabilities(setting.property);
    if (caps.length) plainNumber(context(setting), 'length', leaf.start, number);
    else if (caps.time) plainNumber(context(setting), 'duration', leaf.start, number);
  };

  // Reads one value as a setting of a property.
  const readValue = (node: AnyNode | null | undefined, setting: Setting) => {
    for (const leaf of leaves(node)) {
      handled.add(leaf);
      if (leaf.type !== 'TemplateLiteral' && typeof leaf.value !== 'string') {
        readNumber(leaf, setting);
        continue;
      }
      for (const part of literalParts(leaf, text)) {
        const ast = parseValue(part.text, part.offset);
        if (ast === null) continue;
        scanDeclaration(context(setting), ast, part.offset, part.text);
      }
    }
  };

  // Reads a declaration list, as in `style.cssText` or a `style` attribute.
  const readDeclarations = (node: AnyNode | null | undefined) => {
    for (const leaf of leaves(node)) {
      handled.add(leaf);
      for (const part of literalParts(leaf, text)) {
        let ast: CssNode;
        try {
          ast = parse(part.text, { context: 'declarationList', positions: true, parseCustomProperty: true, offset: part.offset, onParseError: () => {} });
        } catch {
          continue;
        }
        if (ast.type !== 'DeclarationList') continue;
        for (const declaration of ast.children.toArray()) {
          if (declaration.type !== 'Declaration' || declaration.value.loc === undefined) continue;
          const raw = text.slice(declaration.value.loc.start.offset, declaration.value.loc.end.offset);
          const property = declaration.property.startsWith('--') ? declaration.property : declaration.property.toLowerCase();
          scanDeclaration(context({ property, numbers: 'none' }), declaration.value, declaration.value.loc.start.offset, raw);
        }
      }
    }
  };

  // A `style` prop's object, or a keyframe (FR-028, FR-053).
  const readStyleObject = (node: AnyNode | null | undefined, keyframe: boolean) => {
    const object = unwrap(node);
    if (object?.type !== 'ObjectExpression') return;
    for (const entry of object.properties as AnyNode[]) {
      if (entry.type !== 'Property') continue;
      const key = propertyName(entry);
      if (key === null) continue;
      const keyNode = unwrap(entry.key);
      if (keyNode?.type === 'Literal') {
        handled.add(keyNode);
        if (!keyframe) defining.add(keyNode);
      }
      if (keyframe && (key === 'offset' || key === 'composite')) continue;
      if (keyframe && key === 'easing') {
        readValue(entry.value, { property: 'animation-timing-function', numbers: 'none' });
        continue;
      }
      const setting: Setting = { property: kebab(key), key, numbers: 'react' };
      const value = unwrap(entry.value);
      if (keyframe && value?.type === 'ArrayExpression') for (const item of value.elements as AnyNode[]) readValue(item, setting);
      else readValue(entry.value, setting);
    }
  };

  const readAnimate = (args: AnyNode[]) => {
    const keyframes = unwrap(args[0]);
    if (keyframes?.type === 'ArrayExpression') for (const frame of keyframes.elements as AnyNode[]) readStyleObject(frame, true);
    else readStyleObject(keyframes, true);
    const options = unwrap(args[1]);
    if (options?.type === 'ObjectExpression') {
      for (const entry of options.properties as AnyNode[]) {
        if (entry.type !== 'Property') continue;
        const key = propertyName(entry);
        if (key === 'duration' || key === 'delay' || key === 'endDelay') readValue(entry.value, { property: 'animation-duration', numbers: 'duration' });
        else if (key === 'easing') readValue(entry.value, { property: 'animation-timing-function', numbers: 'none' });
      }
    } else if (options !== null) {
      readValue(options, { property: 'animation-duration', numbers: 'duration' });
    }
  };

  const readAttribute = (name: string, value: AnyNode | null | undefined) => {
    if (name === 'style') return readDeclarations(value);
    const property = SVG_ATTRIBUTES[name];
    if (property !== undefined) readValue(value, { property, numbers: property === 'stroke-width' ? 'length' : 'none' });
  };

  const visit = (node: unknown) => {
    if (typeof node !== 'object' || node === null) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const current = node as AnyNode;
    if (typeof current.type === 'string') inspect(current);
    for (const [key, value] of Object.entries(current)) if (key !== 'parent') visit(value);
  };

  const inspect = (node: AnyNode) => {
    if (node.type === 'JSXOpeningElement') {
      const element = node.name?.type === 'JSXIdentifier' ? (node.name.name as string) : '';
      const svg = /^[a-z]/.test(element) && SVG_ELEMENTS.has(element);
      for (const attribute of node.attributes as AnyNode[]) {
        if (attribute.type !== 'JSXAttribute') continue;
        const name =
          attribute.name.type === 'JSXIdentifier' ? (attribute.name.name as string) : `${attribute.name.namespace.name}:${attribute.name.name.name}`;
        const value = attribute.value as AnyNode | null;
        if (name === 'style') {
          if (unwrap(value)?.type === 'ObjectExpression') readStyleObject(value, false);
          else readDeclarations(value);
        } else if (name === 'className' || name === 'class') {
          leaves(value).forEach((leaf) => handled.add(leaf));
        } else if (MEDIA_ELEMENTS.includes(element) && (name === 'width' || name === 'height')) {
          leaves(value).forEach((leaf) => handled.add(leaf));
        } else if (svg) {
          if (element === 'svg' && (name === 'width' || name === 'height')) readValue(value, { property: name, numbers: 'length' });
          else if (SVG_ATTRIBUTES[name] !== undefined) readAttribute(name, value);
          // Everything else on an SVG element is geometry (FR-055).
          else leaves(value).forEach((leaf) => handled.add(leaf));
        }
      }
    } else if (node.type === 'AssignmentExpression' && node.left?.type === 'MemberExpression') {
      const target = node.left as AnyNode;
      if (memberName(target.object as AnyNode) !== 'style') return;
      const property = memberName(target);
      if (property === 'cssText') readDeclarations(node.right);
      else if (property !== null) readValue(node.right, { property: kebab(property), key: property, numbers: 'react' });
    } else if (node.type === 'CallExpression' && node.callee?.type === 'MemberExpression') {
      const method = memberName(node.callee as AnyNode);
      const args = node.arguments as AnyNode[];
      if (method === 'setProperty') {
        const name = stringValue(args[0]);
        const first = unwrap(args[0]);
        if (first !== null) {
          handled.add(first);
          defining.add(first);
        }
        if (name !== null) readValue(args[1], { property: name.startsWith('--') ? name : name.toLowerCase(), numbers: 'none' });
      } else if (method === 'setAttribute') {
        const name = stringValue(args[0]);
        const first = unwrap(args[0]);
        if (first !== null) handled.add(first);
        if (name !== null) readAttribute(name, args[1]);
      } else if (method === 'animate') {
        readAnimate(args);
      }
    } else if (node.type === 'ImportDeclaration' || node.type === 'ExportNamedDeclaration' || node.type === 'ExportAllDeclaration' || node.type === 'ImportExpression') {
      const source = unwrap(node.source as AnyNode | null);
      if (source !== null) handled.add(source);
    }
  };
  visit(parsed.program);

  // Token names in every string (FR-026, FR-051).
  const strings: AnyNode[] = [];
  const collect = (node: unknown) => {
    if (typeof node !== 'object' || node === null) return;
    if (Array.isArray(node)) {
      node.forEach(collect);
      return;
    }
    const current = node as AnyNode;
    if ((current.type === 'Literal' && typeof current.value === 'string') || current.type === 'TemplateLiteral') strings.push(current);
    for (const [key, value] of Object.entries(current)) if (key !== 'parent') collect(value);
  };
  collect(parsed.program);
  for (const node of strings) {
    for (const part of literalParts(node, text)) {
      for (const match of part.text.matchAll(TOKEN_NAME)) {
        const location = locate(part.offset + match.index);
        if (defining.has(node)) found.definitions.push({ name: match[0], location });
        else found.reads.push({ name: match[0], location, media: false });
      }
      // Constants: a string whose whole text is one design value.
      if (handled.has(node)) continue;
      const kind = wholeStringKind(part.text);
      if (kind === null) continue;
      const leading = part.text.length - part.text.trimStart().length;
      found.literals.push({
        type: 'literal-value',
        subject: kind,
        location: locate(part.offset + leading),
        detail: `${JSON.stringify(part.text.trim())} is written out; use a token`,
      });
    }
  }
  return found;
}
