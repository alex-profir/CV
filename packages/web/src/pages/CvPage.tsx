// A stub of the /cv page, replaced by US1 (T044).
import type { Resume } from '@cv/content';

export function CvPage({ resume }: { resume: Resume }) {
  return (
    <main>
      <h1>{resume.basics?.name ?? 'CV'}</h1>
    </main>
  );
}
