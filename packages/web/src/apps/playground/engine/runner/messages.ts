// What the page accepts from the worker (contracts/runner.md Messages). The
// worker runs the visitor's code, so nothing it sends is trusted, nonce or
// not: an entry that isn't one the runtime could make is dropped before it
// reaches the session and the page's render (FR-039, FR-040).
import { LOG_LIMITS } from '../../limits.ts';
import type { LogEntry, Shown } from '../../types.ts';

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);

export const isCount = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

const isList = (value: unknown): value is unknown[] => Array.isArray(value) && value.length <= LOG_LIMITS.items;

// `depth` as the formatter counts it: its markers and leaves sit one level
// under the deepest container.
export function isShown(value: unknown, depth = 0): value is Shown {
  if (!isRecord(value) || depth > LOG_LIMITS.depth) return false;
  const nested = (item: unknown) => isShown(item, depth + 1);
  switch (value['t']) {
    case 'str':
    case 'num':
    case 'bigint':
    case 'bool':
    case 'sym':
    case 'date':
    case 'text':
      return typeof value['v'] === 'string';
    case 'null':
    case 'undef':
    case 'circ':
    case 'deep':
      return true;
    case 'fn':
      return typeof value['name'] === 'string' && typeof value['cls'] === 'boolean';
    case 'err':
      return typeof value['name'] === 'string' && typeof value['message'] === 'string';
    case 'arr':
    case 'set':
      return isList(value['items']) && value['items'].every(nested) && isCount(value['more']);
    case 'map':
      return isList(value['entries']) && value['entries'].every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every(nested)) && isCount(value['more']);
    case 'obj':
      return (
        isList(value['entries']) &&
        value['entries'].every((pair) => Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && nested(pair[1])) &&
        isCount(value['more']) &&
        (value['ctor'] === null || typeof value['ctor'] === 'string')
      );
    default:
      return false;
  }
}

const LEVELS: readonly unknown[] = ['log', 'info', 'warn', 'error', 'debug', 'alert'];

// The runtime's only notes are these; the rest are the page's own, and a line
// is the page's to add.
const WORKER_NOTES: readonly unknown[] = ['prompt', 'confirm', 'closed'];

export function isWorkerEntry(value: unknown): value is LogEntry {
  if (!isRecord(value) || typeof value['id'] !== 'number' || 'line' in value) return false;
  if (value['cut'] !== undefined && value['cut'] !== true) return false;
  if (!Array.isArray(value['values'])) return false;
  if (value['level'] === 'note') return value['values'].length === 0 && isRecord(value['note']) && WORKER_NOTES.includes(value['note']['key']);
  return LEVELS.includes(value['level']) && value['note'] === undefined && value['values'].every((item) => isShown(item));
}

// An entry that isn't one keeps its place, shortened: code can forge one, and
// the logs must not lose a line of the runtime's without a trace (FR-034).
const REFUSED: Omit<LogEntry, 'id'> = { level: 'log', values: [{ t: 'deep' }] };

export const workerEntries = (value: unknown): LogEntry[] => (Array.isArray(value) ? value.map((entry) => (isWorkerEntry(entry) ? entry : { id: 0, ...REFUSED })) : []);

export function isPlace(value: unknown): value is { line: number; column: number } {
  return isRecord(value) && isCount(value['line']) && isCount(value['column']);
}
