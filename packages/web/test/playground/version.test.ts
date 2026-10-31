// The TypeScript version the Playground runs (spec US1): the status bar
// shows the bundled TypeScript's own version, read from the engine, never
// written in the site's source.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test, vi } from 'vitest';
import { ts } from '../helpers/bundled-typescript.ts';
import { builtSite } from '../helpers/site.ts';
import { engineManifest, openPlaygroundPage, PLAYGROUND } from '../helpers/playground.ts';

vi.setConfig({ testTimeout: 180_000 });

const SOURCE = fileURLToPath(new URL('../../src/', import.meta.url));

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(full) : [full];
  });
}

describe('008-typescript-playground-FR-012: the status bar names the TypeScript version the engine runs', () => {
  test("the engine manifest's version is the bundled TypeScript's", () => {
    const manifest = engineManifest(builtSite());
    expect(manifest.typescript).toBe(ts.version);
    expect(manifest.typescript).toMatch(/^\d+\.\d+\.\d+/);
  });

  test("span.ts-version reads 'TypeScript ' and that version", async () => {
    const manifest = engineManifest(builtSite());
    const page = await openPlaygroundPage();
    expect((await page.locator(`${PLAYGROUND} .playground-status span.ts-version`).textContent())?.trim()).toBe(`TypeScript ${manifest.typescript}`);
  });

  test('no file under packages/web/src/ holds the version literally', () => {
    const literal = ts.version as string;
    const holding = sourceFiles(SOURCE).filter((file) => fs.readFileSync(file, 'utf8').includes(literal));
    expect(holding).toEqual([]);
  });
});
