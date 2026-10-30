// An example of the Types group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const generics: Example = {
  id: 'generics',
  group: 'types',
  title: 'Generics',
  description: 'Functions and types that work for any type and keep it exact.',
  runs: 'to-end',
  code: `// A generic function keeps the exact type of what it is given.
function first<T>(items: readonly T[]): T | undefined {
  return items[0];
}

const word = first(["alpha", "beta"]); // string | undefined
const number = first([1, 2, 3]); // number | undefined

// A keyed lookup: the result's type follows the key.
function pick<T, K extends keyof T>(value: T, key: K): T[K] {
  return value[key];
}

const settings = { theme: "night", size: 13, wrap: false };
console.log(word, number, pick(settings, "size"), pick(settings, "wrap"));
`,
};
