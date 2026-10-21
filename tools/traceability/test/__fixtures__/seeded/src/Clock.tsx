// Seeded UI source for the traceability check (SC-001). Each case is noted in a comment.
export function Clock({ ids }: { ids: string }) {
  return (
    <main>
      {/* Two valid IDs in one attribute, each checked on its own (FR-013). */}
      <time data-req="002-example-FR-001 002-example-FR-006">12:00</time>
      {/* A removed requirement (FR-017). */}
      <p data-req="002-example-FR-002">old</p>
      {/* No feature prefix (FR-018). */}
      <p data-req="FR-005">tick</p>
      {/* A spec directory that doesn't exist (FR-016). */}
      <p data-req="099-missing-FR-002">missing</p>
      {/* An empty value (FR-018). */}
      <p data-req="">empty</p>
      {/* A computed value can't be checked statically, so it's skipped. */}
      <p data-req={ids}>computed</p>
    </main>
  );
}

// An object property naming a requirement the spec doesn't define (FR-016).
export const props = { 'data-req': '002-example-FR-012' };
