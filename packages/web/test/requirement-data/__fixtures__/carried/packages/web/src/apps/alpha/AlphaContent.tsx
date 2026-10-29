import type { Props } from './types.tsx';
import { Shared } from '../../shared/Shared.tsx';
import { Helper } from './reexport.ts';

const n = 'FR-003';

export function AlphaContent(_props: Props) {
  return (
    <div data-req="002-example-FR-001">
      <Shared />
      <Helper />
      <span data-req={`002-example-${n}`} />
    </div>
  );
}
