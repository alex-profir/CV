// Draws a command's output block (006 research R3, data-model.md Result and
// output block). Every string reaches the page as a React text child, so
// typed text can never become markup or a link (FR-018). Headings sit below
// the run's own `h2` (FR-029).
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { Arrow } from '../../cv/Arrow.tsx';
import { VisuallyHidden } from '../../cv/VisuallyHidden.tsx';
import { rowIndent } from './engine/block.ts';
import type { Block, JsonRow, Node } from './engine/block.ts';

// Runs a control's line as if typed (FR-015); `touch` when a tap did it.
export type RunControl = (line: string, touch: boolean) => void;

type Props = { block: Block; run: RunControl };

const INLINE = new Set<Node['kind']>(['text', 'command', 'link', 'time']);

const toneClass = (tone: string | undefined) => (tone === undefined ? undefined : `tone-${tone}`);

function Control({ node, run }: { node: Extract<Node, { kind: 'command' }>; run: RunControl }) {
  const className = [node.style === 'chip' ? 'command-chip' : 'command-inline', toneClass(node.tone)].filter(Boolean).join(' ');
  const props = {
    type: 'button' as const,
    className,
    'aria-label': node.line,
    onClick: (event: MouseEvent) => run(node.line, (event.nativeEvent as PointerEvent).pointerType === 'touch'),
  };
  const shown = node.label ?? node.line;
  switch (node.req) {
    case 'suggestion':
      return (
        <button {...props} data-req="006-terminal-FR-015 006-terminal-FR-016 006-terminal-FR-034">
          {shown}
        </button>
      );
    case 'path':
      return (
        <button {...props} data-req="006-terminal-FR-015 006-terminal-FR-034 006-terminal-FR-048">
          {shown}
        </button>
      );
    case 'ls':
      return (
        <button {...props} data-req="006-terminal-FR-015 006-terminal-FR-034 006-terminal-FR-050">
          {shown}
        </button>
      );
    default:
      return (
        <button {...props} data-req="006-terminal-FR-015 006-terminal-FR-034">
          {shown}
        </button>
      );
  }
}

export function JsonRows({ rows }: { rows: readonly JsonRow[] }) {
  return (
    <div className="out-json" data-req="006-terminal-FR-056">
      {rows.map((row, index) => (
        <div key={index} className="json-row" style={rowIndent(row.indent) as CSSProperties}>
          {row.tokens.map((token, at) => (
            <span key={at} className={`json-${token.kind}`}>
              {token.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function Rows({ node, run, level }: { node: Extract<Node, { kind: 'rows' }>; run: RunControl; level: number }) {
  // A list of rows, so a screen reader hears how many there are (FR-029).
  const rows = node.rows.map((row, index) => (
    <li key={index} className="out-row">
      {row.map((cell, at) => (
        <span key={at} className="out-cell">
          <Nodes block={cell} run={run} level={level} />
        </span>
      ))}
    </li>
  ));
  if (node.req === 'help')
    return (
      <ul className="out-rows out-help" data-req="006-terminal-FR-008">
        {rows}
      </ul>
    );
  if (node.req === 'specs')
    return (
      <ul className="out-rows out-specs" data-req="006-terminal-FR-013">
        {rows}
      </ul>
    );
  return <ul className="out-rows">{rows}</ul>;
}

function One({ node, run, level }: { node: Node; run: RunControl; level: number }): ReactNode {
  switch (node.kind) {
    case 'text':
      return node.tone === undefined ? node.text : <span className={toneClass(node.tone)}>{node.text}</span>;
    case 'time':
      return node.spoken === undefined ? (
        <time dateTime={node.datetime}>{node.text}</time>
      ) : (
        <>
          <time dateTime={node.datetime} aria-hidden="true">
            {node.text}
          </time>
          <VisuallyHidden>{node.spoken}</VisuallyHidden>
        </>
      );
    case 'command':
      return <Control node={node} run={run} />;
    case 'link':
      return (
        <a href={node.href}>
          <Nodes block={node.children} run={run} level={level} />
          {node.external && <Arrow kind="up-right" />}
        </a>
      );
    case 'line':
      return (
        <p className="out-line">
          <Nodes block={node.children} run={run} level={level} />
        </p>
      );
    case 'heading': {
      const Heading = `h${Math.min(6, level + node.depth)}` as 'h3';
      return (
        <Heading className="out-heading">
          <Nodes block={node.children} run={run} level={level} />
        </Heading>
      );
    }
    case 'list':
      return (
        <ul className={node.req === 'history' ? 'out-history' : 'out-list'}>
          {node.items.map((item, index) => (
            <li key={index}>
              <Nodes block={item} run={run} level={level} />
            </li>
          ))}
        </ul>
      );
    case 'columns':
      return (
        <ul className="out-columns" data-req="006-terminal-FR-043 006-terminal-FR-050">
          {node.cells.map((cell, index) => (
            <li key={index}>
              <One node={cell} run={run} level={level} />
            </li>
          ))}
        </ul>
      );
    case 'rows':
      return <Rows node={node} run={run} level={level} />;
    case 'json':
      return <JsonRows rows={node.rows} />;
  }
}

// A block's nodes; inline nodes at block level are gathered into a
// paragraph, so a reply reads as one.
function Nodes({ block, run, level, gather = false }: { block: Block; run: RunControl; level: number; gather?: boolean }) {
  const parts: ReactNode[] = [];
  let inline: Node[] = [];
  const flush = () => {
    if (inline.length === 0) return;
    const nodes = inline;
    parts.push(
      <p key={`p${parts.length}`} className="out-line">
        {nodes.map((node, index) => (
          <One key={index} node={node} run={run} level={level} />
        ))}
      </p>,
    );
    inline = [];
  };
  block.forEach((node, index) => {
    if (gather && INLINE.has(node.kind)) {
      inline.push(node);
      return;
    }
    flush();
    parts.push(<One key={index} node={node} run={run} level={level} />);
  });
  flush();
  return <>{parts}</>;
}

// The output under a run's `h2`.
export function Output({ block, run }: Props) {
  return <Nodes block={block} run={run} level={2} gather />;
}
