// Draws a command's output block (006 research R3, data-model.md Result and
// output block). Every string reaches the page as a React text child, so
// typed text can never become markup or a link (FR-018). Headings sit below
// the run's own `h2` (FR-029).
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, ReactNode } from 'react';
import { TERMINAL } from '../../os/metrics.ts';
import { Arrow } from '../../cv/Arrow.tsx';
import { VisuallyHidden } from '../../cv/VisuallyHidden.tsx';
import { columns } from './engine/columns.ts';
import { rowIndent } from './engine/block.ts';
import type { Block, JsonRow, Node } from './engine/block.ts';

// Runs a control's line as if typed (FR-015); `touch` when a tap did it.
export type RunControl = (line: string, touch: boolean) => void;

type Props = { block: Block; run: RunControl };

const INLINE = new Set<Node['kind']>(['text', 'command', 'link', 'time']);

// The line art `tree` prints, which the Terminal's font files don't hold: each
// character at the cell's width, whatever font draws it (T370).
const LINE_ART = /([├└│─])/;
const CELL = rowIndent(1) as CSSProperties;
const inCells = (text: string): ReactNode => (!LINE_ART.test(text) ? text : text.split(LINE_ART).map((piece, at) => (at % 2 === 1 ? <span key={at} className="out-cell" style={CELL}>{piece}</span> : piece)));

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

// A second Tab's list, in readline's columns at the screen's own width, so a
// phone gets fewer than a window (FR-076, research R44).
function CompletionList({ matches }: { matches: Extract<Node, { kind: 'completion' }>['matches'] }) {
  const list = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(TERMINAL.columns);
  useLayoutEffect(() => {
    const element = list.current;
    const screen = element?.closest('.terminal-screen');
    if (element === null || screen === null || screen === undefined) return;
    const { paddingLeft, paddingRight } = getComputedStyle(screen);
    const advance = Number.parseFloat(getComputedStyle(element).fontSize) * TERMINAL.advance;
    setWidth(Math.floor((screen.clientWidth - Number.parseFloat(paddingLeft) - Number.parseFloat(paddingRight)) / advance));
  }, []);
  return (
    <div ref={list} className="completion-list" data-req="006-terminal-FR-076">
      {columns(matches, width).map((row, index) => (
        <div key={index} className="completion-row">
          {row.map((cell) => (
            <span key={cell} className={cell.trimEnd().endsWith('/') ? 'completion-folder' : 'completion-file'}>
              {cell}
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
      // What a command printed keeps its spaces and tabs, as a terminal
      // shows them (FR-067).
      if (node.stream !== undefined) return <span className={['out-stream', toneClass(node.tone)].filter(Boolean).join(' ')}>{inCells(node.text)}</span>;
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
      // `help`'s standard group's heading and note, and a stopped run's line
      // (FR-008, FR-068, FR-069).
      if (node.req === 'standard')
        return (
          <p className="out-line out-standard-heading" data-req="006-terminal-FR-008 006-terminal-FR-068">
            <Nodes block={node.children} run={run} level={level} />
          </p>
        );
      if (node.req === 'stopped')
        return (
          <p className="out-line run-stopped" data-req="006-terminal-FR-069 006-terminal-FR-075">
            <Nodes block={node.children} run={run} level={level} />
          </p>
        );
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
    case 'columns': {
      const cells = node.cells.map((cell, index) => (
        <li key={index}>
          <One node={cell} run={run} level={level} />
        </li>
      ));
      if (node.req === 'standard')
        return (
          <ul className="out-columns out-standard" data-req="006-terminal-FR-008 006-terminal-FR-068">
            {cells}
          </ul>
        );
      return (
        <ul className="out-columns" data-req="006-terminal-FR-043 006-terminal-FR-050">
          {cells}
        </ul>
      );
    }
    case 'rows':
      return <Rows node={node} run={run} level={level} />;
    case 'json':
      return <JsonRows rows={node.rows} />;
    case 'completion':
      return <CompletionList matches={node.matches} />;
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
