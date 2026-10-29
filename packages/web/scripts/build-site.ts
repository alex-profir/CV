// `npm run build` (004 research R2, contracts/site.md Output layout):
//
//   1. a Vite client build of the assets into `<out>/site/assets/`;
//   2. a Vite SSR build of `src/render.tsx` into a temporary directory;
//   3. the requirement data, `<out>/site/assets/requirements-<hash>.json`
//      (007 contracts/requirement-data.md), then each route rendered to
//      `<out>/site/<file>`, with asset links from Vite's manifest;
//   4. the service worker, `<out>/site/sw.js`, with its precache list,
//      version and route table;
//   5. `<out>/site-manifest.json`: the routes and every served file.
//
// Before step 1, the fonts are checked against the font tokens
// (contracts/fonts.md).
//
// `--out <dir>` (default `packages/web/dist`) lets tests build into a
// temporary directory. Any failure prints `site build failed: <message>` to
// stderr and exits 2. A successful build prints nothing.
import crypto from 'node:crypto';
import fs from 'node:fs';
import module from 'node:module';
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
import { BREAKPOINT_PREFIX } from './container-breakpoints.ts';
import { checkFonts, preloadSources, readFonts } from './fonts-plugin.ts';
import { buildRequirementData } from './requirements/index.ts';
import { checkSpecList } from './spec-list.ts';
import type { SiteManifest } from '../src/routes.ts';
import viteConfig from '../vite.config.ts';

const WEB_ROOT = path.resolve(import.meta.dirname, '..');

// The repository the requirement data is read from.
const REPOSITORY_ROOT = path.resolve(WEB_ROOT, '../..');

export const DEFAULT_OUT = path.join(WEB_ROOT, 'dist');

// The client build's entry for the page style sheet, as Vite's manifest
// keys it.
const STYLE_ENTRY = 'src/styles/global.css';

// The client build's entry for the service worker's registration script.
const REGISTER_ENTRY = 'src/client/register-sw.ts';

// The client build's entry for the shell: its one script and style sheet
// (005 research R14).
const SHELL_ENTRY = 'src/client/os.tsx';

const SSR_ENTRY = 'src/render.tsx';

// The service worker's source, and where its built copy is served.
const WORKER_SOURCE = path.join(WEB_ROOT, 'src/sw/service-worker.ts');

const WORKER_FILE = 'sw.js';

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

type PageAssets = { css: string[]; scripts: string[]; preloadFonts: string[]; requirements?: string };

type RenderModule = {
  renderShell(input: { resume: Resume; siteData: SiteData; assets: PageAssets }): string;
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
// every font file the style sheet refers to, by its source path. The
// registration script is the page's only script.
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
  const register = manifest[REGISTER_ENTRY];
  if (register === undefined) throw new Error(`Vite's manifest has no entry for ${REGISTER_ENTRY}`);
  return { css, scripts: [`/${register.file}`], preloadFonts };
}

// The root page's asset links (005 contracts/site.md): the shell's style
// sheet and its one script, then the registration script, and the same
// font preloads as /cv. The shell's script must be one file: a chunk loaded
// later could be gone from the cache after an update (FR-053).
function shellAssets(manifest: Manifest, page: PageAssets): PageAssets {
  const entry = manifest[SHELL_ENTRY];
  if (entry === undefined) throw new Error(`Vite's manifest has no entry for ${SHELL_ENTRY}`);
  if ((entry.imports ?? []).length > 0 || (entry.dynamicImports ?? []).length > 0) throw new Error(`the os entry has more than one script file`);
  const css = (entry.css ?? []).map((file) => `/${file}`);
  if (css.length === 0) throw new Error(`Vite's manifest gives no style sheet for ${SHELL_ENTRY}`);
  return { css, scripts: [`/${entry.file}`, ...page.scripts], preloadFonts: page.preloadFonts };
}

// The root page holds what the shell needs before and without its script
// (contracts/site.md step 4).
function checkShellPage(html: string): void {
  if (!/<head><script>[^<]*data-shell/.test(html)) throw new Error('index.html lacks the inline shell script');
  if (!html.includes('<div id="os"')) throw new Error('index.html lacks #os');
  if (!html.includes('class="no-script"')) throw new Error('index.html lacks the no-script page');
}

function listFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
  });
}

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

// Writes the requirement data as a hashed asset (007 research R9) and gives
// its served path. It is a built file like any other, so the site manifest
// and the service worker's precache list it.
function writeRequirementData(siteDir: string): string {
  const text = JSON.stringify(buildRequirementData(REPOSITORY_ROOT));
  const file = `assets/requirements-${sha256(text).slice(0, 8)}.json`;
  fs.mkdirSync(path.join(siteDir, 'assets'), { recursive: true });
  fs.writeFileSync(path.join(siteDir, file), text);
  return `/${file}`;
}

// Every file under `siteDir`, with its hash and content type, sorted by
// path.
function servedFiles(siteDir: string): SiteManifest['files'] {
  return listFiles(siteDir)
    .map((file) => {
      const type = CONTENT_TYPES[path.extname(file)];
      if (type === undefined) throw new Error(`no content type for ${file}`);
      return { path: `/${file}`, hash: sha256(fs.readFileSync(path.join(siteDir, file))), type };
    })
    .sort((a, b) => compare(a.path, b.path));
}

