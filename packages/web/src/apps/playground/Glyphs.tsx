// The Playground's own glyphs, drawn for its design (design/mockup): the
// toolbar's, the marks that tell states apart by shape (FR-034, FR-070), and
// the loading state's. Each is `aria-hidden`; its control carries the name.

function Glyph({ className, viewBox, children }: { className: string; viewBox: string; children: React.ReactNode }) {
  return (
    <svg className={className} viewBox={viewBox} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export const RunGlyph = () => (
  <Glyph className="glyph glyph-filled" viewBox="0 0 16 16">
    <path d="M5 3.2v9.6L12.8 8z" />
  </Glyph>
);

export const StopGlyph = () => (
  <Glyph className="glyph glyph-filled" viewBox="0 0 16 16">
    <rect x="4" y="4" width="8" height="8" rx="1" />
  </Glyph>
);

export const ExamplesGlyph = () => (
  <Glyph className="glyph" viewBox="0 0 16 16">
    <path d="M2.5 3.5h4a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5h4z" />
  </Glyph>
);

export const OptionsGlyph = () => (
  <Glyph className="glyph" viewBox="0 0 16 16">
    <path d="M2.5 4.5h6M11.5 4.5h2M2.5 11.5h2M7.5 11.5h6" />
    <circle cx="10" cy="4.5" r="1.5" />
    <circle cx="6" cy="11.5" r="1.5" />
  </Glyph>
);

export const ShareGlyph = () => (
  <Glyph className="glyph" viewBox="0 0 16 16">
    <path d="M8 10V2.5M5 5.5l3-3 3 3" />
    <path d="M3.5 8.5v4.5h9V8.5" />
  </Glyph>
);

export const CopyGlyph = () => (
  <Glyph className="glyph" viewBox="0 0 16 16">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
    <path d="M10.5 3.5v-1h-8v8h1" />
  </Glyph>
);

export const ChevronGlyph = () => (
  <Glyph className="glyph chevron" viewBox="0 0 16 16">
    <path d="M4.5 6.5 8 10l3.5-3.5" />
  </Glyph>
);

export const CloseGlyph = () => (
  <Glyph className="glyph" viewBox="0 0 16 16">
    <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
  </Glyph>
);

export const ErrorMark = () => (
  <Glyph className="mark mark-error" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="5" />
    <path d="M4 4l4 4M8 4l-4 4" />
  </Glyph>
);

export const WarnMark = () => (
  <Glyph className="mark mark-warn" viewBox="0 0 12 12">
    <path d="M6 1.2 11 10.5H1z" />
    <path d="M6 5v2.5M6 9v.2" />
  </Glyph>
);

export const InfoMark = () => (
  <Glyph className="mark mark-info" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="5" />
    <path d="M6 5.5v3M6 3.6v.2" />
  </Glyph>
);

export const OkMark = () => (
  <Glyph className="mark mark-ok" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="5" />
    <path d="M3.8 6.2 5.3 7.7 8.3 4.6" />
  </Glyph>
);

export const RunningMark = () => (
  <Glyph className="mark mark-running" viewBox="0 0 12 12">
    <circle cx="6" cy="6" r="3.5" />
  </Glyph>
);

export const StoppedMark = () => (
  <Glyph className="mark mark-stopped" viewBox="0 0 12 12">
    <rect x="2.5" y="2.5" width="7" height="7" rx="1" />
  </Glyph>
);

export const DownloadGlyph = () => (
  <Glyph className="big-glyph" viewBox="0 0 48 48">
    <path d="M24 8v22M15 22l9 9 9-9" />
    <path d="M10 36v4h28v-4" />
  </Glyph>
);

export const OfflineGlyph = () => (
  <Glyph className="big-glyph" viewBox="0 0 48 48">
    <path d="M14 34h21a8 8 0 0 0 1-15.9A11 11 0 0 0 15 16a9 9 0 0 0-1 18z" />
    <path d="M10 10l28 28" />
  </Glyph>
);
