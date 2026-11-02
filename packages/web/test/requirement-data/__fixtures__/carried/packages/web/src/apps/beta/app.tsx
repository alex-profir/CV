import { wide } from '../../shared/Shared.tsx';
import { BetaOne } from './BetaOne.tsx';
import { BetaTwo } from './BetaTwo.tsx';

export const betaApp = {
  id: 'beta',
  name: 'Beta',
  Content: (props: { narrow: boolean }) => (!wide(props) ? <BetaOne /> : <BetaTwo />),
  // A nested object's `id` isn't the app's.
  menuItems: [{ key: 'one', id: 'nested', 'data-req': '002-example-FR-011' }],
};
