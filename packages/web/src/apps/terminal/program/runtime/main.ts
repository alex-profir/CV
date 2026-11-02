// The runtime (009 research R1, R2): a program's worker script, one classic
// script, in a sandboxed frame. Before anything else it takes its port into a
// closure, as 008's runtime does, and removes what a program must not reach.
// The program's code comes later, as a message, and only `eval` runs it.
import { removeReaches } from './sandbox.ts';

type Scope = typeof globalThis & {
  addEventListener(type: string, listener: (event: MessageEvent) => void): void;
  removeEventListener(type: string, listener: (event: MessageEvent) => void): void;
  postMessage(message: unknown): void;
};

const scope = self as unknown as Scope;

const postToFrame = scope.postMessage.bind(scope);
const dataOf = Function.prototype.call.bind(Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data')!.get!) as (event: MessageEvent) => unknown;

removeReaches(scope);

let toPage: ((message: unknown) => void) | null = null;
let nonce = '';

type FromPage = { nonce?: unknown; run?: unknown; request?: unknown; compiled?: unknown; signal?: unknown };

function onPage(event: MessageEvent): void {
  const data = dataOf(event) as FromPage | null;
  if (data === null || typeof data !== 'object' || data.nonce !== nonce) return;
  if (data.run === true) toPage?.({ exit: 0, nonce });
}

// The bootstrap's first message gives the port and the nonce; the frame is told
// the worker started, so it can revoke the script's URL.
function onFirst(event: MessageEvent): void {
  if (toPage !== null) return;
  const data = dataOf(event) as { port?: { postMessage(message: unknown): void; onmessage: unknown }; nonce?: unknown } | null;
  if (data === null || typeof data !== 'object' || data.port === undefined || typeof data.nonce !== 'string') return;
  toPage = data.port.postMessage.bind(data.port);
  nonce = data.nonce;
  scope.removeEventListener('message', onFirst);
  data.port.onmessage = onPage;
  postToFrame('started');
}

scope.addEventListener('message', onFirst);
