// The examples, in the design's order (wireframes, Examples). The starting
// example's text depends on the visitor's system, so the list is built for
// it.
import type { Example } from './types.ts';
import { welcome } from './welcome.ts';

export type { Example };
export { welcome };

export function examples(mac: boolean): readonly Example[] {
  return [welcome(mac)];
}
