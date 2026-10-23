// The not-found page (contracts/page.md Not-found page). It holds no CV fact
// (FR-006): every word is site text.
import type { SiteData } from '@cv/content';
import { Arrow } from '../cv/Arrow.tsx';
import { SiteFooter } from '../cv/SiteFooter.tsx';
import { siteText } from '../site-text.ts';

export function NotFoundPage({ siteData }: { siteData: SiteData }) {
  return (
    <>
      <main className="not-found" data-req="004-cv-page-FR-019">
        <p className="role">{siteText.notFound.label}</p>
        <h1>{siteText.notFound.heading}</h1>
        <p className="hint">{siteText.notFound.hint}</p>
        <a href="/cv" className="standalone go-to-cv">
          {siteText.notFound.link}
          <Arrow kind="right" />
        </a>
      </main>
      <SiteFooter siteData={siteData} />
    </>
  );
}
