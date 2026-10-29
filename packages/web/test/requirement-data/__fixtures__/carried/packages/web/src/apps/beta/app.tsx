import { BetaOne } from './BetaOne.tsx';
import { BetaTwo } from './BetaTwo.tsx';

export const betaApp = {
  id: 'beta',
  name: 'Beta',
  Content: (props: { narrow: boolean }) => (props.narrow ? <BetaOne /> : <BetaTwo />),
  menuItems: [{ key: 'one', 'data-req': '002-example-FR-011' }],
};
