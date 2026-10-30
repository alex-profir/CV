// One requirement in a spec view (007 contracts/inspector.md): its full ID
// for assistive technology, its short ID as shown, its text, the link to
// its line in the spec, and the tests that cover it, each linked to its
// line, or a note that none does yet.
import type { RequirementRecord } from '../../scripts/requirements/index.ts';
import { Arrow } from '../cv/Arrow.tsx';
import { fileUrl } from '../format/repository.ts';
import { fill, siteText } from '../site-text.ts';
import { NoTestsMark } from './glyphs/NoTestsMark.tsx';
import { InlineText } from './InlineText.tsx';
import type { InlineLinks } from './InlineText.tsx';

// A test's name, or what stands for it when its title is built at run time.
const testName = (name: string) => (name.trim() === '' ? siteText.inspector.unnamedTest : name);

export function Requirement({ requirement, file, links }: { requirement: RequirementRecord; file: string; links: InlineLinks }) {
  const text = siteText.inspector;
  const { repository, commit } = links;
  const linked = repository !== undefined && repository !== '';
  const { tests } = requirement;
  const specLine = fill(text.inTheSpec, { line: requirement.line });
  return (
    <li className="requirement" data-id={requirement.fullId} data-req="007-requirement-inspector-FR-007 007-requirement-inspector-FR-008">
      <span className="visually-hidden">{requirement.fullId}</span>
      <span className="short-id" aria-hidden="true">
        {requirement.id}
      </span>
      <div className="requirement-body">
        <p className="requirement-text">
          <InlineText nodes={requirement.text} links={links} />
        </p>
        {linked ? (
          <a className="spec-line" href={fileUrl(repository, commit, file, requirement.line)} data-req="007-requirement-inspector-FR-010">
            {specLine}
            <Arrow kind="up-right" />
          </a>
        ) : (
          <span className="spec-line">{specLine}</span>
        )}
        <p className="tests-label">{tests.length === 0 ? text.tests : fill(text.testsCount, { n: tests.length })}</p>
        {tests.length === 0 ? (
          <p className="no-tests">
            <NoTestsMark />
            {text.noTests}
          </p>
        ) : (
          <ul className="tests">
            {tests.map((test) => (
              <li key={`${test.file}:${test.line}`}>
                {linked ? (
                  <a className="test-name" href={fileUrl(repository, commit, test.file, test.line)} data-req="007-requirement-inspector-FR-010">
                    {testName(test.name)}
                  </a>
                ) : (
                  <span className="test-name">{testName(test.name)}</span>
                )}{' '}
                <span className="test-place">
                  {test.file}:{test.line}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
