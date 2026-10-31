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

describe('006-terminal-FR-056: jq is jq, in its assignments, builtins, formats, errors and inputs (T379 to T383)', () => {
  const printed = async (line: string) => {
    const result = await runLine(shellFor('every-field'), line);
    return { stdout: result.stdout, stderr: result.stderr, status: result.status };
  };
  test.each([
    [`jq -nc '.a=1'`, '{"a":1}\n'],
    [`jq -nc '.a|=2'`, '{"a":2}\n'],
    [`jq -nc '.a//=3'`, '{"a":3}\n'],
    [`jq -nc '.a+=1'`, '{"a":1}\n'],
    [`jq -nc '{}|.a.b=1'`, '{"a":{"b":1}}\n'],
    [`jq -nc '[]|.[1].a=1'`, '[null,{"a":1}]\n'],
    [`jq -nc '{a:1}|.a|=empty'`, '{}\n'],
    [`jq -nc '{a:1,b:2}|del(.a,.b)'`, '{}\n'],
    [`jq -nc '[1,2,3]|del(.[0,2])'`, '[2]\n'],
    [`jq -nc '[1,2,3]|del(.[1:])'`, '[1]\n'],
    [`jq -nc '[1,2,3]|.[1:]=[9]'`, '[1,9]\n'],
    [`jq -nc '[1,2,3]|.[:1]=[9]'`, '[9,2,3]\n'],
  ])('T379: %s', async (line, stdout) => {
    expect(await printed(line)).toEqual({ stdout, stderr: '', status: 0 });
  });
  test.each([
    [`jq -nc '[3,1,2,1]|unique'`, '[1,2,3]\n'],
    [`jq -nc '[{a:2,b:1},{a:1,b:2},{a:1,b:1}]|sort_by(.a,.b)|map(.b)'`, '[1,2,1]\n'],
    [`jq -nc '"abab"|[match("a";"g").offset]'`, '[0,2]\n'],
    [`jq -nc '"aXbX"|sub("(?<l>[a-z])X";"\\(.l)!")'`, '"a!bX"\n'],
    [`jq -nc '"a, b,c"|split(", *";"g")'`, '["a","b","c"]\n'],
    [`jq -nc '[1]<[2],{a:1}<{a:2},nan<1'`, 'true\ntrue\ntrue\n'],
    [`jq -nc '{a:1}|add'`, '1\n'],
    [`jq -nc '{a:true}|any'`, 'true\n'],
    [`jq -nc '[1,[2]]|walk(if type=="number" then .+1 else . end)'`, '[2,[3]]\n'],
    [`jq -nc 'def h($a;$b):$a+$b;h(1;2)'`, '3\n'],
    [`jq -nc 'label $o|1,break $o,2'`, '1\n'],
    [`jq -nc '1 as $x|{$x}'`, '{"x":1}\n'],
    [`jq -nc '[{a:1}]|INDEX(.a)'`, '{"1":{"a":1}}\n'],
    [`jq -c '[.[]]' <<< '[1,2]'`, '[1,2]\n'],
  ])('T380: %s', async (line, stdout) => {
    expect(await printed(line)).toEqual({ stdout, stderr: '', status: 0 });
  });
  test.each([
    [`jq -nc '[1,"a b",null,true]|@csv'`, '"1,\\"a b\\",,true"\n'],
    [`jq -nc '[1,2]|@html,@uri,@base64'`, '"[1,2]"\n"%5B1%2C2%5D"\n"WzEsMl0="\n'],
    [`jq -nc '[1,"a"]|@sh'`, `"1 'a'"\n`],
    [`jq -nc '[1,"a"]|@text'`, '"[1,\\"a\\"]"\n'],
    [`jq -nc '@html "x\\("<")"'`, '"x&lt;"\n'],
    [`jq -nc '{@base64 "x":5}'`, '{"x":5}\n'],
  ])('T381: %s', async (line, stdout) => {
    expect(await printed(line)).toEqual({ stdout, stderr: '', status: 0 });
  });
  test.each([
    [`jq -n '{}+1'`, 5],
    [`jq -n '"a"-1'`, 5],
    [`jq -n 'true|length'`, 5],
    [`jq -n '$nope'`, 3],
    [`jq -n 'ltrimstr'`, 3],
    [`jq -n 'repeat(.;1)'`, 3],
    [`jq -n '.['`, 3],
  ])('T382: %s fails with its status', async (line, status) => {
    const result = await printed(line);
    expect(result.status).toBe(status);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^jq: /);
  });
  test.each([
    [`jq -nc '[inputs]|length' <<< '1 2 3'`, '3\n', '', 0],
    [`jq -c '[.,input]' <<< '1 2 3 4'`, '[1,2]\n[3,4]\n', '', 0],
    [`jq -n input <<< 1`, '1\n', '', 0],
    [`jq -c input_filename cv.json`, '"cv.json"\n', '', 0],
    [`jq -n '"bye\\n"|halt_error(1)'`, '', 'bye\n', 1],
    [`jq -n '{a:1}|halt_error'`, '', '{"a":1}\n', 5],
    [`jq -n 'halt,1'`, '', '', 0],
    [`jq -n '1|debug("x")'`, '1\n', '["DEBUG:","x"]\n', 0],
    [`jq -nc '$__loc__'`, '{"file":"<top-level>","line":1}\n', '', 0],
    [`jq . <<< 1.0`, '1.0\n', '', 0],
    [`jq . <<< 1.10`, '1.10\n', '', 0],
    [`jq . <<< 100000000000000000000`, '100000000000000000000\n', '', 0],
    [`jq -n 'infinite|tostring'`, '"1.7976931348623157e+308"\n', '', 0],
  ])('T383: %s', async (line, stdout, stderr, status) => {
    expect(await printed(line)).toEqual({ stdout, stderr, status });
  });
  test('it reads text as UTF-8 from a pipe, a file and a here-string', async () => {
    const shell = shellFor('every-field');
    expect((await runLine(shell, `echo '"é😀"' | jq -c 'length,.'`)).stdout).toBe('2\n"é😀"\n');
    await runLine(shell, `echo '"é"' > f`);
    expect((await runLine(shell, 'jq . f')).stdout).toBe('"é"\n');
    expect((await runLine(shell, `jq -R . <<< é`)).stdout).toBe('"é"\n');
  });
  test('a missing file and a folder say so, and what comes before them still runs', async () => {
    const shell = shellFor('every-field');
    expect(await runLine(shell, 'jq . nope')).toMatchObject({ stdout: '', stderr: 'jq: error: Could not open file nope: No such file or directory\n', status: 2 });
    await runLine(shell, 'echo 1 > f');
    const result = await runLine(shell, 'jq . f work');
    expect(result.stdout).toBe('1\n');
    expect(result).toMatchObject({ stderr: 'jq: error: Input error: Is a directory\n', status: 2 });
  });
  test('$ENV has the visitor’s variables and none of the adapter’s', async () => {
    const shell = shellFor('every-field');
    await runLine(shell, 'export A=1');
    expect((await runLine(shell, `jq -n '$ENV.A'`)).stdout).toBe('"1"\n');
    expect((await runLine(shell, `jq -n '[$ENV|keys[]|select(contains("__cv"))]|length'`)).stdout).toBe('0\n');
  });
});
