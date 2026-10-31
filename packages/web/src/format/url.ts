// An address as /cv shows it: without its scheme (004 FR-012).
export const withoutScheme = (url: string) => url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
