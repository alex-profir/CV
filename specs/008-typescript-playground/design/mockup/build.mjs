// Writes the interim local mockup's pages, one static HTML page per state of
// ../wireframes.md. The pages have no scripts: this file only saves writing
// the shell around the Playground thirty times. Run it with
// `node specs/008-typescript-playground/design/mockup/build.mjs`, then
// render the PNGs with render.mjs (see README.md).
//
// The shell's chrome is the site's own markup and style sheets, so the
// Playground sits in the shell as it is today. CV facts in the CV examples'
// logs are read from packages/content/resume.json, as the Playground reads
// them when the site is built (FR-029). The TypeScript version shown is the
// repository's, a stand-in for the one the plan chooses (FR-012).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const resume = JSON.parse(fs.readFileSync(path.join(repo, 'packages/content/resume.json'), 'utf8'));
const tsVersion = JSON.parse(fs.readFileSync(path.join(repo, 'node_modules/typescript/package.json'), 'utf8')).version;
const CV_URL = 'http://127.0.0.1:4173/cv';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---- Glyphs ------------------------------------------------------------

const svg = (cls, view, body) => `<svg class="${cls}" viewBox="${view}" aria-hidden="true" focusable="false">${body}</svg>`;
const G = {
  close: svg('glyph', '0 0 16 16', '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"></path>'),
  min: svg('glyph', '0 0 16 16', '<path d="M4 8h8"></path>'),
  max: svg('glyph glyph-filled', '0 0 16 16', '<path d="M6.5 3h6.5v6.5z M9.5 13H3V6.5z"></path>'),
  sheet: svg('sheet-glyph', '0 0 16 16', '<path d="M4 1.5h5.5L12.5 4.5v10h-8.5z"></path><path d="M6 7.5h4.5M6 10.5h4.5"></path>'),
  arrow: '<svg class="arrow arrow-right" aria-hidden="true" focusable="false" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M1 5h8M5.5 1.5 9 5 5.5 8.5"></path></svg>',
  out: '<svg class="arrow arrow-up-right" aria-hidden="true" focusable="false" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M2 8 8 2M3 2h5v5"></path></svg>',
  run: svg('pg-glyph pg-glyph-filled', '0 0 16 16', '<path d="M5 3.2v9.6L12.8 8z"></path>'),
  stop: svg('pg-glyph pg-glyph-filled', '0 0 16 16', '<rect x="4" y="4" width="8" height="8" rx="1"></rect>'),
  examples: svg('pg-glyph', '0 0 16 16', '<path d="M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5h4z"></path>'),
  options: svg('pg-glyph', '0 0 16 16', '<path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6"></path><circle cx="10" cy="4.5" r="1.5"></circle><circle cx="6" cy="11.5" r="1.5"></circle>'),
  share: svg('pg-glyph', '0 0 16 16', '<path d="M8 10V2.5M5 5.5l3-3 3 3"></path><path d="M3.5 8.5v4.5h9V8.5"></path>'),
  copy: svg('pg-glyph', '0 0 16 16', '<rect x="5.5" y="5.5" width="8" height="8" rx="1.5"></rect><path d="M10.5 3.5v-1h-8v8h1"></path>'),
  chevron: svg('pg-glyph pg-chevron', '0 0 16 16', '<path d="M4.5 6.5 8 10l3.5-3.5"></path>'),
  x: svg('pg-glyph', '0 0 16 16', '<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"></path>'),
  err: svg('pg-mark pg-mark-error', '0 0 12 12', '<circle cx="6" cy="6" r="5"></circle><path d="M4 4l4 4M8 4l-4 4"></path>'),
  warn: svg('pg-mark pg-mark-warn', '0 0 12 12', '<path d="M6 1.2 11 10.5H1z"></path><path d="M6 5v2.5M6 9v.2"></path>'),
  info: svg('pg-mark pg-mark-info', '0 0 12 12', '<circle cx="6" cy="6" r="5"></circle><path d="M6 5.5v3M6 3.6v.2"></path>'),
  ok: svg('pg-mark pg-mark-ok', '0 0 12 12', '<circle cx="6" cy="6" r="5"></circle><path d="M3.8 6.2 5.3 7.7 8.3 4.6"></path>'),
  dot: svg('pg-mark pg-mark-running', '0 0 12 12', '<circle cx="6" cy="6" r="3.5"></circle>'),
  square: svg('pg-mark pg-mark-stopped', '0 0 12 12', '<rect x="2.5" y="2.5" width="7" height="7" rx="1"></rect>'),
  bulb: svg('pg-bulb', '0 0 16 16', '<path d="M5.5 10.5a4 4 0 1 1 5 0v1.5h-5z"></path><path d="M6 14h4"></path>'),
  cloud: svg('pg-big-glyph', '0 0 48 48', '<path d="M14 34h21a8 8 0 0 0 1-15.9A11 11 0 0 0 15 16a9 9 0 0 0-1 18z"></path><path d="M10 10l28 28"></path>'),
  download: svg('pg-big-glyph', '0 0 48 48', '<path d="M24 8v22M15 22l9 9 9-9"></path><path d="M10 36v4h28v-4"></path>'),
  info20: '<svg class="info" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="8"></circle><path d="M10 9v5M10 6v.5"></path></svg>',
  homeChevron: '<svg class="chevron" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M10 3L5 8l5 5"></path></svg>',
};

// The Playground's icon (FR-001): braces around a play mark on an amber to
// rose tile. Original to this site.
const playgroundGlyph = (id) => `<svg class="app-glyph playground-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="pg-icon-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="pg-icon-top"></stop><stop offset="1" class="pg-icon-bottom"></stop></linearGradient></defs><rect class="pg-tile" width="64" height="64" fill="url(#pg-icon-${id})"></rect><path class="pg-brace" d="M22 17c-5 0-5 3-5 7v3c0 3-2 5-4 5 2 0 4 2 4 5v3c0 4 0 7 5 7"></path><path class="pg-brace" d="M42 17c5 0 5 3 5 7v3c0 3 2 5 4 5-2 0-4 2-4 5v3c0 4 0 7-5 7"></path><path class="pg-play" d="M27 23.5v17L40.5 32z"></path></svg>`;
const cvGlyph = (id) => `<svg class="app-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><linearGradient id="cv-icon-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="icon-top"></stop><stop offset="1" class="icon-bottom"></stop></linearGradient></defs><rect class="tile" width="64" height="64" fill="url(#cv-icon-${id})"></rect><path class="line" d="M19 16v32"></path><circle class="ink" cx="19" cy="18" r="4.5"></circle><circle class="ink" cx="19" cy="32" r="4.5"></circle><circle class="ink" cx="19" cy="46" r="4.5"></circle><rect class="ink" x="29" y="15" width="20" height="3"></rect><rect class="faint" x="29" y="20" width="13" height="3"></rect><rect class="ink" x="29" y="29" width="16" height="3"></rect><rect class="faint" x="29" y="34" width="11" height="3"></rect><rect class="ink" x="29" y="43" width="18" height="3"></rect><rect class="faint" x="29" y="48" width="9" height="3"></rect></svg>`;
const terminalGlyph = '<svg class="app-glyph terminal-glyph" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect class="terminal-tile" x="0.5" y="0.5" width="63" height="63"></rect><path class="terminal-mark" d="M18 22l10 10-10 10"></path><path class="terminal-underscore" d="M32 43h14"></path></svg>';

