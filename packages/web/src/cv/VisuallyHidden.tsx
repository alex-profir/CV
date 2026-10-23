// Text kept in the accessibility tree and out of view and print (research
// R8). The class is in global.css.
import type { ReactNode } from 'react';

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="visually-hidden">{children}</span>;
}
