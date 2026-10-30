// Two ARIA rules Monaco's lists break, which axe checks (FR-071): the
// command palette's options carry `aria-level`, which an option doesn't
// take; and the quick fixes' list holds its group headings as separators,
// which a listbox can't own. Each fix's name already says its group, so the
// headings leave the accessibility tree. Mended as Monaco draws its rows,
// under `root`, until the returned function is called.
export function mendListAria(root: Element): () => void {
  const mend = () => {
    for (const option of root.querySelectorAll('[role="option"][aria-level]')) option.removeAttribute('aria-level');
    for (const heading of root.querySelectorAll('[role="listbox"] [role="separator"]')) {
      heading.setAttribute('role', 'presentation');
      heading.setAttribute('aria-hidden', 'true');
      heading.removeAttribute('aria-setsize');
      heading.removeAttribute('aria-posinset');
    }
  };
  const observer = new MutationObserver(mend);
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['role', 'aria-level'] });
  mend();
  return () => observer.disconnect();
}