// ---- TypeScript, highlighted --------------------------------------------

const KEYWORDS = new Set(('const let var function return if else for while do break continue new typeof instanceof in of class '
  + 'extends implements interface type enum import export from as async await yield void this super try catch finally throw '
  + 'switch case default declare readonly keyof infer satisfies is abstract private public protected static').split(' '));
const LITERALS = new Set(['true', 'false', 'null', 'undefined']);
const PRIMITIVES = new Set(['string', 'number', 'boolean', 'unknown', 'any', 'never', 'object', 'bigint', 'symbol']);
const TOKEN = /(\/\/.*$)|(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|(\s+)|(.)/g;

function tokenize(line) {
  const out = [];
  for (const m of line.matchAll(TOKEN)) {
    const [text] = m;
    let cls = '';
    if (m[1]) cls = 'c';
    else if (m[2]) cls = 's';
    else if (m[3]) cls = 'n';
    else if (m[4]) {
      const before = line.slice(0, m.index).trimEnd();
      const after = line.slice(m.index + text.length).trimStart();
      if (LITERALS.has(text)) cls = 'n';
      else if (KEYWORDS.has(text)) cls = 'k';
      else if (PRIMITIVES.has(text) || /^[A-Z]/.test(text)) cls = 't';
      else if (before.endsWith('.')) cls = after.startsWith('(') ? 'f' : 'p';
      else if (after.startsWith('(') || after.startsWith('= (') || /^=\s*(async\s*)?\(/.test(after)) cls = 'f';
    } else if (m[6]) cls = 'o';
    out.push({ text, cls, start: m.index });
  }
  return out;
}

// One line of code, with decorations: [{ from, to, cls }] in 1-based
// columns, `to` exclusive.
function lineHtml(line, decos = []) {
  const cuts = new Set([0, line.length]);
  for (const d of decos) { cuts.add(d.from - 1); cuts.add(d.to - 1); }
  const parts = [];
  for (const tok of tokenize(line)) {
    const inner = [...cuts].filter((c) => c > tok.start && c < tok.start + tok.text.length).sort((a, b) => a - b);
    let at = tok.start;
    for (const c of [...inner, tok.start + tok.text.length]) {
      parts.push({ text: line.slice(at, c), cls: tok.cls, start: at });
      at = c;
    }
  }
  return parts.map((p) => {
    const extra = decos.filter((d) => p.start >= d.from - 1 && p.start < d.to - 1).map((d) => d.cls);
    const cls = [p.cls, ...extra].filter(Boolean).join(' ');
    return cls ? `<span class="${cls}">${esc(p.text)}</span>` : esc(p.text);
  }).join('');
}

// The editor: rows of a line number and its code. Options:
//   decos: { [line]: [{ from, to, cls }] }, cursor: [line, col],
//   zones: { [line]: html } inserted after that line,
//   overlays: html placed over the code, inline: { [line]: html } after the code.
function editor(code, o = {}) {
  const lines = code.replace(/\n$/, '').split('\n');
  const [curLine, curCol] = o.cursor ?? [0, 0];
  const rows = lines.map((text, i) => {
    const n = i + 1;
    const decos = o.decos?.[n] ?? [];
    const caret = n === curLine && !o.hideCaret ? `<span class="pg-caret" style="--col:${curCol - 1}"></span>` : '';
    const bulb = o.bulb === n ? `<span class="pg-bulb-spot" title="Quick fixes">${G.bulb}</span>` : '';
    const inline = o.inline?.[n] ?? '';
    const row = `<div class="pg-row${n === curLine ? ' is-current' : ''}"><span class="pg-ln">${bulb}${n}</span><span class="pg-code">${lineHtml(text, decos)}${caret}${inline}</span></div>`;
    return row + (o.zones?.[n] ?? '');
  }).join('');
  return `<div class="pg-editor${o.focused === false ? '' : ' is-focused'}" role="textbox" aria-multiline="true" aria-label="Code editor"><div class="pg-lines">${rows}</div>${o.overlays ?? ''}</div>`;
}

const codeBlock = (code) => `<pre class="pg-readonly">${code.replace(/\n$/, '').split('\n').map((l) => lineHtml(l)).join('\n')}</pre>`;
const at = (line, col, cls, html, extra = '') => `<div class="${cls}" style="--line:${line};--col:${col - 1};${extra}">${html}</div>`;

// ---- The code the states show -------------------------------------------

const JOBS = `type Level = "junior" | "mid" | "senior";

interface Job {
  title: string;
  level: Level;
  years: number;
}

function describe(job: Job): string {
  return \`\${job.title} (\${job.level}), \${job.years} years\`;
}

const job: Job = { title: "Engineer", level: "senior", years: 8 };
const n: number = "one";

console.log(describe(job));
`;
const JOBS_JS = `"use strict";
function describe(job) {
    return \`\${job.title} (\${job.level}), \${job.years} years\`;
}
const job = { title: "Engineer", level: "senior", years: 8 };
const n = "one";
console.log(describe(job));
`;
const JOBS_DTS = `type Level = "junior" | "mid" | "senior";
interface Job {
    title: string;
    level: Level;
    years: number;
}
declare function describe(job: Job): string;
declare const job: Job;
declare const n: number;
`;
const WELCOME = `// Welcome to the Playground, a TypeScript editor that runs
// in your browser. Errors show as you type, and pointing
// at a name shows its type. Run the code with Run or
// Cmd+Enter: what it logs shows in Logs.

type Greeting = { name: string; times: number };

function greet({ name, times }: Greeting): string {
  return \`Hello, \${name}! \`.repeat(times).trim();
}

console.log(greet({ name: "TypeScript", times: 2 }));

// The CV is here too, as typed data. Try typing cv.
console.log(cv.basics?.label);
`;
const WELCOME_JS = `"use strict";
// Welcome to the Playground, a TypeScript editor that runs
// in your browser. Errors show as you type, and pointing
// at a name shows its type. Run the code with Run or
// Cmd+Enter: what it logs shows in Logs.
function greet({ name, times }) {
    return \`Hello, \${name}! \`.repeat(times).trim();
}
console.log(greet({ name: "TypeScript", times: 2 }));
// The CV is here too, as typed data. Try typing cv.
console.log(cv.basics?.label);
`;
const TIMERS = `// A run stays going while timers are pending, and ends
// when nothing is left to do.
const wait = (ms: number) =>
  new Promise<void>((done) => setTimeout(done, ms));

async function main() {
  console.log("Starting");
  console.info("Waiting 2 seconds");
  await wait(2000);
  console.log("Done waiting");
}

main();
setTimeout(() => console.warn("A late timer, after 5 s"), 5000);
`;
const LOOP = `// This loop never ends. After 5 seconds without a pause,
// the Playground asks whether to stop it. The rest of
// the site keeps working while it runs.
let count = 0;

while (true) {
  count++;
}
`;
const PROJECTS = `// \`cv\` is the CV document this site is built from, typed
// by the CV's own rules. Point at a field to see its type.

const dated = (cv.projects ?? []).flatMap((p) =>
  p.name && p.startDate ? [{ name: p.name, start: p.startDate }] : [],
);

dated.sort((a, b) => b.start.localeCompare(a.start));

for (const { name, start } of dated) {
  console.log(\`\${start.slice(0, 4)}  \${name}\`);
}
`;
const projectLogs = (resume.projects ?? [])
  .filter((p) => p.name && p.startDate)
  .map((p) => ({ name: p.name, start: p.startDate }))
  .sort((a, b) => b.start.localeCompare(a.start))
  .map((p) => `${p.start.slice(0, 4)}  ${p.name}`);

// ---- The Playground window ---------------------------------------------

const PANES = ['JavaScript', 'Declarations', 'Errors', 'Logs'];
function tabs(open, counts) {
  return `<div class="pg-tabs" role="tablist" aria-label="Output">${PANES.map((name) => {
    const count = name === 'Errors' ? counts.errors : name === 'Logs' ? counts.logs : null;
    const badge = count === null ? '' : `<span class="pg-count${name === 'Errors' && count > 0 ? ' is-error' : ''}">${count}</span>`;
    return `<button type="button" role="tab" class="pg-tab" aria-selected="${name === open}">${name}${badge}</button>`;
  }).join('')}</div>`;
}

const paneCaption = (text) => `<p class="pg-pane-caption">${text}</p>`;
const errorsPane = (errors) => errors.length === 0
  ? `<div class="pg-pane"><p class="pg-empty">${G.ok}No errors. The code checks with the current options.</p></div>`
  : `<div class="pg-pane">${paneCaption(`${errors.length} ${errors.length === 1 ? 'error' : 'errors'} · with the current options`)}<ul class="pg-diagnostics">${errors.map((e) =>
    `<li><button type="button" class="pg-diagnostic">${G.err}<span class="pg-where">${e.line}:${e.col}</span><span class="pg-message">${esc(e.message)}</span><span class="pg-code-number">TS${e.code}</span></button></li>`).join('')}</ul></div>`;

const LEVEL = {
  log: { label: 'log', mark: '' }, info: { label: 'info', mark: G.info }, warn: { label: 'warn', mark: G.warn },
  error: { label: 'error', mark: G.err }, debug: { label: 'debug', mark: '' }, alert: { label: 'alert', mark: G.info },
  note: { label: 'note', mark: '' },
};
function logsPane(entries, caption) {
  return `<div class="pg-pane pg-logs">${caption ? paneCaption(caption) : ''}<ol class="pg-log-list">${entries.map((e) =>
    `<li class="pg-log" data-level="${e.level}"><span class="pg-level">${LEVEL[e.level].mark}${LEVEL[e.level].label}</span><span class="pg-value">${e.html ?? esc(e.text)}</span>${e.where ? `<button type="button" class="pg-log-where">line ${e.where}</button>` : ''}</li>`).join('')}</ol></div>`;
}
const codePane = (caption, code) => `<div class="pg-pane">${paneCaption(caption)}${codeBlock(code)}</div>`;

const toolbarButton = (cls, glyph, label, o = {}) => `<button type="button" class="pg-button ${cls}"${o.disabled ? ' disabled' : ''}${o.expanded !== undefined ? ` aria-expanded="${o.expanded}"` : ''}>${glyph}<span>${label}</span>${o.after ?? ''}</button>`;

function toolbar(o = {}) {
  const running = o.run?.state === 'running' || o.run?.state === 'blocked';
  return `<div class="pg-toolbar" role="toolbar" aria-label="Playground">${toolbarButton('pg-run', G.run, 'Run')}${toolbarButton('pg-stop', G.stop, 'Stop', { disabled: !running })}<span class="pg-divider" aria-hidden="true"></span>${toolbarButton('pg-tool', G.examples, 'Examples', { expanded: o.open === 'examples', after: G.chevron })}${toolbarButton('pg-tool', G.options, 'Options', { expanded: o.open === 'options' })}${toolbarButton('pg-tool', G.share, 'Share')}<span class="pg-run-state" role="status">${runState(o.run)}</span></div>`;
}
function runState(run) {
  if (!run) return '';
  if (run.state === 'running') return `<span class="pg-state is-running">${G.dot}Running · ${run.timers} ${run.timers === 1 ? 'timer' : 'timers'} left · ${run.time}</span>`;
  if (run.state === 'blocked') return `<span class="pg-state is-running">${G.dot}Running · ${run.time} without a pause</span>`;
  if (run.state === 'finished') return `<span class="pg-state is-finished">${G.ok}Finished in ${run.time}</span>`;
  if (run.state === 'stopped') return `<span class="pg-state is-stopped">${G.square}Stopped after ${run.time}</span>`;
  return '';
}

function statusBar(o = {}) {
  const check = o.checking ? '<span class="pg-check">Checking…</span>'
    : o.errors ? `<span class="pg-check is-error">${G.err}${o.errors} ${o.errors === 1 ? 'error' : 'errors'}</span>`
      : `<span class="pg-check">${G.ok}No errors</span>`;
  const [line, col] = o.cursor ?? [1, 1];
  return `<div class="pg-status"><span>Ln ${line}, Col ${col}</span><span>Spaces: 2</span>${check}<span class="pg-status-gap"></span>${o.tabFocus ? '<span class="pg-chip">Tab moves focus</span>' : ''}${o.note ? `<span>${o.note}</span>` : ''}<span class="pg-version">TypeScript ${tsVersion}</span></div>`;
}

const banner = (kind, html, actions = '') => `<div class="pg-banner" data-kind="${kind}" role="status">${kind === 'error' ? G.err : kind === 'warn' ? G.warn : kind === 'ok' ? G.ok : G.info}<p>${html}</p><span class="pg-banner-actions">${actions}<button type="button" class="pg-icon-button" aria-label="Dismiss">${G.x}</button></span></div>`;
const textButton = (label, cls = '') => `<button type="button" class="pg-text-button ${cls}">${label}</button>`;

function playground(o) {
  if (o.loading) return `<div class="playground is-loading">${o.loading}</div>`;
  const side = o.side ?? `${tabs(o.pane ?? 'JavaScript', o.counts ?? { errors: 0, logs: 0 })}${o.paneHtml ?? ''}`;
  return `<div class="playground${o.narrow ? ' is-narrow' : ''}">${toolbar(o)}${o.banner ?? ''}<div class="pg-main">${o.editorHtml}<div class="pg-side">${side}</div></div>${statusBar(o.status)}${o.popover ?? ''}${o.dialog ? `<div class="pg-scrim">${o.dialog}</div>` : ''}</div>`;
}

// ---- The shell ----------------------------------------------------------

function titleBar(title, view, o = {}) {
  const specs = o.noSpecs ? '' : `<button type="button" class="show-specs" aria-label="Show specs for ${view}">${G.sheet}Show specs</button>`;
  return `<div class="title-bar"><div class="window-title" tabindex="-1"><span>${title}</span></div><div class="controls"><button type="button" class="control control-close" aria-label="Close ${view}">${G.close}</button><button type="button" class="control control-minimize" aria-label="Minimize ${view}">${G.min}</button><button type="button" class="control control-maximize" aria-label="Maximize ${view}">${G.max}</button></div>${specs}</div>`;
}
const grip = '<div class="resize-handles" aria-hidden="true"><div class="resize-handle resize-se" data-edge="se"><svg class="grip" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="M11 4l-7 7M11 8l-3 3"></path></svg></div></div>';

function cvWindow(o = {}) {
  const g = o.geometry ?? { left: 220, top: 24, width: 1000, height: 716 };
  return `<section class="window" aria-roledescription="window" aria-label="CV"${o.focused ? ' aria-current="true"' : ''} data-view="cv" style="left:${g.left}px;top:${g.top}px;width:${g.width}px;height:${g.height}px;z-index:1">${titleBar('CV', 'CV')}<div class="window-content"><div class="cv-app"><div class="app-bar"><a href="/cv" class="standalone">Open as a page to print or share${G.arrow}</a></div><iframe class="pg-cv-frame" src="${CV_URL}" title="CV" tabindex="-1"></iframe></div></div>${grip}</section>`;
}

const PG_GEOMETRY = { left: 360, top: 88, width: 1040, height: 648 };
function playgroundWindow(content, o = {}) {
  const g = o.geometry ?? PG_GEOMETRY;
  return `<section class="window" aria-roledescription="window" aria-label="Playground" aria-current="true" data-view="playground" style="left:${g.left}px;top:${g.top}px;width:${g.width}px;height:${g.height}px;z-index:2">${titleBar(o.title ?? 'Playground', 'Playground', { noSpecs: o.noSpecs })}<div class="window-content">${content}</div>${grip}</section>`;
}

function menuBar(app, menu) {
  return `<div class="menu-bar" role="menubar" aria-label="Menu bar"><div class="menu-slot" role="none"><button class="menu-title" aria-label="Site menu" type="button" role="menuitem" aria-haspopup="menu" aria-expanded="false"><svg class="site-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><rect class="shadow" x="4" y="4" width="11" height="11"></rect><rect class="face" x="1" y="1" width="11" height="11"></rect></svg></button></div><div class="menu-slot" role="none"><button class="menu-title is-app${menu ? ' is-open' : ''}" type="button" role="menuitem" aria-haspopup="menu" aria-expanded="${!!menu}">${app}</button>${menu ?? ''}</div><div class="menu-slot" role="none"><button class="menu-title" type="button" role="menuitem" aria-haspopup="menu" aria-expanded="false">Window</button></div></div>`;
}

const menuItem = (label, keys = '', o = {}) => `<button type="button" class="menu-item${o.active ? ' is-active' : ''}" role="menuitem"${o.disabled ? ' aria-disabled="true"' : ''}><span class="mark"></span><span class="label">${label}</span><span class="keys">${keys}</span></button>`;
const SEP = '<div class="menu-separator" role="separator"></div>';
const playgroundMenu = `<div class="menu" role="menu">${menuItem('Run', 'Cmd+Enter', { active: true })}${menuItem('Stop', '', { disabled: true })}${SEP}${menuItem('Examples…')}${menuItem('Compiler options…')}${menuItem('Share…')}${SEP}${menuItem('Command palette', 'F1')}${menuItem('Keys…')}${SEP}${menuItem('Reset…')}${SEP}${menuItem('Show specs')}${SEP}${menuItem('Move…', 'Option+Shift+P')}${menuItem('Resize…', 'Option+Shift+S')}${SEP}${menuItem('Minimize')}${menuItem('Maximize')}${SEP}${menuItem('Close', 'Option+Shift+W')}</div>`;

function dock(o = {}) {
  const item = (app, name, glyph, open) => `<button type="button" class="dock-item${open ? ' is-open' : ''}" data-app="${app}" aria-label="${name}${open ? ', open' : ''}"><span class="dock-icon">${glyph}</span><span class="dock-name">${name}</span>${open ? '<span class="open-mark" aria-hidden="true"></span>' : ''}</button>`;
  return `<div class="dock" role="toolbar" aria-label="Dock">${item('cv', 'CV', cvGlyph('d'), o.cv ?? true)}${item('terminal', 'Terminal', terminalGlyph, false)}${item('playground', 'Playground', playgroundGlyph('d'), o.playground ?? true)}</div>`;
}

const STYLES = ['fonts.css', '../../../../packages/tokens/src/tokens.generated.css', 'proposed-tokens.css',
  '../../../../packages/web/src/styles/cv.css', '../../../../packages/web/src/styles/base.css',
  '../../../../packages/web/src/os/shell.css', '../../../../packages/web/src/shells/desktop/desktop.css',
  '../../../../packages/web/src/shells/mobile/mobile.css', '../../../../packages/web/src/apps/terminal/terminal.css',
  '../../../../packages/web/src/inspector/inspector.css', 'playground.css'];

function page(shell, title, body) {
  return `<!doctype html>
<html lang="en" data-shell="${shell}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} – 008 Playground mockup</title>
${STYLES.map((href) => `<link rel="stylesheet" href="${href}">`).join('\n')}
</head>
<body>
<div id="os">${body}</div>
</body>
</html>
`;
}

function desktop(o) {
  const windows = [o.cv === false ? '' : cvWindow(o.cvOptions), o.playground ?? ''].join('');
  return `<div class="desktop">${menuBar(o.app ?? 'Playground', o.menu)}<main class="desktop-area" aria-label="Desktop">${windows}</main>${dock(o.dock)}</div>`;
}

// ---- States -------------------------------------------------------------

const ERR_LINE = 14;
const jobsError = { line: ERR_LINE, col: 7, code: 2322, message: "Type 'string' is not assignable to type 'number'." };
const errDeco = { [ERR_LINE]: [{ from: 7, to: 8, cls: 'is-error-mark' }] };
const jsPane = (code = JOBS_JS) => codePane('What TypeScript compiles the code to · ES2022 · read only', code);

const loadingPanel = ({ glyph, heading, body, progress, actions = '' }) => `<div class="pg-loading" role="group" aria-label="${heading}">${glyph}<h2>${heading}</h2>${progress ?? ''}${body}${actions}</div>`;

const states = [];
const add = (file, title, body, shell = 'desktop') => states.push({ file, html: page(shell, title, body) });

add('desktop-01-downloading', 'Downloading TypeScript', desktop({
  playground: playgroundWindow(playground({
    loading: loadingPanel({
      glyph: G.download, heading: 'Downloading TypeScript',
      progress: '<div class="pg-progress" role="progressbar" aria-label="TypeScript download" aria-valuemin="0" aria-valuemax="6.3" aria-valuenow="2.4" aria-valuetext="2.4 MB of 6.3 MB"><span style="--done:0.38"></span></div><p class="pg-progress-text">2.4 MB of 6.3 MB</p>',
      body: '<p>The Playground downloads TypeScript the first time it opens. After that it opens at once, offline too.</p>',
    }),
  }), { noSpecs: false }),
}));

add('desktop-02-offline', 'Offline first open', desktop({
  playground: playgroundWindow(playground({
    loading: loadingPanel({
      glyph: G.cloud, heading: 'TypeScript needs one download',
      body: '<p>The Playground runs TypeScript in your browser, and downloads it once, with a connection: 6.3 MB. You\'re offline, so the download starts by itself when you\'re back online.</p>',
      actions: `<button type="button" class="pg-button pg-primary">Retry</button>`,
    }),
  })),
}));

add('desktop-03-ready', 'Ready, the starting example', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(WELCOME, { cursor: [1, 1] }),
    pane: 'JavaScript', counts: { errors: 0, logs: 0 },
    paneHtml: jsPane(WELCOME_JS),
    status: { cursor: [1, 1] },
  })),
}));

