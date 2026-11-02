// SC-006: scripts print the same text here as under the real Node, and end with
// the same code, leaving out stack lines and the version line.
import { describe, expect, test } from 'vitest';
import { comparable, HOME, runProgram, script, underNode, evaluate, printing } from './helpers/harness.ts';

const same = async (source: string, args: readonly string[] = []) => {
  const here = await runProgram(script(source, 'main.js', args));
  const there = underNode({ 'main.js': source }, ['main.js', ...args]);
  expect(comparable(here.stdout)).toBe(comparable(there.stdout));
  expect(comparable(here.stderr)).toBe(comparable(there.stderr.replace(/\S*cv-parity-[^/\s]+/g, HOME)));
  expect(here.exit).toBe(there.status);
};

const VALUES: readonly (readonly [string, string])[] = [
  ['primitives', "console.log(1, -0, 1.5, 'text', true, null, undefined, 10n, Symbol('s'), NaN, Infinity);"],
  ['strings in objects', "console.log(['a', \"it's\", 'say \"x\"'], { 'a-b': 1, c: 'd' });"],
  ['nested objects', 'console.log({ a: { b: { c: { d: { e: 1 } } } } });'],
  ['long objects wrap', "console.log({ alpha: 'a'.repeat(30), beta: 'b'.repeat(30), gamma: 'c'.repeat(30) });"],
  ['arrays', 'console.log([1, 2, 3], [[1, [2, [3, [4, [5]]]]]], [], new Array(3), [1, , 3]);'],
  ['more than 100 items', 'console.log(Array.from({ length: 120 }, (_, i) => i));'],
  ['Map and Set', "console.log(new Map([['a', 1], [{ b: 2 }, [3]]]), new Set([1, 'two', { three: 3 }]), new Map(), new Set(), new WeakMap(), new WeakSet());"],
  ['dates', "console.log(new Date(0), [new Date(86400000)], new Date('invalid'));"],
  ['errors have their name, message and properties', "const e = new TypeError('bad'); e.stack = 'TypeError: bad'; e.code = 'E_X'; console.log(e); console.log({ e: Object.assign(new Error('x'), { stack: 'Error: x' }) });"],
  ['functions and classes', 'function f() {} class A {} class B extends A {} console.log(f, () => {}, async function g() {}, function* h() {}, A, B, new B(), Object.assign(() => {}, { x: 1 }));'],
  ['circular references', 'const a = { name: "a" }; a.self = a; a.list = [a, { a }]; console.log(a);'],
  ['getters, symbols, null prototypes and class instances', "class P { x = 1; get y() { return 2; } } console.log(new P(), { get a() { return 1; }, set a(v) {} }, { [Symbol('k')]: 1 }, Object.create(null), Object.create({ inherited: 1 }));"],
  ['typed arrays and buffers', "console.log(new Uint8Array(3), new ArrayBuffer(2), Buffer.from('hi'), new Float64Array([1.5]));"],
  ['promises and regular expressions', 'console.log(new Promise(() => {}), /a+/gi);'],
  ['boxed values and arguments', "(function () { console.log(new Number(1), new String('s'), new Boolean(false), arguments); })(1, 2);"],
  ['format strings', "console.log('%s %d %i %f %j %o %O %% %c', 'a', 1.5, 1.5, '1.5', { a: 1 }, [1], { b: 2 }, 'css'); console.log('%s', { a: 1 }, 'extra');"],
];

describe('009-terminal-node-FR-011: values print as Node prints them, without color', () => {
  test.each(VALUES)('%s', async (_, source) => same(source));
});

