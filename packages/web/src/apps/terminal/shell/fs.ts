// TerminalFs, the shell's file system (006 research R28, data-model.md
// Terminal file system): just-bash's in-memory file system with the CV's
// tree written into the home folder as protected files, each holding the
// text its command prints (FR-047), and room beside them for the visitor's
// own files (FR-073). Every writing operation checks the path and its
// parent, and a protected one is refused with "Permission denied" (FR-049).
import { InMemoryFs } from 'just-bash/browser';
import type { BufferEncoding, CpOptions, CreateExclusiveOptions, FileContent, FsStat, MkdirOptions, RmOptions } from 'just-bash/browser';
import { blockText } from '../engine/block.ts';
import { folded } from '../engine/files.ts';
import type { Folder, FsNode } from '../engine/files.ts';
import { QUOTA } from './protocol.ts';
import type { FsEntryInfo, VisitorFiles } from './protocol.ts';

export const HOME = '/home/guest';
export const TMP = '/tmp';

// The folders the shell needs to run, all protected (FR-045). just-bash adds
// `/bin` and `/usr/bin` stubs and `/dev` itself.
const LAYOUT = ['/bin', '/usr', '/usr/bin', '/dev', '/home'];

const MODE = { protectedFile: 0o444, protectedFolder: 0o555, file: 0o644, folder: 0o755 };

// A file system error as just-bash's commands print it: the text after the
// path (`rm: cannot remove 'about': Permission denied`).
const failure = (code: 'EACCES' | 'ENOSPC' | 'ENOENT' | 'ENOSYS', message: string) => Object.assign(new Error(message), { code });
const denied = () => failure('EACCES', 'Permission denied');
const noSpace = () => failure('ENOSPC', 'No space left on device');
const missing = () => failure('ENOENT', 'No such file or directory');

const parentOf = (path: string) => (path === '/' ? '/' : path.slice(0, path.lastIndexOf('/')) || '/');
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
const joined = (folder: string, name: string) => (folder === '/' ? `/${name}` : `${folder}/${name}`);

// `/a/./b/../c` as `/a/c`.
function normal(path: string): string {
  const parts: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return `/${parts.join('/')}`;
}

type WriteFileOptions = Exclude<Parameters<InMemoryFs['writeFile']>[2], BufferEncoding | undefined>;
type DirentEntry = Awaited<ReturnType<InMemoryFs['readdirWithFileTypes']>>[number];

const byteLength = (content: FileContent) => (typeof content === 'string' ? new TextEncoder().encode(content).length : content.length);

// What each protected file holds: its block's text, as its command prints
// it, or cv.json's own text (FR-055).
export const fileText = (node: Extract<FsNode, { kind: 'file' }>) => `${node.text ?? blockText(node.show())}\n`;

export class TerminalFs extends InMemoryFs {
  // Every protected path, and each protected folder's children by their
  // folded name, for names matched without regard to capitals (FR-045).
  private readonly locked = new Set<string>(['/']);
  private readonly lockedNames = new Map<string, Map<string, string>>();
  // The built names of the home folder, in the design's order (FR-043).
  private readonly homeOrder: string[] = [];
  private building = true;

  constructor(tree: Folder) {
    super();
    for (const folder of LAYOUT) {
      this.mkdirSync(folder, { recursive: true });
      this.lock(folder);
    }
    this.mkdirSync(HOME, { recursive: true });
    this.mkdirSync(TMP, { recursive: true });
    for (const child of tree.children) {
      this.homeOrder.push(child.name);
      this.write(HOME, child);
    }
    this.building = false;
  }

  private lock(path: string) {
    this.locked.add(path);
    const folder = parentOf(path);
    if (!this.lockedNames.has(folder)) this.lockedNames.set(folder, new Map());
    this.lockedNames.get(folder)!.set(folded(nameOf(path)), nameOf(path));
  }

  private write(folder: string, node: FsNode) {
    const path = joined(folder, node.name);
    if (node.kind === 'file') this.writeFileSync(path, fileText(node));
    else {
      this.mkdirSync(path, { recursive: true });
      for (const child of node.children) this.write(path, child);
    }
    this.lock(path);
  }

  // just-bash writes its layout through the sync methods: `/proc` is left
  // out (research R28), and `/dev` and the command stubs are protected.
  override mkdirSync(path: string, options?: MkdirOptions) {
    if (path === '/proc' || path.startsWith('/proc/')) throw failure('ENOSYS', 'ENOSYS: no /proc');
    super.mkdirSync(path, options);
    if (!this.building && (path.startsWith('/dev') || path.startsWith('/bin') || path.startsWith('/usr'))) this.lock(path);
  }

