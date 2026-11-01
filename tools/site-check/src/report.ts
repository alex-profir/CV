// The site check's shared types and its report (data-model.md Site check,
// contracts/cli.md Report format). Sorting uses 001's `compare`, code-unit
// order, and nothing here depends on the locale.
import { compare } from '../../traceability/src/report.ts';

// The check's parts, in the summary's order (research R11; 005 to 008
// contracts/cli.md Parts). `cv-app`, `terminal`, `inspector` and `playground`
// run only when the site root is a page.
export const PARTS = [
  'content',
  'cv-app',
  'terminal',
  'inspector',
  'playground',
  'accessibility',
  'lighthouse',
  'no-script',
  'offline',
  'keyboard',
  'other-sites',
  'fonts',
  'layout',
  'print',
  'modes',
] as const;

export type Part = (typeof PARTS)[number];

// One thing that failed. `page` is a URL path, or `-` for the `content`
// part. `variant` is `375px`, `mobile`, `400%-zoom`, `text-spacing`, `A4`,
// `Letter`, `forced-colors`, `reduced-motion` or `-`; on the site root it is
// `<shell>/<state>/<width>px`, such as `desktop/two-windows/1440px`, except
// for Lighthouse's profiles and the no-script part's plain widths (005
// contracts/cli.md Variants on the root). `type` is a part's own, such as
// `missing-field`, `axe:<rule>`, or, on the root, `focus-target`,
// `shortcut`, `trapped` and `moved`, each rendered like any other. The
// Terminal (006 data-model.md Site check results) adds variants
// `<shell>/terminal/<command>/<width>px`, `<shell>/terminal/files/<width>px`,
// `<shell>/terminal/json/<width>px` and `desktop/terminal-keyboard/1440px`,
// and types `missing-field`, `out-of-order`, `json-mismatch`,
// `missing-file`, `extra-file`, `file-mismatch` and `offline-mismatch`. The
// amendment (2026-10-29) adds the variants `<shell>/terminal/shell/<width>px`
// for the shell's lines and `<shell>/cursor-blink/<width>px` for `modes`,
// and types `line-mismatch`, `not-stopped` and `unresponsive` (`terminal`,
// naming the line), `cursor`, `outline`, `line-key`, `select-all` and
// `cancel` (`keyboard`, naming the step), and `no-blink` (`modes`). The
// amendment of 2026-10-30 adds `not-written` (`keyboard`, naming the step); a
// way out that fails is `trapped`, naming the step. The inspector (007 data-model.md Check results) adds variants
// `<shell>/<view>-specs/<width>px`, `<shell>/elements/<width>px` and
// `desktop/inspector-keyboard/1440px`, and types `missing-requirement`,
// `extra-requirement`, `out-of-order`, `wrong-count`, `text-mismatch`,
// `tests-mismatch`, `link-mismatch`, `uncarried-element`, `state-lost` and
// `focus-target`. The Playground (008 contracts/cli.md Variants) adds variants
// `desktop/playground-<check>/1440px` and `mobile/playground-<check>/375px`,
// `examples/<id>` being a check, and a type per thing it compares.
export type Problem = {
  part: Part;
  page: string;
  variant: string;
  type: string;
  subject: string;
  detail: string;
};

// One part run on one page and variant. `scores` is for `lighthouse` only:
// each category's median, 0 to 100, and the runs it came from.
export type CheckResult = {
  part: Part;
  page: string;
  variant: string;
  status: 'pass' | 'fail' | 'error';
  problems: Problem[];
  scores?: Record<string, { median: number; runs: number[] }>;
};

export type Report = {
  siteDir: string;
  version: string;
  // Each page the check visits, with its status. `notFound` marks the
  // unknown path the check requests to reach the not-found page.
  pages: { path: string; status: number; notFound: boolean }[];
  results: CheckResult[];
  problems: Problem[];
  result: 'pass' | 'fail';
};

// By part in the summary's order, then page, variant, type, subject and
// detail, each in code-unit order.
export function sortProblems(problems: readonly Problem[]): Problem[] {
  return [...problems].sort(
    (a, b) =>
      PARTS.indexOf(a.part) - PARTS.indexOf(b.part) ||
      compare(a.page, b.page) ||
      compare(a.variant, b.variant) ||
      compare(a.type, b.type) ||
      compare(a.subject, b.subject) ||
      compare(a.detail, b.detail),
  );
}

