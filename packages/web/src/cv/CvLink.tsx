// A link to an address from the CV document (FR-012, FR-013, FR-029). It
// never opens a new window.
import type { ReactNode } from 'react';

export function CvLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a href={href} className={className} data-req="004-cv-page-FR-012 004-cv-page-FR-013 004-cv-page-FR-029">
      {children}
    </a>
  );
}
