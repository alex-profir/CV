// An example of the CV as data group (research R20, FR-028, FR-029): it
// reads the CV only through `cv`. Its title, description and comments are
// site text with no CV fact (FR-031).
import type { Example } from './types.ts';

export const projectsNewestFirst: Example = {
  id: 'projects-newest-first',
  group: 'cv',
  title: 'Projects, newest first',
  description: "Sorts the CV's projects by date and logs them.",
  runs: 'to-end',
  code: `// The CV's projects, sorted by when they started, newest first.
// Point at projects to see its type: optional fields may be missing.
const dated = (cv.projects ?? []).flatMap((project) =>
  project.startDate === undefined ? [] : [{ name: project.name ?? "", start: project.startDate }],
);

dated.sort((a, b) => b.start.localeCompare(a.start));

for (const { name, start } of dated) {
  console.log(start.slice(0, 4), name);
}
`,
};
