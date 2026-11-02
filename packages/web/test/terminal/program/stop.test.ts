// A program can't hurt the site, and Ctrl+C ends it (009 FR-024, FR-031 to FR-033,
// SC-002, SC-003), in a real browser, in the engine `PLAYGROUND_ENGINE` selects.
import { describe, expect, test, vi } from 'vitest';
import { drag } from '../../helpers/shell.ts';
import type { Page } from 'playwright';
import { framesHeld, lastOutput, lastRun, openProgramTerminal, running, runToEnd, startLine, statusOf, writeFile } from '../../helpers/program.ts';
import { COMMAND_LINE, linesRun } from '../../helpers/terminal.ts';

vi.setConfig({ testTimeout: 120_000 });

const until = (work: () => Promise<boolean>, timeout = 10_000) => expect.poll(work, { timeout, interval: 25 }).toBe(true);

describe('009-terminal-node-FR-024: while a program spins, the site stays live', () => {
  test('a window moves, an app opens, the Terminal takes typing, and Ctrl+C ends it within a second', async () => {
    const page = await openProgramTerminal();
    await startLine(page, 'node -e "while (true) {}"');
    await until(() => page.evaluate(() => document.querySelector('#terminal-runners iframe') !== null));
    await page.waitForTimeout(500);

    const bar = page.locator('#os .window[data-view="terminal"] .title-bar');
    const before = (await bar.boundingBox())!;
    const from = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
    await drag(page, from, { x: from.x + 60, y: from.y + 40 });
    await expect.poll(async () => Math.round((await bar.boundingBox())!.x - before.x)).toBe(60);

    await page.locator('#os .dock-item[data-app="cv"]').click();
    await page.waitForSelector('#os .window[data-view="cv"]', { state: 'visible' });

    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.type('echo waited');
    expect(await page.locator(COMMAND_LINE).inputValue()).toBe('echo waited');
    await page.locator(COMMAND_LINE).fill('');
    expect(await running(page)).toBe(true);

    const pressed = Date.now();
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(Date.now() - pressed).toBeLessThan(1000);
    expect(await lastRun(page).locator('[data-req~="009-terminal-node-FR-031"]').textContent()).toBe('^C');
    expect(await framesHeld(page)).toBe(0);
    expect(await statusOf(page)).toBe('130');
  });

  test('what it printed before Ctrl+C stays', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'then.js', "console.log('before');\nwhile (true) {}\n");
    await startLine(page, 'node then.js');
    await until(async () => (await lastOutput(page)).includes('before'));
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(await lastOutput(page)).toContain('before');
  });

  test('Ctrl+C with text selected copies, and the program carries on', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'then.js', "console.log('select me');\nsetInterval(() => {}, 1000);\n");
    await startLine(page, 'node then.js');
    await until(async () => (await lastOutput(page)).includes('select me'));
    await page.evaluate(() => {
      const node = document.querySelector('.terminal section.run:last-of-type .run-output')!;
      getSelection()!.selectAllChildren(node);
    });
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(300);
    expect(await running(page)).toBe(true);
    await page.evaluate(() => getSelection()!.removeAllRanges());
    await page.locator(COMMAND_LINE).focus();
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(await statusOf(page)).toBe('130');
  });

  test('a line typed while it runs waits, and Ctrl+C drops it', async () => {
    const page = await openProgramTerminal();
    await startLine(page, 'node -e "setInterval(() => {}, 1000)"');
    await until(() => page.evaluate(() => document.querySelector('#terminal-runners iframe') !== null));
    await startLine(page, 'echo dropped');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(await page.locator('.terminal section.run').last().innerText()).not.toMatch(/^dropped$/m);
  });
});

describe('009-terminal-node-FR-032 and 009-terminal-node-FR-033: with a SIGINT handler', () => {
  test('the first Ctrl+C runs the handler and the second ends it', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'h.js', "process.on('SIGINT', () => console.log('no'));\nconsole.log('ready');\nsetInterval(() => {}, 1000);\n");
    await startLine(page, 'node h.js');
    await until(async () => (await lastOutput(page)).includes('ready'));
    await page.keyboard.press('Control+C');
    await until(async () => (await lastOutput(page)).includes('no'));
    expect(await running(page)).toBe(true);
    const pressed = Date.now();
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(Date.now() - pressed).toBeLessThan(1000);
    expect(await statusOf(page)).toBe('130');
  });

  test('a blocked program with a handler: the second Ctrl+C still ends it', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'b.js', "process.on('SIGINT', () => console.log('never'));\nconsole.log('ready');\nwhile (true) {}\n");
    await startLine(page, 'node b.js');
    await until(async () => (await lastOutput(page)).includes('ready'));
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(200);
    expect(await running(page)).toBe(true);
    const pressed = Date.now();
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(Date.now() - pressed).toBeLessThan(1000);
    expect(await lastOutput(page)).not.toContain('never');
    expect(await statusOf(page)).toBe('130');
  });

  test('a handler that does nothing: the second Ctrl+C still ends it', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'n.js', "process.on('SIGINT', () => {});\nconsole.log('ready');\nsetInterval(() => {}, 1000);\n");
    await startLine(page, 'node n.js');
    await until(async () => (await lastOutput(page)).includes('ready'));
    await page.keyboard.press('Control+C');
    await page.waitForTimeout(200);
    await page.keyboard.press('Control+C');
    await linesRun(page);
    expect(await statusOf(page)).toBe('130');
    expect(await framesHeld(page)).toBe(0);
  });
});

