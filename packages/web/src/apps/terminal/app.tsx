// The Terminal's declaration (006 contracts/shell.md): both shells, nothing
// needed from the network, focus into the command line on opening, its own
// window title and menu item, and its session emptied when it closes
// (FR-001, FR-003, FR-004, FR-021).
import { useSyncExternalStore } from 'react';
import type { App } from '../index.ts';
import { fill, siteText } from '../../site-text.ts';
import { formatPrompt } from './engine/output-map.ts';
import { session } from './session.ts';
import type { AppProps } from '../index.ts';
import { Pocket } from './Pocket.tsx';
import { Terminal } from './Terminal.tsx';
import { TerminalIcon } from './TerminalIcon.tsx';

// `Terminal — ~/work`, or `Terminal — vim` while the vim view is open (FR-046).
function WindowTitle() {
  const state = useSyncExternalStore(session.subscribe, session.get, session.get);
  const path = state.vim === null ? formatPrompt(state.cwd) : siteText.terminal.vimTitle;
  return <span data-req="006-terminal-FR-046">{fill(siteText.terminal.windowTitle, { name: siteText.os.views.terminal, path })}</span>;
}

// `Clear output`: once the menu has closed and given focus back to its
// title, the command line takes it (FR-019).
function clearOutput() {
  session.clear();
  requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#os .terminal input.command-line')?.focus({ preventScroll: true }));
}

export const terminalApp: App = {
  id: 'terminal',
  name: siteText.os.views.terminal,
  shells: ['desktop', 'mobile'],
  needsNetwork: false,
  Icon: TerminalIcon,
  // On a phone, the pocket terminal around it (FR-024).
  Content: (props: AppProps) => (props.os.shell === 'mobile' ? <Pocket {...props} /> : <Terminal {...props} />),
  focusOnOpen: '.terminal [data-focus-home]',
  WindowTitle,
  menuItems: [{ key: 'clear', label: siteText.terminal.clearOutput, run: clearOutput, 'data-req': '006-terminal-FR-003 006-terminal-FR-019' }],
  onClose: session.reset,
};
