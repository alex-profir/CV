// The starting example (FR-019, FR-028, research R20). Its key names follow
// the visitor's system.
import type { Example } from './types.ts';

export function welcome(mac: boolean): Example {
  const run = mac ? 'Cmd+Enter' : 'Ctrl+Enter';
  const other = mac ? 'Ctrl+Enter on Windows and Linux' : 'Cmd+Enter on a Mac';
  return {
    id: 'welcome',
    group: 'start',
    title: 'Welcome',
    description: 'What the Playground is and how to run code.',
    runs: 'to-end',
    code: `// Welcome to the Playground, a TypeScript editor that runs in your browser.
// Errors show as you type, and pointing at a name shows its type.
// Run the code with ${run} (${other}):
// what it logs shows in Logs.

type Greeting = { name: string; times: number };

function greet({ name, times }: Greeting): string {
  return \`Hello, \${name}! \`.repeat(times).trim();
}

console.log(greet({ name: "TypeScript", times: 2 }));

// The CV is here too, as typed data. Try typing cv. to see what it holds.
console.log(cv.basics?.label);
`,
  };
}
