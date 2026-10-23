// The fonts plugin (004 research R5, contracts/fonts.md What the build
// generates). `@font-face` rules exist only in the build output: the global
// style sheet imports `virtual:cv-fonts.css`, and this plugin generates it
// from `src/fonts/fonts.json`, so no style sheet in the repository names a
// family. Vite then hashes each font file it refers to.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

export const FONTS_MODULE = 'virtual:cv-fonts.css';

const WEB_ROOT = path.resolve(import.meta.dirname, '..');

export const FONTS_DIR = path.join(WEB_ROOT, 'src', 'fonts');

export const FONTS_FILE = path.join(FONTS_DIR, 'fonts.json');

export type FontFile = { file: string; subset: string; weight: string; style: string; unicodeRange: string };

export type FontFamily = { family: string; token: string; license: string; files: FontFile[] };

export type FontsDescription = { families: FontFamily[] };

export function readFonts(file: string = FONTS_FILE): FontsDescription {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as FontsDescription;
}

// One `@font-face` per file. `font-display: swap` keeps text visible in the
// token's fallback family while a face loads (FR-045).
export function fontFaceCss(fonts: FontsDescription): string {
  return fonts.families
    .flatMap(({ family, files }) =>
      files.map((file) =>
        [
          '@font-face {',
          `  font-family: ${JSON.stringify(family)};`,
          `  src: url(${JSON.stringify(`/src/fonts/${file.file}`)}) format("woff2");`,
          `  font-weight: ${file.weight};`,
          `  font-style: ${file.style};`,
          '  font-display: swap;',
          `  unicode-range: ${file.unicodeRange};`,
          '}',
        ].join('\n'),
      ),
    )
    .join('\n');
}

// A font asset's name in the output, `assets/<family-dir>-<subset>-<hash>`,
// from its path under `src/fonts/`, or null for any other asset. Every
// family has a `latin.woff2`, so the directory keeps the names apart.
export function fontAssetName(originalFileName: string | undefined): string | null {
  const match = /(?:^|\/)src\/fonts\/([^/]+)\/([^/]+)\.woff2$/.exec(originalFileName ?? '');
  return match === null ? null : `assets/${match[1]}-${match[2]}-[hash].woff2`;
}

// The source path of each family's `latin` file, as Vite's output names
// the original: `src/fonts/<dir>/latin.woff2`.
export function preloadSources(fonts: FontsDescription): string[] {
  return fonts.families.flatMap(({ files }) => files.filter((file) => file.subset === 'latin').map((file) => `src/fonts/${file.file}`));
}

const IMPORT = new RegExp(String.raw`@import\s+(?:url\()?["']${FONTS_MODULE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\)?\s*;`);

// Vite's Lightning CSS bundler reads `@import`ed files from disk, so a
// virtual module can't be imported by a style sheet the usual way. The
// plugin replaces the import with the generated rules instead, placed after
// the sheet's last `@import`, where CSS allows rules.
export function cvFonts(fontsFile: string = FONTS_FILE): Plugin {
  return {
    name: 'cv:fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('.css') || !IMPORT.test(code)) return null;
      this.addWatchFile(fontsFile);
      const css = fontFaceCss(readFonts(fontsFile));
      const rest = code.replace(IMPORT, '');
      const imports = [...rest.matchAll(/@import\s[^;]*;/g)];
      const last = imports.at(-1);
      const at = last === undefined ? 0 : last.index + last[0].length;
      return { code: `${rest.slice(0, at)}\n${css}\n${rest.slice(at)}`, map: null };
    },
  };
}
