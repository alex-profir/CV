// An example of the CV as data group (research R20, FR-028, FR-029): it
// reads the CV only through `cv`. Its title, description and comments are
// site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const skillsAtAGlance: Example = {
  id: 'skills-at-a-glance',
  group: 'cv',
  title: 'Skills at a glance',
  description: "Counts the keywords in each group of the CV's skills.",
  runs: 'to-end',
  code: `// How many keywords each group of the CV's skills holds.
const groups = cv.skills ?? [];
const widest = Math.max(0, ...groups.map((group) => (group.name ?? "").length));

for (const group of groups) {
  const name = (group.name ?? "").padEnd(widest);
  console.log(\`\${name}  \${group.keywords?.length ?? 0}\`);
}
`,
};
