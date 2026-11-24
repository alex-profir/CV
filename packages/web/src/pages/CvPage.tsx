// The /cv page (contracts/page.md /cv structure): the CV document in main,
// with the download row in its intro (011 FR-006), then the site footer
// outside main (FR-025).
import type { Resume, SiteData } from '@cv/content';
import { CvDocument } from '../cv/CvDocument.tsx';
import { SiteFooter } from '../cv/SiteFooter.tsx';
import { downloadName } from '../format/file-name.ts';
import { CV_PDF } from '../routes.ts';

export function CvPage({ resume, siteData }: { resume: Resume; siteData: SiteData }) {
  return (
    <>
      <CvDocument as="main" resume={resume} download={{ href: CV_PDF.path, name: downloadName(resume.basics?.name) }} />
      <SiteFooter siteData={siteData} />
    </>
  );
}