export function renderProblem({ part, page, variant, type, subject, detail }: Problem): string {
  return `${part} ${page} ${variant} ${type} ${subject}: ${detail}`;
}

// The summary's columns: two spaces, the part padded to 16, the status
// padded to 8, then the results. Continuation lines start at the results'
// column.
const PART_WIDTH = 16;

const STATUS_WIDTH = 8;

const INDENT = ' '.repeat(2 + PART_WIDTH + STATUS_WIDTH);

const count = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

// A part's status: `error` if any result crashed, else `fail` if any failed.
function partStatus(results: readonly CheckResult[]): CheckResult['status'] {
  if (results.some((result) => result.status === 'error')) return 'error';
  return results.some((result) => result.status === 'fail') ? 'fail' : 'pass';
}

// Pages in the order their results first appear.
function byPage(results: readonly CheckResult[]): CheckResult[][] {
  const groups = new Map<string, CheckResult[]>();
  for (const result of results) groups.set(result.page, [...(groups.get(result.page) ?? []), result]);
  return [...groups.values()];
}

// The results of one part, as the summary lists them:
// - Lighthouse: one line per page and profile, with every category's median.
// - A passing part: every page and variant on one line.
// - A failing part: one line per page, each variant with its status and,
//   when it failed, its problem count.
// The variant is left out when every result of the part has the same one,
// and the page when it's `-`.
function resultLines(part: Part, results: readonly CheckResult[]): string[] {
  const sameVariant = new Set(results.map((result) => result.variant)).size <= 1;
  const label = (result: CheckResult) => [result.page, sameVariant ? '-' : result.variant].filter((value) => value !== '-').join(' ');
  if (part === 'lighthouse') {
    const labels = results.map((result) => `${result.page} ${result.variant}:`);
    const width = Math.max(0, ...labels.map((text) => text.length));
    return results.map((result, index) => {
      const scores = result.status === 'error' || result.scores === undefined ? result.status : Object.entries(result.scores).map(([category, { median }]) => `${category} ${median}`).join(', ');
      return `${labels[index]!.padEnd(width)} ${scores}`;
    });
  }
  const status = (result: CheckResult) => (result.status === 'fail' ? `fail (${result.problems.length})` : result.status);
  if (partStatus(results) === 'pass') {
    const line = results.map(label).filter((text) => text !== '').join(', ');
    return line === '' ? [] : [line];
  }
  const lines = byPage(results).map((group) => group.map((result) => [label(result), status(result)].filter((text) => text !== '').join(' ')).join(', '));
  return lines.map((line, index) => (index < lines.length - 1 ? `${line},` : line));
}

function pageLine(pages: Report['pages']): string {
  return pages.map(({ path, status, notFound }) => (notFound ? `${path} (${status}, the not-found page)` : `${path} (${status})`)).join(', ');
}

// The report text of contracts/cli.md: the problem lines, sorted, an empty
// line, then the summary. With no problems it starts at the summary. It ends
// with exactly one newline.
export function renderReport(report: Report): string {
  const lines = sortProblems(report.problems).map(renderProblem);
  if (lines.length > 0) lines.push('');
  lines.push(
    `Site check: ${report.result === 'pass' ? 'PASSED' : 'FAILED'}`,
    '',
    `  Site:   ${report.siteDir} (version ${report.version})`,
    `  Pages:  ${pageLine(report.pages)}`,
    '',
  );
  let passed = 0;
  let failing = 0;
  for (const part of PARTS) {
    const results = report.results.filter((result) => result.part === part);
    if (results.length === 0) continue;
    const status = partStatus(results);
    if (status === 'pass') passed += 1;
    if (results.some((result) => result.problems.length > 0)) failing += 1;
    const [first, ...rest] = resultLines(part, results);
    const head = `  ${part.padEnd(PART_WIDTH)}${first === undefined ? status : status.padEnd(STATUS_WIDTH)}`;
    lines.push(first === undefined ? head : `${head}${first}`, ...rest.map((line) => `${INDENT}${line}`));
  }
  const parts = new Set(report.results.map((result) => result.part)).size;
  const problems = report.problems.length === 0 ? 'No problems.' : `${count(report.problems.length, 'problem', 'problems')} in ${count(failing, 'part', 'parts')}.`;
  lines.push('', `  ${problems} ${passed} of ${parts} parts passed.`);
  return `${lines.join('\n')}\n`;
}
