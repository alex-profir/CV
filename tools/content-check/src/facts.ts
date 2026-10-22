import fs from 'node:fs';
import path from 'node:path';
import { isExcludedDir, isTestFile } from '../../traceability/src/files.ts';
import { compare } from '../../traceability/src/report.ts';
import type { FactKind, Problem } from './report.ts';

export type KeyFact = { kind: FactKind; pattern: RegExp };

export type SearchedFile = { file: string; state: 'searched'; text: string } | { file: string; state: 'skipped-binary' };

// Root-level tooling files, by name. A new root file is searched until it's
// added here, so the list fails safe (research R9).
const ROOT_TOOLING = ['package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'skills-lock.json', 'CLAUDE.md'];

const ROOT_SKIPPED_DIRS = ['specs', 'docs', 'tools'];

const TEST_DIRS = ['test', 'tests', '__tests__'];

const NOTICE = /^(README|LICENSE|LICENCE|COPYING)(\..*)?$/i;

const PHONE_SEPARATORS = '[ .()-]*';

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// Digits that may be separated by spaces, hyphens, dots or parentheses.
function digitsPattern(digits: string): string {
  return [...digits].join(PHONE_SEPARATORS);
}

// The owner's key facts and their patterns, read from the CV on every run
// (FR-023, FR-025, research R9). Each exists only when its field is a
// non-empty string. Patterns run on NFC text.
export function keyFacts(resume: unknown): KeyFact[] {
  const basics = (resume as { basics?: Record<string, unknown> } | null)?.basics;
  const value = (field: string): string | undefined => {
    const text = basics !== null && typeof basics === 'object' ? basics[field] : undefined;
    return typeof text === 'string' && text !== '' ? text.normalize('NFC') : undefined;
  };
  const found: KeyFact[] = [];

  const name = value('name');
  const words = name?.split(/\s+/).filter((word) => word !== '') ?? [];
  if (words.length > 0) found.push({ kind: 'name', pattern: new RegExp(words.map(escape).join('\\s+'), 'giu') });

  const email = value('email');
  if (email !== undefined) found.push({ kind: 'email', pattern: new RegExp(escape(email), 'giu') });

  const phone = value('phone');
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (phone !== undefined && digits !== '') {
    // With a leading `+`, also with `00` for the `+`, and without the country
    // calling code (one to three digits), optionally after a trunk `0`.
    const alternatives = phone.trim().startsWith('+')
      ? [
          digitsPattern(digits),
          digitsPattern(`00${digits}`),
          ...[1, 2, 3].filter((count) => count < digits.length).map((count) => `0?${PHONE_SEPARATORS}${digitsPattern(digits.slice(count))}`),
        ]
      : [digitsPattern(digits)];
    found.push({ kind: 'phone', pattern: new RegExp(`(?<!\\d)(?:${alternatives.join('|')})(?!\\d)`, 'gu') });
  }
  return found;
}

// Every file that makes up the site, in code-unit order, never following
// symbolic links (FR-022, FR-024). `excluded` holds paths relative to the
// root: a directory listed there isn't visited, and a file isn't read. The
// token check shares this walk with its own exclusions (003 research R13).
export function searchFiles(
  root: string,
  excluded: readonly string[],
): { files: SearchedFile[]; unreadable: { path: string; code: string }[] } {
  const files: SearchedFile[] = [];
  const unreadable: { path: string; code: string }[] = [];
  const fatal = new TextDecoder('utf-8', { fatal: true });

  const visit = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(path.join(root, dir), { withFileTypes: true });
    } catch (error) {
      unreadable.push({ path: dir, code: (error as NodeJS.ErrnoException).code ?? 'unknown error' });
      return;
    }
    entries.sort((a, b) => compare(a.name, b.name));
    for (const entry of entries) {
      const name = entry.name;
      const file = dir === '' ? name : `${dir}/${name}`;
      if (name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        if (isExcludedDir(name) || TEST_DIRS.includes(name) || (dir === '' && ROOT_SKIPPED_DIRS.includes(name)) || excluded.includes(file)) continue;
        visit(file);
      } else if (entry.isFile()) {
        if (isTestFile(file) || NOTICE.test(name) || name.includes('.generated.') || name === 'package-lock.json') continue;
        if ((dir === '' && ROOT_TOOLING.includes(name)) || excluded.includes(file)) continue;
        let bytes: Buffer;
        try {
          bytes = fs.readFileSync(path.join(root, file));
        } catch (error) {
          unreadable.push({ path: file, code: (error as NodeJS.ErrnoException).code ?? 'unknown error' });
          continue;
        }
        let text: string | undefined;
        try {
          text = bytes.includes(0) ? undefined : fatal.decode(bytes);
        } catch {
          text = undefined;
        }
        files.push(text === undefined ? { file, state: 'skipped-binary' } : { file, state: 'searched', text });
      }
    }
  };
  visit('');
  return { files, unreadable };
}

// The column in `line` where the character at `index` of its NFC form starts:
// the shortest prefix whose NFC form is at least that long.
function originalColumn(line: string, index: number): number {
  for (let length = 0; length <= line.length; length += 1) {
    if (line.slice(0, length).normalize('NFC').length >= index) return length + 1;
  }
  return line.length + 1;
}

// Every occurrence of a key fact in one file, line by line on NFC text
// (FR-021, FR-025).
export function findFacts(file: string, text: string, facts: KeyFact[], isSiteData: boolean): Problem[] {
  const problems: Problem[] = [];
  text.split('\n').forEach((line, lineIndex) => {
    const normalized = line.normalize('NFC');
    for (const { kind, pattern } of facts) {
      for (const match of normalized.matchAll(pattern)) {
        const column = normalized === line ? match.index + 1 : originalColumn(line, match.index);
        problems.push({
          type: 'hardcoded-fact',
          subject: kind,
          location: { file, line: lineIndex + 1, column },
          detail: isSiteData
            ? `the owner's ${kind} is written out in site data; refer to the CV document instead`
            : `the owner's ${kind} is written out; read it from @cv/content instead`,
        });
      }
    }
  });
  return problems;
}
