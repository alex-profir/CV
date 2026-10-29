// One spec's group in a spec view (007 contracts/inspector.md): its number,
// title and status, how many of its requirements the view doesn't list,
// the link to the spec, and the requirements it does list.
import type { SiteData } from '@cv/content';
import type { ViewId } from '@cv/os-core';
import { fileUrl } from '../format/repository.ts';
import { counted, fill, siteText } from '../site-text.ts';
import type { SpecGroupModel } from './derive.ts';
import { Requirement } from './Requirement.tsx';
import { Arrow } from '../cv/Arrow.tsx';

export function SpecGroup({ view, group, commit, siteData }: { view: ViewId; group: SpecGroupModel; commit: string; siteData: SiteData }) {
  const { spec, requirements, notShown } = group;
  const text = siteText.inspector;
  const headingId = `spec-${view}-${spec.number}`;
  const status = spec.status === 'Approved' ? 'approved' : 'draft';
  const repository = siteData.repository;
  return (
    <section className="spec-group" aria-labelledby={headingId} data-feature={spec.feature} data-req="007-requirement-inspector-FR-006">
      <h2 id={headingId}>
        <span className="spec-number">{spec.number}</span> <span className="spec-title">{spec.title}</span>{' '}
        <span className="status" data-status={status}>
          <span className="visually-hidden">{text.statusSeparator}</span>
          {status === 'approved' ? text.approved : text.draft}
        </span>
      </h2>
      {notShown > 0 && <p className="not-shown">{fill(counted(text.notShown, notShown), { n: notShown })}</p>}
      {repository === undefined || repository === '' ? (
        <span className="open-spec">{text.openSpec}</span>
      ) : (
        <a className="open-spec" href={fileUrl(repository, commit, spec.file)} data-req="007-requirement-inspector-FR-010">
          {text.openSpec}
          <Arrow kind="up-right" />
        </a>
      )}
      <ul className="requirements">
        {requirements.map((requirement) => (
          <Requirement key={requirement.fullId} requirement={requirement} file={spec.file} links={{ repository, commit }} />
        ))}
      </ul>
    </section>
  );
}
