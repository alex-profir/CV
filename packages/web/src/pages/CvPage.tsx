// The /cv page (contracts/page.md /cv structure): the CV document in main,
// then the site footer outside main (FR-025).
import type { Resume, SiteData } from '@cv/content';
import { CvDocument } from '../cv/CvDocument.tsx';
import { SiteFooter } from '../cv/SiteFooter.tsx';

export function CvPage({ resume, siteData }: { resume: Resume; siteData: SiteData }) {
  return (
    <>
      <CvDocument as="main" resume={resume} />
      <SiteFooter siteData={siteData} />
    </>
  );
}