describe('009-terminal-node-FR-012: console and process', () => {
  test.each([
    ['console streams', "console.log('o'); console.error('e'); console.info('i'); console.warn('w'); console.debug('d');"],
    ['groups', "console.group('a'); console.log('b\\nc'); console.group(); console.log('d'); console.groupEnd(); console.groupEnd(); console.log('e');"],
    ['count and assert', "console.count(); console.count('x'); console.count(); console.countReset(); console.count(); console.assert(true, 'no'); console.assert(false, 'yes %s', 1); console.assert(false);"],
    ['dir', "console.dir({ a: { b: { c: { d: 1 } } } }, { depth: 0 }); console.dir({ [Symbol.for('nodejs.util.inspect.custom')]() { return 'x'; }, y: 1 });"],
    ['table', "console.table([{ a: 1, b: 'x' }, { a: 2, c: true }]); console.table([1, 'two']); console.table({ x: { v: 1 } }); console.table(new Map([['k', 1]])); console.table(new Set([1])); console.table(5); console.table([{ a: 1, b: 2 }], ['b']);"],
    ['argv tail, and exit codes', "console.log(process.argv.slice(2)); process.exit(3);"],
    ['process.exitCode', 'process.exitCode = 7;'],
    ['a code outside 0 to 255 stays as given to the host', 'process.exitCode = 42;'],
    ['process.on and emit', "process.on('x', (a) => console.log('got', a)); console.log(process.emit('x', 1), process.emit('y'), process.listenerCount('x'));"],
    ['structuredClone, TextEncoder, URL', "console.log(structuredClone({ a: [1] }), new TextEncoder().encode('é'), new TextDecoder().decode(new Uint8Array([0xc3, 0xa9])), new URL('http://x.y/a?b=1').searchParams.get('b'), new URLSearchParams('a=1&b=2').toString());"],
  ])('%s', async (_, source) => same(source, source.includes('argv') ? ['x', 'y'] : []));
});

describe('009-terminal-node-FR-003: -e and -p', () => {
  test.each([
    ['-e', "console.log(1 + 1, typeof require, __filename, typeof module)", (code: string) => evaluate(code)],
    ['-p', '({ a: [1, 2] })', (code: string) => printing(code)],
    ['-p', "'text'", (code: string) => printing(code)],
    ['-p', "require('path').join('a', 'b')", (code: string) => printing(code)],
  ] as const)('node %s %s', async (flag, code, made) => {
    const here = await runProgram(made(code));
    const there = underNode({}, [flag, code]);
    expect(here.stdout).toBe(there.stdout);
    expect(here.exit).toBe(there.status);
  });
});

describe('009-terminal-node-FR-011 and 009-terminal-node-FR-013: the runtime\'s own coded errors', () => {
  test.each([
    ['assert.strictEqual, caught', "try { require('assert').strictEqual(1, 2); } catch (e) { console.log(e); console.log(e.stack.split('\\n')[0], String(e)); }"],
    ['generatedMessage', "const a = require('assert'); for (const f of [() => a(false), () => a.ok(null), () => a.match('a', /b/), () => a.ok(false, 'mine'), () => a.strictEqual(1, 2)]) { try { f(); } catch (e) { console.log(e.generatedMessage, e.code); } }"],
    ['readFileSync(1.5)', "try { require('fs').readFileSync(1.5); } catch (e) { console.log(e); console.log(e.name, e.code, e.message, String(e)); console.log(e.stack.split('\\n')[0]); }"],
    ['process.exit, wrong type', "try { process.exit('a'); } catch (e) { console.log(e.name, e.code, e.message); }"],
    ['process.exit, not an integer', "try { process.exit(1.5); } catch (e) { console.log(e.name, e.code, e.message); }"],
    ['received values', "const c = (f) => { try { f(); } catch (e) { console.log(e.code, e.message); } }; c(() => process.nextTick(1)); c(() => process.chdir({})); c(() => process.chdir(null)); c(() => setTimeout('x')); c(() => require('path').join(() => {})); c(() => require('path').join(function f() {})); c(() => new (require('events'))().on('x', 'a'.repeat(40))); c(() => process.stdout.write(5));"],
    ['an unhandled error event', "try { new (require('events'))().emit('error', 'text'); } catch (e) { console.log(e.name, e.code, e.message, e.context, String(e)); }"],
  ])('%s', async (_, source) => same(source));
});

describe('009-terminal-node-FR-017: an assertion left uncaught', () => {
  test("its own form, from the visitor's line, where Node points into its own code", async () => {
    const source = "require('assert').strictEqual(1, 2);";
    const here = await runProgram(script(source));
    const there = underNode({ 'main.js': source }, ['main.js']);
    const from = (text: string) => comparable(text).slice(comparable(text).indexOf('AssertionError'));
    expect(from(here.stderr)).toBe(from(there.stderr));
    expect(here.stderr).toContain(`${HOME}/main.js:1\n${source}\n`);
    expect(here.exit).toBe(there.status);
  });
});