const errorInline = { [ERR_LINE]: `<span class="pg-inline-error">${G.err}${esc(jobsError.message)}</span>` };
add('desktop-04-errors', 'Errors', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS, { cursor: [ERR_LINE, 25], decos: errDeco, inline: errorInline }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]),
    status: { cursor: [ERR_LINE, 25], errors: 1 },
  })),
}));

const hoverCard = (sig, doc) => `<div class="pg-card" role="tooltip"><pre class="pg-sig">${lineHtml(sig)}</pre>${doc ? `<p>${doc}</p>` : ''}</div>`;
add('desktop-05-hover', 'A type on hover, the Declarations pane', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS, {
      cursor: [16, 14], decos: { ...errDeco, 16: [{ from: 13, to: 21, cls: 'is-hovered' }] },
      overlays: at(16, 13, 'pg-float pg-above', hoverCard('function describe(job: Job): string', 'Says what a job is, in one line.')) + '<span class="pg-pointer" style="--line:16;--col:16"></span>',
    }),
    pane: 'Declarations', counts: { errors: 1, logs: 0 },
    paneHtml: codePane('The type declarations of the code · read only', JOBS_DTS),
    status: { cursor: [16, 14], errors: 1 },
  })),
}));

const JOBS_TYPING = JOBS.replace('console.log(describe(job));', 'console.log(job.le);');
const suggest = `<div class="pg-suggest" role="listbox" aria-label="Suggestions">${[
  ['level', 'Level', true], ['title', 'string'], ['years', 'number'],
].map(([name, type, sel]) => `<div class="pg-suggestion${sel ? ' is-selected' : ''}" role="option" aria-selected="${!!sel}"><span class="pg-kind" aria-hidden="true">P</span><span class="pg-name"><b>${name.slice(0, 2)}</b>${name.slice(2)}</span><span class="pg-type">${type}</span></div>`).join('')}<div class="pg-suggest-detail"><pre class="pg-sig">${lineHtml('(property) Job.level: Level')}</pre></div></div>`;
add('desktop-06-suggestions', 'Suggestions open', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS_TYPING, { cursor: [16, 19], decos: errDeco, overlays: at(16, 17, 'pg-float pg-below', suggest) }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]),
    status: { cursor: [16, 19], checking: true },
  })),
}));

