// The pages' render functions, built by Vite's SSR build and called by
// build-site.ts once per route (004 research R1, R2). Nothing is hydrated:
// each returns a complete HTML document.
import { renderToStaticMarkup } from 'react-dom/server';
import type { Resume, SiteData } from '@cv/content';
import { Document } from './pages/Document.tsx';
import type { PageAssets } from './pages/Document.tsx';
import { CvPage } from './pages/CvPage.tsx';
import { NOT_FOUND_TEXT, NotFoundPage } from './pages/NotFoundPage.tsx';

export type { PageAssets };

const DOCTYPE = '<!doctype html>';

export function renderCv({ resume, assets }: { resume: Resume; siteData: SiteData; assets: PageAssets }): string {
  return (
    DOCTYPE +
    renderToStaticMarkup(
      <Document title={resume.basics?.name ?? 'CV'} assets={assets}>
        <CvPage resume={resume} />
      </Document>,
    )
  );
}

export function renderNotFound({ siteData, assets }: { siteData: SiteData; assets: PageAssets }): string {
  return (
    DOCTYPE +
    renderToStaticMarkup(
      <Document title={NOT_FOUND_TEXT.label} assets={assets}>
        <NotFoundPage siteData={siteData} />
      </Document>,
    )
  );
}
