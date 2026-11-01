// The toolbar (contracts/playground.md): Run and Stop, then the tools
// (Examples, Options and Share), and the run's
// state at the right end, with a glyph that tells it by shape (FR-036,
// FR-066).
import { useEffect, useRef, useState } from 'react';
import { siteText } from '../../site-text.ts';
import { canStop, runCode, shareCode, stopCode } from './controller.ts';
import { ChevronGlyph, ErrorMark, ExamplesGlyph, OkMark, OptionsGlyph, RunGlyph, RunningMark, ShareGlyph, StopGlyph, StoppedMark, WarnMark } from './Glyphs.tsx';
import { closeExamplesPanel, EXAMPLES_PANEL_ID, openExamplesPanel } from './ExamplesPanel.tsx';
import { closeOptionsPanel, openOptionsPanel } from './OptionsPanel.tsx';
import { runStateText } from './running.ts';
import { useSession } from './session.ts';
import { onMac } from './text.ts';
import type { Run } from './types.ts';

const words = siteText.playground.tools;

// How often the running time is redrawn.
const REDRAW_MS = 100;

// The Options button, for focus to come back to when the panel closes.
export const focusOptionsButton = () => document.querySelector<HTMLElement>('#os section.playground .playground-toolbar button.options')?.focus();

function StateMark({ run }: { run: Run }) {
  if (run.outcome === null) return <RunningMark />;
  switch (run.outcome.kind) {
    case 'finished':
      return <OkMark />;
    case 'stopped':
      return <StoppedMark />;
    case 'nothing-ran':
      return <WarnMark />;
    default:
      return <ErrorMark />;
  }
}

// The run's state: its time counts while it goes on.
function RunState() {
  const run = useSession((state) => state.run);
  const [now, setNow] = useState(() => performance.now());
  const going = run !== null && run.outcome === null;
  useEffect(() => {
    if (!going) return undefined;
    const timer = setInterval(() => setNow(performance.now()), REDRAW_MS);
    return () => clearInterval(timer);
  }, [going]);
  return (
    <p className="run-state" data-req="008-typescript-playground-FR-036 008-typescript-playground-FR-066">
      {run !== null && (
        <>
          <StateMark run={run} />
          <span>{runStateText(run, Math.max(now, run.startedAt))}</span>
        </>
      )}
    </p>
  );
}

export function Toolbar() {
  const panel = useSession((state) => state.panel);
  const going = useSession((state) => state.run !== null && state.run.outcome === null);
  return (
    <div className="playground-toolbar" role="toolbar" aria-label={words.label}>
      <button type="button" className="button run" aria-keyshortcuts={onMac() ? 'Meta+Enter' : 'Control+Enter'} onClick={runCode} data-req="008-typescript-playground-FR-032 008-typescript-playground-FR-033 008-typescript-playground-FR-083">
        <RunGlyph />
        <span>{words.run}</span>
      </button>
      <button
        type="button"
        className="button stop"
        aria-disabled={going ? undefined : 'true'}
        onClick={() => {
          if (canStop()) stopCode();
        }}
        data-req="008-typescript-playground-FR-038"
      >
        <StopGlyph />
        <span>{words.stop}</span>
      </button>
      <span className="divider" aria-hidden="true" />
      <button
        type="button"
        className="button tool examples"
        aria-expanded={panel === 'examples'}
        aria-controls={EXAMPLES_PANEL_ID}
        onClick={panel === 'examples' ? closeExamplesPanel : openExamplesPanel}
        data-req="008-typescript-playground-FR-027 008-typescript-playground-FR-028 008-typescript-playground-FR-031"
      >
        <ExamplesGlyph />
        <span>{words.examples}</span>
        <ChevronGlyph />
      </button>
      <button
        type="button"
        className="button tool options"
        aria-pressed={panel === 'options'}
        onClick={panel === 'options' ? closeOptionsPanel : openOptionsPanel}
        data-req="008-typescript-playground-FR-024 008-typescript-playground-FR-025 008-typescript-playground-FR-026"
      >
        <OptionsGlyph />
        <span>{words.options}</span>
      </button>
      <button type="button" className="button tool share" onClick={() => void shareCode()} data-req="008-typescript-playground-FR-052 008-typescript-playground-FR-055">
        <ShareGlyph />
        <span>{words.share}</span>
      </button>
      <RunState />
    </div>
  );
}