describe('009-terminal-node-FR-010: the ending codes', () => {
  test.each([
    ['an error thrown in an uncaughtException handler', "process.on('uncaughtException', () => { throw new Error('again'); }); throw new Error('first');"],
    ['an error thrown in an exit handler', "process.on('exit', () => { throw new Error('in exit'); });"],
    ['exitCode in an exit handler, on a natural end', "process.on('exit', (code) => console.log(code, process.exitCode));"],
    ['exitCode in an exit handler, after process.exit()', "process.on('exit', (code) => console.log(code, process.exitCode)); process.exit();"],
    ['exitCode in an exit handler, after process.exit(0)', "process.on('exit', (code) => console.log(code, process.exitCode)); process.exit(0);"],
    ['exitCode in an exit handler, after exitCode is set', "process.on('exit', (code) => console.log(code, process.exitCode)); process.exitCode = 4;"],
    ['exitCode in an exit handler, after an uncaught error', "process.on('exit', (code) => console.log(code, process.exitCode)); throw new Error('x');"],
  ])('%s', async (_, source) => same(source));
});

describe('009-terminal-node-FR-013: Buffer', () => {
  test.each([
    ['base64url', "const b = Buffer.from([251, 255, 254]); console.log(b.toString('base64url'), Buffer.from('-__-', 'base64url'), Buffer.byteLength('-__-', 'base64url'), Buffer.isEncoding('base64url'), Buffer.from('hi').toString('base64url'));  const w = Buffer.alloc(3); w.write('-__-', 0, 3, 'base64url'); console.log(w);"],
    ['codes', "const c = (f) => { try { console.log(f()); } catch (e) { console.log(e.name, e.code); } }; c(() => Buffer.alloc(1).readUInt8(5)); c(() => Buffer.from(5)); c(() => Buffer.alloc(1).toString('nope')); c(() => Buffer.from('a', 'nope')); c(() => Buffer.alloc(-1)); c(() => Buffer.alloc(1).writeUInt8(300, 0));"],
    ['still a Buffer', "class B extends Uint8Array {} const b = Buffer.from('abc'); console.log(b.slice(1).toString(), Buffer.isBuffer(b.slice(1)), Buffer.concat([b, b]).length, b instanceof Uint8Array, b.toString(), String(b), b.toString('utf8', 1, 2));"],
  ])('%s', async (_, source) => same(source));
});

