// A program split across files (009 FR-014, research R3, R4), compared with the real
// Node where it can run the same files.
import { describe, expect, test } from 'vitest';
import { comparable, HOME, runProgram, script, underNode , request} from './helpers/harness.ts';

const same = async (name: string, files: Record<string, string>) => {
  const here = await runProgram(script(files[name]!, name, [], files));
  const there = underNode(files, [name]);
  expect(comparable(here.stdout)).toBe(comparable(there.stdout));
  expect(comparable(here.stderr)).toBe(comparable(there.stderr));
  expect(here.exit).toBe(there.status);
  return here;
};

describe('009-terminal-node-FR-014: other files load by relative path', () => {
  test('relative `require`, with and without the extension, a folder and JSON', () =>
    same('main.js', {
      'main.js': "console.log(require('./a'), require('./a.js') === require('./a'), require('./lib'), require('./data.json'), require('./lib/deep/b.js'), require.main === module);\n",
      'a.js': "module.exports = { name: 'a' };\n",
      'lib/index.js': "exports.lib = true;\nexports.b = require('./deep/b');\n",
      'lib/deep/b.js': 'exports.up = require("../../a").name;\n',
      'data.json': '{ "n": 1 }\n',
    }));

  test('`exports`, `module.exports`, `__filename`, `__dirname`, `this`', async () => {
    const run = await runProgram(script("const b = require('./sub/b');\nconsole.log(b, __filename, __dirname, this === exports);\n", 'main.js', [], { 'sub/b.js': 'exports.f = __filename;\nexports.d = __dirname;\nexports.t = this === module.exports;\n' }));
    expect(run.stdout).toBe(`{ f: '${HOME}/sub/b.js', d: '${HOME}/sub', t: true } ${HOME}/main.js ${HOME} true\n`);
  });

  test('a module runs once', () =>
    same('main.js', { 'main.js': "require('./a'); require('./a'); console.log(Object.keys(require.cache).length > 0);\n", 'a.js': "console.log('ran');\n" }));

  test('a require cycle, as Node has it', () =>
    same('main.js', {
      'main.js': "console.log('main'); console.log(require('./a').done, require('./b').done);\n",
      'a.js': "exports.done = false;\nconst b = require('./b');\nconsole.log('in a, b.done =', b.done);\nexports.done = true;\n",
      'b.js': "exports.done = false;\nconst a = require('./a');\nconsole.log('in b, a.done =', a.done);\nexports.done = true;\n",
    }));

  test('`.mjs`: `import`, with defaults, names and namespaces', () =>
    same('main.mjs', {
      'main.mjs': "import def, { a, b as c } from './m.mjs';\nimport * as all from './m.mjs';\nimport cjs from './c.cjs';\nimport path from 'node:path';\nconsole.log(def, a, c, Object.keys(all).sort(), cjs, path.sep, typeof require, import.meta.url.startsWith('file:'));\n",
      'm.mjs': "export const a = 1;\nexport let b = 2;\nexport default 'the default';\n",
      'c.cjs': 'module.exports = { from: "commonjs" };\n',
    }));

  test('`.js` is detected by its syntax', () =>
    same('main.js', { 'main.js': "import { a } from './m.mjs';\nconsole.log(a, typeof module);\n", 'm.mjs': 'export const a = 1;\n' }));

  test('`.js` written as CommonJS stays so', () => same('main.js', { 'main.js': 'console.log(typeof module, typeof require);\n' }));

  test('`.cjs` beside `.mjs`: `require` from `.cjs`, and `import()` from anywhere', () =>
    same('main.cjs', { 'main.cjs': "console.log(typeof require);\nimport('./m.mjs').then((m) => console.log(m.a, m.default));\n", 'm.mjs': "export const a = 1;\nexport default 2;\n" }));

  test('top-level `await`', () =>
    same('main.mjs', { 'main.mjs': "console.log('a');\nconst v = await new Promise((resolve) => setTimeout(resolve, 5, 'b'));\nconsole.log(v);\nexport {};\n" }));

  test('export forms: lists, renames, stars, classes, functions', () =>
    same('main.mjs', {
      'main.mjs': "import { x, y, z, F, C, r } from './a.mjs';\nimport * as n from './b.mjs';\nconsole.log(x, y, z, F(), new C().v, r, n.q, n.default);\n",
      'a.mjs': "const x = 1, w = 2;\nexport { x, w as y };\nexport const z = 3;\nexport function F() { return 'f'; }\nexport class C { v = 'c'; }\nexport * from './b.mjs';\nexport { q as r } from './b.mjs';\n",
      'b.mjs': "export const q = 'q';\nexport default 'b default';\n",
    }));

  test('a name a module does not export is the SyntaxError Node gives', async () => {
    const files = { 'main.mjs': "import { nope } from './a.mjs';\nconsole.log(nope);\n", 'a.mjs': 'export const a = 1;\n' };
    const here = await runProgram(script(files['main.mjs'], 'main.mjs', [], files));
    expect(here.exit).toBe(underNode(files, ['main.mjs']).status);
    expect(here.stderr).toContain("does not provide an export named 'nope'");
  });

  test('`import` bindings are read once, as the Known differences say', async () => {
    const files = { 'main.mjs': "import { n, up } from './a.mjs';\nup();\nconsole.log(n);\n", 'a.mjs': 'export let n = 1;\nexport function up() { n += 1; }\n' };
    const run = await runProgram(script(files['main.mjs'], 'main.mjs', [], files));
    expect(run.stdout).toBe('1\n');
  });

  test('a program keeps the text it started with when it runs, line numbers intact', async () => {
    const run = await runProgram(script("require('fs').writeFileSync('b.js', 'exports.v = 2;\\n');\nconsole.log(require('./b').v);\n", 'main.js', [], { 'b.js': 'exports.v = 1;\n' }));
    expect(run.stdout).toBe('2\n');
  });

  test('a stack through an ES module names its file and line', async () => {
    const run = await runProgram(script("import './a.mjs';\n", 'main.mjs', [], { 'a.mjs': "\n\nthrow new Error('here');\n" }));
    expect(run.stderr).toContain(`${HOME}/a.mjs:3\nthrow new Error('here');\n^`);
    expect(run.exit).toBe(1);
  });
});

describe('009-terminal-node-FR-011: an imported namespace prints as Node prints it', () => {
  test('its values, with what it is', async () => {
    const files = { 'a.mjs': 'export const a = 1;\nexport const b = { c: [1, 2] };\n', 'main.mjs': "import * as m from './a.mjs';\nconsole.log(m);\n" };
    const run = await runProgram(request(files, { script: `${HOME}/main.mjs` }));
    expect(run.stdout).toBe(underNode(files, ['main.mjs']).stdout);
  });
});
