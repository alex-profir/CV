// Errors in Node's form (009 contracts/commands.md Formats, research R5): the
// visitor's file, line and code, a marker, the name, message and stack, then the
// version line, with a status that says it failed.
import { describe, expect, test } from 'vitest';
import { comparable, evaluate, HOME, runProgram, script, underNode } from './helpers/harness.ts';

const VERSION = 'node v26.0.0 (browser runtime, not Node.js)';
const end = (status: number) => (run: { messages: Record<string, unknown>[] }) => expect(run.messages.at(-1)).toEqual({ exit: status, uncaught: true });

// Text from the real Node, with its temporary folder as the home folder.
const fromNode = (text: string) => text.replace(/\S*\/cv-parity-[^/\s]+/g, HOME).replace(/\S*\/private\/\S*cv-parity-[^/\s]+/g, HOME);

describe('009-terminal-node-FR-017: a thrown error prints as Node prints it', () => {
  const BAD = "console.log('before');\nfunction foo() {\n  throw new Error('x');\n}\nfoo();\nconsole.log('after');\n";

  test('the file and line, the code, ^ under the place, name, message, stack and the version line, with status 1', async () => {
    const run = await runProgram(script(BAD, 'bad.js'));
    expect(run.exit).toBe(1);
    end(1)(run);
    expect(run.stdout).toBe('before\n');
    expect(run.stderr).toBe(`${HOME}/bad.js:3\n  throw new Error('x');\n  ^\n\nError: x\n    at foo (${HOME}/bad.js:3:9)\n    at Object.<anonymous> (${HOME}/bad.js:5:1)\n\n${VERSION}\n`);
  });

  test('its form matches the real Node, leaving out stack lines and the version line', async () => {
    const here = await runProgram(script(BAD, 'bad.js'));
    const there = underNode({ 'bad.js': BAD }, ['bad.js']);
    expect(comparable(here.stderr).trimEnd()).toBe(comparable(fromNode(there.stderr)).trimEnd());
    expect(here.exit).toBe(there.status);
  });

  test('an error with extra properties shows them, as Node does', async () => {
    const source = "const e = new TypeError('bad'); e.code = 'E_X'; throw e;\n";
    const run = await runProgram(script(source));
    expect(run.stderr).toContain("TypeError: bad\n");
    expect(run.stderr).toContain("code: 'E_X'");
  });

  test('a thrown value that is no error is shown as Node shows it', async () => {
    const source = "throw 'text';\n";
    const here = await runProgram(script(source));
    const there = underNode({ 'main.js': source }, ['main.js']);
    expect(here.stderr).toBe(`text\n\n${VERSION}\n`);
    expect(there.stderr).toContain('\ntext\n');
    expect(here.exit).toBe(there.status);
  });

  test('an error thrown in a timer ends the program the same way', async () => {
    const run = await runProgram(script("setTimeout(() => {\n  throw new RangeError('late');\n}, 1);\nsetInterval(() => {}, 1000);\n"));
    expect(run.exit).toBe(1);
    expect(run.stderr).toContain(`${HOME}/main.js:2\n  throw new RangeError('late');\n  ^\n\nRangeError: late\n`);
  });

  test('runtime frames never show', async () => {
    for (const source of ["throw new Error('a')", "setTimeout(() => { throw new Error('b'); }, 0)", "Promise.reject(new Error('c'))", "require('fs').readFileSync('nope')", "process.nextTick(() => { throw new Error('d'); })"]) {
      const run = await runProgram(script(source));
      expect(run.stderr).not.toMatch(/runtime\.js|node:shim|loop\.ts|main\.ts|evalmachine/);
      for (const line of run.stderr.split('\n').filter((each) => /^\s+at /.test(each))) expect(line).toContain(`${HOME}/main.js`);
    }
  });

  test('a stack read by the program itself holds no runtime frames', async () => {
    const run = await runProgram(script("function f() { return new Error('x').stack; }\nconsole.log(f());\n"));
    expect(run.stdout).toBe(`Error: x\n    at f (${HOME}/main.js:1:23)\n    at Object.<anonymous> (${HOME}/main.js:2:13)\n`);
  });
});

