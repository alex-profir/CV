// Which requirements each app's content and the shell carry, read from the
// import graph of the site's source (007 research R5).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { onTestFinished, describe, expect, test, vi } from 'vitest';
import { build, mergeConfig } from 'vite';
import type { Plugin } from 'vite';
import { listFiles } from '../../../../tools/traceability/src/files.ts';
import { readUiFile } from '../../../../tools/traceability/src/ui-files.ts';
import { readCarried, reachable } from '../../scripts/requirements/carried.ts';
import viteConfig from '../../vite.config.ts';
import { REPO_ROOT } from '../helpers/copy.ts';

vi.setConfig({ testTimeout: 120_000 });

const FIXTURE = path.join(import.meta.dirname, '__fixtures__/carried');
const SRC = 'packages/web/src';
const ids = (set: Set<string> | undefined) => [...(set ?? [])].sort();
const id = (n: string) => `002-example-FR-${n}`;

// The data-req references written in a file of the real source.
const referencesIn = (file: string) => readUiFile(file, fs.readFileSync(path.join(REPO_ROOT, file), 'utf8')).references.map((token) => token.text);

// Every file under a folder of the real source.
const filesUnder = (dir: string): string[] =>
  fs.readdirSync(path.join(REPO_ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? filesUnder(file) : /\.tsx?$/.test(entry.name) ? [file] : [];
  });

describe('007-requirement-inspector-FR-006 007-requirement-inspector-FR-011: each view carries exactly what its modules hold', () => {
  test('on a fixture site, each view, its modules and its roots are exact', () => {
    const carried = readCarried(FIXTURE);
    expect([...carried.views.keys()]).toEqual(['shell', 'alpha', 'beta']);
    // The shell: its own modules, the shared one, the alpha icon and beta's
    // menu item in its declaration; never an app's content.
    expect(ids(carried.views.get('shell'))).toEqual([id('005'), id('006'), id('007'), id('010'), id('011')]);
    // A re-export is followed; a type-only import, a computed value and a
    // package import aren't.
    expect(ids(carried.views.get('alpha'))).toEqual([id('001'), id('002'), id('005')]);
    // A Content written inline reaches each component it names; `export *`
    // is followed.
    expect(ids(carried.views.get('beta'))).toEqual([id('003'), id('004'), id('005')]);
    expect(carried.roots).toEqual(
      new Map([
        ['alpha', [`${SRC}/apps/alpha/AlphaContent.tsx`]],
        ['beta', [`${SRC}/apps/beta/BetaOne.tsx`, `${SRC}/apps/beta/BetaTwo.tsx`]],
      ]),
    );
    expect(ids(carried.modules.get('shell'))).toEqual(
      [
        'apps/alpha/AlphaIcon.tsx',
        'apps/alpha/app.tsx',
        'apps/beta/app.tsx',
        'apps/index.ts',
        'client/os.tsx',
        'os/Shell.tsx',
        'pages/ShellPage.tsx',
        'shared/Shared.tsx',
      ].map((file) => `${SRC}/${file}`),
    );
    expect(ids(carried.modules.get('alpha'))).toEqual(
      ['apps/alpha/AlphaContent.tsx', 'apps/alpha/Helper.tsx', 'apps/alpha/reexport.ts', 'shared/Shared.tsx'].map((file) => `${SRC}/${file}`),
    );
  });

  test("an app whose Content can't be traced to an import fails, naming its file", () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'carried-')));
    onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }));
    fs.cpSync(FIXTURE, root, { recursive: true });
    const app = path.join(root, SRC, 'apps/alpha/app.tsx');
    fs.writeFileSync(app, fs.readFileSync(app, 'utf8').replace('Content: AlphaContent', 'Content: makeContent()'));
    expect(() => readCarried(root)).toThrow(`${SRC}/apps/alpha/app.tsx: can't find the module the app's Content comes from`);
  });
});

