// The download and offline states (FR-007, FR-011, FR-065, FR-069): what
// downloads and why, its progress against the engine's size, and Retry when
// the network is gone. The editor appears only once the download is
// complete.
import { fill, siteText } from '../../site-text.ts';
import { retryDownload } from './controller.ts';
import { DownloadGlyph, OfflineGlyph } from './Glyphs.tsx';
import { useSession } from './session.ts';
import { megabytes } from './text.ts';

const words = siteText.playground.loading;

export function Loading() {
  const download = useSession((state) => state.download);
  if (download.kind === 'offline') {
    return (
      <div className="playground-loading" data-req="008-typescript-playground-FR-011 008-typescript-playground-FR-069">
        <OfflineGlyph />
        <h2>{download.stopped ? words.stopped : words.offline}</h2>
        <p>{download.stopped ? words.stoppedText : fill(words.offlineText, { total: megabytes(download.total) })}</p>
        <button type="button" className="button primary playground-retry" onClick={retryDownload} data-req="008-typescript-playground-FR-011">
          {words.retry}
        </button>
      </div>
    );
  }
  const received = download.kind === 'downloading' ? download.received : 0;
  const total = download.kind === 'downloading' ? download.total : 0;
  const progress = fill(words.progress, { received: megabytes(received), total: megabytes(total) });
  return (
    <div className="playground-loading" data-req="008-typescript-playground-FR-007 008-typescript-playground-FR-065 008-typescript-playground-FR-069">
      <DownloadGlyph />
      <h2>{words.downloading}</h2>
      <progress
        className="playground-progress"
        aria-label={words.progressName}
        aria-valuetext={total > 0 ? progress : undefined}
        max={total > 0 ? total : undefined}
        value={total > 0 ? received : undefined}
        data-req="008-typescript-playground-FR-007 008-typescript-playground-FR-065 008-typescript-playground-FR-069"
      />
      {total > 0 && (
        <p className="progress-text" aria-hidden="true">
          {progress}
        </p>
      )}
      <p>{words.downloadingText}</p>
    </div>
  );
}