describe('009-terminal-node-FR-018: a syntax error prints the same form, with none of the program run', () => {
  test('at the right line, with the code and a marker', async () => {
    const run = await runProgram(script("console.log('ran');\nlet x = ;\n", 'syn.js'));
    expect(run.exit).toBe(1);
    expect(run.stdout).toBe('');
    expect(run.stderr).toMatch(new RegExp(`^${HOME}/syn.js:2\\nlet x = ;\\n {8}\\^\\n\\nSyntaxError: `));
    expect(run.stderr).toContain(VERSION);
  });

  test('in a file it requires: none of that file runs, and the place is that file', async () => {
    const run = await runProgram(script("console.log('a');\ntry { require('./b.js'); } catch (e) { console.log(e.name); }\nrequire('./b.js');\n", 'main.js', [], { 'b.js': "console.log('b');\n\nlet = = 1;\n" }));
    expect(run.stdout).toBe('a\nSyntaxError\n');
    expect(run.stderr).toContain(`${HOME}/b.js:3\n`);
    expect(run.exit).toBe(1);
  });

  test('in `-e`', async () => {
    const run = await runProgram(evaluate('let = = 1'));
    expect(run.exit).toBe(1);
    expect(run.stderr).toContain('SyntaxError');
    expect(run.stderr).toContain('[eval]');
  });

  test('a script that is not JavaScript gets the parser\'s error', async () => {
    const run = await runProgram(script('# A title\n\nSome words here.\n', 'notes.txt'));
    expect(run.exit).toBe(1);
    expect(run.stderr).toContain(`${HOME}/notes.txt:1\n# A title\n`);
    expect(run.stderr).toContain('SyntaxError');
  });
});

describe('009-terminal-node-FR-019: what nothing caught', () => {
  test('an unhandled rejection ends the program, with status 1', async () => {
    const here = await runProgram(script("Promise.reject(new Error('no'));\nsetInterval(() => {}, 1000);\n"));
    expect(here.exit).toBe(1);
    expect(here.stderr).toContain('Error: no');
    end(1)(here);
  });

  test('a rejection with no error says what Node says', async () => {
    const source = "Promise.reject(5);\n";
    const here = await runProgram(script(source));
    const there = underNode({ 'main.js': source }, ['main.js']);
    expect(here.exit).toBe(there.status);
    expect(here.stderr).toContain('The promise rejected with the reason "5"');
    expect(there.stderr).toContain('The promise rejected with the reason "5"');
  });

  test('an `unhandledRejection` handler keeps it alive', async () => {
    const run = await runProgram(script("process.on('unhandledRejection', (e) => console.log('caught', e.message));\nPromise.reject(new Error('no'));\nsetTimeout(() => console.log('alive'), 5);\n"));
    expect(run.stdout).toBe('caught no\nalive\n');
    expect(run.exit).toBe(0);
  });

  test('an `uncaughtException` handler keeps it alive', async () => {
    const source = "process.on('uncaughtException', (e, origin) => console.log('caught', e.message, origin));\nsetTimeout(() => console.log('alive'), 5);\nthrow new Error('no');\n";
    const here = await runProgram(script(source));
    const there = underNode({ 'main.js': source }, ['main.js']);
    expect(here.stdout).toBe(there.stdout);
    expect(here.exit).toBe(there.status);
  });

  test('a handler that throws ends it', async () => {
    const run = await runProgram(script("process.on('uncaughtException', () => { throw new Error('again'); });\nthrow new Error('no');\n"));
    expect(run.stderr).toContain('Error: again');
    expect(run.exit).not.toBe(0);
  });

  test('`exit` handlers run after an uncaught error, with the code', async () => {
    const source = "process.on('exit', (code) => console.log('exit', code));\nthrow new Error('no');\n";
    const here = await runProgram(script(source));
    const there = underNode({ 'main.js': source }, ['main.js']);
    expect(here.stdout).toBe(there.stdout);
    expect(here.exit).toBe(there.status);
  });
});

