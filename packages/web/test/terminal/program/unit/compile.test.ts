// The compile mode (009 research R12), with the TypeScript the engine's worker
// bundles: Monaco's 5.9, the same one `ts.worker` gives `compile.ts`. It is given by
// injection, so what is tested is what runs there.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { libFileMap } from 'monaco-editor/languages/features/typescript/lib/lib';
import { typescript as ts } from 'monaco-editor/languages/features/typescript/lib/typescriptServices';
import { compile, NODE_TYPES } from '../../../../src/apps/playground/engine/compile.ts';
import { typeErrorText } from '../../../../src/apps/terminal/program/typescript.ts';
import { HOME, runProgram, script } from './helpers/harness.ts';

const nodeTypes = fs.readFileSync(path.resolve(import.meta.dirname, '../../../../src/apps/terminal/program/runtime/node.d.ts'), 'utf8');

const files = (given: Record<string, string>) => ({ [NODE_TYPES]: nodeTypes, ...Object.fromEntries(Object.entries(given).map(([name, text]) => [`${HOME}/${name}`, text])) });
const check = (source: string, name = 'app.ts', more: Record<string, string> = {}) => compile(ts, libFileMap, { root: `${HOME}/${name}`, mode: 'check', files: files({ [name]: source, ...more }) });
const clean = (source: string) => expect(check(source).diagnostics).toEqual([]);

describe('009-terminal-node-FR-002: ts-node checks a TypeScript or a JavaScript file', () => {
  test('the TypeScript in Monaco is 5.9.3, the Playground\'s', () => {
    expect(ts.version).toBe('5.9.3');
  });

  test('`check` gives diagnostics, with the file, line, column, code and message', () => {
    const { diagnostics } = check("const n: number = 'text';\n");
    expect(diagnostics).toEqual([{ file: `${HOME}/app.ts`, line: 1, column: 7, code: 2322, message: "Type 'string' is not assignable to type 'number'." }]);
  });

  test('for a JavaScript root too', () => {
    const { diagnostics } = check("/** @type {number} */\nconst n = 'text';\n", 'app.js');
    expect(diagnostics.map(({ code, line }) => [code, line])).toEqual([[2322, 2]]);
  });

  test('`strip` gives no diagnostics, and JavaScript and a map for every TypeScript file', () => {
    const { diagnostics, outputs } = compile(ts, libFileMap, { root: `${HOME}/app.ts`, mode: 'strip', files: files({ 'app.ts': "const n: number = 'text';\nconsole.log(n);\n", 'b.ts': 'export const b: string = "b";\n', 'c.js': 'console.log(1);\n' }) });
    expect(diagnostics).toEqual([]);
    expect(Object.keys(outputs).sort()).toEqual([`${HOME}/app.ts`, `${HOME}/b.ts`]);
    expect(outputs[`${HOME}/app.ts`]!.js).toContain("const n = 'text';");
    expect(JSON.parse(outputs[`${HOME}/app.ts`]!.map).version).toBe(3);
  });

  test('a program of two files is checked across them, in the three ways of naming one', () => {
    expect(check("import { b } from './b';\nimport { b as c } from './b.ts';\nimport { b as d } from './b.js';\nconst n: string = b + c + d;\nconsole.log(n);\n", 'app.ts', { 'b.ts': 'export const b: string = "b";\n' }).diagnostics).toEqual([]);
    expect(check("import { b } from './b';\nconst n: number = b;\n", 'app.ts', { 'b.ts': 'export const b: string = "b";\n' }).diagnostics.map(({ code }) => code)).toEqual([2322]);
  });

  test('a root that isn\'t there has none, so the program says it can\'t be found', () => {
    expect(compile(ts, libFileMap, { root: `${HOME}/gone.ts`, mode: 'check', files: files({}) }).diagnostics).toEqual([]);
  });
});

describe('009-terminal-node-FR-021: a type error', () => {
  test("prints contracts/commands.md's form", () => {
    const result = check("const n: number = 'text';\n");
    expect(typeErrorText(result, HOME)).toBe("TSError: Unable to compile TypeScript:\napp.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.\n");
  });
});

