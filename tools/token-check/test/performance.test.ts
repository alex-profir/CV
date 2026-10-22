import { describe, expect, test } from 'vitest';
import { REPO_ROOT, runCli } from './helpers/tokens.ts';

describe('performance (SC-006)', () => {
  test('checks the repository in under 10 seconds', { timeout: 60_000 }, () => {
    const start = performance.now();
    const result = runCli(REPO_ROOT);
    const elapsed = performance.now() - start;

    expect(result.status).toBe(0);
    // SC-006 sets the time on the owner's machine. Shared CI runners vary too
    // much for a wall-clock limit to decide a required check, so there only
    // the result is checked, and the timeout still catches a run that hangs.
    if (!process.env.CI) expect(elapsed).toBeLessThan(10_000);
  });
});
