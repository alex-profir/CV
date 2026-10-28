// The cv-app part (005 contracts/cli.md Parts, FR-058): the CV app opened in
// each shell holds every shown field of the CV document, in /cv's order. The
// expected fields are 004's, read from the CV document, and the app's text
// is read as the no-script part reads `<main>`.
import type { Page } from 'playwright';
import type { ExpectedField } from '../expected.ts';
import type { Problem } from '../report.ts';
import { CV_APP_ROOT, openCvApp } from '../shell-states.ts';
import type { Shell } from '../shell-states.ts';
import { fieldProblems, mainSequence } from './no-script.ts';

// The CV app's fields, in order, on a page where it's open.
export async function cvAppFieldProblems(page: Page, shell: Shell, fields: readonly ExpectedField[], when = '') {
  return fieldProblems(await mainSequence(page, CV_APP_ROOT[shell]), fields, when, 'the CV app');
}

// On a fresh, hydrated page of the root in `shell`: opens the CV app and
// compares its fields with the expected ones.
export async function cvAppProblems(page: Page, shell: Shell, fields: readonly ExpectedField[], pageLabel: string, variant: string): Promise<Problem[]> {
  await openCvApp(page, shell);
  return (await cvAppFieldProblems(page, shell, fields)).map(({ type, subject, detail }) => ({ part: 'cv-app' as const, page: pageLabel, variant, type, subject, detail }));
}
