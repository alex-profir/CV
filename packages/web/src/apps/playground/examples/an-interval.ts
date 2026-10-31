// An example of the Running group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const anInterval: Example = {
  id: 'an-interval',
  group: 'running',
  title: 'An interval',
  description: 'A timer that repeats until you press Stop.',
  runs: 'interval',
  code: `// An interval repeats until it is cleared, so this run goes on until you press Stop.
let count = 0;
setInterval(() => {
  count += 1;
  console.log(\`Tick \${count}\`);
}, 1_000);
`,
};
