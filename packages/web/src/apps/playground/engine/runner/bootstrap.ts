// The bootstrap (research R17, contracts/runner.md The frame): the one script
// of the runner's sandboxed frame, bundled at build time into the text whose
// hash is the frame policy's only script source. It makes a classic worker
// from a Blob of the runtime and the code, hands it the port, revokes the
// URL after the worker's first message (an early revoke fails in WebKit),
// tells the page when the worker dies, and ends it on `stop` (R24).

type FromPage = { nonce?: unknown; start?: boolean; stop?: boolean; source?: unknown; port?: unknown };

let worker: Worker | null = null;
let nonce: string | null = null;

const tell = (message: Record<string, unknown>) => parent.postMessage({ ...message, nonce }, '*');

onmessage = (event: MessageEvent<FromPage>) => {
  const data = event.data;
  if (data === null || typeof data !== 'object' || typeof data.nonce !== 'string') return;
  if (data.start === true && worker === null && typeof data.source === 'string' && data.port instanceof MessagePort) {
    nonce = data.nonce;
    try {
      const url = URL.createObjectURL(new Blob([data.source], { type: 'text/javascript' }));
      const made = new Worker(url);
      made.addEventListener('message', () => URL.revokeObjectURL(url), { once: true });
      made.addEventListener('error', (error) => tell({ worker: 'died', message: String(error.message ?? '') }));
      made.postMessage({ port: data.port, nonce: data.nonce }, [data.port]);
      worker = made;
      tell({ worker: 'started' });
    } catch (error) {
      tell({ worker: 'failed', message: String(error) });
    }
  } else if (data.stop === true && data.nonce === nonce) {
    worker?.terminate();
    worker = null;
  }
};
