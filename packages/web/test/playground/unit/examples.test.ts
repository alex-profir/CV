// The examples (research R20, the design's Examples table).
import { describe, expect, test } from 'vitest';
import { examples } from '../../../src/apps/playground/examples/index.ts';

describe("008-typescript-playground-FR-028: the examples are the design's eleven, grouped by topic", () => {
  test('Welcome, then the Types, Running and CV groups, in order, each with how its run ends', () => {
    for (const mac of [true, false]) {
      expect(examples(mac).map((example) => [example.group, example.title, example.runs])).toEqual([
        ['start', 'Welcome', 'to-end'],
        ['types', 'Basic types', 'to-end'],
        ['types', 'Narrowing', 'to-end'],
        ['types', 'Generics', 'to-end'],
        ['running', 'Timers and promises', 'to-end'],
        ['running', 'An interval', 'interval'],
        ['running', 'Catching errors', 'to-end'],
        ['running', 'An endless loop', 'endless'],
        ['cv', 'Projects, newest first', 'to-end'],
        ['cv', 'Skills at a glance', 'to-end'],
        ['cv', 'Find a skill', 'to-end'],
      ]);
    }
  });

  test('each has a title, a description and code; ids are unique', () => {
    const list = examples(true);
    for (const example of list) {
      expect(example.title, example.id).not.toBe('');
      expect(example.description, example.id).toMatch(/\.$/);
      expect(example.code.trim(), example.id).not.toBe('');
    }
    expect(new Set(list.map((example) => example.id)).size).toBe(list.length);
  });

  test('the three CV examples read cv, and no other example but Welcome does', () => {
    const readers = examples(true).filter((example) => /\bcv\./.test(example.code.replace(/\/\/.*$/gm, '')));
    expect(readers.map((example) => example.id)).toEqual(['welcome', 'projects-newest-first', 'skills-at-a-glance', 'find-a-skill']);
    for (const example of readers.filter((entry) => entry.group === 'cv')) expect(example.code).toMatch(/\bcv\.(projects|skills)\b/);
  });
});
