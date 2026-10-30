// Shared links (contracts/share-link.md, research R16): making and reading
// `#playground=1.<payload>.<check>`.
import { createHash } from 'node:crypto';
import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { withStrict } from '../../../src/apps/playground/compiler-options.ts';
import type { ChangedOptions } from '../../../src/apps/playground/compiler-options.ts';
import { examples } from '../../../src/apps/playground/examples/index.ts';
import { INFLATE_LIMIT, LINK_LIMIT, makeLink, readLink } from '../../../src/apps/playground/share.ts';

const ORIGIN = 'https://cv.example';

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64url');
const checkOf = (payload: string) => createHash('sha256').update(payload, 'ascii').digest('base64url').slice(0, 11);

// A link as the contract writes it, from any bytes, with a matching check.
function linkFor(bytes: Uint8Array, origin = ORIGIN): string {
  const payload = base64url(bytes);
  return `${origin}/#playground=1.${payload}.${checkOf(payload)}`;
}

const jsonLink = (json: string) => linkFor(deflateRawSync(Buffer.from(json, 'utf8')));

async function made(code: string, options: ChangedOptions, origin = ORIGIN): Promise<string> {
  const result = await makeLink(origin, code, options);
  if (!('link' in result)) throw new Error(`no link: ${JSON.stringify(result)}`);
  return result.link;
}

function parts(link: string): { format: string; payload: string; check: string } {
  const match = /#playground=([^.]*)\.([^.]*)\.([^.]*)$/.exec(link);
  if (match === null) throw new Error(link);
  return { format: match[1]!, payload: match[2]!, check: match[3]! };
}

// Code that deflate can't shrink, so its link grows with it.
function noise(length: number): string {
  let seed = 7;
  let text = '';
  while (text.length < length) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    text += String.fromCharCode(33 + (seed % 94));
  }
  return text;
}

const OPTION_SETS: ChangedOptions[] = [{}, { target: 'ES2017', noUnusedLocals: true }, withStrict({}, false), { exactOptionalPropertyTypes: true, removeComments: true }];

describe('008-typescript-playground-FR-052: Share makes a link that carries the code and the changed options', () => {
  test('every example, with and without options, comes back with identical code and options (SC-007)', async () => {
    const codes = [...examples(true), ...examples(false)].map((example) => example.code);
    codes.push('const s = "naïve — ✓ 😀";\n\tconsole.log(s);', '', '#playground=1.a.b');
    for (const code of codes) {
      for (const options of OPTION_SETS) {
        const link = await made(code, options);
        expect(await readLink(link)).toEqual({ kind: 'code', code, options, unknown: [], href: link });
      }
    }
  });

  test('the link is the site root with a #playground=1. fragment', async () => {
    const link = await made('let a = 1;', {});
    expect(link.startsWith(`${ORIGIN}/#playground=1.`)).toBe(true);
    const { format, payload, check } = parts(link);
    expect(format).toBe('1');
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(check).toMatch(/^[A-Za-z0-9_-]{11}$/);
  });

  test("the payload is deflate-raw of {\"c\":…,\"o\":…} in that order, the options in the table's order, as base64url with no padding", async () => {
    const { payload } = parts(await made('let a = 1;', { noUnusedLocals: true, target: 'ES2017' }));
    expect(payload).not.toContain('=');
    expect(inflateRawSync(Buffer.from(payload, 'base64url')).toString('utf8')).toBe('{"c":"let a = 1;","o":{"target":"ES2017","noUnusedLocals":true}}');
    const plain = parts(await made('let a = 1;', {})).payload;
    expect(inflateRawSync(Buffer.from(plain, 'base64url')).toString('utf8')).toBe('{"c":"let a = 1;"}');
    const defaults = parts(await made('let a = 1;', { target: 'ES2022', strict: true })).payload;
    expect(inflateRawSync(Buffer.from(defaults, 'base64url')).toString('utf8')).toBe('{"c":"let a = 1;"}');
  });

  test('the check is the first 11 base64url characters of SHA-256 over the payload', async () => {
    const { payload, check } = parts(await made('console.log(cv.basics?.name);', { noImplicitReturns: true }));
    expect(check).toBe(checkOf(payload));
  });
});

