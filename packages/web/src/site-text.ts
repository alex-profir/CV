// Every word on the pages that isn't CV content, in English, as the approved
// design sets it (FR-006, data-model.md Site text). Changing a word is one
// edit here. It holds no CV fact: the content check searches it like any
// site file.
import { deepFreeze } from './freeze.ts';

export const siteText = deepFreeze({
  // The h1 and the title when the CV document has no name (FR-023, FR-037).
  siteHeading: 'CV',
  // Between the name and the role in the title.
  titleSeparator: ' — ',
  // Section headings, by the CV document's section names.
  sections: {
    work: 'Experience',
    projects: 'Projects',
    skills: 'Skills',
    education: 'Education',
    languages: 'Languages',
    interests: 'Interests',
  },
  // Contact row labels. `website` is for `basics.url`.
  basedIn: 'Based in',
  email: 'Email',
  website: 'Website',
  // An ongoing entry's end: shown, and read by screen readers.
  present: { visible: 'Present', spoken: 'present' },
  // Read by screen readers between a start and an end date.
  to: 'to',
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  // Between a start and an end date, shown only.
  rangeSeparator: ' – ',
  // Between the parts of a location line, a list of roles or interest
  // keywords, and an education entry's study type and area.
  listSeparator: ', ',
  // Between an entry's organization details: entity, type and roles, or a
  // name and a location.
  metaSeparator: ' · ',
  // The footer's repository link.
  builtWith: 'How this page was built',
  notFound: {
    label: '404 · Not found',
    heading: "This page doesn't exist.",
    hint: 'The address may be mistyped, or the page may have moved.',
    link: 'Go to the CV',
  },
  // How a profile link's accessible name joins its network and username.
  profileLabel: '{network}: {username}',
});

export type SiteText = typeof siteText;
