// Tab's completer (006 research R43, contracts/shell-worker.md): given the
// line, the cursor and the shell's state, what bash's readline would insert
// and the full list of matches. Pure over the small file system it is given,
// so it is tested in Node and against bash itself (research R45).
import { QUOTED } from '../engine/block.ts';
import type { CompleteRequest, Completion, CompletionMatch } from './protocol.ts';

export type CompleteFs = {
  readdir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ isDirectory: boolean }>;
};

export type CompleteSources = {
  fs: CompleteFs;
  home: string;
  // Every name a command's first word can be: the site's commands and
  // aliases, the standard commands, the builtins and the keywords.
  commands: readonly string[];
  // The shell's own variables (HOME, PWD…), name → value.
  variables: Readonly<Record<string, string>>;
};

// readline's word breaks for bash; a quote that opens starts the word after it.
const BREAKS = new Set([' ', '\t', '\n', '"', "'", '`', '@', '$', '>', '<', '=', ';', '|', '&', '(']);
const SEPARATORS = new Set([';', '|', '&', '(', '`', '{']);

const GLOB = /[*?]|\[.*\]/;

type Word = { start: number; quote: '"' | "'" | null };

// Inside a `…`, or a $(…) in double quotes, not closed yet: bash adds nothing
// after the word, as the line doesn't end with it.
function inSubstitution(before: string): boolean {
  let backticks = false;
  let double = false;
  let quoted = 0;
  for (let at = 0; at < before.length; at += 1) {
    if (before[at] === '\\') at += 1;
    else if (before[at] === '`') backticks = !backticks;
    else if (before[at] === '"') double = !double;
    else if (double && before[at] === '$' && before[at + 1] === '(') quoted += 1;
    else if (before[at] === ')' && quoted > 0) quoted -= 1;
  }
  return backticks || quoted > 0;
}

function findWord(before: string): Word {
  let start = 0;
  let quote: Word['quote'] = null;
  for (let at = 0; at < before.length; at += 1) {
    const char = before[at]!;
    if (quote === "'") {
      if (char === "'") {
        quote = null;
        start = at + 1;
      }
      continue;
    }
    if (char === '\\') {
      at += 1;
      continue;
    }
    if (quote === '"') {
      if (char === '"') {
        quote = null;
        start = at + 1;
      } else if (char === '$' && before[at + 1] === '(') {
        // A new word, in quotes or not, as in a line of its own.
        start = at + 2;
        at += 1;
      } else if (char === '$') start = at;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      start = at + 1;
    } else if (char === '$') start = at;
    else if (BREAKS.has(char)) start = at + 1;
  }
  return { start, quote };
}

const unescape = (raw: string, quote: Word['quote']) => (quote === "'" ? raw : raw.replace(/\\(.)/gs, '$1'));

function quoted(name: string, quote: Word['quote']): string {
  if (quote === "'") return name.replace(/'/g, `'\\''`);
  if (quote === '"') return name.replace(/["`\\]/g, '\\$&');
  return name.replace(QUOTED, '\\$&');
}

