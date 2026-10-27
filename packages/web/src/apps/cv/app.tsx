// The CV app's declaration (005 data-model.md App declaration): both
// shells, and nothing it needs from the network (Constitution VI).
import type { App } from '../index.ts';
import { siteText } from '../../site-text.ts';
import { CvApp } from './CvApp.tsx';
import { CvIcon } from './CvIcon.tsx';

export const cvApp: App = {
  id: 'cv',
  name: siteText.os.views.cv,
  shells: ['desktop', 'mobile'],
  needsNetwork: false,
  Icon: CvIcon,
  Content: CvApp,
};
