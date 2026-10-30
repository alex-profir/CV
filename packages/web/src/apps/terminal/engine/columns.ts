// A second Tab's list, laid out as readline lays it out (006 research R44,
// data-model.md Completion): as many columns as fit `width` characters, each
// the longest name plus 2, filled down, the last column unpadded. A folder's
// `/` is printed but not measured, as readline measures the name alone.

type CompletionMatch = { name: string; folder: boolean };

const bare = (name: string) => name.replace(/\/$/, '');

export function columns(names: readonly CompletionMatch[], width: number): string[][] {
  if (names.length === 0) return [];
  const cell = Math.max(...names.map((match) => bare(match.name).length)) + 2;
  let fit = Math.floor(width / cell);
  if (fit !== 1 && fit * cell === width) fit -= 1;
  const across = Math.max(1, fit);
  const down = Math.ceil(names.length / across);
  const rows: string[][] = [];
  for (let row = 0; row < down; row += 1) {
    const cells: string[] = [];
    for (let column = 0; column < across; column += 1) {
      const match = names[row + column * down];
      if (match === undefined) break;
      cells.push(column + 1 < across ? match.name.padEnd(cell) : match.name);
    }
    rows.push(cells);
  }
  return rows;
}
