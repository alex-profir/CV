// `specs` on the real build (FR-013): every spec in `specs/`, read when the
// site is built, in numbered order with its link; one more spec in the
// repository shows with no change to the Terminal.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import type { Locator } from 'playwright';
import { siteData } from '@cv/content';
import { REPO_ROOT } from '../helpers/copy.ts';
import { serveShellFixture } from '../helpers/shell.ts';
import { openTerminalPage, runGroup } from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const NUMBERED = /^\d+-/;

// Every folder of `specs/` holding a `spec.md`, in numbered order.
function specFolders(root: string): string[] {
  return fs
    .readdirSync(path.join(root, 'specs'))
    .filter((name) => NUMBERED.test(name) && fs.existsSync(path.join(root, 'specs', name, 'spec.md')))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));
}

const specLink = (folder: string) => `${siteData.repository}/blob/main/specs/${folder}/spec.md`;

// The spec links `specs` shows, in order, with their names.
const specLinks = (group: Locator) =>
  group.locator('.run-output a[href*="/blob/main/specs/"]').evaluateAll((links) => links.map((link) => ({ href: link.getAttribute('href'), name: (link.textContent ?? '').trim() })));

describe('006-terminal-FR-013: specs lists the repository’s specs, read when the site is built', () => {
  test('on the real build, every folder of specs/ with a spec.md, in numbered order, each linked to its spec', async () => {
    const page = await openTerminalPage('desktop');
    const links = await specLinks(await runGroup(page, 'specs'));
    const folders = specFolders(REPO_ROOT);
    expect(folders.length).toBeGreaterThanOrEqual(6);
    expect(links.map((link) => link.href)).toEqual(folders.map(specLink));
    for (const [index, folder] of folders.entries()) {
      const title = /^#\s+Feature Specification:\s*(.+?)\s*$/m.exec(fs.readFileSync(path.join(REPO_ROOT, 'specs', folder, 'spec.md'), 'utf8'))![1];
      expect(links[index]!.name, folder).toBe(title);
    }
  });

  test('a build of a copy with one more spec shows it, with no change to the Terminal', async () => {
    const folder = '999-extra-fixture';
    const { url } = await serveShellFixture({
      edit: (root) => {
        const text = fs.readFileSync(path.join(root, 'specs/006-terminal/spec.md'), 'utf8').replace(/^#\s+Feature Specification:.*$/m, '# Feature Specification: An extra fixture spec');
        fs.mkdirSync(path.join(root, 'specs', folder), { recursive: true });
        fs.writeFileSync(path.join(root, 'specs', folder, 'spec.md'), text);
      },
    });
    const page = await openTerminalPage('desktop', { url });
    const links = await specLinks(await runGroup(page, 'specs'));
    expect(links.map((link) => link.href)).toEqual([...specFolders(REPO_ROOT), folder].map(specLink));
    expect(links.at(-1)!.name).toBe('An extra fixture spec');
  });
});
