// The site's Vite config (004 research R2). build-site.ts imports it and runs
// the client build and the SSR build from it; it isn't loaded through Vite's
// config loader, which would write a bundled copy next to this file.
import path from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { containerBreakpoints } from './scripts/container-breakpoints.ts';
import { cvFonts, fontAssetName } from './scripts/fonts-plugin.ts';
import { shellLicenses } from './scripts/shell-licenses.ts';
import { specListPlugin } from './scripts/spec-list.ts';

// `node:zlib` in the shell worker's build only (006 research R34): just-bash's
// browser build imports it for `gzip` and `tar`, which the Terminal leaves
// out.
function noZlib(): Plugin {
  const stub = path.join(import.meta.dirname, 'src/apps/terminal/shell/no-zlib.ts');
  return {
    name: 'cv:no-zlib',
    enforce: 'pre',
    resolveId: (source) => (source === 'node:zlib' || source === 'zlib' ? stub : null),
  };
}

export default defineConfig({
  root: import.meta.dirname,
  base: '/',
  publicDir: false,
  // A successful build prints nothing on stdout: the site check's report
  // owns it.
  logLevel: 'warn',
  plugins: [cvFonts(), specListPlugin()],
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
  css: {
    // Lightning CSS replaces the token output's `@custom-media` breakpoints
    // at build time (003 research R11), and the visitor does the same for
    // `@container (--token-breakpoint-…)` (005 research R5).
    transformer: 'lightningcss',
    lightningcss: { drafts: { customMedia: true }, visitor: containerBreakpoints() },
  },
  // The shell worker (006 research R34, R40, contracts/shell-worker.md
  // Build): one ES module file, `assets/shell-<hash>.js`, and its license
  // file, with the plugins the page uses, so `data.ts` resolves
  // `virtual:cv-spec-list` in the worker too.
  worker: {
    format: 'es',
    plugins: () => [noZlib(), cvFonts(), specListPlugin(), shellLicenses()],
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/shell-[hash].js',
        chunkFileNames: 'assets/shell-chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        codeSplitting: false,
      },
    },
  },
  build: {
    outDir: 'dist/site',
    assetsDir: 'assets',
    emptyOutDir: true,
    manifest: true,
    assetsInlineLimit: 0,
    cssMinify: 'lightningcss',
    rolldownOptions: {
      // `os` is the shell's one script and its style sheet (005 research
      // R14). It shares no module with the other entries and imports nothing
      // dynamically, so Rolldown emits it as one file; build-site.ts fails
      // if it ever doesn't.
      input: { cv: 'src/styles/global.css', 'register-sw': 'src/client/register-sw.ts', os: 'src/client/os.tsx' },
      output: {
        // Font files keep their family directory in the name
        // (contracts/fonts.md): `assets/<family-dir>-<subset>-<hash>.woff2`.
        assetFileNames: (asset) => fontAssetName(asset.originalFileNames[0]) ?? 'assets/[name]-[hash][extname]',
      },
    },
  },
});
