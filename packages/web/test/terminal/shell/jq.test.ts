// `jq` and `cv.json` (006 research R31): jq's filter language over the CV
// document's text, printed as jq 1.7 prints it, and a `json` block where the
// output reaches the screen. Expectations are built from the CV, never
// typed as CV text.
import { describe, expect, test } from 'vitest';
import { resume } from '@cv/content';
import { runLine, shellFor } from './context.ts';

const pretty = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const CV_TEXT = pretty(resume);

describe('006-terminal-FR-055: cat cv.json is the CV document as it is', () => {
  test('cat cv.json prints its text, and cat cv.json | jq the same', async () => {
    const shell = shellFor();
    expect((await runLine(shell, 'cat cv.json')).stdout).toBe(CV_TEXT);
    expect((await runLine(shell, 'cat cv.json | jq')).stdout).toBe(CV_TEXT);
  });
});

describe('006-terminal-FR-056: jq takes jq’s filters', () => {
  test('a path, an iterator, keys and a filter on piped input print what jq prints', async () => {
    const shell = shellFor();
    expect((await runLine(shell, "jq '.work[0].name' cv.json")).stdout).toBe(pretty(resume.work![0]!.name));
    expect((await runLine(shell, "jq '.skills[].name' cv.json")).stdout).toBe(resume.skills!.map((skill) => pretty(skill.name)).join(''));
    expect((await runLine(shell, "jq 'keys' cv.json")).stdout).toBe(pretty(Object.keys(resume).sort()));
    expect((await runLine(shell, 'cat cv.json | jq .basics')).stdout).toBe(pretty(resume.basics));
  });

  test('jq and jq . pretty-print with 2-space indents and the keys in order', async () => {
    const shell = shellFor();
    expect((await runLine(shell, 'jq . cv.json')).stdout).toBe(CV_TEXT);
    expect((await runLine(shell, 'cat cv.json | jq .')).stdout).toBe(CV_TEXT);
    expect((await runLine(shell, `echo '{"b":1,"a":[1,2]}' | jq`)).stdout).toBe('{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}\n');
  });

  test('text that isn’t JSON and a filter that doesn’t parse give jq’s error, with a non-zero status (G12)', async () => {
    const shell = shellFor();
    for (const line of ['cat about | jq', "jq '.[' cv.json"]) {
      const result = await runLine(shell, line);
      expect(result.stderr, line).toMatch(/^jq: /);
      expect(result.status, line).not.toBe(0);
      expect(result.stdout, line).toBe('');
    }
    expect((await runLine(shell, 'cat about | jq')).stderr).toMatch(/^jq: parse error/);
  });

  test('jq . cv.json records a json block; jq . cv.json | head records nothing', async () => {
    const shell = shellFor();
    const shown = await runLine(shell, 'jq . cv.json');
    expect(shown.recorded).toHaveLength(1);
    expect(shown.recorded[0]!.text).toBe(CV_TEXT);
    expect(shown.recorded[0]!.block[0]!.kind).toBe('json');
    expect((await runLine(shell, 'jq . cv.json | head')).recorded).toEqual([]);
  });
});
