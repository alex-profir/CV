// The page's title and description, for the browser tab and link previews
// (FR-036, FR-037, research R10, data-model.md Page title and description).
import type { ResumeBasics } from '@cv/content';
import { present } from '../cv/join.tsx';
import { siteText } from '../site-text.ts';

export type PageMeta = { title: string; description?: string };

// Shown the same way the page shows it, so the title and the h1 agree.
const shown = (value: string | undefined): value is string => present(value);

// The name and the role joined by the title separator, or whichever is
// present, else the site heading. The description is the summary, else the
// role; with neither, none is declared.
export function pageMeta(basics: ResumeBasics | undefined): PageMeta {
  const { name, label, summary } = basics ?? {};
  const parts = [name, label].filter(shown);
  const title = parts.length === 0 ? siteText.siteHeading : parts.join(siteText.titleSeparator);
  const description = shown(summary) ? summary : shown(label) ? label : undefined;
  return description === undefined ? { title } : { title, description };
}
