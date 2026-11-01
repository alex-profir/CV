// The Playground part (008 contracts/cli.md Parts and Variants): on the real
// build it passes with every variant; each copy with one fault fails with a
// line that names the part, the check, the width and the example. Broken cases
// are copies of the repository with one change, built (005 tasks.md Notes),
// and run only the check they break.
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { PLAYGROUND_CHECKS, playgroundVariant } from '../src/parts/playground.ts';
import { renderProblem } from '../src/report.ts';
import { SHELL_SIZES } from '../src/shell-states.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';

vi.setConfig({ testTimeout: 600_000 });

const SOURCE = 'packages/web/src/apps/playground';

describe('008-typescript-playground-FR-075: the Playground part checks every promise on the real build and names what fails', () => {
  test('on the real build the part passes, with every variant of contracts/cli.md in order', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['playground'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.map(({ variant, status }) => `${variant} ${status}`)).toEqual(PLAYGROUND_CHECKS.flatMap(({ shell, names }) => names.map((name) => `${playgroundVariant(shell, name, SHELL_SIZES[shell].width)} pass`)));
    const desktop = (name: string) => `desktop/playground-${name}/1440px`;
    expect(report.results.map(({ variant }) => variant)).toEqual(
      expect.arrayContaining([
        ...['download', 'version', 'examples/skills-at-a-glance', 'run', 'interval', 'stop', 'stuck', 'timer-60s', 'dialogs', 'sandbox', 'limits', 'kept', 'reset', 'share', 'broken-link', 'too-long', 'specs'].map(desktop),
        'mobile/playground-icon/375px',
        'mobile/playground-shared-link/375px',
      ]),
    );
  });

  test('a copy whose example has a type error fails, naming the example, the width and the diagnostic', async () => {
    const root = seededCopy((copy) => replaceIn(copy, `${SOURCE}/examples/generics.ts`, 'function first<T>(items: readonly T[]): T | undefined {', 'const wrong: number = "one";\nfunction first<T>(items: readonly T[]): T | undefined {'));
    const lines = (await runCheck(root, { parts: ['playground'], playgroundChecks: ['examples'] })).problems.map(renderProblem);
    expect(lines).toEqual([expect.stringMatching(/^playground \/ desktop\/playground-examples\/generics\/1440px diagnostics Generics: 1 diagnostic with the default options: .*2:7.*TS2322/)]);
  });

  test('a copy whose schema loses a field an example uses fails, naming the examples that use it', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/content/src/shape.generated.ts', '  /** List some keywords pertaining to this skill */\n  keywords?: string[];\n', ''));
    const lines = (await runCheck(root, { parts: ['playground'], playgroundChecks: ['examples'] })).problems.map(renderProblem);
    expect(lines).toEqual(expect.arrayContaining([expect.stringMatching(/^playground \/ desktop\/playground-examples\/skills-at-a-glance\/1440px diagnostics Skills at a glance: \d+ diagnostics? with the default options: .*TS2339/)]));
  });

  test('a copy whose shared link runs on open fails, naming the check', async () => {
    const root = seededCopy((copy) => replaceIn(copy, `${SOURCE}/controller.ts`, "    session.update({ example: null });\n    showMessage('info', had ? 'sharedReplaced'", "    session.update({ example: null });\n    runCode();\n    showMessage('info', had ? 'sharedReplaced'"));
    const lines = (await runCheck(root, { parts: ['playground'], playgroundChecks: ['share'] })).problems.map(renderProblem);
    expect(lines).toEqual(expect.arrayContaining([expect.stringMatching(/^playground \/ desktop\/playground-share\/1440px ran-on-open link: .*a shared link must not run$/)]));
  });

  test('a copy with a popup for a 60 s timer fails, naming the check', async () => {
    const root = seededCopy((copy) => replaceIn(copy, `${SOURCE}/running.ts`, "if (run.blockedSince !== null && stuck === 'no' && now - run.blockedSince >= STUCK_MS) stuck = 'due';", "if (stuck === 'no' && now - run.startedAt >= STUCK_MS) stuck = 'due';"));
    const lines = (await runCheck(root, { parts: ['playground'], playgroundChecks: ['timer-60s'] })).problems.map(renderProblem);
    expect(lines).toContain('playground / desktop/playground-timer-60s/1440px timer popup: a popup appeared for a 60 s timer; waiting is not being stuck');
  });

  test("a copy whose code can read the site's storage fails, naming the check and what it read", async () => {
    const root = seededCopy((copy) => replaceIn(copy, `${SOURCE}/engine/runner/host.ts`, "frame.setAttribute('sandbox', 'allow-scripts');", "frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');"));
    const lines = (await runCheck(root, { parts: ['playground'], playgroundChecks: ['sandbox'] })).problems.map(renderProblem);
    // The runtime keeps the cookie off now (FR-041 as amended); the origin still shows.
    expect(lines).toContainEqual(expect.stringMatching(/^playground \/ desktop\/playground-sandbox\/1440px sandbox request: the request to another site says Origin http/));
  });
});
