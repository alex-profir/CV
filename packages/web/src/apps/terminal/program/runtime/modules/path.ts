// `path`: all of `path.posix` (009 contracts/node-api.md), as Node's behaves.
const assertString = (value: unknown, name: string) => {
  if (typeof value !== 'string') {
    const error = new TypeError(`The "${name}" argument must be of type string. Received ${value === null ? 'null' : value === undefined ? 'undefined' : `type ${typeof value}`}`) as TypeError & { code: string };
    error.code = 'ERR_INVALID_ARG_TYPE';
    throw error;
  }
};

function normalizeParts(text: string, absolute: boolean): string {
  const out: string[] = [];
  for (const part of text.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      if (out.length > 0 && out.at(-1) !== '..') out.pop();
      else if (!absolute) out.push('..');
    } else out.push(part);
  }
  return out.join('/');
}

export function createPath(cwd: () => string) {
  const path = {
    sep: '/',
    delimiter: ':',
    resolve(...parts: string[]): string {
      let resolved = '';
      let absolute = false;
      for (let at = parts.length - 1; at >= -1 && !absolute; at -= 1) {
        const part = at >= 0 ? parts[at]! : cwd();
        assertString(part, `paths[${at}]`);
        if (part === '') continue;
        resolved = `${part}/${resolved}`;
        absolute = part.startsWith('/');
      }
      const normal = normalizeParts(resolved, absolute);
      return absolute ? `/${normal}` : normal === '' ? '.' : normal;
    },
    normalize(text: string): string {
      assertString(text, 'path');
      if (text === '') return '.';
      const absolute = text.startsWith('/');
      const trailing = text.endsWith('/');
      let normal = normalizeParts(text, absolute);
      if (normal === '') {
        if (absolute) return '/';
        return trailing ? './' : '.';
      }
      if (trailing) normal += '/';
      return absolute ? `/${normal}` : normal;
    },
    isAbsolute(text: string): boolean {
      assertString(text, 'path');
      return text.startsWith('/');
    },
    join(...parts: string[]): string {
      for (const part of parts) assertString(part, 'path');
      const joined = parts.filter((part) => part !== '').join('/');
      return joined === '' ? '.' : path.normalize(joined);
    },
    relative(from: string, to: string): string {
      assertString(from, 'from');
      assertString(to, 'to');
      const start = path.resolve(from).split('/').filter(Boolean);
      const end = path.resolve(to).split('/').filter(Boolean);
      let same = 0;
      while (same < start.length && same < end.length && start[same] === end[same]) same += 1;
      return [...start.slice(same).map(() => '..'), ...end.slice(same)].join('/');
    },
    toNamespacedPath: (text: string): string => text,
    dirname(text: string): string {
      assertString(text, 'path');
      if (text === '') return '.';
      const trimmed = text.replace(/\/+$/, '');
      if (trimmed === '') return '/';
      const at = trimmed.lastIndexOf('/');
      if (at < 0) return '.';
      if (at === 0) return '/';
      if (at === 1 && trimmed.startsWith('//')) return '//';
      return trimmed.slice(0, at).replace(/\/+$/, '') || '/';
    },
    basename(text: string, suffix?: string): string {
      if (suffix !== undefined) assertString(suffix, 'suffix');
      assertString(text, 'path');
      const trimmed = text.replace(/\/+$/, '');
      const base = trimmed.slice(trimmed.lastIndexOf('/') + 1);
      return suffix !== undefined && base !== suffix && base.endsWith(suffix) ? base.slice(0, -suffix.length) : base;
    },
    extname(text: string): string {
      assertString(text, 'path');
      const base = path.basename(text);
      const at = base.lastIndexOf('.');
      return at <= 0 || base === '..' ? '' : base.slice(at);
    },
    format(parts: { dir?: string; root?: string; base?: string; name?: string; ext?: string }): string {
      if (parts === null || typeof parts !== 'object') assertString(parts, 'pathObject');
      const dir = parts.dir || parts.root;
      const ext = parts.ext ?? '';
      const base = parts.base || `${parts.name ?? ''}${ext !== '' && !ext.startsWith('.') ? '.' : ''}${ext}`;
      if (!dir) return base;
      return dir === parts.root ? `${dir}${base}` : `${dir}/${base}`;
    },
    parse(text: string): { root: string; dir: string; base: string; ext: string; name: string } {
      assertString(text, 'path');
      const root = text.startsWith('/') ? '/' : '';
      const base = path.basename(text);
      const ext = path.extname(text);
      const trimmed = text.replace(/\/+$/, '');
      const at = trimmed.lastIndexOf('/');
      const dir = at > 0 ? trimmed.slice(0, at) : root;
      return { root, dir, base, ext, name: ext === '' ? base : base.slice(0, -ext.length) };
    },
    matchesGlob(text: string, pattern: string): boolean {
      const source = pattern.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replaceAll('\u0000', '(?:.*/)?');
      return new RegExp(`^${source}$`).test(text);
    },
    posix: null as unknown,
  };
  path.posix = path;
  return path;
}
