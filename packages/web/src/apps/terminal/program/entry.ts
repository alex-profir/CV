// The program bundle's entry (009 research R13): the host with the browser's
// frame, port and scripts. The `os` script opens this file by a computed
// address when a first program runs, so nothing here loads before then.
import { bootstrap, policy, runtime } from 'virtual:terminal-program';
import { createHost } from './host.ts';
import type { FrameLike, HostEnv, PortLike } from './host.ts';

const frameDocument = () => `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}"><script>${bootstrap}</script>`;

// Hidden, on `document.body`, so a program outlives the content unmounting;
// moving or removing a frame would end its worker.
function runners(): HTMLElement {
  const found = document.getElementById('terminal-runners');
  if (found !== null) return found;
  const host = document.createElement('div');
  host.id = 'terminal-runners';
  host.hidden = true;
  document.body.append(host);
  return host;
}

const browserEnv: HostEnv = {
  runtime,
  makeFrame(): FrameLike {
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.title = '';
    frame.hidden = true;
    frame.srcdoc = frameDocument();
    // After its listeners: the host adds them when this returns, and `load`
    // comes only once the frame is in the document, a task later.
    queueMicrotask(() => runners().append(frame));
    return frame as unknown as FrameLike;
  },
  makeChannel() {
    const { port1, port2 } = new MessageChannel();
    return { port1: port1 as unknown as PortLike, port2 };
  },
  nonce: () => crypto.randomUUID(),
  listen(listener) {
    const heard = (event: MessageEvent) => listener({ source: event.source, data: event.data });
    addEventListener('message', heard);
    return () => removeEventListener('message', heard);
  },
};

export const { start } = createHost(browserEnv);