describe('009-terminal-node-FR-038: strict options, and types for what is offered', () => {
  test('strict is on', () => {
    expect(check('function f(a) { return a; }\nf(1);\n').diagnostics.map(({ code }) => code)).toEqual([7006]);
    expect(check('const s: string = null;\nconsole.log(s);\n').diagnostics.map(({ code }) => code)).toEqual([2322]);
  });

  test('every global of 009-terminal-node-FR-012 and every process name of contracts/node-api.md checks clean', () => {
    clean(`
      console.log(1); console.info(1); console.debug(1); console.error(1); console.warn(1); console.trace(1); console.dir({}, { depth: 1 }); console.table([]);
      console.group(); console.groupEnd(); console.time(); console.timeEnd(); console.timeLog(); console.count(); console.countReset(); console.assert(true);
      const p = process;
      const names = [p.argv, p.argv0, p.execPath, p.env, p.cwd(), p.exitCode, p.platform, p.arch, p.version, p.versions, p.release, p.pid, p.title, p.hrtime(), p.hrtime.bigint(), p.uptime(), p.memoryUsage().rss, p.stdout.isTTY, p.stdout.columns, p.stderr.isTTY];
      p.chdir('.'); p.nextTick((a: number) => a + 1, 1); p.stdout.write('x'); p.stderr.write('x'); p.stdin.on('data', () => {}); p.on('exit', (code: number) => code); p.once('SIGINT', () => {}); p.off('x', () => {}); p.emit('x'); p.emitWarning('w');
      const t = setTimeout((a: number) => a, 1, 1); clearTimeout(t); const i = setInterval(() => {}, 1); clearInterval(i); const m = setImmediate(() => {}); clearImmediate(m); queueMicrotask(() => {});
      const b: Buffer = Buffer.from('a'); const u = new URL('http://x.y'); const s = new URLSearchParams(u.search); const e = new TextEncoder().encode('a'); const d = new TextDecoder().decode(e); const c = structuredClone({ a: 1 }); const n = performance.now();
      console.log(names, b, s, d, c, n, require('./x'), module.exports, exports, __filename, __dirname, global === globalThis);
      if (process.argv.length > 100) process.exit(1);
    `);
  });

  const MODULES = [
    ['fs', "import fs from 'fs'; import { readFileSync, promises } from 'node:fs'; const a: string = readFileSync('a', 'utf8'); const b: Buffer = fs.readFileSync('a'); fs.writeFileSync('a', 'b'); fs.appendFileSync('a', 'b'); const c: boolean = fs.existsSync('a'); const d = fs.statSync('a').size + fs.lstatSync('a').size; const e: string[] = fs.readdirSync('.'); fs.mkdirSync('a', { recursive: true }); fs.rmSync('a', { force: true }); fs.rmdirSync('a'); fs.unlinkSync('a'); fs.renameSync('a', 'b'); fs.copyFileSync('a', 'b'); fs.readFile('a', 'utf8', (error, text) => console.log(error, text.length)); fs.writeFile('a', 'b', (error) => console.log(error)); fs.appendFile('a', 'b', () => {}); fs.stat('a', (_, s) => s.isFile()); fs.lstat('a', () => {}); fs.readdir('.', (_, names) => names.length); fs.mkdir('a', () => {}); fs.rm('a', () => {}); fs.rmdir('a', () => {}); fs.unlink('a', () => {}); fs.rename('a', 'b', () => {}); fs.copyFile('a', 'b', () => {}); promises.readFile('a'); console.log(a, b, c, d, e);"],
    ['fs/promises', "import fs from 'fs/promises'; import { readFile } from 'node:fs/promises'; async function f() { const a: string = await readFile('a', 'utf8'); const b = await fs.readFile('a'); await fs.writeFile('a', 'b'); await fs.appendFile('a', 'b'); await fs.stat('a'); await fs.lstat('a'); await fs.readdir('.'); await fs.mkdir('a'); await fs.rm('a'); await fs.rmdir('a'); await fs.unlink('a'); await fs.rename('a', 'b'); await fs.copyFile('a', 'b'); console.log(a, b); } f();"],
    ['path', "import path from 'path'; import * as p from 'node:path'; console.log(path.join('a'), path.resolve('a'), path.relative('a', 'b'), path.dirname('a'), path.basename('a', 'b'), path.extname('a'), path.normalize('a'), path.isAbsolute('a'), path.sep, path.delimiter, path.posix.sep, path.format({ dir: 'a' }), path.parse('a').base, p.join('a'));"],
    ['events', "import { EventEmitter, once } from 'events'; import E from 'node:events'; class C extends EventEmitter {} const e = new C(); e.on('a', () => {}); e.once('a', () => {}); e.off('a', () => {}); e.addListener('a', () => {}); e.removeListener('a', () => {}); e.removeAllListeners('a'); e.prependListener('a', () => {}); e.emit('a', 1); console.log(e.listenerCount('a'), e.listeners('a'), e.eventNames(), e.setMaxListeners(1), new E(), once(e, 'a'));"],
    ['util', "import util, { inspect, format } from 'util'; import { promisify } from 'node:util'; console.log(inspect({}, { depth: 1 }), format('a'), promisify(() => {}), util.callbackify(async () => 1), util.isDeepStrictEqual(1, 1), util.inherits(class {}, class {}), util.deprecate(() => {}, 'x'), util.types.isDate(1), new util.TextEncoder(), new util.TextDecoder());"],
    ['assert', "import assert, { strictEqual } from 'assert'; import s from 'assert/strict'; import n from 'node:assert'; import m from 'node:assert/strict'; assert(true); assert.ok(true); assert.equal(1, 1); assert.notEqual(1, 2); strictEqual(1, 1); assert.notStrictEqual(1, 2); assert.deepEqual(1, 1); assert.deepStrictEqual(1, 1); assert.notDeepStrictEqual(1, 2); assert.throws(() => {}); assert.doesNotThrow(() => {}); assert.rejects(Promise.reject()); assert.match('a', /a/); console.log(new assert.AssertionError({}), s.equal, n.ok, m.ok); if (s.ok.length > 100) assert.fail('x');"],
    ['os', "import os, { EOL } from 'os'; import { platform } from 'node:os'; console.log(EOL, platform(), os.type(), os.arch(), os.homedir(), os.tmpdir(), os.hostname(), os.cpus().length, os.totalmem(), os.freemem(), os.uptime(), os.userInfo().username);"],
    ['timers', "import { setTimeout as later, clearTimeout as off } from 'timers'; import t from 'node:timers'; off(later(() => {}, 1)); console.log(t.setImmediate, t.setInterval, t.clearImmediate, t.clearInterval);"],
    ['timers/promises', "import { setTimeout, setImmediate, setInterval } from 'timers/promises'; import * as t from 'node:timers/promises'; async function f() { await setTimeout(1, 'a'); await setImmediate('a'); for await (const a of setInterval(1, 'a')) console.log(a); console.log(t.setTimeout); } f();"],
    ['buffer', "import { Buffer as B, constants } from 'buffer'; import { Buffer as N } from 'node:buffer'; console.log(B.from('a').toString('hex'), constants.MAX_LENGTH, N.alloc(1).length);"],
    ['url', "import { URL as U, URLSearchParams as S, fileURLToPath, pathToFileURL } from 'url'; import { URL as N } from 'node:url'; console.log(new U('a:b'), new S(), fileURLToPath('file:///a'), pathToFileURL('a').href, new N('a:b'));"],
  ] as const;

  test.each(MODULES)('every name of %s checks clean', (_, source) => clean(`${source}\nexport {};\n`));

  test.each([
    ['a module not offered', "import http from 'http';\nconsole.log(http);\n", 2307],
    ['a page global', 'console.log(document.title);\n', 2584],
    ['fetch', "fetch('x');\n", 2304],
    ['a name of fs not offered', "import fs from 'fs';\nfs.createReadStream('a');\n", 2339],
    ['Worker', "new Worker('x');\n", 2304],
    ['a process name not offered', 'process.kill(1);\n', 2339],
  ])('%s is an error', (_, source, code) => {
    expect(check(source).diagnostics.map((each) => each.code)).toEqual([code]);
  });

  test('its diagnostics never name node.d.ts', () => {
    expect(check('').diagnostics).toEqual([]);
  });
});

