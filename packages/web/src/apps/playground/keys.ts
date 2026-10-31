// The editor's commands and keys (data-model.md Editor command and key,
// research R12, FR-083 to FR-085): what the list of keys shows, with VS
// Code's defaults beside the Playground's own and why any differs, and the
// keys the Playground never binds because a browser, the system or a screen
// reader keeps them. The commands' names are site text.
import { siteText } from '../../site-text.ts';

export type KeyCommand = {
  id: KeyCommandId;
  keys: { mac: string[]; other: string[] };
  vsCode: { mac: string[]; other: string[] };
  differs?: 'shell' | 'browser' | 'screen-reader' | 'not-vs-code';
  // The key a browser or screen reader keeps, for the note.
  kept?: { mac: string; other: string };
};

export type KeyCommandId = keyof typeof siteText.playground.keyLabels;

// A command's name in the list of keys.
export const keyLabel = (command: KeyCommand): string => siteText.playground.keyLabels[command.id];

const same = (mac: string[], other: string[]) => ({ keys: { mac, other }, vsCode: { mac, other } });

// In the list's order.
export const KEY_COMMANDS: readonly KeyCommand[] = Object.freeze([
  { id: 'playground.run', keys: { mac: ['Cmd+Enter'], other: ['Ctrl+Enter'] }, vsCode: { mac: [], other: [] }, differs: 'not-vs-code' },
  { id: 'editor.action.quickCommand', keys: { mac: ['F1'], other: ['F1'] }, vsCode: { mac: ['F1', 'Shift+Cmd+P'], other: ['F1', 'Ctrl+Shift+P'] }, differs: 'browser', kept: { mac: 'Shift+Cmd+P', other: 'Ctrl+Shift+P' } },
  { id: 'editor.action.triggerSuggest', ...same(['Ctrl+Space', 'Option+Escape'], ['Ctrl+Space']) },
  { id: 'editor.action.triggerParameterHints', ...same(['Shift+Cmd+Space'], ['Ctrl+Shift+Space']) },
  { id: 'editor.action.showHover', ...same(['Cmd+K Cmd+I'], ['Ctrl+K Ctrl+I']) },
  { id: 'editor.action.revealDefinition', ...same(['F12'], ['F12']) },
  { id: 'editor.action.peekDefinition', ...same(['Option+F12'], ['Alt+F12']) },
  { id: 'editor.action.goToReferences', ...same(['Shift+F12'], ['Shift+F12']) },
  { id: 'editor.action.rename', ...same(['F2'], ['F2']) },
  { id: 'editor.action.quickFix', ...same(['Cmd+.'], ['Ctrl+.']) },
  { id: 'editor.action.marker.next', ...same(['F8'], ['F8']) },
  { id: 'editor.action.marker.prev', ...same(['Shift+F8'], ['Shift+F8']) },
  { id: 'editor.action.formatDocument', ...same(['Shift+Option+F'], ['Shift+Alt+F']) },
  { id: 'editor.action.formatSelection', ...same(['Cmd+K Cmd+F'], ['Ctrl+K Ctrl+F']) },
  { id: 'editor.action.commentLine', ...same(['Cmd+/'], ['Ctrl+/']) },
  { id: 'actions.find', ...same(['Cmd+F'], ['Ctrl+F']) },
  { id: 'editor.action.startFindReplaceAction', ...same(['Option+Cmd+F'], ['Ctrl+H']) },
  { id: 'editor.action.gotoLine', ...same(['Ctrl+G'], ['Ctrl+G']) },
  { id: 'editor.action.quickOutline', ...same(['Shift+Cmd+O'], ['Ctrl+Shift+O']) },
  { id: 'editor.action.addSelectionToNextFindMatch', ...same(['Cmd+D'], ['Ctrl+D']) },
  { id: 'editor.action.moveLinesUpAction', ...same(['Option+Up'], ['Alt+Up']) },
  { id: 'editor.action.moveLinesDownAction', ...same(['Option+Down'], ['Alt+Down']) },
  { id: 'editor.action.copyLinesDownAction', ...same(['Shift+Option+Down'], ['Shift+Alt+Down']) },
  { id: 'editor.action.deleteLines', ...same(['Shift+Cmd+K'], ['Ctrl+Shift+K']) },
  { id: 'editor.action.smartSelect.expand', ...same(['Ctrl+Shift+Cmd+Right'], ['Shift+Alt+Right']) },
  { id: 'editor.fold', ...same(['Option+Cmd+['], ['Ctrl+Shift+[']) },
  { id: 'editor.unfold', ...same(['Option+Cmd+]'], ['Ctrl+Shift+]']) },
  { id: 'editor.action.toggleTabFocusMode', ...same(['Ctrl+Shift+M'], ['Ctrl+M']) },
  { id: 'playground.keys', ...same(['Option+F1'], ['Alt+F1']) },
]);

