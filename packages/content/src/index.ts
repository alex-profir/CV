// The only way site code reads CV data (Constitution IV).
import resumeJson from '../resume.json' with { type: 'json' };
import siteJson from '../site.json' with { type: 'json' };

export const resume = resumeJson;
export const siteData = siteJson;
