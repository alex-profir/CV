// Languages and their fluency, in the CV document's order.
import type { ResumeLanguage } from '@cv/content';
import { present } from './join.tsx';

export const shownLanguages = (languages: ResumeLanguage[] | undefined) => (languages ?? []).filter((language) => present(language.language) || present(language.fluency));

export function Languages({ languages }: { languages: ResumeLanguage[] }) {
  return (
    <ul className="languages">
      {languages.map((language, index) => (
        <li key={index}>
          {present(language.language) && <span className="language">{language.language}</span>}{' '}
          {present(language.fluency) && <span className="fluency">{language.fluency}</span>}
        </li>
      ))}
    </ul>
  );
}