const byBytes = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function commonPrefix(names: readonly string[]): string {
  let prefix = names[0] ?? '';
  for (const name of names) while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

// Whether the word starting after `before` is a command's first word.
function inCommandPosition(before: string): boolean {
  // An assignment's value (T329).
  if (before.endsWith('=')) return false;
  const text = before.trimEnd();
  if (text === '') return true;
  if (SEPARATORS.has(text.at(-1)!)) return true;
  const last = /(?:^|[\s;|&(])([^\s;|&(]+)$/.exec(text)?.[1];
  if (last === undefined) return false;
  // A word after assignments is a command's first word.
  if (/^[A-Za-z_]\w*\+?=/.test(last)) return inCommandPosition(text.slice(0, -last.length));
  // After `if` or `then` too: readline knows no keywords, only what separates
  // commands, `{` among them (T393).
  return false;
}

// A name in a folder: the entries of the folder a word's path part names.
async function entries(fs: CompleteFs, folder: string, base: string): Promise<CompletionMatch[]> {
  const names = await fs.readdir(folder).catch(() => [] as string[]);
  const matches: CompletionMatch[] = [];
  // A file system's list leaves these two out; readline adds them to a word
  // that starts with a dot.
  for (const name of [...(base.startsWith('.') ? ['.', '..'] : []), ...names]) {
    if (!name.startsWith(base)) continue;
    const stat = await fs.stat(`${folder === '/' ? '' : folder}/${name}`).catch(() => null);
    matches.push({ name: stat?.isDirectory === true ? `${name}/` : name, folder: stat?.isDirectory === true });
  }
  return matches;
}

const bare = (match: CompletionMatch) => match.name.replace(/\/$/, '');

export async function complete(request: CompleteRequest, sources: CompleteSources): Promise<Completion> {
  const { id, line, cursor, state } = request;
  const before = line.slice(0, cursor);
  const found = findWord(before);
  const { start } = found;
  const substituted = inSubstitution(before);
  // What's quoted around a $(…) doesn't quote the word in it.
  const quote = before[start - 2] === '$' && before[start - 1] === '(' ? null : found.quote;
  const raw = before.slice(start);
  const none = (matches: readonly CompletionMatch[] = []): Completion => ({ id, start, end: cursor, insert: '', matches });
  const atEnd = cursor === line.length && !substituted;
  const closing = quote !== null && atEnd ? quote : '';
  const space = atEnd ? ' ' : '';
  const values: Record<string, string> = { ...sources.variables, PWD: state.cwd, ...state.variables };
  // `$HOME/wo`: a path from the variable's value, which stays as typed.
  const fromVariable = /^\$(\w+|\{\w+\})\//.exec(raw);
  const variable = fromVariable === null ? undefined : values[fromVariable[1]!.replace(/[{}]/g, '')];

  // `$HO` and `${HO`: the variables' names.
  if (raw.startsWith('$') && fromVariable === null) {
    const lead = raw.startsWith('${') ? '${' : '$';
    const typed = raw.slice(lead.length);
    const names = Object.keys(values).filter((name) => name.startsWith(typed)).sort(byBytes);
    const matches = names.map((name) => ({ name: lead === '$' ? `$${name}` : `\${${name}}`, folder: false }));
    if (names.length === 0) return none();
    if (names.length === 1) {
      // A variable that holds a folder gets the folder's mark, and in `${` is left open.
      const folder = (await sources.fs.stat(values[names[0]!]!).catch(() => null))?.isDirectory === true;
      if (lead === '${') return { ...none(matches), insert: folder ? `\${${names[0]!}` : `\${${names[0]!}}${closing}${space}` };
      return { ...none(matches), insert: `$${names[0]!}${folder ? '/' : `${closing}${space}`}` };
    }
    const common = commonPrefix(names);
    return common === typed ? none(matches) : { ...none(matches), insert: `${lead}${common}` };
  }

  // A word with a pattern in it: what it matches, if that's one name (T301).
  if (GLOB.test(raw) && quote === null) {
    // A final slash keeps the pattern's folders (T393).
    const slashed = raw.endsWith('/');
    const typedPattern = slashed ? raw.slice(0, -1) : raw;
    const cut = typedPattern.lastIndexOf('/') + 1;
    const dir = typedPattern.slice(0, cut);
    const pattern = new RegExp(`^${typedPattern.slice(cut).replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
    const folder = dir === '' ? state.cwd : dir.startsWith('~/') ? `${sources.home}/${dir.slice(2)}` : dir.startsWith('/') ? dir : `${state.cwd}/${dir}`;
    const names = await sources.fs.readdir(folder.replace(/(.)\/+$/, '$1')).catch(() => [] as string[]);
    const hits = names.filter((name) => pattern.test(name) && (!name.startsWith('.') || typedPattern.slice(cut).startsWith('.')));
    const statted = await Promise.all(hits.map(async (name) => ((await sources.fs.stat(`${folder.replace(/\/+$/, '')}/${name}`).catch(() => null))?.isDirectory === true ? { name: `${name}/`, folder: true } : { name, folder: false })));
    const matched = slashed ? statted.filter((match) => match.folder) : statted;
    matched.sort((a, b) => byBytes(bare(a), bare(b)));
    if (matched.length !== 1) return none(matched);
    return { ...none(matched), insert: `${dir}${quoted(bare(matched[0]!), null)}${matched[0]!.folder ? '/' : space}` };
  }
  if (GLOB.test(raw)) return none();

  const word = unescape(raw, quote);
  const position = before.slice(0, quote === null ? start : start - 1);
  // bash lists the system's users for this; here there are none.
  if (word === '~') return none();
  const slash = raw.lastIndexOf('/');
  const pathWord = slash !== -1;
  const first = inCommandPosition(position);

  let matches: CompletionMatch[];
  // A name both a command and a folder: listed once, and neither gets a mark.
  const both = new Set<string>();
  let typedBase = word;
  let typedDir = '';
  if (first && !pathWord) {
    const folders = (await entries(sources.fs, state.cwd, word)).filter((match) => match.folder);
    const commands = new Set([...sources.commands, ...Object.keys(state.functions)].filter((name) => name.startsWith(word)));
    for (const folder of folders) if (commands.has(bare(folder))) both.add(bare(folder));
    matches = [...[...commands].map((name) => ({ name, folder: false })), ...folders.filter((folder) => !both.has(bare(folder)))];
  } else {
    typedDir = slash === -1 ? '' : raw.slice(0, slash + 1);
    typedBase = unescape(raw.slice(slash + 1), quote);
    const dir = variable === undefined ? unescape(typedDir, quote) : `${variable}/${typedDir.slice(fromVariable![0].length)}`;
    const folder = dir === '' ? state.cwd : dir === '~/' || dir.startsWith('~/') ? `${sources.home}/${dir.slice(2)}` : dir.startsWith('/') ? dir : `${state.cwd}/${dir}`;
    const trimmed = folder.length > 1 ? folder.replace(/\/+$/, '') : folder;
    matches = await entries(sources.fs, trimmed === '' ? '/' : trimmed, typedBase);
    // A command's first word with a path in it: only what can run or be
    // entered, and the visitor's and the site's files don't run.
    if (first) matches = matches.filter((match) => match.folder);
  }

  matches.sort((a, b) => byBytes(bare(a), bare(b)));
  if (matches.length === 0) return none();
  if (matches.length === 1) {
    const match = matches[0]!;
    const name = bare(match);
    const end = match.folder ? '/' : both.has(name) ? '' : `${closing}${space}`;
    return { ...none(matches), insert: `${typedDir}${quoted(name, quote)}${end}` };
  }
  const common = commonPrefix(matches.map(bare));
  return common === typedBase ? none(matches) : { ...none(matches), insert: `${typedDir}${quoted(common, quote)}` };
}
