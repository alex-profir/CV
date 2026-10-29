import { defineConfig } from 'vitest/config';
import { TEST_EXCLUDE_GLOBS, TEST_INCLUDE_GLOBS } from './tools/traceability/src/files.ts';
import { specListPlugin } from './packages/web/scripts/spec-list.ts';

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
  test: {
    include: TEST_INCLUDE_GLOBS,
    exclude: TEST_EXCLUDE_GLOBS,
    // Builds the site once per run into a temporary directory, for the page
    // tests (004 research R21).
    globalSetup: ['packages/web/test/helpers/site.ts'],
  },
});
