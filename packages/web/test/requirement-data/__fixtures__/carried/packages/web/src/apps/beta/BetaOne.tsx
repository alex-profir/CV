import { useState } from 'react';
import { Shared } from '../../shared/Shared.tsx';

export function BetaOne() {
  const [value] = useState(0);
  return (
    <p data-req="002-example-FR-003">
      {value}
      <Shared />
    </p>
  );
}
