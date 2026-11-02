// A requirement's text, from its Inline tree (007 research R7): every part
// is a React element or text child, and no markup is ever parsed from the
// data. A link's address is the http or https one the data holds; files
// and references lead into the repository at the built commit, and stay
// text when the site names no repository.
import type { ReactNode } from 'react';
import type { Inline } from '../../scripts/requirements/index.ts';
import { fileUrl, specFile } from '../format/repository.ts';
import { fill, siteText } from '../site-text.ts';

export type InlineLinks = { repository: string | undefined; commit: string };

function render(nodes: readonly Inline[], links: InlineLinks): ReactNode[] {
  const { repository, commit } = links;
  const linked = repository !== undefined && repository !== '';
  return nodes.map((node, index) => {
    switch (node.kind) {
      case 'text':
        return node.text;
      case 'code':
        return <code key={index}>{node.text}</code>;
      case 'strong':
        return <strong key={index}>{render(node.children, links)}</strong>;
      case 'em':
        return <em key={index}>{render(node.children, links)}</em>;
      case 's':
        return <s key={index}>{render(node.children, links)}</s>;
      case 'link':
        return (
          <a key={index} href={node.href}>
            {render(node.children, links)}
          </a>
        );
      case 'file':
        return linked ? (
          <a key={index} href={fileUrl(repository, commit, node.path)}>
            {render(node.children, links)}
          </a>
        ) : (
          <span key={index}>{render(node.children, links)}</span>
        );
      case 'ref': {
        if (!linked) return node.text;
        const fullId = `${node.feature}-${node.id}`;
        // The full ID for assistive technology, when the text has the short one.
        const label = node.text.includes(fullId) ? undefined : fill(siteText.inspector.refName, { text: node.text, id: fullId });
        return (
          <a key={index} href={fileUrl(repository, commit, specFile(node.feature), node.line)} aria-label={label}>
            {node.text}
          </a>
        );
      }
    }
  });
}

export function InlineText({ nodes, links }: { nodes: readonly Inline[]; links: InlineLinks }) {
  return <>{render(nodes, links)}</>;
}