const PEEK_LINES = JOBS.split('\n').slice(2, 7).join('\n');
const peek = `<div class="pg-peek" role="region" aria-label="Definition of Job"><div class="pg-peek-head"><span>Definition of <code>Job</code></span><span class="pg-peek-where">line 3</span><span class="pg-peek-keys">Escape closes · Enter goes there</span><button type="button" class="pg-icon-button" aria-label="Close">${G.x}</button></div><div class="pg-peek-body">${PEEK_LINES.split('\n').map((l, i) => `<div class="pg-row${i === 0 ? ' is-target' : ''}"><span class="pg-ln">${i + 3}</span><span class="pg-code">${lineHtml(l, i === 0 ? [{ from: 11, to: 14, cls: 'is-occurrence' }] : [])}</span></div>`).join('')}</div></div>`;
add('desktop-07-peek', 'A definition shown in place', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS, { cursor: [9, 24], decos: { ...errDeco, 9: [{ from: 23, to: 26, cls: 'is-occurrence' }] }, zones: { 9: peek } }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]),
    status: { cursor: [9, 24], errors: 1 },
  })),
}));

// The uses of a name on the given lines, as occurrence decorations.
const usesOf = (code, name, lines) => Object.fromEntries(lines.map((n) => [n,
  [...code.split('\n')[n - 1].matchAll(new RegExp(`\\b${name}\\b`, 'g'))].map((m) => ({ from: m.index + 1, to: m.index + 1 + name.length, cls: 'is-occurrence' }))]));
