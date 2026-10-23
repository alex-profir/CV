// The basics block (contracts/page.md /cv structure): the role, the name as
// the page's one h1, the summary, and the contact rows and profiles. A row,
// label or list is left out when its field is (FR-004).
import type { ResumeBasics, ResumeProfile } from '@cv/content';
import { locationLine } from '../format/location.ts';
import { siteText } from '../site-text.ts';
import { Arrow } from './Arrow.tsx';
import { CvLink, withoutScheme } from './CvLink.tsx';
import { VisuallyHidden } from './VisuallyHidden.tsx';
import { present } from './join.tsx';

// A profile's shown text: the username, or the address without its scheme
// when there's none, as the website row shows it. The network is the row's
// label, or the text itself when there's neither.
function Profile({ profile }: { profile: ResumeProfile }) {
  const { network, username, url } = profile;
  const text = present(username) ? username! : present(url) ? withoutScheme(url!) : network!;
  const labelled = present(network) && (present(username) || present(url));
  // The network joins the text in the accessible name, as
  // `siteText.profileLabel` gives it, through visually hidden text.
  const prefix = labelled ? siteText.profileLabel.split('{username}')[0]!.replace('{network}', network!) : '';
  const content = (
    <>
      {prefix !== '' && <VisuallyHidden>{prefix}</VisuallyHidden>}
      {text}
    </>
  );
  return (
    <li className="contact-row">
      {labelled && (
        <span className="contact-label" aria-hidden="true">
          {network}
        </span>
      )}
      {present(url) ? (
        <CvLink href={url!} className="contact-link">
          {content}
          <Arrow kind="up-right" />
        </CvLink>
      ) : (
        <span className="contact-value">{content}</span>
      )}
    </li>
  );
}

export function Intro({ basics }: { basics: ResumeBasics }) {
  const { label, name, summary, email, url } = basics;
  const location = basics.location === undefined ? null : locationLine(basics.location);
  const profiles = (basics.profiles ?? []).filter((profile) => present(profile.username) || present(profile.network) || present(profile.url));
  const rows = location !== null || present(email) || present(url);
  const contact = rows || profiles.length > 0;
  return (
    <div className="intro" data-req="004-cv-page-FR-003 004-cv-page-FR-007 004-cv-page-FR-022">
      {present(label) && <p className="role">{label}</p>}
      <h1 data-req="004-cv-page-FR-023">{present(name) ? name : siteText.siteHeading}</h1>
      {(present(summary) || contact) && (
        <div className="intro-body">
          {present(summary) && <p className="summary">{summary}</p>}
          {contact && (
            <div className="contact-block">
              {rows && (
                <dl className="contact">
                  {location !== null && (
                    <div className="contact-row">
                      <dt className="contact-label">{siteText.basedIn}</dt>
                      <dd className="contact-value location" data-req="004-cv-page-FR-008">
                        {location}
                      </dd>
                    </div>
                  )}
                  {present(email) && (
                    <div className="contact-row">
                      <dt className="contact-label">{siteText.email}</dt>
                      <dd className="contact-value">
                        <CvLink href={`mailto:${email}`} className="contact-link">
                          {email}
                        </CvLink>
                      </dd>
                    </div>
                  )}
                  {present(url) && (
                    <div className="contact-row">
                      <dt className="contact-label">{siteText.website}</dt>
                      <dd className="contact-value">
                        <CvLink href={url!} className="contact-link">
                          {withoutScheme(url!)}
                          <Arrow kind="up-right" />
                        </CvLink>
                      </dd>
                    </div>
                  )}
                </dl>
              )}
              {profiles.length > 0 && (
                <ul className="profiles">
                  {profiles.map((profile, index) => (
                    <Profile key={index} profile={profile} />
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