const MODULES: readonly (readonly [string, string])[] = [
  ['fs: moving a folder into itself', "const fs = require('fs'); fs.mkdirSync('s'); try { fs.renameSync('s', 's/t'); } catch (e) { console.log(e.code, e.errno, e.syscall, e.path, e.dest, e.message); } console.log(fs.readdirSync('s'));"],
  ['path', "const p = require('path'); console.log(p.join('a', '..', 'b', './c'), p.resolve('/a/b', '../c'), p.relative('/a/b/c', '/a/d'), p.dirname('/a/b/c.js'), p.dirname('a'), p.dirname('/a'), p.basename('/a/b.js', '.js'), p.basename('/a/b/'), p.extname('a.b.c'), p.extname('.x'), p.extname('a.'), p.normalize('/a//b/../c/.'), p.normalize('a/'), p.normalize(''), p.normalize('../..//a'), p.isAbsolute('/x'), p.isAbsolute('x'), p.sep, p.delimiter, p.posix === p, p.format({ dir: '/a', base: 'b.js' }), p.format({ root: '/', name: 'x', ext: 'js' }), p.parse('/a/b.tar.gz'), p.parse('c'), p.parse('/'), p.join(''), p.relative('/a', '/a')); try { p.join(1) } catch (e) { console.log(e.code, e.name) }"],
  ['events', "const E = require('events'); const e = new E(); const f = (a) => console.log('f', a); e.on('x', f); e.once('x', (a) => console.log('once', a)); e.prependListener('x', () => console.log('first')); console.log(e.listenerCount('x'), e.eventNames(), e.getMaxListeners()); console.log(e.emit('x', 1), e.emit('x', 2), e.emit('none')); e.off('x', f); console.log(e.listeners('x').length); try { e.emit('error', new Error('boom')) } catch (err) { console.log(err.message) } try { e.emit('error', 'text') } catch (err) { console.log(err.code, err.message) } E.once(e, 'y').then((v) => console.log('once', v)); e.emit('y', 1, 2); class C extends E {} console.log(new C() instanceof E, E.EventEmitter === E);"],
  ['util', "const u = require('util'); console.log(u.format('%s:%d', 'a', 1), u.inspect({ a: { b: { c: { d: 1 } } } }, { depth: 0 }), u.inspect('x'), u.isDeepStrictEqual({ a: [1] }, { a: [1] }), u.isDeepStrictEqual([1], ['1']), u.isDeepStrictEqual(new Map([[1, 2]]), new Map([[1, 2]])), u.types.isDate(new Date()), u.types.isMap(new Set()), u.types.isPromise(Promise.resolve())); const p = u.promisify((a, cb) => cb(null, a + 1)); p(1).then(console.log); u.promisify((cb) => cb(new Error('bad')))().catch((e) => console.log(e.message)); u.callbackify(async () => 2)((e, v) => console.log(e, v)); function A() {} function B() {} u.inherits(A, B); console.log(new A() instanceof B, A.super_ === B); console.log(new u.TextEncoder().encode('a'), new u.TextDecoder().decode(new Uint8Array([97])));"],
  ['assert', "const a = require('assert'); const c = (f) => { try { f(); console.log('passed'); } catch (e) { console.log(e.name, e.code, e.generatedMessage, e.operator, e.message); } }; c(() => a.ok(true)); c(() => a.strictEqual(1, 1)); c(() => a.strictEqual(1, 2)); c(() => a.strictEqual(1, 2, 'mine')); c(() => a.notStrictEqual(1, 1)); c(() => a.equal(1, '1')); c(() => a.equal(1, 2)); c(() => a.notEqual(1, 2)); c(() => a.deepEqual({ a: 1 }, { a: '1' })); c(() => a.deepStrictEqual({ a: 1 }, { a: 1 })); c(() => a.notDeepStrictEqual({ a: 1 }, { a: 2 })); c(() => a.throws(() => { throw new TypeError('t'); }, TypeError)); c(() => a.throws(() => { throw new Error('t'); }, /t/)); c(() => a.throws(() => {})); c(() => a.doesNotThrow(() => {})); c(() => a.fail('out')); c(() => a.fail()); c(() => a.match('abc', /b/)); a.rejects(Promise.reject(new Error('x'))).then(() => console.log('rejected')); console.log(a.strict.equal === a.strictEqual, require('assert/strict').equal === a.strictEqual, new a.AssertionError({ message: 'm' }).message);"],
  ['os', "const o = require('os'); console.log(JSON.stringify(o.EOL), typeof o.platform(), typeof o.type(), typeof o.arch(), typeof o.homedir(), typeof o.tmpdir(), typeof o.hostname(), Array.isArray(o.cpus()), typeof o.totalmem(), typeof o.freemem(), typeof o.uptime(), typeof o.userInfo().username);"],
  ['timers', "const t = require('timers'); t.setTimeout((a) => console.log('t', a), 1, 'x'); t.setImmediate((a) => console.log('i', a), 'y'); const i = t.setInterval(() => { console.log('r'); t.clearInterval(i); }, 50); console.log(t.setTimeout === setTimeout);"],
  ['timers/promises', "const t = require('timers/promises'); (async () => { console.log(await t.setTimeout(1, 'a'), await t.setImmediate('b')); let n = 0; for await (const v of t.setInterval(1, 'c')) { console.log(v); if (++n === 2) break; } const ac = new AbortController(); const p = t.setTimeout(1000, 'd', { signal: ac.signal }); ac.abort(); await p.catch((e) => console.log(e.name, e.code)); })();"],
  ['buffer', "const { Buffer: B } = require('buffer'); const b = B.from('héllo'); console.log(b, b.toString('hex'), b.toString('base64'), b.length, B.from('aGk=', 'base64').toString(), B.alloc(2), B.concat([B.from('a'), B.from('b')]).toString(), B.isBuffer(b), B.byteLength('é'), b.slice(0, 1).toString(), b.equals(B.from('héllo')), b.readUInt8(0), JSON.stringify(B.from('a')), B === Buffer);"],
  ['url', "const u = require('url'); console.log(u.fileURLToPath('file:///a/b%20c.js'), u.pathToFileURL('/a/b c#d.js').href, new u.URL('http://a.b/c?d=1#e').pathname, new u.URLSearchParams({ x: '1' }).toString(), u.URL === URL); try { u.fileURLToPath('http://x') } catch (e) { console.log(e.code) }"],
];

describe('009-terminal-node-FR-013: For the functions that exist, behavior matches Node', () => {
  test.each(MODULES)('%s', async (_, source) => same(source));
});