add('desktop-08-rename', 'A rename', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS, {
      cursor: [9, 21], hideCaret: true,
      decos: { ...errDeco, ...usesOf(JOBS, 'job', [9, 10]) },
      overlays: at(9, 19, 'pg-float pg-rename-spot', `<div class="pg-rename"><label class="visually-hidden" for="rename">New name</label><input id="rename" class="pg-rename-input" value="role" size="8"><p>Enter renames 4 uses · Escape cancels</p></div>`),
    }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]),
    status: { cursor: [9, 21], errors: 1 },
  })),
}));

const JOBS_MISSING = JOBS.replace('const job: Job = { title: "Engineer", level: "senior", years: 8 };', 'const job: Job = { title: "Engineer", level: "senior" };').replace('const n: number = "one";\n', '');
const missing = { line: 13, col: 7, code: 2741, message: "Property 'years' is missing in type '{ title: string; level: \"senior\"; }' but required in type 'Job'." };
const fixMenu = `<div class="pg-fixes" role="menu" aria-label="Quick fixes"><p class="pg-fixes-head">Quick fixes</p>${[
  ['Add missing properties', true], ["Add missing property 'years'"], ['Add all missing properties in the code'],
].map(([label, sel]) => `<div class="pg-fix${sel ? ' is-selected' : ''}" role="menuitem">${G.bulb}<span>${label}</span></div>`).join('')}<p class="pg-fixes-foot">Enter applies · Cmd+. opens this list</p></div>`;
add('desktop-09-quick-fixes', 'Quick fixes', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS_MISSING, { cursor: [13, 7], bulb: 13, decos: { 13: [{ from: 7, to: 10, cls: 'is-error-mark' }] }, overlays: at(13, 7, 'pg-float pg-below', fixMenu) }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([missing]),
    status: { cursor: [13, 7], errors: 1 },
  })),
}));

