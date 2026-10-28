// An app full screen (005 contracts/shell.md Mobile shell, research R11,
// FR-032 to FR-034): a header with Home and the app's name, which stays at
// the top, then the view, which scrolls on its own and is the CV's layout
// container. Reopened in the same visit, it is back where it was, set
// before the browser paints.
import { useEffect, useLayoutEffect, useRef } from 'react';
import type { ViewId } from '@cv/os-core';
import { HomeChevron } from '../../os/icons/HomeChevron.tsx';
import { animateIn } from '../../os/motion.ts';
import type { ShellProps } from '../../os/shell-props.ts';
import { View } from '../../os/View.tsx';
import { siteText } from '../../site-text.ts';

export const appTitleId = (view: string) => `app-title-${view}`;

export function FullScreenView({ view, state, apps, resume, siteData, mac, viewName, onHome, animate }: ShellProps & { view: ViewId; onHome: () => void; animate: boolean }) {
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
  return (
    <section ref={section} className="full-screen" aria-labelledby={appTitleId(view)} data-view={view} data-req="005-os-shell-FR-032 005-os-shell-FR-034">
      <header className="app-header">
        <button type="button" className="home-button" onClick={onHome} data-req="005-os-shell-FR-033 005-os-shell-FR-034">
          <HomeChevron />
          {siteText.mobile.home}
        </button>
        <div className="app-title" id={appTitleId(view)} tabIndex={-1} data-req="005-os-shell-FR-040">
          {viewName(view)}
        </div>
      </header>
      <div ref={content} className="view-content">
        <View view={view} apps={apps} resume={resume} siteData={siteData} shell="mobile" mac={mac} />
      </div>
    </section>
  );
}
