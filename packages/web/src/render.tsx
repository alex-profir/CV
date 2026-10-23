// The pages' render functions, built by Vite's SSR build and called by
// build-site.ts once per route (004 research R1, R2). Nothing is hydrated:
// each returns a complete HTML document.
import { renderToStaticMarkup } from 'react-dom/server';
import type { Resume, SiteData } from '@cv/content';
import { Document } from './pages/Document.tsx';
import type { PageAssets } from './pages/Document.tsx';
import { CvPage } from './pages/CvPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { siteText } from './site-text.ts';

export type { PageAssets };

const DOCTYPE = '<!doctype html>';

export function renderCv({ resume, siteData, assets }: { resume: Resume; siteData: SiteData; assets: PageAssets }): string {
  // US5 adds the role and the description (FR-036, FR-037).
  const name = resume.basics?.name;
  const title = name !== undefined && name !== '' ? name : siteText.siteHeading;
  return (
    DOCTYPE +
    renderToStaticMarkup(
      <Document title={title} assets={assets}>
        <CvPage resume={resume} siteData={siteData} />
      </Document>,
    )
  );
}

export function renderNotFound({ siteData, assets }: { siteData: SiteData; assets: PageAssets }): string {
  return (
    DOCTYPE +
    renderToStaticMarkup(
      <Document title={siteText.notFound.label} assets={assets}>
        <NotFoundPage siteData={siteData} />
      </Document>,
    )
  );
}
