// An example of the Running group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const timersAndPromises: Example = {
  id: 'timers-and-promises',
  group: 'running',
  title: 'Timers and promises',
  description: 'A run that stays going while timers are pending.',
  runs: 'to-end',
  code: `// A run stays going while timers are pending. Watch the toolbar count them down.
const wait = (ms: number) => new Promise<void>((done) => setTimeout(done, ms));

console.log("Starting");
setTimeout(() => console.info("A 5 second timer fired"), 5_000);
console.info("Waiting 2 seconds");
await wait(2_000);
console.log("Done waiting");
// The run ends when the last timer has fired and nothing is left to do.
`,
};
