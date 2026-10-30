// The editor's theme, read from the token output (research R22), passed to
// the engine, which holds no design value of its own (contracts/engine.md).
import { tokenValue } from '@cv/tokens';
import type { CssVarTokenName } from '@cv/tokens';
import type { EditorTheme } from './engine/contract.ts';

const value = (name: CssVarTokenName): string => {
  const read = tokenValue(name);
  if (read === undefined || read === '') throw new Error(`the token ${name} has no value`);
  return read;
};

const px = (name: CssVarTokenName): number => {
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value(name));
  if (match === null) throw new Error(`the token ${name} is not a px length`);
  return Number(match[1]);
};

export function editorTheme(): EditorTheme {
  return {
    colors: {
      surface: value('color.code.surface'),
      text: value('color.code.text'),
      keyword: value('color.code.keyword'),
      type: value('color.code.type'),
      function: value('color.code.function'),
      property: value('color.code.property'),
      string: value('color.code.string'),
      number: value('color.code.number'),
      comment: value('color.code.comment'),
      punctuation: value('color.code.punctuation'),
      lineNumber: value('color.code.line-number'),
      lineNumberCurrent: value('color.code.line-number-current'),
      currentLine: value('color.code.current-line'),
      selection: value('color.code.selection'),
      occurrence: value('color.code.occurrence'),
      caret: value('color.code.caret'),
      error: value('color.code.error'),
      warning: value('color.code.warning'),
      info: value('color.code.info'),
      panel: value('color.playground.panel'),
      raised: value('color.playground.raised'),
      border: value('color.shell-rule'),
      focus: value('color.focus-shell'),
      widgetText: value('color.shell-text'),
      widgetTextSecondary: value('color.shell-text-secondary'),
    },
    fontFamily: value('font.family.mono'),
    fontSize: px('font.size.small'),
    lineHeight: px('size.code-line'),
    gutter: px('size.playground-gutter'),
    inset: px('space.2'),
  };
}
