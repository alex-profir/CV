import { readDocument } from './json.ts';
import { RESUME_FILE, RULES_FILE, SITE_FILE } from './paths.ts';
import { sortProblems } from './report.ts';
import type { DocumentState, Part, Problem, Report } from './report.ts';
import { resumeRules } from './resume-rules.ts';
import { deriveSchema, instancePatterns, loadOfficialSchema, schemaProblems, validate } from './schema.ts';
import { loadRules, resolveReferences, siteDataRules } from './site-data.ts';
import type { Reference } from './site-data.ts';

const STATES = { ok: 'checked', missing: 'missing', unreadable: 'unreadable' } as const satisfies Record<string, DocumentState>;

// One field gets at most one problem of each type, whichever part found it
// first (data-model.md, Problem rules).
function unique(problems: Problem[]): Problem[] {
  const seen = new Set<string>();
  return problems.filter((problem) => {
    const key = JSON.stringify([problem.location.file, problem.type, problem.subject]);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// One run of the check over a root directory (data-model.md, Check).
export function runCheck(root: string): Report {
  const { schema: official } = loadOfficialSchema();
  const { schema: strict, formats } = deriveSchema(official);
  const datePatterns = instancePatterns(official, (node) => node.$ref === '#/definitions/iso8601');

  const resume = readDocument(root, RESUME_FILE);
  const site = readDocument(root, SITE_FILE);
  const rules = readDocument(root, RULES_FILE);

  const problems: Problem[] = [];
  const checksNotRun: Part[] = [];
  for (const read of [resume, site, rules]) if (read.problem !== undefined) problems.push(read.problem);

  if (resume.state === 'ok') {
    const errors = validate(strict, resume.value);
    problems.push(...schemaProblems(resume, errors, { undefinedDetail: 'not a field defined by JSON Resume 1.3.1', datePatterns }));
    problems.push(...resumeRules(resume, { datePatterns, formats }));
  } else {
    checksNotRun.push('CV rules');
  }

  // Rules that can't be used count as unreadable (data-model.md, DocumentRead).
  let rulesState: DocumentState = STATES[rules.state];
  let references: Reference[] | undefined;
  const loaded = site.state === 'ok' && rules.state === 'ok' ? loadRules(rules) : undefined;
  if (loaded?.problem) {
    problems.push(loaded.problem);
    rulesState = 'unreadable';
  }
  if (loaded?.rules) {
    const result = siteDataRules(site, loaded.rules);
    problems.push(...result.problems);
    references = result.references;
  } else {
    checksNotRun.push('site data rules');
  }

  if (resume.state === 'ok' && references !== undefined) problems.push(...resolveReferences(references, site, resume));
  else checksNotRun.push('references');

  if (resume.state !== 'ok') checksNotRun.push('key facts search');

  const sorted = sortProblems(unique(problems));
  return {
    problems: sorted,
    documents: [
      { label: 'CV document', file: RESUME_FILE, state: STATES[resume.state] },
      { label: 'Site data document', file: SITE_FILE, state: STATES[site.state] },
      { label: 'Site data rules', file: RULES_FILE, state: rulesState },
    ],
    factKinds: resume.state === 'ok' ? [] : null,
    filesSearched: 0,
    filesSkipped: 0,
    checksNotRun,
    result: sorted.length > 0 ? 'fail' : 'pass',
  };
}
