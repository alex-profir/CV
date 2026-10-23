// The site check's shared types (data-model.md Site check, contracts/cli.md).
// Rendering the report comes later (T067).

// The check's parts, in the summary's order (research R11).
export const PARTS = [
  'content',
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
// `Letter`, `forced-colors`, `reduced-motion` or `-`.
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
  pages: { path: string; status: number }[];
  results: CheckResult[];
  problems: Problem[];
  result: 'pass' | 'fail';
};
