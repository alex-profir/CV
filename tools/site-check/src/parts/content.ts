// The content part (FR-005, data-model.md Supported content Validation): the
// CV document may hold only what /cv shows. An unsupported section with
// entries, or a field outside the Key Entities table, is reported by name.
// `$schema` and `meta` describe the document and are ignored, and an empty
// or absent unsupported section has nothing to show.
import { IGNORED, SHOWN_FIELDS, SUPPORTED_SECTIONS, UNSUPPORTED_SECTIONS } from '../../../../packages/web/src/supported.ts';
import type { Problem } from '../report.ts';

type Shown = keyof typeof SHOWN_FIELDS;

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export function contentProblems(resume: unknown): Problem[] {
  const problems: Problem[] = [];
  const unsupportedField = (path: string) => problems.push({ part: 'content', page: '-', variant: '-', type: 'unsupported-field', subject: path, detail: "/cv doesn't show this field" });

  // The fields of an object against one row of the table.
  const fields = (value: unknown, path: string, row: Shown) => {
    if (!isObject(value)) return;
    const shown = SHOWN_FIELDS[row] as readonly string[];
    for (const [name, field] of Object.entries(value)) {
      if (field === undefined) continue;
      if (!shown.includes(name)) unsupportedField(`${path}.${name}`);
    }
  };

  if (!isObject(resume)) return problems;
  for (const [name, value] of Object.entries(resume)) {
    if (value === undefined || (IGNORED as readonly string[]).includes(name)) continue;
    if (name === 'basics') {
      fields(value, 'basics', 'basics');
      if (isObject(value)) {
        fields(value.location, 'basics.location', 'basics.location');
        if (Array.isArray(value.profiles)) value.profiles.forEach((profile, index) => fields(profile, `basics.profiles[${index}]`, 'basics.profiles'));
      }
    } else if ((SUPPORTED_SECTIONS as readonly string[]).includes(name)) {
      if (Array.isArray(value)) value.forEach((entry, index) => fields(entry, `${name}[${index}]`, name as Shown));
    } else if ((UNSUPPORTED_SECTIONS as readonly string[]).includes(name)) {
      if (Array.isArray(value) && value.length > 0) {
        problems.push({
          part: 'content',
          page: '-',
          variant: '-',
          type: 'unsupported-section',
          subject: name,
          detail: `the CV document has ${value.length} ${name} ${value.length === 1 ? 'entry' : 'entries'}, which /cv doesn't show yet`,
        });
      }
    } else {
      unsupportedField(name);
    }
  }
  return problems;
}
