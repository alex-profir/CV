// An example of the Running group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const catchingErrors: Example = {
  id: 'catching-errors',
  group: 'running',
  title: 'Catching errors',
  description: 'An error thrown and caught, and how the logs show it.',
  runs: 'to-end',
  code: `// An error that is caught doesn't end the run. The logs show what was caught.
function parseAge(text: string): number {
  const age = Number(text);
  if (!Number.isInteger(age) || age < 0) throw new RangeError(\`Not an age: \${text}\`);
  return age;
}

for (const text of ["42", "forty-two"]) {
  try {
    console.log(parseAge(text));
  } catch (error) {
    console.error(error);
  }
}
`,
};
