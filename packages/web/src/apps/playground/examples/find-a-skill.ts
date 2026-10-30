// An example of the CV as data group (research R20, FR-028, FR-029): it
// reads the CV only through `cv`. Its title, description and comments are
// site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const findASkill: Example = {
  id: 'find-a-skill',
  group: 'cv',
  title: 'Find a skill',
  description: "Searches the CV's skills, narrowing its optional fields.",
  runs: 'to-end',
  code: `// Searches the CV's skills. The result is a group or undefined, and
// TypeScript makes the code say what happens in each case.
function findSkill(word: string): ResumeSkill | undefined {
  const wanted = word.toLowerCase();
  return cv.skills?.find((group) =>
    group.keywords?.some((keyword) => keyword.toLowerCase() === wanted),
  );
}

const found = findSkill(cv.skills?.[0]?.keywords?.[0] ?? "");
console.log(found === undefined ? "Not found" : \`In \${found.name ?? "a group"}\`);
console.log(findSkill("cobol") === undefined ? "Not found" : "Found");
`,
};
