// The CV app (005 contracts/shell.md Shared): a link to /cv to print or
// share, then the same CV document as /cv (FR-006 to FR-009), laid out by
// its window or view through container queries (research R5).
import type { AppProps } from '../index.ts';
import { Arrow } from '../../cv/Arrow.tsx';
import { CvDocument } from '../../cv/CvDocument.tsx';
import { siteText } from '../../site-text.ts';

export function CvApp({ resume }: AppProps) {
  return (
    <div className="cv-app" data-req="005-os-shell-FR-006 005-os-shell-FR-008 005-os-shell-FR-009">
      <div className="app-bar">
        <a href="/cv" className="standalone" data-req="005-os-shell-FR-007">
          {siteText.os.cvLink}
          <Arrow kind="right" />
        </a>
      </div>
      <CvDocument as="div" resume={resume} />
    </div>
  );
}