  override writeFileSync(path: string, content: FileContent, options?: WriteFileOptions | BufferEncoding, metadata?: { mode?: number; mtime?: Date }) {
    if (path.startsWith('/proc/')) throw failure('ENOSYS', 'ENOSYS: no /proc');
    super.writeFileSync(path, content, options, metadata);
    if (!this.building && path !== '/dev/null' && (path.startsWith('/dev/') || path.startsWith('/bin/') || path.startsWith('/usr/'))) this.lock(path);
  }

  override writeFileLazy(path: string, lazy: () => string | Uint8Array | Promise<string | Uint8Array>, metadata?: { mode?: number; mtime?: Date }) {
    if (path.startsWith('/proc/')) throw failure('ENOSYS', 'ENOSYS: no /proc');
    super.writeFileLazy(path, lazy, metadata);
  }

  // A path as the tree names it: a part that names a protected entry in
  // another case is that entry (FR-045). The visitor's names are matched as
  // typed, as on Linux.
  canonical(path: string): string {
    let at = '/';
    for (const part of normal(path).split('/').filter((value) => value !== '')) {
      const name = this.lockedNames.get(at)?.get(folded(part)) ?? part;
      at = joined(at, name);
    }
    return at;
  }

  isProtected(path: string): boolean {
    return this.locked.has(this.canonical(path));
  }

  // Refused when the path, or the folder it is in, is protected; writing to
  // /dev/null is allowed.
  private guard(path: string) {
    if (this.refusesWrite(path)) throw denied();
  }

  // Whether a write to `path` would be refused, for the adapter's redirect
  // guard (research R28, G1).
  refusesWrite(path: string): boolean {
    const at = this.canonical(path);
    if (at === '/dev/null') return false;
    return this.locked.has(at) || this.locked.has(parentOf(at));
  }

  private async under(path: string): Promise<string[]> {
    const all = this.getAllPaths().filter((other) => other === path || other.startsWith(`${path}/`));
    return all.length === 0 ? [path] : all;
  }

  // The visitor's bytes: every file outside the protected set.
  async visitorBytes(): Promise<number> {
    let total = 0;
    for (const path of this.getAllPaths()) {
      if (this.locked.has(path) || path.startsWith('/dev/') || path.startsWith('/proc')) continue;
      const stat = await super.stat(path).catch(() => null);
      if (stat?.isFile) total += stat.size;
    }
    return total;
  }

  private async sizeOf(path: string): Promise<number> {
    let total = 0;
    for (const at of await this.under(path)) {
      const stat = await super.stat(at).catch(() => null);
      if (stat?.isFile) total += stat.size;
    }
    return total;
  }

  private async room(path: string, adding: number, replacing: boolean) {
    const now = await this.visitorBytes();
    const old = replacing ? await this.sizeOf(path).catch(() => 0) : 0;
    if (now - old + adding > QUOTA) throw noSpace();
  }

  private async folderExists(path: string) {
    const stat = await super.stat(path).catch(() => null);
    return stat?.isDirectory === true;
  }

  override async writeFile(path: string, content: FileContent, options?: WriteFileOptions | BufferEncoding) {
    const at = this.canonical(path);
    this.guard(at);
    if (at === '/dev/null') return;
    if (!(await this.folderExists(parentOf(at)))) throw missing();
    const exists = await super.exists(at);
    await this.room(at, byteLength(content), exists);
    return super.writeFile(at, content, options);
  }

  override async appendFile(path: string, content: FileContent, options?: WriteFileOptions | BufferEncoding) {
    const at = this.canonical(path);
    this.guard(at);
    if (at === '/dev/null') return;
    if (!(await this.folderExists(parentOf(at)))) throw missing();
    await this.room(at, byteLength(content), false);
    return super.appendFile(at, content, options);
  }

  override async createExclusive(path: string, options: CreateExclusiveOptions) {
    const at = this.canonical(path);
    this.guard(at);
    if (!(await this.folderExists(parentOf(at)))) throw missing();
    return super.createExclusive(at, options);
  }

  override async mkdir(path: string, options?: MkdirOptions) {
    const at = this.canonical(path);
    // `mkdir -p` on a folder that is there changes nothing.
    if (options?.recursive === true && (await this.folderExists(at))) return;
    if (options?.recursive === true) {
      let prefix = '/';
      for (const part of at.split('/').filter((value) => value !== '')) {
        prefix = joined(prefix, part);
        if (!(await this.folderExists(prefix))) this.guard(prefix);
      }
    } else this.guard(at);
    return super.mkdir(at, options);
  }

  override async rm(path: string, options?: RmOptions) {
    const at = this.canonical(path);
    this.guard(at);
    if (options?.recursive === true && (await this.under(at)).some((inside) => this.locked.has(inside))) throw denied();
    return super.rm(at, options);
  }

  override async cp(src: string, dest: string, options?: CpOptions) {
    const from = this.canonical(src);
    const to = this.canonical(dest);
    this.guard(to);
    if (!(await this.folderExists(parentOf(to)))) throw missing();
    await this.room(to, await this.sizeOf(from), await super.exists(to));
    return super.cp(from, to, options);
  }

