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
  test('on the real build the flow passes, with the cursor, the Linux keys, select all and Ctrl+C after exit', async () => {
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
    const root = seededCopy((copy) => replaceIn(copy, TERMINAL_FILE, 'exit: () => os.exit() });', 'exit: () => {\n      os.exit();\n      setInterval(() => (document.activeElement as HTMLElement | null)?.blur(), 20);\n    } });'));
    const report = await runCheck(root, { parts: ['keyboard'] });
    expect(report.problems.filter((problem) => problem.variant === TERMINAL_VARIANT).map(renderProblem)).toEqual([expect.stringMatching(new RegExp(`^keyboard / ${TERMINAL_VARIANT} focus-target step \\d+ "exit": focus went to body, expected the Terminal dock item$`))]);
  });
});

// FR-039's added steps (2026-10-29): a copy with one fault fails at the step
// that shows it.
const TERMINAL_STYLES = 'packages/web/src/apps/terminal/terminal.css';

const terminalLines = async (edit: (copy: string) => void) => {
  const report = await runCheck(seededCopy(edit), { parts: ['keyboard'] });
  return report.problems.filter((problem) => problem.variant === TERMINAL_VARIANT).map(renderProblem);
};

const stepLine = (type: string, label: string, detail: string) => new RegExp(`^keyboard / ${TERMINAL_VARIANT} ${type} step \\d+ "${label}": ${detail}$`);

