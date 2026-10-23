// The site's one site element (research R8): a link to the repository,
// outside main and left out of print. No footer when site data has no
// repository address.
import type { SiteData } from '@cv/content';
import { siteText } from '../site-text.ts';
import { Arrow } from './Arrow.tsx';

export function SiteFooter({ siteData }: { siteData: SiteData }) {
  if (siteData.repository === undefined || siteData.repository === '') return null;
  return (
    <footer data-site-element="" data-req="004-cv-page-FR-025 004-cv-page-FR-032">
      <div className="footer-inner">
        <a href={siteData.repository} className="standalone small-link">
          {siteText.builtWith}
          <Arrow kind="up-right" />
        </a>
      </div>
    </footer>
  );
}
