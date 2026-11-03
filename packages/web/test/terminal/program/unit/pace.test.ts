// The runtime's pace (009 research R7): nothing held, and the program waits.
import { describe, expect, test } from 'vitest';
import { createPace } from '../../../../src/apps/terminal/program/runtime/pace.ts';

// A clock that moves only as it is read, as a program waiting moves it.
const ticking = (step: number) => {
  let at = 0;
  return () => (at += step);
};

describe('009-terminal-node-FR-024: what goes to the page is paced', () => {
  test('a burst goes at once, then each send waits for the allowance', () => {
    const now = ticking(0.001);
    const pace = createPace(now);
    const from = now();
    for (let at = 0; at < 2_000; at += 1) pace(1);
    const burst = now() - from;
    for (let at = 0; at < 500; at += 1) pace(1);
    // 500 more at 50 a millisecond, less what the burst earned.
    expect(now() - from).toBeGreaterThan(5);
    expect(burst).toBeLessThan(5);
  });

  test('a long text makes what follows it wait, and never waits for ever', () => {
    const now = ticking(0.5);
    const pace = createPace(now);
    pace(1_000_000);
    const from = now();
    pace(1);
    // 800,000 characters under, at 4,000 a millisecond.
    expect(now() - from).toBeGreaterThan(190);
  });
});