describe('008-typescript-playground-FR-055: code too long for a link makes no link', () => {
  test('the full link is at most 8,000 characters; one more character makes no link and gives the length', async () => {
    expect(LINK_LIMIT).toBe(8000);
    const code = noise(5000);
    const short = await made(code, {}, 'https://a.test');
    const pad = LINK_LIMIT - short.length;
    expect(pad).toBeGreaterThan(0);
    const fits = `https://${'a'.repeat(1 + pad)}.test`;
    const over = `https://${'a'.repeat(2 + pad)}.test`;
    const atLimit = await made(code, {}, fits);
    expect(atLimit).toHaveLength(LINK_LIMIT);
    expect(await makeLink(over, code, {})).toEqual({ tooLong: LINK_LIMIT + 1 });
  });

  test('long code that deflate shrinks still makes a link', async () => {
    const code = 'console.log("again");\n'.repeat(2000);
    expect(code.length).toBeGreaterThan(LINK_LIMIT);
    expect((await made(code, {})).length).toBeLessThan(LINK_LIMIT);
  });
});

describe('008-typescript-playground-FR-056: a cut-off, altered or garbled link is broken, and reading it never runs or throws', () => {
  test('no fragment is none, #playground alone is app', async () => {
    expect(await readLink(`${ORIGIN}/`)).toEqual({ kind: 'none' });
    expect(await readLink(`${ORIGIN}/#about`)).toEqual({ kind: 'none' });
    expect(await readLink(`${ORIGIN}/#playgrounds`)).toEqual({ kind: 'none' });
    expect(await readLink(`${ORIGIN}/#playground`)).toEqual({ kind: 'app' });
  });

  test('a cut-off, an altered and a garbled payload, a wrong format, a bad check, non-JSON, a non-string c and a non-object o are broken', async () => {
    const link = await made('console.log("shared");', { noUnusedLocals: true });
    const { payload, check } = parts(link);
    const swap = (text: string, at: number) => `${text.slice(0, at)}${text[at] === 'A' ? 'B' : 'A'}${text.slice(at + 1)}`;
    const garbled = base64url(new Uint8Array([0xff, 0xfe, 0x00, 0x13, 0x37, 0x42, 0x99, 0x01]));
    const broken = [
      link.slice(0, -3),
      link.slice(0, link.length - check.length - 5),
      `${ORIGIN}/#playground=1.${swap(payload, 4)}.${check}`,
      `${ORIGIN}/#playground=1.${payload}.${swap(check, 0)}`,
      `${ORIGIN}/#playground=1.${garbled}.${checkOf(garbled)}`,
      `${ORIGIN}/#playground=2.${payload}.${check}`,
      `${ORIGIN}/#playground=1.${payload}`,
      `${ORIGIN}/#playground=1.${payload}.${check}.x`,
      `${ORIGIN}/#playground=1.${payload}!.${checkOf(`${payload}!`)}`,
      `${ORIGIN}/#playground=`,
      `${ORIGIN}/#playground=1..${checkOf('')}`,
      jsonLink('not json'),
      jsonLink('{"c":42}'),
      jsonLink('{"o":{}}'),
      jsonLink('{"c":"a","o":5}'),
      jsonLink('{"c":"a","o":[true]}'),
      jsonLink('{"c":"a","o":null}'),
      jsonLink('["a"]'),
      jsonLink('null'),
      linkFor(new Uint8Array(deflateRawSync(Buffer.from([0xc3, 0x28, 0x7b])))),
    ];
    for (const href of broken) expect(await readLink(href), href).toEqual({ kind: 'broken', href });
  });

  test('options not in the table, or of the wrong kind, are left out and named', async () => {
    const href = jsonLink('{"c":"let a = 1;","o":{"target":"ES2017","fancyMode":true,"strict":"yes","noUnusedLocals":true}}');
    expect(await readLink(href)).toEqual({ kind: 'code', code: 'let a = 1;', options: { target: 'ES2017', noUnusedLocals: true }, unknown: ['fancyMode', 'strict'], href });
  });

  test('reading stops inflating at 1 MiB and calls the link broken', async () => {
    expect(INFLATE_LIMIT).toBe(1024 * 1024);
    const under = 'a'.repeat(INFLATE_LIMIT - 16);
    const fits = jsonLink(JSON.stringify({ c: under }));
    expect(await readLink(fits)).toMatchObject({ kind: 'code', code: under });
    const huge = jsonLink(JSON.stringify({ c: 'a'.repeat(64 * INFLATE_LIMIT) }));
    expect(huge.length).toBeLessThan(200_000);
    expect(await readLink(huge)).toEqual({ kind: 'broken', href: huge });
  });

  test('it never throws', async () => {
    for (const href of ['', 'not a url', '#playground=1.%%%.%%%', `${ORIGIN}/#playground=1.${'_'.repeat(5)}.${'-'.repeat(11)}`, `${ORIGIN}/#playground=%E0%A4%A.x.y`]) {
      await expect(readLink(href)).resolves.toBeDefined();
    }
  });
});
