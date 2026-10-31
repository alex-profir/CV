// The editor's commands and keys (data-model.md Editor command and key,
// research R12, FR-083 to FR-085): what the list of keys shows, with VS
// Code's defaults beside the Playground's own and why any differs, and the
// keys the Playground never binds because a browser, the system or a screen
// reader keeps them. The commands' names are site text.
import { siteText } from '../../site-text.ts';

export type KeyGroup = keyof typeof siteText.playground.popups.keys.groups;

export type KeyCommand = {
  id: KeyCommandId;
  group: KeyGroup;
  // `linux` where Monaco's key there isn't the Windows one; a system with no
  // key has no row.
  keys: { mac: string[]; other: string[]; linux?: string[] };
  vsCode: { mac: string[]; other: string[]; linux?: string[] };
  differs?: 'shell' | 'browser' | 'screen-reader' | 'not-vs-code';
  // The key a browser or screen reader keeps, for the note.
  kept?: { mac: string; other: string };
  // What the list shows for a run of keys, in place of each.
  shown?: { mac: string; other: string };
};

export type KeyCommandId = keyof typeof siteText.playground.keyLabels;

// A command's name in the list of keys.
export const keyLabel = (command: KeyCommand): string => siteText.playground.keyLabels[command.id];

const same = (mac: string[], other: string[], linux?: string[]) => {
  const keys = { mac, other, ...(linux === undefined ? {} : { linux }) };
  return { keys, vsCode: keys };
};

