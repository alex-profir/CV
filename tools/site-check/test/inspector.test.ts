// The inspector part (007 contracts/cli.md Parts and Tests): on the real
// build it passes in both shells; each copy with one fault fails with the
// line that names the part, the variant, the view and the requirement. A
// copy whose spec text changed passes, its view showing the new text.
// Broken cases are copies of the repository with one change, built (005
// tasks.md Notes).
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { buildRequirementData } from '../../../packages/web/scripts/requirements/index.ts';
import type { RequirementData } from '../../../packages/web/scripts/requirements/index.ts';
import { SITE_DIR, runCheck } from '../src/check.ts';
import { inspectorVariants } from '../src/parts/inspector.ts';
import { renderProblem } from '../src/report.ts';
import { SHELL_SIZES } from '../src/shell-states.ts';
import type { Shell } from '../src/shell-states.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';
import { REPO_ROOT } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 600_000 });

const SHELLS: readonly Shell[] = ['desktop', 'mobile'];
const data = buildRequirementData(REPO_ROOT);

// The CV view's first requirement, and one with tests and a line holding
// a MUST, from the repository.
const cvIds = data.views.cv!;
const first = data.requirements[cvIds[0]!]!;
const tested = cvIds.map((id) => data.requirements[id]!).find((record) => record.tests.length >= 2)!;
const specFile = (feature: string) => `specs/${feature}/spec.md`;

const variant = (shell: Shell, name: string) => `${shell}/${name}/${SHELL_SIZES[shell].width}px`;

const linesOf = async (root: string, options: Parameters<typeof runCheck>[1] = {}) => (await runCheck(root, { parts: ['inspector'], ...options })).problems.map(renderProblem);

describe('007-requirement-inspector-FR-030: the inspector part compares every view with the repository, in both shells (SC-003, SC-004)', () => {
  test('on the real build the part passes, with one result per view and an elements sweep in each shell', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['inspector'], repository: REPO_ROOT });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.map(({ variant: name, status }) => `${name} ${status}`)).toEqual(SHELLS.flatMap((shell) => inspectorVariants(shell, SHELL_SIZES[shell].width).map((name) => `${name} pass`)));
    expect(report.results[0]!.variant).toBe('desktop/cv-specs/1440px');
    expect(report.results.at(-1)!.variant).toBe('mobile/elements/375px');
  });

  test('a copy whose CV view leaves a requirement out fails with missing-requirement, naming the view, shell and requirement', async () => {
    const root = seededCopy((copy) =>
      replaceIn(copy, 'packages/web/src/inspector/derive.ts', 'const ids = data.views[dataView(view)] ?? [];', `const ids = (data.views[dataView(view)] ?? []).filter((id) => id !== '${first.fullId}');`),
    );
    const lines = await linesOf(root);
    for (const shell of SHELLS) expect(lines).toContain(`inspector / ${variant(shell, 'cv-specs')} missing-requirement ${first.fullId}: the CV app carries it, but its spec view doesn't list it`);
  });

  test('a copy whose built data file has a requirement\'s text edited after the build fails with text-mismatch, naming its spec line', async () => {
    const root = seededCopy(() => undefined);
    const assets = path.join(root, SITE_DIR, 'assets');
    const file = path.join(assets, fs.readdirSync(assets).find((name) => /^requirements-[0-9a-f]{8}\.json$/.test(name))!);
    const built = JSON.parse(fs.readFileSync(file, 'utf8')) as RequirementData;
    built.requirements[first.fullId]!.text.unshift({ kind: 'text', text: 'Edited after the build. ' });
    fs.writeFileSync(file, JSON.stringify(built));
    const lines = await linesOf(root);
    for (const shell of SHELLS) {
      expect(lines).toContain(`inspector / ${variant(shell, 'cv-specs')} text-mismatch ${first.fullId}: differs from ${specFile(first.feature)} line ${first.line} at "Edited after the"`);
    }
  });

  test('a copy whose reader drops each requirement\'s last test fails with tests-mismatch, naming the missing test', async () => {
    const root = seededCopy((copy) =>
      replaceIn(copy, 'packages/web/scripts/requirements/read.ts', 'tests: tests.get(fullId) ?? [] };', 'tests: (tests.get(fullId) ?? []).slice(0, -1) };'),
    );
    const lines = await linesOf(root);
    const last = tested.tests.at(-1)!;
    const n = tested.tests.length;
    for (const shell of SHELLS) {
      expect(lines).toContain(`inspector / ${variant(shell, 'cv-specs')} tests-mismatch ${tested.fullId}: lists ${n - 1} ${n - 1 === 1 ? 'test' : 'tests'}, 001 counts ${n} (missing ${last.file}:${last.line})`);
    }
  });

  test('a copy whose Terminal resets its session when it unmounts fails with state-lost on Back', async () => {
    const root = seededCopy((copy) =>
      replaceIn(
        copy,
        'packages/web/src/apps/terminal/Terminal.tsx',
        '  const state = useSyncExternalStore(session.subscribe, session.get, session.get);\n',
        '  const state = useSyncExternalStore(session.subscribe, session.get, session.get);\n  useEffect(() => () => session.reset(), []);\n',
      ),
    );
    const lines = await linesOf(root);
    for (const shell of SHELLS) expect(lines).toContain(`inspector / ${variant(shell, 'terminal-specs')} state-lost terminal: the half-typed command "hel" was "" after Back to Terminal`);
    // Nothing else of the part fails.
    expect(lines.filter((line) => !line.includes(' state-lost terminal: '))).toEqual([]);
  });

  test('a copy whose spec text changed passes, its view showing the new text (US2 scenario 5)', async () => {
    const record = cvIds.map((id) => data.requirements[id]!).find((candidate) => fs.readFileSync(path.join(REPO_ROOT, specFile(candidate.feature)), 'utf8').split('\n')[candidate.line - 1]!.includes(' MUST '))!;
    const added = 'MUST, as the copy now says,';
    const root = seededCopy((copy) => {
      const file = path.join(copy, specFile(record.feature));
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines[record.line - 1] = lines[record.line - 1]!.replace(' MUST ', ` ${added} `);
      fs.writeFileSync(file, lines.join('\n'));
    });
    const copied = buildRequirementData(root);
    const shown = copied.requirements[record.fullId]!.text.map((node) => ('text' in node ? node.text : '')).join('');
    expect(shown).toContain(added);
    expect(await linesOf(root)).toEqual([]);
  });

  test('a copy whose walker misses the no-script page fails: the elements sweep finds its requirement, and About this site\'s view misses it', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/web/scripts/requirements/carried.ts', ', `${SRC}/os/NoScript.tsx`]', ']'));
    const lines = await linesOf(root);
    for (const shell of SHELLS) {
      expect(lines).toContain(`inspector / ${variant(shell, 'about-specs')} missing-requirement 005-os-shell-FR-049: the shell carries it, but About this site's view doesn't list it`);
      expect(lines.some((line) => line.startsWith(`inspector / ${variant(shell, 'elements')} uncarried-element 005-os-shell-FR-049: carried by div.no-script, but the shell's view doesn't list it (`))).toBe(true);
    }
  });
});
