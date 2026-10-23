// A CV section: a region named by its h2 (FR-024, FR-025), with the design's
// decorative number before the heading, hidden from screen readers and
// numbered by the sections shown.
import type { ReactNode } from 'react';

export function Section({ id, number, heading, children }: { id: string; number: number; heading: string; children: ReactNode }) {
  const headingId = `section-${id}`;
  return (
    <section
      aria-labelledby={headingId}
      data-req="004-cv-page-FR-002 004-cv-page-FR-003 004-cv-page-FR-004 004-cv-page-FR-007 004-cv-page-FR-022 004-cv-page-FR-024 004-cv-page-FR-026"
    >
      <div className="section-head">
        <p className="section-number" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </p>
        <h2 id={headingId}>{heading}</h2>
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}
