import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { RESUME_FILE } from '../src/paths.ts';
import { REPO_ROOT } from './helpers/cli.ts';

const require = createRequire(import.meta.url);
const { validate } = require('@jsonresume/schema') as {
  validate: (resume: unknown, callback: (errors: unknown, valid: boolean) => void) => void;
};

describe('the CV is valid for JSON Resume\'s own validator (SC-002)', () => {
  test('@jsonresume/schema reports no error on the real CV', () => {
    const resume = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, RESUME_FILE), 'utf8'));
    let result: { errors: unknown; valid: boolean } | undefined;
    validate(resume, (errors, valid) => (result = { errors, valid }));
    expect(result).toEqual({ errors: null, valid: true });
  });
});
