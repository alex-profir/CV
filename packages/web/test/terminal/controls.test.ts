// Command controls (FR-015): every command name the Terminal offers is a
// button named by its full line, and runs that line as if typed, by click,
// Enter or Space, with focus back in the command line.
import { describe, expect, test, vi } from 'vitest';
import type { Locator, Page } from 'playwright';
import { settle } from '../helpers/shell.ts';
import {
  COMMAND_LINE,
  commandLineFocused,
  groupText,
  historyRows,
  openTerminal,
  openTerminalPage,
  quitVim,
  runCount,
  runGroup,
  runSelector,
  typedLines,
  vimView,
} from '../helpers/terminal.ts';

vi.setConfig({ testTimeout: 300_000 });

const CONTROLS = 'button.command-chip, button.command-inline';

const HELP_LINES = [
  'help', '?', 'about', 'whoami', 'work', 'experience', 'projects', 'education', 'skills', 'languages', 'interests', 'contact',
  'cv', 'site', 'specs', 'ls', 'cd', 'cat', 'jq', 'vim', 'pwd', 'open', 'history', 'clear', 'exit',
];

type How = 'click' | 'Enter' | 'Space';
const WAYS: readonly How[] = ['click', 'Enter', 'Space'];

// Each control in `scope`: its element, its name and its text.
const controlsIn = (scope: Locator) =>
  scope.locator(CONTROLS).evaluateAll((list) => list.map((control) => ({ tag: control.tagName.toLowerCase(), type: control.getAttribute('type'), name: control.getAttribute('aria-label') })));

async function activate(control: Locator, how: How): Promise<void> {
  if (how === 'click') {
    await control.click();
    return;
  }
  await control.focus();
  await control.press(how === 'Enter' ? 'Enter' : ' ');
}

// Activates a control that adds a run, and checks the run reads its line,
// as typed, with focus back in the command line.
async function expectRuns(page: Page, control: Locator, how: How, ran: string[]): Promise<void> {
  const line = (await control.getAttribute('aria-label'))!;
  const before = await runCount(page);
  await activate(control, how);
  if (line === 'cv') {
    await vimView(page).waitFor();
    await quitVim(page);
  }
  await expect.poll(() => runCount(page), { message: `${line} by ${how}` }).toBe(before + 1);
  expect((await typedLines(page)).at(-1), `${line} by ${how}`).toBe(line);
  await expect.poll(() => commandLineFocused(page), { message: `${line} by ${how}` }).toBe(true);
  expect(await page.locator(COMMAND_LINE).inputValue()).toBe('');
  ran.push(line);
}

describe('006-terminal-FR-015: every command control is a button named by its full line', () => {
  test('in the starter chips, help, the unknown reply and open’s reply', async () => {
    const page = await openTerminalPage('desktop');
    const starter = await controlsIn(page.locator('.terminal .starter'));
    expect(starter.map((control) => control.name)).toEqual(['help', 'about', 'work', 'projects', 'cv']);
    const help = await controlsIn((await runGroup(page, 'help')).locator('.run-output'));
    expect(help.map((control) => control.name)).toEqual(HELP_LINES);
    const unknown = await controlsIn((await runGroup(page, 'wrok')).locator('.run-output'));
    expect(unknown.map((control) => control.name)).toEqual(['help', 'work']);
    const open = await controlsIn((await runGroup(page, 'open settings')).locator('.run-output'));
    expect(open.map((control) => control.name)).toEqual(['open cv', 'open about']);
    for (const control of [...starter, ...help, ...unknown, ...open]) {
      expect(control.tag, control.name ?? '').toBe('button');
      expect(control.type, control.name ?? '').toBe('button');
    }
  });
});

