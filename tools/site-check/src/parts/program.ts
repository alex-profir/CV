// The part `program` (009 FR-043, contracts/cli.md Parts): on the real build, in
// a real browser, what a visitor sees of a program. Each check names itself in its
// variant, so a failure says what failed.
import type { BrowserContextOptions, Locator, Page } from 'playwright';
import type { Problem } from '../report.ts';
import { SHELL, TERMINAL, newRun, openTerminal, stateVariant, typeLine } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';
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
export const outputOf = async (run: Locator): Promise<string> => (await run.locator(TERMINAL.output).innerText()).trim();

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

// Types a line and doesn't wait: for a program that keeps running.
async function startLine(page: Page, line: string): Promise<void> {
  const input = page.locator(TERMINAL.commandLine);
  await input.focus();
  await input.fill('');
  await page.keyboard.type(line);
  await page.keyboard.press('Enter');
}

const framesHeld = (page: Page) => page.evaluate(() => document.getElementById('terminal-runners')?.childElementCount ?? 0);

// Until the program's frame is there, so a key reaches a program and not a line.
const programStarted = (page: Page) => page.waitForFunction(() => document.querySelector('#terminal-runners iframe') !== null, null, { timeout: 15_000 });

const busy = (page: Page) => page.evaluate((selector) => document.querySelector(selector) !== null, TERMINAL.busyRun);

// Until the running entry prints `text`.
const printed = (page: Page, text: string) => page.waitForFunction(([selector, wanted]) => document.querySelector(selector!)?.textContent?.includes(wanted!) === true, [TERMINAL.busyRun, text] as const, { timeout: 15_000 });

// Until no line runs, and how long that took.
async function ended(page: Page): Promise<number> {
  const from = Date.now();
  await page.waitForFunction((selector) => document.querySelector(selector) === null, TERMINAL.busyRun, { timeout: 30_000 });
  return Date.now() - from;
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
      await startLine(page, 'node -e "while (true) {}"');
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
      const took = await ended(page);
      if (took > 1000) found.push(problem('stop', 'Ctrl+C', `it took ${took} ms to end the program, over 1 s`));
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
      const took = await ended(page);
      if (took > 1000) found.push(problem('stop', 'second Ctrl+C', `it took ${took} ms to end the program, over 1 s`));
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
      const run = await runLine(page, `node -e "while (true) console.log('y')"`);
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
      const fetched = await outputOf(await runLine(page, `node -e "fetch('https://example.com').catch((e) => console.log(e.message)); try { fetch('https://example.com') } catch (e) { console.log(e.message) }"`));
      expectIn(found, 'fetch', fetched, 'fetch is not defined', 'network');
      expectIn(found, 'names', await outputOf(await runLine(page, `node -e "console.log(typeof document, typeof localStorage, typeof Worker)"`)), 'undefined undefined undefined', 'reach');
      expectIn(found, 'the page', await outputOf(await runLine(page, `node -e "try { document.title } catch (e) { console.log(e.name) }"`)), 'ReferenceError', 'reach');
      if (foreign.size > 0) found.push(problem('network', 'request', `a program reached ${[...foreign.keys()].join(', ')}`));
      return found;
    },
  },
  {
    name: 'closed',
    shells: ['desktop'],
    async run(page, shell) {
      const found: Found[] = [];
      await openTerminal(page, shell);
      await startLine(page, 'node -e "while (true) {}"');
      await programStarted(page);
      await page.click('#os .window[data-view="terminal"] .control-close');
      await page.waitForFunction(() => (document.getElementById('terminal-runners')?.childElementCount ?? 0) === 0, null, { timeout: 5_000 }).catch(() => found.push(problem('close', 'the Terminal closed', 'its frame is still there')));
      return found;
    },
  },
];
