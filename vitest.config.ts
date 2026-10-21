import { defineConfig } from 'vitest/config';
import { TEST_EXCLUDE_GLOBS, TEST_INCLUDE_GLOBS } from './tools/traceability/src/files.ts';

// No `tags` are declared: a tag carrying `skip` or `todo` would skip tests in
// a way the traceability check can't see (research R3).
export default defineConfig({
  test: {
    include: TEST_INCLUDE_GLOBS,
    exclude: TEST_EXCLUDE_GLOBS,
  },
});
