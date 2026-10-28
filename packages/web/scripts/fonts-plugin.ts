// The fonts plugin (004 research R5, contracts/fonts.md What the build
// generates). `@font-face` rules exist only in the build output: the global
// style sheet imports `virtual:cv-fonts.css`, and this plugin generates it
// from `src/fonts/fonts.json`, so no style sheet in the repository names a
// family. Vite then hashes each font file it refers to.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { tokenTypes, tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import { compare } from '../../../tools/traceability/src/report.ts';

export const FONTS_MODULE = 'virtual:cv-fonts.css';

const WEB_ROOT = path.resolve(import.meta.dirname, '..');

export const FONTS_DIR = path.join(WEB_ROOT, 'src', 'fonts');

export const FONTS_FILE = path.join(FONTS_DIR, 'fonts.json');

export type FontFile = { file: string; subset: string; weight: string; style: string; unicodeRange: string };

// `advance`: the face's advance width in em, for a fixed-width family only
// (006 research R13). A fact of the font file, read by `metrics.ts`.
export type FontFamily = { family: string; token: string; license: string; advance?: number; files: FontFile[] };

export type FontsDescription = { families: FontFamily[] };

export function readFonts(file: string = FONTS_FILE): FontsDescription {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as FontsDescription;
}

// The font tokens as the site reads them: each token's type, and the active
// value of a token as CSS text.
export type FontTokens = { types: Readonly<Record<string, string>>; value: (name: string) => string };

const SITE_TOKENS: FontTokens = { types: tokenTypes, value: (name) => tokenValue(name as CssVarTokenName) };

// The first family of a `fontFamilies` value as the token output writes it:
// a quoted name, or a generic family.
export function firstFamily(value: string): string {
  const quoted = /^\s*"((?:[^"\\]|\\.)*)"/.exec(value);
  return quoted === null ? (value.split(',')[0] ?? '').trim() : (JSON.parse(`"${quoted[1]}"`) as string);
}

// What stops the build (data-model.md Font family entry, contracts/fonts.md),
// naming the token or file: a font token whose first family has no entry, an
// entry whose token doesn't exist or names another family, and a listed file
// or license that is missing. Paths are relative to `fontsDir`.
export function fontsProblems(fonts: FontsDescription, fontsDir: string, tokens: FontTokens = SITE_TOKENS): string[] {
  const problems: string[] = [];
  const fontTokens = Object.keys(tokens.types)
    .filter((name) => tokens.types[name] === 'fontFamilies')
    .sort(compare);
  for (const name of fontTokens) {
    const family = firstFamily(tokens.value(name));
    if (!fonts.families.some((entry) => entry.family === family)) {
      problems.push(`the font token ${name} names the family ${JSON.stringify(family)}, which has no entry in fonts.json`);
    }
  }
  for (const entry of fonts.families) {
    const type = tokens.types[entry.token];
    if (type === undefined) {
      problems.push(`the fonts.json entry for ${JSON.stringify(entry.family)} names the font token ${entry.token}, which doesn't exist`);
    } else if (type !== 'fontFamilies') {
      problems.push(`the fonts.json entry for ${JSON.stringify(entry.family)} names ${entry.token}, which is a ${type} token, not a font family token`);
    } else {
      const family = firstFamily(tokens.value(entry.token));
      if (family !== entry.family) {
        problems.push(`the fonts.json entry for ${JSON.stringify(entry.family)} names the font token ${entry.token}, whose first family is ${JSON.stringify(family)}`);
      }
    }
    for (const file of [...entry.files.map((listed) => listed.file), entry.license]) {
      if (!fs.existsSync(path.join(fontsDir, file))) problems.push(`src/fonts/${file}, listed in fonts.json, is missing`);
    }
  }
  return problems;
}

// Throws when the fonts don't match the font tokens, with every problem in
// one message. build-site.ts calls it once, before both Vite builds, so the
// message reaches `site build failed: <message>` unwrapped. The site's Vite
// config is only run by build-site.ts, so the plugin doesn't check again.
export function checkFonts(fontsFile: string = FONTS_FILE): void {
  const problems = fontsProblems(readFonts(fontsFile), path.dirname(fontsFile));
  if (problems.length > 0) throw new Error(problems.join('; '));
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
