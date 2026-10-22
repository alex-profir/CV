import { searchFiles } from '../../content-check/src/facts.ts';
import { EXPORT_FILE, MOTION_FILE } from './paths.ts';
import type { Problem } from './report.ts';

export type SiteFile = { file: string; kind: 'style-sheet' | 'component'; text: string };

// Image and font files, skipped by name (FR-033, research R13).
const SKIPPED = ['.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.bmp', '.woff', '.woff2', '.ttf', '.otf', '.eot'];

const STYLE_SHEETS = ['.css'];

const COMPONENTS = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'];

// Formats that can carry styles but that the check can't read yet.
const NO_READER = ['.scss', '.sass', '.less', '.styl', '.pcss', '.postcss', '.html', '.htm', '.vue', '.svelte', '.astro', '.mdx'];

function extension(file: string): string {
  const name = file.slice(file.lastIndexOf('/') + 1);
  const dot = name.lastIndexOf('.');
  return dot <= 0 ? '' : name.slice(dot).toLowerCase();
}

// The site files the literal values search reads (data-model.md, SiteFile):
// 002's site-file walk without the two token sources. `filesSearched` counts
// style sheets and components, `filesWithoutStyles` every other text file.
export function siteFiles(root: string): { files: SiteFile[]; problems: Problem[]; filesSearched: number; filesWithoutStyles: number } {
  const search = searchFiles(root, [EXPORT_FILE, MOTION_FILE]);
  const files: SiteFile[] = [];
  const problems: Problem[] = [];
  let filesWithoutStyles = 0;
  for (const found of search.files) {
    const ext = extension(found.file);
    if (SKIPPED.includes(ext)) continue;
    if (NO_READER.includes(ext)) {
      problems.push({
        type: 'unreadable-file',
        subject: found.file,
        location: { file: found.file, line: 1, column: 1 },
        detail: `no reader for ${ext} files; the token check must support this file type before it can be used`,
      });
      continue;
    }
    if (found.state !== 'searched') continue;
    if (STYLE_SHEETS.includes(ext)) files.push({ file: found.file, kind: 'style-sheet', text: found.text });
    else if (COMPONENTS.includes(ext)) files.push({ file: found.file, kind: 'component', text: found.text });
    else filesWithoutStyles += 1;
  }
  for (const { path: unreadable, code } of search.unreadable) {
    problems.push({
      type: 'unreadable-file',
      subject: unreadable,
      location: { file: unreadable, line: 1, column: 1 },
      detail: `cannot be read: ${code}`,
    });
  }
  return { files, problems, filesSearched: files.length, filesWithoutStyles };
}
