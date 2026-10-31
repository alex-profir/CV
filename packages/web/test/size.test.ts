// The shell's script stays small with the Playground in it (008 SC-009,
// research R2): the Playground's interface adds at most 45 KB, brotli, to
// the `os` script, and the engine is reached only through the page's
// `data-playground`, never named in the script.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { builtSite } from './helpers/site.ts';

// The built `os` script's brotli size (quality 11) before 008, from
// a3f9532 (008 tasks.md T002).
const BASE_BROTLI = 98_293;
const BUDGET = 45_000;

function osScript(): { name: string; text: string } {
  const site = builtSite();
  const file = site.manifest.files.find((entry) => /^\/assets\/os-[\w-]{8}\.js$/.test(entry.path));
  if (file === undefined) throw new Error('the built site has no os script');
  return { name: file.path, text: fs.readFileSync(path.join(site.dir, file.path), 'utf8') };
}

describe('the os script with the Playground (SC-009)', () => {
  test(`its brotli size is at most ${BASE_BROTLI} + ${BUDGET} bytes`, () => {
    const { text } = osScript();
    const size = zlib.brotliCompressSync(Buffer.from(text), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
    expect(size, `${size} bytes, ${size - BASE_BROTLI} over the base`).toBeLessThanOrEqual(BASE_BROTLI + BUDGET);
  });

  test("it names no engine file: the engine is reached through the page's data-playground", () => {
    const { text } = osScript();
    const site = builtSite();
    const engineFiles = site.manifest.files.filter((entry) => entry.path.startsWith('/playground/'));
    expect(engineFiles.length).toBeGreaterThan(0);
    const folders = [...new Set(engineFiles.map((entry) => entry.path.split('/').slice(0, 3).join('/')))];
    for (const folder of folders) expect(text.includes(folder), folder).toBe(false);
    for (const entry of engineFiles) expect(text.includes(path.posix.basename(entry.path)), entry.path).toBe(false);
    const html = fs.readFileSync(path.join(site.dir, 'index.html'), 'utf8');
    expect(html).toMatch(/data-playground="\/playground\/[\da-f]+\/files\.json"/);
  });
});
