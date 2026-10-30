// An example of the Types group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const basicTypes: Example = {
  id: 'basic-types',
  group: 'types',
  title: 'Basic types',
  description: 'Strings, numbers, arrays and objects, and the types TypeScript works out.',
  runs: 'to-end',
  code: `// TypeScript works out most types by itself. Point at each name to see its type.
const title = "Playground";
const lines = 12;
const tags = ["types", "checks"];
const point = { x: 3, y: 4 };

// Some types are written out, where they say what a value may be.
let status: "draft" | "done" = "draft";
status = "done";

const distance = Math.hypot(point.x, point.y);
console.log(title, lines, tags.join(", "), distance, status);
`,
};
