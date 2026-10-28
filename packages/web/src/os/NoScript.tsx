// The root without scripts (005 FR-049, contracts/shell.md The no-script
// page): the role, the name, a sentence and a link to /cv, then /cv's
// footer, in /cv's look. It holds no button, form control or anything else
// that needs a script, and sits beside `#os`, outside what React hydrates.
import type { Resume, SiteData } from '@cv/content';
import { Arrow } from '../cv/Arrow.tsx';
import { present } from '../cv/join.tsx';
import { SiteFooter } from '../cv/SiteFooter.tsx';
import { siteName } from '../format/meta.ts';
import { siteText } from '../site-text.ts';

export function NoScript({ resume, siteData }: { resume: Resume; siteData: SiteData }) {
  const label = resume.basics?.label;
  return (
    <div className="no-script" data-req="005-os-shell-FR-049">
      <main className="no-script-main">
        {present(label) && <p className="role">{label}</p>}
        <h1>{siteName(resume)}</h1>
        <p className="no-script-text">{siteText.noScript.sentence}</p>
        <a href="/cv" className="standalone go-to-cv">
          {siteText.noScript.link}
          <Arrow kind="right" />
        </a>
      </main>
      <SiteFooter siteData={siteData} />
    </div>
  );
}
