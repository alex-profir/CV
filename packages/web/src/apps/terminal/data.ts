// The Terminal's data, read when the site is built (006 research R10, R11):
// the CV and the site data from @cv/content, the spec list from the build's
// virtual module, which only this module imports, and `cv.json`'s text, the
// CV document's JSON as the content source holds it (FR-055).
import { resume, siteData } from '@cv/content';
import specList from 'virtual:cv-spec-list';

export { resume, siteData, specList };

export const cvJson: string = JSON.stringify(resume, null, 2);
