// The Playground's declaration (contracts/shell.md App declaration): both
// shells, nothing needed from the network to open (the engine downloads on
// the first desktop open), focus into the editor once it is ready, its own
// menu items, and the window's close ending what it showed (FR-001, FR-003,
// FR-004, FR-046).
import type { App, AppProps } from '../index.ts';
import { siteText } from '../../site-text.ts';
import { BestOnDesktop } from './BestOnDesktop.tsx';
import { canStop, closePlayground, currentEngine, runCode, shareCode, stopCode } from './controller.ts';
import { openExamplesPanel } from './ExamplesPanel.tsx';
import { openOptionsPanel } from './OptionsPanel.tsx';
import { KEY_COMMANDS } from './keys.ts';
import { Playground } from './Playground.tsx';
import { PlaygroundIcon } from './PlaygroundIcon.tsx';
import { session } from './session.ts';
import { onMac } from './text.ts';

const words = siteText.playground.menu;

// Run's key, as the list of keys gives it for the visitor's system.
const runKey = () => KEY_COMMANDS.find((command) => command.id === 'playground.run')!.keys[onMac() ? 'mac' : 'other'][0]!;

export const playgroundApp: App = {
  id: 'playground',
  name: siteText.os.views.playground,
  shells: ['desktop', 'mobile'],
  needsNetwork: false,
  Icon: PlaygroundIcon,
  Content: (props: AppProps) => (props.os.shell === 'mobile' ? <BestOnDesktop /> : <Playground resume={props.resume} />),
  focusOnOpen: '.playground [data-focus-home]',
  menuItems: [
    { key: 'run', label: words.run, shortcut: runKey, disabled: () => currentEngine() === null, run: runCode, 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-032' },
    { key: 'stop', label: words.stop, disabled: () => !canStop(), run: stopCode, 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-038' },
    { key: 'examples', label: words.examples, separatorBefore: true, disabled: () => currentEngine() === null, run: openExamplesPanel, 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-027' },
    { key: 'options', label: words.options, run: openOptionsPanel, 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-024' },
    { key: 'share', label: words.share, disabled: () => currentEngine() === null, run: () => void shareCode(), 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-052' },
    {
      key: 'palette',
      label: words.palette,
      shortcut: 'F1',
      separatorBefore: true,
      disabled: () => currentEngine() === null,
      run: () => requestAnimationFrame(() => currentEngine()?.runCommand('editor.action.quickCommand')),
      'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-085',
    },
    { key: 'keys', label: words.keys, run: () => session.update({ popup: 'keys' }), 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-085' },
    { key: 'reset', label: words.reset, separatorBefore: true, separatorAfter: true, disabled: () => currentEngine() === null, run: () => session.update({ popup: 'reset' }), 'data-req': '008-typescript-playground-FR-003 008-typescript-playground-FR-080' },
  ],
  onClose: closePlayground,
};