describe('009-terminal-node-FR-026: a program that prints without end', () => {
  test('stops at 1 MB with the stopped line, and the page stays live', async () => {
    const page = await openProgramTerminal();
    await startLine(page, `node -e "while (true) console.log('y')"`);
    // 1 MB of two-character lines is paced (research R7): about 20 s in Firefox, longer on a busy machine.
    await linesRun(page, 90_000);
    expect(await lastRun(page).locator('p.run-stopped').count()).toBe(1);
    expect(await statusOf(page)).toBe('130');
  });
});

// The longest the page goes without a frame while `work` runs (FR-024).
const longestFrame = (page: Page, ms: number) =>
  page.evaluate(
    (time) =>
      new Promise<number>((resolve) => {
        const from = performance.now();
        let last = from;
        let longest = 0;
        const step = () => {
          const at = performance.now();
          longest = Math.max(longest, at - last);
          last = at;
          if (at - from < time) requestAnimationFrame(step);
          else resolve(longest);
        };
        requestAnimationFrame(step);
      }),
    ms,
  );

describe('009-terminal-node-FR-009 and 009-terminal-node-FR-031: nothing it printed waits', () => {
  const FIVE_THOUSAND = 'for (let i = 0; i < 5000; i++) console.log(i);\n';

  test('a loop that prints then waits on a timer shows it all within the quarter second of its end', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'p.js', `${FIVE_THOUSAND}setTimeout(() => {}, 4000);\n`);
    await startLine(page, 'node p.js');
    await until(async () => (await lastOutput(page)).includes('4999'), 3000);
    expect(await running(page)).toBe(true);
    await page.keyboard.press('Control+C');
    await linesRun(page);
  });

  test('a loop that prints then blocks shows it all, and keeps it after Ctrl+C', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'p.js', `${FIVE_THOUSAND}while (true) {}\n`);
    await startLine(page, 'node p.js');
    await until(async () => (await lastOutput(page)).includes('4999'), 3000);
    await page.keyboard.press('Control+C');
    await linesRun(page);
    const lines = (await lastOutput(page)).split('\n');
    expect(lines).toContain('0');
    expect(lines).toContain('4999');
    expect(await statusOf(page)).toBe('130');
  });
});

describe('009-terminal-node-FR-024 and 009-terminal-node-FR-010: a flood of what is not output', () => {
  // Far over a blocked loop's frames only for a stall, and well under the seconds
  // these took with no limit.
  const LONGEST_FRAME_MS = 400;
  const TOGGLE = "const f = () => {};\nfor (;;) { process.on('SIGINT', f); process.off('SIGINT', f); }\n";

  test('adding and removing a SIGINT handler in a loop leaves the page live', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'h.js', TOGGLE);
    await startLine(page, 'node h.js');
    await until(() => page.evaluate(() => document.querySelector('#terminal-runners iframe') !== null));
    expect(await longestFrame(page, 2000)).toBeLessThan(LONGEST_FRAME_MS);
    await page.keyboard.press('Control+C');
    await page.keyboard.press('Control+C');
    await linesRun(page);
  });

  test('making and removing a folder in a loop leaves the page live', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'd.js', "const fs = require('fs');\nfor (;;) { fs.mkdirSync('d'); fs.rmdirSync('d'); }\n");
    await startLine(page, 'node d.js');
    await until(() => page.evaluate(() => document.querySelector('#terminal-runners iframe') !== null));
    expect(await longestFrame(page, 2000)).toBeLessThan(LONGEST_FRAME_MS);
    await page.keyboard.press('Control+C');
    await linesRun(page);
  });

  test('its output and its exit still arrive, in their order', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'e.js', "const f = () => {};\nconst from = Date.now();\nwhile (Date.now() - from < 6000) { process.on('SIGINT', f); process.off('SIGINT', f); }\nconsole.log('done');\nprocess.exit(3);\n");
    const output = await runToEnd(page, 'node e.js');
    expect(output).toContain('done');
    expect(await statusOf(page)).toBe('3');
  });
});

describe('009-terminal-node-FR-034: closing the Terminal ends a program', () => {
  test('no frame stays, and it opens empty', async () => {
    const page = await openProgramTerminal();
    await startLine(page, 'node -e "while (true) {}"');
    await until(() => page.evaluate(() => document.querySelector('#terminal-runners iframe') !== null));
    await page.locator('#os .window[data-view="terminal"] .control-close').click();
    await until(async () => (await framesHeld(page)) === 0);
    await page.locator('#os .dock-item[data-app="terminal"]').click();
    await page.waitForSelector(COMMAND_LINE, { state: 'visible' });
    expect(await page.locator('.terminal section.run').count()).toBe(0);
  });
});
