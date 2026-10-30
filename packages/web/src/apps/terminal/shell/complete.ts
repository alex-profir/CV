// Tab's completer (006 research R43, contracts/shell-worker.md): given the
// line, the cursor and the shell's state, what bash's readline would insert
// and the full list of matches. Pure over the small file system it is given,
// so it is tested in Node and against bash itself (research R45).
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
  // Words after which the next word is a command.
  keywords: readonly string[];
};

// readline's word breaks for bash; a quote that opens starts the word after it.
const BREAKS = new Set([' ', '\t', '\n', '"', "'", '`', '@', '$', '>', '<', '=', ';', '|', '&', '{', '(']);
const SEPARATORS = new Set([';', '|', '&', '(', '`', '{']);
// What bash puts a backslash before, outside quotes, in a name it inserts.
const QUOTED = /[ \t\n\\"'@<>=;|&()#$`?*[!:{]/g;

const GLOB = /[*?]|\[.*\]/;

type Word = { start: number; quote: '"' | "'" | null };

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
  if (quote === '"') return name.replace(/["$`\\]/g, '\\$&');
  return name.replace(QUOTED, '\\$&');
}

const byBytes = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function commonPrefix(names: readonly string[]): string {
  let prefix = names[0] ?? '';
  for (const name of names) while (!name.startsWith(prefix)) prefix = prefix.slice(0, -1);
  return prefix;
}

// Whether the word starting after `before` is a command's first word.
function inCommandPosition(before: string, keywords: readonly string[]): boolean {
  const text = before.trimEnd();
  if (text === '') return true;
  if (SEPARATORS.has(text.at(-1)!)) return true;
  const last = /(?:^|[\s;|&(])([^\s;|&(]+)$/.exec(text)?.[1];
  return last !== undefined && keywords.includes(last);
}

// A name in a folder: the entries of the folder a word's path part names.
async function entries(fs: CompleteFs, folder: string, base: string): Promise<CompletionMatch[]> {
  const names = await fs.readdir(folder).catch(() => [] as string[]);
  const matches: CompletionMatch[] = [];
  for (const name of names) {
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
  const { start, quote } = findWord(before);
  const raw = before.slice(start);
  const none = (matches: readonly CompletionMatch[] = []): Completion => ({ id, start, end: cursor, insert: '', matches });
  const atEnd = cursor === line.length;
  const closing = quote !== null && atEnd ? quote : '';
  const space = atEnd ? ' ' : '';

  // `$HO`: the variables' names.
  if (raw.startsWith('$')) {
    const typed = raw.slice(1);
    const values: Record<string, string> = { ...sources.variables, PWD: state.cwd, ...state.variables };
    const names = Object.keys(values).filter((name) => name.startsWith(typed)).sort(byBytes);
    const matches = names.map((name) => ({ name: `$${name}`, folder: false }));
    if (names.length === 0) return none();
    if (names.length === 1) {
      // A variable that holds a folder gets the folder's mark.
      const folder = (await sources.fs.stat(values[names[0]!]!).catch(() => null))?.isDirectory === true;
      return { ...none(matches), insert: `$${names[0]!}${folder ? '/' : `${closing}${space}`}` };
    }
    const common = commonPrefix(names);
    return common === typed ? none(matches) : { ...none(matches), insert: `$${common}` };
  }

  // A word with a pattern in it matches no name, and Tab adds nothing.
  if (GLOB.test(raw)) return none();

  const word = unescape(raw, quote);
  const position = before.slice(0, quote === null ? start : start - 1);
  const slash = raw.lastIndexOf('/');
  const pathWord = slash !== -1 || word === '~';
  const first = inCommandPosition(position, sources.keywords);

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
    if (word === '~') return { ...none([{ name: '~/', folder: true }]), insert: '~/' };
    typedDir = slash === -1 ? '' : raw.slice(0, slash + 1);
    typedBase = unescape(raw.slice(slash + 1), quote);
    const dir = unescape(typedDir, quote);
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
