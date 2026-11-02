// `fs` on the program's own copy (009 research R10): its names in each form, what a
// program sees of its writes, and the Terminal's rules in Node's errors.
import { describe, expect, test } from 'vitest';
import type { ProgramRequest, SnapshotEntry } from '../../../../src/apps/terminal/program/messages.ts';
import { comparable, HOME, request, runProgram, script, underNode } from './helpers/harness.ts';

const LOCKED: SnapshotEntry = { path: `${HOME}/cv.json`, kind: 'file', owner: 'root', protected: true, text: '{"name":"cv"}' };
const SITE_FOLDER: SnapshotEntry = { path: `${HOME}/site`, kind: 'folder', owner: 'root', protected: true };
const INSIDE: SnapshotEntry = { path: `${HOME}/site/a.txt`, kind: 'file', owner: 'root', protected: true, text: 'site' };

function withLocked(source: string, files: Record<string, string> = {}, bytes = 0): ProgramRequest {
  const made = script(source, 'main.js', [], files);
  return { ...made, files: { entries: [...made.files.entries, LOCKED, SITE_FOLDER, INSIDE], bytes: made.files.bytes + bytes } };
}

const output = async (source: string, files: Record<string, string> = {}, bytes = 0) => {
  const run = await runProgram(withLocked(source, files, bytes));
  expect(run.stderr).toBe('');
  return run;
};

const same = async (source: string, files: Record<string, string> = {}) => {
  const here = await runProgram(script(source, 'main.js', [], files));
  const there = underNode({ ...files, 'main.js': source }, ['main.js']);
  expect(comparable(here.stdout)).toBe(comparable(there.stdout));
  expect(here.exit).toBe(there.status);
};

const EACH = "const fs = require('fs');\n";
const SYNC = `${EACH}
fs.writeFileSync('a.txt', 'one');
fs.appendFileSync('a.txt', ' two');
console.log(fs.readFileSync('a.txt', 'utf8'), fs.readFileSync('a.txt'), fs.readFileSync('a.txt', { encoding: 'utf8' }));
console.log(fs.existsSync('a.txt'), fs.existsSync('gone'));
const s = fs.statSync('a.txt');
console.log(s.isFile(), s.isDirectory(), s.size, fs.lstatSync('a.txt').isFile(), s.mtime instanceof Date);
fs.mkdirSync('d');
fs.mkdirSync('d/e/f', { recursive: true });
console.log(fs.statSync('d').isDirectory(), fs.readdirSync('d'), fs.readdirSync('.').includes('d'), fs.readdirSync('d', { withFileTypes: true }).map((each) => [each.name, each.isDirectory()]));
fs.copyFileSync('a.txt', 'd/b.txt');
fs.renameSync('d/b.txt', 'd/c.txt');
console.log(fs.readFileSync('d/c.txt', 'utf8'), fs.readdirSync('d'));
fs.unlinkSync('d/c.txt');
fs.rmdirSync('d/e/f');
fs.rmSync('d', { recursive: true });
fs.rmSync('gone', { force: true });
console.log(fs.existsSync('d'));
`;
const CALLBACKS = `${EACH}
const step = (error, value) => console.log(error === null || error === undefined ? 'ok' : error.code, value);
fs.writeFile('a.txt', 'one', (error) => {
  step(error);
  fs.appendFile('a.txt', ' two', (error) => {
    step(error);
    fs.readFile('a.txt', 'utf8', (error, text) => {
      step(error, text);
      fs.readFile('a.txt', (error, bytes) => {
        step(error, bytes);
        fs.exists('a.txt', (there) => {
          console.log(there);
          fs.stat('a.txt', (error, s) => {
            step(error, s.size);
            fs.lstat('a.txt', (error, s) => {
              step(error, s.isFile());
              fs.mkdir('d', (error) => {
                step(error);
                fs.copyFile('a.txt', 'd/b.txt', (error) => {
                  step(error);
                  fs.rename('d/b.txt', 'd/c.txt', (error) => {
                    step(error);
                    fs.readdir('d', (error, names) => {
                      step(error, names);
                      fs.unlink('d/c.txt', (error) => {
                        step(error);
                        fs.rmdir('d', (error) => {
                          step(error);
                          fs.rm('a.txt', (error) => {
                            step(error);
                            fs.readFile('gone', (error) => step(error));
                            console.log('first');
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
console.log('sync first');
`;
const PROMISES = `const fs = require('fs/promises');
(async () => {
  await fs.writeFile('a.txt', 'one');
  await fs.appendFile('a.txt', ' two');
  console.log(await fs.readFile('a.txt', 'utf8'), await fs.readFile('a.txt'));
  console.log((await fs.stat('a.txt')).size, (await fs.lstat('a.txt')).isFile());
  await fs.mkdir('d/e', { recursive: true });
  await fs.copyFile('a.txt', 'd/b.txt');
  await fs.rename('d/b.txt', 'd/c.txt');
  console.log(await fs.readdir('d'));
  await fs.unlink('d/c.txt');
  await fs.rmdir('d/e');
  await fs.rm('d', { recursive: true });
  await fs.rm('a.txt');
  await fs.readFile('gone').catch((error) => console.log(error.code, error.syscall));
  console.log(require('fs').promises === fs);
})();
`;

