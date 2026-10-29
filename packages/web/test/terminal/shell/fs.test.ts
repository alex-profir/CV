// TerminalFs (006 research R28, data-model.md Terminal file system): the CV's
// tree as protected files in the home folder, the layout the shell needs,
// and room for the visitor's own files.
import { describe, expect, test } from 'vitest';
import { Bash } from 'just-bash/browser';
import { TerminalFs } from '../../../src/apps/terminal/shell/fs.ts';
import { QUOTA } from '../../../src/apps/terminal/shell/protocol.ts';
import { contextFor } from '../engine/context.ts';
import { runLine, runLines, shellFor } from './context.ts';

const fresh = () => new TerminalFs(contextFor('every-field').fs);

// A TerminalFs inside a shell, as just-bash lays it out.
function withShell() {
  const fs = fresh();
  new Bash({ fs, cwd: '/home/guest', commands: ['ls', 'cat'] });
  return fs;
}

const rejects = async (action: Promise<unknown>, message: string) => {
  await expect(action).rejects.toThrow(message);
};

const BUILT = ['cv.json', 'about', 'contact', 'work', 'projects', 'skills', 'education', 'languages', 'interests', 'readme', 'specs'];

describe('006-terminal-FR-045: the file system’s layout and paths', () => {
  test('home is /home/guest; / holds bin dev home tmp usr, and no /proc', async () => {
    const fs = withShell();
    expect((await fs.readdir('/')).sort()).toEqual(['bin', 'dev', 'home', 'tmp', 'usr']);
    expect(await fs.exists('/proc')).toBe(false);
    expect(await fs.readdir('/home')).toEqual(['guest']);
    expect(await fs.exists('/dev/null')).toBe(true);
  });

  test('relative paths, ., .., ~/, /, globs and capitals resolve from every folder', async () => {
    const shell = shellFor('every-field');
    const results = await runLines(shell, ['cd work', 'ls ../about', 'ls ./', 'cd ~/projects', 'pwd', 'cd /', 'ls', 'cd', 'pwd', 'ls ~/WORK', 'cat ABOUT | head -1', 'echo ~/work/*', 'echo ~/ab?ut', 'echo ~/[a-c]*', 'cd ..', 'pwd', 'cd', 'pwd']);
    const out = results.map((result) => result.stdout.trim());
    expect(out[1]).toBe('../about');
    expect(out[4]).toBe('/home/guest/projects');
    expect(out[6]!.split('\n')).toEqual(['bin', 'dev', 'home', 'tmp', 'usr']);
    expect(out[8]).toBe('/home/guest');
    expect(out[9]!.length).toBeGreaterThan(0);
    expect(results[10]!.status).toBe(0);
    expect(out[10]).toBe('Field Fixture Person');
    expect(out[11]!.split(' ').every((path) => path.startsWith('/home/guest/work/'))).toBe(true);
    expect(out[12]).toBe('/home/guest/about');
    expect(out[13]!.split(' ')).toEqual(['/home/guest/about', '/home/guest/contact', '/home/guest/cv.json']);
    expect(out[15]).toBe('/home');
    expect(out[17]).toBe('/home/guest');
  });
});

describe('006-terminal-FR-043: the home folder lists the built entries in the design’s order, then the visitor’s', () => {
  test('readdir of /home/guest', async () => {
    const fs = withShell();
    expect(await fs.readdir('/home/guest')).toEqual(BUILT);
    await fs.writeFile('/home/guest/zeta', 'z');
    await fs.writeFile('/home/guest/alpha', 'a');
    expect(await fs.readdir('/home/guest')).toEqual([...BUILT, 'alpha', 'zeta']);
    expect((await fs.readdirWithFileTypes('/home/guest')).map((entry) => entry.name)).toEqual([...BUILT, 'alpha', 'zeta']);
  });

  test('empty sections are left out', async () => {
    const fs = new TerminalFs(contextFor('empty-sections').fs);
    const names = await fs.readdir('/home/guest');
    expect(names).not.toContain('interests');
    expect(names[0]).toBe('cv.json');
  });
});