describe('006-terminal-FR-015: a control runs its line as typed, by click, Enter and Space', () => {
  test('the starter chips', async () => {
    const page = await openTerminalPage('desktop');
    const ran: string[] = [];
    const count = await page.locator(`.terminal .starter ${CONTROLS}`).count();
    for (let index = 0; index < count; index += 1) {
      for (const how of WAYS) await expectRuns(page, page.locator(`.terminal .starter ${CONTROLS}`).nth(index), how, ran);
    }
    expect(ran).toHaveLength(15);
    expect((await historyRows(page)).map((row) => row.line)).toEqual([...ran, 'history']);
  });

  test('help’s controls, clear and exit among them', async () => {
    const page = await openTerminalPage('desktop');
    const ran: string[] = ['help'];
    await runGroup(page, 'help');
    const control = (line: string) => page.locator(`${runSelector(1)} .run-output`).locator(`${CONTROLS.split(', ').map((kind) => `${kind}[aria-label="${line}"]`).join(', ')}`);
    for (const line of HELP_LINES.filter((name) => name !== 'clear' && name !== 'exit')) {
      for (const how of WAYS) await expectRuns(page, control(line), how, ran);
    }
    expect((await historyRows(page)).map((row) => row.line)).toEqual([...ran, 'history']);

    for (const how of WAYS) {
      // `history` first: the run `help` adds is then the last one.
      const before = (await historyRows(page)).length;
      const help = await runGroup(page, 'help');
      await activate(help.locator('.run-output button[aria-label="clear"]'), how);
      await expect.poll(() => runCount(page), { message: `clear by ${how}` }).toBe(0);
      await expect.poll(() => commandLineFocused(page)).toBe(true);
      const rows = await historyRows(page);
      expect(rows.at(-2)?.line, `clear by ${how}`).toBe('clear');
      expect(rows).toHaveLength(before + 3);
    }

    for (const how of WAYS) {
      const help = await runGroup(page, 'help');
      await activate(help.locator('.run-output button[aria-label="exit"]'), how);
      await expect.poll(() => page.locator('#os .window[data-view="terminal"]').count(), { message: `exit by ${how}` }).toBe(0);
      await settle(page);
      await openTerminal(page, 'desktop');
    }
  });

  test('the unknown reply’s and open’s reply’s controls', async () => {
    const page = await openTerminalPage('desktop');
    const ran: string[] = [];
    for (const how of WAYS) {
      const reply = await runGroup(page, 'wrok');
      ran.push('wrok');
      await expectRuns(page, reply.locator('.run-output button[aria-label="help"]'), how, ran);
      const again = page.locator(`${runSelector((await runCount(page)) - 1)} .run-output`);
      await expectRuns(page, again.locator('button[aria-label="work"]'), how, ran);
    }
    for (const how of WAYS) {
      for (const [line, view] of [
        ['open cv', 'cv'],
        ['open about', 'about'],
      ] as const) {
        const reply = await runGroup(page, 'open settings');
        ran.push('open settings');
        const before = await runCount(page);
        await activate(reply.locator(`.run-output button[aria-label="${line}"]`), how);
        await expect.poll(() => runCount(page), { message: `${line} by ${how}` }).toBe(before + 1);
        expect((await typedLines(page)).at(-1)).toBe(line);
        ran.push(line);
        // The opened window takes focus, as the dock gives it (contracts/terminal.md Focus).
        await expect.poll(() => page.locator(`#os .window[data-view="${view}"]`).getAttribute('aria-current')).toBe('true');
        await page.locator('#os .dock-item[data-app="terminal"]').click();
        await expect.poll(() => commandLineFocused(page)).toBe(true);
      }
    }
    expect((await historyRows(page)).map((row) => row.line)).toEqual([...ran, 'history']);
  });
});

describe('006-terminal-FR-015: every CV section is within 2 clicks of the starter chips (SC-001)', () => {
  test('a starter chip, or help then the section’s control', async () => {
    const page = await openTerminalPage('desktop');
    for (const section of ['about', 'work', 'projects', 'education', 'skills', 'languages', 'interests', 'contact']) {
      let clicks = 0;
      const chip = page.locator(`.terminal .starter button.command-chip[aria-label="${section}"]`);
      if ((await chip.count()) === 1) {
        await chip.click();
        clicks += 1;
      } else {
        const before = await runCount(page);
        await page.locator('.terminal .starter button.command-chip[aria-label="help"]').click();
        clicks += 1;
        await expect.poll(() => runCount(page)).toBe(before + 1);
        await page.locator('.terminal section.run').last().locator(`.run-output button[aria-label="${section}"]`).click();
        clicks += 1;
      }
      await expect.poll(async () => (await typedLines(page)).at(-1)).toBe(section);
      const group = page.locator('.terminal section.run').last();
      expect((await groupText(page, group)).length, section).toBeGreaterThan(0);
      expect(clicks, section).toBeLessThanOrEqual(2);
    }
  });
});

describe('006-terminal-FR-015: on a phone, a tapped control leaves the keyboard closed', () => {
  test('a tapped chip or key leaves the command line focused with inputmode none, and a tap on the command line removes it', async () => {
    const page = await openTerminalPage('mobile');
    const inputMode = () => page.locator(COMMAND_LINE).getAttribute('inputmode');
    for (const control of [
      page.locator('.terminal .starter button.command-chip[aria-label="about"]'),
      page.locator('#os .pocket-keys button.pocket-key[aria-label="work"]'),
    ]) {
      const before = await runCount(page);
      await control.tap();
      await expect.poll(() => runCount(page)).toBe(before + 1);
      await expect.poll(() => commandLineFocused(page)).toBe(true);
      expect(await inputMode()).toBe('none');
      await page.locator(COMMAND_LINE).tap();
      await expect.poll(inputMode).toBeNull();
      expect(await commandLineFocused(page)).toBe(true);
    }
  });

  test('exit on a phone shows the home screen with focus on the Terminal’s icon (US4 scenario 6)', async () => {
    const page = await openTerminalPage('mobile');
    await runGroup(page, 'about');
    await page.locator(COMMAND_LINE).fill('exit');
    await page.keyboard.press('Enter');
    await expect.poll(() => page.locator('#os .full-screen').count()).toBe(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.matches('#os .home .app-icon[data-view="terminal"]') ?? false)).toBe(true);
  });
});
