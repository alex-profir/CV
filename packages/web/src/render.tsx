// The pages' render functions, built by Vite's SSR build and called by
// build-site.ts once per route (004 research R1, R2). Each returns a
// complete HTML document. Only the root's `#os` is hydrated (005 research
// R1): it is rendered with renderToString, the rest as static markup.
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { shellQuery } from '@cv/os-core';
import type { Resume, SiteData } from '@cv/content';
import { Document } from './pages/Document.tsx';
import type { PageAssets } from './pages/Document.tsx';
import { CvPage } from './pages/CvPage.tsx';
import { NotFoundPage } from './pages/NotFoundPage.tsx';
import { ShellPage, withShellPicker } from './pages/ShellPage.tsx';
import { NoScript } from './os/NoScript.tsx';
import { Os } from './os/Os.tsx';
import { METRICS } from './os/metrics.ts';
import { APPS } from './apps/index.ts';
import { pageMeta, shellTitle } from './format/meta.ts';
import { siteText } from './site-text.ts';

export type { PageAssets };

const DOCTYPE = '<!doctype html>';

// The site root: the shell, both shells pre-rendered, with the CV window
// open on the desktop, so its first title is the CV's (005 FR-042).
export function renderShell({ resume, siteData, assets }: { resume: Resume; siteData: SiteData; assets: PageAssets }): string {
  const { description } = pageMeta(resume.basics);
  const osHtml = renderToString(<Os resume={resume} siteData={siteData} apps={APPS} />);
  const document = renderToStaticMarkup(
    <ShellPage
        title={shellTitle(resume, siteText.os.views.cv)}
        description={description}
        assets={assets}
        noScript={<NoScript resume={resume} siteData={siteData} />}
        osHtml={osHtml}
      />,
  );
  return DOCTYPE + withShellPicker(document, shellQuery(METRICS));
}

export function renderCv({ resume, siteData, assets }: { resume: Resume; siteData: SiteData; assets: PageAssets }): string {
  // The name and role as the title, the summary or role as the description
  // (FR-036, FR-037).
  const { title, description } = pageMeta(resume.basics);
  return (
    DOCTYPE +
    renderToStaticMarkup(
      <Document title={title} description={description} assets={assets}>
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
