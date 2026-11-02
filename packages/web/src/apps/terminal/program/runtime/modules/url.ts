// `url` (009 contracts/node-api.md).
const invalid = (code: string, message: string, Kind: ErrorConstructor | TypeErrorConstructor = TypeError) => Object.assign(new Kind(message), { code });

// Path characters that URL parsing would otherwise read as something else.
const encodePath = (path: string) => path.replace(/%/g, '%25').replace(/\\/g, '%5C').replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/\t/g, '%09').replace(/\?/g, '%3F').replace(/#/g, '%23');

export function createUrl(resolve: (path: string) => string) {
  return {
    URL,
    URLSearchParams,
    fileURLToPath(url: string | URL): string {
      const parsed = typeof url === 'string' ? new URL(url) : url;
      if (!(parsed instanceof URL) && typeof (parsed as URL).href !== 'string') throw invalid('ERR_INVALID_ARG_TYPE', 'The "path" argument must be of type string or an instance of URL.');
      if (parsed.protocol !== 'file:') throw invalid('ERR_INVALID_URL_SCHEME', 'The URL must be of scheme file');
      if (parsed.hostname !== '') throw invalid('ERR_INVALID_FILE_URL_PATH', 'File URL host must be "localhost" or empty on browser');
      if (/%2f/i.test(parsed.pathname)) throw invalid('ERR_INVALID_FILE_URL_PATH', 'File URL path must not include encoded / characters');
      return decodeURIComponent(parsed.pathname);
    },
    pathToFileURL(path: string): URL {
      const absolute = resolve(path);
      const full = path.endsWith('/') && !absolute.endsWith('/') ? `${absolute}/` : absolute;
      return new URL(`file://${encodePath(full)}`);
    },
  };
}
