// An example of the Running group (research R20, FR-028). Its title,
// description and comments are site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const anEndlessLoop: Example = {
  id: 'an-endless-loop',
  group: 'running',
  title: 'An endless loop',
  description: 'A loop that never ends, and the popup that offers to stop it.',
  runs: 'endless',
  code: `// This loop never ends and never pauses. After 5 seconds the Playground asks
// whether to stop it. The rest of the site keeps working meanwhile.
let turns = 0;
while (true) {
  turns += 1;
}
`,
};
