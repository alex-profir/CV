import type { Node } from 'oxc-parser';
import { splitDataReq } from './ids.ts';
import type { Token } from './ids.ts';
import type { Problem } from './report.ts';
import { createLocator, literalParts, parseSource, visitAll } from './source.ts';

const ATTRIBUTE = 'data-req';

// A data-req value written literally: a string, or a template literal with no
// substitutions, directly or inside a JSX expression container. A computed
// value can't be checked statically and gives null (research R6).
function literalValue(node: Node | null, text: string): { text: string; offset: number } | null {
  const value = node?.type === 'JSXExpressionContainer' ? node.expression : node;
  if (value?.type === 'TemplateLiteral' && value.expressions.length > 0) return null;
  return literalParts(value, text)[0] ?? null;
}

// The references in a UI source file's data-req JSX attributes and
// 'data-req' object properties. A file that never mentions data-req isn't
// parsed.
export function readUiFile(file: string, text: string): { references: Token[]; problem: Problem | null } {
  if (!text.includes(ATTRIBUTE)) return { references: [], problem: null };
  const parsed = parseSource(file, text);
  if ('problem' in parsed) return { references: [], problem: parsed.problem };

  const locate = createLocator(file, text);
  const references: Token[] = [];
  visitAll(parsed.program, (node) => {
    let value: Node | null = null;
    if (node.type === 'JSXAttribute' && node.name.type === 'JSXIdentifier' && node.name.name === ATTRIBUTE) {
      value = node.value;
    } else if (node.type === 'Property' && !node.computed && node.key.type === 'Literal' && node.key.value === ATTRIBUTE) {
      value = node.value;
    }
    const literal = literalValue(value, text);
    if (literal === null) return;
    for (const piece of splitDataReq(literal.text)) {
      references.push({ text: piece.text, location: locate(literal.offset + piece.index) });
    }
  });
  return { references, problem: null };
}
