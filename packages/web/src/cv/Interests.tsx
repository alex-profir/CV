// Interests, each with its keywords joined by site text's list separator.
import type { ResumeInterest } from '@cv/content';
import { siteText } from '../site-text.ts';
import { present } from './join.tsx';

export const shownInterests = (interests: ResumeInterest[] | undefined) => (interests ?? []).filter((interest) => present(interest.name) || present(interest.keywords));

export function Interests({ interests }: { interests: ResumeInterest[] }) {
  return (
    <ul className="interests">
      {interests.map((interest, index) => (
        <li key={index}>
          {present(interest.name) && <p className="interest-name">{interest.name}</p>}
          {present(interest.keywords) && <p className="interest-keywords">{interest.keywords!.filter(present).join(siteText.listSeparator)}</p>}
        </li>
      ))}
    </ul>
  );
}
