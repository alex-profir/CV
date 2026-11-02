// The event loop (FR-008, FR-035): Node's order, compared with the real Node, and
// how a program ends.
import { describe, expect, test } from 'vitest';
import { runProgram, script, underNode } from './helpers/harness.ts';

const both = async (source: string) => {
  const here = await runProgram(script(source));
  const there = underNode({ 'main.js': source }, ['main.js']);
  return { here, there };
};

describe('009-terminal-node-FR-008: top-level code, then ticks, promises, timers and setImmediate', () => {
  test.each([
    ['ticks before promises, both before timers', `
      setTimeout(() => console.log('timeout'), 0);
      setImmediate(() => console.log('immediate'));
      Promise.resolve().then(() => console.log('promise'));
      queueMicrotask(() => console.log('microtask'));
      process.nextTick(() => console.log('tick'));
      console.log('top');
    `],
    ['a tick from a promise runs after the promises queued', `
      Promise.resolve().then(() => { console.log('p1'); process.nextTick(() => console.log('t2')); }).then(() => console.log('p2'));
      process.nextTick(() => { console.log('t1'); Promise.resolve().then(() => console.log('p3')); });
    `],
    ['an immediate from a timer runs before the next timer', `
      setTimeout(() => {
        console.log('t1');
        setImmediate(() => console.log('i'));
        setTimeout(() => console.log('t2'), 0);
        process.nextTick(() => console.log('tick'));
        Promise.resolve().then(() => console.log('promise'));
      }, 0);
    `],
    ['microtasks run between timers of the same turn', `
      setTimeout(() => { console.log('a'); Promise.resolve().then(() => console.log('a promise')); }, 0);
      setTimeout(() => console.log('b'), 0);
    `],
    ['an immediate from an immediate waits for the next turn', `
      setImmediate(() => { console.log('i1'); setImmediate(() => console.log('i3')); });
      setImmediate(() => console.log('i2'));
    `],
    ['timers by their time', `
      setTimeout(() => console.log('30'), 30);
      setTimeout(() => console.log('10'), 10);
      const i = setInterval(() => { console.log('i'); clearInterval(i); }, 1);
    `],
    ['cleared and unref’d timers', `
      clearTimeout(setTimeout(() => console.log('cleared'), 0));
      clearImmediate(setImmediate(() => console.log('cleared')));
      setTimeout(() => console.log('unref'), 5000).unref();
      const t = setTimeout(() => console.log('hasRef ' + t.hasRef()), 1);
    `],
  ])('%s', async (_, source) => {
    const { here, there } = await both(source);
    expect(here.output).toBe(there.output);
    expect(here.exit).toBe(there.status);
    expect(here.timedOut).toBe(false);
  });

  test('it ends when nothing is left: a pending promise keeps nothing alive', async () => {
    const run = await runProgram(script("new Promise(() => {}); console.log('end');"));
    expect(run.output).toBe('end\n');
    expect(run.exit).toBe(0);
  });
});

describe('009-terminal-node-FR-035: exit handlers run on a natural end and on process.exit, once, with the code', () => {
  test.each([
    ['a natural end', "process.on('exit', (code) => console.log('exit', code)); console.log('body');"],
    ['process.exit', "process.on('exit', (code) => console.log('exit', code)); process.exit(3); console.log('never');"],
    ['process.exitCode', "process.on('exit', (code) => console.log('exit', code, process.exitCode)); process.exitCode = 4;"],
    ['an exit handler that changes the code', "process.on('exit', () => { process.exitCode = 5; });"],
    ['process.exit in an exit handler', "process.on('exit', () => { console.log('a'); process.exit(6); }); process.on('exit', () => console.log('b'));"],
    ['beforeExit, and more work from it', `
      let once = true;
      process.on('beforeExit', (code) => { console.log('before', code); if (once) { once = false; setTimeout(() => console.log('more'), 1); } });
      process.on('exit', () => console.log('exit'));
    `],
  ])('%s', async (_, source) => {
    const { here, there } = await both(source);
    expect(here.output).toBe(there.output);
    expect(here.exit).toBe(there.status);
  });
});

describe('009-terminal-node-FR-032: a SIGINT handler runs when the program yields', () => {
  test('the page is told a handler exists, and the signal becomes the event', async () => {
    const run = await runProgram(script("process.on('SIGINT', (name) => { console.log('got', name); process.exit(4); });\nconsole.log('ready');\nsetInterval(() => {}, 1000);\n"), { signals: [{ afterOutput: 'ready' }] });
    expect(run.stdout).toBe('ready\ngot SIGINT\n');
    expect(run.exit).toBe(4);
    expect(run.messages).toContainEqual({ sigint: true });
  });

  test('the page is told when it goes: by `off`, and after a `once` has run', async () => {
    const off = await runProgram(script("const f = () => {};\nprocess.on('SIGINT', f);\nprocess.off('SIGINT', f);\n"));
    expect(off.messages.filter((each) => 'sigint' in each)).toEqual([{ sigint: true }, { sigint: false }]);
    const once = await runProgram(script("process.once('SIGINT', () => console.log('once'));\nconsole.log('ready');\nsetTimeout(() => {}, 100);\n"), { signals: [{ afterOutput: 'ready' }] });
    expect(once.stdout).toBe('ready\nonce\n');
    expect(once.messages.filter((each) => 'sigint' in each)).toEqual([{ sigint: true }, { sigint: false }]);
  });

  test('other events on process say nothing', async () => {
    const run = await runProgram(script("process.on('exit', () => {});\nprocess.on('uncaughtException', () => {});\n"));
    expect(run.messages.filter((each) => 'sigint' in each)).toEqual([]);
  });
});

describe('009-terminal-node-FR-017: an error thrown in a SIGINT handler', () => {
  test('ends the program as any uncaught error does', async () => {
    const run = await runProgram(script("process.on('SIGINT', () => { throw new Error('from the handler'); });\nconsole.log('ready');\nsetInterval(() => {}, 1000);\n"), { signals: [{ afterOutput: 'ready' }] });
    expect(run.exit).toBe(1);
    expect(run.stderr).toContain('Error: from the handler');
    expect(run.messages.at(-1)).toEqual({ exit: 1, uncaught: true });
  });
});
