// Registers the service worker that keeps a copy of the site for offline
// visits (004 research R4, contracts/site.md Service worker). It runs after
// the page has loaded, so it never delays the CV. A browser without service
// workers, or one that refuses the registration (some private modes), gets
// the site online as before: the failure is ignored, and nothing is shown or
// logged (FR-041).
const WORKER_URL = '/sw.js';

const SCOPE = '/';

function register(): void {
  try {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register(WORKER_URL, { scope: SCOPE }).catch(() => undefined);
  } catch {
    // Reading `navigator.serviceWorker` itself throws where storage is
    // blocked.
  }
}

if (document.readyState === 'complete') register();
else window.addEventListener('load', register, { once: true });
