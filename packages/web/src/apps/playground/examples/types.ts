// An example (data-model.md Example, FR-027 to FR-031). Its title,
// description and the comments in its code are site text, read by the
// site-text and content checks; none holds a CV fact.
import type { ChangedOptions } from '../compiler-options.ts';

export type Example = {
  id: string;
  group: 'start' | 'types' | 'running' | 'cv';
  title: string;
  description: string;
  code: string;
  options?: ChangedOptions;
  // How a run of it ends, for the Playground check (FR-030).
  runs: 'to-end' | 'interval' | 'endless';
};