describe('009-terminal-node-FR-020: what cannot be found', () => {
  test('`node missing.js` gives `Cannot find module`, status 1', async () => {
    const run = await runProgram(script('', 'there.js'), {});
    expect(run.exit).toBe(0);
    const gone = await runProgram({ ...script('', 'there.js'), script: `${HOME}/missing.js` });
    expect(gone.exit).toBe(1);
    expect(gone.stderr).toContain(`Error: Cannot find module '${HOME}/missing.js'`);
    expect(gone.stderr).toContain("code: 'MODULE_NOT_FOUND'");
  });

  test('a missing relative module, with Node\'s `code` and `requireStack`', async () => {
    const run = await runProgram(script("try { require('./nope'); } catch (e) { console.log(e.code, e.requireStack, e.message.split('\\n')[0]); }\nrequire('./nope');\n"));
    expect(run.stdout).toBe(`MODULE_NOT_FOUND [ '${HOME}/main.js' ] Cannot find module './nope'\n`);
    expect(run.stderr).toContain("Error: Cannot find module './nope'");
    expect(run.stderr).toContain('Require stack:');
    expect(run.exit).toBe(1);
  });

  test.each(['http', 'child_process', 'crypto', 'node:http', 'net', 'worker_threads'])('%s also says it is not available here', async (name) => {
    const run = await runProgram(script(`require('${name}');\n`));
    expect(run.exit).toBe(1);
    expect(run.stderr).toContain(`Cannot find module '${name}'`);
    expect(run.stderr).toContain(`The module ${name.replace(/^node:/, '')} isn't available in this Terminal.`);
  });

  test('`import` of one not offered says the same', async () => {
    const run = await runProgram(script("import 'http';\n", 'main.mjs'));
    expect(run.exit).toBe(1);
    expect(run.stderr).toContain("The module http isn't available in this Terminal.");
  });

  test('`lodash` gets the plain form, with no such words', async () => {
    const run = await runProgram(script("require('lodash');\n"));
    expect(run.stderr).toContain("Cannot find module 'lodash'");
    expect(run.stderr).not.toContain("isn't available");
    expect(run.exit).toBe(1);
  });
});

describe('009-terminal-node-FR-017 and 009-terminal-node-FR-020: a file with a space in its path', () => {
  const BAD = "console.log('before');\nthrow new Error('sp');\n";

  test.each([['my file.js'], ["it's %20 here.js"]])('%s shows the same form as any other', async (name) => {
    const run = await runProgram(script(BAD, name));
    expect(run.stderr).toBe(`${HOME}/${name}:2\nthrow new Error('sp');\n^\n\nError: sp\n    at Object.<anonymous> (${HOME}/${name}:2:7)\n\n${VERSION}\n`);
    expect(run.exit).toBe(1);
  });

  test('as an imported module too', async () => {
    const run = await runProgram(script("throw new Error('sp');\n", 'my file.mjs'));
    expect(run.stderr).toContain(`${HOME}/my file.mjs:1\nthrow new Error('sp');\n^\n\nError: sp`);
  });
});

describe('009-terminal-node-FR-020: the runtime\'s names stay out of stack lines', () => {
  test("a SIGINT handler's frame is process's, as Node has it", async () => {
    const run = await runProgram(evaluate("process.on('SIGINT', () => { throw new Error('x'); }); console.log('ready'); setInterval(() => {}, 1000);"), { signals: [{ afterOutput: 'ready' }] });
    expect(run.stderr).toMatch(/\n {4}at process\.<anonymous> \(\[eval\]:1:\d+\)/);
    expect(run.exit).toBe(1);
  });

  test('a named handler, and an emitter of the program', async () => {
    const run = await runProgram(script("const E = require('events');\nconst e = new E();\ne.on('x', () => { console.log(new Error('y').stack.split('\\n')[1].replace(/\\(.*/, '')); });\ne.emit('x');\nprocess.on('z', function named() { console.log(new Error('y').stack.split('\\n')[1].replace(/\\(.*/, '')); });\nprocess.emit('z');\n"));
    expect(run.stdout).toBe('    at EventEmitter.<anonymous> \n    at process.named \n');
  });
});
