// Every module but `fs` (fs.test.ts), by `require` and `import`, with and without
// `node:`, and every name contracts/node-api.md lists.
import { describe, expect, test } from 'vitest';
import { request, runProgram } from './helpers/harness.ts';

const NAMES: Readonly<Record<string, readonly string[]>> = {
  path: ['resolve', 'normalize', 'isAbsolute', 'join', 'relative', 'dirname', 'basename', 'extname', 'format', 'parse', 'sep', 'delimiter', 'posix', 'toNamespacedPath'],
  events: ['EventEmitter', 'once'],
  util: ['inspect', 'format', 'promisify', 'callbackify', 'isDeepStrictEqual', 'inherits', 'deprecate', 'types', 'TextEncoder', 'TextDecoder'],
  assert: ['ok', 'equal', 'notEqual', 'strictEqual', 'notStrictEqual', 'deepEqual', 'deepStrictEqual', 'notDeepStrictEqual', 'throws', 'doesNotThrow', 'rejects', 'fail', 'match', 'AssertionError'],
  'assert/strict': ['ok', 'equal', 'strictEqual', 'deepEqual', 'throws', 'AssertionError'],
  os: ['EOL', 'platform', 'type', 'arch', 'homedir', 'tmpdir', 'hostname', 'cpus', 'totalmem', 'freemem', 'uptime', 'userInfo'],
  timers: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate', 'clearImmediate'],
  'timers/promises': ['setTimeout', 'setImmediate', 'setInterval'],
  buffer: ['Buffer', 'constants'],
  url: ['URL', 'URLSearchParams', 'fileURLToPath', 'pathToFileURL'],
};

const EMITTER = ['on', 'once', 'off', 'addListener', 'removeListener', 'removeAllListeners', 'prependListener', 'emit', 'listenerCount', 'listeners', 'eventNames', 'setMaxListeners'];

const missing = (names: readonly string[], holder: string) => `${JSON.stringify(names)}.filter((name) => ${holder}[name] === undefined)`;

describe('009-terminal-node-FR-013: Programs load the modules, and each offers its names', () => {
  describe.each(Object.keys(NAMES))('%s', (name) => {
    test.each([name, `node:${name}`])('require(%s)', async (specifier) => {
      const run = await runProgram(request({}, { code: `console.log(JSON.stringify(${missing(NAMES[name]!, `require(${JSON.stringify(specifier)})`)}))` }));
      expect(run.stderr).toBe('');
      expect(run.stdout).toBe('[]\n');
    });

    test.each([name, `node:${name}`])('import of %s', async (specifier) => {
      const run = await runProgram(request({ 'a.mjs': `import whole, * as all from ${JSON.stringify(specifier)};\nconsole.log(JSON.stringify(${missing(NAMES[name]!, 'whole')}), JSON.stringify(${missing(NAMES[name]!, 'all')}));` }, { script: '/home/guest/a.mjs' }));
      expect(run.stderr).toBe('');
      expect(run.stdout).toBe('[] []\n');
    });
  });

  test('an EventEmitter has every method', async () => {
    const run = await runProgram(request({}, { code: `const { EventEmitter } = require('events'); const e = new EventEmitter(); console.log(JSON.stringify(${missing(EMITTER, 'e')}), require('events') === EventEmitter)` }));
    expect(run.stdout).toBe('[] true\n');
  });

  test('a named import from a module that has none fails before anything runs', async () => {
    const run = await runProgram(request({ 'a.mjs': "console.log('ran');\nimport { nope } from 'path';\n" }, { script: '/home/guest/a.mjs' }));
    expect(run.stdout).toBe('');
    expect(run.stderr).toContain("does not provide an export named 'nope'");
    expect(run.exit).toBe(1);
  });
});
