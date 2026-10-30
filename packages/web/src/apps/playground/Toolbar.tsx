// The toolbar (contracts/playground.md): Options here; Run, Stop, Examples
// and Share come with their stories. `p.run-state` shows the run's state
// once code runs (FR-036, FR-066).
import { useRef } from 'react';
import { siteText } from '../../site-text.ts';
import { OptionsGlyph } from './Glyphs.tsx';
import { session, useSession } from './session.ts';

const words = siteText.playground.tools;

// The Options button, for focus to come back to when the panel closes.
export const focusOptionsButton = () => document.querySelector<HTMLElement>('#os section.playground .playground-toolbar button.options')?.focus();

export function Toolbar() {
  const panel = useSession((state) => state.panel);
  const options = useRef<HTMLButtonElement>(null);
  return (
    <div className="playground-toolbar" role="toolbar" aria-label={words.label}>
      <button
        ref={options}
        type="button"
        className="button tool options"
        aria-pressed={panel === 'options'}
        onClick={() => session.update({ panel: panel === 'options' ? 'none' : 'options' })}
        data-req="008-typescript-playground-FR-024 008-typescript-playground-FR-025 008-typescript-playground-FR-026"
      >
        <OptionsGlyph />
        <span>{words.options}</span>
      </button>
      <p className="run-state" data-req="008-typescript-playground-FR-036 008-typescript-playground-FR-066" />
    </div>
  );
}