describe('007-requirement-inspector-FR-006 007-requirement-inspector-FR-011 007-requirement-inspector-FR-012: on the real source', () => {
  const carried = readCarried(REPO_ROOT);
  const shell = carried.views.get('shell')!;

  test("the shell carries 005's menu bar, dock, window frame, home screen and About, and 007's controls, and none of 004's", () => {
    const shellFiles = ['shells/desktop/MenuBar.tsx', 'shells/desktop/Dock.tsx', 'shells/desktop/Window.tsx', 'shells/desktop/TitleBar.tsx', 'shells/mobile/HomeScreen.tsx', 'os/About.tsx'];
    for (const file of shellFiles) {
      const references = referencesIn(`${SRC}/${file}`);
      expect(references.length, file).toBeGreaterThan(0);
      for (const reference of references) expect(shell.has(reference), `${file}: ${reference}`).toBe(true);
    }
    expect(shell.has('007-requirement-inspector-FR-001')).toBe(true);
    // 004's only through a module an app reaches too, such as the CV's link
    // that About this site shows: a shared module counts for both.
    const appModules = new Set([...carried.modules].filter(([view]) => view !== 'shell').flatMap(([, files]) => [...files]));
    const shellOnly = [...carried.modules.get('shell')!].filter((file) => !appModules.has(file));
    expect(shellOnly.flatMap(referencesIn).filter((reference) => reference.startsWith('004-cv-page-'))).toEqual([]);
  });

  test("the CV app carries 004's, and the Terminal 006's, including output no command has produced yet", () => {
    const cv = carried.views.get('cv')!;
    // The footer is /cv's alone: the CV app doesn't show it.
    const cvFiles = filesUnder(`${SRC}/cv`).filter((file) => !file.endsWith('/SiteFooter.tsx'));
    for (const reference of cvFiles.flatMap(referencesIn)) expect(cv.has(reference), reference).toBe(true);
    expect(cv.has('004-cv-page-FR-032')).toBe(false);
    expect([...cv].some((reference) => reference.startsWith('004-cv-page-'))).toBe(true);
    const terminal = carried.views.get('terminal')!;
    const content = filesUnder(`${SRC}/apps/terminal`).filter((file) => !file.endsWith('/app.tsx') && !file.endsWith('/TerminalIcon.tsx'));
    const references = content.flatMap(referencesIn);
    expect(references.length).toBeGreaterThan(10);
    for (const reference of references) expect(terminal.has(reference), reference).toBe(true);
  });

  test('every data-req in every module the shell reaches is in at least one view', () => {
    const every = new Set([...carried.views.values()].flatMap((set) => [...set]));
    const modules = reachable(REPO_ROOT, [`${SRC}/client/os.tsx`, `${SRC}/pages/ShellPage.tsx`]);
    const references = [...modules].flatMap(referencesIn);
    expect(references.length).toBeGreaterThan(50);
    for (const reference of references) expect(every.has(reference), reference).toBe(true);
  });

  test('no source file outside packages/web/src holds a data-req', () => {
    const outside = listFiles(REPO_ROOT).uiFiles.filter((file) => !file.startsWith(`${SRC}/`) && /^(?:packages|tools)\//.test(file) && !/\/test\//.test(file));
    expect(outside.length).toBeGreaterThan(20);
    expect(outside.filter((file) => referencesIn(file).length > 0)).toEqual([]);
  });

  test("the walker reaches exactly the modules Rolldown bundles into the os script (research R5's bundler proof)", async () => {
    let bundled: string[] = [];
    const capture: Plugin = {
      name: 'capture-os-modules',
      generateBundle(_options, bundle) {
        for (const chunk of Object.values(bundle)) {
          if (chunk.type === 'chunk' && chunk.name === 'os') bundled = chunk.moduleIds;
        }
      },
    };
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'carried-bundle-'));
    onTestFinished(() => fs.rmSync(outDir, { recursive: true, force: true }));
    await build(mergeConfig(viteConfig, { configFile: false, logLevel: 'silent', plugins: [capture], build: { outDir, write: false, manifest: false } }));
    // The site's own modules: no package (the workspace's are imported by
    // name, as `@cv/os-core`), no virtual module.
    const ours = bundled
      .filter((module) => !module.startsWith('\0') && module.startsWith(`${REPO_ROOT}/`) && !module.includes('/node_modules/') && /\.tsx?$/.test(module))
      .map((module) => path.relative(REPO_ROOT, module).split(path.sep).join('/'))
      .filter((module) => !/^packages\/(?!web\/)/.test(module))
      .sort();
    expect(ours.length).toBeGreaterThan(40);
    expect([...reachable(REPO_ROOT, [`${SRC}/client/os.tsx`])].sort()).toEqual(ours);
  });
});
