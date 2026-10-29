// An app full screen (005 contracts/shell.md Mobile shell, research R11,
// FR-032 to FR-034): a header with Home and the app's name, which stays at
// the top, then the view, which scrolls on its own and is the CV's layout
// container. Reopened in the same visit, it is back where it was, set
// before the browser paints. "Show specs" sits at the header's right
// while the view shows its app, and the title says when it shows its specs
// (007 contracts/inspector.md).
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ViewId } from '@cv/os-core';
import { ShowSpecs } from '../../inspector/ShowSpecs.tsx';
import { useSpecScroll } from '../../inspector/scroll.ts';
import { HomeChevron } from '../../os/icons/HomeChevron.tsx';
import { animateIn } from '../../os/motion.ts';
import type { ShellProps } from '../../os/shell-props.ts';
import { View } from '../../os/View.tsx';
import { siteText } from '../../site-text.ts';

export const appTitleId = (view: string) => `app-title-${view}`;

export function FullScreenView({ view, state, dispatch, apps, resume, siteData, mac, viewName, viewTitle, onHome, animate }: ShellProps & { view: ViewId; onHome: () => void; animate: boolean }) {
  const content = useRef<HTMLDivElement>(null);
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (animate) animateIn(section.current);
    // Only when the view opens.
  }, []);
  const saved = state.mobile.scroll[view] ?? 0;
  useLayoutEffect(() => {
    if (content.current !== null) content.current.scrollTop = saved;
    // Only when the view opens: later saves don't move an open view.
  }, [view]);
  const specs = state.specs[view];
  useSpecScroll(content, specs);
  const name = viewName(view);
  return (
    <section ref={section} className="full-screen" aria-labelledby={appTitleId(view)} data-view={view} data-req="005-os-shell-FR-032 005-os-shell-FR-034">
      <header className="app-header">
        <button type="button" className="home-button" onClick={onHome} data-req="005-os-shell-FR-033 005-os-shell-FR-034">
          <HomeChevron />
          {siteText.mobile.home}
        </button>
        <div className="app-title" id={appTitleId(view)} tabIndex={-1} data-req="005-os-shell-FR-040">
          {name}
          {/* Named `[view] · Specs`: the suffix shows in capitals, so it is
              read from the hidden text (007 contracts/inspector.md). */}
          {specs !== undefined && (
            <>
              <span className="visually-hidden">{viewTitle(view).slice(name.length)}</span>
              <span className="title-suffix" aria-hidden="true" data-req="007-requirement-inspector-FR-002">
                {siteText.inspector.headerSuffix}
              </span>
            </>
          )}
        </div>
        {specs === undefined && <ShowSpecs view={view} name={name} shell="mobile" dispatch={dispatch} />}
      </header>
      <div ref={content} className="view-content" data-req="005-os-shell-FR-034">
        <View view={view} apps={apps} resume={resume} siteData={siteData} shell="mobile" mac={mac} dispatch={dispatch} onHome={onHome} showingSpecs={specs !== undefined} name={name} />
      </div>
    </section>
  );
}
