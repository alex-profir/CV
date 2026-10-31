// A position in the JavaScript that ran, mapped back to the visitor's code
// through TypeScript's source map (research R13, FR-035): a VLQ decoder of
// the map's `mappings`, and the lookup. A position that maps to nothing
// gives no line, never a wrong one.

const DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALUE = new Map([...DIGITS].map((digit, index) => [digit, index]));

// One segment: the generated column, then the source, its line and column,
// all 0-based and absolute.
type Segment = [column: number, source: number, line: number, sourceColumn: number];

// The `mappings` of a source map, decoded: one list of segments per
// generated line. Segments with no source position are left out.
export function decodeMappings(mappings: string): Segment[][] {
  const lines: Segment[][] = [];
  let source = 0;
  let line = 0;
  let sourceColumn = 0;
  for (const text of mappings.split(';')) {
    const segments: Segment[] = [];
    let column = 0;
    for (const field of text.split(',')) {
      if (field === '') continue;
      const values: number[] = [];
      let value = 0;
      let shift = 0;
      for (const digit of field) {
        const bits = VALUE.get(digit);
        if (bits === undefined) throw new Error(`not a base64 digit: ${digit}`);
        value += (bits & 31) << shift;
        if ((bits & 32) !== 0) {
          shift += 5;
          continue;
        }
        values.push((value & 1) === 1 ? -(value >>> 1) : value >>> 1);
        value = 0;
        shift = 0;
      }
      column += values[0] ?? 0;
      if (values.length < 4) continue;
      source += values[1]!;
      line += values[2]!;
      sourceColumn += values[3]!;
      segments.push([column, source, line, sourceColumn]);
    }
    lines.push(segments);
  }
  return lines;
}

// The last map read: a run's errors can come by the thousand, all on one map.
let last: { map: string; lines: Segment[][] | null } | null = null;

function decoded(map: string): Segment[][] | null {
  if (last?.map === map) return last.lines;
  let lines: Segment[][] | null = null;
  try {
    const { mappings } = JSON.parse(map) as { mappings?: unknown };
    if (typeof mappings === 'string') lines = decodeMappings(mappings);
  } catch {
    // Can't be read: no line.
  }
  last = { map, lines };
  return lines;
}

// The visitor's line and column (1-based) for a 1-based position in the
// JavaScript, by the last segment at or before it on its line; null when
// the line has none, or the map can't be read.
export function mapPosition(map: string, line: number, column: number): { line: number; column: number } | null {
  const segments = decoded(map)?.[line - 1];
  if (segments === undefined || segments.length === 0) return null;
  let found: Segment | undefined;
  for (const segment of segments) {
    if (segment[0] > column - 1) break;
    found = segment;
  }
  found ??= segments[0];
  return found === undefined ? null : { line: found[2] + 1, column: found[3] + 1 };
}
