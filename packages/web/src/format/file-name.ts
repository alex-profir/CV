// The CV PDF's suggested file name (011 research R10, data-model.md File
// name): the CV document's name, its words joined by hyphens, then
// `-CV.pdf`. Accented letters are kept. The name is only ever read from the
// CV document, never written here (Constitution IV).
import { siteText } from '../site-text.ts';

// Characters no common file system takes in a name, and control characters.
const REJECTED = /[/\\:*?"<>|\u0000-\u001F\u007F]/g;

export function downloadName(name: string | undefined): string {
  const words = (name ?? '').normalize('NFC').replace(REJECTED, '').split(/\s+/).filter((word) => word !== '');
  return words.length === 0 ? siteText.download.fallbackName : `${words.join('-')}${siteText.download.suffix}`;
}
