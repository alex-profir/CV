// The Key Entities table as data (FR-002, FR-005, data-model.md Supported
// content): what /cv shows, in the design's order. The site check's content
// part reports anything in the CV document outside it.

// The sections /cv shows after the basics block, in the design's order
// (FR-001).
export const SUPPORTED_SECTIONS = ['work', 'skills', 'projects', 'education', 'languages', 'interests'] as const;

export type SupportedSection = (typeof SUPPORTED_SECTIONS)[number];

// The shown fields of each part of the CV document, by JSON Resume name.
// `basics.location` and `basics.profiles[]` have their own lists.
export const SHOWN_FIELDS = Object.freeze({
  basics: Object.freeze(['name', 'label', 'email', 'url', 'summary', 'location', 'profiles']),
  'basics.location': Object.freeze(['city', 'region', 'countryCode']),
  'basics.profiles': Object.freeze(['network', 'username', 'url']),
  work: Object.freeze(['name', 'position', 'location', 'url', 'startDate', 'endDate', 'description', 'summary', 'highlights']),
  projects: Object.freeze(['name', 'description', 'entity', 'type', 'roles', 'url', 'startDate', 'endDate', 'highlights', 'keywords']),
  education: Object.freeze(['institution', 'area', 'studyType', 'url', 'startDate', 'endDate', 'score', 'courses']),
  skills: Object.freeze(['name', 'level', 'keywords']),
  languages: Object.freeze(['language', 'fluency']),
  interests: Object.freeze(['name', 'keywords']),
});

// The other sections JSON Resume defines, not shown yet (FR-005).
export const UNSUPPORTED_SECTIONS = ['volunteer', 'awards', 'certificates', 'publications', 'references'] as const;

// Top-level fields that describe the document, not the CV: neither shown
// nor reported.
export const IGNORED = ['$schema', 'meta'] as const;