// Keys a page can't take or must leave alone (research R12), each with its
// source. The editor binds none of them.
export const RESERVED_KEYS: readonly { key: string; system: 'mac' | 'other' | 'both'; source: string }[] = Object.freeze([
  { key: 'Ctrl+Shift+P', system: 'other', source: 'Firefox: new private window' },
  { key: 'Shift+Cmd+P', system: 'mac', source: 'Firefox: new private window' },
  { key: 'Ctrl+T', system: 'other', source: 'Every browser: new tab' },
  { key: 'Cmd+T', system: 'mac', source: 'Every browser: new tab' },
  { key: 'Ctrl+N', system: 'other', source: 'Every browser: new window' },
  { key: 'Cmd+N', system: 'mac', source: 'Every browser: new window' },
  { key: 'Ctrl+W', system: 'other', source: 'Every browser: close the tab' },
  { key: 'Cmd+W', system: 'mac', source: 'Every browser: close the tab' },
  { key: 'Ctrl+Shift+N', system: 'other', source: 'Chrome and Edge: new incognito window' },
  { key: 'Shift+Cmd+N', system: 'mac', source: 'Chrome and Edge: new incognito window' },
  { key: 'Ctrl+Tab', system: 'both', source: 'Every browser: next tab' },
  { key: 'Ctrl+Shift+Tab', system: 'both', source: 'Every browser: previous tab' },
  { key: 'Cmd+Q', system: 'mac', source: 'macOS: quit the browser' },
  { key: 'Ctrl+L', system: 'other', source: 'Every browser: the address bar' },
  { key: 'Cmd+L', system: 'mac', source: 'Every browser: the address bar' },
  { key: 'Ctrl+Shift+I', system: 'other', source: "Chrome, Edge and Firefox: the developer tools" },
  { key: 'Option+Cmd+I', system: 'mac', source: "Chrome, Edge and Firefox: the developer tools" },
  { key: 'Ctrl+Shift+J', system: 'other', source: 'Chrome and Edge: the console' },
  { key: 'Option+Cmd+J', system: 'mac', source: 'Chrome and Edge: the console' },
  { key: 'Insert+F7', system: 'other', source: 'NVDA and JAWS: the elements list' },
  { key: 'Ctrl+Option+Space', system: 'mac', source: 'VoiceOver: activate' },
  { key: 'Ctrl+Option+Right', system: 'mac', source: 'VoiceOver: next item' },
  { key: 'Ctrl+Option+Left', system: 'mac', source: 'VoiceOver: previous item' },
]);

export const keysFor = (command: KeyCommand, mac: boolean): string[] => (mac ? command.keys.mac : command.keys.other);

export const vsCodeKeysFor = (command: KeyCommand, mac: boolean): string[] => (mac ? command.vsCode.mac : command.vsCode.other);

export const tabFocusKey = (mac: boolean) => (mac ? 'Ctrl+Shift+M' : 'Ctrl+M');
export const hoverKey = (mac: boolean) => (mac ? 'Cmd+K Cmd+I' : 'Ctrl+K Ctrl+I');