// In the list's order, group by group.
export const KEY_COMMANDS: readonly KeyCommand[] = Object.freeze<KeyCommand[]>([
  { id: 'playground.run', group: 'run', keys: { mac: ['Cmd+Enter'], other: ['Ctrl+Enter'] }, vsCode: { mac: [], other: [] }, differs: 'not-vs-code' },
  { id: 'editor.action.quickCommand', group: 'run', keys: { mac: ['F1'], other: ['F1'] }, vsCode: { mac: ['F1', 'Shift+Cmd+P'], other: ['F1', 'Ctrl+Shift+P'] }, differs: 'browser', kept: { mac: 'Shift+Cmd+P', other: 'Ctrl+Shift+P' } },
  { id: 'playground.keys', group: 'run', ...same(['Option+F1'], ['Alt+F1']) },
  { id: 'editor.action.showContextMenu', group: 'run', ...same(['Shift+F10'], ['Shift+F10']) },

  { id: 'editor.action.triggerSuggest', group: 'types', ...same(['Ctrl+Space', 'Option+Escape'], ['Ctrl+Space']) },
  { id: 'editor.action.triggerParameterHints', group: 'types', ...same(['Shift+Cmd+Space'], ['Ctrl+Shift+Space']) },
  { id: 'editor.action.showHover', group: 'types', ...same(['Cmd+K Cmd+I'], ['Ctrl+K Ctrl+I']) },
  { id: 'editor.action.revealDefinition', group: 'types', ...same(['F12'], ['F12']) },
  { id: 'editor.action.peekDefinition', group: 'types', ...same(['Option+F12'], ['Alt+F12']) },
  { id: 'editor.action.goToReferences', group: 'types', ...same(['Shift+F12'], ['Shift+F12']) },
  { id: 'editor.action.rename', group: 'types', ...same(['F2'], ['F2']) },
  { id: 'editor.action.linkedEditing', group: 'types', ...same(['Shift+Cmd+F2'], ['Ctrl+Shift+F2']) },
  { id: 'editor.action.quickFix', group: 'types', ...same(['Cmd+.'], ['Ctrl+.']) },
  { id: 'editor.action.refactor', group: 'types', ...same(['Ctrl+Shift+R'], ['Ctrl+Shift+R']) },

  { id: 'editor.action.marker.nextInFiles', group: 'errors', ...same(['F8'], ['F8']) },
  { id: 'editor.action.marker.prevInFiles', group: 'errors', ...same(['Shift+F8'], ['Shift+F8']) },
  { id: 'editor.action.marker.next', group: 'errors', ...same(['Option+F8'], ['Alt+F8']) },
  { id: 'editor.action.marker.prev', group: 'errors', ...same(['Shift+Option+F8'], ['Shift+Alt+F8']) },

  { id: 'undo', group: 'editing', ...same(['Cmd+Z'], ['Ctrl+Z']) },
  { id: 'redo', group: 'editing', ...same(['Shift+Cmd+Z'], ['Ctrl+Y', 'Ctrl+Shift+Z']) },
  { id: 'editor.action.formatDocument', group: 'editing', ...same(['Shift+Option+F'], ['Shift+Alt+F']) },
  { id: 'editor.action.formatSelection', group: 'editing', ...same(['Cmd+K Cmd+F'], ['Ctrl+K Ctrl+F']) },
  { id: 'editor.action.commentLine', group: 'editing', ...same(['Cmd+/'], ['Ctrl+/']) },
  { id: 'editor.action.blockComment', group: 'editing', ...same(['Shift+Option+A'], ['Shift+Alt+A'], ['Ctrl+Shift+A']) },
  { id: 'editor.action.addCommentLine', group: 'editing', ...same(['Cmd+K Cmd+C'], ['Ctrl+K Ctrl+C']) },
  { id: 'editor.action.removeCommentLine', group: 'editing', ...same(['Cmd+K Cmd+U'], ['Ctrl+K Ctrl+U']) },
  { id: 'editor.action.moveLinesUpAction', group: 'editing', ...same(['Option+Up'], ['Alt+Up']) },
  { id: 'editor.action.moveLinesDownAction', group: 'editing', ...same(['Option+Down'], ['Alt+Down']) },
  { id: 'editor.action.copyLinesUpAction', group: 'editing', ...same(['Shift+Option+Up'], ['Shift+Alt+Up']) },
  { id: 'editor.action.copyLinesDownAction', group: 'editing', ...same(['Shift+Option+Down'], ['Shift+Alt+Down']) },
  { id: 'editor.action.insertLineBefore', group: 'editing', ...same(['Shift+Cmd+Enter'], ['Ctrl+Shift+Enter']) },
  { id: 'editor.action.deleteLines', group: 'editing', ...same(['Shift+Cmd+K'], ['Ctrl+Shift+K']) },
  { id: 'editor.action.indentLines', group: 'editing', ...same(['Cmd+]'], ['Ctrl+]']) },
  { id: 'editor.action.outdentLines', group: 'editing', ...same(['Cmd+['], ['Ctrl+[']) },
  { id: 'editor.action.removeBrackets', group: 'editing', ...same(['Option+Cmd+Backspace'], ['Ctrl+Alt+Backspace']) },
  { id: 'editor.action.inPlaceReplace.down', group: 'editing', ...same(['Shift+Cmd+.'], ['Ctrl+Shift+.']) },
  { id: 'editor.action.inPlaceReplace.up', group: 'editing', ...same(['Shift+Cmd+,'], ['Ctrl+Shift+,']) },
  { id: 'editor.action.trimTrailingWhitespace', group: 'editing', ...same(['Cmd+K Cmd+X'], ['Ctrl+K Ctrl+X']) },
  { id: 'deleteAllLeft', group: 'editing', ...same(['Cmd+Backspace'], []) },
  { id: 'deleteAllRight', group: 'editing', ...same(['Ctrl+K', 'Cmd+Delete'], []) },
  { id: 'editor.action.joinLines', group: 'editing', ...same(['Ctrl+J'], []) },
  { id: 'editor.action.transposeLetters', group: 'editing', ...same(['Ctrl+T'], []) },

  { id: 'editor.action.smartSelect.expand', group: 'selecting', ...same(['Ctrl+Shift+Cmd+Right'], ['Shift+Alt+Right']) },
  { id: 'editor.action.smartSelect.shrink', group: 'selecting', ...same(['Ctrl+Shift+Cmd+Left'], ['Shift+Alt+Left']) },
  { id: 'expandLineSelection', group: 'selecting', keys: { mac: ['Cmd+K L'], other: ['Ctrl+K L'] }, vsCode: { mac: ['Cmd+L'], other: ['Ctrl+L'] }, differs: 'browser', kept: { mac: 'Cmd+L', other: 'Ctrl+L' } },
  { id: 'editor.action.addSelectionToNextFindMatch', group: 'selecting', ...same(['Cmd+D'], ['Ctrl+D']) },
  { id: 'editor.action.selectHighlights', group: 'selecting', ...same(['Shift+Cmd+L'], ['Ctrl+Shift+L']) },
  { id: 'editor.action.changeAll', group: 'selecting', ...same(['Cmd+F2'], ['Ctrl+F2']) },
  { id: 'editor.action.insertCursorAbove', group: 'selecting', ...same(['Option+Cmd+Up'], ['Ctrl+Alt+Up'], ['Ctrl+Shift+Up']) },
  { id: 'editor.action.insertCursorBelow', group: 'selecting', ...same(['Option+Cmd+Down'], ['Ctrl+Alt+Down'], ['Ctrl+Shift+Down']) },
  { id: 'editor.action.insertCursorAtEndOfEachLineSelected', group: 'selecting', ...same(['Shift+Option+I'], ['Shift+Alt+I']) },
  { id: 'editor.action.setSelectionAnchor', group: 'selecting', ...same(['Cmd+K Cmd+B'], ['Ctrl+K Ctrl+B']) },
  { id: 'cursorUndo', group: 'selecting', ...same(['Cmd+U'], ['Ctrl+U']) },
  { id: 'editor.action.moveSelectionToNextFindMatch', group: 'selecting', ...same(['Cmd+K Cmd+D'], ['Ctrl+K Ctrl+D']) },

  { id: 'actions.find', group: 'find', ...same(['Cmd+F'], ['Ctrl+F']) },
  { id: 'editor.action.startFindReplaceAction', group: 'find', ...same(['Option+Cmd+F'], ['Ctrl+H']) },
  { id: 'editor.action.nextSelectionMatchFindAction', group: 'find', ...same(['Cmd+F3'], ['Ctrl+F3']) },
  { id: 'editor.action.previousSelectionMatchFindAction', group: 'find', ...same(['Shift+Cmd+F3'], ['Ctrl+Shift+F3']) },
  // Enter and Shift+Enter are for the find box, where they find the next and previous match.
  { id: 'editor.action.nextMatchFindAction', group: 'find', ...same(['Cmd+G', 'F3', 'Enter'], ['F3', 'Enter']) },
  { id: 'editor.action.previousMatchFindAction', group: 'find', ...same(['Shift+Cmd+G', 'Shift+F3', 'Shift+Enter'], ['Shift+F3', 'Shift+Enter']) },
  { id: 'actions.findWithSelection', group: 'find', ...same(['Cmd+E'], []) },

  { id: 'editor.fold', group: 'folding', ...same(['Option+Cmd+['], ['Ctrl+Shift+[']) },
  { id: 'editor.unfold', group: 'folding', ...same(['Option+Cmd+]'], ['Ctrl+Shift+]']) },
  { id: 'editor.foldAll', group: 'folding', ...same(['Cmd+K Cmd+0'], ['Ctrl+K Ctrl+0']) },
  { id: 'editor.unfoldAll', group: 'folding', ...same(['Cmd+K Cmd+J'], ['Ctrl+K Ctrl+J']) },
  { id: 'editor.foldRecursively', group: 'folding', ...same(['Cmd+K Cmd+['], ['Ctrl+K Ctrl+[']) },
  { id: 'editor.toggleFold', group: 'folding', ...same(['Cmd+K Cmd+L'], ['Ctrl+K Ctrl+L']) },
  {
    id: 'editor.foldLevel',
    group: 'folding',
    ...same(
      [1, 2, 3, 4, 5, 6, 7].map((level) => `Cmd+K Cmd+${level}`),
      [1, 2, 3, 4, 5, 6, 7].map((level) => `Ctrl+K Ctrl+${level}`),
    ),
    shown: { mac: 'Cmd+K Cmd+1 to 7', other: 'Ctrl+K Ctrl+1 to 7' },
  },
  { id: 'editor.createFoldingRangeFromSelection', group: 'folding', ...same(['Cmd+K Cmd+,'], ['Ctrl+K Ctrl+,']) },
  { id: 'editor.removeManualFoldingRanges', group: 'folding', ...same(['Cmd+K Cmd+.'], ['Ctrl+K Ctrl+.']) },
  { id: 'editor.foldAllBlockComments', group: 'folding', ...same(['Cmd+K Cmd+/'], ['Ctrl+K Ctrl+/']) },
  { id: 'editor.foldAllExcept', group: 'folding', ...same(['Cmd+K Cmd+-'], ['Ctrl+K Ctrl+-']) },
  { id: 'editor.unfoldAllExcept', group: 'folding', ...same(['Cmd+K Cmd+='], ['Ctrl+K Ctrl+=']) },
  { id: 'editor.foldAllMarkerRegions', group: 'folding', ...same(['Cmd+K Cmd+8'], ['Ctrl+K Ctrl+8']) },
  { id: 'editor.toggleFoldRecursively', group: 'folding', ...same(['Cmd+K Shift+Cmd+L'], ['Ctrl+K Ctrl+Shift+L']) },

  { id: 'editor.action.gotoLine', group: 'moving', ...same(['Ctrl+G'], ['Ctrl+G']) },
  { id: 'editor.action.quickOutline', group: 'moving', ...same(['Shift+Cmd+O'], ['Ctrl+Shift+O']) },
  { id: 'editor.action.jumpToBracket', group: 'moving', ...same(['Shift+Cmd+\\'], ['Ctrl+Shift+\\']) },
  { id: 'cursorWordPart', group: 'moving', keys: { mac: ['Cmd+K Left', 'Cmd+K Right'], other: [] }, vsCode: { mac: ['Ctrl+Option+Left', 'Ctrl+Option+Right'], other: [] }, differs: 'screen-reader', kept: { mac: 'Ctrl+Option with the arrows', other: '' } },
  { id: 'editor.action.toggleTabFocusMode', group: 'moving', ...same(['Ctrl+Shift+M'], ['Ctrl+M']) },
]);

export const KEY_GROUPS: readonly KeyGroup[] = Object.freeze([...new Set(KEY_COMMANDS.map((command) => command.group))]);

// Run, types, errors and editing come first; selecting on make the second.
export const KEY_GROUPS_FIRST_COLUMN = 4;

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

const forSystem = (keys: KeyCommand['keys'], mac: boolean, linux: boolean): string[] => (mac ? keys.mac : linux ? (keys.linux ?? keys.other) : keys.other);

export const keysFor = (command: KeyCommand, mac: boolean, linux = false): string[] => forSystem(command.keys, mac, linux);

export const vsCodeKeysFor = (command: KeyCommand, mac: boolean, linux = false): string[] => forSystem(command.vsCode, mac, linux);

// What the list shows for a command's keys.
export const keysShown = (command: KeyCommand, mac: boolean, linux = false): string => command.shown?.[mac ? 'mac' : 'other'] ?? keysFor(command, mac, linux).join(', ');

export const tabFocusKey = (mac: boolean) => (mac ? 'Ctrl+Shift+M' : 'Ctrl+M');
export const hoverKey = (mac: boolean) => (mac ? 'Cmd+K Cmd+I' : 'Ctrl+K Ctrl+I');
