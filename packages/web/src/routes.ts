// The site's addresses, in one place (004 research R3, data-model.md Route
// table). The build copies the table into the site manifest, and the local
// server, the service worker and the checks all answer from it. Pure: no
// Node or DOM import.

export type PageRoute = { path: string; aliases: string[]; file: string };

export type RedirectRoute = { from: string; to: string; status: number };

export type NotFoundRoute = { file: string; status: number };

export type Routes = {
  pages: PageRoute[];
  redirects: RedirectRoute[];
  notFound: NotFoundRoute;
};

export type SiteManifest = {
  version: string;
  routes: Routes;
  files: { path: string; hash: string; type: string }[];
};

export type RouteMatch =
  | { kind: 'page'; file: string }
  | { kind: 'redirect'; to: string; status: number }
  | { kind: 'not-found'; file: string; status: number };

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const ROUTES: Routes = deepFreeze({
  pages: [{ path: '/cv', aliases: ['/cv/'], file: 'cv.html' }],
  redirects: [{ from: '/', to: '/cv', status: 307 }],
  notFound: { file: '404.html', status: 404 },
});

// What a path answers. `pathname` has no query string or fragment: the
// caller strips them. Matching is exact, so `/cv.html` and `/cv/x` are
// not found.
export function resolveRoute(routes: Routes, pathname: string): RouteMatch {
  for (const page of routes.pages) {
    if (page.path === pathname || page.aliases.includes(pathname)) return { kind: 'page', file: page.file };
  }
  for (const redirect of routes.redirects) {
    if (redirect.from === pathname) return { kind: 'redirect', to: redirect.to, status: redirect.status };
  }
  return { kind: 'not-found', file: routes.notFound.file, status: routes.notFound.status };
}
