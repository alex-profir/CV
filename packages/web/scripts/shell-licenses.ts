// The license file of the shell worker (006 research R40): the name,
// version and license text of every package the worker bundles, written as
// `assets/shell-licenses-<hash>.txt`, and named in a comment at the top of
// the worker file. A package is found from the modules of the worker's
// chunk, and from the "Bundled license information" a prebuilt package
// (just-bash's browser build) lists for what it inlined itself.
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const NODE_MODULES = `${path.sep}node_modules${path.sep}`;

// The folder of the package a file is in, or null outside node_modules.
function packageDir(file: string): string | null {
  const at = file.lastIndexOf(NODE_MODULES);
  if (at < 0) return null;
  const rest = file.slice(at + NODE_MODULES.length).split(path.sep);
  const name = rest[0]!.startsWith('@') ? rest.slice(0, 2) : rest.slice(0, 1);
  return path.join(file.slice(0, at + NODE_MODULES.length), ...name);
}

// A package by name, as Node would find it from `from`.
function findPackage(name: string, from: string): string | null {
  for (let dir = from; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
    if (path.dirname(dir) === dir) return null;
  }
}

// The packages a prebuilt file says it inlined: the `name/file:` lines of
// its "Bundled license information" comment.
function inlinedNames(code: string): string[] {
  const at = code.indexOf('Bundled license information:');
  if (at < 0) return [];
  const block = code.slice(at, code.indexOf('*/', at));
  return [...block.matchAll(/^\s*((?:@[\w.-]+\/)?[\w.-]+)\/[^\s:]*:\s*$/gm)].map((match) => match[1]!);
}

type PackageLicense = { name: string; version: string; license: string; text: string };

function licenseOf(dir: string): PackageLicense {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) as { name: string; version: string; license?: string };
  const file = fs.readdirSync(dir).find((name) => /^(?:licen[cs]e|copying)(?:\.|$)/i.test(name));
  if (file === undefined) throw new Error(`${manifest.name} has no license file`);
  return { name: manifest.name, version: manifest.version, license: manifest.license ?? 'see below', text: fs.readFileSync(path.join(dir, file), 'utf8').trim() };
}

export function licensesText(dirs: Iterable<string>): string {
  const packages = [...new Set(dirs)].map(licenseOf).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return `${packages.map((entry) => `${entry.name} ${entry.version}\nLicense: ${entry.license}\n\n${entry.text}\n`).join('\n---\n\n')}`;
}

export const LICENSE_ASSET = 'shell-licenses.txt';

// The worker build's plugin: emits the license file beside the worker and
// names it in the worker's first line.
export function shellLicenses(): Plugin {
  const inlined = new Map<string, string[]>();
  return {
    name: 'cv:shell-licenses',
    transform(code, id) {
      if (packageDir(id) === null) return null;
      const names = inlinedNames(code);
      if (names.length > 0) inlined.set(id, names);
      return null;
    },
    generateBundle(_, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.isEntry) continue;
        const dirs: string[] = [];
        for (const id of chunk.moduleIds) {
          const dir = packageDir(id);
          if (dir === null) continue;
          dirs.push(dir);
          for (const name of inlined.get(id) ?? []) {
            const found = findPackage(name, dir);
            if (found === null) throw new Error(`${name}, which ${path.basename(dir)} bundles, is not installed`);
            dirs.push(found);
          }
        }
        const reference = this.emitFile({ type: 'asset', name: LICENSE_ASSET, source: licensesText(dirs) });
        chunk.code = `/*! The Terminal's shell. The licenses of what it bundles: /${this.getFileName(reference)} */\n${chunk.code}`;
      }
    },
  };
}
