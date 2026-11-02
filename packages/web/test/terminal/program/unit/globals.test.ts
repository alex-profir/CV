// The globals (FR-012, contracts/node-api.md), `process.env` and `cwd` (FR-015),
// standard input (FR-016) and no threads (FR-025).
import { describe, expect, test } from 'vitest';
import { evaluate, printing, request, runProgram } from './helpers/harness.ts';

const value = async (code: string, change: Parameters<typeof request>[1] = {}) => {
  const run = await runProgram(request({}, { code: `console.log(JSON.stringify(${code}))`, ...change }));
  expect(run.stderr).toBe('');
  return JSON.parse(run.stdout);
};

describe('009-terminal-node-FR-012: the globals exist', () => {
  test.each(['console', 'process', 'Buffer', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder', 'structuredClone', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'clearTimeout', 'clearInterval', 'clearImmediate', 'global', 'globalThis'])('%s', async (name) => {
    const run = await runProgram(evaluate(`console.log(typeof ${name})`));
    expect(run.stdout.trim()).not.toBe('undefined');
  });

  test('a CommonJS file has require, module, exports, __filename and __dirname', async () => {
    const run = await runProgram(request({ 'sub/a.js': 'console.log(typeof require, typeof module, typeof exports, __filename, __dirname, this === exports, require.main === module)' }, { script: '/home/guest/sub/a.js' }));
    expect(run.stdout).toBe('function object object /home/guest/sub/a.js /home/guest/sub true true\n');
  });

  test.each(['argv', 'argv0', 'execPath', 'env', 'cwd', 'chdir', 'exit', 'platform', 'arch', 'version', 'versions', 'release', 'pid', 'title', 'hrtime', 'uptime', 'memoryUsage', 'nextTick', 'stdout', 'stderr', 'stdin', 'on', 'once', 'off', 'emit', 'emitWarning'])('process.%s', async (name) => {
    const run = await runProgram(evaluate(`console.log(${JSON.stringify(name)} in process, process.${name} === undefined)`));
    expect(run.stdout).toBe('true false\n');
  });

  test('process.exitCode, hrtime.bigint, the streams and the fixed values', async () => {
    const found = await value("[ 'exitCode' in process, typeof process.hrtime.bigint(), process.hrtime().length, typeof process.uptime(), typeof process.memoryUsage().rss, process.stdout.isTTY, process.stderr.isTTY, typeof process.stdout.columns, process.platform, process.version, process.title ]");
    expect(found).toEqual([true, 'bigint', 2, 'number', 'number', false, false, 'number', 'browser', 'v26.0.0', 'node'].map((each) => each));
  }, 20_000);

  test.each(['log', 'info', 'debug', 'error', 'warn', 'trace', 'dir', 'table', 'group', 'groupEnd', 'time', 'timeEnd', 'timeLog', 'count', 'countReset', 'assert'])('console.%s', async (name) => {
    expect((await runProgram(evaluate(`console.log(typeof console.${name})`))).stdout).toBe('function\n');
  });

  test('process.stdout.write and stderr.write print with no newline, in order', async () => {
    const run = await runProgram(evaluate("process.stdout.write('a'); process.stderr.write('b'); process.stdout.write('c');"));
    expect(run.output).toBe('abc');
    expect(run.stdout).toBe('ac');
    expect(run.stderr).toBe('b');
  });

  test('argv: the program, the script and its words', async () => {
    const run = await runProgram(request({ 'a.js': 'console.log(process.argv.slice(1), process.argv0)' }, { script: '/home/guest/a.js', args: ['x', '-y'] }));
    expect(run.stdout).toBe("[ '/home/guest/a.js', 'x', '-y' ] node\n");
  });
});

describe('009-terminal-node-FR-015: env and cwd start from the shell and hold inside', () => {
  test('from the request', async () => {
    expect(await value('[process.env.A, process.cwd()]', { env: { A: '1' }, cwd: '/home/guest/work' })).toEqual(['1', '/home/guest/work']);
  });

  test('changes hold inside, and values are strings', async () => {
    const run = await runProgram(request({ 'sub/x.txt': 'hi' }, { code: "process.env.B = 2; delete process.env.A; process.chdir('sub'); console.log(typeof process.env.B, 'A' in process.env, process.cwd(), require('path').resolve('y'))", env: { A: '1' } }));
    expect(run.stdout).toBe('string false /home/guest/sub /home/guest/sub/y\n');
  });

  test('chdir to nowhere gives ENOENT with the code', async () => {
    const run = await runProgram(evaluate("try { process.chdir('nope') } catch (e) { console.log(e.code, e.syscall) }"));
    expect(run.stdout).toBe('ENOENT chdir\n');
  });
});

describe('009-terminal-node-FR-016: standard input reads as already ended', () => {
  test('end comes at once, with no data', async () => {
    const run = await runProgram(evaluate("process.stdin.on('data', () => console.log('data')); process.stdin.on('end', () => console.log('ended')); process.stdin.on('close', () => console.log('closed'));"));
    expect(run.stdout).toBe('ended\nclosed\n');
    expect(run.exit).toBe(0);
  });

  test('reading it gives nothing', async () => {
    const run = await runProgram(evaluate("(async () => { let n = 0; for await (const _ of process.stdin) n++; console.log(n, process.stdin.read(), JSON.stringify(require('fs').readFileSync(0, 'utf8'))); })()"));
    expect(run.stdout).toBe('0 null ""\n');
  });
});

describe('009-terminal-node-FR-025: no threads', () => {
  test.each(['Worker', 'SharedWorker', 'importScripts'])('typeof %s is undefined', async (name) => {
    expect((await runProgram(evaluate(`console.log(typeof ${name})`))).stdout).toBe('undefined\n');
  });

  test('new Worker gives an error the program can catch and read', async () => {
    const run = await runProgram(evaluate("try { new Worker('x') } catch (error) { console.log(error.name, '-', error.message) }"));
    expect(run.stdout).toBe('ReferenceError - Worker is not defined\n');
    expect(run.exit).toBe(0);
  });
});

describe('009-terminal-node-FR-003: -p prints the value of the code', () => {
  test('of an expression, and undefined too', async () => {
    expect((await runProgram(printing('({ a: 1 })'))).stdout).toBe('{ a: 1 }\n');
    expect((await runProgram(printing('void 0'))).stdout).toBe('undefined\n');
  });
});