describe('006-terminal-FR-049: protected paths refuse every write and change nothing', () => {
  const PROTECTED = ['/home/guest/about', '/home/guest/work', '/home/guest/work/x', '/', '/home', '/home/x', '/bin', '/bin/x', '/usr', '/usr/bin/x', '/dev', '/dev/stdout'];

  test('writeFile, appendFile, mkdir, rm, cp and mv onto, out of or into a protected path', async () => {
    const fs = withShell();
    const before = await fs.readFile('/home/guest/about');
    await fs.writeFile('/home/guest/mine', 'mine');
    for (const path of PROTECTED) {
      if (path !== '/' && path !== '/home' && path !== '/bin' && path !== '/usr' && path !== '/dev' && path !== '/home/guest/work') {
        await rejects(fs.writeFile(path, 'x'), 'Permission denied');
        await rejects(fs.appendFile(path, 'x'), 'Permission denied');
      }
      await rejects(fs.mkdir(path), 'Permission denied');
      await rejects(fs.cp('/home/guest/mine', path), 'Permission denied');
      await rejects(fs.mv('/home/guest/mine', path), 'Permission denied');
    }
    for (const path of ['/home/guest/about', '/home/guest/work', '/home/guest/work/' + (await fs.readdir('/home/guest/work'))[0], '/bin', '/home']) {
      await rejects(fs.rm(path, { recursive: true, force: true }), 'Permission denied');
      await rejects(fs.mv(path, '/home/guest/moved'), 'Permission denied');
    }
    await rejects(fs.rm('/home/guest', { recursive: true }), 'Permission denied');
    await rejects(fs.chmod('/home/guest/about', 0o777), 'Permission denied');
    await rejects(fs.utimes('/home/guest/about', new Date(), new Date()), 'Permission denied');
    await rejects(fs.symlink('/home/guest/mine', '/home/guest/work/link'), 'Permission denied');
    expect(await fs.readFile('/home/guest/about')).toBe(before);
    expect(await fs.readdir('/home/guest')).toEqual([...BUILT, 'mine']);
    // Writing to /dev/null is allowed, and keeps nothing.
    await fs.writeFile('/dev/null', 'gone');
    expect(await fs.readFile('/dev/null')).toBe('');
  });

  test('modes: protected files 0444 and folders 0555, the visitor’s 0644 and 0755; home takes writes', async () => {
    const fs = withShell();
    expect((await fs.stat('/home/guest/about')).mode & 0o777).toBe(0o444);
    expect((await fs.stat('/home/guest/work')).mode & 0o777).toBe(0o555);
    await fs.writeFile('/home/guest/notes', 'n');
    await fs.mkdir('/home/guest/mine');
    expect((await fs.stat('/home/guest/notes')).mode & 0o777).toBe(0o644);
    expect((await fs.stat('/home/guest/mine')).mode & 0o777).toBe(0o755);
    expect((await fs.stat('/home/guest')).mode & 0o777).toBe(0o755);
  });

  test('capitals: a part that doesn’t exist as typed matches a protected name; the visitor’s names are case-sensitive', async () => {
    const fs = withShell();
    expect(await fs.readFile('/home/guest/ABOUT')).toBe(await fs.readFile('/home/guest/about'));
    await rejects(fs.writeFile('/home/guest/About', 'x'), 'Permission denied');
    await fs.writeFile('/home/guest/Notes', 'upper');
    await fs.writeFile('/home/guest/notes', 'lower');
    expect(await fs.readFile('/home/guest/Notes')).toBe('upper');
    expect(await fs.readFile('/home/guest/notes')).toBe('lower');
  });
});

describe('006-terminal-FR-073: the visitor’s files, within 1 MB', () => {
  test('writes work in home, in a visitor’s folder and in /tmp', async () => {
    const fs = withShell();
    await fs.writeFile('/home/guest/a', 'a');
    await fs.mkdir('/home/guest/notes');
    await fs.writeFile('/home/guest/notes/b', 'b');
    await fs.writeFile('/tmp/c', 'c');
    expect(await fs.readFile('/home/guest/notes/b')).toBe('b');
    expect(await fs.readFile('/tmp/c')).toBe('c');
  });

  test('a write past 1,048,576 bytes is refused with No space left on device, and the earlier files stay', async () => {
    const fs = withShell();
    await fs.writeFile('/home/guest/half', 'x'.repeat(QUOTA / 2));
    await fs.writeFile('/tmp/quarter', 'x'.repeat(QUOTA / 4));
    await rejects(fs.writeFile('/home/guest/big', 'x'.repeat(QUOTA / 2)), 'No space left on device');
    await rejects(fs.appendFile('/tmp/quarter', 'x'.repeat(QUOTA / 2)), 'No space left on device');
    expect(await fs.exists('/home/guest/big')).toBe(false);
    expect((await fs.readFile('/home/guest/half')).length).toBe(QUOTA / 2);
    expect((await fs.readFile('/tmp/quarter')).length).toBe(QUOTA / 4);
    // Up to the limit exactly is allowed.
    await fs.writeFile('/home/guest/rest', 'x'.repeat(QUOTA / 4));
    expect(await fs.visitorBytes()).toBe(QUOTA);
  });

  test('a write into a missing folder is refused with No such file or directory (research G6)', async () => {
    const fs = withShell();
    await rejects(fs.writeFile('/home/guest/nope/x', 'x'), 'No such file or directory');
    await rejects(fs.writeFile('/nope/x', 'x'), 'No such file or directory');
    expect(await fs.exists('/home/guest/nope')).toBe(false);
  });

  test('snapshot gives the visitor’s files, parents first; restore rebuilds them; reset leaves none', async () => {
    const fs = withShell();
    const pristine = await Promise.all(BUILT.map((name) => fs.readFile(`/home/guest/${name}`).catch(() => 'folder')));
    await fs.mkdir('/home/guest/notes');
    await fs.mkdir('/home/guest/notes/deep');
    await fs.writeFile('/home/guest/notes/deep/a', 'aa');
    await fs.writeFile('/tmp/b', 'b');
    const snapshot = await fs.snapshot();
    expect(snapshot).toEqual({ folders: ['/home/guest/notes', '/home/guest/notes/deep'], files: { '/home/guest/notes/deep/a': 'aa', '/tmp/b': 'b' }, bytes: 3 });
    await fs.reset();
    expect(await fs.readdir('/home/guest')).toEqual(BUILT);
    expect(await fs.readdir('/tmp')).toEqual([]);
    expect(await Promise.all(BUILT.map((name) => fs.readFile(`/home/guest/${name}`).catch(() => 'folder')))).toEqual(pristine);
    await fs.restore(snapshot);
    expect(await fs.snapshot()).toEqual(snapshot);
  });

  test('through the shell: files carry from line to line, and a protected write says why', async () => {
    const shell = shellFor('every-field');
    const results = await runLines(shell, ['echo hello > notes', 'cat notes', 'touch about', 'mkdir work/x', 'echo hi > /tmp/t; cat /tmp/t']);
    expect(results[1]!.stdout).toBe('hello\n');
    expect(results[2]!.stderr).toBe("touch: cannot touch 'about': Permission denied\n");
    expect(results[3]!.stderr).toBe("mkdir: cannot create directory 'work/x': Permission denied\n");
    expect(results[4]!.stdout).toBe('hi\n');
    expect((await runLine(shell, 'ls')).stdout.split('\n')).toContain('notes');
  });
});
