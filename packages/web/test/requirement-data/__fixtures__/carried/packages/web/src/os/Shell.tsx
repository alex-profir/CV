import { initialState } from '@cv/os-core';
import { Shared } from '../shared/Shared.tsx';

export function Shell({ apps }: { apps: readonly unknown[] }) {
  return (
    <main data-req="002-example-FR-006" data-count={apps.length} data-state={String(initialState)}>
      <Shared />
    </main>
  );
}
