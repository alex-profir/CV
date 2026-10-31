// Runs real processes against a throwaway lock file, so these tests neither wait
// for the run that started them nor hold up another one.
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../../..');
const LOCK = path.join(ROOT, 'tools/speckit-auto/test-lock.ts');

let tmp: string;
let env: NodeJS.ProcessEnv;
let log: string;
let children: ChildProcess[];

// A process that takes the lock, logs "<name> in", stays until the "release"
// file appears and logs "<name> out".
function holder(name: string, body = ''): ChildProcess {
  const script = `
    import fs from 'node:fs';
    import { acquireTestLock } from ${JSON.stringify(LOCK)};
    await acquireTestLock();
    fs.appendFileSync(process.env.LOG, ${JSON.stringify(`${name} in\n`)});
    ${body}
    while (!fs.existsSync(process.env.RELEASE)) await new Promise((r) => setTimeout(r, 50));
    fs.appendFileSync(process.env.LOG, ${JSON.stringify(`${name} out\n`)});
  `;
  const child = spawn(process.execPath, ['--input-type=module', '-e', script], { env, stdio: 'ignore' });
  children.push(child);
  return child;
}

const logged = () => (fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '');
const release = () => fs.writeFileSync(env.RELEASE!, '');
const exited = (child: ChildProcess) => new Promise((resolve) => child.once('exit', resolve));
const holds = (name: string) => vi.waitFor(() => expect(logged()).toContain(`${name} in\n`), { timeout: 10_000 });

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'speckit-test-lock-')));
  log = path.join(tmp, 'log');
  children = [];
  env = {
    ...process.env,
    SPECKIT_TEST_LOCK_FILE: path.join(tmp, 'locks', 'test.lock'),
    LOG: log,
    RELEASE: path.join(tmp, 'release'),
  };
  // Set by the run these tests are part of.
  delete env.SPECKIT_TEST_LOCK_HELD;
});

afterEach(() => {
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('the lock', { timeout: 60_000 }, () => {
  test('lets one holder in at a time, and the next in once the first exits', async () => {
    const first = holder('first');
    await holds('first');
    const second = holder('second');
    await new Promise((resolve) => setTimeout(resolve, 2500));
    expect(logged()).toBe('first in\n');

    release();
    await Promise.all([exited(first), exited(second)]);

    expect(logged()).toBe('first in\nfirst out\nsecond in\nsecond out\n');
  });

  test('is free again when its holder is killed', async () => {
    const first = holder('first');
    await holds('first');
    const killed = exited(first);
    first.kill('SIGKILL');
    await killed;

    const second = holder('second');
    await holds('second');
    expect(logged()).toBe('first in\nsecond in\n');
  });

  test('is not waited for by a process the holder started', async () => {
    const nested = `
      import { spawnSync } from 'node:child_process';
      const script = ${JSON.stringify(`import { acquireTestLock } from ${JSON.stringify(LOCK)}; await acquireTestLock(); console.log('nested in');`)};
      const { stdout } = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
      fs.appendFileSync(process.env.LOG, stdout);
    `;
    holder('first', nested);
    await vi.waitFor(() => expect(logged()).toBe('first in\nnested in\n'), { timeout: 10_000 });
  });

  test('gives up after the wait limit and names the holder', async () => {
    holder('first');
    await holds('first');

    const script = `import { acquireTestLock } from ${JSON.stringify(LOCK)}; await acquireTestLock();`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...env, SPECKIT_TEST_LOCK_WAIT_MINUTES: '0.01' },
      encoding: 'utf8',
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('test lock: waiting for pid ');
    expect(result.stderr).toContain('test lock: gave up after 0.01 minutes, still held by pid ');
  });

  test('is skipped in watch mode', async () => {
    holder('first');
    await holds('first');

    const script = `import setup from ${JSON.stringify(LOCK)}; await setup({ config: { watch: true } }); console.log('ran');`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      env: { ...env, SPECKIT_TEST_LOCK_WAIT_MINUTES: '0' },
      encoding: 'utf8',
    });

    expect(result.stdout).toBe('ran\n');
  });
});

describe('what takes the lock', { timeout: 120_000 }, () => {
  // Every run here gives up straight away, so nothing it would start ever does.
  function whileHeld(command: string, args: string[]) {
    return spawnSync(command, args, { cwd: ROOT, env: { ...env, SPECKIT_TEST_LOCK_WAIT_MINUTES: '0' }, encoding: 'utf8' });
  }

  test.each(['fast', 'slow'])('a Vitest run of the %s project', async (project) => {
    holder('first');
    await holds('first');

    const result = whileHeld(path.join(ROOT, 'node_modules/.bin/vitest'), ['run', '--project', project]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('test lock: gave up');
  });

  test('the site check', async () => {
    holder('first');
    await holds('first');

    const result = whileHeld(process.execPath, ['tools/site-check/src/main.js']);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain('test lock: gave up');
  });
});
