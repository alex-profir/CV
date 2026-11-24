// The download link through the service worker (011 research R6,
// contracts/page.md). Chromium sends a plain `a[download]` straight to the
// network, past the worker, so offline it fails. When a worker controls the
// page, a primary click on a same-origin download link fetches the file
// instead, through the worker, and saves it under the link's name. When the
// fetch fails, the plain download runs, so the browser shows its own
// failure (FR-032). With no worker, or scripting off, the link is plain
// HTML.

// How long the saved file's `blob:` address lives: long enough for the
// browser to start writing it.
const REVOKE_AFTER_MS = 30_000;

// Starts a download of `href` under `name`. The link isn't in the document,
// so its click doesn't reach the listener below.
function save(href: string, name: string): void {
  const link = document.createElement('a');
  link.href = href;
  link.download = name;
  link.click();
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest('a[download]') : null;
  if (!(link instanceof HTMLAnchorElement)) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin || (url.protocol !== 'https:' && url.protocol !== 'http:')) return;
  try {
    if (!navigator.serviceWorker?.controller) return;
  } catch {
    // Reading `navigator.serviceWorker` throws where storage is blocked.
    return;
  }
  event.preventDefault();
  const name = link.download;
  fetch(url).then(
    async (response) => {
      if (!response.ok) throw new Error(`${response.status}`);
      const blob = URL.createObjectURL(await response.blob());
      save(blob, name);
      setTimeout(() => URL.revokeObjectURL(blob), REVOKE_AFTER_MS);
    },
  ).catch(() => save(url.href, name));
});