describe("006-terminal-FR-039 and SC-015: the flow's new steps check the cursor, the line's keys, select all and Ctrl+C", () => {
  test('a copy whose focused command line has an outline fails with outline, naming the step', async () => {
    const lines = await terminalLines((copy) => replaceIn(copy, TERMINAL_STYLES, '#os .command-line:focus-visible {\n  outline: none;\n}', '#os .command-line:focus-visible {\n  outline: 2px solid red;\n}'));
    expect(lines.length).toBeGreaterThan(0);
    expect(lines).toContainEqual(expect.stringMatching(stepLine('outline', 'open the Terminal again', 'the focused command line has an outline \\(solid 2px\\)')));
    expect(lines.every((line) => / outline step \d+ "[^"]+": the focused command line has an outline /.test(line))).toBe(true);
  });

  test('a copy whose cursor stays filled after Tab fails with cursor, naming the step', async () => {
    const lines = await terminalLines((copy) =>
      replaceIn(copy, TERMINAL_STYLES, '/* Without focus: hollow, an outline inside the block, steady. */\n.cursor-mirror:not([data-focused]) .cursor-block {', '/* Without focus: hollow, an outline inside the block, steady. */\n.cursor-mirror:not([data-focused]) .cursor-none {'),
    );
    expect(lines).toEqual([expect.stringMatching(stepLine('cursor', 'leave the command line with Tab', 'the cursor stays filled after Tab left the command line'))]);
  });

  test('a copy whose Ctrl+A selects the dock too fails with select-all, naming the step', async () => {
    const lines = await terminalLines((copy) =>
      replaceIn(copy, TERMINAL_FILE, 'if (screen.current !== null) document.getSelection()?.selectAllChildren(screen.current);', "if (screen.current !== null) document.getSelection()?.selectAllChildren(document.getElementById('os') ?? screen.current);"),
    );
    expect(lines).toEqual([expect.stringMatching(stepLine('select-all', 'select all with Ctrl\\+A', 'Ctrl\\+A selected text outside the Terminal, in \\S+'))]);
  });

  test('a copy whose Ctrl+C clears nothing fails with cancel, naming the step', async () => {
    const lines = await terminalLines((copy) =>
      replaceIn(
        copy,
        'packages/web/src/apps/terminal/session.ts',
        "    set({ ...state, entries: [...state.entries, typed], draft: '', stepping: null, announcement: say(siteText.terminal.announce.cancelled) });",
        '    void typed;\n    set({ ...state, announcement: say(siteText.terminal.announce.cancelled) });',
      ),
    );
    expect(lines).toEqual([expect.stringMatching(stepLine('cancel', 'Ctrl\\+C on a typed line', 'Ctrl\\+C added no run of "cat cv\\.json \\| x" ending in \\^C'))]);
  });
});

describe('006-terminal-FR-039 and SC-016: the flow proves Tab, the ways out and the editor', () => {
  const COMMAND_LINE = 'packages/web/src/apps/terminal/CommandLine.tsx';
  const VIM_VIEW = 'packages/web/src/apps/terminal/VimView.tsx';
  const problems = async (root: string) => (await runCheck(root, { parts: ['keyboard'] })).problems.filter((problem) => problem.variant === TERMINAL_VARIANT).map(renderProblem);

  test('a copy where Tab is taken after Escape fails, naming the step', async () => {
    const root = seededCopy((copy) => replaceIn(copy, COMMAND_LINE, 'if (!plain || event.shiftKey || escaped.current) {', 'if (!plain || event.shiftKey) {'));
    expect(await problems(root)).toContainEqual(expect.stringMatching(stepLine('trapped', 'Escape then Tab', 'focus stayed in the command line')));
  });

  test('a copy where Tab on an empty line is taken fails, naming the step', async () => {
    const root = seededCopy((copy) => replaceIn(copy, COMMAND_LINE, "if (typed.trim() === '') return;\n      event.preventDefault();", 'event.preventDefault();'));
    // The flow's first Tab, from an empty line, is the one taken.
    expect(await problems(root)).toContain(`keyboard / ${TERMINAL_VARIANT} trapped input.command-line: Tab didn't move focus out of the command line`);
  });

  test('a copy where Shift+Tab is taken in insert mode fails, naming the step', async () => {
    const root = seededCopy((copy) => replaceIn(copy, VIM_VIEW, 'const insertKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {', "const insertKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {\n    if (event.key === 'Tab' && event.shiftKey) {\n      event.preventDefault();\n      return;\n    }"));
    expect(await problems(root)).toContainEqual(expect.stringMatching(stepLine('trapped', 'Shift\\+Tab in insert mode', 'focus stayed in insert mode')));
  });

  test('a copy where :wq writes nothing fails, naming the step', async () => {
    const root = seededCopy((copy) => replaceIn(copy, 'packages/web/src/apps/terminal/session.ts', 'void write(next.write.path, next.write.text, next.write.force)', "void write(next.write.path, '', next.write.force)"));
    expect(await problems(root)).toContainEqual(expect.stringMatching(stepLine('not-written', 'cat the file', 'cat todo prints .+ after :wq, where it should print "ship it"')));
  });
});

const FOCUS_FILE = 'packages/web/src/os/focus.ts';

const INSPECTOR_VARIANT = 'desktop/inspector-keyboard/1440px';

describe("007-requirement-inspector-FR-032: the inspector's keyboard flow runs at 1440 × 900, checking focus and its indicator at each step", () => {
  test('on the real build the flow passes', async () => {
    const report = await runCheck(realSiteProject(), { parts: ['keyboard'] });
    expect(report.problems.map(renderProblem)).toEqual([]);
    expect(report.results.filter((result) => result.page === '/').map(({ variant, status }) => `${variant} ${status}`)).toContain(`${INSPECTOR_VARIANT} pass`);
  });

  test('a copy whose Back leaves focus on body fails with focus-target, naming each step', async () => {
    const root = seededCopy((copy) => replaceIn(copy, FOCUS_FILE, ": '.show-specs';", ": '.no-such-control';"));
    const report = await runCheck(root, { parts: ['keyboard'] });
    // Every Back is broken, so the flow names each one and goes on.
    const line = (step: number, view: string) => `keyboard / ${INSPECTOR_VARIANT} focus-target step ${step} "Back to ${view}": focus went to body, expected the ${view} window's Show specs`;
    expect(report.problems.filter((problem) => problem.variant === INSPECTOR_VARIANT).map(renderProblem)).toEqual([line(3, 'CV'), line(7, 'CV'), line(11, 'Terminal'), line(14, 'About this site')]);
  });
});
