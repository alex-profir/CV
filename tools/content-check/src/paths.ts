// The fixed paths the check reads, relative to the run root with `/`
// separators (contracts/cli.md).
export const RESUME_FILE = 'packages/content/resume.json';

export const SITE_FILE = 'packages/content/site.json';

export const RULES_FILE = 'packages/content/schemas/site.schema.json';

// Written only by `npm run content-shape`.
export const SHAPE_FILE = 'packages/content/src/shape.generated.ts';

// The JSON Resume version the CV follows. Changing it is a spec change.
export const OFFICIAL_SCHEMA_VERSION = '1.3.1';
