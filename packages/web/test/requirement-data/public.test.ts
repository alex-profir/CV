// The built data file holds what the repository makes public and nothing
// from the machine that built it (007 FR-014, contracts/requirement-data.md).
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { buildRequirementData } from '../../scripts/requirements/index.ts';
import { REPO_ROOT, repoCopy } from '../helpers/copy.ts';
import { builtSite } from '../helpers/site.ts';

vi.setConfig({ testTimeout: 120_000 });

// The data file the build wrote, with its served path and text.
function builtData(): { served: string; text: string } {
  const site = builtSite();
  const files = fs.readdirSync(path.join(site.dir, 'assets')).filter((file) => /^requirements-[0-9a-f]{8}\.json$/.test(file));
  expect(files).toHaveLength(1);
  return { served: `/assets/${files[0]}`, text: fs.readFileSync(path.join(site.dir, 'assets', files[0]!), 'utf8') };
}

const keysOf = (value: object) => Object.keys(value).sort();

const INLINE_KEYS: Record<string, string[]> = {
  text: ['kind', 'text'],
  code: ['kind', 'text'],
  strong: ['children', 'kind'],
  em: ['children', 'kind'],
  s: ['children', 'kind'],
  link: ['children', 'href', 'kind'],
  file: ['children', 'kind', 'path'],
  ref: ['feature', 'id', 'kind', 'line', 'text'],
};

// Fails on any key data-model.md's shape doesn't name, at any level.
function checkInline(nodes: unknown[], files: string[]): void {
  for (const node of nodes as Record<string, unknown>[]) {
    expect(keysOf(node)).toEqual(INLINE_KEYS[node.kind as string]);
    if (node.kind === 'file') files.push(node.path as string);
    if (node.kind === 'link') expect(node.href).toMatch(/^https?:\/\//);
    if (Array.isArray(node.children)) checkInline(node.children, files);
  }
}

describe('007-requirement-inspector-FR-014: the data file holds only what the repository makes public', () => {
  test("it matches data-model.md's shape, with no other key at any level", () => {
    const data = JSON.parse(builtData().text);
    expect(keysOf(data)).toEqual(['requirements', 'specs', 'version', 'views']);
    expect(keysOf(data.version)).toEqual(['commit', 'dirty']);
    expect(data.version.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(typeof data.version.dirty).toBe('boolean');
    const files: string[] = [];
    for (const spec of data.specs) {
      expect(keysOf(spec)).toEqual(['active', 'feature', 'file', 'number', 'status', 'title']);
      expect(['Approved', 'Draft']).toContain(spec.status);
      files.push(spec.file);
    }
    for (const [fullId, record] of Object.entries<Record<string, any>>(data.requirements)) {
      expect(keysOf(record)).toEqual(['feature', 'fullId', 'id', 'line', 'tests', 'text']);
      expect(record.fullId).toBe(fullId);
      checkInline(record.text, files);
      for (const reference of record.tests) {
        expect(keysOf(reference)).toEqual(['file', 'line', 'name']);
        files.push(reference.file);
      }
    }
    expect(Object.keys(data.views)[0]).toBe('shell');
    for (const ids of Object.values<string[]>(data.views)) for (const id of ids) expect(data.requirements[id]).toBeDefined();
    expect(files.length).toBeGreaterThan(100);
    for (const file of files) {
      expect(file, file).toMatch(/^[\w.@-]+(?:\/[\w.@-]+)+$/);
      expect(file.includes('..'), file).toBe(false);
    }
  });

  test("it holds no absolute path, home directory, user name or environment value of the machine", () => {
    const { text } = builtData();
    const data = JSON.parse(text);
    expect(text).not.toContain(REPO_ROOT);
    expect(text).not.toContain(os.homedir());
    expect(text).not.toContain(os.tmpdir());
    expect(text.toLowerCase()).not.toContain(os.userInfo().username.toLowerCase());
    // The commit, the spec folders and the repository's owner and name are
    // the repository's own, as CI's variables may name them too: a test's
    // title names the owner's profile.
    const site = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'packages/content/site.json'), 'utf8'));
    const [owner, name] = new URL(site.repository).pathname.split('/').filter(Boolean);
    const own = new Set<string>([data.version.commit, ...data.specs.map((spec: { feature: string }) => spec.feature), owner!, name!, `${owner}/${name}`]);
    const values = Object.values(process.env).filter((value): value is string => value !== undefined && value.trim().length > 8 && !own.has(value.trim()));
    expect(values.length).toBeGreaterThan(5);
    for (const value of values) expect(text.includes(value), 'an environment value').toBe(false);
  });

  test('the same files and commit give byte-identical data', () => {
    const copy = repoCopy();
    const first = JSON.stringify(buildRequirementData(copy));
    const second = JSON.stringify(buildRequirementData(copy));
    expect(second).toBe(first);
    expect(JSON.parse(first).version.dirty).toBe(false);
  });

  test("its name's hash is its SHA-256's first 8 hex characters, and it is served, listed and precached", () => {
    const { served, text } = builtData();
    expect(served).toBe(`/assets/requirements-${crypto.createHash('sha256').update(text).digest('hex').slice(0, 8)}.json`);
    const site = builtSite();
    expect(site.manifest.files.find((file) => file.path === served)).toMatchObject({ type: 'application/json' });
    const worker = fs.readFileSync(path.join(site.dir, 'sw.js'), 'utf8');
    const precache: string[] = JSON.parse(/^const PRECACHE = (.*);$/m.exec(worker)![1]!);
    expect(precache).toContain(served);
    const index = fs.readFileSync(path.join(site.dir, 'index.html'), 'utf8');
    expect(index).toContain(`data-requirements="${served}"`);
  });
});
