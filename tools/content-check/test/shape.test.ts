import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { RULES_FILE, SHAPE_FILE } from '../src/paths.ts';
import { deriveSchema, loadOfficialSchema } from '../src/schema.ts';
import { generateShape } from '../src/shape.ts';
import { REPO_ROOT, STARTING_RULES } from './helpers/cli.ts';

type Json = Record<string, any>;

const FIXTURE = 'tools/content-check/test/__fixtures__/shape';

function generate(rules: Json): string {
  return generateShape({ resume: deriveSchema(loadOfficialSchema().schema).schema, site: deriveSchema(rules).schema });
}

function rulesWith(properties: Json, extra: Json = {}): Json {
  return { ...STARTING_RULES, properties: { ...STARTING_RULES.properties, ...properties }, ...extra };
}

// The property lines of every interface whose name starts with `prefix`.
function propertyLines(text: string, prefix: string): string[] {
  const lines: string[] = [];
  let inside = false;
  for (const line of text.split('\n')) {
    if (line.startsWith('export interface ')) inside = line.startsWith(`export interface ${prefix}`);
    else if (line === '}') inside = false;
    else if (inside && !line.trim().startsWith('/**')) lines.push(line);
  }
  return lines;
}

describe('002-cv-content-FR-026: the content has a shape description generated from its rules', () => {
  test('the committed shape is what the generator writes now', () => {
    const rules = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, RULES_FILE), 'utf8'));
    const committed = fs.readFileSync(path.join(REPO_ROOT, SHAPE_FILE), 'utf8');
    expect(generate(rules), `${SHAPE_FILE} is stale: run npm run content-shape`).toBe(committed);
  });

  test('every CV field is optional and no type accepts other fields', () => {
    const text = fs.readFileSync(path.join(REPO_ROOT, SHAPE_FILE), 'utf8');
    const lines = propertyLines(text, 'Resume');
    expect(lines.length).toBeGreaterThan(50);
    for (const line of lines) expect(line).toMatch(/^ {2}(?:[A-Za-z_][A-Za-z0-9_]*|'[^']+')\?: .+;$/);
    expect(text).not.toContain('[key: string]');
    expect(text).toContain('export interface ResumeBasics {');
    expect(text).toContain('export interface ResumeLocation {');
    expect(text).toContain('export interface ResumeProfile {');
    expect(text).toContain('export interface ResumeWork {');
    expect(text).toContain('export interface ResumeProject {');
  });

  test('site data fields follow the rules, required ones included', () => {
    const rules = rulesWith(
      { featuredProjects: { type: 'array', items: { type: 'string', 'x-cv-reference': 'project' } }, theme: { enum: ['light', 'dark'] } },
      { required: ['theme'] },
    );
    const text = generate(rules);
    expect(propertyLines(text, 'SiteData')).toEqual(["  '$schema'?: string;", '  featuredProjects?: string[];', "  theme: 'light' | 'dark';"]);
  });

  test('rules the generator cannot describe stop it, naming the keyword and where it is', () => {
    expect(() => generate(rulesWith({ contact: { oneOf: [{ type: 'string' }, { type: 'number' }] } }))).toThrow(
      'unsupported keyword "oneOf" at #/properties/contact',
    );
    expect(() => generate(rulesWith({ size: { type: ['string', 'number'] } }))).toThrow('unsupported keyword "type" at #/properties/size');
    expect(() => generate(rulesWith({ anything: { type: 'object' } }))).toThrow('unsupported keyword "type" at #/properties/anything');
  });
});

describe('002-cv-content-FR-027: code that reads the content is checked against its shape', () => {
  test('tsc reports undefined fields and unhandled absence, with file, line and column', { timeout: 60_000 }, () => {
    const result = spawnSync(path.join(REPO_ROOT, 'node_modules/.bin/tsc'), ['-p', FIXTURE, '--noEmit', '--pretty', 'false'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    const errors = result.stdout.split('\n').flatMap((line) => {
      const match = /^(.+)\((\d+),(\d+)\): error TS\d+: (.+)$/.exec(line);
      return match === null ? [] : [{ file: path.basename(match[1]!), line: Number(match[2]), column: Number(match[3]), message: match[4]! }];
    });

    expect(errors.map((error) => error.file).sort()).toEqual(['assumes-end-date.ts', 'assumes-name.ts', 'reads-nickname.ts']);
    for (const error of errors) expect(error.line >= 1 && error.column >= 1, error.file).toBe(true);
    const message = (file: string) => errors.find((error) => error.file === file)!.message;
    expect(message('reads-nickname.ts')).toContain('nickname');
    expect(message('reads-nickname.ts')).toContain('ResumeBasics');
    expect(message('assumes-name.ts')).toContain('name');
    expect(message('assumes-name.ts')).toContain('undefined');
    expect(message('assumes-end-date.ts')).toContain('endDate');
    expect(message('assumes-end-date.ts')).toContain('undefined');
  });
});
