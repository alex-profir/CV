// The Playground's window content on the desktop (contracts/playground.md):
// the download until TypeScript is ready, then the toolbar, the message, the
// editor beside the panes, and the status bar. Everything it shows lives in
// the session and the controller, outside React, so unmounting it for Show
// specs or a shell switch loses nothing (FR-005, FR-061).
import { Component, useEffect, useRef, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { siteText } from '../../site-text.ts';
import type { Resume } from '@cv/content';
import { currentEngine, onEngine, readAddressLink, setCvDocument, setEditorView, startEngine } from './controller.ts';
import { ExamplesPanel } from './ExamplesPanel.tsx';
import { Loading } from './Loading.tsx';
import { emptyLogBook } from './logbook.ts';
import { Message } from './Message.tsx';
import { OptionsPanel } from './OptionsPanel.tsx';
import { Panes } from './Panes.tsx';
import { Popups } from './Popups.tsx';
import { session, useSession } from './session.ts';
import { StatusBar } from './StatusBar.tsx';
import { onMac } from './text.ts';
import { Toolbar } from './Toolbar.tsx';

const words = siteText.playground;

const engineReady = () => currentEngine() !== null;

// The engine's manifest and size, as the page writes them on `#os`
// (contracts/site.md step 4).
function engineAssets(): { manifest: string; bytes: number } | null {
  const os = document.getElementById('os');
  const manifest = os?.dataset['playground'];
  if (manifest === undefined || manifest === '') return null;
  return { manifest, bytes: Number(os?.dataset['playgroundBytes'] ?? 0) };
}

// Monaco's editor for the code. It takes focus when it first appears only
// if focus is still in the Playground's window (FR-004), and gives its view
// state to the session when it unmounts (FR-005).
function Editor() {
  const element = useRef<HTMLDivElement>(null);
  const checking = useSession((state) => state.checking);
  useEffect(() => {
    const engine = currentEngine();
    const host = element.current;
    if (engine === null || host === null) return undefined;
    const description = onMac() ? words.editor.description.mac : words.editor.description.other;
    const view = engine.mountEditor(host, session.get().viewState, description);
    host.querySelector('textarea')?.setAttribute('data-focus-home', '');
    setEditorView(view);
    const window = host.closest('.window, .full-screen');
    if (window !== null && window.contains(document.activeElement)) view.focus();
    return () => {
      session.update({ viewState: view.saveViewState() });
      setEditorView(null);
      view.dispose();
    };
  }, []);
  return (
    <div
      ref={element}
      className={checking ? 'playground-editor is-checking' : 'playground-editor'}
      data-req="008-typescript-playground-FR-015 008-typescript-playground-FR-016 008-typescript-playground-FR-017 008-typescript-playground-FR-018 008-typescript-playground-FR-062 008-typescript-playground-FR-063 008-typescript-playground-FR-081 008-typescript-playground-FR-082 008-typescript-playground-FR-083 008-typescript-playground-FR-084"
    />
  );
}

function Workspace() {
  const panel = useSession((state) => state.panel);
  return (
    <>
      <Toolbar />
      {panel === 'examples' && <ExamplesPanel />}
      <Message />
      <div className="playground-body">
        <Editor />
        <div className="playground-side">{panel === 'options' ? <OptionsPanel /> : <Panes />}</div>
      </div>
      <StatusBar />
      <Popups />
    </>
  );
}

// A failure while rendering stays in this window: without this React would
// empty the whole of `#os` (FR-039, FR-040). Whatever went wrong may be in
// what the logs hold, so Try again starts them over.
class Contained extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="playground-loading" role="alert">
        <h2>{words.failed.heading}</h2>
        <p>{words.failed.text}</p>
        <button
          type="button"
          className="button primary playground-retry"
          onClick={() => {
            session.update({ logs: emptyLogBook() });
            this.setState({ failed: false });
          }}
        >
          {words.failed.retry}
        </button>
      </div>
    );
  }
}

export function Playground({ resume }: { resume: Resume }) {
  const ready = useSyncExternalStore(onEngine, engineReady, engineReady);
  // The code's `cv` is a copy of this document at each run (research R10).
  useEffect(() => setCvDocument(resume), [resume]);
  useEffect(() => {
    // A link opened on a phone opens once the shell widens (FR-061).
    readAddressLink();
    const assets = engineAssets();
    if (assets !== null) startEngine({ ...assets, mac: onMac() });
  }, []);
  return (
    <section
      className={ready ? 'playground' : 'playground is-loading'}
      aria-label={words.label}
      data-req="008-typescript-playground-FR-003 008-typescript-playground-FR-068 008-typescript-playground-FR-071 008-typescript-playground-FR-072 008-typescript-playground-FR-074"
    >
      <Contained>{ready ? <Workspace /> : <Loading />}</Contained>
    </section>
  );
}