describe('009-terminal-node-FR-013: every name of fs, as Node has it', () => {
  test('in the sync form', () => same(SYNC));
  test('in the callback form', () => same(CALLBACKS));
  test('in the promise form', () => same(PROMISES));
  test("Node's errors, in form and fields", () =>
    same(`${EACH}
for (const work of [() => fs.readFileSync('gone'), () => fs.mkdirSync('a/b/c'), () => fs.rmdirSync('gone'), () => fs.readdirSync('gone'), () => fs.statSync('gone'), () => fs.unlinkSync('gone'), () => fs.renameSync('gone', 'x'), () => fs.copyFileSync('gone', 'x'), () => fs.readFileSync('.'), () => fs.writeFileSync('.', 'x'), () => fs.mkdirSync('.'), () => fs.readFileSync(5.5), () => fs.rmSync('.')]) {
  try {
    work();
    console.log('passed');
  } catch (error) {
    console.log(error.code, error.syscall, error.errno, error.name, error.message.replace(/'.*'/, 'PLACE'));
  }
}
`));
  test('`import` works too', async () => {
    const run = await runProgram(script("import fs, { writeFileSync } from 'node:fs';\nimport { readFile } from 'node:fs/promises';\nwriteFileSync('a', 'x');\nconsole.log(fs.existsSync('a'), await readFile('a', 'utf8'));\n", 'main.mjs'));
    expect(run.stdout).toBe('true x\n');
  });
});

describe('009-terminal-node-FR-029: the Terminal\'s rules', () => {
  test('a program sees its own writes at once, and the file as it started', async () => {
    const run = await output(`${EACH}console.log(fs.readFileSync('there.txt', 'utf8'));\nfs.writeFileSync('there.txt', 'new');\nconsole.log(fs.readFileSync('there.txt', 'utf8'));\n`, { 'there.txt': 'old' });
    expect(run.stdout).toBe('old\nnew\n');
  });

  test.each([
    ['writing a protected file', "fs.writeFileSync('cv.json', '')", 'EACCES', 'open'],
    ['appending to one', "fs.appendFileSync('cv.json', 'x')", 'EACCES', 'open'],
    ['removing one', "fs.unlinkSync('cv.json')", 'EACCES', 'unlink'],
    ['writing in a protected folder', "fs.writeFileSync('site/new.txt', 'x')", 'EACCES', 'open'],
    ['removing a protected folder', "fs.rmSync('site', { recursive: true })", 'EACCES', 'rm'],
    ['renaming a protected file', "fs.renameSync('cv.json', 'x')", 'EACCES', 'rename'],
    ['writing outside home and tmp', "fs.writeFileSync('/etc/x', 'x')", 'ENOENT', 'open'],
    ['a missing folder', "fs.writeFileSync('no/such/x', 'x')", 'ENOENT', 'open'],
    ['a folder as a file', "fs.writeFileSync('.', 'x')", 'EISDIR', 'open'],
  ])('%s gives its code, and changes nothing', async (_, work, code, syscall) => {
    const run = await output(`${EACH}try { ${work}; console.log('passed'); } catch (error) { console.log(error.code, error.syscall, error.path !== undefined); }\nconsole.log(fs.readFileSync('cv.json', 'utf8'));\n`);
    expect(run.stdout).toBe(`${code} ${syscall} true\n{"name":"cv"}\n`);
    expect(run.messages.filter((each) => 'file' in each || 'folder' in each)).toEqual([]);
  });

  test('past the limit: ENOSPC, nothing changed', async () => {
    const run = await output(`${EACH}fs.writeFileSync('a', 'small');\ntry { fs.writeFileSync('b', 'x'.repeat(1_048_576)); } catch (error) { console.log(error.code); }\nconsole.log(fs.existsSync('b'), fs.readFileSync('a', 'utf8'));\n`);
    expect(run.stdout).toBe('ENOSPC\nfalse small\n');
  });

  test('what is already there counts', async () => {
    const run = await output(`${EACH}try { fs.writeFileSync('a', 'x'.repeat(100)); console.log('passed'); } catch (error) { console.log(error.code); }\n`, {}, 1_048_500);
    expect(run.stdout).toBe('ENOSPC\n');
  });

  test('overwriting frees what the file held', async () => {
    const run = await output(`${EACH}fs.writeFileSync('there', 'x'.repeat(50));\nconsole.log('passed');\n`, { there: 'y'.repeat(100) }, 1_048_400);
    expect(run.stdout).toBe('passed\n');
  });

  test('a binary file holds one character a byte, and reads back whole', async () => {
    const entries: SnapshotEntry[] = [{ path: HOME, kind: 'folder', owner: 'guest', protected: false }, { path: `${HOME}/b.bin`, kind: 'file', owner: 'guest', protected: false, text: 'ÿ\u0000þ', binary: true }];
    const run = await runProgram({ ...request({}), script: `${HOME}/main.js`, files: { entries: [...entries, { path: `${HOME}/main.js`, kind: 'file', owner: 'guest', protected: false, text: `${EACH}console.log(fs.readFileSync('b.bin'));\nfs.writeFileSync('c.bin', Buffer.from([0xff, 0x01]));\nconsole.log(fs.readFileSync('c.bin'));\n` }], bytes: 0 } });
    expect(run.stdout).toBe('<Buffer ff 00 fe>\n<Buffer ff 01>\n');
    expect(run.messages).toContainEqual({ file: `${HOME}/c.bin`, text: 'ÿ\u0001', binary: true });
  });
});

