// The site's Vite config (004 research R2). build-site.ts imports it and runs
// the client build and the SSR build from it; it isn't loaded through Vite's
// config loader, which would write a bundled copy next to this file.
import { defineConfig } from 'vite';
import { cvFonts, fontAssetName } from './scripts/fonts-plugin.ts';

export default defineConfig({
  root: import.meta.dirname,
  base: '/',
  publicDir: false,
  // A successful build prints nothing on stdout: the site check's report
  // owns it.
  logLevel: 'warn',
  plugins: [cvFonts()],
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
  css: {
    // Lightning CSS replaces the token output's `@custom-media` breakpoints
    // at build time (003 research R11).
    transformer: 'lightningcss',
    lightningcss: { drafts: { customMedia: true } },
  },
  build: {
    outDir: 'dist/site',
    assetsDir: 'assets',
    emptyOutDir: true,
    manifest: true,
    assetsInlineLimit: 0,
    cssMinify: 'lightningcss',
    rolldownOptions: {
      input: { cv: 'src/styles/global.css' },
      output: {
        // Font files keep their family directory in the name
        // (contracts/fonts.md): `assets/<family-dir>-<subset>-<hash>.woff2`.
        assetFileNames: (asset) => fontAssetName(asset.originalFileNames[0]) ?? 'assets/[name]-[hash][extname]',
      },
    },
  },
});
