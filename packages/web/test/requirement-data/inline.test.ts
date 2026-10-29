// A requirement's text as a tree of inline nodes, never markup (007 research
// R7). The fixture holds every form today's specs use, and the edge cases
// around them.
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { parseInline } from '../../scripts/requirements/inline.ts';

const CASES = new Map(
  fs
    .readFileSync(path.join(import.meta.dirname, '__fixtures__/inline.md'), 'utf8')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => [line.slice(0, line.indexOf(': ')), line.slice(line.indexOf(': ') + 2)] as const),
);

// The active requirements' lines, by feature. 004's FR-018 was removed, so it
// has none.
const LINES = new Map([
  ['001-requirement-traceability', new Map([['FR-010', 110], ['FR-011', 111], ['FR-012', 112]])],
  ['004-cv-page', new Map([['FR-001', 401], ['FR-006', 406], ['FR-022', 422], ['FR-023', 423], ['FR-024', 424]])],
  [
    '005-os-shell',
    new Map(
      ['FR-001', 'FR-002', 'FR-003', 'FR-004', 'FR-011', 'FR-013', 'FR-016', 'FR-017', 'FR-018', 'FR-025', 'FR-026', 'FR-027', 'FR-028', 'FR-029'].map(
        (id) => [id, 500 + Number(id.slice(3))] as const,
      ),
    ),
  ],
]);

const CONTEXT = { feature: '005-os-shell', specDir: 'specs/005-os-shell', lines: LINES };

const parse = (name: string) => {
  const text = CASES.get(name);
  if (text === undefined) throw new Error(`no case ${name}`);
  return parseInline(text, CONTEXT);
};

const text = (value: string) => ({ kind: 'text', text: value });
const ref = (feature: string, id: string, written: string) => ({ kind: 'ref', feature, id, line: LINES.get(feature)!.get(id)!, text: written });

// Every node of a tree, depth first.
function nodesOf(nodes: unknown[]): Record<string, unknown>[] {
  return nodes.flatMap((node) => {
    const record = node as Record<string, unknown>;
    return [record, ...(Array.isArray(record.children) ? nodesOf(record.children) : [])];
  });
}