describe('009-terminal-node-FR-030: each change is sent at once, as a whole', () => {
  test('files as their whole new text or a removal, folders as made or removed', async () => {
    const run = await output(`${EACH}fs.writeFileSync('a', 'one');\nfs.appendFileSync('a', ' two');\nfs.mkdirSync('d');\nfs.unlinkSync('a');\nfs.rmdirSync('d');\n`);
    expect(run.messages.filter((each) => 'file' in each || 'folder' in each)).toEqual([
      { file: `${HOME}/a`, text: 'one' },
      { file: `${HOME}/a`, text: 'one two' },
      { folder: `${HOME}/d`, made: true },
      { file: `${HOME}/a`, removed: true },
      { folder: `${HOME}/d`, made: false },
    ]);
  });
});

describe('009-terminal-node-FR-029: a limit reached by honest use', () => {
  test('making and removing many files holds nothing and ends as it should', async () => {
    const run = await runProgram(script("const fs = require('fs');\nfor (let i = 0; i < 20000; i++) { fs.writeFileSync('z' + i, ''); fs.unlinkSync('z' + i); }\nconsole.log('done');\n"), { timeoutMs: 30_000 });
    expect(run.stdout).toBe('done\n');
    expect(run.exit).toBe(0);
  }, 40_000);

  test('empty files until an error give ENOSPC, for its catch', async () => {
    const run = await runProgram(script("const fs = require('fs');\ntry { for (let i = 0; ; i++) fs.writeFileSync('z' + i, ''); } catch (error) { console.log(error.code); }\n"), { timeoutMs: 30_000 });
    expect(run.stdout).toBe('ENOSPC\n');
    expect(run.exit).toBe(0);
  }, 40_000);

  test('folders likewise', async () => {
    const run = await runProgram(script("const fs = require('fs');\ntry { for (let i = 0; ; i++) fs.mkdirSync('z' + i); } catch (error) { console.log(error.code); }\n"), { timeoutMs: 30_000 });
    expect(run.stdout).toBe('ENOSPC\n');
  }, 40_000);
});

describe('009-terminal-node-FR-029 and 009-terminal-node-FR-013: moving a folder', () => {
  const SOURCE = "const fs = require('fs');\nfs.mkdirSync('s');\ntry { fs.renameSync('s', 's/t'); } catch (error) { console.log(error.code, error.syscall, error.path, error.dest, error.message); }\nconsole.log(fs.readdirSync('s'));\n";

  test('into itself is refused with EINVAL, as Node refuses it, and changes nothing', async () => {
    await same(SOURCE);
  });

  test('into a neighbour named like it still goes', async () => {
    await same("const fs = require('fs');\nfs.mkdirSync('s');\nfs.renameSync('s', 's2');\nconsole.log(fs.existsSync('s'), fs.existsSync('s2'));\n");
  });
});

describe('009-terminal-node-FR-029: outside the home and temporary folders', () => {
  const BIN: SnapshotEntry = { path: '/bin', kind: 'folder', owner: 'root', protected: true };
  const LS: SnapshotEntry = { path: '/bin/ls', kind: 'file', owner: 'root', protected: true, text: 'stub' };

  test('a program reads it, from any folder, and can write none of it', async () => {
    const made = script("const fs = require('fs');\nprocess.chdir('/bin');\nconsole.log(fs.existsSync('/bin'), fs.readdirSync('.'), fs.readFileSync('ls', 'utf8'), fs.readdirSync('/').includes('bin'));\ntry { fs.writeFileSync('/bin/x', 'y'); } catch (error) { console.log(error.code); }\n");
    const run = await runProgram({ ...made, files: { ...made.files, entries: [...made.files.entries, BIN, LS] } });
    expect(run.stdout).toBe("true [ 'ls' ] stub true\nEACCES\n");
  });
});