const paletteItems = [
  ['Format Document', 'Shift+Option+F', true], ['Format Selection', 'Cmd+K Cmd+F'], ['Go to Definition', 'F12'],
  ['Peek Definition', 'Option+F12'], ['Go to References', 'Shift+F12'], ['Rename Symbol', 'F2'], ['Quick Fix…', 'Cmd+.'],
  ['Go to Symbol…', 'Shift+Cmd+O'], ['Toggle Tab Key Moves Focus', 'Ctrl+Shift+M'],
];
const palette = `<div class="pg-palette" role="dialog" aria-label="Command palette"><div class="pg-palette-field"><span class="pg-palette-prompt" aria-hidden="true">&gt;</span><input class="pg-palette-input" value="fo" aria-label="Command"><span class="pg-palette-caret"></span></div><div class="pg-palette-list" role="listbox">${paletteItems.map(([label, key, sel]) => `<div class="pg-palette-item${sel ? ' is-selected' : ''}" role="option" aria-selected="${!!sel}"><span>${label.replace(/(Fo)/, '<b>$1</b>')}</span><kbd>${key}</kbd></div>`).join('')}</div></div>`;
add('desktop-10-command-palette', 'The command palette', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS, { cursor: [9, 1], decos: errDeco, overlays: palette }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]),
    status: { cursor: [9, 1], errors: 1 },
  })),
}));

const keyRows = [
  ['Run the code', 'Cmd+Enter', 'Not a VS Code key: the official Playground\'s'],
  ['Suggestions', 'Ctrl+Space, Option+Escape', ''], ['Type and documentation', 'Cmd+K Cmd+I', ''],
  ['Go to definition', 'F12', ''], ['Definition in place', 'Option+F12', ''], ['Every use', 'Shift+F12', ''],
  ['Rename', 'F2', ''], ['Quick fixes', 'Cmd+.', ''], ['Next and previous error', 'F8, Shift+F8', ''],
  ['Format the code', 'Shift+Option+F', ''], ['Comment out lines', 'Cmd+/', ''], ['Command palette', 'F1', 'Differs: Shift+Cmd+P is left to the browser'],
  ['Tab moves focus', 'Ctrl+Shift+M', ''], ['Accessibility help', 'Option+F1', ''],
];
const keysDialog = `<div class="pg-dialog pg-keys" role="dialog" aria-modal="true" aria-labelledby="keys-title"><div class="pg-dialog-head"><h2 id="keys-title">Keys</h2><button type="button" class="pg-icon-button" aria-label="Close">${G.x}</button></div><p>The editor uses VS Code's keys, for a Mac. The menu bar, the dock and the other windows keep their own shortcuts, Option+Shift with a letter, even from inside the editor.</p><div class="pg-key-columns">${[keyRows.slice(0, 7), keyRows.slice(7)].map((rows) => `<table class="pg-key-table"><thead><tr><th scope="col">Command</th><th scope="col">Key</th></tr></thead><tbody>${rows.map(([c, k, d]) => `<tr><td>${c}${d ? `<span class="pg-key-note">${d}</span>` : ''}</td><td><kbd>${k}</kbd></td></tr>`).join('')}</tbody></table>`).join('')}</div><p class="pg-dialog-foot">Every command is in the command palette, F1, with its key.</p></div>`;
add('desktop-11-keys', 'The list of keys', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(JOBS, { cursor: [9, 1], decos: errDeco, focused: false }),
    pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]),
    status: { cursor: [9, 1], errors: 1 }, dialog: keysDialog,
  })),
}));

add('desktop-12-menu', 'The Playground menu', desktop({
  menu: playgroundMenu,
  playground: playgroundWindow(playground({
    editorHtml: editor(WELCOME, { cursor: [1, 1], focused: false }),
    pane: 'JavaScript', counts: { errors: 0, logs: 0 }, paneHtml: jsPane(WELCOME_JS), status: { cursor: [1, 1] },
  })),
}));

const check = (name, desc, on, o = {}) => `<label class="pg-option${o.sub ? ' is-sub' : ''}"><input type="checkbox"${on ? ' checked' : ''}><span class="pg-option-text"><code>${name}</code><span>${desc}</span></span></label>`;
const optionsPanel = `<div class="pg-options" role="region" aria-labelledby="options-title"><div class="pg-options-head"><h2 id="options-title">Compiler options</h2><button type="button" class="pg-text-button">Reset to defaults</button><button type="button" class="pg-icon-button" aria-label="Close compiler options">${G.x}</button></div><div class="pg-options-body">
<fieldset><legend>Language</legend><label class="pg-select-row"><span class="pg-option-text"><code>target</code><span>The JavaScript version the code compiles to.</span></span><span class="pg-select">ES2022${G.chevron}</span></label></fieldset>
<fieldset><legend>Strict checks</legend>${check('strict', 'Turns on every strict check below.', true)}${check('noImplicitAny', 'A value whose type can\'t be worked out is an error.', true, { sub: true })}${check('strictNullChecks', '<code>null</code> and <code>undefined</code> are their own types.', true, { sub: true })}${check('strictFunctionTypes', 'Function parameters are checked exactly.', true, { sub: true })}${check('strictPropertyInitialization', 'Class properties must be set in the constructor.', true, { sub: true })}${check('useUnknownInCatchVariables', 'A caught error is <code>unknown</code>, not <code>any</code>.', true, { sub: true })}</fieldset>
<fieldset><legend>Other checks</legend>${check('noUncheckedIndexedAccess', 'Reading by index may give <code>undefined</code>.', false)}${check('exactOptionalPropertyTypes', 'An optional property can\'t be set to <code>undefined</code>.', false)}${check('noUnusedLocals', 'A name declared and never read is an error.', true)}</fieldset>
</div><p class="pg-options-foot">Changed from the defaults: <code>noUnusedLocals</code>. Shared links carry it.</p></div>`;
add('desktop-13-options', 'Compiler options', desktop({
  playground: playgroundWindow(playground({
    open: 'options',
    editorHtml: editor(JOBS, { cursor: [9, 1], decos: { ...errDeco }, focused: false }),
    side: optionsPanel,
    status: { cursor: [9, 1], errors: 1 },
  })),
}));

