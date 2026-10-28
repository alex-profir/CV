// The keyboard flows on the root (005 contracts/cli.md Parts), and the parts
// that fail when one thing in the shell breaks. Broken cases are copies of
// the repository with one change, built (see 005 tasks.md Notes).
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';

vi.setConfig({ testTimeout: 180_000 });

const TITLE_BAR = 'packages/web/src/shells/desktop/TitleBar.tsx';

const DESKTOP = 'packages/web/src/shells/desktop/Desktop.tsx';

const REDUCER = 'packages/os-core/src/reducer.ts';

const STYLES = 'packages/web/src/styles/os.css';

const rootLines = (lines: string[]) => lines.filter((line) => line.split(' ')[1] === '/');

describe('005-os-shell-FR-057: the keyboard check runs the desktop and mobile flows with keys alone', () => {
  test('on the real build the keyboard part passes both flows on the root', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['keyboard'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.filter((result) => result.page === '/').map(({ variant, status }) => `${variant} ${status}`)).toEqual(['desktop/keyboard/1440px pass', 'mobile/keyboard/375px pass']);
  });

  test("a copy with the close control's name removed fails accessibility with axe:button-name", async () => {
    const root = seededCopy((copy) => replaceIn(copy, TITLE_BAR, 'className="control control-close" aria-label={fill(siteText.desktop.controls.close, { window: name })}', 'className="control control-close"'));
    const report = await runCheck(root, { parts: ['accessibility'] });
    const lines = rootLines(report.problems.map(renderProblem));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => / desktop\/[a-z-]+\/1440px axe:button-name /.test(line))).toBe(true);
    expect(lines.some((line) => line.startsWith('accessibility / desktop/two-windows/1440px axe:button-name '))).toBe(true);
  });

  test("a copy with the close shortcut's handler removed fails keyboard with shortcut Alt+Shift+W", async () => {
    const root = seededCopy((copy) => replaceIn(copy, DESKTOP, "        case 'close':\n          return dispatch({ type: 'close', view: focused! });\n", ''));
    const report = await runCheck(root, { parts: ['keyboard'] });
    expect(report.problems.map(renderProblem)).toEqual(['keyboard / desktop/keyboard/1440px shortcut Alt+Shift+W: the CV window did not close']);
  });

  test("a copy that sends a minimized window's focus to body fails keyboard with focus-target, naming the step", async () => {
    const root = seededCopy((copy) =>
      replaceIn(copy, REDUCER, "minimized: true })));\n      return { ...state, ...after, effects: withEffects(focusAfterLeaving(action.view, after.focused)) };", "minimized: true })));\n      return { ...state, ...after };"),
    );
    const report = await runCheck(root, { parts: ['keyboard'] });
    const lines = report.problems.map(renderProblem);
    expect(lines).toContainEqual(expect.stringMatching(/^keyboard \/ desktop\/keyboard\/1440px focus-target step \d+ "minimize the CV window": focus went to body, expected the About this site window's title$/));
    expect(report.problems.every((problem) => problem.type === 'focus-target' || problem.type === 'no-focus-indicator')).toBe(true);
  });

  test('a copy whose shell loads a font from another site fails other-sites in both shells', async () => {
    const font = 'https://fonts.example.com/remote.woff2';
    const root = seededCopy((copy) =>
      replaceIn(copy, STYLES, 'html:not([data-shell]) #os,', `@font-face {\n  font-family: "Remote";\n  src: url("${font}");\n}\n\nhtml body #os .window-title,\nhtml body #os .app-title {\n  font-family: "Remote";\n}\n\nhtml:not([data-shell]) #os,`),
    );
    const report = await runCheck(root, { parts: ['other-sites'] });
    const lines = report.problems.map(renderProblem);
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^other-sites / desktop/cv-app/1440px other-site-request ${font.replace(/\./g, '\\.')}: requested by `)));
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^other-sites / mobile/cv-app/375px other-site-request ${font.replace(/\./g, '\\.')}: requested by `)));
  });
});
