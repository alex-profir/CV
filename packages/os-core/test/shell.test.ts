// The shell query (FR-001, research R2).
import { describe, expect, test } from 'vitest';
import { shellQuery } from '../src/index.ts';
import { METRICS } from './helpers.ts';

describe('005-os-shell-FR-001: the desktop shell needs the desktop minimum in both directions', () => {
  test("the design's metrics give 1024 × 640", () => {
    expect(shellQuery(METRICS)).toBe('(min-width: 1024px) and (min-height: 640px)');
  });

  test('the query follows other metrics', () => {
    expect(shellQuery({ ...METRICS, desktopMinWidth: 1200, desktopMinHeight: 700 })).toBe('(min-width: 1200px) and (min-height: 700px)');
  });
});
