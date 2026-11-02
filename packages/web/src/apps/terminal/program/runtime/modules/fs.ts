// `fs`, `fs/promises` and `fs.promises` (009 research R10, FR-029, FR-030): on the
// program's own copy of the files, in Node's error form. Its sync forms are the
// code; the callback and promise forms call them.
import type { Buffer as BufferType } from 'node:buffer';
import { fsError, type Files, type FileNode } from '../files.ts';
import type { Loop } from '../loop.ts';

type Path = { resolve(...parts: string[]): string };
type BufferClass = typeof BufferType;

const NAMES = ['readFile', 'writeFile', 'appendFile', 'exists', 'stat', 'lstat', 'readdir', 'mkdir', 'rm', 'rmdir', 'unlink', 'rename', 'copyFile'] as const;

type Encoding = string | null | undefined | { encoding?: string | null; flag?: string; recursive?: boolean; force?: boolean; withFileTypes?: boolean };

const encodingOf = (options: Encoding) => (typeof options === 'string' ? options : (options?.encoding ?? null));

const invalidPath = (value: unknown) => Object.assign(new TypeError(`The "path" argument must be of type string or an instance of Buffer or URL. Received ${value === null ? 'null' : value === undefined ? 'undefined' : `type ${typeof value} (${String(value)})`}`), { code: 'ERR_INVALID_ARG_TYPE' });

