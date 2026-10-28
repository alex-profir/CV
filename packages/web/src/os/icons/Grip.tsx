// The resize grip on a window's bottom-right corner (005 design/mockup,
// FR-061, FR-044). Every edge resizes; only this corner shows it.
export function Grip() {
  return (
    <svg className="grip" viewBox="0 0 12 12" aria-hidden="true" focusable="false" data-req="005-os-shell-FR-044">
      <path d="M11 4l-7 7M11 8l-3 3" />
    </svg>
  );
}
