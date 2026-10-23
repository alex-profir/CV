// The HTML document both pages share (contracts/page.md Document). Link
// previews read the same title and description as the browser (FR-036), with
// no image, address or canonical link (FR-017). The description tags are
// left out when there is none, so nothing empty is declared (FR-037). The
// only script is the service worker's registration (US4).
import type { ReactNode } from 'react';

export type PageAssets = { css: string[]; scripts: string[]; preloadFonts: string[] };

export function Document({ title, description, assets, children }: { title: string; description?: string | undefined; assets: PageAssets; children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <title>{title}</title>
        {description !== undefined && <meta name="description" content={description} />}
        <meta property="og:title" content={title} />
        {description !== undefined && <meta property="og:description" content={description} />}
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <link rel="icon" href="data:," />
        {assets.preloadFonts.map((href) => (
          <link key={href} rel="preload" as="font" type="font/woff2" crossOrigin="" href={href} />
        ))}
        {assets.css.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {assets.scripts.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
