// The site root's document (005 contracts/shell.md Document, research R1,
// R2). The document and the no-script page are static markup; `osHtml` is
// the shell, rendered by React's renderToString so the client can hydrate
// it inside `#os`.
import type { ReactNode } from 'react';
import type { PageAssets } from './Document.tsx';

// The page's only inline script, the first thing in <head>. It picks the
// shell from the space available before the first paint, then records the
// first home screen icon tapped while the shell's script is still loading,
// so that tap isn't lost (FR-004; `Os` replays it once hydrated).
export function shellPicker(query: string): string {
  return [
    `document.documentElement.setAttribute("data-shell",matchMedia(${JSON.stringify(query)}).matches?"desktop":"mobile");`,
    'document.addEventListener("click",function(e){',
    'var os=document.getElementById("os");',
    'if(!os||os.hasAttribute("data-ready")||window.osEarlyView||!e.target||!e.target.closest)return;',
    'var icon=e.target.closest("#os .app-icon, #os .about");',
    'if(icon)window.osEarlyView=icon.getAttribute("data-view");',
    '});',
  ].join('');
}

// The document with the picker as <head>'s first child. React places the
// charset, viewport and title first in any head it renders, so the picker
// is added to the rendered markup instead.
export function withShellPicker(html: string, query: string): string {
  if (!html.includes('<head>')) throw new Error('the shell document has no <head>');
  return html.replace('<head>', `<head><script>${shellPicker(query)}</script>`);
}

export function ShellPage({
  title,
  description,
  assets,
  noScript,
  osHtml,
}: {
  title: string;
  description?: string | undefined;
  assets: PageAssets;
  noScript: ReactNode;
  osHtml: string;
}) {
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
      <body>
        {noScript}
        <div
          id="os"
          data-req="005-os-shell-FR-001 005-os-shell-FR-002 005-os-shell-FR-004"
          data-requirements={assets.requirements}
          data-playground={assets.playground?.manifest}
          data-playground-bytes={assets.playground?.bytes}
          dangerouslySetInnerHTML={{ __html: osHtml }}
        />
      </body>
    </html>
  );
}
