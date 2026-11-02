// The part `program` (009 FR-043, contracts/cli.md Parts): on the real build, in
// a real browser, what a visitor sees of a program. Each check names itself in its
// variant, so a failure says what failed.
import type { BrowserContextOptions, Locator, Page } from 'playwright';
import type { Problem } from '../report.ts';
import { ENDLESS_PROGRAM, SHELL, TERMINAL, newRun, openTerminal, startLine, stateVariant, typeLine, waitForShell } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';
import { siteText } from '../../../../packages/web/src/site-text.ts';
import { waitForWorker } from './offline.ts';
import { recordRequests } from './other-sites.ts';

export type Found = Omit<Problem, 'part' | 'page' | 'variant'>;

export type ProgramCheck = {
  name: string;
  shells: readonly Shell[];
  options?: BrowserContextOptions;
  run: (page: Page, shell: Shell) => Promise<Found[]>;
};

export const programVariant = (shell: Shell, name: string, width: number) => stateVariant(shell, `program-${name}`, width);

export const problem = (type: string, subject: string, detail: string): Found => ({ type, subject, detail });

// A file, written as a visitor could with the shell's `printf`: `%b`, as a typed
// newline would end the line, and in pieces, as the command line holds a limited length.
export async function writeFile(page: Page, name: string, text: string): Promise<void> {
  for (let at = 0; at < Math.max(text.length, 1); at += 200) {
    const quoted = text.slice(at, at + 200).replace(/\\/g, '\\\\').replace(/'/g, "'\\''").replace(/\n/g, '\\n');
    await typeLine(page, `printf '%b' '${quoted}' ${at === 0 ? '>' : '>>'} ${name}`);
  }
}

// Runs a line and gives back its run, once the line and any program have ended.
export const runLine = (page: Page, line: string): Promise<Locator> => newRun(page, () => typeLine(page, line));

// The output of a run, as text.
export const outputOf = async (run: Locator): Promise<string> => {
  const output = run.locator(TERMINAL.output);
  // A line that printed nothing has no output to read.
  return (await output.count()) === 0 ? '' : (await output.innerText()).trim();
};

export { openTerminal };

const BOTH: readonly Shell[] = ['desktop', 'mobile'];

const expectIn = (found: Found[], subject: string, text: string, wanted: string, what: string) => {
  if (!text.includes(wanted)) found.push(problem(what, subject, `expected ${JSON.stringify(wanted)} in the output, got ${JSON.stringify(text.slice(0, 400))}`));
};

// The status of the line before, as the shell reads it.
async function statusIs(page: Page, found: Found[], subject: string, wanted: number): Promise<void> {
  const shown = await outputOf(await runLine(page, 'echo $?'));
  if (shown !== String(wanted)) found.push(problem('status', subject, `$? is ${shown}, expected ${wanted}`));
}

const framesHeld = (page: Page) => page.evaluate(() => document.getElementById('terminal-runners')?.childElementCount ?? 0);

// Until the program's frame is there, so a key reaches a program and not a line.
const programStarted = (page: Page) => page.waitForSelector(TERMINAL.programFrame, { state: 'attached', timeout: 15_000 });

const busy = (page: Page) => page.evaluate((selector) => document.querySelector(selector) !== null, TERMINAL.busyRun);

// Until the running entry prints `text`.
const printed = (page: Page, text: string) => page.waitForFunction(([selector, wanted]) => document.querySelector(selector!)?.textContent?.includes(wanted!) === true, [TERMINAL.busyRun, text] as const, { timeout: 15_000 });

// Until no line runs, and how long that took.
async function ended(page: Page, timeout = 30_000): Promise<number> {
  const from = Date.now();
  await page.waitForFunction((selector) => document.querySelector(selector) === null, TERMINAL.busyRun, { timeout });
  return Date.now() - from;
}

// How long a stop may be given before the check says it failed: past the 1 s it
// must take, and short of the page's own waits, so a stop that never comes is named.
const STOP_WAIT_MS = 5_000;

// Whether a stop ended the program, within the 1 s (FR-031, FR-033) or late.
async function stopEnded(page: Page, found: Found[], subject: string): Promise<boolean> {
  const took = await ended(page, STOP_WAIT_MS).catch(() => null);
  if (took === null) {
    found.push(problem('stop', subject, `the program was still running ${STOP_WAIT_MS} ms later`));
    return false;
  }
  if (took > 1000) found.push(problem('stop', subject, `it took ${took} ms to end the program, over 1 s`));
  return true;
}

const TICK = "let n = 0; const t = setInterval(() => { console.log('tick', ++n, Date.now()); if (n === 3) clearInterval(t); }, 400);";

// When each `tick` line reached the page: the last run's text, at each change.
const watchTicks = () => {
  const seen: { at: number; text: string }[] = [];
  const screen = document.querySelector('#os .terminal')!;
  new MutationObserver(() => {
    const text = [...document.querySelectorAll('#os .terminal section.run')].at(-1)?.textContent ?? '';
    if (seen.at(-1)?.text !== text) seen.push({ at: Date.now(), text });
  }).observe(screen, { childList: true, subtree: true, characterData: true });
  (globalThis as unknown as { __ticks: typeof seen }).__ticks = seen;
};

// What the page itself asked for of a program's code or the engine, from its own
// resource timing: the service worker's install fetches the precached bundle on the
// same load (T009), which the context's requests would count.
const programRequests = (page: Page) => page.evaluate(() => performance.getEntriesByType('resource').map((entry) => new URL(entry.name).pathname).filter((pathname) => /^\/assets\/program-/.test(pathname) || pathname.startsWith('/playground/')));

// The page again, with the network off, and the Terminal open.
async function reopenOffline(page: Page, shell: Shell): Promise<void> {
  await page.context().setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await waitForShell(page);
  await openTerminal(page, shell);
}

// The checks, in order; each story adds its own.
export const PROGRAM_CHECKS: readonly ProgramCheck[] = [
  {
    name: 'run',
    shells: BOTH,
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'hello.js', 'console.log({ a: 1 }, [1, 2])');
      expectIn(found, 'node hello.js', await outputOf(await runLine(page, 'node hello.js')), '{ a: 1 } [ 1, 2 ]', 'output');
      await statusIs(page, found, 'node hello.js', 0);
      return found;
    },
  },
  {
    name: 'streaming',
    shells: BOTH,
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'tick.js', TICK);
      await page.evaluate(watchTicks);
      const output = await outputOf(await runLine(page, 'node tick.js'));
      for (const n of [1, 2, 3]) expectIn(found, 'node tick.js', output, `tick ${n} `, 'output');
      const seen = await page.evaluate(() => (globalThis as unknown as { __ticks: { at: number; text: string }[] }).__ticks);
      for (const n of [1, 2, 3]) {
        const line = new RegExp(`tick ${n} (\\d+)`);
        const first = seen.find(({ text }) => line.test(text));
        if (first === undefined) {
          found.push(problem('streaming', 'node tick.js', `tick ${n} was never seen on its own while running`));
          continue;
        }
        const printed = Number(line.exec(first.text)![1]);
        if (first.at - printed > 250) found.push(problem('streaming', 'node tick.js', `tick ${n} reached the screen ${first.at - printed} ms after it was printed, over 250 ms`));
        if (n < 3 && first.text.includes(`tick ${n + 1} `)) found.push(problem('streaming', 'node tick.js', `tick ${n} and ${n + 1} arrived together`));
      }
      await statusIs(page, found, 'node tick.js', 0);
      return found;
    },
  },
  {
    name: 'errors',
    shells: BOTH,
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'bad.js', "console.log('a');\nthrow new Error('x');\n");
      const thrown = await runLine(page, 'node bad.js');
      const output = await outputOf(thrown);
      expectIn(found, 'node bad.js', output, "/home/guest/bad.js:2\nthrow new Error('x');\n^\n\nError: x", 'error form');
      expectIn(found, 'node bad.js', output, 'node v26.0.0 (browser runtime, not Node.js)', 'error form');
      if ((await thrown.locator('.tone-error').count()) === 0) found.push(problem('error tone', 'node bad.js', 'the error is not in the error tone'));
      await statusIs(page, found, 'node bad.js', 1);
      await writeFile(page, 'syn.js', "console.log('ran');\nlet x = ;\n");
      const syntax = await outputOf(await runLine(page, 'node syn.js'));
      expectIn(found, 'node syn.js', syntax, '/home/guest/syn.js:2\nlet x = ;', 'error form');
      if (syntax.includes('ran')) found.push(problem('syntax', 'node syn.js', 'the program ran in spite of its syntax error'));
      await statusIs(page, found, 'node syn.js', 1);
      return found;
    },
  },
  {
    name: 'endless-loop',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await startLine(page, ENDLESS_PROGRAM);
      await programStarted(page);
      // The site stays live: another window opens, and the line takes typing.
      await page.click(SHELL.cvDockItem);
      await page.waitForSelector(SHELL.cvWindow, { state: 'visible', timeout: 10_000 });
      await page.locator(TERMINAL.commandLine).focus();
      await page.keyboard.type('x');
      if ((await page.locator(TERMINAL.commandLine).inputValue()) !== 'x') found.push(problem('live', 'while (true) {}', 'the command line took no typing while the program ran'));
      await page.locator(TERMINAL.commandLine).fill('');
      if (!(await busy(page))) found.push(problem('live', 'while (true) {}', 'the program ended by itself'));
      await page.keyboard.press('Control+C');
      if (!(await stopEnded(page, found, 'Ctrl+C'))) return found;
      if ((await framesHeld(page)) !== 0) found.push(problem('stop', 'Ctrl+C', 'its frame is still there'));
      await statusIs(page, found, 'Ctrl+C', 130);
      return found;
    },
  },
  {
    name: 'past-a-handler',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'h.js', "process.on('SIGINT', () => console.log('no'));\nconsole.log('ready');\nsetInterval(() => {}, 1000);\n");
      await startLine(page, 'node h.js');
      await printed(page, 'ready');
      await page.keyboard.press('Control+C');
      await printed(page, 'no');
      if (!(await busy(page))) found.push(problem('handler', 'first Ctrl+C', 'the program ended with a handler to run'));
      await page.keyboard.press('Control+C');
      if (!(await stopEnded(page, found, 'second Ctrl+C'))) return found;
      await statusIs(page, found, 'second Ctrl+C', 130);
      return found;
    },
  },
  {
    name: 'output-limit',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      // It waits for the page as it prints, so 1 MB of short lines takes about 10 s.
      await startLine(page, `node -e "while (true) console.log('y')"`);
      await programStarted(page);
      await ended(page);
      const run = page.locator(TERMINAL.run).last();
      if ((await run.locator(TERMINAL.stopped).count()) !== 1) found.push(problem('limit', 'printing without end', 'no stopped line'));
      await statusIs(page, found, 'printing without end', 130);
      return found;
    },
  },
  {
    name: 'sandbox',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      const foreign = await recordRequests(page.context(), new URL(page.url()).origin);
      await openTerminal(page, shell);
      const fetched = await outputOf(await runLine(page, `node -e "fetch('https://example.com').catch((e) => console.log(e.message))"`));
      expectIn(found, 'fetch', fetched, 'fetch failed', 'network');
      expectIn(found, 'names', await outputOf(await runLine(page, `node -e "console.log(typeof document, typeof localStorage, typeof Worker)"`)), 'undefined undefined undefined', 'reach');
      expectIn(found, 'the page', await outputOf(await runLine(page, `node -e "try { document.title } catch (e) { console.log(e.name) }"`)), 'ReferenceError', 'reach');
      if (foreign.size > 0) found.push(problem('network', 'request', `a program reached ${[...foreign.keys()].join(', ')}`));
      return found;
    },
  },
  {
    name: 'typescript',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'app.ts', "const n: number = 'text';\nconsole.log('ran', n);\n");
      // A first run in this profile: the engine comes down, with progress.
      const first = await outputOf(await runLine(page, 'ts-node app.ts'));
      expectIn(found, 'first run', first, 'Downloading TypeScript, once:', 'progress');
      expectIn(found, 'ts-node app.ts', first, "TSError: Unable to compile TypeScript:\napp.ts(1,7): error TS2322:", 'type error');
      if (first.includes('ran')) found.push(problem('type error', 'ts-node app.ts', 'the program ran in spite of its type error'));
      await statusIs(page, found, 'ts-node app.ts', 1);
      // `node` runs it past the error, and from here nothing more is fetched.
      const fetched: string[] = [];
      page.on('request', (request) => {
        if (/\/playground\//.test(request.url())) fetched.push(request.url());
      });
      const past = await outputOf(await runLine(page, 'node app.ts'));
      expectIn(found, 'node app.ts', past, 'ran text', 'output');
      await writeFile(page, 'app.ts', "const n: number = 1;\nconsole.log('fixed', n);\n");
      expectIn(found, 'tsnode app.ts', await outputOf(await runLine(page, 'tsnode app.ts')), 'fixed 1', 'output');
      await statusIs(page, found, 'tsnode app.ts', 0);
      const downloaded = fetched.filter((address) => !/ts\.worker-/.test(address));
      if (downloaded.length > 0) found.push(problem('shared copy', 'TypeScript', `a later run fetched ${downloaded.join(', ')}`));
      return found;
    },
  },
  {
    name: 'typescript-stop',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'app.ts', "console.log('ran');\n");
      // Held, so the download is still on its way when Ctrl+C comes.
      await page.route('**/playground/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2_000));
        await route.continue().catch(() => undefined);
      });
      await startLine(page, 'ts-node app.ts');
      await page.waitForTimeout(300);
      await page.keyboard.press('Control+C');
      const took = await ended(page);
      if (took > 1000) found.push(problem('stop', 'Ctrl+C during the download', `it took ${took} ms to end the line, over 1 s`));
      await statusIs(page, found, 'Ctrl+C during the download', 130);
      return found;
    },
  },
  {
    name: 'files',
    shells: BOTH,
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'lib.js', "exports.name = (data) => data.basics.name;\n");
      await writeFile(page, 'use.js', "const fs = require('fs');\nconst { name } = require('./lib');\nfs.writeFileSync('out.txt', name(JSON.parse(fs.readFileSync('cv.json', 'utf8'))));\n");
      await runLine(page, 'node use.js');
      await statusIs(page, found, 'node use.js', 0);
      const written = await outputOf(await runLine(page, 'cat out.txt'));
      if (written === '') found.push(problem('files', 'cat out.txt', 'what the program wrote is not there'));
      const before = await outputOf(await runLine(page, 'cat cv.json'));
      expectIn(found, 'writing cv.json', await outputOf(await runLine(page, `node -e "require('fs').writeFileSync('/home/guest/cv.json', '')"`)), 'EACCES', 'rules');
      if ((await outputOf(await runLine(page, 'cat cv.json'))) !== before) found.push(problem('rules', 'cv.json', 'a program changed a protected file'));
      return found;
    },
  },
  {
    name: 'files-after-stop',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await writeFile(page, 'w.js', "require('fs').writeFileSync('kept.txt', 'kept');\nconsole.log('wrote');\nwhile (true) {}\n");
      await startLine(page, 'node w.js');
      await printed(page, 'wrote');
      await page.keyboard.press('Control+C');
      await ended(page);
      const kept = await outputOf(await runLine(page, 'cat kept.txt'));
      if (kept !== 'kept') found.push(problem('files', 'a write before Ctrl+C', `cat gives ${JSON.stringify(kept)}`));
      return found;
    },
  },
  {
    name: 'stop-key',
    shells: ['mobile'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      const stop = page.locator(`${TERMINAL.pocketKey}[aria-label="${siteText.terminal.program.stop}"]`);
      if ((await stop.count()) !== 0) found.push(problem('stop key', 'nothing running', 'the Stop key shows with nothing running'));
      await startLine(page, ENDLESS_PROGRAM);
      await programStarted(page);
      await stop.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => found.push(problem('stop key', 'a program running', 'the Stop key does not show')));
      if (found.length > 0) return found;
      await stop.tap();
      if (!(await stopEnded(page, found, 'the Stop key'))) return found;
      if ((await framesHeld(page)) !== 0) found.push(problem('stop', 'the Stop key', 'its frame is still there'));
      if ((await stop.count()) !== 0) found.push(problem('stop key', 'after the end', 'the Stop key is still there'));
      await statusIs(page, found, 'the Stop key', 130);
      return found;
    },
  },
  {
    name: 'first-load',
    shells: BOTH,
    options: { serviceWorkers: 'allow' },
    async run(page, shell) {
      const found: Found[] = [];
      const noneAt = async (where: string) => {
        for (const requested of await programRequests(page)) found.push(problem('first load', where, `the page requested ${requested} before a first program`));
      };
      if (!(await waitForWorker(page))) found.push(problem('no-service-worker', 'first load', 'no service worker took control after the first visit'));
      await noneAt('/');
      await openTerminal(page, shell);
      await noneAt("the Terminal's first open");
      await page.goto(new URL('/cv', page.url()).href, { waitUntil: 'load' });
      await noneAt('/cv');
      return found;
    },
  },
  {
    name: 'offline',
    shells: BOTH,
    options: { serviceWorkers: 'allow' },
    async run(page, shell) {
      const found: Found[] = [];
      // One complete online visit, with no program run.
      if (!(await waitForWorker(page))) return [problem('no-service-worker', 'offline', 'no service worker took control after the first visit')];
      await reopenOffline(page, shell);
      await writeFile(page, 'hello.js', "console.log('from the stored copy');\n");
      expectIn(found, 'node hello.js offline', await outputOf(await runLine(page, 'node hello.js')), 'from the stored copy', 'output');
      await statusIs(page, found, 'node hello.js offline', 0);
      await writeFile(page, 'app.ts', "const n: number = 1;\nconsole.log('typed', n);\n");
      const refused = await outputOf(await runLine(page, 'ts-node app.ts'));
      if (!/TypeScript/.test(refused) || !/\d+(\.\d+)? MB/.test(refused)) found.push(problem('no copy', 'ts-node app.ts offline', `expected the words with the size, got ${JSON.stringify(refused.slice(0, 400))}`));
      await statusIs(page, found, 'ts-node app.ts offline', 1);
      if (shell === 'mobile') return found;
      // With a copy, downloaded online, it runs offline too.
      await page.context().setOffline(false);
      expectIn(found, 'ts-node app.ts online', await outputOf(await runLine(page, 'ts-node app.ts')), 'typed 1', 'output');
      await reopenOffline(page, shell);
      await writeFile(page, 'app.ts', "const n: number = 2;\nconsole.log('typed', n);\n");
      expectIn(found, 'ts-node app.ts with a copy offline', await outputOf(await runLine(page, 'ts-node app.ts')), 'typed 2', 'output');
      await statusIs(page, found, 'ts-node app.ts with a copy offline', 0);
      return found;
    },
  },
  {
    name: 'closed',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await startLine(page, ENDLESS_PROGRAM);
      await programStarted(page);
      await page.click('#os .window[data-view="terminal"] .control-close');
      await page.waitForFunction(() => (document.getElementById('terminal-runners')?.childElementCount ?? 0) === 0, null, { timeout: 5_000 }).catch(() => found.push(problem('close', 'the Terminal closed', 'its frame is still there')));
      return found;
    },
  },
];
