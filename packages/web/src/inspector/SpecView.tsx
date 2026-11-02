// A view's spec view (007 contracts/inspector.md The spec view): in place of
// the app's content, in the same scroller, a sticky bar with "Back to
// [view]" and "What's this?", the heading, the lede, the build line, then
// one group per spec once the requirement data is here. About this site's
// view is the shell's own.
import { useRef, useState } from 'react';
import type { Dispatch } from 'react';
import type { SiteData } from '@cv/content';
import type { OsAction, ViewId } from '@cv/os-core';
import { fill, siteText } from '../site-text.ts';
import { retry, useRequirements } from './data.ts';
import { deriveView } from './derive.ts';
import { BuildLine, FailedNote, OfflineNote, UncommittedNote, useOffline } from './Notes.tsx';
import { SpecGroup } from './SpecGroup.tsx';
import { WhatsThisButton, WhatsThisPanel } from './WhatsThis.tsx';

export function SpecView({ view, name, siteData, dispatch }: { view: ViewId; name: string; siteData: SiteData; dispatch: Dispatch<OsAction> }) {
  const text = siteText.inspector;
  const requirements = useRequirements();
  const [whatsThis, setWhatsThis] = useState(false);
  const offline = useOffline();
  const heading = useRef<HTMLHeadingElement>(null);
  // "Try again" leaves with its note, so focus goes to the heading first.
  const onRetry = () => {
    heading.current?.focus();
    retry();
  };
  // About this site lists the shell's own requirements (FR-011).
  const title = view === 'about' ? text.shellName : name;
  const model = requirements.status === 'ready' ? deriveView(requirements.data, view, title) : null;
  const content = (
    <>
      <div className="spec-bar">
        <button type="button" className="spec-back" onClick={() => dispatch({ type: 'showApp', view })} data-req="007-requirement-inspector-FR-003 007-requirement-inspector-FR-017">
          {fill(text.back, { view: name })}
        </button>
        <WhatsThisButton view={view} open={whatsThis} onToggle={() => setWhatsThis((open) => !open)} />
      </div>
      <div className="spec-page">
        <WhatsThisPanel view={view} open={whatsThis} siteData={siteData} />
        <h1 ref={heading} className="spec-heading" tabIndex={-1} data-req="007-requirement-inspector-FR-017 007-requirement-inspector-FR-018">
          {fill(text.heading, { view: title })}
        </h1>
        <p className="spec-lede">{view === 'about' ? text.ledeShell : fill(text.ledeApp, { view: name })}</p>
        <p className="spec-build" data-req="007-requirement-inspector-FR-010 007-requirement-inspector-FR-013">
          {model !== null && <BuildLine model={model} siteData={siteData} />}
        </p>
        {model !== null && <UncommittedNote model={model} />}
        {offline && <OfflineNote />}
        {!offline && requirements.status === 'failed' && <FailedNote onRetry={onRetry} />}
        {model?.groups.map((group) => (
          <SpecGroup key={group.spec.feature} view={view} group={group} commit={model.version.commit} siteData={siteData} />
        ))}
      </div>
    </>
  );
  const label = fill(text.region, { view: title });
  // `data-req` is written out in each, so 001 reads it: About this site's
  // view is the shell's own (FR-011, FR-012).
  return view === 'about' ? (
    <section
      className="spec-view"
      aria-label={label}
      data-view={view}
      data-req="007-requirement-inspector-FR-002 007-requirement-inspector-FR-006 007-requirement-inspector-FR-011 007-requirement-inspector-FR-012 007-requirement-inspector-FR-018 007-requirement-inspector-FR-020 007-requirement-inspector-FR-024"
    >
      {content}
    </section>
  ) : (
    <section
      className="spec-view"
      aria-label={label}
      data-view={view}
      data-req="007-requirement-inspector-FR-002 007-requirement-inspector-FR-006 007-requirement-inspector-FR-018 007-requirement-inspector-FR-020 007-requirement-inspector-FR-024"
    >
      {content}
    </section>
  );
}