  override async mv(src: string, dest: string) {
    const from = this.canonical(src);
    const to = this.canonical(dest);
    this.guard(from);
    this.guard(to);
    if ((await this.under(from)).some((inside) => this.locked.has(inside))) throw denied();
    return super.mv(from, to);
  }

  override async chmod(path: string, mode: number) {
    const at = this.canonical(path);
    this.guard(at);
    return super.chmod(at, mode);
  }

  override async symlink(target: string, linkPath: string) {
    const at = this.canonical(linkPath);
    this.guard(at);
    return super.symlink(target, at);
  }

  override async link(existingPath: string, newPath: string) {
    const at = this.canonical(newPath);
    this.guard(at);
    return super.link(this.canonical(existingPath), at);
  }

  override async utimes(path: string, atime: Date, mtime: Date) {
    const at = this.canonical(path);
    this.guard(at);
    return super.utimes(at, atime, mtime);
  }

  // Reading: names in another case find protected entries (FR-045).
  override readFile(path: string, options?: Parameters<InMemoryFs['readFile']>[1]) {
    return super.readFile(this.canonical(path), options);
  }

  override readFileBytes(path: string) {
    return super.readFileBytes(this.canonical(path));
  }

  override readFileBuffer(path: string) {
    return super.readFileBuffer(this.canonical(path));
  }

  override exists(path: string) {
    return super.exists(this.canonical(path));
  }

  // Protected entries read only, the visitor's read and write (FR-049).
  private withMode(path: string, stat: FsStat): FsStat {
    const mode = this.locked.has(path) ? (stat.isDirectory ? MODE.protectedFolder : MODE.protectedFile) : stat.isDirectory ? MODE.folder : MODE.file;
    return { ...stat, mode };
  }

  override async stat(path: string) {
    const at = this.canonical(path);
    return this.withMode(at, await super.stat(at));
  }

  override async lstat(path: string) {
    const at = this.canonical(path);
    return this.withMode(at, await super.lstat(at));
  }

  override realpath(path: string) {
    return super.realpath(this.canonical(path));
  }

  override readlink(path: string) {
    return super.readlink(this.canonical(path));
  }

  // The home folder's built entries in the design's order, then the
  // visitor's in name order (FR-043, FR-073).
  private ordered(path: string, names: string[]): string[] {
    if (path !== HOME) return names;
    const built = this.homeOrder.filter((name) => names.includes(name));
    return [...built, ...names.filter((name) => !this.homeOrder.includes(name)).sort()];
  }

  override async readdir(path: string) {
    const at = this.canonical(path);
    return this.ordered(at, await super.readdir(at));
  }

  override async readdirWithFileTypes(path: string): Promise<DirentEntry[]> {
    const at = this.canonical(path);
    const entries = await super.readdirWithFileTypes(at);
    const order = this.ordered(
      at,
      entries.map((entry) => entry.name),
    );
    return order.map((name) => entries.find((entry) => entry.name === name)!);
  }

  // An entry's owner, for `ls -l` (research R28, G7).
  info(path: string, kind: 'file' | 'folder'): FsEntryInfo {
    const at = this.canonical(path);
    const locked = this.locked.has(at) && at !== HOME;
    return { path: at, kind, owner: locked ? 'root' : 'guest', protected: locked };
  }

  // The visitor's folders and files, parents first (research R26).
  async snapshot(): Promise<VisitorFiles> {
    const folders: string[] = [];
    const files: Record<string, string> = {};
    let bytes = 0;
    for (const path of [...this.getAllPaths()].sort()) {
      if (this.locked.has(path) || path === HOME || path === TMP || path.startsWith('/dev/') || path.startsWith('/proc')) continue;
      if (!path.startsWith(`${HOME}/`) && !path.startsWith(`${TMP}/`)) continue;
      const stat = await super.stat(path).catch(() => null);
      if (stat === null) continue;
      if (stat.isDirectory) folders.push(path);
      else if (stat.isFile) {
        files[path] = await super.readFile(path);
        bytes += stat.size;
      }
    }
    return { folders, files, bytes };
  }

  // No visitor file left; the protected tree as it was built (FR-021).
  async reset(): Promise<void> {
    const visitor = this.getAllPaths().filter((path) => (path.startsWith(`${HOME}/`) || path.startsWith(`${TMP}/`)) && !this.locked.has(path));
    for (const path of visitor.sort((a, b) => b.length - a.length)) await super.rm(path, { recursive: true, force: true });
  }

  // The visitor's files from a snapshot, after a reset.
  async restore(files: VisitorFiles): Promise<void> {
    await this.reset();
    for (const folder of files.folders) await super.mkdir(folder, { recursive: true });
    for (const [path, text] of Object.entries(files.files)) {
      await super.mkdir(parentOf(path), { recursive: true });
      await super.writeFile(path, text);
    }
  }
}