const EXAMPLES = [
  ['Start', [['Welcome', 'What the Playground is and how to run code.', true]]],
  ['Types', [['Basic types', 'Strings, numbers, arrays and objects, and the types TypeScript works out.'], ['Narrowing', 'How typeof, in and a check on a field narrow a union.'], ['Generics', 'Functions and types that work for any type and keep it exact.']]],
  ['Running', [['Timers and promises', 'A run that stays going while timers are pending.'], ['An interval', 'A timer that repeats until you press Stop.'], ['Catching errors', 'An error thrown and caught, and how the logs show it.'], ['An endless loop', 'A loop that never ends, and the popup that offers to stop it.']]],
  ['The CV as data', [['Projects, newest first', 'Sorts the CV\'s projects by date and logs them.'], ['Skills at a glance', 'Counts the keywords in each group of the CV\'s skills.'], ['Find a skill', 'Searches the CV\'s skills, narrowing its optional fields.']]],
];
const exampleGroup = ([group, items]) => `<section><h3>${group}</h3><ul>${items.map(([t, d, sel]) => `<li><button type="button" class="pg-example${sel ? ' is-current' : ''}"><span class="pg-example-title">${t}</span><span class="pg-example-desc">${d}</span></button></li>`).join('')}</ul></section>`;
const examples = `<div class="pg-examples" role="dialog" aria-label="Examples"><div class="pg-examples-list"><div class="pg-examples-col">${EXAMPLES.slice(0, 2).map(exampleGroup).join('')}</div><div class="pg-examples-col">${EXAMPLES.slice(2).map(exampleGroup).join('')}</div></div><p class="pg-examples-foot">An example replaces your code. Undo brings it back.</p></div>`;
add('desktop-14-examples', 'The examples', desktop({
  playground: playgroundWindow(playground({
    open: 'examples', popover: examples,
    editorHtml: editor(WELCOME, { cursor: [1, 1], focused: false }),
    pane: 'JavaScript', counts: { errors: 0, logs: 0 }, paneHtml: jsPane(WELCOME_JS), status: { cursor: [1, 1] },
  })),
}));

add('desktop-15-running', 'A run with timers pending', desktop({
  playground: playgroundWindow(playground({
    run: { state: 'running', timers: 1, time: '2.4 s' },
    editorHtml: editor(TIMERS, { cursor: [13, 8], focused: false }),
    pane: 'Logs', counts: { errors: 0, logs: 4 },
    paneHtml: logsPane([
      { level: 'note', text: 'No errors in the code. Running.' }, { level: 'log', text: 'Starting' },
      { level: 'info', text: 'Waiting 2 seconds' }, { level: 'log', text: 'Done waiting' },
    ], 'Waiting on 1 timer'),
    status: { cursor: [13, 8] },
  })),
}));

const cvLogs = [{ level: 'note', text: 'No errors in the code. Running.' }, ...projectLogs.map((text) => ({ level: 'log', text })), { level: 'note', text: `Finished in 0.03 s` }];
add('desktop-16-cv-example', 'A CV example, run', desktop({
  playground: playgroundWindow(playground({
    run: { state: 'finished', time: '0.03 s' },
    banner: banner('info', 'The example <b>Projects, newest first</b> replaced your code.', textButton('Undo')),
    editorHtml: editor(PROJECTS, {
      cursor: [4, 22], decos: { 4: [{ from: 21, to: 29, cls: 'is-hovered' }] }, focused: false,
      overlays: at(4, 21, 'pg-float pg-below', hoverCard('(property) Resume.projects?: ResumeProject[] | undefined', 'Specify career projects. From the CV document\'s rules.')),
    }),
    pane: 'Logs', counts: { errors: 0, logs: cvLogs.length }, paneHtml: logsPane(cvLogs),
    status: { cursor: [4, 22] },
  })),
}));

const stuck = `<div class="pg-dialog pg-stuck" role="alertdialog" aria-modal="false" aria-labelledby="stuck-title" aria-describedby="stuck-text"><h2 id="stuck-title">This code may be stuck in a loop</h2><p id="stuck-text">It has run for 5 seconds without a pause. Stop it, or keep waiting and the Playground asks again in 5 seconds.</p><div class="pg-dialog-actions"><button type="button" class="pg-button pg-danger is-focus">Stop</button><button type="button" class="pg-button pg-secondary">Keep waiting</button></div></div>`;
add('desktop-17-stuck', 'The stuck popup, beside the CV window', desktop({
  playground: playgroundWindow(playground({
    run: { state: 'blocked', time: '5.0 s' },
    editorHtml: editor(LOOP, { cursor: [7, 11], focused: false }),
    pane: 'Logs', counts: { errors: 0, logs: 1 }, paneHtml: logsPane([{ level: 'note', text: 'No errors in the code. Running.' }]),
    status: { cursor: [7, 11] }, dialog: stuck, narrow: false,
  }), { geometry: { left: 600, top: 120, width: 800, height: 600 } }),
}));

const SHARE_STATUS = { cursor: [14, 25], errors: 1 };
const jobsBase = { editorHtml: editor(JOBS, { cursor: [14, 25], decos: errDeco }), pane: 'Errors', counts: { errors: 1, logs: 0 }, paneHtml: errorsPane([jobsError]), status: SHARE_STATUS };
add('desktop-18-shared', 'Share: the link copied', desktop({
  playground: playgroundWindow(playground({
    ...jobsBase,
    banner: banner('ok', '<b>Link copied.</b> It holds this code and the 1 option you changed. Opening it never runs the code.', textButton('Share with…')),
  })),
}));
add('desktop-19-too-long', 'Share: too long for a link', desktop({
  playground: playgroundWindow(playground({
    ...jobsBase,
    banner: banner('warn', '<b>This code is too long to share as a link.</b> Its link would be 11,240 characters, and links stop at 8,000.', textButton('Copy the code')),
  })),
}));
add('desktop-20-broken-link', 'A broken shared link', desktop({
  playground: playgroundWindow(playground({
    editorHtml: editor(WELCOME, { cursor: [1, 1] }), pane: 'JavaScript', counts: { errors: 0, logs: 0 }, paneHtml: jsPane(WELCOME_JS), status: { cursor: [1, 1] },
    banner: banner('error', '<b>The shared code couldn\'t be read.</b> The link may have been cut off or changed, so the Playground opened with the starting example. Nothing ran.'),
  })),
}));
add('desktop-21-shared-opened', 'A shared link opened', desktop({
  playground: playgroundWindow(playground({
    ...jobsBase, editorHtml: editor(JOBS, { cursor: [1, 1], decos: errDeco }), status: { cursor: [1, 1], errors: 1 },
    banner: banner('info', '<b>This code came from a shared link</b> and hasn\'t run. Press Run to run it. It replaced the code you had here.', textButton('Undo') + textButton('Run', 'is-strong')),
  })),
}));

