// The text a block shows, one string a text node, in order.
type Tree = { text?: unknown; children?: readonly unknown[] };

export function flatten(block: readonly unknown[]): string[] {
  return block.flatMap((node) => {
    const { text, children } = node as Tree;
    if (typeof text === 'string') return [text];
    return children === undefined ? [] : flatten(children);
  });
}
