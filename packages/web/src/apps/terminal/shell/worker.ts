// The shell worker's entry (006 contracts/shell-worker.md, research R26,
// R34, R39): no-network.ts first, so nothing in the worker can make a
// request; then the adapter on the site's CV, warmed with one `true`, and
// the messages of the protocol, one at a time.
import './no-network.ts';
import { fullText } from '../../../shell-text.ts';
import { dateRange } from '../../../format/dates.ts';
import { locationLine } from '../../../format/location.ts';
import { withoutScheme } from '../../../format/url.ts';
import { cvJson, resume, siteData, specList } from '../data.ts';
import { createShell } from './adapter.ts';
import type { Shell } from './adapter.ts';
import type { FromWorker, ToWorker } from './protocol.ts';

type WorkerScope = { postMessage(message: FromWorker): void; onmessage: ((event: { data: ToWorker }) => void) | null };

const scope = globalThis as unknown as WorkerScope;

let shell: Shell | null = null;
// Messages handled in the order they came.
let queue: Promise<void> = Promise.resolve();

async function handle(message: ToWorker): Promise<FromWorker | null> {
  if (message.type === 'start') {
    shell = createShell({ text: fullText, format: { dateRange, locationLine, withoutScheme }, resume, siteData, specs: specList, cvJson });
    await shell.warm();
    return { type: 'ready' };
  }
  if (shell === null) return null;
  if (message.type === 'run') return { type: 'result', result: await shell.run(message.request) };
  if (message.type === 'complete') return { type: 'completion', completion: await shell.complete(message.request) };
  if (message.type === 'write') return { type: 'wrote', outcome: await shell.write(message.request) };
  if (message.type === 'restore') await shell.restore(message.state, message.files);
  else await shell.reset();
  return { type: 'ready' };
}

scope.onmessage = (event) => {
  queue = queue.then(async () => {
    try {
      const answer = await handle(event.data);
      if (answer !== null) scope.postMessage(answer);
    } catch (error) {
      // Any message that throws fails the shell, so the page shows the
      // failure and its `try again`; rethrowing would reject the queue and
      // silently drop every later message.
      scope.postMessage({ type: 'failed', reason: error instanceof Error ? error.message : String(error) });
    }
  });
};
