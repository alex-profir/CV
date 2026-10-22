// The only way site code reads CV data (Constitution IV). Assigning the JSON
// to the generated types makes `npm run typecheck` check the documents against
// their shape (contracts/content-package.md).
import resumeJson from '../resume.json' with { type: 'json' };
import siteJson from '../site.json' with { type: 'json' };
import type { Resume, SiteData } from './shape.generated.ts';

export type * from './shape.generated.ts';

export const resume: Resume = resumeJson;
export const siteData: SiteData = siteJson;
