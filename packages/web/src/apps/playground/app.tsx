// The Playground's declaration (contracts/shell.md App declaration): both
// shells, nothing needed from the network to open (the engine downloads on
// the first desktop open), focus into the editor once it is ready, its own
// menu items, and the window's close ending what it showed (FR-001, FR-003,
// FR-004, FR-046).
import type { App, AppProps } from '../index.ts';
import { siteText } from '../../site-text.ts';
import { BestOnDesktop } from './BestOnDesktop.tsx';
import { closePlayground, currentEngine } from './controller.ts';
import { openOptionsPanel } from './OptionsPanel.tsx';
import { Playground } from './Playground.tsx';
import { PlaygroundIcon } from './PlaygroundIcon.tsx';
import { session } from './session.ts';

const words = siteText.playground.menu;

export const playgroundApp: App = {
  id: 'playground',
  name: siteText.os.views.playground,
  shells: ['desktop', 'mobile'],
  needsNetwork: false,
  Icon: PlaygroundIcon,
  Content: (props: AppProps) => (props.os.shell === 'mobile' ? <BestOnDesktop /> : <Playground />),
  focusOnOpen: '.playground [data-focus-home]',
  menuItems: [
    { key: 'options', label: words.options, run: openOptionsPanel, 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-024' },
    {
      key: 'palette',
      label: words.palette,
      shortcut: 'F1',
      separatorBefore: true,
      disabled: () => currentEngine() === null,
      run: () => requestAnimationFrame(() => currentEngine()?.runCommand('editor.action.quickCommand')),
      'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-085',
    },
    { key: 'reset', label: words.reset, separatorBefore: true, separatorAfter: true, disabled: () => currentEngine() === null, run: () => session.update({ popup: 'reset' }), 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-080' },
  ],
  onClose: closePlayground,
};
