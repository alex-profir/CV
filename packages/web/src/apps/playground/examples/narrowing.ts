// An example of the Types group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const narrowing: Example = {
  id: 'narrowing',
  group: 'types',
  title: 'Narrowing',
  description: 'How typeof, in and a check on a field narrow a union.',
  runs: 'to-end',
  code: `// A union is narrowed by checks TypeScript understands.
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "label"; text: string };

function describe(shape: Shape): string {
  if ("text" in shape) return \`a label: \${shape.text}\`; // narrowed by "in"
  switch (shape.kind) { // narrowed by a field
    case "circle": return \`a circle of area \${(Math.PI * shape.radius ** 2).toFixed(1)}\`;
    case "square": return \`a square of area \${shape.side ** 2}\`;
  }
}

function size(value: string | number): number {
  return typeof value === "string" ? value.length : value; // narrowed by typeof
}

console.log(describe({ kind: "circle", radius: 2 }));
console.log(describe({ kind: "label", text: "hello" }));
console.log(size("four"), size(4));
`,
};