const filesDigest = (files: SiteManifest['files']) => sha256(files.map((file) => `${file.path} ${file.hash}\n`).join(''));

export function siteManifest(siteDir: string): SiteManifest {
  const files = servedFiles(siteDir);
  return { version: filesDigest(files).slice(0, 16), routes: ROUTES, files };
}

// Node's type stripping, without the warning it prints because it is still
// experimental: a successful build prints nothing.
function stripTypes(source: string): string {
  const emitWarning = process.emitWarning;
  process.emitWarning = () => undefined;
  try {
    return module.stripTypeScriptTypes(source);
  } finally {
    process.emitWarning = emitWarning;
  }
}

// Writes `<siteDir>/sw.js` (research R4): the worker's code with its types
// stripped, after the constants it reads. The precache list is every other
// served file. The version is a hash over those files and the worker's
// code, so a change to either gives the worker a new cache. Call it after
// every other file is written, and before `siteManifest`, which lists
// `sw.js` too.
export function writeServiceWorker(siteDir: string): void {
  const workerPath = `/${WORKER_FILE}`;
  const files = servedFiles(siteDir).filter((file) => file.path !== workerPath);
  const code = stripTypes(fs.readFileSync(WORKER_SOURCE, 'utf8'));
  const version = sha256(`${filesDigest(files)}${code}`).slice(0, 16);
  const header = [
    `const PRECACHE = ${JSON.stringify(files.map((file) => file.path))};`,
    `const VERSION = ${JSON.stringify(version)};`,
    `const ROUTES = ${JSON.stringify(ROUTES)};`,
  ].join('\n');
  fs.writeFileSync(path.join(siteDir, WORKER_FILE), `${header}\n${code}`);
}

// Every breakpoint in a query was replaced by its condition (005 research
// R5): a browser would ignore a container or media query that still names
// one. The token output's custom properties of the same name are values,
// not queries, and stay.
function checkContainerBreakpoints(siteDir: string): void {
  for (const file of listFiles(siteDir).filter((name) => name.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(siteDir, file), 'utf8');
    const queries = css.match(/@(?:container|media)[^{]*/g) ?? [];
    if (queries.some((query) => query.includes(BREAKPOINT_PREFIX))) throw new Error(`${file} still holds ${BREAKPOINT_PREFIX}`);
  }
}

export async function buildSite(out: string): Promise<SiteManifest> {
  const siteDir = path.join(out, 'site');
  const manifestFile = path.join(out, 'site-manifest.json');
  fs.rmSync(manifestFile, { force: true });

  // 0. The fonts match the font tokens, and every listed file exists.
  checkFonts();
  // The Terminal's spec list, read before both builds so an empty one fails
  // with its own message (006 contracts/site.md).
  checkSpecList();

  // 1. Client build.
  await build(clientConfig(siteDir));
  const viteDir = path.join(siteDir, '.vite');
  const viteManifest: Manifest = JSON.parse(fs.readFileSync(path.join(viteDir, 'manifest.json'), 'utf8'));
  fs.rmSync(viteDir, { recursive: true, force: true });
  checkContainerBreakpoints(siteDir);
  const assets = pageAssets(viteManifest);
  const requirements = writeRequirementData(siteDir);

  // 2. SSR build, into a temporary directory.
  const ssrDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-ssr-'));
  try {
    await build(ssrConfig(ssrDir));
    const render: RenderModule = await import(pathToFileURL(path.join(ssrDir, 'render.mjs')).href);

    // 3. Every route's page, each by its own render function. A route with
    // none fails the build, rather than getting a copy of another page.
    const renderers: Record<string, () => string> = {
      '/': () => render.renderShell({ resume, siteData, assets: { ...shellAssets(viteManifest, assets), requirements } }),
      '/cv': () => render.renderCv({ resume, siteData, assets }),
    };
    const pages: Record<string, string> = {};
    for (const page of ROUTES.pages) {
      const renderPage = renderers[page.path];
      if (renderPage === undefined) throw new Error(`no render function for the route ${page.path}`);
      pages[page.file] = renderPage();
    }
    const shellPage = ROUTES.pages.find((page) => page.path === '/');
    if (shellPage !== undefined) checkShellPage(pages[shellPage.file]!);
    pages[ROUTES.notFound.file] = render.renderNotFound({ siteData, assets });
    for (const [file, html] of Object.entries(pages)) fs.writeFileSync(path.join(siteDir, file), html);
  } finally {
    fs.rmSync(ssrDir, { recursive: true, force: true });
  }

  // 4. The service worker.
  writeServiceWorker(siteDir);

  // 5. The site manifest, outside what's served.
  const manifest = siteManifest(siteDir);
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

async function main(): Promise<void> {
  try {
    const { values } = parseArgs({ options: { out: { type: 'string' } }, strict: true, allowPositionals: false });
    // Always a production build, React's and the JSX transform's included,
    // even when the caller's environment says otherwise (a test runner sets
    // NODE_ENV=test), so every build ships the same script (005 research
    // R18).
    process.env.NODE_ENV = 'production';
    await buildSite(path.resolve(values.out ?? DEFAULT_OUT));
  } catch (error) {
    process.stderr.write(`site build failed: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(2);
  }
}

if (import.meta.main) await main();
