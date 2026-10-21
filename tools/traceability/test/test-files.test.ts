import { describe, expect, test } from 'vitest';
import config from '../../../vitest.config.ts';
import { runCheck } from '../src/check.ts';
import { coverageOf, readTestFile } from '../src/test-files.ts';
import { makeProject } from './helpers/project.ts';

// The distinct token texts of each coverage bucket, sorted.
function coverage(source: string) {
  const { nodes, problem } = readTestFile('src/a.test.ts', source);
  expect(problem).toBeNull();
  const { counting, skipped, unrecognized } = coverageOf(nodes);
  const texts = (tokens: { text: string }[]) => [...new Set(tokens.map((token) => token.text))].sort();
  return { counting: texts(counting), skipped: texts(skipped), unrecognized: texts(unrecognized) };
}

function counting(source: string): string[] {
  return coverage(source).counting;
}

function approvedSpec(entries: string[]): string {
  return ['# Feature Specification', '', '**Status**: Approved', '', '### Functional Requirements', '', ...entries, ''].join('\n');
}

describe('001-requirement-traceability-FR-010: IDs are found in the names and tags of tests and groups', () => {
  test('test titles, with several IDs counting toward each', () => {
    expect(counting("test('covers 002-example-FR-001', () => {});")).toEqual(['002-example-FR-001']);
    expect(counting("it('002-example-FR-001 and 002-example-FR-002.', () => {});")).toEqual([
      '002-example-FR-001',
      '002-example-FR-002',
    ]);
  });

  test('group titles at any depth cover every nested test', () => {
    const source = `
      describe('002-example-FR-001', () => {
        suite('002-example-FR-002', () => {
          describe('inner', () => {
            test('deep', () => {});
          });
        });
      });
      test.describe('002-example-FR-003', () => {
        test.suite('nested', () => {
          it('deep', () => {});
        });
      });
    `;
    expect(counting(source)).toEqual(['002-example-FR-001', '002-example-FR-002', '002-example-FR-003']);
  });

  test('the literal parts of template-literal titles, skipping substitutions', () => {
    const source = "test(`a ${x} 002-example-FR-001 ${'002-example-FR-009'} 002-example-FR-002`, () => {});";
    expect(counting(source)).toEqual(['002-example-FR-001', '002-example-FR-002']);
  });

  test('titles of each and for calls', () => {
    const source = `
      test.each([1, 2])('002-example-FR-001 %s', (n) => {});
      test.for([[1]])('002-example-FR-002 %s', ([n]) => {});
      describe.each([1])('002-example-FR-003 %s', () => {
        test('inside', () => {});
      });
      it.only.each([1])('002-example-FR-004', () => {});
    `;
    expect(counting(source)).toEqual([
      '002-example-FR-001',
      '002-example-FR-002',
      '002-example-FR-003',
      '002-example-FR-004',
    ]);
  });

  test('literal tags options, as a string or an array', () => {
    const source = `
      test('a', { tags: '002-example-FR-001' }, () => {});
      test('b', { tags: ['002-example-FR-002', \`002-example-FR-003\`] }, () => {});
      describe('c', { tags: ['002-example-FR-004'] }, () => {
        test('inside', () => {});
      });
    `;
    expect(counting(source)).toEqual([
      '002-example-FR-001',
      '002-example-FR-002',
      '002-example-FR-003',
      '002-example-FR-004',
    ]);
  });

  test('modifiers that do not change coverage', () => {
    const source = `
      test.only('002-example-FR-001', () => {});
      test.concurrent('002-example-FR-002', async () => {});
      test.fails('002-example-FR-003', () => {});
      describe.shuffle('002-example-FR-004', () => {
        test('inside', () => {});
      });
      test.runIf(process.env.CI)('002-example-FR-005', () => {});
    `;
    expect(counting(source)).toEqual([
      '002-example-FR-001',
      '002-example-FR-002',
      '002-example-FR-003',
      '002-example-FR-004',
      '002-example-FR-005',
    ]);
  });

  test('a group with no tests covers nothing', () => {
    expect(coverage("describe('002-example-FR-001', () => {});")).toEqual({ counting: [], skipped: [], unrecognized: [] });
  });

  test('a non-literal title contributes nothing', () => {
    expect(counting("const title = '002-example-FR-001';\ntest(title, () => {});")).toEqual([]);
  });

  test('tests in blocks, branches, loops, try and switch are read, with the enclosing group', () => {
    const source = `
      for (const n of [1, 2]) {
        test('002-example-FR-001', () => {});
      }
      if (process.env.X) {
        test('002-example-FR-002', () => {});
      } else {
        await test('002-example-FR-003', async () => {});
      }
      describe('002-example-FR-004', () => {
        for (let i = 0; i < 2; i++) test('loop', () => {});
        for (const key in {}) { test('in', () => {}); }
        while (false) { test('while', () => {}); }
        do { test('do', () => {}); } while (false);
        try { test('try', () => {}); } catch { test('catch', () => {}); } finally { test('finally', () => {}); }
        switch (process.platform) {
          case 'darwin':
            test('002-example-FR-005', () => {});
        }
        {
          describe('002-example-FR-006', () => test('arrow body', () => {}));
        }
      });
    `;
    const { nodes } = readTestFile('src/a.test.ts', source);
    const tests = nodes.filter((node) => node.kind === 'test');
    expect(tests).toHaveLength(12);
    expect(tests.slice(3).every((node) => node.parent !== null)).toBe(true);
    expect(counting(source)).toEqual([
      '002-example-FR-001',
      '002-example-FR-002',
      '002-example-FR-003',
      '002-example-FR-004',
      '002-example-FR-005',
      '002-example-FR-006',
    ]);
  });

  test('tests inside functions or test bodies are not read', () => {
    const source = `
      function declareTests() {
        test('002-example-FR-001', () => {});
      }
      declareTests();
      const helper = () => {
        test('002-example-FR-002', () => {});
      };
      test('outer', () => {
        test('002-example-FR-003', () => {});
      });
    `;
    expect(counting(source)).toEqual([]);
  });
});

