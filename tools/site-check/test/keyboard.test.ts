// The keyboard part on fixture sites (research R15), and the Terminal's flow
// on the real build and on copies with one fault (006 contracts/cli.md).
import { describe, expect, test, vi } from 'vitest';
import { runCheck } from '../src/check.ts';
import { renderProblem } from '../src/report.ts';
import { realSiteProject, replaceIn, seededCopy } from './helpers/root.ts';
import { fixture } from './helpers/sites.ts';

vi.setConfig({ testTimeout: 300_000 });

const COMMAND_LINE_FILE = 'packages/web/src/apps/terminal/CommandLine.tsx';

const TERMINAL_FILE = 'packages/web/src/apps/terminal/Terminal.tsx';

const TERMINAL_VARIANT = 'desktop/terminal-keyboard/1440px';

describe('004-cv-page-FR-054: every link is reached by keyboard, in reading order, with a visible focus indicator', () => {
  test('no-focus-outline/ fails, naming every link on both pages', async () => {
    const report = await runCheck(fixture('no-focus-outline'), { parts: ['keyboard'] });
    const lines = report.problems.map(renderProblem);
    for (const variant of ['375px', '1440px']) {
      expect(lines).toContain(`keyboard /cv ${variant} no-focus-indicator a[href="mailto:ada@example.com"] "ada@example.com": no visible change when focused`);
      expect(lines).toContain(`keyboard /cv ${variant} no-focus-indicator a[href="https://github.com/ada-example"] "GitHub: ada-example": no visible change when focused`);
      expect(lines).toContain(`keyboard /cv ${variant} no-focus-indicator a[href="https://github.com/ada-example/site"] "How this page was built": no visible change when focused`);
      expect(lines).toContain(`keyboard /missing-page ${variant} no-focus-indicator a[href="/cv"] "Go to the CV": no visible change when focused`);
    }
    expect(report.problems.every((problem) => problem.type === 'no-focus-indicator')).toBe(true);
  });

  test('positive-tabindex/ fails as out-of-order', async () => {
    const report = await runCheck(fixture('positive-tabindex'), { parts: ['keyboard'] });
    expect(report.problems.filter((problem) => problem.variant === '375px').map(renderProblem)).toEqual([
      'keyboard /cv 375px out-of-order a[href="https://github.com/ada-example"]: focus reached it 1st, its reading position is 2nd',
      'keyboard /cv 375px out-of-order a[href="mailto:ada@example.com"]: focus reached it 2nd, its reading position is 1st',
    ]);
  });

  test('covered-link/ fails as covered', async () => {
    const report = await runCheck(fixture('covered-link'), { parts: ['keyboard'] });
    expect(report.problems.length).toBeGreaterThan(0);
    expect(report.problems.map(renderProblem)).toContain('keyboard /cv 1440px covered a[href="mailto:ada@example.com"]: covered by div.banner when focused');
    expect(report.problems.every((problem) => problem.type === 'covered')).toBe(true);
  });

  test('minimal/ passes on both pages at 375 and 1440 px', async () => {
    const report = await runCheck(fixture('minimal'), { parts: ['keyboard'] });
    expect(report.problems).toEqual([]);
    expect(report.results).toHaveLength(4);
  });
});

describe("006-terminal-FR-039: the Terminal's keyboard flow runs at 1440 × 900, checking focus and its indicator at each step", () => {
  test('on the real build the flow passes', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['keyboard'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.filter((result) => result.page === '/').map(({ variant, status }) => `${variant} ${status}`)).toContain('desktop/terminal-keyboard/1440px pass');
  });

  test('a copy whose command line catches Tab fails with trapped input.command-line', async () => {
    const root = seededCopy((copy) => replaceIn(copy, COMMAND_LINE_FILE, '  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {\n', "  const keyDown = (event: KeyboardEvent<HTMLInputElement>) => {\n    if (event.key === 'Tab' && !event.shiftKey) return void event.preventDefault();\n"));
    const report = await runCheck(root, { parts: ['keyboard'] });
    expect(report.problems.filter((problem) => problem.variant === TERMINAL_VARIANT).map(renderProblem)).toEqual([`keyboard / ${TERMINAL_VARIANT} trapped input.command-line: Tab didn't move focus out of the command line`]);
  });

  test('a copy whose exit sends focus to body fails with focus-target, naming the step', async () => {
    const root = seededCopy((copy) => replaceIn(copy, TERMINAL_FILE, '  else os.exit();', '  else {\n    os.exit();\n    setInterval(() => (document.activeElement as HTMLElement | null)?.blur(), 20);\n  }'));
    const report = await runCheck(root, { parts: ['keyboard'] });
    expect(report.problems.filter((problem) => problem.variant === TERMINAL_VARIANT).map(renderProblem)).toEqual([expect.stringMatching(new RegExp(`^keyboard / ${TERMINAL_VARIANT} focus-target step \\d+ "exit": focus went to body, expected the Terminal dock item$`))]);
  });
});
