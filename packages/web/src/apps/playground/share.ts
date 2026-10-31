// Shared links (contracts/share-link.md, research R16, FR-052 to FR-057):
// `#playground=1.<payload>.<check>`, made and read in the `os` script so the
// mobile screen reads links without the engine. Reading never throws and
// never runs anything; nothing here reaches the runner (FR-053).
import { changedOptions, readOptions, settle } from './compiler-options.ts';
import type { ChangedOptions } from './compiler-options.ts';
import type { ReadLink } from './types.ts';

// The longest link Share makes, origin included (FR-055).
export const LINK_LIMIT = 8000;
// Reading stops inflating here and calls the link broken: what a link of the
// longest length can hold, as base64url carries 3 bytes in 4 characters and
// deflate grows them by at most 1,032 times. A forged longer one stops here too.
const DEFLATE_MOST = 1032;
export const INFLATE_LIMIT = Math.ceil((LINK_LIMIT * 3) / 4) * DEFLATE_MOST;

const FRAGMENT = 'playground';
const FORMAT = '1';
const CHECK_LENGTH = 11;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

function toBase64url(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;
  for (let at = 0; at < bytes.length; at += step) binary += String.fromCharCode(...bytes.subarray(at, at + step));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64URL.test(text) || text.length % 4 === 1) return null;
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(binary.length);
  for (let at = 0; at < binary.length; at += 1) bytes[at] = binary.charCodeAt(at);
  return bytes;
}

async function checkOf(payload: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return toBase64url(new Uint8Array(digest)).slice(0, CHECK_LENGTH);
}

async function deflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// The inflated bytes, or null when they aren't deflate-raw or pass the limit.
async function inflate(bytes: Uint8Array<ArrayBuffer>): Promise<Uint8Array | null> {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > INFLATE_LIMIT) {
        void reader.cancel().catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}

// The link for this code and these options, or the length it would have had
// when that passes the limit (FR-052, FR-055).
export async function makeLink(origin: string, code: string, options: ChangedOptions): Promise<{ link: string } | { tooLong: number }> {
  const changed = changedOptions(settle(options));
  const content = Object.keys(changed).length === 0 ? { c: code } : { c: code, o: changed };
  const payload = toBase64url(await deflate(new TextEncoder().encode(JSON.stringify(content))));
  const link = `${origin}/#${FRAGMENT}=${FORMAT}.${payload}.${await checkOf(payload)}`;
  return link.length > LINK_LIMIT ? { tooLong: link.length } : { link };
}

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

async function readShared(value: string): Promise<{ code: string; options: ChangedOptions; unknown: string[] } | null> {
  const parts = value.split('.');
  if (parts.length !== 3) return null;
  const [format, payload, check] = parts as [string, string, string];
  if (format !== FORMAT || check.length !== CHECK_LENGTH || !BASE64URL.test(check)) return null;
  const bytes = fromBase64url(payload);
  if (bytes === null || (await checkOf(payload)) !== check) return null;
  const inflated = await inflate(bytes);
  if (inflated === null) return null;
  const content: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(inflated));
  if (!isObject(content) || typeof content['c'] !== 'string') return null;
  if (content['o'] !== undefined && !isObject(content['o'])) return null;
  return { code: content['c'], ...readOptions(content['o'] ?? {}) };
}

// What the address holds (contracts/share-link.md Reading a link).
export async function readLink(href: string): Promise<ReadLink> {
  const fragment = fragmentOf(href);
  if (fragment === FRAGMENT) return { kind: 'app' };
  if (!fragment.startsWith(`${FRAGMENT}=`)) return { kind: 'none' };
  try {
    const shared = await readShared(fragment.slice(FRAGMENT.length + 1));
    return shared === null ? { kind: 'broken', href } : { kind: 'code', ...shared, href };
  } catch {
    return { kind: 'broken', href };
  }
}

const fragmentOf = (href: string) => {
  const hash = href.indexOf('#');
  return hash < 0 ? '' : href.slice(hash + 1);
};

// Whether the address holds a link for the Playground, read at once, before
// the code is decoded.
export function holdsLink(href: string): boolean {
  const fragment = fragmentOf(href);
  return fragment === FRAGMENT || fragment.startsWith(`${FRAGMENT}=`);
}

// Whether it holds shared code, sound or not, rather than the app alone.
export const holdsCode = (href: string): boolean => fragmentOf(href).startsWith(`${FRAGMENT}=`);

// The link that opens the Playground with what it holds (FR-059).
export const appLink = (origin: string): string => `${origin}/#${FRAGMENT}`;
