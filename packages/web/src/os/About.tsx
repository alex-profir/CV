// About this site (005 contracts/shell.md Shared, FR-038): what the site is,
// a link to /cv and one to the repository, and on the desktop the keyboard
// shortcuts with their notes (FR-029). The name comes from the CV document.
import type { Resume, SiteData } from '@cv/content';
import { SHORTCUTS, shortcutLabel } from '@cv/os-core';
import { Arrow } from '../cv/Arrow.tsx';
import { siteName } from '../format/meta.ts';
import { fill, siteText } from '../site-text.ts';

type CommandId = keyof typeof siteText.about.commands;

export function About({ resume, siteData, withShortcuts, mac }: { resume: Resume; siteData: SiteData; withShortcuts: boolean; mac: boolean }) {
  const repository = siteData.repository;
  return (
    <div className="about-view" data-req="005-os-shell-FR-038">
      <h1>{siteText.about.heading}</h1>
      <p>{fill(siteText.about.paragraph, { name: siteName(resume) })}</p>
      <div className="about-links">
        <a href="/cv" className="standalone">
          {siteText.about.cvPage}
          <Arrow kind="right" />
        </a>
        {repository !== undefined && repository !== '' && (
          <a href={repository} className="standalone">
            {siteText.about.source}
            <Arrow kind="up-right" />
          </a>
        )}
      </div>
      {withShortcuts && (
        <div className="about-shortcuts" data-req="005-os-shell-FR-029">
          <h2>{siteText.about.shortcutsHeading}</h2>
          <dl className="shortcuts">
            {SHORTCUTS.map((shortcut) => (
              <div key={shortcut.id} className="shortcut">
                <dt>
                  <kbd>{shortcutLabel(shortcut, mac)}</kbd>
                </dt>
                <dd>{siteText.about.commands[shortcut.id as CommandId]}</dd>
              </div>
            ))}
          </dl>
          {siteText.about.notes.map((note) => (
            <p key={note} className="note">
              {note}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
