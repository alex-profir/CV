// Page test helpers (004 research R21). The default export is Vitest's
// global setup: it builds the real site once per run into a temporary
// directory, outside the repository, and provides its path. The other
// exports run in test files.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { inject, onTestFinished } from 'vitest';
import type { TestProject } from 'vitest/node';
import { siteData as realSiteData } from '@cv/content';
import type { Resume, SiteData } from '@cv/content';
import { startServer } from '../../../../tools/site-check/src/server.ts';
import type { RunningServer } from '../../../../tools/site-check/src/server.ts';
import { siteManifest } from '../../scripts/build-site.ts';
import { renderCv } from '../../src/render.tsx';
import type { PageAssets } from '../../src/render.tsx';
import type { SiteManifest } from '../../src/routes.ts';
import type { SupportedSection } from '../../src/supported.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    // The temporary build's `--out` directory: `site/` and
    // `site-manifest.json`.
    siteDir: string;
  }
}

const BUILD_SCRIPT = path.resolve(import.meta.dirname, '../../scripts/build-site.ts');

export default function setup({ provide }: TestProject): () => void {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-site-'));
  const result = spawnSync(process.execPath, [BUILD_SCRIPT, '--out', out], { encoding: 'utf8' });
  if (result.status !== 0) {
    fs.rmSync(out, { recursive: true, force: true });
    throw new Error(`the site build for the tests failed (exit ${result.status}):\n${result.stderr}`);
  }
  provide('siteDir', out);
  return () => fs.rmSync(out, { recursive: true, force: true });
}

export type BuiltSite = { dir: string; manifest: SiteManifest };

function readSite(out: string): BuiltSite {
  return {
    dir: path.join(out, 'site'),
    manifest: JSON.parse(fs.readFileSync(path.join(out, 'site-manifest.json'), 'utf8')),
  };
}

// The site the global setup built: `dir` is what's served.
export function builtSite(): BuiltSite {
  return readSite(inject('siteDir'));
}

// Starts the local server on a site and closes it when the current test
// finishes. Call it inside a test.
async function serve(site: BuiltSite, cleanup?: () => void): Promise<RunningServer> {
  const server = await startServer({ siteDir: site.dir, manifest: site.manifest });
  onTestFinished(async () => {
    await server.close();
    cleanup?.();
  });
  return server;
}

// The built site, served for the current test.
export function serveBuilt(): Promise<RunningServer> {
  return serve(builtSite());
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries([...tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)].map(([, name = '', value = '']) => [name.toLowerCase(), value]));
}

// The asset links of the built `cv.html`, so a fixture page uses the same
// style sheet, scripts and preloaded fonts as the real one.
export function builtAssets(site: BuiltSite = builtSite()): PageAssets {
  const page = site.manifest.routes.pages[0];
  if (page === undefined) throw new Error('the route table has no page');
  const html = fs.readFileSync(path.join(site.dir, page.file), 'utf8');
  const assets: PageAssets = { css: [], scripts: [], preloadFonts: [] };
  for (const [tag] of html.matchAll(/<(?:link|script)\b[^>]*>/g)) {
    const attrs = attributes(tag);
    if (tag.startsWith('<script') && attrs.type === 'module' && attrs.src) assets.scripts.push(attrs.src);
    else if (attrs.rel === 'stylesheet' && attrs.href) assets.css.push(attrs.href);
    else if (attrs.rel === 'preload' && attrs.as === 'font' && attrs.href) assets.preloadFonts.push(attrs.href);
  }
  return assets;
}

// The /cv page rendered from a fixture CV with the page's render function
// and the built site's assets. Not served.
export function renderFixtureHtml(resume: Resume, siteData: SiteData = realSiteData): string {
  return renderCv({ resume, siteData, assets: builtAssets() });
}

// Test-only markup placed before a section of the rendered page: an empty
// block of a given height in CSS pixels (research R18). Site source never
// holds it.
export type SpacerOptions = { spacerBefore: SupportedSection; height: number };

export function withSpacer(html: string, { spacerBefore, height }: SpacerOptions): string {
  const section = `<section aria-labelledby="section-${spacerBefore}"`;
  const at = html.indexOf(section);
  if (at < 0) throw new Error(`the page has no ${spacerBefore} section to put the spacer before`);
  return `${html.slice(0, at)}<div data-test-spacer="" style="block-size:${height}px"></div>${html.slice(at)}`;
}

// A copy of the built site whose `cv.html` is rendered from a fixture CV,
// optionally with a spacer before a section, served for the current test,
// and removed when it finishes. The manifest is recomputed for the copy.
export async function serveFixture(resume: Resume, siteData: SiteData = realSiteData, spacer?: SpacerOptions): Promise<RunningServer> {
  const site = builtSite();
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'cv-fixture-'));
  const dir = path.join(copy, 'site');
  fs.cpSync(site.dir, dir, { recursive: true });
  const html = renderFixtureHtml(resume, siteData);
  for (const page of site.manifest.routes.pages) fs.writeFileSync(path.join(dir, page.file), spacer === undefined ? html : withSpacer(html, spacer));
  const manifest = siteManifest(dir);
  return serve({ dir, manifest }, () => fs.rmSync(copy, { recursive: true, force: true }));
}
