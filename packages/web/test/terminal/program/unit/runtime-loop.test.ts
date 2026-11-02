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
