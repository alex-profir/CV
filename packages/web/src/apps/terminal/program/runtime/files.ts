// The program's own copy of the Terminal's files (009 research R10, FR-029): from
// the snapshot, under the same rules and 1 MB as 006's, seen at once by the
// program, and every change sent to the page at once.
import { createChanges } from '../changes.ts';
import type { FileSnapshot } from '../messages.ts';
import { QUOTA } from '../../shell/protocol.ts';

export const HOME = '/home/guest';
export const TMP = '/tmp';

export type FileNode = { kind: 'file' | 'folder'; owner: 'root' | 'guest'; protected: boolean; text: string; binary: boolean; mtime: number };

export const fsError = (code: 'ENOENT' | 'EACCES' | 'EISDIR' | 'ENOTDIR' | 'EEXIST' | 'ENOTEMPTY' | 'ENOSPC' | 'EINVAL', syscall: string, path: string, dest?: string): Error => {
  const facts = { ENOENT: [-2, 'no such file or directory'], EACCES: [-13, 'permission denied'], EISDIR: [-21, 'illegal operation on a directory'], ENOTDIR: [-20, 'not a directory'], EEXIST: [-17, 'file already exists'], ENOTEMPTY: [-39, 'directory not empty'], ENOSPC: [-28, 'no space left on device'], EINVAL: [-22, 'invalid argument'] } as const;
  const [errno, words] = facts[code];
  // Reading a folder: Node's error names no path.
  if (path === '') return Object.assign(new Error(`${code}: ${words}, ${syscall}`), { errno, code, syscall });
  const places = dest === undefined ? `'${path}'` : `'${path}' -> '${dest}'`;
  return Object.assign(new Error(`${code}: ${words}, ${syscall} ${places}`), { errno, code, syscall, path, ...(dest === undefined ? {} : { dest }) });
};

const parentOf = (path: string) => path.slice(0, path.lastIndexOf('/')) || '/';

// Bytes of a file's text, as the shell counts them.
const bytesOf = (node: Pick<FileNode, 'text' | 'binary'>, encode: (text: string) => { length: number }) => (node.binary ? node.text.length : encode(node.text).length);

export function createFiles(snapshot: FileSnapshot, deps: { send: (message: Record<string, unknown>) => void; now: () => number }) {
  const nodes = new Map<string, FileNode>();
  const encoder = new TextEncoder();
  const encode = (text: string) => encoder.encode(text);
  const now = deps.now();
  for (const entry of snapshot.entries) {
    nodes.set(entry.path, { kind: entry.kind, owner: entry.owner, protected: entry.protected, text: entry.text ?? '', binary: entry.binary === true, mtime: now });
    // Every folder above a file is there, even with no entry of its own.
    for (let parent = parentOf(entry.path); parent !== '/' && !nodes.has(parent); parent = parentOf(parent)) nodes.set(parent, { kind: 'folder', owner: 'root', protected: true, text: '', binary: false, mtime: now });
  }
  if (!nodes.has('/')) nodes.set('/', { kind: 'folder', owner: 'root', protected: true, text: '', binary: false, mtime: now });
  if (!nodes.has(TMP)) nodes.set(TMP, { kind: 'folder', owner: 'root', protected: false, text: '', binary: false, mtime: now });
  let used = snapshot.bytes;
  const changes = createChanges(new Set(snapshot.entries.map((entry) => entry.path)));

  // Where a write is refused: a protected path, or inside a protected folder, as
  // `TerminalFs` refuses it. The home folder is the visitor's, though it's marked.
  const refused = (path: string) => {
    const node = nodes.get(path);
    if (node?.protected === true && path !== HOME && path !== TMP) return true;
    const parent = parentOf(path);
    return parent !== HOME && parent !== TMP && nodes.get(parent)?.protected === true;
  };
  const outside = (path: string) => path !== HOME && path !== TMP && !path.startsWith(`${HOME}/`) && !path.startsWith(`${TMP}/`);

  const writable = (path: string, syscall: string) => {
    if (refused(path) || outside(path)) throw fsError('EACCES', syscall, path);
  };

  const parentChecked = (path: string, syscall: string) => {
    const parent = nodes.get(parentOf(path));
    if (parent === undefined) throw fsError('ENOENT', syscall, path);
    if (parent.kind !== 'folder') throw fsError('ENOTDIR', syscall, path);
  };

  const children = (path: string) => {
    const prefix = path === '/' ? '/' : `${path}/`;
    return [...nodes.keys()].filter((each) => each !== path && each.startsWith(prefix) && !each.slice(prefix.length).includes('/'));
  };

  function put(path: string, text: string, binary: boolean, syscall: string): void {
    const node = nodes.get(path);
    if (node?.kind === 'folder') throw fsError('EISDIR', syscall, path);
    parentChecked(path, syscall);
    writable(path, syscall);
    const size = binary ? text.length : encode(text).length;
    const before = node === undefined ? 0 : bytesOf(node, encode);
    if (used - before + size > QUOTA || !changes.fits(path, 'file')) throw fsError('ENOSPC', syscall, path);
    used += size - before;
    changes.add({ path, text: '' });
    nodes.set(path, { kind: 'file', owner: node?.owner ?? 'guest', protected: false, text, binary, mtime: deps.now() });
    deps.send(binary ? { file: path, text, binary: true } : { file: path, text });
  }

  function removeFile(path: string, syscall: string): void {
    const node = nodes.get(path);
    if (node === undefined) throw fsError('ENOENT', syscall, path);
    if (node.kind === 'folder') throw fsError('EISDIR', syscall, path);
    writable(path, syscall);
    used -= bytesOf(node, encode);
    nodes.delete(path);
    changes.add({ path, removed: true });
    deps.send({ file: path, removed: true });
  }

  function makeFolder(path: string, syscall = 'mkdir'): void {
    const node = nodes.get(path);
    if (node !== undefined) throw fsError('EEXIST', syscall, path);
    parentChecked(path, syscall);
    writable(path, syscall);
    if (!changes.fits(path, 'folder')) throw fsError('ENOSPC', syscall, path);
    changes.add({ path, made: true });
    nodes.set(path, { kind: 'folder', owner: 'guest', protected: false, text: '', binary: false, mtime: deps.now() });
    deps.send({ folder: path, made: true });
  }

  function removeFolder(path: string, syscall = 'rmdir'): void {
    const node = nodes.get(path);
    if (node === undefined) throw fsError('ENOENT', syscall, path);
    if (node.kind !== 'folder') throw fsError('ENOTDIR', syscall, path);
    writable(path, syscall);
    if (children(path).length > 0) throw fsError('ENOTEMPTY', syscall, path);
    nodes.delete(path);
    changes.add({ path, made: false });
    deps.send({ folder: path, made: false });
  }

  // Whether a rename could go through, before anything of it is done.
  function checkMove(from: string, to: string, syscall: string): void {
    writable(from, syscall);
    // A folder can't go inside itself.
    if (nodes.get(from)?.kind === 'folder' && to.startsWith(`${from}/`)) throw fsError('EINVAL', syscall, from, to);
    if (nodes.get(to)?.kind === 'folder') throw fsError('EISDIR', syscall, to);
    parentChecked(to, syscall);
    writable(to, syscall);
  }

  return { get: (path: string) => nodes.get(path), children, checkMove, put, removeFile, makeFolder, removeFolder, parentOf, sizeOf: (node: FileNode) => bytesOf(node, encode) };
}

export type Files = ReturnType<typeof createFiles>;
