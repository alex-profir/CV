// The home screen (005 contracts/shell.md Mobile shell, FR-031, FR-035):
// the site's name, one icon per app that declares the phone, in APPS order,
// and About this site. While an app is open it is inert, so neither the
// keyboard nor a screen reader reaches it behind the app.
import { appsFor } from '@cv/os-core';
import type { ViewId } from '@cv/os-core';
import { InfoGlyph } from '../../os/icons/InfoGlyph.tsx';
import type { ShellProps } from '../../os/shell-props.ts';
import { siteName } from '../../format/meta.ts';
import { siteText } from '../../site-text.ts';

export function HomeScreen({ state, dispatch, apps, resume }: ShellProps) {
  const open = (view: ViewId) => dispatch({ type: 'mobileOpen', view });
  return (
    <section
      className="home"
      aria-label={siteText.mobile.homeScreen}
      inert={state.mobile.open !== null}
      data-req="005-os-shell-FR-031 005-os-shell-FR-035 005-os-shell-FR-039 005-os-shell-FR-066"
    >
      <p className="site-name">{siteName(resume)}</p>
      <ul className="app-grid" data-req="005-os-shell-FR-003">
        {appsFor(apps, 'mobile').map((app) => {
          const Icon = app.Icon;
          return (
            <li key={app.id}>
              <button type="button" className="app-icon" data-view={app.id} onClick={() => open(app.id as ViewId)} data-req="005-os-shell-FR-032">
                <span className="app-icon-image">
                  <Icon />
                </span>
                <span className="app-icon-name">{app.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="home-foot">
        <button type="button" className="about" data-view="about" onClick={() => open('about')} data-req="005-os-shell-FR-038">
          <InfoGlyph />
          {siteText.mobile.about}
        </button>
      </div>
    </section>
  );
}