describe('001-requirement-traceability-FR-011: IDs outside test and group names and tags do not count', () => {
  test('comments, assertions, helper strings, group statements, hooks and step titles', () => {
    const source = `
      // 002-example-FR-001 in a comment
      /* 002-example-FR-002 in a block comment */
      const helper = '002-example-FR-003';
      beforeEach(() => {
        console.log('002-example-FR-004');
      });
      describe('plain group', () => {
        const inGroup = '002-example-FR-005';
        afterAll(() => console.log('002-example-FR-006'));
        test('plain test', async () => {
          expect('002-example-FR-007').toBe(helper);
          await test.step('002-example-FR-008', async () => {});
        });
      });
    `;
    expect(coverage(source)).toEqual({ counting: [], skipped: [], unrecognized: [] });
  });
});

describe('001-requirement-traceability-FR-012: skipped, disabled and placeholder tests do not count', () => {
  test('modifiers, options, placeholders, skipped groups and unconditional context skips', () => {
    const source = `
      test.skip('002-example-FR-001', () => {});
      test.todo('002-example-FR-002');
      test('002-example-FR-003', { skip: true }, () => {});
      test('002-example-FR-004', { todo: true }, () => {});
      test('002-example-FR-005');
      test('002-example-FR-006', 1000);
      describe.skip('002-example-FR-007', () => {
        describe('inner', () => {
          test('002-example-FR-008', () => {});
        });
      });
      test('002-example-FR-009', (ctx) => {
        ctx.skip();
      });
      test('002-example-FR-010', ({ skip }) => {
        skip('not ready yet');
      });
      test('002-example-FR-011', ({ skip: later }) => {
        later();
      });
    `;
    expect(coverage(source)).toEqual({
      counting: [],
      skipped: [
        '002-example-FR-001',
        '002-example-FR-002',
        '002-example-FR-003',
        '002-example-FR-004',
        '002-example-FR-005',
        '002-example-FR-006',
        '002-example-FR-007',
        '002-example-FR-008',
        '002-example-FR-009',
        '002-example-FR-010',
        '002-example-FR-011',
      ],
      unrecognized: [],
    });
  });

  test('a group without a callback is a placeholder', () => {
    const { nodes } = readTestFile('src/a.test.ts', "describe('placeholder');");
    expect(nodes.map((node) => [node.kind, node.markedInactive, node.unrecognized])).toEqual([['group', true, false]]);
  });

  test('runtime conditions still count', () => {
    const source = `
      test.skipIf(process.env.CI)('002-example-FR-001', () => {});
      test.runIf(process.env.CI)('002-example-FR-002', () => {});
      test('002-example-FR-003', { skip: process.env.CI === 'true' }, () => {});
      test('002-example-FR-004', (ctx) => {
        ctx.skip(process.env.CI === 'true');
      });
      test('002-example-FR-005', (ctx) => {
        if (process.env.CI) ctx.skip();
      });
      test('002-example-FR-006', { skip: false }, () => {});
      test('002-example-FR-007', (ctx) => {
        other.skip();
      });
      describe.skipIf(process.env.CI)('002-example-FR-008', () => {
        test('inside', () => {});
      });
    `;
    expect(coverage(source)).toEqual({
      counting: [
        '002-example-FR-001',
        '002-example-FR-002',
        '002-example-FR-003',
        '002-example-FR-004',
        '002-example-FR-005',
        '002-example-FR-006',
        '002-example-FR-007',
        '002-example-FR-008',
      ],
      skipped: [],
      unrecognized: [],
    });
  });

  test('unrecognized call shapes make their nested tests non-counting', () => {
    const source = `
      test.describe.fixme('002-example-FR-001', () => {
        test('002-example-FR-002', () => {});
      });
      test.foo('002-example-FR-003', () => {});
      describe.skip('002-example-FR-004', () => {
        test.foo('inside', () => {
          test('002-example-FR-005', () => {});
        });
      });
      test['skip']('002-example-FR-006', () => {});
      test('002-example-FR-007')('again', () => {});
      it.each('002-example-FR-008', () => {});
    `;
    const { nodes } = readTestFile('src/a.test.ts', source);
    const foo = nodes.find((node) => node.tokens.some((token) => token.text === '002-example-FR-003'));
    expect(foo).toMatchObject({ kind: 'group', unrecognized: true, markedInactive: false });
    expect(coverage(source)).toEqual({
      counting: [],
      skipped: [],
      unrecognized: ['002-example-FR-001', '002-example-FR-002', '002-example-FR-004', '002-example-FR-005'],
    });
  });

  test('the report says why a requirement referenced only by such tests is uncovered', () => {
    const root = makeProject({
      'specs/002-example/spec.md': approvedSpec([
        '- **FR-001**: One.',
        '- **FR-002**: Two.',
        '- **FR-003**: Three.',
        '- **FR-004**: Four.',
      ]),
      'src/example.test.ts': [
        "test.skip('002-example-FR-001', () => {});",
        "test.describe.fixme('002-example-FR-002', () => {",
        "  test('inside', () => {});",
        '});',
        "test.todo('002-example-FR-003');",
        "test.describe.fixme('group', () => {",
        "  test('002-example-FR-003', () => {});",
        '});',
        "test('002-example-FR-004', () => {});",
        '',
      ].join('\n'),
    });
    expect(runCheck(root).problems.map((problem) => [problem.type, problem.subject, problem.detail])).toEqual([
      ['uncovered', '002-example-FR-001', 'only skipped, disabled or placeholder tests reference this requirement'],
      ['uncovered', '002-example-FR-002', "only tests inside calls the check doesn't recognize reference this requirement"],
      [
        'uncovered',
        '002-example-FR-003',
        "only skipped, disabled or placeholder tests, or tests inside calls the check doesn't recognize, reference this requirement",
      ],
    ]);
  });

  test('the Vitest config declares no tag that skips tests', () => {
    const tags = config.test?.tags ?? [];
    expect(tags.filter((tag) => tag.skip !== undefined || tag.todo !== undefined)).toEqual([]);
  });
});

describe('001-requirement-traceability-FR-022: each reference is located at its first character', () => {
  test('after non-ASCII text, across template-literal lines and in tags', () => {
    const lines = [
      '// café ☕ 😀',
      "test('😀 é 002-example-FR-001', () => {});",
      'describe(`multi',
      'line ${x} é 002-example-FR-002`, () => {',
      "  test('x', { tags: ['ñ', '002-example-FR-003'] }, () => {});",
      '});',
    ];
    const { nodes } = readTestFile('src/a.test.ts', lines.join('\n'));
    const found = nodes.flatMap((node) => node.tokens);
    const at = (line: number, text: string) => ({ file: 'src/a.test.ts', line, column: lines[line - 1]!.indexOf(text) + 1 });
    expect(found).toEqual([
      { text: '002-example-FR-001', location: at(2, '002-example-FR-001') },
      { text: '002-example-FR-002', location: at(4, '002-example-FR-002') },
      { text: '002-example-FR-003', location: at(5, '002-example-FR-003') },
    ]);
    expect(found[0]!.location.column).toBe(12);
  });
});
