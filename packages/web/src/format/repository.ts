// Links into the site's repository at the commit the site was built from
// (007 research R8, contracts/requirement-data.md Links). GitHub shows a
// Markdown file's source, where a line has an anchor, only with `?plain=1`.
const withoutSlash = (repository: string) => repository.replace(/\/+$/, '');

// A file at the commit, at a line when one is given.
export function fileUrl(repository: string, commit: string, path: string, line?: number): string {
  const url = `${withoutSlash(repository)}/blob/${commit}/${path}`;
  if (line === undefined) return url;
  const query = path.endsWith('.md') ? '?plain=1' : '';
  return `${url}${query}#${lineAnchor(line)}`;
}

// A spec's file in the repository, from its feature.
export const specFile = (feature: string) => `specs/${feature}/spec.md`;

// GitHub's anchor for a line. Kept apart from the `#`, so no string reads as
// a hex color to the token check.
const lineAnchor = (line: number) => `L${line}`;

export function commitUrl(repository: string, commit: string): string {
  return `${withoutSlash(repository)}/commit/${commit}`;
}

// The commit as the build line shows it.
export function shortCommit(commit: string): string {
  return commit.slice(0, 7);
}