const resetDialog = `<div class="pg-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title" aria-describedby="reset-text"><h2 id="reset-title">Reset the Playground?</h2><p id="reset-text">The starting example and the default options come back, and your code is no longer kept in this browser. Until you edit again, Undo brings your code back.</p><div class="pg-dialog-actions"><button type="button" class="pg-button pg-danger is-focus">Reset</button><button type="button" class="pg-button pg-secondary">Cancel</button></div></div>`;
add('desktop-22-reset', 'Reset, to confirm', desktop({
  playground: playgroundWindow(playground({ ...jobsBase, editorHtml: editor(JOBS, { cursor: [14, 25], decos: errDeco, focused: false }), dialog: resetDialog })),
}));

const req = (id, text, line, tests) => `<li class="requirement"><span class="short-id" aria-hidden="true">${id}</span><div class="requirement-body"><p class="requirement-text">${text}</p><a class="spec-line" href="#">In the spec, line ${line}${G.out}</a><p class="tests-label">Tests, ${tests.length}</p><ul class="tests">${tests.map(([name, place]) => `<li><a class="test-name" href="#">${name}</a> <span class="test-place">${place}</span></li>`).join('')}</ul></div></li>`;
const specView = `<section class="spec-view" aria-label="Playground specs"><div class="spec-bar"><button type="button" class="spec-back">Back to Playground</button><button type="button" class="whats-this" aria-expanded="false"><svg class="question-glyph" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="6.5"></circle><path d="M6.25 6.25a1.75 1.75 0 1 1 2.5 1.6c-.5.25-.75.6-.75 1.15v.5"></path><path d="M8 11.5v.25"></path></svg>What's this?</button></div><div class="spec-page"><h1 class="spec-heading" tabindex="-1">Specs for Playground</h1><p class="spec-lede">Every requirement the Playground app implements, grouped by spec. Each one links to its line in the spec and to the tests that check it.</p><p class="spec-build">[n] requirements · 3 specs · built from <a class="build-commit" href="#">[commit]${G.out}</a></p><section class="spec-group"><h2><span class="spec-number">008</span> <span class="spec-title">The TypeScript Playground</span> <span class="status" data-status="approved">Approved</span></h2><a class="open-spec" href="#">Open the spec${G.out}</a><ul class="requirements">${req('FR-007', 'When the Playground opens on desktop and TypeScript isn\'t stored in the browser, it MUST download it and say in its window that TypeScript is downloading, with how much has arrived out of the total, as text and as a progress indicator.', 602, [['[a test of the download\'s progress]', 'tools/site-check/…'], ['[a test that the editor waits for the download]', 'packages/web/test/…']])}${req('FR-012', 'The Playground MUST show the version of TypeScript it runs, in the place the approved design sets, read from TypeScript itself and never typed by hand.', 621, [['[a test of the version shown]', 'packages/web/test/…']])}</ul></section></div></section>`;
add('desktop-23-spec-view', 'The Playground\'s spec view', desktop({
  playground: playgroundWindow(specView, { title: 'Playground · Specs', noSpecs: true }),
}));

add('desktop-24-narrow', 'A narrow window', desktop({
  playground: playgroundWindow(playground({
    narrow: true, run: { state: 'finished', time: '0.02 s' },
    editorHtml: editor(WELCOME.split('\n').slice(5).join('\n'), { cursor: [3, 10] }),
    pane: 'Logs', counts: { errors: 0, logs: 3 },
    paneHtml: logsPane([{ level: 'note', text: 'No errors in the code. Running.' }, { level: 'log', text: 'Hello, TypeScript! Hello, TypeScript!' }, { level: 'log', text: resume.basics?.label ?? '' }]),
    status: { cursor: [3, 10] },
  }), { geometry: { left: 720, top: 88, width: 600, height: 648 } }),
}));

// ---- Phone --------------------------------------------------------------

function phoneApp(body) {
  return `<div class="mobile"><main class="mobile-main"><section class="full-screen" aria-labelledby="app-title-playground" data-view="playground"><header class="app-header"><button type="button" class="home-button">${G.homeChevron}Home</button><div class="app-title" id="app-title-playground" tabindex="-1">Playground</div><button type="button" class="show-specs" aria-label="Show specs for Playground">${G.sheet}Specs</button></header><div class="view-content">${body}</div></section></main></div>`;
}
const bestOnDesktop = (shared) => `<div class="pg-phone"><div class="pg-phone-card">${playgroundGlyph(shared ? 'p2' : 'p1')}<h1>${shared ? 'This link holds TypeScript code' : 'The Playground is best on a desktop'}</h1><p>${shared
  ? 'Someone shared code from the Playground, a TypeScript editor that runs in the browser. Open the link on a desktop to read, check and run it. Nothing runs here.'
  : 'It\'s a TypeScript editor that checks and runs code in your browser. Writing code needs a keyboard and room for its panes, so it opens on a desktop.'}</p><div class="pg-phone-actions"><button type="button" class="pg-button pg-primary pg-wide">${G.share}<span>Share link</span></button><button type="button" class="pg-button pg-secondary pg-wide">${G.copy}<span>Copy link</span></button></div><p class="pg-phone-note">${shared ? 'Sharing passes on the same link, with its code.' : 'The link opens the Playground on a desktop.'}</p></div></div>`;
const home = `<div class="mobile"><main class="mobile-main"><section class="home" aria-label="Home screen"><p class="site-name">${esc(resume.basics?.name ?? '')}</p><ul class="app-grid"><li><button type="button" class="app-icon" data-view="cv"><span class="app-icon-image">${cvGlyph('h')}</span><span class="app-icon-name">CV</span></button></li><li><button type="button" class="app-icon" data-view="terminal"><span class="app-icon-image">${terminalGlyph}</span><span class="app-icon-name">Terminal</span></button></li><li><button type="button" class="app-icon" data-view="playground"><span class="app-icon-image">${playgroundGlyph('h')}</span><span class="app-icon-name">Playground</span></button></li></ul><div class="home-foot"><button type="button" class="about" data-view="about">${G.info20}About this site</button></div></section></main></div>`;

add('phone-1-home', 'Phone, the home screen', home, 'mobile');
add('phone-2-best-on-desktop', 'Phone, best on desktop', phoneApp(bestOnDesktop(false)), 'mobile');
add('phone-3-shared-link', 'Phone, a shared link', phoneApp(bestOnDesktop(true)), 'mobile');

for (const s of states) fs.writeFileSync(path.join(here, `${s.file}.html`), s.html);
console.log(`Wrote ${states.length} pages`);
