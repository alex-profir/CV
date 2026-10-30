// The examples panel (FR-027, FR-028, FR-031), under its button: the
// examples by group, each a button with its title and description, the one
// the code came from marked current, and the design's note. Choosing one
// replaces the code and its options as one undoable edit. Focus moves to the
// first example on open; Escape closes the panel and gives focus back to
// Examples, as the options panel does.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { siteText } from '../../site-text.ts';
import { chooseExample, exampleList } from './controller.ts';
import type { Example } from './examples/index.ts';
import { session, useSession } from './session.ts';

const words = siteText.playground.examples;

// The design's two columns of groups.
const COLUMNS: readonly Example['group'][][] = [
  ['start', 'types'],
  ['running', 'cv'],
];

export const EXAMPLES_PANEL_ID = 'playground-examples';

// Set when the panel opens from Examples or the menu, so its first example
// takes focus; a panel shown again after Show specs leaves focus alone.
let focusOnOpen = false;

const focusExamplesButton = () => document.querySelector<HTMLElement>('#os section.playground .playground-toolbar button.examples')?.focus();

export function openExamplesPanel(): void {
  focusOnOpen = true;
  session.update({ panel: 'examples' });
}

export function closeExamplesPanel(): void {
  session.update({ panel: 'none' });
  requestAnimationFrame(focusExamplesButton);
}

export function ExamplesPanel() {
  const current = useSession((state) => state.example);
  const panel = useRef<HTMLElement>(null);
  const list = exampleList();
  useEffect(() => {
    if (!focusOnOpen) return;
    focusOnOpen = false;
    panel.current?.querySelector<HTMLElement>('button.example')?.focus();
  }, []);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    closeExamplesPanel();
  };
  return (
    <section ref={panel} id={EXAMPLES_PANEL_ID} className="examples-panel" aria-labelledby="playground-examples-heading" onKeyDown={onKeyDown} data-req="008-typescript-playground-FR-027 008-typescript-playground-FR-028 008-typescript-playground-FR-031">
      <h2 id="playground-examples-heading" className="visually-hidden">
        {words.heading}
      </h2>
      <div className="examples-list">
        {COLUMNS.map((groups) => (
          <div key={groups.join()} className="examples-column">
            {groups.map((group) => (
              <section key={group} aria-labelledby={`playground-examples-${group}`}>
                <h3 id={`playground-examples-${group}`}>{words.groups[group]}</h3>
                <ul>
                  {list
                    .filter((example) => example.group === group)
                    .map((example) => (
                      <li key={example.id}>
                        <button type="button" className="example" aria-current={current === example.id ? 'true' : undefined} onClick={() => chooseExample(example)}>
                          <span className="example-title">{example.title}</span>
                          <span className="example-description">{example.description}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        ))}
      </div>
      <p className="examples-foot">{words.note}</p>
    </section>
  );
}
