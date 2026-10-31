import { defineConfig } from 'vitest/config';
import { FAST_TEST_GLOBS, TEST_EXCLUDE_GLOBS, TEST_INCLUDE_GLOBS } from './tools/traceability/src/files.ts';
import { specListPlugin } from './packages/web/scripts/spec-list.ts';

// Every project takes the machine-wide test lock first, so no two runs overlap,
// in this worktree or another (tools/speckit-auto/test-lock.ts).
const TEST_LOCK = 'tools/speckit-auto/test-lock.ts';

// No `tags` are declared: a tag carrying `skip` or `todo` would skip tests in
// a way the traceability check can't see (research R3).
export default defineConfig({
  // The Terminal's spec list, as the site's build serves it (006 research R10).
  plugins: [specListPlugin()],
  // TSX test files use React's automatic JSX runtime, as `tsconfig.json` does
  // for `tsc` (004 research R2).
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'react' },
  },
  // Two projects, and every test file is in exactly one (research R14). The
  // full set, `npm test`, is both; the fast set, `npm run test:fast`, is
  // `fast`, which pull requests run (FR-030). Each project writes out its own
  // include and exclude, so nothing inherited can widen `fast`. Both inherit
  // the plugins and `oxc` options above.
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'fast',
          include: FAST_TEST_GLOBS,
          exclude: TEST_EXCLUDE_GLOBS,
          globalSetup: [TEST_LOCK],
        },
      },
      {
        extends: true,
        test: {
          name: 'slow',
          include: TEST_INCLUDE_GLOBS,
          exclude: [...TEST_EXCLUDE_GLOBS, ...FAST_TEST_GLOBS],
          // Builds the site once per run into a temporary directory, for the
          // page tests (004 research R21). A run of `fast` alone never starts it.
          globalSetup: [TEST_LOCK, 'packages/web/test/helpers/site.ts'],
        },
      },
    ],
  },
});
