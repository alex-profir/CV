// A program that uses too much memory (009 FR-028, research R9), in the engine
// `PLAYGROUND_ENGINE` selects, as 008's memory test. Browsers give pages no memory
// cap, so each engine does what it does: the message and status 1 where it reports
// the worker's end, or the browser ends the page itself (spec's Assumptions).
import { describe, expect, test, vi } from 'vitest';
import { siteText } from '../../../src/site-text.ts';
import { lastOutput, openProgramTerminal, startLine, statusOf, writeFile } from '../../helpers/program.ts';
import { linesRun } from '../../helpers/terminal.ts';

vi.setConfig({ testTimeout: 240_000 });

const words = siteText.terminal.program;
const CAP_MB = 6144;
const GROW = `const kept = [];\nfor (let mb = 0; mb < ${CAP_MB}; mb += 8) {\n  const chunk = new Array(1 << 20);\n  for (let i = 0; i < chunk.length; i += 1) chunk[i] = i + 0.5;\n  kept.push(chunk);\n}\nconsole.log('reached the cap', kept.length);\n`;

describe('009-terminal-node-FR-028: a program out of memory ends with a message, unless the browser ends the page', () => {
  test('code that grows until it fails', async () => {
    const page = await openProgramTerminal();
    let crashed = false;
    page.on('crash', () => (crashed = true));
    await writeFile(page, 'grow.js', GROW);
    await startLine(page, 'node grow.js');
    const started = Date.now();
    while (Date.now() - started < 180_000 && !crashed) {
      const done = await page.evaluate(() => document.querySelector('.terminal section.run[aria-busy="true"]') === null).catch(() => false);
      if (done) break;
      await page.waitForTimeout(500).catch(() => undefined);
    }
    if (crashed) return;
    await linesRun(page);
    const output = await lastOutput(page);
    if (output.includes('reached the cap')) return;
    // The engine's own error, caught as any uncaught error, or the browser's end.
    if (!/RangeError|out of memory/i.test(output)) expect(output).toSatisfy((text: string) => text.includes(words.memory) || text.includes(words.died));
    expect(await statusOf(page)).toBe('1');
  });
});
