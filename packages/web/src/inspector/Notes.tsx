// The spec view's build line and notes (007 contracts/inspector.md): the
// counts and the commit the site was built from, linked to it, then, in a
// build from a copy with uncommitted changes, a note that the links lead to
// the last commit, and, offline, a note that the links to GitHub need a
// connection (research R12). If the requirement data didn't load while
// online, a note says so, with a way to try again. Notes are never live
// regions.
import { useSyncExternalStore } from 'react';
import type { SiteData } from '@cv/content';
import { Arrow } from '../cv/Arrow.tsx';
import { commitUrl } from '../format/repository.ts';
import { counted, fill, siteText } from '../site-text.ts';
import type { SpecViewModel } from './derive.ts';
import { CommitGlyph } from './glyphs/CommitGlyph.tsx';
import { OfflineGlyph } from './glyphs/OfflineGlyph.tsx';

export function BuildLine({ model, siteData }: { model: SpecViewModel; siteData: SiteData }) {
  const text = siteText.inspector;
  const repository = siteData.repository;
  return (
    <>
      {fill(counted(text.requirements, model.total), { n: model.total })}
      {text.separator}
      {fill(counted(text.specs, model.groups.length), { n: model.groups.length })}
      {text.separator}
      {text.builtFrom}{' '}
      {repository === undefined || repository === '' ? (
        <span className="build-commit">{model.version.short}</span>
      ) : (
        <a className="build-commit" href={commitUrl(repository, model.version.commit)} data-req="007-requirement-inspector-FR-010 007-requirement-inspector-FR-013">
          {model.version.short}
          <Arrow kind="up-right" />
        </a>
      )}
    </>
  );
}

export function UncommittedNote({ model }: { model: SpecViewModel }) {
  if (!model.version.dirty) return null;
  return (
    <p className="spec-note note-uncommitted" data-req="007-requirement-inspector-FR-010">
      <CommitGlyph />
      <span>{fill(siteText.inspector.uncommitted, { commit: model.version.short })}</span>
    </p>
  );
}

const subscribeOnline = (listener: () => void) => {
  addEventListener('online', listener);
  addEventListener('offline', listener);
  return () => {
    removeEventListener('online', listener);
    removeEventListener('offline', listener);
  };
};

// Whether the browser says it is offline, following its events.
export function useOffline(): boolean {
  return useSyncExternalStore(subscribeOnline, () => !navigator.onLine, () => false);
}

export function FailedNote({ onRetry }: { onRetry: () => void }) {
  return (
    <p className="spec-note note-failed">
      <span>{siteText.inspector.loadFailed}</span>
      <button type="button" className="spec-retry" onClick={onRetry}>
        {siteText.inspector.retry}
      </button>
    </p>
  );
}

export function OfflineNote() {
  return (
    <p className="spec-note note-offline" data-req="007-requirement-inspector-FR-027">
      <OfflineGlyph />
      <span>{siteText.inspector.offline}</span>
    </p>
  );
}