export function createFs(files: Files, loop: Loop, path: Path, Buffer: BufferClass) {
  const at = (given: unknown): string => {
    if (typeof given === 'string') return path.resolve(given);
    if (given instanceof URL) return path.resolve(decodeURIComponent(given.pathname));
    if (given instanceof Uint8Array) return path.resolve(new TextDecoder().decode(given));
    throw invalidPath(given);
  };

  const contentsOf = (node: FileNode) => (node.binary ? Buffer.from(node.text, 'latin1') : Buffer.from(node.text, 'utf8'));

  // What a write holds: text if it is valid UTF-8, else one character a byte.
  function textOf(data: unknown, options: Encoding): { text: string; binary: boolean } {
    if (typeof data === 'string') {
      const encoding = encodingOf(options) ?? 'utf8';
      if (encoding === 'utf8' || encoding === 'utf-8') return { text: data, binary: false };
      return fromBytes(Buffer.from(data, encoding as BufferEncoding));
    }
    if (ArrayBuffer.isView(data)) return fromBytes(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    throw Object.assign(new TypeError(`The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received ${data === null ? 'null' : data === undefined ? 'undefined' : `type ${typeof data}`}`), { code: 'ERR_INVALID_ARG_TYPE' });
  }
  function fromBytes(bytes: Uint8Array): { text: string; binary: boolean } {
    try {
      return { text: new TextDecoder('utf-8', { fatal: true }).decode(bytes), binary: false };
    } catch {
      return { text: Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''), binary: true };
    }
  }

  class Stats {
    dev = 0;
    mode: number;
    nlink = 1;
    uid = 1000;
    gid = 1000;
    rdev = 0;
    blksize = 4096;
    ino = 0;
    size: number;
    blocks: number;
    atimeMs: number;
    mtimeMs: number;
    ctimeMs: number;
    birthtimeMs: number;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
    #folder: boolean;

    constructor(node: FileNode) {
      this.#folder = node.kind === 'folder';
      this.mode = this.#folder ? 0o40755 : node.protected ? 0o100444 : 0o100644;
      this.size = this.#folder ? 4096 : files.sizeOf(node);
      this.blocks = Math.ceil(this.size / 512);
      this.atimeMs = this.mtimeMs = this.ctimeMs = this.birthtimeMs = node.mtime;
      this.atime = this.mtime = this.ctime = this.birthtime = new Date(node.mtime);
    }

    isFile() {
      return !this.#folder;
    }

    isDirectory() {
      return this.#folder;
    }

    isSymbolicLink() {
      return false;
    }

    isFIFO() {
      return false;
    }

    isSocket() {
      return false;
    }

    isBlockDevice() {
      return false;
    }

    isCharacterDevice() {
      return false;
    }
  }

  class Dirent {
    name: string;
    parentPath: string;
    path: string;
    #folder: boolean;

    constructor(name: string, parentPath: string, folder: boolean) {
      this.name = name;
      this.parentPath = parentPath;
      this.path = parentPath;
      this.#folder = folder;
    }

    isFile() {
      return !this.#folder;
    }

    isDirectory() {
      return this.#folder;
    }

    isSymbolicLink() {
      return false;
    }
  }

  const stat = (given: unknown, options?: { throwIfNoEntry?: boolean }, syscall = 'stat') => {
    const node = files.get(at(given));
    if (node === undefined) {
      if (options?.throwIfNoEntry === false) return undefined;
      throw fsError('ENOENT', syscall, String(given));
    }
    return new Stats(node);
  };

  // Standard input reads as already ended (FR-016).
  const isStdin = (given: unknown) => given === 0 || given === '/dev/stdin';

  const sync = {
    readFileSync(given: unknown, options?: Encoding) {
      if (isStdin(given)) return encodingOf(options) === null ? Buffer.alloc(0) : '';
      const target = at(given);
      const node = files.get(target);
      if (node === undefined) throw fsError('ENOENT', 'open', String(given));
      if (node.kind === 'folder') throw fsError('EISDIR', 'read', '');
      const encoding = encodingOf(options);
      if (encoding === null) return contentsOf(node);
      if ((encoding === 'utf8' || encoding === 'utf-8') && !node.binary) return node.text;
      return contentsOf(node).toString(encoding as BufferEncoding);
    },
    writeFileSync(given: unknown, data: unknown, options?: Encoding) {
      const target = at(given);
      const flag = typeof options === 'object' ? options?.flag : undefined;
      if (flag === 'a') {
        sync.appendFileSync(given, data, options);
        return;
      }
      if (flag === 'wx' && files.get(target) !== undefined) throw fsError('EEXIST', 'open', String(given));
      const { text, binary } = textOf(data, options);
      try {
        files.put(target, text, binary, 'open');
      } catch (error) {
        throw named(error, String(given));
      }
    },
    appendFileSync(given: unknown, data: unknown, options?: Encoding) {
      const target = at(given);
      const node = files.get(target);
      const { text, binary } = textOf(data, options);
      try {
        if (node === undefined || node.kind === 'folder') files.put(target, text, binary, 'open');
        else if (!node.binary && !binary) files.put(target, node.text + text, false, 'open');
        else {
          const before = node.binary ? node.text : Array.from(new TextEncoder().encode(node.text), (byte) => String.fromCharCode(byte)).join('');
          const after = binary ? text : Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join('');
          files.put(target, before + after, true, 'open');
        }
      } catch (error) {
        throw named(error, String(given));
      }
    },
    existsSync(given: unknown) {
      try {
        return files.get(at(given)) !== undefined;
      } catch {
        return false;
      }
    },
    statSync: (given: unknown, options?: { throwIfNoEntry?: boolean }) => stat(given, options),
    lstatSync: (given: unknown, options?: { throwIfNoEntry?: boolean }) => stat(given, options, 'lstat'),
    readdirSync(given: unknown, options?: Encoding) {
      const target = at(given);
      const node = files.get(target);
      if (node === undefined) throw fsError('ENOENT', 'scandir', String(given));
      if (node.kind !== 'folder') throw fsError('ENOTDIR', 'scandir', String(given));
      const walk = (folder: string, prefix: string): string[] =>
        files
          .children(folder)
          .flatMap((child) => {
            const name = `${prefix}${child.slice(child.lastIndexOf('/') + 1)}`;
            return typeof options === 'object' && options?.recursive === true && files.get(child)?.kind === 'folder' ? [name, ...walk(child, `${name}/`)] : [name];
          });
      const names = walk(target, '').sort();
      if (typeof options === 'object' && options?.withFileTypes === true) return names.map((name) => new Dirent(name.slice(name.lastIndexOf('/') + 1), name.includes('/') ? `${target}/${name.slice(0, name.lastIndexOf('/'))}` : target, files.get(`${target}/${name}`)?.kind === 'folder'));
      return names;
    },
    mkdirSync(given: unknown, options?: number | { recursive?: boolean; mode?: number }) {
      const target = at(given);
      const recursive = typeof options === 'object' && options?.recursive === true;
      if (!recursive) {
        try {
          files.makeFolder(target);
        } catch (error) {
          throw named(error, String(given));
        }
        return undefined;
      }
      let first: string | undefined;
      const parts = target.split('/').filter(Boolean);
      let walked = '';
      for (const part of parts) {
        walked += `/${part}`;
        const node = files.get(walked);
        if (node === undefined) {
          try {
            files.makeFolder(walked);
          } catch (error) {
            throw named(error, String(given));
          }
          first ??= walked;
        } else if (node.kind !== 'folder') throw fsError(walked === target ? 'EEXIST' : 'ENOTDIR', 'mkdir', String(given));
      }
      return first;
    },
    rmSync(given: unknown, options?: { recursive?: boolean; force?: boolean }) {
      const target = at(given);
      const node = files.get(target);
      if (node === undefined) {
        if (options?.force === true) return;
        throw fsError('ENOENT', 'rm', String(given));
      }
      if (node.kind === 'folder') {
        if (options?.recursive !== true) throw Object.assign(new Error(`Path is a directory: rm returned EISDIR (is a directory) ${given}`), { name: 'SystemError', code: 'ERR_FS_EISDIR', syscall: 'rm', errno: 21 });
        for (const child of files.children(target)) sync.rmSync(child, { recursive: true, force: true });
        files.removeFolder(target, 'rm');
      } else files.removeFile(target, 'rm');
    },
    rmdirSync(given: unknown) {
      try {
        files.removeFolder(at(given));
      } catch (error) {
        throw named(error, String(given));
      }
    },
    unlinkSync(given: unknown) {
      const target = at(given);
      const node = files.get(target);
      if (node?.kind === 'folder') throw fsError('EISDIR', 'unlink', String(given));
      try {
        files.removeFile(target, 'unlink');
      } catch (error) {
        throw named(error, String(given));
      }
    },
    renameSync(from: unknown, to: unknown) {
      const source = at(from);
      const target = at(to);
      const node = files.get(source);
      if (node === undefined) throw fsError('ENOENT', 'rename', String(from), String(to));
      if (source === target) return;
      try {
        files.checkMove(source, target, 'rename');
        if (node.kind === 'file') {
          // In this order, so a large file doesn't count twice toward the limit.
          files.removeFile(source, 'rename');
          files.put(target, node.text, node.binary, 'rename');
        } else {
          files.makeFolder(target, 'rename');
          for (const child of files.children(source)) sync.renameSync(child, `${target}/${child.slice(child.lastIndexOf('/') + 1)}`);
          files.removeFolder(source, 'rename');
        }
      } catch (error) {
        const { code } = error as { code?: 'EACCES' };
        throw code === undefined ? error : fsError(code, 'rename', String(from), String(to));
      }
    },
    copyFileSync(from: unknown, to: unknown, mode?: number) {
      const source = files.get(at(from));
      if (source === undefined) throw fsError('ENOENT', 'copyfile', String(from), String(to));
      if (source.kind === 'folder') throw fsError('EISDIR', 'copyfile', String(from), String(to));
      const target = at(to);
      if (mode === 1 && files.get(target) !== undefined) throw fsError('EEXIST', 'copyfile', String(from), String(to));
      try {
        files.put(target, source.text, source.binary, 'copyfile');
      } catch (error) {
        const { code } = error as { code?: 'EACCES' };
        throw code === undefined ? error : fsError(code, 'copyfile', String(from), String(to));
      }
    },
  };

  // The path as the program gave it, in the error's words.
  function named(error: unknown, given: string): unknown {
    const { code, syscall } = error as { code?: Parameters<typeof fsError>[0]; syscall?: string };
    return code === undefined || syscall === undefined ? error : fsError(code, syscall, given);
  }

  const callOf = (name: string) => (sync as unknown as Record<string, (...values: unknown[]) => unknown>)[`${name}Sync`]!;

  // `readFile(path, [options], callback)`, called later, as a real one is.
  const callback = Object.fromEntries(
    NAMES.map((name) => [
      name,
      (...values: unknown[]) => {
        const done = values.pop();
        if (typeof done !== 'function') throw Object.assign(new TypeError(`The "cb" argument must be of type function. Received ${done === null ? 'null' : done === undefined ? 'undefined' : `type ${typeof done}`}`), { code: 'ERR_INVALID_ARG_TYPE' });
        let result: unknown;
        let failure: unknown = null;
        try {
          result = callOf(name)(...values);
        } catch (error) {
          failure = error;
        }
        loop.defer(() => {
          if (name === 'exists') done(result);
          else if (failure !== null) done(failure);
          else if (result === undefined) done(null);
          else done(null, result);
        });
      },
    ]),
  );

  // The same, as promises (`exists` has none there).
  const promises = Object.fromEntries(
    NAMES.filter((name) => name !== 'exists').map((name) => [
      name,
      (...values: unknown[]) =>
        new Promise((resolve, reject) => {
          let result: unknown;
          let failure: unknown = null;
          try {
            result = callOf(name)(...values);
          } catch (error) {
            failure = error;
          }
          loop.defer(() => (failure !== null ? reject(failure) : resolve(result)));
        }),
    ]),
  );

  return { ...sync, ...callback, promises, Stats, Dirent, constants: { F_OK: 0, R_OK: 4, W_OK: 2, X_OK: 1, COPYFILE_EXCL: 1 } };
}
