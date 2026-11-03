// Writes the interim local mockup's pages and PNGs, one per state of ../wireframes.md, from the real
// Terminal: it opens the built site from `npm run serve` (PORT, default 4173), runs a real line for its
// markup, and fills in the states this feature adds. The pages it saves have no scripts and read the
// site's own style sheets, copied beside them with their fonts. Run with
// `node specs/009-terminal-node/design/mockup/build.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, devices } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const site = `http://127.0.0.1:${process.env.PORT ?? 4173}`;
const assets = path.join(here, 'assets');
fs.mkdirSync(assets, { recursive: true });

const out = (text, tone) => ({ text, tone });
const dim = (text) => out(text, 'dim');
const err = (text) => out(text, 'error');
const tick = ['tick 1', 'tick 2', 'tick 3'].map((text) => out(text));

// `key`: the sentence that differs by shell. `running`: a program is running, so the phone offers Stop.
const STATES = [
  { name: '1-running', line: 'node tick.js', output: tick, running: true },
  { name: '2-still-running', line: 'node -e "while (true) {}"', output: (stop) => [dim(`Still running. ${stop} stops it.`)], running: true },
  { name: '3-stopped', line: 'node tick.js', output: [...tick, dim('^C')] },
  {
    name: '4-uncaught-error',
    line: 'node bad.js',
    output: [
      err('/home/guest/bad.js:2'),
      err("  throw new Error('no such skill');"),
      err('  ^'),
      err(''),
      err('Error: no such skill'),
      err('    at find (/home/guest/bad.js:2:9)'),
      err('    at /home/guest/bad.js:5:1'),
      err(''),
      err('node v26.0.0 (browser runtime, not Node.js)'),
    ],
  },
  {
    name: '5-type-error',
    line: 'ts-node app.ts',
    output: [err('TSError: Unable to compile TypeScript:'), err("app.ts(1,7): error TS2322: Type 'string' is not assignable to type 'number'.")],
  },
  {
    name: '6-typescript-download',
    line: 'ts-node app.ts',
    output: [dim('Downloading TypeScript, once: 25% of {total} MB'), dim('Downloading TypeScript, once: 50% of {total} MB')],
    running: true,
  },
  { name: '7-typescript-offline', line: 'ts-node app.ts', output: [err('ts-node: TypeScript has to be downloaded once with a connection: {total} MB.')] },
  { name: '8-no-script', line: 'node', output: [out('node: there is no interactive mode here. Run a file: node hello.js')] },
  { name: '9-own-line', line: 'node a.js | cat', output: [err('node: runs only on a line of its own here.')] },
];

const total = () => {
  const root = path.resolve(here, '../../../../packages/web/dist/site/playground');
  const [folder] = fs.readdirSync(root);
  return (JSON.parse(fs.readFileSync(path.join(root, folder, 'files.json'), 'utf8')).total / 1_000_000).toFixed(1);
};
const mb = total();

const browser = await chromium.launch();
const copied = new Set();
async function copyStyles(page) {
  for (const href of await page.$$eval('link[rel="stylesheet"]', (links) => links.map((link) => link.getAttribute('href')))) {
    const name = path.basename(href);
    if (copied.has(name)) continue;
    copied.add(name);
    let css = await (await fetch(site + href)).text();
    for (const [, url] of css.matchAll(/url\(["']?(\/assets\/[^)"']+)["']?\)/g)) {
      const font = path.basename(url);
      if (!fs.existsSync(path.join(assets, font))) fs.writeFileSync(path.join(assets, font), Buffer.from(await (await fetch(site + url)).arrayBuffer()));
    }
    css = css.replace(/url\(["']?\/assets\//g, 'url(./').replace(/\.woff2["']?\)/g, '.woff2)');
    fs.writeFileSync(path.join(assets, name), css);
  }
}

const shells = [
  { shell: 'desktop', stop: 'Ctrl+C', sizes: [[1440, 900, '1440']], context: { viewport: { width: 1440, height: 900 } } },
  { shell: 'phone', stop: 'The Stop key', sizes: [[375, 812, '375'], [320, 568, '320']], context: (({ defaultBrowserType, ...rest }) => ({ ...rest, viewport: { width: 375, height: 812 } }))(devices['iPhone 13']) },
];

const pages = [];
for (const { shell, stop, sizes, context } of shells) {
  const made = await browser.newContext(context);
  const page = await made.newPage();
  await page.goto(`${site}/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /terminal/i }).first().click({ timeout: 5000 }).catch(() => page.getByRole('link', { name: /terminal/i }).first().click());
  await page.waitForSelector('input.command-line');
  await page.fill('input.command-line', 'echo template');
  await page.press('input.command-line', 'Enter');
  await page.waitForSelector('.run .run-output');
  await copyStyles(page);
  for (const state of STATES) {
    const lines = (typeof state.output === 'function' ? state.output(stop) : state.output).map((line) => ({ ...line, text: line.text.replace('{total}', mb) }));
    await page.evaluate(({ state, lines }) => {
      const run = [...document.querySelectorAll('.run')].find((each) => each.querySelector('.run-output') !== null);
      for (const other of document.querySelectorAll('.run')) if (other !== run) other.remove();
      run.querySelector('.run-line').textContent = state.line;
      for (const time of document.querySelectorAll('.terminal .prompt-time')) if (time.lastChild !== null) time.lastChild.textContent = '09:41';
      const output = run.querySelector('.run-output');
      output.replaceChildren(...lines.map(({ text, tone }) => {
        const p = document.createElement('p');
        p.className = 'out-line';
        const span = document.createElement('span');
        span.className = tone === undefined ? 'out-stream' : `out-stream tone-${tone}`;
        span.textContent = text === '' ? ' ' : text;
        p.append(span);
        return p;
      }));
      // While a program runs, Stop takes the place of `clear`, whose line could only wait.
      const key = [...document.querySelectorAll('.pocket-keys .pocket-key')].find((each) => ['clear', 'Stop'].includes(each.textContent));
      if (key !== undefined) {
        key.textContent = state.running === true ? 'Stop' : 'clear';
        key.setAttribute('aria-label', state.running === true ? 'Stop the program' : 'clear');
        key.classList.toggle('pocket-key-stop', state.running === true);
      }
    }, { state: { line: state.line, running: state.running }, lines });
    let html = await page.content();
    html = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<link[^>]+rel="(?:modulepreload|preload|manifest|icon)"[^>]*>/g, '').replace(/(href|src)="\/assets\//g, '$1="assets/');
    html = html.replace('</head>', '<link rel="stylesheet" href="mockup.css"></head>');
    const name = `${shell}-${state.name}`;
    fs.writeFileSync(path.join(here, `${name}.html`), html);
    pages.push({ name, sizes, context });
  }
  await made.close();
}

for (const { name, sizes, context } of pages) {
  for (const [width, height, label] of sizes) {
    const made = await browser.newContext({ ...context, viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await made.newPage();
    await page.goto(pathToFileURL(path.join(here, `${name}.html`)).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(200);
    await page.screenshot({ path: path.join(here, `${name}-${label}.png`) });
    await made.close();
  }
}
await browser.close();
console.log(`Wrote ${pages.length} pages`);
