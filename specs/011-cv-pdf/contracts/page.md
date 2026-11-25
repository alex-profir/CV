# Contract: The Download Row on /cv

**Feature**: [spec.md](../spec.md) | **Design**: [design/review.md](../design/review.md) |
**Research**: [research.md](../research.md) (R6, R10, R11)

This amends 004's `contracts/page.md` "/cv structure": the intro's contact block gains one last
row. Nothing else on the page changes.

## Markup

The last child of `.contact-block`, after the profiles list. When the CV document has no contact
rows or profiles, `.contact-block` (and `.intro-body`) still render, holding the row alone.

```html
<div class="contact-row download" data-site-element=""
     data-req="011-cv-pdf-FR-001 011-cv-pdf-FR-002 011-cv-pdf-FR-003 011-cv-pdf-FR-004 011-cv-pdf-FR-006">
  <span class="contact-label" aria-hidden="true">CV</span>
  <a class="contact-link" href="/cv.pdf" download="Alex-Profir-CV.pdf">Download PDF<svg class="arrow arrow-down" aria-hidden="true" focusable="false" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M5 1v8M1.5 5.5 5 9l3.5-3.5"></path></svg></a>
</div>
```

- The texts come from `siteText.download`. `download` is `downloadName(resume.basics?.name)`
  ([data-model.md](../data-model.md) File name).
- No `target`, no `rel`, no `type`: a same-site link that opens nowhere new.
- It is inside `<main>`, the only `[data-site-element]` there (FR-006). The footer stays outside
  `main`.
- Styles: the contact rows' existing rules. `print.css` hides `[data-site-element]`, so the row is
  absent from print and from the PDF (FR-004).
- Only `/cv` renders it. The OS shell's CV app and the Terminal render no such row and offer no
  command (FR-005).

## Accessibility

- Accessible name: `Download PDF`. The label `CV` is `aria-hidden`.
- It is reached by Tab in reading order, after the last profile link and before the first link
  in the sections. It shows the site's focus ring. Enter activates it (US1 scenario 4).
- At 320 px, at 200% text and in forced colors, it wraps and stays usable like the other contact
  rows (004 FR-020, FR-021, FR-030).

## Script behavior (progressive enhancement)

The page's one script, the service worker registration (`/assets/register-sw-<hash>.js`), also
installs one document `click` listener (research R6):

| Condition | Behavior |
|---|---|
| Not a primary click, a modifier key held, or the event already handled | Nothing: the browser's default |
| Target is not inside `a[download]` with a same-origin `http(s)` address | Nothing |
| No service worker controls the page | Nothing: the plain link downloads from the network |
| Otherwise | Prevent the default and `fetch(href)` through the worker. On success, save the body through a temporary `a[download=<same name>]` on a `blob:` URL, then revoke it. On a failed fetch, start the plain download of `href`, so the browser shows its own failure (FR-032) |

With scripting off, none of this runs, and the plain link is the whole feature (FR-002).
