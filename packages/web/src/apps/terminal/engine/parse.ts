// The command line's parser (006 research R7, data-model.md Command line and
// call): line breaks to spaces, `|` into stages, each stage into words on
// runs of spaces and tabs, the first word looked up in lower case. There are
// no quotes, escapes, variables or globs, so nothing typed is ever run.

type Named = { name: string; aliases: readonly string[] };

// `word` as typed, for replies; `command` null when the word names none.
export type Stage<C extends Named = Named> = { word: string; command: C | null; args: readonly string[] };

export type Parsed<C extends Named = Named> = { kind: 'empty' } | { kind: 'pipe-usage' } | { kind: 'stages'; stages: readonly Stage<C>[] };

const BREAKS = /\r\n|\r|\n/g;
const SPACES = /[ \t]+/;

// The command a word names, by its name or an alias, without regard to
// capitals (FR-007).
export function findCommand<C extends Named>(word: string, table: readonly C[]): C | null {
  const lower = word.toLowerCase();
  return table.find((command) => command.name === lower || command.aliases.includes(lower)) ?? null;
}

export function parseLine<C extends Named>(line: string, table: readonly C[]): Parsed<C> {
  const parts = line.replace(BREAKS, ' ').split('|').map((part) => part.trim());
  if (parts.length === 1 && parts[0] === '') return { kind: 'empty' };
  // A `|` with nothing on a side (FR-057).
  if (parts.some((part) => part === '')) return { kind: 'pipe-usage' };
  return {
    kind: 'stages',
    stages: parts.map((part) => {
      const [word, ...args] = part.split(SPACES) as [string, ...string[]];
      return { word, command: findCommand(word, table), args };
    }),
  };
}
