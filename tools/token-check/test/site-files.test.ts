import { describe, expect, test } from 'vitest';
import { runCheck } from '../src/check.ts';
import { SAMPLE_EXPORT, SAMPLE_MOTION, tokenProject } from './helpers/tokens.ts';

const token = (value: unknown, type: string) => ({ $value: value, $type: type, $description: '' });

const INK = '.a {\n  color: #1a1a1a;\n}\n';

// A style sheet written out in each file, as `file line:column subject`.
function literals(files: Record<string, string>, options: { penpot?: object; motion?: object } = {}) {
  const report = runCheck(tokenProject({ ...options, files }));
  return {
    report,
    found: report.problems.map(({ type, subject, location }) => `${location.file} ${location.line}:${location.column} ${type} ${subject}`),
  };
}

describe('003-design-tokens-FR-033: the search covers site source and nothing else', () => {
  test('specs, docs, tests, fixtures, tools, third-party code, dot-directories, generated files, images and fonts are not searched', () => {
    const penpot = structuredClone(SAMPLE_EXPORT) as Record<string, any>;
    penpot.base.color.base.ink = token('#1a1a1a', 'color');
    const motion = structuredClone(SAMPLE_MOTION) as Record<string, any>;
    motion.motion.color = { flash: token('#1a1a1a', 'color') };
    const { report, found } = literals(
      {
        'specs/x/a.css': INK,
        'docs/a.css': INK,
        'packages/web/src/a.test.ts': "export const ink = '#1a1a1a';\n",
        'packages/web/test/a.css': INK,
        'packages/web/__fixtures__/a.css': INK,
        'tools/a.css': INK,
        'node_modules/x/a.css': INK,
        '.cache/a.css': INK,
        'packages/web/src/a.generated.css': INK,
        'packages/web/public/icon.svg': '<svg xmlns="http://www.w3.org/2000/svg"><path fill="#1a1a1a" d="M0 0h24"/></svg>\n',
        'packages/web/public/font.woff2': 'wOF2 #1a1a1a',
      },
      { penpot },
    );
    expect(found).toEqual([]);
    expect(report.filesSearched).toBe(0);
    expect(report.filesWithoutStyles).toBe(0);
    // The motion source is not searched for literals either: its color is
    // reported only as a token in the wrong source.
    expect(literals({}, { motion }).report.problems.map(({ type, subject }) => `${type} ${subject}`)).toEqual(['wrong-source color.flash']);
  });

  test('a new root style sheet, a new app and other files in the token package are searched', () => {
    const { report, found } = literals({ 'site.css': INK, 'apps/notes/a.css': INK, 'packages/tokens/src/extra.css': INK });
    expect(found).toEqual([
      'apps/notes/a.css 2:10 literal-value color',
      'packages/tokens/src/extra.css 2:10 literal-value color',
      'site.css 2:10 literal-value color',
    ]);
    expect(report.filesSearched).toBe(3);
  });

  test('a style format the check cannot read is reported', () => {
    const { report } = literals({ 'packages/web/src/a.scss': '$ink: #1a1a1a;\n' });
    expect(report.problems).toEqual([
      {
        type: 'unreadable-file',
        subject: 'packages/web/src/a.scss',
        location: { file: 'packages/web/src/a.scss', line: 1, column: 1 },
        detail: 'no reader for .scss files; the token check must support this file type before it can be used',
      },
    ]);
    expect(report.filesSearched).toBe(0);
  });

  test('a style sheet that cannot be parsed is reported, and the other files are still searched', () => {
    const { report, found } = literals({ 'packages/web/src/broken.css': '.a {\n  color: var(--token-color-text-primary);\n', 'packages/web/src/b.css': INK });
    expect(found).toEqual(['packages/web/src/b.css 2:10 literal-value color', 'packages/web/src/broken.css 1:1 unreadable-file packages/web/src/broken.css']);
    expect(report.problems.find((problem) => problem.type === 'unreadable-file')?.detail).toBe('cannot be parsed: Unclosed block');
    expect(report.filesSearched).toBe(2);
  });

  test('a file without styles is counted, not searched', () => {
    const { report, found } = literals({ 'packages/web/data.json': '{ "ink": "#1a1a1a" }\n' });
    expect(found).toEqual([]);
    expect(report.filesWithoutStyles).toBe(1);
    expect(report.filesSearched).toBe(0);
  });
});
