// The examples, in the design's order (wireframes, Examples): Welcome, then
// the Types, Running and CV groups. The starting example's text depends on
// the visitor's system, so the list is built for it.
import { anEndlessLoop } from './an-endless-loop.ts';
import { anInterval } from './an-interval.ts';
import { basicTypes } from './basic-types.ts';
import { catchingErrors } from './catching-errors.ts';
import { findASkill } from './find-a-skill.ts';
import { generics } from './generics.ts';
import { narrowing } from './narrowing.ts';
import { projectsNewestFirst } from './projects-newest-first.ts';
import { skillsAtAGlance } from './skills-at-a-glance.ts';
import { timersAndPromises } from './timers-and-promises.ts';
import type { Example } from './types.ts';
import { welcome } from './welcome.ts';

export type { Example };
export { welcome };

export function examples(mac: boolean): readonly Example[] {
  return [welcome(mac), basicTypes, narrowing, generics, timersAndPromises, anInterval, catchingErrors, anEndlessLoop, projectsNewestFirst, skillsAtAGlance, findASkill];
}
