// Stacks in a real browser (009 research R5), in the engine `PLAYGROUND_ENGINE`
// selects. Chromium and Firefox place a frame exactly. WebKit's stack lines carry
// no places at all; it gives only the error's own `line` and `column`, so its top
// place comes from those, and the file is the entry when it can't tell. A case
// states that limit, so a later WebKit change is noticed.
import { describe, expect, test, vi } from 'vitest';
import { engine } from '../../helpers/playground.ts';
import { openProgramTerminal, runToEnd, statusOf, writeFile } from '../../helpers/program.ts';

vi.setConfig({ testTimeout: 120_000 });

const VERSION = 'node v26.0.0 (browser runtime, not Node.js)';
const A = "function foo() {\n  throw new Error('x');\n}\nfoo();\n";
const placed = engine() !== 'webkit';

describe('009-terminal-node-FR-017: a thrown error shows its place in this engine', () => {
  test('one file: the file, line, code and marker are right, and the status is 1', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'a.js', A);
    const output = await runToEnd(page, 'node a.js');
    expect(output).toContain("/home/guest/a.js:2\n  throw new Error('x');\n  ^\n\nError: x");
    expect(output).toContain(VERSION);
    expect(output).not.toMatch(/blob:|assets\//);
    if (placed) expect(output).toContain('at foo (/home/guest/a.js:2:9)');
    else {
      // WebKit's limit: no places in the stack lines, so none are printed.
      expect(output).not.toMatch(/^\s+at /m);
    }
    expect(await statusOf(page)).toBe('1');
  });

  test("a program reading an error's stack sees none of the runtime", async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'read.js', "function f() { return new Error('x').stack; }\nconsole.log(f());\n");
    const output = await runToEnd(page, 'node read.js');
    if (placed) {
      expect(output).toContain('Error: x');
      expect(output).not.toMatch(/blob:/);
      expect(output).toContain('/home/guest/read.js:1:');
    } else {
      // WebKit's limit: a plain property, so nothing can hide its frames.
      expect(output).toMatch(/^f@\n/);
    }
  });

  test('printed with console.log, an error shows none of the runtime', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'log.js', "function f() { return new Error('x'); }\nconsole.log(f());\n");
    const output = await runToEnd(page, 'node log.js');
    expect(output).toContain('Error: x');
    expect(output).not.toMatch(/blob:/);
  });

  test('a second file: Chromium and Firefox name it; WebKit names the file being loaded, or else the entry', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'b.js', "exports.boom = () => {\n\n  throw new Error('deep');\n};\n");
    await writeFile(page, 'c.js', "const { boom } = require('./b.js');\n\nboom();\n");
    const output = await runToEnd(page, 'node c.js');
    expect(output).toContain('Error: deep');
    if (placed) {
      expect(output).toContain('/home/guest/b.js:3');
      expect(output).toContain('/home/guest/c.js:3');
    } else expect(output).toContain('/home/guest/c.js:3');
  });
});

describe('009-terminal-node-FR-018: a syntax error shows its place in this engine', () => {
  test('from the parser, in every engine, with nothing run', async () => {
    const page = await openProgramTerminal();
    await writeFile(page, 'syn.js', "console.log('ran');\nlet x = ;\n");
    const output = await runToEnd(page, 'node syn.js');
    expect(output).toMatch(/^\/home\/guest\/syn\.js:2\nlet x = ;\n {8}\^\n\nSyntaxError: /);
    expect(output).not.toContain('ran');
    expect(output).toContain(VERSION);
    expect(await statusOf(page)).toBe('1');
  });
});
