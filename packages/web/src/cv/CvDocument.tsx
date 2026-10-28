// The CV's body, shared by /cv and the shell's CV app (005 research R5): the
// basics block, then each supported section with at least one entry shown,
// in the design's order (004 FR-001). `as` is `main` on /cv and `div` in the
// shell, where the desktop area or the mobile shell is the page's main.
import type { ReactNode } from 'react';
import type { Resume } from '@cv/content';
import { Interests, shownInterests } from './Interests.tsx';
import { Intro } from './Intro.tsx';
import { Languages, shownLanguages } from './Languages.tsx';
import { Section } from './Section.tsx';
import { Skills, shownSkills } from './Skills.tsx';
import { Timeline, educationParts, projectParts, workParts } from './Timeline.tsx';
import type { EntryParts } from './Entry.tsx';
import { siteText } from '../site-text.ts';
import { SUPPORTED_SECTIONS } from '../supported.ts';
import type { SupportedSection } from '../supported.ts';

const entries = <T,>(list: T[] | undefined, parts: (entry: T) => EntryParts | null) =>
  (list ?? []).map(parts).filter((entry): entry is EntryParts => entry !== null);

// Each section's content, or null when it has nothing to show (FR-004).
function sectionContent(resume: Resume, section: SupportedSection): ReactNode | null {
  switch (section) {
    case 'work': {
      const shown = entries(resume.work, workParts);
      return shown.length === 0 ? null : <Timeline entries={shown} />;
    }
    case 'projects': {
      const shown = entries(resume.projects, projectParts);
      return shown.length === 0 ? null : <Timeline entries={shown} />;
    }
    case 'education': {
      const shown = entries(resume.education, educationParts);
      return shown.length === 0 ? null : <Timeline entries={shown} />;
    }
    case 'skills': {
      const shown = shownSkills(resume.skills);
      return shown.length === 0 ? null : <Skills skills={shown} />;
    }
    case 'languages': {
      const shown = shownLanguages(resume.languages);
      return shown.length === 0 ? null : <Languages languages={shown} />;
    }
    case 'interests': {
      const shown = shownInterests(resume.interests);
      return shown.length === 0 ? null : <Interests interests={shown} />;
    }
  }
}

export function CvDocument({ resume, as: Root }: { resume: Resume; as: 'main' | 'div' }) {
  const sections = SUPPORTED_SECTIONS.map((section) => ({ section, content: sectionContent(resume, section) })).filter(({ content }) => content !== null);
  return (
    <Root className="cv" data-req="004-cv-page-FR-001 004-cv-page-FR-014 004-cv-page-FR-025 004-cv-page-FR-027">
      <Intro basics={resume.basics ?? {}} />
      {sections.map(({ section, content }, index) => (
        <Section key={section} id={section} number={index + 1} heading={siteText.sections[section]}>
          {content}
        </Section>
      ))}
    </Root>
  );
}
