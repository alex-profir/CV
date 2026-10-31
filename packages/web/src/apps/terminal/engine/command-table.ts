// The site's commands by name, with no code that runs them (006 FR-008): what
// the page needs to word a reply (FR-016, FR-017). The commands themselves run
// in the worker (engine/commands.ts), so the page's script doesn't carry them
// (SC-013).
import type { FullText } from '../../../shell-text.ts';
import { text } from './block.ts';
import type { Node, Tone } from './block.ts';

export type CommandName =
  | 'help' | 'about' | 'work' | 'projects' | 'education' | 'skills' | 'languages' | 'interests'
  | 'contact' | 'cv' | 'site' | 'specs' | 'ls' | 'cd' | 'cat' | 'jq' | 'vim' | 'pwd' | 'open'
  | 'history' | 'clear' | 'exit';

export type ArgKind = keyof FullText['terminal']['takes'];

export type CommandRow = { name: CommandName; aliases: readonly string[]; args: ArgKind };

// In `help`'s order (FR-008).
export const COMMAND_TABLE: readonly CommandRow[] = [
  { name: 'help', aliases: ['?'], args: 'optional-command' },
  { name: 'about', aliases: ['whoami'], args: 'none' },
  { name: 'work', aliases: ['experience'], args: 'none' },
  { name: 'projects', aliases: [], args: 'none' },
  { name: 'education', aliases: [], args: 'none' },
  { name: 'skills', aliases: [], args: 'none' },
  { name: 'languages', aliases: [], args: 'none' },
  { name: 'interests', aliases: [], args: 'none' },
  { name: 'contact', aliases: [], args: 'none' },
  { name: 'cv', aliases: [], args: 'none' },
  { name: 'site', aliases: [], args: 'none' },
  { name: 'specs', aliases: [], args: 'none' },
  { name: 'ls', aliases: [], args: 'optional-path' },
  { name: 'cd', aliases: [], args: 'optional-path' },
  { name: 'cat', aliases: [], args: 'path' },
  { name: 'jq', aliases: [], args: 'optional-path-or-input' },
  { name: 'vim', aliases: [], args: 'path-or-input' },
  { name: 'pwd', aliases: [], args: 'none' },
  { name: 'open', aliases: [], args: 'name' },
  { name: 'history', aliases: [], args: 'none' },
  { name: 'clear', aliases: [], args: 'none' },
  { name: 'exit', aliases: [], args: 'none' },
];

// The row a name or alias names, matched in lower case (FR-007).
export const commandNamed = (word: string): CommandRow | null => {
  const typed = word.toLowerCase();
  return COMMAND_TABLE.find((row) => row.name === typed || row.aliases.includes(typed)) ?? null;
};

// A site text pattern as nodes: each `{key}` is the node given for it, the
// rest is text in `tone`.
export function pattern(template: string, fills: Record<string, Node>, tone?: Tone): Node[] {
  return template
    .split(/(\{\w+\})/)
    .filter((part) => part !== '')
    .map((part) => fills[part.slice(1, -1)] ?? text(part, tone));
}
