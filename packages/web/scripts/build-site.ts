// `npm run build` (004 research R2, contracts/site.md Output layout):
//
//   1. a Vite client build of the assets into `<out>/site/assets/`;
//   2. a Vite SSR build of `src/render.tsx` into a temporary directory;
//   3. each route rendered to `<out>/site/<file>`, with asset links from
//      Vite's manifest;
//   4. `<out>/site-manifest.json`: the routes and every served file.
//
// `--out <dir>` (default `packages/web/dist`) lets tests build into a
// temporary directory. Any failure prints `site build failed: <message>` to
// stderr and exits 2. A successful build prints nothing.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { build, mergeConfig } from 'vite';
import type { Manifest, Plugin, UserConfig } from 'vite';
import { resume, siteData } from '@cv/content';
import type { Resume, SiteData } from '@cv/content';
import { compare } from '../../../tools/traceability/src/report.ts';
import { ROUTES } from '../src/routes.ts';
import { preloadSources, readFonts } from './fonts-plugin.ts';
import type { SiteManifest } from '../src/routes.ts';
import viteConfig from '../vite.config.ts';

const WEB_ROOT = path.resolve(import.meta.dirname, '..');

export const DEFAULT_OUT = path.join(WEB_ROOT, 'dist');

// The client build's entry for the page style sheet, as Vite's manifest
// keys it.
const STYLE_ENTRY = 'src/styles/global.css';

const SSR_ENTRY = 'src/render.tsx';

// Served content types, by extension. A file of any other kind fails the
// build, so nothing is served with a guessed type.
const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.txt': 'text/plain',
};

type PageAssets = { css: string[]; scripts: string[]; preloadFonts: string[] };

type RenderModule = {
  renderCv(input: { resume: Resume; siteData: SiteData; assets: PageAssets }): string;
  renderNotFound(input: { siteData: SiteData; assets: PageAssets }): string;
};

// The SSR bundle is written outside the repository, where bare imports
// can't be resolved. React is kept external and imported by its absolute
// path from here instead.
function absoluteReact(): Plugin {
  return {
    name: 'cv:absolute-react',
    enforce: 'pre',
    resolveId(source) {
      if (!/^react(?:-dom)?(?:\/|$)/.test(source)) return null;
      return { id: fileURLToPath(import.meta.resolve(source)), external: true };
    },
  };
}

function clientConfig(siteDir: string): UserConfig {
  return mergeConfig(viteConfig, {
    configFile: false,
    build: { outDir: siteDir, emptyOutDir: true },
  });
}

function ssrConfig(ssrDir: string): UserConfig {
  return mergeConfig(viteConfig, {
    configFile: false,
    plugins: [absoluteReact()],
    build: {
      ssr: SSR_ENTRY,
      outDir: ssrDir,
      emptyOutDir: true,
      manifest: false,
      rolldownOptions: { output: { entryFileNames: 'render.mjs' } },
    },
  });
}

// The page's asset links, from Vite's manifest: the style sheet, and the
// `latin` file of each family to preload (research R5). The manifest lists
// every font file the style sheet refers to, by its source path. US4 adds
// the registration script.
function pageAssets(manifest: Manifest): PageAssets {
  const entry = manifest[STYLE_ENTRY];
  if (entry === undefined) throw new Error(`Vite's manifest has no entry for ${STYLE_ENTRY}`);
  const css = [entry.file, ...(entry.css ?? [])].filter((file) => file.endsWith('.css')).map((file) => `/${file}`);
  if (css.length === 0) throw new Error(`Vite's manifest gives no style sheet for ${STYLE_ENTRY}`);
  const preloadFonts = preloadSources(readFonts()).map((source) => {
    const font = manifest[source];
    if (font === undefined) throw new Error(`Vite's manifest has no entry for the font ${source}`);
    return `/${font.file}`;
  });
  return { css, scripts: [], preloadFonts };
}

function listFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

export function siteManifest(siteDir: string): SiteManifest {
  const files = listFiles(siteDir)
    .map((file) => {
      const type = CONTENT_TYPES[path.extname(file)];
      if (type === undefined) throw new Error(`no content type for ${file}`);
      return { path: `/${file}`, hash: sha256(fs.readFileSync(path.join(siteDir, file))), type };
    })
    .sort((a, b) => compare(a.path, b.path));
  const version = sha256(files.map((file) => `${file.path} ${file.hash}\n`).join('')).slice(0, 16);
  return { version, routes: ROUTES, files };
}

export async function buildSite(out: string): Promise<SiteManifest> {
  const siteDir = path.join(out, 'site');
  const manifestFile = path.join(out, 'site-manifest.json');
  fs.rmSync(manifestFile, { force: true });

  // 1. Client build.
  await build(clientConfig(siteDir));
  const viteDir = path.join(siteDir, '.vite');
  const viteManifest: Manifest = JSON.parse(fs.readFileSync(path.join(viteDir, 'manifest.json'), 'utf8'));
  fs.rmSync(viteDir, { recursive: true, force: true });
  const assets = pageAssets(viteManifest);

  // 2. SSR build, into a temporary directory.
  const ssrDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-ssr-'));
  try {
    await build(ssrConfig(ssrDir));
    const render: RenderModule = await import(pathToFileURL(path.join(ssrDir, 'render.mjs')).href);

    // 3. Every route's page.
    const pages: Record<string, string> = {};
    for (const page of ROUTES.pages) pages[page.file] = render.renderCv({ resume, siteData, assets });
    pages[ROUTES.notFound.file] = render.renderNotFound({ siteData, assets });
    for (const [file, html] of Object.entries(pages)) fs.writeFileSync(path.join(siteDir, file), html);
  } finally {
    fs.rmSync(ssrDir, { recursive: true, force: true });
  }

  // 4. The site manifest, outside what's served.
  const manifest = siteManifest(siteDir);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({ options: { out: { type: 'string' } }, strict: true, allowPositionals: false });
    await buildSite(path.resolve(values.out ?? DEFAULT_OUT));
  } catch (error) {
    process.stderr.write(`site build failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  }
}

if (import.meta.main) await main();
