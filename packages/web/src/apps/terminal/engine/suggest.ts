// Suggestions for a mistyped command (006 research R8, FR-016): every name or
// alias within 2 edits of the word, or 1 for a word of 3 letters or fewer,
// and every command whose name starts with a word of 2 letters or more, at
// its own distance; by distance, then `help` order; an alias and its command
// once, by the nearer name; at most 3.

type Named = { name: string; aliases: readonly string[] };

const LIMIT = 3;

// The optimal string alignment distance: an insertion, deletion,
// substitution or swap of two neighbouring letters each cost 1.
export function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) best = Math.min(best, rows[i - 2]![j - 2]! + 1);
      rows[i]![j] = best;
    }
  }
  return rows[a.length]![b.length]!;
}

// The names to offer for `word`, each as the visitor would type it.
export function suggest(word: string, table: readonly Named[]): string[] {
  const typed = word.toLowerCase();
  const reach = typed.length <= 3 ? 1 : 2;
  const found: { name: string; distance: number; order: number }[] = [];
  table.forEach((command, order) => {
    let best: { name: string; distance: number } | null = null;
    for (const name of [command.name, ...command.aliases]) {
      const apart = distance(typed, name);
      const qualifies = apart <= reach || (name === command.name && typed.length >= 2 && name.startsWith(typed));
      if (qualifies && (best === null || apart < best.distance)) best = { name, distance: apart };
    }
    if (best !== null && best.distance > 0) found.push({ ...best, order });
  });
  found.sort((a, b) => a.distance - b.distance || a.order - b.order);
  return found.slice(0, LIMIT).map((entry) => entry.name);
}
