// The not-found page (contracts/page.md Not-found page). It holds no CV fact
// (FR-006). The footer comes with SiteFooter (T043).
import type { SiteData } from '@cv/content';

// Moved into site-text.ts by T032.
export const NOT_FOUND_TEXT = {
  label: '404 · Not found',
  heading: "This page doesn't exist.",
  hint: 'The address may be mistyped, or the page may have moved.',
  link: 'Go to the CV',
};

export function NotFoundPage(_props: { siteData: SiteData }) {
  return (
    <main data-req="004-cv-page-FR-019">
      <p>{NOT_FOUND_TEXT.label}</p>
      <h1>{NOT_FOUND_TEXT.heading}</h1>
      <p>{NOT_FOUND_TEXT.hint}</p>
      <a href="/cv">
        {NOT_FOUND_TEXT.link}
        <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16">
          <path d="M2 8h11M9 4l4 4-4 4" />
        </svg>
      </a>
    </main>
  );
}
