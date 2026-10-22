import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { checkSources, outputFor } from '../src/check.ts';
import { buildOutput } from '../src/output.ts';
import { OUTPUT_TS_FILE } from '../src/paths.ts';
import { REPO_ROOT, makeProject, tokenProject } from './helpers/tokens.ts';

const FIXTURE = path.join(REPO_ROOT, 'tools/token-check/test/__fixtures__/code');

const TWO_THEMES = path.join(REPO_ROOT, 'tools/token-check/test/__fixtures__/two-themes');

const TSC = path.join(REPO_ROOT, 'node_modules/.bin/tsc');

const TIMEOUT = { timeout: 60_000 };

type TscError = { file: string; line: number; column: number; code: string; message: string };

// Parsed tsc errors, by the generated TS text they were compiled against, so
// tsc runs once per output.
const compiled = new Map<string, TscError[]>();

// Compiles the code fixture against the derived output of the sample at
// `outputRoot`, in a temporary project laid out like the workspace, and
// returns tsc's errors with paths relative to that project.
function compileAgainst(outputRoot: string): TscError[] {
  const ts = outputFor(outputRoot)!.ts;
  const cached = compiled.get(ts);
  if (cached !== undefined) return cached;
  const files: Record<string, string> = {};
  for (const name of fs.readdirSync(FIXTURE)) files[name] = fs.readFileSync(path.join(FIXTURE, name), 'utf8');
  for (const name of ['package.json', 'src/index.ts']) {
    files[`packages/tokens/${name}`] = fs.readFileSync(path.join(REPO_ROOT, 'packages/tokens', name), 'utf8');
  }
  files[OUTPUT_TS_FILE] = ts;
  const root = makeProject(files);
  fs.mkdirSync(path.join(root, 'node_modules/@cv'), { recursive: true });
  fs.symlinkSync(path.join(root, 'packages/tokens'), path.join(root, 'node_modules/@cv/tokens'), 'dir');
  const result = spawnSync(process.execPath, [TSC, '-p', '.', '--noEmit', '--pretty', 'false'], { cwd: root, encoding: 'utf8' });
  const errors = [...result.stdout.matchAll(/^(.+?)\((\d+),(\d+)\): error TS(\d+): (.*)$/gm)].map(([, file, line, column, code, message]) => ({
    file: file!,
    line: Number(line),
    column: Number(column),
    code: code!,
    message: message!,
  }));
  if (errors.length === 0 && result.status !== 0) throw new Error(`tsc failed: ${result.stdout}${result.stderr}`);
  compiled.set(ts, errors);
  return errors;
}

const errorsIn = (errors: TscError[], file: string) => errors.filter((error) => error.file === file);

// A copy of the two-themes fixture.
function twoThemes(): string {
  const root = makeProject({});
  fs.cpSync(TWO_THEMES, root, { recursive: true });
  return root;
}

// The one error a misspelled name gives: TS2345 at the string, naming it.
function expectMisspelled(errors: TscError[], file: string, name: string) {
  const found = errorsIn(errors, file);
  expect(found.map(({ line, column, code }) => ({ line, column, code }))).toEqual([{ line: 3, column: 28, code: '2345' }]);
  expect(found[0]!.message).toContain(JSON.stringify(name));
}

describe('003-design-tokens-FR-026: a misspelled token name in code fails the typecheck', () => {
  test('cssVar with a misspelled color is one TS2345 at the name', TIMEOUT, () => {
    expectMisspelled(compileAgainst(tokenProject()), 'misspelled-color.tsx', 'color.text.primray');
  });
});

describe('003-design-tokens-FR-058: code may read any token for any property', () => {
  test('reading tokens, a color token as a padding included, compiles', TIMEOUT, () => {
    expect(errorsIn(compileAgainst(tokenProject()), 'reads-tokens.tsx')).toEqual([]);
  });
});

describe('003-design-tokens-FR-024: the same code works with another theme', () => {
  test('the unchanged fixture compiles against the two-themes output as against one theme', TIMEOUT, () => {
    const errors = compileAgainst(twoThemes());
    expect(errorsIn(errors, 'reads-tokens.tsx')).toEqual([]);
    expectMisspelled(errors, 'misspelled-color.tsx', 'color.text.primray');
  });
});

describe('003-design-tokens-FR-049: code reads motion tokens like any other token', () => {
  test('reading motion tokens compiles', TIMEOUT, () => {
    expect(errorsIn(compileAgainst(tokenProject()), 'reads-motion.tsx')).toEqual([]);
  });

  test('a misspelled motion token is one TS2345 at the name', TIMEOUT, () => {
    expectMisspelled(compileAgainst(tokenProject()), 'misspelled-motion.tsx', 'motion.duration.fsat');
  });

  test('which source a token came from does not change the output', () => {
    const sources = checkSources(tokenProject());
    // The resolved tokens, each marked as coming from `source`.
    const input = (source: string) => ({
      combinations: sources.combinations.map(({ name, tokens }) => ({
        name,
        tokens: new Map(
          [...tokens].map(([token, { type, value, definition }]) => [
            token,
            { type: type!, value, definition: token === 'motion.duration.fast' ? { ...definition, source } : definition },
          ]),
        ),
      })),
      types: sources.types!,
      groups: sources.groups,
      active: sources.active!,
    });
    expect(buildOutput(input('export'))).toEqual(buildOutput(input('motion')));
  });
});
