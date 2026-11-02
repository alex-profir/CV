// A program's host on the page (009 contracts/program.md, research R2, R14): one
// sandboxed frame and worker per program, its port and its end. It knows nothing
// of the session: it takes a request and gives events.
import { NO_CHANGES, statusOf, workerMessage } from './messages.ts';
import type { EndReason, ProgramEvents, ProgramHandle, ProgramRequest } from './messages.ts';

export type PortLike = { postMessage(message: unknown): void; onmessage: ((event: { data: unknown }) => void) | null; close(): void };
export type FrameLike = {
  readonly contentWindow: { postMessage(message: unknown, target: string, transfer?: Transferable[]): void } | null;
  addEventListener(type: 'load', listener: () => void): void;
  remove(): void;
};

// What the host needs of the browser, so a test can give it fakes.
export type HostEnv = {
  runtime: string;
  makeFrame(): FrameLike;
  makeChannel(): { port1: PortLike; port2: unknown };
  nonce(): string;
  // Messages from frames, until the function it gives back is called.
  listen(listener: (event: { source: unknown; data: unknown }) => void): () => void;
};

export function createHost(env: HostEnv) {
  function start(request: ProgramRequest, events: ProgramEvents): ProgramHandle {
    const nonce = env.nonce();
    const { port1: port, port2 } = env.makeChannel();
    const frame = env.makeFrame();
    let over = false;
    let loads = 0;
    let stopListening = () => {};

    function end(status: number, reason: EndReason): void {
      if (over) return;
      over = true;
      stopListening();
      port.onmessage = null;
      port.close();
      frame.remove();
      events.onEnded({ status, reason, changes: NO_CHANGES });
    }

    const died = (message: string) => end(1, /memory/i.test(message) ? 'memory' : 'died');

    port.onmessage = (event) => {
      const data = event.data as { nonce?: unknown } | null;
      if (over || data === null || typeof data !== 'object' || data.nonce !== nonce) return;
      const message = workerMessage(data);
      if (message === null) return;
      if ('exit' in message) end(statusOf(message.exit), message.uncaught === true ? 'uncaught' : 'exit');
    };

    stopListening = env.listen((event) => {
      const data = event.data as { nonce?: unknown; worker?: unknown; message?: unknown } | null;
      if (over || event.source !== frame.contentWindow || data === null || typeof data !== 'object' || data.nonce !== nonce) return;
      if (data.worker === 'started') port.postMessage({ run: true, nonce, request });
      else if (data.worker === 'died' || data.worker === 'failed' || data.worker === 'unreadable' || data.worker === 'refused') died(typeof data.message === 'string' ? data.message : '');
    });

    frame.addEventListener('load', () => {
      loads += 1;
      // A second load is the frame's document lost: the program died with it.
      if (loads > 1) return died('');
      frame.contentWindow?.postMessage({ start: true, nonce, source: env.runtime, port: port2 }, '*', [port2 as Transferable]);
    });

    return {
      interrupt: () => end(130, 'interrupted'),
      close: () => end(130, 'closed'),
    };
  }
  return { start };
}
