// Skills, languages and interests (contracts/page.md): lists in the CV
// document's order. A skill's level is written as in the CV; the style sheet
// shows it in capitals.
import type { ResumeSkill } from '@cv/content';
import { Chips } from './Chips.tsx';
import { present } from './join.tsx';

export const shownSkills = (skills: ResumeSkill[] | undefined) => (skills ?? []).filter((skill) => present(skill.name) || present(skill.level) || present(skill.keywords));

export function Skills({ skills }: { skills: ResumeSkill[] }) {
  return (
    <ul className="skills">
      {skills.map((skill, index) => (
        <li key={index}>
          {(present(skill.name) || present(skill.level)) && (
            <p className="skill-head">
              {present(skill.name) && <span className="skill-name">{skill.name}</span>}{' '}
              {present(skill.level) && <span className="level">{skill.level}</span>}
            </p>
          )}
          <Chips items={skill.keywords} />
        </li>
      ))}
    </ul>
  );
}
