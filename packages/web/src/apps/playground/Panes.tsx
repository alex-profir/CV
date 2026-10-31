// The panes beside the editor (FR-020 to FR-023, research R8): four tabs in
// the design's order, Errors and Logs naming their counts, the arrow keys
// moving between them; the JavaScript and the declarations TypeScript gives,
// read only; the errors; and the logs. Which pane is open lives in the
// session (FR-005).
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { counted, fill, siteText } from '../../site-text.ts';
import { currentEngine } from './controller.ts';
import { settle } from './compiler-options.ts';
import { ErrorsList } from './ErrorsPane.tsx';
import { LogsPane } from './LogsPane.tsx';
import { session, useSession } from './session.ts';
import type { CheckResult, Pane } from './types.ts';

const words = siteText.playground.panes;

export const PANES: readonly Pane[] = ['javascript', 'declarations', 'errors', 'logs'];

const tabId = (pane: Pane) => `playground-tab-${pane}`;
const panelId = (pane: Pane) => `playground-pane-${pane}`;

// The sentence a pane shows in place of its text (FR-023).
function noneSentence(kind: 'javascript' | 'declarations', check: CheckResult | null): string | null {
  if (check === null) return null;
  if (kind === 'javascript') return 'none' in check.javascript ? fill(words.noJavaScript, { option: 'noEmitOnError' }) : null;
  if (!('none' in check.declarations)) return null;
  return check.declarations.none === 'declaration-off' ? fill(words.noDeclarations, { option: 'declaration' }) : fill(words.noDeclarationsOnError, { option: 'noEmitOnError' });
}

// The JavaScript or the declarations, in a read-only editor with the code's
// colors, so they can be selected and copied (FR-021).
function OutputPane({ kind }: { kind: 'javascript' | 'declarations' }) {
  const check = useSession((state) => state.check);
  const target = useSession((state) => settle(state.options).target);
  const host = useRef<HTMLDivElement>(null);
  const output = useRef<ReturnType<NonNullable<ReturnType<typeof currentEngine>>['mountOutput']> | null>(null);
  const none = noneSentence(kind, check);
  const text = check === null ? '' : kind === 'javascript' ? ('text' in check.javascript ? check.javascript.text : '') : 'text' in check.declarations ? check.declarations.text : '';
  useEffect(() => {
    const engine = currentEngine();
    if (engine === null || host.current === null) return undefined;
    const view = engine.mountOutput(host.current, kind);
    output.current = view;
    return () => {
      output.current = null;
      view.dispose();
    };
  }, [kind]);
  useEffect(() => output.current?.setText(text), [text]);
  return (
    <>
      <p className="pane-caption">{kind === 'javascript' ? fill(words.javascriptCaption, { target }) : words.declarationsCaption}</p>
      {none !== null && <p className="empty">{none}</p>}
      <div ref={host} className="playground-output" hidden={none !== null} />
    </>
  );
}

function ErrorsPane() {
  const diagnostics = useSession((state) => state.check?.diagnostics ?? []);
  const errors = diagnostics.filter((entry) => entry.category === 'error').length;
  return (
    <>
      {diagnostics.length > 0 && <p className="pane-caption">{fill(counted(words.errorsCaption, errors), { n: errors })}</p>}
      <ErrorsList diagnostics={diagnostics} />
    </>
  );
}

export function Panes() {
  const pane = useSession((state) => state.pane);
  const checking = useSession((state) => state.checking);
  const diagnostics = useSession((state) => state.check?.diagnostics.length ?? 0);
  const errors = useSession((state) => state.check?.diagnostics.some((entry) => entry.category === 'error') ?? false);
  const logs = useSession((state) => state.logs.entries.length);
  const tabs = useRef<HTMLDivElement>(null);

  const choose = (next: Pane, focus: boolean) => {
    session.update({ pane: next });
    if (focus) tabs.current?.querySelector<HTMLElement>(`#${tabId(next)}`)?.focus();
  };
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const at = PANES.indexOf(pane);
    const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: PANES.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    choose(PANES[(to + PANES.length) % PANES.length]!, true);
  };
  const panelProps = (name: Pane) => ({
    className: `pane pane-${name}${checking && name !== 'logs' ? ' is-checking' : ''}`,
    role: 'tabpanel',
    id: panelId(name),
    'aria-labelledby': tabId(name),
    tabIndex: 0,
  });
  const count = (name: Pane) => (name === 'errors' ? diagnostics : name === 'logs' ? logs : null);

  return (
    <>
      <div ref={tabs} className="pane-tabs" role="tablist" aria-label={words.label} onKeyDown={onKeyDown} data-req="008-typescript-playground-FR-020 008-typescript-playground-FR-064">
        {PANES.map((name) => (
          <button key={name} type="button" role="tab" id={tabId(name)} className="pane-tab" aria-selected={pane === name} aria-controls={panelId(name)} tabIndex={pane === name ? 0 : -1} onClick={() => choose(name, false)}>
            {words[name]}
            {count(name) !== null && <span className={name === 'errors' && errors ? 'count is-error' : 'count'}>{count(name)}</span>}
          </button>
        ))}
      </div>
      {pane === 'javascript' && (
        <div {...panelProps('javascript')} data-req="008-typescript-playground-FR-021 008-typescript-playground-FR-023">
          <OutputPane key="javascript" kind="javascript" />
        </div>
      )}
      {pane === 'declarations' && (
        <div {...panelProps('declarations')} data-req="008-typescript-playground-FR-021 008-typescript-playground-FR-023">
          <OutputPane key="declarations" kind="declarations" />
        </div>
      )}
      {pane === 'errors' && (
        <div {...panelProps('errors')} data-req="008-typescript-playground-FR-016 008-typescript-playground-FR-022">
          <ErrorsPane />
        </div>
      )}
      {pane === 'logs' && (
        <div {...panelProps('logs')} data-req="008-typescript-playground-FR-034 008-typescript-playground-FR-035 008-typescript-playground-FR-043 008-typescript-playground-FR-044 008-typescript-playground-FR-047">
          <LogsPane />
        </div>
      )}
    </>
  );
}
