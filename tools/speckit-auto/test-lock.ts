// Lets one test run at a time on this machine, across every worktree and loop:
// parallel runs can bring the machine down. Vitest takes the lock in its global
// setup, however it was started, and the site check takes it in its entry point.
//
// The lock is SQLite's exclusive lock on a file in the home directory. The
// kernel drops it when the holder exits, so a killed run can't leave it stale.
// A process that holds it marks its environment, so the runs it starts itself,
// such as the site check inside a site-check test, don't wait for it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { TestProject } from 'vitest/node';

const HELD = 'SPECKIT_TEST_LOCK_HELD';
const SQLITE_BUSY = 5;
const POLL_MS = 1000;
const DEFAULT_WAIT_MINUTES = 180;

// Kept here because the lock ends if the connection is garbage collected.
let connection: DatabaseSync | undefined;

function tryLock(db: DatabaseSync): boolean {
  try {
    db.exec('BEGIN EXCLUSIVE');
    return true;
  } catch (error) {
    if ((error as { errcode?: number }).errcode === SQLITE_BUSY) return false;
    throw error;
  }
}

function holder(holderFile: string): string {
  try {
    return fs.readFileSync(holderFile, 'utf8').trim();
  } catch {
    return 'another test run';
  }
}

/**
 * Waits for the lock and returns the function that releases it. Exiting releases
 * it too. Exits with status 2 if it stays held for SPECKIT_TEST_LOCK_WAIT_MINUTES
 * (default 180): an error thrown here would crash Vitest's error printer and hide
 * who holds the lock.
 */
export async function acquireTestLock(): Promise<() => void> {
  if (process.env[HELD]) return () => {};

  const file = process.env.SPECKIT_TEST_LOCK_FILE ?? path.join(os.homedir(), '.cache/speckit-auto/test.lock');
  const holderFile = `${file}.holder`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file, { timeout: 0 });

  const waitMinutes = Number(process.env.SPECKIT_TEST_LOCK_WAIT_MINUTES ?? DEFAULT_WAIT_MINUTES);
  const started = Date.now();
  let waited = false;
  while (!tryLock(db)) {
    if (!waited) process.stderr.write(`test lock: waiting for ${holder(holderFile)}\n`);
    waited = true;
    if (Date.now() - started >= waitMinutes * 60_000) {
      process.stderr.write(`test lock: gave up after ${waitMinutes} minutes, still held by ${holder(holderFile)}\n`);
      process.exit(2);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  if (waited) process.stderr.write(`test lock: acquired after ${Math.round((Date.now() - started) / 1000)}s\n`);

  connection = db;
  process.env[HELD] = String(process.pid);
  fs.writeFileSync(holderFile, `pid ${process.pid} in ${process.cwd()}, since ${new Date().toTimeString().slice(0, 8)}\n`);
  return () => {
    fs.rmSync(holderFile, { force: true });
    delete process.env[HELD];
    connection?.close();
    connection = undefined;
  };
}

// Vitest's global setup, listed by each project. The second project of a run
// finds the lock held. Watch mode never exits, so it would block every loop
// until it was closed, and goes without the lock.
export default async function setup({ config }: Pick<TestProject, 'config'>): Promise<(() => void) | void> {
  if (!config.watch) return acquireTestLock();
}
