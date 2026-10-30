// Reads Chromium's own accessibility tree through the DevTools protocol, so
// page tests see roles and names as assistive technology gets them.
import type { Page } from 'playwright';

export type AxNode = { role: string; name: string; description: string; level?: number; ignored: boolean };

type RawAxNode = {
  ignored: boolean;
  role?: { value?: string };
  name?: { value?: string };
  description?: { value?: string };
  properties?: { name: string; value: { value?: unknown } }[];
};

// The accessibility node of every element matching `selector`, in DOM order.
export async function axNodes(page: Page, selector: string): Promise<AxNode[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
    const result: AxNode[] = [];
    for (const nodeId of nodeIds) {
      const { nodes } = (await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false })) as unknown as { nodes: RawAxNode[] };
      const node = nodes[0];
      const level = node?.properties?.find((property) => property.name === 'level')?.value.value;
      result.push({
        role: node?.role?.value ?? '',
        name: node?.name?.value ?? '',
        description: node?.description?.value ?? '',
        ignored: node?.ignored ?? true,
        ...(typeof level === 'number' ? { level } : {}),
      });
    }
    return result;
  } finally {
    await cdp.detach();
  }
}

// The heading outline: the level and name of every heading assistive
// technology sees, in document order.
export async function headingOutline(page: Page): Promise<{ level: number; name: string }[]> {
  const nodes = await axNodes(page, 'h1, h2, h3, h4, h5, h6, [role="heading"]');
  return nodes.filter((node) => !node.ignored && node.role === 'heading').map((node) => ({ level: node.level ?? 0, name: node.name }));
}

type FullAxNode = RawAxNode & { nodeId: string; childIds?: string[]; backendDOMNodeId?: number };

// The text assistive technology reads inside each element matching
// `selector`: every text leaf of its accessibility subtree, joined, with
// ignored text (such as `aria-hidden` text) left out. A generic element
// that is itself ignored, such as a plain `div`, still has its text read.
export async function axText(page: Page, selector: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as unknown as { nodes: FullAxNode[] };
    const byId = new Map(nodes.map((node) => [node.nodeId, node]));
    const byBackend = new Map(nodes.filter((node) => node.backendDOMNodeId !== undefined).map((node) => [node.backendDOMNodeId!, node]));
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector });
    const texts: string[] = [];
    for (const nodeId of nodeIds) {
      const { node } = await cdp.send('DOM.describeNode', { nodeId });
      const start = byBackend.get(node.backendNodeId);
      const parts: string[] = [];
      const visit = (current: FullAxNode | undefined) => {
        if (current === undefined) return;
        if (!current.ignored && current.role?.value === 'StaticText') {
          parts.push(current.name?.value ?? '');
          return;
        }
        for (const child of current.childIds ?? []) visit(byId.get(child));
      };
      if (start !== undefined) visit(start);
      texts.push(parts.join('').replace(/\s+/g, ' ').trim());
    }
    return texts;
  } finally {
    await cdp.detach();
  }
}
