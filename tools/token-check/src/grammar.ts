import { definitionSyntax, lexer } from 'css-tree';
import type { DSNode } from 'css-tree';

// What a property's value can hold, which decides whether a bare keyword or a
// plain number there is a design value (research R14, R15).
export type Capabilities = { color: boolean; easing: boolean; lineWidth: boolean; fontSize: boolean; length: boolean; time: boolean };

const ALL: Capabilities = { color: true, easing: true, lineWidth: true, fontSize: true, length: true, time: true };

// The capability each grammar type gives.
const TYPES: Record<string, keyof Capabilities> = {
  color: 'color',
  'easing-function': 'easing',
  'line-width': 'lineWidth',
  'absolute-size': 'fontSize',
  'relative-size': 'fontSize',
  length: 'length',
  'length-percentage': 'length',
  time: 'time',
  'time-percentage': 'time',
};

const known = new Map<string, Capabilities>();

// The capabilities of a CSS property, from CSSTree's grammar. A custom
// property, or one the grammar doesn't know, gets all of them, so nothing is
// missed.
export function capabilities(property: string): Capabilities {
  const name = property.toLowerCase();
  const cached = known.get(name);
  if (cached !== undefined) return cached;
  const descriptor = name.startsWith('--') ? null : lexer.getProperty(name);
  let found: Capabilities;
  if (descriptor?.syntax == null) {
    found = ALL;
  } else {
    found = { color: false, easing: false, lineWidth: false, fontSize: false, length: false, time: false };
    const visited = new Set<string>();
    const visit = (syntax: DSNode | null) => {
      if (syntax === null) return;
      definitionSyntax.walk(syntax, (node) => {
        if (node.type === 'Type') {
          const capability = TYPES[node.name];
          if (capability !== undefined) found[capability] = true;
          if (visited.has(`type ${node.name}`)) return;
          visited.add(`type ${node.name}`);
          visit(lexer.getType(node.name)?.syntax ?? null);
        } else if (node.type === 'Property') {
          if (visited.has(`property ${node.name}`)) return;
          visited.add(`property ${node.name}`);
          visit(lexer.getProperty(node.name)?.syntax ?? null);
        }
      });
    };
    visit(descriptor.syntax);
  }
  known.set(name, found);
  return found;
}

// `backgroundColor` → `background-color`, `WebkitX` → `-webkit-x`, `msX` →
// `-ms-x`. Custom properties and kebab-case names are kept as written.
export function kebab(camel: string): string {
  if (camel.startsWith('--') || camel.includes('-')) return camel;
  const prefixed = /^(Webkit|Moz|ms|O)(?=[A-Z])/.test(camel) ? `-${camel}` : camel;
  return prefixed.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).replace(/^--/, '-');
}
