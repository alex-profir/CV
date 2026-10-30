// The editor's theme (research R22): Monaco's `defineTheme` needs its colors
// in script, so they come from the interface, read from the token output
// (contracts/engine.md EditorTheme). The engine holds no design value.
import { editor } from 'monaco-editor/editor';
import type { EditorTheme } from './contract.ts';

export const THEME = 'playground';

const bare = (color: string) => color.replace(/^#/, '');

export function defineTheme(theme: EditorTheme): void {
  const c = theme.colors;
  editor.defineTheme(THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: bare(c.text), background: bare(c.surface) },
      { token: 'keyword', foreground: bare(c.keyword) },
      { token: 'type', foreground: bare(c.type) },
      { token: 'type.identifier', foreground: bare(c.type) },
      { token: 'identifier', foreground: bare(c.text) },
      { token: 'function', foreground: bare(c.function) },
      { token: 'property', foreground: bare(c.property) },
      { token: 'string', foreground: bare(c.string) },
      { token: 'string.escape', foreground: bare(c.string) },
      { token: 'regexp', foreground: bare(c.string) },
      { token: 'number', foreground: bare(c.number) },
      { token: 'literal', foreground: bare(c.number) },
      { token: 'comment', foreground: bare(c.comment), fontStyle: 'italic' },
      { token: 'comment.doc', foreground: bare(c.comment), fontStyle: 'italic' },
      { token: 'delimiter', foreground: bare(c.punctuation) },
      { token: 'delimiter.bracket', foreground: bare(c.punctuation) },
      { token: 'operator', foreground: bare(c.punctuation) },
    ],
    colors: {
      'editor.background': c.surface,
      'editor.foreground': c.text,
      'editorLineNumber.foreground': c.lineNumber,
      'editorLineNumber.activeForeground': c.lineNumberCurrent,
      'editor.lineHighlightBackground': c.currentLine,
      'editor.lineHighlightBorder': c.currentLine,
      'editorCursor.foreground': c.caret,
      'editor.selectionBackground': c.selection,
      'editor.inactiveSelectionBackground': c.selection,
      'editor.wordHighlightBackground': c.occurrence,
      'editor.wordHighlightStrongBackground': c.occurrence,
      'editor.selectionHighlightBackground': c.occurrence,
      'editorError.foreground': c.error,
      'editorWarning.foreground': c.warning,
      'editorInfo.foreground': c.info,
      'editorGutter.background': c.surface,
      'editorWidget.background': c.raised,
      'editorWidget.foreground': c.widgetText,
      'editorWidget.border': c.border,
      'editorHoverWidget.background': c.raised,
      'editorHoverWidget.border': c.border,
      'editorSuggestWidget.background': c.raised,
      'editorSuggestWidget.border': c.border,
      'editorSuggestWidget.foreground': c.widgetText,
      'editorSuggestWidget.selectedBackground': c.panel,
      'editorSuggestWidget.highlightForeground': c.focus,
      'quickInput.background': c.raised,
      'quickInput.foreground': c.widgetText,
      'quickInputList.focusBackground': c.panel,
      'peekView.border': c.focus,
      'peekViewEditor.background': c.surface,
      'peekViewResult.background': c.panel,
      'peekViewTitle.background': c.raised,
      'focusBorder': c.focus,
      'editorBracketMatch.border': c.lineNumber,
      'editorBracketMatch.background': c.currentLine,
      'scrollbarSlider.background': c.currentLine,
      'editorOverviewRuler.border': c.surface,
      'descriptionForeground': c.widgetTextSecondary,
    },
  });
}