describe('009-terminal-node-FR-020: TypeScript and places', () => {
  const run = (source: string, name = 'app.ts', more: Record<string, string> = {}) => {
    const given = { [name]: source, ...more };
    const { outputs } = compile(ts, libFileMap, { root: `${HOME}/${name}`, mode: 'strip', files: files(given) });
    return runProgram(script(source, name, [], more), { compiled: outputs });
  };

  test('an error thrown in a TypeScript file shows the file, line and code of what was written', async () => {
    const result = await run("type Unused = { a: string };\nconst n: number = 1;\nfunction foo(a: number): void {\n  throw new Error('x' + a);\n}\nfoo(n);\n");
    expect(result.exit).toBe(1);
    expect(result.stderr).toContain(`${HOME}/app.ts:4\n  throw new Error('x' + a);\n  ^\n\nError: x1\n    at foo (${HOME}/app.ts:4:9)`);
  });

  test('a TypeScript file imports another by each of its names, and runs', async () => {
    const result = await run("import { b } from './b';\nimport { b as c } from './b.js';\nconst d: string = b + c;\nconsole.log(d);\n", 'app.ts', { 'b.ts': 'export const b: string = "b";\n' });
    expect(result.stdout).toBe('bb\n');
    expect(result.exit).toBe(0);
  });

  test('a JavaScript program that requires a .ts file gets the error of research R12', async () => {
    const result = await runProgram(script("require('./b.ts');\n", 'main.js', [], { 'b.ts': 'export const b: string = "b";\n' }));
    expect(result.exit).toBe(1);
    expect(result.stderr).toContain('A TypeScript program must start from a TypeScript file');
  });
});
