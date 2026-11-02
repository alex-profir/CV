// The harness itself (T012): what a browser's worker doesn't have isn't there,
// so it can't hide a name the runtime forgot.
import { describe, expect, test } from 'vitest';
import { comparable, runProgram, request, underNode } from './helpers/harness.ts';

const NAMES = ['process', 'Buffer', 'setImmediate', 'require', 'global', 'module', '__dirname', 'fetch'];

// A runtime stub that defines nothing: it reports what it finds and exits.
const STUB = `
  addEventListener('message', (event) => {
    const { port } = event.data;
    port.postMessage({ nonce: 'test', found: Object.fromEntries(${JSON.stringify(NAMES)}.map((name) => [name, eval('typeof ' + name)])) });
    port.postMessage({ nonce: 'test', exit: 0 });
  });
`;

describe('009-terminal-node SC-006: the harness runs the runtime with only what a browser worker offers', () => {
  test("Node's own names are undefined in its context", async () => {
    const run = await runProgram(request({}), { runtime: STUB });
    expect(run.messages[0]!['found']).toEqual(Object.fromEntries(NAMES.map((name) => [name, 'undefined'])));
    expect(run.exit).toBe(0);
  });

  test('underNode runs the real Node in a temporary folder by relative paths, and comparable leaves out stacks and the version', () => {
    const run = underNode({ 'a.js': "console.log(require('path').basename(process.cwd()).startsWith('cv-parity-'))\nthrow new Error('x')\n" }, ['a.js']);
    expect(run.stdout).toBe('true\n');
    expect(run.status).toBe(1);
    expect(comparable(run.stderr)).not.toMatch(/^\s+at |Node\.js v/m);
    expect(comparable(run.stderr)).toContain('Error: x');
    expect(comparable('a\n    at b (c:1:1)\n\nnode v26.0.0 (browser runtime, not Node.js)\n')).toBe('a\n\n');
  });
});