describe('007-requirement-inspector-FR-007: code, emphasis, links and references in a requirement text', () => {
  test('plain text is one text node', () => {
    expect(parse('plain')).toEqual([text('Plain text with no marks.')]);
  });

  test('code spans, with longer backtick runs holding backticks', () => {
    expect(parse('code')).toEqual([
      text('The command '),
      { kind: 'code', text: 'ls -la' },
      text(' and '),
      { kind: 'code', text: 'a `tick` inside' },
      text(' and '),
      { kind: 'code', text: '`edge`' },
      text('.'),
    ]);
  });

  test('strong, em with either mark, and struck text', () => {
    expect(parse('strong')).toEqual([text('Some '), { kind: 'strong', children: [text('strong')] }, text(' words.')]);
    expect(parse('em-star')).toEqual([text('An '), { kind: 'em', children: [text('emphasized')] }, text(' word.')]);
    expect(parse('em-underscore')).toEqual([text('An '), { kind: 'em', children: [text('emphasized')] }, text(' word, but snake_case_words stay.')]);
    expect(parse('struck')).toEqual([text('A '), { kind: 's', children: [text('struck')] }, text(' word.')]);
  });

  test('http and https links', () => {
    expect(parse('https')).toEqual([text('See '), { kind: 'link', href: 'https://example.com/guide?a=1', children: [text('the guide')] }, text('.')]);
    expect(parse('http')).toEqual([text('See '), { kind: 'link', href: 'http://example.com/old', children: [text('the old guide')] }, text('.')]);
  });

  test("relative links are files in the repository, resolved from the spec's folder", () => {
    expect(parse('file')).toEqual([text('As '), { kind: 'file', path: 'specs/005-os-shell/contracts/shell.md', children: [text("005's shell contract")] }, text(' sets.')]);
    expect(parse('file-anchor')).toEqual([text('As '), { kind: 'file', path: 'specs/006-terminal/design/README.md', children: [text('the README')] }, text(' proposes.')]);
  });

  test('other schemes, and a path out of the repository, stay text as written', () => {
    expect(parse('mailto')).toEqual([text('Write to [the owner](mailto:owner@example.com).')]);
    expect(parse('javascript')).toEqual([text('Not [a link](javascript:alert(1)).')]);
    expect(parse('escape')).toEqual([text('Not [out](../../../etc/passwd) of the repository.')]);
  });

  test("a numbered reference names that spec's requirement, and a bare one this spec's", () => {
    expect(parse('numbered')).toEqual([
      text('It MUST meet '),
      ref('004-cv-page', 'FR-001', '004 FR-001'),
      text(' (as '),
      ref('005-os-shell', 'FR-013', '005 FR-013'),
      text(' does).'),
    ]);
    expect(parse('bare')).toEqual([text('As '), ref('005-os-shell', 'FR-011', 'FR-011'), text(" sets, and this spec's "), ref('005-os-shell', 'FR-013', 'FR-013'), text('.')]);
  });

  test("a bare ID right after a numbered one, joined by to, and, or commas, is that spec's", () => {
    expect(parse('run-to')).toEqual([
      text('The rules '),
      ref('001-requirement-traceability', 'FR-010', '001 FR-010'),
      text(' to '),
      ref('001-requirement-traceability', 'FR-012', 'FR-012'),
      text(' apply.'),
    ]);
    expect(parse('run-to-005')).toEqual([text('As '), ref('005-os-shell', 'FR-025', '005 FR-025'), text(' to '), ref('005-os-shell', 'FR-029', 'FR-029'), text(' set.')]);
    expect(parse('run-and')).toEqual([text('Both '), ref('005-os-shell', 'FR-003', 'FR-003'), text(' and '), ref('005-os-shell', 'FR-004', 'FR-004'), text(' hold.')]);
    expect(parse('run-list')).toEqual([
      text('Every one of '),
      ref('005-os-shell', 'FR-001', 'FR-001'),
      text(', '),
      ref('005-os-shell', 'FR-002', 'FR-002'),
      text(', and '),
      ref('005-os-shell', 'FR-003', 'FR-003'),
      text(' after '),
      ref('004-cv-page', 'FR-022', '004 FR-022'),
      text('.'),
    ]);
    expect(parse('run-mixed').filter((node) => node.kind === 'ref')).toEqual([
      ref('005-os-shell', 'FR-011', '005 FR-011'),
      ref('005-os-shell', 'FR-016', 'FR-016'),
      ref('005-os-shell', 'FR-018', 'FR-018'),
      ref('005-os-shell', 'FR-013', 'FR-013'),
    ]);
    expect(parse('run-comma-list').filter((node) => node.kind === 'ref')).toEqual([
      ref('004-cv-page', 'FR-023', '004 FR-023'),
      ref('004-cv-page', 'FR-024', 'FR-024'),
      ref('005-os-shell', 'FR-011', 'FR-011'),
    ]);
    expect(parse('run-broken').filter((node) => node.kind === 'ref')).toEqual([ref('004-cv-page', 'FR-022', '004 FR-022'), ref('005-os-shell', 'FR-013', 'FR-013')]);
    expect(parse('two-numbered').filter((node) => node.kind === 'ref')).toEqual([ref('004-cv-page', 'FR-006', '004 FR-006'), ref('005-os-shell', 'FR-013', '005 FR-013')]);
  });

  test('a reference to an unknown spec or requirement, or a removed one, stays text', () => {
    expect(parse('unknown-spec')).toEqual([text('As 099 FR-001 to FR-002 set.')]);
    expect(parse('unknown-id')).toEqual([text('As 004 FR-099 sets, and FR-098 here.')]);
    expect(parse('removed')).toEqual([text('As 004 FR-018 set before.')]);
  });

  test('marks nest, and links hold marks', () => {
    expect(parse('nested')).toEqual([
      text('Some '),
      { kind: 'strong', children: [text('bold with '), { kind: 'em', children: [text('em')] }, text(' and '), { kind: 'code', text: 'code' }] },
      text(' words, and '),
      { kind: 'em', children: [text('em with '), { kind: 'strong', children: [text('bold')] }] },
      text('.'),
    ]);
    expect(parse('link-marks')).toEqual([
      text('See '),
      { kind: 'link', href: 'https://example.com/', children: [text('the '), { kind: 'strong', children: [text('bold')] }, text(' guide')] },
      text('.'),
    ]);
  });

  test('unclosed marks and brackets with no address stay text', () => {
    expect(parse('unclosed')).toEqual([text(CASES.get('unclosed')!)]);
    expect(parse('brackets')).toEqual([text(CASES.get('brackets')!)]);
  });

  test('the result is plain data: no HTML string, and every node is one of the six kinds', () => {
    for (const name of CASES.keys()) {
      const nodes = parse(name);
      expect(JSON.parse(JSON.stringify(nodes))).toEqual(nodes);
      for (const node of nodesOf(nodes)) {
        expect(['text', 'code', 'strong', 'em', 's', 'link', 'file', 'ref']).toContain(node.kind);
        expect(Object.keys(node).some((key) => /html/i.test(key))).toBe(false);
      }
    }
  });
});
